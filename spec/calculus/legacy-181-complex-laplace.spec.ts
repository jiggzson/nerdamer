import { Expression } from '../../src/core/classes/expression/Expression';
import { ilaplace } from '../../src/calculus/laplace/ilaplace';
import { laplace } from '../../src/calculus/laplace/laplace';
import '../../src/index';

describe('legacy #181 complex Laplace linearity', () => {
	// Laplace transforms are linear over complex constants.
	// NIST DLMF §1.14: https://dlmf.nist.gov/1.14
	it.each([
		['i', 'i/s'],
		['1+i', '(1+i)/s'],
		['i*t', 'i/s^2'],
		['(1+i)*t', '(1+i)/s^2'],
		['i*e^(-t)', 'i/(s+1)'],
		['(1+i)*sin(t)', '(1+i)/(s^2+1)'],
		['t+i*t', '(1+i)/s^2'],
	] as const)('transforms %s with complex coefficients', (input, expected) => {
		const actual = laplace(input, 't', 's');
		const reference = Expression.create(expected);
		expect(actual.hasFunction('laplace', true)).toBe(false);

		// Some equivalent reciprocal forms are not reduced by a direct
		// subtraction; independently compare regular numeric samples.
		for (const s of [1, 2, 3, 5]) {
			const result = actual.evaluate({ s });
			const target = reference.evaluate({ s });
			expect(result.minus(target).evaluate().isNearlyZero()).toBe(true);
		}
	});

	it.each([
		['i/s', 'i'],
		['(1+i)/s', '1+i'],
		['i/s^2', 'i*t'],
		['(1+i)/s^2', '(1+i)*t'],
		['i/(s+1)', 'i*e^(-t)'],
		['(1+i)/(s^2+1)', '(1+i)*sin(t)'],
	] as const)('inverts %s with complex coefficients', (input, expected) => {
		const actual = ilaplace(input, 's', 't');
		const reference = Expression.create(expected);
		expect(actual.hasFunction('ilaplace', true)).toBe(false);
		for (const t of [0, 1, 2, 3]) {
			const result = actual.evaluate({ t });
			const target = reference.evaluate({ t });
			expect(result.minus(target).evaluate().isNearlyZero()).toBe(true);
		}
	});
});
