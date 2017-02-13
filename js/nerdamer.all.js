/*CORE*/
/*
 * Author : Martin Donk
 * Website : http://www.nerdamer.com
 * Email : martin.r.donk@gmail.com
 * Source : https://github.com/jiggzson/nerdamer
 */
/*
 * TODO
 * simplify ratio of sqrt
 */

var nerdamer = (function(imports) { 
    "use strict";

    var version = '0.6.6',
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
        
        FACTORIAL = Settings.FACTORIAL = 'fact',

        //the storage container "memory" for parsed expressions
        EXPRESSIONS = [],
        
        //variables
        VARS = {},
        
        //the container used to store all the reserved functions
        RESERVED = [],


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
         * @type type
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
            var regex = /^[a-z_][a-z\d\_]*$/gi;
            if(!(regex.test( name)) ) {
                throw new Error(name+' is not a valid '+typ+' name');
            }
        },
        /**
         * Finds intersection of two arrays
         * @param {array} a
         * @param {Array} b
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
        //This object holds additional functions for nerdamer. Think of it as an extension of the Math object.
        //I really don't like touching objects which aren't mine hence the reason for Math2. The names of the 
        //functions within are pretty self-explanatory.
        Math2 = {
            csc: function(x) { return 1/Math.sin(x); },
            sec: function(x) { return 1/Math.cos(x); },
            cot: function(x) { return 1/Math.tan(x); },
            //https://github.com/AndreasMadsen/mathfn/blob/master/functions/erf.js
            erf: function(x){
                var ERF_A = [
                    0.254829592,
                    -0.284496736,
                    1.421413741,
                    -1.453152027,
                    1.061405429
                  ];
                  var ERF_P = 0.3275911;

                  function erf(x) {
                    var sign = 1;
                    if (x < 0) sign = -1;

                    x = Math.abs(x);

                    var t = 1.0/(1.0 + ERF_P*x);
                    var y = 1.0 - (((((ERF_A[4]*t + ERF_A[3])*t) + ERF_A[2])*t + ERF_A[1])*t + ERF_A[0])*t*Math.exp(-x*x);

                    return sign * y;
                  }
                  return erf(x);
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
            fact: function(x) {
                var retval=1;
                for (var i = 2; i <= x; i++) retval = retval * i;
                return retval;
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
            //https://en.wikipedia.org/wiki/Trigonometric_integral
            //CosineIntegral
            Ci: function(x) {
                var n =20,
                    g = 0.5772156649015329, //roughly Euler–Mascheroni
                    sum = 0;
                for(var i=1; i<n; i++) {
                    var n2 = 2*i; //cache 2n
                    sum += (Math.pow(-1, i)*Math.pow(x, n2))/(n2*Math2.fact(n2));
                }
                return Math.log(x) + g + sum;
            },
            //SineIntegral
            Si: function(x) {
                var n = 20,
                    sum = 0;
                for(var i=0; i<n; i++) {
                    var n2 = 2*i;
                    sum += (Math.pow(-1, i)*Math.pow(x, n2+1))/((n2+1)*Math2.fact(n2+1));
                }
                return sum;
            }
        };

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
            asDecimal = option === 'decimals',
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
            if(power) power = '^' + power;

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
     * Wraps a function name in this object
     * @param {String} fn_name
     * @returns {Func}
     */
    function Func(fn_name) {
        this.name = fn_name;
    }
    
    /** 
     * This is what nerdamer returns. It's sort of a wrapper around the symbol class and 
     * provides the user with some useful functions. If you want to provide the user with extra
     * library functions then add them to this class's prototype.
     * @param {Symbol} symbol
     * @returns {Expression} wraps around the Symbol class
     */
    function Expression(symbol) {
        this.symbol = symbol;
    }
    
    /**
     * Returns stored expression at index. For first index use 1 not 0.
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
         * @returns {String}
         */
        text: function(opt) { 
            opt = opt || 'decimals';
            return text(this.symbol, opt);
        },
        /**
         * Returns the latex representation of the expression
         * @returns {String}
         */
        latex: function(option) {
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
            
            //link pi and e
            subs.e = _.constants.E;
            subs.pi = _.constants.PI;

            return new Expression(block('PARSE2NUMBER', function() {
                return _.parse(expression, format_subs(subs));
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
        
        toDecimal: function() {
            return this.symbol.toDecimal();
        },
        
        isFraction: function() {
            return isFraction(this.symbol);
        },
        
        isPolynomial: function() {
            return this.symbol.isPoly();
        }, 
        
        sub: function(symbol, for_symbol) {
            return new Expression(this.symbol.sub(_.parse(symbol), _.parse(for_symbol)));
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
            return !this.den.equals(1) ? this.num+'/'+this.den : String(this.num);
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
        if(!isNaN(obj)) { 
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
            if(!isSymbol(symbol)) symbol = new Symbol(symbol);
            return this.value === symbol.value && this.power.equals(symbol.power) && this.multiplier.equals(symbol.multiplier);
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
            
            if(g === S && this.contains(v)) 
                arr.add(new Symbol(this.multiplier), this.power);
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
        hasFunc: function() {
            if(this.group === FN || this.group === EX) return true;
            if(this.symbols) {
                for(var x in this.symbols) {
                    if(this.symbols[x].hasFunc()) return true;
                }
            }
            return false;
        },
        //this method substitutes one symbol for another
        sub: function(symbol, for_symbol) {
            var g1 = this.group,
                g2 = symbol.group;       
            if(g1 === g2 && this.equals(symbol)) { 
                //the simplest subsitution we can make
                return for_symbol.clone();
            }
            else {
                var retval;
                if(g1 === g2 & g1 === S && symbol.isLinear() && this.value === symbol.value) { 
                    //e.g. x^2+1, x=u : x is linear so it matches all x's
                    retval = for_symbol.clone();
                    retval.multiplier = this.multiplier.clone();
                    retval.power = this.power.clone();
                    retval = _.parse(retval);
                }
                else if(text(this, 'hash') === text(symbol, 'hash')) { 
                    var p = _.divide(_.parse(this.power), _.parse(symbol.power));
                    if(isInt(p)) {
                        retval = for_symbol.clone();
                        retval = _.pow(retval, _.parse(p));
                        retval.multiplier = retval.multiplier.multiply(this.multiplier);
                    } 
                }
                //loop through all the symbols
                else if(this.symbols) {
                    retval = this.clone();
                    var f = this.isComposite() ? 'attach' : 'combine';
                    retval.symbols = {};
                    this.each(function(x) {
                        var sub = x.sub(symbol, for_symbol);
                        retval[f](sub);
                    });
                    retval.updateHash();
                }
                //check the arguments of the function
                else if(g1 === FN) {
                    retval = this.clone();
                    retval.args = [];
                    for(var i=0; i<this.args.length; i++) {
                        retval.args[i] = this.args[i].sub(symbol, for_symbol);
                    }
                    retval.updateHash();
                }
                if(this.group === EX) {
                    retval = retval || this.clone();
                    retval.power = retval.power.sub(symbol, for_symbol);
                    //it easer to just reparse the whole thing
                    retval = _.parse(retval);
                }
                if(!retval) return this.clone();
                return retval;
            }
            
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
        each: function(fn) {
            if(!this.symbols) {
                fn.call(this, this, this.value);
            }
            else {
                for(var x in this.symbols) {
                    fn.call(this, this.symbols[x], x);
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
            if(this.group === N) { return this.multiplier; }
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
            if(this.symbols && g !== EX) {
                for(var x in this.symbols) { if(this.symbols[x].contains(variable, all)) return true; }
            }
            else if(g === FN || this.previousGroup === FN) {
                for(var i=0; i<this.args.length; i++) { if(this.args[i].contains(variable, all)) return true; }
            }
            else if(g === EX) { 
                //exit only if it does
                if(all && this.power.contains(variable, all)) { return true; }
                return this.value === variable;
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
        distributeMultiplier: function() {
            if(this.symbols && this.power.equals(1) && this.group !== CB && !this.multiplier.equals(1)) {
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
                if(this.multiplier.den.toString() !== '1') err('Attempting conversion of group N with non-unit denominator!');
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
                    else key = inBrackets(text(this, 'hash'))+'^'+this.power.toDecimal();
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
        latex: function() {
            return LaTeX.latex(this);
        },
        /**
         * Returns the text representation of a symbol
         * @returns {String}
         */
        text: function() {
            return text(this);
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
     * @param {boolean} is_postfix - Is the operator a postfix operator (for future releases)
     * @returns {Operator}
     */
    function Operator(val, fn, precedence, left_assoc, is_prefix, is_postfix) {
        this.val = val;
        this.fn = fn;
        this.precedence = precedence;
        this.left_assoc = left_assoc;
        this.is_prefix = is_prefix;
        this.is_postfix = is_postfix || false;
    }
    
    Operator.prototype.toString = function() {
        return this.val;
    };

    /**
     * 
     * @param {char} val - The operator
     * @returns {Prefix}
     */
    function Prefix(val) {
        this.val = val;
    }
    
    Prefix.prototype = {
        /**
         * This function resolves the prefix. It will correct the sign of the symbol by changing the sign of
         * the multiplier. If the multiplier is negative it will make it positive etc..
         * @returns {Symbol}
         */
        resolve: function(obj) {
            if(this.val === '-') {
                return obj.negate();
            }
            return obj;
        },
        toString: function() {
            return this.val;
        }
    };

    //Uses modified Shunting-yard algorithm. http://en.wikipedia.org/wiki/Shunting-yard_algorithm
    function Parser(){
        //we want the underscore to point to this parser not the global nerdamer parser.
        var _ = this, 
            bin = {},
            constants = this.constants = {
                PI: Math.PI,
                E:  Math.E
            };
        //list all the supported operators
        var operators = this.operators = {
                '!' : new Operator('!', 'factorial', 5, false, false, true),
                '^' : new Operator('^', 'pow', 4, false, false),
                '*' : new Operator('*', 'multiply', 3, true, false),
                '/' : new Operator('/', 'divide', 3, true, false),
                '+' : new Operator('+', 'add', 2, true, true),
                '-' : new Operator('-', 'subtract', 2, true, true),
                ',' : new Operator(',', 'comma', 1, true, false)
            },

            // Supported functions.
            // Format: function_name: [mapped_function, number_of_parameters]
            functions = this.functions = {
                'cos'       : [ cos, 1],
                'sin'       : [ sin, 1],
                'tan'       : [ tan, 1],
                'sec'       : [ sec, 1],
                'csc'       : [ csc, 1],
                'cot'       : [ cot, 1],
                'acos'      : [ , 1],
                'asin'      : [ , 1],
                'atan'      : [ , 1],
                'sinh'      : [ , 1],
                'cosh'      : [ , 1],
                'tanh'      : [ , 1],
                'asinh'     : [ , 1],
                'acosh'     : [ , 1],
                'atanh'     : [ , 1],
                'log10'     : [ , 1],
                'exp'       : [ , 1],
                'min'       : [ , -1],
                'max'       : [ ,-1],
                'erf'       : [ , 1],
                'floor'     : [ ,1],
                'ceil'      : [ ,1],
                'Si'        : [ ,1],
                'Ci'        : [ ,1],
                'fib'        : [ ,1],
                'fact'      : [factorial, 1],
                'factorial' : [factorial, 1],
                'round'     : [ , 1],
                'mod'       : [mod, 2],
                'pfactor'   : [pfactor , 1],
                'vector'    : [vector, -1],
                'matrix'    : [matrix, -1],
                'parens'    : [parens, -1],
                'sqrt'      : [sqrt, 1],
                'log'       : [log , 1],
                'expand'    : [expand , 1],
                'abs'       : [abs , 1],
                'invert'    : [invert, 1],
                'transpose' : [transpose, 1],
                'dot'       : [dot, 2],
                'cross'     : [cross, 2],
                'vecget'    : [vecget, 2],
                'vecset'    : [vecset, 3],
                'matget'    : [matget, 3],
                'matset'    : [matset, 4],
                'imatrix'   : [imatrix, 1]
            };
        
        var brackets = {}, //the storage container for the brackets

            last_item_on = function(stack) {
                return stack[stack.length-1];
            };
        
        var LEFT_PAREN = '(',
            RIGHT_PAREN = ')',
            LEFT_SQUARE_BRACKET = '[',
            RIGHT_SQUARE_BRACKET = ']',
            scientific_numbers = [];
                
            brackets[LEFT_PAREN] = LEFT_PAREN,
            brackets[RIGHT_PAREN] = RIGHT_PAREN,
            brackets[LEFT_SQUARE_BRACKET] = LEFT_SQUARE_BRACKET,
            brackets[RIGHT_SQUARE_BRACKET] = RIGHT_SQUARE_BRACKET;

        this.error = err;
        
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
            if(typeof params === 'object') params = [].slice.call(params);//ensure an array
            
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
            
            if(!fn_settings) throw new Error(fn_name+' is not a supported function.');
            
            var num_allowed_args = fn_settings[1],
                fn = fn_settings[0],
                retval;

            if(!(args instanceof Array)) args = args !== undefined ?  [args] : [];

            if(num_allowed_args !== -1) {
                var is_array = isArray(num_allowed_args),
                    min_args = is_array ? num_allowed_args[0] : num_allowed_args,
                    max_args = is_array ? num_allowed_args[1] : num_allowed_args,
                    num_args = args.length;
            
                var error_msg = fn_name+' requires a {0} of {1} arguments. {2} provided!';
                
                if(num_args < min_args) err(format(error_msg, 'minimum', min_args, num_args));
                if(num_args > max_args) err(format(error_msg, 'maximum', max_args, num_args));
            }
            
            if(fn) { retval = fn.apply(fn_settings[2] || this, args); }
            else {
                if(Settings.PARSE2NUMBER) {
                    try { 
                        args = args.map(function(symbol) { 
                            if(symbol.group === N) return symbol.multiplier.toDecimal();
                            else err('Symbol must be of group N.');
                        });
                        var f = fn_name in Math ? Math[fn_name] : Math2[fn_name];
                        retval = new Symbol(f.apply(undefined, args));
                    }
                    catch(e){ 
                        retval = this.symfunction(fn_name, args); 
                    }
                }
                else {
                    retval = this.symfunction(fn_name, args);
                }
            }
            return retval;
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
        this.parse = function(expression_string, substitutions) {  
            /*
             * Since variables cannot start with a number, the assumption is made that when this occurs the
             * user intents for this to be a coefficient. The multiplication symbol in then added. The same goes for 
             * a side-by-side close and open parenthesis
             */
            expression_string = String(expression_string).split(' ').join('')//strip empty spaces
                    .replace(/\d*\.*\d+e[\+\-]*\d+/gi, function(match, start, str) {
                        if(/[a-z_]/.test(str.charAt(start-1))) return match;
                        scientific_numbers.push(match);
                        return '&';
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
                    //allow omission of multiplication sign between brackets
                    .replace( /\)\(/g, ')*(' ) || '0';

            var subs = substitutions || {},
                stack = [], //the operator stack
                output = [], //the values stack
                len = expression_string.length,
                pos = 0,
                last_opr_pos, //where the last operator was found
                last_operator, //the lst operator that was found
                last_char,
                EOT = false, //was the end of the string reached?
                func_on_stack = false,
                curpos = 0, //the current position on the string
                                
                evaluate = function(operator) { 
                    if(!operator) {
                        operator = stack.pop();
                    }

                    var symbol2 = output.pop(),
                        symbol1 = output.pop();

                    if(!operator && !symbol1 && symbol2) { 
                        insert(symbol2);
                    }
                    else if(operator === LEFT_PAREN) { 
                        if(EOT) err('Unmatched open parenthesis!');
                        stack.push(operator);
                        insert(symbol1);
                        insert(symbol2);
                    }
                    else {
                        var ofn = operator.fn, result;
                        
                        //first we assume that it's the first operator in which case it's the first symbol and negative
                        if(!ofn) {
                            
                            result = operator.resolve(symbol2);
                            //let's just do a down and dirty reduction of the prefixes by looping through one at a time 
                            //and eliminating them
                            while(symbol1 && last_item_on(stack) instanceof Prefix) {
                                result = stack.pop().resolve(result);
                            }
                            //if we didn't have a first symbol then we're dealing with a pure prefix operator
                            //otherwise we need to place symbol1 back on the stack for reconsideration
                            if(symbol1) insert(symbol1);
                        }
                        else {
                            result = _[ofn].call(_, symbol1, symbol2);
                        }

                        insert(result);
                    }    
                },
                /**
                 * This method inserts the token into the output stack. Here it will attempt to detect if a prefix is 
                 * on the stack and will try to resolve it. Additonally it checks if the item is a scientific number
                 * and if so places the correct number on the output stack. 
                 * @param token
                 */
                insert = function(token) {
                    //if the number is a scientifc number then use that instead
                    if(/&/.test(token)) {
                        token = scientific_numbers.shift();
                    }
                    
                    //when two operators are close to each other then the token will be empty or when we've gone
                    //out of range inside of the output or stack. We have to make sure the token even exists 
                    //before entering.
                    if(token !== '' && token !== undefined) { 
                        //this could be function parameters or a vector
                        if(!(token instanceof Array)) { 
                            //TODO: possible redundant check. Needs investigation
                            if(!(token instanceof Symbol) && !(customType(token))) {
                                var sub = subs[token] || VARS[token]; //handle substitutions
                                token = sub ? sub.clone() : new Symbol(token);
                            }
                        }
                        
                        //resolve prefixes
                        while(last_item_on(stack) instanceof Prefix) {
                            //if there's a function on the output stack then check the next operator 
                            if(func_on_stack) {
                                //check the next operator to come
                                var next_operator = operators[expression_string.charAt(curpos+1)];
                                if(next_operator && !next_operator.left_assoc) break;
                            }
                            if(operator && !operator.left_assoc) break; //don't touch pow
                            var prefix = stack.pop();
                            token = prefix.resolve(token);
                        }
                        
                        output.push(token);
                        
                        func_on_stack = false;//thank you for your service
                    } 
                };
                
            if(!subs['~']) {   
                //collect the substitutions
                for(var x in constants) subs[x] = new Symbol(constants[x]);
            }

            for(curpos=0; curpos<len; curpos++) { 
                var cur_char = expression_string.charAt(curpos);
                var operator = cur_char in operators ? operators[cur_char] : undefined, //a possible operator
                    bracket = cur_char in brackets ? brackets[cur_char] : undefined; //a possible bracket
                //if the character is a bracket or an operator but not a scientific number
                if(operator || bracket) { 
                    //if an operator is found then we assume that the preceeding is a variable.
                    //the token has to be from the last position up to the current position
                    var token = expression_string.substring(pos,curpos),
                        isSquareBracket = bracket === LEFT_SQUARE_BRACKET;
                
                    // support for compound operators
                    var next_char = expression_string.charAt(curpos + 1);
                    var also_operator = next_char in operators ? operators[next_char] : undefined;
                    if(also_operator) {
                        var combined = cur_char+next_char;
                        var compound_operator = combined in operators ? operators[combined] : undefined;
                        if(compound_operator) { 
                            operator = compound_operator;
                            curpos++;
                        }
                    }
                    
                    if(bracket === LEFT_PAREN && token || isSquareBracket) { 
                        //make sure you insert the variables
                        if(isSquareBracket && token) insert(token);
                        
                        var f = isSquareBracket ? VECTOR : token;
                        stack.push(new Func(f), LEFT_PAREN);

                        pos = curpos+1;
                        last_opr_pos = curpos; 
                        continue;
                    }

                    //place the token on the output stack. 
                    //This may be empty if we're at a unary or bracket so skip those.
                    insert(token);

                    //if the preceding token is a operator
                    if(!bracket && (curpos-last_opr_pos === 1 || curpos === 0)) { 
                        if(operator.is_prefix) {
                            stack.push(new Prefix(operator.val));
                            pos = curpos+1;
                            last_opr_pos = curpos;
                            continue;
                        }
                        err(operator.val+' is not a valid prefix operator!:'+pos); 
                    }
                    //note that open brackets count as operators in this case
                    if(cur_char !== RIGHT_PAREN) last_opr_pos = curpos; 

                    if(operator && !operator.left_assoc && operator.is_postfix) { 
                        //resolve the postfix operator
                        output.push(_[operator.fn](output.pop()));

                        operator = operators[expression_string.charAt(++curpos)]; //move to the next operator
                        if(!operator) {
                            if(curpos === len) break;//we've reached the end of the string and it's a postfix
                            curpos--; //adjust the current position
                        } 
                    }

                    if(operator) { 
                        //we may be at the first operator, in which case the last operator may be undefined
                        //If this is the case then do nothing other than record the last operator and 
                        //place the operator on the stack.
                        if(last_operator) { 
                            if(operator.left_assoc && operator.precedence <= last_operator.precedence ||
                                    !operator.left_assoc && (operator.precedence < last_operator.precedence)) {
                                var done = false;
                                do {
                                    evaluate(); 
                                    var last = last_item_on(stack); 
                                    //stop when you see a parethesis
                                    if(last === LEFT_PAREN) break;
                                    
                                    done = last ? last.left_assoc && last.precedence < operator.precedence: true;
                                }
                                while(!done);  
                            }
                        }
                        stack.push(operator);
                        last_operator = last_item_on(stack);
                    }
                    else { 
                        if(cur_char === LEFT_PAREN) {
                            stack.push(bracket);
                        }
                        //we found a closing bracket
                        else if(cur_char === RIGHT_PAREN || cur_char === RIGHT_SQUARE_BRACKET) { 
                            last_opr_pos = null;
                            var found_matching = false;
                            while(!found_matching) {
                                var popped = stack.pop();
                                if(popped === undefined) err('Unmatched close bracket or parenthesis!');
                                
                                if(popped === LEFT_PAREN) {
                                    found_matching = true;
                                }
                                else evaluate(popped);
                                //TODO: fix bracket parity checking.
                                if(popped === LEFT_PAREN && cur_char === RIGHT_SQUARE_BRACKET) { 
                                    var lsi = last_item_on(stack);
                                    if(!lsi || lsi.name !== VECTOR) err('Unmatched parenthesis!');
                                }
                            }
                            
                            var last_stack_item = last_item_on(stack);

                            if(last_stack_item instanceof Func) { 
                                //TODO: fix bracket parity checking
                                if(last_stack_item.name === VECTOR && !(cur_char === RIGHT_SQUARE_BRACKET || cur_char === RIGHT_PAREN))
                                    err('Unmatched bracket!');
                                var v = _.callfunction(stack.pop().name, output.pop()); 
                                func_on_stack = true;
                                insert(v);//go directly to output as this will cause the prefix to prematurely be evaluated
                            }
                        }
                        last_operator = last_item_on(stack);
                    } 
                    
                    pos = curpos+1; //move along
                }
                else if(curpos === len-1) { 
                    insert(expression_string.substring(pos, curpos+1));
                }
                last_char = cur_char;
            }
            
            EOT = true; //end of tokens/stack reached
            
            while(stack.length > 0) { 
                evaluate();
            }

            return output[0];
        };

        //FUNCTIONS
        //although parens is not a "real" function it is important in some cases when the 
        //symbol must carry parenthesis. Once set you don't have to worry about it anymore
        //as the parser will get rid of it at the first opportunity
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
            if(Settings.PARSE2NUMBER && symbol.isConstant()) {
                if(isInt(symbol)) return Math2.fact(symbol);
                return Math2.gamma(symbol.multiplier.toDecimal()+1);
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
         * The square root function
         * @param {Symbol} symbol
         * @returns {Symbol}
         */
        function sqrt(symbol) { 
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
        
        function pfactor(symbol) {
            var retval = new Symbol(1);
            if(symbol.isConstant()) {
                var m = symbol.multiplier.toDecimal();
                if(isInt(m)) {
                    var factors = Math2.ifactor(m);
                    for(var factor in factors) {
                        var p = factors[factor];
                        retval = _.multiply(retval, _.symfunction('parens', [new Symbol(factor).setPower(p)]))
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

            if(symbol.group === EX && symbol.power.multiplier.lessThan(0) || symbol.power == -1) {
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
                    var n = m.num, d = m.den;
                    if(d == 2) retval = new Symbol(0);
                    else if(d == 3) {
                        retval = _.parse('1/2'); c = true;
                    }
                    else if(d == 4) {
                        retval = _.parse('1/sqrt(2)'); c = true;
                    }
                    else if(d == 6) {
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
                return sqrt(symbol.toLinear()).setPower(new Frac(sign));
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
                
                if(g1 === CP && g2 === CP && b.isLinear() && !a.isLinear()) {
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
                        else if(!b.isOne()) result = Symbol.shell(CB).combine([result, b]);
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
                if(a.isConstant() && b.isConstant()) {
                    if(b.equals(0)) err('Division by zero not allowed!');
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
                if(a.equals(0) && b.equals(0)) err('0^0 is undefined!');
                
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
                    result.multiplyPower(b);
                }

                if(aIsConstant && bIsConstant && Settings.PARSE2NUMBER) {
                    var base = a.multiplier.toDecimal(), e = b.multiplier.toDecimal();

                    var sign = new Symbol(1);
                    if(b.multiplier.den.isOdd()) {
                        var abs_base = Math.abs(base);
                        sign = new Symbol(base/abs_base);
                        base = abs_base;
                    }
                    
                    if(even(e)) sign = new Symbol(1);
                    
                    result = _.multiply(new Symbol(Math.pow(base, e)), sign);
                }
                else if(bIsInt && !m.equals(1)) { 
                    var p = b.multiplier.toDecimal(),
                        multiplier = new Frac(Math.pow(m.num, p) / Math.pow(m.den, p)); 
                    //multiplying is justified since after mulltiplyPower if it was of group P it will now be of group N
                    result.multiplier = result.multiplier.multiply(multiplier);
                }
                else {
                    //b is a symbol
                    var sign = Math.sign(m.num),
                        neg_num = a.group === N && sign < 0,
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

                    result = _.multiply(result, testPow(_.multiply(num, den)));

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

                result = testSQRT(result);

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
            if(a instanceof Array) a.push(b);
            else a = [a,b];
            return a;
        };
        //wraps the factorial
        this.factorial = function(a) {
            return this.symfunction(FACTORIAL, [a]);
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
                        rowTeX.push(this.latex(e));
                    }
                    TeX += rowTeX.join(' & ')+'\\\\\n';
                }
                TeX += '\\end{pmatrix}';
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
                index =  inverted ? 1 : 0;;
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
                else if(fname === FACTORIAL) {
                    var arg = symbol.args[0];
                    if(arg.power.equals(1) && (arg.isComposite() || arg.isCombination())) {
                        input[0] = this.brackets(input[0]);
                    }
                    v[index] = input[0]+'!';
                }
                else { 
                    var name = '\\mathrm'+this.braces(fname);
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
                for(var x in symbol.symbols) cc.push(ftext(symbol.symbols[x], xports)[0]);
                var retval = cc.join(d);
                return retval && !symbol.multiplier.equals(1)? inBrackets(retval) : retval;
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
            if(group === N) c.push(symbol.multiplier.toDecimal());
            else if(symbol.multiplier.equals(-1)) prefix = '-';
            else if(!symbol.multiplier.equals(1)) c.push(symbol.multiplier.toDecimal());
            //the value
            var value;
            

            if(group === S) value = symbol.value;
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
            if(args.length !== arg_array.length) err('Argument array contains wrong number of arguments');
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
        
        var parts = expression.split('=');
        //have the expression point to the second part instead
        if(parts.length > 1) {
            //Check if parts[0] is a function
            if (/\w+\((.*)\)/.test(parts[0].replace(/\s/g, ''))) {
                fn = /\w+(?=\()/.exec(parts[0])[0];
                args = /\((.*)(?=\))/.exec(parts[0])[1].replace(/\s/g, '').split(',');
            } else {
                variable = parts[0];
            }
            expression = parts[1];
        }
        
        var multi_options = isArray(option),
            expand = 'expand',
            numer = multi_options ? option.indexOf('numer') !== -1 : option === 'numer';
        if((multi_options ? option.indexOf(expand) !== -1 : option === expand)) {
            expression = format('{0}({1})', expand, expression);
        }
        var e = block('PARSE2NUMBER', function(){
            return _.parse(expression, format_subs(subs));
        }, numer || Settings.PARSE2NUMBER);
        
        if(location) { EXPRESSIONS[location-1] = e; }
        else { EXPRESSIONS.push(e);}
        
        if(variable) libExports.setVar(variable, e);
        if(fn) libExports.setFunction(fn, args, e);
        
        return new Expression(e);
    };
    
    /**
     * 
     * @returns {String} returns the version of nerdamer
     */
    libExports.version = function() {
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
/*ALGEBRA*/
(function() {
    "use strict";
    /*shortcuts*/
    var core = nerdamer.getCore(),
        _ = core.PARSER,
        N = core.groups.N,
        S = core.groups.S,
        EX = core.groups.EX,
        FN = core.groups.FN,
        PL = core.groups.PL,
        CP = core.groups.CP,
        CB = core.groups.CB,
        keys = core.Utils.keys,
        variables = core.Utils.variables,
        round = core.Utils.round,
        Frac = core.Frac,
        isInt = core.Utils.isInt,
        Symbol = core.Symbol,
        CONST_HASH = core.Settings.CONST_HASH;
        
    //*************** CLASSES ***************//
    /**
    * Converts a symbol into an equivalent polynomial arrays of 
    * the form [[coefficient_1, power_1],[coefficient_2, power_2], ... ]
    * Univariate polymials only. 
    * @param {Symbol|Number} symbol
    * @param {String} variable The variable name of the polynomial
    * @param {int} order
    */
    function Polynomial(symbol, variable, order) { 
        if(core.Utils.isSymbol(symbol)) {
            this.parse(symbol);
        }
        else if(!isNaN(symbol)) { 
            order = order || 0;
            if(variable === undefined) 
                throw new Error('Polynomial expects a variable name when creating using order');
            this.coeffs = [];
            this.coeffs[order] = symbol;
            this.fill(symbol);
        }
        else if(typeof symbol === 'string') {
            this.parse(_.parse(symbol));
        }
    }
    /**
     * Creates a Polynomial given an array of coefficients
     * @param {int[]} arr
     * @param {String} variable
     * @returns {Polynomial}
     */
    Polynomial.fromArray = function(arr, variable) {
        if(typeof variable === 'undefined') 
            throw new Error('A variable name must be specified when creating polynomial from array');
        var p = new Polynomial();
        p.coeffs = arr;
        p.variable = variable;
        return p;
    };
    
    Polynomial.fit = function(c1, c2, n, base, p, variable) {
        //after having looped through and mod 10 the number to get the matching factor
        var terms = new Array(p+1),
            t = n-c2;
        terms[0] = c2; //the constants is assumed to be correct
        //constant for x^p is also assumed know so add
        terms[p] = c1;
        t -= c1*Math.pow(base, p);
        //start fitting
        for(var i=p-1; i>0; i--) {
            var b = Math.pow(base, i), //we want as many wholes as possible
                q = t/b,
                sign = Math.sign(q); 
            var c = sign*Math.floor(Math.abs(q));
            t -= c*b;
            terms[i] = c;
        }
        if(t !== 0) return null;
        for(var i=0; i<terms.length; i++)
            terms[i] = new Frac(terms[i]);
        
        return Polynomial.fromArray(terms, variable);
    };

    Polynomial.prototype = { 
        /**
         * Converts Symbol to Polynomial
         * @param {Symbol} symbol
         * @param {Array} c - a collector array
         * @returns {Polynomial}
         */
        parse: function(symbol, c) { 
            this.variable = variables(symbol)[0]; 
            if(!symbol.isPoly()) throw new Error('Polynomial Expected! Received '+core.Utils.text(symbol));
            c = c || [];
            if(!symbol.power.absEquals(1)) symbol = _.expand(symbol);

            if(symbol.group === core.groups.N) { c[0] = symbol.multiplier; }
            else if(symbol.group === core.groups.S) { c[symbol.power.toDecimal()] = symbol.multiplier; }
            else { 
                for(var x in symbol.symbols) { 
                    var sub = symbol.symbols[x],
                        p = sub.power; 
                    if(core.Utils.isSymbol(p)) throw new Error('power cannot be a Symbol');

                    p = sub.group === N ? 0 : p.toDecimal();
                    if(sub.symbols){ 
                        this.parse(sub, c);  
                    }
                    else { 
                        c[p] = sub.multiplier; 
                    }
                }
            }

            this.coeffs = c;

            this.fill();
        },
        /**
        * Fills in the holes in a polynomial with zeroes
        * @param {Number} x - The number to fill the holes with
        */
        fill: function(x) {
            x = Number(x) || 0;
            var l = this.coeffs.length;
            for(var i=0; i<l; i++) {
                if(this.coeffs[i] === undefined) { this.coeffs[i] = new Frac(x); }
            }
            return this;
        },
        /**
        * Removes higher order zeros or a specific coefficient
        * @returns {Array}
        */
        trim: function() { 
            var l = this.coeffs.length;
            while(l--) {
                var c = this.coeffs[l];
                var equalsZero = c.equals(0);
                if(c && equalsZero) {
                    if(l === 0) break;
                    this.coeffs.pop();
                }
                else break;
            }

            return this;
        },
        /*
         * Returns polynomial mod p **currently fails**
         * @param {Number} p
         * @returns {Polynomial}
         */
        modP: function(p) {
            var l = this.coeffs.length;
            for(var i=0; i<l; i++) {
                var c = this.coeffs[i];
                if(c < 0) { //go borrow
                    var b; //a coefficient > 0
                    for(var j=i; j<l; j++) {//starting from where we left off
                        if(this.coeffs[j] > 0) {
                            b = this.coeffs[j];
                            break;
                        }
                    }

                    if(b) { //if such a coefficient exists
                        for(j; j>i; j--) { //go down the line and adjust using p
                            this.coeffs[j] = this.coeffs[j].subtract(new Frac(1));
                            this.coeffs[j-1] = this.coeffs[j-1].add(new Frac(p));
                        }
                        c = this.coeffs[i]; //reset c
                    }
                }

                var d = c.mod(p);
                var w = c.subtract(d).divide(p);
                if(!w.equals(0)) {
                    var up_one = i+1;
                    var next = this.coeffs[up_one] || new Frac(0);
                    next = next.add(w);
                    this.coeffs[up_one] = new Frac(next);
                    this.coeffs[i] = new Frac(d);
                }
            }

            return this;
        },
        /**
        * Adds together 2 polynomials
        * @param {Polynomial} poly
        */
        add: function(poly) {
            var l = Math.max(this.coeffs.length, poly.coeffs.length);
            for(var i=0; i<l; i++) {
                var a = (this.coeffs[i] || new Frac(0)),
                    b = (poly.coeffs[i] || new Frac(0));
                this.coeffs[i] = a.add(b);
            }
            return this;
        },
        /**
        * Adds together 2 polynomials
        * @param {Polynomial} poly
        */
        subtract: function(poly) {
            var l = Math.max(this.coeffs.length, poly.coeffs.length);
            for(var i=0; i<l; i++) {
                var a = (this.coeffs[i] || new Frac(0)),
                    b = (poly.coeffs[i] || new Frac(0));
                this.coeffs[i] = a.subtract(b);
            }
            return this;
        },
        divide: function(poly) {
            var variable = this.variable,
                dividend = core.Utils.arrayClone(this.coeffs),
                divisor = core.Utils.arrayClone(poly.coeffs),
                n = dividend.length,
                mp = divisor.length-1,
                quotient = [];

            //loop through the dividend
            for(var i=0; i<n; i++) {
                var p = n-(i+1);
                //get the difference of the powers
                var d = p - mp;
                //get the quotient of the coefficients
                var q = dividend[p].divide(divisor[mp]);

                if(d < 0) break;//the divisor is not greater than the dividend
                //place it in the quotient
                quotient[d] = q;

                for(var j=0; j<=mp; j++) {
                    //reduce the dividend
                    dividend[j+d] = dividend[j+d].subtract((divisor[j].multiply(q)));
                }
            }

            //clean up
            var p1 = Polynomial.fromArray(dividend, variable || 'x').trim(), //pass in x for safety
                p2 = Polynomial.fromArray(quotient, variable || 'x');
            return [p2, p1];
        },
        multiply: function(poly) {
            var l1 = this.coeffs.length, l2 = poly.coeffs.length, 
                c = []; //array to be returned
            for(var i=0; i<l1; i++) {
                var x1 = this.coeffs[i];
                for(var j=0; j<l2; j++) {
                    var k = i+j, //add the powers together
                        x2 = poly.coeffs[j],
                        e = c[k] || new Frac(0); //get the existing term from the new array
                    c[k] = e.add(x1.multiply(x2)); //multiply the coefficients and add to new polynomial array
                }
            }
            this.coeffs = c;
            return this;
        },
        /**
         * Checks if a polynomial is zero
         * @returns {Boolean}
         */
        isZero: function() {
            var l = this.coeffs.length;
            for(var i=0; i<l; i++) {
                var e = this.coeffs[i];
                if(!e.equals(0)) return false;
            }
            return true;
        },
        /** 
         * Substitutes in a number n into the polynomial p(n)
         * @param {Number} n
         * @returns {Frac}
         */
        sub: function(n) {
            var sum = new Frac(0), l=this.coeffs.length;
            for(var i=0; i<l; i++) {
                var t = this.coeffs[i];
                if(!t.equals(0)) sum = sum.add(t.multiply(new Frac(Math.pow(n, i))));
            }
            return sum;
        },
        /**
         * Returns a clone of the polynomial
         * @returns {Polynomial}
         */
        clone: function() {
            var p = new Polynomial();
            p.coeffs = this.coeffs;
            p.variable = this.variable;
            return p;
        },
        /**
         * Gets the degree of the polynomial
         * @returns {Number}
         */
        deg: function() {
            this.trim();
            return this.coeffs.length-1;
        },
        /**
         * Returns a lead coefficient
         * @returns {Frac}
         */
        lc: function() { 
            return this.coeffs[this.deg()].clone();
        },
        /**
         * Converts polynomial into a monic polynomial
         * @returns {Polynomial}
         */
        monic: function() {
            var lc = this.lc(), l = this.coeffs.length; 
            for(var i=0; i<l; i++) this.coeffs[i] = this.coeffs[i].divide(lc);
            return this;
        },
        /**
         * Returns the GCD of two polynomials
         * @param {Polynomial} poly
         * @returns {Polynomial}
         */
        gcd: function(poly) { 
            //get the maximum power of each
            var mp1 = this.coeffs.length-1, 
                mp2 = poly.coeffs.length-1,
                T;
            //swap so we always have the greater power first
            if(mp1 < mp2) {
                return poly.gcd(this);
            }
            var a = this;

            while(!poly.isZero()) {   
                var t = poly.clone(); 
                a = a.clone(); 
                T = a.divide(t);
                poly = T[1]; 
                a = t; 
            }

            var gcd = core.Math2.QGCD.apply(null, a.coeffs);
            if(!gcd.equals(1)) { 
                var l = a.coeffs.length;
                for(var i=0; i<l; i++) {
                    a.coeffs[i] = a.coeffs[i].divide(gcd);
                }
            }
            return a;
        },
        /**
         * Differentiates the polynomial
         * @returns {Polynomial}
         */
        diff: function() {
            var new_array = [], l = this.coeffs.length;
            for(var i=1; i<l; i++) new_array.push(this.coeffs[i].multiply(new Frac(i)));
            this.coeffs = new_array;
            return this;
        },
        /**
         * Integrates the polynomial
         * @returns {Polynomial} 
         */
        integrate: function() {
            var new_array = [0], l = this.coeffs.length;
            for(var i=0; i<l; i++) {
                var c = new Frac(i+1);
                new_array[c] = this.coeffs[i].divide(c);
            }
            this.coeffs = new_array;
            return this;
        },
        /**
         * Returns the Greatest common factor of the polynomial
         * @param {bool} toPolynomial - true if a polynomial is wanted
         * @returns {Frac|Polynomial}
         */
        gcf: function(toPolynomial) {
            //get the first nozero coefficient and returns its power
            var fnz = function(a) {
                    for(var i=0; i<a.length; i++)
                        if(!a[i].equals(0)) return i;
                },
                ca = [];
            for(var i=0; i<this.coeffs.length; i++) {
                var c = this.coeffs[i];
                if(!c.equals(0) && ca.indexOf(c) === -1) ca.push(c);
            }
            var p = [core.Math2.QGCD.apply(undefined, ca), fnz(this.coeffs)].toDecimal(); 

            if(toPolynomial) {
                var parr = [];
                parr[p[1]-1] = p[0];
                p = Polynomial.fromArray(parr, this.variable).fill();
            }

            return p;
        },
        /**
         * Raises a polynomial P to a power p -> P^p. e.g. (x+1)^2
         * @param {bool} incl_img - Include imaginary numbers 
         */
        quad: function(incl_img) {
            var roots = [];
            if(this.coeffs.length > 3) throw new Error('Cannot calculate quadratic order of '+(this.coeffs.length-1));
            if(this.coeffs.length === 0) throw new Error('Polynomial array has no terms');
            var a = this.coeffs[2] || 0, b = this.coeffs[1] || 0, c = this.coeffs[0];
            var dsc = b*b-4*a*c;
            if(dsc < 0 && !incl_img) return roots;
            else {
                roots[0] = (-b+Math.sqrt(dsc))/(2*a);
                roots[1] = (-b-Math.sqrt(dsc))/(2*a);
            }
            return roots;
        },
        /**
         * Makes polynomial square free
         * @returns {Array}
         */
        squareFree: function() { 
            var a = this.clone(),
                i = 1,
                b = a.clone().diff(),
                c = a.clone().gcd(b),
                w = a.divide(c)[0];
            var output = Polynomial.fromArray([new Frac(1)], a.variable);
            while(!c.equalsNumber(1)) { 
                var y = w.gcd(c); 
                var z = w.divide(y)[0];
                //one of the factors may have shown up since it's square but smaller than the 
                //one where finding
                if(!z.equalsNumber(1) && i>1) {
                    var t = z.clone();
                    for(var j=1; j<i; j++)
                        t.multiply(z.clone());
                    z = t;
                }
                output = output.multiply(z); 
                i++;
                w = y;
                c = c.divide(y)[0];
            }
            return [output, w, i];
        },
        /**
         * Converts polynomial to Symbol
         * @returns {Symbol}
         */
        toSymbol: function() {
            var l = this.coeffs.length,
                variable = this.variable;
            if(l === 0) return new core.Symbol(0);
            var end = l -1, str = '';

            for(var i=0; i<l; i++) {
                //place the plus sign for all but the last one
                var plus = i === end ? '' : '+',
                    e = this.coeffs[i];
                if(!e.equals(0)) str += (e+'*'+variable+'^'+i+plus);
            }
            return _.parse(str);
        },
        /**
         * Checks if polynomial is equal to a number
         * @param {Number} x
         * @returns {Boolean}
         */
        equalsNumber: function(x) { 
            this.trim();
            return this.coeffs.length === 1 && this.coeffs[0].toDecimal() === x;
        },
        toString: function() {
            return this.toSymbol().toString();
        }
    };

    /**
    * If the symbols is of group PL or CP it will return the multipliers of each symbol
    * as these are polynomial coefficients. CB symbols are glued together by multiplication
    * so the symbol multiplier carries the coefficients for all contained symbols.
    * For S it just returns it's own multiplier. This function doesn't care if it's a polynomial or not
    * @param {Array} c The coefficient array
    * @param {boolean} with_order 
    * @return {Array}
    */
    Symbol.prototype.coeffs = function(c, with_order) {
        if(with_order && !this.isPoly(true)) _.error('Polynomial expected when requesting coefficients with order');
        c = c || [];
        var s = this.clone().distributeMultiplier(); 
        if(s.isComposite()) {
            for(var x in s.symbols) { 
                var sub = s.symbols[x];
                if(sub.isComposite()) { 
                    sub.clone().distributeMultiplier().coeffs(c, with_order);
                }
                else { 
                    if(with_order) c[sub.isConstant() ? 0 : sub.power.toDecimal()] = sub.multiplier;
                    else c.push(sub.multiplier);
                }
            }
        }
        else { 
            if(with_order) c[s.isConstant() ? 0 : s.power.toDecimal()] = s.multiplier;
            else c.push(s.multiplier);
        }
        //fill the holes
        if(with_order) {
            for(var i=0; i<c.length; i++)
                if(c[i] === undefined) c[i] = new Frac(0);
        }
        return c;
    };
    Symbol.prototype.tBase = function(map) {
        if(typeof map === 'undefined') throw new Error('Symbol.tBase requires a map object!');
        var terms= [];
        var symbols = this.collectSymbols(null, null, null, true),
            l = symbols.length;
        for(var i=0; i<l; i++) {
            var symbol = symbols[i],
                g = symbol.group,
                nterm = new MVTerm(symbol.multiplier, [], map);
            if(g === CB) {
                for(var x in symbol.symbols) {
                    var sym = symbol.symbols[x];
                    nterm.terms[map[x]] = sym.power;
                }
            }
            else {
                nterm.terms[map[symbol.value]] = symbol.power;
            }
            
            terms.push(nterm.fill());
            nterm.updateCount();
        }
        return terms;
    };
    Symbol.prototype.altVar = function(x) {
        var m = this.multiplier.toString(), p = this.power.toString();
        return (m === '1' ? '' : m+'*')+ x + (p === '1' ? '' : '^'+p);
    };
    /**
     * Checks to see if the symbols contain the same variables
     * @param {Symbol} symbol
     * @returns {Boolean}
     */
    Symbol.prototype.sameVars = function(symbol) {
        if(!(this.symbols || this.group === symbol.group)) return false;
        for(var x in this.symbols) {
            var a = this.symbols[x], b = symbol.symbols[x];
            if(!b) return false;
            if(a.value !== b.value) return false;
        }
        return true;
    };
    /**
     * A container class for factors
     * @returns {Factors}
     */
    function Factors() {
        this.factors = {};
    };
    /**
     * Adds the factors to the factor object
     * @param {Symbol} s
     * @returns {Factors}
     */
    Factors.prototype.add = function(s) {
        if(s.equals(0)) return this; //nothing to add
        
        if(s.group === CB) {
            var factors = this;
            s.each(function(x){
                factors.add(x);
            });
        }
        else {
            if(this.preAdd) //if a preAdd function was defined call it to do prep
                s = this.preAdd(s);
            if(this.pFactor) //if the symbol isn't linear add back the power
                s = _.pow(s, new Symbol(this.pFactor));

            var is_constant = s.isConstant();
            if(is_constant && s.equals(1)) return this; //don't add 1
            var v = is_constant ? s.value: s.text();
            if(v in this.factors) 
                this.factors[v] = _.multiply(this.factors[v], s);
            else this.factors[v] = s;
        }
        return this;
    };
    /**
     * Converts the factor object to a Symbol
     * @returns {Symbol}
     */
    Factors.prototype.toSymbol = function() {
        var factored = new Symbol(1);
        for(var x in this.factors) {
            var factor = this.factors[x].power.equals(1) ? 
                _.symfunction(core.PARENTHESIS, [this.factors[x]]) : this. factors[x];
            factored = _.multiply(factored, factor);
        }
        return factored;
    };
    /**
     * Merges 2 factor objects into one
     * @param {Factor} o
     * @returns {Factors}
     */
    Factors.prototype.merge = function(o) {
        for(var x in o) {
            if(x in this.factors) 
                this.factors[x] = _.multiply(this.factors[x], o[x]);
            else this.factors[x] = o[x];
        }
        return this;
    };
    /**
     * The iterator for the factor object
     * @param {Function} f - callback
     * @returns {Factor}
     */
    Factors.prototype.each = function(f) {
        for(var x in this.factors) {
            var factor = this.factors[x];
            if(factor.fname === core.PARENTHESIS && factor.isLinear())
                factor = factor.args[0];
            f.call(this, factor, x);
        }
        return this;
    };
    /**
     * Return the number of factors contained in the factor object
     * @returns {int}
     */
    Factors.prototype.count = function() {
        return keys(this.factors).length;
    };
    Factors.prototype.toString = function() {
        return this.toSymbol().toString();
    };
    
    //a wrapper for performing multivariate division
    function MVTerm(coeff, terms, map) {
        this.terms = terms || [];
        this.coeff = coeff;
        this.map = map; //careful! all maps are the same object
        this.sum = new core.Frac(0);
        this.image = undefined;
    };
    MVTerm.prototype.updateCount = function() {
        this.count = this.count || 0;
        for(var i=0; i<this.terms.length; i++) {
            if(!this.terms[i].equals(0)) this.count++;
        }
        return this;
    };
    MVTerm.prototype.getVars = function() {
        var vars = [];
        for(var i=0; i<this.terms.length; i++) {
            var term = this.terms[i],
                rev_map = this.getRevMap();
            if(!term.equals(0)) vars.push(this.rev_map[i]);
        }
        return vars.join(' ');
    };
    MVTerm.prototype.len = function() {
        if(typeof this.count === 'undefined') {
            this.updateCount();
        }
        return this.count;
    };
    MVTerm.prototype.toSymbol = function(rev_map) {
        rev_map = rev_map || this.getRevMap();
        var symbol = new Symbol(this.coeff); 
        for(var i=0; i<this.terms.length; i++) {
            var v = rev_map[i],
                t = this.terms[i];
            if(t.equals(0) || v === CONST_HASH) continue;
            var mapped = new Symbol(v);
            mapped.power = t;
            symbol = _.multiply(symbol, mapped);
        }
        return symbol;
    };
    MVTerm.prototype.getRevMap = function() {
        if(this.rev_map) return this.rev_map;
        var o = {};
        for(var x in this.map) o[this.map[x]] = x;
        this.rev_map = o;
        return o;
    };
    MVTerm.prototype.generateImage = function() {
        this.image = this.terms.join(' ');
        return this;
    },
    MVTerm.prototype.getImg = function() {
        if(!this.image) this.generateImage();
        return this.image;
    },
    MVTerm.prototype.fill = function() {
        var l = this.map.length;
        for(var i=0; i<l; i++) {
            if(typeof this.terms[i] === 'undefined') this.terms[i] = new core.Frac(0);
            else {
                this.sum = this.sum.add(this.terms[i]);
            }
        }
        return this;
    };
    MVTerm.prototype.divide = function(mvterm) {
        var c = this.coeff.divide(mvterm.coeff),
            l = this.terms.length,
            new_mvterm = new MVTerm(c, [], this.map);
        for(var i=0; i<l; i++) {
            new_mvterm.terms[i] = this.terms[i].subtract(mvterm.terms[i]);
            new_mvterm.sum = new_mvterm.sum.add(new_mvterm.terms[i]);
        }
        return new_mvterm;
    };
    MVTerm.prototype.multiply = function(mvterm) {
        var c = this.coeff.multiply(mvterm.coeff),
            l = this.terms.length,
            new_mvterm = new MVTerm(c, [], this.map);
        for(var i=0; i<l; i++) {
            new_mvterm.terms[i] = this.terms[i].add(mvterm.terms[i]);
            new_mvterm.sum = new_mvterm.sum.add(new_mvterm.terms[i]);
        }
        return new_mvterm;
    };
    MVTerm.prototype.isZero = function() {
        return this.coeff.equals(0);
    };
    MVTerm.prototype.toString = function() {
        return '{ coeff: '+this.coeff.toString()+', terms: ['+
                this.terms.join(',')+']: sum: '+this.sum.toString()+', count: '+this.count+'}';
    };
    
    core.Utils.toMapObj = function(arr) {
        var c = 0, o = {};
        for(var i=0; i<arr.length; i++) {
            var v = arr[i];
            if(typeof o[v] === 'undefined') {
                o[v] = c; c++;
            }
        }
        o.length = c;
        return o;
    };
    core.Utils.filledArray = function(v, n, clss) {
        var a = [];
        while (n--) {
          a[n] = clss ? new clss(v) : v;
        }
        return a;
    };
    core.Utils.arrSum = function(arr) {
        var sum = 0, l = arr.length;
        for(var i=0; i<l; i++) sum += arr[i];
        return sum;
    };
    /**
     * Substitutes out functions as variables so they can be used in regular algorithms
     * @param {Symbol} symbol
     * @param {Object} map
     * @returns {String} The expression string
     */
    core.Utils.subFunctions = function(symbol, map) {
        map = map || {};
        var subbed = [];
        symbol.each(function(x) {
            if(x.group === FN || x.previousGroup === FN) {
                //we need a new variable name so why not use one of the existing
                var val = core.Utils.text(x, 'hash'), tvar = map[val];
                if(!tvar) {
                    //generate a unique enough name
                    var t = x.fname+keys(map).length;
                    map[val] = t;
                    subbed.push(x.altVar(t));
                }
                else subbed.push(x.altVar(tvar));
            }
            else if(x.group === CB || x.group === PL || x.group === CP) {
                subbed.push(core.Utils.subFunctions(x, map));
            }
            else subbed.push(x.text());
        });
        if(symbol.group === CP || symbol.group === PL) return symbol.altVar(core.Utils.inBrackets(subbed.join('+')));;
        if(symbol.group === CB) return symbol.altVar(core.Utils.inBrackets(subbed.join('*')));
        return symbol.text();
    };
    core.Utils.getFunctionsSubs = function(map) {
        var subs = {};
        //prepare substitutions
        for(var x in map) subs[map[x]] = _.parse(x);
        return subs;
    };
    var __ = core.Algebra = {
        version: '1.4.0',
        init: (function() {})(),
        proots: function(symbol, decp) { 
            //the roots will be rounded up to 7 decimal places.
            //if this causes trouble you can explicitly pass in a different number of places
            //rarr for polynomial of power n is of format [n, coeff x^n, coeff x^(n-1), ..., coeff x^0]
            decp = decp || 7;
            var zeros = 0;
            var get_roots = function(rarr, powers, max) {
                var roots = calcroots(rarr, powers, max);
                for(var i=0;i<zeros;i++) roots.unshift(0);
                return roots;
            };
            
            if(symbol instanceof Symbol && symbol.isPoly()) { 
                if(symbol.group === core.groups.S) { 
                    return [0];
                }
                else if(symbol.group === core.groups.PL) { 
                    var powers = keys(symbol.symbols),
                        minpower = core.Utils.arrayMin(powers),
                    symbol = core.PARSER.divide(symbol, core.PARSER.parse(symbol.value+'^'+minpower));
                }

                var variable = keys(symbol.symbols).sort().pop(), 
                    sym = symbol.group === core.groups.PL ? symbol.symbols : symbol.symbols[variable], 
                    g = sym.group,
                    powers = g === S ? [sym.power.toDecimal()] : keys(sym.symbols),
                    rarr = [],
                    max = core.Utils.arrayMax(powers); //maximum power and degree of polynomial to be solved

                // Prepare the data
                for(var i=1; i<=max; i++) { 
                    var c = 0; //if there is no power then the hole must be filled with a zero
                    if(powers.indexOf(i+'') !== -1) { 
                        if(g === S) { 
                            c = sym.multiplier; 
                        }
                        else {
                            c = sym.symbols[i].multiplier;
                        }
                    }
                    // Insert the coeffient but from the front
                    rarr.unshift(c);
                }

                rarr.push(symbol.symbols['#'].multiplier);

                if(sym.group === S) rarr[0] = sym.multiplier;//the symbol maybe of group CP with one variable

                return get_roots(rarr, powers, max);
            }
            else if(core.Utils.isArray(symbol)) {
                var parr = symbol;
                var rarr = [],
                    powers = [],
                    last_power = 0;
                for(var i=0; i<parr.length; i++) {
                    
                    var coeff = parr[i][0],
                        pow = parr[i][1],
                        d = pow - last_power - 1;
                    //insert the zeros
                    for(var j=0; j<d; j++) rarr.unshift(0);
                    
                    rarr.unshift(coeff);
                    if(pow !== 0) powers.push(pow);
                    last_power = pow;
                }
                var max = Math.max.apply(undefined, powers);

                return get_roots(rarr, powers, max);
            }
            else {
                throw new Error('Cannot calculate roots. Symbol must be a polynomial!');
            }

            function calcroots(rarr, powers, max){	
                var MAXDEGREE = 100; // Degree of largest polynomial accepted by this script.

                // Make a clone of the coefficients before appending the max power
                var p = rarr.slice(0);

                // Divide the string up into its individual entries, which--presumably--are separated by whitespace
                rarr.unshift(max);

                if (max > MAXDEGREE){
                    throw new Error("This utility accepts polynomials of degree up to " + MAXDEGREE + ". ");
                }

                var zeroi = [],   // Vector of imaginary components of roots
                    degreePar = {};    // degreePar is a dummy variable for passing the parameter POLYDEGREE by reference
                degreePar.Degree = max; 

                for (i = 0; i < max; i++) {
                    zeroi.push(0);
                }
                var zeror = zeroi.slice(0); // Vector of real components of roots

                // Find the roots
                //--> Begin Jenkins-Traub

                /*
                 * A verbatim copy of Mr. David Binner's Jenkins-Traub port
                */
               function QuadSD_ak1(NN, u, v, p, q, iPar){
                   // Divides p by the quadratic 1, u, v placing the quotient in q and the remainder in a, b
                   // iPar is a dummy variable for passing in the two parameters--a and b--by reference
                   q[0] = iPar.b = p[0];
                   q[1] = iPar.a = -(u*iPar.b) + p[1];

                   for (var i = 2; i < NN; i++){
                       q[i] = -(u*iPar.a + v*iPar.b) + p[i];
                       iPar.b = iPar.a;
                       iPar.a = q[i];
                   } 
                   return;
               } 

               function calcSC_ak1(DBL_EPSILON, N, a, b, iPar, K, u, v, qk){
                   // This routine calculates scalar quantities used to compute the next K polynomial and
                   // new estimates of the quadratic coefficients.
                   // calcSC -	integer variable set here indicating how the calculations are normalized
                   // to avoid overflow.
                   // iPar is a dummy variable for passing in the nine parameters--a1, a3, a7, c, d, e, f, g, and h --by reference

                   // sdPar is a dummy variable for passing the two parameters--c and d--into QuadSD_ak1 by reference
                   var sdPar = new Object(),    
                   // TYPE = 3 indicates the quadratic is almost a factor of K
                       dumFlag = 3;	

                   // Synthetic division of K by the quadratic 1, u, v
                   sdPar.b =  sdPar.a = 0.0;
                   QuadSD_ak1(N, u, v, K, qk, sdPar);
                   iPar.c = sdPar.a;
                   iPar.d = sdPar.b;

                   if (Math.abs(iPar.c) <= (100.0*DBL_EPSILON*Math.abs(K[N - 1]))) {
                       if (Math.abs(iPar.d) <= (100.0*DBL_EPSILON*Math.abs(K[N - 2])))  return dumFlag;
                   } 

                   iPar.h = v*b;
                   if (Math.abs(iPar.d) >= Math.abs(iPar.c)){
                         // TYPE = 2 indicates that all formulas are divided by d
                       dumFlag = 2;		
                       iPar.e = a/(iPar.d);
                       iPar.f = (iPar.c)/(iPar.d);
                       iPar.g = u*b;
                       iPar.a3 = (iPar.e)*((iPar.g) + a) + (iPar.h)*(b/(iPar.d));
                       iPar.a1 = -a + (iPar.f)*b;
                       iPar.a7 = (iPar.h) + ((iPar.f) + u)*a;
                   } 
                   else {
                       // TYPE = 1 indicates that all formulas are divided by c;
                       dumFlag = 1;		
                       iPar.e = a/(iPar.c);
                       iPar.f = (iPar.d)/(iPar.c);
                       iPar.g = (iPar.e)*u;
                       iPar.a3 = (iPar.e)*a + ((iPar.g) + (iPar.h)/(iPar.c))*b;
                       iPar.a1 = -(a*((iPar.d)/(iPar.c))) + b;
                       iPar.a7 = (iPar.g)*(iPar.d) + (iPar.h)*(iPar.f) + a;
                   } 
                   return dumFlag;
               } 

               function nextK_ak1(DBL_EPSILON, N, tFlag, a, b, iPar, K, qk, qp){
                   // Computes the next K polynomials using the scalars computed in calcSC_ak1
                   // iPar is a dummy variable for passing in three parameters--a1, a3, and a7
                   var temp;
                   if (tFlag == 3){	// Use unscaled form of the recurrence
                       K[1] = K[0] = 0.0;
                       for (var i = 2; i < N; i++)	 { K[i] = qk[i - 2]; }
                       return;
                   } 

                   temp = ((tFlag == 1) ? b : a);
                   if (Math.abs(iPar.a1) > (10.0*DBL_EPSILON*Math.abs(temp))){
                       // Use scaled form of the recurrence
                       iPar.a7 /= iPar.a1;
                       iPar.a3 /= iPar.a1;
                       K[0] = qp[0];
                       K[1] = -(qp[0]*iPar.a7) + qp[1];
                       for (var i = 2; i < N; i++)	 K[i] = -(qp[i - 1]*iPar.a7) + qk[i - 2]*iPar.a3 + qp[i];
                   } 
                   else {
                       // If a1 is nearly zero, then use a special form of the recurrence
                       K[0] = 0.0;
                       K[1] = -(qp[0]*iPar.a7);
                       for (var i = 2; i < N; i++) { K[i] = -(qp[i - 1]*iPar.a7) + qk[i - 2]*iPar.a3; }
                   } 
                   return;
               }

               function newest_ak1(tFlag, iPar, a, a1, a3, a7, b, c, d, f, g, h, u, v, K, N, p){
                   // Compute new estimates of the quadratic coefficients using the scalars computed in calcSC_ak1
                   // iPar is a dummy variable for passing in the two parameters--uu and vv--by reference
                   // iPar.a = uu, iPar.b = vv

                   var a4, a5, b1, b2, c1, c2, c3, c4, temp;
                   iPar.b = iPar.a = 0.0;// The quadratic is zeroed

                   if (tFlag != 3){
                       if (tFlag != 2){
                           a4 = a + u*b + h*f;
                           a5 = c + (u + v*f)*d;
                       } 
                       else { 
                           a4 = (a + g)*f + h;
                           a5 = (f + u)*c + v*d;
                       } 

                       // Evaluate new quadratic coefficients
                       b1 = -(K[N - 1]/p[N]);
                       b2 = -(K[N - 2] + b1*p[N - 1])/p[N];
                       c1 = v*b2*a1;
                       c2 = b1*a7;
                       c3 = b1*b1*a3;
                       c4 = -(c2 + c3) + c1;
                       temp = -c4 + a5 + b1*a4;
                       if (temp != 0.0) {
                           iPar.a = -((u*(c3 + c2) + v*(b1*a1 + b2*a7))/temp) + u;
                           iPar.b = v*(1.0 + c4/temp);
                       } 
                   } 
                   return;
               } 

               function Quad_ak1(a, b1, c, iPar){
                   // Calculates the zeros of the quadratic a*Z^2 + b1*Z + c
                   // The quadratic formula, modified to avoid overflow, is used to find the larger zero if the
                   // zeros are real and both zeros are complex. The smaller real zero is found directly from
                   // the product of the zeros c/a.

                   // iPar is a dummy variable for passing in the four parameters--sr, si, lr, and li--by reference

                   var b, d, e;
                   iPar.sr = iPar.si = iPar.lr = iPar.li = 0.0;

                   if (a == 0) {
                       iPar.sr = ((b1 != 0) ? -(c/b1) : iPar.sr);
                       return;
                   } 
                   if (c == 0){
                       iPar.lr = -(b1/a);
                       return;
                   } 

                   // Compute discriminant avoiding overflow
                   b = b1/2.0;
                   if (Math.abs(b) < Math.abs(c)){
                       e = ((c >= 0) ? a : -a);
                       e = -e + b*(b/Math.abs(c));
                       d = Math.sqrt(Math.abs(e))*Math.sqrt(Math.abs(c));
                   } 
                   else { 
                       e = -((a/b)*(c/b)) + 1.0;
                       d = Math.sqrt(Math.abs(e))*(Math.abs(b));
                   } 

                   if (e >= 0) {
                       // Real zeros
                       d = ((b >= 0) ? -d : d);
                       iPar.lr = (-b + d)/a;
                       iPar.sr = ((iPar.lr != 0) ? (c/(iPar.lr))/a : iPar.sr);
                   }
                   else { 
                       // Complex conjugate zeros
                       iPar.lr = iPar.sr = -(b/a);
                       iPar.si = Math.abs(d/a);
                       iPar.li = -(iPar.si);
                   } 
                   return;
               }  

               function QuadIT_ak1(DBL_EPSILON, N, iPar, uu, vv, qp, NN, sdPar, p, qk, calcPar, K){
                   // Variable-shift K-polynomial iteration for a quadratic factor converges only if the
                   // zeros are equimodular or nearly so.
                   // iPar is a dummy variable for passing in the five parameters--NZ, lzi, lzr, szi, and szr--by reference
                   // sdPar is a dummy variable for passing the two parameters--a and b--in by reference
                   // calcPar is a dummy variable for passing the nine parameters--a1, a3, a7, c, d, e, f, g, and h --in by reference

                   // qPar is a dummy variable for passing the four parameters--szr, szi, lzr, and lzi--into Quad_ak1 by reference
                   var qPar = new Object(),    
                       ee, mp, omp, relstp, t, u, ui, v, vi, zm,
                       i, j = 0, tFlag, triedFlag = 0;   // Integer variables

                   iPar.NZ = 0;// Number of zeros found
                   u = uu; // uu and vv are coefficients of the starting quadratic
                   v = vv;

                   do {
                       qPar.li = qPar.lr =  qPar.si = qPar.sr = 0.0;
                       Quad_ak1(1.0, u, v, qPar);
                       iPar.szr = qPar.sr;
                       iPar.szi = qPar.si;
                       iPar.lzr = qPar.lr;
                       iPar.lzi = qPar.li;

                       // Return if roots of the quadratic are real and not close to multiple or nearly
                       // equal and of opposite sign.
                       if (Math.abs(Math.abs(iPar.szr) - Math.abs(iPar.lzr)) > 0.01*Math.abs(iPar.lzr))  break;

                       // Evaluate polynomial by quadratic synthetic division

                       QuadSD_ak1(NN, u, v, p, qp, sdPar);

                       mp = Math.abs(-((iPar.szr)*(sdPar.b)) + (sdPar.a)) + Math.abs((iPar.szi)*(sdPar.b));

                       // Compute a rigorous bound on the rounding error in evaluating p

                       zm = Math.sqrt(Math.abs(v));
                       ee = 2.0*Math.abs(qp[0]);
                       t = -((iPar.szr)*(sdPar.b));

                       for (i = 1; i < N; i++)  { ee = ee*zm + Math.abs(qp[i]); }

                       ee = ee*zm + Math.abs(t + sdPar.a);
                       ee = (9.0*ee + 2.0*Math.abs(t) - 7.0*(Math.abs((sdPar.a) + t) + zm*Math.abs((sdPar.b))))*DBL_EPSILON;

                       // Iteration has converged sufficiently if the polynomial value is less than 20 times this bound
                       if (mp <= 20.0*ee){
                           iPar.NZ = 2;
                           break;
                       } 

                       j++;
                       // Stop iteration after 20 steps
                       if (j > 20)  break;
                       if (j >= 2){
                           if ((relstp <= 0.01) && (mp >= omp) && (!triedFlag)){
                               // A cluster appears to be stalling the convergence. Five fixed shift
                               // steps are taken with a u, v close to the cluster.
                               relstp = ((relstp < DBL_EPSILON) ? Math.sqrt(DBL_EPSILON) : Math.sqrt(relstp));
                               u -= u*relstp;
                               v += v*relstp;

                               QuadSD_ak1(NN, u, v, p, qp, sdPar);
                               for (i = 0; i < 5; i++){
                                   tFlag = calcSC_ak1(DBL_EPSILON, N, sdPar.a, sdPar.b, calcPar, K, u, v, qk);
                                   nextK_ak1(DBL_EPSILON, N, tFlag, sdPar.a, sdPar.b, calcPar, K, qk, qp);
                               } 

                               triedFlag = 1;
                               j = 0;

                           } 
                       }
                       omp = mp;

                       // Calculate next K polynomial and new u and v
                       tFlag = calcSC_ak1(DBL_EPSILON, N, sdPar.a, sdPar.b, calcPar, K, u, v, qk);
                       nextK_ak1(DBL_EPSILON, N, tFlag, sdPar.a, sdPar.b, calcPar, K, qk, qp);
                       tFlag = calcSC_ak1(DBL_EPSILON, N, sdPar.a, sdPar.b, calcPar, K, u, v, qk);
                       newest_ak1(tFlag, sdPar, sdPar.a, calcPar.a1, calcPar.a3, calcPar.a7, sdPar.b, calcPar.c, calcPar.d, calcPar.f, calcPar.g, calcPar.h, u, v, K, N, p);
                       ui = sdPar.a;
                       vi = sdPar.b;

                       // If vi is zero, the iteration is not converging
                       if (vi != 0){
                           relstp = Math.abs((-v + vi)/vi);
                           u = ui;
                           v = vi;
                       } 
                   } while (vi != 0); 
                   return;
               } 

               function RealIT_ak1(DBL_EPSILON, iPar, sdPar, N, p, NN, qp, K, qk){
                   // Variable-shift H-polynomial iteration for a real zero
                   // sss	- starting iterate = sdPar.a
                   // NZ		- number of zeros found = iPar.NZ
                   // dumFlag	- flag to indicate a pair of zeros near real axis, returned to iFlag

                   var ee, kv, mp, ms, omp, pv, s, t,
                       dumFlag, i, j, nm1 = N - 1;   // Integer variables

                   iPar.NZ = j = dumFlag = 0;
                   s = sdPar.a;

                   for ( ; ; ) {
                       pv = p[0];

                       // Evaluate p at s
                       qp[0] = pv;
                       for (i = 1; i < NN; i++)  { qp[i] = pv = pv*s + p[i]; }
                       mp = Math.abs(pv);

                       // Compute a rigorous bound on the error in evaluating p
                       ms = Math.abs(s);
                       ee = 0.5*Math.abs(qp[0]);
                       for (i = 1; i < NN; i++)  { ee = ee*ms + Math.abs(qp[i]); }

                       // Iteration has converged sufficiently if the polynomial value is less than
                       // 20 times this bound
                       if (mp <= 20.0*DBL_EPSILON*(2.0*ee - mp)){
                           iPar.NZ = 1;
                           iPar.szr = s;
                           iPar.szi = 0.0;
                           break;
                       } 
                       j++;
                       // Stop iteration after 10 steps
                       if (j > 10)  break;

                       if (j >= 2){
                           if ((Math.abs(t) <= 0.001*Math.abs(-t + s)) && (mp > omp)){
                               // A cluster of zeros near the real axis has been encountered.
                               // Return with iFlag set to initiate a quadratic iteration.
                               dumFlag = 1;
                               iPar.a = s;
                               break;
                           } // End if ((fabs(t) <= 0.001*fabs(s - t)) && (mp > omp))
                       } //End if (j >= 2)

                       // Return if the polynomial value has increased significantly
                       omp = mp;

                       // Compute t, the next polynomial and the new iterate
                       qk[0] = kv = K[0];
                       for (i = 1; i < N; i++)	 { qk[i] = kv = kv*s + K[i]; }

                       if (Math.abs(kv) > Math.abs(K[nm1])*10.0*DBL_EPSILON){
                           // Use the scaled form of the recurrence if the value of K at s is non-zero
                           t = -(pv/kv);
                           K[0] = qp[0];
                           for (i = 1; i < N; i++) { K[i] = t*qk[i - 1] + qp[i]; }
                       }
                       else { 
                           // Use unscaled form
                           K[0] = 0.0;
                           for (i = 1; i < N; i++)	 K[i] = qk[i - 1];
                       }

                       kv = K[0];
                       for (i = 1; i < N; i++) { kv = kv*s + K[i]; }
                       t = ((Math.abs(kv) > (Math.abs(K[nm1])*10.0*DBL_EPSILON)) ? -(pv/kv) : 0.0);
                       s += t;
                   } 
                   return dumFlag;
               } 

               function Fxshfr_ak1(DBL_EPSILON, MDP1, L2, sr, v, K, N, p, NN, qp, u, iPar){

                   // Computes up to L2 fixed shift K-polynomials, testing for convergence in the linear or
                   // quadratic case. Initiates one of the variable shift iterations and returns with the
                   // number of zeros found.
                   // L2	limit of fixed shift steps
                   // iPar is a dummy variable for passing in the five parameters--NZ, lzi, lzr, szi, and szr--by reference
                   // NZ	number of zeros found
                   var sdPar = new Object(),    // sdPar is a dummy variable for passing the two parameters--a and b--into QuadSD_ak1 by reference
                       calcPar = new Object(),
                       // calcPar is a dummy variable for passing the nine parameters--a1, a3, a7, c, d, e, f, g, and h --into calcSC_ak1 by reference

                       qk = new Array(MDP1),
                       svk = new Array(MDP1),
                       a, b, betas, betav, oss, ots, otv, ovv, s, ss, ts, tss, tv, tvv, ui, vi, vv,
                       fflag, i, iFlag = 1, j, spass, stry, tFlag, vpass, vtry;     // Integer variables

                   iPar.NZ = 0;
                   betav = betas = 0.25;
                   oss = sr;
                   ovv = v;

                   //Evaluate polynomial by synthetic division
                   sdPar.b =  sdPar.a = 0.0;
                   QuadSD_ak1(NN, u, v, p, qp, sdPar);
                   a = sdPar.a;
                   b = sdPar.b;
                   calcPar.h = calcPar.g = calcPar.f = calcPar.e = calcPar.d = calcPar.c = calcPar.a7 = calcPar.a3 = calcPar.a1 = 0.0;
                   tFlag = calcSC_ak1(DBL_EPSILON, N, a, b, calcPar, K, u, v, qk);

                   for (j = 0; j < L2; j++){
                       fflag = 1;

                       // Calculate next K polynomial and estimate v
                       nextK_ak1(DBL_EPSILON, N, tFlag, a, b, calcPar, K, qk, qp);
                       tFlag = calcSC_ak1(DBL_EPSILON, N, a, b, calcPar, K, u, v, qk);

                       // Use sdPar for passing in uu and vv instead of defining a brand-new variable.
                       // sdPar.a = ui, sdPar.b = vi
                       newest_ak1(tFlag, sdPar, a, calcPar.a1, calcPar.a3, calcPar.a7, b, calcPar.c, calcPar.d, calcPar.f, calcPar.g, calcPar.h, u, v, K, N, p);
                       ui = sdPar.a;
                       vv = vi = sdPar.b;

                       // Estimate s
                       ss = ((K[N - 1] != 0.0) ? -(p[N]/K[N - 1]) : 0.0);
                       ts = tv = 1.0;

                       if ((j != 0) && (tFlag != 3)){
                           // Compute relative measures of convergence of s and v sequences
                           tv = ((vv != 0.0) ? Math.abs((vv - ovv)/vv) : tv);
                           ts = ((ss != 0.0) ? Math.abs((ss - oss)/ss) : ts);

                           // If decreasing, multiply the two most recent convergence measures
                           tvv = ((tv < otv) ? tv*otv : 1.0);
                           tss = ((ts < ots) ? ts*ots : 1.0);

                           // Compare with convergence criteria
                           vpass = ((tvv < betav) ? 1 : 0);
                           spass = ((tss < betas) ? 1 : 0);

                           if ((spass) || (vpass)){

                               // At least one sequence has passed the convergence test.
                               // Store variables before iterating

                               for (i = 0; i < N; i++) { svk[i] = K[i]; }
                               s = ss;

                               // Choose iteration according to the fastest converging sequence

                                 stry = vtry = 0;

                               for ( ; ; ) {
                                   if ((fflag && ((fflag = 0) == 0)) && ((spass) && (!vpass || (tss < tvv)))){
                                       ;// Do nothing. Provides a quick "short circuit".
                                   } 
                                   else { 
                                       QuadIT_ak1(DBL_EPSILON, N, iPar, ui, vi, qp, NN, sdPar, p, qk, calcPar, K);
                                       a = sdPar.a;
                                       b = sdPar.b;

                                       if ((iPar.NZ) > 0) return;

                                       // Quadratic iteration has failed. Flag that it has been tried and decrease the
                                       // convergence criterion
                                       iFlag = vtry = 1;
                                       betav *= 0.25;

                                       // Try linear iteration if it has not been tried and the s sequence is converging
                                       if (stry || (!spass)){
                                           iFlag = 0;
                                       }
                                       else {
                                           for (i = 0; i < N; i++) K[i] = svk[i];
                                       } 
                                   }
                                   //fflag = 0;
                                   if (iFlag != 0){
                                       // Use sdPar for passing in s instead of defining a brand-new variable.
                                       // sdPar.a = s
                                       sdPar.a = s;
                                       iFlag = RealIT_ak1(DBL_EPSILON, iPar, sdPar, N, p, NN, qp, K, qk);
                                       s = sdPar.a;

                                       if ((iPar.NZ) > 0) return;

                                       // Linear iteration has failed. Flag that it has been tried and decrease the
                                       // convergence criterion
                                       stry = 1;
                                       betas *= 0.25;

                                       if (iFlag != 0){
                                           // If linear iteration signals an almost double real zero, attempt quadratic iteration
                                           ui = -(s + s);
                                           vi = s*s;
                                           continue;

                                       } 
                                   } 

                                   // Restore variables
                                   for (i = 0; i < N; i++) K[i] = svk[i];

                                   // Try quadratic iteration if it has not been tried and the v sequence is converging
                                   if (!vpass || vtry) break;		// Break out of infinite for loop

                               } 

                               // Re-compute qp and scalar values to continue the second stage

                               QuadSD_ak1(NN, u, v, p, qp, sdPar);
                               a = sdPar.a;
                               b = sdPar.b;

                               tFlag = calcSC_ak1(DBL_EPSILON, N, a, b, calcPar, K, u, v, qk);
                           } 
                       } 
                       ovv = vv;
                       oss = ss;
                       otv = tv;
                       ots = ts;
                   } 
                   return;
               }  

               function rpSolve(degPar, p, zeror, zeroi){ 
                   var N = degPar.Degree,
                       RADFAC = 3.14159265358979323846/180,  // Degrees-to-radians conversion factor = PI/180
                       LB2 = Math.LN2,// Dummy variable to avoid re-calculating this value in loop below
                       MDP1 = degPar.Degree + 1,
                       K = new Array(MDP1),
                       pt = new Array(MDP1),
                       qp = new Array(MDP1),
                       temp = new Array(MDP1),
                       // qPar is a dummy variable for passing the four parameters--sr, si, lr, and li--by reference
                       qPar = new Object(),
                       // Fxshfr_Par is a dummy variable for passing parameters by reference : NZ, lzi, lzr, szi, szr);
                       Fxshfr_Par = new Object(),
                       bnd, DBL_EPSILON, df, dx, factor, ff, moduli_max, moduli_min, sc, x, xm,
                       aa, bb, cc, sr, t, u, xxx,
                       j, jj, l, NM1, NN, zerok;// Integer variables

                   // Calculate the machine epsilon and store in the variable DBL_EPSILON.
                   // To calculate this value, just use existing variables rather than create new ones that will be used only for this code block
                   aa = 1.0;
                   do {
                       DBL_EPSILON = aa;
                       aa /= 2;
                       bb = 1.0 + aa;
                   } while (bb > 1.0);

                   var LO = Number.MIN_VALUE/DBL_EPSILON,
                       cosr = Math.cos(94.0*RADFAC),// = -0.069756474
                       sinr = Math.sin(94.0*RADFAC),// = 0.99756405
                       xx = Math.sqrt(0.5),// = 0.70710678
                       yy = -xx;

                   Fxshfr_Par.NZ = j = 0;
                   Fxshfr_Par.szr = Fxshfr_Par.szi =  Fxshfr_Par.lzr = Fxshfr_Par.lzi = 0.0;

                   // Remove zeros at the origin, if any
                   while (p[N] == 0){
                       zeror[j] = zeroi[j] = 0;
                       N--;
                       j++;
                   }
                   NN = N + 1;

                   // >>>>> Begin Main Loop <<<<<
                   while (N >= 1){ // Main loop
                       // Start the algorithm for one zero
                       if (N <= 2){
                           // Calculate the final zero or pair of zeros
                           if (N < 2){
                               zeror[degPar.Degree - 1] = -(p[1]/p[0]);
                               zeroi[degPar.Degree - 1] = 0;
                           } 
                           else { 
                               qPar.li = qPar.lr =  qPar.si = qPar.sr = 0.0;
                               Quad_ak1(p[0], p[1], p[2], qPar);
                               zeror[degPar.Degree - 2] = qPar.sr;
                               zeroi[degPar.Degree - 2] = qPar.si;
                               zeror[degPar.Degree - 1] = qPar.lr;
                               zeroi[degPar.Degree - 1] = qPar.li;
                           } 
                             break;
                       } 

                       // Find the largest and smallest moduli of the coefficients
                       moduli_max = 0.0;
                       moduli_min = Number.MAX_VALUE;

                       for (i = 0; i < NN; i++){
                           x = Math.abs(p[i]);
                           if (x > moduli_max) moduli_max = x;
                           if ((x != 0) && (x < moduli_min)) moduli_min = x;
                       }

                       // Scale if there are large or very small coefficients
                       // Computes a scale factor to multiply the coefficients of the polynomial. The scaling
                       // is done to avoid overflow and to avoid undetected underflow interfering with the
                       // convergence criterion.
                       // The factor is a power of the base.
                       sc = LO/moduli_min;

                       if (((sc <= 1.0) && (moduli_max >= 10)) || ((sc > 1.0) && (Number.MAX_VALUE/sc >= moduli_max))){
                           sc = ((sc == 0) ? Number.MIN_VALUE : sc);
                           l = Math.floor(Math.log(sc)/LB2 + 0.5);
                           factor = Math.pow(2.0, l);
                           if (factor != 1.0){
                               for (i = 0; i < NN; i++) p[i] *= factor;
                           } 
                       } 

                       // Compute lower bound on moduli of zeros
                       for (var i = 0; i < NN; i++) pt[i] = Math.abs(p[i]);
                       pt[N] = -(pt[N]);
                       NM1 = N - 1;

                       // Compute upper estimate of bound
                       x = Math.exp((Math.log(-pt[N]) - Math.log(pt[0]))/N);

                       if (pt[NM1] != 0) {
                           // If Newton step at the origin is better, use it
                           xm = -pt[N]/pt[NM1];
                           x = ((xm < x) ? xm : x);
                       } 

                       // Chop the interval (0, x) until ff <= 0
                       xm = x;
                       do {
                           x = xm;
                           xm = 0.1*x;
                           ff = pt[0];
                           for (var i = 1; i < NN; i++) { ff = ff *xm + pt[i]; }
                       } while (ff > 0); // End do-while loop

                       dx = x;
                       // Do Newton iteration until x converges to two decimal places

                       do {
                           df = ff = pt[0];
                           for (var i = 1; i < N; i++){
                               ff = x*ff + pt[i];
                               df = x*df + ff;
                           } // End for i
                           ff = x*ff + pt[N];
                           dx = ff/df;
                           x -= dx;
                       } while (Math.abs(dx/x) > 0.005); // End do-while loop

                       bnd = x;

                       // Compute the derivative as the initial K polynomial and do 5 steps with no shift
                       for (var i = 1; i < N; i++) K[i] = (N - i)*p[i]/N;
                       K[0] = p[0];
                       aa = p[N];
                       bb = p[NM1];
                       zerok = ((K[NM1] == 0) ? 1 : 0);

                       for (jj = 0; jj < 5; jj++) {
                           cc = K[NM1];
                               if (zerok){
                                   // Use unscaled form of recurrence
                                   for (var i = 0; i < NM1; i++){
                                       j = NM1 - i;
                                       K[j] = K[j - 1];
                                   } // End for i
                                   K[0] = 0;
                                   zerok = ((K[NM1] == 0) ? 1 : 0);
                               } 
                               else { 
                                   // Used scaled form of recurrence if value of K at 0 is nonzero
                                   t = -aa/cc;
                                   for (var i = 0; i < NM1; i++){
                                       j = NM1 - i;
                                       K[j] = t*K[j - 1] + p[j];
                                   } // End for i
                                   K[0] = p[0];
                                   zerok = ((Math.abs(K[NM1]) <= Math.abs(bb)*DBL_EPSILON*10.0) ? 1 : 0);
                               } 
                       } 

                       // Save K for restarts with new shifts
                       for (var i = 0; i < N; i++) temp[i] = K[i];

                       // Loop to select the quadratic corresponding to each new shift
                       for (jj = 1; jj <= 20; jj++){

                           // Quadratic corresponds to a double shift to a non-real point and its
                           // complex conjugate. The point has modulus BND and amplitude rotated
                           // by 94 degrees from the previous shift.

                           xxx = -(sinr*yy) + cosr*xx;
                           yy = sinr*xx + cosr*yy;
                           xx = xxx;
                           sr = bnd*xx;
                           u = -(2.0*sr);

                           // Second stage calculation, fixed quadratic
                           Fxshfr_ak1(DBL_EPSILON, MDP1, 20*jj, sr, bnd, K, N, p, NN, qp, u, Fxshfr_Par);

                           if (Fxshfr_Par.NZ != 0){
                               // The second stage jumps directly to one of the third stage iterations and
                               // returns here if successful. Deflate the polynomial, store the zero or
                               // zeros, and return to the main algorithm.
                               j = degPar.Degree - N;
                               zeror[j] = Fxshfr_Par.szr;
                               zeroi[j] = Fxshfr_Par.szi;
                               NN = NN - Fxshfr_Par.NZ;
                               N = NN - 1;
                               for (var i = 0; i < NN; i++) p[i] = qp[i];
                               if (Fxshfr_Par.NZ != 1){
                                   zeror[j + 1] = Fxshfr_Par.lzr;
                                   zeroi[j + 1] = Fxshfr_Par.lzi;
                               }
                               break;
                           } 
                           else { 
                             // If the iteration is unsuccessful, another quadratic is chosen after restoring K
                             for (var i = 0; i < N; i++) { K[i] = temp[i]; }
                           } 
                       } 
                       // Return with failure if no convergence with 20 shifts
                       if (jj > 20) {
                           degPar.Degree -= N;
                           break;
                       } 
                   }
                   // >>>>> End Main Loop <<<<<
                   return;
               }
                //--> End Jenkins-Traub
                rpSolve(degreePar, p, zeror, zeroi);

                var l = zeroi.length;
                //format the output
                for( i=0; i<l; i++ ) {
                    // We round the imaginary part to avoid having something crazy like 5.67e-16.
                    var img = round( zeroi[i], decp+8 ),
                        real = round( zeror[i], decp );
                    // Did the rounding pay off? If the rounding did nothing more than chop off a few digits then no.
                    // If the rounding results in a a number at least 3 digits shorter we'll keep it else we'll keep 
                    // the original otherwise the rounding was worth it.
                    real = decp - String( real ).length > 2 ? real : zeror[i];
                    var sign = img < 0 ? '-' : '';

                    // Remove the zeroes
                    if( real === 0 ) { real = ''; }
                    if( img === 0 ) { img = ''; }

                    // Remove 1 as the multiplier and discard imaginary part if there isn't one.
                    img = Math.abs( img ) === 1 ? sign+'i' : ( img ? img+'*i' : '' );

                    var num = ( real && img ) ? real + '+' + img : real+img;
                    zeror[i] = num.replace(/\+\-/g, '-');
                }
                return zeror;
            } 
         },
        roots: function(symbol) {
            var roots = __.proots(symbol).map(function(x) {
                return _.parse(x);
            });
            return core.Vector.fromArray(roots);
        },
        froot: function(f, guess, dx) { 
            var newtonraph = function(xn) {
                var mesh = 1e-12,
                    // If the derivative was already provided then don't recalculate.
                    df = dx ? dx : core.Utils.build(core.Calculus.diff(f.clone())),
                    
                    // If the function was passed in as a function then don't recalculate.
                    fn = f instanceof Function ? f : core.Utils.build(f),
                    max = 10000,
                    done = false, 
                    safety = 0;
                while( !done ) { 
                    var x = xn-(fn(xn)/df(xn));
                    //absolute values for both x & xn ensures that we indeed have the radius    
                    var r = Math.abs(x) - Math.abs(xn),
                        delta = Math.abs(r);
                    xn = x; 

                    if( delta < mesh ) done = true;
                    else if( safety > max ) {
                        xn = null;
                        done = true;
                    }
                    
                    safety++;
                }
                return xn;
            };
            return newtonraph( Number( guess ) );
        },
        quad: function(a, b, c) {
            var q = function(a, b, c, sign) {
                return _.parse('-('+b+'+'+sign+'*sqrt(('+b+')^2-4*('+a+')*('+c+')))/(2*'+a+')');
            };
            return [q(a, b, c, 1), q(a, b, c, -1)];
        },
        sumProd: function(a, b) {
            return __.quad(-b, a, -1).map(function(x){
                return x.invert(); 
            });
        },
        /**
         * Get's all the powers of a particular polynomial including the denominators. The denominators powers
         * are returned as negative. All remaining polynomials are returned as zero order polynomials.
         * for example polyPowers(x^2+1/x+y+t) will return [ '-1', 0, '2' ]
         * @param {Symbol} e
         * @param {String} for_variable
         * @param {Array} powers
         * @returns {Array} An array of the powers
         */
        //assumes you've already verified that it's a polynomial
        polyPowers: function(e, for_variable, powers) { 
            powers = powers || [];
            var g = g = e.group; 
            if(g ===  PL && for_variable === e.value) {
                powers = powers.concat(keys(e.symbols)); 
            }
            else if(g === CP) { 
                for(var s in e.symbols) {
                    var symbol = e.symbols[s]; 
                    var g = symbol.group, v = symbol.value; 
                    if(g === S && for_variable === v) powers.push(symbol.power);
                    else if(g === PL || g === CP) powers = __.polyPowers(symbol, for_variable, powers);
                    else if(g === CB && symbol.contains(for_variable)) {
                        var t = symbol.symbols[for_variable];
                        if(t) powers.push((t.power));
                    }
                    else if(g === N || for_variable !== v) powers.push(0);
                }
            }
            return core.Utils.arrayUnique(powers).sort();
        },
        //The factor object
        Factor: {
            mix: function(o, include_negatives) {
                var factors = keys(o);
                var l = factors.length;
                var m = [];//create a row which we'r going to be mixing
                for(var i=0; i<l; i++) {
                    var factor = factors[i],
                        p = o[factor];
                    var ll = m.length;
                    for(var j=0; j<ll; j++) {
                        var t = m[j]*factor;
                        m.push(t);
                        if(include_negatives) m.push(-t);
                    }
 
                    for(var j=1; j<=p; j++)
                        m.push(Math.pow(factor, j));
                }
                return m;
            },
            factor: function(symbol, factors) {
                if(symbol.group === S) 
                    return symbol; //absolutely nothing to do
                var p = symbol.power.clone();
                if(isInt(p)) { 
                    symbol.toLinear();
                    factors = factors || new Factors();
                    var map = {}, original;
                    symbol = _.parse(core.Utils.subFunctions(symbol, map));
                    if(keys(map).length > 0) { //it might have functions
                        factors.preAdd = function(factor) {
                            return _.parse(factor, core.Utils.getFunctionsSubs(map));
                        };
                    }
                    //strip the power
                    if(!symbol.isLinear()) {
                        factors.pFactor = symbol.power.toString();
                        symbol.toLinear();
                    } 
                    
                    var vars = variables(symbol),
                        multiVar = vars.length > 1;
                    //Since multivariate is experiental I want to compare numeric outputs to make
                    //sure we're returning the correct value
                    if(multiVar) 
                        original = symbol.clone();

                    //minor optimization. Seems to cut factor time by half in some cases.
                    if(multiVar) {
                        var all_S = true, all_unit = true;
                        symbol.each(function(x) {
                            if(x.group !== S) all_S = false;
                            if(!x.multiplier.equals(1)) all_unit = false;
                        });
                        if(all_S && all_unit) 
                            return _.pow(symbol, _.parse(p));
                    }
                    symbol = __.Factor.coeffFactor(symbol, factors);
                    symbol = __.Factor.powerFactor(symbol, factors);
                    if(vars.length === 1) {
                        symbol = __.Factor.squareFree(symbol, factors);
                        symbol = __.Factor.trialAndError(symbol, factors);
                    }
                    else {
                        symbol = __.Factor.mfactor(symbol, factors);
                    }
                    symbol = _.parse(symbol, core.Utils.getFunctionsSubs(map));
                    factors.add(symbol);
                    
                    var retval = factors.toSymbol();

                    //compare the inval and outval and they must be the same or else we failed
                    if(multiVar && !core.Utils.compare(original, retval, vars)) { 
                        return original;                   
                    }
                    
                    return _.pow(retval, _.parse(p));
                }
                return symbol;    
            },
            /**
             * Makes Symbol square free
             * @param {Symbol} symbol
             * @param {Factors} factors
             * @returns {[Symbol, Factor]}
             */
            squareFree: function(symbol, factors) {
                if(symbol.isConstant() || symbol.group === S) return symbol;
                var poly = new Polynomial(symbol);
                var sqfr = poly.squareFree();
                var p = sqfr[2];
                //if we found a square then the p entry in the array will be non-unit
                if(p !== 1) {
                    //make sure the remainder doesn't have factors
                    var t = sqfr[1].toSymbol();
                    t.power = t.power.multiply(new Frac(p));
                    //send the factor to be fatored to be sure it's completely factored
                    factors.add(__.Factor.factor(t));
                    return __.Factor.squareFree(sqfr[0].toSymbol(), factors);
                }
                return symbol;
            },
            /**
             * Factors the powers such that the lowest power is a constant
             * @param {Symbol} symbol
             * @param {Factors} factors
             * @returns {[Symbol, Factor]}
             */
            powerFactor: function(symbol, factors) {
                if(symbol.group !== PL) return symbol; //only PL need apply
                var d = core.Utils.arrayMin(keys(symbol.symbols));
                var retval = new Symbol(0);
                var q = _.parse(symbol.value+'^'+d);
                symbol.each(function(x) {
                    x = _.divide(x, q.clone());
                    retval = _.add(retval, x);
                });
                factors.add(q);
                return retval;
            },
            /**
             * Removes GCD from coefficients
             * @param {Symbol} symbol
             * @param {Factor} factors
             * @returns {Symbol}
             */
            coeffFactor: function(symbol, factors) {
                if(symbol.isComposite()) {
                    var gcd = core.Math2.QGCD.apply(null, symbol.coeffs());
                    if(!gcd.equals(1)) { 
                        symbol.each(function(x) {
                            if(x.isComposite()) {
                                x.each(function(y){
                                    y.multiplier = y.multiplier.divide(gcd);
                                });
                            }
                            else x.multiplier = x.multiplier.divide(gcd);
                        });
                    }
                    symbol.updateHash();
                    if(factors) factors.add(new Symbol(gcd));
                }
                return symbol;
            },
            /**
             * The name says it all :)
             * @param {Symbol} symbol
             * @param {Factor} factors
             * @returns {Symbol}
             */
            trialAndError: function(symbol, factors) {
                if(symbol.isConstant() || symbol.group === S) return symbol;
                var poly = new Polynomial(symbol),
                    cnst = poly.coeffs[0],
                    cfactors = core.Math2.ifactor(cnst),
                    roots = __.proots(symbol);
                for(var i=0; i<roots.length; i++) {
                    var r = roots[i],
                        p = 1;
                    if(!isNaN(r)) { //if it's a number
                        for(var x in cfactors) {
                            //check it's raised to a power
                            var n = core.Utils.round(Math.log(x)/Math.log(Math.abs(r)), 8);
                            if(isInt(n)) {
                                r = x; //x must be the root since n gave us a whole
                                p = n; break;
                            }
                        }
                        var root = new Frac(r),
                            terms = [new Frac(root.num).negate()];
                        terms[p] = new Frac(root.den);
                            //convert to Frac. The den is coeff of LT and the num is coeff of constant
                        var div = Polynomial.fromArray(terms, poly.variable).fill(),
                            t = poly.divide(div);
                        if(t[1].equalsNumber(0)) { //if it's zero we have a root and divide it out
                            poly = t[0];
                            factors.add(div.toSymbol());
                        }
                    }
                }
                if(!poly.equalsNumber(1)) {
                    poly = __.Factor.search(poly, factors);
                }
                return poly.toSymbol();
            },
            search: function(poly, factors, base) {
                base = base || 10; //I like 10 because numbers exhibit similar behaviours at 10
                var v = poly.variable; //the polynmial variable name
                /**
                 * Attempt to remove a root by division given a number by first creating
                 * a polynomial fromt he given information
                 * @param {int} c1 - coeffient for the constant
                 * @param {int} c2 - coefficient for the LT
                 * @param {int} n - the number to be used to construct the polynomial
                 * @param {int} p - the power at which to create the polynomial
                 * @returns {null|Polynomial} - returns polynomial if successful otherwise null
                 */
                var check = function(c1, c2, n, p) {
                    var candidate = Polynomial.fit(c1, c2, n, base, p, v);
                    if(candidate && candidate.coeffs.length > 1) {
                        var t = poly.divide(candidate);
                        if(t[1].equalsNumber(0)) {
                            factors.add(candidate.toSymbol());
                            return [t[0], candidate];
                        }
                    }
                    return null;
                };
                var cnst = poly.coeffs[0],
                    cfactors = core.Math2.ifactor(cnst),
                    lc = poly.lc(),
                    ltfactors = core.Math2.ifactor(lc),
                    subbed = poly.sub(base),
                    nfactors = __.Factor.mix(core.Math2.ifactor(subbed), subbed < 0),
                    cp = Math.ceil(poly.coeffs.length/2),
                    lc_is_neg = lc.lessThan(0),
                    cnst_is_neg = cnst.lessThan(0);
                ltfactors['1'] = 1;
                cfactors['1'] = 1;
                while(cp--) {
                    for(var x in ltfactors) {
                        for(var y in cfactors) {
                            for(var i=0; i<nfactors.length; i++) {
                                var factor_found = check(x, y, nfactors[i], cp);
                                if(factor_found) {
                                    poly = factor_found[0];
                                    if(!core.Utils.isPrime(poly.sub(base)))
                                        poly = __.Factor.search(poly, factors);
                                    return poly;
                                }
                                if(!factor_found && lc_is_neg)
                                    factor_found = check(-x, y, nfactors[i], cp); //check a negative lc
                                else if(!factor_found && cnst_is_neg)
                                    factor_found = check(x, -y, nfactors[i], cp); //check a negative constant
                                else if(!factor_found && lc_is_neg && cnst_is_neg)
                                    factor_found = check(-x, -y, nfactors[i], cp);
                            }
                        }
                    }
                }
                return poly;
            },
            /**
             * Equivalent of square free factor for multivariate polynomials
             * @param {type} symbol
             * @param {type} factors
             * @returns {AlgebraL#18.Factor.mSqfrFactor.symbol|Array|AlgebraL#18.__.Factor.mSqfrFactor.d}
             */
            mSqfrFactor: function(symbol, factors) {
                var vars = variables(symbol).reverse();
                for(var i=0; i<vars.length; i++) {
                    do {
                        var d = __.Factor.coeffFactor(core.Calculus.diff(symbol, vars[i]));
                        if(d.equals(0)) 
                            break;
                        var div = __.div(symbol, d.clone()),
                            is_factor = div[1].equals(0);
                        if(div[0].isConstant()) {
                            factors.add(div[0]);
                            break;
                        }
                        if(is_factor) {
                            factors.add(div[0]);
                            symbol = d;
                        }
                    }
                    while(is_factor)
                }
                return symbol;
            },
            //factoring for multivariate
            mfactor: function(symbol, factors) {
                symbol = __.Factor.mSqfrFactor(symbol, factors);
                var vars = variables(symbol),
                    symbols = symbol.collectSymbols(),
                    sorted = {},
                    maxes = {},
                    l = vars.length, n = symbols.length;
                //take all the variables in the symbol and organize by variable name
                //e.g. a^2+a^2+b*a -> {a: {a^3, a^2, b*a}, b: {b*a}}
                for(var i=0; i<l; i++) {
                    var v = vars[i];
                    sorted[v] = new Symbol(0);
                    for(var j=0; j<n; j++) {
                        var s = symbols[j];
                        if(s.contains(v)) {
                            var p = s.value === v ? s.power.toDecimal() : s.symbols[v].power.toDecimal();
                            if(!maxes[v] || p < maxes[v]) maxes[v] = p;
                            sorted[v] = _.add(sorted[v], s.clone());
                        }
                    }
                }

                for(var x in sorted) {
                    var r = _.parse(x+'^'+maxes[x]); 
                    var new_factor = _.expand(_.divide(sorted[x], r)); 
                    var divided = __.div(symbol.clone(), new_factor); 
                    if(divided[0].equals(0)) { //cant factor anymore
                        //factors.add(divided[1]);
                        return divided[1];
                    }

                    if(divided[1].equals(0)) { //we found at least one factor
                        var factor = divided[0];
                        factors.add(factor); 
                        factors.add(new_factor);
                        var d = __.div(symbol, divided[0].clone());
                        var r = d[0];
                        if(r.isConstant()) { 
                            factors.add(r);
                            return r;
                        }

                        return __.Factor.mfactor(r, factors);
                    }
                }
                return symbol;
            }
        },
        /**
         * Checks to see if a set of "equations" is linear. 
         * @param {type} set
         * @returns {Boolean}
         */
        allLinear: function(set) {
            var l = set.length;
            for(var i=0; i<l; i++) if(!__.isLinear(set[i])) return false;
            return true;
        },
        /*
         * Checks to see if the "equation" is linear
         * @param {Symbol} e
         * @returns {boolean}
         */
        isLinear: function(e) {
            var status = false, g = e.group;
            if(g === PL || g === CP) {
                status = true;
                for(var s in e.symbols) {
                    var symbol = e.symbols[s], sg = symbol.group;
                    if(sg === FN || sg === EX || sg === CB) { status = false;}
                    else {
                        if(sg === PL || sg === CP) status = __.isLinear(symbol);
                        else {
                            if(symbol.group !== N && symbol.power.toString() !== '1') { status = false; break; }
                        }
                    }
                }
            }
            else if(g === S && e.power === 1) status = true;
            return status;
        },
        gcd: function(a, b) { 
            if(a.length < b.length) { //swap'm
                var t = a; a = b; b = t;
            }
            var vars_a = variables(a), vars_b = variables(b);
            if(vars_a.length === vars_b.length && vars_a.length === 1 && vars_a[0] === vars_b[0]) {
                a = new Polynomial(a); b = new Polynomial(b);
                return a.gcd(b).toSymbol();
            }
            else {
                var T;
                while(!b.equals(0)) {  
                    var t = b.clone(); 
                    a = a.clone(); 
                    T = __.div(a, t);
                    b = T[1]; 
                    if(T[0].equals(0)) {
                        return new Symbol(core.Math2.QGCD(a.multiplier, b.multiplier));
                    }
                    a = t; 
                }
                //get rid of gcd in coeffs
                var multipliers = [];
                a.each(function(x) {
                    multipliers.push(x.multiplier);
                });
                var gcd = core.Math2.QGCD.apply(undefined, multipliers);
                if(!gcd.equals(1)) {
                    a.each(function(x) {
                        x.multiplier = x.multiplier.divide(gcd);
                    });
                }

                return a;
            }
        },
        /**
         * Divides one expression by another
         * @param {Symbol} symbol1
         * @param {Symbol} symbol2
         * @returns {Array}
         */
        divide: function(symbol1, symbol2) {
            var result = __.div(symbol1, symbol2);
            var remainder = _.divide(result[1], symbol2);
            return _.add(result[0], remainder);
        },
        div: function(symbol1, symbol2) {
            //division by constants
            if(symbol2.isConstant()) {
                symbol1.each(function(x) { 
                    x.multiplier = x.multiplier.divide(symbol2.multiplier);
                });
                return [symbol1, new Symbol(0)];
            }
            //special case. May need revisiting
            if(symbol1.group === S && symbol2.group === CP) {
                var s = symbol2.symbols[symbol1.value];
                if(s && symbol2.isLinear() && s.isLinear() && symbol1.isLinear()) {
                    return [new Symbol(1), _.subtract(symbol1.clone(), symbol2.clone())];
                }
            }
            var symbol1_has_func = symbol1.hasFunc(),
                symbol2_has_func = symbol2.hasFunc(),
                parse_funcs = false;
            
            //substitute out functions so we can treat them as regular variables
            if(symbol1_has_func || symbol2_has_func) {
                parse_funcs = true;
                var map = {},
                    symbol1 = _.parse(core.Utils.subFunctions(symbol1, map)),
                    symbol2 = _.parse(core.Utils.subFunctions(symbol2, map)),
                    subs = core.Utils.getFunctionsSubs(map);
            }
            //get a list of the variables
            var vars = core.Utils.arrayUnique(variables(symbol1).concat(variables(symbol2))),
                quot, rem;
            if(vars.length === 1) { 
                var q = new Polynomial(symbol1).divide(new Polynomial(symbol2));
                quot = q[0].toSymbol();
                rem = q[1].toSymbol();
            }
            else {
                vars.push(CONST_HASH); //this is for the numbers
                var reconvert = function(arr) {
                    var symbol = new Symbol(0);
                    for(var i=0; i<arr.length; i++) {
                        var x = arr[i].toSymbol();
                        symbol = _.add(symbol, x);
                    }
                    return symbol;
                };
                //Silly Martin. This is why you document. I don't remember now
                var get_unique_max = function(term, any) {
                    var max = Math.max.apply(null, term.terms),
                        count = 0, idx;

                    if(!any) {
                        for(var i=0; i<term.terms.length; i++) {
                            if(term.terms[i].equals(max)) {
                                idx = i; count++;
                            }
                            if(count > 1) return;
                        }
                    }
                    if(any) {
                        for(i=0; i<term.terms.length; i++) 
                            if(term.terms[i].equals(max)) {
                                idx = i; break;
                            }
                    }
                    return [max, idx, term];
                };
                //tries to find an LT in the dividend that will satisfy division
                var get_det = function(s, lookat) { 
                    lookat = lookat || 0;
                    var det = s[lookat], l = s.length; 
                    if(!det) return;
                    //eliminate the first term if it doesn't apply
                    var umax = get_unique_max(det); 
                    for(var i=lookat+1; i<l; i++) {
                        var term = s[i],   
                            is_equal = det.sum.equals(term.sum);
                        if(!is_equal && umax) { 
                            break;
                        } 
                        if(is_equal) {
                            //check the differences of their maxes. The one with the biggest difference governs
                            //e.g. x^2*y^3 vs x^2*y^3 is unclear but this isn't the case in x*y and x^2
                            var max1, max2, idx1, idx2, l2 = det.terms.length;
                            for(var j=0; j<l2; j++) {
                                var item1 = det.terms[j], item2 = term.terms[j];
                                if(typeof max1 === 'undefined' || item1.greaterThan(max1)) {
                                    max1 = item1; idx1 = j;
                                }
                                if(typeof max2 === 'undefined' || item2.greaterThan(max2)) {
                                    max2 = item2; idx2 = j;
                                }
                            }
                            //check their differences
                            var d1 = max1.subtract(term.terms[idx1]),
                                d2 = max2.subtract(det.terms[idx2]);
                            if(d2 > d1) {
                                umax = [max2, idx2, term];
                                break;
                            }
                            if(d1 > d2) {
                                umax = [max1, idx1, det];
                                break;
                            }
                        }
                        else { 
                            //check if it's a suitable pick to determine the order
                            umax = get_unique_max(term); 
                            //if(umax) return umax;
                            if(umax) break;
                        }
                        umax = get_unique_max(term); //calculate a new unique max
                    }

                    //if still no umax then any will do since we have a tie
                    if(!umax) return get_unique_max(s[0], true);
                    var e, idx;
                    for(var i=0; i<s2.length; i++) {
                        var cterm = s2[i].terms;
                        //confirm that this is a good match for the denominator
                        idx = umax[1];
                        if(idx === cterm.length - 1) return ;
                        e = cterm[idx]; 
                        if(!e.equals(0)) break;
                    }
                    if(e.equals(0)) return get_det(s, ++lookat); //look at the next term

                    return umax;
                };

                var t_map = core.Utils.toMapObj(vars);
                var init_sort = function(a, b) {
                    return b.sum.subtract(a.sum);
                };
                var is_larger = function(a, b) { 
                    if(!a || !b) return false; //it's empty so...
                    for(var i=0; i<a.terms.length; i++) {
                        if(a.terms[i].lessThan(b.terms[i])) return false;
                    }
                    return true;
                };
                var s1 = symbol1.tBase(t_map).sort(init_sort),
                    s2 = symbol2.tBase(t_map).sort(init_sort);
                var target = is_larger(s1[0], s2[0]) && s1[0].count > s2[0].count ? s2 : s1; //since the num is already larger than we can get the det from denom
                var det = get_det(target);//we'll begin by assuming that this will let us know which term 
                var quotient = [];
                if(det) {
                    var lead_var = det[1];
                    var can_divide = function(a, b) { 
                        if(a[0].sum.equals(b[0].sum)) return a.length >= b.length;
                        return true;
                    };

                    var try_better_lead_var = function(s1, s2, lead_var) {
                        return lead_var;
                        var checked = [];
                        for(var i=0; i<s1.length; i++) { 
                            var t = s1[i];
                            for(var j=0; j<t.terms.length; j++) {
                                var cf = checked[j], tt = t.terms[j];
                                if(i === 0) checked[j] = tt; //add the terms for the first one
                                else if(cf && !cf.equals(tt)) checked[j] = undefined;
                            }
                        }
                        for(var i=0; i<checked.length; i++) {
                            var t = checked[i];
                            if(t && !t.equals(0)) return i;
                        }
                        return lead_var;
                    };
                    var sf = function(a, b){ 
                        var l1 = a.len(), l2 = b.len();
                        var blv = b.terms[lead_var], alv = a.terms[lead_var];
                        if(l2 > l1 && blv.greaterThan(alv)) return l2 - l1;
                        return blv.subtract(alv); 
                    };

                    //check to see if there's a better lead_var
                    lead_var = try_better_lead_var(s1, s2, lead_var);
                    //reorder both according to the max power
                    s1.sort(sf); //sort them both according to the leading variable power
                    s2.sort(sf);

                    //try to adjust if den is larger
                    var fdt = s2[0], fnt = s1[0];

                    var den = new MVTerm(new Frac(1), [], fnt.map);
                    if(fdt.sum.greaterThan(fnt.sum)&& fnt.len() > 1) {
                        for(var i=0; i<fnt.terms.length; i++) {
                            var d = fdt.terms[i].subtract(fnt.terms[i]);
                            if(!d.equals(0)) {
                                var nd = d.add(new Frac(1));
                                den.terms[i] = d;
                                for(var j=0; j<s1.length; j++) {
                                    s1[j].terms[i] = s1[j].terms[i].add(nd);
                                }
                            }
                            else den.terms[i] = new Frac(0);
                        }
                    }

                    var dividend_larger = is_larger(s1[0], s2[0]);

                    while(dividend_larger && can_divide(s1, s2)) {
                        var q = s1[0].divide(s2[0]);
                        quotient.push(q); //add what's divided to the quotient
                        s1.shift();//the first one is guaranteed to be gone so remove from dividend
                        for(var i=1; i<s2.length; i++) { //loop through the denominator
                            var t = s2[i].multiply(q).generateImage(), 
                                l2 = s1.length;
                            //if we're subtracting from 0
                            if(l2 === 0) { 
                                t.coeff = t.coeff.neg();
                                s1.push(t); 
                                s1.sort(sf);
                            }

                            for(var j=0; j<l2; j++) {
                                var cur = s1[j];
                                if(cur.getImg() === t.getImg()) {
                                    cur.coeff = cur.coeff.subtract(t.coeff);
                                    if(cur.coeff.equals(0)) {
                                        core.Utils.remove(s1, j);
                                        j--; //adjust the iterator
                                    }
                                    break;
                                }
                                if(j === l2 - 1) { 
                                    t.coeff = t.coeff.neg();
                                    s1.push(t); 
                                    s1.sort(sf);
                                }
                            }
                        }
                        dividend_larger = is_larger(s1[0], s2[0]);

                        if(!dividend_larger && s1.length >= s2.length) {
                            //One more try since there might be a terms that is larger than the LT of the divisor
                            for(var i=1; i<s1.length; i++) {
                                dividend_larger = is_larger(s1[i], s2[0]);
                                if(dividend_larger) {
                                    //take it from its current position and move it to the front
                                    s1.unshift(core.Utils.remove(s1, i)); 
                                    break;
                                }
                            }
                        }
                    }
                }

                quot = reconvert(quotient);
                rem = reconvert(s1);

                if(typeof den !== 'undefined') {
                    den = den.toSymbol();
                    quot = _.divide(quot, den.clone());
                    rem = _.divide(rem, den);
                }
            }

            //put back the functions
            if(parse_funcs) {
                quot = _.parse(quot.text(), subs);
                rem = _.parse(rem.text(), subs);
            }

            return [quot, rem];
        },
        Classes: {
            Polynomial: Polynomial,
            Factors: Factors,
            MVTerm: MVTerm
        }
    };
    
    nerdamer.register([
        {
            name: 'factor',
            visible: true,
            numargs: 1,
            build: function() { return __.Factor.factor; }
        },
        {
            name: 'gcd',
            visible: true,
            numargs: 2,
            build: function() { return __.gcd; }
        },
        {
            name: 'roots',
            visible: true,
            numargs: -1,
            build: function() { return __.roots; }
        },
        {
            name: 'divide',
            visible: true,
            numargs: 2,
            build: function() { return __.divide; }
        },
        {
            name: 'div',
            visible: true,
            numargs: 2,
            build: function() { return __.div; }
        }
    ]);
})();
/*CALCULUS*/
(function() {
    "use strict";
    
    var core = nerdamer.getCore(),
        _ = core.PARSER,
        Frac = core.Frac,
        isSymbol = core.Utils.isSymbol,
        FN = core.groups.FN,
        Symbol = core.Symbol,
        text = core.Utils.text,
        inBrackets = core.Utils.inBrackets,
        isInt = core.Utils.isInt,
        format = core.Utils.format,
        N = core.groups. N,
        S = core.groups.S,
        FN = core.groups.FN,
        PL = core.groups.PL,
        CP = core.groups.CP,
        CB = core.groups.CB,
        EX = core.groups.EX,
        P = core.groups.P,
        LOG = 'log', 
        ABS = 'abs', 
        SQRT = 'sqrt',
        SIN = 'sin',  
        COS = 'cos', 
        TAN = 'tan',
        SEC = 'sec', 
        CSC = 'csc', 
        COT = 'cot',
        ASIN = 'asin', 
        ACOS = 'acos', 
        ATAN = 'atan',
        ASEC = 'asec', 
        ACSC = 'acsc', 
        ACOT = 'acot';
        
    //Preparations
    Symbol.prototype.hasIntegral = function() {
        if(this.group === FN && this.fname === 'integrate') 
            return true;
        if(this.symbols) {
            for(var x in this.symbols) {
                if(this.symbols[x].hasIntegral())
                    return true;
            }
        }
        return false;
    };
    //removes parentheses
    Symbol.unwrapPARENS = function(symbol) {
        if(symbol.group === FN && !symbol.fname) {
            var r = symbol.args[0];
            r.power = r.power.multiply(symbol.power);
            r.multiplier = r.multiplier.multiply(symbol.multiplier);
            return r;
        }
        return symbol;
    };
    core.Expression.prototype.hasIntegral = function() {
        return this.symbol.hasIntegral();
    };
    
    //A function to check if a function name is an inverse trig function
    core.Utils.in_inverse_trig = function(x) {
        var inv_trig_fns = [ASIN, ACOS, ATAN,   ACSC, ASEC, ACOT];
        return inv_trig_fns.indexOf(x) !== -1;
    };
    //A function to check if a function name is a trig function
    core.Utils.in_trig = function(x) {
        var trig_fns = [COS, SIN, TAN, SEC, CSC, COT];
        return trig_fns.indexOf(x) !== -1;
    };
    
    core.Settings.integration_depth = 4;
    
    var __ = core.Calculus = {
        version: '1.3.1',
        sum: function(fn, index, start, end) {
            if(!(index.group === core.groups.S)) throw new Error('Index must be symbol. '+text(index)+' provided');
            index = index.value;
            var retval;
            if(core.Utils.isNumericSymbol(start) && core.Utils.isNumericSymbol(end)) {
                start = start.multiplier;
                end = end.multiplier;

                var variables = core.Utils.variables(fn);
                if(variables.length === 1 && index === variables[0]) {
                    var f = core.Utils.build(fn);
                    retval = 0;
                    for(var i=start; i<=end; i++) {
                        retval += f.call(undefined, i);
                    }
                }
                else {
                    var f = fn.text(),
                        subs = {'~': true}, //lock subs. Is this even being used?
                    retval = new core.Symbol(0);

                    for(var i=start; i<=end; i++) {
                        subs[index] = new Symbol(i); 
                        retval = _.add(retval, _.parse(f, subs));
                    }
                }
            }
            else {
                retval = _.symfunction('sum',arguments);
            }

            return retval;
        },
        diff: function(symbol, wrt, nth) { 
            var d = isSymbol(wrt) ? wrt.text() : wrt; 
            
            nth = isSymbol(nth) ? nth.multiplier : nth || 1;

            if(d === undefined) d = core.Utils.variables(symbol)[0];
            
            //unwrap sqrt
            if(symbol.group === FN && symbol.fname === SQRT) {
                var s = symbol.args[0],
                    sp = symbol.power.clone();
                //these groups go to zero anyway so why waste time?
                if(s.group !== N || s.group !== P) {
                    s.power = isSymbol(s.power) ? _.multiply(s.power, _.multiply(new Symbol(1/2)), sp) : s.power.multiply(new Frac(0.5)).multiply(sp);
                    s.multiplier = s.multiplier.multiply(symbol.multiplier);
                }
                    
                symbol = s;
            }

            if(symbol.group === FN && !isSymbol(symbol.power)) {
                var a = derive(symbol); 
                var b = __.diff(symbol.args[0].clone(), d); 
                symbol = _.multiply(a, b);//chain rule
            }
            else {
                symbol = derive(symbol);
            }
            
            if(nth > 1) { 
                nth--;
                symbol = __.diff(symbol, wrt, nth);
            }
   
            return symbol;
  
             // Equivalent to "derivative of the outside".
            function polydiff(symbol) {
                if(symbol.value === d || symbol.contains(d, true)) { 
                    symbol.multiplier = symbol.multiplier.multiply(symbol.power);
                    symbol.power = symbol.power.subtract(new Frac(1)); 
                    if(symbol.power.equals(0)) {
                        symbol = Symbol(symbol.multiplier);
                    }
                } 
                
                return symbol;
            };
            function derive(symbol) { 
                var g = symbol.group, a, b, cp; 

                if(g === N || g === S && symbol.value !== d || g === P) { 
                    symbol = Symbol(0);
                }
                else if(g === S) {  
                    symbol = polydiff(symbol);
                }
                else if(g === CB) { 
                    var m = symbol.multiplier.clone();
                    symbol.toUnitMultiplier();
                    var retval =  _.multiply(product_rule(symbol),polydiff(symbol.clone()));
                    retval.multiplier = retval.multiplier.multiply(m);
                    return retval;
                }
                else if(g === FN && symbol.power.equals(1)) { 
                    // Table of known derivatives
                    switch(symbol.fname) {
                        case LOG:
                            cp = symbol.clone(); 
                            symbol = symbol.args[0].clone();//get the arguments
                            symbol.power = symbol.power.negate();
                            symbol.multiplier = cp.multiplier.divide(symbol.multiplier); 
                            break;
                        case COS:
                            //cos -> -sin
                            symbol.fname = SIN;
                            symbol.multiplier.negate();
                            break;
                        case SIN: 
                            //sin -> cos
                            symbol.fname = COS;
                            break;
                        case TAN:
                            //tan -> sec^2
                            symbol.fname = SEC;
                            symbol.power = new Frac(2);
                            break;
                        case SEC: 
                            // Use a clone if this gives errors
                            symbol = qdiff(symbol, TAN);
                            break;
                        case CSC:
                            symbol = qdiff(symbol, '-cot');
                            break;
                        case COT:
                            symbol.fname = CSC;
                            symbol.multiplier.negate();
                            symbol.power = new Frac(2);
                            break;
                        case ASIN:
                            symbol = _.parse('(sqrt(1-('+text(symbol.args[0])+')^2))^(-1)');
                            break;
                        case ACOS:
                            symbol = _.parse('-(sqrt(1-('+text(symbol.args[0])+')^2))^(-1)');
                            break;
                        case ATAN:
                            symbol = _.parse('(1+('+text(symbol.args[0])+')^2)^(-1)');
                            break;
                        case ABS: 
                            m = symbol.multiplier.clone(); 
                            symbol.toUnitMultiplier();
                            //depending on the complexity of the symbol it's easier to just parse it into a new symbol
                            //this should really be readdressed soon
                            b = symbol.args[0].clone();
                            b.toUnitMultiplier();
                            symbol = _.parse(inBrackets(text(symbol.args[0]))+'/abs'+inBrackets(text(b)));
                            symbol.multiplier = m;
                            break;
                        case 'parens':
                            //see product rule: f'.g goes to zero since f' will return zero. This way we only get back
                            //1*g'
                            symbol = Symbol(1);
                            break;
                        case 'cosh':
                            //cos -> -sin
                            symbol.fname = 'sinh';
                            break;
                        case 'sinh': 
                            //sin -> cos
                            symbol.fname = 'cosh';
                            break;
                        case 'tanh':
                            //tanh -> sech^2
                            symbol.fname = 'sech';
                            symbol.power = new Frac(2);
                            break;
                        case 'sech': 
                            // Use a clone if this gives errors
                            symbol = qdiff(symbol, '-tanh');
                            break;
                        case 'asinh':
                            symbol = _.parse('(sqrt(1+('+text(symbol.args[0])+')^2))^(-1)');
                            break;
                        case 'acosh':
                            symbol = _.parse('(sqrt(-1+('+text(symbol.args[0])+')^2))^(-1)');
                            break;
                        case 'atanh':
                            symbol = _.parse('(1-('+text(symbol.args[0])+')^2)^(-1)');
                            break;
                        case 'Si':
                            var arg = symbol.args[0];
                            symbol = _.parse('sin('+arg+')/('+arg+')');
                            break;
                        case 'Ci':
                            var arg = symbol.args[0];
                            symbol = _.parse('cos('+arg+')/('+arg+')');
                            break;
                    }
                }
                else if(g === EX || g === FN && isSymbol(symbol.power)) { 
                    var value;
                    if(g === EX) {
                        value = symbol.value;
                    }
                    else if(g === FN && symbol.contains(d)) { 
                        value = symbol.fname + inBrackets(text(symbol.args[0]));
                    }
                    else {
                        value = symbol.value + inBrackets(text(symbol.args[0]));
                    }
                        a = _.multiply(_.parse(LOG+inBrackets(value)), symbol.power.clone()); 
                        b = __.diff(_.multiply(_.parse(LOG+inBrackets(value)), symbol.power.clone()), d); 
                    symbol = _.multiply(symbol, b);
                }
                else if(g === FN && !symbol.power.equals(1)) { 
                    b = symbol.clone();
                    b.toLinear();
                    b.toUnitMultiplier();
                    symbol = _.multiply(polydiff( symbol.clone(), d ), derive(b));  
                }
                else if( g === CP || g === PL ) { 
                    var result = new Symbol(0);
                    for(var x in symbol.symbols) {
                        result = _.add(result, __.diff(symbol.symbols[x].clone(), d));
                    }
                    symbol = _.multiply(polydiff(symbol.clone()), result);
                }

                symbol.updateHash();
                return symbol;
            };

            function qdiff(symbol, val, altVal) {
                return _.multiply(symbol, _.parse(val+inBrackets(altVal || text(symbol.args[0]))));
            };

            function product_rule(symbol) { 
                //grab all the symbols within the CB symbol
                var symbols = symbol.collectSymbols(), 
                    result = new Symbol(0),
                    l = symbols.length;
                //loop over all the symbols
                for(var i=0; i<l; i++) {
                    var df = __.diff(symbols[i].clone(), d);
                    for(var j=0; j<l; j++) {
                        //skip the symbol of which we just pulled the derivative
                        if(i !== j) {
                            //multiply out the remaining symbols
                            df = _.multiply(df, symbols[j].clone());
                        }
                    }
                    //add the derivative to the result
                    result = _.add(result, df);
                }
                return result; //done
            };
        },
        integration: {
            u_substitution: function(symbols, dx) { 
                function try_combo(a, b, f) {
                    var q = f ? f(a, b) : _.divide(a.clone(), __.diff(b, dx));
                    if(!q.contains(dx)) 
                        return q;
                    return null;
                }
                function do_fn_sub(fname, arg) {
                    var subbed = __.integrate(_.symfunction(fname, [new Symbol(u)]), u);
                    subbed = subbed.sub(new Symbol(u), arg);
                    subbed.updateHash();
                    return subbed;
                }

                var a = symbols[0].clone(),
                    b = symbols[1].clone(),
                    g1 = a.group,
                    g2 = b.group,
                    //may cause problems if person is using this already. Will need
                    //to find algorithm for detecting conflict
                    u = '__u__', 
                    Q;
                if(g1 === FN && g2 !== FN) {
                    //e.g. 2*x*cos(x^2)
                    var arg = a.args[0];
                    Q = try_combo(b, arg.clone());
                    if(Q) 
                        return _.multiply(Q, do_fn_sub(a.fname, arg));
                    Q = try_combo(b, a);
                    if(Q) {
                        return __.integration.poly_integrate(a);
                    }
                }
                else if(g2 === FN && g1 !== FN) {
                    //e.g. 2*(x+1)*cos((x+1)^2
                    var arg = b.args[0];
                    Q = try_combo(a, arg.clone());
                    if(Q) 
                        return _.multiply(Q, do_fn_sub(b.fname, arg));
                }
                else if(g1 === FN && g1 === FN) {
                    Q = try_combo(a.clone(), b.clone());
                    if(Q)
                        return _.multiply(__.integration.poly_integrate(b), Q);
                    Q = try_combo(b.clone(), a.clone());
                    if(Q)
                        return _.multiply(__.integration.poly_integrate(b), Q);
                }
                else if(g1 === EX && g2 !== EX) {
                    var p = a.power;
                    Q = try_combo(b, p.clone());
                    var integrated = __.integrate(a.sub(p, new Symbol(u)), u);
                    return _.multiply(integrated.sub(new Symbol(u), p), Q);
                }
                else if(g2 === EX && g1 !== EX) {
                    var p = b.power;
                    Q = try_combo(a, p.clone());
                    var integrated = __.integrate(b.sub(p, new Symbol(u)), u);
                    return _.multiply(integrated.sub(new Symbol(u), p), Q);
                }
                else if(a.isComposite() || b.isComposite()) { 
                    var f = function(a, b) {
                        var A = core.Algebra.Factor.factor(a),
                            B = core.Algebra.Factor.factor(__.diff(b, dx));
                        var q = _.divide(A, B);
                        return q;
                    };
                    var f1 = a.isComposite() ? a.clone().toLinear() : a.clone(),
                        f2 = b.isComposite() ? b.clone().toLinear() : b.clone(); 
                    Q = try_combo(f1.clone(), f2.clone(), f); 
                    if(Q) 
                        return _.multiply(__.integration.poly_integrate(b), Q);
                    Q = try_combo(f2.clone(), f1.clone(), f);
                    if(Q)
                        return _.multiply(__.integration.poly_integrate(a), Q);
                }
            },
            //simple integration of a single polynomial x^(n+1)/(n+1)
            poly_integrate: function(x) { 
                var p = x.power.toString(),
                    m = x.multiplier.toString(), 
                    s = x.toUnitMultiplier().toLinear();
                if(Number(p) === -1) {
                    return _.multiply(new Symbol(m), _.symfunction(LOG, [s]));
                }
                return _.parse(format('({0})*({1})^(({2})+1)/(({2})+1)', m, s, p));
            },
            //If we're just spinning wheels we want to stop. This is why we 
            //wrap integration in a try catch block and call this to stop.
            stop: function(msg) {
                msg = msg || 'Stopping!';
                throw new Error(msg);
            },
            partial_fraction: function(input, dx, depth) { 
                var num, den; 
                var m = new Symbol(input.multiplier);
                
                //make prepartions
                //check if it's a symbol. If so get num and denom
                if(isSymbol(input)) { 
                    den = input.getDenom().invert();
                    num = input.getNum();
                }
                else {
                    //we assume it's an array
                    num = input[0];
                    den = input[1];
                }

                //although technically not partial fractions we can  save ourselves a lot of headache with a simple u sub
                if(num.isConstant()) {
                    var fn = den.clone().toLinear(),
                        a = fn.stripVar(dx),
                        bx = _.subtract(fn.clone(), a);
                    if(bx.group === S && bx.isLinear()) { 
                        //we make the u substitution
                        return __.integration.poly_integrate(input);
                    }
                    
                    if(den.power.greaterThan(1))
                        den = _.expand(den);
                }

                //make sure that den > num
                var q = core.Algebra.div(num, den.clone()),
                    M = new core.Matrix(), //prepare the two matrices
                    c = new core.Matrix(),
                    num_array = q[1].toArray(dx), //point to the remainder not the numerator
                num = q[1]; //point to the remainder not the whole
                //get the factors of the denominator
                var factors = Symbol.unwrapPARENS(core.Algebra.Factor.factor(den)); 

                var factor_array = []; 
                //we first have to unwrap the factor and get them in ordered form. We use an array for this
                //the first part of q can just be integrated using standard integration so we do so
                var result = q[0].equals(0) ? q[0] : __.integrate(q[0], dx, depth);
                if(factors.group !== CP) { 
                    factors.each(function(factor) { 
                        //unwrap parentheses
                        factor = Symbol.unwrapPARENS(factor);
                        if(factor.isConstant())
                            m = _.multiply(m, factor); //add it to the constants
                        else
                            factor_array.push(factor);
                    });
                }
                else {
                    if(q[1].isComposite()) { 
                        //apply the sum rule
                        q[1].each(function(x) {
                            var s = _.divide(x.clone(), factors.clone());//put it back in the form num/den
                            result = _.add(result, __.integrate(s, dx, depth));
                        });
                    }
                    else { 
                        //I have no idea why integration by parts doesn't work for p === 2
                        var fn = factors.clone().toLinear(),
                            decomp = __.integration.decompose_arg(fn, dx),
                            x = decomp[1],
                            a = decomp[0],
                            b = decomp[3];
                        if(!x.isLinear())
                            //we stop because u du takes care of quadratics
                            __.integration.stop();
                        if(factors.power.greaterThan(0)) { 
                            if(q[1].isConstant()) {
                                result = __.integration.poly_integrate(_.divide(q[1], factors));
                            }
                            else {
                                //since we know x is linear we can just let u = x+a and u-a = x = r
                                //TODO: On a serious note what is u du doing in partial fractions. This has got to be redone
                                //rewrite the expression to become (1/a)*[ (ax+b)/(ax+b) - b/(ax+b)] which we can do 
                                //since x is linear from above
                                result = _.add(
                                    __.integrate(_.divide(fn.clone(), factors.clone()), dx, depth),
                                    __.integrate(_.divide(b.negate(), factors.clone()), dx, depth)
                                );
                            }
                            result = _.divide(result, a);
                        }
                        else { 
                            result = __.integration.by_parts(_.divide(q[1], factors.clone()), dx, core.Settings.integration_depth);
                        }
                    }  

                    return result;
                }

                var l = factor_array.length;
                //if there's only one factor then we can exit since there's nothing else to compute
                //other than the current integral of the whole and remainder
                if(l === 1) { 
                    //put it back in the proper form. Remember that this is the remainder so it still has a 
                    //denominator
                    var s = _.divide(q[1], factor_array[0]); 
                    var intg = __.integrate(s, dx, depth); //compute the integral of the remainder
                    intg = _.divide(intg, m); //put back the multiplier
                    result = _.add(result, intg);
                    return result;
                }
                //the next step is to expand the factors excluding the current factor
                //e.g. if the factors were (x+7)*(x+1)*(x+5) we want them as:
                //x^2+6*x+5 because of: (x+1)*(x+5)
                //x^2+12*x+35 because of: (x+7)*(x+5)
                //x^2+8*x+7 because of: (x+7)*(x+1)
                for(var i=0; i<l; i++) { 
                    var t = new Symbol(1);
                    for(var j=0; j<l; j++) {
                        if(i !== j) 
                            t = _.multiply(t, factor_array[j].clone());
                    }
                    t = _.expand(t).toArray(dx);//this is one of the rows
                    var e = num_array[i];
                    c.elements[i] = e ?  [e] : [Symbol(0)]; //fill the holes in the coeffs
                    M.elements[i] = t; //add the row to the matrix
                }
                //solve for A, B, C, etc. We transpose to have the powers in the columns
                var L = M.transpose().invert().multiply(c); 
                //we can now integrate each one of them but remember we divided earlier so integrate the whole if it's not zero
                for(var i=0; i<l; i++) { 
                    var integral = __.integrate(_.divide(q[1].clone(), factor_array[i]), dx, depth),
                        cf = _.expand(L.elements[i][0]); 
                    var mm = _.divide(cf, m.clone()); 
                    result = _.add(result, _.multiply(integral, mm));
                }

                return result;
            },
            by_parts: function(symbol, dx, depth) { 
                var get_udv = function(symbol) { 
                    var parts = [[/*L*/], [/*I*/], [/*A*/], [/*T*/], [/*E*/]];
                    //first we sort them 
                    var setSymbol = function(x) { 
                        var g = x.group; 
                        if(g === FN) {
                            var fname = x.fname;
                            if(core.Utils.in_trig(fname))
                                parts[3].push(x);
                            else if(core.Utils.in_inverse_trig(fname))
                                parts[1].push(x);
                            else if(fname === LOG)
                                parts[0].push(x);
                            else {
                                stop();
                            }
                        }
                        else if(g === S || x.isComposite() && x.isLinear() || g === CB && x.isLinear()) {
                            parts[2].push(x);
                        }
                        else if(g === EX || x.isComposite() && !x.isLinear())
                            parts[4].push(x);
                        else
                            stop();
                    };
                    if(symbol.group === CB) 
                        symbol.each(function(x) {
                            setSymbol(Symbol.unwrapSQRT(x, true));
                        });
                    else
                        setSymbol(symbol);
                    var u, dv = new Symbol(1);
                    //compile u and dv
                    for(var i=0; i<5; i++) { 
                        var part = parts[i], t,
                            l = part.length;
                        if(l > 0) {
                            if(l > 1) {
                                t = new Symbol(1);
                                for(var j=0; j<l; j++) 
                                    t = _.multiply(t, part[j].clone());
                            }
                            else
                                t = part[0].clone();

                            if(!u) {
                                u = t;//the first u encountered gets chosen
                                u.multiplier = u.multiplier.multiply(symbol.multiplier); //the first one gets the mutliplier
                            } 
                            else dv = _.multiply(dv, t); //everything else belongs to dv
                        }  
                    }

                    return [u, dv];
                };
                var udv, u, dv, du, v, vdu, uv, retval, integral_vdu, m;
                //first LIATE
                udv = get_udv(symbol);
                u = udv[0]; 
                dv = udv[1]; 
                du = Symbol.unwrapSQRT(_.expand(__.diff(u.clone(), dx)), true); 
                v = __.integrate(dv.clone(), dx, depth); 
                vdu = _.multiply(v.clone(), du); 
                uv = _.multiply(u, v); 
                m = vdu.multiplier.clone();
                vdu.toUnitMultiplier();
                integral_vdu = __.integrate(vdu.clone(), dx, depth); 
                integral_vdu.multiplier = integral_vdu.multiplier.multiply(m);
                retval = _.subtract(uv, integral_vdu);
                return retval;
            },
            decompose_arg: function(arg, dx) { 
                var ax, a, x, b;
                if(arg.group === CP) {
                    var t = _.expand(arg.clone()).stripVar(dx); 
                    ax = _.subtract(arg.clone(), t.clone());
                    b = t;
                }
                else
                    ax = arg.clone(); 

                a = ax.stripVar(dx);
                x = _.divide(ax.clone(), a.clone());
                return [a, x, ax, b];
            }
        },
        integrate: function(original_symbol, dt, depth) { 
            depth = depth || 0;
            var dx = isSymbol(dt) ? dt.toString() : dt,
                //we don't want the symbol in sqrt form. x^(1/2) is prefererred
                symbol = Symbol.unwrapSQRT(original_symbol.clone(), true), 
                g = symbol.group,
                retval;

            try { 
                //We stop integration after x amount of recursive depth
                if(++depth > core.Settings.integration_depth) 
                    __.integration.stop('Maximum depth reached. Exiting!');
                
                //constants. We first eliminate anything that doesn't have dx. Everything after this has 
                //to have dx or else it would have been taken care of below
                if(!symbol.contains(dx, true)) { 
                    retval = _.multiply(symbol.clone(), _.parse(dx));
                }
                //e.g. 2*x
                else if(g === S) {
                    retval = __.integration.poly_integrate(symbol, dx, depth);
                }
                else if(g === EX) {
                    //check the base
                    if(symbol.contains(dx)) {
                        //if the symbol also contains dx then we stop since we currently 
                        //don't know what to do with it e.g. x^x
                        if(symbol.power.contains(dx))
                            __.integration.stop();
                        else {
                            //since at this point it's the base only then we do standard single poly integration
                            //e.g. x^y
                            retval = __.integration.poly_integrate(symbol, dx, depth);
                        }
                    }
                    //e.g. a^x or 9^x
                    else {
                        var a = __.diff(symbol.power.clone(), dx);
                        if(a.contains(dx)) {
                            var aa = a.stripVar(dx),
                                x = _.divide(a.clone(), aa.clone());
                            if(x.group === S && x.isLinear()) {
                                aa.multiplier = aa.multiplier.divide(new Frac(2));
                                return _.parse(format('({2})*(sqrt(pi)*erf(sqrt(-{0})*{1}))/(2*sqrt(-{0}))', aa, dx, symbol.multiplier));
                            }
                            else
                                __.integration.stop();
                        }
                        if(symbol.isE()) {
                            retval = symbol;
                        }
                        else {
                            var d = _.symfunction(LOG, [_.parse(symbol.value)]);
                            retval = _.divide(symbol, d);
                        }
                        retval = _.divide(retval, a);
                    }
                }
                else if(symbol.isComposite() && symbol.isLinear()) {
                    retval = new Symbol(0);
                    symbol.each(function(x) {
                        retval = _.add(retval, __.integrate(x, dx, depth));
                    });
                }
                else if(g === CP) { 
                    var p = Number(symbol.power),
                        m = symbol.multiplier.clone();//temporarily remove the multiplier
                    symbol.toUnitMultiplier();
                    var //below we consider the form ax+b
                        fn = symbol.clone().toLinear(), //get just the pure function without the power
                        decomp = __.integration.decompose_arg(fn, dx),
                        //I have no idea why I used bx+a and not ax+b. TODO change this to something that makes sense
                        b = decomp[3],
                        ax = decomp[2],
                        a = decomp[0],
                        x = decomp[1]; 
                    if(p === -1 && x.group !== PL) { 
                        //we can now check for atan
                        if(x.group === S && x.power.equals(2)) { //then we have atan
                            //abs is redundants since the sign appears in both denom and num.
                            var unwrapAbs = function(s) {
                                var result = new Symbol(1);
                                s.each(function(x) {
                                    result = _.multiply(result, x.fname === 'abs' ? x.args[0] : x);
                                });
                                return result;
                            };
                            var A = a.clone(),
                                B = b.clone();
                            A = _.pow(A, new Symbol(1/2));
                            B = _.pow(B, new Symbol(1/2));
                            //unwrap abs
                            
                            var d = _.multiply(unwrapAbs(B), unwrapAbs(A)),
                                f = _.symfunction(ATAN, [_.divide(_.multiply(a, x.toLinear()), d.clone())]);
                            retval = _.divide(f, d);
                        }
                        else if(x.group === S && x.isLinear()) {
                            retval = _.divide(__.integration.poly_integrate(symbol), a);
                        }
                        else { 
                            //let's try partial fractions
                            retval = __.integration.partial_fraction(symbol, dx, depth);
                        }
                    }
                    else if(p === -1/2) {
                        //detect asin and atan
                        if(x.group === S && x.power.equals(2)) {
                            if(ax.multiplier.lessThan(0) && !b.multiplier.lessThan(0)) {
                                a.negate();
                                //it's asin
                                if(b.isConstant() && a.isConstant()) {
                                    var d = _.symfunction(SQRT, [a.clone()]),
                                        d2 = _.symfunction(SQRT, [_.multiply(a.clone(), b)]);
                                    retval = _.divide(_.symfunction(ASIN, [_.divide(ax.toLinear(), d2)]), d);
                                }
                                //I'm not sure about this one. I'm trusting Wolfram Alpha here
                                else {
                                    var sqrt_a = _.symfunction(SQRT, [a]),
                                        sqrt_ax = _.multiply(sqrt_a.clone(), x.clone().toLinear());
                                    retval = _.divide(_.symfunction(ATAN, [_.divide(sqrt_ax, _.symfunction(SQRT, [fn.clone()]))]), sqrt_a);
                                }
                            }
                            else {
                                /*WHAT HAPPENS HERE???? e.g. integrate(3/sqrt(-a+b*x^2),x) or integrate(3/sqrt(a+b*x^2),x)*/
                                __.integration.stop();
                            }
                        }
                        else {
                            //This would be a case like 1/(sqrt(1-x^3) or 1/(1-(x+1)^2)
                            __.integration.stop();
                        }
                    }
                    else { 
                        if(x.isLinear() && x.group !== PL)
                            retval = _.divide(__.integration.poly_integrate(symbol), a);
                        else { 
                            retval = __.integration.partial_fraction(symbol, dx, depth);
                        }
                    }
                    retval.multiplier = retval.multiplier.multiply(m);
                }
                else if(g === FN) {
                    var arg = symbol.args[0],
                        m = symbol.multiplier.clone();
                    symbol.toUnitMultiplier();
                    var decomp = __.integration.decompose_arg(arg, dx);
                    //easies way I can think of to get the coefficient and to make sure
                    //that the symbol is linear wrt dx. I'm not actually trying to get the 
                    //derivative
                    var a = decomp[0],
                        x = decomp[1],
                        fname = symbol.fname;
                    //log is a special case that can be handled with integration by parts
                    if(fname === LOG || (fname === ASIN || fname === ACOS || fname === ATAN && x.isLinear())) { 
                        /*integration by parts */
                        var p = symbol.power.toString(); 
                        if(isInt(p))
                            depth = depth - p; //it needs more room to find the integral
                        retval = __.integration.by_parts(symbol, dx, depth); 
                    }
                    else {
                        if(!a.contains(dx, true) && symbol.isLinear()) { //perform a deep search for safety
                            //first handle the special cases 
                            if(fname === ABS) {
                                //REVISIT **TODO**
                                var x = _.divide(arg.clone(), a.clone());
                                if(x.group === S && !x.power.lessThan(0)) {
                                    if(core.Utils.even(x.power)) {
                                        retval = __.integrate(arg, dx, depth);
                                    }
                                    else {
                                        var integrated = __.integrate(x, dx, depth);
                                        integrated.power = integrated.power.subtract(new Frac(1));
                                        retval = _.multiply(_.multiply(_.symfunction(ABS, [x.toLinear()]), integrated), a);
                                    }
                                }
                                else 
                                    __.integration.stop();
                            }
                            else {
                                /**TODO**/ //ASIN, ACOS, ATAN
                                switch(fname) {
                                    case COS:
                                        retval = _.symfunction(SIN, [arg]);
                                        break;
                                    case SIN:
                                        retval = _.symfunction(COS, [arg]);
                                        retval.negate();
                                        break;
                                    case TAN:
                                        retval = _.parse(format('log(sec({0}))', arg));
                                        break;
                                    case SEC:
                                        retval = _.parse(format('log(tan({0})+sec({0}))', arg));
                                        break;
                                    case CSC:
                                        retval = _.parse(format('-log(csc({0})+cot({0}))', arg));
                                        break;
                                    case COT:
                                        retval = _.parse(format('log(sin({0}))', arg));
                                        break;
                                    case 'erf':
                                        var arg = symbol.args[0].clone(),
                                            aa = arg.stripVar(dx);
                                        retval = _.parse(format('(({0})*{1}+e^(-{2}^2*{3}^2)/sqrt(pi))', arg, retval, aa, dx));
                                        break;
                                    default:
                                        __.integration.stop();
                                }
                                
                                retval = _.divide(retval, a); 
                            }
                        }
                        else if(x.isLinear()) {
                            if(fname === COS || fname === SIN) {
                                var p = Number(symbol.power);
                                //check to see if it's negative and then just transform it to sec or csc
                                if(p < 0) {
                                    symbol.fname = fname === SIN ? CSC : SEC;
                                    symbol.invert().updateHash();
                                    retval = __.integrate(symbol, dx, depth);
                                }
                                else {
                                    var arg = symbol.args[0],
                                        rd = symbol.clone(), //cos^(n-1)
                                        rd2 = symbol.clone(), //cos^(n-2)
                                        q = new Symbol((p-1)/p), //
                                        na = _.multiply(a.clone(), new Symbol(p)).invert(); //1/(n*a)
                                    rd.power = rd.power.subtract(new Frac(1));
                                    rd2.power = rd2.power.subtract(new Frac(2));

                                    var t = _.symfunction(fname === COS ? SIN : COS, [arg.clone()]);
                                    if(fname === SIN) t.negate();
                                    retval = _.add(_.multiply(_.multiply(na, rd), t), _.multiply(q, __.integrate(_.parse(rd2), dx, depth)));
                                }
                            }
                            //tan(x)^n or cot(x)^n
                            else if(fname === TAN || fname === COT) { 
                                //http://www.sosmath.com/calculus/integration/moretrigpower/moretrigpower.html
                                if(symbol.args[0].isLinear(dx)) {
                                    var n = symbol.power.subtract(new Frac(1)).toString(),
                                        r = symbol.clone().toUnitMultiplier(),
                                        w = _.parse(format((fname === COT ? '-' : '')+'1/({2}*{0})*{3}({1})^({0})', n, arg, a, fname));
                                    r.power = r.power.subtract(new Frac(2));
                                    if(r.power.equals(0))
                                        r = _.parse(r);
                                    retval = _.subtract(w, __.integrate(r, dx, depth));
                                }   
                            }
                            //sec(x)^n or csc(x)^n
                            else if(fname === SEC || fname === CSC) { 
                                //http://www.sosmath.com/calculus/integration/moretrigpower/moretrigpower.html
                                var n1 = symbol.power.subtract(new Frac(1)).toString(),
                                    n2 = symbol.power.subtract(new Frac(2)).toString(),
                                    f2 = fname === SEC ? TAN : COT,
                                    r = symbol.clone().toUnitMultiplier(),
                                    parse_str = format((fname === CSC ? '-' : '')+'1/({0}*{1})*{4}({3})^({2})*{5}({3})', a, n1, n2, arg, fname, f2),
                                    w = _.parse(parse_str);
                                r.power = r.power.subtract(new Frac(2));
                                if(r.power.equals(0))
                                    r = _.parse(r);
                                retval = _.add(w, _.multiply(new Symbol(n2/n1), __.integrate(r, dx, depth)));
                            }
                            else
                                __.integration.stop();
                        }
                        else 
                            __.integration.stop();

                        retval.multiplier = retval.multiplier.multiply(m);
                    }
                        
                }
                else if(g === PL) {
                    retval = __.integration.partial_fraction(symbol, dx, depth);
                }
                else if(g === CB) {
                    //separate the coefficient since all we care about are symbols containing dx
                    var coeff = symbol.stripVar(dx); 
                    //now get only those that apply
                    var cfsymbol = _.divide(symbol.clone(), coeff.clone()); //a coeff free symbol
                    //if we only have one symbol left then let's not waste time. Just pull the integral
                    //and let the chips fall where they may
                    if(cfsymbol.group !== CB) { 
                        retval = __.integrate(cfsymbol, dx, depth);
                    }
                    else {
                        //we collect the symbols and sort them descending group, descending power, descending alpabethically
                        var symbols = cfsymbol.collectSymbols().sort(function(a, b) {
                            if(a.group === b.group)  {
                                if(Number(a.power) === Number(b.power))
                                    if(a < b) return 1; //I want sin first
                                    else return -1;
                                return b.power - a.power; //descending power
                            }
                            return b.group - a.group; //descending groups
                        }).map(function(x) {
                            return Symbol.unwrapSQRT(x, true);
                        });

                        //generate an image for 
                        var l = symbols.length;
                        if(l === 2) { 
                            //try u substitution
                            retval = __.integration.u_substitution(symbols, dx);
                            if(!retval) {
                                //no success with u substitution so let's try known combinations
                                //are they two functions
                                var g1 = symbols[0].group,
                                    g2 = symbols[1].group,
                                    sym1 = symbols[0],
                                    sym2 = symbols[1],
                                    fn1 = sym1.fname,
                                    fn2 = sym2.fname;
                                //reset the symbol minus the coeff
                                symbol = _.multiply(sym1.clone(), sym2.clone());
                                if(g1 === FN && g2 === FN) { 
                                    if(fn1 === LOG || fn2 === LOG) {
                                        retval = __.integration.by_parts(symbol.clone(), dx, depth);
                                    }
                                    else {
                                        symbols.sort(function(a, b) {
                                            return b.fname > a.fname;
                                        });
                                        var arg1 = sym1.args[0];
                                        //make sure the arguments are suitable. We don't know how to integrate non-linear arguments
                                        if(!arg1.isLinear() || !(arg1.group === CP || arg1.group === CB || arg1.group === S))
                                            __.integration.stop();

                                        var decomp = __.integration.decompose_arg(arg1, dx);
                                        x = decomp[1],
                                        a = decomp[0];
                                        if(!x.isLinear()) //again... linear arguments only wrt x
                                            __.integration.stop();

                                        //they have to have the same arguments and then we have cleared all the check to 
                                        //make sure we can integrate FN & FN
                                        var arg2 = sym2.args[0];
                                        //make sure that their argument matches
                                        if(arg1.equals(arg2)) {
                                            if(fn1 === SIN && fn2 === COS) {
                                                if(sym1.power.lessThan(0))
                                                    __.integration.stop();//we don't know how to handle, sin(x)^n/cos(x)^m where m > n,  yet
                                                //if it's in the form sin(x)^n*cos(x)^n then we can just return tan(x)^n which we know how to integrate
                                                if(fn1 === SIN && sym1.power.add(sym2.power).equals(0)) {
                                                    sym1.fname = TAN;
                                                    sym1.updateHash();
                                                    retval = __.integrate(sym1, dx, depth);
                                                }
                                                else {
                                                    var p1_even = core.Utils.even(sym1.power),
                                                        p2_even = core.Utils.even(sym2.power);
                                                    retval = new Symbol(0);
                                                    if(!p1_even || !p2_even) { 
                                                        var u, r, trans;
                                                        //since cos(x) is odd it carries du. If sin was odd then it would be the other way around
                                                        //know that p1 satifies the odd portion in this case. If p2 did than it would contain r
                                                        if(!p1_even) {
                                                            //u = sin(x)
                                                            u = sym2; r = sym1; 
                                                        }
                                                        else {
                                                            u = sym1; r = sym2;
                                                        }
                                                        //get the sign of du. In this case r carries du as stated before and D(cos(x),x) = -sin(x)
                                                        var sign = u.fname === COS ? -1 : 1,
                                                            n = r.power, 
                                                            //remove the du e.g. cos(x)^2*sin(x)^3 dx -> cos(x)^2*sin(x)^2*sin(x). We're left with two 
                                                            //even powers afterwards which can be transformed
                                                            k = (n - 1)/2, 
                                                            //make the transformation cos(x)^2 = 1 - sin(x)^2
                                                            trans = _.parse('(1-'+u.fname+core.Utils.inBrackets(arg1)+'^2)^'+k), 
                                                            sym = _.expand(_.multiply(new Symbol(sign), _.multiply(u.clone(), trans)));
                                                        //we can now just loop through and integrate each since it's now just a polynomial with functions
                                                        sym.each(function(x) {
                                                            retval = _.add(retval, __.integration.poly_integrate(x.clone()));
                                                        });
                                                    }
                                                    else {
                                                        //performs double angle transformation
                                                        var double_angle = function(symbol) {
                                                            var p = symbol.power,
                                                                k = p/2, e;
                                                            if(symbol.fname === COS)
                                                                e = '((1/2)+(cos(2*('+symbol.args[0]+'))/2))^'+k;
                                                            else
                                                                e = '((1/2)-(cos(2*('+symbol.args[0]+'))/2))^'+k;

                                                            return _.parse(e);
                                                        };
                                                        //they're both even so transform both using double angle identities and we'll just
                                                        //be able to integrate by the sum of integrals
                                                        var a = double_angle(sym1),
                                                            b = double_angle(sym2),
                                                            t = _.multiply(a, b);
                                                        var sym = _.expand(t);
                                                        sym.each(function(x) {
                                                            retval = _.add(retval, __.integrate(x, dx, depth));
                                                        });
                                                        return _.multiply(retval, coeff);
                                                    }
                                                }
                                            }
                                            else if(fn1 === TAN && fn2 === SEC && x.isLinear()) {
                                                //tan(x)*sec(x)^n where n > 0
                                                /* REVISIT IN THE FUTURE
                                                if(sym2.isLinear()) {
                                                    var tanx = sym1.clone();
                                                        tanx.power = new Frac(2);
                                                    //borrow a power from tan
                                                    sym1.power = sym1.power.subtract(new Frac(1));
                                                    if(sym1.power.equals(0))
                                                        sym1 = _.parse(sym1);
                                                    else
                                                        sym1 = sym1.sub(tanx, _.parse(SEC+'('+arg1+')^2-1'));
                                                    //add it to sec
                                                    var combined = _.expand(_.multiply(_.multiply(sym2, _.symfunction(TAN, [arg1.clone()])), sym1));
                                                    retval = new Symbol(0);
                                                    combined.each(function(x) {
                                                        retval = _.add(retval, __.integrate(x, dx, depth));
                                                    });
                                                }*/
                                                if(sym1.isLinear() && sym2.isLinear()) {
                                                    retval = _.divide(_.symfunction(SEC, [arg1.clone()]), a);
                                                }
                                                else
                                                    __.integration.stop();
                                            }
                                            else if(fn1 === SEC && fn2 === COS) {
                                                sym1.fname = COS;
                                                sym1.invert().updateHash();
                                                retval = __.integrate(_.multiply(sym1, sym2), dx, depth);
                                            }
                                            else if(fn1 === SIN && fn2 === CSC) {
                                                sym2.fname = SIN;
                                                sym2.invert().updateHash();
                                                retval = __.integrate(_.multiply(sym1, sym2), dx, depth);
                                            }
                                            else
                                                __.integration.stop();
                                        }
                                        else
                                            __.integration.stop();
                                    }
                                }
                                else if(g1 === FN && g2 === S) {
                                    if(sym1.fname === COS && sym2.power.equals(-1))
                                        retval = _.symfunction('Ci', [sym1.args[0]]);
                                    else if(sym1.fname === SIN && sym2.power.equals(-1))
                                        retval = _.symfunction('Si', [sym1.args[0]]);
                                    else {
                                        retval = __.integration.by_parts(symbol, dx, depth);
                                    }
                                }
                                else if(g1 === EX && g2 === S) {
                                    retval = __.integration.by_parts(symbol, dx, depth);
                                }
                                else if(g1 === PL && g2 === S) {
                                    //first try to reduce the top
                                    if(sym2.value === sym1.value && sym1.power.equals(-1)) {
                                        //find the lowest power in the denominator
                                        var pd = Math.min.apply(null, core.Utils.keys(sym1.symbols));
                                        //get the lowest common value between denominator and numerator
                                        var pc = Math.min(pd, sym2.power);
                                        //reduce both denominator and numerator by that factor
                                        var factor = sym2.clone();
                                        factor.power = new Frac(pc);
                                        sym2 = _.divide(sym2, factor.clone()); //reduce the denominator
                                        var t = new Symbol(0);
                                        sym1.each(function(x) {
                                            t = _.add(t, _.divide(x.clone(), factor.clone()));
                                        });
                                        t.multiplier = sym1.multiplier;
                                        symbol = _.divide(sym2, t);
                                    }
                                    retval = __.integration.partial_fraction(symbol, dx, depth);
                                }
                                else if(g1 === CP && g2 === S) { 
                                    //handle cases x^(2*n)/sqrt(1-x^2)
                                    if(sym1.power.equals(-1/2)) { 
                                        var decomp = __.integration.decompose_arg(sym1.clone().toLinear(), dx);
                                        var a = decomp[0].negate(),
                                            x = decomp[1],
                                            b = decomp[3],
                                            p = Number(sym2.power);
                                        if(isInt(p) && core.Utils.even(p) && x.power.equals(2)) {
                                            //if the substitution 
                                            var c = _.divide(_.multiply(_.pow(b.clone(), new Symbol(2)), 
                                                _.symfunction(SQRT, [_.divide(b.clone(), a.clone())])), 
                                                _.pow(a.clone(), new Symbol(2)));
                                            c = _.multiply(c, _.symfunction(SQRT, [b]).invert());
                                            var dummy = _.parse('sin(u)');
                                            dummy.power = dummy.power.multiply(sym2.power);
                                            var integral = __.integrate(dummy, 'u', depth);
                                            var bksub = _.parse(ASIN+'('+SQRT+'('+a+'/'+b+')*'+dx+')');
                                            retval = _.multiply(c, integral.sub(new Symbol('u'), bksub));
                                        }   
                                    }
                                    else if(sym1.power.equals(-1) && sym2.isLinear()) { 
                                        retval = __.integration.partial_fraction(symbol, dx, depth);
//                                        var fn = sym1.clone().toLinear(),
//                                            decomp = __.integration.decompose_arg(fn.clone(), dx),
//                                            a = decomp[0],
//                                            b = decomp[3],
//                                            x = decomp[2];
//                                        if(!x.isLinear())
//                                            __.integration.stop();
//                                        retval = _.divide(_.subtract(fn.clone(), _.multiply(_.symfunction(LOG, [fn]), b)), _.pow(a, new Symbol(2)));
                                        
                                    }
                                    else if(!sym1.power.lessThan(0) && isInt(sym1.power)) { 
                                        //sum of integrals
                                        var expanded = _.expand(sym1);
                                        retval = new Symbol(0);
                                        expanded.each(function(x) {
                                            if(x.group === PL) {
                                                x.each(function(y) {
                                                    retval = _.add(retval, __.integrate(_.multiply(sym2.clone(), y), dx, depth));
                                                });
                                            }
                                            else 
                                                retval = _.add(retval, __.integrate(_.multiply(sym2.clone(), x), dx, depth));
                                        });
                                    }
                                    else if(sym1.power.lessThan(-2)) {
                                        retval = __.integration.by_parts(symbol, dx, depth);
                                    }
                                    else { 
                                        retval = __.integration.partial_fraction(symbol, dx, depth);
                                    }
                                        
                                }
                                else if(sym1.isComposite() && sym2.isComposite()) { 
                                    //sum of integrals
                                    retval = new Symbol(0);
                                    var p1 = Number(sym1.power),
                                        p2 = Number(sym2.power);
                                    if(p1 < 0 && p2 > 0) {
                                        //swap
                                        var t = sym1; sym1 = sym2; sym2 = t;
                                    }
                                    
                                    sym1.each(function(x) {
                                       retval = _.add(retval, __.integrate(_.multiply(x, sym2.clone()), dx, depth));
                                    });
                                }
                                else
                                    retval = __.integration.by_parts(symbol, dx, depth);
                            }
                        }
                        else if(l === 3 && symbols[2].group === S) {
                            //try integration by parts 
                            retval = __.integration.by_parts(symbol, dx, depth);
                        }
                    }
                    retval = _.multiply(retval, coeff);
                }
                //if an integral was found then we return it
                if(retval)
                    return retval;
            }
            catch(e){/*no integral found*/ }  
            //no symbol found so we return the integral again
            return _.symfunction('integrate', [original_symbol, dt]);
        }
    };
    
    nerdamer.register([
        {
            name: 'diff',
            visible: true,
            numargs: [1,3],
            build: function(){ return __.diff; }
        },
        {
            name: 'sum',
            visible: true,
            numargs: 4,
            build: function(){ return __.sum; }
        },
        {
            name: 'integrate',
            visible: true,
            numargs: 2,
            build: function() { return __.integrate; }
        }
    ]);
})();
/*SPECIAL*/
(function() {
    /*imports*/
    var core = nerdamer.getCore(),
        _ = core.PARSER,
        keys = core.Utils.keys,
        build = core.Utils.build,
        Symbol = core.Symbol,
        S = core.groups.S,
        round = core.Utils.round,
        isInt = core.Utils.isInt,
        Math2 = core.Math2,
        variables = core.Utils.variables,
        isComposite = core.Utils.isComposite,
        isSymbol = core.Utils.isSymbol,
		isNumericSymbol = core.Utils.isNumericSymbol,
        isVector = core.Utils.isVector,
        N = core.groups.N,
        EX = core.groups.EX,
        FN = core.groups.FN,
        PL = core.groups.PL,
        CP = core.groups.CP,
        CB = core.groups.CB,
        Vector = core.Vector;
    
    var __ = core.Special = {
        version: '1.0.0',
		/*
		* Heavyside step function
		* Specification : http://mathworld.wolfram.com/HeavisideStepFunction.html
		* if x > 0 then 1
		* if x == 0 then 1/2
		* if x < 0 then 0
		*/
		step: function(symbol) {
                    if (symbol.group === N)//Check if a number
                    {
                        var x = symbol.multiplier.toDecimal();
                        if (x > 0)
                        {
                                return 1;
                        }
                        else if (x < 0)
                        {
                                return 0;
                        }
                        return 1/2;
                    }
                    return  _.symfunction("step",[symbol]);
		},
		/*
		* Sign function
		* Specification : http://mathworld.wolfram.com/Sign.html
		* if x > 0 then 1
		* if x == 0 then 0
		* if x < 0 then -1
		*/
		sign: function(symbol) {
                    //Check if a number
			if (symbol.group === N)//Check if a number
			{
                            var x = symbol.multiplier.toDecimal();
                            if (x > 0)
                            {
                                    return 1;
                            }
                            else if (x < 0)
                            {
                                    return -1;
                            }
                            return 0;
			}
			return  _.symfunction("sign",[symbol]);
		},
		/*
		* Rectangle function
		* Specification : http://mathworld.wolfram.com/RectangleFunction.html
		* if |x| > 1/2 then 0
		* if |x| == 1/2 then 1/2
		* if |x| < 1/2 then 1
		*/
		rect: function(symbol) {
			var exp = core.Utils.format('step({0}+(0.5)) - step({0}-(0.5))', symbol); //Reuse step function
			return core.PARSER.parse(exp);
		},
		/*
		* Sinc function
		* Specification : http://mathworld.wolfram.com/SincFunction.html
		* if x == 0 then 1
		* otherwise sin(x)/x
		*/
		sinc: function(symbol) {
                    if (symbol.group === N)//Check if a number
                    {
                        var x = symbol.multiplier.toDecimal();
                        if (x === 0)
                        {
                                return 1;
                        }
                        return Math.sin(symbol)/symbol;
                    }
                    return  _.symfunction("sinc",[symbol]);
		},
		/*
		* Triangle function
		* Specification : http://mathworld.wolfram.com/TriangleFunction.html
		* if |x| >= 1 then 0
		* if |x| < then 1-|x|
		*/
		tri: function(symbol) {
			var exp = core.Utils.format('rect(0.5*{0})*(1-abs({0}))', symbol); //Reuse rect function
			return core.PARSER.parse(exp);
		}
    };

    nerdamer.register([
	{
		/*
		* Heavyside step function
		* Specification : http://mathworld.wolfram.com/HeavisideStepFunction.html
		* if x > 0 then 1
		* if x == 0 then 1/2
		* if x < 0 then 0
		*/
		name: 'step',
		visible: true,
		numargs: 1,
		build: function() { return __.step; }
	},
	{
		/*
		* Sign function
		* Specification : http://mathworld.wolfram.com/Sign.html
		* if x > 0 then 1
		* if x == 0 then 0
		* if x < 0 then -1
		*/
		name: 'sign',
		visible: true,
		numargs: 1,
		build: function() { return __.sign; }
	},
	{
		/*
		* Rectangle function
		* Specification : http://mathworld.wolfram.com/RectangleFunction.html
		* if |x| > 1/2 then 0
		* if |x| == 1/2 then 1/2
		* if |x| < 1/2 then 1
		*/
		name: 'rect',
		visible: true,
		numargs: 1,
		build: function() { return __.rect; }
	},
	{
		/*
		* Sinc function
		* Specification : http://mathworld.wolfram.com/SincFunction.html
		* if x == 0 then 1
		* otherwise sin(x)/x
		*/
		name: 'sinc',
		visible: true,
		numargs: 1,
		build: function() { return __.sinc; }
	},
	{
		/*
		* Triangle function
		* Specification : http://mathworld.wolfram.com/TriangleFunction.html
		* if |x| >= 1 then 0
		* if |x| < then 1-|x|
		*/
		name: 'tri',
		visible: true,
		numargs: 1,
		build: function() { return __.tri; }
	}	
	
    ]);
})();
/*SOLVE*/
(function() {
    //handle imports
    var core = nerdamer.getCore(),
        _ = core.PARSER,
        _A = core.Algebra,
        _C = core.Calculus,
        PL = core.groups.PL,
        format = core.Utils.format,
        build = core.Utils.build,
        isInt = core.Utils.isInt,
        same_sign = core.Utils.sameSign,
        Symbol = core.Symbol,
        isSymbol = core.Utils.isSymbol,
        variables = core.Utils.variables,
        isArray = core.Utils.isArray;
        
    var toLHS = function(eqn) {
        var es = eqn.split('=');
        if(es[1] === undefined) es[1] = '0';
        var e1 = _.parse(es[0]), e2 = _.parse(es[1]);
        return _.subtract(e1, e2);
    };
    
    var sys_solve = function(eqns) {
        nerdamer.clearVars();
        for(var i=0; i<eqns.length; i++) eqns[i] = toLHS(eqns[i]);
        
        if(!_A.allLinear(eqns)) core.err('System must contain all linear equations!');
        var vars = variables(eqns[0]), m = new core.Matrix(),
            c = new core.Matrix(),
            l = eqns.length; 
        //get all variables
        for(var i=1; i<l; i++) { vars = vars.concat(variables(eqns[i])); }
        vars = core.Utils.arrayUnique(vars).sort();

        for(var i=0; i<l; i++) {
            var e = eqns[i]; //store the expression
            for(var j=0; j<l; j++) {     
                var variable = e.symbols[vars[j]];
                m.set(i, j, variable ? variable.multiplier : 0);
            }
            var num = e.symbols['#']; 
            c.set(i, 0, new Symbol(num ? -num.multiplier : 0));
        }

        m = m.invert();

        var result = m.multiply(c);
        var solutions = [];
        result.each(function(e, idx) { solutions.push([vars[idx], e.valueOf()]); });
        return solutions;
    };
        
    var quad = function(c, b, a,  plus_or_min) { 
        var plus_or_minus = plus_or_min === '-' ? 'subtract': 'add';
        var bsqmin4ac = _.subtract(_.pow(b.clone(), Symbol(2)), _.multiply(_.multiply(a.clone(), c.clone()),Symbol(4)))/*b^2 - 4ac*/; 
        var det = _.pow(bsqmin4ac, Symbol(0.5));
        return _.divide(_[plus_or_minus](b.clone().negate(), det),_.multiply(new Symbol(2), a.clone()));
    };
    
    //http://math.stackexchange.com/questions/61725/is-there-a-systematic-way-of-solving-cubic-equations
    var cubic = function(d_o, c_o, b_o, a_o) { 
        //convert everything to text
        var a = a_o.text(), b = b_o.text(), c = c_o.text(), d = d_o.text(); 
        var d0s = '{1}^2-3*{0}*{2}',
            d0 = _.parse(format(d0s, a, b, c)),
            Q = _.parse(format('sqrt((2*{1}^3-9*{0}*{1}*{2}+27*{0}^2*{3})^2-4*({1}^2-3*{0}*{2})^3)', a, b, c, d)),
            C = _.parse(format('((1/2)*({4}+2*{1}^3-9*{0}*{1}*{2}+27*{0}^2*{3}))^(1/3)', a, b, c, d, Q));
        //check if C equals 0
        var Ct = core.Utils.block('PARSE2NUMBER', function() {
            return _.parse(C, {a: new Symbol(1), b: new Symbol(1), c: new Symbol(1),d: new Symbol(1)});
        });
        if(Number(d0) === 0 && Number(Ct) === 0) //negate Q such that C != 0
            C = _.parse(format('((1/2)*(-{4}+2*{1}^3-9*{0}*{1}*{2}+27*{0}^2*{3}))^(1/3)', a, b, c, d, Q));
        var xs = [
            '-(b/(3*a))+C/(3*a)+((b^2-3*a*c))/(3*a*C)',
            '-(b/(3*a))+(C*(1+i*sqrt(3)))/(6*a)+((1-i*sqrt(3))*(b^2-3*a*c))/6*a*C'.replace(/i/g, core.Settings.IMAGINARY),
            '-(b/(3*a))+(C*(1-i*sqrt(3)))/(6*a)+((1+i*sqrt(3))*(b^2-3*a*c))/(6*a*C)'.replace(/i/g, core.Settings.IMAGINARY)
        ];

        for(var i=0; i<3; i++) 
            xs[i] = _.parse(xs[i], { a: a_o.clone(), b: b_o.clone(), c: c_o.clone(), d: d_o.clone(), C: C.clone()});
        return xs;
    };
    
    var solve = function(eqns, solve_for) { 
        solve_for = solve_for || 'x'; //assumes x by default
        
        if(isArray(eqns)) return sys_solve.apply(undefined, arguments);
        var solutions = [],
            add_to_result = function(r) {
                if(isArray(r)) solutions = solutions.concat(r);
                else {
                    if(r.valueOf() !== 'null') {
                        if(!isSymbol(r)) r = _.parse(r);
                        solutions.push(r);
                    }
                }
            };
            
        var attempt_Newton = function(symbol) {
            //first we compile a machine function to gain a boost in speed
            var f = build(symbol);

            //we're going to use trial and error to generate two points for Newton's method
            //these to point should have opposite signs. 
            //we start at 0 just because and check the sign
            var starting_point, guess = 0;

            do {
                starting_point =  f(guess); //we want a real starting point
                guess++;
                if(guess > 100) break;//safety
            }
            while(!isFinite(starting_point))

            if(starting_point === 0) add_to_result(new Symbol(starting_point));//we're done
            else {
                var df = build(_C.diff(symbol.clone())), ls;

                //get two points so we can get the slope of the function
                for(var i=0; i<10; i++) {
                    var c = df(i);
                    if(!isNaN(ls) && !isNaN(c)) break;
                    ls = c;
                }

                var direction = 1, 
                    slope = ls-c;

                //we want to make sure that we search for a number in the opposite direction
                if(same_sign(slope, starting_point)) {
                    direction = -1;
                }

                var search_for_solution_at = function(start) { 
                    var end = 0, point;
                    //we want a number with an opposite sign
                    for(var i=start; i<start+100; i++) {
                        var next_point = f(i)*direction,
                            r = Math.abs(0 - next_point);//get the distance to zero

                        if(r > 1) next_point *= r;//increase the search radius

                        if(next_point === 0 || !same_sign(next_point, end)) {
                            point = next_point === start ? next_point : (start+end)/2; 
                            break;
                        }

                        end = next_point; 
                    }

                    if(point !== undefined) add_to_result(_.parse(core.Algebra.froot(symbol, point)));
                };

                search_for_solution_at(starting_point); //check 1 side  
                search_for_solution_at(-starting_point);//check the other
            }
        };

        var eq = toLHS(eqns),
            vars = core.Utils.variables(eq),//get a list of all the variables
            numvars = vars.length;//how many variables are we dealing with
        //if we're dealing with a single variable then we first check if it's a 
        //polynomial (including rationals).If it is then we use the Jenkins-Traubb algorithm.
        if(numvars === 1) { 
            if(eq.isPoly(true)) { 
                if(vars[0] === solve_for) _A.proots(eq).map(add_to_result);
            }
            else {
                //since it's not a polynomial then we'll try to look for a solution using Newton's method
                //this is not a very broad search but takes the positions that something is better than nothing
                attempt_Newton(eq);
            }
        }
        else {
            //The idea here is to go through the equation and collect the coefficients
            //place them in an array and call the quad or cubic function to get the results
            if(!eq.hasFunc() && eq.isComposite()) { 
                try {
                    //remove extra powers
                    
                    //the terms of the polynomial
                    var coeffs = [];
                    var add = function(c, p) {
                        p = Number(p);
                        if(!isInt(p)) throw new Error('Stopping');
                        var xterm = _.parse(solve_for+'^'+p); //create a term of equal power to divide out
                        coeffs[p] = _.divide(c, xterm);
                    };

                    for(var x in eq.symbols) {
                        var sym = eq.symbols[x];
                        if(sym.group === PL && sym.value === solve_for) {
                            sym.each(function(y, p) {
                                add(y, p);
                            });
                        }
                        else {
                            var t, p;
                            if(sym.symbols) {
                                var t = sym.symbols[solve_for];
                                add(sym, t ? t.power : 0);
                            }
                            else add(sym, sym.value === solve_for ? sym.power : 0);
                        }
                    }
                    var l = coeffs.length,
                        deg = l-1; //the degree of the polynomial
                    //fill the holes
                    for(var i=0; i<l; i++)
                        if(coeffs[i] === undefined)
                            coeffs[i] = new Symbol(0);
                    //handle the problem based on the degree
                    switch(deg) {
                        case 1:
                            //nothing to do but to return the quotient of the constant and the LT
                            //e.g. 2*x-1
                            add_to_result(_.divide(coeffs[0], coeffs[1].negate()));
                            break;
                        case 2:
                            add_to_result(quad.apply(undefined, coeffs));
                            coeffs.push('-');
                            add_to_result(quad.apply(undefined, coeffs));
                            break;
                        case 3:
                            add_to_result(cubic.apply(undefined, coeffs));
                            break;
                    }
                }
                catch(e) { /*something went wrong. EXITING*/;} 
            }
        }
        
        return solutions;
    };
    
    nerdamer.register({
        name: 'solveEquations',
        parent: 'nerdamer',
        visible: true,
        build: function(){ return solve; }
    });
})();


if((typeof module) !== 'undefined') {
    module.exports = nerdamer;
}