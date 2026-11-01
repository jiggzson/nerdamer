import { rationalPolynomialGcd } from '../../../src/calculus/integrate/algorithms/residueArithmetic';
import { Expression } from '../../../src/core/classes/expression/Expression';
import { Polynomial } from '../../../src/core/classes/polynomial/Polynomial';

describe('Rational integration polynomial GCD', () => {
	const cases = [
		['(x-1)^2*(x^2+1)^2', '6*x^5-10*x^4+12*x^3-12*x^2+6*x-2', '(x-1)*(x^2+1)'],
		['x^2+1', '2*x', '1'],
		['x^2-1', 'x-1', 'x-1'],
		['x^2+1', '0', 'x^2+1'],
	] as const;

	it.each(cases)('returns the monic gcd of %s and %s', (left, right, expected) => {
		const result = rationalPolynomialGcd(Expression.create(left).expand(),
			Expression.create(right).expand(), 'x');
		expect(result).toBeDefined();
		if (result !== undefined) {
			const difference = result.minus(Expression.create(expected)).expand();
			expect(new Polynomial(difference, ['x']).toArray(false, 'x')
				.every(coefficient => coefficient.isZero())).toBe(true);
		}
	});

	it('declines coefficients outside the rational domain', () => {
		expect(rationalPolynomialGcd(Expression.create('x^2+sqrt(5)'),
			Expression.create('x'), 'x')).toBeUndefined();
	});
});
