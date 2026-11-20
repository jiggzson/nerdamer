import { diff } from '../../src/api/calculus';
import { message, UnexpectedInputError } from '../../src/core/errors';
import nerdamer from '../../src/index';

/** The text of source parsed with the given call values. */
function parse(source: string, values: Record<string, string> = {}): string {
	return nerdamer(source, values).text();
}

/** The error for an omitted variable when the input has several. */
function ambiguous(expression: string): string {
	return message('ambiguousVariable', { expression });
}

// Without a variable, diff and integrate use the input's only variable, counted after
// substitution across all of it: both sides of an equation and every element of a vector or
// matrix. Choosing among several would be a guess that depends on input order.
describe('diff and integrate without a variable', () => {
	it.each([
		['diff(x^2)', '2*x'],
		['diff(x^2=4)', '2*x=0'],
		['diff([x,x^2])', '[1, 2*x]'],
		['diff([[x,x^2],[1,x^3]])', '[[1, 2*x], [0, 3*x^2]]'],
		['integrate([x,x^2])', '[(1/2)*x^2, (1/3)*x^3]'],
		['integrate(x^2=4)', '(1/3)*x^3=4*x'],
	])('uses the only variable of %s', (source, expected) => {
		expect(parse(source)).toBe(expected);
	});

	it.each([
		['diff(a*x)', 'a*x'],
		['diff(y=x^2)', 'y=x^2'],
		['diff([x^2,y])', '[x^2, y]'],
		['integrate([x^2,y])', '[x^2, y]'],
	])('throws for %s, which has several', (source, expression) => {
		expect(() => parse(source)).toThrow(UnexpectedInputError);
		expect(() => parse(source)).toThrow(ambiguous(expression));
	});

	it('gives zero, or throws for integrate, when there is no variable', () => {
		expect(parse('diff(5)')).toBe('0');
		expect(parse('diff([1,2])')).toBe('[0, 0]');
		expect(() => parse('integrate([1,2])')).toThrow(message('noVariableInExpression'));
	});

	// Leaving out the variable binds nothing, so a value for a name applies first.
	it('counts the variables after substitution', () => {
		expect(parse('diff(a*k^2)', { k: '10' })).toBe('100');
		expect(parse('diff(k^2)', { k: '10' })).toBe('0');
		expect(parse('diff(k^2,k)', { k: '10' })).toBe('2*k');
	});
});

describe('the JavaScript API follows the parser', () => {
	it('infers and throws through the root functions', () => {
		expect(nerdamer.diff('[x,x^2]').text()).toBe('[1, 2*x]');
		expect(nerdamer.integrate('x^2').text()).toBe('(1/3)*x^3');
		expect(() => nerdamer.diff('x*y')).toThrow(ambiguous('x*y'));
		expect(() => nerdamer.diff('y=x^2')).toThrow(ambiguous('y=x^2'));
		expect(nerdamer.diff('x*y', 'y').text()).toBe('x');
	});

	it('takes vectors and equations whole in the instance methods', () => {
		expect(nerdamer('[x,x^2]').diff().text()).toBe('[1, 2*x]');
		expect(nerdamer('x^2=4').diff().text()).toBe('2*x=0');
		expect(() => nerdamer('[x^2,y]').diff()).toThrow(ambiguous('[x^2, y]'));
		expect(() => nerdamer('[x^2,y]').integrate()).toThrow(ambiguous('[x^2, y]'));
		expect(nerdamer('{x^2, x^3}').diff('x').text()).toBe('{2*x, 3*x^2}');
	});

	it('applies the rule to a single expression in the subpath export', () => {
		expect(diff('x^2').text()).toBe('2*x');
		expect(() => diff('x*y')).toThrow(ambiguous('x*y'));
	});

	it('requires a variable for an order, as parser syntax does', () => {
		expect(() => nerdamer.diff('x^3', undefined, 2)).toThrow(
			message('plainVariableExpected', { input: 'undefined' })
		);
		expect(nerdamer.diff('x^3', 'x', 2).text()).toBe('6*x');
	});
});
