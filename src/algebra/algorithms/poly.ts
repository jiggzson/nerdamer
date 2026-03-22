/**
 * @module poly
 *
 * Core polynomial representation and operations.
 *
 * This file contains both univariate and multivariate utilities used by:
 * - multivariate GCD (Zippel-style)
 * - multivariate factorization (evaluation + Hensel lifting)
 * - Gröbner basis computations
 *
 * Notes:
 * - Univariate polynomials over Z are represented as coefficient arrays `ZPoly`.
 * - Multivariate polynomials are represented by `MultiPoly` (see near bottom of file).
 */

import { gcd, modInv, modNorm, contentBigint, modSymmetric } from './arith';
import { MultiPoly, keyToExp, expToKey, type Exponents } from './multiPoly/MultiPoly';
/**
 * Univariate polynomial utilities over Z[x] (bigint coefficients)
 * and over F_p[x] (explicit modulus carried in the polynomial object).
 *
 * Canonical exports:
 *  - Z[x]: z*
 *  - F_p[x]: fp*
 */

export type ZPoly = bigint[]; // index i is coeff of x^i
export type Vars = readonly string[];
export type InternalPoly = { vars: Vars; terms: Map<string, bigint> };

// ============================================================================
// Z[x] helpers
// ============================================================================

/** Returns a trimmed copy (does not mutate input). */
export function zTrim(a: ZPoly): ZPoly {
	let n = a.length;
	while (n > 1 && a[n - 1] === 0n) {
		n--;
	}
	return n === a.length ? a : a.slice(0, n);
}

/** In-place trim (mutates) and returns the same array. */
function zTrimInPlace(a: ZPoly): ZPoly {
	while (a.length > 1 && a[a.length - 1] === 0n) {
		a.pop();
	}
	return a;
}

/** True iff polynomial is identically 0. */
export function zIsZero(a: ZPoly): boolean {
	for (let i = a.length - 1; i >= 0; i--) {
		if ((a[i] ?? 0n) !== 0n) {
			return false;
		}
	}
	return true;
}

function zDeg(a: ZPoly): number {
	for (let i = a.length - 1; i >= 0; i--) {
		if ((a[i] ?? 0n) !== 0n) {
			return i;
		}
	}
	return 0;
}

export function zLC(a: ZPoly): bigint {
	for (let i = a.length - 1; i >= 0; i--) {
		const c = a[i] ?? 0n;
		if (c !== 0n) {
			return c;
		}
	}
	return 0n;
}

export function zSub(a: ZPoly, b: ZPoly): ZPoly {
	const n = Math.max(a.length, b.length);
	const out: ZPoly = new Array<bigint>(n).fill(0n);
	for (let i = 0; i < n; i++) {
		out[i] = (a[i] ?? 0n) - (b[i] ?? 0n);
	}
	return zTrimInPlace(out);
}

// ---------------------------------------------------------------------------
// Exact division in Z[x]
// ---------------------------------------------------------------------------

/** Polynomial long division in Z[x]. Returns quotient and remainder. */
function zDivRem(a: ZPoly, b: ZPoly): { q: ZPoly; r: ZPoly } {
	a = zTrim(a.slice());
	b = zTrim(b.slice());
	if (zIsZero(b)) {
		throw new Error('zDivRem: division by zero polynomial');
	}
	const da = zDeg(a);
	const db = zDeg(b);
	if (da < db) {
		return { q: [0n], r: a };
	}

	const lcb = zLC(b);
	const q: ZPoly = new Array<bigint>(da - db + 1).fill(0n);
	const r: ZPoly = a.slice();

	for (let k = da; k >= db; k--) {
		const idx = k - db;
		const cr = r[k] ?? 0n;
		if (cr === 0n) {
			continue;
		}
		// exact coefficient division is required for an exact division result.
		if (cr % lcb !== 0n) {
			continue;
		}
		const coeff = cr / lcb;
		q[idx] += coeff;
		for (let j = 0; j <= db; j++) {
			r[idx + j] = (r[idx + j] ?? 0n) - coeff * (b[j] ?? 0n);
		}
	}

	return { q: zTrimInPlace(q), r: zTrimInPlace(r) };
}

/** Returns q iff a = b*q exactly; otherwise null. */
export function zTryDivExact(a: ZPoly, b: ZPoly): ZPoly | null {
	const { q, r } = zDivRem(a, b);
	return zIsZero(r) ? q : null;
}

/** Returns q such that a = b*q. Throws if division is not exact. */
export function zDivExact(a: ZPoly, b: ZPoly): ZPoly {
	const q = zTryDivExact(a, b);
	if (q === null) {
		throw new Error('zDivExact: non-exact division');
	}
	return q;
}

export function zScale(a: ZPoly, k: bigint): ZPoly {
	if (k === 0n) {
		return [0n];
	}
	if (k === 1n) {
		return zTrim(a);
	}
	const out: ZPoly = a.map(c => (c ?? 0n) * k);
	return zTrimInPlace(out);
}

// ---------------------------------------------------------------------------
// Canonical normalization layer (public)
// ---------------------------------------------------------------------------

/**
 * Normalize polynomial by extracting nonnegative content and fixing the sign
 * so the leading coefficient is positive.
 *
 * - For 0 returns { content: 0, primitive: 0 }
 * - For nonzero returns { content: c, primitive: p } where:
 *    - c = gcd(|coeffs|) >= 1
 *    - p has gcd(|coeffs|)=1
 *    - LC(p) > 0
 */
export function zNormalizePrimitiveSign(a: ZPoly): { content: bigint; primitive: ZPoly } {
	const t = zTrimInPlace(a.slice());
	if (t.length === 1 && t[0] === 0n) {
		return { content: 0n, primitive: [0n] };
	}

	let c = contentBigint(t);
	if (c === 0n) {
		c = 1n;
	}

	const prim: ZPoly = t.map(x => (x ?? 0n) / c);
	// Normalize sign: positive leading coefficient
	const lc = prim[prim.length - 1] ?? 0n;
	if (lc < 0n) {
		for (let i = 0; i < prim.length; i++) {
			prim[i] = -prim[i];
		}
	}
	return { content: c, primitive: zTrimInPlace(prim) };
}

/** Normalize only by sign (units in Z are ±1). Does not strip content. */
export function zNormalizeSign(aIn: ZPoly): ZPoly {
	let a = zTrim(aIn.slice());
	if (a.length === 0) {
		return [0n];
	}
	if (a.length === 1) {
		return a[0] === 0n ? [0n] : [a[0] < 0n ? -a[0] : a[0]];
	}
	if ((a[a.length - 1] ?? 0n) < 0n) {
		a = a.map(c => -c);
	}
	return a;
}

/** Primitive part with positive leading coefficient. */
export function zPrimitivePart(a: ZPoly): ZPoly {
	return zNormalizePrimitiveSign(a).primitive;
}

/** Pseudo-remainder of `a` by `b` over Z[x]. */
export function zPseudoRemainder(aIn: ZPoly, bIn: ZPoly): ZPoly {
	const a = zTrim(aIn.slice());
	const b = zTrim(bIn.slice());
	if (zIsZero(b)) {
		throw new Error('zPseudoRemainder: divide by zero');
	}
	const db = b.length - 1;
	const lcB = b[db];
	let r = a;
	while (!zIsZero(r) && r.length - 1 >= db) {
		const dr = r.length - 1;
		const k = dr - db;
		const lcR = r[dr];
		const scaled: ZPoly = r.map(c => c * lcB);
		for (let i = 0; i <= db; i++) {
			scaled[i + k] -= lcR * (b[i] ?? 0n);
		}
		r = zTrimInPlace(scaled);
		const cont = contentBigint(r);
		if (cont > 1n) {
			for (let i = 0; i < r.length; i++) {
				r[i] /= cont;
			}
			zTrimInPlace(r);
		}
	}
	return r;
}

/** Primitive PRS GCD over Z[x] with positive leading coefficient. */
export function zGcdPrimitivePRS(fIn: ZPoly, gIn: ZPoly): ZPoly {
	let a = zPrimitivePart(fIn);
	let b = zPrimitivePart(gIn);
	if (zIsZero(a) && zIsZero(b)) {
		return [0n];
	}
	if (zIsZero(a)) {
		return zPrimitivePart(b);
	}
	if (zIsZero(b)) {
		return zPrimitivePart(a);
	}
	while (!zIsZero(b)) {
		const r = zPseudoRemainder(a, b);
		a = b;
		b = zPrimitivePart(r);
	}
	return zPrimitivePart(a);
}

/** Full GCD over Z[x], including gcd(content(f), content(g)). */
export function zGcdFull(fIn: ZPoly, gIn: ZPoly): ZPoly {
	if (zIsZero(fIn)) {
		return zNormalizeSign(gIn);
	}
	if (zIsZero(gIn)) {
		return zNormalizeSign(fIn);
	}
	const cf = zNormalizePrimitiveSign(fIn).content;
	const cg = zNormalizePrimitiveSign(gIn).content;
	const c = gcd(cf, cg);
	const f = cf === 0n || cf === 1n ? zTrim(fIn.slice()) : zDivExact(fIn, [cf]);
	const g = cg === 0n || cg === 1n ? zTrim(gIn.slice()) : zDivExact(gIn, [cg]);
	const dpp = zGcdPrimitivePRS(f, g);
	if (c === 0n || c === 1n) {
		return zNormalizeSign(dpp);
	}
	return zNormalizeSign(dpp.map(a => a * c));
}

export function zDerivative(a: ZPoly): ZPoly {
	const t = zTrimInPlace(a.slice());
	if (t.length <= 1) {
		return [0n];
	}
	const out: ZPoly = new Array<bigint>(t.length - 1).fill(0n);
	for (let i = 1; i < t.length; i++) {
		out[i - 1] = (t[i] ?? 0n) * BigInt(i);
	}
	return zTrimInPlace(out);
}

/** Multiply by x^k. */
export function zShift(a: ZPoly, k: number): ZPoly {
	if (k <= 0) {
		return zTrim(a);
	}
	const t = zTrimInPlace(a.slice());
	if (t.length === 1 && t[0] === 0n) {
		return [0n];
	}
	const out: ZPoly = new Array<bigint>(t.length + k).fill(0n);
	for (let i = 0; i < t.length; i++) {
		out[i + k] = t[i] ?? 0n;
	}
	return out;
}

// ============================================================================
// F_p[x] helpers (explicit modulus)
// ============================================================================

export type FpPoly = { p: bigint; coeffs: ZPoly };

function fpTrim(f: FpPoly): FpPoly {
	const a = f.coeffs.slice();
	const p = f.p;
	for (let i = 0; i < a.length; i++) {
		a[i] = modNorm(a[i] ?? 0n, p);
	}
	zTrimInPlace(a);
	return { p, coeffs: a };
}

function fpIsZero(f: FpPoly): boolean {
	const t = fpTrim(f);
	return t.coeffs.length === 1 && t.coeffs[0] === 0n;
}

function fpLC(f: FpPoly): bigint {
	const t = fpTrim(f).coeffs;
	return t[t.length - 1] ?? 0n;
}

export function fpAdd(a: FpPoly, b: FpPoly): FpPoly {
	if (a.p !== b.p) {
		throw new Error('fpAdd: modulus mismatch');
	}
	const p = a.p;
	const n = Math.max(a.coeffs.length, b.coeffs.length);
	const out: ZPoly = new Array<bigint>(n).fill(0n);
	for (let i = 0; i < n; i++) {
		out[i] = modNorm((a.coeffs[i] ?? 0n) + (b.coeffs[i] ?? 0n), p);
	}
	return { p, coeffs: zTrimInPlace(out) };
}

export function fpSub(a: FpPoly, b: FpPoly): FpPoly {
	if (a.p !== b.p) {
		throw new Error('fpSub: modulus mismatch');
	}
	const p = a.p;
	const n = Math.max(a.coeffs.length, b.coeffs.length);
	const out: ZPoly = new Array<bigint>(n).fill(0n);
	for (let i = 0; i < n; i++) {
		out[i] = modNorm((a.coeffs[i] ?? 0n) - (b.coeffs[i] ?? 0n), p);
	}
	return { p, coeffs: zTrimInPlace(out) };
}

export function fpScale(a: FpPoly, k: bigint): FpPoly {
	const p = a.p;
	const kk = modNorm(k, p);
	if (kk === 0n) {
		return { p, coeffs: [0n] };
	}
	if (kk === 1n) {
		return fpTrim(a);
	}
	const out = a.coeffs.map(c => modNorm((c ?? 0n) * kk, p));
	return { p, coeffs: zTrimInPlace(out) };
}

export function fpMul(a: FpPoly, b: FpPoly): FpPoly {
	if (a.p !== b.p) {
		throw new Error('fpMul: modulus mismatch');
	}
	const p = a.p;
	const aa = fpTrim(a).coeffs;
	const bb = fpTrim(b).coeffs;
	if (aa.length === 1 && aa[0] === 0n) {
		return { p, coeffs: [0n] };
	}
	if (bb.length === 1 && bb[0] === 0n) {
		return { p, coeffs: [0n] };
	}

	const out: ZPoly = new Array<bigint>(aa.length + bb.length - 1).fill(0n);
	for (let i = 0; i < aa.length; i++) {
		const ai = aa[i] ?? 0n;
		if (ai === 0n) {
			continue;
		}
		for (let j = 0; j < bb.length; j++) {
			const bj = bb[j] ?? 0n;
			if (bj === 0n) {
				continue;
			}
			out[i + j] = modNorm((out[i + j] ?? 0n) + ai * bj, p);
		}
	}
	return { p, coeffs: zTrimInPlace(out) };
}

function fpMonic(f: FpPoly): FpPoly {
	const t = fpTrim(f);
	if (fpIsZero(t)) {
		return t;
	}
	const lc = fpLC(t);
	const inv = modInv(lc, t.p);
	return fpScale(t, inv);
}

export function fpDivRem(a: FpPoly, b: FpPoly): { q: FpPoly; r: FpPoly } {
	if (a.p !== b.p) {
		throw new Error('fpDivRem: modulus mismatch');
	}
	const p = a.p;
	const A = fpTrim(a).coeffs.slice();
	const B = fpTrim(b).coeffs.slice();
	zTrimInPlace(A);
	zTrimInPlace(B);

	if (B.length === 1 && B[0] === 0n) {
		throw new Error('fpDivRem: division by zero polynomial');
	}
	if (A.length === 1 && A[0] === 0n) {
		return { q: { p, coeffs: [0n] }, r: { p, coeffs: [0n] } };
	}

	const da = A.length - 1;
	const db = B.length - 1;
	if (da < db) {
		return { q: { p, coeffs: [0n] }, r: { p, coeffs: A } };
	}

	const q: ZPoly = new Array<bigint>(da - db + 1).fill(0n);
	const invLc = modInv(B[db] ?? 0n, p);

	for (let k = da - db; k >= 0; k--) {
		const coeff = modNorm((A[db + k] ?? 0n) * invLc, p);
		q[k] = coeff;
		if (coeff !== 0n) {
			for (let j = 0; j <= db; j++) {
				A[j + k] = modNorm((A[j + k] ?? 0n) - coeff * (B[j] ?? 0n), p);
			}
		}
	}

	const r = A.slice(0, db);
	zTrimInPlace(q);
	zTrimInPlace(r);
	return { q: { p, coeffs: q }, r: { p, coeffs: r.length ? r : [0n] } };
}

export function fpGCD(a: FpPoly, b: FpPoly): FpPoly {
	if (a.p !== b.p) {
		throw new Error('fpGCD: modulus mismatch');
	}
	let A = fpTrim(a);
	let B = fpTrim(b);

	while (!fpIsZero(B)) {
		const { r } = fpDivRem(A, B);
		A = B;
		B = fpTrim(r);
	}
	return fpMonic(A);
}

// ============================================================================
// Z/mZ[x] helpers (generic modulus, coefficient arrays low->high)
// ============================================================================

/** Trim and reduce coefficients modulo m (does not mutate input). */
export function zTrimMod(a: ZPoly, m: bigint): ZPoly {
	const out = a.map(c => modNorm(c ?? 0n, m));
	return zTrimInPlace(out);
}

/** Map coefficients to symmetric representatives modulo m (each in (-m/2, m/2]). */
export function zToSymmetricMod(poly: ZPoly, m: bigint): ZPoly {
	return poly.map(c => modSymmetric(c, m));
}

export function zAddMod(a: ZPoly, b: ZPoly, m: bigint): ZPoly {
	const n = Math.max(a.length, b.length);
	const out: ZPoly = new Array<bigint>(n).fill(0n);
	for (let i = 0; i < n; i++) {
		out[i] = modNorm((a[i] ?? 0n) + (b[i] ?? 0n), m);
	}
	return zTrimInPlace(out);
}

export function zSubMod(a: ZPoly, b: ZPoly, m: bigint): ZPoly {
	const n = Math.max(a.length, b.length);
	const out: ZPoly = new Array<bigint>(n).fill(0n);
	for (let i = 0; i < n; i++) {
		out[i] = modNorm((a[i] ?? 0n) - (b[i] ?? 0n), m);
	}
	return zTrimInPlace(out);
}

export function zScaleMod(a: ZPoly, k: bigint, m: bigint): ZPoly {
	const kk = modNorm(k, m);
	if (kk === 0n) {
		return [0n];
	}
	const out = a.map(c => modNorm((c ?? 0n) * kk, m));
	return zTrimInPlace(out);
}

export function zMulMod(a: ZPoly, b: ZPoly, m: bigint): ZPoly {
	a = zTrimMod(a, m);
	b = zTrimMod(b, m);
	if (zIsZero(a) || zIsZero(b)) {
		return [0n];
	}
	const out: ZPoly = new Array<bigint>(a.length + b.length - 1).fill(0n);
	for (let i = 0; i < a.length; i++) {
		const ai = modNorm(a[i] ?? 0n, m);
		if (ai === 0n) {
			continue;
		}
		for (let j = 0; j < b.length; j++) {
			const bj = modNorm(b[j] ?? 0n, m);
			if (bj === 0n) {
				continue;
			}
			out[i + j] = modNorm((out[i + j] ?? 0n) + ai * bj, m);
		}
	}
	return zTrimInPlace(out);
}

/**
 * Polynomial long division in (Z/mZ)[x] assuming the leading coefficient of b
 * is invertible modulo m.
 */
export function zDivRemMod(a: ZPoly, b: ZPoly, m: bigint): { q: ZPoly; r: ZPoly } {
	const A = zTrimMod(a, m).slice();
	const B = zTrimMod(b, m).slice();
	if (zIsZero(B)) {
		throw new Error('zDivRemMod: division by zero polynomial');
	}
	const da = zDeg(A);
	const db = zDeg(B);
	if (da < db) {
		return { q: [0n], r: A };
	}
	const invLc = modInv(zLC(B), m);
	const q: ZPoly = new Array<bigint>(da - db + 1).fill(0n);
	const r: ZPoly = A;
	while (zDeg(r) >= db && !zIsZero(r)) {
		const dr = zDeg(r);
		const k = dr - db;
		const coeff = modNorm((r[dr] ?? 0n) * invLc, m);
		q[k] = modNorm((q[k] ?? 0n) + coeff, m);
		for (let i = 0; i <= db; i++) {
			r[i + k] = modNorm((r[i + k] ?? 0n) - coeff * (B[i] ?? 0n), m);
		}
		zTrimInPlace(r);
	}
	return { q: zTrimInPlace(q), r: zTrimInPlace(r) };
}

/** Lex compare of dense exponent vectors. Returns 1 if a>b, -1 if a<b. */
function compareDenseLex(a: readonly number[], b: readonly number[]): number {
	const n = Math.max(a.length, b.length);
	for (let i = 0; i < n; i++) {
		const ai = a[i] ?? 0;
		const bi = b[i] ?? 0;
		if (ai !== bi) {
			return ai > bi ? 1 : -1;
		}
	}
	return 0;
}

// Helper: detect multiplicative identity
export function isOnePoly(p: MultiPoly): boolean {
	return p.isConstant() && p.constantTerm() === 1n;
}

// ---------------------------------------------------------------------------
// Canonicalization / simple queries
// ---------------------------------------------------------------------------

/**
 * Return a trimmed clone of p (removes zero coefficients).
 * MultiPoly does not guarantee trimming after every operation; keep this
 * as the single canonical normalization entry point for algorithms.
 */
export function mvNormalize(p: MultiPoly): MultiPoly {
	const out = p.clone();
	out.trim();
	return out;
}

/**
 * Divide by coefficient content, returning {content, primitive}.
 * For the zero polynomial returns {0, 0}.
 */
export function mvDivideByCoeffContent(p: MultiPoly): { content: bigint; primitive: MultiPoly } {
	const c = contentBigint(p.terms.values());
	if (c === 0n) {
		return { content: 0n, primitive: MultiPoly.zero() };
	}
	if (c === 1n) {
		return { content: 1n, primitive: p.clone() };
	}

	const out = new MultiPoly();
	for (const [k, coeff] of p.terms) {
		if (coeff % c !== 0n) {
			throw new Error('mvDivideByCoeffContent: non-exact division');
		}
		const q = coeff / c;
		if (q !== 0n) {
			out.terms.set(k, q);
		}
	}
	out.trim();
	return { content: c, primitive: out };
}

/**
 * Normalize by extracting coefficient content and fixing sign so the
 * lex-leading term coefficient is positive.
 *
 * - For 0 returns { content: 0, primitive: 0 }
 * - For nonzero returns { content: c>=1, primitive } with:
 *    - coeff-content(primitive)=1
 *    - lex-leading term coefficient > 0
 */
export function mvNormalizePrimitiveSignLex(p: MultiPoly): {
	content: bigint;
	primitive: MultiPoly;
} {
	if (p.terms.size === 0) {
		return { content: 0n, primitive: MultiPoly.zero() };
	}
	const { content, primitive } = mvDivideByCoeffContent(p);
	if (primitive.terms.size === 0) {
		return { content, primitive };
	}
	const lt = leadTermLex(primitive, mvNumVars(primitive));
	if (lt && lt.coeff < 0n) {
		return { content: -content, primitive: scalePoly(primitive, -1n) };
	}
	return { content, primitive };
}

/**
 * Normalize the sign of a polynomial that is univariate in `varIndex` without changing its content.
 *
 * IMPORTANT: This is intended for evaluation/interpolation pipelines where dividing by coefficient
 * content would introduce a point-dependent scaling and break reconstruction.
 */
export function mvNormalizeSignUnivariateInVar(p: MultiPoly, varIndex: number): MultiPoly {
	if (p.terms.size === 0) {
		return MultiPoly.zero();
	}
	let q = p;
	const deg = mvDegree(q, varIndex);
	if (deg <= 0) {
		return q;
	}

	// Find leading coefficient term for x_varIndex^deg (assuming univariate in varIndex).
	let lc = 0n;
	for (const [key, coeff] of q.terms) {
		const exp = keyToExp(key);
		if ((exp.get(varIndex) ?? 0) !== deg) {
			continue;
		}
		let ok = true;
		for (const [v, e] of exp.entries()) {
			if (v !== varIndex && e !== 0) {
				ok = false;
				break;
			}
		}
		if (ok) {
			lc = coeff;
			break;
		}
	}

	if (lc < 0n) {
		q = scalePoly(q, -1n);
	}
	return q;
}

function denseToExponents(exps: readonly number[]): Exponents {
	const m: Exponents = new Map();
	for (let i = 0; i < exps.length; i++) {
		const e = exps[i] ?? 0;
		if (e !== 0) {
			m.set(i, e);
		}
	}
	return m;
}

export function denseToKey(exps: readonly number[]): string {
	return expToKey(denseToExponents(exps));
}

/** Return the variable indices that occur in p, sorted ascending. */
export function mvVariablesSorted(p: MultiPoly): number[] {
	return Array.from(p.variables()).sort((a, b) => a - b);
}

/**
 * Degree of p in variable varIndex.
 * Convention: deg(0) = -1
 */
function mvDegree(p: MultiPoly, varIndex: number): number {
	if (p.terms.size === 0) {
		return -1;
	}
	let maxDeg = 0;
	for (const key of p.terms.keys()) {
		const exp = keyToExp(key);
		const d = exp.get(varIndex) ?? 0;
		if (d > maxDeg) {
			maxDeg = d;
		}
	}
	return maxDeg;
}

// Generic helper to combine coefficient maps without duplicating merge logic.
// NOTE: Kept generic so factor.ts (Rat coefficients) can reuse it without poly.ts depending on Rat.
export function mapCombineInPlace<K, V>(
	dest: Map<K, V>,
	src: ReadonlyMap<K, V>,
	combine: (a: V, b: V) => V,
	isZero: (v: V) => boolean,
	zero: () => V
): void {
	for (const [k, b] of src) {
		const a = dest.get(k) ?? zero();
		const c = combine(a, b);
		if (isZero(c)) {
			dest.delete(k);
		} else {
			dest.set(k, c);
		}
	}
}

/** Add two polynomials. */
export function addPoly(a: MultiPoly, b: MultiPoly): MultiPoly {
	const out = new MultiPoly(a.terms);
	mapCombineInPlace(
		out.terms,
		b.terms,
		(x, y) => x + y,
		v => v === 0n,
		() => 0n
	);
	out.trim();
	return out;
}

/** Subtract b from a. */
export function subPoly(a: MultiPoly, b: MultiPoly): MultiPoly {
	const out = new MultiPoly(a.terms);
	mapCombineInPlace(
		out.terms,
		b.terms,
		(x, y) => x - y,
		v => v === 0n,
		() => 0n
	);
	out.trim();
	return out;
}

/** Negate polynomial. */
export function negPoly(a: MultiPoly): MultiPoly {
	const out = new MultiPoly();
	for (const [k, c] of a.terms) {
		if (c !== 0n) {
			out.terms.set(k, -c);
		}
	}
	out.trim();
	return out;
}

/** Multiply all coefficients of a polynomial by a scalar. */
export function scalePoly(a: MultiPoly, k: bigint): MultiPoly {
	if (k === 0n) {
		return MultiPoly.zero();
	}
	if (k === 1n) {
		return a.clone();
	}

	const out = new MultiPoly();
	for (const [key, coeff] of a.terms) {
		const v = coeff * k;
		if (v !== 0n) {
			out.terms.set(key, v);
		}
	}
	out.trim();
	return out;
}

/** Multiply polynomials. */
export function mulPoly(a: MultiPoly, b: MultiPoly): MultiPoly {
	if (a.terms.size === 0 || b.terms.size === 0) {
		return MultiPoly.zero();
	}
	const out = new MultiPoly();
	for (const [ka, ca] of a.terms) {
		const ea = keyToExp(ka);
		for (const [kb, cb] of b.terms) {
			const eb = keyToExp(kb);
			const e: Exponents = new Map(ea);
			for (const [v, p] of eb) {
				e.set(v, (e.get(v) ?? 0) + p);
			}
			const k = expToKey(e);
			const prev = out.terms.get(k) ?? 0n;
			const val = prev + ca * cb;
			if (val === 0n) {
				out.terms.delete(k);
			} else {
				out.terms.set(k, val);
			}
		}
	}
	out.trim();
	return out;
}

/** Structural equality of two polynomials (assumes both are already trimmed/normalized). */
export function equalPoly(a: MultiPoly, b: MultiPoly): boolean {
	if (a === b) {
		return true;
	}
	if (a.terms.size !== b.terms.size) {
		return false;
	}
	for (const [k, ca] of a.terms) {
		if ((b.terms.get(k) ?? 0n) !== ca) {
			return false;
		}
	}
	return true;
}

// ---------------------------------------------------------------------------
// Higher-level helpers used by GCD + adapters
// ---------------------------------------------------------------------------

/**
 * Leading term in lex order (highest exponents lexicographically).
 * Returns the dense exponent vector (length nVars) and its coefficient.
 */
export function leadTermLex(p: MultiPoly, nVars: number): { exp: number[]; coeff: bigint } | null {
	let bestExp: number[] | null = null;
	let bestCoeff = 0n;

	for (const [key, coeff] of p.terms.entries()) {
		if (coeff === 0n) {
			continue;
		}
		const exp = keyToExp(key);
		const dense = new Array<number>(nVars).fill(0);
		for (const [i, e] of exp.entries()) {
			if (i >= 0 && i < nVars) {
				dense[i] = e;
			}
		}
		if (!bestExp || compareDenseLex(dense, bestExp) > 0) {
			bestExp = dense;
			bestCoeff = coeff;
		}
	}

	return bestExp ? { exp: bestExp, coeff: bestCoeff } : null;
}

// ---------------------------------------------------------------------------
// Exact division (Z) in lex order
// ---------------------------------------------------------------------------

/**
 * Compute a conservative number of variables from the support of one or more polynomials.
 * Returns maxVarIndex+1 across all terms (or 0 if all are zero).
 */
export function mvNumVars(...polys: MultiPoly[]): number {
	let max = -1;
	for (const p of polys) {
		for (const key of p.terms.keys()) {
			const exp = keyToExp(key);
			for (const i of exp.keys()) {
				if (i > max) {
					max = i;
				}
			}
		}
	}
	return max + 1;
}

/**
 * Exact division A/B in Z[x0..] using the canonical lex-leading-term algorithm.
 * Returns null if division is not exact.
 */
export function mvExactDiv(A: MultiPoly, B: MultiPoly): MultiPoly | null {
	const nVars = mvNumVars(A, B);
	return exactDivLex(A, B, nVars);
}

/**
 * Exact division by a monomial (single-term polynomial).
 * Returns null if `m` is not a monomial or division is not exact.
 */
export function mvExactDivByMonomial(p: MultiPoly, m: MultiPoly): MultiPoly | null {
	if (m.terms.size !== 1) {
		return null;
	}
	return mvExactDiv(p, m);
}

export function monoDividesDense(a: readonly number[], b: readonly number[]): boolean {
	const n = Math.max(a.length, b.length);
	for (let i = 0; i < n; i++) {
		if ((a[i] ?? 0) > (b[i] ?? 0)) {
			return false;
		}
	}
	return true;
}

export function monoSubDense(b: readonly number[], a: readonly number[]): number[] {
	const n = Math.max(a.length, b.length);
	const out = new Array<number>(n).fill(0);
	for (let i = 0; i < n; i++) {
		out[i] = (b[i] ?? 0) - (a[i] ?? 0);
	}
	return out;
}

/**
 * Exact division A/B in Z[x0..x{nVars-1}] assuming B divides A exactly.
 * Uses lex order for leading terms. Returns null if division fails.
 */
function exactDivLex(A: MultiPoly, B: MultiPoly, nVars: number): MultiPoly | null {
	const ltB = leadTermLex(B, nVars);
	if (!ltB) {
		return null;
	}
	let R = A.clone();
	R.trim();
	const out = MultiPoly.zero();

	while (!R.isZero()) {
		const ltR = leadTermLex(R, nVars);
		if (!ltR) {
			break;
		}

		if (!monoDividesDense(ltB.exp, ltR.exp)) {
			return null;
		}
		const qExp = monoSubDense(ltR.exp, ltB.exp);
		if (ltB.coeff === 0n) {
			return null;
		}
		if (ltR.coeff % ltB.coeff !== 0n) {
			return null;
		}
		const qCoeff = ltR.coeff / ltB.coeff;

		// out += qCoeff * x^qExp
		const qMono = MultiPoly.monomial(qCoeff, qExp);
		const out2 = addPoly(out, qMono);
		out.terms = out2.terms;

		// R -= (qCoeff * x^qExp) * B
		const prod = mulPoly(qMono, B);
		R = subPoly(R, prod);
	}

	out.trim();
	return out;
}

/**
 * Substitute a single variable (by index) with an integer value.
 * The chosen variable's exponent is set to 0 in every term.
 */
export function substituteVarIndex(p: MultiPoly, varIndex: number, value: bigint): MultiPoly {
	if (p.terms.size === 0) {
		return MultiPoly.zero();
	}
	const out = new MultiPoly();
	for (const [key, coeff0] of p.terms.entries()) {
		const exp = keyToExp(key);
		const e = exp.get(varIndex) ?? 0;
		let coeff = coeff0;
		if (e !== 0) {
			// Fast exponentiation for integer powers.
			let base = value;
			let pow = 1n;
			let k = BigInt(e);
			while (k > 0n) {
				if (k & 1n) {
					pow *= base;
				}
				base *= base;
				k >>= 1n;
			}
			coeff *= pow;
			exp.delete(varIndex);
		}
		const newKey = expToKey(exp);
		const prev = out.terms.get(newKey) ?? 0n;
		const sum = prev + coeff;
		if (sum === 0n) {
			out.terms.delete(newKey);
		} else {
			out.terms.set(newKey, sum);
		}
	}
	out.trim();
	return out;
}

/**
 * Remove a variable index from a polynomial by shifting indices > varIndex down.
 * (Assumes the removed variable is no longer used, but handles exponents safely.)
 */
export function removeVarIndex(p: MultiPoly, varIndex: number): MultiPoly {
	if (p.terms.size === 0) {
		return MultiPoly.zero();
	}
	const out = new MultiPoly();
	for (const [key, coeff] of p.terms.entries()) {
		const exp = keyToExp(key);
		const newExp: Exponents = new Map();
		for (const [i, e] of exp.entries()) {
			if (i === varIndex) {
				continue;
			}
			newExp.set(i > varIndex ? i - 1 : i, e);
		}
		const nk = expToKey(newExp);
		out.terms.set(nk, (out.terms.get(nk) ?? 0n) + coeff);
		if (out.terms.get(nk) === 0n) {
			out.terms.delete(nk);
		}
	}
	out.trim();
	return out;
}

/**
 * Add a variable index to a polynomial by shifting indices >= varIndex up.
 */
export function addVarIndex(p: MultiPoly, varIndex: number): MultiPoly {
	if (p.terms.size === 0) {
		return MultiPoly.zero();
	}
	const out = new MultiPoly();
	for (const [key, coeff] of p.terms.entries()) {
		const exp = keyToExp(key);
		const newExp: Exponents = new Map();
		for (const [i, e] of exp.entries()) {
			newExp.set(i >= varIndex ? i + 1 : i, e);
		}
		const nk = expToKey(newExp);
		out.terms.set(nk, (out.terms.get(nk) ?? 0n) + coeff);
		if (out.terms.get(nk) === 0n) {
			out.terms.delete(nk);
		}
	}
	out.trim();
	return out;
}

// ---------------------------------------------------------------------------
// MV ↔ Univariate view utilities
// ---------------------------------------------------------------------------

/** Convert univariate coefficient array (number, low→high) to MultiPoly in `varIndex`. */
export function fromUnivariate(coeffs: number[], varIndex: number = 0): MultiPoly {
	const p = new MultiPoly();
	for (let i = 0; i < coeffs.length; i++) {
		const c = coeffs[i];
		if (c === 0) {
			continue;
		}
		const exp: Exponents = new Map();
		if (i > 0) {
			exp.set(varIndex, i);
		}
		p.terms.set(expToKey(exp), BigInt(c));
	}
	return p;
}

const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

function bigintToSafeNumber(b: bigint, context: string): number {
	if (b > MAX_SAFE_BIGINT || b < -MAX_SAFE_BIGINT) {
		throw new Error(`${context}: coefficient ${b.toString()} exceeds Number.MAX_SAFE_INTEGER`);
	}
	return Number(b);
}

function trimTrailingZeros(coeffs: number[]): number[] {
	let i = coeffs.length - 1;
	while (i > 0 && coeffs[i] === 0) {
		i--;
	}
	return coeffs.slice(0, i + 1);
}

/**
 * Convert MultiPoly to univariate coefficient array (numbers) if it only has one variable.
 * Returns null if polynomial has more than one variable.
 */
export function toUnivariate(p: MultiPoly, varIndex: number = 0): number[] | null {
	// Check that only varIndex appears
	for (const key of p.terms.keys()) {
		const exp = keyToExp(key);
		for (const v of exp.keys()) {
			if (v !== varIndex) {
				return null;
			}
		}
	}

	const deg = p.degree(varIndex);
	if (deg < 0) {
		return [0];
	}

	const result: number[] = new Array(deg + 1).fill(0);
	for (const [key, coeff] of p.terms) {
		const exp = keyToExp(key);
		const d = exp.get(varIndex) ?? 0;
		result[d] = bigintToSafeNumber(coeff, 'toUnivariate');
	}

	return trimTrailingZeros(result);
}

/**
 * View multivariate polynomial as univariate in varIndex with polynomial coefficients.
 * Returns array of [coefficient polynomial, degree] pairs sorted by degree.
 */
export function viewAsUnivariate(p: MultiPoly, varIndex: number): Array<[MultiPoly, number]> {
	const coeffMap = new Map<number, MultiPoly>();

	for (const [key, coeff] of p.terms) {
		const exp = keyToExp(key);
		const deg = exp.get(varIndex) ?? 0;

		// Build coefficient without varIndex
		const newExp = new Map(exp);
		newExp.delete(varIndex);
		const newKey = expToKey(newExp);

		if (!coeffMap.has(deg)) {
			coeffMap.set(deg, MultiPoly.zero());
		}
		const poly = coeffMap.get(deg)!;
		const existing = poly.terms.get(newKey) ?? 0n;
		const sum = existing + coeff;
		if (sum === 0n) {
			poly.terms.delete(newKey);
		} else {
			poly.terms.set(newKey, sum);
		}
	}

	const result: Array<[MultiPoly, number]> = [];
	for (const [deg, poly] of coeffMap) {
		if (!poly.isZero()) {
			result.push([poly, deg]);
		}
	}
	result.sort((a, b) => a[1] - b[1]);
	return result;
}

/** Reconstruct polynomial from univariate view. */
export function fromUnivariateView(terms: Array<[MultiPoly, number]>, varIndex: number): MultiPoly {
	const result = MultiPoly.zero();

	for (const [coeff, deg] of terms) {
		for (const [key, c] of coeff.terms) {
			const exp = keyToExp(key);
			if (deg > 0) {
				exp.set(varIndex, (exp.get(varIndex) ?? 0) + deg);
			}
			const newKey = expToKey(exp);
			const existing = result.terms.get(newKey) ?? 0n;
			result.terms.set(newKey, existing + c);
		}
	}

	result.trim();
	return result;
}

// ============================================================================
// Shared multivariate division / content helpers
// ============================================================================

function mvPrimitiveNormalized(p: MultiPoly): MultiPoly {
	if (p.isZero()) {
		return MultiPoly.zero();
	}
	return mvNormalizePrimitiveSignLex(p).primitive;
}

/**
 * Pseudo-division of multivariate polynomials viewed as univariate in `varIndex`.
 * Returns [q, r] such that lc(b)^k * a = q*b + r with deg(r) < deg(b) in `varIndex`.
 */
export function pseudoDivide(a: MultiPoly, b: MultiPoly, varIndex: number): [MultiPoly, MultiPoly] {
	if (b.isZero()) {
		throw new Error('Division by zero');
	}

	const degB = b.degree(varIndex);
	const degA = a.degree(varIndex);

	if (degA < degB) {
		return [MultiPoly.zero(), a.clone()];
	}

	const lcB = b.leadingCoeff(varIndex);
	let q = MultiPoly.zero();
	let r = a.clone();

	const delta = degA - degB + 1;
	let e = delta;

	while (!r.isZero() && r.degree(varIndex) >= degB) {
		const degR = r.degree(varIndex);
		const lcR = r.leadingCoeff(varIndex);
		const shift = degR - degB;

		const s = new MultiPoly();
		for (const [key, coeff] of lcR.terms) {
			const exp = keyToExp(key);
			if (shift > 0) {
				exp.set(varIndex, (exp.get(varIndex) ?? 0) + shift);
			}
			s.terms.set(expToKey(exp), coeff);
		}

		q = addPoly(mulPoly(q, lcB), s);
		r = subPoly(mulPoly(r, lcB), mulPoly(s, b));
		e--;
	}

	let lcBPower = MultiPoly.constant(1n);
	for (let i = 0; i < e; i++) {
		lcBPower = mulPoly(lcBPower, lcB);
	}
	q = mulPoly(q, lcBPower);
	r = mulPoly(r, lcBPower);

	return [q, r];
}

/**
 * Primitive GCD for multivariate polynomials, computed by viewing the inputs
 * as univariate in `varIndex` with multivariate coefficients.
 */
export function multiPolyGCD(a: MultiPoly, b: MultiPoly, varIndex: number): MultiPoly {
	if (a.isZero()) {
		return b.isZero() ? MultiPoly.constant(1n) : mvPrimitiveNormalized(b);
	}
	if (b.isZero()) {
		return mvPrimitiveNormalized(a);
	}

	let aPrim = mvPrimitiveNormalized(a);
	let bPrim = mvPrimitiveNormalized(b);

	if (aPrim.degree(varIndex) < bPrim.degree(varIndex)) {
		[aPrim, bPrim] = [bPrim, aPrim];
	}

	while (!bPrim.isZero()) {
		const [, r] = pseudoDivide(aPrim, bPrim, varIndex);
		if (r.isZero()) {
			break;
		}
		aPrim = bPrim;
		bPrim = mvPrimitiveNormalized(r);
	}

	return mvPrimitiveNormalized(bPrim);
}

/**
 * Content of a polynomial with respect to one variable, i.e. the gcd of the
 * coefficient-polynomials in the univariate view.
 */
export function mvContentInVar(p: MultiPoly, varIndex: number): MultiPoly {
	const terms = viewAsUnivariate(p, varIndex);

	if (terms.length === 0) {
		return MultiPoly.constant(1n);
	}
	if (terms.length === 1) {
		return mvPrimitiveNormalized(terms[0][0]);
	}

	let g = terms[0][0];
	for (let i = 1; i < terms.length; i++) {
		const vars = new Set([...g.variables(), ...terms[i][0].variables()]);
		if (vars.size === 0) {
			g = MultiPoly.constant(gcd(g.constantTerm(), terms[i][0].constantTerm()));
		} else {
			const gcdVar = Math.min(...vars);
			g = multiPolyGCD(g, terms[i][0], gcdVar);
		}

		if (g.isConstant() && g.constantTerm() === 1n) {
			return MultiPoly.constant(1n);
		}
	}

	return mvPrimitiveNormalized(g);
}

/**
 * Primitive part of a polynomial relative to the univariate view in `varIndex`.
 */
export function primitivePart(p: MultiPoly, varIndex: number): MultiPoly {
	const cont = mvContentInVar(p, varIndex);
	if (cont.isConstant() && cont.constantTerm() === 1n) {
		return p;
	}

	const terms = viewAsUnivariate(p, varIndex);
	const newTerms: Array<[MultiPoly, number]> = [];

	for (const [coeff, deg] of terms) {
		const vars = cont.variables();
		if (vars.size === 0) {
			const c = cont.constantTerm();
			const newCoeff = new MultiPoly();
			for (const [key, val] of coeff.terms) {
				newCoeff.terms.set(key, val / c);
			}
			newTerms.push([newCoeff, deg]);
		} else {
			const divVar = Math.min(...vars);
			const [q] = pseudoDivide(coeff, cont, divVar);
			newTerms.push([mvPrimitiveNormalized(q), deg]);
		}
	}

	return fromUnivariateView(newTerms, varIndex);
}

/**
 * Extract quadratic coefficients of `p` viewed as `A*v^2 + B*v + C`.
 * Terms with degree > 2 in `v` are silently ignored.
 */
export function quadraticCoeffsInVar(
	p: MultiPoly,
	v: number
): { A: MultiPoly; B: MultiPoly; C: MultiPoly } {
	const A = new MultiPoly();
	const B = new MultiPoly();
	const C = new MultiPoly();

	for (const [key, coeff] of p.terms) {
		const exp = keyToExp(key);
		const e = exp.get(v) ?? 0;
		exp.delete(v);
		const k = expToKey(exp);

		if (e === 2) {
			A.terms.set(k, (A.terms.get(k) ?? 0n) + coeff);
		} else if (e === 1) {
			B.terms.set(k, (B.terms.get(k) ?? 0n) + coeff);
		} else if (e === 0) {
			C.terms.set(k, (C.terms.get(k) ?? 0n) + coeff);
		}
	}

	A.trim();
	B.trim();
	C.trim();
	return { A, B, C };
}
