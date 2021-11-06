import {allConstants, allNumbers, allSame} from '../../Utils';
import {Symbol, symfunction} from '../../Symbol';
import {Settings} from '../../../Settings';
import {evaluate} from '../../parse';

/**
 * Returns minimum of a set of numbers
 * @returns {Symbol}
 */
export function min() {
    let args = [].slice.call(arguments);

    if (allSame(args))
        return args[0];

    if (allNumbers(args))
        return new Symbol(Math.min.apply(null, args));

    if (Settings.SYMBOLIC_MIN_MAX && allConstants(args))
        return symMinMax('min', args);

    return symfunction('min', args);
}



export function symMinMax(f, args) {
    args.map(function (x) {
        x.numVal = evaluate(x).multiplier;
    });
    let l, a, b;
    while(true) {
        l = args.length;
        if (l < 2)
            return args[0];
        a = args.pop();
        b = args[l - 2];
        if (f === 'min' ? a.numVal < b.numVal : a.numVal > b.numVal) {
            args.pop();
            args.push(a);
        }
    }
}
