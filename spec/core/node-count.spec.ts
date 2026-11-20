import { Expression } from '../../src/core/classes/expression/Expression';
import { nodeCount } from '../../src/core/classes/expression/traversal';
import nerdamer from '../../src/index';

// Ensure the full function registry is loaded before parsing function calls.
nerdamer('x');

describe('nodeCount', () => {
	it('counts a node with its arguments, elements, exponential base and non-unit power', () => {
		const cases: [string, number][] = [
			['x', 1],
			['5', 1],
			['x^2', 2],
			['x+y', 3],
			['x+y+z', 4],
			['x*y', 3],
			['sin(x)', 2],
			['sin(x)^2', 3],
			['e^(-x)', 3],
			['x^(x+1)', 5],
			['(x+1)^2', 4],
		];
		for (const [source, expected] of cases) {
			expect(nodeCount(Expression.create(source))).toBe(expected);
		}
	});

	it('ignores numeric multipliers and digit counts', () => {
		expect(nodeCount(Expression.create('(1/39916800)*x'))).toBe(nodeCount(Expression.create('x')));
		expect(nodeCount(Expression.create('x^12'))).toBe(nodeCount(Expression.create('x^2')));
	});

	it('ranks the growing L\'Hopital form above the resolving one', () => {
		const growing = Expression.create('-x*Ei(x)^2*e^(-x)');
		const resolving = Expression.create('-x*e^x');
		expect(nodeCount(growing)).toBeGreaterThan(nodeCount(resolving));
	});
});
