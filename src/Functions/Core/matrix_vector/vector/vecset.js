/**
 * Set a value for a vector at a given index
 * @param {Vector} vector
 * @param {Number} index
 * @param {Symbol} value
 * @returns {Vector}
 */
import {symfunction} from '../../../../Types/Symbol';

export function vecset(vector, index, value) {
    if (!index.isConstant)
        return symfunction('vecset', arguments);
    vector.elements[index] = value;
    return vector;
}
