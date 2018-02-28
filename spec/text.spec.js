'use strict';

var nerdamer = require('../nerdamer.core.js');

describe('The text function', function () {
    it('should give mixed fractions correctly', function () {
        // given
        var testCases = [
            {
                given: '6',
                expected: '6'
            },
            {
                given: '-5',
                expected: '-5'
            },
            {
                given: '1/1',
                expected: '1'
            },
            {
                given: '1/5',
                expected: '1/5'
            },
            {
                given: '-1/5',
                expected: '-1/5'
            },
            {
                given: '1/-5',
                expected: '-1/5'
            },
            {
                given: '6/5',
                expected: '1+1/5'
            },
            {
                given: '-6/5',
                expected: '-1-1/5'
            },
            {
                given: '6/5a',
                expected: '(1+1/5)*a'
            },
            {
                given: 'a/5',
                expected: '(1/5)*a'
            },
            {
                given: '1/a',
                expected: 'a^(-1)'
            },
            {
                given: '1/1',
                expected: '1'
            },
            {
                given: '(2x)/(3y)',
                expected: '(2/3)*x*y^(-1)'
            },
            {
                given: '(3x)/(2y)',
                expected: '(1+1/2)*x*y^(-1)'
            },
            {
                given: '(2x)/(-3y)',
                expected: '(-2/3)*x*y^(-1)'
            },
            {
                given: '(3x)/(-2y)',
                expected: '(-1-1/2)*x*y^(-1)'
            },
            {
                given: '(10/-8)a^(-9/6)',
                expected: '(-1-1/4)*a^(-1-1/2)'
            },
            {
                given: '1/2+3/4',
                expected: '1+1/4'
            },
            {
                given: '2/3+4/7',
                expected: '1+5/21'
            },
            {
                given: '100-46/47-98/43-67/44',
                expected: '95+19517/88924'
            },
            {
                given: '1+2-2/3+3/4-4/5+5/6-6/7+7/8-8/9+9/10-10/11',
                expected: '2+6557/27720'
            },
            {
                given: '20*30/46',
                expected: '13+1/23'
            },
        ];
        for (var i = 0; i < testCases.length; ++i) {
            // when
            var text = nerdamer(testCases[i].given).text('mixed');
            // then
            expect(text).toEqual(testCases[i].expected);
        }
    });
});
