"use strict";
/*
 * Author : Martin Donk
 * Website : http://www.nerdamer.com
 * Email : martin.r.donk@gmail.com
 * Source : https://github.com/jiggzson/nerdamer
 */

const {nround, isInt, isPrime, isNumber, validateName, arrayUnique,
    arrayMin, arrayMax, warn, even, inBrackets, remove, format} = require('./Core/Utils');
const Settings = require('./Settings').Settings;
const {Symbol, isSymbol, isNumericSymbol, isVariableSymbol, isFraction, isNegative} = require("./Core/Symbol");
const {Frac} = require("./Core/Frac");
const Scientific = require('./Core/Scientific').default;
const {Operators} = require('./Parser/Operators');
const {createFunctions, findFunction} = require('./Operators/functions');
const {Groups} = require('./Core/Groups');
const {Slice} = require('./Parser/Slice');
const {Matrix, isMatrix} = require('./Parser/Matrix');
const {Collection} = require('./Parser/Collection');
const {Set, isSet} = require('./Parser/Set');
const {Vector, isVector} = require('./Parser/Vector');
const bigDec = require('decimal.js');
const bigInt = require('./3rdparty/bigInt');
const {Math2} = require('./Core/Math2');
const {PRIMES, generatePrimes} = require('./Core/Math.consts');
const {Token} = require('./Parser/Token');
const {Tokenizer} = require("./Parser/Tokenizer");
const {Expression, isExpression} = require("./Parser/Expression");
const {RPN} = require("./Parser/RPN");
const {Build} = require("./Parser/Build");
const {LaTeX} = require('./LaTeX/LaTeX');

const exceptions = require('./Core/Errors');
const {Complex} = require('./Core/Complex');
const {
    DivisionByZero, ParseError, UndefinedError, OutOfFunctionDomainError,
    MaximumIterationsReached, NerdamerTypeError, ParityError, OperatorError,
    OutOfRangeError, DimensionError, ValueLimitExceededError, NerdamerValueError,
    SolveError, InfiniteLoopError, UnexpectedTokenError, err
} = exceptions;

const nerdamer = (function () {
//version ======================================================================
    const version = '1.1.12';

//inits ========================================================================
    const _ = new Parser(); //nerdamer's parser
    Token.parser = _;
    //import bigInt

    //set the precision to js precision
    bigDec.set({
        precision: 250
    });

//Settings =====================================================================
    const CUSTOM_OPERATORS = {};

    (function () {
        Settings.CACHE.roots = {};
        let x = 40,
            y = 40;
        for (let i = 2; i <= x; i++) {
            for (let j = 2; j <= y; j++) {
                let nthpow = bigInt(i).pow(j);
                Settings.CACHE.roots[nthpow + '-' + j] = i;
            }
        }
    })();

    //Add the groups. These have been reorganized as of v0.5.1 to make CP the highest group
    //The groups that help with organizing during parsing. Note that for FN is still a function even
    //when it's raised to a symbol, which typically results in an EX
    const N = Groups.N, // A number
        P = Groups.P, // A number with a rational power e.g. 2^(3/5).
        S = Groups.S, // A single variable e.g. x.
        EX = Groups.EX, // An exponential
        FN = Groups.FN, // A function
        PL = Groups.PL, // A symbol/expression having same name with different powers e.g. 1/x + x^2
        CB = Groups.CB, // A symbol/expression composed of one or more variables through multiplication e.g. x*y
        CP = Groups.CP; // A symbol/expression composed of one variable and any other symbol or number x+1 or x+y

    const CONST_HASH = Settings.CONST_HASH;

    const PARENTHESIS = Settings.PARENTHESIS;

    const SQRT = Settings.SQRT;

    const ABS = Settings.ABS;

    const FACTORIAL = Settings.FACTORIAL;

    const DOUBLEFACTORIAL = Settings.DOUBLEFACTORIAL;

    //the storage container "memory" for parsed expressions
    const EXPRESSIONS = [];

    //variables
    const VARS = {};

    //the container used to store all the reserved functions
    const RESERVED = [];

    const WARNINGS = [];

    Frac.$Math2 = Math2;
    Symbol.$Math2 = Math2;
    Symbol.$parser = _;
    Symbol.$LaTeX = LaTeX;

//Utils ========================================================================

    /**
     * Checks to see if value is one of nerdamer's reserved names
     * @param {String} value
     * @return boolean
     */
    var isReserved = function (value) {
        return RESERVED.indexOf(value) !== -1;
    };

    /**
     * Checks to see that all symbols in array are the same
     * @param {Symbol[]} arr
     * @returns {boolean}
     */
    var allSame = function (arr) {
        var last = arr[0];
        for (var i = 1, l = arr.length; i < l; i++)
            if (!arr[i].equals(last))
                return false;
        return true;
    };

    /**
     * Generates an object with known variable value for evaluation
     * @param {String} variable
     * @param {any} value Any stringifyable object
     * @returns {Object}
     */
    var knownVariable = function (variable, value) {
        var o = {};
        o[variable] = value;
        return o;
    };



    /**
     * Checks to see if an array contains only numeric values
     * @param {Array} arr
     */
    var allNumeric = function (arr) {
        for (var i = 0; i < arr.length; i++)
            if (!isNumber(arr[i]))
                return false;
        return true;
    };


    /**
     * This method traverses the symbol structure and grabs all the variables in a symbol. The variable
     * names are then returned in alphabetical order.
     * @param {Symbol} obj
     * @param {Boolean} poly
     * @param {Object} vars - An object containing the variables. Do not pass this in as it generated
     * automatically. In the future this will be a Collector object.
     * @returns {String[]} - An array containing variable names
     */
    var variables = function (obj, poly, vars) {
        vars = vars || {
            c: [],
            add: function (value) {
                if (this.c.indexOf(value) === -1 && isNaN(value))
                    this.c.push(value);
            }
        };

        if (isSymbol(obj)) {
            var group = obj.group,
                prevgroup = obj.previousGroup;
            if (group === EX)
                variables(obj.power, poly, vars);

            if (group === CP || group === CB || prevgroup === CP || prevgroup === CB) {
                for (var x in obj.symbols) {
                    variables(obj.symbols[x], poly, vars);
                }
            }
            else if (group === S || prevgroup === S) {
                //very crude needs fixing. TODO
                if (!(obj.value === 'e' || obj.value === 'pi' || obj.value === Settings.IMAGINARY))
                    vars.add(obj.value);
            }
            else if (group === PL || prevgroup === PL) {
                variables(firstObject(obj.symbols), poly, vars);
            }
            else if (group === EX) {
                if (!isNaN(obj.value))
                    vars.add(obj.value);
                variables(obj.power, poly, vars);
            }
            else if (group === FN && !poly) {
                for (var i = 0; i < obj.args.length; i++) {
                    variables(obj.args[i], poly, vars);
                }
            }
        }

        return vars.c.sort();
    };

    /**
     * Returns the sum of an array
     * @param {Array} arr
     * @param {boolean} toNumber
     * @returns {Symbol}
     */
    var arraySum = function (arr, toNumber) {
        var sum = new Symbol(0);
        for (var i = 0; i < arr.length; i++) {
            var x = arr[i];
            // Convert to symbol if not
            sum = _.add(sum, !isSymbol(x) ? _.parse(x) : x);
        }

        return toNumber ? Number(sum) : sum;
    };

    /**
     * Separates out the variables into terms of variabls.
     * e.g. x+y+x*y+sqrt(2)+pi returns
     * {x: x, y: y, x y: x*y, constants: sqrt(2)+pi
     * @param {type} symbol
     * @param {type} o
     * @returns {undefined}
     * @throws {Error} for expontentials
     */
    var separate = function (symbol, o) {
        symbol = _.expand(symbol);
        o = o || {};
        var insert = function (key, sym) {
            if (!o[key])
                o[key] = new Symbol(0);
            o[key] = _.add(o[key], sym.clone());
        };
        symbol.each(function (x) {
            if (x.isConstant('all')) {
                insert('constants', x);
            }
            else if (x.group === S) {
                insert(x.value, x);
            }
            else if (x.group === FN && (x.fname === ABS || x.fname === '')) {
                separate(x.args[0]);
            }
            else if (x.group === EX || x.group === FN) {
                throw new Error('Unable to separate. Term cannot be a function!');
            }
            else {
                insert(variables(x).join(' '), x);
            }
        });

        return o;
    };

    /**
     * Fills holes in an array with zero symbol or generates one with n zeroes
     * @param {Array} arr
     * @param {Number} n
     */
    var fillHoles = function (arr, n) {
        n = n || arr.length;
        for (var i = 0; i < n; i++) {
            var sym = arr[i];
            if (!sym)
                arr[i] = new Symbol(0);
        }
        return arr;
    };

    /**
     * Checks to see if the object provided is an Array
     * @param {Object} arr
     */
    var isArray = function (arr) {
        return Array.isArray(arr);
    };

    /**
     * Safely stringify object
     * @param o
     */
    var stringify = function (o) {
        if (!o)
            return o;
        return String(o);
    };



    /**
     * A helper function to replace parts of string
     * @param {String} str - The original string
     * @param {Integer} from - The starting index
     * @param {Integer} to - The ending index
     * @param {String} with_str - The replacement string
     * @returns {String} - A formatted string
     */
    var stringReplace = function (str, from, to, with_str) {
        return str.substr(0, from) + with_str + str.substr(to, str.length);
    };

    /**
     * the Parser uses this to check if it's allowed to convert the obj to type Symbol
     * @param {Object} obj
     * @returns {boolean}
     */
    var customType = function (obj) {
        return obj !== undefined && obj.custom;
    };

    /**
     * Checks to see if numbers are both negative or are both positive
     * @param {Number} a
     * @param {Number} b
     * @returns {boolean}
     */
    var sameSign = function (a, b) {
        return (a < 0) === (b < 0);
    };

    /**
     * Generates an array with values within a range. Multiplies by a step if provided
     * @param {Number} start
     * @param {Number} end
     * @param {Number} step
     */
    var range = function (start, end, step) {
        var arr = [];
        step = step || 1;
        for (var i = start; i <= end; i++)
            arr.push(i * step);
        return arr;
    };

    /**
     * Returns an array of all the keys in an array
     * @param {Object} obj
     * @returns {Array}
     */
    var keys = Object.keys;

    /**
     * Returns the first encountered item in an object. Items do not have a fixed order in objects
     * so only use if you need any first random or if there's only one item in the object
     * @param {Object} obj
     * @param {String} key Return this key as first object
     * @param {Boolean} both
     * @returns {*}
     */
    var firstObject = function (obj, key, both) {
        for (var x in obj)
            break;

        if (key)
            return x;

        if (both)
            return {
                key: x,
                obj: obj[x]
            };
        return obj[x];
    };

    /**
     * Substitutes out variables for two symbols, parses them to a number and them compares them numerically
     * @param {Symbol} sym1
     * @param {Symbol} sym2
     * @param {String[]} vars - an optional array of variables to use
     * @returns {boolean}
     */
    var compare = function (sym1, sym2, vars) {
        var n = 5; //a random number between 1 and 5 is good enough
        var scope = {}; // scope object with random numbers generated using vars
        var comparison;
        for (var i = 0; i < vars.length; i++)
            scope[vars[i]] = new Symbol(Math.floor(Math.random() * n) + 1);
        block('PARSE2NUMBER', function () {
            comparison = _.parse(sym1, scope).equals(_.parse(sym2, scope));
        });
        return comparison;
    };

    /**
     * Is used to set a user defined function using the function assign operator
     * @param {String} name
     * @param {String[]} params_array
     * @param {String} body
     * @returns {Boolean}
     */
    var setFunction = function (name, params_array, body) {
        validateName(name);
        if (!isReserved(name)) {
            params_array = params_array || variables(_.parse(body));
            // The function gets set to PARSER.mapped function which is just
            // a generic function call.
            _.functions[name] = [_.mapped_function, params_array.length, {
                name: name,
                params: params_array,
                body: body
            }];

            return body;
        }
        return null;
    };



    /**
     * Checks to see if two arrays are equal
     * @param {Array} arr1
     * @param {Array} arr2
     */
    var arrayEqual = function (arr1, arr2) {
        arr1.sort();
        arr2.sort();

        // The must be of the same length
        if (arr1.length === arr2.length) {
            for (var i = 0; i < arr1.length; i++) {
                // If any two items don't match we're done
                if (arr1[i] !== arr2[i]) {
                    return false;
                }
            }
            // Otherwise they're equal
            return true;
        }

        return false;
    };

    /**
     * Clones array with clonable items
     * @param {Array} arr
     * @returns {Array}
     */
    var arrayClone = function (arr) {
        var new_array = [], l = arr.length;
        for (var i = 0; i < l; i++)
            new_array[i] = arr[i].clone();
        return new_array;
    };

    /**
     * Fills numbers between array values
     * @param {number[]} arr
     * @param {Integer} slices
     */
    var arrayAddSlices = function (arr, slices) {
        slices = slices || 20;
        var retval = [];
        var c, delta, e;
        retval.push(arr[0]); //push the beginning
        for (var i = 0; i < arr.length - 1; i++) {
            c = arr[i];
            delta = arr[i + 1] - c; //get the difference
            e = delta / slices; //chop it up in the desired number of slices
            for (var j = 0; j < slices; j++) {
                c += e; //add the mesh to the last slice
                retval.push(c);
            }
        }

        return retval;
    };

    /**
     * Gets nth roots of a number
     * @param {Symbol} symbol
     * @returns {Vector}
     */
    var nroots = function (symbol) {
        var a, b;

        if (symbol.group === FN && symbol.fname === '') {
            a = Symbol.unwrapPARENS(_.parse(symbol).toLinear());
            b = _.parse(symbol.power);
        }
        else if (symbol.group === P) {
            a = _.parse(symbol.value);
            b = _.parse(symbol.power);
        }

        if (a && b && (a.group === N) && b.group === N && a.multiplier.isNegative()) {
            let _roots = [];

            var parts = Symbol.toPolarFormArray(evaluate(symbol));
            var r = parts[0];

            //var r = _.parse(a).abs().toString();

            //https://en.wikipedia.org/wiki/De_Moivre%27s_formula
            var x = _.arg(a);
            var n = b.multiplier.den.toString();
            var p = b.multiplier.num.toString();

            var formula = '(({0})^({1})*(cos({3})+({2})*sin({3})))^({4})';

            for (var i = 0; i < n; i++) {
                var t = evaluate(_.parse(format("(({0})+2*pi*({1}))/({2})", x, i, n))).multiplier.toDecimal();
                _roots.push(evaluate(_.parse(format(formula, r, n, Settings.IMAGINARY, t, p))));
            }
            return Vector.fromArray(_roots);
        }
        else if (symbol.isConstant(true, true)) {
            var sign = symbol.sign();
            var x = evaluate(symbol.abs());
            var root = _.sqrt(x);

            var _roots = [root.clone(), root.negate()];

            if (sign < 0)
                _roots = _roots.map(function (x) {
                    return _.multiply(x, Symbol.imaginary());
                });

        }
        else {
            _roots = [_.parse(symbol)];
        }

        return Vector.fromArray(_roots);
    };

    /**
     * Sorts and array given 2 parameters
     * @param {String} a
     * @param {String} b
     */
    var comboSort = function (a, b) {
        var l = a.length,
            combined = []; //the linker
        for (var i = 0; i < a.length; i++) {
            combined.push([a[i], b[i]]); //create the map
        }

        combined.sort(function (x, y) {
            return x[0] - y[0];
        });

        var na = [], nb = [];

        for (i = 0; i < l; i++) {
            na.push(combined[i][0]);
            nb.push(combined[i][1]);
        }

        return [na, nb];
    };
    /**
     * TODO: Pick a more descriptive name and better description
     * Breaks a function down into it's parts wrt to a variable, mainly coefficients
     * Example a*x^2+b wrt x
     * @param {Symbol} fn
     * @param {String} wrt
     * @param {boolean} as_obj
     */
    var decompose_fn = function (fn, wrt, as_obj) {
        wrt = String(wrt); //convert to string
        var ax, a, x, b;
        if (fn.group === CP) {
            var t = _.expand(fn.clone()).stripVar(wrt);
            ax = _.subtract(fn.clone(), t.clone());
            b = t;
        }
        else
            ax = fn.clone();
        a = ax.stripVar(wrt);
        x = _.divide(ax.clone(), a.clone());
        b = b || new Symbol(0);
        if (as_obj)
            return {
                a: a,
                x: x,
                ax: ax,
                b: b
            };
        return [a, x, ax, b];
    };


    /**
     * Is used for u-substitution. Gets a suitable u for substitution. If for
     * instance a is used in the symbol then it keeps going down the line until
     * one is found that's not in use. If all letters are taken then it
     * starts appending numbers.
     * IMPORTANT! It assumes that the substitution will be undone
     * beore the user gets to interact with the object again.
     * @param {Symbol} symbol
     */
    var getU = function (symbol) {
        //start with u
        var u = 'u', //start with u
            v = u, //init with u
            c = 0, //postfix number
            vars = variables(symbol);
        //make sure this variable isn't reserved and isn't in the variable list
        while(!(RESERVED.indexOf(v) === - 1 && vars.indexOf(v) === - 1))
            v = u + c++;
        //get an empty slot. It seems easier to just push but the
        //problem is that we may have some which are created by clearU
        for (var i = 0, l = RESERVED.length; i <= l; i++)
            //reserved cannot equals false or 0 so we can safely check for a falsy type
            if (!RESERVED[i]) {
                RESERVED[i] = v; //reserve the variable
                break;
            }
        return v;
    };

    /**
     * Clears the u variable so it's no longer reserved
     * @param {String} u
     */
    var clearU = function (u) {
        var indx = RESERVED.indexOf(u);
        if (indx !== -1)
            RESERVED[indx] = undefined;
    };

    /**
     * Loops through each item in object and calls function with item as param
     * @param {Object|Array} obj
     * @param {Function} fn
     */
    var each = function (obj, fn) {
        if (isArray(obj)) {
            var l = obj.length;
            for (var i = 0; i < l; i++)
                fn.call(obj, i);
        }
        else {
            for (var x in obj)
                if (obj.hasOwnProperty(x))
                    fn.call(obj, x);
        }
    };


    /**
     * Checks to see if a fraction is divisible by 2
     * @param {Number} num
     * @returns {boolean}
     */
    var evenFraction = function (num) {
        return 1 / (num % 1) % 2 === 0;
    };



    /**
     * Gets all the variables in an array of Symbols
     * @param {Symbol[]} arr
     */
    var arrayGetVariables = function (arr) {
        var vars = variables(arr[0], null, null, true);

        //get all variables
        for (var i = 1, l = arr.length; i < l; i++)
            vars = vars.concat(variables(arr[i]));
        //remove duplicates
        vars = arrayUnique(vars).sort();

        //done
        return vars;
    };

    /**
     * Removes duplicates from an array. Returns a new array
     * @param {Array} arr
     * @param {Function} condition
     */
    var removeDuplicates = function (arr, condition) {
        var conditionType = typeof condition;

        if (conditionType !== 'function' || conditionType === 'undefined') {
            condition = function (a, b) {
                return a === b;
            };
        }

        var seen = [];

        while(arr.length) {
            var a = arr[0];
            //only one element left so we're done
            if (arr.length === 1) {
                seen.push(a);
                break;
            }
            var temp = [];
            seen.push(a); //we already scanned these
            for (var i = 1; i < arr.length; i++) {
                var b = arr[i];
                //if the number is outside the specified tolerance
                if (!condition(a, b))
                    temp.push(b);
            }
            //start over with the remainder
            arr = temp;
        }

        return seen;
    };

    /**
     * Reserves the names in an object so they cannot be used as function names
     * @param {Object} obj
     */
    var reserveNames = function (obj) {
        var add = function (item) {
            if (RESERVED.indexOf(item) === -1)
                RESERVED.push(item);
        };

        if (typeof obj === 'string')
            add(obj);
        else {
            each(obj, function (x) {
                add(x);
            });
        }
    };



    /**
     * Creates a temporary block in which one of the global settings is temporarily modified while
     * the function is called. For instance if you want to parse directly to a number rather than have a symbolic
     * answer for a period you would set PARSE2NUMBER to true in the block.
     * @example block('PARSE2NUMBER', function(){//symbol being parsed to number}, true);
     * @param {String} setting - The setting being accessed
     * @param {Function} f
     * @param {boolean} opt - The value of the setting in the block
     * @param {String} obj - The obj of interest. Usually a Symbol but could be any object
     */
    var block = function (setting, f, opt, obj) {
        var current_setting = Settings[setting];
        Settings[setting] = opt === undefined ? true : !!opt;
        var retval = f.call(obj);
        Settings[setting] = current_setting;
        return retval;
    };

    /**
     * provide a mechanism for accessing functions directly. Not yet complete!!!
     * Some functions will return undefined. This can maybe just remove the
     * function object at some point when all functions are eventually
     * housed in the global function object. Returns ALL parser available
     * functions. Parser.functions may not contain all functions
     */
    var importFunctions = function () {
        var o = {};
        for (var x in _.functions)
            o[x] = _.functions[x][0];
        return o;
    };

    /**
     * Converts function arguments to an array. Now used by gcd and lcm in Algebra.js :)
     * @param {Array|object} obj
     */
    var arguments2Array = function (obj) {
        return [].slice.call(obj);
    };

    /**
     * Returns the coefficients of a symbol given a variable. Given ax^2+b^x+c, it divides
     * each nth term by x^n.
     * @param {Symbol} symbol
     * @param {Symbol} wrt
     */
    var getCoeffs = function (symbol, wrt, info) {
        var coeffs = [];
        //we loop through the symbols and stick them in their respective
        //containers e.g. y*x^2 goes to index 2
        symbol.each(function (term) {
            if (term.contains(wrt)) {
                //we want only the coefficient which in this case will be everything but the variable
                //e.g. a*b*x -> a*b if the variable to solve for is x
                var coeff = term.stripVar(wrt),
                    x = _.divide(term.clone(), coeff.clone()),
                    p = x.power.toDecimal();
            }
            else {
                coeff = term;
                p = 0;
            }
            var e = coeffs[p];
            //if it exists just add it to it
            coeffs[p] = e ? _.add(e, coeff) : coeff;

        }, true);

        for (var i = 0; i < coeffs.length; i++)
            if (!coeffs[i])
                coeffs[i] = new Symbol(0);
        //fill the holes
        return coeffs;
    };

    /**
     * As the name states. It forces evaluation of the expression
     * @param {Symbol} symbol
     * @param {Symbol} o
     */
    var evaluate = function (symbol, o= undefined) {
        return block('PARSE2NUMBER', function () {
            return _.parse(symbol, o);
        }, true);
    };
    Symbol.$evaluate = evaluate;

    /**
     * Converts an array to a vector. Consider moving this to Vector.fromArray
     * @param {String[]|String|Symbol|Number|Number[]} x
     */
    var convertToVector = function (x) {
        if (isArray(x)) {
            var vector = new Vector([]);
            for (var i = 0; i < x.length; i++)
                vector.elements.push(convertToVector(x[i]));
            return vector;
        }
        //Ensure that a nerdamer ready object is returned
        if (!isSymbol(x))
            return _.parse(x);
        return x;
    };

    /**
     * Checks to see if all arguments are numbers
     * @param {object} args
     */
    var allNumbers = function (args) {
        for (var i = 0; i < args.length; i++)
            if (args[i].group !== N)
                return false;
        return true;
    };
    /*
     * Checks if all arguments aren't just all number but if they
     * are constants as well e.g. pi, e.
     * @param {object} args
     */
    var allConstants = function (args) {
        for (var i = 0; i < args.length; i++) {
            if (args[i].isPi() || args[i].isE())
                continue;
            if (!args[i].isConstant(true))
                return false;
        }
        return true;
    };

    /**
     * Used to multiply two expression in expanded form
     * @param {Symbol} a
     * @param {Symbol} b
     */
    var mix = function (a, b, opt) {
        // Flip them if b is a CP or PL and a is not
        if (b.isComposite() && !a.isComposite() || b.isLinear() && !a.isLinear()) {
            [a, b] = [b, a];
        }
        // A temporary variable to hold the expanded terms
        var t = new Symbol(0);
        if (a.isLinear()) {
            a.each(function (x) {
                // If b is not a PL or a CP then simply multiply it
                if (!b.isComposite()) {
                    var term = _.multiply(_.parse(x), _.parse(b));
                    t = _.add(t, _.expand(term, opt));
                }
                // Otherwise multiply out each term.
                else if (b.isLinear()) {
                    b.each(function (y) {
                        var term = _.multiply(_.parse(x), _.parse(y));
                        var expanded = _.expand(_.parse(term), opt);
                        t = _.add(t, expanded);
                    }, true);
                }
                else {
                    t = _.add(t, _.multiply(x, _.parse(b)));
                }
            }, true);
        }
        else {
            // Just multiply them together
            t = _.multiply(a, b);
        }

        // The expanded function is now t
        return t;
    };

    //link the Math2 object to Settings.FUNCTION_MODULES
    Settings.FUNCTION_MODULES.push(Math2);
    reserveNames(Math2); //reserve the names in Math2

//Global functions =============================================================
    /**
     * This method will return a hash or a text representation of a Symbol, Matrix, or Vector.
     * If all else fails it *assumes* the object has a toString method and will call that.
     *
     * @param {Object} obj
     * @param {String} option get is as a hash
     * @param {int} useGroup
     * @returns {String}
     */
    function text(obj, option, useGroup, decp) {
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
                case N:
                    multiplier = '';
                    //round if requested
                    var m = decp && asDecimal ? obj.multiplier.toDecimal(decp) : toString(obj.multiplier);
                    //if it's numerical then all we need is the multiplier
                    value = String(obj.multiplier) == '-1' ? '1' : m;
                    power = '';
                    break;
                case PL:
                    value = obj.collectSymbols().map(function (x) {
                        var txt = text(x, opt, useGroup, decp);
                        if (txt == '0')
                            txt = '';
                        return txt;
                    }).sort().join('+').replace(/\+\-/g, '-');
                    break;
                case CP:
                    value = obj.collectSymbols().map(function (x) {
                        var txt = text(x, opt, useGroup, decp);
                        if (txt == '0')
                            txt = '';
                        return txt;
                    }).sort().join('+').replace(/\+\-/g, '-');
                    break;
                case CB:
                    value = obj.collectSymbols(function (symbol) {
                        var g = symbol.group;
                        //both groups will already be in brackets if their power is greater than 1
                        //so skip it.
                        if ((g === PL || g === CP) && (symbol.power.equals(1) && symbol.multiplier.equals(1))) {
                            return inBrackets(text(symbol, opt));
                        }
                        return text(symbol, opt);
                    }).join('*');
                    break;
                case EX:
                    var pg = obj.previousGroup,
                        pwg = obj.power.group;

                    //PL are the exception. It's simpler to just collect and set the value
                    if (pg === PL)
                        value = obj.collectSymbols(text, opt).join('+').replace('+-', '-');
                    if (!(pg === N || pg === S || pg === FN) && !asHash) {
                        value = inBrackets(value);
                    }

                    if ((pwg === CP || pwg === CB || pwg === PL || obj.power.multiplier.toString() != '1') && power) {
                        power = inBrackets(power);
                    }
                    break;
            }

            if (group === FN) {
                value = obj.fname + inBrackets(obj.args.map(function (symbol) {
                    return text(symbol, opt);
                }).join(','));
            }
            //TODO: Needs to be more efficient. Maybe.
            if (group === FN && obj.fname in CUSTOM_OPERATORS) {
                var a = text(obj.args[0]);
                var b = text(obj.args[1]);
                if (obj.args[0].isComposite()) //preserve the brackets
                    a = inBrackets(a);
                if (obj.args[1].isComposite()) //preserve the brackets
                    b = inBrackets(b);
                value = a + CUSTOM_OPERATORS[obj.fname] + b;
            }
            //wrap the power since / is less than ^
            //TODO: introduce method call isSimple
            if (power && group !== EX && wrapCondition(power)) {
                power = inBrackets(power);
            }

            //the following groups are held together by plus or minus. They can be raised to a power or multiplied
            //by a multiplier and have to be in brackets to preserve the order of precedence
            if (((group === CP || group === PL) && (multiplier && multiplier != '1' || sign === '-'))
                || ((group === CB || group === CP || group === PL) && (power && power != '1'))
                || !asHash && group === P && value == -1
                || obj.fname === PARENTHESIS) {

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
            if (group === EX && value.charAt(0) === '-') {
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
    _._text = text;

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
    ;
    primeFactors(314146179365)
//Expression ===================================================================
    Expression.prototype.$ = _;
    Expression.prototype.$evaluate = evaluate;
    Expression.prototype.$text = text;



//Frac =========================================================================

//Symbol =======================================================================

//Parser =======================================================================
    //Uses modified Shunting-yard algorithm. http://en.wikipedia.org/wiki/Shunting-yard_algorithm
    function Parser() {
        //Point to the local parser instead of the global one
        var _ = this;
        var bin = {};
        var preprocessors = {names: [], actions: []};

//Parser.classes ===============================================================

        // Slice & Collection injections
        Slice.prototype.$text = _._text;
        Collection.prototype.$pretty_print = _.pretty_print;


        //create link to classes
        this.classes = {
            Collection: Collection,
            Slice: Slice,
            Token: Token
        };
//Parser.modules ===============================================================
        //object for functions which handle complex number
        let complex = Complex;
        Complex.$ = _;
        Complex.$log = log;
        Complex.$sqrt = sqrt;
        Complex.$block = block;

        //object for functions which handle trig
        var trig = this.trig = {
            //container for trigonometric function
            cos: function (symbol) {
                if (symbol.equals('pi') && symbol.multiplier.den.equals(2))
                    return new Symbol(0);

                if (Settings.PARSE2NUMBER) {
                    if (symbol.equals(new Symbol(Settings.PI / 2)))
                        return new Symbol(0);
                    if (symbol.isConstant()) {
                        if (Settings.USE_BIG) {
                            return new Symbol(bigDec.cos(symbol.multiplier.toDecimal()));
                        }

                        return new Symbol(Math.cos(symbol.valueOf()));
                    }
                    if (symbol.isImaginary()) {
                        return complex.evaluate(symbol, 'cos');
                    }
                }
                if (symbol.equals(0))
                    return new Symbol(1);

                var retval,
                    c = false,
                    q = getQuadrant(symbol.multiplier.toDecimal()),
                    m = symbol.multiplier.abs();
                symbol.multiplier = m;

                if (symbol.isPi() && symbol.isLinear()) {
                    //return for 1 or -1 for multiples of pi
                    if (isInt(m)) {
                        retval = new Symbol(even(m) ? 1 : -1);
                    }
                    else {
                        var n = Number(m.num), d = Number(m.den);
                        if (d === 2)
                            retval = new Symbol(0);
                        else if (d === 3) {
                            retval = _.parse('1/2');
                            c = true;
                        }
                        else if (d === 4) {
                            retval = _.parse('1/sqrt(2)');
                            c = true;
                        }
                        else if (d === 6) {
                            retval = _.parse('sqrt(3)/2');
                            c = true;
                        }
                        else
                            retval = _.symfunction('cos', [symbol]);
                    }
                }

                if (c && (q === 2 || q === 3))
                    retval.negate();

                if (!retval)
                    retval = _.symfunction('cos', [symbol]);

                return retval;
            },
            sin: function (symbol) {
                if (Settings.PARSE2NUMBER) {
                    if (symbol.isConstant()) {
                        if (symbol % Math.PI === 0) {
                            return new Symbol(0);
                        }

                        if (Settings.USE_BIG) {
                            return new Symbol(bigDec.sin(symbol.multiplier.toDecimal()));
                        }

                        return new Symbol(Math.sin(symbol.valueOf()));
                    }
                    if (symbol.isImaginary())
                        return complex.evaluate(symbol, 'sin');
                }

                if (symbol.equals(0))
                    return new Symbol(0);

                var retval,
                    c = false,
                    q = getQuadrant(symbol.multiplier.toDecimal()),
                    sign = symbol.multiplier.sign(),
                    m = symbol.multiplier.abs();
                symbol.multiplier = m;
                if (symbol.equals('pi'))
                    retval = new Symbol(0);
                else if (symbol.isPi() && symbol.isLinear()) {
                    //return for 0 for multiples of pi
                    if (isInt(m)) {
                        retval = new Symbol(0);
                    }
                    else {
                        var n = m.num, d = m.den;
                        if (d == 2) {
                            retval = new Symbol(1);
                            c = true;
                        }
                        else if (d == 3) {
                            retval = _.parse('sqrt(3)/2');
                            c = true
                        }
                        else if (d == 4) {
                            retval = _.parse('1/sqrt(2)');
                            c = true;
                        }
                        else if (d == 6) {
                            retval = _.parse('1/2');
                            c = true;
                        }
                        else
                            retval = _.multiply(new Symbol(sign), _.symfunction('sin', [symbol]));
                    }
                }

                if (!retval)
                    retval = _.multiply(new Symbol(sign), _.symfunction('sin', [symbol]));

                if (c && (q === 3 || q === 4))
                    retval.negate();

                return retval;
            },
            tan: function (symbol) {
                if (Settings.PARSE2NUMBER) {
                    if (symbol % Math.PI === 0 && symbol.isLinear()) {
                        return new Symbol(0);
                    }
                    if (symbol.isConstant()) {
                        if (Settings.USE_BIG) {
                            return new Symbol(bigDec.tan(symbol.multiplier.toDecimal()));
                        }

                        return new Symbol(Math.tan(symbol.valueOf()));
                    }
                    if (symbol.isImaginary())
                        return complex.evaluate(symbol, 'tan');
                }
                var retval,
                    c = false,
                    q = getQuadrant(symbol.multiplier.toDecimal()),
                    m = symbol.multiplier;

                symbol.multiplier = m;

                if (symbol.isPi() && symbol.isLinear()) {
                    //return 0 for all multiples of pi
                    if (isInt(m)) {
                        retval = new Symbol(0);
                    }
                    else {
                        var n = m.num, d = m.den;
                        if (d == 2)
                            throw new UndefinedError('tan is undefined for ' + symbol.toString());
                        else if (d == 3) {
                            retval = _.parse('sqrt(3)');
                            c = true;
                        }
                        else if (d == 4) {
                            retval = new Symbol(1);
                            c = true;
                        }
                        else if (d == 6) {
                            retval = _.parse('1/sqrt(3)');
                            c = true;
                        }
                        else
                            retval = _.symfunction('tan', [symbol]);
                    }
                }

                if (!retval)
                    retval = _.symfunction('tan', [symbol]);

                if (c && (q === 2 || q === 4))
                    retval.negate();

                return retval;
            },
            sec: function (symbol) {
                if (Settings.PARSE2NUMBER) {
                    if (symbol.isConstant()) {
                        if (Settings.USE_BIG) {
                            return new Symbol(new bigDec(1).dividedBy(bigDec.cos(symbol.multiplier.toDecimal())));
                        }

                        return new Symbol(Math2.sec(symbol.valueOf()));
                    }
                    if (symbol.isImaginary())
                        return complex.evaluate(symbol, 'sec');
                    return _.parse(format('1/cos({0})', symbol));
                }

                var retval,
                    c = false,
                    q = getQuadrant(symbol.multiplier.toDecimal()),
                    m = symbol.multiplier.abs();
                symbol.multiplier = m;

                if (symbol.isPi() && symbol.isLinear()) {
                    //return for 1 or -1 for multiples of pi
                    if (isInt(m)) {
                        retval = new Symbol(even(m) ? 1 : -1);
                    }
                    else {
                        var n = m.num, d = m.den;
                        if (d == 2)
                            throw new UndefinedError('sec is undefined for ' + symbol.toString());
                        else if (d == 3) {
                            retval = new Symbol(2);
                            c = true;
                        }
                        else if (d == 4) {
                            retval = _.parse('sqrt(2)');
                            c = true;
                        }
                        else if (d == 6) {
                            retval = _.parse('2/sqrt(3)');
                            c = true;
                        }
                        else
                            retval = _.symfunction('sec', [symbol]);
                    }
                }

                if (c && (q === 2 || q === 3))
                    retval.negate();

                if (!retval)
                    retval = _.symfunction('sec', [symbol]);

                return retval;
            },
            csc: function (symbol) {
                if (Settings.PARSE2NUMBER) {
                    if (symbol.isConstant()) {
                        if (Settings.USE_BIG) {
                            return new Symbol(new bigDec(1).dividedBy(bigDec.sin(symbol.multiplier.toDecimal())));
                        }

                        return new Symbol(Math2.csc(symbol.valueOf()));
                    }
                    if (symbol.isImaginary())
                        return complex.evaluate(symbol, 'csc');
                    return _.parse(format('1/sin({0})', symbol));
                }

                var retval,
                    c = false,
                    q = getQuadrant(symbol.multiplier.toDecimal()),
                    sign = symbol.multiplier.sign(),
                    m = symbol.multiplier.abs();

                symbol.multiplier = m;

                if (symbol.isPi() && symbol.isLinear()) {
                    //return for 0 for multiples of pi
                    if (isInt(m)) {
                        throw new UndefinedError('csc is undefined for ' + symbol.toString());
                    }
                    else {
                        var n = m.num, d = m.den;
                        if (d == 2) {
                            retval = new Symbol(1);
                            c = true;
                        }
                        else if (d == 3) {
                            retval = _.parse('2/sqrt(3)');
                            c = true
                        }
                        else if (d == 4) {
                            retval = _.parse('sqrt(2)');
                            c = true;
                        }
                        else if (d == 6) {
                            retval = new Symbol(2);
                            c = true;
                        }
                        else
                            retval = _.multiply(new Symbol(sign), _.symfunction('csc', [symbol]));
                    }
                }

                if (!retval)
                    retval = _.multiply(new Symbol(sign), _.symfunction('csc', [symbol]));

                if (c && (q === 3 || q === 4))
                    retval.negate();

                return retval;
            },
            cot: function (symbol) {
                if (Settings.PARSE2NUMBER) {
                    if (symbol % (Math.PI/2) === 0) {
                        return new Symbol(0);
                    }
                    if (symbol.isConstant()) {
                        if (Settings.USE_BIG) {
                            return new Symbol(new bigDec(1).dividedBy(bigDec.tan(symbol.multiplier.toDecimal())));
                        }

                        return new Symbol(Math2.cot(symbol.valueOf()));
                    }
                    if (symbol.isImaginary())
                        return complex.evaluate(symbol, 'cot');
                    return _.parse(format('1/tan({0})', symbol));
                }
                var retval,
                    c = false,
                    q = getQuadrant(symbol.multiplier.toDecimal()),
                    m = symbol.multiplier;

                symbol.multiplier = m;

                if (symbol.isPi() && symbol.isLinear()) {
                    //return 0 for all multiples of pi
                    if (isInt(m)) {
                        throw new UndefinedError('cot is undefined for ' + symbol.toString());
                    }
                    else {
                        var n = m.num, d = m.den;
                        if (d == 2)
                            retval = new Symbol(0);
                        else if (d == 3) {
                            retval = _.parse('1/sqrt(3)');
                            c = true;
                        }
                        else if (d == 4) {
                            retval = new Symbol(1);
                            c = true;
                        }
                        else if (d == 6) {
                            retval = _.parse('sqrt(3)');
                            c = true;
                        }
                        else
                            retval = _.symfunction('cot', [symbol]);
                    }
                }

                if (!retval)
                    retval = _.symfunction('cot', [symbol]);

                if (c && (q === 2 || q === 4))
                    retval.negate();

                return retval;
            },
            acos: function (symbol) {
                if (Settings.PARSE2NUMBER) {
                    if (symbol.isConstant()) {
                        // Handle values in the complex domain
                        if (symbol.gt(1) || symbol.lt(-1)) {
                            var x = symbol.toString();
                            return expand(evaluate(`pi/2-asin(${x})`));
                        }
                        // Handle big numbers
                        if (Settings.USE_BIG) {
                            return new Symbol(bigDec.acos(symbol.multiplier.toDecimal()));
                        }

                        return new Symbol(Math.acos(symbol.valueOf()));
                    }
                    if (symbol.isImaginary())
                        return complex.evaluate(symbol, 'acos');
                }
                return _.symfunction('acos', arguments);
            },
            asin: function (symbol) {
                if (Settings.PARSE2NUMBER) {
                    if (symbol.isConstant()) {
                        // Handle values in the complex domain
                        if (symbol.gt(1) || symbol.lt(-1)) {
                            var i = Settings.IMAGINARY;
                            var x = symbol.multiplier.toDecimal();
                            return expand(evaluate(`${i}*log(sqrt(1-${x}^2)-${i}*${x})`));
                        }
                        // Handle big numbers
                        if (Settings.USE_BIG) {
                            return new Symbol(bigDec.asin(symbol.multiplier.toDecimal()));
                        }

                        return new Symbol(Math.asin(symbol.valueOf()));
                    }
                    if (symbol.isImaginary())
                        return complex.evaluate(symbol, 'asin');
                }
                return _.symfunction('asin', arguments);
            },
            atan: function (symbol) {
                var retval;
                if (symbol.equals(0))
                    retval = new Symbol(0);
                else if (Settings.PARSE2NUMBER) {
                    if (symbol.isConstant()) {
                        // Handle big numbers
                        if (Settings.USE_BIG) {
                            return new Symbol(bigDec.atan(symbol.multiplier.toDecimal()));
                        }

                        return new Symbol(Math.atan(symbol.valueOf()));
                    }
                    if (symbol.isImaginary())
                        return complex.evaluate(symbol, 'atan');
                    return _.symfunction('atan', arguments);
                }
                else if (symbol.equals(-1))
                    retval = _.parse('-pi/4');
                else
                    retval = _.symfunction('atan', arguments);
                return retval;
            },
            asec: function (symbol) {
                if (Settings.PARSE2NUMBER) {
                    if (symbol.equals(0)) {
                        throw new OutOfFunctionDomainError('Input is out of the domain of sec!');
                    }
                    if (symbol.isConstant()) {
                        return trig.acos(symbol.invert());
                    }
                    if (symbol.isImaginary()) {
                        return complex.evaluate(symbol, 'asec');
                    }
                }
                return _.symfunction('asec', arguments);
            },
            acsc: function (symbol) {
                if (Settings.PARSE2NUMBER) {
                    if (symbol.isConstant()) {
                        return trig.asin(symbol.invert());
                    }

                    if (symbol.isImaginary())
                        return complex.evaluate(symbol, 'acsc');
                }
                return _.symfunction('acsc', arguments);
            },
            acot: function (symbol) {
                if (Settings.PARSE2NUMBER) {
                    if (symbol.isConstant()) {
                        return new _.add(_.parse('pi/2'), trig.atan(symbol).negate());
                    }

                    if (symbol.isImaginary())
                        return complex.evaluate(symbol, 'acot');
                }
                return _.symfunction('acot', arguments);
            },
            atan2: function (a, b) {
                if (a.equals(0) && b.equals(0))
                    throw new UndefinedError('atan2 is undefined for 0, 0');

                if (Settings.PARSE2NUMBER && a.isConstant() && b.isConstant()) {
                    return new Symbol(Math.atan2(a, b));
                }
                return _.symfunction('atan2', arguments);
            }
        };
        //object for functions which handle hyperbolic trig
        var trigh = this.trigh = {
            //container for hyperbolic trig function
            cosh: function (symbol) {
                var retval;
                if (Settings.PARSE2NUMBER) {
                    if (symbol.isConstant())
                        return new Symbol(Math.cosh(symbol.valueOf()));
                    if (symbol.isImaginary()) {
                        return complex.evaluate(symbol, 'cosh');
                    }
                }

                return retval = _.symfunction('cosh', arguments);
            },
            sinh: function (symbol) {
                var retval;
                if (Settings.PARSE2NUMBER) {
                    if (symbol.isConstant())
                        return new Symbol(Math.sinh(symbol.valueOf()));
                    if (symbol.isImaginary()) {
                        return complex.evaluate(symbol, 'sinh');
                    }
                }

                return retval = _.symfunction('sinh', arguments);
            },
            tanh: function (symbol) {
                var retval;
                if (Settings.PARSE2NUMBER) {
                    if (symbol.isConstant())
                        return new Symbol(Math.tanh(symbol.valueOf()));
                    if (symbol.isImaginary()) {
                        return complex.evaluate(symbol, 'tanh');
                    }
                }

                return retval = _.symfunction('tanh', arguments);
            },
            sech: function (symbol) {
                var retval;
                if (Settings.PARSE2NUMBER) {
                    if (symbol.isConstant()) {
                        return new Symbol(Math.sech(symbol.valueOf()));
                    }
                    if (symbol.isImaginary()) {
                        return complex.evaluate(symbol, 'sech');
                    }
                    return _.parse(format('1/cosh({0})', symbol));
                }

                return retval = _.symfunction('sech', arguments);
            },
            csch: function (symbol) {
                var retval;
                if (Settings.PARSE2NUMBER) {
                    if (symbol.isConstant())
                        return new Symbol(Math.csch(symbol.valueOf()));
                    if (symbol.isImaginary()) {
                        return complex.evaluate(symbol, 'csch');
                    }
                    return _.parse(format('1/sinh({0})', symbol));
                }

                return retval = _.symfunction('csch', arguments);
            },
            coth: function (symbol) {
                var retval;
                if (Settings.PARSE2NUMBER) {
                    if (symbol.isConstant())
                        return new Symbol(Math.coth(symbol.valueOf()));
                    if (symbol.isImaginary()) {
                        return complex.evaluate(symbol, 'coth');
                    }
                    return _.parse(format('1/tanh({0})', symbol));
                }

                return retval = _.symfunction('coth', arguments);
            },
            acosh: function (symbol) {
                var retval;
                if (Settings.PARSE2NUMBER && symbol.isImaginary())
                    retval = complex.evaluate(symbol, 'acosh');
                else if (Settings.PARSE2NUMBER)
                    retval = evaluate(_.parse(format(Settings.LOG + '(({0})+sqrt(({0})^2-1))', symbol.toString())));
                else
                    retval = _.symfunction('acosh', arguments);
                return retval;
            },
            asinh: function (symbol) {
                var retval;
                if (Settings.PARSE2NUMBER && symbol.isImaginary())
                    retval = complex.evaluate(symbol, 'asinh');
                else if (Settings.PARSE2NUMBER)
                    retval = evaluate(_.parse(format(Settings.LOG + '(({0})+sqrt(({0})^2+1))', symbol.toString())));
                else
                    retval = _.symfunction('asinh', arguments);
                return retval;
            },
            atanh: function (symbol) {
                var retval;
                if (Settings.PARSE2NUMBER && symbol.isImaginary())
                    retval = complex.evaluate(symbol, 'atanh');
                else if (Settings.PARSE2NUMBER) {
                    retval = evaluate(_.parse(format('(1/2)*' + Settings.LOG + '((1+({0}))/(1-({0})))', symbol.toString())));
                }
                else
                    retval = _.symfunction('atanh', arguments);
                return retval;
            },
            asech: function (symbol) {
                var retval;
                if (Settings.PARSE2NUMBER && symbol.isImaginary())
                    retval = complex.evaluate(symbol, 'asech');
                else if (Settings.PARSE2NUMBER)
                    retval = evaluate(log(_.add(symbol.clone().invert(), sqrt(_.subtract(_.pow(symbol, new Symbol(-2)), new Symbol(1))))));
                else
                    retval = _.symfunction('asech', arguments);
                return retval;
            },
            acsch: function (symbol) {
                var retval;
                if (Settings.PARSE2NUMBER && symbol.isImaginary())
                    retval = complex.evaluate(symbol, 'acsch');
                else if (Settings.PARSE2NUMBER)
                    retval = evaluate(_.parse(format(Settings.LOG + '((1+sqrt(1+({0})^2))/({0}))', symbol.toString())));
                else
                    retval = _.symfunction('acsch', arguments);
                return retval;
            },
            acoth: function (symbol) {
                var retval;
                if (Settings.PARSE2NUMBER && symbol.isImaginary())
                    retval = complex.evaluate(symbol, 'acoth');
                else if (Settings.PARSE2NUMBER) {
                    if (symbol.equals(1))
                        retval = Symbol.infinity();
                    else
                        retval = evaluate(
                            _.divide(
                                log(_.divide(_.add(symbol.clone(), new Symbol(1)), _.subtract(symbol.clone(), new Symbol(1)))),
                                new Symbol(2)));
                }
                else
                    retval = _.symfunction('acoth', arguments);
                return retval;
            }
        };
        //list of supported units
        this.units = {};
        //list all the supported operators
        //brackets

        let operators = new Operators();
        operators.injectOperatorsDeps({
            symfunction: (...args) => this.symfunction(...args),
            factorial: (...args) => factorial(...args),
            divide: (...args) => this.divide(...args),
            registerOperator: (name, operation) => _[name] = operation,
        });

        // backward compatibility hooks
        this.isOperator = (...args) => operators.isOperator(...args);
        this.getOperator = (...args) => operators.getOperator(...args);
        this.getOperators = (...args) => operators.getOperators(...args);
        this.getOperatorsClass = () => operators;
        this.getBrackets = (...args) => operators.getBrackets(...args);
        this.aliasOperator = (...args) => operators.aliasOperator(...args);
        this.setOperator = (...args) => operators.setOperator(...args);

        let brackets = operators.getBrackets();

        let functions = this.functions = createFunctions({
            trig, trigh, exp, radians, degrees, print,
            min, max, sinc, sign, factorial, continued_fraction,
            round, scientific, mod, pfactor, vector, matrix,
            imatrix, parens, sqrt, nthroot, set, cbrt, log,
            expandall, abs, invert, determinant, size, transpose, dot,
            cross, vecget, vectrim, matget, matset, matgetrow, matsetrow,
            matgetcol, matsetcol, rationalize, IF, is_in, realpart,
            imagpart, conjugate, arg, polarform, rectform, sort, union,
            contains, intersection, difference, intersects, is_subset,
        });

        this.getFunctions = () => (functions);

        //error handler
        this.error = err;


        /**
         * This method gives the ability to override operators with new methods.
         * @param {String} which
         * @param {Function} with_what
         */
        this.override = function (which, with_what) {
            if (!bin[which])
                bin[which] = [];
            bin[which].push(this[which]);
            this[which] = with_what;
        };

        /**
         * Restores a previously overridden operator
         * @param {String} what
         */
        this.restore = function (what) {
            if (this[what])
                this[what] = bin[what].pop();
        };

        /**
         * This method is supposed to behave similarly to the override method but it does not override
         * the existing function rather it only extends it
         * @param {String} what
         * @param {Function} with_what
         * @param {boolean} force_call
         */
        this.extend = function (what, with_what, force_call) {
            var _ = this,
                extended = this[what];
            if (typeof extended === 'function' && typeof with_what === 'function') {
                var f = this[what];
                this[what] = function (a, b) {
                    if (isSymbol(a) && isSymbol(b) && !force_call)
                        return f.call(_, a, b);
                    else
                        return with_what.call(_, a, b, f);
                };
            }
        };

        /**
         * Generates library's representation of a function. It's a fancy way of saying a symbol with
         * a few extras. The most important thing is that that it gives a fname and
         * an args property to the symbols in addition to changing its group to FN
         * @param {String} fn_name
         * @param {Array} params
         * @returns {Symbol}
         */
        this.symfunction = function (fn_name, params) {
            //call the proper function and return the result;
            var f = new Symbol(fn_name);
            f.group = FN;
            if (typeof params === 'object')
                params = [].slice.call(params);//ensure an array
            f.args = params;
            f.fname = fn_name === PARENTHESIS ? '' : fn_name;
            f.updateHash();
            return f;
        };

        /**
         * An internal function call for the Parser. This will either trigger a real
         * function call if it can do so or just return a symbolic representation of the
         * function using symfunction.
         * @param {String} fn_name
         * @param {Array} args
         * @param {int} allowed_args
         * @returns {Symbol}
         */
        this.callfunction = function (fn_name, args, allowed_args) {
            var fn_settings = functions[fn_name];

            if (!fn_settings)
                err('Nerdamer currently does not support the function ' + fn_name);

            var num_allowed_args = fn_settings[1] || allowed_args, //get the number of allowed arguments
                fn = fn_settings[0], //get the mapped function
                retval;
            //We want to be able to call apply on the arguments or create a symfunction. Both require
            //an array so make sure to wrap the argument in an array.
            if (!(args instanceof Array))
                args = args !== undefined ? [args] : [];

            if (num_allowed_args !== -1) {
                var is_array = isArray(num_allowed_args),
                    min_args = is_array ? num_allowed_args[0] : num_allowed_args,
                    max_args = is_array ? num_allowed_args[1] : num_allowed_args,
                    num_args = args.length;

                var error_msg = fn_name + ' requires a {0} of {1} arguments. {2} provided!';

                if (num_args < min_args)
                    err(format(error_msg, 'minimum', min_args, num_args));
                if (num_args > max_args)
                    err(format(error_msg, 'maximum', max_args, num_args));
            }

            /*
             * The following are very important to the how nerdamer constructs functions!
             * Assumption 1 - if fn is undefined then handling of the function is purely numeric. This
             *     enables us to reuse Math, Math2, ..., any function from Settings.FUNCTIONS_MODULES entry
             * Assumption 2 - if fn is defined then that function takes care of EVERYTHING including symbolics
             * Assumption 3 - if the user calls symbolics on a function that returns a numeric value then
             *     they are expecting a symbolic output.
             */
            //check if arguments are all numers
            var numericArgs = allNumbers(args);
            //Big number support. Check if Big number is requested and the arguments are all numeric and, not imaginary
//            if (Settings.USE_BIG && numericArgs) {
//                retval = Big[fn_name].apply(undefined, args);
//            }
//            else {
            if (!fn) {
                //Remember assumption 1. No function defined so it MUST be numeric in nature
                fn = findFunction(fn_name);
                if (Settings.PARSE2NUMBER && numericArgs)
                    retval = bigConvert(fn.apply(fn, args));
                else
                    retval = _.symfunction(fn_name, args);
            }
            else {
                //Remember assumption 2. The function is defined so it MUST handle all aspects including numeric values
                retval = fn.apply(fn_settings[2], args);
            }
//            }

            return retval;
        };


        /*
         * Preforms preprocessing on the string. Useful for making early modification before
         * sending to the parser
         * @param {String} e
         */
        var prepare_expression = function (e) {
            /*
             * Since variables cannot start with a number, the assumption is made that when this occurs the
             * user intents for this to be a coefficient. The multiplication symbol in then added. The same goes for
             * a side-by-side close and open parenthesis
             */
            e = String(e);
            //apply preprocessors
            for (var i = 0; i < preprocessors.actions.length; i++)
                e = preprocessors.actions[i].call(this, e);

            //e = e.split(' ').join('');//strip empty spaces
            //replace multiple spaces with one space
            e = e.replace(/\s+/g, ' ');

            //only even bother to check if the string contains e. This regex is painfully slow and might need a better solution. e.g. hangs on (0.06/3650))^(365)
            if (/e/gi.test(e)) {
                e = e.replace(/\-*\d+\.*\d*e\+?\-?\d+/gi, function (x) {
                    return Math2.scientificToDecimal(x);
                });
            }
            //replace scientific numbers

            //allow omission of multiplication after coefficients
            e = e.replace(Settings.IMPLIED_MULTIPLICATION_REGEX, function () {
                var str = arguments[4],
                    group1 = arguments[1],
                    group2 = arguments[2],
                    start = arguments[3],
                    first = str.charAt(start),
                    before = '',
                    d = '*';
                if (!first.match(/[\+\-\/\*]/))
                    before = str.charAt(start - 1);
                if (before.match(/[a-z]/i))
                    d = '';
                return group1 + d + group2;
            })
                .replace(/([a-z0-9_]+)/gi, function (match, a) {
                    if (Settings.USE_MULTICHARACTER_VARS === false && !(a in functions)) {
                        if (!isNaN(a))
                            return a;
                        return a.split('').join('*');
                    }
                    return a;
                })
                //allow omission of multiplication sign between brackets
                .replace(/\)\(/g, ')*(') || '0';
            //replace x(x+a) with x*(x+a)
            while(true) {
                var e_org = e; //store the original
                e = e.replace(/([a-z0-9_]+)(\()|(\))([a-z0-9]+)/gi, function (match, a, b, c, d) {
                    var g1 = a || c,
                        g2 = b || d;
                    if (g1 in functions) //create a passthrough for functions
                        return g1 + g2;
                    return g1 + '*' + g2;
                });
                //if the original equals the replace we're done
                if (e_org === e)
                    break;
            }
            return e;
        };

        this.prepare_expression = prepare_expression;

        //delay setting of constants until Settings is ready
        this.initConstants = function () {
            this.CONSTANTS = {
                E: new Symbol(Settings.E),
                PI: new Symbol(Settings.PI)
            };
        };
        /*
         * Debugging method used to better visualize vector and arrays
         * @param {object} o
         * @returns {String}
         */
        this.pretty_print = function (o) {
            if (Array.isArray(o)) {
                var s = o.map(x => _.pretty_print(x)).join(', ');
                if (o.type === 'vector')
                    return 'vector<' + s + '>';
                return '(' + s + ')';
            }
            return o.toString();
        };
        this.peekers = {
            pre_operator: [],
            post_operator: [],
            pre_function: [],
            post_function: []
        };

        this.callPeekers = function (name) {
            if (Settings.callPeekers) {
                var peekers = this.peekers[name];
                //remove the first items and stringify
                var args = arguments2Array(arguments).slice(1).map(stringify);
                //call each one of the peekers
                for (var i = 0; i < peekers.length; i++) {
                    peekers[i].apply(null, args);
                }
            }
        };
        /*
         * Tokenizes the string
         * @param {String} e
         * @returns {Token[]}
         * @deprecated
         */
        this.tokenize = function (e) {
            let deps = {preprocessors, functions, brackets, operators, units: _.units};
            let tokenizer = new Tokenizer(deps);
            return tokenizer.tokenize(e, false);
        };
        /*
         * Puts token array in Reverse Polish Notation
         * @param {Token[]} tokens
         * @returns {Token[]}
         */
        this.toRPN = (tokens) => {
            return RPN.TokensToRPN(tokens);
        };

        /*
         * Parses the tokens
         * @param {Tokens[]} rpn
         * @param {object} substitutions
         * @returns {Symbol}
         */
        this.parseRPN = (rpn, substitutions) => {
            let rpnDeps = {
                parse: _.parse,
                CONSTANTS: _.CONSTANTS,
                callfunction: _.callfunction,
                VARS,
                callPeekers: this.callPeekers,
                getAction: (action) => {
                    return _[action].bind(this)
                }
            };
            let rpnParser = new RPN(rpnDeps);
            return rpnParser.parseRPN(rpn, substitutions);
        };

        /**
         * This is the method that triggers the parsing of the string. It generates a parse tree but processes
         * it right away. The operator functions are called when their respective operators are reached. For instance
         * + with cause this.add to be called with the left and right hand values. It works by walking along each
         * character of the string and placing the operators on the stack and values on the output. When an operator
         * having a lower order than the last is reached then the stack is processed from the last operator on the
         * stack.
         * @param {String} token
         */

        function Node(token) {
            this.type = token.type;
            this.value = token.value;
            //the incoming token may already be a Node type
            this.left = token.left;
            this.right = token.right;
        }

        Node.prototype.toString = function () {
            var left = this.left ? this.left.toString() + '---' : '';
            var right = this.right ? '---' + this.right.toString() : '';
            return left + '(' + this.value + ')' + right;
        };

        Node.prototype.toHTML = function (depth, indent) {
            depth = depth || 0;
            indent = typeof indent === 'undefined' ? 4 : indent;
            var tab = function (n) {
                return ' '.repeat(indent * n);
            };
            var html = '';
            var left = this.left ? tab(depth + 1) + '<li>\n' + this.left.toHTML(depth + 2, indent) + tab(depth + 1) + '</li> \n' : '';
            var right = this.right ? tab(depth + 1) + '<li>\n' + this.right.toHTML(depth + 2, indent) + tab(depth + 1) + '</li>\n' : '';
            var html = tab(depth) + '<div class="' + this.type.toLowerCase() + '"><span>' + this.value + '</span></div>' + tab(depth) + '\n';
            if (left || right) {
                html += tab(depth) + '<ul>\n' + left + right + tab(depth) + '</ul>\n';
            }
            html += '';
            return html;
        };

        this.tree = function (tokens) {
            var Q = [];
            for (var i = 0; i < tokens.length; i++) {
                var e = tokens[i];
                //Arrays indicate a new scope so parse that out
                if (Array.isArray(e)) {
                    e = this.tree(e);
                    //if it's a comma then it's just arguments
                    Q.push(e);
                    continue;
                }
                if (e.type === Token.OPERATOR) {
                    if (e.is_prefix || e.postfix) {
                        //prefixes go to the left, postfix to the right
                        var location = e.is_prefix ? 'left' : 'right';
                        var last = Q.pop();
                        e = new Node(e);
                        e[location] = last;
                        Q.push(e);
                    }
                    else {
                        e = new Node(e);
                        e.right = Q.pop();
                        e.left = Q.pop();
                        Q.push(e);
                    }
                }
                else if (e.type === Token.FUNCTION) {
                    e = new Node(e);
                    var args = Q.pop();
                    e.right = args;
                    if (e.value === 'object') {
                        //check if Q has a value
                        var last = Q[Q.length - 1];
                        if (last) {
                            while(last.right) {
                                last = last.right;
                            }
                            last.right = e;
                            continue;
                        }
                    }

                    Q.push(e);
                }
                else {
                    Q.push(new Node(e));
                }
            }

            return Q[0];
        };

        let deps = {preprocessors, functions, brackets, operators, units: _.units};
        let tokenizer = new Tokenizer(deps);

        this.parse = (e, substitutions = {}) => {
            let tokens = tokenizer.tokenize(e, true);

            let rpn = this.toRPN(tokens);
            return this.parseRPN(rpn, substitutions);
        };
        /**
         * TODO: Switch to Parser.tokenize for this method
         * Reads a string into an array of Symbols and operators
         * @param {String} expression_string
         * @returns {Array}
         */
        this.toObject = function (expression_string) {
            var objectify = function (tokens) {
                var output = [];
                for (var i = 0, l = tokens.length; i < l; i++) {
                    var token = tokens[i];
                    var v = token.value;
                    if (token.type === Token.VARIABLE_OR_LITERAL) {
                        output.push(new Symbol(v));
                    }
                    else if (token.type === Token.FUNCTION) {
                        //jump ahead since the next object are the arguments
                        i++;
                        //create a symbolic function and stick it on output
                        var f = _.symfunction(v, objectify(tokens[i]));
                        f.isConversion = true;
                        output.push(f);
                    }
                    else if (token.type === Token.OPERATOR) {
                        output.push(v);
                    }
                    else {
                        output.push(objectify(token));
                    }
                }

                return output;
            };
            return objectify(_.tokenize(expression_string));
        };

        // A helper method for toTeX
        var chunkAtCommas = function (arr) {
            var j, k = 0, chunks = [[]];
            for (var j = 0, l = arr.length; j < l; j++) {
                if (arr[j] === ',') {
                    k++;
                    chunks[k] = [];
                }
                else {
                    chunks[k].push(arr[j]);
                }
            }
            return chunks;
        };

        // Helper method for toTeX
        var rem_brackets = function (str) {
            return str.replace(/^\\left\((.+)\\right\)$/g, function (str, a) {
                if (a)
                    return a;
                return str;
            });
        };

        var remove_redundant_powers = function (arr) {
            // The filtered array
            var narr = [];

            while(arr.length) {
                // Remove the element from the front
                var e = arr.shift();
                var next = arr[0];
                var next_is_array = isArray(next);
                var next_is_minus = next === '-';

                // Remove redundant plusses
                if (e === '^') {
                    if (next === '+') {
                        arr.shift();
                    }
                    else if (next_is_array && next[0] === '+') {
                        next.shift();
                    }

                    // Remove redundant parentheses
                    if (next_is_array && next.length === 1) {
                        arr.unshift(arr.shift()[0]);
                    }
                }

                // Check if it's a negative power
                if (e === '^' && (next_is_array && next[0] === '-' || next_is_minus)) {
                    // If so:
                    // - Remove it from the new array, place a one and a division sign in that array and put it back
                    var last = narr.pop();
                    // Check if it's something multiplied by
                    var before = narr[narr.length - 1];
                    var before_last = '1';

                    if (before === '*') {
                        narr.pop();
                        // For simplicity we just pop it.
                        before_last = narr.pop();
                    }
                    // Implied multiplication
                    else if (isArray(before)) {
                        before_last = narr.pop();
                    }

                    narr.push(before_last, '/', last, e);

                    // Remove the negative sign from the power
                    if (next_is_array) {
                        next.shift();
                    }
                    else {
                        arr.shift();
                    }

                    // Remove it from the array so we don't end up with redundant parentheses if we can
                    if (next_is_array && next.length === 1) {
                        narr.push(arr.shift()[0]);
                    }
                }
                else {
                    narr.push(e);
                }
            }

            return narr;
        };
        /*
         * Convert expression or object to LaTeX
         * @param {String} expression_or_obj
         * @param {object} opt
         * @returns {String}
         */
        this.toTeX = function (expression_or_obj, opt) {
            opt = opt || {};
            // Add decimal option as per issue #579. Consider passing an object to Latex.latex as option instead of string
            var decimals = opt.decimals === true ? 'decimals' : undefined;

            var obj = typeof expression_or_obj === 'string' ? this.toObject(expression_or_obj) : expression_or_obj,
                TeX = [],
                cdot = typeof opt.cdot === 'undefined' ? '\\cdot' : opt.cdot; //set omit cdot to true by default

            // Remove negative powers as per issue #570
            obj = remove_redundant_powers(obj);

            if (isArray(obj)) {
                var nobj = [], a, b;
                //first handle ^
                for (var i = 0; i < obj.length; i++) {
                    a = obj[i];

                    if (obj[i + 1] === '^') {
                        b = obj[i + 2];
                        nobj.push(LaTeX.braces(this.toTeX([a])) + '^' + LaTeX.braces(this.toTeX([b])));
                        i += 2;
                    }
                    else {
                        nobj.push(a);
                    }
                }
                obj = nobj;
            }

            for (var i = 0, l = obj.length; i < l; i++) {
                var e = obj[i];

                // Convert * to cdot
                if (e === '*') {
                    e = cdot;
                }

                if (isSymbol(e)) {
                    if (e.group === FN) {
                        var fname = e.fname, f;

                        if (fname === SQRT)
                            f = '\\sqrt' + LaTeX.braces(this.toTeX(e.args));
                        else if (fname === ABS)
                            f = LaTeX.brackets(this.toTeX(e.args), 'abs');
                        else if (fname === PARENTHESIS)
                            f = LaTeX.brackets(this.toTeX(e.args), 'parens');
                        else if (fname === Settings.LOG10) {
                            f = '\\' + Settings.LOG10_LATEX + '\\left( ' + this.toTeX(e.args) + '\\right)';
                        }
                        else if (fname === 'integrate') {
                            /* Retrive [Expression, x] */
                            var chunks = chunkAtCommas(e.args);
                            /* Build TeX */
                            var expr = LaTeX.braces(this.toTeX(chunks[0])),
                                dx = this.toTeX(chunks[1]);
                            f = '\\int ' + expr + '\\, d' + dx;
                        }
                        else if (fname === 'defint') {
                            var chunks = chunkAtCommas(e.args),
                                expr = LaTeX.braces(this.toTeX(chunks[0])),
                                dx = this.toTeX(chunks[3]),
                                lb = this.toTeX(chunks[1]),
                                ub = this.toTeX(chunks[2]);
                            f = '\\int\\limits_{' + lb + '}^{' + ub + '} ' + expr + '\\, d' + dx;

                        }
                        else if (fname === 'diff') {
                            var chunks = chunkAtCommas(e.args);
                            var dx = '', expr = LaTeX.braces(this.toTeX(chunks[0]));
                            /* Handle cases: one argument provided, we need to guess the variable, and assume n = 1 */
                            if (chunks.length === 1) {
                                var vars = [];
                                for (j = 0; j < chunks[0].length; j++) {
                                    if (chunks[0][j].group === 3) {
                                        vars.push(chunks[0][j].value);
                                    }
                                }
                                vars.sort();
                                dx = vars.length > 0 ? ('\\frac{d}{d ' + vars[0] + '}') : '\\frac{d}{d x}';
                            }
                            /* If two arguments, we have expression and variable, we assume n = 1 */
                            else if (chunks.length === 2) {
                                dx = '\\frac{d}{d ' + chunks[1] + '}';
                            }
                            /* If we have more than 2 arguments, we assume we've got everything */
                            else {
                                dx = '\\frac{d^{' + chunks[2] + '}}{d ' + this.toTeX(chunks[1]) + '^{' + chunks[2] + '}}';
                            }

                            f = dx + '\\left(' + expr + '\\right)';

                        }
                        else if (fname === 'sum' || fname === 'product') {
                            // Split e.args into 4 parts based on locations of , symbols.
                            var argSplit = [[], [], [], []], j = 0, i;
                            for (i = 0; i < e.args.length; i++) {
                                if (e.args[i] === ',') {
                                    j++;
                                    continue;
                                }
                                argSplit[j].push(e.args[i]);
                            }
                            // Then build TeX string.
                            f = (fname === 'sum' ? '\\sum_' : '\\prod_') + LaTeX.braces(this.toTeX(argSplit[1]) + ' = ' + this.toTeX(argSplit[2]));
                            f += '^' + LaTeX.braces(this.toTeX(argSplit[3])) + LaTeX.braces(this.toTeX(argSplit[0]));
                        }
                        else if (fname === 'limit') {
                            var args = chunkAtCommas(e.args).map(function (x) {
                                if (Array.isArray(x))
                                    return _.toTeX(x.join(''));
                                return _.toTeX(String(x));
                            });
                            f = '\\lim_' + LaTeX.braces(args[1] + '\\to ' + args[2]) + ' ' + LaTeX.braces(args[0]);
                        }
                        else if (fname === FACTORIAL || fname === DOUBLEFACTORIAL)
                            f = this.toTeX(e.args) + (fname === FACTORIAL ? '!' : '!!');
                        else {

                            f = LaTeX.latex(e, decimals);
                            //f = '\\mathrm'+LaTeX.braces(fname.replace(/_/g, '\\_')) + LaTeX.brackets(this.toTeX(e.args), 'parens');
                        }

                        TeX.push(f);
                    }
                    else {
                        TeX.push(LaTeX.latex(e, decimals));
                    }
                }
                else if (isArray(e)) {
                    TeX.push(LaTeX.brackets(this.toTeX(e)));
                }
                else {
                    if (e === '/')
                        TeX.push(LaTeX.frac(rem_brackets(TeX.pop()), rem_brackets(this.toTeX([obj[++i]]))));
                    else
                        TeX.push(e);
                }
            }

            return TeX.join(' ');
        };

//Parser.functions ==============================================================
        /* Although parens is not a "real" function it is important in some cases when the
         * symbol must carry parenthesis. Once set you don't have to worry about it anymore
         * as the parser will get rid of it at the first opportunity
         */
        function parens(symbol) {
            if (Settings.PARSE2NUMBER) {
                return symbol;
            }
            return _.symfunction('parens', [symbol]);
        }

        function abs(symbol) {

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
                    return sqrt(_.add(_.pow(re, new Symbol(2)), _.pow(im, new Symbol(2))));
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
            var m = _.parse(symbol.multiplier);
            symbol.toUnitMultiplier();

            return _.multiply(m, _.symfunction(ABS, [symbol]));
        }
        /**
         * The factorial function
         * @param {Symbol} symbol
         * @return {Symbol}
         */
        function factorial(symbol) {
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

                retval = bigConvert(retval);
                return retval;
            }
            else if (symbol.isConstant()) {
                var den = symbol.getDenom();
                if (den.equals(2)) {
                    var num = symbol.getNum();
                    var a, b, c, n;

                    if (!symbol.multiplier.isNegative()) {
                        n = _.add(num, new Symbol(1)).multiplier.divide(new Frac(2));
                        a = Math2.bigfactorial(new Frac(2).multiply(n));
                        b = _.pow(new Symbol(4), new Symbol(n)).multiplier.multiply(Math2.bigfactorial(n));
                    }
                    else {
                        n = _.subtract(num.negate(), new Symbol(1)).multiplier.divide(new Frac(2));
                        a = _.pow(new Symbol(-4), new Symbol(n)).multiplier.multiply(Math2.bigfactorial(n));
                        b = Math2.bigfactorial(new Frac(2).multiply(n));
                    }
                    c = a.divide(b);
                    return _.multiply(_.parse('sqrt(pi)'), new Symbol(c));
                }
            }
            return _.symfunction(FACTORIAL, [symbol]);
        }
        ;
        /**
         * Returns the continued fraction of a number
         * @param {Symbol} symbol
         * @param {Symbol} n
         * @returns {Symbol}
         */
        function continued_fraction(symbol, n) {
            var _symbol = evaluate(symbol);
            if (_symbol.isConstant()) {
                var cf = Math2.continuedFraction(_symbol, n);
                //convert the fractions array to a new Vector
                var fractions = Vector.fromArray(cf.fractions.map(function (x) {
                    return new Symbol(x);
                }));
                return Vector.fromArray([new Symbol(cf.sign), new Symbol(cf.whole), fractions]);
            }
            return _.symfunction('continued_fraction', arguments);
        }
        /**
         * Returns the error function
         * @param {Symbol} symbol
         * @returns {Symbol}
         */
        function erf(symbol) {
            var _symbol = evaluate(symbol);

            if (_symbol.isConstant()) {
                return Math2.erf(_symbol);
            }
            else if (_symbol.isImaginary()) {
                return complex.erf(symbol);
            }
            return _.symfunction('erf', arguments);
        }
        ;
        /**
         * The mod function
         * @param {Symbol} symbol1
         * @param {Symbol} symbol2
         * @returns {Symbol}
         */
        function mod(symbol1, symbol2) {
            if (symbol1.isConstant() && symbol2.isConstant()) {
                var retval = new Symbol(1);
                retval.multiplier = retval.multiplier.multiply(symbol1.multiplier.mod(symbol2.multiplier));
                return retval;
            }
            //try to see if division has remainder of zero
            var r = _.divide(symbol1.clone(), symbol2.clone());
            if (isInt(r))
                return new Symbol(0);
            return _.symfunction('mod', [symbol1, symbol2]);
        }
        /**
         * A branghing function
         * @param {Boolean} condition
         * @param {Symbol} a
         * @param {Symbol} b
         * @returns {Symbol}
         */
        function IF (condition, a, b) {
            if (typeof condition !== 'boolean')
                if (isNumericSymbol(condition))
                    condition = !!Number(condition);
            if (condition)
                return a;
            return b;
        }
        /**
         *
         * @param {Matrix|Vector|Set|Collection} obj
         * @param {Symbol} item
         * @returns {Boolean}
         */
        function is_in(obj, item) {
            if (isMatrix(obj)) {
                for (var i = 0, l = obj.rows(); i < l; i++) {
                    for (var j = 0, l2 = obj.cols(); j < l2; j++) {
                        var element = obj.elements[i][j];
                        if (element.equals(item))
                            return new Symbol(1);
                    }
                }
            }
            else if (obj.elements) {
                for (var i = 0, l = obj.elements.length; i < l; i++) {
                    if (obj.elements[i].equals(item))
                        return new Symbol(1);
                }
            }

            return new Symbol(0);
        }

        /**
         * A symbolic extension for sinc
         * @param {Symbol} symbol
         * @returns {Symbol}
         */
        function sinc(symbol) {
            if (Settings.PARSE2NUMBER) {
                if (symbol.isConstant()) {
                    return new Symbol(Math2.sinc(symbol));
                }
                return _.parse(format('sin({0})/({0})', symbol));
            }
            return _.symfunction('sinc', [symbol]);
        }

        /**
         * A symbolic extension for exp. This will auto-convert all instances of exp(x) to e^x.
         * Thanks @ Happypig375
         * @param {Symbol} symbol
         * @returns {Symbol}
         */
        function exp(symbol) {
            if (symbol.fname === Settings.LOG && symbol.isLinear()) {
                return _.pow(symbol.args[0], Symbol.create(symbol.multiplier));
            }
            return _.parse(format('e^({0})', symbol));
        }

        /**
         * Converts value degrees to radians
         * @param {Symbol} symbol
         * @returns {Symbol}
         */
        function radians(symbol) {
            return _.parse(format('({0})*pi/180', symbol));
        }

        /**
         * Converts value from radians to degrees
         * @param {Symbol} symbol
         * @returns {Symbol}
         */
        function degrees(symbol) {
            return _.parse(format('({0})*180/pi', symbol));
        }

        function nroots(symbol) {
            var a, b;
            if (symbol.group === FN && symbol.fname === '') {
                a = Symbol.unwrapPARENS(_.parse(symbol).toLinear());
                b = _.parse(symbol.power);
            }
            else if (symbol.group === P) {
                a = _.parse(symbol.value);
                b = _.parse(symbol.power);
            }

            if (a && b && a.group === N && b.group === N) {
                var _roots = [];
                var parts = Symbol.toPolarFormArray(symbol);
                var r = _.parse(a).abs().toString();
                //https://en.wikipedia.org/wiki/De_Moivre%27s_formula
                var x = arg(a).toString();
                var n = b.multiplier.den.toString();
                var p = b.multiplier.num.toString();

                var formula = "(({0})^({1})*(cos({3})+({2})*sin({3})))^({4})";
                for (var i = 0; i < n; i++) {
                    var t = evaluate(_.parse(format("(({0})+2*pi*({1}))/({2})", x, i, n))).multiplier.toDecimal();
                    _roots.push(evaluate(_.parse(format(formula, r, n, Settings.IMAGINARY, t, p))));
                }
                return Vector.fromArray(_roots);
            }
            else if (symbol.isConstant(true)) {
                var sign = symbol.sign();
                var x = evaluate(symbol.abs());
                var root = _.sqrt(x);

                var _roots = [root.clone(), root.negate()];

                if (sign < 0)
                    _roots = _roots.map(function (x) {
                        return _.multiply(x, Symbol.imaginary());
                    });
            }
            else {
                _roots = [_.parse(symbol)];
            }

            return Vector.fromArray(_roots);
        }

        /**
         * Rationalizes a symbol
         * @param {Symbol} symbol
         * @returns {Symbol}
         */
        function rationalize(symbol) {
            if (symbol.isComposite()) {
                var retval = new Symbol(0);
                var num, den, retnum, retden, a, b, n, d;
                symbol.each(function (x) {
                    num = x.getNum();
                    den = x.getDenom();
                    retnum = retval.getNum();
                    retden = retval.getDenom();
                    a = _.multiply(den, retnum);
                    b = _.multiply(num, retden);
                    n = _.expand(_.add(a, b));
                    d = _.multiply(retden, den);
                    retval = _.divide(n, d);
                }, true);

                return retval;
            }
            return symbol;
        }

        /**
         * The square root function
         * @param {Symbol} symbol
         * @returns {Symbol}
         */
        function sqrt(symbol) {
            if (!isSymbol(symbol)) {
                symbol = _.parse(symbol);
            }

            // Exit early for EX
            if (symbol.group === EX) {
                return _.symfunction(SQRT, [symbol]);
            }

            if (symbol.fname === '' && symbol.power.equals(1))
                symbol = symbol.args[0];

            var is_negative = symbol.multiplier.sign() < 0;

            if (Settings.PARSE2NUMBER) {
                if (symbol.isConstant() && !is_negative) {
                    return new Symbol(bigDec.sqrt(symbol.multiplier.toDecimal()));
                }
                else if (symbol.isImaginary()) {
                    return complex.sqrt(symbol);
                }
                else if (symbol.group === S) {
                    return _.symfunction('sqrt', [symbol]);
                }
            }

            var img, retval,
                isConstant = symbol.isConstant();

            if (symbol.group === CB && symbol.isLinear()) {
                var m = sqrt(new Symbol(symbol.multiplier));
                for (var s in symbol.symbols) {
                    var x = symbol.symbols[s];
                    m = _.multiply(m, sqrt(x));
                }

                retval = m;
            }
            //if the symbol is already sqrt then it's that symbol^(1/4) and we can unwrap it
            else if (symbol.fname === SQRT) {
                var s = symbol.args[0];
                var ms = symbol.multiplier;
                s.setPower(symbol.power.multiply(new Frac(0.25)));
                retval = s;
                //grab the multiplier
                if (!ms.equals(1))
                    retval = _.multiply(sqrt(_.parse(ms)), retval);
            }
                //if the symbol is a fraction then we don't keep can unwrap it. For instance
            //no need to keep sqrt(x^(1/3))
            else if (!symbol.power.isInteger()) {
                symbol.setPower(symbol.power.multiply(new Frac(0.5)));
                retval = symbol;
            }
            else if (symbol.multiplier < 0 && symbol.group === S) {
                var a = _.parse(symbol.multiplier).negate();
                var b = _.parse(symbol).toUnitMultiplier().negate();
                retval = _.multiply(_.symfunction(Settings.SQRT, [b]), sqrt(a));
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
                    m = _.multiply(_.symfunction(SQRT, [new Symbol(q)]), new Symbol(tw));
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
                            r[i] = _.multiply(r[i], _.pow(b, new Symbol(w)));
                            sq[i] = _.multiply(sq[i], sqrt(_.pow(b, new Symbol(rem))));
                        });
                    }
                    m = _.divide(_.multiply(r[0], sq[0]), _.multiply(r[1], sq[1]));
                }


                //strip the multiplier since we already took the sqrt
                symbol = symbol.toUnitMultiplier(true);
                //if the symbol is one just return one and not the sqrt function
                if (symbol.isOne()) {
                    retval = symbol;
                }
                else if (even(symbol.power.toString())) {
                    //just raise it to the 1/2
                    retval = _.pow(symbol.clone(), new Symbol(0.5));
                }
                else {
                    retval = _.symfunction(SQRT, [symbol]);
                }

                //put back the sign that was removed earlier
                if (sign < 0)
                    retval.power.negate();

                if (m)
                    retval = _.multiply(m, retval);

                if (img)
                    retval = _.multiply(img, retval);
            }

            if (is_negative && Settings.PARSE2NUMBER)
                return _.parse(retval);

            return retval;
        }

        /**
         * The cube root function
         * @param {Symbol} symbol
         * @returns {Symbol}
         */
        function cbrt(symbol) {
            if (!symbol.isConstant(true)) {
                var retval;

                var n = symbol.power / 3;
                //take the cube root of the multplier
                var m = _.pow(_.parse(symbol.multiplier), new Symbol(1 / 3));
                //strip the multiplier
                var sym = symbol.toUnitMultiplier();

                //simplify the power
                if (isInt(n)) {
                    retval = _.pow(sym.toLinear(), _.parse(n));
                }
                else {
                    if (sym.group === CB) {
                        retval = new Symbol(1);
                        sym.each(function (x) {
                            retval = _.multiply(retval, cbrt(x));
                        });
                    }
                    else {
                        retval = _.symfunction('cbrt', [sym]);
                    }
                }

                return _.multiply(m, retval);
            }
            return nthroot(symbol, new Symbol(3));
        }

        function scientific(symbol, sigfigs) {
            //Just set the flag and keep it moving. Symbol.toString will deal with how to
            //display this
            symbol.scientific = sigfigs || 10;
            return symbol;
        }

        /**
         *
         * @param {Symbol} num - the number being raised
         * @param {Symbol} p - the exponent
         * @param {type} prec - the precision wanted
         * @param {bool} asbig - true if a bigDecimal is wanted
         * @returns {Symbol}
         */
        function nthroot(num, p, prec, asbig) {
            //clone p and convert to a number if possible
            p = evaluate(_.parse(p));

            //cannot calculate if p = 0. nthroot(0, 0) => 0^(1/0) => undefined
            if (p.equals(0)) {
                throw new UndefinedError('Unable to calculate nthroots of zero');
            }

            //Stop computation if it negative and even since we have an imaginary result
            if (num < 0 && even(p))
                throw new Error('Cannot calculate nthroot of negative number for even powers');

            //return non numeric values unevaluated
            if (!num.isConstant(true)) {
                return _.symfunction('nthroot', arguments);
            }

            //evaluate numeric values
            if (num.group !== N) {
                num = evaluate(num);
            }

            //default is to return a big value
            if (typeof asbig === 'undefined')
                asbig = true;

            prec = prec || 25;

            var sign = num.sign();
            var retval;
            var ans;

            if (sign < 0) {
                num = abs(num); //remove the sign
            }

            if (isInt(num) && p.isConstant()) {

                if (num < 18446744073709551616) {
                    //2^64
                    ans = Frac.create(Math.pow(num, 1 / p));
                }
                else {
                    ans = Math2.nthroot(num, p);
                }

                var retval;
                if (asbig) {
                    retval = new Symbol(ans);
                }
                retval = new Symbol(ans.toDecimal(prec));

                return _.multiply(new Symbol(sign), retval);
            }
        }

        function pfactor(symbol) {
            //Fix issue #458 | nerdamer("sqrt(1-(3.3333333550520926e-7)^2)").evaluate().text()
            //More Big Number issues >:(
            if (symbol.greaterThan(9.999999999998891e+41) || symbol.equals(-1))
                return symbol;
            //Fix issue #298
            if (symbol.equals(Math.PI))
                return new Symbol(Math.PI);
            //evaluate the symbol to merge constants
            symbol = evaluate(symbol.clone());

            if (symbol.isConstant()) {
                var retval = new Symbol(1);
                var m = symbol.toString();
                if (isInt(m)) {
                    var factors = Math2.ifactor(m);
                    for (var factor in factors) {
                        var p = factors[factor];
                        retval = _.multiply(retval, _.symfunction('parens', [new Symbol(factor).setPower(new Frac(p))]));
                    }
                }
                else {
                    var n = pfactor(new Symbol(symbol.multiplier.num));
                    var d = pfactor(new Symbol(symbol.multiplier.den));
                    retval = _.multiply(_.symfunction('parens', [n]), _.symfunction('parens', [d]).invert());
                }
            }
            else
                retval = _.symfunction('pfactor', arguments);
            return retval;
        }

        /**
         * Get's the real part of a complex number. Return number if real
         * @param {Symbol} symbol
         * @returns {Symbol}
         */
        function realpart(symbol) {
            return symbol.realpart();
        }

        /**
         * Get's the imaginary part of a complex number
         * @param {Symbol} symbol
         * @returns {Symbol}
         */
        function imagpart(symbol) {
            return symbol.imagpart();
        }

        /**
         * Computes the conjugate of a complex number
         * @param {Symbol} symbol
         * @returns {Symbol}
         */
        function conjugate(symbol) {
            var re = symbol.realpart();
            var im = symbol.imagpart();
            return _.add(re, _.multiply(im.negate(), Symbol.imaginary()));
        }

        /**
         * Returns the arugment of a complex number
         * @param {Symbol} symbol
         * @returns {Symbol}
         */
        function arg(symbol) {
            var re = symbol.realpart();
            var im = symbol.imagpart();
            if (re.isConstant() && im.isConstant())
                return new Symbol(Math.atan2(im, re));
            return _.symfunction('atan2', [im, re]);
        }

        /**
         * Returns the arugment of a complex number
         * @param {Symbol} symbol
         * @returns {Symbol}
         */
        function arg(symbol) {
            var re = symbol.realpart();
            var im = symbol.imagpart();
            if (re.isConstant() && im.isConstant()) {
                if (im.equals(0) && re.equals(-1)) {
                    return _.parse('pi');
                }
                else if (im.equals(1) && re.equals(0)) {
                    return _.parse('pi/2');
                }
                else if (im.equals(1) && re.equals(1)) {
                    return _.parse('pi/4');
                }
                return new Symbol(Math.atan2(im, re));
            }
            return _.symfunction('atan2', [im, re]);
        }

        /**
         * Returns the polarform of a complex number
         * @param {Symbol} symbol
         * @returns {Symbol}
         */
        function polarform(symbol) {
            var p, r, e, theta;
            p = Symbol.toPolarFormArray(symbol);
            theta = p[1];
            r = p[0];
            e = _.parse(format('e^({0}*({1}))', Settings.IMAGINARY, theta));
            return _.multiply(r, e);
        }

        /**
         * Returns the rectangular form of a complex number. Does not work for symbolic coefficients
         * @param {Symbol} symbol
         * @returns {Symbol}
         */
        function rectform(symbol) {
            //TODO: e^((i*pi)/4)
            var original = symbol.clone();
            try {
                var f, p, q, s, h, d, n;
                f = decompose_fn(symbol, 'e', true);
                p = _.divide(f.x.power, Symbol.imaginary());
                q = evaluate(trig.tan(p));
                s = _.pow(f.a, new Symbol(2));
                d = q.getDenom(true);
                n = q.getNum();
                h = Symbol.hyp(n, d);
                //check
                if (h.equals(f.a)) {
                    return _.add(d, _.multiply(Symbol.imaginary(), n));
                }
                else {
                    return original;
                }
            }
            catch(e) {
                return original;
            }
        }

        function symMinMax(f, args) {
            args.map(function (x) {
                x.numVal = evaluate(x).multiplier;
            });
            var l, a, b, a_val, b_val;
            while(true) {
                l = args.length;
                if (l < 2)
                    return args[0];
                a = args.pop();
                b = args[l - 2];
                if (f === 'min' ? a.numVal < b.numVal : a.numVal > b.numVal) {
                    args.pop();
                    args.push(a);
                }
            }
        }

        /**
         * Returns maximum of a set of numbers
         * @returns {Symbol}
         */
        function max() {
            var args = [].slice.call(arguments);
            if (allSame(args))
                return args[0];
            if (allNumbers(args))
                return new Symbol(Math.max.apply(null, args));
            if (Settings.SYMBOLIC_MIN_MAX && allConstants(args))
                return symMinMax('max', args);
            return _.symfunction('max', args);
        }

        /**
         * Returns minimum of a set of numbers
         * @returns {Symbol}
         */
        function min() {
            var args = [].slice.call(arguments);
            if (allSame(args))
                return args[0];
            if (allNumbers(args))
                return new Symbol(Math.min.apply(null, args));
            if (Settings.SYMBOLIC_MIN_MAX && allConstants(args))
                return symMinMax('min', args);
            return _.symfunction('min', args);
        }

        /**
         * Returns the sign of a number
         * @param {Symbol} x
         * @returns {Symbol}
         */
        function sign(x) {
            if (x.isConstant(true))
                return new Symbol(Math.sign(evaluate(x)));
            return _.symfunction('sign', arguments);
        }

        function sort(symbol, opt) {
            opt = opt ? opt.toString() : 'asc';
            var getval = function (e) {
                if (e.group === N)
                    return e.multiplier;
                if (e.group === FN) {
                    if (e.fname === '')
                        return getval(e.args[0]);
                    return e.fname;
                }
                if (e.group === S)
                    return e.power;

                return e.value;
            };
            var symbols = isVector(symbol) ? symbol.elements : symbol.collectSymbols();
            return new Vector(symbols.sort(function (a, b) {
                var aval = getval(a),
                    bval = getval(b);
                if (opt === 'desc')
                    return bval - aval;
                return aval - bval;
            }));
        }

        /**
         * The log function
         * @param {Symbol} symbol
         * @param {Symbol} base
         * @returns {Symbol}
         */
        function log(symbol, base) {

            if (symbol.equals(1)) {
                return new Symbol(0);
            }

            var retval;

            if (symbol.fname === SQRT && symbol.multiplier.equals(1)) {
                retval = _.divide(log(symbol.args[0]), new Symbol(2));

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
                return complex.evaluate(symbol, Settings.LOG);
            }

            if (symbol.isConstant() && typeof base !== 'undefined' && base.isConstant()) {
                var log_sym = Math.log(symbol);
                var log_base = Math.log(base);
                retval = new Symbol(log_sym / log_base);
            }
            else if (symbol.group === EX && symbol.power.multiplier.lessThan(0) || symbol.power.toString() === '-1') {
                symbol.power.negate();
                //move the negative outside but keep the positive inside :)
                retval = log(symbol).negate();
            }
            else if (symbol.value === 'e' && symbol.multiplier.equals(1)) {
                var p = symbol.power;
                retval = isSymbol(p) ? p : new Symbol(p);
            }
            else if (symbol.group === FN && symbol.fname === 'exp') {
                var s = symbol.args[0];
                if (symbol.multiplier.equals(1))
                    retval = _.multiply(s, new Symbol(symbol.power));
                else
                    retval = _.symfunction(Settings.LOG, [symbol]);
            }
            else if (Settings.PARSE2NUMBER && isNumericSymbol(symbol)) {
                // Parse for safety.
                symbol = _.parse(symbol);

                var img_part;
                if (symbol.multiplier.lessThan(0)) {
                    symbol.negate();
                    img_part = _.multiply(new Symbol(Math.PI), new Symbol('i'));
                }

                retval = new Symbol(Math.log(symbol.multiplier.toDecimal()));

                if (img_part) {
                    retval = _.add(retval, img_part);
                }

            }
            else {
                var s;
                if (!symbol.power.equals(1) && !symbol.contains('e')) {
                    s = symbol.group === EX ? symbol.power : new Symbol(symbol.power);
                    symbol.toLinear();
                }
                //log(a,a) = 1 since the base is allowed to be changed.
                //This was pointed out by Happypig375 in issue #280
                if (arguments.length > 1 && allSame(arguments)) {
                    retval = new Symbol(1);
                }
                else {
                    retval = _.symfunction(Settings.LOG, arguments);
                }

                if (s)
                    retval = _.multiply(s, retval);
            }

            return retval;
        }

        /**
         * Round a number up to s decimal places
         * @param {Number} x
         * @param {int} s - the number of decimal places
         * @returns {undefined}
         */
        function round(x, s) {
            var sIsConstant = s && s.isConstant() || typeof s === 'undefined';
            if (x.isConstant() && sIsConstant) {
                var v, e, exp, retval;
                v = x;
                //round the coefficient of then number but not the actual decimal value
                //we know this because a negative number was passed
                if (s && s.lessThan(0)) {
                    s = abs(s);
                    //convert the number to exponential form
                    e = Number(x).toExponential().toString().split('e');
                    //point v to the coefficient of then number
                    v = e[0];
                    //set the expontent
                    exp = e[1];
                }
                //round the number to the requested precision
                retval = new Symbol(nround(v, Number(s || 0)));
                //if there's a exponent then put it back
                return _.multiply(retval, _.pow(new Symbol(10), new Symbol(exp || 0)))
            }


            return _.symfunction('round', arguments);
        }

        /**
         * Gets the quadrant of the trig function
         * @param {Frac} m
         * @returns {Int}
         */
        function getQuadrant(m) {
            var v = m % 2, quadrant;

            if (v < 0)
                v = 2 + v; //put it in terms of pi

            if (v >= 0 && v <= 0.5)
                quadrant = 1;
            else if (v > 0.5 && v <= 1)
                quadrant = 2;
            else if (v > 1 && v <= 1.5)
                quadrant = 3;
            else
                quadrant = 4;
            return quadrant;
        }

        /*
         * Serves as a bridge between numbers and bigNumbers
         * @param {Frac|Number} n
         * @returns {Symbol}
         */
        function bigConvert(n) {
            if (!isFinite(n)) {
                var sign = Math.sign(n);
                var r = new Symbol(String(Math.abs(n)));
                r.multiplier = r.multiplier.multiply(new Frac(sign));
                return r;
            }
            if (isSymbol(n))
                return n;
            if (typeof n === 'number') {
                try {
                    n = Frac.simple(n);
                }
                catch(e) {
                    n = new Frac(n);
                }
            }

            var symbol = new Symbol(0);
            symbol.multiplier = n;
            return symbol;
        }
        ;

        function clean(symbol) {
            // handle functions with numeric values
            // handle denominator within denominator
            // handle trig simplifications
            var g = symbol.group, retval;
            //Now let's get to work
            if (g === CP) {
                var num = symbol.getNum(),
                    den = symbol.getDenom() || new Symbol(1),
                    p = Number(symbol.power),
                    factor = new Symbol(1);
                if (Math.abs(p) === 1) {
                    den.each(function (x) {
                        if (x.group === CB) {
                            factor = _.multiply(factor, clean(x.getDenom()));
                        }
                        else if (x.power.lessThan(0)) {
                            factor = _.multiply(factor, clean(x.clone().toUnitMultiplier()));
                        }
                    });

                    var new_den = new Symbol(0);
                    //now divide out the factor and add to new den
                    den.each(function (x) {
                        new_den = _.add(_.divide(x, factor.clone()), new_den);
                    });

                    factor.invert(); //invert so it can be added to the top
                    var new_num;
                    if (num.isComposite()) {
                        new_num = new Symbol(0);
                        num.each(function (x) {
                            new_num = _.add(_.multiply(clean(x), factor.clone()), new_num);
                        });
                    }
                    else
                        new_num = _.multiply(factor, num);

                    retval = _.divide(new_num, new_den);
                }
            }
            else if (g === CB) {
                retval = new Symbol(1);
                symbol.each(function (x) {
                    retval = _.multiply(retval, _.clean(x));
                });
            }
            else if (g === FN) {
                if (symbol.args.length === 1 && symbol.args[0].isConstant())
                    retval = block('PARSE2NUMBER', function () {
                        return _.parse(symbol);
                    }, true);
            }

            if (!retval)
                retval = symbol;

            return retval;
        }

        /**
         * A wrapper for the expand function
         * @param {Symbol} symbol
         * @returns {Symbol}
         */
        function expandall(symbol, opt) {
            opt = opt || {
                expand_denominator: true,
                expand_functions: true
            };
            return expand(symbol, opt);
        }
        /**
         * Expands a symbol
         * @param symbol
         */
        // Old expand
        function expand(symbol, opt) {
            if (Array.isArray(symbol)) {
                return symbol.map(function (x) {
                    return expand(x, opt);
                });
            }
            opt = opt || {};
            //deal with parenthesis
            if (symbol.group === FN && symbol.fname === '') {
                var f = expand(symbol.args[0], opt);
                var x = expand(_.pow(f, _.parse(symbol.power)), opt);
                return _.multiply(_.parse(symbol.multiplier), x).distributeMultiplier();
            }
            // We can expand these groups so no need to waste time. Just return and be done.
            if ([N, P, S].indexOf(symbol.group) !== -1) {
                return symbol; //nothing to do
            }

            var original = symbol.clone();

            // Set up a try-catch block. If anything goes wrong then we simply return the original symbol
            try {
                // Store the power and multiplier
                var m = symbol.multiplier.toString();
                var p = Number(symbol.power);
                var retval = symbol;

                // Handle (a+b)^2 | (x+x^2)^2
                if (symbol.isComposite() && isInt(symbol.power) && symbol.power > 0) {
                    var n = p - 1;
                    // Strip the expression of it's multiplier and power. We'll call it f. The power will be p and the multiplier m.
                    var f = new Symbol(0);

                    symbol.each(function (x) {
                        f = _.add(f, expand(_.parse(x), opt));
                    });

                    var expanded = _.parse(f);

                    for (var i = 0; i < n; i++) {
                        expanded = mix(expanded, f, opt);
                    }

                    retval = _.multiply(_.parse(m), expanded).distributeMultiplier();
                }
                else if (symbol.group === FN && opt.expand_functions === true) {
                    var args = [];
                    // Expand function the arguments
                    symbol.args.forEach(function (x) {
                        args.push(expand(x, opt));
                    });
                    // Put back the power and multiplier
                    retval = _.pow(_.symfunction(symbol.fname, args), _.parse(symbol.power));
                    retval = _.multiply(retval, _.parse(symbol.multiplier));
                }
                else if (symbol.isComposite() && isInt(symbol.power) && symbol.power < 0 && opt.expand_denominator === true) {
                    // Invert it. Expand it and then re-invert it.
                    symbol = symbol.invert();
                    retval = expand(symbol, opt);
                    retval.invert();
                }
                else if (symbol.group === CB) {
                    var rank = function (s) {
                        switch(s.group) {
                            case CP:
                                return 0;
                            case PL:
                                return 1;
                            case CB:
                                return 2;
                            case FN:
                                return 3;
                            default:
                                return 4;
                        }
                    };
                    // Consider (a+b)(c+d). The result will be (a*c+a*d)+(b*c+b*d).
                    // We start by moving collecting the symbols. We want others>FN>CB>PL>CP
                    var symbols = symbol.collectSymbols().sort(function (a, b) {
                        return rank(b) - rank(a);
                    })
                        // Distribute the power to each symbol and expand
                        .map(function (s) {
                            var x = _.pow(s, _.parse(p));
                            var e = expand(x, opt);
                            return e;
                        });

                    var f = symbols.pop();

                    // If the first symbols isn't a composite then we're done
                    if (f.isComposite() && f.isLinear()) {
                        symbols.forEach(function (s) {
                            f = mix(f, s, opt);
                        });

                        // If f is of group PL or CP then we can expand some more
                        if (f.isComposite()) {
                            if (f.power > 1) {
                                f = expand(_.pow(f, _.parse(f.power)), opt);
                            }
                            // Put back the multiplier
                            retval = _.multiply(_.parse(m), f).distributeMultiplier();
                            ;
                        }
                        else {
                            // Everything is expanded at this point so if it's still a CB
                            // then just return the symbol
                            retval = f;
                        }
                    }
                    else {
                        // Just multiply back in the expanded form of each
                        retval = f;
                        symbols.forEach(function (s) {
                            retval = _.multiply(retval, s);
                        });
                        // Put back the multiplier
                        retval = _.multiply(retval, _.parse(m)).distributeMultiplier();
                    }

                    // TODO: This exists solely as a quick fix for sqrt(11)*sqrt(33) not simplifying.
                    if (retval.group === CB) {
                        retval = _.parse(retval);
                    }
                }
                else {
                    // Otherwise just return the expression
                    retval = symbol;
                }
                // Final cleanup and return
                return retval;
            }
            catch(e) {
                return original;
            }

            return original;
        }

        /**
         * Returns an identity matrix of nxn
         * @param {Number} n
         * @returns {Matrix}
         */
        function imatrix(n) {
            return Matrix.identity(n);
        }

        /**
         * Retrieves and item from a vector
         * @param {Vector} vector
         * @param {Number} index
         * @returns {Vector|Symbol}
         */
        function vecget(vector, index) {
            if (index.isConstant() && isInt(index))
                return vector.elements[index];
            return _.symfunction('vecget', arguments);
        }

        /**
         * Removes duplicates from a vector
         * @param {Vector} vector
         * @param {Number} tolerance
         * @returns {Vector}
         */
        function vectrim(vector, tolerance) {
            tolerance = typeof tolerance === 'undefined' ? 1e-14 : tolerance;

            vector = vector.clone();

            tolerance = Number(tolerance);
            //place algebraic solutions first
            vector.elements.sort(function (a, b) {
                return b.group - a.group;
            });
            //depending on the start point we may have duplicates so we need to clean those up a bit.
            //start by creating an object with the solution and the numeric value. This way we don't destroy algebraic values
            vector.elements = removeDuplicates(vector.elements, function (a, b) {
                var diff = Number(_.subtract(evaluate(a), evaluate(b)).abs());
                return diff <= tolerance;
            });

            return vector;
        }

        /**
         * Set a value for a vector at a given index
         * @param {Vector} vector
         * @param {Number} index
         * @param {Symbol} value
         * @returns {Vector}
         */
        function vecset(vector, index, value) {
            if (!index.isConstant)
                return _.symfunction('vecset', arguments);
            vector.elements[index] = value;
            return vector;
        }

        function matget(matrix, i, j) {
            if (i.isConstant() && j.isConstant())
                return matrix.elements[i][j];
            return _.symfunction('matget', arguments);
        }

        function matgetrow(matrix, i) {
            if (i.isConstant())
                return new Matrix(matrix.elements[i]);
            return _.symfunction('matgetrow', arguments);
        }

        function matsetrow(matrix, i, x) {
            //handle symbolics
            if (!i.isConstant())
                return _.symfunction('matsetrow', arguments);
            if (matrix.elements[i].length !== x.elements.length)
                throw new DimensionError('Matrix row must match row dimensions!');
            var M = matrix.clone();
            M.elements[i] = x.clone().elements;
            return M;
        }

        function matgetcol(matrix, col_index) {
            //handle symbolics
            if (!col_index.isConstant())
                return _.symfunction('matgetcol', arguments);
            col_index = Number(col_index);
            var M = Matrix.fromArray([]);
            matrix.each(function (x, i, j) {
                if (j === col_index) {
                    M.elements.push([x.clone()]);
                }
            });
            return M;
        }

        function matsetcol(matrix, j, col) {
            //handle symbolics
            if (!j.isConstant())
                return _.symfunction('matsetcol', arguments);
            j = Number(j);
            if (matrix.rows() !== col.elements.length)
                throw new DimensionError('Matrix columns must match number of columns!');
            col.each(function (x, i) {
                matrix.set(i - 1, j, x.elements[0].clone());
            });
            return matrix;
        }


        function matset(matrix, i, j, value) {
            matrix.elements[i][j] = value;
            return matrix;
        }

        //the constructor for vectors
        function vector() {
            return new Vector([].slice.call(arguments));
        }

        //the constructor for matrices
        function matrix() {
            return Matrix.fromArray(arguments);
        }

        //the constructor for sets
        function set() {
            return Set.fromArray(arguments);
        }

        function determinant(symbol) {
            if (isMatrix(symbol)) {
                return symbol.determinant();
            }
            return symbol;
        }

        function size(symbol) {
            var retval;
            if (isMatrix(symbol))
                retval = [new Symbol(symbol.cols()), new Symbol(symbol.rows())];
            else if (isVector(symbol) || isSet(symbol))
                retval = new Symbol(symbol.elements.length);
            else
                err('size expects a matrix or a vector');
            return retval;
        }

        function dot(vec1, vec2) {
            if (isVector(vec1) && isVector(vec2))
                return vec1.dot(vec2);
            err('function dot expects 2 vectors');
        }

        function cross(vec1, vec2) {
            if (isVector(vec1) && isVector(vec2))
                return vec1.cross(vec2);
            err('function cross expects 2 vectors');
        }

        function transpose(mat) {
            if (isMatrix(mat))
                return mat.transpose();
            err('function transpose expects a matrix');
        }

        function invert(mat) {
            if (isMatrix(mat))
                return mat.invert();
            err('invert expects a matrix');
        }

        //basic set functions
        function union(set1, set2) {
            return set1.union(set2);
        }

        function intersection(set1, set2) {
            return set1.intersection(set2);
        }

        function contains(set1, e) {
            return set1.contains(e);
        }

        function difference(set1, set2) {
            return set1.difference(set2);
        }

        function intersects(set1, set2) {
            return new Symbol(Number(set1.intersects(set2)));
        }

        function is_subset(set1, set2) {
            return new Symbol(Number(set1.is_subset(set2)));
        }

        function print() {
            arguments2Array(arguments).map(function (x) {
                console.log(x.toString());
            });
        }

        function testSQRT(symbol) {
            //wrap the symbol in sqrt. This eliminates one more check down the line.
            if (!isSymbol(symbol.power) && symbol.power.absEquals(0.5)) {
                var sign = symbol.power.sign();
                //don't devide the power directly. Notice the use of toString. This makes it possible
                //to use a bigNumber library in the future
                var retval = sqrt(symbol.group === P ? new Symbol(symbol.value) : symbol.toLinear());
                //place back the sign of the power
                if (sign < 0)
                    retval.invert();
                return retval;
            }
            return symbol;
        }

        //try to reduce a symbol by pulling its power
        function testPow(symbol) {
            if (symbol.group === P) {
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

        //Link the functions to the parse so they're available outside of the library.
        //This is strictly for convenience and may be deprecated.
        this.expand = expand;
        this.round = round;
        this.clean = clean;
        this.sqrt = sqrt;
        this.cbrt = cbrt;
        this.abs = abs;
        this.log = log;
        this.rationalize = rationalize;
        this.nthroot = nthroot;
        this.arg = arg;
        this.conjugate = conjugate;
        this.imagpart = imagpart;
        this.realpart = realpart;

        //TODO:
        //Utilize the function below instead of the linked function
        this.getFunction = function (name) {
            return functions[name][0];
        };

//Parser.methods ===============================================================
        this.addPreprocessor = function (name, action, order, shift_cells) {
            var names = preprocessors.names;
            var actions = preprocessors.actions;
            if ((typeof action !== 'function')) //the person probably forgot to specify a name
                throw new PreprocessorError('Incorrect parameters. Function expected!');
            if (!order) {
                names.push(name);
                actions.push(action);
            }
            else {
                if (shift_cells) {
                    names.splice(order, 0, name);
                    actions.splice(order, 0, action);
                }
                else {
                    names[order] = name;
                    actions[order] = action;
                }
            }
        };

        this.getPreprocessors = function () {
            var preprocessors = {};
            for (var i = 0, l = preprocessors.names.length; i < l; i++) {
                var name = preprocessors.names[i];
                preprocessors[name] = {
                    order: i,
                    action: preprocessors.actions[i]
                };
            }
            return preprocessors;
        };

        this.removePreprocessor = function (name, shift_cells) {
            var i = preprocessors.names.indexOf(name);
            if (shift_cells) {
                remove(preprocessors.names, i);
                remove(preprocessors.actions, i);
            }
            else {
                preprocessors.names[i] = undefined;
                preprocessors.actions[i] = undefined;
            }
        };

        //The loader for functions which are not part of Math2
        this.mapped_function = function () {
            var subs = {},
                params = this.params;

            for (var i = 0; i < params.length; i++) {
                subs[params[i]] = String(arguments[i]);
            }

            return _.parse(this.body, subs);
        };
        /**
         * Adds two symbols
         * @param {Symbol} a
         * @param {Symbol} b
         * @returns {Symbol}
         */
        this.add = function (a, b) {
            var aIsSymbol = isSymbol(a),
                bIsSymbol = isSymbol(b);
            //we're dealing with two symbols
            if (aIsSymbol && bIsSymbol) {
                //forward the adding of symbols with units to the Unit module
                if (a.unit || b.unit) {
                    return _.Unit.add(a, b);
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
                    return this.add(b, a);
                }

                /*note to self: Please don't forget about this dilemma ever again. In this model PL and CB goes crazy
                 * because it doesn't know which one to prioritize. */
                //correction to PL dilemma
                if (g1 === CB && g2 === PL && a.value === b.value) {
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

                if (g1 === CP && g2 === CP && b.isLinear() && !a.isLinear() && h1 !== h2) {
                    return this.add(b, a);
                }

                //PL & PL should compare hashes and not values e.g. compare x+x^2 with x+x^3 and not x with x
                if (g1 === PL && g2 === PL) {
                    v1 = h1;
                    v2 = h2;
                }

                var PN = g1 === P && g2 === N,
                    PNEQ = a.value === b.multiplier.toString(),
                    valEQ = (v1 === v2 || h1 === h2 && h1 !== undefined || (PN && PNEQ));

                //equal values, equal powers
                if (valEQ && powEQ && g1 === g2) {
                    //make sure to convert N to something P can work with
                    if (PN)
                        b = b.convert(P);//CL

                    //handle PL
                    if (g1 === PL && (g2 === S || g2 === P)) {
                        a.distributeMultiplier();
                        result = a.attach(b);
                    }
                    else {
                        result = a;//CL
                        if (a.multiplier.isOne() && b.multiplier.isOne() && g1 === CP && a.isLinear() && b.isLinear()) {
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
                else if (valEQ && g1 !== PL) {
                    //break the tie for e.g. (x+1)+((x+1)^2+(x+1)^3)
                    if (g1 === CP && g2 === PL) {
                        b.insert(a, 'add');
                        result = b;
                    }
                    else {
                        result = Symbol.shell(PL).attach([a, b]);
                        //update the hash
                        result.value = g1 === PL ? h1 : v1;
                    }
                }
                else if (aIsComposite && a.isLinear()) {
                    var canIterate = g1 === g2,
                        bothPL = g1 === PL && g2 === PL;

                    //we can only iterate group PL if they values match
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
                    else if (bothPL && a.value !== h2 || g1 === PL && !valEQ) {
                        result = Symbol.shell(CP).attach([a, b]);
                        result.updateHash();

                    }
                    else {
                        result = a.attach(b);
                    }
                }
                else {
                    if (g1 === FN && a.fname === SQRT && g2 !== EX && b.power.equals(0.5)) {
                        var m = b.multiplier.clone();
                        b = sqrt(b.toUnitMultiplier().toLinear());
                        b.multiplier = m;
                    }
                    //fix for issue #3 and #159
                    if (a.length === 2 && b.length === 2 && even(a.power) && even(b.power)) {
                        result = _.add(expand(a), expand(b));
                    }
                    else {
                        result = Symbol.shell(CP).attach([a, b]);
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
                        M.set(i, j, _.add(a.clone(), e));
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
                            b.elements[i] = _.add(a.clone(), b.elements[i]);
                        });
                    }
                    else {
                        if (isVector(a) && isVector(b)) {
                            b.each(function (x, i) {
                                i--;
                                b.elements[i] = _.add(a.elements[i], b.elements[i]);
                            });
                        }
                        else if (isVector(a) && isMatrix(b)) {
                            //try to convert a to a matrix
                            return _.add(b, a);
                        }
                        else if (isMatrix(a) && isVector(b)) {
                            if (b.elements.length === a.rows()) {
                                var M = new Matrix(), l = a.cols();
                                b.each(function (e, i) {
                                    var row = [];
                                    for (var j = 0; j < l; j++) {
                                        row.push(_.add(a.elements[i - 1][j].clone(), e.clone()));
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
        /**
         * Gets called when the parser finds the - operator. Not the prefix operator. See this.add
         * @param {Symbol} a
         * @param {Symbol} b
         * @returns {Symbol}
         */
        this.subtract = function (a, b) {
            var aIsSymbol = isSymbol(a),
                bIsSymbol = isSymbol(b), t;

            if (aIsSymbol && bIsSymbol) {
                if (a.unit || b.unit) {
                    return _.Unit.subtract(a, b);
                }
                return this.add(a, b.negate());
            }
            else {
                if (bIsSymbol && isVector(a)) {
                    b = a.map(function (x) {
                        return _.subtract(x, b.clone());
                    });
                }
                else if (aIsSymbol && isVector(b)) {
                    b = b.map(function (x) {
                        return _.subtract(a.clone(), x);
                    });
                }
                else if (isVector(a) && isVector(b)) {
                    if (a.dimensions() === b.dimensions())
                        b = a.subtract(b);
                    else
                        _.error('Unable to subtract vectors. Dimensions do not match.');
                }
                else if (isMatrix(a) && isVector(b)) {
                    if (b.elements.length === a.rows()) {
                        var M = new Matrix(), l = a.cols();
                        b.each(function (e, i) {
                            var row = [];
                            for (var j = 0; j < l; j++) {
                                row.push(_.subtract(a.elements[i - 1][j].clone(), e.clone()));
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
                    return _.add(M, a);
                }
                else if (isMatrix(a) && isMatrix(b)) {
                    b = a.subtract(b);
                }
                else if (isMatrix(a) && bIsSymbol) {
                    var M = new Matrix();
                    a.each(function (x, i, j) {
                        M.set(i, j, _.subtract(x, b.clone()));
                    });
                    b = M;
                }
                else if (aIsSymbol && isMatrix(b)) {
                    var M = new Matrix();
                    b.each(function (x, i, j) {
                        M.set(i, j, _.subtract(a.clone(), x));
                    });
                    b = M;
                }
                return b;
            }
        };
        /**
         * Gets called when the parser finds the * operator. See this.add
         * @param {Symbol} a
         * @param {Symbol} b
         * @returns {Symbol}
         */
        this.multiply = function (a, b) {
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

                if (b.group > a.group && !(b.group === CP))
                    return this.multiply(b, a);
                //correction for PL/CB dilemma
                if (a.group === CB && b.group === PL && a.value === b.value) {
                    var t = a;
                    a = b;
                    b = t;//swap
                }

                var g1 = a.group,
                    g2 = b.group,
                    bnum = b.multiplier.num,
                    bden = b.multiplier.den;

                if (g1 === FN && a.fname === SQRT && !b.isConstant() && a.args[0].value === b.value && !a.args[0].multiplier.lessThan(0)) {
                    //unwrap sqrt
                    var a_pow = a.power;
                    var a_multiplier = _.parse(a.multiplier);
                    a = _.multiply(a_multiplier, a.args[0].clone());
                    a.setPower(new Frac(0.5).multiply(a_pow));
                    g1 = a.group;
                }
                //simplify n/sqrt(n). Being very specific
                else if (g1 === FN && a.fname === SQRT && a.multiplier.equals(1) && a.power.equals(-1) && b.isConstant() && a.args[0].equals(b)) {
                    a = _.symfunction(SQRT, [b.clone()]);
                    b = new Symbol(1);
                }
                ;

                var v1 = a.value,
                    v2 = b.value,
                    sign = new Frac(a.sign()),
                    //since P is just a morphed version of N we need to see if they relate
                    ONN = (g1 === P && g2 === N && b.multiplier.equals(a.value)),
                    //don't multiply the multiplier of b since that's equal to the value of a
                    m = ONN ? new Frac(1).multiply(a.multiplier).abs() : a.multiplier.multiply(b.multiplier).abs(),
                    result = a.clone().toUnitMultiplier();
                b = b.clone().toUnitMultiplier(true);

                //further simplification of sqrt
                if (g1 === FN && g2 === FN) {
                    var u = a.args[0].clone();
                    var v = b.args[0].clone();
                    if (a.fname === SQRT && b.fname === SQRT && a.isLinear() && b.isLinear()) {

                        var q = _.divide(u, v).invert();
                        if (q.gt(1) && isInt(q)) {
                            //b contains a factor a which can be moved to a
                            result = _.multiply(a.args[0].clone(), sqrt(q.clone()));
                            b = new Symbol(1);
                        }
                    }
                        //simplify factorial but only if
                        //1 - It's division so b will have a negative power
                    //2 - We're not dealing with factorials of numbers
                    else if (a.fname === FACTORIAL && b.fname === FACTORIAL && !u.isConstant() && !v.isConstant() && b.power < 0) {
                        //assume that n = positive
                        var d = _.subtract(u.clone(), v.clone());

                        //if it's not numeric then we don't know if we can simplify so just return
                        if (d.isConstant()) {

                            //there will never be a case where d == 0 since this will already have
                            //been handled at the beginning of this function
                            t = new Symbol(1);
                            if (d < 0) {
                                //If d is negative then the numerator is larger so expand that
                                for (var i = 0, n = Math.abs(d); i <= n; i++) {
                                    var s = _.add(u.clone(), new Symbol(i));
                                    t = _.multiply(t, s);
                                }

                                result = _.multiply(_.pow(u, new Symbol(a.power)), _.pow(t, new Symbol(b.power)));

                                b = new Symbol(1);
                            }
                            else {
                                //Otherwise the denominator is larger so expand that
                                for (var i = 0, n = Math.abs(d); i <= n; i++) {
                                    var s = _.add(v.clone(), new Symbol(i));
                                    t = _.multiply(t, s);
                                }

                                result = _.multiply(_.pow(t, new Symbol(a.power)), _.pow(v, new Symbol(b.power)));

                                b = new Symbol(1);
                            }
                        }
                    }
                }


                //if both are PL then their hashes have to match
                if (v1 === v2 && g1 === PL && g1 === g2) {
                    v1 = a.text('hash');
                    v2 = b.text('hash');
                }

                //same issue with (x^2+1)^x*(x^2+1)
                //EX needs an exception when multiplying because it needs to recognize
                //that (x+x^2)^x has the same hash as (x+x^2). The latter is kept as x
                if (g2 === EX && b.previousGroup === PL && g1 === PL) {
                    v1 = text(a, 'hash', EX);
                }

                if ((v1 === v2 || ONN) && !(g1 === PL && (g2 === S || g2 === P || g2 === FN)) && !(g1 === PL && g2 === CB)) {
                    var p1 = a.power,
                        p2 = b.power,
                        isSymbolP1 = isSymbol(p1),
                        isSymbolP2 = isSymbol(p2),
                        toEX = (isSymbolP1 || isSymbolP2);
                    //TODO: this needs cleaning up
                    if (g1 === PL && g2 !== PL && b.previousGroup !== PL && p1.equals(1)) {
                        result = new Symbol(0);
                        a.each(function (x) {
                            result = _.add(result, _.multiply(x, b.clone()));
                        }, true);
                    }
                    else {
                        //add the powers
                        result.power = toEX ? _.add(
                            !(isSymbol(p1)) ? new Symbol(p1) : p1,
                            !(isSymbol(p2)) ? new Symbol(p2) : p2
                        ) : (g1 === N /*don't add powers for N*/ ? p1 : p1.add(p2));

                        //eliminate zero power values and convert them to numbers
                        if (result.power.equals(0))
                            result = result.convert(N);

                        //properly convert to EX
                        if (toEX)
                            result.convert(EX);

                        //take care of imaginaries
                        if (a.imaginary && b.imaginary) {
                            var isEven = even(result.power % 2);
                            if (isEven) {
                                result = new Symbol(1);
                                m.negate();
                            }
                        }

                        //cleanup: this causes the LaTeX generator to get confused as to how to render the symbol
                        if (result.group !== EX && result.previousGroup)
                            result.previousGroup = undefined;
                        //the sign for b is floating around. Remember we are assuming that the odd variable will carry
                        //the sign but this isn't true if they're equals symbols
                        result.multiplier = result.multiplier.multiply(b.multiplier);
                    }
                }
                else if (g1 === CB && a.isLinear()) {
                    if (g2 === CB)
                        b.distributeExponent();
                    if (g2 === CB && b.isLinear()) {
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
                    if (g1 !== N) {
                        if (g1 === CB) {
                            result.distributeExponent();
                            result.combine(b);
                        }
                        else if (!b.isOne()) {
                            var bm = b.multiplier.clone();
                            b.toUnitMultiplier();
                            result = Symbol.shell(CB).combine([result, b]);
                            //transfer the multiplier to the outside
                            result.multiplier = result.multiplier.multiply(bm);
                        }
                    }
                    else {
                        result = b.clone().toUnitMultiplier();
                    }
                }

                if (result.group === P) {
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

                //unpack CB if length is only one
                if (result.length === 1) {
                    var t = result.multiplier;
                    //transfer the multiplier
                    result = firstObject(result.symbols);
                    result.multiplier = result.multiplier.multiply(t);
                }

                //reduce square root
                var ps = result.power.toString();
                if (even(ps) && result.fname === SQRT) {
                    //grab the sign of the symbol
                    sign = sign * result.sign();
                    var p = result.power;
                    result = result.args[0];
                    result = _.multiply(new Symbol(m), _.pow(result, new Symbol(p.divide(new Frac(2)))));
                    //flip it back to the correct sign
                    if (sign < 0)
                        result.negate()
                }
                else {
                    result.multiplier = result.multiplier.multiply(m).multiply(sign);
                    if (result.group === CP && result.isImaginary())
                        result.distributeMultiplier();
                }

                //back convert group P to a simpler group N if possible
                if (result.group === P && isInt(result.power.toDecimal()))
                    result = result.convert(N);

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
                        M.set(i, j, _.multiply(a.clone(), e));
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
                            b.elements[i] = _.multiply(a.clone(), b.elements[i]);
                        });
                    }
                    else {
                        if (isVector(a) && isVector(b)) {
                            b.each(function (x, i) {
                                i--;
                                b.elements[i] = _.multiply(a.elements[i], b.elements[i]);
                            });
                        }
                        else if (isVector(a) && isMatrix(b)) {
                            //try to convert a to a matrix
                            return this.multiply(b, a);
                        }
                        else if (isMatrix(a) && isVector(b)) {
                            if (b.elements.length === a.rows()) {
                                var M = new Matrix(), l = a.cols();
                                b.each(function (e, i) {
                                    var row = [];
                                    for (var j = 0; j < l; j++) {
                                        row.push(_.multiply(a.elements[i - 1][j].clone(), e.clone()));
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
        /**
         * Gets called when the parser finds the / operator. See this.add
         * @param {Symbol} a
         * @param {Symbol} b
         * @returns {Symbol}
         */
        this.divide = function (a, b) {
            var aIsSymbol = isSymbol(a),
                bIsSymbol = isSymbol(b);

            if (aIsSymbol && bIsSymbol) {
                //forward to Unit division
                if (a.unit || b.unit) {
                    return _.Unit.divide(a, b);
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
                    result = _.multiply(a, b);
                }
                return result;
            }
            else {
                //******* Vectors & Matrices *********//
                var isVectorA = isVector(a), isVectorB = isVector(b);
                if (aIsSymbol && isVectorB) {
                    b = b.map(function (x) {
                        return _.divide(a.clone(), x);
                    });
                }
                else if (isVectorA && bIsSymbol) {
                    b = a.map(function (x) {
                        return _.divide(x, b.clone());
                    });
                }
                else if (isVectorA && isVectorB) {
                    if (a.dimensions() === b.dimensions()) {
                        b = b.map(function (x, i) {
                            return _.divide(a.elements[--i], x);
                        });
                    }
                    else
                        _.error('Cannot divide vectors. Dimensions do not match!');
                }
                else {
                    var isMatrixA = isMatrix(a), isMatrixB = isMatrix(b);
                    if (isMatrixA && bIsSymbol) {
                        var M = new Matrix();
                        a.eachElement(function (x, i, j) {
                            M.set(i, j, _.divide(x, b.clone()));
                        });
                        b = M;
                    }
                    else if (aIsSymbol && isMatrixB) {
                        var M = new Matrix();
                        b.eachElement(function (x, i, j) {
                            M.set(i, j, _.divide(a.clone(), x));
                        });
                        b = M;
                    }
                    else if (isMatrixA && isMatrixB) {
                        var M = new Matrix();
                        if (a.rows() === b.rows() && a.cols() === b.cols()) {
                            a.eachElement(function (x, i, j) {
                                M.set(i, j, _.divide(x, b.elements[i][j]));
                            });
                            b = M;
                        }
                        else {
                            _.error('Dimensions do not match!');
                        }
                    }
                    else if (isMatrixA && isVectorB) {
                        if (a.cols() === b.dimensions()) {
                            var M = new Matrix();
                            a.eachElement(function (x, i, j) {
                                M.set(i, j, _.divide(x, b.elements[i].clone()));
                            });
                            b = M;
                        }
                        else {
                            _.error('Unable to divide matrix by vector.');
                        }
                    }
                }
                return b;
            }
        };
        /**
         * Gets called when the parser finds the ^ operator. See this.add
         * @param {Symbol} a
         * @param {Symbol} b
         * @returns {Symbol}
         */
        this.pow = function (a, b) {
            var aIsSymbol = isSymbol(a),
                bIsSymbol = isSymbol(b);
            if (aIsSymbol && bIsSymbol) {
                //it has units then it's the Unit module's problem
                if (a.unit || b.unit) {
                    return _.Unit.pow(a, b);
                }

                // Handle abs
                if (a.group === FN && a.fname === ABS && even(b)) {
                    var m = a.multiplier.clone();
                    var raised = _.pow(a.args[0], b);
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
                        return _.multiply(Symbol.infinity(), _.pow(new Symbol(a.sign()), b.clone()));
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
                    im = _.multiply(Symbol.imaginary(), new Symbol(Math.sin(k)));
                    return _.add(re, im);
                }

                // Imaginary number under negative nthroot or to the n
                if (Settings.PARSE2NUMBER && a.isImaginary() && bIsConstant && isInt(b) && !b.lessThan(0)) {
                    var re, im, r, theta, nre, nim, phi;
                    re = a.realpart();
                    im = a.imagpart();
                    if (re.isConstant('all') && im.isConstant('all')) {
                        phi = Settings.USE_BIG ? Symbol(bigDec.atan2(i.multiplier.toDecimal(), r.multiplier.toDecimal()).times(b.toString())) : Math.atan2(im, re) * b;
                        theta = new Symbol(phi);
                        r = _.pow(Symbol.hyp(re, im), b);
                        nre = _.multiply(r.clone(), _.trig.cos(theta.clone()));
                        nim = _.multiply(r, _.trig.sin(theta));
                        return _.add(nre, _.multiply(Symbol.imaginary(), nim));
                    }
                }

                // Take care of the symbolic part
                result.toUnitMultiplier();
                //simpifly sqrt
                if (result.group === FN && result.fname === SQRT && !bIsConstant) {
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
                        result = _.symfunction(PARENTHESIS, [result]);
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
                            c = _.pow(_.symfunction(PARENTHESIS, [new Symbol(sign)]), b.clone());
                        }
                    }

                    result = new Symbol(Math.pow(a.multiplier.toDecimal(), b.multiplier.toDecimal()));

                    //result = new Symbol(Math2.bigpow(a.multiplier, b.multiplier));
                    //put the back sign
                    if (c)
                        result = _.multiply(result, c);
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
                        //multiplying is justified since after mulltiplyPower if it was of group P it will now be of group N
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
                            result = _.multiply(_.pow(a, b), i);
                        }
                        else {
                            var aa = a.clone();
                            aa.multiplier.negate();
                            result = _.pow(_.symfunction(PARENTHESIS, [new Symbol(sign)]), b.clone());
                            var _a = _.pow(new Symbol(aa.multiplier.num), b.clone());
                            var _b = _.pow(new Symbol(aa.multiplier.den), b.clone());
                            var r = _.divide(_a, _b);
                            result = _.multiply(result, r);
                        }
                    }
                    else if (Settings.PARSE2NUMBER && b.isImaginary()) {
                        //4^(i + 2) = e^(- (2 - 4 i) π n + (2 + i) log(4))

                        var re = b.realpart();
                        var im = b.imagpart();
                        /*
                         if (b.group === CP && false) {
                         var ex = _.pow(a.clone(), re);
                         var xi = _.multiply(_.multiply(ex.clone(), trig.sin(im.clone())), Symbol.imaginary());
                         var xa = _.multiply(trig.cos(im), ex);
                         result = _.add(xi, xa);
                         }
                         else {
                         */
                        var aa = a.clone().toLinear();
                        var a1 = _.pow(aa.clone(), re);
                        var log_a = log(aa.clone());
                        var b1 = trig.cos(_.multiply(im.clone(), log_a));
                        var c1 = _.multiply(trig.sin(_.multiply(im, log(aa))), Symbol.imaginary());
                        result = _.multiply(a1, _.add(b1, c1));
                        result = _.expand(_.parse(result));
                        /*
                         }
                         */
                    }
                    else {
                        //b is a symbol
                        var neg_num = a.group === N && sign < 0,
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
                        if (bIsConstant && a.group !== EX) {
                            var evenr = even(b.multiplier.den),
                                evenp = even(a.power),
                                n = result.power.toDecimal(),
                                evennp = even(n);
                            if (evenr && evenp && !evennp) {
                                if (n === 1)
                                    result = _.symfunction(ABS, [result]);
                                else if (!isInt(n)) {
                                    var p = result.power;
                                    result = _.symfunction(ABS, [result.toLinear()]).setPower(p);
                                }
                                else {
                                    result = _.multiply(_.symfunction(ABS, [result.clone().toLinear()]),
                                        result.clone().setPower(new Frac(n - 1)));
                                }
                                //quick workaround. Revisit
                                if (Settings.POSITIVE_MULTIPLIERS && result.fname === ABS)
                                    result = result.args[0];
                            }
                        }
                        //multiply out sqrt
                        if (b.equals(2) && result.group === CB) {
                            var _result = new Symbol(1);
                            result.each(function (sym) {
                                _result = _.multiply(_result, _.pow(sym, b));
                            });
                            result = _result;
                        }
                    }
                }

                result = testSQRT(result);

                // Don't multiply until we've tested the remaining symbol
                if (num && den) {
                    result = _.multiply(result, testPow(_.multiply(num, den)));
                }

                // Reduce square root
                if (result.fname === SQRT) {
                    var isEX = result.group === EX;
                    var t = isEX ? result.power.multiplier.toString() : result.power.toString();
                    if (even(t)) {
                        var pt = isEX ? _.divide(result.power, new Symbol(2)) : new Symbol(result.power.divide(new Frac(2))),
                            m = result.multiplier;
                        result = _.pow(result.args[0], pt);
                        result.multiplier = result.multiplier.multiply(m);
                    }
                }
                // Detect Euler's identity
                else if (!Settings.IGNORE_E && result.isE() && result.group === EX && result.power.contains('pi')
                    && result.power.contains(Settings.IMAGINARY) && b.group === CB) {
                    var theta = b.stripVar(Settings.IMAGINARY);
                    result = _.add(trig.cos(theta), _.multiply(Symbol.imaginary(), trig.sin(theta)));
                }

                return result;
            }
            else {
                if (isVector(a) && bIsSymbol) {
                    a = a.map(function (x) {
                        return _.pow(x, b.clone());
                    });
                }
                else if (isMatrix(a) && bIsSymbol) {
                    var M = new Matrix();
                    a.eachElement(function (x, i, j) {
                        M.set(i, j, _.pow(x, b.clone()));
                    });
                    a = M;
                }
                else if (aIsSymbol && isMatrix(b)) {
                    var M = new Matrix();
                    b.eachElement(function (x, i, j) {
                        M.set(i, j, _.pow(a.clone(), x));
                    });
                    a = M;
                }
                return a;
            }
        };
        // Gets called when the parser finds the , operator.
        // Commas return a Collector object which is roughly an array
        this.comma = function (a, b) {
            if (!(a instanceof Collection))
                a = Collection.create(a);
            a.append(b);
            return a;
        };
        // Link to modulus
        this.mod = function (a, b) {
            return mod(a, b);
        };
        // Used to slice elements from arrays
        this.slice = function (a, b) {
            return new Slice(a, b);
        };
        // The equality setter
        this.equals = function (a, b) {
            // Equality can only be set for group S so complain it's not
            if (a.group !== S && !a.isLinear())
                err('Cannot set equality for ' + a.toString());
            VARS[a.value] = b.clone();
            return b;
        };
        // Percent
        this.percent = function (a) {
            return _.divide(a, new Symbol(100));
        };
        // Set variable
        this.assign = function (a, b) {
            if (a instanceof Collection && b instanceof Collection) {
                a.elements.map(function (x, i) {
                    return _.assign(x, b.elements[i]);
                });
                return Vector.fromArray(b.elements);
            }
            if (a.parent) {
                // It's referring to the parent instead. The current item can be discarded
                var e = a.parent;
                e.elements[e.getter] = b;
                delete e.getter;
                return e;
            }

            if (a.group !== S)
                throw new NerdamerValueError('Cannot complete operation. Incorrect LH value for ' + a);
            VARS[a.value] = b;
            return b;
        };
        this.function_assign = function (a, b) {
            var f = a.elements.pop();
            return setFunction(f, a.elements, b);
        };
        // Function to quickly convert bools to Symbols
        var bool2Symbol = function (x) {
            return new Symbol(x === true ? 1 : 0);
        };
        //check for equality
        this.eq = function (a, b) {
            return bool2Symbol(a.equals(b));
        };
        //checks for greater than
        this.gt = function (a, b) {
            return bool2Symbol(a.gt(b));
        };
        //checks for greater than equal
        this.gte = function (a, b) {
            return bool2Symbol(a.gte(b));
        };
        //checks for less than
        this.lt = function (a, b) {
            return bool2Symbol(a.lt(b));
        };
        //checks for less than equal
        this.lte = function (a, b) {
            return bool2Symbol(a.lte(b));
        };
        // wraps the factorial
        this.factorial = function (a) {
            return this.symfunction(FACTORIAL, [a]);
        };
        // wraps the double factorial
        this.dfactorial = function (a) {
            return this.symfunction(DOUBLEFACTORIAL, [a]);
        };
    }

    //The latex generator
    LaTeX.$ = _;
    LaTeX.$Parser = Parser;

    Symbol.$LaTeX = LaTeX;
    Symbol.$text = text;
    Symbol.$variables = variables;
//Vector =======================================================================
    // Vector injections
    Vector.prototype.$ = _;
    Vector.prototype.$block = block;

//Matrix =======================================================================
    Matrix.prototype.$ = _;
    Matrix.prototype.$LaTeX = LaTeX;
    Matrix.prototype.$block = block;

    Expression.prototype.$LaTeX = LaTeX;
    Expression.prototype.$block = block;
    Expression.prototype.$variables = variables;


//build ========================================================================
    Build.$ = _;
    Build.$block = block;
    Build.$variables = variables;


//finalize =====================================================================
    /* FINALIZE */
    (function () {
        reserveNames(_.CONSTANTS);
        reserveNames(_.functions);
        _.initConstants();
        //bug fix for error but needs to be revisited
        if (!_.error)
            _.error = err;

        //Store the log and log10 functions
        Settings.LOG_FNS = {
            log: _.functions['log'],
            log10: _.functions['log10']
        };

    })();

    /* END FINALIZE */

//Core =========================================================================
    var Utils = {
        allSame: allSame,
        allNumeric: allNumeric,
        arguments2Array: arguments2Array,
        arrayAddSlices: arrayAddSlices,
        arrayClone: arrayClone,
        arrayMax: arrayMax,
        arrayMin: arrayMin,
        arrayEqual: arrayEqual,
        arrayUnique: arrayUnique,
        arrayGetVariables: arrayGetVariables,
        arraySum: arraySum,
        block: block,
        build: Build.build,
        clearU: clearU,
        comboSort: comboSort,
        compare: compare,
        convertToVector: convertToVector,
        customType: customType,
        decompose_fn: decompose_fn,
        each: each,
        evaluate: evaluate,
        even: even,
        evenFraction: evenFraction,
        fillHoles: fillHoles,
        firstObject: firstObject,
        format: format,
        generatePrimes: generatePrimes,
        getCoeffs: getCoeffs,
        getU: getU,
        importFunctions: importFunctions,
        inBrackets: inBrackets,
        isArray: isArray,
        isExpression: isExpression,
        isFraction: isFraction,
        isInt: isInt,
        isMatrix: isMatrix,
        isNegative: isNegative,
        isNumericSymbol: isNumericSymbol,
        isPrime: isPrime,
        isReserved: isReserved,
        isSymbol: isSymbol,
        isVariableSymbol: isVariableSymbol,
        isVector: isVector,
        keys: keys,
        knownVariable: knownVariable,
        nroots: nroots,
        remove: remove,
        reserveNames: reserveNames,
        range: range,
        round: nround,
        sameSign: sameSign,
        scientificToDecimal: Math2.scientificToDecimal,
        separate: separate,
        stringReplace: stringReplace,
        text: text,
        validateName: validateName,
        variables: variables,
        warn: warn
    };

    //This contains all the parts of nerdamer and enables nerdamer's internal functions
    //to be used.
    var C = {
        groups: Groups,
        Symbol: Symbol,
        Expression: Expression,
        Frac: Frac,
        Vector: Vector,
        Matrix: Matrix,
        Parser: Parser,
        Scientific: Scientific,
        Math2: Math2,
        LaTeX: LaTeX,
        Utils: Utils,
        PARSER: _,
        PARENTHESIS: PARENTHESIS,
        Settings: Settings,
        err: err,
        bigInt: bigInt,
        bigDec: bigDec,
        exceptions: exceptions
    };

//libExports ===================================================================
    /**
     *
     * @param {String} expression the expression to be evaluated
     * @param {Object} subs the object containing the variable values
     * @param {Integer} location a specific location in the equation list to
     * insert the evaluated expression
     * @param {String} option additional options
     * @returns {Expression}
     */
    var libExports = function (expression, subs, option, location) {
        // Initiate the numer flag
        var numer = false;

        // Is the user declaring a function?
        var fndec = /^([a-z_][a-z\d\_]*)\(([a-z_,\s]*)\):=(.+)$/gi.exec(expression);
        if (fndec)
            return nerdamer.setFunction(fndec[1], fndec[2].split(','), fndec[3]);

        // var variable, fn, args;
        // Convert any expression passed in to a string
        if (expression instanceof Expression)
            expression = expression.toString();

        // Convert it to an array for simplicity
        if (!isArray(option)) {
            option = typeof option === 'undefined' ? [] : [option];
        }

        option.forEach(function (o) {
            // Turn on the numer flag if requested
            if (o === 'numer') {
                numer = true;
                return;
            }
            // Wrap it in a function if requested. This only holds true for
            // functions that take a single argument which is the expression
            var f = _.functions[option];
            // If there's a function and it takes a single argument, then wrap
            // the expression in it
            if (f && f[1] === 1) {
                expression = `${o}(${expression})`;
            }
        });

        var e = block('PARSE2NUMBER', function () {
            return _.parse(expression, subs);
        }, numer || Settings.PARSE2NUMBER);

        if (location) {
            EXPRESSIONS[location - 1] = e;
        }
        else {
            EXPRESSIONS.push(e);
        }

        return new Expression(e);
    };
    /**
     * Converts expression into rpn form
     * @param {String} expression
     * @returns {Token[]}
     */
    libExports.rpn = function (expression) {
        return _.tokenize(_.toRPN(expression));
    };

    /**
     * Generates LaTeX from expression string
     * @param {String} e
     * @param {object} opt
     * @returns {String}
     */
    libExports.convertToLaTeX = function (e, opt) {
        return _.toTeX(e, opt);
    };

    /**
     * Converts latex to text - Very very very basic at the moment
     * @param {String} e
     * @returns {String}
     */
    libExports.convertFromLaTeX = function (e) {
        var txt = LaTeX.parse(_.tokenize(e));
        return new Expression(_.parse(txt));
    };

    /**
     * Get the version of nerdamer or a loaded add-on
     * @param {String} add_on - The add-on being checked
     * @returns {String} returns the version of nerdamer
     */
    libExports.version = function (add_on) {
        if (add_on) {
            try {
                return C[add_on].version;
            }
            catch(e) {
                return "No module named " + add_on + " found!";
            }
        }
        return version;
    };

    /**
     * Get nerdamer generated warnings
     * @returns {String[]}
     */
    libExports.getWarnings = function () {
        return WARNINGS;
    };

    /**
     *
     * @param {String} constant The name of the constant to be set
     * @param {mixed} value The value of the constant
     * @returns {Object} Returns the nerdamer object
     */
    libExports.setConstant = function (constant, value) {
        validateName(constant);
        if (!isReserved(constant)) {
            //fix for issue #127
            if (value === 'delete' || value === '') {
                delete _.CONSTANTS[constant];
            }
            else {
                if (isNaN(value))
                    throw new NerdamerTypeError('Constant must be a number!');
                _.CONSTANTS[constant] = value;
            }
        }
        return this;
    };

    /**
     * Returns the value of a previously set constant
     * @param {type} constant
     * @returns {String}
     */
    libExports.getConstant = function (constant) {
        return String(_.constant[constant]);
    };

    /**
     *
     * @param {String} name The name of the function
     * @param {Array} params_array A list containing the parameter name of the functions
     * @param {String} body The body of the function
     * @returns {Boolean} returns true if succeeded and falls on fail
     * @example nerdamer.setFunction('f',['x'], 'x^2+2');
     */
    libExports.setFunction = setFunction;

    /**
     *
     * @returns {C} Exports the nerdamer core functions and objects
     */
    libExports.getCore = function () {
        return C;
    };

    libExports.getExpression = libExports.getEquation = Expression.getExpression;

    /**
     *
     * @param {Boolean} asArray The returned names are returned as an array if this is set to true;
     * @returns {String|Array}
     */
    libExports.reserved = function (asArray) {
        if (asArray) {
            return RESERVED;
        }
        return RESERVED.join(', ');
    };

    /**
     *
     * @param {Integer} equation_number the number of the equation to clear.
     * If 'all' is supplied then all equations are cleared
     * @param {Boolean} keep_EXPRESSIONS_fixed use true if you don't want to keep EXPRESSIONS length fixed
     * @returns {Object} Returns the nerdamer object
     */
    libExports.clear = function (equation_number, keep_EXPRESSIONS_fixed) {
        if (equation_number === 'all') {
            EXPRESSIONS.splice(0, EXPRESSIONS.length);
        }
        else if (equation_number === 'last') {
            EXPRESSIONS.pop();
        }
        else if (equation_number === 'first') {
            EXPRESSIONS.shift();
        }
        else {
            var index = !equation_number ? EXPRESSIONS.length : equation_number - 1;
            keep_EXPRESSIONS_fixed === true ? EXPRESSIONS[index] = undefined : remove(EXPRESSIONS, index);
        }
        return this;
    };

    /**
     * Alias for nerdamer.clear('all')
     */
    libExports.flush = function () {
        this.clear('all');
        return this;
    };

    /**
     *
     * @param {Boolean} asObject
     * @param {Boolean} asLaTeX
     * @param {String|String[]} option
     * @returns {Array}
     */
    libExports.expressions = function (asObject, asLaTeX, option) {
        var result = asObject ? {} : [];
        for (var i = 0; i < EXPRESSIONS.length; i++) {
            var eq = asLaTeX ? LaTeX.latex(EXPRESSIONS[i], option) : text(EXPRESSIONS[i], option);
            asObject ? result[i + 1] = eq : result.push(eq);
        }
        return result;
    };

    //the method for registering modules
    libExports.register = function (obj) {
        var core = this.getCore();

        if (isArray(obj)) {
            for (var i = 0; i < obj.length; i++) {
                if (obj)
                    this.register(obj[i]);
            }
        }
        else if (obj && Settings.exclude.indexOf(obj.name) === -1) {
            //make sure all the dependencies are available
            if (obj.dependencies) {
                for (var i = 0; i < obj.dependencies.length; i++)
                    if (!core[obj.dependencies[i]])
                        throw new Error(format('{0} requires {1} to be loaded!', obj.name, obj.dependencies[i]));
            }
            //if no parent object is provided then the function does not have an address and cannot be called directly
            var parent_obj = obj.parent,
                fn = obj.build.call(core); //call constructor to get function
            if (parent_obj) {
                if (!core[parent_obj])
                    core[obj.parent] = {};

                var ref_obj = parent_obj === 'nerdamer' ? this : core[parent_obj];
                //attach the function to the core
                ref_obj[obj.name] = fn;
            }
            if (obj.visible)
                _.functions[obj.name] = [fn, obj.numargs]; //make the function available

        }
    };

    /**
     * @param {String} name variable name
     * @returns {boolean} validates if the profided string is a valid variable name
     */
    libExports.validateName = validateName;

    /**
     * @param {String} varname variable name
     * @returns {boolean} validates if the profided string is a valid variable name
     */
    libExports.validVarName = function (varname) {
        try {
            validateName(varname);
            return RESERVED.indexOf(varname) === -1;
        }
        catch(e) {
            return false;
        }
    };

    /**
     *
     * @returns {Array} Array of functions currently supported by nerdamer
     */
    libExports.supported = function () {
        return keys(_.functions);
    };

    /**
     *
     * @returns {Number} The number equations/expressions currently loaded
     */
    libExports.numEquations = libExports.numExpressions = function () {
        return EXPRESSIONS.length;
    };
    /* END EXPORTS */

    /**
     *
     * @param {String} v variable to be set
     * @param {String} val value of variable. This can be a variable expression or number
     * @returns {Object} Returns the nerdamer object
     */
    libExports.setVar = function (v, val) {
        validateName(v);
        //check if it's not already a constant
        if (v in _.CONSTANTS)
            err('Cannot set value for constant ' + v);
        if (val === 'delete' || val === '')
            delete VARS[v];
        else {
            VARS[v] = isSymbol(val) ? val : _.parse(val);
        }
        return this;
    };

    /**
     * Returns the value of a set variable
     * @param {type} v
     * @returns {varies}
     */
    libExports.getVar = function (v) {
        return VARS[v];
    };
    /**
     * Clear the variables from the VARS object
     * @returns {Object} Returns the nerdamer object
     */
    libExports.clearVars = function () {
        for (let key in VARS) {
            delete VARS[key];
        }
        return this;
    };

    /**
     *
     * @param {Function} loader
     * @returns {nerdamer}
     */
    libExports.load = function (loader) {
        loader.call(this);
        return this;
    };

    /**
     * @param {String} output - output format. Can be 'object' (just returns the VARS object), 'text' or 'latex'. Default: 'text'
     * @param {String|String[]} option
     * @returns {Object} Returns an object with the variables
     */
    libExports.getVars = function (output, option) {
        output = output || 'text';
        var variables = {};
        if (output === 'object')
            variables = VARS;
        else {
            for (var v in VARS) {
                if (output === 'latex') {
                    variables[v] = VARS[v].latex(option);
                }
                else if (output === 'text') {
                    variables[v] = VARS[v].text(option);
                }
            }
        }
        return variables;
    };

    /**
     * Set the value of a setting
     * @param {String} setting The setting to be changed
     * @param {boolean} value
     */
    libExports.set = function (setting, value) {
        //current options:
        //PARSE2NUMBER, suppress_errors
        if (typeof setting === 'object')
            for (var x in setting) {
                libExports.set(x, setting[x]);
            }

        var disallowed = ['SAFE'];
        if (disallowed.indexOf(setting) !== -1)
            err('Cannot modify setting: ' + setting);

        if (setting === 'PRECISION') {
            bigDec.set({precision: value});
            Settings.PRECISION = value;

            // Avoid that nerdamer puts out garbage after 21 decimal place
            if (value > 21) {
                this.set('USE_BIG', true);
            }
        }
        else if (setting === 'USE_LN' && value === true) {
            //set log as LN
            Settings.LOG = 'LN';
            //set log10 as log
            Settings.LOG10 = 'log';
            //point the functions in the right direction
            _.functions['log'] = Settings.LOG_FNS.log10; //log is now log10
            //the log10 function must be explicitly set
            _.functions['log'][0] = function (x) {
                if (x.isConstant())
                    return new Symbol(Math.log10(x));
                return _.symfunction(Settings.LOG10, [x]);
            };
            _.functions['LN'] = Settings.LOG_FNS.log; //LN is now log

            //remove log10
            delete _.functions['log10'];
        }
        else
            Settings[setting] = value;
    };

    /**
     * Get the value of a setting
     * @param {type} setting
     * @returns {undefined}
     */
    libExports.get = function (setting) {
        return Settings[setting];
    };

    /**
     * This functions makes internal functions available externally
     * @param {boolean} override Override the functions when calling api if it exists
     */
    libExports.api = function (override) {
        //Map internal functions to external ones
        var linker = function (fname) {
            return function () {
                var args = [].slice.call(arguments);
                for (var i = 0; i < args.length; i++)
                    args[i] = _.parse(args[i]);
                return new Expression(block('PARSE2NUMBER', function () {
                    return _.callfunction(fname, args);
                }));
            };
        };
        //perform the mapping
        for (var x in _.functions)
            if (!(x in libExports) || override)
                libExports[x] = linker(x);
    };

    libExports.replaceFunction = function (name, fn, num_args) {
        var existing = _.functions[name];
        var new_num_args = typeof num_args === 'undefined' ? existing[1] : num_args;
        _.functions[name] = [fn.call(undefined, existing[0], C), new_num_args];
    };

    libExports.setOperator = function (operator, shift) {
        _.setOperator(operator, shift);
    };

    libExports.getOperator = function (operator) {
        return _.getOperator(operator);
    };

    libExports.aliasOperator = function (operator, withOperator) {
        _.aliasOperator(operator, withOperator);
    };

    libExports.tree = function (expression) {
        return _.tree(_.toRPN(_.tokenize(expression)));
    };

    libExports.htmlTree = function (expression, indent) {
        var tree = this.tree(expression);

        return '<div class="tree">\n' +
            '    <ul>\n' +
            '        <li>\n' +
            tree.toHTML(3, indent) + '\n' +
            '        </li>\n' +
            '    </ul>\n' +
            '</div>';
    };

    libExports.addPeeker = function (name, f) {
        if (_.peekers[name])
            _.peekers[name].push(f);
    };

    libExports.removePeeker = function (name, f) {
        remove(_.peekers[name], f);
    };

    libExports.parse = function (e) {
        return String(e).split(';').map(function (x) {
            return _.parse(x);
        });
    };

    libExports.api();

    return libExports; //Done
//imports ======================================================================
})({

});

if ((typeof module) !== 'undefined') {
    module.exports = nerdamer;
}
