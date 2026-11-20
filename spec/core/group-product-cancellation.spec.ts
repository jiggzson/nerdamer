import '../helpers/registerNerdamerFunctions';
import { Expression } from '../../src/core/classes/expression/Expression';

/** The value of an expression at x = 0.7, y = 1.3. */
function valueAt(x: Expression): number {
	return Number(x.evaluate({ x: 0.7, y: 1.3 }).text({ decimal: true }));
}

// A sum of powers of one base, such as 2*x-x^2, is a grouped sum whose key is that base.
// Multiplying such a power into a product must still find the same power already there.
describe('Powers of a grouped sum inside a product', () => {
	it.each([
		['x^2', '2*x-x^2', '1/2', '1/2'],
		['x', '2*x-x^2', '1/2', '1/2'],
		['y', '2*x-x^2', '1/2', '1/2'],
		['x', 'x+x^2', '3/2', '1/2'],
		['x^3', 'x-x^2', '1/2', '3/2'],
		['x*y', 'x+x^3', '1/3', '1/3'],
		['cos(x)', 'cos(x)-3*cos(x)^2', '1/2', '1/2'],
	])('divides %s*(%s)^(%s) by (%s)^(%s)', (cofactor, base, p, q) => {
		const product = Expression.create(`${cofactor}*(${base})^(${p})`);
		const result = product.div(Expression.create(`(${base})^(${q})`));
		const expected = Expression.create(`${cofactor}*(${base})^(${p}-(${q}))`);
		expect(result.text()).toBe(expected.text());
		expect(valueAt(result)).toBeCloseTo(valueAt(expected), 12);
	});
});
