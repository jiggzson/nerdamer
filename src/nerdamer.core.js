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
import {bigConvert, Symbol, symfunction} from './Core/Symbol';
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
import {ReservedDictionary} from './Parser/ReservedDictionary';
import {TrigHyperbolic} from './Core/Trig.hyperbolic';
import {VariableDictionary} from './Parser/VariableDictionary';
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
    const variableDictionary = new VariableDictionary();
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
            params_array = params_array || parser.parse(body).variables();
            // The function gets set to PARSER.mapped function which is just
            // a generic function call.

            //The loader for functions which are not part of Math2
            const mapped_function = function () {
                let subs = {},
                    params = this.params;

                for (let i = 0; i < params.length; i++) {
                    subs[params[i]] = String(arguments[i]);
                }

                return parser.parse(this.body, subs);
            }

            functionProvider.setFunctionDescriptor(
                name,
                [mapped_function, params_array.length, {
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

    const peekers = {
        pre_operator: [],
        post_operator: [],
        pre_function: [],
        post_function: []
    };

    //Uses modified Shunting-yard algorithm. http://en.wikipedia.org/wiki/Shunting-yard_algorithm
    class Parser {
        // exports for back compatibility
        classes = {
            Collection,
            Slice,
            Token
        };
        trig = Trig;
        trigh = TrigHyperbolic;
        units = units;
        error = err;
        symfunction = symfunction;

        // dependencies
        /** @property {Tokenizer} tokenizer */
        tokenizer
        /** @property {OperatorDictionary} operators */
        operators;
        /** @property {FunctionProvider} functionProvider */
        functionProvider;
        /** @property {VariableDictionary} variables */
        variables;

        constructor(tokenizer, operators, functionProvider, variables) {
            this.tokenizer = tokenizer;
            this.operators = operators;
            this.functionProvider = functionProvider;
            this.variables = variables;

            operators.injectOperatorsDeps({
                registerOperator: (name, operation) => this[name] = operation,
            });
        }

        //delay setting of constants until Settings is ready
        initConstants() {
            this.variables.setConstant('E', new Symbol(Settings.E));
            this.variables.setConstant('PI', new Symbol(Settings.PI));
        }

        parse(e, substitutions = {}) {
            let tokens = tokenizer.tokenize(e, true);

            let rpn = this.toRPN(tokens);
            return this.parseRPN(rpn, substitutions);
        }


        /**
         * Tokenizes the string
         * @param {String} e
         * @returns {Token[]}
         */
        tokenize(e) {
            return this.tokenizer.tokenize(e, false);
        }

        /**
         * Puts token array in Reverse Polish Notation
         * @param {Token[]} tokens
         * @returns {Token[]}
         */
        toRPN(tokens) {
            return RPN.TokensToRPN(tokens);
        }

        /**
         * Parses the tokens
         * @param {Tokens[]} rpn
         * @param {object} substitutions
         * @returns {Symbol}
         */
        parseRPN(rpn, substitutions) {
            let rpnDeps = {
                callfunction: this.callfunction,
                getAction: (action) => {
                    return this[action].bind(this)
                }
            };
            let rpnParser = new RPN(rpnDeps, this.variables, peekers);
            return rpnParser.parseRPN(rpn, substitutions);
        }

        /**
         * This method is supposed to behave similarly to the override method but it does not override
         * the existing function rather it only extends it
         * @param {String} what
         * @param {Function} with_what
         * @param {boolean} force_call
         */
        extend(what, with_what, force_call) {
            let extended = this[what];
            if (typeof extended === 'function' && typeof with_what === 'function') {
                let f = this[what];
                this[what] = (a, b) => {
                    if (isSymbol(a) && isSymbol(b) && !force_call) {
                        return f.call(this, a, b);
                    }
                    else {
                        return with_what.call(this, a, b, f);
                    }
                };
            }
        };

        clean(symbol) {
            // handle functions with numeric values
            // handle denominator within denominator
            // handle trig simplifications
            let g = symbol.group, retval;
            //Now let's get to work
            if (g === Groups.CP) {
                let num = symbol.getNum(),
                    den = symbol.getDenom() || new Symbol(1),
                    p = Number(symbol.power),
                    factor = new Symbol(1);
                if (Math.abs(p) === 1) {
                    den.each(x => {
                        if (x.group === Groups.CB) {
                            factor = multiply(factor, this.clean(x.getDenom()));
                        }
                        else if (x.power.lessThan(0)) {
                            factor = multiply(factor, this.clean(x.clone().toUnitMultiplier()));
                        }
                    });

                    let new_den = new Symbol(0);
                    //now divide out the factor and add to new den
                    den.each(function (x) {
                        new_den = add(divide(x, factor.clone()), new_den);
                    });

                    factor.invert(); //invert so it can be added to the top
                    let new_num;
                    if (num.isComposite()) {
                        new_num = new Symbol(0);
                        num.each(x => {
                            new_num = add(multiply(this.clean(x), factor.clone()), new_num);
                        });
                    }
                    else
                        new_num = multiply(factor, num);

                    retval = divide(new_num, new_den);
                }
            }
            else if (g === Groups.CB) {
                retval = new Symbol(1);
                symbol.each(x => {
                    retval = multiply(retval, this.clean(x));
                });
            }
            else if (g === Groups.FN) {
                if (symbol.args.length === 1 && symbol.args[0].isConstant())
                    retval = block('PARSE2NUMBER', () => {
                        return this.parse(symbol);
                    }, true);
            }

            if (!retval)
                retval = symbol;

            return retval;
        }


        /**
         * An internal function call for the Parser. This will either trigger a real
         * function call if it can do so or just return a symbolic representation of the
         * function using symfunction.
         * @param {String} fn_name
         * @param {Array} args
         * @param {int} allowed_args
         * @returns {Symbol}
         */
        callfunction(fn_name, args, allowed_args = undefined) {
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
                    retval = symfunction(fn_name, args);
            }
            else {
                //Remember assumption 2. The function is defined so it MUST handle all aspects including numeric values
                retval = fn.apply(fn_settings[2], args);
            }
            //            }

            return retval;
        };

        //TODO: Utilize the function below instead of the linked function
        getFunction(name) {
            return this.functionProvider.getFunctionDescriptors(name)[0];
        }



        /**
         * TODO: Switch to Parser.tokenize for this method
         * Reads a string into an array of Symbols and operators
         * @param {String} expression_string
         * @returns {Array}
         */
        toObject(expression_string) {
            let objectify = (tokens) => {
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
                        let f = symfunction(v, objectify(tokens[i]));
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

            return objectify(this.tokenize(expression_string));
        }

        // private
        remove_redundant_powers = function (arr) {
            // The filtered array
            let narr = [];

            while (arr.length) {
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
        }


        // A helper method for toTeX
        // private
        chunkAtCommas(arr) {
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
        }


        // Helper method for toTeX
        // private
        rem_brackets(str) {
            return str.replace(/^\\left\((.+)\\right\)$/g, function (str, a) {
                if (a) {
                    return a;
                }
                return str;
            })
        }


        /**
         * Convert expression or object to LaTeX
         * @param {String} expression_or_obj
         * @param {object} opt
         * @returns {String}
         */
        toTeX(expression_or_obj, opt) {
            opt = opt || {};
            // Add decimal option as per issue #579. Consider passing an object to Latex.latex as option instead of string
            let decimals = opt.decimals === true ? 'decimals' : undefined;

            let obj = typeof expression_or_obj === 'string' ? this.toObject(expression_or_obj) : expression_or_obj,
                TeX = [],
                cdot = typeof opt.cdot === 'undefined' ? '\\cdot' : opt.cdot; //set omit cdot to true by default

            // Remove negative powers as per issue #570
            obj = this.remove_redundant_powers(obj);

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
                            let chunks = this.chunkAtCommas(e.args);
                            /* Build TeX */
                            let expr = LaTeX.braces(this.toTeX(chunks[0])),
                                dx = this.toTeX(chunks[1]);
                            f = '\\int ' + expr + '\\, d' + dx;
                        }
                        else if (fname === 'defint') {
                            let chunks = this.chunkAtCommas(e.args),
                                expr = LaTeX.braces(this.toTeX(chunks[0])),
                                dx = this.toTeX(chunks[3]),
                                lb = this.toTeX(chunks[1]),
                                ub = this.toTeX(chunks[2]);
                            f = '\\int\\limits_{' + lb + '}^{' + ub + '} ' + expr + '\\, d' + dx;

                        }
                        else if (fname === 'diff') {
                            let chunks = this.chunkAtCommas(e.args);
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
                            let args = this.chunkAtCommas(e.args).map(x => {
                                if (Array.isArray(x))
                                    return this.toTeX(x.join(''));
                                return this.toTeX(String(x));
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
                        TeX.push(LaTeX.frac(this.rem_brackets(TeX.pop()), this.rem_brackets(this.toTeX([obj[++i]]))));
                    else
                        TeX.push(e);
                }
            }

            return TeX.join(' ');
        };


        isOperator(name) {
            return this.operators.isOperator()
        }

        getOperatorsClass() {
            return this.operators;
        }

        getBrackets() {
            return this.operators.getBrackets();
        }

        get functions() {
            return this.getFunctions();
        }
        getFunctions() {
            return this.functionProvider.getFunctionDescriptors()
        }


        // Gets called when the parser finds the , operator.
        // Commas return a Collector object which is roughly an array
        comma(a, b) {
            if (!(a instanceof Collection))
                a = Collection.create(a);
            a.append(b);
            return a;
        }

        // Used to slice elements from arrays
        slice(a, b) {
            return new Slice(a, b);
        }

        // The equality setter
        equals(a, b) {
            // Equality can only be set for group S so complain it's not
            if (a.group !== S && !a.isLinear()) {
                err('Cannot set equality for ' + a.toString());
            }
            this.variables.setVar(a.value, b.clone());
            return b;
        }

        // Percent
        percent(a) {
            return divide(a, new Symbol(100));
        }

        // Set variable
        assign(a, b) {
            if (a instanceof Collection && b instanceof Collection) {
                a.elements.map((x, i) => {
                    return this.assign(x, b.elements[i]);
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

            if (a.group !== Groups.S) {
                throw new NerdamerValueError('Cannot complete operation. Incorrect LH value for ' + a);
            }

            this.variables.setVar(a.value, b);
            return b;
        }

        function_assign(a, b) {
            let f = a.elements.pop();
            return setFunction(f, a.elements, b);
        }

        // Function to quickly convert bools to Symbols
        bool2Symbol(x) {
            return new Symbol(x === true ? 1 : 0);
        }

        //check for equality
        eq(a, b) {
            return this.bool2Symbol(a.equals(b));
        }

        //checks for greater than
        gt(a, b) {
            return this.bool2Symbol(a.gt(b));
        }

        //checks for greater than equal
        gte(a, b) {
            return this.bool2Symbol(a.gte(b));
        }

        //checks for less than
        lt(a, b) {
            return this.bool2Symbol(a.lt(b));
        }

        //checks for less than equal
        lte(a, b) {
            return this.bool2Symbol(a.lte(b));
        }

        // wraps the factorial
        factorial(a) {
            return symfunction(FACTORIAL, [a]);
        }

        // wraps the double factorial
        dfactorial(a) {
            return symfunction(DOUBLEFACTORIAL, [a]);
        }


        //Link the functions to the parse so they're available outside of the library.
        //This is strictly for convenience and may be deprecated.
        expand(symbol, opt = undefined) {
            return expand(symbol, opt);
        }

        round(x, s) {
            return round(x, s);
        }

        cbrt(symbol) {
            return cbrt(symbol);
        }

        abs(symbol) {
            return abs(symbol);
        }

        log(symbol, base) {
            return log(symbol, base);
        }

        rationalize(symbol) {
            return rationalize(symbol);
        }

        nthroot(num, p, prec, asbig) {
            return nthroot(num, p, prec, asbig);
        }

        arg(symbol) {
            return arg(symbol);
        }

        conjugate(symbol) {
            return conjugate(symbol);
        }

        imagpart(symbol) {
            return imagpart(symbol);
        }

        realpart(symbol) {
            return realpart(symbol);
        }

        sqrt(symbol) {
            return sqrt(symbol);
        }

        multiply(a, b) {
            return multiply(a, b);
        }

        divide(a, b) {
            return divide(a, b);
        }

        subtract(a, b) {
            return subtract(a, b);
        }

        add(a, b) {
            return add(a, b);
        }

        pow(a, b) {
            return pow(a, b);
        }

        mod(symbol1, symbol2) {
            return mod(symbol1, symbol2);
        }

        tree(expression) {
            let tokens = this.tokenize(expression)
            tokens = this.toRPN(tokens)

            return this.tokenizer.tree(tokens);
        }
    }



//Settings =====================================================================

    //Add the groups. These have been reorganized as of v0.5.1 to make CP the highest group
    //The groups that help with organizing during parsing. Note that for FN is still a function even
    //when it's raised to a symbol, which typically results in an EX
    const
        S = Groups.S, // A single variable e.g. x.
        FN = Groups.FN; // A function

    const PARENTHESIS = Settings.PARENTHESIS;
    const SQRT = Settings.SQRT;
    const ABS = Settings.ABS;
    const FACTORIAL = Settings.FACTORIAL;
    const DOUBLEFACTORIAL = Settings.DOUBLEFACTORIAL;
    //the storage container "memory" for parsed expressions
    const EXPRESSIONS = [];
    Expression.$EXPRESSIONS = EXPRESSIONS;

    //the container used to store all the reserved functions
    const WARNINGS = [];


//Utils ========================================================================


    // nerdamer's parser
    const parser = new Parser(tokenizer, operators, functionProvider, variableDictionary);
    ParseDeps.parser = parser;


    //link the Math2 object to Settings.FUNCTION_MODULES
    Settings.FUNCTION_MODULES.push(Math2);
    reserveNames(Math2); //reserve the names in Math2

//Expression ===================================================================
    Expression.prototype.$getAction = a => {
        return parser[a];
    }


    // inject back dependencies
    LaTeX.$Parser = Parser;


//finalize =====================================================================
    /* FINALIZE */
    (function () {
        reserveNames(variableDictionary.getAllConstants());
        reserveNames(functionProvider.getFunctionDescriptors());
        parser.initConstants();
        //bug fix for error but needs to be revisited
        if (!parser.error)
            parser.error = err;

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
        PARSER: parser,
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
            return parser.parse(expression, subs);
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
        // FIXME: tokenize(toRPN) ?
        return parser.tokenize(parser.toRPN(expression));
    };

    /**
     * Generates LaTeX from expression string
     * @param {String} e
     * @param {object} opt
     * @returns {String}
     */
    libExports.convertToLaTeX = function (e, opt) {
        return parser.toTeX(e, opt);
    };

    /**
     * Converts latex to text - Very very very basic at the moment
     * @param {String} e
     * @returns {String}
     */
    libExports.convertFromLaTeX = function (e) {
        let txt = LaTeX.parse(parser.tokenize(e));
        return new Expression(parser.parse(txt));
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
                variableDictionary.deleteConstant(constant);
            }
            else {
                if (isNaN(value)) {
                    throw new NerdamerTypeError('Constant must be a number!');
                }
                variableDictionary.setConstant(constant, value);
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
        return String(variableDictionary.getConstant(constant));
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
        if (variableDictionary.isConstant(v)) {
            err('Cannot set value for constant ' + v);
        }
        if (val === 'delete' || val === '') {
            variableDictionary.deleteVar(v);
        }
        else {
            let value = isSymbol(val) ? val : parser.parse(val);
            variableDictionary.setVar(v, value);
        }
        return this;
    };

    /**
     * Returns the value of a set variable
     * @param {string} v
     * @returns {any}
     */
    libExports.getVar = function (v) {
        return variableDictionary.getVar(v);
    };
    /**
     * Clear the variables from the VARS object
     * @returns {Object} Returns the nerdamer object
     */
    libExports.clearVars = function () {
        variableDictionary.clearAllVars();
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
        let variables = variableDictionary.getAllVars();

        switch (output) {
            case 'object': return variables;
            case 'latex': return variables.map(v => v.latex(option));
            case 'text': return variables.map(v => v.text(option));
        }

        return {};
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
                return symfunction(Settings.LOG10, [x]);
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
                    args[i] = parser.parse(args[i]);
                }

                return new Expression(block('PARSE2NUMBER', () => {
                    return parser.callfunction(fname, args);
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
        return parser.tree(expression);
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
        if (peekers[name]) {
            peekers[name].push(f);
        }
    };

    libExports.removePeeker = function (name, f) {
        remove(peekers[name], f);
    };

    libExports.parse = function (e) {
        return String(e).split(';').map(function (x) {
            return parser.parse(x);
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
                        args[i] = parser.parse(args[i]);
                    }

                    return new Expression(block('PARSE2NUMBER', () => {
                        return parser.callfunction(name, args);
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
