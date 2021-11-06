import {Symbol, symfunction} from '../../Symbol';
import {evaluate} from '../../parse';

/**
 * Returns the sign of a number
 * @param {Symbol} x
 * @returns {Symbol}
 */
export function sign(x) {
    if (x.isConstant(true)) {
        return new Symbol(Math.sign(evaluate(x)));
    }

    return symfunction('sign', arguments);
}
