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
        PL = core.groups.PL,
        format = core.Utils.format,
        build = core.Utils.build,
        isInt = core.Utils.isInt,
        same_sign = core.Utils.sameSign,
        Symbol = core.Symbol,
        isSymbol = core.Utils.isSymbol,
        variables = core.Utils.variables,
        isArray = core.Utils.isArray;
    //version solve
    core.Solve = {
        version: '1.1.0'
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
    
    var toLHS = function(eqn) {
        var es = eqn.split('=');
        if(es[1] === undefined) es[1] = '0';
        var e1 = _.parse(es[0]), e2 = _.parse(es[1]);
        return _.subtract(e1, e2);
    };
    
    var sys_solve = function(eqns) {
        nerdamer.clearVars();
        for(var i=0; i<eqns.length; i++) eqns[i] = toLHS(eqns[i]);
        
        if(!_A.allLinear(eqns)) core.err('System must contain all linear equations!');
        var vars = variables(eqns[0]), m = new core.Matrix(),
            c = new core.Matrix(),
            l = eqns.length; 
        //get all variables
        for(var i=1; i<l; i++) { vars = vars.concat(variables(eqns[i])); }
        vars = core.Utils.arrayUnique(vars).sort();

        for(var i=0; i<l; i++) {
            var e = eqns[i]; //store the expression
            for(var j=0; j<l; j++) {     
                var variable = e.symbols[vars[j]];
                m.set(i, j, variable ? variable.multiplier : 0);
            }
            var num = e.symbols['#']; 
            c.set(i, 0, new Symbol(num ? -num.multiplier : 0));
        }

        m = m.invert();

        var result = m.multiply(c);
        var solutions = [];
        result.each(function(e, idx) { solutions.push([vars[idx], e.valueOf()]); });
        return solutions;
    };
        
    var quad = function(c, b, a,  plus_or_min) { 
        var plus_or_minus = plus_or_min === '-' ? 'subtract': 'add';
        var bsqmin4ac = _.subtract(_.pow(b.clone(), Symbol(2)), _.multiply(_.multiply(a.clone(), c.clone()),Symbol(4)))/*b^2 - 4ac*/; 
        var det = _.pow(bsqmin4ac, Symbol(0.5));
        return _.divide(_[plus_or_minus](b.clone().negate(), det),_.multiply(new Symbol(2), a.clone()));
    };
    
    //http://math.stackexchange.com/questions/61725/is-there-a-systematic-way-of-solving-cubic-equations
    var cubic = function(d_o, c_o, b_o, a_o) { 
        //convert everything to text
        var a = a_o.text(), b = b_o.text(), c = c_o.text(), d = d_o.text(); 
        var d0s = '{1}^2-3*{0}*{2}',
            d0 = _.parse(format(d0s, a, b, c)),
            Q = _.parse(format('sqrt((2*{1}^3-9*{0}*{1}*{2}+27*{0}^2*{3})^2-4*({1}^2-3*{0}*{2})^3)', a, b, c, d)),
            C = _.parse(format('((1/2)*({4}+2*{1}^3-9*{0}*{1}*{2}+27*{0}^2*{3}))^(1/3)', a, b, c, d, Q));
        //check if C equals 0
        var Ct = core.Utils.block('PARSE2NUMBER', function() {
            return _.parse(C, {a: new Symbol(1), b: new Symbol(1), c: new Symbol(1),d: new Symbol(1)});
        });
        if(Number(d0) === 0 && Number(Ct) === 0) //negate Q such that C != 0
            C = _.parse(format('((1/2)*(-{4}+2*{1}^3-9*{0}*{1}*{2}+27*{0}^2*{3}))^(1/3)', a, b, c, d, Q));
        var xs = [
            '-(b/(3*a))+C/(3*a)+((b^2-3*a*c))/(3*a*C)',
            '-(b/(3*a))+(C*(1+i*sqrt(3)))/(6*a)+((1-i*sqrt(3))*(b^2-3*a*c))/6*a*C'.replace(/i/g, core.Settings.IMAGINARY),
            '-(b/(3*a))+(C*(1-i*sqrt(3)))/(6*a)+((1+i*sqrt(3))*(b^2-3*a*c))/(6*a*C)'.replace(/i/g, core.Settings.IMAGINARY)
        ];

        for(var i=0; i<3; i++) 
            xs[i] = _.parse(xs[i], { a: a_o.clone(), b: b_o.clone(), c: c_o.clone(), d: d_o.clone(), C: C.clone()});
        return xs;
    };
    
    var quartic = function(e, d, c, b, a) { 
        var z = _.divide(b.clone(), _.multiply(new Symbol(4), a.clone())).negate(),
            r = e.clone(),
            y = [d, c, b, a];
    };
    
    var solve = function(eqns, solve_for) { 
        solve_for = solve_for || 'x'; //assumes x by default
        
        if(isArray(eqns)) return sys_solve.apply(undefined, arguments);
        var solutions = [],
            existing = {},
            add_to_result = function(r, has_trig) {
                if(r === undefined || isNaN(r))
                    return;
                if(isArray(r)) solutions = solutions.concat(r);
                else {
                    if(r.valueOf() !== 'null') {
                        if(!isSymbol(r)) r = _.parse(r);
                        //try to convert the number to pi
                        if(core.Settings.make_pi_conversions && has_trig) {
                            var temp = _.divide(r.clone(), new Symbol(Math.PI)),
                                m = temp.multiplier,
                                a = Math.abs(m.num),
                                b = Math.abs(m.den);

                            if(a < 10 && b < 10)
                                r = _.multiply(temp, new Symbol('pi'));
                        }
                        var r_str = r.toString();
                        if(!existing[r_str])
                            solutions.push(r);
                        //mark the answer
                        existing[r_str] = true;
                    }
                }
            };
            
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
        
        var newton = function(point, f, fp) {
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
                add_to_result(newton(point, f, fp), has_trig);
            }
            solutions.sort();
        };

        var eq = toLHS(eqns),
            vars = core.Utils.variables(eq),//get a list of all the variables
            numvars = vars.length;//how many variables are we dealing with
        //if we're dealing with a single variable then we first check if it's a 
        //polynomial (including rationals).If it is then we use the Jenkins-Traubb algorithm.     
        if(numvars === 1) { 
            if(eq.isPoly(true)) { 
                if(vars[0] === solve_for) _A.proots(eq).map(add_to_result);
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
            if(!eq.hasFunc() && eq.isComposite()) { 
                try {
                    var coeffs = [];
                    //we loop through the symbols and stick them in their respective 
                    //containers e.g. y*x^2 goes to index 2
                    eq.each(function(term) {
                        if(term.contains(solve_for)) {
                            //we want only the coefficient which in this case will be everything but the variable
                            //e.g. a*b*x -> a*b if the variable to solve for is x
                            var coeff = term.stripVar(solve_for),
                                x = _.divide(term.clone(), coeff.clone()),
                                p = x.power.toDecimal();
                        }
                        else {
                            coeff = term;
                            p = 0;
                        }
                        var e = coeffs[p];
                        //if it exists just add it to it
                        coeffs[p] = e ? _.add(e, coeff) : coeff;
                    }, true);

                    var l = coeffs.length,
                        deg = l-1; //the degree of the polynomial
                    //fill the holes
                    for(var i=0; i<l; i++)
                        if(coeffs[i] === undefined)
                            coeffs[i] = new Symbol(0);
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
                catch(e) { /*something went wrong. EXITING*/;} 
            }
        }
        
        return solutions;
    };
    
    nerdamer.register({
        name: 'solveEquations',
        parent: 'nerdamer',
        visible: true,
        build: function(){ return solve; }
    });
})();