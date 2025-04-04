import { evaluate } from ".";
import { subtract } from "./subtract";
import { SupportedInputType } from "../types";


// TODO: Support assumptions. Supporting assumptions allows for variable comparison.
// If it is assumed that x > 5 and y < 0 then we can safely return true for x > y.
// Additionally, complex numbers should be supported.

/**
 * Checks if a is equal to b
 * 
 * @param a 
 * @param b 
 * @returns 
 */
export function equal(a: SupportedInputType, b: SupportedInputType) {
    // Subtract them and see if they result in the number zero
    const result = subtract(evaluate(String(a)), evaluate(String(b)));
    return result.isNUM() && result.getMultiplier().eq('0');
}

/**
 * Checks if a is greater than b
 * 
 * @param a 
 * @param b 
 * @returns 
 */
export function gt(a: SupportedInputType, b: SupportedInputType) {
    // E.g. gt(9, 6); The difference is 9 - 6 = 3; Return 3 > 0
    const result = subtract(evaluate(String(a)), evaluate(String(b)));
    return result.isNUM() && result.getMultiplier().gt('0');
}

/**
 * Checks if a is greater than or equal to b
 * 
 * @param a 
 * @param b 
 * @returns 
 */
export function gte(a: SupportedInputType, b: SupportedInputType) {
    return gt(a, b) || equal(a, b);
}

/**
 * Checks if a is less than b
 * 
 * @param a 
 * @param b 
 * @returns 
 */
export function lt(a: SupportedInputType, b: SupportedInputType) {
    // E.g. lt(9, 6); The difference is 9 - 6 = 3; Return 3 < 0
    const result = subtract(evaluate(String(a)), evaluate(String(b)));
    return result.isNUM() && result.getMultiplier().lt('0');
}

/**
 * Checks if a is less than or equal to b
 * 
 * @param a 
 * @param b 
 * @returns 
 */
export function lte(a: SupportedInputType, b: SupportedInputType) {
    return lt(a, b) || equal(a, b);
}