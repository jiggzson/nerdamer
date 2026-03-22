import { TRIG, INVERSE_TRIG, HYPERBOLIC_TRIG, INVERSE_HYPERBOLIC_TRIG } from '../../../math/trig';

import type { Expression } from './Expression';

// Trig helpers
/**
 * Checks if a function is a trig function
 * @param f
 * @returns
 */

export function isTrig(f: Expression) {
	return f.isFunction() && TRIG.includes(f.name!);
}
/**
 * Checks if a function is a inverse trig function
 * @param f
 * @returns
 */

export function isInverseTrig(f: Expression) {
	return f.isFunction() && INVERSE_TRIG.includes(f.name!);
}
/**
 * Checks if a function is a hyperbolic trig function
 * @param f
 * @returns
 */

export function isHyperbolicTrig(f: Expression) {
	return f.isFunction() && HYPERBOLIC_TRIG.includes(f.name!);
}
/**
 * Checks if a function is a hyperbolic trig function
 * @param f
 * @returns
 */
export function isInverseHyperbolicTrig(f: Expression) {
	return f.isFunction() && INVERSE_HYPERBOLIC_TRIG.includes(f.name!);
}
