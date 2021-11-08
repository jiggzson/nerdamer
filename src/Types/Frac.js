import {isInt, scientificToDecimal} from '../Core/Utils';
import bigDec from 'decimal.js';
import bigInt from '../3rdparty/bigInt';
import Scientific from './Scientific';
import {DivisionByZero} from '../Core/Errors';
import {Settings} from '../Settings';

export class Frac {
    constructor(n) {
        if (n instanceof Frac)
            return n;
        if (n === undefined)
            return this;
        try {
            if (isInt(n)) {
                try {
                    this.num = bigInt(n);
                    this.den = bigInt(1);
                }
                catch(e) {
                    return Frac.simple(n);
                }
            }
            else {
                var frac = n instanceof bigDec ? Fraction.quickConversion(n) : Fraction.convert(n);
                this.num = new bigInt(frac[0]);
                this.den = new bigInt(frac[1]);
            }
        }
        catch(e) {
            return Frac.simple(n);
        }
    }

    //safe to use with negative numbers or other types
    static create(n) {
        if (n instanceof Frac)
            return n;
        n = n.toString();
        var is_neg = n.charAt(0) === '-'; //check if it's negative
        if (is_neg)
            n = n.substr(1, n.length - 1); //remove the sign
        var frac = new Frac(n);
        //put the sign back
        if (is_neg)
            frac.negate();
        return frac;
    }

    static isFrac(o) {
        return (o instanceof Frac);
    }

    static quick(n, d) {
        var frac = new Frac();
        frac.num = new bigInt(n);
        frac.den = new bigInt(d);
        return frac;
    }

    static simple(n) {
        var nstr = String(scientificToDecimal(n)),
            m_dc = nstr.split('.'),
            num = m_dc.join(''),
            den = 1,
            l = (m_dc[1] || '').length;
        for (var i = 0; i < l; i++)
            den += '0';
        var frac = Frac.quick(num, den);
        return frac.simplify();
    }

    multiply(m) {
        if (this.isOne()) {
            return m.clone();
        }
        if (m.isOne()) {
            return this.clone();
        }

        var c = this.clone();
        c.num = c.num.multiply(m.num);
        c.den = c.den.multiply(m.den);

        return c.simplify();
    }

    divide(m) {
        if (m.equals(0))
            throw new DivisionByZero('Division by zero not allowed!');
        return this.clone().multiply(m.clone().invert()).simplify();
    }

    subtract(m) {
        return this.clone().add(m.clone().neg());
    }

    neg() {
        this.num = this.num.multiply(-1);
        return this;
    }

    add(m) {
        var n1 = this.den, n2 = m.den, c = this.clone();
        var a = c.num, b = m.num;
        if (n1.equals(n2)) {
            c.num = a.add(b);
        }
        else {
            c.num = a.multiply(n2).add(b.multiply(n1));
            c.den = n1.multiply(n2);
        }

        return c.simplify();
    }

    mod(m) {
        var a = this.clone(),
            b = m.clone();
        //make their denominators even and return the mod of their numerators
        a.num = a.num.multiply(b.den);
        a.den = a.den.multiply(b.den);
        b.num = b.num.multiply(this.den);
        b.den = b.den.multiply(this.den);
        a.num = a.num.mod(b.num);
        return a.simplify();
    }

    simplify() {
        var gcd = bigInt.gcd(this.num, this.den);

        this.num = this.num.divide(gcd);
        this.den = this.den.divide(gcd);
        return this;
    }

    clone() {
        var m = new Frac();
        m.num = new bigInt(this.num);
        m.den = new bigInt(this.den);
        return m;
    }

    decimal(prec) {
        var sign = this.num.isNegative() ? '-' : '';
        if (this.num.equals(this.den)) {
            return '1';
        }
        //go plus one for rounding
        prec = prec || Settings.PRECISION;
        prec++;
        var narr = [],
            n = this.num.abs(),
            d = this.den;
        for (var i = 0; i < prec; i++) {
            var w = n.divide(d), //divide out whole
                r = n.subtract(w.multiply(d)); //get remainder

            narr.push(w);
            if (r.equals(0))
                break;
            n = r.times(10); //shift one dec place
        }
        var whole = narr.shift();
        if (narr.length === 0) {
            return sign + whole.toString();
        }

        if (i === prec) {
            var lt = [];
            //get the last two so we can round it
            for (var i = 0; i < 2; i++)
                lt.unshift(narr.pop());
            //put the last digit back by rounding the last two
            narr.push(Math.round(lt.join('.')));
        }

        var dec = whole.toString() + '.' + narr.join('');
        return sign + dec;
    }

    toDecimal(prec) {
        prec = prec || Settings.PRECISION;
        if (prec) {
            return this.decimal(prec);
        }
        else
            return this.num / this.den;
    }

    qcompare(n) {
        return [this.num.multiply(n.den), n.num.multiply(this.den)];
    }

    equals(n) {
        if (!isNaN(n))
            n = new Frac(n);
        var q = this.qcompare(n);

        return q[0].equals(q[1]);
    }

    absEquals(n) {
        if (!isNaN(n))
            n = new Frac(n);
        var q = this.qcompare(n);

        return q[0].abs().equals(q[1]);
    }

    //lazy check to be fixed. Sufficient for now but will cause future problems
    greaterThan(n) {
        if (!isNaN(n))
            n = new Frac(n);
        var q = this.qcompare(n);

        return q[0].gt(q[1]);
    }

    gte(n) {
        return this.greaterThan(n) || this.equals(n);
    }

    lte(n) {
        return this.lessThan(n) || this.equals(n);
    }

    lessThan(n) {
        if (!isNaN(n))
            n = new Frac(n);
        var q = this.qcompare(n);

        return q[0].lt(q[1]);
    }

    isInteger() {
        return this.den.equals(1);
    }

    negate() {
        this.num = this.num.multiply(-1);
        return this;
    }

    invert() {
        var t = this.den;
        //why invert 0/1? It'll become 1/0 and that's a lie.
        if (!this.num.equals(0)) {
            var isnegative = this.num.isNegative();
            this.den = this.num.abs();
            this.num = t;
            if (isnegative)
                this.num = this.num.multiply(-1);
        }

        return this;
    }

    isOne() {
        return this.num.equals(1) && this.den.equals(1);
    }

    sign() {
        return this.num.isNegative() ? -1 : 1;
    }

    abs() {
        this.num = this.num.abs();
        return this;
    }

    gcd(f) {
        return Frac.quick(bigInt.gcd(f.num, this.num), bigInt.lcm(f.den, this.den));
    }

    toString() {
        return !this.den.equals(1) ? this.num.toString() + '/' + this.den.toString() : this.num.toString();
    }

    valueOf() {
//            if (this.num == 24) throw new Error(999)
        if (Settings.USE_BIG)
            return new bigDec(this.num.toString()).div(new bigDec(this.den.toString()));
        return this.num / this.den;
    }

    isNegative() {
        return this.toDecimal() < 0;
    }
}


/* "STATIC" */
// converts a number to a fraction.
var Fraction = {
    /**
     * Converts a decimal to a fraction
     * @param {number} value
     * @param {object} opts
     * @returns {Array} - an array containing the denominator and the numerator
     */
    convert: function (value, opts) {
        var frac;
        if (value === 0) {
            frac = [0, 1];
        }
        else {
            if (value < 1e-6 || value > 1e20) {
                var qc = this.quickConversion(Number(value));
                if (qc[1] <= 1e20) {
                    var abs = Math.abs(value);
                    var sign = value / abs;
                    frac = this.fullConversion(abs.toFixed((qc[1] + '').length - 1));
                    frac[0] = frac[0] * sign;
                }
                else {
                    frac = qc;
                }
            }
            else {
                frac = this.fullConversion(value);
            }
        }
        return frac;
    },
    /**
     * If the fraction is too small or too large this gets called instead of fullConversion method
     * @param {number} dec
     * @returns {Array} - an array containing the denominator and the numerator
     */
    quickConversion: function (value) {
        var stripSign = function (s) {
            // Explicitely convert to a string
            if (typeof s !== 'string') {
                s = s.toString();
            }

            var sign = '';

            // Remove and store the sign
            var start = s.charAt(0);
            if (start === '-') {
                s = s.substr(1, s.length);
                sign = '-';
            }
            else if (start === '+') {
                // Just remove the plus sign
                s = s.substr(1, s.length);
            }

            return {
                sign: sign,
                value: s
            };
        };


        function convert(value) {
            // Explicitely convert to a decimal
            if (Scientific.isScientific(value)) {
                value = scientificToDecimal(value);
            }

            // Split the value into the sign and the value
            var nparts = stripSign(value);

            // Split it at the decimal. We'll refer to it as the coeffient parts
            var cparts = nparts.value.split('.');

            // Combine the entire number by removing leading zero and adding the decimal part
            // This would be teh same as moving the decimal point to the end
            var num;
            // We're dealing with integers
            if (cparts.length === 1) {
                num = cparts[0];
            }
            else {
                num = cparts[0] + cparts[1];
            }
            var n = cparts[1] ? cparts[1].length : 0;
            // Generate the padding for the zeros
            var den = `1${'0'.repeat(n)}`;

            if (num !== '0') {
                num = num.replace(/^0+/, '');
            }
            return [nparts.sign + num, den];
        }

        return convert(value);
    },
    /**
     * Returns a good approximation of a fraction. This method gets called by convert
     * http://mathforum.org/library/drmath/view/61772.html
     * Decimal To Fraction Conversion - A Simpler Version
     * Dr Peterson
     * @param {number} dec
     * @returns {Array} - an array containing the denominator and the numerator
     */
    fullConversion: function (dec) {
        var done = false;
        // you can adjust the epsilon to a larger number if you don't need very high precision
        var n1 = 0, d1 = 1, n2 = 1, d2 = 0, n = 0, q = dec, epsilon = 1e-16;
        while(!done) {
            n++;
            if (n > 10000) {
                done = true;
            }
            var a = Math.floor(q);
            var num = n1 + a * n2;
            var den = d1 + a * d2;
            var e = (q - a);
            if (e < epsilon) {
                done = true;
            }
            q = 1 / e;
            n1 = n2;
            d1 = d2;
            n2 = num;
            d2 = den;
            if (Math.abs(num / den - dec) < epsilon || n > 30) {
                done = true;
            }
        }
        return [num, den];
    }
};
//Depends on Fraction


/**
 * Gets the quadrant of the trig function
 * @param {Frac} m
 * @returns {Int}
 */
export function getQuadrant(m) {
    var v = m % 2, quadrant;

    if (v < 0)
        v = 2 + v; //put it in terms of pi

    if (v >= 0 && v <= 0.5)
        quadrant = 1;
    else if (v > 0.5 && v <= 1)
        quadrant = 2;
    else if (v > 1 && v <= 1.5)
        quadrant = 3;
    else
        quadrant = 4;
    return quadrant;
}
