import { Complex } from '../core/classes/complex/Complex';
import { Expression } from '../core/classes/expression/Expression';
import { half, one, zero } from '../core/classes/expression/shortcuts';
import { GAMMA, GAMMA_INCOMPLETE, GAMMA_INCOMPLETE_LOWER, SQRT } from '../core/constants/functionNames';
import { message, UndefinedError } from '../core/errors';
import { factorial as fact } from '../core/functions/bigint/bigint';
import { gamma as decGamma, gammaComplex } from '../core/functions/decimal';
import { Settings } from '../core/Settings';

import type { ExpressionInput } from '../core/types';

/**
 * Upper incomplete gamma Γ(a, z).
 *
 * Positive integer first arguments are expanded exactly using the finite-sum formula.
 * Other inputs remain symbolic.
 *
 * @see https://dlmf.nist.gov/8.4.E8
 */
export function gammaIncomplete(a: ExpressionInput, z: ExpressionInput): Expression {
	const order = Expression.create(a);
	const argument = Expression.create(z);

	if (!order.isNUM() || !order.isInteger() || order.lte(zero())) {
		return Expression.toFunction(GAMMA_INCOMPLETE, [order, argument]);
	}

	const n = order.getMultiplier().numerator;
	if (n > BigInt(Settings.MAX_PRODUCT_AND_SUMMATION_ITERATION)) {
		return Expression.toFunction(GAMMA_INCOMPLETE, [order, argument]);
	}

	let term = one();
	let series = one();
	let k = 1n;
	while (k < n) {
		term = term.times(argument).div(Expression.Number(k));
		series = series.plus(term);
		k++;
	}

	return Expression.Number(fact(n - 1n)).times(Expression.E().pow(argument.neg())).times(series);
}

/**
 * Lower incomplete gamma γ(a, z).
 *
 * Positive integer first arguments use γ(a,z) = Γ(a) - Γ(a,z).
 * Other inputs remain symbolic.
 *
 * @see https://dlmf.nist.gov/8.2.E3
 */
export function gammaIncompleteLower(a: ExpressionInput, z: ExpressionInput): Expression {
	const order = Expression.create(a);
	const argument = Expression.create(z);

	if (!order.isNUM() || !order.isInteger() || order.lte(zero())) {
		return Expression.toFunction(GAMMA_INCOMPLETE_LOWER, [order, argument]);
	}
	if (order.getMultiplier().numerator > BigInt(Settings.MAX_PRODUCT_AND_SUMMATION_ITERATION)) {
		return Expression.toFunction(GAMMA_INCOMPLETE_LOWER, [order, argument]);
	}

	return gamma(order).minus(gammaIncomplete(order, argument));
}

/**
 * Computes the gamma function Γ(x).
 *
 * - For positive integers: `Γ(n) = (n − 1)!`
 * - For half-integers (e.g. `1/2`, `3/2`, `-3/2`): returns a closed-form
 *   expression involving `sqrt(π)`.
 * - For other numeric values: uses a high-precision decimal approximation.
 * - For symbolic inputs: returns an unevaluated `gamma(x)` node.
 *
 * @param x - The input expression.
 * @returns The gamma function value Γ(x).
 * @throws {@link core!UndefinedError} If `x` is `-∞`.
 *
 * @see https://en.wikipedia.org/wiki/Gamma_function
 *
 * @example
 * ```ts
 * gamma(Expression.create(5)).text()       // "24"
 * gamma(Expression.create('1/2')).text()   // "sqrt(pi)"
 * gamma(Expression.create('x')).text()     // "gamma(x)"
 * ```
 */
export function gamma(x: Expression) {
	let retval: Expression;

	if (x.isPosInf() || x.isNegInf()) {
		if (x.isNegInf()) {
			throw new UndefinedError(message('undefinedValue'));
		}
		return Expression.Inf();
	}

	if (x.isNUM()) {
		const m = x.getMultiplier();

		if (x.isInteger() && !x.isNegative()) {
			// gamma(n) = (n-1)! for positive integers
			if (x.isZero()) {
				retval = Expression.toFunction(GAMMA, [x]);
			} else {
				retval = Expression.Number(fact(x.getMultiplier().numerator - 1n));
			}
		} else if (m.denominator === 2n) {
			const sqrtPi = Expression.toFunction(SQRT, [Expression.Pi()]);
			const k = m.numerator;

			// poles: 0, -1, -2, ...
			if (k <= 0n && k % 2n === 0n) {
				retval = Expression.toFunction(GAMMA, [x]);
			} else if (k === 1n) {
				// gamma(1/2) = sqrt(pi
				retval = sqrtPi;
			} else if (k > 1n) {
				// positive half-integers
				let y = half();
				let r = sqrtPi;

				while (!y.eq(x)) {
					r = y.times(r);
					y = y.plus(one());
				}

				retval = r;
			} else {
				// negative half-integers via recurrence
				let y = half();
				let r = sqrtPi;

				while (!y.eq(x)) {
					y = y.minus(one());
					r = r.div(y);
				}

				retval = r;
			}
		} else {
			retval = Expression.Number(decGamma(m.toDecimal()));
		}
	} else if (Settings.EVALUATE && x.isComplex()) {
		const real = x.realPart();
		const imaginary = x.imagPart();
		if (real.isNUM() && imaginary.isNUM()) {
			const value = gammaComplex(
				new Complex(real.getMultiplier().toDecimal(), imaginary.getMultiplier().toDecimal())
			);
			retval = Expression.Number(value.re).plus(Expression.Number(value.im).i());
		} else {
			retval = Expression.toFunction(GAMMA, [x]);
		}
	} else {
		retval = Expression.toFunction(GAMMA, [x]);
	}

	return retval;
}
