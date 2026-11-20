import Decimal from 'decimal.js';

import { Expression } from '../../src/core/classes/expression/Expression';
import { Parser } from '../../src/core/classes/parser/Parser';
import { message, UnsupportedOperationError } from '../../src/core/errors';
import { cosh, sinh, tanh } from '../../src/core/functions/decimal';
import nerdamer from '../../src/index';

/** Relative error of a computed value against a reference string. */
function relativeError(actual: Decimal, expected: string): Decimal {
	const exact = new Decimal(expected);
	return actual.minus(exact).abs().div(exact.abs());
}

describe('Results outside the representable numeric range', () => {
	const outOfRange = message('resultOutOfRange');

	it('throws a localized error when a value overflows', () => {
		for (const source of ['Ei(1e400)', 'Shi(1e400)', 'Shi(-1e400)', 'Chi(1e400)', 'sinh(1e400)', 'sinh(-1e400)', 'cosh(1e400)']) {
			expect(() => nerdamer(source).evaluate()).toThrow(UnsupportedOperationError);
			expect(() => nerdamer(source).evaluate()).toThrow(outOfRange);
		}
	});

	it('throws a localized error when a value underflows', () => {
		for (const source of ['Ei(-1e400)', 'sech(1e400)', 'csch(-1e400)']) {
			expect(() => nerdamer(source).evaluate()).toThrow(outOfRange);
		}
	});

	it('rejects a non-finite Decimal as an exact number', () => {
		expect(() => Expression.Number(new Decimal(Infinity))).toThrow(outOfRange);
		expect(() => Expression.Number(new Decimal(NaN))).toThrow(outOfRange);
	});

	it('keeps values that are representable', () => {
		expect(Number(nerdamer('Ei(-50)').evaluate().text({ decimal: true }))).toBeCloseTo(-3.783264029550459e-24, 35);
		expect(nerdamer('tanh(1e400)').evaluate().text()).toEqual('1');
		expect(nerdamer('tanh(-1e400)').evaluate().text()).toEqual('-1');
		expect(nerdamer('coth(1e400)').evaluate().text()).toEqual('1');
	});
});

describe('Exact numbers with huge exponents', () => {
	const outOfRange = message('resultOutOfRange');

	it('rejects results whose exact form would exceed MAX_NUMBER_DIGITS', () => {
		const start = performance.now();
		for (const source of ['sinh(1e7)', 'sinh(1e9)', 'cosh(1e10)', 'Ei(1e7)', 'erfc(1e7)', 'erfc(500)']) {
			expect(() => nerdamer(source).evaluate()).toThrow(outOfRange);
		}
		expect(performance.now() - start).toBeLessThan(2000);
	});

	it('throws when erfc underflows to zero', () => {
		expect(() => nerdamer('erfc(1e9)').evaluate()).toThrow(outOfRange);
	});

	it('keeps results within the limit', () => {
		expect(nerdamer('erfc(300)').evaluate().text()).toEqual('5.9010609937089333639e-39090');
		expect(nerdamer('sinh(115129)').evaluate().text().length).toBeGreaterThan(49000);
	});

	it('uses the configured limit', () => {
		const previous = Parser.get('MAX_NUMBER_DIGITS');
		Parser.set('MAX_NUMBER_DIGITS', 10);
		try {
			expect(nerdamer('sinh(20)').evaluate().text()).toEqual('242582597.70489513795');
			expect(() => nerdamer('sinh(30)').evaluate()).toThrow(outOfRange);
		} finally {
			Parser.set('MAX_NUMBER_DIGITS', previous);
		}
	});
});

describe('Logarithmic integral at zero', () => {
	it('is exactly zero, with and without evaluation', () => {
		expect(nerdamer('Li(0)').text()).toEqual('0');
		expect(nerdamer('Li(0)').evaluate().text()).toEqual('0');
		expect(nerdamer('Li(1)').evaluate().text()).toEqual('-Inf');
	});
});

describe('Decimal hyperbolic functions for large arguments', () => {
	it('returns large finite values instead of hanging', () => {
		const start = performance.now();
		expect(sinh('1e6').gt(0)).toBe(true);
		expect(cosh('-1e6').eq(sinh('1e6'))).toBe(true);
		expect(tanh('1e6').eq(1)).toBe(true);
		expect(tanh('-1e6').eq(-1)).toBe(true);
		expect(performance.now() - start).toBeLessThan(2000);
	});

	it('stays accurate on both sides of the switch to exp', () => {
		// Reference values from mpmath at 60 digits.
		const cases: [string, string][] = [
			['33', '107321789892958.03231'],
			['100', '1.3440585709080677242e+43'],
		];
		for (const [x, expected] of cases) {
			expect(relativeError(sinh(x), expected).lt('1e-19')).toBe(true);
			expect(relativeError(cosh(x), expected).lt('1e-19')).toBe(true);
		}
		expect(relativeError(sinh('-40'), '-117692633418509992.7').lt('1e-19')).toBe(true);
		expect(relativeError(cosh('-40'), '117692633418509992.7').lt('1e-19')).toBe(true);
	});
});
