import Decimal from 'decimal.js';

import { FunctionSolver } from '../../src/solve/classes/FunctionSolver';
import nerdamer from '../../src/index';

/** Relative error of a computed root against a reference value. */
function relativeError(actual: string, expected: string): Decimal {
	const exact = new Decimal(expected);
	return new Decimal(actual).minus(exact).abs().div(exact.abs());
}

/** Roots found by the numeric solver over its default interval. */
function roots(source: string): string[] {
	return new FunctionSolver(source, 'x').roots().map(root => root.text({ decimal: true }));
}

describe('FunctionSolver near poles', () => {
	it('finds every real root of gamma(x) = 2 in [-10, 10]', () => {
		// Reference values from mpmath at 30 digits. Each interval between negative
		// poles where gamma is positive and dips below 2 has two roots.
		const expected = [
			'-9.99999986221335923168',
			'-9.00000137786168623817',
			'-7.99998759887714590459',
			'-7.00009918651895304688',
			'-5.99930465010563612945',
			'-5.00413746779222042152',
			'-3.97846454178524075696',
			'-3.07637846557092768272',
			'0.442877396484727437452',
			'3',
		];
		const found = nerdamer('solve(gamma(x)-2,x)')
			.text()
			.slice(1, -1)
			.split(',')
			.map(root => root.trim());
		expect(found).toHaveLength(expected.length);
		found.forEach((root, k) => {
			expect(relativeError(root, expected[k]).lt('1e-17')).toBe(true);
		});
	});

	it('keeps roots next to a pole that falls on the scan grid', () => {
		expect(roots('1/(x+3)+20')).toEqual(['-3.05']);
		const [root] = roots('1/(x-2)-30');
		expect(relativeError(root, String(new Decimal(61).div(30))).lt('1e-17')).toBe(true);
	});

	it('does not report poles as roots', () => {
		expect(roots('1/x')).toEqual([]);
		expect(roots('gamma(x)')).toEqual([]);
		expect(roots('tan(x)-1')).toHaveLength(6);
	});

	it('still finds roots of functions undefined on part of the interval', () => {
		expect(relativeError(roots('log(x)-1')[0], '2.71828182845904523536').lt('1e-17')).toBe(
			true
		);
		expect(roots('sqrt(x)-2').map(Number)).toEqual([4]);
	});
});
