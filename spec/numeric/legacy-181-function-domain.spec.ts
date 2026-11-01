import { Expression } from '../../src/core/classes/expression/Expression';
import nerdamer from '../../src/index';

describe('legacy #181 domain-sensitive complex functions', () => {
	// sinc(z)=sin(z)/z, extended continuously at zero; imaginary-axis values
	// are real because sin(i*y)=i*sinh(y).
	it.each([
		['sinc(i)', 'sinh(1)'],
		['sinc(-i)', 'sinh(1)'],
		['sinc(0)', '1'],
	] as const)('preserves %s identity', (input, expected) => {
		const actual = nerdamer(input);
		expect(Expression.isExpression(actual)).toBe(true);
		if (Expression.isExpression(actual)) {
			expect(actual.minus(Expression.create(expected)).evaluate().isNearlyZero()).toBe(true);
		}
	});

	it.each([
		['step(i)', 'step(i)'],
		['step(1+i)', 'step(1+i)'],
		['fib(i)', 'fib(i)'],
	] as const)('does not invent a value for %s', (input, expected) => {
		expect(nerdamer(input).text()).toBe(expected);
	});

	it('rejects complex prime factorization outside the integer domain', () => {
		expect(() => nerdamer('pfactor(i)')).toThrow();
		expect(nerdamer('pfactor(12)').text()).toBe('[2, 2, 3]');
	});

	it.each([
		['tri(i)', '0'],
		['tri(i/2)', '1/2'],
		['tri(1+i)', '0'],
	] as const)('applies the radial triangular pulse to %s', (input, expected) => {
		const actual = nerdamer(input);
		expect(Expression.isExpression(actual)).toBe(true);
		if (Expression.isExpression(actual)) {
			expect(actual.minus(Expression.create(expected)).evaluate().isNearlyZero()).toBe(true);
		}
	});

	// Gaussian-integer remainder uses componentwise nearest-even quotient rounding.
	// In the first two cases both quotient components equal 1/2, so both round to zero.
	it.each([
		['mod(i,1+i)', 'i'],
		['mod(1+i,2)', '1+i'],
		['mod(5+3*i,2+i)', '-1'],
		['mod(7,3)', '1'],
	] as const)('preserves modulo semantics for %s', (input, expected) => {
		const actual = nerdamer(input);
		expect(Expression.isExpression(actual)).toBe(true);
		if (Expression.isExpression(actual)) {
			expect(actual.minus(Expression.create(expected)).evaluate().isNearlyZero()).toBe(true);
		}
	});

	it('does not assign a Gaussian-integer remainder to fractional complex inputs', () => {
		expect(nerdamer('mod(i/2,1+i)').text()).toContain('mod(');
	});
});
