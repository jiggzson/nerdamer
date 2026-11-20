import { message, UnexpectedInputError } from '../../src/core/errors';
import nerdamer from '../../src/index';

/** The text of source parsed with the given call values. */
function parse(source: string, values: Record<string, string> = {}): string {
	return nerdamer(source, values).toString();
}

/** The error for an omitted variable when the input has several. */
function ambiguous(expression: string): string {
	return message('ambiguousVariable', { expression });
}

// Without a variable, solve uses the input's only one, counted after substitution and across
// both sides of an equation, as diff and integrate do. The parser form used to require it.
describe('solve without a variable', () => {
	it.each([
		['solve(x^2-4)', '{2, -2}'],
		['solve(x^2=4)', '{2, -2}'],
		['solve(sin(t))', '{_n*pi}'],
	])('uses the only variable of %s', (source, expected) => {
		expect(parse(source)).toBe(expected);
	});

	// Both sides count, so y=y+x^2 has two variables although its residual has only x.
	it.each([
		['solve(x*y-1)', '-1+x*y'],
		['solve(y=x^2)', 'y=x^2'],
		['solve(y=y+x^2)', 'y=y+x^2'],
	])('throws for %s, which has several', (source, expression) => {
		expect(() => parse(source)).toThrow(UnexpectedInputError);
		expect(() => parse(source)).toThrow(ambiguous(expression));
	});

	it.each(['solve(5)', 'solve(5=3)'])('throws for %s, which has no variable', source => {
		expect(() => parse(source)).toThrow(message('noVariableInExpression'));
	});

	it('counts the variables after substitution', () => {
		expect(parse('solve(a*k-1)', { k: '2' })).toBe('{1/2}');
		expect(parse('solve(k^2-4,k)', { k: '2' })).toBe('{2, -2}');
	});

	it('follows the same rule in the JavaScript API', () => {
		expect(nerdamer.solve('x^2-4').toString()).toBe('{2, -2}');
		expect(() => nerdamer.solve('y=y+x^2')).toThrow(ambiguous('y=y+x^2'));
		expect(() => nerdamer.solve('4=4')).toThrow(message('noVariableInExpression'));
	});
});
