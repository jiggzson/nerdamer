import { message } from '../../../errors';
import { Settings } from '../../../Settings';
import { Expression } from '../../expression/Expression';

import { add } from './add';

export function subtract(a: Expression, b: Expression): Expression {
	let retval;

	if (Settings.DEFER_SIMPLIFICATION) {
		retval = add(a, b.neg());
		retval.deferred = true;
	} else {
		if (a.isNUM() && b.isNUM()) {
			retval = Expression.fromRational(a.getMultiplier().minus(b.getMultiplier()));
		}
		// Infinity goes through add like everything else, which decides when the other
		// operand is finite. A symbol could itself be infinite, so x-Inf stays as it is.
		else {
			retval = add(a, b.neg());
		}

		if (!retval) {
			throw new Error(message('subtractionNotDefined', { leftType: String(a.type), rightType: String(b.type), left: String(a), right: String(b) }));
		}
	}

	return retval;
}

export function subtractPrefix(a: Expression) {
	// Just negates the multiplier
	const x = a.neg();
	return x;
}
