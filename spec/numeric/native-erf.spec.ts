import { erf } from '../../src/core/functions/numeric';
import nerdamer from '../../src/index';

/** Relative error of a native result against a reference value. */
function relativeError(actual: number, expected: number): number {
	return Math.abs(actual - expected) / Math.abs(expected);
}

describe('Native erf near zero', () => {
	// Reference values from mpmath at 30 digits.
	const cases: [number, number][] = [
		[1e-300, 1.1283791670955125739e-300],
		[1e-17, 1.1283791670955125739e-17],
		[1e-10, 1.1283791670955125739e-10],
		[1e-6, 1.1283791670951364475e-6],
		[0.001, 0.0011283787909692363799],
		[0.1, 0.1124629160182848922],
		[0.3, 0.32862675945912742764],
		[0.4999, 0.5204119951613865806],
		[0.5, 0.52049987781304653768],
	];

	it('keeps full double precision', () => {
		for (const [x, expected] of cases) {
			expect(relativeError(erf(x), expected)).toBeLessThan(4e-16);
			expect(relativeError(erf(-x), -expected)).toBeLessThan(4e-16);
		}
	});

	it('keeps full double precision through buildFunction', () => {
		const f = nerdamer('erf(x)').buildFunction();
		for (const [x, expected] of cases) {
			expect(relativeError(f(x), expected)).toBeLessThan(4e-16);
		}
	});

	it('is exactly odd in the series range and exact at zero', () => {
		expect(erf(0)).toBe(0);
		for (const x of [1e-300, 1e-8, 0.25, 0.49, 0.4999]) {
			expect(erf(-x)).toBe(-erf(x));
		}
	});
});
