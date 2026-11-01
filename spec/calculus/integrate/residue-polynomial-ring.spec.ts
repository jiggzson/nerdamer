import { ResiduePolynomialRing } from '../../../src/calculus/integrate/algorithms/residueArithmetic';
import { Expression } from '../../../src/core/classes/expression/Expression';
import { Polynomial } from '../../../src/core/classes/polynomial/Polynomial';

describe('Exact logarithmic residue quotient arithmetic', () => {
	const cases = [
		['z^2+1', 'z', '-z'],
		['z^2+1', 'z+1', '(1-z)/2'],
		['z^2+1', '2', '1/2'],
		['z^4+1', 'z', '-z^3'],
		['z^2-2', 'z', 'z/2'],
	] as const;

	it.each(cases)('inverts %s modulo %s', (modulus, value, inverse) => {
		const ring = new ResiduePolynomialRing(Expression.create(modulus), 'z');
		const result = ring.invert(Expression.create(value));
		expect(result).toBeDefined();
		if (result) {
			const difference = result.minus(Expression.create(inverse)).expand();
			expect(new Polynomial(difference, ['z']).toArray(false, 'z')
				.every(coefficient => coefficient.isZero())).toBe(true);
			expect(ring.reduce(Expression.create(value).times(result)).eq(Expression.create('1')))
				.toBe(true);
		}
	});

	it('preserves lower-degree representatives and reduces higher powers', () => {
		const ring = new ResiduePolynomialRing(Expression.create('z^4+1'), 'z');
		expect(ring.reduce(Expression.create('2*z^3+z+1')).eq(
			Expression.create('2*z^3+z+1'))).toBe(true);
		expect(ring.reduce(Expression.create('z^5+2*z^4+z^3')).eq(
			Expression.create('-z-2+z^3'))).toBe(true);
	});

	it('returns no inverse for a zero divisor', () => {
		const ring = new ResiduePolynomialRing(Expression.create('z^2-1'), 'z');
		expect(ring.invert(Expression.create('z-1'))).toBeUndefined();
	});

	it('distinguishes units from zero divisors in a reducible quartic ring', () => {
		const ring = new ResiduePolynomialRing(Expression.create('(z^2+1)*(z^2+2)'), 'z');
		const unit = Expression.create('z');
		const inverse = ring.invert(unit);
		expect(inverse).toBeDefined();
		if (inverse !== undefined) {
			expect(ring.reduce(unit.times(inverse)).minus(Expression.create('1')).expand().isZero())
				.toBe(true);
		}
		expect(ring.invert(Expression.create('z^2+1'))).toBeUndefined();
		expect(ring.invert(Expression.create('z^2+2'))).toBeUndefined();
	});

	it('rejects coefficients outside Q', () => {
		const ring = new ResiduePolynomialRing(Expression.create('z^2+1'), 'z');
		expect(() => ring.reduce(Expression.create('z+x'))).toThrow();
		expect(() => ring.reduce(Expression.create('z+1.5'))).toThrow();
	});
});
