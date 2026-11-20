import nerdamer from '../../src/index';

// Logs of rationally related numbers cancel across a product: log(8) = 3*log(2), so a group
// with members above and below the line is written over its smallest log.
describe('Log ratios inside products and powers', () => {
	it.each([
		['x*log(8)/log(2)', '3*x'],
		['log(8)*sin(x)/log(2)', '3*sin(x)'],
		['log(8)*log(y)/log(2)', '3*log(y)'],
		['2*x*log(1/8)/log(2)', '-6*x'],
		['log(8)^2/log(2)^2', '9'],
		['log(8)/log(2)^2', '3*log(2)^-1'],
		['log(2)^2/log(8)', '(1/3)*log(2)'],
		['log(8)^3/log(4)^2', '(27/8)*log(4)'],
		['log(4)/log(2)*log(3)', '2*log(3)'],
		['log(8)*log(3)/(log(2)*log(9))', '3/2'],
		['log(8)*log(9)/(log(2)*log(3))', '6'],
		['log(8)/(log(2)*log(3))', '3*log(3)^-1'],
		['log(1024)/(log(2)*log(32))', '2*log(2)^-1'],
		['log(1/27)*log(4)/(log(3)*log(1/2)^2)', '-6*log(2)^-1'],
	])('simplifies %s to %s', (source, expected) => {
		expect(nerdamer(`simplify(${source})`).text()).toBe(expected);
	});

	it.each([
		['log(4)*log(2)', 'log(2)*log(4)'],
		['log(7)/log(2)', 'log(7)*log(2)^-1'],
		['log(2)^(1/2)/log(8)', 'log(2)^(1/2)*log(8)^-1'],
	])('leaves %s, with nothing to cancel', (source, expected) => {
		expect(nerdamer(`simplify(${source})`).text()).toBe(expected);
	});
});

// Each term of a sum is reduced before simplify puts the terms over a common denominator.
describe('Log ratios inside sums', () => {
	it.each([
		['log(8)/log(2)+log(9)/log(3)', '5'],
		['2*(log(8)/log(2)+log(27)/log(3))', '12'],
		['x+log(8)/log(2)', '3+x'],
		['x*log(8)/log(2)+y*log(16)/log(4)', '3*x+2*y'],
		['log(8)/log(2)+log(2)', '3+log(2)'],
	])('simplifies %s to %s', (source, expected) => {
		expect(nerdamer(`simplify(${source})`).text()).toBe(expected);
	});
});
