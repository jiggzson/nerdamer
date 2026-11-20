import { Complex } from '../core/classes/complex/Complex';
import { Expression } from '../core/classes/expression/Expression';
import { one } from '../core/classes/expression/shortcuts';
import { ERF, ERFC } from '../core/constants/functionNames';
import { message, UnsupportedOperationError } from '../core/errors';
import { erf as decErf, erfc as decErfc, erfComplex } from '../core/functions/decimal';
import { Settings } from '../core/Settings';

/**
 * Computes the error function erf(x).
 *
 * - `erf(+∞) = 1`, `erf(−∞) = −1`
 * - For numeric inputs, returns a high-precision decimal approximation.
 * - For symbolic inputs, returns an unevaluated `erf(x)` node.
 *
 * @param x - The input expression.
 * @returns The error function value.
 *
 * @see https://en.wikipedia.org/wiki/Error_function
 *
 * @example
 * ```ts
 * erf(Expression.create(0)).text()     // "0"
 * erf(Expression.create('x')).text()   // "erf(x)"
 * ```
 */
export function erf(x: Expression): Expression {
	let retval;
	if (x.isPosInf() || x.isNegInf()) {
		retval = x.isNegInf() ? one().neg() : one();
	} else if (x.isNUM()) {
		// Accurate to the configured precision for any real argument
		retval = Expression.Number(decErf(x.getMultiplier().toDecimal()));
	} else if (Settings.EVALUATE && x.isComplex()) {
		const real = x.realPart();
		const imaginary = x.imagPart();
		if (real.isNUM() && imaginary.isNUM()) {
			const z = new Complex(real.getMultiplier().toDecimal(), imaginary.getMultiplier().toDecimal());
			// For larger arguments a different numerical method is needed to
			// avoid catastrophic cancellation in the alternating series.
			if (z.absSquared().lte(144)) {
				const value = erfComplex(z);
				retval = Expression.Number(value.re).plus(Expression.Number(value.im).i());
			} else {
				retval = Expression.toFunction(ERF, [Expression.create(x)]);
			}
		} else {
			retval = Expression.toFunction(ERF, [Expression.create(x)]);
		}
	} else {
		retval = Expression.toFunction(ERF, [Expression.create(x)]);
	}

	return retval;
}

/**
 * Computes the complementary error function: `erfc(x) = 1 − erf(x)`.
 *
 * Numeric arguments are evaluated directly rather than as `1 − erf(x)`, which would lose
 * all relative precision once erf(x) rounds to 1 (for example `erfc(7) ≈ 4.18e-23`).
 *
 * @param x - The input expression.
 * @returns The complementary error function value.
 *
 * @see {@link erf}
 *
 * @example
 * ```ts
 * erfc(Expression.create(0)).text()   // "1"
 * ```
 */
export function erfc(x: Expression): Expression {
	let retval: Expression;
	if (x.isNUM()) {
		const value = decErfc(x.getMultiplier().toDecimal());
		// erfc is never zero for a finite x, so zero means the result underflowed
		if (value.isZero()) {
			throw new UnsupportedOperationError(message('resultOutOfRange'));
		}
		retval = Expression.Number(value);
	}
	// Infinities and evaluated complex values have no direct erfc, so use erf.
	else if (x.isPosInf() || x.isNegInf() || (Settings.EVALUATE && x.isComplex())) {
		retval = one().minus(erf(x));
	}
	// Keep erfc as its own node so a value substituted later reaches the accurate
	// numeric erfc instead of cancelling in 1 - erf(x).
	else {
		retval = Expression.toFunction(ERFC, [x]);
	}
	return retval;
}
