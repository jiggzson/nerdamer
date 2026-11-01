import Decimal from 'decimal.js';

import { Expression } from '../../src/core/classes/expression/Expression';
import { Parser } from '../../src/core/classes/parser/Parser';
import '../../src/index';

// Regression: https://github.com/jiggzson/nerdamer/issues/614
describe('legacy #614 real-function numerical precision', () => {
	const cases = [
		{ name: 'square root', input: 'sqrt(7)', expected: () => new Decimal(7).sqrt() },
		{ name: 'logarithm', input: 'log(7)', expected: () => new Decimal(7).ln() },
		{ name: 'exponential', input: 'exp(1/7)', expected: () => new Decimal(1).div(7).exp() },
		{ name: 'sine', input: 'sin(1/7)', expected: () => new Decimal(1).div(7).sin() },
		{ name: 'cosine', input: 'cos(1/7)', expected: () => new Decimal(1).div(7).cos() },
		{ name: 'hyperbolic sine', input: 'sinh(1/7)', expected: () => new Decimal(1).div(7).sinh() },
		{ name: 'inverse tangent', input: 'atan(1/7)', expected: () => new Decimal(1).div(7).atan() },
		{
			name: 'nth root',
			input: 'nthroot(7,3)',
			expected: () => new Decimal(7).pow(new Decimal(1).div(3)),
		},
	] as const;

	it.each(cases)('retains configured precision for $name', ({ input, expected }) => {
		const previousPrecision = Parser.getPrecision();
		try {
			for (const precision of [20, 40]) {
				Parser.setPrecision(precision);
				const result = Expression.create(input).evaluate();
				const reference = expected();
				const tolerance = new Decimal(10).pow(-(precision - 4));

				expect(result.isNUM()).toBe(true);
				expect(result.getMultiplier().toDecimal().minus(reference).abs().lte(tolerance)).toBe(true);
			}
		} finally {
			Parser.setPrecision(previousPrecision);
		}
	});
});
