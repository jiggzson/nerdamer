import { Complex } from '../core/classes/complex/Complex';
import { Expression } from '../core/classes/expression/Expression';
import { one } from '../core/classes/expression/shortcuts';
import { ERF } from '../core/constants/functionNames';
import { erf as decErf, erfComplex } from '../core/functions/decimal';
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
		const m = x.getMultiplier();
		// Gives junk values after erf > 6.7
		if (m.gt('6.5')) {
			retval = one();
		} else {
			// Calculate it's numeric value
			retval = Expression.Number(decErf(m.toDecimal()));
		}
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
 * @param x - The input expression.
 * @returns The complementary error function value.
 *
 * @see {@link erf}
 *
 * @example
 * ```ts
 * erfc(Expression.create(0)).text()   // "0"
 * ```
 */
export function erfc(x: Expression): Expression {
	return one().minus(erf(x));
}
