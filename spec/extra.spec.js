/* global expect */

'use strict';

var nerdamer = require('../nerdamer.core.js');
require('../Extra');

describe('calculus', function () {
    
    it('should transform Laplace correctly', function () {
        // given
        var testCases = [
            {
                given: 'laplace(5, t, s)',
                expected: '5*s^(-1)'
            },
            {
                given: 'laplace(a*t, t, s)',
                expected: 'a*s^(-2)'
            },
            {
                given: 'laplace(cos(a*t), t, s)',
                expected: '(a^2+s^2)^(-1)*s'
            },
            {
                given: 'laplace(cos(x), t, s)',
                expected: 'cos(x)*s^(-1)'
            },
            {
                given: 'laplace(sinh(a*t), t, s)',
                expected: '(-a^2+s^2)^(-1)*a'
            },
            {
                given: 'laplace(a*t^2, t, s)',
                expected: '2*a*s^(-3)'
            },
            {
                given: 'laplace(2*sqrt(t), t, s)',
                expected: 's^(-3/2)*sqrt(pi)'
            },
            {
                given: 'laplace(x*e^(a*t), t, s)',
                expected: '(-a+s)^(-1)*x'
            },
            {
                given: 'laplace(x*(sin(a*t)-a*t*cos(a*t)), t, s)',
                expected: '((a^2+s^2)^(-1)*a-((1+a^2*s^(-2))^(-2)*s^(-2)-(1+a^2*s^(-2))^(-2)*a^2*s^(-4))*a)*x'
            },
            {
                given: 'laplace(sin(a*t), t, s)',
                expected: '(a^2+s^2)^(-1)*a'
            },
            {
                given: 'laplace(t*sin(a*t), t, s)',
                expected: '2*(1+a^2*s^(-2))^(-2)*a*s^(-3)'
            },
            {
                given: 'laplace(sin(a*t+b), t, s)',
                expected: '(1+a^2*s^(-2))^(-1)*a*cos(b)*s^(-2)+(1+a^2*s^(-2))^(-1)*s^(-1)*sin(b)'
            },
            {
                given: 'laplace(t^2*e^(a*t), t, s)',
                expected: '-2*(-s+a)^(-3)'
            },
            {
                given: 'laplace(6*t*e^(-9*t)*sin(6*t), t, s)',
                expected: '-72*(-9-s)^(-3)*(1+36*(-9-s)^(-2))^(-2)'
            },
            {
                //NOTE: this unit test was incorrect before. I don't know how this was missed.
                given: 'laplace(sinh(t)*e^t, t, s)',
                expected: '(-1/2)*(-s+2)^(-1)+(-1/2)*s^(-1)'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
        }
    });
    
    it('should invert a Laplace transform correctly', function () {
        // given
        var testCases = [
            {
                given: 'ilt(a/(b*x), x, t)',
                expected: 'a*b^(-1)'
            },
            {
                given: 'ilt(a*6/(b*s^6),s,t)',
                expected: '(1/20)*a*b^(-1)*t^5'
            },
            {
                given: 'ilt(3*s/(4*s^2+5),s,t)',
                expected: '(3/4)*cos((1/2)*sqrt(5)*t)'
            },
            {
                given: 'ilt(2/(3*s^2+1),s,t)',
                expected: '2*sin((1/3)*sqrt(3)*t)*sqrt(3)^(-1)'
            },
            {
                given: 'ilt(5*sqrt(pi)/(3*s^(3/2)),s,t)',
                expected: '(10/3)*sqrt(t)'
            },
            {
                given: 'ilt(3/(7*s^2+1)^2, s, t)',
                expected: '(-3/14)*cos((1/7)*sqrt(7)*t)*t+(3/2)*sin((1/7)*sqrt(7)*t)*sqrt(7)^(-1)'
            },
            {
                given: 'ilt(5*s/(s^2+4)^2, s, t)',
                expected: '(5/4)*sin(2*t)*t'
            },
            {
                given: 'ilt(8*s^2/(2*s^2+3)^2, s, t)',
                expected: '2*sin((1/2)*sqrt(6)*t)*sqrt(6)^(-1)+cos((1/2)*sqrt(6)*t)*t'
            },
            {
                given: 'ilt((6*s^2-1)/(4*s^2+1)^2, s, t)',
                expected: '(1/8)*sin((1/2)*t)+(5/16)*cos((1/2)*t)*t'
            },
            {
                given: 'ilt((5*(sin(1)*s+3*cos(1)))/(s^2+9),s, t)',
                expected: '5*cos(1)*sin(3*t)+5*cos(3*t)*sin(1)'
            },
            {
                //TODO: Although this is computed correctly we need to get rid of the silly factorial(0)^(-1)
                given: 'ilt(((s+1)*(s+2)*(s+3))^(-1), s, t)',
                expected: '(1/2)*e^(-3*t)*factorial(0)^(-1)+(1/2)*e^(-t)*factorial(0)^(-1)-e^(-2*t)*factorial(0)^(-1)'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
        }
    });
    
    it('should calculate mode correctly', function () {
        // given
        var testCases = [
            {
                given: 'mode(r,r,r,r)',
                expected: 'r'
            },
            {
                given: 'mode(1,2)',
                expected: 'mode(1,2)'
            },
            {
                given: 'mode(1,2,3,1,2)',
                expected: 'mode(1,2)'
            },
            {
                given: 'mode(1,1,2)',
                expected: '1'
            },
            {
                given: 'mode(a,a,b,c,a,b,d)',
                expected: 'a'
            },
            {
                given: 'mode(x, r+1, 21, tan(x), r+1)',
                expected: '1+r'
            },
            {
                given: 'mode(x, r+1, 21, tan(x), r+1, x)',
                expected: 'mode(1+r,x)'
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
    