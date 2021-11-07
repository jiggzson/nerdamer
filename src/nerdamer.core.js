"use strict";
/*
 * Author : Martin Donk
 * Website : http://www.nerdamer.com
 * Email : martin.r.donk@gmail.com
 * Source : https://github.com/jiggzson/nerdamer
 */

import {
    abs, add, divide, factorial, log, multiply,
    pow, rationalize, sqrt, subtract, mod, round,
    parens, cbrt, nthroot, realpart, imagpart, conjugate, arg,
} from './Core/functions';
import {
    allSame,
    allNumeric,
    allNumbers,
    arguments2Array,
    arrayAddSlices,
    arrayClone,
    arrayGetVariables,
    arrayMax,
    arrayMin,
    arrayEqual,
    arrayUnique,
    arraySum,

    block,
    build,

    comboSort,
    compare,
    convertToVector,
    customType,
    decompose_fn,
    each,
    evaluate,
    even,
    evenFraction,
    fillHoles,
    firstObject,
    format,
    generatePrimes,
    getCoeffs,


    inBrackets,
    isArray,
    isExpression,
    isFraction,
    isInt,
    isMatrix,
    isNegative,
    isNumericSymbol,
    isPrime,
    isSymbol,
    isVariableSymbol,
    isVector,
    knownVariable,
    nroots,
    remove,
    range,
    nround,
    sameSign,
    separate,
    scientificToDecimal,
    stringReplace,
    text,
    validateName,
    variables,
    warn,
} from './Core/Utils';


import {Settings} from './Settings';
import {Symbol, symfunction} from './Core/Symbol';
import {Frac} from './Core/Frac';
import Scientific from './Core/Scientific';
import {OperatorDictionary} from './Parser/OperatorDictionary';
import {FunctionProvider} from './Operators/functions';
import {Groups} from './Core/Groups';
import {Slice} from './Parser/Slice';
import {Matrix} from './Parser/Matrix';
import {Collection} from './Parser/Collection';
import {Vector} from './Parser/Vector';
import bigDec from 'decimal.js';
import bigInt from './3rdparty/bigInt';
import {Math2} from './Core/Math2';
import {Token} from './Parser/Token';
import {Tokenizer} from './Parser/Tokenizer';
import {Expression} from './Parser/Expression';
import {RPN} from './Parser/RPN';
import {LaTeX} from './LaTeX/LaTeX';
import * as exceptions from './Core/Errors';
import {Trig} from './Core/Trig';


import {ParseDeps} from './Core/parse';
import {expand} from './Core/functions/math/expand';
import {FactorialDeps} from './Core/functions/math/factorial';
import {ReservedDictionary} from './Parser/ReservedDictionary';
const {NerdamerTypeError, NerdamerValueError, err} = exceptions;


//version ======================================================================
const version = '1.1.12';
// set bigInt the precision to js precision
bigDec.set({
    precision: 250
});


const nerdamer = (function () {
//inits ========================================================================
    const reservedDictionary = new ReservedDictionary();
    const functionProvider = new FunctionProvider();
    const operators = new OperatorDictionary();
    const units = {};
    const tokenizer = new Tokenizer(functionProvider, operators, units);

    // functions for export
    const getU = symbol => reservedDictionary.getU(symbol);
    const clearU = u => reservedDictionary.clearU(u);
    const isReserved = value => reservedDictionary.isReserved(value);
    const reserveNames = obj => reservedDictionary.reserveNames(obj);

    const getOperator = (...args) => operators.getOperator(...args);
    const aliasOperator = (...args) => operators.aliasOperator(...args);
    const setOperator = (...args) => operators.setOperator(...args);

    let setFunction = function (name, params_array, body) {
        validateName(name);
        if (!reservedDictionary.isReserved(name)) {
            params_array = params_array || _.parse(body).variables();
            // The function gets set to PARSER.mapped function which is just
            // a generic function call.

            functionProvider.setFunctionDescriptor(
                name,
                [_.mapped_function, params_array.length, {
                    name: name,
                    params: params_array,
                    body: body
                }]
            );
            return body;
        }
        return null;
    };
    /**
     * provide a mechanism for accessing functions directly. Not yet complete!!!
     * Some functions will return undefined. This can maybe just remove the
     * function object at some point when all functions are eventually
     * housed in the global function object. Returns ALL parser available
     * functions. Parser.functions may not contain all functions
     */
    let importFunctions = function () {
        let o = {};
        let functions = functionProvider.getFunctionDescriptors();
        for (let x in functions) {
            o[x] = functions[x][0];
        }
        return o;
    };


    // nerdamer's parser
    const _ = new Parser();


//Settings =====================================================================

    //Add the groups. These have been reorganized as of v0.5.1 to make CP the highest group
    //The groups that help with organizing during parsing. Note that for FN is still a function even
    //when it's raised to a symbol, which typically results in an EX
    const
        S = Groups.S, // A single variable e.g. x.
        FN = Groups.FN, // A function
        CB = Groups.CB, // A symbol/expression composed of one or more variables through multiplication e.g. x*y
        CP = Groups.CP; // A symbol/expression composed of one variable and any other symbol or number x+1 or x+y

    const PARENTHESIS = Settings.PARENTHESIS;
    const SQRT = Settings.SQRT;
    const ABS = Settings.ABS;
    const FACTORIAL = Settings.FACTORIAL;
    const DOUBLEFACTORIAL = Settings.DOUBLEFACTORIAL;
    //the storage container "memory" for parsed expressions
    const EXPRESSIONS = [];
    Expression.$EXPRESSIONS = EXPRESSIONS;

    //variables
    const VARS = {};
    //the container used to store all the reserved functions
    const WARNINGS = [];


//Utils ========================================================================









    //link the Math2 object to Settings.FUNCTION_MODULES
    Settings.FUNCTION_MODULES.push(Math2);
    reserveNames(Math2); //reserve the names in Math2

//Expression ===================================================================
    Expression.prototype.$getAction = a => {
        return _[a];
    }

    //Uses modified Shunting-yard algorithm. http://en.wikipedia.org/wiki/Shunting-yard_algorithm
    function Parser() {
        //Point to the local parser instead of the global one
        let _ = this;


        //create link to classes
        this.classes = {
            Collection: Collection,
            Slice: Slice,
            Token: Token
        };
        this.trig = Trig;

        //list of supported units
        this.units = units;

        operators.injectOperatorsDeps({
            registerOperator: (name, operation) => _[name] = operation,
        });

        // backward compatibility hooks
        this.isOperator = (...args) => operators.isOperator(...args);
        // this.getOperators = (...args) => operators.getOperators(...args);
        this.getOperatorsClass = () => operators;
        this.getBrackets = (...args) => operators.getBrackets(...args);



        this.functions = functionProvider.getFunctionDescriptors();
        this.getFunctions = () => functionProvider.getFunctionDescriptors;

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
            let _ = this,
                extended = this[what];
            if (typeof extended === 'function' && typeof with_what === 'function') {
                let f = this[what];
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
        this.callfunction = function (fn_name, args, allowed_args= undefined) {
            let fn_settings = functionProvider.getFunctionDescriptor(fn_name);

            if (!fn_settings)
                err('Nerdamer currently does not support the function ' + fn_name);

            let num_allowed_args = fn_settings[1] || allowed_args, //get the number of allowed arguments
                fn = fn_settings[0], //get the mapped function
                retval;
            //We want to be able to call apply on the arguments or create a symfunction. Both require
            //an array so make sure to wrap the argument in an array.
            if (!(args instanceof Array))
                args = args !== undefined ? [args] : [];

            if (num_allowed_args !== -1) {
                let is_array = isArray(num_allowed_args),
                    min_args = is_array ? num_allowed_args[0] : num_allowed_args,
                    max_args = is_array ? num_allowed_args[1] : num_allowed_args,
                    num_args = args.length;

                let error_msg = fn_name + ' requires a {0} of {1} arguments. {2} provided!';

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
            let numericArgs = allNumbers(args);
            //Big number support. Check if Big number is requested and the arguments are all numeric and, not imaginary
//            if (Settings.USE_BIG && numericArgs) {
//                retval = Big[fn_name].apply(undefined, args);
//            }
//            else {
            if (!fn) {
                //Remember assumption 1. No function defined so it MUST be numeric in nature
                fn = functionProvider.findFunction(fn_name);
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
                let peekers = this.peekers[name];
                //remove the first items and stringify
                let args = arguments2Array(arguments).slice(1).map(o => o ? String(o) : o);
                //call each one of the peekers
                for (let i = 0; i < peekers.length; i++) {
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
            // let deps = {preprocessors, functionsDirectory: functionProvider, brackets, operators, units: _.units};
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


        // let deps = {preprocessors, functionsDirectory: functionProvider, brackets, operators, units: _.units};
        // let tokenizer = new Tokenizer(deps);

        this.tree = tokenizer.tree;

        this.parse = (e, substitutions = {}) => {
            let tokens = tokenizer.tokenize(e, true);

            let rpn = this.toRPN(tokens);
            return this.parseRPN(rpn, substitutions);
        };
        ParseDeps.parse = this.parse;


        /**
         * TODO: Switch to Parser.tokenize for this method
         * Reads a string into an array of Symbols and operators
         * @param {String} expression_string
         * @returns {Array}
         */
        this.toObject = function (expression_string) {
            let objectify = function (tokens) {
                let output = [];
                for (let i = 0, l = tokens.length; i < l; i++) {
                    let token = tokens[i];
                    let v = token.value;
                    if (token.type === Token.VARIABLE_OR_LITERAL) {
                        output.push(new Symbol(v));
                    }
                    else if (token.type === Token.FUNCTION) {
                        //jump ahead since the next object are the arguments
                        i++;
                        //create a symbolic function and stick it on output
                        let f = _.symfunction(v, objectify(tokens[i]));
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
        let chunkAtCommas = function (arr) {
            let chunks = [[]];
            for (let j = 0, k = 0, l = arr.length; j < l; j++) {
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
        let rem_brackets = function (str) {
            return str.replace(/^\\left\((.+)\\right\)$/g, function (str, a) {
                if (a)
                    return a;
                return str;
            });
        };

        let remove_redundant_powers = function (arr) {
            // The filtered array
            let narr = [];

            while(arr.length) {
                // Remove the element from the front
                let e = arr.shift();
                let next = arr[0];
                let next_is_array = isArray(next);
                let next_is_minus = next === '-';

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
                    let last = narr.pop();
                    // Check if it's something multiplied by
                    let before = narr[narr.length - 1];
                    let before_last = '1';

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
            let decimals = opt.decimals === true ? 'decimals' : undefined;

            let obj = typeof expression_or_obj === 'string' ? this.toObject(expression_or_obj) : expression_or_obj,
                TeX = [],
                cdot = typeof opt.cdot === 'undefined' ? '\\cdot' : opt.cdot; //set omit cdot to true by default

            // Remove negative powers as per issue #570
            obj = remove_redundant_powers(obj);

            if (isArray(obj)) {
                let nobj = [], a, b;
                //first handle ^
                for (let i = 0; i < obj.length; i++) {
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

            for (let i = 0, l = obj.length; i < l; i++) {
                let e = obj[i];

                // Convert * to cdot
                if (e === '*') {
                    e = cdot;
                }

                if (isSymbol(e)) {
                    if (e.group === FN) {
                        let fname = e.fname, f;

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
                            let chunks = chunkAtCommas(e.args);
                            /* Build TeX */
                            let expr = LaTeX.braces(this.toTeX(chunks[0])),
                                dx = this.toTeX(chunks[1]);
                            f = '\\int ' + expr + '\\, d' + dx;
                        }
                        else if (fname === 'defint') {
                            let chunks = chunkAtCommas(e.args),
                                expr = LaTeX.braces(this.toTeX(chunks[0])),
                                dx = this.toTeX(chunks[3]),
                                lb = this.toTeX(chunks[1]),
                                ub = this.toTeX(chunks[2]);
                            f = '\\int\\limits_{' + lb + '}^{' + ub + '} ' + expr + '\\, d' + dx;

                        }
                        else if (fname === 'diff') {
                            let chunks = chunkAtCommas(e.args);
                            let dx = '', expr = LaTeX.braces(this.toTeX(chunks[0]));
                            /* Handle cases: one argument provided, we need to guess the variable, and assume n = 1 */
                            if (chunks.length === 1) {
                                let vars = [];
                                for (let j = 0; j < chunks[0].length; j++) {
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
                            let argSplit = [[], [], [], []], j = 0, i;
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
                            let args = chunkAtCommas(e.args).map(function (x) {
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
        /*
         * Serves as a bridge between numbers and bigNumbers
         * @param {Frac|Number} n
         * @returns {Symbol}
         */
        function bigConvert(n) {
            if (!isFinite(n)) {
                let sign = Math.sign(n);
                let r = new Symbol(String(Math.abs(n)));
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

            let symbol = new Symbol(0);
            symbol.multiplier = n;
            return symbol;
        }

        function clean(symbol) {
            // handle functions with numeric values
            // handle denominator within denominator
            // handle trig simplifications
            let g = symbol.group, retval;
            //Now let's get to work
            if (g === CP) {
                let num = symbol.getNum(),
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

                    let new_den = new Symbol(0);
                    //now divide out the factor and add to new den
                    den.each(function (x) {
                        new_den = _.add(_.divide(x, factor.clone()), new_den);
                    });

                    factor.invert(); //invert so it can be added to the top
                    let new_num;
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






        //The loader for functions which are not part of Math2
        this.mapped_function = function () {
            let subs = {},
                params = this.params;

            for (let i = 0; i < params.length; i++) {
                subs[params[i]] = String(arguments[i]);
            }

            return _.parse(this.body, subs);
        };


        FactorialDeps.bigConvert = bigConvert;

        this.sqrt = sqrt;
        this.multiply = multiply;
        this.divide = divide;
        this.subtract = subtract;
        this.add = add;
        this.pow = pow;
        this.log = log;
        this.abs = abs;
        this.factorial = factorial;
        this.expand = expand;


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
                let e = a.parent;
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
            let f = a.elements.pop();
            return setFunction(f, a.elements, b);
        };
        // Function to quickly convert bools to Symbols
        let bool2Symbol = function (x) {
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

    // inject back dependencies
    LaTeX.$Parser = Parser;


//finalize =====================================================================
    /* FINALIZE */
    (function () {
        reserveNames(_.CONSTANTS);
        reserveNames(functionProvider.getFunctionDescriptors());
        _.initConstants();
        //bug fix for error but needs to be revisited
        if (!_.error)
            _.error = err;

        //Store the log and log10 functions
        Settings.LOG_FNS = {
            log: functionProvider.getFunctionDescriptor('log'),
            log10: functionProvider.getFunctionDescriptor('log10')
        };

    })();

    /* END FINALIZE */

//Core =========================================================================
    let Utils = {
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
        build: build,
        clearU: clearU, // inject!
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
        getU: getU, // inject!
        importFunctions: importFunctions, // inject!
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
        keys: Object.keys, // inject
        knownVariable: knownVariable,
        nroots: nroots,
        remove: remove,
        reserveNames: reserveNames,
        range: range,
        round: nround,
        sameSign: sameSign,
        scientificToDecimal: scientificToDecimal,
        separate: separate, // inject
        stringReplace: stringReplace,
        text: text,
        validateName: validateName,
        variables: variables,
        warn: warn
    };

    //This contains all the parts of nerdamer and enables nerdamer's internal functions
    //to be used.
    const Core = {
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
    let libExports = function (expression, subs, option, location) {
        // Initiate the numer flag
        let numer = false;

        // Is the user declaring a function?
        let fndec = /^([a-z_][a-z\d_]*)\(([a-z_,\s]*)\):=(.+)$/gi.exec(expression);
        if (fndec)
            return nerdamer.setFunction(fndec[1], fndec[2].split(','), fndec[3]);

        // let variable, fn, args;
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
            let f = functionProvider.getFunctionDescriptor(option);
            // If there's a function and it takes a single argument, then wrap
            // the expression in it
            if (f && f[1] === 1) {
                expression = `${o}(${expression})`;
            }
        });

        let e = block('PARSE2NUMBER', function () {
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
        let txt = LaTeX.parse(_.tokenize(e));
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
     * @returns {Core} Exports the nerdamer core functions and objects
     */
    libExports.getCore = function () {
        return Core;
    };

    libExports.getExpression = libExports.getEquation = Expression.getExpression;

    /**
     *
     * @param {Boolean} asArray The returned names are returned as an array if this is set to true;
     * @returns {String|Array}
     */
    libExports.reserved = function (asArray) {
        let reserved = reservedDictionary.getReserved();
        if (asArray) {
            return reserved;
        }
        return reserved.join(', ');
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
            let index = !equation_number ? EXPRESSIONS.length : equation_number - 1;
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
        let result = asObject ? {} : [];
        for (let i = 0; i < EXPRESSIONS.length; i++) {
            let eq = asLaTeX ? LaTeX.latex(EXPRESSIONS[i], option) : text(EXPRESSIONS[i], option);
            asObject ? result[i + 1] = eq : result.push(eq);
        }
        return result;
    };

    //the method for registering modules
    libExports.register = function (obj) {
        let core = this.getCore();

        if (isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
                if (obj)
                    this.register(obj[i]);
            }
        }
        else if (obj && Settings.exclude.indexOf(obj.name) === -1) {
            //make sure all the dependencies are available
            if (obj.dependencies) {
                for (let i = 0; i < obj.dependencies.length; i++)
                    if (!core[obj.dependencies[i]])
                        throw new Error(format('{0} requires {1} to be loaded!', obj.name, obj.dependencies[i]));
            }
            //if no parent object is provided then the function does not have an address and cannot be called directly
            let parent_obj = obj.parent,
                fn = obj.build.call(core); //call constructor to get function
            if (parent_obj) {
                if (!core[parent_obj])
                    core[obj.parent] = {};

                let ref_obj = parent_obj === 'nerdamer' ? this : core[parent_obj];
                //attach the function to the core
                ref_obj[obj.name] = fn;
            }

            if (obj.visible) {
                functionProvider.setFunctionDescriptor(obj.name, [fn, obj.numargs]); //make the function available
            }

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
            return !reservedDictionary.isReserved(varname);
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
        return Object.keys(functionProvider.getFunctionDescriptors());
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
        let variables = {};
        if (output === 'object')
            variables = VARS;
        else {
            for (let v in VARS) {
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
            for (let x in setting) {
                libExports.set(x, setting[x]);
            }

        let disallowed = ['SAFE'];
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

            const logFunc = x => {
                if (x.isConstant())
                    return new Symbol(Math.log10(x));
                return _.symfunction(Settings.LOG10, [x]);
            };

            functionProvider.setFunctionDescriptor('log', [logFunc, [1, 2]])
            functionProvider.setFunctionDescriptor('LN', Settings.LOG_FNS.log);

            //remove log10
            functionProvider.removeFunctionDescriptor('log10');
        }
        else {
            Settings[setting] = value;
        }
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
        let linker = fname => {
            return (...args) => {
                for (let i = 0; i < args.length; i++) {
                    args[i] = _.parse(args[i]);
                }

                return new Expression(block('PARSE2NUMBER', () => {
                    return _.callfunction(fname, args);
                }));
            };
        };
    };

    libExports.replaceFunction = function (name, fn, num_args) {
        let existing = functionProvider.getFunctionDescriptor(name);
        let new_num_args = typeof num_args === 'undefined' ? existing[1] : num_args;
        functionProvider.setFunctionDescriptor(name, [fn.call(undefined, existing[0], C), new_num_args]);
    };

    libExports.setOperator = function (operator, shift) {
        setOperator(operator, shift);
    };

    libExports.getOperator = function (operator) {
        return getOperator(operator);
    };

    libExports.aliasOperator = function (operator, withOperator) {
        return aliasOperator(operator, withOperator);
    };

    libExports.tree = function (expression) {
        return _.tree(_.toRPN(_.tokenize(expression)));
    };

    libExports.htmlTree = function (expression, indent) {
        let tree = this.tree(expression);

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


    let proxy = new Proxy(libExports, {
        get: (target, name) => {
            // console.log('Requested prop:', name);
            if (target[name]) return target[name];

            if (functionProvider.getFunctionDescriptor(name)) {
                return (...args) => {
                    for (let i = 0; i < args.length; i++) {
                        args[i] = _.parse(args[i]);
                    }

                    return new Expression(block('PARSE2NUMBER', () => {
                        return _.callfunction(name, args);
                    }));
                }
            }

            // throw new Error('Requested non-existent property: ' + name);
        }
    });

    return proxy; //Done
//imports ======================================================================
})();

if ((typeof module) !== 'undefined') {
    module.exports = nerdamer;
}
