import {isNumericSymbol} from '../../../Core/Utils';

/**
 * A branghing function
 * @param {Boolean} condition
 * @param {Symbol} a
 * @param {Symbol} b
 * @returns {Symbol}
 */
export function IF(condition, a, b) {
    if (typeof condition !== 'boolean') {
        if (isNumericSymbol(condition)) {
            condition = !!Number(condition);
        }
    }
    if (condition) {
        return a;
    }

    return b;
}
