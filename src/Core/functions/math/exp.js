import {Settings} from '../../../Settings';
import {Symbol} from '../../Symbol';
import {format} from '../../Utils';
import {pow} from '../index';
import {parse} from '../../parse';

/**
 * A symbolic extension for exp. This will auto-convert all instances of exp(x) to e^x.
 * Thanks @ Happypig375
 * @param {Symbol} symbol
 * @returns {Symbol}
 */
export function exp(symbol) {
    if (symbol.fname === Settings.LOG && symbol.isLinear()) {
        return pow(symbol.args[0], Symbol.create(symbol.multiplier));
    }
    return parse(format('e^({0})', symbol));
}
