/*
 * Author : Martin Donk
 * Website : http://www.nerdamer.com
 * Email : martin.r.donk@gmail.com
 * Source : https://github.com/jiggzson/nerdamer
 */

var nerdamer = (function(imports) { 
    "use strict";

    var version = '0.7.11',

        _ = new Parser(), //nerdamer's parser
        //import bigInt
        bigInt = imports.bigInt,
    
        Groups = {},
        
        //container of pregenerated primes
        PRIMES = [],
        
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
            //Allow changing of power operator
            POWER_OPERATOR: '^'
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
        RESERVED = ['__u__'],


        WARNINGS = '',
        
        /**
         * Checks to see if value is one of nerdamer's reserved names
         * @param {String} value
         * @return boolean
         */
        isReserved = Utils.isReserved = function(value) { 
            return RESERVED.indexOf(value) !== -1;
        },

        /**
         * Use this when errors are suppressible
         * @param {String} msg
         */
        err = function(msg) {
            if(!Settings.suppress_errors) throw new Error(msg);
        },
        
        /**
         * Used to pass warnings or low severity errors about the library
         * @param msg
         */
        warn = function(msg) {
            WARNINGS += (msg+'\n');
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
            var regex = /^[a-z_][a-z\d\_]*$/gi;
            if(!(regex.test( name)) ) {
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
         * @param {Symbol} symbol
         */
        isNumericSymbol = Utils.isNumericSymbol = function(symbol) {
            return symbol.group === N;
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
        firstObject = Utils.firstObject = function(obj) {
            for( var x in obj ) break;
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
        /**
         * Rounds a number up to x decimal places
         * @param {Number} x
         * @param {Number} s
         */
        round = Utils.round = function( x, s ) { 
            s = s || 14;
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
         * Converts function arguments to an array. I had hopes for this function :(
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
                n = Frac.simple(n);
                var r = n.clone();
                for(var i=0; i<p-1; i++) {
                    r = r.multiply(n);
                }
                return r;
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

                if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
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
            //uses trial division to get factors
            ifactor: function(n, factors) { 
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
                var a = 0, b = 1, f = 1;
                for(var i = 2; i <= n; i++) {
                    f = a + b;
                    a = b;
                    b = f;
                }
                return f;
            },
            mod: function(x, y) {
                return x % y;
            },
            /**
             * 
             * @param {Function} f - the function being integrated
             * @param {Number} l - lower bound
             * @param {Number} u - upper bound
             * @param {Number} dx - step width
             * @returns {Number}
             */
            num_integrate: function(f, l, u, dx) {
                dx = dx || 0.001; //default width of dx
                var n, sum, x0, x1, a, la, chg;
                n = (u-l)/dx;// number of trapezoids
                sum = 0; //area
                chg = 0; //track the change
                a = 0;
                for (var i=1; i<=n; i++) {
                    //the x locations of the left and right side of each trapezpoid
                    x0 = l + (i-1)*dx;
                    x1 = l + i*dx;
                    a = dx * (f(x0) + f(x1))/ 2; //the area
                    sum += a;
                } 
                //avoid errors with numbers around -1e-14;
                sum = round(sum, 13);
                return sum;
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
            }
        };

        //link the Math2 object to Settings.FUNCTION_MODULES
        Settings.FUNCTION_MODULES.push(Math2);
        
        //Make Math2 visible to the parser
        Settings.FUNCTION_MODULES.push(Math2);

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
            asDecimal = option === 'decimals' || option === 'decimal',
            opt = asHash ? undefined : option;
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
                var om = asDecimal ? obj.multiplier.valueOf() : obj.multiplier.toString();
                if(om == '-1') {
                    sign = '-';
                    om = '1';
                }
                //only add the multiplier if it's not 1
                if(om != '1') multiplier = om;
                //use asDecimal to get the object back as a decimal
                var p = obj.power ? (asDecimal ? obj.power.valueOf() : obj.power.toString()) : '';
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
                    value = obj.multiplier == '-1' ? '1' : asDecimal ? obj.valueOf() : obj.multiplier.toString();
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
            
            if(group === FN && asDecimal) { 
                value = obj.fname+inBrackets(obj.args.map(function(symbol) {
                    return text(symbol, opt);
                }).join(','));
            }

            //wrap the power since / is less than ^
            //TODO: introduce method call isSimple
            if(power && !isInt(power) && group !== EX && !asDecimal) { power = inBrackets(power); }

            //the following groups are held together by plus or minus. They can be raised to a power or multiplied
            //by a multiplier and have to be in brackets to preserve the order of precedence
            if(((group === CP || group === PL) && (multiplier && multiplier != '1' || sign === '-')) 
                    || ((group === CB || group === CP || group === PL) && (power && power != '1'))
                    || !asHash && group === P && value == -1
                    || obj.fname === PARENTHESIS) { 
                
                value = inBrackets(value);
            }
            
            var c = sign+multiplier;
            if(multiplier && !isInt(multiplier) && !asDecimal) c = inBrackets(c);
            
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
            for(var i=0; i<l; i++) c.push(obj.elements[i].text());
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
            if(this.symbol.latex_)
                return this.symbol.latex_(option);
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
         * @param {Array}
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
        toDecimal: function() {
            return this.symbol.toDecimal();
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
            value = _.parse(value);
            if(this.symbol.isConstant() && value.isConstant())
                return this.symbol.equals(_.parse(value));
            return false;
        },
        lt: function(value) {
            value = _.parse(value);
            if(this.symbol.isConstant() && value.isConstant())
                return this.symbol.lessThan(_.parse(value));
            return false;
        },
        gt: function(value) {
            value = _.parse(value);
            if(this.symbol.isConstant() && value.isConstant())
                return this.symbol.greaterThan(_.parse(value));
            return false;
        },
        gte: function(value) {
            return this.greaterThan(value) || this.equals(value);
        },
        lte: function(value) {
            return this.lessThan(value) || this.equals(value);
        }
    };
    //Aliases
    Expression.prototype.toTeX = Expression.prototype.latex;
    
    function Frac(n) { 
        if(n instanceof Frac) return n;
        if(n === undefined) return this;
        if(isInt(n)) { 
            this.num = bigInt(n);
            this.den = bigInt(1);
        }
        else {
            var frac = Fraction.convert(n);
            this.num = new bigInt(frac[0]);
            this.den = new bigInt(frac[1]);
        }
    }
    
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
        var nstr = String(n),
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
            if(m.equals(0)) throw new Error('Division by zero not allowed!');
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
        toDecimal: function() {
            //toDecimal is primarily used for storing polynomials. If you need a bigNumber library for that
            //you probably have bigger concerns
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
        //this enables the class to be instantiated without the new operator
        if(!(this instanceof Symbol)) { return new Symbol(obj); };
        //define numeric symbols
        if(!isNaN(obj) && obj !== 'Infinity') { 
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
        }
        
        //As of 6.0.0 we switched to infinite precision so all objects have a power
        //Although this is still redundant in constants, it simplifies the logic in
        //other parts so we'll keep it
        this.power = new Frac(1);

        // Added to silence the strict warning.
        return this; 
    }
    
    Symbol.imaginary = function() {
        var s = new Symbol(Settings.IMAGINARY);
        s.isImaginary = true;
        return s;
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
    Symbol.prototype = {
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
            if(!isInt(p) || p < 0) return false;
            //constants and first orders
            if(g === N  || g === S) return true;
            //PL groups. These only fail if a power is not an int
            if(this.isComposite() || g === CB && multivariate) {
                //fail if we're not checking for multivariate polynomials
                if(!multivariate && variables(this) > 1) return false;
                //loop though the symbols and check if they qualify
                for(var x in this.symbols) {
                    //we've already the symbols if we're not checking for multivariates at this point
                    //so we check the sub-symbols
                    if(!this.symbols[x].isPoly(multivariate)) return false;
                }
            }
            else return false;
            
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
                retval = new Symbol(0);
                this.each(function(x) { 
                    retval = _.add(retval, x.sub(a, b));
                });
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
        isConstant: function() {
            return this.value === CONST_HASH;
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
                    if(this.symbols[x].hasIntegral(names))
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
         * @returns {Symbol}
         */
        clone: function(c) { 
            var clone = c || new Symbol(0),
                //list of properties excluding power as this may be a symbol and would also need to be a clone.
                properties = [
                    'value', 'group', 'length', 'previousGroup', 'imaginary', 'fname', 'args'],
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
            if(this.group === CP || this.group === PL) this.distributeMultiplier();
            return this;
        },
        /**
         * Inverts a symbol
         * @returns {boolean}
         */
        invert: function(power_only) { 
            //invert the multiplier
            if(!power_only) this.multiplier = this.multiplier.invert();
            //invert the rest
            if(isSymbol(this.power)) {
                this.power.negate();
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
            if(this.power !== 1) {
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
            if(this.power.lessThan(0)) return this.clone();
            if(this.group === CB) 
                var retval = new Symbol(1);
                for(var x in this.symbols) 
                    if(this.symbols[x].power < 0) 
                        retval = _.multiply(retval, this.symbols[x].clone());
                return retval;
            return new Symbol(this.multiplier.den);
        },
        getNum: function() {
            if(this.power.lessThan(0)) return new Symbol(this.multiplier.num);
            if(this.group === CB) {
                var newSymbol = new Symbol(1);
                for(var x in this.symbols) 
                    if(this.symbols[x].power > 0)
                        newSymbol = _.multiply(newSymbol, this.symbols[x].clone());
                return newSymbol;
            }
            return this.clone();
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
    DivisionByZero.prototype = new Error();
    //thrown in parser 
    function ParseError(msg){
        this.message = msg || "";
    }
    ParseError.prototype = new Error();
    
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
        //list all the supported operators
        var operators = this.operators = {
                '^' : new Operator('^', 'pow', 6, false, false),
                '**' : new Operator('**', 'pow', 6, false, false),
                '!!' : new Operator('!!', 'dfactorial', 5, false, false, true, function(e) {
                    return _.symfunction(DOUBLEFACTORIAL, [e]); //wrap it in a factorial function
                }),
                '!' : new Operator('!', 'factorial', 5, false, false, true, function(e) {
                    return _.symfunction(FACTORIAL, [e]); //wrap it in a factorial function
                }),
                //begin crazy fix ... :( TODO!!! revisit
                '!+' : new Operator('!+', 'factadd', 3, true, true, false),
                '!!+' : new Operator('!!+', 'dfactadd', 3, true, true, false),
                '!-' : new Operator('!-', 'factsub', 3, true, true, false),
                '!!-' : new Operator('!!-', 'dfactsub', 3, true, true, false),
                //done with crazy fix
                '*' : new Operator('*', 'multiply', 4, true, false),
                '/' : new Operator('/', 'divide', 4, true, false),
                '+' : new Operator('+', 'add', 3, true, true, false, function(e) {
                    return e;
                }),
                '-' : new Operator('-', 'subtract', 3, true, true, false, function(e) {
                    return e.negate();
                }),
                '=' : new Operator('=', 'equals', 2, false, false),
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
                'cos'               : [ cos, 1],
                'sin'               : [ sin, 1],
                'tan'               : [ tan, 1],
                'sec'               : [ sec, 1],
                'csc'               : [ csc, 1],
                'cot'               : [ cot, 1],
                'acos'              : [ , 1],
                'asin'              : [ , 1],
                'atan'              : [ , 1],
                'sinh'              : [ , 1],
                'cosh'              : [ , 1],
                'tanh'              : [ , 1],
                'asinh'             : [ , 1],
                'acosh'             : [ , 1],
                'atanh'             : [ , 1],
                'log10'             : [ , 1],
                'exp'               : [ , 1],
                'min'               : [ ,-1],
                'max'               : [ ,-1],
                'erf'               : [ , 1],
                'floor'             : [ , 1],
                'ceil'              : [ , 1],
                'Si'                : [ , 1],
                'step'              : [ , 1],
                'rect'              : [ , 1],
                'sinc'              : [ , 1],
                'tri'               : [ , 1],
                'sign'              : [ , 1],
                'Ci'                : [ , 1],
                'Ei'                : [ , 1],
                'Shi'               : [ , 1],
                'Chi'               : [ , 1],
                'fib'               : [ , 1],
                'fact'              : [factorial, 1],
                'factorial'         : [factorial, 1],
                'dfactorial'        : [ , 1],
                'gamma_incomplete'  : [ , [1, 2]],
                'round'             : [ , 1],
                'mod'               : [ mod, 2],
                'pfactor'           : [ pfactor , 1],
                'vector'            : [ vector, -1],
                'matrix'            : [ matrix, -1],
                'parens'            : [ parens, -1],
                'sqrt'              : [ sqrt, 1],
                'nthroot'           : [ nthroot, 2],
                'log'               : [ log , 1],
                'expand'            : [ expand , 1],
                'abs'               : [ abs , 1],
                'invert'            : [ invert, 1],
                'transpose'         : [ transpose, 1],
                'dot'               : [ dot, 2],
                'cross'             : [ cross, 2],
                'vecget'            : [ vecget, 2],
                'vecset'            : [ vecset, 3],
                'matget'            : [ matget, 3],
                'matset'            : [ matset, 4],
                'imatrix'           : [ imatrix, 1], 
                'IF'                : [ IF, 3]
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
        this.callfunction = function(fn_name, args) { 
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
        this.parseTree = function(rpn) { 
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
                        //constants take higher priority
                        if(e in constants)
                            e = new Symbol(constants[e]);
                        //next subs
                        else if(e in subs)
                            e = subs[e].clone();
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
                e = e.replace(match[0], match[1]+'*'+match[2]);
            }

            e = e.split(' ').join('')//strip empty spaces
            //replace scientific numbers
            .replace(/\d+\.*\d*e\+?\-?\d+/gi, function(x) {
                return scientificToDecimal(x);
            })
            //allow omission of multiplication after coefficients
            .replace(/([\+\-\/\*]*[0-9]+)([a-z_]+[\+\-\/\*]*)/gi, function() {
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
            .replace(/([a-z0-9_]+)(\()|(\))([a-z0-9]+)/gi, function(match, a, b, c, d) {
                var g1 = a || c,
                    g2 = b || d;
                if(g1 in functions) //create a passthrough for functions
                    return g1+g2;
                return g1+'*'+g2;
            })
            //allow omission of multiplication sign between brackets
            .replace( /\)\(/g, ')*(' ) || '0';

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
                                err("Unmatched open bracket for bracket '"+bracket+"'!");
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
                    err('Unmatched close bracket for bracket '+brkt+'!');
                }
                   
            if(tree)
                return output;
            
            return this.parseTree(output);

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
        }
        
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
                            f = '\\mathrm'+LaTeX.braces(fname) + LaTeX.brackets(this.toTeX(e.args), 'parens');
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
            if(isNumericSymbol(symbol) || even(symbol.power)) {
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
         * @return {Symbol)
         */
        function factorial(symbol) {
            var retval;
            if(Settings.PARSE2NUMBER && symbol.isConstant()) {
                if(isInt(symbol)) 
                    retval = Math2.bigfactorial(symbol);
                else
                    retval = Math2.gamma(symbol.multiplier.toDecimal()+1);
                
                return bigConvert(retval);
            }
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
            
            if(Settings.PARSE2NUMBER && symbol.isConstant() && !symbol.multiplier.lessThan(0)) 
                return new Symbol(Math.sqrt(symbol.multiplier.toDecimal()));
            
            var img, retval, 
                isConstant = symbol.isConstant();
        
            if(symbol.group === CB && symbol.isLinear()) {
                var m = sqrt(Symbol(symbol.multiplier));
                for(var s in symbol.symbols) {
                    var x = symbol.symbols[s];
                    m = _.multiply(m, sqrt(x));
                }

                retval = m;
            }
            //if the symbol is already sqrt then it's that symbol^(1/4) and we can unwrap it
            else if(symbol.fname === SQRT) { 
                var s = symbol.args[0];
                s.setPower(symbol.power.multiply(new Frac(0.25)));
                retval = s;
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

        function nthroot(symbol, n) { 
            if(isVector(n)) {
                var v = new Vector();
                n.each(function(e) {
                    v.elements.push(nthroot(symbol.clone(), e));
                });
                return  v;
            }
            return block('PARSE2NUMBER', function() {
                return _.pow(symbol, n.invert());
            }, true);
        }
        
        function pfactor(symbol) {
            var retval = new Symbol(1);
            if(symbol.isConstant()) {
                var m = symbol.multiplier.toDecimal();
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
            return retval;
        }
        
        function log(symbol) { 
            var retval;
            if(symbol.equals(0)) {
                err('log(0) is undefined!');
            }

            if(symbol.group === EX && symbol.power.multiplier.lessThan(0) || symbol.power.toString() === '-1') {
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
                retval = _.symfunction('log', [symbol]); 
                
                if(s) retval = _.multiply(s, retval);

            }
            return retval;
        }
        
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
            if(typeof n === 'number')
                n = Frac.simple(n);
            var symbol = new Symbol(0);
            symbol.multiplier = n;
            return symbol;
        };
        
        function cos(symbol) {
            if(Settings.PARSE2NUMBER && symbol.isConstant()) {
                return new Symbol(Math.cos(symbol.valueOf()));
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
        }
        
        function sin(symbol) {
            if(Settings.PARSE2NUMBER && symbol.isConstant()) {
                return new Symbol(Math.sin(symbol.valueOf()));
            }
            var retval, 
                c = false,
                q = getQuadrant(symbol.multiplier.toDecimal()),
                sign = symbol.multiplier.sign(),
                m = symbol.multiplier.abs();
            symbol.multiplier = m;
            
            if(symbol.isPi() && symbol.isLinear()) { 
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
        }
        
        function tan(symbol) {
            if(Settings.PARSE2NUMBER && symbol.isConstant()) {
                return new Symbol(Math.tan(symbol.valueOf()));
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
                    if(d == 2) err('tan is undefined for '+symbol.toString());
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
        }
        
        function sec(symbol) {
            //let's be lazy
            if(Settings.PARSE2NUMBER && symbol.isConstant()) {
                return new Symbol(Math2.sec(symbol.valueOf()));
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
                    if(d == 2) err('sec is undefined for '+symbol.toString());
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
        }
        
        function csc(symbol) {
            if(Settings.PARSE2NUMBER && symbol.isConstant()) {
                return new Symbol(Math2.csc(symbol.valueOf()));
            }
            var retval, 
                c = false,
                q = getQuadrant(symbol.multiplier.toDecimal()),
                m = symbol.multiplier.abs();

            symbol.multiplier = m;
            
            if(symbol.isPi() && symbol.isLinear()) { 
                //return for 0 for multiples of pi
                if(isInt(m)) {
                    err('csc is undefined for '+symbol.toString());
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
        }
        
        function cot(symbol) {
            if(Settings.PARSE2NUMBER && symbol.isConstant()) {
                return new Symbol(Math2.cot(symbol.valueOf()));
            }
            var retval, 
                c = false,
                q = getQuadrant(symbol.multiplier.toDecimal()),
                m = symbol.multiplier;

            symbol.multiplier = m;
            
            if(symbol.isPi() && symbol.isLinear()) { 
                //return 0 for all multiples of pi
                if(isInt(m)) {
                    err('cot is undefined for '+symbol.toString());
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
            if(!symbol.symbols) return symbol; //nothing to do
            var original = symbol.clone(); 
            try {
                var p = symbol.power,
                    m = symbol.multiplier,
                    pn = Number(p);

                if(!symbol.symbols) return symbol;

                //expand all the symbols
                for(var s in symbol.symbols) {
                    var x = symbol.symbols[s];
                    symbol.symbols[s] = expand(x);
                }
                symbol = _.parse(symbol);

                if(isInt(p) && pn > 0 && symbol.isComposite()) { 
                    //leave original untouched
                    symbol = symbol.toLinear().toUnitMultiplier();
                    var result = symbol.clone();

                    for(var i=0; i<pn-1; i++) {
                        var t = new Symbol(0); 
                        for(var s in symbol.symbols) {
                            var x = symbol.symbols[s];
                            for(var s2 in result.symbols) {
                                var y = result.symbols[s2];
                                var r = _.expand(_.multiply(x.clone(), y.clone())),
                                    rp = Number(r.power);
                                if(r.group === CB && rp !== 1 || r.group === PL && rp !== 1) r = expand(r);
                                t = _.add(t, r);
                            }
                        }
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
                    var hascomposites = false, sp = symbol.power;
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

                    if(!hascomposites) return symbol; //nothing to do here

                    var result = new Symbol(0);
                    var composites = [],
                        non_composites = new Symbol(symbol.multiplier);

                    //sort them out
                    for(var s in symbol.symbols) {
                        var x = symbol.symbols[s];
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

                    symbol = finalResult;
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
            for(var i=0; i<params.length; i++) subs[params[i]] = arguments[i];
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
                if(a.isComposite() && a.isLinear() && b.isComposite() && b.isLinear()) {
                    a.distributeMultiplier();
                    b.distributeMultiplier();
                }
                //no need to waste time on zeroes
                if(a.multiplier.equals(0)) return b;
                if(b.multiplier.equals(0)) return a;

                if(a.isConstant() && b.isConstant() && Settings.PARSE2NUMBER) {
                    return new Symbol(a.multiplier.add(b.multiplier).valueOf());
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
                        if(a.multiplier.isOne() && b.multiplier.isOne() && g1 === CP) {
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
                    result = Symbol.shell(CP).attach([a, b]);
                    result.updateHash();
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
                //the quickies
                if(a.isConstant() && b.isConstant() && Settings.PARSE2NUMBER) {
                    return new Symbol(a.multiplier.multiply(b.multiplier).valueOf());
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
         * @param {Symbol} symbol1
         * @param {Symbol} symbol2
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
                var aIsZero = a.equals(0);
                if(aIsZero && b.equals(0)) err('0^0 is undefined!');
                //return 0 right away if possible
                if(aIsZero && b.isConstant() && b.multiplier.greaterThan(0))
                    return new Symbol(0);
                
                var bIsConstant = b.isConstant(),
                    aIsConstant = a.isConstant(), 
                    bIsInt = b.isInteger(),
                    m = a.multiplier,
                    result = a.clone();
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
                    //put the back sign
                    if(c)
                        result = _.multiply(result, c);
                }
                else if(bIsInt && !m.equals(1)) { 
                    var p = b.multiplier.toDecimal(),
                        multiplier = new Frac(Math.pow(m.num, p) / Math.pow(m.den, p)); 
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
                    else { 
                        //b is a symbol
                        var neg_num = a.group === N && sign < 0,
                            num = testSQRT(new Symbol(neg_num ? m.num : Math.abs(m.num)).setPower(b.clone())),
                            den = testSQRT(new Symbol(m.den).setPower(b.clone()).invert());  
                    
                        //eliminate imaginary if possible
                        if(a.imaginary) { 
                            //assume i = sqrt(-1) -> (-1)^(1/2)
                            var nr = b.multiplier.multiply(Frac.quick(1, 2)),
                                //the denominator denotes the power so raise to it. It will turn positive it round
                                tn = Math.pow(-1, nr.num);
                            result = even(nr.den) ? new Symbol(-1).setPower(nr, true) : new Symbol(tn);
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
                else if(result.isE() && result.group === EX && result.power.contains('pi') 
                        && result.power.contains(Settings.IMAGINARY)) {
                    //we have a match
                    var m1 = result.multiplier,
                        m2 = result.power.multiplier; 
                    result = new Symbol(even(m2) ? m1 : m1.negate());
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
        //check for equality
        this.eq = function(a, b) {
            return a.equals(b);
        };
        //checks for greater than
        this.gt = function(a, b) {
            return a.gt(b);
        };
        //checks for greater than equal
        this.gte = function(a, b) {
            return a.gte(b);
        };
        //checks for less than
        this.lt = function(a, b) {
            return a.lt(b);
        };
        //checks for less than equal
        this.lte = function(a, b) {
            return a.lte(b);
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
         * @returns {Array} - an array containing the denominator and the numerator
         */
        convert: function( value, opts ) { 
            var frac;
            if( value === 0 ) {
                frac = [ 0, 1];
            }
            else {
                if( value < 1e-6 || value > 1e20) {
                    var qc = this.quickConversion( Number( value ) );
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
        quickConversion: function( dec ) {
            var x = (dec.toExponential()+'').split('e');
            var d = x[0].split('.')[1];// get the number of places after the decimal
            var l = d ? d.length : 0; // maybe the coefficient is an integer;
            return [Math.pow(10,l)*x[0], Math.pow(10, Math.abs(x[1])+l)];
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
            if(isArray(symbol)) {
                var LaTeXArray = [];
                for(var i=0; i<symbol.length; i++) {
                    LaTeXArray.push(this.latex(symbol[i]));
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
                    TeX += rowTeX.join(' & ')+'\\\\\n';
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
            if(group === S || group === P || previousGroup === S || previousGroup === P || previousGroup === N) { 
                var value = symbol.value;
                var greek = this.greek[value];
                if(greek) value = greek;
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
                else if(fname === 'integrate') {
                    v[index] = '\\int'+this.braces(input[0])+this.braces('d'+input[1]);
                }
                else if(fname === FACTORIAL || fname === DOUBLEFACTORIAL) {
                    var arg = symbol.args[0];
                    if(arg.power.equals(1) && (arg.isComposite() || arg.isCombination())) {
                        input[0] = this.brackets(input[0]);
                    }
                    v[index] = input[0]+(fname === FACTORIAL ? '!' : '!!');
                }
                else { 
                    var name = fname!=='' ? '\\mathrm'+this.braces(fname) : '';
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
            else if(group === CB || previousGroup === EX) { 
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
            for(var el in this.elements) {
                tex.push(LaTeX.latex.call(LaTeX, this.elements[el], option));
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
        generatePrimes(Settings.init_primes);//generate the firs 100 primes
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
    var C = {};
    C.exceptions = {};
    C.Operator = Operator;
    C.groups = Groups;
    C.Symbol = Symbol;
    C.Expression = Expression;
    C.Frac = Frac;
    C.Vector = Vector;
    C.Matrix = Matrix;
    C.Parser = Parser;
    C.Fraction = Fraction;
    C.Math2 = Math2;
    C.LaTeX = LaTeX;
    C.Utils = Utils;
    C.PRIMES = PRIMES;
    C.PARSER = _;
    C.PARENTHESIS = PARENTHESIS;
    C.Settings = Settings;
    C.VARS = VARS;
    C.err = err;
    C.bigInt = bigInt;
    //load the exceptions
    C.exceptions.DivisionByZero = DivisionByZero;
    C.exceptions.ParseError = ParseError;
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
     * @returns {String}
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
            if(value === 'delete') {
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
        if(val === 'delete') delete VARS[v];
        else {
            VARS[v] = isSymbol(val) ? val : _.parse(val);
        }
        return this;
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
     * @param {String} Output format. Can be 'object' (just returns the VARS object), 'text' or 'latex'. Default: 'text'
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
     * 
     * @param {String} setting The setting to be changed
     * @param {boolean} value 
     */
    libExports.set = function(setting, value) {
        //current options:
        //PARSE2NUMBER, suppress_errors
        var disallowed = ['SAFE'];
        if(disallowed.indexOf(setting) !== -1) err('Cannot modify setting: '+setting);
        Settings[setting] = value;
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
    
    libExports.convert = function(e) {
        var raw = _.parse(e, null, true);
        return raw;
    };
        
    libExports.api();

    return libExports; //Done
})({
    //https://github.com/peterolson/BigInteger.js
    bigInt: (function (undefined) {
        "use strict";

        var BASE = 1e7,
            LOG_BASE = 7,
            MAX_INT = 9007199254740992,
            MAX_INT_ARR = smallToArray(MAX_INT),
            LOG_MAX_INT = Math.log(MAX_INT);

        function BigInteger(value, sign) {
            this.value = value;
            this.sign = sign;
            this.isSmall = false;
        }

        function SmallInteger(value) {
            this.value = value;
            this.sign = value < 0;
            this.isSmall = true;
        }

        function isPrecise(n) {
            return -MAX_INT < n && n < MAX_INT;
        }

        function smallToArray(n) { // For performance reasons doesn't reference BASE, need to change this function if BASE changes
            if (n < 1e7)
                return [n];
            if (n < 1e14)
                return [n % 1e7, Math.floor(n / 1e7)];
            return [n % 1e7, Math.floor(n / 1e7) % 1e7, Math.floor(n / 1e14)];
        }

        function arrayToSmall(arr) { // If BASE changes this function may need to change
            trim(arr);
            var length = arr.length;
            if (length < 4 && compareAbs(arr, MAX_INT_ARR) < 0) {
                switch (length) {
                    case 0: return 0;
                    case 1: return arr[0];
                    case 2: return arr[0] + arr[1] * BASE;
                    default: return arr[0] + (arr[1] + arr[2] * BASE) * BASE;
                }
            }
            return arr;
        }

        function trim(v) {
            var i = v.length;
            while (v[--i] === 0);
            v.length = i + 1;
        }

        function createArray(length) { // function shamelessly stolen from Yaffle's library https://github.com/Yaffle/BigInteger
            var x = new Array(length);
            var i = -1;
            while (++i < length) {
                x[i] = 0;
            }
            return x;
        }

        function truncate(n) {
            if (n > 0) return Math.floor(n);
            return Math.ceil(n);
        }

        function add(a, b) { // assumes a and b are arrays with a.length >= b.length
            var l_a = a.length,
                l_b = b.length,
                r = new Array(l_a),
                carry = 0,
                base = BASE,
                sum, i;
            for (i = 0; i < l_b; i++) {
                sum = a[i] + b[i] + carry;
                carry = sum >= base ? 1 : 0;
                r[i] = sum - carry * base;
            }
            while (i < l_a) {
                sum = a[i] + carry;
                carry = sum === base ? 1 : 0;
                r[i++] = sum - carry * base;
            }
            if (carry > 0) r.push(carry);
            return r;
        }

        function addAny(a, b) {
            if (a.length >= b.length) return add(a, b);
            return add(b, a);
        }

        function addSmall(a, carry) { // assumes a is array, carry is number with 0 <= carry < MAX_INT
            var l = a.length,
                r = new Array(l),
                base = BASE,
                sum, i;
            for (i = 0; i < l; i++) {
                sum = a[i] - base + carry;
                carry = Math.floor(sum / base);
                r[i] = sum - carry * base;
                carry += 1;
            }
            while (carry > 0) {
                r[i++] = carry % base;
                carry = Math.floor(carry / base);
            }
            return r;
        }

        BigInteger.prototype.add = function (v) {
            var value, n = parseValue(v);
            if (this.sign !== n.sign) {
                return this.subtract(n.negate());
            }
            var a = this.value, b = n.value;
            if (n.isSmall) {
                return new BigInteger(addSmall(a, Math.abs(b)), this.sign);
            }
            return new BigInteger(addAny(a, b), this.sign);
        };
        BigInteger.prototype.plus = BigInteger.prototype.add;

        SmallInteger.prototype.add = function (v) {
            var n = parseValue(v);
            var a = this.value;
            if (a < 0 !== n.sign) {
                return this.subtract(n.negate());
            }
            var b = n.value;
            if (n.isSmall) {
                if (isPrecise(a + b)) return new SmallInteger(a + b);
                b = smallToArray(Math.abs(b));
            }
            return new BigInteger(addSmall(b, Math.abs(a)), a < 0);
        };
        SmallInteger.prototype.plus = SmallInteger.prototype.add;

        function subtract(a, b) { // assumes a and b are arrays with a >= b
            var a_l = a.length,
                b_l = b.length,
                r = new Array(a_l),
                borrow = 0,
                base = BASE,
                i, difference;
            for (i = 0; i < b_l; i++) {
                difference = a[i] - borrow - b[i];
                if (difference < 0) {
                    difference += base;
                    borrow = 1;
                } else borrow = 0;
                r[i] = difference;
            }
            for (i = b_l; i < a_l; i++) {
                difference = a[i] - borrow;
                if (difference < 0) difference += base;
                else {
                    r[i++] = difference;
                    break;
                }
                r[i] = difference;
            }
            for (; i < a_l; i++) {
                r[i] = a[i];
            }
            trim(r);
            return r;
        }

        function subtractAny(a, b, sign) {
            var value, isSmall;
            if (compareAbs(a, b) >= 0) {
                value = subtract(a,b);
            } else {
                value = subtract(b, a);
                sign = !sign;
            }
            value = arrayToSmall(value);
            if (typeof value === "number") {
                if (sign) value = -value;
                return new SmallInteger(value);
            }
            return new BigInteger(value, sign);
        }

        function subtractSmall(a, b, sign) { // assumes a is array, b is number with 0 <= b < MAX_INT
            var l = a.length,
                r = new Array(l),
                carry = -b,
                base = BASE,
                i, difference;
            for (i = 0; i < l; i++) {
                difference = a[i] + carry;
                carry = Math.floor(difference / base);
                difference %= base;
                r[i] = difference < 0 ? difference + base : difference;
            }
            r = arrayToSmall(r);
            if (typeof r === "number") {
                if (sign) r = -r;
                return new SmallInteger(r);
            } return new BigInteger(r, sign);
        }

        BigInteger.prototype.subtract = function (v) {
            var n = parseValue(v);
            if (this.sign !== n.sign) {
                return this.add(n.negate());
            }
            var a = this.value, b = n.value;
            if (n.isSmall)
                return subtractSmall(a, Math.abs(b), this.sign);
            return subtractAny(a, b, this.sign);
        };
        BigInteger.prototype.minus = BigInteger.prototype.subtract;

        SmallInteger.prototype.subtract = function (v) {
            var n = parseValue(v);
            var a = this.value;
            if (a < 0 !== n.sign) {
                return this.add(n.negate());
            }
            var b = n.value;
            if (n.isSmall) {
                return new SmallInteger(a - b);
            }
            return subtractSmall(b, Math.abs(a), a >= 0);
        };
        SmallInteger.prototype.minus = SmallInteger.prototype.subtract;

        BigInteger.prototype.negate = function () {
            return new BigInteger(this.value, !this.sign);
        };
        SmallInteger.prototype.negate = function () {
            var sign = this.sign;
            var small = new SmallInteger(-this.value);
            small.sign = !sign;
            return small;
        };

        BigInteger.prototype.abs = function () {
            return new BigInteger(this.value, false);
        };
        SmallInteger.prototype.abs = function () {
            return new SmallInteger(Math.abs(this.value));
        };

        function multiplyLong(a, b) {
            var a_l = a.length,
                b_l = b.length,
                l = a_l + b_l,
                r = createArray(l),
                base = BASE,
                product, carry, i, a_i, b_j;
            for (i = 0; i < a_l; ++i) {
                a_i = a[i];
                for (var j = 0; j < b_l; ++j) {
                    b_j = b[j];
                    product = a_i * b_j + r[i + j];
                    carry = Math.floor(product / base);
                    r[i + j] = product - carry * base;
                    r[i + j + 1] += carry;
                }
            }
            trim(r);
            return r;
        }

        function multiplySmall(a, b) { // assumes a is array, b is number with |b| < BASE
            var l = a.length,
                r = new Array(l),
                base = BASE,
                carry = 0,
                product, i;
            for (i = 0; i < l; i++) {
                product = a[i] * b + carry;
                carry = Math.floor(product / base);
                r[i] = product - carry * base;
            }
            while (carry > 0) {
                r[i++] = carry % base;
                carry = Math.floor(carry / base);
            }
            return r;
        }

        function shiftLeft(x, n) {
            var r = [];
            while (n-- > 0) r.push(0);
            return r.concat(x);
        }

        function multiplyKaratsuba(x, y) {
            var n = Math.max(x.length, y.length);

            if (n <= 30) return multiplyLong(x, y);
            n = Math.ceil(n / 2);

            var b = x.slice(n),
                a = x.slice(0, n),
                d = y.slice(n),
                c = y.slice(0, n);

            var ac = multiplyKaratsuba(a, c),
                bd = multiplyKaratsuba(b, d),
                abcd = multiplyKaratsuba(addAny(a, b), addAny(c, d));

            var product = addAny(addAny(ac, shiftLeft(subtract(subtract(abcd, ac), bd), n)), shiftLeft(bd, 2 * n));
            trim(product);
            return product;
        }

        // The following function is derived from a surface fit of a graph plotting the performance difference
        // between long multiplication and karatsuba multiplication versus the lengths of the two arrays.
        function useKaratsuba(l1, l2) {
            return -0.012 * l1 - 0.012 * l2 + 0.000015 * l1 * l2 > 0;
        }

        BigInteger.prototype.multiply = function (v) {
            var value, n = parseValue(v),
                a = this.value, b = n.value,
                sign = this.sign !== n.sign,
                abs;
            if (n.isSmall) {
                if (b === 0) return CACHE[0];
                if (b === 1) return this;
                if (b === -1) return this.negate();
                abs = Math.abs(b);
                if (abs < BASE) {
                    return new BigInteger(multiplySmall(a, abs), sign);
                }
                b = smallToArray(abs);
            }
            if (useKaratsuba(a.length, b.length)) // Karatsuba is only faster for certain array sizes
                return new BigInteger(multiplyKaratsuba(a, b), sign);
            return new BigInteger(multiplyLong(a, b), sign);
        };

        BigInteger.prototype.times = BigInteger.prototype.multiply;

        function multiplySmallAndArray(a, b, sign) { // a >= 0
            if (a < BASE) {
                return new BigInteger(multiplySmall(b, a), sign);
            }
            return new BigInteger(multiplyLong(b, smallToArray(a)), sign);
        }
        SmallInteger.prototype["_multiplyBySmall"] = function (a) {
                if (isPrecise(a.value * this.value)) {
                    return new SmallInteger(a.value * this.value);
                }
                return multiplySmallAndArray(Math.abs(a.value), smallToArray(Math.abs(this.value)), this.sign !== a.sign);
        };
        BigInteger.prototype["_multiplyBySmall"] = function (a) {
                if (a.value === 0) return CACHE[0];
                if (a.value === 1) return this;
                if (a.value === -1) return this.negate();
                return multiplySmallAndArray(Math.abs(a.value), this.value, this.sign !== a.sign);
        };
        SmallInteger.prototype.multiply = function (v) {
            return parseValue(v)["_multiplyBySmall"](this);
        };
        SmallInteger.prototype.times = SmallInteger.prototype.multiply;

        function square(a) {
            var l = a.length,
                r = createArray(l + l),
                base = BASE,
                product, carry, i, a_i, a_j;
            for (i = 0; i < l; i++) {
                a_i = a[i];
                for (var j = 0; j < l; j++) {
                    a_j = a[j];
                    product = a_i * a_j + r[i + j];
                    carry = Math.floor(product / base);
                    r[i + j] = product - carry * base;
                    r[i + j + 1] += carry;
                }
            }
            trim(r);
            return r;
        }

        BigInteger.prototype.square = function () {
            return new BigInteger(square(this.value), false);
        };

        SmallInteger.prototype.square = function () {
            var value = this.value * this.value;
            if (isPrecise(value)) return new SmallInteger(value);
            return new BigInteger(square(smallToArray(Math.abs(this.value))), false);
        };

        function divMod1(a, b) { // Left over from previous version. Performs faster than divMod2 on smaller input sizes.
            var a_l = a.length,
                b_l = b.length,
                base = BASE,
                result = createArray(b.length),
                divisorMostSignificantDigit = b[b_l - 1],
                // normalization
                lambda = Math.ceil(base / (2 * divisorMostSignificantDigit)),
                remainder = multiplySmall(a, lambda),
                divisor = multiplySmall(b, lambda),
                quotientDigit, shift, carry, borrow, i, l, q;
            if (remainder.length <= a_l) remainder.push(0);
            divisor.push(0);
            divisorMostSignificantDigit = divisor[b_l - 1];
            for (shift = a_l - b_l; shift >= 0; shift--) {
                quotientDigit = base - 1;
                if (remainder[shift + b_l] !== divisorMostSignificantDigit) {
                  quotientDigit = Math.floor((remainder[shift + b_l] * base + remainder[shift + b_l - 1]) / divisorMostSignificantDigit);
                }
                // quotientDigit <= base - 1
                carry = 0;
                borrow = 0;
                l = divisor.length;
                for (i = 0; i < l; i++) {
                    carry += quotientDigit * divisor[i];
                    q = Math.floor(carry / base);
                    borrow += remainder[shift + i] - (carry - q * base);
                    carry = q;
                    if (borrow < 0) {
                        remainder[shift + i] = borrow + base;
                        borrow = -1;
                    } else {
                        remainder[shift + i] = borrow;
                        borrow = 0;
                    }
                }
                while (borrow !== 0) {
                    quotientDigit -= 1;
                    carry = 0;
                    for (i = 0; i < l; i++) {
                        carry += remainder[shift + i] - base + divisor[i];
                        if (carry < 0) {
                            remainder[shift + i] = carry + base;
                            carry = 0;
                        } else {
                            remainder[shift + i] = carry;
                            carry = 1;
                        }
                    }
                    borrow += carry;
                }
                result[shift] = quotientDigit;
            }
            // denormalization
            remainder = divModSmall(remainder, lambda)[0];
            return [arrayToSmall(result), arrayToSmall(remainder)];
        }

        function divMod2(a, b) { // Implementation idea shamelessly stolen from Silent Matt's library http://silentmatt.com/biginteger/
            // Performs faster than divMod1 on larger input sizes.
            var a_l = a.length,
                b_l = b.length,
                result = [],
                part = [],
                base = BASE,
                guess, xlen, highx, highy, check;
            while (a_l) {
                part.unshift(a[--a_l]);
                if (compareAbs(part, b) < 0) {
                    result.push(0);
                    continue;
                }
                xlen = part.length;
                highx = part[xlen - 1] * base + part[xlen - 2];
                highy = b[b_l - 1] * base + b[b_l - 2];
                if (xlen > b_l) {
                    highx = (highx + 1) * base;
                }
                guess = Math.ceil(highx / highy);
                do {
                    check = multiplySmall(b, guess);
                    if (compareAbs(check, part) <= 0) break;
                    guess--;
                } while (guess);
                result.push(guess);
                part = subtract(part, check);
            }
            result.reverse();
            return [arrayToSmall(result), arrayToSmall(part)];
        }

        function divModSmall(value, lambda) {
            var length = value.length,
                quotient = createArray(length),
                base = BASE,
                i, q, remainder, divisor;
            remainder = 0;
            for (i = length - 1; i >= 0; --i) {
                divisor = remainder * base + value[i];
                q = truncate(divisor / lambda);
                remainder = divisor - q * lambda;
                quotient[i] = q | 0;
            }
            return [quotient, remainder | 0];
        }

        function divModAny(self, v) {
            var value, n = parseValue(v);
            var a = self.value, b = n.value;
            var quotient;
            if (b === 0) throw new Error("Cannot divide by zero");
            if (self.isSmall) {
                if (n.isSmall) {
                    return [new SmallInteger(truncate(a / b)), new SmallInteger(a % b)];
                }
                return [CACHE[0], self];
            }
            if (n.isSmall) {
                if (b === 1) return [self, CACHE[0]];
                if (b == -1) return [self.negate(), CACHE[0]];
                var abs = Math.abs(b);
                if (abs < BASE) {
                    value = divModSmall(a, abs);
                    quotient = arrayToSmall(value[0]);
                    var remainder = value[1];
                    if (self.sign) remainder = -remainder;
                    if (typeof quotient === "number") {
                        if (self.sign !== n.sign) quotient = -quotient;
                        return [new SmallInteger(quotient), new SmallInteger(remainder)];
                    }
                    return [new BigInteger(quotient, self.sign !== n.sign), new SmallInteger(remainder)];
                }
                b = smallToArray(abs);
            }
            var comparison = compareAbs(a, b);
            if (comparison === -1) return [CACHE[0], self];
            if (comparison === 0) return [CACHE[self.sign === n.sign ? 1 : -1], CACHE[0]];

            // divMod1 is faster on smaller input sizes
            if (a.length + b.length <= 200)
                value = divMod1(a, b);
            else value = divMod2(a, b);

            quotient = value[0];
            var qSign = self.sign !== n.sign,
                mod = value[1],
                mSign = self.sign;
            if (typeof quotient === "number") {
                if (qSign) quotient = -quotient;
                quotient = new SmallInteger(quotient);
            } else quotient = new BigInteger(quotient, qSign);
            if (typeof mod === "number") {
                if (mSign) mod = -mod;
                mod = new SmallInteger(mod);
            } else mod = new BigInteger(mod, mSign);
            return [quotient, mod];
        }

        BigInteger.prototype.divmod = function (v) {
            var result = divModAny(this, v);
            return {
                quotient: result[0],
                remainder: result[1]
            };
        };
        SmallInteger.prototype.divmod = BigInteger.prototype.divmod;

        BigInteger.prototype.divide = function (v) {
            return divModAny(this, v)[0];
        };
        SmallInteger.prototype.over = SmallInteger.prototype.divide = BigInteger.prototype.over = BigInteger.prototype.divide;

        BigInteger.prototype.mod = function (v) {
            return divModAny(this, v)[1];
        };
        SmallInteger.prototype.remainder = SmallInteger.prototype.mod = BigInteger.prototype.remainder = BigInteger.prototype.mod;

        BigInteger.prototype.pow = function (v) {
            var n = parseValue(v),
                a = this.value,
                b = n.value,
                value, x, y;
            if (b === 0) return CACHE[1];
            if (a === 0) return CACHE[0];
            if (a === 1) return CACHE[1];
            if (a === -1) return n.isEven() ? CACHE[1] : CACHE[-1];
            if (n.sign) {
                return CACHE[0];
            }
            if (!n.isSmall) throw new Error("The exponent " + n.toString() + " is too large.");
            if (this.isSmall) {
                if (isPrecise(value = Math.pow(a, b)))
                    return new SmallInteger(truncate(value));
            }
            x = this;
            y = CACHE[1];
            while (true) {
                if (b & 1 === 1) {
                    y = y.times(x);
                    --b;
                }
                if (b === 0) break;
                b /= 2;
                x = x.square();
            }
            return y;
        };
        SmallInteger.prototype.pow = BigInteger.prototype.pow;

        BigInteger.prototype.modPow = function (exp, mod) {
            exp = parseValue(exp);
            mod = parseValue(mod);
            if (mod.isZero()) throw new Error("Cannot take modPow with modulus 0");
            var r = CACHE[1],
                base = this.mod(mod);
            while (exp.isPositive()) {
                if (base.isZero()) return CACHE[0];
                if (exp.isOdd()) r = r.multiply(base).mod(mod);
                exp = exp.divide(2);
                base = base.square().mod(mod);
            }
            return r;
        };
        SmallInteger.prototype.modPow = BigInteger.prototype.modPow;

        function compareAbs(a, b) {
            if (a.length !== b.length) {
                return a.length > b.length ? 1 : -1;
            }
            for (var i = a.length - 1; i >= 0; i--) {
                if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
            }
            return 0;
        }

        BigInteger.prototype.compareAbs = function (v) {
            var n = parseValue(v),
                a = this.value,
                b = n.value;
            if (n.isSmall) return 1;
            return compareAbs(a, b);
        };
        SmallInteger.prototype.compareAbs = function (v) {
            var n = parseValue(v),
                a = Math.abs(this.value),
                b = n.value;
            if (n.isSmall) {
                b = Math.abs(b);
                return a === b ? 0 : a > b ? 1 : -1;
            }
            return -1;
        };

        BigInteger.prototype.compare = function (v) {
            // See discussion about comparison with Infinity:
            // https://github.com/peterolson/BigInteger.js/issues/61
            if (v === Infinity) {
                return -1;
            }
            if (v === -Infinity) {
                return 1;
            }

            var n = parseValue(v),
                a = this.value,
                b = n.value;
            if (this.sign !== n.sign) {
                return n.sign ? 1 : -1;
            }
            if (n.isSmall) {
                return this.sign ? -1 : 1;
            }
            return compareAbs(a, b) * (this.sign ? -1 : 1);
        };
        BigInteger.prototype.compareTo = BigInteger.prototype.compare;

        SmallInteger.prototype.compare = function (v) {
            if (v === Infinity) {
                return -1;
            }
            if (v === -Infinity) {
                return 1;
            }

            var n = parseValue(v),
                a = this.value,
                b = n.value;
            if (n.isSmall) {
                return a == b ? 0 : a > b ? 1 : -1;
            }
            if (a < 0 !== n.sign) {
                return a < 0 ? -1 : 1;
            }
            return a < 0 ? 1 : -1;
        };
        SmallInteger.prototype.compareTo = SmallInteger.prototype.compare;

        BigInteger.prototype.equals = function (v) {
            return this.compare(v) === 0;
        };
        SmallInteger.prototype.eq = SmallInteger.prototype.equals = BigInteger.prototype.eq = BigInteger.prototype.equals;

        BigInteger.prototype.notEquals = function (v) {
            return this.compare(v) !== 0;
        };
        SmallInteger.prototype.neq = SmallInteger.prototype.notEquals = BigInteger.prototype.neq = BigInteger.prototype.notEquals;

        BigInteger.prototype.greater = function (v) {
            return this.compare(v) > 0;
        };
        SmallInteger.prototype.gt = SmallInteger.prototype.greater = BigInteger.prototype.gt = BigInteger.prototype.greater;

        BigInteger.prototype.lesser = function (v) {
            return this.compare(v) < 0;
        };
        SmallInteger.prototype.lt = SmallInteger.prototype.lesser = BigInteger.prototype.lt = BigInteger.prototype.lesser;

        BigInteger.prototype.greaterOrEquals = function (v) {
            return this.compare(v) >= 0;
        };
        SmallInteger.prototype.geq = SmallInteger.prototype.greaterOrEquals = BigInteger.prototype.geq = BigInteger.prototype.greaterOrEquals;

        BigInteger.prototype.lesserOrEquals = function (v) {
            return this.compare(v) <= 0;
        };
        SmallInteger.prototype.leq = SmallInteger.prototype.lesserOrEquals = BigInteger.prototype.leq = BigInteger.prototype.lesserOrEquals;

        BigInteger.prototype.isEven = function () {
            return (this.value[0] & 1) === 0;
        };
        SmallInteger.prototype.isEven = function () {
            return (this.value & 1) === 0;
        };

        BigInteger.prototype.isOdd = function () {
            return (this.value[0] & 1) === 1;
        };
        SmallInteger.prototype.isOdd = function () {
            return (this.value & 1) === 1;
        };

        BigInteger.prototype.isPositive = function () {
            return !this.sign;
        };
        SmallInteger.prototype.isPositive = function () {
            return this.value > 0;
        };

        BigInteger.prototype.isNegative = function () {
            return this.sign;
        };
        SmallInteger.prototype.isNegative = function () {
            return this.value < 0;
        };

        BigInteger.prototype.isUnit = function () {
            return false;
        };
        SmallInteger.prototype.isUnit = function () {
            return Math.abs(this.value) === 1;
        };

        BigInteger.prototype.isZero = function () {
            return false;
        };
        SmallInteger.prototype.isZero = function () {
            return this.value === 0;
        };
        BigInteger.prototype.isDivisibleBy = function (v) {
            var n = parseValue(v);
            var value = n.value;
            if (value === 0) return false;
            if (value === 1) return true;
            if (value === 2) return this.isEven();
            return this.mod(n).equals(CACHE[0]);
        };
        SmallInteger.prototype.isDivisibleBy = BigInteger.prototype.isDivisibleBy;

        function isBasicPrime(v) {
            var n = v.abs();
            if (n.isUnit()) return false;
            if (n.equals(2) || n.equals(3) || n.equals(5)) return true;
            if (n.isEven() || n.isDivisibleBy(3) || n.isDivisibleBy(5)) return false;
            if (n.lesser(25)) return true;
            // we don't know if it's prime: let the other functions figure it out
        };

        BigInteger.prototype.isPrime = function () {
            var isPrime = isBasicPrime(this);
            if (isPrime !== undefined) return isPrime;
            var n = this.abs(),
                nPrev = n.prev();
            var a = [2, 3, 5, 7, 11, 13, 17, 19],
                b = nPrev,
                d, t, i, x;
            while (b.isEven()) b = b.divide(2);
            for (i = 0; i < a.length; i++) {
                x = bigInt(a[i]).modPow(b, n);
                if (x.equals(CACHE[1]) || x.equals(nPrev)) continue;
                for (t = true, d = b; t && d.lesser(nPrev) ; d = d.multiply(2)) {
                    x = x.square().mod(n);
                    if (x.equals(nPrev)) t = false;
                }
                if (t) return false;
            }
            return true;
        };
        SmallInteger.prototype.isPrime = BigInteger.prototype.isPrime;

        BigInteger.prototype.isProbablePrime = function (iterations) {
            var isPrime = isBasicPrime(this);
            if (isPrime !== undefined) return isPrime;
            var n = this.abs();
            var t = iterations === undefined ? 5 : iterations;
            // use the Fermat primality test
            for (var i = 0; i < t; i++) {
                var a = bigInt.randBetween(2, n.minus(2));
                if (!a.modPow(n.prev(), n).isUnit()) return false; // definitely composite
            }
            return true; // large chance of being prime
        };
        SmallInteger.prototype.isProbablePrime = BigInteger.prototype.isProbablePrime;

        BigInteger.prototype.next = function () {
            var value = this.value;
            if (this.sign) {
                return subtractSmall(value, 1, this.sign);
            }
            return new BigInteger(addSmall(value, 1), this.sign);
        };
        SmallInteger.prototype.next = function () {
            var value = this.value;
            if (value + 1 < MAX_INT) return new SmallInteger(value + 1);
            return new BigInteger(MAX_INT_ARR, false);
        };

        BigInteger.prototype.prev = function () {
            var value = this.value;
            if (this.sign) {
                return new BigInteger(addSmall(value, 1), true);
            }
            return subtractSmall(value, 1, this.sign);
        };
        SmallInteger.prototype.prev = function () {
            var value = this.value;
            if (value - 1 > -MAX_INT) return new SmallInteger(value - 1);
            return new BigInteger(MAX_INT_ARR, true);
        };

        var powersOfTwo = [1];
        while (powersOfTwo[powersOfTwo.length - 1] <= BASE) powersOfTwo.push(2 * powersOfTwo[powersOfTwo.length - 1]);
        var powers2Length = powersOfTwo.length, highestPower2 = powersOfTwo[powers2Length - 1];

        function shift_isSmall(n) {
            return ((typeof n === "number" || typeof n === "string") && +Math.abs(n) <= BASE) ||
                (n instanceof BigInteger && n.value.length <= 1);
        }

        BigInteger.prototype.shiftLeft = function (n) {
            if (!shift_isSmall(n)) {
                throw new Error(String(n) + " is too large for shifting.");
            }
            n = +n;
            if (n < 0) return this.shiftRight(-n);
            var result = this;
            while (n >= powers2Length) {
                result = result.multiply(highestPower2);
                n -= powers2Length - 1;
            }
            return result.multiply(powersOfTwo[n]);
        };
        SmallInteger.prototype.shiftLeft = BigInteger.prototype.shiftLeft;

        BigInteger.prototype.shiftRight = function (n) {
            var remQuo;
            if (!shift_isSmall(n)) {
                throw new Error(String(n) + " is too large for shifting.");
            }
            n = +n;
            if (n < 0) return this.shiftLeft(-n);
            var result = this;
            while (n >= powers2Length) {
                if (result.isZero()) return result;
                remQuo = divModAny(result, highestPower2);
                result = remQuo[1].isNegative() ? remQuo[0].prev() : remQuo[0];
                n -= powers2Length - 1;
            }
            remQuo = divModAny(result, powersOfTwo[n]);
            return remQuo[1].isNegative() ? remQuo[0].prev() : remQuo[0];
        };
        SmallInteger.prototype.shiftRight = BigInteger.prototype.shiftRight;

        function bitwise(x, y, fn) {
            y = parseValue(y);
            var xSign = x.isNegative(), ySign = y.isNegative();
            var xRem = xSign ? x.not() : x,
                yRem = ySign ? y.not() : y;
            var xBits = [], yBits = [];
            var xStop = false, yStop = false;
            while (!xStop || !yStop) {
                if (xRem.isZero()) { // virtual sign extension for simulating two's complement
                    xStop = true;
                    xBits.push(xSign ? 1 : 0);
                }
                else if (xSign) xBits.push(xRem.isEven() ? 1 : 0); // two's complement for negative numbers
                else xBits.push(xRem.isEven() ? 0 : 1);

                if (yRem.isZero()) {
                    yStop = true;
                    yBits.push(ySign ? 1 : 0);
                }
                else if (ySign) yBits.push(yRem.isEven() ? 1 : 0);
                else yBits.push(yRem.isEven() ? 0 : 1);

                xRem = xRem.over(2);
                yRem = yRem.over(2);
            }
            var result = [];
            for (var i = 0; i < xBits.length; i++) result.push(fn(xBits[i], yBits[i]));
            var sum = bigInt(result.pop()).negate().times(bigInt(2).pow(result.length));
            while (result.length) {
                sum = sum.add(bigInt(result.pop()).times(bigInt(2).pow(result.length)));
            }
            return sum;
        }

        BigInteger.prototype.not = function () {
            return this.negate().prev();
        };
        SmallInteger.prototype.not = BigInteger.prototype.not;

        BigInteger.prototype.and = function (n) {
            return bitwise(this, n, function (a, b) { return a & b; });
        };
        SmallInteger.prototype.and = BigInteger.prototype.and;

        BigInteger.prototype.or = function (n) {
            return bitwise(this, n, function (a, b) { return a | b; });
        };
        SmallInteger.prototype.or = BigInteger.prototype.or;

        BigInteger.prototype.xor = function (n) {
            return bitwise(this, n, function (a, b) { return a ^ b; });
        };
        SmallInteger.prototype.xor = BigInteger.prototype.xor;

        var LOBMASK_I = 1 << 30, LOBMASK_BI = (BASE & -BASE) * (BASE & -BASE) | LOBMASK_I;
        function roughLOB(n) { // get lowestOneBit (rough)
            // SmallInteger: return Min(lowestOneBit(n), 1 << 30)
            // BigInteger: return Min(lowestOneBit(n), 1 << 14) [BASE=1e7]
            var v = n.value, x = typeof v === "number" ? v | LOBMASK_I : v[0] + v[1] * BASE | LOBMASK_BI;
            return x & -x;
        }

        function max(a, b) {
            a = parseValue(a);
            b = parseValue(b);
            return a.greater(b) ? a : b;
        }
        function min(a,b) {
            a = parseValue(a);
            b = parseValue(b);
            return a.lesser(b) ? a : b;
        }
        function gcd(a, b) {
            a = parseValue(a).abs();
            b = parseValue(b).abs();
            if (a.equals(b)) return a;
            if (a.isZero()) return b;
            if (b.isZero()) return a;
            var c = CACHE[1], d, t;
            while (a.isEven() && b.isEven()) {
                d = Math.min(roughLOB(a), roughLOB(b));
                a = a.divide(d);
                b = b.divide(d);
                c = c.multiply(d);
            }
            while (a.isEven()) {
                a = a.divide(roughLOB(a));
            }
            do {
                while (b.isEven()) {
                    b = b.divide(roughLOB(b));
                }
                if (a.greater(b)) {
                    t = b; b = a; a = t;
                }
                b = b.subtract(a);
            } while (!b.isZero());
            return c.isUnit() ? a : a.multiply(c);
        }
        function lcm(a, b) {
            a = parseValue(a).abs();
            b = parseValue(b).abs();
            return a.divide(gcd(a, b)).multiply(b);
        }
        function randBetween(a, b) {
            a = parseValue(a);
            b = parseValue(b);
            var low = min(a, b), high = max(a, b);
            var range = high.subtract(low);
            if (range.isSmall) return low.add(Math.round(Math.random() * range));
            var length = range.value.length - 1;
            var result = [], restricted = true;
            for (var i = length; i >= 0; i--) {
                var top = restricted ? range.value[i] : BASE;
                var digit = truncate(Math.random() * top);
                result.unshift(digit);
                if (digit < top) restricted = false;
            }
            result = arrayToSmall(result);
            return low.add(typeof result === "number" ? new SmallInteger(result) : new BigInteger(result, false));
        }
        var parseBase = function (text, base) {
            var val = CACHE[0], pow = CACHE[1],
                length = text.length;
            if (2 <= base && base <= 36) {
                if (length <= LOG_MAX_INT / Math.log(base)) {
                    return new SmallInteger(parseInt(text, base));
                }
            }
            base = parseValue(base);
            var digits = [];
            var i;
            var isNegative = text[0] === "-";
            for (i = isNegative ? 1 : 0; i < text.length; i++) {
                var c = text[i].toLowerCase(),
                    charCode = c.charCodeAt(0);
                if (48 <= charCode && charCode <= 57) digits.push(parseValue(c));
                else if (97 <= charCode && charCode <= 122) digits.push(parseValue(c.charCodeAt(0) - 87));
                else if (c === "<") {
                    var start = i;
                    do { i++; } while (text[i] !== ">");
                    digits.push(parseValue(text.slice(start + 1, i)));
                }
                else throw new Error(c + " is not a valid character");
            }
            digits.reverse();
            for (i = 0; i < digits.length; i++) {
                val = val.add(digits[i].times(pow));
                pow = pow.times(base);
            }
            return isNegative ? val.negate() : val;
        };

        function stringify(digit) {
            var v = digit.value;
            if (typeof v === "number") v = [v];
            if (v.length === 1 && v[0] <= 35) {
                return "0123456789abcdefghijklmnopqrstuvwxyz".charAt(v[0]);
            }
            return "<" + v + ">";
        }
        function toBase(n, base) {
            base = bigInt(base);
            if (base.isZero()) {
                if (n.isZero()) return "0";
                throw new Error("Cannot convert nonzero numbers to base 0.");
            }
            if (base.equals(-1)) {
                if (n.isZero()) return "0";
                if (n.isNegative()) return new Array(1 - n).join("10");
                return "1" + new Array(+n).join("01");
            }
            var minusSign = "";
            if (n.isNegative() && base.isPositive()) {
                minusSign = "-";
                n = n.abs();
            }
            if (base.equals(1)) {
                if (n.isZero()) return "0";
                return minusSign + new Array(+n + 1).join(1);
            }
            var out = [];
            var left = n, divmod;
            while (left.isNegative() || left.compareAbs(base) >= 0) {
                divmod = left.divmod(base);
                left = divmod.quotient;
                var digit = divmod.remainder;
                if (digit.isNegative()) {
                    digit = base.minus(digit).abs();
                    left = left.next();
                }
                out.push(stringify(digit));
            }
            out.push(stringify(left));
            return minusSign + out.reverse().join("");
        }

        BigInteger.prototype.toString = function (radix) {
            if (radix === undefined) radix = 10;
            if (radix !== 10) return toBase(this, radix);
            var v = this.value, l = v.length, str = String(v[--l]), zeros = "0000000", digit;
            while (--l >= 0) {
                digit = String(v[l]);
                str += zeros.slice(digit.length) + digit;
            }
            var sign = this.sign ? "-" : "";
            return sign + str;
        };
        SmallInteger.prototype.toString = function (radix) {
            if (radix === undefined) radix = 10;
            if (radix != 10) return toBase(this, radix);
            return String(this.value);
        };

        BigInteger.prototype.valueOf = function () {
            return +this.toString();
        };
        BigInteger.prototype.toJSNumber = BigInteger.prototype.valueOf;

        SmallInteger.prototype.valueOf = function () {
            return this.value;
        };
        SmallInteger.prototype.toJSNumber = SmallInteger.prototype.valueOf;

        function parseStringValue(v) {
                if (isPrecise(+v)) {
                    var x = +v;
                    if (x === truncate(x))
                        return new SmallInteger(x);
                    throw "Invalid integer: " + v;
                }
                var sign = v[0] === "-";
                if (sign) v = v.slice(1);
                var split = v.split(/e/i);
                if (split.length > 2) throw new Error("Invalid integer: " + text.join("e"));
                if (split.length === 2) {
                    var exp = split[1];
                    if (exp[0] === "+") exp = exp.slice(1);
                    exp = +exp;
                    if (exp !== truncate(exp) || !isPrecise(exp)) throw new Error("Invalid integer: " + exp + " is not a valid exponent.");
                    var text = split[0];
                    var decimalPlace = text.indexOf(".");
                    if (decimalPlace >= 0) {
                        exp -= text.length - decimalPlace - 1;
                        text = text.slice(0, decimalPlace) + text.slice(decimalPlace + 1);
                    }
                    if (exp < 0) throw new Error("Cannot include negative exponent part for integers");
                    text += (new Array(exp + 1)).join("0");
                    v = text;
                }
                var isValid = /^([0-9][0-9]*)$/.test(v);
                if (!isValid) throw new Error("Invalid integer: " + v);
                var r = [], max = v.length, l = LOG_BASE, min = max - l;
                while (max > 0) {
                    r.push(+v.slice(min, max));
                    min -= l;
                    if (min < 0) min = 0;
                    max -= l;
                }
                trim(r);
                return new BigInteger(r, sign);
        }

        function parseNumberValue(v) {
                if (isPrecise(v)) return new SmallInteger(v);
                return parseStringValue(v.toString());
        }

        function parseValue(v) {
            if (typeof v === "number") {
                return parseNumberValue(v);
            }
            if (typeof v === "string") {
                return parseStringValue(v);
            }
            return v;
        }
        // Pre-define numbers in range [-999,999]
        var CACHE = function (v, radix) {
            if (typeof v === "undefined") return CACHE[0];
            if (typeof radix !== "undefined") return +radix === 10 ? parseValue(v) : parseBase(v, radix);
            return parseValue(v);
        };
        for (var i = 0; i < 1000; i++) {
            CACHE[i] = new SmallInteger(i);
            if (i > 0) CACHE[-i] = new SmallInteger(-i);
        }
        // Backwards compatibility
        CACHE.one = CACHE[1];
        CACHE.zero = CACHE[0];
        CACHE.minusOne = CACHE[-1];
        CACHE.max = max;
        CACHE.min = min;
        CACHE.gcd = gcd;
        CACHE.lcm = lcm;
        CACHE.isInstance = function (x) { return x instanceof BigInteger || x instanceof SmallInteger; };
        CACHE.randBetween = randBetween;
        return CACHE;
    })()
});

if((typeof module) !== 'undefined') {
    module.exports = nerdamer;
}