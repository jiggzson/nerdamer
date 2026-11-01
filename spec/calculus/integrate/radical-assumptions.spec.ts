import { diff } from '../../../src/calculus/derivative/diff';
import { tableOfIntegrals } from '../../../src/calculus/integrate/integrationTable';
import { assume, clearAssumptions } from '../../../src/core/classes/assumption/assume';
import { Expression } from '../../../src/core/classes/expression/Expression';
import { Pattern } from '../../../src/core/converters/Pattern';
import '../../../src/index';

describe('Assumption-dependent radical integration table rules', () => {
	afterEach(() => clearAssumptions());

	it.each([
		['1/(x*sqrt(2-2/x^2))', 'x>2', '2^(-1/2)*acosh(x)', 3],
		['-1/(x*sqrt(2-2/x^2))', 'x>2', '-2^(-1/2)*acosh(x)', 3],
		['1/(x*sqrt(2+2/x^2))', 'x>0', '2^(-1/2)*asinh(x)', 1.2],
		['1/(x*sqrt(2-2/x^2))', 'x< -2', '2^(-1/2)*acosh(-x)', -3],
		['-1/(x*sqrt(2-2/x^2))', 'x< -2', '-2^(-1/2)*acosh(-x)', -3],
		['1/(x*sqrt(2+2/x^2))', 'x<0', '2^(-1/2)*asinh(-x)', -1.2],
	])('integrates %s under %s', (input, condition, expected, sample) => {
		assume(condition);
		const source = Expression.create(input);
		const result = tableOfIntegrals.lookup(new Pattern(source, ['x']), 0);
		expect(result).toBeDefined();
		expect(result!.eq(Expression.create(expected))).toBe(true);
		const residual = diff(result!, 'x').minus(source);
		const value = Number(residual.evaluate({ x: sample }).text({ decimal: true }));
		expect(Number.isFinite(value)).toBe(true);
		expect(value).toBeCloseTo(0, 8);
	});

	it.each([
		'1/(x*sqrt(2-2/x^2))',
		'-1/(x*sqrt(2-2/x^2))',
		'1/(x*sqrt(2+2/x^2))',
	])('declines %s without a proof of the relevant real domain', input => {
		const source = Expression.create(input);
		expect(tableOfIntegrals.lookup(new Pattern(source, ['x']), 0)).toBeUndefined();
	});

	it('declines a negative-radicand interval', () => {
		assume('x>0');
		assume('x<1');
		const source = Expression.create('1/(x*sqrt(2-2/x^2))');
		expect(tableOfIntegrals.lookup(new Pattern(source, ['x']), 0)).toBeUndefined();
	});

	it('accepts symbolic coefficients with independently proven signs', () => {
		assume('a>0');
		assume('b>0');
		assume('x>0');
		const source = Expression.create('1/(x*sqrt(a+b/x^2))');
		const result = tableOfIntegrals.lookup(new Pattern(source, ['x']), 0);
		expect(result).toBeDefined();
		expect(result!.text()).toContain('asinh(');
	});


	it.each([
		['1/(x*sqrt(3-12/x^2))', 'x>3', 'acosh(x/2)/sqrt(3)', 4],
		['-1/(x*sqrt(3-12/x^2))', 'x< -3', '-acosh(-x/2)/sqrt(3)', -4],
		['1/(x*sqrt(3+12/x^2))', 'x>0', 'asinh(x/2)/sqrt(3)', 2],
		['1/(x*sqrt(3+12/x^2))', 'x<0', 'asinh(-x/2)/sqrt(3)', -2],
	])('preserves coefficient scaling for %s under %s', (input, condition, expected, sample) => {
		assume(condition);
		const source = Expression.create(input);
		const result = tableOfIntegrals.lookup(new Pattern(source, ['x']), 0);
		expect(result).toBeDefined();
		expect(result!.eq(Expression.create(expected))).toBe(true);
		const residual = diff(result!, 'x').minus(source);
		const value = Number(residual.evaluate({ x: sample }).text({ decimal: true }));
		expect(Number.isFinite(value)).toBe(true);
		expect(value).toBeCloseTo(0, 8);
	});

	it('does not treat an assumed positive x as sufficient for a decreasing radical', () => {
		assume('x>0');
		const source = Expression.create('1/(x*sqrt(3-12/x^2))');
		expect(tableOfIntegrals.lookup(new Pattern(source, ['x']), 0)).toBeUndefined();
	});

	it('preserves symbolic coefficient scaling on both real branches', () => {
		assume('a>0');
		assume('b>0');
		assume('x<0');
		const source = Expression.create('1/(x*sqrt(a+b/x^2))');
		const result = tableOfIntegrals.lookup(new Pattern(source, ['x']), 0);
		expect(result).toBeDefined();
		const residual = diff(result!, 'x').minus(source);
		const numeric = residual.evaluate({ a: 3, b: 12, x: -2 });
		const value = Number(numeric.text({ decimal: true }));
		expect(Number.isFinite(value)).toBe(true);
		expect(value).toBeCloseTo(0, 8);
	});

	it('declines symbolic coefficients of unknown sign', () => {
		assume('x>0');
		const source = Expression.create('1/(x*sqrt(a+b/x^2))');
		expect(tableOfIntegrals.lookup(new Pattern(source, ['x']), 0)).toBeUndefined();
	});
});
