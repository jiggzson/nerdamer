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
                given: 'laplace(sinh(t)*e^t, t, s)',
                expected: '(1/2)*(-s+2)^(-1)+(1/2)*s^(-1)'
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
    