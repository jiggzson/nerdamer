import {Symbol, symfunction} from '../../Symbol';
import {add} from '../operations/add';
import {even, isNumericSymbol} from '../../Utils';
import {Math2} from '../../Math2';
import {Frac} from '../../Frac';
import {parse} from '../../parse';
import {Settings} from '../../../Settings';
import {multiply, pow, sqrt} from '../index';

export function abs(symbol) {

    //|-∞| = ∞
    if (symbol.isInfinity) {
        return Symbol.infinity();
    }
    if (symbol.multiplier.lessThan(0))
        symbol.multiplier.negate();

    if (symbol.isImaginary()) {
        var re = symbol.realpart();
        var im = symbol.imagpart();
        if (re.isConstant() && im.isConstant())
            return sqrt(add(pow(re, new Symbol(2)), pow(im, new Symbol(2))));
    }
    else if (isNumericSymbol(symbol) || even(symbol.power)) {
        return symbol;
    }

    if (symbol.isComposite()) {
        var ms = [];
        symbol.each(function (x) {
            ms.push(x.multiplier);
        });
        var gcd = Math2.QGCD.apply(null, ms);
        if (gcd.lessThan(0)) {
            symbol.multiplier = symbol.multiplier.multiply(new Frac(-1));
            symbol.distributeMultiplier();
        }
    }

    //convert |n*x| to n*|x|
    var m = parse(symbol.multiplier);
    symbol.toUnitMultiplier();

    return multiply(m, symfunction(Settings.ABS, [symbol]));
}
