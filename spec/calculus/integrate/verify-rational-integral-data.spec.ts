import { rationalIntegralData } from '../../../src/calculus/integrate/algorithms/rationalIntegration';
import { verifyIntegralData } from '../../../src/calculus/integrate/algorithms/rationalIntegration';
import { Expression } from '../../../src/core/classes/expression/Expression';

describe('Complete rational integral verification', () => {
	const cases = [
		['1', 'x^2+1', '1+4*z^2'],
		['1', 'x^4+1', '1+256*z^4'],
		['1', '(x^2+1)^2', '1+16*z^2'],
		['2*x', 'x^2+1', 'z-1'],
		['x', 'x^4+1', '1+16*z^2'],
	] as const;

	it.each(cases)('verifies Hermite and logarithmic parts for %s/(%s)', (top, bottom, factor) => {
		const numerator = Expression.create(top);
		const denominator = Expression.create(bottom).expand();
		const result = rationalIntegralData(numerator, denominator, 'x', [Expression.create(factor)]);
		expect(result.type).toBe('assembled');
		expect(verifyIntegralData(result, numerator, denominator, 'x')).toBe(true);
	});

	it('verifies a rational derivative without a logarithmic contribution', () => {
		const numerator = Expression.create('-1');
		const denominator = Expression.create('x^2');
		const result = rationalIntegralData(numerator, denominator, 'x', []);
		expect(result.type).toBe('assembled');
		expect(verifyIntegralData(result, numerator, denominator, 'x')).toBe(true);
	});

	it('rejects a different integrand or rational part', () => {
		const numerator = Expression.create('1');
		const denominator = Expression.create('(x^2+1)^2').expand();
		const result = rationalIntegralData(numerator, denominator, 'x', [Expression.create('1+16*z^2')]);
		expect(result.type).toBe('assembled');
		expect(verifyIntegralData(result, Expression.create('2'), denominator, 'x')).toBe(false);
		if (result.type === 'assembled') {
			expect(verifyIntegralData({
				...result, rationalPart: result.rationalPart.plus(1),
			}, numerator, denominator, 'x')).toBe(false);
		}
	});
});
