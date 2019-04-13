/* global expect */

'use strict';

var nerdamer = require('../nerdamer.core.js');
require('../Solve');

describe('Solve', function () {
    
    it('should solve correctly', function () {
        // given
        var testCases = [
            {
                given: 'solve(x, x)',
                expected: '[0]'
            },
            {
                given: 'solve(5*y^x=8, x)',
                expected: '[log(8/5)*log(y)^(-1)]'
            },
            {
                given: 'solve(x^y+8=a*b, x)',
                expected: '[(-8+a*b)^y^(-1)]'
            },
            {
                given: 'solve(x^2, x)',
                expected: '[0]'
            },
            {
                given: 'solve(x^3, x)',
                expected: '[0]'
            },
            {
                given: 'solve(x+1, x)',
                expected: '[-1]'
            },
            {
                given: 'solve(x^2+1, x)',
                expected: '[i,-i]'
            },
            {
                given: 'solve(2*x^2+1, x)',
                expected: '[(1/2)*i*sqrt(2),(-1/2)*i*sqrt(2)]'
            },
            {
                given: 'solve(3*(x+5)*(x-4), x)',
                expected: '[-5,4]'
            },
            {
                given: 'solve(3*(x+a)*(x-b), x)',
                expected: '[-a,b]'
            },
            {
                given: 'solve(a*x^2+b, x)',
                expected: '[a^(-1)*i*sqrt(a)*sqrt(b),-a^(-1)*i*sqrt(a)*sqrt(b)]'
            },
            // x under square root with multiple variables
            {
                given: 'solve(a*sqrt(x+c)=b^2, x)',
                expected: '[b^4/a^2-c]'
            },
            {
                given: 'solve(b+sqrt(a*x^2-c)=c, x)',
                expected: '[sqrt((b^2 - 2 b c + c^2 + c)/a),-sqrt((b^2 - 2 b c + c^2 + c)/a)]'
            },
            {
                given: 'solve(x^2+2*x+1, x)',
                expected: '[-1]'
            },
            {
                given: 'solve(-5 sqrt(14)x-14x^2 sqrt(83)-10=0,x)',
                expected: '[(-1/28)*sqrt(-560*sqrt(83)+350)*sqrt(83)^(-1)+(-5/28)*sqrt(14)*sqrt(83)^(-1),(-5/28)*sqrt(14)*sqrt(83)^(-1)+(1/28)*sqrt(-560*sqrt(83)+350)*sqrt(83)^(-1)]'
            },
            {
                given: 'solve(-5*sqrt(14)x-14x^2*sqrt(83)-10x=0,x)',
                expected: '[(-1/28)*abs(10+5*sqrt(14))*sqrt(83)^(-1)+(-5/14)*sqrt(83)^(-1)+(-5/28)*sqrt(14)*sqrt(83)^(-1),(-5/14)*sqrt(83)^(-1)+(-5/28)*sqrt(14)*sqrt(83)^(-1)+(1/28)*abs(10+5*sqrt(14))*sqrt(83)^(-1)]'
            },
            {
                given: 'solve(a*x^2+b*x+c, x)',
                expected: '[(1/2)*(-b+sqrt(-4*a*c+b^2))*a^(-1),(1/2)*(-b-sqrt(-4*a*c+b^2))*a^(-1)]'
            },
            {
                given: 'solve(sqrt(x^3)+sqrt(x^2)-sqrt(x)=0,x)',
                expected: '[0,78202389238903801/240831735646702201]'
            },
            {
                given: 'solve(x^3-10x^2+31x-30,x)',
                expected: '[2,3,5]'
            },
            {
                given: 'solve(m*x^9+n,x)',
                expected: '[2*m^(-1/9)*n^(1/9),2*e^((2/9)*i*pi)*m^(-1/9)*n^(1/9),2*e^((4/9)*i*pi)*m^(-1/9)*n^(1/9),'+
                        '2*e^((2/3)*i*pi)*m^(-1/9)*n^(1/9),2*e^((8/9)*i*pi)*m^(-1/9)*n^(1/9),2*e^((10/9)*i*pi)*m^(-1/9)*n^(1/9),'+
                        '2*e^((4/3)*i*pi)*m^(-1/9)*n^(1/9),2*e^((14/9)*i*pi)*m^(-1/9)*n^(1/9),2*e^((16/9)*i*pi)*m^(-1/9)*n^(1/9)]'
            },
            {
                given: 'solve(sqrt(97)x^2-sqrt(13)x+sqrt(14)x+sqrt(43)x^2+sqrt(3)*sqrt(101)=0,x)',
                expected: '[(-1/2)*(sqrt(43)+sqrt(97))^(-1)*sqrt(14)+(1/2)*(sqrt(43)+sqrt(97))^(-1)'+
                        '*sqrt((-sqrt(13)+sqrt(14))^2-4*(sqrt(43)+sqrt(97))*sqrt(101)*sqrt(3))+(1/2)*'+
                        '(sqrt(43)+sqrt(97))^(-1)*sqrt(13),(-1/2)*(sqrt(43)+sqrt(97))^(-1)*sqrt((-sqrt(13)'+
                        '+sqrt(14))^2-4*(sqrt(43)+sqrt(97))*sqrt(101)*sqrt(3))+(-1/2)*(sqrt(43)+sqrt(97))^(-1)'+
                        '*sqrt(14)+(1/2)*(sqrt(43)+sqrt(97))^(-1)*sqrt(13)]'
            },
            {
                given: 'solve(cos(x), x)',
                expected: '[(-1/2)*pi,(-3/2)*pi,(3/2)*pi,-1352180071/26085593,-529064097/48116095,-571845701/72809656,-742972117/31532716,1100909798/10157405,1186473006/3058025,2330164408/10230543,363357032/2541981,486282493/6879490,529064097/48116095,571845701/72809656,700190513/17830205,742972117/31532716,828535325/15070342]'
            },
            {
                given: 'solve(cos(x)*x+1-cos(x), x)',
                expected: '[-2656223529/19001015,-302136356/39039211,-308954356/17824291,-36091008/7390861,-88830662/83379401,0,150965503/34192001,1887835580/8523467,2053282505/45052302,332594509/8463821,3498970568/8735403,392182006/35998715,406482779/5074820,467039565/19859218,738326717/6103909]'

            },
            // trig functions with multiple variables
            {
                given: 'solve(cos(b*x)=a, x)',
                expected: 'acos(a)/b' // overly simplified solution, should be x = (2 π n - acos(a))/b, n element Z or x = (acos(a) + 2 π n)/b, n element Z
            },
            {
                given: 'solve(sin(b*x)=a, x)',
                expected: 'asin(a)/b' // overly simplified solution
            },
            {
                given: 'solve(tan(b*x)=a, x)',
                expected: 'atan(a)/b' // overly simplified solution
            },
            // combined trig functions
            {
                given: 'solve(sin(cos(x^2))=a^2-b, x)',
                expected: '[sqrt(acos(asin(a^2-b))), -sqrt(acos(asin(a^2-b)))]' // overly simplified solution
            },
            {
                given: 'solve(cos(sin(a*x-b))=c, x)',
                expected: '[(asin(acos(c))+b)/a]' // unmatched domain and range between asin and acos
            },
            {
                given: 'solve(tan(sin(cos(x^2)))=c, x)',
                expected: '[sqrt(acos(asin(atan(c))), -sqrt(acos(asin(atan(c)))]' // simplified solution
            },
            {
                given: 'solve(a*x^3+b*x+c, x)',
                expected: '[(-1/3)*(27*a^2*c+sqrt(108*a^3*b^3+729*a^4*c^2))^(1/3)*2^(-1/3)*a^(-1)'+
                        '+(27*a^2*c+sqrt(108*a^3*b^3+729*a^4*c^2))^(-1/3)*2^(1/3)*b,(-1/2)*(-i*sqrt(3)+1)'+
                        '*(27*a^2*c+sqrt(108*a^3*b^3+729*a^4*c^2))^(-1/3)*2^(1/3)*a*b*a^(-1)+(1/6)*'+
                        '(1+i*sqrt(3))*(27*a^2*c+sqrt(108*a^3*b^3+729*a^4*c^2))^(1/3)*2^(-1/3)*a^(-1),'+
                        '(-1/2)*(1+i*sqrt(3))*(27*a^2*c+sqrt(108*a^3*b^3+729*a^4*c^2))^(-1/3)*2^(1/3)*'+
                        'a*b*a^(-1)+(1/6)*(-i*sqrt(3)+1)*(27*a^2*c+sqrt(108*a^3*b^3+729*a^4*c^2))^(1/3)*2^(-1/3)*a^(-1)]'
            },
            {
                given: 'solve(a*y^2*x^3-1, x)',
                expected: '[(-1/3)*(-27*a^2*y^4-27*abs(a^2*y^4))^(1/3)*2^(-1/3)*a^(-1)*y^(-2),(1/6)*'+
                        '(-27*a^2*y^4-27*abs(a^2*y^4))^(1/3)*(1+i*sqrt(3))*2^(-1/3)*a^(-1)*y^(-2),(1/6)*'+
                        '(-27*a^2*y^4-27*abs(a^2*y^4))^(1/3)*(-i*sqrt(3)+1)*2^(-1/3)*a^(-1)*y^(-2)]'
            },
            // logarithms
            {
                given: 'solve(log(x,2)+log(x,3)=log(x,5), x)',
                expected: '[1]'
            },
            {
                given: 'solve(log(x)-log(x,0.5)=log(x,-3), x)',
                expected: '[1]'
            },
            {
                given: 'solve(log(x)=a+b, x)',
                expected: '[e^(a+b)]'
            },
            {
                given: 'solve(log(a*x+c)=b, x)',
                expected: '[(e^b-c)/a]'
            },
            {
                given: 'solve(a*log(x-c)+b^2=1/c, x)',
                expected: '[e^((1/c-b^2)/a)+c]'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
        }
    });
    
    it('should solve system of equations correctly', function () {
        // given
        var testCases = [
            {
                given: ['x+y=1', '2*x=6', '4*z+y=6'],
                expected: 'x,3,y,-2,z,2'
            },
            {
                given: ['x+y=a', 'x-y=b', 'z+y=c'],
                expected: 'x,0.5*a+0.5*b,y,-0.5*b+0.5*a,z,-0.5*a+0.5*b+c',
                variables: ['x', 'y', 'z']
            },
            {
                given: ['x-2*y=-3', 'x+y-z+2*d=8', '5*d-1=19', 'z+d=7'],
                expected: 'd,4,x,1,y,2,z,3'
            },
            {
                given: 'x^2+4=x-y',
                expected: '(1/2)*(1+sqrt(-15-4*y)),(1/2)*(-sqrt(-15-4*y)+1)'
            }
            
        ];
        
        for (var i = 0; i < testCases.length; ++i) {
            // when
            var testCase = testCases[i],
                parsed;
            if (testCase.variables)
                parsed = nerdamer.solveEquations(testCase.given, testCase.variables);
            else
                parsed = nerdamer.solveEquations(testCase.given);
            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
        }
    });

    /** #55: nerdamer.solveEquation quits working */
    it('should handle text("fractions") without later impact', function () {
        expect(nerdamer.solveEquations("x+1=2", "x").toString()).toEqual('1');
        expect(nerdamer('x=1').text("fractions")).toEqual('x=1');
        expect(nerdamer.solveEquations("x+1=2", "x").toString()).toEqual('1');
    });
    
    it('parse equations correctly', function () {
        expect(nerdamer("-(a+1)=(a+3)^2").toString()).toEqual('-1-a=(3+a)^2');
    });
});
