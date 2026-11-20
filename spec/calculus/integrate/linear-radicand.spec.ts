import '../../helpers/registerNerdamerFunctions';
import { diff } from '../../../src/calculus/derivative/diff';
import { integrate } from '../../../src/calculus/integrate/integrate';
import { Expression } from '../../../src/core/classes/expression/Expression';

/** The value of an expression at x, with a = 2 and b = 3 for symbolic radicands. */
function valueAt(x: Expression, at: number): number {
	return Number(x.evaluate({ x: at, a: 2, b: 3 }).text({ decimal: true }));
}

// The points keep every radicand positive, including 1-x and 3*x-2.
describe('Integrals with a fractional power of a linear expression', () => {
	it.each([
		['e^sqrt(2*x+1)', '(sqrt(2*x+1)-1)*e^sqrt(2*x+1)'],
		['sin(sqrt(x+1))', '-2*sqrt(x+1)*cos(sqrt(x+1))+2*sin(sqrt(x+1))'],
		['e^sqrt(1-x)', '2*(1-sqrt(1-x))*e^sqrt(1-x)'],
		['cos(sqrt(3*x-2))', '2*sqrt(3*x-2)*sin(sqrt(3*x-2))/3+2*cos(sqrt(3*x-2))/3'],
		['sinh(sqrt(2*x-1))', 'sqrt(2*x-1)*cosh(sqrt(2*x-1))-sinh(sqrt(2*x-1))'],
		['e^((x+1)^(1/3))', '3*((x+1)^(2/3)-2*(x+1)^(1/3)+2)*e^((x+1)^(1/3))'],
		['x*e^sqrt(x+1)', '2*(x*sqrt(x+1)-3*x+6*sqrt(x+1)-8)*e^sqrt(x+1)'],
		[
			'x*cos(sqrt(x+1))',
			'2*x*sqrt(x+1)*sin(sqrt(x+1))+6*x*cos(sqrt(x+1))-12*sqrt(x+1)*sin(sqrt(x+1))-8*cos(sqrt(x+1))',
		],
		['e^sqrt(x+1)/(x+1)', '2*Ei(sqrt(x+1))'],
		['atan(sqrt(x+1))', 'x*atan(sqrt(x+1))-sqrt(x+1)+2*atan(sqrt(x+1))'],
		['x*sqrt(x+1)', '2*sqrt(x+1)*(3*x^2+x-2)/15'],
		['x^2/sqrt(2*x+3)', 'sqrt(2*x+3)*(x^2-2*x+6)/5'],
		// SymPy's branch for x > 0.
		['sqrt(x+1)/x', '2*sqrt(x+1)-2*acoth(sqrt(x+1))'],
		['(x-1)*e^sqrt(x)', '2*(x^(3/2)+5*sqrt(x)-3*x-5)*e^sqrt(x)'],
		[
			'sqrt(1+sqrt(x))',
			'4*(3*x^(7/2)*sqrt(sqrt(x)+1)-x^(5/2)*sqrt(sqrt(x)+1)+2*x^(5/2)+4*x^3*sqrt(sqrt(x)+1)-2*x^2*sqrt(sqrt(x)+1)+2*x^2)/(15*(x^(5/2)+x^2))',
		],
		['e^sqrt(a*x+b)', undefined],
	])('integrates %s', (source, sympy) => {
		const result = integrate(source, 'x');
		expect(result.hasFunction('integrate', true)).toBe(false);
		const derivative = diff(result, 'x');
		for (const x of [0.71, 0.83, 0.95]) {
			expect(valueAt(derivative, x)).toBeCloseTo(valueAt(Expression.create(source), x), 9);
		}
		if (sympy) {
			// The antiderivative from SymPy 1.14, which may differ by a constant.
			const difference = result.minus(Expression.create(sympy));
			expect(valueAt(difference, 0.72)).toBeCloseTo(valueAt(difference, 0.9), 9);
		}
	});
});
