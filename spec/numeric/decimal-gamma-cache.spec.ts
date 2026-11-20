import Decimal from 'decimal.js';

import { compileDecimal } from '../../src/core/classes/parser/compileDecimal';
import { gamma } from '../../src/core/functions/decimal';
import nerdamer from '../../src/index';

/** Relative error of a computed value against a reference string. */
function relativeError(actual: Decimal, expected: string): Decimal {
	const exact = new Decimal(expected);
	return actual.minus(exact).abs().div(exact.abs());
}

// The Spouge coefficients are cached per precision.
describe('Decimal gamma with cached coefficients', () => {
	// Reference values from mpmath at 60 digits.
	const cases: [string, string][] = [
		['2.35', '1.20305444673280609302569434246587919482147628592173842'],
		['-3.7', '0.2516439959024226435101081346813130602125491899396636227'],
	];

	it('stays accurate when the precision changes between calls', () => {
		const previous = Decimal.precision;
		try {
			for (const precision of [20, 50, 20, 35]) {
				nerdamer.set('PRECISION', precision);
				for (const [x, expected] of cases) {
					expect(relativeError(gamma(x), expected).lt(`1e-${precision - 2}`)).toBe(true);
				}
			}
		} finally {
			nerdamer.set('PRECISION', previous);
		}
	});
});

describe('compileDecimal squares', () => {
	it('gives the same value as pow', () => {
		const square = compileDecimal('x^2', 'x');
		const cube = compileDecimal('x^3', 'x');
		for (const value of ['1.2345678901234567891', '-3.3333333333333333333', '7e-12']) {
			const x = new Decimal(value);
			expect(square?.(x).eq(x.pow(2))).toBe(true);
			expect(cube?.(x).eq(x.pow(3))).toBe(true);
		}
	});
});
