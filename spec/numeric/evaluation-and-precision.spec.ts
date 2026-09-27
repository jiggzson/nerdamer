import Decimal from 'decimal.js';

import nerdamer from '../../src/index';
import { Parser } from '../../src/core/classes/parser/Parser';
import { Expression } from '../../src/core/classes/expression/Expression';

describe('Numeric evaluation', () => {
	it('should evaluate powers', () => {
		expect(Parser.evaluate('405^(5/4)').text({ decimal: true })).toEqual(
			'1816.8487691837829584'
		);
		expect(Parser.evaluate('(pi)^(-3/5)').text({ decimal: true })).toEqual(
			'0.50316459714325931574'
		);
		expect(Parser.evaluate('-24.160787001838543^1.3^(-1)').text()).toEqual(
			'-11.585948599615734039'
		);
	});

});

describe('Parser precision', () => {
	it('should preserve the configured precision when a new value is rejected', () => {
		const precision = Parser.getPrecision();
		try {
			expect(() => Parser.setPrecision(0)).toThrow();
			expect(Parser.getPrecision()).toBe(precision);
			expect(Decimal.precision).toBe(precision);
		} finally {
			Parser.setPrecision(precision);
		}
	});
});

describe('Big-number exactness', () => {
	// Regression: Nerdamer 2.0 issue #9
	it('keeps large finite decimals exact through multiplication', () => {
		const input =
			'4854818448948949498494984948949449898454525.4854818448948949498494984948949449898454525';
		const expected =
			'38838547591591595987959879591595599187636203.88385475915915959879598795915955991876362';
		const result = Parser.parse(`${input}*8`);

		expect(result.eq(Expression.create(expected))).toBe(true);

		const highPrecisionText = result.text({ decimal: true, precision: 100 });
		expect(Expression.create(highPrecisionText).eq(Expression.create(expected))).toBe(true);
	});

	it('uses configured decimal precision only for presentation', () => {
		const input =
			'4854818448948949498494984948949449898454525.4854818448948949498494984948949449898454525';
		const result = Parser.parse(`${input}*8`);

		expect(result.text({ decimal: true })).toBe('3.8838547591591595988e+43');
		expect(result.eq(Expression.create(result.text({ decimal: true })))).toBe(false);
	});
});

describe('Numeric parsing', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/375
	it('parses exact integers beyond the JavaScript numeric range', () => {
		const scientific = `1${'0'.repeat(400)}`;

		expect(nerdamer('10^400').text()).toEqual('10^400');
		expect(nerdamer('1e400').text()).toEqual(scientific);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/341
	it('does not silently truncate recurring-decimal notation', () => {
		let parsed: string | undefined;
		let rejected = false;
		try {
			parsed = nerdamer('1.1...').text();
		} catch {
			rejected = true;
		}
		expect(rejected || parsed === '10/9').toBe(true);
	});
});

describe('Numeric evaluation regressions', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/145
	it('truncates numeric values toward zero', () => {
		const cases = [
			['trunc(0)', '0'],
			['trunc(10.234)', '10'],
			['trunc(-9.99)', '-9'],
			['trunc(0.99)', '0'],
			['trunc(-0.7555)', '0'],
			['trunc(8.9*-4.9)', '-43'],
			['trunc(8.9)*trunc(-4.9)', '-32'],
		];

		for (const [input, expected] of cases) {
			expect(nerdamer(input).text()).toEqual(expected);
		}

		expect(nerdamer('trunc(x)').text()).toEqual('trunc(x)');
		expect(nerdamer.trunc('-1.9').text()).toEqual('-1');
		expect(nerdamer.buildFunction('trunc(x)', ['x'])(-1.9)).toEqual(-1);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/149
	it('rounds to a requested number of decimal places', () => {
		expect(Expression.create('round(1.2346,3)').eq(Expression.create('1.235'))).toBe(true);
		expect(Expression.create('round(2.345005,2)').eq(Expression.create('2.35'))).toBe(true);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/196
	it('evaluates arbitrary-size integer powers exactly', () => {
		const result = nerdamer('2^2048').evaluate();

		expect(result.text()).toEqual((2n ** 2048n).toString());
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/291
	it('keeps rounded numeric results evaluable', () => {
		expect(nerdamer('round(3)').evaluate().text()).toEqual('3');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/497
	it('evaluates large finite integer powers without overflowing', () => {
		const result = Number(Parser.evaluate('1000*(1+(0.06/365))^(365*3)').text());

		expect(Number.isFinite(result)).toBe(true);
		expect(result).toBeCloseTo(1197.19965294, 8);
	});

	// Regression: https://github.com/together-science/nerdamer-prime/issues/11
	it('preserves significant digits when formatting a small decimal', () => {
		const expression = Expression.create(
			'(19279880988/10000000000)/(10000000000000000*x)'
		);
		const actual = Number(expression.evaluate({ x: 1 }).text({ decimal: true }));
		const expected = 1.9279880988e-16;
		const relativeError = Math.abs(actual - expected) / expected;

		expect(relativeError).toBeLessThan(1e-10);
	});
});
