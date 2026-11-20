import nerdamer from '../../src/index';

// simplifyLogRatio factored both arguments into primes, so a large integer without small
// factors never finished. It now confirms a^q = b^p directly.
describe('Log ratios of large integers', () => {
	const n = '1000000000000000003*1000000000000000009';

	it('leaves a ratio that is not rational', () => {
		expect(nerdamer(`simplify(log(${n})/log(2))`).text()).toBe(
			'log(1000000000000000012000000000000000027)*log(2)^-1'
		);
	});

	it('reduces a ratio of powers of a large integer', () => {
		expect(nerdamer(`simplify(log((${n})^2)/log(${n}))`).text()).toBe('2');
	});

	// The estimate has its own precision, so a large ratio is still found at a low setting.
	it('reduces a large ratio at a low PRECISION setting', () => {
		const precision = nerdamer.get('PRECISION');
		try {
			nerdamer.set('PRECISION', 5);
			expect(nerdamer('simplify(log(3^500)/log(27))').text()).toBe('500/3');
			expect(nerdamer('solve(2^x-2^3000,x)').text()).toBe('{3000}');
		} finally {
			nerdamer.set('PRECISION', precision);
		}
	});

	it.each([
		['log(8)/log(2)', '3'],
		['log(4)/log(8)', '2/3'],
		['log(2)/log(1024)', '1/10'],
		['3*log(8)/log(2)', '9'],
		['log(7)/log(2)', 'log(7)*log(2)^-1'],
	])('simplifies %s to %s', (source, expected) => {
		expect(nerdamer(`simplify(${source})`).text()).toBe(expected);
	});
});
