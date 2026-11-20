import '../helpers/registerNerdamerFunctions';
import { Expression } from '../../src/core/classes/expression/Expression';
import { SolutionSet } from '../../src/solve/classes/SolutionSet';
import { solve } from '../../src/solve/solve';

/** Solves `source` and counts the candidates substituted back into an expression. */
function solveCounted(source: string) {
	const single = jest.spyOn(SolutionSet.prototype, 'addSolution');
	const many = jest.spyOn(SolutionSet.prototype, 'addSolutions');
	try {
		const result = solve(source, 'x');
		const checks =
			single.mock.calls.length +
			many.mock.calls.reduce(
				(sum, [candidates]) =>
					sum +
					(SolutionSet.isSolutionSet(candidates)
						? candidates.count()
						: candidates.length),
				0
			);
		return { result, checks };
	} finally {
		single.mockRestore();
		many.mockRestore();
	}
}

describe('Solution provenance', () => {
	it.each([
		['sin(x)^4+2', 8],
		['sin(2*x+1)^3-1/2', 6],
		['cos(x)^3+2', 6],
	])('skips substituting back roots of %s found by exact steps', (source, count) => {
		const { result, checks } = solveCounted(source);
		expect(checks).toBe(0);
		expect(result.count()).toBe(count);

		// Every family still satisfies the equation for sampled indices.
		for (const solution of result.elements) {
			for (const index of [-1, 0, 1]) {
				const value = solution.subst('_n', index);
				const residual = Expression.create(source).subst('x', value).evaluate().expand();
				expect(residual.isNearlyZero()).toBe(true);
			}
		}
	});

	it.each([
		// Squaring the radical adds x = -1.
		['sqrt(x+2)-x', ['2']],
		['sqrt(x)+1', []],
		// Combining the logarithms adds x = -1.
		['log(x)+log(x-3)-log(4)', ['4']],
		// acos and asin have a restricted range.
		['acos(x)-4', []],
		['asin(x)^2-4', []],
		// tan(u) = i has no solution.
		['tan(x)-i', []],
	])('still rejects extraneous roots of %s', (source, expected) => {
		const { result, checks } = solveCounted(source);
		expect(checks).toBeGreaterThan(0);
		expect(result.elements.map(root => root.text())).toEqual(expected);
	});

	it('keeps checking roots when factoring changes where the expression is defined', () => {
		// (x-1)/(1-1/x) simplifies to x, which is 1 at x = 1, where the source is undefined.
		const { result, checks } = solveCounted('(x-1)/(1-1/x)-1');
		expect(checks).toBeGreaterThan(0);
		expect(result.count()).toBe(0);
	});
});
