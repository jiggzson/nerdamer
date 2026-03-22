import { Expression } from '../core/classes/expression/Expression';
import { two } from '../core/classes/expression/shortcuts';
import { add } from '../core/classes/parser/operations/add';
import { power } from '../core/classes/parser/operations/power';

import { sqrt } from './math';
import { SIN, COS } from './trig';

/**
 * The hypotenuse function
 *
 * @param a
 * @param b
 * @returns
 */
export function hypot(a: Expression, b: Expression) {
	// sqrt(a*sin(x)^2+b*cos(x)^2) where a = b
	const fns = [SIN, COS];
	let retval;
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
		// sqrt(a^2+b^2)
		const aSquared = power(a, two());
		const bSquared = power(b, two());
		retval = sqrt(add(aSquared, bSquared));
	}
	return retval;
}
