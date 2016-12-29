'use strict';

var nerdamer = require('../nerdamer.core.js');

describe('Nerdamer core', function () {

    var values = {
        x: 2.1,
        y: 3.3,
        z: 1,
        a: 7.42
    };

    it('should handle errors', function () {
        // given
        var formula1 = '0/0';
        var formula2 = '0^0';

        // when / then
        expect(function () { nerdamer(formula1) }).toThrowError();
        expect(function () { nerdamer(formula2) }).toThrowError();
    });

    it('should perform simple arithmetic', function () {
        // given
        var testCases = [
            {
                given: '((((((1+1))))))',
                expected: '2',
                expectedValue: '2'
            }, {
                given: '((((((1+1))+4)))+3)',
                expected: '9',
                expectedValue: '9'
            }, {
                given: '1+1',
                expected: '2',
                expectedValue: '2'
            }, {
                given: '4^2',
                expected: '16',
                expectedValue: '16'
            }, {
                given: '2*-4',
                expected: '-8',
                expectedValue: '-8'
            }, {
                given: '2+(3/4)',
                expected: '11/4',
                expectedValue: '2.75'
            }, {
                given: '2/3+2/3',
                expected: '4/3',
                expectedValue: '1.3333333333333333'
            }, {
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
                expectedValue: '106.30761744975752'
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
            }, {
                given: 'expand((x+5)*(x-3)-x^2)',
                expected: '-15+2*x',
                expectedValue: '-10.8'
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

    it('should compute powers', function () {
        // given
        var testCases = [
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
               expected: 'fact(1+x^2)',
               expectedValue: '245.1516183677083'
           },
           {
               given: '10!',
               expected: 'fact(10)',
               expectedValue: '3628800'
           },
           {
               given: 'x!',
               expected: 'fact(x)',
               expectedValue: '2.197620278392476'
           },
           {
               given: 'x!*x!',
               expected: 'fact(x)^2',
               expectedValue: '4.829534888001823'
           },
           {
               given: '3*(1+x!*x!)',
               expected: '3*(1+fact(x)^2)',
               expectedValue: '17.488604664005468'
           },
           {
               given: '3*(1+x!*x!)!',
               expected: '3*fact(1+fact(x)^2)',
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
                    expectedValue: '24.394945720635707'
                },
                {
                    given: '((3+y)*2-(cos(x)*4+z))',
                    expected: '-4*cos(x)-z+2*y+6',
                    expectedValue: '13.61938441839943'
                },
                /* TODO jiggzson: Results in NaN
                {
                    given: 'cos(x^2)*cos(x^2)^x',
                    expected: 'cos(x^2)^(1+x)',
                    expectedValue: '0.02339774318212161*(-1)^3.1'
                }*/
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
                expectedValue: '64.57530677085668'
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
                expectedValue: '5578547747455546'
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

            /* TODO jiggzson: results in 2*NaN
            {
                given: '(256*i)^(1/8)',
                expected: '2*(-1)^(1/16)',
                expectedValue: '2*(-1)^(1/16)'
            },*/
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

    // TODO jiggzson: Does not work
    xit('should handle powers with results using i', function () {
        // given
        var testCases = [
            {
                given: '(-2/3*x)^x',
                expected: '(-x)^x*2^x*3^(-x)',
                expectedValue: '1.9278587+0.626399264*i'
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
                    expectedValue: '29.309999999999995'
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
                    expectedValue: '59.97644296353096'
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
                /* TODO jiggzson: Does not match expectedValue
                {
                    given: '(-1)^x',
                    expected: '(-1)^x',
                    expectedValue: '-1'
                },*/
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
                    expected: 'sqrt(2)^(-1)*x^(1/2)',
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