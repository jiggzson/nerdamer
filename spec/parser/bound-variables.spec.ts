import nerdamer from '../../src/index';

/** The text of source parsed with the given call values. */
function parse(source: string, values: Record<string, string> = {}): string {
	return nerdamer(source, values).text();
}

// The index of sum and product is bound to the call: a value for its name applies outside the
// call but not in the summand.
describe('Bound index of sum and product', () => {
	it.each([
		['sum(k,k,1,3)', { k: '10' }, '6'],
		['product(k,k,1,4)', { k: '10' }, '24'],
		['sum(k*x,k,1,3)', { k: '10', x: '2' }, '12'],
		['sum(k,k,1,n)', { n: '4', k: '10' }, '10'],
		['sum(sum(j*k,j,1,k),k,1,3)', { j: '5', k: '7' }, '25'],
	])('ignores a call value for the index in %s %j', (source, values, expected) => {
		expect(parse(source, values)).toBe(expected);
	});

	it('still substitutes the name in the bounds, which are outside the binding', () => {
		expect(parse('sum(k,k,1,k)', { k: '4' })).toBe('10');
		expect(parse('sum(j,j,1,k)', { k: '3' })).toBe('6');
	});

	it('ignores a stored value for the index and keeps it outside the call', () => {
		try {
			nerdamer.setVar('k', '10');
			expect(parse('sum(k,k,1,3)')).toBe('6');
			expect(parse('k+sum(k,k,1,3)')).toBe('16');
			expect(parse('k')).toBe('10');
			// The stored value is restored when the summand throws.
			expect(() => parse('sum(1/(k-2),k,1,3)')).toThrow();
			expect(parse('k')).toBe('10');
		} finally {
			nerdamer.clearVars();
		}
	});

	it('ignores a let binding for the index', () => {
		expect(parse('let(k, 10, sum(k,k,1,3)+k)')).toBe('16');
	});

	it('still distributes over vectors', () => {
		expect(parse('sum([k,k^2],k,1,3)', { k: '10' })).toBe('[6, 14]');
		expect(parse('sum(k,k,1,[2,3])')).toBe('[3, 6]');
	});
});

// The variable of diff, integrate, defint, limit, taylor and solve is bound the same way.
describe('Bound variable of calculus and solve functions', () => {
	it.each([
		['diff(k^2,k)', '2*k'],
		['diff(k^3,k,2)', '6*k'],
		['integrate(k^2,k)', '(1/3)*k^3'],
		['defint(k,k,0,2)', '2'],
		['limit(1/k,k,Infinity)', '0'],
		['taylor(e^k,k,0,3)', '1+k+(1/2)*k^2+(1/6)*k^3'],
		['solve(k^2-4,k)', '{2, -2}'],
	])('ignores a call value for the variable in %s', (source, expected) => {
		expect(parse(source, { k: '10' })).toBe(expected);
	});

	it('still substitutes other names, and the variable outside the binding', () => {
		expect(parse('diff(a*k^2,k)', { a: '3', k: '10' })).toBe('6*k');
		expect(parse('limit((1+a/k)^k,k,Infinity)', { a: '2', k: '10' })).toBe('e^2');
		expect(parse('limit(k^2,k,p)', { p: '3', k: '10' })).toBe('9');
		expect(parse('defint(k,k,0,u)', { u: '2', k: '10' })).toBe('2');
		expect(parse('taylor(e^k,k,c,2)', { c: '0', k: '10' })).toBe('1+k+(1/2)*k^2');
	});

	it('substitutes as before when no variable is given', () => {
		expect(parse('diff(k^2)', { k: '10' })).toBe('0');
		expect(parse('diff(x^2)')).toBe('2*x');
	});

	it('handles equations and vectors', () => {
		expect(parse('diff(y=k^2,k)', { k: '10' })).toBe('0=2*k');
		expect(parse('solve(k^2=4,k)', { k: '10' })).toBe('{2, -2}');
		expect(parse('diff([k^2,k^3],k)', { k: '10' })).toBe('[2*k, 3*k^2]');
		expect(parse('limit([1/k,k/(k+1)],k,Infinity)', { k: '10' })).toBe('[0, 1]');
	});

	// solve and diff parse text while they run, so the stored value stays hidden for the whole call.
	it('ignores a stored value for the variable during the whole call', () => {
		try {
			nerdamer.setVar('k', '10');
			expect(parse('diff(k^2,k)+k')).toBe('10+2*k');
			expect(parse('solve(k^2-4,k)')).toBe('{2, -2}');
			expect(parse('k')).toBe('10');
		} finally {
			nerdamer.clearVars();
		}
	});
});
