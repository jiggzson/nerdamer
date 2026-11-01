import { Expression } from '../../src/core/classes/expression/Expression';
import '../../src/index';

describe('legacy #181 complex modulus and absolute-value idempotence', () => {
	// |z|² = Re(z)² + Im(z)²; |zw| = |z||w|.
	// Reference: NIST DLMF §1.9, https://dlmf.nist.gov/1.9
	it.each([
		['0', '0'],
		['i', '1'],
		['-i', '1'],
		['3+4*i', '5'],
		['-3+4*i', '5'],
		['-3-4*i', '5'],
		['3-4*i', '5'],
		['3/5+4*i/5', '1'],
		['1+i', 'sqrt(2)'],
	] as const)('computes modulus and squared-component identity for %s', (input, expected) => {
		const z = Expression.create(input);
		const magnitude = Expression.create(`abs(${input})`).evaluate();
		const expectedMagnitude = Expression.create(expected).evaluate();
		expect(magnitude.minus(expectedMagnitude).evaluate().isNearlyZero()).toBe(true);
		const components = z.realPart().sq().plus(z.imagPart().sq()).evaluate();
		expect(magnitude.sq().minus(components).evaluate().isNearlyZero()).toBe(true);
	});

	it.each([
		['3+4*i', '5+12*i'],
		['1+i', '1-i'],
		['-2+i', '3-2*i'],
		['i/2', '-3*i'],
	] as const)('preserves multiplicative modulus for %s and %s', (left, right) => {
		const product = Expression.create(left).times(Expression.create(right));
		const actual = Expression.create(`abs(${product.text()})`).evaluate();
		const expected = Expression.create(`abs(${left})*abs(${right})`).evaluate();
		expect(actual.minus(expected).evaluate().isNearlyZero()).toBe(true);
	});

	// | |x| | = |x| for any complex or real x, without sign assumptions.
	it.each([
		['abs(abs(x))', 'abs(x)'],
		['abs(abs(x+i))', 'abs(x+i)'],
		['abs(i*x)', 'abs(x)'],
		['abs(-i*x)', 'abs(x)'],
	] as const)('does not retain a redundant outer abs in %s', (input, expected) => {
		expect(Expression.create(input).text()).toEqual(Expression.create(expected).text());
	});
});
