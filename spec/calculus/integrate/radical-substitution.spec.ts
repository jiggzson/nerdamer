import '../../helpers/registerNerdamerFunctions';
import { diff } from '../../../src/calculus/derivative/diff';
import { integrate } from '../../../src/calculus/integrate/integrate';
import { Expression } from '../../../src/core/classes/expression/Expression';

/** The value of an expression at x. */
function valueAt(x: Expression, at: number): number {
	return Number(x.evaluate({ x: at }).text({ decimal: true }));
}

describe('Integrals with a fractional power of the variable inside a function', () => {
	it.each([
		['e^sqrt(x)', '2*(sqrt(x)-1)*e^sqrt(x)'],
		['sin(sqrt(x))', '-2*sqrt(x)*cos(sqrt(x))+2*sin(sqrt(x))'],
		['cos(sqrt(x))', '2*sqrt(x)*sin(sqrt(x))+2*cos(sqrt(x))'],
		['sinh(sqrt(x))', '2*sqrt(x)*cosh(sqrt(x))-2*sinh(sqrt(x))'],
		['e^(x^(1/3))', '3*(x^(2/3)-2*x^(1/3)+2)*e^(x^(1/3))'],
		['x*e^sqrt(x)', '2*(x^(3/2)+6*sqrt(x)-3*x-6)*e^sqrt(x)'],
		['sqrt(x)*e^sqrt(x)', '2*(-2*sqrt(x)+x+2)*e^sqrt(x)'],
		[
			'x*sin(sqrt(x))',
			'-2*x^(3/2)*cos(sqrt(x))+12*sqrt(x)*cos(sqrt(x))+6*x*sin(sqrt(x))-12*sin(sqrt(x))',
		],
		['e^sqrt(x)*sin(sqrt(x))', '(-sqrt(2)*sqrt(x)*cos(sqrt(x)+pi/4)+cos(sqrt(x)))*e^sqrt(x)'],
		['e^sqrt(x)/x', '2*Ei(sqrt(x))'],
		['atan(sqrt(x))', '-sqrt(x)+x*atan(sqrt(x))+atan(sqrt(x))'],
		['e^(-sqrt(x))', undefined],
		['sin(sqrt(x))^2', undefined],
		['sin(x^(1/4))', undefined],
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

	it('leaves a bare fractional power to integration by parts', () => {
		// Substituting x = t^2 here would give the same integral in another form.
		expect(integrate('sqrt(x)*log(x)^2', 'x').text()).toBe(
			'(16/27)*x^(3/2)+(-8/9)*x^(3/2)*log(x)+(2/3)*x^(3/2)*log(x)^2'
		);
	});
});
