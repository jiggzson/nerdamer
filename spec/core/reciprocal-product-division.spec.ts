import '../helpers/registerNerdamerFunctions';
import { Expression } from '../../src/core/classes/expression/Expression';

/** The value of an expression at x = 0.7, y = 1.3. */
function valueAt(x: Expression): number {
	return Number(x.evaluate({ x: 0.7, y: 1.3 }).text({ decimal: true }));
}

// Two factors with negative powers multiply as the reciprocal of their reciprocals. The
// result need not be a product: x^-1/(x^-1*y) is y^-1, not an empty product.
describe('Dividing by a product that shares a reciprocal factor', () => {
	it.each([
		['x^-1', 'x^-1*y', 'y^-1'],
		['x^-1', '2*x^-1*log(x)', '(1/2)*log(x)^-1'],
		['x^-2', 'x^-2*y^3', 'y^-3'],
		['3*x^-1', 'x^-1*y*log(x)', '3*(y*log(x))^-1'],
	])('divides %s by %s', (a, b, expected) => {
		const result = Expression.create(a).div(Expression.create(b));
		expect(result.minus(Expression.create(expected)).expand().isZero()).toBe(true);
		expect(valueAt(result)).toBeCloseTo(valueAt(Expression.create(expected)), 12);
	});
});
