import {isNumericSymbol, isSymbol, Symbol, symfunction} from '../../Symbol';
import {Settings} from '../../../Settings';
import {UndefinedError} from '../../Errors';
import {Complex} from '../../Complex';
import {Groups} from '../../Groups';
import {parse} from '../../parse';
import {add} from '../operations/add';
import {divide, multiply} from '../index';

/**
 * The log function
 * @param {Symbol} symbol
 * @param {Symbol} base
 * @returns {Symbol}
 */
export function log(symbol, base) {

    if (symbol.equals(1)) {
        return new Symbol(0);
    }

    var retval;

    if (symbol.fname === Settings.SQRT && symbol.multiplier.equals(1)) {
        retval = divide(log(symbol.args[0]), new Symbol(2));

        if (symbol.power.sign() < 0) {
            retval.negate();
        }

        // Exit early
        return retval;
    }

    //log(0) is undefined so complain
    if (symbol.equals(0)) {
        throw new UndefinedError(Settings.LOG + '(0) is undefined!');
    }

    //deal with imaginary values
    if (symbol.isImaginary()) {
        return Complex.evaluate(symbol, Settings.LOG);
    }

    if (symbol.isConstant() && typeof base !== 'undefined' && base.isConstant()) {
        var log_sym = Math.log(symbol);
        var log_base = Math.log(base);
        retval = new Symbol(log_sym / log_base);
    }
    else if (symbol.group === Groups.EX && symbol.power.multiplier.lessThan(0) || symbol.power.toString() === '-1') {
        symbol.power.negate();
        //move the negative outside but keep the positive inside :)
        retval = log(symbol).negate();
    }
    else if (symbol.value === 'e' && symbol.multiplier.equals(1)) {
        var p = symbol.power;
        retval = isSymbol(p) ? p : new Symbol(p);
    }
    else if (symbol.group === Groups.FN && symbol.fname === 'exp') {
        var s = symbol.args[0];
        if (symbol.multiplier.equals(1))
            retval = multiply(s, new Symbol(symbol.power));
        else
            retval = symfunction(Settings.LOG, [symbol]);
    }
    else if (Settings.PARSE2NUMBER && isNumericSymbol(symbol)) {
        // Parse for safety.
        symbol = parse(symbol);

        var img_part;
        if (symbol.multiplier.lessThan(0)) {
            symbol.negate();
            img_part = multiply(new Symbol(Math.PI), new Symbol('i'));
        }

        retval = new Symbol(Math.log(symbol.multiplier.toDecimal()));

        if (img_part) {
            retval = add(retval, img_part);
        }

    }
    else {
        var s;
        if (!symbol.power.equals(1) && !symbol.contains('e')) {
            s = symbol.group === Groups.EX ? symbol.power : new Symbol(symbol.power);
            symbol.toLinear();
        }
        //log(a,a) = 1 since the base is allowed to be changed.
        //This was pointed out by Happypig375 in issue #280
        if (arguments.length > 1 && allSame(arguments)) {
            retval = new Symbol(1);
        }
        else {
            retval = symfunction(Settings.LOG, arguments);
        }

        if (s)
            retval = multiply(s, retval);
    }

    return retval;
}
