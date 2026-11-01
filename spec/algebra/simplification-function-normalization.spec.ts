import { simplify } from '../../src/algebra/simplify/simplify';
import { Expression } from '../../src/core/classes/expression/Expression';

describe('simplification function normalization equivalence', () => {
	// Check substituted expressions exactly; allow rounding in numerical evaluation.
	it.each([
		'sin((x+1)/(x-1))',
		'cos(sin((x+1)/(x-1)))',
		'sin((x+1)*(x+2))',
		'2*sin((x+1)*(x+2))',
		'sin((x+1)*(x+2))^2',
		'log(1+(x+1)/(x-1))',
		'sqrt(1+(x+1)/(x-1))',
	])('preserves evaluated values for %s', input => {
		const original = Expression.create(input);
		const result = simplify(original);
		for (const x of [2, 3, 5]) {
			const values = { x };
			const exactOriginal = original.sub('x', String(x));
			const exactSimplified = result.sub('x', String(x));
			expect(exactSimplified.eq(exactOriginal)).toBe(true);

			const expected = original.evaluate(values);
			const actual = result.evaluate(values);
			expect(actual.minus(expected).isNearlyZero()).toBe(true);
		}
	});
});
