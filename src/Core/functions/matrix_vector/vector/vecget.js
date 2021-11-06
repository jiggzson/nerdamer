import {isInt} from '../../../Utils';
import {symfunction} from '../../../Symbol';

/**
 * Retrieves and item from a vector
 * @param {Vector} vector
 * @param {Number} index
 * @returns {Vector|Symbol}
 */
export function vecget(vector, index) {
    if (index.isConstant() && isInt(index))
        return vector.elements[index];
    return symfunction('vecget', arguments);
}
