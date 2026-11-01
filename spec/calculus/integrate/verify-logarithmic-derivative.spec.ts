import { rationalIntegralData } from '../../../src/calculus/integrate/algorithms/rationalIntegration';
import { verifyLogarithmicDerivative } from '../../../src/calculus/integrate/algorithms/rationalIntegration';
import { Expression } from '../../../src/core/classes/expression/Expression';

describe('Exact logarithmic derivative traces', () => {
	const cases = [
		['1', 'x^2+1', '1+4*z^2'],
		['1', 'x^4+1', '1+256*z^4'],
	] as const;

	it.each(cases)('verifies the formal logarithmic derivative for %s/(%s)',
		(top, bottom, factor) => {
			const numerator = Expression.create(top);
			const denominator = Expression.create(bottom);
			const result = rationalIntegralData(numerator, denominator, 'x', [Expression.create(factor)]);
			expect(result.type).toBe('assembled');
			expect(verifyLogarithmicDerivative(result, numerator, denominator, 'x')).toBe(true);
		}
	);

	it('rejects missing and duplicated terms in a mixed algebraic result', () => {
		const numerator = Expression.create('x+1');
		const denominator = Expression.create('(x^2+1)*(x^2+2)').expand();
		const result = rationalIntegralData(numerator, denominator, 'x');
		expect(result.type).toBe('assembled');
		if (result.type === 'assembled') {
			expect(result.logarithmicTerms).toHaveLength(2);
			expect(verifyLogarithmicDerivative(result, numerator, denominator, 'x')).toBe(true);
			const missing = { ...result, logarithmicTerms: result.logarithmicTerms.slice(0, 1) };
			const duplicated = {
				...result,
				logarithmicTerms: [...result.logarithmicTerms, result.logarithmicTerms[0]],
			};
			expect(verifyLogarithmicDerivative(missing, numerator, denominator, 'x')).toBe(false);
			expect(verifyLogarithmicDerivative(duplicated, numerator, denominator, 'x')).toBe(false);
		}
	});

	it('rejects an incorrect numerator and an incorrect logarithmic argument', () => {
		const numerator = Expression.create('1');
		const denominator = Expression.create('x^2+1');
		const result = rationalIntegralData(numerator, denominator, 'x', [Expression.create('1+4*z^2')]);
		expect(result.type).toBe('assembled');
		expect(verifyLogarithmicDerivative(result, Expression.create('2'), denominator, 'x')).toBe(false);
		if (result.type === 'assembled') {
			const altered = {
				...result,
				logarithmicTerms: [{
					residuePolynomial: result.logarithmicTerms[0].residuePolynomial,
					argument: Expression.create('x+z'),
				}],
			};
			expect(verifyLogarithmicDerivative(altered, numerator, denominator, 'x')).toBe(false);
		}
	});
});
