import {format} from '../../../Core/Utils';
import {parse} from '../../../Parser/Parser';

/**
 * Converts value from radians to degrees
 * @param {Symbol} symbol
 * @returns {Symbol}
 */
export function degrees(symbol) {
    return parse(format('({0})*180/pi', symbol));
}
