import {Symbol, symfunction} from '../../Symbol';
import {parse} from '../../parse';
import {Groups} from '../../Groups';
import {Settings} from '../../../Settings';
import bigDec from 'decimal.js';
import {Complex} from '../../Complex';
import {multiply} from '../operations/multiply';
import {Frac} from '../../Frac';
import {even, isInt, isSymbol} from '../../Utils';
import {Math2} from '../../Math2';
import {pfactor} from './pfactor';
import {pow} from '../operations/pow';
import {divide} from '../operations/divide';

/**
 * The square root function
 * @param {Symbol} symbol
 * @returns {Symbol}
 */
export function sqrt(symbol) {
    if (!isSymbol(symbol)) {
        symbol = parse(symbol);
    }

    // Exit early for Groups.EX
    if (symbol.group === Groups.EX) {
        return symfunction(Settings.SQRT, [symbol]);
    }

    if (symbol.fname === '' && symbol.power.equals(1))
        symbol = symbol.args[0];

    var is_negative = symbol.multiplier.sign() < 0;

    if (Settings.PARSE2NUMBER) {
        if (symbol.isConstant() && !is_negative) {
            return new Symbol(bigDec.sqrt(symbol.multiplier.toDecimal()));
        }
        else if (symbol.isImaginary()) {
            return Complex.sqrt(symbol);
        }
        else if (symbol.group === Groups.S) {
            return symfunction('sqrt', [symbol]);
        }
    }

    var img, retval,
        isConstant = symbol.isConstant();

    if (symbol.group === Groups.CB && symbol.isLinear()) {
        var m = sqrt(new Symbol(symbol.multiplier));
        for (var s in symbol.symbols) {
            var x = symbol.symbols[s];
            m = multiply(m, sqrt(x));
        }

        retval = m;
    }
    //if the symbol is already sqrt then it's that symbol^(1/4) and we can unwrap it
    else if (symbol.fname === Settings.SQRT) {
        var s = symbol.args[0];
        var ms = symbol.multiplier;
        s.setPower(symbol.power.multiply(new Frac(0.25)));
        retval = s;
        //grab the multiplier
        if (!ms.equals(1))
            retval = multiply(sqrt(parse(ms)), retval);
    }
        //if the symbol is a fraction then we don't keep can unwrap it. For instance
    //no need to keep sqrt(x^(1/3))
    else if (!symbol.power.isInteger()) {
        symbol.setPower(symbol.power.multiply(new Frac(0.5)));
        retval = symbol;
    }
    else if (symbol.multiplier < 0 && symbol.group === Groups.S) {
        var a = parse(symbol.multiplier).negate();
        var b = parse(symbol).toUnitMultiplier().negate();
        retval = multiply(symfunction(Settings.SQRT, [b]), sqrt(a));
    }
    else {

        //Related to issue #401. Since sqrt(a)*sqrt(b^-1) relates in issues, we'll change the form
        //to sqrt(a)*sqrt(b)^1 for better simplification
        //the sign of the power
        var sign = symbol.power.sign();
        //remove the sign
        symbol.power = symbol.power.abs();

        //if the symbols is imagary then we place in the imaginary part. We'll return it
        //as a product
        if (isConstant && symbol.multiplier.lessThan(0)) {
            img = Symbol.imaginary();
            symbol.multiplier = symbol.multiplier.abs();
        }

        var q = symbol.multiplier.toDecimal(),
            qa = Math.abs(q),
            t = Math.sqrt(qa);

        var m;
        //it's a perfect square so take the square
        if (isInt(t)) {
            m = new Symbol(t);
        }
        else if (isInt(q)) {
            var factors = Math2.ifactor(q);
            var tw = 1;
            for (var x in factors) {
                var n = factors[x],
                    nn = (n - (n % 2)); //get out the whole numbers
                if (nn) { //if there is a whole number ...
                    var w = Math.pow(x, nn);
                    tw *= Math.pow(x, nn / 2); //add to total wholes
                    q /= w; //reduce the number by the wholes
                }
            }
            m = multiply(symfunction(Settings.SQRT, [new Symbol(q)]), new Symbol(tw));
        }
        else {
            //reduce the numerator and denominator using prime factorization
            var c = [new Symbol(symbol.multiplier.num), new Symbol(symbol.multiplier.den)];
            var r = [new Symbol(1), new Symbol(1)];
            var sq = [new Symbol(1), new Symbol(1)];
            for (var i = 0; i < 2; i++) {
                var n = c[i];
                //get the prime factors and loop through each.
                pfactor(n).each(function (x) {
                    x = Symbol.unwrapPARENS(x);
                    var b = x.clone().toLinear();
                    var p = Number(x.power);
                    //We'll consider it safe to use the native Number since 2^1000 is already a pretty huge number
                    var rem = p % 2; //get the remainder. This will be 1 if 3 since sqrt(n^2) = n where n is positive
                    var w = (p - rem) / 2; //get the whole numbers of n/2
                    r[i] = multiply(r[i], pow(b, new Symbol(w)));
                    sq[i] = multiply(sq[i], sqrt(pow(b, new Symbol(rem))));
                });
            }
            m = divide(multiply(r[0], sq[0]), multiply(r[1], sq[1]));
        }


        //strip the multiplier since we already took the sqrt
        symbol = symbol.toUnitMultiplier(true);
        //if the symbol is one just return one and not the sqrt function
        if (symbol.isOne()) {
            retval = symbol;
        }
        else if (even(symbol.power.toString())) {
            //just raise it to the 1/2
            retval = pow(symbol.clone(), new Symbol(0.5));
        }
        else {
            retval = symfunction(Settings.SQRT, [symbol]);
        }

        //put back the sign that was removed earlier
        if (sign < 0)
            retval.power.negate();

        if (m)
            retval = multiply(m, retval);

        if (img)
            retval = multiply(img, retval);
    }

    if (is_negative && Settings.PARSE2NUMBER)
        return parse(retval);

    return retval;
}
