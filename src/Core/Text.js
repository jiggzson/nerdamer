const bigInt = require('../3rdparty/bigInt');
const {default: Scientific} = require('./Scientific');
const {Settings} = require('../Settings');
const {isSymbol} = require('./Symbol');
const {inBrackets, nround} = require('./Utils');
const {isVector} = require('../Parser/Vector');
const {Groups} = require('./Groups');

const TextDependencies = {
    CUSTOM_OPERATORS: null
};
const deps = TextDependencies;

/**
 * This method will return a hash or a text representation of a Symbol, Matrix, or Vector.
 * If all else fails it *assumes* the object has a toString method and will call that.
 *
 * @param {Object} obj
 * @param {string | undefined} option get is as a hash
 * @param {int | undefined} useGroup
 * @param {int | undefined} decp
 * @returns {String}
 */
function text(obj, option= undefined, useGroup= undefined, decp= undefined) {
    var asHash = option === 'hash',
        //whether to wrap numbers in brackets
        wrapCondition = undefined,
        opt = asHash ? undefined : option,
        asDecimal = opt === 'decimal' || opt === 'decimals';

    if (asDecimal && typeof decp === 'undefined')
        decp = 16;

    function toString(obj) {
        switch(option)
        {
            case 'decimals':
            case 'decimal':
                wrapCondition = wrapCondition || function (str) {
                    return false;
                };
                return obj.valueOf();
            case 'recurring':
                wrapCondition = wrapCondition || function (str) {
                    return str.indexOf("'") !== -1;
                };

                var str = obj.toString();
                //verify that the string is actually a fraction
                var frac = /^-?\d+(?:\/\d+)?$/.exec(str);
                if (frac.length === 0)
                    return str;

                //split the fraction into the numerator and denominator
                var parts = frac[0].split('/');
                var negative = false;
                var m = Number(parts[0]);
                if (m < 0) {
                    m = -m;
                    negative = true;
                }
                var n = Number(parts[1]);
                if (!n)
                    n = 1;

                //https://softwareengineering.stackexchange.com/questions/192070/what-is-a-efficient-way-to-find-repeating-decimal#comment743574_192081
                var quotient = Math.floor(m / n), c = 10 * (m - quotient * n);
                quotient = quotient.toString() + ".";
                while(c && c < n) {
                    c *= 10;
                    quotient += "0";
                }
                var digits = "", passed = [], i = 0;
                while(true) {
                    if (typeof passed[c] !== 'undefined') {
                        var prefix = digits.slice(0, passed[c]),
                            cycle = digits.slice(passed[c]),
                            result = quotient + prefix + "'" + cycle + "'";
                        return (negative ? "-" : "") + result.replace("'0'", "").replace(/\.$/, "");
                    }
                    var q = Math.floor(c / n), r = c - q * n;
                    passed[c] = i;
                    digits += q.toString();
                    i += 1;
                    c = 10 * r;
                }
            case 'mixed':
                wrapCondition = wrapCondition || function (str) {
                    return str.indexOf('/') !== -1;
                };

                var str = obj.toString();
                //verify that the string is actually a fraction
                var frac = /^-?\d+(?:\/\d+)?$/.exec(str);
                if (frac.length === 0)
                    return str;

                //split the fraction into the numerator and denominator
                var parts = frac[0].split('/');
                var numer = new bigInt(parts[0]);
                var denom = new bigInt(parts[1]);
                if (denom.equals(0))
                    denom = new bigInt(1);

                //return the quotient plus the remainder
                var divmod = numer.divmod(denom);
                var quotient = divmod.quotient;
                var remainder = divmod.remainder;
                var operator = parts[0][0] === '-' || quotient.equals(0) || remainder.equals(0) ? '' : '+';
                return (quotient.equals(0) ? '' : quotient.toString()) + operator + (remainder.equals(0) ? '' : (remainder.toString() + '/' + parts[1]));
            case 'scientific':
                wrapCondition = wrapCondition || function (str) {
                    return false;
                }
                return new Scientific(obj.valueOf()).toString(Settings.SCIENTIFIC_MAX_DECIMAL_PLACES);
            default:
                wrapCondition = wrapCondition || function (str) {
                    return str.indexOf('/') !== -1;
                };

                return obj.toString();
        }
    }

    //if the object is a symbol
    if (isSymbol(obj)) {
        var multiplier = '',
            power = '',
            sign = '',
            group = obj.group || useGroup,
            value = obj.value;

        //if the value is to be used as a hash then the power and multiplier need to be suppressed
        if (!asHash) {
            //use asDecimal to get the object back as a decimal
            var om = toString(obj.multiplier);
            if (om == '-1' && String(obj.multiplier) === '-1') {
                sign = '-';
                om = '1';
            }
            //only add the multiplier if it's not 1
            if (om != '1')
                multiplier = om;
            //use asDecimal to get the object back as a decimal
            var p = obj.power ? toString(obj.power) : '';
            //only add the multiplier
            if (p != '1') {
                //is it a symbol
                if (isSymbol(p)) {
                    power = text(p, opt);
                }
                else {
                    power = p;
                }
            }
        }

        switch(group) {
            case Groups.N:
                multiplier = '';
                //round if requested
                var m = decp && asDecimal ? obj.multiplier.toDecimal(decp) : toString(obj.multiplier);
                //if it's numerical then all we need is the multiplier
                value = String(obj.multiplier) == '-1' ? '1' : m;
                power = '';
                break;
            case Groups.PL:
                value = obj.collectSymbols().map(function (x) {
                    var txt = text(x, opt, useGroup, decp);
                    if (txt == '0')
                        txt = '';
                    return txt;
                }).sort().join('+').replace(/\+\-/g, '-');
                break;
            case Groups.CP:
                value = obj.collectSymbols().map(function (x) {
                    var txt = text(x, opt, useGroup, decp);
                    if (txt == '0')
                        txt = '';
                    return txt;
                }).sort().join('+').replace(/\+\-/g, '-');
                break;
            case Groups.CB:
                value = obj.collectSymbols(function (symbol) {
                    var g = symbol.group;
                    //both groups will already be in brackets if their power is greater than 1
                    //so skip it.
                    if ((g === Groups.PL || g === Groups.CP) && (symbol.power.equals(1) && symbol.multiplier.equals(1))) {
                        return inBrackets(text(symbol, opt));
                    }
                    return text(symbol, opt);
                }).join('*');
                break;
            case Groups.EX:
                var pg = obj.previousGroup,
                    pwg = obj.power.group;

                //Groups.PL are the exception. It's simpler to just collect and set the value
                if (pg === Groups.PL)
                    value = obj.collectSymbols(text, opt).join('+').replace('+-', '-');
                if (!(pg === Groups.N || pg === Groups.S || pg === Groups.FN) && !asHash) {
                    value = inBrackets(value);
                }

                if ((pwg === Groups.CP || pwg === Groups.CB || pwg === Groups.PL || obj.power.multiplier.toString() != '1') && power) {
                    power = inBrackets(power);
                }
                break;
        }

        if (group === Groups.FN) {
            value = obj.fname + inBrackets(obj.args.map(function (symbol) {
                return text(symbol, opt);
            }).join(','));
        }
        //TODO: Needs to be more efficient. Maybe.
        if (group === Groups.FN && obj.fname in deps.CUSTOM_OPERATORS) {
            var a = text(obj.args[0]);
            var b = text(obj.args[1]);
            if (obj.args[0].isComposite()) //preserve the brackets
                a = inBrackets(a);
            if (obj.args[1].isComposite()) //preserve the brackets
                b = inBrackets(b);
            value = a + deps.CUSTOM_OPERATORS[obj.fname] + b;
        }
        //wrap the power since / is less than ^
        //TODO: introduce method call isSimple
        if (power && group !== Groups.EX && wrapCondition(power)) {
            power = inBrackets(power);
        }

        //the following groups are held together by plus or minus. They can be raised to a power or multiplied
        //by a multiplier and have to be in brackets to preserve the order of precedence
        if (((group === Groups.CP || group === Groups.PL) && (multiplier && multiplier != '1' || sign === '-'))
            || ((group === Groups.CB || group === Groups.CP || group === Groups.PL) && (power && power != '1'))
            || !asHash && group === Groups.P && value == -1
            || obj.fname === Settings.PARENTHESIS) {

            value = inBrackets(value);
        }

        if (decp && (option === 'decimal' || option === 'decimals' && multiplier)) {
            multiplier = nround(multiplier, decp);
        }


        //add the sign back
        var c = sign + multiplier;

        if (multiplier && wrapCondition(multiplier))
            c = inBrackets(c);

        if (power < 0)
            power = inBrackets(power);

        //add the multiplication back
        if (multiplier)
            c = c + '*';

        if (power) {
            if (value === 'e' && Settings.E_TO_EXP) {
                return c + 'exp' + inBrackets(power);
            }
            power = Settings.POWER_OPERATOR + power;
        }

        //this needs serious rethinking. Must fix
        if (group === Groups.EX && value.charAt(0) === '-') {
            value = inBrackets(value);
        }

        var cv = c + value;

        if (obj.parens) {
            cv = inBrackets(cv);
        }

        return cv + power;
    }
    else if (isVector(obj)) {
        var l = obj.elements.length,
            c = [];
        for (var i = 0; i < l; i++)
            c.push(obj.elements[i].text(option));
        return '[' + c.join(',') + ']';
    }
    else {
        try {
            return obj.toString();
        }
        catch(e) {
            return '';
        }
    }
}

module.exports = { text, TextDependencies };
