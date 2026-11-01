import { Expression } from '../../src/core/classes/expression/Expression';
import { UndefinedError } from '../../src/core/errors';
import '../../src/index';

describe('legacy #181 complex logarithm and inverse trig branches', () => {
	// Principal values follow NIST DLMF §§4.2, 4.23.
	// https://dlmf.nist.gov/4.2 and https://dlmf.nist.gov/4.23
	const values = [
		['log(i)', 'pi*i/2'],
		['log(-i)', '-pi*i/2'],
		['log(-1)', 'pi*i'],
		['log(1+i)', 'log(2)/2+pi*i/4'],
		['log(1-i)', 'log(2)/2-pi*i/4'],
		['log(-1+i)', 'log(2)/2+3*pi*i/4'],
		['log(-1-i)', 'log(2)/2-3*pi*i/4'],
		['asin(i)', 'i*log(1+sqrt(2))'],
		['asin(-i)', '-i*log(1+sqrt(2))'],
		['acos(i)', 'pi/2-i*log(1+sqrt(2))'],
		['acos(-i)', 'pi/2+i*log(1+sqrt(2))'],
		['asin(2)', 'pi/2-i*log(2+sqrt(3))'],
		['asin(-2)', '-pi/2+i*log(2+sqrt(3))'],
		['atan(2*i)', 'pi/2+i*log(3)/2'],
		['atan(-2*i)', '-pi/2-i*log(3)/2'],
		['atan(1+i)', 'atan(1/2)/2+pi/4+i*log(5)/4'],
	] as const;

	it.each(values)('evaluates principal value of %s', (input, expected) => {
		const actual = Expression.create(input).evaluate();
		const reference = Expression.create(expected).evaluate();
		expect(actual.minus(reference).evaluate().isNearlyZero()).toBe(true);
	});

	// The imaginary-axis cut must preserve atan(-z) = -atan(z).
	it.each(['2', '3', '1/2'])('preserves odd symmetry at ±%s*i', value => {
		const positive = Expression.create(`atan(${value}*i)`).evaluate();
		const negative = Expression.create(`atan(-(${value})*i)`).evaluate();
		expect(positive.plus(negative).evaluate().isNearlyZero()).toBe(true);
	});

	// The two logarithmic singularities have no finite principal value.
	it.each(['atan(i)', 'atan(-i)'])('rejects the singularity %s', input => {
		expect(() => Expression.create(input).evaluate()).toThrow(UndefinedError);
	});
});
