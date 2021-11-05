import {Settings} from "../Settings";

/**
 * Rounds a number up to x decimal places
 * @param {number} x
 * @param {number} s
 */
export function nround(x: string, s?: number) {
    if (isInt(x)) {
        let xn = Number(x);
        if (xn >= Number.MAX_VALUE) {
            return x.toString();
        }

        return Number(x);
    }

    s = s === undefined ? 14 : s;
    return Math.round(Number(x) * Math.pow(10, s)) / Math.pow(10, s);
}

/**
 * Checks to see if a number is an integer
 * @param {number} value
 */
export function isInt(value: number | string) {
    return /^[-+]?\d+e?\+?\d*$/gim.test(value.toString());
}

/**
 * Checks if number is a prime number
 * @param {Number} n - the number to be checked
 */
export function isPrime(n: number) {
    let q = Math.floor(Math.sqrt(n));
    for (let i = 2; i <= q; i++) {
        if (n % i === 0)
            return false;
    }
    return true;
}

/**
 * Checks if n is a number
 * @param {any} n
 */
export function isNumber(n: string) {
    return /^\d+\.?\d*$/.test(n);
}

// Is thrown if variable name violates naming rule
class InvalidVariableNameError extends Error {
    name = 'InvalidVariableNameError';
}

/**
 * Enforces rule: "must start with a letter or underscore and
 * can have any number of underscores, letters, and numbers thereafter."
 * @param {string} name The name of the symbol being checked
 * @param {string} typ - The type of symbols that's being validated
 * @throws {InvalidVariableNameError}  - Throws an exception on fail
 */
export function validateName(name: string, typ: string = 'variable') {
    if (Settings.ALLOW_CHARS.indexOf(name) !== -1)
        return;

    const regex = Settings.VALIDATION_REGEX;

    if (!(regex.test(name))) {
        throw new InvalidVariableNameError(name + ' is not a valid ' + typ + ' name')
    }
}

/**
 * Strips duplicates out of an array
 * @param {Array} arr
 */
export function arrayUnique(arr: any[]) {
    const l = arr.length, a = [];

    for (let i = 0; i < l; i++) {
        let item = arr[i];
        if (a.indexOf(item) === -1) {
            a.push(item);
        }
    }

    return a;
}

/**
 * Returns the minimum number in an array
 * @param {Array} arr
 * @returns {Number}
 */
export function arrayMax(arr: any[]) {
    return Math.max.apply(undefined, arr);
}

/**
 * Returns the maximum number in an array
 * @param {Array} arr
 * @returns {Number}
 */
export function arrayMin(arr: any[]) {
    return Math.min.apply(undefined, arr);
}

/**
 * Used to pass warnings or low severity errors about the library
 * @param msg
 */
export const WARNINGS: string[] = [];
export function warn(msg: string) {
    WARNINGS.push(msg);
    if (Settings.SHOW_WARNINGS && console && console.warn) {
        console.warn(msg);
    }
}


/**
 * Checks to see if a number is an even number
 * @param {Number} num
 * @returns {boolean}
 */
export function even(num: number) {
    return num % 2 === 0;
}
