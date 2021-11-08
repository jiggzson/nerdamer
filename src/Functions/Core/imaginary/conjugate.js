import {Symbol} from '../../../Types/Symbol';
import {add, multiply} from '../index';

/**
 * Computes the conjugate of a complex number
 * @param {Symbol} symbol
 * @returns {Symbol}
 */
export function conjugate(symbol) {
    var re = symbol.realpart();
    var im = symbol.imagpart();
    return add(re, multiply(im.negate(), Symbol.imaginary()));
}
