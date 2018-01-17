'use strict';

var nerdamer = require('../nerdamer.core.js');
require('../Algebra.js');

describe('Algebra', function () {
    it('should perform gcd and lcm operations correctly', function () {
        // given
        var testCases = [
            {
                given:'5*x^6+5*x^5+27*x^4+27*x^3+28*x^2+28*x, 5*x^3+7*x',
                expected_gcd: '5*x^3+7*x',
                expected_lcm: '27*x^3+27*x^4+28*x+28*x^2+5*x^5+5*x^6'
            },
            {
                given:'2*x^2+2*x+1,x+1',
                expected_gcd: '1',
                expected_lcm: '(1+2*x+2*x^2)*(1+x)'
            }, 
            {
                given:'x^2+2*x+1,x+1',
                expected_gcd: '1+x',
                expected_lcm: '1+2*x+x^2'
            }, 
            {
                given:'6*x^9+24*x^8+15*x^7+6*x^2+24*x+15, (2*x^2+8*x+5)',
                expected_gcd: '2*x^2+8*x+5',
                expected_lcm: '15+15*x^7+24*x+24*x^8+6*x^2+6*x^9'
            },
            {
                given:'x^8+4*x^7+4*x^6+3*x^5+12*x^4+12*x^3, (x^3+3)',
                expected_gcd: '3+x^3',
                expected_lcm: '12*x^3+12*x^4+3*x^5+4*x^6+4*x^7+x^8'
            },
            {
                given:'6*x^9+24*x^8+15*x^7+6*x^2+24*x+15, x^7+1',
                expected_gcd: '1+x^7',
                expected_lcm: '15+15*x^7+24*x+24*x^8+6*x^2+6*x^9'
            },
            {
                given:'1+x^2,2*x',
                expected_gcd: '1',
                expected_lcm: '2*(1+x^2)*x'
            },
            //Start TODO: Simplify answers
            {
                given:'84*x^4+147*x^3+16*x^2+28*x, 44*x^5+77*x^4+16*x^3+28*x^2+12*x+21',
                expected_gcd: '4*x+7',
                expected_lcm: '(12*x+16*x^3+28*x^2+44*x^5+77*x^4+21)*(147*x^3+16*x^2+28*x+84*x^4)*(4*x+7)^(-1)'
            },
            {
                given:'5*x^11+90*x^9+361*x^7+473*x^5+72*x^3+91*x, 7150*x^12+9360*x^10+1375*x^9+1430*x^8+37550*x^7+1872*x^6+47075*x^5+7510*x^3+9360*x',
                expected_gcd: '5*x^5+x',
                expected_lcm: '(1375*x^9+1430*x^8+1872*x^6+37550*x^7+47075*x^5+7150*x^12+7510*x^3+9360*x+9360*x^10)*(361*x^7+473*x^5+5*x^11+72*x^3+90*x^9+91*x)*(5*x^5+x)^(-1)'
            },
            {
                given:'7*x^4+7*x^3+4*x^2+5*x+1, 21*x^6+47*x^4+80*x^3+20*x^2+49*x+11',
                expected_gcd: '1+4*x+7*x^3',
                expected_lcm: '(1+4*x+7*x^3)^(-1)*(1+4*x^2+5*x+7*x^3+7*x^4)*(11+20*x^2+21*x^6+47*x^4+49*x+80*x^3)'
            },
            {
                given:'5*x^11+90*x^9+361*x^7+473*x^5+72*x^3+91*x, 7150*x^12+9360*x^10+1375*x^9+1430*x^8+37550*x^7+1872*x^6+47075*x^5+7510*x^3+9360*x,x',
                expected_gcd: 'x',
                expected_lcm: '(1375*x^9+1430*x^8+1872*x^6+37550*x^7+47075*x^5+7150*x^12+7510*x^3+9360*x+9360*x^10)*(361*x^7+473*x^5+5*x^11+72*x^3+90*x^9+91*x)*(5*x^6+x^2)^(-1)*x'
            },
            {
                given:'x^8+4*x^7+4*x^6+3*x^5+12*x^4+12*x^3, (x^3+3), 3+x^3',
                expected_gcd: '3+x^3',
                expected_lcm: '(12*x^3+12*x^4+3*x^5+4*x^6+4*x^7+x^8)*(3+x^3)^2*(6*x^3+x^6+9)^(-1)'
            },
            //End TODO
            {
                given:'a, b, c',
                expected_gcd: 'gcd(a,b,c)',
                expected_lcm: 'a*b*c*gcd(a*b,a*c,b*c)^(-1)'
            },
            {
                given:'18,12, 6',
                expected_gcd: '6',
                expected_lcm: '36'
            },
            {
                given:'3, 5, 7',
                expected_gcd: '1',
                expected_lcm: '105'
            },
            {
                given:'1/2, 1/3, 1/4',
                expected_gcd: '1/12',
                expected_lcm: '1'
            },
            {
                given:'5%, 15%, 25%',
                expected_gcd: '1/20',
                expected_lcm: '3/4'
            },
            {
                given:'1/a, 1/b, 1/c',
                expected_gcd: 'gcd(a^(-1),b^(-1),c^(-1))',
                expected_lcm: '1'
            },
            {
                given:'2^x, 6^x',
                expected_gcd: '2^x',
                expected_lcm: '6^x'
            }, 
            {   //TODO: fix expected_lcm
                given:'a, b, c, gcd(x, y, z, gcd(f,gcd(g,h)))',
                expected_gcd: 'gcd(a,b,c,x,y,z,f,g,h)',
                expected_lcm: 'a*b*c*gcd(x,y,z,f,g,h)'
            },
            {
                given:'2^x, 6^x',
                expected_gcd: '2^x',
                expected_lcm: '6^x'
            },
            {   //TODO: remove duplicates
                given:'a,a,b,b,gcd(c,c)',
                expected_gcd: '1',
                expected_lcm: 'a^2*b^2*c*gcd(a^2*b^2,a^2*b*c,a^2*b*c,a*b^2*c,a*b^2*c)^(-1)'
            },
            {   //TODO: remove duplicates
                given:'a,a',
                expected_gcd: 'a',
                expected_lcm: 'a^2*gcd(a,a)^(-1)'
            },
            {   //TODO: fix expected_lcm, should be a^(b+c)
                given:'a^b,a^c',
                expected_gcd: 'a',
                expected_lcm: 'a^(-1+b+c)'
            },
            {
                given:'a^c,b^c',
                expected_gcd: '1',
                expected_lcm: 'a^c*b^c'
            },
            {
                given:'a^a,a^a',
                expected_gcd: 'a^a',
                expected_lcm: 'a^a'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var result_gcd = nerdamer("gcd(" + testCases[i].given + ")");
            var result_lcm = nerdamer("lcm(" + testCases[i].given + ")");

            // then
            expect(result_gcd.toString()).toEqual(testCases[i].expected_gcd);
            expect(result_lcm.toString()).toEqual(testCases[i].expected_lcm);
        }
    });
    
    describe('isPoly', function () {
        it('should detect polynomials', function () {
            // given
            var testCases = [
                {
                    given: '51',
                    expected: true
                }, 
                {
                    given: 'x^2+1',
                    expected: true
                }, 
                {
                    given: '51/x',
                    expected: false
                }, 
                {
                    given: 'x^2+1/x',
                    expected: false
                }, 
                {
                    given: 'y*x^2+1/x',
                    expected: false
                }, 
                {
                    given: 'y*x^2+x',
                    expected: true
                }, 
                {
                    given: '7*y*x^2+z*x+4',
                    expected: true
                }, 
                {
                    given: '7*y*x^2+z*x^-1+4',
                    expected: false
                }, 
                {
                    given: 'sqrt(5*x)+7',
                    expected: false
                }, 
                {
                    given: 'abs(5*x^3)-x+7',
                    expected: false
                }, 
                {
                    given: 'cos(x)^2+cos(x)+1',
                    expected: false
                },
                {
                    given: 'sqrt(97)x^2-sqrt(13)x+sqrt(14)x+sqrt(43)x^2+sqrt(3)*sqrt(101)',
                    expected: true
                },
                {
                    given: '-5 sqrt(14)x-14x^2 sqrt(83)',
                    expected: true
                },
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
            }, 
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
            }, 
            {
                given: 'div(2*a*b*x+2*a*b*y+a^2*x+a^2*y+b^2*x+b^2*y, x+y)',
                expected: '[2*a*b+a^2+b^2,0]'
            },
            {
                given: 'divide(a*b^(-1)+b^(-1)*c,a+c)',
                expected: 'b^(-1)'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var result = nerdamer(testCases[i].given);

            // then
            expect(result.toString()).toEqual(testCases[i].expected);
        }
    });

    /** #3: "(a-b)^2 - (b-a)^2" not simplifying. */
    it('should simplify to 0', function () {
      // given
      var formula = '(a-b)^2-(b-a)^2';

      // when
      var result = nerdamer(formula, null, ['numer', 'expand']).toString();

      // then
      expect(result).toBe('0');
    });

    /** #40: Expected more simple solution for factoring. */
    it('should use simple factor result', function () {
      // given
      var formula = 'factor(x^2+x+1/4)';

      // when
      var result = nerdamer(formula).toString();

      // then
      expect(result).toBe('(1+2*x)^2*(1/4)');
    });

    /** #43: Formula not expanded. */
    it('should expand formula', function () {
      // given
      var formula = 'expand((x+5)(x-3)-x^2)';

      // when
      var result = nerdamer(formula).toString();

      // then
      expect(result).toBe('-15+2*x');
    });

    it('should factor correctly', function () {
        // given
        var testCases = [
            {
                given: 'factor(x^2+2*x+1)',
                expected: '(1+x)^2'
            }, 
            {
                given: 'factor(x^2-y^2)',
                expected: '(-y+x)*(x+y)'
            }, 
            {
                given: 'factor(a^2*x^2-b^2*y^2)',
                expected: '(-b*y+a*x)*(a*x+b*y)'
            }, 
            {
                given: 'factor(x^2-6*x+9-4*y^2)',
                expected: '(-2*y-3+x)*(-3+2*y+x)'
            }, 
            {
                given: 'factor(b^6+3*a^2*b^4+3*a^4*b^2+a^6)',
                expected: '(a^2+b^2)^3'
            }, 
            {
                given: 'factor(b^6+12*a^2*b^4+48*a^4*b^2+64*a^6)',
                expected: '((9007199254740996/2251799813685249)*a^2+b^2)^3' //fix rounding error
            }, 
            {
                given: 'factor(c^6+3*b^2*c^4+3*a^2*c^4+3*b^4*c^2+6*a^2*b^2*c^2+3*a^4*c^2+b^6+3*a^2*b^4+3*a^4*b^2+a^6)',
                expected: '(a^2+b^2+c^2)^3' 
            }, 
            {
                given: 'factor(x^4+25*x^3+234*x^2+972*x+1512)',
                expected: '(6+x)^3*(7+x)'
            }, 
            {
                given: 'factor(x^5+32*x^4+288*x^3-418*x^2-16577*x-55902)',
                expected: '(-7+x)*(11+x)^3*(6+x)'
            }, 
            {
                given: 'factor(x^2*y*z+x*z+t*x^2*y+t*x)',
                expected: '(1+x*y)*(t+z)*(x)'
            },
            {
                given: 'factor(x^2*y+x^2)',
                expected: '(1+y)*x^2'
            },
            {
                given: 'factor(sqrt(4*x^2*y+4*x^2))',
                expected: '(2)*(abs(x))*(sqrt(1+y))'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var result = nerdamer(testCases[i].given);

            // then
            expect(result.toString()).toEqual(testCases[i].expected);
        }
    });
    
    it('should correctly determine the polynomial degree', function () {
        // given
        var testCases = [
            {
                given: 'deg(x^2+2*x+x^5)',
                expected: '5'
            }, 
            {
                given: 'deg(x^2+2*x+x^x)',
                expected: 'max(2,x)'
            }, 
            {
                given: 'deg(x^2+2*x+cos(x))',
                expected: '2'
            }, 
            {
                given: 'deg(x^a+x^b+x^c,x)',
                expected: 'max(a,b,c)'
            }, 
            {
                given: 'deg(a*x^2+b*x+c,x)',
                expected: '2'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var result = nerdamer(testCases[i].given);

            // then
            expect(result.toString()).toEqual(testCases[i].expected);
        }
    });
    
    it('should correctly peform partial fraction decomposition', function () {
        // given
        var testCases = [
            {
                given: 'partfrac((3*x+2)/(x^2+x), x)',
                //expected: '(1+x)^(-1)+2*(x)^(-1)' //old output
                expected: '(1+x)^(-1)+2*x^(-1)'
            }, 
            {
                given: 'partfrac((17*x-53)/(x^2-2*x-15), x)',
                expected: '13*(3+x)^(-1)+4*(-5+x)^(-1)'
            }, 
            {
                given: 'partfrac((x^3+2)/(x+1)^2,x)',
                expected: '(1+x)^(-2)+3*(1+x)^(-1)-2+x'
            }, 
            {
                given: 'partfrac(x/(x-1)^2, x)',
                expected: '(-1+x)^(-1)+(-1+x)^(-2)'
            }, 
            {
                given: 'partfrac((x^2+1)/(x*(x-1)^3), x)',
                expected: '(-1+x)^(-1)+2*(-1+x)^(-3)-x^(-1)'
            }, 
            {
                given: 'partfrac((17-53)/(x^2-2*x-15), x)',
                expected: '(-9/2)*(-5+x)^(-1)+(9/2)*(3+x)^(-1)'
            },
            {
                given: 'partfrac(1/(x^6-1),x)',
                //this result is in expanded form and future versions should avoid this.
                expected: '(-1/3)*(-x+x^2+1)^(-1)+(-1/3)*(1+x+x^2)^(-1)+(-1/6)*(1+x)^(-1)+(-1/6)*(1+x+x^2)^(-1)*x+(1/6)*(-1+x)^(-1)+(1/6)*(-x+x^2+1)^(-1)*x'
            },
            {
                given: 'partfrac((3*x^2-3*x-8)/((x-5)*(x^2+x-4)),x)',
                expected: '(-4+x+x^2)^(-1)*x+2*(-5+x)^(-1)'
            },
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var result = nerdamer(testCases[i].given);

            // then
            expect(result.toString()).toEqual(testCases[i].expected);
        }
    });
    
    it('should prime factor correctly', function () {
        // given
        var testCases = [
            {
                given: 'pfactor(100!)',
                expected: '(11^9)*(13^7)*(17^5)*(19^5)*(23^4)*(29^3)*(2^97)*(31^3)*(37^2)*(3^48)*(41^2)*(43^2)*(47^2)*(53)*(59)*(5^24)*(61)*(67)*(71)*(73)*(79)*(7^16)*(83)*(89)*(97)'
            }, 
            {
                given: 'pfactor(100)',
                expected: '(2^2)*(5^2)'
            }, 
            {
                given: 'pfactor(8)',
                expected: '(2^3)'
            }, 
            {
                given: 'pfactor(999999999999)',
                expected: '(101)*(11)*(13)*(37)*(3^3)*(7)*(9901)'
            }, 
            {
                given: 'pfactor(1000000005721)',
                expected: '(1000000005721)'
            }, 
            {
                given: 'pfactor(1000000005721092)',
                expected: '(131)*(212044106387)*(2^2)*(3^2)'
            }, 
            {
                given: 'pfactor(-10000000114421840327308)',
                expected: '(-2^2)*(480827)*(7)*(8345706745687)*(89)'
            }, 
            {
                given: 'pfactor(-7877474663)',
                expected: '(-97)*(180871)*(449)'
            },
            {
                given: 'pfactor(15!+1)',
                expected: '(46271341)*(479)*(59)'
            },
            {
                given: 'pfactor(15!+11!)',
                expected: '(11)*(181^2)*(2^8)*(3^4)*(5^2)*(7)'
            },
            {
                given: 'pfactor(product(n!,n,1,10))',
                expected: '(2^38)*(3^17)*(5^7)*(7^4)'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var result = nerdamer(testCases[i].given);

            // then
            expect(result.toString()).toEqual(testCases[i].expected);
        }
    });
    
    it('should get coeffs', function () {
        // given
        var testCases = [
            {
                given: 'coeffs(x^2+2*x+1, x)',
                expected: '[1,2,1]'
            }, 
            {
                given: 'coeffs(a*b*x^2+c*x+d, x)',
                expected: '[d,c,a*b]'
            }, 
            {
                given: 'coeffs(t*x, x)',
                expected: '[0,t]'
            }, 
            {
                given: 'coeffs(b*(t*x-5), x)',
                expected: '[-5*b,b*t]'
            },
            {
                given: 'coeffs(a*x^2+b*x+c+x, x)',
                expected: '[c,1+b,a]'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var result = nerdamer(testCases[i].given);

            // then
            expect(result.toString()).toEqual(testCases[i].expected);
        }
    });
    
    it('should calculate the line function', function () {
        // given
        var testCases = [
            {
                given: 'line([1,2], [3,4])',
                expected: '1+x'
            }, 
            {
                given: 'line([a1,b1], [a2,b2], t)',
                expected: '(-a1+a2)^(-1)*(-b1+b2)*t-(-a1+a2)^(-1)*(-b1+b2)*a1+b1'
            }, 
            
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var result = nerdamer(testCases[i].given);

            // then
            expect(result.toString()).toEqual(testCases[i].expected);
        }
    });
});
