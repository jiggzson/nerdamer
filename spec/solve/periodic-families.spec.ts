import { Expression } from '../../src/core/classes/expression/Expression';
import { solve } from '../../src/solve/solve';

describe('Periodic solution families', () => {
	it('should satisfy the source expression for sampled integer indices', () => {
		const sources = ['sin(x)', 'cos(x)', 'tan(x)', 'cot(x)', 'sin(2*x+1)'];
		const indices = [-2, -1, 0, 1, 2];

		for (const source of sources) {
			const solutions = solve(source, 'x');
			expect(solutions.solutionForm).toBe('parametric');
			expect(solutions.count()).toBeGreaterThan(0);

			for (const solution of solutions.elements) {
				for (const index of indices) {
					const value = solution.subst('_n', index);
					const residual = Expression.create(source).subst('x', value).evaluate().expand();
					expect(residual.isNearlyZero()).toBe(true);
				}
			}
		}
	});
});
