import nerdamer from '../../src/index';
import { Expression } from '../../src/core/classes/expression/Expression';

// Regression: https://github.com/jiggzson/nerdamer/issues/653
describe('legacy #653 — already-isolated symbolic equation', () => {
	const input = 'y=(1/2)*a*b^2*c^(-2)';
	const expected = Expression.create('(1/2)*a*b^2*c^(-2)');

	it('solves directly through the public root solver', () => {
		const solutions = nerdamer.solve(input, 'y');

		expect(solutions.count()).toBe(1);
		expect(solutions.elements[0].eq(expected)).toBe(true);
	});

});
