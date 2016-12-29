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


});