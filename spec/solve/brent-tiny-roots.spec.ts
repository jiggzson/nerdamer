import Decimal from 'decimal.js';

import { FunctionSolver } from '../../src/solve/classes/FunctionSolver';

import type { FunctionSolverOptions } from '../../src/solve/classes/FunctionSolver';

/** Relative error of a computed root against a reference value. */
function relativeError(actual: Decimal | string, expected: string): Decimal {
	const exact = new Decimal(expected);
	return new Decimal(actual).minus(exact).abs().div(exact.abs());
}

/** Roots found by the numeric solver on [-1, 1]. */
function roots(source: string, method?: FunctionSolverOptions['method']): string[] {
	return new FunctionSolver(source, 'x', { lowerBound: -1, upperBound: 1, stepSize: 0.1, method })
		.roots()
		.map(root => root.text({ decimal: true }));
}

describe('Brent near tiny roots', () => {
	it('bisects when a flat function keeps interpolating next to b', () => {
		// x^2-1e-40 is -1e-40 to 20 digits near zero, so interpolation lands next to b while
		// the root is at -1e-20.
		const solver = new FunctionSolver('(x-1e-20)*(x+1e-20)', 'x');
		const result = solver.Brent(new Decimal('-0.1'), new Decimal(0));
		expect(result.converged).toBe(true);
		expect(result.iterations).toBeLessThan(solver.maxIters);
		expect(relativeError(result.root, '-1e-20').lt('1e-18')).toBe(true);
	});

	it.each([
		['x^2-1e-30', '1e-15'],
		['(x-1e-20)*(x+1e-20)', '1e-20'],
	])('keeps both roots of %s', (source, root) => {
		const found = roots(source);
		expect(found).toHaveLength(2);
		expect(relativeError(found[0], `-${root}`).lt('1e-18')).toBe(true);
		expect(relativeError(found[1], root).lt('1e-18')).toBe(true);
	});

	it('still merges a root found from neighbouring cells', () => {
		expect(roots('x')).toHaveLength(1);
		expect(roots('x^2-1/4')).toHaveLength(2);
		expect(roots('x^2-1/4', 'NewtonRaphson')).toHaveLength(2);
	});
});
