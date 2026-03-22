/**
 * @module factor_multivariate
 *
 * Multivariate polynomial factorization over Z[x1, x2, ..., xn].
 */

import { abs, gcd, modNorm, powN, intNthRootExact, getDivisors, bigintBitLength } from './arith';
import {
	factorPolynomial,
	factorPolynomialBig,
	type FactorizationResult,
} from './factorUnivariate';
import { MultiPoly, expToKey, keyToExp, type Exponents } from './multiPoly/MultiPoly';
import {
	type ZPoly,
	type Vars,
	isOnePoly,
	addPoly,
	subPoly,
	mulPoly,
	negPoly,
	scalePoly,
	mvNormalizeSignUnivariateInVar,
	mvNormalize,
	mvVariablesSorted,
	mvNormalizePrimitiveSignLex,
	equalPoly,
	mvExactDiv,
	mvExactDivByMonomial,
	substituteVarIndex,
	pseudoDivide,
	mvContentInVar,
	primitivePart,
	quadraticCoeffsInVar,
	fromUnivariate,
	toUnivariate,
} from './poly';
import { type Rat, rat, ratToInt, ratMul, ratSub, ratDiv } from './rational';

export type { Vars };

/** Divide out coefficient content and normalize sign so the lex-leading coefficient is positive. */
function makePrimitiveZ(p: MultiPoly): [bigint, MultiPoly] {
	if (p.isZero()) {
		return [1n, p];
	}
	const { content, primitive } = mvNormalizePrimitiveSignLex(p);
	return [content === 0n ? 1n : content, primitive];
}

/** True if p is a unit constant (±1). */
function isUnitConstant(p: MultiPoly): boolean {
	return p.isConstant() && (p.constantTerm() === 1n || p.constantTerm() === -1n);
}

/** Remove unit constants (±1) from a factor list. */
function filterUnitConstants(factors: MultiPoly[]): MultiPoly[] {
	return factors.filter(f => !isUnitConstant(f));
}

/** Multiply factors (empty list -> 1). */
function multiplyFactors(factors: MultiPoly[]): MultiPoly {
	let acc = MultiPoly.constant(1n);
	for (const f of factors) {
		acc = mulPoly(acc, f);
	}
	return acc;
}

/** Checks whether the given factors reconstruct the original polynomial (after normalization). */
function factorsReconstruct(original: MultiPoly, factors: MultiPoly[]): boolean {
	const prod = mvNormalize(multiplyFactors(factors));
	const orig = mvNormalize(original);
	return equalPoly(prod, orig);
}

/**
 * Check for special bivariate patterns
 */
function trySpecialBivariatePatterns(
	f: MultiPoly,
	mainVar: number,
	liftVar: number
): MultiPoly[] | null {
	// Pattern: x^n - y^n (difference of powers)
	const xDeg = f.degree(mainVar);
	const yDeg = f.degree(liftVar);

	if (xDeg === yDeg && xDeg >= 1) {
		// Check if f = x^n - y^n
		const xn = MultiPoly.monomial(1n, mainVar === 0 ? [xDeg, 0] : [0, xDeg]);
		const yn = MultiPoly.monomial(1n, liftVar === 0 ? [yDeg, 0] : [0, yDeg]);
		const diff = subPoly(xn, yn);

		if (equalPoly(f, diff)) {
			// x^n - y^n = (x - y)(x^(n-1) + x^(n-2)y + ... + y^(n-1))
			const xMinusY = subPoly(MultiPoly.variable(mainVar), MultiPoly.variable(liftVar));

			// Build the sum
			let sum = MultiPoly.zero();
			for (let i = 0; i < xDeg; i++) {
				// x^(n-1-i) * y^i
				const term = MultiPoly.monomial(
					1n,
					mainVar === 0 ? [xDeg - 1 - i, i] : [i, xDeg - 1 - i]
				);
				sum = addPoly(sum, term);
			}

			return [xMinusY, sum];
		}

		// Check if f = x^n + y^n with n odd
		const sumXY = addPoly(xn, yn);
		if (equalPoly(f, sumXY) && xDeg % 2 === 1) {
			// x^n + y^n = (x + y)(x^(n-1) - x^(n-2)y + ... + y^(n-1)) for odd n
			const xPlusY = addPoly(MultiPoly.variable(mainVar), MultiPoly.variable(liftVar));

			let sum = MultiPoly.zero();
			for (let i = 0; i < xDeg; i++) {
				const sign = i % 2 === 0 ? 1n : -1n;
				const term = MultiPoly.monomial(
					sign,
					mainVar === 0 ? [xDeg - 1 - i, i] : [i, xDeg - 1 - i]
				);
				sum = addPoly(sum, term);
			}

			return [xPlusY, sum];
		}
	}

	// Pattern: perfect square (x + y)^2 = x^2 + 2xy + y^2
	if (xDeg === 2 && yDeg === 2) {
		// Check if f = x^2 + 2xy + y^2
		const x2 = f.getCoeff(mainVar === 0 ? [2, 0] : [0, 2]);
		const y2 = f.getCoeff(liftVar === 0 ? [2, 0] : [0, 2]);
		const xy = f.getCoeff([1, 1]);

		if (x2 === 1n && y2 === 1n && xy === 2n && f.terms.size === 3) {
			const xPlusY = addPoly(MultiPoly.variable(mainVar), MultiPoly.variable(liftVar));
			return [xPlusY, xPlusY];
		}

		// Check if f = x^2 - 2xy + y^2
		if (x2 === 1n && y2 === 1n && xy === -2n && f.terms.size === 3) {
			const xMinusY = subPoly(MultiPoly.variable(mainVar), MultiPoly.variable(liftVar));
			return [xMinusY, xMinusY];
		}
	}

	// Pattern: x^4 + x^2*y^2 + y^4 = (x^2 + xy + y^2)(x^2 - xy + y^2)
	// More generally: x^(2m) + x^m*y^m + y^(2m) for m >= 2
	// When m is even (m=2k): factors are (x^m + x^k*y^k + y^m)(x^m - x^k*y^k + y^m)
	// When m is odd: factors are (x^m + x^(m-1)*y + ... + y^m)(x^m - x^(m-1)*y + ... + y^m) - alternating
	if (xDeg === yDeg && xDeg % 2 === 0 && xDeg >= 4) {
		const m = xDeg / 2; // We're looking at x^(2m) + x^m*y^m + y^(2m)
		// Check if f = x^(2m) + x^m*y^m + y^(2m)
		const x2m = MultiPoly.monomial(1n, mainVar === 0 ? [2 * m, 0] : [0, 2 * m]);
		const y2m = MultiPoly.monomial(1n, liftVar === 0 ? [2 * m, 0] : [0, 2 * m]);
		const xmym = MultiPoly.monomial(1n, mainVar === 0 ? [m, m] : [m, m]);
		const target = addPoly(addPoly(x2m, xmym), y2m);

		if (equalPoly(f, target)) {
			if (m % 2 === 0) {
				// m is even: factors are (x^m + x^(m/2)*y^(m/2) + y^m)(x^m - x^(m/2)*y^(m/2) + y^m)
				const k = m / 2;
				const xm = MultiPoly.monomial(1n, mainVar === 0 ? [m, 0] : [0, m]);
				const ym = MultiPoly.monomial(1n, liftVar === 0 ? [m, 0] : [0, m]);
				const xkyk = MultiPoly.monomial(1n, mainVar === 0 ? [k, k] : [k, k]);

				const f1 = addPoly(addPoly(xm, xkyk), ym); // x^m + x^k*y^k + y^m
				const f2 = subPoly(addPoly(xm, ym), xkyk); // x^m - x^k*y^k + y^m

				// Verify
				const prod = mulPoly(f1, f2);
				if (equalPoly(prod, f)) {
					return [f1, f2];
				}
			} else {
				// m is odd: factors are (x^m + x^(m-1)*y + ... + y^m)(x^m - x^(m-1)*y + ... + y^m)
				let f1 = MultiPoly.zero();
				let f2 = MultiPoly.zero();
				for (let i = 0; i <= m; i++) {
					const term = MultiPoly.monomial(1n, mainVar === 0 ? [m - i, i] : [i, m - i]);
					f1 = addPoly(f1, term);
					const sign = i % 2 === 0 ? 1n : -1n;
					f2 = addPoly(f2, scalePoly(term, sign));
				}

				// Verify
				const prod = mulPoly(f1, f2);
				if (equalPoly(prod, f)) {
					return [f1, f2];
				}
			}
		}

		// Also check x^(2m) - x^m*y^m + y^(2m) pattern (for cases like x^8-x^4y^4+y^8)
		const targetMinus = subPoly(addPoly(x2m, y2m), xmym);
		if (equalPoly(f, targetMinus)) {
			// This doesn't have a simple factorization over Z in general
			// Skip for now
		}
	}

	// Pattern: Check if (x+y) or (x-y) divides f by substitution
	// If f(x, -x) = 0 (i.e., substituting y = -x), then (x+y) divides f
	// If f(x, x) = 0 (i.e., substituting y = x), then (x-y) divides f
	{
		// Check (x+y) divisibility: evaluate at liftVar = -mainVar
		// This means for each term c * x^a * y^b, we get c * x^a * (-x)^b = c * (-1)^b * x^(a+b)
		let sumAtYeqNegX = 0n;
		for (const [key, coeff] of f.terms) {
			const exp = keyToExp(key);
			const b = exp.get(liftVar) ?? 0;
			const sign = b % 2 === 0 ? 1n : -1n;
			// All terms become multiples of x^(a+b), so we just check if they sum to 0
			sumAtYeqNegX += coeff * sign;
		}

		if (sumAtYeqNegX === 0n && f.terms.size > 1) {
			// (x+y) divides f - perform polynomial division
			const xPlusY = addPoly(MultiPoly.variable(mainVar), MultiPoly.variable(liftVar));
			const quotient = mvExactDiv(f, xPlusY);
			if (quotient !== null && !quotient.isConstant()) {
				return [xPlusY, quotient];
			}
		}

		// Check (x-y) divisibility: evaluate at liftVar = mainVar
		let sumAtYeqX = 0n;
		for (const coeff of f.terms.values()) {
			sumAtYeqX += coeff;
		}

		if (sumAtYeqX === 0n && f.terms.size > 1) {
			// (x-y) divides f
			const xMinusY = subPoly(MultiPoly.variable(mainVar), MultiPoly.variable(liftVar));
			const quotient = mvExactDiv(f, xMinusY);
			if (quotient !== null && !quotient.isConstant()) {
				return [xMinusY, quotient];
			}
		}
	}

	// Pattern: Try (x^2+y^2) as a factor for polynomials with only even powers
	// This catches cases like x^6+x^4y^2+x^2y^4+y^6 = (x^2+y^2)(x^4+y^4)
	{
		// Check if all terms have even degrees in both variables
		let allEven = true;
		for (const key of f.terms.keys()) {
			const exp = keyToExp(key);
			const a = exp.get(mainVar) ?? 0;
			const b = exp.get(liftVar) ?? 0;
			if (a % 2 !== 0 || b % 2 !== 0) {
				allEven = false;
				break;
			}
		}

		if (allEven && xDeg >= 2 && yDeg >= 2) {
			// Try dividing by x^2 + y^2
			const x2 = MultiPoly.monomial(1n, mainVar === 0 ? [2, 0] : [0, 2]);
			const y2 = MultiPoly.monomial(1n, liftVar === 0 ? [2, 0] : [0, 2]);
			const x2PlusY2 = addPoly(x2, y2);

			const quotient = mvExactDiv(f, x2PlusY2);
			if (quotient !== null && !quotient.isConstant()) {
				return [x2PlusY2, quotient];
			}

			// Also try x^2 - y^2 = (x-y)(x+y)
			const x2MinusY2 = subPoly(x2, y2);
			const quotient2 = mvExactDiv(f, x2MinusY2);
			if (quotient2 !== null && !quotient2.isConstant()) {
				return [x2MinusY2, quotient2];
			}
		}
	}

	// Pattern: Homogeneous polynomial factorization.
	// If f is homogeneous of degree d (every term has total degree d), dehomogenize
	// by setting liftVar=1 to get a univariate polynomial, factor it, then
	// re-homogenize each factor by restoring powers of liftVar.
	{
		const totalDeg = xDeg; // candidate total degree
		let isHomogeneous = true;
		for (const [key] of f.terms) {
			const exp = keyToExp(key);
			const a = exp.get(mainVar) ?? 0;
			const b = exp.get(liftVar) ?? 0;
			if (a + b !== totalDeg) {
				isHomogeneous = false;
				break;
			}
		}

		if (isHomogeneous && totalDeg >= 4) {
			// Dehomogenize: set liftVar = 1, giving a univariate polynomial in mainVar
			const uniCoeffs: bigint[] = new Array(totalDeg + 1).fill(0n);
			for (const [key, coeff] of f.terms) {
				const exp = keyToExp(key);
				const a = exp.get(mainVar) ?? 0;
				uniCoeffs[a] = (uniCoeffs[a] ?? 0n) + coeff;
			}

			// Factor the univariate polynomial
			const fr = factorPolynomialBig(uniCoeffs);
			if (fr.factors && fr.factors.length >= 2) {
				// Re-homogenize each factor: for coefficient at x^i in a degree-d factor,
				// multiply by y^(d-i) to restore homogeneity.
				const result: MultiPoly[] = [];
				for (const fac of fr.factors) {
					const coeffs = fac.coefficients;
					const facDeg = coeffs.length - 1;
					let facPoly = MultiPoly.zero();
					for (let i = 0; i <= facDeg; i++) {
						const c = coeffs[i] ?? 0n;
						if (c !== 0n) {
							const term = MultiPoly.monomial(
								c,
								mainVar === 0 ? [i, facDeg - i] : [facDeg - i, i]
							);
							facPoly = addPoly(facPoly, term);
						}
					}
					for (let m = 0; m < (fac.multiplicity ?? 1); m++) {
						result.push(facPoly);
					}
				}

				// Handle content
				if (fr.content !== 1n && fr.content !== 0n) {
					if (fr.content === -1n && result.length > 0) {
						result[0] = scalePoly(result[0], -1n);
					} else if (fr.content !== -1n) {
						result.unshift(MultiPoly.constant(fr.content));
					}
				}

				// Verify the factorization
				if (result.length >= 2) {
					let prod = result[0];
					for (let i = 1; i < result.length; i++) {
						prod = mulPoly(prod, result[i]);
					}
					if (equalPoly(prod, f)) {
						return result;
					}
				}
			}
		}
	}

	return null;
}

/**
 * Main factorization: factor a multivariate polynomial
 */
/**
 * Updated factorMultivariate to handle complex evaluation points
 * and leading coefficient distribution.
 */

/**
 * Corrected multivariate factorization that won't hang on the user's polynomial.
 */

/**
 * Full implementation to handle complex multivariate polynomials.
 */

/**
 * Monomial GCD across all terms: gcd(coeffs) * Π v_i^{minExp_i}.
 * Returns 1 if there is no non-trivial common monomial factor.
 */
function monomialGCD(p: MultiPoly): MultiPoly {
	if (p.isZero() || p.terms.size === 0) {
		return MultiPoly.constant(1n);
	}

	let gCoeff: bigint | null = null;
	const minExp = new Map<number, number>();

	for (const [key, coeff] of p.terms) {
		const c = coeff < 0n ? -coeff : coeff;
		gCoeff = gCoeff === null ? c : gcd(gCoeff, c);

		const exp = keyToExp(key);
		const vars = new Set<number>([...minExp.keys(), ...exp.keys()]);
		for (const v of vars) {
			const e = exp.get(v) ?? 0;
			const prev = minExp.get(v);
			if (prev === undefined) {
				minExp.set(v, e);
			} else {
				minExp.set(v, Math.min(prev, e));
			}
		}
	}

	if (gCoeff === null || gCoeff === 0n) {
		return MultiPoly.constant(1n);
	}

	const g = new MultiPoly();
	const eMap = new Map<number, number>();
	for (const [v, e] of minExp) {
		if (e > 0) {
			eMap.set(v, e);
		}
	}
	g.terms.set(expToKey(eMap), gCoeff);
	g.trim();

	if (g.isConstant() && gCoeff === 1n) {
		return MultiPoly.constant(1n);
	}
	return g;
}

/**
 * Try to factor a polynomial that is linear in variable v.
 * p = A*v + B where A, B are polynomials not involving v.
 * Factors as f * q if A and B share a non-trivial polynomial factor f.
 */
function tryFactorLinearInVar(p: MultiPoly, v: number): [MultiPoly, MultiPoly] | null {
	const A = new MultiPoly();
	const B = new MultiPoly();

	for (const [key, coeff] of p.terms) {
		const exp = keyToExp(key);
		const e = exp.get(v) ?? 0;
		if (e > 1) {
			return null;
		}
		exp.delete(v);
		const k = expToKey(exp);

		if (e === 1) {
			A.terms.set(k, (A.terms.get(k) ?? 0n) + coeff);
		} else {
			B.terms.set(k, (B.terms.get(k) ?? 0n) + coeff);
		}
	}

	A.trim();
	B.trim();

	if (A.isZero()) {
		return null;
	}
	if (B.isZero()) {
		return [MultiPoly.variable(v), A];
	}

	const aVars = Array.from(A.variables());
	const bVars = Array.from(B.variables());
	const commonVars = aVars.filter(x => bVars.includes(x));

	if (commonVars.length === 0 && A.terms.size === 1 && B.terms.size === 1) {
		return null;
	}

	const aFactors = factorMultivariate(A);
	for (const f of aFactors) {
		if (f.isConstant()) {
			continue;
		}

		const bDivResult = mvExactDiv(B, f);
		if (bDivResult === null) {
			continue;
		}

		const aDivResult = mvExactDiv(A, f);
		if (aDivResult === null) {
			continue;
		}

		const quotient = addPoly(mulPoly(aDivResult, MultiPoly.variable(v)), bDivResult);
		if (equalPoly(mulPoly(f, quotient), p)) {
			return [f, quotient];
		}
	}

	const bFactors = factorMultivariate(B);
	for (const f of bFactors) {
		if (f.isConstant()) {
			continue;
		}

		const aDivResult = mvExactDiv(A, f);
		if (aDivResult === null) {
			continue;
		}

		const bDivResult = mvExactDiv(B, f);
		if (bDivResult === null) {
			continue;
		}

		const quotient = addPoly(mulPoly(aDivResult, MultiPoly.variable(v)), bDivResult);
		if (equalPoly(mulPoly(f, quotient), p)) {
			return [f, quotient];
		}
	}

	return null;
}

/**
 * Try to factor a polynomial that is binomial in variable v.
 * p = A*v^k + B*v^m with exactly two distinct powers of v and k > m.
 * Factors as f * q if A and B share a non-trivial polynomial factor f.
 */
function tryFactorBinomialInVar(p: MultiPoly, v: number): [MultiPoly, MultiPoly] | null {
	const powerMap = new Map<number, MultiPoly>();

	for (const [key, coeff] of p.terms) {
		const exp = keyToExp(key);
		const e = exp.get(v) ?? 0;
		exp.delete(v);
		const k = expToKey(exp);

		if (!powerMap.has(e)) {
			powerMap.set(e, new MultiPoly());
		}
		const poly = powerMap.get(e)!;
		poly.terms.set(k, (poly.terms.get(k) ?? 0n) + coeff);
	}

	for (const [e, poly] of powerMap) {
		poly.trim();
		if (poly.isZero()) {
			powerMap.delete(e);
		}
	}

	if (powerMap.size !== 2) {
		return null;
	}

	const powers = Array.from(powerMap.keys()).sort((a, b) => a - b);
	const lowPower = powers[0];
	const highPower = powers[1];

	if (highPower < 2) {
		return null;
	}

	const B = powerMap.get(lowPower)!;
	const A = powerMap.get(highPower)!;

	if (A.isZero() || B.isZero()) {
		return null;
	}

	const buildVPower = (power: number): MultiPoly => {
		if (power === 0) {
			return MultiPoly.constant(1n);
		}
		const expMap = new Map<number, number>();
		expMap.set(v, power);
		const mp = new MultiPoly();
		mp.terms.set(expToKey(expMap), 1n);
		return mp;
	};

	const aFactors = factorMultivariate(A);
	for (const f of aFactors) {
		if (f.isConstant()) {
			continue;
		}

		const bDivResult = mvExactDiv(B, f);
		if (bDivResult === null) {
			continue;
		}

		const aDivResult = mvExactDiv(A, f);
		if (aDivResult === null) {
			continue;
		}

		const quotient = addPoly(
			mulPoly(aDivResult, buildVPower(highPower)),
			mulPoly(bDivResult, buildVPower(lowPower))
		);

		if (equalPoly(mulPoly(f, quotient), p)) {
			return [f, quotient];
		}
	}

	const bFactors = factorMultivariate(B);
	for (const f of bFactors) {
		if (f.isConstant()) {
			continue;
		}

		const aDivResult = mvExactDiv(A, f);
		if (aDivResult === null) {
			continue;
		}

		const bDivResult = mvExactDiv(B, f);
		if (bDivResult === null) {
			continue;
		}

		const quotient = addPoly(
			mulPoly(aDivResult, buildVPower(highPower)),
			mulPoly(bDivResult, buildVPower(lowPower))
		);

		if (equalPoly(mulPoly(f, quotient), p)) {
			return [f, quotient];
		}
	}

	return null;
}

function tryFactorQuadraticInVar(p: MultiPoly, v: number): [MultiPoly, MultiPoly] | null {
	const { A, B, C } = quadraticCoeffsInVar(p, v);
	if (A.isZero() || A.terms.size === 0) {
		return null;
	}

	// First, try the original simple candidate-based approach
	if (A.terms.size === 1) {
		const [[aKey, aCoeff]] = [...A.terms.entries()];
		const aExp = keyToExp(aKey);

		const candidates: MultiPoly[] = [];
		for (const [bKey, bCoeff] of B.terms) {
			if (aCoeff === 0n) {
				continue;
			}
			if (bCoeff % aCoeff !== 0n) {
				continue;
			}

			const bExp = keyToExp(bKey);
			let ok = true;
			for (const [vv, ee] of aExp) {
				const be = bExp.get(vv) ?? 0;
				if (be < ee) {
					ok = false;
					break;
				}
			}
			if (!ok) {
				continue;
			}

			// quotient monomial exponent = bExp - aExp
			const qExp = new Map(bExp);
			for (const [vv, ee] of aExp) {
				const be = qExp.get(vv) ?? 0;
				const ne = be - ee;
				if (ne === 0) {
					qExp.delete(vv);
				} else {
					qExp.set(vv, ne);
				}
			}

			const q = new MultiPoly();
			q.terms.set(expToKey(qExp), -(bCoeff / aCoeff)); // r = -(term/A)
			q.trim();
			candidates.push(q);
		}

		// If B has no usable terms (e.g. a^2 - b^2), try the special case: B == 0 and -C/A is a perfect-square monomial (with unit coefficient).
		if (candidates.length === 0 && (B.isZero() || B.terms.size === 0) && C.terms.size === 1) {
			const [[cKey, cCoeff]] = [...C.terms.entries()];
			if (aCoeff !== 0n && -cCoeff % aCoeff === 0n) {
				const ratioCoeff = -cCoeff / aCoeff;
				if (ratioCoeff === 1n) {
					const cExp = keyToExp(cKey);
					let ok = true;
					for (const [vv, ee] of aExp) {
						const ce = cExp.get(vv) ?? 0;
						if (ce < ee) {
							ok = false;
							break;
						}
					}
					if (ok) {
						const qExp = new Map(cExp);
						for (const [vv, ee] of aExp) {
							const ce = qExp.get(vv) ?? 0;
							const ne = ce - ee;
							if (ne === 0) {
								qExp.delete(vv);
							} else {
								qExp.set(vv, ne);
							}
						}
						let allEven = true;
						for (const ee of qExp.values()) {
							if (ee % 2 !== 0) {
								allEven = false;
								break;
							}
						}
						if (allEven) {
							const rootExp = new Map<number, number>();
							for (const [vv, ee] of qExp) {
								rootExp.set(vv, ee / 2);
							}
							const r = new MultiPoly();
							r.terms.set(expToKey(rootExp), 1n);
							r.trim();
							candidates.push(r);
							candidates.push(scalePoly(r, -1n));
						}
					}
				}
			}
		}

		for (const r of candidates) {
			// Check root: A*r^2 + B*r + C == 0
			const r2 = mulPoly(r, r);
			const Ar2 = mulPoly(A, r2);
			const Br = mulPoly(B, r);
			const sum = addPoly(addPoly(Ar2, Br), C);
			if (!sum.isZero()) {
				continue;
			}

			// Build factors: (v - r) * (A*v + D), with D = B + A*r
			const D = addPoly(B, mulPoly(A, r));
			const vPoly = MultiPoly.variable(v);
			const f1 = subPoly(vPoly, r);
			const f2 = addPoly(mulPoly(A, vPoly), D);

			// Verify exactness: f1*f2 == p
			const prod = mulPoly(f1, f2);
			const diff = subPoly(prod, p);
			if (diff.isZero()) {
				return [f1, f2];
			}
		}
	}

	// Fall back to discriminant-based approach for more general cases
	// Compute discriminant D = B² - 4AC
	const B2 = mulPoly(B, B);
	const AC = mulPoly(A, C);
	const AC4 = mulPoly(AC, MultiPoly.constant(4n));
	const disc = subPoly(B2, AC4);

	if (disc.isZero()) {
		// Perfect square case: D = 0, double root at r = -B/(2A).
		// This path is intentionally skipped here; the square-root route below is the active implementation.
	}

	// Try to find if disc is a perfect square polynomial
	const sqrtDisc = tryPolynomialSquareRoot(disc);
	if (sqrtDisc !== null) {
		// roots are: (-B ± sqrtDisc) / (2A)
		// For integer polynomials, we need -B + sqrtDisc and -B - sqrtDisc to be divisible by 2A
		const negB = negPoly(B);
		const num1 = addPoly(negB, sqrtDisc);
		const num2 = subPoly(negB, sqrtDisc);
		const twoA = mulPoly(A, MultiPoly.constant(2n));

		// Try to divide num1 by 2A to get root1
		const root1 = mvExactDiv(num1, twoA);
		const root2 = mvExactDiv(num2, twoA);

		// We only need ONE integer root to factor
		// If root1 is integer, factor is (v - root1) * (A*v + B + A*root1)
		// If root2 is integer, factor is (v - root2) * (A*v + B + A*root2)

		for (const root of [root1, root2]) {
			if (root === null) {
				continue;
			}

			const vPoly = MultiPoly.variable(v);
			const f1 = subPoly(vPoly, root);

			// f2 = A*v + (B + A*root)
			const D = addPoly(B, mulPoly(A, root));
			const f2 = addPoly(mulPoly(A, vPoly), D);

			// Verify: f1 * f2 should equal p
			const prod = mulPoly(f1, f2);
			const diff = subPoly(prod, p);
			if (diff.isZero()) {
				return [f1, f2];
			}
		}
	}

	// Quadratic formula didn't give polynomial roots.
	// Try factoring A and searching for factors of form (a*v + b) where a divides A.
	// If p = A*v² + B*v + C and A = a1*a2, we look for:
	//   f1 = a1*v + b1, f2 = a2*v + b2
	// such that f1*f2 = a1*a2*v² + (a1*b2 + a2*b1)*v + b1*b2 = A*v² + B*v + C
	// So: a1*b2 + a2*b1 = B, b1*b2 = C
	{
		const aFactors = decomposeMonomialFactors(factorMultivariate(A));
		if (aFactors.length >= 2) {
			// Try all ways to split A into two factors
			const n = aFactors.length;
			for (let mask = 1; mask < (1 << n) - 1; mask++) {
				let a1 = MultiPoly.constant(1n);
				let a2 = MultiPoly.constant(1n);
				for (let i = 0; i < n; i++) {
					if (mask & (1 << i)) {
						a1 = mulPoly(a1, aFactors[i]);
					} else {
						a2 = mulPoly(a2, aFactors[i]);
					}
				}

				// Now we need to find b1, b2 such that:
				// a1*b2 + a2*b1 = B  ... (1)
				// b1*b2 = C          ... (2)

				// If C = 0, then b1 = 0 or b2 = 0
				if (C.isZero()) {
					// Try b1 = 0: then a1*b2 = B, so b2 = B/a1
					const b2 = mvExactDiv(B, a1);
					if (b2 !== null) {
						const f1 = mulPoly(a1, MultiPoly.variable(v)); // a1*v
						const f2 = addPoly(mulPoly(a2, MultiPoly.variable(v)), b2);
						const prod = mulPoly(f1, f2);
						if (equalPoly(prod, p)) {
							return [f1, f2];
						}
					}
					// Try b2 = 0
					const b1 = mvExactDiv(B, a2);
					if (b1 !== null) {
						const f1 = addPoly(mulPoly(a1, MultiPoly.variable(v)), b1);
						const f2 = mulPoly(a2, MultiPoly.variable(v));
						const prod = mulPoly(f1, f2);
						if (equalPoly(prod, p)) {
							return [f1, f2];
						}
					}
					continue;
				}

				// Factor C and try to match
				// Need to decompose monomials into individual variable powers
				const cFactors = decomposeMonomialFactors(factorMultivariate(C));
				const cLen = cFactors.length;

				// If cLen is too large, limit combinations to avoid exponential blowup
				if (cLen > 12) {
					continue;
				}

				// Try all ways to split C factors into b1 and b2
				for (let cMask = 0; cMask < 1 << cLen; cMask++) {
					let b1 = MultiPoly.constant(1n);
					let b2 = MultiPoly.constant(1n);
					for (let i = 0; i < cLen; i++) {
						if (cMask & (1 << i)) {
							b1 = mulPoly(b1, cFactors[i]);
						} else {
							b2 = mulPoly(b2, cFactors[i]);
						}
					}

					// Check if a1*b2 + a2*b1 = B
					const sum = addPoly(mulPoly(a1, b2), mulPoly(a2, b1));
					if (equalPoly(sum, B)) {
						const vPoly = MultiPoly.variable(v);
						const f1 = addPoly(mulPoly(a1, vPoly), b1);
						const f2 = addPoly(mulPoly(a2, vPoly), b2);
						const prod = mulPoly(f1, f2);
						if (equalPoly(prod, p)) {
							return [f1, f2];
						}
					}

					// Also try with negated b1, b2 combinations
					const negB1 = negPoly(b1);
					const negB2 = negPoly(b2);

					for (const [bb1, bb2] of [
						[b1, negB2],
						[negB1, b2],
						[negB1, negB2],
					] as [MultiPoly, MultiPoly][]) {
						const checkSum = addPoly(mulPoly(a1, bb2), mulPoly(a2, bb1));
						if (equalPoly(checkSum, B)) {
							const vPoly = MultiPoly.variable(v);
							const ff1 = addPoly(mulPoly(a1, vPoly), bb1);
							const ff2 = addPoly(mulPoly(a2, vPoly), bb2);
							const prodCheck = mulPoly(ff1, ff2);
							if (equalPoly(prodCheck, p)) {
								return [ff1, ff2];
							}
						}
					}
				}

				// Special case: try b1 = ±1, b2 = ±C (even if C doesn't factor)
				// This handles cases like (ax - 1)(ax^3 + ...)
				for (const b1Sign of [1n, -1n]) {
					const b1 = MultiPoly.constant(b1Sign);
					const b2 = b1Sign === 1n ? C : negPoly(C);

					// Check if a1*b2 + a2*b1 = B
					const sum = addPoly(mulPoly(a1, b2), mulPoly(a2, b1));
					if (equalPoly(sum, B)) {
						const vPoly = MultiPoly.variable(v);
						const f1 = addPoly(mulPoly(a1, vPoly), b1);
						const f2 = addPoly(mulPoly(a2, vPoly), b2);
						const prod = mulPoly(f1, f2);
						if (equalPoly(prod, p)) {
							return [f1, f2];
						}
					}

					// Also try swapping: b1 = ±C, b2 = ±1
					const b1Swap = b1Sign === 1n ? C : negPoly(C);
					const b2Swap = MultiPoly.constant(b1Sign);

					const sumSwap = addPoly(mulPoly(a1, b2Swap), mulPoly(a2, b1Swap));
					if (equalPoly(sumSwap, B)) {
						const vPoly = MultiPoly.variable(v);
						const f1 = addPoly(mulPoly(a1, vPoly), b1Swap);
						const f2 = addPoly(mulPoly(a2, vPoly), b2Swap);
						const prod = mulPoly(f1, f2);
						if (equalPoly(prod, p)) {
							return [f1, f2];
						}
					}
				}
			}
		}
	}

	return null;
}

/**
 * Decompose monomial factors into individual variable powers.
 * E.g., [x^4, y^2] becomes [x, x, x, x, y, y]
 */
function decomposeMonomialFactors(factors: MultiPoly[]): MultiPoly[] {
	const result: MultiPoly[] = [];
	for (const f of factors) {
		if (f.terms.size === 1) {
			// It's a monomial - decompose it
			const entry = f.terms.entries().next();
			if (entry.done) {
				continue;
			}
			const [key, coeff] = entry.value;
			const exp = keyToExp(key);

			// Handle coefficient if it's not ±1
			if (coeff !== 1n && coeff !== -1n) {
				result.push(MultiPoly.constant(coeff));
			}

			// Add individual variable powers
			for (const [varIdx, power] of exp) {
				for (let i = 0; i < power; i++) {
					result.push(MultiPoly.variable(varIdx));
				}
			}
		} else {
			// Not a monomial - keep as is
			result.push(f);
		}
	}
	return result;
}

function tryPolynomialSquareRoot(p: MultiPoly): MultiPoly | null {
	if (p.isZero()) {
		return MultiPoly.zero();
	}
	if (p.isConstant()) {
		const c = p.constantTerm();
		const sqrt = intNthRootExact(c, 2);
		return sqrt !== null ? MultiPoly.constant(sqrt) : null;
	}

	// Get all terms sorted by total degree descending
	const terms: Array<{
		key: string;
		exp: Map<number, number>;
		coeff: bigint;
		totalDeg: number;
	}> = [];
	for (const [key, coeff] of p.terms) {
		const exp = keyToExp(key);
		let totalDeg = 0;
		for (const e of exp.values()) {
			totalDeg += e;
		}
		terms.push({ key, exp, coeff, totalDeg });
	}
	terms.sort((a, b) => b.totalDeg - a.totalDeg);

	// Leading term must have even exponents and perfect square coefficient
	const lead = terms[0];
	const leadSqrt = intNthRootExact(lead.coeff, 2);
	if (leadSqrt === null) {
		return null;
	}

	for (const [, e] of lead.exp) {
		if (e % 2 !== 0) {
			return null;
		}
	}

	// Build sqrt of leading term
	const sqrtLeadExp = new Map<number, number>();
	for (const [v, e] of lead.exp) {
		sqrtLeadExp.set(v, e / 2);
	}

	// Initialize sqrt polynomial with leading term
	const sqrtP = new MultiPoly();
	sqrtP.terms.set(expToKey(sqrtLeadExp), leadSqrt);

	// Use Hensel-style lifting to find remaining terms
	// This is a heuristic approach: try to build sqrt term by term
	let remaining = subPoly(p, mulPoly(sqrtP, sqrtP));

	const maxIterations = terms.length * 2;
	for (let iter = 0; iter < maxIterations && !remaining.isZero(); iter++) {
		// Find leading term of remaining
		let maxDeg = -1;
		let maxKey = '';
		let maxCoeff = 0n;

		for (const [key, coeff] of remaining.terms) {
			const exp = keyToExp(key);
			let deg = 0;
			for (const e of exp.values()) {
				deg += e;
			}
			if (deg > maxDeg) {
				maxDeg = deg;
				maxKey = key;
				maxCoeff = coeff;
			}
		}

		if (maxDeg < 0) {
			break;
		} // No more terms

		// The next term in sqrt should satisfy: 2 * leadSqrt * newTerm = maxCoeff * monomial
		// newTerm = maxCoeff / (2 * leadSqrt) * monomial with adjusted exponents
		if (2n * leadSqrt === 0n) {
			return null;
		}
		if (maxCoeff % (2n * leadSqrt) !== 0n) {
			return null;
		}

		const newCoeff = maxCoeff / (2n * leadSqrt);

		// New term exponents = maxExp - sqrtLeadExp
		const maxExp = keyToExp(maxKey);
		const newExp = new Map<number, number>();
		for (const [v, e] of maxExp) {
			const le = sqrtLeadExp.get(v) ?? 0;
			if (e < le) {
				return null;
			} // Can't have negative exponents
			const ne = e - le;
			if (ne > 0) {
				newExp.set(v, ne);
			}
		}

		sqrtP.terms.set(expToKey(newExp), newCoeff);
		remaining = subPoly(p, mulPoly(sqrtP, sqrtP));
	}

	if (remaining.isZero()) {
		return sqrtP;
	}

	return null;
}

/**
 * Try to recognize a binomial power: (α*m1 + β*m2)^n where m1,m2 are monomials.
 * Returns the base polynomial repeated n times, or null.
 *
 * This is designed to catch cases like (a^2 + b^2)^3.
 */
function tryBinomialPower(f: MultiPoly): { base: MultiPoly; n: number } | null {
	const termCount = f.terms.size;
	if (termCount < 3) {
		return null;
	}

	// Candidate n from termCount: binomial expansion has exactly n+1 terms (if no cancellation).
	const n = termCount - 1;
	if (n < 2) {
		return null;
	}

	// Collect terms with exponent maps.
	type Term = { key: string; exp: Exponents; coeff: bigint };
	const terms: Term[] = [];
	let maxVar = -1;
	for (const [key, coeff] of f.terms) {
		const exp = keyToExp(key);
		for (const [vi] of exp) {
			if (vi > maxVar) {
				maxVar = vi;
			}
		}
		terms.push({ key, exp, coeff });
	}
	const len = Math.max(1, maxVar + 1);

	// Define an ordering to pick "smallest" and "largest" exponent vectors deterministically.
	function expToDense(e: Exponents): number[] {
		const arr = new Array<number>(len).fill(0);
		for (const [i, v] of e) {
			arr[i] = v;
		}
		return arr;
	}
	function cmpExp(a: number[], b: number[]): number {
		for (let i = 0; i < a.length; i++) {
			if (a[i] !== b[i]) {
				return a[i] - b[i];
			}
		}
		return 0;
	}

	const dense = terms.map(t => ({ ...t, dense: expToDense(t.exp) }));
	dense.sort((p, q) => cmpExp(p.dense, q.dense));
	const t0 = dense[0];
	const tn = dense[dense.length - 1];

	// Endpoints must be divisible by n (since they are (β*m2)^n and (α*m1)^n).
	function divisibleByN(arr: number[]): boolean {
		for (const v of arr) {
			if (v % n !== 0) {
				return false;
			}
		}
		return true;
	}
	if (!divisibleByN(t0.dense) || !divisibleByN(tn.dense)) {
		return null;
	}

	const v = t0.dense.map(e => e / n); // monomial m2 exponents
	const u = tn.dense.map(e => e / n); // monomial m1 exponents
	const step = u.map((ui, i) => ui - v[i]);

	// Build expected exponents for i=0..n and map them to coefficients
	const expected = new Map<string, bigint>();
	for (let i = 0; i <= n; i++) {
		const ei = v.map((vi, k) => n * vi + i * step[k]);
		const expMap: Exponents = new Map();
		for (let k = 0; k < ei.length; k++) {
			if (ei[k] !== 0) {
				expMap.set(k, ei[k]);
			}
		}
		expected.set(expToKey(expMap), 0n);
	}

	// f must have exactly these terms (no extras)
	for (const t of terms) {
		if (!expected.has(t.key)) {
			return null;
		}
		expected.set(t.key, t.coeff);
	}
	for (const [, c] of expected) {
		if (c === 0n) {
			return null;
		} // missing a required term
	}

	// Determine α and β from endpoint coefficients (must be exact nth powers)
	const beta = intNthRootExact(t0.coeff, n);
	const alpha = intNthRootExact(tn.coeff, n);
	if (alpha === null || beta === null) {
		return null;
	}

	// Verify all coefficients match binomial(n,i)*alpha^i*beta^(n-i)
	function binom(n_: number, k_: number): bigint {
		let k = k_;
		if (k < 0 || k > n_) {
			return 0n;
		}
		k = Math.min(k, n_ - k);
		let num = 1n;
		let den = 1n;
		for (let i = 1; i <= k; i++) {
			num *= BigInt(n_ - (k - i));
			den *= BigInt(i);
		}
		return num / den;
	}

	for (let i = 0; i <= n; i++) {
		const expKey = (() => {
			const ei = v.map((vi, k) => n * vi + i * step[k]);
			const expMap: Exponents = new Map();
			for (let k = 0; k < ei.length; k++) {
				if (ei[k] !== 0) {
					expMap.set(k, ei[k]);
				}
			}
			return expToKey(expMap);
		})();
		const ci = expected.get(expKey)!;
		const should = binom(n, i) * powN(alpha, i) * powN(beta, n - i);
		if (ci !== should) {
			return null;
		}
	}

	const m1 = MultiPoly.monomial(alpha, u);
	const m2 = MultiPoly.monomial(beta, v);
	const base = addPoly(m1, m2);
	return { base, n };
}

/**
 * Try to factor a univariate polynomial using the rational root theorem.
 * Returns array of factors if successful, or [p] if no factorization found.
 */
function tryRationalRootFactorization(p: MultiPoly, varIndex: number): MultiPoly[] {
	const deg = p.degree(varIndex);
	if (deg <= 1) {
		return [p];
	}

	// Get coefficients
	const coeffs: bigint[] = new Array(deg + 1).fill(0n);
	for (const [key, coeff] of p.terms) {
		const exp = keyToExp(key);
		const d = exp.get(varIndex) ?? 0;
		coeffs[d] = coeff;
	}

	// Rational root theorem: possible roots are ±(divisors of constant term)/(divisors of leading coeff)
	const constTerm = coeffs[0];
	const leadCoeff = coeffs[deg];

	if (constTerm === 0n) {
		// x is a factor
		const xPoly = MultiPoly.variable(varIndex);
		const [quot, rem] = pseudoDivide(p, xPoly, varIndex);
		if (rem.isZero()) {
			const quotFactors = tryRationalRootFactorization(quot, varIndex);
			return [xPoly, ...quotFactors];
		}
	}

	// Get divisors of |constTerm| and |leadCoeff|
	const constDivisors = getDivisors(constTerm < 0n ? -constTerm : constTerm);
	const leadDivisors = getDivisors(leadCoeff < 0n ? -leadCoeff : leadCoeff);

	// Try all possible rational roots p/q
	for (const p_val of constDivisors) {
		for (const q_val of leadDivisors) {
			// Try +p/q and -p/q
			for (const sign of [1n, -1n]) {
				const numer = sign * p_val;
				// Check if numer/q_val is a root: evaluate polynomial at x = numer/q_val
				// To avoid fractions, compute q^deg * f(numer/q) which equals:
				// sum_{i=0}^{deg} coeffs[i] * numer^i * q^(deg-i)
				let evalResult = 0n;
				const powers: bigint[] = [1n];
				for (let i = 1; i <= deg; i++) {
					powers.push(powers[i - 1] * numer);
				}
				for (let i = 0; i <= deg; i++) {
					const qExp = deg - i;
					let qp = 1n;
					for (let j = 0; j < qExp; j++) {
						qp *= q_val;
					}
					evalResult += coeffs[i] * powers[i] * qp;
				}

				if (evalResult === 0n) {
					// Found a root! Build factor (q*x - numer) = q*x - p*sign
					// Actually the factor is (x - numer/q_val), but we want integer coefficients
					// So factor is (q_val * x - numer)
					const factor = addPoly(
						mulPoly(MultiPoly.constant(q_val), MultiPoly.variable(varIndex)),
						MultiPoly.constant(-numer)
					);

					// Divide p by factor
					const [quot, rem] = pseudoDivide(p, factor, varIndex);
					if (rem.isZero()) {
						// Make quot primitive
						const [_, primQuot] = makePrimitiveZ(quot);
						const quotFactors = tryRationalRootFactorization(primQuot, varIndex);
						return [factor, ...quotFactors];
					}
				}
			}
		}
	}

	return [p];
}

// NOTE: getDivisors/bigIntSqrt live in core.ts (shared number theory helpers).

/**
 * Fast-path: extract a monomial gcd factor across all terms (e.g. x^2*y + x^2 => x^2*(y+1)).
 * Returns a factor list (already recursively factored) or null if not applicable.
 */
function tryFactorMonomialGcdFast(p: MultiPoly): MultiPoly[] | null {
	const mg = monomialGCD(p);
	if (isOnePoly(mg)) {
		return null;
	}
	const q = mvExactDivByMonomial(p, mg);
	if (!q) {
		return null;
	}
	return [mg, ...factorMultivariate(q)];
}

/** Fast-path: detect if p is a perfect square polynomial and return duplicated factors. */
function tryFactorPerfectSquareFast(p: MultiPoly): MultiPoly[] | null {
	// Avoid trivial recursion
	if (p.isZero() || p.isConstant()) {
		return null;
	}
	const sqrt = tryPolynomialSquareRoot(p);
	if (sqrt === null) {
		return null;
	}
	// Verify exact square
	if (!equalPoly(mulPoly(sqrt, sqrt), p)) {
		return null;
	}
	// Fully factor the square root, then duplicate factors
	const fs = factorMultivariate(sqrt);
	return [...fs, ...fs];
}

/**
 * Fast-path: detect binomial perfect powers like (a^2 + b^2)^3.
 * Returns fully expanded factors (base factors repeated n times) or null.
 */

function buildLinearInTwoVars(pX: bigint, pY: bigint, xVar: number, yVar: number): MultiPoly {
	const out = new MultiPoly();
	if (pX !== 0n) {
		out.terms.set(expToKey(new Map([[xVar, 1]])), pX);
	}
	if (pY !== 0n) {
		out.terms.set(
			expToKey(new Map([[yVar, 1]])),
			(out.terms.get(expToKey(new Map([[yVar, 1]]))) ?? 0n) + pY
		);
	}
	out.trim();
	return out;
}

function tryFactorHomogeneousQuadratic2VarsFast(p: MultiPoly): MultiPoly[] | null {
	const vars = mvVariablesSorted(p);
	if (vars.length !== 2) {
		return null;
	}
	const [xVar, yVar] = vars;

	// Require only terms x^2, x*y, y^2 (homogeneous degree 2 in these vars).
	let a = 0n,
		b = 0n,
		c = 0n;
	for (const [key, coeff] of p.terms) {
		const exp = keyToExp(key);
		const ex = exp.get(xVar) ?? 0;
		const ey = exp.get(yVar) ?? 0;
		// no other vars
		exp.delete(xVar);
		exp.delete(yVar);
		if (exp.size !== 0) {
			return null;
		}
		if (ex + ey !== 2) {
			return null;
		}
		if (ex === 2 && ey === 0) {
			a += coeff;
		} else if (ex === 1 && ey === 1) {
			b += coeff;
		} else if (ex === 0 && ey === 2) {
			c += coeff;
		} else {
			return null;
		}
	}
	if (a === 0n || c === 0n) {
		return null;
	}

	const divA = getDivisors(abs(a));
	const divC = getDivisors(abs(c));

	function withSigns(d: bigint): bigint[] {
		if (d === 0n) {
			return [0n];
		}
		return d === 0n ? [0n] : [d, -d];
	}

	for (const pAbs of divA) {
		for (const pX of withSigns(pAbs)) {
			if (pX === 0n) {
				continue;
			}
			if (a % pX !== 0n) {
				continue;
			}
			const rX = a / pX;

			for (const qAbs of divC) {
				for (const pY of withSigns(qAbs)) {
					if (pY === 0n) {
						continue;
					}
					if (c % pY !== 0n) {
						continue;
					}
					const rY = c / pY;

					if (pX * rY + pY * rX !== b) {
						continue;
					}

					const f1 = buildLinearInTwoVars(pX, pY, xVar, yVar);
					const f2 = buildLinearInTwoVars(rX, rY, xVar, yVar);

					if (f1.isConstant() || f2.isConstant()) {
						continue;
					}
					if (equalPoly(mulPoly(f1, f2), p)) {
						return [f1, f2];
					}
				}
			}
		}
	}

	return null;
}

function tryFactorPolynomialInMonomialFast(p: MultiPoly): MultiPoly[] | null {
	const vars = mvVariablesSorted(p);
	if (vars.length < 2) {
		return null;
	}

	// Choose base exponent vector from the minimal positive exponents across non-constant terms.
	let base: Map<number, number> | null = null;
	for (const key of p.terms.keys()) {
		const exp = keyToExp(key);
		if (exp.size === 0) {
			continue;
		}
		if (base === null) {
			base = new Map(exp);
			continue;
		}
		for (const [v, e] of base) {
			const ee = exp.get(v) ?? 0;
			if (ee === 0) {
				base.delete(v);
				continue;
			}
			base.set(v, Math.min(e, ee));
		}
	}
	if (!base || base.size < 2) {
		return null;
	}
	for (const e of base.values()) {
		if (e <= 0) {
			return null;
		}
	}

	let maxK = 0;
	const coeffs: ZPoly = [];

	for (const [key, coeff] of p.terms) {
		const exp = keyToExp(key);
		// constant term
		if (exp.size === 0) {
			coeffs[0] = (coeffs[0] ?? 0n) + coeff;
			continue;
		}

		// Determine k from first base var.
		let k: number | null = null;
		for (const [v, be] of base) {
			const ee = exp.get(v) ?? 0;
			if (ee % be !== 0) {
				return null;
			}
			const kk = ee / be;
			if (k === null) {
				k = kk;
			} else if (k !== kk) {
				return null;
			}
		}

		// No extra variables allowed.
		for (const [v, ee] of exp) {
			const be = base.get(v);
			if (be === undefined) {
				if (ee !== 0) {
					return null;
				}
			} else {
				// already checked proportionality
			}
		}

		if (k === null) {
			return null;
		}
		maxK = Math.max(maxK, k);
		coeffs[k] = (coeffs[k] ?? 0n) + coeff;
	}

	if (maxK < 2) {
		return null;
	}

	// Factor univariate in t
	const fr = factorPolynomialBig(coeffs);
	if ((fr.factors?.length ?? 0) === 0) {
		return null;
	}

	// Build monomial m
	const mPoly = new MultiPoly();
	mPoly.terms.set(expToKey(base), 1n);
	mPoly.trim();

	function powMV(basePoly: MultiPoly, e: number): MultiPoly {
		let r = MultiPoly.constant(1n);
		let b = basePoly;
		let k = e;
		while (k > 0) {
			if (k & 1) {
				r = mulPoly(r, b);
			}
			k >>= 1;
			if (k) {
				b = mulPoly(b, b);
			}
		}
		return r;
	}

	function fromTPolyToMV(g: ZPoly): MultiPoly {
		let acc = MultiPoly.zero();
		for (let i = 0; i < g.length; i++) {
			const c = g[i] ?? 0n;
			if (c === 0n) {
				continue;
			}
			const term = mulPoly(MultiPoly.constant(c), powMV(mPoly, i));
			acc = addPoly(acc, term);
		}
		acc.trim();
		return acc;
	}

	const out: MultiPoly[] = [];
	if (fr.content !== 1n && fr.content !== -1n) {
		out.push(MultiPoly.constant(fr.content));
	} else if (fr.content === -1n) {
		out.push(MultiPoly.constant(-1n));
	}

	for (const f of fr.factors) {
		for (let i = 0; i < (f.multiplicity ?? 1); i++) {
			out.push(fromTPolyToMV(f.coefficients));
		}
	}

	return out.length >= 2 ? out : null;
}

function tryFactorEvenQuarticInVar(p: MultiPoly, v: number): [MultiPoly, MultiPoly] | null {
	// Only handle monic v^4 + A2*v^2 + A0 (no odd powers)
	let A4: MultiPoly | null = null;
	const A2 = new MultiPoly();
	const A0 = new MultiPoly();

	for (const [key, coeff] of p.terms) {
		const exp = keyToExp(key);
		const e = exp.get(v) ?? 0;
		if (e === 1 || e === 3) {
			return null;
		}
		if (e !== 0 && e !== 2 && e !== 4) {
			return null;
		}
		exp.delete(v);
		const k = expToKey(exp);

		if (e === 4) {
			if (A4 === null) {
				A4 = new MultiPoly();
			}
			A4.terms.set(k, (A4.terms.get(k) ?? 0n) + coeff);
		} else if (e === 2) {
			A2.terms.set(k, (A2.terms.get(k) ?? 0n) + coeff);
		} else {
			A0.terms.set(k, (A0.terms.get(k) ?? 0n) + coeff);
		}
	}

	if (A4 === null) {
		return null;
	}
	A4.trim();
	A2.trim();
	A0.trim();

	// Require A4 == 1
	if (!(A4.isConstant() && A4.constantTerm() === 1n)) {
		return null;
	}

	// Need v = sqrt(A0)
	const v0 = tryPolynomialSquareRoot(A0);
	if (v0 === null) {
		return null;
	}

	// u^2 = 2*v0 - A2
	const u2 = subPoly(mulPoly(v0, MultiPoly.constant(2n)), A2);
	const u = tryPolynomialSquareRoot(u2);
	if (u === null) {
		return null;
	}

	const vPoly = MultiPoly.variable(v);
	const v2 = mulPoly(vPoly, vPoly);

	const fPlus = addPoly(addPoly(v2, mulPoly(u, vPoly)), v0);
	const fMinus = addPoly(addPoly(v2, mulPoly(scalePoly(u, -1n), vPoly)), v0);

	if (equalPoly(mulPoly(fPlus, fMinus), p)) {
		return [fPlus, fMinus];
	}
	return null;
}

function tryFactorBinomialPowerFast(p: MultiPoly): MultiPoly[] | null {
	const prim = makePrimitiveZ(p)[1];
	const pow = tryBinomialPower(prim);
	if (!pow) {
		return null;
	}
	const { base, n } = pow;
	const baseFacts = factorMultivariate(base);
	const out: MultiPoly[] = [];
	for (let i = 0; i < n; i++) {
		out.push(...baseFacts);
	}
	return out;
}

/**
 * Fast-path: special bivariate patterns like x^n ± y^n.
 * Returns recursively factored factors or null.
 */
function tryFactorSpecialBivariatePatternsFast(p: MultiPoly): MultiPoly[] | null {
	const vars = mvVariablesSorted(p);
	if (vars.length !== 2) {
		return null;
	}

	// Only check for patterns if the degrees are > 1 (to avoid infinite recursion on linear factors).
	const deg0 = p.degree(vars[0]);
	const deg1 = p.degree(vars[1]);
	if (!(deg0 > 1 && deg1 > 1)) {
		return null;
	}

	const special = trySpecialBivariatePatterns(p, vars[0], vars[1]);
	if (!special || special.length < 2) {
		return null;
	}

	const out: MultiPoly[] = [];
	for (const f of special) {
		out.push(...factorMultivariate(f));
	}
	return out;
}

/**
 * Fast-path: factor as polynomial in a single variable of degree 1 or 2.
 * Includes content extraction, linear/quadratic-in-var splits, and simple binomial-in-var splits.
 */
function tryFactorSmallDegreeInVarFast(p: MultiPoly): MultiPoly[] | null {
	const vars = mvVariablesSorted(p);

	// First try to extract content with respect to each variable.
	// Only accept if it leads to a proper factorization.
	for (const v of vars) {
		const cont = mvContentInVar(p, v);
		if (!cont.isConstant() || cont.constantTerm() !== 1n) {
			const pp = primitivePart(p, v);
			if (!equalPoly(pp, p) && !pp.isConstant()) {
				if (factorsReconstruct(p, [cont, pp])) {
					const contFactors = factorMultivariate(cont);
					const ppFactors = factorMultivariate(pp);
					if (contFactors.length + ppFactors.length >= 2) {
						return [...contFactors, ...ppFactors];
					}
				}
			}
		}
	}

	// Linear factorization (polynomials linear in some variable).
	for (const v of vars) {
		const deg = p.degree(v);
		if (deg === 1) {
			const fact = tryFactorLinearInVar(p, v);
			if (fact) {
				const out: MultiPoly[] = [];
				for (const f of fact) {
					out.push(...factorMultivariate(f));
				}
				return out;
			}
		}
	}

	// Binomial factorization: p = A*v^k + B where A,B share a common factor.
	for (const v of vars) {
		const fact = tryFactorBinomialInVar(p, v);
		if (fact) {
			const out: MultiPoly[] = [];
			for (const f of fact) {
				out.push(...factorMultivariate(f));
			}
			return out;
		}
	}

	// Quadratic factorization.
	for (const v of vars) {
		const deg = p.degree(v);
		if (deg === 2) {
			const fact = tryFactorQuadraticInVar(p, v);
			if (fact) {
				const out: MultiPoly[] = [];
				for (const f of fact) {
					out.push(...factorMultivariate(f));
				}
				return out;
			}
		}
	}

	// Even-quartic factorization (degree 4 with only even powers in some variable).
	for (const v of vars) {
		const deg = p.degree(v);
		if (deg === 4) {
			const fact = tryFactorEvenQuarticInVar(p, v);
			if (fact) {
				const out: MultiPoly[] = [];
				for (const f of fact) {
					out.push(...factorMultivariate(f));
				}
				return out;
			}
		}
	}

	return null;
}

/**
 * EEZ/Wang step: extract a monic linear factor in y by parameter specialization (fast path).
 * Returns [factor, ...factors(quotient)] or null.
 *
 * Note: this is intentionally kept as a single helper to keep factorMultivariate readable.
 */
function tryFactorEEZWangMonicLinearFast(p: MultiPoly): MultiPoly[] | null {
	function varsPresent(poly: MultiPoly): number[] {
		return mvVariablesSorted(poly);
	}

	function isMonicLinearInVar(f: MultiPoly, varIndex: number): { ok: boolean; rest?: MultiPoly } {
		if (f.degree(varIndex) !== 1) {
			return { ok: false };
		}

		let q: MultiPoly | null = null;
		const r = new MultiPoly();

		for (const [key, coeff] of f.terms) {
			const exp = keyToExp(key);
			const e = exp.get(varIndex) ?? 0;
			if (e === 0) {
				r.terms.set(key, coeff);
				continue;
			}
			if (e !== 1) {
				return { ok: false };
			}

			exp.delete(varIndex);
			const k = expToKey(exp);
			if (q === null) {
				q = new MultiPoly();
			}
			q.terms.set(k, (q.terms.get(k) ?? 0n) + coeff);
		}

		if (q === null) {
			return { ok: false };
		}
		q.trim();
		r.trim();

		if (!(q.isConstant() && q.constantTerm() === 1n)) {
			return { ok: false };
		}
		return { ok: true, rest: r };
	}

	const ratZ = (z: bigint): Rat => rat(z);
	const toInt = (r: Rat): bigint | null => ratToInt(r);

	function solveDeg2(xs: bigint[], ys: bigint[]): [bigint, bigint, bigint] | null {
		// Solve for c0 + c1*x + c2*x^2 = y using 3 points via Gaussian elimination over rationals.
		const [x0, x1, x2] = xs;
		const [y0, y1, y2] = ys;

		const A: Rat[][] = [
			[ratZ(1n), ratZ(x0), ratZ(x0 * x0), ratZ(y0)],
			[ratZ(1n), ratZ(x1), ratZ(x1 * x1), ratZ(y1)],
			[ratZ(1n), ratZ(x2), ratZ(x2 * x2), ratZ(y2)],
		];

		for (let col = 0; col < 3; col++) {
			let pivot = col;
			for (let r = col; r < 3; r++) {
				if (A[r][col].n !== 0n) {
					pivot = r;
					break;
				}
			}
			if (A[pivot][col].n === 0n) {
				return null;
			}
			if (pivot !== col) {
				const tmp = A[col];
				A[col] = A[pivot];
				A[pivot] = tmp;
			}

			const inv = A[col][col];
			for (let c = col; c < 4; c++) {
				A[col][c] = ratDiv(A[col][c], inv);
			}

			for (let r = 0; r < 3; r++) {
				if (r === col) {
					continue;
				}
				const factor = A[r][col];
				if (factor.n === 0n) {
					continue;
				}
				for (let c = col; c < 4; c++) {
					A[r][c] = ratSub(A[r][c], ratMul(factor, A[col][c]));
				}
			}
		}

		const c0 = toInt(A[0][3]);
		const c1 = toInt(A[1][3]);
		const c2 = toInt(A[2][3]);
		if (c0 === null || c1 === null || c2 === null) {
			return null;
		}
		return [c0, c1, c2];
	}

	function tryEEZMonicLinearFactorInY(
		poly: MultiPoly,
		mainVar: number,
		evalVar: number
	): MultiPoly | null {
		const present = varsPresent(poly);
		if (!present.includes(mainVar) || !present.includes(evalVar)) {
			return null;
		}

		const params = present.filter(v => v !== mainVar && v !== evalVar);
		if (params.length === 0) {
			return null;
		}

		const degY = poly.degree(evalVar);
		if (degY < 1 || degY > 3) {
			return null;
		}

		const vary = params[0];
		const fixed = params.slice(1);

		const varyVals: bigint[] = [1n, 2n, 3n];
		const fixedVals = new Map<number, bigint>();
		for (let i = 0; i < fixed.length; i++) {
			fixedVals.set(fixed[i], BigInt(i + 1));
		}

		// xExp -> coefficient values at varyVals
		const obs = new Map<number, bigint[]>();

		for (let idx = 0; idx < varyVals.length; idx++) {
			let sp = poly;
			for (const [v, val] of fixedVals) {
				sp = substituteVarIndex(sp, v, val);
			}
			sp = substituteVarIndex(sp, vary, varyVals[idx]);

			// Factor the specialized (x,y) polynomial. This will use the existing bivariate path.
			const fs = filterUnitConstants(factorMultivariate(sp));

			let chosenRest: MultiPoly | null = null;
			for (const f of fs) {
				const chk = isMonicLinearInVar(f, evalVar);
				if (chk.ok && chk.rest) {
					chosenRest = chk.rest;
					break;
				}
			}
			if (chosenRest === null) {
				return null;
			}

			for (const [key, coeff] of chosenRest.terms) {
				const exp = keyToExp(key);
				const yExp = exp.get(evalVar) ?? 0;
				if (yExp !== 0) {
					return null;
				}
				const xExp = exp.get(mainVar) ?? 0;

				let arr = obs.get(xExp);
				if (!arr) {
					arr = Array(varyVals.length).fill(0n);
					obs.set(xExp, arr);
				}
				arr[idx] = coeff;
			}
		}

		// Build rest R(x, vary) and then factor = y + R
		const rest = new MultiPoly();
		for (const [xExp, values] of obs) {
			const coeffs = solveDeg2(varyVals, values);
			if (coeffs === null) {
				return null;
			}
			const [c0, c1, c2] = coeffs;

			const addTerm = (pow: number, cc: bigint) => {
				if (cc === 0n) {
					return;
				}
				const exp = new Map<number, number>();
				if (xExp !== 0) {
					exp.set(mainVar, xExp);
				}
				if (pow !== 0) {
					exp.set(vary, pow);
				}
				const k = expToKey(exp);
				rest.terms.set(k, (rest.terms.get(k) ?? 0n) + cc);
			};

			addTerm(0, c0);
			addTerm(1, c1);
			addTerm(2, c2);
		}
		rest.trim();

		const factor = new MultiPoly();
		factor.terms.set(expToKey(new Map([[evalVar, 1]])), 1n); // y
		for (const [k, c] of rest.terms) {
			factor.terms.set(k, (factor.terms.get(k) ?? 0n) + c);
		}
		factor.trim();

		const div = mvExactDiv(poly, factor);
		if (!div) {
			return null;
		}
		return factor;
	}

	// Try EEZ with actual variables present
	const allVars = varsPresent(p);
	if (allVars.length >= 2) {
		// Choose first two variables as main and eval
		const eezMainVar = allVars[0];
		const eezEvalVar = allVars[1];
		const eezFactor = tryEEZMonicLinearFactorInY(p, eezMainVar, eezEvalVar);
		if (eezFactor !== null) {
			const q = mvExactDiv(p, eezFactor);
			if (q) {
				const restFactors = factorMultivariate(q);
				return [eezFactor, ...restFactors];
			}
		}
	}
	return null;
}

type FactorBudgetStats = {
	stage:
		| 'find-generic-eval-point'
		| 'collect-stable-factor-sets'
		| 'interpolation'
		| 'verification'
		| 'unknown';
	vars: string[];
	mainVar: string;
	evalVar: string;
	maxAttempts?: number;
	attemptsUsed?: number;
	maxSets?: number;
	pointsTried?: number;
	factorSetsFound?: number;
	stableSetsFound?: number;
	numPointsNeeded?: number;
};

function factorMultivariate(p: MultiPoly): MultiPoly[] {
	if (p.isZero()) {
		return [];
	}
	if (p.isConstant()) {
		// Don't include ±1 in factor list
		const c = p.constantTerm();
		if (c === 1n || c === -1n) {
			return [];
		}
		return [p];
	}

	// ---- Phase 0: cheap structural fast paths ----
	const fast =
		tryFactorMonomialGcdFast(p) ??
		tryFactorPerfectSquareFast(p) ??
		tryFactorPolynomialInMonomialFast(p) ??
		tryFactorBinomialPowerFast(p) ??
		tryFactorHomogeneousQuadratic2VarsFast(p) ??
		tryFactorSpecialBivariatePatternsFast(p) ??
		tryFactorSmallDegreeInVarFast(p) ??
		tryFactorEEZWangMonicLinearFast(p);

	if (fast) {
		return fast;
	}

	// ---- Phase 1: preprocessing + univariate special case ----
	// 1. Pre-processing: (content is currently not used; keep computation for correctness hooks)

	const workingPoly = scalePoly(p, 1n); // Simplified: assumes primitive for now

	const vars = Array.from(workingPoly.variables()).sort();
	if (vars.length === 1) {
		return factorUnivariateMultiPoly(workingPoly, vars[0]);
	}

	function evalBudgetForMV(
		poly: MultiPoly,
		evalVar: number
	): { maxAttempts: number; maxSetsMultiplier: number } {
		// Adaptive deterministic budgets to avoid hangs while not giving up too early.
		const d = Math.max(0, poly.degree(evalVar));
		let maxAbs = 0n;
		for (const c of poly.terms.values()) {
			const a = c < 0n ? -c : c;
			if (a > maxAbs) {
				maxAbs = a;
			}
		}
		const bits = bigintBitLength(maxAbs);
		let maxAttempts = 20 + Math.ceil(d / 2) + Math.ceil(bits / 128);
		let maxSetsMultiplier = 10 + Math.ceil(d / 3) + Math.ceil(bits / 256);
		if (maxAttempts < 20) {
			maxAttempts = 20;
		}
		if (maxAttempts > 200) {
			maxAttempts = 200;
		}
		if (maxSetsMultiplier < 10) {
			maxSetsMultiplier = 10;
		}
		if (maxSetsMultiplier > 80) {
			maxSetsMultiplier = 80;
		}
		return { maxAttempts, maxSetsMultiplier };
	}
	// ---- Phase 2: bivariate/multivariate split via evaluation + interpolation ----
	const mainVar = vars[0];
	const evalVar = vars.length > 1 ? vars[1] : vars[0];

	const lcMultivariate = workingPoly.leadingCoeff(mainVar);

	const budgets = evalBudgetForMV(workingPoly, evalVar);
	const stats = undefined;

	const evalPoint = findGenericEvalPoint({
		workingPoly,
		mainVar,
		evalVar,
		lcMultivariate,
		maxAttempts: budgets.maxAttempts,
		stats,
	});

	if (evalPoint === null) {
		return [workingPoly];
	}

	const fingerprint = (poly: MultiPoly): string => fingerprintUnivariateInVar(poly, mainVar);

	const reconstruction = collectStableFactorSetsMajority({
		workingPoly,
		mainVar,
		evalVar,
		evalPoint,
		lcMultivariate,
		maxSetsMultiplier: budgets.maxSetsMultiplier,
		fingerprint,
		stats,
	});

	if (!reconstruction) {
		return [workingPoly];
	}

	const alignedFactors = alignFactorsAcrossPoints({
		stableSets: reconstruction.stableSets.slice(0, reconstruction.numPointsNeeded),
		referenceSet: reconstruction.referenceSet,
		referenceFingerprints: reconstruction.referenceFingerprints,
		numFactors: reconstruction.numFactors,
		fingerprint,
	});

	const candidateFactors = interpolateCandidateFactors({
		alignedFactors,
		stableSets: reconstruction.stableSets,
		mainVar,
		evalVar,
	});

	if (candidateFactors.length === 0) {
		return [workingPoly];
	}

	const divided = divideOutCandidates(workingPoly, candidateFactors);
	return divided.length > 0 ? divided : [workingPoly];
}

// ---- factorMultivariate phases: helpers ----

function factorUnivariateMultiPoly(workingPoly: MultiPoly, varIndex: number): MultiPoly[] {
	// Helper: unpack a FactorizationResult into MultiPoly factors.
	function unpackFactorResult(res: FactorizationResult): MultiPoly[] {
		const out: MultiPoly[] = [];
		let content = BigInt(res.content);

		const factors: MultiPoly[] = [];
		for (const f of res.factors) {
			for (let k = 0; k < (f.multiplicity ?? 1); k++) {
				factors.push(fromUnivariate(f.coefficients, varIndex));
			}
		}

		if (content === -1n && factors.length > 0) {
			factors[0] = scalePoly(factors[0], -1n);
			content = 1n;
		}

		if (content !== 1n) {
			out.push(MultiPoly.constant(content));
		}
		out.push(...factors);
		return out;
	}

	// Count non-constant factors in a FactorizationResult.
	function nonConstFactorCount(res: FactorizationResult): number {
		let count = 0;
		for (const f of res.factors) {
			const deg = (f.coefficients?.length ?? 0) - 1;
			if (deg > 0) {
				count += f.multiplicity ?? 1;
			}
		}
		return count;
	}

	// Try standard univariate factorization (Berlekamp/Zassenhaus) first.
	const uni = toUnivariate(workingPoly, varIndex);
	if (uni) {
		const res = factorPolynomial(uni);
		const fullCount = nonConstFactorCount(res);

		if (fullCount > 1) {
			// Berlekamp/Zassenhaus split it. But rational root extraction followed
			// by recursive factorPolynomial on remainders may find even more factors
			// (e.g. x^6-1 where Berlekamp misses the quartic split). Try both and
			// take whichever produces more factors.
			const fullFactors = unpackFactorResult(res);

			const univarFactors = tryRationalRootFactorization(workingPoly, varIndex);
			if (univarFactors.length > 1) {
				const refined = refineRationalRootFactors(univarFactors, varIndex);
				if (refined.length > fullFactors.length) {
					return refined;
				}
			}

			return fullFactors;
		}
	}

	// Berlekamp/Zassenhaus didn't split. Try rational root extraction + recursive
	// refinement as fallback (handles cases where rational roots exist but the
	// full polynomial appears irreducible to Berlekamp due to prime selection).
	const univarFactors = tryRationalRootFactorization(workingPoly, varIndex);
	if (univarFactors.length > 1) {
		return refineRationalRootFactors(univarFactors, varIndex);
	}

	return [workingPoly];
}

/**
 * Given factors from tryRationalRootFactorization, run each degree >= 2 factor
 * through factorPolynomial to split further (e.g. x^4+x^2+1 → (x^2+x+1)(x^2-x+1)).
 */
function refineRationalRootFactors(univarFactors: MultiPoly[], varIndex: number): MultiPoly[] {
	const refined: MultiPoly[] = [];
	for (const fac of univarFactors) {
		const d = fac.degree(varIndex);
		if (d >= 2) {
			const uni = toUnivariate(fac, varIndex);
			if (uni) {
				const res = factorPolynomial(uni);
				if (
					res.factors.length > 1 ||
					(res.factors.length === 1 && (res.factors[0].multiplicity ?? 1) > 1)
				) {
					let content = BigInt(res.content);
					for (const f of res.factors) {
						for (let k = 0; k < (f.multiplicity ?? 1); k++) {
							refined.push(fromUnivariate(f.coefficients, varIndex));
						}
					}
					if (content === -1n && refined.length > 0) {
						refined[refined.length - 1] = scalePoly(refined[refined.length - 1], -1n);
						content = 1n;
					}
					if (content !== 1n && content !== 0n) {
						refined.push(MultiPoly.constant(content));
					}
					continue;
				}
			}
		}
		refined.push(fac);
	}
	return refined;
}

// Avoid "special" evaluation points where the univariate specialization collapses to repeated/power
// factorizations (e.g. x^4 at y=0 in a generic bivariate split).
//
// A point is considered "generic good" if:
//  - at least two non-constant factors
//  - all non-constant factors are squarefree (multiplicity == 1)
function uniSplitSquarefree(fr: FactorizationResult | null): { ok: boolean; nonConst: number } {
	if (!fr || !fr.factors) {
		return { ok: false, nonConst: 0 };
	}
	let nonConst = 0;
	for (const f of fr.factors) {
		const deg = (f.coefficients?.length ?? 0) - 1;
		if (deg <= 0) {
			continue;
		}
		nonConst += 1;
		const m = f.multiplicity ?? 1;
		if (m !== 1) {
			return { ok: false, nonConst };
		}
	}
	return { ok: nonConst >= 2, nonConst };
}

function findGenericEvalPoint(args: {
	workingPoly: MultiPoly;
	mainVar: number;
	evalVar: number;
	lcMultivariate: MultiPoly;
	maxAttempts: number;
	stats?: FactorBudgetStats;
}): bigint | null {
	const { workingPoly, mainVar, evalVar, lcMultivariate, maxAttempts } = args;
	const stats = args.stats;
	if (stats) {
		stats.stage = 'find-generic-eval-point';
		stats.maxAttempts = maxAttempts;
		stats.attemptsUsed = 0;
	}

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		if (stats) {
			stats.attemptsUsed = attempt + 1;
		}
		const a =
			attempt === 0
				? 0n
				: attempt % 2 === 1
					? BigInt(Math.floor(attempt / 2) + 1)
					: -BigInt(attempt / 2);

		const evaluatedLC = substituteVarIndex(lcMultivariate, evalVar, a);
		if (evaluatedLC.isZero()) {
			continue;
		}

		const pEval = substituteVarIndex(workingPoly, evalVar, a);
		const uniCoeffs = toUnivariate(pEval, mainVar);
		if (!uniCoeffs) {
			continue;
		}

		const fr = factorPolynomial(uniCoeffs);
		if (uniSplitSquarefree(fr).ok) {
			return a;
		}
	}

	return null;
}

// ---- Matching / fingerprint helpers ----

const FP_MOD = 1000003n;
const FP_XS: bigint[] = [2n, 3n, 5n];

function evalUnivariateMod(poly: MultiPoly, x: bigint, mod: bigint, mainVar: number): bigint {
	let acc = 0n;
	let pow = 1n;
	const deg = poly.degree(mainVar);
	for (let d = 0; d <= deg; d++) {
		const c = poly.getCoeff([d]);
		acc = modNorm(acc + modNorm(c, mod) * pow, mod);
		pow = modNorm(pow * x, mod);
	}
	return acc;
}

function fingerprintUnivariateInVar(poly: MultiPoly, mainVar: number): string {
	const q = mvNormalizeSignUnivariateInVar(poly, mainVar);
	const deg = q.degree(mainVar);
	const vals = FP_XS.map(x => evalUnivariateMod(q, x, FP_MOD, mainVar).toString());
	return `${deg}|${vals.join(',')}`;
}

type FactorSet = {
	point: bigint;
	factors: MultiPoly[];
	degrees: number[];
};

type Reconstruction = {
	numPointsNeeded: number;
	numFactors: number;
	referenceSet: FactorSet;
	referenceFingerprints: string[];
	stableSets: FactorSet[];
};

function collectStableFactorSetsMajority(args: {
	workingPoly: MultiPoly;
	mainVar: number;
	evalVar: number;
	evalPoint: bigint;
	lcMultivariate: MultiPoly;
	maxSetsMultiplier: number;
	fingerprint: (poly: MultiPoly) => string;
	stats?: FactorBudgetStats;
}): Reconstruction | null {
	const {
		workingPoly,
		mainVar,
		evalVar,
		evalPoint,
		lcMultivariate,
		maxSetsMultiplier,
		fingerprint,
	} = args;
	const stats = args.stats;
	if (stats) {
		stats.stage = 'collect-stable-factor-sets';
		stats.pointsTried = 0;
		stats.factorSetsFound = 0;
	}

	const degY = workingPoly.degree(evalVar);
	const numPointsNeeded = degY + 1;
	if (stats) {
		stats.numPointsNeeded = numPointsNeeded;
	}
	const factorSets: FactorSet[] = [];

	// Candidate evaluation points: include both positive and negative points.
	const candidatePoints: bigint[] = [];
	candidatePoints.push(evalPoint);
	candidatePoints.push(0n);
	for (let k = 1; k < numPointsNeeded * maxSetsMultiplier; k++) {
		candidatePoints.push(BigInt(k));
		candidatePoints.push(-BigInt(k));
	}

	// De-duplicate while preserving order.
	const seenPts = new Set<string>();
	const uniqCandidatePoints: bigint[] = [];
	for (const pt of candidatePoints) {
		const key = pt.toString();
		if (seenPts.has(key)) {
			continue;
		}
		seenPts.add(key);
		uniqCandidatePoints.push(pt);
	}

	const maxSets = Math.max(numPointsNeeded * maxSetsMultiplier, 20);
	if (stats) {
		stats.maxSets = maxSets;
	}

	for (const pt of uniqCandidatePoints) {
		if (stats) {
			stats.pointsTried = (stats.pointsTried ?? 0) + 1;
		}
		if (factorSets.length >= maxSets) {
			break;
		}

		const lcEval = substituteVarIndex(lcMultivariate, evalVar, pt);
		if (lcEval.isZero()) {
			continue;
		}

		const pEval = substituteVarIndex(workingPoly, evalVar, pt);
		const uniCoeffs = toUnivariate(pEval, mainVar);
		if (!uniCoeffs) {
			continue;
		}

		const factResult = factorPolynomial(uniCoeffs);

		// Ensure the reduction splits in a generic (squarefree) way.
		if (!uniSplitSquarefree(factResult).ok) {
			continue;
		}
		if (factResult.factors.length === 0) {
			continue;
		}

		const factors: MultiPoly[] = [];
		const degrees: number[] = [];

		// Use only non-constant factors for interpolation stability.
		for (const f of factResult.factors) {
			const degUni = (f.coefficients?.length ?? 0) - 1;
			if (degUni <= 0) {
				continue;
			}
			for (let m = 0; m < f.multiplicity; m++) {
				const fPoly = fromUnivariate(f.coefficients, mainVar);
				factors.push(fPoly);
				degrees.push(fPoly.degree(mainVar));
			}
		}

		if (factors.length < 2) {
			continue;
		}

		// Normalize only by sign/unit for matching across points.
		const normFactors = factors.map(f => mvNormalizeSignUnivariateInVar(f, mainVar));
		const normDegrees = normFactors.map(f => f.degree(mainVar));
		factorSets.push({ point: pt, factors: normFactors, degrees: normDegrees });
		if (stats) {
			stats.factorSetsFound = factorSets.length;
		}
	}

	if (factorSets.length === 0) {
		return null;
	}

	const sigKey = (fs: FactorSet): string => [...fs.degrees].sort((a, b) => a - b).join(',');

	type SigInfo = { count: number; bestNonConst: number; bestSet: FactorSet | null };
	const sigMap = new Map<string, SigInfo>();

	for (const fs of factorSets) {
		let nonConst = 0;
		for (const d of fs.degrees) {
			if (d > 0) {
				nonConst++;
			}
		}
		const key = sigKey(fs);
		const cur = sigMap.get(key) ?? { count: 0, bestNonConst: -1, bestSet: null };
		cur.count += 1;
		if (nonConst > cur.bestNonConst) {
			cur.bestNonConst = nonConst;
			cur.bestSet = fs;
		}
		sigMap.set(key, cur);
	}

	// Pick the most frequent signature; tie-break by most non-constant factors.
	let bestKey: string | null = null;
	let bestCount = -1;
	let bestNonConst = -1;
	let referenceSet: FactorSet | null = null;

	for (const [key, info] of sigMap.entries()) {
		if (info.bestNonConst <= 1) {
			continue;
		} // not a split
		if (
			info.count > bestCount ||
			(info.count === bestCount && info.bestNonConst > bestNonConst)
		) {
			bestKey = key;
			bestCount = info.count;
			bestNonConst = info.bestNonConst;
			referenceSet = info.bestSet;
		}
	}

	if (!bestKey || !referenceSet) {
		return null;
	}

	const stableSets = factorSets.filter(fs => sigKey(fs) === bestKey);
	if (stats) {
		stats.numPointsNeeded = numPointsNeeded;
		stats.maxSets = maxSets;
		stats.stableSetsFound = stableSets.length;
	}
	if (stableSets.length < numPointsNeeded) {
		return null;
	}

	const numFactors = referenceSet.factors.length;
	const referenceFingerprints = referenceSet.factors.map(f => fingerprint(f));

	return { numPointsNeeded, numFactors, referenceSet, referenceFingerprints, stableSets };
}

function alignFactorsAcrossPoints(args: {
	stableSets: FactorSet[];
	referenceSet: FactorSet;
	referenceFingerprints: string[];
	numFactors: number;
	fingerprint: (poly: MultiPoly) => string;
}): MultiPoly[][] {
	const { stableSets, referenceSet, referenceFingerprints, numFactors, fingerprint } = args;

	const alignedFactors: MultiPoly[][] = Array.from({ length: numFactors }, () => []);

	for (const fs of stableSets) {
		const used = new Array(fs.factors.length).fill(false);

		for (let refIdx = 0; refIdx < numFactors; refIdx++) {
			const refDeg = referenceSet.degrees[refIdx];
			const refFp = referenceFingerprints[refIdx];

			let pick = -1;
			for (let j = 0; j < fs.factors.length; j++) {
				if (used[j]) {
					continue;
				}
				if (fs.degrees[j] !== refDeg) {
					continue;
				}
				if (fingerprint(fs.factors[j]) === refFp) {
					pick = j;
					break;
				}
			}

			if (pick === -1) {
				// fallback: degree-only match (still one-to-one)
				for (let j = 0; j < fs.factors.length; j++) {
					if (used[j]) {
						continue;
					}
					if (fs.degrees[j] === refDeg) {
						pick = j;
						break;
					}
				}
			}

			if (pick === -1) {
				alignedFactors[refIdx].push(MultiPoly.constant(1n));
			} else {
				used[pick] = true;
				alignedFactors[refIdx].push(fs.factors[pick]);
			}
		}
	}

	return alignedFactors;
}

function interpolateCandidateFactors(args: {
	alignedFactors: MultiPoly[][];
	stableSets: FactorSet[];
	mainVar: number;
	evalVar: number;
}): MultiPoly[] {
	const { alignedFactors, stableSets, mainVar } = args;

	const candidateFactors: MultiPoly[] = [];
	const numFactors = alignedFactors.length;

	for (let factorIdx = 0; factorIdx < numFactors; factorIdx++) {
		const alignedSet = alignedFactors[factorIdx];
		const interpolationData: Array<{ y: bigint; poly: MultiPoly }> = [];

		for (let i = 0; i < Math.min(alignedSet.length, stableSets.length); i++) {
			interpolationData.push({ y: stableSets[i].point, poly: alignedSet[i] });
		}

		// Find max degree in x
		let maxDegX = 0;
		for (const { poly } of interpolationData) {
			const deg = poly.degree(mainVar);
			if (deg > maxDegX) {
				maxDegX = deg;
			}
		}

		const interpolatedFactor = new MultiPoly();

		for (let xDeg = 0; xDeg <= maxDegX; xDeg++) {
			const points: Array<{ y: number; value: bigint }> = [];
			for (const { y, poly } of interpolationData) {
				points.push({ y: Number(y), value: poly.getCoeff([xDeg]) });
			}

			const yPoly = lagrangeInterpolation(points);

			for (const [yDeg, coeff] of yPoly.entries()) {
				if (coeff !== 0n) {
					interpolatedFactor.setCoeff([xDeg, yDeg], coeff);
				}
			}
		}

		if (!interpolatedFactor.isZero() && !interpolatedFactor.isConstant()) {
			candidateFactors.push(interpolatedFactor);
		}
	}

	return candidateFactors;
}

function divideOutCandidates(workingPoly: MultiPoly, candidateFactors: MultiPoly[]): MultiPoly[] {
	const result: MultiPoly[] = [];
	let remaining = workingPoly.clone();

	for (const candidate of candidateFactors) {
		const q = mvExactDiv(remaining, candidate);
		if (q) {
			result.push(candidate);
			remaining = q;
			if (remaining.isConstant() || remaining.isZero()) {
				break;
			}
		}
	}

	if (!remaining.isConstant() && !remaining.isZero()) {
		result.push(remaining);
	}

	return result;
}

/**
 * Lagrange interpolation to find polynomial p(y) such that p(y_i) = value_i
 * Returns coefficients as Map from degree to coefficient
 * NOTE: Result may be scaled up by a constant factor to avoid fractional coefficients
 */
function lagrangeInterpolation(points: Array<{ y: number; value: bigint }>): Map<number, bigint> {
	const n = points.length;
	if (n === 0) {
		return new Map();
	}

	if (n === 1) {
		const result = new Map<number, bigint>();
		result.set(0, points[0].value);
		return result;
	}

	// Compute the product of all denominators to clear fractions
	let commonDenominator = 1n;
	for (let i = 0; i < n; i++) {
		for (let j = 0; j < n; j++) {
			if (i !== j) {
				commonDenominator *= BigInt(Math.abs(points[i].y - points[j].y));
			}
		}
	}

	// Build the interpolating polynomial with cleared denominators
	const result = new Map<number, bigint>();

	for (let i = 0; i < n; i++) {
		// Compute the Lagrange basis polynomial L_i(y)
		let numerator: Map<number, bigint> = new Map([[0, 1n]]);

		for (let j = 0; j < n; j++) {
			if (i === j) {
				continue;
			}

			const yj = BigInt(points[j].y);

			// Multiply numerator by (y - yj)
			const newNumerator = new Map<number, bigint>();
			for (const [deg, coeff] of numerator.entries()) {
				newNumerator.set(deg + 1, (newNumerator.get(deg + 1) || 0n) + coeff);
				newNumerator.set(deg, (newNumerator.get(deg) || 0n) - coeff * yj);
			}
			numerator = newNumerator;
		}

		// Compute the denominator for this basis polynomial
		let denominator = 1n;
		for (let j = 0; j < n; j++) {
			if (i !== j) {
				denominator *= BigInt(points[i].y - points[j].y);
			}
		}

		// Scale numerator by value_i and by (commonDenominator / denominator)
		const scale = points[i].value * (commonDenominator / denominator);

		// Add scaled numerator to result
		for (const [deg, coeff] of numerator.entries()) {
			result.set(deg, (result.get(deg) || 0n) + coeff * scale);
		}
	}

	// Find GCD of all coefficients and the common denominator
	let g0 = 0n;
	for (const coeff of result.values()) {
		g0 = gcd(g0, coeff);
	}
	g0 = gcd(g0, commonDenominator);

	// Simplify by the GCD (this gives us the smallest integer polynomial)
	const simplified = new Map<number, bigint>();
	for (const [deg, coeff] of result.entries()) {
		const simpl = coeff / g0;
		if (simpl !== 0n) {
			simplified.set(deg, simpl);
		}
	}

	return simplified;
}

/**
 * Get all combinations of k elements from array
 */

/**
 * Main entry point for multivariate factorization
 */
export type PolyFactor = { poly: MultiPoly; multiplicity: number };
export type FactorsObject = {
	content: bigint;
	factors: PolyFactor[];
};
export function factorPoly(f: MultiPoly, vars: string[]): FactorsObject {
	if (f.isZero()) {
		return { content: 0n, factors: [] };
	}

	const [intContent, primitive] = makePrimitiveZ(f);
	const factorList = factorMultivariate(primitive);

	// Group by equality
	const factorMap = new Map<string, { poly: MultiPoly; multiplicity: number }>();

	for (const factor of factorList) {
		const key = factor.text(vars);
		const existing = factorMap.get(key);
		if (existing) {
			existing.multiplicity++;
		} else {
			factorMap.set(key, { poly: factor, multiplicity: 1 });
		}
	}

	return {
		content: intContent,
		factors: Array.from(factorMap.values()),
	};
}
