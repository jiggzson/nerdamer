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
                given: 'laplace(a*t^2, t, s)',
                expected: '2*a*s^(-3)'
            },
            {
                given: 'laplace(2*sqrt(t), t, s)',
                expected: 's^(-3/2)*sqrt(pi)'
            },
            //TODO: Place all of the below in more familiar form. Is related to expand
            {
                given: 'laplace(e^(a*t), t, s)',
                expected: '-(-s+a)^(-1)'
            },
            {
                given: 'laplace(sin(a*t), t, s)',
                expected: '(1+a^2*s^(-2))^(-1)*a*s^(-2)'
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
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
        }
    });
    
});
    