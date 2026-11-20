import nerdamer from '../../src/index';

// e^(k*i*pi/2) = i^k for odd k: i when k is 1 modulo 4 and -i when it is 3. Taking the
// exponent modulo 4 before reading its numerator gave -i for k = 5, 13, ...
describe('Exact quarter turns of e^(i*theta)', () => {
	it.each([
		['e^(i*pi/2)', 'i'],
		['e^(3*i*pi/2)', '-i'],
		['e^(5*i*pi/2)', 'i'],
		['e^(7*i*pi/2)', '-i'],
		['e^(13*i*pi/2)', 'i'],
		['e^(-i*pi/2)', '-i'],
		['e^(-3*i*pi/2)', 'i'],
		['e^(-5*i*pi/2)', '-i'],
	])('gives %s = %s', (source, expected) => {
		expect(nerdamer(source).text()).toBe(expected);
	});
});
