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
 */

import { GCD as bigintGCD, abs as bigintAbs } from '../../core/functions/bigint/bigint';

import { MultiPoly, keyToExp, expToKey, type Exponents } from './multiPoly/MultiPoly';
import {
	monoDividesDense,
	monoSubDense,
	mvDivideByCoeffContent,
	mvNormalize,
	mulPoly,
	subPoly,
	scalePoly,
	negPoly,
	substituteVarIndex,
} from './poly';

// ============================================================================
// Public types
// ============================================================================

export type MonomialOrder = 'LEX' | 'GRLEX' | 'GREVLEX';

export type GroebnerStats = {
	pairsPopped: number;
	pairsSkippedProduct: number;
	pairsSkippedChain: number;
	pairsReducedToZero: number;
	basisAppends: number;
};

export type GroebnerBasisOptions = {
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

export class GroebnerBudgetExceeded extends Error {
	readonly stats: GroebnerStats;
	constructor(message: string, stats: GroebnerStats) {
		super(message);
		this.name = 'GroebnerBudgetExceeded';
		this.stats = stats;
	}
}

// ============================================================================
// Internal helpers
// ============================================================================

type DenseLT = { exp: number[]; coeff: bigint };

function ltOrNull(p: MultiPoly, order: MonomialOrder, nVars: number): DenseLT | null {
	return mvLeadTermDense(p, order, nVars);
}

function polyIsZero(p: MultiPoly): boolean {
	return p.terms.size === 0;
}

function numVarsFromPolys(...polys: readonly MultiPoly[]): number {
	let maxIndex = -1;
	for (const p of polys) {
		for (const key of p.terms.keys()) {
			const exp = keyToExp(key);
			for (const [i, e] of exp.entries()) {
				if (e > 0 && i > maxIndex) {
					maxIndex = i;
				}
			}
		}
	}
	return maxIndex + 1;
}

function polyKey(p: MultiPoly): string {
	const parts: string[] = [];
	for (const [k, c] of p.terms.entries()) {
		if (c !== 0n) {
			parts.push(`${k}:${c.toString()}`);
		}
	}
	parts.sort();
	return parts.join('|');
}

function divScalarExact(p: MultiPoly, d: bigint): MultiPoly {
	if (d === 0n) {
		throw new Error('divScalarExact: divide by 0');
	}
	if (d === 1n) {
		return p;
	}
	const out = new MultiPoly();
	for (const [k, c] of p.terms.entries()) {
		if (c % d !== 0n) {
			throw new Error('divScalarExact: non-exact');
		}
		const q = c / d;
		if (q !== 0n) {
			out.terms.set(k, q);
		}
	}
	out.trim();
	return out;
}

/**
 * Primitive normalization under a given order:
 * - normalize (combine like terms)
 * - divide by coefficient content
 * - ensure leading coefficient (under `order`) is positive
 * - optionally make monic if exact
 */
function primitiveNormalizeOrder(p0: MultiPoly, order: MonomialOrder, nVars: number): MultiPoly {
	if (polyIsZero(p0)) {
		return MultiPoly.zero();
	}
	let p = mvNormalize(p0);

	const { primitive } = mvDivideByCoeffContent(p);
	p = mvNormalize(primitive);

	// Fix sign using the requested order
	const lt = ltOrNull(p, order, nVars);
	if (lt && lt.coeff < 0n) {
		p = negPoly(p);
	}

	// Attempt monic (exact) if possible
	const lt2 = ltOrNull(p, order, nVars);
	if (lt2 && lt2.coeff !== 0n && lt2.coeff !== 1n) {
		const lc = lt2.coeff;
		let ok = true;
		for (const c of p.terms.values()) {
			if (c % lc !== 0n) {
				ok = false;
				break;
			}
		}
		if (ok) {
			p = mvNormalize(divScalarExact(p, lc));
		}
	}

	return p;
}

// ============================================================================
// S-polynomial (fraction-free)
// ============================================================================

function sPolynomialFF(
	f0: MultiPoly,
	g0: MultiPoly,
	order: MonomialOrder,
	nVars: number
): MultiPoly {
	const f = mvNormalize(f0);
	const g = mvNormalize(g0);
	const ltF = ltOrNull(f, order, nVars);
	const ltG = ltOrNull(g, order, nVars);
	if (!ltF || !ltG) {
		return MultiPoly.zero();
	}

	const l = expLcmDense(ltF.exp, ltG.exp);
	const a = monoSubDense(l, ltF.exp);
	const b = monoSubDense(l, ltG.exp);

	// fraction-free S: lc(g)*x^a*f - lc(f)*x^b*g
	const m1 = MultiPoly.monomial(ltG.coeff, a);
	const m2 = MultiPoly.monomial(ltF.coeff, b);
	const term1 = mulPoly(f, m1);
	const term2 = mulPoly(g, m2);
	return mvNormalize(subPoly(term1, term2));
}

// ============================================================================
// Normal form (fraction-free)
// ============================================================================

/** Head reduction (fraction-free) using leading terms only. */
function normalFormFractionFree(
	f0: MultiPoly,
	G: readonly MultiPoly[],
	order: MonomialOrder,
	nVars: number
): MultiPoly {
	let f = mvNormalize(f0);
	if (polyIsZero(f)) {
		return f;
	}

	while (true) {
		const ltF = ltOrNull(f, order, nVars);
		if (!ltF) {
			break;
		}

		let reduced = false;
		for (const g0 of G) {
			const g = mvNormalize(g0);
			if (polyIsZero(g)) {
				continue;
			}
			const ltG = ltOrNull(g, order, nVars);
			if (!ltG) {
				continue;
			}
			if (!monoDividesDense(ltG.exp, ltF.exp)) {
				continue;
			}

			const multExp = monoSubDense(ltF.exp, ltG.exp);
			// fraction-free cancel the head term:
			// f := lc(g)*f - lc(f)*x^(multExp)*g
			const left = scalePoly(f, ltG.coeff);
			const right = mulPoly(g, MultiPoly.monomial(ltF.coeff, multExp));
			f = mvNormalize(subPoly(left, right));
			reduced = true;
			break;
		}
		if (!reduced) {
			break;
		}
	}
	return f;
}

function collectDenseTermsDesc(
	p: MultiPoly,
	order: MonomialOrder,
	nVars: number
): Array<{ exp: number[]; coeff: bigint }> {
	const terms: Array<{ exp: number[]; coeff: bigint }> = [];
	for (const [key, coeff] of p.terms.entries()) {
		if (coeff === 0n) {
			continue;
		}
		const expMap = keyToExp(key);
		const dense = new Array<number>(nVars).fill(0);
		for (const [i, e] of expMap.entries()) {
			if (i >= 0 && i < nVars) {
				dense[i] = e;
			}
		}
		terms.push({ exp: dense, coeff });
	}
	terms.sort((a, b) => -compareMonomialDense(a.exp, b.exp, order));
	return terms;
}

/**
 * Fraction-free reduction allowing reduction of ANY term (tail reduction),
 * without requiring coefficient division.
 *
 * For a term t in f and a reducer g whose LM divides t, we cancel t via:
 *   f := lc(g) * f - coeff(t) * x^(tExp - LM(g)) * g
 * and then normalize/primitive-reduce to control coefficient growth.
 */
function normalFormFractionFreeAllTerms(
	f0: MultiPoly,
	G: readonly MultiPoly[],
	order: MonomialOrder,
	nVars: number
): MultiPoly {
	let f = primitiveNormalizeOrder(mvNormalize(f0), order, nVars);
	if (polyIsZero(f) || G.length === 0) {
		return f;
	}

	// Pre-normalize all reducers and cache their leading terms once.
	// The reducers don't change during the loop, so this avoids O(|G| * iterations)
	// redundant normalizations.
	const normalizedG: Array<{ poly: MultiPoly; lt: DenseLT }> = [];
	for (const g0 of G) {
		const g = primitiveNormalizeOrder(mvNormalize(g0), order, nVars);
		if (polyIsZero(g)) {
			continue;
		}
		const lt = ltOrNull(g, order, nVars);
		if (!lt || lt.coeff === 0n) {
			continue;
		}
		normalizedG.push({ poly: g, lt });
	}

	if (normalizedG.length === 0) {
		return f;
	}

	while (true) {
		let changed = false;
		const fTerms = collectDenseTermsDesc(f, order, nVars);
		if (fTerms.length === 0) {
			break;
		}

		outer: for (const t of fTerms) {
			for (const { poly: g, lt: ltG } of normalizedG) {
				if (!monoDividesDense(ltG.exp, t.exp)) {
					continue;
				}

				const multExp = monoSubDense(t.exp, ltG.exp);
				const left = scalePoly(f, ltG.coeff);
				const right = mulPoly(g, MultiPoly.monomial(t.coeff, multExp));
				f = primitiveNormalizeOrder(mvNormalize(subPoly(left, right)), order, nVars);

				changed = true;
				break outer;
			}
		}

		if (!changed) {
			break;
		}
	}

	return f;
}

// ============================================================================
// Canonicalization
// ============================================================================

/** For each variable index 0..nVars-1, returns true if that variable appears in p. */
function variablePresence(p: MultiPoly, nVars: number): boolean[] {
	const a = new Array<boolean>(nVars).fill(false);
	for (const k of p.terms.keys()) {
		const exp = keyToExp(k);
		for (const [i, e] of exp.entries()) {
			if (e > 0) {
				a[i] = true;
			}
		}
	}
	return a;
}

function canonicalizeBasis(
	G0: readonly MultiPoly[],
	order: MonomialOrder,
	nVars: number
): MultiPoly[] {
	const kept: MultiPoly[] = [];
	const input = G0.filter(p => !polyIsZero(p)).map(p => mvNormalize(p));

	// 1) Reduce each element against what we've already kept, then normalize.
	for (const p of input) {
		const r0 = normalFormFractionFree(p, kept, order, nVars);
		const r1 = normalFormFractionFreeAllTerms(r0, kept, order, nVars);
		const rn = primitiveNormalizeOrder(r1, order, nVars);
		if (!polyIsZero(rn)) {
			kept.push(rn);
		}
	}

	// 2) Interreduce: each polynomial reduced by all others.
	const out: MultiPoly[] = [];
	for (let i = 0; i < kept.length; i++) {
		const others = kept.filter((_, j) => j !== i);
		const ri0 = normalFormFractionFree(kept[i], others, order, nVars);
		const ri1 = normalFormFractionFreeAllTerms(ri0, others, order, nVars);
		const rn = primitiveNormalizeOrder(ri1, order, nVars);
		if (!polyIsZero(rn)) {
			out.push(rn);
		}
	}

	// 3) Dedupe by leading monomial.
	const betterSameLM = (p: MultiPoly, q: MultiPoly): MultiPoly => {
		const pp = variablePresence(p, nVars);
		const qp = variablePresence(q, nVars);

		let cp = 0;
		let cq = 0;
		for (let i = 0; i < nVars; i++) {
			if (pp[i]) {
				cp++;
			}
			if (qp[i]) {
				cq++;
			}
		}
		if (cp !== cq) {
			return cp < cq ? p : q;
		}

		if (p.terms.size !== q.terms.size) {
			return p.terms.size < q.terms.size ? p : q;
		}

		const ltp = ltOrNull(p, order, nVars);
		const ltq = ltOrNull(q, order, nVars);
		if (ltp && ltq) {
			const ap = bigintAbs(ltp.coeff);
			const aq = bigintAbs(ltq.coeff);
			if (ap !== aq) {
				return ap < aq ? p : q;
			}
		}
		return p;
	};

	const byPoly = new Map<string, MultiPoly>();
	for (const p of out) {
		const key = polyKey(p);
		const prev = byPoly.get(key);
		if (!prev) {
			byPoly.set(key, p);
			continue;
		}
		byPoly.set(key, betterSameLM(prev, p));
	}
	const arr = Array.from(byPoly.values());
	arr.sort((p, q) => {
		const pp = variablePresence(p, nVars);
		const qp = variablePresence(q, nVars);
		for (let i = 0; i < nVars; i++) {
			const ap = pp[i] ? 1 : 0;
			const aq = qp[i] ? 1 : 0;
			if (ap !== aq) {
				return ap - aq;
			}
		}
		const ltp = ltOrNull(p, order, nVars);
		const ltq = ltOrNull(q, order, nVars);
		if (ltp && ltq) {
			const c = compareMonomialDense(ltp.exp, ltq.exp, order);
			if (c !== 0) {
				return c;
			}
		}
		return p.terms.size - q.terms.size;
	});
	return arr;
}

// ============================================================================
// Sugar strategy
// ============================================================================

/**
 * Sugar degree of a polynomial: the total degree of its leading monomial.
 * This is the initial sugar value assigned when a polynomial enters the basis.
 */
function sugarDegree(p: MultiPoly, order: MonomialOrder, nVars: number): number {
	const lt = ltOrNull(p, order, nVars);
	if (!lt) {
		return 0;
	}
	return monomialTotalDegreeDense(lt.exp);
}

/**
 * Sugar degree of an S-polynomial S(f,g).
 *
 * sugar(S(f,g)) = max(sugar(f) + deg(lcm/LM(f)), sugar(g) + deg(lcm/LM(g)))
 *
 * where deg() is total degree difference between the lcm and respective LMs.
 */
function sPairSugar(sugarF: number, sugarG: number, ltF: number[], ltG: number[]): number {
	const lcm = expLcmDense(ltF, ltG);
	const lcmDeg = monomialTotalDegreeDense(lcm);
	const degF = monomialTotalDegreeDense(ltF);
	const degG = monomialTotalDegreeDense(ltG);
	return Math.max(sugarF + (lcmDeg - degF), sugarG + (lcmDeg - degG));
}

type CriticalPair = {
	i: number;
	j: number;
	sugar: number;
	/** Total degree of lcm(LM(G[i]), LM(G[j])). Used for tie-breaking. */
	lcmDeg: number;
};

/**
 * Insert a pair into a sugar-sorted queue.
 * Primary sort: ascending sugar. Secondary: ascending lcmDeg.
 * Uses binary insertion to keep the queue sorted.
 */
function insertPairSorted(queue: CriticalPair[], pair: CriticalPair): void {
	let lo = 0;
	let hi = queue.length;
	while (lo < hi) {
		const mid = (lo + hi) >>> 1;
		const m = queue[mid];
		if (m.sugar < pair.sugar || (m.sugar === pair.sugar && m.lcmDeg < pair.lcmDeg)) {
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

function groebnerBasis(polys: readonly MultiPoly[], order?: MonomialOrder): MultiPoly[];
function groebnerBasis(polys: readonly MultiPoly[], opts?: GroebnerBasisOptions): MultiPoly[];
function groebnerBasis(
	polys: readonly MultiPoly[],
	orderOrOpts: MonomialOrder | GroebnerBasisOptions = 'LEX'
): MultiPoly[] {
	const opts: GroebnerBasisOptions =
		typeof orderOrOpts === 'string' ? { order: orderOrOpts } : (orderOrOpts ?? {});
	const order: MonomialOrder = opts.order ?? 'LEX';
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

	const F = polys.filter(p => !polyIsZero(p)).map(p => mvNormalize(p));
	if (F.length === 0) {
		return [];
	}

	const nVars = numVarsFromPolys(...F);

	const G: MultiPoly[] = F.slice();

	// Sugar degrees tracked per basis element
	const sugarArr: number[] = G.map(p => sugarDegree(p, order, nVars));

	// Leading-monomial cache: index → dense exponent vector.
	// Basis elements are append-only and immutable once added, so cache entries never stale.
	const lmCache: Array<number[] | null> = G.map(p => {
		const lt = ltOrNull(p, order, nVars);
		return lt ? lt.exp : null;
	});

	// Buchberger criteria bookkeeping.
	const zeroPairs = new Set<string>();
	const pairKey = (i: number, j: number): string => (i < j ? `${i},${j}` : `${j},${i}`);

	const lmExpCached = (idx: number): number[] | null => {
		if (idx < lmCache.length) {
			return lmCache[idx];
		}
		const lt = ltOrNull(G[idx], order, nVars);
		const exp = lt ? lt.exp : null;
		lmCache[idx] = exp;
		return exp;
	};

	const areCoprimeLM = (a: number[], b: number[]): boolean => {
		for (let i = 0; i < nVars; i++) {
			if (a[i] > 0 && b[i] > 0) {
				return false;
			}
		}
		return true;
	};

	const chainCriterionApplies = (i: number, j: number): boolean => {
		const li = lmExpCached(i);
		const lj = lmExpCached(j);
		if (!li || !lj) {
			return false;
		}
		const lcm = expLcmDense(li, lj);
		for (let k = 0; k < G.length; k++) {
			if (k === i || k === j) {
				continue;
			}
			const lk = lmExpCached(k);
			if (!lk) {
				continue;
			}
			if (!monoDividesDense(lk, lcm)) {
				continue;
			}
			if (zeroPairs.has(pairKey(i, k)) && zeroPairs.has(pairKey(k, j))) {
				return true;
			}
		}
		return false;
	};

	// Build initial pair queue
	if (strategy === 'sugar') {
		const pairQueue: CriticalPair[] = [];

		const makePair = (i: number, j: number): CriticalPair | null => {
			const li = lmExpCached(i);
			const lj = lmExpCached(j);
			if (!li || !lj) {
				return null;
			}
			const lcm = expLcmDense(li, lj);
			return {
				i,
				j,
				sugar: sPairSugar(sugarArr[i], sugarArr[j], li, lj),
				lcmDeg: monomialTotalDegreeDense(lcm),
			};
		};

		for (let i = 0; i < G.length; i++) {
			for (let j = i + 1; j < G.length; j++) {
				const cp = makePair(i, j);
				if (cp) {
					insertPairSorted(pairQueue, cp);
				}
			}
		}

		while (pairQueue.length > 0) {
			const { i, j, sugar: pairSugar } = pairQueue.shift()!;
			stats.pairsPopped++;

			if (maxPairsPopped !== undefined && stats.pairsPopped > maxPairsPopped) {
				throw new GroebnerBudgetExceeded(
					`Groebner budget exceeded: pairsPopped > ${maxPairsPopped}`,
					stats
				);
			}

			// Buchberger criteria
			const lmi = lmExpCached(i);
			const lmj = lmExpCached(j);
			if (lmi && lmj && areCoprimeLM(lmi, lmj)) {
				stats.pairsSkippedProduct++;
				zeroPairs.add(pairKey(i, j));
				continue;
			}
			if (chainCriterionApplies(i, j)) {
				stats.pairsSkippedChain++;
				zeroPairs.add(pairKey(i, j));
				continue;
			}

			const S = sPolynomialFF(G[i], G[j], order, nVars);
			const h0 = normalFormFractionFree(S, G, order, nVars);
			const h1 = normalFormFractionFreeAllTerms(h0, G, order, nVars);
			const h = primitiveNormalizeOrder(h1, order, nVars);

			if (polyIsZero(h)) {
				stats.pairsReducedToZero++;
				zeroPairs.add(pairKey(i, j));
			} else if (h.isConstant() && h.constantTerm() !== 0n) {
				return [MultiPoly.constant(1n)];
			} else {
				const k = G.length;
				G.push(h);

				// Cache the LM of the new element
				const ltH = ltOrNull(h, order, nVars);
				lmCache.push(ltH ? ltH.exp : null);

				// Sugar of the new element: max of the pair sugar and the actual degree
				const hDeg = sugarDegree(h, order, nVars);
				sugarArr.push(Math.max(pairSugar, hDeg));

				stats.basisAppends++;
				if (maxBasisSize !== undefined && G.length > maxBasisSize) {
					throw new GroebnerBudgetExceeded(
						`Groebner budget exceeded: basis size > ${maxBasisSize}`,
						stats
					);
				}

				for (let t = 0; t < k; t++) {
					const cp = makePair(t, k);
					if (cp) {
						insertPairSorted(pairQueue, cp);
					}
				}
			}
		}
	} else {
		// FIFO strategy (original behavior)
		const pairs: Array<[number, number]> = [];
		for (let i = 0; i < G.length; i++) {
			for (let j = i + 1; j < G.length; j++) {
				pairs.push([i, j]);
			}
		}

		while (pairs.length > 0) {
			const [i, j] = pairs.shift()!;
			stats.pairsPopped++;

			if (maxPairsPopped !== undefined && stats.pairsPopped > maxPairsPopped) {
				throw new GroebnerBudgetExceeded(
					`Groebner budget exceeded: pairsPopped > ${maxPairsPopped}`,
					stats
				);
			}

			const lmi = lmExpCached(i);
			const lmj = lmExpCached(j);
			if (lmi && lmj && areCoprimeLM(lmi, lmj)) {
				stats.pairsSkippedProduct++;
				zeroPairs.add(pairKey(i, j));
				continue;
			}
			if (chainCriterionApplies(i, j)) {
				stats.pairsSkippedChain++;
				zeroPairs.add(pairKey(i, j));
				continue;
			}

			const S = sPolynomialFF(G[i], G[j], order, nVars);
			const h0 = normalFormFractionFree(S, G, order, nVars);
			const h1 = normalFormFractionFreeAllTerms(h0, G, order, nVars);
			const h = primitiveNormalizeOrder(h1, order, nVars);
			if (polyIsZero(h)) {
				stats.pairsReducedToZero++;
				zeroPairs.add(pairKey(i, j));
			} else if (h.isConstant() && h.constantTerm() !== 0n) {
				return [MultiPoly.constant(1n)];
			} else {
				const k = G.length;
				G.push(h);

				// Cache the LM of the new element
				const ltH = ltOrNull(h, order, nVars);
				lmCache.push(ltH ? ltH.exp : null);

				stats.basisAppends++;
				if (maxBasisSize !== undefined && G.length > maxBasisSize) {
					throw new GroebnerBudgetExceeded(
						`Groebner budget exceeded: basis size > ${maxBasisSize}`,
						stats
					);
				}
				for (let t = 0; t < k; t++) {
					pairs.push([t, k]);
				}
			}
		}
	}

	return reduced ? canonicalizeBasis(G, order, nVars) : G;
}

// ============================================================================
// Public API: Groebner basis
// ============================================================================

/**
 * Compute a Gröbner basis for the ideal generated by `polys`.
 *
 * @param polys  - generators (MultiPoly over Z with variable indices matching `vars`)
 * @param vars   - variable names (used for display and to fix nVars)
 * @param order  - monomial order (default LEX)
 * @param reduced - whether to interreduce (default true)
 * @returns the Gröbner basis, sorted deterministically
 */
export function Groebner(
	polys: MultiPoly[],
	vars: string[],
	order: MonomialOrder = 'LEX',
	reduced = true
): MultiPoly[] {
	if (polys.length === 0) {
		return [];
	}

	const nVars = vars.length;
	const G = groebnerBasis(polys, { order, reduced });

	// Present basis deterministically in a SymPy-like order:
	// 1) Prefer polynomials that involve earlier variables (presence vector, lex-desc)
	// 2) Then by leading monomial under the chosen order (ascending)
	// 3) Then by term count (ascending)
	const cache = new Map<MultiPoly, { pv: boolean[]; lt: DenseLT | null }>();
	const getInfo = (p: MultiPoly) => {
		let info = cache.get(p);
		if (!info) {
			info = { pv: variablePresence(p, nVars), lt: ltOrNull(p, order, nVars) };
			cache.set(p, info);
		}
		return info;
	};

	const cmp = (p: MultiPoly, q: MultiPoly): number => {
		const ip = getInfo(p);
		const iq = getInfo(q);

		for (let i = 0; i < nVars; i++) {
			const ap = ip.pv[i] ? 1 : 0;
			const aq = iq.pv[i] ? 1 : 0;
			if (ap !== aq) {
				return ap > aq ? -1 : 1;
			}
		}

		if (ip.lt && iq.lt) {
			const c = compareMonomialDense(ip.lt.exp, iq.lt.exp, order);
			if (c !== 0) {
				return c;
			}
		}

		const tp = p.terms.size;
		const tq = q.terms.size;
		if (tp !== tq) {
			return tp < tq ? -1 : 1;
		}
		return 0;
	};

	return [...G].sort(cmp);
}

/**
 * Compute a Gröbner basis with full options control.
 * This is the lower-level entry point exposing budget and strategy options.
 */
export function groebnerBasisWithOptions(
	polys: readonly MultiPoly[],
	opts?: GroebnerBasisOptions
): MultiPoly[] {
	return groebnerBasis(polys, opts);
}

// ============================================================================
// Elimination
// ============================================================================

/**
 * Compute the elimination ideal: the intersection of the ideal with
 * the polynomial ring in the variables `keepVars`.
 *
 * This computes a LEX Gröbner basis (with eliminated variables ordered first)
 * and extracts the polynomials that only involve the `keepVars`.
 *
 * @param polys    - generators
 * @param vars     - all variable names, ordered for the LEX computation
 *                   (variables to eliminate should come FIRST)
 * @param keepVars - the variable names to keep (must be a suffix of `vars`)
 * @param opts     - budget options
 * @returns polynomials in the elimination ideal
 */
export function eliminate(
	polys: MultiPoly[],
	vars: string[],
	keepVars: string[],
	opts?: Omit<GroebnerBasisOptions, 'order'>
): MultiPoly[] {
	if (polys.length === 0) {
		return [];
	}

	// Determine which variable indices to eliminate
	const keepSet = new Set(keepVars);
	const eliminateIndices = new Set<number>();
	for (let i = 0; i < vars.length; i++) {
		if (!keepSet.has(vars[i])) {
			eliminateIndices.add(i);
		}
	}

	// Compute LEX basis (elimination order: variables to eliminate are first = most significant)
	const G = groebnerBasis(polys, { ...opts, order: 'LEX', reduced: true });

	// Extract polynomials that don't involve any eliminated variable
	const nVars = vars.length;
	const result: MultiPoly[] = [];
	for (const g of G) {
		const pv = variablePresence(g, nVars);
		let ok = true;
		for (const ei of eliminateIndices) {
			if (pv[ei]) {
				ok = false;
				break;
			}
		}
		if (ok) {
			result.push(g);
		}
	}

	return result;
}

// ============================================================================
// Ideal membership
// ============================================================================

/**
 * Test whether polynomial `f` belongs to the ideal generated by `polys`.
 *
 * Computes a Gröbner basis of the generators and reduces `f` against it.
 * Returns true iff the normal form is zero.
 *
 * @param f     - polynomial to test
 * @param polys - ideal generators
 * @param order - monomial order (default LEX)
 * @param opts  - budget options
 */
export function idealMembership(
	f: MultiPoly,
	polys: MultiPoly[],
	order: MonomialOrder = 'LEX',
	opts?: Omit<GroebnerBasisOptions, 'order' | 'reduced'>
): boolean {
	if (polyIsZero(f)) {
		return true;
	}
	if (polys.length === 0) {
		return false;
	}

	const G = groebnerBasis(polys, { ...opts, order, reduced: true });
	return polyIsZero(reduceByBasis(f, G, order));
}

/**
 * Reduce a polynomial modulo a Gröbner basis (or any polynomial set).
 * Returns the fully reduced normal form.
 *
 * This does NOT compute the Gröbner basis — the caller is responsible for
 * ensuring `basis` is already a Gröbner basis if a canonical result is desired.
 */
export function reduceByBasis(
	f: MultiPoly,
	basis: readonly MultiPoly[],
	order: MonomialOrder = 'LEX'
): MultiPoly {
	if (polyIsZero(f) || basis.length === 0) {
		return mvNormalize(f);
	}

	const nVars = numVarsFromPolys(f, ...basis);
	const h0 = normalFormFractionFree(f, basis, order, nVars);
	const h1 = normalFormFractionFreeAllTerms(h0, basis, order, nVars);
	return primitiveNormalizeOrder(h1, order, nVars);
}

// ============================================================================
// Solving polynomial systems via LEX Gröbner + back-substitution
// ============================================================================

/**
 * A solution to a polynomial system: mapping variable name → rational number (n/d).
 * Only rational solutions (bigint numerator/denominator) are returned.
 */
export type RationalSolution = Map<string, { n: bigint; d: bigint }>;

/**
 * Solve a system of polynomial equations over Q by computing a LEX Gröbner basis
 * and performing triangular back-substitution.
 *
 * Requirements / caveats:
 * - The system must be zero-dimensional (finitely many solutions).
 * - Only rational solutions are found (irrational roots are not returned).
 * - Variables should be ordered so that the Gröbner basis produces a
 *   triangular system (the standard LEX property for 0-dimensional ideals).
 *
 * @param polys - system generators
 * @param vars  - variable names in elimination order (first = most significant in LEX)
 * @param opts  - budget options forwarded to the Gröbner computation
 * @returns array of rational solutions (may be empty if no rational roots exist)
 */
export function solve(
	polys: MultiPoly[],
	vars: string[],
	opts?: Omit<GroebnerBasisOptions, 'order' | 'reduced'>
): RationalSolution[] {
	if (polys.length === 0 || vars.length === 0) {
		return [new Map()];
	}

	const G = groebnerBasis(polys, { ...opts, order: 'LEX', reduced: true });

	// Trivial: if the basis is {1}, the system is inconsistent.
	if (G.length === 1 && G[0].isConstant() && G[0].constantTerm() !== 0n) {
		return [];
	}
	if (G.length === 0) {
		// Ideal is {0}, meaning every point is a solution — infinite solutions.
		return [];
	}

	const nVars = vars.length;
	return backSubstitute(G, vars, nVars);
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
	G: readonly MultiPoly[],
	vars: string[],
	nVars: number
): RationalSolution[] {
	type PartialSolution = {
		assignment: Map<number, { n: bigint; d: bigint }>;
		/** Basis polynomials with all already-solved variables substituted out. */
		basis: MultiPoly[];
	};

	// Start with a single empty partial assignment, basis = original
	let partials: PartialSolution[] = [
		{
			assignment: new Map(),
			basis: G.map(g => mvNormalize(g)),
		},
	];

	// Solve from last variable to first
	for (let v = nVars - 1; v >= 0; v--) {
		const nextPartials: PartialSolution[] = [];

		for (const { assignment, basis } of partials) {
			// Find polynomials that are now univariate in variable v
			const univariates = basis.filter(p => {
				if (polyIsZero(p)) {
					return false;
				}
				for (const key of p.terms.keys()) {
					const exp = keyToExp(key);
					for (const [i, e] of exp.entries()) {
						if (e > 0 && i !== v) {
							return false;
						}
					}
				}
				return p.degree(v) > 0;
			});

			if (univariates.length === 0) {
				// No constraint on this variable — push forward as-is.
				nextPartials.push({ assignment: new Map(assignment), basis });
				continue;
			}

			// Extract rational roots of the first univariate polynomial.
			const poly = univariates[0];
			const roots = rationalRootsUnivariate(poly, v);

			// Filter roots by consistency with other univariates
			for (const root of roots) {
				let consistent = true;
				for (let k = 1; k < univariates.length; k++) {
					if (!evaluatesToZero(univariates[k], v, root)) {
						consistent = false;
						break;
					}
				}
				if (!consistent) {
					continue;
				}

				// Incrementally substitute only variable v into the basis
				const newBasis = basis.map(p => {
					const deg = p.degree(v);
					if (deg <= 0) {
						return p;
					}
					let q = p;
					if (root.d !== 1n) {
						q = scaleByDenomPow(q, v, root.d);
					}
					return mvNormalize(substituteVarIndex(q, v, root.n));
				});

				const ext = new Map(assignment);
				ext.set(v, root);
				nextPartials.push({ assignment: ext, basis: newBasis });
			}
		}

		partials = nextPartials;
	}

	// Convert variable indices back to names
	return partials.map(({ assignment }) => {
		const named: RationalSolution = new Map();
		for (const [vi, val] of assignment) {
			if (vi < vars.length) {
				named.set(vars[vi], val);
			}
		}
		return named;
	});
}

/**
 * Scale polynomial so that substituting x_v = n (integer) correctly accounts
 * for a rational value n/d. For each term with x_v^k, multiply coefficient by d^(maxDeg - k).
 * This gives: p(n/d) * d^maxDeg = result evaluated at x_v = n.
 */
function scaleByDenomPow(p: MultiPoly, varIndex: number, d: bigint): MultiPoly {
	const maxDeg = p.degree(varIndex);
	if (maxDeg <= 0 || d === 1n) {
		return p;
	}

	// Precompute powers of d up to maxDeg
	const dPowers = new Array<bigint>(maxDeg + 1);
	dPowers[0] = 1n;
	for (let i = 1; i <= maxDeg; i++) {
		dPowers[i] = dPowers[i - 1] * d;
	}

	const out = new MultiPoly();
	for (const [key, coeff] of p.terms) {
		const exp = keyToExp(key);
		const k = exp.get(varIndex) ?? 0;
		const newCoeff = coeff * dPowers[maxDeg - k];
		if (newCoeff !== 0n) {
			out.terms.set(key, newCoeff);
		}
	}
	out.trim();
	return out;
}

/**
 * Find all rational roots p/q of a univariate polynomial in variable `varIndex`.
 * Uses the Rational Root Theorem: p divides the constant term, q divides the leading coefficient.
 */
function rationalRootsUnivariate(
	poly: MultiPoly,
	varIndex: number
): Array<{ n: bigint; d: bigint }> {
	const deg = poly.degree(varIndex);
	if (deg <= 0) {
		return [];
	}

	// Extract coefficients as bigint array (index = power of varIndex)
	const coeffs = new Array<bigint>(deg + 1).fill(0n);
	for (const [key, coeff] of poly.terms) {
		const exp = keyToExp(key);
		const d = exp.get(varIndex) ?? 0;
		if (d <= deg) {
			coeffs[d] += coeff;
		}
	}

	// Trim leading zeros
	let actualDeg = deg;
	while (actualDeg > 0 && coeffs[actualDeg] === 0n) {
		actualDeg--;
	}
	if (actualDeg === 0) {
		return [];
	}

	const lc = coeffs[actualDeg];
	const ct = coeffs[0]; // constant term

	if (ct === 0n) {
		// x = 0 is a root; factor it out and recurse
		const roots: Array<{ n: bigint; d: bigint }> = [{ n: 0n, d: 1n }];
		// Shift down: divide by x
		const shiftedPoly = new MultiPoly();
		for (let i = 1; i <= actualDeg; i++) {
			if (coeffs[i] !== 0n) {
				const exp: Exponents = new Map();
				if (i > 1) {
					exp.set(varIndex, i - 1);
				}
				shiftedPoly.terms.set(expToKey(exp), coeffs[i]);
			}
		}
		const moreRoots = rationalRootsUnivariate(shiftedPoly, varIndex);
		for (const r of moreRoots) {
			if (r.n !== 0n) {
				roots.push(r);
			}
		}
		return roots;
	}

	// Divisors of |ct| and |lc|
	const pDivisors = positiveDivisors(bigintAbs(ct));
	const qDivisors = positiveDivisors(bigintAbs(lc));

	const roots: Array<{ n: bigint; d: bigint }> = [];
	const seen = new Set<string>();

	for (const p of pDivisors) {
		for (const q of qDivisors) {
			// Try ±p/q
			for (const sign of [1n, -1n]) {
				const num = sign * p;
				// Reduce to lowest terms
				const g = bigintGCD(bigintAbs(num), q);
				const rn = num / g;
				const rd = q / g;
				const key = `${rn}/${rd}`;
				if (seen.has(key)) {
					continue;
				}
				seen.add(key);

				if (evaluatesCoeffsToZero(coeffs, actualDeg, rn, rd)) {
					roots.push({ n: rn, d: rd });
				}
			}
		}
	}

	return roots;
}

/** Evaluate polynomial coefficients at n/d: check if sum(c_i * n^i * d^(deg-i)) == 0 */
function evaluatesCoeffsToZero(coeffs: bigint[], deg: number, n: bigint, d: bigint): boolean {
	let result = 0n;
	let nPow = 1n;
	let dPow = 1n;

	// Precompute d^deg
	for (let i = 0; i < deg; i++) {
		dPow *= d;
	}

	for (let i = 0; i <= deg; i++) {
		result += coeffs[i] * nPow * dPow;
		nPow *= n;
		if (i < deg && d !== 0n) {
			dPow /= d;
		}
	}
	return result === 0n;
}

/** Check if substituting varIndex = n/d into poly gives zero. */
function evaluatesToZero(
	poly: MultiPoly,
	varIndex: number,
	val: { n: bigint; d: bigint }
): boolean {
	const deg = poly.degree(varIndex);
	if (deg <= 0) {
		return polyIsZero(poly) || poly.constantTerm() === 0n;
	}

	let p = poly;
	if (val.d !== 1n) {
		p = scaleByDenomPow(p, varIndex, val.d);
	}
	const result = substituteVarIndex(p, varIndex, val.n);
	return polyIsZero(mvNormalize(result));
}

/** Positive divisors of a positive bigint. */
function positiveDivisors(n: bigint): bigint[] {
	if (n === 0n) {
		return [0n];
	}
	if (n < 0n) {
		n = -n;
	}
	const divs: bigint[] = [];
	let i = 1n;
	while (i * i <= n) {
		if (n % i === 0n) {
			divs.push(i);
			if (i !== n / i) {
				divs.push(n / i);
			}
		}
		i++;
	}
	return divs;
}

// ============================================================================
// Monomial order comparisons and utilities
// ============================================================================

/**
 * Leading term under a specified monomial order using dense exponent vectors.
 * Returns null for the zero polynomial.
 */
function mvLeadTermDense(
	p: MultiPoly,
	order: MonomialOrder,
	nVars: number
): { exp: number[]; coeff: bigint } | null {
	if (p.terms.size === 0) {
		return null;
	}
	let bestExp: number[] | null = null;
	let bestCoeff = 0n;
	for (const [key, coeff] of p.terms.entries()) {
		if (coeff === 0n) {
			continue;
		}
		const expMap = keyToExp(key);
		const dense = new Array<number>(nVars).fill(0);
		for (const [i, e] of expMap.entries()) {
			if (i >= 0 && i < nVars) {
				dense[i] = e;
			}
		}
		if (!bestExp || compareMonomialDense(dense, bestExp, order) > 0) {
			bestExp = dense;
			bestCoeff = coeff;
		}
	}
	return bestExp ? { exp: bestExp, coeff: bestCoeff } : null;
}

/** Componentwise lcm (max). */
function expLcmDense(a: readonly number[], b: readonly number[]): number[] {
	const n = Math.max(a.length, b.length);
	const out = new Array<number>(n).fill(0);
	for (let i = 0; i < n; i++) {
		out[i] = Math.max(a[i] ?? 0, b[i] ?? 0);
	}
	return out;
}

/**
 * Compare dense exponent vectors under a named monomial order.
 *
 * Returns:
 *  - 1 if a > b
 *  - -1 if a < b
 *  - 0 if equal
 *
 * Convention: variable priority is index order: x0 > x1 > x2 > ...
 */
function compareMonomialDense(
	a: readonly number[],
	b: readonly number[],
	order: MonomialOrder
): number {
	const n = Math.max(a.length, b.length);

	if (order === 'LEX') {
		for (let i = 0; i < n; i++) {
			const ai = a[i] ?? 0;
			const bi = b[i] ?? 0;
			if (ai !== bi) {
				return ai > bi ? 1 : -1;
			}
		}
		return 0;
	}

	const da = monomialTotalDegreeDense(a);
	const db = monomialTotalDegreeDense(b);
	if (da !== db) {
		return da > db ? 1 : -1;
	}

	if (order === 'GRLEX') {
		for (let i = 0; i < n; i++) {
			const ai = a[i] ?? 0;
			const bi = b[i] ?? 0;
			if (ai !== bi) {
				return ai > bi ? 1 : -1;
			}
		}
		return 0;
	}

	// GREVLEX: same total degree; compare from last variable down.
	// At the last index where they differ, the monomial with the *smaller*
	// exponent is considered larger.
	for (let i = n - 1; i >= 0; i--) {
		const ai = a[i] ?? 0;
		const bi = b[i] ?? 0;
		if (ai !== bi) {
			return ai < bi ? 1 : -1;
		}
	}
	return 0;
}

function monomialTotalDegreeDense(m: readonly number[]): number {
	let s = 0;
	for (let i = 0; i < m.length; i++) {
		s += m[i] ?? 0;
	}
	return s;
}
