/*
* Author : Martin Donk
* Website : http://www.nerdamer.com
* Email : martin.r.donk@gmail.com
* License : MIT
* Source : https://github.com/jiggzson/nerdamer
*/
require('./Calculus.js');
if((typeof module) !== 'undefined') {
    nerdamer = require('./nerdamer.core.js');
}

(function() {
    "use strict";
    
    /*shortcuts*/
    var core = nerdamer.getCore(),
        _ = core.PARSER,
        N = core.groups.N,
        S = core.groups.S,
        EX = core.groups.EX,
        FN = core.groups.FN,
        PL = core.groups.PL,
        CP = core.groups.CP,
        CB = core.groups.CB,
        keys = core.Utils.keys,
        variables = core.Utils.variables,
        round = core.Utils.round,
        Frac = core.Frac,
        isInt = core.Utils.isInt,
        Symbol = core.Symbol,
        EPSILON = core.Settings.EPSILON,
        CONST_HASH = core.Settings.CONST_HASH;
        
        /**
        * Converts a symbol into an equivalent polynomial arrays of 
        * the form [[coefficient_1, power_1],[coefficient_2, power_2], ... ]
        * @param {Symbol|Number} symbol
        * @param {String} variable The variable name of the polynomial
        * @param {int} order
        */
        function Polynomial(symbol, variable, order) { 
            if(core.Utils.isSymbol(symbol)) {
                this.parse(symbol);
            }
            else if(!isNaN(symbol)) { 
                order = order || 0;
                if(variable === undefined) 
                    throw new Error('Polynomial expects a variable name when creating using order');
                this.coeffs = [];
                this.coeffs[order] = symbol;
                this.fill(symbol);
            }
            else if(typeof symbol === 'string') {
                this.parse(_.parse(symbol));
            }
        }
        
        Polynomial.fromArray = function(arr, variable) {
            if(typeof variable === 'undefined') 
                throw new Error('A variable name must be specified when creating polynomial from array');
            var p = new Polynomial();
            p.coeffs = arr;
            p.variable = variable;
            return p;
        };
        
        Polynomial.prototype = { 
            parse: function(symbol, c) { 
                this.variable = variables(symbol)[0]; 
                if(!symbol.isPoly()) throw new Error('Polynomial Expected! Received '+core.Utils.text(symbol));
                c = c || [];
                if(!symbol.power.absEquals(1)) symbol = _.expand(symbol);

                if(symbol.group === core.groups.N) { c[0] = symbol.multiplier; }
                else if(symbol.group === core.groups.S) { c[symbol.power.toDecimal()] = symbol.multiplier; }
                else { 
                    for(var x in symbol.symbols) { 
                        var sub = symbol.symbols[x],
                            p = sub.power; 
                        if(core.Utils.isSymbol(p)) throw new Error('power cannot be a Symbol');
                        
                        p = sub.group === N ? 0 : p.toDecimal();
                        if(sub.symbols){ 
                            this.parse(sub, c);  
                        }
                        else { 
                            c[p] = sub.multiplier; 
                        }
                    }
                }
                
                this.coeffs = c;
                
                this.fill();
            },
            /**
            * Fills in the holes in a polynomial with zeroes
            * @param {Number} x - The number to fill the holes with
            */
            fill: function(x) {
                x = Number(x) || 0;
                var l = this.coeffs.length;
                for(var i=0; i<l; i++) {
                    if(this.coeffs[i] === undefined) { this.coeffs[i] = new Frac(x); }
                }
                return this;
            },
            /**
            * Removes higher order zeros or a specific coefficient
            * @returns {Array}
            */
            trim: function() { 
                var l = this.coeffs.length;
                while(l--) {
                    var c = this.coeffs[l];
                    if(c && c.equals(0)) this.coeffs.pop();
                    else break;
                }

                return this;
            },
            /**
            * Adds together 2 polynomials
            * @param {Polynomial} poly
            */
            add: function(poly) {
                var l = Math.max(this.coeffs.length, poly.coeffs.length);
                for(var i=0; i<l; i++) {
                    var a = (this.coeffs[i] || new Frac(0)),
                        b = (poly.coeffs[i] || new Frac(0));
                    this.coeffs[i] = a.add(b);
                }
                return this;
            },
            /**
            * Adds together 2 polynomials
            * @param {Polynomial} poly
            */
            subtract: function(poly) {
                var l = Math.max(this.coeffs.length, poly.coeffs.length);
                for(var i=0; i<l; i++) {
                    var a = (this.coeffs[i] || new Frac(0)),
                        b = (poly.coeffs[i] || new Frac(0));
                    this.coeffs[i] = a.subtract(b);
                }
                return this;
            },
            divide: function(poly) {
                var variable = this.variable,
                    dividend = core.Utils.arrayClone(this.coeffs),
                    divisor = core.Utils.arrayClone(poly.coeffs),
                    n = dividend.length,
                    mp = divisor.length-1,
                    quotient = [];

                //loop through the dividend
                for(var i=0; i<n; i++) {
                    var p = n-(i+1);
                    //get the difference of the powers
                    var d = p - mp;
                    var inBrackets = core.Utils.inBrackets;
                    //get the quotient of the coefficients
                    var q = dividend[p].divide(divisor[mp]);

                    if(d < 0) break;//the divisor is not greater than the dividend
                    //place it in the quotient
                    quotient[d] = q;

                    for(var j=0; j<=mp; j++) {
                        //reduce the dividend
                        dividend[j+d] = dividend[j+d].subtract((divisor[j].multiply(q)));
                    }
                }

                //clean up
                var p1 = Polynomial.fromArray(dividend, variable || 'x').trim(), //pass in x for safety
                    p2 = Polynomial.fromArray(quotient, variable || 'x');
                return [p2, p1];
            },
            multiply: function(poly) {
                var l1 = this.coeffs.length, l2 = poly.coeffs.length, 
                    c = []; //array to be returned
                for(var i=0; i<l1; i++) {
                    var x1 = this.coeffs[i];
                    for(var j=0; j<l2; j++) {
                        var k = i+j, //add the powers together
                            x2 = poly.coeffs[j],
                            e = c[k] || new Frac(0); //get the existing term from the new array
                        c[k] = e.add(x1.multiply(x2)); //multiply the coefficients and add to new polynomial array
                    }
                }
                this.coeffs = c;
                return this;
            },
            /**
             * Checks if a polynomial is zero
             * @returns {Boolean}
             */
            isZero: function() {
                var l = this.coeffs.length;
                for(var i=0; i<l; i++) {
                    var e = this.coeffs[i];
                    if(!e.equals(0)) return false;
                }
                return true;
            },
            sub: function(n) {
                var sum = new Frac(0), l=this.coeffs.length;
                for(var i=0; i<l; i++) {
                    var t = this.coeffs[i];
                    if(!t.equals(0)) sum = sum.add(t.multiply(new Frac(Math.pow(n, i))));
                }
                return sum;
            },
            clone: function() {
                var p = new Polynomial();
                p.coeffs = this.coeffs;
                p.variable = this.variable;
                return p;
            },
            deg: function() {
                this.trim();
                return this.coeffs.length-1;
            },
            lc: function() { 
                return this.coeffs[this.deg()].clone();
            },
            monic: function() {
                var lc = this.lc(), l = this.coeffs.length; 
                for(var i=0; i<l; i++) this.coeffs[i] = this.coeffs[i].divide(lc);
                return this;
            },
            gcd: function(poly) { 
                //get the maximum power of each
                var mp1 = this.coeffs.length-1, 
                    mp2 = poly.coeffs.length-1,
                    T;
                //swap so we always have the greater power first
                if(mp1 < mp2) {
                    return poly.gcd(this);
                }
                var a = this;

                while(!poly.isZero()) {   
                    var t = poly.clone(); 
                    a = a.clone(); 
                    T = a.divide(t);
                    poly = T[1]; 
                    a = t; 
                }
                
                var gcd = core.Math2.QGCD.apply(null, a.coeffs);

                if(!gcd.equals(1)) { 
                    var l = a.coeffs.length;
                    for(var i=0; i<l; i++) {
                        a.coeffs[i] = a.coeffs[i].divide(gcd);
                    }
                }
                return a;
            },
            polyGCD: function(poly) {
                
            },
            /**
             * Differentiates the polynomial
             */
            diff: function() {
                var new_array = [], l = this.coeffs.length;
                for(var i=1; i<l; i++) new_array.push(this.coeffs[i].multiply(new Frac(i)));
                this.coeffs = new_array;
                return this;
            },
            /**
             * Integrates the polynomial
             */
            integrate: function() {
                var new_array = [0], l = this.coeffs.length;
                for(var i=0; i<l; i++) {
                    var c = new Frac(i+1);
                    new_array[c] = this.coeffs[i].divide(c);
                }
                this.coeffs = new_array;
                return this;
            },
            gcf: function(toPolynomial) {
                //get the first nozero coefficient and returns its power
                var fnz = function(a) {
                        for(var i=0; i<a.length; i++)
                            if(!a[i].equals(0)) return i;
                    },
                    ca = [];
                for(var i=0; i<this.coeffs.length; i++) {
                    var c = this.coeffs[i];
                    if(!c.equals(0) && ca.indexOf(c) === -1) ca.push(c);
                }
                var p = [core.Math2.QGCD.apply(undefined, ca), fnz(this.coeffs)].toDecimal(); 
                
                if(toPolynomial) {
                    var parr = [];
                    parr[p[1]-1] = p[0];
                    p = Polynomial.fromArray(parr, this.variable).fill();
                }
                
                return p;
            },
            /**
             * Raises a polynomial P to a power p -> P^p. e.g. (x+1)^2
             * @param {Int} p - The power to be raised to 
             *
            raiseTo: function(p) {
                var a = this.coeffs.slice(), ll=this.coeffs.length;
                while(--p) { 
                    var l = a.length, r=[];
                    for(var i=0; i<l; i++) {
                        for(var j=0; j<ll; j++) {
                            var idx = i+j, e = r[idx] || 0;
                            r[idx] = e+a[i]*this.coeffs[j];
                        }
                    }
                    a = r;
                }
                this.coeffs = r;
                return this;
            },*/
            quad: function(incl_img) {
                var roots = [];
                if(this.coeffs.length > 3) throw new Error('Cannot calculate quadratic order of '+(this.coeffs.length-1));
                if(this.coeffs.length === 0) throw new Error('Polynomial array has no terms');
                var a = this.coeffs[2] || 0, b = this.coeffs[1] || 0, c = this.coeffs[0];
                var dsc = b*b-4*a*c;
                if(dsc < 0 && !incl_img) return roots;
                else {
                    roots[0] = (-b+Math.sqrt(dsc))/(2*a);
                    roots[1] = (-b-Math.sqrt(dsc))/(2*a);
                }
                return roots;
            },
            /**
             * Converts polynomial to Symbol
             * @returns {Symbol}
             */
            toSymbol: function() {
                var l = this.coeffs.length,
                    variable = this.variable;
                if(l === 0) return new core.Symbol(0);
                var end = l -1, str = '';

                for(var i=0; i<l; i++) {
                    //place the plus sign for all but the last one
                    var plus = i === end ? '' : '+',
                        e = this.coeffs[i];
                    if(!e.equals(0)) str += (e+'*'+variable+'^'+i+plus);
                }
                return _.parse(str);
            },
            equalsNumber: function(x) {
                this.trim();
                return this.coeffs.length === 1 && this.coeffs[0] === x;
            },
            toString: function() {
                return this.toSymbol().toString();
            }
        };
        
    //make the polynomial class available to EVERYONE!
    core.Polynomial = Polynomial;
    /**
    * If the symbols is of group PL or CP it will return the multipliers of each symbol
    * as these are polynomial coefficients. CB symbols are glued together by multiplication
    * so the symbol multiplier carries the coefficients for all contained symbols.
    * For S it just returns it's own multiplier. This function doesn't care if it's a polynomial or not
    * @param {Array} c The coefficient array
    * @param {boolean} with_order 
    * @return {Array}
    */
    Symbol.prototype.coeffs = function(c, with_order) {
        if(with_order && !this.isPoly(true)) _.error('Polynomial expected when requesting coefficients with order');
        c = c || [];
        var s = this.clone().distributeMultiplier(); 
        if(s.isComposite()) {
            for(var x in s.symbols) { 
                var sub = s.symbols[x];
                if(sub.isComposite()) { 
                    sub.clone().distributeMultiplier().coeffs(c, with_order);
                }
                else { 
                    if(with_order) c[sub.isConstant() ? 0 : sub.power.toDecimal()] = sub.multiplier;
                    else c.push(sub.multiplier);
                }
            }
        }
        else { 
            if(with_order) c[s.isConstant() ? 0 : s.power.toDecimal()] = s.multiplier;
            else c.push(s.multiplier);
        }
        //fill the holes
        if(with_order) {
            for(var i=0; i<c.length; i++)
                if(c[i] === undefined) c[i] = new Frac(0);
        }
        return c;
    };
    Symbol.prototype.hasFunc = function() {
        if(this.group === FN || this.group === EX) return true;
        if(this.symbols) {
            for(var x in this.symbols) {
                if(this.symbols[x].hasFunc()) return true;
            }
        }
        return false;
    };
    Symbol.prototype.tBase = function(map) {
        if(typeof map === 'undefined') throw new Error('Symbol.tBase requires a map object!');
        var terms= [];
        var symbols = this.collectSymbols(null, null, null, true),
            l = symbols.length;
        for(var i=0; i<l; i++) {
            var symbol = symbols[i],
                g = symbol.group,
                nterm = new MVTerm(symbol.multiplier, [], map);
            if(g === CB) {
                for(var x in symbol.symbols) {
                    var sym = symbol.symbols[x];
                    nterm.terms[map[x]] = sym.power;
                }
            }
            else {
                nterm.terms[map[symbol.value]] = symbol.power;
            }
            
            terms.push(nterm.fill());
            nterm.updateCount();
        }
        return terms;
    };
    Symbol.prototype.altVar = function(x) {
        var m = this.multiplier.toString(), p = this.power.toString();
        return (m === '1' ? '' : m+'*')+ x + (p === '1' ? '' : '^'+p);
    };
    Symbol.prototype.sameVars = function(symbol) {
        if(!(this.symbols || this.group === symbol.group)) return false;
        for(var x in this.symbols) {
            var a = this.symbols[x], b = symbol.symbols[x];
            if(!b) return false;
            if(a.value !== b.value) return false;
        }
        return true;
    };
    function MVTerm(coeff, terms, map) {
        this.terms = terms || [];
        this.coeff = coeff;
        this.map = map; //careful! all maps are the same object
        this.sum = new core.Frac(0);
        this.image = undefined;
    };
    MVTerm.prototype.updateCount = function() {
        this.count = this.count || 0;
        for(var i=0; i<this.terms.length; i++) {
            if(!this.terms[i].equals(0)) this.count++;
        }
        return this;
    };
    MVTerm.prototype.getVars = function() {
        var vars = [];
        for(var i=0; i<this.terms.length; i++) {
            var term = this.terms[i],
                rev_map = this.getRevMap();
            if(!term.equals(0)) vars.push(this.rev_map[i]);
        }
        return vars.join(' ');
    };
    MVTerm.prototype.len = function() {
        if(typeof this.count === 'undefined') {
            this.updateCount();
        }
        return this.count;
    };
    MVTerm.prototype.toSymbol = function(rev_map) {
        rev_map = rev_map || this.getRevMap();
        var symbol = new Symbol(this.coeff); 
        for(var i=0; i<this.terms.length; i++) {
            var v = rev_map[i],
                t = this.terms[i];
            if(t.equals(0) || v === CONST_HASH) continue;
            var mapped = new Symbol(v);
            mapped.power = t;
            symbol = _.multiply(symbol, mapped);
        }
        return symbol;
    };
    MVTerm.prototype.getRevMap = function() {
        if(this.rev_map) return this.rev_map;
        var o = {};
        for(var x in this.map) o[this.map[x]] = x;
        this.rev_map = o;
        return o;
    };
    MVTerm.prototype.generateImage = function() {
        this.image = this.terms.join(' ');
        return this;
    },
    MVTerm.prototype.getImg = function() {
        if(!this.image) this.generateImage();
        return this.image;
    },
    MVTerm.prototype.fill = function() {
        var l = this.map.length;
        for(var i=0; i<l; i++) {
            if(typeof this.terms[i] === 'undefined') this.terms[i] = new core.Frac(0);
            else {
                this.sum = this.sum.add(this.terms[i]);
            }
        }
        return this;
    };
    MVTerm.prototype.divide = function(mvterm) {
        var c = this.coeff.divide(mvterm.coeff),
            l = this.terms.length,
            new_mvterm = new MVTerm(c, [], this.map);
        for(var i=0; i<l; i++) {
            new_mvterm.terms[i] = this.terms[i].subtract(mvterm.terms[i]);
            new_mvterm.sum = new_mvterm.sum.add(new_mvterm.terms[i]);
        }
        return new_mvterm;
    };
    MVTerm.prototype.multiply = function(mvterm) {
        var c = this.coeff.multiply(mvterm.coeff),
            l = this.terms.length,
            new_mvterm = new MVTerm(c, [], this.map);
        for(var i=0; i<l; i++) {
            new_mvterm.terms[i] = this.terms[i].add(mvterm.terms[i]);
            new_mvterm.sum = new_mvterm.sum.add(new_mvterm.terms[i]);
        }
        return new_mvterm;
    };
    MVTerm.prototype.isZero = function() {
        return this.coeff.equals(0);
    };
    MVTerm.prototype.toString = function() {
        return '{ coeff: '+this.coeff.toString()+', terms: ['+
                this.terms.join(',')+']: sum: '+this.sum.toString()+', count: '+this.count+'}';
    };
    
    core.Utils.toMapObj = function(arr) {
        var c = 0, o = {};
        for(var i=0; i<arr.length; i++) {
            var v = arr[i];
            if(typeof o[v] === 'undefined') {
                o[v] = c; c++;
            }
        }
        o.length = c;
        return o;
    };
    core.Utils.filledArray = function(v, n, clss) {
        var a = [];
        while (n--) {
          a[n] = clss ? new clss(v) : v;
        }
        return a;
    };
    core.Utils.arrSum = function(arr) {
        var sum = 0, l = arr.length;
        for(var i=0; i<l; i++) sum += arr[i];
        return sum;
    };
    core.Utils.subFunctions = function(symbol, map) {
        map = map || {};
        var subbed = [];
        symbol.each(function(x) {

            if(x.group === FN || x.previousGroup === FN) {
                //we need a new variable name so why not use one of the existing
                var val = core.Utils.text(x, 'hash'), tvar = map[val];
                if(!tvar) {
                    //generate a unique enough name
                    var t = x.fname+core.Utils.keys(map).length;
                    map[val] = t;
                    subbed.push(x.altVar(t));
                }
                else subbed.push(x.altVar(tvar));
            }
            else if(x.group === CB || x.group === PL || x.group === CP) {
                subbed.push(core.Utils.subFunctions(x, map));
            }
            else subbed.push(x.text());
        });
        if(symbol.group === CP || symbol.group === PL) return symbol.altVar(core.Utils.inBrackets(subbed.join('+')));;
        if(symbol.group === CB) return symbol.altVar(core.Utils.inBrackets(subbed.join('*')));
        return symbol.text();
    };
    var __ = core.Algebra = {

        version: '1.3.5',
        init: (function() {})(),
        proots: function(symbol, decp) { 
            //the roots will be rounded up to 7 decimal places.
            //if this causes trouble you can explicitly pass in a different number of places
            //rarr for polynomial of power n is of format [n, coeff x^n, coeff x^(n-1), ..., coeff x^0]
            decp = decp || 7;
            var zeros = 0;
            var get_roots = function(rarr, powers, max) {
                var roots = calcroots(rarr, powers, max);
                for(var i=0;i<zeros;i++) roots.unshift(0);
                return roots;
            };
            
            if(symbol instanceof Symbol && symbol.isPoly()) { 
                if(symbol.group === core.groups.S) { 
                    return [0];
                }
                else if(symbol.group === core.groups.PL) { 
                    var powers = keys(symbol.symbols),
                        minpower = core.Utils.arrayMin(powers),
                    symbol = core.PARSER.divide(symbol, core.PARSER.parse(symbol.value+'^'+minpower));
                }
                var variable = keys(symbol.symbols).sort().pop(), 
                    sym = symbol.group === core.groups.PL ? symbol.symbols : symbol.symbols[variable], 
                    g = sym.group,
                    powers = g === S ? [sym.power.toDecimal()] : keys(sym.symbols),
                    rarr = [],
                    max = core.Utils.arrayMax(powers); //maximum power and degree of polynomial to be solved

                // Prepare the data
                for(var i=1; i<=max; i++) { 
                    var c = 0; //if there is no power then the hole must be filled with a zero
                    if(powers.indexOf(i+'') !== -1) { 
                        if(g === S) { 
                            c = sym.multiplier; 
                        }
                        else {
                            c = sym.symbols[i].multiplier;
                        }
                    }
                    // Insert the coeffient but from the front
                    rarr.unshift(c);
                }

                rarr.push(symbol.symbols['#'].multiplier);

                if(sym.group === S) rarr[0] = sym.multiplier;//the symbol maybe of group CP with one variable

                return get_roots(rarr, powers, max);
            }
            else if(core.Utils.isArray(symbol)) {
                var parr = symbol;
                var rarr = [],
                    powers = [],
                    last_power = 0;
                for(var i=0; i<parr.length; i++) {
                    
                    var coeff = parr[i][0],
                        pow = parr[i][1],
                        d = pow - last_power - 1;
                    //insert the zeros
                    for(var j=0; j<d; j++) rarr.unshift(0);
                    
                    rarr.unshift(coeff);
                    if(pow !== 0) powers.push(pow);
                    last_power = pow;
                }
                var max = Math.max.apply(undefined, powers);

                return get_roots(rarr, powers, max);
            }
            else {
                throw new Error('Cannot calculate roots. Symbol must be a polynomial!');
            }

            function calcroots(rarr, powers, max){	
                var MAXDEGREE = 100; // Degree of largest polynomial accepted by this script.

                // Make a clone of the coefficients before appending the max power
                var p = rarr.slice(0);

                // Divide the string up into its individual entries, which--presumably--are separated by whitespace
                rarr.unshift(max);

                if (max > MAXDEGREE){
                    throw new Error("This utility accepts polynomials of degree up to " + MAXDEGREE + ". ");
                }

                var zeroi = [],   // Vector of imaginary components of roots
                    degreePar = {};    // degreePar is a dummy variable for passing the parameter POLYDEGREE by reference
                degreePar.Degree = max; 

                for (i = 0; i < max; i++) {
                    zeroi.push(0);
                }
                var zeror = zeroi.slice(0); // Vector of real components of roots

                // Find the roots
                //--> Begin Jenkins-Traub

                /*
                 * A verbatim copy of Mr. David Binner's Jenkins-Traub port
                */
               function QuadSD_ak1(NN, u, v, p, q, iPar){
                   // Divides p by the quadratic 1, u, v placing the quotient in q and the remainder in a, b
                   // iPar is a dummy variable for passing in the two parameters--a and b--by reference
                   q[0] = iPar.b = p[0];
                   q[1] = iPar.a = -(u*iPar.b) + p[1];

                   for (var i = 2; i < NN; i++){
                       q[i] = -(u*iPar.a + v*iPar.b) + p[i];
                       iPar.b = iPar.a;
                       iPar.a = q[i];
                   } 
                   return;
               } 

               function calcSC_ak1(DBL_EPSILON, N, a, b, iPar, K, u, v, qk){
                   // This routine calculates scalar quantities used to compute the next K polynomial and
                   // new estimates of the quadratic coefficients.
                   // calcSC -	integer variable set here indicating how the calculations are normalized
                   // to avoid overflow.
                   // iPar is a dummy variable for passing in the nine parameters--a1, a3, a7, c, d, e, f, g, and h --by reference

                   // sdPar is a dummy variable for passing the two parameters--c and d--into QuadSD_ak1 by reference
                   var sdPar = new Object(),    
                   // TYPE = 3 indicates the quadratic is almost a factor of K
                       dumFlag = 3;	

                   // Synthetic division of K by the quadratic 1, u, v
                   sdPar.b =  sdPar.a = 0.0;
                   QuadSD_ak1(N, u, v, K, qk, sdPar);
                   iPar.c = sdPar.a;
                   iPar.d = sdPar.b;

                   if (Math.abs(iPar.c) <= (100.0*DBL_EPSILON*Math.abs(K[N - 1]))) {
                       if (Math.abs(iPar.d) <= (100.0*DBL_EPSILON*Math.abs(K[N - 2])))  return dumFlag;
                   } 

                   iPar.h = v*b;
                   if (Math.abs(iPar.d) >= Math.abs(iPar.c)){
                         // TYPE = 2 indicates that all formulas are divided by d
                       dumFlag = 2;		
                       iPar.e = a/(iPar.d);
                       iPar.f = (iPar.c)/(iPar.d);
                       iPar.g = u*b;
                       iPar.a3 = (iPar.e)*((iPar.g) + a) + (iPar.h)*(b/(iPar.d));
                       iPar.a1 = -a + (iPar.f)*b;
                       iPar.a7 = (iPar.h) + ((iPar.f) + u)*a;
                   } 
                   else {
                       // TYPE = 1 indicates that all formulas are divided by c;
                       dumFlag = 1;		
                       iPar.e = a/(iPar.c);
                       iPar.f = (iPar.d)/(iPar.c);
                       iPar.g = (iPar.e)*u;
                       iPar.a3 = (iPar.e)*a + ((iPar.g) + (iPar.h)/(iPar.c))*b;
                       iPar.a1 = -(a*((iPar.d)/(iPar.c))) + b;
                       iPar.a7 = (iPar.g)*(iPar.d) + (iPar.h)*(iPar.f) + a;
                   } 
                   return dumFlag;
               } 

               function nextK_ak1(DBL_EPSILON, N, tFlag, a, b, iPar, K, qk, qp){
                   // Computes the next K polynomials using the scalars computed in calcSC_ak1
                   // iPar is a dummy variable for passing in three parameters--a1, a3, and a7
                   var temp;
                   if (tFlag == 3){	// Use unscaled form of the recurrence
                       K[1] = K[0] = 0.0;
                       for (var i = 2; i < N; i++)	 { K[i] = qk[i - 2]; }
                       return;
                   } 

                   temp = ((tFlag == 1) ? b : a);
                   if (Math.abs(iPar.a1) > (10.0*DBL_EPSILON*Math.abs(temp))){
                       // Use scaled form of the recurrence
                       iPar.a7 /= iPar.a1;
                       iPar.a3 /= iPar.a1;
                       K[0] = qp[0];
                       K[1] = -(qp[0]*iPar.a7) + qp[1];
                       for (var i = 2; i < N; i++)	 K[i] = -(qp[i - 1]*iPar.a7) + qk[i - 2]*iPar.a3 + qp[i];
                   } 
                   else {
                       // If a1 is nearly zero, then use a special form of the recurrence
                       K[0] = 0.0;
                       K[1] = -(qp[0]*iPar.a7);
                       for (var i = 2; i < N; i++) { K[i] = -(qp[i - 1]*iPar.a7) + qk[i - 2]*iPar.a3; }
                   } 
                   return;
               }

               function newest_ak1(tFlag, iPar, a, a1, a3, a7, b, c, d, f, g, h, u, v, K, N, p){
                   // Compute new estimates of the quadratic coefficients using the scalars computed in calcSC_ak1
                   // iPar is a dummy variable for passing in the two parameters--uu and vv--by reference
                   // iPar.a = uu, iPar.b = vv

                   var a4, a5, b1, b2, c1, c2, c3, c4, temp;
                   iPar.b = iPar.a = 0.0;// The quadratic is zeroed

                   if (tFlag != 3){
                       if (tFlag != 2){
                           a4 = a + u*b + h*f;
                           a5 = c + (u + v*f)*d;
                       } 
                       else { 
                           a4 = (a + g)*f + h;
                           a5 = (f + u)*c + v*d;
                       } 

                       // Evaluate new quadratic coefficients
                       b1 = -(K[N - 1]/p[N]);
                       b2 = -(K[N - 2] + b1*p[N - 1])/p[N];
                       c1 = v*b2*a1;
                       c2 = b1*a7;
                       c3 = b1*b1*a3;
                       c4 = -(c2 + c3) + c1;
                       temp = -c4 + a5 + b1*a4;
                       if (temp != 0.0) {
                           iPar.a = -((u*(c3 + c2) + v*(b1*a1 + b2*a7))/temp) + u;
                           iPar.b = v*(1.0 + c4/temp);
                       } 
                   } 
                   return;
               } 

               function Quad_ak1(a, b1, c, iPar){
                   // Calculates the zeros of the quadratic a*Z^2 + b1*Z + c
                   // The quadratic formula, modified to avoid overflow, is used to find the larger zero if the
                   // zeros are real and both zeros are complex. The smaller real zero is found directly from
                   // the product of the zeros c/a.

                   // iPar is a dummy variable for passing in the four parameters--sr, si, lr, and li--by reference

                   var b, d, e;
                   iPar.sr = iPar.si = iPar.lr = iPar.li = 0.0;

                   if (a == 0) {
                       iPar.sr = ((b1 != 0) ? -(c/b1) : iPar.sr);
                       return;
                   } 
                   if (c == 0){
                       iPar.lr = -(b1/a);
                       return;
                   } 

                   // Compute discriminant avoiding overflow
                   b = b1/2.0;
                   if (Math.abs(b) < Math.abs(c)){
                       e = ((c >= 0) ? a : -a);
                       e = -e + b*(b/Math.abs(c));
                       d = Math.sqrt(Math.abs(e))*Math.sqrt(Math.abs(c));
                   } 
                   else { 
                       e = -((a/b)*(c/b)) + 1.0;
                       d = Math.sqrt(Math.abs(e))*(Math.abs(b));
                   } 

                   if (e >= 0) {
                       // Real zeros
                       d = ((b >= 0) ? -d : d);
                       iPar.lr = (-b + d)/a;
                       iPar.sr = ((iPar.lr != 0) ? (c/(iPar.lr))/a : iPar.sr);
                   }
                   else { 
                       // Complex conjugate zeros
                       iPar.lr = iPar.sr = -(b/a);
                       iPar.si = Math.abs(d/a);
                       iPar.li = -(iPar.si);
                   } 
                   return;
               }  

               function QuadIT_ak1(DBL_EPSILON, N, iPar, uu, vv, qp, NN, sdPar, p, qk, calcPar, K){
                   // Variable-shift K-polynomial iteration for a quadratic factor converges only if the
                   // zeros are equimodular or nearly so.
                   // iPar is a dummy variable for passing in the five parameters--NZ, lzi, lzr, szi, and szr--by reference
                   // sdPar is a dummy variable for passing the two parameters--a and b--in by reference
                   // calcPar is a dummy variable for passing the nine parameters--a1, a3, a7, c, d, e, f, g, and h --in by reference

                   // qPar is a dummy variable for passing the four parameters--szr, szi, lzr, and lzi--into Quad_ak1 by reference
                   var qPar = new Object(),    
                       ee, mp, omp, relstp, t, u, ui, v, vi, zm,
                       i, j = 0, tFlag, triedFlag = 0;   // Integer variables

                   iPar.NZ = 0;// Number of zeros found
                   u = uu; // uu and vv are coefficients of the starting quadratic
                   v = vv;

                   do {
                       qPar.li = qPar.lr =  qPar.si = qPar.sr = 0.0;
                       Quad_ak1(1.0, u, v, qPar);
                       iPar.szr = qPar.sr;
                       iPar.szi = qPar.si;
                       iPar.lzr = qPar.lr;
                       iPar.lzi = qPar.li;

                       // Return if roots of the quadratic are real and not close to multiple or nearly
                       // equal and of opposite sign.
                       if (Math.abs(Math.abs(iPar.szr) - Math.abs(iPar.lzr)) > 0.01*Math.abs(iPar.lzr))  break;

                       // Evaluate polynomial by quadratic synthetic division

                       QuadSD_ak1(NN, u, v, p, qp, sdPar);

                       mp = Math.abs(-((iPar.szr)*(sdPar.b)) + (sdPar.a)) + Math.abs((iPar.szi)*(sdPar.b));

                       // Compute a rigorous bound on the rounding error in evaluating p

                       zm = Math.sqrt(Math.abs(v));
                       ee = 2.0*Math.abs(qp[0]);
                       t = -((iPar.szr)*(sdPar.b));

                       for (i = 1; i < N; i++)  { ee = ee*zm + Math.abs(qp[i]); }

                       ee = ee*zm + Math.abs(t + sdPar.a);
                       ee = (9.0*ee + 2.0*Math.abs(t) - 7.0*(Math.abs((sdPar.a) + t) + zm*Math.abs((sdPar.b))))*DBL_EPSILON;

                       // Iteration has converged sufficiently if the polynomial value is less than 20 times this bound
                       if (mp <= 20.0*ee){
                           iPar.NZ = 2;
                           break;
                       } 

                       j++;
                       // Stop iteration after 20 steps
                       if (j > 20)  break;
                       if (j >= 2){
                           if ((relstp <= 0.01) && (mp >= omp) && (!triedFlag)){
                               // A cluster appears to be stalling the convergence. Five fixed shift
                               // steps are taken with a u, v close to the cluster.
                               relstp = ((relstp < DBL_EPSILON) ? Math.sqrt(DBL_EPSILON) : Math.sqrt(relstp));
                               u -= u*relstp;
                               v += v*relstp;

                               QuadSD_ak1(NN, u, v, p, qp, sdPar);
                               for (i = 0; i < 5; i++){
                                   tFlag = calcSC_ak1(DBL_EPSILON, N, sdPar.a, sdPar.b, calcPar, K, u, v, qk);
                                   nextK_ak1(DBL_EPSILON, N, tFlag, sdPar.a, sdPar.b, calcPar, K, qk, qp);
                               } 

                               triedFlag = 1;
                               j = 0;

                           } 
                       }
                       omp = mp;

                       // Calculate next K polynomial and new u and v
                       tFlag = calcSC_ak1(DBL_EPSILON, N, sdPar.a, sdPar.b, calcPar, K, u, v, qk);
                       nextK_ak1(DBL_EPSILON, N, tFlag, sdPar.a, sdPar.b, calcPar, K, qk, qp);
                       tFlag = calcSC_ak1(DBL_EPSILON, N, sdPar.a, sdPar.b, calcPar, K, u, v, qk);
                       newest_ak1(tFlag, sdPar, sdPar.a, calcPar.a1, calcPar.a3, calcPar.a7, sdPar.b, calcPar.c, calcPar.d, calcPar.f, calcPar.g, calcPar.h, u, v, K, N, p);
                       ui = sdPar.a;
                       vi = sdPar.b;

                       // If vi is zero, the iteration is not converging
                       if (vi != 0){
                           relstp = Math.abs((-v + vi)/vi);
                           u = ui;
                           v = vi;
                       } 
                   } while (vi != 0); 
                   return;
               } 

               function RealIT_ak1(DBL_EPSILON, iPar, sdPar, N, p, NN, qp, K, qk){
                   // Variable-shift H-polynomial iteration for a real zero
                   // sss	- starting iterate = sdPar.a
                   // NZ		- number of zeros found = iPar.NZ
                   // dumFlag	- flag to indicate a pair of zeros near real axis, returned to iFlag

                   var ee, kv, mp, ms, omp, pv, s, t,
                       dumFlag, i, j, nm1 = N - 1;   // Integer variables

                   iPar.NZ = j = dumFlag = 0;
                   s = sdPar.a;

                   for ( ; ; ) {
                       pv = p[0];

                       // Evaluate p at s
                       qp[0] = pv;
                       for (i = 1; i < NN; i++)  { qp[i] = pv = pv*s + p[i]; }
                       mp = Math.abs(pv);

                       // Compute a rigorous bound on the error in evaluating p
                       ms = Math.abs(s);
                       ee = 0.5*Math.abs(qp[0]);
                       for (i = 1; i < NN; i++)  { ee = ee*ms + Math.abs(qp[i]); }

                       // Iteration has converged sufficiently if the polynomial value is less than
                       // 20 times this bound
                       if (mp <= 20.0*DBL_EPSILON*(2.0*ee - mp)){
                           iPar.NZ = 1;
                           iPar.szr = s;
                           iPar.szi = 0.0;
                           break;
                       } 
                       j++;
                       // Stop iteration after 10 steps
                       if (j > 10)  break;

                       if (j >= 2){
                           if ((Math.abs(t) <= 0.001*Math.abs(-t + s)) && (mp > omp)){
                               // A cluster of zeros near the real axis has been encountered.
                               // Return with iFlag set to initiate a quadratic iteration.
                               dumFlag = 1;
                               iPar.a = s;
                               break;
                           } // End if ((fabs(t) <= 0.001*fabs(s - t)) && (mp > omp))
                       } //End if (j >= 2)

                       // Return if the polynomial value has increased significantly
                       omp = mp;

                       // Compute t, the next polynomial and the new iterate
                       qk[0] = kv = K[0];
                       for (i = 1; i < N; i++)	 { qk[i] = kv = kv*s + K[i]; }

                       if (Math.abs(kv) > Math.abs(K[nm1])*10.0*DBL_EPSILON){
                           // Use the scaled form of the recurrence if the value of K at s is non-zero
                           t = -(pv/kv);
                           K[0] = qp[0];
                           for (i = 1; i < N; i++) { K[i] = t*qk[i - 1] + qp[i]; }
                       }
                       else { 
                           // Use unscaled form
                           K[0] = 0.0;
                           for (i = 1; i < N; i++)	 K[i] = qk[i - 1];
                       }

                       kv = K[0];
                       for (i = 1; i < N; i++) { kv = kv*s + K[i]; }
                       t = ((Math.abs(kv) > (Math.abs(K[nm1])*10.0*DBL_EPSILON)) ? -(pv/kv) : 0.0);
                       s += t;
                   } 
                   return dumFlag;
               } 

               function Fxshfr_ak1(DBL_EPSILON, MDP1, L2, sr, v, K, N, p, NN, qp, u, iPar){

                   // Computes up to L2 fixed shift K-polynomials, testing for convergence in the linear or
                   // quadratic case. Initiates one of the variable shift iterations and returns with the
                   // number of zeros found.
                   // L2	limit of fixed shift steps
                   // iPar is a dummy variable for passing in the five parameters--NZ, lzi, lzr, szi, and szr--by reference
                   // NZ	number of zeros found
                   var sdPar = new Object(),    // sdPar is a dummy variable for passing the two parameters--a and b--into QuadSD_ak1 by reference
                       calcPar = new Object(),
                       // calcPar is a dummy variable for passing the nine parameters--a1, a3, a7, c, d, e, f, g, and h --into calcSC_ak1 by reference

                       qk = new Array(MDP1),
                       svk = new Array(MDP1),
                       a, b, betas, betav, oss, ots, otv, ovv, s, ss, ts, tss, tv, tvv, ui, vi, vv,
                       fflag, i, iFlag = 1, j, spass, stry, tFlag, vpass, vtry;     // Integer variables

                   iPar.NZ = 0;
                   betav = betas = 0.25;
                   oss = sr;
                   ovv = v;

                   //Evaluate polynomial by synthetic division
                   sdPar.b =  sdPar.a = 0.0;
                   QuadSD_ak1(NN, u, v, p, qp, sdPar);
                   a = sdPar.a;
                   b = sdPar.b;
                   calcPar.h = calcPar.g = calcPar.f = calcPar.e = calcPar.d = calcPar.c = calcPar.a7 = calcPar.a3 = calcPar.a1 = 0.0;
                   tFlag = calcSC_ak1(DBL_EPSILON, N, a, b, calcPar, K, u, v, qk);

                   for (j = 0; j < L2; j++){
                       fflag = 1;

                       // Calculate next K polynomial and estimate v
                       nextK_ak1(DBL_EPSILON, N, tFlag, a, b, calcPar, K, qk, qp);
                       tFlag = calcSC_ak1(DBL_EPSILON, N, a, b, calcPar, K, u, v, qk);

                       // Use sdPar for passing in uu and vv instead of defining a brand-new variable.
                       // sdPar.a = ui, sdPar.b = vi
                       newest_ak1(tFlag, sdPar, a, calcPar.a1, calcPar.a3, calcPar.a7, b, calcPar.c, calcPar.d, calcPar.f, calcPar.g, calcPar.h, u, v, K, N, p);
                       ui = sdPar.a;
                       vv = vi = sdPar.b;

                       // Estimate s
                       ss = ((K[N - 1] != 0.0) ? -(p[N]/K[N - 1]) : 0.0);
                       ts = tv = 1.0;

                       if ((j != 0) && (tFlag != 3)){
                           // Compute relative measures of convergence of s and v sequences
                           tv = ((vv != 0.0) ? Math.abs((vv - ovv)/vv) : tv);
                           ts = ((ss != 0.0) ? Math.abs((ss - oss)/ss) : ts);

                           // If decreasing, multiply the two most recent convergence measures
                           tvv = ((tv < otv) ? tv*otv : 1.0);
                           tss = ((ts < ots) ? ts*ots : 1.0);

                           // Compare with convergence criteria
                           vpass = ((tvv < betav) ? 1 : 0);
                           spass = ((tss < betas) ? 1 : 0);

                           if ((spass) || (vpass)){

                               // At least one sequence has passed the convergence test.
                               // Store variables before iterating

                               for (i = 0; i < N; i++) { svk[i] = K[i]; }
                               s = ss;

                               // Choose iteration according to the fastest converging sequence

                                 stry = vtry = 0;

                               for ( ; ; ) {
                                   if ((fflag && ((fflag = 0) == 0)) && ((spass) && (!vpass || (tss < tvv)))){
                                       ;// Do nothing. Provides a quick "short circuit".
                                   } 
                                   else { 
                                       QuadIT_ak1(DBL_EPSILON, N, iPar, ui, vi, qp, NN, sdPar, p, qk, calcPar, K);
                                       a = sdPar.a;
                                       b = sdPar.b;

                                       if ((iPar.NZ) > 0) return;

                                       // Quadratic iteration has failed. Flag that it has been tried and decrease the
                                       // convergence criterion
                                       iFlag = vtry = 1;
                                       betav *= 0.25;

                                       // Try linear iteration if it has not been tried and the s sequence is converging
                                       if (stry || (!spass)){
                                           iFlag = 0;
                                       }
                                       else {
                                           for (i = 0; i < N; i++) K[i] = svk[i];
                                       } 
                                   }
                                   //fflag = 0;
                                   if (iFlag != 0){
                                       // Use sdPar for passing in s instead of defining a brand-new variable.
                                       // sdPar.a = s
                                       sdPar.a = s;
                                       iFlag = RealIT_ak1(DBL_EPSILON, iPar, sdPar, N, p, NN, qp, K, qk);
                                       s = sdPar.a;

                                       if ((iPar.NZ) > 0) return;

                                       // Linear iteration has failed. Flag that it has been tried and decrease the
                                       // convergence criterion
                                       stry = 1;
                                       betas *= 0.25;

                                       if (iFlag != 0){
                                           // If linear iteration signals an almost double real zero, attempt quadratic iteration
                                           ui = -(s + s);
                                           vi = s*s;
                                           continue;

                                       } 
                                   } 

                                   // Restore variables
                                   for (i = 0; i < N; i++) K[i] = svk[i];

                                   // Try quadratic iteration if it has not been tried and the v sequence is converging
                                   if (!vpass || vtry) break;		// Break out of infinite for loop

                               } 

                               // Re-compute qp and scalar values to continue the second stage

                               QuadSD_ak1(NN, u, v, p, qp, sdPar);
                               a = sdPar.a;
                               b = sdPar.b;

                               tFlag = calcSC_ak1(DBL_EPSILON, N, a, b, calcPar, K, u, v, qk);
                           } 
                       } 
                       ovv = vv;
                       oss = ss;
                       otv = tv;
                       ots = ts;
                   } 
                   return;
               }  

               function rpSolve(degPar, p, zeror, zeroi){ 
                   var N = degPar.Degree,
                       RADFAC = 3.14159265358979323846/180,  // Degrees-to-radians conversion factor = PI/180
                       LB2 = Math.LN2,// Dummy variable to avoid re-calculating this value in loop below
                       MDP1 = degPar.Degree + 1,
                       K = new Array(MDP1),
                       pt = new Array(MDP1),
                       qp = new Array(MDP1),
                       temp = new Array(MDP1),
                       // qPar is a dummy variable for passing the four parameters--sr, si, lr, and li--by reference
                       qPar = new Object(),
                       // Fxshfr_Par is a dummy variable for passing parameters by reference : NZ, lzi, lzr, szi, szr);
                       Fxshfr_Par = new Object(),
                       bnd, DBL_EPSILON, df, dx, factor, ff, moduli_max, moduli_min, sc, x, xm,
                       aa, bb, cc, sr, t, u, xxx,
                       j, jj, l, NM1, NN, zerok;// Integer variables

                   // Calculate the machine epsilon and store in the variable DBL_EPSILON.
                   // To calculate this value, just use existing variables rather than create new ones that will be used only for this code block
                   aa = 1.0;
                   do {
                       DBL_EPSILON = aa;
                       aa /= 2;
                       bb = 1.0 + aa;
                   } while (bb > 1.0);

                   var LO = Number.MIN_VALUE/DBL_EPSILON,
                       cosr = Math.cos(94.0*RADFAC),// = -0.069756474
                       sinr = Math.sin(94.0*RADFAC),// = 0.99756405
                       xx = Math.sqrt(0.5),// = 0.70710678
                       yy = -xx;

                   Fxshfr_Par.NZ = j = 0;
                   Fxshfr_Par.szr = Fxshfr_Par.szi =  Fxshfr_Par.lzr = Fxshfr_Par.lzi = 0.0;

                   // Remove zeros at the origin, if any
                   while (p[N] == 0){
                       zeror[j] = zeroi[j] = 0;
                       N--;
                       j++;
                   }
                   NN = N + 1;

                   // >>>>> Begin Main Loop <<<<<
                   while (N >= 1){ // Main loop
                       // Start the algorithm for one zero
                       if (N <= 2){
                           // Calculate the final zero or pair of zeros
                           if (N < 2){
                               zeror[degPar.Degree - 1] = -(p[1]/p[0]);
                               zeroi[degPar.Degree - 1] = 0;
                           } 
                           else { 
                               qPar.li = qPar.lr =  qPar.si = qPar.sr = 0.0;
                               Quad_ak1(p[0], p[1], p[2], qPar);
                               zeror[degPar.Degree - 2] = qPar.sr;
                               zeroi[degPar.Degree - 2] = qPar.si;
                               zeror[degPar.Degree - 1] = qPar.lr;
                               zeroi[degPar.Degree - 1] = qPar.li;
                           } 
                             break;
                       } 

                       // Find the largest and smallest moduli of the coefficients
                       moduli_max = 0.0;
                       moduli_min = Number.MAX_VALUE;

                       for (i = 0; i < NN; i++){
                           x = Math.abs(p[i]);
                           if (x > moduli_max) moduli_max = x;
                           if ((x != 0) && (x < moduli_min)) moduli_min = x;
                       }

                       // Scale if there are large or very small coefficients
                       // Computes a scale factor to multiply the coefficients of the polynomial. The scaling
                       // is done to avoid overflow and to avoid undetected underflow interfering with the
                       // convergence criterion.
                       // The factor is a power of the base.
                       sc = LO/moduli_min;

                       if (((sc <= 1.0) && (moduli_max >= 10)) || ((sc > 1.0) && (Number.MAX_VALUE/sc >= moduli_max))){
                           sc = ((sc == 0) ? Number.MIN_VALUE : sc);
                           l = Math.floor(Math.log(sc)/LB2 + 0.5);
                           factor = Math.pow(2.0, l);
                           if (factor != 1.0){
                               for (i = 0; i < NN; i++) p[i] *= factor;
                           } 
                       } 

                       // Compute lower bound on moduli of zeros
                       for (var i = 0; i < NN; i++) pt[i] = Math.abs(p[i]);
                       pt[N] = -(pt[N]);
                       NM1 = N - 1;

                       // Compute upper estimate of bound
                       x = Math.exp((Math.log(-pt[N]) - Math.log(pt[0]))/N);

                       if (pt[NM1] != 0) {
                           // If Newton step at the origin is better, use it
                           xm = -pt[N]/pt[NM1];
                           x = ((xm < x) ? xm : x);
                       } 

                       // Chop the interval (0, x) until ff <= 0
                       xm = x;
                       do {
                           x = xm;
                           xm = 0.1*x;
                           ff = pt[0];
                           for (var i = 1; i < NN; i++) { ff = ff *xm + pt[i]; }
                       } while (ff > 0); // End do-while loop

                       dx = x;
                       // Do Newton iteration until x converges to two decimal places

                       do {
                           df = ff = pt[0];
                           for (var i = 1; i < N; i++){
                               ff = x*ff + pt[i];
                               df = x*df + ff;
                           } // End for i
                           ff = x*ff + pt[N];
                           dx = ff/df;
                           x -= dx;
                       } while (Math.abs(dx/x) > 0.005); // End do-while loop

                       bnd = x;

                       // Compute the derivative as the initial K polynomial and do 5 steps with no shift
                       for (var i = 1; i < N; i++) K[i] = (N - i)*p[i]/N;
                       K[0] = p[0];
                       aa = p[N];
                       bb = p[NM1];
                       zerok = ((K[NM1] == 0) ? 1 : 0);

                       for (jj = 0; jj < 5; jj++) {
                           cc = K[NM1];
                               if (zerok){
                                   // Use unscaled form of recurrence
                                   for (var i = 0; i < NM1; i++){
                                       j = NM1 - i;
                                       K[j] = K[j - 1];
                                   } // End for i
                                   K[0] = 0;
                                   zerok = ((K[NM1] == 0) ? 1 : 0);
                               } 
                               else { 
                                   // Used scaled form of recurrence if value of K at 0 is nonzero
                                   t = -aa/cc;
                                   for (var i = 0; i < NM1; i++){
                                       j = NM1 - i;
                                       K[j] = t*K[j - 1] + p[j];
                                   } // End for i
                                   K[0] = p[0];
                                   zerok = ((Math.abs(K[NM1]) <= Math.abs(bb)*DBL_EPSILON*10.0) ? 1 : 0);
                               } 
                       } 

                       // Save K for restarts with new shifts
                       for (var i = 0; i < N; i++) temp[i] = K[i];

                       // Loop to select the quadratic corresponding to each new shift
                       for (jj = 1; jj <= 20; jj++){

                           // Quadratic corresponds to a double shift to a non-real point and its
                           // complex conjugate. The point has modulus BND and amplitude rotated
                           // by 94 degrees from the previous shift.

                           xxx = -(sinr*yy) + cosr*xx;
                           yy = sinr*xx + cosr*yy;
                           xx = xxx;
                           sr = bnd*xx;
                           u = -(2.0*sr);

                           // Second stage calculation, fixed quadratic
                           Fxshfr_ak1(DBL_EPSILON, MDP1, 20*jj, sr, bnd, K, N, p, NN, qp, u, Fxshfr_Par);

                           if (Fxshfr_Par.NZ != 0){
                               // The second stage jumps directly to one of the third stage iterations and
                               // returns here if successful. Deflate the polynomial, store the zero or
                               // zeros, and return to the main algorithm.
                               j = degPar.Degree - N;
                               zeror[j] = Fxshfr_Par.szr;
                               zeroi[j] = Fxshfr_Par.szi;
                               NN = NN - Fxshfr_Par.NZ;
                               N = NN - 1;
                               for (var i = 0; i < NN; i++) p[i] = qp[i];
                               if (Fxshfr_Par.NZ != 1){
                                   zeror[j + 1] = Fxshfr_Par.lzr;
                                   zeroi[j + 1] = Fxshfr_Par.lzi;
                               }
                               break;
                           } 
                           else { 
                             // If the iteration is unsuccessful, another quadratic is chosen after restoring K
                             for (var i = 0; i < N; i++) { K[i] = temp[i]; }
                           } 
                       } 
                       // Return with failure if no convergence with 20 shifts
                       if (jj > 20) {
                           degPar.Degree -= N;
                           break;
                       } 
                   }
                   // >>>>> End Main Loop <<<<<
                   return;
               }
                //--> End Jenkins-Traub
                rpSolve(degreePar, p, zeror, zeroi);

                var l = zeroi.length;
                //format the output
                for( i=0; i<l; i++ ) {
                    // We round the imaginary part to avoid having something crazy like 5.67e-16.
                    var img = round( zeroi[i], decp+8 ),
                        real = round( zeror[i], decp );
                    // Did the rounding pay off? If the rounding did nothing more than chop off a few digits then no.
                    // If the rounding results in a a number at least 3 digits shorter we'll keep it else we'll keep 
                    // the original otherwise the rounding was worth it.
                    real = decp - String( real ).length > 2 ? real : zeror[i];
                    var sign = img < 0 ? '-' : '';

                    // Remove the zeroes
                    if( real === 0 ) { real = ''; }
                    if( img === 0 ) { img = ''; }

                    // Remove 1 as the multiplier and discard imaginary part if there isn't one.
                    img = Math.abs( img ) === 1 ? sign+'i' : ( img ? img+'*i' : '' );

                    var num = ( real && img ) ? real + '+' + img : real+img;
                    zeror[i] = num.replace(/\+\-/g, '-');
                }
                return zeror;
            } 
         },
        froot: function(f, guess, dx) { 
            var newtonraph = function(xn) {
                var mesh = 1e-12,
                    // If the derivative was already provided then don't recalculate.
                    df = dx ? dx : core.Utils.build(core.Calculus.diff(f.clone())),
                    
                    // If the function was passed in as a function then don't recalculate.
                    fn = f instanceof Function ? f : core.Utils.build(f),
                    max = 10000,
                    done = false, 
                    safety = 0;
                while( !done ) { 
                    var x = xn-(fn(xn)/df(xn));
                    //absolute values for both x & xn ensures that we indeed have the radius    
                    var r = Math.abs(x) - Math.abs(xn),
                        delta = Math.abs(r);
                    xn = x; 

                    if( delta < mesh ) done = true;
                    else if( safety > max ) {
                        xn = null;
                        done = true;
                    }
                    
                    safety++;
                }
                return xn;
            };
            return newtonraph( Number( guess ) );
        },
        /**
         * Standard square free factorization 
         * @param {Polynomial} a
         * @returns {Array}
         */
        sqfr: function(a) { 
            if(!core.Calculus) throw new Error('sqfr requires Calculus to be loaded!');
            var vars = variables(a); 
            var i = 1;
            var b = core.Calculus.diff(a, vars[0]); 
            var c = __.gcd(a, b);
            var w = __.div(a, c)[0],
                output = new Symbol(1);
            while(!c.equals(1)) { 
                var y = __.gcd(w, c); 
                var z = __.div(w, y)[0]; 
                
                output = _.multiply(output, z); 
                i++;
                w = y;
                c = __.div(c, y)[0];
            }
            return [output, w, i];
        },
        quad: function(a, b, c) {
            var q = function(a, b, c, sign) {
                return _.parse('-('+b+'+'+sign+'*sqrt(('+b+')^2-4*('+a+')*('+c+')))/(2*'+a+')');
            };
            return [q(a, b, c, 1), q(a, b, c, -1)];
        },
        sumProd: function(a, b) {
            return __.quad(-b, a, -1).map(function(x){
                return x.invert(); 
            });
        },
        /**
         * Get's all the powers of a particular polynomial including the denominators. The denominators powers
         * are returned as negative. All remaining polynomials are returned as zero order polynomials.
         * for example polyPowers(x^2+1/x+y+t) will return [ '-1', 0, '2' ]
         * @param {Symbol} e
         * @param {String} for_variable
         * @param {Array} powers
         * @returns {Array} An array of the powers
         */
        //assumes you've already verified that it's a polynomial
        polyPowers: function(e, for_variable, powers) { 
            powers = powers || [];
            var g = g = e.group; 
            if(g ===  PL && for_variable === e.value) {
                powers = powers.concat(keys(e.symbols)); 
            }
            else if(g === CP) { 
                for(var s in e.symbols) {
                    var symbol = e.symbols[s]; 
                    var g = symbol.group, v = symbol.value; 
                    if(g === S && for_variable === v) powers.push(symbol.power);
                    else if(g === PL || g === CP) powers = __.polyPowers(symbol, for_variable, powers);
                    else if(g === CB && symbol.contains(for_variable)) {
                        var t = symbol.symbols[for_variable];
                        if(t) powers.push((t.power));
                    }
                    else if(g === N || for_variable !== v) powers.push(0);
                }
            }
            return core.Utils.arrayUnique(powers).sort();
        },
        /**
         * http://www.ams.org/journals/mcom/1978-32-144/S0025-5718-1978-0568284-3/S0025-5718-1978-0568284-3.pdf
         * Splits symbol into factors
         * @param {Symbol} symbol
         * @returns {Symbol}
         */
        factor: function(symbol) {
            var retval = symbol,
                group = symbol.group,
                isCompositionGroup = function(group) {
                    return (group === PL || group === CP);
                };
            if(isCompositionGroup(group)) {
                //distribute the multiplier in sub-symbols
                for(var x in symbol.symbols) symbol.symbols[x].distributeMultiplier(); 
                //factor the multiplier
                var gcf = core.Math2.GCD.apply(undefined, symbol.coeffs()),
                       
                    factorize = function(symbol) { 
                        for(var x in symbol.symbols) {
                            var sub = symbol.symbols[x]; 
                            if(isCompositionGroup(sub.group)) {
                                factorize(sub);
                            }
                            else {
                                sub.multiplier /= gcf;
                            }
                        }
                    };
                
                if(symbol.power <= 1) {
                    factorize(symbol);
                    symbol.multiplier *= Math.pow(gcf, symbol.power);

                    if(group === PL) {
                        var powers = keys(symbol.symbols),
                            lowest_power = core.Utils.arrayMin(powers),
                            factor = _.parse(symbol.value+'^'+lowest_power);
                        var factored = new core.Symbol(0);
                        for(var x in symbol.symbols) {
                            factored = _.add(factored, _.divide(symbol.symbols[x], factor.clone()));
                        }

                        factored = _.symfunction(core.PARENTHESIS, [factored]);//place it parenthesis
                        factored.power *= symbol.power;
                        factored.multiplier *= symbol.multiplier;
                        factor.power *= symbol.power;

                        retval = _.multiply(factor, factored);
                    }
                    else if(group === CP) { 
                        try{
                            var p = symbol.power,
                                roots = core.Algebra.proots(symbol),
                                all_ints = true; 
                            for(var i=0; i<roots.length; i++) {
                                if(!isInt(roots[i])) all_ints = false;
                            }
                            var result = new Symbol(1);
                            if(all_ints)  { 
                                roots.map(function(root) { 
                                    result = _.multiply(result, 
                                        _.symfunction(core.PARENTHESIS, 
                                        [_.subtract(new Symbol(variables(symbol)[0]), new Symbol(root))]));
                                });
                                result.multiplier *= symbol.multiplier;
                                retval = result; 
                            }
                        }
                        catch(e) { 
                            try {
                                //not a polynomial. No biggie. Let's see if we can extract a few variables
                                var symbols = symbol.collectSymbols(),
                                    num_symbols = symbol.length,
                                    hash_table = {};
                                for(var i=0; i<num_symbols; i++) {
                                    var cur_symbol = symbols[i], //collect all the variables contained in the symbol
                                        num_vars = vars.length;
                                    for(var j=0; j<num_vars; j++) {
                                        var var_name = vars[j],
                                            variable = cur_symbol.value === var_name ? cur_symbol : cur_symbol.symbols[var_name],
                                            var_record = hash_table[var_name];
                                        if(isSymbol(variable.power)) throw new Error('Cannot factor symbol. Exiting');
                                        if(!var_record) hash_table[var_name] = [1, variable.power];
                                        else {
                                            var_record[0]++;
                                            var p = variable.power;
                                            if(p < var_record[1]) var_record[1] = p;
                                        }
                                    }
                                }
                                var factor = [];
                                //we now know which variables we have and to which power so we can start reducing
                                for(var x in hash_table) {
                                    var_record = hash_table[x];
                                    //if we have as many recorded as there were sub-symbols then we can divide all of them
                                    //by that symbol
                                    if(var_record[0] === num_symbols) { 
                                        factor.push(x+'^'+var_record[1]);
                                    }
                                };

                                //we can now divide each one by that factor
                                factor = _.parse(factor.join('*'));//make it a Symbol
                                for(x in symbol.symbols) {
                                    symbol.symbols[x] = _.divide(symbol.symbols[x], factor.clone());
                                }

                                retval = _.multiply(_.parse(symbol.text()), factor);
                            }
                            catch(e){;}
                        }
                    }
                }     
            }
            
            if(retval.group === core.groups.FN) retval.updateHash();
            
            return retval;
        },
        /**
         * Checks to see if a set of "equations" is linear. 
         * @param {type} set
         * @returns {Boolean}
         */
        allLinear: function(set) {
            var l = set.length;
            for(var i=0; i<l; i++) if(!__.isLinear(set[i])) return false;
            return true;
        },
        /*
         * Checks to see if the "equation" is linear
         * @param {Symbol} e
         * @returns {boolean}
         */
        isLinear: function(e) {
            var status = false, g = e.group;
            if(g === PL || g === CP) {
                status = true;
                for(var s in e.symbols) {
                    var symbol = e.symbols[s], sg = symbol.group;
                    if(sg === FN || sg === EX || sg === CB) { status = false;}
                    else {
                        if(sg === PL || sg === CP) status = __.isLinear(symbol);
                        else {
                            if(symbol.group !== N && symbol.power.toString() !== '1') { status = false; break; }
                        }
                    }
                }
            }
            else if(g === S && e.power === 1) status = true;
            return status;
        },
        gcd: function(a, b, abs) { 
            var vars_a = variables(a), vars_b = variables(b);
            if(vars_a.length === vars_b.length && vars_a.length === 1 && vars_a[0] === vars_b[0]) {
                a = new Polynomial(a); b = new Polynomial(b);
                return a.gcd(b).toSymbol();
            }
            else {
                var T;
                while(!b.equals(0)) {  
                    var t = b.clone(); 
                    a = a.clone(); 
                    T = __.div(a, t);
                    b = T[1]; 
                    if(T[0].equals(0)) {
                        return new Symbol(core.Math2.QGCD(a.multiplier, b.multiplier));
                    }
                    a = t; 
                }
                //get rid of gcd in coeffs
                var multipliers = [];
                a.each(function(x) {
                    multipliers.push(x.multiplier);
                });
                var gcd = core.Math2.QGCD.apply(undefined, multipliers);
                if(!gcd.equals(1)) {
                    a.each(function(x) {
                        x.multiplier = x.multiplier.divide(gcd);
                    });
                }

                return a;
            }
        },
        freduce: function(a) {
            //grab and order the terms in descending group, and alphabetical order
            var terms = a.collectSymbols(undefined, undefined, function(a, b) {
                if(a.group === CB && b.group === CB) {
                    //the longest first since we want to capture the greatest number of 
                    //variables per iteration
                    if(b.length > a.length) return b.length - a.length; 
                    var v1 = a.value, v2 = b.value;
                    if(v1 > v2) return -1;
                    if(v1 < v2) return 1;
                    return 0;
                }
                return b.group - a.group; //place them in descending order
            }, true);

            var map = []; //what each index maps back to
            var powers = [[]]; //the variables converted to powers
            var first_term = terms[0];//we use the first term as reference since it's the longest
            if(!first_term) return new Symbol(1); //nothing to do
            var ftg = first_term.group;
            if(ftg !== CB) return new Symbol(1); //nothing to do again
            
            var groups = [ftg]; //keep track of the groups

            //terms of equal length cause problems if they don't have the same variables
            var nxt = terms[1];
            while(nxt && nxt.group === CB && !first_term.sameVars(nxt)) {
                core.Utils.remove(terms, 1);
                nxt = terms[1];
            }
            var l = terms.length;
            var coeffs = [first_term.multiplier.clone()]; //container for the coefficients
            //by now we're dealing with a CB for sure so loop
            for(var x in first_term.symbols) {
                //loop through each term and let's create a map of the powers
                map.push(x); //we now know the location of this particular variable
                var t1 = first_term.symbols[x];
                powers[0].push(t1.power.toDecimal());
                for(var i=1; i<l; i++) {
                    var tt = terms[i], t2 = undefined, g = tt.group;
                    if(g === N) continue; //we're not interested in group N 
                    groups.push(g); //mark the group type
                    if(!powers[i]) powers[i] = [];
                    if(!coeffs[i]) coeffs[i] = tt.multiplier.clone();
                    if(g === CB) t2 = tt.symbols[x]; //t2 is the matching sub-symbol for CB
                    else if(tt.value === x) t2 = tt; //or if they match. All else is blank
                    //set the power
                    var p = t2 ? t2.power.toDecimal() : 0;
                    powers[i].push(p);
                }
            }
            //find the reducer powers
            var l2 = powers.length, l3 = map.length;
            var term = powers[0].slice(); //start off with the first and loop through the remainder finding the smalles possible term
            var first_powers = powers[0].slice();
            for(i=1; i<l2; i++) {
                var cur = powers[i];
                for(var k=0; k<l3; k++) {
                    var a = term[k], b = cur[k], max = first_powers[k];  
                    if(groups[i] !== CB) {
                        if(cur[k] === 0) {
                            for(var z=0; z<l3; z++) if(cur[z] !== 0) break; //which variable is it?
                            var real_max = first_powers[z],
                                real_pow = cur[z];
                            //if the variable is of group S then we have to compare the power of the actual variable
                            //but since we start with the longest variable, if it's not in the set of the first then 
                            //it will be undefined here and we can use this to exclude it.
                            if(real_pow === real_max && map[z]) {
                                term[k] = Math.min(a, b);
                                continue;
                            }
                        }
                        if(b !== max) {
                            coeffs[i] = new core.Frac(0); //make it go away
                            continue;
                        }
                    }
                    term[k] = Math.min(a, b);
                }
            }
            if(core.Utils.arrSum(term) === 0) {
                return new Symbol(1);
            } //nothing to factor
            //trim all the terms
            for(i=0; i<l2; i++) {
                cur = powers[i];
                for(k=0; k<l3; k++) { cur[k] -= term[k]; }
            }
            //rebuild
            var factor = Symbol(0);
            var gcd = core.Math2.QGCD.apply(undefined, coeffs.filter(function(x){ return x !== undefined; }));
            for(i=0; i<l2; i++) {
                cur = powers[i];
                var factor_arr = [];
                if(cur) {
                    for(k=0; k<l3; k++) { 
                        factor_arr.push(map[k]+'^'+cur[k]); 
                    }
                    var c = core.Utils.inBrackets(coeffs[i].divide(gcd).toString());
                    factor = _.add(factor, _.parse(c+'*'+factor_arr.join('*')));
                }
            }
            return factor;
        },
        /**
         * Divides one expression by another
         * @param {Symbol} symbol1
         * @param {Symbol} symbol2
         * @returns {Array}
         */
        divide: function(symbol1, symbol2) {
            var result = __.div(symbol1, symbol2);
            var remainder = _.divide(result[1], symbol2);
            return _.add(result[0], remainder);
        },
        div: function(symbol1, symbol2) {
            var symbol1_has_func = symbol1.hasFunc(),
                symbol2_has_func = symbol2.hasFunc(),
                parse_funcs = false;
            
            //substitute out functions so we can treat them as regular variables
            if(symbol1_has_func || symbol2_has_func) {
                parse_funcs = true;
                var map = {},
                    symbol1 = _.parse(core.Utils.subFunctions(symbol1, map)),
                    symbol2 = _.parse(core.Utils.subFunctions(symbol2, map)),
                    subs = {};
                //prepare substitutions
                for(var x in map) subs[map[x]] = _.parse(x);
            }
            
            var factor = __.freduce(symbol2);   
            var d = __.freduce(factor);

            while(!d.equals(1)) { //reduce the smallest possible
                d =  __.freduce(factor);
                factor = d;
            }

            //we don't want to have squares in the numerator 
            var unit_factor = factor.equals(1);
            if(!unit_factor) {
                var other_factor = __.freduce(symbol1);
                if(other_factor.toString() === factor.toString()) {
                    factor = new Symbol(1); //reset it since all we end up with is a square
                    unit_factor = true;//save a function call
                }
            }
            if(!unit_factor) symbol1 = _.expand(_.multiply(symbol1, factor.clone()));
        
            var reconvert = function(arr) {
                var symbol = new Symbol(0);
                for(var i=0; i<arr.length; i++) {
                    var x = arr[i].toSymbol();
                    symbol = _.add(symbol, x);
                }
                return symbol;
            };
            //Silly Martin. This is why you document. I don't remember now
            var get_unique_max = function(term, any) {
                var max = Math.max.apply(null, term.terms),
                    count = 0, idx;
            
                if(!any) {
                    for(var i=0; i<term.terms.length; i++) {
                        if(term.terms[i].equals(max)) {
                            idx = i; count++;
                        }
                        if(count > 1) return;
                    }
                }
                if(any) {
                    for(i=0; i<term.terms.length; i++) 
                        if(term.terms[i].equals(max)) {
                            idx = i; break;
                        }
                }
                return [max, idx, term];
            };
            //tries to find an LT in the dividend that will satisfy division
            var get_det = function(s, lookat) { 
                lookat = lookat || 0;
                var det = s[lookat], l = s.length; 
                if(!det) return;
                //eliminate the first term if it doesn't apply
                var umax = get_unique_max(det); 
                for(var i=lookat+1; i<l; i++) {
                    var term = s[i],   
                        is_equal = det.sum.equals(term.sum);
                    if(!is_equal && umax) { 
                        break;
                    } 
                    if(is_equal) {
                        //check the differences of their maxes. The one with the biggest difference governs
                        //e.g. x^2*y^3 vs x^2*y^3 is unclear but this isn't the case in x*y and x^2
                        var max1, max2, idx1, idx2, l2 = det.terms.length;
                        for(var j=0; j<l2; j++) {
                            var item1 = det.terms[j], item2 = term.terms[j];
                            if(typeof max1 === 'undefined' || item1.greaterThan(max1)) {
                                max1 = item1; idx1 = j;
                            }
                            if(typeof max2 === 'undefined' || item2.greaterThan(max2)) {
                                max2 = item2; idx2 = j;
                            }
                        }
                        //check their differences
                        var d1 = max1.subtract(term.terms[idx1]),
                            d2 = max2.subtract(det.terms[idx2]);
                        if(d2 > d1) {
                            umax = [max2, idx2, term];
                            break;
                        }
                        if(d1 > d2) {
                            umax = [max1, idx1, det];
                            break;
                        }
                    }
                    else { 
                        //check if it's a suitable pick to determine the order
                        umax = get_unique_max(term); 
                        //if(umax) return umax;
                        if(umax) break;
                    }
                    umax = get_unique_max(term); //calculate a new unique max
                }
                
                //if still no umax then any will do since we have a tie
                if(!umax) return get_unique_max(s[0], true);
                var e, idx;
                for(var i=0; i<s2.length; i++) {
                    var cterm = s2[i].terms;
                    //confirm that this is a good match for the denominator
                    idx = umax[1];
                    if(idx === cterm.length - 1) return;
                    e = cterm[idx]; 
                    if(!e.equals(0)) break;
                }

                if(e.equals(0)) return get_det(s, ++lookat); //look at the next term
                return umax;
            };
            
            var vars = variables(symbol1).concat(variables(symbol2));
            vars.push(CONST_HASH); //this is for the numbers
            var t_map = core.Utils.toMapObj(vars);
            var init_sort = function(a, b) {
                return b.sum.subtract(a.sum);
            };
            var s1 = symbol1.tBase(t_map).sort(init_sort),
                s2 = symbol2.tBase(t_map).sort(init_sort),
                det = get_det(s1);//we'll begin by assuming that this will let us know which term governs
            var quotient = [];
            
            if(det) {
                var lead_var = det[1];
                var can_divide = function(a, b) { 
                    if(a[0].sum.equals(b[0].sum)) return a.length >= b.length;
                    return true;
                };
                var is_larger = function(a, b) { 
                    if(!a || !b) return false; //it's empty so...
                    for(var i=0; i<a.terms.length; i++) {
                        if(a.terms[i].lessThan(b.terms[i])) return false;
                    }
                    return true;
                };
                var try_better_lead_var = function(s1, s2, lead_var) {
                    var checked = [];
                    for(var i=0; i<s1.length; i++) { 
                        var t = s1[i];
                        for(var j=0; j<t.terms.length; j++) {
                            var cf = checked[j], tt = t.terms[j];
                            if(i === 0) checked[j] = tt; //add the terms for the first one
                            else if(cf && !cf.equals(tt)) checked[j] = undefined;
                        }
                    }
                    for(var i=0; i<checked.length; i++) {
                        var t = checked[i];
                        if(t && !t.equals(0)) return i;
                    }
                    return lead_var;
                };
                var sf = function(a, b){ 
                    var l1 = a.len(), l2 = b.len();
                    var blv = b.terms[lead_var], alv = a.terms[lead_var];
                    if(l2 > l1 && blv.greaterThan(alv)) return l2 - l1;
                    return blv.subtract(alv); 
                };

                //check to see if there's a better lead_var
                lead_var = try_better_lead_var(s1, s2, lead_var);
                //reorder both according to the max power
                s1.sort(sf); //sort them both according to the leading variable power
                s2.sort(sf);

                //try to adjust if den is larger
                var fdt = s2[0], fnt = s1[0];
                
                var den = new MVTerm(new Frac(1), [], fnt.map);
                if(fdt.sum.greaterThan(fnt.sum)&& fnt.len() > 1) {
                    for(var i=0; i<fnt.terms.length; i++) {
                        var d = fdt.terms[i].subtract(fnt.terms[i]);
                        if(!d.equals(0)) {
                            var nd = d.add(new Frac(1));
                            den.terms[i] = d;
                            for(var j=0; j<s1.length; j++) {
                                s1[j].terms[i] = s1[j].terms[i].add(nd);
                            }
                        }
                        else den.terms[i] = new Frac(0);
                    }
                }
                var dividend_larger = is_larger(s1[0], s2[0]);
                
                while(dividend_larger && can_divide(s1, s2)) {
                    var q = s1[0].divide(s2[0]);
                    quotient.push(q); //add what's divided to the quotient
                    s1.shift();//the first one is guaranteed to be gone so remove from dividend
                    for(var i=1; i<s2.length; i++) { //loop through the denominator
                        var t = s2[i].multiply(q).generateImage(), 
                            l2 = s1.length;
                        //if we're subtracting from 0
                        if(l2 === 0) { 
                            t.coeff = t.coeff.neg();
                            s1.push(t); 
                            s1.sort(sf);
                        }

                        for(var j=0; j<l2; j++) {
                            var cur = s1[j];
                            if(cur.getImg() === t.getImg()) {
                                cur.coeff = cur.coeff.subtract(t.coeff);
                                if(cur.coeff.equals(0)) {
                                    core.Utils.remove(s1, j);
                                    j--; //adjust the iterator
                                }
                                break;
                            }
                            if(j === l2 - 1) { 
                                t.coeff = t.coeff.neg();
                                s1.push(t); 
                                s1.sort(sf);
                            }
                        }
                    }
                    dividend_larger = is_larger(s1[0], s2[0]);
                    
                    if(!dividend_larger && s1.length >= s2.length) {
                        //One more try since there might be a terms that is larger than the LT of the divisor
                        for(var i=1; i<s1.length; i++) {
                            dividend_larger = is_larger(s1[i], s2[0]);
                            if(dividend_larger) {
                                console.log(9)
                                //take it from its current position and move it to the front
                                s1.unshift(core.Utils.remove(s1, i)); 
                                break;
                            }
                        }
                    }
                }
            }
            
            var quot = reconvert(quotient),
                rem = reconvert(s1);
            if(!unit_factor) {
               quot = _.multiply(quot, factor.clone().invert());
               rem = _.multiply(rem, factor.invert());
            };
            
            if(typeof den !== 'undefined') {
                den = den.toSymbol();
                quot = _.divide(quot, den.clone());
                rem = _.divide(rem, den);
            }
                
            
            //put back the functions
            if(parse_funcs) {
                quot = _.parse(quot.text(), subs);
                rem = _.parse(rem.text(), subs);
            }

            return [quot, rem];
        },
        cfactor: function(symbol) {
            var gcd = core.Math2.QGCD.apply(null, symbol.coeffs());
            if(!gcd.equals(1)) {
                return [_.expand(_.divide(symbol, new Symbol(gcd))), gcd];
            }
            return [symbol, gcd];
        },
        //a rough version of square free
        sqfactor: function(symbol, factors, vars) {
            factors = factors || [];
            vars = vars || variables(symbol);
            var l = vars.length;
            var exit = false;
            for(var i=0; i<l; i++) {
                if(exit) break;
                do {
                    var d = core.Calculus.diff(symbol.clone(), vars[i]);
                    var f = __.cfactor(d);
                    if(f[0].equals(1)) {
                        exit = true;
                        factors.push(symbol);
                        break;
                    }
//                    console.log(symbol.toString(), f[0].toString(), 'dividing')
//                    console.log(d.toString())
                    var div = __.div(symbol.clone(), f[0].clone());
//                    console.log(symbol.toString(), div.toString(), 'div')
                    if(div[1].equals(0)) {
                        factors.push(f[0]);
                        symbol = div[0];
                    }
                }
                while(div[1].equals(0))
                    
            }
            return factors;
        },
        nfactor: function(symbol, factors) {
//            console.log(__.sqfactor(symbol).toString(), 'factors')
//            console.log(symbol.toString())
            factors = factors || [];
            var vars = variables(symbol);
            var symbols = symbol.collectSymbols();
            var sorted = {};
            var maxes = {};
            var l = vars.length, n = symbols.length;
            for(var i=0; i<l; i++) {
                var v = vars[i];
                sorted[v] = new Symbol(0);
                for(var j=0; j<n; j++) {
                    var s = symbols[j];
                    if(s.contains(v)) {
                        var p = s.value === v ? s.power.toDecimal() : s.symbols[v].power.toDecimal();
                        if(!maxes[v] || p < maxes[v]) maxes[v] = p;
                        sorted[v] = _.add(sorted[v], s.clone());
                    }
                }
            }
            
            for(var x in sorted) {
                var r = _.parse(x+'^'+maxes[x]);
                var new_factor = _.expand(_.divide(sorted[x], r));
                var divided = __.div(symbol.clone(), new_factor);
//                console.log(x, '['+divided.toString()+']', new_factor.toString())
                if(divided[0].equals(0)) { //cant factor anymore
                    factors.push(divided[1]);
                    return factors;
                }
                if(divided[1].equals(0)) { //we found at least one factor
                    factors.push(divided[0]);
                    return __.nfactor(__.div(symbol, divided[0].clone())[0], factors);
                }
            }
            return factors;
        }
    };
    
    nerdamer.register([
        {
            name: 'factor',
            visible: true,
            numargs: 1,
            build: function() { return __.factor; }
        },
        {
            name: 'gcd',
            visible: true,
            numargs: 2,
            build: function() { return __.gcd; }
        },
        {
            name: 'proots',
            visible: true,
            numargs: -1,
            build: function() { return __.proots; }
        },
        {
            name: 'divide',
            visible: true,
            numargs: 2,
            build: function() { return __.divide; }
        },
        {
            name: 'div',
            visible: true,
            numargs: 2,
            build: function() { return __.div; }
        },
        {
            name: 'sqfr',
            visible: true,
            numargs: 1,
            build: function() { return __.sqfr; }
        },
        {
            name: 'nfactor',
            visible: true,
            numargs: 1,
            build: function() { return __.nfactor; }
        },
    ]);
})();
