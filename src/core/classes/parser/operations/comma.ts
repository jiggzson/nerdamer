import type { ParserStackValue } from '../types';

/**
 * The comma is essentially a prefix operator that just returns the object.
 *
 * @param a
 */
export function comma(a: ParserStackValue, b: ParserStackValue): ParserStackValue[] {
	return [a, b];
}
