import nerdamer from '../../src';
import { Expression } from '../../src/core/classes/expression/Expression';
import { Parser } from '../../src/core/classes/parser/Parser';

describe('Finite-precision numeric evaluation', () => {
	it('converts exact rationals to significant-digit decimal values', () => {
		const result = nerdamer.numeric('1/3', 5);

		expect(result.text()).toEqual('0.33333');
		expect(result.hasDecimal()).toBe(true);
		expect(result.text()).not.toContain('/');
	});

	it('uses significant digits rather than decimal places', () => {
		expect(nerdamer.numeric('123456789', 5).text()).toEqual('123460000.0');
	});

	it('uses and restores the active precision', () => {
		const previous = Parser.getPrecision();

		try {
			Parser.setPrecision(7);
			expect(nerdamer.numeric('1/3').text()).toEqual('0.3333333');
			expect(nerdamer.numeric('1/3', 4).text()).toEqual('0.3333');
			expect(Parser.getPrecision()).toBe(7);
		} finally {
			Parser.setPrecision(previous);
		}
	});

	it('leaves evaluated symbolic results symbolic', () => {
		expect(nerdamer.numeric('x+1/3', 5).text()).toEqual('1/3+x');
	});

	it('is available as a chainable numerical operation', () => {
		expect(nerdamer('1/3').numeric(6).text()).toEqual('0.333333');
	});

	it('requires a positive integer precision', () => {
		expect(() => nerdamer.numeric('1/3', 0)).toThrow();
		expect(() => nerdamer.numeric('1/3', '2.5')).toThrow();
	});

	it('forces finite-precision numerical evaluation from Nerdamer notation', () => {
		expect(Parser.parse('numeric(1/3,5)').text()).toEqual('0.33333');
		expect(Parser.parse('numeric([1/3,2/3],5)').text()).toEqual('[0.33333, 0.66667]');
		expect(Parser.parse('numeric(x+1/3,5)').text()).toEqual('1/3+x');
	});

	it('never leaves numeric as a symbolic parser function', () => {
		const previous = Parser.get('DEFER_SIMPLIFICATION');

		try {
			Parser.set('DEFER_SIMPLIFICATION', true);
			const result = Parser.parse('numeric(1/3,5)');

			expect(Expression.isExpression(result)).toBe(true);
			if (Expression.isExpression(result)) {
				expect(result.text()).toEqual('0.33333');
				expect(result.isFunction('numeric')).toBe(false);
			}
		} finally {
			Parser.set('DEFER_SIMPLIFICATION', previous);
		}
	});
});
