'use strict';

const {nround} = require('./Utils');

const Settings = {
    SCIENTIFIC_IGNORE_ZERO_EXPONENTS: true
};


//Scientific ===================================================================
/*
 * Javascript has the toExponential method but this allows you to work with string and therefore any number of digits of your choosing
 * For example Scientific('464589498449496467924197545625247695464569568959124568489548454');
 */

function Scientific(num) {
    if (!(this instanceof Scientific))
        return new Scientific(num);

    num = String(typeof num === 'undefined' ? 0 : num); //convert to a string

    //remove the sign
    if(num.startsWith('-')) {
        this.sign = -1;
        //remove the sign
        num = num.substr(1, num.length);
    }
    else {
        this.sign = 1;
    }

    if(Scientific.isScientific(num)) {
        this.fromScientific(num);
    }
    else {
        this.convert(num);
    }
    return this;
}

Scientific.prototype = {
    fromScientific: function (num) {
        let parts = String(num).toLowerCase().split('e');
        this.coeff = parts[0];
        this.exponent = parts[1];

        return this;
    },
    convert: function (num) {
        //get wholes and decimals
        let parts = num.split('.');
        //make zero go away
        let w = parts[0] || '';
        let d = parts[1] || '';
        //convert zero to blank strings
        w = Scientific.removeLeadingZeroes(w);
        d = Scientific.removeTrailingZeroes(d);
        //find the location of the decimal place which is right after the wholes
        let dot_location = w.length;
        //add them together so we can move the dot
        let n = w + d;
        //find the next number
        let zeroes = Scientific.leadingZeroes(n).length;
        //set the exponent
        this.exponent = dot_location - (zeroes + 1);
        //set the coeff but first remove leading zeroes
        let coeff = Scientific.removeLeadingZeroes(n);
        this.coeff = coeff.charAt(0) + '.' + (coeff.substr(1, coeff.length) || '0');

        //the coeff decimal places
        let dec = this.coeff.split('.')[1] || ''; //if it's undefined or zero it's going to blank

        this.decp = dec === '0' ? 0 : dec.length;
        //decimals
        this.dec = d;
        //wholes
        this.wholes = w;

        return this;
    },
    round: function (num) {
        let n = this.copy();

        num = Number(num); //cast to number for safety
        //since we know it guaranteed to be in the format {digit}{optional dot}{optional digits}
        //we can round based on this
        if(num === 0)
            n.coeff = n.coeff.charAt(0);
        else {
            //get up to n-1 digits
            let rounded = this.coeff.substring(0, num + 1);
            //get the next two
            let next_two = this.coeff.substring(num + 1, num + 3);
            //the extra digit
            let ed = next_two.charAt(0);

            if(next_two.charAt(1) > 4)
                ed++;

            n.coeff = rounded + ed;
        }

        return n;
    },
    copy: function () {
        let n = new Scientific(0);
        n.coeff = this.coeff;
        n.exponent = this.exponent;
        n.sign = this.sign;
        return n;
    },
    toString: function (n) {
        let retval;

        if (Settings.SCIENTIFIC_IGNORE_ZERO_EXPONENTS && this.exponent === 0 && this.decp < n) {
            if(this.decp === 0)
                retval = this.wholes;
            else
                retval = this.coeff;
        }
        else {
            let coeff = typeof n === 'undefined' ? this.coeff : Scientific.round(this.coeff, Math.min(n, this.decp || 1));
            retval = this.exponent === 0 ? coeff : coeff + 'e' + this.exponent;
        }

        return (this.sign === -1 ? '-' : '') + retval;
    }
};

Scientific.isScientific = function (num) {
    return /\d+\.?\d*e[+\-]*\d+/i.test(num);
};
Scientific.leadingZeroes = function (num) {
    let match = num.match(/^(0*).*$/);
    return match ? match[1] : '';
};
Scientific.removeLeadingZeroes = function (num) {
    let match = num.match(/^0*(.*)$/);
    return match ? match[1] : '';
};

Scientific.removeTrailingZeroes = function (num) {
    let match = num.match(/0*$/);
    return match ? num.substring(0, num.length - match[0].length) : '';
};

Scientific.round = function (c, n) {
    let coeff = nround(c, n);
    let m = String(coeff).split('.').pop();
    let d = n - m.length;
    //if we're asking for more significant figures
    if(d > 0) {
        coeff = coeff + (new Array(d + 1).join(0));
    }
    return coeff;
};

module.exports = Scientific;
