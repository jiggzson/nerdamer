import { verifyIntegralData } from '../../../src/calculus/integrate/algorithms/rationalIntegration';
import { rationalIntegralData } from '../../../src/calculus/integrate/algorithms/rationalIntegration';
import { ResiduePolynomialRing } from '../../../src/calculus/integrate/algorithms/residueArithmetic';
import { Expression } from '../../../src/core/classes/expression/Expression';
import { Polynomial } from '../../../src/core/classes/polynomial/Polynomial';

describe('Structured rational integral data', () => {
	const cases = [
		['1', 'x^2+1', '1+4*z^2', 'x+2*z'],
		['1', 'x^4+1', '1+256*z^4', 'x+4*z'],
	] as const;

	it.each(cases)('assembles algebraic terms for %s / (%s)', (top, bottom, factor, expected) => {
		const result = rationalIntegralData(Expression.create(top), Expression.create(bottom),
			'x', [Expression.create(factor)]);
		expect(result.type).toBe('assembled');
		if (result.type === 'assembled') {
			expect(result.logarithmicTerms).toHaveLength(1);
			const term = result.logarithmicTerms[0];
			const ring = new ResiduePolynomialRing(term.residuePolynomial, result.residueVariable);
			const difference = term.argument.minus(Expression.create(expected)).expand();
			expect(new Polynomial(difference, ['x']).toArray(false, 'x')
				.every(coefficient => ring.reduce(coefficient).isZero())).toBe(true);
		}
	});

	it.each([
		['1', 'x^2+1'],
		['1', 'x^4+1'],
		['2*x', 'x^2+1'],
		['x', 'x^4+1'],
		['1', '(x^2+1)^2'],
		['12*x+8*x^3', 'x^4+3*x^2+2'],
	] as const)('automatically determines residues for %s / (%s)', (top, bottom) => {
		const numerator = Expression.create(top).expand();
		const denominator = Expression.create(bottom).expand();
		const result = rationalIntegralData(numerator, denominator, 'x');
		expect(result.type).toBe('assembled');
		expect(verifyIntegralData(result, numerator, denominator, 'x')).toBe(true);
	});

	it.each([
		['x^6+1', 6, 2],
		['x^10+1', 10, 2],
	] as const)('assembles algebraic residues for 1/(%s) without stalled polynomial division',
		(bottom, maxDegree, expectedTerms) => {
			const numerator = Expression.create('1');
			const denominator = Expression.create(bottom);
			const result = rationalIntegralData(numerator, denominator, 'x', undefined, 'z', maxDegree);
			expect(result.type).toBe('assembled');
			if (result.type === 'assembled') {
				expect(result.logarithmicTerms).toHaveLength(expectedTerms);
				expect(verifyIntegralData(result, numerator, denominator, 'x')).toBe(true);
			}
		}, 15000);

	it.each([
		['x+1', '(x^2+1)*(x^2+2)', 2],
		['x^2+2', '(x^2+x+1)*(x^2+2*x+3)', 2],
		['x^3+2*x+1', '(x^2+1)^2*(x^2+2)', 2],
		['x^3+x+1', '(x^2+1)*(x^2+2)*(x^2+3)', 3],
	] as const)('assembles mixed algebraic residues for %s / (%s)',
		(top, bottom, expectedTerms) => {
			const numerator = Expression.create(top).expand();
			const denominator = Expression.create(bottom).expand();
			const result = rationalIntegralData(numerator, denominator, 'x');
			expect(result.type).toBe('assembled');
			if (result.type === 'assembled') {
				expect(result.logarithmicTerms).toHaveLength(expectedTerms);
				expect(verifyIntegralData(result, numerator, denominator, 'x')).toBe(true);
			}
		}, 15000);

	it('assembles an irreducible cubic with a nontrivial numerator', () => {
		const numerator = Expression.create('x^2+2*x+3');
		const denominator = Expression.create('x^3-x-1');
		const result = rationalIntegralData(numerator, denominator, 'x');
		expect(result.type).toBe('assembled');
		if (result.type === 'assembled') {
			expect(result.logarithmicTerms).toHaveLength(1);
			expect(verifyIntegralData(result, numerator, denominator, 'x')).toBe(true);
		}
	});

	it.each([
		['x^3+2*x+1', 'x^4+x+1', 1],
		['x^3+x+1', 'x^5-x+1', 1],
		['x^3+2*x^2+x+1', '(x^3-x-1)*(x^2+1)', 2],
		['x^3+x+2', '(x^2+x+1)^2', 1],
	] as const)('verifies higher-degree and repeated rational integrals for %s / (%s)',
		(top, bottom, expectedTerms) => {
			const numerator = Expression.create(top).expand();
			const denominator = Expression.create(bottom).expand();
			const result = rationalIntegralData(numerator, denominator, 'x');
			expect(result.type).toBe('assembled');
			if (result.type === 'assembled') {
				expect(result.logarithmicTerms).toHaveLength(expectedTerms);
				expect(verifyIntegralData(result, numerator, denominator, 'x')).toBe(true);
			}
		}, 15000);

	it('does not accept an incomplete or incorrect residue factorization', () => {
		const numerator = Expression.create('1');
		const denominator = Expression.create('x^2+1');
		expect(rationalIntegralData(numerator, denominator, 'x', []).type).toBe('unsupported');
		expect(rationalIntegralData(numerator, denominator, 'x', [Expression.create('z-1')]).type)
			.toBe('unsupported');
	});

	it('assembles repeated rational residues using the full polynomial argument', () => {
		const result = rationalIntegralData(Expression.create('2*x'),
			Expression.create('x^2+1'), 'x', [Expression.create('z-1')]);
		expect(result.type).toBe('assembled');
		if (result.type === 'assembled') {
			expect(result.logarithmicTerms).toHaveLength(1);
			expect(result.logarithmicTerms[0].argument.eq(Expression.create('x^2+1'))).toBe(true);
		}
	});

	it('assembles repeated algebraic residues without duplicating their roots', () => {
		const result = rationalIntegralData(Expression.create('x'),
			Expression.create('x^4+1'), 'x', [Expression.create('1+16*z^2')]);
		expect(result.type).toBe('assembled');
		if (result.type === 'assembled') {
			expect(result.logarithmicTerms).toHaveLength(1);
			const ring = new ResiduePolynomialRing(result.logarithmicTerms[0].residuePolynomial, 'z');
			const difference = result.logarithmicTerms[0].argument
				.minus(Expression.create('x^2+4*z')).expand();
			expect(new Polynomial(difference, ['x']).toArray(false, 'x')
				.every(coefficient => ring.reduce(coefficient).isZero())).toBe(true);
		}
	});

	it('assembles a purely rational derivative without logarithms', () => {
		const result = rationalIntegralData(Expression.create('-1'), Expression.create('x^2'),
			'x', []);
		expect(result.type).toBe('assembled');
		if (result.type === 'assembled') {
			expect(result.logarithmicTerms).toHaveLength(0);
		}
	});
});
