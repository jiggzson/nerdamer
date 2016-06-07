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
                    if (symbol.group === N)//Check if a number
                    {
                        var x = symbol.multiplier.toDecimal();
                        if (x > 0)
                        {
                                return 1;
                        }
                        else if (x < 0)
                        {
                                return 0;
                        }
                        return 1/2;
                    }
                    return  _.symfunction("step",[symbol]);
		},
		/*
		* Sign function
		* Specification : http://mathworld.wolfram.com/Sign.html
		* if x > 0 then 1
		* if x == 0 then 0
		* if x < 0 then -1
		*/
		sign: function(symbol) {
                    //Check if a number
			if (symbol.group === N)//Check if a number
			{
                            var x = symbol.multiplier.toDecimal();
                            if (x > 0)
                            {
                                    return 1;
                            }
                            else if (x < 0)
                            {
                                    return -1;
                            }
                            return 0;
			}
			return  _.symfunction("sign",[symbol]);
		},
		/*
		* Rectangle function
		* Specification : http://mathworld.wolfram.com/RectangleFunction.html
		* if |x| > 1/2 then 0
		* if |x| == 1/2 then 1/2
		* if |x| < 1/2 then 1
		*/
		rect: function(symbol) {
			var exp = core.Utils.format('step({0}+(0.5)) - step({0}-(0.5))', symbol); //Reuse step function
			return core.PARSER.parse(exp);
		},
		/*
		* Sinc function
		* Specification : http://mathworld.wolfram.com/SincFunction.html
		* if x == 0 then 1
		* otherwise sin(x)/x
		*/
		sinc: function(symbol) {
                    if (symbol.group === N)//Check if a number
                    {
                        var x = symbol.multiplier.toDecimal();
                        if (x === 0)
                        {
                                return 1;
                        }
                        return Math.sin(symbol)/symbol;
                    }
                    return  _.symfunction("sinc",[symbol]);
		},
		/*
		* Triangle function
		* Specification : http://mathworld.wolfram.com/TriangleFunction.html
		* if |x| >= 1 then 0
		* if |x| < then 1-|x|
		*/
		tri: function(symbol) {
			var exp = core.Utils.format('rect(0.5*{0})*(1-abs({0}))', symbol); //Reuse rect function
			return core.PARSER.parse(exp);
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
	}	
	
    ]);
})();
