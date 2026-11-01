import nerdamer from '../../src/index';
import { log } from '../../src/math/index';

describe('legacy #395 radical prime expansion', () => {
	// Full decomposition is opt-in even when the argument contains a radical.
	it('expands positive numeric radicals when explicitly requested', () => {
		expect(log('sqrt(8)', undefined, true).eq(nerdamer('(3/2)*log(2)'))).toBe(true);
		expect(log('sqrt(48)', undefined, true).eq(
			nerdamer('2*log(2)+(1/2)*log(3)')
		)).toBe(true);
	});

	it('propagates expansion through common-log base conversion', () => {
		expect(log('sqrt(48)', 10, true).eq(
			nerdamer('(2*log(2)+(1/2)*log(3))/log(10)')
		)).toBe(true);
		expect(log(240, 10, true).eq(
			nerdamer('(4*log(2)+log(3)+log(5))/log(10)')
		)).toBe(true);
	});

	it('preserves default compact representations', () => {
		expect(log('sqrt(48)', 10).text()).toEqual(nerdamer('log10(sqrt(48))').text());
		expect(log(240, 10).text()).toEqual(nerdamer('log10(240)').text());
	});
});
