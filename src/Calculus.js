nerdamer.register([
    {
    parent: 'Calculus',
    name: 'sum',
    visible: true,
    numargs: 2,
    init: function() {
        var Parser = this,
        FN = Parser.groups.FN;
        //note that only the first argument is a symbol
        return function( fn, variable, index, end ) {
            if( !isNaN( variable )) throw new Error('Incorrect parameter!');
            
            if( !isNaN( index ) && !isNaN( end ) ) { 
                // Backup the current value for the variable.
                var lastc = '0', //last computation.
                    eq = Parser.utils.text( fn ),
                    vars = Parser.utils.variables( fn ),
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
                    Parser.numBlock( function() {
                        for( i=index; i<=end; i++) {
                            k[variable] = i;
                            
                            //Append the last equation and then just reparse the whole thing
                            lastc = Parser.utils.text(Parser.parse( (lastc+'+'+eq).replace(/\+\-/g,'-'), k ) ); 
                        }
                    });
                    result = Parser.parse( ''+lastc );
                }
                    
                return result;
            }
            else {
                //make it a symbol
                var s = Parser.parse('sum');
                    s.symbols = Parser.addSymbol( fn, {} ); 
                    s.group = FN;
                    s.params = [ variable, index, end ];
                return s;
            }   
        }
    }
},
{
    parent: 'Calculus',
    name: 'diff',
    visible: true,
    numargs: 2,
    init: function() {
        var Parser = this,
        FN = this.groups.FN,
        self = this.classes.calculus;
        //note that only the first argument is a symbol
        return function( obj, d ) { 
            if( Parser.utils.isSymbol( d )) d = d.value;

            if( obj.group === FN ) {
                if( Parser.utils.isSymbol( obj.power ) ) {
                    obj = self.derive( obj, d );
                }
                else {
                    obj = self.chainRule( obj, d );
                } 
            }
            else {
                obj = self.derive( obj, d );
            }

            return obj;
        }
    }
},
{
    parent: 'Calculus',
    name: 'polydiff',
    visible: false,
    numargs: 1,
    init: function(Parser) {
        var Parser = this;
        //note that only the first argument is a symbol
        return function( symbol, d ) { 
            if( symbol.value === d || symbol.hasVariable( d, true )) { 
                symbol.multiplier *= symbol.power;
                symbol.power -= 1; 
                if( symbol.power === 0 ) {
                    symbol = Parser.convertSymbol( symbol.multiplier );
                }
            } 
            return symbol;
        }
    }
},
{
    parent: 'Calculus',
    name: 'derive',
    visible: false,
    numargs: 2,
    init: function() {
        var Parser = this,
        self = this.classes.calculus,
        N   = this.groups.N,
        S   = this.groups.S,
        CB  = this.groups.CB,
        EX  = this.groups.EX,
        FN  = this.groups.FN,
        PL  = this.groups.PL,
        inBrackets = this.utils.inBrackets,
        isSymbol = this.utils.isSymbol,
        text = this.utils.text;
        //note that only the first argument is a symbol
        return function( symbol, d) { 
            var g = symbol.group, t, a, b, cp; 
            if( isSymbol( symbol ) ) { 
                if( g === N || g === S && symbol.value !== d ) { 
                    symbol = Parser.convertSymbol( 0 );
                }
                else if( g === S ) {  
                    symbol = self.polydiff( symbol, d );
                }
                else if( g === CB ) { 
                    var m = symbol.multiplier;
                    symbol.multiplier = 1;
                    cp = symbol.copy();
                    a = self.productRule( symbol, d ); 
                    b = self.polydiff( cp, d ); 
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
                                symbol.power = Parser.multiply( symbol.power, Parser.convertSymbol(-1));
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
                            symbol = self.quickdiff( symbol, 'tan');
                            break;
                        case 'csc':
                            symbol = self.quickdiff( symbol, '-cot');
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
                            symbol = Parser.convertSymbol(1);
                            break;
                    }
                }
                else if( g === EX || g === FN && Parser.utils.isSymbol( symbol.power ) ) { 
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
                        b = self.diff( a, d ); 
                    symbol = Parser.multiply( symbol, b );
                }
                else if( g === FN && symbol.power !== 1 ) { 
                    a = self.polydiff( symbol.copy(), d );
                    b = symbol.copy();
                    
                    //turn b into a vanilla powerless, multiplier-less symbol
                    b.power = 1; 
                    b.multiplier = 1;
                    
                    b = self.derive(b, d);
                    symbol = Parser.multiply( a, b );  
                }
                else if( g === CP || g === PL ) {
                    a = self.polydiff( symbol.copy(), d );
                    b = self.diff( symbol.symbols, d );
                    symbol = Parser.multiply( a, b );
                }
            }
            else { 
                t = {};
                var obj = symbol;
                for( var x in obj ) { 
                    var u = self.diff( obj[x].copy(), d );
                    Parser.addSymbol( u, t );
                }
                symbol = Parser.packSymbol( t );
            } 
            return symbol;
        }
    }
},
{
    parent: 'Calculus',
    name: 'quickdiff',
    visible: false,
    numargs: 3,
    init: function() {
        var Parser = this,
        text = this.utils.text,
        inBrackets = this.utils.inBrackets;
        //note that only the first argument is a symbol
        return function( symbol, val, altVal ) {
            return Parser.multiply( symbol, Parser.parse( val+inBrackets( altVal || text( symbol.symbols ) ) ));
        }
    }
},
{
    parent: 'Calculus',
    name: 'chainRule',
    visible: false,
    numargs: 2,
    init: function() {
        var Parser = this,
        self = this.classes.calculus;
        //note that only the first argument is a symbol
        return function( symbol, d ) {
            var a = self.derive( symbol, d ),
                b = self.derive( symbol.symbols, d );
            return Parser.multiply( a , b );
        }
    }
},
{
    parent: 'Calculus',
    name: 'productRule',
    visible: false,
    numargs: 2,
    init: function(Parser) {
        var Parser = this,
        keys = Parser.utils.keys,
        self = this.classes.calculus;
        //note that only the first argument is a symbol
        return function( symbol, d ) { 
            var n = 0,//use this to keep track of how many derivatives you actually pulled
                stack = [],
                k = keys( symbol.symbols ),
                l = k.length,
                result = symbol;// the default return
        
            // A regular for loop is chosen to reduce the number of loops by pulling the keys and working with that;
            for( var i=0; i<l; i++ ) {
                var key = k[i],
                    df = self.diff( symbol.symbols[key].copy(), d ); 
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
        }
    }
}
]);


