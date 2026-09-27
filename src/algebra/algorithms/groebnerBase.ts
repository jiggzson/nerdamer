/**
 * @module groebner
 *
 * Gröbner basis computation, elimination, ideal membership, and solving.
 *
 * This implementation is a Buchberger-style engine with:
 * - configurable monomial order (LEX, GRLEX, GREVLEX)
 * - sugar-strategy pair selection for performance
 * - optional budgets and stats
 * - fraction-free normal form helpers
 * - elimination ideals
 * - ideal membership testing
 * - triangular back-substitution solver
 *
 * External references consulted:
 * - SymPy Gröbner basis implementation:
 *   https://github.com/sympy/sympy/blob/120ee85f346f6292b763cc195afda4f907260d4a/sympy/polys/groebnertools.py
 * - Giovini, Mora, Niesi, Robbiano, Traverso, "One Sugar Cube, Please":
 *   https://doi.org/10.1145/120694.120701
 * - Bigatti, Caboara, Robbiano, "Computing inhomogeneous Gröbner bases":
 *   https://doi.org/10.1016/j.jsc.2010.10.002
 */

import {
	SparsePolynomial,
	type MonomialOrder as SparseMonomialOrder,
	type SparsePolynomialTerm,
} from '../../core/classes/polynomial/SparsePolynomial';
import { message } from '../../core/errors';
import { GCD as bigintGCD, abs as bigintAbs } from '../../core/functions/bigint/bigint';

// ============================================================================
// Public types
// ============================================================================

/** Monomial order used for leading terms, pair processing, and reduction. */
export type MonomialOrder = 'LEX' | 'GRLEX' | 'GREVLEX';

/** Deterministic work counters captured when a Groebner resource budget is exceeded. */
export type GroebnerStats = {
	/** Critical pairs removed from the processing queue. */
	pairsPopped: number;
	/** Pairs skipped because their leading monomials are relatively prime. */
	pairsSkippedProduct: number;
	/** Pairs skipped by Buchberger's chain criterion. */
	pairsSkippedChain: number;
	/** Processed pairs whose reduced S-polynomial was zero. */
	pairsReducedToZero: number;
	/** Nonzero reduced S-polynomials appended to the working basis. */
	basisAppends: number;
};

/** Controls monomial order, result normalization, pair strategy, and deterministic budgets. */
export type GroebnerBasisOptions = {
	/** Monomial order; defaults to `LEX`. Variable priority follows exponent index order. */
	order?: MonomialOrder;
	/**
	 * If true (default), return a reduced/normalized basis (canonicalize/interreduce/primitive normalize).
	 * If false, returns the raw Buchberger basis as produced by the pair loop.
	 */
	reduced?: boolean;

	/** Hard cap on Buchberger pair iterations (deterministic, not time-based). */
	maxPairsPopped?: number;
	/** Hard cap on basis size (including initial generators). */
	maxBasisSize?: number;

	/**
	 * Pair selection strategy.
	 * - 'sugar' (default): use sugar degree heuristic for better performance
	 * - 'fifo': simple first-in first-out (original behavior)
	 */
	strategy?: 'sugar' | 'fifo';
};

/**
 * Thrown when a Groebner pair-count or basis-size budget is exhausted.
 *
 * {@link GroebnerBudgetExceeded.stats} is the live counter snapshot from the aborted
 * computation. The error keeps that object by reference and does not freeze it.
 */
export class GroebnerBudgetExceeded extends Error {
	/** Work counters at the point the budget was exceeded. */
	readonly stats: GroebnerStats;
	/**
	 * @param message - Human-readable budget condition.
	 * @param stats - Counter snapshot retained on the error.
	 */
	constructor(message: string, stats: GroebnerStats) {
		super(message);
		this.name = 'GroebnerBudgetExceeded';
		this.stats = stats;
	}
}

// ============================================================================
// Internal helpers
// ============================================================================

type DenseLT = { exp: readonly bigint[]; coeff: bigint };

function sparseOrder(order: MonomialOrder): SparseMonomialOrder {
	if (order === 'LEX') {
		return 'lex';
	}
	if (order === 'GRLEX') {
		return 'grlex';
	}
	return 'grevlex';
}

function ltOrNull(p: SparsePolynomial, order: MonomialOrder): DenseLT | null {
	const leading = p.leadingTerm(sparseOrder(order));
	return leading === null ? null : { exp: leading.exponents, coeff: leading.coefficient };
}

function polyKey(p: SparsePolynomial): string {
	const parts = p
		.terms()
		.map(term => `${term.exponents.join(',')}:${term.coefficient.toString()}`);
	parts.sort();
	return parts.join('|');
}

/**
 * Primitive normalization under a given order:
 * - divide by coefficient content
 * - ensure leading coefficient under `order` is positive
 * - make monic when exact integer division permits it
 */
function primitiveNormalizeOrder(p0: SparsePolynomial, order: MonomialOrder): SparsePolynomial {
	if (p0.isZero()) {
		return SparsePolynomial.zero(p0.variableCount);
	}
	let p = p0.primitivePart().normalizeLeadingSign(sparseOrder(order));

	const lt = ltOrNull(p, order);
	if (lt && lt.coeff !== 0n && lt.coeff !== 1n) {
		let exact = true;
		for (const term of p.terms()) {
			if (term.coefficient % lt.coeff !== 0n) {
				exact = false;
				break;
			}
		}
		if (exact) {
			p = p.divideByScalarExact(lt.coeff);
		}
	}

	return p;
}

function expLcmDense(a: readonly bigint[], b: readonly bigint[]): bigint[] {
	if (a.length !== b.length) {
		throw new RangeError(message('multidegreeMismatch'));
	}
	const out = new Array<bigint>(a.length);
	for (let i = 0; i < a.length; i++) {
		out[i] = a[i] > b[i] ? a[i] : b[i];
	}
	return out;
}

function monoDividesDense(a: readonly bigint[], b: readonly bigint[]): boolean {
	if (a.length !== b.length) {
		return false;
	}
	for (let i = 0; i < a.length; i++) {
		if (a[i] > b[i]) {
			return false;
		}
	}
	return true;
}

function monoSubDense(b: readonly bigint[], a: readonly bigint[]): bigint[] {
	if (a.length !== b.length) {
		throw new RangeError(message('multidegreeMismatch'));
	}
	const out = new Array<bigint>(a.length);
	for (let i = 0; i < a.length; i++) {
		out[i] = b[i] - a[i];
	}
	return out;
}

function monomialTotalDegreeDense(monomial: readonly bigint[]): bigint {
	let degree = 0n;
	for (const exponent of monomial) {
		degree += exponent;
	}
	return degree;
}

// ============================================================================
// S-polynomial (fraction-free)
// ============================================================================

function sPolynomialFF(
	f: SparsePolynomial,
	g: SparsePolynomial,
	ltF: DenseLT,
	ltG: DenseLT
): SparsePolynomial {
	const lcm = expLcmDense(ltF.exp, ltG.exp);
	const fMultiplier = monoSubDense(lcm, ltF.exp);
	const gMultiplier = monoSubDense(lcm, ltG.exp);

	return f.monomialScaleSubtract(
		ltG.coeff,
		fMultiplier,
		g,
		ltF.coeff,
		gMultiplier
	);
}

// ============================================================================
// Normal form (fraction-free)
// ============================================================================

type ReducerView = {
	poly: SparsePolynomial;
	lt: DenseLT;
};

type ReductionSugarState = {
	value: bigint;
	reducerSugars: readonly bigint[];
};

function reducerViews(
	basis: readonly SparsePolynomial[],
	order: MonomialOrder,
	normalize: boolean
): ReducerView[] {
	const reducers: ReducerView[] = [];
	for (const source of basis) {
		const poly = normalize ? primitiveNormalizeOrder(source, order) : source;
		if (poly.isZero()) {
			continue;
		}
		const lt = ltOrNull(poly, order);
		if (lt !== null) {
			reducers.push({ poly, lt });
		}
	}
	return reducers;
}

/** Head reduction using leading terms only and exact integer arithmetic. */
function normalFormFractionFree(
	f0: SparsePolynomial,
	basis: readonly SparsePolynomial[],
	order: MonomialOrder,
	reducers: readonly ReducerView[] = reducerViews(basis, order, false),
	sugarState?: ReductionSugarState
): SparsePolynomial {
	let f = f0;
	if (f.isZero()) {
		return f;
	}

	while (true) {
		const ltF = ltOrNull(f, order);
		if (!ltF) {
			break;
		}

		let reduced = false;
		for (let reducerIndex = 0; reducerIndex < reducers.length; reducerIndex++) {
			const { poly: g, lt: ltG } = reducers[reducerIndex];
			if (!monoDividesDense(ltG.exp, ltF.exp)) {
				continue;
			}

			const multExp = monoSubDense(ltF.exp, ltG.exp);
			if (sugarState) {
				const reductionSugar =
					sugarState.reducerSugars[reducerIndex] + monomialTotalDegreeDense(multExp);
				if (reductionSugar > sugarState.value) {
					sugarState.value = reductionSugar;
				}
			}
			f = f.scaleSubtractMonomial(ltG.coeff, g, ltF.coeff, multExp);
			reduced = true;
			break;
		}
		if (!reduced) {
			break;
		}
	}
	return f;
}

/**
 * Fraction-free reduction allowing reduction of any term.
 *
 * For a term t in f and a reducer g whose leading monomial divides t:
 *   f := lc(g) * f - coeff(t) * x^(tExp - LM(g)) * g
 */
function normalFormFractionFreeAllTerms(
	f0: SparsePolynomial,
	basis: readonly SparsePolynomial[],
	order: MonomialOrder,
	normalizedBasis: readonly ReducerView[] = reducerViews(basis, order, true),
	sugarState?: ReductionSugarState
): SparsePolynomial {
	let f = primitiveNormalizeOrder(f0, order);
	if (f.isZero() || normalizedBasis.length === 0) {
		return f;
	}

	const monomialOrder = sparseOrder(order);
	while (true) {
		let selected: SparsePolynomialTerm | null = null;
		let selectedReducer: ReducerView | null = null;
		let selectedReducerIndex = -1;

		for (const term of f.terms()) {
			let reducer: ReducerView | null = null;
			let reducerIndex = -1;
			for (let i = 0; i < normalizedBasis.length; i++) {
				const candidate = normalizedBasis[i];
				if (monoDividesDense(candidate.lt.exp, term.exponents)) {
					reducer = candidate;
					reducerIndex = i;
					break;
				}
			}
			if (
				reducer !== null &&
				(selected === null ||
					SparsePolynomial.compareMonomials(
						term.exponents,
						selected.exponents,
						monomialOrder
					) > 0)
			) {
				selected = term;
				selectedReducer = reducer;
				selectedReducerIndex = reducerIndex;
			}
		}

		if (selected === null || selectedReducer === null) {
			break;
		}

		const multExp = monoSubDense(selected.exponents, selectedReducer.lt.exp);
		if (sugarState) {
			const reductionSugar =
				sugarState.reducerSugars[selectedReducerIndex] +
				monomialTotalDegreeDense(multExp);
			if (reductionSugar > sugarState.value) {
				sugarState.value = reductionSugar;
			}
		}
		f = primitiveNormalizeOrder(
			f.scaleSubtractMonomial(
				selectedReducer.lt.coeff,
				selectedReducer.poly,
				selected.coefficient,
				multExp
			),
			order
		);
	}

	return f;
}

// ============================================================================
// Canonicalization
// ============================================================================

function variablePresence(p: SparsePolynomial): boolean[] {
	const presence = new Array<boolean>(p.variableCount).fill(false);
	for (const variableIndex of p.variables()) {
		presence[variableIndex] = true;
	}
	return presence;
}

function canonicalizeBasis(
	inputBasis: readonly SparsePolynomial[],
	order: MonomialOrder
): SparsePolynomial[] {
	const kept: SparsePolynomial[] = [];
	const keptHeadReducers: ReducerView[] = [];
	const keptNormalizedReducers: ReducerView[] = [];
	const input = inputBasis.filter(p => !p.isZero());

	// 1) Reduce each element against what we've already kept, then normalize.
	for (const p of input) {
		const headReduced = normalFormFractionFree(
			p,
			kept,
			order,
			keptHeadReducers
		);
		const normalized = normalFormFractionFreeAllTerms(
			headReduced,
			kept,
			order,
			keptNormalizedReducers
		);
		if (!normalized.isZero()) {
			kept.push(normalized);
			keptHeadReducers.push(reducerViews([normalized], order, false)[0]);
			keptNormalizedReducers.push(reducerViews([normalized], order, true)[0]);
		}
	}

	// 2) Interreduce: each polynomial reduced by all others.
	const out: SparsePolynomial[] = [];
	for (let i = 0; i < kept.length; i++) {
		const others = kept.filter((_, j) => j !== i);
		const otherHeadReducers = keptHeadReducers.filter((_, j) => j !== i);
		const otherNormalizedReducers = keptNormalizedReducers.filter((_, j) => j !== i);
		const headReduced = normalFormFractionFree(
			kept[i],
			others,
			order,
			otherHeadReducers
		);
		const normalized = normalFormFractionFreeAllTerms(
			headReduced,
			others,
			order,
			otherNormalizedReducers
		);
		if (!normalized.isZero()) {
			out.push(normalized);
		}
	}

	// 3) Remove exact duplicates produced by independent interreduction.
	const byPoly = new Map<string, SparsePolynomial>();
	for (const p of out) {
		byPoly.set(polyKey(p), p);
	}

	const result = Array.from(byPoly.values());
	const monomialOrder = sparseOrder(order);
	const sortInfo = new Map<
		SparsePolynomial,
		{ presence: boolean[]; lt: DenseLT | null }
	>();
	for (const p of result) {
		sortInfo.set(p, {
			presence: variablePresence(p),
			lt: ltOrNull(p, order),
		});
	}

	result.sort((p, q) => {
		const pInfo = sortInfo.get(p)!;
		const qInfo = sortInfo.get(q)!;
		for (let i = 0; i < p.variableCount; i++) {
			const pv = pInfo.presence[i] ? 1 : 0;
			const qv = qInfo.presence[i] ? 1 : 0;
			if (pv !== qv) {
				return pv - qv;
			}
		}

		if (pInfo.lt && qInfo.lt) {
			const comparison = SparsePolynomial.compareMonomials(
				pInfo.lt.exp,
				qInfo.lt.exp,
				monomialOrder
			);
			if (comparison !== 0) {
				return comparison;
			}
		}
		return p.termCount - q.termCount;
	});
	return result;
}

// ============================================================================
// Sugar strategy
// ============================================================================

/**
 * Sugar degree of an S-polynomial S(f,g).
 *
 * sugar(S(f,g)) = max(sugar(f) + deg(lcm/LM(f)), sugar(g) + deg(lcm/LM(g)))
 */
function sPairSugar(
	sugarF: bigint,
	sugarG: bigint,
	ltFDegree: bigint,
	ltGDegree: bigint,
	lcmDegree: bigint
): bigint {
	const candidateF = sugarF + lcmDegree - ltFDegree;
	const candidateG = sugarG + lcmDegree - ltGDegree;
	return candidateF > candidateG ? candidateF : candidateG;
}

type CriticalPair = {
	i: number;
	j: number;
	sugar: bigint;
	/** Total degree of lcm(LM(G[i]), LM(G[j])). Used for tie-breaking. */
	lcmDeg: bigint;
};

/**
 * Inserts a pair in reverse processing order so the next pair can be removed with pop().
 * Lower sugar and lower lcmDeg are processed first. Exact ties retain the previous
 * last-in-first-out behavior.
 */
function insertPairSorted(queue: CriticalPair[], pair: CriticalPair): void {
	let lo = 0;
	let hi = queue.length;
	while (lo < hi) {
		const mid = (lo + hi) >>> 1;
		const current = queue[mid];
		if (
			current.sugar > pair.sugar ||
			(current.sugar === pair.sugar && current.lcmDeg >= pair.lcmDeg)
		) {
			lo = mid + 1;
		} else {
			hi = mid;
		}
	}
	queue.splice(lo, 0, pair);
}

// ============================================================================
// Core Buchberger algorithm
// ============================================================================

function groebnerBasisSparse(
	polys: readonly SparsePolynomial[],
	orderOrOpts: MonomialOrder | GroebnerBasisOptions = 'LEX'
): SparsePolynomial[] {
	const opts: GroebnerBasisOptions =
		typeof orderOrOpts === 'string' ? { order: orderOrOpts } : (orderOrOpts ?? {});
	const order = opts.order ?? 'LEX';
	const reduced = opts.reduced ?? true;
	const maxPairsPopped = opts.maxPairsPopped;
	const maxBasisSize = opts.maxBasisSize;
	const strategy = opts.strategy ?? 'sugar';

	const stats: GroebnerStats = {
		pairsPopped: 0,
		pairsSkippedProduct: 0,
		pairsSkippedChain: 0,
		pairsReducedToZero: 0,
		basisAppends: 0,
	};

	const basisInput = polys.filter(p => !p.isZero());
	if (basisInput.length === 0) {
		return [];
	}

	const variableCount = basisInput[0].variableCount;
	for (const polynomial of basisInput) {
		if (polynomial.variableCount !== variableCount) {
			throw new RangeError(message('multidegreeMismatch'));
		}
	}

	const basis = basisInput.slice();
	const headReducers = reducerViews(basis, order, false);
	const normalizedReducers = reducerViews(basis, order, true);
	const lmDegreeCache = headReducers.map(reducer =>
		monomialTotalDegreeDense(reducer.lt.exp)
	);
	const sugarArr = basis.map(polynomial => polynomial.totalDegree() ?? 0n);

	const zeroPairNeighbors: Array<Set<number>> = basis.map(() => new Set<number>());
	const markZeroPair = (i: number, j: number): void => {
		zeroPairNeighbors[i].add(j);
		zeroPairNeighbors[j].add(i);
	};

	const areCoprimeLM = (a: readonly bigint[], b: readonly bigint[]): boolean => {
		for (let i = 0; i < variableCount; i++) {
			if (a[i] > 0n && b[i] > 0n) {
				return false;
			}
		}
		return true;
	};

	const chainCriterionApplies = (i: number, j: number): boolean => {
		const li = headReducers[i].lt.exp;
		const lj = headReducers[j].lt.exp;
		const lcm = expLcmDense(li, lj);
		const iNeighbors = zeroPairNeighbors[i];
		const jNeighbors = zeroPairNeighbors[j];
		const candidates = iNeighbors.size <= jNeighbors.size ? iNeighbors : jNeighbors;
		const otherNeighbors = candidates === iNeighbors ? jNeighbors : iNeighbors;

		for (const k of candidates) {
			if (
				k !== i &&
				k !== j &&
				otherNeighbors.has(k) &&
				monoDividesDense(headReducers[k].lt.exp, lcm)
			) {
				return true;
			}
		}
		return false;
	};

	const appendBasis = (h: SparsePolynomial): number => {
		const index = basis.length;
		basis.push(h);

		const headReducer = reducerViews([h], order, false)[0];
		const normalizedReducer = reducerViews([h], order, true)[0];
		headReducers.push(headReducer);
		normalizedReducers.push(normalizedReducer);
		lmDegreeCache.push(monomialTotalDegreeDense(headReducer.lt.exp));
		zeroPairNeighbors.push(new Set<number>());
		stats.basisAppends++;
		if (maxBasisSize !== undefined && basis.length > maxBasisSize) {
			throw new GroebnerBudgetExceeded(
				message('groebnerBasisSizeBudgetExceeded', { max: String(maxBasisSize) }),
				stats
			);
		}
		return index;
	};

	const reducePair = (
		i: number,
		j: number,
		initialSugar?: bigint
	): { polynomial: SparsePolynomial; sugar?: bigint } => {
		const sPolynomial = sPolynomialFF(
			basis[i],
			basis[j],
			headReducers[i].lt,
			headReducers[j].lt
		);
		const sugarState =
			initialSugar === undefined
				? undefined
				: { value: initialSugar, reducerSugars: sugarArr };
		const headReduced = normalFormFractionFree(
			sPolynomial,
			basis,
			order,
			headReducers,
			sugarState
		);
		const polynomial = normalFormFractionFreeAllTerms(
			headReduced,
			basis,
			order,
			normalizedReducers,
			sugarState
		);
		return { polynomial, sugar: sugarState?.value };
	};

	// Build initial pair queue.
	if (strategy === 'sugar') {
		const pairQueue: CriticalPair[] = [];

		const makePair = (i: number, j: number): CriticalPair => {
			const li = headReducers[i].lt.exp;
			const lj = headReducers[j].lt.exp;
			const lcm = expLcmDense(li, lj);
			const lcmDegree = monomialTotalDegreeDense(lcm);
			return {
				i,
				j,
				sugar: sPairSugar(
					sugarArr[i],
					sugarArr[j],
					lmDegreeCache[i],
					lmDegreeCache[j],
					lcmDegree
				),
				lcmDeg: lcmDegree,
			};
		};

		for (let i = 0; i < basis.length; i++) {
			for (let j = i + 1; j < basis.length; j++) {
				insertPairSorted(pairQueue, makePair(i, j));
			}
		}

		while (pairQueue.length > 0) {
			const { i, j, sugar: pairSugar } = pairQueue.pop()!;
			stats.pairsPopped++;
			if (maxPairsPopped !== undefined && stats.pairsPopped > maxPairsPopped) {
				throw new GroebnerBudgetExceeded(
					message('groebnerPairsBudgetExceeded', { max: String(maxPairsPopped) }),
					stats
				);
			}

			const lmi = headReducers[i].lt.exp;
			const lmj = headReducers[j].lt.exp;
			if (areCoprimeLM(lmi, lmj)) {
				stats.pairsSkippedProduct++;
				markZeroPair(i, j);
				continue;
			}
			if (chainCriterionApplies(i, j)) {
				stats.pairsSkippedChain++;
				markZeroPair(i, j);
				continue;
			}

			const reduction = reducePair(i, j, pairSugar);
			const h = reduction.polynomial;
			if (h.isZero()) {
				stats.pairsReducedToZero++;
				markZeroPair(i, j);
				continue;
			}
			if (h.isConstant() && h.constantTerm() !== 0n) {
				return [SparsePolynomial.constant(variableCount, 1n)];
			}

			const k = appendBasis(h);
			const hTotalDegree = h.totalDegree() ?? 0n;
			const reducedSugar = reduction.sugar ?? pairSugar;
			sugarArr.push(reducedSugar > hTotalDegree ? reducedSugar : hTotalDegree);
			for (let t = 0; t < k; t++) {
				insertPairSorted(pairQueue, makePair(t, k));
			}
		}
	} else {
		// FIFO strategy.
		const pairs: Array<[number, number]> = [];
		for (let i = 0; i < basis.length; i++) {
			for (let j = i + 1; j < basis.length; j++) {
				pairs.push([i, j]);
			}
		}

		let pairIndex = 0;
		while (pairIndex < pairs.length) {
			const [i, j] = pairs[pairIndex++];
			stats.pairsPopped++;
			if (maxPairsPopped !== undefined && stats.pairsPopped > maxPairsPopped) {
				throw new GroebnerBudgetExceeded(
					message('groebnerPairsBudgetExceeded', { max: String(maxPairsPopped) }),
					stats
				);
			}

			const lmi = headReducers[i].lt.exp;
			const lmj = headReducers[j].lt.exp;
			if (areCoprimeLM(lmi, lmj)) {
				stats.pairsSkippedProduct++;
				markZeroPair(i, j);
				continue;
			}
			if (chainCriterionApplies(i, j)) {
				stats.pairsSkippedChain++;
				markZeroPair(i, j);
				continue;
			}

			const h = reducePair(i, j).polynomial;
			if (h.isZero()) {
				stats.pairsReducedToZero++;
				markZeroPair(i, j);
				continue;
			}
			if (h.isConstant() && h.constantTerm() !== 0n) {
				return [SparsePolynomial.constant(variableCount, 1n)];
			}

			const k = appendBasis(h);
			for (let t = 0; t < k; t++) {
				pairs.push([t, k]);
			}
		}
	}

	return reduced ? canonicalizeBasis(basis, order) : basis;
}

function reduceSparseByBasis(
	f: SparsePolynomial,
	basis: readonly SparsePolynomial[],
	order: MonomialOrder
): SparsePolynomial {
	if (f.isZero() || basis.length === 0) {
		return f;
	}
	const headReducers = reducerViews(basis, order, false);
	const normalizedReducers = reducerViews(basis, order, true);
	const headReduced = normalFormFractionFree(f, basis, order, headReducers);
	return normalFormFractionFreeAllTerms(
		headReduced,
		basis,
		order,
		normalizedReducers
	);
}

// ============================================================================
// Public API: Groebner basis
// ============================================================================

/**
 * Computes a Groebner basis for exact sparse integer polynomials.
 *
 * The input polynomials must belong to the same ring. With `reduced: true`, the
 * basis is interreduced, coefficient content is removed, leading signs are normalized,
 * and exact monic normalization is applied when possible. Results are sorted
 * deterministically and the supplied polynomials are not modified.
 *
 * @param polys - Ideal generators in one sparse polynomial ring.
 * @param order - Monomial order; defaults to `LEX`.
 * @param reduced - Return the normalized/interreduced basis; defaults to `true`.
 * @returns New sparse basis polynomials in deterministic presentation order.
 */
export function Groebner(
	polys: readonly SparsePolynomial[],
	order: MonomialOrder = 'LEX',
	reduced = true
): SparsePolynomial[] {
	if (polys.length === 0) {
		return [];
	}

	const basis = groebnerBasisSparse(polys, { order, reduced });
	const variableCount = basis[0]?.variableCount ?? polys[0].variableCount;
	const cache = new Map<SparsePolynomial, { pv: boolean[]; lt: DenseLT | null }>();
	const getInfo = (p: SparsePolynomial) => {
		let info = cache.get(p);
		if (!info) {
			info = { pv: variablePresence(p), lt: ltOrNull(p, order) };
			cache.set(p, info);
		}
		return info;
	};

	return [...basis].sort((p, q) => {
		const pInfo = getInfo(p);
		const qInfo = getInfo(q);

		for (let i = 0; i < variableCount; i++) {
			const pv = pInfo.pv[i] ? 1 : 0;
			const qv = qInfo.pv[i] ? 1 : 0;
			if (pv !== qv) {
				return pv > qv ? -1 : 1;
			}
		}

		if (pInfo.lt && qInfo.lt) {
			const comparison = SparsePolynomial.compareMonomials(
				pInfo.lt.exp,
				qInfo.lt.exp,
				sparseOrder(order)
			);
			if (comparison !== 0) {
				return comparison;
			}
		}

		return p.termCount - q.termCount;
	});
}

/**
 * Computes a Groebner basis with ordering, strategy, and budget control.
 *
 * @param polys - Exact sparse integer-coefficient generators in one ring.
 * @param opts - Ordering, normalization, pair-selection, and deterministic budget options.
 * @returns New basis polynomials. Work statistics are exposed only when a budget is
 * exceeded; successful calls return the basis itself.
 * @throws {@link GroebnerBudgetExceeded} Thrown after a configured pair-count or
 * basis-size limit is exceeded.
 */
export function groebnerBasisWithOptions(
	polys: readonly SparsePolynomial[],
	opts?: GroebnerBasisOptions
): SparsePolynomial[] {
	return groebnerBasisSparse(polys, opts);
}

// ============================================================================
// Elimination
// ============================================================================

/**
 * Computes the part of the ideal that lies in the polynomial ring generated by `keepVars`.
 *
 * @param polys - Exact integer-coefficient generators.
 * @param vars - All variables in exponent-index order. Variables to eliminate must
 * precede retained variables for lexicographic elimination.
 * @param keepVars - Variables to retain, expected to be a suffix of `vars`.
 * @param opts - Reduction, pair strategy, and budgets; order is always `LEX`.
 * @returns New basis polynomials involving only retained variables.
 * @throws {@link GroebnerBudgetExceeded} Thrown when a configured budget is exceeded.
 */
export function eliminate(
	polys: readonly SparsePolynomial[],
	vars: readonly string[],
	keepVars: readonly string[],
	opts?: Omit<GroebnerBasisOptions, 'order'>
): SparsePolynomial[] {
	if (polys.length === 0) {
		return [];
	}

	// Determine which variable indices to eliminate.
	const keepSet = new Set(keepVars);
	const eliminateIndices = new Set<number>();
	for (let i = 0; i < vars.length; i++) {
		if (!keepSet.has(vars[i])) {
			eliminateIndices.add(i);
		}
	}

	for (const polynomial of polys) {
		for (const variableIndex of polynomial.variables()) {
			if (variableIndex >= vars.length) {
				throw new RangeError(message('multidegreeMismatch'));
			}
		}
	}

	// Compute a LEX basis with variables to eliminate first in the supplied order.
	const basis = groebnerBasisSparse(polys, { ...opts, order: 'LEX', reduced: true });

	const result = basis.filter(poly => {
		const presence = variablePresence(poly);
		for (const variableIndex of eliminateIndices) {
			if (presence[variableIndex]) {
				return false;
			}
		}
		return true;
	});

	return result;
}

// ============================================================================
// Ideal membership
// ============================================================================

/**
 * Tests exact ideal membership by reducing against a computed Groebner basis.
 *
 * @param f - Polynomial to test.
 * @param polys - Exact integer-coefficient ideal generators.
 * @param order - Monomial order; defaults to `LEX`.
 * @param opts - Pair strategy and deterministic budgets.
 * @returns Whether the normal form of `f` is zero.
 * @throws {@link GroebnerBudgetExceeded} Thrown when basis computation exceeds a budget.
 */
export function idealMembership(
	f: SparsePolynomial,
	polys: readonly SparsePolynomial[],
	order: MonomialOrder = 'LEX',
	opts?: Omit<GroebnerBasisOptions, 'order' | 'reduced'>
): boolean {
	if (f.isZero()) {
		return true;
	}
	if (polys.length === 0) {
		return false;
	}

	const basis = groebnerBasisSparse(polys, { ...opts, order, reduced: true });
	return reduceSparseByBasis(f, basis, order).isZero();
}

/**
 * Reduces a polynomial by a basis or arbitrary reducer set using fraction-free arithmetic.
 *
 * @remarks
 * This does not compute or verify a Groebner basis. The result is a canonical ideal
 * normal form only when `basis` is already a basis for the selected order.
 *
 * @param f - Polynomial to reduce.
 * @param basis - Reducers, normally a Groebner basis.
 * @param order - Monomial order used to select leading terms.
 * @returns The primitive-normalized remainder.
 */
export function reduceByBasis(
	f: SparsePolynomial,
	basis: readonly SparsePolynomial[],
	order: MonomialOrder = 'LEX'
): SparsePolynomial {
	return f.isZero() || basis.length === 0 ? f : reduceSparseByBasis(f, basis, order);
}

// ============================================================================
// Solving polynomial systems via LEX Gröbner + back-substitution
// ============================================================================

/**
 * Maps each solved variable to a reduced rational numerator/denominator pair.
 *
 * Only rational coordinates discovered by triangular back-substitution are represented.
 */
export type RationalSolution = Map<string, { n: bigint; d: bigint }>;

/**
 * Solves a zero-dimensional polynomial system for rational coordinates.
 *
 * @remarks
 * This is the low-level exact solver used with the Groebner representation, not the
 * ordinary expression solver. It computes a reduced lexicographic basis, walks variables
 * from least to most significant, applies the Rational Root Theorem to univariate
 * constraints, and substitutes each partial assignment into its own basis copy.
 * Irrational and complex roots are outside this routine's result set.
 *
 * @param polys - Exact integer-coefficient system generators.
 * @param vars - Variables in lexicographic elimination order, most significant first.
 * @param opts - Pair strategy and budgets forwarded to basis computation.
 * @returns New solution maps. An empty array can mean inconsistency, no rational roots,
 * or a non-finite/unsupported triangular result; these cases are not distinguished.
 * @throws {@link GroebnerBudgetExceeded} Thrown when basis computation exceeds a budget.
 */
export function solve(
	polys: readonly SparsePolynomial[],
	vars: readonly string[],
	opts?: Omit<GroebnerBasisOptions, 'order' | 'reduced'>
): RationalSolution[] {
	if (polys.length === 0 || vars.length === 0) {
		return [new Map()];
	}

	for (const polynomial of polys) {
		for (const variableIndex of polynomial.variables()) {
			if (variableIndex >= vars.length) {
				throw new RangeError(message('multidegreeMismatch'));
			}
		}
	}
	const basis = groebnerBasisSparse(polys, { ...opts, order: 'LEX', reduced: true });

	// Trivial: if the basis is {1}, the system is inconsistent.
	if (basis.length === 1 && basis[0].isConstant() && basis[0].constantTerm() !== 0n) {
		return [];
	}
	if (basis.length === 0) {
		// Ideal is {0}, meaning every point is a solution — infinite solutions.
		return [];
	}

	return backSubstitute(basis, vars);
}

/**
 * Triangular back-substitution on a LEX Gröbner basis.
 *
 * Walks variables from last (least significant) to first, finding univariate
 * polynomials, extracting rational roots, and substituting back.
 *
 * Each partial solution carries its own partially-substituted copy of the basis,
 * so when we extend with a new variable binding we only need to substitute that
 * one new value — not redo all prior substitutions.
 */
function backSubstitute(
	basis: readonly SparsePolynomial[],
	vars: readonly string[]
): RationalSolution[] {
	type PartialSolution = {
		assignment: Map<number, { n: bigint; d: bigint }>;
		/** Basis polynomials with all already-solved variables substituted out. */
		basis: readonly SparsePolynomial[];
	};

	let partials: PartialSolution[] = [
		{
			assignment: new Map(),
			basis: [...basis],
		},
	];

	for (let variableIndex = vars.length - 1; variableIndex >= 0; variableIndex--) {
		const nextPartials: PartialSolution[] = [];

		for (const { assignment, basis: partialBasis } of partials) {
			const univariates = partialBasis.filter(poly => {
				if (poly.isZero()) {
					return false;
				}
				const variables = poly.variables();
				if (variables.some(index => index !== variableIndex)) {
					return false;
				}
				const degree = poly.degree(variableIndex);
				return degree !== null && degree > 0n;
			});

			if (univariates.length === 0) {
				// No constraint on this variable — push forward as-is.
				nextPartials.push({
					assignment: new Map(assignment),
					basis: partialBasis,
				});
				continue;
			}

			const roots = rationalRootsUnivariate(univariates[0], variableIndex);

			for (const root of roots) {
				let consistent = true;
				for (let polynomialIndex = 1; polynomialIndex < univariates.length; polynomialIndex++) {
					if (!evaluatesToZero(univariates[polynomialIndex], variableIndex, root)) {
						consistent = false;
						break;
					}
				}
				if (!consistent) {
					continue;
				}

				const nextBasis = partialBasis.map(poly => {
					const degree = poly.degree(variableIndex);
					if (degree === null || degree === 0n) {
						return poly;
					}
					const scaled =
						root.d === 1n ? poly : scaleByDenomPow(poly, variableIndex, root.d);
					return scaled.evaluateVariable(variableIndex, root.n);
				});

				const extended = new Map(assignment);
				extended.set(variableIndex, root);
				nextPartials.push({ assignment: extended, basis: nextBasis });
			}
		}

		partials = nextPartials;
	}

	return partials.map(({ assignment }) => {
		const named: RationalSolution = new Map();
		for (const [variableIndex, value] of assignment) {
			if (variableIndex < vars.length) {
				named.set(vars[variableIndex], value);
			}
		}
		return named;
	});
}

/**
 * Scales a polynomial before integer substitution of a rational value n/d.
 *
 * For each term containing x_v^k, the coefficient is multiplied by
 * d^(maxDegree-k), so evaluating x_v at n gives p(n/d) * d^maxDegree.
 */
function scaleByDenomPow(
	poly: SparsePolynomial,
	variableIndex: number,
	denominator: bigint
): SparsePolynomial {
	const maxDegree = poly.degree(variableIndex);
	if (maxDegree === null || maxDegree === 0n || denominator === 1n) {
		return poly;
	}

	return new SparsePolynomial(
		poly.variableCount,
		poly.terms().map(term => ({
			coefficient:
				term.coefficient *
				denominator ** (maxDegree - term.exponents[variableIndex]),
			exponents: term.exponents,
		}))
	);
}

/**
 * Finds all rational roots p/q of a univariate polynomial.
 *
 * Uses the Rational Root Theorem: p divides the constant term and q divides the
 * leading coefficient. Polynomial degree and term exponents remain bigint values.
 */
function rationalRootsUnivariate(
	poly: SparsePolynomial,
	variableIndex: number
): Array<{ n: bigint; d: bigint }> {
	const degree = poly.degree(variableIndex);
	if (degree === null || degree === 0n) {
		return [];
	}

	const leadingCoefficient = poly.coefficientIn(variableIndex, degree).constantTerm();
	const constantTerm = poly.constantTerm();

	if (constantTerm === 0n) {
		const roots: Array<{ n: bigint; d: bigint }> = [{ n: 0n, d: 1n }];
		let commonPower = degree;
		for (const term of poly.terms()) {
			if (term.exponents[variableIndex] < commonPower) {
				commonPower = term.exponents[variableIndex];
			}
		}

		const shifted = new SparsePolynomial(
			poly.variableCount,
			poly.terms().map(term => {
				const exponents = [...term.exponents];
				exponents[variableIndex] -= commonPower;
				return { coefficient: term.coefficient, exponents };
			})
		);
		for (const root of rationalRootsUnivariate(shifted, variableIndex)) {
			if (root.n !== 0n) {
				roots.push(root);
			}
		}
		return roots;
	}

	const numeratorDivisors = positiveDivisors(bigintAbs(constantTerm));
	const denominatorDivisors = positiveDivisors(bigintAbs(leadingCoefficient));
	const roots: Array<{ n: bigint; d: bigint }> = [];
	const seen = new Set<string>();

	for (const numeratorFactor of numeratorDivisors) {
		for (const denominatorFactor of denominatorDivisors) {
			for (const sign of [1n, -1n]) {
				const numerator = sign * numeratorFactor;
				const divisor = bigintGCD(bigintAbs(numerator), denominatorFactor);
				const reducedNumerator = numerator / divisor;
				const reducedDenominator = denominatorFactor / divisor;
				const key = `${reducedNumerator}/${reducedDenominator}`;
				if (seen.has(key)) {
					continue;
				}
				seen.add(key);

				if (
					evaluatesAtRationalToZero(
						poly,
						variableIndex,
						degree,
						reducedNumerator,
						reducedDenominator
					)
				) {
					roots.push({ n: reducedNumerator, d: reducedDenominator });
				}
			}
		}
	}

	return roots;
}

/**
 * Evaluates a univariate polynomial at n/d after clearing d^degree.
 */
function evaluatesAtRationalToZero(
	poly: SparsePolynomial,
	variableIndex: number,
	degree: bigint,
	numerator: bigint,
	denominator: bigint
): boolean {
	let result = 0n;
	for (const term of poly.terms()) {
		const exponent = term.exponents[variableIndex];
		result +=
			term.coefficient *
			numerator ** exponent *
			denominator ** (degree - exponent);
	}
	return result === 0n;
}

/** Checks whether substituting one rational value makes a univariate polynomial zero. */
function evaluatesToZero(
	poly: SparsePolynomial,
	variableIndex: number,
	value: { n: bigint; d: bigint }
): boolean {
	const degree = poly.degree(variableIndex);
	if (degree === null) {
		return true;
	}
	if (degree === 0n) {
		return poly.constantTerm() === 0n;
	}
	return evaluatesAtRationalToZero(poly, variableIndex, degree, value.n, value.d);
}

/** Positive divisors of a positive bigint. */
function positiveDivisors(n: bigint): bigint[] {
	if (n === 0n) {
		return [0n];
	}
	if (n < 0n) {
		n = -n;
	}
	const divisors: bigint[] = [];
	let candidate = 1n;
	while (candidate * candidate <= n) {
		if (n % candidate === 0n) {
			divisors.push(candidate);
			if (candidate !== n / candidate) {
				divisors.push(n / candidate);
			}
		}
		candidate++;
	}
	return divisors;
}
