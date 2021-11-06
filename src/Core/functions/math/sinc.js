import {Settings} from '../../../Settings';
import {Symbol, symfunction} from '../../Symbol';
import {Math2} from '../../Math2';
import {format} from '../../Utils';
import {parse} from '../../parse';

/**
 * A symbolic extension for sinc
 * @param {Symbol} symbol
 * @returns {Symbol}
 */
export function sinc(symbol) {
    if (Settings.PARSE2NUMBER) {
        if (symbol.isConstant()) {
            return new Symbol(Math2.sinc(symbol));
        }
        return parse(format('sin({0})/({0})', symbol));
    }
    return symfunction('sinc', [symbol]);
}
