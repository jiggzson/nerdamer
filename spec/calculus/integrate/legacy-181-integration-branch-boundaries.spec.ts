import { diff } from '../../../src/calculus/derivative/diff';
import { integrate } from '../../../src/calculus/integrate/integrate';
import { Expression } from '../../../src/core/classes/expression/Expression';
import '../../../src/index';

describe('legacy #181 local integration behavior across branch regions', () => {
	// Derivatives are verified separately on regular real intervals. This does
	// not assert continuity of the principal-branch primitives across cuts.
	it.each([
		['1/(x+i)', ['-5', '-2', '-1', '0', '1', '3']],
		['1/(x-i)', ['-5', '-2', '-1', '0', '1', '3']],
		['(1+i)/(x+2)', ['-5', '-3', '-5/2', '-3/2', '-1', '0']],
		['1/(x+2)', ['-5', '-3', '-5/2', '-3/2', '-1', '0']],
		['1/(x^2+1)', ['-5', '-2', '-1', '0', '1', '3']],
		['1/(x^2-1)', ['-3', '-2', '-1/2', '0', '1/2', '2', '3']],
	] as const)('preserves a local antiderivative for %s', (sourceText, samples) => {
		const source = Expression.create(sourceText);
		const primitive = integrate(source, 'x');
		expect(primitive.hasFunction('integrate', true)).toBe(false);
		const derivative = diff(primitive, 'x');

		for (const x of samples) {
			const substitutions = { x: Expression.create(x) };
			const actual = derivative.evaluate(substitutions);
			const expected = source.evaluate(substitutions);
			expect(actual.minus(expected).evaluate().isNearlyZero()).toBe(true);
		}
	});
});
