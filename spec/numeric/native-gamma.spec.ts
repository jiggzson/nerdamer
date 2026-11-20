import { doubleFactorial, factorial, gamma } from '../../src/core/functions/numeric';
import nerdamer from '../../src/index';

/** Relative error of a native result against a reference value. */
function relativeError(actual: number, expected: number): number {
	return Math.abs(actual - expected) / Math.abs(expected);
}

describe('Native gamma', () => {
	// Reference values from mpmath at 30 digits.
	const cases: [number, number][] = [
		[-0.5, -3.5449077018110320546],
		[-2.5, -0.94530872048294188123],
		[-0.1, -10.686287021193193549],
		[-1e-8, -100000000.57721567479],
		[-4.25, -0.12617664186267892495],
		[-10.5, -2.6401218205477163162e-7],
		[-1.5, 2.3632718012073547031],
		[0.1, 9.5135076986687318363],
		[4.5, 11.631728396567448929],
	];

	it('returns NaN at zero and the negative integers', () => {
		const f = nerdamer('gamma(x)').buildFunction(['x']);
		for (const x of [0, -0, -1, -2, -3, -10, -170, -1e10]) {
			expect(gamma(x)).toBeNaN();
			expect(f(x)).toBeNaN();
		}
	});

	it('keeps the sign and value for negative non-integers', () => {
		const f = nerdamer('gamma(x)').buildFunction(['x']);
		for (const [x, expected] of cases) {
			expect(relativeError(gamma(x), expected)).toBeLessThan(1e-14);
			expect(relativeError(f(x), expected)).toBeLessThan(1e-14);
		}
	});

	it('fixes the factorial and double factorial that use it', () => {
		// fact(-1.5) = gamma(-0.5); dfact(-2.5) from mpmath's gamma-based extension
		expect(relativeError(factorial(-1.5), -3.5449077018110320546)).toBeLessThan(1e-14);
		expect(relativeError(doubleFactorial(-2.5), -1.840883575671182)).toBeLessThan(1e-14);
	});
});
