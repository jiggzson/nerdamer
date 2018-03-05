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
                expected: '0.2'
            },
            {
                given: '-1/5',
                expected: '-0.2'
            },
            {
                given: '1/-5',
                expected: '-0.2'
            },
            {
                given: '6/5',
                expected: '1.2'
            },
            {
                given: '-6/5',
                expected: '-1.2'
            },
            {
                given: '6/5a',
                expected: '1.2*a'
            },
            {
                given: 'a/5',
                expected: '0.2*a'
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
                expected: '0.'6'*x*y^(-1)'
            },
            {
                given: '(3x)/(2y)',
                expected: '1.5*x*y^(-1)'
            },
            {
                given: '(2x)/(-3y)',
                expected: '-0.'6'*x*y^(-1)'
            },
            {
                given: '(3x)/(-2y)',
                expected: '-1.5*x*y^(-1)'
            },
            {
                given: '(10/-8)a^(-9/6)',
                expected: '-1.25*a^-1.5'
            },
            {
                given: '1/2+3/4',
                expected: '1.25'
            },
            {
                given: '2/3+4/7',
                expected: '1.'238095''
            },
            {
                given: '100-46/47-98/43-67/44',
                expected: '95+19517/88924'
                /*9 4 7 9 5 5 5 5 7 5 5 4 7 6 5 8 6 7 4 8 2 3 4 4 4 7 3 9 3 2 7 9 6 5 4 5 3 6 4 5 8 0 9 9 0 5 0 8 7 4 9 0 4 4 1 2 7 5 6 9 6 1 0 0 0 4 0 4 8 4 0 0 8 8 1 6 5 1 7 4 7 5 5 9 7 1 3 9 1 3 0 0 4 3 6 3 2 7 6 5 0 5 7 8 0 2 1 6 8 1 4 3 5 8 3 2 8 4 6 0 2 5 8 1 9 8 0 1 1 7 8 5 3 4 4 7 8 8 8 0 8 4 2 0 6 7 3 8 3 3 8 3 5 6 3 4 9 2 4 2 0 4 9 3 9 0 4 9 0 7 5 6 1 5 1 3 2 0 2 2 8 5 0 9 7 3 8 6 5 3 2 3 1 9 7 3 3 7 0 5 1 8 6 4 5 1 3 5 1 7 1 6 0 7 2 1 5 1 5 0 0 1 5 7 4 3 7 8 1 2 0 6 4 2 3 4 6 2 7 3 2 2 2 0 7 7 2 7 9 4 7 4 6 0 7 5 3 0 0 2 5 6 3 9 8 7 2 2 5 0 4 6 1 0 6 7 8 7 8 1 8 8 1 1 5 6 9 4 3 0 0 7 5 1 2 0 3 2 7 4 7 0 6 4 9 0 9 3 6 0 8 0 2 4 8 3 0 1 9 2 0 7 4 1 3 0 7 1 8 3 6 6 2 4 5 3 3 3 0 9 3 4 2 8 0 9 5 9 0 2 1 1 8 6 6 3 1 2 8 0 6 4 4 1 4 5 5 6 2 5 0 2 8 1 1 3 8 9 5 0 1 1 4 7 0 4 6 9 1 6 4 6 7 9 9 5 1 4 1 9 1 8 9 4 2 0 1 7 9 0 2 9 2 8 3 4 3 3 0 4 3 9 4 7 6 4 0 6 8 1 9 3 0 6 3 7 3 9 8 2 2 7 7 0 0 0 5 8 4 7 6 9 0 1 6 2 3 8 5 8 5 7 5 8 6 2 5 3 4 2 9 8 9 5 1 9 1 3 9 9 3 9 7 2 3 8 0 9 0 9 5 4 0 7 3 1 4 1 1 0 9 2 6 1 8 4 1 5 7 2 5 7 8 8 3 1 3 6 1 6 1 2 1 6 3 1 9 5 5 3 7 7 6 2 5 8 3 7 7 9 4 0 7 1 3 4 1 8 1 9 9 8 1 1 0 7 4 6 2 5 5 2 2 9 1 8 4 4 7 2 1 3 3 5 0 7 2 6 4 6 3 0 4 7 0 9 6 3 9 6 9 2 3 2 1 5 3 2 9 9 4 4 6 7 1 8 5 4 6 1 7 4 2 6 1 1 6 6 8 3 9 0 9 8 5 5 6 0 7 0 3 5 2 2 1 0 8 7 6 7 0 3 7 0 2 0 3 7 6 9 5 1 1 0 4 3 1 3 7 9 6 0 5 0 5 6 0 0 2 8 7 8 8 6 2 8 4 9 1 7 4 5 7 6 0 4 2 4 6 3 2 2 7 0 2 5 3 2 4 9 9 6 6 2 6 3 3 2 5 9 8 6 2 3 5 4 3 7 0 0 2 3 8 4 0 5 8 2 9 6 9 7 2 6 9 5 7 8 5 1 6 4 8 5 9 8 8 0 3 4 7 2 6 2 8 3 1 1 8 1 6 8 3 2 3 5 1 2 2 1 2 6 7 5 9 9 2 9 8 2 7 7 1 8 0 5 1 3 6 9 7 0 8 9 6 4 9 5 8 8 4 1 2 5 7 7 0 3 2 0 7 2 3 3 1 4 2 9 0 8 5 5 1 1 2 2 3 0 6 6 8 8 8 5 7 9 0 1 1 2 9 0 5 4 0 2 3 6 6 0 6 5 4 0 4 1 6 5 3 5 4 6 8 4 8 9 9 4 6 4 7 1 1 4 3 8 9 8 1 6 0 2 2 6 7 1 0 4 4 9 3 7 2 4 9 7 8 6 3 3 4 3 9 7 9 1 2 8 2 4 4 3 4 3 4 8 4 3 2 3 6 9 2 1 4 1 6 0 4 0 6 6 3 9 3 7 7 4 4 5 9 0 8 8 6 5 9 9 7 9 3 0 8 1 7 3 2 7 1 5 5 7 7 3 4 6*/
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
