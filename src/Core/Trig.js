//object for functions which handle trig
import {Symbol, symfunction} from './Symbol';
import {Settings} from '../Settings';
import bigDec from 'decimal.js';
import {even, format, isInt} from './Utils';
import {Math2} from './Math2';
import {Complex} from './Complex';
import {OutOfFunctionDomainError, UndefinedError} from './Errors';
import {getQuadrant} from './Frac';

export const Trig = {
    //container for trigonometric function
    cos: function (symbol) {
        if (symbol.equals('pi') && symbol.multiplier.den.equals(2))
            return new Symbol(0);

        if (Settings.PARSE2NUMBER) {
            if (symbol.equals(new Symbol(Settings.PI / 2)))
                return new Symbol(0);
            if (symbol.isConstant()) {
                if (Settings.USE_BIG) {
                    return new Symbol(bigDec.cos(symbol.multiplier.toDecimal()));
                }

                return new Symbol(Math.cos(symbol.valueOf()));
            }
            if (symbol.isImaginary()) {
                return Complex.evaluate(symbol, 'cos');
            }
        }
        if (symbol.equals(0))
            return new Symbol(1);

        var retval,
            c = false,
            q = getQuadrant(symbol.multiplier.toDecimal()),
            m = symbol.multiplier.abs();
        symbol.multiplier = m;

        if (symbol.isPi() && symbol.isLinear()) {
            //return for 1 or -1 for multiples of pi
            if (isInt(m)) {
                retval = new Symbol(even(m) ? 1 : -1);
            }
            else {
                var n = Number(m.num), d = Number(m.den);
                if (d === 2)
                    retval = new Symbol(0);
                else if (d === 3) {
                    retval = Trig.$.parse('1/2');
                    c = true;
                }
                else if (d === 4) {
                    retval = Trig.$.parse('1/sqrt(2)');
                    c = true;
                }
                else if (d === 6) {
                    retval = Trig.$.parse('sqrt(3)/2');
                    c = true;
                }
                else
                    retval = symfunction('cos', [symbol]);
            }
        }

        if (c && (q === 2 || q === 3))
            retval.negate();

        if (!retval)
            retval = symfunction('cos', [symbol]);

        return retval;
    },
    sin: function (symbol) {
        if (Settings.PARSE2NUMBER) {
            if (symbol.isConstant()) {
                if (symbol % Math.PI === 0) {
                    return new Symbol(0);
                }

                if (Settings.USE_BIG) {
                    return new Symbol(bigDec.sin(symbol.multiplier.toDecimal()));
                }

                return new Symbol(Math.sin(symbol.valueOf()));
            }
            if (symbol.isImaginary())
                return Complex.evaluate(symbol, 'sin');
        }

        if (symbol.equals(0))
            return new Symbol(0);

        var retval,
            c = false,
            q = getQuadrant(symbol.multiplier.toDecimal()),
            sign = symbol.multiplier.sign(),
            m = symbol.multiplier.abs();
        symbol.multiplier = m;
        if (symbol.equals('pi'))
            retval = new Symbol(0);
        else if (symbol.isPi() && symbol.isLinear()) {
            //return for 0 for multiples of pi
            if (isInt(m)) {
                retval = new Symbol(0);
            }
            else {
                var n = m.num, d = m.den;
                if (d == 2) {
                    retval = new Symbol(1);
                    c = true;
                }
                else if (d == 3) {
                    retval = Trig.$.parse('sqrt(3)/2');
                    c = true
                }
                else if (d == 4) {
                    retval = Trig.$.parse('1/sqrt(2)');
                    c = true;
                }
                else if (d == 6) {
                    retval = Trig.$.parse('1/2');
                    c = true;
                }
                else
                    retval = Trig.$.multiply(new Symbol(sign), symfunction('sin', [symbol]));
            }
        }

        if (!retval)
            retval = Trig.$.multiply(new Symbol(sign), symfunction('sin', [symbol]));

        if (c && (q === 3 || q === 4))
            retval.negate();

        return retval;
    },
    tan: function (symbol) {
        if (Settings.PARSE2NUMBER) {
            if (symbol % Math.PI === 0 && symbol.isLinear()) {
                return new Symbol(0);
            }
            if (symbol.isConstant()) {
                if (Settings.USE_BIG) {
                    return new Symbol(bigDec.tan(symbol.multiplier.toDecimal()));
                }

                return new Symbol(Math.tan(symbol.valueOf()));
            }
            if (symbol.isImaginary())
                return Complex.evaluate(symbol, 'tan');
        }
        var retval,
            c = false,
            q = getQuadrant(symbol.multiplier.toDecimal()),
            m = symbol.multiplier;

        symbol.multiplier = m;

        if (symbol.isPi() && symbol.isLinear()) {
            //return 0 for all multiples of pi
            if (isInt(m)) {
                retval = new Symbol(0);
            }
            else {
                var n = m.num, d = m.den;
                if (d == 2)
                    throw new UndefinedError('tan is undefined for ' + symbol.toString());
                else if (d == 3) {
                    retval = Trig.$.parse('sqrt(3)');
                    c = true;
                }
                else if (d == 4) {
                    retval = new Symbol(1);
                    c = true;
                }
                else if (d == 6) {
                    retval = Trig.$.parse('1/sqrt(3)');
                    c = true;
                }
                else
                    retval = symfunction('tan', [symbol]);
            }
        }

        if (!retval)
            retval = symfunction('tan', [symbol]);

        if (c && (q === 2 || q === 4))
            retval.negate();

        return retval;
    },
    sec: function (symbol) {
        if (Settings.PARSE2NUMBER) {
            if (symbol.isConstant()) {
                if (Settings.USE_BIG) {
                    return new Symbol(new bigDec(1).dividedBy(bigDec.cos(symbol.multiplier.toDecimal())));
                }

                return new Symbol(Math2.sec(symbol.valueOf()));
            }
            if (symbol.isImaginary())
                return Complex.evaluate(symbol, 'sec');
            return Trig.$.parse(format('1/cos({0})', symbol));
        }

        var retval,
            c = false,
            q = getQuadrant(symbol.multiplier.toDecimal()),
            m = symbol.multiplier.abs();
        symbol.multiplier = m;

        if (symbol.isPi() && symbol.isLinear()) {
            //return for 1 or -1 for multiples of pi
            if (isInt(m)) {
                retval = new Symbol(even(m) ? 1 : -1);
            }
            else {
                var n = m.num, d = m.den;
                if (d == 2)
                    throw new UndefinedError('sec is undefined for ' + symbol.toString());
                else if (d == 3) {
                    retval = new Symbol(2);
                    c = true;
                }
                else if (d == 4) {
                    retval = Trig.$.parse('sqrt(2)');
                    c = true;
                }
                else if (d == 6) {
                    retval = Trig.$.parse('2/sqrt(3)');
                    c = true;
                }
                else
                    retval = symfunction('sec', [symbol]);
            }
        }

        if (c && (q === 2 || q === 3))
            retval.negate();

        if (!retval)
            retval = symfunction('sec', [symbol]);

        return retval;
    },
    csc: function (symbol) {
        if (Settings.PARSE2NUMBER) {
            if (symbol.isConstant()) {
                if (Settings.USE_BIG) {
                    return new Symbol(new bigDec(1).dividedBy(bigDec.sin(symbol.multiplier.toDecimal())));
                }

                return new Symbol(Math2.csc(symbol.valueOf()));
            }
            if (symbol.isImaginary())
                return Complex.evaluate(symbol, 'csc');
            return Trig.$.parse(format('1/sin({0})', symbol));
        }

        var retval,
            c = false,
            q = getQuadrant(symbol.multiplier.toDecimal()),
            sign = symbol.multiplier.sign(),
            m = symbol.multiplier.abs();

        symbol.multiplier = m;

        if (symbol.isPi() && symbol.isLinear()) {
            //return for 0 for multiples of pi
            if (isInt(m)) {
                throw new UndefinedError('csc is undefined for ' + symbol.toString());
            }
            else {
                var n = m.num, d = m.den;
                if (d == 2) {
                    retval = new Symbol(1);
                    c = true;
                }
                else if (d == 3) {
                    retval = Trig.$.parse('2/sqrt(3)');
                    c = true
                }
                else if (d == 4) {
                    retval = Trig.$.parse('sqrt(2)');
                    c = true;
                }
                else if (d == 6) {
                    retval = new Symbol(2);
                    c = true;
                }
                else
                    retval = Trig.$.multiply(new Symbol(sign), symfunction('csc', [symbol]));
            }
        }

        if (!retval)
            retval = Trig.$.multiply(new Symbol(sign), symfunction('csc', [symbol]));

        if (c && (q === 3 || q === 4))
            retval.negate();

        return retval;
    },
    cot: function (symbol) {
        if (Settings.PARSE2NUMBER) {
            if (symbol % (Math.PI/2) === 0) {
                return new Symbol(0);
            }
            if (symbol.isConstant()) {
                if (Settings.USE_BIG) {
                    return new Symbol(new bigDec(1).dividedBy(bigDec.tan(symbol.multiplier.toDecimal())));
                }

                return new Symbol(Math2.cot(symbol.valueOf()));
            }
            if (symbol.isImaginary())
                return Complex.evaluate(symbol, 'cot');
            return Trig.$.parse(format('1/tan({0})', symbol));
        }
        var retval,
            c = false,
            q = getQuadrant(symbol.multiplier.toDecimal()),
            m = symbol.multiplier;

        symbol.multiplier = m;

        if (symbol.isPi() && symbol.isLinear()) {
            //return 0 for all multiples of pi
            if (isInt(m)) {
                throw new UndefinedError('cot is undefined for ' + symbol.toString());
            }
            else {
                var n = m.num, d = m.den;
                if (d == 2)
                    retval = new Symbol(0);
                else if (d == 3) {
                    retval = Trig.$.parse('1/sqrt(3)');
                    c = true;
                }
                else if (d == 4) {
                    retval = new Symbol(1);
                    c = true;
                }
                else if (d == 6) {
                    retval = Trig.$.parse('sqrt(3)');
                    c = true;
                }
                else
                    retval = symfunction('cot', [symbol]);
            }
        }

        if (!retval)
            retval = symfunction('cot', [symbol]);

        if (c && (q === 2 || q === 4))
            retval.negate();

        return retval;
    },
    acos: function (symbol) {
        if (Settings.PARSE2NUMBER) {
            if (symbol.isConstant()) {
                // Handle values in the complex domain
                if (symbol.gt(1) || symbol.lt(-1)) {
                    var x = symbol.toString();
                    return Trig.$expand(Trig.$evaluate(`pi/2-asin(${x})`));
                }
                // Handle big numbers
                if (Settings.USE_BIG) {
                    return new Symbol(bigDec.acos(symbol.multiplier.toDecimal()));
                }

                return new Symbol(Math.acos(symbol.valueOf()));
            }
            if (symbol.isImaginary())
                return Complex.evaluate(symbol, 'acos');
        }
        return symfunction('acos', arguments);
    },
    asin: function (symbol) {
        if (Settings.PARSE2NUMBER) {
            if (symbol.isConstant()) {
                // Handle values in the complex domain
                if (symbol.gt(1) || symbol.lt(-1)) {
                    var i = Settings.IMAGINARY;
                    var x = symbol.multiplier.toDecimal();
                    return Trig.$expand(Trig.$evaluate(`${i}*log(sqrt(1-${x}^2)-${i}*${x})`));
                }
                // Handle big numbers
                if (Settings.USE_BIG) {
                    return new Symbol(bigDec.asin(symbol.multiplier.toDecimal()));
                }

                return new Symbol(Math.asin(symbol.valueOf()));
            }
            if (symbol.isImaginary())
                return Complex.evaluate(symbol, 'asin');
        }
        return symfunction('asin', arguments);
    },
    atan: function (symbol) {
        var retval;
        if (symbol.equals(0))
            retval = new Symbol(0);
        else if (Settings.PARSE2NUMBER) {
            if (symbol.isConstant()) {
                // Handle big numbers
                if (Settings.USE_BIG) {
                    return new Symbol(bigDec.atan(symbol.multiplier.toDecimal()));
                }

                return new Symbol(Math.atan(symbol.valueOf()));
            }
            if (symbol.isImaginary())
                return Complex.evaluate(symbol, 'atan');
            return symfunction('atan', arguments);
        }
        else if (symbol.equals(-1))
            retval = Trig.$.parse('-pi/4');
        else
            retval = symfunction('atan', arguments);
        return retval;
    },
    asec: function (symbol) {
        if (Settings.PARSE2NUMBER) {
            if (symbol.equals(0)) {
                throw new OutOfFunctionDomainError('Input is out of the domain of sec!');
            }
            if (symbol.isConstant()) {
                return Trig.acos(symbol.invert());
            }
            if (symbol.isImaginary()) {
                return Complex.evaluate(symbol, 'asec');
            }
        }
        return symfunction('asec', arguments);
    },
    acsc: function (symbol) {
        if (Settings.PARSE2NUMBER) {
            if (symbol.isConstant()) {
                return Trig.asin(symbol.invert());
            }

            if (symbol.isImaginary())
                return Complex.evaluate(symbol, 'acsc');
        }
        return symfunction('acsc', arguments);
    },
    acot: function (symbol) {
        if (Settings.PARSE2NUMBER) {
            if (symbol.isConstant()) {
                return new Trig.$.add(Trig.$.parse('pi/2'), Trig.atan(symbol).negate());
            }

            if (symbol.isImaginary())
                return Complex.evaluate(symbol, 'acot');
        }
        return symfunction('acot', arguments);
    },
    atan2: function (a, b) {
        if (a.equals(0) && b.equals(0))
            throw new UndefinedError('atan2 is undefined for 0, 0');

        if (Settings.PARSE2NUMBER && a.isConstant() && b.isConstant()) {
            return new Symbol(Math.atan2(a, b));
        }
        return symfunction('atan2', arguments);
    }
};
