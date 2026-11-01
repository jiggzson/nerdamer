import nerdamer from '../../src/index';
import { Expression } from '../../src/core/classes/expression/Expression';

describe('legacy #181 complex solver verification', () => {
	// Every returned solution must satisfy the original expression.
	const cases = [
		['(3+i)*x-5', 1],
		['i*x-1', 1],
		['x+2*i-3', 1],
		['(1+i)*x-(2-i)', 1],
		['(x-i)*(x+2*i)', 2],
		['(x-i)^2', 1],
		['x^2+1', 2],
		['(x+i)^2-1', 2],
		['(x-i)/(x-i)', 0],
	] as const;

	it.each(cases)('verifies roots of %s', (input, expectedCount) => {
		const solutions = nerdamer.solve(input, 'x');
		expect(solutions.count()).toBe(expectedCount);
		const original = Expression.create(input);
		for (const root of solutions.elements) {
			const evaluated = original.evaluate({ x: root.evaluate() }).expand();
			expect(evaluated.variables()).toHaveLength(0);
			expect(evaluated.isNearlyZero()).toBe(true);
		}
	});
});
