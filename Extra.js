/*
* Author : Martin Donk
* Website : http://www.nerdamer.com
* Email : martin.r.donk@gmail.com
* License : MIT
* Source : https://github.com/jiggzson/nerdamer
*/

if((typeof module) !== 'undefined') {
    nerdamer = require('./nerdamer.core.js');
    require('./Calculus');
}

(function(){
    var core = nerdamer.getCore(),
        _ = core.PARSER,
        Symbol = core.Symbol,
        format = core.Utils.format,
        isVector = core.Utils.isVector,
        S = core.groups.S,
        EX = core.groups.EX,
        CB = core.groups.CB,
        FN = core.groups.FN;
    core.Settings.Laplace_integration_depth = 40;
    var __ = core.Extra = {
        version: '1.2.1',
        //http://integral-table.com/downloads/LaplaceTable.pdf
        LaPlace: {
            //Using: intgral_0_oo f(t)*e^(-s*t) dt
            transform: function(symbol, t, s) {
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
                else if(symbol.group === S && symbol.power.equals(1/2)) {
                    retval = _.parse(format('sqrt(pi)/(2*({0})^(3/2))', s));
                }
                else if(symbol.isComposite()) {
                    retval = new Symbol(0);
                    symbol.each(function(x) {
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
                            core.Settings.integration_depth = 40; //transforms need a little more room
                        }

                        core.Utils.block('PARSE2NUMBER', function() {
                            var u = t;
                            var sym = symbol.sub(t, u);
                            var integration_expr = _.parse('e^(-'+s+'*'+u+')*'+sym);
                            retval = core.Calculus.integrate(integration_expr, u);
                            if(retval.hasIntegral())
                                _.error('Unable to compute transform');
                            retval = retval.sub(t, 0);
                            retval = _.expand(_.multiply(retval, new Symbol(-1)));
                            retval = retval.sub(u, t);
                        }, false);

                        retval = core.Utils.block('PARSE2NUMBER', function() {
                            return _.parse(retval);
                        }, true);

                        if(depth_is_lower)//put the integration depth as it was
                            core.Settings.integration_depth = integration_depth; 
                    }

                }

                return _.multiply(retval, coeff);
            }
        },
        Statistics: {
            frequencyMap: function(arr) {
                var map = {};
                //get the frequency map
                for(var i=0, l=arr.length; i<l; i++) {
                    var e = arr[i],
                        key = e.toString();
                    if(!map[key]) //default it to zero
                        map[key] = 0;
                    map[key]++; //increment
                }
                return map;
            },
            sort: function(arr) { 
                return arr.sort(function(a, b) {
                    if(!a.isConstant() || !b.isConstant())
                        _.error('Unable to sort! All values must be numeric');
                    return a.multiplier.subtract(b.multiplier);
                });
            },
            count: function(arr) {
                return new Symbol(arr.length);
            },
            sum: function(arr, x_) {
                var sum = new Symbol(0);
                for(var i=0, l=arr.length; i<l; i++) {
                    var xi = arr[i].clone();
                    if(x_) {
                        sum = _.add(_.pow(_.subtract(xi, x_.clone()), new Symbol(2)), sum);
                    }
                    else
                        sum = _.add(xi, sum);
                }
                    
                return sum;
            },
            mean: function() { 
                var args = [].slice.call(arguments);
                //handle arrays
                if(isVector(args[0]))
                    return __.Statistics.mean.apply(this, args[0].elements);
                return  _.divide(__.Statistics.sum(args), __.Statistics.count(args));
            },
            median: function() {
                var args = [].slice.call(arguments), retval; 
                //handle arrays
                if(isVector(args[0]))
                    return __.Statistics.median.apply(this, args[0].elements);
                try {
                    var sorted = __.Statistics.sort(args);
                    var l = args.length;
                    if(core.Utils.even(l)) {
                        var mid = l/2;
                        retval = __.Statistics.mean(sorted[mid-1], sorted[mid]);
                    }
                    else 
                        retval = sorted[Math.floor(l/2)];
                }
                catch(e) {
                    retval = _.symfunction('median', args);
                }
                return retval;
            },
            mode: function() {
                var args = [].slice.call(arguments),
                    retval;
                //handle arrays
                if(isVector(args[0]))
                    return __.Statistics.mode.apply(this, args[0].elements);
                
                var map = __.Statistics.frequencyMap(args),
                    max = [],
                    c = 0, //number of iterations
                    s = 0, //variable to measure if all values had equal frequency
                    fv,
                    matches = []; //keep track if others with the same frequency
                
                //the mode of 1 item is that item as per issue #310 (verified by Happypig375). 
                if(core.Utils.keys(map).length === 1)
                    return args[0];
                
                for(var x in map) {
                    var e = map[x],
                        first_iter = c === 0;;
                    if(first_iter)
                        fv = e;
                    
                    if(first_iter || e > max[1]) { //if no max or this is greater
                        max[0] = x;
                        max[1] = e;
                    }
                    //keep track if another max was found matching this frequency. We do this by adding it to matches
                    else if(e === max[1]) {
                        matches.push(x);
                    }
                    //starts with itself and then increments each time another max equals this number
                    if(e === fv)
                        s++;
                        
                    c++;
                }

                //check if s and c are equal then no max was found so return a sym function
                if(matches.length > 0) { //most common values returned as per #319
                    matches.push(max[0]);
                    retval = _.symfunction('mode', matches.sort());
                }
                else if(s === c)
                    retval = _.symfunction('mode', args);
                else
                    retval = _.parse(max[0]);
                return retval;
            }, 
            gVariance: function(k, args) {
                var x_ = __.Statistics.mean.apply(__.Statistics, args),
                    sum = __.Statistics.sum(args, x_);
                return _.multiply(k, sum);
            },
            variance: function() {
                var args = [].slice.call(arguments);
                //handle arrays
                if(isVector(args[0]))
                    return __.Statistics.variance.apply(this, args[0].elements);
                var  k = _.divide(new Symbol(1), __.Statistics.count(args));
                return __.Statistics.gVariance(k, args);
            },
            sampleVariance: function() {
                var args = [].slice.call(arguments);
                //handle arrays
                if(isVector(args[0]))
                    return __.Statistics.sampleVariance.apply(this, args[0].elements);
                
                var k = _.divide(new Symbol(1), _.subtract(__.Statistics.count(args), new Symbol(1)));
                return __.Statistics.gVariance(k, args);
            },
            standardDeviation: function() {
                var args = [].slice.call(arguments);
                //handle arrays
                if(isVector(args[0]))
                    return __.Statistics.standardDeviation.apply(this, args[0].elements);
                return _.pow(__.Statistics.variance.apply(__.Statistics, args), new Symbol(1/2));
            },
            sampleStandardDeviation: function() {
                var args = [].slice.call(arguments);
                //handle arrays
                if(isVector(args[0]))
                    return __.Statistics.sampleStandardDeviation.apply(this, args[0].elements);
                return _.pow(__.Statistics.sampleVariance.apply(__.Statistics, args), new Symbol(1/2));
            },
            zScore: function(x, mean, stdev) {
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
            build: function() { return __.LaPlace.transform; }
        },
        //statistical
        {
            name: 'mean',
            visible: true,
            numargs: -1,
            build: function() { return __.Statistics.mean; }
        },
        {
            name: 'median',
            visible: true,
            numargs: -1,
            build: function() { return __.Statistics.median; }
        },
        {
            name: 'mode',
            visible: true,
            numargs: -1,
            build: function() { return __.Statistics.mode; }
        },
        {
            name: 'smpvar',
            visible: true,
            numargs: -1,
            build: function() { return __.Statistics.sampleVariance; }
        },
        {
            name: 'variance',
            visible: true,
            numargs: -1,
            build: function() { return __.Statistics.variance; }
        },
        {
            name: 'smpstdev',
            visible: true,
            numargs: -1,
            build: function() { return __.Statistics.sampleStandardDeviation; }
        },
        {
            name: 'stdev',
            visible: true,
            numargs: -1,
            build: function() { return __.Statistics.standardDeviation; }
        },
        {
            name: 'zscore',
            visible: true,
            numargs: 3,
            build: function() { return __.Statistics.zScore; }
        }
    ]);
    
    //link registered functions externally
    nerdamer.api();
}());