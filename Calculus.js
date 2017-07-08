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
        even = core.Utils.even,
        N = core.groups. N,
        S = core.groups.S,
        FN = core.groups.FN,
        PL = core.groups.PL,
        CP = core.groups.CP,
        CB = core.groups.CB,
        EX = core.groups.EX,
        P = core.groups.P,
        LOG = 'log', 
        EXP = 'exp', 
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
        ACOT = 'acot',
        SINH = 'sinh',   
        COSH = 'cosh',
        TANH = 'tanh';
        
        
    //custom errors
    function NoIntegralFound(msg){
        this.message = msg || "";
    }
    NoIntegralFound.prototype = new Error();
    
    //Preparations
    Symbol.prototype.hasIntegral = function() {
        return this.containsFunction('integrate');
    };
    //transforms a function
    Symbol.prototype.fnTransform = function() { 
        var retval, a = this.args[0];
        if(this.isLinear()) {
            switch(this.fname) {
                case SINH:
                    retval = _.parse(format('(e^({0})-e^(-({0})))/2', a));
                    break;
                case COSH:
                    retval = _.parse(format('(e^({0})+e^(-({0})))/2', a));
                    break;
                case TANH:
                    retval = _.parse(format('(e^({0})-e^(-({0})))/(e^({0})+e^(-({0})))', a));
                    break;
                case TAN:
                    retval = _.parse(format('sin({0})/cos({0})', a));
                    break;
                case CSC:
                    retval = _.parse(format('1/sin({0})', a));
                    break;
                case SEC:
                    retval = _.parse(format('1/cos({0})', a));
                    break;
                default:
                    retval = this;
            }
        }
        else if(this.power.equals(2)) {
            switch(this.fname) {
                case SIN:
                    retval = _.parse(format('1/2-cos(2*({0}))/2', a));
                    break;
                case COS:
                    retval = _.parse(format('1/2+cos(2*({0}))/2', a));
                    break;
                case TAN:
                    //retval = _.parse(format('(1-cos(2*({0})))/(1+cos(2*({0})))', a));
                    retval = _.parse(format('sin({0})^2/cos({0})^2', a));
                    break;
                case COSH:
                    retval = _.parse(format('1/2+cosh(2*({0}))/2', a));
                    break;
                case SINH:
                    retval = _.parse(format('-1/2+cosh(2*({0}))/2', a));
                    break;
                case TANH:
                    retval = _.parse(format('(1+cosh(2*({0})))/(-1+cosh(2*({0})))', a));
                    break;
                case SEC:
                    retval = _.parse(format('(1-cos(2*({0})))/(1+cos(2*({0})))+1', a));
                    break;
                default:
                    retval = this;
            }
        }
        else if(this.fname === SEC) {
            retval = _.parse(format('1/cos({0})^({1})', this.args[0], this.power));
        }
        else if(this.fname === CSC) {
            retval = _.parse(format('1/sin({0})^({1})', this.args[0], this.power));
        }
        else if(this.fname === TAN) {
            if(this.power.lessThan(0)) {
                retval = _.parse(format('cos({0})^({1})/sin({0})^({1})', this.args[0], this.power.clone().negate()));
            }
            else {
                retval = _.parse(format('sin({0})^({1})/cos({0})^({1})', this.args[0], this.power));
            }
        }
        else if(this.fname === SIN && this.power.lessThan(0)) {
            retval = _.parse(format('csc({0})^({1})', this.args[0], this.power.clone().negate()));
        }
        else if(this.fname === COS && this.power.lessThan(0)) {
            retval = _.parse(format('sec({0})^({1})', this.args[0], this.power.clone().negate()));
        }
        else if(this.fname === SIN && this.power.equals(3)) {
            retval = _.parse(format('(3*sin({0})-sin(3*({0})))/4', this.args[0]));
        }
        else if(this.fname === COS && this.power.equals(3)) {
            retval = _.parse(format('(cos(3*({0}))+3*cos({0}))/4', this.args[0]));
        }
        else
            retval = this;
            
        return retval;
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
    
    core.Utils.in_htrig = function(x) {
        var trig_fns = ['sinh', 'cosh', 'tanh'];
        return trig_fns.indexOf(x) !== -1;
    };
    
    var all_functions = core.Utils.all_functions = function(arr) {
        for(var i=0, l=arr.length; i<l; i++)
            if(arr[i].group !== FN)
                return false;
        return true;
    },
    cosAsinBtransform = core.Utils.cosAsinBtranform = function(symbol1, symbol2) {
        var a, b;
        a = symbol1.args[0].clone();
        b = symbol2.args[0].clone();
        return _.parse(format('(sin(({0})+({1}))-sin(({0})-({1})))/2', a, b));
    },
    cosAsinAtransform = core.Utils.cosAsinAtranform = function(symbol1, symbol2) {
        var a;
        a = symbol1.args[0].clone();
        return _.parse(format('(sin(2*({0})))/2', a));
    },
    sinAsinBtransform = core.Utils.cosAsinBtranform = function(symbol1, symbol2) { 
        var a, b;
        a = symbol1.args[0].clone();
        b = symbol2.args[0].clone();
        return _.parse(format('(cos(({0})+({1}))-cos(({0})-({1})))/2', a, b));
    },
    trigTransform = core.Utils.trigTransform = function(arr) { 
        var map = {}, symbol, t,
            retval = new Symbol(1);
        for(var i=0, l=arr.length; i<l; i++) {
            symbol = arr[i]; 
            if(symbol.group === FN) {
                var fname = symbol.fname;
                if(fname === COS && map[SIN]) { 
                    if(map[SIN].args[0].toString() !== symbol.args[0].toString()) {
                        t = cosAsinBtransform(symbol, map[SIN]);
                        delete map[SIN];
                    }
                    else{
                        t = cosAsinAtransform(symbol, map[SIN]);
                        delete map[SIN];
                    }
                    retval = _.multiply(retval, t);
                }
                else if(fname === SIN && map[COS]) {
                    if(map[COS].args[0].toString() !== symbol.args[0].toString()) {
                        t = cosAsinBtransform(symbol, map[COS]);
                        delete map[COS];
                    }
                    else {
                        t = cosAsinAtransform(symbol, map[COS]);
                        delete map[COS];
                    }
                    retval = _.multiply(retval, t);
                }
                else if(fname === SIN && map[SIN]) {
                    if(map[SIN].args[0].toString() !== symbol.args[0].toString()) {
                        t = sinAsinBtransform(symbol, map[SIN]);
                        delete map[SIN];
                    }
                    else {
                        //This should actually be redundant code but let's put just in case
                        t = _.multiply(symbol, map[SIN]);
                        delete map[SIN];
                    }
                         
                    retval = t;
                }
                else
                    map[fname] = symbol;
            }
            else
                retval = _.multiply(retval, symbol);
        }
        
        //put back the remaining functions
        for(var x in map) 
            retval = _.multiply(retval, map[x]);
        
        return retval;

    };
    
    core.Settings.integration_depth = 10;
    
    var __ = core.Calculus = {

        version: '1.4.2',

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
                    retval = new Symbol(retval);
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
        product: function(fn, index, start, end) {
            if(!(index.group === core.groups.S)) throw new Error('Index must be symbol. '+text(index)+' provided');
            index = index.value;
            var retval;
            if(core.Utils.isNumericSymbol(start) && core.Utils.isNumericSymbol(end)) {
                start = start.multiplier;
                end = end.multiplier;

                var f = fn.text(),
                    subs = {},
                    retval = new core.Symbol(1);

                for(var i=start; i<=end; i++) {
                    subs[index] = new Symbol(i); 
                    retval = _.multiply(retval, _.parse(f, subs));
                }
            }
            else {
                retval = _.symfunction('product', arguments);
            }

            return retval;
        },
        diff: function(symbol, wrt, nth) { 
            if(core.Utils.isVector(symbol)) {
                var vector = new core.Vector([]);
                symbol.each(function(x) {
                    vector.elements.push(__.diff(x, wrt));
                });
                return vector;
            }

            var d = isSymbol(wrt) ? wrt.text() : wrt; 
            //the nth derivative
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
                            //cosh -> -sinh
                            symbol.fname = 'sinh';
                            break;
                        case 'sinh': 
                            //sinh -> cosh
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
                        case 'Shi':
                            var arg = symbol.args[0];
                            symbol = _.parse('sinh('+arg+')/('+arg+')');
                            break;
                        case 'Ci':
                            var arg = symbol.args[0];
                            symbol = _.parse('cos('+arg+')/('+arg+')');
                            break;
                        case 'Chi':
                            var arg = symbol.args[0];
                            symbol = _.parse('cosh('+arg+')/('+arg+')');
                            break;
                        case 'Ei':
                            var arg = symbol.args[0];
                            symbol = _.parse('e^('+arg+')/('+arg+')');
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
                    if(!q.contains(dx, true)) 
                        return q;
                    return null;
                }
                function do_fn_sub(fname, arg) { 
                    var subbed = __.integrate(_.symfunction(fname, [new Symbol(u)]), u, 0);
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
                    if(!Q) {
                        //one more try
                        var dc = __.integration.decompose_arg(p.clone(), dx);
                        //consider the possibility of a^x^(n-1)*x^n dx
                        var xp = __.diff(dc[2].clone(), dx);
                        var dc2 = __.integration.decompose_arg(xp.clone(), dx);
                        //if their powers equal, so if dx*p == b
                        if(_.multiply(dc[1], dc2[1]).power.equals(b.power)) {
                            var m = _.divide(dc[0].clone(), dc2[0].clone());

                            var new_val = _.multiply(m.clone(), _.pow(new Symbol(a.value), _.multiply(dc[0], new Symbol(u))));
                            new_val = _.multiply(new_val, new Symbol(u));
                            return __.integration.by_parts(new_val, u, 0, {}).sub(u, dc[1].clone());
                        }

                    }
                    var integrated = __.integrate(a.sub(p.clone(), new Symbol(u)), u, 0),
                            retval = _.multiply(integrated.sub(new Symbol(u), p), Q);
                        
                    
                    return retval;
                }
                else if(g2 === EX && g1 !== EX) {
                    var p = b.power;
                    Q = try_combo(a, p.clone());
                    var integrated = __.integrate(b.sub(p, new Symbol(u)), u, 0);
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
                    m = x.multiplier.toDecimal(), 
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
                throw new NoIntegralFound(msg);
            },
            partial_fraction: function(input, dx, depth, opt) { 
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
                var result = q[0].equals(0) ? q[0] : __.integrate(q[0], dx, depth || 0);
                if(factors.group !== CP) { 
                    factors.each(function(factor) { 
                        //unwrap parentheses
                        factor = Symbol.unwrapPARENS(factor);
                        //TODO: red flag. Possible bug. The factors should already be inverted. Why are we inverting them here?
                        if(factor.power.lessThan(0))
                            factor.invert();
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
                            result = _.add(result, __.integrate(s, dx, depth || 0));
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
                                    __.integrate(_.divide(fn.clone(), factors.clone()), dx, depth || 0),
                                    __.integrate(_.divide(b.negate(), factors.clone()), dx, depth || 0)
                                );
                            }
                            result = _.divide(result, a);
                        }
                        else { 
                            result = __.integration.by_parts(_.divide(q[1], factors.clone()), dx, core.Settings.integration_depth, opt);
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
                    var intg = __.integrate(s, dx, depth || 0); //compute the integral of the remainder
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
                    var integral = __.integrate(_.divide(q[1].clone(), factor_array[i]), dx, depth || 0),
                        cf = _.expand(L.elements[i][0]); 
                    var mm = _.divide(cf, m.clone()); 
                    result = _.add(result, _.multiply(integral, mm));
                }

                return result;
            },
            get_udv: function(symbol) { 
                var parts = [[/*L*/], [/*I*/], [/*A*/], [/*T*/], [/*E*/]];
                //first we sort them 
                var setSymbol = function(x) { 
                    var g = x.group; 
                    if(g === FN) {
                        var fname = x.fname;
                        if(core.Utils.in_trig(fname) || core.Utils.in_htrig(fname))
                            parts[3].push(x);
                        else if(core.Utils.in_inverse_trig(fname))
                            parts[1].push(x);
                        else if(fname === LOG)
                            parts[0].push(x);
                        else { 
                            __.integration.stop();
                        }
                    }
                    else if(g === S || x.isComposite() && x.isLinear() || g === CB && x.isLinear()) {
                        parts[2].push(x);
                    }
                    else if(g === EX || x.isComposite() && !x.isLinear())
                        parts[4].push(x);
                    else
                        __.integration.stop();
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
            },

            by_parts: function(symbol, dx, depth, o) { 
                o.previous = o.previous || [];
                var udv, u, dv, du, v, vdu, uv, retval, integral_vdu, m, c, vdu_s;
                //first LIATE
                udv = __.integration.get_udv(symbol);
                u = udv[0]; 
                dv = udv[1]; 
                du = Symbol.unwrapSQRT(_.expand(__.diff(u.clone(), dx)), true); 
                c = du.clone().stripVar(dx);
                //strip any coefficients
                du = _.divide(du, c.clone());
                v = __.integrate(dv.clone(), dx, depth || 0); 
                vdu = _.multiply(v.clone(), du); 
                vdu_s = vdu.toString();
                //currently only supports e^x*(some trig)
                if(o.previous.indexOf(vdu_s) !== -1 && (core.Utils.in_trig(u.fname)) && dv.isE()) { 
                    //We're going to exploit the fact that vdu can never be constant
                    //to work out way out of this cycle. We'll return the length of
                    //the this.previous array until we're back at level one
                    o.is_cyclic = true;
                    //return the integral. 
                    return new Symbol(1);
                }
                else
                    o.previous.push(vdu_s);

                uv = _.multiply(u, v); 
                //clear the multiplier so we're dealing with a bare integral
                m = vdu.multiplier.clone();
                vdu.toUnitMultiplier();
                integral_vdu = _.multiply(__.integrate(vdu.clone(), dx, depth, o), c); 
                integral_vdu.multiplier = integral_vdu.multiplier.multiply(m);
                retval = _.subtract(uv, integral_vdu);
                //we know that there cannot be constants so they're a holdover from a cyclic integral
                if(o.is_cyclic) { 
                    //start popping the previous stack so we know how deep in we are
                    o.previous.pop();
                    if(o.previous.length === 0) {
                        retval = _.expand(retval);
                        var rem = new Symbol(0);
                        retval.each(function(x) {
                            if(!x.contains(dx))
                                rem = _.add(rem, x.clone());
                        });
                        //get the actual uv
                        retval = _.divide(_.subtract(retval, rem.clone()), _.subtract(new Symbol(1), rem));
                    }
                }
                
                return retval;
            },
            /*
             * dependents: [Solve, integrate]
             */
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
        //TODO: nerdamer.integrate('-e^(-a*t)*sin(t)', 't') -> gives incorrect output
        integrate: function(original_symbol, dt, depth, opt) { 
            //assume integration wrt independent variable if expression only has one variable
            if(!dt) {
                var vars = core.Utils.variables(original_symbol);
                if(vars.length === 1)
                    dt = vars[0];
            }
            //add support for integrating vectors
            if(core.Utils.isVector(original_symbol)) {
                var vector = new core.Vector([]);
                original_symbol.each(function(x) {
                    vector.elements.push(__.integrate(x, dt));
                });
                return vector;
            }
            if(!isNaN(dt))
                _.error('variable expected but received '+dt);
            //configurations options for integral. This is needed for tracking extra options
            //e.g. cyclic integrals or additional settings
            opt = opt || {};
            return core.Utils.block('PARSE2NUMBER', function() {
                //make a note of the original symbol. Set only if undefined
                depth = depth || 0;
                var dx = isSymbol(dt) ? dt.toString() : dt,
                    //we don't want the symbol in sqrt form. x^(1/2) is prefererred
                    symbol = Symbol.unwrapSQRT(original_symbol.clone(), true), 
                    g = symbol.group,
                    retval;

                try { 
                    //We stop integration after x amount of recursive calls
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
                        if(symbol.contains(dx) && symbol.previousGroup !== FN) {
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
                        if(symbol.power.greaterThan(1))
                            symbol = _.expand(symbol);
                        if(symbol.power.equals(1)) {
                            retval = new Symbol(0);
                            symbol.each(function(x) {
                                retval = _.add(retval, __.integrate(x, dx, depth));
                            }, true);
                        }
                        else {
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
                            else if(p === -2) {
                                //TODO 
                                //integrate((1)/(a+b*x^2)^2,x)
                                __.integration.stop();
                            }
                            else { 
                                if(x.isLinear() && x.group !== PL)
                                    retval = _.divide(__.integration.poly_integrate(symbol), a);
                                else { 
                                    if(symbol.group !== CB && !symbol.power.lessThan(0)) {
                                        retval = __.integration.by_parts(symbol, dx, depth, opt);
                                    }
                                    else 
                                        retval = __.integration.partial_fraction(symbol, dx, depth, opt);
                                }
                            }
                            retval.multiplier = retval.multiplier.multiply(m);
                        }
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
                            retval = __.integration.by_parts(symbol, dx, depth, opt); 
                        }
                        else if(fname === TAN && symbol.power.lessThan(0)) {
                            //convert to cotangent
                            var sym  = symbol.clone();
                            sym.power.negate();
                            sym.fname = COT;
                            return __.integrate(sym, dx, depth);
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
                                    var ag = symbol.args[0].group,
                                        decomposed = __.integration.decompose_arg(arg, dx);
                                    
                                    if(!(ag === CP || ag === S || ag === CB) || !decomposed[1].power.equals(1) || arg.hasFunc())
                                        __.integration.stop();
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
                                        case SINH:
                                            retval = _.symfunction(COSH, [arg]);
                                            break;
                                        case COSH:
                                            retval = _.symfunction(SINH, [arg]);
                                            break;
                                        case TANH:
                                            retval = _.parse(format('log(cosh({0}))', arg));
                                            break;
                                        case EXP:
                                            retval = __.integrate(_.parse(format('e^({0})', arg)), dx, depth);
                                            break;
                                        case 'erf':
                                            var arg = symbol.args[0].clone(),
                                                dc = __.integration.decompose_arg(arg, dx),
                                                x_ = dc[1],
                                                a_ = dc[0];
                                            retval = _.parse(format('e^(-(({2}))^2)/(({0})*sqrt(pi))+(1/({0})+({1}))*erf(({2}))', a_, x_, arg));
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
                                else if((fname === COSH || fname === SINH) && symbol.power.equals(2)) {
                                    retval = __.integrate(symbol.fnTransform(), dx, depth);
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
                                var unwrapped = Symbol.unwrapSQRT(x, true);
                                if(unwrapped.fname === EXP) {
                                    return _.parse(format('({1})*e^({0})', unwrapped.args[0], unwrapped.multiplier));
                                }
                                return unwrapped;
                            });
                            //generate an image for 
                            var l = symbols.length;
                            if(l === 2) { 
                                //try u substitution
                                try {
                                    retval = __.integration.u_substitution(symbols, dx);
                                }
                                catch(e){/* failed :`(*/; }   
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
                                            retval = __.integration.by_parts(symbol.clone(), dx, depth, opt);
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
                                                if(fn1 === SIN && fn2 === COS || fn1 === COS && fn2 === SIN) { 
                                                    if(sym1.power.lessThan(0))
                                                        __.integration.stop();//we don't know how to handle, sin(x)^n/cos(x)^m where m > n,  yet
                                                    //if it's in the form sin(x)^n*cos(x)^n then we can just return tan(x)^n which we know how to integrate
                                                    if(fn1 === SIN && sym1.power.add(sym2.power).equals(0)) { 
                                                        sym1.fname = TAN;
                                                        sym1.updateHash();
                                                        retval = __.integrate(sym1, dx, depth);
                                                    }
                                                    else {
                                                        if(even(sym1.power) && fn2 === COS && sym2.power.lessThan(0)) {
                                                            //transform sin^(2*n) to (1-cos^2)^n
                                                            var n = Number(sym1.power)/2,
                                                                new_sym = _.parse(format('(1-cos({0})^2)^({1})', sym1.args[0], n));
                                                            retval = __.integrate(_.expand(_.multiply(new_sym, sym2.clone())), dx, depth, opt);
                                                        }
                                                        else if(even(sym1.power) && fn2 === SIN && sym2.power.lessThan(0)) {
                                                            //transform cos^(2*n) to (1-sin^2)^n
                                                            var n = Number(sym1.power)/2,
                                                                new_sym = _.parse(format('(1-sin({0})^2)^({1})', sym1.args[0], n));
                                                            retval = __.integrate(_.expand(_.multiply(new_sym, sym2.clone())), dx, depth, opt);
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
                                                }
                                                //tan(x)*sec(x)^n 
                                                else if(fn1 === SEC && fn2 === TAN && x.isLinear() && sym2.isLinear()) { 
                                                    retval = _.parse(format('sec({0})^({1})/({1})', sym1.args[0], sym1.power));
                                                }
                                                else if(fn1 === TAN && fn2 === SEC && x.isLinear()) { 
                                                    //remaining: tan(x)^3*sec(x)^6
                                                    if(sym1.isLinear() && sym2.isLinear()) {
                                                        retval = _.divide(_.symfunction(SEC, [arg1.clone()]), a);
                                                    }
                                                    else if(even(sym1.power)) {
                                                        var p = Number(sym1.power)/2;
                                                        //transform tangent
                                                        var t = _.parse(format('(sec({0})^2-1)^({1})', sym1.args[0], p));
                                                        retval = __.integrate(_.expand(_.multiply(t, sym2)), dx, depth);
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
                                                //tan/cos
                                                else if(fn1 === TAN && (fn2 === COS || fn2 === SIN) && sym2.power.lessThan(0)) {
                                                    var t = _.multiply(sym1.fnTransform(), sym2);
                                                    retval = __.integrate(_.expand(t), dx, depth);
                                                }
                                                else { 
                                                    var t = _.multiply(sym1.fnTransform(), sym2.fnTransform());
                                                    retval = __.integrate(_.expand(t), dx, depth);
                                                }
                                            }
                                            //TODO: REVISIT AT SOME POINT
                                            else if((fn1 === SIN || fn1 === COS) && (fn2 === SIN || fn2 === COS)) { 
                                                var transformed = trigTransform(symbols);
                                                retval = __.integrate(_.expand(transformed), dx, depth);
                                            }
                                            
                                            else {
                                                __.integration.stop();
                                            }
                                                
                                        }
                                    }
                                    else if(g1 === FN && g2 === S) { 
                                        var sym1_is_linear = sym1.isLinear();
                                        if(sym1.fname === COS && sym1_is_linear && sym2.power.equals(-1)) 
                                            retval = _.symfunction('Ci', [sym1.args[0]]);
                                        else if(sym1.fname === COS && sym2.power.equals(-1)) {
                                            retval = __.integrate(_.multiply(sym1.fnTransform(), sym2.clone()), dx, depth);
                                        }
                                        else if(sym1.fname === COSH && sym1_is_linear && sym2.power.equals(-1))
                                            retval = _.symfunction('Chi', [sym1.args[0]]);
                                        else if(sym1.fname === COSH && sym2.power.equals(-1)) {
                                            retval = __.integrate(_.multiply(sym1.fnTransform(), sym2.clone()), dx, depth);
                                        }
                                        else if(sym1.fname === SIN && sym1_is_linear && sym2.power.equals(-1))
                                            retval = _.symfunction('Si', [sym1.args[0]]);
                                        else if(sym1.fname === SIN && sym2.power.equals(-1)) {
                                            retval = __.integrate(_.multiply(sym1.fnTransform(), sym2.clone()), dx, depth);
                                        }
                                        else if(sym1.fname === SINH && sym1_is_linear && sym2.power.equals(-1))
                                            retval = _.symfunction('Shi', [sym1.args[0]]);
                                        else if(sym1.fname === SINH && sym2.power.equals(-1)) {
                                            retval = __.integrate(_.multiply(sym1.fnTransform(), sym2.clone()), dx, depth);
                                        }
                                        else if(sym1.fname === LOG && sym2.power.equals(-1)) {
                                            //log(x)^n/x = log(x)^(n+1)/(n+1)
                                            retval = __.integration.poly_integrate(sym1, dx, depth);
                                        }
                                        else if(sym1.fname === 'erf') {
                                            if(sym2.power.equals(1)) {
                                                var dc = __.integration.decompose_arg(sym1.args[0], dx),
                                                    a_ = dc[0],
                                                    x_ = dc[1],
                                                    arg = sym1.args[0].toString();
                                                retval = _.parse(format('(e^(-(({2}))^2)*(sqrt(pi)*e^((({2}))^2)*(2*({0})^2*({1})^2-3)*erf(({2}))+2*({0})*({1})-2))/(4*sqrt(pi)*({0})^2)', a_, x_, arg))
                                            }
                                        }
                                        else { 
                                            //since group S is guaranteed convergence we need not worry about tracking depth of integration
                                            retval = __.integration.by_parts(symbol, dx, depth, opt);
                                        }
                                    }
                                    else if(g1 === EX && g2 === S) { 
                                        var x = fn1 === LOG ? __.integration.decompose_arg(sym1.args[0], dx)[1] : null;
                                        if(sym1.isE() && (sym1.power.group === S || sym1.power.group === CB) && sym2.power.equals(-1)) {
                                            retval = _.symfunction('Ei', [sym1.power.clone()]);
                                        }
                                        else if(fn1 === LOG && x.value === sym2.value) {
                                            retval = __.integration.poly_integrate(sym1, dx, depth);
                                        }
                                        else
                                            retval = __.integration.by_parts(symbol, dx, depth, opt);
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
                                            retval = __.integration.by_parts(symbol, dx, depth, opt);
                                        }
                                        else if(sym1.power.lessThan(0) && sym2.power.greaterThan(1)) { 
                                            var decomp = __.integration.decompose_arg(sym1.clone().toLinear(), dx),
                                                a = decomp[0].negate(),
                                                x = decomp[1],
                                                b = decomp[3],
                                                fn = sym1.clone().toLinear();
                                                
                                            if(x.group !== PL && x.isLinear()) { 
                                                var p = Number(sym2.power),
                                                    du = '_u_',
                                                    u = new Symbol(du),
                                                    //pull the integral with the subsitution
                                                    U = _.expand(_.divide(_.pow(_.subtract(u.clone(), b.clone()), new Symbol(p)), u.clone())),
                                                    scope = {};

                                                //generate a scope for resubbing the symbol
                                                scope[du] = fn;
                                                var U2 = _.parse(U, scope);
                                                retval = __.integrate(U2, dx, 0);
                                            }
                                            else if(sym2.power.greaterThan(x.power) || sym2.power.equals(x.power)) { 
                                                //factor out coefficients
                                                var factors = new core.Algebra.Classes.Factors();
                                                sym1 = core.Algebra.Factor.coeffFactor(sym1.invert(), factors);
                                                retval = new Symbol(0);
                                                core.Algebra.divide(sym2, sym1).each(function(t) {
                                                    retval = _.add(retval, __.integrate(t, dx, depth));
                                                });
                                                //put back the factors
                                                factors.each(function(factor) {
                                                    retval = _.divide(retval, factor);
                                                });
                                                
                                                retval = _.expand(retval);
                                            }
                                            else 
                                                retval = __.integration.partial_fraction(symbol, dx, depth);
                                        }
                                        else { 
                                            //handle cases such as (1-x^2)^(n/2)*x^(m) where n is odd ___ cracking knuckles... This can get a little hairy 
                                            if(sym1.power.den.equals(2)) { 
                                                //assume the function is in the form (a^2-b*x^n)^(m/2)
                                                var dc = __.integration.decompose_arg(sym1.clone().toLinear(), dx),
                                                    //using the above definition
                                                    a = dc[3], x = dc[1], b = dc[0], bx = dc[2];
                                                if(x.power.equals(2) && b.lessThan(0)) { //if n is even && b is negative
                                                    
                                                    //make a equal 1 so we can do a trig sub
                                                    if(!a.equals(1)) { //divide a out of everything
                                                        //move a to the coeff
                                                        coeff = _.multiply(coeff, _.pow(a, new Symbol(2)));
                                                    }
                                                    var u = dx;
                                                    var c = _.divide(_.pow(b.clone().negate(), new Symbol(1/2)), _.pow(a, new Symbol(1/2))),
                                                        du = _.symfunction(COS, [new Symbol(u)]),
                                                        cosn = _.pow(_.symfunction(COS, [new Symbol(u)]), new Symbol(sym1.power.num)),
                                                        X = _.pow(_.symfunction(SIN, [new Symbol(u)]), new Symbol(sym2.power)),
                                                        val = _.multiply(_.multiply(cosn, du), X),
                                                        integral = __.integrate(val, u, depth);
                                                        //but remember that u = asin(sqrt(b)*a*x)
                                                        retval = integral.sub(u, _.symfunction(ASIN, [_.multiply(new Symbol(dx), c)]));
                                                }
                                            }
                                            else
                                                retval = __.integration.partial_fraction(symbol, dx, depth);
                                        }

                                    }
                                    else if(sym1.isComposite() && sym2.isComposite()) { 
                                        //sum of integrals
                                        retval = new Symbol(0);
                                        if(sym1.power.greaterThan(0) && sym2.power.greaterThan(0)) {
                                            //combine and pull the integral of each
                                            var sym = _.expand(symbol);
                                            sym.each(function(x) {
                                                retval = _.add(retval, __.integrate(x, dx, depth));
                                            }, true);
                                        }
                                        else {
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
                                    }
                                    else if(g1 === CP) {
                                        sym1 = _.expand(sym1);
                                        retval = new Symbol(0);
                                        sym1.each(function(x) {
                                            retval = _.add(retval, __.integrate(_.multiply(x, sym2.clone()), dx, depth));
                                        }, true);
                                    }
                                    else if(g1 === FN && g2 === EX && core.Utils.in_htrig(sym1.fname)) {
                                        sym1 = sym1.fnTransform();
                                        retval = __.integrate(_.expand(_.multiply(sym1, sym2)), dx, depth);
                                    }
                                    else { 
                                        retval = __.integration.by_parts(symbol, dx, depth, opt);
                                    }
                                        
                                }
                            }
                            else if(l === 3 && (symbols[2].group === S && symbols[2].power.lessThan(2) || symbols[0].group === CP)) { 
                                var first = symbols[0];
                                if(first.group === CP) { //TODO {support higher powers of x in the future}
                                    if(first.power.greaterThan(1))
                                        first = _.expand(first);
                                    var r = _.multiply(symbols[1], symbols[2]);
                                    retval = new Symbol(0);
                                    first.each(function(x) {
                                        var t = _.multiply(x, r.clone());
                                        var intg = __.integrate(t, dx, depth);
                                        retval = _.add(retval, intg);
                                    }, true);
                                }
                                else { 
                                    //try integration by parts although technically it will never work
                                    retval = __.integration.by_parts(symbol, dx, depth, opt);
                                }
                                    
                            }
                            else if(all_functions(symbols)) { 
                                var t = new Symbol(1);
                                for(var i=0,l=symbols.length; i<l; i++) {
                                    t = _.multiply(t, symbols[i].fnTransform());
                                }
                                t = _.expand(t);
                                retval = __.integrate(t, dx, depth);
                            }
                            else { 
                                //one more go
                                var transformed = trigTransform(symbols);
                                retval = __.integrate(_.expand(transformed), dx, depth);
                            }
                        }

                        retval = _.multiply(retval, coeff);
                    }
                    //if an integral was found then we return it
                    if(retval)
                        return retval;
                }

                catch(error){
                    //do nothing if it's a NoIntegralFound error otherwise let it bubble
                    if(!(error instanceof NoIntegralFound || error instanceof core.exceptions.DivisionByZero)) 
                        throw error;
                }  

                //no symbol found so we return the integral again
                return _.symfunction('integrate', [original_symbol, dt]);
            }, false);
        },
        defint: function(symbol, from, to, dx) {
            var vars = core.Utils.variables(symbol),
                integral = __.integrate(symbol, dx),
                retval;
            if(vars.length === 1)
                dx = vars[0];
            if(!integral.hasIntegral()) { 
                var upper = {},
                    lower = {},
                    a, b;
                upper[dx] = to;
                lower[dx] = from;
                a = _.parse(integral, upper);
                b = _.parse(integral, lower);
                retval = _.subtract(a, b);
            }
            else if(vars.length === 1 && from.isConstant() && to.isConstant()) {
                var f = core.Utils.build(symbol);
                retval = core.Math2.num_integrate(f, Number(from), Number(to));
            }
            else 
                retval = _.symfunction('defint', [symbol, from , to, dx]);
            return retval;
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
            name: 'product',
            visible: true,
            numargs: 4,
            build: function(){ return __.product; }
        },
        {
            name: 'integrate',
            visible: true,
            numargs: [1, 2],
            build: function() { return __.integrate; }
        },
        {
            name: 'defint',
            visible: true,
            numargs: [3, 4],
            build: function() { return __.defint; }
        }
    ]);
    //link registered functions externally
    nerdamer.api();
})();