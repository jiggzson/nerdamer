'use strict';

var nerdamer = require('../nerdamer.core.js');

describe('build', function () {

    var values = [
        2.1, 3.3, 1
    ];

    it('should honor argument order', function () {
        // given
        var testCases = [
            {
                given: '-x^2+1',
                params: ['x'],
                one_expected: -3.41,
                two_expected: -3.41
            },
            {
                given: '-x^2+y',
                params: ['y', 'x'],
                one_expected: -1.1100000000000003,
                two_expected: -8.79
            },
            {
                given: '5*(cos(x^2)+y)',
                params: ['y', 'x'],
                one_expected: 15.010991793381834,
                two_expected: 9.973108618869924
            },
            {
                given: 'sec(z)+5*(cos(x^2)+y)',
                params: ['z', 'y', 'x'],
                one_expected: 16.86180751106276,
                two_expected: 17.220709873373476
            },
            {
                given: '(sec(z)+5*(cos(x^2)+y))^2-x',
                params: ['z', 'y', 'x'],
                one_expected: 282.22055254013253,
                two_expected: 295.5528485429027
            },
            {
                given: '(x+1)+(y+2)+(z+3)',
                params: ['z', 'y', 'x'],
                one_expected: 12.399999999999999,
                two_expected: 12.4
            },
            {
                given: '(((x+1)+(y+2))^2+(z+3))^x',
                params: ['z', 'y', 'x'],
                one_expected: 8555.83476461652,
                two_expected: 58.39
            },
            {
                given: 'sqrt(x)*sqrt(5)',
                params: ['x'],
                one_expected: 3.2403703492039306,
                two_expected: 3.2403703492039306
            },
            {
                given: 'abs(-x)-x',
                params: ['x'],
                one_expected: 0,
                two_expected: 0
            },
            {
                given: 'sec(x)+tan(z)^2+ceil(y)',
                params: ['z', 'x', 'y'],
                one_expected: 4.444717164847537,
                two_expected: 2.910896226522566
            },
            {
                given: 'mod(y,2)',
                params: ['y'],
                one_expected: 0.10000000000000009,
                two_expected: 0.10000000000000009
            },
            {
                given: 'fact(6)*min(x, y)*z',
                params: ['x','z','y'],
                one_expected: 1512,
                two_expected: 2376
            },
            {
                given: '((x+y)^2+(y+2)+(z+3))^(x+y)',
                params: ['x', 'z', 'y'],
                one_expected: 362284798.5739877,
                two_expected: 9072.850179772464
            },
            {
                given: 'asin(0.2)+atan(0.1)+acosh(y)',
                params: ['y'],
                one_expected: 1.6738857175240727,
                two_expected: 1.6738857175240727
            },
            {
                given: '(sin(z)*cos(y))^(tan(2)+1)',
                params: ['y', 'z'],
                one_expected: 20.054910364061293,
                two_expected: 20.054910364061293
            },
            {
                given: 'cos(x+tan(x+sin(x)))^2',
                params: ['x'],
                one_expected: 0.1168736998021759,
                two_expected: 0.1168736998021759
            },
            {
                given: '4*(s^2+t^2)*s',
                params: ['s', 't'],
                one_expected: 128.52,
                two_expected: 128.52
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);
            var f1 = parsed.buildFunction();
            var f2 = parsed.buildFunction(testCases[i].params);

            // then
            expect(f1.apply(null, values)).toEqual(testCases[i].one_expected);
            expect(f2.apply(null, values)).toEqual(testCases[i].two_expected);
        }
    });
});