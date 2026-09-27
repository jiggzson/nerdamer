import nerdamer from '../../src';
import type { TextOptions } from '../../src';
import { Expression } from '../../src/api/core';
import type { TextOptions as CoreTextOptions } from '../../src/api/core';

describe('public text formatting options', () => {
	it('sorts expression terms without changing the default text representation', () => {
		const expression = nerdamer('x^2+2*x+1');

		expect(expression.text()).toBe('1+2*x+x^2');
		expect(expression.text({ sort: true })).toBe('x^2+2*x+1');
		expect(expression.text()).toBe('1+2*x+x^2');
	});

	it('supports chainable conventional text output', () => {
		const expression = nerdamer('(x+1)^2').expand();

		expect(Expression.isExpression(expression)).toBe(true);
		if (!Expression.isExpression(expression)) {
			throw new Error('expanded scalar input did not return an Expression');
		}

		expect(expression.text({ sort: true })).toBe('x^2+2*x+1');
		expect(expression.toText()).toBe('x^2+2*x+1');
	});

	it('exports the same TextOptions shape from root and core', () => {
		const rootOptions: TextOptions = { sort: true, decimal: false };
		const coreOptions: CoreTextOptions = rootOptions;
		const expression = Expression.create('x^2+2*x+1');

		expect(expression.text(coreOptions)).toBe('x^2+2*x+1');
	});

	it('supports per-call scientific notation through TextOptions', () => {
		const options: TextOptions = { scientific: 4 };
		const coreOptions: CoreTextOptions = options;

		expect(Expression.create('12345').text(coreOptions)).toBe('1.235e4');
		expect(Expression.create('1/8').text(options)).toBe('1.250e-1');
		expect(Expression.create('x/8').text({ scientific: 3 })).toBe('1.25e-1*x');
		expect(Expression.create('1200').text({ scientific: 4 })).toBe('1.200e3');
		expect(Expression.create('x^2+1200*x').text({ scientific: 4 })).toBe(
			'1.200e3*x+x^2'
		);
	});

	it('formats powers in scientific notation only when the exponent stays exact', () => {
		expect(Expression.create('x^2').text({ scientific: 4 })).toBe('x^2');
		expect(Expression.create('x^1000').text({ scientific: 4 })).toBe('x^1000');
		expect(Expression.create('x^(1/2)').text({ scientific: 4 })).toBe('x^(1/2)');
		expect(Expression.create('x^120000').text({ scientific: 4 })).toBe('x^1.200e5');
		expect(Expression.create('x^123456').text({ scientific: 4 })).toBe('x^123456');
		expect(Expression.create('x^(y+120000)').text({ scientific: 4 })).toBe(
			'x^(1.200e5+y)'
		);

		expect(nerdamer.scientific('x^120000', 4).text()).toBe('x^1.200e5');

		const source = Expression.create('x^120000');
		const formatted = source.text({ scientific: 4 });
		const reparsed = Expression.create(formatted);

		expect(reparsed.getPower().eq(source.getPower())).toBe(true);
	});

	it('formats scientific edge cases without passing through JavaScript Number', () => {
		// Edge cases adapted from https://gist.github.com/jiggzson/b5f489af9ad931e3d186
		const cases: Array<[string, number, string]> = [
			['0', 4, '0'],
			['-0.0012', 2, '-1.2e-3'],
			['1.2e+2', 2, '1.2e2'],
			['12345.6e-1', 6, '1.23456e3'],
			['0.00000000000123423534', 9, '1.23423534e-12'],
			['3.4028236692093846346e+38', 20, '3.4028236692093846346e38'],
			[
				'115792089237316195423570985008687907853269984665640564039457584007913129639935',
				78,
				'1.15792089237316195423570985008687907853269984665640564039457584007913129639935e77',
			],
		];

		for (const [input, scientific, expected] of cases) {
			const source = Expression.create(input);
			const formatted = nerdamer.scientific(source, scientific);

			expect(formatted.text()).toBe(expected);
			expect(formatted.eq(source)).toBe(true);
			expect(formatted.evaluate().eq(source)).toBe(true);
		}
		const nearUnit = nerdamer.scientific('9999*x/10000', 3);
		expect(nearUnit.text()).toBe('1.00*x');
	});

	it('validates scientific precision before decimal formatting', () => {
		for (const scientific of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 1_000_000_001]) {
			expect(() => Expression.create('12345').text({ scientific })).toThrow(
				nerdamer.errors.UnexpectedInputError
			);
		}
	});

	it('supports per-call decimal precision through TextOptions', () => {
		const options: TextOptions = { decimal: true, precision: 5 };

		expect(Expression.create('1/3').text(options)).toBe('0.33333');
	});
});
