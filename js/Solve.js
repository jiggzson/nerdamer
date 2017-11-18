/*
 * Author : Martin Donk
 * Website : http://www.nerdamer.com
 * Email : martin.r.donk@gmail.com
 * Source : https://github.com/jiggzson/nerdamer
 */
if((typeof module) !== 'undefined') {
    nerdamer = require('./nerdamer.core.js');
    require('./Calculus.js');
    require('./Algebra.js');
}

(function() {
    //handle imports
    var core = nerdamer.getCore(),
        _ = core.PARSER,
        _A = core.Algebra,
        _C = core.Calculus,
        explode = _C.integration.decompose_arg,
        remove = core.Utils.remove,
        format = core.Utils.format,
        build = core.Utils.build,
        Symbol = core.Symbol,
        isSymbol = core.Utils.isSymbol,
        variables = core.Utils.variables,
        S = core.groups.S,
        PL = core.groups.PL,
        CB = core.groups.CB,
        CP = core.groups.CP,
        FN = core.groups.FN,
        isArray = core.Utils.isArray;
    //version solve
    core.Solve = {
        version: '1.2.2',
        solve: function(eq, variable) {
            var solution = solve(eq, String(variable));
            return new core.Vector(solution);
            //return new core.Vector(solve(eq.toString(), variable ? variable.toString() : variable));
        }
    };
    // The search radius for the roots
    core.Settings.solve_radius = 500;
    // The maximum number to fish for on each side of the zero
    core.Settings.roots_per_side = 5;
    // Covert the number to multiples of pi if possible
    core.Settings.make_pi_conversions = true;
    
    core.Symbol.prototype.hasTrig = function() {
        return this.containsFunction(['cos', 'sin', 'tan', 'cot', 'csc', 'sec']);
    };
    
    core.Symbol.prototype.hasNegativeTerms = function() {
        if(this.isComposite()) { 
            for(var x in this.symbols) {
                var sym = this.symbols[x];
                if(sym.group === PL && sym.hasNegativeTerms() || this.symbols[x].power.lessThan(0))
                    return true;
            }
        }
        return false;
    };
    
    /* nerdamer version 0.7.x and up allows us to make better use of operator overloading
     * As such we can have this data type be supported completely outside of the core.
     * This is an equation that has a left hand side and a right hand side
     */
    function Equation(lhs, rhs) {
        if(rhs.isConstant() && lhs.isConstant() && !lhs.equals(rhs))
            throw new Error(lhs.toString()+' does not equal '+rhs.toString());
        this.LHS = lhs; //left hand side
        this.RHS = rhs; //right and side
    };
    
    Equation.prototype = {
        toString: function() {
            return this.LHS.toString()+'='+this.RHS.toString();
        },
        text: function(option) { 
            return this.LHS.text(option)+'='+this.RHS.text(option);
        },
        toLHS: function() {
            return _.subtract(this.LHS.clone(), this.RHS.clone());
        },
        clone: function() {
            return new Equation(this.LHS.clone(), this.RHS.clone());
        },
        sub: function(x, y) {
            var clone = this.clone();
            clone.LHS = clone.LHS.sub(x.clone(), y.clone());
            clone.RHS = clone.RHS.sub(x.clone(), y.clone());
            return clone;
        },
        latex: function(option) { 
            return [this.LHS.latex(option), this.RHS.latex(option)].join('=');
        }
    };
    //overwrite the equals function
    _.equals = function(a, b) {
        return new Equation(a, b);
    };
    // A utility function to parse an expression to left hand side when working with strings

    var toLHS = function(eqn) {
        //If it's an equation then call its toLHS function instead
        if(eqn instanceof Equation)
            return eqn.toLHS();
        var es = eqn.split('=');
        if(es[1] === undefined) es[1] = '0';
        var e1 = _.parse(es[0]), e2 = _.parse(es[1]);
        return _.subtract(e1, e2);
    };
    // Solves a system of equations
    var sys_solve = function(eqns, var_array) {
        //check if a var_array was specified
        nerdamer.clearVars();
        //parse all the equations to LHS. Remember that they come in as strings
        for(var i=0; i<eqns.length; i++) 
            eqns[i] = toLHS(eqns[i]);
        
        var l = eqns.length,
            m = new core.Matrix(),
            c = new core.Matrix(),
            expand_result = false,
            vars;
        
        if(typeof var_array === 'undefined') {
            //check to make sure that all the equations are linear
            if(!_A.allLinear(eqns)) 
                core.err('System must contain all linear equations!');
            vars = variables(eqns[0]);

            //get all variables
            for(var i=1; i<l; i++) 
                vars = vars.concat(variables(eqns[i])); 
            //remove duplicates
            vars = core.Utils.arrayUnique(vars).sort();
            // populate the matrix
            for(var i=0; i<l; i++) {
                var e = eqns[i]; //store the expression
                for(var j=0; j<l; j++) {     
                    var variable = e.symbols[vars[j]];
                    m.set(i, j, variable ? variable.multiplier : 0);
                }
                var num = e.symbols['#']; 
                c.set(i, 0, new Symbol(num ? -num.multiplier : 0));
            }
        }
        else {
            /**
             * The idea is that we loop through each equation and then expand it. Afterwards we loop
             * through each term and see if and check to see if it matches one of the variables.
             * When a match is found we mark it. No other match should be found for that term. If it
             * is we stop since it's not linear.
             */               
            vars = var_array;
            expand_result = true;
            for(i=0; i<l; i++) {
                //prefill
                c.set(i, 0, new Symbol(0));
                var e = _.expand(eqns[i]).collectSymbols(); //expand and store
                //go trough each of the variables
                for(var j=0; j<var_array.length; j++) {
                    m.set(i, j, new Symbol(0));
                    var v = var_array[j];
                    //go through the terms and sort the variables
                    for(var k=0; k<e.length; k++) {
                        var term = e[k],
                            check = false;
                        for(var z=0; z<var_array.length; z++) {
                            //check to see if terms contain multiple variables
                            if(term.contains(var_array[z])) {
                                if(check)
                                    core.err('Multiple variables found for term '+term);
                                check = true;
                            }   
                        }
                        //we made sure that every term contains one variable so it's safe to assume that if the
                        //variable is found then the remainder is the coefficient.
                        if(term.contains(v)) {
                            var tparts = explode(remove(e, k), v);
                            m.set(i, j, _.add(m.get(i, j), tparts[0]));
                        }
                    }
                }
                //all the remaining terms go to the c matrix
                for(k=0; k<e.length; k++) {
                    c.set(i, 0, _.add(c.get(i, 0), e[k]));
                }
            }
            //consider case (a+b)*I+u
        }
            
        // Use M^-1*c to solve system
        m = m.invert();
        var result = m.multiply(c);
        var solutions = [];
        result.each(function(e, idx) { 
            solutions.push([vars[idx], (expand_result ? _.expand(e) : e).valueOf()]); 
        });
        //done
        return solutions;
    };
    // solve quad oder polynomials symbolically
    var quad = function(c, b, a,  plus_or_min) { 
        var plus_or_minus = plus_or_min === '-' ? 'subtract': 'add';
        var bsqmin4ac = _.subtract(_.pow(b.clone(), Symbol(2)), _.multiply(_.multiply(a.clone(), c.clone()),Symbol(4)))/*b^2 - 4ac*/; 
        var det = _.pow(bsqmin4ac, Symbol(0.5));
        var retval = _.divide(_[plus_or_minus](b.clone().negate(), det),_.multiply(new Symbol(2), a.clone()));
        return retval;
    };
    
    //http://math.stackexchange.com/questions/61725/is-there-a-systematic-way-of-solving-cubic-equations
    var cubic = function(d_o, c_o, b_o, a_o) { 
        //convert everything to text
        var a = a_o.text(), b = b_o.text(), c = c_o.text(), d = d_o.text(); 
        var d0s = '({1})^2-3*({0})*({2})',
            d0 = _.parse(format(d0s, a, b, c)),
            Q = _.parse(format('((2*({1})^3-9*({0})*({1})*({2})+27*({0})^2*({3}))^2-4*(({1})^2-3*({0})*({2}))^3)^(1/2)', a, b, c, d)),
            C = _.parse(format('((1/2)*(({4})+2*({1})^3-9*({0})*({1})*({2})+27*({0})^2*({3})))^(1/3)', a, b, c, d, Q));
        //check if C equals 0
        var scope = {};
        //populate the scope object
        variables(C).map(function(x) {
            scope[x] = 1;
        });
        
        var Ct = core.Utils.block('PARSE2NUMBER', function() {
            return _.parse(C, scope);
        });
        
        if(Number(d0) === 0 && Number(Ct) === 0) //negate Q such that C != 0
            C = _.parse(format('((1/2)*(-({4})+2*({1})^3-9*({0})*({1})*({2})+27*({0})^2*({3})))^(1/3)', a, b, c, d, Q));

        var xs = [
            '-(b/(3*a))-C/(3*a)-(((b^2-3*a*c))/(3*a*C))',
            '-(b/(3*a))+(C*(1+i*sqrt(3)))/(6*a)+((1-i*sqrt(3))*(b^2-3*a*c))/(6*a*C)'.replace(/i/g, core.Settings.IMAGINARY),
            '-(b/(3*a))+(C*(1-i*sqrt(3)))/(6*a)+((1+i*sqrt(3))*(b^2-3*a*c))/(6*a*C)'.replace(/i/g, core.Settings.IMAGINARY)
        ];

        return xs.map(function(e, i) { 
            return _.parse(e, { a: a_o.clone(), b: b_o.clone(), c: c_o.clone(), d: d_o.clone(), C: C.clone()});
        });
    };

    /* in progress */
    var quartic = function(e, d, c, b, a) { 
        var scope = {};
        core.Utils.arrayUnique(variables(a).concat(variables(b))
                .concat(variables(c)).concat(variables(d)).concat(variables(e)))
                .map(function(x) {
                    scope[x] = 1;
                });
        a = a.toString(); b = b.toString(); c = c.toString(); d = d.toString(); e = e.toString();
        var p, q, D, D0, D1, Q, x1, x2, x3, x4;   
        /*var D = core.Utils.block('PARSE2NUMBER', function() {
            return _.parse(format("256*({0})^3*({4})^3-192*({0})^2*({1})*({3})*({4})^2-128*({0})^2*({2})^2*({4})^2+144*({0})^2*({2})*({3})^2*({4})"+
                "-27*({0})^2*({3})^4+144*({0})*({1})^2*({2})*({4})^2-6*({0})*({1})^2*({3})^2*({4})-80*({0})*({1})*({2})^2*({3})*({4})+18*({0})*({1})*({2})*({3})^3"+
                "+16*({0})*({2})^4*({4})-4*({0})*({2})^3*({3})^2-27*({1})^4*({4})^2+18*({1})^3*({2})*({3})*({4})-4*({1})^3*({3})^3-4*({1})^2*({2})^3*({4})+({1})^2*({2})^2*({3})^2", 
                a, b, c, d, e), scope);
        });*/

        p = _.parse(format("(8*({0})*({2})-3*({1})^2)/(8*({0})^2)", a, b, c)).toString(); //a, b, c
        q = _.parse(format("(({1})^3-4*({0})*({1})*({2})+8*({0})^2*({3}))/(8*({0})^3)", a, b, c, d)).toString();//a, b, c, d, e
        D0 = _.parse(format("12*({0})*({4})-3*({1})*({3})+({2})^2", a, b, c, d, e)).toString(); //a, b, c, d, e
        D1 = _.parse(format("2*({2})^3-9*({1})*({2})*({3})+27*({1})^2*({4})+27*({0})*({3})^2-72*({0})*({2})*({4})", a, b, c, d, e)).toString(); //a, b, c, d, e
        Q = _.parse(format("((({1})+(({1})^2-4*({0})^3)^(1/2))/2)^(1/3)", D0, D1)).toString(); //D0, D1
        S = _.parse(format("(1/2)*(-(2/3)*({1})+(1/(3*({0}))*(({2})+(({3})/({2})))))^(1/2)", a, p, Q, D0)).toString(); //a, p, Q, D0
        x1 = _.parse(format("-(({1})/(4*({0})))-({4})+(1/2)*sqrt(-4*({4})^2-2*({2})+(({3})/({4})))", a, b, p, q, S)); //a, b, p, q, S
        x2 = _.parse(format("-(({1})/(4*({0})))-({4})-(1/2)*sqrt(-4*({4})^2-2*({2})+(({3})/({4})))", a, b, p, q, S)); //a, b, p, q, S
        x3 = _.parse(format("-(({1})/(4*({0})))+({4})+(1/2)*sqrt(-4*({4})^2-2*({2})-(({3})/({4})))", a, b, p, q, S)); //a, b, p, q, S
        x4 = _.parse(format("-(({1})/(4*({0})))+({4})-(1/2)*sqrt(-4*({4})^2-2*({2})-(({3})/({4})))", a, b, p, q, S)); //a, b, p, q, S
        return [x1, x2, x3, x4];
    };
    
    var polysolve = function(EQ, solve_for) {
        solve_for = solve_for.toString();
        var eq = core.Utils.isSymbol(EQ) ? EQ : toLHS(EQ);
        var factors = _A.Factor.factor(eq);
        var solutions = [];
        factors.each(function(x) {
            var sols = solve(x.arg ? x.args[0] : x, solve_for).map(function(a) {
                solutions.push(a);
            });
        });
        return new core.Vector(solutions);
    };
    
    /*
     * 
     * @param {String[]|String|Equation} eqns
     * @param {type} solve_for
     * @returns {Array}
     */
    var solve = function(eqns, solve_for, solutions) {
        solve_for = solve_for || 'x'; //assumes x by default
        //If it's an array then solve it as a system of equations
        if(isArray(eqns)) {
            return sys_solve.apply(undefined, arguments);
        }
        solutions = solutions || [];
        //maybe we get lucky
        if(eqns.group === S && eqns.contains(solve_for)) {
            solutions.push(new Symbol(0));
            return solutions;
        }  
        if(eqns.group === CB) {
            var sf = String(solve_for); //everything else belongs to the coeff
            eqns.each(function(x) {
                if(x.contains(sf))
                    solve(x, solve_for, solutions);
            });
 
            return solutions;
        }
        var existing = {}, //mark existing solutions as not to have duplicates
            add_to_result = function(r, has_trig) {
                var r_is_symbol = isSymbol(r);
                if(r === undefined || typeof r === 'number' && isNaN(r))
                    return;
                if(isArray(r)) 
                    solutions = solutions.concat(r);
                else { 
                    if(r.valueOf() !== 'null') {
                        if(!r_is_symbol)
                            r = _.parse(r);
                        //try to convert the number to multiples of pi
                        if(core.Settings.make_pi_conversions && has_trig) {
                            var temp = _.divide(r.clone(), new Symbol(Math.PI)),
                                m = temp.multiplier,
                                a = Math.abs(m.num),
                                b = Math.abs(m.den);
                            if(a < 10 && b < 10)
                                r = _.multiply(temp, new Symbol('pi'));
                        }
                        //convert to a string so we can mark it as a known solution
                        var r_str = r.toString();
                        if(!existing[r_str])
                            solutions.push(r);
                        //mark the answer as seen
                        existing[r_str] = true;
                    }
                }
            };
        //gets points around which to solve. It does that because it builds on the principle that if
        //the sign changes over an interval then there must be a zero on that interval
        var get_points = function(symbol) {
            var f = build(symbol);
            var start = Math.round(f(0)),
                last = f(start),
                last_sign = last/Math.abs(last),
                points = [],
                rside = core.Settings.roots_per_side, // the max number of roots on right side
                lside = rside*2+1; // the max number of roots on left side
            // check around the starting point
            points.push(Math.floor(start/2));
            // Possible issue #1. If the step size exceeds the zeros then they'll be missed. Consider the case
            // where the function dips to negative and then back the positive with a step size of 0.1. The function
            // will miss the zeros because it will jump right over it. Think of a case where this can happen.
            for(var i=start; i<core.Settings.solve_radius; i++){
                var val = f(i),
                    sign = val/Math.abs(val);
                if(isNaN(val) || !isFinite(val) || points.length > rside)
                    break;
                //compare the signs. The have to be different if they cross a zero
                if(sign !== last_sign)
                    points.push((i-1)/2); //take note of the possible zero location
                last_sign = sign;
            }
            
            //check the other side
            for(var i=start-1; i>-core.Settings.solve_radius; i--){
                var val = f(i),
                    sign = val/Math.abs(val);
                if(isNaN(val) || !isFinite(val) || points.length > lside)
                    break;
                //compare the signs. The have to be different if they cross a zero
                if(sign !== last_sign)
                    points.push((i-1)/2); //take note of the possible zero location
                last_sign = sign;
            }
            return points;
        };   
        //Newton's iteration
        var Newton = function(point, f, fp) {
            var maxiter = 200,
                iter = 0;
            //first try the point itself. If it's zero viola. We're done
            var x0 = point, x;
            do {
                iter++;
                if(iter > maxiter)
                    return; //naximum iterations reached
                
                x = x0 - f(x0)/fp(x0);
                var e = Math.abs(x - x0);
                x0 = x;
            }
            while(e > Number.EPSILON)

            return x;
        };
        var attempt_Newton = function(symbol) { 
            var has_trig = symbol.hasTrig();
            // we get all the points where a possible zero might exist
            var points = get_points(symbol),
                l = points.length;
            //compile the function and the derivative of the function
            var f = build(symbol.clone()),
                fp = build(_C.diff(symbol.clone()));
            for(var i=0; i<l; i++) {
                var point = points[i];
                add_to_result(Newton(point, f, fp), has_trig);
            }
            solutions.sort();
        };
        var eq = core.Utils.isSymbol(eqns) ? eqns : toLHS(eqns),
            vars = core.Utils.variables(eq),//get a list of all the variables
            numvars = vars.length;//how many variables are we dealing with
        //if we're dealing with a single variable then we first check if it's a 
        //polynomial (including rationals).If it is then we use the Jenkins-Traubb algorithm.     
        //Don't waste time
        if(eq.group === S || eq.group === CB && eq.contains(solve_for))
            return [new Symbol(0)];
        //force to polynomial. We go through each and then we look at what it would 
        //take for its power to be an integer
        //if the power is a fractional we divide by the fractional power
        var fractionals = {},
            cfact;
        var correct_denom = function(symbol) { 
            if(symbol.symbols) {
                for(var x in symbol.symbols) { 
                    var sym = symbol.symbols[x];
                    var parts = explode(sym, solve_for);
                    var is_sqrt = parts[1].fname === core.Settings.SQRT;
                    var v = Symbol.unwrapSQRT(parts[1]);
                    var p = v.power.clone();
                    if(!isSymbol(p)) {
                        if(p.den.gt(1)) {
                            if(is_sqrt) {
                                symbol = _.subtract(symbol, sym.clone());
                                symbol = _.add(symbol, _.multiply(parts[0], v));
                                return correct_denom(symbol);
                            }
                            var c = fractionals[p.den];
                            fractionals[p.den] = c ? c++ : 1;
                        }
                        else if(p.sign() === -1){
                            var factor = _.parse(solve_for+'^'+Math.abs(p));
                            symbol.each(function(y, index) {
                               if(y.contains(solve_for)) {
                                   symbol.symbols[index] = _.multiply(y, factor.clone());
                               } 
                            });
                            fractionals = {};
                            return correct_denom(_.parse(symbol));
                        }
                    }
                }
            }
            return symbol;
        };
        //rewrites equations/expression in simpler form
        var rewrite = function(rhs, lhs) { 
            lhs = lhs || new Symbol(0);
            rhs = Symbol.unwrapSQRT(_.expand(rhs)); //expand the term expression go get rid of quotients when possible
            var c = 0, //a counter to see if we have all terms with the variable
                l = rhs.length;
            //try to rewrite the whole thing
            if(rhs.group === CP && rhs.contains(solve_for) && rhs.isLinear()) {
                rhs.distributeMultiplier();
                var t = new Symbol(0);
                //first bring all the terms containing the variable to the lhs
                rhs.each(function(x) {
                    if(x.contains(solve_for)) {
                        c++;
                        t = _.add(t, x.clone());
                    }
                    else
                        lhs = _.subtract(lhs, x.clone());
                });
                rhs = t;
                
                //if not all the terms contain the variable so it's in the form
                //a*x^2+x
                if(c !== l)
                    return rewrite(rhs, lhs);
                else { 
                    return [rhs, lhs];
                }
            }
            else if(rhs.group === CB && rhs.contains(solve_for) && rhs.isLinear()) {
                if(rhs.multiplier.lessThan(0)) {
                    rhs.multiplier = rhs.multiplier.multiply(new core.Frac(-1));
                    lhs.multiplier = lhs.multiplier.multiply(new core.Frac(-1));
                }
                if(lhs.equals(0))
                    return new Symbol(0);
                else {
                    var t = new Symbol(1);
                    rhs.each(function(x) { 
                        if(x.contains(solve_for)) 
                            t = _.multiply(t, x.clone());
                        else 
                            lhs = _.divide(lhs, x.clone());
                    });
                    rhs = t;
                    return rewrite(rhs, lhs);
                    
                }
            }   
            else if(!rhs.isLinear() && rhs.contains(solve_for)) { 
                var p = _.parse(rhs.power.clone().invert());
                rhs = _.pow(rhs, p.clone());
                lhs = _.pow(_.expand(lhs), p.clone());
                return rewrite(rhs, lhs);
            }
            else if(rhs.group === FN || rhs.group === S || rhs.group === PL) {
                return [rhs, lhs];
            }
        };
        
        //first remove any denominators
        eq = correct_denom(eq);  
        //correct fractionals. I can only handle one type right now
        var fkeys = core.Utils.keys(fractionals);
        if(fkeys.length === 1) {
            //make a note of the factor
            cfact = fkeys[0];
            eq.each(function(x, index) {
                if(x.contains(solve_for)) {
                    var parts = explode(x, solve_for);
                    var v = parts[1];
                    var p = v.power;
                    if(p.den.gt(1)) { 
                        v.power = p.multiply(new core.Frac(cfact));
                        eq.symbols[index] = _.multiply(v, parts[0]);
                    }
                } 
            });
            eq = _.parse(eq);
        }
        //polynomial single variable
        if(numvars === 1) { 
            if(eq.isPoly(true)) { 
                var coeffs = core.Utils.getCoeffs(eq, solve_for),
                    deg = coeffs.length - 1;
                if(vars[0] === solve_for) {
                    //we can solve algebraically for degrees 1, 2, 3. The remainder we switch to Jenkins-
                    if(deg === 1) 
                        add_to_result(_.divide(coeffs[0], coeffs[1].negate()));
                    else if(deg === 2) {
                        add_to_result(_.expand(quad.apply(undefined, coeffs)));
                        coeffs.push('-');
                        add_to_result(_.expand(quad.apply(undefined, coeffs)));
                    }
                    else if(deg === 3)
                        add_to_result(cubic.apply(undefined, coeffs));
                    else
                        _A.proots(eq).map(add_to_result);
                }
            }
            else {
                //since it's not a polynomial then we'll try to look for a solution using Newton's method
                //this is not a very broad search but takes the positions that something is better than nothing
                attempt_Newton(eq);
            }
        }
        else {
            //The idea here is to go through the equation and collect the coefficients
            //place them in an array and call the quad or cubic function to get the results
            if(!eq.hasFunc(solve_for) && eq.isComposite()) {
                try {
                    var coeffs = core.Utils.getCoeffs(eq, solve_for);
                    var l = coeffs.length,
                        deg = l-1; //the degree of the polynomial
                    //handle the problem based on the degree
                    switch(deg) {
                        case 1:
                            //nothing to do but to return the quotient of the constant and the LT
                            //e.g. 2*x-1
                            add_to_result(_.divide(coeffs[0], coeffs[1].negate()));
                            break;
                        case 2:
                            add_to_result(quad.apply(undefined, coeffs));
                            coeffs.push('-');
                            add_to_result(quad.apply(undefined, coeffs));
                            break;
                        case 3:
                            add_to_result(cubic.apply(undefined, coeffs));
                            break;
                        /*case 4:
                            add_to_result(quartic.apply(undefined, coeffs));
                            break;*/
                    }
                }
                catch(e) { /*something went wrong. EXITING*/; } 
            }
            else {
                try {
                    var rw = rewrite(eq);
                    var lhs = rw[0];
                    var rhs = rw[1];
                    if(lhs.group === FN) {
                        if(lhs.fname === 'abs') {
                            solutions.push(rhs.clone());
                            solutions.push(rhs.negate());
                        }
                        else
                            solutions.push(_.subtract(lhs, rhs));
                    }
                }
                catch(error) {; }
            }
        }
        
        if(cfact) {
            solutions = solutions.map(function(x) {
                return _.pow(x, new Symbol(cfact));
            });
        }
        
        return solutions;
    };
    
    core.Expression.prototype.solveFor = function(x) {
        return solve(core.Utils.isSymbol(this.symbol) ? this.symbol : this.symbol.toLHS(), x).map(function(x) {
            return new core.Expression(x);
        });
    };
    
    core.Expression.prototype.expand = function() {
        if(this.symbol instanceof Equation) {
            var clone = this.symbol.clone();
            clone.RHS = _.expand(clone.RHS);
            clone.LHS = _.expand(clone.LHS);
            return new core.Expression(clone);
        }
        return new core.Expression(_.expand(this.symbol));
    };
    
    core.Expression.prototype.variables = function() {
        if(this.symbol instanceof Equation)
            return core.Utils.arrayUnique(variables(this.symbol.LHS).concat(variables(this.symbol.RHS)));
        return variables(this.symbol);
    };
    
    var setEq = function(a, b) {
        return _.equals(a, b);
    };
    
    nerdamer.register([
        {
            name: 'solveEquations',
            parent: 'nerdamer',
            visible: true,
            build: function(){ return solve; }
        },
        {
            name: 'solve',
            parent: 'Solve',
            numargs: 2,
            visible: true,
            build: function(){ return core.Solve.solve; }
        },
        /*
        {
            name: 'polysolve',
            parent: 'Solve',
            visible: true,
            build: function(){ return polysolve; }
        },
        */
        {
            name: 'setEquation',
            parent: 'Solve',
            visible: true,
            build: function(){ return setEq; }
        }
    ]);
    nerdamer.api();
})();