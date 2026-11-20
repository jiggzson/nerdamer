import '../../helpers/registerNerdamerFunctions';
import { diff } from '../../../src/calculus/derivative/diff';
import { integrate } from '../../../src/calculus/integrate/integrate';
import { Expression } from '../../../src/core/classes/expression/Expression';

/** The value of an expression at x. */
function valueAt(x: Expression, at: number): number {
	return Number(x.evaluate({ x: at }).text({ decimal: true }));
}

/** Expects result to be an antiderivative of source, matching SymPy up to a constant. */
function expectIntegral(source: string, sympy: string) {
	const result = integrate(source, 'x');
	expect(result.hasFunction('integrate', true)).toBe(false);
	const derivative = diff(result, 'x');
	for (const x of [0.3, 0.7, 2.4]) {
		expect(valueAt(derivative, x)).toBeCloseTo(valueAt(Expression.create(source), x), 9);
	}
	// The antiderivative from SymPy 1.14, which may differ by a constant.
	const difference = result.minus(Expression.create(sympy));
	expect(valueAt(difference, 0.3)).toBeCloseTo(valueAt(difference, 2.4), 9);
}

// An improper fraction over a linear denominator is a polynomial plus c/(a*x+b).
describe('Improper rational functions with a linear denominator', () => {
	it.each([
		['x/(x+1)', 'x-log(x+1)'],
		['x^3/(x+1)', 'x^3/3-x^2/2+x-log(x+1)'],
		['x^2/(2*x+1)', 'x^2/4-x/4+log(2*x+1)/8'],
		['(x^2+1)/(x+1)', 'x^2/2-x+2*log(x+1)'],
	])('integrates %s', expectIntegral);
});

// Integration by parts leaves a log or inverse function times an improper rational function,
// as in x^2*log(x+1)/(x+1), which is divided before the next round.
describe('Integration by parts with an improper rational cofactor', () => {
	it.each([
		['x*log(x+1)', 'x^2*log(x+1)/2-x^2/4+x/2-log(x+1)/2'],
		['x*log(x+1)^2', 'x^2/4-x*(x-2)*log(x+1)/2-3*x/2+(x^2-1)*log(x+1)^2/2+3*log(x+1)/2'],
		[
			'x*log(x+1)^3',
			'-3*x^2/8+3*x*(x-6)*log(x+1)/4+21*x/4+(x^2-1)*log(x+1)^3/2+3*(-x^2+2*x+3)*log(x+1)^2/4-21*log(x+1)/4',
		],
		[
			'x^2*log(2*x+1)^2',
			'2*x^3/27-5*x^2/36-x*(4*x^2-3*x+3)*log(2*x+1)/18+11*x/36+(8*x^3+1)*log(2*x+1)^2/24-11*log(2*x+1)/72',
		],
		['x*atan(x)^2', 'x^2*atan(x)^2/2-x*atan(x)+log(x^2+1)/2+atan(x)^2/2'],
		[
			'x^3*atan(x)^2',
			'x^4*atan(x)^2/4-x^3*atan(x)/6+x^2/12+x*atan(x)/2-log(x^2+1)/3-atan(x)^2/4',
		],
		['x^2*log(x+1)/(x+1)', '-x^2/4+x*(x-2)*log(x+1)/2+3*x/2+log(x+1)^2/2-3*log(x+1)/2'],
		['x^2*atan(x)/(1+x^2)', 'x*atan(x)-log(x^2+1)/2-atan(x)^2/2'],
		['log(sqrt(x)+1)', 'sqrt(x)-x/2+(x-1)*log(sqrt(x)+1)'],
	])('integrates %s', expectIntegral);
});
