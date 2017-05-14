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
        S = core.groups.S,
        EX = core.groups.EX;
    
    var __ = core.Extra = {
        version: '1.0.0',
        //http://integral-table.com/downloads/LaplaceTable.pdf
        LaPlace: {
            //Using: intgral_0_oo f(t)*e^(-s*t) dt
            transform: function(symbol, t, s) {
                var u = '__u__';
                var sym = symbol.sub(t, u);
                //TODO: I have to find a way to put in into more familar form
                retval = core.Calculus.integrate(_.parse('e^(-'+s+'*'+u+')*'+sym), u).sub(u, 0);
                retval = _.expand(_.multiply(retval, new Symbol(-1)));
                return retval.sub(u, t);
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
                return  _.divide(__.Statistics.sum(args), __.Statistics.count(args));
            },
            median: function() {
                var args = [].slice.call(arguments), retval; 
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
                
                var map = __.Statistics.frequencyMap(args),
                    max = [],
                    c = 0, //number of iterations
                    s = 0, //variable to measure if all values had equal frequency
                    fv;
                for(var x in map) {
                    var e = map[x],
                        first_iter = c === 0;;
                    if(first_iter)
                        fv = e;
                    
                    if(first_iter || e > max[1]) { //if no max or this is greater
                        max[0] = x;
                        max[1] = e;
                    }
                    //starts with itself and then increments each time another max equals this number
                    if(e === fv)
                        s++;
                        
                    c++;
                }

                //check if s and c are equal then no max was found so return a sym function
                if(s === c)
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
                var args = [].slice.call(arguments),
                    k = _.divide(new Symbol(1), __.Statistics.count(args));
                return __.Statistics.gVariance(k, args);
            },
            sampleVariance: function() {
                var args = [].slice.call(arguments),
                    k = _.divide(new Symbol(1), _.subtract(__.Statistics.count(args), new Symbol(1)));
                return __.Statistics.gVariance(k, args);
            },
            standardDeviation: function() {
                var args = [].slice.call(arguments);
                return _.pow(__.Statistics.variance.apply(__.Statistics, args), new Symbol(1/2));
            },
            sampleStandardDeviation: function() {
                var args = [].slice.call(arguments);
                return _.pow(__.Statistics.sampleVariance.apply(__.Statistics, args), new Symbol(1/2));
            },
            zScore: function(x, mean, stdev) {
                return _.divide(_.subtract(x, mean), stdev);
            }
        },
        functions: {
            
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
    ]);
    
}());