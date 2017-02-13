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
                                    else if(sym1.power.lessThan(0) && sym2.power.greaterThan(1)) {
                                        __.integration.stop();
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