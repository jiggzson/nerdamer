import '../../helpers/registerNerdamerFunctions';
import { linearizeTrig } from '../../../src/algebra/simplify/trigreduce';
import { diff } from '../../../src/calculus/derivative/diff';
import { integrate } from '../../../src/calculus/integrate/integrate';
import { Expression } from '../../../src/core/classes/expression/Expression';

/** The value of an expression at x. */
function valueAt(x: Expression, at: number): number {
	return Number(x.evaluate({ x: at }).text({ decimal: true }));
}

/** Checks that the result is an antiderivative of source at a few points. */
function expectAntiderivative(result: Expression, source: string): void {
	expect(result.hasFunction('integrate', true)).toBe(false);
	const derivative = diff(result, 'x');
	for (const x of [0.31, 0.77, 1.9]) {
		expect(valueAt(derivative, x)).toBeCloseTo(valueAt(Expression.create(source), x), 10);
	}
}

describe('Integrals of products and powers of sine and cosine', () => {
	it.each([
		['x*sin(x)^2'],
		['x*cos(x)*sin(x)^2'],
		['sin(x)^2*cos(x)^3'],
		['sin(x)^5*cos(x)^4'],
		['cos(x)^7'],
		['e^x*sin(x)^2'],
		['e^x*cos(x)^2'],
		['x*e^x*sin(x)^2'],
		['e^(-x)*cos(x)^3'],
		['cos(2*x)*cos(x)*sin(2*x)'],
		['sin(x)*sin(2*x)*sin(3*x)'],
		['e^(2*x)*sin(3*x)*cos(x)'],
		['sin(3*x+1)*cos(2*x-1)'],
		['x*sin(x)*sin(2*x)'],
		['x^2*sin(x)*cos(x)^2'],
		['x^3*cos(x)^4'],
		['sin(x)^2*sin(2*x)^2'],
		// The terms can integrate to special functions.
		['sin(x)^2/x'],
		['sin(x)^2*cos(x)/x'],
	])('integrates %s', source => {
		expectAntiderivative(integrate(source, 'x'), source);
	});

	it.each([['x*sin(x)^3*tan(x)'], ['sin(x)*cos(x)*e^(x^2)'], ['sin(x^2)*cos(x)']])(
		'leaves %s unevaluated',
		source => {
			expect(integrate(source, 'x').hasFunction('integrate', true)).toBe(true);
		}
	);
});

describe('Linearizing sine and cosine', () => {
	it.each([
		['sin(x)^2', '1/2-cos(2*x)/2'],
		['sin(x)^2*cos(x)', 'cos(x)/4-cos(3*x)/4'],
		['x*sin(x)*cos(2*x)', 'x*sin(3*x)/2-x*sin(x)/2'],
		['e^x*cos(x)^3', 'e^x*(3*cos(x)+cos(3*x))/4'],
	])('rewrites %s as %s', (source, expected) => {
		const result = linearizeTrig(Expression.create(source));
		expect(result.minus(Expression.create(expected)).expand().isZero()).toBe(true);
		const terms = result.isSum() ? result.elementsArray() : [result];
		for (const term of terms) {
			const factors = term.isProduct() ? term.elementsArray() : [term];
			const trig = factors.filter(
				factor => factor.isFunction('sin') || factor.isFunction('cos')
			);
			expect(trig.length).toBeLessThanOrEqual(1);
			expect(trig.every(factor => factor.getPower().isOne())).toBe(true);
		}
	});
});
