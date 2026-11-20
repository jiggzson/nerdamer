import nerdamer from '../../src/index';

// log(x) for a negative constant x is pi*i + log(-x). It took the magnitude with abs, which
// leaves a sum such as -1-pi unchanged, so the call recursed until the stack overflowed.
describe('The logarithm of a negative constant', () => {
	it.each([
		['log(-3)', 'log(3)+pi*i'],
		['log(-pi)', 'log(pi)+pi*i'],
		['log(-sqrt(2))', '(1/2)*log(2)+pi*i'],
		['log(-(1+pi))', 'log(1+pi)+pi*i'],
		['log(-(1+e))', 'log(1+e)+pi*i'],
		['log(-(1+sqrt(2)))', 'log(2^(1/2)+1)+pi*i'],
		['log(-(sqrt(2)-1))', 'log(2^(1/2)-1)+pi*i'],
	])('gives %s = %s', (source, expected) => {
		expect(nerdamer(source).text()).toBe(expected);
	});
});
