import {Symbol} from '../../../Types/Symbol';
import {format} from '../../../Core/Utils';
import {Settings} from '../../../Settings';
import {multiply} from '../index';
import {parse} from '../../../Parser/Parser';

/**
 * Returns the polarform of a complex number
 * @param {Symbol} symbol
 * @returns {Symbol}
 */
export function polarform(symbol) {
    var p, r, e, theta;
    p = Symbol.toPolarFormArray(symbol);
    theta = p[1];
    r = p[0];
    e = parse(format('e^({0}*({1}))', Settings.IMAGINARY, theta));
    return multiply(r, e);
}
