import '../../helpers/registerNerdamerFunctions';
import { diff } from '../../../src/calculus/derivative/diff';
import { integrate } from '../../../src/calculus/integrate/integrate';
import { Expression } from '../../../src/core/classes/expression/Expression';

/** The value of an expression at x. */
function valueAt(x: Expression, at: number): number {
	return Number(x.evaluate({ x: at }).text({ decimal: true }));
}

// The points keep the quadratic positive. Cases without a SymPy value are those where
// SymPy 1.14 answers with Piecewise or Abs; the derivative still checks them.
describe('Integrals of a polynomial times a power of the square root of a quadratic', () => {
	it.each([
		['x^2*sqrt(1-x^2)', [0.05, 0.31, 0.9], undefined],
		['x^3*sqrt(1-x^2)', [0.05, 0.31, 0.9], 'sqrt(1-x^2)*(3*x^4-x^2-2)/15'],
		['x^5*sqrt(1-x^2)', [0.05, 0.31, 0.9], 'sqrt(1-x^2)*(15*x^6-3*x^4-4*x^2-8)/105'],
		['x^4/sqrt(1-x^2)', [0.05, 0.31, 0.9], '-x^3*sqrt(1-x^2)/4-3*x*sqrt(1-x^2)/8+3*asin(x)/8'],
		['(1-x^2)^(3/2)', [0.05, 0.31, 0.9], '-x^3*sqrt(1-x^2)/4+5*x*sqrt(1-x^2)/8+3*asin(x)/8'],
		[
			'(1-x^2)^(5/2)',
			[0.05, 0.31, 0.9],
			'x^5*sqrt(1-x^2)/6-13*x^3*sqrt(1-x^2)/24+11*x*sqrt(1-x^2)/16+5*asin(x)/16',
		],
		[
			'(x+1)*sqrt(1-x^2)',
			[0.05, 0.31, -0.9],
			'x^2*sqrt(1-x^2)/3+x*sqrt(1-x^2)/2-sqrt(1-x^2)/3+asin(x)/2',
		],
		['x^2*sqrt(4-x^2)', [0.05, 0.31, 1.9], undefined],
		['x^2*sqrt(x^2+1)', [0.05, 0.31, -3], undefined],
		['x^2*sqrt(x^2-1)', [1.3, 2.1, -3.7], undefined],
		['x^3/sqrt(x^2+4)', [0.05, 0.31, -3], '(x^2-8)*sqrt(x^2+4)/3'],
		[
			'(x^2+3*x)*sqrt(x^2+2*x+5)',
			[0.05, 0.31, -3],
			'sqrt(x^2+2*x+5)*(3*x^3+13*x^2+11*x+17)/12-6*asinh(x/2+1/2)',
		],
		[
			'x^2*sqrt(2*x-x^2)',
			[0.3, 0.9, 1.6],
			'sqrt(x*(2-x))*(6*x^3-2*x^2-5*x-15)/24+5*asin(x-1)/8',
		],
	] as [string, number[], string | undefined][])('integrates %s', (source, points, sympy) => {
		const result = integrate(source, 'x');
		expect(result.hasFunction('integrate', true)).toBe(false);
		const derivative = diff(result, 'x');
		for (const x of points) {
			expect(valueAt(derivative, x)).toBeCloseTo(valueAt(Expression.create(source), x), 9);
		}
		if (sympy) {
			// The antiderivative from SymPy 1.14, which may differ by a constant.
			const difference = result.minus(Expression.create(sympy));
			expect(valueAt(difference, points[0])).toBeCloseTo(valueAt(difference, points[1]), 9);
		}
	});

	it('keeps the substitution form when the cofactor is the derivative of Q', () => {
		expect(integrate('x*sqrt(1-x^2)', 'x').text()).toBe('(-1/3)*(1-x^2)^(3/2)');
	});
});
