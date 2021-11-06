/**
 * Returns the error function
 * @param {Symbol} symbol
 * @returns {Symbol}
 */
import {Complex} from '../../Complex';
import {symfunction} from '../../Symbol';
import {evaluate} from '../../parse';

export function erf(symbol) {
    var _symbol = evaluate(symbol);

    if (_symbol.isConstant()) {
        return Math2.erf(_symbol);
    }
    else if (_symbol.isImaginary()) {
        return Complex.erf(symbol);
    }
    return symfunction('erf', arguments);
}
