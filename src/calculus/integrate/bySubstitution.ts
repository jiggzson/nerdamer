import { factor } from '../../algebra/factor/factor';
import { simplify } from '../../algebra/simplify/simplify';
import { Expression } from '../../core/classes/expression/Expression';
import { minusOne, one } from '../../core/classes/expression/shortcuts';
import { getU, subst } from '../../core/functions/subst';
import { diff } from '../derivative/diff';

import { tableOfIntegrals } from './integrationTable';
import { hasTranscendental } from './utils';

/**
 * Tests whether two expressions match the generalized substitution pattern
 *
 *      integrand = c * f(x)^n * f'(x)
 *
 * where c is a constant independent of the integration variable
 * and n is any real number (including n=1 for the basic f·f' case,
 * n=-1 for the logarithmic case, and fractional powers).
 *
 * If the relationship holds, the integral becomes
 *
 *      ∫ c f^n f' dx = c * f^(n+1) / (n+1)    (for n ≠ -1)
 *
 * The n=-1 case (logarithmic) is handled separately by the log substitution
 * detector, so this function focuses on n ≠ -1.
 *
 * Detection strategy:
 * 1. Compute f'(x) for the candidate f(x)
 * 2. Divide `other` by f'(x) to get the residual
 * 3. If the residual is constant → n=1 (basic f·f' case)
 * 4. Otherwise, check if the residual is a pure power of f(x):
 *    residual = c·f(x)^m → n = m+1, constant = c
 *
 * @param fx candidate substitution function f(x)
 * @param other remaining multiplicative factor
 * @param x integration variable
 * @returns substitution match information or undefined
 */
function testProductSides(
	fx: Expression,
	other: Expression,
	x: string
): { fx: Expression; constant: Expression; power: Expression } | undefined {
	// Quick structural bail-out: if `other` is purely algebraic (no transcendentals)
	// but `fx` contains transcendentals, then other cannot be proportional to f'(x)
	// since differentiating a transcendental always produces transcendentals.
	if (!hasTranscendental(other, x) && hasTranscendental(fx, x)) {
		return undefined;
	}
	// Compute derivative of the candidate substitution function.
	const df = diff(fx, x);
	// Do not divide by zero
	if (df.isZero()) {
		return;
	}
	// Determine whether the other factor differs from f'(x) only by a constant.
	// If other = c*f'(x), then the integrand is c*f(x)*f'(x) → power = 1.
	const residual = simplify(other.div(df));

	// Case 1: residual is constant → basic f·f' pattern with power = 1
	if (!residual.hasVariable(x)) {
		return { fx, constant: residual, power: one() };
	}

	// Skip the expensive repeated-division loop when fx is a plain variable.
	// If fx = x, the integrand is x·other, and the f^n·f' pattern with fx = x
	// means other = c·x^m — a pure polynomial, already handled by the table.
	if (fx.isVAR()) {
		return undefined;
	}

	// Case 2: residual might be c·f(x)^m for some constant c and exponent m.
	// If so, the integrand = fx · other = f(x) · c·f'(x)·f(x)^m = c·f(x)^(m+1)·f'(x).
	// The integral is c·f(x)^(m+2)/(m+2).
	// We return power = m+1 so the caller computes fx^(power+1)/(power+1)·constant.
	//
	// Detection: divide residual by fx repeatedly. After k divisions, if the
	// result is independent of x, then m = k and residual = constant·fx^k.

	let quotient = residual;
	let m = 0;

	for (let attempts = 0; attempts < 8; attempts++) {
		const next = simplify(quotient.div(fx));
		if (!next.hasVariable(x)) {
			// residual = next·fx^(m+1), integrand = f·(next·fx^(m+1)·f') = next·fx^(m+2)·f'
			// Return power = m+2 so caller computes fx^(m+3)/(m+3)·next
			const power = Expression.create(`${m + 2}`);
			const plusOne = Expression.create(`${m + 3}`);
			// n+1 must not be zero (would mean n=-1, the logarithmic case)
			if (plusOne.isZero()) {
				return undefined;
			}
			return { fx, constant: next, power };
		}
		quotient = next;
		m++;
	}

	return undefined;
}

/**
 * Attempts to detect an f(x)·f'(x) substitution structure from a list of
 * multiplicative factors.
 *
 * The algorithm performs a contiguous range search over the factors.
 * For each contiguous block it builds a candidate f(x) and compares it
 * against the remaining factors.
 *
 * Example structure detected:
 *
 *      (a^x*log(a)*cos(x) - a^x*sin(x)) * a^x*cos(x)
 *
 * which matches
 *
 *      f(x) = a^x*cos(x)
 *      f'(x) = a^x*log(a)*cos(x) - a^x*sin(x)
 *
 * yielding
 *
 *      ∫ f f' dx = f² / 2
 *
 * To reduce symbolic overhead:
 *
 * - The total product is computed once.
 * - The left candidate product grows incrementally.
 * - The complementary product is obtained via division.
 *
 * @param factors multiplicative factors of the integrand
 * @param x integration variable
 * @returns substitution match or undefined if none found
 */
export function bySubstitution(
	factors: Expression[],
	x: string
): { fx: Expression; constant: Expression; power: Expression } | undefined {
	const n = factors.length;

	// Compute the total product once.
	let total = factors[0];
	for (let i = 1; i < n; i++) {
		total = total.times(factors[i]);
	}

	// Iterate over contiguous ranges of factors.
	for (let start = 0; start < n; start++) {
		const left = factors[start];

		let right: Expression | undefined = undefined;
		for (let i = 0; i < n; i++) {
			if (i === start) {
				continue;
			}
			right = right ? right.times(factors[i]) : factors[i];
		}

		right = right ?? one();

		const a = testProductSides(left, right, x);
		if (a) {
			return a;
		}

		const b = testProductSides(right, left, x);
		if (b) {
			return b;
		}

		// Also try the base of powered factors as candidates.
		// e.g. for tan(x)^2 · sec(x)^2, try tan(x) vs tan(x)·sec(x)^2
		// so testProductSides can detect f·f^n·f' patterns.
		const leftBase = left.getBase();
		const leftPower = left.getPower();
		if (!leftPower.isOne() && leftBase.hasVariable(x)) {
			const adjustedRight = leftBase.pow(leftPower.minus(one())).times(right);
			const c = testProductSides(leftBase, adjustedRight, x);
			if (c) {
				return c;
			}
		}

		const rightBase = right.getBase();
		const rightPower = right.getPower();
		if (!rightPower.isOne() && rightBase.hasVariable(x)) {
			const adjustedLeft = rightBase.pow(rightPower.minus(one())).times(left);
			const d = testProductSides(rightBase, adjustedLeft, x);
			if (d) {
				return d;
			}
		}
	}

	return undefined;
}

/**
 * Attempts to integrate an expression using product-style substitution.
 *
 * This function prepares the expression for substitution detection
 * by extracting multiplicative factors and then delegating to
 * {@link bySubstitution}.
 *
 * The method specifically searches for integrands of the form
 *
 *      c * f(x) * f'(x)
 *
 * which integrate to
 *
 *      f(x)² / (2c)
 *
 * Factorization is only performed when necessary to avoid the
 * significant cost of factoring expressions unnecessarily.
 *
 * @param fx expression to integrate
 * @param x integration variable
 * @returns substitution match information or undefined
 */
export function tryIntegrateBySubstitution(
	fx: Expression,
	x: string
): { fx: Expression; constant: Expression; power: Expression } | undefined {
	// If the expression is not already a product, factor it.
	if (!fx.isProduct()) {
		fx = factor(fx);
	}

	// If it still is not a product, substitution is impossible.
	if (!fx.isProduct()) {
		return undefined;
	}

	const factors = fx.elementsArray();

	// Substitution requires at least two multiplicative components.
	if (factors.length < 2) {
		return undefined;
	}

	const result = bySubstitution(factors, x);
	return result;
}

/**
 * Extracts candidate inner functions from a factor for wrapped-factor substitution.
 *
 * For function calls like cos(x^2), extracts the argument (x^2).
 * For exponentials like e^(x^2), extracts the exponent (x^2).
 * For non-unit powers like (3+2*x^2)^(5/2), extracts the base (3+2*x^2).
 *
 * @param factor a multiplicative factor of the integrand
 * @param x integration variable
 * @returns list of candidate inner expressions for substitution
 */
function getWrappedInnerCandidates(factor: Expression, x: string): Expression[] {
	const candidates: Expression[] = [];

	if (factor.isFunction()) {
		const args = factor.getArguments();
		if (args.length === 1 && args[0].hasVariable(x)) {
			candidates.push(args[0]);
		}
	}

	if (factor.isEXP()) {
		const base = factor.getBase();
		const power = factor.getPower();
		if (base.hasVariable(x) && !base.eq(factor)) {
			candidates.push(base);
		}
		if (base.isE() && power.hasVariable(x) && !power.eq(factor)) {
			candidates.push(power);
		}
	}
	// Handle (base)^(non-unit power) — e.g. (3+2*x^2)^(5/2)
	if (!factor.isFunction() && !factor.isEXP()) {
		const base = factor.getBase();
		const power = factor.getPower();
		if (!power.isOne() && base.hasVariable(x) && !base.eq(factor)) {
			candidates.push(base);
		}
	}

	return candidates;
}

export function tryIntegrateByWrappedFactorSubstitution(
	fx: Expression,
	factors: Expression[],
	x: string
): Expression | undefined {
	let total = factors[0];
	for (let i = 1; i < factors.length; i++) {
		total = total.times(factors[i]);
	}

	for (const factor of factors) {
		const others = simplify(total.div(factor));
		for (const inner of getWrappedInnerCandidates(factor, x)) {
			const df = diff(inner, x);
			if (df.isZero()) {
				continue;
			}

			const constant = simplify(others.div(df));
			if (constant.hasVariable(x)) {
				continue;
			}

			const u = Expression.create(getU(fx));
			const factorInU = simplify(subst(factor, inner, u));
			if (factorInU.hasVariable(x) || !factorInU.hasVariable(u.text())) {
				continue;
			}

			const outerIntegral = tableOfIntegrals.lookup(factorInU, u.text(), 0);
			if (!outerIntegral || outerIntegral.hasFunction('integrate')) {
				continue;
			}

			return simplify(subst(outerIntegral, u, inner).times(constant));
		}
	}

	return undefined;
}

function testQuotientSides(
	numerator: Expression,
	denominator: Expression,
	x: string
): { fx: Expression; constant: Expression } | undefined {
	// Treat the denominator as the candidate inner function f(x).
	const df = diff(denominator, x);

	// If numerator = c*f'(x), then the integrand is c*f'(x)/f(x).
	const constant = simplify(numerator.div(df));

	// The proportionality factor must be independent of x.
	if (!constant.hasVariable(x)) {
		return {
			fx: denominator,
			constant,
		};
	}

	return undefined;
}

/**
 * Attempts to detect a logarithmic substitution structure of the form
 *
 *      c * f'(x) / f(x)
 *
 * by extracting the numerator and denominator of the expression and
 * testing whether the numerator is proportional to the derivative of
 * the denominator.
 *
 * This is much cheaper than the contiguous-factor search used for
 * product-style substitution because the denominator already provides
 * the natural candidate for f(x).
 *
 * Examples:
 *
 *      (2*x)/(1+x^2)      -> f(x) = 1+x^2, constant = 1
 *      cos(x)/sin(x)      -> f(x) = sin(x), constant = 1
 *      3*cos(x)/sin(x)    -> f(x) = sin(x), constant = 3
 *
 * Non-example:
 *
 *      f(x)/f'(x)
 *
 * That is not the logarithmic rule and should not be handled here.
 *
 * @param fx expression to analyze
 * @param x integration variable
 * @returns logarithmic substitution match information or undefined
 */
export function tryIntegrateByLogSubstitution(
	fx: Expression,
	x: string
): { fx: Expression; constant: Expression } | undefined {
	// Extract numerator and denominator directly from the expression.
	const numerator = simplify(fx.getNumerator());
	const denominator = simplify(fx.getDenominator());

	// If there is no real denominator, then there is no f'(x)/f(x) structure.
	if (denominator.isOne()) {
		return undefined;
	}

	return testQuotientSides(numerator, denominator, x);
}

/**
 * Attempts to detect a generalized power-quotient substitution structure:
 *
 *      integrand = c * f'(x) / f(x)^n
 *
 * which integrates to
 *
 *      c * f(x)^(1-n) / (1-n)     for n ≠ 1
 *
 * The n=1 case is the logarithmic substitution handled by
 * tryIntegrateByLogSubstitution. This function handles n ≠ 1,
 * including fractional powers like n=1/2 (square root denominators).
 *
 * This catches integrands like:
 *
 *      x / sqrt(1-x²)  →  f = 1-x², f' = -2x, n = 1/2
 *      x / (1+x²)²     →  f = 1+x², f' = 2x, n = 2
 *
 * @param fx expression to analyze
 * @param x integration variable
 * @returns match with fx (the inner function), constant, and power (the denominator exponent n)
 */
export function tryIntegrateByPowerSubstitution(
	fx: Expression,
	x: string
): { fx: Expression; constant: Expression; power: Expression } | undefined {
	const numerator = simplify(fx.getNumerator());
	const denominator = simplify(fx.getDenominator());

	// Must have a non-trivial denominator containing the variable
	if (denominator.isOne() || !denominator.hasVariable(x)) {
		return undefined;
	}

	// The denominator may be f(x)^n. Extract the base and power.
	// getBase() returns the base: for (1-x²)^(1/2), getBase() = 1-x²
	// getPower() returns the exponent: for (1-x²)^(1/2), getPower() = 1/2
	const denBase = denominator.getBase();
	const denPower = denominator.getPower();

	// If the base doesn't contain the variable, nothing to substitute
	if (!denBase.hasVariable(x)) {
		return undefined;
	}

	// Compute derivative of the denominator base
	const df = diff(denBase, x);
	if (df.isZero()) {
		return undefined;
	}

	// Check if numerator is proportional to f'(x):
	// If numerator = c·f'(x), then integrand = c·f'(x)/f(x)^n
	const ratio = simplify(numerator.div(df));

	if (!ratio.hasVariable(x)) {
		const oneMinusN = simplify(one().plus(denPower.times(minusOne())));

		// n=1 is the logarithmic case — skip (handled by log substitution)
		if (oneMinusN.isZero()) {
			return undefined;
		}

		return {
			fx: denBase,
			constant: ratio,
			power: denPower,
		};
	}

	return undefined;
}
