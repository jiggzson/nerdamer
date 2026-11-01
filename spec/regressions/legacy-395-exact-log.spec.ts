import nerdamer from '../../src/index';

describe('legacy #395 exact logarithm simplification', () => {
	// Extract only exact powers of the requested positive integer base.
	it('extracts exact base-ten factors without approximating the residual', () => {
		expect(nerdamer('log10(300)').eq(nerdamer('2+log10(3)'))).toBe(true);
		expect(nerdamer('log10(30)').eq(nerdamer('1+log10(3)'))).toBe(true);
	});

	it('preserves exact powers and general integer bases', () => {
		expect(nerdamer('log10(1000)').text()).toEqual('3');
		expect(nerdamer('log(81,3)').text()).toEqual('4');
		expect(nerdamer('log(48,2)').eq(nerdamer('4+log(3,2)'))).toBe(true);
	});

	it('does not rewrite natural logarithms as common logarithms', () => {
		expect(nerdamer('log(300)').eq(nerdamer('2+log10(3)'))).toBe(false);
	});
});
