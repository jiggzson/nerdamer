/*
 * Author : Martin Donk
 * Website : http://www.nerdamer.com
 * Email : martin.r.donk@gmail.com
 * License : MIT
 * Source : https://github.com/jiggzson/nerdamer
 */

/* global module, Function */

if((typeof module) !== 'undefined') {
    var nerdamer = require('./nerdamer.core.js');
    require('./Calculus.js');
}

(function () {
    "use strict";

    /*shortcuts*/
    var core = nerdamer.getCore(),
            _ = core.PARSER,
            N = core.groups.N,
            P = core.groups.P,
            S = core.groups.S,
            EX = core.groups.EX,
            FN = core.groups.FN,
            PL = core.groups.PL,
            CP = core.groups.CP,
            CB = core.groups.CB,
            keys = core.Utils.keys,
            even = core.Utils.even,
            variables = core.Utils.variables,
            format = core.Utils.format,
            round = core.Utils.round,
            Frac = core.Frac,
            isInt = core.Utils.isInt,
            Symbol = core.Symbol,
            CONST_HASH = core.Settings.CONST_HASH,
            math = core.Utils.importFunctions(),
            evaluate = core.Utils.evaluate;
    //*************** CLASSES ***************//
    /**
     * Converts a symbol into an equivalent polynomial arrays of 
     * the form [[coefficient_1, power_1],[coefficient_2, power_2], ... ]
     * Univariate polymials only. 
     * @param {Symbol|Number} symbol
     * @param {String} variable The variable name of the polynomial
     * @param {int} order
     */
    function Polynomial(symbol, variable, order) {
        if(core.Utils.isSymbol(symbol)) {
            this.parse(symbol);
            this.variable = this.variable || variable;
        }
        else if(!isNaN(symbol)) {
            order = order || 0;
            if(variable === undefined)
                throw new core.exceptions.InvalidVariableNameError('Polynomial expects a variable name when creating using order');
            this.coeffs = [];
            this.coeffs[order] = symbol;
            this.fill(symbol);
        }
        else if(typeof symbol === 'string') {
            this.parse(_.parse(symbol));
        }
    }
    /**
     * Creates a Polynomial given an array of coefficients
     * @param {int[]} arr
     * @param {String} variable
     * @returns {Polynomial}
     */
    Polynomial.fromArray = function (arr, variable) {
        if(typeof variable === 'undefined')
            throw new core.exceptions.InvalidVariableNameError('A variable name must be specified when creating polynomial from array');
        var p = new Polynomial();
        p.coeffs = arr;
        p.variable = variable;
        return p;
    };

    Polynomial.fit = function (c1, c2, n, base, p, variable) {
        //after having looped through and mod 10 the number to get the matching factor
        var terms = new Array(p + 1),
                t = n - c2;
        terms[0] = c2; //the constants is assumed to be correct
        //constant for x^p is also assumed know so add
        terms[p] = c1;
        t -= c1 * Math.pow(base, p);
        //start fitting
        for(var i = p - 1; i > 0; i--) {
            var b = Math.pow(base, i), //we want as many wholes as possible
                    q = t / b,
                    sign = Math.sign(q);
            var c = sign * Math.floor(Math.abs(q));
            t -= c * b;
            terms[i] = c;
        }
        if(t !== 0)
            return null;
        for(var i = 0; i < terms.length; i++)
            terms[i] = new Frac(terms[i]);

        return Polynomial.fromArray(terms, variable);
    };

    Polynomial.prototype = {
        /**
         * Converts Symbol to Polynomial
         * @param {Symbol} symbol
         * @param {Array} c - a collector array
         * @returns {Polynomial}
         */
        parse: function (symbol, c) {
            this.variable = variables(symbol)[0];
            if(!symbol.isPoly())
                throw core.exceptions.NerdamerTypeError('Polynomial Expected! Received ' + core.Utils.text(symbol));
            c = c || [];
            if(!symbol.power.absEquals(1))
                symbol = _.expand(symbol);

            if(symbol.group === core.groups.N) {
                c[0] = symbol.multiplier;
            }
            else if(symbol.group === core.groups.S) {
                c[symbol.power.toDecimal()] = symbol.multiplier;
            }
            else {
                for(var x in symbol.symbols) {
                    var sub = symbol.symbols[x],
                            p = sub.power;
                    if(core.Utils.isSymbol(p))
                        throw new core.exceptions.NerdamerTypeError('power cannot be a Symbol');

                    p = sub.group === N ? 0 : p.toDecimal();
                    if(sub.symbols) {
                        this.parse(sub, c);
                    }
                    else {
                        c[p] = sub.multiplier;
                    }
                }
            }

            this.coeffs = c;

            this.fill();
        },
        /**
         * Fills in the holes in a polynomial with zeroes
         * @param {Number} x - The number to fill the holes with
         */
        fill: function (x) {
            x = Number(x) || 0;
            var l = this.coeffs.length;
            for(var i = 0; i < l; i++) {
                if(this.coeffs[i] === undefined) {
                    this.coeffs[i] = new Frac(x);
                }
            }
            return this;
        },
        /**
         * Removes higher order zeros or a specific coefficient
         * @returns {Array}
         */
        trim: function () {
            var l = this.coeffs.length;
            while(l--) {
                var c = this.coeffs[l];
                var equalsZero = c.equals(0);
                if(c && equalsZero) {
                    if(l === 0)
                        break;
                    this.coeffs.pop();
                }
                else
                    break;
            }

            return this;
        },
        /*
         * Returns polynomial mod p **currently fails**
         * @param {Number} p
         * @returns {Polynomial}
         */
        modP: function (p) {
            var l = this.coeffs.length;
            for(var i = 0; i < l; i++) {
                var c = this.coeffs[i];
                if(c < 0) { //go borrow
                    var b; //a coefficient > 0
                    for(var j = i; j < l; j++) {//starting from where we left off
                        if(this.coeffs[j] > 0) {
                            b = this.coeffs[j];
                            break;
                        }
                    }

                    if(b) { //if such a coefficient exists
                        for(j; j > i; j--) { //go down the line and adjust using p
                            this.coeffs[j] = this.coeffs[j].subtract(new Frac(1));
                            this.coeffs[j - 1] = this.coeffs[j - 1].add(new Frac(p));
                        }
                        c = this.coeffs[i]; //reset c
                    }
                }

                var d = c.mod(p);
                var w = c.subtract(d).divide(p);
                if(!w.equals(0)) {
                    var up_one = i + 1;
                    var next = this.coeffs[up_one] || new Frac(0);
                    next = next.add(w);
                    this.coeffs[up_one] = new Frac(next);
                    this.coeffs[i] = new Frac(d);
                }
            }

            return this;
        },
        /**
         * Adds together 2 polynomials
         * @param {Polynomial} poly
         */
        add: function (poly) {
            var l = Math.max(this.coeffs.length, poly.coeffs.length);
            for(var i = 0; i < l; i++) {
                var a = (this.coeffs[i] || new Frac(0)),
                        b = (poly.coeffs[i] || new Frac(0));
                this.coeffs[i] = a.add(b);
            }
            return this;
        },
        /**
         * Adds together 2 polynomials
         * @param {Polynomial} poly
         */
        subtract: function (poly) {
            var l = Math.max(this.coeffs.length, poly.coeffs.length);
            for(var i = 0; i < l; i++) {
                var a = (this.coeffs[i] || new Frac(0)),
                        b = (poly.coeffs[i] || new Frac(0));
                this.coeffs[i] = a.subtract(b);
            }
            return this;
        },
        divide: function (poly) {
            var variable = this.variable,
                    dividend = core.Utils.arrayClone(this.coeffs),
                    divisor = core.Utils.arrayClone(poly.coeffs),
                    n = dividend.length,
                    mp = divisor.length - 1,
                    quotient = [];

            //loop through the dividend
            for(var i = 0; i < n; i++) {
                var p = n - (i + 1);
                //get the difference of the powers
                var d = p - mp;
                //get the quotient of the coefficients
                var q = dividend[p].divide(divisor[mp]);

                if(d < 0)
                    break;//the divisor is not greater than the dividend
                //place it in the quotient
                quotient[d] = q;

                for(var j = 0; j <= mp; j++) {
                    //reduce the dividend
                    dividend[j + d] = dividend[j + d].subtract((divisor[j].multiply(q)));
                }
            }

            //clean up
            var p1 = Polynomial.fromArray(dividend, variable || 'x').trim(), //pass in x for safety
                    p2 = Polynomial.fromArray(quotient, variable || 'x');
            return [p2, p1];
        },
        multiply: function (poly) {
            var l1 = this.coeffs.length, l2 = poly.coeffs.length,
                    c = []; //array to be returned
            for(var i = 0; i < l1; i++) {
                var x1 = this.coeffs[i];
                for(var j = 0; j < l2; j++) {
                    var k = i + j, //add the powers together
                            x2 = poly.coeffs[j],
                            e = c[k] || new Frac(0); //get the existing term from the new array
                    c[k] = e.add(x1.multiply(x2)); //multiply the coefficients and add to new polynomial array
                }
            }
            this.coeffs = c;
            return this;
        },
        /**
         * Checks if a polynomial is zero
         * @returns {Boolean}
         */
        isZero: function () {
            var l = this.coeffs.length;
            for(var i = 0; i < l; i++) {
                var e = this.coeffs[i];
                if(!e.equals(0))
                    return false;
            }
            return true;
        },
        /** 
         * Substitutes in a number n into the polynomial p(n)
         * @param {Number} n
         * @returns {Frac}
         */
        sub: function (n) {
            var sum = new Frac(0), l = this.coeffs.length;
            for(var i = 0; i < l; i++) {
                var t = this.coeffs[i];
                if(!t.equals(0))
                    sum = sum.add(t.multiply(new Frac(Math.pow(n, i))));
            }
            return sum;
        },
        /**
         * Returns a clone of the polynomial
         * @returns {Polynomial}
         */
        clone: function () {
            var p = new Polynomial();
            p.coeffs = this.coeffs;
            p.variable = this.variable;
            return p;
        },
        /**
         * Gets the degree of the polynomial
         * @returns {Number}
         */
        deg: function () {
            this.trim();
            return this.coeffs.length - 1;
        },
        /**
         * Returns a lead coefficient
         * @returns {Frac}
         */
        lc: function () {
            return this.coeffs[this.deg()].clone();
        },
        /**
         * Converts polynomial into a monic polynomial
         * @returns {Polynomial}
         */
        monic: function () {
            var lc = this.lc(), l = this.coeffs.length;
            for(var i = 0; i < l; i++)
                this.coeffs[i] = this.coeffs[i].divide(lc);
            return this;
        },
        /**
         * Returns the GCD of two polynomials
         * @param {Polynomial} poly
         * @returns {Polynomial}
         */
        gcd: function (poly) {
            //get the maximum power of each
            var mp1 = this.coeffs.length - 1,
                    mp2 = poly.coeffs.length - 1,
                    T;
            //swap so we always have the greater power first
            if(mp1 < mp2) {
                return poly.gcd(this);
            }
            var a = this;

            while(!poly.isZero()) {
                var t = poly.clone();
                a = a.clone();
                T = a.divide(t);
                poly = T[1];
                a = t;
            }

            var gcd = core.Math2.QGCD.apply(null, a.coeffs);
            if(!gcd.equals(1)) {
                var l = a.coeffs.length;
                for(var i = 0; i < l; i++) {
                    a.coeffs[i] = a.coeffs[i].divide(gcd);
                }
            }
            return a;
        },
        /**
         * Differentiates the polynomial
         * @returns {Polynomial}
         */
        diff: function () {
            var new_array = [], l = this.coeffs.length;
            for(var i = 1; i < l; i++)
                new_array.push(this.coeffs[i].multiply(new Frac(i)));
            this.coeffs = new_array;
            return this;
        },
        /**
         * Integrates the polynomial
         * @returns {Polynomial} 
         */
        integrate: function () {
            var new_array = [0], l = this.coeffs.length;
            for(var i = 0; i < l; i++) {
                var c = new Frac(i + 1);
                new_array[c] = this.coeffs[i].divide(c);
            }
            this.coeffs = new_array;
            return this;
        },
        /**
         * Returns the Greatest common factor of the polynomial
         * @param {bool} toPolynomial - true if a polynomial is wanted
         * @returns {Frac|Polynomial}
         */
        gcf: function (toPolynomial) {
            //get the first nozero coefficient and returns its power
            var fnz = function (a) {
                for(var i = 0; i < a.length; i++)
                    if(!a[i].equals(0))
                        return i;
            },
                    ca = [];
            for(var i = 0; i < this.coeffs.length; i++) {
                var c = this.coeffs[i];
                if(!c.equals(0) && ca.indexOf(c) === -1)
                    ca.push(c);
            }
            var p = [core.Math2.QGCD.apply(undefined, ca), fnz(this.coeffs)].toDecimal();

            if(toPolynomial) {
                var parr = [];
                parr[p[1] - 1] = p[0];
                p = Polynomial.fromArray(parr, this.variable).fill();
            }

            return p;
        },
        /**
         * Raises a polynomial P to a power p -> P^p. e.g. (x+1)^2
         * @param {bool} incl_img - Include imaginary numbers 
         */
        quad: function (incl_img) {
            var roots = [];
            if(this.coeffs.length > 3)
                throw new Error('Cannot calculate quadratic order of ' + (this.coeffs.length - 1));
            if(this.coeffs.length === 0)
                throw new Error('Polynomial array has no terms');
            var a = this.coeffs[2] || 0, b = this.coeffs[1] || 0, c = this.coeffs[0];
            var dsc = b * b - 4 * a * c;
            if(dsc < 0 && !incl_img)
                return roots;
            else {
                roots[0] = (-b + Math.sqrt(dsc)) / (2 * a);
                roots[1] = (-b - Math.sqrt(dsc)) / (2 * a);
            }
            return roots;
        },
        /**
         * Makes polynomial square free
         * @returns {Array}
         */
        squareFree: function () {

            var a = this.clone(),
                    i = 1,
                    b = a.clone().diff(),
                    c = a.clone().gcd(b),
                    w = a.divide(c)[0];
            var output = Polynomial.fromArray([new Frac(1)], a.variable);
            while(!c.equalsNumber(1)) {
                var y = w.gcd(c);
                var z = w.divide(y)[0];
                //one of the factors may have shown up since it's square but smaller than the 
                //one where finding
                if(!z.equalsNumber(1) && i > 1) {
                    var t = z.clone();
                    for(var j = 1; j < i; j++)
                        t.multiply(z.clone());
                    z = t;
                }
                output = output.multiply(z);
                i++;
                w = y;
                c = c.divide(y)[0];
            }

            return [output, w, i];
        },
        /**
         * Converts polynomial to Symbol
         * @returns {Symbol}
         */
        toSymbol: function () {
            var l = this.coeffs.length,
                    variable = this.variable;
            if(l === 0)
                return new core.Symbol(0);
            var end = l - 1, str = '';

            for(var i = 0; i < l; i++) {
                //place the plus sign for all but the last one
                var plus = i === end ? '' : '+',
                        e = this.coeffs[i];
                if(!e.equals(0))
                    str += (e + '*' + variable + '^' + i + plus);
            }
            return _.parse(str);
        },
        /**
         * Checks if polynomial is equal to a number
         * @param {Number} x
         * @returns {Boolean}
         */
        equalsNumber: function (x) {
            this.trim();
            return this.coeffs.length === 1 && this.coeffs[0].toDecimal() === String(x);
        },
        toString: function () {
            return this.toSymbol().toString();
        }
    };

    /**
     * TODO
     * ===================================================================================
     * THIS METHOD HAS A NASTY HIDDEN BUG. IT HAS INCONSISTENT RETURN TYPES PRIMARILY DUE TO 
     * WRONG ASSUMPTIONS AT THE BEGINNING. THE ASSUMPTION WAS THAT COEFFS WERE ALWAYS GOING BE NUMBERS
     * NOT TAKING INTO ACCOUNT THAT IMAGINARY NUMBERS. FIXING THIS BREAKS WAY TOO MANY TESTS 
     * AT THEM MOMENT WHICH I DON'T HAVE TO FIX
     * ===================================================================================
     * If the symbols is of group PL or CP it will return the multipliers of each symbol
     * as these are polynomial coefficients. CB symbols are glued together by multiplication
     * so the symbol multiplier carries the coefficients for all contained symbols.
     * For S it just returns it's own multiplier. This function doesn't care if it's a polynomial or not
     * @param {Array} c The coefficient array
     * @param {boolean} with_order 
     * @return {Array}
     */
    Symbol.prototype.coeffs = function (c, with_order) {
        if(with_order && !this.isPoly(true))
            _.error('Polynomial expected when requesting coefficients with order');
        c = c || [];
        var s = this.clone().distributeMultiplier();
        if(s.isComposite()) {
            for(var x in s.symbols) {
                var sub = s.symbols[x];
                if(sub.isComposite()) {
                    sub.clone().distributeMultiplier().coeffs(c, with_order);
                }
                else {
                    if(with_order)
                        c[sub.isConstant() ? 0 : sub.power.toDecimal()] = sub.multiplier;
                    else {
                        c.push(sub.multiplier);
                    }
                }
            }
        }
        else {
            if(with_order)
                c[s.isConstant(true) ? 0 : s.power.toDecimal()] = s.multiplier;
            else {
                if(s.group === CB && s.isImaginary()) {
                    var m = new Symbol(s.multiplier);
                    s.each(function (x) {
                        //add the imaginary part
                        if(x.isConstant(true) || x.imaginary)
                            m = _.multiply(m, x);
                    });
                    c.push(m);
                }
                else
                    c.push(s.multiplier);
            }
        }
        //fill the holes
        if(with_order) {
            for(var i = 0; i < c.length; i++)
                if(c[i] === undefined)
                    c[i] = new Symbol(0);
        }
        return c;
    };
    Symbol.prototype.tBase = function (map) {
        if(typeof map === 'undefined')
            throw new Error('Symbol.tBase requires a map object!');
        var terms = [];
        var symbols = this.collectSymbols(null, null, null, true),
                l = symbols.length;
        for(var i = 0; i < l; i++) {
            var symbol = symbols[i],
                    g = symbol.group,
                    nterm = new MVTerm(symbol.multiplier, [], map);
            if(g === CB) {
                for(var x in symbol.symbols) {
                    var sym = symbol.symbols[x];
                    nterm.terms[map[x]] = sym.power;
                }
            }
            else {
                nterm.terms[map[symbol.value]] = symbol.power;
            }

            terms.push(nterm.fill());
            nterm.updateCount();
        }
        return terms;
    };
    Symbol.prototype.altVar = function (x) {
        var m = this.multiplier.toString(), p = this.power.toString();
        return (m === '1' ? '' : m + '*') + x + (p === '1' ? '' : '^' + p);
    };
    /**
     * Checks to see if the symbols contain the same variables
     * @param {Symbol} symbol
     * @returns {Boolean}
     */
    Symbol.prototype.sameVars = function (symbol) {
        if(!(this.symbols || this.group === symbol.group))
            return false;
        for(var x in this.symbols) {
            var a = this.symbols[x], b = symbol.symbols[x];
            if(!b)
                return false;
            if(a.value !== b.value)
                return false;
        }
        return true;
    };
    /**
     * Groups the terms in a symbol with respect to a variable
     * For instance the symbol {a*b^2*x^2+a*b*x^2+x+6} returns [6,1,a*b+a*b^2]
     * @returns {Factors}
     */
    Symbol.prototype.groupTerms = function (x) {
        x = String(x);
        var f, p, egrouped;
        var grouped = [];
        this.each(function (e) {
            if(e.group === PL) {
                egrouped = e.groupTerms(x);
                for(var i = 0; i < egrouped.length; i++) {
                    var el = egrouped[i];
                    if(el)
                        grouped[i] = el;
                }
            }
            else {
                f = core.Utils.decompose_fn(e, x, true);
                p = f.x.value === x ? Number(f.x.power) : 0;
                //check if there's an existing value
                grouped[p] = _.add(grouped[p] || new Symbol(0), f.a);
            }
        });
        return grouped;
    };
    /**
     * Use this to collect Factors
     * @returns {Symbol[]}
     */
    Symbol.prototype.collectFactors = function () {
        var factors = [];
        if(this.group === CB)
            this.each(function (x) {
                factors.push(x.clone());
            });
        else
            factors.push(this.clone());
        return factors;
    };
    /**
     * A container class for factors
     * @returns {Factors}
     */
    function Factors() {
        this.factors = {};
        this.length = 0;
    }
    ;
    Factors.prototype.getNumberSymbolics = function () {
        var n = 0;
        this.each(function (x) {
            if(!x.isConstant(true))
                n++;
        });
        return n;
    };
    /**
     * Adds the factors to the factor object
     * @param {Symbo} s
     * @returns {Factors}
     */
    Factors.prototype.add = function (s) {
        if(s.equals(0))
            return this; //nothing to add

        //we don't want to carry -1 as a factor. If a factor already exists,
        //then add the minus one to that factor and return.
        if(s.equals(-1) && this.length > 0) {
            var fo = core.Utils.firstObject(this.factors, null, true);
            this.add(_.symfunction(core.Settings.PARENTHESIS, [fo.obj]).negate());
            delete this.factors[fo.key];
            this.length--;
            return this;
        }

        if(s.group === CB) {
            var factors = this;
            if(!s.multiplier.equals(1))
                factors.add(new Symbol(s.multiplier));
            s.each(function (x) {
                factors.add(x);
            });
        }
        else {
            if(this.preAdd) //if a preAdd function was defined call it to do prep
                s = this.preAdd(s);
            if(this.pFactor) //if the symbol isn't linear add back the power
                s = _.pow(s, new Symbol(this.pFactor));

            var is_constant = s.isConstant();
            if(is_constant && s.equals(1))
                return this; //don't add 1
            var v = is_constant ? s.value : s.text();
            if(v in this.factors) {
                this.factors[v] = _.multiply(this.factors[v], s);
                //did the addition cancel out the existing factor? If so remove it and decrement the length
                if(this.factors[v].equals(1)) {
                    delete this.factors[v];
                    this.length--;
                }
            }
            else {
                this.factors[v] = s;
                this.length++;
            }
        }
        return this;
    };
    /**
     * Converts the factor object to a Symbol
     * @returns {Symbol}
     */
    Factors.prototype.toSymbol = function () {
        var factored = new Symbol(1);
        var factors = Object.values(this.factors).sort(function (a, b) {
            return a.group > b.group;
        });

        for(var i = 0, l = factors.length; i < l; i++) {
            var f = factors[i];

            //don't wrap group S or FN
            var factor = f.power.equals(1) && f.fname !== '' /* don't wrap it twice */ ?
                    _.symfunction(core.PARENTHESIS, [f]) : f;

            factored = _.multiply(factored, factor);
        }
        if(factored.fname === '')
            factored = Symbol.unwrapPARENS(factored);
        return factored;
    };
    /**
     * Merges 2 factor objects into one
     * @param {Factor} o
     * @returns {Factors}
     */
    Factors.prototype.merge = function (o) {
        for(var x in o) {
            if(x in this.factors)
                this.factors[x] = _.multiply(this.factors[x], o[x]);
            else
                this.factors[x] = o[x];
        }
        return this;
    };
    /**
     * The iterator for the factor object
     * @param {Function} f - callback
     * @returns {Factor}
     */
    Factors.prototype.each = function (f) {
        for(var x in this.factors) {
            var factor = this.factors[x];
            if(factor.fname === core.PARENTHESIS && factor.isLinear())
                factor = factor.args[0];
            f.call(this, factor, x);
        }
        return this;
    };
    /**
     * Return the number of factors contained in the factor object
     * @returns {int}
     */
    Factors.prototype.count = function () {
        return keys(this.factors).length;
    };
    /**
     * Cleans up factors from -1
     * @returns {undefined}
     */
    Factors.prototype.clean = function () {
        try {
            var h = core.Settings.CONST_HASH;
            if(this.factors[h].lessThan(0)) {
                if(this.factors[h].equals(-1))
                    delete this.factors[h];
                else
                    this.factors[h].negate();
                this.each(function (x) {
                    x.negate();
                });
            }
        }
        catch(e) {
        }
        ;
    };
    Factors.prototype.toString = function () {
        return this.toSymbol().toString();
    };

    //a wrapper for performing multivariate division
    function MVTerm(coeff, terms, map) {
        this.terms = terms || [];
        this.coeff = coeff;
        this.map = map; //careful! all maps are the same object
        this.sum = new core.Frac(0);
        this.image = undefined;
    }
    ;
    MVTerm.prototype.updateCount = function () {
        this.count = this.count || 0;
        for(var i = 0; i < this.terms.length; i++) {
            if(!this.terms[i].equals(0))
                this.count++;
        }
        return this;
    };
    MVTerm.prototype.getVars = function () {
        var vars = [];
        for(var i = 0; i < this.terms.length; i++) {
            var term = this.terms[i],
                    rev_map = this.getRevMap();
            if(!term.equals(0))
                vars.push(this.rev_map[i]);
        }
        return vars.join(' ');
    };
    MVTerm.prototype.len = function () {
        if(typeof this.count === 'undefined') {
            this.updateCount();
        }
        return this.count;
    };
    MVTerm.prototype.toSymbol = function (rev_map) {
        rev_map = rev_map || this.getRevMap();
        var symbol = new Symbol(this.coeff);
        for(var i = 0; i < this.terms.length; i++) {
            var v = rev_map[i],
                    t = this.terms[i];
            if(t.equals(0) || v === CONST_HASH)
                continue;
            var mapped = new Symbol(v);
            mapped.power = t;
            symbol = _.multiply(symbol, mapped);
        }
        return symbol;
    };
    MVTerm.prototype.getRevMap = function () {
        if(this.rev_map)
            return this.rev_map;
        var o = {};
        for(var x in this.map)
            o[this.map[x]] = x;
        this.rev_map = o;
        return o;
    };
    MVTerm.prototype.generateImage = function () {
        this.image = this.terms.join(' ');
        return this;
    },
            MVTerm.prototype.getImg = function () {
                if(!this.image)
                    this.generateImage();
                return this.image;
            },
            MVTerm.prototype.fill = function () {
                var l = this.map.length;
                for(var i = 0; i < l; i++) {
                    if(typeof this.terms[i] === 'undefined')
                        this.terms[i] = new core.Frac(0);
                    else {
                        this.sum = this.sum.add(this.terms[i]);
                    }
                }
                return this;
            };
    MVTerm.prototype.divide = function (mvterm) {
        var c = this.coeff.divide(mvterm.coeff),
                l = this.terms.length,
                new_mvterm = new MVTerm(c, [], this.map);
        for(var i = 0; i < l; i++) {
            new_mvterm.terms[i] = this.terms[i].subtract(mvterm.terms[i]);
            new_mvterm.sum = new_mvterm.sum.add(new_mvterm.terms[i]);
        }
        return new_mvterm;
    };
    MVTerm.prototype.multiply = function (mvterm) {
        var c = this.coeff.multiply(mvterm.coeff),
                l = this.terms.length,
                new_mvterm = new MVTerm(c, [], this.map);
        for(var i = 0; i < l; i++) {
            new_mvterm.terms[i] = this.terms[i].add(mvterm.terms[i]);
            new_mvterm.sum = new_mvterm.sum.add(new_mvterm.terms[i]);
        }
        return new_mvterm;
    };
    MVTerm.prototype.isZero = function () {
        return this.coeff.equals(0);
    };
    MVTerm.prototype.toString = function () {
        return '{ coeff: ' + this.coeff.toString() + ', terms: [' +
                this.terms.join(',') + ']: sum: ' + this.sum.toString() + ', count: ' + this.count + '}';
    };

    core.Utils.toMapObj = function (arr) {
        var c = 0, o = {};
        for(var i = 0; i < arr.length; i++) {
            var v = arr[i];
            if(typeof o[v] === 'undefined') {
                o[v] = c;
                c++;
            }
        }
        o.length = c;
        return o;
    };
    core.Utils.filledArray = function (v, n, clss) {
        var a = [];
        while(n--) {
            a[n] = clss ? new clss(v) : v;
        }
        return a;
    };
    core.Utils.arrSum = function (arr) {
        var sum = 0, l = arr.length;
        for(var i = 0; i < l; i++)
            sum += arr[i];
        return sum;
    };
    /**
     * Determines if 2 arrays have intersecting elements.
     * @param {Array} a
     * @param {Array} b
     * @returns {Boolean} True if a and b have intersecting elements.
     */
    core.Utils.haveIntersection = function (a, b) {
        var t;
        if(b.length > a.length)
            t = b, b = a, a = t; // indexOf to loop over shorter
        return a.some(function (e) {
            return b.indexOf(e) > -1;
        });
    };
    /**
     * Substitutes out functions as variables so they can be used in regular algorithms
     * @param {Symbol} symbol
     * @param {Object} map
     * @returns {String} The expression string
     */
    core.Utils.subFunctions = function (symbol, map) {
        map = map || {};
        var subbed = [];
        symbol.each(function (x) {
            if(x.group === FN || x.previousGroup === FN) {
                //we need a new variable name so why not use one of the existing
                var val = core.Utils.text(x, 'hash'), tvar = map[val];
                if(!tvar) {
                    //generate a unique enough name
                    var t = x.fname + keys(map).length;
                    map[val] = t;
                    subbed.push(x.altVar(t));
                }
                else
                    subbed.push(x.altVar(tvar));
            }
            else if(x.group === CB || x.group === PL || x.group === CP) {
                subbed.push(core.Utils.subFunctions(x, map));
            }
            else
                subbed.push(x.text());
        });
        if(symbol.group === CP || symbol.group === PL)
            return symbol.altVar(core.Utils.inBrackets(subbed.join('+')));
        ;
        if(symbol.group === CB)
            return symbol.altVar(core.Utils.inBrackets(subbed.join('*')));
        return symbol.text();
    };
    core.Utils.getFunctionsSubs = function (map) {
        var subs = {};
        //prepare substitutions
        for(var x in map)
            subs[map[x]] = _.parse(x);
        return subs;
    };

    var __ = core.Algebra = {
        version: '1.4.6',
        proots: function (symbol, decp) {
            //the roots will be rounded up to 7 decimal places.
            //if this causes trouble you can explicitly pass in a different number of places
            //rarr for polynomial of power n is of format [n, coeff x^n, coeff x^(n-1), ..., coeff x^0]
            decp = decp || 7;
            var zeros = 0;
            var known_roots = [];
            var get_roots = function (rarr, powers, max) {
                var roots = calcroots(rarr, powers, max).concat(known_roots);
                for(var i = 0; i < zeros; i++)
                    roots.unshift(0);
                return roots;
            };

            if(symbol instanceof Symbol && symbol.isPoly()) {
                symbol.distributeMultiplier();
                //make it so the symbol has a constants as the lowest term
                if(symbol.group === PL) {
                    var lowest_pow = core.Utils.arrayMin(keys(symbol.symbols));
                    var lowest_symbol = symbol.symbols[lowest_pow].clone().toUnitMultiplier();
                    symbol = _.expand(_.divide(symbol, lowest_symbol));
                    known_roots.push(0); //add zero since this is a known root
                }
                if(symbol.group === core.groups.S) {
                    return [0];
                }
                else if(symbol.group === core.groups.PL) {
                    var powers = keys(symbol.symbols),
                            minpower = core.Utils.arrayMin(powers),
                            symbol = core.PARSER.divide(symbol, core.PARSER.parse(symbol.value + '^' + minpower));
                }

                var variable = keys(symbol.symbols).sort().pop(),
                        sym = symbol.group === core.groups.PL ? symbol.symbols : symbol.symbols[variable],
                        g = sym.group,
                        powers = g === S ? [sym.power.toDecimal()] : keys(sym.symbols),
                        rarr = [],
                        max = core.Utils.arrayMax(powers); //maximum power and degree of polynomial to be solved

                // Prepare the data
                for(var i = 1; i <= max; i++) {
                    var c = 0; //if there is no power then the hole must be filled with a zero
                    if(powers.indexOf(i + '') !== -1) {
                        if(g === S) {
                            c = sym.multiplier;
                        }
                        else {
                            c = sym.symbols[i].multiplier;
                        }
                    }
                    // Insert the coeffient but from the front
                    rarr.unshift(c);
                }

                rarr.push(symbol.symbols[CONST_HASH].multiplier);

                if(sym.group === S)
                    rarr[0] = sym.multiplier;//the symbol maybe of group CP with one variable

                return get_roots(rarr, powers, max);
            }
            else if(core.Utils.isArray(symbol)) {
                var parr = symbol;
                var rarr = [],
                        powers = [],
                        last_power = 0;
                for(var i = 0; i < parr.length; i++) {

                    var coeff = parr[i][0],
                            pow = parr[i][1],
                            d = pow - last_power - 1;
                    //insert the zeros
                    for(var j = 0; j < d; j++)
                        rarr.unshift(0);

                    rarr.unshift(coeff);
                    if(pow !== 0)
                        powers.push(pow);
                    last_power = pow;
                }
                var max = Math.max.apply(undefined, powers);

                return get_roots(rarr, powers, max);
            }
            else {
                throw new core.exceptions.NerdamerTypeError('Cannot calculate roots. Symbol must be a polynomial!');
            }

            function calcroots(rarr, powers, max) {
                var MAXDEGREE = 100; // Degree of largest polynomial accepted by this script.

                // Make a clone of the coefficients before appending the max power
                var p = rarr.slice(0);

                // Divide the string up into its individual entries, which--presumably--are separated by whitespace
                rarr.unshift(max);

                if(max > MAXDEGREE) {
                    throw new core.exceptions.ValueLimitExceededError("This utility accepts polynomials of degree up to " + MAXDEGREE + ". ");
                }

                var zeroi = [], // Vector of imaginary components of roots
                        degreePar = {};    // degreePar is a dummy variable for passing the parameter POLYDEGREE by reference
                degreePar.Degree = max;

                for(i = 0; i < max; i++) {
                    zeroi.push(0);
                }
                var zeror = zeroi.slice(0); // Vector of real components of roots

                // Find the roots
                //--> Begin Jenkins-Traub

                /*
                 * A verbatim copy of Mr. David Binner's Jenkins-Traub port
                 */
                function QuadSD_ak1(NN, u, v, p, q, iPar) {
                    // Divides p by the quadratic 1, u, v placing the quotient in q and the remainder in a, b
                    // iPar is a dummy variable for passing in the two parameters--a and b--by reference
                    q[0] = iPar.b = p[0];
                    q[1] = iPar.a = -(u * iPar.b) + p[1];

                    for(var i = 2; i < NN; i++) {
                        q[i] = -(u * iPar.a + v * iPar.b) + p[i];
                        iPar.b = iPar.a;
                        iPar.a = q[i];
                    }
                    return;
                }

                function calcSC_ak1(DBL_EPSILON, N, a, b, iPar, K, u, v, qk) {
                    // This routine calculates scalar quantities used to compute the next K polynomial and
                    // new estimates of the quadratic coefficients.
                    // calcSC -	integer variable set here indicating how the calculations are normalized
                    // to avoid overflow.
                    // iPar is a dummy variable for passing in the nine parameters--a1, a3, a7, c, d, e, f, g, and h --by reference

                    // sdPar is a dummy variable for passing the two parameters--c and d--into QuadSD_ak1 by reference
                    var sdPar = new Object(),
                            // TYPE = 3 indicates the quadratic is almost a factor of K
                            dumFlag = 3;

                    // Synthetic division of K by the quadratic 1, u, v
                    sdPar.b = sdPar.a = 0.0;
                    QuadSD_ak1(N, u, v, K, qk, sdPar);
                    iPar.c = sdPar.a;
                    iPar.d = sdPar.b;

                    if(Math.abs(iPar.c) <= (100.0 * DBL_EPSILON * Math.abs(K[N - 1]))) {
                        if(Math.abs(iPar.d) <= (100.0 * DBL_EPSILON * Math.abs(K[N - 2])))
                            return dumFlag;
                    }

                    iPar.h = v * b;
                    if(Math.abs(iPar.d) >= Math.abs(iPar.c)) {
                        // TYPE = 2 indicates that all formulas are divided by d
                        dumFlag = 2;
                        iPar.e = a / (iPar.d);
                        iPar.f = (iPar.c) / (iPar.d);
                        iPar.g = u * b;
                        iPar.a3 = (iPar.e) * ((iPar.g) + a) + (iPar.h) * (b / (iPar.d));
                        iPar.a1 = -a + (iPar.f) * b;
                        iPar.a7 = (iPar.h) + ((iPar.f) + u) * a;
                    }
                    else {
                        // TYPE = 1 indicates that all formulas are divided by c;
                        dumFlag = 1;
                        iPar.e = a / (iPar.c);
                        iPar.f = (iPar.d) / (iPar.c);
                        iPar.g = (iPar.e) * u;
                        iPar.a3 = (iPar.e) * a + ((iPar.g) + (iPar.h) / (iPar.c)) * b;
                        iPar.a1 = -(a * ((iPar.d) / (iPar.c))) + b;
                        iPar.a7 = (iPar.g) * (iPar.d) + (iPar.h) * (iPar.f) + a;
                    }
                    return dumFlag;
                }

                function nextK_ak1(DBL_EPSILON, N, tFlag, a, b, iPar, K, qk, qp) {
                    // Computes the next K polynomials using the scalars computed in calcSC_ak1
                    // iPar is a dummy variable for passing in three parameters--a1, a3, and a7
                    var temp;
                    if(tFlag == 3) {	// Use unscaled form of the recurrence
                        K[1] = K[0] = 0.0;
                        for(var i = 2; i < N; i++) {
                            K[i] = qk[i - 2];
                        }
                        return;
                    }

                    temp = ((tFlag == 1) ? b : a);
                    if(Math.abs(iPar.a1) > (10.0 * DBL_EPSILON * Math.abs(temp))) {
                        // Use scaled form of the recurrence
                        iPar.a7 /= iPar.a1;
                        iPar.a3 /= iPar.a1;
                        K[0] = qp[0];
                        K[1] = -(qp[0] * iPar.a7) + qp[1];
                        for(var i = 2; i < N; i++)
                            K[i] = -(qp[i - 1] * iPar.a7) + qk[i - 2] * iPar.a3 + qp[i];
                    }
                    else {
                        // If a1 is nearly zero, then use a special form of the recurrence
                        K[0] = 0.0;
                        K[1] = -(qp[0] * iPar.a7);
                        for(var i = 2; i < N; i++) {
                            K[i] = -(qp[i - 1] * iPar.a7) + qk[i - 2] * iPar.a3;
                        }
                    }
                    return;
                }

                function newest_ak1(tFlag, iPar, a, a1, a3, a7, b, c, d, f, g, h, u, v, K, N, p) {
                    // Compute new estimates of the quadratic coefficients using the scalars computed in calcSC_ak1
                    // iPar is a dummy variable for passing in the two parameters--uu and vv--by reference
                    // iPar.a = uu, iPar.b = vv

                    var a4, a5, b1, b2, c1, c2, c3, c4, temp;
                    iPar.b = iPar.a = 0.0;// The quadratic is zeroed

                    if(tFlag != 3) {
                        if(tFlag != 2) {
                            a4 = a + u * b + h * f;
                            a5 = c + (u + v * f) * d;
                        }
                        else {
                            a4 = (a + g) * f + h;
                            a5 = (f + u) * c + v * d;
                        }

                        // Evaluate new quadratic coefficients
                        b1 = -(K[N - 1] / p[N]);
                        b2 = -(K[N - 2] + b1 * p[N - 1]) / p[N];
                        c1 = v * b2 * a1;
                        c2 = b1 * a7;
                        c3 = b1 * b1 * a3;
                        c4 = -(c2 + c3) + c1;
                        temp = -c4 + a5 + b1 * a4;
                        if(temp != 0.0) {
                            iPar.a = -((u * (c3 + c2) + v * (b1 * a1 + b2 * a7)) / temp) + u;
                            iPar.b = v * (1.0 + c4 / temp);
                        }
                    }
                    return;
                }

                function Quad_ak1(a, b1, c, iPar) {
                    // Calculates the zeros of the quadratic a*Z^2 + b1*Z + c
                    // The quadratic formula, modified to avoid overflow, is used to find the larger zero if the
                    // zeros are real and both zeros are complex. The smaller real zero is found directly from
                    // the product of the zeros c/a.

                    // iPar is a dummy variable for passing in the four parameters--sr, si, lr, and li--by reference

                    var b, d, e;
                    iPar.sr = iPar.si = iPar.lr = iPar.li = 0.0;

                    if(a == 0) {
                        iPar.sr = ((b1 != 0) ? -(c / b1) : iPar.sr);
                        return;
                    }
                    if(c == 0) {
                        iPar.lr = -(b1 / a);
                        return;
                    }

                    // Compute discriminant avoiding overflow
                    b = b1 / 2.0;
                    if(Math.abs(b) < Math.abs(c)) {
                        e = ((c >= 0) ? a : -a);
                        e = -e + b * (b / Math.abs(c));
                        d = Math.sqrt(Math.abs(e)) * Math.sqrt(Math.abs(c));
                    }
                    else {
                        e = -((a / b) * (c / b)) + 1.0;
                        d = Math.sqrt(Math.abs(e)) * (Math.abs(b));
                    }

                    if(e >= 0) {
                        // Real zeros
                        d = ((b >= 0) ? -d : d);
                        iPar.lr = (-b + d) / a;
                        iPar.sr = ((iPar.lr != 0) ? (c / (iPar.lr)) / a : iPar.sr);
                    }
                    else {
                        // Complex conjugate zeros
                        iPar.lr = iPar.sr = -(b / a);
                        iPar.si = Math.abs(d / a);
                        iPar.li = -(iPar.si);
                    }
                    return;
                }

                function QuadIT_ak1(DBL_EPSILON, N, iPar, uu, vv, qp, NN, sdPar, p, qk, calcPar, K) {
                    // Variable-shift K-polynomial iteration for a quadratic factor converges only if the
                    // zeros are equimodular or nearly so.
                    // iPar is a dummy variable for passing in the five parameters--NZ, lzi, lzr, szi, and szr--by reference
                    // sdPar is a dummy variable for passing the two parameters--a and b--in by reference
                    // calcPar is a dummy variable for passing the nine parameters--a1, a3, a7, c, d, e, f, g, and h --in by reference

                    // qPar is a dummy variable for passing the four parameters--szr, szi, lzr, and lzi--into Quad_ak1 by reference
                    var qPar = new Object(),
                            ee, mp, omp, relstp, t, u, ui, v, vi, zm,
                            i, j = 0, tFlag, triedFlag = 0;   // Integer variables

                    iPar.NZ = 0;// Number of zeros found
                    u = uu; // uu and vv are coefficients of the starting quadratic
                    v = vv;

                    do {
                        qPar.li = qPar.lr = qPar.si = qPar.sr = 0.0;
                        Quad_ak1(1.0, u, v, qPar);
                        iPar.szr = qPar.sr;
                        iPar.szi = qPar.si;
                        iPar.lzr = qPar.lr;
                        iPar.lzi = qPar.li;

                        // Return if roots of the quadratic are real and not close to multiple or nearly
                        // equal and of opposite sign.
                        if(Math.abs(Math.abs(iPar.szr) - Math.abs(iPar.lzr)) > 0.01 * Math.abs(iPar.lzr))
                            break;

                        // Evaluate polynomial by quadratic synthetic division

                        QuadSD_ak1(NN, u, v, p, qp, sdPar);

                        mp = Math.abs(-((iPar.szr) * (sdPar.b)) + (sdPar.a)) + Math.abs((iPar.szi) * (sdPar.b));

                        // Compute a rigorous bound on the rounding error in evaluating p

                        zm = Math.sqrt(Math.abs(v));
                        ee = 2.0 * Math.abs(qp[0]);
                        t = -((iPar.szr) * (sdPar.b));

                        for(i = 1; i < N; i++) {
                            ee = ee * zm + Math.abs(qp[i]);
                        }

                        ee = ee * zm + Math.abs(t + sdPar.a);
                        ee = (9.0 * ee + 2.0 * Math.abs(t) - 7.0 * (Math.abs((sdPar.a) + t) + zm * Math.abs((sdPar.b)))) * DBL_EPSILON;

                        // Iteration has converged sufficiently if the polynomial value is less than 20 times this bound
                        if(mp <= 20.0 * ee) {
                            iPar.NZ = 2;
                            break;
                        }

                        j++;
                        // Stop iteration after 20 steps
                        if(j > 20)
                            break;
                        if(j >= 2) {
                            if((relstp <= 0.01) && (mp >= omp) && (!triedFlag)) {
                                // A cluster appears to be stalling the convergence. Five fixed shift
                                // steps are taken with a u, v close to the cluster.
                                relstp = ((relstp < DBL_EPSILON) ? Math.sqrt(DBL_EPSILON) : Math.sqrt(relstp));
                                u -= u * relstp;
                                v += v * relstp;

                                QuadSD_ak1(NN, u, v, p, qp, sdPar);
                                for(i = 0; i < 5; i++) {
                                    tFlag = calcSC_ak1(DBL_EPSILON, N, sdPar.a, sdPar.b, calcPar, K, u, v, qk);
                                    nextK_ak1(DBL_EPSILON, N, tFlag, sdPar.a, sdPar.b, calcPar, K, qk, qp);
                                }

                                triedFlag = 1;
                                j = 0;

                            }
                        }
                        omp = mp;

                        // Calculate next K polynomial and new u and v
                        tFlag = calcSC_ak1(DBL_EPSILON, N, sdPar.a, sdPar.b, calcPar, K, u, v, qk);
                        nextK_ak1(DBL_EPSILON, N, tFlag, sdPar.a, sdPar.b, calcPar, K, qk, qp);
                        tFlag = calcSC_ak1(DBL_EPSILON, N, sdPar.a, sdPar.b, calcPar, K, u, v, qk);
                        newest_ak1(tFlag, sdPar, sdPar.a, calcPar.a1, calcPar.a3, calcPar.a7, sdPar.b, calcPar.c, calcPar.d, calcPar.f, calcPar.g, calcPar.h, u, v, K, N, p);
                        ui = sdPar.a;
                        vi = sdPar.b;

                        // If vi is zero, the iteration is not converging
                        if(vi != 0) {
                            relstp = Math.abs((-v + vi) / vi);
                            u = ui;
                            v = vi;
                        }
                    }
                    while(vi != 0);
                    return;
                }

                function RealIT_ak1(DBL_EPSILON, iPar, sdPar, N, p, NN, qp, K, qk) {
                    // Variable-shift H-polynomial iteration for a real zero
                    // sss	- starting iterate = sdPar.a
                    // NZ		- number of zeros found = iPar.NZ
                    // dumFlag	- flag to indicate a pair of zeros near real axis, returned to iFlag

                    var ee, kv, mp, ms, omp, pv, s, t,
                            dumFlag, i, j, nm1 = N - 1;   // Integer variables

                    iPar.NZ = j = dumFlag = 0;
                    s = sdPar.a;

                    for(; ; ) {
                        pv = p[0];

                        // Evaluate p at s
                        qp[0] = pv;
                        for(i = 1; i < NN; i++) {
                            qp[i] = pv = pv * s + p[i];
                        }
                        mp = Math.abs(pv);

                        // Compute a rigorous bound on the error in evaluating p
                        ms = Math.abs(s);
                        ee = 0.5 * Math.abs(qp[0]);
                        for(i = 1; i < NN; i++) {
                            ee = ee * ms + Math.abs(qp[i]);
                        }

                        // Iteration has converged sufficiently if the polynomial value is less than
                        // 20 times this bound
                        if(mp <= 20.0 * DBL_EPSILON * (2.0 * ee - mp)) {
                            iPar.NZ = 1;
                            iPar.szr = s;
                            iPar.szi = 0.0;
                            break;
                        }
                        j++;
                        // Stop iteration after 10 steps
                        if(j > 10)
                            break;

                        if(j >= 2) {
                            if((Math.abs(t) <= 0.001 * Math.abs(-t + s)) && (mp > omp)) {
                                // A cluster of zeros near the real axis has been encountered.
                                // Return with iFlag set to initiate a quadratic iteration.
                                dumFlag = 1;
                                iPar.a = s;
                                break;
                            } // End if ((fabs(t) <= 0.001*fabs(s - t)) && (mp > omp))
                        } //End if (j >= 2)

                        // Return if the polynomial value has increased significantly
                        omp = mp;

                        // Compute t, the next polynomial and the new iterate
                        qk[0] = kv = K[0];
                        for(i = 1; i < N; i++) {
                            qk[i] = kv = kv * s + K[i];
                        }

                        if(Math.abs(kv) > Math.abs(K[nm1]) * 10.0 * DBL_EPSILON) {
                            // Use the scaled form of the recurrence if the value of K at s is non-zero
                            t = -(pv / kv);
                            K[0] = qp[0];
                            for(i = 1; i < N; i++) {
                                K[i] = t * qk[i - 1] + qp[i];
                            }
                        }
                        else {
                            // Use unscaled form
                            K[0] = 0.0;
                            for(i = 1; i < N; i++)
                                K[i] = qk[i - 1];
                        }

                        kv = K[0];
                        for(i = 1; i < N; i++) {
                            kv = kv * s + K[i];
                        }
                        t = ((Math.abs(kv) > (Math.abs(K[nm1]) * 10.0 * DBL_EPSILON)) ? -(pv / kv) : 0.0);
                        s += t;
                    }
                    return dumFlag;
                }

                function Fxshfr_ak1(DBL_EPSILON, MDP1, L2, sr, v, K, N, p, NN, qp, u, iPar) {

                    // Computes up to L2 fixed shift K-polynomials, testing for convergence in the linear or
                    // quadratic case. Initiates one of the variable shift iterations and returns with the
                    // number of zeros found.
                    // L2	limit of fixed shift steps
                    // iPar is a dummy variable for passing in the five parameters--NZ, lzi, lzr, szi, and szr--by reference
                    // NZ	number of zeros found
                    var sdPar = new Object(), // sdPar is a dummy variable for passing the two parameters--a and b--into QuadSD_ak1 by reference
                            calcPar = new Object(),
                            // calcPar is a dummy variable for passing the nine parameters--a1, a3, a7, c, d, e, f, g, and h --into calcSC_ak1 by reference

                            qk = new Array(MDP1),
                            svk = new Array(MDP1),
                            a, b, betas, betav, oss, ots, otv, ovv, s, ss, ts, tss, tv, tvv, ui, vi, vv,
                            fflag, i, iFlag = 1, j, spass, stry, tFlag, vpass, vtry;     // Integer variables

                    iPar.NZ = 0;
                    betav = betas = 0.25;
                    oss = sr;
                    ovv = v;

                    //Evaluate polynomial by synthetic division
                    sdPar.b = sdPar.a = 0.0;
                    QuadSD_ak1(NN, u, v, p, qp, sdPar);
                    a = sdPar.a;
                    b = sdPar.b;
                    calcPar.h = calcPar.g = calcPar.f = calcPar.e = calcPar.d = calcPar.c = calcPar.a7 = calcPar.a3 = calcPar.a1 = 0.0;
                    tFlag = calcSC_ak1(DBL_EPSILON, N, a, b, calcPar, K, u, v, qk);

                    for(j = 0; j < L2; j++) {
                        fflag = 1;

                        // Calculate next K polynomial and estimate v
                        nextK_ak1(DBL_EPSILON, N, tFlag, a, b, calcPar, K, qk, qp);
                        tFlag = calcSC_ak1(DBL_EPSILON, N, a, b, calcPar, K, u, v, qk);

                        // Use sdPar for passing in uu and vv instead of defining a brand-new variable.
                        // sdPar.a = ui, sdPar.b = vi
                        newest_ak1(tFlag, sdPar, a, calcPar.a1, calcPar.a3, calcPar.a7, b, calcPar.c, calcPar.d, calcPar.f, calcPar.g, calcPar.h, u, v, K, N, p);
                        ui = sdPar.a;
                        vv = vi = sdPar.b;

                        // Estimate s
                        ss = ((K[N - 1] != 0.0) ? -(p[N] / K[N - 1]) : 0.0);
                        ts = tv = 1.0;

                        if((j != 0) && (tFlag != 3)) {
                            // Compute relative measures of convergence of s and v sequences
                            tv = ((vv != 0.0) ? Math.abs((vv - ovv) / vv) : tv);
                            ts = ((ss != 0.0) ? Math.abs((ss - oss) / ss) : ts);

                            // If decreasing, multiply the two most recent convergence measures
                            tvv = ((tv < otv) ? tv * otv : 1.0);
                            tss = ((ts < ots) ? ts * ots : 1.0);

                            // Compare with convergence criteria
                            vpass = ((tvv < betav) ? 1 : 0);
                            spass = ((tss < betas) ? 1 : 0);

                            if((spass) || (vpass)) {

                                // At least one sequence has passed the convergence test.
                                // Store variables before iterating

                                for(i = 0; i < N; i++) {
                                    svk[i] = K[i];
                                }
                                s = ss;

                                // Choose iteration according to the fastest converging sequence

                                stry = vtry = 0;

                                for(; ; ) {
                                    if((fflag && ((fflag = 0) == 0)) && ((spass) && (!vpass || (tss < tvv)))) {
                                        ;// Do nothing. Provides a quick "short circuit".
                                    }
                                    else {
                                        QuadIT_ak1(DBL_EPSILON, N, iPar, ui, vi, qp, NN, sdPar, p, qk, calcPar, K);
                                        a = sdPar.a;
                                        b = sdPar.b;

                                        if((iPar.NZ) > 0)
                                            return;

                                        // Quadratic iteration has failed. Flag that it has been tried and decrease the
                                        // convergence criterion
                                        iFlag = vtry = 1;
                                        betav *= 0.25;

                                        // Try linear iteration if it has not been tried and the s sequence is converging
                                        if(stry || (!spass)) {
                                            iFlag = 0;
                                        }
                                        else {
                                            for(i = 0; i < N; i++)
                                                K[i] = svk[i];
                                        }
                                    }
                                    //fflag = 0;
                                    if(iFlag != 0) {
                                        // Use sdPar for passing in s instead of defining a brand-new variable.
                                        // sdPar.a = s
                                        sdPar.a = s;
                                        iFlag = RealIT_ak1(DBL_EPSILON, iPar, sdPar, N, p, NN, qp, K, qk);
                                        s = sdPar.a;

                                        if((iPar.NZ) > 0)
                                            return;

                                        // Linear iteration has failed. Flag that it has been tried and decrease the
                                        // convergence criterion
                                        stry = 1;
                                        betas *= 0.25;

                                        if(iFlag != 0) {
                                            // If linear iteration signals an almost double real zero, attempt quadratic iteration
                                            ui = -(s + s);
                                            vi = s * s;
                                            continue;

                                        }
                                    }

                                    // Restore variables
                                    for(i = 0; i < N; i++)
                                        K[i] = svk[i];

                                    // Try quadratic iteration if it has not been tried and the v sequence is converging
                                    if(!vpass || vtry)
                                        break;		// Break out of infinite for loop

                                }

                                // Re-compute qp and scalar values to continue the second stage

                                QuadSD_ak1(NN, u, v, p, qp, sdPar);
                                a = sdPar.a;
                                b = sdPar.b;

                                tFlag = calcSC_ak1(DBL_EPSILON, N, a, b, calcPar, K, u, v, qk);
                            }
                        }
                        ovv = vv;
                        oss = ss;
                        otv = tv;
                        ots = ts;
                    }
                    return;
                }

                function rpSolve(degPar, p, zeror, zeroi) {
                    var N = degPar.Degree,
                            RADFAC = 3.14159265358979323846 / 180, // Degrees-to-radians conversion factor = PI/180
                            LB2 = Math.LN2, // Dummy variable to avoid re-calculating this value in loop below
                            MDP1 = degPar.Degree + 1,
                            K = new Array(MDP1),
                            pt = new Array(MDP1),
                            qp = new Array(MDP1),
                            temp = new Array(MDP1),
                            // qPar is a dummy variable for passing the four parameters--sr, si, lr, and li--by reference
                            qPar = new Object(),
                            // Fxshfr_Par is a dummy variable for passing parameters by reference : NZ, lzi, lzr, szi, szr);
                            Fxshfr_Par = new Object(),
                            bnd, DBL_EPSILON, df, dx, factor, ff, moduli_max, moduli_min, sc, x, xm,
                            aa, bb, cc, sr, t, u, xxx,
                            j, jj, l, NM1, NN, zerok;// Integer variables

                    // Calculate the machine epsilon and store in the variable DBL_EPSILON.
                    // To calculate this value, just use existing variables rather than create new ones that will be used only for this code block
                    aa = 1.0;
                    do {
                        DBL_EPSILON = aa;
                        aa /= 2;
                        bb = 1.0 + aa;
                    }
                    while(bb > 1.0);

                    var LO = Number.MIN_VALUE / DBL_EPSILON,
                            cosr = Math.cos(94.0 * RADFAC), // = -0.069756474
                            sinr = Math.sin(94.0 * RADFAC), // = 0.99756405
                            xx = Math.sqrt(0.5), // = 0.70710678
                            yy = -xx;

                    Fxshfr_Par.NZ = j = 0;
                    Fxshfr_Par.szr = Fxshfr_Par.szi = Fxshfr_Par.lzr = Fxshfr_Par.lzi = 0.0;

                    // Remove zeros at the origin, if any
                    while(p[N] == 0) {
                        zeror[j] = zeroi[j] = 0;
                        N--;
                        j++;
                    }
                    NN = N + 1;

                    // >>>>> Begin Main Loop <<<<<
                    while(N >= 1) { // Main loop
                        // Start the algorithm for one zero
                        if(N <= 2) {
                            // Calculate the final zero or pair of zeros
                            if(N < 2) {
                                zeror[degPar.Degree - 1] = -(p[1] / p[0]);
                                zeroi[degPar.Degree - 1] = 0;
                            }
                            else {
                                qPar.li = qPar.lr = qPar.si = qPar.sr = 0.0;
                                Quad_ak1(p[0], p[1], p[2], qPar);
                                zeror[degPar.Degree - 2] = qPar.sr;
                                zeroi[degPar.Degree - 2] = qPar.si;
                                zeror[degPar.Degree - 1] = qPar.lr;
                                zeroi[degPar.Degree - 1] = qPar.li;
                            }
                            break;
                        }

                        // Find the largest and smallest moduli of the coefficients
                        moduli_max = 0.0;
                        moduli_min = Number.MAX_VALUE;

                        for(i = 0; i < NN; i++) {
                            x = Math.abs(p[i]);
                            if(x > moduli_max)
                                moduli_max = x;
                            if((x != 0) && (x < moduli_min))
                                moduli_min = x;
                        }

                        // Scale if there are large or very small coefficients
                        // Computes a scale factor to multiply the coefficients of the polynomial. The scaling
                        // is done to avoid overflow and to avoid undetected underflow interfering with the
                        // convergence criterion.
                        // The factor is a power of the base.
                        sc = LO / moduli_min;

                        if(((sc <= 1.0) && (moduli_max >= 10)) || ((sc > 1.0) && (Number.MAX_VALUE / sc >= moduli_max))) {
                            sc = ((sc == 0) ? Number.MIN_VALUE : sc);
                            l = Math.floor(Math.log(sc) / LB2 + 0.5);
                            factor = Math.pow(2.0, l);
                            if(factor != 1.0) {
                                for(i = 0; i < NN; i++)
                                    p[i] *= factor;
                            }
                        }

                        // Compute lower bound on moduli of zeros
                        for(var i = 0; i < NN; i++)
                            pt[i] = Math.abs(p[i]);
                        pt[N] = -(pt[N]);
                        NM1 = N - 1;

                        // Compute upper estimate of bound
                        x = Math.exp((Math.log(-pt[N]) - Math.log(pt[0])) / N);

                        if(pt[NM1] != 0) {
                            // If Newton step at the origin is better, use it
                            xm = -pt[N] / pt[NM1];
                            x = ((xm < x) ? xm : x);
                        }

                        // Chop the interval (0, x) until ff <= 0
                        xm = x;
                        do {
                            x = xm;
                            xm = 0.1 * x;
                            ff = pt[0];
                            for(var i = 1; i < NN; i++) {
                                ff = ff * xm + pt[i];
                            }
                        }
                        while(ff > 0); // End do-while loop

                        dx = x;
                        // Do Newton iteration until x converges to two decimal places

                        do {
                            df = ff = pt[0];
                            for(var i = 1; i < N; i++) {
                                ff = x * ff + pt[i];
                                df = x * df + ff;
                            } // End for i
                            ff = x * ff + pt[N];
                            dx = ff / df;
                            x -= dx;
                        }
                        while(Math.abs(dx / x) > 0.005); // End do-while loop

                        bnd = x;

                        // Compute the derivative as the initial K polynomial and do 5 steps with no shift
                        for(var i = 1; i < N; i++)
                            K[i] = (N - i) * p[i] / N;
                        K[0] = p[0];
                        aa = p[N];
                        bb = p[NM1];
                        zerok = ((K[NM1] == 0) ? 1 : 0);

                        for(jj = 0; jj < 5; jj++) {
                            cc = K[NM1];
                            if(zerok) {
                                // Use unscaled form of recurrence
                                for(var i = 0; i < NM1; i++) {
                                    j = NM1 - i;
                                    K[j] = K[j - 1];
                                } // End for i
                                K[0] = 0;
                                zerok = ((K[NM1] == 0) ? 1 : 0);
                            }
                            else {
                                // Used scaled form of recurrence if value of K at 0 is nonzero
                                t = -aa / cc;
                                for(var i = 0; i < NM1; i++) {
                                    j = NM1 - i;
                                    K[j] = t * K[j - 1] + p[j];
                                } // End for i
                                K[0] = p[0];
                                zerok = ((Math.abs(K[NM1]) <= Math.abs(bb) * DBL_EPSILON * 10.0) ? 1 : 0);
                            }
                        }

                        // Save K for restarts with new shifts
                        for(var i = 0; i < N; i++)
                            temp[i] = K[i];

                        // Loop to select the quadratic corresponding to each new shift
                        for(jj = 1; jj <= 20; jj++) {

                            // Quadratic corresponds to a double shift to a non-real point and its
                            // complex conjugate. The point has modulus BND and amplitude rotated
                            // by 94 degrees from the previous shift.

                            xxx = -(sinr * yy) + cosr * xx;
                            yy = sinr * xx + cosr * yy;
                            xx = xxx;
                            sr = bnd * xx;
                            u = -(2.0 * sr);

                            // Second stage calculation, fixed quadratic
                            Fxshfr_ak1(DBL_EPSILON, MDP1, 20 * jj, sr, bnd, K, N, p, NN, qp, u, Fxshfr_Par);

                            if(Fxshfr_Par.NZ != 0) {
                                // The second stage jumps directly to one of the third stage iterations and
                                // returns here if successful. Deflate the polynomial, store the zero or
                                // zeros, and return to the main algorithm.
                                j = degPar.Degree - N;
                                zeror[j] = Fxshfr_Par.szr;
                                zeroi[j] = Fxshfr_Par.szi;
                                NN = NN - Fxshfr_Par.NZ;
                                N = NN - 1;
                                for(var i = 0; i < NN; i++)
                                    p[i] = qp[i];
                                if(Fxshfr_Par.NZ != 1) {
                                    zeror[j + 1] = Fxshfr_Par.lzr;
                                    zeroi[j + 1] = Fxshfr_Par.lzi;
                                }
                                break;
                            }
                            else {
                                // If the iteration is unsuccessful, another quadratic is chosen after restoring K
                                for(var i = 0; i < N; i++) {
                                    K[i] = temp[i];
                                }
                            }
                        }
                        // Return with failure if no convergence with 20 shifts
                        if(jj > 20) {
                            degPar.Degree -= N;
                            break;
                        }
                    }
                    // >>>>> End Main Loop <<<<<
                    return;
                }
                //--> End Jenkins-Traub
                rpSolve(degreePar, p, zeror, zeroi);

                var l = zeroi.length;
                //format the output
                for(i = 0; i < l; i++) {
                    // We round the imaginary part to avoid having something crazy like 5.67e-16.
                    var img = round(zeroi[i], decp + 8),
                            real = round(zeror[i], decp + 8);
                    // Did the rounding pay off? If the rounding did nothing more than chop off a few digits then no.
                    // If the rounding results in a a number at least 3 digits shorter we'll keep it else we'll keep 
                    // the original otherwise the rounding was worth it.
                    real = decp - String(real).length > 2 ? real : zeror[i];
                    var sign = img < 0 ? '-' : '';

                    // Remove the zeroes
                    if(real === 0) {
                        real = '';
                    }
                    if(img === 0) {
                        img = '';
                    }

                    // Remove 1 as the multiplier and discard imaginary part if there isn't one.
                    img = Math.abs(img) === 1 ? sign + 'i' : (img ? img + '*i' : '');

                    var num = (real && img) ? real + '+' + img : real + img;
                    zeror[i] = num.replace(/\+\-/g, '-');
                }
                return zeror;
            }
        },
        roots: function (symbol) {

            if(symbol.isConstant(true, true)) {
                return core.Utils.nroots(symbol);
            }
            var roots = __.proots(symbol).map(function (x) {
                return _.parse(x);
            });
            return core.Vector.fromArray(roots);
        },
        froot: function (f, guess, dx) {
            var newtonraph = function (xn) {
                var mesh = 1e-12,
                        // If the derivative was already provided then don't recalculate.
                        df = dx ? dx : core.Utils.build(core.Calculus.diff(f.clone())),
                        // If the function was passed in as a function then don't recalculate.
                        fn = f instanceof Function ? f : core.Utils.build(f),
                        max = 10000,
                        done = false,
                        safety = 0;
                while(!done) {
                    var x = xn - (fn(xn) / df(xn));
                    //absolute values for both x & xn ensures that we indeed have the radius    
                    var r = Math.abs(x) - Math.abs(xn),
                            delta = Math.abs(r);
                    xn = x;

                    if(delta < mesh)
                        done = true;
                    else if(safety > max) {
                        xn = null;
                        done = true;
                    }

                    safety++;
                }
                return xn;
            };
            return newtonraph(Number(guess));
        },
        quad: function (a, b, c) {
            var q = function (a, b, c, sign) {
                return _.parse('-(' + b + '+' + sign + '*sqrt((' + b + ')^2-4*(' + a + ')*(' + c + ')))/(2*' + a + ')');
            };
            return [q(a, b, c, 1), q(a, b, c, -1)];
        },
        sumProd: function (a, b) {
            return __.quad(-b, a, -1).map(function (x) {
                return x.invert();
            });
        },
        coeffs: function (symbol, wrt, coeffs) {
            wrt = String(wrt);
            symbol = _.expand(symbol);
            coeffs = coeffs || [new Symbol(0)];
            //we cannot get coeffs for group EX
            if(symbol.group === EX && symbol.contains(wrt, true))
                _.error('Unable to get coefficients using expression ' + symbol.toString());
            var vars = variables(symbol);
            if(vars.length === 1 && vars[0] === wrt && !symbol.isImaginary()) {
                var a = new Polynomial(symbol).coeffs.map(function (x) {
                    return new Symbol(x);
                });

                for(var i = 0, l = a.length; i < l; i++) {
                    var coeff = a[i],
                            e = coeffs[i];
                    if(e)
                        coeff = _.add(e, coeff);
                    coeffs[i] = coeff; //transfer it all over
                }
            }
            else {
                if(!wrt)
                    _.error('Polynomial contains more than one variable. Please specify which variable is to be used!');
                //if the variable isn't part of this polynomial then we're looking at x^0

                if(vars.indexOf(wrt) === -1) {
                    coeffs[0] = _.add(symbol, coeffs[0]);
                }
                else {
                    coeffs = coeffs || [new Symbol(0)];
                    if(symbol.group === CB) {
                        var s = symbol.symbols[wrt];
                        if(!s)
                            _.error('Expression is not a polynomial!');
                        var p = Number(s.power);
                        coeff = _.divide(symbol.clone(), s.clone());
                        if(coeff.contains(wrt, true) || p < 0 || !isInt(p))
                            _.error('Expression is not a polynomial!');
                        var e = coeffs[p];
                        if(e)
                            coeff = _.add(e, coeff);
                        coeffs[p] = coeff;
                    }
                    else if(symbol.group === CP) {
                        symbol.each(function (x) {
                            __.coeffs(x.clone(), wrt, coeffs);
                        }, true);
                    }
                }
            }
            //fill holes
            for(var i = 0, l = coeffs.length; i < l; i++)
                if(typeof coeffs[i] === 'undefined')
                    coeffs[i] = new Symbol(0);

            return coeffs;
        },
        /**
         * Get's all the powers of a particular polynomial including the denominators. The denominators powers
         * are returned as negative. All remaining polynomials are returned as zero order polynomials.
         * for example polyPowers(x^2+1/x+y+t) will return [ '-1', 0, '2' ]
         * @param {Symbol} e
         * @param {String} for_variable
         * @param {Array} powers
         * @returns {Array} An array of the powers
         */
        //assumes you've already verified that it's a polynomial
        polyPowers: function (e, for_variable, powers) {
            powers = powers || [];
            var g = g = e.group;
            if(g === PL && for_variable === e.value) {
                powers = powers.concat(keys(e.symbols));
            }
            else if(g === CP) {
                for(var s in e.symbols) {
                    var symbol = e.symbols[s];
                    var g = symbol.group, v = symbol.value;
                    if(g === S && for_variable === v)
                        powers.push(symbol.power);
                    else if(g === PL || g === CP)
                        powers = __.polyPowers(symbol, for_variable, powers);
                    else if(g === CB && symbol.contains(for_variable)) {
                        var t = symbol.symbols[for_variable];
                        if(t)
                            powers.push((t.power));
                    }
                    else if(g === N || for_variable !== v)
                        powers.push(0);
                }
            }
            else if(g === CB && e.contains(for_variable)) {
                powers.push(core.Utils.decompose_fn(e, for_variable, true).x.power);
            }
            return core.Utils.arrayUnique(powers).sort();
        },
        //The factor object
        Factor: {
            //splits the symbol in symbol and constant
            split: function (symbol) {
                var c = new Symbol(1); //the constants part
                var s = new Symbol(1); //the symbolic part
                __.Factor.factor(symbol, new Factors()).each(function (x) {
                    var t = _.parse(x);
                    if(x.isConstant(true)) {
                        c = _.multiply(c, t);
                    }
                    else {
                        s = _.multiply(s, t);
                    }
                });
                return [c, s];
            },
            mix: function (o, include_negatives) {
                var factors = keys(o);
                var l = factors.length;
                var m = [];//create a row which we'r going to be mixing
                for(var i = 0; i < l; i++) {
                    var factor = factors[i],
                            p = o[factor];
                    var ll = m.length;
                    for(var j = 0; j < ll; j++) {
                        var t = m[j] * factor;
                        m.push(t);
                        if(include_negatives)
                            m.push(-t);
                    }

                    for(var j = 1; j <= p; j++)
                        m.push(Math.pow(factor, j));
                }
                return m;
            },
            //TODO: this method is to replace common factoring
            common: function (symbol, factors) {
                try {
                    if(symbol.group === CP) {
                        //this may have the unfortunate side effect of expanding and factoring again
                        //to only end up with the same result. 
                        //TODO: try to avoid this
                        //collect the symbols and sort to have the longest first. Thinking is that the longest terms 
                        //has to contain the variable in order for it to be factorable
                        var symbols = _.expand(symbol.clone(), true).collectSymbols(null, null, function (a, b) {
                            return (b.length || 1) - (a.length || 1);
                        });

                        var map = {}; //create a map of common factors
                        var coeffs = [];
                        for(var i = 0; i < symbols.length; i++) {
                            var sym = symbols[i];
                            coeffs.push(sym.multiplier.clone());
                            sym.each(function (x) {
                                var p = Number(x.power);
                                //This check exits since we have a symbolic power.
                                //For the future... think about removing this check and modify for symbolic powers
                                if(isNaN(p))
                                    throw new Error('exiting');
                                //loop through the symbols and lump together common terms
                                if(x.value in map) {
                                    if(p < map[x.value][0])
                                        map[x.value][0] = p;
                                    map[x.value][1].push(x);
                                }
                                else
                                    map[x.value] = [p, [x]];
                            });
                        }
                        //the factor
                        var factor = new Symbol(1);
                        for(var x in map) {
                            //if this factor is found in all terms since the length of 
                            //matching variable terms matches the number of original terms
                            if(map[x][1].length === symbols.length) {
                                //generate a symbol and multiply into the factor
                                factor = _.multiply(factor, _.pow(new Symbol(x), new Symbol(map[x][0])));
                            }
                        }
                        //get coefficient factor
                        var c = core.Math2.QGCD.apply(null, coeffs);

                        if(!c.equals(1)) {
                            factors.add(new Symbol(c));
                            for(var i = 0; i < symbols.length; i++) {
                                symbols[i].multiplier = symbols[i].multiplier.divide(c);
                            }
                        }

                        //if we actuall found any factors
                        if(!factor.equals(1)) {
                            factors.add(factor);
                            symbol = new Symbol(0);
                            for(var i = 0; i < symbols.length; i++) {
                                symbol = _.add(symbol, _.divide(symbols[i], factor.clone()));
                            }
                        }
                    }
                }
                catch(e) {
                    ;
                }

                return symbol;
            },
            zeroes: function (symbol, factors) {
                var exit = function () {
                    throw new core.exceptions.ValueLimitExceededError('Exiting');
                };
                try {
                    var vars, term, sum, p, e;
                    symbol = _.expand(symbol.clone());
                    e = symbol.toString();
                    vars = variables(symbol);

                    sum = new Symbol(0);

                    var terms = [];
                    var powers = [];

                    //start setting each variable to zero
                    for(var i = 0, l = vars.length; i < vars.length; i++) {
                        var subs = {};
                        //we want to create a subs object with all but the current variable set to zero
                        for(var j = 0; j < l; j++)
                            if(i !== j) //make sure we're not looking at the same variable
                                subs[vars[j]] = 0;
                        term = _.parse(e, subs);
                        var tp = term.power;
                        //the temporary power has to be an integer as well
                        if(!isInt(tp))
                            exit();
                        terms.push(term);
                        powers.push(term.power);
                    }

                    //get the gcd. This will be the p in (a^n+b^m)^p
                    //if the gcd equals 1 meaning n = m then we need a tie breakder
                    if(core.Utils.allSame(powers)) {
                        //get p given x number of terms
                        var n_terms = symbol.length;
                        //the number of zeroes determines
                        var n_zeroes = terms.length;
                        if(n_zeroes === 2) {
                            p = new Frac(powers[0] / (n_terms - 1));
                        }
                        if(n_zeroes === 3) {
                            p = new Frac(powers[0] / Math.round((Math.sqrt(8 * n_terms - 1) - 3) / 2));
                        }
                        /*
                         //get the lowest possible power
                         //e.g. given b^4+2*a^2*b^2+a^4, the power we're looking for would be 2
                         symbol.each(function(x) {
                         if(x.group === CB)
                         x.each(function(y) {
                         if(!p || y.power.lessThan(p))
                         //p = Number(y.power);
                         p = y.power;
                         });
                         else if(!p || x.power.lessThan(p))
                         //p = Number(x.power);
                         p = x.power;
                         });
                         */
                    }
                    else
                        //p is just the gcd of the powers
                        p = core.Math2.QGCD.apply(null, powers);

                    //if we don't have an integer then exit
                    if(!isInt(p))
                        exit();

                    //build the factor
                    for(var i = 0; i < terms.length; i++) {
                        var t = terms[i];
                        var n = t.power.clone().divide(p);
                        t.multiplier = new Frac(Math.pow(t.multiplier, 1 / n));
                        t.power = p.clone();
                        sum = _.add(sum, t);
                    }

                    //by now we have the factor of zeroes. We'll know if we got it right because 
                    //we'll get a remainder of zero each time we divide by it
                    if(sum.group !== CP)
                        return symbol; //nothing to do

                    while(true) {
                        var d = __.div(symbol.clone(), sum.clone());
                        if(d[1].equals(0)) {
                            symbol = d[0];
                            factors.add(sum.clone());
                            if(symbol.equals(1)) //we've reached 1 so done.
                                break;
                        }
                        else
                            break;
                    }
                }
                catch(e) {
                }
                ;

                return symbol;
            },
            factor: function (symbol, factors) {
                // Don't try to factor constants
                if(symbol.isConstant()) {
                    return core.Math2.factor(symbol);
                }

                var _symbol = _.parse(symbol);
                var retval = __.Factor._factor(_symbol, factors);
                if(retval.equals(symbol)) {
                    return retval;
                }

                if(retval.group === CB) {
                    var t = new Symbol(1);
                    var p = _.parse(retval.power);
                    //store the multiplier and strip it
                    var m = _.parse(retval.multiplier);

                    retval.toUnitMultiplier();

                    /* 
                     * NOTE: for sign issues with factor START DEBUGGING HERE
                     */
                    //move the sign to t
                    if(retval.multiplier.lessThan(0)) {
                        t.negate();
                        retval.negate();
                    }

                    retval.each(function (x) {
                        // Related to #566. Since the symbol's group may not have been properly
                        // updated, it's easier to just parse the symbol and have the parser 
                        // do the update for us.
                        var factored = _.parse(__.Factor._factor(x));

                        if(factored.group === CB) {
                            // Include the multiplier
                            m = _.multiply(m, Symbol.create(factored.multiplier));
                            factored.each(function (y) {
                                var _factored = _.parse(__.Factor._factor(y));
                                t = _.multiply(t, _factored);
                                if(_factored.group === CB) {
                                    m = _.multiply(m, Symbol.create(_factored.multiplier));
                                }
                            });
                        }
                        else {
                            t = _.multiply(t, factored);
                        }
                    });

                    //put back the multiplier and power
                    retval = _.pow(_.multiply(m, t), p);
                }

                return retval;
            },
            quadFactor: function (symbol, factors) {
                if(symbol.isPoly() && __.degree(symbol.equals(2))) {
                    //We've  already checked that we're dealing with a polynomial
                    var v = core.Utils.variables(symbol)[0]; //get the variable
                    var coeffs = __.coeffs(symbol, v);
                    //factor the lead coefficient
                    var cf = __.Factor._factor(coeffs[2].clone());
                    //check if we have factors
                    if(cf.group === CB) {
                        var symbols = cf.collectSymbols();
                        //if the factors are greater than 2 we're done so exit
                        if(symbols.length > 2)
                            return symbol;
                        //if we have two factors then attempt to factor the polynomial
                        //let the factors be f1 and f1
                        //let the factors be (ax+b)(cx+d)
                        //let the coefficients be c1x^2+c2x+c3
                        //then a(x1)+c(x2)=c2 and x1*x2=c3
                        //we can solve for x1 and x2
                        var c = _.multiply(_.parse(coeffs[0]), _.parse(symbols[0]));
                        var b = _.parse(coeffs[1]).negate();
                        var a = _.parse(symbols[1]);
                        //solve the system
                        var root = __.quad(a, b, c).filter(function (x) {
                            if(core.Utils.isInt(x))
                                return x;
                        });
                        //if we have one root then find the other one by dividing the constant
                        if(root.length === 1) {
                            var root1 = root[0];
                            var root2 = _.divide(coeffs[0], _.parse(root1));
                            if(core.Utils.isInt(root2)) {
                                //we found them both
                                factors.add(_.parse(format('({0})*({1})+({2})', symbols[1], v, root2)));
                                factors.add(_.parse(format('({0})*({1})+({2})', symbols[0], v, root1)));
                                symbol = new Symbol(1);
                            }
                        }
                    }
                }
                return symbol;
            },
            cubeFactor: function (symbol, factors) {
                if(symbol.isComposite()) {
                    var symbols = symbol.collectSymbols();
                    // The symbol should be in the form of a^3+-b^3. The length
                    // should therefore only be two. If it's any different from this
                    // then we're done
                    if(symbols.length === 2) {
                        // Store the signs and then strip them from the symbols
                        var sign_a = symbols[0].sign();
                        var a = symbols[0].clone().abs();
                        var sign_b = symbols[1].sign();
                        var b = symbols[1].clone().abs();
                        // Check if they're cube
                        if(a.isCube() && b.isCube()) {
                            // Keep the negative sign on the right, meaning b is always negative.
                            if(sign_a < sign_b) {
                                // Swap the signs and then the values
                                [sign_a, sign_b] = [sign_b, sign_a];
                                [a, b] = [b, a];
                            }

                            // Get teh roots
                            var m_root_a = _.parse(a.getNth(3));
                            var m_root_b = _.parse(b.getNth(3));

                            // Remove the cube for both
                            var x = _.multiply(_.expand(_.pow(a.clone().toUnitMultiplier(), _.parse('1/3'))), m_root_a);
                            var y = _.multiply(_.expand(_.pow(b.clone().toUnitMultiplier(), _.parse('1/3'))), m_root_b);

                            if(sign_a === 1 && sign_b === -1) {
                                // Apply difference of cubes rule
                                factors.add(_.parse(format('(({0})-({1}))', x, y)));
                                factors.add(_.parse(format('(({0})^2+({0})*({1})+({1})^2)', x, y)));
                                symbol = Symbol(1);
                            }
                            else if(sign_a === 1 && sign_b === 1) {
                                // Apply sum of cubes rule
                                factors.add(_.parse(format('(({0})+({1}))', x, y)));
                                factors.add(_.parse(format('(({0})^2-({0})*({1})+({1})^2)', x, y)));
                                symbol = Symbol(1);
                            }
                        }
                    }
                }

                return symbol;
            },
            _factor: function (symbol, factors) {
                var g = symbol.group;
                //some items cannot be factored any further so return those right away
                if(symbol.group === FN) {
                    var arg = symbol.args[0];
                    if(arg.group === S && arg.isSimple()) {
                        return symbol;
                    }
                }
                else if(symbol.group === S && symbol.isSimple()) {
                    return symbol;
                }

                // Expand the symbol to get it in a predictable form. If this step
                // is skipped some factors are missed.
                //if(symbol.group === CP && !(even(symbol.power) && symbol.multiplier.lessThan(0))) {
                if(symbol.group === CP) {
                    symbol.distributeMultiplier(true);
                    var t = new Symbol(0);
                    symbol.each(function (x) {
                        if((x.group === CP && x.power.greaterThan(1) || x.group === CB))
                            x = _.expand(x);
                        t = _.add(t, x);
                    });
                    t.power = symbol.power;

                    symbol = t;
                }

                if(symbol.group === FN && symbol.fname !== 'sqrt') {
                    symbol = core.Utils.evaluate(symbol);
                }

                //make a copy of the symbol to return if something goes wrong
                var untouched = symbol.clone();
                try {
                    if(symbol.group === CB) {
                        var p = _.parse(symbol.power);

                        var den_array, num_array, den, num, dfact, nfact;
                        //grab the denominator and strip the multiplier and power. Store them in an array
                        den_array = __.Simplify.strip(symbol.getDenom());
                        num_array = __.Simplify.strip(symbol.getNum());

                        den = den_array.pop();
                        num = num_array.pop();

                        //if the numerator equals the symbol then we've hit the simplest form and then we're done
                        if(num.equals(symbol)) {
                            return symbol;
                        }
                        nfact = __.Factor.factor(num);
                        dfact = __.Factor.factor(den);

                        var n = __.Simplify.unstrip(num_array, nfact);
                        var d = __.Simplify.unstrip(den_array, dfact);

                        var retval = _.divide(n, d);

                        return retval;
                    }
                    if(symbol.group === S) {
                        return symbol; //absolutely nothing to do
                    }

                    if(symbol.isConstant()) {
                        if(symbol.equals(1))
                            return symbol.clone();
                        var ret = core.Math2.factor(symbol);
                        return ret;
                    }

                    var p = symbol.power.clone();

                    if(isInt(p) && !(p.lessThan(0) && symbol.group === FN)) {
                        var sign = p.sign();
                        symbol.toLinear();
                        factors = factors || new Factors();
                        var map = {};
                        symbol = _.parse(core.Utils.subFunctions(symbol, map));
                        if(keys(map).length > 0) { //it might have functions
                            factors.preAdd = function (factor) {
                                var ret = _.parse(factor, core.Utils.getFunctionsSubs(map));
                                return ret;
                            };
                        }

                        //strip the power
                        if(!symbol.isLinear()) {
                            factors.pFactor = symbol.power.toString();
                            symbol.toLinear();
                        }

                        var vars = variables(symbol);
                        //bypass for imaginary. TODO: find a better solution
                        if(symbol.isImaginary()) {
                            vars.push(core.Settings.IMAGINARY);
                        }
                        var multiVar = vars.length > 1;

                        //minor optimization. Seems to cut factor time by half in some cases.
                        if(multiVar) {
                            var all_S = true, all_unit = true;
                            symbol.each(function (x) {
                                if(x.group !== S)
                                    all_S = false;
                                if(!x.multiplier.equals(1))
                                    all_unit = false;
                            });

                            if(all_S && all_unit) {
                                return _.pow(_.parse(symbol, core.Utils.getFunctionsSubs(map)), _.parse(p));
                            }
                        }

                        //factor the coefficients
                        var coeff_factors = new Factors();

                        symbol = __.Factor.coeffFactor(symbol, coeff_factors);

                        coeff_factors.each(function (x) {
                            // If the factor was negative but was within a square then it becomes positive
                            if(even(p) && x.lessThan(0)) {
                                x.negate();
                            }

                            if(sign < 0)
                                x.invert();
                            factors.add(x);
                        });

                        //factor the power
                        var power_factors = new Factors();
                        symbol = __.Factor.powerFactor(symbol, power_factors);
                        power_factors.each(function (x) {
                            if(sign < 0)
                                x.invert();
                            factors.add(x);
                        });

                        if(!multiVar) {
                            //pass in vars[0] for safety
                            var v = vars[0];

                            symbol = __.Factor.squareFree(symbol, factors, v);

                            var t_factors = new Factors();

                            symbol = __.Factor.trialAndError(symbol, t_factors, v);

                            //generate a symbol based off the last factors
                            var tf_symbol = t_factors.toSymbol();
                            //if nothing was factored then return the factors
                            if(tf_symbol.equals(untouched)) {
                                return tf_symbol;
                            }

                            for(var x in t_factors.factors) {
                                //store the current factor in t_factor
                                var t_factor = t_factors.factors[x];
                                factors.add(_.pow(t_factor, _.parse(p)));
                            }
                            //if we still don't have a factor and it's quadratic then let's just do a quad factor
                            if(symbol.equals(untouched)) {
                                symbol = __.Factor.quadFactor(symbol, factors);
                            }

                        }
                        else {
                            // Try sum and difference of cubes
                            symbol = __.Factor.cubeFactor(symbol, factors);

                            symbol = __.Factor.mfactor(symbol, factors);

                            //put back the sign of power
                            factors.each(function (x) {
                                if(sign < 0)
                                    x.power.negate();
                            });
                        }

                        //last minute clean up
                        symbol = _.parse(symbol, core.Utils.getFunctionsSubs(map));
                        
                        var addPower = factors.length === 1;
                        
                        factors.add(_.pow(symbol, _.parse(p)));

                        var retval = factors.toSymbol();
                        
                        // We may have only factored out the symbol itself so we end up with a factor of one 
                        // where the power needs to be placed back
                        // e.g. factor((2*y+p)^2). Here we end up having a factor of 1 remaining and a p of 2.
                        if(addPower && symbol.equals(1) && retval.isLinear()) {
                            retval = _.pow(retval, _.parse(p));
                        }
                        
                        return retval;
                    }

                    return symbol;
                }
                catch(e) {
                    //no need to stop the show because something went wrong :). Just return the unfactored.
                    return untouched;
                }
            },
            reduce: function (symbol, factors) {
                if(symbol.group === CP && symbol.length === 2) {
                    var symbols = symbol.collectSymbols().sort(function (a, b) {
                        return b.multiplier - a.multiplier;
                    });
                    if(symbols[0].power.equals(symbols[1].power)) {
                        //x^n-a^n
                        var n = _.parse(symbols[0].power),
                                a = symbols[0].clone().toLinear(),
                                b = symbols[1].clone().toLinear();

                        //apply rule: (a-b)*sum(a^(n-i)*b^(i-1),1,n)
                        factors.add(_.add(a.clone(), b.clone()));
                        //flip the sign
                        b.negate();
                        //turn n into a number
                        var nn = Number(n);
                        //the remainder
                        var result = new Symbol(0);
                        for(var i = 1; i <= nn; i++) {
                            var aa = _.pow(a.clone(), _.subtract(n.clone(), new Symbol(i))),
                                    bb = _.pow(b.clone(), _.subtract(new Symbol(i), new Symbol(1)));
                            result = _.add(result, _.multiply(aa, bb));
                        }
                        return result;
                    }
                }
                return symbol;
            },
            /**
             * Makes Symbol square free
             * @param {Symbol} symbol
             * @param {Factors} factors
             * @@param {String} variable The variable which is being factored 
             * @returns {[Symbol, Factor]}
             */
            squareFree: function (symbol, factors, variable) {
                if(symbol.isConstant() || symbol.group === S)
                    return symbol;

                var poly = new Polynomial(symbol, variable);
                var sqfr = poly.squareFree();
                var p = sqfr[2];
                //if we found a square then the p entry in the array will be non-unit
                if(p !== 1) {
                    //make sure the remainder doesn't have factors
                    var t = sqfr[1].toSymbol();
                    t.power = t.power.multiply(new Frac(p));
                    //send the factor to be fatored to be sure it's completely factored
                    factors.add(__.Factor.factor(t));

                    var retval = __.Factor.squareFree(sqfr[0].toSymbol(), factors);

                    return retval;
                }

                return symbol;
            },
            /**
             * Factors the powers such that the lowest power is a constant
             * @param {Symbol} symbol
             * @param {Factors} factors
             * @returns {[Symbol, Factor]}
             */
            powerFactor: function (symbol, factors) {
                //only PL need apply
                if(symbol.group !== PL || symbol.previousGroup === EX)
                    return symbol;
                var k = keys(symbol.symbols);
                //we expect only numeric powers so return all else
                if(!core.Utils.allNumeric(k))
                    return symbol;

                var d = core.Utils.arrayMin(k);
                var retval = new Symbol(0);
                var q = _.parse(symbol.value + '^' + d);
                symbol.each(function (x) {
                    x = _.divide(x, q.clone());
                    retval = _.add(retval, x);
                });

                factors.add(q);
                return retval;
            },
            /**
             * Removes GCD from coefficients
             * @param {Symbol} symbol
             * @param {Factor} factors
             * @returns {Symbol}
             */
            coeffFactor: function (symbol, factors) {
                if(symbol.isComposite()) {
                    var gcd = core.Math2.QGCD.apply(null, symbol.coeffs());

                    if(!gcd.equals(1)) {
                        symbol.each(function (x) {
                            if(x.isComposite()) {
                                x.each(function (y) {
                                    y.multiplier = y.multiplier.divide(gcd);
                                });
                            }
                            else
                                x.multiplier = x.multiplier.divide(gcd);
                        });
                        symbol.updateHash();
                    }
                    else {
                        // TODO: This should probably go to the prototype
                        var power = function (symbol) {
                            var p;
                            if(symbol.group === CB) {
                                p = 0;
                                symbol.each(function (x) {
                                    p += x.power;
                                });
                            }
                            else {
                                p = Number(symbol.power);
                            }
                            return p;
                        };
                        // Factor out negatives from the lead term
                        var terms = symbol.collectSymbols(null, null, null, true).sort(function (a, b) {
                            // Push constants to the back
                            if(a.isConstant(true))
                                return 1;
                            return b.power - a.power;
                        });

                        var LT = terms[0];

                        // Check if the LT is indeed the greatest
                        if(power(LT) > power(terms[1]) || terms[1].isConstant(true)) {
                            if(LT.multiplier.lessThan(0)) {
                                // Although the symbol should always be linear at this point, remove the negative for squares
                                // to be safe.
                                factors.add(new Symbol(-1));

                                symbol.each(function (x) {
                                    x.negate();
                                }, true);
                            }
                        }

                    }

                    if(factors) {
                        factors.add(new Symbol(gcd));
                    }
                }

                return symbol;
            },
            /**
             * The name says it all :)
             * @param {Symbol} symbol
             * @param {Factor} factors
             * @@param {String} variable 
             * @returns {Symbol}
             */
            trialAndError: function (symbol, factors, variable) {
                var untouched = symbol.clone();
                try {
                    // At temp holder for the factors. If all goes well then
                    // they'll be moved to the actual factors.
                    var factor_array = [];

                    if(symbol.isConstant() || symbol.group === S)
                        return symbol;
                    var poly = new Polynomial(symbol, variable),
                            cnst = poly.coeffs[0],
                            cfactors = core.Math2.ifactor(cnst),
                            roots = __.proots(symbol);
                    for(var i = 0; i < roots.length; i++) {
                        var r = roots[i],
                                p = 1;
                        if(!isNaN(r)) { //if it's a number
                            for(var x in cfactors) {
                                //check it's raised to a power
                                var n = core.Utils.round(Math.log(x) / Math.log(Math.abs(r)), 8);
                                if(isInt(n)) {
                                    r = x; //x must be the root since n gave us a whole
                                    p = n;
                                    break;
                                }
                            }
                            var root = new Frac(r),
                                    terms = [new Frac(root.num).negate()];
                            terms[p] = new Frac(root.den);
                            //convert to Frac. The den is coeff of LT and the num is coeff of constant
                            var div = Polynomial.fromArray(terms, poly.variable).fill(),
                                    t = poly.divide(div);
                            if(t[1].equalsNumber(0)) { //if it's zero we have a root and divide it out
                                poly = t[0];
                                // factors.add(div.toSymbol());
                                factor_array.push(div.toSymbol());
                            }
                        }
                    }

                    if(!poly.equalsNumber(1)) {
                        poly = __.Factor.search(poly, factors);
                    }

                    // Move the factors over since all went well.
                    factor_array.forEach(function (x) {
                        factors.add(x);
                    });

                    return poly.toSymbol();
                }
                catch(e) {
                    return untouched;
                }
            },
            search: function (poly, factors, base) {
                base = base || 10; //I like 10 because numbers exhibit similar behaviours at 10
                var v = poly.variable; //the polynmial variable name
                /**
                 * Attempt to remove a root by division given a number by first creating
                 * a polynomial fromt he given information
                 * @param {int} c1 - coeffient for the constant
                 * @param {int} c2 - coefficient for the LT
                 * @param {int} n - the number to be used to construct the polynomial
                 * @param {int} p - the power at which to create the polynomial
                 * @returns {null|Polynomial} - returns polynomial if successful otherwise null
                 */
                var check = function (c1, c2, n, p) {
                    var candidate = Polynomial.fit(c1, c2, n, base, p, v);
                    if(candidate && candidate.coeffs.length > 1) {
                        var t = poly.divide(candidate);
                        if(t[1].equalsNumber(0)) {
                            factors.add(candidate.toSymbol());
                            return [t[0], candidate];
                        }
                    }
                    return null;
                };
                var cnst = poly.coeffs[0];
                var cfactors = core.Math2.ifactor(cnst);
                var lc = poly.lc();
                var ltfactors = core.Math2.ifactor(lc);
                var subbed = poly.sub(base);
                var isubbed = core.Math2.ifactor(subbed);
                var nfactors = __.Factor.mix(isubbed, subbed < 0);
                var cp = Math.ceil(poly.coeffs.length / 2);
                var lc_is_neg = lc.lessThan(0);
                var cnst_is_neg = cnst.lessThan(0);
                ltfactors['1'] = 1;
                cfactors['1'] = 1;
                while(cp--) {
                    for(var x in ltfactors) {
                        for(var y in cfactors) {
                            for(var i = 0; i < nfactors.length; i++) {
                                var factor_found = check(x, y, nfactors[i], cp);
                                if(factor_found) {
                                    poly = factor_found[0];
                                    if(!core.Utils.isPrime(poly.sub(base)))
                                        poly = __.Factor.search(poly, factors);
                                    return poly;
                                }
                                else if(!factor_found) {
                                    if(lc_is_neg && cnst_is_neg)
                                        factor_found = check(-x, -y, nfactors[i], cp);
                                    else if(lc_is_neg)
                                        factor_found = check(-x, y, nfactors[i], cp); //check a negative lc
                                    else if(cnst_is_neg)
                                        factor_found = check(x, -y, nfactors[i], cp); //check a negative constant
                                }
                            }
                        }
                    }
                }
                return poly;
            },
            /**
             * Equivalent of square free factor for multivariate polynomials
             * @param {type} symbol
             * @param {type} factors
             * @returns {AlgebraL#18.Factor.mSqfrFactor.symbol|Array|AlgebraL#18.__.Factor.mSqfrFactor.d}
             */
            mSqfrFactor: function (symbol, factors) {
                if(symbol.group !== FN) {
                    var vars = variables(symbol).reverse();

                    // Loop through all the variable and remove the partial derivatives
                    for(var i = 0; i < vars.length; i++) {
                        do {
                            if(vars[i] === symbol.value) {
                                //the derivative tells us nothing since this symbol is already the factor
                                factors.add(symbol);
                                symbol = new Symbol(1);
                                continue;
                            }

                            var diff = core.Calculus.diff(symbol, vars[i]);

                            var d = __.Factor.coeffFactor(diff);

                            if(d.equals(0))
                                break;

                            //trial division to see if factors have whole numbers. 
                            //This can be optimized by stopping as soon as can_divide is false
                            //this will also need utilize big number at some point
                            var can_divide = true;
                            if(d.isConstant() && symbol.isComposite()) {
                                //check the coefficients

                                symbol.each(function (x) {
                                    if(x.multiplier % d !== 0)
                                        can_divide = false;
                                }, true);
                            }

                            //if we can divide then do so
                            if(can_divide) {

                                var div = __.div(symbol, d.clone()),
                                        is_factor = div[1].equals(0);
                                
                                // Break infinite loop for factoring e^t*x-1
                                if((symbol.equals(div[0]) && div[1].equals(0))) {
                                    break;
                                }
                                
                                if(div[0].isConstant()) {
                                    factors.add(div[0]);
                                    break;
                                }
                                
                            }
                            else
                                is_factor = false;

                            if(is_factor) {
                                factors.add(div[0]);
                                symbol = d;
                            }
                        }
                        while(is_factor)
                    }
                }

                return symbol;
            },
            //difference of squares factorization
            sqdiff: function (symbol, factors) {
                if(symbol.isConstant('all')) {
                    // Nothing to do
                    return symbol;
                }

                try {
                    var remove_square = function (x) {
                        return core.Utils.block('POSITIVE_MULTIPLIERS', function () {
                            return Symbol.unwrapPARENS(math.sqrt(math.abs(x)));
                        }, true);
                    };
                    var separated = core.Utils.separate(symbol.clone());

                    var obj_array = [];

                    //get the unique variables
                    for(var x in separated) {
                        if(x !== 'constants') {
                            obj_array.push(separated[x]);
                        }
                    }
                    obj_array.sort(function (a, b) {
                        return b.power - a.power;
                    });

                    //if we have the same number of variables as unique variables then we can apply the difference of squares
                    if(obj_array.length === 2) {
                        var a, b;
                        a = obj_array.pop();
                        b = obj_array.pop();

                        if(even(a.power) && even(b.power)
                                && a.sign() === b.sign()
                                && a.group === S && b.group === S) {
                            throw new Error('Unable to factor');
                        }
                        ;

                        if(a.isComposite() && b.power.equals(2)) {
                            //remove the square from b
                            b = remove_square(b);
                            var f = __.Factor.factor(_.add(a, separated.constants));
                            if(f.power.equals(2)) {
                                f.toLinear();
                                factors.add(_.subtract(f.clone(), b.clone()));
                                factors.add(_.add(f, b));
                                symbol = new Symbol(1);
                            }
                        }
                        else {
                            a = a.powSimp();
                            b = b.powSimp();

                            if((a.group === S || a.fname === '') && a.power.equals(2) && (b.group === S || b.fname === '') && b.power.equals(2) && !separated.constants) {
                                if(a.multiplier.lessThan(0)) {
                                    var t = b;
                                    b = a;
                                    a = t;
                                }
                                if(a.multiplier.greaterThan(0)) {
                                    a = remove_square(a);
                                    b = remove_square(b);
                                }

                                factors.add(_.subtract(a.clone(), b.clone()));
                                factors.add(_.add(a, b));
                                symbol = new Symbol(1);
                            }
                        }
                    }
                }
                catch(e) {
                    ;
                }

                return symbol;
            },
            //factoring for multivariate
            mfactor: function (symbol, factors) {

                if(symbol.group === FN) {
                    if(symbol.fname === 'sqrt') {
                        var factors2 = new Factors(),
                                arg = __.Factor.common(symbol.args[0].clone(), factors2);
                        arg = __.Factor.coeffFactor(arg, factors2);
                        symbol = _.multiply(_.symfunction('sqrt', [arg]), _.parse(symbol.multiplier));
                        factors2.each(function (x) {
                            symbol = _.multiply(symbol, _.parse(core.Utils.format('sqrt({0})', x)));
                        });
                    }
                    else
                        factors.add(symbol);
                }
                else {

                    //square free factorization
                    symbol = __.Factor.mSqfrFactor(symbol, factors);

                    //try factor out common factors
                    //symbol = __.Factor.common(symbol, factors);

                    var vars = variables(symbol),
                            symbols = symbol.collectSymbols().map(function (x) {
                        return Symbol.unwrapSQRT(x);
                    }),
                            sorted = {},
                            maxes = {},
                            l = vars.length, n = symbols.length;
                    //take all the variables in the symbol and organize by variable name
                    //e.g. a^2+a^2+b*a -> {a: {a^3, a^2, b*a}, b: {b*a}}

                    for(var i = 0; i < l; i++) {
                        var v = vars[i];
                        sorted[v] = new Symbol(0);
                        for(var j = 0; j < n; j++) {
                            var s = symbols[j];
                            if(s.contains(v)) {
                                var p = s.value === v ? s.power.toDecimal() : s.symbols[v].power.toDecimal();
                                if(!maxes[v] || p < maxes[v])
                                    maxes[v] = p;
                                sorted[v] = _.add(sorted[v], s.clone());
                            }
                        }
                    }

                    for(var x in sorted) {
                        var r = _.parse(x + '^' + maxes[x]);
                        var div = _.divide(sorted[x], r);
                        var new_factor = _.expand(div);

                        if(new_factor.equals(1))
                            break; //why divide by one. Just move 
                        var divided = __.div(symbol.clone(), new_factor);

                        if(divided[0].equals(0)) {
                            //cant factor anymore
                            break;
                        }

                        // We potentially ended up with fractional coefficients when the
                        // trial division was performed. We need to remove 
                        // This check will more then likely become superfluous with improvements
                        // to polynomial division
                        if(divided[1].equals(0)) {
                            var has_fractions = false;

                            divided[0].each(function (x) {
                                if(!isInt(x.multiplier)) {
                                    has_fractions = true;
                                }
                            });

                            // The factor isn't really a factor and needs to be put back
                            if(has_fractions) {
                                divided[1] = _.expand(_.multiply(divided[1], new_factor));
                                // Since the new factor is not just one, we exit.
                                break;
                            }
                        }

                        var neg_numeric_factor = isInt(new_factor) && new_factor.lessThan(0);

                        if(divided[1].equals(0) && !neg_numeric_factor) { //we found at least one factor

                            //factors.add(new_factor);
                            var d = __.div(symbol.clone(), divided[0].clone());
                            var r = d[0];

                            // Nothing left to do since we didn't get a reduction
                            if(r.equals(0)) {
                                return symbol;
                            }

                            symbol = d[1];
                            //we don't want to just flip the sign. If the remainder is -1 then we accomplished nothing
                            //and we just return the symbol;
                            //If r equals zero then there's nothing left to do so we're done

                            if(r.equals(-1) && !symbol.equals(0))
                                return symbol;

                            var factor = divided[0];

                            if(symbol.equals(factor)) {
                                var rem = __.Factor.reduce(factor, factors);

                                if(!symbol.equals(rem))
                                    return __.Factor.mfactor(rem, factors);

                                return rem;
                            }
                            else {
                                factors.add(factor);
                                //if the remainder of the symbol is zero then we're done. TODO: Rethink this logic a bit.
                                if(symbol.equals(0))
                                    return r;
                            }

                            if(r.isConstant('all')) {
                                factors.add(r);
                                return r;
                            }

                            return __.Factor.mfactor(r, factors);
                        }
                    }

                }

                //difference of squares factorization
                symbol = __.Factor.sqdiff(symbol, factors);

                //factors by fishing for zeroes
                symbol = __.Factor.zeroes(symbol, factors);

                return symbol;
            }
        },
        /**
         * Checks to see if a set of "equations" is linear. 
         * @param {type} set
         * @returns {Boolean}
         */
        allLinear: function (set) {
            var l = set.length;
            for(var i = 0; i < l; i++) {
                if(!__.isLinear(set[i]))
                    return false;
            }
            return true;
        },
        /*
         * Checks to see if the "equation" is linear
         * @param {Symbol} e
         * @returns {boolean}
         */
        isLinear: function (e) {
            var status = false, g = e.group;
            if(g === PL || g === CP) {
                status = true;
                for(var s in e.symbols) {
                    var symbol = e.symbols[s], sg = symbol.group;
                    if(sg === FN || sg === EX) {
                        status = false;
                    }
                    if(sg === CB) {
                        //needs further checking since it might be imaginary
                        status = variables(symbol).length === 1;
                    }
                    else {
                        if(sg === PL || sg === CP)
                            status = __.isLinear(symbol);
                        else {
                            if(symbol.group !== N && symbol.power.toString() !== '1') {
                                status = false;
                                break;
                            }
                        }
                    }
                }
            }
            else if(g === S && e.power === 1)
                status = true;
            return status;
        },
        gcd: function () {
            var args;
            if(arguments.length === 1 && arguments[0] instanceof core.Vector)
                args = arguments[0].elements;
            else
                args = core.Utils.arguments2Array(arguments);

            //short-circuit early
            if(args.length === 0)
                return new Symbol(1);
            else if(args.length === 1)
                return args[0];

            var appeared = [], evaluate = false;
            for(var i = 0; i < args.length; i++) {
                if(args[i].group === FN && args[i].fname === 'gcd')
                {
                    //compress gcd(a,gcd(b,c)) into gcd(a,b,c)
                    args = args.concat(arguments[i].args);
                    //do not keep gcd in args
                    args.splice(i, 1);
                }
                else
                {
                    //Look if there are any common variables such that
                    //gcd(a,b) => gcd(a,b); gcd(a,a) => a
                    var vars = variables(args[i]);
                    if(core.Utils.haveIntersection(vars, appeared))
                    {
                        //Ok, there are common variables
                        evaluate = true;
                        break;
                    }
                    else
                        appeared = appeared.concat(vars);
                }
            }

            //appeared.length is 0 when all arguments are group N
            if(evaluate || appeared.length === 0) {
                //TODO: distribute exponent so that (a^-1*b^-1)^-1 => a*b
                if(args.every(function (symbol) {
                    return symbol.getDenom().equals(1)
                })) {
                    var aggregate = args[0];

                    for(var i = 1; i < args.length; i++) {
                        aggregate = __.gcd_(args[i], aggregate);
                    }
                    return aggregate;
                }
                else {
                    //gcd_ cannot handle denominators correctly
                    return _.divide(__.gcd.apply(null, args.map(function (symbol) {
                        return symbol.getNum();
                    })),
                            __.lcm.apply(null, args.map(function (symbol) {
                                return symbol.getDenom();
                            })));
                }
            }
            else
                return _.symfunction('gcd', args);
        },
        gcd_: function (a, b) {
            if(a.group === FN || a.group === P)
                a = core.Utils.block('PARSE2NUMBER', function () {
                    return _.parse(a);
                });

            if(b.group === FN)
                b = core.Utils.block('PARSE2NUMBER', function () {
                    return _.parse(b);
                });

            if(a.isConstant() && b.isConstant()) {
                // return core.Math2.QGCD(new Frac(+a), new Frac(+b));
                return new Symbol(core.Math2.QGCD(new Frac(+a), new Frac(+b)));
            }

            var den = _.multiply(a.getDenom() || new Symbol(1), b.getDenom() || new Symbol(1)).invert();
            a = _.multiply(a.clone(), den.clone());
            b = _.multiply(b.clone(), den.clone());

            //feels counter intuitive but it works. Issue #123 (nerdamer("gcd(x+y,(x+y)^2)"))
            a = _.expand(a);
            b = _.expand(b);

            if(a.group === CB || b.group === CB) {
                var q = _.divide(a.clone(), b.clone()); //get the quotient
                var t = _.multiply(b.clone(), q.getDenom().invert());//multiply by the denominator
                //if they have a common factor then the result will not equal one 
                if(!t.equals(1))
                    return t;
            }

            //just take the gcd of each component when either of them is in group EX
            if(a.group === EX || b.group === EX)
            {
                var gcd_m = new Symbol(core.Math2.GCD(a.multiplier, b.multiplier));
                var gcd_v = __.gcd_(a.value === CONST_HASH ? new Symbol(1) : _.parse(a.value), b.value === CONST_HASH ? new Symbol(1) : _.parse(b.value));
                var gcd_p = __.gcd_(_.parse(a.power), _.parse(b.power));
                return _.multiply(gcd_m, _.pow(gcd_v, gcd_p));
            }

            if(a.length < b.length) { //swap'm
                var t = a;
                a = b;
                b = t;
            }
            var vars_a = variables(a), vars_b = variables(b);
            if((vars_a.length === vars_b.length && vars_a.length === 1 && vars_a[0] === vars_b[0])
                    || vars_a.length === 1 && vars_b.length === 0
                    || vars_a.length === 0 && vars_b.length === 1) {
                a = new Polynomial(a);
                b = new Polynomial(b);
                return _.divide(a.gcd(b).toSymbol(), den);
            }
            else {
                //get the gcd of the multipiers
                //get rid of gcd in coeffs
                var multipliers = [];
                a.each(function (x) {
                    multipliers.push(x.multiplier);
                });
                b.each(function (x) {
                    multipliers.push(x.multiplier);
                });

                var T;
                while(!b.equals(0)) {
                    var t = b.clone();
                    a = a.clone();
                    T = __.div(a, t);

                    b = T[1];
                    if(T[0].equals(0)) {
                        //return _.multiply(new Symbol(core.Math2.QGCD(a.multiplier, b.multiplier)), b);
                        return _.divide(new Symbol(core.Math2.QGCD(a.multiplier, b.multiplier)), den);
                    }
                    a = t;
                }

                var gcd = core.Math2.QGCD.apply(undefined, multipliers);

                if(!gcd.equals(1)) {
                    a.each(function (x) {
                        x.multiplier = x.multiplier.divide(gcd);
                    });
                }

                //return symbolic function for gcd in indeterminate form
                if(a.equals(1) && !a.isConstant() && !b.isConstant())
                    return _.divide(_.symfunction('gcd', arguments), den);

                return _.divide(a, den);
            }
        },
        lcm: function () {
            //https://math.stackexchange.com/a/319310
            //generalization of the 2-variable formula of lcm

            var args;
            if(arguments.length === 1)
                if(arguments[0] instanceof core.Vector)
                    args = arguments[0].elements;
                else
                    _.error('lcm expects either 1 vector or 2 or more arguments');
            else
                args = core.Utils.arguments2Array(arguments);

            //product of all arguments
            //start with new Symbol(1) so that prev.clone() which makes unnessesary clones can be avoided
            var numer = args.reduce(function (prev, curr) {
                return _.multiply(prev, curr.clone())
            }, new Symbol(1));

            //gcd of complementary terms
            var denom_args =
                    //https://stackoverflow.com/a/18223072
                //take all complementary terms, e.g.
                //[a,b,c] => [a*b, b*c, a*c]
                //[a,b,c,d] => [a*b*c, a*b*d, a*c*d, b*c*d]
                (function (input, size) {
                        size = Number(size);
                        var results = [], result, mask, i, total = Math.pow(2, input.length);
                        for(mask = size; mask < total; mask++) {
                            result = [];
                            i = input.length - 1;

                            do {
                                if((mask & (1 << i)) !== 0) {
                                    result.push(input[i]);
                                }
                            }
                            while(i--);

                            if(result.length === size) {
                                results.push(result);
                            }
                        }
                        return results;
                        //start with new Symbol(1) so that prev.clone() which makes unnessesary clones can be avoided
                    })(arguments, arguments.length - 1).map(function (x) {
                return x.reduce(function (prev, curr) {
                    return _.multiply(prev, curr.clone())
                }, new Symbol(1))
            });

            var denom;
            //don't eat the gcd term if all arguments are symbols
            if(args.every(function (x) {
                return core.Utils.isVariableSymbol(x)
            }))
                denom = _.symfunction('gcd', core.Utils.arrayUnique(denom_args));
            else
                denom = __.gcd.apply(null, denom_args);
            //divide product of all arguments by gcd of complementary terms
            var div = _.divide(numer, denom);
            return div;
        },
        /**
         * Divides one expression by another
         * @param {Symbol} symbol1
         * @param {Symbol} symbol2
         * @returns {Array}
         */
        divide: function (symbol1, symbol2) {
            var result, remainder, factored, den;
            factored = core.Algebra.Factor.factor(symbol1.clone());
            den = factored.getDenom();
            if(!den.isConstant('all')) {
                symbol1 = _.expand(Symbol.unwrapPARENS(_.multiply(factored, den.clone())));
            }
            else
                //reset the denominator since we're not dividing by it anymore
                den = new Symbol(1);
            result = __.div(symbol1, symbol2);
            remainder = _.divide(result[1], symbol2);
            return _.divide(_.add(result[0], remainder), den);
        },
        div: function (symbol1, symbol2) {
            // If all else fails then assume that division failed with
            // a remainder of zero and the original quotient
            var fail = [new Symbol(0), symbol1.clone()];

            try {

                // Division by constants
                if(symbol2.isConstant('all')) {
                    symbol1.each(function (x) {
                        x.multiplier = x.multiplier.divide(symbol2.multiplier);
                    });
                    return [symbol1, new Symbol(0)];
                }
                // So that factorized symbols don't affect the result
                symbol1 = _.expand(symbol1);
                symbol2 = _.expand(symbol2);
                // Special case. May need revisiting
                if(symbol1.group === S && symbol2.group === CP) {
                    var x = symbol1.value;
                    var f = core.Utils.decompose_fn(symbol2.clone(), x, true);
                    if(symbol1.isLinear() && f.x && f.x.isLinear() && symbol2.isLinear()) {
                        var k = Symbol.create(symbol1.multiplier);
                        return [_.divide(k.clone(), f.a.clone()), _.divide(_.multiply(k, f.b), f.a).negate()];
                    }
                }
                if(symbol1.group === S && symbol2.group === S) {
                    var r = _.divide(symbol1.clone(), symbol2.clone());
                    if(r.isConstant()) //we have a whole
                        return [r, new Symbol(0)];
                    return [new Symbol(0), symbol1.clone()];
                }
                var symbol1_has_func = symbol1.hasFunc(),
                        symbol2_has_func = symbol2.hasFunc(),
                        parse_funcs = false;

                //substitute out functions so we can treat them as regular variables
                if(symbol1_has_func || symbol2_has_func) {
                    parse_funcs = true;
                    var map = {},
                            symbol1 = _.parse(core.Utils.subFunctions(symbol1, map)),
                            symbol2 = _.parse(core.Utils.subFunctions(symbol2, map)),
                            subs = core.Utils.getFunctionsSubs(map);
                }
                //get a list of the variables
                var vars = core.Utils.arrayUnique(variables(symbol1).concat(variables(symbol2))),
                        quot, rem;

                //treat imaginary numbers as variables
                if(symbol1.isImaginary() || symbol2.isImaginary()) {
                    vars.push(core.Settings.IMAGINARY);
                }

                if(vars.length === 1) {
                    var q = new Polynomial(symbol1).divide(new Polynomial(symbol2));
                    quot = q[0].toSymbol();
                    rem = q[1].toSymbol();
                }
                else {
                    vars.push(CONST_HASH); //this is for the numbers
                    var reconvert = function (arr) {
                        var symbol = new Symbol(0);
                        for(var i = 0; i < arr.length; i++) {
                            var x = arr[i].toSymbol();
                            symbol = _.add(symbol, x);
                        }
                        return symbol;
                    };

                    // Silly Martin. This is why you document. I don't remember now
                    var get_unique_max = function (term, any) {
                        var max = Math.max.apply(null, term.terms),
                                count = 0, idx;

                        if(!any) {
                            for(var i = 0; i < term.terms.length; i++) {
                                if(term.terms[i].equals(max)) {
                                    idx = i;
                                    count++;
                                }
                                if(count > 1)
                                    return;
                            }
                        }
                        if(any) {
                            for(i = 0; i < term.terms.length; i++)
                                if(term.terms[i].equals(max)) {
                                    idx = i;
                                    break;
                                }
                        }
                        return [max, idx, term];
                    };

                    // Tries to find an LT in the dividend that will satisfy division
                    var get_det = function (s, lookat) {
                        lookat = lookat || 0;
                        var det = s[lookat], l = s.length;
                        if(!det)
                            return;
                        //eliminate the first term if it doesn't apply
                        var umax = get_unique_max(det);
                        for(var i = lookat + 1; i < l; i++) {
                            var term = s[i],
                                    is_equal = det.sum.equals(term.sum);
                            if(!is_equal && umax) {
                                break;
                            }
                            if(is_equal) {
                                // Check the differences of their maxes. The one with the biggest difference governs
                                // e.g. x^2*y^3 vs x^2*y^3 is unclear but this isn't the case in x*y and x^2
                                var max1, max2, idx1, idx2, l2 = det.terms.length;
                                for(var j = 0; j < l2; j++) {
                                    var item1 = det.terms[j], item2 = term.terms[j];
                                    if(typeof max1 === 'undefined' || item1.greaterThan(max1)) {
                                        max1 = item1;
                                        idx1 = j;
                                    }
                                    if(typeof max2 === 'undefined' || item2.greaterThan(max2)) {
                                        max2 = item2;
                                        idx2 = j;
                                    }
                                }
                                //check their differences
                                var d1 = max1.subtract(term.terms[idx1]),
                                        d2 = max2.subtract(det.terms[idx2]);
                                if(d2 > d1) {
                                    umax = [max2, idx2, term];
                                    break;
                                }
                                if(d1 > d2) {
                                    umax = [max1, idx1, det];
                                    break;
                                }
                            }
                            else {
                                //check if it's a suitable pick to determine the order
                                umax = get_unique_max(term);
                                //if(umax) return umax;
                                if(umax)
                                    break;
                            }
                            umax = get_unique_max(term); //calculate a new unique max
                        }

                        //if still no umax then any will do since we have a tie
                        if(!umax)
                            return get_unique_max(s[0], true);
                        var e, idx;
                        for(var i = 0; i < s2.length; i++) {
                            var cterm = s2[i].terms;
                            //confirm that this is a good match for the denominator
                            idx = umax[1];
                            if(idx === cterm.length - 1)
                                return;
                            e = cterm[idx];
                            if(!e.equals(0))
                                break;
                        }
                        if(e.equals(0))
                            return get_det(s, ++lookat); //look at the next term

                        return umax;
                    };

                    var t_map = core.Utils.toMapObj(vars);
                    var init_sort = function (a, b) {
                        return b.sum.subtract(a.sum);
                    };
                    var is_larger = function (a, b) {
                        if(!a || !b)
                            return false; //it's empty so...
                        for(var i = 0; i < a.terms.length; i++) {
                            if(a.terms[i].lessThan(b.terms[i]))
                                return false;
                        }
                        return true;
                    };

                    var s1 = symbol1.tBase(t_map).sort(init_sort),
                            s2 = symbol2.tBase(t_map).sort(init_sort);
                    var target = is_larger(s1[0], s2[0]) && s1[0].count > s2[0].count ? s2 : s1; //since the num is already larger than we can get the det from denom
                    var det = get_det(target);//we'll begin by assuming that this will let us know which term 
                    var quotient = [];
                    if(det) {
                        var lead_var = det[1];
                        var can_divide = function (a, b) {
                            if(a[0].sum.equals(b[0].sum))
                                return a.length >= b.length;
                            return true;
                        };

                        var try_better_lead_var = function (s1, s2, lead_var) {
                            var checked = [];
                            for(var i = 0; i < s1.length; i++) {
                                var t = s1[i];
                                for(var j = 0; j < t.terms.length; j++) {
                                    var cf = checked[j], tt = t.terms[j];
                                    if(i === 0)
                                        checked[j] = tt; //add the terms for the first one
                                    else if(cf && !cf.equals(tt))
                                        checked[j] = undefined;
                                }
                            }
                            for(var i = 0; i < checked.length; i++) {
                                var t = checked[i];
                                if(t && !t.equals(0))
                                    return i;
                            }
                            return lead_var;
                        };
                        var sf = function (a, b) {
                            var l1 = a.len(), l2 = b.len();
                            var blv = b.terms[lead_var], alv = a.terms[lead_var];
                            if(l2 > l1 && blv.greaterThan(alv))
                                return l2 - l1;
                            return blv.subtract(alv);
                        };

                        //check to see if there's a better lead_var
                        lead_var = try_better_lead_var(s1, s2, lead_var);
                        //reorder both according to the max power
                        s1.sort(sf); //sort them both according to the leading variable power
                        s2.sort(sf);

                        //try to adjust if den is larger
                        var fdt = s2[0], fnt = s1[0];

                        var den = new MVTerm(new Frac(1), [], fnt.map);
                        if(fdt.sum.greaterThan(fnt.sum) && fnt.len() > 1) {
                            for(var i = 0; i < fnt.terms.length; i++) {
                                var d = fdt.terms[i].subtract(fnt.terms[i]);
                                if(!d.equals(0)) {
                                    var nd = d.add(new Frac(1));
                                    den.terms[i] = d;
                                    for(var j = 0; j < s1.length; j++) {
                                        s1[j].terms[i] = s1[j].terms[i].add(nd);
                                    }
                                }
                                else
                                    den.terms[i] = new Frac(0);
                            }
                        }

                        var dividend_larger = is_larger(s1[0], s2[0]);

                        var safety = 0;
                        var max = 200;

                        while(dividend_larger && can_divide(s1, s2)) {
                            if(safety++ > max) {
                                throw new core.exceptions.InfiniteLoopError('Unable to compute!');
                            }

                            var q = s1[0].divide(s2[0]);

                            quotient.push(q); //add what's divided to the quotient
                            s1.shift();//the first one is guaranteed to be gone so remove from dividend
                            for(var i = 1; i < s2.length; i++) { //loop through the denominator
                                var t = s2[i].multiply(q).generateImage(),
                                        l2 = s1.length;
                                //if we're subtracting from 0
                                if(l2 === 0) {
                                    t.coeff = t.coeff.neg();
                                    s1.push(t);
                                    s1.sort(sf);
                                }

                                for(var j = 0; j < l2; j++) {
                                    var cur = s1[j];
                                    if(cur.getImg() === t.getImg()) {
                                        cur.coeff = cur.coeff.subtract(t.coeff);
                                        if(cur.coeff.equals(0)) {
                                            core.Utils.remove(s1, j);
                                            j--; //adjust the iterator
                                        }
                                        break;
                                    }
                                    if(j === l2 - 1) {
                                        t.coeff = t.coeff.neg();
                                        s1.push(t);
                                        s1.sort(sf);
                                    }
                                }
                            }
                            dividend_larger = is_larger(s1[0], s2[0]);

                            if(!dividend_larger && s1.length >= s2.length) {
                                //One more try since there might be a terms that is larger than the LT of the divisor
                                for(var i = 1; i < s1.length; i++) {
                                    dividend_larger = is_larger(s1[i], s2[0]);
                                    if(dividend_larger) {
                                        //take it from its current position and move it to the front
                                        s1.unshift(core.Utils.remove(s1, i));
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    quot = reconvert(quotient);
                    rem = reconvert(s1);

                    if(typeof den !== 'undefined') {
                        den = den.toSymbol();
                        quot = _.divide(quot, den.clone());
                        rem = _.divide(rem, den);
                    }
                }

                //put back the functions
                if(parse_funcs) {
                    quot = _.parse(quot.text(), subs);
                    rem = _.parse(rem.text(), subs);
                }

                return [quot, rem];
            }
            catch(e) {
                return fail;
            }

        },
        line: function (v1, v2, x) {
            if(core.Utils.isArray(v1))
                v1 = core.Utils.convertToVector(v1);
            if(core.Utils.isArray(v2))
                v2 = core.Utils.convertToVector(v2);
            x = _.parse(x || 'x');
            if(!core.Utils.isVector(v1) || !core.Utils.isVector(v2))
                _.error('Line expects a vector! Received "' + v1 + '" & "' + v2 + '"');
            var dx = _.subtract(v2.e(1).clone(), v1.e(1).clone()),
                    dy = _.subtract(v2.e(2).clone(), v1.e(2).clone()),
                    m = _.divide(dy, dx),
                    a = _.multiply(x, m.clone()),
                    b = _.multiply(v1.e(1).clone(), m);
            return _.add(_.subtract(a, b), v1.e(2).clone());
        },
        PartFrac: {
            createTemplate: function (den, denom_factors, f_array, v) {
                //clean up the denominator function by factors so it reduces nicely
                den = __.Factor.factor(den);

                //clean up factors. This is so inefficient but factors are wrapped in parens for safety
                den.each(function (x, key) {
                    if(x.group === FN && x.fname === '' && x.args[0].group === S) {
                        var y = x.args[0];
                        if(this.symbols) {
                            delete this.symbols[key];
                            this.symbols[y.value] = y;
                        }
                        else {
                            den = x.args[0];
                        }
                    }
                });

                var factors, factors_vec, f, p, deg, degrees, m;
                factors = denom_factors.collectFactors();
                factors_vec = []; //a vector for the template
                degrees = [];
                m = new Symbol(1);

                for(var i = 0; i < factors.length; i++) { //loop through the factors
                    var factor = Symbol.unwrapPARENS(factors[i]);
                    //if in he for P^n where P is polynomial and n = integer
                    if(factor.power.greaterThan(1)) {
                        p = Number(factor.power);
                        f = factor.clone().toLinear(); //remove the power so we have only the function
                        deg = Number(__.degree(f, v)); //get the degree of f
                        //expand the factor
                        for(var j = 0; j < p; j++) {
                            var efactor = _.pow(f.clone(), new Symbol(j + 1));
                            f_array.push(efactor.clone());
                            var d = _.divide(den.clone(), efactor.clone());
                            degrees.push(deg);
                            factors_vec.push(d);
                        }
                    }
                    /*
                     Possible bug.
                     Removed: causes 1/(20+24*x+4*x^2) to result in (-1/64)*(5+x)^(-1)+(1/64)*(1+x)^(-1)
                     else if(factor.isConstant('all')) {
                     m = _.multiply(m, factor);
                     }
                     */
                    else {
                        //get the degree of the factor so we tack it on tot he factor. This should probably be an array
                        //but for now we note it on the symbol
                        deg = Number(__.degree(factor, v));
                        f_array.push(factor);
                        var d = _.divide(den.clone(), factor.clone());
                        d = _.expand(Symbol.unwrapPARENS(d));
                        degrees.push(deg);
                        factors_vec.push(d);
                    }
                }
                //put back the constant
                f_array = f_array.map(function (x) {
                    return _.multiply(x, m.clone());
                });
                return [f_array, factors_vec, degrees];
            },
            partfrac: function (symbol, v, as_array) {

                var vars = variables(symbol);

                v = v || _.parse(vars[0]); //make wrt optional and assume first variable
                try {
                    var num, den, factors, tfactors, ofactors, nterms, degrees,
                            dterms, max, M, c, powers, div, r, factors_vec, ks,
                            template, tfactors;
                    num = _.expand(symbol.getNum());
                    den = _.expand(symbol.getDenom().toUnitMultiplier());
                    //move the entire multipier to the numerator
                    num.multiplier = symbol.multiplier;
                    //we only have a meaningful change if n factors > 1. This means that
                    //the returned group will be a CB
                    //collect the terms wrt the x
                    nterms = num.groupTerms(v);
                    //divide out wholes if top is larger
                    if(Number(__.degree(num, v)) >= Number(__.degree(den, v))) {
                        div = __.div(num.clone(), _.expand(den.clone()));
                        r = div[0]; //remove the wholes
                        num = div[1]; //work with the remainder
                        nterms = num.groupTerms(v); //recalculate the nterms
                    }
                    else
                        r = new Symbol(0);

                    if(Number(__.degree(den, v)) === 1) {
                        var q = _.divide(num, den);
                        if(as_array)
                            return [r, q];
                        return _.add(r, q);
                    }
                    //first factor the denominator. This means that the strength of this
                    //algorithm depends on how well we can factor the denominator. 
                    ofactors = __.Factor.factor(den);
                    //create the template. This method will create the template for solving 
                    //the partial fractions. So given x/(x-1)^2 the template creates A/(x-1)+B/(x-1)^2
                    template = __.PartFrac.createTemplate(den.clone(), ofactors, [], v);
                    tfactors = template[0]; //grab the factors
                    factors_vec = template[1]; //grab the factor vectors
                    degrees = template[2]; //grab the degrees
                    //make note of the powers of each term
                    powers = [nterms.length];
                    //create the dterms vector
                    dterms = [];
                    factors = [];
                    ks = [];
                    var factor, deg;
                    factors_vec.map(function (x, idx) {
                        factor = tfactors[idx];
                        deg = degrees[idx];
                        for(var i = 0; i < deg; i++) {
                            factors.push(factor.clone());
                            var k = Symbol.create(v, i);
                            var t = _.expand(_.multiply(x, k.clone())).groupTerms(v);
                            //make a note of the power which corresponds to the length of the array
                            var p = t.length;
                            powers.push(p);
                            dterms.push(t);
                            ks.push(k.clone());
                        }
                    });
                    //get the max power
                    max = core.Utils.arrayMax(powers);

                    //fill the holes and create a matrix
                    c = new core.Matrix(core.Utils.fillHoles(nterms, max)).transpose();
                    //for each of the factors we do the same
                    M = new core.Matrix();
                    for(var i = 0; i < dterms.length; i++) {
                        M.elements.push(core.Utils.fillHoles(dterms[i], max));
                    }

                    //solve the system of equations
                    var partials = _.multiply(M.transpose().invert(), c);
                    //the results are backwards to reverse it
                    //partials.elements.reverse();
                    //convert it all back
                    var retval = as_array ? [r] : r;
                    partials.each(function (e, i) {
                        var term = _.multiply(ks[i], _.divide(e, factors[i]));
                        if(as_array)
                            retval.push(term);
                        else
                            retval = _.add(retval, term);
                    });

                    //done
                    return retval;
                }
                catch(e) {
                    //try to group symbols
                    try {
                        if(symbol.isComposite()) {
                            //group denominators
                            var denominators = {};

                            symbol.each(function (x) {
                                var d = x.getDenom();
                                var n = x.getNum();
                                var e = denominators[d];
                                denominators[d] = e ? _.add(e, n) : n;
                            });

                            var t = new Symbol(0);

                            for(var x in denominators) {
                                t = _.add(t, _.divide(denominators[x], _.parse(x)));
                            }

                            symbol = t;
                        }
                    }
                    catch(e2) {
                    }
                    ;
                }
                ;

                return symbol;
            }
        },
        degree: function (symbol, v, o) {
            o = o || {
                nd: [], //numeric
                sd: [], //symbolic
                depth: 0 //call depth
            };

            if(!v) {
                var vars = variables(symbol);
                //The user must specify the variable for multivariate
                if(vars.length > 1)
                    throw new Error('You must specify the variable for multivariate polynomials!');
                //if it's empty then we're dealing with a constant
                if(vars.length === 0)
                    return new Symbol(0);
                //assume the variable for univariate
                v = _.parse(vars[0]);
            }

            //store the group
            var g = symbol.group;
            //we're going to trust the user and assume no EX. Calling isPoly 
            //would eliminate this but no sense in checking twice. 
            if(symbol.isComposite()) {
                symbol = symbol.clone();
                symbol.distributeExponent();
                symbol.each(function (x) {
                    o.depth++; //mark a depth increase
                    __.degree(x, v, o);
                    o.depth--; //we're back
                });
            }
            else if(symbol.group === CB) {
                symbol.each(function (x) {
                    o.depth++;
                    __.degree(x, v, o);
                    o.depth++;
                });
            }
            else if(g === EX && symbol.value === v.value) {
                o.sd.push(symbol.power.clone());
            }
            else if(g === S && symbol.value === v.value) {
                o.nd.push(_.parse(symbol.power));
            }
            else
                o.nd.push(new Symbol(0));

            //get the max out of the array
            var deg = o.nd.length > 0 ? core.Utils.arrayMax(o.nd) : undefined;

            if(o.depth === 0 && o.sd.length > 0) {
                if(deg !== undefined)
                    o.sd.unshift(deg);
                return _.symfunction('max', o.sd);
            }
            if(!core.Utils.isSymbol(deg))
                deg = _.parse(deg);
            //return the degree
            return deg;
        },
        /**
         * Attempts to complete the square of a polynomial
         * @param {type} symbol
         * @param {type} v
         * @param {type} raw
         * @throws {Error} 
         * @returns {Object|Symbol[]}
         */
        sqComplete: function (symbol, v, raw) {
            if(!core.Utils.isSymbol(v))
                v = _.parse(v);
            var stop = function (msg) {
                msg = msg || 'Stopping';
                throw new core.exceptions.ValueLimitExceededError(msg);
            };
            //if not CP then nothing to do
            if(!symbol.isPoly(true))
                stop('Must be a polynomial!');

            //declare vars
            var deg, a, b, c, d, e, coeffs, sign, br, sym, sqrt_a;

            br = core.Utils.inBrackets;
            //make a copy
            symbol = symbol.clone();
            deg = core.Algebra.degree(symbol, v); //get the degree of polynomial
            //must be in form ax^2 +/- bx +/- c
            if(!deg.equals(2))
                stop('Cannot complete square for degree ' + deg);
            //get the coeffs
            coeffs = core.Algebra.coeffs(symbol, v);
            a = coeffs[2];
            //store the sign
            sign = coeffs[1].sign();
            //divide the linear term by two and square it
            b = _.divide(coeffs[1], new Symbol(2));
            //add the difference to the constant
            c = _.pow(b.clone(), new Symbol(2));
            if(raw)
                return [a, b, d];
            sqrt_a = math.sqrt(a);
            e = _.divide(math.sqrt(c), sqrt_a.clone());
            //calculate d which is the constant
            d = _.subtract(coeffs[0], _.pow(e.clone(), new Symbol(2)));
            //compute the square part
            sym = _.parse(br(sqrt_a.clone() + '*' + v + (sign < 0 ? '-' : '+') + e));
            return {
                a: sym,
                c: d,
                f: _.add(_.pow(sym.clone(), new Symbol(2)), d.clone())
            };
        },
        Simplify: {
            strip: function (symbol) {
                var c = _.parse(symbol.multiplier);
                symbol.toUnitMultiplier();
                var p = _.parse(symbol.power);
                symbol.toLinear();
                return [c, p, symbol];
            },
            unstrip: function (cp, symbol) {
                var c = cp[0];
                var p = cp[1];
                return _.multiply(c, _.pow(symbol, p));
            },
            complexSimp: function (num, den) {
                var ac, bd, bc, ad, cd, r1, r2, i1, i2;
                r1 = num.realpart();
                i1 = num.imagpart();
                r2 = den.realpart();
                i2 = den.imagpart();
                //apply complex arithmatic rule
                ac = _.multiply(r1.clone(), r2.clone());
                bd = _.multiply(i1.clone(), i2.clone());
                bc = _.multiply(r2.clone(), i1);
                ad = _.multiply(r1, i2.clone());
                cd = _.add(_.pow(r2, new Symbol(2)), _.pow(i2, new Symbol(2)));

                return _.divide(_.add(_.add(ac, bd), _.multiply(_.subtract(bc, ad), Symbol.imaginary())), cd);
            },
            trigSimp: function (symbol) {
                if(symbol.containsFunction(['cos', 'sin', 'tan'])) {
                    symbol = symbol.clone();
                    //remove power and multiplier
                    var sym_array = __.Simplify.strip(symbol);
                    symbol = sym_array.pop();
                    //the default return value is the symbol
                    var retval = symbol.clone();

                    //rewrite the symbol
                    if(symbol.group === CP) {
                        var sym = new Symbol(0);
                        symbol.each(function (x) {
                            //rewrite the function
                            var tr = __.Simplify.trigSimp(x.fnTransform());
                            sym = _.add(sym, tr);
                        }, true);

                        //put back the power and multiplier and return
                        retval = _.pow(_.multiply(new Symbol(symbol.multiplier), sym), new Symbol(symbol.power));
                    }
                    else if(symbol.group === CB) {

                        var n = symbol.getNum();
                        var d = symbol.getDenom();

                        //try for tangent
                        if(n.fname === 'sin' && d.fname === 'cos' && n.args[0].equals(d.args[0]) && n.power.equals(d.power)) {
                            retval = _.parse(core.Utils.format('({0})*({1})*tan({2})^({3})', d.multiplier, n.multiplier, n.args[0], n.power));
                        }
                        if(retval.group === CB) {
                            var t = new Symbol(1);
                            retval.each(function (x) {
                                if(x.fname === 'tan') {
                                    x = _.parse(core.Utils.format('({0})*sin({1})^({2})/cos({1})^({2})', x.multiplier, __.Simplify.simplify(x.args[0]), x.power));
                                }
                                t = _.multiply(t, x);
                            });
                            retval = t;
                        }
                    }


                    retval = __.Simplify.unstrip(sym_array, retval).distributeMultiplier();

                    symbol = retval;
                }

                return symbol;
            },
            fracSimp: function (symbol) {
                //try a quick simplify of imaginary numbers
                var den = symbol.getDenom();
                var num = symbol.getNum();

                if(num.isImaginary() && den.isImaginary())
                    symbol = __.Simplify.complexSimp(num, den);

                if(symbol.isComposite()) {
                    if(symbol.power > 1) {
                        symbol = _.expand(symbol);
                    }

                    var symbols = symbol.collectSymbols();
                    //assumption 1.
                    //since it's a composite, it has a length of at least 1
                    var retval, a, b, d1, d2, n1, n2, s, x, y, c, den, num;
                    a = symbols.pop(); //grab the first symbol
                    //loop through each term and make denominator common
                    while(symbols.length) {
                        b = symbols.pop(); //grab the second symbol
                        d1 = _.parse(a.getDenom());
                        d2 = _.parse(b.getDenom());
                        n1 = a.getNum();
                        n2 = b.getNum();
                        c = _.multiply(d1.clone(), d2.clone());
                        x = _.multiply(n1, d2);
                        y = _.multiply(n2, d1);
                        s = _.add(x, y);
                        a = _.divide(s, c);
                    }
                    den = _.expand(a.getDenom());
                    num = _.expand(a.getNum());
                    //simplify imaginary
                    if(num.isImaginary() && den.isImaginary()) {
                        retval = __.Simplify.complexSimp(num, den);
                    }
                    else {
                        retval = _.divide(num, den);
                    }

                    //we've already hit the simplest form so return that
                    if(retval.equals(symbol)) {
                        return symbol;
                    }

                    //otherwise simplify it some more
                    return __.Simplify.simplify(retval);
                }
                return symbol;
            },
            ratSimp: function (symbol) {
                if(symbol.group === CB) {
                    var den = symbol.getDenom();
                    var num = symbol.getNum().distributeMultiplier();
                    var d = __.Simplify.fracSimp(den);
                    var n = __.Simplify.fracSimp(num);
                    symbol = _.divide(n, d);
                }
                return symbol;
            },
            sqrtSimp: function (symbol, sym_array) {
                var retval;
                if(symbol.isSQRT()) {
                    var factored = __.Factor.factor(symbol.args[0].clone());
                    var m = _.parse(factored.multiplier);
                    var sign = m.sign();

                    var retval = _.sqrt(m.abs());
                    var arg;

                    if(isInt(retval)) {

                        if(factored.group === CB) {
                            var rem = new Symbol(1);

                            factored.each(function (x) {
                                if(x.group === N) {
                                    var trial = _.sqrt(x.clone());

                                    // Multiply back sqrt if it's an integer otherwise just put back the number
                                    if(isInt(trial)) {
                                        retval = _.multiply(retval, trial);
                                    }
                                    else {
                                        rem = _.multiply(rem, x);
                                    }
                                }
                                else {
                                    rem = _.multiply(rem, x);
                                }

                            });
                            var t = _.multiply(rem, _.parse(sign));
                            arg = _.sqrt(t.clone());

                            // Expand if it's imaginary
                            if(arg.isImaginary) {
                                arg = _.sqrt(_.expand(t.clone()));
                            }
                        }
                        else {
                            // Strip the multiplier
                            arg = _.sqrt(factored.clone().toUnitMultiplier());
                        }
                        return _.multiply(retval, arg);

                    }

                }
                else if(symbol.isComposite() && symbol.isLinear()) {
                    retval = new Symbol(0);
                    symbol.each(function (x) {
                        retval = _.add(retval, __.Simplify.sqrtSimp(x));
                    }, true);
                    // Put back the multiplier
                    retval = _.multiply(retval, _.parse(symbol.multiplier));
                }
                else if(symbol.group === CB) {
                    retval = _.parse(symbol.multiplier);
                    symbol.each(function (x) {
                        var simp = __.Simplify.sqrtSimp(x);
                        retval = _.multiply(retval, simp);

                    }, true);
                    // Put back the power
                    retval = _.pow(retval, _.parse(symbol.power));
                }

                return retval ? retval : _.parse(symbol);
            },
            /**
             * Unused. The goal is to substitute out patterns but it currently doesn't work.
             * @param {Symbol} symbol
             * @return {Array} The symbol and the matched patterns
             */
            patternSub: function (symbol) {
                var patterns = {};

                var has_CP = function (symbol) {
                    var found = false;
                    symbol.each(function (x) {
                        if(x.group === CP) {
                            found = true;
                        }
                        else if(x.symbols) {
                            found = has_CP(x);
                        }
                    });

                    return found;
                };

                var collect = function (sym) {
                    // We loop through each symbol looking for anything in the simplest
                    // form of ax+byz+...
                    sym.each(function (x) {
                        // Items of group N,P,S, need to apply
                        if(!x.symbols && x.group !== FN) {
                            return;
                        }

                        // Check to see if it has any symbols of group CP
                        // Get the patterns in that symbol instead if it has anything of group CP
                        if(has_CP(x)) {
                            collect(x);
                        }
                        else {
                            if(!patterns[x.value]) {
                                var u = core.Utils.getU(symbol);
                                // Get a u value and mark it for subsitution
                                patterns[x.value] = u;
                                symbol = symbol.sub(x.value, u);
                            }
                        }
                    }, true);
                };

                // Collect a list of patterns
                collect(symbol);

                return [symbol, patterns];
            },
            simplify: function (symbol) {
                //remove the multiplier to make calculation easier;
                var sym_array = __.Simplify.strip(symbol);
                symbol = sym_array.pop();
                //remove gcd from denominator
                symbol = __.Simplify.fracSimp(symbol);
                //nothing more to do
                if(symbol.isConstant() || symbol.group === core.groups.S) {
                    sym_array.push(symbol);
                    var ret = __.Simplify.unstrip(sym_array, symbol);
                    return ret;
                }

                //var patterns;

                var simplified = symbol.clone(); //make a copy

                //[simplified, patterns] = __.Simplify.patternSub(symbol);

                // Simplify sqrt within the symbol
//                simplified = __.Simplify.sqrtSimp(simplified, sym_array);

                // Try trig simplificatons e.g. cos(x)^2+sin(x)^2
                simplified = __.Simplify.trigSimp(simplified);

                // Simplify common denominators
                simplified = __.Simplify.ratSimp(simplified);

                // First go for the "cheapest" simplification which may eliminate 
                // your problems right away. factor -> evaluate. Remember
                // that there's no need to expand since factor already does that

                simplified = __.Factor.factor(simplified);

                //If the simplfied is a sum then we can make a few more simplifications
                //e.g. simplify(1/(x-1)+1/(1-x)) as per issue #431
                if(simplified.group === core.groups.CP && simplified.isLinear()) {
                    var m = simplified.multiplier.clone();
                    simplified.toUnitMultiplier(); //strip the multiplier
                    var r = new Symbol(0);
                    //return the sum of simplifications
                    simplified.each(function (x) {
                        var s = __.Simplify.simplify(x);
                        r = _.add(r, s);
                    });
                    simplified = r;
                    //put back the multiplier
                    r.multiplier = r.multiplier.multiply(m);
                }

                //place back multiplier and return
                var retval = __.Simplify.unstrip(sym_array, simplified);

                // Back substitute
                /*
                 for(var x in patterns) {
                 retval = retval.sub(patterns[x], x);
                 }
                 */

                return retval;
            }
        },

        Classes: {
            Polynomial: Polynomial,
            Factors: Factors,
            MVTerm: MVTerm
        }
    };

    // Add a link to simplify
    core.Expression.prototype.simplify = function () {
        return __.Simplify.simplify(this.symbol);
    };

    nerdamer.useAlgebraDiv = function () {
        var divide = __.divideFn = _.divide;
        var calls = 0; //keep track of how many calls were made
        _.divide = function (a, b) {
            calls++;
            var ans;
            if(calls === 1) //check if this is the first call. If it is use algebra divide
                ans = core.Algebra.divide(a, b);
            else //otherwise use parser divide
                ans = divide(a, b);
            calls = 0; //reset the number of calls back to none
            return ans;
        };
    };

    nerdamer.useParserDiv = function () {
        if(__.divideFn)
            _.divide = __.divideFn;
        delete __.divideFn;
    };

    nerdamer.register([
        {
            name: 'factor',
            visible: true,
            numargs: 1,
            build: function () {
                return __.Factor.factor;
            }
        },
        {
            name: 'simplify',
            visible: true,
            numargs: 1,
            build: function () {
                return __.Simplify.simplify;
            }
        },
        {
            name: 'gcd',
            visible: true,
            numargs: [1, ],
            build: function () {
                return __.gcd;
            }
        },
        {
            name: 'lcm',
            visible: true,
            numargs: [1, ],
            build: function () {
                return __.lcm;
            }
        },
        {
            name: 'roots',
            visible: true,
            numargs: -1,
            build: function () {
                return __.roots;
            }
        },
        {
            name: 'divide',
            visible: true,
            numargs: 2,
            build: function () {
                return __.divide;
            }
        },
        {
            name: 'div',
            visible: true,
            numargs: 2,
            build: function () {
                return __.div;
            }
        },
        {
            name: 'partfrac',
            visible: true,
            numargs: [1, 2],
            build: function () {
                return __.PartFrac.partfrac;
            }
        },
        {
            name: 'deg',
            visible: true,
            numargs: [1, 2],
            build: function () {
                return __.degree;
            }
        },
        {
            name: 'coeffs',
            visible: true,
            numargs: [1, 2],
            build: function () {
                var f = function () {
                    var coeffs = __.coeffs.apply(__, arguments);
                    return new core.Vector(coeffs);
                };
                return f;
            }
        },
        {
            name: 'line',
            visible: true,
            numargs: [2, 3],
            build: function () {
                return __.line;
            }
        },
        {
            name: 'sqcomp',
            visible: true,
            numargs: [1, 2],
            build: function () {
                var f = function (x, v) {
                    try {
                        v = v || variables(x)[0];
                        var sq = __.sqComplete(x.clone(), v);
                        return sq.f;
                    }
                    catch(e) {
                        return x;
                    }
                };
                return f;
            }
        }
    ]);
    nerdamer.updateAPI();
})();