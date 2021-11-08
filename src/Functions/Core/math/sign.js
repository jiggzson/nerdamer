import {Symbol, symfunction} from '../../../Types/Symbol';
import {evaluate} from '../../../Parser/Parser';

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
