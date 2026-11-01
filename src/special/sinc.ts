import { Expression } from '../core/classes/expression/Expression';
import { one, zero } from '../core/classes/expression/shortcuts';
import { SINC } from '../core/constants/functionNames';
import { sinc as decSinc } from '../core/functions/decimal';
import { Settings } from '../core/Settings';
import { sin } from '../math/trig';

/**
 * Computes the normalized sinc function: `sinc(x) = sin(x) / x`.
 *
 * By convention, `sinc(0) = 1` (the removable singularity).
 * The function is even: `sinc(-x) = sinc(x)`.
 *
 * @param x - The input expression.
 * @returns The sinc function value.
 *
 * @example
 * ```ts
 * sinc(Expression.create(0)).text()     // "1"
 * sinc(Expression.create('x')).text()   // "sinc(x)"
 * ```
 */
export function sinc(x: Expression): Expression {
	let retval: Expression;

	if (x.isPosInf() || x.isNegInf()) {
		retval = zero();
	} else if (x.isZero()) {
		retval = one();
	} else if (sin(x).isZero()) {
		retval = zero();
	} else if (x.sign() === -1) {
		retval = sinc(x.neg());
	} else if (x.isNUM() && Settings.EVALUATE) {
		retval = Expression.Number(decSinc(x.getMultiplier().toDecimal()));
	} else if (Settings.EVALUATE) {
		retval = sin(x).div(x);
	} else {
		retval = Expression.toFunction(SINC, [Expression.create(x)]);
	}

	return retval;
}
