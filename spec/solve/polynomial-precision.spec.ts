import nerdamer from '../../src/index';

// The polynomial solver worked at a fixed 50 digits, so a higher PRECISION was lowered for
// the solve and the roots stopped at 50 digits.
describe('Polynomial roots above the default working precision', () => {
	// The real root of x^5-x-1, from Newton's method at 130 digits.
	const root =
		'1.167303978261418684256045899854842180720560371525489039140082449275651903429527053180685205049728673';

	it('returns every digit at PRECISION 100 and restores the precision', () => {
		const precision = nerdamer.get('PRECISION');
		try {
			nerdamer.set('PRECISION', 100);
			const first = nerdamer('solve(x^5-x-1,x)').text().slice(1).split(',')[0];
			expect(first).toBe(root);
			expect(nerdamer.get('PRECISION')).toBe(100);
		} finally {
			nerdamer.set('PRECISION', precision);
		}
	});

	it('keeps the default output, rounded to 20 digits', () => {
		const first = nerdamer('solve(x^5-x-1,x)').text().slice(1).split(',')[0];
		expect(first).toBe('1.1673039782614186843');
	});
});
