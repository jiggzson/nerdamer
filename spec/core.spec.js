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

    it('should handle trigonometric functions', function () {
        // given
        var testCases = [
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
                expectedValue: '0.18041483808986802'
            },
            {
                given: 'x^2+2*cos(x)+cos(x+8+5*x)+4*x^2',
                expected: '2*cos(x)+5*x^2+cos(6*x+8)',
                expectedValue: '22.230414838089867'
            },
            {
                given: 'cos(pi)',
                expected: '-1',
                expectedValue: '-1'
            },
            {
                given: 'cos(x)',
                expected: 'cos(x)',
                expectedValue: '-0.5048461045998576'
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
                given: 'sin(x)',
                expected: 'sin(x)',
                expectedValue: '0.8632093666488737'
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
                given: 'tan(x)',
                expected: 'tan(x)',
                expectedValue: '-1.7098465429045073'
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
            var value = parsed.evaluate(values).text('decimals');

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
            {
                given: 'sqrt(-x)',
                expected: 'sqrt(-x)',
                expectedValue: 'sqrt(-x)'
            },
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