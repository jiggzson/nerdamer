import nerdamer from '../../../src/index';
import { message, UnexpectedInputError } from '../../../src/core/errors';

/** The text of source parsed with the given call values. */
function parse(source: string, values: Record<string, string> = {}): string {
	return nerdamer(source, values).text();
}

// Without a variable, integrate used one named "undefined": integrate(x^2) gave x^2*undefined.
describe('integrate without a variable', () => {
	it.each([
		['integrate(x^2)', '(1/3)*x^3'],
		['integrate(sin(t))', '-cos(t)'],
		['integrate(e^x)', 'e^x'],
		['integrate(pi*x)', '(1/2)*x^2*pi'],
		['integrate(y=2*y)', '(1/2)*y^2=y^2'],
		['integrate(x^2=4)', '(1/3)*x^3=4*x'],
	])('integrates %s with respect to its only variable', (source, expected) => {
		expect(parse(source)).toBe(expected);
	});

	// Both sides of an equation count, so y=x^2 has two variables.
	it.each([
		['integrate(x*y)', 'x*y'],
		['integrate(a*x^2)', 'a*x^2'],
		['integrate(y=x^2)', 'y=x^2'],
	])('throws for %s, whose variable would be a guess', (source, expression) => {
		expect(() => parse(source)).toThrow(UnexpectedInputError);
		expect(() => parse(source)).toThrow(message('ambiguousVariable', { expression }));
	});

	it.each(['integrate(5)', 'integrate(pi)'])('throws for %s, which has no variable', source => {
		expect(() => parse(source)).toThrow(message('noVariableInExpression'));
	});

	it('integrates when the variable is given', () => {
		expect(parse('integrate(a*x^2,x)')).toBe('(1/3)*x^3*a');
		expect(parse('integrate(x*y)', { y: '2' })).toBe('x^2');
	});
});
