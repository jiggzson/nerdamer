import { diff } from '../../../src/calculus/derivative/diff';
import { integrate } from '../../../src/calculus/integrate/integrate';
import { Expression } from '../../../src/core/classes/expression/Expression';
import nerdamer from '../../../src/index';

describe('Gaussian exponential integration', () => {
	it('returns the exact erf antiderivative of e^(-x^2)', () => {
		const result = integrate('e^(-x^2)', 'x');
		expect(result.eq('sqrt(pi)*erf(x)/2')).toBe(true);
		expect(nerdamer('integrate(e^(-x^2),x)').eq(result)).toBe(true);
	});

	it.each(['e^(-x^2)', 'e^(-2*x^2)', '3*e^(-4*x^2)'])(
		'differentiates the Gaussian antiderivative back to %s',
		source => {
			const result = integrate(source, 'x');
			expect(result.hasFunction('erf', true)).toBe(true);
			expect(result.hasFunction('integrate', true)).toBe(false);

			const derivative = diff(result, 'x');
			for (const x of [-1.2, -0.3, 0, 0.3, 1.2]) {
				const actual = Number(derivative.evaluate({ x }).text({ decimal: true }));
				const expected = Number(Expression.create(source).evaluate({ x }).text({ decimal: true }));
				expect(Number.isFinite(actual)).toBe(true);
				expect(actual).toBeCloseTo(expected, 8);
			}
		}
	);

	it('does not invent a real erf primitive for a positive or unknown quadratic rate', () => {
		expect(integrate('e^(x^2)', 'x').hasFunction('integrate', true)).toBe(true);
		expect(integrate('e^(-a*x^2)', 'x').hasFunction('integrate', true)).toBe(true);
	});
});
