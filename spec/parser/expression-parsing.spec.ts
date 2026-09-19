import nerdamer from '../../src/index';
import { operators } from '../../src/core/common/common';
import { Expression } from '../../src/core/classes/expression/Expression';
import { inert } from '../../src/core/classes/parser/helpers';
import { _ } from '../../src/core/classes/parser/operations/functions';
import { Parser } from '../../src/core/classes/parser/Parser';
import { refreshOperatorSymbols } from '../../src/core/classes/parser/Token';

import type { ParserEntity } from '../../src/core/types';

describe('Numeric parsing regressions', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/469
	it('parses normalized and non-normalized scientific notation correctly', () => {
		expect(nerdamer('1.234e+1').text()).toEqual('12.34');
		expect(nerdamer('12.3e-1').text()).toEqual('1.23');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/472
	it('parses scientific notation inside larger expressions without range errors', () => {
		const result = nerdamer('x^3+23.80952380952381*x^2+1.4705882352941178e+5*x');

		expect(Number(result.evaluate({ x: 1 }).text())).toBeCloseTo(147083.63305322130381, 10);
	});
});

describe('Expression parsing', () => {
	it('applies built-in operator associativity', () => {
		expect(Parser.parse('8/4/2').text()).toEqual('1');
		expect(Parser.parse('2^3^2').text()).toEqual('512');
	});

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


	it('should parse through brackets', () => {
		expect(Parser.parse('(((1)))+((2))').text()).toEqual('3');
	});


	it('should perform implicit multiplication', () => {
		expect(Parser.parse('x(9)').text()).toEqual('9*x');
		expect(Parser.parse('(a+b)(c+d)').text()).toEqual('(a+b)*(c+d)');
		expect(Parser.parse('2+4(9+1)').text()).toEqual('42');
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


	it('should correctly handle single letter variables', () => {
		Parser.set({ USE_SINGLE_LETTER_VARIABLES: true });
		expect(Parser.parse('2ab+cos(xy)').text()).toEqual('cos(x*y)+2*a*b');
		expect(Parser.parse('xy^x').text()).toEqual('x*y^x');
		Parser.set({ USE_SINGLE_LETTER_VARIABLES: false });
	});


	it('should recognized aliases', () => {
		expect(Parser.parse('π+pi').text()).toEqual('2*pi');
		expect(Parser.parse('∞+Inf').text()).toEqual('Inf');
	});
});


describe('Expression syntax boundaries', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/504
	it('evaluates modulo left-to-right with multiplication', () => {
		expect(nerdamer('3*3%9').text()).toEqual('0');
		expect(nerdamer('10%3').text()).toEqual('1');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/649
	it('parses an unparenthesized negative exponent before implicit multiplication', () => {
		expect(nerdamer('y^-2z').text()).toEqual('y^-2*z');
		expect(nerdamer('y^-2z').text()).toEqual(nerdamer('(y^-2)*z').text());
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/378
	it('parses equations with a negated parenthesized left side', () => {
		expect(() => nerdamer('-(a+1)=(a+3)^2')).not.toThrow();
		expect(nerdamer('-(a+1)=(a+3)^2').text()).toEqual('-(1+a)=(3+a)^2');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/388
	it('ignores leading and trailing expression whitespace', () => {
		expect(nerdamer(' x').text()).toEqual('x');
		expect(nerdamer('x ').text()).toEqual('x');
	});
});

describe('scoped blocks', () => {
	it('should respect the inert function', () => {
		Parser.parse('x: 5');
		expect(inert('3*x+5').text()).toEqual('5+3*x');
		expect(Parser.parse('5*x').text()).toEqual('25');
	});
});

describe('Structured literals', () => {
	it('should parse vectors correctly', () => {
		expect(Parser.parse('[a,b,c]').text()).toEqual('[a, b, c]');
		expect(Parser.parse('[[9],b,c]').text()).toEqual('[[9], b, c]');
		expect(Parser.parse('[9]').text()).toEqual('[9]');
	});
});

describe('Postfix operators', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/131
	it('distinguishes postfix percentage from infix modulo', () => {
		expect(Parser.parse('1%').text()).toEqual('1/100');
		expect(Parser.parse('5%+5%').text()).toEqual('1/10');
		expect(Parser.parse('5%-2').text()).toEqual('-39/20');
		expect(Parser.parse('4+2%').text()).toEqual('201/50');
		expect(Parser.parse('(4+2)%').text()).toEqual('3/50');

		expect(Parser.parse('4%5').text()).toEqual('4');
		expect(Parser.parse('4 % 5').text()).toEqual('4');
		expect(Parser.parse('4% 5').text()).toEqual('4');
		expect(Parser.parse('4 %5').text()).toEqual('4');
		expect(Parser.parse('4%(5)').text()).toEqual('4');
	});

	it('binds postfix percentage before binary arithmetic', () => {
		expect(Parser.parse('50%*2').text()).toEqual('1');
		expect(Parser.parse('50%2').text()).toEqual('0');
		expect(Parser.parse('10/50%').text()).toEqual('20');
		expect(Parser.parse('10%/2').text()).toEqual('1/20');
		expect(Parser.parse('50%^2').text()).toEqual('1/4');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/188
	it('preserves the operand after postfix factorial', () => {
		expect(Parser.parse('3!2').text()).toEqual('12');
		expect(Parser.parse('3!x', { x: 2 }).text()).toEqual('12');
	});
});

describe('Custom operators', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/154
	it('registers, reads, and aliases custom operators', () => {
		const plus = nerdamer.getOperator('+');
		expect(plus).toBeDefined();
		expect(plus!.operator).toEqual('+');
		expect(nerdamer.getOperator('*')!.leftAssoc).toBe(true);
		expect(nerdamer.getOperator('/')!.leftAssoc).toBe(true);
		expect(nerdamer.getOperator('^')!.leftAssoc).toBe(false);
		expect(nerdamer.getOperator('**')!.leftAssoc).toBe(false);
		expect(nerdamer.getOperator(':')!.operator).toEqual(':');
		expect(nerdamer.getOperator(':=')!.operator).toEqual(':=');
		expect(nerdamer.getOperator('in')!.operator).toEqual('in');
		const originalPlus = { ...plus! };

		try {
			// getOperator returns a detached object; changes take effect only when registered.
			plus!.precedence = 9;
			expect(nerdamer('1+2*3').text()).toEqual('7');
			nerdamer.setOperator(plus!);
			expect(nerdamer('1+2*3').text()).toEqual('9');

			nerdamer.setOperator(
				{
					precedence: 9,
					operator: '&',
					action: 'auditSubtract154',
					prefix: true,
					postfix: false,
					leftAssoc: true,
				},
				(a: ParserEntity, b?: ParserEntity) => {
					if (!Expression.isExpression(a) || !b || !Expression.isExpression(b)) {
						throw new Error('Scalar expressions expected');
					}
					return a.minus(b);
				}
			);
			expect(nerdamer('5&2').text()).toEqual('3');
			expect(nerdamer('10&3&2').text()).toEqual('5');

			nerdamer.setOperator({
				precedence: 9,
				operator: '&',
				action: 'auditSubtract154',
				prefix: true,
				postfix: false,
				leftAssoc: false,
			});
			expect(nerdamer('10&3&2').text()).toEqual('9');

			nerdamer.setOperator(
				{
					precedence: 7,
					operator: '~',
					action: 'auditDouble154',
					prefix: false,
					postfix: true,
					leftAssoc: false,
				},
				(a: ParserEntity) => {
					if (!Expression.isExpression(a)) {
						throw new Error('Scalar expression expected');
					}
					return a.times(2);
				}
			);
			expect(nerdamer('5~').text()).toEqual('10');

			nerdamer.aliasOperator('*', '×');
			nerdamer.aliasOperator('/', '÷');
			expect(nerdamer('6×4÷3').text()).toEqual('8');
		} finally {
			nerdamer.setOperator(originalPlus);
			delete operators['&'];
			delete operators['~'];
			delete operators['×'];
			delete operators['÷'];
			delete _['auditSubtract154'];
			delete _['auditDouble154'];
			refreshOperatorSymbols();
		}
	});
});

describe('Bracketless function calls', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/182
	it('supports the accepted bracketless function grammar', () => {
		expect(nerdamer('2 sin x + 4 sin x').eq(Expression.create('6*sin(x)'))).toBe(true);
		expect(nerdamer('sin x + sin x').eq(Expression.create('2*sin(x)'))).toBe(true);
		expect(nerdamer('3sin x /6+sin x').eq(Expression.create('3*sin(x)/2'))).toBe(true);
		expect(nerdamer('2 max 1,2,3 +1').text()).toEqual('7');

		expect(nerdamer('sin 2x').eq(Expression.create('sin(2*x)'))).toBe(true);
		expect(nerdamer('sin 2 x').eq(Expression.create('x*sin(2)'))).toBe(true);
		expect(nerdamer('sin x^2').eq(Expression.create('sin(x^2)'))).toBe(true);
		expect(nerdamer('sin sin x').eq(Expression.create('sin(sin(x))'))).toBe(true);
		expect(nerdamer('sin -x').eq(Expression.create('sin(-x)'))).toBe(true);
		expect(nerdamer('limit - x').text()).toEqual(nerdamer('limit-x').text());
	});
});
