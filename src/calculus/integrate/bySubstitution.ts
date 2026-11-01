import { factor } from '../../algebra/factor/factor';
import { simplify } from '../../algebra/simplify/simplify';
import { Expression } from '../../core/classes/expression/Expression';
import { one } from '../../core/classes/expression/shortcuts';
import { Polynomial } from '../../core/classes/polynomial/Polynomial';
import { INTEGRATE, TRIG, HYPERBOLIC_TRIG } from '../../core/constants/functionNames';
import { Pattern } from '../../core/converters/Pattern';
import { getU, subst } from '../../core/functions/subst';
import { diff } from '../derivative/diff';

import { tableOfIntegrals } from './integrationTable';
import { hasTranscendental, MAX_INTEGRATION_DEPTH } from './utils';

const MAX_POWER_SUBSTITUTION_ATTEMPTS = 8;

function rationalDegree(value: Expression, variable: string): number {
	return new Polynomial(value.getNumerator(), [variable]).deg() -
		new Polynomial(value.getDenominator(), [variable]).deg();
}

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
	// An exponential with an algebraic exponent retains that exponential when
	// differentiated, so it cannot form an f^n*f' pair with a standalone trig factor.
	if (
		(fx.isEXP() && !hasTranscendental(fx.getPower(), x) && other.isFunction(TRIG)) ||
		(other.isEXP() && !hasTranscendental(other.getPower(), x) && fx.isFunction(TRIG))
	) {
		return undefined;
	}
	// Hyperbolic derivative pairs retain their argument. Different arguments
	// cannot match the supported f^n*f' substitution form.
	if (fx.isFunction(HYPERBOLIC_TRIG) && other.isFunction(HYPERBOLIC_TRIG) &&
		!fx.getArguments()[0].eq(other.getArguments()[0])) {
		return undefined;
	}
	// Quick structural bail-out: if `other` is purely algebraic (no transcendentals)
	// but `fx` contains transcendentals, then other cannot be proportional to f'(x)
	// since differentiating a transcendental always produces transcendentals.
	if (!hasTranscendental(other, x) && hasTranscendental(fx, x)) {
		return undefined;
	}
	// For rational f, deg(f') = deg(f)-1 when deg(f) is nonzero.
	// If other = c*f'*f^m for positive integer m, its degree must match.
	// Check the original factors first, before forming an expensive residual.
	try {
		const baseDegree = rationalDegree(fx, x);
		if (baseDegree !== 0) {
			const power = (rationalDegree(other, x) + 1) / baseDegree - 1;
			// Zero is the basic f*f' case, checked by the residual below.
			if (!Number.isInteger(power) || power < 0 || power > MAX_POWER_SUBSTITUTION_ATTEMPTS) {
				return undefined;
			}
		}
	} catch {
		// Non-rational functions continue through the existing substitution search.
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

	// A rational power must have a matching numerator-minus-denominator degree.
	// Reject impossible positive powers before repeated symbolic simplification.
	// If conversion is unsupported, retain the existing substitution search.
	let maxAttempts = MAX_POWER_SUBSTITUTION_ATTEMPTS;
	try {
		const baseDegree = rationalDegree(fx, x);
		const residualDegree = rationalDegree(residual, x);
		if (baseDegree !== 0) {
			const power = residualDegree / baseDegree;
			if (!Number.isInteger(power) || power < 1 || power > MAX_POWER_SUBSTITUTION_ATTEMPTS) {
				return undefined;
			}
			maxAttempts = power;
		}
	} catch {
		// Expressions outside the polynomial domain use the existing search.
	}

	let quotient = residual;
	let m = 0;

	for (let attempts = 0; attempts < maxAttempts; attempts++) {
		const next = simplify(quotient.div(fx));
		if (!next.hasVariable(x)) {
			// residual = next·fx^(m+1), integrand = f·(next·fx^(m+1)·f') = next·fx^(m+2)·f'
			// Return power = m+2 so caller computes fx^(m+3)/(m+3)·next
			const power = Expression.Number(m + 2);
			const plusOne = Expression.Number(m + 3);
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
 * To reduce symbolic overhead, each factor is tested against the
 * product of the remaining factors without constructing every contiguous range.
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
 *      c * f(x)² / 2
 *
 * Factorization is only performed when necessary to avoid the
 * significant cost of factoring expressions unnecessarily.
 *
 * @param fx expression to integrate
 * @param x integration variable
 * @returns substitution match information or undefined
 */
export function matchProductSubstitution(
	fx: Expression,
	x: string
): { fx: Expression; constant: Expression; power: Expression } | undefined {
	// If the expression is not already a product, factor it.
	if (!fx.isProduct()) {
		fx = factor(fx);
	}

	// elementsArray() omits the power of the containing product.
	// Factoring a reciprocal may produce (a*b)^-1, which must not be
	// mistaken for a*b when testing f*f' substitution.
	if (!fx.isProduct() || !fx.getPower().isOne()) {
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

/**
 * Attempts substitution when one factor wraps an inner expression and the
 * remaining factors are proportional to its derivative.
 * Products with no eligible wrapper skip symbolic product construction.
 *
 * @param fx - Complete product integrand, used to select a fresh variable.
 * @param factors - Multiplicative factors to test.
 * @param x - Integration variable.
 * @returns The back-substituted antiderivative, or `undefined` when the outer
 * factor cannot be integrated. The optional callback keeps experimental
 * recursive integration in its controller; legacy callers retain table lookup.
 */
export function tryIntegrateByWrappedFactorSubstitution(
	fx: Expression,
	factors: Expression[],
	x: string,
	recurse?: (integrand: Expression, variable: string, depth: number) => Expression,
	depth = 0
): Expression | undefined {
	let total: Expression | undefined;
	if (recurse && depth >= MAX_INTEGRATION_DEPTH) {
		return undefined;
	}

	for (const factor of factors) {
		const candidates = getWrappedInnerCandidates(factor, x);
		if (candidates.length === 0) {
			continue;
		}
		if (!total) {
			total = factors[0];
			for (let i = 1; i < factors.length; i++) {
				total = total.times(factors[i]);
			}
		}
		const others = simplify(total.div(factor));
		for (const inner of candidates) {
			const match = testQuotientSides(others, inner, x);
			if (!match) {
				continue;
			}

			const u = Expression.create(getU(fx));
			const factorInU = simplify(subst(factor, inner, u));
			if (factorInU.hasVariable(x) || !factorInU.hasVariable(u.text())) {
				continue;
			}

			const outerIntegral = recurse ? recurse(factorInU, u.text(), depth) :
				tableOfIntegrals.lookup(new Pattern(factorInU, [u.text()]), 0);
			if (!outerIntegral || outerIntegral.hasFunction(INTEGRATE)) {
				continue;
			}

			return simplify(subst(outerIntegral, u, inner).times(match.constant));
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
	if (df.isZero()) {
		return undefined;
	}
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
export function matchLogSubstitution(
	fx: Expression,
	x: string
): { fx: Expression; constant: Expression } | undefined {
	const rawDenominator = fx.getDenominator();
	if (rawDenominator.isOne()) {
		return undefined;
	}

	// Extract numerator and denominator directly from the expression.
	const numerator = simplify(fx.getNumerator());
	const denominator = simplify(rawDenominator);

	let retval = testQuotientSides(numerator, denominator, x);
	if (!retval && denominator.isProduct()) {
		const factors = denominator.elementsArray();
		for (const factor of factors) {
			if (retval) {
				break;
			}
			if (!factor.hasVariable(x)) {
				continue;
			}
			const remaining = denominator.div(factor);
			retval = testQuotientSides(numerator.div(remaining), factor, x);
		}
	}

	return retval;
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
 * matchLogSubstitution. This function handles n ≠ 1,
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
export function matchPowerSubstitution(
	fx: Expression,
	x: string
): { fx: Expression; constant: Expression; power: Expression } | undefined {
	let retval: { fx: Expression; constant: Expression; power: Expression } | undefined;
	const denominator = simplify(fx.getDenominator());
	if (!denominator.isOne() && denominator.hasVariable(x)) {
		const base = denominator.getBase();
		const power = denominator.getPower();
		if (base.hasVariable(x) && !simplify(one().minus(power)).isZero()) {
			const match = testQuotientSides(simplify(fx.getNumerator()), base, x);
			if (match) {
				retval = { ...match, power };
			}
		}
	}
	return retval;
}

/**
 * Integrate derivative-proportional quotients by the single power rule
 * in the substituted variable. This combines logarithmic (n = 1)
 * and non-logarithmic (n != 1) outcomes without introducing a new
 * integration algorithm. Used by the experimental controller only.
 */
export function integrateDerivativeQuotient(expr: Expression, variable: string): Expression | undefined {
	let retval: Expression | undefined;
	const logarithmic = matchLogSubstitution(expr, variable);
	if (logarithmic) {
		retval = Expression.toFunction('log', [logarithmic.fx]).times(logarithmic.constant);
	} else {
		const power = matchPowerSubstitution(expr, variable);
		if (power) {
			const exponent = one().minus(power.power);
			retval = power.fx.pow(exponent).div(exponent).times(power.constant);
		}
	}
	return retval;
}
