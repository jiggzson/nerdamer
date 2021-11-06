import {format} from '../../Utils';
import {parse} from '../../parse';

/**
 * Converts value from radians to degrees
 * @param {Symbol} symbol
 * @returns {Symbol}
 */
export function degrees(symbol) {
    return parse(format('({0})*180/pi', symbol));
}
