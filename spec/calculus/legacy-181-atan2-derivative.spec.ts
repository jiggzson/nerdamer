import { diff } from '../../src/calculus/derivative/diff';
import { Expression } from '../../src/core/classes/expression/Expression';
import { ATAN2 } from '../../src/core/classes/parser/constants';
import nerdamer from '../../src/index';

describe('legacy #181 derivative of complex logarithms and atan2', () => {
	// atan2(y,x)' = (x*y' - y*x')/(x^2+y^2) away from the origin.
	it.each([
		['1', 'x', '-1/(1+x^2)'],
		['x', '1', '1/(1+x^2)'],
		['x', '2*x+1', '1/(x^2+(2*x+1)^2)'],
	] as const)('differentiates atan2(%s,%s) using both arguments', (y, x, expected) => {
		const angle = Expression.toFunction(ATAN2, [Expression.create(y), Expression.create(x)]);
		const actual = diff(angle, 'x');
		const reference = Expression.create(expected);
		for (const value of [1, 2, 3]) {
			expect(actual.evaluate({ x: value }).minus(reference.evaluate({ x: value }))
				.evaluate().isNearlyZero()).toBe(true);
		}
	});

	it.each([
		['log(x+i)', '1/(x+i)'],
		['log(x+2*i)', '1/(x+2*i)'],
		['log(1+i*x)', 'i/(1+i*x)'],
	] as const)('differentiates parsed %s across complex components', (input, expected) => {
		const actual = diff(Expression.create(input), 'x');
		const reference = Expression.create(expected);
		for (const value of [1, 2, 3]) {
			expect(actual.evaluate({ x: value }).minus(reference.evaluate({ x: value }))
				.evaluate().isNearlyZero()).toBe(true);
		}
	});

	it('supports the public parser derivative of a complex logarithm', () => {
		const result = nerdamer('diff(log(x+i),x)');
		expect(Expression.isExpression(result)).toBe(true);
		if (Expression.isExpression(result)) {
			for (const x of [1, 2, 3]) {
				const expected = Expression.create('1/(x+i)').evaluate({ x });
				expect(result.evaluate({ x }).minus(expected).evaluate().isNearlyZero()).toBe(true);
			}
		}
	});
});
