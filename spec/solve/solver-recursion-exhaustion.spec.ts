import '../../src/index';
import { Expression } from '../../src/core/classes/expression/Expression';
import { SymbolicSolver } from '../../src/solve/classes/SymbolicSolver';
import { solve } from '../../src/solve/solve';

describe('symbolic solver recursion exhaustion', () => {
	// Exhaustion must not turn an incomplete numerical search into a proof of no roots.
	it('preserves an unresolved equation when numerical fallback finds no roots', () => {
		const context = { depth: 64, exhausted: false };
		const result = solve(Expression.create('sin(x)+x^2+1'), 'x', undefined, context);
		expect(context.depth).toBe(64);
		expect(context.exhausted).toBe(true);
		expect(result.count()).toBe(0);
		expect(result.unsolved?.eq('sin(x)+x^2+1')).toBe(true);
		expect(result.partial).toBe(false);
	});

	it('retains numerical roots as partial when symbolic completion is exhausted', () => {
		const context = { depth: 64, exhausted: false };
		const result = solve(Expression.create('sin(x)+x'), 'x', undefined, context);
		expect(context.depth).toBe(64);
		expect(context.exhausted).toBe(true);
		expect(result.has(Expression.Number(0))).toBe(true);
		expect(result.unsolved?.eq('sin(x)+x')).toBe(true);
		expect(result.partial).toBe(true);
	});

	it('restores depth without exhausting the budget for a linear equation', () => {
		const context = { depth: 0, exhausted: false };
		const result = new SymbolicSolver('x-2', 'x', context).solve();
		expect(result.solutions[0].eq('2')).toBe(true);
		expect(result.unsolved).toBeUndefined();
		expect(context.depth).toBe(0);
		expect(context.exhausted).toBe(false);
	});
});
