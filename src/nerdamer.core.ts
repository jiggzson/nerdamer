// noinspection JSUnusedGlobalSymbols

/*
 * Author : Martin Donk
 * Website : http://www.nerdamer.com
 * Email : martin.r.donk@gmail.com
 * Source : https://github.com/jiggzson/nerdamer
 */

import {Expression} from './Parser/Expression';
import {Settings, SettingsType} from './Settings';
import {OperatorDescriptor} from './Providers/OperatorDictionary';
import {Core} from './Core/Core';
import bigDec from 'decimal.js';
import * as Utils from './Core/Utils';
import {LaTeX} from './LaTeX/LaTeX';
import {err} from './Core/Errors';
import {Spread} from './Core/helpers';

//version ======================================================================
const VERSION = '1.1.12';
// set bigInt the precision to js precision
bigDec.set({
    precision: 250
});

const defaultCore = new Core();
let parser = defaultCore.PARSER;
let functionProvider = defaultCore.functionProvider;
let variableDictionary = defaultCore.variableDictionary;
let EXPRESSIONS = defaultCore.EXPRESSIONS;
let peekers = defaultCore.peekers;
let operators = defaultCore.operators;

type NerdamerBaseType = typeof nerdamer;

type CoreFunction = (expression: string | Expression, subs?: Record<string, any>, options?: string | string[], location?: number) => Expression;

/**
 *
 * @param {string|Expression} expression   The expression being parsed.
 * @param {object} subs         An object of known values
 * @param {string} options       A string or array containing additional options such as parsing directly to number
 *                                  or expanding the expression. Use "numer" to when wanting the expression to be
 *                                  evaluated. Use "expand" when wanting the expression to be expanded.
 * @param {number} location     The index of where the expression should be stored.
 * @returns {Expression & Spread<[Math]>}
 */
function nerdamer(expression: string | Expression, subs?: Record<string, any>, options?: string | string[], location?: number): Expression & Spread<[Math]> {
    // Initiate the numer flag
    let numer = false;

    // let variable, fn, args;
    // Convert any expression passed in to a string
    if (typeof expression !== 'string') {
        expression = expression.toString();
    }

    // Is the user declaring a function?
    let fndec = /^([a-z_][a-z\d_]*)\(([a-z_,\s]*)\):=(.+)$/gi.exec(expression);
    if (fndec) {
        return nerdamer.setFunction(fndec[1], fndec[2].split(','), fndec[3]) as any as Expression & Spread<[Math]>;
    }


    // Convert it to an array for simplicity
    if (!options) {
        options = [];
    }
    else if (!Array.isArray(options)) {
        options = [options.toString()];
    }

    options.forEach(function (o) {
        // Turn on the numer flag if requested
        if (o === 'numer') {
            numer = true;
            return;
        }
        // Wrap it in a function if requested. This only holds true for
        // functions that take a single argument which is the expression

        let f = functionProvider.getFunctionDescriptor(o);
        // If there's a function and it takes a single argument, then wrap
        // the expression in it
        if (f && f[1] === 1) {
            expression = `${o}(${expression})`;
        }
    });

    let e = Utils.block('PARSE2NUMBER', function () {
        return parser.parse(expression, subs);
    }, numer || Settings.PARSE2NUMBER);

    if (location) {
        EXPRESSIONS[location - 1] = e;
    }
    else {
        EXPRESSIONS.push(e);
    }

    return new Expression(e) as Expression & Spread<[Math]>;
}


namespace nerdamer {
    /**
     * Converts expression into rpn form
     * @param {string} expression
     * @returns {Token[]}
     */
    export function rpn(expression: string) {
        return parser.toRPN(parser.tokenize(expression));
    }

    type ConvertToLaTeXOptions = {
        cdot?: any;
        decimals?: boolean
    };

    /**
     * Generates Converts and expression to LaTeX without evaluating expression.
     * @param {string} expression The expression being converted
     * @param {ConvertToLaTeXOptions} options
     * @returns {string}
     */
    export function convertToLaTeX(expression: string, options?: ConvertToLaTeXOptions) {
        return parser.toTeX(expression, options);
    }

    /**
     * Attempts to import a LaTeX string.
     * @param {string} expression The expression being converted
     * @returns {string}
     */
    export function convertFromLaTeX(expression: string) {
        let txt = LaTeX.parse(parser.tokenize(expression));
        return new Expression(parser.parse(txt));
    }

    /**
     * Get the version of nerdamer or a loaded add-on
     * @param {string} addon - The add-on being checked
     * @returns {string} returns the version of nerdamer
     */
    export function version(addon?: string) {
        if (addon) {
            try {
                return (defaultCore as any)[addon].version;
            }
            catch(e) {
                return "No module named " + addon + " found!";
            }
        }
        return VERSION;
    }

    /**
     * Get nerdamer generated warnings
     * @returns {string[]}
     */
    export function getWarnings() {
        return Utils.WARNINGS;
    }

    /**
     * Sets a constant value which nerdamer will automatically substitute when parsing expression/equation.
     * Set to "delete" or "" to unset.
     * @param {string} constant                 The name of the constant to be set
     * @param {number|Expression|string} value  The value of the constant
     * @returns {Nerdamer}                      Returns the nerdamer object
     */
    export function setConstant(constant: string, value: number | string | Expression): NerdamerBaseType {
        Utils.validateName(constant);
        if (!variableDictionary.isReserved(constant)) {
            //fix for issue #127
            if (value === 'delete' || value === '') {
                variableDictionary.deleteConstant(constant);
            }
            else {
                // TODO: fix check
                // if (isNaN(value)) {
                //     throw new NerdamerTypeError('Constant must be a number!');
                // }
                variableDictionary.setConstant(constant, value);
            }
        }

        return nerdamer;
    }

    /**
     * Returns the value of a previously set constant
     * @param {string} constant
     * @returns {string}
     */
    export function getConstant(constant: string) {
        return String(variableDictionary.getConstant(constant));
    }

    /**
     * Sets a function which can then be called using nerdamer.
     * @param {string} name The name of the function
     * @param {string[]} params_array A list containing the parameter name of the functions
     * @param {string} body The body of the function
     * @returns {boolean} returns true if succeeded and falls on fail
     * @example nerdamer.setFunction('f',['x'], 'x^2+2');
     */
    export function setFunction(name: string, params_array: string[], body: string) {
        parser.setFunction(name, params_array, body)
    }

    /**
     * Returns the nerdamer core object. This object contains all the core functions of nerdamer and houses the parser.
     * @returns {Core} Exports the nerdamer core functions and objects
     */
    export function getCore() {
        return defaultCore;
    }

    /**
     * Returns stored expression at index. For first index use 1 not 0.
     * @param {number|string} expression_number
     * @param {boolean} asType
     */
    export function getExpression(expression_number: number | string, asType = false) {
        return Expression.getExpression(expression_number, asType);
    }
    export const getEquation = getExpression;

    /**
     *
     * @param {boolean} asArray The returned names are returned as an array if this is set to true;
     * @returns {string|string[]}
     */
    export function reserved(asArray: boolean = false) {
        let reserved = variableDictionary.getReserved();
        if (asArray) {
            return reserved;
        }
        return reserved.join(', ');
    }

    /**
     *
     * @param {number|'all'} equation_number          the number of the equation to clear.
     *                                              If 'all' is supplied then all equations are cleared
     * @param {boolean} keep_EXPRESSIONS_fixed  use true if you don't want to keep EXPRESSIONS length fixed
     * @returns {Nerdamer}                      Returns the nerdamer object
     */
    export function clear(equation_number: number|'all'|'last'|'first', keep_EXPRESSIONS_fixed: boolean = false): NerdamerBaseType {
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
            keep_EXPRESSIONS_fixed ? EXPRESSIONS[index] = undefined : Utils.remove(EXPRESSIONS, index);
        }

        return nerdamer;
    }

    /**
     * Clears all stored expressions.;
     * Alias for nerdamer.clear('all')
     */
    export function flush(): NerdamerBaseType {
        clear('all');
        return nerdamer;
    }

    /**
     *
     * @param {boolean} asObject
     * @param {boolean} asLaTeX
     * @param {string|string[]} options
     * @returns {Array}
     */
    export function expressions(asObject: boolean, asLaTeX: boolean, options: string|string[]) {
        let result: any = asObject ? {} : [];
        for (let i = 0; i < EXPRESSIONS.length; i++) {
            let eq = asLaTeX ? LaTeX.latex(EXPRESSIONS[i], options) : Utils.text(EXPRESSIONS[i], options);
            asObject ? result[i + 1] = eq : result.push(eq);
        }
        return result;
    }

    /**
     * Registers a module function with nerdamer. The object needs to contain at a minimum, a name property (text),
     * a numargs property (int), this is -1 for variable arguments or an array containing the min and max arguments,
     * the visible property (bool) which allows use of this function through nerdamer, defaults to true, and a
     * build property containing a function which returns the function to be used. This function is also handy for
     * creating aliases to functions. See below how the alias D was created for the diff function).
     * @param {object|object[]} obj
     */
    export function register(obj: any) {
        let core: any = defaultCore;

        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
                if (obj) {
                    register(obj[i]);
                }
            }
        }
        else if (obj && 'name' in obj && Settings.exclude.indexOf(obj.name) === -1) {
            //make sure all the dependencies are available
            if (obj.dependencies) {
                for (let i = 0; i < obj.dependencies.length; i++)
                    if (!core[obj.dependencies[i]])
                        throw new Error(Utils.format('{0} requires {1} to be loaded!', obj.name, obj.dependencies[i]));
            }
            //if no parent object is provided then the function does not have an address and cannot be called directly
            let parent_obj = obj.parent,
                fn = obj.build.call(core); //call constructor to get function
            if (parent_obj) {
                if (!core[parent_obj])
                    core[obj.parent] = {};

                let ref_obj = parent_obj === 'nerdamer' ? nerdamer : core[parent_obj];
                //attach the function to the core
                ref_obj[obj.name] = fn;
            }

            if (obj.visible) {
                functionProvider.setFunctionDescriptor(obj.name, [fn, obj.numargs]); //make the function available
            }
        }
    }

    /**
     * Enforces rule: "must start with a letter or underscore and
     * can have any number of underscores, letters, and numbers thereafter."
     * @param {string} name The name of the symbol being checked
     * @param {string} type - The type of symbols that's being validated
     * @throws {InvalidVariableNameError}  - Throws an exception on fail
     */
    export function validateName(name: string, type: string = 'variable') {
        return Utils.validateName(name, type);
    }

    /**
     * This method can be used to check that the variable meets variable name requirements for nerdamer.
     * Variable names Must start with a letter or underscore and may contains any combination of numbers,
     * letters, and underscores after that.
     * @param {string} varname The variable name being validated
     * @returns {boolean} validates if the profided string is a valid variable name
     */
    export function validVarName(varname: string) {
        try {
            Utils.validateName(varname);
            return !variableDictionary.isReserved(varname);
        }
        catch(e) {
            return false;
        }
    }

    /**
     * Array of functions currently supported by nerdamer
     * @returns {Array}
     */
    export function supported() {
        return Object.keys(functionProvider.getFunctionDescriptors());
    }

    /**
     *
     * @returns {Number} The number equations/expressions currently loaded
     */
    export function numExpressions() {
        return EXPRESSIONS.length;
    }

    /**
     * Sets a known value in nerdamer. This differs from setConstant as the value can be overridden trough
     * the scope. See example. Set to "delete" or "" to unset
     * @param {string} v The known value to be set
     * @param {string|number|Expression} val The value for the expression to be set to.
     * @returns {nerdamer} Returns the nerdamer object
     */
    export function setVar(v: string, val: string|number|Expression): NerdamerBaseType {
        Utils.validateName(v);
        //check if it's not already a constant
        if (variableDictionary.isConstant(v)) {
            err('Cannot set value for constant ' + v);
        }
        if (val === 'delete' || val === '') {
            variableDictionary.deleteVar(v);
        }
        else {
            let value = Utils.isSymbol(val) ? val : parser.parse(val);
            variableDictionary.setVar(v, value);
        }
        return nerdamer;
    }

    /**
     * Returns the value of a set variable
     * @param {string} v
     * @returns {any}
     */
    export function getVar(v: string) {
        return variableDictionary.getVar(v);
    }

    /**
     * Gets all previously set variables.
     * @param {string} output - output format. Can be 'object' (just returns the VARS object), 'text' or 'latex'. Default: 'text'
     * @param {string|string[]} options
     * @returns {object} Returns an object with the variables
     */
    export function getVars(output: string, options: string|string[]) {
        output = output || 'text';
        let variables = variableDictionary.getAllVars();

        switch (output) {
            case 'object': return variables;
            case 'latex': return variables.map((v: any) => v.latex(options));
            case 'text': return variables.map((v: any) => v.text(options));
        }

        return {};
    }

    /**
     * Clear the variables from the VARS object
     * @returns {Object} Returns the nerdamer object
     */
    export function clearVars(): NerdamerBaseType {
        variableDictionary.clearAllVars();
        return nerdamer;
    }

    /**
     *
     * @param {Function} loader
     * @returns {nerdamer}
     */
    export function load(loader: () => void): NerdamerBaseType {
        loader.call(nerdamer);
        return nerdamer;
    }

    /**
     * Some settings within nerdamer can be changed if needed to accommodate your current needs.
     * @param {string} setting The setting to be changed
     * @param {any} value
     */
    export function set<T extends keyof SettingsType, U = SettingsType[T]>(setting: T, value: U) {
        // FIXME: !!!
        //current options:
        //PARSE2NUMBER, suppress_errors
        // if (typeof setting === 'object')
        //     for (let x in setting) {
        //         set(x, setting[x]);
        //     }
        //
        // let disallowed = ['SAFE'];
        // if (disallowed.indexOf(setting) !== -1)
        //     err('Cannot modify setting: ' + setting);
        //
        // if (setting === 'PRECISION') {
        //     bigDec.set({precision: value});
        //     Settings.PRECISION = value;
        //
        //     // Avoid that nerdamer puts out garbage after 21 decimal place
        //     if (value > 21) {
        //         this.set('USE_BIG', true);
        //     }
        // }
        // else if (setting === 'USE_LN' && value === true) {
        //     //set log as LN
        //     Settings.LOG = 'LN';
        //     //set log10 as log
        //     Settings.LOG10 = 'log';
        //     //point the functions in the right direction
        //
        //     const logFunc = x => {
        //         if (x.isConstant())
        //             return new Symbol(Math.log10(x));
        //         return symfunction(Settings.LOG10, [x]);
        //     };
        //
        //     functionProvider.setFunctionDescriptor('log', [logFunc, [1, 2]])
        //     functionProvider.setFunctionDescriptor('LN', Settings.LOG_FNS.log);
        //
        //     //remove log10
        //     functionProvider.removeFunctionDescriptor('log10');
        // }
        // else {
        //     Settings[setting] = value;
        // }
    }

    /**
     * Get the value of a setting
     * @param {type} setting
     * @returns {undefined}
     */
    export function get<T extends keyof SettingsType, U = SettingsType[T]>(setting: T): U {
        return Settings[setting];
    }

    export function replaceFunction(name: string, fn: (...args: any[]) => any, num_args: number|[number,number]) {
        let existing = functionProvider.getFunctionDescriptor(name);
        let new_num_args = typeof num_args === 'undefined' ? existing[1] : num_args;
        functionProvider.setFunctionDescriptor(name, [fn.call(undefined, existing[0], defaultCore), new_num_args]);
    }

    /**
     * Replaces nerdamer.setOperator
     * @param {object} operator
     * @param action
     * @param {'over' | 'under'} shift
     */
    export function setOperator(operator: OperatorDescriptor, action?: (...args: any) => any, shift?: 'over' | 'under') {
        return operators.setOperator(operator, action, shift);
    }

    /**
     * Gets an opererator by its symbol
     * @param {String} operator
     * @returns {OperatorDescriptor}
     */
    export function getOperator(operator: string) {
        return operators.getOperator(operator)
    }

    export function aliasOperator(operator: string, withOperator: string) {
        return operators.aliasOperator(operator, withOperator);
    }

    /**
     * Generates an RPN object which can be evaluated manually.
     * @param {string} expression
     */
    export function tree(expression: string) {
        return parser.tree(expression);
    }

    /**
     * Generates the RPN for the expression using Expression.tree and then formats it to HTML.
     * @param expression
     * @param indent
     */
    export function htmlTree(expression: string, indent: number) {
        let tr = tree(expression);

        return '<div class="tree">\n' +
            '    <ul>\n' +
            '        <li>\n' +
            tr.toHTML(3, indent) + '\n' +
            '        </li>\n' +
            '    </ul>\n' +
            '</div>';
    }

    export function addPeeker(name: string, f: any) {
        if (peekers[name]) {
            peekers[name].push(f);
        }
    }

    export function removePeeker(name: string, f: any) {
        Utils.remove(peekers[name], f);
    }

    export function parse(e: string) {
        return String(e).split(';').map(function (x) {
            return parser.parse(x);
        });
    }


    export class Nerdamer {
        constructor(expression?: string | Expression, subs?: Record<string, any>, options?: string | string[]) {
        }

        static withModules<A extends object[]>(...a: [...A]): Spread<A> & Nerdamer {
            return new Nerdamer() as Spread<A> & Nerdamer;
        }
    }

    /**
     * DEPRECATED! Added functions available immediately.
     *
     * This functions makes internal functions available externally
     * @param {boolean} override Override the functions when calling api if it exists
     * @deprecated
     */
    export function api(override: boolean = false) { }
}

//Required<NerdamerBaseType> | CoreFunction

const proxy: typeof nerdamer & Spread<[Math]> = new Proxy(nerdamer, {
    get: (target: NerdamerBaseType, name: keyof NerdamerBaseType) => {
        if (name in target) {
            return target[name];
        }

        if (functionProvider.getFunctionDescriptor(name)) {
            return (...args: any[]) => {
                for (let i = 0; i < args.length; i++) {
                    args[i] = parser.parse(args[i]);
                }

                return new Expression(Utils.block('PARSE2NUMBER', () => {
                    return parser.callfunction(String(name), args);
                }));
            }
        }

        throw new Error('Requested non-existent property: ' + String(name));
    }
}) as typeof nerdamer & Spread<[Math]>;

export = proxy;
