import { getAssumptionFor } from '../../assumption/assume';
import { Expression } from '../../expression/Expression';
import { evaluate } from '../helpers';

import { canonicalizeRadicals } from './multiply';
import { subtract } from './subtract';

import type { ExpressionInputType } from '../types';

export { assume } from '../../assumption/assume';

/**
 * Checks if a is equal to b
 */
export function equal(a: ExpressionInputType, b: ExpressionInputType): boolean {
	a = Expression.create(a);
	b = Expression.create(b);

	const x = getAssumptionFor(a);
	const y = getAssumptionFor(b);
	let retval: boolean;
	// Compare the two assumptions. They have to be exactly the same
	if (x && y) {
		retval = x.eq(y);
	} else if (x) {
		retval = x.eq(b);
	} else if (y) {
		retval = y.eq(a);
	} else {
		let result: Expression;
		// Try the cheap comparison first. If they're NUM just extract
		if (a.isNUM() && b.isNUM()) {
			result = subtract(a, b);
		} else {
			// Canonicalize numeric radicals so they have a consistent form
			a = canonicalizeRadicals(a);
			b = canonicalizeRadicals(b);
			result = subtract(a, b).expand();
		}
		retval = result.isNUM() && result.getMultiplier().eq('0');
	}
	return retval;
}

/**
 * Checks if a is greater than b
 */
export function gt(a: ExpressionInputType, b: ExpressionInputType): boolean {
	// E.g. gt(9, 6); The difference is 9 - 6 = 3; Return 3 > 0
	a = Expression.create(a);
	b = Expression.create(b);

	const x = getAssumptionFor(a);
	const y = getAssumptionFor(b);

	if (x && y) {
		return x.gt(y);
	} else if (x) {
		return x.gt(b);
	} else if (y) {
		return y.lt(a);
	}

	const result = subtract(evaluate(String(a)), evaluate(String(b))).expand();
	return result.isNUM() && result.getMultiplier().gt('0');
}

/**
 * Checks if a is greater than or equal to b
 */
export function gte(a: ExpressionInputType, b: ExpressionInputType): boolean {
	return gt(a, b) || equal(a, b);
}

/**
 * Checks if a is less than b
 */
export function lt(a: ExpressionInputType, b: ExpressionInputType): boolean {
	a = Expression.create(a);
	b = Expression.create(b);

	const x = getAssumptionFor(a);
	const y = getAssumptionFor(b);

	if (x && y) {
		return x.lt(y);
	} else if (x) {
		return x.lt(b);
	} else if (y) {
		return y.gt(a);
	}

	// E.g. lt(9, 6); The difference is 9 - 6 = 3; Return 3 < 0
	const result = subtract(evaluate(String(a)), evaluate(String(b))).expand();
	return result.isNUM() && result.getMultiplier().lt('0');
}

/**
 * Checks if a is less than or equal to b
 */
export function lte(a: ExpressionInputType, b: ExpressionInputType): boolean {
	return lt(a, b) || equal(a, b);
}
