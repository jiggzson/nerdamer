//Math2 ========================================================================
//This object holds additional functions for nerdamer. Think of it as an extension of the Math object.
//I really don't like touching objects which aren't mine hence the reason for Math2. The names of the
//functions within are pretty self-explanatory.
//NOTE: DO NOT USE INLINE COMMENTS WITH THE MATH2 OBJECT! THIS BREAK DURING COMPILATION OF BUILDFUNCTION.

import {Frac} from './Frac';
import bigInt from '../3rdparty/bigInt';
import {arrayMin, arrayUnique, even, generatePrimes, isInt, nround, warn} from './Utils';
import {Symbol} from './Symbol';
import {PRIMES, BIGLOG_CACHE} from './Math.consts';
import {Groups} from './Groups';


// noinspection JSUnusedGlobalSymbols
export var Math2 = {
    csc: function (x) {
        return 1 / Math.sin(x);
    },
    sec: function (x) {
        return 1 / Math.cos(x);
    },
    cot: function (x) {
        return 1 / Math.tan(x);
    },
    acsc: function (x) {
        return Math.asin(1 / x);
    },
    asec: function (x) {
        return Math.acos(1 / x);
    },
    acot: function (x) {
        return (Math.PI / 2) - Math.atan(x);
    },
    // https://gist.github.com/jiggzson/df0e9ae8b3b06ff3d8dc2aa062853bd8
    erf: function (x) {
        var t = 1 / (1 + 0.5 * Math.abs(x));
        var result = 1 - t * Math.exp(-x * x - 1.26551223 +
            t * (1.00002368 +
                t * (0.37409196 +
                    t * (0.09678418 +
                        t * (-0.18628806 +
                            t * (0.27886807 +
                                t * (-1.13520398 +
                                    t * (1.48851587 +
                                        t * (-0.82215223 +
                                            t * (0.17087277)))))))))
        );
        return x >= 0 ? result : -result;
    },
    diff: function (f) {
        var h = 0.001;

        return function (x) {
            return (f(x + h) - f(x - h)) / (2 * h);
        };
    },
    median: function (...values) {
        values.sort(function (a, b) {
            return a - b;
        });

        var half = Math.floor(values.length / 2);

        if (values.length % 2)
            return values[half];

        return (values[half - 1] + values[half]) / 2.0;
    },
    /*
     * Reverses continued fraction calculation
     * @param {obj} contd
     * @returns {Number}
     */
    fromContinued: function (contd) {
        var arr = contd.fractions.slice();
        var e = 1 / arr.pop();
        for (var i = 0, l = arr.length; i < l; i++) {
            e = 1 / (arr.pop() + e);
        }
        return contd.sign * (contd.whole + e);
    },
    /*
     * Calculates continued fractions
     * @param {Number} n
     * @param {Number} x The number of places
     * @returns {Number}
     */
    continuedFraction: function (n, x) {
        x = x || 20;
        var sign = Math.sign(n); /*store the sign*/
        var absn = Math.abs(n); /*get the absolute value of the number*/
        var whole = Math.floor(absn); /*get the whole*/
        var ni = absn - whole; /*subtract the whole*/
        var c = 0; /*the counter to keep track of iterations*/
        var done = false;
        var epsilon = 1e-14;
        var max = 1e7;
        var e, w;
        var retval = {
            whole: whole,
            sign: sign,
            fractions: []
        };
        /*start calculating*/
        while(!done && ni !== 0) {
            /*invert and get the whole*/
            e = 1 / ni;
            w = Math.floor(e);
            if (w > max) {
                /*this signals that we may have already gone too far*/
                var d = Math2.fromContinued(retval) - n;
                if (d <= Number.EPSILON)
                    break;
            }
            /*add to result*/
            retval.fractions.push(w);
            /*move the ni to the decimal*/
            ni = e - w;
            /*ni should always be a decimal. If we have a whole number then we're in the rounding errors*/
            if (ni <= epsilon || c >= x - 1)
                done = true;
            c++;
        }
        /*cleanup 1/(n+1/1) = 1/(n+1) so just move the last digit one over if it's one*/
        var idx = retval.fractions.length - 1;
        if (retval.fractions[idx] === 1) {
            retval.fractions.pop();
            /*increase the last one by one*/
            retval.fractions[--idx]++;
        }
        return retval;
    },
    bigpow: function (n, p) {
        if (!(n instanceof Frac))
            n = Frac.create(n);
        if (!(p instanceof Frac))
            p = Frac.create(p);
        var retval = new Frac(0);
        if (p.isInteger()) {
            retval.num = n.num.pow(p.toString());
            retval.den = n.den.pow(p.toString());
        }
        else {
            var num = Frac.create(Math.pow(n.num, p.num));
            var den = Frac.create(Math.pow(n.den, p.num));

            retval.num = Math2.nthroot(num, p.den.toString());
            retval.den = Math2.nthroot(den, p.den);
        }
        return retval;
    },
    //http://stackoverflow.com/questions/15454183/how-to-make-a-function-that-computes-the-factorial-for-numbers-with-decimals
    gamma: function (z) {
        var g = 7;
        var C = [
            0.99999999999980993,
            676.5203681218851,
            -1259.1392167224028,
            771.32342877765313,
            -176.61502916214059,
            12.507343278686905,
            -0.13857109526572012,
            9.9843695780195716e-6,
            1.5056327351493116e-7]
        ;

        if (z < 0.5)
            return Math.PI / (Math.sin(Math.PI * z) * Math2.gamma(1 - z));
        else {
            z -= 1;

            var x = C[0];
            for (var i = 1; i < g + 2; i++)
                x += C[i] / (z + i);

            var t = z + g + 0.5;
            return Math.sqrt(2 * Math.PI) * Math.pow(t, (z + 0.5)) * Math.exp(-t) * x;
        }
    },
    //factorial
    bigfactorial: function (x) {
        var retval = new bigInt(1);
        for (var i = 2; i <= x; i++)
            retval = retval.times(i);
        return new Frac(retval);
    },
    //https://en.wikipedia.org/wiki/Logarithm#Calculation
    bigLog: function (x) {

        if (BIGLOG_CACHE[x]) {
            return Frac.quick.apply(null, BIGLOG_CACHE[x].split('/'));
        }
        x = new Frac(x);
        var n = 80;
        var retval = new Frac(0);
        var a = x.subtract(new Frac(1));
        var b = x.add(new Frac(1));
        for (var i = 0; i < n; i++) {
            var t = new Frac(2 * i + 1);
            var k = Math2.bigpow(a.divide(b), t);
            var r = t.clone().invert().multiply(k);
            retval = retval.add(r);

        }
        return retval.multiply(new Frac(2));
    },
    //the factorial function but using the big library instead
    factorial: function (x) {
        var is_int = x % 1 === 0;

        /*factorial for negative integers is complex infinity according to Wolfram Alpha*/
        if (is_int && x < 0)
            return NaN;

        if (!is_int)
            return Math2.gamma(x + 1);

        var retval = 1;
        for (var i = 2; i <= x; i++)
            retval = retval * i;
        return retval;
    },
    //double factorial
    //http://mathworld.wolfram.com/DoubleFactorial.html
    dfactorial: function (x) {
        if (isInt(x)) {
            var even = x % 2 === 0;
            /* If x = even then n = x/2 else n = (x-1)/2*/
            var n = even ? x / 2 : (x + 1) / 2;
            /*the return value*/
            var r = new Frac(1);
            /*start the loop*/
            if (even)
                for (let i = 1; i <= n; i++)
                    r = r.multiply(new Frac(2).multiply(new Frac(i)));
            else
                for (let i = 1; i <= n; i++)
                    r = r.multiply(new Frac(2).multiply(new Frac(i)).subtract(new Frac(1)));
        }
        else {
            /*Not yet extended to bigNum*/
            r = Math.pow(2, (1 + 2 * x - Math.cos(Math.PI * x)) / 4) * Math.pow(Math.PI, (Math.cos(Math.PI * x) - 1) / 4) * Math2.gamma(1 + x / 2);
        }

        /*done*/
        return r;
    },
    GCD: function () {
        var args = arrayUnique([].slice.call(arguments)
                .map(function (x) {
                    return Math.abs(x);
                })).sort(),
            a = Math.abs(args.shift()),
            n = args.length;

        while(n-- > 0) {
            var b = Math.abs(args.shift());
            while(true) {
                a %= b;
                if (a === 0) {
                    a = b;
                    break;
                }
                b %= a;
                if (b === 0)
                    break;
            }
        }
        return a;
    },
    QGCD: function () {
        var args = [].slice.call(arguments);
        var a = args[0];
        for (var i = 1; i < args.length; i++) {
            var b = args[i];
            var sign = a.isNegative() && b.isNegative() ? -1 : 1;
            a = b.gcd(a);
            if (sign < 0)
                a.negate();
        }
        return a;
    },
    LCM: function (a, b) {
        return (a * b) / Math2.GCD(a, b);
    },
    //pow but with the handling of negative numbers
    //http://stackoverflow.com/questions/12810765/calculating-cubic-root-for-negative-number
    pow: function (b, e) {
        if (b < 0) {
            if (Math.abs(e) < 1) {
                /*nth root of a negative number is imaginary when n is even*/
                if (1 / e % 2 === 0)
                    return NaN;
                return -Math.pow(Math.abs(b), e);
            }
        }
        return Math.pow(b, e);
    },
    factor: function (n) {
        n = Number(n);
        var sign = Math.sign(n); /*store the sign*/
        /*move the number to absolute value*/
        n = Math.abs(n);
        var ifactors = Math2.ifactor(n);
        var factors = new Symbol();
        factors.symbols = {};
        factors.group = Groups.CB;
        for (var x in ifactors) {
            var factor = new Symbol(1);
            factor.group = Groups.P; /*cheat a little*/
            factor.value = x;
            factor.power = new Symbol(ifactors[x]);
            factors.symbols[x] = factor;
        }
        factors.updateHash();

        if (n === 1) {
            factors = new Symbol(n);
        }

        /*put back the sign*/
        if (sign < 0)
            factors.negate();

        return factors;
    },
    /**
     * Uses trial division
     * @param {Integer} n - the number being factored
     * @param {object} factors -  the factors object
     * @returns {object}
     */
    sfactor: function (n, factors) {
        factors = factors || {};
        var r = Math.floor(Math.sqrt(n));
        var lcprime = PRIMES[PRIMES.length - 1];
        /*a one-time cost... Hopefully ... And don't bother for more than a million*/
        /*takes too long*/
        if (r > lcprime && n < 1e6)
            generatePrimes(r);
        var l = PRIMES.length;
        for (var i = 0; i < l; i++) {
            var prime = PRIMES[i];
            /*trial division*/
            while(n % prime === 0) {
                n = n / prime;
                factors[prime] = (factors[prime] || 0) + 1;
            }
        }
        if (n > 1)
            factors[n] = 1;
        return factors;
    },
    /**
     * Pollard's rho
     * @param {Integer | string | bigInt} n
     * @returns {object}
     */
    ifactor: function (n) {
        var input = new bigInt(n);

        n = String(n);

        if (n === '0')
            return {'0': 1};
        n = new bigInt(n); /*convert to bigInt for safety*/
        var sign = n.sign ? -1 : 1;
        n = n.abs();
        var factors = {}; /*factor object being returned.*/
        if (n.lt('65536')) { /*less than 2^16 just use trial division*/
            factors = Math2.sfactor(n, factors);
        }
        else {
            var add = function (e) {
                if (!e.isPrime()) {
                    factors = Math2.sfactor(e, factors);
                }
                else
                    factors[e] = (factors[e] || 0) + 1;
            };

            try {
                //set a safety
                var max = 1e3;
                var safety = 0;

                while(!n.abs().equals(1)) {
                    if (n.isPrime()) {
                        add(n);
                        break;
                    }
                    else {
                        function rho(c) {
                            var xf = new bigInt(c),
                                cz = 2,
                                x = new bigInt(c),
                                factor = new bigInt(1);

                            while(factor.equals(1)) {
                                for (var i = 0; i <= cz && factor.equals(1); i++) {
                                    //trigger the safety
                                    if (safety++ > max)
                                        throw new Error('stopping');

                                    x = x.pow(2).add(1).mod(n);
                                    factor = bigInt.gcd(x.minus(xf).abs(), n);
                                }

                                cz = cz * 2;
                                xf = x;
                            }
                            if (factor.equals(n)) {
                                return rho(c + 1);
                            }
                            return factor;
                        }
                        var factor = rho(2);
                        add(factor);
                        /*divide out the factor*/
                        n = n.divide(factor);
                    }
                }
            }
            catch(e) {
                //reset factors
                factors = {};
                add(input);
            }

        }

        /*put the sign back*/
        if (sign === -1) {
            var sm = arrayMin(Object.keys(factors)); /*/get the smallest number*/
            factors['-' + sm] = factors[sm];
            delete factors[sm];
        }

        return factors;
    },
    //factors a number into rectangular box. If sides are primes that this will be
    //their prime factors. e.g. 21 -> (7)(3), 133 -> (7)(19)
    boxfactor: function (n, max) {
        max = max || 200; //stop after this number of iterations
        var c, r,
            d = Math.floor((5 / 12) * n), //the divisor
            i = 0, //number of iterations
            safety = false;
        while(true) {
            c = Math.floor(n / d);
            r = n % d;
            if (r === 0)
                break; //we're done
            if (safety)
                return [n, 1];
            d = Math.max(r, d - r);
            i++;
            safety = i > max;
        }
        return [c, d, i];
    },
    fib: function (n) {
        var sign = Math.sign(n);
        n = Math.abs(n);
        sign = even(n) ? sign : Math.abs(sign);
        var a = 0, b = 1, f = 1;
        for (var i = 2; i <= n; i++) {
            f = a + b;
            a = b;
            b = f;
        }
        return f * sign;
    },
    mod: function (x, y) {
        return x % y;
    },
    //http://mathworld.wolfram.com/IntegerPart.html
    integer_part: function (x) {
        var sign = Math.sign(x);
        return sign * Math.floor(Math.abs(x));
    },
    simpson: function (f, a, b, step) {
        var get_value = function (f, x, side) {
            var v = f(x);
            var d = 0.000000000001;
            if (isNaN(v)) {
                v = f(side === 1 ? x + d : x - d);
            }
            return v;
        };

        step = step || 0.0001;
        //calculate the number of intervals
        var n = Math.abs(Math.floor((b - a) / step));
        //simpson's rule requires an even number of intervals. If it's not then add 1
        if (n % 2 !== 0)
            n++;
        //get the interval size
        var dx = (b - a) / n;
        //get x0
        var retval = get_value(f, a, 1);

        //get the middle part 4x1+2x2+4x3 ...
        //but first set a flag to see if it's even or odd.
        //The first one is odd so we start there
        var even = false;
        //get x1
        var xi = a + dx;
        //the coefficient
        var c, k;
        //https://en.wikipedia.org/wiki/Simpson%27s_rule
        for (var i = 1; i < n; i++) {
            c = even ? 2 : 4;
            k = c * get_value(f, xi, 1);
            retval += k;
            //flip the even flag
            even = !even;
            //increment xi
            xi += dx;
        }

        //add xn
        return (retval + get_value(f, xi, 2)) * (dx / 3);

    },
    /**
     * https://github.com/scijs/integrate-adaptive-simpson
     * @param {Function} f - the function being integrated
     * @param {Number} a - lower bound
     * @param {Number} b - upper bound
     * @param {Number} tol - step width
     * @param {Number} maxdepth
     * @returns {Number}
     */
    num_integrate: function (f, a, b, tol, maxdepth) {
        if (maxdepth < 0)
            throw new Error('max depth cannot be negative');

        /* This algorithm adapted from pseudocode in:*/
        /* http://www.math.utk.edu/~ccollins/refs/Handouts/rich.pdf*/
        function adsimp(f, a, b, fa, fm, fb, V0, tol, maxdepth, depth, state) {
            if (state.nanEncountered) {
                return NaN;
            }
            var h, f1, f2, sl, sr, s2, m, V1, V2, err;
            h = b - a;
            f1 = f(a + h * 0.25);
            f2 = f(b - h * 0.25);
            /* Simple check for NaN:*/
            if (isNaN(f1)) {
                state.nanEncountered = true;
                return;
            }
            /* Simple check for NaN:*/
            if (isNaN(f2)) {
                state.nanEncountered = true;
                return;
            }

            sl = h * (fa + 4 * f1 + fm) / 12;
            sr = h * (fm + 4 * f2 + fb) / 12;
            s2 = sl + sr;
            err = (s2 - V0) / 15;

            if (state.maxDepthCount > 1000 * maxdepth) {
                return;
            }


            if (depth > maxdepth) {
                state.maxDepthCount++;
                return s2 + err;
            }
            else if (Math.abs(err) < tol) {
                return s2 + err;
            }
            else {
                m = a + h * 0.5;
                V1 = adsimp(f, a, m, fa, f1, fm, sl, tol * 0.5, maxdepth, depth + 1, state);
                if (isNaN(V1)) {
                    state.nanEncountered = true;
                    return NaN;
                }
                V2 = adsimp(f, m, b, fm, f2, fb, sr, tol * 0.5, maxdepth, depth + 1, state);

                if (isNaN(V2)) {
                    state.nanEncountered = true;
                    return NaN;
                }

                return V1 + V2;
            }
        }

        function integrate(f, a, b, tol, maxdepth) {
            var state = {
                maxDepthCount: 0,
                nanEncountered: false
            };

            if (tol === undefined) {
                tol = 1e-9;
            }
            if (maxdepth === undefined) {
                /*Issue #458 - This was lowered because of performance issues. */
                /*This was suspected from before but is now confirmed with this issue*/
                maxdepth = 45;
            }

            var fa = f(a);
            var fm = f(0.5 * (a + b));
            var fb = f(b);

            var V0 = (fa + 4 * fm + fb) * (b - a) / 6;

            var result = adsimp(f, a, b, fa, fm, fb, V0, tol, maxdepth, 1, state);

            if (state.maxDepthCount > 0) {
                warn('integrate-adaptive-simpson: Warning: maximum recursion depth (' + maxdepth + ') reached ' + state.maxDepthCount + ' times');
            }

            if (state.nanEncountered) {
                throw new Error('Function does not converge over interval!');
            }

            return result;
        }
        var retval;

        try {
            retval = integrate(f, a, b, tol, maxdepth);
        }
        catch(e) {
            /*fallback to non-adaptive*/
            return Math2.simpson(f, a, b);
        }
        return nround(retval, 12);
    },
    //https://en.wikipedia.org/wiki/Trigonometric_integral
    //CosineIntegral
    Ci: function (x) {
        var n = 20,
            /*roughly Euler–Mascheroni*/
            g = 0.5772156649015329,
            sum = 0;
        for (var i = 1; i < n; i++) {
            /*cache 2n*/
            var n2 = 2 * i;
            sum += (Math.pow(-1, i) * Math.pow(x, n2)) / (n2 * Math2.factorial(n2));
        }
        return Math.log(x) + g + sum;
    },
    /*SineIntegral*/
    Si: function (x) {
        var n = 20,
            sum = 0;
        for (var i = 0; i < n; i++) {
            var n2 = 2 * i;
            sum += (Math.pow(-1, i) * Math.pow(x, n2 + 1)) / ((n2 + 1) * Math2.factorial(n2 + 1));
        }
        return sum;
    },
    /*ExponentialIntegral*/
    Ei: function (x) {
        if (Number(x) === 0)
            return -Infinity;
        var n = 30,
            g = 0.5772156649015328606, /*roughly Euler–Mascheroni*/
            sum = 0;
        for (var i = 1; i < n; i++) {
            sum += Math.pow(x, i) / (i * Math2.factorial(i));
        }
        return g + Math.abs(Math.log(x)) + sum;
    },
    /*Hyperbolic Sine Integral*/
    /*http://mathworld.wolfram.com/Shi.html*/
    Shi: function (x) {
        var n = 30,
            sum = 0,
            k, t;
        for (var i = 0; i < n; i++) {
            k = 2 * i;
            t = k + 1;
            sum += Math.pow(x, t) / (t * t * Math2.factorial(k));
        }
        return sum;
    },
    /*the cosine integral function*/
    Chi: function (x) {
        var dx, g, f;
        dx = 0.001;
        g = 0.5772156649015328606;
        f = function (t) {
            return (Math.cosh(t) - 1) / t;
        };
        return Math.log(x) + g + Math2.num_integrate(f, 0.002, x, dx);
    },
    /*the log integral*/
    Li: function (x) {
        return Math2.Ei(Math2.bigLog(x));
    },
    /*the gamma incomplete function*/
    gamma_incomplete: function (n, x = 0) {
        var t = n - 1,
            sum = 0;
        for (var i = 0; i < t; i++) {
            sum += Math.pow(x, i) / Math2.factorial(i);
        }
        return Math2.factorial(t) * Math.exp(-x) * sum;
    },
    /*
     * Heaviside step function - Moved from Special.js (originally contributed by Brosnan Yuen)
     * Specification : http://mathworld.wolfram.com/HeavisideStepFunction.html
     * if x > 0 then 1
     * if x == 0 then 1/2
     * if x < 0 then 0
     */
    step: function (x) {
        if (x > 0)
            return 1;
        if (x < 0)
            return 0;
        return 0.5;
    },
    /*
     * Rectangle function - Moved from Special.js (originally contributed by Brosnan Yuen)
     * Specification : http://mathworld.wolfram.com/RectangleFunction.html
     * if |x| > 1/2 then 0
     * if |x| == 1/2 then 1/2
     * if |x| < 1/2 then 1
     */
    rect: function (x) {
        x = Math.abs(x);

        if (x === 0.5)
            return x;
        if (x > 0.5)
            return 0;
        return 1;
    },
    /*
     * Sinc function - Moved from Special.js (originally contributed by Brosnan Yuen)
     * Specification : http://mathworld.wolfram.com/SincFunction.html
     * if x == 0 then 1
     * otherwise sin(x)/x
     */
    sinc: function (x) {
        if (x.equals(0))
            return 1;
        return Math.sin(x) / x;
    },
    /*
     * Triangle function - Moved from Special.js (originally contributed by Brosnan Yuen)
     * Specification : http://mathworld.wolfram.com/TriangleFunction.html
     * if |x| >= 1 then 0
     * if |x| < then 1-|x|
     */
    tri: function (x) {
        x = Math.abs(x);
        if (x >= 1)
            return 0;
        return 1 - x;
    },
    //https://en.wikipedia.org/wiki/Nth_root_algorithm
    nthroot: function (A, n) {
        /*make sure the input is of type Frac*/
        if (!(A instanceof Frac))
            A = new Frac(A.toString());
        if (!(n instanceof Frac))
            n = new Frac(n.toString());
        if (n.equals(1))
            return A;
        /*begin algorithm*/
        var xk = A.divide(new Frac(2)); /*x0*/
        var e = new Frac(1e-15);
        var dk, dk0, d0;
        var a = n.clone().invert(),
            b = n.subtract(new Frac(1));
        do {
            var powb = Math2.bigpow(xk, b);
            var dk_dec = a.multiply(A.divide(powb).subtract(xk)).toDecimal(25);
            dk = Frac.create(dk_dec);
            if (d0)
                break;

            xk = xk.add(dk);
            /*check to see if there's no change from the last xk*/
            dk_dec = dk.toDecimal();
            d0 = dk0 ? dk0 === dk_dec : false;
            dk0 = dk_dec;
        }
        while(dk.abs().gte(e))

        return xk;
    },
    /*https://gist.github.com/jiggzson/0c5b33cbcd7b52b36132b1e96573285f*/
    /*Just the square root function but big :)*/
    sqrt: function (n) {
        if (!(n instanceof Frac))
            n = new Frac(n);
        var xn, d, ld, same_delta;
        var c = 0; /*counter*/
        var done = false;
        var delta = new Frac(1e-20);
        xn = n.divide(new Frac(2));
        var safety = 1000;
        do {
            /*break if we're not converging*/
            if (c > safety)
                throw new Error('Unable to calculate square root for ' + n);
            xn = xn.add(n.divide(xn)).divide(new Frac(2));
            xn = new Frac(xn.decimal(30));
            /*get the difference from the true square*/
            d = n.subtract(xn.multiply(xn));
            /*if the square of the calculated number is close enough to the number*/
            /*we're getting the square root or the last delta was the same as the new delta*/
            /*then we're done*/
            same_delta = ld ? ld.equals(d) : false;
            if (d.clone().abs().lessThan(delta) || same_delta)
                done = true;
            /*store the calculated delta*/
            ld = d;
            c++; /*increase the counter*/
        }
        while(!done)

        return xn;
    }
};

/**
 * Convert number from scientific format to decimal format
 * @param {Number} num
 */
const scientificToDecimal = function(value) {
    let nsign = Math.sign(value);
    //remove the sign
    let num = Math.abs(value);
    //if the number is in scientific notation remove it
    if (/\d+\.?\d*e[+\-]*\d+/i.test(num.toString())) {
        var zero = '0',
            parts = String(num).toLowerCase().split('e'), //split into coeff and exponent
            e = parts.pop(), //store the exponential part
            l = Math.abs(e), //get the number of zeros
            sign = e / l,
            coeff_array = parts[0].split('.');
        if (sign === -1) {
            l = l - coeff_array[0].length;
            if (l < 0) {
                num = coeff_array[0].slice(0, l) + '.' + coeff_array[0].slice(l) + (coeff_array.length === 2 ? coeff_array[1] : '');
            }
            else {
                num = zero + '.' + new Array(l + 1).join(zero) + coeff_array.join('');
            }
        }
        else {
            var dec = coeff_array[1];
            if (dec)
                l = l - dec.length;
            if (l < 0) {
                num = coeff_array[0] + dec.slice(0, l) + '.' + dec.slice(l);
            }
            else {
                num = coeff_array.join('') + new Array(l + 1).join(zero);
            }
        }
    }

    return nsign < 0 ? '-' + num : num;
};

Math2.scientificToDecimal = scientificToDecimal;

//Polyfills ====================================================================
//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/
Math.sign = Math.sign || function (x) {
    x = +x; // convert to a number
    if (x === 0 || isNaN(x)) {
        return x;
    }
    return x > 0 ? 1 : -1;
};

Math.cosh = Math.cosh || function (x) {
    var y = Math.exp(x);
    return (y + 1 / y) / 2;
};

Math.sech = Math.sech || function (x) {
    return 1 / Math.cosh(x);
};

Math.csch = Math.csch || function (x) {
    return 1 / Math.sinh(x);
};

Math.coth = Math.coth || function (x) {
    return 1 / Math.tanh(x);
};

Math.sinh = Math.sinh || function (x) {
    var y = Math.exp(x);
    return (y - 1 / y) / 2;
};

Math.tanh = Math.tanh || function (x) {
    if (x === Infinity) {
        return 1;
    }
    else if (x === -Infinity) {
        return -1;
    }
    else {
        var y = Math.exp(2 * x);
        return (y - 1) / (y + 1);
    }
};

Math.asinh = Math.asinh || function (x) {
    if (x === -Infinity) {
        return x;
    }
    else {
        return Math.log(x + Math.sqrt(x * x + 1));
    }
};

Math.acosh = Math.acosh || function (x) {
    return Math.log(x + Math.sqrt(x * x - 1));
};

Math.atanh = Math.atanh || function (x) {
    return Math.log((1 + x) / (1 - x)) / 2;
};

Math.log10 = Math.log10 || function (x) {
    return Math.log(x) * Math.LOG10E;
};

Math.trunc = Math.trunc || function (x) {
    if (isNaN(x)) {
        return NaN;
    }
    if (x > 0) {
        return Math.floor(x);
    }
    return Math.ceil(x);
};
