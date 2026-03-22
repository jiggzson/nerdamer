import { FACTORIAL } from '../../core/classes/parser/constants';

import type { Expression } from '../../core/classes/expression/Expression';

/**
 * Strategies
 *
 * Sums
 * ===================
 * Rewrite cos^2+sin^2=1
 * Rewrite sec^2-tan^2=1, csc^2-cot^2=1
 * Combine log terms: log(a)+log(b) → log(a·b)
 *
 * Products
 * ===================
 * Radicalize expression
 * Rewrite all trig functions as sin & cos and then fish back out other identities
 * Recursively call simplify until expression in === out
 * Factor the top polynomial by the bottom
 * Simplify factorial ratios: n!/(n+k)! → 1/((n+1)...(n+k))
 * Contract sin(u)*cos(u) → (1/2)*sin(2u)
 *
 * Functions
 * ==================
 * trigreduce: power reduction for sin²/cos² → half-angle form
 *
 * Factor out the GCD
 */

export function hasIrrationalDenominator(x: Expression) {
	const checkIrrationalDenominator = true;
	return x.hasRadical(checkIrrationalDenominator);
}

/**
 * Checks if a product expression contains at least two factorial terms
 * (one with positive power, one with negative), indicating a ratio that
 * can potentially be simplified.
 */
export function hasFactorialRatio(x: Expression): boolean {
	if (!x.isProduct()) {
		return false;
	}
	let hasPos = false;
	let hasNeg = false;
	for (const element of x.elementsArray()) {
		if (element.isFunction(FACTORIAL)) {
			if (element.getPower().sign() === 1) {
				hasPos = true;
			} else if (element.getPower().sign() === -1) {
				hasNeg = true;
			}
		}
	}
	return hasPos && hasNeg;
}
