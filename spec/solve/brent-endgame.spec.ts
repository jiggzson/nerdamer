import Decimal from 'decimal.js';

import { FunctionSolver } from '../../src/solve/classes/FunctionSolver';
import nerdamer from '../../src/index';

/** Runs Brent on [a, b] and returns the root with the number of evaluations it used. */
function brent(source: string, a: string, b: string) {
	nerdamer('x');
	const solver = new FunctionSolver(source, 'x');
	const spy = jest.spyOn(solver, 'evaluate');
	try {
		const result = solver.Brent(new Decimal(a), new Decimal(b));
		return { root: result.root, evaluations: spy.mock.calls.length };
	} finally {
		spy.mockRestore();
	}
}

describe('Brent endgame', () => {
	it('stops shortly after the root is found instead of bisecting', () => {
		// Reference value from mpmath at 40 digits. Brent reaches it at about the 8th
		// evaluation; bisecting from the far end took about 55 evaluations in all.
		const { root, evaluations } = brent('cos(x)-x', '0', '1');
		const exact = new Decimal('0.7390851332151606416553120876738734040134');
		expect(root.minus(exact).abs().div(exact).lt('1e-19')).toBe(true);
		expect(evaluations).toBeLessThanOrEqual(12);
	});

	it('closes a bracket around a tiny root quickly', () => {
		const { root, evaluations } = brent('x^2-1e-10', '0', '1');
		expect(root.minus('1e-5').abs().div('1e-5').lt('1e-19')).toBe(true);
		expect(evaluations).toBeLessThanOrEqual(35);
	});

	it('keeps the same roots in a full solve', () => {
		expect(nerdamer('solve(cos(x)-x,x)').text()).toEqual('{0.73908513321516064165}');
		expect(new FunctionSolver('tan(x)-1', 'x').roots()).toHaveLength(6);
		expect(new FunctionSolver('cos(3*x)-x/4', 'x').roots()).toHaveLength(7);
	});
});
