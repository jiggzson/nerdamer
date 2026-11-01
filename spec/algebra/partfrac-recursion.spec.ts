import { partfrac } from '../../src/algebra/partfrac';
import { Expression } from '../../src/core/classes/expression/Expression';

describe('partial-fraction recursion progress contract', () => {
	// Inverse Laplace uses identity to decline recursive no-op decomposition.
	it.each([
		'1/(s+1)',
		'1/(s^3+s+1)',
		's+1',
	])('preserves input identity when no decomposition is available: %s', input => {
		const expression = Expression.create(input);
		expect(partfrac(expression, 's')).toBe(expression);
	});

	it('returns a changed expression for a decomposable rational fraction', () => {
		const expression = Expression.create('1/(s*(s+1))');
		const decomposed = partfrac(expression, 's');
		expect(decomposed).not.toBe(expression);
		expect(decomposed.text()).not.toBe(expression.text());
		expect(decomposed.eq(expression)).toBe(true);
	});
});
