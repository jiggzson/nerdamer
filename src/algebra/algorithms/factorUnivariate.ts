/**
 * @module factor_univariate
 *
 * Exact univariate polynomial factorization over Z[x].
 */

import {
	abs,
	pow,
	bigIntSqrt,
	modNorm,
	modInv,
	gcd,
	getDivisors,
	bigintBitLength,
	nextPrime32,
	PrimeSelectionError,
} from './arith';
import {
	zTrim,
	zIsZero,
	zLC,
	zDerivative,
	zTryDivExact,
	zPrimitivePart,
	zGcdPrimitivePRS,
	fpAdd,
	fpSub,
	fpMul,
	fpScale,
	fpDivRem,
	fpGCD,
	type ZPoly,
	type FpPoly,
	zNormalizePrimitiveSign,
	zTrimMod,
	zAddMod,
	zSubMod,
	zMulMod,
	zScaleMod,
	zDivRemMod,
	zToSymmetricMod,
} from './poly';

export interface UniFactorZ {
	coefficients: ZPoly;
	multiplicity: number;
}

export interface FactorizationResultZ {
	content: bigint;
	factors: UniFactorZ[];
}

/** Compatibility layer for safe-integer callers. */
export interface UniFactor {
	coefficients: number[];
	multiplicity: number;
}
export interface FactorizationResult {
	content: number;
	factors: UniFactor[];
}

function sqrtExactBigint(n: bigint): bigint | null {
	if (n < 0n) {
		return null;
	}
	const r = bigIntSqrt(n);
	return r * r === n ? r : null;
}

function degZPoly(f: ZPoly): number {
	const t = zTrim(f);
	if (t.length === 1 && t[0] === 0n) {
		return -1;
	}

	return t.length - 1;
}

// ============================================================================
// MOD p ARITHMETIC (BigInt GF(p))
// ============================================================================

// We represent F_p[x] polynomials with the same coefficient array type as ZPoly.
// The only difference is that coefficients are interpreted modulo p.

const modP = (a: bigint, p: bigint): bigint => modNorm(a, p);
const invP = (a: bigint, p: bigint): bigint => modInv(a, p);

const asFp = (coeffs: ZPoly, p: bigint): FpPoly => ({ p, coeffs });

const addFp = (a: ZPoly, b: ZPoly, p: bigint): ZPoly => fpAdd(asFp(a, p), asFp(b, p)).coeffs;
const subFp = (a: ZPoly, b: ZPoly, p: bigint): ZPoly => fpSub(asFp(a, p), asFp(b, p)).coeffs;
const mulFp = (a: ZPoly, b: ZPoly, p: bigint): ZPoly => fpMul(asFp(a, p), asFp(b, p)).coeffs;
const scalarMulFp = (a: ZPoly, c: bigint, p: bigint): ZPoly => fpScale(asFp(a, p), c).coeffs;
const divFp = (f: ZPoly, g: ZPoly, p: bigint): [ZPoly, ZPoly] => {
	const { q, r } = fpDivRem(asFp(f, p), asFp(g, p));
	return [q.coeffs, r.coeffs];
};
const gcdFp = (f: ZPoly, g: ZPoly, p: bigint): ZPoly => fpGCD(asFp(f, p), asFp(g, p)).coeffs;

// x^e mod f over Fp
function powXModFp(e: bigint, f: ZPoly, p: bigint): ZPoly {
	if (e === 0n) {
		return [1n];
	}
	let result: ZPoly = [1n];
	let base: ZPoly = [0n, 1n]; // x
	// reduce base mod f
	base = divFp(base, f, p)[1];

	let k = e;
	while (k > 0n) {
		if (k & 1n) {
			result = divFp(mulFp(result, base, p), f, p)[1];
		}
		base = divFp(mulFp(base, base, p), f, p)[1];
		k >>= 1n;
	}
	return zTrim(result);
}

// pow(h, e) mod f over Fp
function powPolyModFp(h: ZPoly, e: bigint, f: ZPoly, p: bigint): ZPoly {
	if (e === 0n) {
		return [1n];
	}
	let result: ZPoly = [1n];
	let base = divFp(h, f, p)[1];

	let k = e;
	while (k > 0n) {
		if (k & 1n) {
			result = divFp(mulFp(result, base, p), f, p)[1];
		}
		base = divFp(mulFp(base, base, p), f, p)[1];
		k >>= 1n;
	}
	return zTrim(result);
}

// ============================================================================
// BERLEKAMP (correct Frobenius powers)
// ============================================================================

function berlekampMatrixFp(f: ZPoly, p: bigint): bigint[][] {
	const n = degZPoly(f);
	if (n <= 0) {
		return [];
	}
	const QminusI: bigint[][] = [];

	for (let i = 0; i < n; i++) {
		// FIX: x^(p^i) mod f (NOT x^(i*p))
		const exp = pow(p, BigInt(i));
		const xpi = powXModFp(exp, f, p);

		const row: bigint[] = new Array(n).fill(0n);
		for (let j = 0; j < n; j++) {
			row[j] = modP(xpi[j] ?? 0n, p);
		}
		row[i] = modP(row[i] - 1n, p); // subtract I
		QminusI.push(row);
	}
	return QminusI;
}

function nullSpaceFp(A: bigint[][], p: bigint): bigint[][] {
	const m = A.length;
	if (m === 0) {
		return [];
	}
	const n = A[0].length;

	// row-reduced echelon form
	const M = A.map(r => r.map(x => modP(x, p)));
	const pivotCols: number[] = [];
	let pivotRow = 0;

	for (let col = 0; col < n && pivotRow < m; col++) {
		let sel = -1;
		for (let r = pivotRow; r < m; r++) {
			if (M[r][col] !== 0n) {
				sel = r;
				break;
			}
		}
		if (sel === -1) {
			continue;
		}
		[M[pivotRow], M[sel]] = [M[sel], M[pivotRow]];

		const inv = invP(M[pivotRow][col], p);
		for (let j = col; j < n; j++) {
			M[pivotRow][j] = modP(M[pivotRow][j] * inv, p);
		}

		for (let r = 0; r < m; r++) {
			if (r === pivotRow) {
				continue;
			}
			const factor = M[r][col];
			if (factor === 0n) {
				continue;
			}
			for (let j = col; j < n; j++) {
				M[r][j] = modP(M[r][j] - factor * M[pivotRow][j], p);
			}
		}

		pivotCols.push(col);
		pivotRow++;
	}

	const isPivot = new Array(n).fill(false);
	for (const c of pivotCols) {
		isPivot[c] = true;
	}

	const freeCols: number[] = [];
	for (let c = 0; c < n; c++) {
		if (!isPivot[c]) {
			freeCols.push(c);
		}
	}

	// If no free cols, nullspace is {0}. But Berlekamp always has at least constant 1 in kernel of Q-I,
	// so with our construction we should have at least 1 free column in typical cases.
	const basis: bigint[][] = [];
	for (const free of freeCols) {
		const v: bigint[] = new Array(n).fill(0n);
		v[free] = 1n;
		for (let i = pivotCols.length - 1; i >= 0; i--) {
			const pc = pivotCols[i];
			let sum = 0n;
			for (let j = pc + 1; j < n; j++) {
				sum = modP(sum + M[i][j] * v[j], p);
			}
			v[pc] = modP(-sum, p);
		}
		basis.push(v);
	}
	// Ensure we always include the constant vector (1,0,0,...)
	// In some edge cases, elimination choices might miss it; add if absent.
	const hasConst = basis.some(v => v[0] === 1n && v.slice(1).every(x => x === 0n));
	if (!hasConst) {
		const v: bigint[] = new Array(n).fill(0n);
		v[0] = 1n;
		basis.unshift(v);
	}
	return basis;
}

function vecToPoly(v: bigint[], p: bigint): ZPoly {
	return zTrim(v.map(x => modP(x, p)));
}

/**
 * Deterministic Berlekamp splitting (good for small/moderate p), with CZ fallback for stubborn cases.
 */
function berlekampFactorFp(fIn: ZPoly, p: bigint): ZPoly[] {
	let f = zTrim(fIn.slice());
	const n = degZPoly(f);
	if (n <= 0) {
		return [f];
	}
	if (n === 1) {
		return [f];
	}

	// Make monic
	const inv = invP(zLC(f), p);
	f = scalarMulFp(f, inv, p);

	const QmI = berlekampMatrixFp(f, p);
	const ns = nullSpaceFp(QmI, p);

	// If kernel dimension is 1 -> irreducible
	if (ns.length <= 1) {
		return [f];
	}

	const basisPolys = ns.map(v => vecToPoly(v, p));

	let factors: ZPoly[] = [f];

	// Try each basis polynomial (skip the constant one)
	for (let bIdx = 0; bIdx < basisPolys.length; bIdx++) {
		const b = basisPolys[bIdx];
		if (degZPoly(b) <= 0) {
			continue;
		}

		const newFactors: ZPoly[] = [];
		let changed = false;

		for (const fac of factors) {
			if (degZPoly(fac) <= 1) {
				newFactors.push(fac);
				continue;
			}
			let splitDone = false;
			for (let a = 0n; a < p; a++) {
				const bMinusA = b.slice();
				bMinusA[0] = modP((bMinusA[0] ?? 0n) - a, p);
				const g = gcdFp(fac, zTrim(bMinusA), p);
				if (degZPoly(g) > 0 && degZPoly(g) < degZPoly(fac)) {
					const [q] = divFp(fac, g, p);
					newFactors.push(g, q);
					changed = true;
					splitDone = true;
					break;
				}
			}
			if (!splitDone) {
				newFactors.push(fac);
			}
		}

		factors = newFactors;
		if (!changed) {
			continue;
		}
	}

	// CZ fallback (probabilistic) if still composite factors remain
	// Uses: gcd(f, h^((p^d - 1)/2) +/- 1) for target d
	const trySplitCZ = (fac: ZPoly, seed: bigint): [ZPoly, ZPoly] | null => {
		const d = degZPoly(fac);
		if (d <= 1) {
			return null;
		}

		// cheap deterministic "random" poly from seed
		const h: ZPoly = new Array(d)
			.fill(0n)
			.map((_, i) => modP(seed * 17n + BigInt(i) * 31n + seed * BigInt(i), p));
		for (let targetDeg = 1; targetDeg < d; targetDeg++) {
			const exp = (pow(p, BigInt(targetDeg)) - 1n) / 2n;
			const hPow = powPolyModFp(h, exp, fac, p);

			const g1 = gcdFp(fac, subFp(hPow, [1n], p), p);
			if (degZPoly(g1) > 0 && degZPoly(g1) < d) {
				const [q] = divFp(fac, g1, p);
				return [g1, q];
			}
			const g2 = gcdFp(fac, addFp(hPow, [1n], p), p);
			if (degZPoly(g2) > 0 && degZPoly(g2) < d) {
				const [q] = divFp(fac, g2, p);
				return [g2, q];
			}
		}
		return null;
	};

	for (let iter = 1n; iter <= 64n; iter++) {
		let changed = false;
		const newFactors: ZPoly[] = [];
		for (const fac of factors) {
			if (degZPoly(fac) <= 1) {
				newFactors.push(fac);
				continue;
			}
			const split = trySplitCZ(fac, iter);
			if (split) {
				newFactors.push(split[0], split[1]);
				changed = true;
			} else {
				newFactors.push(fac);
			}
		}
		factors = newFactors;
		if (!changed) {
			break;
		}
	}

	return factors;
}

// ============================================================================
// HENSEL LIFTING (BigInt, two-factor step + multi-factor tree)
// ============================================================================

// NOTE: All generic univariate (Z/mZ)[x] operations are centralized in poly.ts
// (zTrimMod/zAddMod/zSubMod/zMulMod/zScaleMod/zDivRemMod).

function extendedGcdMod(a: ZPoly, b: ZPoly, m: bigint): [ZPoly, ZPoly, ZPoly] {
	let old_r = zTrimMod(a, m);
	let r = zTrimMod(b, m);
	let old_s: ZPoly = [1n];
	let s: ZPoly = [0n];
	let old_t: ZPoly = [0n];
	let t: ZPoly = [1n];

	while (!zIsZero(r)) {
		const { q, r: rem } = zDivRemMod(old_r, r, m);
		old_r = r;
		r = rem;
		old_s = zSubMod(old_s, zMulMod(q, s, m), m);
		old_t = zSubMod(old_t, zMulMod(q, t, m), m);
		// shift
		[old_s, s] = [s, old_s];
		[old_t, t] = [t, old_t];
	}

	// make gcd monic
	if (!zIsZero(old_r)) {
		const inv = invP(zLC(old_r), m);
		old_r = zScaleMod(old_r, inv, m);
		old_s = zScaleMod(old_s, inv, m);
		old_t = zScaleMod(old_t, inv, m);
	}
	return [old_r, old_s, old_t];
}

/**
 * Two-factor Hensel lift step:
 * given f ≡ g*h (mod pk), and s*g + t*h ≡ 1 (mod pk),
 * lift to modulus pkNext = pk*p.
 */
function henselStep(
	f: ZPoly,
	g: ZPoly,
	h: ZPoly,
	s: ZPoly,
	t: ZPoly,
	p: bigint,
	pk: bigint
): { g: ZPoly; h: ZPoly; s: ZPoly; t: ZPoly } {
	const pkNext = pk * p;

	// e = f - g*h mod pkNext
	const gh = zMulMod(g, h, pkNext);
	const e = zSubMod(zTrimMod(f, pkNext), gh, pkNext);

	// Compute correction:
	// q,r = (s*e) / h  (mod pkNext)  so that deg(r) < deg(h)
	const se = zMulMod(s, e, pkNext);
	const { q, r } = zDivRemMod(se, h, pkNext);

	// g' = g + t*e + q*g  (mod pkNext)
	let gNew = zAddMod(g, zMulMod(t, e, pkNext), pkNext);
	gNew = zAddMod(gNew, zMulMod(q, g, pkNext), pkNext);

	// h' = h + r (mod pkNext)
	const hNew = zAddMod(h, r, pkNext);

	// Update Bezout:
	// b = s*g' + t*h'  (mod pkNext)
	const b = zAddMod(zMulMod(s, gNew, pkNext), zMulMod(t, hNew, pkNext), pkNext);
	// c = b - 1
	const c = zSubMod(b, [1n], pkNext);

	// q2,r2 = (s*c)/h'  (mod pkNext)
	const sc = zMulMod(s, c, pkNext);
	const { q: q2, r: r2 } = zDivRemMod(sc, hNew, pkNext);

	const sNew = zSubMod(s, r2, pkNext);
	let tNew = zSubMod(t, zMulMod(t, c, pkNext), pkNext);
	tNew = zSubMod(tNew, zMulMod(q2, gNew, pkNext), pkNext);

	return {
		g: zTrimMod(gNew, pkNext),
		h: zTrimMod(hNew, pkNext),
		s: zTrimMod(sNew, pkNext),
		t: zTrimMod(tNew, pkNext),
	};
}

function henselLiftMulti(f: ZPoly, factorsModP: ZPoly[], pNum: number, power: number): ZPoly[] {
	if (factorsModP.length === 0) {
		return [];
	}
	if (factorsModP.length === 1) {
		return [zPrimitivePart(f)];
	}

	const p = BigInt(pNum);

	interface Node {
		poly: ZPoly;
		s?: ZPoly;
		t?: ZPoly;
		left?: Node;
		right?: Node;
	}

	function toZPolyFromFp(fp: ZPoly): ZPoly {
		// coefficients already in [0,p-1], embed into bigint
		return zTrim(fp.map(c => BigInt(c)));
	}

	function buildTree(polys: ZPoly[], mod: bigint): Node {
		if (polys.length === 1) {
			return { poly: zTrimMod(polys[0], mod) };
		}
		const mid = Math.floor(polys.length / 2);
		const left = buildTree(polys.slice(0, mid), mod);
		const right = buildTree(polys.slice(mid), mod);

		const poly = zMulMod(left.poly, right.poly, mod);
		const [, s, t] = extendedGcdMod(left.poly, right.poly, mod);
		return { poly, s, t, left, right };
	}

	function liftTree(node: Node, target: ZPoly, pk: bigint): void {
		if (!node.left || !node.right) {
			return;
		}

		const lifted = henselStep(target, node.left.poly, node.right.poly, node.s!, node.t!, p, pk);
		node.left.poly = lifted.g;
		node.right.poly = lifted.h;
		node.s = lifted.s;
		node.t = lifted.t;

		liftTree(node.left, lifted.g, pk);
		liftTree(node.right, lifted.h, pk);
	}

	function collectLeaves(node: Node): ZPoly[] {
		if (!node.left && !node.right) {
			return [node.poly];
		}
		return [
			...(node.left ? collectLeaves(node.left) : []),
			...(node.right ? collectLeaves(node.right) : []),
		];
	}

	// Start modulus pk = p (k=1)
	let pk = p;
	const factorsZ = factorsModP.map(toZPolyFromFp);
	const tree = buildTree(factorsZ, pk);

	// Lift k=1..power-1 to pk = p^power
	for (let k = 1; k < power; k++) {
		const pkNext = pk * p;
		const target = zTrimMod(f, pkNext);
		// One global step to pkNext is achieved by calling henselStep with pk (current modulus)
		liftTree(tree, target, pk);
		pk = pkNext;
	}

	return collectLeaves(tree).map(poly => zTrimMod(poly, pk));
}

// ============================================================================
// RECOMBINATION (BigInt exact division) — FIXED seed (start at 1)
// ============================================================================

function combinations(n: number, k: number): number[][] {
	const res: number[][] = [];
	const combo: number[] = [];
	function rec(start: number) {
		if (combo.length === k) {
			res.push(combo.slice());
			return;
		}
		for (let i = start; i < n; i++) {
			combo.push(i);
			rec(i + 1);
			combo.pop();
		}
	}
	rec(0);
	return res;
}

function recombineFactorsBig(f: ZPoly, lifted: ZPoly[], modulus: bigint): ZPoly[] {
	const result: ZPoly[] = [];
	let remaining = zTrim(f.slice());
	const n = lifted.length;
	const used = new Set<number>();

	// Try increasing subset sizes
	for (let size = 1; size < n; size++) {
		const combos = combinations(n, size);
		for (const combo of combos) {
			if (combo.some(i => used.has(i))) {
				continue;
			}

			// FIX: start at 1n, not lc
			let prod: ZPoly = [1n];
			for (const idx of combo) {
				prod = zMulMod(prod, lifted[idx], modulus);
			}

			const candidateSym = zToSymmetricMod(prod, modulus);
			const { primitive: cand } = zNormalizePrimitiveSign(candidateSym);

			if (degZPoly(cand) <= 0) {
				continue;
			}

			const q = zTryDivExact(remaining, cand);
			if (q) {
				result.push(cand);
				remaining = q;
				for (const idx of combo) {
					used.add(idx);
				}
				if (degZPoly(remaining) <= 0) {
					// consumed everything
					return result;
				}
			}
		}
	}

	if (degZPoly(remaining) > 0) {
		result.push(zPrimitivePart(remaining));
	}
	return result;
}

// ============================================================================
// PRIME SELECTION + BOUNDS (BigInt exact)
// ============================================================================

function toFpPolyFromZ(f: ZPoly, p: bigint): ZPoly {
	return zTrim(f.map(c => modP(c, p)));
}

function countFactorsModP_Berlekamp(f: ZPoly, pNum: number): number {
	const p = BigInt(pNum);
	const fMod = toFpPolyFromZ(f, p);
	const lc = zLC(fMod);
	const fMonic = lc === 1n ? fMod : scalarMulFp(fMod, invP(lc, p), p);
	const QmI = berlekampMatrixFp(fMonic, p);
	const ns = nullSpaceFp(QmI, p);
	return ns.length; // kernel dimension
}

function coefficientBoundMignotte(f: ZPoly): bigint {
	// bound = 2^n * ||f||_2, where ||f||_2 = sqrt(sum c^2)
	const n = degZPoly(f);
	let sum = 0n;
	for (const c of f) {
		sum += c * c;
	}
	const norm = bigIntSqrt(sum) + (bigIntSqrt(sum) * bigIntSqrt(sum) === sum ? 0n : 1n); // ceil sqrt
	const twoPow = 1n << BigInt(Math.max(0, n));
	return twoPow * norm;
}

function primeBudgetForUniZ(f: ZPoly): number {
	// Adaptive budget: grows (slowly) with degree and coefficient bit-size.
	// Goal: terminate deterministically, but avoid giving up too early on hard inputs.
	const n = Math.max(0, degZPoly(f));
	let maxAbs = 0n;
	for (const c of f) {
		const a = c < 0n ? -c : c;
		if (a > maxAbs) {
			maxAbs = a;
		}
	}
	const bits = bigintBitLength(maxAbs);
	// Baseline 32, add ~1 prime per 4 degrees, add ~1 prime per 64 bits of coeff size.
	let budget = 32 + Math.ceil(n / 4) + Math.ceil(bits / 64);
	// Clamp to a reasonable range.
	if (budget < 32) {
		budget = 32;
	}
	if (budget > 256) {
		budget = 256;
	}
	return budget;
}

function findGoodPrimeBig(
	f: ZPoly,
	minPrime = 3,
	maxPrimes: number | undefined = undefined
): { p: number; numFactors: number } {
	const lc = abs(zLC(f));
	const df = zDerivative(f);
	const budget = (maxPrimes ?? primeBudgetForUniZ(f)) | 0;
	if (!Number.isFinite(budget) || budget <= 0) {
		throw new PrimeSelectionError('findGoodPrimeBig: invalid maxPrimes', { budget });
	}

	let bestP = 0;
	let bestCount = Number.POSITIVE_INFINITY;

	let tried = 0;
	let pNum = nextPrime32(Math.max(2, minPrime));
	while (tried < budget) {
		tried++;
		const pBig = BigInt(pNum);

		// Reject primes dividing the leading coefficient (degree drop)
		if (lc % pBig === 0n) {
			pNum = nextPrime32(pNum + 1);
			continue;
		}

		// square-free test: gcd(f mod p, f' mod p) == 1
		const p = pBig;
		const fMod = toFpPolyFromZ(f, p);
		const dfMod = toFpPolyFromZ(df, p);
		const g = gcdFp(fMod, dfMod, p);
		if (degZPoly(g) !== 0) {
			pNum = nextPrime32(pNum + 1);
			continue;
		}

		const cnt = countFactorsModP_Berlekamp(f, pNum);
		if (cnt < bestCount) {
			bestCount = cnt;
			bestP = pNum;
			if (cnt <= 2) {
				break;
			}
		}

		pNum = nextPrime32(pNum + 1);
	}

	if (bestP === 0) {
		throw new PrimeSelectionError(
			`Could not find suitable prime after trying ${tried} primes (budget=${budget})`,
			{
				tried,
				budget,
				minPrime,
			}
		);
	}
	return { p: bestP, numFactors: bestCount };
}

// ============================================================================
// SQUARE-FREE FACTORIZATION (BigInt)
// ============================================================================

/**
 * Square-free factorization over **ℤ** (BigInt).
 *
 * Returns a list of pairs `[g_i, m_i]` such that:
 *   f = ∏ g_i^{m_i}
 * and each g_i is square-free and pairwise coprime.
 *
 * Implementation follows the standard gcd-with-derivative approach:
 * - Let d = f' and g = gcd(f, d)
 * - Repeatedly split out square-free parts by dividing by g and updating g with gcd steps.
 *
 * @param f Primitive, trimmed polynomial.
 * @returns Array of `[factor, multiplicity]` pairs.
 */
function squareFreeFactorizationBig(f: ZPoly): Array<[ZPoly, number]> {
	f = zTrim(f);
	if (degZPoly(f) <= 0) {
		return [];
	}

	// make primitive
	f = zPrimitivePart(f);

	const df = zDerivative(f);
	if (zIsZero(df)) {
		return [[f, 1]];
	}

	let g = zGcdPrimitivePRS(f, df);
	if (degZPoly(g) === 0) {
		return [[f, 1]];
	}

	const sq = zTryDivExact(f, g);
	if (!sq) {
		return [[f, 1]];
	}

	let w = sq;
	let i = 1;
	const out: Array<[ZPoly, number]> = [];

	while (degZPoly(w) > 0) {
		const nextG = zGcdPrimitivePRS(g, w);
		const factor = zTryDivExact(w, nextG);
		if (factor && degZPoly(factor) > 0) {
			out.push([zPrimitivePart(factor), i]);
		}

		w = nextG;
		const gDiv = zTryDivExact(g, nextG);
		if (!gDiv) {
			break;
		}
		g = gDiv;
		i++;
	}

	return out;
}

// ============================================================================
// MAIN SQUARE-FREE FACTORING OVER bigint (Zassenhaus outline)
// ============================================================================

function tryFactorQuarticEvenZ(f: ZPoly): ZPoly[] | null {
	f = zTrim(f);
	if (degZPoly(f) !== 4) {
		return null;
	}
	const a0 = f[0] ?? 0n;
	const a1 = f[1] ?? 0n;
	const a2 = f[2] ?? 0n;
	const a3 = f[3] ?? 0n;
	const a4 = f[4] ?? 0n;
	if (a4 === 0n) {
		return null;
	}

	// Only handle monic quartics for now (covers current failures).
	if (a4 !== 1n) {
		return null;
	}

	// If odd terms present, not an even quartic.
	if (a1 !== 0n || a3 !== 0n) {
		return null;
	}

	// 1) Even-quartic split: x^4 + a2*x^2 + a0 = (x^2 + u*x + v)(x^2 - u*x + v)
	// Requires v^2 = a0 and u^2 = 2*v - a2.
	const v = sqrtExactBigint(a0);
	if (v !== null) {
		const u2 = 2n * v - a2;
		const u = sqrtExactBigint(u2);
		if (u !== null) {
			const f1: ZPoly = [v, u, 1n]; // x^2 + u*x + v
			const f2: ZPoly = [v, -u, 1n]; // x^2 - u*x + v
			return [zPrimitivePart(f1), zPrimitivePart(f2)];
		}
	}

	// 2) Biquadratic: treat as quadratic in t=x^2: t^2 + a2*t + a0.
	// Roots are r1,r2 = (-a2 ± sqrt(a2^2 - 4*a0)) / 2; need integer roots.
	const disc = a2 * a2 - 4n * a0;
	const s = sqrtExactBigint(disc);
	if (s !== null) {
		const n1 = -a2 + s;
		const n2 = -a2 - s;
		if (n1 % 2n === 0n && n2 % 2n === 0n) {
			const r1 = n1 / 2n;
			const r2 = n2 / 2n;
			// t^2 + a2*t + a0 = (t - r1)(t - r2) => (x^2 - r1)(x^2 - r2)
			const g1: ZPoly = [-r1, 0n, 1n];
			const g2: ZPoly = [-r2, 0n, 1n];
			return [zPrimitivePart(g1), zPrimitivePart(g2)];
		}
	}

	return null;
}

/**
 * Stride substitution: if all nonzero exponents in f share a common divisor s >= 2,
 * write f(x) = g(x^s) where g has degree n/s. Factor g over Z, then for each factor
 * h(t) of g, expand h(x^s) and recursively factor it (it may split further).
 *
 * Examples:
 *   x^6+4x^4+16x^2+64, s=2 → g(t)=t^3+4t^2+16t+64=(t+4)(t^2+16) → (x^2+4)(x^4+16)
 *   x^8+x^4+1, s=4 → g(t)=t^2+t+1 (irreducible) → returns null, but then
 *     tryFactorQuarticEvenZ or Berlekamp handles x^8+x^4+1 directly.
 */
function tryFactorStrideSubstitutionZ(f: ZPoly): ZPoly[] | null {
	f = zTrim(f);
	const n = degZPoly(f);
	if (n < 4) {
		return null;
	}

	// Find stride = gcd of all nonzero exponent indices
	let stride = 0;
	for (let i = 1; i < f.length; i++) {
		if ((f[i] ?? 0n) !== 0n) {
			stride = stride === 0 ? i : Number(gcd(BigInt(stride), BigInt(i)));
		}
	}

	if (stride < 2) {
		return null;
	}

	// Build g(t) where f(x) = g(x^stride)
	const gLen = Math.floor(n / stride) + 1;
	const g: ZPoly = new Array(gLen).fill(0n);
	for (let i = 0; i < f.length; i++) {
		const c = f[i] ?? 0n;
		if (c !== 0n) {
			if (i % stride !== 0) {
				return null; // Safety check
			}
			g[i / stride] = c;
		}
	}

	// Factor g(t). Try factorPolynomialBig first; if it fails to split,
	// fall back to rational root search (catches cases where Hensel lifting
	// fails due to bad prime/factor grouping on small polynomials).
	let gResult = factorPolynomialBig(zTrim(g));
	if (!gResult.factors || gResult.factors.length <= 1) {
		// Rational root fallback: try divisors of the constant term / leading coeff
		const gTrimmed = zTrim(g);
		const gDeg = degZPoly(gTrimmed);
		if (gDeg >= 2 && gDeg <= 6) {
			const constTerm = gTrimmed[0] ?? 0n;
			const leadCoeff = gTrimmed[gDeg] ?? 1n;
			if (constTerm !== 0n) {
				const constDivs = getDivisors(constTerm < 0n ? -constTerm : constTerm);
				const leadDivs = getDivisors(leadCoeff < 0n ? -leadCoeff : leadCoeff);
				for (const p_val of constDivs) {
					for (const q_val of leadDivs) {
						for (const sign of [1n, -1n]) {
							const numer = sign * p_val;
							// Evaluate q^deg * g(numer/q) to avoid fractions
							let evalResult = 0n;
							for (let i = 0; i <= gDeg; i++) {
								const coeff = gTrimmed[i] ?? 0n;
								let numerPow = 1n;
								for (let j = 0; j < i; j++) {
									numerPow *= numer;
								}
								let qPow = 1n;
								for (let j = 0; j < gDeg - i; j++) {
									qPow *= q_val;
								}
								evalResult += coeff * numerPow * qPow;
							}
							if (evalResult === 0n) {
								// Found root numer/q_val. Factor is (q_val*t - numer).
								const linFactor: ZPoly = [-numer, q_val];
								const quotient = zTryDivExact(gTrimmed, linFactor);
								if (quotient) {
									// Rebuild factorization result
									const quotResult = factorPolynomialBig(quotient);
									const newFactors: FactorizationResultZ['factors'] = [
										{ coefficients: zTrim(linFactor), multiplicity: 1 },
									];
									for (const f of quotResult.factors) {
										newFactors.push(f);
									}
									gResult = {
										content: quotResult.content,
										factors: newFactors,
									};
									break;
								}
							}
						}
						if (gResult.factors.length > 1) {
							break;
						}
					}
					if (gResult.factors.length > 1) {
						break;
					}
				}
			}
		}
	}

	if (!gResult.factors || gResult.factors.length <= 1) {
		return null; // g is irreducible, substitution didn't help
	}

	// Expand each factor h(t) → h(x^stride) and recursively factor
	const out: ZPoly[] = [];

	for (const factor of gResult.factors) {
		const hCoeffs = factor.coefficients;
		const mult = factor.multiplicity ?? 1;

		// Build h(x^stride)
		const expanded: ZPoly = new Array((hCoeffs.length - 1) * stride + 1).fill(0n);
		for (let i = 0; i < hCoeffs.length; i++) {
			expanded[i * stride] = hCoeffs[i];
		}

		// Recursively factor (h(x^stride) may split further, e.g. x^4+16 might factor)
		const subFactors = factorSquareFreeBig(zTrim(expanded));
		for (let k = 0; k < mult; k++) {
			out.push(...subFactors);
		}
	}

	// Handle content
	if (gResult.content !== 1n && gResult.content !== -1n) {
		out.unshift([gResult.content]);
	} else if (gResult.content === -1n && out.length > 0) {
		out[0] = out[0].map(c => -c);
	}

	return out.length > 1 ? out : null;
}

function factorSquareFreeBig(f: ZPoly): ZPoly[] {
	f = zTrim(f);
	if (degZPoly(f) <= 1) {
		return [zPrimitivePart(f)];
	}

	// Cheap special cases that Berlekamp/Hensel sometimes misses due to recombination heuristics.
	const quartic = tryFactorQuarticEvenZ(f);
	if (quartic) {
		return quartic;
	}

	// Stride substitution: if all nonzero terms have exponents divisible by some
	// stride s >= 2 (e.g. only even-degree terms when s=2), substitute t = x^s,
	// factor the lower-degree polynomial g(t), then expand each factor h(t) back
	// to h(x^s) and recursively factor (since h(x^s) may split further over Z[x]).
	// Example: x^6+4x^4+16x^2+64 with s=2 gives t^3+4t^2+16t+64 = (t+4)(t^2+16),
	//   yielding (x^2+4)(x^4+16).
	const strideSub = tryFactorStrideSubstitutionZ(f);
	if (strideSub) {
		return strideSub;
	}

	// bound (BigInt exact)
	const bound = coefficientBoundMignotte(f);
	const lcAbs = abs(zLC(f));

	// pick prime: do NOT conclude irreducible from a single prime.
	// A reducible polynomial over ℤ can be irreducible modulo some primes, so
	// keep trying until Berlekamp actually splits (within a deterministic budget).
	let pNum: number | undefined;
	let p: bigint | undefined;

	const df = zDerivative(f);
	const budget = primeBudgetForUniZ(f);

	// Start from a "good" prime if possible, but keep searching until we get a split.
	let startPrime = 3;
	try {
		startPrime = findGoodPrimeBig(f).p;
	} catch {
		startPrime = 3;
	}

	let tried = 0;
	let cand = nextPrime32(Math.max(2, startPrime));
	let factorsModP_monic: ZPoly[] | undefined;

	while (tried < budget) {
		tried++;
		const pBig = BigInt(cand);

		// Reject primes dividing the leading coefficient (degree drop)
		if (modP(zLC(f), pBig) === 0n) {
			cand = nextPrime32(cand + 1);
			continue;
		}

		// square-free test: gcd(f mod p, f' mod p) == 1
		const fModTry = toFpPolyFromZ(f, pBig);
		const dfModTry = toFpPolyFromZ(df, pBig);
		const g = gcdFp(fModTry, dfModTry, pBig);
		if (degZPoly(g) !== 0) {
			cand = nextPrime32(cand + 1);
			continue;
		}

		// Factor mod p (Berlekamp)
		const facs = berlekampFactorFp(fModTry, pBig);
		if (facs.length > 1) {
			pNum = cand;
			p = pBig;
			factorsModP_monic = facs;
			break;
		}

		cand = nextPrime32(cand + 1);
	}

	if (!pNum || !p || !factorsModP_monic) {
		return [zPrimitivePart(f)];
	}

	// lifting height: find k with p^k > 2*lc*bound
	const target = 2n * lcAbs * bound;
	let k = 1;
	let modulus = p;
	while (modulus <= target) {
		modulus *= p;
		k++;
	}
	// Berlekamp factors a monic polynomial; we need product == f (mod p).
	// Restore leading coefficient by scaling one factor by lc(f) mod p.
	const lcModP = modP(zLC(f), p);
	const factorsModP = factorsModP_monic.map(g => g.slice());
	if (lcModP !== 1n) {
		factorsModP[0] = scalarMulFp(factorsModP[0], lcModP, p);
	}

	// Hensel lift to p^k
	const lifted = henselLiftMulti(zTrim(f), factorsModP, pNum, k);

	// Recombine (BigInt exact)
	const recombined = recombineFactorsBig(f, lifted, modulus);

	// If recombination returns same polynomial, treat as irreducible
	if (recombined.length === 1) {
		const a = zPrimitivePart(f);
		const b = zPrimitivePart(recombined[0]);
		if (polyEqualsZ(a, b)) {
			return [a];
		}
	}

	// Recursively factor any composite returned factors
	const out: ZPoly[] = [];
	for (const cand of recombined) {
		if (degZPoly(cand) <= 1) {
			out.push(zPrimitivePart(cand));
		} else {
			const candNorm = zPrimitivePart(cand);
			if (polyEqualsZ(candNorm, zPrimitivePart(f))) {
				out.push(candNorm);
			} else {
				out.push(...factorSquareFreeBig(candNorm));
			}
		}
	}
	return out;
}

function polyEqualsZ(a: ZPoly, b: ZPoly): boolean {
	a = zTrim(a);
	b = zTrim(b);
	if (a.length !== b.length) {
		return false;
	}
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) {
			return false;
		}
	}
	return true;
}

// ============================================================================
// PUBLIC API (BigInt)
// ============================================================================

/**
 * Factor a univariate integer polynomial over Z.
 *
 * @param input Polynomial given as either:
 *  - a string (parsed using the library parser), or
 *  - a coefficient array `ZPoly` (lowest degree first).
 * @param variable Variable name to treat as the univariate indeterminate.
 *
 * @returns A normalized factorization:
 *  - `content`: the integer content extracted from the polynomial
 *  - `factors`: primitive, normalized factors with multiplicities
 *
 * @remarks
 * This is the preferred API if you need exact arithmetic (no `number` rounding).
 */

/**
 * Factor a univariate polynomial over **ℤ** using exact BigInt arithmetic.
 *
 * Pipeline (high level):
 * 1) Parse + trim
 * 2) Split into `content` and `primitive` part
 * 3) Square-free factorization
 * 4) Factor each square-free component (modular splitting + lifting)
 * 5) Recombine multiplicities and return a normalized factor list
 *
 * Notes:
 * - Factors are returned **primitive** and **normalized** (unit/sign absorbed into `content`).
 * - For multivariate inputs, use the multivariate entry points in this module.
 *
 * @param input Polynomial string (parser format) or coefficient array.
 * @param variable The variable name to use when parsing from string.
 * @returns `{ content, factors }` where `content` is the integer unit/content and `factors` are primitive factors.
 *
 * @throws {Error} If parsing fails or the polynomial is malformed.
 */
export function factorPolynomialBig(input: ZPoly): FactorizationResultZ {
	let f: ZPoly = zTrim(input);

	if (zIsZero(f)) {
		return { content: 0n, factors: [] };
	}
	if (degZPoly(f) === 0) {
		return { content: f[0] ?? 0n, factors: [] };
	}

	const { content, primitive } = zNormalizePrimitiveSign(f);
	f = primitive;

	const sqf = squareFreeFactorizationBig(f);
	const sqfParts = sqf.length === 0 ? ([[f, 1]] as Array<[ZPoly, number]>) : sqf;

	const result: FactorizationResultZ = { content, factors: [] };

	for (const [part, mult] of sqfParts) {
		const irr = factorSquareFreeBig(part);
		for (const fac of irr) {
			result.factors.push({
				coefficients: zPrimitivePart(fac),
				multiplicity: mult,
			});
		}
	}

	return result;
}

// ============================================================================
// COMPATIBILITY WRAPPERS (number[] / number output)
// ============================================================================

function assertSafeIntArray(arr: number[], who: string): void {
	if (arr.length === 0) {
		throw new Error(`${who}: empty coefficient array`);
	}
	for (let i = 0; i < arr.length; i++) {
		const c = arr[i];
		if (!Number.isFinite(c) || !Number.isInteger(c) || !Number.isSafeInteger(c)) {
			throw new Error(`${who}: coefficient at index ${i} is not a safe integer: ${c}`);
		}
	}
}

function toBigFromNumberPoly(f: number[]): ZPoly {
	return zTrim(f.map(x => BigInt(x)));
}

function toNumberFromBigPoly(f: ZPoly): number[] {
	// only safe if all coefficients fit safe integer
	const out: number[] = [];
	for (const c of f) {
		if (c > BigInt(Number.MAX_SAFE_INTEGER) || c < BigInt(Number.MIN_SAFE_INTEGER)) {
			throw new Error(`toNumberFromBigPoly: coefficient out of safe range: ${c.toString()}`);
		}
		out.push(Number(c));
	}
	// trim zeros
	while (out.length > 1 && out[out.length - 1] === 0) {
		out.pop();
	}
	return out;
}

/**
 * Factor a univariate integer polynomial over Z with safe JS-number coefficients.
 *
 * @param input Polynomial given as either:
 *  - a string, or
 *  - a `number[]` coefficient array (lowest degree first).
 * @param variable Variable name to treat as the univariate indeterminate.
 *
 * @returns A normalized factorization (same shape as `factorPolynomialBig`, but using `number[]` input).
 *
 * @throws If coefficients are not safe integers.
 */
export function factorPolynomial(input: number[]): FactorizationResult {
	if (Array.isArray(input)) {
		assertSafeIntArray(input, 'factorPolynomial');
	}

	const big = toBigFromNumberPoly(input);
	const r = factorPolynomialBig(big);

	const content = (() => {
		if (
			r.content > BigInt(Number.MAX_SAFE_INTEGER) ||
			r.content < BigInt(Number.MIN_SAFE_INTEGER)
		) {
			throw new Error(`factorPolynomial: content out of safe range: ${r.content.toString()}`);
		}
		return Number(r.content);
	})();

	const factors: UniFactor[] = r.factors.map(f => ({
		coefficients: toNumberFromBigPoly(f.coefficients),
		multiplicity: f.multiplicity,
	}));

	return { content, factors };
}
