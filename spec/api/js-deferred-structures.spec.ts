import nerdamer from '../../src/index';

// The JS functions for limit, taylor, defint, sum, product and numeric rejected vectors,
// matrices and sets, which the parser distributes over.
describe('Deferred JS functions on vectors, matrices and sets', () => {
	const n = nerdamer as unknown as Record<string, (...args: unknown[]) => unknown>;

	it.each([
		['limit', '[sin(y)/y, 2*sin(y)/y]', ['y', '0']],
		['limit', 'matrix([sin(y)/y],[2*sin(y)/y])', ['y', '0']],
		['taylor', '{e^y, 2*e^y}', ['y', '2', '0']],
		['defint', '[y, 2*y]', ['y', '0', '1']],
		['defint', '{y, 2*y}', ['y', '0', '1']],
		['sum', '[k*y, 2*k*y]', ['k', '1', '3']],
		['product', '[k, 2*k]', ['k', '1', '3']],
		['numeric', '{pi*y, 2*pi*y}', []],
		['diff', '[y^2, y^3]', ['y']],
		['integrate', '{y, 2*y}', ['y']],
	] as [string, string, string[]][])('%s(%s) matches the parser', (name, structure, rest) => {
		const result = String(n[name](nerdamer(structure), ...rest));
		expect(result).toBe(nerdamer(`${name}(${[structure, ...rest].join(',')})`).text());
	});

	// sum and product checked their index before turning text into an expression.
	it('accepts text arguments for sum and product', () => {
		expect(String(nerdamer.sum('k', 'k', '1', '4'))).toBe('10');
		expect(String(nerdamer.product('k', 'k', '1', '4'))).toBe('24');
	});

	it('keeps scalar calls', () => {
		expect(String(nerdamer.limit('sin(x)/x', 'x', '0'))).toBe('1');
		expect(String(nerdamer.defint('x', 'x', '0', '1'))).toBe('0.5');
		expect(String(nerdamer.numeric('pi'))).toBe('3.1415926535897932385');
	});
});
