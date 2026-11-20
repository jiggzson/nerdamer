import nerdamer from '../../src/index';

describe('Fractional powers of abs', () => {
	// abs(a)^(2/3) isn't a^(2/3) when a is negative: only an even integer power drops abs.
	it.each([
		['simplify(abs(a)^(2/3))', 'abs(a)^(2/3)'],
		['simplify(abs(a)^(4/3))', 'abs(a)^(4/3)'],
		['(a^2)^(1/3)', 'abs(a)^(2/3)'],
		['simplify((a^2*b)^(1/3))', 'b^(1/3)*abs(a)^(2/3)'],
		// Even integer powers still drop it.
		['simplify(abs(a)^2)', 'a^2'],
		['simplify(abs(a)^4)', 'a^4'],
		['(abs(a)^2)^(1/2)', 'abs(a)'],
		['abs(a)^(2/3)*abs(a)^(4/3)', 'a^2'],
	])('%s gives %s', (input, expected) => {
		expect(nerdamer(input).text()).toBe(expected);
	});

	it.each(['abs(a)^(2/3)', 'abs(a)^(4/3)', '(a^2*b)^(1/3)'])(
		'simplify(%s) keeps its value at a = -2',
		input => {
			const values = { a: '-2', b: '3' };
			const result = nerdamer(`simplify(${input})`).text();
			expect(nerdamer(result, values).evaluate().text()).toBe(
				nerdamer(input, values).evaluate().text()
			);
		}
	);
});
