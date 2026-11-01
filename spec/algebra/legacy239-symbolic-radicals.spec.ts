import '../helpers/registerNerdamerFunctions';
import { Expression } from '../../src/core/classes/expression/Expression';
import { simplify } from '../../src/algebra/simplify/simplify';

// Historical Nerdamer issue #239: the requested forms assume nonnegative variables.
// Negative real inputs expose different principal-square-root branches.
describe('Legacy #239 symbolic radical domains', () => {
	it.each([
		['x^2*sqrt(x^3)', 'x^(7/2)', { x: -1 }],
		['sqrt(3*a^3)*sqrt(6*a^5)', '3*a^4*sqrt(2)', { a: -1 }],
		[
			'(sqrt(3*x)-sqrt(32*y))*(sqrt(3*x)-sqrt(2*y))',
			'3*x-5*sqrt(6*x*y)+8*y',
			{ x: -1, y: -1 },
		],
	])('does not equate %s with %s for negative inputs', (input, rewritten, values) => {
		expect(simplify(input).text()).not.toEqual(Expression.create(rewritten).text());
		const difference = Expression.create(`(${input})-(${rewritten})`, values).evaluate();
		expect(difference.isNearlyZero()).toBe(false);
	});
});
