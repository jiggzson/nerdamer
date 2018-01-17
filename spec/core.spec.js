'use strict';

var nerdamer = require('../nerdamer.core.js');

describe('Nerdamer core', function () {
    //, x=2.1, y=3.3, z=1, a=7.42
    var values = {
        x: 2.1,
        y: 3.3,
        z: 1,
        a: 7.42
    };

    it('should handle errors', function () {
        var formulas = [
            '0/0',
            '0^0',
            '-Infinity+Infinity',
            'Infinity/Infinity',
            'Infinity^Infinity',
            '1^Infinity',
            'Infinity^0',
            '(-Infinity)^0',
            'Infinity*0'
        ];

        for(var i=0; i<formulas.length; i++)
            expect(function () { nerdamer(formulas[i]) }).toThrowError();
    });
    
    it('should correctly calculate Infinity', function () {
        // given
        var testCases = [
            {
                given: '0^Infinity',
                expected: '0'
            }, 
            {
                given: 'Infinity*Infinity',
                expected: 'Infinity'
            }, 
            {
                given: '-Infinity*Infinity',
                expected: '-Infinity'
            }, 
            {
                given: '-Infinity*-Infinity',
                expected: 'Infinity'
            }, 
            {
                given: '-a*-Infinity',
                expected: 'Infinity*a'
            }, 
            {
                given: '-a-Infinity',
                expected: '-Infinity'
            }, 
            {
                given: '-a*Infinity',
                expected: '-Infinity*a'
            }, 
            {
                given: '-a^Infinity',
                expected: '-a^Infinity'
            }, 
            {
                given: '-2^Infinity',
                expected: '-Infinity'
            }, 
            {
                given: '-2^-Infinity',
                expected: '0'
            }, 
            
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
        }
    });
    
    it('should calculate fib correctly', function () {
        // given
        var testCases = [
            {
                given: 'fib(0)',
                expected: '0'
            }, 
            {
                given: 'fib(14)',
                expected: '377'
            }, 
            {
                given: 'fib(-14)',
                expected: '-377'
            }, 
            {
                given: 'fib(15)',
                expected: '610'
            }, 
            {
                given: 'fib(-15)',
                expected: '610'
            }, 
            
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given).evaluate();

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
        }
    });
    
    it('should perform simple arithmetic', function () {
        // given
        var testCases = [
            {
                given: '((((((1+1))))))',
                expected: '2',
                expectedValue: '2'
            }, 
            {
                given: '((((((1+1))+4)))+3)',
                expected: '9',
                expectedValue: '9'
            },
            {
                given: '1+1',
                expected: '2',
                expectedValue: '2'
            },
            {
                given: '4^2',
                expected: '16',
                expectedValue: '16'
            },
            {
                given: '2*-4',
                expected: '-8',
                expectedValue: '-8'
            },
            {
                given: '2+(3/4)',
                expected: '11/4',
                expectedValue: '2.75'
            },
            {
                given: '2/3+2/3',
                expected: '4/3',
                expectedValue: '1.3333333333333333'
            },
            {
                given: '6.5*2',
                expected: '13',
                expectedValue: '13'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);
            var value = parsed.evaluate().text('decimals');

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
            expect(value).toEqual(testCases[i].expectedValue);
        }
    });

    xit('should calculate percentages and modulos correctly', function () {
        // given
        var testCases = [
            {
                given: '1%',
                expected: '1/100',
                expectedValue: '0.01'
            }, 
            {
                given: '101%',
                expected: '101/100',
                expectedValue: '1.01'
            },
            {
                given: '1%101',
                expected: '1',
                expectedValue: '1'
            },
            {
                //currently fails, gives 101
                given: '101%1',
                expected: '0',
                expectedValue: '0'
            },
            {
                given: '%1',
                expectError: true
            },
            {
                given: '1%101%10101',
                expected: '1',
                expectedValue: '1'
            },/*
            {
                given: '1%+101%10101', //Wolfram Alpha says it is equal to (1%+101)%10101, need to decide whether to follow
                expected: '10101/100',
                expectedValue: '101.01'
            },*/
            {
                given: '1%%', //Wolfram Alpha says 1%% == 1‱, maybe support this ‱ symbol too?
                expected: '1/10000',
                expectedValue: '0.0001'
            },
            {
                given: '1%%101', //Wolfram Alpha has a bug LOL, 
                                 //it thinks this is 1‱×101 (obviously should be 1% mod 101),
                                 //but thinks 1%%%101 is 1‱ mod 101
                expected: '1/100',
                expectedValue: '0.01'
            },
            {
                given: '1%%%', //Wolfram Alpha says 1%%% == 1‱%
                expected: '1/1000000',
                expectedValue: '0.000001'
            },
            {
                given: '1%%%101',
                expected: '1/10000',
                expectedValue: '0.0001'
            },
            {
                given: '(101%)%1',
                expected: '1/100',
                expectedValue: '0.01'
            },
            {
                given: '(101%)%1',
                expected: '1/100',
                expectedValue: '0.01'
            },
            {
                given: '101%(%1)',
                expectError: true
            },
            {
                given: '1%1%',
                expected: '0',
                expectedValue: '0'
            },
            {
                given: 'i%',
                expected: '(1/100)*i',
                expectedValue: '0.01*i'
            },
            {
                given: '1+i%',
                expected: '(1/100)*i+1',
                expectedValue: '0.01*i+1'
            },
            {
                given: '(1+i)%',
                expected: '(1/100)*(1+i)',
                expectedValue: '0.01*(1+i)' //ummm... should auto-expand?
            },
            {
                given: '1%(1+i)',
                expected: 'mod(1,1+i)',
                expectedValue: 'mod(1,1+i)' //take account for complex numbers in mod please
            },
            {
                given: '%',
                expectError: true
            },
            {
                given: '%%',
                expectError: true
            },
            {
                given: '%1',
                expectError: true
            },
            {
                given: '%1%',
                expectError: true
            },
            {
                given: '1%(%1)',
                expectError: true
            },
        ];

        for (var i = 0; i < testCases.length; ++i) {
            if(!testCases[i].expectError) {
                // when
                var parsed = nerdamer(testCases[i].given);
                var value = parsed.evaluate().text('decimals');

                // then
                expect(parsed.toString()).toEqual(testCases[i].expected);
                expect(value).toEqual(testCases[i].expectedValue);
            } else expect(function () { nerdamer(testCases[i].given) }).toThrowError();
        }
    });
    
    it('should perform simple calculations with variables', function () {
        // given
        var testCases = [
            {
                given: 'x+x',
                expected: '2*x',
                expectedValue: '4.2'
            }, {
                given: 'x+1',
                expected: '1+x',
                expectedValue: '3.1'
            }, {
                given: 'x+y',
                expected: 'x+y',
                expectedValue: '5.4'
            }, {
                given: '-9-x+y-11',
                expected: '-20-x+y',
                expectedValue: '-18.8'
            }, {
                given: '(x+1)+(1+x)',
                expected: '2+2*x',
                expectedValue: '6.2'
            }, {
                given: '9+(x+1)-(1+x)',
                expected: '9',
                expectedValue: '9'
            }, {
                given: '0-x-2*x+6',
                expected: '-3*x+6',
                expectedValue: '-0.3'
            }, {
                given: '(x+y)+(a+x)',
                expected: '2*x+a+y',
                expectedValue: '14.92'
            }, {
                given: '7*(x+y)+2*(a+x)',
                expected: '2*a+7*y+9*x',
                expectedValue: '56.84'
            }, {
                given: 'x^y+x^y',
                expected: '2*x^y',
                expectedValue: '23.13948390048293'
            }, {
                given: 'x*x',
                expected: 'x^2',
                expectedValue: '4.41'
            }, {
                given: '-x*x',
                expected: '-x^2',
                expectedValue: '-4.41'
            }, {
                given: '-x*-x',
                expected: 'x^2',
                expectedValue: '4.41'
            }, {
                given: 'x-y',
                expected: '-y+x',
                expectedValue: '-1.2'
            }, {
                given: 'x-x',
                expected: '0',
                expectedValue: '0'
            }, {
                given: 'x*2',
                expected: '2*x',
                expectedValue: '4.2'
            }, {
                given: 'x*y',
                expected: 'x*y',
                expectedValue: '6.93'
            }, {
                given: 'x^x',
                expected: 'x^x',
                expectedValue: '4.749638091742242'
            }, {
                given: 'x^(x)',
                expected: 'x^x',
                expectedValue: '4.749638091742242'
            }, {
                given: 'y^y^3',
                expected: 'y^y^3',
                expectedValue: '4303635263255155700'
            }, {
                given: '(x-1)^2+(x-1)^2',
                expected: '2*(-1+x)^2',
                expectedValue: '2.4200000000000004'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);
            var value = parsed.evaluate(values).text('decimals');

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
            expect(value).toEqual(testCases[i].expectedValue);
        }
    });

    it('should expand terms', function () {
        // given
        var testCases = [
            {
                given: 'expand((9*y*x+1)^3)',
                expected: '1+243*x^2*y^2+27*x*y+729*x^3*y^3',
                expectedValue: '254478.51475300005'
            },
            {
                given: 'expand(x*(x+1))',
                expected: 'x+x^2',
                expectedValue: '6.51'
            },
            {
                given: 'expand(x*(x+1)^5)',
                expected: '10*x^3+10*x^4+5*x^2+5*x^5+x+x^6',
                expectedValue: '601.212171'
            },
            {
                given: 'expand((x*y)^x+(x*y)^2)',
                expected: '(x*y)^x+x^2*y^2',
                expectedValue: '106.3076174497575'
            },
            {
                given: 'expand((3*x+4*y)^4)',
                expected: '256*y^4+432*x^3*y+768*x*y^3+81*x^4+864*x^2*y^2',
                expectedValue: '144590.0625'
            },
            {
                given: 'expand((9*y*x+1)^2)',
                expected: '1+18*x*y+81*x^2*y^2',
                expectedValue: '4015.7568999999994'
            }, 
            {
                given: 'expand((x+5)*(x-3)-x^2)',
                expected: '-15+2*x',
                expectedValue: '-10.8'
            },
            {
                given: 'expand(((x^3+x)^x*(x^2+x)^x+1)*x)',
                expected: '(x+x^2)^x*(x+x^3)^x*x+x',
                expectedValue: '17667.12052556627'
            },
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);
            var value = parsed.evaluate(values).text('decimals');

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
            expect(value).toEqual(testCases[i].expectedValue);
        }
    });
    
    it('should handle imaginary log arguments', function () {
        // given
        var testCases = [
            {
                given: 'log(5*i)',
                expected: '1.5707963267948966*i+1.6094379124341003'
            }, 
            {
                given: 'log(8+5*i)',
                expected: '0.5585993153435624*i+2.24431818486607'
            }, 
            {
                given: 'log(123-2*i)',
                expected: '-0.01625872980512958*i+4.8123165343435135'
            }, 
            {
                given: 'log(123-2*i+a)',
                expected: 'log(-2*i+123+a)'
            }, 
            /*
            {
                given: 'log(123-2*i+a)',
                expected: '-atan2(123+a,-2)*i+1.5707963267948966*i+log(sqrt((123+a)^2+4))'
            }, 
            {
                given: 'log(x+2*i)',
                expected: '-atan2(x,2)*i+1.5707963267948966*i+log(sqrt(4+x^2))'
            }
            */
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);
            var value = parsed.evaluate().text('decimals');

            // then
            expect(value).toEqual(testCases[i].expected);
        }
    });
    
    it('should convert from polar to rectangular', function () {
        // given
        var testCases = [
            {
                given: 'rectform(sqrt(34)*e^(i*atan(3/5)))',
                expected: '3*i+5'
            }, 
            //PENDING:
            //(-1)^(1/4)*sqrt(2)
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);
            var value = parsed.evaluate().text('decimals');

            // then
            expect(value).toEqual(testCases[i].expected);
        }
    });
    
    it('should convert from rectangular to polar', function () {
        // given
        var testCases = [
            {
                given: 'polarform(3*i+5)',
                expected: 'e^(atan(3/5)*i)*sqrt(34)'
            }, 
            {
                given: 'polarform(i-1)',
                expected: '(-1)^(1/4)*sqrt(2)'
            }, 
            {
                given: 'polarform(i+1)',
                expected: 'e^(atan(1)*i)*sqrt(2)'
            }, 
            {
                given: 'polarform(a*i+b*1)',
                expected: 'e^(atan(a*b^(-1))*i)*sqrt(a^2+b^2)'
            }, 
            {
                given: 'polarform(3)',
                expected: '3'
            }, 
            {
                given: 'polarform(i)',
                expected: 'i'
            }, 
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);
            var value = parsed.toString();

            // then
            expect(value).toEqual(testCases[i].expected);
        }
    });
    
    it('should compute powers', function () {
        // given
        var testCases = [
            {
                given: '0^(1/2)',
                expected: '0',
                expectedValue: '0'
            },
            {
                given: '2^(1/2)',
                expected: 'sqrt(2)',
                expectedValue: '1.4142135623730951'
            },
            {
                given: '3/4/-5/7',
                expected: '-3/140',
                expectedValue: '-0.02142857142857143'
            },
            {
                given: '(2/5)^(1/2)',
                expected: 'sqrt(2)*sqrt(5)^(-1)',
                expectedValue: '0.6324555320336757'
            },
            {
                given: '2^(1/2)+sqrt(2)',
                expected: '2*sqrt(2)',
                expectedValue: '2.8284271247461903'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);
            var value = parsed.evaluate(values).text('decimals');

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
            expect(value).toEqual(testCases[i].expectedValue);
        }
    });

    it('should compute factorials', function () {
        // given
       var testCases = [
           {
               given: '(1+x^2)!',
               expected: 'factorial(1+x^2)',
               expectedValue: '245.1516183677083'
           },
           {
               given: '10!',
               expected: 'factorial(10)',
               expectedValue: '3628800'
           },
           {
               given: 'x!',
               expected: 'factorial(x)',
               expectedValue: '2.197620278392476'
           },
           {
               given: 'x!*x!',
               expected: 'factorial(x)^2',
               expectedValue: '4.829534888001823'
           },
           {
               given: '3*(1+x!*x!)',
               expected: '3*(1+factorial(x)^2)',
               expectedValue: '17.488604664005468'
           },
           {
               given: '3*(1+x!*x!)!',
               expected: '3*factorial(1+factorial(x)^2)',
               expectedValue: '1573.2041488172601'
           }
       ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);
            var value = parsed.evaluate(values).text('decimals');

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
            expect(value).toEqual(testCases[i].expectedValue);
        }
    });

    describe('trigonometric functions', function () {
        it('should be computed properly', function () {
            // given
            var testCases = [
                {
                    given: 'cos(pi)',
                    expected: '-1',
                    expectedValue: '-1'
                },
                {
                    given: 'cos(2*pi)',
                    expected: '1',
                    expectedValue: '1'
                },
                {
                    given: 'cos(2*pi/3)',
                    expected: '-1/2',
                    expectedValue: '-0.5'
                },
                {
                    given: 'cos(3*pi/4)',
                    expected: '-sqrt(2)^(-1)',
                    expectedValue: '-0.7071067811865475'
                },
                {
                    given: 'sin(pi)',
                    expected: '0',
                    expectedValue: '0'
                },
                {
                    given: 'sin(pi/2)',
                    expected: '1',
                    expectedValue: '1'
                },
                {
                    given: 'sin(-pi/2)',
                    expected: '-1',
                    expectedValue: '-1'
                },
                {
                    given: 'sin(3*pi/4)',
                    expected: 'sqrt(2)^(-1)',
                    expectedValue: '0.7071067811865475'
                },
                {
                    given: 'tan(3*pi/4)',
                    expected: '-1',
                    expectedValue: '-1'
                },
                {
                    given: 'tan(2*pi/3)',
                    expected: '-sqrt(3)',
                    expectedValue: '-1.7320508075688772'
                },
                {
                    given: 'tan(4*pi/3)',
                    expected: 'sqrt(3)',
                    expectedValue: '1.7320508075688772'
                },
                {
                    given: 'tan(pi/3)',
                    expected: 'sqrt(3)',
                    expectedValue: '1.7320508075688772'
                },
                {
                    given: 'tan(pi)',
                    expected: '0',
                    expectedValue: '0'
                },
                {
                    given: 'sec(pi)',
                    expected: '-1',
                    expectedValue: '-1'
                },
                {
                    given: 'sec(2*pi/3)',
                    expected: '-2',
                    expectedValue: '-2'
                },
                {
                    given: 'sec(4*pi/3)',
                    expected: '-2',
                    expectedValue: '-2'
                },
                {
                    given: 'sec(5*pi/3)',
                    expected: '2',
                    expectedValue: '2'
                },
                {
                    given: 'sec(pi/6)',
                    expected: '2*sqrt(3)^(-1)',
                    expectedValue: '1.1547005383792517'
                },
                {
                    given: 'csc(5*pi/3)',
                    expected: '-2*sqrt(3)^(-1)',
                    expectedValue: '-1.1547005383792517'
                },
                {
                    given: 'cot(pi/2)',
                    expected: '0',
                    expectedValue: '0'
                },
                {
                    given: 'cot(2*pi/3)',
                    expected: '-sqrt(3)^(-1)',
                    expectedValue: '-0.5773502691896258'
                },
                {
                    given: 'cot(4*pi/3)',
                    expected: 'sqrt(3)^(-1)',
                    expectedValue: '0.5773502691896258'
                },
                {
                    given: 'cot(5*pi/6)',
                    expected: '-sqrt(3)',
                    expectedValue: '-1.7320508075688772'
                },
                {
                    given: 'acot(0)',
                    expected: 'acot(0)',
                    expectedValue: '1.5707963267948966'
                },
            ];

            for (var i = 0; i < testCases.length; ++i) {
                // when
                var parsed = nerdamer(testCases[i].given);
                var value = parsed.evaluate().text('decimals');

                // then
                expect(parsed.toString()).toEqual(testCases[i].expected);
                expect(value).toEqual(testCases[i].expectedValue);
            }
        });

        it('should throw for wrong trigonometric arguments', function () {
            // given
            var testCases = [
                'tan(pi/2)',
                'sec(pi/2)',
                'csc(pi)',
                'csc(2*pi)',
                'cot(pi)',
                'cot(2*pi)'
            ];

            for (var i = 0; i < testCases.length; ++i) {
                var threwError = false;
                try {
                    nerdamer(testCases[i]);
                } catch (e) {
                    threwError = true;
                }
                expect(threwError).toBe(true);
            }
        });

        it('should calculate correctly with variables', function () {
            // given
            var testCases = [
                {
                    given: 'cos(x)',
                    expected: 'cos(x)',
                    expectedValue: '-0.5048461045998576'
                },
                {
                    given: 'sin(x)',
                    expected: 'sin(x)',
                    expectedValue: '0.8632093666488737'
                },
                {
                    given: 'tan(x)',
                    expected: 'tan(x)',
                    expectedValue: '-1.7098465429045073'
                },
                {
                    given: 'y*tan(x)*tan(x)',
                    expected: 'tan(x)^2*y',
                    expectedValue: '9.647798160932235'
                },
                {
                    given: '2*cos(x)+cos(x)',
                    expected: '3*cos(x)',
                    expectedValue: '-1.514538313799573'
                },
                {
                    given: '2*cos(x)+cos(x+8+5*x)',
                    expected: '2*cos(x)+cos(6*x+8)',
                    expectedValue: '-1.18837521422445'
                },
                {
                    given: 'x^2+2*cos(x)+cos(x+8+5*x)+4*x^2',
                    expected: '2*cos(x)+5*x^2+cos(6*x+8)',
                    expectedValue: '20.86162478577555'
                },
                {
                    given: 'cos(x)*cos(x)',
                    expected: 'cos(x)^2',
                    expectedValue: '0.25486958932965037'
                },
                {
                    given: 'x^x*cos(x)*sin(x)/x',
                    expected: 'cos(x)*sin(x)*x^(-1+x)',
                    expectedValue: '-0.9856355924988681'
                },
                {
                    given: '2*cos(x)+5*cos(2*x)',
                    expected: '2*cos(x)+5*cos(2*x)',
                    expectedValue: '-3.460996315903212'
                },
                {
                    given: '2*cos(x)*5*cos(2*x)',
                    expected: '10*cos(2*x)*cos(x)',
                    expectedValue: '2.4750626589177886'
                },
                {
                    given: 'cos(x)+(x+x^2+x)',
                    expected: '2*x+x^2+cos(x)',
                    expectedValue: '8.105153895400143'
                },
                {
                    given: 'cos(x)+(x+x^2+7)',
                    expected: '7+cos(x)+x+x^2',
                    expectedValue: '13.005153895400143'
                },
                {
                    given: 'x/cos(x)*cos(x)',
                    expected: 'x',
                    expectedValue: '2.1'
                },
                {
                    given: 'tan(x)*tan(x)',
                    expected: 'tan(x)^2',
                    expectedValue: '2.923575200282495'
                },
                {
                    given: '2*(tan(x)+tan(2*x)+7)-6*tan(x)',
                    expected: '-4*tan(x)+14+2*tan(2*x)',
                    expectedValue: '24.39494572063571'
                },
                {
                    given: '((3+y)*2-(cos(x)*4+z))',
                    expected: '-4*cos(x)-z+2*y+6',
                    expectedValue: '13.61938441839943'
                },
                {
                    given: 'cos(x^2)*cos(x^2)^x',
                    expected: 'cos(x^2)^(1+x)',
                    expectedValue: '0.023397743182121563*(-1)^3.1'
                }
            ];

            for (var i = 0; i < testCases.length; ++i) {
                // when
                var parsed = nerdamer(testCases[i].given);
                var value = parsed.evaluate(values).text('decimals');

                // then
                expect(parsed.toString()).toEqual(testCases[i].expected);
                expect(value).toEqual(testCases[i].expectedValue);
            }
        });
    });
    describe('hyperbolic trigonometric functions', function () {
        it('should be computed properly', function () {
            // given
            var testCases = [
                {
                    given: 'acosh(1/23.12)',
                    expected: 'acosh(25/578)',
                    expectedValue: '-4.440892098500627e-16+1.5275302342078616*i'
                },
                {
                    given: 'sech(0.1)',
                    expected: 'sech(1/10)',
                    expectedValue: '0.9950207489532266'
                },
                {
                    given: 'csch(0.1)',
                    expected: 'csch(1/10)',
                    expectedValue: '9.98335275729611'
                },
                {
                    given: 'tanh(0.1)',
                    expected: 'tanh(1/10)',
                    expectedValue: '0.09966799462495582'
                },
                {
                    given: 'coth(0.1)',
                    expected: 'coth(1/10)',
                    expectedValue: '10.03331113225399'
                },
                {
                    given: 'acosh(0.1)',
                    expected: 'acosh(1/10)',
                    expectedValue: '1.4706289056333368*i'
                },
                {
                    given: 'asinh(0.1)',
                    expected: 'asinh(1/10)',
                    expectedValue: '0.0998340788992076'
                },
                {
                    given: 'atanh(-5)',
                    expected: 'atanh(-5)',
                    expectedValue: '-0.20273255405408225+1.5707963267948966*i'
                },
                {
                    given: 'asech(0.5)',
                    expected: 'asech(1/2)',
                    expectedValue: '1.3169578969248166'
                },
                {
                    given: 'acsch(1.1)',
                    expected: 'acsch(11/10)',
                    expectedValue: '0.8156089004401478'
                },
                {
                    given: 'acoth(1.2)',
                    expected: 'acoth(6/5)',
                    expectedValue: '1.1989476363991853'
                }
            ];

            for (var i = 0; i < testCases.length; ++i) {
                // when
                var parsed = nerdamer(testCases[i].given);
                var value = parsed.evaluate().text('decimals');

                // then
                expect(parsed.toString()).toEqual(testCases[i].expected);
                expect(value).toEqual(testCases[i].expectedValue);
            }
        });

        xit('should throw for wrong trigonometric arguments', function () {
            // given
            var testCases = [
                'csch(0)',
                'coth(0)'
            ];

            for (var i = 0; i < testCases.length; ++i) {
                var threwError = false;
                try {
                    nerdamer(testCases[i]).evaluate();
                } catch (e) {
                    threwError = true;
                }
                expect(threwError).toBe(true);
            }
        });

        it('should calculate correctly with variables', function () {
            // given
            var testCases = [
                {
                    given: 'cosh(x)',
                    expected: 'cosh(x)',
                    expectedValue: '4.1443131704103155'
                },
                {
                    given: 'sinh(x)',
                    expected: 'sinh(x)',
                    expectedValue: '4.021856742157334'
                },
                {
                    given: 'tanh(x)',
                    expected: 'tanh(x)',
                    expectedValue: '0.9704519366134539'
                },
                {
                    given: 'y*tanh(x)*tanh(x)',
                    expected: 'tanh(x)^2*y',
                    expectedValue: '3.1078639722134502'
                },
                {
                    given: '2*cosh(x)+cosh(x)',
                    expected: '3*cosh(x)',
                    expectedValue: '12.432939511230947'
                },
                {
                    given: '2*cosh(x)+cosh(x+8+5*x)',
                    expected: '2*cosh(x)+cosh(6*x+8)',
                    expectedValue: '442014320.214284'
                },
                {
                    given: 'x^2+2*cosh(x)+cosh(x+8+5*x)+4*x^2',
                    expected: '2*cosh(x)+5*x^2+cosh(6*x+8)',
                    expectedValue: '442014342.26428396'
                },
                {
                    given: 'cosh(x)*cosh(x)',
                    expected: 'cosh(x)^2',
                    expectedValue: '17.175331654436402'
                },
                {
                    given: 'x^x*cosh(x)*sinh(x)/x',
                    expected: 'cosh(x)*sinh(x)*x^(-1+x)',
                    expectedValue: '37.698180303290115'
                },
                {
                    given: '2*cosh(x)+5*cosh(2*x)',
                    expected: '2*cosh(x)+5*cosh(2*x)',
                    expectedValue: '175.0419428851847'
                },
                {
                    given: '2*cosh(x)*5*cosh(2*x)',
                    expected: '10*cosh(2*x)*cosh(x)',
                    expectedValue: '1382.155931928817'
                },
                {
                    given: 'cosh(x)+(x+x^2+x)',
                    expected: '2*x+x^2+cosh(x)',
                    expectedValue: '12.754313170410315'
                },
                {
                    given: 'cosh(x)+(x+x^2+7)',
                    expected: '7+cosh(x)+x+x^2',
                    expectedValue: '17.654313170410315'
                },
                {
                    given: 'x/cosh(x)*cosh(x)',
                    expected: 'x',
                    expectedValue: '2.1'
                },
                {
                    given: 'tanh(x)*tanh(x)',
                    expected: 'tanh(x)^2',
                    expectedValue: '0.9417769612768031'
                },
                {
                    given: '2*(tanh(x)+tanh(2*x)+7)-6*tanh(x)',
                    expected: '-4*tanh(x)+14+2*tanh(2*x)',
                    expectedValue: '12.117292986465252'
                },
                {
                    given: '((3+y)*2-(cosh(x)*4+z))',
                    expected: '-4*cosh(x)-z+2*y+6',
                    expectedValue: '-4.9772526816412626'
                },
                {
                    given: 'cosh(x^2)*cosh(x^2)^x',
                    expected: 'cosh(x^2)^(1+x)',
                    expectedValue: '100982.42051309341'
                }
            ];

            for (var i = 0; i < testCases.length; ++i) {
                // when
                var parsed = nerdamer(testCases[i].given);
                var value = parsed.evaluate(values).text('decimals');

                // then
                expect(parsed.toString()).toEqual(testCases[i].expected);
                expect(value).toEqual(testCases[i].expectedValue);
            }
        });
    });

    it('should handle square roots', function () {
        // given
        var testCases = [
            {
                given: 'sqrt(1+x)^(4*x)',
                expected: '(1+x)^(2*x)',
                expectedValue: '115.80281433592612'
            },
            {
                given: 'sqrt(2*sqrt(5))',
                expected: '5^(1/4)*sqrt(2)',
                expectedValue: '2.114742526881128'
            },
            {
                given: 'sqrt(2)*sqrt(2)',
                expected: '2',
                expectedValue: '2'
            },
            {
                given: 'sqrt(1/2)',
                expected: 'sqrt(2)^(-1)',
                expectedValue: '0.7071067811865475'
            },
            {
                given: 'sqrt(2)^2',
                expected: '2',
                expectedValue: '2'
            },
            {
                given: '6*sqrt(2)^4',
                expected: '24',
                expectedValue: '24'
            },
            {
                given: 'sqrt(x^2)*sqrt(x^4)',
                expected: 'abs(x)*x^2',
                expectedValue: '9.261'
            },
            {
                given: 'sqrt((5/2)*x^10)',
                expected: 'abs(x)*sqrt(2)^(-1)*sqrt(5)*x^4',
                expectedValue: '64.5753067708567'
            },
            {
                given: '(sqrt((5/2)*x^10))*-sqrt(2)',
                expected: '-abs(x)*sqrt(5)*x^4',
                expectedValue: '-91.3232746297487'
            },
            {
                given: 'sqrt(9)',
                expected: '3',
                expectedValue: '3'
            },
            {
                given: 'sqrt(-9)',
                expected: '3*i',
                expectedValue: '3*i'
            },
            /* TODO jiggzson: Results in NaN
            {
                given: 'sqrt(-x)',
                expected: 'sqrt(-x)',
                expectedValue: '1.44913767*i'
            },*/
            {
                given: 'sqrt(-x)*sqrt(-x)',
                expected: '-x',
                expectedValue: '-2.1'
            },
            {
                given: 'sqrt(-x)*sqrt(-x)+4*x',
                expected: '3*x',
                expectedValue: '6.3'
            },
            {
                given: 'sqrt((1/2*x)^(1/2))',
                expected: '2^(-1/4)*x^(1/4)',
                expectedValue: '1.0122722344290394'
            },
            {
                given: 'sqrt(4*sqrt(2)^(-1)*x^(1/2))',
                expected: '2^(3/4)*x^(1/4)',
                expectedValue: '2.0245444688580787'
            },
            {
                given: 'sqrt(4+x)',
                expected: 'sqrt(4+x)',
                expectedValue: '2.4698178070456938'
            },
            {
                given: '(1/2)*x^(1/2)+sqrt(x)',
                expected: '(3/2)*sqrt(x)',
                expectedValue: '2.173706511928416'
            },
            {
                given: 'sqrt((4+x)^2)',
                expected: 'abs(4+x)',
                expectedValue: '6.1'
            },
            {
                given: '2*sqrt(3/4)',
                expected: 'sqrt(3)',
                expectedValue: '1.7320508075688772'
            },
            {
                given: 'sqrt(2)*sqrt(8)',
                expected: '4',
                expectedValue: '4'
            },
            {
                given: 'sqrt(242)',
                expected: '11*sqrt(2)',
                expectedValue: '15.556349186104047'
            },
            {
                given: 'sqrt(4)^-1',
                expected: '1/2',
                expectedValue: '0.5'
            },
            {
                given: 'sqrt(4*x^2)',
                expected: '2*abs(x)',
                expectedValue: '4.2'
            },
            {
                given: '74689676.31109099*sqrt(5578547747455547)',
                expected: '(824947474856/11045)*sqrt(5578547747455547)',
                expectedValue: '5578547747455547'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);
            var value = parsed.evaluate(values).text('decimals');

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
            expect(value).toEqual(testCases[i].expectedValue);
        }
    });

    it('should support the imaginary number i', function () {
        // given
        var testCases = [
            {
                given: 'i*i',
                expected: '-1',
                expectedValue: '-1'
            },
            {
                given: 'i*8*i',
                expected: '-8',
                expectedValue: '-8'
            },
            {
                given: 'i^(2/3)',
                expected: '-1',
                expectedValue: '-1'
            },
            {
                given: '(256*i)^(1/8)',
                expected: '2*(-1)^(1/16)',
                expectedValue: '0.39018064403225655*i+1.9615705608064609'
            },
            {
                given: 'i/i',
                expected: '1',
                expectedValue: '1'
            },
            {
                given: '(1/i)*i',
                expected: '1',
                expectedValue: '1'
            },
            {
                given: 'i^(-1)',
                expected: '-i',
                expectedValue: '-i'
            },
            {
                given: 'i^(2)',
                expected: '-1',
                expectedValue: '-1'
            },
            {
                given: 'i^(-2)',
                expected: '-1',
                expectedValue: '-1'
            },
            {
                given: 'i^(-1)',
                expected: '-i',
                expectedValue: '-i'
            },
            {
                given: 'e^(i*pi)+e^(2*i*pi)',
                expected: '0',
                expectedValue: '0'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);
            var value = parsed.evaluate().text('decimals');

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
            expect(value).toEqual(testCases[i].expectedValue);
        }
    });
    
    
    it('should handle powers with results using i', function () {
        // given
        var testCases = [
            {
                given: '(-2/3*x)^x',
                expected: '(-x)^x*2^x*3^(-x)',
                //TODO: Evaluates to NaN somewhere
                expectedValue: '2.0270706004935852*(-1)^2.1'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);
            var value = parsed.evaluate(values).text('decimals');

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
            expect(value).toEqual(testCases[i].expectedValue);
        }
    });

    it('should compute logarithms correctly', function () {
        // given
        var testCases = [
            {
                given: 'log(e)',
                expected: '1',
                expectedValue: '1'
            },
            {
                given: 'log(e^e)',
                expected: 'e',
                expectedValue: '2.718281828459045'
            },
            {
                given: 'log(1/e^e)',
                expected: '-e',
                expectedValue: '-2.718281828459045'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);
            var value = parsed.evaluate().text('decimals');

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
            expect(value).toEqual(testCases[i].expectedValue);
        }
    });
    it('should check for equality', function () {
        var a, b, c, d, e, f, g;
        a = nerdamer("2sqrt(5)");
        b = nerdamer("2sqrt(5)");
        c = nerdamer("sqrt(13)");
        d = nerdamer("sqrt(21)");
        e = nerdamer("sqrt(20)");
        f = nerdamer("sqrt(5) + sqrt(3)");
        g = nerdamer("sqrt(5) + sqrt(7)");
        expect(a.lt(g)).toBe(true);
        expect(a.lt(f)).toBe(false);
        expect(a.gt(c)).toBe(true);
        expect(a.gt(d)).toBe(false);
        expect(a.gt(e)).toBe(false);
        expect(a.lt(e)).toBe(false);
        expect(a.eq(e)).toBe(true);
        expect(b.gte(a)).toBe(true);
        expect(c.gte(a)).toBe(false);
        expect(e.lte(d)).toBe(true);
        expect(f.lte(g)).toBe(true);
        
    });

    /** Based on commit cf8c0f8. */
    it('should not cause infinite recursion', function () {
      // given
      var formula = '1/(1+x)+(1+x)';

      // when
      var parsed = nerdamer(formula);
      var result = parsed.evaluate().toString();

      // then
      expect(result).toBe('(1+x)^(-1)+1+x');
    });

    it('should support ceil and floor', function () {
      // given
      var testCases = [
          {
              given: 'floor(204)',
              expected: '204'
          },
          {
              given: 'floor(10.893)',
              expected: '10'
          },
          {
              given: 'floor(-10.3)',
              expected: '-11'
          },
          {
              given: 'ceil(204)',
              expected: '204'
          },
          {
              given: 'ceil(10.893)',
              expected: '11'
          },
          {
              given: 'ceil(-10.9)',
              expected: '-10'
          }
      ];

      for (var i = 0; i < testCases.length; ++i) {
        // when
        var parsed = nerdamer(testCases[i].given);
        var value = parsed.evaluate().text('decimals');

        // then
        expect(value).toEqual(testCases[i].expected);
      }
    });
    
    it('should round', function () {
      // given
      var testCases = [
          {
              given: 'round(204)',
              expected: '204'
          },
          {
              given: 'round(10.893)',
              expected: '11'
          },
          {
              given: 'round(10.893, 1)',
              expected: '10.9'
          },
          {
              given: 'round(-10.3)',
              expected: '-10'
          },
          {
              given: 'round(204)',
              expected: '204'
          },
          {
              given: 'round(10.1)',
              expected: '10'
          },
          {
              given: 'round(1.23423534e-12,-2)',
              expected: '1.23e-12'
          },
          {
              given: 'round(1.23423534e12,-2)',
              expected: '1230000000000'
          }
      ];

      for (var i = 0; i < testCases.length; ++i) {
        // when
        var parsed = nerdamer(testCases[i].given);
        var value = parsed.evaluate().text('decimals');

        // then
        expect(value).toEqual(testCases[i].expected);
      }
    });
    
    it('should support trunc()', function () {
        // given
        var testCases = [
            {
                given: 'trunc(0)',
                expected: '0'
            },
            {
                given: 'trunc(10.234)',
                expected: '10'
            },
            {
                given: 'trunc(-9.99)',
                expected: '-9'
            },
            {
                given: 'trunc(0.99)',
                expected: '0'
            },
            {
                given: 'trunc(-0.7555)',
                expected: '0'
            },
            {
                given: 'trunc(8.9 * -4.9)',
                expected: '-43'
            },
            {
                given: 'trunc(8.9) * trunc(-4.9)',
                expected: '-32'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);
            var value = parsed.evaluate().text('decimals');

            // then
            expect(value).toEqual(testCases[i].expected);
        }
    });

    /** #35 #76: Support multiple minus signs and brackets */
    it('should support prefix operator with parantheses', function () {
      // given
      var testCases = [
        {
           given: '(a+x)--(x+a)',
           expected: '2*a+2*x'
        },
        {
           given: '(3)---(3)',
           expected: '0'
        },
        {
           given: '-(1)--(1-1--1)',
           expected: '0'
        },
        {
           given: '-(-(1))-(--1)',
           expected: '0'
        }
      ];

      for (var i = 0; i < testCases.length; ++i) {
        // when
        var parsed = nerdamer(testCases[i].given);
        var value = parsed.evaluate().text('decimals');

        // then
        expect(value).toEqual(testCases[i].expected);
      }
    });
    
    //#78
    it('should substitute variables', function () {
      // given
      var testCases = [
        {
           given: '2*(x+1)^2',
           sub: 'x+1',
           sub_with: 'u',
           expected: '2*u^2'
        },
        {
           given: '2*(x+1+a)^2',
           sub: 'x+1',
           sub_with: 'u',
           expected: '2*(1+a+x)^2'
        },
        {
           given: '2*(x+1)^(x+1)',
           sub: 'x+1',
           sub_with: 'u',
           expected: '2*u^u'
        },
        {
           given: '2*(x+1)^2',
           sub: '(x+1)^2',
           sub_with: 'u^x',
           expected: '2*u^x'
        },
        {
           given: '2*(x+1)^2',
           sub: 'x+1',
           sub_with: 'u^x',
           expected: '2*u^(2*x)'
        },
        {
           given: '(2*(x+1)^2+a)^2',
           sub: '(x+1)^2',
           sub_with: 'u^x',
           expected: '(2*u^x+a)^2'
        },
        {
           given: '(x^x+y)^(x^x-t)',
           sub: 'x^x',
           sub_with: '4',
           expected: '(4+y)^(-t+4)'
        },
        {
           given: '(cos(x)+cos(x)^2)',
           sub: 'cos(x)',
           sub_with: '4',
           expected: '20'
        },
        {
           given: '(cos(x)+cos(x)^2)',
           sub: '(cos(x)+cos(x)^2)',
           sub_with: '4',
           expected: '4'
        },
        {
           given: '(cos(x)+cos(x^6)^2)',
           sub: '(cos(x)+cos(x)^2)',
           sub_with: '4',
           expected: 'cos(x)+cos(x^6)^2'
        },
        {
           given: '(cos(x)+cos(x^6)^2)',
           sub: 'cos(x)',
           sub_with: '4',
           expected: '4+cos(x^6)^2'
        },
        {
           given: '(cos(x)+cos(x^6)^2)',
           sub: '2',
           sub_with: '4',
           expected: 'error'
        }
      ];

      for (var i = 0; i < testCases.length; ++i) {
        var testCase = testCases[i];

        var parsed;
        // when
        try {
            parsed = nerdamer(testCase.given).sub(testCase.sub, testCase.sub_with).toString();
        }
        catch(e){
            parsed = 'error';
        }

        // then
        expect(parsed).toEqual(testCases[i].expected);
      }
    });
    
    /** #44: a+b - (a+b) not evaluated as 0 */
    it('should perform subtraction of terms', function () {
      // given
      var formula = 'a+b - (a+b)';

      // when
      var result = nerdamer(formula).toString();

      // then
      expect(result).toBe('0');
    });

    /** #46: (x^(1/2)*x^(1/3))-x^(5/6) should be 0 */
    it('should result in 0', function () {
      // given
      var formula = '(x^(1/2)*x^(1/3))-x^(5/6)';

      // when
      var result = nerdamer(formula).toString();

      // then
      expect(result).toBe('0');
    });

    /** #47: (a^2)/(a*b) should be a/b */
    it('should simplify correctly', function () {
      // given
      var formula = '(a^2)/(a*b)';

      // when
      var result = nerdamer(formula).toString();

      // then
      // TODO jiggzson: Result is correct but a/b would be simpler
      expect(result).toBe('a*b^(-1)');
    });

    /** #56: x/sqrt(x) = x^(3/2) */
    it('should calculate x/sqrt(x) correctly', function () {
      // given
      var formula = 'x/sqrt(x)';

      // when
      var result = nerdamer(formula).toString();

      // then
      expect(result).toBe('x^(1/2)');
    });

    /** #60: sin(x) looks like sin(abs(x)) */
    it('should respect the sign of argument for sin(x)', function () {
      // given
      var halfSqrt2 = '0.7071067811865475'; // sqrt(2)/2
      var halfSqrt3 = '0.8660254037844385'; // sqrt(3)/2
      var testCases = [
        {
          given: '-pi',
          expected: '0'
        },
        {
          given: '-3/4*pi',
          expected: '-' + halfSqrt2
        },
        {
          given: '-2/3*pi',
          expected: '-' + halfSqrt3
        },
        {
          given: '-1/2*pi',
          expected: '-1'
        },
        {
          given: '-1/6*pi',
          expected: '-0.5'
        },
        {
          given: '0',
          expected: '0'
        },
        {
          given: '1/4*pi',
          expected: halfSqrt2
        },
        {
          given: '1/2*pi',
          expected: '1'
        },
        {
          given: '3/4*pi',
          expected: halfSqrt2
        },
        {
          given: 'pi',
          expected: '0'
        },
        {
          given: '3/2*pi',
          expected: '-1'
        },
        {
          given: '2*pi',
          expected: '0'
        },
        {
          given: '2.25 * pi',
          expected: halfSqrt2
        }
      ];

      for (var i = 0; i < testCases.length; ++i) {
        // when
        var result = nerdamer('sin(' + testCases[i].given + ')').evaluate().text('decimals');

        // then
        expect(result).toEqual(testCases[i].expected, testCases[i].given);
      }
    });
    
    it('should compute complex numbers', function() {
        var testCases = [
            //SYMBOLIC
            {
                given: 'cos(3*i+a)',
                expected: 'cos(3*i+a)'
            },
            {
                given: 'sin(3*i+a)',
                expected: 'sin(3*i+a)'
            },
            {
                given: 'tan(3*i+a)',
                expected: 'tan(3*i+a)'
            },
            {
                given: 'sec(3*i+a)',
                expected: 'sec(3*i+a)'
            },
            {
                given: 'csc(3*i+a)',
                expected: 'csc(3*i+a)'
            },
            {
                given: 'cot(3*i+a)',
                expected: 'cot(3*i+a)'
            },
            {
                given: 'acos(3*i+a)',
                expected: 'acos(3*i+a)'
            },
            {
                given: 'asin(3*i+a)',
                expected: 'asin(3*i+a)'
            },
            {
                given: 'atan(3*i+a)',
                expected: 'atan(3*i+a)'
            },
            {
                given: 'asec(3*i+a)',
                expected: 'asec(3*i+a)'
            },
            {
                given: 'acsc(3*i+a)',
                expected: 'acsc(3*i+a)'
            },
            {
                given: 'acot(3*i+a)',
                expected: 'acot(3*i+a)'
            },
            {
                given: 'cosh(3*i+a)',
                expected: 'cosh(3*i+a)'
            },
            
            //NUMERIC
            {
                given: 'cos(3*i+5)',
                expected: '2.855815004227387+9.606383448432581*i'
            },
            {
                given: 'sin(3*i+5)',
                expected: '-2.841692295606352*i-9.654125476854839'
            },
            {
                given: 'tan(3*i+5)',
                expected: '-0.002708235836224119+1.0041647106948153*i'
            },
            {
                given: 'sec(3*i+5)',
                expected: '-0.0956446409552863*i+0.028433530909971663'
            },
            {
                given: 'csc(3*i+5)',
                expected: '-0.02805851642308007*i-0.09532363467417838'
            },
            {
                given: 'cot(3*i+5)',
                expected: '-0.0026857984057586373-0.995845318575854*i'
            },
            {
                given: 'acos(3*i+5)',
                expected: '-2.452913742502812*i+0.5469745802831137'
            },
            {
                given: 'asin(3*i+5)',
                expected: '1.023821746511783+2.452913742502812*i'
            },
            {
                given: 'atan(3*i+5)',
                expected: '0.08656905917945859*i+1.4236790442393028'
            },
            {
                given: 'asec(3*i+5)',
                expected: '0.08907951708809479*i+1.4237901324243536'
            },
            {
                given: 'acsc(3*i+5)',
                expected: '-0.08907951708809479*i+0.14700619437054302'
            },
            {
                given: 'acot(3*i+5)',
                expected: '-0.08656905917945851*i+0.1471172825555939'
            },
            {
                given: 'cosh(3*i+5)',
                expected: '-73.46729221264526+10.471557674805572*i'
            },
            {
                given: 'sinh(3*i+5)',
                expected: '-73.46062169567367+10.472508533940392*i'
            },
            {
                given: 'tanh(3*i+5)',
                expected: '0.00002536867620768396*i+0.9999128201513536'
            },
            {
                given: 'sech(3*i+5)',
                expected: '-0.0019014661516951706*i-0.013340476530549645'
            },
            {
                given: 'csch(3*i+5)',
                expected: '-0.0019019704237010974*i-0.013341591397996653'
            },
            {
                given: 'coth(3*i+5)',
                expected: '0.000025373100044513725*i+1.000087186805897'
            },
            {
                given: 'acosh(3*i+5)',
                expected: '0.5469745802831136*i+2.452913742502812'
            },
            {
                given: 'asinh(3*i+5)',
                expected: '0.5339990695941687*i+2.4598315216234345'
            },
            {
                given: 'atanh(3*i+5)',
                expected: '0.14694666622552974+1.4808695768986575*i'
            },
            {
                given: 'asech(3*i+5)',
                expected: '-1.4237901324243494*i+0.08907951708807783'
            },
            {
                given: 'acsch(3*i+5)',
                expected: '-0.08740053182394636*i+0.14709131539545411'
            },
            {
                given: 'acoth(3*i+5)',
                expected: '-0.08992674989623915*i+0.14694666622552965'
            }
        ];
        
        for (var i = 0; i < testCases.length; ++i) {
            var result = nerdamer(testCases[i].given, null, 'numer').text();
            expect(result.toString()).toEqual(testCases[i].expected);
      }
    });
    

    it('should correctly get the numerator', function() {
        var testCases = [
            {
                given: '3/4*a',
                expected: '3*a'
            },
            {
                given: '8*a*b/(x*(x+1))',
                expected: '8*a*b'
            },
            {
                given: 'x+1/x',
                expected: 'x+x^(-1)'
            },
            {
                given: 'a*b/x',
                expected: 'a*b'
            },
            {
                given: 'x^2/(2*x+2)',
                expected: 'x^2'
            },
            {
                given: '1/3*x^2/(2*x+2)',
                expected: 'x^2'
            },
            {
                given: '2/a',
                expected: '2'
            },
        ];
        
        for (var i = 0; i < testCases.length; ++i) {
            var result = nerdamer(testCases[i].given).numerator().text();
            expect(result.toString()).toEqual(testCases[i].expected);
      }
    });
    
    it('should correctly get the denominator', function() {
        var testCases = [
            {
                given: '3/4*a',
                expected: '4'
            },
            {
                given: '8*a*b/(x*(x+1))',
                expected: '(1+x)*x'
            },
            {
                given: 'x+1/x',
                expected: '1'
            },
            {
                given: 'a*b/x',
                expected: 'x'
            },
            {
                given: 'x^2/(2*x+2)',
                expected: '2+2*x'
            },
            {
                given: '1/3*x^2/(2*x+2)',
                expected: '3*(2+2*x)'
            },
            {
                given: '2/a',
                expected: 'a'
            },
        ];
        
        for (var i = 0; i < testCases.length; ++i) {
            var result = nerdamer(testCases[i].given).denominator().text();
            expect(result.toString()).toEqual(testCases[i].expected);
      }
    });

    
    describe('Further arithmetic test cases', function () {
        it('Batch 1', function () {
            // given
            var testCases = [
                {
                    given: '(x+x^2)+x',
                    expected: '2*x+x^2',
                    expectedValue: '8.61'
                },
                {
                    given: '(x+1)+4',
                    expected: '5+x',
                    expectedValue: '7.1'
                },
                {
                    given: 'x+x+1+x',
                    expected: '1+3*x',
                    expectedValue: '7.3'
                },
                {
                    given: '(x+1)+(8+y)',
                    expected: '9+x+y',
                    expectedValue: '14.4'
                },
                {
                    given: '(x+1)+(a+y)',
                    expected: '1+a+x+y',
                    expectedValue: '13.82'
                },
                {
                    given: '(x+x^2)+(x^3+x)',
                    expected: '2*x+x^2+x^3',
                    expectedValue: '17.871000000000002'
                },
                {
                    given: '3*(x+x^2)+5*(x^3+x)',
                    expected: '3*x^2+5*x^3+8*x',
                    expectedValue: '76.33500000000001'
                },
                {
                    given: '5*(x+x^2)*(2*(x+x^2)^x)',
                    expected: '10*(x+x^2)^(1+x)',
                    expectedValue: '3327.3697542441078'
                },
                {
                    given: '2*(1+x)*3*(z+x)^x*8',
                    expected: '48*(1+x)*(x+z)^x',
                    expectedValue: '1601.2623349876335'
                },
                {
                    given: '(x+x^2)*(x+x^2)',
                    expected: '(x+x^2)^2',
                    expectedValue: '42.3801'
                },
                {
                    given: '(x+x^2)*2*(x+x^2)',
                    expected: '2*(x+x^2)^2',
                    expectedValue: '84.7602'
                },
                {
                    given: '(x*y)*(x*y)',
                    expected: '(x*y)^2',
                    expectedValue: '48.024899999999995'
                },
                {
                    given: '(x*y)*(x*z)',
                    expected: 'x^2*y*z',
                    expectedValue: '14.553'
                },
                {
                    given: '(x+y)*(x+y)',
                    expected: '(x+y)^2',
                    expectedValue: '29.160000000000004'
                },
                {
                    given: '(x+y)*(y+x)',
                    expected: '(x+y)^2',
                    expectedValue: '29.160000000000004'
                },
                {
                    given: '(1+x)*(x+y)',
                    expected: '(1+x)*(x+y)',
                    expectedValue: '16.74'
                },
                {
                    given: 'x*y*x',
                    expected: 'x^2*y',
                    expectedValue: '14.553'
                },
                {
                    given: 'x*y*x/x',
                    expected: 'x*y',
                    expectedValue: '6.93'
                },
                {
                    given: 'x*y*x/x/x/y',
                    expected: '1',
                    expectedValue: '1'
                },
                {
                    given: '(x+1)^x*(z+1)^z*(x+1)',
                    expected: '(1+x)^(1+x)*(1+z)^z',
                    expectedValue: '66.71926395781806'
                },
                {
                    given: '3*(x^2+1)^x*(2*(x^2+1))',
                    expected: '6*(1+x^2)^(1+x)',
                    expectedValue: '1124.7675342780879'
                },
                {
                    given: '2*(x+x^2)+1',
                    expected: '1+2*x+2*x^2',
                    expectedValue: '14.02'
                },
                {
                    given: '2*(x+x^2)+3*(x^2+x^3)',
                    expected: '2*x+3*x^3+5*x^2',
                    expectedValue: '54.033'
                },
                {
                    given: '2*(x+x^2)+3*(x^2+x^3)^2',
                    expected: '2*x+2*x^2+3*(x^2+x^3)^2',
                    expectedValue: '573.7087230000001'
                },
                {
                    given: '2*(x+x^2)+3*(x^2+x^3)^2+x',
                    expected: '2*x^2+3*x+3*(x^2+x^3)^2',
                    expectedValue: '575.8087230000001'
                },
                {
                    given: '2*(x+x^2)+3*(x^2+x^3)^2+(x^2+x)',
                    expected: '3*(x^2+x^3)^2+3*x+3*x^2',
                    expectedValue: '580.218723'
                }
            ];

            for (var i = 0; i < testCases.length; ++i) {
                // when
                var parsed = nerdamer(testCases[i].given);
                var value = parsed.evaluate(values).text('decimals');

                // then
                expect(parsed.toString()).toEqual(testCases[i].expected);
                expect(value).toEqual(testCases[i].expectedValue);
            }
        });

        it('Batch 2', function () {
            // given
            var testCases = [
                {
                    given: '2*(x+x^2)^2+3*(x^2+x)^2',
                    expected: '5*(x+x^2)^2',
                    expectedValue: '211.9005'
                },
                {
                    given: '2*(x+x^2)^2+2*(x+x^2)^3+4*(x+x^2)^2',
                    expected: '2*(x+x^2)^3+6*(x+x^2)^2',
                    expectedValue: '806.069502'
                },
                {
                    given: '2*x^2+3*x+y+y^2',
                    expected: '2*x^2+3*x+y+y^2',
                    expectedValue: '29.31'
                },
                {
                    given: '(y+y^2)^6+y',
                    expected: '(y+y^2)^6+y',
                    expectedValue: '8163841.198203676'
                },
                {
                    given: '2*(x+x^2)+(y+y^2)^6+y',
                    expected: '(y+y^2)^6+2*x+2*x^2+y',
                    expectedValue: '8163854.218203676'
                },
                {
                    given: '2*(x+x^2)+4',
                    expected: '2*x+2*x^2+4',
                    expectedValue: '17.02'
                },
                {
                    given: '2*(x+x^2)+48*x*y',
                    expected: '2*(x+x^2)+48*x*y',
                    expectedValue: '345.66'
                },
                {
                    given: '2*(x+x^2)+(48+x+2*y)',
                    expected: '2*x^2+3*x+2*y+48',
                    expectedValue: '69.72'
                },
                {
                    given: '(x^2+1)-1',
                    expected: 'x^2',
                    expectedValue: '4.41'
                },
                {
                    given: '(x^2+1)-1+x+x^3+x',
                    expected: '2*x+x^2+x^3',
                    expectedValue: '17.871000000000002'
                },
                {
                    given: '5+(x^2+y+1)+(x+y+15)',
                    expected: '2*y+21+x+x^2',
                    expectedValue: '34.11'
                },
                {
                    given: '(x^2+y+1)+(x+y+15)+(x^2+y+1)',
                    expected: '17+2*x^2+x+3*y',
                    expectedValue: '37.82'
                },
                {
                    given: '(x^2+y+1)+(x+x^2)',
                    expected: '1+2*x^2+x+y',
                    expectedValue: '15.22'
                },
                {
                    given: '(1+(1+x)^2)',
                    expected: '(1+x)^2+1',
                    expectedValue: '10.610000000000001'
                },
                {
                    given: '(x+x)^x',
                    expected: '2^x*x^x',
                    expectedValue: '20.36214425352342'
                },
                {
                    given: '1/4*2^x*x^x',
                    expected: '(1/4)*2^x*x^x',
                    expectedValue: '5.090536063380855'
                },
                {
                    given: 'x^2+x-x^y+x',
                    expected: '-x^y+2*x+x^2',
                    expectedValue: '-2.9597419502414644'
                },
                {
                    given: 'x^x+x^x-1-2*x^x',
                    expected: '-1',
                    expectedValue: '-1'
                },
                {
                    given: 'x^x+x^x-1-2*x^x+2*y+1-2*y',
                    expected: '0',
                    expectedValue: '0'
                },
                {
                    given: '(x+1)-x*y-5+2*x*y',
                    expected: '-4+x+x*y',
                    expectedValue: '5.03'
                },
                {
                    given: '(2*x-y+7-x+y-x-5)*2+15/3',
                    expected: '9',
                    expectedValue: '9'
                },
                {
                    given: '(x+x^2)^x*x',
                    expected: '(x+x^2)^x*x',
                    expectedValue: '107.33450820142282'
                },
                {
                    given: '(x+x^2)^x*(x+x^x)',
                    expected: '(x+x^2)^x*(x+x^x)',
                    expectedValue: '350.09644568327894'
                },
                {
                    given: '(x+x^2)^x*(x+x^2)',
                    expected: '(x+x^2)^(1+x)',
                    expectedValue: '332.7369754244108'
                },
                {
                    given: '(x+x^2)^2*x',
                    expected: '(x+x^2)^2*x',
                    expectedValue: '88.99821'
                },
                {
                    given: '(z+z^2)^x*(x+y^2+1)',
                    expected: '(1+x+y^2)*(z+z^2)^x',
                    expectedValue: '59.976442963530964'
                },
                {
                    given: '(x+1)/(x+1)',
                    expected: '1',
                    expectedValue: '1'
                },
                {
                    given: 'x*y*z/(x*y*z)',
                    expected: '1',
                    expectedValue: '1'
                },
                {
                    given: 'x^y/x^y',
                    expected: '1',
                    expectedValue: '1'
                },
                {
                    given: '4*x^2',
                    expected: '4*x^2',
                    expectedValue: '17.64'
                },
                {
                    given: '5*x^y/x^y',
                    expected: '5',
                    expectedValue: '5'
                },
                {
                    given: '(x+x^6)^y/(x+x^6)^y',
                    expected: '1',
                    expectedValue: '1'
                },
                {
                    given: '2^y*2^y',
                    expected: '2^(2*y)',
                    expectedValue: '97.00586025666546'
                },
                {
                    given: '2^x',
                    expected: '2^x',
                    expectedValue: '4.2870938501451725'
                },
                {
                    given: '((x^3+x)^x*(x^2+x)^x+1)*x',
                    expected: '((x+x^2)^x*(x+x^3)^x+1)*x',
                    expectedValue: '17667.12052556627'
                }
            ];

            for (var i = 0; i < testCases.length; ++i) {
                // when
                var parsed = nerdamer(testCases[i].given);
                var value = parsed.evaluate(values).text('decimals');

                // then
                expect(parsed.toString()).toEqual(testCases[i].expected);
                expect(value).toEqual(testCases[i].expectedValue);
            }
        });

        it('Batch 3', function () {
            var testCases = [
                {
                    given: '(8*x)^(2/3)',
                    expected: '4*x^(2/3)',
                    expectedValue: '6.559531991200272'
                },
                {
                    given: '(y^3+2)/(z^4*(y^3/2))^2*cos(x)*sqrt(x)',
                    expected: '4*(2+y^3)*(y^3*z^4)^(-2)*cos(x)*sqrt(x)',
                    expectedValue: '-0.08596229340057991'
                },
                {
                    given: '2*x^4*(1+log(x)^2)-(-x^4)',
                    expected: '2*(1+log(x)^2)*x^4+x^4',
                    expectedValue: '79.75553102441935'
                },
                {
                    given: '(x^6)^(1/4)',
                    expected: 'abs(x)^(3/2)',
                    expectedValue: '3.043189116699782'
                },
                {
                    given: '2*x*(4^(1/3))^3',
                    expected: '8*x',
                    expectedValue: '16.8'
                },
                {
                    given: '6*(4^(1/3)*4^(2/3))',
                    expected: '24',
                    expectedValue: '24'
                },
                {
                    given: '(5*(4^(1/3)))^3',
                    expected: '500',
                    expectedValue: '500'
                },
                {
                    given: '2*x*(5*(4^(1/3)))^3',
                    expected: '1000*x',
                    expectedValue: '2100'
                },
                {
                    given: 'y^y^y',
                    expected: 'y^y^y',
                    expectedValue: '4.568487550256372e+26'
                },
                {
                    given: '(x^4)^(1/4)',
                    expected: 'abs(x)',
                    expectedValue: '2.1'
                },
                {
                    given: '(-2*x)^2',
                    expected: '4*x^2',
                    expectedValue: '17.64'
                },
                {
                    given: '-4*x^3--x^3+x^2-(-2*x)^2+y',
                    expected: '-3*x^2-3*x^3+y',
                    expectedValue: '-37.713'
                },
                {
                    given: '2*x/x',
                    expected: '2',
                    expectedValue: '2'
                },
                {
                    given: '(x^2*y)^2',
                    expected: '(x^2*y)^2',
                    expectedValue: '211.78980900000002'
                },
                {
                    given: '(x+1)^(z+1)*(1+x)^(1+z)',
                    expected: '(1+x)^(2+2*z)',
                    expectedValue: '92.35210000000002'
                },
                {
                    given: '(x+1)^(z+1)*(1+x)^4',
                    expected: '(1+x)^(5+z)',
                    expectedValue: '887.5036810000004'
                },
                {
                    given: '(-1)^x',
                    expected: '(-1)^x',
                    expectedValue: '(-1)^2.1'
                },
                {
                    given: '(-25)^(1/5)',
                    expected: '(-1)^(1/5)*5^(2/5)',
                    expectedValue: '-1.9036539387158786'
                },
                {
                    given: '(x+y)--(x+y)',
                    expected: '2*x+2*y',
                    expectedValue: '10.8'
                },
                {
                    given: '-z-(r+x)--(r+x)',
                    expected: '-z',
                    expectedValue: '-1'
                },
                {
                    given: '+-z-(r+x)+--+(r+x)',
                    expected: '-z',
                    expectedValue: '-1'
                },
                {
                    given: '(x)^(3-x)',
                    expected: 'x^(-x+3)',
                    expectedValue: '1.9498327706486203'
                },
                {
                    given: '(1/2*x)^(1/2)',
                    expected: 'sqrt(2)^(-1)*sqrt(x)',
                    expectedValue: '1.02469507659596'
                },
                {
                    given: '256^(1/8)',
                    expected: '2',
                    expectedValue: '2'
                },
                {
                    given: '-2*256^(1/8)',
                    expected: '-4',
                    expectedValue: '-4'
                },
                {
                    given: '(81*(x*y)^2+9*x*y)+(9*x*y)',
                    expected: '18*x*y+81*x^2*y^2',
                    expectedValue: '4014.7568999999994'
                },
                {
                    given: '((x)^(1/2)*x^(1/3))-x^(5/6)',
                    expected: '0',
                    expectedValue: '0'
                },
                {
                    given: '(9*y*x+1)^3',
                    expected: '(1+9*x*y)^3',
                    expectedValue: '254478.51475299997'
                },
                {
                    given: '(81*(x*y)^2+9*x*y)*(9*x*y)',
                    expected: '9*(81*x^2*y^2+9*x*y)*x*y',
                    expectedValue: '246510.37095299995'
                },
                {
                    given: '2*((81*(x*y)^2+9*x*y))*(5*(9*x*y))',
                    expected: '90*(81*x^2*y^2+9*x*y)*x*y',
                    expectedValue: '2465103.7095299996'
                }
            ];

            for (var i = 0; i < testCases.length; ++i) {
                // when
                var parsed = nerdamer(testCases[i].given);
                var value = parsed.evaluate(values).text('decimals');

                // then
                expect(parsed.toString()).toEqual(testCases[i].expected);
                expect(value).toEqual(testCases[i].expectedValue);
            }
        });
    });
});
