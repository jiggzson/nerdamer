import { Complex } from '../core/classes/complex/Complex';
import { Expression } from '../core/classes/expression/Expression';
import { half, one, zero } from '../core/classes/expression/shortcuts';
import { Rational } from '../core/classes/rational/Rational';
import { GAMMA, GAMMA_INCOMPLETE, GAMMA_INCOMPLETE_LOWER } from '../core/constants/functionNames';
import { message, UndefinedError, UnsupportedOperationError } from '../core/errors';
import { factorial as fact, productInRange } from '../core/functions/bigint/bigint';
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
 * @throws {@link core!UndefinedError} If `x` is `-∞`, zero, or a negative integer
 * (the poles of Γ, where the one-sided limits have opposite signs).
 *
 * @see https://en.wikipedia.org/wiki/Gamma_function
 *
 * @example
 * ```ts
 * gamma(Expression.create(5)).text()       // "24"
 * gamma(Expression.create('1/2')).text()   // "pi^(1/2)"
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

		// Poles: 0, -1, -2, ... Γ approaches +∞ on one side and -∞ on the other,
		// so neither a value nor a signed infinity is correct.
		if (x.isInteger() && m.sign() <= 0) {
			throw new UndefinedError(message('gammaUndefined'));
		}
		// Exact integer and half-integer values grow like factorials, so share their limit
		else if ((x.isInteger() || m.denominator === 2n) && m.abs().gt(String(Settings.MAX_FACTORIAL_INPUT))) {
			throw new UnsupportedOperationError(
				message('inputLimitExceeded', { function: GAMMA, limit: String(Settings.MAX_FACTORIAL_INPUT) })
			);
		} else if (x.isInteger()) {
			// gamma(n) = (n-1)! for positive integers
			retval = Expression.Number(fact(m.numerator - 1n));
		} else if (m.denominator === 2n) {
			// A power rather than a bare sqrt node, which is never evaluated again, so that under
			// EVALUATE it becomes a number instead of sqrt(3.14159...).
			const sqrtPi = Expression.Pi().pow(half());
			const k = m.numerator;

			if (k === 1n) {
				// gamma(1/2) = sqrt(pi)
				retval = sqrtPi;
			} else {
				// Closed forms instead of the recurrence, so the cost is one integer product:
				// gamma(n + 1/2) = sqrt(pi) * (2n-1)!! / 2^n
				// gamma(1/2 - n) = sqrt(pi) * (-2)^n / (2n-1)!!
				// (2n-1)!! is odd, so each fraction is already reduced and needs no gcd, which
				// for numbers this size costs far more than the product.
				const n = k > 0n ? (k - 1n) / 2n : (1n - k) / 2n;
				const product = productInRange(1, Number(2n * n - 1n), 2);
				const power = 2n ** n;
				const ratio = k > 0n
					? new Rational(product, power)
					: new Rational(n % 2n === 0n ? power : -power, product);
				retval = Expression.fromRational(ratio).times(sqrtPi);
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
