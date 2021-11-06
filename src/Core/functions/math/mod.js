import {Symbol, symfunction} from '../../Symbol';
import {isInt} from '../../Utils';
import {divide} from '../index';

/**
 * The mod function
 * @param {Symbol} symbol1
 * @param {Symbol} symbol2
 * @returns {Symbol}
 */
export function mod(symbol1, symbol2) {
    if (symbol1.isConstant() && symbol2.isConstant()) {
        var retval = new Symbol(1);
        retval.multiplier = retval.multiplier.multiply(symbol1.multiplier.mod(symbol2.multiplier));
        return retval;
    }
    //try to see if division has remainder of zero
    var r = divide(symbol1.clone(), symbol2.clone());
    if (isInt(r))
        return new Symbol(0);
    return symfunction('mod', [symbol1, symbol2]);
}
