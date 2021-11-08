import {Symbol, symfunction} from '../../Symbol';
import {Groups} from '../../Groups';
import {Settings} from '../../../Settings';
import {even, evenFraction, isInt, isMatrix, isPrime, isSymbol, isVector, warn} from '../../Utils';
import {UndefinedError} from '../../Errors';
import {add} from './add';
import bigDec from 'decimal.js';
import {Frac} from '../../Frac';
import {log} from '../math/log';
import {expand} from '../math/expand';
import {parse} from '../../parse';
import {abs} from '../math/abs';
import {Matrix} from '../../../Parser/Matrix';
import {PRIMES} from '../../Math.consts';
import {divide, multiply, sqrt} from '../index';
import {Trig} from '../../Trig';

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
                nre = multiply(r.clone(), Trig.cos(theta.clone()));
                nim = multiply(r, Trig.sin(theta));
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
                var b1 = Trig.cos(multiply(im.clone(), log_a));
                var c1 = multiply(Trig.sin(multiply(im, log(aa))), Symbol.imaginary());
                result = multiply(a1, add(b1, c1));
                result = expand(parse(result));
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
            result = add(Trig.cos(theta), multiply(Symbol.imaginary(), Trig.sin(theta)));
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

export function primeFactors(num) {
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

