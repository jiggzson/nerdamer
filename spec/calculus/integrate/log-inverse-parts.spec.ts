import '../../helpers/registerNerdamerFunctions';
import { diff } from '../../../src/calculus/derivative/diff';
import { integrate } from '../../../src/calculus/integrate/integrate';
import { Expression } from '../../../src/core/classes/expression/Expression';

/** The value of an expression at x. */
function valueAt(x: Expression, at: number): number {
	return Number(x.evaluate({ x: at }).text({ decimal: true }));
}

// The points stay inside each function's real domain, and the first two share an interval,
// since the constant may differ from one to the next. SymPy's values are from SymPy 1.14.
describe('Integrals by parts with log, inverse and squared trig factors', () => {
	it.each([
		['x*tan(x)^2', [0.3, 0.7, -0.45], '-x^2/2+x*tan(x)-log(cos(x)^(-2))/2'],
		['x*cot(x)^2', [0.3, 0.7, 1.2], '-x^2/2-x/tan(x)-log(cos(x)^(-2))/2+log(tan(x))'],
		['asin(x)^2', [0.3, 0.7, -0.45], 'x*asin(x)^2-2*x+2*sqrt(1-x^2)*asin(x)'],
		['acos(x)^2', [0.3, 0.7, -0.45], 'x*acos(x)^2-2*x-2*sqrt(1-x^2)*acos(x)'],
		['asinh(x)^2', [0.3, 0.7, -2.1], 'x*asinh(x)^2+2*x-2*sqrt(x^2+1)*asinh(x)'],
		[
			'asin(x)^3',
			[0.3, 0.7, -0.45],
			'x*asin(x)^3-6*x*asin(x)+3*sqrt(1-x^2)*asin(x)^2-6*sqrt(1-x^2)',
		],
		[
			'x^2*asin(x)^2',
			[0.3, 0.7, -0.45],
			'x^3*asin(x)^2/3-2*x^3/27+2*x^2*sqrt(1-x^2)*asin(x)/9-4*x/9+4*sqrt(1-x^2)*asin(x)/9',
		],
		['x*asin(x)/sqrt(1-x^2)', [0.3, 0.7, -0.45], 'x-sqrt(1-x^2)*asin(x)'],
		['log(x)/(x+1)^2', [0.3, 0.7, 2.5], '((x+1)*(log(x)-log(x+1))-log(x))/(x+1)'],
	] as [string, number[], string][])('integrates %s', (source, points, sympy) => {
		const result = integrate(source, 'x');
		expect(result.hasFunction('integrate', true)).toBe(false);
		const derivative = diff(result, 'x');
		for (const x of points) {
			expect(valueAt(derivative, x)).toBeCloseTo(valueAt(Expression.create(source), x), 9);
		}
		// The antiderivative from SymPy, which may differ by a constant.
		const difference = result.minus(Expression.create(sympy));
		expect(valueAt(difference, points[0])).toBeCloseTo(valueAt(difference, points[1]), 9);
	});
});

// The derivative of log and the inverse functions is algebraic, so f^n*f' pairs exist.
describe('Substitutions with a log or inverse function', () => {
	it.each([
		['asin(x)/sqrt(1-x^2)', 'asin(x)^2/2'],
		['asin(x)^2/sqrt(1-x^2)', 'asin(x)^3/3'],
		['atan(x)/(1+x^2)', 'atan(x)^2/2'],
		['asinh(x)/sqrt(1+x^2)', 'asinh(x)^2/2'],
		['log(x)^2/x', 'log(x)^3/3'],
	])('integrates %s', (source, sympy) => {
		const result = integrate(source, 'x');
		expect(result.hasFunction('integrate', true)).toBe(false);
		const difference = result.minus(Expression.create(sympy));
		expect(valueAt(difference, 0.3)).toBeCloseTo(valueAt(difference, 0.7), 9);
	});
});
