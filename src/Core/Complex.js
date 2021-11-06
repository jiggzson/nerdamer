import {Symbol, symfunction} from './Symbol';
import {Settings} from '../Settings';
import bigDec from 'decimal.js';
import {Math2} from './Math2';
import {block, format} from './Utils';
import {add, divide, log, multiply, sqrt, subtract} from './SymbolOperators/SymbolOperators';


export const Complex = {
    prec: undefined,
    cos: function (r, i) {
        var re, im;
        re = Complex.$.parse(Math.cos(r) * Math.cosh(i));
        im = Complex.$.parse(Math.sin(r) * Math.sinh(i));
        return subtract(re, multiply(im, Symbol.imaginary()));
    },
    sin: function (r, i) {
        var re, im;
        re = Complex.$.parse(Math.sin(r) * Math.cosh(i));
        im = Complex.$.parse(Math.cos(r) * Math.sinh(i));
        return subtract(re, multiply(im, Symbol.imaginary()));
    },
    tan: function (r, i) {
        var re, im;
        re = Complex.$.parse(Math.sin(2 * r) / (Math.cos(2 * r) + Math.cosh(2 * i)));
        im = Complex.$.parse(Math.sinh(2 * i) / (Math.cos(2 * r) + Math.cosh(2 * i)));
        return add(re, multiply(im, Symbol.imaginary()));
    },
    sec: function (r, i) {
        var t = this.removeDen(this.cos(r, i));
        return subtract(t[0], multiply(t[1], Symbol.imaginary()));
    },
    csc: function (r, i) {
        var t = this.removeDen(this.sin(r, i));
        return add(t[0], multiply(t[1], Symbol.imaginary()));
    },
    cot: function (r, i) {
        var t = this.removeDen(this.tan(r, i));
        return subtract(t[0], multiply(t[1], Symbol.imaginary()));
    },
    acos: function (r, i) {
        var symbol, sq, a, b, c, squared;
        symbol = this.fromArray([r, i]);
        squared = Complex.$.pow(symbol.clone(), new Symbol(2));
        sq = Complex.$.expand(squared); //z*z
        a = multiply(sqrt(subtract(new Symbol(1), sq)), Symbol.imaginary());
        b = Complex.$.expand(add(symbol.clone(), a));
        c = log(b);
        return Complex.$.expand(multiply(Symbol.imaginary().negate(), c));
    },
    asin: function (r, i) {
        return subtract(Complex.$.parse('pi/2'), this.acos(r, i));
    },
    atan: function (r, i) {
        // Handle i and -i
        if (r.equals(0) && (i.equals(1) || i.equals(-1))) {
            // Just copy Wolfram Alpha for now. The parenthesis
            return Complex.$.parse(`${Symbol.infinity()}*${Settings.IMAGINARY}*${i}`);
        }
        var a, b, c, symbol;
        symbol = Complex.fromArray([r, i]);
        a = Complex.$.expand(multiply(Symbol.imaginary(), symbol.clone()));
        b = log(Complex.$.expand(subtract(new Symbol(1), a.clone())));
        c = log(Complex.$.expand(add(new Symbol(1), a.clone())));
        return Complex.$.expand(multiply(divide(Symbol.imaginary(), new Symbol(2)), subtract(b, c)));
    },
    asec: function (r, i) {
        var d = this.removeDen([r, i]);
        d[1].negate();
        return this.acos.apply(this, d);
    },
    acsc: function (r, i) {
        var d = this.removeDen([r, i]);
        d[1].negate();
        return this.asin.apply(this, d);
    },
    acot: function (r, i) {
        var d = this.removeDen([r, i]);
        d[1].negate();
        return this.atan.apply(this, d);
    },
    //Hyperbolic trig
    cosh: function (r, i) {
        var re, im;
        re = Complex.$.parse(Math.cosh(r) * Math.cos(i));
        im = Complex.$.parse(Math.sinh(r) * Math.sin(i));
        return add(re, multiply(im, Symbol.imaginary()));
    },
    sinh: function (r, i) {
        var re, im;
        re = Complex.$.parse(Math.sinh(r) * Math.cos(i));
        im = Complex.$.parse(Math.cosh(r) * Math.sin(i));
        return add(re, multiply(im, Symbol.imaginary()));
    },
    tanh: function (r, i) {
        var re, im;
        re = Complex.$.parse(Math.sinh(2 * r) / (Math.cos(2 * i) + Math.cosh(2 * r)));
        im = Complex.$.parse(Math.sin(2 * i) / (Math.cos(2 * i) + Math.cosh(2 * r)));
        return subtract(re, multiply(im, Symbol.imaginary()));
    },
    sech: function (r, i) {
        var t = this.removeDen(this.cosh(r, i));
        return subtract(t[0], multiply(t[1], Symbol.imaginary()));
    },
    csch: function (r, i) {
        var t = this.removeDen(this.sinh(r, i));
        return subtract(t[0], multiply(t[1], Symbol.imaginary()));
    },
    coth: function (r, i) {
        var t = this.removeDen(this.tanh(r, i));
        return add(t[0], multiply(t[1], Symbol.imaginary()));
    },
    acosh: function (r, i) {
        var a, b, z;
        z = this.fromArray([r, i]);
        a = sqrt(add(z.clone(), new Symbol(1)));
        b = sqrt(subtract(z.clone(), new Symbol(1)));
        return Complex.$.expand(log(add(z, Complex.$.expand(multiply(a, b)))));
    },
    asinh: function (r, i) {
        var a, z;
        z = this.fromArray([r, i]);
        a = sqrt(add(new Symbol(1), Complex.$.expand(Complex.$.pow(z.clone(), new Symbol(2)))));
        return Complex.$.expand(log(add(z, a)));
    },
    atanh: function (r, i) {
        var a, b, z;
        z = this.fromArray([r, i]);
        a = log(add(z.clone(), new Symbol(1)));
        b = log(subtract(new Symbol(1), z));
        return Complex.$.expand(divide(subtract(a, b), new Symbol(2)));
    },
    asech: function (r, i) {
        var t = this.removeDen([r, i]);
        t[1].negate();
        return this.acosh.apply(this, t);
    },
    acsch: function (r, i) {
        var t = this.removeDen([r, i]);
        t[1].negate();
        return this.asinh.apply(this, t);
    },
    acoth: function (r, i) {
        var t = this.removeDen([r, i]);
        t[1].negate();
        return this.atanh.apply(this, t);
    },
    sqrt: function (symbol) {
        var re, im, h, a, d;
        re = symbol.realpart();
        im = symbol.imagpart();
        h = Symbol.hyp(re, im);
        a = add(re.clone(), h);
        d = sqrt(multiply(new Symbol(2), a.clone()));
        return add(divide(a.clone(), d.clone()), multiply(divide(im, d), Symbol.imaginary()));
    },
    log: function (r, i) {
        var re, im, phi;
        re = log(Symbol.hyp(r, i));
        phi = Settings.USE_BIG ? Symbol(bigDec.atan2(i.multiplier.toDecimal(), r.multiplier.toDecimal())) : Math.atan2(i, r);
        im = Complex.$.parse(phi);
        return add(re, multiply(Symbol.imaginary(), im));
    },
    erf(symbol, n) {
        //Do nothing for now. Revisit this in the future.
        return symfunction('erf', [symbol]);

        n = n || 30;

        var f = function (R, I) {
            return block('PARSE2NUMBER', function () {
                var retval = new Symbol(0);
                for (var i = 0; i < n; i++) {
                    var a, b;
                    a = Complex.$.parse(bigDec.exp(bigDec(i).toPower(2).neg().dividedBy(bigDec(n).pow(2).plus(bigDec(R).toPower(2).times(4)))));
                    b = Complex.$.parse(format('2*({1})-e^(-(2*{0}*{1}*{2}))*(2*{1}*cosh({2}*{3})-{0}*{3}*sinh({3}*{2}))', Settings.IMAGINARY, R, I, i));
                    retval = add(retval, multiply(a, b));
                }
                return multiply(retval, new Symbol(2));
            }, true);
        };
        var re, im, a, b, c, k;
        re = symbol.realpart();
        im = symbol.imagpart();

        k = Complex.$.parse(format('(e^(-{0}^2))/pi', re));
        a = Complex.$.parse(format('(1-e^(-(2*{0}*{1}*{2})))/(2*{1})', Settings.IMAGINARY, re, im));
        b = f(re.toString(), im.toString());

        return add(Complex.$.parse(Math2.erf(re.toString())), multiply(k, add(a, b)));
    },
    removeDen: function (symbol) {
        var den, r, i, re, im;
        if (Array.isArray(symbol)) {
            r = symbol[0];
            i = symbol[1];
        }
        else {
            r = symbol.realpart();
            i = symbol.imagpart();
        }

        den = Math.pow(r, 2) + Math.pow(i, 2);
        re = Complex.$.parse(r / den);
        im = Complex.$.parse(i / den);
        return [re, im];
    },
    fromArray: function (arr) {
        return add(arr[0], multiply(Symbol.imaginary(), arr[1]));
    },
    evaluate: function (symbol, f) {
        var re, im, sign;

        sign = symbol.power.sign();
        //remove it from under the denominator
        symbol.power = symbol.power.abs();
        //expand
        if (symbol.power.greaterThan(1))
            symbol = Complex.$.expand(symbol);
        //remove the denominator
        if (sign < 0) {
            var d = this.removeDen(symbol);
            re = d[0];
            im = d[1];
        }
        else {
            re = symbol.realpart();
            im = symbol.imagpart();
        }

        if (re.isConstant('all') && im.isConstant('all'))
            return this[f].call(this, re, im);

        return symfunction(f, [symbol]);
    }
};

