import {Vector} from '../../../Parser/Vector';
import {Matrix} from '../../../Parser/Matrix';
import {Settings} from '../../../Settings';
import {isInt, isMatrix, isVector} from '../../Utils';
import {Math2} from '../../Math2';
import {Frac} from '../../Frac';
import {add} from '../operations/add';
import {Symbol, symfunction} from '../../Symbol';
import {parse} from '../../parse';
import {multiply, pow, subtract} from '../index';

export const FactorialDeps = {
    bigConvert: null
};

/**
 * The factorial function
 * @param {Symbol} symbol
 * @return {Symbol}
 */
export function factorial(symbol) {
    var retval;
    if (isVector(symbol)) {
        var V = new Vector();
        symbol.each(function (x, i) {
            //i start at one.
            V.set(i - 1, factorial(x));
        });
        return V;
    }
    if (isMatrix(symbol)) {
        var M = new Matrix();
        symbol.each(function (x, i, j) {
            //i start at one.
            M.set(i, j, factorial(x));
        });
        return M;
    }
    if (Settings.PARSE2NUMBER && symbol.isConstant()) {
        if (isInt(symbol)) {
            retval = Math2.bigfactorial(symbol);
        }
        else {
            retval = Math2.gamma(symbol.multiplier.add(new Frac(1)).toDecimal());
        }

        retval = FactorialDeps.bigConvert(retval);
        return retval;
    }
    else if (symbol.isConstant()) {
        var den = symbol.getDenom();
        if (den.equals(2)) {
            var num = symbol.getNum();
            var a, b, c, n;

            if (!symbol.multiplier.isNegative()) {
                n = add(num, new Symbol(1)).multiplier.divide(new Frac(2));
                a = Math2.bigfactorial(new Frac(2).multiply(n));
                b = pow(new Symbol(4), new Symbol(n)).multiplier.multiply(Math2.bigfactorial(n));
            }
            else {
                n = subtract(num.negate(), new Symbol(1)).multiplier.divide(new Frac(2));
                a = pow(new Symbol(-4), new Symbol(n)).multiplier.multiply(Math2.bigfactorial(n));
                b = Math2.bigfactorial(new Frac(2).multiply(n));
            }
            c = a.divide(b);
            return multiply(parse('sqrt(pi)'), new Symbol(c));
        }
    }
    return symfunction(Settings.FACTORIAL, [symbol]);
}
