import '../../helpers/registerNerdamerFunctions';
import { linearizeTrig, productToSum, trigReduce } from '../../../src/algebra/simplify/trigreduce';
import { diff } from '../../../src/calculus/derivative/diff';
import { integrate } from '../../../src/calculus/integrate/integrate';
import { pmintPolynomial } from '../../../src/calculus/integrate/poorMansIntegrator';
import { Expression } from '../../../src/core/classes/expression/Expression';

/** The value of an expression at x. */
function valueAt(x: Expression, at: number): number {
	return Number(x.evaluate({ x: at }).text({ decimal: true }));
}

/** Checks that the result is an antiderivative of source at a few points. */
function expectAntiderivative(result: Expression | undefined, source: string): void {
	expect(result).toBeDefined();
	expect(result!.hasFunction('integrate', true)).toBe(false);
	const derivative = diff(result!, 'x');
	for (const x of [-1.3, 0.31, 0.77, 1.9]) {
		expect(valueAt(derivative, x)).toBeCloseTo(valueAt(Expression.create(source), x), 9);
	}
}

/** Whether two expressions agree at a few points. */
function sameValues(a: Expression, b: string): boolean {
	return [-1.3, 0.4, 1.7].every(
		x => Math.abs(valueAt(a, x) - valueAt(Expression.create(b), x)) < 1e-12
	);
}

describe('Integrals of hyperbolic and trigonometric products', () => {
	it.each([
		['sinh(x)*sin(x)'],
		['x*cosh(x)*sin(x)'],
		['cosh(x)*cos(x)'],
		['x^2*sinh(x)*cos(x)'],
		['sinh(2*x)*sin(3*x)'],
		['cosh(x)*sin(x)^2'],
		['sinh(x)^2'],
		['x*sinh(x)^2'],
		['cosh(x)^3'],
		['sinh(x)*cosh(2*x)'],
	])('integrates %s', source => {
		expectAntiderivative(integrate(source, 'x'), source);
	});

	it('matches the sinh/cosh family directly', () => {
		expectAntiderivative(pmintPolynomial('x*cosh(x)*sin(x)', 'x'), 'x*cosh(x)*sin(x)');
	});

	it('leaves a product of three families unevaluated', () => {
		expect(integrate('e^x*sinh(x)*sin(x)', 'x').hasFunction('integrate', true)).toBe(true);
	});
});

describe('Hyperbolic power reduction and product-to-sum', () => {
	it.each([
		['sinh(x)^2', 'cosh(2*x)/2-1/2'],
		['cosh(x)^2', 'cosh(2*x)/2+1/2'],
		['sinh(x)^3', 'sinh(x)^3'],
		['cosh(x)^4', 'cosh(x)^4'],
	])('reduces %s', (source, expected) => {
		expect(sameValues(trigReduce(Expression.create(source)), expected)).toBe(true);
	});

	it.each([
		['sinh(x)*cosh(2*x)', '(sinh(3*x)-sinh(x))/2'],
		['cosh(x)*cosh(2*x)', '(cosh(3*x)+cosh(x))/2'],
		['sinh(x)*sinh(2*x)', '(cosh(3*x)-cosh(x))/2'],
	])('converts %s to a sum', (source, expected) => {
		const result = productToSum(Expression.create(source));
		expect(result.minus(Expression.create(expected)).expand().isZero()).toBe(true);
	});

	it('keeps a mixed sine-sinh product', () => {
		expect(productToSum(Expression.create('sin(x)*sinh(x)')).text()).toBe('sin(x)*sinh(x)');
		expect(
			sameValues(linearizeTrig(Expression.create('sinh(x)^2*cos(x)')), 'sinh(x)^2*cos(x)')
		).toBe(true);
	});
});
