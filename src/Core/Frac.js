const {isInt} = require("./Utils");
const bigDec = require("decimal.js");
const bigInt = require('../3rdparty/bigInt');
const {default: Scientific} = require("./Scientific");

function Frac(n) {
    if(n instanceof Frac)
        return n;
    if(n === undefined)
        return this;
    try {
        if(isInt(n)) {
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
        if(value === 0) {
            frac = [0, 1];
        }
        else {
            if(value < 1e-6 || value > 1e20) {
                var qc = this.quickConversion(Number(value));
                if(qc[1] <= 1e20) {
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
            if(typeof s !== 'string') {
                s = s.toString();
            }

            var sign = '';

            // Remove and store the sign
            var start = s.charAt(0);
            if(start === '-') {
                s = s.substr(1, s.length);
                sign = '-';
            }
            else if(start === '+') {
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
            if(Scientific.isScientific(value)) {
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
            if(cparts.length === 1) {
                num = cparts[0];
            }
            else {
                num = cparts[0] + cparts[1];
            }
            var n = cparts[1] ? cparts[1].length : 0;
            // Generate the padding for the zeros
            var den = `1${'0'.repeat(n)}`;

            if(num !== '0') {
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
            if(n > 10000) {
                done = true;
            }
            var a = Math.floor(q);
            var num = n1 + a * n2;
            var den = d1 + a * d2;
            var e = (q - a);
            if(e < epsilon) {
                done = true;
            }
            q = 1 / e;
            n1 = n2;
            d1 = d2;
            n2 = num;
            d2 = den;
            if(Math.abs(num / den - dec) < epsilon || n > 30) {
                done = true;
            }
        }
        return [num, den];
    }
};
//Depends on Fraction


module.exports = Frac;
