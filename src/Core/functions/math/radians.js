import {format} from '../../Utils';
import {parse} from '../../parse';

/**
 * Converts value degrees to radians
 * @param {Symbol} symbol
 * @returns {Symbol}
 */
export function radians(symbol) {
    return parse(format('({0})*pi/180', symbol));
}
