import type { ParserInputType } from '../types';

/**
 * The comma is essentially a prefix operator that just returns the object.
 *
 * @param a
 */
export function comma(a: ParserInputType, b: ParserInputType) {
	return [a, b];
}
