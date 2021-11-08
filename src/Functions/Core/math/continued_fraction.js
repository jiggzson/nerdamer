import {Math2} from '../../Math2';
import {Vector} from '../../../Types/Vector';
import {Symbol, symfunction} from '../../../Types/Symbol';
import {evaluate} from '../../../Parser/Parser';

/**
 * Returns the continued fraction of a number
 * @param {Symbol} symbol
 * @param {Symbol} n
 * @returns {Symbol | Vector}
 */
export function continued_fraction(symbol, n) {
    var _symbol = evaluate(symbol);

    if (_symbol.isConstant()) {
        var cf = Math2.continuedFraction(_symbol, n);
        //convert the fractions array to a new Vector
        var fractions = Vector.fromArray(cf.fractions.map(function (x) {
            return new Symbol(x);
        }));
        return Vector.fromArray([new Symbol(cf.sign), new Symbol(cf.whole), fractions]);
    }
    return symfunction('continued_fraction', arguments);
}
