/*
 * Author : Martin Donk
 * Website : http://www.nerdamer.com
 * Email : martin.r.donk@gmail.com
 * Source : https://github.com/jiggzson/nerdamer
 */

/* global trig, trigh */

var nerdamer = (function(imports) { 
    "use strict";

    var version = '0.7.16',

        _ = new Parser(), //nerdamer's parser
        //import bigInt
        bigInt = imports.bigInt,
        
        Groups = {},
        
        //container of pregenerated primes
        PRIMES = [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97,101,103,107,109,113
            ,127,131,137,139,149,151,157,163,167,173,179,181,191,193,197,199,211,223,227,229,233,239,241,251,
            257,263,269,271,277,281,283,293,307,311,313,317,331,337,347,349,353,359,367,373,379,383,389,397,
            401,409,419,421,431,433,439,443,449,457,461,463,467,479,487,491,499,503,509,521,523,541,547,557,
            563,569,571,577,587,593,599,601,607,613,617,619,631,641,643,647,653,659,661,673,677,683,691,701,
            709,719,727,733,739,743,751,757,761,769,773,787,797,809,811,821,823,827,829,839,853,857,859,863,
            877,881,883,887,907,911,919,929,937,941,947,953,967,971,977,983,991,997,1009,1013,1019,1021,1031,
            1033,1039,1049,1051,1061,1063,1069,1087,1091,1093,1097,1103,1109,1117,1123,1129,1151,1153,1163,1171,
            1181,1187,1193,1201,1213,1217,1223,1229,1231,1237,1249,1259,1277,1279,1283,1289,1291,1297,1301,1303,
            1307,1319,1321,1327,1361,1367,1373,1381,1399,1409,1423,1427,1429,1433,1439,1447,1451,1453,1459,1471,
            1481,1483,1487,1489,1493,1499,1511,1523,1531,1543,1549,1553,1559,1567,1571,1579,1583,1597,1601,1607,
            1609,1613,1619,1621,1627,1637,1657,1663,1667,1669,1693,1697,1699,1709,1721,1723,1733,1741,1747,1753,
            1759,1777,1783,1787,1789,1801,1811,1823,1831,1847,1861,1867,1871,1873,1877,1879,1889,1901,1907,1913,1931,
            1933,1949,1951,1973,1979,1987,1993,1997,1999,2003,2011,2017,2027,2029,2039,2053,2063,2069,2081,2083],
        //this is the class which holds the utilities which are exported to the core
        //All utility functions which are to be made available to the core should be added to this object
        Utils = {},
        
        //Settings
        Settings = {
            //the max number up to which to cache primes. Making this too high causes performance issues
            init_primes: 1000,
            
            exclude: [],
            //If you don't care about division by zero for example then this can be set to true. 
            //Has some nasty side effects so choose carefully.
            suppress_errors: false,
            //the global used to invoke the libary to parse to a number. Normally cos(9) for example returns
            //cos(9) for convenience but parse to number will always try to return a number if set to true. 
            PARSE2NUMBER: false,
            //this flag forces the a clone to be returned when add, subtract, etc... is called
            SAFE: false,
            //the symbol to use for imaginary symbols
            IMAGINARY: 'i',
            //the modules used to link numeric function holders
            FUNCTION_MODULES: [Math],
            //Allow certain characters
            ALLOW_CHARS: ['π'],
            //Allow nerdamer to convert multi-character variables
            USE_MULTICHARACTER_VARS: true,
            //Allow changing of power operator
            POWER_OPERATOR: '^',
            //The variable validation regex
            //VALIDATION_REGEX: /^[a-z_][a-z\d\_]*$/i
            VALIDATION_REGEX: /^[a-z_αAβBγΓδΔϵEζZηHθΘιIκKλΛμMνNξΞoOπΠρPσΣτTυϒϕΦχXψΨωΩ∞][0-9a-z_αAβBγΓδΔϵEζZηHθΘιIκKλΛμMνNξΞoOπΠρPσΣτTυϒϕΦχXψΨωΩ]*$/i,
            //Aliases
            ALIASES: {
                'π': 'pi',
                '∞': 'Infinity'
            },
            POSITIVE_MULTIPLIERS: false,
            //Cached items
            CACHE: {},
            //Print out warnings or not
            SILENCE_WARNINGS: false,
            //Precision
            PRECISION: 40
        },
        
        //Container for custom operators
        CUSTOM_OPERATORS = {

        },
        
        //Add the groups. These have been reorganized as of v0.5.1 to make CP the highest group
        //The groups that help with organizing during parsing. Note that for FN is still a function even 
        //when it's raised to a symbol, which typically results in an EX
        N   = Groups.N  = 1, // A number
        P   = Groups.P  = 2, // A number with a rational power e.g. 2^(3/5). 
        S   = Groups.S  = 3, // A single variable e.g. x. 
        EX  = Groups.EX = 4, // An exponential
        FN  = Groups.FN = 5, // A function
        PL  = Groups.PL = 6, // A symbol/expression having same name with different powers e.g. 1/x + x^2
        CB  = Groups.CB = 7, // A symbol/expression composed of one or more variables through multiplication e.g. x*y
        CP  = Groups.CP = 8, // A symbol/expression composed of one variable and any other symbol or number x+1 or x+y
        
        CONST_HASH = Settings.CONST_HASH = '#',
        
        //GLOBALS
        
        PARENTHESIS = Settings.PARENTHESIS = 'parens',

        //the function which represent vector
        VECTOR = Settings.VECTOR = 'vector',

        SQRT = Settings.SQRT = 'sqrt',
        
        ABS = Settings.ABS = 'abs',
        
        FACTORIAL = Settings.FACTORIAL = 'factorial',
        
        DOUBLEFACTORIAL = Settings.DOUBLEFACTORIAL = 'dfactorial',

        //the storage container "memory" for parsed expressions
        EXPRESSIONS = [],
        
        //variables
        VARS = {},
        
        //the container used to store all the reserved functions
        RESERVED = [],

        WARNINGS = [],
        
        /**
         * Checks to see if value is one of nerdamer's reserved names
         * @param {String} value
         * @return boolean
         */
        isReserved = Utils.isReserved = function(value) { 
            return RESERVED.indexOf(value) !== -1;
        },
        
        /**
         * Checks to see that all symbols in array are the same
         * @param {Symbol[]} arr
         * @returns {bool}
         */
        allSame = Utils.allSame = function(arr) {
            var last = arr[0];
            for(var i=1, l=arr.length; i<l; i++) 
                if(!arr[i].equals(last))
                    return false;
            return true;
        },

        /**
         * Use this when errors are suppressible
         * @param {String} msg
         */
        err = function(msg, ErrorObj) {
            if(!Settings.suppress_errors) {
                if(ErrorObj)
                    throw new ErrorObj(msg);
                else
                    throw new Error(msg);
            }
        },
        
        /**
         * Used to pass warnings or low severity errors about the library
         * @param msg
         */
        warn = Utils.warn = function(msg) {
            WARNINGS.push(msg);
            if(!Settings.SILENCE_WARNINGS && console && console.warn) {
                console.warn(msg);
            }
        },
        
        /**
         * Enforces rule: "must start with a letter or underscore and 
         * can have any number of underscores, letters, and numbers thereafter."
         * @param name The name of the symbol being checked
         * @param {String} typ - The type of symbols that's being validated
         * @throws {Exception} - Throws an exception on fail
         */
        validateName = Utils.validateName = function(name, typ) { 
            typ = typ || 'variable';
            if(Settings.ALLOW_CHARS.indexOf(name) !== -1)
                return;
            var regex = Settings.VALIDATION_REGEX;
            if(!(regex.test(name)) ) {
                throw new Error(name+' is not a valid '+typ+' name');
            }
        },
        /**
         * Finds intersection of two arrays
         * @param {array} a
         * @param {Array} b
         * @param {Array} compare_fn
         * @returns {Array}
         */
        intersection = Utils.intersection = function(a, b, compare_fn) {
            var c = [];
            if(a.length > b.length) {
                var t = a; a = b; b = t;
            }
            b = b.slice();
            var l = a.length, l2 = b.length;
            for(var i=0; i<l; i++) {
                var item = a[i];
                for(var j=0; j<l2; j++) {
                    var item2 = b[j];
                    if(item2 === undefined) continue;
                    var equals = compare_fn ? compare_fn(item, item2) : item === item2;
                    if(equals) {
                        b[j] = undefined;
                        c.push(item);
                        continue;
                    }
                }
            }
            return c;
        },
        //convert number from scientific format to decimal format
        scientificToDecimal = Utils.scientificToDecimal = function(num) {
            //if the number is in scientific notation remove it
            if(/\d+\.?\d*e[\+\-]*\d+/i.test(num)) {
                var zero = '0',
                    parts = String(num).toLowerCase().split('e'), //split into coeff and exponent
                    e = parts.pop(),//store the exponential part
                    l = Math.abs(e), //get the number of zeros
                    sign = e/l,
                    coeff_array = parts[0].split('.');
                if(sign === -1) {
                    num = zero + '.' + new Array(l).join(zero) + coeff_array.join('');
                }
                else {
                    var dec = coeff_array[1];
                    if(dec) l = l - dec.length;
                    num = coeff_array.join('') + new Array(l+1).join(zero);
                }
            }

            return num;
        },
        /**
         * Checks if number is a prime number
         * @param {Number} n - the number to be checked
         */
        isPrime  = Utils.isPrime = function(n) {
            var q = Math.floor(Math.sqrt(n));
            for (var i = 2; i <= q; i++) {
                if (n % i === 0) return false;
            }
            return true;
        },
        
        /**
         * Checks to see if a number or Symbol is a fraction
         * @param {Number|Symbol} num
         * @returns {boolean}
         */
        isFraction = Utils.isFraction = function(num) {
            if(isSymbol(num)) return isFraction(num.multiplier.toDecimal());
            return (num % 1 !== 0);
        },
        
        /**
         * Checks to see if the object provided is a Symbol
         * @param {Object} obj
         */
        isSymbol = Utils.isSymbol = function(obj) {
            return (obj instanceof Symbol);
        },
        
        /**
         * Checks to see if the object provided is an Expression
         * @param {Object} obj
         */
        isExpression = Utils.isExpression = function(obj) {
            return (obj instanceof Expression);
        },
        
        /**
         * Separates out the variables into terms of variabls. 
         * e.g. x+y+x*y+sqrt(2)+pi returns 
         * {x: x, y: y, x y: x*y, constants: sqrt(2)+pi
         * @param {type} symbol
         * @param {type} o
         * @returns {undefined}
         * @throws {Error} for expontentials
         */
        separate = Utils.separate = function(symbol, o) {
            symbol = _.expand(symbol);
            o = o || {};
            var insert = function(key, sym) {
                if(!o[key])
                    o[key] = new Symbol(0);
                o[key] = _.add(o[key], sym.clone());
            };
            symbol.each(function(x) {
                if(x.isConstant('all')) 
                    insert('constants', x);
                else if(x.group === S) {
                    insert(x.value, x);
                }
                else if(x.group === FN && (x.fname === ABS || x.fname === '')) {
                    separate(x.args[0]);
                }
                else if(x.group === EX || x.group === FN) {
                    throw new Error('Unable to separate. Term cannot be a function!');
                }
                else {
                    insert(variables(x).join(' '), x);
                }
            });
            
            return o;
        },
        
        //fills holes in an array with zero symbol
        fillHoles = Utils.fillHoles = function(arr, n) {
            n = n || arr.length;
            for(var i=0; i<n; i++) {
                var sym = arr[i];
                if(!sym)
                    arr[i] = new Symbol(0);
            }
            return arr;
        },
        
        /**
         * 
         * Checks to see if the object provided is a Vector
         * @param {Object} obj
         */
        isVector = Utils.isVector = function(obj) {
            return (obj instanceof Vector);
        },
        
        /**
         * Checks to see if the object provided is a Matrix
         * @param {Object} obj
         */
        isMatrix = Utils.isMatrix = function(obj) {
            return (obj instanceof Matrix);
        },
        
        /**
         * Checks to see if a symbol is in group N
         * @param {Symbol} symbol
         */
        isNumericSymbol = Utils.isNumericSymbol = function(symbol) {
            return symbol.group === N;
        },

        /**
         * Checks to see if a symbol is a variable with no multiplier nor power
         * @param {Symbol} symbol
         */
        isVariableSymbol = Utils.isVariableSymbol = function(symbol) {
            return symbol.group === S && symbol.multiplier.equals(1) && symbol.power.equals(1);
        },
        
        /**
         * Checks to see if the object provided is an Array
         * @param {Object} arr
         */
        isArray = Utils.isArray = function(arr) {
            return arr instanceof Array;
        },

        /**
         * Checks to see if a number is an integer
         * @param {Number} num
         */
        isInt = Utils.isInt = function(num) {
            return num % 1 === 0;
        },

        /**
         * @param {Number|Symbol} obj
         * @returns {boolean}
         */
        isNegative = Utils.isNegative = function(obj) {
            if( isSymbol(obj) ) {
                obj = obj.multiplier;
            }
            return obj.lessThan(0);
        },
        
        /**
         * @param {String} str
         * @returns {String} - returns a formatted string surrounded by brackets
         */
        inBrackets = Utils.inBrackets = function(str) {
            return '('+str+')';
        },
        
        /**
         * A helper function to replace parts of string
         * @param {String} str - The original string
         * @param {Integer} from - The starting index
         * @param {Integer} to - The ending index
         * @param {String} with_str - The replacement string
         * @returns {String} - A formatted string
         */
        stringReplace = Utils.stringReplace = function(str, from, to, with_str) {
            return str.substr(0, from)+with_str+str.substr(to, str.length);
        },
        
        /**
         * the Parser uses this to check if it's allowed to convert the obj to type Symbol
         * @param {Object} obj
         * @returns {boolean}
         */
        customType = Utils.customType = function(obj) {
            return obj !== undefined && obj.custom;
        },
        
        /**
         * Checks to see if numbers are both negative or are both positive
         * @param {Number} a
         * @param {Number} b
         * @returns {boolean}
         */
        sameSign = Utils.sameSign = function(a, b) {
            return (a < 0) === (b < 0);
        },
        
        /**
         * A helper function to replace multiple occurences in a string. Takes multiple arguments
         * @example format('{0} nice, {0} sweet')
         * //returns 'something nice, something sweet'
         */
        format = Utils.format = function() {
            var args = [].slice.call(arguments),
                str = args.shift();
                var new_str = str.replace(/{(\d+)}/g, function(match, index) {
                    var arg = args[index];
                    return typeof arg === 'function' ? arg() : arg;
                });

                return new_str;
        },
        
        /**
         * Returns an array of all the keys in an array
         * @param {Object} obj
         * @returns {Array}
         */
        keys = Utils.keys = Object.keys,

        /**
         * Returns the first encountered item in an object. Items do not have a fixed order in objects 
         * so only use if you need any first random or if there's only one item in the object
         * @param {Object} obj
         * @returns {*}
         */
        firstObject = Utils.firstObject = function(obj, key) {
            for( var x in obj ) 
                break;
            if(key)
                return x;
            return obj[x];
        },
        
        /**
         * Substitutes out variables for two symbols, parses them to a number and them compares them numerically
         * @param {Symbol} sym1
         * @param {Symbol} sym2
         * @param {String[]} vars - an optional array of variables to use
         * @returns {bool}
         */
        compare = Utils.compare = function(sym1, sym2, vars) {
            var n = 5; //a random number between 1 and 5 is good enough
            var scope = {}; // scope object with random numbers generated using vars
            var comparison;
            for(var i=0; i<vars.length; i++) 
                scope[vars[i]] = new Symbol(Math.floor(Math.random()*n)+1);
            block('PARSE2NUMBER', function() {
                comparison = _.parse(sym1, scope).equals(_.parse(sym2, scope));
            });
            return comparison;
        },
        
        /**
         * Returns the minimum number in an array
         * @param {Array} arr
         * @returns {Number} 
         */
        arrayMax = Utils.arrayMax = function(arr) {
            return Math.max.apply(undefined, arr);
        },

        /**
         * Returns the maximum number in an array
         * @param {Array} arr
         * @returns {Number} 
         */
        arrayMin = Utils.arrayMin = function(arr) {
            return Math.min.apply(undefined, arr);
        },
        
        /**
         * Clones array with clonable items
         * @param {Array} arr
         * @returns {Array}
         */
        arrayClone = Utils.arrayClone = function(arr) {
            var new_array = [], l = arr.length;
            for(var i=0; i<l; i++) new_array[i] = arr[i].clone();
            return new_array;
        },
        
        comboSort = Utils.comboSort = function(a, b) {
            var l = a.length,
                combined = []; //the linker
            for(var i=0; i<a.length; i++) {
                combined.push([a[i], b[i]]); //create the map
            }

            combined.sort(function(x, y) {
                return x[0] - y[0];
            });

            var na = [], nb = [];

            for(i=0; i<l; i++) {
                na.push(combined[i][0]);
                nb.push(combined[i][1]);
            }

            return [na, nb];
        },
        
        decompose_fn = Utils.decompose_fn = function(fn, wrt, as_obj) { 
            var ax, a, x, b;
            if(fn.group === CP) {
                var t = _.expand(fn.clone()).stripVar(wrt); 
                ax = _.subtract(fn.clone(), t.clone());
                b = t;
            }
            else
                ax = fn.clone(); 
            a = ax.stripVar(wrt);
            x = _.divide(ax.clone(), a.clone());
            b = b || new Symbol(0);
            if(as_obj) 
                return {
                    a: a,
                    x: x,
                    ax: ax,
                    b: b
                };
            return [a, x, ax, b];
        },
         /**
         * Rounds a number up to x decimal places
         * @param {Number} x
         * @param {Number} s
         */
        _round = Utils.round = function(x, s) { 
            s = typeof s === 'undefined' ? 14 : s;
            return Math.round( x*Math.pow( 10,s ) )/Math.pow( 10,s );
        },
        
        /**
         * This method traverses the symbol structure and grabs all the variables in a symbol. The variable
         * names are then returned in alphabetical order.
         * @param {Symbol} obj
         * @param {Boolean} poly 
         * @param {Object} vars - An object containing the variables. Do not pass this in as it generated 
         * automatically. In the future this will be a Collector object.
         * @returns {String[]} - An array containing variable names
         */
        variables = Utils.variables = function(obj, poly, vars) { 
            vars = vars || {
                c: [],
                add: function(value) {
                    if(this.c.indexOf(value) === -1 && isNaN(value)) this.c.push(value);
                }
            };

            if(isSymbol(obj)) { 
                var group = obj.group,
                    prevgroup = obj.previousGroup;
                if(group === EX) variables(obj.power, poly, vars);
                
                if(group === CP || group === CB || prevgroup === CP || prevgroup === CB) {
                    for(var x in obj.symbols) variables(obj.symbols[x], poly, vars);
                }
                else if(group === S || prevgroup === S) { 
                    //very crude needs fixing. TODO
                    if(!(obj.value === 'e' || obj.value === 'pi'))
                        vars.add(obj.value);
                }
                else if(group === PL || prevgroup === PL) {
                    variables(firstObject(obj.symbols), poly, vars);
                }
                else if(group === EX) { 
                    if(!isNaN(obj.value)) vars.add(obj.value);
                    variables(obj.power, poly, vars);
                }
                else if(group === FN && !poly) { 
                    for(var i=0; i<obj.args.length; i++) {
                        variables(obj.args[i], poly, vars);
                    }
                }
            }
            return vars.c.sort();
        },
        
        getU = Utils.getU = function(symbol) {
            //start with u
            var u = 'u', //start with u
                v = u, //init with u
                c = 0, //postfix number
                vars = variables(symbol);
            //make sure this variable isn't reserved and isn't in the variable list
            while(!(RESERVED.indexOf(v) === -1 && vars.indexOf(v) === -1))  
                v = u + c++;
            //get an empty slot. It seems easier to just push but the
            //problem is that we may have some which are created by clearU
            for(var i=0, l=RESERVED.length; i<=l; i++)
                //reserved cannot equals false or 0 so we can safely check for a falsy type
                if(!RESERVED[i]) {
                    RESERVED[i] = v; //reserve the variable
                    break;
                }
            return v;
        },
        
        clearU = Utils.clearU = function(u) {
            var indx = RESERVED.indexOf(u);
            if(indx !== -1)
                RESERVED[indx] = undefined;
        },
        
        /**
         * Loops through each item in object and calls function with item as param
         * @param {Object|Array} obj
         * @param {Function} fn 
         */
        each = Utils.each = function(obj, fn) {
            if(isArray(obj)) {
                var l = obj.length;
                for(var i=0; i<l; i++) fn.call(obj, i);
            }
            else {
                for(var x in obj) if(obj.hasOwnProperty(x)) fn.call(obj, x);
            }
        },
        
        /**
         * Checks to see if a number is an even number
         * @param {Number} num
         * @returns {boolean}
         */
        even = Utils.even = function(num) {
            return num % 2 === 0;
        },
        
        /**
         * Checks to see if a fraction is divisible by 2
         * @param {Number} num
         * @returns {boolean}
         */
        evenFraction = Utils.evenFraction = function(num) {
            return 1/( num % 1) % 2 === 0;
        },
        
        /**
         * Strips duplicates out of an array
         * @param {Array} arr
         */
        arrayUnique = Utils.arrayUnique = function(arr) {
            var l = arr.length, a = [];
            for(var i=0; i<l; i++) {
                var item = arr[i];
                if(a.indexOf(item) === -1) a.push(item);
            }
            return a;
        },
        
        /**
         * Reserves the names in an object so they cannot be used as function names
         * @param {Object} obj
         */
        reserveNames = Utils.reserveNames = function(obj) {
            var add = function(item) {
                if(RESERVED.indexOf(item) === -1) RESERVED.push(item);
            };
            
            if(typeof obj === 'string') add(obj);
            else {
                each(obj, function(x) {
                    add(x);
                });
            }  
        },

        /**
         * Removes an item from either an array or an object. If the object is an array, the index must be 
         * specified after the array. If it's an object then the key must be specified
         * @param {Object|Array} obj
         * @param {Integer} indexOrKey
         */
        remove = Utils.remove = function( obj, indexOrKey ) {
            var result;
            if( isArray(obj) ) {
                result =  obj.splice(indexOrKey, 1)[0];
            }
            else {
                result = obj[indexOrKey];
                delete obj[indexOrKey];
            }
            return result;
        },
        
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
        block = Utils.block = function(setting, f, opt, obj) {
            var current_setting = Settings[setting];
            Settings[setting] = opt === undefined ? true : !! opt;
            var retval = f.call(obj);
            Settings[setting] = current_setting;
            return retval;
        },

        /**
         * Converts function arguments to an array. Now used by gcd and lcm in Algebra.js :)
         * @param {Object} obj - arguments obj
         */
        arguments2Array = Utils.arguments2Array = function(obj) {
            return [].slice.call(obj);
        },
        
        getCoeffs = Utils.getCoeffs = function(symbol, wrt) {
            var coeffs = [];
            //we loop through the symbols and stick them in their respective 
            //containers e.g. y*x^2 goes to index 2
            symbol.each(function(term) {
                if(term.contains(wrt)) {
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
            
            for(var i=0; i<coeffs.length; i++)
                if(!coeffs[i])
                    coeffs[i] = new Symbol(0);
            //fill the holes
            return coeffs;
        },
        
        /**
         * Using a regex to get between brackets can be a bit tricky. This functions makes it more abstract 
         * to fetch between brackets within a string from any given index. If the starting index is a bracket 
         * then it will fail. returns [matched_string, first_bracket_index, end_bracket_index]
         * @param {Char} ob - open bracket
         * @param {Char} cb - close bracket
         * @param {String} str - The string being read
         * @param {Integer} start - Where in the string to start
         * @returns {Array}
         */
        betweenBrackets = function(ob, cb, str, start) {
            start = start || 0;
            var l = str.length,
                open = 0, fb;
            for(var i=start; i<l; i++) {
                var ch = str.charAt(i); //get the character at this position

                if(ch === ob) { //if an open bracket was found
                    if(fb === undefined) fb = i+1;//mark the first bracket found
                    open++; //mark a new open bracket
                }
                if(ch === cb) { //if a close bracket was found
                    open--; //close a bracket
                    if(open === 0 && fb !== undefined) {
                        var nb = i;
                        return [str.substring(fb, nb), fb, nb];
                    }
                }
            }
            
            return [];
        },
        
        /**
         * A helper function to make substitutions
         * @param {Object} subs
         */
        format_subs = function(subs) {
            for(var x in subs) subs[x] = _.parse(subs[x].toString());
            return subs;
        },
        generatePrimes = Utils.generatePrimes = function(upto) {
            //get the last prime in the array
            var last_prime = PRIMES[PRIMES.length-1] || 2; 
            //no need to check if we've already encountered the number. Just check the cache.
            for(var i=last_prime; i<upto; i++) {
                if(isPrime(i)) PRIMES.push(i);
            }
        },
        evaluate = Utils.evaluate = function (symbol) {
            return block('PARSE2NUMBER', function() {
                return _.parse(symbol);
            }, true);
        },
        convertToVector = Utils.convertToVector = function(x) {
            if(isArray(x)) {
                var vector = new Vector([]);
                for(var i=0; i<x.length; i++) 
                    vector.elements.push(convertToVector(x[i]));
                return vector;
            }
            //Ensure that a nerdamer ready object is returned
            if(!isSymbol(x))
                return _.parse(x);
            return x;
        },
        //This object holds additional functions for nerdamer. Think of it as an extension of the Math object.
        //I really don't like touching objects which aren't mine hence the reason for Math2. The names of the 
        //functions within are pretty self-explanatory.
        Math2 = {
            csc: function(x) { return 1/Math.sin(x); },
            sec: function(x) { return 1/Math.cos(x); },
            cot: function(x) { return 1/Math.tan(x); },
            // https://gist.github.com/jiggzson/df0e9ae8b3b06ff3d8dc2aa062853bd8
            erf: function(x) {
                var t = 1/(1+0.5*Math.abs(x));
                var result = 1-t*Math.exp( -x*x -  1.26551223 +
                        t * ( 1.00002368 +
                        t * ( 0.37409196 +
                        t * ( 0.09678418 +
                        t * (-0.18628806 +
                        t * ( 0.27886807 +
                        t * (-1.13520398 +
                        t * ( 1.48851587 +
                        t * (-0.82215223 +
                        t * ( 0.17087277)))))))))
                    );
                return x >= 0 ? result : -result;
            },
            bigpow: function(n, p) { 
                if(!(n instanceof Frac))
                    n = Frac.create(n);
                if(!(p instanceof Frac))
                    p = Frac.create(p);
                var retval = new Frac(0);
                if(p.isInteger()) {
                    retval.num = n.num.pow(p.toString());
                    retval.den = n.den.pow(p.toString());
                }
                else {
                    var num = Frac.create(Math.pow(n.num, p.num));
                    var den = Frac.create(Math.pow(n.den, p.num));

                    retval.num = Math2.nthroot(num, p.den.toString());
                    retval.den = Math2.nthroot(den, p.den);
                }  
                return retval;
            },
            //http://stackoverflow.com/questions/15454183/how-to-make-a-function-that-computes-the-factorial-for-numbers-with-decimals
            gamma: function(z) {
                var g = 7;
                var C = [
                    0.99999999999980993, 
                    676.5203681218851, 
                    -1259.1392167224028,
                    771.32342877765313, 
                    -176.61502916214059, 
                    12.507343278686905, 
                    -0.13857109526572012, 
                    9.9843695780195716e-6, 
                    1.5056327351493116e-7]
                ;

                if (z < 0.5) 
                    return Math.PI / (Math.sin(Math.PI * z) * Math2.gamma(1 - z));
                else {
                    z -= 1;

                    var x = C[0];
                    for (var i = 1; i < g + 2; i++)
                    x += C[i] / (z + i);

                    var t = z + g + 0.5;
                    return Math.sqrt(2 * Math.PI) * Math.pow(t, (z + 0.5)) * Math.exp(-t) * x;
                }
            },
            //factorial
            bigfactorial: function(x) {
                var retval = new Frac(1);
                for (var i = 2; i <= x; i++) 
                    retval = retval.multiply(new Frac(i));
                return retval;
            },
            //https://en.wikipedia.org/wiki/Logarithm#Calculation
            bigLog: function(x) {
                var CACHE = ["-253631954333118718762629409109262279926288908775918712466601196032/39970093576053625963957478139049824030906352922262642968060706375","0","24553090145869607172412918483124184864289170814122579923404694986469653261608528681589949629750677407356463601998534945057511664951799678336/35422621391945757431676178435630229283255250779216421054188228659061954317501699707236864189383591478024245495110561124597124995986978302375","369017335340917140706044240090243368728616279239227943871048759140274862131699550043150713059889196223917527172547/335894053932612728969975338549993764554481173661218585876475837409922537622385232776657791604345125227005476864000","24606853025626737903121303930100462245506322607985779603220820323211395607931699126390918477501325805513849611930008427268176602460462988972957593458726734897129954728102144/17750092415977639787139561330326170936321452137635322313122938207611787444311735251389066106937796085669460151963285086542745859461943369606018450213014148175716400146484375","399073568781976806715759409052286641738926636328983929439450824555613704676637191564699164303012247386095942144825603522401740680808466858044/247958349743620302021733249049411604982786755454514947379317600613433680222511897950658049325685140346169718465773927872179874971908848116625","1468102989495846944084741146947295378041808701256909016224309866143294556551407470861354311593351276612463858816796714569499021375899793849136855085849133702029337910502448189055357182595424959360/819363879309286303497217527375463120404739098260200279520788950777458900438307356738082930586032462601215802636320993648007907724899611296693997216938989854861043298494990214825163523387600982777","5896704855274661767824574093605344871722790278354431422729640950821239030785642943033153793245906863203822369276271050164634206965056233097479117980782641839669/3030306850569309344013726745100070601277982132543905537366562638553198167007159067544789592089960911065181606283478843359856123992707598685058297067179343872000","76631772943534985713873427262830314617912556928476573358548256872141516989538374761909611879922349479420014771499018155447198112155515453671128814488139633810493264352294560043912066253026059140653027326566801398784/36852092933388988649396042883218509607503204211148493545892849595498822817623842579026942621098851631842754395231561679671400197056377380063233740202370686144673585955581403046886083948450136247134308381940165804875","3159076083816399509754948610929467278257473888282947311280653574634802580912280940686954763313882823327077171624015737719617373932318151594325834524000275847475866299387913048/1437757485694188822758304467756419845842037623148461107362957994816554782989250555362514354661961482939226272309026092009962414616417412938087494467254146002233028411865234375","22266067259907364984531611601870291368272674573653403965630628996687370994139884833897773468149149664829922302484782423514167405397665098388400450149078982462318781750661005833037235183394221496186539779712428265837926417581952/9670030144664428565128962309657100138096047028794689249320859276197340398920725569428532293373676415359965773460364494998334259893079003125373872108770534788283842907318071170285038777091588292539102269617376180390982915567375","14604654564989239958569331443385369522850975185358647132770022716433280072271007767111036877803328768910274400515590151934676819262085211828028638417329558229123989556376108454497813055/6090614019162516693013973409650613208227889078878781039105047015752493519149314227721984436973374032279421344818329285207124280297611253861173835238379831004010748379874393292231671808","1901241885407696031217292877862925220917660047127261026827869027159993239567933534052663335498281439239753018507182016153657409777749792228538380379703411298411623469292891476969894084838876001545818141543890273256985768690847587711270930688/765116019778838839812655402103512685695769161212360553099732689795578904762091216998790589926057819838537805856579109910198553330075924857419395160755642371550113347465300208422126945265887065434116781678702741657275181694851670325469434625","139459806786604751793737926146840623607010208216289543036026206208962059593900745886202214788747453279179283344350478734275973878932538430194363355795823581315329311220701640235653288975569812161436/54371368534412517053056101353618694718215711767266376573138772968257303578467926450212293233332401067673270853953399269852376592855992724934941173346260129257754416412476202526978443681584633116375","1045669091124493070709683241190022970908640501171378776604126771144008324358233819560649021940145166254659028524319517244711645162132513416238958170819347361185944945680269442845829390112062101255500836072082817820950448463314034677353723256969344/396228259004446234921310936915931611736815598535963504660076315228798989932959459406702091180060429080345146735173591749448509810270759531977278642135591672189002006272326131885315743181289970885337574780897529347356567086535505950450897216796875","9912919238915437302006264477931031611447467070103973106567538528951878797932559935860738745374437522819124347510590800370471910492338584284092534264608801221235029062881964101996762011296996851893455828946521/3660537472668264151218961634689665210933936249986285290553357254224360417386515311493310199319523687171757653216994741150377508234317025158302057758196429623723072084157928224798322861732880034847243894784000","9263710175433181746575186369318246002919895649622127410824041370079225200282403368319370743363303164313395723904510539050157032684710468364067204876434546848634842333436957245275217583248805993142227630297924119330553308466662488683624783307023014909360640/3341177182697517248552428837661919299725031035849865632511882688786226888137634168024976033652753689210700218163621739078534353578510364301481093730054725078138658805025014615651043313990684347632166030359086885561104034510990826655289288319840595753002771","5116082230713622171832327542439052727465114322479570603905499496221224653983960598946033081212909066917137546065542953865612718836914393275681318667667521726785633638189373998191090501201427906618075889744489190209584/1805752553736060443820406101277706970767657006346276183748749630179442318063568286372320188433843729960294965366346522303898609655762491623098453269916163621089005711823488749297418113474056676109581110715068124438875","246569125619713282434448566970352231845414317018379160824176638351574938993535464763890962336882760882398479702237564384291290459961036068916857265499633061660562532011248501476114401629839742058389195725393702000011860799793778295606988057303225493814005789533570432/85307063020836305797178273029353623060860009152114361453434032434699636078115114412588719432277441055049132559782203988387794711585368296817222565434951256788867244687081233632650953850383220864394261763844194948389861147622944651546912394593164406926489862036343375","133672026303452911046163998480860917119290576658330909785707604886881155606725822685088929236266583416708668502760907677019598002175122453170574729028452721476464728566191464897928696630979863154661704374206171469014225143/45398130975270785045482567762871405072140548998125471025451666500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","6041693953360002800224091673336562508913199995987479264605216252220579740134601435770085920869376641180763419907442721705887169884230643795126568815123647603047739799302562095542459344811429882053086550900803768964612193941424128649976704727183797495759082741166938351872/2016766992122395667828553277997478570503475626107286343497917705446132017125079612756035254750822860815515899557855166824523851779156336235294914777307802256439645525835223691751931866188957324792276149549076500784191791380803500156776088683900346065830066370370083309875","705868391597244582764749229356331441978820024796066870551110486625729826111158236686696326058778874201639006234449557592353247542995871491078308187261304930042019640830629526023972693107193897009168955674240659026247094657679060/231848642748474339277532000336338632910990823562381469441716922006107433404523316252618490265927265734670539384485699132080062215196462178933963957679882342083893417545858074378754089719547920901917516016346211301054206383643383","101832160604157943093944673541651013907278188571533075311673249923948856034633446617630054761681006062910980371900782781226979391765818325065031889334563981235894369036439929651260587335544056975715076598739977065390678221999918899003881778449092038750712969437519295878491018112/32944277910571666002449086492515464541550138004002141571670657643770713783329063548790202120805341989608877739811787937782240802963962520261844114327432160788193314874913687387269408387417806176202979244637915812905426565263196954203487934225589622864145960079736633434831996625","10655703119271468913597640479490594180964700448340778168715956712130636958373270202484276402718566314881119559090842449610957974112230306343486091910217340665146602598568991520563987490686996746558858366002301982443029430290679385551/3398412687366638541233365137084722368200311117891192348532156645374786104142009695796409107380345795998400850838706661851176885183144928701608654514812261697598380070746520197171576610572921007069104300695592751543563472456384512000","1903039332876763837419920240543738799531131775028971323439870868730321221615515008394327723508670975623498588291298064320786970626232668956372004004897872810230178526101184611242511193415796638694370503100219710864543168952682617801833318493436174387568067811938490953495819438108686336/598806534367503338307287246320963280558134937382149405305466709787179429317914803617527827862441615350396864359976273212272586892074799651088317544101755361439294687323233086696182687664637422796995789967075271448560870681210580691574924544896656175563265378514188341796398162841796875","525573915563826130963525826191411949262846916750432019596028344808298471293378917508549164993368392834023782480702893643486699787870059946429810070222126260200026332874480239090370088123833491499400991181659445914352500247596757005142623368/163278727324937389095822405034435687776345799835442022795533783889356344755225815267819508608559076191292900367982490827396869405536484846115955581043091229202052407483776587687967125885665493681707461345895999542381476164157058393971431375","9263815657177858787273494705338516861045771674838057329170239610953039987023429736752079544014780707408666628475997291124805562998227296677616204140605356257712022384368492575381355563976330347792504605666631512343447560301417325154003481040250148561839861837778597346623630046623751094400/2843321709948499955095590862256744532227698001408929142548057792217790532624003190447363578048562448168721539177458065482170148482375585867230123873178100117094533143052886527452665480614620123764036974180917207421482431983407742154634391264619615289225747664532332469783301704643254076601","407959339726114455622180187758753007349209016396248763075759257357925636039752474207685682218422721827857994768023399625060206708378433960993946156803948655098667156937949174400873748557248801874735834957795040139401560494087476967548060208243867/123780218751812156744401121690996305978134694678934447237402511116731459214498784497436358160964198336874043702652746834763131444030185151143987331404604087778514863973633941401826334750268416015224906056576641018962863645043976537664227639296000","2547676391598917379516698439971914695230548782904479778605691338364453606537643088857116141939170899135026552016969320061900926954008522781162186995856580955090548471448276736878300717869625651893741316530109438876067419826217901657017506157997588944233677467357220316084583383623602865379325184/764562034757392298786420374672266498815021229519853724850874576419885380830752931701831256959159800764672605004880389358601658343203513177084389490286723240185146570925957286083025676875197029662038213216541352875570101363668917766225709569356861275434470568767077844675593176178611021135573625","186545352286463730559933346565311535598243666022232037054735807289501173444103692309735768703898330430135399033529355360391658728987379385732098960609744313878477967971557204207043802935782878745271859468248704012618254203101767841517569443555143252/55399179641621656233589820996143825959365789093262978988289445625153099592463372579496245442338653053662134699646413817866770218574795378644415019944304868289119443774932782235638737888469746745621382139263856603239588594078668393194675445556640625","664884440164786473344854955309049113269357314957985265728106924238588705533437169796551912202931185746193155801905841712503407258166135075966280435780812714252670362202091663287095423712596462690753468682634261029392794173636943978404002804413009590005984736612421172979101972556772005594499779860608/195485517776407145286424460448995460754674039560651791192647586550615878988380153730602665795647187884543361218962125172808792176382956599256188706636727418572541254480798303566840010217729386905041217793614214518363859058348249961790104618910877813067510758225302884815410347238200133693756493703875","2614957283934314904315471338485451166053664494383241929385424599389309215073267052860464009981063483440201193771607520572077231889699858482582363845275452280606276949653970992719332472370351170732899676316967244504534154616036371979031399425846100527685/761493664432749089312665480773496290658029971027686543404885407644062485746072719559288231362060149626237939029641098328278650939665665969011529293869562636656650999759724704272743235210867676873525147820749560155294022488994426729939894753293900972032","124843380518493746761140367283007507854364503961156704095198010255465940085534099747297600085903814014415830785663764373057896014399822131175202342399536439284123918855893825207202244831315575594886675813256448846863723093240955901916229136393454605455444105444987028391748121054399538064686074523506176/36022228212051654395480210378626648518430280334458144892889271272122662467638331091863215146548048144675657239846337165813938424387499358852301016926312083940212100001220180762189978024821166744964908871443681332664798940660421469519997746775275873085770018269706847741064037876137315001228315806659875","827992369063043155578730871896750570951766628472810506926098505028264552046829097082095665194000002802661600196840639204300804225352337632259980703832713031790922485730615305441309917696044954289187837653933158950774246017223571461858939407386087081525130831392/236805932823686534991153393869288530368011574665859226704279685567723830696754821658770176385138917722808377962346690757191122309876922069867472518117628639913077442806147910884267694879089753138429767401700283014143248445966474839193628309668702223994071394625","17347276886878323736540051321582548724378497839789943634071026331001588645519865992773157565595886250230140452154269197770615097377486013097979087647774513500701793885978192218455687078883766086309728287172567466406449372659680040183273634701092561727514713494914793425407149186041796935055187281744386432/4919325621804683623339606849970832094714371903709195539440424738973575902329797546592497378000858196173718145883783709223158260700365224756081275272021856393735663399552166737690038832550853145831185979094979556715294990257315369124065787473707136464772247917156232366320267601622617803514003753662109375","137984231830526866236186357461458917020538108058615632801298091031540729111527734872044790487396302545910108285921421417358113055522725197998483383380192391312304647004240060970929072498293210057120617332323445379424867965764749534125081131327565507524502163460761/38810445792642817561168950890315210470940006613819790543653745327778579787694809782601777514116858514049585074667085399925278459138508514838268321349069481334967221455722811414399738756151414906092225265355449011152267068726417045644222323488445626292574879744000","746567120547823334914136339633766098626636643449144032626270358619125402826113269699709721071135471625588981126637674402048519990010499180844665151971356149292818375448504122545400227696621572263621729512461528550588108384619064912224884465737417596190735966915167530332762203074440688676123756162572829692160/208334337057923929636884170505570363171441147899816815785150954417598643614152856767186132467069365605496210036171429712485182162940460120834349006784956522600679357307849981862006710239311750261522832996877712350330290831638640913932265004107623954913155144975252743257846945609734368518424172846119306643431","64649371728330695076928013661001819989330953381731372450140483779536126948957993261299287753791770622512248630224724990234903928056275080682537641377393210728546364176267034339221558641084730052304770498929958838997239635790469536857863963589118888238069738647239076/17903951498200212327802847425913723358452100686246224008745414214690047078122925247086521362329833307849817944645647750649290248110509395628305970523384831671737569872597295947593410067364379687588919135621621162007748635920864926867870502568935739725312687094047375","2454918942158003099688922026016393688092399295166304634317616773083386087532869193458590448918958337530406410803840837646465522656670050113548208618655070231274778592766244282964463702354872753657766121825196898916725498553882689210280080206627916046484942827487726300822318764058084323314109595329304407466188383616/674880185931325925966586583820010578979699141814417326552629206140252348822939845006845669570885271576698771404162512001549922909048916000017837898649100825976232784446638776021483802989797501705685620612986771521390439936066527738682396560462899753657942715306792783283782238662155922082005591512296007820682995125","74018558041066162916454010680594042518462756234254788158141115244349044958441521749277686851928706433556285971088455226217644009628399441967508838553345152310730562224910795446341601049647392069373970101491741830623078126344928804029524181578945586663110848142571149861/20204153620006780689923328634586091101021423979622170579036140596085566172775051595588438592742563923428900864000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","2127032036758045513335690185608563023954009095206088224487365541995326714285119384743928987635752931664240752323937321097955456543854943206092931247498833001499955456190701695430459583885125382086777607021670447795321669948733328973350279846928613949120929250312666393359442423066212311060931469017737106028339882830848/576612418511902928757340062840968526862381326698309578771238715462180282212422302261044980131594522407066369222998903808960617461164985318633518680304995784614308979881735537678182134128319596636920719106506829571072447362052319438091347699720147003209417806230149598345068078717948025207635448205253184540936478445125","35289653975561083576641954928762116897061274899517309102784750384002335187117263273488751066569234386120759866204372398611196356888479036949053282301027789530999737306501029700128744408015642211359442183943916106790666114870974212159410284751571905275610921784716184508440/9503006066880728386808143045924119024212377150217533250562188228062174064693375135306438120385877320162710918716613546077156389583384656340709638430674364232343609717735574035535102953482366914421205216675248471695111720986346092738728929878538430662191272737183832556131","102633551023964794485575491065909467125458972250222581133681080524371507544152979467328048718122409841060527545925136196267751819689935599599321090571687632103850847605493223603751038996548520557330016046032671961857623066292962260173840972332108111505971231021442896036760967107060309991355545554631003681544611731245475968/27459658121882266328752886605529964804078316737648012166874496015808620265471203512606463219297059547428855195782384236337998738233668399173746663289852416697917397644234441300570212555870401420579737973722145663287124151049692290432756231390864184491891697469874600345958989433125942336757049639797225309327019275689074625","10034393558388390065766795008210457368713365491566387292163814915435906649268119060550511145023450790393353937124495488860451123302412204483570913557762460385297770427946219119911920640306914453207097103853766023934602534502476962159682750262143380527529536498215384467975023/2667919902603322771586358077760621955455470781865624844984169443739075976572061827709528710108877015489050369589117491611045518221354793418884447632063538994046714401229510497599783726376490260140723032102883617341970952663947646017489439179953454964374887388652792446976000","248528145263843375390386172800048509380966183384567983242213959113927668429802237067505890436957693495616107089384741585283620097982859345081736730899912519273262934785992235852866637878831878448348444611412764161078458068549719800733237024285525816723480868704742804077255242682077291713092790250511567621735004237450946304/65676865669148624809340872151906045781446981664561196686217551358486802274698228825404698950974939545099727242259547145392352658637333562345477931951890984276718673618736565926663528625796412420753961231404680876558659735251469326707567479071881966875336951133475135427640218972722939427821842173216282390058040618896484375","7805448718805635696495809414501206964843262114470109146341305656318015059743127114324245035489577134938579856003956861881125856595981500593426840968087618241785931128978516340812066502964561231235073012672356530509663384739132686548934288703179479011016719045530855033205271548/2050525178024039744126592505352202216905491833360272553169520915020715464206141942151086176509423406413311520838568324134077402841030113427309725873344806030836314500267104070131451720947531994814710189000076651895520222646974590481497382830325485174899169093049299764813276375","3355325071293197839434119105039673324264765809771192815982246040415580387729382404624613875653005261578877047405365032178619450963731719777167015959920645055600439987161800547901539269321100559393048973255388860193948274255340335876890491746900991668165565729269698196233805991206691196045182214641935483083662356666996922240/876402579119117579582569839757462461050855174353108858954282915644790659429341853404829661899850841645529640454766173209897510988090318303454542547519850473808789222552969933222203420847859171250332350076509996295844203965564448154484566493395403967626596213792922784509892086361572955175655987334882030766001799867659814117","218871061991045868372866381545267589365410350294028138778572466235486397478028823720846191998825628156716190463263492304639890659254282445466806224943413446008645087186307985343574807361972238230520975439736199291019544576443791916302825193643774360055545186783819367378492631806297/56849560726416896431557940314760680962653658127458002233782028041537121216487790008085876994020812492987733987414743604239935223783349870516284048368761617736127892160849065895223288023531930411718807065209903593668117085505482007061969339237404945180379460053180570404846043136000","5008685108365226931582937964451700746853986170633433728409171904803795018146152804690759530990140552460596075588463394200510044617816085275660078502126507209302951286606953039953843685800941558212440519542602092919776366067720586295390886070120828199562643208637974347390938772070049344991272621102622931576339988103674070876518912/1293888539680354282541277646947380627241979967611883341823378331667976045287311988103163380651334828012840330710760757271860219584371109472132211215957402251594055009937397184768184517621978947384029376766290498101728971145633139541827544539988344772578184316843734267915665730981857376872622787627370859411909330227080697966353375","15388340113525711660227566446101909585796746979396093776960989868457211684028149502578116456785221720682202816140911944661051001675127262774824593420825587319436537346311831003212424497488485098543512314062112948777572038731823948224734505930748371522309451168088057190162878224801232/3954220582960831691377435160890656173654063611768428458807273708040518769541211737927975894584024448193835165167801976423275767590502552964407494549049777006346189436817215329891530811451811864579644894987864267389290848598289794977382504890216219362031324635609053075313568115234375","5099039333987561374222193551155323470675617979816941646196895589439391685938046865391119484510329634015275893520725135141878751153360264368353595348921951280561029028912953500944814771064409611917475818956659775131751121312316084465321917769679881052144364834485866477379437705913911371481828140817759401117780199246301705600020671104/1303503600297679371136943454060319958680553228879031326679449263682048703103464872914972900105569835004878963701599765030590097739639045890060548760692125546754294514068052902543220382104483822438283040090444827980927544440984823535260277595466339403795403200720622852069244768910603820007632395190204569927612348189089161551951106625","4902837141334073026145827027361937996261324349722726869116185158777439337041263482852376194988371853413467559557923410949898048139830183335197992754748294810838187068126867611615800383834975563313220497573778480109264178673389149671194149749735833378557143135481387904961537942569904075/1247045310545991266291285730016853118981099516935251861146038369985109288084420528171217942065832292739130145780833406014673689119563698528225048800794718789218267628507713621235056538202070171596177775095071513194885568843375526804796016261173388452184505503341132236719484809714335744","38114743522716832107917466438257616720476488812538316101658139632867788464381862291240727309611460187159930652186486096300862388591521625093237019662273764387591494074792574929490381910446287947994150655077877204446864004067956087975012773988833339521775463977233068498404144221045837190392670308437391686081418318624745039402145439223552/9647001083383999453668111809775451078976046488746916070976218645431946648087171586252172936600115032316383427265217993193444199863138429602138841976586190525451324093772097241349417938578878934577091671046050326087898259692917931230974174799815198493279413438192301437068820185757869608523761456160341754512329264442115351926967120404125","573695055225225727008803730767518906490704995929177617646275646884555707960986625481944101622708415415988844740028718027554452662358957933526173824325955904005404113684003841990198157072540659184995738719040024647370869010473254071681533880576462368600901824622431045529064651675640055917092/144509482511118816399089096021290587489594541280398871255876563615464628718527634679330291741479135415168539765887291789615790513527330600394937614433502341116068305347468133950204152174094704092402978083370792135432486240914953928188835819767755172666693219213868545854371103120604946200875","23876960329653589647925126180903391687666378233201794403339630995420215267415575142266707357255726330536094448314199602616026935251126469221925945960901748679919435908556550271504767784553484434363646489174587463466333864577705745452492395785557425904735048180164697040313528831173448025400634629163795223739061661461986923675833880378496/5986312408594306954013526197465608559068621248896320652512228238115589875514604632230098997609482248000888567135685167138762172475788060284232459813998201719590208742091697294562538265829954186149162974972471533202880368317237508987477069872431064075005305838801862900501819963793062041081601844759452202282545840716920793056488037109375","58168289917567723171226992383559866214094157894992327555495441698028867727845766488121900626912848698952863438654895252811583144479300382761129433911280049009362667380001406579175563745824368613319103673817094498117944856004415812877213722455299491145649879676787079744410765053845551958756701/14517067289347903655500020160671113450349743650636953726251191692074385521975132268313263723831804150872238173602847065423463131917373356798750100313145228608894881457107689499956903046984443545789053438946050974567665049237414588435796381674590098629779384355275820782532479708807512981504000","728621890568281859295409481422447012528302594365693410763821707074444799793690738137592101239862736313347273167450056625929591960610208335290882047413011571781161008296084630072829079783328937418641417642857196346026366370059522990813537731394823630207433267854616768658990289454635793326766697884798538576055949457122067828153655416688640/181030730759516991863708593747964787874073354051675597050399087612142539517308720603687322924426591889179726492403913356461908748733972707460063017057809060190437917851790767968877215795679844983288935075688219234885360839984681619084834228226744165610073685719017596630302462070188937998558312507638434329299017584329479516410907786681093","86855946923438322218622470067224691860808273886184997065663554841573982963995340977083049132518812923329423480393306918856650577072525633920456721265953575424233701929892019410099166322511413146891121248381648145391642571638857576890568882512129960291171866772665863159474602604647289052079991768/21485753507365901947528588896402264670781310878547726104482740647554738151100954835784115119035980523529677083504495839730499664052882400915208251594384038810917282207449860876251558307288700200910747338758723324686939379138206117634546981163355060740270734146780942696291669461182599512320099625","2158989152301022938148680102142188531448821359505188055264665167313418619665693092337665573150374231484840948447637297247277576415460889296724813940128955070240137590073233263168835678714131062764247434144994737610229909964847568491446606012581370840699582055341626266533733744293929658949697805855362114229666626620766245630122333733703618176/531794915405164005613733454597931482878479882704956110685223892325074211694837836221759995948610212818642789132749082430059593652854659130217225506942675608692701447738732031302987802196501895840510235161825501235133794449421919927396142470196961877376701957829921152848178076410141813926924749057304222282687697297216661687583257901415465125","139432548574396829074586704387656697097760057897628994548358619815052936481650396157428747411173567801047221928593253479330480454469358220685854351236980383914223693722868233819483137401339800304943891968050399345430243790898955416907228948287367356990263740207046902209563417267686591994743547621/34201151688775214071963206765436083445901621442002061707492082843232231754829227303539041286301398668437202547003300396162741375435703188500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","11008517174872833286150985180322584448162884832099344969609291070844193524816852920942383850580217443209402836100467940651581092350600329145627967515818684442171571156446321228596914355704205623857871497315955269266498229823278800717909321269179839084452384509142712677235552103459737790674103994445173074670347080506698168482564009465276165824768/2689223396936080856855299215659204161946704205931885125148201643087176556822542895325191478283706585400237901215485150928036895428721912118467760766508162631903585126377676412573187912443878232521444786090510891599171741773242011017926658231638022943018461086517502584854390836347781674626615709751386455292026775663545470794167629144456268750125","16108638074211260588800537540680707641986073914251424878121255234668558067988171568946079848860335948991834525552515669040163026131919804987340113244760738846884911038097907756220945883750502673899084880578229601870882631165510396775126850307838505063922101682333806284668762825609556049426829531780/3919363961344261777100658318137884299575193089462944554282218278496298610828757650104922583359642384253066896538203596057302203635134833545580869871333892935330950583664400555463557735723364497947986885146043017010159347046389604172186788902608216894094289769850517098027486468084407618748895626853","34420755849180279597302103726180110022640946692592540634353734157479505420320000324260530767186132260970572450489530034440214259559325114511265075416512316229177952140217732655405289808326341696986755141965043719344169685611217958619102774617224847284122901023774956887687026904767714958090256282893003000752947427857703259704682455375442735857024/8342030311716679826889917494957593165464748884572298173556257652389845294530325764837124998293398445804458613956489096007564811101361266196542129764287084823604897187311540561857741285793447174119667215803837719660675298308873496219385226998078648428368061868944322478384684509466965129972030932418920415308276430355882329457342937549162000252625","345888075261020004071220843714060353763382280664960929903544964118831237876694384053904571498830068831026644303797377762345709976595360421502594656308937649239978525713471393570536680412814805076323426256584504251728507416368609420882442293831684681071553766603478479006495757222912500012444787804577811/83505703731469734628961395063481893801938371516752417759131774530720075262459158384433785006689548434701904106312038822969658455364219435022841597243178757423598248565463985786213156556523685666430799283870548238467817226915680747412191245046634279766450629886904716776719219698922088211154187845632000","1061717830619177527082296723099890392273896386613997004874669053445943252046748251883532634529759169500795452576392700472771365240996842610207274128102329096619028487369622001737128463631016494371635687841733644339636164570819431573829173533941056258744442930643735587780907310433371453992062647737259587563398111688659657406089003293576961475848704/255359631537215747979895955806995352799574790340218399351168178555478073997876110889483456972687438702262017800167048243754141722496276537685853311434069991222324039005160057724073156957530106623908696241268268096879569794431919729620178375212905203484165745866913773304319069321426245521467122472046370356725530914587807274074293673038482666015625","274122944106300296738399632684955400761495830361663966466225652918683099779465438024846903286816813856490888796372134557295699980528187779624865098445756013563535339056233912394908544185885547842235097677765325396255649207317018754967666450708249125316192200151505568416495274671679500594656671785202496/65687592621976546250581560102201535533608158256953087745856906437400149205693427285162333502528793675585022025602144243543064185647792948495372442630333800126269123531636800213405254045262127593759539706750242430153456891792533267948231185296091297979933562727112487057234422009426868531651634706262125","7842680480716516803148821198697967237136721860017131244266974996267074742248599085253569637183007740566941125452215834642683053334607896723447140851344501084122965014242091312411884985569341166545074688756440728922408743841592658677792796881188604773469108807869960161395759837407978596679911066586626885830991556090978327508459276025943279064965688960/1872528612245648675720382138045071131304652050696842872529163720558126655075937845539792108048310219395746259570506175902206215101518698490144716531697689534559827422735649881381597761684154409796315455445459537515308174919488497154409643876490472215352056502193150125644288086294418253309947229151074464928874881827227706992859640236086417889990541889","5300824422251242070074569186825929119848111723012841627275830216301188228660779008353049603527567784119877706984722171178137272986345560485784907345500893648715341273841147320288851034078863843374665850852481747000237834238703248634174397792745914847774297223176674917912406659831206869442510948965571661/1261140476013707338477604677428573831791396352814802149994640617701773078174882455512668089072441176857892331468691160991310474734143842336092636848492066592397892638052212250229129355009939118431643425836944282456647571558383755315238500832868535816144280088644939696339160092963629012001958205063168000","2220223718762215584659309059880106334425515875615107369399767892051551634000614327272260081056973863669004224981561870246078120862256383581012183852291444462730018546753183156982897386563561418424093883164027305254176874653780425452987066512563140531367766900610414277825262239199580925879453806414860409441845631158680721091621460775043562065815179617536/526383206607841251253861841374779803798480623722760367843070466043030228662340154304405180907941079883976168609082254331465595267209149963786388600028701073430773581228212441424400748220833542964971495005714483235359479470452593264280645360131482713147116366500300066771223383007216182988263355451923333319170174755334598973202740108032097242475554128875","521891797109626296684891455959263713257353500867652268541535940159815152120871142196535233326890353914761242025931373491906127275561002910157909306979093246574207104081108188995072105948138299097848175016082947174156278439986705241571619793059501724269644447572323501261424770743329858038040685313621446524/123310256826873923765604825413207481739886340225713108649758575106598510022338480189649787216845041382860899099250547657534972156328080736149239332330143771138115695598493059325064119176038137294863053148618656356436332991079150723235214278848602671333076219529535123842212129829931654967367649078369140625","66086044538329677372986118727999622900471937619891337714357792768200341519193500393739322894033303245376225584865369486696276607060432449792893028061817203932068085863800494054274423512956136695211796751845295921015953538329385253280866669403169919614982155350899648626481405781514434761541281229159396787287553493046927448595964103589100429722948913403008/15562137339474350565671240515273666798063901504051979980452491653975250630723677279081058884163396938548780856293034775459223871281049026140999055923743471466471830572672766633086347312178711643724485955576579988182546105048041649947277672869613992334541438784737993706482731696809943027528882927942967419447250586964258807454003775693567366165507144866375","335377615394100148751647837967017467711612297170079949298328061159559939969228226474615711044891085626519877634842694983669611974807129333052471799687426665556738316626171408219730853872410792831871526174987402129691897433888027072807302411474690613948951673562473758814664346259109886876538510453475290967835/78715592752271462306588358880337347638000605031000575876214116610339827495261512281635361568951675037834544811575026718101166562072917855004822606752296233435017284127594847656529606648345533195437635894948829857913798336356647286032372695130461573940500785137424365840081503133157308796505622439791698116608","20090879701618729602554170716780970848925039917987945471322994867171660307998603515745066411687983450400412739285577269751603921163835619296822801840348319742203974023505186187060251544248644338412667631232247108675504629538319425769464277309915502144443973397371136256151336255138506001292355330875114245901820438821732843540725116728866301271466614762497024/4700223519410528857298732096729483544820841497820611795617923063440946097326817340637303431283005509904481323205480729806879570430868897342398783028649633951362398196137429076844504529051072393709154483678349272930361110568616112723747726853614661953537957117231900032044221535502745676310313569997665352252492568100075191900969170979460298189170486601502625","2904778979985524171206573028445379872240558084236464200857594814631031581387804621371822074061289363372523364167184697785570324832815972970658633551879143187709707164796663015180877412717910872234647704536817108676736661804878068078543241390828229923424191204586313620612539678930999769543756218765870513049986792/677408099044823641581658869221044375312077929976719183424865834811543737800956896926637625166844372424044003929341361734886232742770909683021563822987505236295727478159938135467975522336774471915167606673489722102077041330652185811196423400701795791669780695158730756241178262962515917389382302757366325768069625","31270155809329751863885224732454397292230969002004953832354065319735530624996254695453061851449600345977646455072512400760539747054003851289540339425848681804190284451253462663731135337775088379954403740058084949675460445909826322297817535400604180338201322667139062500269285493417563095365899631360901732684124930296643108551710704785906431324876072470231424/7269578038000504017073007978844992319987411732848567116655821196644382777088703228960020894756722675887473977480537577509061256138261063926845643360849217556370868752909531088361229374467207196928745673402380473721018157327193509586295879051411183657185176812738231456253321187419224704301236205478184115996135940848503487199394612616742961108684539794921875","432538822079707760382094121020421735679118830363764570640789368235407853152380328891350816400541189148550353337874309885334920995713154225799660601389784410911658967499100610376065640785585342035058364676314084595283850213942576431310823836792440218271879354669291052589804956435743500204185107215929849054782893113/100246574739326291035824954677502591279343311051719151327066341370995390423713403739043396503785261917771859220535505691760472395306543276314938287868734009582906895763073519374099272340577921671298878837400921045252035507925021904954445172372479744465666760762909731237634082051855588025732494461939980856983552000","1914333673689206389116942789116917579088664511118582610293383428712902211612554212779880638065888518488492298586641997844141510832940409501694726851666478650414191249534733087933879981733561565249818572204932715347752949087800778646065986244657260832234479202201129845117955957242616947361016603702640821256099895469088229339240402478576285854783063612307200/442333801076281757298117784528962837115323835962460661601905131618341609371649347131724700192551574625400701487125984359494804828935577124602622582550626336986871791407398609915208114339012374456785705161994343348351473385887949809051796407340988735853810174589261300681030826392672282630613354461927208579993042968520650313621522933214063366558703422757071","5704691626402072213006354545292364761246893919997531024861408248746241619817955824682639582830486790618668221530365426203424888737658778881721063941495350237419723855000515747725926735319471480027293210991869255971365522170749568996651406002311020883635577590045650037569906001924971041810547543163363976464780729932/1314240362076792592671773873754757443276256223533339004339330559325754574023619698171225777585408160438834449576526997055649849875516310105297894855264038450585295422343454458568152668980131977005808840141079502436391909349182185596381509091427752151860204235071122788499996991078935216686010888734471173124487937875","451219364084386208718456142329444023337343409261545444643031014769484085278440612677813682892926852469540118625738238137458321112005189595703619178533263706811689687213128887082197330137502064260105387500552856851972124172206996205919556553246133218441769325133725631665593372188755090094541462474970525820334385058333756591222492801647110594428922046641945259392/103648250172203340865458115839764297558925693061798169434516001775068769911768281084188883278842546791612199025413573394167639925287068809631958006622842716869211374513136766899877504136929177267362862319748507372147243911522667591375015611312165464514308451222180272935398828092646393830572838772085366567154646425598388620105539619174837489536378605144891769625","1591076564577634575701791393842535460875733974464805197283632670013516183281542903377750304419996681222758401497321278555686661981435637461350320471258386388843198706277657208526372100698700615835733712519332548607115875288787602084336341594576426630670911478276101702119972195558314357975365863803265163991961173/364433108410193393847203348728981296285742202617988970384277162225847256295865554341611171460436362780497179090329831885853324392923449579538286804729856000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","5307507148709435807261229345132535134848030343901300324623409721698217134932866488937772986386501538026693956121121771089740095760486362654754229904633476234090792827930433598453200536551779789049352131005222659995845427680686677324963223653949277037520711609343166926627713758990384011274777087968799793410506391884872456420041494598273703914689586637995139580794368/1212244290381524115082005575105703496583315188540177702780216570265159923654197746388568151706509243638302707511238539845531608313334248788980188054651601536067740709977678222790481348003085034888244447626347312094586389347535167903408519024105748523384932942441843118813819781347089702286481924493361058339731949844620763272778960860509570622673048786968660129650125","3046577098843580578619955603029073328361298436129791931304665777036152915858575282362742008136721284817899542475666054101957899858138590963789072530710775790433466847100422875906866496318804986202089528198912098377828580031852152997907433335176267300286466072997014023120087988748396598176622765923059385876855303940720/693911859077752895978833241338902695755528613729508555938416419864772385336777924892434701804078893822446727762077537955240605927550548046309823051841326355655848406646248595628715185413852040295631448250459076043816328082561248420925930431777502622148019371383254316636979070731427737764160145097293260938978413488819","155310926743873343426312607182060072939030765297630534544899230213054714482456829198485999782086944271490229412707980997432528653509945301574794242118433868747172279224118534460563400440670015323324602117517342201640016853927923976796453577048995243600967202462466681112804476672348206491490513419336308575442086511015101999847896197546900512764233674747415844045184/35278162986589659300679088538176070649273991865663041616088851923111175518405117391134863644540911005782372831496121355954470744169969774540892096320978686548284501139861783292226140413769665461494668479430833892857992401391262903582109993838728281915806394747833588629467613308837196269424421131934859079260185052081536487462257809987002198437182539441349474426375","46729591025621874782758519074451728476386657576036360734358719976400940301493939192083339293779149127132651616972817165172116269307276487158069293114860391502484125554406945249728802484128756924044633825692779783425628292959170597009935305429239702926898931975023598456207165067568919757902764815108751735753431153581849/10585868084079030838651390738371141142245086465033459640458366146849314274285871375459898014414833295804139979016362796357043372316321872357817727821559232353993714062535883074661734509440994664726425399880995133711038483607773782532430879196405793694658185175583691180757783597895616920432527125993118171361116684288000","3736372348124144720852190769710129461145889011598636925228657393934132828633132357232883470466940330848177425542748100211498184494252714616379450272611850068867816250209867530921278645286769418080018709947826876461419654782341309127709703626401211996255743831998918894661053669189312375159058718767082163156988766821194002596331826150321864927832618126580509732359424/844176851007504003627016945212023239308348428094023437269532743221937069345682900884618378849283002998220513307273333096775669556093005637615012750733216460458689282791632437851364674879152695438589692227159038555722539345972833161146108367329370564838671791241431125003401861887477969954740544092178721327724620450947646209914621007186497081420384347438812255859375","1258774755828991281578968023382624723772927642002016270484090409043454336040857926581316994594109169123354553321469500848146015719851609220423736153365139804086413284787598253618361769125996755159571523632747129480387254164008968993734442164892486441152227433281625391753702577143985047832519062595123255569172968685060844/283659859661671181526547833415653453506477950678651675193210969173130116121017723360258249430884213011988678011357458727603413521688184521573094783291496368005697481333739504490647194454695504722542014845706216224432373442438242355188461951883454664693262684873988061018976711201351382163527093784753398257094429403691625","84932063355292829988908961192574710493098897148701473172754949846455626381329456661808566365329266898990829247446356970454502007127269708487563279536825277374133681167235811080298134899629580318813382668399644553111080625918213250223197440426147821225593304993621451053135332451997633132772608233430131400186571793929377129211228689703376067763625568623535588709576320/19089978133324852910950469658566458037096027722326716800113107848115231563787455584278193954518442601810776347091253561956877155673550458955562102935555510392954425196165785410319126098393353878286400877305164869548380670204577544630353859009177051698096136470072137579698473017257397949994722015089768745013713383769765609613514021200888647472804720456494757423299627","802638881530832431828249604040579750916118423833791608589560402449036920165704012070349537114920882938466635598602387718300074733476150548724726460209016834416094317724261857969955414000155807312852092720310159572547644569797512233899495300028159721348599816083166712365215075728968005941610056018023633235372936903015771583/179951197386119079732438617407921535065140503043429174394605652913879982486051627760652197484142547447000508189455126493868229565647284332735552462525598465192073558793335913005459266977086104359621022691931002488052727597513413492393525660272900161375677499228252863529934576881596384036401784035248649026076581302370304000","25208742399375362881099811032135575360109715964024747212026245529087599633280142314962581193303683759605084995818253124445773115574470717199218828756449187055537877478033129862600982068782249943150019637186466260707552416433010545437321814115233841687700051830170191107127799355485920046505591193770164750886037885397478191534797655616745528343172318318678405576430544896/5637713398995569614196397857525646325234056219513202928587580534159596897880731043336790273040813044077153051260989730372846713618900145444802234629922717464041261370803598799826604841654608724727320798324006129524610666235998113655193642594744544226880944882342204407750193512869672849910003246504052298022468012594459974209940607450480609190841893267203392880360823875","732332637178584560220688900268566130246820235956768724845747830959547501950765063982943061181526237061809052444110437930100210105274824607344902764184151030827266142225894655531497849161692760385938786736436977268616029862577293984376170905024712952813234949508186306774257035535805330366742322777611063402455261391021097128/163377988152179636922409938163005948596822656868040662831003991395905185823836089887990201522673196719628247106777881741843786365701135555917263285268753605514812568258179391272113405920369587922702002732667842511108732068683407168090725712401954314293193572654347237716691784386690948494003094992876867763698101043701171875","22391374854299462107923583267570593886002658786775211597896252879708753450794332301142909715845151746786016535157797023153041007263258732991465037648536702217273897876864351559736449481285518249846264600935543582562018874574655740660800634883403597181876364712521253650744197321080655028374602772696770227741610874399454362583980465225235674816785988164157351243193265401728/4983275997188967758382167867656806681565521964135131710678447245984239733544941881418957694612909599261843693554043504855207170782744518943778096768859337980470219783210191765678908537645270392500777411134164918803949155037581108678968701961544979451081836872425574123683574475790997414488641534074873248802450108535183413970057319247033379016606809226547805269752123746375","21252344995592269775107236774689012760750850598567799560343535731251766780016530978663079386453430272698006977668063208502408607227544322945446079708000304179073184745623740466334127867464883762843346619853325415963062181018736410570113171387891518398846617197097407612852037905687899800932343156979591740310928257766081697645/4718515378484509142377558412184183991357747235892194234377932213613746008373918923611236346330189287336493794499188640380975364991548794341177060325509698404571318037298112293926833877103554546466055612498927474225619680186119313129604319096374924037870803554153458104225741255753314955115645304948564151765516183663634546688","76703085666560609319365659209445044957052359500745196718269665234646121134787807938680787341023203786904308047981099228357850016602203539979246579454229078497537148799349353250167621935384193502383187510928609818011142642954550330069991570983902841318203794113898871515702445720207144863877026526025447819537396146822201819435536435835285098485990260677737192230985069824/16989892821104122916312992616665764943723222199277412857053896319814438961475117951904867066845412639236790762432996309717924037467863024360211163971190006272168845197000304328480920483651558672879967350982199768255256753110375467976246339260326422891913564151453729285191351273342206198366624882195135056176502724912849575385576554208844814085228696838834665339811027625","40153831166521391225489894857551838468150576827129133168972859441122728710165233865309084872159583787083130713473702296122465319276461991457173085312407612757280915853584698420083436946976844240063731333638150599017886937783470942007376523947840104246927580254612991191040951001539641947153847776050138532219595746056076776809812/8873576113581065493273519627544307418139908640325227196912114520903505426722086265723900326735989771660987609604507503750212298754414472822477243293638486047313990878348820573874809636084574108909615044524663712495422565151340037564156235745628465172219286664653343193162657374410926171153516871765680561505768223660055617934625","200736374277835272485186523480177159453030082779872429648449412313247640312479214261681899286513818912991945046297334418102711629933437654377760028476767482162031641781499114859553677502002901248124750539270235098492377826240319766677856465093871367817683734079621359186477306173620331748496369122143019303740252461824523590096923561928354020960176605008889579578495073283712/44259440065125442964014453739391594153290923937737136823355312892557975399035370631521014554980129291582486968083228888083079118116286312583989433037097397252506140224404130371160608365777625538148303917306340620019882928744151294738308047800711028158277500317134537540772759486365658024194428796846364486187105343266398338060080611643110071184992193593643605709075927734375","488459049325494693259159444507437983381645757291858092983371672334043029615965882574409808932509285079401239403272414271652617474184321852388397021836909585659327974611273820676128650810907598106588433939541654215766888212287311943387232664417347883717203611092450971786083806323404432266197250919880225892099146722474124874256523/107455855466267410923480140898552598306699341366032095904938430084768624148829473848763761936703072253841751966906142283640379336131083461646777390874405323298406517250231389493084918065243079819898691146841695350589992171102939046740169198394671965069747042621265775948217054519855346617967866614303497258042439052681849864192000","8430374068596413768975326329313648683222744787097373111477788794692418932056901235174019333392845529821722488982447683794746518712070635063397464904489452840169472596494433874412726723065560358405027764015273789053064830528919091414531400589850704395887250756457780868677553068164933299802944396576360356896758745030955907258232257358056931680617626606715393885378887657377280/1850480358582748412767893656294669486390769246349349706200869446679212812264400876685764762211659843658541567071977813110496329850010288179702589501255367345935389050373021591572539260951149696801665953123597521983257852207280970577287472932167362521740230973547070264273850381896786822127290397075758780174083415923482640313277341120938690594859118603017930500014640169211239","58273615882491925540881784328370957720539797010816130007322211512070634295154626813477498607761260613353633996451797686143131893884559909668805628269959901044961666535533876340116728982072626875010391195372759135469446048394835148654407846242721443845351855234347422256700864370273092971804207514736924787577569355949601385705517152/12763172138328432984573837529764902730448666594097466544652830703737195804747682450548488162227364538052585484418491914323658215406327363805353540266048943197822838925184942600367647278764952826664684839953902567694832690683467635727409976388280092262839126779730168889686628630302519063225007497707028600865624133968363921915016625","2685278694947152969468407055109959900160804835228466214479525891103128459065131221736713585038130737099067040196326815283171857977706979990467444622550497565521863441617001097354649972660183038850033950647594754644997436624623325003537308428828750008305464174443210079059253920383411910911594636045517662796811001285984447671371943267419151220518726940455756833040934506414133888/586864816044968996825907488721678304211296267371936463272955488077666796280028127333229453342355554450708284934221461946991556216095213627059047984199091625921432110913096253352065238765240063555347292393427726758010888546427415276046238297382474708612526770055488323003698641493939145624184943388159614111350839555141202024991876221874110644879676602924730506882384603409121625","27700345710264347957758638741952394530538598225904772664391173119594616680996031886665218221392453628824570256438960349220263575741495285780845399187013582169907518462437966962923592601721119258663490655013419675469864809004562272799012227293974254329929404036071055528766397079743200179924243479370594973626764330855493789112414191/6040997839051213541001279276287478343874107660287651711609067205111574718442229224212245187655300348484144001298428958025052162253854676210451657425437588244676589965820312500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","80160269787574270953020489212619791839643207793889009503234879683494928396231769167082355143564723274576166638869430572977442020236299319718643894871736539109822173538266278165276591962215927816541165548699380129014840956895931285215480350321259054359835472320394089646764361802445068798451796525897304221529850133401768027469126408090577121172238802281079916258951770135485696/17444957084936455555074876721808241311651668802091828589911310253709517226715880722948267977560381436307152342821304525073651379763144281678911047276389231713860392794975453518107055568765009486973017341479560154792340888780337029481646046233967923289468141293699236815196553819373828280398488966665994092877680860643266914861837639322607761804740256920429518434353839878280875","2352816897072623416220002134476921108405735955266703519252095150412419264317091785317803024028565851487861978477208755211589867803009700996828082850796103789009194767813611798769297617674631277847910238088040257037678126316866517601388289837575778165301828137259948173292658462765645645868094197736382683775415645307647043205988394700/510973411316690313485681833991645423802776865720580280058344111363363091616558230182669376841383375321912553771027107891991318313938505988903735114191313214327683449514676737796942389784957658395806951715454372568523597420866050825822028817422805046287798054682484158011143949412956697442991898914560191411624040490122951328364833797","6403295584873165688372907494046202150046769667837790834896334486679541887567517050446119511695248926941383207478170182650927368177009669717288184903306689332746127845953193587519575304974203099873732502605739219028995266139383163062837007982999189114810534856227848568800302527760100163350814120545587074865568436789021082619398126713943637898657861949091545516403987546145915409024/1387794272010111535893205703999712437783041553900341112488641528986385462810448493444968969845352401058333929711237978223214186693177251566069419805757440174840170213159651962686467523533938145629444468366235554597245713128812532716616087753947246800626006504878203666972651384731498770435755225220796872155249202960801768048854869001310722927230237083418017482134588865244642658875","82993247683514419570466529457059660634483860665557779709153549045427987672829778520201315148149878525274005978368939092115193636113741972236218502664881450367443614971109677363668874484696543982239492409231870942414193419634675024621942196087473557914167832058111113476295926250739099284241826553737074679953551191767148712684157318697/17950946423927357725787689855263532224005643859095168852729513034456208872420513601894508438640531171097082516559962755244698695622824386001219435651555513795509616906355363573638916895074349491513539093024980575852693293474288638209680085037286354050958859425647536735341886663074581909148323105020337857959651624760873736590065664000","584891611376763781852144397260140844977346305541197362434227194779766612939978629636198589818106137319267243431810481928639442343946346034433828599323416877248326356345631611148749005937144684862502198147087702668524450709118588741606955966569427636630159793409544653944608958808602551061186799401212712216156799273254257486955348236914237644151956226336750212957092204830385441792/126256710861549838395499078249922986417488985866522660521294610280820007499099176190820291214370699289977888813109514854178180265382471972583921477022411657285850911270389720508719377071949050253246021921916685716353393018411683757067093259101151481189635423399611625009617884983318141463140199839724797412514785751549277231259345923662499623640886881048572831787168979644775390625","4743054867460856425399742072925732465660626340183690464743217147109403130730445842673866624947360862438925194786600531200056131309608642363389833474026007798643235346104937733349791667694862514383520689594596660275306247615314272223660862212527346572811422915223417783887717426641317921972456913534338708745549252254865615725859881457906376/1021840037832289788284691535543138164288462770384961802287250236519983887262771944174557087207566030730743075334169628971336358708580124427857321953981475719503574867471090607795242192417162791762511940848493176847925838738242153177311649130718886794249673254183907621449520415060660496225939963471753122766421338241291756892571824984344625","3784664074155769467702999785016514468281913375341134899878893061325465790589101335015569840325786070795267055386681356241209412947116340524588831510768864231937929260236754881829005065056310226407358204278658699999612596866156294195316867934035877283950841910726224355461522065773816109849107487214275801829843762482082803559183694631856772777313673086715631547326400170962722842240/813783281473223559981291694175087508812520505931454895884442580280342455516154674683217348039336712901850738745276445107477919518905155156380620466135946654952837573797479076027688866326359448543065305071605591497778941561986579230698384305536224430794233462949056326864499827444363206162251104552740175503996670997705423888382328014210171324376593090187604268086334796245552762333","1946671258536842642381655747294621776070051525209940130115769153666368932042152311477746728678182920842238801763565726086459485050237860693394471644023999467670017470376746609892484192072297938254898880354014176373253875722410186683852253828299669530022166361304397631667133689128358365296701757782382475692465977794960109690362462330857/417774039698408581013003883929127512062321623871486379101498968145670269174833505080260389860863417408848209525427705249526516766731427603641806256289098209429110794311660844125377702016056984573671024035213045475132134896835814746425864304907974005950155657789157496389234919107772201305672421982198984613601511388413381215220924416000","328578487723377153600821813410631465225159589727320893988991729306688663770697528156625398176929288628930496338036815910669579019719633124832162035588583242320537435554101841406566009219059042888412893352417446437227440076869427577701706713564212185163005644118869496869980925214424591264870388237079776503547314587137721633918824664946974571838634860386893404364499977966899068777016064/70382695927096628347637455030970644630942872888311870124896575877585692281624151103204551947776906510366521972834357031777287506848887607457751667816514216907338309372900327919413372044625602555866294337672022362865161523684052940126509854895320132828009551012639156341878073682501185688461720664801829933689280752623773789373199210473995823367199793407048741191786377993390965297664875","2617201476921368517857942326432090876874414269689140439151907982631768946799200744678055980827789859579196832718849393046147656447672531861353456343821196812881882023188898815179947651274131166835133965629115749368441605680383605331300030886676081418867305170012032824011912531673468215561506423833911621270680104083533917562622600478548/559567121085534865189976875600841717161617153776904752351231210970240323460800785728739412474960421770806162360125774000625035522428160837855944215417821324758873127567654244465281354654299068546570789547691342609793050301258532586131013585959164719533123826201937801986942606844854123769532447570107525081084531848318874835968017578125","636225736038986537559880265988431731529837451289737542395494683393492040808565905376235074534207026537145408562785279823547657299565440309510931336394031904920056464959974743525662459433889398003683078967642651812081450227654478095420306880762753401111260630654049389197602389949892636943971690212484981672010398108426002137114819838399222096538921225458913266993881960732663394566024064/135776510176793971074115131648637508758953050390591773574951317807919051619690313331192027871176160424663811116849856489187562728496099757910540362703888937768555824513740118941387831822900198029266206334350448626733139136083404404120210893986654422850183837974770675600952078956326317698998103770833069712616832650406225828969036781514645731022616236082175582937900731419575337473384125","266695771933124633677367149389643417608461366874310588884377151539325854547826373711099517873721616543570605935954334944030816383858485296542260152894035979141266909050267414072982042090341712035518685997484257326212454742816979806460287972757626105526907510197321350895873473656215941034605746494172316089636216915825022339855304925515685/56811706665210352283362623728191218698295056176625217939528332247537278605113496147630185544004654583441448319260578659922931798845493756189402805173037491645434052737405379674607517658118427614090338938517963215812444779184193933749520313676564187507594274551791388039139409235056119788261689087831209441779870873305232021728002651979776","3511806683161697708497547617957719390189982761002154386881580160856792742952365159764830433511949678304281539875366378131195670004345568047690216126001067194904446295336734931691743477531830892015690816210752795806120303198745685394015161323982229908105397857791180342330098240702332072396030780386362735967021055250450666535422528637737695053315137238368787607412459874094164027214953984/746741569878639983491390741637813989978804202898438708743258000150996080386381281307609038830698579358879333079215327202911977568726258527646560497079622703052765164031089590965199628534477381843079892123440214378949632707668935001371616475282883095939750704292616758568964786737752325652839226013335092148777788733453702438432279149298482004122593243860829060557386699231448957232420125","499543951252504651717279461487337168721376180441322735807713499521878076780205427598086756686061009718016175215146305489885835839673419698751530207404115002383180054704927695269921072232395828258826213554806570423602966743337801741633869267620843626804016742412046844770601322513184123515405692795346790813502805238635003099976693786012816/106032986203682550514602969462803214831559442358811656484036951559991322084935692953211120289352600484987931812632505499612220494311324679562152078883141464406938524087376964935494245010636163705698220308243980789514815579319533341929989455211613890905485981353837321342730307819060825125980500975023479813757024395422041501208805339176375","8540849722242122835873311629952985285477986765819584558233324868363310302206006773828897816547299245727087876984857726652932481899766510637403577175623031467933486823994040576431755172220921921877192006685053572215922347418846423419683723609799729359551828522978186208983138345476801247634773975311405913274552616037005854836040162212761099347518242200807692224460514057530656658616850816/1809694575992816440924165741094996511361288430727981159314194000585536832192004274726651828760263522962868944612215633976203596150606503849595633388319338251977160257979846235995654357082321611719654136058257458753105122024859078420173515189641515736029725847315662215778251370398007468665986604529263071981040014321717598469319370651877296085250322599247141397427185438573360443115234375","51377057693118720457387330519321684810411289582445982078756989158447711080414032055843805733348558621949380554029375294451303430269197115810494758213980833379214402452992657502777067850631862453239349835215260705131864911194740832694498014048717871429797341104227759557199716944554347879767916801106279081864127192611546757627038037780244683/10867246748205139797826516105458406878398263495890048637741584969144406206902037615496936724683237700974333817527350121106320991054058406504571347680049945745432432384570515723033245430148177097144850158758462968940525568041926860856763884474605057056550146491001458649244094211354153171337463406192651150028767064600270112838159624568832000","2517199821548153657910904242290029026229621935918771922146425373057248090467388430999870036608278542449661971830076845113363443421757278612394167195431759807908413353743377586893872930828548256216510734912027450642648789925142482023713336937258932978503310551945630359646777080073329099268529064437120002567758664419443374110941824106727218341795100740316967386497091058915066147604481280/531524260324016969370728057738851340792702640911631807178654723224511108065633433027773388768889035083734041289308124943130099580765995149865288328550751289346866467755881013217287175392101334538392596956248952430438673292186779006015549928829953979591250274457658042926539541422697852390294886719770034058916886894408015624288115732154492554105512936468520265305162358665491880968652687","937159485027553069020805864547349554547661693803137696125140510201297417077233061462068930061915381468160677500445535971818609631674361074587732183297775728389124966713749450996643183965795829780345678634356741756033039293590264355732129789110416943789326482663579413229893878422643110852069225671783017610387570935863228248464396615988222968188/197552642195166614912991396771845374656891854357948006221100585931656016640982345159207601253599235265353060942313995345483862152489766993442419668492877390774016299878943454249209917002169480134131612530977452579520564400124908392339263545911443803619972765231094502745980083350567509014991735227390978850048088378721210219321877150756855372125","5119346675109082499980756672052066247676641510661024682574296075659671743397880591881419516307292610449161239233139088348510165442597278965718490070997173182184417648987611422446347235659085092530927312760229499083348217392125906851921500360553758600756698605047197529446594606336369425040236883171542367713951500007600355406492128741649090501989105696576697387613035366083536629358444229248/1077349190930018641197987339365056771667455373500846354778079878558146320193384166982231171317419356136237346389570422332278447217033773023556383420372685049620361481309067017697564760747047839930422553324681218253359586320952896352245366885171583221864112040038531116947187482413031483309534553461613717398523132176948321964066833901215878133594739833910960843185464241840039390204295097875","58469980853327028628854378052548435225264353747414624620847476036979290604604988637469977624105451959796142112200285366199247075503424204044884512269071061176877225315884188402954249683107639777479663275428465242905314418930053869461904934138752031124685541853599407727446896558064252696813370692668496452783003306386669962110734257851955001481/12284458784412533668960387046583440199646081362484321078872891438551639470826582933879934711861551014258493898870867541349962531447724393381011633785884743889445407749238183080941846528000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","632694338036291086868292541736272151517212971647680989553388199374739841494700315711180961760384484042159533979873604395621016272772109619401112452105475906812313548587880899058905419220497456502543971131226430775692744506047039958551641270070996110661036371362526401525207493270590999387476275629412687473362310414634469788979236895300129227082421021999210841384596617452097273320509348159488/132710874087075221626157136110978536488168313127228703025408943153782802265472978945703742152954881438058373686972477195846162708986982742647038014147903817539418442869011995988024638278746664230046452545499722614320284478925059527086663455478374200352375121910000967044366831275681254530914306064535110528723482282501358749001657608122307686482720926189537227492041135055090784059994118192625","2022422468242151190347511883185841333968390991430363660248687284021524206079162212007263606819387821055183192871951076644707111802972354128011904720586729919826758651167984507804867954970064938022106484656560866447290934136610214175516487579122328055482392137619829739560923807880779865442016530712986750711199998190148885726144596663143651240/423528009127070458603837580844559347493775236970253513203186912091140251858605354218715508091394564000304400858761758838182654201653901408046974668599216804223721114331085507752600832390227068985693006017591304916519540245902645712532993889000048992026931475754508248265356181099817467608863068068953756055334213584649136541490530849577363647","150542201776735231618709653388506394887777837646651406023174643241783006776019388336318216053045300417086929061565868663031237502137150880313922488106751241006715449458736723129545400133450376339156062387859536289694727635468338235084533552501618659272047966040838509286942825414463511175531001410923014751124732748099355476332649458471135027773371541572374016038525336728276024676601778299264/31475618522527975728853391146702172347290819252268551219771201846701658848754300838383637247014705706066050673096278897933831272607774110183488615338021656923433335661890414740664480671162459271850877855521869741833030384682549648626038314686632195158507693321505500888988183270276134667071014075017317692121986144742473139078857816578133693776368882596780120407949076129685719314703426278875","162664351499283182546788129866259011542529017155637405328005084357078048074065548349602626724265307733005745244338982661090506394708170105916177679714664432754153795772811389612700051002336719842784098507498286260450939289109123759859710248621544296008356071415713931721102824434964336667980062728653562369697289761913925215639430496443820411811651/33956433298509232632327667206936379248172049619640091186698677954874297837764235300806836350019565970550533206216590639008637925266405524715041372407701947953283803854153876844320283735281209725651036513491246238622967031979233265136280687995181375582844780830517825595245506321879177965868747546127685256867456319112247572348416655367667187712000","27228583713734183629451808889147559240254570554044667607519238865891084165382075658707675405673276615039702916443152954157535195508033284355580742761569101934821088036084480297442018005972653124248838420021440899368869744141698556359295489470499243402799483082406238128875386939389123336303631993557844565927960009744780823166462314116039469622216263221278402673028225214534859076857413557466368/5675134787340359276387085910732530678163604187009567576895331134521132071092293139167824957253050637085885426100206370974479279292804959049999647539684766632278449357893560561608633329561385765035738071726214510832066885156767060324427330401967034889966727638276371320401053302413136551142103678412692111973028587922399670456670380189570979581674699102934733563330382821732200682163238525390625","1340937726818688387636018677960518622106989311577445614347061615417831160296369500704524022869612973331444242000788110133157689786976834913297544087249593601420972111789552905846168933014570399562460789075871112224533723259660967481288525220689577290386781169316008987012566216235876842757183233207943071523447855623001920854571597886491163165150556/279054368814522483241446594911968519760869180429079780837994812436395792594449929617293503975169489945136244602350941695478861584261665582123038340824700224583170270427163469762789603657025958695551448477050958557681299495041994050951692916032501884523150972841782658389836059236040091605838583126400660344344601879969354053137568588338096589095875","8910951660339249479517731530773509037034977353457185453617569046885132434552771722727442649095007828468878374139001808825741829728375370140505088133244952288239619141544661695065318568074863317054989982620944602245967155400712702259180443238473885690297281525960618905625084639870407113029712510345262279507055197024677292523214467306898573956604928730377318210588837126450942086527893437954864000/1851573255256476362977604759655284263358595254392797078730401113550522214182030016660458780180636930591149034499142464357511158868625309442843792189394292787657774627425816694628839987456477799348874853555586931850788645677998004186437300173080088839930384424797706381282430208961565555953254145002318893188197561315855286173276564036402546798318351229978103276843822345004757661005876638005274037","84997663352987536417038496128111159210386455419431137931308301989414462311135708114322046234708053448098538629166672456703651524480738219822858469100454933583774404032968304328859365484249897913676382909050450855222567147661842184538302991526635974158862033287154321908483007506326807469239745851379559259262425675035790574846229470041596801343087041/17634687575122715507915388096857069366146981156897230620371714518707518105157483283253374797127075689236298114335734874553183291806268149747826050838089931351158483980735336772879045027213982661634865556129548356487722537193914986994283729746578044621115589195066212043187229606921062007047940293972381121200723292297716621231320254309060321476608000","1648849257486312935416274009474520589799750757877252390543329851029437452988499485179026845292068377957697884739052491455807688429630524210823560524122596610276957537756142278585091315141096146341773982302888007751632401090642472506538817998043326415693840862261701364114923327286462650797963969289743571514890723145251583881752876340628073395708716735192690808352188867334842743895738955762067968/341580411902962140529547622267381834425264893226447658723654120920549166416114849731588552578626041597847002946105459812230979900480135423787717825697955152193526724029890829615845314765605770060975538542976523177976182401820926854406945392167140347444433885786340415437006775075196031433365827874254477351374236932624514469241634422312990555534789607377023339236417434574755566856489013828206625","4899626659231633406569362199187192352933567344960498139854460545644210119722856870634652562532083546344965166340063297647520613455037240144734014575196764021102614748218834054157165781057405100578668000290493431869797883155764963238760612333048336953434663867580862692267574574465371615023999531030446250351305046572267686566999209229202587258144318592/1013522377571209303732207048597964555261512342860326827024786500686692475697570284120359840724596444209277948648863014479460188496587721578075151793081823795161404110811480269106846359964436993190293615381593756076515012514100289406862487971220020752628653845345780766244842386136740768474703009091552043945843632199999007070800871588289737701416015625","362903847358088423032098939589019598036593525722040887883164115981767777873860799955715587436566233010543937498922435963385091400670303956612881974450548904906949032005878241638546734597308786514086678561900713741746905742866635779432216761799371793260025549698865319760786921444505323758235164807966277024031605673481480590193724980659448692487108892154809490199414370023696404259691299614147712/74959603173756091922435708504751461448318819548943586676159545028063979695880930926805574951275602951047845904770828900645717477098988124553474616764040938121171776556999069351772286262529729056288451037717198273521810585868307402693261479298923209587143468206907278220909447483738730657438961435587752873879244136801168836767273934997417156543866722171766794171623224855358640156858606843576125","8521348154958613550574095745596657249924328336262127244827955886474742319277424381360677655239017583606851483318951440691757875270001283229585075137091617073509041644097526047127618954293881264113694362598157456878784814696577083997902588926421675843291157049153701100218784481406086810264243143337016042301806376864424632290226377881206765051896745/1757584673254145109614914862134217345456065873908262753169404848658913774363650863904627183104777337461445063704655164325930891269843669860409763569362863600932267319335889540453302785099532688264425988677082044905948179153286276609910158854349711054144968131934713419772852663860893241364433872853338630216232313607969790083448433666334742108176384","1802461420562646993856730082999823508145602238125054717836501201545920604020389361370931345491160549787411668288359013059160331370751496329806488246135100776263777863399096485894306306621852596694700845918608199329091852956315870664531614358379176680326508877329862713333336188556181470928613423972314983964578645688876556351433429494008513812136152576866650152623510296911708111085518974142728903424/371238439252064016214448115231139360835481920731625321084601566992497057371416121407293286027832357816257507287295719261141426130159269433199862002841433235955835172774430690352481806933860390015899973299268361513643524088242973968537595085600335021120523852420135081643310663869327371821064862449426404044951571585406092523478861879148545678639697679215289523234342337347529225543852787599016265125","88795280670112240977945082069219541902481768504536167808816453021962616596410396813316064685579412429940019071114917828928080181638058444302439626425155946562362550070187433083541414569447612195370911498321149367969974762244140788494955146280201020345849385865084095189982291190135293114489407801749533448443222584092575861096946605418438181411489276/18262596223069549313969288693970246663726147886364354584825624311486557881239003216971630599389642752648815377795018130449384513824927138566203714891090017787258920529990523519479383032564209629983810866231367438270859421572641494420831435563580050954867101292568399107965982704216434467243223964964535464624988344342084084237484262612100980519602625","752911409358158070688133336918078236438086521781731735123294741731669530734909563155732092406099003582749182967246236657021875488130304108082404134004381196925042617909108654109138702993903561036987511410396567636331465803949049946947888490287210013788802287247422993384874670368649616782837096233384279817294778916419067404863458318451722971117669642134894906235066332205740872938406767767019265664/154635332883086377656813458754577288834216641577439356891585125701020579768315520324293435008561626926046988056302745604248220408154454267643222328696606367409715369481567213640103076112146615938180089303294709009813772509602954514391675152597458428326644988225555987883250642389550531163153338541870029415077982539614784206119074702022117790679351778993541426110436276530890609137713909149169921875","15286089077439918584953144558775765002061832952090847117286473868694909713791678395221438112006475047633028543501632631679316850512797978594476229228325228403849089079675681042224057234415951253954044235099139983386056610384489202589484570852048157272551098909455253037561994944665563291526597323199530997923272894119350512727802414680772513760081360291/3135161418037836259442831302977219750614726139657718770206960776514822107155928800694375522572523712277389679035632531727155957120566617736817225541673148354829212969778664144907503411589126111888917929495106029890532891919001138770210977012708107496187227751496980000137223047079127096028939624830654227758737339725345681745847598157538483308068864000","17723482381737693269787076798246423310802126092500438681864673375704464394105734049099094818738115345706100191580982712146882034618103161268453808819471603805345990162762722549964406042295355916458624836894291267553138041035528315839108252422478610879301656207772491548742981990469454529537049123948604931661837539943536878260665617524824604291547373872716194154198824107266275716083848262625068958720/3630091565725887087605600771358216927099748013831912080380983545872077197366172619225751217619097657405660172801849926220948413919823038425519006413005998509677472226729295278652284861834178791332630676772284971762683579047508016687969040658592436230062049051143001484384767836353233324570686249824980508520186643477313941054900197268584495128610811273834192099099592687485176400539748616360799518357","39160514032490258389003214587901781721548011632821053230881239001436341012396166857515197251499460842954863342641015306304854226194551189224721257664420778416733889030680295206179109679627522113592373938602737416822981698362363553492610842201005420727750505681358595340127099855823746410663750133019743170700888375554918213182862789028531284364877435896/8009919337434786244380818390213546866794958389603666737562053423775386173149395943310276429895991903753441584557917565343673605019989336264748588735390182130334278887642569515202100870042209261561001627386525182096090194076839370589780431326097965428311786635366819094633651297179987340498215947144870164066409654464551017761658775207392803825996394875","18188388167811476762477659006849121912679763597132233588170406666718758511478154418948855160838212151370453213943784067796172102916618102024199200086478021533171984254799008541948973652219533819511807681148179806051835318645591102296256347927018942348574774821478499092054497390790734798143983945096982240517058861467440217558586822663985584775920517755909444876443211404222400335500608733284461685888/3715278241795087610941547133490827711133909145414878217965273061493740719983191775105550559905283733134189195190321643965858771461560130864714477448011225816210219450040558581571206711791272284197614810026220745160693898421068168630870850392739817340370146186703867097982858560347971281142766235850971837330222970900661653800041795020382847588362774677568059355238174402415384788280852059532958121625","46353430636874284402376008361176880938798775506236714098123916668545331718677407145199311191108199195405139575147933283523305343027297808443653460575141799729554209181454676876263582758919969948546918471128299522715691694855904535448703118221685887195383025133924852224568922999317583667985459047407473419196367812949579858081181660610155317911318937349/9455890179897829052705408931064120820559254220394152447502395298827357144081378513080398823188243663943177539817982481713456798757563952162598464929784370305696420245648035222083207596797327498500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","13607414211126412689435920170832779523235279308039712294681570127241403406455725064605210473923965685858012114332021572088551127762628892611459785625407107300355287623761046438724706918300976102581928643740596336865698485838431972050267114940079353996100620311097561405192365496385584164725035842307146351211183443267583872067352881387294766804298681841402861626441205037637282007810811602289501477350144/2772205947240095684743358245950494400934136973845543049938212403703005150954425087866758842625041409060217562878157900197951382737615822655863548356735553650755342108183641353142157728364469706919993519071329069805875834057743793434164720370026073143626055293058601124362130539040404491770346043977106988100969901297669523170508321703496903672333781306743488573086901583022550356345156457496396749797875","23264350093315690507131500726914401771633259602904894387312742275462601574788485574913195967854009886824436237740789910851843045306673524324611130536719802717912615609109285261163220007241492964833933975789257681755002054890453747803418465119567389315754801791950553304034666399677630030683759466627797123971742061866928213780452325847848901682792886840980/4733430508316851445525799359992627142007028326865116523033957869609125212251136452396410236930025876982265915963089597825393317909648054808274488356887197933393799241941120691826916741647173843634076299630884655997401370400734954098249519111198509015387869462198674657171808841005212058822254513429836457539629035675822719720295352508916898476137111981397","538960934807826161927564251064896730663918579817797131801326848839524373936888402762331254883505157846659830555799909822861853145306547699817986010353774500545305596630924815657016569444824389893996399550343022444937690798126189162954188680257730893424775303801562327757655350002001080811866451425665301674688928515041429654624970707803336800125648742168380676815769457467038849213225206824671025803392/109517448833211208909213522579666376007937648875042608355810687327424621469323788799169718267715808580775296460944943658428295481347915131091297305260674731651980547668762317138753250458639043477453950774629862540017034566407286963562574188172753764978963685535201028286359818524519980885827473904574840285411260037264057197155527809916623487144493019982419606308144576939532055057697567269576800542875","24451481554350251656598350124163983489544445991992661049829014268366250968046589127810466483349378560701491445658725080497078590986743512397927747885285095846398852574219367580068049729894667374214861939897557930527646930793431512683750733092448862551580494245486308114129295467976874843852138144539250235632985676953662288536669286915983261820949386845806781/4962240683851186225340479316959605207278948397833849899236383273145853045488131674290332609876751222112917095096150531825255611911377071887145019702433883343849119017643117746273523770961304609989779231048095665388209125939879595509516490230961558353074751312876252070889983946768175488341370453053495319823381943793679003096504200440997908071027962806272000","166591964685609920525429719961758335887941461052357297159523350448241484106515158310298216150030768812873781356326923214637847449893575074813991141092681107583183275003570804134461187213143832123628701876041315736048451374824101256980832991214945762266748755723551899001458245164317581617731332466039757786839492869211248064662857987111284518155462148044812626055842061283907063784492325693994911811072/33765943466859756347231737285768516240749714264564410814839966011490233598006227246396923594069488496368994857718734549787000213944990695920130591750377483911116845697231074543526982580529937081378303555262933800375576494067959129682770065443667091668104132884375840812635624862495548888467575848428463895756394050252457592540570490061561616914443009224917652440212112452400106121785938739776611328125","142464729519206642943985715465196065680101634264787375740459792619754842396453535646509170066091478069799080172299369994438836484938378991283020978342879057271045033903518255546705211647900945143546293360496661466657600494787228476009216508124736254967761901224547269496682078470378676865981855568197705507111970901389105723589666709580851611656838285777566736/28839643075889294346635430272525349651555039807615358795334663734940126053968249608601725991946342449660829847322517564370606746964714098508298705743689729306507554363954348780144675937510900983622836770223945538844314468550644543502501484521561567788992156632892028591678742014134130878101553633195551605796158103033794695984958987367799607407626319024034625","380457154857422076784416625436182734840012277442496600178664323821064977485271288502806124740204295811759917468598315932331219906040253463960961995849761235911145436552991677050565022181516596464968316292789048809559129516930574340710998611088996508613850407294743457197519091160170604426002924022923388338999324182261954685794522778833029950214443271526469607532589775916381786492089432407550224137344640/76922142291839859196033215395526448408989799722090330866256930898223012427332209054699494033511478050536463051459450844520020426942553107946282832072826069342120835351421637970462054707566481086202287686453371483126873188020538661871147778312986131920021929455276187425940666580158173676284545586944833678819622895550345083175685846944633982680908505900099388037050135210936852210263717185637166725605577","79999800708369666670693340813609265988600461251844239982904928629083975986385235816587497657678297663151298709076884516168798694292862559083730259839524968813932151813233366175091317046758260934357096757322369138747731224414176608247605314668045838769433811781490030635374856042786947109101585097035794969502111354126773165391577217071956928171336060247633607/16154850265413610119312596299635391433380319311682208755390341659152160578366244774029302281068833963848811596545791104919556346810193385001196395489740571188884873246131813864782581356887110499639544662322008824704830818136660544673293865921754569356583698951612797219776290835161780326945625621758204931298948625885081325268123344406261740843197232316416000","26517014004241498798848003208133111307300592620947908933072661812816683085261359696887064436611747292468717739609776825664344064024535028242737616786238200200498291226984541942836459188328346609549239724653950302145388877472274074665166631509490297630344351573245265440164082334092997307729007429218385933622623935704482371360985836659823269511115937443161532987660855490906546130131716829909388620539153152/5348257529530073524280989257577050878033239486885664777340947102417077875628238501791711336803418503616042922880218860266611595594400020206192599559925169589023339295256084579966533260861249529670141854632965231468533448709363477120437277477668173149958267956654411822360053335695956270719680086524322530514249891157439878407417971839744392044064720476417844056346174795601710447583861127956455406902139625","71197348290771978405602732839537012310626009318133570890482364371056186523989330157966045289127980687764218363064941391483781008265266963537623770685390148810455244349859354857421474277963009857011653865476081389968122418691934354122230780300833008753686234433642072919923583176333668289998661499146617277981691372057042930131717336250309680764289256080895092/14342680993892886303954853579883363225921109635079605392320944523109187641283117181461662846411912306480691901515655220490850586434947504504317080144378185989596578890875561336496479576651516902048606328604696610314441229321219627021610788398730173161473456954861916116391687748151443335513249810808309201830214153565966339609616397865465842187404632568359375","342401018754023891059352629509715357053454506037284788725127073168445189422181540408896452651232759821766616850264122591225331120588918865882061344322996688880669665450231982002597398732201789017495427566260651180470635467002453249479483900268320570004293679361696197905823690145326531180324429318916092471863347575533714871355651558610515931373080997536792242278529575700808878786732127630024064418468916608/68894647682461956089382461406499759613691148650738957016015844830333168307020284281532026442272618372290646283794122772122665531108484704223311663270836645399554940741928358317884620420886609705267248656765357348477857852684140561714900614303731786621656041881975328169543884661780531057279582784036689401206706069028229798913082362331334839997133771880514515972024899408556517159759907883793675672065360125","190286571838805495686895463752492174798162827967490343625540320679760700551286395956241059969689020885714190883323266375067607282890063444652926151862650426323339187596278760962390404656342309737428214493422028545912504503974763216230927196187743439226243880933947417760147785405444976177822143722569696182520826218120595298059020305548681823408268556482981325/38242608291912408815838081993045123864617058390583394828737640036167893859507494091864963383596867701436244007905770284939991912884465101575490548813894148831966132970730263562113961685364216989999844961688441914455435934703797359360780356482629495214859917249465567846934284121032247250332634283689409883499295469118485912489058982596725212975311140618764288","15345379701153714436938289567639102307887273898834051456693981514956329731572600026866162286097662958712922836383881840211072389867463987895894067288699955858337488812343674818565432780224654423872618380928462939482247900055572079914753652915184313685270722583926261499687728814560680092231526501970431280783177357735398580700300402036873780385926225005561766822479878280891130232036389707452005183370152749056/3080426623087819678602049171756961824196425548529619576972793653585089380165862889092832375934535464160425580449193072125955685099151500755278763306599307218302635233595329082702148677300945556130106197481236122437978375963261172524503625593066102601042060541617791008722569799735202779005407381267021641545644264334109052258081225159748043792288699674153722046659880085850980843460715080965607434114275256125","36443601662144279337033484452272105547257065463167427418525882851507989449375452076227652634440476502702584889057376829320548464677623038648843251719168810701744338735202853412651160681259533015293997501525430222870696235141468274274064390273214484922080219643095978640300874086585386991338440415203863901714217818222666715642467237183267303214471854472286478344/7307237990148312451155090506264642657872224684879860008436735430879314349554023096366846856470375025555139219961666754780864835035902856314981482268319886395881809659368275720375576152008289949085453326722156553603358879420820012964006978808113307340321824660484441618487292138631579616351777191144073820686595597986548374588839763719082323114663844043046087375","1575294930860663922843149113097927168024893739962464327016763741314068438447271326302129681931564068796631337571133444163024224071270063174829664848259482066723104251718808936762938249028582992557822551950212098797718627418782376027133576209718376784834456568694813577764300716139817031545408608110880973380162736536313173329973171844528083756524804574267826691156368696436273087171467254161930265910972517504/315498546654512047637461608750018349421492986465373840347519942494904200733840189483934245529561231604050629653992944140351106887747105945984325466452136415067807666316202346895657914393512001212656936450425268507235863153258769360296536050028695266363553141327896064944506216017933135251875087069031098099192325817395958019524956320840925176589616439477134480262100237057953933117460110224783420562744140625","7692057599553133417225997786980128299372439542315125030077404519679450372805989755158000864378924877036225189784045171045139667691524763609840822628706422918926410377185494048355128046783294954373197082851501927410350313585640237550107070936498164597231431242858771457898152684298047446530220873884022213114819556822050178579707210264243087257050468000092842761/1538814487241112760739561704846381585063002784795057066438330325566843108114787083741788078680861495340026117682606689156065008672344707615420501964123121620401073675430690541617930520947170306763541251152854304975131871537939618684186766168376514664494488691311397307418298556185724993104760692216619178358268934740746932420562664234738576394742559349407744000","15190836470550557926140012263310230378455340797095100474720776113765300081463960235506950799869073894127884189857505951314428810423734978025409205413789025720642609035117121385453856877706229778165533034683130064865256448444765902482146676668197546098809055341050873494446231793312407516463576380102073171090898973046611572020564659042146465345334273595086941562425006763960197801018796906114925005810069684480/3035556598829526968124942916297025416522606357010637652635799096498208643970273828496655227572100159414352020909846298817521082538898702393916708804775798552206401718323929157863173504795127180177622667376867235806208021329981136637175570409791442328468473111768140746895005561471574356889047981458002257872092408771959478275534098789982899056118498417649167444480913552548249005268380838457505944462494874581","2923754549090941424546974281011770689534961442264350984393235983189168024079617848190236639328676436485460311093391982825027512234467853098757486086492333410753919927528867817406389678461354257841007722472106464785557179844602277350411593959136520732862935740433163383885526249897183805981219416420390137516812715245569037561966929572448247077578419534651990827044/583599691615378545100950777601104007812792435102945248411439102112424251478512952087517463400054567832353967731887062349496616445419782499817548928078665212077449420216892583997505908858360011413290038645573504472422610780073975450391707084016931661068694024023083417126286468909117254531307085545768412513447197205482285022417611018126886491416133665625891075125","441922815213568908489589193556560586318864326425397702047965372289295962228254658331201274291697626694859414786292266008476137667843874780506886929181835469302142365772763129838217316953835831059616268288399119642314758261677639945004547833810080700127847214666763863338091523753898362699222880772298183760217731228628442782431573977490761665091005756534420789258276075174436091798475838370152192077494553263232/88113527373573049332749294663402406454524640221866407165839162576979477138694653404281889227416977618913249275712917582743426231744980461918772793673202077716234026090308791893409200158969108910565467273725064769890443408324386897017825489615600787634985397885230455168591240328585041836771921929567914891379235573982442311269392541694564675053636078990836491104116280492254795616055818375774141667319774630875","91197133767962483852278456285591810579974783077874307589555559715577599604626819245000672929518645004771085106770784762994476973842713035791487204122653245797126906189270204029735872508462106527240320932458036231707311992868347221176460407003487373754014365881209649632547685657666691589606571865740595829983849941049450471212387808617247938941417000965198123059467/18163679611214677813643455199979098261849405189805364986036911945012016248297645596270602508015864371788974684317239728239847888960155365342460843559658233069613218442910226128113196984801126248862273503232000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","733396724434554481470656964167233690851279923085197144879644750437402627936723531635898542414136943003236478432848965516925891956615111678444586384493883113385335463639674699443808084827715994137410743992130712903997815471369201406683862985677774155704267039224546352414417632475628136460919900347977754644214725932476856018335195927604771408949980634142255497812566866795799230501026066145434755838336990365184/145912495644159810313026420025053989609942265686388630266226856650796088768164358961644113076809511566125145395699271530802891523741636707532676065833327082092521989958971154798465784847092870457944857590623097781956884297103961713362268264159015928554707158239398721416218953003215109202771651993622244788505649098445109438104466256408060944298437033058380804126574878377874459371251056800895394904459469832875","167606423853658713615749101123336326908381619586838606922565378505211386185130407423587264776519589295420758009764678759213587906216543160801059029133457062067529468464636376639307690657945597847080706144898920305379653754920571797771178341550808041652360635584401789901525709166172283390177673009483341826911179861584213314395893323035527116283758445038413646757280/33310364848744488727470761889861069993071965180756187311178124887286133554324042422503263994717993129539448310743598138364172889305532401505890384806078790034557049074169245078416704866867380089103064821732673967120808611636618526737138435792818828990403374766228037003927569643972203993263329403469747342204808360947840103843317533210523853631711601450617095736473","22466735478643771803624909352181817912387732117378538284107485621001246177152644141853604633676939694208131243081227668237716194316732125445041260568403752325416203858329469477774720998849334961751541191761521224644520742691981372782009394826739249604257098248751626957528543558542443122470657230835176462612530464044652140581367666271771882198747182114685116336512604038833327707163107207664705120728068987996560512/4460342260599110071819142535903990817893424192972341872394014748315090430999224107274777695306032783105944721337053156074851240201179902835353097683269298594190456286888326067932777720561181760369783486872666974623910515795208353605697065447942804414120030678603538761538385793829787734830129764152263691296719726909633580318897787729004972323599773548689272008712427926734258913271101899780538635213826239542884125","1972862002066252798837977155272535342727415329632252213508267781390870646909686724955861608046325765650407340102472833428905279473185818898693854344138403744757857928883601637909604082588338869612221777263582365745419719805587946558326048087138197694016224613118304623864709183681172362693106460535117459192992832969130895829916210933710820035479169562970982784580861/391262854245936198649509275719624152305206807261382621390946060636032376057385723427601113233050260359684153963520782285097664628279596618521963444574543409076428660874564026651742234728997339844161514273669735686516761239076529088145208958938384732800586298943281728435207452253170935715239392534815683367114290676180839217919539381651841151674859715992309727232000","25408691426286653276004556426513401767718328640048945917745783225459709487487356095164164652218100925888847689099153320777389381851598236046402124684511968385325107497047025485302333503075085562533472482645023963717347867696861885363417595298751490212495932766872748125111115039311507374363000062513977436921772096443948159289707996749061007112458126301618769295162649600673247799961118662602756889448152517364992/5033870770817104909025512331238419776407331281944565644457345507262881100618908405924951559853352841154730802006750688581603270849880756026262217651685813584900300357685874044482329601894134443542753690048962260914642678445058891387041919581376195543193199307524572671344323361282633828144708683536721118910549933336800461248338059209853766305058943888965279863852107507075916981165164543199352920055389404296875","616565940481577765011174617619124841631603944267256178093555235591208387588894068005162766513720546626399308168923904625210748051788652328072241494243040185611373035059619136712559505023703153194815611268503291295059648269772663939137446253437248541496631852986499688052678961495116210133458596866684413931188348798244969797973846568160999564540652111599082181871436/122025682149627484528651507368051367620578469392233875493556828623437869650284356703295836998178256875766319508797903923638967073687991229708051285605187358616531926112736402511567721889845693991963610192161413692928378708223712791930113386840109729368772998347036090902364801014045328348830748307179590755723160142468563977011700764517880467116766150322736003147125","979882056834583241477188686550561625289337025747787132773853690143359657519481397575561812727394470125172272246774578404543257210124412718725081536309818383310896102958167337333430555168671327992395916735022711297435263157670501117734412587691271084981140167017421900852550822579410636184333142944411060788723653596377015359036101170054828623669169047118551010102258802465554033173968468183492058271365801755986560/193732066620504775981759812703028757608600125742477178751189607602983198559778039141192492589734277739017909889924488699372940787977794555519474807920198944109549023547259912324279741006975129518191081373554817584214941629021088206977532599055014150433581544599721903881284581257812850697423350805715586436114842183295730680490110793225514602133304729484547181740290534056445482186430729398701311563285494964645419","1138059441890428903336718712159907364975959482163004276901676063186939296217569849990951930955270849692775077813359573394435924934540269310629731801376134549169322946310756738187834128956671195358413024062230774111935109203207768898525882417078119314003162592087920755572050993355843681931139257303484526223461840939880759908449181135029327442039666513325916729112853/224777393704985303260433439401503507705148576727364388720387174977154204629336985298082893443205223017966145098064861566754244624732671470935725326043491911142467178027013112527668183783450932992534517827863293825061296257420183669383719043873666284378647952385401303733274771042385666436214517205678674213118374889121542369996042313879258622144464565403138392064000","614262617634904509410555695398092190166323289787703954329113412647342230855826568873946233136303566178604275296873234926652080462259552775254755109931312516616838091852915397846984381183732773411263828600108443070778861986849272794442105107285234729077818614332155890946804257724112143631642663084660012362691100872465148864413343598067567142977134846266425075195546265101720326272502009234689388355365794889444257557504/121200854655310345878069155190734381476914416893031941761756379148622591310152793328910334357724762079139509813381997287954319983165971628429295803162563856219211627796200599196263868781937234015821367575512548522790158101892507996780675863234181700253545912643548466256938936835469646114659598727592390628209362096738343417775009361678599075671154405137663077798419897932404104579113056038271753988669813988076515476125","106893445531995430131837569895703697604978445859412739331042151546083234373443601923983714252801103551874986033841637079479794895452077803182698291822629713500021995241940133037200268381793282318691568234728329378829301282121562652452936297422136961147432559766896143081059518238234777055931999714973999553456547746825617168005650221542417216291412324174772893635832/21070287546583154895102927029203125577385528350171457634203261197137238923923245382493868134869009844094435068284335909266152042903157700510534904847257436666980671067329084409346149729385625108233234542133838924281113454526471855573271066865534480974484196644173270141056470857666632902827625475719738076524047736123182255306429677688129231682978570461273193359375","1112742798776748551928744983308584493817112400536084744850969025063360679785378789764875076529575583792571198510306186417773101346425704969671256564494135750783642910394213727189639661184379341961737135764570942961692159177189753139209638929302928699705042832922774012622017270172331722295881412111812933593370743210214549038212395941675257558442878012136484052827439007483777859391215222647499741572327725689840850048/219121905514652575155579185322367175400669386131891843382447432851122462422992147756333729893028362013318264155489537138133372703295804002840920402482110260590055749843170064921843460498824128274420925357547023876488939786863662801268798987685503391058250902634999352652063668663245829496836853509616873246554292796823779397317819134891873583857621623143253788854530146303641400986028503534408870194989478421253057625","983995170259637497940121707857673268620603982844439610076334749792119502557380361624096960070148627663305171311646851566811683351232268240169848810658089698606409195744471343416197434926513684882439596141368794175162315633192028977211909698595778839497844847281262559899914504080092844816319298286511436690429175757804604673752838786852277255064434365401871903307643705/193579499709739777577893639665643417521924510242119561765932078835121983190401762561436208758210519231103767232899529457440602166918701550386152070813526760823513884391055054076485295945972185402977095815609448651316824455250005505410192101148149284756928250258632031981439345164037318129987999546683113483700660879431801728391911161900686707231543216283304182063038464","30691013076836380319652884848585431917439358375118437035944950498156836885409110087616602043242747413728866747975631727566613593257623099549583001362246649928075859944695060947434885707102684568632559339383409378997568182445019183928058902445738702610436187907199482604867148445903921474846103586253320950728989228898324829144701782792767763794895137313050381112872972806712570559942583906619373159053654481250809168128/6031936190594376585238407905469035598668211679521553144958053099463931217856780171872253258738635531385711702176347575597387389685526098889278278029314982721284691198967204664771178761416891317672705719303088746953644978471289001577698554025410820041497108311270431130911021653860874238212040640737171103823631718483572464361276703378587106311153455557896527384426327053165214814954154328483257657424873929502112904625","33633002641218571027682690377239300567277297301791434890431645909447040830457253186262970747405514897340315490970846553666201190386457221846694126637998462873786334837901001833771510353365825087187582807843940479192544772559118293851131234910638705258664901225494129023244916125545283621607920983287799648992632814461828998517949449887522866259724675318233522060729654796/6603800575190864815125307817934327053530311915572323544225173935830559756077637251538096164499112411672913910767032482188570876526606118068929913515497400397562722669603861813453418621246538114872330536044519242663538662076583511078523573320035084744399535581216815034837553165853576616422592790103728141443697362408727056813977234078214386771115586436985105038873998875","9090550743395453237608373761422705922989356346696677314277463900103283296889488490217663400349361962695279888433677856471792856853109469433355422802663947305503479561493033851081993247556828544308258821557994512133708656174864544457143793106703578476914924328960109390350040954158797845288786321215010324565010420734044059968931558099077932776525974187717655105951506223649947806568984848883258144616897526257038550656/1783219994432430133950472014582130883873515063182143523712063859964133099770763874744121895885645346884371273930727450069430704145915261127061538288702855011220545530326588799412076879985026006593893648911637986337776174555198865379578424838210466703683642106934154603710587408512357351455891557594977191641529451749437270208258072920514602243985184744955476557012910446023911358037761232253615162335336208343505859375","396226087129511787616470716244996965529391571019620342657409150252952330537366537352182763477820160355931003174946109480036915624974500187179367618457008802667089004678925595775249725629495848146669773574395699032785024522882892752987825063933573399691764866816284097232869198405981830106568826923407996367321353003569052419999880089180418759265274331299787468134974811/77651132902382550540201641628906752945078964002822585000619340261128555048628863996784740469908853602590877726845475670110127527874088625214912598995012971630852593597027649154487264595100300180591016581254965295280089902497540043916128232871685159131211213497239568483141031137909208031392464815187505714066235868748950184065923236670418822911614780061752905170944000","1288523130900767412477856952035690867153496584747510253984686336382980221603917538996138294311274357713893956725672062832264871415025750136690143411884111580335458539824573239771267043414225271729141508235839982033182605445173050590151912297720800168687369852280323356691345317649445843078291369394324862039143247087442309135074453265658730028145500871559458519282433012494054724678302957276371418936282902434203225600/252284450515080370603949213084529993395050575951188044032908270470514999880554862449223347761507020354321422785760279154913310488296485989979706208254206974075438570521939826124860483842758137231373182496438568202110337751291106165654945352183167578675508602832478752400011567482434301614269579368882858973850914513870297071866544875650189106576672289734326492492059816669288907018095832842249738081022227281715919357","559506782175368748187145067236900803925823792088293851453005882621173124590368101213652371965740365119375069053747415415684193092607523211636912074219215053809881814859129515591479780669511533619258835199715146655774919418434080807837587396115955105126806762961292429904380132116986984435528307613054828929294602185927322238461491059740342387266084431988727321711184308176/109446188216864405154936682374609448082436347600301765944233278303643744736544109262794383069197271409398615846380701459882784547857821831816863216080069944818453908760476475874319791512782445408136169878207358663250499628002971644430164185578966399908622640732411885568638054229180673755690889471388585521113862492432946110902070139679164884208988489955874131206343597375","365842109776085256207829452385781129402656684569922320812625438296958174120084800064669048017227033185969596458778213306152397766619692644694641677223213185977626940193107608138827771259334379895020377700759789774994800008933137569543592829220611543060189849601828342989023692876182148818363689293009174358168826340010491728715549904988196347316703985894355217235339548078187164176255405596310602921647203428200269666176/71497266937783826306774367225149833789788300609530680399994804704196212252148324552193149332755057982662844988588678159610516634667597707204818296457616315484973288944637139939912166034691155272078609876888919170894915224022982785138928008133003473320018151370486895637936102520353951511525996197267572355782608352075229547764732602557133494648237258900273354364050662921889937355682486287799239363976556848320046933875","59378684894605773397070783936113244261297966863668546282887298999811950599772732377979382620766180662159460666220894896896564357533604962977968843474062092083279165837424210591042655271577974272394203253875965589611493384384257117088518521598379301169916060951350650621757237206805037261878212424267780312614942173870651684587166691539909068452932891649554575072205080763/11593916877920131260484148322810317629326850763057953025674154928920977965095141485536566217873796019006709247938019404840440511433467040918770165456925609124166970862430104329357419669175323763143377917913760028500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","440706629842402075137926797732405268015915199334341565218443748798479563505125605478061664327658137598204192554352688830679475840386882350034150077506804799859586772904929402683276898098601814091430598259347980573084686932949502809068565420937301632494387691284902026088950093888426872222813857928092871267130505744095697172494119689779474840037266295586359244899477781345249657455186847452249040895151288114085352974933708544/85971876318334010542313048056773419567285701852816309711738644074302467763075671531248793080425349570584102078764464196653843973936119037322000695949209283327606280423406302517302874806092835694196353778161663338667091195199032831587897410329509487165187753418615356836636352319310103639079123698118997500068644500893282438137614420288839230827096109835206605385673197123994357393257304049093683934224826006704198171592304125","13220371178312284248107863849287558696210741535280184003301555188086761767176560823174196915070378763091889333203635784037294769747641959860810039816533609140662043493962707445564057197150603226797446933532133956054671103942520142568674339411250001585991743608723150284270101326419464088290151483823061613403673956918458456165552482913079283537536214967294211244361353060/2576683013797055224377707713704899315377379548630511095136568220145808780162671473907260623503552385384482723173913562423316997528913651044277418227616447815609873991028073011738113927961824632868956802271260292075825561646156680740323686126811928372672670917332613490241615850953660246271541592056143611581223295045062157404996958100136358649109693659623847024011265147","1538372578072246705266078247950089219881197139399081643650271348770110178217959856819170325400476655944115553238940541695152110949081675985299189913515975242840473616169775880272489805123124548256666658584129873597192213080038937409046114908719298170078476325423466734429870048697383304265342125425087105698152643145531760853127801123272389134514333752173173161562273487752064850461823726948588221913540799816489566883798912/299566102446745552813544808169323270315327122249327394279467999308669285416179486075255023523726449428151807672528368606071047812907935426406886253284580296349349558797128593446316786243666290649442956134448480598303527795996222703837663605600624271807461605295956674925277658331760000117761013381199880905748188151556184620779667670278558839116983636972680749836497346863752662521197700717702790359162307617024566689271625","281696937222363685333688097915539146272117417024070728031063821781398985795813333650547982965341298894634762289669256129805545549280355643122501181852136332529515756074502902204877664395456278205770206019663082511098956468724829475220996427130295010430751942126263620206886404244432409164651524408198286831329682605959881993845189585640874220032515465014097345759490750307207/54806274927935495596891312029173862473687610099325998583092091915101265393157631244775387832621032230434007486602816972765210205596482942091518459849775458089575743699797096697542306049628939919466378189656065461708686421130956996965004776108499273871055615413566043083634090083096967567965373203683231171594922347812966905149873265654962896456451681332216735396249206784000","228506238533410805238253122961471637501498406104430046727793420497895852412513560203475440156216063574654372726194215013407325207763369075250819386897086702757125418327084312933061738392406321003231853349865003322697360659712771167066453430309997639548320673279964210730701373707765051246595806673865646607841876463608039111252607452843372970797479959213447237540830563469297144446069689149549515457318899981763489792/44418759813188470246596822974281932219088697005123285598909329328419879212164564561558656547678211265529803086702843380128457744445765859393426675396393053094588240457569380155526179040891009717323059641035189017918495485630657360525410506453554255734005459614858972904374739673834145083512160883402151636664208253116362089211658645312778404886460203600762546810897889629330022309705583438699250109493732452392578125","2396110297187570506257836426251930521245117960980667897194680897478996322590925380310917400763581787981992131769075961259393685331523600287377841990678117113566991100720996059187144934569703045966210306282348527729533806882408323961336166190162075154579344185244957673138372347997134388801085788353482276257401005734929059700346687783400772331280644647089520646562669857652648/465370154262863030800729180763091967573522779260407615567563274096037297593764955820626213827962697601334935773802201919483657310282236100250543992334865461800976838791035335861420892967699843608855185710753433852279737724446294443337363478679601049432404435672469098850676302728116369979460222148206944323730586138087862719386327396334468302608499235112520318322763857676375","1188272888075247520453568790651819187486389546755745961952033150576243575862120569399808467067800830890874391487822723879717525264875722720416173276963170672622214121308038530968291758445510982186014289745026439477197148445087614813262170975056866881909056450023324743409114115141145340480846088869807540798073417035168139476153897066325127540609756310068558610112731607522096096821938163134080426356894899245575410494080/230586762395914863625709048789913840511134004337945700368117795195769576856434588144361459740833007125516905017415184787078710001969815416281381427387949263792200577791644278234661952852149216540491852757174842146376788280677956350901082838474705227642420261641783722891948710833898248566893322144435457967452449965772543077421407816225704952270697016152452032506898311260979594550143344971416786595888053149375287120733","1072184299258468249004114536023934869518152618369895613271618698908405514630154819453979477077738526673716264830106745031385951736108376866253955319711026042389282009348594845497252059906901748860111986811345742998968284077119165082435598381810306691078037018432766116865792677955520465319184311529667642995217214507658693259694586107847099911341219913576038605872218680562047/207882129535607118520818565811162643811811563516006836924341123976848022970024793004700710992938987476728640943834012473687892481059618823520721737479364352887178017866425027953255856440099446112508663603319745066750522936408781591578321031173620445865113295407603090322283539974563690157418931060565698315406021569491751612761888641141446406531645379264720684248398299136000","158094023904374464057702010126993231151433474361820266584020400101533651587072432728050776506672527718975042616651177034635188178967462982926261516748842073587981953038445977514446838733557926696939591069712397947055261777416704028506441173540338327591514650398349069348381309688677335132100441905603664282735310299686268721634369502296867409514777359935022301425165750780988231639828675424239931533849896744198012747670272/30626384366513923671063955469537776291182594080083494737341604579575446319190916924682809546024369330706012653799783122328775875399363759308193432327358837772825609356553955350401725689682838701996446404559005896479618311357573203081153855961484398360670837599853294627153740224543175497655414585918231215639906924313779933211774291565425360415684556655021031131349317390382320286092667852173815259422737956767922154798375","12216278924286401897470540169822542417611356797676160128176706721343511598951866107858729405615631246003458062949723290192242594609994613705183460814797527214549142043573863947658832694800184691222426521703728394203722420336773310908687071670107794543022567943478843065246011544888390757810534211554666736239506503613750756246364621509359804902243487113673014588325806249988332/2364584127734680580481708368927921125934330000162935118371174269642831409084634375654239735054363928748162229294829526339927907778510530444646754603322373712788147193691037688552857183116332292048731726305451516954679277320777955342295564000586923227775208580772868590742136150431152495718132142742153643081187691849828217592954519485869135930755646768375299870967864990234375","578939195017447864385837341975558679292903716580114421030538728778491606282153588930983966100514147976321305616196463174070345884292672842497715966933722088536619333912687108737657068701352918582656105418491672377271304970407730786932913490869797471081081431072836814581099271832696990064828717287258860166842791984158634684078346453202928137987930328826212011774670396356151265781053547412633310327737900786639842674288716416/111966291649651600701875186827360807558960817589719096407887999108024557254221008849510152469119211567152616745769256123968832250104006560061907741567034087109512483357851919402017950812795426393415409198268246337542639470834168040295134130657073201020340432236723824670803498949071870597039309004562024033656488150406105175401372709011082725359382691270659245312133919518760328422827067578306005644825927050994860723405473375","8041514821545833865350873212853873042112343327573364523948780030849543753072688526717886590013028227714585965095216381829914996539132359247488639692828639170075726301411777307168737667077730792892326979446426349813642680537699905651125068091362135055902152994216233622733424128982011248923051410141033146604688083721413402395290842738021365861670415833356403364696759583009635/1553937833499559104910551811592138833189892464446761247731330672284191313590708439680460540329836344767557599746234213006493842842879398684745864919973051635127080738612248150108793397855113122368507483429209127035263504194847798809612278864438287815470711036548695032421148125849669175729331459149833945183228413961985381338162155596008680906676498435954178226973272371625984","12059659399309169167301353842123191409306995788633965680414620302285606896146667751472818541537183787935352700725982053536032930866708413010971856856768384974849695774437178790890015242323873769697407411558706626105140596160049735605389301414460825674631122462760014451298494875244754354054447697502521388381253293175367558014453865905104467382184997528879171136492277222127399012368677604910497789360212571238146627048080568400384/2328494054002703067219004484782931471919751585969487160602269605916676223315055450845942763690581877771159615428854802721943114463834992106300185328876910271612375509166975628540839858771078495267566008071532876816826751069408153323840515037497664871689085370699991860738368371510578076683395101062439493831773194498579620513073693022191702398601471237166387045790480861932005012807234071429628725981935147069738988682858417182625","683009426705008850682549700382901603742691705123356866338951397347368059105140826655486518416578697931244347554322654428162554903861783227680935341690740579867651545205562690172425016836559678937794312287639193745517811234257062356826622207475918293015140472942579713388671782202262396642735640315948612572908444501108579457520714632371056288874351015666995549139003946314085696/131769214246522869780429817236150406548549044658474416909806179734873399109656411633488099249198882165279745627038984487365589625562901914030850178330133080409420340227179447548044572594184601425691821617928130423410997853384425373999967759499571890326740433081063424903098252502791477854302204200941376983295622430177445507316706609802292121282957519571162158620971952084486375","1418116259749091420309271913909337143756589314597557128553117870573928055109322864794169592355058370891251425125187770724828108988587888087023982451205475980371440423992838481547236638456717520835668859093413956339261802305597694403381021863258753441889536361061407579332570493634254542013337999844407181346815549594836374497512447969751514466481466717590255369810506813543577735080228718660747940956248427356785784199073569408/273368882980516556922532339653303822104510203916024760371844491705599093435133738774975538364241630079468712981056336655766117378160822393876348755370711942273876284944422610974149712212944211513462921649872232656449940987552227525504529710373144228818606127541937831103642415534318303187393593236209298242574677293352798419428712873685798636474667204083938875672934235816396371477146089168375198141802684403955936431884765625","546411077581845999248238069684194831621691193366466972898628141511422317954477211865167402284211971296286346492698354214043840080181702652132835681239302798339667835439189275457116051279366194551632712819028177402221815140045210690908631767786711675029194359998826252332434573121740830827417293557234891406021102083555472155479148332697839972702631641910213821827820374586459319/105246945889799140338072754365901705544530661781295362563214285953881890233987516230568663143342952799036341701952267011236663118111226623815975847494372076420199418712941018288738590264475520229651370015377608638075866459684692488079223686296541020897904588347083045723167762682959422858996673894180805702299907478685374065593161226849447131100462022089783265346597553176576000","2398330640958841474772606439916070050977544535580605737383995160447105736276950196885906408317628083110923322157113892928963237845914017845444295040924101784423382681801754191301860383927129006953354739240926643562987838836997453985855576402628166875869041032631651591871962852884189548538272285387092843044669499688035134181859376665409767886188304314888753894905317929877238322615838524354191263502347881033855441181420399360/461588070868590122892265681879734295007029130965626060552783760068897000195207878227714842617470320231527222074701444349530952699708435668339712860464533455345665068841333232359698449088497137068713309811942968433868609329301082001752617420002377892756821532220676085014874112083615054550278903960627185675459015343606391094523511117705747842645927349130302549554534056269331809016770715819934970200483161548527932617036185253","6041015879424725383006424536130409209607854044642113747266098198777011981328765528361630516108680392500990580908509403483891763219659726090675140672989657743882183951954294745396417829943469201306594018454995862321821016087416840247422350906412007336103086620396467456181771583200365740253389107968122850063607085957109965406634738740996318415514360956028575560979203447735121436/1161752799109428422288020947061281540989708937450568100764830251908850596717606701047413407636907934320789870175907792017513896999208892282137299070761467096211814586909598705615312819596495636017728313513520193786266452836805291464826226833593878504804389728477191170027729963773716267868284479768397603444919008915279522376004326398403851684761808785381609370767169521034383625","13240077436443988749179508462267267187169441948722358165090554769250505713747934643200804819418670147225695324432684266924694524337920816452346599774452681831320005286326986675907899608537972384924882996757503264622991355949039882526389342174307168805166215838138277557052303430492669193939212362638263582899713198716541723383138016564027766560215944409353427176135895982596327685665844815618402881202645610620284792793420780517248/2544223084468158291883698813309541801455311468982232546872485444308211415529998472787377800559884210837213042932180479090277285630234238711851480232520137856848809986631784843528381778520727465146661792797924458540957133423665746229799675650290296217658444899605236550972043549278128087645211909479009099766619355677984218929672461506691980442071860591767266913041147587815452007726513853820116629482732060593116624596368806566625","1953999166296955830935495158735359200362904181792947794529339487489730042568305997099959302322956898299616194932283060554261566410988618045107398092345476532371402134206635235570281738377188438407703089325315446371127042537576093536896282955524842632708645655481028161471313608974238110718242273935956977555610147714316158486553633871312187084618154014921190595222799283957140353/375191165084882521037046014569185165885459082629136124177286500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"];
                if(CACHE[x]) {
                    return Frac.quick.apply(null, CACHE[x].split('/'));
                }
                x = new Frac(x);
                var n = 80;
                var retval = new Frac(0); 
                var a = x.subtract(new Frac(1));
                var b = x.add(new Frac(1));
                for(var i=0; i<n; i++) {
                    var t = new Frac(2*i+1);
                    var k = Math2.bigpow(a.divide(b), t);
                    var r = t.clone().invert().multiply(k);
                    retval = retval.add(r);
                    
                }
                return retval.multiply(new Frac(2));
            },
            //the factorial function but using the big library instead
            factorial: function(x) {
                if(x < 0)
                    throw new Error('factorial not defined for negative numbers');
                var retval=1;
                for (var i = 2; i <= x; i++) retval = retval * i;
                return retval;
            },
            //double factorial
            dfactorial: function(x) {
                var even = x % 2 === 0;
                // If x = even then n = x/2 else n = (x-1)/2
                var n = even ? x/2 : (x+1)/2; 
                //the return value
                var r = new Frac(1);
                //start the loop
                if(even)
                    for(var i=1; i<=n; i++)
                        r = r.multiply(new Frac(2).multiply(new Frac(i)));
                else
                    for(var i=1; i<=n; i++)
                        r = r.multiply(new Frac(2).multiply(new Frac(i)).subtract(new Frac(1)));
                //done
                return r;
            },
            GCD: function() {
                var args = arrayUnique([].slice.call(arguments)
                        .map(function(x){ return Math.abs(x); })).sort(),
                    a = Math.abs(args.shift()),
                    n = args.length;

                while(n-- > 0) { 
                    var b = Math.abs(args.shift());
                    while(true) {
                        a %= b;
                        if (a === 0) {
                            a = b;
                            break;
                        }
                        b %= a;
                        if (b === 0) break;;
                    }
                }
                return a;
            },
            QGCD: function() {
                var args = [].slice.call(arguments);
                var a = args[0];
                for(var i=1; i<args.length; i++) {
                    var b = args[i];
                    var sign = a.isNegative() && b.isNegative() ? -1 : 1;
                    a = b.gcd(a);
                    if(sign < 0) a.negate();
                }
                return a;
            },
            LCM: function(a, b) {
                return (a * b) / Math2.GCD(a, b); 
            },
            //pow but with the handling of negative numbers
            //http://stackoverflow.com/questions/12810765/calculating-cubic-root-for-negative-number
            pow: function(b, e) { 
                if (b < 0) {
                    if (Math.abs(e) < 1) {
                        //nth root of a negative number is imaginary when n is even
                        if (1 / e % 2 === 0) return NaN;
                        return -Math.pow(Math.abs(b), e);
                    }
                }
                return Math.pow(b, e);
            },
            factor: function(n) {
                var ifactors = Math2.ifactor(n);
                var factors = new Symbol();
                factors.symbols = {};
                factors.group = CB;
                for(var x in ifactors) {
                    var factor = new Symbol(1);
                    factor.group = P; //cheat a little
                    factor.value = x;
                    factor.power = new Symbol(ifactors[x]);
                    factors.symbols[x] = factor;
                }
                factors.updateHash();
                return factors;
            },
            /**
             * Uses trial division
             * @param {Integer} n - the number being factored
             * @param {object} factors -  the factors object
             * @returns {object}
             */
            sfactor: function(n, factors) { 
                factors = factors || {};
                var r = Math.floor(Math.sqrt(n));
                var lcprime = PRIMES[PRIMES.length-1];
                //a one-time cost... Hopefully ... And don't bother for more than a million
                //takes too long
                if(r > lcprime && n < 1e6) generatePrimes(r);
                var l = PRIMES.length;
                for(var i=0; i<l; i++) {
                    var prime = PRIMES[i];
                    //trial division
                    while(n%prime === 0) {
                        n = n/prime;
                        factors[prime] = (factors[prime] || 0)+1;
                    }
                }
                if(n > 1) factors[n] = 1;
                return factors;
            },
            /**
             * Pollard's rho
             * @param {Integer} n
             * @returns {object}
             */
            ifactor: function(n) {  
                n = String(n);
                
                if(n === '0')
                    return {'0': 1};
                n = new bigInt(n); //convert to bigInt for safety
                var sign = n.sign ? -1 : 1;
                n = n.abs();
                var factors = {}; //factor object being returned.
                if(n.lt('65536')) { //less than 2^16 just use trial division
                    factors = Math2.sfactor(n, factors);
                }
                else { 
                    var add = function(e) {
                        if(!e.isPrime()) { 
                            factors = Math2.sfactor(e, factors);
                        }
                        else
                            factors[e] = (factors[e] || 0)+1;
                    };

                    while(!n.abs().equals(1)) {
                        if(n.isPrime()) {
                            add(n);
                            break;
                        }
                        else {
                            var xf = new bigInt(2),
                                cz = new bigInt(2),
                                x = new bigInt(2),
                                factor = new bigInt(1);

                            while(factor.abs().equals(1)) { 
                                for(var i=0; i<=cz && factor <=1; i++) {
                                    x = x.pow(2).add(1).mod(n);
                                    factor = bigInt.gcd(x.minus(xf), n);
                                }

                                cz = cz.times(2);
                                xf = x;
                            }
                            add(factor);
                            //divide out the factor
                            n = n.divide(factor);
                        }
                    }
                }
                
                //put the sign back
                if(sign === -1) {
                    var sm = arrayMin(keys(factors)); ///get the smallest number
                    factors['-'+sm] = factors[sm];
                    delete factors[sm];
                }
                
                return factors;
            },
            //factors a number into rectangular box. If sides are primes that this will be
            //their prime factors. e.g. 21 -> (7)(3), 133 -> (7)(19)
            boxfactor: function(n, max) {
                max = max || 200; //stop after this number of iterations
                var c, r,
                    d = Math.floor((5/12)*n), //the divisor
                    i = 0, //number of iterations
                    safety = false;
                while(true)  {
                    c = Math.floor(n/d);
                    r = n % d;
                    if(r === 0) break; //we're done
                    if(safety) return [n, 1];
                    d = Math.max(r, d-r);
                    i++;
                    safety = i > max;
                }
                return [c, d, i];
            },
            fib: function(n) {
                var sign = Math.sign(n);
                n = Math.abs(n);
                sign = even(n) ? sign : Math.abs(sign);
                var a = 0, b = 1, f = 1;
                for(var i = 2; i <= n; i++) {
                    f = a + b;
                    a = b;
                    b = f;
                }
                return f*sign;
            },
            mod: function(x, y) {
                return x % y;
            },
            /**
             * https://github.com/scijs/integrate-adaptive-simpson
             * @param {Function} f - the function being integrated
             * @param {Number} l - lower bound
             * @param {Number} u - upper bound
             * @param {Number} dx - step width
             * @returns {Number}
             */
            num_integrate: function(f, a, b, tol, maxdepth) {
                // This algorithm adapted from pseudocode in:
                // http://www.math.utk.edu/~ccollins/refs/Handouts/rich.pdf
                function adsimp (f, a, b, fa, fm, fb, V0, tol, maxdepth, depth, state) {
                    if (state.nanEncountered) {
                        return NaN;
                    }
                    var h, f1, f2, sl, sr, s2, m, V1, V2, err;
                    h = b - a;
                    f1 = f(a + h * 0.25);
                    f2 = f(b - h * 0.25);
                    // Simple check for NaN:
                    if (isNaN(f1)) {
                        state.nanEncountered = true;
                        return;
                    }
                    // Simple check for NaN:
                    if (isNaN(f2)) {
                        state.nanEncountered = true;
                        return;
                    }

                    sl = h * (fa + 4 * f1 + fm) / 12;
                    sr = h * (fm + 4 * f2 + fb) / 12;
                    s2 = sl + sr;
                    err = (s2 - V0) / 15;

                    if (depth > maxdepth) {
                        state.maxDepthCount++;
                        return s2 + err;
                    } 
                    else if (Math.abs(err) < tol) {
                        return s2 + err;
                    } 
                    else {
                        m = a + h * 0.5;
                        V1 = adsimp(f, a, m, fa, f1, fm, sl, tol * 0.5, maxdepth, depth + 1, state);
                        if (isNaN(V1)) {
                            state.nanEncountered = true;
                            return NaN;
                        }
                        V2 = adsimp(f, m, b, fm, f2, fb, sr, tol * 0.5, maxdepth, depth + 1, state);

                        if (isNaN(V2)) {
                            state.nanEncountered = true;
                            return NaN;
                        }
                        
                        return V1 + V2;
                    }
                }

                function integrate (f, a, b, tol, maxdepth) {
                    var state = {
                        maxDepthCount: 0,
                        nanEncountered: false
                    };

                    if (tol === undefined) {
                        tol = 1e-9;
                    }
                    if (maxdepth === undefined) {
                        maxdepth = 45;
                    }

                    var fa = f(a);
                    var fm = f(0.5 * (a + b));
                    var fb = f(b);

                    var V0 = (fa + 4 * fm + fb) * (b - a) / 6;

                    var result = adsimp(f, a, b, fa, fm, fb, V0, tol, maxdepth, 1, state);

                    if (state.maxDepthCount > 0) {
                        warn('integrate-adaptive-simpson: Warning: maximum recursion depth (' + maxdepth + ') reached ' + state.maxDepthCount + ' times');
                    }

                    if (state.nanEncountered) {
                        throw new UndefinedError('Function does not converge over interval!');
                    }

                    return result;
                }
                
                return Utils.round(integrate(f, a, b, tol, maxdepth), 12);
            },
            //https://en.wikipedia.org/wiki/Trigonometric_integral
            //CosineIntegral
            Ci: function(x) {
                var n =20,
                    g = 0.5772156649015329, //roughly Euler–Mascheroni
                    sum = 0;
                for(var i=1; i<n; i++) {
                    var n2 = 2*i; //cache 2n
                    sum += (Math.pow(-1, i)*Math.pow(x, n2))/(n2*Math2.factorial(n2));
                }
                return Math.log(x) + g + sum;
            },
            //SineIntegral
            Si: function(x) {
                var n = 20,
                    sum = 0;
                for(var i=0; i<n; i++) {
                    var n2 = 2*i;
                    sum += (Math.pow(-1, i)*Math.pow(x, n2+1))/((n2+1)*Math2.factorial(n2+1));
                }
                return sum;
            },
            //ExponentialIntegral
            Ei: function(x) { 
                if(x.equals(0))
                    return -Infinity;
                var n =30,
                    g = 0.5772156649015328606, //roughly Euler–Mascheroni
                    sum = 0;
                for(var i=1; i<n; i++) {
                    sum += Math.pow(x, i)/(i*Math2.factorial(i));
                }
                return g+Math.abs(Math.log(x))+sum;
            },
            //Hyperbolic Sine Integral
            //http://mathworld.wolfram.com/Shi.html
            Shi: function(x) {
                var n = 30,
                    sum = 0,
                    k, t;
                for(var i=0; i<n; i++) {
                    k = 2*i; 
                    t = k+1;
                    sum += Math.pow(x, t)/(t*t*Math2.factorial(k));
                }
                return sum;
            },
            //the cosine integral function
            Chi: function(x) {
                var dx, g, f;
                dx = 0.001;
                g = 0.5772156649015328606;
                f = function(t) {
                    return (Math.cosh(t)-1)/t;
                };
                return Math.log(x)+g+Math2.num_integrate(f, 0.002, x, dx);
            },
            //the gamma incomplete function
            gamma_incomplete: function(n, x) {
                var t = n-1,
                    sum = 0,
                    x = x || 0;
                for(var i=0; i<t; i++) {
                    sum += Math.pow(x, i)/Math2.factorial(i);
                }
                return Math2.factorial(t)*Math.exp(-x)*sum;
            },
            /*
            * Heaviside step function - Moved from Special.js (originally contributed by Brosnan Yuen)
            * Specification : http://mathworld.wolfram.com/HeavisideStepFunction.html
            * if x > 0 then 1
            * if x == 0 then 1/2
            * if x < 0 then 0
            */
            step: function(x) {
                if(x > 0)
                    return 1;
                if(x < 0)
                    return 0;
                return 0.5;
            },
            /*
            * Rectangle function - Moved from Special.js (originally contributed by Brosnan Yuen)
            * Specification : http://mathworld.wolfram.com/RectangleFunction.html
            * if |x| > 1/2 then 0
            * if |x| == 1/2 then 1/2
            * if |x| < 1/2 then 1
            */
            rect: function(x) {
                var x = Math.abs(x);
                if(x === 0.5)
                    return x;
                if(x > 0.5)
                    return 0;
                return 1;
            },
            /*
            * Sinc function - Moved from Special.js (originally contributed by Brosnan Yuen)
            * Specification : http://mathworld.wolfram.com/SincFunction.html
            * if x == 0 then 1
            * otherwise sin(x)/x
            */
            sinc: function(x) {
                if(x.equals(0))
                    return 1;
                return Math.sin(x)/x;
            },
            /*
            * Triangle function - Moved from Special.js (originally contributed by Brosnan Yuen)
            * Specification : http://mathworld.wolfram.com/TriangleFunction.html
            * if |x| >= 1 then 0
            * if |x| < then 1-|x|
            */
            tri: function(x) {
                x = Math.abs(x);
                if(x >= 1)
                    return 0;
                return 1-x;
            },
            //https://en.wikipedia.org/wiki/Nth_root_algorithm
            nthroot: function(A, n) { 
                //make sure the input is of type Frac
                if(!(A instanceof Frac))
                    A = new Frac(A.toString());
                if(!(n instanceof Frac))
                    n = new Frac(n.toString());
                if(n.equals(1))
                    return A;
                //begin algorithm
                var xk = A.divide(new Frac(2)); //x0
                var e = new Frac(1e-15);
                var dk, dk0, d0;
                var a = n.clone().invert(),
                    b = n.subtract(new Frac(1));
                do {
                    var powb = Math2.bigpow(xk, b);
                    var dk_dec = a.multiply(A.divide(powb).subtract(xk)).toDecimal(25);
                    dk = Frac.create(dk_dec);
                    if(d0)
                        break;
                    
                    xk = xk.add(dk);
                    //check to see if there's no change from the last xk
                    var dk_dec = dk.toDecimal();
                    d0 = dk0 ? dk0 === dk_dec : false;
                    dk0 = dk_dec;
                }
                while(dk.abs().gte(e))

                return xk;
            }
        };
        //link the Math2 object to Settings.FUNCTION_MODULES
        Settings.FUNCTION_MODULES.push(Math2);

        var cacheRoots = function() {
            Settings.CACHE.roots = {};
            var x = 40, 
                y = 40;
            for(var i=2; i<=x; i++) {
                for(var j=2; j<=y; j++) {
                    var nthpow = bigInt(i).pow(j);
                    Settings.CACHE.roots[nthpow+'-'+j] = i;
                }
            }
        };
        cacheRoots();
        //polyfills
        //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/
        Math.sign = Math.sign || function(x) { 
            x = +x; // convert to a number
            if (x === 0 || isNaN(x)) {
                return x;
            }
            return x > 0 ? 1 : -1;
        };
        
        Math.cosh = Math.cosh || function(x) {
            var y = Math.exp(x);
            return (y + 1 / y) / 2;
        };
        
        Math.sech = Math.sech || function(x) {
            return 1/Math.cosh(x);
        };
        
        Math.csch = Math.csch || function(x) {
            return 1/Math.sinh(x);
        };
        
        Math.coth = Math.coth || function(x) {
            return 1/Math.tanh(x);
        };
        
        Math.sinh = Math.sinh || function(x) {
            var y = Math.exp(x);
            return (y - 1 / y) / 2;
        };
        
        Math.tanh = Math.tanh || function(x) {
            if (x === Infinity) {
                return 1;
            } else if (x === -Infinity) {
                return -1;    
            } else {
                var y = Math.exp(2 * x);
                return (y - 1) / (y + 1);
            }
        };
        
        Math.asinh = Math.asinh || function(x) {
            if (x === -Infinity) {
              return x;
            } else {
              return Math.log(x + Math.sqrt(x * x + 1));
            }
        };
        
        Math.acosh = Math.acosh || function(x) {
            return Math.log(x + Math.sqrt(x * x - 1));
        };
        
        Math.atanh = Math.atanh || function(x) {
            return Math.log((1+x)/(1-x)) / 2;
        };
        
        Math.log10 = Math.log10 || function(x) {
            return Math.log(x) * Math.LOG10E;
        };
        
        Math.trunc = Math.trunc || function(x) {
        if (isNaN(x)) {
            return NaN;
        }
        if (x > 0) {
            return Math.floor(x);
        }
        return Math.ceil(x);
      };

        reserveNames(Math2); //reserve the names in Math2
        
    /* GLOBAL FUNCTIONS */
    /**
     * This method will return a hash or a text representation of a Symbol, Matrix, or Vector. 
     * If all else fails it *assumes* the object has a toString method and will call that.
     * 
     * @param {Object} obj
     * @param {String} option get is as a hash 
     * @returns {String}
     */
    function text(obj, option, useGroup) { 
        var asHash = option === 'hash',
            //whether to wrap numbers in brackets
            wrapCondition = undefined,
            opt = asHash ? undefined : option;
        
        function toString(obj) {
            switch(option)
            {
                case 'decimals':
                case 'decimal':
                    wrapCondition = wrapCondition || function(str) { return false; };
                    return obj.valueOf();
                case 'recurring':
                    wrapCondition = wrapCondition || function(str) { return str.indexOf("'") !== -1; };
                    
                    var str = obj.toString();
                    //verify that the string is actually a fraction
                    var frac = /^-?\d+(?:\/\d+)?$/.exec(str);
                    if(frac.length == 0) return str;
                    
                    //split the fraction into the numerator and denominator
                    var parts = frac[0].split('/');
                    var negative = false;
                    var m = Number(parts[0]);
                    if(m < 0) { m = -m; negative = true; }
                    var n = Number(parts[1]);
                    if(!n) n = 1;

                    //https://softwareengineering.stackexchange.com/questions/192070/what-is-a-efficient-way-to-find-repeating-decimal#comment743574_192081
                    var quotient = Math.floor(m / n), c = 10 * (m - quotient * n);
                    quotient = quotient.toString() + ".";
                    while(c && c < n) {
                        c *= 10;
                        quotient += "0";
                    }
                    var digits = "", passed = [], i = 0;
                    while(true) {
                        if(typeof passed[c] !== 'undefined') {
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
                    wrapCondition = wrapCondition || function(str) { return str.indexOf('/') !== -1; };
                
                    var str = obj.toString();
                    //verify that the string is actually a fraction
                    var frac = /^-?\d+(?:\/\d+)?$/.exec(str);
                    if(frac.length == 0) return str;
                    
                    //split the fraction into the numerator and denominator
                    var parts = frac[0].split('/');
                    var numer = new bigInt(parts[0]);
                    var denom = new bigInt(parts[1]);
                    if(denom.equals(0)) denom = new bigInt(1);
                    
                    //return the quotient plus the remainder
                    var divmod = numer.divmod(denom);
                    var quotient = divmod.quotient;
                    var remainder = divmod.remainder;
                    var operator = parts[0][0] === '-' || quotient.equals(0) || remainder.equals(0) ? '' : '+';
                    return (quotient.equals(0) ? '' : quotient.toString()) + operator + (remainder.equals(0) ? '' : (remainder.toString() + '/' + parts[1]));
                default:
                    wrapCondition = wrapCondition || function(str) { return str.indexOf('/') !== -1; };
                    
                    return obj.toString();
            }
        }
        
        //if the object is a symbol
        if(isSymbol(obj)) { 
            var multiplier = '', 
            power = '',
            sign = '',
            group = obj.group || useGroup,
            value = obj.value;
            //if the value is to be used as a hash then the power and multiplier need to be suppressed
            if(!asHash) { 
                //use asDecimal to get the object back as a decimal
                var om = toString(obj.multiplier);
                if(om == '-1') {
                    sign = '-';
                    om = '1';
                }
                //only add the multiplier if it's not 1
                if(om != '1') multiplier = om;
                //use asDecimal to get the object back as a decimal
                var p = obj.power ? toString(obj.power) : '';
                //only add the multiplier 
                if(p != '1') {
                    //is it a symbol
                    if(isSymbol(p)) {
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
                    //if it's numerical then all we need is the multiplier
                    value = obj.multiplier == '-1' ? '1' : toString(obj.multiplier);
                    power = '';
                    break;
                case PL:
                    value = obj.collectSymbols(text, opt).join('+').replace(/\+\-/g, '-');
                    break;
                case CP:
                    value = obj.collectSymbols(text, opt).join('+').replace(/\+\-/g, '-');
                    break;
                case CB: 
                    value = obj.collectSymbols(function(symbol){
                        var g = symbol.group;
                        //both groups will already be in brackets if their power is greater than 1
                        //so skip it.
                        if((g === PL || g === CP) && (symbol.power.equals(1) && symbol.multiplier.equals(1))) {
                            return inBrackets(text(symbol, opt));
                        }
                        return text(symbol, opt);
                    }).join('*');
                    break;
                case EX:
                    var pg = obj.previousGroup,
                        pwg = obj.power.group;
                
                    //PL are the exception. It's simpler to just collect and set the value
                    if(pg === PL) value = obj.collectSymbols(text, opt).join('+').replace('+-', '-');
                    if(!(pg === N || pg === S || pg === FN) && !asHash) { value = inBrackets(value); }
 
                    if((pwg === CP || pwg === CB || pwg === PL || obj.power.multiplier.toString() != '1') && power) {
                        power = inBrackets(power);
                    }
                    break;
            }
            
            if(group === FN) { 
                value = obj.fname+inBrackets(obj.args.map(function(symbol) {
                    return text(symbol, opt);
                }).join(','));
            }
            //TODO: Needs to be more efficient. Maybe. 
            if(group === FN && obj.fname in CUSTOM_OPERATORS) {
                var a = text(obj.args[0]);
                var b = text(obj.args[1]);
                if(obj.args[0].isComposite()) //preserve the brackets
                    a = inBrackets(a);
                if(obj.args[1].isComposite()) //preserve the brackets
                    b = inBrackets(b);
                value = a+CUSTOM_OPERATORS[obj.fname]+b;
            }
            //wrap the power since / is less than ^
            //TODO: introduce method call isSimple
            if(power && group !== EX && wrapCondition(power)) { power = inBrackets(power); }

            //the following groups are held together by plus or minus. They can be raised to a power or multiplied
            //by a multiplier and have to be in brackets to preserve the order of precedence
            if(((group === CP || group === PL) && (multiplier && multiplier != '1' || sign === '-')) 
                    || ((group === CB || group === CP || group === PL) && (power && power != '1'))
                    || !asHash && group === P && value == -1
                    || obj.fname === PARENTHESIS) { 
                
                value = inBrackets(value);
            }
            
            var c = sign+multiplier;
            if(multiplier && wrapCondition(multiplier)) c = inBrackets(c);
            
            if(power < 0) power = inBrackets(power);
            if(multiplier) c = c + '*';
            if(power) power = Settings.POWER_OPERATOR + power;

            //this needs serious rethinking. Must fix
            if(group === EX && value.charAt(0) === '-') value = inBrackets(value);
            
            var cv = c+value;
            
            if(obj.parens) cv = inBrackets(cv);

            return cv+power;
        }
        else if(isVector(obj)) { 
            var l = obj.elements.length,
                c = [];
            for(var i=0; i<l; i++) c.push(obj.elements[i].text(option));
            return '['+c.join(',')+']';
        }
        else {
            try {
                return obj.toString();
            }
            catch(e) { return ''; }
        }
    }
    
    Utils.text = text;
    /* END GLOBAL FUNCTIONS */
    
    /**** CLASSES *****/
    /**
     * The Collector is used to find unique values within objects
     * @param {Function} extra_conditions - A function which performs a check on the values and returns a boolean
     * @returns {Collector}
     */
    function Collector(extra_conditions) {
        this.c = [];
        this.add = function(value) {
            var condition_true = extra_conditions ? extra_conditions(value) : true;
            if(this.c.indexOf(value) === -1 && condition_true) this.c.push(value);
        };
    }
    
    /** 
     * This is what nerdamer returns. It's sort of a wrapper around the symbol class and 
     * provides the user with some useful functions. If you want to provide the user with extra
     * library functions then add them to this class's prototype.
     * @param {Symbol} symbol
     * @returns {Expression} wraps around the Symbol class
     */
    function Expression(symbol) {
        //we don't want arrays wrapped
        this.symbol = symbol;
    }
    
    /**
     * Returns stored expression at index. For first index use 1 not 0.
     * @param {bool} asType  
     * @param {Integer} expression_number 
     */
    Expression.getExpression = function(expression_number, asType) {
        if(expression_number === 'last' || !expression_number) expression_number = EXPRESSIONS.length;
        if(expression_number === 'first') expression_number = 1;
        var index = expression_number -1,
            expression = EXPRESSIONS[index],
            retval = expression ? new Expression(expression) : expression;
        return retval;
    };
    
    Expression.prototype = {
        /**
         * Returns the text representation of the expression
         * @param {String} opt - option of formatting numbers
         * @returns {String}
         */
        text: function(opt) { 
            opt = opt || 'decimals';
            if(this.symbol.text_)
                return this.symbol.text_(opt);
            return text(this.symbol, opt);
        },
        /**
         * Returns the latex representation of the expression
         * @param {String} option - option for formatting numbers
         * @returns {String}
         */
        latex: function(option) {
            if(this.symbol.latex)
                return this.symbol.latex(option);
            return LaTeX.latex(this.symbol, option);
        },
        valueOf: function() { 
            return this.symbol.valueOf();
        },
        
        /**
         * Evaluates the expression and tries to reduce it to a number if possible.
         * If an argument is given in the form of %{integer} it will evaluate that expression.
         * Other than that it will just use it's own text and reparse
         * @returns {Expression}
         */
        evaluate: function() {
            var first_arg = arguments[0], expression, idx = 1;
            if(typeof first_arg === 'string') {
                expression = (first_arg.charAt(0) === '%') ? Expression.getExpression(first_arg.substr(1)).text() : first_arg;
            }
            else if(first_arg instanceof Expression || isSymbol(first_arg)) {
                expression = first_arg.text();
            }
            else {
                expression = this.symbol.text(); idx--;
            }
            
            var subs = arguments[idx] || {};
            
            return new Expression(block('PARSE2NUMBER', function() {
                return _.parse(expression, subs);
            }, true));
        },
        /**
         * Converts a symbol to a JS function. Pass in an array of variables to use that order instead of 
         * the default alphabetical order
         * @param vars {Array}
         */
        buildFunction: function(vars) {
            return build(this.symbol, vars);
        },
        /**
         * Checks to see if the expression is just a plain old number
         * @returns {boolean}
         */
        isNumber: function() {
            return isNumericSymbol(this.symbol);
        },
        /**
         * Checks to see if the expression is infinity
         * @returns {boolean}
         */
        isInfinity: function() {
            return Math.abs(this.symbol.multiplier) === Infinity;
        },
        /**
         * Returns all the variables in the expression
         * @returns {Array}
         */
        variables: function() {
            return variables(this.symbol);
        },
        
        toString: function() {
            try {
                if(isArray(this.symbol)) return '['+this.symbol.toString()+']';
                return this.symbol.toString();
            }
            catch(e) { return ''; }
        },
        //forces the symbol to be returned as a decimal
        toDecimal: function(prec) {
            Settings.precision = prec;
            var dec = text(this.symbol, 'decimals');
            Settings.precision = undefined;
            return dec;
        },
        //checks to see if the expression is a fraction
        isFraction: function() {
            return isFraction(this.symbol);
        },
        //checks to see if the symbol is a multivariate polynomial
        isPolynomial: function() {
            return this.symbol.isPoly();
        }, 
        //performs a substitution
        sub: function(symbol, for_symbol) {
            return new Expression(this.symbol.sub(_.parse(symbol), _.parse(for_symbol)));
        },
        operation: function(otype, symbol) {
            if(isExpression(symbol))
                symbol = symbol.symbol;
            else if(!isSymbol(symbol))
                symbol = _.parse(symbol);
            return new Expression(_[otype](this.symbol.clone(), symbol.clone()));
        },
        add: function(symbol) {
            return this.operation('add', symbol);
        },
        subtract: function(symbol) {
            return this.operation('subtract', symbol);
        },
        multiply: function(symbol) {
            return this.operation('multiply', symbol);
        },
        divide: function(symbol) {
            return this.operation('divide', symbol);
        },
        pow: function(symbol) {
            return this.operation('pow', symbol);
        },
        expand: function() {
            return new Expression(_.expand(this.symbol));
        },
        each: function(callback, i) {
            if(this.symbol.each)
                this.symbol.each(callback, i);
            else if(isArray(this.symbol)) { 
                for(var i=0; i<this.symbol.length; i++)
                    callback.call(this.symbol, this.symbol[i], i);
            }
            else
                callback.call(this.symbol);
        },
        eq: function(value) {
            if(!isSymbol(value))
                value = _.parse(value);
            try {
                var d = _.subtract(this.symbol.clone(), value);
                return d.equals(0);
            }
            catch(e){
                return false;
            };    
        },
        lt: function(value) {
            if(!isSymbol(value))
                value = _.parse(value);
            try {
                var d = evaluate(_.subtract(this.symbol.clone(), value));
                return d.lessThan(0);
            }
            catch(e){
                return false;
            };   
        },
        gt: function(value) {
            if(!isSymbol(value))
                value = _.parse(value);
            try {
                var d = evaluate(_.subtract(this.symbol.clone(), value));
                return d.greaterThan(0);
            }
            catch(e){
                return false;
            }; 
        },
        gte: function(value) {
            return this.gt(value) || this.eq(value);
        },
        lte: function(value) {
            return this.lt(value) || this.eq(value);
        },
        
        numerator: function() {
            return new Expression(this.symbol.getNum());
        },
        denominator: function() {
            return new Expression(this.symbol.getDenom());
        }
    };
    //Aliases
    Expression.prototype.toTeX = Expression.prototype.latex;
    
    function Frac(n) { 
        if(n instanceof Frac) return n;
        if(n === undefined) return this;
        try {
            if(isInt(n)) { 
                try {
                    this.num = bigInt(n);
                    this.den = bigInt(1);
                }
                catch(e) {
                    return Frac.simple(n);
                }
            }
            else {
                var frac = Fraction.convert(n);
                this.num = new bigInt(frac[0]);
                this.den = new bigInt(frac[1]);
            }
        }
        catch(e) {
            return Frac.simple(n);
        }
            
    }
    //safe to use with negative numbers or other types
    Frac.create = function(n) {
        if(n instanceof Frac)
            return n;
        n = n.toString();
        var is_neg = n.charAt(0) === '-'; //check if it's negative
        if(is_neg)
            n = n.substr(1, n.length-1); //remove the sign
        var frac = new Frac(n);
        //put the sign back
        if(is_neg)
            frac.negate();
        return frac;
    };
    
    Frac.isFrac = function(o) {
        return (o instanceof Frac);
    };
    
    Frac.quick = function(n, d) { 
        var frac = new Frac();
        frac.num = new bigInt(n);
        frac.den = new bigInt(d);
        return frac;
    };
    
    Frac.simple =  function(n) {
        var nstr = String(scientificToDecimal(n)),
            m_dc = nstr.split('.'),
            num = m_dc.join(''),
            den = 1,
            l = (m_dc[1] || '').length;
        for(var i=0; i<l; i++)
            den += '0';
        var frac = Frac.quick(num, den);
        return frac.simplify();
    };
    
    Frac.prototype = {
        multiply: function(m) { 
            if(this.isOne()) {
                return m.clone();
            }
            if(m.isOne()) {
                return this.clone();
            }
            
            var c = this.clone();
            c.num = c.num.multiply(m.num);
            c.den = c.den.multiply(m.den); 

            return c.simplify();
        },
        divide: function(m) {
            if(m.equals(0)) throw new DivisionByZero('Division by zero not allowed!');
            return this.clone().multiply(m.clone().invert()).simplify();
        },
        subtract: function(m) { 
            return this.clone().add(m.clone().neg());
        },
        neg: function() {
            this.num = this.num.multiply(-1);
            return this;
        },
        add: function(m) { 
            var n1 = this.den, n2 = m.den, c = this.clone();
            var a = c.num, b = m.num;
            if(n1.equals(n2)) {
                c.num = a.add(b);
            }
            else {
                c.num = a.multiply(n2).add(b.multiply(n1));
                c.den = n1.multiply(n2);
            }

            return c.simplify();
        },
        mod: function(m) {
            var a = this.clone(),
                b = m.clone();
            //make their denominators even and return the mod of their numerators
            a.num = a.num.multiply(b.den);
            a.den = a.den.multiply(b.den);
            b.num = b.num.multiply(this.den);
            b.den = b.den.multiply(this.den);
            a.num = a.num.mod(b.num);
            return a.simplify();
        },
        simplify: function() { 
            var gcd = bigInt.gcd(this.num, this.den);
            
            this.num = this.num.divide(gcd);
            this.den = this.den.divide(gcd);
            return this;
        },
        clone: function() {
            var m = new Frac();
            m.num = new bigInt(this.num);
            m.den = new bigInt(this.den);
            return m;
        },
        toDecimal: function(prec) { 
            if(prec || Settings.PRECISION) { 
                var sign = this.num.isNegative() ? '-' : '';
                if(this.num.equals(this.den)) {
                    return '1';
                }
                //go plus one for rounding
                prec = prec || Settings.PRECISION;
                prec++;
                var narr = [], 
                    n = this.num.abs(),
                    d = this.den;
                for(var i=0; i<prec; i++) {
                    var w = n.divide(d), //divide out whole
                        r = n.subtract(w.multiply(d)); //get remainder

                    narr.push(w);    
                    if(r.equals(0))
                            break;
                    n = r.times(10); //shift one dec place
                }
                var whole = narr.shift();
                if(narr.length === 0) { 
                    return sign+whole.toString();
                }

                if(i === prec) {
                    var lt = [];
                    //get the last two so we can round it
                    for(var i=0; i<2; i++)
                        lt.unshift(narr.pop());
                    //put the last digit back by rounding the last two
                    narr.push(Math.round(lt.join('.')));
                }

                var dec = whole.toString()+'.'+narr.join('');
                return sign+dec;
            }
            else
                return this.num/this.den;
        },
        qcompare: function(n) { 
            return [this.num.multiply(n.den), n.num.multiply(this.den)];
        },
        equals: function(n) {
            if(!isNaN(n)) n = new Frac(n);
            var q = this.qcompare(n);
            
            return q[0].equals(q[1]);
        },
        absEquals: function(n) { 
            if(!isNaN(n)) n = new Frac(n);
            var q = this.qcompare(n);
            
            return q[0].abs().equals(q[1]);
        },
        //lazy check to be fixed. Sufficient for now but will cause future problems
        greaterThan: function(n) {
            if(!isNaN(n)) n = new Frac(n);
            var q = this.qcompare(n);
            
            return q[0].gt(q[1]);
        },
        gte: function(n) {
            return this.greaterThan(n) || this.equals(n);
        },
        lte: function(n) {
            return this.lessThan(n) || this.equals(n);
        },
        lessThan: function(n) { 
            if(!isNaN(n)) n = new Frac(n);
            var q = this.qcompare(n);
            
            return q[0].lt(q[1]);
        },
        isInteger: function() {
            return this.den.equals(1);
        },
        negate: function() {
            this.num = this.num.multiply(-1);
            return this;
        },
        invert: function() { 
            var t = this.den;
            var isnegative = this.num.isNegative();
            this.den = this.num.abs();
            this.num = t;
            if(isnegative) this.num = this.num.multiply(-1);
            return this;
        },
        isOne: function() {
            return this.num.equals(1) && this.den.equals(1);
        },
        sign: function() { 
            return this.num.isNegative() ? -1 : 1;
        },
        abs: function() { 
            this.num = this.num.abs();
            return this;
        },
        gcd: function(f) {
            return Frac.quick(bigInt.gcd(f.num, this.num), bigInt.lcm(f.den, this.den));
        },
        toString: function() {
            return !this.den.equals(1) ? this.num.toString()+'/'+this.den.toString() : this.num.toString();
        },
        valueOf: function() {
            return this.num/this.den;
        },
        isNegative: function() {
            return this.toDecimal() < 0;
        }
    };
    
    /**
     * All symbols e.g. x, y, z, etc or functions are wrapped in this class. All symbols have a multiplier and a group. 
     * All symbols except for "numbers (group N)" have a power. 
     * @class Primary data type for the Parser. 
     * @param {String} obj 
     * @returns {Symbol}
     */
    function Symbol(obj) { 
        var isInfinity = obj === 'Infinity';
        //this enables the class to be instantiated without the new operator
        if(!(this instanceof Symbol)) { 
            return new Symbol(obj); 
        };
        //define numeric symbols
        if(/^(\-?\+?\d+)\.?\d*e?\-?\+?\d*/i.test(obj)) { 
            this.group = N;
            this.value = CONST_HASH; 
            this.multiplier = new Frac(obj);
        }
        //define symbolic symbols
        else {
            this.group = S; 
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
    Symbol.imaginary = function() {
        var s = new Symbol(Settings.IMAGINARY);
        s.imaginary = true;
        return s;
    };
    
    /**
     * Return nerdamer's representation of Infinity
     * @returns {Symbol} 
     */
    Symbol.infinity = function() {
        return new Symbol('Infinity');
    };
    
    Symbol.shell = function(group, value) { 
        var symbol = new Symbol(value);
        symbol.group = group;
        symbol.symbols = {};
        symbol.length = 0;
        return symbol;
    };
    //sqrt(x) -> x^(1/2)
    Symbol.unwrapSQRT = function(symbol, all) {
        var p = symbol.power;
        if(symbol.fname === SQRT && (symbol.isLinear() || all )) {
            var t = symbol.args[0].clone(); 
            t.power = t.power.multiply(new Frac(1/2));
            t.multiplier = t.multiplier.multiply(symbol.multiplier);
            symbol = t;
            if(all) 
                symbol.power = p.multiply(new Frac(1/2));
        }
            
        return symbol;
    };
    
    Symbol.hyp = function(a, b) {
        if(a.equals(0))
            return b.clone();
        if(b.equals(0))
            return a.clone();
        return _.sqrt(_.add(_.pow(a.clone(), new Symbol(2)), _.pow(b.clone(), new Symbol(2))));
    };
    
    //converts to polar form array
    Symbol.toPolarFormArray = function(symbol) {
        var re, im, r, theta;
        re = symbol.realpart(); 
        im = symbol.imagpart(); 
        r = Symbol.hyp(re, im);
        theta = re.equals(0) ? _.parse('pi/2') : _.trig.atan(_.divide(im, re));
        return [r, theta];
    };
    
    //removes parentheses
    Symbol.unwrapPARENS = function(symbol) {
        if(symbol.fname === '') {
            var r = symbol.args[0];
            r.power = r.power.multiply(symbol.power);
            r.multiplier = r.multiplier.multiply(symbol.multiplier);
            if(symbol.fname === '')
                return Symbol.unwrapPARENS(r);
            return r;
        }
        return symbol;
    };
    //quickly creates a Symbol
    Symbol.create = function(value, power) {
        power = power === undefined ? 1 : power;
        return _.parse('('+value+')^('+power+')');
    };
    
    Symbol.prototype = {
        //returns a clone.
        powSimp: function() {
            if(this.group === CB) {
                var powers = [],
                    sign = this.multiplier.sign();
                this.each(function(x) {
                    var p = x.power;
                    //why waste time if I can't do anything anyway
                    if(isSymbol(p) || p.equals(1))
                        return this.clone();
                    powers.push(p);
                });
                var min = new Frac(arrayMin(powers));
                
                //handle the coefficient
                //handle the multiplier
                var sign = this.multiplier.sign(),
                    m = this.multiplier.clone().abs(),
                    mfactors = Math2.ifactor(m);
                //if we have a multiplier of 6750 and a min of 2 then the factors are 5^3*5^3*2
                //we can then reduce it to 2*3*5*(15)^2 
                var out_ = new Frac(1);
                var in_ = new Frac(1);
                
                for(var x in mfactors) {
                    var n = new Frac(mfactors[x]);
                    if(!n.lessThan(min)) {
                        n = n.divide(min).subtract(new Frac(1));
                        in_ = in_.multiply(new Frac(x)); //move the factor inside the bracket
                    }
                    
                    out_ = out_.multiply(_.parse(inBrackets(x)+'^'+inBrackets(n)).multiplier);
                }
                var t = new Symbol(in_);
                this.each(function(x) { 
                    x = x.clone();
                    x.power = x.power.divide(min);
                    t = _.multiply(t, x);
                });
                
                var xt = _.symfunction(PARENTHESIS, [t]);
                xt.power = min;
                xt.multiplier = sign < 0 ? out_.negate() : out_;

                return xt;
            }
            return this.clone();
        },
        /**
         * Checks to see if two functions are of equal value
         */
        equals: function(symbol) { 
            if(!isSymbol(symbol)) 
                symbol = new Symbol(symbol);
            return this.value === symbol.value && this.power.equals(symbol.power) && this.multiplier.equals(symbol.multiplier);
        },
        // Greater than
        gt: function(symbol) { 
            if(!isSymbol(symbol)) 
                symbol = new Symbol(symbol);
            return this.isConstant() && symbol.isConstant() && this.multiplier.greaterThan(symbol.multiplier);
        },
        // Greater than
        gte: function(symbol) { 
            if(!isSymbol(symbol)) 
                symbol = new Symbol(symbol);
            return this.equals(symbol) ||
                    this.isConstant() && symbol.isConstant() && this.multiplier.greaterThan(symbol.multiplier);
        },
        // Less than
        lt: function(symbol) { 
            if(!isSymbol(symbol)) 
                symbol = new Symbol(symbol);
            return this.isConstant() && symbol.isConstant() && this.multiplier.lessThan(symbol.multiplier);
        },
        // Less than
        lte: function(symbol) { 
            if(!isSymbol(symbol)) 
                symbol = new Symbol(symbol);
            return this.equals(symbol) ||
                    this.isConstant() && symbol.isConstant() && this.multiplier.lessThan(symbol.multiplier);
        },
        /**
         * Because nerdamer doesn't group symbols by polynomials but 
         * rather a custom grouping method, this has to be
         * reinserted in order to make use of most algorithms. This function
         * checks if the symbol meets the criteria of a polynomial.
         * @returns {boolean}
         */
        isPoly: function(multivariate) { 
            var g = this.group, 
                p = this.power; 
            //the power must be a integer so fail if it's not
            if(!isInt(p) || p < 0) 
                return false;
            //constants and first orders
            if(g === N  || g === S || this.isConstant(true)) 
                return true;
            var vars = variables(this);
            if(g === CB && vars.length === 1) { 
                //the variable is assumed the only one that was found
                var v = vars[0];
                //if no variable then guess what!?!? We're done!!! We have a polynomial.
                if(!v)
                    return true;
                for(var x in this.symbols) {
                    var sym = this.symbols[x];
                    //sqrt(x)
                    if(sym.group === FN && sym.fname === SQRT && !sym.args[0].isConstant())
                        return false;
                    if(!sym.contains(v) && !sym.isConstant(true))
                        return false;
                }
                return true;
            }
            //PL groups. These only fail if a power is not an int
            //this should handle cases such as x^2*t
            if(this.isComposite() || g === CB && multivariate) { 
                //fail if we're not checking for multivariate polynomials
                if(!multivariate && vars.length > 1) 
                    return false;
                //loop though the symbols and check if they qualify
                for(var x in this.symbols) {
                    //we've already the symbols if we're not checking for multivariates at this point
                    //so we check the sub-symbols
                    if(!this.symbols[x].isPoly(multivariate)) 
                        return false;
                }
                return true;
            }
            else 
                return false;
            
            //all tests must have passed so we must be dealing with a polynomial
            return true;
        },
        //removes the requested variable from the symbol and returns the remainder
        stripVar: function(x) {
            var retval;
            if((this.group === PL || this.group === S) && this.value === x) 
                retval = new Symbol(this.multiplier);
            else if(this.group === CB && this.isLinear()) { 
                retval = new Symbol(1);
                this.each(function(s) { 
                    if(!s.contains(x, true)) 
                        retval = _.multiply(retval, s.clone());
                });
                retval.multiplier = retval.multiplier.multiply(this.multiplier);
            }
            else if(this.group === CP && !this.isLinear()) {
                retval = new Symbol(this.multiplier);
            }
            else if(this.group === CP && this.isLinear()) {
                retval = new Symbol(0);
                this.each(function(s) {
                    if(!s.contains(x)) {
                        var t = s.clone();
                        t.multiplier = t.multiplier.multiply(this.multiplier);
                        retval = _.add(retval, t);
                    } 
                });
                //BIG TODO!!! It doesn't make much sense
                if(retval.equals(0))
                    retval = new Symbol(this.multiplier);
            }
            else if(this.group === EX && this.power.contains(x, true)) {
                retval = new Symbol(this.multiplier);
            }
            else if(this.group === FN && this.contains(x)) {
                retval = new Symbol(this.multiplier);
            }
            else retval = this.clone();
            
            return retval;
        },
        //returns symbol in array form with x as base e.g. a*x^2+b*x+c = [c, b, a]. 
        toArray: function(v, arr) {
            arr = arr || {
                arr: [],
                add: function(x, idx) {
                    var e = this.arr[idx];
                    this.arr[idx] = e ? _.add(e, x) : x;
                }
            };
            var g = this.group;
            
            if(g === S && this.contains(v)) { 
                arr.add(new Symbol(this.multiplier), this.power);
            }
            else if(g === CB){
                var a = this.stripVar(v),
                    x = _.divide(this.clone(), a.clone());
                var p = x.isConstant() ? 0 : x.power;
                arr.add(a, p);
            }
            else if(g === PL && this.value === v) {
                this.each(function(x, p) {
                    arr.add(x.stripVar(v), p);
                });
            }
            else if(g === CP) {
                //the logic: they'll be broken into symbols so e.g. (x^2+x)+1 or (a*x^2+b*x+c)
                //each case is handled above
                this.each(function(x) {
                    x.toArray(v, arr);
                });
            }
            else if(this.contains(v)){
                throw new Error('Cannot convert to array! Exiting');
            }
            else {
                arr.add(this.clone(), 0); //it's just a constant wrt to v
            }
            //fill the holes
            arr = arr.arr; //keep only the array since we don't need the object anymore
            for(var i=0; i<arr.length; i++) 
                if(!arr[i])
                    arr[i] = new Symbol(0);
            return arr;
        },
        //checks to see if a symbol contans a function
        hasFunc: function(v) {
            var fn_group = this.group === FN || this.group === EX;
            if( fn_group && !v || fn_group && this.contains(v) )
                return true;
            if(this.symbols) {
                for(var x in this.symbols) {
                    if(this.symbols[x].hasFunc(v)) return true;
                }
            }
            return false;
        },
        sub: function(a, b) { 
            a = !isSymbol(a) ? _.parse(a) : a.clone();
            b = !isSymbol(b) ? _.parse(b) : b.clone();
            if(a.group === N || a.group === P)
                err('Cannot substitute a number. Must be a variable');
            var same_pow = false,
                a_is_unit_multiplier = a.multiplier.equals(1),
                m = this.multiplier.clone(),
                retval;
            /* 
             * In order to make the substitution the bases have to first match take
             * (x+1)^x -> (x+1)=y || x^2 -> x=y^6
             * In both cases the first condition is that the bases match so we begin there
             * Either both are PL or both are not PL but we cannot have PL and a non-PL group match
             */
            if(this.value === a.value && (this.group !== PL && a.group !== PL || this.group === PL && a.group === PL)) { 
                //we cleared the first hurdle but a subsitution may not be possible just yet
                if(a_is_unit_multiplier || a.multiplier.equals(this.multiplier)) {
                    if(a.isLinear()) { 
                        retval = b; 
                    }
                    else if(a.power.equals(this.power)) {
                        retval = b;
                        same_pow = true;
                    }
                    if(a.multiplier.equals(this.multiplier))
                        m = new Frac(1);
                }
            }
            //the next thing is to handle CB
            else if(this.group === CB || this.previousGroup === CB) {
                retval = new Symbol(1);
                this.each(function(x) { 
                    retval = _.multiply(retval, x.sub(a, b));
                });
            }
            else if(this.isComposite()) {
                if(a.isComposite() && this.isComposite() && this.isLinear() && a.isLinear()) { 
                    var find = function(stack, needle) {
                        for(var x in stack.symbols) {
                            var sym = stack.symbols[x];
                            //if the symbol equals the needle or it's within the sub-symbols we're done
                            if(sym.isComposite() && find(sym, needle) || sym.equals(needle))
                                return true;
                        }
                        return false;
                    };
                    //go fish
                    for(var x in a.symbols) {
                        if(!find(this, a.symbols[x]))
                            return this.clone();
                    }
                    retval = _.add(_.subtract(this.clone(), a), b);
                }
                else {
                    retval = new Symbol(0);
                    this.each(function(x) { 
                        retval = _.add(retval, x.sub(a, b));
                    });
                }
            }
            else if(this.group === EX) {
                // the parsed value could be a function so parse and sub
                retval = _.parse(this.value).sub(a, b);
            }
            else if(this.group === FN) { 
                var nargs = [];
                for(var i=0; i<this.args.length; i++) {
                    var arg = this.args[i];
                    if(!isSymbol(arg))
                        arg = _.parse(arg);
                    nargs.push(arg.sub(a, b));
                }
                retval = _.symfunction(this.fname, nargs);
            }
            //if we did manage a substitution
            if(retval) {
                if(!same_pow) {
                    //substitute the power
                    var p = this.group === EX ? this.power.sub(a, b) : _.parse(this.power);
                    //now raise the symbol to that power
                    retval = _.pow(retval, p); 
                }

                //transfer the multiplier
                retval.multiplier = retval.multiplier.multiply(m);
                //done
                return retval;
            }
            //if all else fails
            return this.clone();
        },
        isMonomial: function() {
            if(this.group === S) return true;
            if(this.group === CB) {
                for(var x in this.symbols) 
                    if(this.symbols[x].group !== S)
                        return false;
            }
            else return false;
            return true;
        },
        isPi: function() {
            return this.group === S && this.value === 'pi';
        },
        sign: function() {
            return this.multiplier.sign();
        },
        isE: function() {
            return this.value === 'e';
        },
        isSQRT: function() {
            return this.fname === SQRT;
        },
        isConstant: function(check_all) {
            if(check_all === 'all' && (this.isPi() || this.isE()))
                return true;
            if(check_all && this.group === FN) {
                for(var i=0; i<this.args.length; i++) {
                    if(!this.args[i].isConstant())
                        return false;
                }
                return true;
            }
            return this.value === CONST_HASH;
        },
        //the symbols is imaginary if 
        //1. n*i
        //2. a+b*i
        //3. a*i
        isImaginary: function() { 
            if(this.imaginary)
                return true;
            else if(this.symbols) {
                for(var x in this.symbols)
                    if(this.symbols[x].imaginary)
                        return true;
            }
            return false;
        },
        /**
         * Returns the real part of a symbol
         * @returns {Symbol}
         */
        realpart: function() { 
            if(this.isConstant()) { 
                return this.clone();
            }
            else if(this.imaginary)
                return new Symbol(0);
            else if(this.isComposite()) { 
                var retval = new Symbol(0);
                this.each(function(x) {
                    retval = _.add(retval, x.realpart());
                });
                return retval;
            }
            else if(this.isImaginary())
                return new Symbol(0);
            return this.clone();
        },
        /*
         * Return imaginary part of a symbol
         * @returns {Symbol}
         */
        imagpart: function() {
            if(this.group === S && this.isImaginary())
                return new Symbol(this.multiplier);
            if(this.isComposite()) {
                var retval = new Symbol(0);
                this.each(function(x) {
                    retval = _.add(retval, x.imagpart());
                });
                return retval;
            }
            if(this.group === CB)
                return this.stripVar(Settings.IMAGINARY);
            return new Symbol(0);
        },
        isInteger: function() {
            return this.isConstant() && this.multiplier.isInteger();
        },
        isLinear: function(wrt) {
            if(wrt) {
                if(this.isConstant())
                    return true;
                if(this.group === S) {
                    if(this.value === wrt)return this.power.equals(1);
                    else return true;
                }
                
                if(this.isComposite() && this.power.equals(1)) {
                    for(var x in this.symbols) {
                        if(!this.symbols[x].isLinear(wrt))
                            return false;
                    }
                    return true;
                }
                
                if(this.group === CB && this.symbols[wrt])
                    return this.symbols[wrt].isLinear(wrt);
                return false;  
            }
            else return this.power.equals(1);
        },
        containsFunction: function(names) {
            if(typeof names === 'string')
                names = [names];
            if(this.group === FN && names.indexOf(this.fname) !== -1) 
                return true;
            if(this.symbols) {
                for(var x in this.symbols) {
                    if(this.symbols[x].containsFunction(names))
                        return true;
                }
            }
            return false;
        },
        multiplyPower: function(p2) {
            //leave out 1
            if(this.group === N && this.multiplier.equals(1)) return this;
            
            var p1 = this.power;
            
            if(this.group !== EX && p2.group === N) {
                var p = p2.multiplier;
                if(this.group === N && !p.isInteger()) {
                    this.convert(P);
                }

                this.power = p1.equals(1) ? p.clone() : p1.multiply(p);

                if(this.group === P && isInt(this.power)) {
                    //bring it back to an N
                    this.value = Math.pow(this.value, this.power);
                    this.toLinear(); 
                    this.convert(N);
                }
            }
            else {
                if(this.group !== EX) {
                    p1 = new Symbol(p1);
                    this.convert(EX);
                }
                this.power = _.multiply(p1, p2);
            }

            return this;
        },
        setPower: function(p, retainSign) { 
            //leave out 1
            if(this.group === N && this.multiplier.equals(1)) return this;
            if(this.group === EX && !isSymbol(p)) {
                this.group = this.previousGroup; 
                delete this.previousGroup; 
                if(this.group === N) {
                    this.multiplier = new Frac(this.value);
                    this.value = CONST_HASH;
                }
                else
                    this.power = p;
            }
            else {
                var isIntP = false,
                    isSymbolic = false;
                if(isSymbol(p)) {
                    if(p.group === N) {
                        //p should be the multiplier instead
                        p = p.multiplier;

                    }
                    else {
                        isSymbolic = true;
                    }
                }
                var group = isSymbolic ? EX : !isIntP ? P : null;
                this.power = p; 
                if(this.group === N && group) this.convert(group, retainSign);
            }

            return this;
        },
        /**
         * Checks to see if symbol is located in the denominator
         * @returns {boolean}
         */
        isInverse: function() {
            if(this.group === EX) return (this.power.multiplier.lessThan(0));
            return this.power < 0;
        },
        /**
         * Make a duplicate of a symbol by copying a predefined list of items
         * to a new symbol
         * @param {Symbol} c 
         * @returns {Symbol}
         */
        clone: function(c) { 
            var clone = c || new Symbol(0),
                //list of properties excluding power as this may be a symbol and would also need to be a clone.
                properties = [
                    'value', 'group', 'length', 'previousGroup', 'imaginary', 'fname', 'args', 'isInfinity'],
                l = properties.length, i;
            if(this.symbols) {
                clone.symbols = {};
                for(var x in this.symbols) {
                    clone.symbols[x] = this.symbols[x].clone();
                }
            }

            for(i=0; i<l; i++) {
                if(this[properties[i]] !== undefined) {
                    clone[properties[i]] = this[properties[i]];
                }
            }

            clone.power = this.power.clone();
            clone.multiplier = this.multiplier.clone();

            return clone;
        },
        toUnitMultiplier: function(keepSign) {
            this.multiplier.num = new bigInt(this.multiplier.num.isNegative() && keepSign ? -1 : 1);
            this.multiplier.den = new bigInt(1);
            return this;
        },
        toLinear: function() {
            this.setPower(new Frac(1));
            return this;
        },
        each: function(fn, deep) {
            if(!this.symbols) {
                fn.call(this, this, this.value);
            }
            else {
                for(var x in this.symbols) {
                    var sym = this.symbols[x];
                    if(sym.group === PL && deep) {
                        for(var y in sym.symbols) {
                            fn.call(x, sym.symbols[y], y);
                        }
                    }
                    else
                        fn.call(this, sym, x);
                }
            }
        },
        /**
         * A numeric value to be returned for Javascript. It will try to 
         * return a number as far a possible but in case of a pure symbolic
         * symbol it will just return its text representation
         * @returns {String|Number}
         */
        valueOf: function() {
            if(this.group === N) 
                return this.multiplier.valueOf(); 
            else if(this.power === 0){ return 1; }
            else if(this.multiplier === 0) { return 0; }
            else { return text(this, 'decimals'); }
        },
        /**
         * Checks to see if a symbols has a particular variable within it.
         * Pass in true as second argument to include the power of exponentials
         * which aren't check by default.
         * @example var s = _.parse('x+y+z'); s.contains('y');
         * //returns true
         * @returns {boolean}
         */
        contains: function(variable, all) { 
            var g = this.group; 
            if(this.value === variable)
                return true;
            if(this.symbols) {
                for(var x in this.symbols) { 
                    if(this.symbols[x].contains(variable, all)) return true; 
                }
            }
            if(g === FN || this.previousGroup === FN) {
                for(var i=0; i<this.args.length; i++) { 
                    if(this.args[i].contains(variable, all)) return true; 
                }
            }
            
            if(g === EX) { 
                //exit only if it does
                if(all && this.power.contains(variable, all)) { return true; }
                if(this.value === variable)
                    return true;
                
            }
            
            return this.value === variable;
        },
        /**
         * Negates a symbols
         * @returns {boolean}
         */
        negate: function() { 
            this.multiplier.negate();
            if(this.group === CP || this.group === PL) 
                this.distributeMultiplier();
            return this;
        },
        /**
         * Inverts a symbol
         * @returns {boolean}
         */
        invert: function(power_only, all) { 
            //invert the multiplier
            if(!power_only) this.multiplier = this.multiplier.invert();
            //invert the rest
            if(isSymbol(this.power)) {
                this.power.negate();
            }
            else if(this.group === CB && all) {
                this.each(function(x) {
                    return x.invert();
                });
            }
            else {
                if(this.power && this.group !== N) this.power.negate();
            }
            return this;
        },
        /**
         * Symbols of group CP or PL may have the multiplier being carried by 
         * the top level symbol at any given time e.g. 2*(x+y+z). This is 
         * convenient in many cases, however in some cases the multiplier needs
         * to be carried individually e.g. 2*x+2*y+2*z.
         * This method distributes the multiplier over the entire symbol
         * @returns {Symbol}
         */
        distributeMultiplier: function(all) { 
            var is_one = all ? this.power.absEquals(1) : this.power.equals(1);
            if(this.symbols && is_one && this.group !== CB && !this.multiplier.equals(1)) {
                for(var x in this.symbols) {
                    var s = this.symbols[x];
                    s.multiplier = s.multiplier.multiply(this.multiplier);
                    s.distributeMultiplier();
                }
                this.toUnitMultiplier();
            }

            return this;
        },
        /**
         * This method expands the exponent over the entire symbol just like
         * distributeMultiplier
         * @returns {Symbol}
         */
        distributeExponent: function() { 
            if(!this.power.equals(1)) {
                var p = this.power;
                for(var x in this.symbols) {
                    var s = this.symbols[x];
                    if(s.group === EX) {
                        s.power = _.multiply(s.power, new Symbol(p));
                    }
                    else {
                        this.symbols[x].power  = this.symbols[x].power.multiply(p);
                    }
                }
                this.toLinear();
            }
            return this;
        },
        /**
         * This method will attempt to up-convert or down-convert one symbol
         * from one group to another. Not all symbols are convertible from one 
         * group to another however. In that case the symbol will remain 
         * unchanged.
         */
        convert: function(group, imaginary) { 
            if(group > FN) { 
                //make a clone of this symbol;
                var cp = this.clone();

                //attach a symbols object and upgrade the group
                this.symbols = {};

                if(group === CB) { 
                    //symbol of group CB hold symbols bound together through multiplication
                    //because of commutativity this multiplier can technically be anywhere within the group
                    //to keep track of it however it's easier to always have the top level carry it
                    cp.toUnitMultiplier();
                }
                else {
                    //reset the symbol
                    this.toUnitMultiplier();
                }

                if(this.group === FN) {
                    cp.args = this.args; 
                    delete this.args;
                    delete this.fname;
                }

                //the symbol may originate from the symbol i but this property no longer holds true
                //after copying
                if(this.isImgSymbol) delete this.isImgSymbol;

                this.toLinear();
                //attach a clone of this symbol to the symbols object using its proper key
                this.symbols[cp.keyForGroup(group)] = cp; 
                this.group = group;
                //objects by default don't have a length property. However, in order to keep track of the number
                //of sub-symbols we have to impliment our own.
                this.length = 1;    
            }
            else if(group === EX) { 
                //1^x is just one so check and make sure
                if(!(this.group === N && this.multiplier.equals(1))) {
                    if(this.group !== EX) this.previousGroup = this.group;
                    if(this.group === N) { 
                        this.value = this.multiplier.num.toString();
                        this.toUnitMultiplier();
                    }
                    //update the hash to reflect the accurate hash
                    else this.value = text(this, 'hash');
                    
                    this.group = EX;
                }
            }
            else if(group === N) { 
                var m = this.multiplier.toDecimal(); 
                if(this.symbols) this.symbols = undefined;
                new Symbol(this.group === P ? m*Math.pow(this.value, this.power) : m).clone(this);
            }
            else if(group === P && this.group === N) { 
                this.value = imaginary ? this.multiplier.num.toString() : Math.abs(this.multiplier.num.toString());
                this.toUnitMultiplier(!imaginary);
                this.group = P;
            }
            return this;
        },
        /**
         * This method is one of the principal methods to make it all possible.
         * It performs cleanup and prep operations whenever a symbols is 
         * inserted. If the symbols results in a 1 in a CB (multiplication) 
         * group for instance it will remove the redundant symbol. Similarly
         * in a symbol of group PL or CP (symbols glued by multiplication) it
         * will remove any dangling zeroes from the symbol. It will also 
         * up-convert or down-convert a symbol if it detects that it's 
         * incorrectly grouped. It should be noted that this method is not
         * called directly but rather by the 'attach' method for addition groups
         * and the 'combine' method for multipiclation groups.
         */
        insert: function(symbol, action) { 
            //this check can be removed but saves a lot of aggravation when trying to hunt down
            //a bug. If left, you will instantly know that the error can only be between 2 symbols.
            if(!isSymbol(symbol)) err('Object '+symbol+' is not of type Symbol!');
            if(this.symbols) { 
                var group = this.group;
                if(group > FN) { 
                    var key = symbol.keyForGroup(group); 
                    var existing = key in this.symbols ? this.symbols[key] : false; //check if there's already a symbol there
                    if(action === 'add') {
                        var hash = key;
                        if(existing) { 
                            //add them together using the parser
                            this.symbols[hash] = _.add(existing, symbol); 
                            //if the addition resulted in a zero multiplier remove it
                            if(this.symbols[hash].multiplier.equals(0)) {
                                delete this.symbols[hash];
                                this.length--;
                                
                                if(this.length === 0) {
                                    this.convert(N);
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
                        //check if this is of group P and unwrap before inserting
                        if(symbol.group === P && isInt(symbol.power)) {
                            symbol.convert(N);
                        }
                        
                        //transfer the multiplier to the upper symbol but only if the symbol numeric
                        if(symbol.group !== EX) {
                            this.multiplier = this.multiplier.multiply(symbol.multiplier);
                            symbol.toUnitMultiplier();
                        }
                        else {
                            symbol.parens = symbol.multiplier.lessThan(0);
                            this.multiplier = this.multiplier.multiply(symbol.multiplier.clone().abs());
                            symbol.toUnitMultiplier(true);
                        }
                            
                        if(existing) {  
                            //remove because the symbol may have changed
                            symbol = _.multiply(remove(this.symbols, key), symbol);
                            if(symbol.isConstant()) {
                                 this.multiplier = this.multiplier.multiply(symbol.multiplier);
                                 symbol = new Symbol(1); //the dirty work gets done down the line when it detects 1
                            }

                            this.length--;
                            //clean up
                        }
                        
                        //don't insert the symbol if it's 1
                        if(!symbol.isOne(true)) {
                            this.symbols[key] = symbol;
                            this.length++;
                        }
                        else if(symbol.multiplier.lessThan(0)) {
                             this.negate(); //put back the sign
                        }
                    }
                    
                    //clean up
                    if(this.length === 0) this.convert(N);
                    //update the hash
                    if(this.group === CP || this.group === CB) {
                        this.updateHash();
                    }
                }
            }

            return this;
        },  
        //the insert method for addition
        attach: function(symbol) {
            if(isArray(symbol)) {
                for(var i=0; i<symbol.length; i++) this.insert(symbol[i], 'add');
                return this;
            }
            return this.insert(symbol, 'add');
        },
        //the insert method for multiplication
        combine: function(symbol) {
            if(isArray(symbol)) {
                for(var i=0; i<symbol.length; i++) this.insert(symbol[i], 'multiply');
                return this;
            }
            return this.insert(symbol, 'multiply');
        },
        /**
         * This method should be called after any major "surgery" on a symbol.
         * It updates the hash of the symbol for example if the fname of a 
         * function has changed it will update the hash of the symbol.
         */
        updateHash: function() {
            if(this.group === N) return;
            
            if(this.group === FN) {
                var contents = '',
                    args = this.args,
                    is_parens = this.fname === PARENTHESIS;
                for(var i=0; i<args.length; i++) contents += (i===0 ? '' : ',')+text(args[i]);
                var fn_name = is_parens ? '' : this.fname;
                this.value = fn_name+(is_parens ? contents : inBrackets(contents));
            }
            else if(!(this.group === S || this.group === PL)) {
                this.value = text(this, 'hash');
            }
        },
        /**
         * this function defines how every group in stored within a group of 
         * higher order think of it as the switchboard for the library. It 
         * defines the hashes for symbols. 
         */
        keyForGroup: function(group) {
            var g = this.group;
            var key; 
            
            if(g === N) {
                key = this.value;
            }
            else if(g === S || g === P) {
                if(group === PL) key = this.power.toDecimal();
                else key = this.value;
            }
            else if(g === FN) { 
                if(group === PL) key = this.power.toDecimal();
                else key = text(this, 'hash');
            }
            else if(g === PL) { 
                //if the order is reversed then we'll assume multiplication
                //TODO: possible future dilemma
                if(group === CB) key = text(this, 'hash');
                else if(group === CP) { 
                    if(this.power.equals(1)) key = this.value;
                    else key = inBrackets(text(this, 'hash'))+Settings.POWER_OPERATOR+this.power.toDecimal();
                }
                else if(group === PL) key = this.power.toString();
                else key = this.value;
                return key;
            }
            else if(g === CP) {
                if(group === CP) key = text(this, 'hash');
                if(group === PL) key = this.power.toDecimal();
                else key = this.value;
            }
            else if(g === CB) {
                if(group === PL) key = this.power.toDecimal();
                else key = text(this, 'hash');
            }
            else if(g === EX) { 
                if(group === PL) key = text(this.power);
                else key = text(this, 'hash');
            }
            
            return key;
        },
        /** 
         * Symbols are typically stored in an object which works fine for most
         * cases but presents a problem when the order of the symbols makes
         * a difference. This function simply collects all the symbols and 
         * returns them as an array. If a function is supplied then that 
         * function is called on every symbol contained within the object.
         * @returns {Array}
         */
        collectSymbols: function(fn, opt, sort_fn, expand_symbol) { 
            var collected = [];
            if(!this.symbols) collected.push(this);
            else {
                for(var x in this.symbols) {
                    var symbol = this.symbols[x];
                    if(expand_symbol && (symbol.group === PL || symbol.group === CP)) {
                        collected = collected.concat(symbol.collectSymbols());
                    }
                    else collected.push( fn ? fn(symbol, opt) : symbol );
                }
            }
            if(sort_fn === null) sort_fn = undefined; //WTF Firefox? Seriously?
            
            return collected.sort(sort_fn);//sort hopefully gives us some sort of consistency
        },
        /**
         * Returns the latex representation of the symbol
         * @returns {String}
         */
        latex: function(option) {
            return LaTeX.latex(this, option);
        },
        /**
         * Returns the text representation of a symbol
         * @returns {String}
         */
        text: function(option) {
            return text(this, option);
        },
        /**
         * Checks if the function evaluates to 1. e.g. x^0 or 1 :)
         */
        isOne: function(abs) {
            var f = abs ? 'absEquals' : 'equals';
            if(this.group === N) return this.multiplier[f](1);
            else return this.power.equals(0);
        },
        isComposite: function() {
            var g = this.group,
                pg = this.previousGroup;
            return g === CP || g === PL || pg === PL || pg === CP;
        },
        isCombination: function() {
            var g = this.group,
                pg = this.previousGroup;
            return g === CB || pg === CB;
        },
        lessThan: function(n) {
            return this.multiplier.lessThan(n);
        },
        greaterThan: function(n) {
            return this.multiplier.greaterThan(n);
        },
        /**
         * Get's the denominator of the symbol if the symbol is of class CB (multiplication)
         * with other classes the symbol is either the denominator or not. 
         * Take x^-1+x^-2. If the symbol was to be mixed such as x+x^-2 then the symbol doesn't have have an exclusive
         * denominator and has to be found by looking at the actual symbols themselves.
         */
        getDenom: function() { 
            var retval, symbol;
            symbol = this.clone();
            //e.g. 1/(x*(x+1))
            if(this.group === CB && this.power.lessThan(0))
                symbol = _.expand(symbol);

            //if the symbol already is the denominator... DONE!!!
            if(symbol.power.lessThan(0)) {
                var d = _.parse(symbol.multiplier.den);
                retval = symbol.toUnitMultiplier();
                retval.power.negate();
                retval = _.multiply(d, retval); //put back the coeff
            }
            else if(symbol.group === CB) {
                retval = _.parse(symbol.multiplier.den);
                for(var x in symbol.symbols) 
                    if(symbol.symbols[x].power < 0) 
                        retval = _.multiply(retval, symbol.symbols[x].clone().invert());
            }
            else
                retval = _.parse(symbol.multiplier.den);
            return retval;
        },
        getNum: function() {
            var retval, symbol;
            symbol = this.clone();
            //e.g. 1/(x*(x+1))
            if(symbol.group === CB && symbol.power.lessThan(0))
                symbol = _.expand(symbol);
            //if the symbol already is the denominator... DONE!!!
            if(symbol.power.greaterThan(0) && symbol.group !== CB) {
                retval = _.parse(symbol.multiplier.num);
                retval = _.multiply(retval, symbol.toUnitMultiplier()); 
            }
            else if(symbol.group === CB) {
                retval = _.parse(symbol.multiplier.num);
                for(var x in symbol.symbols) 
                    if(symbol.symbols[x].power > 0) 
                        retval = _.multiply(retval, symbol.symbols[x].clone());
            }
            else
                retval = _.parse(symbol.multiplier.num);
            return retval;
        },
        toString: function() {
            return this.text();
        }
    };
    
    function primeFactors(num) {
        if(isPrime(num)) return [num];
        var l = num, i=1, factors = [], 
            epsilon = 2.2204460492503130808472633361816E-16;
        while(i<l) {
            var quotient = num/i; 
            var whole = Math.floor(quotient);
            var remainder = quotient-whole;
            if(remainder <= epsilon && i>1) {
                if(PRIMES.indexOf(i) !== -1) factors.push(i);
                l = whole;
            }
            i++;
        }
        return factors.sort(function(a, b){return a-b;});
    };
 
    
    /**
     * This class defines the operators in nerdamer. The thinking is that with using these parameters
     * we should be able to define more operators such as the modulus operator or a boolean operator.
     * Although this initially works at the moment, it fails in some instances due to minor flaws in design which
     * will be addressed in future releases.
     * @param {char} val - The symbol of the operator
     * @param {String} fn - The function it maps to
     * @param {Integer} precedence - The precedence of the operator
     * @param {boolean} left_assoc - Is the operator left or right associative
     * @param {boolean} is_prefix - Is the operator a prefix operator
     * @param {boolean} is_postfix - Is the operator a postfix operator
     * @param {boolean} operation - The prefix or postfix operation the operator preforms if its either
     * @returns {Operator}
     */
    function Operator(val, fn, precedence, left_assoc, is_prefix, is_postfix, operation) {
        this.val = val;
        this.fn = fn;
        this.precedence = precedence;
        this.left_assoc = left_assoc;
        this.is_prefix = is_prefix;
        this.is_postfix = is_postfix || false;
        this.operation = operation;
        this.is_operator = true;
    }
    
    Operator.prototype.toString = function() {
        return this.val;
    };
    
    function Bracket(val, bracket_id, is_open, fn, typ) {
        this.val = val;
        this.bracket_id = bracket_id;
        this.open = !!is_open;
        this.fn = fn;
        this.type = typ;
    }
    
    Bracket.prototype.toString = function() {
        return this.val;
    };
    
    function Prefix(operator) {
        this.operation = operator.operation;
        this.val = operator.val;
        this.is_prefix_operator = true;
    }
    
    Prefix.prototype.toString = function() {
        return '`'+this.val;
    };
    
    //custom errors
    //thrown if trying to divide by zero
    function DivisionByZero(msg){
        this.message = msg || "";
    }
    DivisionByZero.prototype = Object.create(Error.prototype);
    //thrown in parser 
    function ParseError(msg){
        this.message = msg || "";
    }
    ParseError.prototype = Object.create(Error.prototype);
    //thrown for undefined errors
    function UndefinedError(msg){
        this.message = msg || "";
    }
    UndefinedError.prototype = Object.create(Error.prototype);
    //thrown for maximum iteration error
    function MaximumIterationsReached(msg){
        this.message = msg || "";
    }
    MaximumIterationsReached.prototype = Object.create(Error.prototype);
    
    //Uses modified Shunting-yard algorithm. http://en.wikipedia.org/wiki/Shunting-yard_algorithm
    function Parser(){
        //we want the underscore to point to this parser not the global nerdamer parser.
        var _ = this, 
            bin = {},
            constants = this.constants = {
                PI: Math.PI,
                E:  Math.E
            },
            subs = {
                e:  Math.E,
                pi: Math.PI
            };
            
        var complex = {
            prec: undefined,
            cos: function(r, i) {
                var re, im;
                re = _.parse(Math.cos(r)*Math.cosh(i));
                im = _.parse(Math.sin(r)*Math.sinh(i));
                return _.subtract(re, _.multiply(im, Symbol.imaginary()));
            },
            sin: function(r, i) {
                var re, im;
                re = _.parse(Math.sin(r)*Math.cosh(i));
                im = _.parse(Math.cos(r)*Math.sinh(i));
                return _.subtract(re, _.multiply(im, Symbol.imaginary()));
            },
            tan: function(r, i) {
                var re, im;
                re = _.parse(Math.sin(2*r)/(Math.cos(2*r)+Math.cosh(2*i)));
                im = _.parse(Math.sinh(2*i)/(Math.cos(2*r)+Math.cosh(2*i)));
                return _.add(re, _.multiply(im, Symbol.imaginary()));
            },
            sec: function(r, i) {
                var t = this.removeDen(this.cos(r, i));
                return _.subtract(t[0], _.multiply(t[1], Symbol.imaginary()));
            },
            csc: function(r, i) { 
                var t = this.removeDen(this.sin(r, i));
                return _.add(t[0], _.multiply(t[1], Symbol.imaginary()));
            },
            cot: function(r, i) {
                var t = this.removeDen(this.tan(r, i));
                return _.subtract(t[0], _.multiply(t[1], Symbol.imaginary()));
            },
            acos: function(r, i) { 
                var symbol, sq, a, b, c;
                symbol = this.fromArray([r, i]);
                sq = _.expand(_.pow(symbol.clone(), new Symbol(2))); //z*z
                a = _.multiply(sqrt(_.subtract(new Symbol(1), sq)), Symbol.imaginary());
                b = _.expand(_.add(symbol.clone(), a));
                c = log(b);
                return _.expand(_.multiply(Symbol.imaginary().negate(), c));
            },
            asin: function(r, i) {
                return _.subtract(_.parse('pi/2'), this.acos(r, i));
            },
            atan: function(r, i) {
                var a, b, c, symbol;
                symbol = complex.fromArray([r, i]);
                a = _.expand(_.multiply(Symbol.imaginary(), symbol.clone()));
                b = log(_.expand(_.subtract(new Symbol(1), a.clone())));
                c = log(_.expand(_.add(new Symbol(1), a.clone())));
                return _.expand(_.multiply(_.divide(Symbol.imaginary(), new Symbol(2)), _.subtract(b, c)));
            },
            asec: function(r, i) {
                var d = this.removeDen([r, i]);
                d[1].negate();
                return this.acos.apply(this, d);
            },
            acsc: function(r, i) {
                var d = this.removeDen([r, i]);
                d[1].negate();
                return this.asin.apply(this, d);
            },
            acot: function(r, i) {
                var d = this.removeDen([r, i]);
                d[1].negate();
                return this.atan.apply(this, d);
            },
            //Hyperbolic trig
            cosh: function(r, i) {
                var re, im;
                re = _.parse(Math.cosh(r)*Math.cos(i));
                im = _.parse(Math.sinh(r)*Math.sin(i));
                return _.add(re, _.multiply(im, Symbol.imaginary()));
            },
            sinh: function(r, i) {
                var re, im;
                re = _.parse(Math.sinh(r)*Math.cos(i));
                im = _.parse(Math.cosh(r)*Math.sin(i));
                return _.add(re, _.multiply(im, Symbol.imaginary()));
            },
            tanh: function(r, i) {
                var re, im;
                re = _.parse(Math.sinh(2*r)/(Math.cos(2*i)+Math.cosh(2*r)));
                im = _.parse(Math.sin(2*i)/(Math.cos(2*i)+Math.cosh(2*r)));
                return _.subtract(re, _.multiply(im, Symbol.imaginary()));
            },
            sech: function(r, i) {
                var t = this.removeDen(this.cosh(r, i));
                return _.subtract(t[0], _.multiply(t[1], Symbol.imaginary()));
            },
            csch: function(r, i) {
                var t = this.removeDen(this.sinh(r, i));
                return _.subtract(t[0], _.multiply(t[1], Symbol.imaginary()));
            },
            coth: function(r, i) {
                var t = this.removeDen(this.tanh(r, i));
                return _.add(t[0], _.multiply(t[1], Symbol.imaginary()));
            },
            acosh: function(r, i) {
                var a, b, z;
                z = this.fromArray([r, i]);
                a = sqrt(_.add(z.clone(), new Symbol(1)));
                b = sqrt(_.subtract(z.clone(), new Symbol(1)));
                return _.expand(log(_.add(z, _.expand(_.multiply(a, b)))));
            },
            asinh: function(r, i) {
                var a, z;
                z = this.fromArray([r, i]);
                a = sqrt(_.add(new Symbol(1), _.expand(_.pow(z.clone(), new Symbol(2)))));
                return _.expand(log(_.add(z, a)));
            },
            atanh: function(r, i) {
                var a, b, z;
                z = this.fromArray([r, i]);
                a = log(_.add(z.clone(), new Symbol(1)));
                b = log(_.subtract(new Symbol(1), z));
                return _.expand(_.divide(_.subtract(a, b), new Symbol(2)));
            },
            asech: function(r, i) {
                var t = this.removeDen([r, i]);
                t[1].negate();
                return this.acosh.apply(this, t);
            },
            acsch: function(r, i) {
                var t = this.removeDen([r, i]);
                t[1].negate();
                return this.asinh.apply(this, t);
            },
            acoth: function(r, i) {
                var t = this.removeDen([r, i]);
                t[1].negate();
                return this.atanh.apply(this, t);
            },
            sqrt: function(symbol) {
                var re, im, h, a, d;
                re = symbol.realpart();
                im = symbol.imagpart();
                h = Symbol.hyp(re, im);
                a = _.add(re.clone(), h);
                d = sqrt(_.multiply(new Symbol(2), a.clone()));
                return _.add(_.divide(a.clone(), d.clone()), _.multiply(_.divide(im, d), Symbol.imaginary()));
            },
            log: function(r, i) {
                var re, im;
                re = log(Symbol.hyp(r, i));
                im = _.parse(Math.atan2(i, r));
                return _.add(re, _.multiply(Symbol.imaginary(), im));
            },
            removeDen: function(symbol) {
                var den, r, i, re, im;
                if(isArray(symbol)) {
                    r = symbol[0];
                    i = symbol[1];
                }
                else {
                    r = symbol.realpart();
                    i = symbol.imagpart();
                }
                    
                den = Math.pow(r, 2)+Math.pow(i, 2);
                re = _.parse(r/den);
                im = _.parse(i/den);
                return [re, im];
            },
            fromArray: function(arr) {
                return _.add(arr[0], _.multiply(Symbol.imaginary(), arr[1]));
            },
            evaluate: function(symbol, f) {
                var re, im, sign;
                    
                sign = symbol.power.sign();
                //remove it from under the denominator
                symbol.power = symbol.power.abs();
                //expand
                if(symbol.power.greaterThan(1))
                    symbol = _.expand(symbol);
                //remove the denominator
                if(sign < 0) {
                    var d = this.removeDen(symbol);
                    re = d[0];
                    im = d[1];
                }
                else {
                    re = symbol.realpart();
                    im = symbol.imagpart();
                }

                if(re.isConstant('all') && im.isConstant('all'))
                    return this[f].call(this, re, im);
                return _.symfunction(f, [symbol]);
            }
        };
            
        var trig = this.Trig = {
            //container for trigonometric function
            cos: function(symbol) { 
                if(symbol.equals('pi') && symbol.multiplier.den.equals(2))
                    return new Symbol(0);
                
                if(Settings.PARSE2NUMBER) { 
                    if(symbol.equals(new Symbol(Math.PI/2)))
                        return new Symbol(0);
                    if(symbol.isConstant()) 
                        return new Symbol(Math.cos(symbol.valueOf()));
                    if(symbol.isImaginary()) {
                        return complex.evaluate(symbol, 'cos');
                    }
                }
                if(symbol.equals(0))
                    return new Symbol(1);
                
                var retval, 
                    c = false,
                    q = getQuadrant(symbol.multiplier.toDecimal()),
                    m = symbol.multiplier.abs();
                symbol.multiplier = m;

                if(symbol.isPi() && symbol.isLinear()) { 
                    //return for 1 or -1 for multiples of pi
                    if(isInt(m)) {
                        retval  = new Symbol(even(m) ? 1 : -1);
                    } 
                    else {
                        var n = Number(m.num), d = Number(m.den);
                        if(d === 2) retval = new Symbol(0);
                        else if(d === 3) {
                            retval = _.parse('1/2'); c = true;
                        }
                        else if(d === 4) {
                            retval = _.parse('1/sqrt(2)'); c = true;
                        }
                        else if(d === 6) {
                            retval = _.parse('sqrt(3)/2'); c = true;
                        }
                        else retval = _.symfunction('cos', [symbol]);
                    }
                }

                if(c && (q === 2 || q === 3)) retval.negate();

                if(!retval) retval = _.symfunction('cos', [symbol]);

                return retval;
            },
            sin: function(symbol) { 
                if(Settings.PARSE2NUMBER) {
                    if(symbol.isConstant()) 
                        return new Symbol(Math.sin(symbol.valueOf()));
                    if(symbol.isImaginary()) 
                        return complex.evaluate(symbol, 'sin');
                }
                
                if(symbol.equals(0))
                    return new Symbol(0);
                
                var retval, 
                    c = false,
                    q = getQuadrant(symbol.multiplier.toDecimal()),
                    sign = symbol.multiplier.sign(),
                    m = symbol.multiplier.abs();
                symbol.multiplier = m;
                if(symbol.equals('pi'))
                    retval = new Symbol(0);
                else if(symbol.isPi() && symbol.isLinear()) { 
                    //return for 0 for multiples of pi
                    if(isInt(m)) {
                        retval  = new Symbol(0);
                    } 
                    else {
                        var n = m.num, d = m.den;
                        if(d == 2) {
                            retval = new Symbol(1); c = true;
                        }
                        else if(d == 3) {
                            retval = _.parse('sqrt(3)/2'); c = true
                        }
                        else if(d == 4) {
                            retval = _.parse('1/sqrt(2)'); c = true;
                        }
                        else if(d == 6) {
                            retval = _.parse('1/2'); c = true;
                        }
                        else retval = _.symfunction('sin', [symbol]);
                    }
                }

                if(!retval) retval = _.multiply(new Symbol(sign), _.symfunction('sin', [symbol]));

                if(c && (q === 3 || q === 4)) retval.negate();

                return retval;
            },
            tan: function(symbol) {
                if(Settings.PARSE2NUMBER) {
                    if(symbol.isConstant())
                        return new Symbol(Math.tan(symbol.valueOf()));
                    if(symbol.isImaginary()) 
                        return complex.evaluate(symbol, 'tan');
                }
                var retval, 
                    c = false,
                    q = getQuadrant(symbol.multiplier.toDecimal()),
                    m = symbol.multiplier;

                symbol.multiplier = m;

                if(symbol.isPi() && symbol.isLinear()) { 
                    //return 0 for all multiples of pi
                    if(isInt(m)) {
                        retval  = new Symbol(0);
                    } 
                    else {
                        var n = m.num, d = m.den;
                        if(d == 2) 
                            throw new UndefinedError('tan is undefined for '+symbol.toString());
                        else if(d == 3) {
                            retval = _.parse('sqrt(3)'); c = true;
                        }
                        else if(d == 4) {
                            retval = new Symbol(1); c = true;
                        }
                        else if(d == 6) {
                            retval = _.parse('1/sqrt(3)'); c = true;
                        }
                        else retval = _.symfunction('tan', [symbol]);
                    }
                }

                if(!retval) retval = _.symfunction('tan', [symbol]);

                if(c && (q === 2 || q === 4)) retval.negate();

                return retval;
            },
            sec: function(symbol) {
                if(Settings.PARSE2NUMBER) {
                    if(symbol.isConstant())
                        return new Symbol(Math2.sec(symbol.valueOf()));
                    if(symbol.isImaginary()) 
                        return complex.evaluate(symbol, 'sec');
                }

                var retval, 
                    c = false,
                    q = getQuadrant(symbol.multiplier.toDecimal()),
                    m = symbol.multiplier.abs();
                symbol.multiplier = m;

                if(symbol.isPi() && symbol.isLinear()) { 
                    //return for 1 or -1 for multiples of pi
                    if(isInt(m)) {
                        retval  = new Symbol(even(m) ? 1 : -1);
                    } 
                    else {
                        var n = m.num, d = m.den;
                        if(d == 2) 
                            throw new UndefinedError('sec is undefined for '+symbol.toString());
                        else if(d == 3) {
                            retval = new Symbol(2); c = true;
                        }
                        else if(d == 4) {
                            retval = _.parse('sqrt(2)'); c = true;
                        }
                        else if(d == 6) {
                            retval = _.parse('2/sqrt(3)'); c = true;
                        }
                        else retval = _.symfunction('sec', [symbol]);
                    }
                }

                if(c && (q === 2 || q === 3)) retval.negate();

                if(!retval) retval = _.symfunction('sec', [symbol]);

                return retval;
            },
            csc: function(symbol) {
                if(Settings.PARSE2NUMBER) {
                    if(symbol.isConstant())
                        return new Symbol(Math2.csc(symbol.valueOf()));
                    if(symbol.isImaginary()) 
                        return complex.evaluate(symbol, 'csc');
                }
                
                var retval, 
                    c = false,
                    q = getQuadrant(symbol.multiplier.toDecimal()),
                    m = symbol.multiplier.abs();

                symbol.multiplier = m;

                if(symbol.isPi() && symbol.isLinear()) { 
                    //return for 0 for multiples of pi
                    if(isInt(m)) {
                        throw new UndefinedError('csc is undefined for '+symbol.toString());
                    } 
                    else {
                        var n = m.num, d = m.den;
                        if(d == 2) {
                            retval = new Symbol(1); c = true;
                        }
                        else if(d == 3) {
                            retval = _.parse('2/sqrt(3)'); c = true
                        }
                        else if(d == 4) {
                            retval = _.parse('sqrt(2)'); c = true;
                        }
                        else if(d == 6) {
                            retval = new Symbol(2); c = true;
                        }
                        else retval = _.symfunction('csc', [symbol]);
                    }
                }

                if(!retval) retval = _.symfunction('csc', [symbol]);

                if(c && (q === 3 || q === 4)) retval.negate();

                return retval;
            },
            cot: function(symbol) {
                if(Settings.PARSE2NUMBER) {
                    if(symbol.isConstant())
                        return new Symbol(Math2.cot(symbol.valueOf()));
                    if(symbol.isImaginary()) 
                        return complex.evaluate(symbol, 'cot');
                }
                var retval, 
                    c = false,
                    q = getQuadrant(symbol.multiplier.toDecimal()),
                    m = symbol.multiplier;

                symbol.multiplier = m;

                if(symbol.isPi() && symbol.isLinear()) { 
                    //return 0 for all multiples of pi
                    if(isInt(m)) {
                        throw new UndefinedError('cot is undefined for '+symbol.toString());
                    } 
                    else {
                        var n = m.num, d = m.den;
                        if(d == 2) retval = new Symbol(0);
                        else if(d == 3) {
                            retval = _.parse('1/sqrt(3)'); c = true;
                        }
                        else if(d == 4) {
                            retval = new Symbol(1); c = true;
                        }
                        else if(d == 6) {
                            retval = _.parse('sqrt(3)'); c = true;
                        }
                        else retval = _.symfunction('cot', [symbol]);
                    }
                }

                if(!retval) retval = _.symfunction('cot', [symbol]);

                if(c && (q === 2 || q === 4)) retval.negate();

                return retval;
            },
            acos: function(symbol) {
                if(Settings.PARSE2NUMBER) {
                    if(symbol.isConstant())
                        return new Symbol(Math.acos(symbol.valueOf()));
                    if(symbol.isImaginary()) 
                        return complex.evaluate(symbol, 'acos');
                }
                return _.symfunction('acos', arguments);
            },
            asin: function(symbol) {
                if(Settings.PARSE2NUMBER) {
                    if(symbol.isConstant())
                        return new Symbol(Math.asin(symbol.valueOf()));
                    if(symbol.isImaginary()) 
                        return complex.evaluate(symbol, 'asin');
                }
                return _.symfunction('asin', arguments);
            },
            atan: function(symbol) {
                var retval;
                if(symbol.equals(0))
                    retval = new Symbol(0);
                else if(Settings.PARSE2NUMBER) {
                    if(symbol.isConstant())
                        return new Symbol(Math.atan(symbol.valueOf()));
                    if(symbol.isImaginary()) 
                        return complex.evaluate(symbol, 'atan');
                }
                else if(symbol.equals(-1))
                    retval = _.parse('-pi/4');
                else 
                    retval = _.symfunction('atan', arguments);
                return retval;
            },
            asec: function(symbol) {
                if(Settings.PARSE2NUMBER) {
                    if(symbol.isConstant())
                        return new Symbol(Math.acos(symbol.invert().valueOf()));
                    if(symbol.isImaginary()) 
                        return complex.evaluate(symbol, 'asec');
                }
                return _.symfunction('asec', arguments);
            },
            acsc: function(symbol) {
                if(Settings.PARSE2NUMBER) {
                    if(symbol.isConstant())
                        return new Symbol(Math.acos(symbol.invert().valueOf()));
                    if(symbol.isImaginary()) 
                        return complex.evaluate(symbol, 'acsc');
                }
                return _.symfunction('acsc', arguments);
            },
            acot: function(symbol) {
                var retval;
                if(Settings.PARSE2NUMBER) {
                    if(symbol.isImaginary()) {
                        retval = complex.evaluate(symbol, 'acot');
                    }
                    else {
                        var k = _.parse('pi/2');
                        if(symbol.equals(0))
                            retval = k;
                        else {
                            if(symbol.lessThan(0))
                                k.negate();
                            retval = _.subtract(k, trig.atan(symbol));
                        }
                    }
                }
                else 
                    retval = _.symfunction('acot', arguments);
                return retval;    
            },
            atan2: function(a, b) {
                if(a.equals(0) && b.equals(0))
                    throw new UndefinedError('atan2 is undefined for 0, 0');
                
                if(Settings.PARSE2NUMBER && a.isConstant() && b.isConstant()) {
                    return new Symbol(Math.atan2(a, b));
                }
                return _.symfunction('atan2', arguments);
            }
        };
        this.trig = trig;
        
        var trigh = this.Trigh = {
            //container for hyperbolic trig function
            cosh: function(symbol) {
                var retval;
                if(Settings.PARSE2NUMBER) { 
                    if(symbol.isConstant()) 
                        return new Symbol(Math.cosh(symbol.valueOf()));
                    if(symbol.isImaginary()) {
                        return complex.evaluate(symbol, 'cosh');
                    }
                }
                
                return retval = _.symfunction('cosh', arguments);
            },
            sinh: function(symbol) {
                var retval;
                if(Settings.PARSE2NUMBER) { 
                    if(symbol.isConstant()) 
                        return new Symbol(Math.sinh(symbol.valueOf()));
                    if(symbol.isImaginary()) {
                        return complex.evaluate(symbol, 'sinh');
                    }
                }
                
                return retval = _.symfunction('sinh', arguments);
            },
            tanh: function(symbol) {
                var retval;
                if(Settings.PARSE2NUMBER) { 
                    if(symbol.isConstant()) 
                        return new Symbol(Math.tanh(symbol.valueOf()));
                    if(symbol.isImaginary()) {
                        return complex.evaluate(symbol, 'tanh');
                    }
                }
                
                return retval = _.symfunction('tanh', arguments);
            },
            sech: function(symbol) {
                var retval;
                if(Settings.PARSE2NUMBER) { 
                    if(symbol.isConstant()) 
                        return new Symbol(Math.sech(symbol.valueOf()));
                    if(symbol.isImaginary()) {
                        return complex.evaluate(symbol, 'sech');
                    }
                }
                
                return retval = _.symfunction('sech', arguments);
            },
            csch: function(symbol) {
                var retval;
                if(Settings.PARSE2NUMBER) { 
                    if(symbol.isConstant()) 
                        return new Symbol(Math.csch(symbol.valueOf()));
                    if(symbol.isImaginary()) {
                        return complex.evaluate(symbol, 'csch');
                    }
                }
                
                return retval = _.symfunction('csch', arguments);
            },
            coth: function(symbol) {
                var retval;
                if(Settings.PARSE2NUMBER) { 
                    if(symbol.isConstant()) 
                        return new Symbol(Math.coth(symbol.valueOf()));
                    if(symbol.isImaginary()) {
                        return complex.evaluate(symbol, 'coth');
                    }
                }
                
                return retval = _.symfunction('coth', arguments);
            },
            acosh: function(symbol) {
                var retval;
                if(Settings.PARSE2NUMBER && symbol.isImaginary())
                    retval = complex.evaluate(symbol, 'acosh');
                else if(Settings.PARSE2NUMBER) 
                    retval = evaluate(_.parse(format('log(({0})+sqrt(({0})^2-1))', symbol.toString())));
                else 
                    retval = _.symfunction('acosh', arguments);
                return retval;
            },
            asinh: function(symbol) {
                var retval;
                if(Settings.PARSE2NUMBER && symbol.isImaginary())
                    retval = complex.evaluate(symbol, 'asinh');
                else if(Settings.PARSE2NUMBER)
                    retval = evaluate(_.parse(format('log(({0})+sqrt(({0})^2+1))', symbol.toString())));
                else 
                    retval = _.symfunction('asinh', arguments);
                return retval;
            },
            atanh: function(symbol) {
                var retval;
                if(Settings.PARSE2NUMBER && symbol.isImaginary())
                    retval = complex.evaluate(symbol, 'atanh');
                else if(Settings.PARSE2NUMBER) { 
                    retval = evaluate(_.parse(format('(1/2)*log((1+({0}))/(1-({0})))', symbol.toString())));
                }
                else 
                    retval = _.symfunction('atanh', arguments);
                return retval;
            },
            asech: function(symbol) {
                var retval;
                if(Settings.PARSE2NUMBER && symbol.isImaginary())
                    retval = complex.evaluate(symbol, 'asech');
                else if(Settings.PARSE2NUMBER)
                    retval = evaluate(log(_.add(symbol.clone().invert(), sqrt(_.subtract(_.pow(symbol, new Symbol(-2)), new Symbol(1))))));
                else 
                    retval = _.symfunction('asech', arguments);
                return retval;
            },
            acsch: function(symbol) {
                var retval;
                if(Settings.PARSE2NUMBER && symbol.isImaginary())
                    retval = complex.evaluate(symbol, 'acsch');
                else if(Settings.PARSE2NUMBER)
                    retval = evaluate(_.parse(format('log((1+sqrt(1+({0})^2))/({0}))', symbol.toString())));
                else 
                    retval = _.symfunction('acsch', arguments);
                return retval;
            },
            acoth: function(symbol) {
                var retval;
                if(Settings.PARSE2NUMBER && symbol.isImaginary())
                    retval = complex.evaluate(symbol, 'acoth');
                else if(Settings.PARSE2NUMBER) {
                    if(symbol.equals(1))
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
        this.trigh = trigh;
        
        //list all the supported operators
        var operators = this.operators = {
                '^' : new Operator('^', 'pow', 6, false, false),
                '**' : new Operator('**', 'pow', 6, false, false),
                '!!' : new Operator('!!', 'dfactorial',5, false, false, true, function(e) {
                    return _.symfunction(DOUBLEFACTORIAL, [e]); //wrap it in a factorial function
                }),
                '!' : new Operator('!', 'factorial', 5, false, false, true, function(e) {
                    return factorial(e); //wrap it in a factorial function
                }),  
                //done with crazy fix
                '*' : new Operator('*', 'multiply', 4, true, false),
                '/' : new Operator('/', 'divide', 4, true, false),
                '%' : new Operator('%', 'percent', 4, true, false, true, function(e) {
                    return _.percent(e);
                }),
                '%+' : new Operator('%+', 'percent_add', 2, true, false),
                '%-' : new Operator('%-', 'percent_subtract', 3, true, false),
                '+' : new Operator('+', 'add', 3, true, true, false, function(e) {
                    return e;
                }),
                '-' : new Operator('-', 'subtract', 3, true, true, false, function(e) {
                    return e.negate();
                }),
                //begin crazy fix ... :( TODO!!! revisit
                '!+' : new Operator('!+', 'factadd', 3, true, true, false),
                '!!+' : new Operator('!!+', 'dfactadd', 3, true, true, false),
                '!-' : new Operator('!-', 'factsub', 3, true, true, false),
                '!!-' : new Operator('!!-', 'dfactsub', 3, true, true, false),
                '=' : new Operator('=', 'equals', 2, true, false),
                '==' : new Operator('==', 'eq', 1, false, false),
                '<' : new Operator('<', 'lt', 1, false, false),
                '<=' : new Operator('<=', 'lte', 1, false, false),
                '>' : new Operator('>', 'gt', 1, false, false),
                '>=' : new Operator('>=', 'gte', 1, false, false),
                ',' : new Operator(',', 'comma', 0, true, false)
            },
            //list of supported brackets
            brackets = {
                '(': new Bracket('(', 0, true, null, 'round'),
                ')': new Bracket(')', 0, false, null, 'round'),
                '[': new Bracket('[', 1, true, function() {
                    var f = new Symbol('vector');
                    f.is_function = true;
                    return f;
                }, 'square'),
                ']': new Bracket(']', 1, false, null, 'square')
            },
            // Supported functions.
            // Format: function_name: [mapped_function, number_of_parameters]
            functions = this.functions = {
                'cos'               : [ trig.cos, 1],
                'sin'               : [ trig.sin, 1],
                'tan'               : [ trig.tan, 1],
                'sec'               : [ trig.sec, 1],
                'csc'               : [ trig.csc, 1],
                'cot'               : [ trig.cot, 1],
                'acos'              : [ trig.acos, 1],
                'asin'              : [ trig.asin, 1],
                'atan'              : [ trig.atan, 1],
                'asec'              : [ trig.asec, 1],
                'acsc'              : [ trig.acsc, 1],
                'acot'              : [ trig.acot, 1],
                'atan2'             : [ trig.atan2, 2],
                'acoth'             : [ trigh.acoth, 1],
                'asech'             : [ trigh.asech, 1],
                'acsch'             : [ trigh.acsch, 1],
                'sinh'              : [ trigh.sinh, 1],
                'cosh'              : [ trigh.cosh, 1],
                'tanh'              : [ trigh.tanh, 1],
                'asinh'             : [ trigh.asinh, 1],
                'sech'              : [ trigh.sech, 1],
                'csch'              : [ trigh.csch, 1],
                'coth'              : [ trigh.coth, 1],
                'acosh'             : [ trigh.acosh, 1],
                'atanh'             : [ trigh.atanh, 1],
                'log10'             : [ , 1],
                'exp'               : [ , 1],
                'min'               : [ min ,-1],
                'max'               : [ max,-1],
                'erf'               : [ , 1],
                'floor'             : [ , 1],
                'ceil'              : [ , 1],
                'trunc'             : [ , 1],
                'Si'                : [ , 1],
                'step'              : [ , 1],
                'rect'              : [ , 1],
                'sinc'              : [ , 1],
                'tri'               : [ , 1],
                'sign'              : [ sign, 1],
                'Ci'                : [ , 1],
                'Ei'                : [ , 1],
                'Shi'               : [ , 1],
                'Chi'               : [ , 1],
                'fib'               : [ , 1],
                'fact'              : [factorial, 1],
                'factorial'         : [factorial, 1],
                'dfactorial'        : [ , 1],
                'gamma_incomplete'  : [ , [1, 2]],
                'round'             : [ round, [1, 2]],
                'mod'               : [ mod, 2],
                'pfactor'           : [ pfactor , 1],
                'vector'            : [ vector, -1],
                'matrix'            : [ matrix, -1],
                'imatrix'           : [ imatrix, -1],
                'parens'            : [ parens, -1],
                'sqrt'              : [ sqrt, 1],
                'nthroot'           : [ nthroot, 2],
                'log'               : [ log , [1, 2]],
                'expand'            : [ expand , 1],
                'abs'               : [ abs , 1],
                'invert'            : [ invert, 1],
                'determinant'       : [ determinant, 1],
                'size'              : [ size, 1],
                'transpose'         : [ transpose, 1],
                'dot'               : [ dot, 2],
                'cross'             : [ cross, 2],
                'vecget'            : [ vecget, 2],
                'vecset'            : [ vecset, 3],
                'matget'            : [ matget, 3],
                'matset'            : [ matset, 4],
                'matgetrow'         : [ matgetrow, 2],
                'matsetrow'         : [ matsetrow, 3],
                'matgetcol'         : [ matgetcol, 2],
                'matsetcol'         : [ matsetcol, 3],
                'IF'                : [ IF, 3],
                //imaginary support
                'realpart'          : [ realpart, 1],
                'imagpart'          : [ imagpart, 1],
                'conjugate'         : [ conjugate, 1],
                'arg'               : [ arg, 1],
                'polarform'         : [ polarform, 1],
                'rectform'          : [ rectform, 1],
                'sort'              : [ sort, [1, 2]],
            };

        this.error = err;
        
        //this function is used to comb through the function modules and find a function given its name
        var findFunction = function(fname) {
            var fmodules = Settings.FUNCTION_MODULES,
                l = fmodules.length;
            for(var i=0; i<l; i++) {
                var fmodule = fmodules[i];
                if(fname in fmodule)
                    return fmodule[fname];
            }
            err('The function '+fname+' is undefined!');
        };

        var allNumbers = function(args) {
            for(var i=0; i<args.length; i++)
                if(args[i].group !== N)
                    return false;
            return true;
        };
        
        var allConstants = function(args) {
            for(var i=0; i<args.length; i++) {
                if(args[i].isPi() || args[i].isE())
                    continue;
                if(!args[i].isConstant(true))
                    return false;
            }
                    
            return true;
        };
        
        /**
         * This method gives the ability to override operators with new methods.
         * @param {String} which
         * @param {Function} with_what
         */
        this.override = function(which, with_what) {
            if(!bin[which]) bin[which] = [];
            bin[which].push(this[which]);
            this[which] = with_what;
        };
        
        /**
         * Restores a previously overridden operator
         * @param {String} what
         */
        this.restore = function(what) {
            if(this[what]) this[what] = bin[what].pop();
        };
        
        /**
         * This method is supposed to behave similarly to the override method but it does not override
         * the existing function rather it only extends it
         * @param {String} what
         * @param {Function} with_what
         * @param {boolean} force_call
         */
        this.extend = function(what, with_what, force_call) {
            var _ = this,
                extended = this[what];
            if(typeof extended === 'function' && typeof with_what === 'function') {
                var f = this[what];
                this[what] = function(a, b) {
                    if(isSymbol(a) && isSymbol(b) && !force_call) return f.call(_, a, b);
                    else return with_what.call(_, a, b, f);
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
        this.symfunction = function(fn_name, params) { 
            //call the proper function and return the result;
            var f = new Symbol(fn_name);
            f.group = FN;
            if(typeof params === 'object')
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
         * @returns {Symbol}
         */
        this.callfunction = function(fn_name, args, allowed_args) { 
            var fn_settings = functions[fn_name];
            
            if(!fn_settings) 
                err('Nerdamer currently does not support the function '+fn_name);
            
            var num_allowed_args = fn_settings[1] || allowed_args, //get the number of allowed arguments
                fn = fn_settings[0], //get the mapped function
                retval;
            //We want to be able to call apply on the arguments or create a symfunction. Both require
            //an array so make sure to wrap the argument in an array.
            if(!(args instanceof Array)) 
                args = args !== undefined ?  [args] : [];

            if(num_allowed_args !== -1) {
                var is_array = isArray(num_allowed_args),
                    min_args = is_array ? num_allowed_args[0] : num_allowed_args,
                    max_args = is_array ? num_allowed_args[1] : num_allowed_args,
                    num_args = args.length;
            
                var error_msg = fn_name+' requires a {0} of {1} arguments. {2} provided!';
                
                if(num_args < min_args) err(format(error_msg, 'minimum', min_args, num_args));
                if(num_args > max_args) err(format(error_msg, 'maximum', max_args, num_args));
            }

            /*
             * The following are very important to the how nerdamer constructs functions!
             * Assumption 1 - if fn is undefined then handling of the function is purely numeric. This
             *     enables us to reuse Math, Math2, ..., any function from Settings.FUNCTIONS_MODULES entry
             * Assumption 2 - if fn is defined then that function takes care of EVERYTHING including symbolics
             * Assumption 3 - if the user calls symbolics on a function that returns a numeric value then
             *     they are expecting a symbolic output.
             */
            if(!fn) { 
                //Remember assumption 1. No function defined so it MUST be numeric in nature
                fn = findFunction(fn_name); 
                if(Settings.PARSE2NUMBER && allNumbers(args)) 
                    retval = bigConvert(fn.apply(fn, args));
                else
                    retval = _.symfunction(fn_name, args);
            }
            else { 
                //Remember assumption 2. The function is defined so it MUST handle all aspects including numeric values
                retval = fn.apply(fn_settings[2], args);
            }

            return retval;
        };
        /**
         * Build a regex based on the operators currently loaded. These operators are to be ignored when 
         * substituting spaces for multiplication
         */
        this.operator_filter_regex = (function() {
            //we only want the operators which are singular since those are the ones
            //that nerdamer uses anyway
            var ostr = '^\\'+Object.keys(operators).filter(function(x) {
                if(x.length === 1)
                    return x;
            }).join('\\');
            //create a regex which captures all spaces between characters except those
            //have an operator on one end
            return new RegExp('(['+ostr+'])\\s+(['+ostr+'])');
        })();
        
        /*
         * This method parses the tree
         * @param {String[]} rpn
         * @returns {Symbol}
         */
        this.parseTree = function(rpn, subs) { 
            var q = []; // The container for parsed values
            var l = rpn.length;
            // begin parsing
            for(var i=0; i<l; i++) {
                var e = rpn[i];
                if(e.is_prefix_operator || e.is_postfix) { 
                    q.push(e.operation(q.pop()));
                    continue;
                }
                if(e.is_operator) {
                    var b = q.pop(),
                        a = q.pop();
                    if(isArray(b)) //misread function
                        _.error('Unrecognized function "'+a.value+'"');
                    if(typeof a === 'undefined' && !e.is_postfix)
                        _.error(e+' is not a valid postfix operator');
                    q.push(this[e.fn](a, b));
                }
                else if(e.value in functions) { 
                    q.push(_.callfunction(e.value, q.pop()));
                }
                else { 
                    // Blank denotes a beginning of a scope with a prefix operator so all we have to do is 
                    // convert it to a zero
                    if(e === '') {
                        q.push(new Symbol(0));
                    }
                    else {
                        var unsubbed = e;
                        // make substitutions
                        //first sub in aliases
                        if(e in Settings.ALIASES)
                            e = _.parse(Settings.ALIASES[e]);
                        //constants take higher priority
                        if(e in constants)
                            e = new Symbol(constants[e]);
                        //next subs
                        else if(e in subs) {
                            e = subs[e].clone();
                        }
                        else if(e in VARS) {
                            e = VARS[e].clone();
                        }
                        e.unsubbed = unsubbed;
                        q.push(e);
                    }
                }
            }
            
            return q[0] || new Symbol(0);
        };
        
        /**
         * This is the method that triggers the parsing of the string. It generates a parse tree but processes 
         * it right away. The operator functions are called when their respective operators are reached. For instance
         * + with cause this.add to be called with the left and right hand values. It works by walking along each 
         * character of the string and placing the operators on the stack and values on the output. When an operator
         * having a lower order than the last is reached then the stack is processed from the last operator on the 
         * stack.
         * @param {String} expression_string
         * @param {Object} substitutions
         * @returns {Symbol}
         */
        this.parse = function(expression_string, substitutions, tree) { 
            //prepare the substitutions
            if(substitutions) {
                for(var x in substitutions)
                    substitutions[x] = _.parse(substitutions[x]);
                subs = substitutions;
            }
            else
                subs = {};

            //link e and pi
            if(Settings.PARSE2NUMBER) {
                subs.e = new Symbol(Math.E);
                subs.pi = new Symbol(Math.PI);
            }

            /*
             * Since variables cannot start with a number, the assumption is made that when this occurs the
             * user intents for this to be a coefficient. The multiplication symbol in then added. The same goes for 
             * a side-by-side close and open parenthesis
             */
            var e = String(expression_string), match;
            
            //add support for spaces between variables
            while(true) { 
                match = this.operator_filter_regex.exec(e);
                if(!match)
                    break;
                try {
                    var a = match[1],
                        b = match[2];
                    validateName(a);
                    validateName(b);
                    e = e.replace(match[0], a+'*'+b);
                }
                catch(e) {
                    break;
                }
            }

            e = e.split(' ').join('')//strip empty spaces
            //replace scientific numbers
            .replace(/\d+\.*\d*e\+?\-?\d+/gi, function(x) {
                return scientificToDecimal(x);
            })
            //allow omission of multiplication after coefficients
            .replace(/([\+\-\/\*]*[0-9]+)([a-z_αAβBγΓδΔϵEζZηHθΘιIκKλΛμMνNξΞoOπΠρPσΣτTυϒϕΦχXψΨωΩ]+[\+\-\/\*]*)/gi, function() {
                var str = arguments[4],
                    group1 = arguments[1],
                    group2 = arguments[2],
                    start = arguments[3],
                    first = str.charAt(start),
                    before = '',
                    d = '*';
                if(!first.match(/[\+\-\/\*]/)) before = str.charAt(start-1);
                if(before.match(/[a-z]/i)) d = '';
                return group1+d+group2;
            })
            .replace(/([a-z0-9_]+)/gi, function(match, a) {
                if(Settings.USE_MULTICHARACTER_VARS === false && !(a in functions)) {
                    if(!isNaN(a))
                        return a;
                    return a.split('').join('*');
                }
                return a;
            })
            //allow omission of multiplication sign between brackets
            .replace( /\)\(/g, ')*(' ) || '0';
            //replace x(x+a) with x*(x+a)
            while(true) {
                var e_org = e; //store the original
                e = e.replace(/([a-z0-9_]+)(\()|(\))([a-z0-9]+)/gi, function(match, a, b, c, d) {
                    var g1 = a || c,
                        g2 = b || d;
                    if(g1 in functions) //create a passthrough for functions
                        return g1+g2;
                    return g1+'*'+g2;
                });
                //if the original equals the replace we're done
                if(e_org === e) 
                    break;
            }
            var l = e.length, //the length of the string
                output = [], //the output array. This is what's returned
                stack = [], //the operator stack
                last_pos = 0, //the location of last operator encountered
                open_brackets = [0, 0], //a counter for the open brackets
                prefix_cache = [],
                new_scope = true; //signal if we're in a new scope or not
            // This method gets and inserts the token on output as the name implies
            var get_and_insert_token = function(to_pos) {
                if(to_pos !== last_pos) { 
                    token = new Symbol(e.substring(last_pos, to_pos)); 
                    output.push(token);
                    //once we find out first token we are no longer in a new scope so flip
                    //the flag
                    new_scope = false; 
                }
            };  
            
            var verify_prefix_operator = function(operator) {
                if(!operator.is_prefix)
                    err(operator+' is not a valid prefix operator');
            };
            
            var resolve_prefix = function(prefix1, prefix2) {
                if(!prefix2)
                    return prefix1;
                if(prefix1.val === prefix2.val)
                    return new Prefix(operators['+']);
                return new Prefix(operators['-']);
            };
            
            var insert_prefix = function(prefix) {
                var sl = stack.length;
                if(sl && stack[sl-1].is_prefix_operator) 
                    stack.push(resolve_prefix(prefix, stack.pop()));
                stack.push(prefix);   
            };
            
            var collapse_prefix_cache = function(to_output) {
                if(prefix_cache.length) {
                    var prefix = prefix_cache.pop();
                    while(prefix_cache.length)
                        prefix = resolve_prefix(prefix, prefix_cache.pop());
                    if(to_output)
                        output.push(prefix);
                    else
                        stack.push(prefix);
                }
            };
            
            /*
             * We define the operator as anything that performs any form of operation. A bracket as any object that defines
             * a scope and a token as anything in between two operators. This enables us to have variables of more than one letter.
             * This function is a modified version of the Shunting-Yard algorithm to enable variable names, and compound operators.
             * operators are defined in the operator object. We walk the string and check every character. If an operator is encountered
             * then we mark it's location. We find the next operator and get the token between. 
             */
            var token, operator, start = 0, i=0;
            // start the generation of the tree
            for(var i=start; i<l; i++) {
                //the character
                var ch = e.charAt(i); 
                if(ch in operators) { 
                    // We previously defined the token to be the anything between two operators and since we an operator
                    //we can grab the token
                    get_and_insert_token(i); 
                    //mark the current position
                    var c = i; 
                    /*
                     * In order to support compound operators we assume that the following might be operator as well. We keep walking the string
                     * until we encounter a character which is no longer an operator. We define that entire sub-string an operator
                     */
                    while(e.charAt(i+1) in operators)
                        i++;

                    var end_operator = i+1;
                    //the probable operator will be the difference between c and i;
                    var pr_operator = e.substring(c, end_operator); 
                    /* 
                     * We now have to see if this operator is actually an operator or a combination of an operator and prefix operators 
                     * e.g. 3*-+-8 or x^-3. To determine this we knock off an operator one at a time until we find the matching operator.
                     * For instance if we have an operator -= and we get -=-- we knock of a minus from the back until we reach -= which will 
                     * register as a defined operator since we defined it as such
                     */
                    while(!(pr_operator in operators)) { 
                        var l2 = pr_operator.length,
                            end = l2-1,
                            prefix = operators[pr_operator.charAt(end)];
                        pr_operator = pr_operator.substring(0, end);
                        //make sure it's not a postfix operator that we're dealing with
                        try {
                            //verify that it's not a prefix operator
                            verify_prefix_operator(prefix);
                            //add the prefix to the stack
                            prefix_cache.push(new Prefix(prefix)); 
                        }
                        catch(e) {
                            //check if we're dealing with postfix operators. 
                            //Rule: compound postfix operators must be a composition of postfix operators
                            var prl = pr_operator.length, o;
                            for(var j=0; j<prl; j++) {
                                o = operators[pr_operator.charAt(j)];
                                if(!o|| o && !o.is_postfix)
                                    err(e.message);
                            }

                            //at this point we know that we have only postfix operators but they are parsed left to right
                            var rem = '';
                            do {
                                if(pr_operator === '')
                                    break; //we're done since the entire operator has been consumed
                                if(pr_operator in operators) {
                                    output.push(operators[pr_operator]);
                                    pr_operator = rem;
                                    rem = '';
                                }
                                else {
                                    var end = pr_operator.length-1;
                                    rem += pr_operator.charAt(end);
                                    pr_operator = pr_operator.substring(0, end);
                                } 
                            }
                            while(true)
                            //the actual operator is now the one we assumed to be a prefix earlier. I need to really
                            //pick better variable names :-/
                            pr_operator = prefix.val;
                            break;
                        }
                    }
                    // we now have the operator
                    operator = operators[pr_operator];
                    
                    // we mark where we find the last operator so we know where the next token begins
                    last_pos = end_operator; 
                    while(true) { 
                        var sl = stack.length,
                            los = stack[sl-1];
                        //skip prefix 
                        while(los !== undefined && los.is_prefix_operator)  {
                            los = stack[--sl-1];
                        }
                            
                        if(sl === 0 || !(operator.left_assoc && operator.precedence <= los.precedence 
                            || !operator.left_assoc && operator.precedence < los.precedence))
                            break; //nothing to do
                        output.push(stack.pop());
                    }

                    // If we're in a new scope then we're dealing with a prefix operator
                    if(new_scope) { 
                        /*
                         * There is literally no way to differentiate between a malformed expression and a properly formed one if there is no gap left 
                         * at the beginning of the scope. This is best illustrated. Take the expression 3+7- in RPN it becomes 3,7,+,-
                         * Take the expression -3+7 in RPN this become 3,7,+,- as well. The difference is that we tag the minus as
                         * a prefix in the properly formed expression. Problem solved! But wait. Imagine we have no gaps at the beginning
                         * of the scope let's say -(3+7). With no gaps this again becomes 3,7,+,- with no way to differentiate
                         * between -3+7 and -(3+7) unless the second one is written as 3,7,+, ,- where the gap denotes the end of the scope
                         */ 
                        verify_prefix_operator(operator);
                        var prefix = new Prefix(operator); 
                        //collapse the prefix cache
                        while(prefix_cache.length)
                            prefix = resolve_prefix(prefix, prefix_cache.pop());
                        insert_prefix(prefix);
                    }
                    else { 
                        //if there's already a prefix on the stack then bring it down
                        var sl = stack.length;
                        if(sl && stack[sl-1].is_prefix_operator && operator.left_assoc) 
                            //it's safe to move the prefix to output since it's at the beginning of a scope
                            output.push(stack.pop());

                        stack.push(operator);
                        //resolve the prefixes
                        collapse_prefix_cache();
                    }
                        
                }
                else if(ch in brackets) {
                    var bracket = brackets[ch]; 
                    if(bracket.open) { 
                        //mark a bracket as being opened
                        open_brackets[bracket.bracket_id]++;
                        //check if we're dealing with a function
                        if(last_pos !== i) {
                            var f = new Symbol(e.substring(last_pos, i));
                            // assume it's a function. Since a string is just an object, why not use it
                            f.is_function = true;
                            stack.push(f);
                        }   
                        if(bracket.fn)
                            stack.push(bracket.fn());
                        // We're in a new scope so signal so
                        new_scope = true;
                        stack.push(bracket);
                        //get all the prefixes at the beginning of the scope
                        last_pos = i+1; //move past the bracket
                    }
                    else {
                        //close the open bracket
                        open_brackets[bracket.bracket_id]--;
                        // We proceed to pop the entire stack to output this this signals the end of a scope. The first thing is to get the 
                        // the prefixes and then the token at the end of this scope.
                        // get the token
                        get_and_insert_token(i);
                        // And then keep popping the stack until we reach a bracket
                        while(true) {
                            var entry = stack.pop();
                            if(entry === undefined)
                                err("Missing open bracket for bracket '"+bracket+"'!");
                            //we found the matching bracket so our search is over
                            if(entry.bracket_id === bracket.bracket_id)
                                break; // We discard the closing bracket
                            else 
                                output.push(entry);
                        }
                        
                        var sl = stack.length;
                        //move the function to output
                        if(sl && stack[sl-1].is_function)
                            output.push(stack.pop());
                        
                        last_pos = i+1; //move past the bracket
                    }
                }
            }
            
            //get the last token at the end of the string
            get_and_insert_token(l);
            //collapse the stack to output
            while(stack.length)
                output.push(stack.pop());

            //check parity
            for(var i=0; i<open_brackets.length; i++) 
                if(open_brackets[i] > 0) {
                    var brkt;
                    for(bracket in brackets)
                        if(brackets[bracket].bracket_id === i && !brackets[bracket].open)
                            brkt = brackets[bracket];
                    err('Missing close bracket. Expected "'+brkt+'"!');
                }
                   
            if(tree)
                return output;
            
            return this.parseTree(output, subs);

        };
        
        /**
         * Reads a string into an array of Symbols and operators
         * @param {Symbol} symbol
         * @returns {Array}
         */
        this.toObject = function(expression_string) {
            var output = [[]], //the first one is the parent
                e = expression_string.split(' ').join(''), //remove spaces
                func_stack = [],
                lp = 0,
                target = output[0],
                token;
            var push = function(token) {
                if(token !== '')
                    target.push(new Symbol(token));
            };
            //start the conversion
            for(var i=0, l=e.length; i<l; i++) {
                var ch = e.charAt(i);
                if(ch in operators) {
                    token = e.substring(lp, i);
                    push(token);
                    target.push(ch);
                    lp = i+1;
                }
                else if(ch in brackets) { 
                    var bracket = brackets[ch];
                    if(bracket.open) {
                        //we may be dealing with a function so make 
                        func_stack.push(e.substring(lp, i));
                        target = []; //start a new scope
                        output.push(target); //add it to the chain
                        lp = i+1;    
                    }
                    else {
                        //we have a close bracket
                        token = e.substring(lp, i); //grab the token
                        push(token);
                        var o = output.pop(), //close the scope
                            f = func_stack.pop(), //grab the matching function
                            r;
                        //is it a function?
                        if(f in functions) 
                            r = _.symfunction(f, o); 
                        else if(f === '') {
                            r = o;
                            r.type = bracket.type;
                        }
                        else 
                            r = f;
                        //point to the correct target
                        target = output[output.length-1];
                        target.push(r);
                        lp = i+1; 
                    }
                }
            }
            
            push(e.substring(lp, i)); //insert the last token

            return output[0];
        };
        
        var getDx = function(arr) {
            var dx = [], e;
            for(var i=0, l=arr.length; i<l; i++) {
                e = arr.pop();
                if(e === ',')
                    return dx;
                dx.push(e);
            }
        };

        var chunkAtCommas = function(arr){
            var j, k = 0, chunks = [[]];
            for (var j = 0, l=arr.length; j<l; j++){
                if (arr[j] === ',') {
                    k++;
                    chunks[k] = [];
                } else {
                    chunks[k].push(arr[j]);
                }
            }
            return chunks;
        };
        
        var rem_brackets = function(str) {
            return str.replace(/^\\left\((.+)\\right\)$/g, function(str, a) {
                if(a) return a;
                return str;
            });
        };
        
        this.toTeX = function(expression_or_obj) { 
            var obj = typeof expression_or_obj === 'string' ? this.toObject(expression_or_obj) : expression_or_obj,
                TeX = [];
            
            if(isArray(obj)) { 
                var nobj = [], a, b, c;
                //first handle ^
                for(var i=0; i<obj.length; i++) {
                    a = obj[i];
                    
                    if(obj[i+1] === '^') {
                        b = obj[i+2];
                        nobj.push(LaTeX.braces(this.toTeX([a]))+'^'+LaTeX.braces(this.toTeX([b])));
                        i+=2;
                    }
                    else
                        nobj.push(a);
                }
                obj = nobj;
            }

            
            for(var i=0, l=obj.length; i<l; i++) {
                var e = obj[i];
                //convert * to cdot
                if(e === '*')
                    e = '\\cdot';
                
                if(isSymbol(e)) {
                    if(e.group === FN) {
                        var fname = e.fname, f;

                        if(fname === SQRT) 
                            f = '\\sqrt'+LaTeX.braces(this.toTeX(e.args));
                        else if(fname === ABS) 
                            f = LaTeX.brackets(this.toTeX(e.args), 'abs');
                        else if(fname === PARENTHESIS) 
                            f = LaTeX.brackets(this.toTeX(e.args), 'parens');
                        else if (fname === 'log10')
                            f = '\\log_{10}\\left( ' + this.toTeX(e.args) + '\\right)';
                        else if(fname === 'integrate') {
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
                                dx = this.toTeX(chunks[1]),
                                lb = this.toTeX(chunks[2]),
                                ub = this.toTeX(chunks[3]);
                            f = '\\int\\limits_{'+lb+'}^{'+ub+'} '+expr+'\\, d'+dx;

                        }
                        else if(fname === 'diff') {
                            var chunks = chunkAtCommas(e.args);
                            var dx = '', expr = LaTeX.braces(this.toTeX(chunks[0]));
                            /* Handle cases: one argument provided, we need to guess the variable, and assume n = 1 */
                            if (chunks.length == 1){
                                var vars = [];
                                for (j = 0; j < chunks[0].length; j++){
                                    if (chunks[0][j].group === 3) {
                                        vars.push(chunks[0][j].value);
                                    }
                                }
                                vars = vars.sort();
                                dx = vars.length > 0 ? ('\\frac{d}{d ' + vars[0] + '}') : '\\frac{d}{d x}';
                            }
                            /* If two arguments, we have expression and variable, we assume n = 1 */ 
                            else if (chunks.length == 2){
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
                            for (i = 0; i < e.args.length; i++){
                                if (e.args[i] === ','){
                                    j++;
                                    continue;
                                } 
                                argSplit[j].push(e.args[i]);
                            }
                            // Then build TeX string.
                            f = (fname==='sum'?'\\sum_':'\\prod_')+LaTeX.braces(this.toTeX(argSplit[1])+' = '+this.toTeX(argSplit[2]));
                            f += '^'+LaTeX.braces(this.toTeX(argSplit[3])) + LaTeX.braces(this.toTeX(argSplit[0]));
                        }
                        else if(fname === FACTORIAL || fname === DOUBLEFACTORIAL) 
                            f = this.toTeX(e.args) + (fname === FACTORIAL ? '!' : '!!');
                        else  {
                            f = LaTeX.latex(e);
                            //f = '\\mathrm'+LaTeX.braces(fname.replace(/_/g, '\\_')) + LaTeX.brackets(this.toTeX(e.args), 'parens');
                        }
                            
                        TeX.push(f);
                    } 
                    else
                        TeX.push(LaTeX.latex(e));
                }
                else if(isArray(e)) { 
                    TeX.push(LaTeX.brackets(this.toTeX(e)));
                }
                else {
                    if(e === '/') 
                        TeX.push(LaTeX.frac(rem_brackets(TeX.pop()), rem_brackets(this.toTeX([obj[++i]]))));
                    else
                        TeX.push(e);
                }
            }
            return TeX.join(' ');
        };

        /////////// ********** FUNCTIONS ********** ///////////
        /* Although parens is not a "real" function it is important in some cases when the 
         * symbol must carry parenthesis. Once set you don't have to worry about it anymore
         * as the parser will get rid of it at the first opportunity
         */
        function parens(symbol) {
            if(Settings.PARSE2NUMBER) {
                return symbol;
            }
            return _.symfunction('parens', [symbol]);
        }
        
        function abs(symbol) { 
            if(symbol.multiplier.lessThan(0)) symbol.multiplier.negate();
            if(symbol.isImaginary()) {
                var re = symbol.realpart();
                var im = symbol.imagpart();
                if(re.isConstant() && im.isConstant())
                    return sqrt(_.add(_.pow(re, new Symbol(2)), _.pow(im, new Symbol(2))));
            }
            else if(isNumericSymbol(symbol) || even(symbol.power)) {
                return symbol;
            }
            if(symbol.isComposite()) {
                var ms = [];
                symbol.each(function(x) {
                    ms.push(x.multiplier);
                });
                var gcd = Math2.QGCD.apply(null, ms);
                if(gcd.lessThan(0)) {
                    symbol.multiplier = symbol.multiplier.multiply(new Frac(-1));
                    symbol.distributeMultiplier();
                }
            }
            return _.symfunction(ABS, [symbol]);
        }
        /**
         * The factorial functions
         * @param {Symbol} symbol
         * @return {Symbol}
         */
        function factorial(symbol) { 
            var retval;
            if(Settings.PARSE2NUMBER && symbol.isConstant()) {
                if(isInt(symbol)) {
                    retval = Math2.bigfactorial(symbol);
                }
                else {
                    retval = Math2.gamma(symbol.multiplier.add(new Frac(1)).toDecimal());
                }
                
                retval = bigConvert(retval);
                return retval;
            }
            else if(symbol.equals(1/2))
                return _.parse('sqrt(pi)/2');
            return _.symfunction(FACTORIAL, [symbol]);
        };
        /**
         * The mod function
         * @param {Symbol} symbol1
         * @param {Symbol} symbol2
         * @returns {Symbol}
         */
        function mod(symbol1, symbol2) {
            if(symbol1.isConstant() && symbol2.isConstant()) {
                var retval = new Symbol(1);
                retval.multiplier = retval.multiplier.multiply(symbol1.multiplier.mod(symbol2.multiplier));
                return retval;
            }
            //try to see if division has remainder of zero
            var r = _.divide(symbol1.clone(), symbol2.clone());
            if(isInt(r))
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
        function IF(condition, a, b) { 
            if(typeof condition !== 'boolean')
                if(isNumericSymbol(condition))
                    condition = !!Number(condition);
            if(condition) 
                return a;
            return b;
        }

        /**
         * The square root function
         * @param {Symbol} symbol
         * @returns {Symbol}
         */
        function sqrt(symbol) { 
            if(symbol.fname === '' && symbol.power.equals(1))
                symbol = symbol.args[0];
            
            if(Settings.PARSE2NUMBER) {
                if(symbol.isConstant() && !symbol.multiplier.lessThan(0)) {
                    return new Symbol(Math.sqrt(symbol.multiplier.toDecimal()));
                }
                else if(symbol.isImaginary()) {
                    return complex.sqrt(symbol);
                }
            } 

            var img, retval, 
                isConstant = symbol.isConstant();
        
            if(symbol.group === CB && symbol.isLinear()) {
                var m = sqrt(Symbol(symbol.multiplier));
                for(var s in symbol.symbols) { 
                    var x = symbol.symbols[s];
                    var is_inv = false;
                    if(x.power.lessThan(0)) {
                        x.power.abs();
                        is_inv = true;
                    }
                    var sqrtx = sqrt(x);
                    if(is_inv)
                        sqrtx.invert();
                    m = _.multiply(m, sqrtx);
                }

                retval = m;
            }
            //if the symbol is already sqrt then it's that symbol^(1/4) and we can unwrap it
            else if(symbol.fname === SQRT) { 
                var s = symbol.args[0];
                var ms = symbol.multiplier;
                s.setPower(symbol.power.multiply(new Frac(0.25)));
                retval = s;
                //grab the multiplier
                if(!ms.equals(1))
                    retval = _.multiply(sqrt(_.parse(ms)), retval);
            }
            //if the symbol is a fraction then we don't keep can unwrap it. For instance
            //no need to keep sqrt(x^(1/3))
            else if(!symbol.power.isInteger()) { 
                symbol.setPower(symbol.power.multiply(new Frac(0.5)));
                retval = symbol;
            }
            else { 
                //if the symbols is imagary then we place in the imaginary part. We'll return it 
                //as a product
                if(isConstant && symbol.multiplier.lessThan(0)) {
                    img = Symbol.imaginary();
                    symbol.multiplier = symbol.multiplier.abs();
                }

                var q = symbol.multiplier.toDecimal(),
                    qa = Math.abs(q),
                    t = Math.sqrt(qa);

                var m;
                //it's a perfect square so take the square
                if(isInt(t)) { 
                    m = new Symbol(t);
                }
                else if(isInt(q)) { 
                    var factors = Math2.ifactor(q);
                    var tw = 1;
                    for(var x in factors) {
                        var n = factors[x],
                            nn = (n - (n%2)); //get out the whole numbers
                        if(nn) { //if there is a whole number ...
                            var w = Math.pow(x, nn);
                            tw *= Math.pow(x, nn/2); //add to total wholes
                            q /= w; //reduce the number by the wholes
                        }
                    }
                    m = _.multiply(_.symfunction(SQRT, [new Symbol(q)]), new Symbol(tw));
                }
                else {
                    var n = symbol.multiplier.num.toString(),
                        d = symbol.multiplier.den.toString(),
                        sqrtN = Math.sqrt(n),
                        sqrtD = Math.sqrt(d);
                
                    m = _.multiply(
                            n === '1' ? new Symbol(1) : isInt(sqrtN) ? new Symbol(sqrtN) : _.symfunction(SQRT, [new Symbol(n)]), 
                            d === '1' ? new Symbol(1) : isInt(sqrtD) ? new Symbol(sqrtD).invert() : _.symfunction(SQRT, [new Symbol(d)]).invert()
                    );
                }

                
                //strip the multiplier since we already took the sqrt
                symbol = symbol.toUnitMultiplier(true);
                //if the symbol is one just return one and not the sqrt function
                if(symbol.isOne()) {
                    retval = symbol;
                }
                else if(even(symbol.power.toString())) { 
                    //just raise it to the 1/2
                    retval = _.pow(symbol.clone(), new Symbol(0.5));
                }
                else { 
                    retval = _.symfunction(SQRT, [symbol]);
                }

                if(m) retval = _.multiply(m, retval);

                if(img) retval = _.multiply(img, retval);
            }

            return retval;
        }
        this.sqrt = sqrt;
        /**
         * 
         * @param {Symbol} num - the number being raised
         * @param {Symbol} p - the exponent
         * @param {type} prec - the precision wanted
         * @param {bool} asbig - true if a bigDecimal is wanted
         * @returns {Symbol}
         */
        //TODO: this method needs serious optimization
        function nthroot(num, p, prec, asbig) { 
            if(typeof asbig === 'undefined') 
                asbig = true;
            prec = prec || 25;
            if(!isSymbol(p))
                p = _.parse(p);
            if(isInt(num) && p.isConstant()) { 
                var sign = num.sign(),
                    x;
                num = abs(num); //remove the sign
                var idx = num+'-'+p;
                if(idx in Settings.CACHE.roots) {
                    x = new bigInt(Settings.CACHE.roots[idx]);
                    if(!even(p))
                        x = x.multiply(sign);
                }
                else {
                    if(num < 18446744073709551616) //2^64
                        x = Frac.create(Math.pow(num, 1/p));
                    else
                        x = Math2.nthroot(num, p);
                }
                if(isInt(x) || Settings.PARSE2NUMBER) {
                    if(asbig)
                        return new Symbol(x);
                    return new Symbol(x.toDecimal(prec));
                }
            }
            
            if(Number(p) === 2)
                return _.sqrt(num);
            
            return _.symfunction('nthroot', arguments);
        }
          
        this.nthroot = nthroot;
        
        function pfactor(symbol) { 
            //Fix issue #298
            if(symbol.equals(Math.PI))
                return new Symbol(Math.PI);
            //evaluate the symbol to merge constants
            symbol = evaluate(symbol.clone());
            
            
            if(symbol.isConstant()) {
                var retval = new Symbol(1);
                var m = symbol.toString();
                if(isInt(m)) { 
                    var factors = Math2.ifactor(m);
                    for(var factor in factors) {
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
            if(re.isConstant() && im.isConstant())
                return new Symbol(Math.atan2(im, re));
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
                if(h.equals(f.a)) {
                    return _.add(d, _.multiply(Symbol.imaginary(), n));
                }
                else {
                    return original;
                }
            }
            catch(e){
                return original;
            }    
        }

        function symMinMax(f, args) {
            args.map(function(x) {
                x.numVal = evaluate(x).multiplier;
            });
            var l, a, b, a_val, b_val;
            while(true) {
                l = args.length;
                if(l < 2) return args[0];
                a = args.pop();
                b = args[l-2];
                if(f === 'min' ? a.numVal < b.numVal : a.numVal > b.numVal) {
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
            if(allSame(args))
                return args[0];
            if(allNumbers(args))
                return new Symbol(Math.max.apply(null, args));
            if(Settings.SYMBOLIC_MIN_MAX && allConstants(args)) 
                return symMinMax('max', args);
            return _.symfunction('max', args);
        }
        
        /**
         * Returns minimum of a set of numbers
         * @returns {Symbol}
         */
        function min() {
            var args = [].slice.call(arguments);
            if(allSame(args))
                return args[0];
            if(allNumbers(args))
                return new Symbol(Math.min.apply(null, args));
            if(Settings.SYMBOLIC_MIN_MAX && allConstants(args)) 
                return symMinMax('min', args);
            return _.symfunction('min', args);
        }
        
        /**
         * Returns the sign of a number
         * @param {Symbol} x
         * @returns {Symbol}
         */
        function sign(x) {
            if(x.isConstant(true))
                return new Symbol(Math.sign(evaluate(x)));
            return _.symfunction('sign', arguments);
        }
        
        function sort(symbol, opt) {
            opt = opt ? opt.toString() : 'asc'; 
            var getval = function(e) {
                if(e.group === N)
                    return e.multiplier;
                if(e.group === FN) {
                    if(e.fname === '')
                        return getval(e.args[0]);
                    return e.fname;
                }
                if(e.group === S)
                    return e.power;
                
                return e.value;
            };
            var symbols = isVector(symbol) ? symbol.elements : symbol.collectSymbols();
            return new Vector(symbols.sort(function(a, b) {
                var aval = getval(a),
                    bval = getval(b);
                if(opt === 'desc')
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
            var retval;
            if(symbol.fname === SQRT && symbol.multiplier.equals(1)) {
                return _.divide(log(symbol.args[0]), new Symbol(2));
            }
            
            //log(0) is undefined so complain
            if(symbol.equals(0)) {
                throw new UndefinedError('log(0) is undefined!');
            }
            
            //deal with imaginary values
            if(symbol.isImaginary()) {
                return complex.evaluate(symbol, 'log');
                /*
                var a = format('log(sqrt(({0})^2+({1})^2))-({2})*atan2(({1}),({0}))', symbol.imagpart(), symbol.realpart(), Settings.IMAGINARY),
                    b = format('({0})*PI/2', Settings.IMAGINARY);

                return _.add(_.parse(a), _.parse(b));
                */
            }
            
            if(symbol.isConstant() && typeof base !== 'undefined' && base.isConstant()) {
                /*
                var log_sym = Math2.bigLog(symbol.multiplier);
                var log_base = Math2.bigLog(base.multiplier);
                retval = new Symbol(log_sym.divide());
                */
                var log_sym = Math.log(symbol);
                var log_base = Math.log(base);
                retval = new Symbol(log_sym/log_base);
            }
                
            else if(symbol.group === EX && symbol.power.multiplier.lessThan(0) || symbol.power.toString() === '-1') {
                symbol.power.negate(); 
                //move the negative outside but keep the positive inside :)
                retval = log(symbol).negate();
            } 
            else if(symbol.value === 'e' && symbol.multiplier.equals(1)) {
                var p = symbol.power;
                retval = isSymbol(p) ? p : new Symbol(p); 
            }
            else if(symbol.group === FN && symbol.fname === 'exp') {
                var s = symbol.args[0];
                if(symbol.multiplier.equals(1)) retval = _.multiply(s, new Symbol(symbol.power));
                else retval = _.symfunction('log',[symbol]);
            }
            else if(Settings.PARSE2NUMBER && isNumericSymbol(symbol)) {
                var img_part;
                if(symbol.multiplier.lessThan(0)) {
                    symbol.negate();
                    img_part = _.multiply(new Symbol(Math.PI), new Symbol('i'));
                }
                retval = new Symbol(Math.log(symbol.multiplier.toDecimal()));
                if(img_part) retval = _.add(retval, img_part);
            }
            else { 
                var s;
                if(!symbol.power.equals(1)) {
                    s = symbol.group === EX ? symbol.power : new Symbol(symbol.power);
                    symbol.toLinear(); 
                }
                //log(a,a) = 1 since the base is allowed to be changed. 
                //This was pointed out by Happypig375 in issue #280
                if(arguments.length > 1 && allSame(arguments))
                    retval = new Symbol(1);
                else
                    retval = _.symfunction('log', arguments); 
                
                if(s) retval = _.multiply(s, retval);
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
            if(x.isConstant() && sIsConstant) {
                var v, e, exp, retval;
                v = x;
                //round the coefficient of then number but not the actual decimal value
                //we know this because a negative number was passed
                if(s && s.lessThan(0)) {
                    s = abs(s);
                    //convert the number to exponential form
                    e = Number(x).toExponential().toString().split('e');
                    //point v to the coefficient of then number
                    v = e[0];
                    //set the expontent
                    exp = e[1];
                }
                //round the number to the requested precision
                retval = new Symbol(Utils.round(v, Number(s||0)));
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
            
            if(v < 0) v = 2+v; //put it in terms of pi
            
            if(v >= 0 && v <= 0.5) quadrant = 1;
            else if(v > 0.5 && v <= 1) quadrant = 2;
            else if(v > 1 && v <= 1.5) quadrant = 3;
            else quadrant = 4;
            return quadrant;
        }

        /*
         * Serves as a bridge between numbers and bigNumbers
         * @param {Frac|Number} n
         * @returns {Symbol} 
         */
        function bigConvert(n) { 
            if(!isFinite(n)){
                var sign = Math.sign(n);
                var r = new Symbol(String(Math.abs(n)));
                r.multiplier = r.multiplier.multiply(new Frac(sign));
                return r;
            }
            if(isSymbol(n))
                return n;
            if(typeof n === 'number') {
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
        };
        
        function clean(symbol) {
            // handle functions with numeric values
            // handle denominator within denominator
            // handle trig simplifications
            var g = symbol.group, retval;
            //Now let's get to work
            if(g === CP) {
                var num = symbol.getNum(),
                    den = symbol.getDenom() || new Symbol(1),
                    p = Number(symbol.power),
                    factor = new Symbol(1);
                if(Math.abs(p) === 1) {
                    den.each(function(x) {
                        if(x.group === CB) {
                            factor = _.multiply(factor, clean(x.getDenom()));
                        }
                        else if(x.power.lessThan(0)) {
                            factor = _.multiply(factor, clean(x.clone().toUnitMultiplier()));
                        }
                    });

                    var new_den = new Symbol(0);
                    //now divide out the factor and add to new den
                    den.each(function(x) {
                        new_den = _.add(_.divide(x, factor.clone()), new_den);
                    });
                    
                    factor.invert(); //invert so it can be added to the top
                    var new_num;
                    if(num.isComposite()) { 
                        new_num = new Symbol(0);
                        num.each(function(x){
                            new_num = _.add(_.multiply(clean(x), factor.clone()), new_num);
                        });
                    }
                    else
                        new_num = _.multiply(factor, num);
                    
                    retval = _.divide(new_num, new_den);
                }
            }
            else if(g === CB) { 
                retval = new Symbol(1);
                symbol.each(function(x) { 
                    retval = _.multiply(retval, _.clean(x));
                });
            }
            else if(g === FN) {
                if(symbol.args.length === 1 && symbol.args[0].isConstant())
                    retval = block('PARSE2NUMBER', function() {
                        return _.parse(symbol);
                    }, true);
            }
            
            if(!retval)
                retval = symbol;
            
            return retval;
        }
        
        /**
         * Expands a symbol
         * @param symbol
         */
        function expand(symbol) { 
            //deal with parenthesis
            if(symbol.group === FN && symbol.fname === '')
                return _.expand(symbol.args[0]);
            
            //TODO - some test need to be verified in order to implement this
            /*
            if(symbol.group === FN) {
                symbol.args[0] = _.expand(symbol.args[0]);
                symbol.updateHash();
                return symbol;
            }
            */
            
            if(!symbol.symbols) return symbol; //nothing to do
            
            var original = symbol.clone(); 
            try {
                var p = symbol.power,
                    m = symbol.multiplier,
                    pn = Number(p);
                
                if(!symbol.symbols) 
                    return symbol;

                //expand all the symbols
                for(var s in symbol.symbols) {
                    var x = symbol.symbols[s];
                    symbol.symbols[s] = expand(x);
                }
                symbol = _.parse(symbol);

                if(isInt(pn) && pn > 0 && symbol.isComposite()) { 
                    var f = new Symbol(0);
                    //we loop through the f and make sure that it's fully expanded
                    for(var x in symbol.symbols) {
                        var sym = symbol.symbols[x];
                        if(sym.power.greaterThan(1)) 
                            sym = _.expand(sym);
                        f = _.add(f, sym);
                    }

                    //assume (a+b)^3 = (a+b)(a+b)(a+b) = (b^2+2*a*b+a^2)(a+b)
                    //we have n=p-1=2 iterations where p=3 in this case
                    var n = pn-1;
                    //Initiate with the first term. Remember that we have p-1 iterations because
                    //the first iteration is equal to P where p is the polynomial
                    var result = f.clone(); //initiate this as the first term
                    //the first loop is the top iterator and remains untouched. No sub-symbols
                    //from this symbol are allowed to be touched
                    for(var i=0; i<n; i++) {
                        var t = new Symbol(0);
                        for(var x in f.symbols) {
                            var a = f.symbols[x];
                            //we now loop through the 
                            for(var y in result.symbols) {
                                var b = _.multiply(a.clone(), result.symbols[y]);
                                //the result must always be a composite. If not expand
                                if(b.group === CB)
                                    b = _.expand(b);
                                t = _.add(t, b);
                            }
                        };
                        result = t;
                    }
                        
                    //put back the multiplier
                    if(!m.equals(1)) {
                        for(var s in result.symbols) {
                            var x = result.symbols[s];
                            x.multiplier = x.multiplier.multiply(m);
                            if(x.isComposite())
                                x.distributeMultiplier();
                            symbol.symbols[s] = x;
                        }
                    }

                    return result;
                }
                else if(symbol.group === CB) { 
                    //check if the symbol has composites
                    var hascomposites = false, 
                        sp = symbol.power.clone(),
                        sign = symbol.power.sign();
                
                    for(var x in symbol.symbols) {
                        var sub = symbol.symbols[x];
                        if(sub.isComposite()) {
                            hascomposites = true;
                            break;
                        }

                        if(isSymbol(sub.power) || isSymbol(sp)) {
                            sub.power = _.multiply(sub.power, Symbol(sp));
                            sub.group = EX;
                        }
                        else sub.power = sub.power.multiply(sp);
                    }
                    
                    symbol.toLinear();

                    //I'm going to be super lazy here and take the easy way out. TODO: do this without re-parsing
                    symbol = _.parse(symbol.text());

                    if(!hascomposites) 
                        return symbol; //nothing to do here

                    var result = new Symbol(0);
                    var composites = [],
                        non_composites = new Symbol(symbol.multiplier);

                    //sort them out
                    for(var s in symbol.symbols) {
                        var x = symbol.symbols[s];
                        if(x.group === EX)
                            continue;
                        if(x.isComposite()) {
                            var p = x.power, isDenom = false;;
                            if(isInt(p)) {
                                if(p < 0) {
                                    x.power.negate();
                                    isDenom = true;
                                }
                            }

                            if(isDenom) {
                                x.power.negate();
                                non_composites = _.multiply(non_composites, x);
                            }
                            else composites.push(x);
                        }
                        else non_composites = _.multiply(non_composites, x);
                    }
                    //multiply out the remainder
                    var l = composites.length;
                        //grab the first symbol since we'll loop over that one to begin
                    result = composites[0];
                    for(var i=1; i<l; i++) {
                        var t = new Symbol(0);
                        var s = composites[i];
                        for(var s1 in result.symbols) {
                            var x = result.symbols[s1];
                            for(var s2 in s.symbols) {
                                var y = s.symbols[s2];
                                var temp = _.multiply(x.clone(),y.clone());
                                t = _.add(t, temp);
                            }
                        }
                        result = t;
                    }

                    var finalResult = new Symbol(0);
                    //put back the multiplier
                    for(var s in result.symbols) {
                        var x = result.symbols[s];
                        finalResult = _.add(finalResult, expand(_.multiply(non_composites, x)));
                    }
                    
                    //expand the power
                    finalResult.power = finalResult.power.multiply(sp.abs());
                    
                    symbol = _.expand(finalResult);
                    
                    if(sign < 0)
                        symbol.invert();
                }
            }
            catch(e){ return original; }
            
            return symbol;
        }
        
        function imatrix(n) {
            return Matrix.identity(n);
        }
        
        function vecget(vector, index) {
            return vector.elements[index];
        }
        
        function vecset(vector, index, value) {
            vector.elements[index] = value;
            return vector;
        }
        
        function matget(matrix, i, j) {
            return matrix.elements[i][j];
        }
        
        function matgetrow(matrix, i) {
            return new Matrix(matrix.elements[i]);
        }
        
        function matsetrow(matrix, i, x) {
            if(matrix.elements[i].length !== x.elements.length)
                throw new Error('Matrix row must match row dimensions!');
            var M = matrix.clone();
            M.elements[i] = x.clone().elements;
            return M;
        }
        
        function matgetcol(matrix, col_index) {
            col_index = Number(col_index);
            var M = Matrix.fromArray([]);
            matrix.each(function(x, i, j) {
                if(j === col_index) {
                    M.elements.push([x.clone()]);
                }
            });
            return M;
        }
        
        function matsetcol(matrix, j, col) {
            j = Number(j);
            if(matrix.rows() !== col.elements.length)
                throw new Error('Matrix columns must match number of columns!');
            col.each(function(x, i) {
               matrix.set(i-1, j, x.elements[0].clone());
            });
            return matrix;
        }
        
        
        function matset(matrix, i, j, value) {
            matrix.elements[i][j] = value;
            return matrix;
        }
        
        //link this back to the parser
        this.expand = expand;
        this.clean = clean;
        
        //the constructor for vectors
        function vector() {
            return new Vector([].slice.call(arguments));
        }
        
        //the constructor for matrices
        function matrix() {
            return Matrix.fromArray(arguments);
        }
        
        function determinant(symbol) {
            if(isMatrix(symbol)) {
                return symbol.determinant();
            }
            return symbol;
        }
        
        function size(symbol) {
            if(isMatrix(symbol))
                return [new Symbol(symbol.cols()), new Symbol(symbol.rows())];
            err('size expects a matrix or a vector');
        }
        
        function dot(vec1, vec2) {
            if(isVector(vec1) && isVector(vec2)) return vec1.dot(vec2);
            err('function dot expects 2 vectors');
        }
        
        function cross(vec1, vec2) {
            if(isVector(vec1) && isVector(vec2)) return vec1.cross(vec2);
            err('function cross expects 2 vectors');
        }
        
        function transpose(mat) {
            if(isMatrix(mat)) return mat.transpose();
            err('function transpose expects a matrix');
        }
        
        function invert(mat) {
            if(isMatrix(mat)) return mat.invert();
            err('invert expects a matrix');
        }
        
        function testSQRT(symbol) { 
            //wrap the symbol in sqrt. This eliminates one more check down the line.
            if(!isSymbol(symbol.power) && symbol.power.absEquals(0.5)) { 
                var sign = symbol.power.sign();
                //don't devide the power directly. Notice the use of toString. This makes it possible
                //to use a bigNumber library in the future
                return sqrt(symbol.group === P ? new Symbol(symbol.value) : symbol.toLinear()).setPower(new Frac(sign));
            }
            return symbol;
        }
        
        //try to reduce a symbol by pulling its power
        function testPow(symbol) { 
            if(symbol.group === P) {
                var v = symbol.group === N ? symbol.multiplier.toDecimal() : symbol.value,
                    fct = primeFactors(v)[0],
                    n = new Frac(Math.log(v)/Math.log(fct)),
                    p = n.multiply(symbol.power); 
                //we don't want a more complex number than before 
                if(p.den > symbol.power.den) return symbol;

                if(isInt(p)) symbol = Symbol(Math.pow(fct, p));
                else symbol = new Symbol(fct).setPower(p);
            }

            return symbol;
        }

        //extended functions. Because functions like log aren't directly 
        //stored in an object, it's difficult to find out about them unless you know of them 
        //outside of the library. This serves as registry. That's all.
        this.ext = {
            log: log,
            sqrt: sqrt,
            abs: abs,
            vector: vector,
            matrix: matrix,
            parens: parens,
            determinant: determinant,
            dot: dot,
            invert: invert,
            transpose: transpose
        };
        
        //The loader for functions which are not part of Math2
        this.mapped_function = function() { 
            var subs = {},
                params = this.params;
            for(var i=0; i<params.length; i++) 
                subs[params[i]] = arguments[i];
            
            return _.parse(this.body, subs);
        };
        
        /**
         * Adds two symbols
         * @param {Symbol} a
         * @param {Symbol} b
         * @returns {Symbol}
         */
        this.add = function(a, b) {  
            var aIsSymbol = isSymbol(a),
                bIsSymbol = isSymbol(b);
            //we're dealing with two symbols
            if(aIsSymbol && bIsSymbol) { 
                //handle Infinity
                //https://www.encyclopediaofmath.org/index.php/Infinity
                if(a.isInfinity || b.isInfinity) {
                    var aneg = a.multiplier.lessThan(0),
                        bneg = b.multiplier.lessThan(0);
                
                    if(a.isInfinity && b.isInfinity && aneg !== bneg) {
                        throw new UndefinedError('('+a+')+('+b+') is not defined!');
                    }
                    
                    var inf = Symbol.infinity();
                    if(bneg)
                        inf.negate();
                    return inf;
                }
                
                if(a.isComposite() && a.isLinear() && b.isComposite() && b.isLinear()) { 
                    a.distributeMultiplier();
                    b.distributeMultiplier();
                }
                //no need to waste time on zeroes
                if(a.multiplier.equals(0)) return b;
                if(b.multiplier.equals(0)) return a;

                if(a.isConstant() && b.isConstant() && Settings.PARSE2NUMBER) {
                    var result =  new Symbol(a.multiplier.add(b.multiplier).toDecimal(Settings.PRECISION));
                    return result;
                }

                var g1 = a.group,
                    g2 = b.group,
                    ap = a.power.toString(),
                    bp = b.power.toString();
                
                //always keep the greater group on the left. 
                if(g1 < g2 || (g1 === g2 && ap > bp && bp > 0)) return this.add(b, a);
                
                /*note to self: Please don't forget about this dilemma ever again. In this model PL and CB goes crazy
                 * because it doesn't know which one to prioritize. */
                //correction to PL dilemma
                if(g1 === CB && g2 === PL && a.value === b.value) { 
                    //swap
                    var t = a; a = b; b = t;
                    g1 = a.group; g2 = b.group; ap = a.power.toString(); bp = b.power.toString();
                }

                var powEQ = ap === bp,
                    v1 = a.value,
                    v2 = b.value,
                    aIsComposite = a.isComposite(),
                    bIsComposite = b.isComposite(),
                    h1, h2, result;

                if(aIsComposite) h1 = text(a, 'hash');
                if(bIsComposite) h2 = text(b, 'hash');
                
                if(g1 === CP && g2 === CP && b.isLinear() && !a.isLinear() && h1 !== h2) {
                    return this.add(a, b);
                }   

                //PL & PL should compare hashes and not values e.g. compare x+x^2 with x+x^3 and not x with x
                if(g1 === PL && g2 === PL) { 
                    v1 = h1; v2 = h2;
                }

                var PN = g1 === P && g2 === N,
                    PNEQ = a.value === b.multiplier.toString(),
                    valEQ = (v1 === v2 || h1 === h2 && !h1 === undefined || (PN && PNEQ));

                //equal values, equal powers
                if(valEQ && powEQ && g1 ===  g2) { 
                    //make sure to convert N to something P can work with
                    if(PN) b = b.convert(P);//CL

                    //handle PL
                    if(g1 === PL && (g2 === S || g2 === P)) { 
                        a.distributeMultiplier();
                        result = a.attach(b);
                    }
                    else {
                        result = a;//CL
                        if(a.multiplier.isOne() && b.multiplier.isOne() && g1 === CP && a.isLinear() && b.isLinear()) {
                            for(var s in b.symbols) {
                                var x = b.symbols[s];
                                result.attach(x);
                            }
                        }
                        else result.multiplier = result.multiplier.add(b.multiplier);
                    }
                }
                //equal values uneven powers
                else if(valEQ && g1 !== PL) { 
                    result = Symbol.shell(PL).attach([a, b]);
                    //update the hash
                    result.value = g1 === PL ? h1 : v1;
                }
                else if(aIsComposite && a.isLinear()) { 
                    var canIterate = g1 === g2,
                        bothPL = g1 === PL && g2 === PL; 

                    //we can only iterate group PL if they values match
                    if(bothPL) canIterate = a.value === b.value;
                    //distribute the multiplier over the entire symbol
                    a.distributeMultiplier();

                    if(b.isComposite() && b.isLinear() && canIterate) {
                        b.distributeMultiplier();
                        //CL
                        for(var s in b.symbols) {
                            var x = b.symbols[s];
                            a.attach(x);
                        }
                        result = a; 
                    }
                    //handle cases like 2*(x+x^2)^2+2*(x+x^2)^3+4*(x+x^2)^2
                    else if(bothPL && a.value !== h2 || g1 === PL && !valEQ) {
                        result = Symbol.shell(CP).attach([a, b]);
                        result.updateHash();

                    }
                    else { 
                        result = a.attach(b);
                    }
                }
                else { 
                    if(g1 === FN && a.fname === SQRT && g2 !== EX && b.power.equals(0.5)) { 
                        var m = b.multiplier.clone();
                        b = sqrt(b.toUnitMultiplier().toLinear());
                        b.multiplier = m;
                    }
                    //fix for issue #3 and #159
                    if(a.length === 2 && b.length === 2 && even(a.power) && even(b.power)) {
                        result = _.add(expand(a), expand(b));
                    }
                    else {
                        result = Symbol.shell(CP).attach([a, b]);
                        result.updateHash();
                    }  
                }

                if(result.multiplier.equals(0)) result = new Symbol(0);

                //make sure to remove unnecessary wraps
                if(result.length === 1) { 
                    var m = result.multiplier;
                    result = firstObject(result.symbols);
                    result.multiplier = result.multiplier.multiply(m);
                }

                return result;
            }
            else { 
                //keep symbols to the right 
                if(bIsSymbol && !aIsSymbol) { 
                    var t = a; a = b; b = t; //swap
                    t = bIsSymbol; bIsSymbol = aIsSymbol; aIsSymbol = t;
                }
                
                var bIsMatrix = isMatrix(b);
            
                if(aIsSymbol && bIsMatrix) {
                    b.eachElement(function(e) {
                       return _.add(a.clone(), e); 
                    });
                }
                else {
                    if(isMatrix(a) && bIsMatrix) { 
                        b = a.add(b);
                    }
                    else if(aIsSymbol && isVector(b)) {
                        b.each(function(x, i) {
                            i--;
                            b.elements[i] = _.add(a.clone(), b.elements[i]);
                        });
                    }
                    else { 
                        if(isVector(a) && isVector(b)) { 
                            b.each(function(x, i) {
                                i--;
                                b.elements[i] = _.add(a.elements[i], b.elements[i]);
                            });
                        }
                        else if(isVector(a) && isMatrix(b)) { 
                            //try to convert a to a matrix
                            return _.add(b, a);
                        }
                        else if(isMatrix(a) && isVector(b)) {
                            if(b.elements.length === a.rows()) {
                                var M = new Matrix(), l = a.cols();
                                b.each(function(e, i) {
                                    var row = [];
                                    for(var j=0; j<l; j++) { 
                                        row.push(_.add(a.elements[i-1][j].clone(), e.clone()));
                                    }
                                    M.elements.push(row);
                                });
                                return M;
                            }
                            else err('Dimensions must match!');
                        }
                    }
                }
                return b;
            }
                
        };
        
        /**
         * Gets called when the parser finds the - operator. Not the prefix operator. See this.add
         * @param {Symbol} symbol1
         * @param {Symbol} symbol2
         * @returns {Symbol}
         */
        this.subtract = function(a, b) { 
            var aIsSymbol = aIsSymbol = isSymbol(a), 
                bIsSymbol = isSymbol(b), t;
            
            if(aIsSymbol && bIsSymbol) {
                return this.add(a, b.negate());
            }
            else {
                if(bIsSymbol) {
                    t = b; b = a; a = t;
                    aIsSymbol = bIsSymbol;
                }
                if(aIsSymbol && isVector(b)) {
                    b = b.map(function(x) {
                        return _.subtract(x, a.clone());
                    });
                }
                else if(isVector(a) && isVector(b)) {
                    if(a.dimensions() === b.dimensions()) b = a.subtract(b);
                    else _.error('Unable to subtract vectors. Dimensions do not match.');
                }
                else if(isMatrix(a) && isVector(b)) {
                    if(b.elements.length === a.rows()) {
                        var M = new Matrix(), l = a.cols();
                        b.each(function(e, i) {
                            var row = [];
                            for(var j=0; j<l; j++) { 
                                row.push(_.subtract(a.elements[i-1][j].clone(), e.clone()));
                            }
                            M.elements.push(row);
                        });
                        return M;
                    }
                    else err('Dimensions must match!');
                }
                else if(isVector(a) && isMatrix(b)) {
                    var M = b.clone().negate();
                    return _.add(M, a);
                }
                else if(isMatrix(a) && isMatrix(b)) {
                    b = a.subtract(b);
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
        this.multiply = function(a, b) { 
            var aIsSymbol = isSymbol(a),
                bIsSymbol = isSymbol(b);
        
            if(aIsSymbol && bIsSymbol) {
                //handle Infinty
                if(a.isInfinity || b.isInfinity) { 
                    if(a.equals(0) || b.equals(0))
                        throw new UndefinedError(a+'*'+b+' is undefined!');
                    if(b.power.lessThan(0))
                        throw new UndefinedError('Infinity/Infinity is not defined!');
                    var sign = a.multiplier.multiply(b.multiplier).sign(),
                        inf = Symbol.infinity();
                    if(a.isConstant() || b.isConstant() || (a.isInfinity && b.isInfinity)) {
                        if(sign < 0)
                            inf.negate();
                        return inf;
                    }
                }
                //the quickies
                if(a.isConstant() && b.isConstant() && Settings.PARSE2NUMBER) {
                    var retval = new Symbol(a.multiplier.multiply(b.multiplier).toDecimal());
                    return retval;
                }

                //don't waste time
                if(a.isOne()) return b.clone();
                if(b.isOne()) return a.clone();

                if(a.multiplier.equals(0) || b.multiplier.equals(0)) return new Symbol(0);

                if(b.group > a.group && !(b.group === CP)) return this.multiply(b, a);
                //correction for PL/CB dilemma
                if(a.group === CB && b.group === PL && a.value === b.value) { 
                    var t = a; a = b; b = t;//swap
                }

                var g1 = a.group,
                    g2 = b.group,
                    bnum = b.multiplier.num,
                    bden = b.multiplier.den;

                if(g1 === FN && a.fname === SQRT && !b.isConstant() && a.args[0].value === b.value) {
                    //unwrap sqrt
                    var a_pow = a.power;
                    a = a.args[0].clone();
                    a.setPower(new Frac(0.5).multiply(a_pow));
                    g1 = a.group;
                };
                
                var v1 = a.value,
                    v2 = b.value,
                    sign = new Frac(a.multiplier.lessThan(0) ? -1 : 1),
                    //since P is just a morphed version of N we need to see if they relate
                    ONN = (g1 === P && g2 === N && b.multiplier.equals(a.value)),
                    //don't multiply the multiplier of b since that's equal to the value of a
                    m = ONN ? new Frac(1).multiply(a.multiplier).abs() : a.multiplier.multiply(b.multiplier).abs(),
                    result = a.clone().toUnitMultiplier();
                b = b.clone().toUnitMultiplier(true);
                
                //if both are PL then their hashes have to match
                if(v1 === v2 && g1 === PL && g1 === g2) {
                    v1 = a.text('hash');
                    v2 = b.text('hash');
                }

                //same issue with (x^2+1)^x*(x^2+1)
                //EX needs an exception when multiplying because it needs to recognize
                //that (x+x^2)^x has the same hash as (x+x^2). The latter is kept as x
                if(g2 === EX && b.previousGroup === PL && g1 === PL) {
                    v1 = text(a, 'hash', EX);
                }
                

                if((v1 === v2 || ONN) && !(g1 === PL && (g2 === S || g2 === P || g2 === FN)) && !(g1 === PL && g2 === CB)) {                   
                    var p1 = a.power,
                        p2 = b.power,
                        isSymbolP1 = isSymbol(p1),
                        isSymbolP2 = isSymbol(p2),
                        toEX = (isSymbolP1 || isSymbolP2);
                    //TODO: this needs cleaning up
                    if(g1 === PL && g2 !== PL && b.previousGroup !== PL && p1.equals(1)) {
                        result = new Symbol(0);
                        a.each(function(x) {
                            result = _.add(result, _.multiply(x, b.clone()));
                        }, true);
                    }
                    else {
                        //add the powers
                        result.power = toEX ? _.add(
                            !(isSymbol(p1)) ? new Symbol(p1) : p1, 
                            !(isSymbol(p2)) ? new Symbol(p2) : p2
                        ): (g1 === N /*don't add powers for N*/? p1 : p1.add(p2));

                        //eliminate zero power values and convert them to numbers
                        if(result.power.equals(0)) result = result.convert(N);

                        //properly convert to EX
                        if(toEX) result.convert(EX);

                        //take care of imaginaries
                        if(a.imaginary && b.imaginary) { 
                            var isEven = even(result.power % 2);
                            if(isEven) {
                                result = new Symbol(1);
                                m.negate();
                            }
                        }

                        //cleanup: this causes the LaTeX generator to get confused as to how to render the symbol
                        if(result.group !== EX && result.previousGroup) result.previousGroup = undefined;
                        //the sign for b is floating around. Remember we are assuming that the odd variable will carry
                        //the sign but this isn't true if they're equals symbols
                        result.multiplier = result.multiplier.multiply(b.multiplier);
                    }
                }
                else if(g1 === CB && a.isLinear()){ 
                    if(g2 === CB) b.distributeExponent();
                    if(g2 === CB && b.isLinear()) { 
                        for(var s in b.symbols) {
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
                    if(g1 !== N) { 
                        if(g1 === CB) {
                            result.distributeExponent();
                            result.combine(b);
                        }
                        else if(!b.isOne()) {
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

                if(result.group === P) { 
                    var logV = Math.log(result.value),
                        n1 = Math.log(bnum)/logV,
                        n2 = Math.log(bden)/logV,
                        ndiv = m.num/bnum,
                        ddiv = m.den/bden;
                    //we don't want to divide by zero no do we? Strange things happen.
                    if(n1 !== 0 && isInt(n1) && isInt(ndiv)) {
                        result.power = result.power.add(new Frac(n1));
                        m.num /= bnum; //BigInt? Keep that in mind for the future.
                    }
                    if(n2 !== 0 && isInt(n2) && isInt(ddiv)) {
                        result.power = result.power.subtract(new Frac(n2));
                        m.den /= bden; //BigInt? Keep that in mind for the future.
                    }
                }

                //unpack CB if length is only one
                if(result.length === 1) { 
                    var t = result.multiplier;
                    //transfer the multiplier
                    result = firstObject(result.symbols);
                    result.multiplier = result.multiplier.multiply(t);
                }

                //reduce square root
                var ps = result.power.toString(); 
                if(even(ps) && result.fname === SQRT) { 
                    var p = result.power;
                    result = result.args[0]; 
                    result = _.multiply(new Symbol(m), _.pow(result, new Symbol(p.divide(new Frac(2)))));
                }
                else {
                    result.multiplier = result.multiplier.multiply(m).multiply(sign);
                    if(result.group === CP && result.isImaginary())
                        result.distributeMultiplier();
                }


                //back convert group P to a simpler group N if possible
                if(result.group === P && isInt(result.power.toDecimal())) result = result.convert(N);

                return result;
            }
            else {
                //****** Matrices & Vector *****//
                if(bIsSymbol && !aIsSymbol) { //keep symbols to the right 
                    t = a; a = b; b = t; //swap
                    t = bIsSymbol; bIsSymbol = aIsSymbol; aIsSymbol = t;
                }

                var isMatrixB = isMatrix(b), isMatrixA = isMatrix(a);
                if(aIsSymbol && isMatrixB) {
                    b.eachElement(function(e) {
                       return _.multiply(a.clone(), e); 
                    });
                }
                else {
                    if(isMatrixA && isMatrixB) { 
                        b = a.multiply(b);
                    }
                    else if(aIsSymbol && isVector(b)) {
                        b.each(function(x, i) {
                            i--;
                            b.elements[i] = _.multiply(a.clone(), b.elements[i]);
                        });
                    }
                    else {
                        if(isVector(a) && isVector(b)) {
                            b.each(function(x, i) {
                                i--;
                                b.elements[i] = _.multiply(a.elements[i], b.elements[i]);
                            });
                        }
                        else if(isVector(a) && isMatrix(b)) {
                            //try to convert a to a matrix
                            return this.multiply(b, a);
                        }
                        else if(isMatrix(a) && isVector(b)) { 
                            if(b.elements.length === a.rows()) {
                                var M = new Matrix(), l = a.cols();
                                b.each(function(e, i) {
                                    var row = [];
                                    for(var j=0; j<l; j++) { 
                                        row.push(_.multiply(a.elements[i-1][j].clone(), e.clone()));
                                    }
                                    M.elements.push(row);
                                });
                                return M;
                            }
                            else err('Dimensions must match!');
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
        this.divide = function(a, b) { 
            var aIsSymbol = isSymbol(a),
                bIsSymbol = isSymbol(b);
        
            if(aIsSymbol && bIsSymbol) {
                var result;
                if(b.equals(0)) 
                    throw new DivisionByZero('Division by zero not allowed!');
                
                if(a.isConstant() && b.isConstant()) {
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
                if(aIsSymbol && isVectorB) {
                    b = b.map(function(x){
                        return _.divide(a.clone(),x);
                    });
                }
                else if(isVectorA && bIsSymbol) {
                    b = a.map(function(x) {
                        return _.divide(x, b.clone());
                    });
                }
                else if(isVectorA && isVectorB) {
                    if(a.dimensions() === b.dimensions()) {
                        b = b.map(function(x, i) {
                            return _.divide(a.elements[--i], x);
                        });
                    }
                    else _.error('Cannot divide vectors. Dimensions do not match!');
                }
                else {
                    var isMatrixA = isMatrix(a), isMatrixB = isMatrix(b);
                    if(isMatrixA && bIsSymbol) {
                        a.eachElement(function(x) {
                            return _.divide(x, b.clone());
                        });
                        b = a;
                    }
                    else if(isMatrixA && isMatrixB) {
                        if(a.rows() === b.rows() && a.cols() === b.cols()) {
                            a.eachElement(function(x, i, j) {
                                return _.divide(x, b.elements[i][j]);
                            });
                        }
                        else {
                            _.error('Dimensions do not match!');
                        }
                    }
                    else if(isMatrixA && isVectorB) {
                        if(a.cols() === b.dimensions()) {
                            a.eachElement(function(x, i, j) {
                                return _.divide(x, b.elements[i].clone());
                            });
                            b = a;
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
        this.pow = function(a, b) { 
            var aIsSymbol = isSymbol(a),
                bIsSymbol = isSymbol(b);
            if(aIsSymbol && bIsSymbol) {  
                //handle infinity
                if(a.isInfinity || b.isInfinity) {
                    if(a.isInfinity && b.isInfinity)
                        throw new UndefinedError('('+a+')^('+b+') is undefined!');
                    
                    if(a.isConstant() && b.isInfinity) { 
                        if(a.equals(0)) {
                            if(b.lessThan(0))
                                throw new UndefinedError('0^Infinity is undefined!');
                            return new Symbol(0);
                        }
                        if(a.equals(1))
                            throw new UndefinedError('1^'+b.toString()+' is undefined!');
                        //a^-oo
                        if(b.lessThan(0))
                            return new Symbol(0);
                        //a^oo
                        if(!a.lessThan(0))
                            return Symbol.infinity();
                    }
                        
                    if(a.isInfinity && b.isConstant()) { 
                        if(b.equals(0))
                            throw new UndefinedError(a+'^0 is undefined!');
                        if(b.lessThan(0))
                            return new Symbol(0);
                        return _.multiply(Symbol.infinity(), _.pow(new Symbol(a.sign()), b.clone()));
                    }
                }
                    
                var aIsZero = a.equals(0);
                var bIsZero = b.equals(0);
                if(aIsZero && bIsZero) err('0^0 is undefined!');
                //return 0 right away if possible
                if(aIsZero && b.isConstant() && b.multiplier.greaterThan(0))
                    return new Symbol(0);
                
                if(bIsZero)
                    return new Symbol(1);
                
                var bIsConstant = b.isConstant(),
                    aIsConstant = a.isConstant(), 
                    bIsInt = b.isInteger(),
                    m = a.multiplier,
                    result = a.clone();
                if(aIsConstant && bIsConstant && a.equals(0) && b.lessThan(0))
                    throw new UndefinedError('Division by zero is not allowed!');
                
                //compute imaginary numbers right away
                if(Settings.PARSE2NUMBER && aIsConstant && bIsConstant && a.sign() < 0 && evenFraction(b)) { 
                    var k, re, im;
                    k = Math.PI*b;
                    re = new Symbol(Math.cos(k));
                    im = _.multiply(Symbol.imaginary(), new Symbol(Math.sin(k)));
                    return _.add(re, im);
                }
                
                //imaginary number under negative nthroot or to the n
                if(Settings.PARSE2NUMBER && a.isImaginary() && bIsConstant) { 
                    var re, im, r, theta, nre, nim, retval;
                    re = a.realpart();
                    im = a.imagpart();
                    if(re.isConstant('all') && im.isConstant('all')) {
                        theta = new Symbol(trig.atan2(im, re)*b);
                        r = _.pow(Symbol.hyp(re, im), b); 
                        nre = _.multiply(r.clone(), _.trig.cos(theta.clone()));
                        nim = _.multiply(r, _.trig.sin(theta));
                        retval = _.add(nre, _.multiply(Symbol.imaginary(), nim));
                        return retval;
                    }
                }
                /*
                if(a.isImaginary() && bIsConstant && b.multiplier.num.abs().equals(1) && !b.multiplier.den.equals(1)) { 
                    var sign = b.sign();
                    b = abs(b);
                    var p, re, im, theta, n, ai, bi, di, ei, ii, th;
                    p = Symbol.toPolarFormArray(a);
                    theta = _.multiply(b.clone(), arg(a));
                    di = _.pow(p[0], b);
                    ai = _.trig.cos(theta.clone());
                    bi = _.trig.sin(theta);
                        
                    if(sign < 0) {
                        re = _.divide(ai, di.clone());
                        im = _.divide(bi, di);
                    }
                    else {
                        re = _.multiply(ai, di.clone());
                        im = _.multiply(bi, di);
                    }
                    return _.add(re, _.multiply(im, Symbol.imaginary()));
                }
                */
                
                //take care of the symbolic part
                result.toUnitMultiplier();
                //simpifly sqrt
                if(result.group === FN && result.fname === SQRT && !bIsConstant) { 
                    var s = result.args[0];
                    s.multiplyPower(new Symbol(0.5));
                    s.multiplier.multiply(result.multiplier);
                    s.multiplyPower(b);
                    result = s; 
                }
                else { 
                    var sign = m.sign();
                    //handle cases such as (-a^3)^(1/4)
                    if(evenFraction(b) && sign < 0) {
                        //swaperoo
                        //first put the sign back on the symbol
                        result.negate();
                        //wrap it in brackets
                        result = _.symfunction(PARENTHESIS, [result]);
                        //move the sign back the exterior and let nerdamer handle the rest
                        result.negate();
                    }
                    result.multiplyPower(b);
                }

                if(aIsConstant && bIsConstant && Settings.PARSE2NUMBER) { 
                    var c;
                    //remove the sign
                    if(sign < 0) {
                        a.negate();
                        if(b.multiplier.den.equals(2)) 
                            //we know that the numerator has to be odd and therefore it's i
                            c = new Symbol(Settings.IMAGINARY);
                        else if(isInt(b.multiplier)) {
                            if(even(b.multiplier))
                                c = new Symbol(1);
                            else 
                                c = new Symbol(-1);
                        }
                        else if(!even(b.multiplier.den)) {
                            sign = Math.pow(sign, b.multiplier.num);
                            c = new Symbol(Math.pow(a, b)*sign);
                        }
                        else {
                            c = _.pow(_.symfunction(PARENTHESIS, [new Symbol(sign)]), b.clone());
                        }
                            
                    }

                    result = new Symbol(Math.pow(a.multiplier.toDecimal(), b.multiplier.toDecimal()));
                    //result = new Symbol(Math2.bigpow(a.multiplier, b.multiplier));
                    //put the back sign
                    if(c)
                        result = _.multiply(result, c);
                }
                else if(bIsInt && !m.equals(1)) { 
                    var p = b.multiplier.toDecimal();
                    var sgn = Math.sign(p);
                    p = Math.abs(p);
                    var multiplier = new Frac(1); 
                    multiplier.num = m.num.pow(p);
                    multiplier.den = m.den.pow(p);
                    if(sgn < 0)
                        multiplier.invert();
                    //multiplying is justified since after mulltiplyPower if it was of group P it will now be of group N
                    result.multiplier = result.multiplier.multiply(multiplier);
                }
                else { 
                    var sign = a.sign();
                    if(b.isConstant() && a.isConstant() && !b.multiplier.den.equals(1) && sign < 0 ) { 
                        //we know the sign is negative so if the denominator for b == 2 then it's i
                        if(b.multiplier.den.equals(2)) {
                            var i = new Symbol(Settings.IMAGINARY);
                            a.negate();//remove the sign
                            //if the power is negative then i is negative
                            if(b.lessThan(0)) {
                                i.negate();
                                b.negate();//remove the sign from the power
                            }
                            //pull the power normally and put back the imaginary
                            result = _.multiply(_.pow(a, b), i);
                        }
                        else { 
                            var aa = a.clone();
                            aa.multiplier.negate();
                            result = _.pow(_.symfunction(PARENTHESIS, [new Symbol(-1)]), b.clone()); 
                            var _a = _.pow(new Symbol(aa.multiplier.num), b.clone());
                            var _b = _.pow(new Symbol(aa.multiplier.den), b.clone());
                            var r = _.divide(_a, _b);
                            result = _.multiply(result, r);
                        }  
                    }
                    else if(Settings.PARSE2NUMBER && b.isImaginary()) {
                        //4^(i + 2) = e^(- (2 - 4 i) π n + (2 + i) log(4))
                        var re, im, aa, a1, b1, c1;
                        aa = a.clone().toLinear();
                        re = b.realpart();
                        im = b.imagpart();
                        a1 = _.pow(aa.clone(), re);
                        b1 = trig.cos(_.multiply(im.clone(), log(aa.clone())));
                        c1 = _.multiply(trig.sin(_.multiply(im, log(aa))), Symbol.imaginary());
                        result = _.multiply(a1, _.add(b1, c1));
                        result = _.expand(_.parse(result));
                    }
                    else { 
                        //b is a symbol
                        var neg_num = a.group === N && sign < 0,
                            num = testSQRT(new Symbol(neg_num ? m.num : Math.abs(m.num)).setPower(b.clone())),
                            den = testSQRT(new Symbol(m.den).setPower(b.clone()).invert());  

                        //eliminate imaginary if possible
                        if(a.imaginary) { 
                            if(bIsInt) {
                                var s, p, n;
                                s = Math.sign(b);
                                p = abs(b);
                                n = p%4;
                                result = new Symbol(even(n) ? -1 : Settings.IMAGINARY);
                                if(n === 0 || s < 0 && (n === 1) || s > 0 && (n === 3)) {
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
                        if(sign < 0 && !neg_num) result.negate();
                        
                        //retain the absolute value
                        if(bIsConstant && a.group !== EX) { 
                            var evenr = even(b.multiplier.den),
                                evenp = even(a.power),
                                n = result.power.toDecimal(),
                                evennp = even(n);
                            if(evenr && evenp && !evennp) {
                                if(n === 1 ) result = _.symfunction(ABS, [result]);
                                else if(!isInt(n)) {
                                    var p = result.power;
                                    result = _.symfunction(ABS, [result.toLinear()]).setPower(p);
                                }
                                else {
                                    result = _.multiply(_.symfunction(ABS, [result.clone().toLinear()]), 
                                        result.clone().setPower(new Frac(n-1)));
                                }
                                //quick workaround. Revisit
                                if(Settings.POSITIVE_MULTIPLIERS && result.fname === ABS)
                                    result = result.args[0];
                            }
                        }   
                    }   
                }

                result = testSQRT(result);
                //don't multiply until we've tested the remaining symbol
                if(num && den)
                    result = _.multiply(result, testPow(_.multiply(num, den)));

                //reduce square root
                if(result.fname === SQRT) { 
                    var isEX = result.group === EX;
                    var t = isEX ? result.power.multiplier.toString() : result.power.toString();
                    if(even(t)) { 
                        var pt = isEX ? _.divide(result.power, new Symbol(2)) : new Symbol(result.power.divide(new Frac(2))),
                            m = result.multiplier;
                        result = _.pow(result.args[0], pt);
                        result.multiplier = result.multiplier.multiply(m);
                    }
                }
                //detect Euler's identity
                else if(!Settings.IGNORE_E && result.isE() && result.group === EX && result.power.contains('pi') 
                        && result.power.contains(Settings.IMAGINARY)) {
                    //we have a match
                    var m1 = result.multiplier,
                        m2 = result.power.multiplier;
                    result = new Symbol(even(m2.num) ? m1 : m1.negate());
                    result = _.pow(result, new Symbol(m2.den).invert());
                }
                return result;
            }
            else {
                if(isVector(a) && bIsSymbol) {
                    a = a.map(function(x) {
                        return _.pow(x, b.clone());
                    });
                }
                else if(isMatrix(a) && bIsSymbol) {
                    a.eachElement(function(x) {
                        return _.pow(x, b.clone());
                    });
                }
                return a;
            }
        };
        
        //gets called when the parser finds the , operator. 
        this.comma = function(a, b) { 
            var aIsArray = (a instanceof Array),
                bIsArray = (b instanceof Array),
                aHasSubArray = (aIsArray && a[0] instanceof Array);

            if ( (aIsArray && aHasSubArray) || (aIsArray && !bIsArray) ) a.push(b);
            else a = [a,b];
            return a;
        };
        
        //the equality setter
        this.equals = function(a, b) {
            //equality can only be set for group S so complain it's not
            if(a.group !== S && !a.isLinear())
                err('Cannot set equality for '+a.toString());
            VARS[a.value] = b.clone();
            return b;
        };
        
        //modulus
        this.mod_or_percent = function(a, b) {
            if(a && b)
                return mod(a, b);
            return _.percent(b);
        };
        
        //percent
        this.percent = function(a) {
            return _.divide(a, new Symbol(100));
        };
        
        this.percent_add = function(a, b) {
            return _.add(_.percent(a), b);
        };
        
        this.percent_subtract = function(a, b) {
            return _.subtract(_.percent(a), b);
        };
        //function to quickly convert bools to Symbols
        var bool2Symbol = function(x) {
            return new Symbol(x === true ? 1 : 0);
        };
        //check for equality
        this.eq = function(a, b) {
            return bool2Symbol(a.equals(b));
        };
        //checks for greater than
        this.gt = function(a, b) {
            return bool2Symbol(a.gt(b));
        };
        //checks for greater than equal
        this.gte = function(a, b) {
            return bool2Symbol(a.gte(b));
        };
        //checks for less than
        this.lt = function(a, b) {
            return bool2Symbol(a.lt(b));
        };
        //checks for less than equal
        this.lte = function(a, b) {
            return bool2Symbol(a.lte(b));
        };
        //wraps the factorial
        this.factorial = function(a) {
            return this.symfunction(FACTORIAL, [a]);
        };
        //wraps the double factorial
        this.dfactorial = function(a) {
            return this.symfunction(DOUBLEFACTORIAL, [a]);
        };
        //wacky fix for factorial with prefixes
        this.factadd = function(a, b) {
            return _.add(this.symfunction(FACTORIAL, [a]), b);
        };
        this.dfactadd = function(a, b) {
            return _.add(this.symfunction(DOUBLEFACTORIAL, [a]), b);
        };
        this.factsub = function(a, b) {
            return _.subtract(this.symfunction(FACTORIAL, [a]), b);
        };
        this.dfactsub = function(a, b) {
            return _.subtract(this.symfunction(DOUBLEFACTORIAL, [a]), b);
        };
    };
    
    /* "STATIC" */
    //converts a number to a fraction. 
    var Fraction = {
        /**
         * Converts a decimal to a fraction
         * @param {number} value
         * @param {object} opts
         * @returns {Array} - an array containing the denominator and the numerator
         */
        convert: function( value, opts ) { 
            var frac;
            if( value === 0 ) {
                frac = [ 0, 1];
            }
            else {
                if( value < 1e-6 || value > 1e20) {
                    var qc = this.quickConversion( Number(value) );
                    if( qc[1] <= 1e20 ) { 
                        var abs = Math.abs( value );
                        var sign = value/abs;
                        frac = this.fullConversion( abs.toFixed( (qc[1]+'').length-1 ));
                        frac[0] = frac[0]*sign;
                    }
                    else {
                        frac = qc;
                    }
                }
                else {
                    frac = this.fullConversion( value );
                }
            }
            return frac;
        },
        /**
         * If the fraction is too small or too large this gets called instead of fullConversion method
         * @param {number} dec
         * @returns {Array} - an array containing the denominator and the numerator
         */
        quickConversion: function(dec) {
            var x = (dec.toExponential()+'').split('e');
            var d = x[0].split('.')[1];// get the number of places after the decimal
            var l = d ? d.length : 0; // maybe the coefficient is an integer;
            //call Math.round to avoid rounding error
            return [Math.round(Math.pow(10,l)*x[0]), Math.pow(10, Math.abs(x[1])+l)];
        },
        /**
         * Returns a good approximation of a fraction. This method gets called by convert
         * http://mathforum.org/library/drmath/view/61772.html
         * Decimal To Fraction Conversion - A Simpler Version
         * Dr Peterson
         * @param {number} dec
         * @returns {Array} - an array containing the denominator and the numerator
         */
        fullConversion: function( dec ) {
            var done = false;
            //you can adjust the epsilon to a larger number if you don't need very high precision
            var n1 = 0, d1 = 1, n2 = 1, d2 = 0, n = 0, q = dec, epsilon = 1e-16;
            while(!done) {
                n++;
                if( n > 10000 ){
                    done = true;
                }
                var a = Math.floor(q);
                var num = n1 + a * n2;
                var den = d1 + a * d2;
                var e = (q - a);
                if( e < epsilon) {
                    done = true;
                }
                q = 1/e;
                n1 = n2; d1 = d2; n2 = num; d2 = den;
                if(Math.abs(num/den-dec) < epsilon || n > 30) {
                    done = true;
                }
            }
            return [num, den];
        }
    };

    //Depends on Fraction
    //The latex generator
    var LaTeX = {
        space: '~',
        dot: ' \\cdot ',
        //grab a list of supported functions but remove the excluded ones found in exclFN
        
        latex: function(symbol, option) { 
            //it might be an array
            if(symbol.clone)
                symbol = symbol.clone(); //leave original as-is
            
            if(isArray(symbol)) {
                var LaTeXArray = [];
                for(var i=0; i<symbol.length; i++) {
                    var sym = symbol[i];
                    //This way I can generate LaTeX on an array of strings.
                    if(!isSymbol(sym))
                        sym = _.parse(sym);
                    LaTeXArray.push(this.latex(sym));
                }
                return this.brackets(LaTeXArray.join(', '), 'square');
            }
            
            if(isMatrix(symbol)) {
                var TeX = '\\begin{pmatrix}\n';
                for(var i=0; i<symbol.elements.length; i++) {
                    var rowTeX = [],
                        e = symbol.elements[i];
                    for(var j=0; j<e.length; j++) {
                        rowTeX.push(this.latex(e[j]));
                    }
                    TeX += rowTeX.join(' & ');
                    if (i<symbol.elements.length-1){    
                        TeX+='\\\\\n';
                    }
                }
                TeX += '\\end{pmatrix}';
                return TeX;
            }

            if (isVector(symbol)) {
                var TeX = '\\left[';
                for (var i = 0; i < symbol.elements.length; i++){
                    TeX += this.latex(symbol.elements[i]) + ' ' + (i!==symbol.elements.length-1 ? ',\\,' : '');
                }
                TeX += '\\right]';
                return TeX;
            }

            symbol = symbol.clone();
            var decimal = option === 'decimal',
                power = symbol.power,
                invert = isNegative(power),
                negative = symbol.multiplier.lessThan(0);

            if(symbol.group === P && decimal) {
                return String(symbol.multiplier.toDecimal()*Math.pow(symbol.value, symbol.power.toDecimal()));
            }
            else {
                symbol.multiplier = symbol.multiplier.abs();

                    //if the user wants the result in decimal format then return it as such by placing it at the top part
                var m_array;

                if(decimal) {
                    var m = String(symbol.multiplier.toDecimal());
                    if(m == '1' && !decimal) m = '';
                    m_array = [m, ''];
                }
                else {
                    m_array = [symbol.multiplier.num, symbol.multiplier.den];
                }
                    //get the value as a two part array
                var v_array = this.value(symbol, invert, option, negative),
                    p;    
                //make it all positive since we know whether to push the power to the numerator or denominator already.
                if(invert) power.negate();
                //the power is simple since it requires no additional formatting. We can get it to a
                //string right away. pass in true to neglect unit powers
                if(decimal)  { 
                    p = isSymbol(power) ? LaTeX.latex(power, option) : String(power.toDecimal());
                    if(p == '1') p = '';
                }
                //get the latex representation
                else if(isSymbol(power)) p = this.latex(power, option);
                //get it as a fraction
                else p = this.formatFrac(power, true);
                //use this array to specify if the power is getting attached to the top or the bottom
                var p_array = ['', ''],
                    //stick it to the top or the bottom. If it's negative then the power gets placed on the bottom
                    index = invert ? 1 : 0;
                p_array[index] = p;

                //special case group P and decimal
                var retval = (negative ? '-': '')+this.set(m_array, v_array, p_array, symbol.group === CB);

                return retval.replace(/\+\-/gi, '-');
            }
                
        },
        //greek mapping
        greek: {
            alpha:      '\\alpha',
            beta:       '\\beta',
            gamma:      '\\gamma',
            delta:      '\\delta',
            epsilon:    '\\epsilon',
            zeta:       '\\zeta',
            eta:        '\\eta',
            theta:      '\\theta',
            iota:       '\\iota',
            kappa:      '\\kappa',
            lambda:     '\\lambda',
            mu:         '\\mu',
            nu:         '\\nu',
            xi:         '\\xi',
            omnikron:   '\\omnikron',
            pi:         '\\pi',
            rho:        '\\rho',
            sigma:      '\\sigma',
            tau:        '\\tau',
            upsilon:    '\\upsilon',
            phi:        '\\phi',
            chi:        '\\chi',
            psi:        '\\psi',
            omega:      '\\omega',
            Gamma:      '\\Gamma',
            Delta:      '\\Delta',
            Epsilon:    '\\Epsilon',
            Theta:      '\\Theta',
            Lambda:     '\\Lambda',
            Xi:         '\\Xi',
            Pi:         '\\Pi',
            Sigma:      '\\Sigma',
            Phi:        '\\Phi',
            Psi:        '\\Psi',
            Omega:      '\\Omega'
        },
        //get the raw value of the symbol as an array
        value: function(symbol, inverted, option, negative) { 
            var group = symbol.group,
                previousGroup = symbol.previousGroup,
                v = ['', ''],
                index =  inverted ? 1 : 0; 
            /*if(group === N) //do nothing since we want to return top & bottom blank; */
            if(symbol.isInfinity) {
                v[index] = '\\infty';
            }
            else if(group === S || group === P || previousGroup === S || previousGroup === P || previousGroup === N) { 
                var value = symbol.value; 
                if(value.replace) 
                    value = value.replace(/(.+)_$/, '$1\\_');
                //split it so we can check for instances of alpha as well as alpha_b
                var t_varray = String(value).split('_'); 
                var greek = this.greek[t_varray[0]];
                if(greek) {
                    t_varray[0] = greek;
                    value = t_varray.join('_');
                }
                v[index] = value;
            }
            else if(group === FN || previousGroup === FN) { 
                var name,
                    input = [],
                    fname = symbol.fname;
                //collect the arguments
                for(var i=0; i<symbol.args.length; i++) {
                    var arg = symbol.args[i], item;
                    if(typeof arg === 'string')
                        item = arg;
                    else
                        item = this.latex(arg, option);
                    input.push(item);
                }

                if(fname === SQRT) {
                    v[index] = '\\sqrt'+this.braces(input.join(','));
                }
                else if(fname === ABS) {
                    v[index] = this.brackets(input.join(','), 'abs');
                }
                else if(fname === PARENTHESIS) { 
                    v[index] = this.brackets(input.join(','), 'parens');
                }
                else if(fname === 'limit') {
                    v[index] = ' \\lim\\limits_{'+input[1]+' \\to '+input[2]+'} '+input[0];
                }
                else if(fname === 'integrate') {
                    v[index] = '\\int'+this.braces(input[0])+this.braces('d'+input[1]);
                }
                else if(fname === 'defint') {
                    v[index] = '\\int\\limits_'+this.braces(input[1])+'^'+this.braces(input[2])+' '+input[0]+' d'+input[3];
                }
                else if(fname === FACTORIAL || fname === DOUBLEFACTORIAL) {
                    var arg = symbol.args[0];
                    if(arg.power.equals(1) && (arg.isComposite() || arg.isCombination())) {
                        input[0] = this.brackets(input[0]);
                    }
                    v[index] = input[0]+(fname === FACTORIAL ? '!' : '!!');
                }
                else if(fname === 'floor') {
                    v[index] = '\\left \\lfloor'+this.braces(input[0])+'\\right \\rfloor';
                }
                else if(fname === 'ceil') {
                    v[index] = '\\left \\lceil'+this.braces(input[0])+'\\right \\rceil';
                }
                //capture log(a, b)
                else if(fname === 'log' && input.length > 1) {
                    v[index] = '\\mathrm'+this.braces('log')+'_'+this.braces(input[1])+this.brackets(input[0]);
                }
                //capture log(a, b)
                else if(fname === 'log10') {
                    v[index] = '\\mathrm'+this.braces('log')+'_'+this.braces(10)+this.brackets(input[0]);
                }
                else if(fname === 'sum') {
                    var a = input[0],
                        b = input[1],
                        c = input[2],
                        d = input[3];
                    v[index] = '\\sum\\limits_{'+this.braces(b)+'='+this.braces(c)+'}^'+this.braces(d)+' '+this.braces(a)+'';
                }
                else if(fname === 'product') {
                    var a = input[0],
                        b = input[1],
                        c = input[2],
                        d = input[3];
                    v[index] = '\\prod\\limits_{'+this.braces(b)+'='+this.braces(c)+'}^'+this.braces(d)+' '+this.braces(a)+'';
                }
                else if(fname === 'nthroot') {
                    v[index] = '\\sqrt['+input[1]+']'+this.braces(input[0]);
                }
                else if(fname === 'mod') {
                    v[index] = input[0]+' \\bmod '+input[1];
                }
                else if(fname === 'realpart') { 
                    v[index] = '\\operatorname{Re}'+this.brackets(input[0]);
                }
                else if(fname === 'imagpart') { 
                    v[index] = '\\operatorname{Im}'+this.brackets(input[0]);
                }
                else { 
                    var name = fname!=='' ? '\\mathrm'+this.braces(fname.replace(/_/g, '\\_')) : '';
                    v[index] = name+this.brackets(input.join(','), 'parens');
                }  
            }
            else if(symbol.isComposite()) { 
                var collected = symbol.collectSymbols().sort(
                        group === CP || previousGroup === CP ? 
                        function(a, b) { return b.group - a.group;}:
                        function(a, b) { 
                            var x = isSymbol(a.power) ? -1 : a.power;
                            var y = isSymbol(b.power) ? -1 : b.power;
                            return y-x;
                        }
                    ),
                    symbols = [],
                    l = collected.length;
                for(var i=0; i<l; i++) {
                    symbols.push(LaTeX.latex(collected[i], option));
                }
                var value = symbols.join('+'); 

                v[index] = !(symbol.isLinear() && symbol.multiplier.equals(1)) || negative ? this.brackets(value, 'parens') : value;
            }
            else if(group === CB || previousGroup === EX || previousGroup === CB) { 
                if(group === CB)
                    symbol.distributeExponent();
                //this almost feels a little like cheating but I need to know if I should be wrapping the symbol
                //in brackets or not. We'll do this by checking the value of the numerator and then comparing it 
                //to whether the symbol value is "simple" or not.
                var denominator = [],
                    numerator = [];
                //generate a profile
                var den_map = [], num_map = [], num_c = 0, den_c = 0;
                var setBrackets = function(container, map, counter) {
                    if(counter > 1 && map.length > 0) {
                        var l = map.length;
                        for(var i=0; i<l; i++) {
                            var idx = map[i], item = container[idx];
                            if(!(/^\\left\(.+\\right\)\^\{.+\}$/g.test(item) || /^\\left\(.+\\right\)$/g.test(item))) {
                                container[idx] = LaTeX.brackets(item, 'parens');
                            }
                        }
                    }  
                    return container;
                };
                
                //generate latex for each of them
                symbol.each(function(x) { 
                    var isDenom = isNegative(x.power),
                        laTex;
                    
                    if(isDenom) { 
                        laTex = LaTeX.latex(x.invert(), option);
                        den_c++;
                        if(x.isComposite()) {
                            if(symbol.multiplier.den != 1 && Math.abs(x.power) == 1) laTex = LaTeX.brackets(laTex, 'parens');
                            den_map.push(denominator.length); //make a note of where the composite was found 
                        }
                        
                        denominator.push(laTex);
                    }
                    else {
                        laTex = LaTeX.latex(x, option);
                        num_c++;
                        if(x.isComposite()) {
                            if(symbol.multiplier.num != 1 && Math.abs(x.power) == 1) laTex = LaTeX.brackets(laTex, 'parens');
                            num_map.push(numerator.length);   //make a note of where the composite was found 
                        }
                        numerator.push(laTex);
                    }
                });

                //apply brackets
                setBrackets(numerator, num_map, num_c);
                v[0] = numerator.join(this.dot); //collapse the numerator into one string

                setBrackets(denominator, den_map, den_c);
                v[1] = denominator.join(this.dot); 
            }

            return v;
        },
        set: function(m, v, p, combine_power) { 
            var isBracketed = function(v) {
                return /^\\left\(.+\\right\)$/.test(v);
            };
            //format the power if it exists
            if(p) p = this.formatP(p);
            //group CB will have to be wrapped since the power applies to both it's numerator and denominator
            if(combine_power) {
                //POSSIBLE BUG: If powers for group CB format wrong, investigate this since I might have overlooked something
                //the assumption is that in every case the denonimator should be empty when dealing with CB. I can't think
                //of a case where this isn't true
                var tp = p[0];
                p[0] = ''; //temporarily make p blank
            }

            //merge v and p. Not that v MUST be first since the order matters
            v = this.merge(v, p);
            var mn = m[0], md = m[1], vn = v[0], vd = v[1];
            //filters
            //if the top has a variable but the numerator is one drop it
            if(vn && mn == 1) mn = '';
            //if denominator is 1 drop it always
            if(md == 1) md = ''; 
            //prepare the top portion but check that it's not already bracketed. If it is then leave out the cdot
            var top = this.join(mn, vn, !isBracketed(vn) ? this.dot : '');

            //prepare the bottom portion but check that it's not already bracketed. If it is then leave out the cdot
            var bottom = this.join(md, vd, !isBracketed(vd) ? this.dot : '');
            //format the power if it exists
            //make it a fraction if both top and bottom exists
            if(top && bottom) {
                var frac = this.frac(top, bottom);
                if(combine_power && tp) frac = this.brackets(frac)+tp; 
                return frac;
            }
            //otherwise only the top exists so return that
            else return top;
        },
        merge: function(a, b) {
            var r = [];
            for(var i=0; i<2; i++) r[i] = a[i]+b[i];
            return r;
        },
        //joins together two strings if both exist
        join: function(n, d, glue) {
            if(!n && !d) return '';
            if(n && !d) return n;
            if(d && !n) return d;
            return n+glue+d;
        },
        formatP: function(p_array) {
            for(var i=0; i<2; i++) {
                var p = p_array[i];
                if(p) p_array[i] = '^'+this.braces(p);
            }
            return p_array;    
        },
        /**
         * formats the fractions accordingly.
         * @param {Frac} f
         * @param {bool} make_1_blank - let's the function know to return blank for denominators == 1
         */ 
        formatFrac: function(f, is_pow) { 
            var n = f.num.toString(), 
                d = f.den.toString(); 
            //no need to have x^1
            if(is_pow && n === '1' && d === '1') return '';
            //no need to have x/1
            if(d === '1') return n;
            return this.frac(n, d);
        },
        frac: function(n, d) {
            return '\\frac'+this.braces(n)+this.braces(d);
        },
        braces: function(e) {
            return '{'+e+'}';
        },
        brackets: function(e, typ) {
            typ = typ || 'parens';
            var bracketTypes = {
                parens: ['(', ')'],
                square: ['[', ']'],
                brace:  ['{', '}'],
                abs:    ['|', '|'],
                angle:  ['\\langle', '\\rangle']
            };
            var bracket = bracketTypes[typ];
            return '\\left'+bracket[0]+e+'\\right'+bracket[1];
        }
    };
    
    function Vector(v) { 
        if(isVector(v)) this.elements = v.items.slice(0);
        else if(isArray(v)) this.elements = v.slice(0);
        else this.elements = [].slice.call(arguments);
    }
    
    Vector.arrayPrefill = function(n, val) {
        var a = [];
        val = val || 0;
        for(var i=0; i<n; i++) a[i] = val;
        return a;
    };
    
    Vector.fromArray = function(a) {
        var v = new Vector();
        v.elements = a;
        return v;
    };
    
    //Ported from Sylvester.js
    Vector.prototype = {
        custom: true,
        // Returns element i of the vector
        e: function(i) {
            return (i < 1 || i > this.elements.length) ? null : this.elements[i-1];
        },
        
        set: function(i, val) {
            this.elements[i] = new Symbol(val);
        },
        
        // Returns the number of elements the vector has
        dimensions: function() {
            return this.elements.length;
        },

        // Returns the modulus ('length') of the vector
        modulus: function() {
            return block('SAFE', function() {
                return _.pow((this.dot(this.clone())), new Symbol(0.5));
            }, undefined, this);
        },

        // Returns true iff the vector is equal to the argument
        eql: function(vector) {
            var n = this.elements.length;
            var V = vector.elements || vector;
            if (n !== V.length) { return false; }
            do {
                if (Math.abs(_.subtract(this.elements[n-1],V[n-1]).valueOf()) > PRECISION) { return false; }
            } while (--n);
            return true;
        },

        // Returns a clone of the vector
        clone: function() {
            var V = new Vector(),
                l = this.elements.length;
            for(var i=0; i<l; i++) {
                //Rule: all items within the vector must have a clone method.
                V.elements.push(this.elements[i].clone());
            }
            
            return V;
        },

        // Maps the vector to another vector according to the given function
        map: function(fn) {
            var elements = [];
            this.each(function(x, i) {
                elements.push(fn(x, i));
            });
            return new Vector(elements);
        },

        // Calls the iterator for each element of the vector in turn
        each: function(fn) { 
            var n = this.elements.length, k=n, i;
            do { 
                i = k-n;
                fn(this.elements[i], i+1);
            } while (--n);
        },

        // Returns a new vector created by normalizing the receiver
        toUnitVector: function() {
            return block('SAFE', function() {
                var r = this.modulus();
                if (r.valueOf() === 0) { return this.clone(); }
                return this.map(function(x) { return _.divide(x, r); });
            }, undefined, this);    
        },

        // Returns the angle between the vector and the argument (also a vector)
        angleFrom: function(vector) {
            return block('SAFE', function() {
                var V = vector.elements || vector;
                var n = this.elements.length;
                if (n !== V.length) { return null; }
                var dot = new Symbol(0), mod1 = new Symbol(0), mod2 = new Symbol(0);
                // Work things out in parallel to save time
                this.each(function(x, i) {
                    dot = _.add(dot, _.multiply(x, V[i-1]));
                    mod1 = _.add(mod1, _.multiply(x, x));//will not conflict in safe block
                    mod2 = _.add(mod2, _.multiply(V[i-1], V[i-1]));//will not conflict in safe block
                });
                mod1 = _.pow(mod1, new Symbol(0.5)); mod2 = _.pow(mod2, new Symbol(0.5));
                var product = _.multiply(mod1,mod2);
                if(product.valueOf() === 0) { return null; }
                var theta = _.divide(dot, product);
                var theta_val = theta.valueOf();
                if(theta_val < -1) { theta = -1; }
                if (theta_val > 1) { theta = 1; }
                return new Symbol(Math.acos(theta));
            }, undefined, this);
        },

        // Returns true iff the vector is parallel to the argument
        isParallelTo: function(vector) {
          var angle = this.angleFrom(vector).valueOf();
          return (angle === null) ? null : (angle <= PRECISION);
        },

        // Returns true iff the vector is antiparallel to the argument
        isAntiparallelTo: function(vector) {
          var angle = this.angleFrom(vector).valueOf();
          return (angle === null) ? null : (Math.abs(angle - Math.PI) <= Sylvester.precision);
        },

        // Returns true iff the vector is perpendicular to the argument
        isPerpendicularTo: function(vector) {
          var dot = this.dot(vector);
          return (dot === null) ? null : (Math.abs(dot) <= Sylvester.precision);
        },

        // Returns the result of adding the argument to the vector
        add: function(vector) {
            return block('SAFE', function(){
                var V = vector.elements || vector;
                if (this.elements.length !== V.length) { return null; }
                return this.map(function(x, i) { return _.add(x, V[i-1]); });
            }, undefined, this);
        },

        // Returns the result of subtracting the argument from the vector
        subtract: function(vector) { 
            return block('SAFE', function(){
                var V = vector.elements || vector;
                if (this.elements.length !== V.length) { return null; }
                return this.map(function(x, i) { return _.subtract(x, V[i-1]); });
            }, undefined, this);
        },

        // Returns the result of multiplying the elements of the vector by the argument
        multiply: function(k) {
            return this.map(function(x) { return x.clone()*k.clone(); });
        },

        x: function(k) { return this.multiply(k); },

        // Returns the scalar product of the vector with the argument
        // Both vectors must have equal dimensionality
        dot: function(vector) {
            return block('SAFE', function() {
                var V = vector.elements || vector;
                var product = new Symbol(0), n = this.elements.length;
                if (n !== V.length) { return null; }
                do { product = _.add(product, _.multiply(this.elements[n-1], V[n-1])); } while (--n);
                return product;
            }, undefined, this);  
        },

        // Returns the vector product of the vector with the argument
        // Both vectors must have dimensionality 3
        cross: function(vector) {
            var B = vector.elements || vector;
            if(this.elements.length !== 3 || B.length !== 3) { return null; }
            var A = this.elements;
            return block('SAFE', function() {
                return new Vector([
                    _.subtract(_.multiply(A[1], B[2]), _.multiply(A[2], B[1])),
                    _.subtract(_.multiply(A[2], B[0]), _.multiply(A[0], B[2])),
                    _.subtract(_.multiply(A[0], B[1]), _.multiply(A[1], B[0]))
                ]);
            }, undefined, this);  
        },

        // Returns the (absolute) largest element of the vector
        max: function() {
            var m = 0, n = this.elements.length, k = n, i;
            do { i = k - n;
                if(Math.abs(this.elements[i].valueOf()) > Math.abs(m.valueOf())) { m = this.elements[i]; }
            } while (--n);
            return m;
        },

        // Returns the index of the first match found
        indexOf: function(x) {
            var index = null, n = this.elements.length, k = n, i;
            do { 
                i = k-n;
                if(index === null && this.elements[i].valueOf() === x.valueOf()) {
                    index = i+1;
                }
            } while (--n);
            return index;
        },
        text: function(x) {
            return text(this);
        },
        toString: function() {
            return this.text();
        },
        latex: function(option) {
            var tex = [];
            for(var i=0;i<this.elements.length;i++) {
                tex.push(LaTeX.latex.call(LaTeX, this.elements[i], option));
            }
            return '['+tex.join(', ')+']';
        }
    };
    
    function Matrix() {
        var m = arguments,
            l = m.length, i, el = [];
        if(isMatrix(m)) { //if it's a matrix then make a clone
            for(i=0; i<l; i++) {
                el.push(m[i].slice(0));
            }
        }
        else {
            var row, lw, rl;
            for(i=0; i<l; i++) {
                row = m[i];
                if(isVector(row)) row = row.elements;
                if(!isArray(row)) row = [row];
                rl = row.length;
                if(lw && lw !== rl) err('Unable to create Matrix. Row dimensions do not match!');
                el.push(row);
                lw = rl;
            }
        }
        this.elements = el;
    }
    
    Matrix.identity = function(n) {
        var m = new Matrix();
        for(var i=0; i<n; i++) {
            m.elements.push([]);
            for(var j=0; j<n; j++) {
                m.set(i, j, i === j ? new Symbol(1) : new Symbol(0));
            }
        }
        return m;
    };

    Matrix.fromArray = function(arr) {
        function F(args) {
            return Matrix.apply(this, args);
        }
        F.prototype = Matrix.prototype;

        return new F(arr);
    };
    
    Matrix.zeroMatrix = function(rows, cols) {
        var m = new Matrix();
        for(var i=0; i<rows; i++) {
            m.elements.push(Vector.arrayPrefill(cols, new Symbol(0)));
        }
        return m;
    };
    
    Matrix.prototype = {
        //needs be true to let the parser know not to try to cast it to a symbol
        custom: true, 
        get: function(row, column) {
            if(!this.elements[row])
                return undefined;
            return this.elements[row][column];
        },
        set: function(row, column, value) { 
            if(!this.elements[row]) 
                this.elements[row] = [];
            this.elements[row][column] = isSymbol(value) ? value : new Symbol(value);
        },
        cols: function() {
            return this.elements[0].length;
        },
        rows: function() {
            return this.elements.length;
        },
        row: function(n) {
            if(!n || n > this.cols()) return [];
            return this.elements[n-1];
        },
        col: function(n) {
            var nr = this.rows(),
                col = []; 
            if(n > this.cols() || !n) return col;
            for(var i=0; i<nr; i++) {
                col.push(this.elements[i][n-1]);
            }
            return col;
        },
        eachElement: function(fn) {
            var nr = this.rows(),
                nc = this.cols(), i, j;
            for(i=0; i<nr; i++) {
                for(j=0; j<nc; j++) {
                    this.elements[i][j] = fn.call(this, this.elements[i][j], i, j);
                }
            }
        },
        //ported from Sylvester.js
        determinant: function() {
            if (!this.isSquare()) { return null; }
            var M = this.toRightTriangular();
            var det = M.elements[0][0], n = M.elements.length-1, k = n, i;
            do { 
                i = k-n+1;
                det = _.multiply(det,M.elements[i][i]);
            } while (--n);
            return det;
        },
        isSquare: function() {
            return this.elements.length === this.elements[0].length;
        },
        isSingular: function() {
            return this.isSquare() && this.determinant() === 0;
        },
        augment: function(m) {
            var r = this.rows(), rr = m.rows();
            if(r !== rr) err("Cannot augment matrix. Rows don't match.");
            for(var i=0; i<r; i++) {
                this.elements[i] = this.elements[i].concat(m.elements[i]);
            }
            
            return this;
        },
        clone: function() {
            var r = this.rows(), c = this.cols(),
                m = new Matrix();
            for(var i=0; i<r; i++) {
                m.elements[i] = [];
                for(var j=0; j<c; j++) { 
                    var symbol = this.elements[i][j]; 
                    m.elements[i][j] = isSymbol(symbol) ? symbol.clone() : symbol;
                }
            }
            return m;
        },
        //ported from Sylvester.js
        invert: function() {
            if(!this.isSquare()) err('Matrix is not square!');
            return block('SAFE', function() {
                var ni = this.elements.length, ki = ni, i, j;
                var imatrix = Matrix.identity(ni);
                var M = this.augment(imatrix).toRightTriangular(); 
                var np, kp = M.elements[0].length, p, els, divisor;
                var inverse_elements = [], new_element;
                // Matrix is non-singular so there will be no zeros on the diagonal
                // Cycle through rows from last to first
                do { 
                    i = ni-1;
                    // First, normalise diagonal elements to 1
                    els = []; np = kp;
                    inverse_elements[i] = [];
                    divisor = M.elements[i][i];
                    do { 
                        p = kp - np;
                        new_element = _.divide(M.elements[i][p], divisor.clone());
                        els.push(new_element);
                        // Shuffle of the current row of the right hand side into the results
                        // array as it will not be modified by later runs through this loop
                        if (p >= ki) { inverse_elements[i].push(new_element); }
                    } while (--np);
                    M.elements[i] = els;
                    // Then, subtract this row from those above it to
                    // give the identity matrix on the left hand side
                    for (j=0; j<i; j++) {
                      els = []; np = kp;
                      do { p = kp - np; 
                        els.push(_.subtract(M.elements[j][p].clone(),_.multiply(M.elements[i][p].clone(), M.elements[j][i].clone())));
                      } while (--np);
                      M.elements[j] = els;
                    }
                } while (--ni);
                return Matrix.fromArray(inverse_elements);
            }, undefined, this);
        },
        //ported from Sylvester.js
        toRightTriangular: function() {
            return block('SAFE', function(){
                var M = this.clone(), els, fel, nel, 
                    n = this.elements.length, k = n, i, np, kp = this.elements[0].length, p;
                do { 
                    i = k-n;
                    fel = M.elements[i][i]; 
                    if(fel.valueOf() === 0) {
                        for(var j=i+1; j<k; j++) {
                        nel = M.elements[j][i];
                        if (nel && nel.valueOf() !== 0) {
                            els = []; np = kp;
                            do { 
                                p = kp-np; 
                                els.push(_.add(M.elements[i][p].clone(), M.elements[j][p].clone()));
                            } while (--np);
                            M.elements[i] = els;
                            break;
                        }
                      }
                    }
                    var fel = M.elements[i][i]; 
                    if(fel.valueOf() !== 0) {
                        for (j=i+1; j<k; j++) { 
                            var multiplier = _.divide(M.elements[j][i].clone(),M.elements[i][i].clone()); 
                            els = []; np = kp;
                            do { p = kp - np;
                                // Elements with column numbers up to an including the number
                                // of the row that we're subtracting can safely be set straight to
                                // zero, since that's the point of this routine and it avoids having
                                // to loop over and correct rounding errors later
                                els.push(p <= i ? new Symbol(0) : 
                                        _.subtract(M.elements[j][p].clone(), _.multiply(M.elements[i][p].clone(), multiplier.clone())));
                            } while (--np);
                            M.elements[j] = els;
                        }
                    }
                } while (--n);

                return M;  
            }, undefined, this);     
        },
        transpose: function() {
            var rows = this.elements.length, cols = this.elements[0].length;
            var M = new Matrix(), ni = cols, i, nj, j;
            
            do { 
                i = cols - ni;
                M.elements[i] = [];
                nj = rows;
                do { j = rows - nj;
                    M.elements[i][j] = this.elements[j][i].clone();
                } while (--nj);
            } while (--ni);
            return M;
        },
        // Returns true if the matrix can multiply the argument from the left
        canMultiplyFromLeft: function(matrix) {
          var l = isMatrix(matrix) ? matrix.elements.length : matrix.length;
          // this.columns should equal matrix.rows
          return (this.elements[0].length === l);
        },
        sameSize: function(matrix) {
            return this.rows() === matrix.rows() && this.cols() === matrix.cols();
        },
        multiply: function(matrix) {    
            return block('SAFE', function(){
                var M = matrix.elements || matrix;
                if (!this.canMultiplyFromLeft(M)) { 
                    if(this.sameSize(matrix)) {
                        var MM = new Matrix();
                        var rows = this.rows();
                        for(var i=0; i<rows; i++) {
                            var e = _.multiply(new Vector(this.elements[i]), new Vector(matrix.elements[i]));
                            MM.elements[i] = e.elements;
                        }
                        return MM;
                    }
                    return null; 
                }
                var ni = this.elements.length, ki = ni, i, nj, kj = M[0].length, j;
                var cols = this.elements[0].length, elements = [], sum, nc, c;
                do { 
                    i = ki-ni;
                    elements[i] = [];
                    nj = kj;
                    do { 
                        j = kj - nj;
                        sum = new Symbol(0);
                        nc = cols;
                        do { 
                            c = cols-nc;
                            sum = _.add(sum, _.multiply(this.elements[i][c], M[c][j])) ;
                        } while (--nc);
                      elements[i][j] = sum;
                    } while (--nj);
                } while (--ni);
                return Matrix.fromArray(elements);
            }, undefined, this);
        },
        add: function(matrix) {
            var M = new Matrix();
            if(this.sameSize(matrix)) {
                this.eachElement(function(e, i, j) {
                    M.set(i, j, _.add(e.clone(), matrix.elements[i][j]));
                });
            }
            return M;
        },
        subtract: function(matrix) {
            var M = new Matrix();
            if(this.sameSize(matrix)) {
                this.eachElement(function(e, i, j) {
                    M.set(i, j, _.subtract(e.clone(), matrix.elements[i][j]));
                });
            }
            return M;
        },
        negate: function() {
            this.each(function(e) {
               return e.negate(); 
            });
            return this;
        },
        toVector: function() {
            if(this.rows () === 1 || this.cols() === 1) {
                var v = new Vector();
                v.elements = this.elements;
                return v;
            }
            return this;
        },
        toString: function(newline) {
            var l = this.rows(),
                s = [];
            newline = newline === undefined ? '\n' : newline;
            for(var i=0; i<l; i++) {
                s.push('['+this.elements[i].map(function(x) {
                    return x !== undefined ? x.toString() : '';
                }).join(',')+']');
            }
            return 'matrix'+inBrackets(s.join(','));
        },
        text: function() {
            return 'matrix('+this.toString('')+')';
        },
        latex: function(option) {
            var cols = this.cols(), elements = this.elements; 
            return format('\\begin{vmatrix}{0}\\end{vmatrix}', function() {
                var tex = []; 
                for(var row in elements) {
                    var row_tex = [];
                    for(var i=0; i<cols; i++) {
                        row_tex.push(LaTeX.latex.call(LaTeX, elements[row][i], option));
                    }
                    tex.push(row_tex.join(' & '));
                }
                return tex.join(' \\cr ');
            });
        }
    };
    
    //aliases
    Matrix.prototype.each = Matrix.prototype.eachElement;
    
    /* END CLASSES */

    /* FINALIZE */
    var finalize = function() {
        reserveNames(_.constants);
        reserveNames(_.functions);
        //generatePrimes(Settings.init_primes);//generate the firs 100 primes
    };
    
    var build = Utils.build = function(symbol, arg_array) { 
        symbol = block('PARSE2NUMBER', function() {
            return _.parse(symbol);
        }, true);
        var args = variables(symbol);
        var supplements = [];
        var ftext = function(symbol, xports) { 
            xports = xports || [];
            var c = [],
                group = symbol.group,
                prefix = '';

            var ftext_complex = function(group) {
                var d = group === CB ? '*' : '+',
                    cc = [];
                
                for(var x in symbol.symbols) {
                    var sym = symbol.symbols[x],
                        ft = ftext(sym, xports)[0];
                    //wrap it in brackets if it's group PL or CP
                    if(sym.isComposite())
                        ft = inBrackets(ft);
                    cc.push(ft);
                }
                var retval = cc.join(d);
                retval = retval && !symbol.multiplier.equals(1) ? inBrackets(retval) : retval;
                return retval;
            },

            ftext_function = function(bn) { 
                var retval;
                if(bn in Math) retval = 'Math.'+bn;
                else {
                    if(supplements.indexOf(bn) === -1) { //make sure you're not adding the function twice
                        //Math2 functions aren't part of the standard javascript
                        //Math library and must be exported.
                        xports.push('var '+bn+' = '+ Math2[bn].toString()+'; ');
                        supplements.push(bn);
                    }
                    retval = bn;
                }
                retval = retval+inBrackets(symbol.args.map(function(x) {
                    return ftext(x, xports)[0];
                }).join(','));

                return retval;
            };

            //the multiplier
            if(group === N) 
                c.push(symbol.multiplier.toDecimal());
            else if(symbol.multiplier.equals(-1)) 
                prefix = '-';
            else if(!symbol.multiplier.equals(1)) 
                c.push(symbol.multiplier.toDecimal());
            //the value
            var value;
            
            if(group === S || group === P) value = symbol.value;
            else if(group === FN) { 
                value = ftext_function(symbol.fname);
            }
            else if(group === EX) {
                var pg = symbol.previousGroup;
                if(pg === N || pg === S) value = symbol.value;
                else if(pg === FN) value = ftext_function(symbol.fname);
                else value = ftext_complex(symbol.previousGroup);
            }
            else {
                value = ftext_complex(symbol.group);
            }     

            if(symbol.group !== N && !symbol.power.equals(1)) {
                var pow = ftext(_.parse(symbol.power));
                xports.push(pow[1]);
                value = 'Math.pow'+inBrackets(value+','+pow[0]);
            }

            if(value) c.push(prefix+value);

            return [c.join('*'), xports.join('').replace(/\n+\s+/g, ' ')];
        };
        if(arg_array) { 
            for(var i=0; i<args.length; i++) {
                var arg = args[i];
                if(arg_array.indexOf(arg) === -1) err(arg+' not found in argument array');
            }
            args = arg_array;
        }
        var f_array = ftext(symbol);
        return new Function(args, f_array[1]+' return '+f_array[0]+';');
    };
    
    finalize(); //final preparations
    /* END FINALIZE */

    /* BUILD CORE */
    //This contains all the parts of nerdamer and enables nerdamer's internal functions
    //to be used.
    var C = {
        Operator: Operator,
        groups: Groups,
        Symbol: Symbol,
        Expression: Expression,
        Frac: Frac,
        Vector: Vector,
        Matrix: Matrix,
        Parser: Parser,
        Fraction: Fraction,
        Math2: Math2,
        LaTeX: LaTeX,
        Utils: Utils,
        PARSER: _,
        PARENTHESIS: PARENTHESIS, 
        Settings: Settings,
        err: err,
        bigInt: bigInt,
        exceptions: {
            DivisionByZero: DivisionByZero,
            ParseError: ParseError,
            UndefinedError: UndefinedError, 
            MaximumIterationsReached: MaximumIterationsReached
        }
    };
    
    //provide a mechanism for accessing functions directly
    //Not yet complete!!! Some functions will return undefined. This can maybe 
    //just remove the function object at some point when all functions are eventually
    //housed in the global function object.
    C.Utils.importFunctions = function() {
        var o = {};
        for(var x in _.functions)
            o[x] = _.functions[x][0];
        return o;
    };
    //TODO: fix 
    if(!_.error)
        _.error = err;
    /* END BUILD CORE */

    
    /* EXPORTS */
    /**
     * 
     * @param {String} expression the expression to be evaluated
     * @param {Object} subs the object containing the variable values
     * @param {Integer} location a specific location in the equation list to 
     * insert the evaluated expression
     * @param {String} option additional options
     * @returns {Expression} 
     */
    
    var libExports = function(expression, subs, option, location) { 
        //is the user declaring a function?
        var fndec = /^([a-z_][a-z\d\_]*)\(([a-z_,\s]*)\):=(.+)$/gi.exec(expression);
        if(fndec) 
            return nerdamer.setFunction(fndec[1], fndec[2].split(','), fndec[3]);

        var variable, fn, args;
        //convert any expression passed in to a string
        if(expression instanceof Expression) expression = expression.toString();

        var multi_options = isArray(option),
            expand = 'expand',
            numer = multi_options ? option.indexOf('numer') !== -1 : option === 'numer';
        if((multi_options ? option.indexOf(expand) !== -1 : option === expand)) {
            expression = format('{0}({1})', expand, expression);
        }
        var e = block('PARSE2NUMBER', function(){ 
            return _.parse(expression, subs);
        }, numer || Settings.PARSE2NUMBER);
        
        if(location) { EXPRESSIONS[location-1] = e; }
        else { EXPRESSIONS.push(e);}
        
        if(variable) libExports.setVar(variable, e);
        if(fn) libExports.setFunction(fn, args, e);
        
        return new Expression(e);
    };
    
    libExports.rpn = function(expression) {
        return _.parse(expression, null, true);
    };
    
    libExports.convertToLaTeX = function(e) {
        return _.toTeX(e);
    };
    
    /**
     * Get the version of nerdamer or a loaded add-on
     * @param {String} add_on - The add-on being checked
     * @returns {String} returns the version of nerdamer
     */
    libExports.version = function(add_on) {
        if(add_on) {
            try {
                return C[add_on].version;
            }
            catch(e) {
                return "No module named "+add_on+" found!";
            }
        }
        return version;
    };
    
    /**
     * Get nerdamer generated warnings
     * @returns {String[]}
     */
    libExports.getWarnings = function() {
        return WARNINGS;
    };
    
    /**
     * 
     * @param {String} constant The name of the constant to be set
     * @param {mixed} value The value of the constant 
     * @returns {Object} Returns the nerdamer object
     */
    libExports.setConstant = function(constant, value) {
        validateName(constant); 
        if(!isReserved(constant)) {
            //fix for issue #127
            if(value === 'delete' || value === '') {
                delete _.constants[constant];
            }
            else {
                if(isNaN(value)) throw new Error('Constant must be a number!');
                _.constants[constant] =  value;
            }
        }    
        return this;
    };
    
    /**
     * Returns the value of a previously set constant
     * @param {type} constant
     * @returns {String}
     */
    libExports.getConstant = function(constant) {
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
    libExports.setFunction = function(name, params_array, body) {
        validateName(name);
        if(!isReserved(name)) {
            params_array = params_array || variables(_.parse(body));
            _.functions[name] = [_.mapped_function, params_array.length, {
                    name: name,
                    params: params_array,
                    body: body
            }];
            return true;
        }
        return false;
    };
    
    /**
     * 
     * @returns {C} Exports the nerdamer core functions and objects
     */
    libExports.getCore = function() {
        return C;
    };

    libExports.getExpression = libExports.getEquation = Expression.getExpression;
    
    /**
     * 
     * @param {Boolean} asArray The returned names are returned as an array if this is set to true;
     * @returns {String|Array}
     */
    libExports.reserved = function(asArray) {
        if(asArray){ return RESERVED; }
        return RESERVED.join(', ');
    };
    
    /**
     * 
     * @param {Integer} equation_number the number of the equation to clear. 
     * If 'all' is supplied then all equations are cleared
     * @param {Boolean} keep_EXPRESSIONS_fixed use true if you don't want to keep EXPRESSIONS length fixed
     * @returns {Object} Returns the nerdamer object
     */
    libExports.clear = function( equation_number, keep_EXPRESSIONS_fixed ) { 
        if(equation_number === 'all') { EXPRESSIONS = []; }
        else if(equation_number === 'last') { EXPRESSIONS.pop(); }
        else if(equation_number === 'first') { EXPRESSIONS.shift(); }
        else { 
            var index = !equation_number ? EXPRESSIONS.length : equation_number-1; 
            keep_EXPRESSIONS_fixed === true ? EXPRESSIONS[index] = undefined : remove(EXPRESSIONS, index);
        }   
        return this;
    };
    
    /**
     * Alias for nerdamer.clear('all')
     */
    libExports.flush = function() {
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
    libExports.expressions = function( asObject, asLaTeX, option ) {
        var result = asObject ? {} : [];
        for(var i=0; i<EXPRESSIONS.length; i++) {
            var eq = asLaTeX ? LaTeX.latex(EXPRESSIONS[i], option) : text(EXPRESSIONS[i], option);
            asObject ? result[i+1] = eq : result.push(eq);
        }
        return result;
    };
    
    //the method for registering modules
    libExports.register = function(obj) { 
        var core = this.getCore();
        
        if(isArray(obj)) {
            for(var i=0; i<obj.length; i++) {
                if(obj) this.register(obj[i]);
            }
        }
        else if(obj && Settings.exclude.indexOf(obj.name) === -1) {
            //make sure all the dependencies are available
            if(obj.dependencies) {
                for(var i=0; i<obj.dependencies.length; i++)
                    if(!core[obj.dependencies[i]]) 
                        throw new Error(format('{0} requires {1} to be loaded!', obj.name, obj.dependencies[i]));
            }
            //if no parent object is provided then the function does not have an address and cannot be called directly
            var parent_obj = obj.parent, 
                fn = obj.build.call(core); //call constructor to get function
            if(parent_obj) {
                if(!core[parent_obj]) core[obj.parent] = {};
                
                var ref_obj = parent_obj === 'nerdamer' ? this : core[parent_obj];
                //attach the function to the core
                ref_obj[obj.name] = fn;
            }
            if(obj.visible) _.functions[obj.name] = [fn, obj.numargs]; //make the function available
            
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
    libExports.validVarName = function(varname) {
        try {
            validateName(varname);
            return RESERVED.indexOf(varname) === -1;
        }
        catch(e){ return false; }
    };
    
    /**
     * 
     * @returns {Array} Array of functions currently supported by nerdamer
     */
    libExports.supported = function() {
        return keys(_.functions);
    };
    
    /**
     * 
     * @returns {Number} The number equations/expressions currently loaded
     */
    libExports.numEquations = libExports.numExpressions = function() {
        return EXPRESSIONS.length;
    };
    /* END EXPORTS */
    
    /**
     * 
     * @param {String} v variable to be set
     * @param {String} val value of variable. This can be a variable expression or number
     * @returns {Object} Returns the nerdamer object
     */
    libExports.setVar = function(v, val) {
        validateName(v);
        //check if it's not already a constant
        if(v in _.constants)
            err('Cannot set value for constant '+v);
        if(val === 'delete' || val === '') 
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
    libExports.getVar = function(v) {
        return VARS[v];
    };
    /**
     * Clear the variables from the VARS object
     * @returns {Object} Returns the nerdamer object
     */    
    libExports.clearVars = function() {
        VARS = {};
        return this;
    };
    
    /**
     * 
     * @param {Function} loader
     * @returns {nerdamer}
     */
    libExports.load = function(loader) {
        loader.call(this);
        return this;
    };
    
    /**
     * @param {String} output - output format. Can be 'object' (just returns the VARS object), 'text' or 'latex'. Default: 'text'
     * @param {String|String[]} option
     * @returns {Object} Returns an object with the variables
     */    
    libExports.getVars = function(output, option) {
        output = output || 'text';
        var variables = {};
        if (output === 'object') variables = VARS;
        else {
            for (var v in VARS) {
                if (output === 'latex') {
                    variables[v] = VARS[v].latex(option);
                } else if (output === 'text') {
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
    libExports.set = function(setting, value) {
        //current options:
        //PARSE2NUMBER, suppress_errors
        if(typeof setting === 'object')
            for(var x in setting) { 
                libExports.set(x, setting[x]);
            }
                
        var disallowed = ['SAFE'];
        if(disallowed.indexOf(setting) !== -1) err('Cannot modify setting: '+setting);
        Settings[setting] = value;
    };
    
    /**
     * Get the value of a setting
     * @param {type} setting
     * @returns {undefined}
     */
    libExports.get = function(setting) {
        return Settings[setting];
    };
    
    /**
     * This functions makes internal functions available externally
     * @param {bool} override Override the functions when calling api if it exists 
     */
    libExports.api = function(override) {
        //Map internal functions to external ones
        var linker = function(fname) {
            return function() {
                var args = [].slice.call(arguments);
                for(var i=0; i<args.length; i++)
                    args[i] = _.parse(args[i]);
                return new Expression(block('PARSE2NUMBER', function() {
                    return _.callfunction(fname, args);
                }));
            };
        };
        //perform the mapping
        for(var x in _.functions) 
            if(!(x in libExports) || override)
                libExports[x] = linker(x);
    };
    
    libExports.replaceFunction = function(name, fn, num_args) {
        var existing = _.functions[name];
        var new_num_args = typeof num_args === 'undefined' ? existing[1]: num_args;
        _.functions[name] = [fn.call(undefined, existing[0], C), new_num_args];
    };
    
    //helper function to set and operator
    //Operator('^', 'pow', 6, false, false),
    //function Operator(val, fn, precedence, left_assoc, is_prefix, is_postfix, operation) 
    libExports.setOperator = function(symbol, name, precendence, left_assoc, is_prefix, is_postfix, fn) {
        _.operators[symbol] = new Operator(symbol, name, precendence, left_assoc, is_prefix, is_postfix, fn);
        _.name = name; //make the parser aware of this  new function
        CUSTOM_OPERATORS[name] = symbol; //let nerdamer know how to display it
    };
    
    libExports.getOperator = function(symbol) {
        return _.operators[symbol];
    };
    
    libExports.api();

    return libExports; //Done
})({
    //https://github.com/peterolson/BigInteger.js
    bigInt: (function(){
        var bigInt = function(undefined){"use strict";var BASE=1e7,LOG_BASE=7,MAX_INT=9007199254740992,MAX_INT_ARR=smallToArray(MAX_INT),LOG_MAX_INT=Math.log(MAX_INT);function Integer(v,radix){if(typeof v==="undefined")return Integer[0];if(typeof radix!=="undefined")return+radix===10?parseValue(v):parseBase(v,radix);return parseValue(v)}function BigInteger(value,sign){this.value=value;this.sign=sign;this.isSmall=false}BigInteger.prototype=Object.create(Integer.prototype);function SmallInteger(value){this.value=value;this.sign=value<0;this.isSmall=true}SmallInteger.prototype=Object.create(Integer.prototype);function isPrecise(n){return-MAX_INT<n&&n<MAX_INT}function smallToArray(n){if(n<1e7)return[n];if(n<1e14)return[n%1e7,Math.floor(n/1e7)];return[n%1e7,Math.floor(n/1e7)%1e7,Math.floor(n/1e14)]}function arrayToSmall(arr){trim(arr);var length=arr.length;if(length<4&&compareAbs(arr,MAX_INT_ARR)<0){switch(length){case 0:return 0;case 1:return arr[0];case 2:return arr[0]+arr[1]*BASE;default:return arr[0]+(arr[1]+arr[2]*BASE)*BASE}}return arr}function trim(v){var i=v.length;while(v[--i]===0);v.length=i+1}function createArray(length){var x=new Array(length);var i=-1;while(++i<length){x[i]=0}return x}function truncate(n){if(n>0)return Math.floor(n);return Math.ceil(n)}function add(a,b){var l_a=a.length,l_b=b.length,r=new Array(l_a),carry=0,base=BASE,sum,i;for(i=0;i<l_b;i++){sum=a[i]+b[i]+carry;carry=sum>=base?1:0;r[i]=sum-carry*base}while(i<l_a){sum=a[i]+carry;carry=sum===base?1:0;r[i++]=sum-carry*base}if(carry>0)r.push(carry);return r}function addAny(a,b){if(a.length>=b.length)return add(a,b);return add(b,a)}function addSmall(a,carry){var l=a.length,r=new Array(l),base=BASE,sum,i;for(i=0;i<l;i++){sum=a[i]-base+carry;carry=Math.floor(sum/base);r[i]=sum-carry*base;carry+=1}while(carry>0){r[i++]=carry%base;carry=Math.floor(carry/base)}return r}BigInteger.prototype.add=function(v){var n=parseValue(v);if(this.sign!==n.sign){return this.subtract(n.negate())}var a=this.value,b=n.value;if(n.isSmall){return new BigInteger(addSmall(a,Math.abs(b)),this.sign)}return new BigInteger(addAny(a,b),this.sign)};BigInteger.prototype.plus=BigInteger.prototype.add;SmallInteger.prototype.add=function(v){var n=parseValue(v);var a=this.value;if(a<0!==n.sign){return this.subtract(n.negate())}var b=n.value;if(n.isSmall){if(isPrecise(a+b))return new SmallInteger(a+b);b=smallToArray(Math.abs(b))}return new BigInteger(addSmall(b,Math.abs(a)),a<0)};SmallInteger.prototype.plus=SmallInteger.prototype.add;function subtract(a,b){var a_l=a.length,b_l=b.length,r=new Array(a_l),borrow=0,base=BASE,i,difference;for(i=0;i<b_l;i++){difference=a[i]-borrow-b[i];if(difference<0){difference+=base;borrow=1}else borrow=0;r[i]=difference}for(i=b_l;i<a_l;i++){difference=a[i]-borrow;if(difference<0)difference+=base;else{r[i++]=difference;break}r[i]=difference}for(;i<a_l;i++){r[i]=a[i]}trim(r);return r}function subtractAny(a,b,sign){var value;if(compareAbs(a,b)>=0){value=subtract(a,b)}else{value=subtract(b,a);sign=!sign}value=arrayToSmall(value);if(typeof value==="number"){if(sign)value=-value;return new SmallInteger(value)}return new BigInteger(value,sign)}function subtractSmall(a,b,sign){var l=a.length,r=new Array(l),carry=-b,base=BASE,i,difference;for(i=0;i<l;i++){difference=a[i]+carry;carry=Math.floor(difference/base);difference%=base;r[i]=difference<0?difference+base:difference}r=arrayToSmall(r);if(typeof r==="number"){if(sign)r=-r;return new SmallInteger(r)}return new BigInteger(r,sign)}BigInteger.prototype.subtract=function(v){var n=parseValue(v);if(this.sign!==n.sign){return this.add(n.negate())}var a=this.value,b=n.value;if(n.isSmall)return subtractSmall(a,Math.abs(b),this.sign);return subtractAny(a,b,this.sign)};BigInteger.prototype.minus=BigInteger.prototype.subtract;SmallInteger.prototype.subtract=function(v){var n=parseValue(v);var a=this.value;if(a<0!==n.sign){return this.add(n.negate())}var b=n.value;if(n.isSmall){return new SmallInteger(a-b)}return subtractSmall(b,Math.abs(a),a>=0)};SmallInteger.prototype.minus=SmallInteger.prototype.subtract;BigInteger.prototype.negate=function(){return new BigInteger(this.value,!this.sign)};SmallInteger.prototype.negate=function(){var sign=this.sign;var small=new SmallInteger(-this.value);small.sign=!sign;return small};BigInteger.prototype.abs=function(){return new BigInteger(this.value,false)};SmallInteger.prototype.abs=function(){return new SmallInteger(Math.abs(this.value))};function multiplyLong(a,b){var a_l=a.length,b_l=b.length,l=a_l+b_l,r=createArray(l),base=BASE,product,carry,i,a_i,b_j;for(i=0;i<a_l;++i){a_i=a[i];for(var j=0;j<b_l;++j){b_j=b[j];product=a_i*b_j+r[i+j];carry=Math.floor(product/base);r[i+j]=product-carry*base;r[i+j+1]+=carry}}trim(r);return r}function multiplySmall(a,b){var l=a.length,r=new Array(l),base=BASE,carry=0,product,i;for(i=0;i<l;i++){product=a[i]*b+carry;carry=Math.floor(product/base);r[i]=product-carry*base}while(carry>0){r[i++]=carry%base;carry=Math.floor(carry/base)}return r}function shiftLeft(x,n){var r=[];while(n-- >0)r.push(0);return r.concat(x)}function multiplyKaratsuba(x,y){var n=Math.max(x.length,y.length);if(n<=30)return multiplyLong(x,y);n=Math.ceil(n/2);var b=x.slice(n),a=x.slice(0,n),d=y.slice(n),c=y.slice(0,n);var ac=multiplyKaratsuba(a,c),bd=multiplyKaratsuba(b,d),abcd=multiplyKaratsuba(addAny(a,b),addAny(c,d));var product=addAny(addAny(ac,shiftLeft(subtract(subtract(abcd,ac),bd),n)),shiftLeft(bd,2*n));trim(product);return product}function useKaratsuba(l1,l2){return-.012*l1-.012*l2+15e-6*l1*l2>0}BigInteger.prototype.multiply=function(v){var n=parseValue(v),a=this.value,b=n.value,sign=this.sign!==n.sign,abs;if(n.isSmall){if(b===0)return Integer[0];if(b===1)return this;if(b===-1)return this.negate();abs=Math.abs(b);if(abs<BASE){return new BigInteger(multiplySmall(a,abs),sign)}b=smallToArray(abs)}if(useKaratsuba(a.length,b.length))return new BigInteger(multiplyKaratsuba(a,b),sign);return new BigInteger(multiplyLong(a,b),sign)};BigInteger.prototype.times=BigInteger.prototype.multiply;function multiplySmallAndArray(a,b,sign){if(a<BASE){return new BigInteger(multiplySmall(b,a),sign)}return new BigInteger(multiplyLong(b,smallToArray(a)),sign)}SmallInteger.prototype._multiplyBySmall=function(a){if(isPrecise(a.value*this.value)){return new SmallInteger(a.value*this.value)}return multiplySmallAndArray(Math.abs(a.value),smallToArray(Math.abs(this.value)),this.sign!==a.sign)};BigInteger.prototype._multiplyBySmall=function(a){if(a.value===0)return Integer[0];if(a.value===1)return this;if(a.value===-1)return this.negate();return multiplySmallAndArray(Math.abs(a.value),this.value,this.sign!==a.sign)};SmallInteger.prototype.multiply=function(v){return parseValue(v)._multiplyBySmall(this)};SmallInteger.prototype.times=SmallInteger.prototype.multiply;function square(a){var l=a.length,r=createArray(l+l),base=BASE,product,carry,i,a_i,a_j;for(i=0;i<l;i++){a_i=a[i];for(var j=0;j<l;j++){a_j=a[j];product=a_i*a_j+r[i+j];carry=Math.floor(product/base);r[i+j]=product-carry*base;r[i+j+1]+=carry}}trim(r);return r}BigInteger.prototype.square=function(){return new BigInteger(square(this.value),false)};SmallInteger.prototype.square=function(){var value=this.value*this.value;if(isPrecise(value))return new SmallInteger(value);return new BigInteger(square(smallToArray(Math.abs(this.value))),false)};function divMod1(a,b){var a_l=a.length,b_l=b.length,base=BASE,result=createArray(b.length),divisorMostSignificantDigit=b[b_l-1],lambda=Math.ceil(base/(2*divisorMostSignificantDigit)),remainder=multiplySmall(a,lambda),divisor=multiplySmall(b,lambda),quotientDigit,shift,carry,borrow,i,l,q;if(remainder.length<=a_l)remainder.push(0);divisor.push(0);divisorMostSignificantDigit=divisor[b_l-1];for(shift=a_l-b_l;shift>=0;shift--){quotientDigit=base-1;if(remainder[shift+b_l]!==divisorMostSignificantDigit){quotientDigit=Math.floor((remainder[shift+b_l]*base+remainder[shift+b_l-1])/divisorMostSignificantDigit)}carry=0;borrow=0;l=divisor.length;for(i=0;i<l;i++){carry+=quotientDigit*divisor[i];q=Math.floor(carry/base);borrow+=remainder[shift+i]-(carry-q*base);carry=q;if(borrow<0){remainder[shift+i]=borrow+base;borrow=-1}else{remainder[shift+i]=borrow;borrow=0}}while(borrow!==0){quotientDigit-=1;carry=0;for(i=0;i<l;i++){carry+=remainder[shift+i]-base+divisor[i];if(carry<0){remainder[shift+i]=carry+base;carry=0}else{remainder[shift+i]=carry;carry=1}}borrow+=carry}result[shift]=quotientDigit}remainder=divModSmall(remainder,lambda)[0];return[arrayToSmall(result),arrayToSmall(remainder)]}function divMod2(a,b){var a_l=a.length,b_l=b.length,result=[],part=[],base=BASE,guess,xlen,highx,highy,check;while(a_l){part.unshift(a[--a_l]);trim(part);if(compareAbs(part,b)<0){result.push(0);continue}xlen=part.length;highx=part[xlen-1]*base+part[xlen-2];highy=b[b_l-1]*base+b[b_l-2];if(xlen>b_l){highx=(highx+1)*base}guess=Math.ceil(highx/highy);do{check=multiplySmall(b,guess);if(compareAbs(check,part)<=0)break;guess--}while(guess);result.push(guess);part=subtract(part,check)}result.reverse();return[arrayToSmall(result),arrayToSmall(part)]}function divModSmall(value,lambda){var length=value.length,quotient=createArray(length),base=BASE,i,q,remainder,divisor;remainder=0;for(i=length-1;i>=0;--i){divisor=remainder*base+value[i];q=truncate(divisor/lambda);remainder=divisor-q*lambda;quotient[i]=q|0}return[quotient,remainder|0]}function divModAny(self,v){var value,n=parseValue(v);var a=self.value,b=n.value;var quotient;if(b===0)throw new Error("Cannot divide by zero");if(self.isSmall){if(n.isSmall){return[new SmallInteger(truncate(a/b)),new SmallInteger(a%b)]}return[Integer[0],self]}if(n.isSmall){if(b===1)return[self,Integer[0]];if(b==-1)return[self.negate(),Integer[0]];var abs=Math.abs(b);if(abs<BASE){value=divModSmall(a,abs);quotient=arrayToSmall(value[0]);var remainder=value[1];if(self.sign)remainder=-remainder;if(typeof quotient==="number"){if(self.sign!==n.sign)quotient=-quotient;return[new SmallInteger(quotient),new SmallInteger(remainder)]}return[new BigInteger(quotient,self.sign!==n.sign),new SmallInteger(remainder)]}b=smallToArray(abs)}var comparison=compareAbs(a,b);if(comparison===-1)return[Integer[0],self];if(comparison===0)return[Integer[self.sign===n.sign?1:-1],Integer[0]];if(a.length+b.length<=200)value=divMod1(a,b);else value=divMod2(a,b);quotient=value[0];var qSign=self.sign!==n.sign,mod=value[1],mSign=self.sign;if(typeof quotient==="number"){if(qSign)quotient=-quotient;quotient=new SmallInteger(quotient)}else quotient=new BigInteger(quotient,qSign);if(typeof mod==="number"){if(mSign)mod=-mod;mod=new SmallInteger(mod)}else mod=new BigInteger(mod,mSign);return[quotient,mod]}BigInteger.prototype.divmod=function(v){var result=divModAny(this,v);return{quotient:result[0],remainder:result[1]}};SmallInteger.prototype.divmod=BigInteger.prototype.divmod;BigInteger.prototype.divide=function(v){return divModAny(this,v)[0]};SmallInteger.prototype.over=SmallInteger.prototype.divide=BigInteger.prototype.over=BigInteger.prototype.divide;BigInteger.prototype.mod=function(v){return divModAny(this,v)[1]};SmallInteger.prototype.remainder=SmallInteger.prototype.mod=BigInteger.prototype.remainder=BigInteger.prototype.mod;BigInteger.prototype.pow=function(v){var n=parseValue(v),a=this.value,b=n.value,value,x,y;if(b===0)return Integer[1];if(a===0)return Integer[0];if(a===1)return Integer[1];if(a===-1)return n.isEven()?Integer[1]:Integer[-1];if(n.sign){return Integer[0]}if(!n.isSmall)throw new Error("The exponent "+n.toString()+" is too large.");if(this.isSmall){if(isPrecise(value=Math.pow(a,b)))return new SmallInteger(truncate(value))}x=this;y=Integer[1];while(true){if(b&1===1){y=y.times(x);--b}if(b===0)break;b/=2;x=x.square()}return y};SmallInteger.prototype.pow=BigInteger.prototype.pow;BigInteger.prototype.modPow=function(exp,mod){exp=parseValue(exp);mod=parseValue(mod);if(mod.isZero())throw new Error("Cannot take modPow with modulus 0");var r=Integer[1],base=this.mod(mod);while(exp.isPositive()){if(base.isZero())return Integer[0];if(exp.isOdd())r=r.multiply(base).mod(mod);exp=exp.divide(2);base=base.square().mod(mod)}return r};SmallInteger.prototype.modPow=BigInteger.prototype.modPow;function compareAbs(a,b){if(a.length!==b.length){return a.length>b.length?1:-1}for(var i=a.length-1;i>=0;i--){if(a[i]!==b[i])return a[i]>b[i]?1:-1}return 0}BigInteger.prototype.compareAbs=function(v){var n=parseValue(v),a=this.value,b=n.value;if(n.isSmall)return 1;return compareAbs(a,b)};SmallInteger.prototype.compareAbs=function(v){var n=parseValue(v),a=Math.abs(this.value),b=n.value;if(n.isSmall){b=Math.abs(b);return a===b?0:a>b?1:-1}return-1};BigInteger.prototype.compare=function(v){if(v===Infinity){return-1}if(v===-Infinity){return 1}var n=parseValue(v),a=this.value,b=n.value;if(this.sign!==n.sign){return n.sign?1:-1}if(n.isSmall){return this.sign?-1:1}return compareAbs(a,b)*(this.sign?-1:1)};BigInteger.prototype.compareTo=BigInteger.prototype.compare;SmallInteger.prototype.compare=function(v){if(v===Infinity){return-1}if(v===-Infinity){return 1}var n=parseValue(v),a=this.value,b=n.value;if(n.isSmall){return a==b?0:a>b?1:-1}if(a<0!==n.sign){return a<0?-1:1}return a<0?1:-1};SmallInteger.prototype.compareTo=SmallInteger.prototype.compare;BigInteger.prototype.equals=function(v){return this.compare(v)===0};SmallInteger.prototype.eq=SmallInteger.prototype.equals=BigInteger.prototype.eq=BigInteger.prototype.equals;BigInteger.prototype.notEquals=function(v){return this.compare(v)!==0};SmallInteger.prototype.neq=SmallInteger.prototype.notEquals=BigInteger.prototype.neq=BigInteger.prototype.notEquals;BigInteger.prototype.greater=function(v){return this.compare(v)>0};SmallInteger.prototype.gt=SmallInteger.prototype.greater=BigInteger.prototype.gt=BigInteger.prototype.greater;BigInteger.prototype.lesser=function(v){return this.compare(v)<0};SmallInteger.prototype.lt=SmallInteger.prototype.lesser=BigInteger.prototype.lt=BigInteger.prototype.lesser;BigInteger.prototype.greaterOrEquals=function(v){return this.compare(v)>=0};SmallInteger.prototype.geq=SmallInteger.prototype.greaterOrEquals=BigInteger.prototype.geq=BigInteger.prototype.greaterOrEquals;BigInteger.prototype.lesserOrEquals=function(v){return this.compare(v)<=0};SmallInteger.prototype.leq=SmallInteger.prototype.lesserOrEquals=BigInteger.prototype.leq=BigInteger.prototype.lesserOrEquals;BigInteger.prototype.isEven=function(){return(this.value[0]&1)===0};SmallInteger.prototype.isEven=function(){return(this.value&1)===0};BigInteger.prototype.isOdd=function(){return(this.value[0]&1)===1};SmallInteger.prototype.isOdd=function(){return(this.value&1)===1};BigInteger.prototype.isPositive=function(){return!this.sign};SmallInteger.prototype.isPositive=function(){return this.value>0};BigInteger.prototype.isNegative=function(){return this.sign};SmallInteger.prototype.isNegative=function(){return this.value<0};BigInteger.prototype.isUnit=function(){return false};SmallInteger.prototype.isUnit=function(){return Math.abs(this.value)===1};BigInteger.prototype.isZero=function(){return false};SmallInteger.prototype.isZero=function(){return this.value===0};BigInteger.prototype.isDivisibleBy=function(v){var n=parseValue(v);var value=n.value;if(value===0)return false;if(value===1)return true;if(value===2)return this.isEven();return this.mod(n).equals(Integer[0])};SmallInteger.prototype.isDivisibleBy=BigInteger.prototype.isDivisibleBy;function isBasicPrime(v){var n=v.abs();if(n.isUnit())return false;if(n.equals(2)||n.equals(3)||n.equals(5))return true;if(n.isEven()||n.isDivisibleBy(3)||n.isDivisibleBy(5))return false;if(n.lesser(25))return true}BigInteger.prototype.isPrime=function(){var isPrime=isBasicPrime(this);if(isPrime!==undefined)return isPrime;var n=this.abs(),nPrev=n.prev();var a=[2,3,5,7,11,13,17,19],b=nPrev,d,t,i,x;while(b.isEven())b=b.divide(2);for(i=0;i<a.length;i++){x=bigInt(a[i]).modPow(b,n);if(x.equals(Integer[1])||x.equals(nPrev))continue;for(t=true,d=b;t&&d.lesser(nPrev);d=d.multiply(2)){x=x.square().mod(n);if(x.equals(nPrev))t=false}if(t)return false}return true};SmallInteger.prototype.isPrime=BigInteger.prototype.isPrime;BigInteger.prototype.isProbablePrime=function(iterations){var isPrime=isBasicPrime(this);if(isPrime!==undefined)return isPrime;var n=this.abs();var t=iterations===undefined?5:iterations;for(var i=0;i<t;i++){var a=bigInt.randBetween(2,n.minus(2));if(!a.modPow(n.prev(),n).isUnit())return false}return true};SmallInteger.prototype.isProbablePrime=BigInteger.prototype.isProbablePrime;BigInteger.prototype.modInv=function(n){var t=bigInt.zero,newT=bigInt.one,r=parseValue(n),newR=this.abs(),q,lastT,lastR;while(!newR.equals(bigInt.zero)){q=r.divide(newR);lastT=t;lastR=r;t=newT;r=newR;newT=lastT.subtract(q.multiply(newT));newR=lastR.subtract(q.multiply(newR))}if(!r.equals(1))throw new Error(this.toString()+" and "+n.toString()+" are not co-prime");if(t.compare(0)===-1){t=t.add(n)}if(this.isNegative()){return t.negate()}return t};SmallInteger.prototype.modInv=BigInteger.prototype.modInv;BigInteger.prototype.next=function(){var value=this.value;if(this.sign){return subtractSmall(value,1,this.sign)}return new BigInteger(addSmall(value,1),this.sign)};SmallInteger.prototype.next=function(){var value=this.value;if(value+1<MAX_INT)return new SmallInteger(value+1);return new BigInteger(MAX_INT_ARR,false)};BigInteger.prototype.prev=function(){var value=this.value;if(this.sign){return new BigInteger(addSmall(value,1),true)}return subtractSmall(value,1,this.sign)};SmallInteger.prototype.prev=function(){var value=this.value;if(value-1>-MAX_INT)return new SmallInteger(value-1);return new BigInteger(MAX_INT_ARR,true)};var powersOfTwo=[1];while(powersOfTwo[powersOfTwo.length-1]<=BASE)powersOfTwo.push(2*powersOfTwo[powersOfTwo.length-1]);var powers2Length=powersOfTwo.length,highestPower2=powersOfTwo[powers2Length-1];function shift_isSmall(n){return(typeof n==="number"||typeof n==="string")&&+Math.abs(n)<=BASE||n instanceof BigInteger&&n.value.length<=1}BigInteger.prototype.shiftLeft=function(n){if(!shift_isSmall(n)){throw new Error(String(n)+" is too large for shifting.")}n=+n;if(n<0)return this.shiftRight(-n);var result=this;while(n>=powers2Length){result=result.multiply(highestPower2);n-=powers2Length-1}return result.multiply(powersOfTwo[n])};SmallInteger.prototype.shiftLeft=BigInteger.prototype.shiftLeft;BigInteger.prototype.shiftRight=function(n){var remQuo;if(!shift_isSmall(n)){throw new Error(String(n)+" is too large for shifting.")}n=+n;if(n<0)return this.shiftLeft(-n);var result=this;while(n>=powers2Length){if(result.isZero())return result;remQuo=divModAny(result,highestPower2);result=remQuo[1].isNegative()?remQuo[0].prev():remQuo[0];n-=powers2Length-1}remQuo=divModAny(result,powersOfTwo[n]);return remQuo[1].isNegative()?remQuo[0].prev():remQuo[0]};SmallInteger.prototype.shiftRight=BigInteger.prototype.shiftRight;function bitwise(x,y,fn){y=parseValue(y);var xSign=x.isNegative(),ySign=y.isNegative();var xRem=xSign?x.not():x,yRem=ySign?y.not():y;var xBits=[],yBits=[];var xStop=false,yStop=false;while(!xStop||!yStop){if(xRem.isZero()){xStop=true;xBits.push(xSign?1:0)}else if(xSign)xBits.push(xRem.isEven()?1:0);else xBits.push(xRem.isEven()?0:1);if(yRem.isZero()){yStop=true;yBits.push(ySign?1:0)}else if(ySign)yBits.push(yRem.isEven()?1:0);else yBits.push(yRem.isEven()?0:1);xRem=xRem.over(2);yRem=yRem.over(2)}var result=[];for(var i=0;i<xBits.length;i++)result.push(fn(xBits[i],yBits[i]));var sum=bigInt(result.pop()).negate().times(bigInt(2).pow(result.length));while(result.length){sum=sum.add(bigInt(result.pop()).times(bigInt(2).pow(result.length)))}return sum}BigInteger.prototype.not=function(){return this.negate().prev()};SmallInteger.prototype.not=BigInteger.prototype.not;BigInteger.prototype.and=function(n){return bitwise(this,n,function(a,b){return a&b})};SmallInteger.prototype.and=BigInteger.prototype.and;BigInteger.prototype.or=function(n){return bitwise(this,n,function(a,b){return a|b})};SmallInteger.prototype.or=BigInteger.prototype.or;BigInteger.prototype.xor=function(n){return bitwise(this,n,function(a,b){return a^b})};SmallInteger.prototype.xor=BigInteger.prototype.xor;var LOBMASK_I=1<<30,LOBMASK_BI=(BASE&-BASE)*(BASE&-BASE)|LOBMASK_I;function roughLOB(n){var v=n.value,x=typeof v==="number"?v|LOBMASK_I:v[0]+v[1]*BASE|LOBMASK_BI;return x&-x}function max(a,b){a=parseValue(a);b=parseValue(b);return a.greater(b)?a:b}function min(a,b){a=parseValue(a);b=parseValue(b);return a.lesser(b)?a:b}function gcd(a,b){a=parseValue(a).abs();b=parseValue(b).abs();if(a.equals(b))return a;if(a.isZero())return b;if(b.isZero())return a;var c=Integer[1],d,t;while(a.isEven()&&b.isEven()){d=Math.min(roughLOB(a),roughLOB(b));a=a.divide(d);b=b.divide(d);c=c.multiply(d)}while(a.isEven()){a=a.divide(roughLOB(a))}do{while(b.isEven()){b=b.divide(roughLOB(b))}if(a.greater(b)){t=b;b=a;a=t}b=b.subtract(a)}while(!b.isZero());return c.isUnit()?a:a.multiply(c)}function lcm(a,b){a=parseValue(a).abs();b=parseValue(b).abs();return a.divide(gcd(a,b)).multiply(b)}function randBetween(a,b){a=parseValue(a);b=parseValue(b);var low=min(a,b),high=max(a,b);var range=high.subtract(low);if(range.isSmall)return low.add(Math.round(Math.random()*range));var length=range.value.length-1;var result=[],restricted=true;for(var i=length;i>=0;i--){var top=restricted?range.value[i]:BASE;var digit=truncate(Math.random()*top);result.unshift(digit);if(digit<top)restricted=false}result=arrayToSmall(result);return low.add(typeof result==="number"?new SmallInteger(result):new BigInteger(result,false))}var parseBase=function(text,base){var length=text.length;var i;var absBase=Math.abs(base);for(var i=0;i<length;i++){var c=text[i].toLowerCase();if(c==="-")continue;if(/[a-z0-9]/.test(c)){if(/[0-9]/.test(c)&&+c>=absBase){if(c==="1"&&absBase===1)continue;throw new Error(c+" is not a valid digit in base "+base+".")}else if(c.charCodeAt(0)-87>=absBase){throw new Error(c+" is not a valid digit in base "+base+".")}}}if(2<=base&&base<=36){if(length<=LOG_MAX_INT/Math.log(base)){var result=parseInt(text,base);if(isNaN(result)){throw new Error(c+" is not a valid digit in base "+base+".")}return new SmallInteger(parseInt(text,base))}}base=parseValue(base);var digits=[];var isNegative=text[0]==="-";for(i=isNegative?1:0;i<text.length;i++){var c=text[i].toLowerCase(),charCode=c.charCodeAt(0);if(48<=charCode&&charCode<=57)digits.push(parseValue(c));else if(97<=charCode&&charCode<=122)digits.push(parseValue(c.charCodeAt(0)-87));else if(c==="<"){var start=i;do{i++}while(text[i]!==">");digits.push(parseValue(text.slice(start+1,i)))}else throw new Error(c+" is not a valid character")}return parseBaseFromArray(digits,base,isNegative)};function parseBaseFromArray(digits,base,isNegative){var val=Integer[0],pow=Integer[1],i;for(i=digits.length-1;i>=0;i--){val=val.add(digits[i].times(pow));pow=pow.times(base)}return isNegative?val.negate():val}function stringify(digit){var v=digit.value;if(typeof v==="number")v=[v];if(v.length===1&&v[0]<=35){return"0123456789abcdefghijklmnopqrstuvwxyz".charAt(v[0])}return"<"+v+">"}function toBase(n,base){base=bigInt(base);if(base.isZero()){if(n.isZero())return"0";throw new Error("Cannot convert nonzero numbers to base 0.")}if(base.equals(-1)){if(n.isZero())return"0";if(n.isNegative())return new Array(1-n).join("10");return"1"+new Array(+n).join("01")}var minusSign="";if(n.isNegative()&&base.isPositive()){minusSign="-";n=n.abs()}if(base.equals(1)){if(n.isZero())return"0";return minusSign+new Array(+n+1).join(1)}var out=[];var left=n,divmod;while(left.isNegative()||left.compareAbs(base)>=0){divmod=left.divmod(base);left=divmod.quotient;var digit=divmod.remainder;if(digit.isNegative()){digit=base.minus(digit).abs();left=left.next()}out.push(stringify(digit))}out.push(stringify(left));return minusSign+out.reverse().join("")}BigInteger.prototype.toString=function(radix){if(radix===undefined)radix=10;if(radix!==10)return toBase(this,radix);var v=this.value,l=v.length,str=String(v[--l]),zeros="0000000",digit;while(--l>=0){digit=String(v[l]);str+=zeros.slice(digit.length)+digit}var sign=this.sign?"-":"";return sign+str};SmallInteger.prototype.toString=function(radix){if(radix===undefined)radix=10;if(radix!=10)return toBase(this,radix);return String(this.value)};BigInteger.prototype.toJSON=SmallInteger.prototype.toJSON=function(){return this.toString()};BigInteger.prototype.valueOf=function(){return+this.toString()};BigInteger.prototype.toJSNumber=BigInteger.prototype.valueOf;SmallInteger.prototype.valueOf=function(){return this.value};SmallInteger.prototype.toJSNumber=SmallInteger.prototype.valueOf;function parseStringValue(v){if(isPrecise(+v)){var x=+v;if(x===truncate(x))return new SmallInteger(x);throw"Invalid integer: "+v}var sign=v[0]==="-";if(sign)v=v.slice(1);var split=v.split(/e/i);if(split.length>2)throw new Error("Invalid integer: "+split.join("e"));if(split.length===2){var exp=split[1];if(exp[0]==="+")exp=exp.slice(1);exp=+exp;if(exp!==truncate(exp)||!isPrecise(exp))throw new Error("Invalid integer: "+exp+" is not a valid exponent.");var text=split[0];var decimalPlace=text.indexOf(".");if(decimalPlace>=0){exp-=text.length-decimalPlace-1;text=text.slice(0,decimalPlace)+text.slice(decimalPlace+1)}if(exp<0)throw new Error("Cannot include negative exponent part for integers");text+=new Array(exp+1).join("0");v=text}var isValid=/^([0-9][0-9]*)$/.test(v);if(!isValid)throw new Error("Invalid integer: "+v);var r=[],max=v.length,l=LOG_BASE,min=max-l;while(max>0){r.push(+v.slice(min,max));min-=l;if(min<0)min=0;max-=l}trim(r);return new BigInteger(r,sign)}function parseNumberValue(v){if(isPrecise(v)){if(v!==truncate(v))throw new Error(v+" is not an integer.");return new SmallInteger(v)}return parseStringValue(v.toString())}function parseValue(v){if(typeof v==="number"){return parseNumberValue(v)}if(typeof v==="string"){return parseStringValue(v)}return v}for(var i=0;i<1e3;i++){Integer[i]=new SmallInteger(i);if(i>0)Integer[-i]=new SmallInteger(-i)}Integer.one=Integer[1];Integer.zero=Integer[0];Integer.minusOne=Integer[-1];Integer.max=max;Integer.min=min;Integer.gcd=gcd;Integer.lcm=lcm;Integer.isInstance=function(x){return x instanceof BigInteger||x instanceof SmallInteger};Integer.randBetween=randBetween;Integer.fromArray=function(digits,base,isNegative){return parseBaseFromArray(digits.map(parseValue),parseValue(base||10),isNegative)};return Integer}();if(typeof module!=="undefined"&&module.hasOwnProperty("exports")){module.exports=bigInt}if(typeof define==="function"&&define.amd){define("big-integer",[],function(){return bigInt})};
        return bigInt;
    })()
});

if((typeof module) !== 'undefined') {
    module.exports = nerdamer;
};
