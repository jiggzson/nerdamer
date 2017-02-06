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
        P = core.groups.P,
        LOG = 'log', ABS = 'abs', SQRT = 'sqrt',
        SIN = 'sin',  COS = 'cos', TAN = 'tan',
        SEC = 'sec', CSC = 'csc', COT = 'cot',
        ASIN = 'asin', ACOS = 'acos', ATAN = 'atan';
        
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
    core.Expression.prototype.hasIntegral = function() {
        return this.symbol.hasIntegral();
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
        integrate: function(symbol, dt, depth) {
            depth = depth || 0;
            depth++; 
            var stop = function(msg) {
                msg = msg || 'Stopping!';
                throw new Error(msg);
            };
            
            function in_inverse_trig(x) {
                var inv_trig_fns = [ASIN, ACOS, ATAN, 'acsc', 'asec', 'acot'];
                return inv_trig_fns.indexOf(x) !== -1;
            };
            
            function in_trig(x) {
                var trig_fns = [COS, SIN, TAN, SEC, CSC, COT];
                return trig_fns.indexOf(x) !== -1;
            };
            
            //stop integration after x amount of times
            if(depth > core.Settings.integration_depth) 
                throw new Error('Maximum depth reached. Exiting!');
            
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
            function integration_by_parts(symbol) { 
                var udv, u, dv, du, v, vdu, uv, retval, integral_vdu;
                //first LIATE
                udv = get_udv(symbol);
                u = udv[0]; 
                dv = udv[1];
                du = Symbol.unwrapSQRT(__.diff(u.clone(), dx));
                v = __.integrate(dv.clone(), dx, depth);
                vdu = _.multiply(v.clone(), du);
                uv = _.multiply(u, v); 
                integral_vdu = __.integrate(vdu.clone(), dx, depth); 
                retval = _.subtract(uv, integral_vdu);
                return retval;
            };
            function part_frac(num, den) { 
                //we need both in expanded form and linear
                if(num.group !== CB && !num.isLinear() || den.group !== CB && !den.isLinear())
                    stop();
                //make sure that den > num
                var q = core.Algebra.div(num, den),
                    M = new core.Matrix(), //prepare the two matrices
                    c = new core.Matrix(),
                    num_array = q[1].toArray(dx), //point to the remainder not the numerator
                    m = new Symbol(1); //the constants
                num = q[1]; //point to the remainder not the whole
                //get the factors of the denominator
                var factors = core.Algebra.Factor.factor(den); 
                if(num.group === CP && !(factors.length > 1))
                    stop();// dunno what to do since I can't solve for A, B, C, etc...
                var factor_array = [];
                //we first have to unwrap the factor and get them in ordered form. We use an array for this
                //the first part of q can just be integrated using standard integration so we do so
                var result = q[0].equals(0) ? q[0] : __.integrate(q[0], dx, depth);
                if(factors.group !== CP) {
                    factors.each(function(factor) {
                        if(factor.group === FN && !factor.fname)  //it might be wrapped in parenthesis
                            factor = factor.args[0];
                        if(!factor.isLinear()) 
                            factor = _.expand(factor); 
                        if(factor.isConstant())
                            m = _.multiply(m, factor); //add it to the constants
                        else
                            factor_array.push(factor);
                    });
                }
                else {
                    //apply the sum rule
                    q[1].each(function(x) {
                        var s = _.divide(x.clone(), factors.clone());//put it back in the form num/den
                        result = _.add(result, __.integrate(s, dx, depth));
                    });
                    return result;
                }
                
                //the next step is to expand the factors excluding the current factor
                //e.g. if the factors were (x+7)*(x+1)*(x+5) we want them as:
                //x^2+6*x+5 because of: (x+1)*(x+5)
                //x^2+12*x+35 because of: (x+7)*(x+5)
                //x^2+8*x+7 because of: (x+7)*(x+1)
                var l = factor_array.length;
                
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
                    var integral = __.integrate(factor_array[i].invert(), dx, depth),
                        cf = _.expand(L.elements[i][0]);
                    var mm = _.divide(cf, m.clone());
                    result = _.add(result, _.multiply(integral, mm));
                }
                return result;
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
                        if(bx.group === S && bx.isLinear()) 
                            return _.symfunction(LOG, [fn]);
                        else
                            return part_frac(new Symbol(symbol.multiplier), symbol.toLinear());
                    }
                }
                catch(e){; }
                
                b = bx.stripVar(dx); //strip out the dx so a*x becomes a. (a-x)
                if(bx.isLinear() && symbol.group !== EX) { 
                    if(p.equals(-1) && !b.equals(0) && bx.group !== PL) { 
                        var result = _.divide(_.symfunction(LOG, [fn.clone()]), b);
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
                            var asin = _.symfunction(ASIN, [_.divide(_.multiply(b_sqrt, r), a_sqrt)]); 
                            retval = _.divide(asin, b_sqrt);
                        }
                        else if(p.equals(-1)) { 
                            a.power = a.power.multiply(new Frac(1/2));
                            var sqrt_m = _.parse('sqrt('+a.multiplier.multiply(b.multiplier)+')');
                            a.toUnitMultiplier();
                            a = _.multiply(a, sqrt_m);
                            var atan = _.symfunction(ATAN, [_.divide(r, a.clone())]); 
                            retval = _.divide(atan, a);
                        }
                    }
                    else {
                        stop();
                    }                        
                }
                if(!retval) stop();
                
                return retval;
            };

            //unwrap sqrt
            symbol = Symbol.unwrapSQRT(symbol, true);
            try {
                symbol = symbol.clone(); //make a clone so when we stop we leave the original untouched
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
                else if(symbol.power.equals(0))
                    return _.multiply(_.parse(symbol.multiplier), _.parse(dx));
                else if(g === S && has_dx) {
                    //1/x
                    if(symbol.power.equals(-1)) {
                        retval = _.symfunction(LOG, [new Symbol(dx)]);
                        retval.multiplier = retval.multiplier.multiply(symbol.multiplier);
                    }
                    //all other x's
                    else {
                        return poly_integrate(symbol);
                    }
                }
                //x+x^2
                else if(g === CP || g === PL && has_dx) { 
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
                //a*x
                else if(g === CB && has_dx && symbol.isLinear()) { 
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
                        //check if we can get away with partial fractions
                        var num = symbol.getNum(),
                            den = symbol.getDenom();
                        if(den.isComposite() && den.power.equals(-1) && num.isComposite()) {
                            return _.multiply(part_frac(num, den.invert()), coeff);
                        }
                        //we collect the symbols and sort them descending group, descending power, descending alpabethically
                        var symbols = cfsymbol.collectSymbols().sort(function(a, b) {
                            if(a.group === b.group)  {
                                if(Number(a.power) === Number(b.power))
                                    if(a > b) return 1; //I want sin first
                                    else return -1;
                                return b.power - a.power; //descending power
                            }
                            return b.group - a.group; //descending groups
                        });
                        
                        var l = symbols.length;
                        var has_tan = false,
                            has_sin_or_cos = false,
                            expandable = true,
                            all_fn = true; //check if their all functions
                        //check if there is sin or cos and tan
                        for(var i=0; i<l; i++) { 
                            var sym = symbols[i];
                            var g = sym.group, p = symbol.power;
                            if(!(p > 0 && g === S || g === PL || g === CP) ) expandable = false;
                            var fname = sym.fname; 
                            if(!fname) all_fn = false;
                            if(fname === TAN) has_tan = true;
                            else if(fname === COS || fname === SIN) has_sin_or_cos = true;
                        }
                        //we'll substitute out tan
                        if(has_tan && has_sin_or_cos) { 
                            var new_symbol = new Symbol(1);
                            for(var i=0; i<l; i++) {
                                var sym = symbols[i], r;
                                if(sym.group === EX)
                                    stop(); //don't know what to do
                                if(sym.fname === TAN) {
                                    var x = _.symfunction(SIN, [sym.args[0].clone()]),
                                        y = _.symfunction(COS, [sym.args[0].clone()]);
                                    x.power = x.power.multiply(sym.power);
                                    y.power = y.power.multiply(sym.power);
                                    r = _.divide(x, y);
                                    r.multiplier = r.multiplier.multiply(sym.multiplier);
                                }
                                else r = sym;
                                new_symbol = _.multiply(new_symbol, r);
                            }
                            var intg = __.integrate(new_symbol, dx, --depth);
                            return _.multiply(intg, coeff);
                        }
                        
                        //we go down the list of integrals that we know mainly those that are a product of two functions
                        if(l === 2) { 
                            //we can be done quickly with u substitution, but in order to do that we have to
                            //put the derivative and divide. The quotient should just be a constants wrt dx
                            //first EX
                            if(symbols[0].group === EX) { 
                                var q = _.divide(symbols[1].clone(), __.diff(symbols[0].power.clone(), dx));
                                if(!q.contains(dx)) { //success
                                    return _.multiply(coeff, _.multiply(_.divide(symbols[0], _.symfunction(LOG, [new Symbol(symbols[0].value)])), q));
                                }
                            }
                            else {
                                //we try u substitution assuming that one is the derivative of the other. We pull the derivative of one and try
                                //afterwards we flip and repeat
                                for(var i=0; i<l; i++) {
                                    var s = symbols[i].clone(); //let's look a the current symbol
                                    var r = new Symbol(1);//the remaining symbols
                                    for(var j=0; j<l; j++) {
                                        if(i !== j) //multiply the remainder to r so we can check if in for u du
                                            r = _.multiply(r, symbols[j].clone());
                                    }
                                    var q = _.divide(r, __.diff(s.clone().toLinear(), dx)); //q is just the quotient between du and diff(u, du)
                                    if(!q.contains(dx, true)) { 
                                        q = _.multiply(q, coeff); //put the coefficient we removed earlier back
                                        var u = _.parse('(u)^'+s.power); //as the name implies, this is u
                                        //put remove u and put back the symbol
                                        return _.multiply(_.parse(__.integrate(u, 'u', depth), {u: s.clone().toLinear()}), q);
                                    }
                                }

                                //If we're here that means that we weren't successful with u-substitution so we now have to
                                //use a lookup table
                                //first start with multiples of sin and cosine 
                                var sym1 = symbols[0],
                                    sym2 = symbols[1],
                                    fn1 = sym1.fname,
                                    fn2 = sym2.fname;
                                //are they two functions
                                if(fn1 && fn2) {
                                    var arg1 = sym1.args[0],
                                        arg2 = sym2.args[0],
                                        same_args = arg1.equals(arg2); 
                                    //we can check that fn1 === cos and fn2 === sin. The order is guaranteed because we sorted it as such earlier
                                    if((fn1 === COS && fn2 === SIN || fn1 === SIN && fn2 === COS) && same_args) { 
                                        if(sym1.power.greaterThan(sym2.power))
                                            stop();//we don't know how to handle, sin(x)^n/cos(x)^m where m > n,  yet
                                        //if it's in the form sin(x)^n*cos(x)^n then we can just return tan(x)^n which we know how to integrate
                                        if(fn1 === SIN && sym1.power.add(sym2.power).equals(0)) {
                                            sym1.fname = TAN;
                                            sym1.updateHash();
                                            return _.multiply(__.integrate(sym1, dx, depth), coeff);
                                        }
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
                                                retval = _.add(retval, poly_integrate(x.clone()));
                                            });

                                            return _.multiply(retval, coeff);
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
                                    else if(fn1 === TAN && fn2 === SEC || fn1 === LOG && fn2 === SEC || fn1 === LOG && fn2 === TAN 
                                            || fn1 === CSC && fn2 === LOG && same_args) { 
                                        stop();
                                    }
                                    else if(fn1 === SEC && fn2 === TAN && same_args) { 
                                        //transform tan = sqrt(sec(x)^2-1)
                                        if(sym1.isLinear() && sym2.isLinear()) {
                                            var a = arg2.stripVar(dx);
                                            return _.multiply(_.symfunction(SEC, [arg1.clone()]), _.divide(coeff, a));
                                        }
                                    }
                                    else if((fn1 === COS && fn2 === SEC || fn1 === SEC && fn2 === COS) && same_args) {
                                        var t = [sym1, sym2];
                                        if(fn1 === COS) t.reverse();
                                        t[0].fname = COS;
                                        t[0].invert().updateHash();
                                        return __.integrate(_.multiply(_.multiply(t[0], t[1]), coeff), dx, depth);
                                    }
                                    else if((fn1 === SIN && fn2 === CSC || fn1 === CSC && fn2 === SIN) && same_args) {
                                        var t = [sym1, sym2];
                                        if(fn1 === SIN) t.reverse();
                                        t[0].fname = SIN;
                                        t[0].invert().updateHash();
                                        return __.integrate(_.multiply(_.multiply(t[0], t[1]), coeff), dx, depth);
                                    }
                                }
                                //eliminate cos(x)/x
                                else if(sym1.fname === COS && sym2.power.equals(-1)) {
                                    var retval = _.parse('Ci('+symbols[0].args[0]+')');
                                    return _.multiply(retval, coeff);
                                }
                                //eliminate sin(x)/x
                                else if(sym1.fname === SIN && sym2.power.equals(-1)) {
                                    var retval = _.parse('Si('+symbols[0].args[0]+')');
                                    return _.multiply(retval, coeff);
                                }
                                else if(sym2.group === S && sym2.contains(dx)) { 
                                    //take care of x/(a+x) & x/(a+x)^2
                                    if(sym1.group === CP && sym2.isLinear()) {
                                        var p = Math.abs(Number(sym1.power));
                                        if(p === 1 || p === 2) { 
                                            var tsymbol = sym1.clone().toLinear().toUnitMultiplier(),
                                                a = tsymbol.stripVar(dx),
                                                bx = _.subtract(tsymbol.clone(), a.clone()); 
                                            if(bx.isLinear()) {
                                                if(p === 1) {
                                                    return _.multiply(_.add(__.integrate(_.divide(a.negate(), tsymbol) 
                                                        ,dx, depth), new Symbol(dx)), coeff);
                                                }
                                                else if(p === 2) {
                                                    //it's a substitution so let's make it
                                                    var q = _.divide(a.clone(), tsymbol.clone());
                                                    return _.multiply(_.add(_.symfunction(LOG, [tsymbol.clone()]), q), coeff);
                                                }
                                            }
                                        }
                                    }

                                    //check for x^2/sqrt(1-x^2). Should be trig sub but this will do for now
                                    var d = __.integrate(sym1, dx, depth), //integrate and see if it's asin
                                        p = Number(sym2.power);
                                    if(d.group === CB) {
                                        for(var x in d.symbols) {
                                            var sym = d.symbols[x];
                                            if(sym.contains(dx) && sym.group === FN) {
                                                d = sym; break;
                                            }
                                        }     
                                    }
                                    var is_atan = d.fname === ATAN,
                                        is_sin = d.fname === ASIN,
                                        s = Symbol.unwrapSQRT(sym1.clone(), true).toLinear(),
                                        a = s.stripVar(dx),
                                        b = _.subtract(s.clone(), a.clone()),
                                        d_has_dx = d.contains(dx);
                                    if(p === 2 && d_has_dx) {
                                        if(is_sin ) { //stop infinite loop and return known value
                                            var c = b.multiplier.clone().negate();
                                            return _.multiply(_.parse(format('(({4})({1})/(2*({3})^(3/2))-({0}*sqrt({2}))/(2*({3})))', dx, d, s, c, a)), coeff);
                                        }
                                        else if(is_atan) {
                                            var c = _.parse('sqrt('+a.multiplier.multiply(b.multiplier)+')');
                                            return _.multiply(_.parse(format('({0}/{2}-{1}/{3})', dx, d, b.multiplier, c)), coeff);
                                        }
                                    }
                                    else if(p === 3 && d_has_dx) {
                                        if(is_atan) {
                                            return _.multiply(_.parse(format('({0}^2/(2*({2}))-({1}*log({0}^2+{1}))/(2*({2})^2))', dx, a, b.multiplier)), coeff);
                                        }
                                    }   
                                }  
                                
                                if(num.isComposite()) { 
                                    var result = new Symbol(0);
                                    var exp_num = _.expand(num); 
                                    exp_num.each(function(x) {
                                        var intgr = __.integrate(_.multiply(x, den.clone()), dx, depth);
                                        result =  _.add(result, intgr);
                                    });
                                    return _.multiply(result, coeff);
                                }
                            }
                            
                        }
                        else if(l > 2) { 
                            if(all_fn) stop();
                            if(expandable) 
                                return _.multiply(__.integrate(_.expand(symbol), dx, --depth), coeff);
                        }
                        else if(!symbol.isMonomial()) { 
                            //deal with cases such as cos(x)*sin(x)*x
                            var integrated,
                                cnst = symbol.clone().stripVar(dx);
                            var integratable = Symbol.unwrapSQRT(_.divide(symbol.clone(), cnst.clone()), true);
                            if(integratable.isComposite()) { 
                                integrated = integrate_poly_fn(integratable);
                                return _.multiply(_.multiply(integrated, cnst), coeff);
                            }
                        }
                        //if all else fails we just do integration by parts
                        retval = integration_by_parts(cfsymbol);
                    }
                    retval = _.multiply(retval, coeff);
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
                        if(symbol.fname === ACOS) {
                            return inv_trig(retval, '{2}*acos({0})-sqrt(1-({0})^2)/({1})', 'asin(({0}))', 'add');
                        }
                        else if(symbol.fname === ASIN) { 
                            return inv_trig(retval, '{2}*asin(({0}))+sqrt(1-({0})^2)/({1})', 'asin(-({0}))', 'subtract');
                        }
                        else if(symbol.fname === ATAN) { 
                            return inv_trig(retval, '{2}*atan({0})-log(1+({0})^2)/(2*({1}))', 'atan(({0}))/({1})', 'add');
                        }
                        else {
                            switch(symbol.fname) {
                                case COS:
                                    retval.fname = SIN;
                                    break;
                                case SIN:
                                    retval.fname = COS;
                                    retval.negate();
                                    break;
                                case TAN:
                                    retval = _.parse(format('log(sec({0}))', symbol.args[0].toString()));
                                    break;
                                case SEC:
                                    retval = _.parse(format('log(tan({0})+sec({0}))', symbol.args[0].toString()));
                                    break;
                                case CSC:
                                    retval = _.parse(format('-log(csc({0})+cot({0}))', symbol.args[0].toString()));
                                    break;
                                case COT:
                                    retval = _.parse(format('log(sin({0}))', symbol.args[0].toString()));
                                    break;
                                case ABS:
                                    retval = _.multiply(symbol, new Symbol(dx));
                                    retval.multiplier = retval.multiplier.divide(new Frac(2));
                                    return retval; //has to return otherwise it will divide by diff(ax)
                                case LOG:
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
                        var arg_is_linear = symbol.args[0].isLinear(dx),
                            fname = symbol.fname;
                        //http://www.sosmath.com/calculus/integration/powerproduct/powerproduct.html
                        //integrate odd and even power of cos and sin
                        if(fname === SIN || fname === COS && arg_is_linear) { 
                            var p = symbol.power.toDecimal();
                            //check to see if it's negative and then just transform it to sec or csc
                            if(p < 0) {
                                symbol.fname = fname === SIN ? CSC : SEC;
                                symbol.invert().updateHash();
                                return __.integrate(symbol, dx, depth);
                            }
                            var arg = symbol.args[0],
                                a = arg.stripVar(dx), // a from cos(a*x)
                                rd = symbol.clone(), //cos^(n-1)
                                rd2 = symbol.clone(), //cos^(n-2)
                                q = new Symbol((p-1)/p), //
                                na = _.multiply(a.clone(), new Symbol(p)).invert(); //1/(n*a)
                            rd.power = rd.power.subtract(new Frac(1));
                            rd2.power = rd2.power.subtract(new Frac(2));

                            var t = _.symfunction(fname === COS ? SIN : COS, [arg.clone()]);
                            if(fname === SIN) t.negate();
                            return _.add(_.multiply(_.multiply(na, rd), t), _.multiply(q, __.integrate(_.parse(rd2), dx, depth)));
                        } 
                        else if(fname === LOG && arg_is_linear) {
                            if(symbol.power.equals(2))
                                return integration_by_parts(symbol);
                            else if(symbol.power.equals(3)) {
                                var m = symbol.multiplier.toString(),
                                    s = symbol.toUnitMultiplier().toLinear().toString();
                                return _.parse('('+m+')*x*('+s+'^3-3*'+s+'^2'+'+6*'+s+'-6)');
                            }
                        }
                        //tan(x)^n or cot(x)^n
                        else if(fname === TAN || fname === COT && arg_is_linear) { 
                            //http://www.sosmath.com/calculus/integration/moretrigpower/moretrigpower.html
                            if(symbol.args[0].isLinear(dx)) {
                                var a = symbol.args[0].clone().stripVar(dx),
                                    m = symbol.multiplier.clone(),
                                    arg = symbol.args[0].toString(),
                                    n = symbol.power.subtract(new Frac(1)).toString(),
                                    r = symbol.clone().toUnitMultiplier(),
                                    w = _.parse(format((fname === COT ? '-' : '')+'1/({2}*{0})*{3}({1})^({0})', n, arg, a, fname));
                                r.power = r.power.subtract(new Frac(2));
                                retval = _.subtract(w, __.integrate(r, dx, depth));
                                retval.multiplier = retval.multiplier.multiply(m);
                                return retval;
                            }   
                        }
                        //sec(x)^n or csc(x)^n
                        else if(fname === SEC || fname === CSC && arg_is_linear) { 
                            //http://www.sosmath.com/calculus/integration/moretrigpower/moretrigpower.html
                            if(symbol.args[0].isLinear(dx)) {
                                var a = symbol.args[0].clone().stripVar(dx),
                                    m = symbol.multiplier.clone(),
                                    arg = symbol.args[0].toString(),
                                    n1 = symbol.power.subtract(new Frac(1)).toString(),
                                    n2 = symbol.power.subtract(new Frac(2)).toString(),
                                    f2 = fname === SEC ? TAN : COT,
                                    r = symbol.clone().toUnitMultiplier(),
                                    parse_str = format((fname === CSC ? '-' : '')+'1/({0}*{1})*{4}({3})^({2})*{5}({3})', a, n1, n2, arg, fname, f2),
                                    w = _.parse(parse_str);
                                r.power = r.power.subtract(new Frac(2));
                                retval = _.add(w, _.multiply(new Symbol(n2/n1), __.integrate(r, dx, depth)));
                                retval.multiplier = retval.multiplier.multiply(m);
                                return retval; 
                            }   
                        }
                    }
                }
                else if(has_EX || (g === EX && symbol.contains(dx, true))) { 
                    //we cover all variables raised to the x here including e
                    if(!symbol.contains(dx)) { 
                        var coeff;
                        //deal with cases such as 5*x*e^(-8*a*x^2)
                        if(has_EX) {
                            coeff = symbol.clone().stripVar(dx);
                            symbol = _.divide(symbol, coeff.clone());
                        }
                        if(symbol.power.isLinear(dx)) {
                            if(symbol.isE()) {//e^x
                                if(symbol.power.isLinear(dx)) {
                                    var a = symbol.power.clone().stripVar(dx);
                                    retval = _.divide(symbol.clone(), a);
                                }
                            }
                            else { 
                                var a = _.symfunction(LOG, [_.parse(symbol.value)]);
                                retval = _.divide(symbol.clone(), a);
                            }
                        }
                        else {
                            var a = symbol.power.clone().stripVar(dx),
                                m = symbol.multiplier;
                            retval = _.parse(format('('+m+')*(sqrt(pi)*erf(sqrt(-{0})*{1}))/(2*sqrt(-{0}))', a, dx));
                        }
                        
                        if(coeff) retval = _.multiply(retval, coeff);
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
            catch(e){ /* no integral found */; }
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