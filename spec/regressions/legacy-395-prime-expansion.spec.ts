import nerdamer from '../../src/index';
import { log } from '../../src/math/index';

describe('legacy #395 opt-in prime decomposition', () => {
	// Keep full prime factorization explicit; ordinary logarithms remain compact.
	it('preserves the default logarithm representation', () => {
		expect(log(54).text()).toEqual(nerdamer('log(54)').text());
		expect(log('8/9').text()).toEqual(nerdamer('log(8/9)').text());
	});

	it('decomposes positive integer arguments when requested', () => {
		expect(log(54, undefined, true).eq(nerdamer('log(2)+3*log(3)'))).toBe(true);
		expect(log(108, undefined, true).eq(nerdamer('2*log(2)+3*log(3)'))).toBe(true);
	});

	it('passes prime expansion through rational numerator and denominator', () => {
		expect(log('8/9', undefined, true).eq(nerdamer('3*log(2)-2*log(3)'))).toBe(true);
		expect(log('1/4', undefined, true).eq(nerdamer('-2*log(2)'))).toBe(true);
	});
});
