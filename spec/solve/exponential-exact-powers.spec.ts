import '../helpers/registerNerdamerFunctions';
import { solve } from '../../src/solve/solve';

// b^u = c with c an exact rational power of b gives the exponent itself, so 2^x = 8 is 3
// rather than log(8)/log(2).
describe('Exponentials equal to an exact power of the base', () => {
	it.each([
		['2^x-8', '{3}'],
		['8^x-4', '{2/3}'],
		['9^x-27', '{3/2}'],
		['2^x-1/8', '{-3}'],
		['(1/3)^x-9', '{-2}'],
		['(4/9)^x-8/27', '{3/2}'],
		['(2/3)^x-4/9', '{2}'],
		['(3/2)^x-4/9', '{-2}'],
		['1024^x-2', '{1/10}'],
		['2^x-2^100', '{100}'],
		['3*2^x-24', '{3}'],
		['2^(x+2)-32', '{3}'],
		['4^(2*x)-8', '{3/4}'],
	])('solves %s', (source, expected) => {
		expect(solve(source, 'x').text()).toBe(expected);
	});

	it.each([
		['2^x-7', '{log(7)*log(2)^-1}'],
		['2^x-24', '{log(24)*log(2)^-1}'],
		['10^x-40', '{log(40)*log(10)^-1}'],
		['a^x-8', '{log(8)*log(a)^-1}'],
		['2^x-b', '{log(b)*log(2)^-1}'],
	])('keeps the logarithm for %s, which is not an exact power', (source, expected) => {
		expect(solve(source, 'x').text()).toBe(expected);
	});
});
