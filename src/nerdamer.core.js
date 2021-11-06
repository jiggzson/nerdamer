"use strict";
/*
 * Author : Martin Donk
 * Website : http://www.nerdamer.com
 * Email : martin.r.donk@gmail.com
 * Source : https://github.com/jiggzson/nerdamer
 */

const {nround, isInt, isPrime, isNumber, validateName, arrayUnique,
    arrayMin, arrayMax, warn, even, inBrackets, remove, format, firstObject,
    evenFraction, allSame, allNumeric, block, pretty_print
} = require('./Core/Utils');
const Settings = require('./Settings').Settings;
const {Symbol, isSymbol, isNumericSymbol, isVariableSymbol, isFraction, isNegative, symfunction} = require("./Core/Symbol");
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
const {generatePrimes} = require('./Core/Math.consts');
const {Token} = require('./Parser/Token');
const {Tokenizer} = require("./Parser/Tokenizer");
const {Expression, isExpression} = require("./Parser/Expression");
const {RPN} = require("./Parser/RPN");
const {Build} = require("./Parser/Build");
const {Node} = require("./Parser/Node");
const {LaTeX} = require('./LaTeX/LaTeX');

const exceptions = require('./Core/Errors');
const {Complex} = require('./Core/Complex');
const {Trig} = require('./Core/Trig');
const {TrigHyperbolic} = require('./Core/Trig.hyperbolic');
const {
    UndefinedError, NerdamerTypeError, DimensionError, NerdamerValueError, err
} = exceptions;

const {sqrt, multiply, divide, subtract, add, pow, log,
    pfactor, rationalize, abs, factorial, SymbolOperatorsDeps} = require('./Core/SymbolOperators/SymbolOperators');
const {text, TextDependencies} = require('./Core/Text');

const nerdamer = (function () {
//version ======================================================================
    const version = '1.1.12';

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
    TextDependencies.CUSTOM_OPERATORS = CUSTOM_OPERATORS;
    _._text = text;


//Expression ===================================================================
    Expression.prototype.$ = _;
    Expression.prototype.$evaluate = evaluate;



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

        //create link to classes
        this.classes = {
            Collection: Collection,
            Slice: Slice,
            Token: Token
        };
//Parser.modules ===============================================================
        //object for functions which handle complex number
        Complex.$ = _;

        Trig.$ = _;
        Trig.$expand = expand;
        Trig.$evaluate = evaluate;
        let trig = this.trig = Trig;

        TrigHyperbolic.$ = _;
        TrigHyperbolic.$evaluate = evaluate;
        let trigh = TrigHyperbolic;

        //list of supported units
        this.units = {};
        //list all the supported operators
        //brackets

        let operators = new Operators();
        operators.injectOperatorsDeps({
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
            cross, vecget, vecset, vectrim, matget, matset, matgetrow, matsetrow,
            matgetcol, matsetcol, rationalize, IF, is_in, realpart,
            imagpart, conjugate, arg, polarform, rectform, sort, union,
            contains, intersection, difference, intersects, is_subset,
        });

        this.getFunctions = () => (functions);

        //error handler
        this.error = err;


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

        this.symfunction = symfunction;

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

        //delay setting of constants until Settings is ready
        this.initConstants = function () {
            this.CONSTANTS = {
                E: new Symbol(Settings.E),
                PI: new Symbol(Settings.PI)
            };
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


        let deps = {preprocessors, functions, brackets, operators, units: _.units};
        let tokenizer = new Tokenizer(deps);

        this.tree = tokenizer.tree;

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
            return symfunction('parens', [symbol]);
        }

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
                    // FIXME: unused retval
                    retval = new Symbol(ans);
                }
                retval = new Symbol(ans.toDecimal(prec));

                return _.multiply(new Symbol(sign), retval);
            }
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
            var l, a, b;
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

        //Link the functions to the parse so they're available outside of the library.
        //This is strictly for convenience and may be deprecated.
        this.expand = expand;
        this.round = round;
        this.clean = clean;
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


        SymbolOperatorsDeps.parse = this.parse;
        SymbolOperatorsDeps.expand = expand;
        SymbolOperatorsDeps.Trig = Trig;
        SymbolOperatorsDeps.bigConvert = bigConvert;
        SymbolOperatorsDeps.evaluate = evaluate;

        this.sqrt = sqrt;
        this.multiply = multiply;
        this.divide = divide;
        this.subtract = subtract;
        this.add = add;
        this.pow = pow;
        this.log = log;
        this.abs = abs;
        this.factorial = factorial;


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
    Vector.prototype.$text = text;

//Matrix =======================================================================
    Matrix.prototype.$ = _;
    Matrix.prototype.$LaTeX = LaTeX;

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
