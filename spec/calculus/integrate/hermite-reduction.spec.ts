import { hermiteReduce } from '../../../src/calculus/integrate/algorithms/hermiteReduction';
import { Expression } from '../../../src/core/classes/expression/Expression';
import { Polynomial } from '../../../src/core/classes/polynomial/Polynomial';
import { divide } from '../../../src/core/classes/polynomial/utils';

describe('Hermite rational reduction over Q[x]', () => {
	const cases = [
		['1', 'x^2', 'repeated linear factor'],
		['3*x+2', '(x+1)^3', 'powered linear factor'],
		['x^2', '(x^2+1)^2', 'repeated irreducible quadratic'],
		['2*x+1', '(x^2+1)^3', 'higher quadratic multiplicity'],
		['x+2', '(x-1)^2*(x^2+1)^2', 'mixed repeated factors'],
		['1', 'x^5+1', 'square-free quintic'],
		['x^3+1', '(x^4+1)^2', 'degree-eight denominator'],
	] as const;

	it.each(cases)('%s / %s (%s)', (top, bottom) => {
		const numerator = Expression.create(top);
		const denominator = Expression.create(bottom).expand();
		const result = hermiteReduce(numerator, denominator, 'x');
		expect(result.type).toBe('reduced');
		if (result.type === 'reduced') {
			// Verify the polynomial identity without asking the expression
			// simplifier to cancel separately represented rational terms.
			const h = result.repeatedFactor;
			const a = result.rationalNumerator;
			const b = result.remainderNumerator;
			const squareFree = result.squareFreeDenominator;
			const hPrime = new Polynomial(h, ['x']).diff('x').getExpression();
			const aPrime = new Polynomial(a, ['x']).diff('x').getExpression();
			const denominatorCoefficients = new Polynomial(denominator, ['x']).toArray(false, 'x');
			const leading = denominatorCoefficients[denominatorCoefficients.length - 1];
			const normalizedNumerator = numerator.div(leading).expand();
			const identity = normalizedNumerator.times(h)
				.minus(squareFree.times(h.times(aPrime).minus(hPrime.times(a))))
				.minus(h.pow(2).times(b)).expand();
			expect(new Polynomial(identity, ['x']).toArray(false, 'x').every(coefficient => coefficient.isZero())).toBe(true);

			let gcdA = squareFree;
			let gcdB = new Polynomial(gcdA, ['x']).diff('x').getExpression();
			while (!gcdB.isZero()) {
				const [, rest] = divide(gcdA, gcdB, undefined, ['x']);
				gcdA = gcdB;
				gcdB = rest.expand();
			}
			expect(new Polynomial(gcdA, ['x']).deg('x')).toBe(0);
		}
	});

	it('declines non-rational coefficients', () => {
		expect(hermiteReduce(Expression.create('1'), Expression.create('x^2+sqrt(5)'), 'x').type)
			.toBe('unsupported');
	});

	it('declines improper rational input', () => {
		expect(hermiteReduce(Expression.create('x^3'), Expression.create('x+1'), 'x').type)
			.toBe('unsupported');
	});

	it('declines decimal coefficients', () => {
		expect(hermiteReduce(Expression.create('1'), Expression.create('x^2+1.5'), 'x').type)
			.toBe('unsupported');
	});
});
