import nerdamer from '../../src';
import { C, S } from '../../src/api/calculus';

describe('Fresnel integrals', () => {
	it('preserves symbolic arguments', () => {
		expect(S('x').text()).toBe('S(x)');
		expect(C('x').text()).toBe('C(x)');
		expect(nerdamer('S(x)').text()).toBe('S(x)');
		expect(nerdamer('C(x)').text()).toBe('C(x)');
	});

	it('evaluates numeric real arguments using the normalized definitions', () => {
		expect(Number(S(1).text())).toBeCloseTo(0.4382591473903548, 12);
		expect(Number(C(1).text())).toBeCloseTo(0.7798934003768228, 12);
		expect(S(0).text()).toBe('0');
		expect(C(0).text()).toBe('0');
	});

	it('keeps parser, root, and direct API behavior aligned', () => {
		expect(nerdamer.S('x').text()).toBe(S('x').text());
		expect(nerdamer.C('x').text()).toBe(C('x').text());
		expect(nerdamer('S(1)').text()).toBe(S(1).text());
		expect(nerdamer('C(1)').text()).toBe(C(1).text());
	});
});
