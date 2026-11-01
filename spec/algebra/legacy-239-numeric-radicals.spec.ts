import '../helpers/registerNerdamerFunctions';
import { simplify } from '../../src/algebra/simplify/simplify';
import { Expression } from '../../src/core/classes/expression/Expression';

// Regression: https://github.com/jiggzson/nerdamer/issues/239
describe('Legacy #239 numeric radical simplification', () => {
	it.each([
		['4*sqrt(24)', '8*sqrt(6)'],
		['sqrt(128/49)', '8*sqrt(2)/7'],
		['sqrt(360)/sqrt(162)', '2*sqrt(5)/3'],
		['3*sqrt(6)+5*sqrt(6)-7*sqrt(6)', 'sqrt(6)'],
		['sqrt(252)-sqrt(28)', '4*sqrt(7)'],
		['sqrt(72)-sqrt(288)+sqrt(576)', '24-6*sqrt(2)'],
		['3*sqrt(2)*2*sqrt(6)', '12*sqrt(3)'],
		['sqrt(125)*sqrt(18)', '15*sqrt(10)'],
		['sqrt(24)*(sqrt(12)+sqrt(18))', '12*sqrt(2)+12*sqrt(3)'],
		['(sqrt(7)+3*sqrt(2))*(sqrt(7)-3*sqrt(2))', '-11'],
		['(3*sqrt(5)-5*sqrt(2))^2', '95-30*sqrt(10)'],
	])('reduces %s to %s', (input, expected) => {
		const actual = simplify(input);
		const wanted = simplify(expected);
		expect(actual.eq(wanted)).toBe(true);
		expect(actual.minus(Expression.create(input)).evaluate().isNearlyZero()).toBe(true);
	});
});
