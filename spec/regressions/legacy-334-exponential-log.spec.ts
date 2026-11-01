import '../helpers/registerNerdamerFunctions';
import { diff } from '../../src/calculus/derivative/diff';
import { integrate } from '../../src/calculus/integrate/integrate';
import { Expression } from '../../src/core/classes/expression/Expression';
import { LOG } from '../../src/core/classes/parser/constants';

describe('Historical issue #334 constant-base logarithmic exponents', () => {
	it.each(['2^log(x)', '3^log(x)'])('integrates %s on the positive real axis', source => {
		const input = Expression.create(source);
		expect(input.isEXP()).toBe(true);
		expect(input.getPower().isFunction(LOG)).toBe(true);
		const result = integrate(input, 'x');
		expect(result.hasFunction('integrate', true)).toBe(false);
		const derivative = diff(result, 'x');
		for (const x of [0.25, 0.5, 1, 2, 3]) {
			const actual = Number(derivative.evaluate({ x }).text({ decimal: true }));
			const expected = Number(input.evaluate({ x }).text({ decimal: true }));
			expect(Number.isFinite(actual)).toBe(true);
			expect(Number.isFinite(expected)).toBe(true);
			expect(actual).toBeCloseTo(expected, 8);
		}
	});
});
