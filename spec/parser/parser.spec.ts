import { inert } from '../../src/core/classes/parser/helpers';
import { Parser } from '../../src/core/classes/parser/Parser';
import { Token } from '../../src/core/classes/parser/Token';
import { ALLOWED_CHARACTERS } from '../../src/core/classes/parser/Token';
import { remove } from '../../src/utils/array';

import type { Expression } from '../../src/core/classes/expression/Expression';
import type { Scope } from '../../src/core/common/classes/Scope';

const implicitOperators = x => {
	return x.position !== -1;
};
const tokensToString = x => {
	return x.text();
};

describe('The Tokenizer', () => {
	const implicit_multiplication = Parser.get('ALLOW_IMPLICIT_MULTIPLICATION');
	Parser.set('ALLOW_IMPLICIT_MULTIPLICATION', false);
	it('should tokenize simple expressions', () => {
		expect(tokensToString(Parser.tokenize('1*2+3'))).toEqual('1 * 2 + 3');
	});

	it('should tokenize multi-word variables', () => {
		expect(tokensToString(Parser.tokenize('word*word'))).toEqual('word * word');
		expect(tokensToString(Parser.tokenize('word*1'))).toEqual('word * 1');
	});
	it('should tokenize and differentiate scientific numbers', () => {
		expect(tokensToString(Parser.tokenize('4E1+1'))).toEqual('40 + 1');
		expect(tokensToString(Parser.tokenize('4.e1'))).toEqual('40');
		expect(tokensToString(Parser.tokenize('4E-1+1'))).toEqual('0.4 + 1');
		expect(tokensToString(Parser.tokenize('4e-1+1'))).toEqual('0.4 + 1');
		expect(tokensToString(Parser.tokenize('e-1+1'))).toEqual('e - 1 + 1');
		expect(tokensToString(Parser.tokenize('4e*1+1'))).toEqual('4 * e * 1 + 1');
		expect(tokensToString(Parser.tokenize('4.321e+4+1'))).toEqual('43210 + 1');
	});
	it('should tokenize with implicit multiplication', () => {
		expect(tokensToString(Parser.tokenize('4e*1+1'))).toEqual('4 * e * 1 + 1');
		expect(tokensToString(Parser.tokenize('(a+b)(c+d)'))).toEqual('( a + b ) * ( c + d )');
	});
	it('should tokenize word variables with underscores', () => {
		expect(tokensToString(Parser.tokenize('word_2*1'))).toEqual('word_2 * 1');
		expect(tokensToString(Parser.tokenize('1_*1'))).toEqual('1 * _ * 1');
		expect(tokensToString(Parser.tokenize('_x*1'))).toEqual('_x * 1');
	});

	it('should tokenize Greek characters', () => {
		expect(tokensToString(Parser.tokenize('Π+4'))).toEqual('Π + 4');
	});
	it('should tokenize square brackets', () => {
		expect(tokensToString(Parser.tokenize('[1,2,3]'))).toEqual('[ 1 , 2 , 3 ]');
	});
	it('should tokenize parenthesis', () => {
		expect(tokensToString(Parser.tokenize('(1,2,3)'))).toEqual('( 1 , 2 , 3 )');
	});
	it('should tokenize adjacent brackets', () => {
		expect(tokensToString(Parser.tokenize('([1,2,3])'))).toEqual('( [ 1 , 2 , 3 ] )');
		expect(tokensToString(Parser.tokenize('([1,2,3])()').filter(implicitOperators))).toEqual(
			'( [ 1 , 2 , 3 ] ) ( )'
		);
	});
	it('should recognize custom characters', () => {
		ALLOWED_CHARACTERS.push('☺');
		expect(Parser.tokenize('1+☺-x')[2].type).toEqual(Token.VARIABLE);
		remove(ALLOWED_CHARACTERS, '☺');
	});
	it('should tokenize single letter variables', () => {
		Parser.set({ USE_SINGLE_LETTER_VARIABLES: true });
		expect(tokensToString(Parser.tokenize('xyz+abc'))).toEqual('x * y * z + a * b * c');
		expect(tokensToString(Parser.tokenize('xyz+abc'))).toEqual('x * y * z + a * b * c');
		expect(tokensToString(Parser.tokenize('xyz+abc'))).toEqual('x * y * z + a * b * c');
		Parser.set({ USE_SINGLE_LETTER_VARIABLES: false });
	});

	it('should throw for missing brackets', () => {
		expect(() => tokensToString(Parser.tokenize('xyz+(abc'))).toThrow();
		expect(() => tokensToString(Parser.tokenize('xyz)+abc'))).toThrow();
		expect(() => tokensToString(Parser.tokenize('([xyz)+abc'))).toThrow();
	});

	// operators and compound operators
	it('should recognize operators and compound operators', () => {
		expect((Parser.tokenize('(x-1)^2-y')[1] as Token).value).toEqual('^');
		expect((Parser.tokenize('-2==5x')[2] as Token).value).toEqual('==');
		expect((Parser.tokenize('-2!!*5x')[2] as Token).value).toEqual('!!');
		expect((Parser.tokenize('-2!!**5x')[3] as Token).value).toEqual('**');
		expect((Parser.tokenize('cos(x-1)<=3x')[2] as Token).value).toEqual('<=');
		expect((Parser.tokenize('x in [a, x, y]')[1] as Token).value).toEqual('in');

		// Make sure they are correctly parsed as tokens
		expect(Parser.tokenize('(x-1)^2-y')[1].type).toEqual(Token.OPERATOR);
		expect(Parser.tokenize('-2==5x')[2].type).toEqual(Token.OPERATOR);
		expect(Parser.tokenize('-2!!*5x')[2].type).toEqual(Token.OPERATOR);
		expect(Parser.tokenize('-2!!**5x')[3].type).toEqual(Token.OPERATOR);
		expect(Parser.tokenize('cos(x-1)<=3x')[2].type).toEqual(Token.OPERATOR);
		expect(Parser.tokenize('x in [a, x, y]')[1].type).toEqual(Token.OPERATOR);
	});

	it('should correctly generate the RPN', () => {
		expect(tokensToString(Parser.toRPN(Parser.tokenize('x+3*y')))).toEqual('x 3 y * +');
		expect(tokensToString(Parser.toRPN(Parser.tokenize('3+(x-3)^2+1')))).toEqual(
			'3 ( x 3 - ) 2 ^ + 1 +'
		);
		expect(
			tokensToString(
				Parser.toRPN(Parser.tokenize('f(9)*6').filter(implicitOperators) as Scope)
			)
		).toEqual('f ( 9 ) 6 *');
	});
	it('should respect equal precedence operators when generating RPN', () => {
		expect(tokensToString(Parser.toRPN(Parser.tokenize('2-(5*3)+1')))).toEqual(
			'2 ( 5 3 * ) - 1 +'
		);
	});
	it('should respect the factorial operator precedence', () => {
		expect(tokensToString(Parser.toRPN(Parser.tokenize('2-(5*3)!^2')))).toEqual(
			'2 ( 5 3 * ) ! 2 ^ -'
		);
	});
	it('should respect the comma operator precedence', () => {
		expect(
			tokensToString(
				Parser.toRPN(Parser.tokenize('3*f(1+5,2,3)^2').filter(implicitOperators) as Scope)
			)
		).toEqual('3 f ( 1 5 + 2 , 3 , ) 2 ^ *');
	});
	it('should respect the dot operator precedence', () => {
		expect(tokensToString(Parser.toRPN(Parser.tokenize('5*x.x^2+8')))).toEqual(
			'5 x x . 2 ^ * 8 +'
		);
	});

	it('should correctly mark prefix operators', () => {
		expect(tokensToString(Parser.toRPN(Parser.tokenize('--+3*-5*45')))).toEqual(
			'3 `+ `- `- 5 `- * 45 *'
		);
		expect(tokensToString(Parser.toRPN(Parser.tokenize('3--+3*-5*45')))).toEqual(
			'3 3 `+ `- 5 `- * 45 * -'
		);
		expect(tokensToString(Parser.toRPN(Parser.tokenize('-(+-4)')))).toEqual('( 4 `- `+ ) `-');
		expect(tokensToString(Parser.toRPN(Parser.tokenize('2+-4^-5')))).toEqual('2 4 5 `- ^ `- +');
		expect(tokensToString(Parser.toRPN(Parser.tokenize('-cos(x)*-+--x')))).toEqual(
			'cos ( x ) `- x `- `- `+ `- *'
		);
		expect(
			tokensToString(
				Parser.toRPN(Parser.tokenize('-+-8(5-+6)').filter(implicitOperators) as Scope)
			)
		).toEqual('8 ( 5 6 `+ - ) `- `+ `-');
		expect(tokensToString(Parser.toRPN(Parser.tokenize('5--+--3')))).toEqual(
			'5 3 `- `- `+ `- -'
		);
	});

	it('should throw for incorrect operator order', () => {
		expect(() => tokensToString(Parser.toRPN(Parser.tokenize('3-*8')))).toThrow();
		expect(() => tokensToString(Parser.toRPN(Parser.tokenize('-3^*8*2')))).toThrow();
	});
	Parser.set('ALLOW_IMPLICIT_MULTIPLICATION', implicit_multiplication);
});

describe('The Parser.parse method', () => {
	it('should parse prefix operators', () => {
		expect(Parser.parse('-+-8+(5-+6)').text()).toEqual('7');
		expect(Parser.parse('2^-2*3').text()).toEqual('3/4');
		expect(Parser.parse('(a+x)--(x+a)').text()).toEqual('2*a+2*x');
		expect(Parser.parse('(3)---(3)').text()).toEqual('0');
		expect(Parser.parse('-(1)--(1-1--1)').text()).toEqual('0');
		expect(Parser.parse('-(-(1))-(--1)').text()).toEqual('0');
	});

	it('should support the factorial operator', () => {
		expect(Parser.parse('2+5!').text()).toEqual('122');
		expect(Parser.evaluate('-4!+1').text()).toEqual('-23');
		expect(Parser.evaluate('(3!)!').text()).toEqual('720');
	});

	it('should handle zero correctly', () => {
		expect(Parser.parse('a+0').text()).toEqual('a');
		expect(Parser.parse('a-0').text()).toEqual('a');
		expect(Parser.parse('0+a').text()).toEqual('a');
		expect(Parser.parse('0-a').text()).toEqual('-a');
		expect(Parser.parse('0+0').text()).toEqual('0');
		expect(Parser.parse('a*0').text()).toEqual('0');
		expect(Parser.parse('a*0').text()).toEqual('0');
		expect(Parser.parse('0*0').text()).toEqual('0');
		expect(Parser.parse('0/a').text()).toEqual('0');
		expect(Parser.parse('a^0').text()).toEqual('1');
		expect(Parser.parse('10^0').text()).toEqual('1');
		expect(Parser.parse('-10^0').text()).toEqual('-1');
	});

	it('should perform basic operations with variables', () => {
		expect(Parser.parse('x-y').text()).toEqual('x-y');
		expect(Parser.parse('x+1').text()).toEqual('1+x');
		expect(Parser.parse('x+y').text()).toEqual('x+y');
		expect(Parser.parse('(x+1)+(1+x)').text()).toEqual('2+2*x');
		expect(Parser.parse('8*(x+1)-3*(1+x)').text()).toEqual('5+5*x');
		expect(Parser.parse('4*(x+1)-4*(1+x)').text()).toEqual('0');
		expect(Parser.parse('0-x-2*x+6').text()).toEqual('6-3*x');
		expect(Parser.parse('(x+y)+(a+x)').text()).toEqual('2*x+y+a');
		expect(Parser.parse('x^y+x^y').text()).toEqual('2*x^y');
		expect(Parser.parse('9+(x+1)-(1+x)').text()).toEqual('9');
		expect(Parser.parse('7*(x+y)+2*(a+x)').text()).toEqual('9*x+7*y+2*a');
		expect(Parser.parse('-x*x').text()).toEqual('-x^2');
		expect(Parser.parse('-x*-x').text()).toEqual('x^2');
		expect(Parser.parse('x-x').text()).toEqual('0');
		expect(Parser.parse('-x+x').text()).toEqual('0');
		expect(Parser.parse('x*2').text()).toEqual('2*x');
		expect(Parser.parse('x*y').text()).toEqual('x*y');
		expect(Parser.parse('x^x').text()).toEqual('x^x');
		expect(Parser.parse('x^(x)').text()).toEqual('x^x');
		expect(Parser.parse('x*y*z-7*a*b').text()).toEqual('x*y*z-7*a*b');
		expect(Parser.parse('7*x*y*z-7*x*y*z').text()).toEqual('0');
		expect(Parser.parse('7*x*y*z-6*x*y*z').text()).toEqual('x*y*z');
		expect(Parser.parse('(x-1)^2-(x-1)^2').text()).toEqual('0');
		expect(Parser.parse('(-5(x/2-5)/4)^0').text()).toEqual('1');
		expect(Parser.parse('y^y^3').text()).toEqual('y^y^3');
	});

	it('should simplify correctly', () => {
		expect(Parser.parse('((1+x)^(-2))+((1+x)^(-1))+((1+x)^(-1))+(1)').text()).toEqual(
			'1+(1+x)^-2+2*(1+x)^-1'
		);
		expect(Parser.parse('(x^(1/2)*x^(1/3))-x^(5/6)').text()).toEqual('0');
		expect(Parser.parse('(x-1)^2+(x-1)^2').text()).toEqual('2*(-1+x)^2');
		expect(Parser.parse('9*(x+1+y)+(x+1)').text()).toEqual('10+10*x+9*y');
		expect(Parser.parse('x+x').text()).toEqual('2*x');
		expect(Parser.parse('2*x*x').text()).toEqual('2*x^2');
		expect(Parser.parse('(x+x^2)+x').text()).toEqual('2*x+x^2');
		expect(Parser.parse('(x+1)+4').text()).toEqual('5+x');
		expect(Parser.parse('x+x+1+x').text()).toEqual('1+3*x');
		expect(Parser.parse('(x+1)+(8+y)').text()).toEqual('9+x+y');
		expect(Parser.parse('(x+1)+(a+y)').text()).toEqual('1+x+a+y');
		expect(Parser.parse('(x+x^2)+(x^3+x)').text()).toEqual('2*x+x^2+x^3');
		expect(Parser.parse('3*(x+x^2)+5*(x^3+x)').text()).toEqual('8*x+3*x^2+5*x^3');
		expect(Parser.parse('2*(1+x)*3*(z+x)^x*8').text()).toEqual('48*(z+x)^x*(1+x)');
		expect(Parser.parse('(x+x^2)*(x+x^2)').text()).toEqual('(x+x^2)^2');
		expect(Parser.parse('(x+x^2)*2*(x+x^2)').text()).toEqual('2*(x+x^2)^2');
		expect(Parser.parse('(x*y)*(x*y)').text()).toEqual('(x*y)^2');
		expect(Parser.parse('(x*y)*(x*z)').text()).toEqual('x^2*y*z');
		expect(Parser.parse('(x+y)*(x+y)').text()).toEqual('(x+y)^2');
		expect(Parser.parse('(x+y)*(y+x)').text()).toEqual('(x+y)^2');
		expect(Parser.parse('(1+x)*(x+y)').text()).toEqual('(1+x)*(x+y)');
		expect(Parser.parse('x*y*x').text()).toEqual('x^2*y');
		expect(Parser.parse('x*y*x/x').text()).toEqual('x*y');
		expect(Parser.parse('3*(x^2+1)^x*(2*(x^2+1))').text()).toEqual('6*(1+x^2)^(1+x)');
		expect(Parser.parse('2*(x+x^2)+1').text()).toEqual('1+2*x+2*x^2');
		expect(Parser.parse('2*(x+x^2)+3*(x^2+x^3)').text()).toEqual('2*x+5*x^2+3*x^3');
		expect(Parser.parse('(x+1)/(x+1)').text()).toEqual('1');
	});

	it('should properly collapse expressions', () => {
		expect(Parser.parse('(x+1)^x*(z+1)^z*(x+1)').text()).toEqual('(1+z)^z*(1+x)^(1+x)');
		expect(Parser.parse('(17/2)*K^2*((32-5*K)^-1)*(32-5*K)').text()).toEqual('(17/2)*K^2');
	});

	it('should pass existing parser tests', () => {
		expect(Parser.parse('2*(x+x^2)+3*(x^2+x^3)^2').text()).toEqual('2*x+3*(x^2+x^3)^2+2*x^2');
		expect(Parser.parse('2*(x+x^2)+3*(x^2+x^3)^2+x').text()).toEqual('3*x+3*(x^2+x^3)^2+2*x^2');
		expect(Parser.parse('2*(x+x^2)+3*(x^2+x^3)^2+(x^2+x)').text()).toEqual(
			'3*x+3*(x^2+x^3)^2+3*x^2'
		);
		expect(Parser.parse('2*(x+x^2)^2+3*(x^2+x)^2').text()).toEqual('5*(x+x^2)^2');
		expect(Parser.parse('2*(x+x^2)^2+2*(x+x^2)^3+4*(x+x^2)^2').text()).toEqual(
			'6*(x+x^2)^2+2*(x+x^2)^3'
		);
		expect(Parser.parse('2*x^2+3*x+y+y^2').text()).toEqual('y+y^2+3*x+2*x^2');
		expect(Parser.parse('(y+y^2)^6+y').text()).toEqual('y+(y+y^2)^6');
		expect(Parser.parse('x*cos(n)*y^-1*((3+n)^-1)*cos(n)^-1').text()).toEqual(
			'((3+n)^-1)*x*y^-1'
		);
		expect(Parser.parse('2*(x+x^2)+(y+y^2)^6+y').text()).toEqual('2*x+2*x^2+y+(y+y^2)^6');
		expect(Parser.parse('2*(x+x^2)+4').text()).toEqual('4+2*x+2*x^2');
		expect(Parser.parse('2*(x+x^2)+(48+x+2*y)').text()).toEqual('48+3*x+2*x^2+2*y');
		expect(Parser.parse('(x^2+1)-1').text()).toEqual('x^2');
		expect(Parser.parse('(x^2+1)-1+x+x^3+x').text()).toEqual('2*x+x^2+x^3');
		expect(Parser.parse('5+(x^2+y+1)+(x+y+15)').text()).toEqual('x+x^2+2*y+21');
		expect(Parser.parse('(x^2+y+1)+(x+y+15)+(x^2+y+1)').text()).toEqual('x+2*x^2+3*y+17');
		expect(Parser.parse('(x^2+y+1)+(x+x^2)').text()).toEqual('x+2*x^2+y+1');
		expect(Parser.parse('(1+(1+x)^2)').text()).toEqual('1+(1+x)^2');
		expect(Parser.parse('(x+x)^x').text()).toEqual('2^x*x^x');
		expect(Parser.parse('x^2+x-x^y+x').text()).toEqual('2*x+x^2-x^y');
		expect(Parser.parse('x^x+x^x-1-2*x^x').text()).toEqual('-1');
		expect(Parser.parse('x^x+x^x-1-2*x^x+2*y+1-2*y').text()).toEqual('0');
		expect(Parser.parse('(x+1)-x*y-5+2*x*y').text()).toEqual('-4+x+x*y');
		expect(Parser.parse('(2*x-y+7-x+y-x-5)*2+15/3').text()).toEqual('9');
		expect(Parser.parse('(x+x^2)^x*x').text()).toEqual('x*(x+x^2)^x');
		expect(Parser.parse('(x+x^2)^x*(x+x^x)').text()).toEqual('(x+x^2)^x*(x+x^x)');
		expect(Parser.parse('(x+x^2)^2*x').text()).toEqual('x*((x+x^2)^2)');
		expect(Parser.parse('(z+z^2)^x*(x+y^2+1)').text()).toEqual('(z+z^2)^x*(x+y^2+1)');
		expect(Parser.parse('2*(x+x^2)+48*x*y').text()).toEqual('2*x+2*x^2+48*x*y');
		expect(Parser.parse('1/4*2^x*x^x').text()).toEqual('(1/4)*2^x*x^x');
		expect(Parser.parse('x*y*z/(x*y*z)').text()).toEqual('1');
		expect(Parser.parse('x^y/x^y').text()).toEqual('1');
		expect(Parser.parse('4*x^2').text()).toEqual('4*x^2');
		expect(Parser.parse('5*x^y/x^y').text()).toEqual('5');
		expect(Parser.parse('(x+x^6)^y/(x+x^6)^y').text()).toEqual('1');
		expect(Parser.parse('2^y*2^y').text()).toEqual('2^(2*y)');
		expect(Parser.parse('2^x').text()).toEqual('2^x');
		expect(Parser.parse('((x^3+x)^x*(x^2+x)^x+1)*x').text()).toEqual(
			'x*(1+(x+x^3)^x*(x+x^2)^x)'
		);
		expect(Parser.parse('2*x^4*(1+log(x)^2)-(-x^4)').text()).toEqual('x^4+2*x^4*(1+log(x)^2)');
		expect(Parser.parse('2*x*(4^(1/3))^3').text()).toEqual('8*x');
		expect(Parser.parse('6*(4^(1/3)*4^(2/3))').text()).toEqual('24');
		expect(Parser.parse('(8*x)^(2/3)').text()).toEqual('4*x^(2/3)');
		expect(Parser.parse('(y^3+2)/(z^4*(y^3/2))^2*cos(x)*sqrt(x)').text()).toEqual(
			'4*(2+y^3)*cos(x)*x^(1/2)*(z^8*y^6)^-1'
		);
		expect(Parser.parse('(x^6)^(1/4)').text()).toEqual('abs(x)^(3/2)');
		expect(Parser.parse('(x+y)--(x+y)').text()).toEqual('2*x+2*y');
		expect(Parser.parse('-z-(r+x)--(r+x)').text()).toEqual('-z');
		expect(Parser.parse('+-z-(r+x)+--+(r+x)').text()).toEqual('-z');
		expect(Parser.parse('(x)^(3-x)').text()).toEqual('x^(3-x)');
		expect(Parser.parse('(1/2*x)^(1/2)').text()).toEqual('(1/2)*2^(1/2)*x^(1/2)');
		expect(Parser.parse('256^(1/8)').text()).toEqual('2');
		expect(Parser.parse('-2*256^(1/8)').text()).toEqual('-4');
		expect(Parser.parse('(81*(x*y)^2+9*x*y)+(9*x*y)').text()).toEqual('81*x^2*y^2+18*x*y');
		expect(Parser.parse('((x)^(1/2)*x^(1/3))-x^(5/6)').text()).toEqual('0');
		expect(Parser.parse('(9*y*x+1)^3').text()).toEqual('(1+9*y*x)^3');
		expect(Parser.parse('(81*(x*y)^2+9*x*y)*(9*x*y)').text()).toEqual(
			'9*x*y*(81*x^2*y^2+9*x*y)'
		);
		expect(Parser.parse('2*((81*(x*y)^2+9*x*y))*(5*(9*x*y))').text()).toEqual(
			'90*x*y*(81*x^2*y^2+9*x*y)'
		);
		expect(Parser.parse('x*y*x/x/x/y').text()).toEqual('1');
		expect(Parser.parse('(5*(4^(1/3)))^3').text()).toEqual('500');
		expect(Parser.parse('2*x*(5*(4^(1/3)))^3').text()).toEqual('1000*x');
		expect(Parser.parse('y^y^y').text()).toEqual('y^y^y');
		expect(Parser.parse('(x^4)^(1/4)').text()).toEqual('abs(x)');
		expect(Parser.parse('(-2*x)^2').text()).toEqual('4*x^2');
		expect(Parser.parse('-4*x^3--x^3+x^2-(-2*x)^2+y').text()).toEqual('y-3*x^2-3*x^3');
		expect(Parser.parse('2*x/x').text()).toEqual('2');
		expect(Parser.parse('(x^2*y)^2').text()).toEqual('x^4*y^2');
		expect(Parser.parse('(x+1)^(z+1)*(1+x)^(1+z)').text()).toEqual('(1+x)^(2+2*z)');
		expect(Parser.parse('(x+1)^(z+1)*(1+x)^4').text()).toEqual('(1+x)^(5+z)');
		expect(Parser.parse('(-1)^x').text()).toEqual('(-1)^x');
		expect(Parser.parse('(-25)^(1/5)').text()).toEqual('5^(2/5)*(-1)^(1/5)');
	});

	it('should pivot correctly with key conflicts', () => {
		expect(Parser.parse('x^-1+(x^2+x^3)^-1+x^-1').text()).toEqual('2*x^-1+(x^2+x^3)^-1');
		expect(Parser.parse('(x+x^2)^-1+(x^2+x^3)^-1+x^-1+(x+x^2)^-1').text()).toEqual(
			'2*(x+x^2)^-1+(x^2+x^3)^-1+x^-1'
		);
		expect(Parser.parse('x^-1+(x^2+x^3)^-1-x^-1').text()).toEqual('(x^2+x^3)^-1');
	});

	it('should correctly perform simple simplifications', () => {
		expect(Parser.parse('-9-x+y-11').text()).toEqual('-20-x+y');
		expect(Parser.parse('2*x+y-10-x-x').text()).toEqual('y-10');
		expect(Parser.parse('2*x^-1/-x^-1').text()).toEqual('-2');
	});

	it('should parse through brackets', () => {
		expect(Parser.parse('(((1)))+((2))').text()).toEqual('3');
	});

	it('should perform implicit multiplication', () => {
		expect(Parser.parse('x(9)').text()).toEqual('9*x');
		expect(Parser.parse('(a+b)(c+d)').text()).toEqual('(a+b)*(c+d)');
		expect(Parser.parse('2+4(9+1)').text()).toEqual('42');
	});

	it('should simplify powers', () => {
		expect(Parser.parse('(3^x)^(1/x)+4').text()).toEqual('7');
		expect(Parser.parse('(3^(2x))^x^-1').text()).toEqual('9');
		expect(Parser.parse('10*x^0').text()).toEqual('10');
		expect(Parser.parse('1^0').text()).toEqual('1');
		expect(Parser.parse('x^1').text()).toEqual('x');
		expect(Parser.parse('(5*b*x^6)^2').text()).toEqual('25*b^2*x^12');
		expect(Parser.parse('((-x)^2)^(5/4)').text()).toEqual('abs(x)^(5/2)');
		expect(Parser.parse('(-2)^(3/2)').text()).toEqual('-2*2^(1/2)*i');
		expect(Parser.parse('656^(1/5)').text()).toEqual('2^(4/5)*41^(1/5)');
		expect(Parser.parse('656^(1/5)').text()).toEqual('2^(4/5)*41^(1/5)');
		expect(Parser.parse('((x^x)^y)^z').text()).toEqual('((x^x)^y)^z');
		expect(Parser.parse('(x^(2*x))^(3/2)').text()).toEqual('(x^(2*x))^(3/2)');
		expect(Parser.parse('64^(1/6)').text()).toEqual('2');
		expect(Parser.parse('(9^(15/4))^(4/3)').text()).toEqual('59049');
	});

	it('should evaluate powers', () => {
		expect(Parser.evaluate('405^(5/4)').text({ decimal: true })).toEqual(
			'1816.8487691837829584'
		);
		expect(Parser.evaluate('(pi)^(-3/5)').text({ decimal: true })).toEqual(
			'0.50316459714325931574'
		);
		expect(Parser.evaluate('-24.160787001838543^1.3^(-1)').text()).toEqual(
			'-11.585948599615734039'
		);
	});

	it('should accurately extract variables', () => {
		expect((Parser.parse('a^x-6*y') as Expression).variables().sort()).toEqual(['a', 'x', 'y']);
		expect((Parser.parse('cos(x*y)') as Expression).variables().sort()).toEqual(['x', 'y']);
		expect((Parser.parse('4+5') as Expression).variables().sort()).toEqual([]);
	});

	it('should be able to find variables', () => {
		expect((Parser.parse('x') as Expression).hasVariable('x')).toBe(true);
		expect((Parser.parse('9') as Expression).hasVariable('x')).toBe(false);
		expect((Parser.parse('cos(x)') as Expression).hasVariable('x')).toBe(true);
		expect((Parser.parse('cos(x+a)') as Expression).hasVariable('a')).toBe(true);
		expect((Parser.parse('cos(9)-1') as Expression).hasVariable('a')).toBe(false);
		expect((Parser.parse('7^a*y-1') as Expression).hasVariable('a')).toBe(true);
		expect((Parser.parse('7^cos(a)') as Expression).hasVariable('a')).toBe(true);
		expect((Parser.parse('6*(4-x)^b') as Expression).hasVariable('a')).toBe(false);
		expect((Parser.parse('x*y*z-7*a*b') as Expression).hasVariable('b')).toBe(true);
		expect((Parser.parse('x*y*z-7*a*b') as Expression).hasVariable('t')).toBe(false);
		expect((Parser.parse('7*x*y*z-3*a*b') as Expression).hasVariable('a')).toBe(true);
	});

	it('should be able to detect functions', () => {
		expect((Parser.parse('cos(x)') as Expression).hasFunction('cos')).toBe(true);
		expect((Parser.parse('sin(cos(x))') as Expression).hasFunction('cos')).toBe(false);
		expect((Parser.parse('sin(cos(x))') as Expression).hasFunction('cos', true)).toBe(true);
		expect((Parser.parse('cos(x+a)^sin(x)') as Expression).hasFunction('sin')).toBe(false);
		expect((Parser.parse('cos(x+a)^sin(x)') as Expression).hasFunction('sin', true)).toBe(true);
		expect((Parser.parse('cos(x)*sin(x)') as Expression).hasFunction('sin')).toBe(true);
		expect((Parser.parse('7^a*y-1') as Expression).hasFunction('sin')).toBe(false);
		expect((Parser.parse('7^cos(a)') as Expression).hasFunction('cos')).toBe(false);
		expect((Parser.parse('(1+cos(x))^2') as Expression).hasFunction('cos')).toBe(true);
		expect((Parser.parse('cos(a)-cos(x)') as Expression).hasFunction('cos')).toBe(true);
		expect((Parser.parse('cos(x)-cos(x)') as Expression).hasFunction('cos')).toBe(false);
	});

	it('should handle the minus sign correctly', () => {
		expect(Parser.parse('0-4').text()).toEqual('-4');
		expect(Parser.parse('-(4)').text()).toEqual('-4');
		expect(Parser.parse('3*-(4)').text()).toEqual('-12');
		expect(Parser.parse('-3*-(4)').text()).toEqual('12');
		expect(Parser.parse('-(3*-(4))').text()).toEqual('12');
		expect(Parser.parse('-(-3*-(4))').text()).toEqual('-12');
		expect(Parser.parse('-(3)-3').text()).toEqual('-6');
		expect(Parser.parse('3^-1^-1').text()).toEqual('1/3');
		expect(Parser.parse('-1').text()).toEqual('-1');
		expect(Parser.parse('--1').text()).toEqual('1');
		expect(Parser.parse('8-1').text()).toEqual('7');
		expect(Parser.parse('(-1)').text()).toEqual('-1');
		expect(Parser.parse('-(1)-1').text()).toEqual('-2');
		expect(Parser.parse('-(-1-1)').text()).toEqual('2');
		expect(Parser.parse('-(-1-+1)^2').text()).toEqual('-4');
		expect(Parser.parse('-(-1-1+1)').text()).toEqual('1');
		expect(Parser.parse('-(1)--(1-1--1)').text()).toEqual('0');
		expect(Parser.parse('-(-(1))-(--1)').text()).toEqual('0');
		expect(Parser.parse('5^-3').text()).toEqual('1/125');
		expect(Parser.parse('5^---3').text()).toEqual('1/125');
		expect(Parser.parse('5^-(1--2)').text()).toEqual('1/125');
		expect(Parser.parse('5^-(++1+--+2)').text()).toEqual('1/125');
		expect(Parser.parse('(5^-(++1+--+2))^-2').text()).toEqual('15625');
		expect(Parser.parse('(5^-3^2)').text()).toEqual('1/1953125');
		expect(Parser.parse('(5^-3^-2)').text()).toEqual('5^(-1/9)');
		expect(Parser.parse('-(5^-3^-2)^-3').text()).toEqual('-5^(1/3)');
		expect(Parser.parse('-(--5*--7)').text()).toEqual('-35');
		expect(Parser.parse('(-1)^(3/4)').text()).toEqual('(-1)^(3/4)');
		expect(Parser.parse('(2/5)^(-1/5)').text()).toEqual('2^(-1/5)*5^(1/5)');
	});

	it('should multiply infinity correctly', () => {
		expect(Parser.parse('8*Inf').text()).toEqual('Inf');
		expect(Parser.parse('Inf*Inf').text()).toEqual('Inf');
		expect(Parser.parse('-8*Inf').text()).toEqual('-Inf');
		expect(Parser.parse('8*-Inf').text()).toEqual('-Inf');
		expect(Parser.parse('-Inf*-Inf').text()).toEqual('Inf');
		expect(Parser.parse('-Inf*Inf').text()).toEqual('-Inf');
		expect(Parser.parse('-a-Inf').text()).toEqual('-Inf');
	});

	it('should handle a value raised to infinity correctly', () => {
		expect(Parser.parse('10^Inf').text()).toEqual('Inf');
		expect(Parser.parse('-10^Inf').text()).toEqual('-Inf');
		expect(Parser.parse('10^-Inf').text()).toEqual('0');
		expect(Parser.parse('0^Inf').text()).toEqual('0');
		expect(Parser.parse('-a*-Inf').text()).toEqual('a*Inf');
		expect(Parser.parse('-a*Inf').text()).toEqual('-a*Inf');
		expect(Parser.parse('-2^Infinity').text()).toEqual('-Inf');
		expect(Parser.parse('-2^-Infinity').text()).toEqual('0');
	});

	it('should throw for undefined', () => {
		expect(() => Parser.parse('0/0')).toThrow();
		expect(() => Parser.parse('-Infinity+Infinity')).toThrow();
		expect(() => Parser.parse('Infinity-Infinity')).toThrow();
		expect(() => Parser.parse('Infinity/Infinity')).toThrow();
		expect(() => Parser.parse('Infinity^Infinity')).toThrow();
		expect(() => Parser.parse('1^Infinity')).toThrow();
		expect(() => Parser.parse('0^0')).toThrow();
		expect(() => Parser.parse('Inf^0')).toThrow();
		expect(() => Parser.parse('(-Inf)^0')).toThrow();
		expect(() => Parser.parse('Inf*0')).toThrow();
		expect(() => Parser.parse('0/Inf')).toThrow();
		expect(() => Parser.parse('Inf/0')).toThrow();
		expect(() => Parser.parse('(-1)^Inf')).toThrow();
		expect(() => Parser.parse('(-1)^Inf')).toThrow();
	});

	it('should throw for malformed expression', function () {
		expect(() => {
			Parser.parse('+');
		}).toThrow();
		expect(() => {
			Parser.parse('(+)');
		}).toThrow();
		expect(() => {
			Parser.parse('cos(');
		}).toThrow();
		expect(() => {
			Parser.parse('(x+1))');
		}).toThrow();
		expect(() => {
			Parser.parse('/2');
		}).toThrow();
		expect(() => {
			Parser.parse('()');
		}).toThrow();
		expect(() => {
			Parser.parse('5+');
		}).toThrow();
	});

	it('should not cause infinite recursion', () => {
		expect(Parser.parse('1/(1+x)+(1+x)').text()).toEqual('1+x+(1+x)^-1');
	});

	it('should handle multipliers correctly', () => {
		expect(Parser.parse('1/(2*abs(x))').text()).toEqual('(1/2)*abs(x)^-1');
	});

	it('should correctly handle single letter variables', () => {
		Parser.set({ USE_SINGLE_LETTER_VARIABLES: true });
		expect(Parser.parse('2ab+cos(xy)').text()).toEqual('cos(x*y)+2*a*b');
		expect(Parser.parse('xy^x').text()).toEqual('x*y^x');
		Parser.set({ USE_SINGLE_LETTER_VARIABLES: false });
	});

	it('should not falsely subtract two values', () => {
		expect(Parser.parse('(x^(1/2))-((-x)^(1/2))').text()).toEqual('x^(1/2)-(-x)^(1/2)');
	});

	it('should recognized aliases', () => {
		expect(Parser.parse('π+pi').text()).toEqual('2*pi');
		expect(Parser.parse('∞+Inf').text()).toEqual('2*Inf');
	});
});

describe('scoped blocks', () => {
	it('should respect the inert function', () => {
		Parser.parse('x: 5');
		expect(inert('3*x+5').text()).toEqual('5+3*x');
		expect(Parser.parse('5*x').text()).toEqual('25');
	});
});

describe('Vectors', () => {
	it('should parse vectors correctly', () => {
		expect(Parser.parse('[a,b,c]').text()).toEqual('[a, b, c]');
		expect(Parser.parse('[[9],b,c]').text()).toEqual('[[9], b, c]');
		expect(Parser.parse('[9]').text()).toEqual('[9]');
	});
});
