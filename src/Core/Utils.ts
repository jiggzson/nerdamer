import {Settings, SettingsType} from "../Settings";
import {Groups} from './Groups';
import {Symbol} from './Symbol';
import {Build} from '../Parser/Build';
import {parse} from './parse';
import {Vector} from '../Parser/Vector';
import {decompose_fn, getCoeffs, isFraction, isNegative, isNumericSymbol, nroots, scientificToDecimal, separate} from './Utils-js';
import {arraySum} from './Utils.Symbol';
import {PRIMES} from './Math.consts';
import {Matrix} from '../Parser/Matrix';
import {Expression} from '../Parser/Expression';
import {InvalidVariableNameError} from './Errors';
import {text as Text} from './Text';


export { decompose_fn, arraySum, getCoeffs, isFraction, isNegative, isNumericSymbol, nroots, scientificToDecimal, separate };

/**
 * Checks to see that all symbols in array are the same
 * @param {{ equals() }[]} arr
 * @returns {boolean}
 */
export function allSame(arr: Symbol[]) {
    let last = arr[0];
    for (let i = 1, l = arr.length; i < l; i++) {
        if (!arr[i].equals(last)) {
            return false;
        }
    }
    return true;
}

/**
 * Checks to see if an array contains only numeric values
 * @param {Array} arr
 */
export function allNumeric(arr: string[]) {
    for (let i = 0; i < arr.length; i++) {
        if (!isNumber(arr[i])) {
            return false;
        }
    }

    return true;
}

/**
 * Converts function arguments to an array. Now used by gcd and lcm in Algebra.js :)
 * @deprecated Just use rest syntax: ...args!
 * @param {Array|object} obj
 */
export function arguments2Array(obj: any) {
    return [].slice.call(obj);
}

/**
 * Fills numbers between array values
 * @param {number[]} arr
 * @param {Integer} slices
 */
export function arrayAddSlices(arr: any[], slices: number) {
    slices = slices || 20;
    let retval = [];
    let c, delta, e;
    retval.push(arr[0]); //push the beginning
    for (let i = 0; i < arr.length - 1; i++) {
        c = arr[i];
        delta = arr[i + 1] - c; //get the difference
        e = delta / slices; //chop it up in the desired number of slices
        for (let j = 0; j < slices; j++) {
            c += e; //add the mesh to the last slice
            retval.push(c);
        }
    }

    return retval;
}

/**
 * Clones array with clonable items
 * @param {Array} arr
 * @returns {Array}
 */
export function arrayClone<T extends { clone: () => T }>(arr: T[]) {
    let new_array = [], l = arr.length;

    for (let i = 0; i < l; i++) {
        new_array[i] = arr[i].clone();
    }

    return new_array;
}

/**
 * Gets all the variables in an array of Symbols
 * @param {Symbol[]} arr
 */
export function arrayGetVariables(arr: Symbol[]) {
    let vars: string[] = [];
    for (let i = 0; i < arr.length; i++) {
        if (!isSymbol(arr[i])) {
            continue;
        }

        vars = vars.concat(arr[i].variables());
    }

    //remove duplicates
    vars = arrayUnique(vars).sort();

    //done
    return vars;
}

/**
 * Returns the minimum number in an array
 * @param {Array} arr
 * @returns {Number}
 */
export function arrayMax(arr: any[]) {
    return Math.max(...arr);
}

/**
 * Returns the maximum number in an array
 * @param {Array} arr
 * @returns {Number}
 */
export function arrayMin(arr: any[]) {
    return Math.min(...arr);
}

/**
 * Checks to see if two arrays are equal
 * @param {Array} arr1
 * @param {Array} arr2
 */
export function arrayEqual(arr1: any[], arr2: any[]) {
    arr1.sort();
    arr2.sort();

    // The must be of the same length
    if (arr1.length === arr2.length) {
        for (let i = 0; i < arr1.length; i++) {
            // If any two items don't match we're done
            if (arr1[i] !== arr2[i]) {
                return false;
            }
        }
        // Otherwise they're equal
        return true;
    }

    return false;
}

/**
 * Strips duplicates out of an array
 * @param {Array} arr
 */
export function arrayUnique(arr: any[]) {
    const l = arr.length, a = [];

    for (let i = 0; i < l; i++) {
        let item = arr[i];
        if (a.indexOf(item) === -1) {
            a.push(item);
        }
    }

    return a;
}



/**
 * Creates a temporary block in which one of the global settings is temporarily modified while
 * the function is called. For instance if you want to parse directly to a number rather than have a symbolic
 * answer for a period you would set PARSE2NUMBER to true in the block.
 * @example block('PARSE2NUMBER', function(){//symbol being parsed to number}, true);
 * @param settingsName
 * @param {Function} f
 * @param {boolean} opt - The value of the setting in the block
 * @param {string} obj - The obj of interest. Usually a Symbol but could be any object
 */
export function block<T>(settingsName: keyof SettingsType, f: () => T, opt?: any, obj?: object): T {
    let current_setting = Settings[settingsName];
    (Settings[settingsName] as any) = opt === undefined ? true : !!opt;
    let retVal = f.call(obj);
    (Settings[settingsName] as any) = current_setting;
    return retVal;
}

export function build(symbol: Symbol, arg_array?: string[]) {
    return Build.build(symbol, arg_array);
}

/**
 * Sorts and array given 2 parameters
 * @param {String} a
 * @param {String} b
 */
export function comboSort(a: any[], b: any[]) {
    const l = a.length;
    const combined = []; //the linker
    for (let i = 0; i < a.length; i++) {
        combined.push([a[i], b[i]]); //create the map
    }

    combined.sort(function (x, y) {
        return x[0] - y[0];
    });

    var na = [], nb = [];

    for (let i = 0; i < l; i++) {
        na.push(combined[i][0]);
        nb.push(combined[i][1]);
    }

    return [na, nb];
}

/**
 * Substitutes out variables for two symbols, parses them to a number and them compares them numerically
 * @param {Symbol} sym1
 * @param {Symbol} sym2
 * @param {string[]} vars - an optional array of variables to use
 * @returns {boolean}
 */
export function compare(sym1: Symbol, sym2: Symbol, vars: string[]) {
    const n = 5; //a random number between 1 and 5 is good enough
    const scope: Record<string, Symbol> = {}; // scope object with random numbers generated using vars
    let comparison;
    for (let i = 0; i < vars.length; i++) {
        scope[vars[i]] = new Symbol(Math.floor(Math.random() * n) + 1);
    }

    block('PARSE2NUMBER', function () {
        comparison = parse(sym1, scope).equals(parse(sym2, scope));
    }, false);

    return comparison;
}

export function convertToVector(x: any) {
    if (isArray(x)) {
        const vector = new Vector([]);
        for (let i = 0; i < x.length; i++) {
            vector.elements.push(convertToVector(x[i]));
        }
        return vector;
    }
    //Ensure that a nerdamer ready object is returned
    if (!isSymbol(x)) {
        return parse(x);
    }

    return x;
}

/**
 * the Parser uses this to check if it's allowed to convert the obj to type Symbol
 * @param {Object} obj
 * @returns {boolean}
 */
export function customType(obj?: any) {
    return obj !== undefined && obj.custom;
}

/**
 * Loops through each item in object and calls function with item as param
 * @param {Object|Array} obj
 * @param {Function} fn
 */
export function each(obj: any, fn: (index: number | string) => void) {
    if (isArray(obj)) {
        let l = obj.length;
        for (let i = 0; i < l; i++) {
            fn.call(obj, i);
        }
    }
    else {
        for (let x in obj) {
            if (obj.hasOwnProperty(x)) {
                fn.call(obj, x);
            }
        }
    }
}

/**
 * As the name states. It forces evaluation of the expression
 * @param {Symbol} symbol
 * @param {Symbol} o
 */
export function evaluate(symbol: Symbol, o: any = undefined) {
    return block('PARSE2NUMBER', function () {
        return parse(symbol, o);
    }, true);
}

/**
 * Checks to see if a number is an even number
 * @param {Number} num
 * @returns {boolean}
 */
export function even(num: number) {
    return num % 2 === 0;
}

/**
 * Checks to see if a fraction is divisible by 2
 * @param {number} num
 * @returns {boolean}
 */
export function evenFraction(num: number) {
    return 1 / (num % 1) % 2 === 0;
}

/**
 * Fills holes in an array with zero symbol or generates one with n zeroes
 * @param {Array} arr
 * @param {Number} n
 */
export function fillHoles(arr: any[], n: number) {
    n = n || arr.length;
    for (let i = 0; i < n; i++) {
        let sym = arr[i];
        if (!sym) {
            arr[i] = new Symbol(0);
        }
    }
    return arr;
}

/**
 * Returns the first encountered item in an object. Items do not have a fixed order in objects
 * so only use if you need any first random or if there's only one item in the object
 * @param {object} obj
 * @param {boolean} key Return this key as first object
 * @param {boolean} both
 * @returns {*}
 */
export function firstObject(obj: any, key: boolean = false, both: boolean = false) {
    for (let x in obj) {
        if (key) {
            return x;
        }

        if (both) {
            return {
                key: x,
                obj: obj[x]
            };
        }

        return obj[x];
    }

    return null;
}

/**
 * A helper function to replace multiple occurences in a string. Takes multiple arguments
 * @example format('{0} nice, {0} sweet', 'something')
 * //returns 'something nice, something sweet'
 */
export function format(str: string, ...args: any) {
    return str.replace(/{(\d+)}/g, function (match, index) {
        const arg = args[index];
        return typeof arg === 'function' ? arg() : arg;
    });
}

/**
 * Generates prime numbers up to a specified number
 * @param {Number} upto
 */
export function generatePrimes(upto: number) {
    //get the last prime in the array
    let last_prime = PRIMES[PRIMES.length - 1] || 2;
    //no need to check if we've already encountered the number. Just check the cache.
    for (let i = last_prime; i < upto; i++) {
        if (isPrime(i)) {
            PRIMES.push(i);
        }
    }
}

/**
 * @param {String} str
 * @returns {String} - returns a formatted string surrounded by brackets
 */
export function inBrackets(str: string) {
    return '(' + str + ')';
}

/**
 * Checks to see if the object provided is an Array
 * @param {Object} arr
 */
export function isArray(arr: any) {
    return Array.isArray(arr);
}

/**
 * Checks to see if the object provided is a Matrix
 * @param {Object} obj
 */
export function isMatrix(obj: any) {
    return (obj instanceof Matrix);
}

/**
 * Checks to see if the object provided is an Expression
 * @param {Object} obj
 */
export function isExpression(obj: any) {
    return (obj instanceof Expression);
}

/**
 * Checks to see if the object provided is a Symbol
 * @param {Object} obj
 */
export function isSymbol(obj: any) {
    return (obj instanceof Symbol);
}

/**
 * Checks to see if a number is an integer
 * @param {number} value
 */
export function isInt(value: number | string) {
    return /^[-+]?\d+e?\+?\d*$/gim.test(value.toString());
}

/**
 * Checks if number is a prime number
 * @param {Number} n - the number to be checked
 */
export function isPrime(n: number) {
    let q = Math.floor(Math.sqrt(n));
    for (let i = 2; i <= q; i++) {
        if (n % i === 0)
            return false;
    }
    return true;
}

/**
 * Checks if n is a number
 * @param {any} n
 */
export function isNumber(n: string) {
    return /^\d+\.?\d*$/.test(n);
}

/**
 * Generates an object with known variable value for evaluation
 * @param key
 * @param {any} value Any stringifyable object
 * @returns {Object}
 */
export function knownVariable(key: string, value: any) {
    let o: any = {};
    o[key] = value;
    return o;
}










/**
 * Rounds a number up to x decimal places
 * @param {number} x
 * @param {number} s
 */
export function nround(x: string, s?: number) {
    if (isInt(x)) {
        let xn = Number(x);
        if (xn >= Number.MAX_VALUE) {
            return x.toString();
        }

        return Number(x);
    }

    s = s === undefined ? 14 : s;
    return Math.round(Number(x) * Math.pow(10, s)) / Math.pow(10, s);
}

/**
 * Enforces rule: "must start with a letter or underscore and
 * can have any number of underscores, letters, and numbers thereafter."
 * @param {string} name The name of the symbol being checked
 * @param {string} typ - The type of symbols that's being validated
 * @throws {InvalidVariableNameError}  - Throws an exception on fail
 */
export function validateName(name: string, typ: string = 'variable') {
    if (Settings.ALLOW_CHARS.indexOf(name) !== -1)
        return;

    const regex = Settings.VALIDATION_REGEX;

    if (!(regex.test(name))) {
        throw new InvalidVariableNameError(name + ' is not a valid ' + typ + ' name')
    }
}

/**
 * Used to pass warnings or low severity errors about the library
 * @param msg
 */
export const WARNINGS: string[] = [];
export function warn(msg: string) {
    WARNINGS.push(msg);
    if (Settings.SHOW_WARNINGS && console && console.warn) {
        console.warn(msg);
    }
}

/**
 * Removes an item from either an array or an object. If the object is an array, the index must be
 * specified after the array. If it's an object then the key must be specified
 * @param {Object|Array} obj
 * @param {Integer} indexOrKey
 */
export function remove(obj: any, indexOrKey: number | string): any {
    let result;
    if (Array.isArray(obj) && typeof indexOrKey === 'number') {
        result = obj.splice(indexOrKey, 1)[0];
    }
    else {
        result = obj[indexOrKey];
        delete obj[indexOrKey];
    }
    return result;
}

/**
 * Checks to see if a symbol is a variable with no multiplier nor power
 * @param {Symbol} symbol
 */
export function isVariableSymbol(symbol: Symbol) {
    return symbol.group === Groups.S && symbol.multiplier.equals(1) && symbol.power.equals(1);
}

/**
 *
 * Checks to see if the object provided is a Vector
 * @param {Object} obj
 */
export function isVector(obj: any) {
    return (obj instanceof Vector);
}

/**
 * Generates an array with values within a range. Multiplies by a step if provided
 * @param {Number} start
 * @param {Number} end
 * @param {Number} step
 */
export function range(start: number, end: number, step = 1) {
    const arr = [];
    step = step || 1;
    for (let i = start; i <= end; i++) {
        arr.push(i * step);
    }
    return arr;
}







/*
 * Debugging method used to better visualize vector and arrays
 * @param {object} o
 * @returns {String}
 */
export function pretty_print(o: any): string {
    if (Array.isArray(o)) {
        let s = o.map(x => pretty_print(x)).join(', ');

        if ((o as any).type === 'vector') {
            return 'vector<' + s + '>';
        }

        return '(' + s + ')';
    }
    return o.toString();
}

/**
 * Checks to see if all arguments are numbers
 * @param {Symbol[]} args
 */
export function allNumbers(args: Symbol[]) {
    for (let i = 0; i < args.length; i++) {
        if (args[i].group !== Groups.N) {
            return false;
        }
    }

    return true;
}

/*
 * Checks if all arguments aren't just all number but if they
 * are constants as well e.g. pi, e.
 * @param {object} args
 */
export function allConstants(args: any) {
    for (let i = 0; i < args.length; i++) {
        if (args[i].isPi() || args[i].isE()) {
            continue;
        }

        if (!args[i].isConstant(true)) {
            return false;
        }
    }
    return true;
}

/**
 * Checks to see if numbers are both negative or are both positive
 * @param {Number} a
 * @param {Number} b
 * @returns {boolean}
 */
export function sameSign(a: number, b: number) {
    return (a < 0) === (b < 0);
}


/**
 * A helper function to replace parts of string
 * @param {String} str - The original string
 * @param {Integer} from - The starting index
 * @param {Integer} to - The ending index
 * @param {String} with_str - The replacement string
 * @returns {String} - A formatted string
 */
export function stringReplace(str: string, from: number, to: number, with_str: string) {
    return str.substr(0, from) + with_str + str.substr(to, str.length);
}


export function text(obj: any, option?: any, useGroup?: boolean, decp?: any) {
    return Text(obj, option, useGroup, decp);
}

/**
 * Returns an array of all the keys in an array
 * @param {Object} obj
 * @returns {Array}
 */
export const keys = Object.keys;

/**
 * This method traverses the symbol structure and grabs all the variables in a symbol. The variable
 * names are then returned in alphabetical order.
 * @param {Symbol} obj
 * @param {Boolean} poly
 * @param {Object} vars - An object containing the variables. Do not pass this in as it generated
 * automatically. In the future this will be a Collector object.
 * @returns {String[]} - An array containing variable names
 */
export function variables(obj: Symbol, poly = false, vars?: { c: string[] }) {
    if (!isSymbol(obj)) {
        return vars ? vars.c.sort() : [];
    }
    return obj.variables(poly, vars);
}
