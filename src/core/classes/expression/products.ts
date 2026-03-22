import { one, zero } from './shortcuts';

import type { Expression } from './Expression';

/**
 * Similar to hasVariable but is extended to products
 *
 * @param x
 * @param y
 */

export function contains(x: Expression, y: Expression) {
	// If it's an integer then it's always true
	let retval = false;

	// If y is a multiple of x's multiplier then return true
	const m = x.getMultiplier().abs();
	const n = y.getMultiplier().abs();

	// The division can only occur if y's multiplier is an integer multiple of x's multiplier
	if (m.isInteger() && n.isInteger() && m.gte(n)) {
		// Multiples of the integers are a good match so we're done.
		if (y.isNUM()) {
			retval = true;
		} else if (x.isProduct()) {
			// If it's a variable then just check if it has that variable
			if (y.isVAR()) {
				retval = x.hasVariable(y.value);
			} else if (y.isProduct()) {
				// We check each variable granted that
				// 1 - It's not under the denominator
				// 2 - It's of type VAR
				const variables = y.elementsArray();
				for (let i = 0; i < variables.length; i++) {
					const v = variables[i];
					// We check of the above-mentioned conditions. If any of them are true do
					// nothing. Otherwise pass it.
					const p = v.getPower();
					if (v.isVAR() && x.hasVariable(v.value) && p.isInteger() && p.gt(zero())) {
						retval = true;
					}

					// If any of the variables doesn't pass then we're done and exit.
					else {
						retval = false;
						break;
					}
				}
			}
		}
	}

	return retval;
} /**
 * Removes the multiplier and constants wrt to a given variable
 * @param expression
 * @param wrtVariable
 */

export function constantsFreeProduct(expression: Expression, wrtVariable: string) {
	// Remove the multiplier
	let constants = expression.getMultiplier(true);
	expression = expression.toUnitMultiplier();
	// Products are always power of one
	// TODO: Move to helper called constantsFree
	if (expression.isProduct() && expression.isLinear()) {
		// Remove the constants
		// e.g. a*(cos(x)+sin(x))
		let constantFree = one();
		expression.each(e => {
			if (!e.hasVariable(wrtVariable)) {
				constants = constants.times(e);
			} else {
				constantFree = constantFree.times(e);
			}
			expression = constantFree;
		});
	}
	return {
		constants,
		expression,
	};
}
/**
 * Splits a product into its factors e.g. a^2*b^3 will return [a, a, b, b, b]
 * @param f
 * @param factors
 * @returns
 */

export function splitProductFactors(f: Expression, factors?: Expression[]): Expression[] {
	// Only products need apply
	if (!f.isProduct()) {
		return [f];
	}

	factors ??= [];
	f.each(e => {
		// Check the exponent. If it has a integer multiplier > 1 then split
		const p = e.getPower();
		const pm = p.getMultiplier();
		if (pm.isInteger() && pm.gt(one())) {
			const ps = p.toUnitMultiplier();
			// Get the base
			const base = e.toLinearAndUnitMultiplier();
			for (let i = 0; i < Number(pm.numerator); i++) {
				factors.push(base.pow(ps));
			}
		} else if (e.isProduct()) {
			splitProductFactors(e, factors);
		} else {
			factors.push(e);
		}
	});

	return factors;
}
