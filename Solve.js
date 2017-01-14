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
        CB = core.groups.CB,
        PL = core.groups.PL,
        S = core.groups.S,
        build = core.Utils.build,
        isInt = core.Utils.isInt,
        same_sign = core.Utils.sameSign,
        Symbol = core.Symbol,
        isSymbol = core.Utils.isSymbol,
        variables = core.Utils.variables,
        isArray = core.Utils.isArray;
        
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
    
    var cubic = function(a, b, c, d) { 
        var a_ = a.text(), b_ = b.text(), c_ = c.text(), d_ = d.text();
        var a_1 = _.parse('0.86602540378443*i-0.5'),//((sqrt(3)*i)/2-1/2)
            a_2 = _.parse('-0.86602540378443*i-0.5'),//(-(sqrt(3)*i)/2-1/2)
            a_3 = _.parse(core.Utils.format('(3*({0})*({2})-({1})^2)', a_, b_, c_)),
            a_4 = _.parse(core.Utils.format('({1})/(3*({0}))', a_, b_)),
            a_5 = _.parse(core.Utils.format('9*({0})^2', a_)),
            //sqrt(27*a^2*d^2+(4*b^3-18*a*b*c)*d+4*a*c^3-b^2*c^2)
            b_1 = _.parse(core.Utils.format(
                    '(sqrt(27*({0})^2*({3})^2+(4*({1})^3-18*({0})*({1})*({2}))*({3})+4*({0})*({2})^3-({1})^2*({2})^2)'+
                    '/(10.39230484541326*({0})^2)-(27*({0})^2*({3})-9*({0})*({1})*({2})+2*({1})^3)/(54*({0})^3))^(1/3)', 
                a_, b_, c_, d_
            ));
    
            return [
                _.subtract(_.subtract(_.multiply(a_2.clone(), b_1.clone()), _.divide(_.multiply(a_5.clone(), a_3.clone()),
                    b_1.clone())), a_4.clone()),
                _.subtract(_.subtract(_.multiply(a_1.clone(), b_1.clone()), _.divide(_.multiply(a_2.clone(), a_3.clone()), 
                    _.multiply(a_5.clone(), b_1.clone()))), a_4.clone()),
                _.subtract(_.subtract(b_1.clone(), _.divide(a_3.clone(), _.multiply(a_5.clone(), b_1.clone()))), a_4.clone()).negate()
            ];
    };
    
    var solve = function(eqns, solve_for) { 
        solve_for = solve_for || 'x'; //assumes x by default
        
        if(isArray(eqns)) return sys_solve.apply(undefined, arguments);
        var solutions = [],
            add_to_result = function(r) {
                if(isArray(r)) solutions = solutions.concat(r);
                else {
                    if(r.valueOf() !== 'null') {
                        if(!isSymbol(r)) r = _.parse(r);
                        solutions.push(r);
                    }
                }
            };
            
        var attempt_Newton = function(symbol) {
            //first we compile a machine function to gain a boost in speed
            var f = build(symbol);

            //we're going to use trial and error to generate two points for Newton's method
            //these to point should have opposite signs. 
            //we start at 0 just because and check the sign
            var starting_point, guess = 0;

            do {
                starting_point =  f(guess); //we want a real starting point
                guess++;
                if(guess > 100) break;//safety
            }
            while(!isFinite(starting_point))

            if(starting_point === 0) add_to_result(new Symbol(starting_point));//we're done
            else {
                var df = build(_C.diff(symbol.clone())), ls;

                //get two points so we can get the slope of the function
                for(var i=0; i<10; i++) {
                    var c = df(i);
                    if(!isNaN(ls) && !isNaN(c)) break;
                    ls = c;
                }

                var direction = 1, 
                    slope = ls-c;

                //we want to make sure that we search for a number in the opposite direction
                if(same_sign(slope, starting_point)) {
                    direction = -1;
                }

                var search_for_solution_at = function(start) { 
                    var end = 0, point;
                    //we want a number with an opposite sign
                    for(var i=start; i<start+100; i++) {
                        var next_point = f(i)*direction,
                            r = Math.abs(0 - next_point);//get the distance to zero

                        if(r > 1) next_point *= r;//increase the search radius

                        if(next_point === 0 || !same_sign(next_point, end)) {
                            point = next_point === start ? next_point : (start+end)/2; 
                            break;
                        }

                        end = next_point; 
                    }

                    if(point !== undefined) add_to_result(_.parse(core.Algebra.froot(symbol, point)));
                };

                search_for_solution_at(starting_point); //check 1 side  
                search_for_solution_at(-starting_point);//check the other
            }
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
                    //remove extra powers
                    
                    //the terms of the polynomial
                    var coeffs = [];
                    var add = function(c, p) {
                        p = Number(p);
                        if(!isInt(p)) throw new Error('Stopping');
                        var xterm = _.parse(solve_for+'^'+p); //create a term of equal power to divide out
                        coeffs[p] = _.divide(c, xterm);
                    };

                    for(var x in eq.symbols) {
                        var sym = eq.symbols[x];
                        if(sym.group === PL && sym.value === solve_for) {
                            sym.each(function(y, p) {
                                add(y, p);
                            });
                        }
                        else {
                            var t, p;
                            if(sym.symbols) {
                                var t = sym.symbols[solve_for];
                                add(sym, t ? t.power : 0);
                            }
                            else add(sym, sym.value === solve_for ? sym.power : 0);
                        }
                    }
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
                            add_to_result(cubic.apply(undefined, coeffs.reverse()));
                            break;
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

var x = nerdamer.solveEquations(['x+y=6', '2*x-y=0']);

console.log(x.toString())