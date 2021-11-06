import {evaluate} from '../../../parse';
import {subtract} from '../../index';

/**
 * Removes duplicates from a vector
 * @param {Vector} vector
 * @param {Number} tolerance
 * @returns {Vector}
 */
export function vectrim(vector, tolerance) {
    tolerance = typeof tolerance === 'undefined' ? 1e-14 : tolerance;

    vector = vector.clone();

    tolerance = Number(tolerance);
    //place algebraic solutions first
    vector.elements.sort(function (a, b) {
        return b.group - a.group;
    });
    //depending on the start point we may have duplicates so we need to clean those up a bit.
    //start by creating an object with the solution and the numeric value. This way we don't destroy algebraic values
    vector.elements = removeDuplicates(vector.elements, function (a, b) {
        var diff = Number(subtract(evaluate(a), evaluate(b)).abs());
        return diff <= tolerance;
    });

    return vector;
}

/**
 * Removes duplicates from an array. Returns a new array
 * @param {Array} arr
 * @param {Function} condition
 */
function removeDuplicates(arr, condition) {
    var conditionType = typeof condition;

    if (conditionType !== 'function' || conditionType === 'undefined') {
        condition = function (a, b) {
            return a === b;
        };
    }

    var seen = [];

    while(arr.length) {
        var a = arr[0];
        //only one element left so we're done
        if (arr.length === 1) {
            seen.push(a);
            break;
        }
        var temp = [];
        seen.push(a); //we already scanned these
        for (var i = 1; i < arr.length; i++) {
            var b = arr[i];
            //if the number is outside the specified tolerance
            if (!condition(a, b))
                temp.push(b);
        }
        //start over with the remainder
        arr = temp;
    }

    return seen;
}
