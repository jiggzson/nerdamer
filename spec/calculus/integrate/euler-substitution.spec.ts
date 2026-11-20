import '../../helpers/registerNerdamerFunctions';
import { diff } from '../../../src/calculus/derivative/diff';
import { integrate } from '../../../src/calculus/integrate/integrate';
import { Expression } from '../../../src/core/classes/expression/Expression';
import nerdamer from '../../../src/index';

/** The real and imaginary parts of an expression at x. */
function partsAt(x: Expression, at: number): [number, number] {
	const value = x.evaluate({ x: at });
	const re = nerdamer('realpart(v)', { v: value }).evaluate().text({ decimal: true });
	const im = nerdamer('imagpart(v)', { v: value }).evaluate().text({ decimal: true });
	return [Number(re), Number(im)];
}

/** Expects two complex values to agree to 9 digits. */
function expectClose([re, im]: [number, number], [expectedRe, expectedIm]: [number, number]) {
	expect(re).toBeCloseTo(expectedRe, 9);
	expect(im).toBeCloseTo(expectedIm, 9);
}

// Results may carry a constant such as i*pi, from a log of a negative value, so values
// are compared as complex numbers. The points keep Q > 0, and the first two share an
// interval between poles, since the constant may differ from one to the next. SymPy's
// values are its branch for those points, or are missing where it leaves the integral.
describe('Integrals of a rational function times sqrt(Q)^±1 by Euler substitution', () => {
	it.each([
		['1/(x*sqrt(1-x^2))', [0.31, 0.62, -0.9], '-acosh(1/x)'],
		['1/(x^2*sqrt(1-x^2))', [0.31, 0.62, -0.9], '-sqrt(1-x^2)/x'],
		['sqrt(1-x^2)/x', [0.31, 0.62, -0.9], '(-x^2-sqrt(1-x^2)*acosh(1/x)+1)/sqrt(1-x^2)'],
		['sqrt(1-x^2)/x^2', [0.31, 0.62, -0.9], '-asin(x)-sqrt(1-x^2)/x'],
		['1/(x*sqrt(x^2+1))', [0.31, 2.9, -1.3], '-asinh(1/x)'],
		['1/(x^2*sqrt(x^2+1))', [0.31, 2.9, -1.3], '-sqrt(x^2+1)/x'],
		['sqrt(x^2+1)/x', [0.31, 2.9, -1.3], '(x^2-sqrt(x^2+1)*asinh(1/x)+1)/sqrt(x^2+1)'],
		['1/(x*sqrt(x^2-1))', [1.3, 3.7, -2.1], '-asin(1/x)'],
		['1/(x^2*sqrt(x^2-1))', [1.3, 3.7, -2.1], 'sqrt(x^2-1)/x'],
		['sqrt(x^2-1)/x', [1.3, 3.7, -2.1], '(x^2+sqrt(x^2-1)*asin(1/x)-1)/sqrt(x^2-1)'],
		['(x+2)/(x*sqrt(x^2+1))', [0.31, 2.9, -1.3], '-2*asinh(1/x)+asinh(x)'],
		['1/((x+1)*sqrt(x^2+1))', [0.31, 2.9, -3.7], undefined],
		['1/((x-2)*sqrt(1-x^2))', [0.31, 0.62, -0.9], undefined],
		['1/(x*sqrt(x^2+2*x+5))', [0.31, 2.9, -1.3], undefined],
		['x/((x+1)*sqrt(1-x^2))', [0.31, 0.62, -0.5], undefined],
		['sqrt(2*x-x^2)/x', [0.3, 0.9, 1.6], undefined],
		['1/((x-3)*sqrt(2*x-x^2))', [0.3, 0.9, 1.6], undefined],
		['1/((x+1)*sqrt(3*x-x^2-2))', [1.2, 1.8], undefined],
	] as [string, number[], string | undefined][])('integrates %s', (source, points, sympy) => {
		const result = integrate(source, 'x');
		expect(result.hasFunction('integrate', true)).toBe(false);
		const derivative = diff(result, 'x');
		for (const x of points) {
			expectClose(partsAt(derivative, x), partsAt(Expression.create(source), x));
		}
		if (sympy) {
			// The antiderivative from SymPy 1.14, which may differ by a constant.
			const difference = result.minus(Expression.create(sympy));
			expectClose(partsAt(difference, points[0]), partsAt(difference, points[1]));
		}
	});
});
