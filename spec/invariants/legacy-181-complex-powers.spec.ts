import '../../src/index';
import { Expression } from '../../src/core/classes/expression/Expression';

describe('legacy #181 principal complex powers', () => {
	// Principal values use exp(exponent*Log(base)), with Arg(base) in (-pi, pi].
	// Reference: NIST DLMF §4.2, https://dlmf.nist.gov/4.2
	const cases = [
		['((-1)^2)^(1/2)', '1'],
		['((-1)^(1/2))^2', '-1'],
		['((1+i)^2)^(1/2)', '1+i'],
		['((1-i)^2)^(1/2)', '1-i'],
		['((-1+i)^2)^(1/2)', '1-i'],
		['((-1-i)^2)^(1/2)', '1+i'],
		['(i^2)^(1/2)', 'i'],
		['(i^(1/2))^2', 'i'],
		['(-1)^(-1/2)', '-i'],
		['log((-1)^2)', '0'],
	] as const;

	it.each(cases)('evaluates %s on the principal branch', (input, expected) => {
		const actual = Expression.create(input).evaluate();
		const reference = Expression.create(expected).evaluate();
		expect(actual.minus(reference).evaluate().isNearlyZero()).toBe(true);
	});

	// These identities fail on the principal branch. Comparing evaluated values
	// avoids mistaking two different symbolic representations for equal numbers.
	const invalidIdentities = [
		['((-1)*(-1))^(1/2)', '(-1)^(1/2)*(-1)^(1/2)'],
		['((-1)^2)^(1/2)', '(-1)^(2*(1/2))'],
		['log((-1)^2)', '2*log(-1)'],
	] as const;

	it.each(invalidIdentities)('does not equate %s with %s', (left, right) => {
		const difference = Expression.create(left).evaluate().minus(Expression.create(right).evaluate()).evaluate();
		expect(difference.isNearlyZero()).toBe(false);
	});
});
