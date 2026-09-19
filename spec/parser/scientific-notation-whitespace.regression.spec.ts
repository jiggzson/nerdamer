import { Expression } from '../../src/core/classes/expression/Expression';
import { Parser } from '../../src/core/classes/parser/Parser';

describe('Scientific notation after whitespace normalization', () => {
	it.each([
		['\n\t\t1e-8', '0.00000001'],
		['\n\t\t1.25e+3', '1250'],
		['\n\t\t4e2', '400'],
	])('parses %j as one numeric token', (source, expected) => {
		const result = Parser.parse(source);

		expect(Expression.isExpression(result)).toBe(true);
		if (Expression.isExpression(result)) {
			expect(result.eq(Expression.create(expected))).toBe(true);
		}
	});

	it('preserves scientific notation in a root semicolon sequence', () => {
		const result = Parser.parse(`
			0;
			1e-8
		`);

		expect(Expression.isExpression(result)).toBe(true);
		if (Expression.isExpression(result)) {
			expect(result.eq(Expression.create('0.00000001'))).toBe(true);
		}
	});

	it('compares a multiline scientific literal by its numeric value', () => {
		const result = Parser.parse(`
			0;
			0 > 1e-8
		`);

		expect(result.text()).toBe('0');
	});
});
