/*
* Author : Martin Donk
* Website : http://www.nerdamer.com
* Email : martin.r.donk@gmail.com
* Source : https://github.com/jiggzson/nerdamer
*/

if((typeof module) !== 'undefined' && typeof nerdamer === 'undefined') {
    nerdamer = require('./nerdamer.core.js');
    require('./Algebra.js');
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
        version: '1.2.0',
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
        integrate: function(symbol, dt, depth) {
            symbol = symbol.clone();

            depth = depth || 0;
            depth++; 
            var stop = function(msg) {
                msg = msg || 'Stopping!';
                throw new Error(msg);
            };
            
            function in_inverse_trig(x) {
                var inv_trig_fns = ['asin', 'acos', 'atan', 'acsc', 'asec', 'acot'];
                return inv_trig_fns.indexOf(x) !== -1;
            };
            
            function in_trig(x) {
                var trig_fns = ['cos', 'sin', 'tan', 'sec', 'csc', 'cot'];
                return trig_fns.indexOf(x) !== -1;
            };
            
            if(depth > 5) throw new Error('Maximum depth reached. Exiting!');
            
            var get_udv = function(symbol) { 
                var parts = [[/*L*/], [/*I*/], [/*A*/], [/*T*/], [/*E*/]];
                //first we sort them 
                var setSymbol = function(x) { 
                    var g = x.group; 
                    if(g === FN) {
                        var fname = x.fname;
                        if(in_trig(fname))
                            parts[3].push(x);
                        else if(in_inverse_trig(fname))
                            parts[1].push(x);
                        else if(fname === 'log')
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
            function integration_by_parts(symbol) {
                console.log('============================================================================')
                console.log('INTEGRATION BY PARTS: '+(symbol || 'null').toString())
                var udv, u, dv, du, v, vdu, uv, retval, integral_vdu;
                
                //first LIATE
                udv = get_udv(symbol);
                u = udv[0]; 
                dv = udv[1];
                
                console.log('u: '+u);
                console.log('dv: '+dv);
                du = Symbol.unwrapSQRT(__.diff(u.clone(), dx));
                console.log('du: '+du);
                v = __.integrate(dv.clone(), dx, depth);
                console.log('v: '+v);
                vdu = _.multiply(v.clone(), du);
                console.log('vdu: '+vdu);
                uv = _.multiply(u, v);
                integral_vdu = __.integrate(vdu.clone(), dx, depth, depth);
                console.log('ivdu: '+integral_vdu);
                retval = _.subtract(uv, integral_vdu);
                console.log('retval: '+retval);
                return retval;
            };
            function poly_integrate(symbol) { 
                var retval = symbol.clone();
                retval.power = retval.power.add(new Frac(1));
                retval.multiplier = retval.multiplier.divide(retval.power);
                return retval;
            };
            function integrate_poly_fn(symbol) { 
                var fn, a, b, bp, bx, p;
                fn = symbol.clone().toLinear().toUnitMultiplier(); //get the inside of the function
                p = symbol.power;
                a = new Symbol(0);
                bx = new Symbol(0);
                //assumed to be in the form sqrt(a+b*x)
                if(fn.group === CP) { 
                    fn.each(function(x) {
                        if(x.contains(dx))  bx = _.add(bx, x.clone());
                        else a = _.add(a, x.clone());
                    });
                } 
                try { //set up a try catch box to see if we can get out some factors
                    if(p.equals(-1)) {
                        var factors = core.Algebra.Factor.factor(symbol.clone().toLinear());
                        console.log(factors.toString())
                        if(factors.group === CB) {
                            var factor_array = [],
                                cnst = new Symbol(1);
                            factors.each(function(x) {
                                var factor = x.args[0];
                                if(!factor.isConstant()) {
                                    if(!factor.isLinear(dx)) stop(); //don't want any non-linear factors
                                    factor_array.push(factor); //everything's good so add the factor
                                }
                                else cnst = _.multiply(cnst, factor);
                            });
                            //see if we have more than one usable factor
                            if(factor_array.length === 2) {
                                var A = factor_array[0].stripVar(dx),
                                    B = factor_array[1].stripVar(dx),
                                    arg = _.divide(factor_array[0].clone(), factor_array[1].clone());
                                A.multiplier = A.multiplier.multiply(factor_array[1].symbols[dx].multiplier);
                                B.multiplier = B.multiplier.multiply(factor_array[0].symbols[dx].multiplier);
                                return  _.divide(_.multiply(_.subtract(B, A).invert(), _.symfunction('log', [arg])), cnst);
                            }
                        }
                    }
                }
                catch(e){; }
                
                b = bx.stripVar(dx); //strip out the dx so a*x becomes a. (a-x)
                if(bx.isLinear() && symbol.group !== EX) { 
                    if(p.equals(-1) && !b.equals(0)) { 
                        var result = _.divide(_.symfunction('log', [fn.clone()]), b);
                        result.multiplier = result.multiplier.multiply(symbol.multiplier);
                        return result;
                    }
                    else if(p.lessThan(0) && !p.equals(-1)) { 
                        return _.divide(poly_integrate(symbol), __.diff(bx.clone(), dx)); //easy enough
                    }
                    else if(p.greaterThan(0)) { 
                        if(isInt(p)) {
                            var result = new Symbol(0); 
                            symbol = _.expand(symbol);
                            symbol.each(function(x) {
                                result = _.add(result, __.integrate(x.clone(), dx, depth));
                            });
                            return result;
                        }
                        return _.divide(poly_integrate(symbol), __.diff(bx.clone(), dx)); //easy enough    
                    }
                    else stop();
                }
                //if a is in the form b*x or x
                else if(bx.group === S || bx.group === CB || bx.group === CP) {
                    var bp, b, r,  bxg = bx.group; 
                    bp = bxg === S || bxg === CP ? bx.power.toDecimal() : bx.symbols[dx].power.toDecimal();
                    //store the group of bx since it may be a PL we have to check how to procede
                    if(bxg === S) 
                        r = new Symbol(dx);
                    if(bxg === CP)
                        r = bx.clone().negate().toLinear();
                    //bx has to be of form bx^2
                    if(isInt(bp) && bp === 2) { 
                        var a_sqrt, b_sqrt, a_sign, b_sign;
                        a_sign = a.sign(); b_sign = b.sign();
                        a_sqrt = _.pow(a.clone(), new Symbol(1/2)); 
                        if(p.equals(-1/2)) { 
                            b_sqrt = _.pow(b.clone().negate(), new Symbol(1/2));
                            var asin = _.symfunction('asin', [_.divide(_.multiply(b_sqrt, r), a_sqrt)]); 
                            retval = _.divide(asin, b_sqrt);
                        }
                        else if(p.equals(-1)) { 
                            a.power = a.power.multiply(new Frac(1/2));
                            var sqrt_m = _.parse('sqrt('+a.multiplier.multiply(b.multiplier)+')');
                            a.toUnitMultiplier();
                            a = _.multiply(a, sqrt_m);
                            var atan = _.symfunction('atan', [_.divide(r, a.clone())]); 
                            retval = _.divide(atan, a);
                        }
                    }
                    else {
                        console.log('bx: '+bx);
                        console.log('a: '+a);
                        console.log('b: '+b);
                        stop();
                    }                        
                }
                return retval;
            };

            //unwrap sqrt
            symbol = Symbol.unwrapSQRT(symbol, true);
            try {
                var dx = isSymbol(dt) ? dt.toString() : dt;
                var has_dx = symbol.contains(dx); 
                var has_EX = false;
                //those pesky EX's
                if(symbol.group === CB) {
                    symbol.each(function(x) {
                        if(x.group === EX) has_EX = true;
                    });
                }
                var g = symbol.group, 
                    retval;
                if(g === N || g === P || g === S && !has_dx) 
                    retval = _.multiply(symbol.clone(), _.parse(dx));
                else if(g === S && has_dx) {
                    //1/x
                    if(symbol.power.equals(-1)) 
                        retval = _.symfunction('log', [new Symbol(dx)]);
                    //all other x's
                    else {
                        return poly_integrate(symbol);
                    }
                }
                //x+x^2
                else if(g === PL && has_dx) { 
                    retval = new Symbol(0);
                    symbol.each(function(x) {
                        retval = _.add(retval, __.integrate(x, dx, depth));
                    });
                }
                //a*x
                else if(g === CB && has_dx) { 
                    //try u substitution
                    //get symbols and pull the derivative. If u works then quotient should be a constant
                    //in this case it shouldn't contain dx. This is mostly in the case of cos(x)*sin(x)
                    var symbols = symbol.collectSymbols().sort(function(a, b) {
                        if(a.group === b.group)  {
                            if(Number(a.power) === Number(b.power))
                                if(a < b) return 1; //I want sin first
                                else return -1;
                            return b.power - a.power; //descending power
                        }
                        return b.group - a.group; //descending groups
                    });
                    
                    //try u substitution
                    //get symbols and pull the derivative. If u works then quotient should be a constant
                    //in this case it shouldn't contain dx
                    var symbols = symbol.collectSymbols();
                    var l = symbols.length;
                    
                    //first try EX
                    if(symbols[0].group === EX) {
                        var qq = _.divide(symbols[1].clone(), __.diff(symbols[0].power.clone(), dx));
                        if(!qq.contains(dx)) { //success
                            return _.multiply(new Symbol(symbol.multiplier), _.multiply(_.divide(symbols[0], 
                                _.symfunction('log', [new Symbol(symbols[0].value)])), qq));
                        }
                    }
                    
                    for(var i=0; i<l; i++) {
                        var s = symbols[i].clone(); //let's look a the current symbol
                        var r = new Symbol(1);//the remaining symbols
                        for(var j=0; j<l; j++) {
                            if(i !== j) //multiply the remainder to r so we can check if in for u du
                                r = _.multiply(r, symbols[j].clone());
                        }
                        var q = _.divide(r, __.diff(s.clone().toLinear(), dx));
                        if(!q.contains(dx, true)) { 
                            q.multiplier = q.multiplier.multiply(symbol.multiplier);
                            var u = _.parse('(u)^'+s.power);
                            return _.multiply(_.parse(__.integrate(u, 'u', depth), {u: s.clone().toLinear()}), q);
                        }
                    }

                    var fname1 = symbols[0].fname, 
                        fname2 = symbols[1].fname;
                    if(l === 2 && ((fname1 === 'cos' && fname2 === 'sin' || fname1 ==='sin' && fname2 === 'cos') 
                            && symbols[0].args[0].equals(symbols[1].args[0]))) {
                        //check to see if we have two trig functions
                        var p1_even = core.Utils.even(symbols[0].power),
                            p2_even = core.Utils.even(symbols[1].power),
                            arg1 = symbols[0].args[0].toString(), 
                            arg2 = symbols[1].args[0].toString();
                        //for example cos(x)^3*sin(x)^2 => du = cos(x)
                        var result = new Symbol(0);
                        if(!p1_even || !p2_even) { 
                            var u, r, trans;
                            //since cos(x) is odd it carries du. If sin was odd then it would be the other way around
                            //know that p1 satifies the odd portion in this case. If p2 did than it would contain r
                            if(!p1_even) {
                                //u = sin(x)
                                u = symbols[1]; r = symbols[0]; 
                            }
                            else {
                                u = symbols[0]; r = symbols[1];
                            }
                            //get the sign of du. In this case r carries du as stated before and D(cos(x),x) = -sin(x)
                            var sign = u.fname === 'cos' ? -1 : 1;
                            var n = r.power, 
                                k = (n - 1)/2, //remove the du
                                //make the transformation cos(x)^2 = 1 - sin(x)^2
                                trans = _.parse('(1-'+u.fname+core.Utils.inBrackets(arg1)+'^2)^'+k), 
                                sym = _.expand(_.multiply(new Symbol(sign), _.multiply(u.clone(), trans)));
                            //
                            sym.each(function(x) {
                                result = _.add(result, poly_integrate(x.clone()));
                            });
                            return result;
                        }
                        else {
                            //performs double angle transformation
                            var double_angle = function(symbol) {
                                var m = symbol.multiplier, 
                                    p = symbol.power,
                                    k = p/2, e;
                                if(symbol.fname === 'cos')
                                    e = '(('+m+')*(1/2)+('+m+')*(cos(2*('+symbol.args[0]+'))/2))^'+k;
                                else
                                    e = '(('+m+')*(1/2)-('+m+')*(cos(2*('+symbol.args[0]+'))/2))^'+k;
                                
                                return _.parse(e);
                            };
                            //they're both even so transform both using double angle identities
                            var a = double_angle(symbols[0]),
                                b = double_angle(symbols[1]),
                                sym = _.expand(_.multiply(a, b));
                            sym.each(function(x) {
                                result = _.add(result, __.integrate(x, dx, depth));
                            });
                            return result;
                        }
                    }
                    //this is a mouthful. There has to be a bette way
                    else if(l === 2 && symbols[0].fname === 'sec' && symbols[1].fname === 'tan' && symbols[0].args[0].equals(symbols[1].args[0])) {
                        var a = symbols[0].args[0].clone().stripVar(dx);
                        return _.parse(format('({0})*(1/({1}*cos({2})))', symbol.multiplier, a, symbols[1].args[0]));
                    }
                    else if(l === 2 && symbols[1].group === S) {
                        //check for x^2/sqrt(1-x^2). Should be trig sub but this will do for now
                        var d = __.integrate(symbols[0], dx, depth); //integrate and see if it's asin
                        var p = Number(symbols[1].power);
                        if(d.group === CB) {
                            for(var x in d.symbols) {
                                var sym = d.symbols[x];
                                    if(sym.contains(dx) && sym.group === FN) {
                                        d = sym; break;
                                    }
                            }     
                        }
                        var is_atan = d.fname === 'atan',
                            is_sin = d.fname === 'asin',
                            s = Symbol.unwrapSQRT(symbols[0].clone(), true).toLinear(),
                            a = s.stripVar(dx),
                            b = _.subtract(s.clone(), a.clone()),
                            d_has_dx = d.contains(dx);
                        if(p === 2 && d_has_dx) {
                            if(is_sin ) { //stop infinite loop and return known value
                                var c = b.multiplier.clone().negate();
                                return _.parse(format(symbol.multiplier+'*(({4})({1})/(2*({3})^(3/2))-({0}*sqrt({2}))/(2*({3})))', dx, d, s, c, a));
                            }
                            else if(is_atan) {
                                var c = _.parse('sqrt('+a.multiplier.multiply(b.multiplier)+')');
                                return _.parse(format(symbol.multiplier+'*({0}/{2}-{1}/{3})', dx, d, b.multiplier, c));
                            }
                        }
                        else if(p === 3 && d_has_dx) {
                            if(is_atan) {
                                return _.parse(format(symbol.multiplier+'*({0}^2/(2*({2}))-({1}*log({0}^2+{1}))/(2*({2})^2))', dx, a, b.multiplier));
                            }
                        }   
                    }
                    
                    if(!symbol.isMonomial()) { 
                        var integrated;
                        var cnst = symbol.clone().stripVar(dx);
                        var integratable = Symbol.unwrapSQRT(_.divide(symbol.clone(), cnst.clone()), true);
                        if(integratable.isComposite()) { 
                            integrated = integrate_poly_fn(integratable);
                            return _.multiply(integrated, cnst);
                        }
                        else { 
                            /** INTEGRATION BY PARTS **/
                            return integration_by_parts(symbol);
                        }
                    }
                    else { 
                        retval = new Symbol(1);
                        symbol.each(function(x) {
                            var t = x.contains(dx) ? __.integrate(x, dx, depth) : x;
                            retval = _.multiply(retval, t);
                        });
                        retval.multiplier = retval.multiplier.multiply(symbol.multiplier);
                    } 
                }
                //x+1
                else if(g === CP && has_dx) {
                    if(symbol.isLinear()) {
                        retval = new Symbol(0);
                        symbol.each(function(x) {
                            retval = _.add(retval, __.integrate(x, dx, depth));
                        });
                    }
                    else {
                        return integrate_poly_fn(symbol);
                    }  
                }
                //has to be all linear
                //trig functions 
                else if(g === FN && has_dx && symbol.args[0].isLinear()) { 
                    if(symbol.isLinear()) {
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
                            return inv_trig(retval, '{2}*acos({0})-sqrt(1-({0})^2)/({1})', 'asin(({0}))', 'add');
                        }
                        else if(symbol.fname === 'asin') { 
                            return inv_trig(retval, '{2}*asin(({0}))+sqrt(1-({0})^2)/({1})', 'asin(-({0}))', 'subtract');
                        }
                        else if(symbol.fname === 'atan') { 
                            return inv_trig(retval, '{2}*atan({0})-log(1+({0})^2)/(2*({1}))', 'atan(({0}))/({1})', 'add');
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
                                    if(!symbol.args[0].isLinear(dx)) stop(); //non-linear arguments need special attention. TODO
                                    var a = symbol.args[0].clone(),
                                        m = _.parse(retval.multiplier.toString());
                                    retval.toUnitMultiplier();
                                    retval = _.multiply(_.subtract(_.multiply(a, retval), a.clone()), m);
                                    break;
                                case 'erf':
                                    var arg = symbol.args[0].clone(),
                                        a = arg.stripVar(dx),
                                        m = symbol.multiplier;
                                        retval.toUnitMultiplier();
                                    retval = _.parse(format('('+m+')*(({0})*{1}+e^(-{2}^2*{3}^2)/sqrt(pi))', arg, retval, a, dx));
                                    break;
                                default:
                                    return _.symfunction('integrate', [symbol, dt]);
                                
                            }
                            retval.updateHash();
                            retval = _.divide(retval, __.diff(symbol.args[0].clone(), dx));
                        }
                    }
                    else { 
                        var arg_is_linear = symbol.args[0].isLinear(dx);
                        //http://www.sosmath.com/calculus/integration/powerproduct/powerproduct.html
                        //integrate odd and even power so of cos and sin
                        if(symbol.fname === 'sin' || symbol.fname === 'cos' && arg_is_linear) { 
                            var p = symbol.power.toDecimal(),
                                arg = symbol.args[0],
                                a = arg.stripVar(dx), // a from cos(a*x)
                                rd = symbol.clone(), //cos^(n-1)
                                rd2 = symbol.clone(), //cos^(n-2)
                                q = new Symbol((p-1)/p), //
                                na = _.multiply(a.clone(), new Symbol(p)).invert(); //1/(n*a)
                            rd.power = rd.power.subtract(new Frac(1));
                            rd2.power = rd2.power.subtract(new Frac(2));

                            var t = _.symfunction(symbol.fname === 'cos' ? 'sin' : 'cos', [arg.clone()]);
                            return _.add(_.multiply(_.multiply(na, rd), t), _.multiply(q, __.integrate(_.parse(rd2), dx, depth)));
                        } 
                        else if(symbol.fname === 'sec' && arg_is_linear) {
                            if(symbol.power.equals(2)) {
                                var result = _.symfunction('tan', [symbol.args[0].clone()]);
                                result.multiplier = result.multiplier.multiply(symbol.multiplier);
                                return result;
                            }
                            else {
                                if(symbol.power.equals(3)) {
                                    var arg = symbol.args[0].toString(),
                                        a = symbol.args[0].clone().stripVar(dx).toString(),
                                        m = symbol.multiplier;
                                    return _.parse(format('({2})*(log(sin({0})+1)/(4*{1})-log(sin({0})-1)/(4*{1})-sin({0})/(2*{1}*sin({0})^2-2*{1}))', arg, a, m));
                                }
                            }   
                        }
                        else if(symbol.fname === 'log' && arg_is_linear) {
                            if(symbol.power.equals(2))
                                return integration_by_parts(symbol);
                            else if(symbol.power.equals(3)) {
                                var m = symbol.multiplier.toString(),
                                    s = symbol.toUnitMultiplier().toLinear().toString();
                                return _.parse('('+m+')*x*('+s+'^3-3*'+s+'^2'+'+6*'+s+'-6)');
                            }
                        }
                        else if(symbol.fname === 'tan' && arg_is_linear) {
                            if(symbol.args[0].isLinear(dx)) {
                                var a = symbol.args[0].clone().stripVar(dx),
                                    arg = symbol.args[0].toString(),
                                    m = symbol.multiplier.toString();
                                if(symbol.power.equals(2)) {
                                    return _.parse(format('({2})*((tan({0})-{0})/{1})', arg, a, m));
                                }
                                else if(symbol.power.equals(3)) {
                                    return _.parse(format('({2})*((1/{1})*log(cos({0}))+(1/(2*{1}))*sec({0})^2)', arg, a, m));
                                }
                            }
                                
                        }
                    }
                }
                else if(has_EX || (g === EX && symbol.contains(dx, true))) { 
                    //we cover all variables raised to the x here including e
                    if(!symbol.contains(dx)) { 
                        var aa;
                        if(has_EX) {
                            aa = symbol.clone().stripVar(dx);
                            symbol = _.divide(symbol, aa.clone());
                        }
                        if(symbol.power.isLinear(dx)) {
                            if(symbol.isE()) {//e^x
                                if(symbol.power.isLinear(dx)) {
                                    var a = symbol.power.clone().stripVar(dx);
                                    retval = _.divide(symbol.clone(), a);
                                }
                            }
                            else {
                                var a = _.symfunction('log', [_.parse(symbol.value)]);
                                retval = _.divide(symbol.clone(), a);
                            }
                        }
                        else {
                            var a = symbol.power.clone().stripVar(dx),
                                m = symbol.multiplier;
                            retval = _.parse(format('('+m+')*(sqrt(pi)*erf(sqrt(-{0})*{1}))/(2*sqrt(-{0}))', a, dx));
                        }
                        
                        if(aa) retval = _.multiply(retval, aa);
                    }
                    else if(!symbol.power.contains(dx) && symbol.previousGroup !== FN) {
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
            return _.symfunction('integrate', [symbol, dt]);
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
//TODO
//integrate(x^n*e^(a*x),x)
var x = nerdamer('integrate(x^3*log(x), x)');

//var x = nerdamer('integrate(10*q/(4*x^2+24*x+20), x)');
//var x = nerdamer('integrate(8*x^3/(6*x^2+3*a^2), x)');

console.log(x.toString());

//fix factor(a*x+b*x+x^2)
//fix factor(a^2+x^2)