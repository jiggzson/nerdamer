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
        version: '1.0.0',
        /*
        * Heavyside step function
        * Specification : http://mathworld.wolfram.com/HeavisideStepFunction.html
        * if x > 0 then 1
        * if x == 0 then 1/2
        * if x < 0 then 0
        */
        step: function(symbol) {

            if (!isNumericSymbol(symbol))
            {
                return  _.symfunction("step",[symbol]);
            }

            if (symbol > 0)
            {
                return 1;
            }
            else if (symbol < 0)
            {
                return 0;
            }
            return 1/2;
        },
        /*
        * Sign function
        * Specification : http://mathworld.wolfram.com/Sign.html
        * if x > 0 then 1
        * if x == 0 then 0
        * if x < 0 then -1
        */
        sign: function(symbol) {

            if (!isNumericSymbol(symbol))
            {
                return  _.symfunction("sign",[symbol]);
            }

            if (symbol > 0)
            {
                return 1;
            }
            else if (symbol < 0)
            {
                return -1;
            }

            return 0;
        },
        /*
        * Rectangle function
        * Specification : http://mathworld.wolfram.com/RectangleFunction.html
        * if |x| > 1/2 then 0
        * if |x| == 1/2 then 1/2
        * if |x| < 1/2 then 1
        */
        rect: function(symbol) {

            if (!isNumericSymbol(symbol))
            {
                return  _.symfunction("rect",[symbol]);
            }

            if ((symbol == 0.5) || (symbol == -0.5))
            {
                return 0.5;
            }
            else if (Math.abs(symbol) < 0.5)
            {
                return 1;
            }
            return 0;

        },
        /*
        * Sinc function
        * Specification : http://mathworld.wolfram.com/SincFunction.html
        * if x == 0 then 1
        * otherwise sin(x)/x
        */
        sinc: function(symbol) {

            if (!isNumericSymbol(symbol))
            {
                return  _.symfunction("sinc",[symbol]);
            }

            if (symbol == 0)
            {
                return 1;
            }
            else if ((symbol == Infinity) || (symbol == -Infinity))
            {
                return 0;
            }
            return Math.sin(symbol)/symbol;

        },
        /*
        * Triangle function
        * Specification : http://mathworld.wolfram.com/TriangleFunction.html
        * if |x| >= 1 then 0
        * if |x| < then 1-|x|
        */
        tri: function(symbol) {
                        if (!isNumericSymbol(symbol))
            {
                return  _.symfunction("tri",[symbol]);
            }

            if (Math.abs(symbol) < 1)
            {
                return 1-Math.abs(symbol);
            }

            return 0;
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
        }
    };

    nerdamer.register([
        {
                /*
                * Heavyside step function
                * Specification : http://mathworld.wolfram.com/HeavisideStepFunction.html
                * if x > 0 then 1
                * if x == 0 then 1/2
                * if x < 0 then 0
                */
                name: 'step',
                visible: true,
                numargs: 1,
                build: function() { return __.step; }
        },
        {
                /*
                * Sign function
                * Specification : http://mathworld.wolfram.com/Sign.html
                * if x > 0 then 1
                * if x == 0 then 0
                * if x < 0 then -1
                */
                name: 'sign',
                visible: true,
                numargs: 1,
                build: function() { return __.sign; }
        },
        {
                /*
                * Rectangle function
                * Specification : http://mathworld.wolfram.com/RectangleFunction.html
                * if |x| > 1/2 then 0
                * if |x| == 1/2 then 1/2
                * if |x| < 1/2 then 1
                */
                name: 'rect',
                visible: true,
                numargs: 1,
                build: function() { return __.rect; }
        },
        {
                /*
                * Sinc function
                * Specification : http://mathworld.wolfram.com/SincFunction.html
                * if x == 0 then 1
                * otherwise sin(x)/x
                */
                name: 'sinc',
                visible: true,
                numargs: 1,
                build: function() { return __.sinc; }
        },
        {
                /*
                * Triangle function
                * Specification : http://mathworld.wolfram.com/TriangleFunction.html
                * if |x| >= 1 then 0
                * if |x| < then 1-|x|
                */
                name: 'tri',
                visible: true,
                numargs: 1,
                build: function() { return __.tri; }
        },
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
        }
    ]);
})();
