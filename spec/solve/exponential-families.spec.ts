import '../helpers/registerNerdamerFunctions';
import { Expression } from '../../src/core/classes/expression/Expression';
import { solve } from '../../src/solve/solve';

// b^u = c holds for u = (log(c) + 2*pi*i*n)/log(b) at every integer n. When c has no real
// logarithm every root is complex, so the solver returns the whole family, not only n = 0.
describe('Exponential solution families', () => {
	it.each([
		['e^x+1', 'pi*i', '2*pi*i'],
		['3*e^x+6', 'log(2)+pi*i', '2*pi*i'],
		['e^x-i', 'pi*i/2', '2*pi*i'],
		['e^(2*x)+1', 'pi*i/2', 'pi*i'],
		['2^x+8', '3+pi*i/log(2)', '2*pi*i/log(2)'],
		['e^(x+1)+2', 'log(2)-1+pi*i', '2*pi*i'],
	])('returns the family for %s', (source, first, period) => {
		const result = solve(source, 'x');
		expect(result.solutionForm).toBe('parametric');
		expect(result.count()).toBe(1);
		const root = result.elements[0];

		const atZero = root.subst('_n', 0);
		const atOne = root.subst('_n', 1);
		const offset = atZero.minus(Expression.create(first));
		const step = atOne.minus(atZero).minus(Expression.create(period));
		expect(offset.evaluate().expand().isNearlyZero()).toBe(true);
		expect(step.evaluate().expand().isNearlyZero()).toBe(true);
		for (const n of [-2, -1, 0, 1, 2]) {
			const value = root.subst('_n', n);
			const residual = Expression.create(source).subst('x', value).evaluate().expand();
			expect(residual.isNearlyZero()).toBe(true);
		}
	});

	// With a real logarithm the real root is returned alone, and a symbolic c is left as is.
	it.each([
		['e^x-3', '{log(3)}'],
		['e^x-1', '{0}'],
		['2^x-8', '{3}'],
		['a^x-b', '{log(b)*log(a)^-1}'],
		['e^x+a', '{log(-a)}'],
	])('keeps the single root for %s', (source, expected) => {
		expect(solve(source, 'x').text()).toBe(expected);
	});
});
