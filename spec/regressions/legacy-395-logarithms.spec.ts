import nerdamer from '../../src/index';

describe('legacy #395 logarithms under the 2.0 naming convention', () => {
	// log is natural in 2.0; common logarithms use log10.
	it('keeps natural and common logarithms distinct', () => {
		expect(nerdamer('log(e)').text()).toEqual('1');
		expect(nerdamer('log10(100)').text()).toEqual('2');
		expect(nerdamer('log(100)').eq(nerdamer('2'))).toBe(false);
	});

	it('evaluates exact common logarithms of integer powers', () => {
		expect(nerdamer('log10(1000)').eq(nerdamer('3'))).toBe(true);
		expect(nerdamer('log10(1)').eq(nerdamer('0'))).toBe(true);
	});
});
