import '../../src/index';
import { Expression } from '../../src/core/classes/expression/Expression';

describe('substitution through nested functions', () => {
	// Plain variable substitution must retain function structure and modifiers.
	it.each([
		['sin(x)', 'sin(y)'],
		['cos(sin(x))', 'cos(sin(y))'],
		['2*sin(x)^2', '2*sin(y)^2'],
		['exp(log(x))', 'e^log(y)'],
		['sin(asin(x))', 'y'],
	])('substitutes %s', (input, expected) => {
		expect(Expression.create(input).subst('x', 'y').eq(expected)).toBe(true);
	});
});
