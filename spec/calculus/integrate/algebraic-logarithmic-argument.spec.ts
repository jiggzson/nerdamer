import { algebraicLogarithmicArgument } from '../../../src/calculus/integrate/algorithms/algebraicResidues';
import { ResiduePolynomialRing } from '../../../src/calculus/integrate/algorithms/residueArithmetic';
import { squareFreeLogarithmicData } from '../../../src/calculus/integrate/algorithms/algebraicResidues';
import { Expression } from '../../../src/core/classes/expression/Expression';
import { Polynomial } from '../../../src/core/classes/polynomial/Polynomial';

describe('Algebraic logarithmic arguments', () => {
	const cases = [
		['1', 'x^2+1', '1+4*z^2', 'x+2*z'],
		['1', 'x^4+1', '1+256*z^4', 'x+4*z'],
		['x', 'x^4+1', '1+16*z^2', 'x^2+4*z'],
	] as const;

	it.each(cases)('finds argument for P=%s Q=%s modulo %s', (top, bottom, modulus, expected) => {
		const data = squareFreeLogarithmicData(Expression.create(top), Expression.create(bottom), 'x');
		const result = algebraicLogarithmicArgument(data, Expression.create(modulus), 'x');
		expect(result.type).toBe('argument');
		if (result.type === 'argument') {
			const ring = new ResiduePolynomialRing(Expression.create(modulus), 'z');
			const difference = result.polynomial.minus(Expression.create(expected)).expand();
			const coefficients = new Polynomial(difference, ['x']).toArray(false, 'x');
			expect(coefficients.every(coefficient => ring.reduce(coefficient).isZero())).toBe(true);
		}
	});

	it('returns the full denominator when P-z*Q prime vanishes in the residue ring', () => {
		const data = squareFreeLogarithmicData(Expression.create('2*x'),
			Expression.create('x^2+1'), 'x');
		const result = algebraicLogarithmicArgument(data, Expression.create('z-1'), 'x');
		expect(result.type).toBe('argument');
		if (result.type === 'argument') {
			expect(result.polynomial.eq(Expression.create('x^2+1'))).toBe(true);
		}
	});

	it('does not produce arguments over a modulus containing obstructing zero divisors', () => {
		const data = squareFreeLogarithmicData(Expression.create('x'), Expression.create('x^4+1'), 'x');
		const result = algebraicLogarithmicArgument(data, Expression.create('(1+16*z^2)*(z-1)'), 'x');
		expect(result.type).toBe('unsupported');
	});

	it('declines invalid residue moduli', () => {
		const data = squareFreeLogarithmicData(Expression.create('1'), Expression.create('x^2+1'), 'x');
		expect(algebraicLogarithmicArgument(data, Expression.create('z+1.5'), 'x').type)
			.toBe('unsupported');
	});
});
