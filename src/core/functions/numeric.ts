/* eslint-disable no-loss-of-precision */

import { JsFunction } from "../classes/parser/types";

/**
 * The factorial function for integers. This uses caching to speed up evaluation.
 */
export function factorial(x: number) {
    if (!isInt(x)) {
        return gamma(x + 1);
    }
    const cache = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800,
        479001600, 6227020800, 87178291200, 1307674368000, 20922789888000, 355687428096000,
        6402373705728000, 121645100408832000, 2432902008176640000, 51090942171709440000,
        1.1240007277776077e+21, 2.585201673888498e+22, 6.204484017332394e+23,
        1.5511210043330986e+25, 4.0329146112660565e+26, 1.0888869450418352e+28,
        3.0488834461171384e+29, 8.841761993739701e+30, 2.6525285981219103e+32]
    if (cache[x] !== undefined) {
        return cache[x];
    }

    const start = cache.length - 1;
    let result = cache[start];

    for (let i = start + 1; i <= x; i++) {
        result *= i;
    }
    return result;
}

/**
 * The gammaLN function which is used to compute the gamma function
 * Ported from: https://www.mrob.com/pub/ries/lanczos-gamma.html
 * 
 * @param x 
 */
export function gammaLN(z: number) {
    const g = 607 / 128;
    const N = 14;
    const lct = [
        0.9999999999999953,
        57.15623566586292,
        -59.59796035547549,
        14.136097974741746,
        -0.4919138160976202,
        0.00003399464998481189,
        0.00004652362892704858,
        -0.00009837447530487956,
        0.0001580887032249125,
        -0.00021026444172410488,
        0.00021743961811521265,
        -0.0001643181065367639,
        0.00008441822398385275,
        -0.000026190838401581408,
        0.0000036899182659531625
    ]

    let sum = 0;

    if (z < 0.5) {
        return Math.log(Math.PI / (Math.sin(z * Math.PI))) - gammaLN(1 - z);
    }

    z = z - 1;
    const base = z + g + 0.5;
    for (let i = N; i >= 1; i--) {
        sum += lct[i] / (z + i);
    }

    sum += lct[0];

    return ((Math.log(Math.sqrt(Math.PI * 2)) + Math.log(sum)) - base) + Math.log(base) * (z + 0.5);
}

/**
 * The gamma function
 * 
 * @param z 
 * @returns 
 */
export function gamma(z: number) {
    if (isInt(z) && z > 1) {
        return factorial(z - 1);
    }
    return Math.exp(gammaLN(z));
}

/**
 * The complementary error function 
 * https://en.wikipedia.org/wiki/Error_function 
 * 
 * @param x 
 */
export function erfc(x: number) {
    if (x < 0) {
        return 2 - erfc(-x);
    }
    const xsq = x ** 2;
    const a1 = 0.56418958354775629 / (x + 2.06955023132914151);
    const a2 = (xsq + 2.71078540045147805 * x + 5.80755613130301624) / (xsq + 3.47954057099518960 * x + 12.06166887286239555);
    const a3 = (xsq + 3.47469513777439592 * x + 12.07402036406381411) / (xsq + 3.72068443960225092 * x + 8.44319781003968454);
    const a4 = (xsq + 4.00561509202259545 * x + 9.30596659485887898) / (xsq + 3.90225704029924078 * x + 6.36161630953880464);
    const a5 = (xsq + 5.16722705817812584 * x + 9.12661617673673262) / (xsq + 4.03296893109262491 * x + 5.13578530585681539);
    const a6 = (xsq + 5.95908795446633271 * x + 9.19435612886969243) / (xsq + 4.11240942957450885 * x + 4.48640329523408675);

    return a1 * a2 * a3 * a4 * a5 * a6 * Math.exp(-xsq);
}

/**
 * The numeric error function
 * 
 * @param x 
 * @returns 
 */
export function erf(x: number) {
    return 1 - erfc(x);
}

/**
 * The GCD function
 * 
 * @param args 
 */
export function GCD(...args: number[]) {
    // Get the abs of the unique values and sort
    args = [...new Set(args)].map((x) => Math.abs(x)).sort();
    // Get the first element.
    let a = Math.abs(args.shift() as number);
    let n = args.length;

    while (n-- > 0) {
        let b = Math.abs(args.shift() as number);
        while (true) {
            a %= b;
            if (a === 0) {
                a = b;
                break;
            }
            b %= a;
            if (b === 0)
                break;
        }
    }
    return a;
}

/**
 * A utility function to check if a number is an integer
 * 
 * @param x 
 * @returns 
 */
export function isInt(x: number) {
    return x % 1 === 0;
}


/**
 * The numeric definitions used by build. 
 */
export const definitions: { [name: string]: [f: JsFunction, dependencies?: string[]] } = {
    erf: [erf, ['erfc']],
    erfc: [erfc],
    factorial: [factorial, ['isInt']],
    gammaLN: [gammaLN],
    isInt: [isInt],
    gamma: [gamma, ['gammaLN', 'isInt', 'factorial']],
    abs: [(x: number) => { return Math.abs(x) }],
    cos: [(x: number) => { return Math.cos(x); }],
    sin: [(x: number) => { return Math.sin(x); }],
    tan: [(x: number) => { return Math.tan(x); }],
    sec: [(x: number) => { return 1 / Math.cos(x); }],
    csc: [(x: number) => { return 1 / Math.sin(x); }],
    cot: [(x: number) => { return 1 / Math.tan(x); }],
    cosh: [(x: number) => { return Math.cosh(x); }],
    sinh: [(x: number) => { return Math.sinh(x); }],
    tanh: [(x: number) => { return Math.tanh(x); }],
    sech: [(x: number) => { return 1 / Math.cosh(x); }],
    csch: [(x: number) => { return 1 / Math.sinh(x); }],
    coth: [(x: number) => { return 1 / Math.tanh(x); }],

    sqrt: [(x: number) => { return Math.sqrt(x); }],
    log: [(x: number) => { return Math.log(x); }],
    gcd: [GCD],
}

/**
 * Multiplies an array of numbers
 * 
 * @param args 
 * @returns 
 */
export function product(...args: number[]) {
    let retval = 1;
    for (let i = 0; i < args.length; i++) {
        retval *= args[i];
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
    let retval = start;
    let n = start;
    while (n < end) {
        n += step;
        retval *= n;
    }

    return retval;
}

/**
 * Gets the average of a set of numbers
 * 
 * @param args 
 * @returns 
 */
export function avg(...args: number[]) {
    return sum(...args) / args.length;
}

/**
 * Sums an array of numbers
 * 
 * @param args 
 * @returns 
 */
export function sum(...args: number[]) {
    let retval = 0;
    for (let i = 0; i < args.length; i++) {
        retval += args[i];
    }

    return retval;
}

/**
 * Generates a random integer between a min and max
 * 
 * @param min 
 * @param max 
 * @returns 
 */
export function getRandomInt(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}