import { Expression } from '../../src/core/classes/expression/Expression';
import { Rational } from '../../src/core/classes/rational/Rational';
import { message } from '../../src/core/errors';
import nerdamer from '../../src/index';

describe('Exact powers with huge integer exponents', () => {
	const outOfRange = message('resultOutOfRange');

	it('stay symbolic without evaluate instead of crashing', () => {
		const start = performance.now();
		for (const [source, base] of [['2^(1e400)', '2'], ['(3/2)^(1e400)', '3/2'], ['2^(10^20)', '2']]) {
			const result = nerdamer(source);
			expect(result.text().startsWith(base.includes('/') ? `(${base})^` : `${base}^`)).toBe(true);
		}
		expect(performance.now() - start).toBeLessThan(2000);
	});

	it('throw with evaluate when the exact result exceeds MAX_NUMBER_DIGITS', () => {
		for (const source of ['exp(1e400)', 'exp(-1e400)', 'e^(1e400)', '2^(1e400)', '2^(10^20)', '2^(3.33e5)']) {
			expect(() => nerdamer(source).evaluate()).toThrow(outOfRange);
		}
	});

	it('evaluate within the limit', () => {
		expect(nerdamer('2^(3.32e5)').evaluate().text()).toHaveLength(99942);
		expect(nerdamer('(3/2)^5').evaluate().text()).toEqual('243/32');
		expect(nerdamer('2^(-3)').evaluate().text()).toEqual('1/8');
		expect(nerdamer('(-2)^3').evaluate().text()).toEqual('-8');
	});

	it('evaluate large fraction powers quickly', () => {
		const start = performance.now();
		const value = nerdamer('(3/2)^(6e4)').evaluate();
		expect(value.text().includes('/')).toBe(true);
		// Repeating the GCD on the huge powers took well over 500 ms; it now takes ~30 ms.
		expect(performance.now() - start).toBeLessThan(500);
	});
});

describe('Rational and Expression conversions after the power changes', () => {
	it('raises reduced fractions to integer powers exactly', () => {
		expect(Rational.create('3/2').pow('5').text()).toEqual('243/32');
		expect(Rational.create('-2/3').pow('3').text()).toEqual('-8/27');
		expect(Rational.create('4/6').pow('2').text()).toEqual('4/9');
		expect(Rational.create('2/3').pow('-2').text()).toEqual('9/4');
	});

	it('keeps values and the decimal flag in fromRational', () => {
		expect(Expression.fromRational(Rational.create('6/8')).text()).toEqual('3/4');
		expect(Expression.fromRational(Rational.create('0.5')).text()).toEqual('0.5');
		const source = Rational.create('5/7');
		const converted = Expression.fromRational(source);
		converted.getMultiplier().numerator = 1n;
		expect(source.text()).toEqual('5/7');
	});
});
