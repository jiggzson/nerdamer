import { logRootDerivative } from '../../../src/calculus/integrate/algorithms/residueArithmetic';
import { Expression } from '../../../src/core/classes/expression/Expression';
import { toCommonDenominator } from '../../../src/core/functions/rationalNormalization';

describe('Exact logarithmic root-sum derivative', () => {
	it.each([
		['1+4*z^2', 'x+2*z', '1/(x^2+1)'],
		['1+16*z^2', 'x^2+4*z', 'x/(x^4+1)'],
		['z^2+1', 'x', '0'],
		['z^2+1', 'x*(1+z)', '0'],
		['z^2-z-1', 'x+z^2', '(x-1)/(x^2+3*x+1)'],
		['z^2-z-1', 'x+z^4', '(x-4)/(x^2+7*x+1)'],
		['z^2+1', 'x+z^2', '0'],
		['z^3-z-1', 'x+z^3', '(1-2*x)/(x^3+3*x^2+2*x+1)'],
	] as const)('takes the exact trace for %s with argument %s',
		(modulus, argument, expected) => {
			const derivative = logRootDerivative(
				Expression.create(modulus), Expression.create(argument), 'z', 'x'
			);
			expect(derivative).toBeDefined();
			if (derivative !== undefined) {
				const difference = toCommonDenominator(
					derivative.minus(Expression.create(expected))
				);
				expect(difference.getNumerator().expand().isZero()).toBe(true);
			}
		});

	it.each([
		['z^3-z-1', 'x+z^3', 'x+z+1'],
		['z^3-z-1', 'x+z^4-z^2', 'x+z'],
		['z^4+z+1', 'x+z^4', 'x-z-1'],
	] as const)('reduces higher residue powers exactly for %s and %s',
		(modulus, argument, reduced) => {
			const modulusExpression = Expression.create(modulus);
			const derivative = logRootDerivative(
				modulusExpression, Expression.create(argument), 'z', 'x'
			);
			const expected = logRootDerivative(
				modulusExpression, Expression.create(reduced), 'z', 'x'
			);
			expect(derivative).toBeDefined();
			expect(expected).toBeDefined();
			if (derivative !== undefined && expected !== undefined) {
				const residual = toCommonDenominator(derivative.minus(expected));
				expect(residual.getNumerator().expand().isZero()).toBe(true);
			}
		});

	it.each([
		['(z-1)^2', 'x+z'],
		['z^2+1', '0'],
		['z^2+1', 'z^2+1'],
	] as const)('declines repeated roots or identically zero arguments for %s and %s',
		(modulus, argument) => {
			expect(logRootDerivative(
				Expression.create(modulus).expand(),
				Expression.create(argument).expand(),
				'z', 'x'
			)).toBeUndefined();
		});

	it('declines arguments that remain nonlinear after residue reduction', () => {
		expect(logRootDerivative(
			Expression.create('z^3+2'),
			Expression.create('x+z^2'),
			'z',
			'x'
		)).toBeUndefined();
	});
});
