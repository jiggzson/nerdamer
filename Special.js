/*
* Author : Brosnan Yuen
* Description : Implements special function such as step,sign,rectangle, sinc, and triangle.
* Website : https://github.com/brosnanyuen
*/

(function() {
    /*imports*/
    var core = nerdamer.getCore(),
        _ = core.PARSER,
        keys = core.Utils.keys,
        build = core.Utils.build,
        Symbol = core.Symbol,
        S = core.groups.S,
        round = core.Utils.round,
        isInt = core.Utils.isInt,
        Math2 = core.Math2,
        variables = core.Utils.variables,
        isComposite = core.Utils.isComposite,
        isSymbol = core.Utils.isSymbol,
        isNumericSymbol = core.Utils.isNumericSymbol,
        isVector = core.Utils.isVector,
        N = core.groups.N,
        EX = core.groups.EX,
        FN = core.groups.FN,
        PL = core.groups.PL,
        CP = core.groups.CP,
        CB = core.groups.CB,
        Vector = core.Vector;

    var __ = core.Special = {
        version: '1.0.1',
        /*
        * Splits symbols by addition or subtraction
        */
        eachaddsymbol: function(symbol) {
            var symbols = [];
            if  ( (symbol.group === CB) || (symbol.group == EX) || (symbol.collectSymbols().length == 0))
            {
                return [symbol];
            }
            else
            {
                symbol.collectSymbols().forEach(function (element, index, array) {
                    symbols.push.apply(symbols, __.eachaddsymbol(element));
                });
            }
            return symbols;
        },
        /*
        * Splits symbols by multiplication
        */
        eachmuiltisymbol: function(symbol) {
            var symbols = [];
            if  (symbol.collectSymbols().length == 0)
            {
                return [symbol];
            }
            else
            {
                symbol.collectSymbols().forEach(function (element, index, array) {
                    symbols.push.apply(symbols, __.eachmuiltisymbol(element));
                });
            }
            symbols.push(new Symbol(symbol.multiplier))
            return symbols;
        },
        /*
        * Single variable of power 1 and multiplier 1
        */
        isSingleVarible: function(exp) {
                return ((exp.group === S) && (exp.multiplier == 1) && (exp.power == 1));
        },
        /*
        * Dirac delta function
        * Specification : http://mathworld.wolfram.com/DeltaFunction.html
        * Place holder until limits are implemented
        */
        delta: function(symbol) {
            if (!isNumericSymbol(symbol))
            {
                return  _.symfunction("delta",[symbol]);
            }

            if (symbol == 0)
            {
                return Infinity;
            }

            return 0;
        },
        /*
        * Fourier Transform function
        * Specification : http://mathworld.wolfram.com/FourierTransform.html
        */
        ft: function(expression,varin,varout) {

            //Check for invalid inputs
            if ((!__.isSingleVarible(varin)) || (!__.isSingleVarible(varout)))
            {
                throw new Error('Must be single symbol');
            }

            var get_coeffs = function(exp,vin) {
                __.eachmuiltisymbol(exp).forEach(function (element, index, array) { console.log(element); });
                var coeffs = "";
                var parsed_var = "";

                return [coeffs,parsed_var];
            };

            var transfrom = function(exp,vin,vout) {
                var coeffs = get_coeffs(exp);
                //console.log(exp.text());
                return "";
            };

            var symbols = __.eachaddsymbol(expression);
            var result = symbols.forEach(function (element, index, array) {
                transfrom(element,varin,varout);
            });
            return result;

        }
    };
    nerdamer.register([
        {
                /*
                * Dirac delta function
                * Specification : http://mathworld.wolfram.com/DeltaFunction.html
                * Place holder until limits are implemented
                */
                name: 'delta',
                visible: true,
                numargs: 1,
                build: function() { return __.delta; }
        },
        {
                /*
                * Fourier Transform function
                * Specification : http://mathworld.wolfram.com/FourierTransform.html
                */
                name: 'ft',
                visible: true,
                numargs: 3,
                build: function() { return __.ft; }
        }
    ]);
})();
