'use strict';

var nerdamer = require('../nerdamer.core.js');
require('../Algebra.js');

describe('Algebra', function () {
    it('should perform gcd operations correctly', function () {
        // given
        var testCases = [
            {
                given:'gcd(5*x^6+5*x^5+27*x^4+27*x^3+28*x^2+28*x, 5*x^3+7*x)',
                expected: '5*x^3+7*x'
            }, {
                given:'gcd(2*x^2+2*x+1,x+1)',
                expected: '1'
            }, {
                given:'gcd(x^2+2*x+1,x+1)',
                expected: '1+x'
            }, {
                given:'gcd(6*x^9+24*x^8+15*x^7+6*x^2+24*x+15, (2*x^2+8*x+5))',
                expected: '2*x^2+8*x+5'
            }, {
                given:'gcd(x^8+4*x^7+4*x^6+3*x^5+12*x^4+12*x^3, (x^3+3))',
                expected: '3+x^3'
            }, {
                given:'gcd(6*x^9+24*x^8+15*x^7+6*x^2+24*x+15, x^7+1)',
                expected: '1+x^7'
            }, {
                given:'gcd(1+x^2,2*x)',
                expected: '1'
            }, {
                given:'gcd(84*x^4+147*x^3+16*x^2+28*x, 44*x^5+77*x^4+16*x^3+28*x^2+12*x+21)',
                expected: '4*x+7'
            }, {
                given:'gcd(5*x^11+90*x^9+361*x^7+473*x^5+72*x^3+91*x, 7150*x^12+9360*x^10+1375*x^9+1430*x^8+37550*x^7+1872*x^6+47075*x^5+7510*x^3+9360*x)',
                expected: '5*x^5+x'
            }, {
                given:'gcd(7*x^4+7*x^3+4*x^2+5*x+1, 21*x^6+47*x^4+80*x^3+20*x^2+49*x+11)',
                expected: '1+4*x+7*x^3'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var result = nerdamer(testCases[i].given);

            // then
            expect(result.toString()).toEqual(testCases[i].expected);
        }
    });

    describe('isPoly', function () {
        it('should detect polynomials', function () {
            // given
            var testCases = [
                {
                    given: '51',
                    expected: true
                }, {
                    given: 'x^2+1',
                    expected: true
                }, {
                    given: '51/x',
                    expected: false
                }, {
                    given: 'x^2+1/x',
                    expected: false
                }, {
                    given: 'y*x^2+1/x',
                    expected: false
                }, {
                    given: 'y*x^2+x',
                    expected: true
                }, {
                    given: '7*y*x^2+z*x+4',
                    expected: true
                }, {
                    given: '7*y*x^2+z*x^-1+4',
                    expected: false
                }, {
                    given: 'sqrt(5*x)+7',
                    expected: false
                }, {
                    given: 'abs(5*x^3)-x+7',
                    expected: false
                }, {
                    given: 'cos(x)^2+cos(x)+1',
                    expected: false
                }
            ];

            for (var i = 0; i < testCases.length; ++i) {
                // when
                var result = nerdamer(testCases[i].given);

                // then
                expect(result.symbol.isPoly(true)).toEqual(testCases[i].expected);
            }
        });

        it('should evaluate abs() directly', function () {
            // given
            var formula = 'abs(5*x^2)-x+11';

            // when
            var isPoly = nerdamer(formula).symbol.isPoly();

            // then
            expect(isPoly).toBeTruthy();
        });
    });

    it('should perform divisions', function () {
        // given
        var testCases = [
            {
                given: 'div(x^2*y^3+b*y^2+3*a*x^2*y+3*a*b, y^2+3*a)',
                expected: '[b+x^2*y,0]'
            }, {
                given: 'div(x^2, x^3)',
                expected: '[0,x^2]'
            }, {
                given: 'div(cos(x^2)^2+2*cos(x^2)+1, cos(x^2)+1)',
                expected: '[1+cos(x^2),0]'
            }, {
                given: 'div(2*x^2+2*x+1, x+1)',
                expected: '[2*x,1]'
            }, {
                given: 'div(7*x,2*x)',
                expected: '[7/2,0]'
            }, {
                given: 'div(7*b*z^2+14*y*z+14*a*x^2*z-b*t*z-2*t*y-2*a*t*x^2, 7*z-t)',
                expected: '[2*a*x^2+2*y+b*z,0]'
            }, {
                given: 'div(x^2+5, y-1)',
                expected: '[0,5+x^2]'
            }, {
                given: 'div(4*a*x^2*y^2+4*a*y^2+b*x^2+a*x^2+b+a, x^2+1)',
                expected: '[4*a*y^2+a+b,0]'
            }, {
                given: 'div(4*a*x^2*y^2+4*a*y^2+b*x^2+a*x^2+b+a+u^6+1, x^2+1)',
                expected: '[4*a*y^2+a+b,1+u^6]'
            }, {
                given: 'div(15*x^9-25*x^7-35*x^6+6*x^5+3*x^4-10*x^3-19*x^2-7*x, 3*x^3-5*x-7)',
                expected: '[2*x^2+5*x^6+x,0]'
            }, {
                given: 'div(sin(x)^2*tan(x)-4*cos(x)*tan(x)+cos(x)*sin(x)^2-4*cos(x)^2, sin(x)^2-4*cos(x)^2)',
                expected: '[cos(x)+tan(x),-4*cos(x)*tan(x)-4*cos(x)^2+4*cos(x)^3+4*cos(x)^2*tan(x)]'
            }, {
                given: 'div(y^2*z-4*x*z+x*y^2-4*x^2, y^2-4*x^2)',
                expected: '[x+z,-4*x*z-4*x^2+4*x^3+4*x^2*z]'
            }, {
                given: 'div(-5*y^2+16*a*y+5*x^4+14*a*x^2-3*a^2, 3*a-y+x^2)',
                expected: '[-a+5*x^2+5*y,0]'
            }, {
                given: 'div(y^2+2*x*y+x^2,x+y)',
                expected: '[x+y,0]'
            }, {
                given: 'div(x*y^2+x^2*y-y-x, x*y-1)',
                expected: '[x+y,0]'
            }, {
                given: 'div(y^2*z-4*x*z+x*y^2-4*x^2+x^2, y^2-4*x^2)',
                expected: '[x+z,-3*x^2+4*x^3-4*x*z+4*x^2*z]'
            }, {
                given: 'div(7*x^6*z-a*x*z+28*a*x^6*y^3-4*a^2*x*y^3+7*b*x^6-a*b*x, 4*y^3*a+z+b)',
                expected: '[-a*x+7*x^6,0]'
            }, {
                given: 'div(x^2+5, cos(x)-1)',
                expected: '[0,5+x^2]'
            }, {
                given: 'div((1+z), t*x+7)',
                expected: '[0,1+z]'
            }, {
                given: 'div(-x^2*y-y+4*a*x^2+t+4*a+6*b, x^2+1)',
                expected: '[-y+4*a,6*b+t]'
            }, {
                given: 'div(15*x^9-25*x^7-35*x^6+6*x^5+3*x^4-10*x^3-19*x^2-7*x+y, 3*x^3-5*x-7)',
                expected: '[2*x^2+5*x^6+x,y]'
            },
            /*{
                given: 'div(25*x^6*y+10*x^5*y, 5*x^2*y+3-17*x^5)',
                expected: '[2*x^3+5*x^4,-15*x^4-6*x^3+34*x^8+85*x^9]'
            },*/
            {
                given: 'div(x^2+2*x+1+u, x+1)',
                expected: '[1+x,u]'
            }, {
                given: 'div(y^3+x*y^2+x^2*y+x^3+x, x+y)',
                expected: '[x^2+y^2,x]'
            }, {
                given: 'div(b*y*z+7*x^6*z-a*x*z-7*z+4*a*b*y^4+28*a*x^6*y^3-4*a^2*x*y^3-28*a*y^3+b^2*y+7*b*x^6-a*b*x-7*b, 4*y^3*a+z+b)',
                expected: '[-7-a*x+7*x^6+b*y,0]'
            }, {
                given: 'div(b*y*z-a*x*z+4*a*b*y^4-4*a^2*x*y^3+b^2*y-a*b*x, 4*y^3*a+z+b)',
                expected: '[-a*x+b*y,0]'
            }, {
                given: 'div(17*x^3*y+3*x^2*y+34*x+6, x^2*y+2)',
                expected: '[17*x+3,0]'
            },
            /* {
                given: 'div(3*(x^2*y)+5,6*x^2*y+3*x*y+7)',
                expected: '[(1+2*x)^(-1)*x,(1+2*x)^(-1)*(3*x+5)]'
            }, */
            /* {
                given: 'div(-5*x^2+17*x^2*y+4+3*x*y, 2*x^2*y+4)',
                expected: '[(3/2)*x^(-1)+17/2,-30-5*x^2-6*x^(-1)]'
            }, */
            /* {
                given: 'div(25*x^6*y+10*x^5*y, 5*x^2*y+3-17*x^5)',
                expected: '[2*x^3+5*x^4,-15*x^4-6*x^3+34*x^8+85*x^9]'
            }, */
            {
                given: 'div(b^2*y^2+2*a*b*y^2+a^2*y^2+2*b^2*x*y+4*a*b*x*y+2*a^2*x*y+b^2*x^2+2*a*b*x^2+a^2*x^2, 2*b*y^2+2*a*y^2+4*b*x*y+4*a*x*y+2*b*x^2+2*a*x^2)',
                expected: '[(1/2)*a+(1/2)*b,0]'
            }, {
                given: 'div(2*a*b*x+2*a*b*y+a^2*x+a^2*y+b^2*x+b^2*y, x+y)',
                expected: '[2*a*b+a^2+b^2,0]'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var result = nerdamer(testCases[i].given);

            // then
            expect(result.toString()).toEqual(testCases[i].expected);
        }
    });

    // TODO jiggzson: Currently the last test case fails...
    // with xit (instead of it), a test can be disabled temporarily
    xit('should factor correctly', function () {
        // given
        var testCases = [
            {
                given: 'factor(x^2+2*x+1)',
                expected: '(1+x)^2'
            }, {
                given: 'factor(x^4+25*x^3+234*x^2+972*x+1512)',
                expected: '(6+x)^3*(7+x)'
            }, {
                given: 'factor(x^5+32*x^4+288*x^3-418*x^2-16577*x-55902)',
                expected: '(-7+x)*(11+3*x+x^2)^3*(6+x)'
            }, {
                given: 'factor(x^2*y*z+x*z+t*x^2*y+t*x)',
                expected: '(1+x*y)*(t+z)*(x)'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var result = nerdamer(testCases[i].given);

            // then
            expect(result.toString()).toEqual(testCases[i].expected);
        }
    });
});