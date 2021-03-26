/* global expect */

'use strict';

var nerdamer = require('../nerdamer.core.js');
require('../Solve');

describe('Solve', function () {
    it('should solve correctly', function () {
        // given
        var testCases = [
            {
                given: 'solve(x=y/3416.3333333333344, y)',
                expected: '[(1073228064103962/314146179365)*x]'
            },
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
                expected: '[(-5/14)*(2+sqrt(14))*sqrt(83)^(-1),0]'
            },
            {
                given: 'solve(8*x^3-26x^2+3x+9,x)',
                expected: '[3/4,-1/2,3]'
            },
            {
                given: 'solve(a*x^2+b*x+c, x)',
                expected: '[(1/2)*(-b+sqrt(-4*a*c+b^2))*a^(-1),(1/2)*(-b-sqrt(-4*a*c+b^2))*a^(-1)]'
            },
            {
                //NOTE: this test has duplicates
                given: 'solve(sqrt(x^3)+sqrt(x^2)-sqrt(x)=0,x)',
                expected: '[0,78202389238903801/240831735646702201]'
            },
            {
                given: 'solve(x^3-10x^2+31x-30,x)',
                expected: '[3,5,2]'
            },
            {
                given: 'solve(sqrt(x)+sqrt(2x+1)=5,x)',
                expected: '[4]'
            },
            {
                given: 'solve(x=2/(3-x),x)',
                expected: '[1,2]'
            },
            {
                given: 'solve(1/x=a,x)',
                expected: '[a^(-1)]'
            },
            {
                given: 'solve(sqrt(x^2-1),x)',
                expected: '[1,-1]'
            },
            {
                given: 'solve(m*x^9+n,x)',
                expected: '[2*m^(-1/9)*n^(1/9),2*e^((2/9)*i*pi)*m^(-1/9)*n^(1/9),2*e^((4/9)*i*pi)*m^(-1/9)*n^(1/9),'+
                        '2*e^((2/3)*i*pi)*m^(-1/9)*n^(1/9),2*e^((8/9)*i*pi)*m^(-1/9)*n^(1/9),2*e^((10/9)*i*pi)*m^(-1/9)*n^(1/9),'+
                        '2*e^((4/3)*i*pi)*m^(-1/9)*n^(1/9),2*e^((14/9)*i*pi)*m^(-1/9)*n^(1/9),2*e^((16/9)*i*pi)*m^(-1/9)*n^(1/9)]'
            },
            {
                given: 'solve(sqrt(97)x^2-sqrt(13)x+sqrt(14)x+sqrt(43)x^2+sqrt(3)*sqrt(101)=0,x)',
                expected: '[(-1/2)*(sqrt(43)+sqrt(97))^(-1)*sqrt(14)+(1/2)*(sqrt(43)+sqrt(97))^(-1)*sqrt((-sqrt(13)+sqrt(14))^2-'+
                        '4*(sqrt(43)+sqrt(97))*sqrt(101)*sqrt(3))+(1/2)*(sqrt(43)+sqrt(97))^(-1)*sqrt(13),'+
                        '(-1/2)*(sqrt(43)+sqrt(97))^(-1)*sqrt((-sqrt(13)+sqrt(14))^2-4*(sqrt(43)+sqrt(97))*sqrt(101)*sqrt(3))+'+
                        '(-1/2)*(sqrt(43)+sqrt(97))^(-1)*sqrt(14)+(1/2)*(sqrt(43)+sqrt(97))^(-1)*sqrt(13)]'
            },
            //The tests below were disabled. Too long and extremely difficult to verify.
            /*
            {
                given: 'solve(cos(x), x)',
                expected: '[(-1/2)*pi,(-3/2)*pi,(-9/2)*pi,(1/2)*pi,(3/2)*pi,-1352180071/26085593,-1908340923/110444324,-2517548877/94277729,'+
                        '-411557987/20154304,-529064097/48116095,-571845701/72809656,-742972117/31532716,-988823039/7771658,1100909798/10157405,'+
                        '1186473006/3058025,2330164408/10230543,363357032/2541981,3842632193/22862576,486282493/4127694,486282493/6879490,'+
                        '529064097/48116095,571845701/72809656,694771162/3482717,700190513/17830205,742972117/31532716,8001566871/92617376,828535325/15070342,871316929/8533809]'
            },
            
            {
                given: 'solve(cos(x)*x+1-cos(x), x)',
                expected: '[-157611237/7736072,-2656223529/19001015,-299590117/27042575,-302136356/39039211,-308954356/17824291,-36091008/7390861,'+
                        '-414635924/29467903,-617639565/11230682,-88830662/83379401,0,1015553327/14364225,1055263167/12216227,'+
                        '1168204159/10777362,150965503/34192001,1887835580/8523467,193836127/24237444,2053282505/45052302,332594509/8463821,'+
                        '3498970568/8735403,392182006/35998715,406482779/5074820,412628401/2886817,467039565/19859218,651649517/11856939,738326717/6103909,961315151/5614415]'

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
            */
            {
                given: 'solve(a*y^2*x^3-1, x)',
                expected: '[((-1/2)*abs(a^(-1)*y^(-2))+(1/2)*a^(-1)*y^(-2))^(1/3)+((1/2)*a^(-1)*y^(-2)+(1/2)*abs(a^(-1)*y^(-2)))^(1/3),(((-1/2)*abs(a^(-1)*y^(-2))+(1/2)*a^(-1)*y^(-2))^(1/3)+((1/2)*a^(-1)*y^(-2)+(1/2)*abs(a^(-1)*y^(-2)))^(1/3))*((1/2)*i*sqrt(3)+1/2),(((-1/2)*abs(a^(-1)*y^(-2))+(1/2)*a^(-1)*y^(-2))^(1/3)+((1/2)*a^(-1)*y^(-2)+(1/2)*abs(a^(-1)*y^(-2)))^(1/3))*((1/2)*i*sqrt(3)+1/2)^2]'
            },
            //The tests below are incorrect and have no solutions
            /*
            {
                given: 'solve(log(x,2)+log(x,3)=log(x,5), x)',
                expected: '[1]'
            },
            {
                given: 'solve(log(x)-log(x,0.5)=log(x,-3), x)',
                expected: '[1]'
            },
            */
            {
                given: 'solve((1/2)*sqrt(-4*x+4*y)-2+y, y)',
                expected: '[(-1/2)*(-5+sqrt(-4*x+9)),(-1/2)*(-5-sqrt(-4*x+9))]'
            },
            {
                given: 'solve(log(a*x-c)-b=21, x)',
                expected: '[-(-c-e^(21+b))*a^(-1)]'
            },
            {
                given: 'solve(x/(x-a)+4,x)',
                expected: '[(4/5)*a]'
            },
            {
                given: 'solve(3*sin(a^2*x-b)-4,x)',
                expected: '[a^(-2)*asin(4/3)]'
            },
            {
                given: 'solve(a*log(x^2-4)-4,x)',
                expected: '[(1/2)*sqrt(16+4*e^(4*a^(-1))),(-1/2)*sqrt(16+4*e^(4*a^(-1)))]'
            },
            {
                given: 'solve(x/(x^2+2*x+1)+4,x)',
                expected: '[(1/8)*sqrt(17)-9/8,(-1/8)*sqrt(17)-9/8]'
            },
            {
                given: 'solve((a*x^2+1),x)',
                expected: '[a^(-1)*sqrt(-a),-a^(-1)*sqrt(-a)]'
            },
            {
                //NOTE: 4503599627370497/4503599627370496 result can be safely removed since it has rounding errors
                //NOTE: this test has duplicate solutions. The last two are duplicates of the first but have rounding errors
                given: 'solve(sqrt(x)-2x+x^2,x)',
                expected: '[(-1/2)*sqrt(5)+3/2,0,1,832040/2178309]'
            },
//            {
//                given: 'solve((2x+x^2)^2-x,x)',
//                expected: '[0,1097^(1/3)*729^(-1/3)+4*(-1)^(1/3)*729^(-1/3)+4/3,((1/2)*i*sqrt(3)+1/2)*(1097^(1/3)*729^(-1/3)+4*(-1)^(1/3)*729^(-1/3)+4/3),((1/2)*i*sqrt(3)+1/2)^2*(1097^(1/3)*729^(-1/3)+4*(-1)^(1/3)*729^(-1/3)+4/3)]'
//            },
            {
                given: 'solve((5*x^4-2)/(x+1)/(x^2-1),x)',
                expected: '[72425485/91070226,-72425485/91070226,(316684236/398209345)*i,(-316684236/398209345)*i]'
            },
            {
                given: 'solve(0=(x^(2)-2)/(e^(x)-1), x)',
                expected: '[sqrt(2),-sqrt(2)]'
            },
            {
                given: 'solve(4/y^2=x^2+1,y)',
                expected: '[(1/2)*(-1-x^2)^(-1)*sqrt(16+16*x^2),(-1/2)*(-1-x^2)^(-1)*sqrt(16+16*x^2)]'
            },
            {
                given: 'solve(1/(x+x^2), x)',
                expected: '[]'
            },
            {
                given: 'solve(1/(x+x^2-1), x)',
                expected: '[]'
            },
            {
                given: 'solve(-1+11000*(-100*(10+x)^(-1)+20)^(-2)*(10+x)^(-2), x)',
                expected: '[(-1/2)*sqrt(110)-5,(1/2)*sqrt(110)-5]'
            },
            {
                given: 'solve(x^3+y^3=3, x)',
                expected: '[((-1/2)*y^3+3/2+abs((-1/2)*y^3+3/2))^(1/3)+((-1/2)*y^3-abs((-1/2)*y^3+3/2)+3/2)^(1/3),(((-1/2)*y^3+3/2+abs((-1/2)*y^3+3/2))^(1/3)+((-1/2)*y^3-abs((-1/2)*y^3+3/2)+3/2)^(1/3))*((1/2)*i*sqrt(3)+1/2),(((-1/2)*y^3+3/2+abs((-1/2)*y^3+3/2))^(1/3)+((-1/2)*y^3-abs((-1/2)*y^3+3/2)+3/2)^(1/3))*((1/2)*i*sqrt(3)+1/2)^2]'
            },
            {
                given: 'solve(sqrt(10x+186)=x+9,x)',
                expected: '[7]'
            },
            {
                given: 'solve(x^3+8=x^2+6,x)',
                expected: '[-1,1+i,-i+1]'
            },
            {
                given: 'solve(x^3-10x^2+31x-30,x)',
                expected: '[3,5,2]'
            },
            {
                given: 'solve(8x^3-26x^2+3x+9,x)',
                expected: '[3/4,-1/2,3]'
            },
            {
                given: 'solve(x^3-1/2x^2-13/2x-3,x)',
                expected: '[-2,3,-1/2]'
            },
//            {
//                given: '',
//                expected: ''
//            },
//            {
//                given: '',
//                expected: ''
//            },
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
            },
            //non-linear systems
            {
                given: ['x+y=3','y^3-x=7'],
                expected: 'x,1,y,2'
            },
            {
                given: ['x^2+y=3','x+y+z=6', 'z^2-y=7'],
                expected: 'x,1,y,2,z,3'
            },
            {
                given: ['x*y-cos(z)=-3', '3*z^3-y^2+1=12', '3*sin(x)*cos(y)-x^3=-4'],
                expected: 'x,1.10523895006979,y,-2.98980336936266,z,1.88015428627437'
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
    it('should parse equations correctly', function () {
        expect(nerdamer("-(a+1)=(a+3)^2").toString()).toEqual('-1-a=(3+a)^2');
    });
    //NOTE: contains duplicates
    it('should solve functions with factorials', function() {
        expect(nerdamer('solve(x!-x^2,x)').text('decimals', 20)).toEqual('[-2.200391782610595,-4.010232827899529,-2.938361683501947,1,1.000000000000001,3.562382285390900,3.562382285390896,0.9999999999999910,1.000000000000000]');
    });   
    it('should solve for variables other than x', function() {
        expect(nerdamer('solve(2*a^(2)+4*a*6=128, a)').toString()).toEqual('[4,-16]');
    });
    it('should solve nonlinear system of equations with multiple parameter functions', function() {
        var ans = nerdamer.solveEquations([
            `y=x * 2`,
            `z=y + max (y * 0.1, 23)`,
            `j=y + max (y * 0.1, 23)`,
            `6694.895373 = j + z + (max(j * 0.280587, z * 0.280587, 176))`
        ]);
        expect(ans.toString()).toEqual('j,2935.601831019821,x,1334.3644686453729,y,2668.7289372907458,z,2935.601831019821');
    });

    xit('should solve factors', function() {
        expect(nerdamer('solve((x-1)*(-a*c-a*x+c*x+x^2),x)').text()).toEqual('[1,-c,a]');
    });
});