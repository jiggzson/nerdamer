//object for functions which handle hyperbolic trig
import {Settings} from '../Settings';
import {Symbol, symfunction} from './Symbol';
import {format} from './Utils';
import {Complex} from './Complex';
import {add, divide, log, pow, sqrt, subtract} from './SymbolOperators/SymbolOperators';

export const TrigHyperbolic = {
    //container for hyperbolic trig function
    cosh: function (symbol) {
        var retval;
        if (Settings.PARSE2NUMBER) {
            if (symbol.isConstant())
                return new Symbol(Math.cosh(symbol.valueOf()));
            if (symbol.isImaginary()) {
                return Complex.evaluate(symbol, 'cosh');
            }
        }

        return symfunction('cosh', arguments);
    },
    sinh: function (symbol) {
        var retval;
        if (Settings.PARSE2NUMBER) {
            if (symbol.isConstant())
                return new Symbol(Math.sinh(symbol.valueOf()));
            if (symbol.isImaginary()) {
                return Complex.evaluate(symbol, 'sinh');
            }
        }

        return retval = symfunction('sinh', arguments);
    },
    tanh: function (symbol) {
        var retval;
        if (Settings.PARSE2NUMBER) {
            if (symbol.isConstant())
                return new Symbol(Math.tanh(symbol.valueOf()));
            if (symbol.isImaginary()) {
                return Complex.evaluate(symbol, 'tanh');
            }
        }

        return retval = symfunction('tanh', arguments);
    },
    sech: function (symbol) {
        var retval;
        if (Settings.PARSE2NUMBER) {
            if (symbol.isConstant()) {
                return new Symbol(Math.sech(symbol.valueOf()));
            }
            if (symbol.isImaginary()) {
                return Complex.evaluate(symbol, 'sech');
            }
            return TrigHyperbolic.$.parse(format('1/cosh({0})', symbol));
        }

        return retval = symfunction('sech', arguments);
    },
    csch: function (symbol) {
        var retval;
        if (Settings.PARSE2NUMBER) {
            if (symbol.isConstant())
                return new Symbol(Math.csch(symbol.valueOf()));
            if (symbol.isImaginary()) {
                return Complex.evaluate(symbol, 'csch');
            }
            return TrigHyperbolic.$.parse(format('1/sinh({0})', symbol));
        }

        return retval = symfunction('csch', arguments);
    },
    coth: function (symbol) {
        var retval;
        if (Settings.PARSE2NUMBER) {
            if (symbol.isConstant())
                return new Symbol(Math.coth(symbol.valueOf()));
            if (symbol.isImaginary()) {
                return Complex.evaluate(symbol, 'coth');
            }
            return TrigHyperbolic.$.parse(format('1/tanh({0})', symbol));
        }

        return retval = symfunction('coth', arguments);
    },
    acosh: function (symbol) {
        var retval;
        if (Settings.PARSE2NUMBER && symbol.isImaginary())
            retval = Complex.evaluate(symbol, 'acosh');
        else if (Settings.PARSE2NUMBER)
            retval = TrigHyperbolic.$evaluate(TrigHyperbolic.$.parse(format(Settings.LOG + '(({0})+sqrt(({0})^2-1))', symbol.toString())));
        else
            retval = symfunction('acosh', arguments);
        return retval;
    },
    asinh: function (symbol) {
        var retval;
        if (Settings.PARSE2NUMBER && symbol.isImaginary())
            retval = Complex.evaluate(symbol, 'asinh');
        else if (Settings.PARSE2NUMBER)
            retval = TrigHyperbolic.$evaluate(TrigHyperbolic.$.parse(format(Settings.LOG + '(({0})+sqrt(({0})^2+1))', symbol.toString())));
        else
            retval = symfunction('asinh', arguments);
        return retval;
    },
    atanh: function (symbol) {
        var retval;
        if (Settings.PARSE2NUMBER && symbol.isImaginary())
            retval = Complex.evaluate(symbol, 'atanh');
        else if (Settings.PARSE2NUMBER) {
            retval = TrigHyperbolic.$evaluate(TrigHyperbolic.$.parse(format('(1/2)*' + Settings.LOG + '((1+({0}))/(1-({0})))', symbol.toString())));
        }
        else
            retval = symfunction('atanh', arguments);
        return retval;
    },
    asech: function (symbol) {
        var retval;
        if (Settings.PARSE2NUMBER && symbol.isImaginary())
            retval = Complex.evaluate(symbol, 'asech');
        else if (Settings.PARSE2NUMBER)
            retval = TrigHyperbolic.$evaluate(log(add(symbol.clone().invert(), sqrt(subtract(pow(symbol, new Symbol(-2)), new Symbol(1))))));
        else
            retval = symfunction('asech', arguments);
        return retval;
    },
    acsch: function (symbol) {
        var retval;
        if (Settings.PARSE2NUMBER && symbol.isImaginary())
            retval = Complex.evaluate(symbol, 'acsch');
        else if (Settings.PARSE2NUMBER)
            retval = TrigHyperbolic.$evaluate(TrigHyperbolic.$.parse(format(Settings.LOG + '((1+sqrt(1+({0})^2))/({0}))', symbol.toString())));
        else
            retval = symfunction('acsch', arguments);
        return retval;
    },
    acoth: function (symbol) {
        var retval;
        if (Settings.PARSE2NUMBER && symbol.isImaginary())
            retval = Complex.evaluate(symbol, 'acoth');
        else if (Settings.PARSE2NUMBER) {
            if (symbol.equals(1))
                retval = Symbol.infinity();
            else
                retval = TrigHyperbolic.$evaluate(
                    divide(
                        log(divide(add(symbol.clone(), new Symbol(1)), subtract(symbol.clone(), new Symbol(1)))),
                        new Symbol(2)));
        }
        else
            retval = symfunction('acoth', arguments);
        return retval;
    }
};
