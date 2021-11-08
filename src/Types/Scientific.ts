import {Settings} from "../Settings";
import {nround} from "../Core/Utils";

/**
 * Javascript has the toExponential method but this allows you to work with string and therefore any number of digits of your choosing
 * For example Scientific('464589498449496467924197545625247695464569568959124568489548454');
 */
export default class Scientific {
    sign = 1;
    coeff: string;
    exponent: string;
    private decp: number = 0;
    private dec?: string;
    private wholes?: string;

    constructor(value: string | number) {
        let num = String(typeof value === 'undefined' ? 0 : value); //convert to a string

        //remove the sign
        if (num.startsWith('-')) {
            this.sign = -1;
            //remove the sign
            num = num.substr(1, num.length);
        }
        else {
            this.sign = 1;
        }

        if (Scientific.isScientific(num)) {
            [this.coeff, this.exponent] = Scientific.fromScientific(num);
        }
        else {
            // [this.coeff, this.exponent, this.decp, this.dec, this.wholes] = Scientific.convert(num);
            let data = Scientific.convert(num);
            this.coeff = data.coeff;
            this.exponent = data.exponent;
            this.dec = data.dec;
            this.decp = data.decp;
            this.wholes = data.wholes;
        }
    }

    static fromScientific(num: string) {
        let parts = String(num).toLowerCase().split('e');
        let coeff = parts[0];
        let exponent = parts[1];

        return [coeff, exponent];
    }

    static convert(num: string) {
        //get wholes and decimals
        let parts = num.split('.');
        //make zero go away
        let wholes = parts[0] || '';
        let d = parts[1] || '';
        //convert zero to blank strings
        wholes = Scientific.removeLeadingZeroes(wholes);
        d = Scientific.removeTrailingZeroes(d);
        //find the location of the decimal place which is right after the wholes
        let dot_location = wholes.length;
        //add them together so we can move the dot
        let n = wholes + d;
        //find the next number
        let zeroes = Scientific.leadingZeroes(n).length;
        //set the exponent
        let exponent = (dot_location - (zeroes + 1)).toString();
        //set the coeff but first remove leading zeroes
        let coeff: string = Scientific.removeLeadingZeroes(n);
        coeff = coeff.charAt(0) + '.' + (coeff.substr(1, coeff.length) || '0');

        //the coeff decimal places
        let dec = coeff.split('.')[1] || ''; //if it's undefined or zero it's going to blank

        let decp: number = dec === '0' ? 0 : dec.length;
        //decimals
        dec = d.toString();

        return {coeff, exponent, decp, dec, wholes};
    }

    round(num: string | number) {
        let n = this.copy();

        num = Number(num); //cast to number for safety
        //since we know it guaranteed to be in the format {digit}{optional dot}{optional digits}
        //we can round based on this
        if (num === 0) {
            n.coeff = n.coeff.charAt(0);
        }
        else {
            //get up to n-1 digits
            let rounded = this.coeff.substring(0, num + 1);
            //get the next two
            let next_two = this.coeff.substring(num + 1, num + 3);
            //the extra digit
            let ed = parseInt(next_two.charAt(0));

            if (parseInt(next_two.charAt(1)) > 4) {
                ed++;
            }

            n.coeff = rounded + ed;
        }

        return n;
    }

    copy(): Scientific {
        let n = new Scientific(0);
        n.coeff = this.coeff;
        n.exponent = this.exponent;
        n.sign = this.sign;
        return n;
    }

    toString(n: number = 0) {
        let retval;

        if (Settings.SCIENTIFIC_IGNORE_ZERO_EXPONENTS && this.exponent === '0' && this.decp < n) {
            if (this.decp === 0)
                retval = this.wholes;
            else
                retval = this.coeff;
        }
        else {
            let coeff = n === undefined ? this.coeff : Scientific.round(this.coeff, Math.min(n, this.decp || 1));
            retval = this.exponent === '0' ? coeff : coeff + 'e' + this.exponent;
        }

        return (this.sign === -1 ? '-' : '') + retval;
    }

    static isScientific(num: string) {
        return /\d+\.?\d*e[+\-]*\d+/i.test(num);
    }

    static leadingZeroes(num: string) {
        let match = num.match(/^(0*).*$/);
        return match ? match[1] : '';
    }

    static removeLeadingZeroes(num: string) {
        let match = num.match(/^0*(.*)$/);
        return match ? match[1] : '';
    }

    static removeTrailingZeroes(num: string) {
        let match = num.match(/0*$/);
        return match ? num.substring(0, num.length - match[0].length) : '';
    }

    static round(c: string, n: number) {
        let coeff = nround(c, n);

        let m = String(coeff).split('.').pop();
        let d = n - (m?.length || 0);
        //if we're asking for more significant figures
        if (d > 0) {
            coeff = coeff + (new Array(d + 1).join('0'));
        }
        return coeff;
    }
}
