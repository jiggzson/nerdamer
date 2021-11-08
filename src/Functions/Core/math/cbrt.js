import {Symbol, symfunction} from '../../../Types/Symbol';
import {isInt} from '../../../Core/Utils';
import {multiply, nthroot, pow} from '../index';
import {Groups} from '../../../Types/Groups';
import {parse} from '../../../Parser/Parser';

/**
 * The cube root function
 * @param {Symbol} symbol
 * @returns {Symbol}
 */
export function cbrt(symbol) {
    if (!symbol.isConstant(true)) {
        var retval;

        var n = symbol.power / 3;
        //take the cube root of the multplier
        var m = pow(parse(symbol.multiplier), new Symbol(1 / 3));
        //strip the multiplier
        var sym = symbol.toUnitMultiplier();

        //simplify the power
        if (isInt(n)) {
            retval = pow(sym.toLinear(), parse(n));
        }
        else {
            if (sym.group === Groups.CB) {
                retval = new Symbol(1);
                sym.each(function (x) {
                    retval = multiply(retval, cbrt(x));
                });
            }
            else {
                retval = symfunction('cbrt', [sym]);
            }
        }

        return multiply(m, retval);
    }
    return nthroot(symbol, new Symbol(3));
}
