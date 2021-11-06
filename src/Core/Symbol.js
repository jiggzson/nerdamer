const bigDec = require("decimal.js");
const {Settings} = require("../Settings");
const {validateName} = require('./Utils');
const {Groups} = require("./Groups");
const {Frac} = require('./Frac');

const {nround, isInt, arrayMin, inBrackets, remove} = require('./Utils');
const bigInt = require('../3rdparty/bigInt');
const {NerdamerTypeError, err} = require('./Errors');

/**
 * All symbols e.g. x, y, z, etc or functions are wrapped in this class. All symbols have a multiplier and a group.
 * All symbols except for "numbers (group Groups.N)" have a power.
 * @class Primary data type for the Parser.
 * @param {String | number} obj
 * @returns {Symbol}
 */
class Symbol {
    // injected dependencies
    static $parser

    constructor(obj) {
        let isInfinity = obj === 'Infinity';
        // This enables the class to be instantiated without the new operator
        if(!(this instanceof Symbol)) {
            return new Symbol(obj);
        }
        // Convert big numbers to a string
        if(obj instanceof bigDec) {
            obj = obj.toString();
        }
        //define numeric symbols
        if(/^(-?\+?\d+)\.?\d*e?-?\+?\d*/i.test(obj) || obj instanceof bigDec) {
            this.group = Groups.N;
            this.value = Settings.CONST_HASH;
            this.multiplier = new Frac(obj);
        }
        //define symbolic symbols
        else {
            this.group = Groups.S;
            validateName(obj);
            this.value = obj;
            this.multiplier = new Frac(1);
            this.imaginary = obj === Settings.IMAGINARY;
            this.isInfinity = isInfinity;
        }

        //As of 6.0.0 we switched to infinite precision so all objects have a power
        //Although this is still redundant in constants, it simplifies the logic in
        //other parts so we'll keep it
        this.power = new Frac(1);

        // Added to silence the strict warning.
        return this;
    }

    /**
     * Returns vanilla imaginary symbol
     * @returns {Symbol}
     */
    static imaginary () {
        var s = new Symbol(Settings.IMAGINARY);
        s.imaginary = true;
        return s;
    }

    /**
     * Return nerdamer's representation of Infinity
     * @param {int} negative -1 to return negative infinity
     * @returns {Symbol}
     */
    static infinity (negative) {
        var v = new Symbol('Infinity');
        if (negative === -1)
            v.negate();
        return v;
    }

    static shell (group, value) {
        var symbol = new Symbol(value);
        symbol.group = group;
        symbol.symbols = {};
        symbol.length = 0;
        return symbol;
    }

    //sqrt(x) -> x^(1/2)
    static unwrapSQRT (symbol, all) {
        var p = symbol.power;
        if (symbol.fname === Settings.SQRT && (symbol.isLinear() || all)) {
            var t = symbol.args[0].clone();
            t.power = t.power.multiply(new Frac(1 / 2));
            t.multiplier = t.multiplier.multiply(symbol.multiplier);
            symbol = t;
            if (all)
                symbol.power = p.multiply(new Frac(1 / 2));
        }

        return symbol;
    }

    static hyp (a, b) {
        a = a || new Symbol(0);
        b = b || new Symbol(0);
        return Symbol.$parser.sqrt(Symbol.$parser.add(Symbol.$parser.pow(a.clone(), new Symbol(2)), Symbol.$parser.pow(b.clone(), new Symbol(2))));
    }

    //converts to polar form array
    static toPolarFormArray(symbol) {
        var re, im, r, theta;
        re = symbol.realpart();
        im = symbol.imagpart();
        r = Symbol.hyp(re, im);
        theta = re.equals(0) ? Symbol.$parser.parse('pi/2') : Symbol.$parser.trig.atan(Symbol.$parser.divide(im, re));
        return [r, theta];
    }

    //removes parentheses
    static unwrapPARENS(symbol) {
        if (symbol.fname === '') {
            var r = symbol.args[0];
            r.power = r.power.multiply(symbol.power);
            r.multiplier = r.multiplier.multiply(symbol.multiplier);
            if (symbol.fname === '')
                return Symbol.unwrapPARENS(r);
            return r;
        }
        return symbol;
    };

    //quickly creates a Symbol
    static create(value, power) {
        power = power === undefined ? 1 : power;
        return Symbol.$parser.parse('(' + value + ')^(' + power + ')');
    }

    /**
     * Gets nth root accounting for rounding errors
     * @param {Number} n
     * @return {Number}
     */
    getNth(n) {
        // First calculate the root
        var root = Symbol.$evaluate(Symbol.$parser.pow(Symbol.$parser.parse(this.multiplier), Symbol.$parser.parse(n).invert()));
        // Round of any errors
        var rounded = Symbol.$parser.parse(nround(root));
        // Reverse the root
        var e = Symbol.$evaluate(Symbol.$parser.pow(rounded, Symbol.$parser.parse(n)));
        // If the rounded root equals the original number then we're good
        if (e.equals(Symbol.$parser.parse(this.multiplier))) {
            return rounded;
        }
        // Otherwise return the unrounded version
        return root;
    }

    /**
     * Checks if symbol is to the nth power
     * @returns {Boolean}
     */
    isToNth(n) {
        // Start by check in the multiplier for squareness
        // First get the root but round it because currently we still depend
        var root = this.getNth(n);
        var nthMultiplier = isInt(root);
        var nthPower;

        if (this.group === Groups.CB) {
            // Start by assuming that all will be square.
            nthPower = true;
            // All it takes is for one of the symbols to not have an even power
            // e.g. x^n1*y^n2 requires that both n1 and n2 are even
            this.each(function (x) {
                var isNth = x.isToNth(n);

                if (!isNth) {
                    nthPower = false;
                }
            });
        }
        else {
            // Check if the power is divisible by n if it's not a number.
            nthPower = this.group === Groups.N ? true : isInt(Symbol.$parser.divide(Symbol.$parser.parse(this.power), Symbol.$parser.parse(n)));
        }

        return nthMultiplier && nthPower;
    }

    /**
     * Checks if a symbol is square
     * @return {Boolean}
     */
    isSquare() {
        return this.isToNth(2);
    }

    /**
     * Checks if a symbol is cube
     * @return {Boolean}
     */
    isCube() {
        return this.isToNth(3);
    }

    /**
     * Checks if a symbol is a bare variable
     * @return {Boolean}
     */
    isSimple() {
        return this.power.equals(1) && this.multiplier.equals(1);
    }

    /**
     * Simplifies the power of the symbol
     * @returns {Symbol} a clone of the symbol
     */
    powSimp() {
        if (this.group === Groups.CB) {
            var powers = [],
                sign = this.multiplier.sign();
            this.each(function (x) {
                var p = x.power;
                //why waste time if I can't do anything anyway
                if (isSymbol(p) || p.equals(1))
                    return this.clone();
                powers.push(p);
            });
            var min = new Frac(arrayMin(powers));

            //handle the coefficient
            //handle the multiplier
            var sign = this.multiplier.sign(),
                m = this.multiplier.clone().abs(),
                mfactors = Symbol.$Math2.ifactor(m);
            //if we have a multiplier of 6750 and a min of 2 then the factors are 5^3*5^3*2
            //we can then reduce it to 2*3*5*(15)^2
            var out_ = new Frac(1);
            var in_ = new Frac(1);

            for (var x in mfactors) {
                var n = new Frac(mfactors[x]);
                if (!n.lessThan(min)) {
                    n = n.divide(min).subtract(new Frac(1));
                    in_ = in_.multiply(new Frac(x)); //move the factor inside the bracket
                }

                out_ = out_.multiply(Symbol.$parser.parse(inBrackets(x) + '^' + inBrackets(n)).multiplier);
            }
            var t = new Symbol(in_);
            this.each(function (x) {
                x = x.clone();
                x.power = x.power.divide(min);
                t = Symbol.$parser.multiply(t, x);
            });

            var xt = Symbol.$parser.symfunction(Settings.PARENTHESIS, [t]);
            xt.power = min;
            xt.multiplier = sign < 0 ? out_.negate() : out_;

            return xt;
        }
        return this.clone();
    }

    /**
     * Checks to see if two functions are of equal value
     * @param {Symbol} symbol
     */
    equals(symbol) {
        if (!isSymbol(symbol))
            symbol = new Symbol(symbol);
        return this.value === symbol.value && this.power.equals(symbol.power)
            && this.multiplier.equals(symbol.multiplier)
            && this.group === symbol.group;
    }

    abs() {
        var e = this.clone();
        e.multiplier.abs();
        return e;
    }

    // Greater than
    gt(symbol) {
        if (!isSymbol(symbol))
            symbol = new Symbol(symbol);
        return this.isConstant() && symbol.isConstant() && this.multiplier.greaterThan(symbol.multiplier);
    }

    // Greater than
    gte(symbol) {
        if (!isSymbol(symbol))
            symbol = new Symbol(symbol);
        return this.equals(symbol) ||
            this.isConstant() && symbol.isConstant() && this.multiplier.greaterThan(symbol.multiplier);
    }

    // Less than
    lt(symbol) {
        if (!isSymbol(symbol))
            symbol = new Symbol(symbol);
        return this.isConstant() && symbol.isConstant() && this.multiplier.lessThan(symbol.multiplier);
    }

    // Less than
    lte(symbol) {
        if (!isSymbol(symbol))
            symbol = new Symbol(symbol);
        return this.equals(symbol) ||
            this.isConstant() && symbol.isConstant() && this.multiplier.lessThan(symbol.multiplier);
    }

    /**
     * Because nerdamer doesn't group symbols by polynomials but
     * rather a custom grouping method, this has to be
     * reinserted in order to make use of most algorithms. This function
     * checks if the symbol meets the criteria of a polynomial.
     * @param {bool} multivariate
     * @returns {boolean}
     */
    isPoly(multivariate) {
        var g = this.group,
            p = this.power;
        //the power must be a integer so fail if it's not
        if (!isInt(p) || p < 0)
            return false;
        //constants and first orders
        if (g === Groups.N || g === Groups.S || this.isConstant(true))
            return true;
        var vars = Symbol.$variables(this);
        if (g === Groups.CB && vars.length === 1) {
            //the variable is assumed the only one that was found
            var v = vars[0];
            //if no variable then guess what!?!? We're done!!! We have a polynomial.
            if (!v)
                return true;
            for (var x in this.symbols) {
                var sym = this.symbols[x];
                //sqrt(x)
                if (sym.group === Groups.FN && !sym.args[0].isConstant())
                    return false;
                if (!sym.contains(v) && !sym.isConstant(true))
                    return false;
            }
            return true;
        }
        //PL groups. These only fail if a power is not an int
        //this should handle cases such as x^2*t
        if (this.isComposite() || g === Groups.CB && multivariate) {
            //fail if we're not checking for multivariate polynomials
            if (!multivariate && vars.length > 1)
                return false;
            //loop though the symbols and check if they qualify
            for (var x in this.symbols) {
                //we've already the symbols if we're not checking for multivariates at this point
                //so we check the sub-symbols
                if (!this.symbols[x].isPoly(multivariate))
                    return false;
            }
            return true;
        }
        else
            return false;

        /*
         //all tests must have passed so we must be dealing with a polynomial
         return true;
         */
    }

    //removes the requested variable from the symbol and returns the remainder
    stripVar(x, exclude_x) {
        var retval;
        if ((this.group === Groups.PL || this.group === Groups.S) && this.value === x)
            retval = new Symbol(exclude_x ? 0 : this.multiplier);
        else if (this.group === Groups.CB && this.isLinear()) {
            retval = new Symbol(1);
            this.each(function (s) {
                if (!s.contains(x, true))
                    retval = Symbol.$parser.multiply(retval, s.clone());
            });
            retval.multiplier = retval.multiplier.multiply(this.multiplier);
        }
        else if (this.group === Groups.CP && !this.isLinear()) {
            retval = new Symbol(this.multiplier);
        }
        else if (this.group === Groups.CP && this.isLinear()) {
            retval = new Symbol(0);
            this.each(function (s) {
                if (!s.contains(x)) {
                    var t = s.clone();
                    t.multiplier = t.multiplier.multiply(this.multiplier);
                    retval = Symbol.$parser.add(retval, t);
                }
            });
            //BIG TODO!!! It doesn't make much sense
            if (retval.equals(0))
                retval = new Symbol(this.multiplier);
        }
        else if (this.group === Groups.EX && this.power.contains(x, true)) {
            retval = new Symbol(this.multiplier);
        }
        else if (this.group === Groups.FN && this.contains(x)) {
            retval = new Symbol(this.multiplier);
        }
        else
            //wth? This should technically be the multiplier.
            //Unfortunately this method wasn't very well thought out :`(.
            //should be: retval = new Symbol(this.multiplier);
            //use: ((1+x^2)*sqrt(-1+x^2))^(-1) for correction.
            //this will break a bunch of unit tests so be ready to for the long haul
            retval = this.clone();


        return retval;
    }

    //returns symbol in array form with x as base e.g. a*x^2+b*x+c = [c, b, a].
    toArray(v, arr) {
        arr = arr || {
            arr: [],
            add: function (x, idx) {
                var e = this.arr[idx];
                this.arr[idx] = e ? Symbol.$parser.add(e, x) : x;
            }
        };
        var g = this.group;

        if (g === Groups.S && this.contains(v)) {
            arr.add(new Symbol(this.multiplier), this.power);
        }
        else if (g === Groups.CB) {
            var a = this.stripVar(v),
                x = Symbol.$parser.divide(this.clone(), a.clone());
            var p = x.isConstant() ? 0 : x.power;
            arr.add(a, p);
        }
        else if (g === Groups.PL && this.value === v) {
            this.each(function (x, p) {
                arr.add(x.stripVar(v), p);
            });
        }
        else if (g === Groups.CP) {
            //the logic: they'll be broken into symbols so e.g. (x^2+x)+1 or (a*x^2+b*x+c)
            //each case is handled above
            this.each(function (x) {
                x.toArray(v, arr);
            });
        }
        else if (this.contains(v)) {
            throw new NerdamerTypeError('Cannot convert to array! Exiting');
        }
        else {
            arr.add(this.clone(), 0); //it's just a constant wrt to v
        }
        //fill the holes
        arr = arr.arr; //keep only the array since we don't need the object anymore
        for (var i = 0; i < arr.length; i++)
            if (!arr[i])
                arr[i] = new Symbol(0);
        return arr;
    }

    //checks to see if a symbol contans a function
    hasFunc(v) {
        var fn_group = this.group === Groups.FN || this.group === Groups.EX;
        if (fn_group && !v || fn_group && this.contains(v))
            return true;
        if (this.symbols) {
            for (var x in this.symbols) {
                if (this.symbols[x].hasFunc(v))
                    return true;
            }
        }
        return false;
    }

    sub(a, b) {
        a = !isSymbol(a) ? Symbol.$parser.parse(a) : a.clone();
        b = !isSymbol(b) ? Symbol.$parser.parse(b) : b.clone();
        if (a.group === Groups.N || a.group === Groups.P)
            err('Cannot substitute a number. Must be a variable');
        var same_pow = false,
            a_is_unit_multiplier = a.multiplier.equals(1),
            m = this.multiplier.clone(),
            retval;
        /*
         * In order to make the substitution the bases have to first match take
         * (x+1)^x -> (x+1)=y || x^2 -> x=y^6
         * In both cases the first condition is that the bases match so we begin there
         * Either both are Groups.PL or both are not Groups.PL but we cannot have Groups.PL and a non-PL group match
         */
        if (this.value === a.value && (this.group !== Groups.PL && a.group !== Groups.PL || this.group === Groups.PL && a.group === Groups.PL)) {
            //we cleared the first hurdle but a subsitution may not be possible just yet
            if (a_is_unit_multiplier || a.multiplier.equals(this.multiplier)) {
                if (a.isLinear()) {
                    retval = b;
                }
                else if (a.power.equals(this.power)) {
                    retval = b;
                    same_pow = true;
                }
                if (a.multiplier.equals(this.multiplier))
                    m = new Frac(1);
            }
        }
        //the next thing is to handle CB
        else if (this.group === Groups.CB || this.previousGroup === Groups.CB) {
            retval = new Symbol(1);
            this.each(function (x) {
                var subbed = Symbol.$parser.parse(x.sub(a, b)); //parse it again for safety
                retval = Symbol.$parser.multiply(retval, subbed);

            });
        }
        else if (this.isComposite()) {
            var symbol = this.clone();

            if (a.isComposite() && symbol.isComposite() && symbol.isLinear() && a.isLinear()) {
                var find = function (stack, needle) {
                    for (var x in stack.symbols) {
                        var sym = stack.symbols[x];
                        //if the symbol equals the needle or it's within the sub-symbols we're done
                        if (sym.isComposite() && find(sym, needle) || sym.equals(needle))
                            return true;
                    }
                    return false;
                };
                //go fish
                for (var x in a.symbols) {
                    if (!find(symbol, a.symbols[x]))
                        return symbol.clone();
                }
                retval = Symbol.$parser.add(Symbol.$parser.subtract(symbol.clone(), a), b);
            }
            else {
                retval = new Symbol(0);
                symbol.each(function (x) {
                    retval = Symbol.$parser.add(retval, x.sub(a, b));
                });
            }
        }
        else if (this.group === Groups.EX) {
            // the parsed value could be a function so parse and sub
            retval = Symbol.$parser.parse(this.value).sub(a, b);
        }
        else if (this.group === Groups.FN) {
            var nargs = [];
            for (var i = 0; i < this.args.length; i++) {
                var arg = this.args[i];
                if (!isSymbol(arg))
                    arg = Symbol.$parser.parse(arg);
                nargs.push(arg.sub(a, b));
            }
            retval = Symbol.$parser.symfunction(this.fname, nargs);
        }
        //if we did manage a substitution
        if (retval) {
            if (!same_pow) {
                //substitute the power
                var p = this.group === Groups.EX ? this.power.sub(a, b) : Symbol.$parser.parse(this.power);
                //now raise the symbol to that power
                retval = Symbol.$parser.pow(retval, p);
            }

            //transfer the multiplier
            retval.multiplier = retval.multiplier.multiply(m);

            //done
            return retval;
        }
        //if all else fails
        return this.clone();
    }

    isMonomial() {
        if (this.group === Groups.S)
            return true;
        if (this.group === Groups.CB) {
            for (var x in this.symbols)
                if (this.symbols[x].group !== Groups.S)
                    return false;
        }
        else
            return false;
        return true;
    }

    isPi() {
        return this.group === Groups.S && this.value === 'pi';
    }

    sign() {
        return this.multiplier.sign();
    }

    isE() {
        return this.value === 'e';
    }

    isSQRT() {
        return this.fname === Settings.SQRT;
    }

    isConstant(check_all, check_symbols) {
        if (check_symbols && this.group === Groups.CB) {
            for (var x in this.symbols) {
                if (this.symbols[x].isConstant(true))
                    return true;
            }
        }

        if (check_all === 'functions' && this.isComposite()) {
            var isConstant = true;

            this.each(function (x) {
                if (!x.isConstant(check_all, check_symbols)) {
                    isConstant = false;
                }
            }, true);

            return isConstant;
        }

        if (check_all === 'all' && (this.isPi() || this.isE())) {
            return true;
        }

        if (check_all && this.group === Groups.FN) {
            for (var i = 0; i < this.args.length; i++) {
                if (!this.args[i].isConstant(check_all))
                    return false;
            }
            return true;
        }

        if (check_all)
            return isNumericSymbol(this);
        return this.value === Settings.CONST_HASH;
    }

    //the symbols is imaginary if
    //1. n*i
    //2. a+b*i
    //3. a*i
    isImaginary() {
        if (this.imaginary)
            return true;
        else if (this.symbols) {
            for (var x in this.symbols)
                if (this.symbols[x].isImaginary())
                    return true;
        }
        return false;
    }

    /**
     * Returns the real part of a symbol
     * @returns {Symbol}
     */
    realpart() {
        if (this.isConstant()) {
            return this.clone();
        }
        else if (this.imaginary)
            return new Symbol(0);
        else if (this.isComposite()) {
            var retval = new Symbol(0);
            this.each(function (x) {
                retval = Symbol.$parser.add(retval, x.realpart());
            });
            return retval;
        }
        else if (this.isImaginary())
            return new Symbol(0);
        return this.clone();
    }

    /*
     * Return imaginary part of a symbol
     * @returns {Symbol}
     */
    imagpart() {
        if (this.group === Groups.S && this.isImaginary())
            return new Symbol(this.multiplier);
        if (this.isComposite()) {
            var retval = new Symbol(0);
            this.each(function (x) {
                retval = Symbol.$parser.add(retval, x.imagpart());
            });
            return retval;
        }
        if (this.group === Groups.CB)
            return this.stripVar(Settings.IMAGINARY);
        return new Symbol(0);
    }

    isInteger() {
        return this.isConstant() && this.multiplier.isInteger();
    }

    isLinear(wrt) {
        if (wrt) {
            if (this.isConstant())
                return true;
            if (this.group === Groups.S) {
                if (this.value === wrt)
                    return this.power.equals(1);
                else
                    return true;
            }

            if (this.isComposite() && this.power.equals(1)) {
                for (var x in this.symbols) {
                    if (!this.symbols[x].isLinear(wrt))
                        return false;
                }
                return true;
            }

            if (this.group === Groups.CB && this.symbols[wrt])
                return this.symbols[wrt].isLinear(wrt);
            return false;
        }
        else
            return this.power.equals(1);
    }

    /**
     * Checks to see if a symbol has a function by a specified name or within a specified list
     * @param {String|String[]} names
     * @returns {Boolean}
     */
    containsFunction(names) {
        if (typeof names === 'string')
            names = [names];
        if (this.group === Groups.FN && names.indexOf(this.fname) !== -1)
            return true;
        if (this.symbols) {
            for (var x in this.symbols) {
                if (this.symbols[x].containsFunction(names))
                    return true;
            }
        }
        return false;
    }

    multiplyPower(p2) {
        //leave out 1
        if (this.group === Groups.N && this.multiplier.equals(1))
            return this;

        var p1 = this.power;

        if (this.group !== Groups.EX && p2.group === Groups.N) {
            var p = p2.multiplier;
            if (this.group === Groups.N && !p.isInteger()) {
                this.convert(Groups.P);
            }

            this.power = p1.equals(1) ? p.clone() : p1.multiply(p);

            if (this.group === Groups.P && isInt(this.power)) {
                //bring it back to an N
                this.value = Math.pow(this.value, this.power);
                this.toLinear();
                this.convert(Groups.N);
            }
        }
        else {
            if (this.group !== Groups.EX)  {
                p1 = new Symbol(p1);
                this.convert(Groups.EX);
            }
            this.power = Symbol.$parser.multiply(p1, p2);
        }

        return this;
    }

    setPower(p, retainSign) {
        //leave out 1
        if (this.group === Groups.N && this.multiplier.equals(1)) {
            return this;
        }
        if (this.group === Groups.EX && !isSymbol(p)) {
            this.group = this.previousGroup;
            delete this.previousGroup;
            if (this.group === Groups.N)  {
                this.multiplier = new Frac(this.value);
                this.value = Settings.CONST_HASH;
            }
            else
                this.power = p;
        }
        else {
            var isSymbolic = false;
            if (isSymbol(p)) {
                if (p.group === Groups.N)  {
                    //p should be the multiplier instead
                    p = p.multiplier;

                }
                else {
                    isSymbolic = true;
                }
            }
            var group = isSymbolic ? Groups.EX : Groups.P;
            this.power = p;
            if (this.group === Groups.N && group)
                this.convert(group, retainSign);
        }

        return this;
    }

    /**
     * Checks to see if symbol is located in the denominator
     * @returns {boolean}
     */
    isInverse() {
        if (this.group === Groups.EX)
            return (this.power.multiplier.lessThan(0));
        return this.power < 0;
    }

    /**
     * Make a duplicate of a symbol by copying a predefined list of items.
     * The name 'copy' would probably be a more appropriate name.
     * to a new symbol
     * @param {Symbol | undefined} c
     * @returns {Symbol}
     */
    clone(c= undefined) {
        var clone = c || new Symbol(0),
            //list of properties excluding power as this may be a symbol and would also need to be a clone.
            properties = [
                'value', 'group', 'length', 'previousGroup', 'imaginary', 'fname', 'args', 'isInfinity', 'scientific'],
            l = properties.length, i;
        if (this.symbols) {
            clone.symbols = {};
            for (var x in this.symbols) {
                clone.symbols[x] = this.symbols[x].clone();
            }
        }

        for (i = 0; i < l; i++) {
            if (this[properties[i]] !== undefined) {
                clone[properties[i]] = this[properties[i]];
            }
        }

        clone.power = this.power.clone();
        clone.multiplier = this.multiplier.clone();
        //add back the flag to track if this symbol is a conversion symbol
        if (this.isConversion)
            clone.isConversion = this.isConversion;

        if (this.isUnit)
            clone.isUnit = this.isUnit;

        return clone;
    }

    /**
     * Converts a symbol multiplier to one.
     * @param {Boolean} keepSign Keep the multiplier as negative if the multiplier is negative and keepSign is true
     * @returns {Symbol}
     */
    toUnitMultiplier(keepSign) {
        this.multiplier.num = new bigInt(this.multiplier.num.isNegative() && keepSign ? -1 : 1);
        this.multiplier.den = new bigInt(1);
        return this;
    }

    /**
     * Converts a Symbol's power to one.
     * @returns {Symbol}
     */
    toLinear() {
        // Do nothing if it's already linear
        if (this.power.equals(1)) {
            return this;
        }
        this.setPower(new Frac(1));
        return this;
    }

    /**
     * Iterates over all the sub-symbols. If no sub-symbols exist then it's called on itself
     * @param {Function} fn
     * @@param {Boolean} deep If true it will itterate over the sub-symbols their symbols as well
     */
    each(fn, deep) {
        if (!this.symbols) {
            fn.call(this, this, this.value);
        }
        else {
            for (var x in this.symbols) {
                var sym = this.symbols[x];
                if (sym.group === Groups.PL && deep) {
                    for (var y in sym.symbols) {
                        fn.call(x, sym.symbols[y], y);
                    }
                }
                else
                    fn.call(this, sym, x);
            }
        }
    }

    /**
     * A numeric value to be returned for Javascript. It will try to
     * return a number as far a possible but in case of a pure symbolic
     * symbol it will just return its text representation
     * @returns {String|Number}
     */
    valueOf() {
        if (this.group === Groups.N)
            return this.multiplier.valueOf();
        else if (this.power === 0) {
            return 1;
        }
        else if (this.multiplier === 0) {
            return 0;
        }
        else {
            return Symbol.$text(this, 'decimals');
        }
    }

    /**
     * Checks to see if a symbols has a particular variable within it.
     * Pass in true as second argument to include the power of exponentials
     * which aren't check by default.
     * @example var s = _.parse('x+y+z'); s.contains('y');
     * //returns true
     * @param {any} variable
     * @param {boolean} all
     * @returns {boolean}
     */
    contains(variable, all) {
        //contains expects a string
        variable = String(variable);
        var g = this.group;
        if (this.value === variable)
            return true;
        if (this.symbols) {
            for (var x in this.symbols) {
                if (this.symbols[x].contains(variable, all))
                    return true;
            }
        }
        if (g === Groups.FN || this.previousGroup === Groups.FN) {
            for (var i = 0; i < this.args.length; i++) {
                if (this.args[i].contains(variable, all))
                    return true;
            }
        }

        if (g === Groups.EX)  {
            //exit only if it does
            if (all && this.power.contains(variable, all)) {
                return true;
            }
            if (this.value === variable)
                return true;

        }

        return this.value === variable;
    }

    /**
     * Negates a symbols
     * @returns {boolean}
     */
    negate() {
        this.multiplier.negate();
        if (this.group === Groups.CP || this.group === Groups.PL)
            this.distributeMultiplier();
        return this;
    }

    /**
     * Inverts a symbol
     * @param {boolean} power_only
     * @param {boolean} all
     * @returns {boolean}
     */
    invert(power_only, all) {
        //invert the multiplier
        if (!power_only)
            this.multiplier = this.multiplier.invert();
        //invert the rest
        if (isSymbol(this.power)) {
            this.power.negate();
        }
        else if (this.group === Groups.CB && all) {
            this.each(function (x) {
                return x.invert();
            });
        }
        else {
            if (this.power && this.group !== Groups.N)
                this.power.negate();
        }
        return this;
    }

    /**
     * Symbols of group Groups.CP or Groups.PL may have the multiplier being carried by
     * the top level symbol at any given time e.g. 2*(x+y+z). This is
     * convenient in many cases, however in some cases the multiplier needs
     * to be carried individually e.g. 2*x+2*y+2*z.
     * This method distributes the multiplier over the entire symbol
     * @param {boolean} all
     * @returns {Symbol}
     */
    distributeMultiplier(all) {
        var is_one = all ? this.power.absEquals(1) : this.power.equals(1);
        if (this.symbols && is_one && this.group !== Groups.CB && !this.multiplier.equals(1)) {
            for (var x in this.symbols) {
                var s = this.symbols[x];
                s.multiplier = s.multiplier.multiply(this.multiplier);
                s.distributeMultiplier();
            }
            this.toUnitMultiplier();
        }

        return this;
    }

    /**
     * This method expands the exponent over the entire symbol just like
     * distributeMultiplier
     * @returns {Symbol}
     */
    distributeExponent() {
        if (!this.power.equals(1)) {
            var p = this.power;
            for (var x in this.symbols) {
                var s = this.symbols[x];
                if (s.group === Groups.EX)  {
                    s.power = Symbol.$parser.multiply(s.power, new Symbol(p));
                }
                else {
                    this.symbols[x].power = this.symbols[x].power.multiply(p);
                }
            }
            this.toLinear();
        }
        return this;
    }

    /**
     * This method will attempt to up-convert or down-convert one symbol
     * from one group to another. Not all symbols are convertible from one
     * group to another however. In that case the symbol will remain
     * unchanged.
     * @param {number} group
     * @param {string} imaginary
     */
    convert(group, imaginary) {
        if (group > Groups.FN) {
            //make a clone of this symbol;
            var cp = this.clone();

            //attach a symbols object and upgrade the group
            this.symbols = {};

            if (group === Groups.CB) {
                //symbol of group Groups.CB hold symbols bound together through multiplication
                //because of commutativity this multiplier can technically be anywhere within the group
                //to keep track of it however it's easier to always have the top level carry it
                cp.toUnitMultiplier();
            }
            else {
                //reset the symbol
                this.toUnitMultiplier();
            }

            if (this.group === Groups.FN) {
                cp.args = this.args;
                delete this.args;
                delete this.fname;
            }

            //the symbol may originate from the symbol i but this property no longer holds true
            //after copying
            if (this.isImgSymbol)
                delete this.isImgSymbol;

            this.toLinear();
            //attach a clone of this symbol to the symbols object using its proper key
            this.symbols[cp.keyForGroup(group)] = cp;
            this.group = group;
            //objects by default don't have a length property. However, in order to keep track of the number
            //of sub-symbols we have to impliment our own.
            this.length = 1;
        }
        else if (group === Groups.EX)  {
            //1^x is just one so check and make sure
            if (!(this.group === Groups.N && this.multiplier.equals(1))) {
                if (this.group !== Groups.EX)
                    this.previousGroup = this.group;
                if (this.group === Groups.N)  {
                    this.value = this.multiplier.num.toString();
                    this.toUnitMultiplier();
                }
                //update the hash to reflect the accurate hash
                else
                    this.value = Symbol.$text(this, 'hash');

                this.group = Groups.EX;
            }
        }
        else if (group === Groups.N)  {
            var m = this.multiplier.toDecimal();
            if (this.symbols)
                this.symbols = undefined;
            new Symbol(this.group === Groups.P ? m * Math.pow(this.value, this.power) : m).clone(this);
        }
        else if (group === Groups.P && this.group === Groups.N)  {
            this.value = imaginary ? this.multiplier.num.toString() : Math.abs(this.multiplier.num.toString());
            this.toUnitMultiplier(!imaginary);
            this.group = Groups.P;
        }
        return this;
    }

    /**
     * This method is one of the principal methods to make it all possible.
     * It performs cleanup and prep operations whenever a symbols is
     * inserted. If the symbols results in a 1 in a Groups.CB (multiplication)
     * group for instance it will remove the redundant symbol. Similarly
     * in a symbol of group Groups.PL or Groups.CP (symbols glued by multiplication) it
     * will remove any dangling zeroes from the symbol. It will also
     * up-convert or down-convert a symbol if it detects that it's
     * incorrectly grouped. It should be noted that this method is not
     * called directly but rather by the 'attach' method for addition groups
     * and the 'combine' method for multiplication groups.
     * @param {Symbol} symbol
     * @param {String} action
     */
    insert(symbol, action) {
        //this check can be removed but saves a lot of aggravation when trying to hunt down
        //a bug. If left, you will instantly know that the error can only be between 2 symbols.
        if (!isSymbol(symbol))
            err('Object ' + symbol + ' is not of type Symbol!');
        if (this.symbols) {
            var group = this.group;
            if (group > Groups.FN) {
                var key = symbol.keyForGroup(group);
                var existing = key in this.symbols ? this.symbols[key] : false; //check if there's already a symbol there
                if (action === 'add') {
                    var hash = key;
                    if (existing) {
                        //add them together using the parser
                        this.symbols[hash] = Symbol.$parser.add(existing, symbol);
                        //if the addition resulted in a zero multiplier remove it
                        if (this.symbols[hash].multiplier.equals(0)) {
                            delete this.symbols[hash];
                            this.length--;

                            if (this.length === 0) {
                                this.convert(Groups.N);
                                this.multiplier = new Frac(0);
                            }
                        }
                    }
                    else {
                        this.symbols[key] = symbol;
                        this.length++;
                    }
                }
                else {
                    //check if this is of group Groups.P and unwrap before inserting
                    if (symbol.group === Groups.P && isInt(symbol.power)) {
                        symbol.convert(Groups.N);
                    }

                    //transfer the multiplier to the upper symbol but only if the symbol numeric
                    if (symbol.group !== Groups.EX)  {
                        this.multiplier = this.multiplier.multiply(symbol.multiplier);
                        symbol.toUnitMultiplier();
                    }
                    else {
                        symbol.parens = symbol.multiplier.lessThan(0);
                        this.multiplier = this.multiplier.multiply(symbol.multiplier.clone().abs());
                        symbol.toUnitMultiplier(true);
                    }

                    if (existing) {
                        //remove because the symbol may have changed
                        symbol = Symbol.$parser.multiply(remove(this.symbols, key), symbol);
                        if (symbol.isConstant()) {
                            this.multiplier = this.multiplier.multiply(symbol.multiplier);
                            symbol = new Symbol(1); //the dirty work gets done down the line when it detects 1
                        }

                        this.length--;
                        //clean up
                    }

                    //don't insert the symbol if it's 1
                    if (!symbol.isOne(true)) {
                        this.symbols[key] = symbol;
                        this.length++;
                    }
                    else if (symbol.multiplier.lessThan(0)) {
                        this.negate(); //put back the sign
                    }
                }

                //clean up
                if (this.length === 0)
                    this.convert(Groups.N);
                //update the hash
                if (this.group === Groups.CP || this.group === Groups.CB) {
                    this.updateHash();
                }
            }
        }

        return this;
    }

    //the insert method for addition
    attach(symbol) {
        if (Array.isArray(symbol)) {
            for (var i = 0; i < symbol.length; i++)
                this.insert(symbol[i], 'add');
            return this;
        }
        return this.insert(symbol, 'add');
    }

    //the insert method for multiplication
    combine(symbol) {
        if (Array.isArray(symbol)) {
            for (var i = 0; i < symbol.length; i++)
                this.insert(symbol[i], 'multiply');
            return this;
        }
        return this.insert(symbol, 'multiply');
    }

    /**
     * This method should be called after any major "surgery" on a symbol.
     * It updates the hash of the symbol for example if the fname of a
     * function has changed it will update the hash of the symbol.
     */
    updateHash() {
        if (this.group === Groups.N)
            return;

        if (this.group === Groups.FN) {
            var contents = '',
                args = this.args,
                is_parens = this.fname === Settings.PARENTHESIS;
            for (var i = 0; i < args.length; i++)
                contents += (i === 0 ? '' : ',') + Symbol.$text(args[i]);
            var fn_name = is_parens ? '' : this.fname;
            this.value = fn_name + (is_parens ? contents : inBrackets(contents));
        }
        else if (!(this.group === Groups.S || this.group === Groups.PL)) {
            this.value = Symbol.$text(this, 'hash');
        }
    }

    /**
     * this function defines how every group in stored within a group of
     * higher order think of it as the switchboard for the library. It
     * defines the hashes for symbols.
     * @param {int} group
     */
    keyForGroup(group) {
        var g = this.group;
        var key;

        if (g === Groups.N)  {
            key = this.value;
        }
        else if (g === Groups.S || g === Groups.P) {
            if (group === Groups.PL)
                key = this.power.toDecimal();
            else
                key = this.value;
        }
        else if (g === Groups.FN) {
            if (group === Groups.PL)
                key = this.power.toDecimal();
            else
                key = Symbol.$text(this, 'hash');
        }
        else if (g === Groups.PL) {
            //if the order is reversed then we'll assume multiplication
            //TODO: possible future dilemma
            if (group === Groups.CB)
                key = Symbol.$text(this, 'hash');
            else if (group === Groups.CP) {
                if (this.power.equals(1))
                    key = this.value;
                else
                    key = inBrackets(Symbol.$text(this, 'hash')) + Settings.POWER_OPERATOR + this.power.toDecimal();
            }
            else if (group === Groups.PL)
                key = this.power.toString();
            else
                key = this.value;
            return key;
        }
        else if (g === Groups.CP) {
            if (group === Groups.CP) {
                key = Symbol.$text(this, 'hash');
            }
            if (group === Groups.PL)
                key = this.power.toDecimal();
            else
                key = this.value;
        }
        else if (g === Groups.CB) {
            if (group === Groups.PL)
                key = this.power.toDecimal();
            else
                key = Symbol.$text(this, 'hash');
        }
        else if (g === Groups.EX)  {
            if (group === Groups.PL)
                key = Symbol.$text(this.power);
            else
                key = Symbol.$text(this, 'hash');
        }

        return key;
    }

    /**
     * Symbols are typically stored in an object which works fine for most
     * cases but presents a problem when the order of the symbols makes
     * a difference. This function simply collects all the symbols and
     * returns them as an array. If a function is supplied then that
     * function is called on every symbol contained within the object.
     * @param {Function} fn
     * @param {Object} opt
     * @param {Function} sort_fn
     * @@param {Boolean} expand_symbol
     * @returns {Array}
     */
    collectSymbols(fn, opt, sort_fn, expand_symbol) {
        var collected = [];
        if (!this.symbols)
            collected.push(this);
        else {
            for (var x in this.symbols) {
                var symbol = this.symbols[x];
                if (expand_symbol && (symbol.group === Groups.PL || symbol.group === Groups.CP)) {
                    collected = collected.concat(symbol.collectSymbols());
                }
                else
                    collected.push(fn ? fn(symbol, opt) : symbol);
            }
        }
        if (sort_fn === null)
            sort_fn = undefined; //WTF Firefox? Seriously?

        return collected.sort(sort_fn);//sort hopefully gives us some sort of consistency
    }

    /**
     * Returns the latex representation of the symbol
     * @param {String} option
     * @returns {String}
     */
    latex(option) {
        return Symbol.$LaTeX.latex(this, option);
    }

    /**
     * Returns the text representation of a symbol
     * @param {String} option
     * @returns {String}
     */
    text(option) {
        return Symbol.$text(this, option);
    }

    /**
     * Checks if the function evaluates to 1. e.g. x^0 or 1 :)
     * @@param {bool} abs Compares the absolute value
     */
    isOne(abs) {
        var f = abs ? 'absEquals' : 'equals';
        if (this.group === Groups.N)
            return this.multiplier[f](1);
        else
            return this.power.equals(0);
    }

    isComposite() {
        var g = this.group,
            pg = this.previousGroup;
        return g === Groups.CP || g === Groups.PL || pg === Groups.PL || pg === Groups.CP;
    }

    isCombination() {
        var g = this.group,
            pg = this.previousGroup;
        return g === Groups.CB || pg === Groups.CB;
    }

    lessThan(n) {
        return this.multiplier.lessThan(n);
    }

    greaterThan(n) {
        if (!isSymbol(n)) {
            n = new Symbol(n);
        }

        // We can't tell for sure if a is greater than be if they're not both numbers
        if (!this.isConstant(true) || !n.isConstant(true)) {
            return false;
        }

        return this.multiplier.greaterThan(n.multiplier);
    }

    /**
     * Get's the denominator of the symbol if the symbol is of class Groups.CB (multiplication)
     * with other classes the symbol is either the denominator or not.
     * Take x^-1+x^-2. If the symbol was to be mixed such as x+x^-2 then the symbol doesn't have have an exclusive
     * denominator and has to be found by looking at the actual symbols themselves.
     */
    getDenom() {
        var retval, symbol;
        symbol = this.clone();
        //e.g. 1/(x*(x+1))
        if (this.group === Groups.CB && this.power.lessThan(0))
            symbol = Symbol.$parser.expand(symbol);

        //if the symbol already is the denominator... DONE!!!
        if (symbol.power.lessThan(0)) {
            var d = Symbol.$parser.parse(symbol.multiplier.den);
            retval = symbol.toUnitMultiplier();
            retval.power.negate();
            retval = Symbol.$parser.multiply(d, retval); //put back the coeff
        }
        else if (symbol.group === Groups.CB) {
            retval = Symbol.$parser.parse(symbol.multiplier.den);
            for (var x in symbol.symbols)
                if (symbol.symbols[x].power < 0)
                    retval = Symbol.$parser.multiply(retval, symbol.symbols[x].clone().invert());
        }
        else
            retval = Symbol.$parser.parse(symbol.multiplier.den);
        return retval;
    }

    getNum() {
        var retval, symbol;
        symbol = this.clone();
        //e.g. 1/(x*(x+1))
        if (symbol.group === Groups.CB && symbol.power.lessThan(0))
            symbol = Symbol.$parser.expand(symbol);
        //if the symbol already is the denominator... DONE!!!
        if (symbol.power.greaterThan(0) && symbol.group !== Groups.CB) {
            retval = Symbol.$parser.multiply(Symbol.$parser.parse(symbol.multiplier.num), symbol.toUnitMultiplier());
        }
        else if (symbol.group === Groups.CB) {
            retval = Symbol.$parser.parse(symbol.multiplier.num);
            symbol.each(function (x) {
                if (x.power > 0 || x.group === Groups.EX && x.power.multiplier > 0) {
                    retval = Symbol.$parser.multiply(retval, x.clone());
                }
            });
        }
        else {
            retval = Symbol.$parser.parse(symbol.multiplier.num);
        }
        return retval;
    }

    toString() {
        return this.text();
    }
}

/**
 * Checks to see if the object provided is a Symbol
 * @param {Object} obj
 */
var isSymbol = function (obj) {
    return (obj instanceof Symbol);
};

/**
 * Checks to see if a symbol is in group N
 * @param {Symbol} symbol
 */
var isNumericSymbol = function (symbol) {
    return symbol.group === Groups.N || symbol.group === Groups.P;
};

/**
 * Checks to see if a symbol is a variable with no multiplier nor power
 * @param {Symbol} symbol
 */
var isVariableSymbol = function (symbol) {
    return symbol.group === Groups.S && symbol.multiplier.equals(1) && symbol.power.equals(1);
};


/**
 * Checks to see if a number or Symbol is a fraction
 * @param {Number|Symbol} num
 * @returns {boolean}
 */
var isFraction = function (num) {
    if (isSymbol(num))
        return isFraction(num.multiplier.toDecimal());
    return (num % 1 !== 0);
};

module.exports = { Symbol, isVariableSymbol, isNumericSymbol, isSymbol, isFraction };
