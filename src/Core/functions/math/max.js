import {allConstants, allNumbers, allSame} from '../../Utils';
import {Symbol, symfunction} from '../../Symbol';
import {Settings} from '../../../Settings';
import {symMinMax} from './min';

/**
 * Returns maximum of a set of numbers
 * @returns {Symbol}
 */
export function max() {
    let args = [].slice.call(arguments);

    if (allSame(args))
        return args[0];

    if (allNumbers(args))
        return new Symbol(Math.max.apply(null, args));

    if (Settings.SYMBOLIC_MIN_MAX && allConstants(args))
        return symMinMax('max', args);

    return symfunction('max', args);
}
