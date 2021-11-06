import {Settings} from '../../Settings';
import {Groups} from '../Groups';
import {isSymbol, symfunction} from '../Symbol';
import bigDec from 'decimal.js';
import {Frac} from '../Frac';
import {even, evenFraction, firstObject, isInt} from '../Utils';
import {Math2} from '../Math2';
import {Complex} from '../Complex';
import {Collection} from '../../Parser/Collection';
import {isMatrix, Matrix} from '../../Parser/Matrix';
import {isVector} from '../../Parser/Vector';
import {DivisionByZero, err, UndefinedError} from '../Errors';
import {text} from '../Text';
import {isPrime, warn} from '../Utils';
import {PRIMES} from '../Math.consts';
import {isNumericSymbol} from '../Symbol';
import {Vector} from '../../Parser/Vector';
const {Symbol} = require('../Symbol');

export const SymbolOperatorsDeps = {
    parse: null,
    expand: null,
    Unit: null,
    evaluate: null,
    Trig: null,
    bigConvert: null
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
            return deps.Unit.multiply(a, b);
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

                var q = divide(u, v).invert();
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
                var d = subtract(u.clone(), v.clone());

                //if it's not numeric then we don't know if we can simplify so just return
                if (d.isConstant()) {

                    //there will never be a case where d == 0 since this will already have
                    //been handled at the beginning of this function
                    t = new Symbol(1);
                    if (d < 0) {
                        //If d is negative then the numerator is larger so expand that
                        for (var i = 0, n = Math.abs(d); i <= n; i++) {
                            var s = add(u.clone(), new Symbol(i));
                            t = multiply(t, s);
                        }

                        result = multiply(pow(u, new Symbol(a.power)), pow(t, new Symbol(b.power)));

                        b = new Symbol(1);
                    }
                    else {
                        //Otherwise the denominator is larger so expand that
                        for (var i = 0, n = Math.abs(d); i <= n; i++) {
                            var s = add(v.clone(), new Symbol(i));
                            t = multiply(t, s);
                        }

                        result = multiply(pow(t, new Symbol(a.power)), pow(v, new Symbol(b.power)));

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
                    result = add(result, multiply(x, b.clone()));
                }, true);
            }
            else {
                //add the powers
                result.power = toEX ? add(
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
            result = multiply(new Symbol(m), pow(result, new Symbol(p.divide(new Frac(2)))));
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
}

/**
 * Gets called when the parser finds the / operator. See this.add
 * @param {Symbol} a
 * @param {Symbol} b
 * @returns {Symbol}
 */
export function divide(a, b) {
    var aIsSymbol = isSymbol(a),
        bIsSymbol = isSymbol(b);

    if (aIsSymbol && bIsSymbol) {
        //forward to Unit division
        if (a.unit || b.unit) {
            return deps.Unit.divide(a, b);
        }
        var result;
        if (b.equals(0))
            throw new DivisionByZero('Division by zero not allowed!');

        if (a.isConstant() && b.isConstant()) {
            result = a.clone();
            result.multiplier = result.multiplier.divide(b.multiplier);
        }
        else {
            b.invert();
            result = multiply(a, b);
        }
        return result;
    }
    else {
        //******* Vectors & Matrices *********//
        var isVectorA = isVector(a), isVectorB = isVector(b);
        if (aIsSymbol && isVectorB) {
            b = b.map(function (x) {
                return divide(a.clone(), x);
            });
        }
        else if (isVectorA && bIsSymbol) {
            b = a.map(function (x) {
                return divide(x, b.clone());
            });
        }
        else if (isVectorA && isVectorB) {
            if (a.dimensions() === b.dimensions()) {
                b = b.map(function (x, i) {
                    return divide(a.elements[--i], x);
                });
            }
            else
                err('Cannot divide vectors. Dimensions do not match!');
        }
        else {
            var isMatrixA = isMatrix(a), isMatrixB = isMatrix(b);
            if (isMatrixA && bIsSymbol) {
                var M = new Matrix();
                a.eachElement(function (x, i, j) {
                    M.set(i, j, divide(x, b.clone()));
                });
                b = M;
            }
            else if (aIsSymbol && isMatrixB) {
                var M = new Matrix();
                b.eachElement(function (x, i, j) {
                    M.set(i, j, divide(a.clone(), x));
                });
                b = M;
            }
            else if (isMatrixA && isMatrixB) {
                var M = new Matrix();
                if (a.rows() === b.rows() && a.cols() === b.cols()) {
                    a.eachElement(function (x, i, j) {
                        M.set(i, j, divide(x, b.elements[i][j]));
                    });
                    b = M;
                }
                else {
                    err('Dimensions do not match!');
                }
            }
            else if (isMatrixA && isVectorB) {
                if (a.cols() === b.dimensions()) {
                    var M = new Matrix();
                    a.eachElement(function (x, i, j) {
                        M.set(i, j, divide(x, b.elements[i].clone()));
                    });
                    b = M;
                }
                else {
                    err('Unable to divide matrix by vector.');
                }
            }
        }
        return b;
    }
}

/**
 * Gets called when the parser finds the - operator. Not the prefix operator. See this.add
 * @param {Symbol} a
 * @param {Symbol} b
 * @returns {Symbol}
 */
export function subtract(a, b) {
    var aIsSymbol = isSymbol(a),
        bIsSymbol = isSymbol(b);

    if (aIsSymbol && bIsSymbol) {
        if (a.unit || b.unit) {
            return deps.Unit.subtract(a, b);
        }
        return add(a, b.negate());
    }
    else {
        if (bIsSymbol && isVector(a)) {
            b = a.map(function (x) {
                return subtract(x, b.clone());
            });
        }
        else if (aIsSymbol && isVector(b)) {
            b = b.map(function (x) {
                return subtract(a.clone(), x);
            });
        }
        else if (isVector(a) && isVector(b)) {
            if (a.dimensions() === b.dimensions())
                b = a.subtract(b);
            else
                err('Unable to subtract vectors. Dimensions do not match.');
        }
        else if (isMatrix(a) && isVector(b)) {
            if (b.elements.length === a.rows()) {
                var M = new Matrix(), l = a.cols();
                b.each(function (e, i) {
                    var row = [];
                    for (var j = 0; j < l; j++) {
                        row.push(subtract(a.elements[i - 1][j].clone(), e.clone()));
                    }
                    M.elements.push(row);
                });
                return M;
            }
            else
                err('Dimensions must match!');
        }
        else if (isVector(a) && isMatrix(b)) {
            var M = b.clone().negate();
            return add(M, a);
        }
        else if (isMatrix(a) && isMatrix(b)) {
            b = a.subtract(b);
        }
        else if (isMatrix(a) && bIsSymbol) {
            var M = new Matrix();
            a.each(function (x, i, j) {
                M.set(i, j, subtract(x, b.clone()));
            });
            b = M;
        }
        else if (aIsSymbol && isMatrix(b)) {
            var M = new Matrix();
            b.each(function (x, i, j) {
                M.set(i, j, subtract(a.clone(), x));
            });
            b = M;
        }
        return b;
    }
}

/**
 * Adds two symbols
 * @param {Symbol} a
 * @param {Symbol} b
 * @returns {Symbol}
 */
export function add(a, b) {
    var aIsSymbol = isSymbol(a),
        bIsSymbol = isSymbol(b);
    //we're dealing with two symbols
    if (aIsSymbol && bIsSymbol) {
        //forward the adding of symbols with units to the Unit module
        if (a.unit || b.unit) {
            return deps.Unit.add(a, b);
        }
        //handle Infinity
        //https://www.encyclopediaofmath.org/index.php/Infinity
        if (a.isInfinity || b.isInfinity) {
            var aneg = a.multiplier.lessThan(0),
                bneg = b.multiplier.lessThan(0);

            if (a.isInfinity && b.isInfinity && aneg !== bneg) {
                throw new UndefinedError('(' + a + ')+(' + b + ') is not defined!');
            }

            var inf = Symbol.infinity();
            if (bneg)
                inf.negate();
            return inf;
        }

        if (a.isComposite() && a.isLinear() && b.isComposite() && b.isLinear()) {
            a.distributeMultiplier();
            b.distributeMultiplier();
            // Fix for issue #606
            if (b.length > a.length && a.group === b.group) {
                [a, b] = [b, a];
            }
        }

        //no need to waste time on zeroes
        if (a.multiplier.equals(0))
            return b;
        if (b.multiplier.equals(0))
            return a;

        if (a.isConstant() && b.isConstant() && Settings.PARSE2NUMBER) {
            var result = new Symbol(a.multiplier.add(b.multiplier).toDecimal(Settings.PRECISION));
            return result;
        }

        var g1 = a.group,
            g2 = b.group,
            ap = a.power.toString(),
            bp = b.power.toString();

        //always keep the greater group on the left.
        if (g1 < g2 || (g1 === g2 && ap > bp && bp > 0)) {
            return add(b, a);
        }

        /*note to self: Please don't forget about this dilemma ever again. In this model Groups.PL and Groups.CB goes crazy
         * because it doesn't know which one to prioritize. */
        //correction to Groups.PL dilemma
        if (g1 === Groups.CB && g2 === Groups.PL && a.value === b.value) {
            //swap
            var t = a;
            a = b;
            b = t;
            g1 = a.group;
            g2 = b.group;
            ap = a.power.toString();
            bp = b.power.toString();
        }

        var powEQ = ap === bp,
            v1 = a.value,
            v2 = b.value,
            aIsComposite = a.isComposite(),
            bIsComposite = b.isComposite(),
            h1, h2, result;

        if (aIsComposite)
            h1 = text(a, 'hash');
        if (bIsComposite)
            h2 = text(b, 'hash');

        if (g1 === Groups.CP && g2 === Groups.CP && b.isLinear() && !a.isLinear() && h1 !== h2) {
            return add(b, a);
        }

        //Groups.PL & Groups.PL should compare hashes and not values e.g. compare x+x^2 with x+x^3 and not x with x
        if (g1 === Groups.PL && g2 === Groups.PL) {
            v1 = h1;
            v2 = h2;
        }

        var PN = g1 === Groups.P && g2 === Groups.N,
            PNEQ = a.value === b.multiplier.toString(),
            valEQ = (v1 === v2 || h1 === h2 && h1 !== undefined || (PN && PNEQ));

        //equal values, equal powers
        if (valEQ && powEQ && g1 === g2) {
            //make sure to convert Groups.N to something Groups.P can work with
            if (PN)
                b = b.convert(Groups.P);//CL

            //handle Groups.PL
            if (g1 === Groups.PL && (g2 === Groups.S || g2 === Groups.P)) {
                a.distributeMultiplier();
                result = a.attach(b);
            }
            else {
                result = a;//CL
                if (a.multiplier.isOne() && b.multiplier.isOne() && g1 === Groups.CP && a.isLinear() && b.isLinear()) {
                    for (var s in b.symbols) {
                        var x = b.symbols[s];
                        result.attach(x);
                    }
                }
                else
                    result.multiplier = result.multiplier.add(b.multiplier);
            }
        }
        //equal values uneven powers
        else if (valEQ && g1 !== Groups.PL) {
            //break the tie for e.g. (x+1)+((x+1)^2+(x+1)^3)
            if (g1 === Groups.CP && g2 === Groups.PL) {
                b.insert(a, 'add');
                result = b;
            }
            else {
                result = Symbol.shell(Groups.PL).attach([a, b]);
                //update the hash
                result.value = g1 === Groups.PL ? h1 : v1;
            }
        }
        else if (aIsComposite && a.isLinear()) {
            var canIterate = g1 === g2,
                bothPL = g1 === Groups.PL && g2 === Groups.PL;

            //we can only iterate group Groups.PL if they values match
            if (bothPL)
                canIterate = a.value === b.value;
            //distribute the multiplier over the entire symbol
            a.distributeMultiplier();

            if (b.isComposite() && b.isLinear() && canIterate) {
                b.distributeMultiplier();
                //CL
                for (var s in b.symbols) {
                    var x = b.symbols[s];
                    a.attach(x);
                }
                result = a;
            }
            //handle cases like 2*(x+x^2)^2+2*(x+x^2)^3+4*(x+x^2)^2
            else if (bothPL && a.value !== h2 || g1 === Groups.PL && !valEQ) {
                result = Symbol.shell(Groups.CP).attach([a, b]);
                result.updateHash();

            }
            else {
                result = a.attach(b);
            }
        }
        else {
            if (g1 === Groups.FN && a.fname === Settings.SQRT && g2 !== Groups.EX && b.power.equals(0.5)) {
                var m = b.multiplier.clone();
                b = sqrt(b.toUnitMultiplier().toLinear());
                b.multiplier = m;
            }
            //fix for issue #3 and #159
            if (a.length === 2 && b.length === 2 && even(a.power) && even(b.power)) {
                result = add(deps.expand(a), deps.expand(b));
            }
            else {
                result = Symbol.shell(Groups.CP).attach([a, b]);
                result.updateHash();
            }
        }

        if (result.multiplier.equals(0))
            result = new Symbol(0);

        //make sure to remove unnecessary wraps
        if (result.length === 1) {
            var m = result.multiplier;
            result = firstObject(result.symbols);
            result.multiplier = result.multiplier.multiply(m);
        }

        return result;
    }
    else {
        //keep symbols to the right
        if (bIsSymbol && !aIsSymbol) {
            var t = a;
            a = b;
            b = t; //swap
            t = bIsSymbol;
            bIsSymbol = aIsSymbol;
            aIsSymbol = t;
        }

        var bIsMatrix = isMatrix(b);

        if (aIsSymbol && bIsMatrix) {
            var M = new Matrix();
            b.eachElement(function (e, i, j) {
                M.set(i, j, add(a.clone(), e));
            });

            b = M
        }
        else {
            if (isMatrix(a) && bIsMatrix) {
                b = a.add(b);
            }
            else if (aIsSymbol && isVector(b)) {
                b.each(function (x, i) {
                    i--;
                    b.elements[i] = add(a.clone(), b.elements[i]);
                });
            }
            else {
                if (isVector(a) && isVector(b)) {
                    b.each(function (x, i) {
                        i--;
                        b.elements[i] = add(a.elements[i], b.elements[i]);
                    });
                }
                else if (isVector(a) && isMatrix(b)) {
                    //try to convert a to a matrix
                    return add(b, a);
                }
                else if (isMatrix(a) && isVector(b)) {
                    if (b.elements.length === a.rows()) {
                        var M = new Matrix(), l = a.cols();
                        b.each(function (e, i) {
                            var row = [];
                            for (var j = 0; j < l; j++) {
                                row.push(add(a.elements[i - 1][j].clone(), e.clone()));
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
}


/**
 * Gets called when the parser finds the ^ operator. See this.add
 * @param {Symbol} a
 * @param {Symbol} b
 * @returns {Symbol}
 */
export function pow(a, b) {
    var aIsSymbol = isSymbol(a),
        bIsSymbol = isSymbol(b);
    if (aIsSymbol && bIsSymbol) {
        //it has units then it's the Unit module's problem
        if (a.unit || b.unit) {
            return deps.Unit.pow(a, b);
        }

        // Handle abs
        if (a.group === Groups.FN && a.fname === Settings.ABS && even(b)) {
            var m = a.multiplier.clone();
            var raised = pow(a.args[0], b);
            raised.multiplier = m;
            return raised;
        }

        // Handle infinity
        if (a.isInfinity || b.isInfinity) {
            if (a.isInfinity && b.isInfinity)
                throw new UndefinedError('(' + a + ')^(' + b + ') is undefined!');

            if (a.isConstant() && b.isInfinity) {
                if (a.equals(0)) {
                    if (b.lessThan(0))
                        throw new UndefinedError('0^Infinity is undefined!');
                    return new Symbol(0);
                }
                if (a.equals(1))
                    throw new UndefinedError('1^' + b.toString() + ' is undefined!');
                //a^-oo
                if (b.lessThan(0))
                    return new Symbol(0);
                //a^oo
                if (!a.lessThan(0))
                    return Symbol.infinity();
            }

            if (a.isInfinity && b.isConstant()) {
                if (b.equals(0))
                    throw new UndefinedError(a + '^0 is undefined!');
                if (b.lessThan(0))
                    return new Symbol(0);
                return multiply(Symbol.infinity(), pow(new Symbol(a.sign()), b.clone()));
            }
        }

        var aIsZero = a.equals(0);
        var bIsZero = b.equals(0);
        if (aIsZero && bIsZero)
            throw new UndefinedError('0^0 is undefined!');

        // Return 0 right away if possible
        if (aIsZero && b.isConstant() && b.multiplier.greaterThan(0))
            return new Symbol(0);

        if (bIsZero)
            return new Symbol(1);

        var bIsConstant = b.isConstant(),
            aIsConstant = a.isConstant(),
            bIsInt = b.isInteger(),
            m = a.multiplier,
            result = a.clone();

        // 0^0, 1/0, etc. Complain.
        if (aIsConstant && bIsConstant && a.equals(0) && b.lessThan(0))
            throw new UndefinedError('Division by zero is not allowed!');

        // Compute imaginary numbers right away
        if (Settings.PARSE2NUMBER && aIsConstant && bIsConstant && a.sign() < 0 && evenFraction(b)) {
            var k, re, im;
            k = Math.PI * b;
            re = new Symbol(Math.cos(k));
            im = multiply(Symbol.imaginary(), new Symbol(Math.sin(k)));
            return add(re, im);
        }

        // Imaginary number under negative nthroot or to the n
        if (Settings.PARSE2NUMBER && a.isImaginary() && bIsConstant && isInt(b) && !b.lessThan(0)) {
            var re, im, r, theta, nre, nim, phi;
            re = a.realpart();
            im = a.imagpart();
            if (re.isConstant('all') && im.isConstant('all')) {
                phi = Settings.USE_BIG ? Symbol(bigDec.atan2(i.multiplier.toDecimal(), r.multiplier.toDecimal()).times(b.toString())) : Math.atan2(im, re) * b;
                theta = new Symbol(phi);
                r = pow(Symbol.hyp(re, im), b);
                nre = multiply(r.clone(), deps.Trig.cos(theta.clone()));
                nim = multiply(r, deps.Trig.sin(theta));
                return add(nre, multiply(Symbol.imaginary(), nim));
            }
        }

        // Take care of the symbolic part
        result.toUnitMultiplier();
        //simpifly sqrt
        if (result.group === Groups.FN && result.fname === Settings.SQRT && !bIsConstant) {
            var s = result.args[0];
            s.multiplyPower(new Symbol(0.5));
            s.multiplier.multiply(result.multiplier);
            s.multiplyPower(b);
            result = s;
        }
        else {
            var sign = m.sign();
            //handle cases such as (-a^3)^(1/4)
            if (evenFraction(b) && sign < 0) {
                // Swaperoo
                // First put the sign back on the symbol
                result.negate();
                // Wrap it in brackets
                result = symfunction(Settings.PARENTHESIS, [result]);
                // Move the sign back the exterior and let nerdamer handle the rest
                result.negate();
            }

            result.multiplyPower(b);
        }

        if (aIsConstant && bIsConstant && Settings.PARSE2NUMBER) {
            var c;
            //remove the sign
            if (sign < 0) {
                a.negate();
                if (b.multiplier.den.equals(2))
                    //we know that the numerator has to be odd and therefore it's i
                    c = new Symbol(Settings.IMAGINARY);
                else if (isInt(b.multiplier)) {
                    if (even(b.multiplier))
                        c = new Symbol(1);
                    else
                        c = new Symbol(-1);
                }
                else if (!even(b.multiplier.den)) {
                    c = new Symbol(Math.pow(sign, b.multiplier.num));
                }
                else {
                    c = pow(symfunction(Settings.PARENTHESIS, [new Symbol(sign)]), b.clone());
                }
            }

            result = new Symbol(Math.pow(a.multiplier.toDecimal(), b.multiplier.toDecimal()));

            //result = new Symbol(Math2.bigpow(a.multiplier, b.multiplier));
            //put the back sign
            if (c)
                result = multiply(result, c);
        }
        else if (bIsInt && !m.equals(1)) {
            var abs_b = b.abs();
            // Provide fall back to JS until big number implementation is improved
            if (abs_b.gt(Settings.MAX_EXP)) {
                if (b.sign() < 0)
                    return new Symbol(0);
                return Symbol.infinity();
            }
            else {
                var p = b.multiplier.toDecimal();
                var sgn = Math.sign(p);
                p = Math.abs(p);
                var multiplier = new Frac(1);
                multiplier.num = m.num.pow(p);
                multiplier.den = m.den.pow(p);
                if (sgn < 0)
                    multiplier.invert();
                //multiplying is justified since after mulltiplyPower if it was of group Groups.P it will now be of group Groups.N
                result.multiplier = result.multiplier.multiply(multiplier);
            }
        }
        else {
            var sign = a.sign();
            if (b.isConstant() && a.isConstant() && !b.multiplier.den.equals(1) && sign < 0) {
                //we know the sign is negative so if the denominator for b == 2 then it's i
                if (b.multiplier.den.equals(2)) {
                    var i = new Symbol(Settings.IMAGINARY);
                    a.negate();//remove the sign
                    //if the power is negative then i is negative
                    if (b.lessThan(0)) {
                        i.negate();
                        b.negate();//remove the sign from the power
                    }
                    //pull the power normally and put back the imaginary
                    result = multiply(pow(a, b), i);
                }
                else {
                    var aa = a.clone();
                    aa.multiplier.negate();
                    result = pow(symfunction(Settings.PARENTHESIS, [new Symbol(sign)]), b.clone());
                    var _a = pow(new Symbol(aa.multiplier.num), b.clone());
                    var _b = pow(new Symbol(aa.multiplier.den), b.clone());
                    var r = divide(_a, _b);
                    result = multiply(result, r);
                }
            }
            else if (Settings.PARSE2NUMBER && b.isImaginary()) {
                //4^(i + 2) = e^(- (2 - 4 i) π n + (2 + i) log(4))

                var re = b.realpart();
                var im = b.imagpart();
                /*
                 if (b.group === CP && false) {
                 var ex = pow(a.clone(), re);
                 var xi = multiply(multiply(ex.clone(), trig.sin(im.clone())), Symbol.imaginary());
                 var xa = multiply(trig.cos(im), ex);
                 result = add(xi, xa);
                 }
                 else {
                 */
                var aa = a.clone().toLinear();
                var a1 = pow(aa.clone(), re);
                var log_a = log(aa.clone());
                var b1 = deps.Trig.cos(multiply(im.clone(), log_a));
                var c1 = multiply(deps.Trig.sin(multiply(im, log(aa))), Symbol.imaginary());
                result = multiply(a1, add(b1, c1));
                result = deps.expand(deps.parse(result));
                /*
                 }
                 */
            }
            else {
                //b is a symbol
                var neg_num = a.group === Groups.N && sign < 0,
                    num = testSQRT(new Symbol(neg_num ? m.num : Math.abs(m.num)).setPower(b.clone())),
                    den = testSQRT(new Symbol(m.den).setPower(b.clone()).invert());

                //eliminate imaginary if possible
                if (a.imaginary) {
                    if (bIsInt) {
                        var s, p, n;
                        s = Math.sign(b);
                        p = abs(b);
                        n = p % 4;
                        result = new Symbol(even(n) ? -1 : Settings.IMAGINARY);
                        if (n === 0 || s < 0 && (n === 1) || s > 0 && (n === 3)) {
                            result.negate();
                        }
                    }
                    else {
                        //assume i = sqrt(-1) -> (-1)^(1/2)
                        var nr = b.multiplier.multiply(Frac.quick(1, 2)),
                            //the denominator denotes the power so raise to it. It will turn positive it round
                            tn = Math.pow(-1, nr.num);
                        result = even(nr.den) ? new Symbol(-1).setPower(nr, true) : new Symbol(tn);
                    }
                }
                //ensure that the sign is carried by the symbol and not the multiplier
                //this enables us to check down the line if the multiplier can indeed be transferred
                if (sign < 0 && !neg_num)
                    result.negate();

                //retain the absolute value
                if (bIsConstant && a.group !== Groups.EX) {
                    var evenr = even(b.multiplier.den),
                        evenp = even(a.power),
                        n = result.power.toDecimal(),
                        evennp = even(n);
                    if (evenr && evenp && !evennp) {
                        if (n === 1)
                            result = symfunction(Settings.ABS, [result]);
                        else if (!isInt(n)) {
                            var p = result.power;
                            result = symfunction(Settings.ABS, [result.toLinear()]).setPower(p);
                        }
                        else {
                            result = multiply(symfunction(Settings.ABS, [result.clone().toLinear()]),
                                result.clone().setPower(new Frac(n - 1)));
                        }
                        //quick workaround. Revisit
                        if (Settings.POSITIVE_MULTIPLIERS && result.fname === Settings.ABS)
                            result = result.args[0];
                    }
                }
                //multiply out sqrt
                if (b.equals(2) && result.group === Groups.CB) {
                    var _result = new Symbol(1);
                    result.each(function (sym) {
                        _result = multiply(_result, pow(sym, b));
                    });
                    result = _result;
                }
            }
        }

        result = testSQRT(result);

        // Don't multiply until we've tested the remaining symbol
        if (num && den) {
            result = multiply(result, testPow(multiply(num, den)));
        }

        // Reduce square root
        if (result.fname === Settings.SQRT) {
            var isEX = result.group === Groups.EX;
            var t = isEX ? result.power.multiplier.toString() : result.power.toString();
            if (even(t)) {
                var pt = isEX ? divide(result.power, new Symbol(2)) : new Symbol(result.power.divide(new Frac(2))),
                    m = result.multiplier;
                result = pow(result.args[0], pt);
                result.multiplier = result.multiplier.multiply(m);
            }
        }
        // Detect Euler's identity
        else if (!Settings.IGNORE_E && result.isE() && result.group === Groups.EX && result.power.contains('pi')
            && result.power.contains(Settings.IMAGINARY) && b.group === Groups.CB) {
            var theta = b.stripVar(Settings.IMAGINARY);
            result = add(deps.Trig.cos(theta), multiply(Symbol.imaginary(), deps.Trig.sin(theta)));
        }

        return result;
    }
    else {
        if (isVector(a) && bIsSymbol) {
            a = a.map(function (x) {
                return pow(x, b.clone());
            });
        }
        else if (isMatrix(a) && bIsSymbol) {
            var M = new Matrix();
            a.eachElement(function (x, i, j) {
                M.set(i, j, pow(x, b.clone()));
            });
            a = M;
        }
        else if (aIsSymbol && isMatrix(b)) {
            var M = new Matrix();
            b.eachElement(function (x, i, j) {
                M.set(i, j, pow(a.clone(), x));
            });
            a = M;
        }
        return a;
    }
}

function testSQRT(symbol) {
    //wrap the symbol in sqrt. This eliminates one more check down the line.
    if (!isSymbol(symbol.power) && symbol.power.absEquals(0.5)) {
        var sign = symbol.power.sign();
        //don't devide the power directly. Notice the use of toString. This makes it possible
        //to use a bigNumber library in the future
        var retval = sqrt(symbol.group === Groups.P ? new Symbol(symbol.value) : symbol.toLinear());
        //place back the sign of the power
        if (sign < 0)
            retval.invert();
        return retval;
    }
    return symbol;
}

//try to reduce a symbol by pulling its power
function testPow(symbol) {
    if (symbol.group === Groups.P) {
        var v = symbol.value;

        var fct = primeFactors(v)[0];

        //safety
        if (!fct) {
            warn('Unable to compute prime factors. This should not happen. Please review and report.');
            return symbol;
        }

        var n = new Frac(Math.log(v) / Math.log(fct)),
            p = n.multiply(symbol.power);

        //we don't want a more complex number than before
        if (p.den > symbol.power.den)
            return symbol;

        if (isInt(p))
            symbol = new Symbol(Math.pow(fct, p));
        else
            symbol = new Symbol(fct).setPower(p);
    }

    return symbol;
}


/**
 * Calculates prime factors for a number. It first checks if the number
 * is a prime number. If it's not then it will calculate all the primes
 * for that number.
 * @param {int} num
 * @returns {Array}
 */

function primeFactors(num) {
    if (isPrime(num)) {
        return [num];
    }

    var l = num, i = 1, factors = [],
        epsilon = 2.2204460492503130808472633361816E-16;
    while(i < l) {
        var quotient = num / i;
        var whole = Math.floor(quotient);
        var remainder = quotient - whole;

        if (remainder <= epsilon && i > 1) {
            // If the prime wasn't found but calculated then save it and
            // add it as a factor.
            if (isPrime(i)) {
                if (PRIMES.indexOf(i) === -1) {
                    PRIMES.push(i);
                }
                factors.push(i);
            }

            // Check if the remainder is a prime
            if (isPrime(whole)) {
                factors.push(whole);
                break;
            }

            l = whole;
        }
        i++;
    }

    return factors.sort(function (a, b) {
        return a - b;
    });
}

primeFactors(314146179365);


/**
 * The log function
 * @param {Symbol} symbol
 * @param {Symbol} base
 * @returns {Symbol}
 */
export function log(symbol, base) {

    if (symbol.equals(1)) {
        return new Symbol(0);
    }

    var retval;

    if (symbol.fname === Settings.SQRT && symbol.multiplier.equals(1)) {
        retval = divide(log(symbol.args[0]), new Symbol(2));

        if (symbol.power.sign() < 0) {
            retval.negate();
        }

        // Exit early
        return retval;
    }

    //log(0) is undefined so complain
    if (symbol.equals(0)) {
        throw new UndefinedError(Settings.LOG + '(0) is undefined!');
    }

    //deal with imaginary values
    if (symbol.isImaginary()) {
        return Complex.evaluate(symbol, Settings.LOG);
    }

    if (symbol.isConstant() && typeof base !== 'undefined' && base.isConstant()) {
        var log_sym = Math.log(symbol);
        var log_base = Math.log(base);
        retval = new Symbol(log_sym / log_base);
    }
    else if (symbol.group === Groups.EX && symbol.power.multiplier.lessThan(0) || symbol.power.toString() === '-1') {
        symbol.power.negate();
        //move the negative outside but keep the positive inside :)
        retval = log(symbol).negate();
    }
    else if (symbol.value === 'e' && symbol.multiplier.equals(1)) {
        var p = symbol.power;
        retval = isSymbol(p) ? p : new Symbol(p);
    }
    else if (symbol.group === Groups.FN && symbol.fname === 'exp') {
        var s = symbol.args[0];
        if (symbol.multiplier.equals(1))
            retval = multiply(s, new Symbol(symbol.power));
        else
            retval = symfunction(Settings.LOG, [symbol]);
    }
    else if (Settings.PARSE2NUMBER && isNumericSymbol(symbol)) {
        // Parse for safety.
        symbol = deps.parse(symbol);

        var img_part;
        if (symbol.multiplier.lessThan(0)) {
            symbol.negate();
            img_part = multiply(new Symbol(Math.PI), new Symbol('i'));
        }

        retval = new Symbol(Math.log(symbol.multiplier.toDecimal()));

        if (img_part) {
            retval = add(retval, img_part);
        }

    }
    else {
        var s;
        if (!symbol.power.equals(1) && !symbol.contains('e')) {
            s = symbol.group === Groups.EX ? symbol.power : new Symbol(symbol.power);
            symbol.toLinear();
        }
        //log(a,a) = 1 since the base is allowed to be changed.
        //This was pointed out by Happypig375 in issue #280
        if (arguments.length > 1 && allSame(arguments)) {
            retval = new Symbol(1);
        }
        else {
            retval = symfunction(Settings.LOG, arguments);
        }

        if (s)
            retval = multiply(s, retval);
    }

    return retval;
}


export function pfactor(symbol) {
    //Fix issue #458 | nerdamer("sqrt(1-(3.3333333550520926e-7)^2)").evaluate().text()
    //More Big Number issues >:(
    if (symbol.greaterThan(9.999999999998891e+41) || symbol.equals(-1))
        return symbol;
    //Fix issue #298
    if (symbol.equals(Math.PI))
        return new Symbol(Math.PI);
    //evaluate the symbol to merge constants
    symbol = deps.evaluate(symbol.clone());

    if (symbol.isConstant()) {
        var retval = new Symbol(1);
        var m = symbol.toString();
        if (isInt(m)) {
            var factors = Math2.ifactor(m);
            for (var factor in factors) {
                var p = factors[factor];
                retval = multiply(retval, symfunction('parens', [new Symbol(factor).setPower(new Frac(p))]));
            }
        }
        else {
            var n = pfactor(new Symbol(symbol.multiplier.num));
            var d = pfactor(new Symbol(symbol.multiplier.den));
            retval = multiply(symfunction('parens', [n]), symfunction('parens', [d]).invert());
        }
    }
    else
        retval = symfunction('pfactor', arguments);
    return retval;
}

/**
 * Rationalizes a symbol
 * @param {Symbol} symbol
 * @returns {Symbol}
 */
export function rationalize(symbol) {
    if (symbol.isComposite()) {
        var retval = new Symbol(0);
        var num, den, retnum, retden, a, b, n, d;
        symbol.each(function (x) {
            num = x.getNum();
            den = x.getDenom();
            retnum = retval.getNum();
            retden = retval.getDenom();
            a = multiply(den, retnum);
            b = multiply(num, retden);
            n = deps.expand(add(a, b));
            d = multiply(retden, den);
            retval = divide(n, d);
        }, true);

        return retval;
    }
    return symbol;
}

export function abs(symbol) {

    //|-∞| = ∞
    if (symbol.isInfinity) {
        return Symbol.infinity();
    }
    if (symbol.multiplier.lessThan(0))
        symbol.multiplier.negate();

    if (symbol.isImaginary()) {
        var re = symbol.realpart();
        var im = symbol.imagpart();
        if (re.isConstant() && im.isConstant())
            return sqrt(add(pow(re, new Symbol(2)), pow(im, new Symbol(2))));
    }
    else if (isNumericSymbol(symbol) || even(symbol.power)) {
        return symbol;
    }

    if (symbol.isComposite()) {
        var ms = [];
        symbol.each(function (x) {
            ms.push(x.multiplier);
        });
        var gcd = Math2.QGCD.apply(null, ms);
        if (gcd.lessThan(0)) {
            symbol.multiplier = symbol.multiplier.multiply(new Frac(-1));
            symbol.distributeMultiplier();
        }
    }

    //convert |n*x| to n*|x|
    var m = deps.parse(symbol.multiplier);
    symbol.toUnitMultiplier();

    return multiply(m, symfunction(Settings.ABS, [symbol]));
}

/**
 * The factorial function
 * @param {Symbol} symbol
 * @return {Symbol}
 */
export function factorial(symbol) {
    var retval;
    if (isVector(symbol)) {
        var V = new Vector();
        symbol.each(function (x, i) {
            //i start at one.
            V.set(i - 1, factorial(x));
        });
        return V;
    }
    if (isMatrix(symbol)) {
        var M = new Matrix();
        symbol.each(function (x, i, j) {
            //i start at one.
            M.set(i, j, factorial(x));
        });
        return M;
    }
    if (Settings.PARSE2NUMBER && symbol.isConstant()) {
        if (isInt(symbol)) {
            retval = Math2.bigfactorial(symbol);
        }
        else {
            retval = Math2.gamma(symbol.multiplier.add(new Frac(1)).toDecimal());
        }

        retval = deps.bigConvert(retval);
        return retval;
    }
    else if (symbol.isConstant()) {
        var den = symbol.getDenom();
        if (den.equals(2)) {
            var num = symbol.getNum();
            var a, b, c, n;

            if (!symbol.multiplier.isNegative()) {
                n = add(num, new Symbol(1)).multiplier.divide(new Frac(2));
                a = Math2.bigfactorial(new Frac(2).multiply(n));
                b = pow(new Symbol(4), new Symbol(n)).multiplier.multiply(Math2.bigfactorial(n));
            }
            else {
                n = subtract(num.negate(), new Symbol(1)).multiplier.divide(new Frac(2));
                a = pow(new Symbol(-4), new Symbol(n)).multiplier.multiply(Math2.bigfactorial(n));
                b = Math2.bigfactorial(new Frac(2).multiply(n));
            }
            c = a.divide(b);
            return multiply(deps.parse('sqrt(pi)'), new Symbol(c));
        }
    }
    return symfunction(Settings.FACTORIAL, [symbol]);
}
