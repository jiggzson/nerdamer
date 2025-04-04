import { arrayUnique } from "./utils";
import { decimalSplit } from "./string";

/**
 * Returns the absolute value of a bigint
 * 
 * @param x 
 * @returns 
 */
export function abs(x: bigint) {
    return x < 0n ? -x : x;
}

/**
 * Returns an array with unique values, sorted, and in reverse order.
 * 
 * @param array 
 * @returns 
 */
export function uniqueSortedArray(array: bigint[]) {
    return arrayUnique([].slice.call(array)
        .map(function (x: bigint) {
            return abs(x);
        }))
        .sort();
}

/**
 * Calculates the gcd of a set of bigints
 * 
 * @returns 
 */
export function GCD(...args: bigint[]) {
    // Get a unique set and convert to absolute values
    args = uniqueSortedArray(args)
    // Point to the first element
    let a = args[0];

    for (let i = 1; i < args.length; i++) {
        let b = args[i];
        while (true) {
            a %= b;
            if (a === 0n) {
                a = b;
                break;
            }
            b %= a;
            if (b === 0n)
                break;
            ;
        }
    }

    return a;
}

/**
 * Calculates the LCM of a set of bigints
 * 
 * @param args 
 */
export function LCM(...args: bigint[]) {
    // Get a unique set and convert to absolute values
    args = uniqueSortedArray(args);

    let a: bigint = args[0];

    for (let i = 1; i < args.length; i++) {
        const b = args[i];
        // Get the LCM of that of the last calculated LCM and the new number
        a = (a * b) / GCD(a, b);
    }

    return a;
}

/**
 * Simplifies a ratio of two bigints
 * 
 * @param numerator 
 * @param denominator 
 * @returns 
 */
export function simplifyRatio(numerator: bigint, denominator: bigint) {
    if (denominator !== 1n) {
        const gcd = GCD(denominator, numerator);
        return [numerator / gcd, denominator / gcd];
    }
    return [numerator, denominator];
}


/**
 * Converts a decimal number to a rational
 * 
 * @param numStr 
 * @returns 
 */
export function convert(numStr: string) {
    //Split the whole and decimal
    const [w, d] = decimalSplit(numStr);
    //Create the denominator based on the number of decimal places
    const denominator = 10n ** BigInt(d.length);
    const numerator = BigInt(w + d);

    return simplifyRatio(numerator, denominator);
}

/**
 * Returns the sign of a bigint
 * 
 * @param n 
 * @returns -1 if negative and 1 for positive and 0 for zero
 */
export function sign(n: bigint) {
    return n === 0n ? 0 : (n < 0n ? -1 : 1);
}

/**
 * Checks if a bigint is an even number
 * 
 * @param n 
 * @returns 
 */
export function isEven(n: bigint) {
    return n % 2n === 0n;
}


/**
 * The big number version
 */
export const factorial = (function () {
    const factorialCache = [1n, 1n];
    let i = 2;
    /**
     * Leverages JavaScript's native bigInt and the solution provide here: 
     * https://stackoverflow.com/questions/3959211/what-is-the-fastest-factorial-function-in-javascript
     * to provide a fast factorial function capable of calculating large numbers. 
     * 
     * @remarks
     * 
     * This is limited to Number.MAX_SAFE_INTEGER since n is of type number since for loop requires it
     * 
     * @param n - The factorial of the number being calculated
     * @returns The computed factorial
     */
    function bigFactorial(n: number) {
        // If there's a cached version return that instead
        if (typeof factorialCache[n] != 'undefined') {
            return String(factorialCache[n]);
        }

        let result = factorialCache[i - 1];

        for (; i <= n; i++) {
            factorialCache[i] = result = result * BigInt(i);
        }
        return result;
    }

    bigFactorial(100);

    return bigFactorial;
})();

// Cache the first 100
/**
 * Calculates the modulo of two numbers
 * 
 * @param a 
 * @param b 
 * @returns 
 */
export function mod(a: bigint, b: bigint) {
    const signA = sign(a);
    const signB = sign(b);
    let retval;
    if (signA === signB) {
        retval = a % b;
    }
    else {
        // https://stackoverflow.com/questions/4467539/javascript-modulo-gives-a-negative-result-for-negative-numbers
        retval = ((a % b) + b) % b;
    }

    return retval;
}


/**
 * The naive approach to finding the inverse mod
 * https://www.geeksforgeeks.org/multiplicative-inverse-under-modulo-m/
 * 
 * @param a 
 * @param m 
 * @returns 
 */
export function invMod(a: bigint, m: bigint) {
    let retval;

    if (GCD(a, m) > 1n) {
        retval = -1n;
    }
    else {
        for (let i = 1; i < m; i++) {
            const x = BigInt(i);
            if (((a % m) * (x % m)) % m === 1n) {
                retval = x;
                break;
            }
        }
    }

    return retval;
}

/**
 * Gets the product given a number range start and finish
 * 
 * @param start The start of the range
 * @param end The end of the range
 * @param step The increment step
 */
export function productInRange(start: number, end: number, step = 1) {
    let retval = BigInt(start);
    let n = BigInt(start);
    const i = BigInt(step);
    while (n < end) {
        n += i;
        retval *= n;
    }

    return retval;
}