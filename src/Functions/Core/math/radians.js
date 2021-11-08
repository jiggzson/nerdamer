import {format} from '../../../Core/Utils';
import {parse} from '../../../Parser/Parser';

/**
 * Converts value degrees to radians
 * @param {Symbol} symbol
 * @returns {Symbol}
 */
export function radians(symbol) {
    return parse(format('({0})*pi/180', symbol));
}
