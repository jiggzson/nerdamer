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
        eachaddsymbol = core.Utils.eachaddsymbol,
        eachmuiltisymbol = core.Utils.eachmuiltisymbol,
        isSingleVariable = core.Utils.isSingleVariable,
        hasVariable = core.Utils.hasVariable,
        joinmuiltisymbols = core.Utils.joinmuiltisymbols,
        joinaddsymbols = core.Utils.joinaddsymbols,
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
            if ((!isSingleVariable(varin)) || (!isSingleVariable(varout)))
            {
                throw new Error('Must be single symbol');
            }

            //If input is zero
            if (isNumericSymbol(expression) && (expression.valueOf() === 0))
            {
                return new Symbol('0');
            }

            var transform = function(exp,vin,vout) {
                //Get all multiplications
                var allmuilti = eachmuiltisymbol(exp);

                //Coefficients
                var coeffs = [];

                //Main focus
                var mainsymbols = [];

                //Sort symbols into coeffs and mainsymbols
                allmuilti.forEach(function (element, index, array) {
                    if (hasVariable(element,vin))
                    {
                        mainsymbols.push(element);
                    }
                    else
                    {
                        coeffs.push(element);
                    }
                });

                //Constant number input
                if (mainsymbols.length === 0)
                {
                    return _.multiply(exp,_.symfunction('delta',[vout]));
                }

                //Collect all the symbols with the variable
                var mainsymbol = joinmuiltisymbols(mainsymbols);

                //Handle functions with multiple arguments
                if ((mainsymbol.args !== undefined) && (mainsymbol.args.length > 1))
                {

                }

                //Handle nested functions
                if ((mainsymbol.args !== undefined) && (mainsymbol.args[0].baseName !== undefined))
                {

                }

                //Multiple functions
                if (mainsymbol.symbols !== undefined)
                {
                    var fshift = undefined;
                    var newmainsymbols = [];
                    //Contains frequency shift
                    if (mainsymbol.text().indexOf('exp') !== -1)
                    {
                        eachmuiltisymbol(mainsymbol).forEach(function (element, index, array) {
                            if (element.baseName === 'exp')
                            {
                                fshift = element;
                            }
                            else
                            {
                                newmainsymbols.push(element);
                            }
                        });
                    }

                    //Reduced to single function
                    if (newmainsymbols.length === 1)
                    {
                        //Call itself there
                        mainsymbol = transform(newmainsymbols[0], vin.copy() , vout.copy());

                        //Frequency shift
                        if (fshift !== undefined)
                        {
                            //Get shift
                            var factorout = core.Utils.format('2*i*PI*({0})', vin) ;
                            fshift = core.Utils.format('(({0})-({1}))',vout , _.divide ( fshift.args[0] , _.parse(factorout) ) ) ;
                            //Subsitude shift
                            var newmainsymbols = eachmuiltisymbol(mainsymbol);
                            newmainsymbols.forEach(function (element, index, array) {
                                array[index] = _.parse( element.text().replace( vout.text() ,fshift) ) ;
                            });
                            coeffs.push.apply(coeffs, newmainsymbols);
                        }
                    }
                    else //More functions
                    {

                    }

                    return joinmuiltisymbols(coeffs);
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
                        switch(mainsymbol.baseName)
                        {
                            case 'exp':
                                var factorout = core.Utils.format('2*i*PI*({0})', vin) ;
                                var fshift = core.Utils.format('delta(({0})-({1}))',vout , _.divide (mainsymbol.args[0], _.parse(factorout) ) ) ;
                                coeffs.push( _.parse(fshift));
                                break;
                            default:
                                break;
                        }
                    }
                    else //Time shift
                    {
                        var shiftby =  eachaddsymbol(mainsymbol.args[0].copy());
                        var shiftcoeffs = shiftby.filter(function (value) { return (!hasVariable(value,vin)) ; });
                        //Add shift
                        var newshift = core.Utils.format('exp(i*2*PI*f*({0}))', joinaddsymbols(shiftcoeffs));
                        coeffs.push(_.parse(newshift));
                        var newmainsymbol = _.parse( mainsymbol.text().replace(mainsymbol.args[0].text(),vin.text()) );
                        //Evalute rest of function
                        newmainsymbol = transform( newmainsymbol,vin.copy(),vout.copy());
                        //Add to coefficients list
                        coeffs.push(newmainsymbol);
                    }

                    //Rejoin all of them
                    return joinmuiltisymbols(coeffs);
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
                        case 'sign':
                            mainsymbol = _.divide( new Symbol('1'), _.multiply(  _.multiply( new Symbol('i'),new Symbol('PI')) ,vout ) );
                            break;
                        case 'step':
                            var retval = core.Utils.format('0.5*((i*2*PI*{0})^(-1)+delta({0}))', vout);
                            mainsymbol = _.parse(retval);
                            break;
                        case 'exp':
                            var retval = core.Utils.format('0.5*((i*2*PI*{0})^(-1)+delta({0}))', vout);
                            mainsymbol = _.parse(retval);
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
                return joinmuiltisymbols(coeffs);
            };

            //Expand expression
            var temp = core.Utils.format('expand({0})', expression.copy());
            expression = _.parse(temp);
            expression = nerdamer(expression.text()).symbol;

            //Seperate each symbol by addition
            var symbols = eachaddsymbol(expression);

            //Use linear property of transform
            var transsymbols = [];
            symbols.forEach(function (element, index, array) {
                transsymbols.push(transform(element,varin.copy(),varout.copy()));
            });

            return joinaddsymbols(transsymbols);
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
