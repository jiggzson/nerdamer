/*
* Author : Brosnan Yuen
* Description : Implements special function such as step,sign,rectangle, and sinc
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
		step: function(x) {
			if (x > 0)
			{
				return 1;
			}
			else if (x < 0)
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
		sign: function(x) {
			return Math.sign(x);
		},
		/*
		* Sign function
		* Specification : http://mathworld.wolfram.com/RectangleFunction.html
		* if |x| > 1/2 then 0
		* if |x| == 1/2 then 1/2
		* if |x| < 1/2 then 1
		*/
		rectangle: function(x) {
			return __.step(x+(1/2)) - __.step(x-(1/2));
		},
		/*
		* Sinc function
		* Specification : http://mathworld.wolfram.com/SincFunction.html
		* if x == 0 then 1
		* otherwise sin(x)/x
		*/
		sinc: function(x) {
			if (x == 0)
			{
				return 1;
			}
			
            return Math.sin(x)/x;
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
		* Sign function
		* Specification : http://mathworld.wolfram.com/RectangleFunction.html
		* if |x| > 1/2 then 0
		* if |x| == 1/2 then 1/2
		* if |x| < 1/2 then 1
		*/
		name: 'rectangle',
		visible: true,
		numargs: 1,
		build: function() { return __.rectangle; }
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
	}
    ]);
})();
