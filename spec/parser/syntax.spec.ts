import nerdamer from '../../src/index';
import { Equation } from '../../src/core/classes/equation/Equation';
import { Expression } from '../../src/core/classes/expression/Expression';
import { Parser } from '../../src/core/classes/parser/Parser';
import { Vector } from '../../src/core/classes/vector/Vector';

describe('Parser syntax', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/35
	it('handles parenthesized repeated prefix minus operators', () => {
		expect(Expression.create('(a+x)--(x+a)').minus('2*a+2*x').isZero()).toBe(true);
		expect(nerdamer('(3)---(3)').text()).toEqual('0');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/76
	it('handles the accepted nested prefix-minus forms', () => {
		expect(nerdamer('-(1)--(1-1--1)').text()).toEqual('0');
		expect(nerdamer('-(-(1))-(--1)').text()).toEqual('0');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/104
	it('treats whitespace as implicit multiplication consistently', () => {
		expect(Expression.create('x y').evaluate({ x: 2 }).eq(Expression.create('2*y'))).toBe(true);
		expect(Expression.create('x^2 y').evaluate({ x: 2 }).eq(Expression.create('4*y'))).toBe(true);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/130
	it('collapses repeated factorial postfix operators in pairs', () => {
		expect(nerdamer('x!!!!').text()).toEqual('dfact(dfact(x))');
		expect(nerdamer('x!!!!!!').text()).toEqual('dfact(dfact(dfact(x)))');
		expect(nerdamer('x!!!!!!!!').text()).toEqual('dfact(dfact(dfact(dfact(x))))');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/191
	it('rejects trailing infix operators', () => {
		for (const input of ['1+', '1-', '1*', '1/', '1^']) {
			expect(() => nerdamer(input)).toThrow();
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/192
	it('identifies the unmatched bracket direction', () => {
		expect(() => nerdamer('(')).toThrow('Missing closing bracket for "("');
		expect(() => nerdamer('[')).toThrow('Missing closing bracket for "["');
		expect(() => nerdamer(')')).toThrow('Missing opening bracket for ")"');
		expect(() => nerdamer(']')).toThrow('Missing opening bracket for "]"');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/263
	it('preserves whitespace inside parser delimiters', () => {
		expect(nerdamer('(  x )').text()).toEqual('x');
		expect(nerdamer('[ x ]').text()).toEqual('[x]');
		expect(nerdamer('factor( x+y )').eq(nerdamer('x+y'))).toBe(true);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/321
	it('preserves every factor in adjacent implicit products', () => {
		const expression = nerdamer('(x-1)x(x+1)');
		expect(expression.evaluate({ x: 2 }).text()).toEqual('6');
		expect(expression.evaluate({ x: 3 }).text()).toEqual('24');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/504
	it('keeps multiplication and modulo at the accepted left-associative precedence', () => {
		expect(nerdamer('3*3%9').text()).toEqual('0');
		expect(nerdamer('10%4*8').text()).toEqual('16');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/583
	it('rejects standalone plus operators as malformed expressions', () => {
		expect(() => nerdamer('+')).toThrow();
		expect(() => nerdamer('(+)')).toThrow();
	});

	// Regression: https://github.com/together-science/nerdamer-prime/issues/146
	it('parses the reported rational expression without division-by-zero', () => {
		const expression = nerdamer('(6*l+72)/(8+l)');
		const extended = nerdamer('(6*l+72)/(8+l)+1');

		expect(Number(expression.evaluate({ l: 0 }).text({ decimal: true }))).toBeCloseTo(9, 12);
		expect(Number(extended.evaluate({ l: 0 }).text({ decimal: true }))).toBeCloseTo(10, 12);
	});

	it('ignores paired-hash comments before other parser normalization', () => {
		expect(nerdamer('2+## ; block(99); sin x ##3').text()).toEqual('5');
		expect(
			nerdamer(`
				2 + ##
					; block(99); sin x
				## 3
			`).text()
		).toEqual('5');
	});

	it('treats paired-hash comments as whitespace between adjacent tokens', () => {
		const expression = nerdamer('x## ignored ##y');

		expect(expression.evaluate({ x: 2, y: 3 }).text()).toEqual('6');
	});

	it('does not treat a lone hash as comment syntax', () => {
		expect(() => nerdamer('2+# not a comment')).toThrow();
	});

	it('rejects an unterminated paired-hash comment', () => {
		expect(() => nerdamer('2+## missing closer')).toThrow(
			'Missing closing comment delimiter "##".'
		);
	});
});

describe('Call-scoped parser values', () => {
	it('preserves structured values and copies them on insertion', () => {
		const vector = new Vector([1, 2]);
		const equation = new Equation(Expression.create('x+1'), Expression.create(2));
		const parsedVector = Parser.parse('v', { v: vector });
		const parsedEquation = Parser.parse('q', { q: equation });

		expect(Vector.isVector(parsedVector)).toBe(true);
		expect(Equation.isEquation(parsedEquation)).toBe(true);
		expect(parsedVector).not.toBe(vector);
		expect(parsedEquation).not.toBe(equation);
		expect(parsedVector.text()).toEqual(vector.text());
		expect(parsedEquation.text()).toEqual(equation.text());
	});

	it('routes operators across structured call-scoped values', () => {
		const vector = new Vector([1, 2]);
		const result = Parser.parse('v+1', { v: vector });

		expect(Vector.isVector(result)).toBe(true);
		expect(result.text()).toEqual('[2, 3]');
		expect(vector.text()).toEqual('[1, 2]');
	});
});
