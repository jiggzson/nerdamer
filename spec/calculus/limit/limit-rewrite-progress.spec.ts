import '../../../src/index';
import { limit } from '../../../src/calculus/limit/limit';
import { Expression } from '../../../src/core/classes/expression/Expression';

describe('limit rewrite recursion progress', () => {
	it.each([
		['(x^2-1)/(x-1)', '1', '2'],
		['sin(x)/x', '0', '1'],
		['(x^2+x)/(x^2+1)', 'Infinity', '1'],
	])('preserves the result for %s at %s', (input, point, expected) => {
		expect(limit(input, 'x', point).text()).toEqual(Expression.create(expected).text());
	});

	it('retains the bounded unevaluated fallback on exhausted depth', () => {
		const result = limit('sin(1/x)', 'x', '0', 'both', 12);
		expect(result.isFunction('limit')).toBe(true);
		expect(result.getArguments()[0].eq('sin(1/x)')).toBe(true);
	});
});
