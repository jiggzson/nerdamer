import {Symbol} from '../../../Types/Symbol';
import {add, divide, multiply, pow, subtract} from '../index';
import {Trig} from '../../Trig';
import {decompose_fn} from '../../../Core/Utils';
import {evaluate} from '../../../Parser/Parser';

/**
 * Returns the rectangular form of a complex number. Does not work for symbolic coefficients
 * @param {Symbol} symbol
 * @returns {Symbol}
 */
export function rectform(symbol) {
    //TODO: e^((i*pi)/4)
    var original = symbol.clone();
    try {
        var f, p, q, s, h, d, n;
        f = decompose_fn(symbol, 'e', true);
        p = divide(f.x.power, Symbol.imaginary());
        q = evaluate(Trig.tan(p));
        s = pow(f.a, new Symbol(2));
        d = q.getDenom(true);
        n = q.getNum();
        h = Symbol.hyp(n, d);
        //check
        if (h.equals(f.a)) {
            return add(d, multiply(Symbol.imaginary(), n));
        }
        else {
            return original;
        }
    }
    catch(e) {
        return original;
    }
}


