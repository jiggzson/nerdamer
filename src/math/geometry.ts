import { Expression } from '../core/classes/expression/Expression';
import { half, two } from '../core/classes/expression/shortcuts';
import { COS, SIN } from '../core/classes/parser/constants';
import { add } from '../core/classes/parser/operations/add';
import { power } from '../core/classes/parser/operations/power';

/**
 * Returns the symbolic hypotenuse of two expressions.
 *
 * Matching linear sine and cosine terms collapse through the Pythagorean identity;
 * otherwise the result is the principal square root of the sum of squares.
 */
export function hypot(a: Expression, b: Expression) {
	const fns = [SIN, COS];
	let retval: Expression;

	if (
		a.isFunction(fns) &&
		b.isFunction(fns) &&
		a.name !== b.name &&
		a.isLinear() &&
		b.isLinear() &&
		a.getMultiplier().eq(b.getMultiplier())
	) {
		retval = Expression.fromRational(a.getMultiplier());
	} else {
		const aSquared = power(a, two());
		const bSquared = power(b, two());
		retval = power(add(aSquared, bSquared), half());
	}

	return retval;
}
