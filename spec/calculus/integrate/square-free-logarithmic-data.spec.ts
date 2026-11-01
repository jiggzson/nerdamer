import { squareFreeLogarithmicData } from '../../../src/calculus/integrate/algorithms/algebraicResidues';
import { Expression } from '../../../src/core/classes/expression/Expression';
import { Polynomial } from '../../../src/core/classes/polynomial/Polynomial';

describe('Square-free logarithmic residue data', () => {
	const cases = [
		['1', 'x+1', '1-z'],
		['1', 'x^2+1', '1+4*z^2'],
		['2*x', 'x^2+1', '4*(1-z)^2'],
		['3*x^2', 'x^3-1', '27*(1-z)^3'],
		['1', 'x^4+1', '1+256*z^4'],
		['x', 'x^4+1', '(1+16*z^2)^2'],
		['1', 'x^5+1', '(1-5*z)*(625*z^4+125*z^3+25*z^2+5*z+1)'],
		['12*x+8*x^3', 'x^4+3*x^2+2', '32*(z-2)^4'],
	] as const;

	it.each(cases)('returns exact residues for %s / (%s)', (numerator, denominator, expected) => {
		const result = squareFreeLogarithmicData(
			Expression.create(numerator), Expression.create(denominator), 'x'
		);
		expect(result.type).toBe('residues');
		if (result.type === 'residues') {
			const difference = result.residuePolynomial.minus(Expression.create(expected)).expand();
			expect(new Polynomial(difference, ['z']).toArray(false, 'z')
				.every(coefficient => coefficient.isZero())).toBe(true);
			expect(result.denominatorDerivative.eq(new Polynomial(result.denominator, ['x'])
				.diff('x').getExpression())).toBe(true);
		}
	});

	it('declines repeated factors and unsupported domains', () => {
		const cases = [
			['1', '(x+1)^2'],
			['1', 'x^2+sqrt(5)'],
			['1', 'x^2+1.5'],
			['x^3', 'x+1'],
		];
		for (const [p, q] of cases) {
			expect(squareFreeLogarithmicData(Expression.create(p), Expression.create(q), 'x').type)
				.toBe('unsupported');
		}
	});

	it('rejects collision with the residue variable', () => {
		expect(squareFreeLogarithmicData(Expression.create('z'), Expression.create('x+1'), 'x').type)
			.toBe('unsupported');
	});
});
