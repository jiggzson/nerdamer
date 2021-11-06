import {Symbol, symfunction} from '../../Symbol';
import {parse} from '../../parse';

/**
 * Returns the arugment of a complex number
 * @param {Symbol} symbol
 * @returns {Symbol}
 */
export function arg(symbol) {
    var re = symbol.realpart();
    var im = symbol.imagpart();
    if (re.isConstant() && im.isConstant()) {
        if (im.equals(0) && re.equals(-1)) {
            return parse('pi');
        }
        else if (im.equals(1) && re.equals(0)) {
            return parse('pi/2');
        }
        else if (im.equals(1) && re.equals(1)) {
            return parse('pi/4');
        }
        return new Symbol(Math.atan2(im, re));
    }
    return symfunction('atan2', [im, re]);
}
