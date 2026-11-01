import Decimal from 'decimal.js';

import { Complex } from '../../src/core/classes/complex/Complex';
import { Expression } from '../../src/core/classes/expression/Expression';
import { Parser } from '../../src/core/classes/parser/Parser';
import '../../src/index';

describe('legacy #181 numerical complex precision consistency', () => {
	// Numeric Complex and symbolic Expression share Decimal precision, but use
	// separate evaluation paths. NIST DLMF §4.2 defines the principal branches.
	// https://dlmf.nist.gov/4.2
	const cases = [
		{
			name: 'addition',
			input: '(3+4*i)+(1-2*i)',
			numeric: () => new Complex(3, 4).add(new Complex(1, -2)),
		},
		{
			name: 'multiplication',
			input: '(3+4*i)*(1-2*i)',
			numeric: () => new Complex(3, 4).times(new Complex(1, -2)),
		},
		{
			name: 'division',
			input: '(3+4*i)/(1-2*i)',
			numeric: () => new Complex(3, 4).div(new Complex(1, -2)),
		},
		{
			name: 'small nonzero divisor',
			input: '(1+i)/(1/1000000000000000000000000000000)',
			numeric: () => new Complex(1, 1).div(new Complex(new Decimal('1e-30'), 0)),
		},
		{
			name: 'exponential',
			input: 'e^(1+2*i)',
			numeric: () => new Complex(1, 2).exp(),
		},
		{
			name: 'logarithm in quadrant two',
			input: 'log(-3+4*i)',
			numeric: () => new Complex(-3, 4).log(),
		},
		{
			name: 'logarithm in quadrant three',
			input: 'log(-3-4*i)',
			numeric: () => new Complex(-3, -4).log(),
		},
		{
			name: 'complex power',
			input: '(2+3*i)^(1+i)',
			numeric: () => new Complex(2, 3).pow(new Complex(1, 1)),
		},
		{
			name: 'fractional power',
			input: '(1+i)^(3/2)',
			numeric: () => new Complex(1, 1).pow(new Complex(1.5, 0)),
		},
	] as const;

	it.each([20, 50])('matches symbolic components at %i-digit precision', precision => {
		const originalPrecision = Parser.getPrecision();
		try {
			Parser.setPrecision(precision);
			const tolerance = new Decimal(10).pow(-(precision - 3));

			for (const item of cases) {
				const evaluated = Expression.create(item.input).evaluate();
				const numeric = item.numeric();
				const actualReal = evaluated.realPart().evaluate().getMultiplier().toDecimal();
				const actualImaginary = evaluated.imagPart().evaluate().getMultiplier().toDecimal();

				expect(actualReal.minus(numeric.re).abs().lte(tolerance)).toBe(true);
				expect(actualImaginary.minus(numeric.im).abs().lte(tolerance)).toBe(true);
			}
		} finally {
			Parser.setPrecision(originalPrecision);
		}
	});
});
