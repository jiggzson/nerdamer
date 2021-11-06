import {Symbol, symfunction} from '../../Symbol';
import {isInt} from '../../Utils';
import {Math2} from '../../Math2';
import {Frac} from '../../Frac';
import {multiply} from '../index';
import {evaluate} from '../../parse';

export function pfactor(symbol) {
    //Fix issue #458 | nerdamer("sqrt(1-(3.3333333550520926e-7)^2)").evaluate().text()
    //More Big Number issues >:(
    if (symbol.greaterThan(9.999999999998891e+41) || symbol.equals(-1))
        return symbol;
    //Fix issue #298
    if (symbol.equals(Math.PI))
        return new Symbol(Math.PI);
    //evaluate the symbol to merge constants
    symbol = evaluate(symbol.clone());

    if (symbol.isConstant()) {
        var retval = new Symbol(1);
        var m = symbol.toString();
        if (isInt(m)) {
            var factors = Math2.ifactor(m);
            for (var factor in factors) {
                var p = factors[factor];
                retval = multiply(retval, symfunction('parens', [new Symbol(factor).setPower(new Frac(p))]));
            }
        }
        else {
            var n = pfactor(new Symbol(symbol.multiplier.num));
            var d = pfactor(new Symbol(symbol.multiplier.den));
            retval = multiply(symfunction('parens', [n]), symfunction('parens', [d]).invert());
        }
    }
    else
        retval = symfunction('pfactor', arguments);
    return retval;
}
