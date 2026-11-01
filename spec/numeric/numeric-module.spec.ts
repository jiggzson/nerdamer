import * as numeric from '../../src/core/functions/numeric';

describe('numeric module boundaries', () => {
	test('keeps the numerical module independent from the Solver export', () => {
		expect('Solver' in numeric).toBe(false);
	});

	test('preserves exact special values used by buildFunction', () => {
		expect(numeric.erf(0)).toBe(0);
		expect(numeric.factorial(5)).toBe(120);
	});
});
