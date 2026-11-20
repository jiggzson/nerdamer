import '../../helpers/registerNerdamerFunctions';
import { diff } from '../../../src/calculus/derivative/diff';
import { integrate } from '../../../src/calculus/integrate/integrate';
import { Expression } from '../../../src/core/classes/expression/Expression';

/** The value of an expression at x. */
function valueAt(x: Expression, at: number): number {
	return Number(x.evaluate({ x: at }).text({ decimal: true }));
}

describe('Integrals of powers of the variable times powers of log', () => {
	it.each([
		['x*log(x)^2', 'x^2*(2*log(x)^2-2*log(x)+1)/4'],
		['x^2*log(x)^2', 'x^3*(9*log(x)^2-6*log(x)+2)/27'],
		['x^3*log(x)^3', undefined],
		['x*log(x)^4', undefined],
		['log(x)^2/x^2', undefined],
		['sqrt(x)*log(x)^2', undefined],
		['x*log(2*x)^2', undefined],
	])('integrates %s', (source, sympy) => {
		const result = integrate(source, 'x');
		expect(result.hasFunction('integrate', true)).toBe(false);
		const derivative = diff(result, 'x');
		for (const x of [0.31, 0.77, 1.9, 4.2]) {
			expect(valueAt(derivative, x)).toBeCloseTo(valueAt(Expression.create(source), x), 9);
		}
		if (sympy) {
			// The antiderivative from SymPy 1.14, which may differ by a constant.
			const difference = result.minus(Expression.create(sympy));
			expect(valueAt(difference, 0.4)).toBeCloseTo(valueAt(difference, 2.3), 9);
		}
	});
});
