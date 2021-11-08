import {Symbol} from '../Types/Symbol';
import {add, divide} from '../Functions/Core';
import {isSymbol} from './Utils';
import {parse} from '../Parser/Parser';

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
