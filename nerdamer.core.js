/*
 * Author : Martin Donk
 * Website : http://www.nerdamer.com
 * Email : martin.r.donk@gmail.com
 * Source : https://github.com/jiggzson/nerdamer
 */

var nerdamer = (function(imports) { 
    "use strict";

    var version = '0.6.0',
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
            IMAGINARY: 'i'
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
        
        CONST_HASH = '#',
        
        //GLOBALS
        
        PARENTHESIS = 'parens',

        //the function which represent vector
        VECTOR = 'vector',

        SQRT = 'sqrt',
        
        ABS = 'abs',

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
         * Replace n! to fact(n)
         * @param {String}
         */
        
        insertFactorial = Utils.insertFactorial = function(expression) {
            var factorial;
            var regex = /(\d+|\w+)!/ig;
            do {
                factorial = regex.exec(expression);
                if (factorial !== null) {
                    expression = expression.replace(factorial[0], 'fact(' + factorial[0] + ')').expression.replace('!', '');
                }
            } while(factorial);
            return expression;
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
         * @type {Number|Symbol} num
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
         * @obj {Object} obj
         * @returns {boolean}
         * @description
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
        variables = Utils.variables = function( obj, vars ) { 
            vars = vars || {
                c: [],
                add: function(value) {
                    if(this.c.indexOf(value) === -1 && isNaN(value)) this.c.push(value);
                }
            };

            if(isSymbol(obj)) { 
                var group = obj.group,
                    prevgroup = obj.previousGroup;
                if(group === EX) variables(obj.power, vars);
                
                if(group === CP || group === CB || prevgroup === CP || prevgroup === CB) {
                    for(var x in obj.symbols) variables(obj.symbols[x], vars);
                }
                else if(group === S) {
                    vars.add(obj.value);
                }
                else if(group === PL) {
                    variables(firstObject(obj.symbols), vars);
                }
                else if(group === EX) { 
                    if(!isNaN(obj.value)) vars.add(obj.value);
                    variables(obj.power, vars);
                }
                else if(group === FN) {
                    for(var i=0; i<obj.args.length; i++) {
                        variables(obj.args[i], vars);
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
            //https://gist.github.com/kcrt/6210661
            erf: function(x){
                // erf(x) = 2/sqrt(pi) * integrate(from=0, to=x, e^-(t^2) ) dt
                // with using Taylor expansion,
                // = 2/sqrt(pi) * sigma(n=0 to +inf, ((-1)^n * x^(2n+1))/(n! * (2n+1)))
                // calculationg n=0 to 50 bellow (note that inside sigma equals x when n = 0, and 50 may be enough)
                var m = 1.00,
                    s = 1.00,
                    sum = x * 1.0;
                for(var i = 1; i < 50; i++){
                m *= i;
                s *= -1;
                sum += (s * Math.pow(x, 2.0 * i + 1.0)) / (m * (2.0 * i + 1.0));
                }
                return 2 * sum / Math.sqrt(3.14159265358979);
            },
            fact: function(x) {
                var retval=1;
                for (var i = 2; i <= x; i++) retval = retval * i;
                return retval;
            },
            mod: function(x, y) {
                return x % y;
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
                    a = args[i].gcd(a);
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
            }
        };
        
        //safeties
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
            return obj.toString();
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
            return this.symbol.text();
        },
        
        toDecimal: function() {
            return this.symbol.toDecimal();
        },
        
        isFraction: function() {
            return isFraction(this.symbol);
        },
        
        isPolynomial: function() {
            return this.symbol.isPoly();
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
        }
        /*cache: (function() {
            var c = {}, n = 100;
            for (var i=0; i<n; i++) {
                for(var j=0; j<n; j++) {
                    //skip 1
                    if(1 !== j) {
                        var dec = i/j;
                        if(typeof dec !== 'undefined') c[dec] = [i, j];
                    }
                }
            }
            
            return c;
        })() */
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
        isPi: function() {
            return this.value === 'pi';
        },
        isE: function() {
            return this.value === 'e';
        },
        isConstant: function() {
            return this.value === CONST_HASH;
        },
        isInteger: function() {
            return this.isConstant() && this.multiplier.isInteger();
        },
        isLinear: function() {
            return this.power.equals(1);
        },
        multiplyPower: function(p2) {
            //leave out 1
            if(this.group === N && this.multiplier.equals(1)) return this;
            
            var p1 = this.power;
            
            if(p2.group === N) {
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
            for(var x in this.symbols) {
                fn.call(this, this.symbols[x], x);
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
            if(this.symbols) {
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
            if(this.symbols && this.power.equals(1) && this.group !== CB) {
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
                    this.previousGroup = this.group;
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
                    var existing = this.symbols[key]; //check if there's already a symbol there
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
                            if(this.length === 0) this.convert(N);
                            this.length--;
                            //clean up
                        }
                        
                        //move the multiplier to the upper symbol
                        
                        //don't insert the symbol if it's 1
                        if(!symbol.isOne(true)) {
                            this.symbols[key] = symbol;
                            this.length++;
                        }
                        else if(symbol.multiplier.lessThan(0)) {
                             this.negate(); //put back the sign
                        }
                    }
                    
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
        collectSymbols: function(fn, opt) { 
            var collected = [];
            for(var x in this.symbols) {
                var symbol = this.symbols[x];
                collected.push( fn ? fn(symbol, opt) : symbol );
            }
            return collected.sort();//sort hopefully gives us some sort of consistency
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
        /**
         * Get's the denominator of the symbol if the symbol is of class CB (multiplication)
         * with other classes the symbol is either the denominator or not. 
         * Take x^-1+x^-2. If the symbol was to be mixed such as x+x^-2 then the symbol doesn't have have an exclusive
         * denominator and has to be found by looking at the actual symbols themselves.
         */
        getDenom: function() {
            if(this.group === CB) {
                for(var x in this.symbols) {
                    if(this.symbols[x].power < 0) return this.symbols[x];
                }
            }
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
        var operators = {
                '^': new Operator('^', 'pow', 4, false, false),
                '*': new Operator('*', 'multiply', 3, true, false),
                '/': new Operator('/', 'divide', 3, true, false),
                '+': new Operator('+', 'add', 2, true, true),
                '-': new Operator('-', 'subtract', 2, true, true),
                ',': new Operator(',', 'comma', 1, true, false)
            },

            // Supported functions.
            // Format: function_name: [mapped_function, number_of_parameters]
            functions = this.functions = {
                'cos'       : [ , 1],
                'sin'       : [ , 1],
                'tan'       : [ , 1],
                'sec'       : [ , 1],
                'csc'       : [ , 1],
                'cot'       : [ , 1],
                'acos'      : [ , 1],
                'asin'      : [ , 1],
                'atan'      : [ , 1],
                'sinh'      : [ , 1],
                'cosh'      : [ , 1],
                'tanh'      : [ , 1],
                'asinh'     : [ , 1],
                'acosh'     : [ , 1],
                'atanh'     : [ , 1],
                'exp'       : [ , 1],
                'min'       : [ , -1],
                'max'       : [ ,-1],
                'erf'       : [ , 1],
                'floor'     : [ ,1],
                'ceil'      : [ ,1],
                'fact'      : [ , 1],
                'round'     : [ , 1],
                'mod'       : [ , 2],
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
                'vecget'    : [vecget, 2],
                'vecset'    : [vecset, 3]
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
                        var f = Math[fn_name] ? Math[fn_name] : Math2[fn_name];
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
            //Replace n! to fact(n!)
            expression_string = insertFactorial(expression_string);
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
                    .replace( /\)\(/g, ')*(' );

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
                var operator = operators[cur_char], //a possible operator
                    bracket = brackets[cur_char]; //a possible bracket
                //if the character is a bracket or an operator but not a scientific number
                if(operator || bracket) {
                    //if an operator is found then we assume that the preceeding is a variable.
                    //the token has to be from the last position up to the current position
                    var token = expression_string.substring(pos,curpos),
                        isSquareBracket = bracket === LEFT_SQUARE_BRACKET;
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
            return _.symfunction(ABS, [symbol]);
        }
        
        /**
         * It just raises the symbol's power to 1/2
         * @param {Symbol} symbol
         * @returns {Symbol}
         */
        function sqrt(symbol) { 
            if(Settings.PARSE2NUMBER && symbol.isConstant()) return new Symbol(Math.sqrt(symbol.multiplier.toDecimal()));
            
            var img, retval, 
                isConstant = symbol.isConstant();
        
            if(symbol.group === CB && symbol.isLinear()) {
                var m = sqrt(Symbol(symbol.multiplier));
                symbol.each(function(x) {
                    m = _.multiply(m, sqrt(x));
                });
                
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
                    m = _.symfunction(SQRT, [new Symbol(q)]);
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
        
        /**
         * Expands a symbol
         */
        function expand(symbol) { 
            var p = symbol.power,
                m = symbol.multiplier,
                pn = Number(p);
            
            //expand all the symbols
            symbol.each(function(x, y) {
                this.symbols[y] = expand(x);
            });
            
            symbol = _.parse(symbol);
            
            if(isInt(p) && pn > 0 && symbol.isComposite()) {
                //leave original untouched
                symbol = symbol.toLinear().toUnitMultiplier();

                var result = symbol.clone();
                for(var i=0; i<pn-1; i++) {
                    var t = new Symbol(0); 
                    symbol.each(function(x) { 
                        result.each(function(y) { 
                            var r = _.multiply(x.clone(), y.clone());
                            if(r.group === CB) r = expand(r);
                            t = _.add(t, r);
                        });
                    });
                    result = t;
                }
                
                //put back the multiplier
                result.each(function(x) {
                    x.multiplier = x.multiplier.multiply(m);
                });

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
                    sub.power = sub.power.multiply(sp);
                }
                symbol.toLinear();
                
                //I'm going to be super lazy here and take the easy way out. TODO: do this without re-parsing
                symbol = _.parse(symbol.text());
                
                if(!hascomposites) return symbol; //nothing to do here
                
                var result = new Symbol(0);
                var composites = [],
                    non_composites = new Symbol(symbol.multiplier);

                //sort them out
                symbol.each(function(x) { 
                    if(x.isComposite()) {
                        var p = x.power, isDenom = false;;
                        if(isInt(p)) {
                            if(p < 0) {
                                x.power.negate();
                                isDenom = true;
                            }
                            x = expand(x);
                        }
                        
                        if(isDenom) {
                            x.power.negate();
                            non_composites = _.multiply(non_composites, x);
                        }
                        else composites.push(x);
                    }
                    else non_composites = _.multiply(non_composites, x);
                });

                //multiply out the remainder
                var l = composites.length;
                    //grab the first symbol since we'll loop over that one to begin
                result = composites[0];
                for(var i=1; i<l; i++) {
                    var t = new Symbol(0);
                    var s = composites[i];
                    result.each(function(x) { 
                        s.each(function(y) {
                            t = _.add(t, _.multiply(x.clone(),y.clone() ));
                        });
                    });
                    result = t;
                }

                var finalResult = new Symbol(0);
                //put back the multiplier
                result.each(function(x) { 
                    finalResult = _.add(finalResult, expand(_.multiply(non_composites, x)));
                });

                symbol = finalResult;
            }

            return symbol;
        }
        
        function vecget(vector, index) {
            return vector.elements[index];
        }
        
        function vecset(vector, index, value) {
            vector.elements[index] = value;
            return vector;
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
                if(g1 < g2 || (g1 === g2 && ap > bp)) return this.add(b, a);
                
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
                    h1, h2, result;

                if(a.isComposite()) h1 = text(a, 'hash');
                if(b.isComposite()) h2 = text(b, 'hash');

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
                        result.multiplier = result.multiplier.add(b.multiplier);
                    }
                }
                //equal values uneven powers
                else if(valEQ && g1 !== PL) { 
                    result = Symbol.shell(PL).attach([a, b]);
                    //update the hash
                    result.value = g1 === PL ? h1 : v1;
                }
                else if(a.isComposite() && a.isLinear()) { 
                    var canIterate = g1 === g2,
                        bothPL = g1 === PL && g2 === PL; 

                    //we can only iterate group PL if they values match
                    if(bothPL) canIterate = a.value === b.value;
                    //distribute the multiplier over the entire symbol
                    a.distributeMultiplier();

                    if(b.isComposite() && b.isLinear() && canIterate) {
                        b.distributeMultiplier();
                        //CL
                        b.each(function(x) {
                            a.attach(x);
                        });
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
                            a = new Matrix(a.elements);
                            b = a.add(b);
                        }
                        else if(isMatrix(a) && isVector(b)) {
                            b = new Matrix(b.elements);
                            b = a.add(b);
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
                else if(isMatrix(a) && isMatrix(b)) {
                    var rows = a.rows();
                    if(rows === b.rows() && a.cols() === b.cols()) {
                        b.eachElement(function(x, i, j) {
                            return _.subtract(x, a.elements[i][j]);
                        });
                    }
                    else _.error('Matrix dimensions do not match!');
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

                var v1 = a.value,
                    v2 = b.value,
                    sign = new Frac(a.multiplier.lessThan(0) ? -1 : 1),
                    //since P is just a morphed version of N we need to see if they relate
                    ONN = (g1 === P && g2 === N && b.multiplier.equals(a.value)),
                    //don't multiply the multiplier of b since that's equal to the value of a
                    m = ONN ? new Frac(1).multiply(a.multiplier).abs() : a.multiplier.multiply(b.multiplier).abs(),
                    result = a.clone().toUnitMultiplier();

                b = b.clone().toUnitMultiplier(true);

                //same issue with (x^2+1)^x*(x^2+1)
                //EX needs an exception when multiplying because it needs to recognize
                //that (x+x^2)^x has the same hash as (x+x^2). The latter is kept as x
                if(g2 === EX && b.previousGroup === PL && g1 === PL) {
                    v1 = text(a, 'hash', EX);
                }

                if((v1 === v2 || ONN) && !(g1 === PL && (g2 === S || g2 === P)) && !(g1 === PL && g2 === CB)) { 
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
                    
                    //the sign for b is floating around. Remember we are assuming that the odd variable will carry
                    //the sign but this isn't true if they're equals symbols
                    result.multiplier = result.multiplier.multiply(b.multiplier);
                    
                }
                else if(g1 === CB && a.isLinear()){ 
                    if(g2 === CB && b.isLinear()) { 
                        b.each(function(x) {
                            result = result.combine(x);
                        });
                        result.multiplier = result.multiplier.multiply(b.multiplier);
                    }
                    else { 
                        result.combine(b);
                    }
                }
                else {
                    //the multiplier was already handled so nothing left to do
                    if(g1 !== N) { 
                        if(!b.isOne()) result = Symbol.shell(CB).combine([result, b]);
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
                            a = new Matrix(a.elements);
                            b = a.multiply(b);
                        }
                        else if(isMatrix(a) && isVector(b)) {
                            b = new Matrix(b.elements);
                            b = a.multiply(b);
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
                    result = new Symbol(Math.pow(a.multiplier.toDecimal(), b.multiplier.valueOf()));
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
                    if(bIsConstant) {
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
            var n1 = 0, d1 = 1, n2 = 1, d2 = 0, n = 0, q = dec, epsilon = 1e-13;
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


                var retval = (negative ? '-': '')+this.set(m_array, v_array, p_array);

                return retval.replace(/\+\-/gi, '-');
            }
                
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
                v[index] = value;
            }
            else if(group === FN || previousGroup === FN) { 
                var name,
                    input = [],
                    fname = symbol.fname;
                //collect the arguments
                for(var i=0; i<symbol.args.length; i++) {
                    input.push(this.latex(symbol.args[i], option));
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
                else { 
                    var name = '\\mathrm'+this.braces(fname);
                    v[index] = name+this.brackets(input.join(','), 'parens');
                }  
            }
            else if(symbol.isComposite()) { 
                var collected = symbol.collectSymbols().sort(
                        group === CP || previousGroup === CP ? 
                        function(a, b) { return a.group < b.group;}:
                        function(a, b) { return a.power < b.power;}
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
                            var idx = map[i];
                            container[idx] = LaTeX.brackets(container[idx], 'parens');
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
        set: function(m, v, p, negative) { 
            var isBracketed = function(v) {
                return /^\\left\(.+\\right\)$/.test(v);
            };
            //format the power if it exists
            if(p) p = this.formatP(p);
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
            if(top && bottom) return this.frac(top, bottom);
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
            var n = f.num, 
                d = f.den; 
            //no need to have x^1
            if(is_pow && n == 1 && d == 1) return '';
            //no need to have x/1
            if(d == 1) return n;
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
                    _subtract(_.multiply(A[1], B[2]), _.multiply(A[2], B[1])),
                    _subtract(_.multiply(A[2], B[0]), _.multiply(A[0], B[2])),
                    _subtract(_.multiply(A[0], B[1]), _.multiply(A[1], B[0]))
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
            if(!this.elements[row]) this.elements[row] = [];
            this.elements[row][column] = new Symbol(value);
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
        each: function(fn) {
            var nr = this.rows(),
                nc = this.cols(), i, j;
            for(i=0; i<nr; i++) {
                for(j=0; j<nc; j++) {
                    fn(this.elements[i][j], i, j);
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
                var M = this.augment(Matrix.identity(ni)).toRightTriangular(); 
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
                        els.push(_.subtract(M.elements[j][p],_.multiply(M.elements[i][p], M.elements[j][i])));
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
        multiply: function(matrix) {    
            return block('SAFE', function(){
                var M = matrix.elements || matrix;
                if (!this.canMultiplyFromLeft(M)) { return null; }
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
            return s.join(','+newline);
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
     * @param {String} Output format. Can be 'object' (just returns the VARS object), 'text' or 'latex'. Default: 'text'
     * @returns {Object} Returns an object with the variables
     */    
    libExports.getVars = function(output) {
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

if((typeof module) !== 'undefined') {
    module.exports = nerdamer;
}
