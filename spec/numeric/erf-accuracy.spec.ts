import Decimal from 'decimal.js';

import { Parser } from '../../src/core/classes/parser/Parser';
import { erf, erfc } from '../../src/core/functions/decimal';
import nerdamer from '../../src/index';

// Reference values from mpmath at 70 digits.
const reference20: [string, string][] = [
	['erf(2)', '0.99532226501895273416'],
	['erfc(2)', '0.0046777349810472658379'],
	['erf(3)', '0.99997790950300141456'],
	['erfc(3)', '0.000022090496998585441373'],
	['erf(-3)', '-0.99997790950300141456'],
	['erfc(-3)', '1.9999779095030014146'],
	['erfc(6.6)', '1.0213251678575745537e-20'],
	['erfc(7)', '4.1838256077794143986e-23'],
	['erfc(27)', '5.237048923789255685e-319'],
];

const reference50: [string, string][] = [
	['2', '0.0046777349810472658379307436327470713891082029599399'],
	['7', '4.1838256077794143986140102238999322500296174138125e-23'],
	['27', '5.2370489237892556850160676828495470909339125479687e-319'],
];

/** Relative error of a computed value against a reference string. */
function relativeError(actual: string, expected: string): Decimal {
	const exact = new Decimal(expected);
	return new Decimal(actual).minus(exact).abs().div(exact.abs());
}

describe('erf and erfc accuracy', () => {
	it('matches reference values to the working precision', () => {
		nerdamer('x');
		for (const [source, expected] of reference20) {
			const actual = Parser.parse(source).text();
			expect(relativeError(actual, expected).lt('1e-19')).toBe(true);
		}
	});

	it('keeps tiny erfc values instead of rounding them to zero', () => {
		for (const source of ['erfc(6.6)', 'erfc(7)', 'erfc(27)', 'erfc(100)']) {
			const value = new Decimal(Parser.parse(source).text());
			expect(value.gt(0)).toBe(true);
			expect(value.lt('1e-19')).toBe(true);
		}
	});

	it('honors a higher Decimal precision and restores it', () => {
		const previous = Decimal.precision;
		Decimal.set({ precision: 50 });
		try {
			for (const [x, expected] of reference50) {
				expect(relativeError(erfc(x).toString(), expected).lt('1e-49')).toBe(true);
				const complement = new Decimal(1).minus(expected);
				expect(relativeError(erf(x).toString(), complement.toString()).lt('1e-49')).toBe(true);
			}
		} finally {
			Decimal.set({ precision: previous });
		}
		expect(Decimal.precision).toBe(previous);
	});

	it('handles zero and odd symmetry', () => {
		expect(erf('0').isZero()).toBe(true);
		expect(erfc('0').eq(1)).toBe(true);
		expect(erf('-2').eq(erf('2').neg())).toBe(true);
		expect(erfc('-2').eq(new Decimal(2).minus(erfc('2')))).toBe(true);
	});
});
