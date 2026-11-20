import Decimal from 'decimal.js';

import { FunctionSolver } from '../../src/solve/classes/FunctionSolver';
import nerdamer from '../../src/index';

/** Relative error of a computed root against a reference value. */
function relativeError(actual: string, expected: string): Decimal {
	const exact = new Decimal(expected);
	return new Decimal(actual).minus(exact).abs().div(exact.abs());
}

/** Roots found by the numeric solver. */
function roots(source: string, lowerBound = -10, upperBound = 10): string[] {
	return new FunctionSolver(source, 'x', { lowerBound, upperBound })
		.roots()
		.map(root => root.text({ decimal: true }));
}

describe('Brent convergence', () => {
	it('locates roots of functions with a small scale', () => {
		const [root] = roots('1e-20*(x-1/3)');
		expect(relativeError(root, String(new Decimal(1).div(3))).lt('1e-19')).toBe(true);
		const [tiny] = roots('x-1e-30', -1, 1);
		expect(relativeError(tiny, '1e-30').lt('1e-19')).toBe(true);
	});

	it('does not stop at a scan point whose residual is merely small', () => {
		// At 20 digits, sin(x+1e-16)-sin(x) is only resolvable to about 1e-4 near pi/2.
		// The root must still be found inside that band, not at the scan point 1.5.
		const [root] = roots('sin(x+1e-16)-sin(x)', 1, 2);
		expect(new Decimal(root).minus(Decimal.acos(0)).abs().lt('1e-3')).toBe(true);
	});

	it('does not accept an endpoint with a small residual', () => {
		const result = new FunctionSolver('x-1e-16', 'x').Brent(new Decimal(0), new Decimal(1));
		expect(result.converged).toBe(true);
		expect(result.root.eq('1e-16')).toBe(true);
	});

	it('keeps full precision for ordinary roots', () => {
		// Reference values from mpmath at 40 digits.
		const cases: [string, string][] = [
			['cos(x)-x', '0.7390851332151606416553120876738734040134'],
			['e^x-5', '1.609437912434100374600759333226187639526'],
		];
		for (const [source, expected] of cases) {
			const [root] = roots(source);
			expect(relativeError(root, expected).lt('1e-19')).toBe(true);
		}
		const quarter = roots('tan(x)-1').find(
			root => new Decimal(root).gt(0) && new Decimal(root).lt(1)
		);
		expect(relativeError(quarter ?? '0', Decimal.acos(-1).div(4).toString()).lt('1e-19')).toBe(
			true
		);
	});

	it('still rejects poles', () => {
		expect(roots('1/x')).toEqual([]);
		expect(roots('tan(x)-1')).toHaveLength(6);
		expect(nerdamer('solve(1/(x-2)-30,x)').text()).toEqual('{61/30}');
	});
});
