import {Settings, SettingsType} from "../Settings";

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

// Is thrown if variable name violates naming rule
class InvalidVariableNameError extends Error {
    name = 'InvalidVariableNameError';
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
 * Returns the minimum number in an array
 * @param {Array} arr
 * @returns {Number}
 */
export function arrayMax(arr: any[]) {
    return Math.max.apply(undefined, arr);
}

/**
 * Returns the maximum number in an array
 * @param {Array} arr
 * @returns {Number}
 */
export function arrayMin(arr: any[]) {
    return Math.min.apply(undefined, arr);
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
 * Checks to see if a number is an even number
 * @param {Number} num
 * @returns {boolean}
 */
export function even(num: number) {
    return num % 2 === 0;
}

/**
 * @param {String} str
 * @returns {String} - returns a formatted string surrounded by brackets
 */
export function inBrackets(str: string) {
    return '(' + str + ')';
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
 * Checks to see if a fraction is divisible by 2
 * @param {number} num
 * @returns {boolean}
 */
export function evenFraction(num: number) {
    return 1 / (num % 1) % 2 === 0;
}


/**
 * Checks to see that all symbols in array are the same
 * @param {Symbol[]} arr
 * @returns {boolean}
 */
export function allSame(arr: any[]) {
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
export function allNumeric(arr: any[]) {
    for (let i = 0; i < arr.length; i++) {
        if (!isNumber(arr[i])) {
            return false;
        }
    }

    return true;
}

/**
 * Creates a temporary block in which one of the global settings is temporarily modified while
 * the function is called. For instance if you want to parse directly to a number rather than have a symbolic
 * answer for a period you would set PARSE2NUMBER to true in the block.
 * @example block('PARSE2NUMBER', function(){//symbol being parsed to number}, true);
 * @param settingsName
 * @param {Function} f
 * @param {boolean} opt - The value of the setting in the block
 * @param {String} obj - The obj of interest. Usually a Symbol but could be any object
 */
export function block<T>(settingsName: keyof SettingsType, f: () => T, opt: any, obj: object): T {
    let current_setting = Settings[settingsName];
    (Settings[settingsName] as any) = opt === undefined ? true : !!opt;
    let retval = f.call(obj);
    (Settings[settingsName] as any) = current_setting;
    return retval;
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
