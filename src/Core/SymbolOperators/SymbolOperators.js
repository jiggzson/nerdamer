import {Settings} from '../../Settings';
import {Groups} from '../Groups';
import {isSymbol, symfunction} from '../Symbol';
import bigDec from 'decimal.js';
import {Frac} from '../Frac';
import {even, firstObject, isInt} from '../Utils';
import {Math2} from '../Math2';
import {Complex} from '../Complex';
import {Collection} from '../../Parser/Collection';
import {isMatrix, Matrix} from '../../Parser/Matrix';
import {isVector} from '../../Parser/Vector';
import {UndefinedError} from '../Errors';
import {text} from '../Text';
const {Symbol} = require('../Symbol');

export const SymbolOperatorsDeps = {
    parse: null,
    divide: null,
    multiply: null,
    pow: null,
    pfactor: null,
    subtract: null,
    add: null
};

//
let deps = SymbolOperatorsDeps;

/**
 * The square root function
 * @param {Symbol} symbol
 * @returns {Symbol}
 */
export function sqrt(symbol) {
    if (!isSymbol(symbol)) {
        symbol = deps.parse(symbol);
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
            retval = multiply(sqrt(deps.parse(ms)), retval);
    }
        //if the symbol is a fraction then we don't keep can unwrap it. For instance
    //no need to keep sqrt(x^(1/3))
    else if (!symbol.power.isInteger()) {
        symbol.setPower(symbol.power.multiply(new Frac(0.5)));
        retval = symbol;
    }
    else if (symbol.multiplier < 0 && symbol.group === Groups.S) {
        var a = deps.parse(symbol.multiplier).negate();
        var b = deps.parse(symbol).toUnitMultiplier().negate();
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
                deps.pfactor(n).each(function (x) {
                    x = Symbol.unwrapPARENS(x);
                    var b = x.clone().toLinear();
                    var p = Number(x.power);
                    //We'll consider it safe to use the native Number since 2^1000 is already a pretty huge number
                    var rem = p % 2; //get the remainder. This will be 1 if 3 since sqrt(n^2) = n where n is positive
                    var w = (p - rem) / 2; //get the whole numbers of n/2
                    r[i] = multiply(r[i], deps.pow(b, new Symbol(w)));
                    sq[i] = multiply(sq[i], sqrt(deps.pow(b, new Symbol(rem))));
                });
            }
            m = deps.divide(multiply(r[0], sq[0]), multiply(r[1], sq[1]));
        }


        //strip the multiplier since we already took the sqrt
        symbol = symbol.toUnitMultiplier(true);
        //if the symbol is one just return one and not the sqrt function
        if (symbol.isOne()) {
            retval = symbol;
        }
        else if (even(symbol.power.toString())) {
            //just raise it to the 1/2
            retval = deps.pow(symbol.clone(), new Symbol(0.5));
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
        return deps.parse(retval);

    return retval;
}


/**
 * Gets called when the parser finds the * operator. See this.add
 * @param {Symbol} a
 * @param {Symbol} b
 * @returns {Symbol}
 */
export function multiply(a, b) {
    var aIsSymbol = isSymbol(a),
        bIsSymbol = isSymbol(b);
    //we're dealing with function assignment here
    if (aIsSymbol && b instanceof Collection) {
        b.elements.push(a);
        return b;
    }
    if (aIsSymbol && bIsSymbol) {
        //if it has a unit then add it and return it right away.
        if (b.isUnit) {
            var result = a.clone();
            a.unit = b;
            return result;
        }

        //if it has units then just forward that problem to the unit module
        if (a.unit || b.unit) {
            return _.Unit.multiply(a, b);
        }

        //handle Infinty
        if (a.isInfinity || b.isInfinity) {
            if (a.equals(0) || b.equals(0))
                throw new UndefinedError(a + '*' + b + ' is undefined!');
            //x/infinity
            if (b.power.lessThan(0)) {
                if (!a.isInfinity) {
                    return new Symbol(0);
                }
                else {
                    throw new UndefinedError('Infinity/Infinity is not defined!');
                }
            }

            var sign = a.multiplier.multiply(b.multiplier).sign(),
                inf = Symbol.infinity();
            if (a.isConstant() || b.isConstant() || (a.isInfinity && b.isInfinity)) {
                if (sign < 0)
                    inf.negate();

                return inf;
            }
        }
        //the quickies
        if (a.isConstant() && b.isConstant() && Settings.PARSE2NUMBER) {
            var t = new bigDec(a.multiplier.toDecimal()).times(new bigDec(b.multiplier.toDecimal())).toFixed();
            var retval = new Symbol(t);
            return retval;
        }

        //don't waste time
        if (a.isOne()) {
            return b.clone();
        }
        if (b.isOne()) {
            return a.clone();
        }

        if (a.multiplier.equals(0) || b.multiplier.equals(0))
            return new Symbol(0);

        if (b.group > a.group && !(b.group === Groups.CP))
            return multiply(b, a);
        //correction for PL/CB dilemma
        if (a.group === Groups.CB && b.group === Groups.PL && a.value === b.value) {
            var t = a;
            a = b;
            b = t;//swap
        }

        var g1 = a.group,
            g2 = b.group,
            bnum = b.multiplier.num,
            bden = b.multiplier.den;

        if (g1 === Groups.FN && a.fname === Settings.SQRT && !b.isConstant() && a.args[0].value === b.value && !a.args[0].multiplier.lessThan(0)) {
            //unwrap sqrt
            var a_pow = a.power;
            var a_multiplier = deps.parse(a.multiplier);
            a = multiply(a_multiplier, a.args[0].clone());
            a.setPower(new Frac(0.5).multiply(a_pow));
            g1 = a.group;
        }
        //simplify n/sqrt(n). Being very specific
        else if (g1 === Groups.FN && a.fname === Settings.SQRT && a.multiplier.equals(1) && a.power.equals(-1) && b.isConstant() && a.args[0].equals(b)) {
            a = symfunction(Settings.SQRT, [b.clone()]);
            b = new Symbol(1);
        }
        ;

        var v1 = a.value,
            v2 = b.value,
            sign = new Frac(a.sign()),
            //since Groups.P is just a morphed version of Groups.N we need to see if they relate
            ONN = (g1 === Groups.P && g2 === Groups.N && b.multiplier.equals(a.value)),
            //don't multiply the multiplier of b since that's equal to the value of a
            m = ONN ? new Frac(1).multiply(a.multiplier).abs() : a.multiplier.multiply(b.multiplier).abs(),
            result = a.clone().toUnitMultiplier();
        b = b.clone().toUnitMultiplier(true);

        //further simplification of sqrt
        if (g1 === Groups.FN && g2 === Groups.FN) {
            var u = a.args[0].clone();
            var v = b.args[0].clone();
            if (a.fname === Settings.SQRT && b.fname === Settings.SQRT && a.isLinear() && b.isLinear()) {

                var q = deps.divide(u, v).invert();
                if (q.gt(1) && isInt(q)) {
                    //b contains a factor a which can be moved to a
                    result = multiply(a.args[0].clone(), sqrt(q.clone()));
                    b = new Symbol(1);
                }
            }
                //simplify factorial but only if
                //1 - It's division so b will have a negative power
            //2 - We're not dealing with factorials of numbers
            else if (a.fname === Settings.FACTORIAL && b.fname === Settings.FACTORIAL && !u.isConstant() && !v.isConstant() && b.power < 0) {
                //assume that n = positive
                var d = deps.subtract(u.clone(), v.clone());

                //if it's not numeric then we don't know if we can simplify so just return
                if (d.isConstant()) {

                    //there will never be a case where d == 0 since this will already have
                    //been handled at the beginning of this function
                    t = new Symbol(1);
                    if (d < 0) {
                        //If d is negative then the numerator is larger so expand that
                        for (var i = 0, n = Math.abs(d); i <= n; i++) {
                            var s = deps.add(u.clone(), new Symbol(i));
                            t = multiply(t, s);
                        }

                        result = multiply(deps.pow(u, new Symbol(a.power)), deps.pow(t, new Symbol(b.power)));

                        b = new Symbol(1);
                    }
                    else {
                        //Otherwise the denominator is larger so expand that
                        for (var i = 0, n = Math.abs(d); i <= n; i++) {
                            var s = deps.add(v.clone(), new Symbol(i));
                            t = multiply(t, s);
                        }

                        result = multiply(deps.pow(t, new Symbol(a.power)), deps.pow(v, new Symbol(b.power)));

                        b = new Symbol(1);
                    }
                }
            }
        }


        //if both are Groups.PL then their hashes have to match
        if (v1 === v2 && g1 === Groups.PL && g1 === g2) {
            v1 = a.text('hash');
            v2 = b.text('hash');
        }

        //same issue with (x^2+1)^x*(x^2+1)
        //Groups.EX needs an exception when multiplying because it needs to recognize
        //that (x+x^2)^x has the same hash as (x+x^2). The latter is kept as x
        if (g2 === Groups.EX && b.previousGroup === Groups.PL && g1 === Groups.PL) {
            v1 = text(a, 'hash', Groups.EX);
        }

        if ((v1 === v2 || ONN) && !(g1 === Groups.PL && (g2 === Groups.S || g2 === Groups.P || g2 === Groups.FN)) && !(g1 === Groups.PL && g2 === Groups.CB)) {
            var p1 = a.power,
                p2 = b.power,
                isSymbolP1 = isSymbol(p1),
                isSymbolP2 = isSymbol(p2),
                toEX = (isSymbolP1 || isSymbolP2);
            //TODO: this needs cleaning up
            if (g1 === Groups.PL && g2 !== Groups.PL && b.previousGroup !== Groups.PL && p1.equals(1)) {
                result = new Symbol(0);
                a.each(function (x) {
                    result = deps.add(result, multiply(x, b.clone()));
                }, true);
            }
            else {
                //add the powers
                result.power = toEX ? deps.add(
                    !(isSymbol(p1)) ? new Symbol(p1) : p1,
                    !(isSymbol(p2)) ? new Symbol(p2) : p2
                ) : (g1 === Groups.N /*don't add powers for Groups.N*/ ? p1 : p1.add(p2));

                //eliminate zero power values and convert them to numbers
                if (result.power.equals(0))
                    result = result.convert(Groups.N);

                //properly convert to Groups.EX
                if (toEX)
                    result.convert(Groups.EX);

                //take care of imaginaries
                if (a.imaginary && b.imaginary) {
                    var isEven = even(result.power % 2);
                    if (isEven) {
                        result = new Symbol(1);
                        m.negate();
                    }
                }

                //cleanup: this causes the LaTeX generator to get confused as to how to render the symbol
                if (result.group !== Groups.EX && result.previousGroup)
                    result.previousGroup = undefined;
                //the sign for b is floating around. Remember we are assuming that the odd variable will carry
                //the sign but this isn't true if they're equals symbols
                result.multiplier = result.multiplier.multiply(b.multiplier);
            }
        }
        else if (g1 === Groups.CB && a.isLinear()) {
            if (g2 === Groups.CB)
                b.distributeExponent();
            if (g2 === Groups.CB && b.isLinear()) {
                for (var s in b.symbols) {
                    var x = b.symbols[s];
                    result = result.combine(x);
                }
                result.multiplier = result.multiplier.multiply(b.multiplier);
            }
            else {
                result.combine(b);
            }
        }
        else {
            //the multiplier was already handled so nothing left to do
            if (g1 !== Groups.N) {
                if (g1 === Groups.CB) {
                    result.distributeExponent();
                    result.combine(b);
                }
                else if (!b.isOne()) {
                    var bm = b.multiplier.clone();
                    b.toUnitMultiplier();
                    result = Symbol.shell(Groups.CB).combine([result, b]);
                    //transfer the multiplier to the outside
                    result.multiplier = result.multiplier.multiply(bm);
                }
            }
            else {
                result = b.clone().toUnitMultiplier();
            }
        }

        if (result.group === Groups.P) {
            var logV = Math.log(result.value),
                n1 = Math.log(bnum) / logV,
                n2 = Math.log(bden) / logV,
                ndiv = m.num / bnum,
                ddiv = m.den / bden;
            //we don't want to divide by zero no do we? Strange things happen.
            if (n1 !== 0 && isInt(n1) && isInt(ndiv)) {
                result.power = result.power.add(new Frac(n1));
                m.num /= bnum; //BigInt? Keep that in mind for the future.
            }
            if (n2 !== 0 && isInt(n2) && isInt(ddiv)) {
                result.power = result.power.subtract(new Frac(n2));
                m.den /= bden; //BigInt? Keep that in mind for the future.
            }
        }

        //unpack Groups.CB if length is only one
        if (result.length === 1) {
            var t = result.multiplier;
            //transfer the multiplier
            result = firstObject(result.symbols);
            result.multiplier = result.multiplier.multiply(t);
        }

        //reduce square root
        var ps = result.power.toString();
        if (even(ps) && result.fname === Settings.SQRT) {
            //grab the sign of the symbol
            sign = sign * result.sign();
            var p = result.power;
            result = result.args[0];
            result = multiply(new Symbol(m), deps.pow(result, new Symbol(p.divide(new Frac(2)))));
            //flip it back to the correct sign
            if (sign < 0)
                result.negate()
        }
        else {
            result.multiplier = result.multiplier.multiply(m).multiply(sign);
            if (result.group === Groups.CP && result.isImaginary())
                result.distributeMultiplier();
        }

        //back convert group Groups.P to a simpler group Groups.N if possible
        if (result.group === Groups.P && isInt(result.power.toDecimal()))
            result = result.convert(Groups.N);

        return result;
    }
    else {
        //****** Matrices & Vector *****//
        if (bIsSymbol && !aIsSymbol) { //keep symbols to the right
            t = a;
            a = b;
            b = t; //swap
            t = bIsSymbol;
            bIsSymbol = aIsSymbol;
            aIsSymbol = t;
        }

        var isMatrixB = isMatrix(b), isMatrixA = isMatrix(a);
        if (aIsSymbol && isMatrixB) {
            var M = new Matrix();
            b.eachElement(function (e, i, j) {
                M.set(i, j, multiply(a.clone(), e));
            });

            b = M;
        }
        else {
            if (isMatrixA && isMatrixB) {
                b = a.multiply(b);
            }
            else if (aIsSymbol && isVector(b)) {
                b.each(function (x, i) {
                    i--;
                    b.elements[i] = multiply(a.clone(), b.elements[i]);
                });
            }
            else {
                if (isVector(a) && isVector(b)) {
                    b.each(function (x, i) {
                        i--;
                        b.elements[i] = multiply(a.elements[i], b.elements[i]);
                    });
                }
                else if (isVector(a) && isMatrix(b)) {
                    //try to convert a to a matrix
                    return multiply(b, a);
                }
                else if (isMatrix(a) && isVector(b)) {
                    if (b.elements.length === a.rows()) {
                        var M = new Matrix(), l = a.cols();
                        b.each(function (e, i) {
                            var row = [];
                            for (var j = 0; j < l; j++) {
                                row.push(multiply(a.elements[i - 1][j].clone(), e.clone()));
                            }
                            M.elements.push(row);
                        });
                        return M;
                    }
                    else
                        err('Dimensions must match!');
                }
            }
        }

        return b;
    }
};
