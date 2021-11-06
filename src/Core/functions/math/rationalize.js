import {Symbol} from '../../Symbol';
import {expand} from './expand';
import {add} from '../operations/add';
import {divide, multiply} from '../index';

/**
 * Rationalizes a symbol
 * @param {Symbol} symbol
 * @returns {Symbol}
 */
export function rationalize(symbol) {
    if (symbol.isComposite()) {
        var retval = new Symbol(0);
        var num, den, retnum, retden, a, b, n, d;
        symbol.each(function (x) {
            num = x.getNum();
            den = x.getDenom();
            retnum = retval.getNum();
            retden = retval.getDenom();
            a = multiply(den, retnum);
            b = multiply(num, retden);
            n = expand(add(a, b));
            d = multiply(retden, den);
            retval = divide(n, d);
        }, true);

        return retval;
    }
    return symbol;
}
