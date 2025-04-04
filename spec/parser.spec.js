/* eslint-disable @typescript-eslint/no-require-imports */
/* global describe, it, expect, require */
"use strict"

const { remove } = require('../output/utils/array');
const { Parser: parser } = require('../output/core/classes/parser/Parser');
const { Token } = require('../output/core/classes/parser/Token');

const implicitOperators = (x) => { return x.position !== -1 };
const tokensToString = (x) => { return x.text(); }

let { ALLOWED_CHARACTERS } = require('../output/core/classes/parser/Token');

describe('The Tokenizer', () => {
    const implicit_multiplication = parser.get('ALLOW_IMPLICIT_MULTIPLICATION');
    parser.set('ALLOW_IMPLICIT_MULTIPLICATION', false);
    it('should tokenize simple expressions', () => {
        expect(tokensToString(parser.tokenize('1*2+3'))).toEqual('1 * 2 + 3');
    });

    it('should tokenize multi-word variables', () => {
        expect(tokensToString(parser.tokenize('word*word'))).toEqual('word * word');
        expect(tokensToString(parser.tokenize('word*1'))).toEqual('word * 1');
    });
    it('should tokenize and differentiate scientific numbers', () => {
        expect(tokensToString(parser.tokenize('4E1+1'))).toEqual('40 + 1');
        expect(tokensToString(parser.tokenize('4.e1'))).toEqual('40');
        expect(tokensToString(parser.tokenize('4E-1+1'))).toEqual('0.4 + 1');
        expect(tokensToString(parser.tokenize('4e-1+1'))).toEqual('0.4 + 1');
        expect(tokensToString(parser.tokenize('e-1+1'))).toEqual('e - 1 + 1');
        expect(tokensToString(parser.tokenize('4e*1+1'))).toEqual('4 * e * 1 + 1');
        expect(tokensToString(parser.tokenize('4.321e+4+1'))).toEqual('43210 + 1');
    });
    it('should tokenize with implicit multiplication', () => {
        expect(tokensToString(parser.tokenize('4e*1+1'))).toEqual('4 * e * 1 + 1');
        expect(tokensToString(parser.tokenize('(a+b)(c+d)'))).toEqual('( a + b ) * ( c + d )');
    });
    it('should tokenize word variables with underscores', () => {
        expect(tokensToString(parser.tokenize('word_2*1'))).toEqual('word_2 * 1');
        expect(tokensToString(parser.tokenize('1_*1'))).toEqual('1 * _ * 1');
        expect(tokensToString(parser.tokenize('_x*1'))).toEqual('_x * 1');
    });


    it('should tokenize Greek characters', () => {
        expect(tokensToString(parser.tokenize('Π+4'))).toEqual('Π + 4');
    });
    it('should tokenize square brackets', () => {
        expect(tokensToString(parser.tokenize('[1,2,3]'))).toEqual('[ 1 , 2 , 3 ]');
    });
    it('should tokenize parenthesis', () => {
        expect(tokensToString(parser.tokenize('(1,2,3)'))).toEqual('( 1 , 2 , 3 )');
    });
    it('should tokenize adjacent brackets', () => {
        expect(tokensToString(parser.tokenize('([1,2,3])'))).toEqual('( [ 1 , 2 , 3 ] )');
        expect(tokensToString(parser.tokenize('([1,2,3])()').filter(implicitOperators))).toEqual('( [ 1 , 2 , 3 ] ) ( )');
    });
    it('should recognize custom characters', () => {
        ALLOWED_CHARACTERS.push('☺');
        expect(parser.tokenize('1+☺-x')[2].type).toEqual(Token.VARIABLE);
        remove(ALLOWED_CHARACTERS, '☺');
    });
    it('should tokenize single letter variables', () => {
        parser.set({'USE_SINGLE_LETTER_VARIABLES': true});
        expect(tokensToString(parser.tokenize('xyz+abc'))).toEqual('x * y * z + a * b * c');
        expect(tokensToString(parser.tokenize('xyz+abc'))).toEqual('x * y * z + a * b * c');
        expect(tokensToString(parser.tokenize('xyz+abc'))).toEqual('x * y * z + a * b * c');
        parser.set({'USE_SINGLE_LETTER_VARIABLES': false});
    });

    it('should throw for missing brackets', () => {
        expect(() => tokensToString(parser.tokenize('xyz+(abc'))).toThrow();
        expect(() => tokensToString(parser.tokenize('xyz)+abc'))).toThrow();
        expect(() => tokensToString(parser.tokenize('([xyz)+abc'))).toThrow();
    });

    // operators and compound operators
    it('should recognize operators and compound operators', () => {
        expect(parser.tokenize('(x-1)^2-y')[1].value).toEqual('^');
        expect(parser.tokenize('-2==5x')[2].value).toEqual('==');
        expect(parser.tokenize('-2!!*5x')[2].value).toEqual('!!');
        expect(parser.tokenize('-2!!**5x')[3].value).toEqual('**');
        expect(parser.tokenize('cos(x-1)<=3x')[2].value).toEqual('<=');
        expect(parser.tokenize('x in [a, x, y]')[1].value).toEqual('in');

        // Make sure they are correctly parsed as tokens
        expect(parser.tokenize('(x-1)^2-y')[1].type).toEqual(Token.OPERATOR);
        expect(parser.tokenize('-2==5x')[2].type).toEqual(Token.OPERATOR);
        expect(parser.tokenize('-2!!*5x')[2].type).toEqual(Token.OPERATOR);
        expect(parser.tokenize('-2!!**5x')[3].type).toEqual(Token.OPERATOR);
        expect(parser.tokenize('cos(x-1)<=3x')[2].type).toEqual(Token.OPERATOR);
        expect(parser.tokenize('x in [a, x, y]')[1].type).toEqual(Token.OPERATOR);
    });

    it('should correctly generate the RPN', () => {
        expect(tokensToString(parser.toRPN(parser.tokenize('x+3*y')))).toEqual('x 3 y * +');
        expect(tokensToString(parser.toRPN(parser.tokenize('3+(x-3)^2+1')))).toEqual('3 ( x 3 - ) 2 ^ + 1 +');
        expect(tokensToString(parser.toRPN(parser.tokenize('f(9)*6').filter(implicitOperators)))).toEqual('f ( 9 ) 6 *');
    });
    it('should respect equal precedence operators when generating RPN', () => {
        expect(tokensToString(parser.toRPN(parser.tokenize('2-(5*3)+1')))).toEqual('2 ( 5 3 * ) - 1 +');
    });
    it('should respect the factorial operator precedence', () => {
        expect(tokensToString(parser.toRPN(parser.tokenize('2-(5*3)!^2')))).toEqual('2 ( 5 3 * ) ! 2 ^ -');
    });
    it('should respect the comma operator precedence', () => {
        expect(tokensToString(parser.toRPN(parser.tokenize('3*f(1+5,2,3)^2').filter(implicitOperators)))).toEqual('3 f ( 1 5 + 2 , 3 , ) 2 ^ *');
    });
    it('should respect the dot operator precedence', () => {
        expect(tokensToString(parser.toRPN(parser.tokenize('5*x.x^2+8')))).toEqual('5 x x . 2 ^ * 8 +');
    });

    it('should correctly mark prefix operators', () => {
        expect(tokensToString(parser.toRPN(parser.tokenize('--+3*-5*45')))).toEqual('3 `+ `- `- 5 `- * 45 *');
        expect(tokensToString(parser.toRPN(parser.tokenize('3--+3*-5*45')))).toEqual('3 3 `+ `- 5 `- * 45 * -');
        expect(tokensToString(parser.toRPN(parser.tokenize('-(+-4)')))).toEqual('( 4 `- `+ ) `-');
        expect(tokensToString(parser.toRPN(parser.tokenize('2+-4^-5')))).toEqual('2 4 5 `- ^ `- +');
        expect(tokensToString(parser.toRPN(parser.tokenize('-cos(x)*-+--x')))).toEqual('cos ( x ) `- x `- `- `+ `- *');
        expect(tokensToString(parser.toRPN(parser.tokenize('-+-8(5-+6)', true).filter(implicitOperators)))).toEqual('8 ( 5 6 `+ - ) `- `+ `-');
        expect(tokensToString(parser.toRPN(parser.tokenize('5--+--3')))).toEqual('5 3 `- `- `+ `- -');
    });

    it('should throw for incorrect operator order', () => {
        expect(() => tokensToString(parser.toRPN(parser.tokenize('3-*8')))).toThrow();
        expect(() => tokensToString(parser.toRPN(parser.tokenize('-3^*8*2')))).toThrow();
    });
    parser.set('ALLOW_IMPLICIT_MULTIPLICATION', implicit_multiplication);
});

describe('The Parser.parse method', () => {

    it('should parse prefix operators', () => {
        expect(parser.parse('-+-8+(5-+6)').text()).toEqual('7');
        expect(parser.parse('2^-2*3').text()).toEqual('3/4');
        expect(parser.parse('(a+x)--(x+a)').text()).toEqual('2*a+2*x');
        expect(parser.parse('(3)---(3)').text()).toEqual('0');
        expect(parser.parse('-(1)--(1-1--1)').text()).toEqual('0');
        expect(parser.parse('-(-(1))-(--1)').text()).toEqual('0');
    });

    it('should support the factorial operator', () => {
        expect(parser.parse('2+5!').text()).toEqual('122');
        expect(parser.evaluate('-4!+1').text()).toEqual('-23');
        expect(parser.evaluate('(3!)!').text()).toEqual('720');
    });

    it('should handle zero correctly', () => {
        expect(parser.parse('a+0').text()).toEqual('a');
        expect(parser.parse('a-0').text()).toEqual('a');
        expect(parser.parse('0+a').text()).toEqual('a');
        expect(parser.parse('0-a').text()).toEqual('-a');
        expect(parser.parse('0+0').text()).toEqual('0');
        expect(parser.parse('a*0').text()).toEqual('0');
        expect(parser.parse('a*0').text()).toEqual('0');
        expect(parser.parse('0*0').text()).toEqual('0');
        expect(parser.parse('0/a').text()).toEqual('0');
        expect(parser.parse('a^0').text()).toEqual('1');
        expect(parser.parse('10^0').text()).toEqual('1');
        expect(parser.parse('-10^0').text()).toEqual('-1');
    });

    it('should perform basic operations with variables', () => {
        expect(parser.parse('x-y').text()).toEqual('x-y');
        expect(parser.parse('x+1').text()).toEqual('1+x');
        expect(parser.parse('x+y').text()).toEqual('x+y');
        expect(parser.parse('(x+1)+(1+x)').text()).toEqual('2+2*x');
        expect(parser.parse('8*(x+1)-3*(1+x)').text()).toEqual('5+5*x');
        expect(parser.parse('4*(x+1)-4*(1+x)').text()).toEqual('0');
        expect(parser.parse('0-x-2*x+6').text()).toEqual('6-3*x');
        expect(parser.parse('(x+y)+(a+x)').text()).toEqual('2*x+y+a');
        expect(parser.parse('x^y+x^y').text()).toEqual('2*x^y');
        expect(parser.parse('9+(x+1)-(1+x)').text()).toEqual('9');
        expect(parser.parse('7*(x+y)+2*(a+x)').text()).toEqual('9*x+7*y+2*a');
        expect(parser.parse('-x*x').text()).toEqual('-x^2');
        expect(parser.parse('-x*-x').text()).toEqual('x^2');
        expect(parser.parse('x-x').text()).toEqual('0');
        expect(parser.parse('-x+x').text()).toEqual('0');
        expect(parser.parse('x*2').text()).toEqual('2*x');
        expect(parser.parse('x*y').text()).toEqual('x*y');
        expect(parser.parse('x^x').text()).toEqual('x^x');
        expect(parser.parse('x^(x)').text()).toEqual('x^x');
        expect(parser.parse('x*y*z-7*a*b').text()).toEqual('x*y*z-7*a*b');
        expect(parser.parse('7*x*y*z-7*x*y*z').text()).toEqual('0');
        expect(parser.parse('7*x*y*z-6*x*y*z').text()).toEqual('x*y*z');
        expect(parser.parse('(x-1)^2-(x-1)^2').text()).toEqual('0');
        expect(parser.parse('(-5(x/2-5)/4)^0').text()).toEqual('1');
        expect(parser.parse('y^y^3').text()).toEqual('y^y^3');
    });

    it('should simplify correctly', () => {
        expect(parser.parse('((1+x)^(-2))+((1+x)^(-1))+((1+x)^(-1))+(1)').text()).toEqual('1+(1+x)^-2+2*(1+x)^-1');
        expect(parser.parse('(x^(1/2)*x^(1/3))-x^(5/6)').text()).toEqual('0');
        expect(parser.parse('(x-1)^2+(x-1)^2').text()).toEqual('2*(-1+x)^2');
        expect(parser.parse('9*(x+1+y)+(x+1)').text()).toEqual('10+10*x+9*y');
        expect(parser.parse('x+x').text()).toEqual('2*x');
        expect(parser.parse('2*x*x').text()).toEqual('2*x^2');
        expect(parser.parse('(x+x^2)+x').text()).toEqual('2*x+x^2');
        expect(parser.parse('(x+1)+4').text()).toEqual('5+x');
        expect(parser.parse('x+x+1+x').text()).toEqual('1+3*x');
        expect(parser.parse('(x+1)+(8+y)').text()).toEqual('9+x+y');
        expect(parser.parse('(x+1)+(a+y)').text()).toEqual('1+x+a+y');
        expect(parser.parse('(x+x^2)+(x^3+x)').text()).toEqual('2*x+x^2+x^3');
        expect(parser.parse('3*(x+x^2)+5*(x^3+x)').text()).toEqual('8*x+3*x^2+5*x^3');
        expect(parser.parse('2*(1+x)*3*(z+x)^x*8').text()).toEqual('48*(z+x)^x*(1+x)');
        expect(parser.parse('(x+x^2)*(x+x^2)').text()).toEqual('(x+x^2)^2');
        expect(parser.parse('(x+x^2)*2*(x+x^2)').text()).toEqual('2*(x+x^2)^2');
        expect(parser.parse('(x*y)*(x*y)').text()).toEqual('(x*y)^2');
        expect(parser.parse('(x*y)*(x*z)').text()).toEqual('x^2*y*z');
        expect(parser.parse('(x+y)*(x+y)').text()).toEqual('(x+y)^2');
        expect(parser.parse('(x+y)*(y+x)').text()).toEqual('(x+y)^2');
        expect(parser.parse('(1+x)*(x+y)').text()).toEqual('(1+x)*(x+y)');
        expect(parser.parse('x*y*x').text()).toEqual('x^2*y');
        expect(parser.parse('x*y*x/x').text()).toEqual('x*y');
        expect(parser.parse('(x+1)^x*(z+1)^z*(x+1)').text()).toEqual('(1+x)^x*(1+z)^z*(1+x)');
        expect(parser.parse('3*(x^2+1)^x*(2*(x^2+1))').text()).toEqual('6*(1+x^2)^(1+x)');
        expect(parser.parse('2*(x+x^2)+1').text()).toEqual('1+2*x+2*x^2');
        expect(parser.parse('2*(x+x^2)+3*(x^2+x^3)').text()).toEqual('2*x+5*x^2+3*x^3');
        expect(parser.parse('(x+1)/(x+1)').text()).toEqual('1');
    });

    it('should pass existing parser tests', () => {
        expect(parser.parse('2*(x+x^2)+3*(x^2+x^3)^2').text()).toEqual('2*x+3*(x^2+x^3)^2+2*x^2');
        expect(parser.parse('2*(x+x^2)+3*(x^2+x^3)^2+x').text()).toEqual('3*x+3*(x^2+x^3)^2+2*x^2');
        expect(parser.parse('2*(x+x^2)+3*(x^2+x^3)^2+(x^2+x)').text()).toEqual('3*x+3*(x^2+x^3)^2+3*x^2');
        expect(parser.parse('2*(x+x^2)^2+3*(x^2+x)^2').text()).toEqual('5*(x+x^2)^2');
        expect(parser.parse('2*(x+x^2)^2+2*(x+x^2)^3+4*(x+x^2)^2').text()).toEqual('6*(x+x^2)^2+2*(x+x^2)^3');
        expect(parser.parse('2*x^2+3*x+y+y^2').text()).toEqual('y+y^2+3*x+2*x^2');
        expect(parser.parse('(y+y^2)^6+y').text()).toEqual('y+(y+y^2)^6');
        expect(parser.parse('2*(x+x^2)+(y+y^2)^6+y').text()).toEqual('2*x+2*x^2+y+(y+y^2)^6');
        expect(parser.parse('2*(x+x^2)+4').text()).toEqual('4+2*x+2*x^2');
        expect(parser.parse('2*(x+x^2)+(48+x+2*y)').text()).toEqual('48+3*x+2*x^2+2*y');
        expect(parser.parse('(x^2+1)-1').text()).toEqual('x^2');
        expect(parser.parse('(x^2+1)-1+x+x^3+x').text()).toEqual('2*x+x^2+x^3');
        expect(parser.parse('5+(x^2+y+1)+(x+y+15)').text()).toEqual('x+x^2+2*y+21');
        expect(parser.parse('(x^2+y+1)+(x+y+15)+(x^2+y+1)').text()).toEqual('x+2*x^2+3*y+17');
        expect(parser.parse('(x^2+y+1)+(x+x^2)').text()).toEqual('x+2*x^2+y+1');
        expect(parser.parse('(1+(1+x)^2)').text()).toEqual('1+(1+x)^2');
        expect(parser.parse('(x+x)^x').text()).toEqual('2^x*x^x');
        expect(parser.parse('x^2+x-x^y+x').text()).toEqual('2*x+x^2-x^y');
        expect(parser.parse('x^x+x^x-1-2*x^x').text()).toEqual('-1');
        expect(parser.parse('x^x+x^x-1-2*x^x+2*y+1-2*y').text()).toEqual('0');
        expect(parser.parse('(x+1)-x*y-5+2*x*y').text()).toEqual('-4+x+x*y');
        expect(parser.parse('(2*x-y+7-x+y-x-5)*2+15/3').text()).toEqual('9');
        expect(parser.parse('(x+x^2)^x*x').text()).toEqual('x*(x+x^2)^x');
        expect(parser.parse('(x+x^2)^x*(x+x^x)').text()).toEqual('(x+x^2)^x*(x+x^x)');
        expect(parser.parse('(x+x^2)^2*x').text()).toEqual('x*((x+x^2)^2)');
        expect(parser.parse('(z+z^2)^x*(x+y^2+1)').text()).toEqual('(z+z^2)^x*(x+y^2+1)');
        expect(parser.parse('2*(x+x^2)+48*x*y').text()).toEqual('2*x+2*x^2+48*x*y');
        expect(parser.parse('1/4*2^x*x^x').text()).toEqual('(1/4)*2^x*x^x');
        expect(parser.parse('x*y*z/(x*y*z)').text()).toEqual('1');
        expect(parser.parse('x^y/x^y').text()).toEqual('1');
        expect(parser.parse('4*x^2').text()).toEqual('4*x^2');
        expect(parser.parse('5*x^y/x^y').text()).toEqual('5');
        expect(parser.parse('(x+x^6)^y/(x+x^6)^y').text()).toEqual('1');
        expect(parser.parse('2^y*2^y').text()).toEqual('2^(2*y)');
        expect(parser.parse('2^x').text()).toEqual('2^x');
        expect(parser.parse('((x^3+x)^x*(x^2+x)^x+1)*x').text()).toEqual('x*(1+(x+x^3)^x*(x+x^2)^x)');
        expect(parser.parse('2*x^4*(1+log(x)^2)-(-x^4)').text()).toEqual('x^4+2*x^4*(1+log(x)^2)');
        expect(parser.parse('2*x*(4^(1/3))^3').text()).toEqual('8*x');
        expect(parser.parse('6*(4^(1/3)*4^(2/3))').text()).toEqual('24');
        expect(parser.parse('(8*x)^(2/3)').text()).toEqual('4*x^(2/3)');
        expect(parser.parse('(y^3+2)/(z^4*(y^3/2))^2*cos(x)*sqrt(x)').text()).toEqual('4*(z^8*y^6)^-1*(2+y^3)*cos(x)*x^(1/2)');
        expect(parser.parse('(x^6)^(1/4)').text()).toEqual('abs(x)^(3/2)');
        expect(parser.parse('(x+y)--(x+y)').text()).toEqual('2*x+2*y');
        expect(parser.parse('-z-(r+x)--(r+x)').text()).toEqual('-z');
        expect(parser.parse('+-z-(r+x)+--+(r+x)').text()).toEqual('-z');
        expect(parser.parse('(x)^(3-x)').text()).toEqual('x^(3-x)');
        expect(parser.parse('(1/2*x)^(1/2)').text()).toEqual('2^(-1/2)*x^(1/2)');
        expect(parser.parse('256^(1/8)').text()).toEqual('2');
        expect(parser.parse('-2*256^(1/8)').text()).toEqual('-4');
        expect(parser.parse('(81*(x*y)^2+9*x*y)+(9*x*y)').text()).toEqual('81*x^2*y^2+18*x*y');
        expect(parser.parse('((x)^(1/2)*x^(1/3))-x^(5/6)').text()).toEqual('0');
        expect(parser.parse('(9*y*x+1)^3').text()).toEqual('(1+9*y*x)^3');
        expect(parser.parse('(81*(x*y)^2+9*x*y)*(9*x*y)').text()).toEqual('9*x*y*(81*x^2*y^2+9*x*y)');
        expect(parser.parse('2*((81*(x*y)^2+9*x*y))*(5*(9*x*y))').text()).toEqual('90*x*y*(81*x^2*y^2+9*x*y)');
        expect(parser.parse('x*y*x/x/x/y').text()).toEqual('1');
        expect(parser.parse('(5*(4^(1/3)))^3').text()).toEqual('500');
        expect(parser.parse('2*x*(5*(4^(1/3)))^3').text()).toEqual('1000*x');
        expect(parser.parse('y^y^y').text()).toEqual('y^y^y');
        expect(parser.parse('(x^4)^(1/4)').text()).toEqual('abs(x)');
        expect(parser.parse('(-2*x)^2').text()).toEqual('4*x^2');
        expect(parser.parse('-4*x^3--x^3+x^2-(-2*x)^2+y').text()).toEqual('y-3*x^2-3*x^3');
        expect(parser.parse('2*x/x').text()).toEqual('2');
        expect(parser.parse('(x^2*y)^2').text()).toEqual('x^4*y^2');
        expect(parser.parse('(x+1)^(z+1)*(1+x)^(1+z)').text()).toEqual('(1+x)^(2+2*z)');
        expect(parser.parse('(x+1)^(z+1)*(1+x)^4').text()).toEqual('(1+x)^(5+z)');
        expect(parser.parse('(-1)^x').text()).toEqual('(-1)^x');
        expect(parser.parse('(-25)^(1/5)').text()).toEqual('5^(2/5)*(-1)^(1/5)');
    });

    it('should pivot correctly with key conflicts', () => {
        expect(parser.parse('x^-1+(x^2+x^3)^-1+x^-1').text()).toEqual('2*x^-1+(x^2+x^3)^-1');
        expect(parser.parse('(x+x^2)^-1+(x^2+x^3)^-1+x^-1+(x+x^2)^-1').text()).toEqual('2*(x+x^2)^-1+(x^2+x^3)^-1+x^-1');
        expect(parser.parse('x^-1+(x^2+x^3)^-1-x^-1').text()).toEqual('(x^2+x^3)^-1');
    });

    it('should correctly perform simple simplifications', () => {
        expect(parser.parse('-9-x+y-11').text()).toEqual('-20-x+y');
        expect(parser.parse('2*x+y-10-x-x').text()).toEqual('y-10');
        expect(parser.parse('2*x^-1/-x^-1').text()).toEqual('-2');
    });

    it('should parse through brackets', () => {
        expect(parser.parse('(((1)))+((2))').text()).toEqual('3');
    });

    it('should perform implicit multiplication', () => {
        expect(parser.parse('x(9)').text()).toEqual('9*x');
        expect(parser.parse('(a+b)(c+d)').text()).toEqual('(a+b)*(c+d)');
        expect(parser.parse('2+4(9+1)').text()).toEqual('42');

    });

    it('should simplify powers', () => {
        expect(parser.parse('(3^x)^(1/x)+4').text()).toEqual('7');
        expect(parser.parse('(3^(2x))^x^-1').text()).toEqual('9');
        expect(parser.parse('10*x^0').text()).toEqual('10');
        expect(parser.parse('1^0').text()).toEqual('1');
        expect(parser.parse('x^1').text()).toEqual('x');
        expect(parser.parse('(5*b*x^6)^2').text()).toEqual('25*b^2*x^12');
        expect(parser.parse('((-x)^2)^(5/4)').text()).toEqual('abs(x)^(5/2)');
        expect(parser.parse('(-2)^(3/2)').text()).toEqual('-2*2^(1/2)*i');
        expect(parser.parse('656^(1/5)').text()).toEqual('2^(4/5)*41^(1/5)');
        expect(parser.parse('656^(1/5)').text()).toEqual('2^(4/5)*41^(1/5)');
        expect(parser.parse('((x^x)^y)^z').text()).toEqual('((x^x)^y)^z');
        expect(parser.parse('(x^(2*x))^(3/2)').text()).toEqual('(x^(2*x))^(3/2)');
        expect(parser.parse('64^(1/6)').text()).toEqual('2');
        expect(parser.parse('(9^(15/4))^(4/3)').text()).toEqual('59049');
    });

    it('should evaluate powers', () => {
        expect(parser.evaluate('405^(5/4)').text({ decimal: true })).toEqual('1816.8487691837829584');
        expect(parser.evaluate('(pi)^(-3/5)').text({ decimal: true })).toEqual('0.50316459714325931574');
        expect(parser.evaluate('-24.160787001838543^1.3^(-1)').text()).toEqual('-11.585948599615734039');
    });

    it('should accurately extract variables', () => {
        expect(parser.parse('a^x-6*y').variables().sort()).toEqual(['a', 'x', 'y']);
        expect(parser.parse('cos(x*y)').variables().sort()).toEqual(['x', 'y']);
        expect(parser.parse('4+5').variables().sort()).toEqual([]);
    });

    it('should be able to find variables', () => {
        expect(parser.parse('x').hasVariable('x')).toBe(true);
        expect(parser.parse('9').hasVariable('x')).toBe(false);
        expect(parser.parse('cos(x)').hasVariable('x')).toBe(true);
        expect(parser.parse('cos(x+a)').hasVariable('a')).toBe(true);
        expect(parser.parse('cos(9)-1').hasVariable('a')).toBe(false);
        expect(parser.parse('7^a*y-1').hasVariable('a')).toBe(true);
        expect(parser.parse('7^cos(a)').hasVariable('a')).toBe(true);
        expect(parser.parse('6*(4-x)^b').hasVariable('a')).toBe(false);
        expect(parser.parse('x*y*z-7*a*b').hasVariable('b')).toBe(true);
        expect(parser.parse('x*y*z-7*a*b').hasVariable('t')).toBe(false);
        expect(parser.parse('7*x*y*z-3*a*b').hasVariable('a')).toBe(true);
    });

    it('should be able to detect functions', () => {
        expect(parser.parse('cos(x)').hasFunction('cos')).toBe(true);
        expect(parser.parse('sin(cos(x))').hasFunction('cos')).toBe(false);
        expect(parser.parse('sin(cos(x))').hasFunction('cos', true)).toBe(true);
        expect(parser.parse('cos(x+a)^sin(x)').hasFunction('sin')).toBe(false);
        expect(parser.parse('cos(x+a)^sin(x)').hasFunction('sin', true)).toBe(true);
        expect(parser.parse('cos(x)*sin(x)').hasFunction('sin')).toBe(true);
        expect(parser.parse('7^a*y-1').hasFunction('sin')).toBe(false);
        expect(parser.parse('7^cos(a)').hasFunction('cos')).toBe(false);
        expect(parser.parse('(1+cos(x))^2').hasFunction('cos')).toBe(true);
        expect(parser.parse('cos(a)-cos(x)').hasFunction('cos')).toBe(true);
        expect(parser.parse('cos(x)-cos(x)').hasFunction('cos')).toBe(false);
    });

    it('should handle the minus sign correctly', () => {
        expect(parser.parse('0-4').text()).toEqual('-4');
        expect(parser.parse('-(4)').text()).toEqual('-4');
        expect(parser.parse('3*-(4)').text()).toEqual('-12');
        expect(parser.parse('-3*-(4)').text()).toEqual('12');
        expect(parser.parse('-(3*-(4))').text()).toEqual('12');
        expect(parser.parse('-(-3*-(4))').text()).toEqual('-12');
        expect(parser.parse('-(3)-3').text()).toEqual('-6');
        expect(parser.parse('3^-1^-1').text()).toEqual('1/3');
        expect(parser.parse('-1').text()).toEqual('-1');
        expect(parser.parse('--1').text()).toEqual('1');
        expect(parser.parse('8-1').text()).toEqual('7');
        expect(parser.parse('(-1)').text()).toEqual('-1');
        expect(parser.parse('-(1)-1').text()).toEqual('-2');
        expect(parser.parse('-(-1-1)').text()).toEqual('2');
        expect(parser.parse('-(-1-+1)^2').text()).toEqual('-4');
        expect(parser.parse('-(-1-1+1)').text()).toEqual('1');
        expect(parser.parse('-(1)--(1-1--1)').text()).toEqual('0');
        expect(parser.parse('-(-(1))-(--1)').text()).toEqual('0');
        expect(parser.parse('5^-3').text()).toEqual('1/125');
        expect(parser.parse('5^---3').text()).toEqual('1/125');
        expect(parser.parse('5^-(1--2)').text()).toEqual('1/125');
        expect(parser.parse('5^-(++1+--+2)').text()).toEqual('1/125');
        expect(parser.parse('(5^-(++1+--+2))^-2').text()).toEqual('15625');
        expect(parser.parse('(5^-3^2)').text()).toEqual('1/1953125');
        expect(parser.parse('(5^-3^-2)').text()).toEqual('5^(-1/9)');
        expect(parser.parse('-(5^-3^-2)^-3').text()).toEqual('-5^(1/3)');
        expect(parser.parse('-(--5*--7)').text()).toEqual('-35');
        expect(parser.parse('(-1)^(3/4)').text()).toEqual('(-1)^(3/4)');
        expect(parser.parse('(2/5)^(-1/5)').text()).toEqual('2^(-1/5)*5^(1/5)');
    });

    it('should multiply infinity correctly', () => {
        expect(parser.parse('8*Inf').text()).toEqual('Inf');
        expect(parser.parse('Inf*Inf').text()).toEqual('Inf');
        expect(parser.parse('-8*Inf').text()).toEqual('-Inf');
        expect(parser.parse('8*-Inf').text()).toEqual('-Inf');
        expect(parser.parse('-Inf*-Inf').text()).toEqual('Inf');
        expect(parser.parse('-Inf*Inf').text()).toEqual('-Inf');
        expect(parser.parse('-a-Inf').text()).toEqual('-Inf');
    });

    it('should handle a value raised to infinity correctly', () => {
        expect(parser.parse('10^Inf').text()).toEqual('Inf');
        expect(parser.parse('-10^Inf').text()).toEqual('-Inf');
        expect(parser.parse('10^-Inf').text()).toEqual('0');
        expect(parser.parse('0^Inf').text()).toEqual('0');
        expect(parser.parse('-a*-Inf').text()).toEqual('a*Inf');
        expect(parser.parse('-a*Inf').text()).toEqual('-a*Inf');
        expect(parser.parse('-2^Infinity').text()).toEqual('-Inf');
        expect(parser.parse('-2^-Infinity').text()).toEqual('0');
    });

    it('should throw for undefined', () => {
        expect(() => parser.parse('0/0')).toThrow();
        expect(() => parser.parse('-Infinity+Infinity')).toThrow();
        expect(() => parser.parse('Infinity-Infinity')).toThrow();
        expect(() => parser.parse('Infinity/Infinity')).toThrow();
        expect(() => parser.parse('Infinity^Infinity')).toThrow();
        expect(() => parser.parse('1^Infinity')).toThrow();
        expect(() => parser.parse('0^0')).toThrow();
        expect(() => parser.parse('Inf^0')).toThrow();
        expect(() => parser.parse('(-Inf)^0')).toThrow();
        expect(() => parser.parse('Inf*0')).toThrow();
        expect(() => parser.parse('0/Inf')).toThrow();
        expect(() => parser.parse('Inf/0')).toThrow();
        expect(() => parser.parse('(-1)^Inf')).toThrow();
        expect(() => parser.parse('(-1)^Inf')).toThrow();
    });

    it('should throw for malformed expression', function () {
        expect(() => { parser.parse('+'); }).toThrowError();
        expect(() => { parser.parse('(+)'); }).toThrowError();
        expect(() => { parser.parse('cos('); }).toThrowError();
        expect(() => { parser.parse('(x+1))'); }).toThrowError();
        expect(() => { parser.parse('/2'); }).toThrowError();
        expect(() => { parser.parse('()'); }).toThrowError();
        expect(() => { parser.parse('5+'); }).toThrowError();
    });

    it('should not cause infinite recursion', () => {
        expect(parser.parse('1/(1+x)+(1+x)').text()).toEqual('1+x+(1+x)^-1');
    });

    it('should handle multipliers correctly', () => {
        expect(parser.parse('1/(2*abs(x))').text()).toEqual('(1/2)*abs(x)^-1');
    });

    it('should correctly handle single letter variables', () => {
        parser.set({USE_SINGLE_LETTER_VARIABLES: true})
        expect(parser.parse('2ab+cos(xy)').text()).toEqual('cos(x*y)+2*a*b');
        expect(parser.parse('xy^x').text()).toEqual('x*y^x');
        parser.set({USE_SINGLE_LETTER_VARIABLES: false})
    })

});

describe('Vectors',()=>{
    it('should parse vectors correctly',()=>{
        expect(parser.parse('[a,b,c]').text()).toEqual('[a, b, c]');
        expect(parser.parse('[[9],b,c]').text()).toEqual('[[9], b, c]');
        expect(parser.parse('[9]').text()).toEqual('[9]');
    });
});
