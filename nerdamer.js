/*
 * Author   : Martin Donk
 * Website  : http://www.nerdamer.com
 * Email    : martin.r.donk@gmail.com
 * License  : http://opensource.org/licenses/LGPL-3.0
 * Source   : https://github.com/jiggzson/nerdamer
 */



var nerdamer = (function( externalMods ) {
    
    "use strict";

    var G = {},
        Calculus    = G.Calculus   = {},
        Algebra     = G.Algebra    = {},
        Formatting  = G.Formatting = {},

        EQNS        = [],
        NUMER       = false,
        RESERVED    = [],
        C           = {},
        version     = '0.4.8',

    /*
     * The groups that help with organizing during parsing. Note that for FN is still a function even 
     * if raised to a symbol of group S.
     * It should be noted that for the sake of simplicity both expression and symbol use the same class.
     * The expressions are basically any other group which is not of group N or group S
     */  
        N   = C.N  = 1, // A number
        S   = C.S  = 2, // A single variable e.g. x
        FN  = C.FN = 3, // A function
        PL  = C.PL = 4, // A symbol/expression having same name with different powers e.g. 1/x + x^2
        CB  = C.CB = 5, // A symbol/expression composed of one or more variables through multiplication e.g. x*y
        CP  = C.CP = 6, // A symbol/expression composed of one variable and any other symbol or number x+1 or x+y
        EX  = C.EX = 7; // A symbol/expression with an exponent that is not a number e.g. x^y

    init();
    
    var operators = {
        ',': {order: 0, fn: null},
        '+': {order: 1, fn: 'add'},
        '-': {order: 2, fn: 'subtract'},
        '*': {order: 3, fn: 'multiply'},
        '/': {order: 4, fn: 'divide'},
        '^': {order: 5, fn: 'pow'}
    },

    // Supported functions.
    // Format: function_name: [mapped_function, number_of_parameters]
    functions = {
        'parens'    : [ , 1],
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
        'log'       : [log , 1],
        'abs'       : [abs , 1],
        'sqrt'      : [sqrt, 1],
        'diff'      : [Calculus.diff       , 2],
        'expand'    : [Algebra.expand, 1],
        'sum'       : [Calculus.sum,   4], 
        'findRoot'  : [Algebra.findRoot,  2] //untested
    },
    
    Math2 = {
        'sec': { fn: function( x ) { return 1/Math.cos( x );}, inv: 'cos' },
        'cot': { fn: function( x ) { return 1/Math.tan( x );}, inv: 'tan' },
        'csc': { fn: function( x ) { return 1/Math.sin( x );}, inv: 'sin' }
    },

    // Define any and all constants here. 
    constants = {
        'PI': Math.PI,
        'E' : Math.E
    };

    
    // Load reserved names into RESERVED
    loadReserved();
    
    // An attempt to get objects to behave somewhat as symbols.
    // Previously an attempt was made to try and separate Symbols from Expressions. For the sake of simplicity, 
    // let's just assume that they're interchangeable and all symbols of a group higher than S are "Expressions".
    function Symbol( value ) {
        if( !( this instanceof Symbol ) ) {
            return new Symbol( value );
        }
        if( !isNaN( value ) ) {
            this.group = N;
            this.value = '_'; 
            this.multiplier = Number( value );
        }
        else {
            //imaginary values. 
            if( value === 'i' ) {
                this.isImaginary = true;
            }
            this.group = S; 
            validateName( value );
            this.value = value;
            this.multiplier = 1;
            this.power = 1;
        }
        // Added to silence the strict warning.
        return this; 
    }
    Symbol.prototype = {
        // This method depends on text in cases where it is important to retain the multiplier.
        // e.g. 2(x+1) and (x+1) the same but the same does not hold true for a function like cos(x) and cos(2x). 
        name: function( baseOnly ) {
            var v, g = this.group, symbol, pw;
            if( g === CB || g === CP || g === PL && this.power !== 1 ) { 
                //the delimiter for joining back the name. Any character excluded from variable names will do really.
                var d = g === CB ? '*' : '+',
                    names = [];
                for( symbol in this.symbols ) {
                    var t = text( this.symbols[symbol] );
                    names.push( this.symbols[symbol].group === CP ? inBrackets( t ) : t );
                }
                v = inBrackets( names.sort().join(d) );
                if( g === CP && this.power !== 1 ) {
                    v = v+ ( baseOnly ? '' : '^('+this.power+')' );
                }
            }
            else if( g === PL ) { 
                for( pw in this.symbols ) {
                    v = this.symbols[pw].value;
                    break;
                }
            }
            else if( g === FN ) {
                v = this.value+inBrackets( text(this.symbols) )+( this.power === 1 ? '' : baseOnly ? '' : '^('+this.power+')' );
            }
            else {
                v = this.value;
            }
            return v;
        },
        isNumber: function() {
            return this.group === N;
        },
        isPoly: function() {
            var status = false;
            if( this.group === S && this.power > 0 ) {
                status = true;
            }
            else {
                var k = keys( this.symbols ).sort(),
                    kl = k.length;
                 //the following assumptions are made in the next check
                 //1. numbers are represented by an underscore
                 //2. variable and function names must start with a letter
                if( kl === 2 && k[0] === '_' ) { 
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
        // Copies over a predefined list of properties from one symbol to another.
        copy: function() {
            var copy = new Symbol(0),
                //list of properties excluding power as this may be a symbol and would also need to be a copy.
                properties = [ 'multiplier','value','group', 'length','isImaginary' ],
                l = properties.length, i;

            if( this.symbols ) {
                copy.symbols = {};
                for( var x in this.symbols ) {
                    copy.symbols[x] = this.symbols[x].copy();
                }
            }

            for( i = 0; i < l; i++ ) {
                if( this[properties[i]] !== undefined ) {
                    copy[properties[i]] = this[properties[i]];
                }
            }

            if( this.power ) {
                copy.power = isSymbol( this.power ) ? this.power.copy() : this.power;
            }
            return copy;
        },
        valueOf: function() {
            if( this.group === N ) {
                return this.multiplier;
            }
            else if( this.power === 0 ){
                return 1;
            }
            else if( this.multiplier === 0 ) {
                return 0;
            }
            else {
                return text( this );
            }
        },
        //an add-on helper function to help sniff out symbols in complex symbols
        //pass in true as second parameter to include exponentials
        hasVariable: function( variable, all ) {
            var g = this.group;
            if( g > S ) {
                if( g === EX ) {
                    //exit only if it does
                    if( this.power.hasVariable( variable, all )) { return true; }
                }
                for( var x in this.symbols ) {
                    if( this.symbols[x].hasVariable( variable, all ) ) {
                        return true;
                    }
                }
            }
            else {
                return this.value === variable;
            }
            return false;
        },
        negate: function() {
            this.multiplier *= -1;
            return this;
        },
        invert: function() {
            if( isSymbol( this.power ) ) {
                this.power.negate();
            }
            else {
                this.power *= -1;
            }
            return this;
        },
        text: function() {
            return text( this );
        },
        latex: function() {
            return Formatting.latex( this );
        },
        evaluate: function( subs ) {
            var self = this;
            return numBlock(function(){
                return text( Parser.parse( text( self ), subs ) );
            });
        }
    };
    
    // Returns a fractional approximation of a decimal
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
            return [ Math.pow(10,l)*x[0], Math.pow(10, Math.abs(x[1])+l)];
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

    var Parser = {
        tokenize: function( expStr ) { 
            expStr = String( expStr );
            var dtim = '@$', //this can be any set of characters not allowed in variable and function names
                dplus = '@#';
            //bug fix: 3.23e-4 will get split into [3.23e,'-', 4]. To fix this I temporarily replace e- with a @#
            //this can be any delimiter not allowed in a variable name
            expStr = expStr.replace( /(\d+)(e\-)(\d+)/g,
                function(){ 
                    return arguments[1]+dplus+arguments[3]; 
                }).
            replace( /(\d+)(e\+)(\d+)/g,
                function(){ 
                    return arguments[1]+dtim+arguments[3]; 
                });
            
            //normalize e.g. turn (x-2)(x+1) into (x-2)*(x+1) and clean out white space.
            expStr = String(expStr).split(' ').join('').replace( /\)\(/g, ')*(' );
            
            var openBrackets = 0,
                stack = [],
                depth = [],
                //variable for the last operator
                lastOperator = 0, 
                //expression length
                el = expStr.length, 
                brackets = {
                    '(': function() {

                        //a bracket signifies a new function and this needs it's own stack
                        stack.push( [] ); 

                        //we need to find our way back to upper stack so make a note of it
                        depth.push( stack ); 

                        //move to the new stack 
                        stack = stack[stack.length - 1]; 

                        //open a new  bracket
                        openBrackets++;
                    },
                    ')': function() {

                        //move up one level on the stack
                        stack = depth.pop(); 

                        //close the bracket
                        openBrackets--;
                    }
                };
                var stackInsert = function( pos ) {
                    var e = expStr.substring( lastOperator, pos ),
                        curOperator = expStr.charAt( pos ); 
                    if(e) { stack.push( e.replace( new RegExp( dplus ),'e-').replace( new RegExp( dtim ),'e+') ); }

                    if(curOperator) {
                        stack.push( curOperator );
                    }    
                };
            for( var i=0; i<el; i++ ){
                var c = expStr.charAt( i );
                if( operators[c] || brackets[c] ) {
                    stackInsert( i );
                    lastOperator = i+1; 
                    if( brackets[c] ) {
                        stack.pop();
                        brackets[c]();
                    }
                }
            }
            stackInsert( expStr.length );
            if( openBrackets !== 0 ) throw new Error('Malformed expression!');
            return stack;
        },
        //this function grabs all between the commas
        loadParams: function( symbolArray ) { 
            var l = symbolArray.length,
                curloc = 0,
                comma = ',',
                nparam = 1,
                paramArray = [],
                searching = true; 
            while( searching ) {
                var token = symbolArray[curloc],
                    eos = curloc === l; 
                //if we find a comma or we've reached the end of the array.
                if( token === comma || eos ) {
                    var t = symbolArray.splice( 0, curloc );
                    paramArray.push( nparam === 1 ? t : t.join('') );
                    symbolArray.shift();//remove the comma
                    curloc = 0;
                    nparam++; //walk up the parameter list
                }
                searching = !eos; 
                curloc++; 
            }
            
            //put the symbol back into the tokens array.
            symbolArray.unshift( paramArray.shift() );
            return paramArray;
        },
        parseFunction: function( fn, contents ) { 
            var properties = functions[fn.value],
                fnMap = properties[0],
                params = contents.params || [],
                result;

            //the parameters don't have to be attached to the symbol anymore
            delete contents.params;

            if( !fnMap ) {
                result = math( fn, contents ); 
            }
            else {
                //make the contents the first parameter and call the function with the provided parameters.
                //temporary fix: until we can have function parameters wrapped inside of the parens function 
                //without causing an infinite loop
                if( contents.length === 1 && contents.group === CP ) contents = firstObject( contents.symbols );

                params.unshift( contents );
                
                if( fnMap === map ) { 
                    //Just call map which does nothing more than format the arguments and call Parser.parse 
                    //with the arguments provided
                    result = map( properties[2], properties[3], params );
                }
                else {
                    result = fnMap.apply( undefined, params );
                } 
            }
            return result;
        },
        //The function responsible for the actual parsing of the expression.
        parseTokens: function( tokensOrExpression, subs ) { 
            var tokens = tokensOrExpression.tokens || tokensOrExpression,
                parsed = {},
                curPosition = 0,
                lastOrder = 0; 
            while( curPosition <= tokens.length ){ 
                var token = tokens[curPosition],
                    endOfTokens = curPosition === tokens.length;
                // Support for functions
                if( token in functions ) {
                    
                    token = this.fetchSymbol( tokens, subs, curPosition);
                    
                    // Parse what's in between the brackets.
                    var contents = this.fetchSymbol( tokens, subs, curPosition, true ); 

                    insert( tokens ,this.parseFunction( token, contents ), curPosition ); 
                }
                if( operators[token] !== undefined || endOfTokens ) {

                    // An order of -1 insures that we have a lower order than anything else and forces processing
                    var order = endOfTokens ? -1 : operators[token].order;

                    if( order < lastOrder ) { 

                        // Remove the whole prior section from the tokens as we now know that we're either at the end
                        // or a higher order operator [*,^,/]
                        var subTokens = tokens.splice( 0, curPosition ),

                            // Look ahead to the next operator after the subtokens to determine if we can place the last
                            // symbol into parsed or if we have to hang on to it for further multiplication after a '^'.*/
                            nextOperator = tokens[0]; 

                        //Parsing from this point on is pretty straight forward
                        while( subTokens.length > 0 ) { 
                            var firstSymbol = this.fetchSymbol( subTokens, subs ),
                                curOperator = subTokens.pop(); 
                            if( curOperator === '-' ){
                                // To support subraction just negate the multiplier and reinsert for addition
                                firstSymbol.negate();
                                if( subTokens[0] ) subTokens.push( '+' );
                                subTokens.push( firstSymbol ); 
                            }
                            // Insert the token into parsed if the operator is + or if no operator was found meaning we 
                            // only have one token left.
                            else if( curOperator === '+' || !curOperator ) {
                                if( nextOperator === '*' || nextOperator === '/' ){

                                    //At this point we've already seen that the next operator so clear the next operator for the next iteration.
                                    nextOperator = null; 

                                    tokens.unshift( firstSymbol );
                                }
                                else {
                                    Parser.unpackSymbol( firstSymbol, parsed );
                                }
                            }
                            else { 
                                var secondSymbol = this.fetchSymbol( subTokens, subs ),
                                    opr = operators[curOperator];
                                if( !opr || !opr.fn ) throw new Error( curOperator + ' is not a supported function!')
                                subTokens.push( this[opr.fn]( firstSymbol, secondSymbol ) ); 
                            }
                        }

                        if( order > 0 ) {
                            // Go back to the beginning and let's start parsing again. A better point may be chosen and may lead to better
                            // performance but I'll investigate that later.
                            curPosition = 0; 
                        }                
                    }
                    lastOrder = order;
                }
                curPosition++;
            }
            // Place a zero in the object if it's empty e.g. 1-1 will result in a empty object
            if( keys( parsed ).length === 0 ) parsed._ = Symbol(0); 
            return parsed; 
        },
        // A function to safely fetch a token out of the token array. This will read a sub-array into a symbol during parsing.
        fetchSymbol: function( tokens, subs, index, isFunction ) { 
            // pop out the token
            var sym = index >= 0 ? remove( tokens, index ) : tokens.pop(), paramArray;
            
            if( isSymbol( sym )) return sym;
            
            //fish out the parameters that were passed in
            if(isFunction){
                paramArray = this.loadParams( sym );
            }
            
            if( isArray( sym ) ) { 
                //pack it and ship it
                sym = this.packSymbol( this.parseTokens( sym, subs ), '', isFunction );
            }
            else {
                //subsitute the value for a known value.
                if( subs && subs[sym] !== undefined && !isReserved( sym ) ) {
                    sym = Parser.parse( subs[sym] );
                }
                else if( constants[sym] !== undefined && NUMER ) { 
                    sym = Parser.parse( constants[sym] );
                }
                else {
                    sym = Symbol( sym ); 
                }
            }

            if( paramArray && paramArray.length > 0 ) sym.params = paramArray; 
            return sym;
        },
        // Transfer over a symbol when changing a combination to another symbol. e.g. a composition that contains a composition
        transfer: function( second, first ) { 
            first.multiplier *= second.multiplier;
            this.powMultiply( first, second ); //TODO: have the value check if it's dealing with a number and more as well;
            first.value = second.value;
            first.group = second.group;
            if( second.symbols ) {
                first.symbols = second.symbols;
                first.length = second.length;
            }
            else {
                delete first.symbols;
                delete first.length;
            }
        },

        // This method neatly reorganizes all the tokens into an object and is the heart of the parser.
        // If a symbol is found they are added together. It also does some book keeping on higher group Symbols.
        addSymbol: function( symbol, item, parent, multiply ) { 
            var obj,
                parentGroup = parent ? parent.group : null,
            // If the function is being multiplied then this forces the power to be ignored.
            baseOnly = symbol.group === FN && multiply || parentGroup === CB && symbol.group === FN;
            
            if( isSymbol( item ) ) {
                obj = item.symbols;
            }
            else {
                obj = item;
            }
            
            if( +symbol.power === 0 ) { symbol = Symbol( symbol.multiplier ); } 
            
            // Symbols of group PL are stored by their power so verify and use the power value as the key.
            var name = ( parent ? parent.group === PL: false ) ? ( isSymbol( symbol.power ) ? 
                text( symbol.power ) : symbol.power ) : symbol.name( baseOnly ); 
            if( !obj[name] ) { 
                
                // Some bookkeeping for the function
                if( parent ) {                    
                    if( parent.group === CB ) {
                        parent.multiplier *= symbol.multiplier;
                        symbol.multiplier = 1;
                    }
                    !parent.length ? parent.length = 1 : parent.length++;
                }
                // If the symbol is zero why even bother adding it.
                if( symbol.multiplier !== 0 ) obj[name] = symbol; 
            }
            else { 
                obj[name] = multiply ? this.multiply( obj[name], symbol ) : this.add( obj[name], symbol );

                if( obj[name].multiplier === 0 ) { 
                    delete obj[name]; 
                    if( parent ) parent.length--;
                }
                if( multiply && obj[name].group === N ) {                 
                    item = this.multiply( remove( obj, name ), parent );

                    parent.length--;
                    
                    if( parent.length === 1 ) {
                        this.transfer( firstObject( obj ), parent ); 
                    }
                }
                    
                if( parent && parent.group === CB ) {
                    
                    // We know the multiplier is 1 because it has already been transferred earlier
                    if( +obj[name] === 1 ) {
                        delete obj[name]; 
                        parent.length--;
                    }
                    if( parent.length === 1 ) {
                        // Transform the symbol into the parent symbol.
                        this.transfer( firstObject( obj ), parent );
                    }
                }
            }
            
            return obj;
        },
        add: function( a, b) { 

            if( !isSymbol(a) ) a = Symbol(a); //this enables us to pass in numbers which is useful for exponentials
            if( !isSymbol(b) ) b = Symbol(b);
            
            var g1 = a.group, g2 = b.group;
            var p1 = ''+a.power, p2 = ''+b.power; 
            if( g1 === CB && g2 === PL || 
                g1 === S && g2 === PL ) return this.add( b, a );
            // Note: the add function doesn't get called directly while parsing
            // First let's make sure we're not dealing with a symbol of group PL
            if( g1 === PL && p1 === '1' ) { 
                var m = a.multiplier, x;
                // Move the value of the multiplier down to avoid problems later on
                if( m !== 1 ) {
                    for( x in a.symbols ) {
                        a.symbols[x].multiplier *= a.multiplier;
                    }
                    a.multiplier = 1;
                }
                if( g2 === PL && p2 === '1') {
                    for( x in b.symbols ) {
                        this.addSymbol( b.symbols[x], a.symbols, a );
                    }
                }
                else {
                    this.addSymbol( b, a.symbols, a );
                }
            }
            else if( a.value === b.value && p1 === p2 ){
                a.multiplier += b.multiplier;
            }  
            else {
                a = this.convertAndInsert( a, b, PL );
            }

            return a;
        },
        // NOTE: This is method should never actually be called but is there just in case something was overlooked
        subtract: function( a, b ) {
            b.negate(); 
            return this.add( a, b );
        },
        multiply: function( a, b ) { 
            // Take care of imaginary numbers
            if( a.isImaginary && b.isImaginary ) return Symbol( -1*a.multiplier*b.multiplier );
            
            var g1 = a.group, 
                g2 = b.group,
                p1 = a.power, 
                p2 = b.power,
                n1 = g1 === FN ? a.name( true ) : null,
                n2 = g2 === FN ? b.name( true ) : null;
            // Quick returns
            if( p1 === 0 ) { a = Symbol( a.multiplier ); }
            if( p2 === 0 ) { b = Symbol( a.multiplier ); }
            if( a.multiplier === 0 || b.multiplier === 0 ) { return Symbol( 0 );}
            
            // Always have the lower group on the right for easy comparison.
            if( g2 > g1 ) { return this.multiply( b, a); }
            
            var isCompositeA = ( g1 === PL || g1 === CP ),
                isCompositeB = ( g2 === PL || g2 === CP ),
                t, x;
        
            // For all symbols the multipliers have to be multiplied.
            a.multiplier *= b.multiplier;
            
            // Exit early if it's a number.
            if( g2 === N ) { return a; }
            
            // We have already grabbed the value of the multiplier so we have to 
            // now set it to 1. e.g 2 * (2*x) = 4 * (1*x).
            b.multiplier = 1;
            
            var isEqual = a.value === b.value;
            
            if( isEqual && g2 !== N && g1 !== PL && 
                !( g1 === EX && g2 === PL ) && n1 === n2 ) { 
                this.powAdd( a, b );
                
                // This is needed if during multiplication one of the symbols 
                // in a combination results in a zero power.
                if( +a.power === 0 ) {
                    return Symbol( a.multiplier );
                }
            }
            else if( isCompositeA && p1 === 1 || isCompositeB && p2 === 1 ) { 
                
                // The multiply method always puts the lower group symbol to the right but sometimes, 
                // such as in the case of group PL or CB, we need it back on the right. 
                // The following tests for these cases.
                if( g1 === CB && g2 === PL || g1 === FN && g2 === CP ||
                    g1 === EX && g2 === PL || g1 === EX && g2 === CP ||
                    isCompositeB && isCompositeA && p1 !== 1  ) { 
                    // Swap symbols
                    t = a; a = b; b = t; 
                    // Swap powers
                    t = p1; p1 = p2; p2 = t; 
                } 
                if( !isEqual && a.group === PL || p1 !== p2 ) { 
                    a.group = CP; 
                }
                
                t = {}; 
                a.length = 0;
                for( x in a.symbols ) {  
                    var r = this.multiply( a.symbols[x], b.copy() );  
                    var m = r.multiplier; 
                    if( b.group === PL && p2 === 1 || b.group === CP && p2 === 1 ) {
                        for( var xx in r.symbols ) {
                            
                            if( m!== 1 ) r.symbols[xx].multiplier *= m; 
                            
                            //The last operation may have resulted in a number being returned
                            this.addSymbol( r.symbols[xx], t, a );
                        }
                        r.multiplier = 1;
                    }
                    else {
                        this.addSymbol( r, t, a ); 
                    }
                }
                   a.symbols = t; 
            }
            else if( g1 === CB && g2 !== N && g2 !== PL ) { 

                if( g2 === CB && p2 === 1 ) { 
                    for( x in b.symbols ) {
                        
                        // We're going to be multiplying 2 symbols of group CB but in the process one may have been 
                        // transformed to a simpler symbol. Because of this we have to check that it still has a symbols
                        // object.
                        if( !a.symbols ) {
                            a = Parser.multiply( b.symbols[x], a );
                        }
                        else {
                            this.powDivide( b.symbols[x], a );
                            this.addSymbol( b.symbols[x], a, a, true );
                        }
                    }
                }
                else { 
                    // Under investigation: if your having problems with incorrect exponentials you may want to check
                    // here first
                    this.powDivide( b, a ); 
                    this.addSymbol( b, a, a, true ); 
                    
                }
                
                // Update the name but only if it's a function
                if( a.group !== FN ) a.value = a.name();
            }
            else if( g2 !== N ){ 
                if( g1 === EX && g2 === CB && b.hasVariable( a.name(true) ) ) {
                    this.addSymbol( a, b, undefined, true );
                    a = b;
                }
                else {
                    a = this.convertAndInsert( a, b, CB );
                }
            } 
            
            return a;
        },
        divide: function( b, a ) {
            if( b.multiplier === 0 ) throw new Error('Division by zero!')
            b.multiplier = 1/b.multiplier;
            if( b.group > N ) {
                b.invert();
            }
            return this.multiply( a, b );
        },
        pow: function( b, a ) { 
            if( +b === 1 ) return a;// x^1 = x;
            var g1 = a.group, g2 = b.group;

            // If the radical is even we must retain its absolute value.
            // this checks to see if the radical is divisible by two
            var isEven = +b % 2 === 0 || 1/( +b - parseInt( +b ) ) % 2 === 0,
                // Record if we have a negative number as the base.
                isNegative = a.multiplier < 0,
                // Make sure that the power is even.
                powEven =  a.power % 2 === 0;

            if( a.isImaginary ) {
                if( g2 === N && b.multiplier % 2 === 0 ) {
                    return Symbol( -Math.pow( a.multiplier, +b ));
                }
            }

            if( g1 === N && g2 === N ) { 
                var fracpart = Math.abs( b.multiplier - parseInt( b.multiplier ) ),
                    isRadical =  fracpart < 1 && fracpart > 0;

                if( isRadical && isNegative ) { a.negate(); }

                // Support for negative/imaginary numbers when dealing with radicals
                a.multiplier = Math.pow( a.multiplier, b.multiplier );
                if( isNegative && isRadical && isEven ) {
                    a = Parser.multiply( a, Symbol( 'i' ) );
                }
                else if( isRadical && isNegative ){
                    a.negate();
                }
                return a;//early exit.
            }
            else {
                if( isNegative ) { a.negate(); }
                var p = a.power;
                if( g2 === N && !isSymbol( p ) ) { 
                    if( isNegative && isEven ) { //TBD
                        var m = a.multiplier;
                        
                        if( g1 === S ) {
                            a.multiplier += b.multiplier;
                        }
                        else {
                            a.multiplier = -1;
                            a = parens( a );
                        }  
                    }
                    else {
                        m = a.multiplier;
                    }
                    
                    a.multiplier = Math.pow( m, b.multiplier );
                    a.power *= b.multiplier; 
                }
                else { 
                    // The symbols is now of group EX
                    if( g1 !== FN ) {
                        // But first some upgrades to the humble group N symbol
                        if( g1 === N ) {
                            a.value = a.multiplier;
                            a.multiplier = 1;
                            p = 1;
                        }
                        // It will become impossible to distinguish between a group CP and a CB symbol once the 
                        // the group is changed by looking at the objects structure so we make note.
                        if( g1 !== EX ) { a.origin = g1; }
                        
                        a.group = EX;
                        
                    }

                    // Make sure that you're sending in a symbol for multiplication
                    if( !isSymbol( p ) ){ p = Symbol( p ); }
                    a.power = this.multiply( p , b );

                    // No need leave the power anymore complex than it needs to be.
                    if( a.power.group === N ) { a.power = a.power.multiplier; } 
                }
            }
            // If the symbol went down from a symbol of group EX, restore.
            if( a.power === 1 && a.origin ) {
                if( a.origin === N ) {
                    a = Symbol( a.multiplier*a.value );
                }
                else {
                    a.group = a.origin;
                }
            }
            // Verify that the symbol is a candidate to have its absolute value retained
            if( isEven && powEven && parseInt( a.power + 1 ) % 2 === 0 ) a = abs( a );
            
            // Put back the sign 
            if( isNegative && !isEven ) a.negate();
            return a;
        },
        // A method to pack intermediate results into a symbol or just return the symbol.
        // e.g. calculations done on an expression between brackets
        packSymbol: function( obj, group, donotunpack ) {
            group = group || CP;
            var k = keys( obj ),
                l = k.length,
                isCompounded = false;
            // Bug fix: cos((1+x)^2)^2 would return cos(1+x)^4
            // TODO: this should use parens instead. At present it results in an infinite loop.
            if( donotunpack ) {
                isCompounded = obj[k[0]].group === CP;
            }

            if( l === 0 ) {
                return Symbol(0);
            }
            // NUMER takes higher precedence and can force a number to be returned
            else if( l === 1 && ( NUMER || !isCompounded ) ) {
                return obj[k[0]];
            }
            else {
                var n = new Symbol();
                n.group = group;
                
                n.symbols = obj;
                n.length = l;
                n.value = text( obj );
                return n;
            }
        },
        // This method provides a quick and dirty way to upgrade or downgrade a symbol
        convertAndInsert: function( symbol, symbol2,  group ) {
            var ns = Symbol(),
                // Lets addSymbol know to multiply instead of add the symbol if the parsed object 
                // already has such a value.
                isCombo = group === CP; 
            ns.group = group;
            if( group > S ) {
                ns.symbols = {}; 
                ns.length = 0;
                this.addSymbol( symbol, ns.symbols, ns, isCombo ); 
                this.addSymbol( symbol2, ns.symbols, ns, isCombo );
                ns.value = ns.name();
                symbol = ns;
            }
            else if( group <= S && symbol.group > S ) {
                delete symbol.symbols;
            } 
            return symbol;
        },

        // Method unpacks a symbol of group CP into a parsed object.
        unpackSymbol: function( symbol, parsed, forceUnpack ) { 
            
            if( symbol.power === 1 && symbol.group === CP || forceUnpack )  {
                for( var x in symbol.symbols ) {
                    symbol.symbols[x].multiplier *= symbol.multiplier; 
                    this.addSymbol( symbol.symbols[x], parsed );
                }
            }
            else {
                this.addSymbol( symbol, parsed );
            }
        },
        // A quick and lazy way to get a fully built symbol if you don't want to are unable to transform an object.
        // this functions is sometimes needed but most of the time it's convenience but has the benefit of its parameter
        // being a string, so you can easily retrace the logic.
        parse: function( str, subs ) { 
            return this.packSymbol( this.parseTokens( this.tokenize( str ), subs ) );
        },
        // The next functions are needed in case the exponential is a symbol
        powDivide: function( a, b ) {
            if( isSymbol( a.power ) || isSymbol( b.power )) {
                a.power = !isSymbol( a.power ) ? Symbol( a.power ) : a.power.copy();
                b.power = !isSymbol( b.power ) ? Symbol( b.power ) : b.power.copy();
                a.power = this.divide( b.power, a.power ); 
            }
            else {
                a.power /= b.power;
            }
        },
        powMultiply: function( a, b) { 
            if( isSymbol( a.power ) || isSymbol( b.power )) {
                a.power = this.multiply( a.power, b.power );
            }
            else {
                a.power *= b.power;
            }
        },
        powAdd: function( a, b ) { 
            if( isSymbol( a.power ) || isSymbol( b.power )) {
                a.power = this.add( a.power, b.power );
            }
            else {
                a.power += b.power;
            }
        }
    };
    // Removes an item from either an array or an object.
    // If an array the index must be specified after the array.
    // If an object the key must be specified
    function remove( obj, indexOrKey ) {
        var result;
        if( isArray( obj ) ) {
            result =  obj.splice( indexOrKey, 1 )[0];
        }
        else {
            result = obj[ indexOrKey ];
            delete obj[ indexOrKey ];
        }
        return result;
    }

    // Returns true if the obj is a symbol.
    function isSymbol( obj ) {
        return ( obj instanceof Symbol );
    }

    // Returns the keys of an object/associative array.
    function keys( obj ) {
        var k = [];
        for( var key in obj ) { k.push( key ); }
        return k;
    }

    // This recursive method attempts to return a parsed object or symbol back in text form.
    // When asFunction is set to true it will make sure to write in JS function form.
    function text( obj, delimiter, option, forceBracket ) { 
        if(!obj) return '';
        
        var asFunction = option === 'function',
            g = obj.group, v; 
        delimiter = delimiter || '+';
        if( g === CB || obj.origin === CB ) delimiter = '*';
        // Base case
        if( obj instanceof Symbol ) {
            if( g === N ) {
                v = +obj.multiplier;
            }
            else {
                if( g === FN ) {
                    var params = '',
                    // Whenever we exporting the text to a javascript function we have to format the text differently.
                    // This should probably be its own function but for now we're using text.
                        value = obj.value;
                    v = asFunction ? ( value in Math2 ? '1/Math.'+Math2[value].inv : 'Math.'+value ): value;
                    
                    // parens is just a function that holds the parentheses so we don't need the name
                    if( v === 'parens' ) v = '';

                    v = v + inBrackets( text( obj.symbols, undefined, option ) );
                    
                    if(obj.value ==='sum' && obj.params ) v = v.substring(0, v.length-1)+','+obj.params.join(',')+')';
                }
                else if( g === PL || g === CP || g === CB || g === EX && obj.symbols ) {
                    v = text( obj.symbols, delimiter, option );
                    if( obj.multiplier !== 1 && g !== CB || obj.power !== 1 || forceBracket )  v = inBrackets( v );
                }
                else {
                    v = obj.value;
                }
                var m = obj.multiplier, p = obj.power;
                if( asFunction ) {
                    if( p !== 1 ) v = 'Math.pow'+inBrackets( v+','+( g === EX ? text( p, undefined, option) : p) );
                    if( m !== 1 ) v = m+'*'+v;
                }
                else {
                    m = m === 1 ? '' : m === -1 ? '-' : m+'*';
                    p = p === 1 ? '' : '^('+obj.power+')';
                    v = m+v+p;
                }    
            }
        }
        else {
            var a= [], imgpart = '';
            for( var x in obj ) { 
                var txt = text( obj[x], undefined, option );
                // Grab the imaginary part if it happens to be so and store it.
                if( obj[x].isImaginary ) {
                    imgpart = txt;
                }
                else {
                    a.push( txt );
                }
            }
            v = a.sort();
            
            // Reinsert imaginary part if there is one.
            if( imgpart ) { a.push( imgpart ); }
            
            v = a.join( delimiter ).replace(/\+\-/g,'-');
        }
        return v;
    }

    
    function init(){
        
        // Load indexOf function if not present
        loadIndexOf();
               
        Calculus.sum = function( fn, variable, index, end ) {
            if( !isNaN( variable )) throw new Error('Incorrect parameter!');
            
            if( !isNaN( index ) && !isNaN( end ) ) { 
                // Backup the current value for the variable.
                var lastc = '0', //last computation.
                    eq = text( fn ),
                    vars = variables( fn ),
                    k = {},
                    result, i;

                if( vars.length > 1 ) {
                    var t = {};
                    for( i=index; i<=end; i++ ) {
                        k[variable] = i;
                        Parser.addSymbol( Parser.parse( eq, k ), t );
                    }
                    result = Parser.packSymbol( t );
                }
                else {
                    numBlock( function() {
                        for( i=index; i<=end; i++) {
                            k[variable] = i;
                            
                            //Append the last equation and then just reparse the whole thing
                            lastc = text(Parser.parse( (lastc+'+'+eq).replace(/\+\-/g,'-'), k ) ); 
                        }
                    });
                    result = Parser.parse( ''+lastc );
                }
                    
                return result;
            }
            else {
                var s = Symbol('sum');
                    s.symbols = Parser.addSymbol( fn, {} ); 
                    s.group = FN;
                    s.params = [ variable, index, end ];
                return s;
            }   
        };
        // Equivalent to "derivative of the outside".
        Calculus.diff = function( obj, d ) { 
            if( isSymbol( d )) d = d.value;

            if( obj.group === FN ) {
                if( isSymbol( obj.power ) ) {
                    obj = Calculus.derive( obj, d );
                }
                else {
                    obj = Calculus.chainRule( obj, d );
                } 
            }
            else {
                obj = Calculus.derive( obj, d );
            }

            return obj;
        };
        Calculus.polydiff = function( symbol, d ) { 
            if( symbol.value === d || symbol.hasVariable( d, true )) { 
                symbol.multiplier *= symbol.power;
                symbol.power -= 1; 
                if( symbol.power === 0 ) {
                    symbol = Symbol( symbol.multiplier );
                }
            } 
            return symbol;
        };
        Calculus.derive = function( symbol, d) { 
            var g = symbol.group, t, a, b, cp; 
            if( isSymbol( symbol ) ) { 
                if( g === N || g === S && symbol.value !== d ) { 
                    symbol = Symbol( 0 );
                }
                else if( g === S ) {  
                    symbol = Calculus.polydiff( symbol, d );
                }
                else if( g === CB ) { 
                    var m = symbol.multiplier;
                    symbol.multiplier = 1;
                    cp = symbol.copy();
                    a = Calculus.productRule( symbol, d ); 
                    b = Calculus.polydiff( cp, d ); 
                    var ans =  Parser.multiply( a, b );
                    ans.multiplier *= m;
                    return ans;
                }
                else if( g === FN && symbol.power === 1 ) {
                    // Table of known derivatives
                    switch( symbol.value ) {
                        case 'log':
                            cp = symbol.copy();
                            symbol = Parser.packSymbol( cp.symbols );

                            if( isSymbol( symbol.power ) ) {
                                symbol.power = Parser.multiply( symbol.power, Symbol(-1));
                            }
                            else {
                                symbol.power *= -1;
                            }
                            symbol.multiplier = cp.multiplier/symbol.multiplier; 
                            break;
                        case 'cos':
                            symbol.value = 'sin';
                            symbol.multiplier *= -1;
                            break;
                        case 'sin': 
                            symbol.value = 'cos';
                            break;
                        case 'tan':
                            symbol.value = 'sec';
                            symbol.power = 2;
                            break;
                        case 'sec': 
                            // Use a copy if this gives errors
                            symbol = this.quickdiff( symbol, 'tan');
                            break;
                        case 'csc':
                            symbol = this.quickdiff( symbol, '-cot');
                            break;
                        case 'cot':
                            symbol.value = 'csc';
                            symbol.multiplier *= -1;
                            symbol.power = 2;
                            break;
                        case 'asin':
                            symbol = Parser.parse( '(sqrt(1-('+text(symbol.symbols)+')^2))^(-1)' );
                            break;
                        case 'acos':
                            symbol = Parser.parse( '-(sqrt(1-('+text(symbol.symbols)+')^2))^(-1)' );
                            break;
                        case 'atan':
                            symbol = Parser.parse( '(1+('+text(symbol.symbols)+')^2)^(-1)' );
                            break;
                        case 'abs':
                            m = symbol.multiplier; 
                            symbol.multiplier = 1;
                            //depending on the complexity of the symbol it's easier to just parse it into a new symbol
                            //this should really be readdressed soon
                            b = Parser.parse(text(symbol.symbols));
                            b.multiplier = 1;
                            symbol = Parser.parse(inBrackets(text(symbol.symbols))+'/abs'+inBrackets(text(b)));
                            symbol.multiplier = m;
                            break;
                        case 'parens':
                            symbol = Symbol(1);
                            break;
                    }
                }
                else if( g === EX || g === FN && isSymbol( symbol.power ) ) { 
                    var value;
                    if( g === EX ) {
                        value = symbol.value;
                    }
                    else if( g === FN && symbol.hasVariable( d )) {
                        value = symbol.value + inBrackets( text( symbol.symbols ) );
                    }
                    else {
                        //TODO: eliminate dependence on text.
                        value = symbol.value + inBrackets( text( symbol.symbols ) );
                    }
                        a = Parser.multiply( Parser.parse( 'log'+inBrackets( value ) ), symbol.power.copy() ); 
                        b = Calculus.diff( a, d ); 
                    symbol = Parser.multiply( symbol, b );
                }
                else if( g === FN && symbol.power !== 1 ) { 
                    a = Calculus.polydiff( symbol.copy(), d );
                    b = symbol.copy();
                    
                    //turn b into a vanilla powerless, multiplier-less symbol
                    b.power = 1; 
                    b.multiplier = 1;
                    
                    b = Calculus.derive(b, d);
                    symbol = Parser.multiply( a, b );  
                }
                else if( g === CP || g === PL ) {
                    a = Calculus.polydiff( symbol.copy(), d );
                    b = Calculus.diff( symbol.symbols, d );
                    symbol = Parser.multiply( a, b );
                }
            }
            else { 
                t = {};
                var obj = symbol;
                for( var x in obj ) { 
                    var u = Calculus.diff( obj[x].copy(), d );
                    Parser.addSymbol( u, t );
                }
                symbol = Parser.packSymbol( t );
            } 
            return symbol;
        };
        
        Calculus.quickdiff = function( symbol, val, altVal ) {
            return Parser.multiply( symbol, Parser.parse( val+inBrackets( altVal || text( symbol.symbols ) ) ));
        };
        
        Calculus.chainRule = function( symbol, d ) {
            var a = Calculus.derive( symbol, d ),
                b = Calculus.derive( symbol.symbols, d );
            return Parser.multiply( a , b );
        };
        
        Calculus.productRule = function( symbol, d ) { 
            var n = 0,//use this to keep track of how many derivatives you actually pulled
                stack = [],
                k = keys( symbol.symbols ),
                l = k.length,
                result = symbol;// the default return
        
            // A regular for loop is chosen to reduce the number of loops by pulling the keys and working with that;
            for( var i=0; i<l; i++ ) {
                var key = k[i],
                    df = Calculus.diff( symbol.symbols[key].copy(), d ); 
                if( +df !== 0 ) {
                    n++;
                    var ll = k.length;
                    for( var j=0; j<ll; j++ ) {
                        //we need to skip the current symbol
                        if( j !== i ) {
                            var s = symbol.symbols[k[j]];
                            df = Parser.multiply( df, s );
                        }
                    }

                    stack.push( df );
                }
            }
            // We have all the derivatives but let's return a symbol
            if( stack.length === 1 ) { 
                result = stack[0]; 
                result.multiplier *= symbol.multiplier;
            }
            else {
                var r = {};
                l = stack.length;
                for( i=0; i<l; i++ ) {
                    var c = stack[i];
                    Parser.addSymbol( c, r );
                }
                result = Parser.packSymbol( r ); 
            }
            return result;
        };
         
        Formatting.latex = function( obj ) {

            if( isSymbol( obj ) ) {
                var symbol = obj,
                    g = symbol.group,
                    m = Fraction.convert( symbol.multiplier );
                if( g === N ) return Formatting.frac( m );
                // Determine which bracket to use for current format
                var prefix = '~',
                    sign = '',
                    bracket = inBraces,
                    p = symbol.power,
                    sqrt = p === 0.5 || p === -0.5; 
                // Format the power
                if( !sqrt ) { 
                    // First check if we have a symbol as the power
                    p =  isSymbol( p ) ? Formatting.latex( p ) :  Math.abs( p ); 
                    // Fow put it as a fraction
                    p = ( isInt( p ) ? p : ( !isNaN( p ) ? Fraction.convert( p ) : p ) );
                    // Format the power of the symbols. If it's 1... **poof**
                    p = p === 1 || p === -1 ? '' : '^'+bracket( Formatting.frac( p ) );
                }

                // Grab the sign
                if( m[0] < 0 ) { 
                    m[0] = Math.abs( m[0] );
                    sign = '-';
                }
                var dress = function( v, f, tex ) {
                    return ( sqrt ? '\\sqrt'+bracket( v ): ( p ? f( v, tex) : v )+p );
                };
                
                var tex = (function(){
                    var g = symbol.group,
                        value,
                        addBrackets = false;
                    if( g === S || g === EX  ) {
                        value = symbol.value;
                        
                        // Some pretty prebuilts 
                        var greek = [ 'alpha', 'beta', 'gamma', 'delta', 'zeta', 'eta', 'theta', 'iota', 
                            'kappa', 'mu', 'nu', 'xi', 'rho', 'sigma', 'tau', 'chi', 'psi', 'omega', 'pi' ];
                        if( greek.indexOf( value ) !== -1 ) value = '\\'+value;
                        
                        value = dress( symbol.symbols ? Formatting.latex( symbol.symbols ): value, bracket );
                    }
                    else if( g === FN ) { 
                        //grab the name of the function
                        var name = symbol.value;
                        
                        value = Formatting.latex( symbol.symbols );
                        
                        if( name === 'parens' ) { 
                            if( sqrt ) { name = value; }
                            else { name = inBrackets( value, true ); }
                        }
                        else if( name === 'abs' ) {
                            name = '\\left|'+value+'\\right|';
                        }
                        else if( name === 'sum' ) {
                            name = '\\sum_'+inBraces(symbol.params[0]+'='+symbol.params[1])+'^'+
                                inBraces(symbol.params[2])+' '+inBraces(value, true);
                        }
                        else {
                            name = '\\'+ name + inBrackets( value, true);
                        }
                        value = dress( name, function(v){ return v; });

                    }
                    else if( g > FN ) {
                        // First we need to build the value
                        if( g === CB ) {
                            var t = [m[0],1]; m[0] = 1;
                            for( var x in symbol.symbols ) {
                                var s = symbol.symbols[x];
                                value = Formatting.latex( s ).replace(/\\frac\{1\}/,'');
                                if( s.group === CP ) value = inBrackets( value, true );
                                Formatting.attach( value, t, s.power, prefix );
                            } 
                            value =  Formatting.frac( t );
                            if( symbol.multiplier !== -1 ) addBrackets = true;
                        }
                        else if( g === CP || g === PL ) {
                            value = Formatting.latex( symbol.symbols );
                            if( symbol.power === 1 ) addBrackets = true;
                        }
                        value = dress( value, inBrackets, true );
                    }
                    if( symbol.multiplier !== 1 && g !== CB && addBrackets  ) value = inBrackets( value, true );
                    Formatting.attach( value, m, symbol.power, prefix );                    
                    value = Formatting.frac( m );
                    return value;
                })();
                return sign+tex;
            }
            else {
                var values = [];
                for( var x in obj ) {
                    values.push( Formatting.latex( obj[x]) );
                }
                return values.join('+').replace(/\+\-/g,'-');
            }
        };
        
        Formatting.attach = function( value, arr, power, prefix ) {
            prefix = prefix || '';
            // Choose whether we're going top or bottom. 
            var loc = isNeg( power ) ? 1 : 0; 
            arr[loc] = arr[loc] === 1 ? value : arr[loc] += prefix+value;
        };
                
        Formatting.frac = function( arr ){
            if(!arr ) return '';
            if( !isArray( arr ) ) return arr;
            if( arr[1] === 1 ) return arr[0];
            return '\\frac{'+arr[0]+'}{'+arr[1]+'}';
        };
                
        Algebra.polydivide = function( symbol1, symbol2 ) {
            if( !symbol1.isPoly() || !symbol2.isPoly() ) throw new Error('Both symbols must be polynomials!');
        };
        
        Algebra.transform = function( symbol ) {
            var g = symbol.group; 
            // Is it a rational symbol? If so transform
            if( ( g === CP || g === S || g === PL ) && symbol.power < 0 ) {
                ;
            }
            return symbol;
        };
        
        Algebra.expand = function( symbol ) {
            var k = keys( symbol.symbols );
            
            //TODO: prevent this from happening in the first place
            if( k.length === 1 && symbol.symbols[k[0]].group === CP ) symbol = symbol.symbols[k[0]];
            
            if( isInt( symbol.power ) && symbol.group === CP ) {
                var l = symbol.power,
                    t, obj;
                for( var i=0; i<l-1; i++ ) { 
                    obj =  t || symbol.symbols;
                    t = {};
                    for( var x in symbol.symbols ) {
                        for( var y in obj ) {
                            var r = Parser.multiply( obj[y].copy(), symbol.symbols[x].copy() );
                            //Parser.addSymbol does not expand the multiplier of groups PL && CP so...
                            if( r.group === PL && r.multiplier !== 1 && r.power === 1 /*may be an unnecessary check*/) {
                                for( var z in r.symbols ) {
                                    r.symbols[z].multiplier *= r.multiplier;
                                }
                                r.multiplier = 1;
                            }
                            Parser.addSymbol( r, t );
                        }
                    }
                }
                if( t ) {
                    symbol.power = 1;
                    symbol.symbols = t;
                }
            } 
            return symbol;
        };
        
        Algebra.findRoot = function( f, guess, dx ) { 
            var newtonraph = function(xn) {
                var mesh = 1e-12,
                    // If the derivative was already provided then don't recalculate.
                    df = dx ? dx : Calculus.diff(f, variables(f)[0]).buildFunction(),
                    
                    // If the function was passed in as a function then don't recalculate.
                    fn = f instanceof Function ? f : f.buildFunction(),
                    max = 10000,
                    done = false, 
                    safety = 0;
                while( !done ) { 
                    var x = xn-(fn(xn)/df(xn)); 
                    var delta = Math.abs( x - xn );
                    xn = x; 
                    if( safety > max ) 
                    if( delta < mesh || safety > max ) done = true;
                    
                    safety++;
                }
                return xn;
            };
            return newtonraph( Number( guess ) );
        };
    } 
    
    function loadIndexOf() {
        //http://erik.eae.net/playground/arrayextras/arrayextras.js
        if (!Array.prototype.indexOf) {
            Array.prototype.indexOf = function (obj, fromIndex) {
                if (fromIndex == null) {
                    fromIndex = 0;
                } else if (fromIndex < 0) {
                    fromIndex = Math.max(0, this.length + fromIndex);
                }
                for (var i = fromIndex, j = this.length; i < j; i++) {
                    if (this[i] === obj)
                        return i;
                }
                return -1;
            };
        }
    }
    
    // Inserts an object into an array or recursively adds items if an array is given
    function insert( arr, item, index ) {
        if( isArray( item ) ) {
            for( var i=0; i<=item.length+1; i++ ){
                insert( arr, item.pop(), index );
            }
        }
        else if( typeof index === 'undefined ') {
            arr.push( item );
        }
        else{
            arr.splice( index, 0, item );
        }
    }
    
    function isInt( num ) {
        return num % 1 === 0;
    }
    
    function isArray( arr ) {
        return arr instanceof Array;
    }

    var inBrackets = function( str, tex ) {
        var l = tex ? '\\left' : '',
            r = tex ? '\\right': '';
        return l+'('+str+r+')';
    },
    
    inBraces = function( str ) {
        return '{'+str+'}';
    },
    
    round = function( x, s ) { 
        s = s || 14;
        return Math.round( x*Math.pow( 10,s ) )/Math.pow( 10,s );
    },

    // Items are do not have a fixed order in objects so only use if you need any first random item in the object
    firstObject = function( obj ) {
        for( var x in obj ) break;
        return obj[x];
    },
    
    variables = function( obj, vars ) { 
        vars  = vars || {};
        if( isSymbol( obj ) ) { 
            var g = obj.group; var s = g === EX;
            if( g > S && g !== PL && g !== EX ) {
                variables( obj.symbols, vars ); 
            }
            else if( g === S || g === PL ) {
                vars[obj.value] = null;
            }
            else if( g === EX ) { 
                var ov = obj.value;
                // We don't want a number passed in as a parameter so we check.
                if( isNaN( ov ) ) vars[ov] = null;
                variables( obj.power, vars );
            }
        }
        else { 
            for( var x in obj ) {
                variables( obj[x], vars );
            }
        }   
        return keys( vars );
    },

    // Enforces rule: must start with a letter and can have any number of underscores or numbers after.
    validateName = function( name, type ) { 
        type = type || 'variable';
        var regex = /^[a-z][a-z\d\_]*$/gi;
        if( !( regex.test( name ) ) ) {
            throw new Error( name+' is not a valid '+type+' name' );
        }
    },
    
    map = function( fn, params, args ) { 
        // Organize the parameters
        var subs = {};
        for( var i=0; i<params.length; i++ ) {
            subs[params[i]] = isSymbol( args[i] ) ? text( args[i] ) : args[i];
        }
        return Parser.parse( fn, subs );
    },
    
    stripWhiteSpace = function( str ) {
        return str.split(' ').join('');
    },
    
    build = function( fn, argsArray ) { 
        var vars = variables( fn ).sort(),
            args = argsArray || vars;
        
        // If no paramArray was given then vars and params should be the same object
        // if they're not then make sure that the values match.
        if( !( vars === args ) ){
            for( var i=0; i<vars.length; i++ ) {
                if( args.indexOf === -1 ) throw new Error('Wrong number of parameters provided!');
            }
        }
        return new Function( args, 'return '+text( fn, undefined, 'function' )+';' );
    },
    
    arrayMax = function( arr ) {
        return Math.max.apply( undefined, arr );
    },
    
    arrayMin = function( arr ) {
        return Math.min.apply( undefined, arr );
    },
    
    //provides a temporary block where symbols are processed immediately
    numBlock = function( fn ) {
       NUMER = true;
       var ans = fn();
       NUMER = false;
       return ans;
    };
    
    // This function changes the contents of the stored equation
    function getEquation( equationNumber, fn ) {
        var e = !equationNumber ? EQNS.length - 1 : equationNumber - 1,
            eqn = EQNS[e],
            result = 'No equation found.';
            if( eqn ) { 
                eqn.equation =  fn( eqn );
                result = eqn.equation;
            }
        return result;
    }
    
    function loadReserved() {
        var load = function( obj ) { 
            for( var x in obj ) {
                RESERVED.push(x);
            }
        };
        load( functions ); 
        load( Math2 );
        load( constants ); 
    }

    function sqrt( symbol ) { 
        return Parser.pow( Symbol(0.5), symbol );
    }

    function abs( symbol, fn ) { 
        var p = symbol.power;
        if( Math.abs( p ) < 1 ) p = 1/p;
        
        // An symbol to the power of an even integer is already absolute.
        if( p % 2 === 0 ) { return symbol; }
        
        fn = fn || Symbol('abs');
        symbol.multiplier = Math.abs( symbol.multiplier );
        return math( fn, symbol );
    }
    
    function log( symbol ) { 
        var result;
        if( ( symbol.value === 'e') && symbol.multiplier === 1 ) {
            result = isSymbol( symbol.power ) ? symbol.power : Symbol( symbol.power );
        }
        else if( ( symbol.value === 'exp') && symbol.multiplier === 1 ) {
            result = Parser.packSymbol( symbol.symbols );
        }
        else {
            var imgPart = '';
            if( symbol.group === N && NUMER && symbol.multiplier < 0 ) {
                symbol.negate();
                imgPart = Parser.parse('PI*i');
            }
            result = math( Symbol('log'), symbol );
            
            // If there is an imaginary part reinsert it
            if( imgPart ) { result = Parser.parse( result+'+'+imgPart ); }
        }
        return result;
    }

    // A wrapper for methods in the Math object.
    function math( fn , symbol ) {
        var g = symbol.group,
            name = fn.value;
        if( g === N && NUMER ) { 
            var f = Math[name] ? Math[name] : Math2[name].fn;
            symbol.multiplier = f( symbol.multiplier );
        }
        else {
            if( (  g === CP || g === PL ) && symbol.power === 1 ){
                symbol.group = FN;
                symbol.value = fn.value;
            }
            else {
                fn.group = FN;
                fn.symbols = Parser.addSymbol( symbol, {}, fn );
                symbol = fn;
            }
        } 
        return symbol;
    }
    
    //checks if a number of symbol is negative;
    function isNeg( obj ) {
        if( isSymbol( obj ) ) {
            obj = obj.multiplier;
        }
        return obj < 0;
    }
    
    //this function doesn't do much other than carry parentheses
    function parens( symbol ) {
        return Parser.parse('parens'+inBrackets( text(symbol) ) );
    }
    
    function isReserved( value ) { 
        if( RESERVED.indexOf( value ) !== -1) throw new Error( value+' is reserved!' );
        return false;
    }
    
    /**
     * 
     * @param {String} expression the expression to be evaluated
     * @param {Object} subs the object containing the variable values
     * @param {Integer} location a specific location in the equation list to 
     * insert the evaluated expression
     * @param {String} opt additional options
     * @returns {Symbol} 
     */
    var userFuncs = function( expression, subs, location, opt ) {
        var eq = opt === 'numer' ? numBlock(function(){
                return  Parser.parse( expression, subs ) ;
            }) : Parser.parse( expression, subs );
        if( location ) {
            EQNS[location-1] = eq;
        }
        else {
            EQNS.push( eq );
        }
        return eq;
    };
    
    /**
     * 
     * @returns {String} returns the version of nerdamer
     */
    userFuncs.version = function() {
        return version;
    };

    /**
     * 
     * @param {String} constant the name of the constant to be set
     * @param {mixed} value The value of the constant 
     * @returns {nerdamer object}
     */
    userFuncs.setConstant = function( constant, value ) {
        validateName( constant[0] ); 
        if( !isReserved( constant ) ) {
            if( value === 'delete' ) {
                delete constants[constant];
            }
            else {
                if( isNaN( value ) ) throw new Error('Constant must be a number!');
                constants[constant] =  value;
            }
        }    
        return this;
    };
    
    /**
     * 
     * @param {Integer} equationNumber the equation number of which to build the function
     * @param {Array} paramArray used to exclude or add extra parameters to argument list. 
     * this can also be used to change the order of the parameters as they are in 
     * alphabetical order by default.
     * @returns {function} returns a native javascript function
     */
    userFuncs.buildFunction = Symbol.prototype.buildFunction = function( equationNumber, paramArray ) {
        var eq = EQNS[equationNumber -1] || this;
        return build( eq, paramArray );
    };

    /**
     * 
     * @param {String} name the name of the function
     * @param {Array} params a list containing the parameter name of the functions
     * @param {String} fn the body of the function
     * @returns {Boolean} returns true if succeeded and falls on fail
     * @example nerdamer.setFunction('f',['x'], 'x^2+2');
     */
    userFuncs.setFunction = function( name, params, fn ) {
        if( !isReserved( name ) ) {
            functions[name] = [ map, params.length, fn, params ];
            return true;
        }
        return false;
    };
    
    /**
     * 
     * @param {String} subs an object containing variable: key pairs
     * @returns {String}
     */
    userFuncs.evaluate = function( subs ) {
        return this.getEquation().evaluate( subs );
    };
    
    
    /**
     * 
     * @param {Integer | String} equationNumber the number of the equation to clear. 
     * If 'all' is supplied then all equations are cleared
     * @param {Boolean} nochange use true if you don't want the lenght of the array to change
     * @returns {nerdamer object}
     */
    userFuncs.clear = function( equationNumber, nochange ) { 
        if( equationNumber === 'all' ) { EQNS = []; }
        else { 
            equationNumber = !equationNumber ? EQNS.length : equationNumber - 1; 
            nochange === true ? EQNS[equationNumber] = undefined : remove( EQNS, equationNumber );
        }   
        return this;
    };
    
    /**
     * 
     * @param {Integer} equationNumber
     * @param {String} opt 'latex' to have it returned as latex or 'text' for text
     * @returns {Symbol}
     * @returns {String} if opt 'latex' or 'text' is used
     */
    userFuncs.getEquation = function( equationNumber, opt ) {
        equationNumber = equationNumber || EQNS.length;
        var eq = EQNS[equationNumber - 1];
        if( opt === 'latex' ) eq = Formatting.latex( eq );
        else if( opt === 'text' ) eq = eq.text();
        return eq;
    };
    
    /**
     * 
     * @param {Integer} equationNumber
     * @param {String | Symbol} eq the equations to be set
     * @returns {nerdamer object}
     */
    userFuncs.setEquation = function( equationNumber, eq ) {
        if( equationNumber === undefined  ||equationNumber < 1 || isNaN( equationNumber ) ) {
            throw new Error( 'Not a valid equation number!' );
        }
        EQNS[ equationNumber - 1 ] = typeof eq === 'string' ? Parser.parse(eq) : eq;
        return this;
    };
    
    /**
     * 
     * @param {Boolean} asObject
     * @param {Boolean} asLatex
     * @returns {Array}
     */
    userFuncs.equations = function( asObject, asLatex ) {
        var result = asObject ? {} : [];
        for( var i=0; i<EQNS.length; i++ ) {
            var eq = asLatex ? Formatting.latex( EQNS[i] ) : text( EQNS[i] );
            if( asObject ) {
                result[i+1] = eq;
            }
            else {
                result.push( eq );
            }
        }
        return result;
    };
    
    /**
     * 
     * @param {Boolean} asArray have the reserved names returned as an array
     * @returns {Array | String}
     */
    userFuncs.reserved = function( asArray ) {
        if( asArray ){ return RESERVED; }
        return RESERVED.join(', ');
    };
    
    /**
     * 
     * @returns {Array} Array of functions currently supported by nerdamer
     */
    userFuncs.supported = function() {
        var funcs = keys(functions),
            exclude = ['parens'];
        for( var i=0;i<exclude.length;i++) {
            remove( funcs, funcs.indexOf( exclude[i]) );
        }
        return funcs;
    };
    
    /*
     * 
     * @return {Integer} The number of equations in memory
     */
    userFuncs.numEquations = function() {
        return EQNS.length;
    }
    
    //backwards compatibility with older versions
    userFuncs.addEquation = function() {
        return this.apply(undefined, arguments);
    };
    
    //this function can be used to validate variable names for compatibility 
    //with the library
    userFuncs.validateName = validateName;
    
    //backwards compatibility with previous versions
    userFuncs.expressions = userFuncs.equations;
   
    return userFuncs;
    
})( typeof nerdamerModules !== 'undefined' ? nerdamerModules : {} ); 
