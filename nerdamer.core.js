/*
* Author : Martin Donk
* Website : http://www.nerdamer.com
* Email : martin.r.donk@gmail.com
* License : http://opensource.org/licenses/LGPL-3.0
* Source : https://github.com/jiggzson/nerdamer
*/

var nerdamer = (function() {
    
    var version = '0.5.1',
        _ = new Parser(), //nerdamer's parser
    
        Groups = {},
        
        //this is the class which holds the utilities which are exported to the core
        //All utility functions which will be available to the core should be added to this object
        Utils = {},
        
        //Settings
        Settings = {},

        //Add the groups. These have been reorganized in v0.5.1 to make CP the highest group
        //The groups that help with organizing during parsing. Note that for FN is still a function even 
        //when raised to a symbol which typically results in an EX
        N   = Groups.N  = 1, // A number
        S   = Groups.S  = 2, // A single variable e.g. x
        EX  = Groups.EX = 3, // A symbol/expression with an exponent that is not a number e.g. x^y
        FN  = Groups.FN = 4, // A function
        PL  = Groups.PL = 5, // A symbol/expression having same name with different powers e.g. 1/x + x^2
        CB  = Groups.CB = 6, // A symbol/expression composed of one or more variables through multiplication e.g. x*y
        CP  = Groups.CP = 7, // A symbol/expression composed of one variable and any other symbol or number x+1 or x+y
        
        
        //GLOBALS
        PARENTHESIS = 'parens',

        //the function which represent vector
        VECTOR = 'vector',

        SQRT = 'sqrt',

        //the storage container "memory" for parsed expressions
        EQNS = [];

        //the global used to invoke the libary to parse to a number
        Settings.PARSE2NUMBER = false;
        
        //this flag forces the a copy to be returned when add, subtract, etc... is called
        //Not very efficient at the moment
        Settings.SAFE = false;

        //the container used to store all the reserved functions
        var RESERVED = [],
        
        isReserved = Utils.isReserved = function(value) { 
            return RESERVED.indexOf(value) !== -1;
        },

        // Enforces rule: must start with a letter and can have any number of underscores or numbers after.
        validateName = Utils.validateName = function(name, type) { 
            type = type || 'variable';
            var regex = /^[a-z_][a-z\d\_]*$/gi;
            if(!(regex.test( name)) ) {
                throw new Error(name+' is not a valid '+type+' name');
            }
        },
        
        isFraction = Utils.isFraction = function(num) {
            if(isSymbol(num)) return isFraction(num.multiplier);
            return (num % 1 !== 0);
        },

        isSymbol = Utils.isSymbol = function(obj) {
            return (obj instanceof Symbol);
        },
        
        isVector = Utils.isVector = function(obj) {
            return (obj instanceof Vector);
        },
        
        isNumericSymbol = Utils.isNumericSymbol = function(symbol) {
            return symbol.group === N;
        },

        isArray = Utils.isArray = function(arr) {
            return arr instanceof Array;
        },

        isInt = Utils.isInt = function(num) {
            return num % 1 === 0;
        },

        isNegative = Utils.isNegative = function(obj) {
            if( isSymbol(obj) ) {
                obj = obj.multiplier;
            }
            return obj < 0;
        },
        
        isComposite = Utils.isComposite = function(symbol) {
            return (symbol.group === PL || symbol.group === CP);
        },
        
        inBrackets = Utils.inBrackets = function(str) {
            return '('+str+')';
        },
        
        customType = Utils.customType = function(obj) {
            return obj !== undefined && obj.custom;
        },
        
        sameSign = Utils.sameSign = function(a, b) {
            return (a < 0) === (b < 0);
        },
        
        format = Utils.format = function() {
            var args = [].slice.call(arguments),
                str = args.shift();
                return str.replace(/{(\d+)}/g, function(match, index) {
                    return args[index];
                });
        },
        
        keys = Utils.keys = function( obj ) {
            var k = [];
            for( var key in obj ) { k.push( key ); }
            return k;
        },
        
        // Items are do not have a fixed order in objects so only use if you need any first random item in the object
        firstObject = Utils.firstObject = function(obj) {
            for( var x in obj ) break;
            return obj[x];
        },
        
        arrayMax = Utils.arrayMax = function(arr) {
            return Math.max.apply(undefined, arr);
        },

        arrayMin = Utils.arrayMin = function(arr) {
            return Math.min.apply(undefined, arr);
        },
        
        round = Utils.round = function( x, s ) { 
            s = s || 14;
            return Math.round( x*Math.pow( 10,s ) )/Math.pow( 10,s );
        },
        
        // Inserts an object into an array or recursively adds items if an array is given
        insertArray = Utils.insertArray = function( arr, item, index, unpackArray ) {
            unpackArray = unpackArray === false ? unpackArray : true;

            if( isArray( item ) && unpackArray ) {
                for( var i=0; i<=item.length+1; i++ ){
                    insertArray( arr, item.pop(), index );
                }
            }
            else if( typeof index === 'undefined ') {
                arr.push( item );
            }
            else{
                arr.splice( index, 0, item );
            }
        },
        
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
                if(group === CP || group === CB || prevgroup === CP || prevgroup === CB) {
                    for(var x in obj.symbols) variables(obj.symbols[x], vars);
                }
                else if(group === S || group === PL) {
                    vars.add(obj.value);
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
        
        each = Utils.each = function(obj, fn) {
            if(isArray(obj)) {
                var l = obj.length;
                for(var i=0; i<l; i++) fn.call(obj, i);
            }
            else {
                for(var x in obj) if(obj.hasOwnProperty(x)) fn.call(obj, x);
            }
        },
        
        even = Utils.even = function(num) {
            return num % 2 === 0;
        },
        
        evenFraction = Utils.evenFraction = function(num) {
            return 1/( num % 1) % 2 === 0;
        },
        
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
        
        // Removes an item from either an array or an object.
        // If an array the index must be specified after the array.
        // If an object the key must be specified
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
        
        block = Utils.block = function(setting, f, opt, obj) {
            var current_setting = Settings[setting];
            Settings[setting] = opt === undefined ? true : !! opt;
            var retval = f.call(obj);
            Settings[setting] = current_setting;
            return retval;
        },

        arguments2Array = Utils.arguments2Array = function(obj) {
            return [].slice.call(obj);
        },
        
        format_subs = function(subs) {
            for(var x in subs) subs[x] = _.parse(subs[x].toString());
            return subs;
        },
        
        //Inverse trig functions
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
                var args = [].slice.call(arguments)
                        .map(function(x){ return Math.abs(x); }).sort(),
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
            }
        };
        reserveNames(Math2); //reserve the names in Math2
        
    /* GLOBAL FUNCTIONS */
    function text(obj, option) { 
        var asHash = (option === 'hash'),
            finalize = option === 'final';
        //if the object is a symbol
        if(isSymbol(obj)) { 
            var multiplier = '', 
            power = '',
            sign = '',
            group = obj.group,
            value = obj.value;
            //if the value is to be used as a hash then the power and multiplier need to be suppressed
            if(!asHash) { 
                var om = obj.multiplier;
                if(om === -1) {
                    sign = '-';
                    om = 1;
                }
                //only add the multiplier if it's not 1
                if(om !== 1) multiplier = om;

                var p = obj.power;
                //only add the multiplier 
                if(p !== 1) {
                    //is it a symbol
                    if(isSymbol(p)) {
                        power = text(p);
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
                    value = obj.multiplier === -1 ? 1 : obj.multiplier;
                    power = '';
                    break;
                case PL:
                    value = obj.collectSymbols(text).join('+').replace('+-', '-');
                    break;
                case CP:
                    value = obj.collectSymbols(text).join('+').replace('+-', '-');
                    break;
                case CB: 
                    value = obj.collectSymbols(function(symbol){
                        var g = symbol.group;
                        //both groups will already be in brackets if their power is greater than 1
                        //so skip it.
                        if((g === PL || g === CP) && (symbol.power === 1 && symbol.multiplier === 1)) {
                            return inBrackets(text(symbol));
                        }
                        return text(symbol);
                    }).join('*');
                    break;
                case EX:
                    var pg = obj.previousGroup,
                        pwg = obj.power.group;
                    //PL are the exception. It's simpler to just collect and set the value
                    if(pg === PL) value = obj.collectSymbols(text).join('+').replace('+-', '-');
                    if(!(pg === N || pg === S || pg === FN)) { value = inBrackets(value); }
                    if((pwg === CP || pwg === CB || pwg === PL || obj.power.multiplier !== 1) && power) {
                        power = inBrackets(power);
                    }
                    break;
            }


            //the following groups are held together by plus or minus. The can be raised to a power or multiplied
            //by a multiplier and have to be in brackets to preserve the order of precedence
            if(((group === CP || group === PL) && (multiplier && multiplier !== 1)) 
                    || ((group === CB || group === CP || group === PL) && (power && power !== 1))
                    || obj.baseName === PARENTHESIS) { 
                value = inBrackets(value);
            }

            if(power < 0) power = inBrackets(power);
            if(multiplier) multiplier = multiplier + '*';
            if(power) power = '^' + power;

            return sign+multiplier+value+power;
        }
        else {
            return obj;
        }
    }
    Utils.text = text;
    /* END GLOBAL FUNCTIONS */
    
    /* CLASSES */
    function Collector(extra_conditions) {
        this.c = [];
        this.add = function(value) {
            var condition_true = extra_conditions ? extra_conditions(value) : true;
            if(this.c.indexOf(value) === -1 && condition_true) this.c.push(value);
        };
    }
    
    function Func(fn_name) {
        this.name = fn_name;
    }
    
    /** 
     * 
     * @param {Symbol} symbol
     * @returns {Expression} wraps around the Symbol class
     */
    function Expression(symbol) {
        this.symbol = symbol;
    }
    
    Expression.prototype = {
        text: function() {
            return this.symbol.text('final');
        },
        
        latex: function() {
            return Latex.latex(this.symbol);
        },
        
        valueOf: function() {
            return this.symbol.valueOf();
        },
        
        evaluate: function(subs) {
            var self = this;
            return new Expression(block('PARSE2NUMBER', function() {
                return _.parse(self.symbol.text(), format_subs(subs));
            }, true));
        },
        
        buildFunction: function(vars) {
            return build(this.symbol, vars);
        },
        
        isNumber: function() {
            return isNumericSymbol(this.symbol);
        },
        
        toString: function() {
            return this.symbol.text();
        }
    };
    /**
     * 
     * @param {String} obj An attempt to get objects to behave somewhat as "real" symbols
     * @returns {Symbol}
     */
    function Symbol(obj) { 
        //this enables the class to be instanciated without the new operator
        if(!(this instanceof Symbol)) { return new Symbol(obj); };
        
        //define numeric symbols
        if(!isNaN(obj)) {
            this.group = N;
            this.value = '#'; 
            this.multiplier = Number(obj);
        }
        //define symbolic symbols
        else {
            //imaginary values. 
            if(obj === 'i') {
                this.isImgSymbol = true;
            }
            this.group = S; 
            validateName(obj); 
            this.value = obj;
            this.multiplier = 1;
            this.power = 1;
        }
        // Added to silence the strict warning.
        return this; 
    }
    
    Symbol.prototype = {
        coeffs: function() {
            var c = [];
            if(this.symbols) {
                for(var x in this.symbols) {
                    c.push(this.symbols[x].multiplier);
                }
            }
            else c.push(this.multiplier);
            return c;
        },
        equals: function(symbol) {
            return this.value === symbol.value && text(this.power) === text(symbol.power);
        },
        isPoly: function() {
            var status = false;
            if( this.group === S && this.power > 0 || this.group === N) {
                status = true;
            }
            else {
                var k = keys( this.symbols ).sort(),
                    kl = k.length;
                 //the following assumptions are made in the next check
                 //1. numbers are represented by an underscore
                 //2. variable and function names must start with a letter
                if(kl === 2 && k[0] === '#') { 
                    status = this.symbols[k[1]].isPoly();
                }
                else if( this.group === PL ) { 
                    status = true;
                    for( var i=0; i<kl; i++ ) {
                        if( k[i] < 0 ) { status = false; }
                    }
                }
            }
            return status;
        },
        isInverse: function() {
            if(this.group === EX) return (this.power.multiplier < 0);
            return this.power < 0;
        },
        // Copies over a predefined list of properties from one symbol to another.
        copy: function() { 
            var copy = new Symbol(0),
                //list of properties excluding power as this may be a symbol and would also need to be a copy.
                properties = [
                    'multiplier', 'value', 'group', 'length', 'previousGroup', 'isImgSymbol', 'baseName', 'args'],
                l = properties.length, i;
            if(this.symbols) {
                copy.symbols = {};
                for(var x in this.symbols) {
                    copy.symbols[x] = this.symbols[x].copy();
                }
            }

            for(i=0; i<l; i++) {
                if(this[properties[i]] !== undefined) {
                    copy[properties[i]] = this[properties[i]];
                }
            }

            if(this.power) {
                copy.power = isSymbol(this.power) ? this.power.copy() : this.power;
            }
            return copy;
        },
        each: function(fn) {
            for(var x in this.symbols) {
                fn.call(this, this.symbols[x], x);
            }
        },
        valueOf: function() {
            if(this.group === N) { return this.multiplier; }
            else if(this.power === 0){ return 1; }
            else if(this.multiplier === 0) { return 0; }
            else { return text(this); }
        },
        //a function to help sniff out symbols in complex symbols
        //pass in true as second parameter to include exponentials
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
        negate: function() { 
            this.multiplier *= -1;
            if(this.group === CP || this.group === PL) this.distributeMultiplier();
            return this;
        },
        invert: function(power_only) {
            //invert the multiplier
            if(!power_only) this.multiplier = 1/this.multiplier;
            //invert the rest
            if(isSymbol(this.power)) {
                this.power.negate();
            }
            else {
                if(this.power) this.power *= -1;
            }
            return this;
        },
        distributeMultiplier: function() {
            if(this.symbols && this.power === 1 && this.group !== CB) {
                for(var x in this.symbols) {
                    var s = this.symbols[x];
                    s.multiplier *= this.multiplier;
                    s.distributeMultiplier();
                }
                this.multiplier = 1;
            }

            return this;
        },
        distributeExponent: function() {
            if(this.power !== 1) {
                var p = this.power;
                for(var x in this.symbols) {
                    var s = this.symbols[x];
                    if(s.group === EX) {
                        s.power = _.multiply(s.power, new Symbol(p));
                    }
                    else {
                        this.symbols[x].power *= p;
                    }
                }
                this.power = 1;
            }
            return this;
        },
        convert: function(group) { 
            if(group > FN) { 
                //make a copy of this symbol;
                var cp = this.copy();
                //attach a symbols object and upgrade the group
                this.symbols = {};

                if(group === CB) {
                    //symbol of group CB hold symbols bound together through multiplication
                    //because of commutativity this multiplier can technically be anywhere within the group
                    //to keep track of it however it's easier to always have the top level carry it
                    cp.multiplier = 1;
                }
                else {
                    //reset the symbol
                    this.multiplier = 1;
                }

                if(this.group === FN) {
                    cp.args = this.args; 
                    delete this.args;
                    delete this.baseName;
                }

                //the symbol may originate from the symbol i but this property no longer holds true
                //after copying
                if(this.isImgSymbol) delete this.isImgSymbol;

                this.power = 1;
                //attach a copy of this symbol to the symbols object using its proper key
                this.symbols[cp.keyForGroup(group)] = cp; 
                this.group = group;
                //objects by default don't have a length property. However, in order to keep track of the number
                //of sub-symbols we have to impliment our own.
                this.length = 1;    
            }
            else if(group === EX) {
                //1^x is just one so check and make sure
                if(!(this.group === N && Math.abs(this.multiplier) === 1)) {
                    this.previousGroup = this.group;
                    if(this.group === N) {
                        this.value = this.multiplier;
                        this.multiplier = 1;
                    }
                    
                    this.group = EX;
                }
            }
            else if(group === N) {
                for(var x in this) {
                    if(this.hasOwnProperty(x) && (x !== 'value' && x !== 'multiplier')) delete this[x];
                }
                this.value = '#';
                this.group = N;
            }
        },
        insert: function(symbol, action) { 
            //this check can be removed but saves a lot of aggravation when trying to hunt down
            //a bug. If left you will instantly know that the error can only be between 2 symbols.
            if(!isSymbol(symbol)) throw new Error('Object '+symbol+' is not of type Symbol!');
            if(this.symbols) {
                var group = this.group;
                if(group > FN) {
                    var key = symbol.keyForGroup(group); 
                    var existing = this.symbols[key]; //check if there's already a symbol there
                    if(action === 'add') {
                        if(existing) { 
                            //add them together using the parser
                            this.symbols[key] = _.add(existing, symbol);
                            //if the addition resulted in a zero multiplier remove it
                            if(this.symbols[key].multiplier === 0) {
                                delete this.symbols[key];
                                this.length--;
                            }
                        }
                        else {
                            this.symbols[key] = symbol;
                            this.length++;
                        }  
                    }
                    else {
                        if(existing) {  
                            //remove because the symbol may have changed
                            symbol = _.multiply(remove(this.symbols, key), symbol);
                            
                            if(this.length === 0) this.convert(N);
                            this.length--;
                            //clean up
                        }
                        //transfer the multiplier
                        this.multiplier *= symbol.multiplier;
                        symbol.multiplier = 1;
                        
                        if(Math.abs(symbol.valueOf()) !== 1) { 
                            if(this.power !== 1) {
                                var cp = this.copy();
                                cp.multiplier = 1; 
                                this.power = 1;
                                this.symbols = {};
                                var key2 = cp.keyForGroup(CB);
                                this.symbols[key2] = cp;
                            }
                            
                            //if the power does not equal to zero then we have to create a new symbol
                            this.symbols[key] = symbol;
                            this.length++;
                        }
                        
                    }
                    //update the hash
                    if(this.group === CP || this.group === CB) {
                        this.updateHash();
                    }
                }
            }
        },  
        attach: function(symbol) {
            this.insert(symbol, 'add');
        },
        combine: function(symbol) {
            this.insert(symbol, 'multiply');
        },
        updateHash: function() {
            if(this.group === FN) {
                var contents = '',
                    args = this.args,
                    is_parens = this.baseName === PARENTHESIS;
                for(var i=0; i<args.length; i++) contents += (i===0 ? '' : ',')+text(args[i]);
                var fn_name = is_parens ? '' : this.baseName;
                this.value = fn_name+(is_parens ? contents : inBrackets(contents));
            }
            else if(!(this.group === S || this.group === PL)) {
                this.value = text(this, 'hash');
            }
        },
        //this function defines how every group in stored within a group of higher order
        keyForGroup: function(group) {
            var g = this.group;
            if(g === N) {
                return this.value;
            }
            else if(g === S) {
                if(group === PL) return this.power;
                else return this.value;
            }
            else if(g === FN) {
                if(group === PL) return this.power;
                return text(this, 'hash');
            }
            else if(g === PL) { 
                //if the order is reversed then we'll assume multiplication
                //TODO: possible future dilemma
                if(group === CB) return text(this, 'hash');
                if(group === CP) {
                    if(this.power === 1) return this.value;
                    else return inBrackets(text(this, 'hash'))+'^'+this.power;
                }
                return this.value;
            }
            else if(g === CP) {
                if(group === CP) return text(this, 'hash');
                if(group === PL) return this.power;
                return this.value;
            }
            else if(g === CB) {
                if(group === PL) return this.power;
                return text(this, 'hash');
            }
            else if(g === EX) {
                if(group === PL) return text(this.power);
                return text(this, 'hash');
            }
        },
        //this function simply collect all the symbols and returns them as an array
        //if a function is supplied then that function is called on the every symbol;
        collectSymbols: function(fn) { 
            var collected = [];
            for(var x in this.symbols) {
                var symbol = this.symbols[x];
                collected.push( fn ? fn(symbol) : symbol );
            }
            return collected.sort();//sort hopefully gives us some sort of consistency
        },
        text: function() {
            return text(this);
        },
        isOne: function() {
            if(this.group === N) return this.multiplier === 1;
            else return this.power === 0;
        },
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
    
    function Operator(val, fn, precedence, left_assoc, is_prefix, is_postfix) {
        this.val = val;
        this.fn = fn;
        this.precedence = precedence;
        this.left_assoc = left_assoc;
        this.is_prefix = is_prefix;
        this.is_postfix = is_postfix || false;
    }

    Operator.prototype = {
        toString: function() { return this.val; }
    };

    function Prefix(val) {
        this.val = val;
    }
    
    Prefix.prototype = {
        resolve: function(obj) {
            if(this.val === '-') {
                return obj.negate();
            }
            return obj;
        }
    };

    
    //Uses modified shunting-yard algorithm. http://en.wikipedia.org/wiki/Shunting-yard_algorithm
    function Parser(){
        var _ = this,
            bin = {},
            constants = this.constants = {
                PI: Math.PI,
                E:  Math.E
            };
        
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
                'exp'       : [ , 1],
                'min'       : [ , -1],
                'max'       : [ ,-1],
                'erf'       : [ , 1],
                'floor'     : [ ,1],
                'ceiling'   : [ ,1],
                'fact'      : [ , 1],
                'mod'       : [ , 2],
                'vector'    : [vector, -1],
                'parens'    : [parens, -1],
                'sqrt'      : [sqrt, 1],
                'log'       : [log , 1],
                'abs'       : [abs , 1]
            };
        
        var brackets = {},

            last_item_in = function(stack) {
                return stack[stack.length-1];
            };
        
        var LEFT_PAREN = '(',
            RIGHT_PAREN = ')',
            LEFT_SQUARE_BRACKET = '[',
            RIGHT_SQUARE_BRACKET = ']';
                
            brackets[LEFT_PAREN] = LEFT_PAREN,
            brackets[RIGHT_PAREN] = RIGHT_PAREN,
            brackets[LEFT_SQUARE_BRACKET] = LEFT_SQUARE_BRACKET,
            brackets[RIGHT_SQUARE_BRACKET] = RIGHT_SQUARE_BRACKET;

        var error = this.error = function(msg) {
            throw new Error(msg);
        };
        
        this.override = function(which, with_what) {
            if(!bin[which]) bin[which] = [];
            bin[which].push(this[which]);
            this[which] = with_what;
        };
        
        this.restore = function(what) {
            if(this[what]) this[what] = bin[what].pop();
        };
        
        this.extend = function(what, with_what) {
            var _ = this,
                extended = this[what];
            if(typeof extended === 'function' && typeof with_what === 'function') {
                var f = this[what];
                this[what] = function(a, b) {
                    if(isSymbol(a) && isSymbol(b)) return f.call(_, a, b);
                    else return with_what.call(_, a, b, f);
                };
            }
        };
        
        this.symfunction = function(fn_name, params) { 
            //call the proper function and return the result;
            var f = new Symbol(fn_name);
            f.group = FN;
            if(typeof params === 'object') params = [].slice.call(params);//ensure an array
            
            f.args = params;
            f.baseName = fn_name;
            f.updateHash();
            return f;
        };

        this.callfunction = function(fn_name, args) { 
            var fn_settings = functions[fn_name];
            
            if(!fn_settings) error(fn_name+' is not a supported function.');
            
            var num_allowed_args = fn_settings[1],
                fn = fn_settings[0],
                retval;

            if(!(args instanceof Array)) args = [args];

            if(num_allowed_args !== -1) {
                var is_array = isArray(num_allowed_args),
                    min_args = is_array ? num_allowed_args[0] : num_allowed_args,
                    max_args = is_array ? num_allowed_args[1] : num_allowed_args,
                    num_args = args.length;
                var error_msg = fn_name+' requires a {0} of {1} arguments. {2} provided!';
                if(num_args < min_args) error(format(error_msg, 'minimum', min_args, num_args));
                if(num_args > max_args) error(format(error_msg, 'maximum', max_args, num_args));
            }
            
            if(fn) { retval = fn.apply(fn_settings[2] || this, args); }
            else {
                if(Settings.PARSE2NUMBER) {
                    try { 
                        args = args.map(function(symbol) { 
                            if(symbol.group === N) return symbol.multiplier;
                            else error('Symbol must be of group N.');
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
        
        this.powerAdd = function(symbol, value, thisIsEX) {
            var isNumeric = !isNaN(value);
            if(!isNumeric || thisIsEX || isSymbol(symbol.power)) {
                var p = !isSymbol(value) ? new Symbol(value) : value;
                symbol.power = _.add(symbol.power, p);
            }
            else {
                symbol.power += value;
            }
            
            if(symbol.power.valueOf() === 0) symbol.convert(N);
        };
        
        this.parse = function(expression_string, substitutions) {  
            expression_string = expression_string.split(' ').join('');//strip empty space
            
            var subs = substitutions || {},
                stack = [],
                output = [],
                len = expression_string.length,
                pos = 0,
                last_opr_pos,
                last_operator,
                last_char,
                EOT = false,
                func_on_stack = false,
                curpos = 0,
                                
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
                        if(EOT) error('Unmatched open parenthesis!');
                        stack.push(operator);
                        insert(symbol1);
                        insert(symbol2);
                    }
                    else {
                        var result = _[operator.fn].call(_, symbol1, symbol2);
                        insert(result);
                    }  
                         
                },

                insert = function(token) { 
                    //when two operators are close to each other then the token will be empty or when we've gone
                    //out of range in the output or stack. We have to make sure the token even exists before entering.
                    if(token !== '' && token !== undefined) { 
                        //this could be function parameters or a vector
                        if(!(token instanceof Array)) { 
                            if(!(token instanceof Symbol) && !(customType(token))) {
                                var sub = subs[token]; //handle substitutions
                                token = sub ? sub.copy() : new Symbol(token);
                            }
                        }
                            
                        //resolve prefixes
                        while(last_item_in(stack) instanceof Prefix) {
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
                if(operator && last_char !== 'e' || bracket) { 
                    //if an operator is found then we assume that the preceeding is a variable
                    //the token has to be from the last position up to the current position
                    var token = expression_string.substring(pos,curpos);
                    
                    
                    if(bracket === LEFT_PAREN && token || bracket === LEFT_SQUARE_BRACKET) {
                        var f = bracket === LEFT_SQUARE_BRACKET ? VECTOR : token;
                        stack.push(new Func(f), LEFT_PAREN);
                        pos = curpos+1;
                        last_opr_pos = curpos; 
                        continue;
                    }
                    //place the token on the output stack. 
                    //This may be empty if we're at a unary or bracket so skip those.
                    insert(token);

                    //if the preceding token is a operator
                    if(!bracket && (curpos-last_opr_pos === 1 || curpos===0)) { 
                        if(operator.is_prefix) {
                            stack.push(new Prefix(operator.val));
                            pos = curpos+1;
                            last_opr_pos = curpos;
                            continue;
                        }
                        error(operator.val+' is not a valid prefix operator!:'+pos); 
                    }
                    
                    if(cur_char !== RIGHT_PAREN) last_opr_pos = curpos; //note that open brackets count as operators in this case

                    if(operator) { 
                        //we may be at the first operator and last operator may be undefined in which case do nothing
                        //other than recording the last operator and placing the operator on the stack.
                        if(last_operator) { 
                            if(operator.left_assoc && operator.precedence <= last_operator.precedence ||
                                    !operator.left_assoc && (operator.precedence < last_operator.precedence)) {
                                var done = false;
                                do {
                                    evaluate(); 
                                    var last = last_item_in(stack); 
                                    //stop when you see a parethesis
                                    if(last === LEFT_PAREN) break;
                                    
                                    done = last ? last.left_assoc && last.precedence < operator.precedence: true;
                                }
                                while(!done);  
                            }
                        }
                        stack.push(operator);
                        last_operator = last_item_in(stack);
                    }
                    else {
                        if(cur_char === LEFT_PAREN) {
                            stack.push(bracket);
                        }
                        else if(cur_char === RIGHT_PAREN || cur_char === RIGHT_SQUARE_BRACKET) { 
                            last_opr_pos = null;
                            var found_matching = false;
                            while(!found_matching) {
                                var popped = stack.pop();

                                if(popped === undefined) error('Unmatched close parenthesis!');

                                if(popped === LEFT_PAREN) found_matching = true;
                                else evaluate(popped);
                            }

                            if(last_item_in(stack) instanceof Func) { 
                                var v = _.callfunction(stack.pop().name, output.pop()); 
                                func_on_stack = true;
                                insert(v);//go directly to output as this will cause the prefix to prematurely be evaluated
                            }
                        }
                        last_operator = last_item_in(stack);
                    } 
                    
                    pos = curpos+1; //move along
                }
                else if(curpos === len-1) {
                    insert(expression_string.substring(pos, curpos+1));
                }
                last_char = cur_char;
            }
            
            EOT = true; //end of stack reached
            
            while(stack.length > 0) { 
                evaluate();
            }
            
            return output[0];
        };

        //FUNCTIONS
        function parens(symbol) {
            if(Settings.PARSE2NUMBER) {
                return symbol;
            }
            return _.symfunction('parens', [symbol]);
        }
        
        function abs(symbol) {
            if(symbol.multiplier < 0) symbol.multiplier *= -1;
            if(isNumericSymbol(symbol)) {
                return symbol;
            }
            return _.symfunction('abs', [symbol]);
        }
        
        function sqrt(symbol) {
            return _.pow(symbol, new Symbol('0.5'));
        }
        
        function log(symbol) { 
            var retval;
            if(symbol.group === FN && symbol.baseName === 'exp') {
                var s = symbol.args[0];
                if(symbol.multiplier === 1) retval = _.multiply(s, new Symbol(symbol.power));
                else retval = _.symfunction('log',[symbol]);
            }
            else if(Settings.PARSE2NUMBER && isNumericSymbol(symbol)) {
                var img_part;
                if(symbol.multiplier < 0) {
                    symbol.negate();
                    img_part = _.multiply(new Symbol(Math.PI), new Symbol('i'));
                }
                retval = new Symbol(Math.log(symbol.multiplier));
                if(img_part) retval = _.add(retval, img_part);
            }
            else {
                retval = _.symfunction('log', arguments); 
                //TODO
//                if(retval.group === FN && retval.args[0].isInverse()) {
//                    retval.args[0].invert(true);
//                    retval.negate();
//                }
            }
            
                
            
            return retval;
        }

        function vector() {
            return new Vector([].slice.call(arguments));
        }
        
        this.ext = {
            log: log,
            sqrt: sqrt,
            abs: abs,
            vector: vector,
            parens: parens
        };
        
        this.mapped_function = function() { 
            var subs = {},
                params = this.params;
            for(var i=0; i<params.length; i++) subs[params[i]] = arguments[i];
            return _.parse(this.body, subs);
        };

        this.unpack = function(symbol) { 
            //we only touch this bad boy if the power is one 
            if(symbol.power === 1) {
                //parens should only carry one symbol
                var unpacked = symbol.args[0];
                unpacked.multiplier *= symbol.multiplier;
                symbol = unpacked;
            }
            return symbol;
        };
        
        this.xSymbol = function(group) {
            var val = 'x',
                shell;
            if(group === FN) {
                shell = new this.symfunction(val, []);
            }
            else if(group) {
                shell = new Symbol(val);
                if(group !== EX) {
                    shell.symbols = {};
                }
                shell.group = group;
            }
            
            return shell;
        };
        
        this.add = function(symbol1, symbol2) { 
            var group1 = symbol1.group, 
                group2 = symbol2.group;

            //deal with zero addition
            if(symbol1.multiplier === 0) return symbol2;
            if(symbol2.multiplier === 0) return symbol1;
            
            //parens is a function that we want to get rid of as soon as possible so check
            if(group1 === FN && symbol1.baseName === PARENTHESIS) symbol1 = this.unpack(symbol1);
            if(group2 === FN && symbol1.baseName === PARENTHESIS) symbol2 = this.unpack(symbol2);
            
            //always have the lower group on the left
            if(group1 > group2) { return this.add(symbol2, symbol1); }
            if(Settings.SAFE){ symbol1 = symbol1.copy(); symbol2 = symbol2.copy(); };
            
            //same symbol, same power
            if(symbol1.value === symbol2.value && !(group1 === CP && symbol1.power !== symbol2.power)) {
                if(symbol1.power === symbol2.power && group2 !== PL /*if group1 is PL then group2 is PL*/
                        || (group1 === EX && symbol1.equals(symbol2))) {
                    symbol1.multiplier += symbol2.multiplier;
                    //exit early
                    if(symbol1.multiplier === 0) symbol1 = Symbol(0);
                }
                else if(group2 === PL) {
                    if(group1 === PL) {
                        if(symbol1.power ===1 && symbol2.power === 1) {
                            symbol1.distributeMultiplier();
                            symbol2.distributeMultiplier();
                            for(var s in symbol2.symbols) {
                                symbol1.attach(symbol2.symbols[s]);
                            }
                        }
                        else if(symbol1.power === symbol2.power) {
                            symbol1.multiplier += symbol2.multiplier;
                        }
                        else {
                            if(symbol1.power > symbol2.power) { var t = symbol1; symbol1 = symbol2; symbol2 = t; /*swap*/}
                            symbol1.convert(CP); 
                            symbol1.attach(symbol2);
                        } 
                    }
                    else {
                        if(symbol2.multiplier === 1) {
                            symbol2.attach(symbol1);
                        }
                        else {
                            //force the multiplier downhill
                            for(var s in symbol2.symbols) {
                                symbol2.symbols[s].multiplier *= symbol2.multiplier;
                            }
                            symbol2.multiplier = 1;
                            symbol2.attach(symbol1);
                        }
                        symbol1 = symbol2;
                    }
                }
                else { 
                    //we checkfor CB on the right or S on the left because we know that the lower group is always 
                    //on the left. This is just an extra precaution
                    symbol1.convert(PL);
                    symbol1.attach(symbol2);
                }
            }
            else if(group2 === CP) { 
                if(group1 === CP) { 
                    if(symbol1.power > symbol2.power) { 
                        var t = symbol1; symbol1 = symbol2; symbol2 = t;/*swap them*/ 
                    }
                    
                    if(symbol1.value === symbol2.value) { 
                        //we checkfor CB on the right or S on the left because we know that the lower group is always 
                        //on the left. This is just an extra precaution
                        symbol1.convert(PL);
                        symbol1.attach(symbol2);
                    }
                    else if(symbol1.power === 1) {
                        //since we swap the symbols to place the lower power symbol on the left we only have to check a
                        if(symbol2.power === 1) { 
                            var s;
                            //distribute the multiplier. The hope is that you don't end up delaying it only to end up with
                            //a very complex symbol in the end. The symbol simplifies immediately if there's any subtraction.
                            symbol1.distributeMultiplier();
                            symbol2.distributeMultiplier();
                            for(s in symbol2.symbols) {
                                //this order is chosen because the chances of the sub-symbol being of a lower
                                //group are higher
                                this.add(symbol2.symbols[s], symbol1);
                            }
                        }
                        else {
                            //but a still has a power of 1 so attach it
                            symbol1.attach(symbol2);
                        }
                    }
                    else { 
                        //aaahhh we've reached the end of the dodging and weaving an it's time to start creating
                        var newSymbol = new Symbol('blank');
                        newSymbol.symbols = {};
                        newSymbol.length = 1;
                        newSymbol.group = CP;
                        newSymbol.attach(symbol1);
                        newSymbol.attach(symbol2);
                        symbol1 = newSymbol;
                    }
                }
                else { 
                    //the way to deal with both N and S is identical when the power is equal to 1
                    //if the CP contains a power of 1 then we can just add directly to it
                    if(symbol2.power === 1) { 
                        //CP symbols can have a multiplier greater than 1 
                        if(symbol2.multiplier === 1) {
                            symbol2.attach(symbol1); 
                        }
                        else {
                            //force the multiplier downhill
                            for(var s in symbol2.symbols) {
                                symbol2.symbols[s].multiplier *= symbol2.multiplier;
                            }
                            symbol2.multiplier = 1;
                            symbol2.attach(symbol1);
                        }   
                        //swap since symbol a is being returned
                        symbol1 = symbol2;
                    }
                    else {
                        symbol1.convert(CP);
                        symbol1.attach(symbol2);
                    }
                    
                }
            }
            else { 
                symbol1.convert(CP); 
                symbol1.attach(symbol2);
            }        
            
            //reduce the symbol
            if((symbol1.group === CP || symbol1.group === PL) && symbol1.length === 1) { 
                for(var x in symbol1.symbols) {
                    var symbol = symbol1.symbols[x];
                    symbol.multiplier *= symbol1.multiplier;
                    symbol1 = symbol;
                }
            }
            
            return symbol1;
        };

        this.subtract = function( symbol1, symbol2) { 
            return this.add(symbol1, symbol2.negate());
        };

        this.multiply = function(symbol1, symbol2) { 
            if(symbol1.multiplier === 0 || symbol2.multiplier === 0) return new Symbol(0);
            var group1 = symbol1.group,
                group2 = symbol2.group;

            //parens is a function that we want to get rid of as soon as possible so check
            if(group1 === FN && symbol1.baseName === PARENTHESIS) symbol1 = this.unpack(symbol1);
            if(group2 === FN && symbol1.baseName === PARENTHESIS) symbol2 = this.unpack(symbol2);
            
            if(symbol1.isImgSymbol && symbol2.isImgSymbol) {
                return new Symbol(-1*symbol1.multiplier*symbol2.multiplier);
            }

            //as with addition the lower group symbol is kept on the left so only one side has to symbol2 e 
            //accounted for. With multiplication however it's easier to return the symbol on the right.
            if(group1 > group2) return this.multiply(symbol2, symbol1);
            
            if(Settings.SAFE){ symbol1 = symbol1.copy(); symbol2 = symbol2.copy(); };

            //the symbol2 ehavior is the same for all symbols of group N. modify the multiplier
            if(group1 === N ) {
                symbol2.multiplier *= symbol1.multiplier;
            }
            else if(symbol1.value === symbol2.value) { 
                if(group1 === S && group2 === EX) { 
                    if(symbol2.previousGroup === PL) {
                        symbol2.convert(CB);
                        symbol2.combine(symbol1);
                    }
                    else {
                        symbol2.power = _.add(symbol2.power, Symbol(symbol1.power));
                    }
                }
                else if(group1 === EX) {
                    if(group2 === PL) { 
                        symbol2.convert(CB);
                        symbol2.combine(symbol1);
                    }
                    else {
                        //both are EX so we're concerned with their previous groups
                        var pg1 = symbol1.previousGroup, pg2 = symbol2.previousGroup;
                        if((pg1 === S || pg1 === N || pg1 === FN) && pg1 === pg1) {
                            symbol2.power = _.add(symbol2.power, symbol1.power);
                        }
                        else if(pg1 === PL && pg1 === pg2) { 
                            if(symbol1.keyForGroup(CB) !== symbol2.keyForGroup(CB)) {
                                symbol2.convert(CB);
                                symbol2.combine(symbol1);
                            }
                            else { 
                                symbol2.power = _.add(symbol2.power, symbol1.power);
                            }
                        }
                        else {
                            symbol2.convert(CB);
                            symbol2.combine(symbol1);
                        }
                    }
                }
                else if(group2 === PL) { 
                    symbol2.distributeMultiplier();
                    if(group1 !== PL) { 
                        if(symbol2.power === 1) {
                            var cp = symbol2.copy();
                            cp.symbols = {};
                            cp.length = 0;
                            for(var s in symbol2.symbols) { 
                                var symbol = remove(symbol2.symbols, s);
                                //keep symbol1 on the left since that's what gets returned
                                var product = _.multiply(symbol1, symbol);
                                //the symbol may no longer be a valid PL e.g (x^2+x)/x yields a CP
                                if(product.value !== cp.value) cp.group = CP;
                                cp.attach(product);
                            }
                            symbol2 = cp;
                        }
                        else {
                            symbol2.convert(CB);
                            symbol2.combine(symbol1);
                        }   
                    }  
                    else { 
                        if(symbol1.value === symbol2.value) {
                            symbol2.power += symbol1.power;
                        }
                        else {
                            symbol2.convert(CB);
                            symbol2.combine(symbol1);
                        }
                    }
                }
                else {
                    
                    symbol2.power += symbol1.power;
                }
                symbol2.multiplier *= symbol1.multiplier;
                //early exit
                if(Number(symbol2.power) === 0) symbol2 = Symbol(symbol2.multiplier);
                
            }
            else if(group1 === CB && group2 === CB) {
                symbol1.distributeExponent();
                symbol2.distributeExponent();
                
                //need cleaning. most redundant code
                if(symbol1.power === 1 && symbol2.power !== 1) { var t = symbol1; symbol1 = symbol2 ; symbol2 = t; }
                
                if(symbol1.power === 1 && symbol2.power === 1) {
                    symbol2.multiplier *= symbol1.multiplier;
                    for(var s in symbol1.symbols) {
                        symbol2.combine(symbol1.symbols[s]);
                    }
                }
                else if(symbol2.power === 1){
                    symbol2.attach(symbol1);
                }
                else {
                    var s = _.xSymbol(CB);
                    s.combine(symbol1);
                    s.combine(symbol2);
                    symbol2 = s;
                }  
            }
            else if(group2 === CB) {
                symbol2.distributeExponent();
                symbol2.combine(symbol1);
            }
            else if(group1 === S && group2 !== CB) {
                symbol1.convert(CB);
                symbol1.combine(symbol2);
                symbol2 = symbol1;
            }
            else { 
                if(group1 === CB) {
                    symbol1.combine(symbol2);
                    symbol2 = symbol1;
                }
                else {
                    symbol2.convert(CB);
                    symbol2.combine(symbol1);
                }   
            }
            if((symbol2.group === CB) && symbol2.length === 1) { 
                for(var x in symbol2.symbols) {
                    var symbol = symbol2.symbols[x];
                    symbol.multiplier *= symbol2.multiplier;
                    symbol2 = symbol;
                }
            }

            return symbol2 ;
        };
        
        this.divide = function(symbol1, symbol2) {
            return this.multiply(symbol1, symbol2.invert());
        };

        this.pow = function(symbol1,symbol2) {
            var numberB = Number(symbol2);
            if(numberB === 1) return symbol1;
            if(numberB === 0) return new Symbol(1);

            //as usual pull the variables closer
            var group1 = symbol1.group, 
                group2 = symbol2.group;
            
            if(Settings.SAFE){ symbol1 = symbol1.copy(); symbol2 = symbol2.copy(); };
            
            if(group1 !== EX && group2 === N) { 
                var power = symbol2.multiplier;
                if(power !== 1) {
                    if(power === 0) {
                        symbol2.mutiplier = 1;
                        symbol1 = symbol2;
                    }
                    else { 
                        //check if the power that we're raising to is even e.g. 2,4,1/2,1/4,5/2,...
                        var isEven = even(power),
                            // Record if we have a negative number as the base.
                            isNegative = symbol1.multiplier < 0,
                            // Make sure that the power is even.
                            powEven =  even(symbol1.power),
                            //check if the power being raised to is a fraction
                            isRadical = Math.abs(power % 1) > 0;
                            
                        if(group1 === N) {
                            var isImaginary = isNegative && isRadical;
                            if(isImaginary) symbol1.multiplier *= -1;
                            symbol1.multiplier = Math.pow(symbol1.multiplier, power);
                            if(isImaginary) {
                                symbol1 = this.multiply(symbol1, new Symbol('i'));
                                if(power < 0) symbol1.negate();
                            }
                        }
                        else { 
                            var sm = symbol1.multiplier,
                                s = Math.pow(Math.abs(sm), power),
                                sign = Math.abs(sm)/sm;
                            symbol1.power *= power;
                            symbol1.multiplier = s;
                            
                            if(isNegative && !isEven) symbol1.multiplier *= sign;
                            
                            if(isRadical && isNegative) { 
                                var m = -symbol1.multiplier;
                                if(powEven) {
                                    symbol1.multiplier = 1;
                                    if(!even(symbol1.power)) {
                                        symbol1 = this.symfunction('abs', [symbol1]);
                                    }
                                    symbol1 = this.multiply(new Symbol('i'), symbol1);
                                }
                                else {
                                    var p = symbol1.power;
                                    symbol1.multiplier /= m;
                                    symbol1.power /= p;
                                    symbol1 = this.symfunction(PARENTHESIS, [symbol1]);
                                    symbol1.power = p;
                                }
                                symbol1.multiplier = m;
                            }
                            if(powEven && isRadical && !even(symbol1.power)) {
                                //we have to wrap the symbol in the abs function to preserve the absolute value
                                var p = symbol1.power; //save the power
                                symbol1.power = 1;
                                symbol1 = _.symfunction('abs',[symbol1]);
                                symbol1.power = p;
                            }
                        }
                    }
                }
                //distribute the power for the CB class
                if(group1 === CB) { 
                    var p = symbol1.power;
                    for(var x in symbol1.symbols) { symbol1.symbols[x].power *= p; }
                    symbol1.power = 1;
                }
            }
            else { 
                var m, spow = symbol1.power;
                //symbol power may be undefined if symbol is of type N
                if(!isSymbol(spow)) spow = new Symbol(spow || 1);

                if(Math.abs(symbol1.multiplier) !== 1) {
                    m = new Symbol(symbol1.multiplier);
                    m.convert(EX);
                    m.power = symbol2.copy();
                    symbol1.multiplier = 1;
                }
                
                if(symbol1.group !== EX) symbol1.convert(EX);

//                if(isNumericSymbol(spow) || isNumericSymbol(symbol2)) { 
                    symbol1.power = this.multiply(spow, symbol2);
                    //reduce symbol to simpler form. 
                    if(symbol1.power.isOne()) {
                        symbol1.group = symbol1.previousGroup;
                        delete symbol1.previousGroup;
                        symbol1.power = 1;
                    }
//                }
//                else {
//                    throw new Error('called')
//                    symbol1 = _.symfunction('parens', [symbol1]);
//                    symbol1.power = symbol2;
//                } 

                if(m) {
                    symbol1 = this.multiply(symbol1, m); 
                }
            }

            return symbol1;
        };
        
        this.comma = function(a, b) { 
            if(a instanceof Array) a.push(b);
            else a = [a,b];
            return a;
        };
    };
    
    /* "STATIC" */
    var Fraction = {
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
        // If the fraction is small or too large this gets called instead of 
        // fullConversion
        quickConversion: function( dec ) {
            var x = (dec.toExponential()+'').split('e');
            var d = x[0].split('.')[1];// get the number of places after the decimal
            var l = d ? d.length : 0; // maybe the coefficient is an integer;
            return [Math.pow(10,l)*x[0], Math.pow(10, Math.abs(x[1])+l)];
        },
        
        fullConversion: function( dec ) {
            //function returns a good approximation of a fraction
            //http://mathforum.org/library/drmath/view/61772.html
            //Decimal To Fraction Conversion - A Simpler Version
            //Dr Peterson
            var done = false;
            //you can adjust the epsilon to a larger number if you don't need very high precision
            var n1 = 0, d1 = 1, n2 = 1, d2 = 0, n = 0, q = dec, epsilon = 1e-13;
            while(!done) {
                n++;
                if( n > 10000 ){
                    done = true;
                }
                var a = parseInt(q);
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
    var Latex = {
        space: '~',
        latex: function(obj, abs, group) {
            abs = abs || false;
            group = group || obj.group; 
            var output = '',
                inBraces = this.inBraces, 
                value;
            if(isSymbol(obj)) { 
                switch(group) {
                    case N:
                        value = obj.multiplier;
                        if(abs) value = Math.abs(value);
                        if(isInt(value)) {
                            output = value;
                        }
                        else {
                            var result = Fraction.convert(value);
                            output = this.fraction(result);
                        }  
                        break;
                    case S:
                        output = this.renderSymbolLatex(obj);
                        break;
                    case FN: 
                        var name = obj.baseName;
                        
                        if(name === PARENTHESIS) name = '';
                        else if(name in Math || name in Math2) name = '\\'+name;

                        var fnInput = obj.args.slice(0).map(function(item) {
                            return Latex.latex(item);
                        });
                        value = name+this.inBrackets(fnInput);
                        output = this.renderSymbolLatex(obj, value, abs);
                        
                        break;
                    case PL:
                        var value = this.renderSubSymbolsLatex(obj, function(a,b) {
                            return a.power < b.power;
                        }, undefined, abs);
                        output = this.renderSymbolLatex(obj, value, abs);
                        break;
                    case CP:
                        value = this.renderSubSymbolsLatex(obj, function(a,b) {
                            return a.group < b.group;
                        }, undefined, abs);
                        output = this.renderSymbolLatex(obj, value, abs);
                        break;
                    case CB:
                        value = this.renderSubSymbolsLatex(obj, function(a,b) {
                            return a.group < b.group;
                        }, true, abs);
                        output = this.renderSymbolLatex(obj,value, abs);
                        break;
                    case EX:
                        var pg = obj.previousGroup;
                        output = pg === FN ? Latex.latex(obj, abs, obj.previousGroup) : 
                                this.renderSymbolLatex(obj, null, abs);
                        break;
                }
            }
            else {
                output = obj;
            }

            return output;
        },
        //renders the sub-symbols in complex symbols
        renderSubSymbolsLatex: function(symbol, sortFunction, suppressPlus, abs) { 
            var subSymbols = symbol.collectSymbols().sort(sortFunction),
                l = subSymbols.length, 
                denom = [], i,
                self = this;
            
            for(i=0; i<l; i++) {
                var s = subSymbols[i];
                if(s.isInverse()) {
                    denom.push(remove(subSymbols, i).copy().invert());
                    i--, l--; //adjust the index and the length since we're one item shorter
                }
            }
            if(sortFunction) {
                subSymbols.sort(sortFunction);
                denom.sort(sortFunction);
            }
            
            function convert(arr) { 
                var i, l = arr.length, rendered = '';
                for(var i=0; i<l; i++) {
                    var curSymbol = arr[i], delimiter;
                    if(curSymbol.multiplier < 0) {
                        delimiter = '-';
                    }
                    else if(suppressPlus){
                        delimiter = '';
                    }
                    else {
                        delimiter = '+';
                    }
                    //leave the negative for the first symbol
                    abs = abs || i > 0;
                    var latex = self.latex(curSymbol, abs);
                    //only add the delimiter to the first one
                    if(i > 0) latex = delimiter+latex;
                    //add it to the total rendered
                    rendered += latex;
                }
                return rendered;
            }
            var num = convert(subSymbols),
                denom = convert(denom);
            if(denom) return format('\\frac{{0}}{{1}}', num, denom);
            else return num;
        },
        //renders the style for the multiplier and power of the symbol.
        renderSymbolLatex: function(symbol, value, abs) {
            if(symbol.group === N) return this.latex(symbol, abs);
            var multiplierArray = Fraction.convert(symbol.multiplier),
                value = value || symbol.value,
                power = symbol.power || '',
                sign = symbol.multiplier < 0 ? '-' : '',//store the sign
                sqrt = Math.abs(power) === 0.5;
            
            //if the latex was requested as absolute value remove the sign
            if(abs) sign = '';
            
            //make the multiplier array positive
            multiplierArray[0] = Math.abs(multiplierArray[0]);
            
            //handle powers
            if(isSymbol(power)) {
                power = this.latex(power, true);
            }
            else {
                if(Math.abs(power) === 1) { 
                    power = '';
                }
                else {
                    var powerArray = Fraction.convert(power);
                    if(powerArray[1] === 1) powerArray.pop();
                    
                    if(symbol.power < 0) {
                        powerArray[0] = Math.abs(powerArray[0]);
                    }
                    power = this.fraction(powerArray);
                }
            }
            
            //remove the one from the base of the fraction
            if(multiplierArray[1] === 1) multiplierArray.pop();
            
            //if there's a power, the location where we attach it depends on the sign of the power.
            //if negative it's bottom, otherwise we attach it to the top.
            var where  = isNegative(symbol.power) ? 1 : 0;
                
            if(multiplierArray[where] === 1) {
                multiplierArray[where] = value;
            }
            else {
                var curValue = multiplierArray[where] ? multiplierArray[where]+this.space : '';
                multiplierArray[where] = curValue+value;
            }
            
            if(power) { 
                multiplierArray[where] = this.inBraces(multiplierArray[where]);
                if(!sqrt) {
                    multiplierArray[where] += '^'+this.inBraces(power);
                }
            }
            
            //write the value into a fraction
            value = this.fraction(multiplierArray);
            var retval = sign+value;
            
            if(sqrt) retval = '\\sqrt'+this.inBraces(retval);
            
            return retval;
        },
        //the fraction method takes an additional crumb parameter which is
        //used to add additional contents after creation
        fraction: function(fractionArray) {
            if(fractionArray.length === 1) return fractionArray[0];
            return '\\frac'+this.inBraces(fractionArray[0])+this.inBraces(fractionArray[1]);
        },
        inBraces: function(contents, index) {
            index = index === undefined ? '' : '$'+index;
            return '{'+contents+index+'}';
        },
        inBrackets: function(contents) {
            return '\\left('+contents+'\\right)';
        },
        write2Fraction: function(fraction, top, bottom) {
            return fraction.replace('$1', top).replace('$2', bottom);
        }
    };
    
    function Vector(v) {
        if(isVector(v)) this.elements = v.items.slice(0);
        else this.elements = v || [];
    }
    Vector.prototype.custom = true;
    /* END CLASSES */

    /* FINALIZE */
    var finalize = function() {
        reserveNames(_.constants);
        reserveNames(_.functions);
    };
    
    var build = Utils.build = function(symbol, arg_array) {
        var args = variables(symbol);
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
                return retval ? inBrackets(retval) : retval;
            },

            ftext_function = function(bn) {
                var retval;
                if(bn in Math) retval = 'Math.'+bn;
                else {
                    //Math2 functions aren't part of the standard javascript
                    //Math library and must be exported.
                    xports.push('var '+bn+' = '+_.Math2[bn].toString()+'; ');
                    retval = bn;
                }
                retval = retval+inBrackets(symbol.args.map(function(x) {
                    return ftext(x, xports)[0];
                }).join(','));
                return retval;
            };

            //the multiplier
            if(group === N) c.push(symbol.multiplier);
            else if(symbol.multiplier === -1) prefix = '-';
            else if(symbol.multiplier !== 1) c.push(symbol.multiplier);
            //the value
            var value = null;

            if(group === S) value = symbol.value;
            else if(group === FN) { 
                value = ftext_function(symbol.baseName);
            }
            else if(group === EX) {
                var pg = symbol.previousGroup;
                if(pg === N || pg === S) value = symbol.value;
                else if(pg === FN) value = ftext_function(symbol.baseName);
                else value = ftext_complex(symbol.previousGroup);
            }
            else {
                value = ftext_complex(symbol.group);
            }     

            if(symbol.power !== undefined && symbol.power !== 1) {
                value = 'Math.pow'+inBrackets(value+','+text(symbol.power));
            }

            if(value) c.push(prefix+value);

            return [c.join('*'), xports.join('').replace(/\n+\s+/g, ' ')];
        };
        if(arg_array) {
            if(args.length !== arg_array.length) throw new Error('Argument array contains wrong number of arguments');
            for(var i=0; i<args.length; i++) {
                var arg = args[i];
                if(arg_array.indexOf(arg) === -1) throw new Error(arg+' not found in argument array');
            }
            args = arg_array;
        }
        var f_array = ftext(symbol);
        return new Function(args, f_array[1]+' return '+f_array[0]+';');
    };
    
    finalize(); //final preparations
    /* END FINALIZE */

    /* BUILD CORE */
    var Core = {};
    Core.groups = Groups;
    Core.Symbol = Symbol;
    Core.Expression = Expression;
    Core.Vector = Vector;
    Core.Parser = Parser;
    Core.Fraction = Fraction;
    Core.Math2 = Math2;
    Core.Latex = Latex;
    Core.Utils = Utils;
    Core.PARSER = _;
    Core.PARENTHESIS = PARENTHESIS;
    Core.Settings = Settings;
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
        var eq = block('PARSE2NUMBER', function(){
            return _.parse(expression, format_subs(subs));
        }, option === 'numer');
        
        if(location) { EQNS[location-1] = eq; }
        else { EQNS.push(eq);}

        return new Expression(eq);
    };
    
    /**
     * 
     * @returns {String} returns the version of nerdamer
     */
    libExports.version = function() {
        return version;
    };
    
    /**
     * 
     * @param {String} constant the name of the constant to be set
     * @param {mixed} value The value of the constant 
     * @returns {nerdamer object}
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
     * @param {String} name the name of the function
     * @param {Array} params_array a list containing the parameter name of the functions
     * @param {String} body the body of the function
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
     * @returns {Core} Exports the nerdamer core functions and objects
     */
    libExports.getCore = function() {
        return Core;
    };

    /**
     * 
     * @param {Integer} expression_number The number of the expression wanted
     * @param {String} asType Get the equation as text or latex text
     * @returns {Expression}
     */
    libExports.getExpression = libExports.getEquation = function(expression_number, asType) {
        asType = asType || 'text';
        var index = expression_number ? expression_number -1 : EQNS.length-1,
            expression = EQNS[index],
            retval = expression ? new Expression(expression) : expression;
        return retval;
    };
    
    /**
     * 
     * @param {Boolean} asArray The returned names are return as an array if this is set to true;
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
     * @param {Boolean} keep_EQNS_fixed use true if you don't want to keep EQNS length fixed
     * @returns {nerdamer object}
     */
    libExports.clear = function( equation_number, keep_EQNS_fixed ) { 
        if(equation_number === 'all') { EQNS = []; }
        else { 
            var index = !equation_number ? EQNS.length : equation_number-1; 
            keep_EQNS_fixed === true ? EQNS[index] = undefined : remove(EQNS, index);
        }   
        return this;
    };
    
    /**
     * 
     * @param {Boolean} asObject
     * @param {Boolean} asLatex
     * @returns {Array}
     */
    libExports.expressions = libExports.equations = function( asObject, asLatex ) {
        var result = asObject ? {} : [];
        for(var i=0; i<EQNS.length; i++) {
            var eq = asLatex ? Latex.latex(EQNS[i]) : text(EQNS[i]);
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
        else if(obj) {
            //if no parent object is provided then the function does not have an address and cannot be called directly
            var parent_obj = obj.parent, 
                fn = obj.build.call(core); //call constructor to get function
            if(parent_obj) {
                if(!core[parent_obj]) core[obj.parent] = {};
                //attach the function to the core
                core[parent_obj][obj.name] = fn;
            }
            if(obj.visible) _.functions[obj.name] = [fn, obj.numargs]; //make the function available
        } 
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
        return EQNS.length;
    };
    /* END EXPORTS */
    
    
    return libExports; //Done
})();
