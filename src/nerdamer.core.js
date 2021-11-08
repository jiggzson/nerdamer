"use strict";
/*
 * Author : Martin Donk
 * Website : http://www.nerdamer.com
 * Email : martin.r.donk@gmail.com
 * Source : https://github.com/jiggzson/nerdamer
 */

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
import {Matrix} from './Parser/Matrix';
import {Vector} from './Parser/Vector';
import bigDec from 'decimal.js';
import bigInt from './3rdparty/bigInt';
import {Math2} from './Core/Math2';
import {Token} from './Parser/Token';
import {Tokenizer} from './Parser/Tokenizer';
import {Expression} from './Parser/Expression';
import {LaTeX} from './LaTeX/LaTeX';
import * as exceptions from './Core/Errors';


import {ParseDeps} from './Core/parse';
import {ReservedDictionary} from './Parser/ReservedDictionary';
import {VariableDictionary} from './Parser/VariableDictionary';
import {Parser} from './Parser/Parser';
import {primeFactors} from './Core/functions/operations/pow';
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


//Settings =====================================================================

    const PARENTHESIS = Settings.PARENTHESIS;
    const EXPRESSIONS = [];
    Expression.$EXPRESSIONS = EXPRESSIONS;

    //the container used to store all the reserved functions
    const WARNINGS = [];


//Utils ========================================================================
    primeFactors(314146179365);

    // nerdamer's parser
    const parser = new Parser(tokenizer, operators, functionProvider, variableDictionary, reservedDictionary, peekers, units);
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
    libExports.setFunction = function(name, params_array, body) {
        parser.setFunction(name, params_array, body)
    }

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
