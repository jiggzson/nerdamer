import { diff } from '../../../src/calculus/derivative/diff';
import { integrate } from '../../../src/calculus/integrate/integrate';
import { pmintPolynomial } from '../../../src/calculus/integrate/poorMansIntegrator';
import { Expression } from '../../../src/core/classes/expression/Expression';
import nerdamer from '../../../src/index';

/** Checks that the result is an antiderivative of source at a few points. */
function expectAntiderivative(result: Expression, source: string): void {
	expect(result.hasFunction('integrate', true)).toBe(false);
	const derivative = diff(result, 'x');
	for (const x of [-2.2, -0.4, 0.3, 1.7]) {
		const values = { x, y: 1.3 };
		const actual = Number(derivative.evaluate(values).text({ decimal: true }));
		const expected = Number(Expression.create(source).evaluate(values).text({ decimal: true }));
		expect(Number.isFinite(actual)).toBe(true);
		expect(actual).toBeCloseTo(expected, 8);
	}
}

describe('Polynomials times exponential-trigonometric products', () => {
	it.each([
		['x*e^x*sin(x)'],
		['x^2*e^x*sin(x)'],
		['x*e^x*cos(x)'],
		['5*x^2*e^x*cos(x)'],
		['x^4*e^x*sin(x)'],
		['x^3*e^(2*x)*cos(3*x)'],
		['x*e^(-x)*sin(2*x)'],
		['x*y*e^x*sin(x)'],
		['x^2*e^x*sin(x)+x*e^x'],
	])('integrates %s', source => {
		expectAntiderivative(integrate(source, 'x'), source);
	});

	it('matches the product family directly', () => {
		// The coefficients from SymPy 1.14: e^x*((x^2-1)*sin(x) - (x-1)^2*cos(x))/2.
		const result = pmintPolynomial('x^2*e^x*sin(x)', 'x');
		const expected = Expression.create('e^x*((x^2-1)*sin(x)-(x-1)^2*cos(x))/2');
		expect(result).toBeDefined();
		expect(result?.minus(expected).expand().isZero()).toBe(true);
	});

	it('integrates through the parser', () => {
		expectAntiderivative(
			Expression.create(nerdamer('integrate(x^2*e^x*sin(x),x)').text()),
			'x^2*e^x*sin(x)'
		);
	});
});

describe('Integration by parts with a derivative pair', () => {
	it.each([['x*sin(x)*cos(x)'], ['x^2*sin(x)*cos(x)'], ['x*e^x*e^(2*x)']])(
		'keeps every factor of %s',
		source => {
			expectAntiderivative(integrate(source, 'x'), source);
		}
	);
});
