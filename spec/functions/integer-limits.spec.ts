import { Expression } from '../../src/core/classes/expression/Expression';
import { Parser } from '../../src/core/classes/parser/Parser';
import { message, UnsupportedOperationError } from '../../src/core/errors';
import nerdamer from '../../src/index';

type LimitSetting = 'MAX_FACTORIAL_INPUT' | 'MAX_DFACT_INPUT' | 'MAX_FIB_INPUT';

/** Runs `fn` with a temporary limit and restores the previous value. */
function withLimit(setting: LimitSetting, value: number, fn: () => void) {
	const previous = Parser.get(setting);
	Parser.set(setting, value);
	try {
		fn();
	} finally {
		Parser.set(setting, previous);
	}
}

describe('Exact integer input limits', () => {
	it('rejects inputs above each limit with a localized message', () => {
		const cases: [string, string, LimitSetting][] = [
			['fact(25001)', 'fact', 'MAX_FACTORIAL_INPUT'],
			['25001!', 'fact', 'MAX_FACTORIAL_INPUT'],
			['gamma(25001)', 'gamma', 'MAX_FACTORIAL_INPUT'],
			['gamma(50003/2)', 'gamma', 'MAX_FACTORIAL_INPUT'],
			['dfact(45001)', 'dfact', 'MAX_DFACT_INPUT'],
			['dfact(-45001)', 'dfact', 'MAX_DFACT_INPUT'],
			['fib(450001)', 'fib', 'MAX_FIB_INPUT'],
			['fib(-450001)', 'fib', 'MAX_FIB_INPUT'],
		];
		for (const [source, name, setting] of cases) {
			const expected = message('inputLimitExceeded', { function: name, limit: String(Parser.get(setting)) });
			expect(() => Parser.parse(source)).toThrow(UnsupportedOperationError);
			expect(() => Parser.parse(source)).toThrow(expected);
		}
	});

	it('rejects huge inputs immediately instead of hanging or exhausting memory', () => {
		for (const source of ['fact(1e400)', 'gamma(1e400)', 'dfact(1e400)', 'fib(1e400)', 'fib(-1e400)']) {
			expect(() => Parser.parse(source)).toThrow(UnsupportedOperationError);
		}
		// Poles are still reported as poles, not as size errors.
		expect(() => Parser.parse('gamma(-1e400)')).toThrow(message('gammaUndefined'));
	});

	it('computes values at the limits', () => {
		expect(Parser.parse('fact(25000)').text()).toHaveLength(99094);
		expect(Parser.parse('dfact(45000)').text()).toHaveLength(94929);
		expect(Parser.parse('fib(450000)').text()).toHaveLength(94045);
	});

	it('uses the configured limit', () => {
		withLimit('MAX_FIB_INPUT', 10, () => {
			expect(Parser.parse('fib(10)').text()).toEqual('55');
			expect(() => Parser.parse('fib(11)')).toThrow(UnsupportedOperationError);
		});
		withLimit('MAX_FACTORIAL_INPUT', 5, () => {
			expect(Parser.parse('fact(5)').text()).toEqual('120');
			expect(() => Parser.parse('fact(6)')).toThrow(UnsupportedOperationError);
		});
		withLimit('MAX_DFACT_INPUT', 7, () => {
			expect(Parser.parse('dfact(7)').text()).toEqual('105');
			expect(() => Parser.parse('dfact(8)')).toThrow(UnsupportedOperationError);
		});
	});
});

describe('Exact factorial and gamma values', () => {
	it('computes factorials past the cached range correctly', () => {
		nerdamer('x');
		let expected = 1n;
		for (let k = 1n; k <= 150n; k++) {
			expected *= k;
			if (k >= 99n) {
				expect(Parser.parse(`fact(${k})`).text()).toEqual(String(expected));
			}
		}
		// A repeated call returns the same value.
		expect(Parser.parse('fact(150)').text()).toEqual(String(expected));
	});

	it('follows gamma(x+1) = x*gamma(x) for half-integers', () => {
		for (let k = -21; k <= 21; k += 2) {
			const x = Expression.create(`${k}/2`);
			const left = Parser.parse(`gamma(${k}/2+1)`);
			const value = Parser.parse(`gamma(${k}/2)`);
			expect(Expression.isExpression(left) && Expression.isExpression(value)).toBe(true);
			if (Expression.isExpression(left) && Expression.isExpression(value)) {
				expect(left.eq(x.times(value))).toBe(true);
			}
		}
	});

	it('evaluates large half-integers within the limit quickly', () => {
		const start = performance.now();
		const value = Parser.parse('gamma(10001/2)');
		expect(Expression.isExpression(value) && !value.isFunction('gamma')).toBe(true);
		expect(performance.now() - start).toBeLessThan(2000);
	});
});
