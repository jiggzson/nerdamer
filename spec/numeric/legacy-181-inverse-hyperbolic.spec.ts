import { Expression } from '../../src/core/classes/expression/Expression';
import { UndefinedError } from '../../src/core/errors';
import '../../src/index';

describe('legacy #181 inverse hyperbolic principal values', () => {
	// Reference: NIST DLMF §4.37(ii),(iv), https://dlmf.nist.gov/4.37
	const values = [
		['asinh(0)', '0'],
		['asinh(1)', 'log(1+sqrt(2))'],
		['asinh(-1)', '-log(1+sqrt(2))'],
		['asinh(i/2)', 'i*pi/6'],
		['asinh(-i/2)', '-i*pi/6'],
		['acosh(1)', '0'],
		['acosh(2)', 'log(2+sqrt(3))'],
		['acosh(0)', 'i*pi/2'],
		['acosh(i)', 'log(1+sqrt(2))+i*pi/2'],
		['acosh(-i)', 'log(1+sqrt(2))-i*pi/2'],
		['atanh(0)', '0'],
		['atanh(1/2)', 'log(3)/2'],
		['atanh(-1/2)', '-log(3)/2'],
		['atanh(i)', 'i*pi/4'],
		['atanh(-i)', '-i*pi/4'],
	] as const;

	it.each(values)('evaluates %s on the principal branch', (input, expected) => {
		const actual = Expression.create(input).evaluate();
		const reference = Expression.create(expected).evaluate();
		expect(actual.minus(reference).evaluate().isNearlyZero()).toBe(true);
	});

	// The branch points ±1 cannot be assigned a finite inverse tangent value.
	it.each(['atanh(1)', 'atanh(-1)'])('rejects the singularity %s', input => {
		expect(() => Expression.create(input).evaluate()).toThrow(UndefinedError);
	});

	// Inverse compositions away from cuts must reproduce the complex argument.
	it.each(['1+i', '1-i', '-1+i', '-1-i'])('preserves inverse compositions for %s', value => {
		for (const [inverse, forward] of [
			['asinh', 'sinh'],
			['acosh', 'cosh'],
			['atanh', 'tanh'],
		] as const) {
			const actual = Expression.create(`${forward}(${inverse}(${value}))`).evaluate();
			const expected = Expression.create(value).evaluate();
			expect(actual.minus(expected).evaluate().isNearlyZero()).toBe(true);
		}
	});
});
