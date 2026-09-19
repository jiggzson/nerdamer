import { Parser } from '../../src/core/classes/parser/Parser';
import { Token } from '../../src/core/classes/parser/Token';
import { ALLOWED_CHARACTERS } from '../../src/core/classes/parser/Token';
import { remove } from '../../src/utils/array';

import type { Scope } from '../../src/core/common/classes/Scope';

const implicitOperators = (x: Scope | Token) => {
	return !(x instanceof Token) || x.position !== -1;
};
const tokensToString = (x: Scope) => {
	return x.text();
};

describe('Tokenizer and RPN conversion', () => {
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
		expect(
			tokensToString(Parser.tokenize('([1,2,3])()').filter(implicitOperators) as Scope)
		).toEqual(
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
