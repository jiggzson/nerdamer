import nerdamer from '../../src/index';

// log(8/27) is stored as log(8)-log(27), so a ratio of logs of fractions has a sum on each
// side. Each side is read as a single log of a positive rational before the ratio is reduced.
describe('Log ratios of positive rationals', () => {
	it.each([
		['(log(8)-log(27))/(log(4)-log(9))', '3/2'],
		['log(8/27)/log(4/9)', '3/2'],
		['(log(8)-log(27))/(log(2)-log(3))', '3'],
		['(log(2)-log(3))/(log(3)-log(2))', '-1'],
		['log(15)/(log(5)+log(3))', '1'],
		['log(1/8)/log(2)', '-3'],
		['log(2)/log(1/8)', '-1/3'],
		['2*log(8)/log(2)', '6'],
	])('simplifies %s to %s', (source, expected) => {
		expect(nerdamer(`simplify(${source})`).text()).toBe(expected);
	});

	it.each([
		['log(7)/log(2)', 'log(7)*log(2)^-1'],
		['(log(x)-log(2))/log(2)', 'log(2)^-1*(-log(2)+log(x))'],
		['log(8)/(log(2)+log(x))', 'log(8)*((log(2)+log(x))^-1)'],
	])('leaves %s', (source, expected) => {
		expect(nerdamer(`simplify(${source})`).text()).toBe(expected);
	});
});
