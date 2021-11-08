import {Vector} from '../../../../Types/Vector';
import {isVector} from '../../../../Core/Utils';

export function sort(symbol, opt) {
    opt = opt ? opt.toString() : 'asc';
    var getval = function (e) {
        if (e.group === N)
            return e.multiplier;
        if (e.group === FN) {
            if (e.fname === '')
                return getval(e.args[0]);
            return e.fname;
        }
        if (e.group === S)
            return e.power;

        return e.value;
    };
    var symbols = isVector(symbol) ? symbol.elements : symbol.collectSymbols();
    return new Vector(symbols.sort(function (a, b) {
        var aval = getval(a),
            bval = getval(b);
        if (opt === 'desc')
            return bval - aval;
        return aval - bval;
    }));
}

