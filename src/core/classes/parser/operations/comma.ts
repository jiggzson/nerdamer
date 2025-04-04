import { ParserSupportedType } from "../types";

/**
 * The comma is essentially a prefix operator that just returns the object.
 * 
 * @param a 
 */
export function comma(a: ParserSupportedType, b: ParserSupportedType) {
    return [a, b];
}