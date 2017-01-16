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
    "use strict";
    
    var core = nerdamer.getCore(),
        _ = core.PARSER,
        Frac = core.Frac,
        isSymbol = core.Utils.isSymbol,
        FN = core.groups.FN,
        Symbol = core.Symbol,
        text = core.Utils.text,
        inBrackets = core.Utils.inBrackets,
        format = core.Utils.format,
        CONST_HASH = core.Settings.CONST_HASH,
        isInt = core.Utils.isInt,
        N = core.groups. N,
        S = core.groups.S,
        FN = core.groups.FN,
        PL = core.groups.PL,
        CP = core.groups.CP,
        CB = core.groups.CB,
        EX = core.groups.EX,
        P = core.groups.P;
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
            
            //unwrap sqrt
            if(symbol.group === FN && symbol.fname === 'sqrt') {
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
                        case 'log':
                            cp = symbol.clone();
                            symbol = symbol.args[0].clone();//get the arguments
                            symbol.power = symbol.power.negate();
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
        integrate: function(symbol, dt) {
            var stop = function() {
                throw new Error('Stopping!');
            };
            var get_udv = function(symbol) { 
                var parts = [[/*L*/], [/*I*/], [/*A*/], [/*T*/], [/*E*/]];
                //first we sort them 
                var setSymbol = function(x) {
                    var g = x.group;
                    if(g === FN) {
                        var inv_trig_fns = ['asin', 'acos', 'atan', 'acsc', 'asec', 'acot'],
                            trig_fns = ['cos', 'sin', 'tan', 'sec', 'csc', 'cot'],
                            fname = x.fname;
                        if(trig_fns.indexOf(fname) !== -1)
                            parts[3].push(x);
                        else if(inv_trig_fns.indexOf(fname) !== -1)
                            parts[1].push(x);
                        else if(fname === 'log')
                            parts[0].push(x);
                        else {
                            stop();
                        }
                    }
                    else if(g === S || symbol.isComposite() || g === CB && symbol.contains(dx))
                        parts[2].push(x);
                    else if(g === EX)
                        parts[4].push(x);
                    else
                        stop();
                };
                if(symbol.group === CP) 
                    symbol.each(function(x) {
                        setSymbol(x);
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
            var integration_by_parts = function(symbol) {
                var udv, u, dv, du, v, vdu, uv, retval, integral_vdu;
                //first LIATE
                udv = get_udv(symbol);
                u = udv[0]; 
                dv = udv[1];
                du = Symbol.unwrapSQRT(__.diff(u.clone(), dx));
                v = __.integrate(dv.clone(), dx);
                vdu = _.multiply(v.clone(), du);
                uv = _.multiply(u, v);
                integral_vdu = __.integrate(vdu.clone(), dx);
                retval = _.subtract(uv, integral_vdu);
                return retval;
            };
            var integrate_sqrt_fn = function(symbol) { 
                var arg, a, b, bp, bx, p, retval;
                arg = symbol.args[0]; //get the inside of the function
                p = symbol.power;
                a = new Symbol(0);
                bx = new Symbol(0);
                //assumed to be in the form sqrt(a+b*x)
                if(arg.group === CP) { 
                    arg.each(function(x) {
                        if(x.contains(dx))  bx = _.add(bx, x.clone());
                        else a = _.add(a, x.clone());
                    });
                } 
                var bx_sign = bx.sign(),
                    a_sign = a.sign();
                b = bx.stripVar(dx); //strip out the dx so a*x becomes a. (a-x)
                //if a is in the form b*x or x
                if(bx.group === S || bx.group === CB || bx.group === CP) {
                    var bp, b, r,  bxg = bx.group; 
                    bp = bxg === S || bxg === CP ? bx.power.toDecimal() : bx.symbols[dx].power.toDecimal();

                    if(bxg === S) 
                        r = new Symbol(dx);
                    if(bxg === CP)
                        r = bx.clone().negate().toLinear();
                    
                    if(p.equals(-1)) {
                        if(isInt(bp) && bp === 2) { 
                            var a_sqrt, b_sqrt;
                            a_sqrt = _.pow(a.clone(), new Symbol(1/2));
                            b_sqrt = _.pow(b.clone().negate(), new Symbol(1/2));
                            if(b.sign() < 0) {
                                //asin
                                var asin = _.symfunction('asin', [_.divide(_.multiply(b_sqrt, r), a_sqrt)]); 
                                retval = _.divide(asin, b_sqrt);
                            }
                        }
                    }
                    else {
                        stop();
                    }                        
                }
                return retval;
            };
            var pow_integrate = function(symbol) {
                var retval = symbol.clone();
                retval.power = retval.power.add(new Frac(1));
                retval.multiplier = retval.multiplier.divide(retval.power);
                return retval;
            };
            var trig_sub = function(a, bx) {
                
            };
            var integrate_rational = function(symbol) {
                
            };
            
            var integrate_by_substitution = function(symbol) {
                var u, du, a, b;
                if(symbol.group === CB) {
                    var symbols, g1, g2;
                    symbols = symbol.collectSymbols();
                    //has to be a combination of u du or else nothing to do
                    if(symbols.length !== 2) 
                        stop();
                    //let's keep the group from small to large
                    if(symbols[0].group > symbols[1].group)
                        symbols.reverse();
                    //place sqrt in radical form
                    if(symbols[0].isSQRT())
                        symbols[0] = Symbol.unwrapSQRT(symbols[0], true);
                    if(symbols[1].isSQRT())
                        symbols[1] = Symbol.unwrapSQRT(symbols[1], true);

                    g1 = symbols[0].group; g2 = symbols[1].group;
                    
                    if(g1 === S && g2 === CP) {
                        //let u = a+bx
                        u = __.diff(symbols[1].clone().toLinear());
                        du = symbols[0].clone();
                        var c = _.divide(__.diff(u, dx), du);
                        if(c.isConstant()) { 
                            return _.divide(pow_integrate(symbols[1].clone()), c);
                        }
                        else stop();
                    }
                }
                else {
                    stop();
                }
            };
            //unwrap sqrt
            symbol = Symbol.unwrapSQRT(symbol);
            try {
                var dx = isSymbol(dt) ? dt.toString() : dt;
                var has_dx = symbol.contains(dx);
                var g = symbol.group, 
                    retval;
                if(g === N || g === P) 
                    retval = _.multiply(symbol.clone(), _.parse(dx));
                else if(g === S && has_dx) {
                    //1/x
                    if(symbol.power.equals(-1)) 
                        retval = _.symfunction('log', [new Symbol(dx)]);
                    //all other x's
                    else {
                        return pow_integrate(symbol);
                    }
                }
                //x+x^2
                else if(g === PL && has_dx) {
                    retval = new Symbol(0);
                    symbol.each(function(x) {
                        retval = _.add(retval, __.integrate(x, dx));
                    });
                }
                //a*x
                else if(g === CB && has_dx) { 
                    if(!symbol.isMonomial()) { 
                        var a, b, denom, num;
                        denom = symbol.getDenom();
                        if(denom.isSQRT()) {
                            num = symbol.getNum();
                            if(!num.contains(dx)) {
                                b = integrate_sqrt_fn(denom);
                                return _.multiply(num, b);
                            }
                            else {
                                return integrate_by_substitution(symbol);
                                stop();
                            }
                        }
                        else {
                            /** INTEGRATION BY PARTS **/
                            return integration_by_parts(symbol);
                        }
                    }
                    else { 
                        retval = new Symbol(1);
                        symbol.each(function(x) {
                            var t = x.contains(dx) ? __.integrate(x, dx) : x;
                            retval = _.multiply(retval, t);
                        });
                    } 
                }
                //x+1
                else if(g === CP && has_dx) {
                    retval = new Symbol(0);
                    symbol.each(function(x) {
                        retval = _.add(retval, __.integrate(x, dx));
                    });
                }
                //has to be all linear
                //trig functions 
                else if(g === FN && has_dx && symbol.args[0].isLinear()) { 
                    retval = symbol.clone();
                    var inv_trig = function(symbol, istr, dl, f) {
                        var arg = symbol.args[0].clone(),
                            a = __.diff(arg.clone(), dx).toString(),
                            b = new Symbol(0),
                            c = arg.toString();
                        if(arg.group === CP) {
                            arg.each(function(x) {
                                if(!x.isLinear() || x.group !== S && x.contains(dx)) stop();
                                if(x.value !== dx)
                                    b = _.add(b, _.multiply(x.clone(), _.parse(format(dl, c, a))));
                            });
                        }
                        symbol = _.parse(format(istr, arg.toString(), a, dx));
                        symbol = _[f](symbol, b);
                        return symbol;
                    };
                    if(symbol.fname === 'acos') {
                        return inv_trig(retval, '{2}*acos({0})-sqrt(1-({0})^2)/({1})', 'asin(-({0}))', 'add');
                    }
                    else if(symbol.fname === 'asin') { 
                        return integration_by_parts(symbol);
                    }
                    else if(symbol.fname === 'atan') {
                        return inv_trig(retval, '{2}*atan({0})-log(1+({0})^2)/(2*({1}))', 'atan(({0}))/({1})', 'add');
                    }
                    else if(symbol.fname === core.Settings.SQRT) {
                        return integrate_sqrt_fn(symbol);
                    }
                    else {
                        switch(symbol.fname) {
                            case 'cos':
                                retval.fname = 'sin';
                                break;
                            case 'sin':
                                retval.fname = 'cos';
                                retval.negate();
                                break;
                            case 'tan':
                                retval = _.parse(format('log(sec({0}))', symbol.args[0].toString()));
                                break;
                            case 'sec':
                                retval = _.parse(format('log(tan({0})+sec({0}))', symbol.args[0].toString()));
                                break;
                            case 'csc':
                                retval = _.parse(format('-log(csc({0})+cot({0}))', symbol.args[0].toString()));
                                break;
                            case 'cot':
                                retval = _.parse(format('log(sin({0}))', symbol.args[0].toString()));
                                break;
                            case 'log':
                                var a = symbol.args[0].clone(),
                                    m = _.parse(retval.multiplier.toString()),
                                    b = core.Calculus.diff(a.clone(), dx);
                                retval.toUnitMultiplier();
                                retval = _.multiply(_.divide(_.subtract(_.multiply(a, retval), a.clone()), b), m);
                        }
                        retval.updateHash();
                        retval = _.divide(retval, __.diff(symbol.args[0].clone(), dx));
                    }
                }
                else if(g === EX && symbol.contains(dx, true) && symbol.power.isLinear()) {
                    //we cover all variables raised to the x here including e
                    if(!symbol.contains(dx)) { 
                        if(symbol.isE()) //e^x
                            retval = symbol.clone();
                        else {
                            var a = _.symfunction('log', [_.parse(symbol.value)]);
                            retval = _.divide(symbol.clone(), a);
                        }
                    }
                    else if(!symbol.power.contains(dx)) {
                        //simple integration
                        retval = symbol.clone();
                        retval.power = _.add(retval.power, new Symbol(1));
                        retval = _.divide(retval, retval.power.clone());
                    }
                }

                if(retval) return retval;
            }
            catch(e){ /* no integral found */; 
                console.log(e.stack);
            }
            return _.symfunction('integrate', [symbol.clone(), dt]);
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
            numargs: 2,
            build: function() { return __.integrate; }
        }
    ]);
})();
