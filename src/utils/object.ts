/**
 * Get the first encountered element in an object
 * 
 * @param obj Any object 
 * @returns The first element encountered
 */

import { getRandomInt } from "../core/functions/numeric";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function anyObject(obj: { [key: string]: any }) {
    for (const x in obj)
        return obj[x];
}

/**
 * Converts an array to an object with the key specified as a callback.
 * 
 * @param arr 
 * @param key 
 * @returns 
 */
export function arrayToObject<T>(arr: T[], key: (k: T, i?: number) => (number | string)) {
    const obj: { [key: (number | string)]: unknown } = {};
    for (let i = 0; i < arr.length; i++) {
        const e = arr[i];
        obj[key(e, i)] = e;
    }

    return obj;
}

/**
 * Generates a random object that can be used to evaluate a function
 * 
 * @param vars 
 * @param min 
 * @param max 
 * @returns 
 */
export function randomEvalObj(vars: string[], min: number = 2, max?: number) {
    const evalObj: { [variable: string]: number } = {};
    max ??= (vars.length + 2) * 2;
    // Avoid duplicate numbers
    const values: number[] = [];
    for (const v of vars) {
        let randomInt = getRandomInt(min, max);
        // Select a random number which hasn't been chosen already
        while (values.includes(randomInt)) {
            randomInt = getRandomInt(min, max);
        }
        values.push(randomInt);
        evalObj[v] = randomInt;
    }

    return evalObj;
}