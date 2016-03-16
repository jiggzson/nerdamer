/*
* Author : Martin Donk
* Website : http://www.nerdamer.com
* Email : martin.r.donk@gmail.com
* Source : https://github.com/jiggzson/nerdamer
*/

if((typeof module) !== 'undefined' && typeof nerdamer === 'undefined') {
    nerdamer = require('./nerdamer.core.js');
//    require('./Algebra.js');
}

(function() {
    var core = nerdamer.getCore(),
        _ = core.PARSER,
        Frac = core.Frac,
        isSymbol = core.Utils.isSymbol,
        FN = core.groups.FN,
        Symbol = core.Symbol,
        text = core.Utils.text,
        inBrackets = core.Utils.inBrackets,
        N = core.groups. N,
        S = core.groups.S,
        FN = core.groups.FN,
        PL = core.groups.PL,
        CP = core.groups.CP,
        CB = core.groups.CB,
        EX = core.groups.EX;
    var __ = core.Calculus = {
        version: '1.1.3',
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
                        subs = {'~': true}, //lock subs
                    retval = new core.Symbol(0);

                    for(var i=start; i<=end; i++) {
                        subs[index] = new Symbol(i); 
                        retval = _.add(retval, _.parse(f, subs)); //verrrrryyy sllloooowww
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
                    symbol.multiplier *= symbol.power;
                    symbol.power = symbol.power.subtract(new Frac(1)); 
                    if(symbol.power.equals(0)) {
                        symbol = Symbol(symbol.multiplier);
                    }
                } 
                return symbol;
            };
            function derive(symbol) { 
                var g = symbol.group, a, b, cp; 

                if(g === N || g === S && symbol.value !== d) { 
                    symbol = Symbol(0);
                }
                else if(g === S) {  
                    symbol = polydiff(symbol);
                }
                else if(g === CB) { 
                    var m = symbol.multiplier;
                    symbol.multiplier.equals(1);
                    var retval =  _.multiply(product_rule(symbol),polydiff(symbol.clone()));
                    retval.multiplier = retval.multiplier.multiply(m);
                    return retval;
                }
                else if(g === FN && symbol.power.equals(1)) { 
                    // Table of known derivatives
                    switch(symbol.fname) {
                        case 'log':
                            cp = symbol.clone();
                            symbol = symbol.args[0].clone();//get the arguments

                            if( isSymbol(symbol.power) ) {
                                symbol.power.negate();
                            }
                            else {
                                symbol.power = symbol.power.negate();
                            }
                            symbol.multiplier = cp.multiplier.divide(symbol.multiplier); 
                            break;
                        case 'cos':
                            //cos -> -sin
                            symbol.fname = 'sin';
                            symbol.multiplier.negate();
                            break;
                        case 'sin': 
                            //sin -> cos
                            symbol.fname = 'cos';
                            break;
                        case 'tan':
                            //tan -> sec^2
                            symbol.fname = 'sec';
                            symbol.power = new Frac(2);
                            break;
                        case 'sec': 
                            // Use a clone if this gives errors
                            symbol = qdiff(symbol, 'tan');
                            break;
                        case 'csc':
                            symbol = qdiff(symbol, '-cot');
                            break;
                        case 'cot':
                            symbol.fname = 'csc';
                            symbol.multiplier.negate();
                            symbol.power = new Frac(2);
                            break;
                        case 'asin':
                            symbol = _.parse('(sqrt(1-('+text(symbol.args[0])+')^2))^(-1)');
                            break;
                        case 'acos':
                            symbol = _.parse('-(sqrt(1-('+text(symbol.args[0])+')^2))^(-1)');
                            break;
                        case 'atan':
                            symbol = _.parse('(1+('+text(symbol.args[0])+')^2)^(-1)');
                            break;
                        case 'abs':
                            m = symbol.multiplier; 
                            symbol.multiplier = 1;
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
                        a = _.multiply(_.parse('log'+inBrackets(value)), symbol.power.clone()); 
                        b = __.diff(_.multiply(_.parse('log'+inBrackets(value)), symbol.power.clone()), d); 
                    symbol = _.multiply(symbol, b);
                }
                else if(g === FN && !symbol.power.equals(1)) { 
                    b = symbol.clone();
                    //turn b into a vanilla powerless, multiplier-less symbol
                    b.toLinear(); 
                    b.unitMultiplier();
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
        integral: function(symbol, ig) {
            return _.symfunction('integrate', [symbol, ig]);
        },
        integrate: function(symbol, integrand) {   
            var u, du, a, b, //the parts used for testing cases which are globals
                g = symbol.group,
                dx = text(integrand),
                option = {
                /*************************************************************************************
                 * 1. get the denominator
                 * 2. get all symbols which contain the symbol and place in new symbol - this is your u
                 * 3. the remaining symbols are your a - finding your b is trickier
                 * 4. get numerator
                 * 5. generate du
                 * 6. start testing all of the cases
                 * This significantly simplifies integration and maybe even makes it feasible
                 *************************************************************************************/
                // du/u 
                1: function() {
                    
                },
                // du/(a^2+u^2)
                2: function() {
                    
                },
                // du/sqrt(a^2-u^2)
                3: function() {
                    
                },
                // du/(au+b)
                4: function() {
                    
                },
                // udu/(au+b)^2
                5: function() {
                    
                }
            };
            var separate = function(symbol, variable) { 
                var fraction = symbol.asFraction(true),
                    organized = {
                        num: [new Symbol(0), new Symbol(0)],
                        denom: [new Symbol(0), new Symbol(0)],
                        pows: []
                    },
                    organize = function(arr, target, multiplier, index) {
                        var l = arr.length;
                        for(var i=0; i<l; i++) {
                            var s = arr.pop(),
                                g = s.group;
                            if(s.contains(variable, true)) {
                                var p = Math.abs(s.power);
                                organized.pows[index] = p; //make a note of the power
                                //we want to know the structure for all denominators having powers 1, 2, 0.5
                                if((g === PL || g === CP) && (p === 1 || p === 2 || p === 0.5)) {
                                    for(var x in s.symbols) {
                                        var s2 = _.multiply(s.symbols[x], multiplier.clone());

                                        if(s2.contains(variable, true)) target[0] = _.add(target[0], s2);
                                        else target[1] = _.add(target[1], s2);
                                    }
                                }
                                else {
                                    target[0] = _.add(target[0], _.multiply(s, multiplier.clone()));
                                }
                            }
                            else {
                                target[1] = _.add(target[1], _.multiply(s, multiplier.clone()));
                            }   
                        }
                    };
                
                organize(fraction.num, organized.num, fraction.num_multiplier, 0);
                organize(fraction.denom, organized.denom, fraction.denom_multiplier, 1);
                return organized;
            };
            //prepare the parts we need for integration
            //convert the symbol to a fraction so we can start running tests
            var frac = separate(symbol, dx);
            //try case 1
            return symbol;
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
            name: 'differentiate',
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
            numargs: [2, 3], 
            build: function(){ return __.integrate; }
        }
    ]);
})();
