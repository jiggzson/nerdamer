import {Symbol} from './Symbol';
import {add, divide} from './functions';
import {parse} from './parse';
import {isSymbol} from './Utils';

/**
 * Returns the sum of an array
 * @param {Array} arr
 * @param {boolean} toNumber
 * @returns {Symbol}
 */
export function arraySum(arr: any[], toNumber = false) {
    var sum = new Symbol(0);
    for (var i = 0; i < arr.length; i++) {
        var x = arr[i];
        // Convert to symbol if not
        sum = add(sum, !isSymbol(x) ? parse(x) : x);
    }

    return toNumber ? Number(sum) : sum;
}
