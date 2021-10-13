/*
 * Author : Martin Donk
 * Website : http://www.nerdamer.com
 * Email : martin.r.donk@gmail.com
 * Source : https://github.com/jiggzson/nerdamer
 */
/* global module */

if((typeof module) !== 'undefined') {
    var nerdamer = require('./nerdamer.core.js');
    require('./Calculus.js');
    require('./Algebra.js');
}

(function () {
    //handle imports
    var core = nerdamer.getCore(),
            _ = core.PARSER,
            _A = core.Algebra,
            _C = core.Calculus,
            explode = _C.integration.decompose_arg,
            evaluate = core.Utils.evaluate,
            remove = core.Utils.remove,
            format = core.Utils.format,
            build = core.Utils.build,
            knownVariable = core.Utils.knownVariable,
            Symbol = core.Symbol,
            isSymbol = core.Utils.isSymbol,
            variables = core.Utils.variables,
            S = core.groups.S,
            PL = core.groups.PL,
            CB = core.groups.CB,
            CP = core.groups.CP,
            FN = core.groups.FN,
            Settings = core.Settings,
            range = core.Utils.range,
            isArray = core.Utils.isArray;


    // The search radius for the roots
    core.Settings.SOLVE_RADIUS = 1000;
    // The maximum number to fish for on each side of the zero
    core.Settings.ROOTS_PER_SIDE = 10;
    // Covert the number to multiples of pi if possible
    core.Settings.make_pi_conversions = false;
    // The step size
    core.Settings.STEP_SIZE = 0.1;
    // The epsilon size
    core.Settings.EPSILON = 1e-13;
    //the maximum iterations for Newton's method
    core.Settings.MAX_NEWTON_ITERATIONS = 200;
    //the maximum number of time non-linear solve tries another jump point
    core.Settings.MAX_NON_LINEAR_TRIES = 12;
    //the amount of iterations the function will start to jump at
    core.Settings.NON_LINEAR_JUMP_AT = 50;
    //the size of the jump
    core.Settings.NON_LINEAR_JUMP_SIZE = 100;
    //the original starting point for nonlinear solving
    core.Settings.NON_LINEAR_START = 0.01;
    //When points are generated as starting points for Newton's method, they are sliced into small
    //slices to make sure that we have convergence on the right point. This defines the 
    //size of the slice
    core.Settings.NEWTON_SLICES = 200;
    //The epsilon used in Newton's iteration
    core.Settings.NEWTON_EPSILON = Number.EPSILON * 2;
    //The distance in which two solutions are deemed the same
    core.Settings.SOLUTION_PROXIMITY = 1e-14;
    //Indicate wheter to filter the solutions are not
    core.Settings.FILTER_SOLUTIONS = true;
    //the maximum number of recursive calls
    core.Settings.MAX_SOLVE_DEPTH = 10;
    // The tolerance that's considered close enough to zero
    core.Settings.ZERO_EPSILON = 1e-9;
    // The maximum iteration for the bisection method incase of some JS strangeness
    core.Settings.MAX_BISECTION_ITER = 2000;
    // The tolerance for the bisection method
    core.Settings.BI_SECTION_EPSILON = 1e-12;


    core.Symbol.prototype.hasTrig = function () {
        return this.containsFunction(['cos', 'sin', 'tan', 'cot', 'csc', 'sec']);
    };

    core.Symbol.prototype.hasNegativeTerms = function () {
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
        if(rhs.isConstant() && lhs.isConstant() && !lhs.equals(rhs) || lhs.equals(core.Settings.IMAGINARY) && rhs.isConstant(true) || rhs.equals(core.Settings.IMAGINARY) && lhs.isConstant(true))
            throw new core.exceptions.NerdamerValueError(lhs.toString() + ' does not equal ' + rhs.toString());
        this.LHS = lhs; //left hand side
        this.RHS = rhs; //right and side
    }
    ;

    //UTILS ##!!

    Equation.prototype = {
        toString: function () {
            return this.LHS.toString() + '=' + this.RHS.toString();
        },
        text: function (option) {
            return this.LHS.text(option) + '=' + this.RHS.text(option);
        },
        toLHS: function (expand) {
            expand = typeof expand === 'undefined' ? true : false;
            var eqn;
            if(!expand) {
                eqn = this.clone();
            }
            else {
                eqn = this.removeDenom();
            }
            var a = eqn.LHS;
            var b = eqn.RHS;
            
            if(a.isConstant(true) && !b.isConstant(true)) {
                // Swap them to avoid confusing parser and cause an infinite loop
                [a, b] = [b, a];
            }
            var _t = _.subtract(a, b);
            var retval = expand ? _.expand(_t) : _t;
            
            // Quick workaround for issue #636
            // This basically borrows the removeDenom method from the Equation class. 
            // TODO: Make this function a stand-alone function
            retval = new Equation(retval, new Symbol(0)).removeDenom().LHS;
            
            return retval;
        },
        removeDenom: function () {
            var a = this.LHS.clone();
            var b = this.RHS.clone();
            //remove the denominator on both sides
            var den = _.multiply(a.getDenom(), b.getDenom());
            a = _.expand(_.multiply(a, den.clone()));
            b = _.expand(_.multiply(b, den));
            //swap the groups
            if(b.group === CP && b.group !== CP) {
                var t = a;
                a = b;
                b = t; //swap
            }

            //scan to eliminate denominators
            if(a.group === CB) {
                var t = new Symbol(a.multiplier),
                        newRHS = b.clone();
                a.each(function (y) {
                    if(y.power.lessThan(0))
                        newRHS = _.divide(newRHS, y);
                    else
                        t = _.multiply(t, y);
                });
                a = t;
                b = newRHS;

            }
            else if(a.group === CP) {
                //the logic: loop through each and if it has a denominator then multiply it out on both ends
                //and then start over
                for(var x in a.symbols) {
                    var sym = a.symbols[x];
                    if(sym.group === CB) {
                        for(var y in sym.symbols) {
                            var sym2 = sym.symbols[y];
                            if(sym2.power.lessThan(0)) {
                                return new Equation(
                                        _.expand(_.multiply(sym2.clone().toLinear(), a)),
                                        _.expand(_.multiply(sym2.clone().toLinear(), b))
                                        );
                            }
                        }
                    }
                }
            }

            return new Equation(a, b);
        },
        clone: function () {
            return new Equation(this.LHS.clone(), this.RHS.clone());
        },
        sub: function (x, y) {
            var clone = this.clone();
            clone.LHS = clone.LHS.sub(x.clone(), y.clone());
            clone.RHS = clone.RHS.sub(x.clone(), y.clone());
            return clone;
        },
        isZero: function () {
            return core.Utils.evaluate(this.toLHS()).equals(0);
        },
        latex: function (option) {
            return [this.LHS.latex(option), this.RHS.latex(option)].join('=');
        }
    };
    //overwrite the equals function
    _.equals = function (a, b) {
        return new Equation(a, b);
    };

    // Extend simplify
    (function () {
        var simplify = _.functions.simplify[0];
        _.functions.simplify[0] = function (symbol) {
            if(symbol instanceof Equation) {
                symbol.LHS = simplify(symbol.LHS);
                symbol.RHS = simplify(symbol.RHS);
                return symbol;
            }
            // Just call the original simplify
            return simplify(symbol);
        };
    })();

    /**
     * Sets two expressions equal
     * @param {Symbol} symbol
     * @returns {Expression}
     */
    core.Expression.prototype.equals = function (symbol) {
        if(symbol instanceof core.Expression)
            symbol = symbol.symbol; //grab the symbol if it's an expression
        var eq = new Equation(this.symbol, symbol);
        return eq;
    };

    core.Expression.prototype.solveFor = function (x) {
        var symbol;
        if(this.symbol instanceof Equation) {
            //exit right away if we already have the answer
            //check the LHS
            if(this.symbol.LHS.isConstant() && this.symbol.RHS.equals(x))
                return new core.Expression(this.symbol.LHS);

            //check the RHS
            if(this.symbol.RHS.isConstant() && this.symbol.LHS.equals(x))
                return new core.Expression(this.symbol.RHS);

            //otherwise just bring it to LHS
            symbol = this.symbol.toLHS();
        }
        else {
            symbol = this.symbol;
        }

        return solve(symbol, x).map(function (x) {
            return new core.Expression(x);
        });
    };

    core.Expression.prototype.expand = function () {
        if(this.symbol instanceof Equation) {
            var clone = this.symbol.clone();
            clone.RHS = _.expand(clone.RHS);
            clone.LHS = _.expand(clone.LHS);
            return new core.Expression(clone);
        }
        return new core.Expression(_.expand(this.symbol));
    };

    core.Expression.prototype.variables = function () {
        if(this.symbol instanceof Equation)
            return core.Utils.arrayUnique(variables(this.symbol.LHS).concat(variables(this.symbol.RHS)));
        return variables(this.symbol);
    };



    var setEq = function (a, b) {
        return _.equals(a, b);
    };

    //link the Equation class back to the core
    core.Equation = Equation;

    //Loops through an array and attempts to fails a test. Stops if manages to fail.
    var checkAll = core.Utils.checkAll = function (args, test) {
        for(var i = 0; i < args.length; i++)
            if(test(args[i]))
                return false;
        return true;
    };

    //version solve
    var __ = core.Solve = {
        version: '2.0.3',
        solutions: [],
        solve: function (eq, variable) {
            var solution = solve(eq, String(variable));
            return new core.Vector(solution);
            //return new core.Vector(solve(eq.toString(), variable ? variable.toString() : variable));
        },
        /**
         * Brings the equation to LHS. A string can be supplied which will be converted to an Equation
         * @param {Equation|String} eqn
         * @returns {Symbol}
         */
        toLHS: function (eqn, expand) {
            if(isSymbol(eqn))
                return eqn;
            //If it's an equation then call its toLHS function instead
            if(!(eqn instanceof Equation)) {
                var es = eqn.split('=');
                //convert falsey values to zero
                es[1] = es[1] || '0';
                eqn = new Equation(_.parse(es[0]), _.parse(es[1]));
            }
            return eqn.toLHS(expand);
        },
//        getSystemVariables: function(eqns) {
//            vars = variables(eqns[0], null, null, true);
//
//            //get all variables
//            for (var i = 1, l=eqns.length; i < l; i++)
//                vars = vars.concat(variables(eqns[i]));
//            //remove duplicates
//            vars = core.Utils.arrayUnique(vars).sort();
//            
//            //done
//            return vars;
//        },
        /**
         * Solve a set of circle equations. 
         * @param {Symbol[]} eqns
         * @returns {Array}
         */
        solveCircle: function (eqns, vars) {
            // Convert the variables to symbols
            var svars = vars.map(function (x) {
                return _.parse(x)
            });

            var deg = [];

            var solutions = [];

            // Get the degree for the equations
            for(var i = 0; i < eqns.length; i++) {
                var d = [];
                for(var j = 0; j < svars.length; j++) {
                    d.push(Number(core.Algebra.degree(eqns[i], svars[j])));
                }
                // Store the total degree
                d.push(core.Utils.arraySum(d, true));
                deg.push(d);
            }

            var a = eqns[0];
            var b = eqns[1];

            if(deg[0][2] > deg[1][2]) {
                [b, a] = [a, b];
                [deg[1], deg[0]] = [deg[0], deg[1]];
            }

            // Only solve it's truly a circle
            if(deg[0][0] === 1 && deg[0][2] === 2 && deg[1][0] === 2 && deg[1][2] === 4) {
                // For clarity we'll refer to the variables as x and y
                var x = vars[0];
                var y = vars[1];

                // We can now get the two points for y
                var y_points = solve(_.parse(b, knownVariable(x, solve(_.parse(a), x)[0])), y).map(function (x) {
                    return x.toString();
                });

                // Since we now know y we can get the two x points from the first equation
                var x_points = [
                    solve(_.parse(a, knownVariable(y, y_points[0])))[0].toString()
                ];

                if(y_points[1]) {
                    x_points.push(solve(_.parse(a, knownVariable(y, y_points[1])))[0].toString());
                }

                if(Settings.SOLUTIONS_AS_OBJECT) {
                    var solutions = {};
                    solutions[x] = x_points;
                    solutions[y] = y_points;
                }
                else {
                    y_points.unshift(y);
                    x_points.unshift(x);
                    solutions = [x_points, y_points];
                }
            }

            return solutions;
        },
        /**
         * Solve a system of nonlinear equations
         * @param {Symbol[]} eqns The array of equations
         * @param {number} tries The maximum number of tries
         * @param {number} start The starting point where to start looking for solutions
         * @returns {Array}
         */
        solveNonLinearSystem: function (eqns, tries, start) {
            if(tries < 0) {
                return [];//can't find a solution
            }

            start = typeof start === 'undefined' ? core.Settings.NON_LINEAR_START : start;

            //the maximum number of times to jump
            var max_tries = core.Settings.MAX_NON_LINEAR_TRIES;

            //halfway through the tries
            var halfway = Math.floor(max_tries / 2);

            //initialize the number of tries to 10 if not specified
            tries = typeof tries === 'undefined' ? max_tries : tries;

            //a point at which we check to see if we're converging. By inspection it seems that we can
            //use around 20 iterations to see if we're converging. If not then we retry a jump of x
            var jump_at = core.Settings.NON_LINEAR_JUMP_AT;

            //we jump by this many points at each pivot point
            var jump = core.Settings.NON_LINEAR_JUMP_SIZE;

            //used to check if we actually found a solution or if we gave up. Assume we will find a solution.
            var found = true;

            var create_subs = function (vars, matrix) {
                return vars.map(function (x, i) {
                    return Number(matrix.get(i, 0));
                });
            };

            var vars = core.Utils.arrayGetVariables(eqns);
            var jacobian = core.Matrix.jacobian(eqns, vars, function (x) {
                return build(x, vars);
            }, true);

            var max_iter = core.Settings.MAX_NEWTON_ITERATIONS;
            var o, y, iters, xn1, norm, lnorm, xn, d;

            var f_eqns = eqns.map(function (eq) {
                return build(eq, vars);
            });

            var J = jacobian.map(function (e) {
                return build(e, vars);
            }, true);
            //initial values
            xn1 = core.Matrix.cMatrix(0, vars);

            //initialize the c matrix with something close to 0. 
            var c = core.Matrix.cMatrix(start, vars);

            iters = 0;

            //start of algorithm
            do {
                //if we've reached the max iterations then exit
                if(iters > max_iter) {
                    break;
                    found = false;
                }

                //set the substitution object
                o = create_subs(vars, c);

                //set xn
                xn = c.clone();

                //make all the substitutions for each of the equations
                f_eqns.forEach(function (f, i) {
                    c.set(i, 0, f.apply(null, o));
                });

                var m = new core.Matrix();
                J.each(function (fn, i, j) {
                    var ans = fn.apply(null, o);
                    m.set(i, j, ans);
                });

                m = m.invert();

                //preform the elimination
                y = _.multiply(m, c).negate();

                //the callback is to avoid overflow in the coeffient denonimator
                //it converts it to a decimal and then back to a fraction. Some precision
                //is lost be it's better than overflow. 
                d = y.subtract(xn1, function (x) {
                    return _.parse(Number(x));
                });

                xn1 = xn.add(y, function (x) {
                    return _.parse(Number(x));
                });

                //move c is now xn1
                c = xn1;

                //get the norm

                //the expectation is that we're converging to some answer as this point regardless of where we start
                //this may have to be adjusted at some point because of erroneous assumptions
                if(iters >= jump_at) {
                    //check the norm. If the norm is greater than one then it's time to try another point
                    if(norm > 1) {
                        //reset the start point at halway
                        if(tries === halfway)
                            start = 0;
                        var sign = tries > halfway ? 1 : -1; //which side are we incrementing
                        //we increment +n at one side and -n at the other. 
                        n = (tries % Math.floor(halfway)) + 1;
                        //adjust the start point
                        start += (sign * n * jump);
                        //call restart
                        return __.solveNonLinearSystem(eqns, --tries, start);
                    }
                }
                lnorm = norm;
                iters++;
                norm = d.max();

                //exit early. Revisit if we get bugs
                if(Number(norm) === Number(lnorm)) {
                    break;
                }
            }
            while(Number(norm) >= Number.EPSILON)

            //return a blank set if nothing was found;
            if(!found)
                return [];

            //return c since that's the answer
            return __.systemSolutions(c, vars, true, function (x) {
                return core.Utils.round(Number(x), 14);
            });
        },
        systemSolutions: function (result, vars, expand_result, callback) {
            var solutions = core.Settings.SOLUTIONS_AS_OBJECT ? {} : [];

            result.each(function (e, idx) {
                var solution = (expand_result ? _.expand(e) : e).valueOf();
                if(callback)
                    solution = callback.call(e, solution);
                var variable = vars[idx];
                if(core.Settings.SOLUTIONS_AS_OBJECT) {
                    solutions[variable] = solution;
                }
                else
                    solutions.push([variable, solution]); /*NO*/
            });
            //done
            return solutions;
        },
        /**
         * Solves a system of equations by substitution. This is useful when
         * no distinct solution exists. e.g. a line, plane, etc.
         * @param {Array} eqns
         * @returns {Array}
         */
        solveSystemBySubstitution: function (eqns) {
            // Assume at least 2 equations. The function variables will just return an empty array if undefined is provided
            var vars_a = variables(eqns[0]);
            var vars_b = variables(eqns[1]);
            // Check if it's a circle equation
            if(eqns.length === 2 && vars_a.length === 2 && core.Utils.arrayEqual(vars_a, vars_b)) {
                return __.solveCircle(eqns, vars_a);
            }

            return []; // return an empty set
        },

        //https://www.lakeheadu.ca/sites/default/files/uploads/77/docs/RemaniFinal.pdf
        /**
         * Solves a systems of equations
         * @param {Array} eqns An array of equations
         * @param {Array} var_array An array of variables
         * @returns {Array|object}
         */
        solveSystem: function (eqns, var_array) {
            //check if a var_array was specified
            //nerdamer.clearVars();// this deleted ALL variables: not what we want
            //parse all the equations to LHS. Remember that they come in as strings
            for(var i = 0; i < eqns.length; i++)
                eqns[i] = __.toLHS(eqns[i]);

            var l = eqns.length,
                    m = new core.Matrix(),
                    c = new core.Matrix(),
                    expand_result = false,
                    vars;

            if(typeof var_array === 'undefined') {
                //check to make sure that all the equations are linear
                if(!_A.allLinear(eqns)) {
                    try {
                        return __.solveNonLinearSystem(eqns);
                    }
                    catch(e) {
                        if(e instanceof core.exceptions.DivisionByZero) {
                            return __.solveSystemBySubstitution(eqns);
                        }
                    }
                }

                vars = core.Utils.arrayGetVariables(eqns);
                
                // If the system only has one variable then we solve for the first one and 
                // then test the remaining equations with that solution. If any of the remaining
                // equation fails then the system has no solution
                if(vars.length === 1) {
                    var n = 0,
                        sol, e;
                    do {
                        var e = eqns[n].clone();
                        
                        if(n > 0) {
                            e = e.sub(vars[0], sol[0]);
                        }

                        sol = solve(e, vars[0]);
                        // Skip the first one
                        if(n === 0) 
                            continue;
                    }
                    while(++n < eqns.length)
                        
                    // Format the output
                    var solutions;
                    if(Settings.SOLUTIONS_AS_OBJECT) {
                        solutions = {};
                        solutions[vars[0]] = sol;
                    }
                    else if(sol.length === 0) {
                        solutions = sol; // No solutions
                    }
                    else {
                        solutions = [vars[0], sol];
                    }
                        
                    return solutions;
                }
                
                // Deal with redundant equations as expressed in #562
                // The fix is to remove all but the number of equations equal to the number
                // of variables. We then solve those and then evaluate the remaining equations
                // with those solutions. If the all equal true then those are just redundant
                // equations and we can return the solution set.
                if(vars.length < eqns.length) {
                    var reduced = [];
                    var n = eqns.length;
                    for(var i = 0; i < n - 1; i++) {
                        reduced.push(_.parse(eqns[i]));
                    }

                    var knowns = {};
                    var solutions = __.solveSystem(reduced, vars);
                    // The solutions may have come back as an array
                    if(Array.isArray(solutions)) {
                        solutions.forEach(function (sol) {
                            knowns[sol[0]] = sol[1];
                        });
                    }
                    else {
                        knowns = solutions;
                    }

                    // Start by assuming they will all evaluate to zero. If even one fails
                    // then all zero will be false
                    var all_zero = true;
                    // Check if the last solution evalutes to zero given these solutions
                    for(var i = n - 1; i < n; i++) {
                        if(!_.parse(eqns[i], knowns).equals(0)) {
                            all_zero = false;
                        }
                    }

                    if(all_zero) {
                        return solutions;
                    }
                }

                // deletes only the variables of the linear equations in the nerdamer namespace
                for(var i = 0; i < vars.length; i++) {
                    nerdamer.setVar(vars[i], "delete");
                }
                // TODO: move this to cMatrix or something similar
                // populate the matrix
                for(var i = 0; i < l; i++) {
                    var e = eqns[i]; //store the expression
                    // Iterate over the columns
                    for(var j = 0; j < vars.length; j++) {
                        var v = vars[j];
                        var coeffs = [];
                        e.each(function (x) {
                            if(x.contains(v)) {
                                coeffs = coeffs.concat(x.coeffs());
                            }
                        });

                        var cf = core.Utils.arraySum(coeffs);
                        m.set(i, j, cf);
                    }

                    //strip the variables from the symbol so we're left with only the zeroth coefficient
                    //start with the symbol and remove each variable and its coefficient
                    var num = e.clone();
                    vars.map(function (e) {
                        num = num.stripVar(e, true);
                    });
                    c.set(i, 0, num.negate());
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
                for(i = 0; i < l; i++) {
                    //prefill
                    c.set(i, 0, new Symbol(0));
                    var e = _.expand(eqns[i]).collectSymbols(); //expand and store
                    //go trough each of the variables
                    for(var j = 0; j < var_array.length; j++) {
                        m.set(i, j, new Symbol(0));
                        var v = var_array[j];
                        //go through the terms and sort the variables
                        for(var k = 0; k < e.length; k++) {
                            var term = e[k],
                                    check = false;
                            for(var z = 0; z < var_array.length; z++) {
                                //check to see if terms contain multiple variables
                                if(term.contains(var_array[z])) {
                                    if(check)
                                        core.err('Multiple variables found for term ' + term);
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
                    for(k = 0; k < e.length; k++) {
                        c.set(i, 0, _.add(c.get(i, 0), e[k]));
                    }
                }
                //consider case (a+b)*I+u
            }

            //check if the system has a distinct solution
            if(vars.length !== eqns.length || m.determinant().equals(0)) {
                // solve the system by hand
                //return __.solveSystemBySubstitution(eqns, vars, m, c);
                throw new core.exceptions.SolveError('System does not have a distinct solution');
            }

            // Use M^-1*c to solve system
            m = m.invert();
            var result = m.multiply(c);
            //correct the sign as per issue #410
            if(core.Utils.isArray(var_array))
                result.each(function (x) {
                    return x.negate();
                });

            return __.systemSolutions(result, vars, expand_result);
        },
        /**
         * The quadratic function but only one side.
         * @param {Symbol} c
         * @param {Symbol} b
         * @param {Symbol} a
         * @returns {Symbol}
         */
        quad: function (c, b, a) {
            var discriminant = _.subtract(_.pow(b.clone(), Symbol(2)), _.multiply(_.multiply(a.clone(), c.clone()), Symbol(4)))/*b^2 - 4ac*/;
            // Fix for #608
            discriminant = _.expand(discriminant);
            var det = _.pow(discriminant, Symbol(0.5));
            var den = _.parse(_.multiply(new Symbol(2), a.clone()));
            var retval = [
                _.parse(format('(-({0})+({1}))/({2})', b, det, den)),
                _.parse(format('(-({0})-({1}))/({2})', b, det, den))
            ];

            return retval;
        },
        /**
         * The cubic equation
         * http://math.stackexchange.com/questions/61725/is-there-a-systematic-way-of-solving-cubic-equations
         * @param {Symbol} d_o
         * @param {Symbol} c_o
         * @param {Symbol} b_o
         * @param {Symbol} a_o
         * @returns {Array}
         */
        cubic: function (d_o, c_o, b_o, a_o) {
            //convert everything to text
            var a = a_o.text(), b = b_o.text(), c = c_o.text(), d = d_o.text();

            var t = `(-(${b})^3/(27*(${a})^3)+(${b})*(${c})/(6*(${a})^2)-(${d})/(2*(${a})))`;
            var u = `((${c})/(3*(${a}))-(${b})^2/(9*(${a})^2))`;
            var v = `(${b})/(3*(${a}))`;
            var x = `((${t})+sqrt((${t})^2+(${u})^3))^(1/3)+((${t})-sqrt((${t})^2+(${u})^3))^(1/3)-(${v})`;

            // Convert a to one
            var w = '1/2+sqrt(3)/2*i'; // Cube root of unity

            return [
                _.parse(x),
                _.parse(`(${x})(${w})`),
                _.parse(`(${x})(${w})^2`)
            ];
        },
        /**
         * The quartic equation
         * @param {Symbol} e
         * @param {Symbol} d
         * @param {Symbol} c
         * @param {Symbol} b
         * @param {Symbol} a
         * @returns {Array}
         */
        quartic: function (e, d, c, b, a) {
            var scope = {};
            core.Utils.arrayUnique(variables(a).concat(variables(b))
                    .concat(variables(c)).concat(variables(d)).concat(variables(e)))
                    .map(function (x) {
                        scope[x] = 1;
                    });
            a = a.toString();
            b = b.toString();
            c = c.toString();
            d = d.toString();
            e = e.toString();
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
        },
        /**
         * Breaks the equation up in its factors and tries to solve the smaller parts
         * @param {Symbol} symbol
         * @param {String} solve_for
         * @returns {Array}
         */
        divideAndConquer: function (symbol, solve_for) {
            var sols = [];
            //see if we can solve the factors
            var factors = core.Algebra.Factor.factor(symbol);
            if(factors.group === CB) {
                factors.each(function (x) {
                    x = Symbol.unwrapPARENS(x);
                    sols = sols.concat(solve(x, solve_for));
                });
            }
            return sols;
        },
        /**
         * Attempts to solve the equation assuming it's a polynomial with numeric coefficients
         * @param {Symbol} eq
         * @param {String} solve_for
         * @returns {Array}
         */
        csolve: function (eq, solve_for) {
            return core.Utils.block('IGNORE_E', function () {
                var f, p, pn, n, pf, r, theta, sr, sp, roots;
                roots = [];
                f = core.Utils.decompose_fn(eq, solve_for, true);
                if(f.x.group === S) {
                    p = _.parse(f.x.power);
                    pn = Number(p);
                    n = _.pow(_.divide(f.b.negate(), f.a), p.invert());
                    pf = Symbol.toPolarFormArray(n);
                    r = pf[0];
                    theta = pf[1];
                    sr = r.toString();
                    sp = p.toString();
                    var k, root, str;
                    for(var i = 0; i < pn; i++) {
                        k = i;
                        str = format('({0})*e^(2*{1}*pi*{2}*{3})', sr, k, p, core.Settings.IMAGINARY);
                        root = _.parse(str);
                        roots.push(root);
                    }
                }
                return roots;
            }, true);
        },
        /**
         * Generates starting points for the Newton solver given an expression at zero.
         * It beings by check if zero is a good point and starts expanding by a provided step size. 
         * Builds on the fact that if the sign changes over an interval then a zero
         * must exist on that interval
         * @param {Symbol} symbol
         * @param {Number} step
         * @param {Array} points
         * @returns {Array}
         */
        getPoints: function (symbol, step, points) {
            step = step || 0.01;
            points = points || [];
            var f = build(symbol);
            var x0 = 0;

            var start = Math.round(x0),
                    last = f(start),
                    last_sign = last / Math.abs(last),
                    rside = core.Settings.ROOTS_PER_SIDE, // the max number of roots on right side
                    lside = rside; // the max number of roots on left side
            // check around the starting point
            points.push(Math.floor(start / 2)); //half way from zero might be a good start
            points.push(Math.abs(start)); //|f(0)| could be a good start
            points.push(start);//|f(0)| could be a good start
            //adjust for log. A good starting point to include for log is 0.1
            symbol.each(function (x) {
                if(x.containsFunction(core.Settings.LOG))
                    points.push(0.1);
            });

            var left = range(-core.Settings.SOLVE_RADIUS, start, step),
                    right = range(start, core.Settings.SOLVE_RADIUS, step);

            var test_side = function (side, num_roots) {
                var xi, val, sign;
                var hits = [];
                for(var i = 0, l = side.length; i < l; i++) {
                    xi = side[i]; //the point being evaluated
                    val = f(xi);
                    sign = val / Math.abs(val);
                    //Don't add non-numeric values
                    if(isNaN(val) || !isFinite(val) || hits.length > num_roots) {
                        continue;
                    }

                    //compare the signs. The have to be different if they cross a zero
                    if(sign !== last_sign) {
                        hits.push(xi); //take note of the possible zero location
                    }
                    last_sign = sign;
                }

                points = points.concat(hits);
            };

            test_side(left, lside);
            test_side(right, rside);

            return points;
        },
        /**
         * Implements the bisection method. Returns undefined in no solution is found
         * @param {number} point
         * @param {function} f
         * @returns {undefined | number}
         */
        bisection: function (point, f) {
            var left = point - 1;
            var right = point + 1;
            // First test if this point is even worth evaluating. It should
            // be crossing the x axis so the signs should be different
            if(Math.sign(f(left)) !== Math.sign(f(right))) {
                var safety = 0;

                var epsilon, middle;

                do {
                    epsilon = Math.abs(right - left);
                    // Safety against an infinite loop
                    if(safety++ > core.Settings.MAX_BISECTION_ITER || isNaN(epsilon)) {
                        return;
                    }
                    // Calculate the middle point
                    middle = (left + right) / 2;

                    if(f(left) * f(middle) > 0) {
                        left = middle;
                    }
                    else {
                        right = middle;
                    }
                }
                while(epsilon >= Settings.EPSILON);

                var solution = (left + right) / 2;

                // Test the solution to make sure that it's within tolerance
                var x_point = f(solution);

                if(!isNaN(x_point) && Math.abs(x_point) <= core.Settings.BI_SECTION_EPSILON) {
                    // Returns too many junk solutions if not rounded at 13th place.
                    return core.Utils.round(solution, 13);
                }
            }
        },
        /**
         * Implements Newton's iterations. Returns undefined if no solutions if found
         * @param {number} point
         * @param {function} f
         * @param {function} fp
         * @returns {undefined|number}
         */
        Newton: function (point, f, fp) {
            var maxiter = core.Settings.MAX_NEWTON_ITERATIONS,
                    iter = 0;
            //first try the point itself. If it's zero viola. We're done
            var x0 = point, x;
            do {
                var fx0 = f(x0); //store the result of the function
                //if the value is zero then we're done because 0 - (0/d f(x0)) = 0
                if(x0 === 0 && fx0 === 0) {
                    x = 0;
                    break;
                }

                iter++;
                if(iter > maxiter)
                    return; //naximum iterations reached

                x = x0 - fx0 / fp(x0);
                var e = Math.abs(x - x0);
                x0 = x;
            }
            while(e > Settings.NEWTON_EPSILON)

            //check if the number is indeed zero. 1e-13 seems to give the most accurate results
            if(Math.abs(f(x)) <= Settings.EPSILON)
                return x;
        },
        rewrite: function (rhs, lhs, for_variable) {
            lhs = lhs || new Symbol(0);
            if(rhs.isComposite() && rhs.isLinear()) {
                //try to isolate the square root
                //container for the square roots
                var sqrts = [];
                //all else
                var rem = [];
                rhs.each(function (x) {
                    x = x.clone();
                    if(x.fname === 'sqrt' && x.contains(for_variable)) {
                        sqrts.push(x);
                    }
                    else {
                        rem.push(x);
                    }
                }, true);

                if(sqrts.length === 1) {
                    //move the remainder to the RHS
                    lhs = _.expand(_.pow(_.subtract(lhs, core.Utils.arraySum(rem)), new Symbol(2)));
                    //square both sides
                    rhs = _.expand(_.pow(Symbol.unwrapSQRT(sqrts[0]), new Symbol(2)));
                }
            }
            else {
                rhs = Symbol.unwrapSQRT(_.expand(rhs)); //expand the term expression go get rid of quotients when possible
            }

            var c = 0, //a counter to see if we have all terms with the variable
                    l = rhs.length;
            //try to rewrite the whole thing
            if(rhs.group === CP && rhs.contains(for_variable) && rhs.isLinear()) {
                rhs.distributeMultiplier();
                var t = new Symbol(0);
                //first bring all the terms containing the variable to the lhs
                rhs.each(function (x) {
                    if(x.contains(for_variable)) {
                        c++;
                        t = _.add(t, x.clone());
                    }
                    else
                        lhs = _.subtract(lhs, x.clone());
                });
                rhs = t;

                //if not all the terms contain the variable so it's in the form
                //a*x^2+x
                if(c !== l) {
                    return __.rewrite(rhs, lhs, for_variable);
                }
                else {
                    return [rhs, lhs];
                }
            }
            else if(rhs.group === CB && rhs.contains(for_variable) && rhs.isLinear()) {
                if(rhs.multiplier.lessThan(0)) {
                    rhs.multiplier = rhs.multiplier.multiply(new core.Frac(-1));
                    lhs.multiplier = lhs.multiplier.multiply(new core.Frac(-1));
                }
                if(lhs.equals(0))
                    return new Symbol(0);
                else {
                    var t = new Symbol(1);
                    rhs.each(function (x) {
                        if(x.contains(for_variable))
                            t = _.multiply(t, x.clone());
                        else
                            lhs = _.divide(lhs, x.clone());
                    });
                    rhs = t;
                    return __.rewrite(rhs, lhs, for_variable);

                }
            }
            else if(!rhs.isLinear() && rhs.contains(for_variable)) {
                var p = _.parse(rhs.power.clone().invert());
                rhs = _.pow(rhs, p.clone());
                lhs = _.pow(_.expand(lhs), p.clone());
                return __.rewrite(rhs, lhs, for_variable);
            }
            else if(rhs.group === FN || rhs.group === S || rhs.group === PL) {
                return [rhs, lhs];
            }
        },
        sqrtSolve: function (symbol, v) {
            var sqrts = new Symbol(0);
            var rem = new Symbol(0);
            if(symbol.isComposite()) {
                symbol.each(function (x) {
                    if(x.fname === 'sqrt' && x.contains(v)) {
                        sqrts = _.add(sqrts, x.clone());
                    }
                    else {
                        rem = _.add(rem, x.clone());
                    }
                });
                //quick and dirty ATM
                if(!sqrts.equals(0)) {
                    var t = _.expand(_.multiply(_.parse(symbol.multiplier), _.subtract(_.pow(rem, new Symbol(2)), _.pow(sqrts, new Symbol(2)))));
                    //square both sides
                    var solutions = solve(t, v);
                    //test the points. The dumb way of getting the answers
                    solutions = solutions.filter(function (e) {
                        if(e.isImaginary())
                            return e;
                        var subs = {};
                        subs[v] = e;
                        var point = evaluate(symbol, subs);
                        if(point.equals(0))
                            return e;
                    });
                    return solutions;
                }
            }
        }
    };

    /*
     * 
     * @param {String[]|String|Equation} eqns
     * @param {String} solve_for
     * @param {Array} solutions
     * @param {Number} depth
     * @param {String|Equation} fn
     * @returns {Array}
     */
    var solve = function (eqns, solve_for, solutions, depth, fn) {
        depth = depth || 0;

        if(depth++ > Settings.MAX_SOLVE_DEPTH) {
            return solutions;
        }

        //make preparations if it's an Equation
        if(eqns instanceof Equation) {
            //if it's zero then we're done
            if(eqns.isZero()) {
                return [new Symbol(0)];
            }
            //if the lhs = x then we're done
            if(eqns.LHS.equals(solve_for) && !eqns.RHS.contains(solve_for)) {
                return [eqns.RHS];
            }
            //if the rhs = x then we're done
            if(eqns.RHS.equals(solve_for) && !eqns.LHS.contains(solve_for)) {
                return [eqns.LHS];
            }
        }

        //unwrap the vector since what we want are the elements
        if(eqns instanceof core.Vector)
            eqns = eqns.elements;
        solve_for = solve_for || 'x'; //assumes x by default
        //If it's an array then solve it as a system of equations
        if(isArray(eqns)) {
            return __.solveSystem.apply(undefined, arguments);
        }

        // Parse out functions. Fix for issue #300
        // eqns = core.Utils.evaluate(eqns);
        solutions = solutions || [];
        //mark existing solutions as not to have duplicates
        var existing = {};

        // Easy fail. If it's a rational function and the denominator is zero
        // the we're done. Issue #555
        var known = {};
        known[solve_for] = 0;
        if(isSymbol(eqns) && evaluate(eqns.getDenom(), known).equals(0) === true) {
            return solutions;
        }

        // Is usued to add solutions to set. 
        // TODO: Set is now implemented and should be utilized
        var add_to_result = function (r, has_trig) {
            var r_is_symbol = isSymbol(r);
            if(r === undefined || typeof r === 'number' && isNaN(r))
                return;
            if(isArray(r)) {
                r.forEach(function (sol) {
                    add_to_result(sol);
                });
            }
            else {
                if(r.valueOf() !== 'null') {
                    // Call the pre-add function if defined. This could be useful for rounding
                    if(typeof core.Settings.PRE_ADD_SOLUTION === 'function') {
                        r = core.Settings.PRE_ADD_SOLUTION(r);
                    }

                    if(!r_is_symbol) {
                        r = _.parse(r);
                    }
                    // try to convert the number to multiples of pi
                    if(core.Settings.make_pi_conversions && has_trig) {
                        var temp = _.divide(r.clone(), new Symbol(Math.PI)),
                                m = temp.multiplier,
                                a = Math.abs(m.num),
                                b = Math.abs(m.den);
                        if(a < 10 && b < 10)
                            r = _.multiply(temp, new Symbol('pi'));
                    }

                    // And check if we get a number otherwise we might be throwing out symbolic solutions.
                    var r_str = r.toString();

                    if(!existing[r_str]) {
                        solutions.push(r);
                    }
                    // Mark the answer as seen
                    existing[r_str] = true;
                }
            }
        };

        // Maybe we get lucky. Try the point at the function. If it works we have a point
        // If not it failed
        if(eqns.group === S && eqns.contains(solve_for)) {
            try {
                var o = {};
                o[solve_for] = 0;
                evaluate(fn, o, 'numer');
                add_to_result(new Symbol(0));
            }
            catch(e) {
                // Do nothing;
            }

            return solutions;
        }
        if(eqns.group === CB) {
            // It suffices to solve for the numerator
            var num = eqns.getNum();

            if(num.group === CB) {
                var sf = String(solve_for); //everything else belongs to the coeff
                //get the denominator and make sure it doesn't have x since we don't know how to solve for those
                num.each(function (x) {
                    if(x.contains(sf))
                        solve(x, solve_for, solutions, depth, eqns);
                });

                return solutions;
            }

            return solve(num, solve_for, solutions, depth, fn);
        }

        if(eqns.group === FN && eqns.fname === 'sqrt') {
            eqns = _.pow(Symbol.unwrapSQRT(eqns), new Symbol(2));
        }
        //pass in false to not expand equations such as (x+y)^5.
        //It suffices to solve for the numerator since there's no value in the denominator which yields a zero for the function
        var eq = (core.Utils.isSymbol(eqns) ? eqns : __.toLHS(eqns, false)).getNum(),
                vars = core.Utils.variables(eq), //get a list of all the variables
                numvars = vars.length;//how many variables are we dealing with

        //it sufficient to solve (x+y) if eq is (x+y)^n since 0^n
        if(core.Utils.isInt(eq.power) && eq.power > 0) {
            eq = _.parse(eq).toLinear();
        }

        //if we're dealing with a single variable then we first check if it's a 
        //polynomial (including rationals).If it is then we use the Jenkins-Traubb algorithm.     
        //Don't waste time
        if(eq.group === S || eq.group === CB && eq.contains(solve_for)) {
            return [new Symbol(0)];
        }
        //force to polynomial. We go through each and then we look at what it would 
        //take for its power to be an integer
        //if the power is a fractional we divide by the fractional power
        var fractionals = {},
                cfact;

        var correct_denom = function (symbol) {
            symbol = _.expand(symbol, {
                expand_denominator: true,
                expand_functions: true
            });
            var original = symbol.clone(); //preserve the original

            if(symbol.symbols) {
                for(var x in symbol.symbols) {
                    var sym = symbol.symbols[x];

                    //get the denominator of the sub-symbol
                    var den = sym.getDenom();

                    if(!den.isConstant(true) && symbol.isComposite()) {
                        var t = new Symbol(0);
                        symbol.each(function (e) {
                            t = _.add(t, _.multiply(e, den.clone()));
                        });

                        return correct_denom(_.multiply(_.parse(symbol.multiplier), t));
                    }

                    var parts = explode(sym, solve_for);
                    var is_sqrt = parts[1].fname === core.Settings.SQRT;
                    var v = Symbol.unwrapSQRT(parts[1]);
                    var p = v.power.clone();
                    //circular logic with sqrt. Since sqrt(x) becomes x^(1/2) which then becomes sqrt(x), this continues forever
                    //this needs to be terminated if p = 1/2
                    if(!isSymbol(p) && !p.equals(1 / 2)) {
                        if(p.den.gt(1)) {
                            if(is_sqrt) {
                                symbol = _.subtract(symbol, sym.clone());
                                symbol = _.add(symbol, _.multiply(parts[0].clone(), v));
                                return correct_denom(symbol);
                            }
                            var c = fractionals[p.den];
                            fractionals[p.den] = c ? c++ : 1;
                        }
                        else if(p.sign() === -1) {
                            var factor = _.parse(solve_for + '^' + Math.abs(p)); //this
                            //unwrap the symbol's denoniator
                            symbol.each(function (y, index) {
                                if(y.contains(solve_for)) {
                                    symbol.symbols[index] = _.multiply(y, factor.clone());
                                }
                            });
                            fractionals = {};
                            return correct_denom(_.parse(symbol));
                        }
                        else if(sym.group === PL) {
                            var min_p = core.Utils.arrayMin(core.Utils.keys(sym.symbols));
                            if(min_p < 0) {
                                var factor = _.parse(solve_for + '^' + Math.abs(min_p));
                                var corrected = new Symbol(0);
                                original.each(function (x) {
                                    corrected = _.add(corrected, _.multiply(x.clone(), factor.clone()));
                                }, true);
                                return corrected;
                            }
                        }
                    }
                }
            }

            return symbol;
        };


        //separate the equation
        var separate = function (eq) {
            var lhs = new Symbol(0),
                    rhs = new Symbol(0);
            eq.each(function (x) {
                if(x.contains(solve_for, true))
                    lhs = _.add(lhs, x.clone());
                else
                    rhs = _.subtract(rhs, x.clone());
            });
            return [lhs, rhs];
        };

        __.inverseFunctionSolve = function (name, lhs, rhs) {
            //ax+b comes back as [a, x, ax, b];
            var parts = explode(lhs.args[0], solve_for);
            //check if x is by itself
            var x = parts[1];
            if(x.group === S) {
                return _.divide(_.symfunction(name, [_.divide(rhs, _.parse(lhs.multiplier))]), parts[0]);
            }

        };

        //first remove any denominators
        eq = correct_denom(eq);

        if(eq.equals(0))
            return [eq];
        //correct fractionals. I can only handle one type right now
        var fkeys = core.Utils.keys(fractionals);
        if(fkeys.length === 1) {
            //make a note of the factor
            cfact = fkeys[0];
            eq.each(function (x, index) {
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

        //try for nested sqrts as per issue #486
        add_to_result(__.sqrtSolve(eq, solve_for));

        //polynomial single variable
        if(numvars === 1) {
            if(eq.isPoly(true)) {
                //try to factor and solve
                var factors = new core.Algebra.Classes.Factors();

                core.Algebra.Factor.factor(eq, factors);
                //if the equation has more than one symbolic factor then solve those individually
                if(factors.getNumberSymbolics() > 1) {
                    for(var x in factors.factors) {
                        add_to_result(solve(factors.factors[x], solve_for));
                    }
                }
                else {
                    var coeffs = core.Utils.getCoeffs(eq, solve_for),
                            deg = coeffs.length - 1,
                            was_calculated = false;
                    if(vars[0] === solve_for) {
                        //check to see if all the coefficients are constant
                        if(checkAll(coeffs, function (x) {
                            return x.group !== core.groups.N;
                        })) {
                            var roots = core.Algebra.proots(eq);
                            //if all the roots are integers then return those
                            if(checkAll(roots, function (x) {
                                return !core.Utils.isInt(x);
                            })) {
                                //roots have been calculates
                                was_calculated = true;
                                roots.map(function (x) {
                                    add_to_result(new Symbol(x));
                                });
                            }
                        }

                        if(!was_calculated) {
                            eqns = _.parse(eqns);
                            if(eqns instanceof core.Equation)
                                eqns = eqns.toLHS();

                            //we can solve algebraically for degrees 1, 2, 3. The remainder we switch to Jenkins-
                            if(deg === 1)
                                add_to_result(_.divide(coeffs[0], coeffs[1].negate()));
                            else if(deg === 2) {
                                add_to_result(_.expand(__.quad.apply(undefined, coeffs)));
                            }

                            else if(deg === 3) {
                                var solutions = []; //set to blank
                                //first try to factor and solve
                                var factored = core.Algebra.Factor.factor(eqns);

                                //if it was successfully factored
                                var solutions = [];
                                if(solutions.length > 0)
                                    add_to_result(solutions);
                                else
                                    add_to_result(__.cubic.apply(undefined, coeffs));
                            }

                            else {
                                /*
                                 var sym_roots = csolve(eq, solve_for); 
                                 if(sym_roots.length === 0)
                                 sym_roots = divnconsolve(eq, solve_for);
                                 if(sym_roots.length > 0) 
                                 add_to_result(sym_roots);
                                 else
                                 */
                                _A.proots(eq).map(add_to_result);
                            }
                        }
                    }
                }
            }
            else {
                try {
                    // Attempt Newton
                    // Since it's not a polynomial then we'll try to look for a solution using Newton's method
                    var has_trig = eq.hasTrig();
                    // we get all the points where a possible zero might exist.
                    var points1 = __.getPoints(eq, 0.1);
                    var points2 = __.getPoints(eq, 0.05);
                    var points3 = __.getPoints(eq, 0.01);
                    var points = core.Utils.arrayUnique(points1.concat(points2).concat(points3)).sort(function (a, b) {
                        return a - b;
                    });
                    var i, point, solution;

                    // Compile the function
                    var f = build(eq.clone());

                    // First try to eliminate some points using bisection
                    var t_points = [];
                    for(i = 0; i < points.length; i++) {
                        point = points[i];

                        // See if there's a solution at this point
                        solution = __.bisection(point, f);

                        // If there's no solution then add it to the array for further investigation
                        if(typeof solution === 'undefined') {
                            t_points.push(point);
                            continue;
                        }

                        // Add the solution to the solution set
                        add_to_result(solution, has_trig);
                    }

                    // Reset the points to the remaining points
                    points = t_points;

                    // Build the derivative and compile a function
                    var d = _C.diff(eq.clone());
                    var fp = build(d);
                    for(i = 0; i < points.length; i++) {
                        point = points[i];

                        add_to_result(__.Newton(point, f, fp), has_trig);
                    }
                    solutions.sort();
                }
                catch(e) {
                    console.log(e);
                }
            }
        }
        else {
            //The idea here is to go through the equation and collect the coefficients
            //place them in an array and call the quad or cubic function to get the results
            if(!eq.hasFunc(solve_for) && eq.isComposite()) {
                try {
                    var factored = core.Algebra.Factor.factor(eq.clone());

                    if(factored.group === CB) {
                        factored.each(function (x) {
                            add_to_result(solve(x, solve_for));
                        });
                    }
                    else {
                        var coeffs = core.Utils.getCoeffs(eq, solve_for);

                        var l = coeffs.length,
                                deg = l - 1; //the degree of the polynomial
                        //get the denominator and make sure it doesn't have x

                        //handle the problem based on the degree
                        switch(deg) {
                            case 0:
                                var separated = separate(eq);
                                var lhs = separated[0],
                                        rhs = separated[1];
                                
                                if(lhs.group === core.groups.EX) {
                                    var log = core.Settings.LOG;
                                    var expr_str = `${log}((${rhs})/(${lhs.multiplier}))/${log}(${lhs.value})/${lhs.power.multiplier}`;
                                    add_to_result(_.parse(expr_str));
                                }
                                break;
                            case 1:
                                //nothing to do but to return the quotient of the constant and the LT
                                //e.g. 2*x-1
                                add_to_result(_.divide(coeffs[0], coeffs[1].negate()));
                                break;
                            case 2:
                                add_to_result(__.quad.apply(undefined, coeffs));
                                break;
                            case 3:
                                add_to_result(__.cubic.apply(undefined, coeffs));
                                break;
                            case 4:
                                add_to_result(__.quartic.apply(undefined, coeffs));
                                break;
                            default:
                                add_to_result(__.csolve(eq, solve_for));
                                if(solutions.length === 0)
                                    add_to_result(__.divideAndConquer(eq, solve_for));
                        }

                        if(solutions.length === 0) {
                            //try factoring
                            add_to_result(solve(factored, solve_for, solutions, depth));
                        }
                    }

                }
                catch(e) { /*something went wrong. EXITING*/
                    ;
                }
            }
            else {
                try {
                    var rw = __.rewrite(eq, null, solve_for);
                    var lhs = rw[0];
                    var rhs = rw[1];
                    if(lhs.group === FN) {
                        if(lhs.fname === 'abs') {
                            add_to_result([rhs.clone(), rhs.negate()]);
                        }
                        else if(lhs.fname === 'sin') {
                            //asin
                            add_to_result(__.inverseFunctionSolve('asin', lhs, rhs));
                        }
                        else if(lhs.fname === 'cos') {
                            //asin
                            add_to_result(__.inverseFunctionSolve('acos', lhs, rhs));
                        }
                        else if(lhs.fname === 'tan') {
                            //asin
                            add_to_result(__.inverseFunctionSolve('atan', lhs, rhs));
                        }
                        else if(lhs.fname === core.Settings.LOG) {
                            //ax+b comes back as [a, x, ax, b];
                            var parts = explode(lhs.args[0], solve_for);
                            //check if x is by itself
                            var x = parts[1];
                            if(x.group === S) {
                                rhs = _.divide(_.subtract(_.pow(lhs.args.length > 1 ? lhs.args[1] : new Symbol('e'), _.divide(rhs, _.parse(lhs.multiplier))), parts[3]), parts[0]);
                                var eq = new Equation(x, rhs).toLHS();
                                add_to_result(solve(eq, solve_for));
                            }
                        }
                        else
                            add_to_result(_.subtract(lhs, rhs));
                    }
                    else {
                        var neq = new Equation(lhs, rhs).toLHS(); //create a new equation

                        if(neq.equals(eq))
                            throw new Error('Stopping. No stop condition exists');
                        add_to_result(solve(neq, solve_for));
                    }
                }
                catch(error) {
                    //Let's try this another way
                    try {
                        //1. if the symbol is in the form a*b*c*... then the solution is zero if 
                        //either a or b or c is zero.
                        if(eq.group === CB)
                            add_to_result(0);
                        else if(eq.group === CP) {
                            var separated = separate(eq);
                            var lhs = separated[0],
                                    rhs = separated[1];

                            //reduce the equation
                            if(lhs.group === core.groups.EX && lhs.value === solve_for) {
                                //change the base of both sides
                                var p = lhs.power.clone().invert();
                                add_to_result(_.pow(rhs, p));
                            }
                        }
                    }
                    catch(error) {
                        ;
                    }
                }
            }
        }

        if(cfact) {
            solutions = solutions.map(function (x) {
                return _.pow(x, new Symbol(cfact));
            });
        }

        // Perform some cleanup but don't do it agains arrays, etc
        // Check it actually evaluates to zero
        if(isSymbol(eqns)) {
            var knowns = {};
            solutions = solutions.filter(function (x) {
                try {
                    knowns[solve_for] = x;
                    var zero = Number(evaluate(eqns, knowns));

                    // Allow symbolic answers
                    if(isNaN(zero)) {
                        return true;
                    }
                    return true;
                }
                catch(e) {
                    return false;
                }
            });
        }

        return solutions;
    };

    //Register the functions for external use
    nerdamer.register([
        {
            name: 'solveEquations',
            parent: 'nerdamer',
            numargs: -1,
            visible: true,
            build: function () {
                return solve; //comment out to return a vector
                /*
                 return function() {
                 return core.Utils.convertToVector(solve.apply(null, arguments));
                 };
                 */
            }
        },
        {
            name: 'solve',
            parent: 'Solve',
            numargs: 2,
            visible: true,
            build: function () {
                return core.Solve.solve;
            }
        },
        {
            name: 'setEquation',
            parent: 'Solve',
            visible: true,
            build: function () {
                return setEq;
            }
        }
    ]);
    nerdamer.updateAPI();
})();