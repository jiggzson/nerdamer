import { assume, clearAssumptions } from '../../src/core/classes/assumption/assume';
import nerdamer from '../../src/index';

describe('Noninteger powers of products', () => {
	afterEach(() => clearAssumptions());

	// (a*b)^(1/2) isn't a^(1/2)*b^(1/2) when a and b are both negative.
	it.each([
		['simplify(sqrt(a*b))', '(a*b)^(1/2)'],
		['expand(sqrt(a*b))', '(a*b)^(1/2)'],
		['factor(sqrt(a*b))', '(a*b)^(1/2)'],
		['simplify((a*b)^(1/3))', '(a*b)^(1/3)'],
		['sqrt(a*b)==sqrt(a)*sqrt(b)', '0'],
		// Positive numbers and even powers still come out.
		['simplify(sqrt(4*a))', '2*a^(1/2)'],
		['expand(sqrt(9*a*b))', '3*(a*b)^(1/2)'],
		['simplify(sqrt(a^2*b))', 'b^(1/2)*abs(a)'],
		['expand(sqrt(a^2*b))', 'b^(1/2)*abs(a)'],
		['simplify(sqrt(x*y)*sqrt(x*y))', 'y*x'],
	])('%s gives %s', (input, expected) => {
		expect(nerdamer(input).text()).toBe(expected);
	});

	it.each([
		'simplify(sqrt(a*b))',
		'expand(sqrt(a*b))',
		'factor(sqrt(a*b))',
		'simplify(sqrt(a/b))',
	])('%s keeps its value when a and b are negative', input => {
		const result = nerdamer(input).text();
		const values = { a: '-1', b: '-4' };
		const original = nerdamer(input.replace(/^\w+\((.*)\)$/, '$1'), values)
			.evaluate()
			.text();
		expect(nerdamer(result, values).evaluate().text()).toBe(original);
	});

	it('splits the root when the signs are known', () => {
		assume('a>0');
		assume('b>0');
		expect(nerdamer('expand(sqrt(a*b))').text()).toBe('a^(1/2)*b^(1/2)');
		expect(nerdamer('sqrt(a*b)==sqrt(a)*sqrt(b)').text()).toBe('1');
	});
});
