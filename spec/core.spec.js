/* global expect */

'use strict';

var nerdamer = require('../nerdamer.core.js');

var utils = require('./support/utils');
var _ = utils.toFixed;
var run = utils.run;
var core = nerdamer.getCore();
var round = core.Utils.round;
var block = core.Utils.block;


//, x=2.1, y=3.3, z=1, a=7.42
var values = {
    x: 2.1,
    y: 3.3,
    z: 1,
    a: 7.42
};

describe('Nerdamer core', function () {  
    it('should perform simple arithmetic', function () {
        // given
        var testCases = [
            {
                given: '((((((1+1))))))',
                expected: '2',
                expectedValue: '2'
            }, 
            {
                given: '((((((1+1))+4)))+3)',
                expected: '9',
                expectedValue: '9'
            },
            {
                given: '1+1',
                expected: '2',
                expectedValue: '2'
            },
            {
                given: '4^2',
                expected: '16',
                expectedValue: '16'
            },
            {
                given: '2*-4',
                expected: '-8',
                expectedValue: '-8'
            },
            {
                given: '2+(3/4)',
                expected: '11/4',
                expectedValue: '2.75'
            },
            {
                given: '2/3+2/3',
                expected: '4/3',
                expectedValue: '1.3333333333333333'
            },
            {
                given: '6.5*2',
                expected: '13',
                expectedValue: '13'
            },
            {
                given: '(11.85)^(1/2)',
                expected: '(1/2)*sqrt(237)*sqrt(5)^(-1)',
                expectedValue: '3.4423828956117015'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);
            var value = parsed.evaluate().text('decimals');

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
            expect(round(value), 14).toEqual(round(testCases[i].expectedValue) ,14);
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
    it('should perform simple calculations with variables', function () {
        // given
        var testCases = [
            {
                given: 'x+x',
                expected: '2*x',
                expectedValue: '4.2'
            }, {
                given: 'x+1',
                expected: '1+x',
                expectedValue: '3.1'
            }, {
                given: 'x+y',
                expected: 'x+y',
                expectedValue: '5.4'
            }, {
                given: '-9-x+y-11',
                expected: '-20-x+y',
                expectedValue: '-18.8'
            }, {
                given: '(x+1)+(1+x)',
                expected: '2+2*x',
                expectedValue: '6.2'
            }, {
                given: '9+(x+1)-(1+x)',
                expected: '9',
                expectedValue: '9'
            }, {
                given: '0-x-2*x+6',
                expected: '-3*x+6',
                expectedValue: '-0.3'
            }, {
                given: '(x+y)+(a+x)',
                expected: '2*x+a+y',
                expectedValue: '14.92'
            }, {
                given: '7*(x+y)+2*(a+x)',
                expected: '2*a+7*y+9*x',
                expectedValue: '56.84'
            }, {
                given: 'x^y+x^y',
                expected: '2*x^y',
                expectedValue: '23.13948390048293'
            }, {
                given: 'x*x',
                expected: 'x^2',
                expectedValue: '4.41'
            }, {
                given: '-x*x',
                expected: '-x^2',
                expectedValue: '-4.41'
            }, {
                given: '-x*-x',
                expected: 'x^2',
                expectedValue: '4.41'
            }, {
                given: 'x-y',
                expected: '-y+x',
                expectedValue: '-1.2'
            }, {
                given: 'x-x',
                expected: '0',
                expectedValue: '0'
            }, {
                given: 'x*2',
                expected: '2*x',
                expectedValue: '4.2'
            }, {
                given: 'x*y',
                expected: 'x*y',
                expectedValue: '6.93'
            }, {
                given: 'x^x',
                expected: 'x^x',
                expectedValue: '4.749638091742242'
            }, {
                given: 'x^(x)',
                expected: 'x^x',
                expectedValue: '4.749638091742242'
            }, {
                given: 'y^y^3',
                expected: 'y^y^3',
                expectedValue: '4303635263255155700'
            }, 
            {
                given: '(x-1)^2+(x-1)^2',
                expected: '2*(-1+x)^2',
                expectedValue: '2.4200000000000004'
            },
            {
                given: '(-5(x/2-5)/4)^0',
                expected: '1',
                expectedValue: '1'
            },
            {
                given: '((1+x)^(-2))+((1+x)^(-1))+((1+x)^(-1))+(1)',
                expected: '(1+x)^(-2)+2*(1+x)^(-1)+1',
                expectedValue: '1.74921956295526'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);
            var value = parsed.evaluate(values).text('decimals');

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
            expect(round(value), 14).toEqual(round(testCases[i].expectedValue) ,14);
        }
    });
    it('should handle errors', function () {
        var formulas = [
            '0/0',
            '0^0',
            '-Infinity+Infinity',
            'Infinity/Infinity',
            'Infinity^Infinity',
            '1^Infinity',
            'Infinity^0',
            '(-Infinity)^0',
            'Infinity*0'
        ];
        
        for(var i=0; i<formulas.length; i++)
            expect(function (){ nerdamer(formulas[i]) }).toThrowError();
    });   
    it('should set postfix operators correctly', function () {
        var core = nerdamer.getCore();
        var _ = core.PARSER;
        var Symbol = core.Symbol;
        nerdamer.setOperator({
            precedence: 4,
            operator: '°',
            postfix: true,
            operation: function(x){ 
                return _.divide(_.multiply(x, new Symbol('pi')), new Symbol(180)); 
            }
        });
        
        expect(nerdamer('x+1°+π+x').toString()).toEqual('(181/180)*pi+2*x');
    });  
    it('should correctly calculate Infinity', function () {
        // given
        var testCases = [
            {
                given: '0^Infinity',
                expected: '0'
            }, 
            {
                given: 'Infinity*Infinity',
                expected: 'Infinity'
            }, 
            {
                given: '-Infinity*Infinity',
                expected: '-Infinity'
            }, 
            {
                given: '-Infinity*-Infinity',
                expected: 'Infinity'
            }, 
            {
                given: '-a*-Infinity',
                expected: 'Infinity*a'
            }, 
            {
                given: '-a-Infinity',
                expected: '-Infinity'
            }, 
            {
                given: '-a*Infinity',
                expected: '-Infinity*a'
            }, 
            {
                given: '-a^Infinity',
                expected: '-a^Infinity'
            }, 
            {
                given: '-2^Infinity',
                expected: '-Infinity'
            }, 
            {
                given: '-2^-Infinity',
                expected: '0'
            }, 
            
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);
            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
        }
    });   
    it('should calculate fib correctly', function () {
        // given
        var testCases = [
            {
                given: 'fib(0)',
                expected: '0'
            }, 
            {
                given: 'fib(14)',
                expected: '377'
            }, 
            {
                given: 'fib(-14)',
                expected: '-377'
            }, 
            {
                given: 'fib(15)',
                expected: '610'
            }, 
            {
                given: 'fib(-15)',
                expected: '610'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given).evaluate();
            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
        }
    });    
    it('should calculate sinc correctly', function () {
        // given
        var testCases = [
            {
                given: 'sinc(x)',
                expected: 'sinc(x)',
                eval: false
            }, 
            {
                given: 'sinc(0)',
                expected: '1',
                eval: true
            }, 
            {
                given: 'sinc(9)',
                expected: '23287849/508568891',
                eval: true
            }, 
            {
                given: 'sinc(x-a)-sin(x-a)/(x-a)',
                expected: '0',
                eval: true
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            var testCase = testCases[i];
            // when
            var parsed = testCase.eval ? nerdamer(testCase.given).evaluate() : nerdamer(testCase.given);

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
        }
    });   
    it('should expand terms', function () {
        // given
        var testCases = [
            {
                given: 'expand((9*y*x+1)^3)',
                expected: '1+243*x^2*y^2+27*x*y+729*x^3*y^3',
                expectedValue: '254478.51475300005'
            },
            {
                given: 'expand(x*(x+1))',
                expected: 'x+x^2',
                expectedValue: '6.51'
            },
            {
                given: 'expand(x*(x+1)^5)',
                expected: '10*x^3+10*x^4+5*x^2+5*x^5+x+x^6',
                expectedValue: '601.212171'
            },
            {
                given: 'expand((x*y)^x+(x*y)^2)',
                expected: '(x*y)^x+x^2*y^2',
                expectedValue: '106.3076174497575'
            },
            {
                given: 'expand((3*x+4*y)^4)',
                expected: '256*y^4+432*x^3*y+768*x*y^3+81*x^4+864*x^2*y^2',
                expectedValue: '144590.0625'
            },
            {
                given: 'expand((9*y*x+1)^2)',
                expected: '1+18*x*y+81*x^2*y^2',
                expectedValue: '4015.7568999999994'
            }, 
            {
                given: 'expand((x+5)*(x-3)-x^2)',
                expected: '-15+2*x',
                expectedValue: '-10.8'
            },
            {
                given: 'expand(((x^3+x)^x*(x^2+x)^x+1)*x)',
                expected: '(x+x^2)^x*(x+x^3)^x*x+x',
                expectedValue: '17667.12052556627'
            },
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);
            var value = parsed.evaluate(values).text('decimals');

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
            expect(round(value, 12)).toEqual(round(testCases[i].expectedValue, 12)) ;
        }
    });    
    it('should expand correctly', function() {
       expect(nerdamer('expand((a^2*b*c)^(-1))').toString()).toEqual('a^(-2)*b^(-1)*c^(-1)'); 
       expect(nerdamer('expand(((a^2*b)(x+1))^2)').toString()).toEqual('2*a^4*b^2*x+a^4*b^2+a^4*b^2*x^2'); 
       expect(nerdamer('expand(5*x/(c+d)^2)').toString()).toEqual('5*(2*c*d+c^2+d^2)^(-1)*x'); 
       expect(nerdamer('expand((a+b)*(c+d))').toString()).toEqual('a*c+a*d+b*c+b*d'); 
       expect(nerdamer('expand(5*(a+b)*(c+d))').toString()).toEqual('5*a*c+5*a*d+5*b*c+5*b*d'); 
       expect(nerdamer('expand(4*parens(x+1)^2)').toString()).toEqual('4+4*x^2+8*x'); 
       expect(nerdamer('expand(4*(a*b)*(c*b))').toString()).toEqual('4*a*b^2*c'); 
       expect(nerdamer('expand(4*(a*b)*(c*b)+1)').toString()).toEqual('1+4*a*b^2*c'); 
       expect(nerdamer('expand(3*(a+b)*(g+i)*(x*k))').toString()).toEqual('3*a*g*k*x+3*a*i*k*x+3*b*g*k*x+3*b*i*k*x'); 
       expect(nerdamer('expand(2*x*(x+1)^3)').toString()).toEqual('2*x+2*x^4+6*x^2+6*x^3'); 
       expect(nerdamer('expand((2*(a*b)*(x+1)^3)^2)').toString()).toEqual('24*a^2*b^2*x+24*a^2*b^2*x^5+4*a^2*b^2+4*a^2*b^2*x^6+60*a^2*b^2*x^2+60*a^2*b^2*x^4+80*a^2*b^2*x^3'); 
       expect(nerdamer('expand((2*(a*b)*(x+1)^3)^2+1)').toString()).toEqual('1+24*a^2*b^2*x+24*a^2*b^2*x^5+4*a^2*b^2+4*a^2*b^2*x^6+60*a^2*b^2*x^2+60*a^2*b^2*x^4+80*a^2*b^2*x^3'); 
       expect(nerdamer('expand((d/(x+1)+1)^2)').toString()).toEqual('(1+2*x+x^2)^(-1)*d^2+1+2*(1+x)^(-1)*d'); 
       expect(nerdamer('expand(2*cos((d/(x+1)+1)^2)^2)').toString()).toEqual('2*cos((1+2*x+x^2)^(-1)*d^2+1+2*(1+x)^(-1)*d)^2'); 
    });
    it('should handle imaginary log arguments', function () {
        // given
        var testCases = [
            {
                given: 'log(5*i)',
                expected: '1.5707963267948966*i+1.6094379124341003'
            }, 
            {
                given: 'log(8+5*i)',
                expected: '0.5585993153435624*i+2.2443181848660699'
            }, 
            {
                given: 'log(123-2*i)',
                expected: '-0.01625872980512958*i+4.8123165343435139'
            }, 
            {
                given: 'log(123-2*i+a)',
                expected: 'log(-2*i+123+a)'
            }, 
            /*
            {
                given: 'log(123-2*i+a)',
                expected: '-atan2(123+a,-2)*i+1.5707963267948966*i+log(sqrt((123+a)^2+4))'
            }, 
            {
                given: 'log(x+2*i)',
                expected: '-atan2(x,2)*i+1.5707963267948966*i+log(sqrt(4+x^2))'
            }
            */
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);
            var value = parsed.evaluate().text('decimals', 17);

            // then
            expect(value).toEqual(testCases[i].expected);
        }
    });  
    it('should convert from polar to rectangular', function () {
        // given
        var testCases = [
            {
                given: 'rectform(sqrt(34)*e^(i*atan(3/5)))',
                expected: '3*i+5'
            }, 
            //PENDING:
            //(-1)^(1/4)*sqrt(2)
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);
            var value = parsed.evaluate().text('decimals');

            // then
            expect(value).toEqual(testCases[i].expected);
        }
    }); 
    it('should convert from rectangular to polar', function () {
        // given
        var testCases = [
            {
                given: 'polarform(3*i+5)',
                expected: 'e^(atan(3/5)*i)*sqrt(34)'
            }, 
            {
                given: 'polarform(i-1)',
                expected: '(i*sqrt(2)^(-1)+sqrt(2)^(-1))*sqrt(2)'
            }, 
            {
                given: 'polarform(i+1)',
                expected: 'e^(atan(1)*i)*sqrt(2)'
            }, 
            {
                given: 'polarform(a*i+b*1)',
                expected: 'e^(atan(a*b^(-1))*i)*sqrt(a^2+b^2)'
            }, 
            {
                given: 'polarform(3)',
                expected: '3'
            }, 
            {
                given: 'polarform(i)',
                expected: 'i'
            }, 
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);
            var value = parsed.toString();

            // then
            expect(value).toEqual(testCases[i].expected);
        }
    });  
    it('should compute powers', function () {
        // given
        var testCases = [
            {
                given: '0^(1/2)',
                expected: '0',
                expectedValue: '0'
            },
            {
                given: '2^(1/2)',
                expected: 'sqrt(2)',
                expectedValue: '1.4142135623730951'
            },
            {
                given: '3/4/-5/7',
                expected: '-3/140',
                expectedValue: '-0.02142857142857143'
            },
            {
                given: '(2/5)^(1/2)',
                expected: 'sqrt(2)*sqrt(5)^(-1)',
                expectedValue: '0.6324555320336757'
            },
            {
                given: '2^(1/2)+sqrt(2)',
                expected: '2*sqrt(2)',
                expectedValue: '2.8284271247461903'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);
            var value = parsed.evaluate(values).text('decimals');

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
            expect(round(value), 14).toEqual(round(testCases[i].expectedValue) ,14);
        }
    });
    it('should handle large exponents', function() {
        expect(nerdamer("((0.06/3650))^(365)").toString()).toEqual('1410126170338158616048224728371571380367482072097134683678107761'+
                '52508851857709566371341862240808591002757985609412198322971415396168976254349069'+
                '9072942506404339112922628405843/22958690276909851695578696288325771692413979062611'+
                '991343897836236337139161946070457727457304403772796893304635803331160164612018173513'+
                '31134891165302696107379996154818718135122744754040421370203240041207474864695474953483'+
                '0902803016857824896441156744745927014013655670039876606817604403974679132586661890547851'+
                '679296531769750182377028054935351721036749094036432130424970214049875323757624442119121774'+
                '055322139084444881193088085062373618050647934648517067336395372063877340185058649456212635239'+
                '066781525382959311599987961299501210179615619443916881386730704082805297329446411862362398493471'+
                '826680176950800344487654991092708947796616392537184126525313140738179830882678244141981560034679553'+
                '975783364407913480224860273677558689624530555494789243375386735721249700734052057353034685422151396642'+
                '918026922556798918041766876185384884777704756416389503981017717926985777672007862927270802670740330468020'+
                '802233942408161027975787463864142754167881620056649731281986417206144622511945116440478852141832742043753412'+
                '722079707428689254358366463206869962206219178342509475906640460010907598207195708896768921596249362559252745779'+
                '251530796907715219008462775395896084216357246887696419435087591409683227539062500000000000000000000000000000000000'+
                '000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'+
                '000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'+
                '000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'+
                '000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'+
                '000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'+
                '00000000000000000000000000000000000000000000000000000000000000000000000000000000'
                );
        expect(nerdamer("1000*(1+(0.06/365))^(365*3)").evaluate().text()).toEqual('1197.199652936753887236');
    });
    it('should compute factorials', function () {
        // given
       var testCases = [
           {
               given: '(1+x^2)!',
               expected: 'factorial(1+x^2)',
               expectedValue: '245.1516183677083'
           },
           {
               given: '10!',
               expected: 'factorial(10)',
               expectedValue: '3628800'
           },
           {
               given: 'x!',
               expected: 'factorial(x)',
               expectedValue: '2.197620278392476'
           },
           {
               given: 'x!*x!',
               expected: 'factorial(x)^2',
               expectedValue: '4.829534888001823'
           },
           {
               given: '3*(1+x!*x!)',
               expected: '3*(1+factorial(x)^2)',
               expectedValue: '17.488604664005468'
           },
           {
               given: '3*(1+x!*x!)!',
               expected: '3*factorial(1+factorial(x)^2)',
               expectedValue: '1573.2041488172601'
           }
       ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);
            var value = parsed.evaluate(values).text('decimals');

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
            expect(round(value), 14).toEqual(round(testCases[i].expectedValue) ,14);
        }
    });   
    it('should compute symbolic factorials', function () {
        // given
       var testCases = [
           {
               given: '(-1/2)!',
               expected: 'sqrt(pi)'
           },
           {
               given: '(-7/2)!',
               expected: '(-8/15)*sqrt(pi)'
           },
           {
               given: '(-9/2)!',
               expected: '(16/105)*sqrt(pi)'
           },
           {
               given: '(9/2)!',
               expected: '(945/32)*sqrt(pi)'
           },
           {
               given: '(7/2)!',
               expected: '(105/16)*sqrt(pi)'
           },
           {
               given: '(1/2)!',
               expected: '(1/2)*sqrt(pi)'
           }
       ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
        }
    });   
    it('should handle square roots', function () {
        // given
        var testCases = [
            {
                given: 'sqrt(1+x)^(4*x)',
                expected: '(1+x)^(2*x)',
                expectedValue: '115.80281433592612'
            },
            {
                given: 'sqrt(2*sqrt(5))',
                expected: '5^(1/4)*sqrt(2)',
                expectedValue: '2.114742526881128'
            },
            {
                given: 'sqrt(2)*sqrt(2)',
                expected: '2',
                expectedValue: '2'
            },
            {
                given: 'sqrt(1/2)',
                expected: 'sqrt(2)^(-1)',
                expectedValue: '0.7071067811865475'
            },
            {
                given: 'sqrt(2)^2',
                expected: '2',
                expectedValue: '2'
            },
            {
                given: '6*sqrt(2)^4',
                expected: '24',
                expectedValue: '24'
            },
            {
                given: 'sqrt(x^2)*sqrt(x^4)',
                expected: 'abs(x)*x^2',
                expectedValue: '9.261'
            },
            {
                given: 'sqrt((5/2)*x^10)',
                expected: 'abs(x)*sqrt(2)^(-1)*sqrt(5)*x^4',
                expectedValue: '64.5753067708567'
            },
            {
                given: '(sqrt((5/2)*x^10))*-sqrt(2)',
                expected: '-abs(x)*sqrt(5)*x^4',
                expectedValue: '-91.3232746297487'
            },
            {
                given: 'sqrt(9)',
                expected: '3',
                expectedValue: '3'
            },
            {
                given: 'sqrt(-9)',
                expected: '3*i',
                expectedValue: '3*i'
            },
            {
                given: 'sqrt(a/x)',
                expected: 'sqrt(a)*sqrt(x)^(-1)',
                expectedValue: '1.879716290649558'
            },
            {
                given: 'sqrt(-x)',
                expected: 'sqrt(-x)',
                expectedValue: '1.4491376746189437*i'
            },
            {
                given: 'sqrt(-x)*sqrt(-x)',
                expected: '-x',
                expectedValue: '-2.1'
            },
            {
                given: 'sqrt(-x)*sqrt(-x)+4*x',
                expected: '3*x',
                expectedValue: '6.3'
            },
            {
                given: 'sqrt((1/2*x)^(1/2))',
                expected: '2^(-1/4)*x^(1/4)',
                expectedValue: '1.0122722344290394'
            },
            {
                given: 'sqrt(4*sqrt(2)^(-1)*x^(1/2))',
                expected: '2^(3/4)*x^(1/4)',
                expectedValue: '2.0245444688580787'
            },
            {
                given: 'sqrt(4+x)',
                expected: 'sqrt(4+x)',
                expectedValue: '2.4698178070456938'
            },
            {
                given: '(1/2)*x^(1/2)+sqrt(x)',
                expected: '(3/2)*sqrt(x)',
                expectedValue: '2.173706511928416'
            },
            {
                given: 'sqrt((4+x)^2)',
                expected: 'abs(4+x)',
                expectedValue: '6.1'
            },
            {
                given: '2*sqrt(3/4)',
                expected: 'sqrt(3)',
                expectedValue: '1.7320508075688772'
            },
            {
                given: 'sqrt(2)*sqrt(8)',
                expected: '4',
                expectedValue: '4'
            },
            {
                given: 'sqrt(242)',
                expected: '11*sqrt(2)',
                expectedValue: '15.556349186104047'
            },
            {
                given: 'sqrt(4)^-1',
                expected: '1/2',
                expectedValue: '0.5'
            },
            {
                given: 'sqrt(4*x^2)',
                expected: '2*abs(x)',
                expectedValue: '4.2'
            },
            {
                given: '74689676.31109099*sqrt(5578547747455547)',
                expected: '(824947474856/11045)*sqrt(5578547747455547)',
                expectedValue: '5578547747455547'
            },
            {
                given: 'sqrt(2/x)',
                expected: 'sqrt(2)*sqrt(x)^(-1)',
                expectedValue: '0.9759000729485331'
            },
            {
                given: 'sqrt(3^x)',
                expected: 'sqrt(3^x)',
                expectedValue: '3.169401925649'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);
            var value = parsed.evaluate(values).text('decimals');

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
            expect(round(value, 12)).toEqual(round(testCases[i].expectedValue ,12));
        }
    });
    it('should simplify square roots', function() {
        expect(nerdamer('sqrt(128/49)').toString()).toEqual('(8/7)*sqrt(2)');
        expect(nerdamer('sqrt(2)-2/(sqrt(2))').toString()).toEqual('0');
        expect(nerdamer('expand((sqrt(7)+3sqrt(2))(sqrt(7)-3sqrt(2)))').toString()).toEqual('-11');
        expect(nerdamer('3sqrt(2)*2sqrt(6)').toString()).toEqual('12*sqrt(3)');
    });
    it('should handle square roots of negative values', function() {
        expect(nerdamer('sqrt(-x)').evaluate().text()).toEqual('sqrt(-x)');
        expect(nerdamer('sqrt(-0.5*x)').evaluate().text()).toEqual('0.7071067811865475*sqrt(-x)');
        expect(nerdamer('sqrt(-4)').evaluate().text()).toEqual('2*i');
        expect(nerdamer('sqrt(-pi)').evaluate().text()).toEqual('1.7724538509055163*i');
    });
    it('should expand square roots', function () {
        // given
        var testCases = [
            {
                given: '(sqrt(7)+3sqrt(2))*(sqrt(7)-3sqrt(2))',
                expected: '-11'
            },
            {
                given: 'sqrt(33)*sqrt(11)',
                expected: '11*sqrt(3)'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given).expand();

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
        }
    });
    it('should correctly test for squareness', function() {
        expect(nerdamer('16x^2*y^2').symbol.isSquare()).toBe(true);
        expect(nerdamer('16x^2*y^2-1').symbol.isSquare()).toBe(false);
        expect(nerdamer('9').symbol.isSquare()).toBe(true);
        expect(nerdamer('(5+x)^6').symbol.isSquare()).toBe(true);
        expect(nerdamer('(x+y)^2').symbol.isSquare()).toBe(true);
        expect(nerdamer('9^(1/4)').symbol.isSquare()).toBe(false);
        expect(nerdamer('x^(1/2)').symbol.isSquare()).toBe(false);
    });
    it('should correctly test for cubeness', function() {
        expect(nerdamer('64x^3*y^3').symbol.isCube()).toBe(true);
        expect(nerdamer('64x^3*y^3-1').symbol.isCube()).toBe(false);
        expect(nerdamer('7').symbol.isCube()).toBe(false);
        expect(nerdamer('27').symbol.isCube()).toBe(true);
        expect(nerdamer('(5+x)^6').symbol.isCube()).toBe(true);
        expect(nerdamer('(x+y)^2').symbol.isCube()).toBe(false);
        expect(nerdamer('9^(1/4)').symbol.isCube()).toBe(false);
        expect(nerdamer('x^(1/2)').symbol.isCube()).toBe(false);
        expect(nerdamer('216*z^6').symbol.isCube()).toBe(true);
    });
    it('should support the imaginary number i', function () {
        // given
        var testCases = [
            {
                given: 'i*i',
                expected: '-1',
                expectedValue: '-1'
            },
            {
                given: 'i*8*i',
                expected: '-8',
                expectedValue: '-8'
            },
            {
                given: 'i^(2/3)',
                expected: '-1',
                expectedValue: '-1'
            },
            {
                given: '(256*i)^(1/8)',
                expected: '2*(-1)^(1/16)',
                expectedValue: '0.39018064403225655*i+1.9615705608064609'
            },
            {
                given: 'i/i',
                expected: '1',
                expectedValue: '1'
            },
            {
                given: '(1/i)*i',
                expected: '1',
                expectedValue: '1'
            },
            {
                given: 'i^(-1)',
                expected: '-i',
                expectedValue: '-i'
            },
            {
                given: 'i^(2)',
                expected: '-1',
                expectedValue: '-1'
            },
            {
                given: 'i^(-2)',
                expected: '-1',
                expectedValue: '-1'
            },
            {
                given: 'i^(-1)',
                expected: '-i',
                expectedValue: '-i'
            },
            // Euler's identity
            {
                given: 'e^(i*pi)+e^(2*i*pi)',
                expected: '0',
                expectedValue: '0'
            },
            {
                given: 'exp(i + x pi)',
                expected: 'e^(i+pi*x)',
                expectedValue: '396.1203590827245535+616.9209071285088*i'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);
            var value = parsed.evaluate(values).text('decimals', 17);

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
            expect(value).toEqual(testCases[i].expectedValue);
        }
    });  
    it('should handle powers with results using i', function () {
        // given
        var testCases = [
            {
                given: '(-2/3*x)^x',
                expected: '(-x)^x*2^x*3^(-x)',
                //TODO: Evaluates to NaN somewhere
                expectedValue: '2.0270706004935852*(-1)^2.1'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);
            var value = parsed.evaluate(values).text('decimals');

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
            expect(value).toEqual(testCases[i].expectedValue);
        }
    });
    it('should compute logarithms correctly', function () {
        // given
        var testCases = [
            {
                given: 'log(e)',
                expected: '1',
                expectedValue: '1'
            },
            {
                given: 'log(e^e)',
                expected: 'e',
                expectedValue: '2.718281828459045'
            },
            {
                given: 'log(1/e^e)',
                expected: '-e',
                expectedValue: '-2.718281828459045'
            },
            {
                given: 'log(1/sqrt(2))',
                expected: '(-1/2)*log(2)',
                expectedValue: '-0.34657359027997'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);
            var value = parsed.evaluate().text('decimals');

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
            expect(round(value, 14)).toEqual(round(testCases[i].expectedValue), 14);
        }
    });
    it('should check for equality', function () {
        var a, b, c, d, e, f, g;
        a = nerdamer("2sqrt(5)");
        b = nerdamer("2sqrt(5)");
        c = nerdamer("sqrt(13)");
        d = nerdamer("sqrt(21)");
        e = nerdamer("sqrt(20)");
        f = nerdamer("sqrt(5) + sqrt(3)");
        g = nerdamer("sqrt(5) + sqrt(7)");
        expect(a.lt(g)).toBe(true);
        expect(a.lt(f)).toBe(false);
        expect(a.gt(c)).toBe(true);
        expect(a.gt(d)).toBe(false);
        expect(a.gt(e)).toBe(false);
        expect(a.lt(e)).toBe(false);
        expect(a.eq(e)).toBe(true);
        expect(b.gte(a)).toBe(true);
        expect(c.gte(a)).toBe(false);
        expect(e.lte(d)).toBe(true);
        expect(f.lte(g)).toBe(true);
        
    });   
    /** Based on commit cf8c0f8. */
    it('should not cause infinite recursion', function () {
      // given
      var formula = '1/(1+x)+(1+x)';

      // when
      var parsed = nerdamer(formula);
      var result = parsed.evaluate().toString();

      // then
      expect(result).toBe('(1+x)^(-1)+1+x');
    });
    it('should support ceil and floor', function () {
      // given
      var testCases = [
          {
              given: 'floor(204)',
              expected: '204'
          },
          {
              given: 'floor(10.893)',
              expected: '10'
          },
          {
              given: 'floor(-10.3)',
              expected: '-11'
          },
          {
              given: 'ceil(204)',
              expected: '204'
          },
          {
              given: 'ceil(10.893)',
              expected: '11'
          },
          {
              given: 'ceil(-10.9)',
              expected: '-10'
          }
      ];

      for (var i = 0; i < testCases.length; ++i) {
        // when
        var parsed = nerdamer(testCases[i].given);
        var value = parsed.evaluate().text('decimals');

        // then
        expect(value).toEqual(testCases[i].expected);
      }
    });   
    it('should round', function () {
      // given
      var testCases = [
          {
              given: 'round(204)',
              expected: '204'
          },
          {
              given: 'round(10.893)',
              expected: '11'
          },
          {
              given: 'round(10.893, 1)',
              expected: '10.9'
          },
          {
              given: 'round(-10.3)',
              expected: '-10'
          },
          {
              given: 'round(204)',
              expected: '204'
          },
          {
              given: 'round(10.1)',
              expected: '10'
          },
          {
              given: 'round(1.23423534e-12,-2)',
              expected: '0.00000000000123'
          },
          {
              given: 'round(1.23423534e12,-2)',
              expected: '1230000000000'
          }
      ];

      for (var i = 0; i < testCases.length; ++i) {
        // when
        var parsed = nerdamer(testCases[i].given);
        var value = parsed.evaluate().text('decimals');

        // then
        expect(value).toEqual(testCases[i].expected);
      }
    });   
    it('should support trunc()', function () {
        // given
        var testCases = [
            {
                given: 'trunc(0)',
                expected: '0'
            },
            {
                given: 'trunc(10.234)',
                expected: '10'
            },
            {
                given: 'trunc(-9.99)',
                expected: '-9'
            },
            {
                given: 'trunc(0.99)',
                expected: '0'
            },
            {
                given: 'trunc(-0.7555)',
                expected: '0'
            },
            {
                given: 'trunc(8.9 * -4.9)',
                expected: '-43'
            },
            {
                given: 'trunc(8.9) * trunc(-4.9)',
                expected: '-32'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);
            var value = parsed.evaluate().text('decimals');

            // then
            expect(value).toEqual(testCases[i].expected);
        }
    });
    it('should support continued fractions', function () {
        // given
        var testCases = [
            {
                given: 'continued_fraction(2.145474, 11)',
                expected: '[1,2,[6,1,6,1,16,8,2,1,3,2]]'
            },
            {
                given: 'continued_fraction(-6/7)',
                expected: '[-1,0,[1,6]]'
            },
            {
                given: 'continued_fraction(sqrt(2), 5)',
                expected: '[1,1,[2,2,2,2,2]]'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
        }
    });
    /** #35 #76: Support multiple minus signs and brackets */
    it('should support prefix operator with parantheses', function () {
      // given
      var testCases = [
        {
           given: '(a+x)--(x+a)',
           expected: '2*a+2*x'
        },
        {
           given: '(3)---(3)',
           expected: '0'
        },
        {
           given: '-(1)--(1-1--1)',
           expected: '0'
        },
        {
           given: '-(-(1))-(--1)',
           expected: '0'
        }
      ];

      for (var i = 0; i < testCases.length; ++i) {
        // when
        var parsed = nerdamer(testCases[i].given);
        var value = parsed.evaluate().text('decimals');

        // then
        expect(value).toEqual(testCases[i].expected);
      }
    });   
    //#78
    it('should substitute variables', function () {
      // given
      var testCases = [
        {
           given: '2*(x+1)^2',
           sub: 'x+1',
           sub_with: 'u',
           expected: '2*u^2'
        },
        {
           given: '2*(x+1+a)^2',
           sub: 'x+1',
           sub_with: 'u',
           expected: '2*(1+a+x)^2'
        },
        {
           given: '2*(x+1)^(x+1)',
           sub: 'x+1',
           sub_with: 'u',
           expected: '2*u^u'
        },
        {
           given: '2*(x+1)^2',
           sub: '(x+1)^2',
           sub_with: 'u^x',
           expected: '2*u^x'
        },
        {
           given: '2*(x+1)^2',
           sub: 'x+1',
           sub_with: 'u^x',
           expected: '2*u^(2*x)'
        },
        {
           given: '(2*(x+1)^2+a)^2',
           sub: '(x+1)^2',
           sub_with: 'u^x',
           expected: '(2*u^x+a)^2'
        },
        {
           given: '(x^x+y)^(x^x-t)',
           sub: 'x^x',
           sub_with: '4',
           expected: '(4+y)^(-t+4)'
        },
        {
           given: '(cos(x)+cos(x)^2)',
           sub: 'cos(x)',
           sub_with: '4',
           expected: '20'
        },
        {
           given: '(cos(x)+cos(x)^2)',
           sub: '(cos(x)+cos(x)^2)',
           sub_with: '4',
           expected: '4'
        },
        {
           given: '(cos(x)+cos(x^6)^2)',
           sub: '(cos(x)+cos(x)^2)',
           sub_with: '4',
           expected: 'cos(x)+cos(x^6)^2'
        },
        {
           given: '(cos(x)+cos(x^6)^2)',
           sub: 'cos(x)',
           sub_with: '4',
           expected: '4+cos(x^6)^2'
        },
        {
           given: '(cos(x)+cos(x^6)^2)',
           sub: '2',
           sub_with: '4',
           expected: 'error'
        }
      ];

      for (var i = 0; i < testCases.length; ++i) {
        var testCase = testCases[i];

        var parsed;
        // when
        try {
            parsed = nerdamer(testCase.given).sub(testCase.sub, testCase.sub_with).toString();
        }
        catch(e){
            parsed = 'error';
        }

        // then
        expect(parsed).toEqual(testCases[i].expected);
      }
    });
    it('should ignore constants and special values', function() {
        var core = nerdamer.getCore();
        expect(nerdamer('e').variables()).toEqual([]);
        expect(nerdamer('pi').variables()).toEqual([]);
        expect(nerdamer(core.Settings.IMAGINARY).variables()).toEqual([]);
    });
    /** #44: a+b - (a+b) not evaluated as 0 */
    it('should perform subtraction of terms', function () {
      // given
      var formula = 'a+b - (a+b)';

      // when
      var result = nerdamer(formula).toString();

      // then
      expect(result).toBe('0');
    });
    /** #46: (x^(1/2)*x^(1/3))-x^(5/6) should be 0 */
    it('should result in 0', function () {
      // given
      var formula = '(x^(1/2)*x^(1/3))-x^(5/6)';

      // when
      var result = nerdamer(formula).toString();

      // then
      expect(result).toBe('0');
    });
    /** #47: (a^2)/(a*b) should be a/b */
    it('should simplify correctly', function () {
      // given
      var formula = '(a^2)/(a*b)';

      // when
      var result = nerdamer(formula).toString();

      // then
      // TODO jiggzson: Result is correct but a/b would be simpler
      expect(result).toBe('a*b^(-1)');
    });
    /** #56: x/sqrt(x) = x^(3/2) */
    it('should calculate x/sqrt(x) correctly', function () {
      // given
      var formula = 'x/sqrt(x)';

      // when
      var result = nerdamer(formula).toString();

      // then
      expect(result).toBe('x^(1/2)');
    });   
    /** #60: sin(x) looks like sin(abs(x)) */
    it('should respect the sign of argument for sin(x)', function () {
      // given
      var halfSqrt2 = '0.7071067811865475'; // sqrt(2)/2
      var halfSqrt3 = '0.8660254037844385'; // sqrt(3)/2
      var testCases = [
        {
          given: '-pi',
          expected: '0'
        },
        {
          given: '-3/4*pi',
          expected: '-' + halfSqrt2
        },
        {
          given: '-2/3*pi',
          expected: '-' + halfSqrt3
        },
        {
          given: '-1/2*pi',
          expected: '-1'
        },
        {
          given: '-1/6*pi',
          expected: '-0.5'
        },
        {
          given: '0',
          expected: '0'
        },
        {
          given: '1/4*pi',
          expected: halfSqrt2
        },
        {
          given: '1/2*pi',
          expected: '1'
        },
        {
          given: '3/4*pi',
          expected: halfSqrt2
        },
        {
          given: 'pi',
          expected: '0'
        },
        {
          given: '3/2*pi',
          expected: '-1'
        },
        {
          given: '2*pi',
          expected: '0'
        },
        {
          given: '2.25 * pi',
          expected: halfSqrt2
        }
      ];

      for (var i = 0; i < testCases.length; ++i) {
        // when
        var result = nerdamer('sin(' + testCases[i].given + ')').evaluate().text('decimals');

        // then
        expect(round(result, 14)).toEqual(round(testCases[i].expected),14);
      }
    });   
    it('should compute complex numbers', function() {
        var testCases = [
            //SYMBOLIC
            {
                given: 'cos(3*i+a)',
                expected: 'cos(3*i+a)'
            },
            {
                given: 'sin(3*i+a)',
                expected: 'sin(3*i+a)'
            },
            {
                given: 'tan(3*i+a)',
                expected: 'tan(3*i+a)'
            },
            {
                given: 'sec(3*i+a)',
                expected: 'sec(3*i+a)'
            },
            {
                given: 'csc(3*i+a)',
                expected: 'csc(3*i+a)'
            },
            {
                given: 'cot(3*i+a)',
                expected: 'cot(3*i+a)'
            },
            {
                given: 'acos(3*i+a)',
                expected: 'acos(3*i+a)'
            },
            {
                given: 'asin(3*i+a)',
                expected: 'asin(3*i+a)'
            },
            {
                given: 'atan(3*i+a)',
                expected: 'atan(3*i+a)'
            },
            {
                given: 'asec(3*i+a)',
                expected: 'asec(3*i+a)'
            },
            {
                given: 'acsc(3*i+a)',
                expected: 'acsc(3*i+a)'
            },
            {
                given: 'acot(3*i+a)',
                expected: 'acot(3*i+a)'
            },
            {
                given: 'cosh(3*i+a)',
                expected: 'cosh(3*i+a)'
            },
            
            //NUMERIC
            {
                given: 'cos(3*i+5)',
                expected: '2.855815004227387+9.606383448432581*i'
            },
            {
                given: 'sin(3*i+5)',
                expected: '-2.841692295606352*i-9.654125476854839'
            },
            {
                given: 'tan(3*i+5)',
                expected: '-0.002708235836224119+1.0041647106948153*i'
            },
            {
                given: 'sec(3*i+5)',
                expected: '-0.0956446409552863*i+0.028433530909971663'
            },
            {
                given: 'csc(3*i+5)',
                expected: '-0.02805851642308007*i-0.09532363467417838'
            },
            {
                given: 'cot(3*i+5)',
                expected: '-0.0026857984057586373-0.995845318575854*i'
            },
            {
                given: 'acos(3*i+5)',
                expected: '-2.452913742502812*i+0.5469745802831137'
            },
            {
                given: 'asin(3*i+5)',
                expected: '1.023821746511783+2.452913742502812*i'
            },
            {
                given: 'atan(3*i+5)',
                expected: '0.08656905917945859*i+1.4236790442393028'
            },
            {
                given: 'asec(3*i+5)',
                expected: '0.08907951708809479*i+1.4237901324243536'
            },
            {
                given: 'acsc(3*i+5)',
                expected: '-0.08907951708809479*i+0.14700619437054302'
            },
            {
                given: 'acot(3*i+5)',
                expected: '-0.08656905917945851*i+0.1471172825555939'
            },
            {
                given: 'cosh(3*i+5)',
                expected: '-73.46729221264526+10.471557674805572*i'
            },
            {
                given: 'sinh(3*i+5)',
                expected: '-73.46062169567367+10.472508533940392*i'
            },
            {
                given: 'tanh(3*i+5)',
                expected: '0.000025368676207684*i+0.9999128201513535'
            },
            {
                given: 'sech(3*i+5)',
                expected: '-0.0019014661516951708*i-0.013340476530549645'
            },
            {
                given: 'csch(3*i+5)',
                expected: '-0.0019019704237010977*i-0.013341591397996653'
            },
            {
                given: 'coth(3*i+5)',
                expected: '0.0000253731000445137*i+1.000087186805897'
            },
            {
                given: 'acosh(3*i+5)',
                expected: '0.5469745802831136*i+2.452913742502812'
            },
            {
                given: 'asinh(3*i+5)',
                expected: '0.5339990695941687*i+2.4598315216234345'
            },
            {
                given: 'atanh(3*i+5)',
                expected: '0.14694666622552974+1.4808695768986575*i'
            },
            {
                given: 'asech(3*i+5)',
                expected: '-1.4237901324243494*i+0.08907951708807783'
            },
            {
                given: 'acsch(3*i+5)',
                expected: '-0.08740053182394636*i+0.14709131539545411'
            },
            {
                given: 'acoth(3*i+5)',
                expected: '-0.08992674989623915*i+0.14694666622552965'
            }
        ];
        
        for (var i = 0; i < testCases.length; ++i) {
            var result = nerdamer(testCases[i].given, null, 'numer').text();
            expect(round(result, 14)).toEqual(round(testCases[i].expected),14);
      }
    });
    it('should correctly get the numerator', function() {
        var testCases = [
            {
                given: '3/4*a',
                expected: '3*a'
            },
            {
                given: '8*a*b/(x*(x+1))',
                expected: '8*a*b'
            },
            {
                given: 'x+1/x',
                expected: 'x+x^(-1)'
            },
            {
                given: 'a*b/x',
                expected: 'a*b'
            },
            {
                given: 'x^2/(2*x+2)',
                expected: 'x^2'
            },
            {
                given: '1/3*x^2/(2*x+2)',
                expected: 'x^2'
            },
            {
                given: '2/a',
                expected: '2'
            },
        ];
        
        for (var i = 0; i < testCases.length; ++i) {
            var result = nerdamer(testCases[i].given).numerator().text();
            expect(result.toString()).toEqual(testCases[i].expected);
      }
    });   
    it('should correctly get the denominator', function() {
        var testCases = [
            {
                given: '3/4*a',
                expected: '4'
            },
            {
                given: '8*a*b/(x*(x+1))',
                expected: '(1+x)*x'
            },
            {
                given: 'x+1/x',
                expected: '1'
            },
            {
                given: 'a*b/x',
                expected: 'x'
            },
            {
                given: 'x^2/(2*x+2)',
                expected: '2+2*x'
            },
            {
                given: '1/3*x^2/(2*x+2)',
                expected: '3*(2+2*x)'
            },
            {
                given: '2/a',
                expected: 'a'
            },
        ];
        
        for (var i = 0; i < testCases.length; ++i) {
            var result = nerdamer(testCases[i].given).denominator().text();
            expect(result.toString()).toEqual(testCases[i].expected);
      }
    });
    it('should add vectors correctly', function() {
        expect(nerdamer('1+[a,b]').toString()).toEqual('[1+a,1+b]');
        expect(nerdamer('[a,b]+1').toString()).toEqual('[1+a,1+b]');
        expect(nerdamer('[a,b]+[a,b]').toString()).toEqual('[2*a,2*b]');
    });
    it('should subtract vectors correctly', function() {
        expect(nerdamer('1-[a,b]').toString()).toEqual('[-a+1,-b+1]');
        expect(nerdamer('[a,b]-1').toString()).toEqual('[-1+a,-1+b]');
        expect(nerdamer('[a,b]-[a,b]').toString()).toEqual('[0,0]');
    });
    it('should multiply vectors correctly', function() {
        expect(nerdamer('3*[a,b]').toString()).toEqual('[3*a,3*b]');
        expect(nerdamer('[a,b]*x').toString()).toEqual('[a*x,b*x]');
        expect(nerdamer('[a,b]*[a,b]').toString()).toEqual('[a^2,b^2]');
    });
    it('should divide vectors correctly', function() {
        expect(nerdamer('12/[3,4]').toString()).toEqual('[4,3]');
        expect(nerdamer('[21,15]/3').toString()).toEqual('[7,5]');
        expect(nerdamer('[a^2, b^2]/[a,b]').toString()).toEqual('[a,b]');
    });
    it('should get slices correctly', function() {
        expect(nerdamer('[1,2,3][0:2]').toString()).toEqual('[1,2]');
    });
    it('should get elements correctly', function() {
        expect(nerdamer('[1,2,3][1]').toString()).toEqual('2');
    });
    it('should remove near duplicates from vectors', function() {
        expect(nerdamer('vectrim([cos(0), 1, 1.000000000000001])').toString()).toEqual('[1]');
        expect(nerdamer('vectrim([cos(0), 1, 1.000000000000001], 0)').text()).toEqual('[1,1.000000000000001]');
    });
    it('should convert degrees to radians', function() {
        expect(nerdamer('radians(45)').toString()).toEqual('(1/4)*pi');
    });
    it('should convert radians to degrees', function() {
        expect(nerdamer('degrees(pi/4)').toString()).toEqual('45');
    });
    it('should rationalize correctly', function() {
        expect(nerdamer('rationalize(a/b+c/d+e/f)').toString()).toEqual('(a*d*f+b*c*f+b*d*e)*(b*d*f)^(-1)');
        expect(nerdamer('rationalize(1/x+x)').toString()).toEqual('(1+x^2)*x^(-1)');
        expect(nerdamer('rationalize((x+1)/x-1)').toString()).toEqual('x^(-1)');
        expect(nerdamer('rationalize((a*x^2+b)/x^2-1)').toString()).toEqual('(-x^2+a*x^2+b)*x^(-2)');
    });
    it('should handle matrix operations', function() {
        expect(nerdamer('matrix([3,4])^2').toString()).toEqual('matrix([9,16])');
        expect(nerdamer('2^matrix([3,4])').toString()).toEqual('matrix([8,16])');
        expect(nerdamer('2^matrix([3,4])').toString()).toEqual('matrix([8,16])');
        expect(nerdamer('2*matrix([3,4])').toString()).toEqual('matrix([6,8])');
        expect(nerdamer('matrix([1,2])+matrix([8,4])').toString()).toEqual('matrix([9,6])');
        expect(nerdamer('2+matrix([3,4])').toString()).toEqual('matrix([5,6])');
        expect(nerdamer('2-matrix([3,4])').toString()).toEqual('matrix([-1,-2])');
        expect(nerdamer('matrix([1,2])-matrix([8,4])').toString()).toEqual('matrix([-7,-2])');
        expect(nerdamer('matrix([3,4])-2').toString()).toEqual('matrix([1,2])');
        expect(nerdamer('matrix([8,4])/2').toString()).toEqual('matrix([4,2])');
        expect(nerdamer('matrix([1,2])/matrix([8,4])').toString()).toEqual('matrix([1/8,1/2])');
        expect(nerdamer('16/matrix([8,4])').toString()).toEqual('matrix([2,4])');
    });
    it('should perform scientific rounding', function() {
        expect(nerdamer('12/7*x+cos(33333333333333333)-11/17').text('scientific')).toEqual('-6.47058823529412e-1+1.71428571428571*x+cos(3.33333333333333e16)');
        expect(nerdamer('7/(11*x-24*x^2)+cos(13/44)^(300/21)').text('scientific')).toEqual('7*(-2.4e1*x^2+1.1e1*x)^(-1)+cos(2.95454545454545e-1)^1.42857142857143e1');
    });
    it('should throw for even negative powers in nthroots', function() {
        expect(function() {nerdamer('nthroot(-9, 2)').evaluate(); }).toThrowError();
    });
    it('should throw for zero powers in nthroots', function() {
        expect(function() {nerdamer('nthroot(-9, 0)').evaluate(); }).toThrowError();
    });
    it('should calculate nthroots', function() {
        expect(nerdamer('nthroot(-8, 3)').evaluate().text()).toEqual('-2');
        expect(nerdamer('nthroot(sqrt(64), sqrt(9))').evaluate().text()).toEqual('2');
        expect(nerdamer('nthroot(-1, 3)').evaluate().text()).toEqual('-1');
        expect(nerdamer('nthroot(-7, 3)').evaluate().text()).toEqual('-1.912931182772388873');
        expect(nerdamer('nthroot(-x*8, 3)').evaluate().text()).toEqual('nthroot(-8*x,3)');
    });
    it('should calculate cube roots', function () {
        expect(nerdamer('cbrt(8)').evaluate().text()).toEqual('2');
        expect(nerdamer('cbrt(x)').evaluate().text()).toEqual('cbrt(x)');
        expect(nerdamer('cbrt(27*x^3)').evaluate().text()).toEqual('3*x');
        expect(nerdamer('cbrt((y^3*x^3))').evaluate().text()).toEqual('x*y');
    });
    it('should correctly build a JS function', function () {
        expect(nerdamer('acos((-x)^(1/6))').buildFunction()(0)).toEqual(1.5707963267948966);
        //factorials
        expect(nerdamer('x^2+x!').buildFunction()(4)).toEqual(40);
    });
    it('should correctly build for a nerdamer defined function', function () {
        //Note: this may break at some point when big numbers are implemented 
        expect(nerdamer('Ci(x)+x').buildFunction()(4)).toEqual(3.8590183021130704);
    });
    it('should handle nested functions', function() {
        nerdamer.setFunction("a", ["x"], "2*x")
        nerdamer.setFunction("b", ["x"], "x^2")

        expect(nerdamer("a(b(x))").text()).toEqual('2*x^2');
    });
    it('should handle percent', function() {
        expect(nerdamer('10%+20%').toString()).toEqual('3/10');
        expect(nerdamer('a%/10%').toString()).toEqual('(1/10)*a');
        expect(nerdamer('x%-x%').toString()).toEqual('0');
        expect(nerdamer('x%*x%').toString()).toEqual('(1/10000)*x^2');
    });
    it('should recognize the mod and percent operator', function() {
        expect(nerdamer('3*(a%%b%)').toString()).toEqual('3*mod((1/100)*a,(1/100)*b)')
    });
    it('should rewrite e as exp', function() {
        block('E_TO_EXP', function() {
            expect(nerdamer('(3*e^(e^(x))+tan(-e^x))+a').toString()).toEqual('3*exp(exp(x))+a+tan(-exp(x))');
        });
    });
    it('should unwrap even abs', function() {
        expect(nerdamer('(3*abs(x))^2').toString()).toEqual('3*x^2');
    });
});

describe('Further arithmetic test cases', function () {
    it('Batch 1', function () {
        // given
        var testCases = [
            {
                given: '(x+x^2)+x',
                expected: '2*x+x^2',
                expectedValue: '8.61'
            },
            {
                given: '(x+1)+4',
                expected: '5+x',
                expectedValue: '7.1'
            },
            {
                given: 'x+x+1+x',
                expected: '1+3*x',
                expectedValue: '7.3'
            },
            {
                given: '(x+1)+(8+y)',
                expected: '9+x+y',
                expectedValue: '14.4'
            },
            {
                given: '(x+1)+(a+y)',
                expected: '1+a+x+y',
                expectedValue: '13.82'
            },
            {
                given: '(x+x^2)+(x^3+x)',
                expected: '2*x+x^2+x^3',
                expectedValue: '17.871000000000002'
            },
            {
                given: '3*(x+x^2)+5*(x^3+x)',
                expected: '3*x^2+5*x^3+8*x',
                expectedValue: '76.33500000000001'
            },

            {
                given: '2*(1+x)*3*(z+x)^x*8',
                expected: '48*(1+x)*(x+z)^x',
                expectedValue: '1601.2623349876335'
            },
            {
                given: '(x+x^2)*(x+x^2)',
                expected: '(x+x^2)^2',
                expectedValue: '42.3801'
            },
            {
                given: '(x+x^2)*2*(x+x^2)',
                expected: '2*(x+x^2)^2',
                expectedValue: '84.7602'
            },
            {
                given: '(x*y)*(x*y)',
                expected: '(x*y)^2',
                expectedValue: '48.024899999999995'
            },
            {
                given: '(x*y)*(x*z)',
                expected: 'x^2*y*z',
                expectedValue: '14.553'
            },
            {
                given: '(x+y)*(x+y)',
                expected: '(x+y)^2',
                expectedValue: '29.160000000000004'
            },
            {
                given: '(x+y)*(y+x)',
                expected: '(x+y)^2',
                expectedValue: '29.160000000000004'
            },
            {
                given: '(1+x)*(x+y)',
                expected: '(1+x)*(x+y)',
                expectedValue: '16.74'
            },
            {
                given: 'x*y*x',
                expected: 'x^2*y',
                expectedValue: '14.553'
            },
            {
                given: 'x*y*x/x',
                expected: 'x*y',
                expectedValue: '6.93'
            },
            {
                given: 'x*y*x/x/x/y',
                expected: '1',
                expectedValue: '1'
            },
            {
                given: '(x+1)^x*(z+1)^z*(x+1)',
                expected: '(1+x)^(1+x)*(1+z)^z',
                expectedValue: '66.71926395781806'
            },
            {
                given: '3*(x^2+1)^x*(2*(x^2+1))',
                expected: '6*(1+x^2)^(1+x)',
                expectedValue: '1124.7675342780879'
            },
            {
                given: '2*(x+x^2)+1',
                expected: '1+2*x+2*x^2',
                expectedValue: '14.02'
            },
            {
                given: '2*(x+x^2)+3*(x^2+x^3)',
                expected: '2*x+3*x^3+5*x^2',
                expectedValue: '54.033'
            },
            {
                given: '2*(x+x^2)+3*(x^2+x^3)^2',
                expected: '2*x+2*x^2+3*(x^2+x^3)^2',
                expectedValue: '573.7087230000001'
            },
            {
                given: '2*(x+x^2)+3*(x^2+x^3)^2+x',
                expected: '2*x^2+3*x+3*(x^2+x^3)^2',
                expectedValue: '575.8087230000001'
            },
            {
                given: '2*(x+x^2)+3*(x^2+x^3)^2+(x^2+x)',
                expected: '3*(x^2+x^3)^2+3*x+3*x^2',
                expectedValue: '580.218723'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);
            var value = parsed.evaluate(values).text('decimals');

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
            expect(round(value, 14)).toEqual(round(testCases[i].expectedValue),14);
        }
    });
    it('Batch 2', function () {
        // given
        var testCases = [
            {
                given: '2*(x+x^2)^2+3*(x^2+x)^2',
                expected: '5*(x+x^2)^2',
                expectedValue: '211.9005'
            },
            {
                given: '2*(x+x^2)^2+2*(x+x^2)^3+4*(x+x^2)^2',
                expected: '2*(x+x^2)^3+6*(x+x^2)^2',
                expectedValue: '806.069502'
            },
            {
                given: '2*x^2+3*x+y+y^2',
                expected: '2*x^2+3*x+y+y^2',
                expectedValue: '29.31'
            },
            {
                given: '(y+y^2)^6+y',
                expected: '(y+y^2)^6+y',
                expectedValue: '8163841.198203677'
            },
            {
                given: '2*(x+x^2)+(y+y^2)^6+y',
                expected: '(y+y^2)^6+2*x+2*x^2+y',
                expectedValue: '8163854.218203676'
            },
            {
                given: '2*(x+x^2)+4',
                expected: '2*x+2*x^2+4',
                expectedValue: '17.02'
            },
            {
                given: '2*(x+x^2)+48*x*y',
                expected: '2*(x+x^2)+48*x*y',
                expectedValue: '345.66'
            },
            {
                given: '2*(x+x^2)+(48+x+2*y)',
                expected: '2*x^2+3*x+2*y+48',
                expectedValue: '69.72'
            },
            {
                given: '(x^2+1)-1',
                expected: 'x^2',
                expectedValue: '4.41'
            },
            {
                given: '(x^2+1)-1+x+x^3+x',
                expected: '2*x+x^2+x^3',
                expectedValue: '17.871000000000002'
            },
            {
                given: '5+(x^2+y+1)+(x+y+15)',
                expected: '2*y+21+x+x^2',
                expectedValue: '34.11'
            },
            {
                given: '(x^2+y+1)+(x+y+15)+(x^2+y+1)',
                expected: '17+2*x^2+x+3*y',
                expectedValue: '37.82'
            },
            {
                given: '(x^2+y+1)+(x+x^2)',
                expected: '1+2*x^2+x+y',
                expectedValue: '15.22'
            },
            {
                given: '(1+(1+x)^2)',
                expected: '(1+x)^2+1',
                expectedValue: '10.610000000000001'
            },
            {
                given: '(x+x)^x',
                expected: '2^x*x^x',
                expectedValue: '20.36214425352342'
            },
            {
                given: '1/4*2^x*x^x',
                expected: '(1/4)*2^x*x^x',
                expectedValue: '5.090536063380855'
            },
            {
                given: 'x^2+x-x^y+x',
                expected: '-x^y+2*x+x^2',
                expectedValue: '-2.9597419502414644'
            },
            {
                given: 'x^x+x^x-1-2*x^x',
                expected: '-1',
                expectedValue: '-1'
            },
            {
                given: 'x^x+x^x-1-2*x^x+2*y+1-2*y',
                expected: '0',
                expectedValue: '0'
            },
            {
                given: '(x+1)-x*y-5+2*x*y',
                expected: '-4+x+x*y',
                expectedValue: '5.03'
            },
            {
                given: '(2*x-y+7-x+y-x-5)*2+15/3',
                expected: '9',
                expectedValue: '9'
            },
            {
                given: '(x+x^2)^x*x',
                expected: '(x+x^2)^x*x',
                expectedValue: '107.33450820142282'
            },
            {
                given: '(x+x^2)^x*(x+x^x)',
                expected: '(x+x^2)^x*(x+x^x)',
                expectedValue: '350.09644568327894'
            },
            {
                given: '(x+x^2)^2*x',
                expected: '(x+x^2)^2*x',
                expectedValue: '88.99821'
            },
            {
                given: '(z+z^2)^x*(x+y^2+1)',
                expected: '(1+x+y^2)*(z+z^2)^x',
                expectedValue: '59.976442963530964'
            },
            {
                given: '(x+1)/(x+1)',
                expected: '1',
                expectedValue: '1'
            },
            {
                given: 'x*y*z/(x*y*z)',
                expected: '1',
                expectedValue: '1'
            },
            {
                given: 'x^y/x^y',
                expected: '1',
                expectedValue: '1'
            },
            {
                given: '4*x^2',
                expected: '4*x^2',
                expectedValue: '17.64'
            },
            {
                given: '5*x^y/x^y',
                expected: '5',
                expectedValue: '5'
            },
            {
                given: '(x+x^6)^y/(x+x^6)^y',
                expected: '1',
                expectedValue: '1'
            },
            {
                given: '2^y*2^y',
                expected: '2^(2*y)',
                expectedValue: '97.00586025666546'
            },
            {
                given: '2^x',
                expected: '2^x',
                expectedValue: '4.2870938501451725'
            },
            {
                given: '((x^3+x)^x*(x^2+x)^x+1)*x',
                expected: '((x+x^2)^x*(x+x^3)^x+1)*x',
                expectedValue: '17667.12052556627'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);
            var value = parsed.evaluate(values).text('decimals');

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
            expect(round(value, 8)).toEqual(round(testCases[i].expectedValue ,8));
        }
    });
    it('Batch 3', function () {
        var testCases = [
            {
                given: '(8*x)^(2/3)',
                expected: '4*x^(2/3)',
                expectedValue: '6.559531991200272'
            },
            {
                given: '(y^3+2)/(z^4*(y^3/2))^2*cos(x)*sqrt(x)',
                expected: '4*(2+y^3)*(y^3*z^4)^(-2)*cos(x)*sqrt(x)',
                expectedValue: '-0.08596229340057991'
            },
            {
                given: '2*x^4*(1+log(x)^2)-(-x^4)',
                expected: '2*(1+log(x)^2)*x^4+x^4',
                expectedValue: '79.75553102441935'
            },
            {
                given: '(x^6)^(1/4)',
                expected: 'abs(x)^(3/2)',
                expectedValue: '3.043189116699782'
            },
            {
                given: '2*x*(4^(1/3))^3',
                expected: '8*x',
                expectedValue: '16.8'
            },
            {
                given: '6*(4^(1/3)*4^(2/3))',
                expected: '24',
                expectedValue: '24'
            },
            {
                given: '(5*(4^(1/3)))^3',
                expected: '500',
                expectedValue: '500'
            },
            {
                given: '2*x*(5*(4^(1/3)))^3',
                expected: '1000*x',
                expectedValue: '2100'
            },
            {
                given: 'y^y^y',
                expected: 'y^y^y',
                expectedValue: '456848755025637200000000000'
            },
            {
                given: '(x^4)^(1/4)',
                expected: 'abs(x)',
                expectedValue: '2.1'
            },
            {
                given: '(-2*x)^2',
                expected: '4*x^2',
                expectedValue: '17.64'
            },
            {
                given: '-4*x^3--x^3+x^2-(-2*x)^2+y',
                expected: '-3*x^2-3*x^3+y',
                expectedValue: '-37.713'
            },
            {
                given: '2*x/x',
                expected: '2',
                expectedValue: '2'
            },
            {
                given: '(x^2*y)^2',
                expected: 'x^4*y^2',
                expectedValue: '211.78980899999996'
            },
            {
                given: '(x+1)^(z+1)*(1+x)^(1+z)',
                expected: '(1+x)^(2+2*z)',
                expectedValue: '92.35210000000002'
            },
            {
                given: '(x+1)^(z+1)*(1+x)^4',
                expected: '(1+x)^(5+z)',
                expectedValue: '887.5036810000004'
            },
            {
                given: '(-1)^x',
                expected: '(-1)^x',
                expectedValue: '(-1)^2.1'
            },
            {
                given: '(-25)^(1/5)',
                expected: '(-1)^(1/5)*5^(2/5)',
                expectedValue: '-1.9036539387158786'
            },
            {
                given: '-24.160787001838543^1.3^(-1)',
                expected: '-108007829^(-10/13)*2609554151^(10/13)',
                expectedValue: '-11.585948599615737'
            },
            {
                given: '(x+y)--(x+y)',
                expected: '2*x+2*y',
                expectedValue: '10.8'
            },
            {
                given: '-z-(r+x)--(r+x)',
                expected: '-z',
                expectedValue: '-1'
            },
            {
                given: '+-z-(r+x)+--+(r+x)',
                expected: '-z',
                expectedValue: '-1'
            },
            {
                given: '(x)^(3-x)',
                expected: 'x^(-x+3)',
                expectedValue: '1.9498327706486203'
            },
            {
                given: '(1/2*x)^(1/2)',
                expected: 'sqrt(2)^(-1)*sqrt(x)',
                expectedValue: '1.02469507659596'
            },
            {
                given: '256^(1/8)',
                expected: '2',
                expectedValue: '2'
            },
            {
                given: '-2*256^(1/8)',
                expected: '-4',
                expectedValue: '-4'
            },
            {
                given: '(81*(x*y)^2+9*x*y)+(9*x*y)',
                expected: '18*x*y+81*x^2*y^2',
                expectedValue: '4014.7568999999994'
            },
            {
                given: '((x)^(1/2)*x^(1/3))-x^(5/6)',
                expected: '0',
                expectedValue: '0'
            },
            {
                given: '(9*y*x+1)^3',
                expected: '(1+9*x*y)^3',
                expectedValue: '254478.51475299997'
            },
            {
                given: '(81*(x*y)^2+9*x*y)*(9*x*y)',
                expected: '9*(81*x^2*y^2+9*x*y)*x*y',
                expectedValue: '246510.37095299995'
            },
            {
                given: '2*((81*(x*y)^2+9*x*y))*(5*(9*x*y))',
                expected: '90*(81*x^2*y^2+9*x*y)*x*y',
                expectedValue: '2465103.7095299996'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);
            var value = parsed.evaluate(values).text('decimals', 18);

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
            expect(round(value, 12)).toEqual(round(testCases[i].expectedValue ,12));
        }
    });
    it('Batch 4', function() {
        var testCases = [
            {
                given: '5*(x+x^2)*(2*(x+x^2)^x)',
                expected: '10*(x+x^2)^(1+x)',
                expectedValue: '3327.3697542441078'
            },
            {
                given: '(x+x^2)^x*(x+x^2)',
                expected: '(x+x^2)^(1+x)',
                expectedValue: '332.7369754244108'
            }
        ];
        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);
            var value = parsed.evaluate(values).text('decimals');

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
            expect(_(value, 10)).toEqual(_(testCases[i].expectedValue, 10));
        }
    })
});

describe('trigonometric functions', function () {
    it('should be computed properly', function () {
        // given
        var testCases = [
            {
                given: 'cos(pi)',
                expected: '-1',
                expectedValue: '-1'
            },
            {
                given: 'cos(2*pi)',
                expected: '1',
                expectedValue: '1'
            },
            {
                given: 'cos(2*pi/3)',
                expected: '-1/2',
                expectedValue: '-0.5'
            },
            {
                given: 'cos(3*pi/4)',
                expected: '-sqrt(2)^(-1)',
                expectedValue: '-0.7071067811865475'
            },
            {
                given: 'sin(pi)',
                expected: '0',
                expectedValue: '0'
            },
            {
                given: 'sin(pi/2)',
                expected: '1',
                expectedValue: '1'
            },
            {
                given: 'sin(-pi/2)',
                expected: '-1',
                expectedValue: '-1'
            },
            {
                given: 'sin(3*pi/4)',
                expected: 'sqrt(2)^(-1)',
                expectedValue: '0.7071067811865475'
            },
            {
                given: 'tan(3*pi/4)',
                expected: '-1',
                expectedValue: '-1'
            },
            {
                given: 'tan(2*pi/3)',
                expected: '-sqrt(3)',
                expectedValue: '-1.7320508075688772'
            },
            {
                given: 'tan(4*pi/3)',
                expected: 'sqrt(3)',
                expectedValue: '1.7320508075688772'
            },
            {
                given: 'tan(pi/3)',
                expected: 'sqrt(3)',
                expectedValue: '1.7320508075688772'
            },
            {
                given: 'tan(pi)',
                expected: '0',
                expectedValue: '0'
            },
            {
                given: 'sec(pi)',
                expected: '-1',
                expectedValue: '-1'
            },
            {
                given: 'sec(2*pi/3)',
                expected: '-2',
                expectedValue: '-2'
            },
            {
                given: 'sec(4*pi/3)',
                expected: '-2',
                expectedValue: '-2'
            },
            {
                given: 'sec(5*pi/3)',
                expected: '2',
                expectedValue: '2'
            },
            {
                given: 'sec(pi/6)',
                expected: '2*sqrt(3)^(-1)',
                expectedValue: '1.1547005383792517'
            },
            {
                given: 'csc(5*pi/3)',
                expected: '-2*sqrt(3)^(-1)',
                expectedValue: '-1.1547005383792517'
            },
            {
                given: 'cot(pi/2)',
                expected: '0',
                expectedValue: '0'
            },
            {
                given: 'cot(2*pi/3)',
                expected: '-sqrt(3)^(-1)',
                expectedValue: '-0.5773502691896258'
            },
            {
                given: 'cot(4*pi/3)',
                expected: 'sqrt(3)^(-1)',
                expectedValue: '0.5773502691896258'
            },
            {
                given: 'cot(5*pi/6)',
                expected: '-sqrt(3)',
                expectedValue: '-1.7320508075688772'
            },
            {
                given: 'acot(0)',
                expected: 'acot(0)',
                expectedValue: '1.5707963267948966'
            },
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);
            var value = parsed.evaluate().text('decimals');

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
            expect(round(value, 14)).toEqual(round(testCases[i].expectedValue),14);
        }
    });
    it('should handle inverse trig in complex domain', function() {
        expect(nerdamer('asin(2)').evaluate().text()).toEqual('-1.3169578969248164*i+1.570796326794896580');
        expect(nerdamer('asin(2.19549352839451962743423602992)').evaluate().text()).toEqual('-1.423114269539483*i+1.570796326794896580');
        expect(nerdamer('acos(2)').evaluate().text()).toEqual('1.3169578969248164*i');
        expect(nerdamer('atan(i)').evaluate().text()).toEqual('Infinity*i');
        
        expect(nerdamer('asec(0.89)').evaluate().text()).toEqual('0.000000000000000250+0.4921996534425188*i'); // Has rounding errors
        expect(nerdamer('acsc(0.23)').evaluate().text()).toEqual('-2.1493278111894223*i+1.570796326794897197'); // Has rounding errors
    });
    it('should throw for wrong trigonometric arguments', function () {
        // given
        var testCases = [
            'tan(pi/2)',
            'sec(pi/2)',
            'csc(pi)',
            'csc(2*pi)',
            'cot(pi)',
            'cot(2*pi)'
        ];

        for (var i = 0; i < testCases.length; ++i) {
            var threwError = false;
            try {
                nerdamer(testCases[i]);
            } catch (e) {
                threwError = true;
            }
            expect(threwError).toBe(true);
        }
    });
    it('should throw for malformed expression', function () {
        expect(function(){nerdamer('+');}).toThrowError();
        expect(function(){nerdamer('(+)');}).toThrowError();
        expect(function(){nerdamer('cos(');}).toThrowError();
        expect(function(){nerdamer('(x+1))');}).toThrowError();
        expect(function(){nerdamer('/2');}).toThrowError();
        expect(function(){nerdamer('()');}).toThrowError();
        expect(function(){nerdamer('5+');}).toThrowError();
    });
    it('should calculate correctly with variables', function () {
        // given
        var testCases = [
            {
                given: 'cos(x)',
                expected: 'cos(x)',
                expectedValue: '-0.5048461045998576'
            },
            {
                given: 'sin(x)',
                expected: 'sin(x)',
                expectedValue: '0.8632093666488737'
            },
            {
                given: 'tan(x)',
                expected: 'tan(x)',
                expectedValue: '-1.7098465429045073'
            },
            {
                given: 'y*tan(x)*tan(x)',
                expected: 'tan(x)^2*y',
                expectedValue: '9.647798160932235'
            },
            {
                given: '2*cos(x)+cos(x)',
                expected: '3*cos(x)',
                expectedValue: '-1.514538313799573'
            },
            {
                given: '2*cos(x)+cos(x+8+5*x)',
                expected: '2*cos(x)+cos(6*x+8)',
                expectedValue: '-1.18837521422445'
            },
            {
                given: 'x^2+2*cos(x)+cos(x+8+5*x)+4*x^2',
                expected: '2*cos(x)+5*x^2+cos(6*x+8)',
                expectedValue: '20.86162478577555'
            },
            {
                given: 'cos(x)*cos(x)',
                expected: 'cos(x)^2',
                expectedValue: '0.25486958932965037'
            },
            {
                given: 'x^x*cos(x)*sin(x)/x',
                expected: 'cos(x)*sin(x)*x^(-1+x)',
                expectedValue: '-0.985635592498868'
            },
            {
                given: '2*cos(x)+5*cos(2*x)',
                expected: '2*cos(x)+5*cos(2*x)',
                expectedValue: '-3.460996315903212'
            },
            {
                given: '2*cos(x)*5*cos(2*x)',
                expected: '10*cos(2*x)*cos(x)',
                expectedValue: '2.4750626589177886'
            },
            {
                given: 'cos(x)+(x+x^2+x)',
                expected: '2*x+x^2+cos(x)',
                expectedValue: '8.105153895400143'
            },
            {
                given: 'cos(x)+(x+x^2+7)',
                expected: '7+cos(x)+x+x^2',
                expectedValue: '13.005153895400143'
            },
            {
                given: 'x/cos(x)*cos(x)',
                expected: 'x',
                expectedValue: '2.1'
            },
            {
                given: 'tan(x)*tan(x)',
                expected: 'tan(x)^2',
                expectedValue: '2.923575200282495'
            },
            {
                given: '2*(tan(x)+tan(2*x)+7)-6*tan(x)',
                expected: '-4*tan(x)+14+2*tan(2*x)',
                expectedValue: '24.39494572063571'
            },
            {
                given: '((3+y)*2-(cos(x)*4+z))',
                expected: '-4*cos(x)-z+2*y+6',
                expectedValue: '13.61938441839943'
            },
            {
                given: 'cos(x^2)*cos(x^2)^x',
                expected: 'cos(x^2)^(1+x)',
                expectedValue: '0.023397743182121563*(-1)^3.1'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);
            var value = parsed.evaluate(values).text('decimals');

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
            expect(round(value, 14)).toEqual(round(testCases[i].expectedValue),14);
        }
    });
    it('should cancel inverses correctly', function () {
        // given
        var testCases = [
            {
                given: 'cos(x)*sec(x)',
                expected: '1'
            }, 
            {
                given: 'sin(x)*csc(x)',
                expected: '1'
            }, 
            {
                given: 'tan(x)*cot(x)',
                expected: '1'
            }, 
            {
                given: 'cosh(x)*sech(x)',
                expected: '1'
            }, 
            {
                given: 'sinh(x)*csch(x)',
                expected: '1'
            }, 
            {
                given: 'tanh(x)*coth(x)',
                expected: '1'
            }

        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given).evaluate();

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
        }
    });
    it('should handle known trig cases for `numer`', function() {
        expect(nerdamer('tan(pi)', {}, 'numer').text()).toEqual('0');
        expect(nerdamer('cot(90*pi/180)', {}, 'numer').text()).toEqual('0');
    });
});

describe('hyperbolic trigonometric functions', function () {
    it('should be computed properly', function () {
        // given
        var testCases = [
            {
                given: 'acosh(1/23.12)',
                expected: 'acosh(25/578)',
                expectedValue: '-4.441e-16+1.5275302342078616*i'
            },
            {
                given: 'sech(0.1)',
                expected: 'sech(1/10)',
                expectedValue: '0.9950207489532267'
            },
            {
                given: 'csch(0.1)',
                expected: 'csch(1/10)',
                expectedValue: '9.98335275729611'
            },
            {
                given: 'tanh(0.1)',
                expected: 'tanh(1/10)',
                expectedValue: '0.09966799462495582'
            },
            {
                given: 'coth(0.1)',
                expected: 'coth(1/10)',
                expectedValue: '10.03331113225399'
            },
            {
                given: 'acosh(0.1)',
                expected: 'acosh(1/10)',
                expectedValue: '1.4706289056333368*i'
            },
            {
                given: 'asinh(0.1)',
                expected: 'asinh(1/10)',
                expectedValue: '0.0998340788992076'
            },
            {
                given: 'atanh(-5)',
                expected: 'atanh(-5)',
                expectedValue: '-0.20273255405408225+1.5707963267948966*i'
            },
            {
                given: 'asech(0.5)',
                expected: 'asech(1/2)',
                expectedValue: '1.3169578969248166'
            },
            {
                given: 'acsch(1.1)',
                expected: 'acsch(11/10)',
                expectedValue: '0.8156089004401478'
            },
            {
                given: 'acoth(1.2)',
                expected: 'acoth(6/5)',
                expectedValue: '1.1989476363991853'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);
            var value = parsed.evaluate().text('decimals');

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
            expect(round(value, 14)).toEqual(round(testCases[i].expectedValue),14);
        }
    });
    xit('should throw for wrong trigonometric arguments', function () {
        // given
        var testCases = [
            'csch(0)',
            'coth(0)'
        ];

        for (var i = 0; i < testCases.length; ++i) {
            var threwError = false;
            try {
                nerdamer(testCases[i]).evaluate();
            } catch (e) {
                threwError = true;
            }
            expect(threwError).toBe(true);
        }
    });
    it('should calculate correctly with variables', function () {
        // given
        var testCases = [
            {
                given: 'cosh(x)',
                expected: 'cosh(x)',
                expectedValue: '4.1443131704103155'
            },
            {
                given: 'sinh(x)',
                expected: 'sinh(x)',
                expectedValue: '4.021856742157334'
            },
            {
                given: 'tanh(x)',
                expected: 'tanh(x)',
                expectedValue: '0.9704519366134539'
            },
            {
                given: 'y*tanh(x)*tanh(x)',
                expected: 'tanh(x)^2*y',
                expectedValue: '3.1078639722134502'
            },
            {
                given: '2*cosh(x)+cosh(x)',
                expected: '3*cosh(x)',
                expectedValue: '12.432939511230947'
            },
            {
                given: '2*cosh(x)+cosh(x+8+5*x)',
                expected: '2*cosh(x)+cosh(6*x+8)',
                expectedValue: '442014320.214284'
            },
            {
                given: 'x^2+2*cosh(x)+cosh(x+8+5*x)+4*x^2',
                expected: '2*cosh(x)+5*x^2+cosh(6*x+8)',
                expectedValue: '442014342.264283977631810'
            },
            {
                given: 'cosh(x)*cosh(x)',
                expected: 'cosh(x)^2',
                expectedValue: '17.17533165443640'
            },
            {
                given: 'x^x*cosh(x)*sinh(x)/x',
                expected: 'cosh(x)*sinh(x)*x^(-1+x)',
                expectedValue: '37.69818030329012'
            },
            {
                given: '2*cosh(x)+5*cosh(2*x)',
                expected: '2*cosh(x)+5*cosh(2*x)',
                expectedValue: '175.04194288518471'
            },
            {
                given: '2*cosh(x)*5*cosh(2*x)',
                expected: '10*cosh(2*x)*cosh(x)',
                expectedValue: '1382.15593192881703'
            },
            {
                given: 'cosh(x)+(x+x^2+x)',
                expected: '2*x+x^2+cosh(x)',
                expectedValue: '12.75431317041032'
            },
            {
                given: 'cosh(x)+(x+x^2+7)',
                expected: '7+cosh(x)+x+x^2',
                expectedValue: '17.65431317041032'
            },
            {
                given: 'x/cosh(x)*cosh(x)',
                expected: 'x',
                expectedValue: '2.1'
            },
            {
                given: 'tanh(x)*tanh(x)',
                expected: 'tanh(x)^2',
                expectedValue: '0.94177696127680'
            },
            {
                given: '2*(tanh(x)+tanh(2*x)+7)-6*tanh(x)',
                expected: '-4*tanh(x)+14+2*tanh(2*x)',
                expectedValue: '12.11729298646525'
            },
            {
                given: '((3+y)*2-(cosh(x)*4+z))',
                expected: '-4*cosh(x)-z+2*y+6',
                expectedValue: '-4.97725268164126'
            },
            {
                given: 'cosh(x^2)*cosh(x^2)^x',
                expected: 'cosh(x^2)^(1+x)',
                expectedValue: '100982.42051309341241'
            }
        ];

        for (var i = 0; i < testCases.length; ++i) {
            // when
            var parsed = nerdamer(testCases[i].given);
            var value = parsed.evaluate(values).text('decimals', 15);

            // then
            expect(parsed.toString()).toEqual(testCases[i].expected);
            expect(round(value, 14)).toEqual(round(testCases[i].expectedValue),14);
        }
    });
    it('should not overflow', function() {
        expect(nerdamer('(x+1)+((x+1)^2+(x+1)^3)').toString()).toEqual('(1+x)^2+(1+x)^3+1+x');
    });
});

describe('omit brackets for functions', function() {
    it('should add functions with coefficients', function() {
        expect(nerdamer('2 sin x + 4 sin x').toString()).toEqual('6*sin(x)');
    });
    it('should add functions without coefficients', function() {
        expect(nerdamer('sin x + sin x').toString()).toEqual('2*sin(x)');
    });
    it('should multiply and divide functions with "random" spaces', function() {
        expect(nerdamer('3sin x /6+sin x').toString()).toEqual('(3/2)*sin(x)');
    });
    it('should recognize functions with multiple arguments', function() {
        expect(nerdamer('2 max 1,2,3 +1').toString()).toEqual('7');
    });
    it('should recognize functions with arguments containing coefficients', function() {
        expect(nerdamer('sin 2x').toString()).toEqual('sin(2*x)');
    });
    it('should recognize functions with arguments containing coefficients', function() {
        expect(nerdamer('sin 2x').toString()).toEqual('sin(2*x)');
        expect(nerdamer('sin a x').toString()).toEqual('sin(a)*x');
    });
    it('should multiply functions without brackets', function() {
        expect(nerdamer('sin 2a cos 2b').toString()).toEqual('cos(2*b)*sin(2*a)');
        expect(nerdamer('sin x + sin x + 1 ').toString()).toEqual('1+2*sin(x)');
        expect(nerdamer('5 x y sin x').toString()).toEqual('5*sin(x)*x*y');
    });
});

