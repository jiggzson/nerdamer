
/**
 * Removes duplicates from an array
 * 
 * @param arr 
 * @returns 
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function arrayUnique(arr: any[]) {
    return [...new Set(arr)]
}

/**
 * Similar to concat but only adds elements if they're unique
 * 
 * @param fromArray The array being added from 
 * @param toArray The array being added to 
 */
export function arrayAddUnique<T>(fromArray: T[], toArray: T[]): T[] {
    for (const x of fromArray) {
        if (!toArray.includes(x)) {
            toArray.push(x);
        }
    }

    return toArray;
}

/**
 * Checks to see if the inverse of decimal is within a max bound. 
 * For example: given the number 0.01 it will return true for 0 - 100
 * 
 * @param n 
 * @param max 
 * @returns 
 */
export function checkDecimal(n: number, max: number) {
    return 1 / (n % 1) <= max;
}


export function isSorted<T>(arr: T[]) {
    if (arr.length <= 1) {
        return true; // An empty array or an array with one element is considered sorted
    }

    for (let i = 1; i < arr.length; i++) {
        if (arr[i - 1] > arr[i]) {
            return false; // If any element is smaller than the previous one, the array is not sorted
        }
    }
    return true; // If the loop completes without returning false, the array is sorted
}