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
            if ( (symbol.group === CB) || ((symbol.group === EX) || (symbol.collectSymbols().length === 0)) )
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
            if  (symbol.collectSymbols().length === 0)
            {
                return [symbol,(new Symbol(symbol.multiplier))];
            }
            else
            {
                symbol.collectSymbols().forEach(function (element, index, array) {
                    symbols.push.apply(symbols, __.eachmuiltisymbol(element));
                });
            }
            symbols.push(new Symbol(symbol.multiplier));
            return symbols;
        },
        /*
        * Single variable of power 1 and multiplier 1
        */
        isSingleVariable: function(exp) {
            return ((exp.group === S) && (exp.multiplier === 1) && (exp.power === 1));
        },
        /*
        * Check to see if the function contains a variable
        */
        hasVariable: function(exp,vin) {
            return (exp.text().indexOf(vin.text()) !== -1);
        },
        /*
        * Joints symbols in array by multiplication
        */
        joinmuiltisymbols: function(symbols) {
            return symbols.reduce(function(a, b) {
                return _.multiply(a,b);
            });
        },
        /*
        * Joints symbols in array by addition
        */
        joinaddsymbols: function(symbols) {
            return symbols.reduce(function(a, b) {
                return _.add(a,b);
            });
        },
        /*
        * Dirac delta function
        * Specification : http://mathworld.wolfram.com/DeltaFunction.html
        * Place holder until limits are implemented
        */
        delta: function(symbol) {
            if (!isNumericSymbol(symbol))
            {
                return  _.symfunction('delta',[symbol]);
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
            if ((!__.isSingleVariable(varin)) || (!__.isSingleVariable(varout)))
            {
                throw new Error('Must be single symbol');
            }

            //If input is zero
            if (isNumericSymbol(expression) && (expression.valueOf() == 0))
            {
                return new Symbol('0');
            }

            var transfrom = function(exp,vin,vout) {
                //Get all multiplications
                var allmuilti = __.eachmuiltisymbol(exp);
                //Get coefficients
                var coeffs = allmuilti.filter(function (value) { return (!__.hasVariable(value,vin)) ; });
                //Parse symbols that contain the varin
                var mainsymbols = allmuilti.filter(function (value) { return __.hasVariable(value,vin) ; });

                //Constant input
                if (mainsymbols.length === 0)
                {
                    return _.multiply(exp,_.symfunction('delta',[vout]));
                }

                //Collect all the symbols with the variable
                var mainsymbol = __.joinmuiltisymbols(mainsymbols);

                //Handle functions with multiple arguments
                if (mainsymbol.args.length > 1)
                {

                }

                //Handle nested functions
                if (mainsymbol.args[0].baseName != undefined)
                {

                }

                //Shifting
                if (mainsymbol.args[0].group !== S)
                {

                    //Different power
                    if (mainsymbol.args[0].power !== 1)
                    {

                    }
                    //Amplitude and frequency shift
                    if (mainsymbol.args[0].multiplier !== 1)
                    {

                    }

                    //Time shift
                    var shiftby =  __.eachaddsymbol(mainsymbol.args[0].copy());
                    var shiftcoeffs = shiftby.filter(function (value) { return (!__.hasVariable(value,vin)) ; });
                    //Add shift
                    var newshift = core.Utils.format('exp(i*2*PI*f*({0}))', __.joinaddsymbols(shiftcoeffs));
                    coeffs.push(_.parse(newshift));
                    var newmainsymbol = _.parse( mainsymbol.text().replace(mainsymbol.args[0].text(),vin.text()) );
                    //Evalute rest of function
                    newmainsymbol = transfrom( newmainsymbol,vin,vout);

                    //Add to coefficients list
                    coeffs.push(newmainsymbol);
                    //Rejoin all of them
                    return __.joinmuiltisymbols(coeffs);
                }


                //Tables of functions
                if (mainsymbol.power === 1)
                {
                    switch(mainsymbol.baseName)
                    {
                    case 'delta':
                        mainsymbol = new Symbol('1');
                        break;
                    case 'rect':
                        mainsymbol = _.symfunction('sinc',[vout]);
                        break;
                    case 'sinc':
                        mainsymbol = _.symfunction('rect',[vout]);
                        break;
                    case 'tri':
                        mainsymbol = _.pow( _.symfunction('sinc',[vout]),new Symbol('2') );
                        break;
                    default:
                        break;
                    }
                }
                else if (mainsymbol.power === 2)
                {
                    switch(mainsymbol.baseName)
                    {
                    case 'sinc':
                        mainsymbol = _.symfunction('tri',[vout]);
                        break;
                    default:
                        break;
                    }
                }

                //Add to coefficients list
                coeffs.push(mainsymbol);
                //Rejoin all of them
                return __.joinmuiltisymbols(coeffs);
            };

            //Seperate each symbol by addition
            var symbols = __.eachaddsymbol(expression);
            //Use linear property of transform
            symbols.forEach(function (element, index, array) {
                array[index] = transfrom(element,varin,varout);
            });

            return __.joinaddsymbols(symbols);
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
