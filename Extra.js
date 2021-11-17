/*
 * Author : Martin Donk
 * Website : http://www.nerdamer.com
 * Email : martin.r.donk@gmail.com
 * License : MIT
 * Source : https://github.com/jiggzson/nerdamer
 */

/* global module */

if((typeof module) !== 'undefined') {
    var nerdamer = require('./nerdamer.core.js');
    require('./Calculus');
    require('./Algebra');
}

(function () {
    "use strict";

    var core = nerdamer.getCore(),
            _ = core.PARSER,
            Symbol = core.Symbol,
            format = core.Utils.format,
            isVector = core.Utils.isVector,
            isArray = core.Utils.isArray,
            Vector = core.Vector,
            S = core.groups.S,
            EX = core.groups.EX,
            CP = core.groups.CP,
            CB = core.groups.CB,
            FN = core.groups.FN;
    core.Settings.Laplace_integration_depth = 40;


    Symbol.prototype.findFunction = function (fname) {
        //this is what we're looking for
        if(this.group === FN && this.fname === fname)
            return this.clone();
        var found;
        if(this.symbols)
            for(var x in this.symbols) {
                found = this.symbols[x].findFunction(fname);
                if(found)
                    break;
            }

        return found;
    };

    var __ = core.Extra = {
        version: '1.4.2',
        //http://integral-table.com/downloads/LaplaceTable.pdf
        //Laplace assumes all coefficients to be positive
        LaPlace: {
            //Using: integral_0^oo f(t)*e^(-s*t) dt
            transform: function (symbol, t, s) {
                symbol = symbol.clone();

                t = t.toString();
                //First try a lookup for a speed boost
                symbol = Symbol.unwrapSQRT(symbol, true);
                var retval,
                        coeff = symbol.stripVar(t),
                        g = symbol.group;

                symbol = _.divide(symbol, coeff.clone());

                if(symbol.isConstant() || !symbol.contains(t, true)) {
                    retval = _.parse(format('({0})/({1})', symbol, s));
                }
                else if(g === S && core.Utils.isInt(symbol.power)) {
                    var n = String(symbol.power);
                    retval = _.parse(format('factorial({0})/({1})^({0}+1)', n, s));
                }
                else if(symbol.group === S && symbol.power.equals(1 / 2)) {
                    retval = _.parse(format('sqrt(pi)/(2*({0})^(3/2))', s));
                }
                else if(symbol.isComposite()) {
                    retval = new Symbol(0);
                    symbol.each(function (x) {
                        retval = _.add(retval, __.LaPlace.transform(x, t, s));
                    }, true);
                }
                else if(symbol.isE() && (symbol.power.group === S || symbol.power.group === CB)) {
                    var a = symbol.power.stripVar(t);
                    retval = _.parse(format('1/(({1})-({0}))', a, s));
                }
                else {
                    var fns = ['sin', 'cos', 'sinh', 'cosh'];
                    //support for symbols in fns with arguments in the form a*t or n*t where a = symbolic and n = Number
                    if(symbol.group === FN && fns.indexOf(symbol.fname) !== -1 && (symbol.args[0].group === S || symbol.args[0].group === CB)) {
                        var a = symbol.args[0].stripVar(t);

                        switch(symbol.fname) {
                            case 'sin':
                                retval = _.parse(format('({0})/(({1})^2+({0})^2)', a, s));
                                break;
                            case 'cos':
                                retval = _.parse(format('({1})/(({1})^2+({0})^2)', a, s));
                                break;
                            case 'sinh':
                                retval = _.parse(format('({0})/(({1})^2-({0})^2)', a, s));
                                break;
                            case 'cosh':
                                retval = _.parse(format('({1})/(({1})^2-({0})^2)', a, s));
                                break;
                        }

                    }
                    else {
                        //Try to integrate for a solution
                        //we need at least the Laplace integration depth
                        var depth_is_lower = core.Settings.integration_depth < core.Settings.Laplace_integration_depth;

                        if(depth_is_lower) {
                            var integration_depth = core.Settings.integration_depth; //save the depth
                            core.Settings.integration_depth = core.Settings.Laplace_integration_depth; //transforms need a little more room
                        }

                        core.Utils.block('PARSE2NUMBER', function () {
                            var u = t;
                            var sym = symbol.sub(t, u);
                            var integration_expr = _.parse('e^(-' + s + '*' + u + ')*' + sym);
                            retval = core.Calculus.integrate(integration_expr, u);
                            if(retval.hasIntegral())
                                return _.symfunction('laplace', arguments);
//                                _.error('Unable to compute transform');
                            retval = retval.sub(t, 0);
                            retval = _.expand(_.multiply(retval, new Symbol(-1)));
                            retval = retval.sub(u, t);
                        }, false);

                        retval = core.Utils.block('PARSE2NUMBER', function () {
                            return _.parse(retval);
                        }, true);

                        if(depth_is_lower)//put the integration depth as it was
                            core.Settings.integration_depth = integration_depth;
                    }

                }

                return _.multiply(retval, coeff);
            },
            inverse: function (symbol, s_, t) {
                var input_symbol = symbol.clone();
                return core.Utils.block('POSITIVE_MULTIPLIERS', function () {
                    //expand and get partial fractions
                    if(symbol.group === CB) {
                        symbol = core.Algebra.PartFrac.partfrac(_.expand(symbol), s_);
                    }

                    if(symbol.group === S || symbol.group === CB || symbol.isComposite()) {
                        var finalize = function () {
                            //put back the numerator
                            retval = _.multiply(retval, num);
                            retval.multiplier = retval.multiplier.multiply(symbol.multiplier);
                            //put back a
                            retval = _.divide(retval, f.a);
                        };
                        var num, den, s, retval, f, p, m, den_p, fe;
                        //remove the multiplier
                        m = symbol.multiplier.clone();
                        symbol.toUnitMultiplier();
                        //get the numerator and denominator
                        num = symbol.getNum();
                        den = symbol.getDenom().toUnitMultiplier();

                        //TODO: Make it so factor doesn't destroy pi
                        //num = core.Algebra.Factor.factor(symbol.getNum());
                        //den = core.Algebra.Factor.factor(symbol.getDenom().invert(null, true));

                        if(den.group === CP) {
                            den_p = den.power.clone();
                            den.toLinear();
                        }
                        else {
                            den_p = new core.Frac(1);
                        }

                        //convert s to a string
                        s = s_.toString();
                        //split up the denominator if in the form ax+b
                        f = core.Utils.decompose_fn(den, s, true);
                        //move the multiplier to the numerator
                        fe = core.Utils.decompose_fn(_.expand(num.clone()), s, true);
                        num.multiplier = num.multiplier.multiply(m);
                        //store the parts in variables for easy recognition 
                        //check if in the form t^n where n = integer
                        if((den.group === S || den.group === CB) && f.x.value === s && f.b.equals(0) && core.Utils.isInt(f.x.power)) {
                            var fact, p;
                            p = f.x.power - 1;
                            fact = core.Math2.factorial(p);
                            //  n!/s^(n-1)
                            retval = _.divide(_.pow(t, new Symbol(p)), new Symbol(fact));
                            //wrap it up
                            finalize();
                        }
                        else if(den.group === CP && den_p.equals(1)) {
                            if(f.x.group === core.groups.PL && core.Algebra.degree(den).equals(2)) {
                                // Possibly in the form 1/(s^2+2*s+1)
                                // Try factoring to get it in a more familiar form{
                                // Apply inverse of F(s-a)
                                var completed = core.Algebra.sqComplete(den, s);
                                var u = core.Utils.getU(den);
                                // Get a for the function above
                                var a = core.Utils.decompose_fn(completed.a, s, true).b;
                                var tf = __.LaPlace.inverse(_.parse(`1/((${u})^2+(${completed.c}))`), u, t);
                                retval = _.multiply(tf, _.parse(`(${m})*e^(-(${a})*(${t}))`));
                            }
                            else {
                                // a/(b*s-c) -> ae^(-bt)
                                if(f.x.isLinear() && !num.contains(s)) {
                                    t = _.divide(t, f.a.clone());

                                    // Don't add factorial of one or zero
                                    var p = den_p - 1;
                                    var fact = p === 0 || p === 1 ? '1' : `(${den_p}-1)!`
                                    retval = _.parse(format('(({0})^({3}-1)*e^(-(({2})*({0}))/({1})))/(({4})*({1})^({3}))', t, f.a, f.b, den_p, fact));
                                    //wrap it up
                                    finalize();
                                }
                                else {
                                    if(f.x.group === S && f.x.power.equals(2)) {
                                        if(!num.contains(s)) {
                                            retval = _.parse(format('(({1})*sin((sqrt(({2})*({3}))*({0}))/({2})))/sqrt(({2})*({3}))', t, num, f.a, f.b));
                                        }
                                        // a*s/(b*s^2+c^2)
                                        else {
                                            var a = new Symbol(1);
                                            if(num.group === CB) {
                                                var new_num = new Symbol(1);
                                                num.each(function (x) {
                                                    if(x.contains(s))
                                                        new_num = _.multiply(new_num, x);
                                                    else
                                                        a = _.multiply(a, x);
                                                });
                                                num = new_num;
                                            }

                                            //we need more information about the denominator to decide
                                            var f2 = core.Utils.decompose_fn(num, s, true);
                                            var fn1, fn2, a_has_sin, b_has_cos, a_has_cos, b_has_sin;
                                            fn1 = f2.a;
                                            fn2 = f2.b;
                                            a_has_sin = fn1.containsFunction('sin');
                                            a_has_cos = fn1.containsFunction('cos');
                                            b_has_cos = fn2.containsFunction('cos');
                                            b_has_sin = fn2.containsFunction('sin');
                                            if(f2.x.value === s && f2.x.isLinear() && !((a_has_sin && b_has_cos) || (a_has_cos || b_has_sin))) {
                                                retval = _.parse(format('(({1})*cos((sqrt(({2})*({3}))*({0}))/({2})))/({2})', t, f2.a, f.a, f.b));
                                            }
                                            else {
                                                if(a_has_sin && b_has_cos) {
                                                    var sin, cos;
                                                    sin = fn1.findFunction('sin');
                                                    cos = fn2.findFunction('cos');
                                                    //who has the s?
                                                    if(sin.args[0].equals(cos.args[0]) && !sin.args[0].contains(s)) {
                                                        var b, c, d, e;
                                                        b = _.divide(fn2, cos.toUnitMultiplier()).toString();
                                                        c = sin.args[0].toString();
                                                        d = f.b;
                                                        e = _.divide(fn1, sin.toUnitMultiplier());
                                                        exp = '(({1})*({2})*cos({3})*sin(sqrt({4})*({0})))/sqrt({4})+({1})*sin({3})*({5})*cos(sqrt({4})*({0}))';
                                                        retval = _.parse(format(exp, t, a, b, c, d, e));
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        else if(f.x.power.num && f.x.power.num.equals(3) && f.x.power.den.equals(2) && num.contains('sqrt(pi)') && !num.contains(s) && num.isLinear()) {
                            var b = _.divide(num.clone(), _.parse('sqrt(pi)'));
                            retval = _.parse(format('(2*({2})*sqrt({0}))/({1})', t, f.a, b, num));
                        }
                        else if(den_p.equals(2) && f.x.power.equals(2)) {
                            var a, d, exp;
                            if(!num.contains(s)) {
                                a = _.divide(num, new Symbol(2));
                                exp = '(({1})*sin((sqrt(({2})*({3}))*({0}))/({2})))/(({3})*sqrt(({2})*({3})))-(({1})*({0})*cos((sqrt(({2})*({3}))*({0}))/({2})))/(({2})*({3}))';
                                retval = _.parse(format(exp, t, a, f.a, f.b));
                            }
                            else {
                                // Decompose the numerator to check value of s
                                f2 = core.Utils.decompose_fn(_.expand(num.clone()), s, true);
                                if(f2.x.isComposite()) {
                                    var s_terms = [];
                                    //first collect the factors e.g. (a)(bx)(cx^2+d)
                                    var symbols = num.collectSymbols(function (x) {
                                        x = Symbol.unwrapPARENS(x);
                                        var t = core.Utils.decompose_fn(x, s, true);
                                        t.symbol = x;
                                        return t;
                                    }).
                                            //then sort them by power hightest to lowest
                                            sort(function (a, b) {
                                                var p1, p2;
                                                p1 = a.x.value !== s ? 0 : a.x.power;
                                                p2 = b.x.value !== s ? 0 : b.x.power;
                                                return p2 - p1;
                                            });
                                    a = new Symbol(-1);
                                    // Grab only the ones which have s
                                    for(var i = 0; i < symbols.length; i++) {
                                        var fc = symbols[i];
                                        if(fc.x.value === s)
                                            s_terms.push(fc);
                                        else
                                            a = _.multiply(a, fc.symbol);
                                    }
                                    // The following 2 assumptions are made
                                    // 1. since the numerator was factored above then each s_term has a unique power
                                    // 2. because the terms are sorted by descending powers then the first item 
                                    //    has the highest power
                                    // We can now check for the next type s(s^2-a^2)/(s^2+a^2)^2
                                    if(s_terms[0].x.power.equals(2) && s_terms[1].x.power.equals(1) && s_terms[1].b.equals(0) && !s_terms[0].b.equals(0)) {
                                        b = s_terms[0].a.negate();
                                        exp = '-(({1})*({2})*({5})*({0})*sin((sqrt(({4})*({5}))*({0}))/({4})))/' +
                                                '(2*({4})^2*sqrt(({4})*({5})))-(({1})*({3})*({0})*sin((sqrt(({4})*({5}))*({0}))/({4})))' +
                                                '/(2*({4})*sqrt(({4})*({5})))+(({1})*({2})*cos((sqrt(({4})*({5}))*({0}))/({4})))/({4})^2';
                                        retval = _.parse(format(exp, t, a, b, s_terms[0].b, f.a, f.b));
                                    }
                                }
                                else {
                                    if(f2.x.isLinear()) {
                                        a = _.divide(f2.a, new Symbol(2));
                                        exp = '(({1})*({0})*sin((sqrt(({2})*({3}))*({0}))/({2})))/(({2})*sqrt(({2})*({3})))';
                                        retval = _.parse(format(exp, t, a, f.a, f.b));
                                    }
                                    else if(f2.x.power.equals(2)) {
                                        if(f2.b.equals(0)) {
                                            a = _.divide(f2.a, new Symbol(2));
                                            exp = '(({1})*sin((sqrt(({2})*({3}))*({0}))/({2})))/(({2})*sqrt(({2})*({3})))+(({1})*({0})*cos((sqrt(({2})*({3}))*({0}))/({2})))/({2})^2';
                                            retval = _.parse(format(exp, t, a, f.a, f.b));
                                        }
                                        else {
                                            a = _.divide(f2.a, new Symbol(2));
                                            d = f2.b.negate();
                                            exp = '-((({2})*({4})-2*({1})*({3}))*sin((sqrt(({2})*({3}))*({0}))/({2})))/(2*({2})*({3})*sqrt(({2})*({3})))+' +
                                                    '(({4})*({0})*cos((sqrt(({2})*({3}))*({0}))/({2})))/(2*({2})*({3}))+(({1})*({0})*cos((sqrt(({2})*({3}))*({0}))/({2})))/({2})^2';
                                            retval = _.parse(format(exp, t, a, f.a, f.b, d));

                                        }
                                    }
                                }
                            }
                        }
                        else if(symbol.isComposite()) {
                            // 1/(s+1)^2
                            if(den_p.equals(2) && f.x.group === S) {
                                retval = _.parse(`(${m})*(${t})*e^(-(${f.b})*(${t}))`);
                            }
                            else {
                                retval = new Symbol(0);

                                symbol.each(function (x) {
                                    retval = _.add(retval, __.LaPlace.inverse(x, s_, t));
                                }, true);
                            }
                        }
                    }

                    if(!retval) {
                        retval = _.symfunction('ilt', [input_symbol, s_, t]);
                    }

                    return retval;
                }, true);
            }
        },
        Statistics: {
            frequencyMap: function (arr) {
                var map = {};
                //get the frequency map
                for(var i = 0, l = arr.length; i < l; i++) {
                    var e = arr[i],
                            key = e.toString();
                    if(!map[key]) //default it to zero
                        map[key] = 0;
                    map[key]++; //increment
                }
                return map;
            },
            sort: function (arr) {
                return arr.sort(function (a, b) {
                    if(!a.isConstant() || !b.isConstant())
                        _.error('Unable to sort! All values must be numeric');
                    return a.multiplier.subtract(b.multiplier);
                });
            },
            count: function (arr) {
                return new Symbol(arr.length);
            },
            sum: function (arr, x_) {
                var sum = new Symbol(0);
                for(var i = 0, l = arr.length; i < l; i++) {
                    var xi = arr[i].clone();
                    if(x_) {
                        sum = _.add(_.pow(_.subtract(xi, x_.clone()), new Symbol(2)), sum);
                    }
                    else
                        sum = _.add(xi, sum);
                }

                return sum;
            },
            mean: function () {
                var args = [].slice.call(arguments);
                //handle arrays
                if(isVector(args[0]))
                    return __.Statistics.mean.apply(this, args[0].elements);
                return  _.divide(__.Statistics.sum(args), __.Statistics.count(args));
            },
            median: function () {
                var args = [].slice.call(arguments), retval;
                //handle arrays
                if(isVector(args[0]))
                    return __.Statistics.median.apply(this, args[0].elements);
                try {
                    var sorted = __.Statistics.sort(args);
                    var l = args.length;
                    if(core.Utils.even(l)) {
                        var mid = l / 2;
                        retval = __.Statistics.mean(sorted[mid - 1], sorted[mid]);
                    }
                    else
                        retval = sorted[Math.floor(l / 2)];
                }
                catch(e) {
                    retval = _.symfunction('median', args);
                }
                return retval;
            },
            mode: function () {
                var args = [].slice.call(arguments),
                        retval;
                //handle arrays
                if(isVector(args[0]))
                    return __.Statistics.mode.apply(this, args[0].elements);

                var map = __.Statistics.frequencyMap(args);

                //the mode of 1 item is that item as per issue #310 (verified by Happypig375). 
                if(core.Utils.keys(map).length === 1)
                    retval = args[0];
                else {
                    //invert by arraning them according to their frequency
                    var inverse = {};
                    for(var x in map) {
                        var freq = map[x];
                        //check if it's in the inverse already
                        if(!(freq in inverse))
                            inverse[freq] = x;
                        else {
                            var e = inverse[freq];
                            //if it's already an array then just add it
                            if(isArray(e))
                                e.push(x);
                            //convert it to and array
                            else
                                inverse[freq] = [x, inverse[freq]];
                        }
                    }
                    //the keys now represent the maxes. We want the max of those keys
                    var max = inverse[Math.max.apply(null, core.Utils.keys(inverse))];
                    //check it's an array. If it is then map over the results and convert 
                    //them to Symbol
                    if(isArray(max)) {
                        retval = _.symfunction('mode', max.sort());
                    }
                    else
                        retval = _.parse(max);
                }

                return retval;
            },
            gVariance: function (k, args) {
                var x_ = __.Statistics.mean.apply(__.Statistics, args),
                        sum = __.Statistics.sum(args, x_);
                return _.multiply(k, sum);
            },
            variance: function () {
                var args = [].slice.call(arguments);
                //handle arrays
                if(isVector(args[0]))
                    return __.Statistics.variance.apply(this, args[0].elements);
                var k = _.divide(new Symbol(1), __.Statistics.count(args));
                return __.Statistics.gVariance(k, args);
            },
            sampleVariance: function () {
                var args = [].slice.call(arguments);
                //handle arrays
                if(isVector(args[0]))
                    return __.Statistics.sampleVariance.apply(this, args[0].elements);

                var k = _.divide(new Symbol(1), _.subtract(__.Statistics.count(args), new Symbol(1)));
                return __.Statistics.gVariance(k, args);
            },
            standardDeviation: function () {
                var args = [].slice.call(arguments);
                //handle arrays
                if(isVector(args[0]))
                    return __.Statistics.standardDeviation.apply(this, args[0].elements);
                return _.pow(__.Statistics.variance.apply(__.Statistics, args), new Symbol(1 / 2));
            },
            sampleStandardDeviation: function () {
                var args = [].slice.call(arguments);
                //handle arrays
                if(isVector(args[0]))
                    return __.Statistics.sampleStandardDeviation.apply(this, args[0].elements);
                return _.pow(__.Statistics.sampleVariance.apply(__.Statistics, args), new Symbol(1 / 2));
            },
            zScore: function (x, mean, stdev) {
                return _.divide(_.subtract(x, mean), stdev);
            }
        },
        Units: {
            table: {
                foot: '12 inch',
                meter: '100 cm',
                decimeter: '10 cm',

            }
        }
    };

    nerdamer.register([
        {
            name: 'laplace',
            visible: true,
            numargs: 3,
            build: function () {
                return __.LaPlace.transform;
            }
        },
        {
            name: 'ilt',
            visible: true,
            numargs: 3,
            build: function () {
                return __.LaPlace.inverse;
            }
        },
        //statistical
        {
            name: 'mean',
            visible: true,
            numargs: -1,
            build: function () {
                return __.Statistics.mean;
            }
        },
        {
            name: 'median',
            visible: true,
            numargs: -1,
            build: function () {
                return __.Statistics.median;
            }
        },
        {
            name: 'mode',
            visible: true,
            numargs: -1,
            build: function () {
                return __.Statistics.mode;
            }
        },
        {
            name: 'smpvar',
            visible: true,
            numargs: -1,
            build: function () {
                return __.Statistics.sampleVariance;
            }
        },
        {
            name: 'variance',
            visible: true,
            numargs: -1,
            build: function () {
                return __.Statistics.variance;
            }
        },
        {
            name: 'smpstdev',
            visible: true,
            numargs: -1,
            build: function () {
                return __.Statistics.sampleStandardDeviation;
            }
        },
        {
            name: 'stdev',
            visible: true,
            numargs: -1,
            build: function () {
                return __.Statistics.standardDeviation;
            }
        },
        {
            name: 'zscore',
            visible: true,
            numargs: 3,
            build: function () {
                return __.Statistics.zScore;
            }
        }
    ]);

    //link registered functions externally
    nerdamer.updateAPI();
}());

// Added for all.min.js
if((typeof module) !== 'undefined') {
    module.exports = nerdamer;
};