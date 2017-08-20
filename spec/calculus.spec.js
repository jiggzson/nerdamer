'use strict';

var nerdamer = require('../nerdamer.core.js');

describe('calculus', function () {

    it('should differentiate correctly', function () {
        // given
        var testCases = [
            {
                given: 'diff(cos(x),x)',
                expected: '-sin(x)'
            },
            {
                given: 'diff(log(x),x)',
                expected: 'x^(-1)'
            },
            {
                given: 'diff(tan(x),x)',
                expected: 'sec(x)^2'
            },
            {
                given: 'diff(4*tan(x)*sec(x),x)',
                expected: '4*(sec(x)*tan(x)^2+sec(x)^3)'
            },
            {
                given: 'diff(sqrt(7),x)',
                expected: '0'
            },
            {
                given: 'diff(4,x)',
                expected: '0'
            },
            {
                given: 'diff(x^2,x)',
                expected: '2*x'
            },
            {
                given: 'diff(2*x^2+4,x)',
                expected: '4*x'
            },
            {
                given: 'diff(sqrt(x)*x,x)',
                expected: '(3/2)*x^(1/2)'
            },
            {
                given: 'diff(sqrt(x)-1/sqrt(x),x)',
                expected: '(1/2)*x^(-1/2)+(1/2)*x^(-3/2)'
            },
            {
                given: 'diff(x^2/3-3/x^2,x)',
                expected: '(2/3)*x+6*x^(-3)'
            },
            {
                given: 'diff(sqrt(x)*(x^2+1),x)',
                expected: '(1/2)*(1+x^2)*x^(-1/2)+2*x^(3/2)'
            },
            {
                given: 'diff(e^x/(e^x-1),x)',
                expected: '(-1+e^x)^(-1)*e^x-(-1+e^x)^(-2)*e^(2*x)'
            },
            {
                given: 'diff(e^x,x)',
                expected: 'e^x'
            },
            {
                given: 'diff(e^x/x,x)',
                expected: '-e^x*x^(-2)+e^x*x^(-1)'
            },
            {
                given: 'diff(tan(x)*log(1/cos(x)),x)',
                expected: '-(-cos(x)^(-1)*sin(x)*tan(x)+log(cos(x))*sec(x)^2)'
            },
            {
                given: 'diff((2*x)^(e),x)',
                expected: '2^e*e*x^(-1+e)'
            },
            {
                given: 'diff(2*cos(x)*log(x),x)',
                expected: '2*(-log(x)*sin(x)+cos(x)*x^(-1))'
            },
            {
                given: 'diff(cos(5*x)*log(sec(sqrt(cos(x^(4/5))^2))/y^2)*y,x)',
                expected: '(-4/5)*abs(cos(x^(4/5)))^(-1)*cos(x^(4/5))*sec(abs(cos(x^(4/5))))*sin(x^(4/5))*tan(abs(cos(x^(4/5))))*x^(-1/5)*y^(-2)*cos(5*x)' +
                          '*sec(abs(cos(x^(4/5))))^(-1)*y^3-5*log(sec(abs(cos(x^(4/5))))*y^(-2))*sin(5*x)*y'
            },
            {
                given: 'diff(x*cos(x)^log(x),x)',
                expected: '(-cos(x)^(-1)*log(x)*sin(x)+log(cos(x))*x^(-1))*cos(x)^log(x)*x+cos(x)^log(x)'
            },
            {
                given: 'diff(cos(2*x),x)',
                expected: '-2*sin(2*x)'
            },
            {
                given: 'diff(cos(x)*tan(x),x)',
                expected: '-sin(x)*tan(x)+cos(x)*sec(x)^2'
            },
            {
                given: 'diff(sec(sqrt(cos(x^(4/5))^2)),x)',
                expected: '(-4/5)*abs(cos(x^(4/5)))^(-1)*cos(x^(4/5))*sec(abs(cos(x^(4/5))))*sin(x^(4/5))*tan(abs(cos(x^(4/5))))*x^(-1/5)'
            },
            {
                given: 'diff(log(log(log(cos(t*t)^z))),t)',
                expected: '-2*cos(t^2)^(-1)*sin(t^2)*t*z*log(cos(t^2))^(-1)*log(log(cos(t^2))*z)^(-1)*z^(-1)'
            },
            {
                given: 'diff(6*log(x)^(3*log(x^2)),x)',
                expected: '36*(log(log(x))*x^(-1)+x^(-1))*log(x)^(6*log(x))'
            },
            {
                given: 'diff(sinh(x^2)^cos(x),x)',
                expected: '(-log(sinh(x^2))*sin(x)+2*cos(x)*cosh(x^2)*sinh(x^2)^(-1)*x)*sinh(x^2)^cos(x)'
            },
            {
                given: 'diff(tan(x)*tanh(x),x)',
                expected: 'sec(x)^2*tanh(x)+sech(x)^2*tan(x)'
            },
            {
                given: 'diff(4*x*tan(x)*7*tanh(x),x)',
                expected: '28*(sec(x)^2*tanh(x)*x+sech(x)^2*tan(x)*x+tan(x)*tanh(x))'
            },
            {
                given: 'diff(y*tan(y)*7*tanh(y),x)',
                expected: '0'
            },
            {
                given: 'diff(yx*tan(y)*7*tanh(y),x)',
                expected: '0'
            },
            {
                given: 'diff(y,x)',
                expected: '0'
            },
            {
                given: 'diff(x*y,x)',
                expected: 'y'
            },
            {
                given: 'diff([sin(x), x^2, x],x)',
                expected: '[cos(x),2*x,1]'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
        }
    });

    it('should calculate sums correctly', function () {
        // given
        var testCases = [
            {
                given: 'sum(x+y, x, 0, 3)',
                expected: '4*y+6'
            },
            {
                given: 'sum(x^2+x, x, 0, 10)',
                expected: '440'
            },
            {
                given: 'sum(x^2*z^2+x*y-z+1, x, 0, 10)',
                expected: '-11*z+385*z^2+11+55*y'
            },
            {
                given: 'sum(x^2*z^2+x*y-z+1, z, 0, 10)',
                expected: '-44+11*x*y+385*x^2'
            },
            {
                given: 'sum(sqrt(x)*sin(x), x, 0, 10)',
                expected: '775334583/372372283'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
        }
    });

    it('should integrate properly', function () {
        // given
        var testCases = [
            {
                given: 'integrate(sin(x), x)',
                expected: '-cos(x)'
            },
            {
                given: 'integrate(cos(x), x)',
                expected: 'sin(x)'
            },
            {
                given: 'integrate(2*x^2+x, x)',
                expected: '(1/2)*x^2+(2/3)*x^3'
            },
            {
                given: 'integrate(log(x), x)',
                expected: '-x+log(x)*x'
            },
            {
                given: 'integrate(sqrt(x), x)',
                expected: '(2/3)*x^(3/2)'
            },
            {
                given: 'integrate(asin(a*x), x)',
                expected: 'a^(-1)*sqrt(-(a*x)^2+1)+asin(a*x)*x'
            },
            {
                given: 'integrate(a/x, x)',
                expected: 'a*log(x)'
            },
            {
                given: 'integrate(x*e^x, x)',
                expected: '-e^x+e^x*x'
            },
            {
                given: 'integrate(x^3*log(x), x)',
                expected: '(-1/16)*x^4+(1/4)*log(x)*x^4'
            },
            {
                given: 'integrate(x^2*sin(x), x)',
                expected: '-cos(x)*x^2+2*cos(x)+2*sin(x)*x'
            },
            {
                given: 'integrate(sin(x)*log(cos(x)), x)',
                expected: '-cos(x)*log(cos(x))+cos(x)'
            },
            {
                given: 'integrate(x*asin(x), x)',
                expected: '(-1/4)*asin(x)+(1/2)*asin(x)*x^2+(1/4)*cos(asin(x))*sin(asin(x))'
            },
            {
                given: 'integrate(q/((2-3*x^2)^(1/2)), x)',
                expected: 'asin(3*sqrt(6)^(-1)*x)*q*sqrt(3)^(-1)'
            },
            {
                given: 'integrate(1/(a^2+x^2), x)',
                expected: 'a^(-1)*atan(a^(-1)*x)'
            },
            {
                given: 'integrate(11/(a+5*r*x)^2,x)',
                expected: '(-11/5)*(5*r*x+a)^(-1)*r^(-1)'
            },
            {
                given: 'integrate(cos(x)*sin(x), x)',
                expected: '(-1/2)*cos(x)^2'
            },
            {
                given: 'integrate(x*cos(x)*sin(x), x)',
                expected: '(-1/2)*cos(x)^2*x+(1/4)*cos(x)*sin(x)+(1/4)*x'
            },
            {
                given: 'integrate(t/(a*x+b), x)',
                expected: 'a^(-1)*log(a*x+b)*t'
            },
            {
                given: 'integrate(x*(x+a)^3, x)',
                expected: '(1/2)*a^3*x^2+(1/5)*x^5+(3/4)*a*x^4+a^2*x^3'
            },
            {
                given: 'integrate(4*x/(x^2+a^2), x)',
                expected: '2*log(a^2+x^2)'
            },
            {
                given: 'integrate(1/(x^2+3*a^2), x)',
                expected: 'a^(-1)*atan(a^(-1)*sqrt(3)^(-1)*x)*sqrt(3)^(-1)'
            },
            {
                given: 'integrate(8*x^3/(6*x^2+3*a^2), x)',
                expected: '8*((-1/24)*a^2*log(2*x^2+a^2)+(1/12)*x^2)'
            },
            {
                given: 'integrate(10*q/(4*x^2+24*x+20), x)',
                expected: '10*((-1/16)*log(5+x)+(1/16)*log(1+x))*q'
            },
            {
                given: 'integrate(x/(x+a)^2, x)',
                expected: '(a+x)^(-1)*a+log(a+x)'
            },
            {
                given: 'integrate(sqrt(x-a), x)',
                expected: '(2/3)*(-a+x)^(3/2)'
            },
            {
                given: 'integrate(x^n*log(x), x)',
                expected: '(1+n)^(-1)*log(x)*x^(1+n)-(1+n)^(-2)*x^(1+n)'
            },
            {
                given: 'integrate(3*a*sec(x)^2, x)',
                expected: '3*a*tan(x)'
            },
            {
                given: 'integrate(a/(x^2+b*x+a*x+a*b),x)', //uglier for but still correct
                expected: '(((-a^(-1)*b+1)^(-1)*a^(-2)*b+a^(-1))*log(b+x)-(-a^(-1)*b+1)^(-1)*a^(-1)*log(a+x))*a'
            },
            {
                given: 'integrate(log(a*x+b),x)',
                expected: '-x+a^(-1)*b*log(a*x+b)+log(a*x+b)*x'
            },
            {
                given: 'integrate(x*log(x),x)',
                expected: '(-1/4)*x^2+(1/2)*log(x)*x^2'
            },
            {
                given: 'integrate(log(a*x)/x,x)',
                expected: '(1/2)*log(a*x)^2'
            },
            {
                given: 'integrate(log(x)^2,x)',
                expected: '-2*log(x)*x+2*x+log(x)^2*x'
            },
            {
                given: 'integrate(t*log(x)^3,x)',
                expected: '(-3*log(x)^2*x-6*x+6*log(x)*x+log(x)^3*x)*t'
            },
            {
                given: 'integrate(e^x*sin(x),x)',
                expected: '(1/2)*(-cos(x)*e^x+e^x*sin(x))'
            },
            {
                given: 'integrate(e^x*sin(x),x)',
                expected: '(1/2)*(-cos(x)*e^x+e^x*sin(x))'
            },
            {
                given: 'integrate(e^(2*x)*sin(x),x)',
                expected: '(4/5)*((-1/4)*cos(x)*e^(2*x)+(1/2)*e^(2*x)*sin(x))'
            },
            {
                given: 'integrate(e^(2*x)*sin(x)*x,x)',
                expected: '(-3/25)*e^(2*x)*sin(x)+(4/25)*cos(x)*e^(2*x)+(4/5)*((-1/4)*cos(x)*e^(2*x)+(1/2)*e^(2*x)*sin(x))*x'
            },
            {
                given: 'integrate(x*log(x)^2,x)',
                expected: '(-1/2)*log(x)*x^2+(1/2)*log(x)^2*x^2+(1/4)*x^2'
            },
            {
                given: 'integrate(x^2*log(x)^2,x)',
                expected: '(-2/9)*log(x)*x^3+(1/3)*log(x)^2*x^3+(2/27)*x^3'
            },
            {
                given: 'integrate(x^2*e^(a*x),x)',
                expected: '-2*(-a^(-2)*e^(a*x)+a^(-1)*e^(a*x)*x)*a^(-1)+a^(-1)*e^(a*x)*x^2'
            },
            {
                given: 'integrate(8*e^(a*x^2),x)',
                expected: '4*erf(sqrt(-a)*x)*sqrt(-a)^(-1)*sqrt(pi)'
            },
            {
                given: 'integrate(5*x*e^(-8*a*x^2),x)',
                expected: '(-5/16)*a^(-1)*e^(-8*a*x^2)'
            },
            {
                given: 'integrate(x^2*sin(x),x)',
                expected: '-cos(x)*x^2+2*cos(x)+2*sin(x)*x'
            },
            {
                given: 'integrate(8*tan(b*x)^2,x)',
                expected: '8*(-x+b^(-1)*tan(b*x))'
            },
            {
                given: 'integrate(sec(a*x)^3,x)',
                expected: '(1/2)*a^(-1)*log(sec(a*x)+tan(a*x))+(1/2)*a^(-1)*sec(a*x)*tan(a*x)'
            },
            {
                given: 'integrate(sec(a*x)*tan(a*x),x)',
                expected: 'a^(-1)*sec(a*x)'
            },
            {
                given: 'integrate(3*a*cot(a*x)^4, x)',
                expected: '3*((-1/3)*a^(-1)*cot(a*x)^3+a^(-1)*cot(a*x)+x)*a'
            },
            {
                given: 'integrate(3*a*csc(a*x)^4, x)',
                expected: '3*((-1/3)*a^(-1)*cot(a*x)*csc(a*x)^2+(-2/3)*a^(-1)*cot(a*x))*a'
            },
            {
                given: 'integrate(1/8*a*2/(x^3+13*x^2+47*x+35),x)',
                expected: '(1/4)*((-1/8)*log(5+x)+(1/12)*log(7+x)+(1/24)*log(1+x))*a'
            },
            {
                given: 'integrate(a*2/(x^2+x),x)',
                expected: '2*(-log(1+x)+log(x))*a'
            },
            {
                given: 'integrate((x+7)/(x+1)^3,x)',
                expected: '(-1/2)*(1+x)^(-1)+(-7/2)*(1+x)^(-2)+(-1/2)*(1+x)^(-2)*x'
            },
            {
                given: 'integrate((3*x+2)/(x^2+x),x)',
                expected: '2*log(x)+log(1+x)'
            },
            {
                given: 'integrate([sin(x), x^2, x],x)',
                expected: '[-cos(x),(1/3)*x^3,(1/2)*x^2]'
            },
            {
                given: 'integrate(sinh(x),x)',
                expected: 'cosh(x)'
            },
            {
                given: 'integrate(cosh(x),x)',
                expected: 'sinh(x)'
            },
            {
                given: 'integrate(tanh(x),x)',
                expected: 'log(cosh(x))'
            },
            {
                given: 'integrate(sinh(x)*x,x)',
                expected: '-sinh(x)+cosh(x)*x'
            },
            {
                given: 'integrate((x^6+x^2-7)/(x^2+11), x)',
                expected: '(-11/3)*x^3+(1/5)*x^5+122*x-1349*atan(sqrt(11)^(-1)*x)*sqrt(11)^(-1)'
            },
            {
                given: 'integrate(x^6/(x^2+11), x)',
                expected: '(-11/3)*x^3+(1/5)*x^5+121*x-1331*atan(sqrt(11)^(-1)*x)*sqrt(11)^(-1)'
            },
            {
                given: 'integrate(x^2/(x^2+11))',
                expected: '-11*atan(sqrt(11)^(-1)*x)*sqrt(11)^(-1)+x'
            },
            {
                given: 'integrate(tan(x)*csc(x), x)',
                expected: 'log(sec(x)+tan(x))'
            },
            {
                given: 'integrate(sinh(x)*e^x, x)',
                expected: '(-1/2)*x+(1/4)*e^(2*x)'
            },
            {
                given: 'integrate(sinh(x)*cos(x), x)',
                expected: '(-1/4)*e^(-x)*sin(x)+(1/4)*cos(x)*e^(-x)+(1/4)*cos(x)*e^x+(1/4)*e^x*sin(x)'
            },
            {
                given: 'integrate(cos(x^2), x)',
                expected: 'integrate(cos(x^2),x)'
            },
            {
                given: 'integrate(sqrt(a-x^2)*x^2, x)',
                expected: '((-1/16)*cos(2*asin(sqrt(a)^(-1)*x))*sin(2*asin(sqrt(a)^(-1)*x))+(1/8)*asin(sqrt(a)^(-1)*x))*a^2'
            },
            {
                given: 'integrate((1-x^2)^(3/2), x)',
                expected: '(-3/16)*cos(2*asin(x))*sin(2*asin(x))+(-x^2+1)^(3/2)*x+(3/8)*asin(x)'
            },
            {
                given: 'integrate((1-x^2)^(3/2)*x^2, x)',
                expected: '(-1/32)*cos(2*asin(x))*sin(2*asin(x))+(-1/48)*cos(2*asin(x))^2*sin(2*asin(x))+(1/16)*asin(x)+(1/48)*sin(2*asin(x))'
            },
            {
                given: 'integrate(cos(x)^2*sin(x)^4, x)',
                expected: '(-1/32)*cos(2*x)*sin(2*x)+(-1/48)*sin(2*x)+(1/16)*x+(1/48)*cos(2*x)^2*sin(2*x)'
            },
            {
                given: 'integrate(log(a*x+1)/x^2, x)',
                expected: '(-log(1+a*x)+log(x))*a-log(1+a*x)*x^(-1)'
            },
            {
                given: 'integrate(x^2*(1-x^2)^(5/2), x)',
                expected: '(-1/128)*cos(2*asin(x))^3*sin(2*asin(x))+(-1/48)*cos(2*asin(x))^2*sin(2*asin(x))+(-3/256)*cos(2*asin(x))*sin(2*asin(x))+(1/48)*sin(2*asin(x))+(5/128)*asin(x)'
            },
            {
                given: 'integrate(1/tan(a*x)^n, x)',
                expected: 'integrate(tan(a*x)^(-n),x)'
            },
            {
                given: 'integrate(sin(x)^2*cos(x)*tan(x), x)',
                expected: '(-3/4)*cos(x)+(1/12)*cos(3*x)'
            },
            {
                given: 'integrate(cos(x)^2/sin(x),x)',
                expected: '-log(cot(x)+csc(x))+cos(x)'
            },
            {
                given: 'integrate(cos(x)/x,x)',
                expected: 'Ci(x)'
            },
            {
                given: 'integrate(sin(x)/x,x)',
                expected: 'Si(x)'
            },
            {
                given: 'integrate(log(x)^3/x,x)',
                expected: '(1/4)*log(x)^4'
            },
            {
                given: 'integrate(tan(x)^2*sec(x), x)',
                expected: '(-1/2)*log(sec(x)+tan(x))+(1/2)*sec(x)*tan(x)'
            },
            {
                given: 'integrate(tan(x)/cos(x),x)',
                expected: 'cos(x)^(-1)'
            },
            {
                given: 'integrate(sin(x)^3/x,x)',
                expected: '(1/4)*(-Si(3*x)+3*Si(x))'
            },
            {
                given: 'integrate(tan(x)/sec(x)*sin(x)/tan(x),x)',
                expected: '(-1/2)*cos(x)^2'
            },
            {
                given: 'integrate(log(x)^n/x,x)',
                expected: '(1+n)^(-1)*log(x)^(1+n)'
            },
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
        }
    });

    it('should handle minus sign properly', function () {
        // given
        var cases = [
            {
                given: '0-4',
                expected: '-4'
            },
            {
                given: '-(4)',
                expected: '-4'
            },
            {
                given: '3*-(4)',
                expected: '-12'
            },
            {
                given: '-3*-(4)',
                expected: '12'
            },
            {
                given: '-(3*-(4))',
                expected: '12'
            },
            {
                given: '-(-3*-(4))',
                expected: '-12'
            },
            {
                given: '-(3)-3',
                expected: '-6'
            },
            {
                given: '3^-1^-1',
                expected: '1/3'
            },
            {
                given: '-1',
                expected: '-1'
            },
            {
                given: '--1',
                expected: '1'
            },
            {
                given: '8-1',
                expected: '7'
            },
            {
                given: '(-1)',
                expected: '-1'
            },
            {
                given: '-(1)-1',
                expected: '-2'
            },
            {
                given: '-(-1-1)',
                expected: '2'
            },
            {
                given: '-(-1-+1)^2',
                expected: '-4'
            },
            {
                given: '-(-1-1+1)',
                expected: '1'
            },
            {
                given: '-(1)--(1-1--1)',
                expected: '0'
            },
            {
                given: '-(-(1))-(--1)',
                expected: '0'
            },
            {
                given: '5^-3',
                expected: '1/125'
            },
            {
                given: '5^---3',
                expected: '1/125'
            },
            {
                given: '5^-(1--2)',
                expected: '1/125'
            },
            {
                given: '5^-(++1+--+2)',
                expected: '1/125'
            },
            {
                given: '(5^-(++1+--+2))^-2',
                expected: '15625'
            },
            {
                given: '(5^-3^2)',
                expected: '1/1953125'
            },
            {
                given: '(5^-3^-2)',
                expected: '5^(-1/9)'
            },
            {
                given: '-(5^-3^-2)^-3',
                expected: '-5^(1/3)'
            },
            {
                given: '-(--5*--7)',
                expected: '-35'
            },
            {
                given: '(-1)^(3/4)',
                expected: '(-1)^(3/4)'
            }
        ];

        for (var k in cases) {
            // when
            var parsed = nerdamer(cases[k].given);

            // then
            expect(parsed.toString()).toEqual(cases[k].expected);
        }
    });
});
