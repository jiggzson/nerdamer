// noinspection JSUnusedGlobalSymbols

import {Expression} from './Parser/Expression';
import {SettingsType} from './Settings';
import {OperatorDescriptor} from './Parser/OperatorDictionary';
import {core, Core} from './Core/Core';

let defaultCore = new Core();

/**
 *
 * @param {string} expression   The expression being parsed.
 * @param {object} subs         An object of known values
 * @param {string} option       A string or array containing additional options such as parsing directly to number
 *                                  or expanding the expression. Use "numer" to when wanting the expression to be
 *                                  evaluated. Use "expand" when wanting the expression to be expanded.
 * @param {number} location     The index of where the expression should be stored.
 * @returns {Expression}
 */
function nerdamer(expression: string, subs: Record<string, any>, option: string | string[], location: number) {
    core.with(defaultCore, () => {

    });
}

namespace nerdamer {
    export function version() {
        return '-.-.-';
    }

    /**
     * Converts expression into rpn form
     * @param {string} expression
     * @returns {Token[]}
     */
    export function rpn(expression: string) {

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
        // return _.toTeX(expression, options);
    }

    /**
     * Attempts to import a LaTeX string.
     * @param {string} TeX The expression being converted
     * @returns {string}
     */
    export function convertFromLaTeX(TeX: string) {
        // return _.toTeX(expression, options);
    }

    /**
     * Get nerdamer generated warnings
     * @returns {string[]}
     */
    export function getWarnings() {

    }

    /**
     * Sets a constant value which nerdamer will automatically substitute when parsing expression/equation.
     * Set to "delete" or "" to unset.
     * @param {string} constant                 The name of the constant to be set
     * @param {number|Expression|string} value  The value of the constant
     * @returns {nerdamer}                      Returns the nerdamer object
     */
    export function setConstant(constant: string, value: number|string|Expression) {

    }

    /**
     * Returns the value of a previously set constant
     * @param {string} constant
     * @returns {string}
     */
    export function getConstant(constant: string) {

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

    }

    /**
     * Returns the nerdamer core object. This object contains all the core functions of nerdamer and houses the parser.
     * @returns {Core} Exports the nerdamer core functions and objects
     */
    export function getCore() {

    }

    /**
     * Returns stored expression at index. For first index use 1 not 0.
     * @param {number|string} expression_number
     * @param {boolean} asType
     */
    export function getExpression(expression_number: number | string, asType = false) {

    }
    export const getEquation = getExpression;

    /**
     *
     * @param {boolean} asArray The returned names are returned as an array if this is set to true;
     * @returns {string|string[]}
     */
    export function reserved(asArray: boolean = false) {

    }

    /**
     *
     * @param {number|'all'} equation_number          the number of the equation to clear.
     *                                              If 'all' is supplied then all equations are cleared
     * @param {boolean} keep_EXPRESSIONS_fixed  use true if you don't want to keep EXPRESSIONS length fixed
     * @returns {nerdamer}                      Returns the nerdamer object
     */
    export function clear(equation_number: number|'all', keep_EXPRESSIONS_fixed: boolean = false) {

    }

    /**
     * Clears all stored expressions.;
     * Alias for nerdamer.clear('all')
     */
    export function flush() {
        clear('all');
    }

    /**
     *
     * @param {boolean} asObject
     * @param {boolean} asLaTeX
     * @param {string|string[]} options
     * @returns {Array}
     */
    export function expressions(asObject: boolean, asLaTeX: boolean, options: string|string[]) {

    }

    /**
     * Registers a module function with nerdamer. The object needs to contain at a minimum, a name property (text),
     * a numargs property (int), this is -1 for variable arguments or an array containing the min and max arguments,
     * the visible property (bool) which allows use of this function through nerdamer, defaults to true, and a
     * build property containing a function which returns the function to be used. This function is also handy for
     * creating aliases to functions. See below how the alias D was created for the diff function).
     * @param {object|object[]} obj
     */
    export function register(obj: object|object[]) {

    }

    /**
     * Enforces rule: "must start with a letter or underscore and
     * can have any number of underscores, letters, and numbers thereafter."
     * @param {string} name The name of the symbol being checked
     * @param {string} type - The type of symbols that's being validated
     * @throws {InvalidVariableNameError}  - Throws an exception on fail
     */
    export function validateName(name: string, type: string = 'variable') {

    }

    /**
     * This method can be used to check that the variable meets variable name requirements for nerdamer.
     * Variable names Must start with a letter or underscore and may contains any combination of numbers,
     * letters, and underscores after that.
     * @param {string} varname The variable name being validated
     * @returns {boolean} validates if the profided string is a valid variable name
     */
    export function validVarName(varname: string) {

    }

    /**
     * Array of functions currently supported by nerdamer
     * @returns {Array}
     */
    export function supported() {

    }

    /**
     *
     * @returns {Number} The number equations/expressions currently loaded
     */
    export function numExpressions() {

    }

    /**
     * Sets a known value in nerdamer. This differs from setConstant as the value can be overridden trough
     * the scope. See example. Set to "delete" or "" to unset
     * @param {string} v The known value to be set
     * @param {string|number|Expression} val The value for the expression to be set to.
     * @returns {nerdamer} Returns the nerdamer object
     */
    export function setVar(v: string, val: string|number|Expression) {

    }

    /**
     * Returns the value of a set variable
     * @param {string} v
     * @returns {any}
     */
    export function getVar(v: string) {

    }

    /**
     * Gets all previously set variables.
     * @param {string} output - output format. Can be 'object' (just returns the VARS object), 'text' or 'latex'. Default: 'text'
     * @param {string|string[]} options
     * @returns {object} Returns an object with the variables
     */
    export function getVars(output: string, options: string|string[]) {

    }

    /**
     * Clear the variables from the VARS object
     * @returns {Object} Returns the nerdamer object
     */
    export function clearVars() {

    }

    /**
     *
     * @param {Function} loader
     * @returns {nerdamer}
     */
    export function load(loader: () => void) {

    }

    /**
     * Some settings within nerdamer can be changed if needed to accommodate your current needs.
     * @param {string} setting The setting to be changed
     * @param {any} value
     */
    export function set<T extends keyof SettingsType, U = SettingsType[T]>(setting: T, value: U) {

    }

    /**
     * Get the value of a setting
     * @param {type} setting
     * @returns {undefined}
     */
    export function get<T extends keyof SettingsType, U = SettingsType[T]>(setting: T): U {
        throw 'not implemented';
    }

    export function replaceFunction(name: string, fn: (...args: any[]) => any, num_args: number|[number,number]) {

    }

    /**
     * Replaces nerdamer.setOperator
     * @param {object} operator
     * @param action
     * @param {'over' | 'under'} shift
     */
    export function setOperator(operator: OperatorDescriptor, action?: (...args: any) => any, shift?: 'over' | 'under') {

    }

    /**
     * Gets an opererator by its symbol
     * @param {String} operator
     * @returns {OperatorDescriptor}
     */
    export function getOperator(operator: string) {

    }

    export function aliasOperator(o: string, n: string) {

    }

    /**
     * Generates an RPN object which can be evaluated manually.
     * @param {string} expression
     */
    export function tree(expression: string) {

    }

    /**
     * Generates the RPN for the expression using Expression.tree and then formats it to HTML.
     * @param expression
     * @param indent
     */
    export function htmlTree(expression: string, indent: number) {

    }

    export function addPeeker(name: string, f: any) {

    }

    export function removePeeker(name: string, f: any) {

    }

    export function parse(e: string) {

    }

    /**
     * This functions makes internal functions available externally
     * @param {boolean} override Override the functions when calling api if it exists
     */
    export function api(override: boolean = false) {

    }
}

export = nerdamer;
