import { Expression } from '../../src/core/classes/expression/Expression';
import { Parser } from '../../src/core/classes/parser/Parser';

describe('Inverse cotangent', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/455
	it('uses the established real principal branch', () => {
		const positive = Number(Parser.evaluate('acot(2)').text());
		const zero = Number(Parser.evaluate('acot(0)').text());
		const negative = Number(Parser.evaluate('acot(-2)').text());

		expect(positive).toBeCloseTo(Math.atan(0.5), 12);
		expect(zero).toBeCloseTo(Math.PI / 2, 12);
		expect(negative).toBeCloseTo(Math.PI + Math.atan(-0.5), 12);
	});

	it('preserves the same branch in compiled JavaScript functions', () => {
		const expression = Parser.parse('acot(x)') as Expression;
		const acot = expression.buildFunction(['x']);

		expect(acot(2)).toBeCloseTo(Math.atan(0.5), 12);
		expect(acot(0)).toBeCloseTo(Math.PI / 2, 12);
		expect(acot(-2)).toBeCloseTo(Math.PI + Math.atan(-0.5), 12);
	});
});
