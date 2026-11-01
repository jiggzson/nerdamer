import { diff } from '../../../src/calculus/derivative/diff';
import { integrate } from '../../../src/calculus/integrate/integrate';
import { Expression } from '../../../src/core/classes/expression/Expression';
import '../../../src/index';

describe('legacy #181 complex integration branch regressions', () => {
	// Verify the derivative of each returned primitive at regular real points.
	// These checks cover local identities, not global principal-branch continuation.
	it.each([
		['imaginary linear', 'i*x'],
		['complex polynomial', '(1+i)*x^2'],
		['imaginary exponential', 'e^(i*x)'],
		['complex exponential', 'e^((1+i)*x)'],
		['imaginary sine argument', 'sin(i*x)'],
		['imaginary cosine argument', 'cos(i*x)'],
		['upper shifted reciprocal', '1/(x+i)'],
		['lower shifted reciprocal', '1/(x-i)'],
		['complex scaled reciprocal', '(1+i)/(x+2)'],
	] as const)('integrates %s with a valid local derivative', (_name, input) => {
		const source = Expression.create(input);
		const primitive = integrate(source, 'x');
		expect(primitive.hasFunction('integrate', true)).toBe(false);

		const residual = diff(primitive, 'x').minus(source);
		for (const x of [0.25, 1, 2]) {
			expect(residual.evaluate({ x }).isNearlyZero()).toBe(true);
		}
	});
});
