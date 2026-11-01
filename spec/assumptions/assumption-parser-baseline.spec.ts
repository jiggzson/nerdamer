import { Assumption } from '../../src/core/classes/assumption/Assumption';
import { UnexpectedInputError } from '../../src/core/errors';

/** Covers direct string assumptions parsed through shared syntax. */
describe('assumption string parsing baseline', () => {
	it.each([
		['x>0', 'x', '(0, Infinity)'],
		['x>=0', 'x', '[0, Infinity)'],
		['x<0', 'x', '(-Infinity, 0)'],
		['x<=0', 'x', '(-Infinity, 0]'],
		['x=0', 'x', '[0, 0]'],
		['x==0', 'x', '[0, 0]'],
		['  rate >= -2.5  ', 'rate', '[-2.5, Infinity)'],
		['_value9<=1e3', '_value9', '(-Infinity, 1000]'],
	])('accepts %s with the expected endpoint semantics', (source, symbol, interval) => {
		const parsed = Assumption.parse(source);
		expect(parsed.symbol).toBe(symbol);
		expect(parsed.assumption.toString()).toBe(interval);
	});

	it.each([
		['x<inf', false, false],
		['x<=+infinity', false, false],
		['x>-infinity', false, true],
		['x>=-inf', false, true],
	])('keeps infinite endpoints open for %s', (source, inclusive, lower) => {
		const assumption = Assumption.parse(source).assumption;
		const endpoint = lower ? assumption.start : assumption.end;
		expect(endpoint.value.isFinite()).toBe(false);
		expect(endpoint.inclusive).toBe(inclusive);
	});

	it('accepts exact fractions without decimal rounding', () => {
		const parsed = Assumption.parse('x=1/3');
		expect(parsed.assumption.getSingletonValue()?.getMultiplier().eq('1/3')).toBe(true);
		expect(parsed.assumption.getSingletonValue()?.getMultiplier().eq('0.33333333333333333333')).toBe(false);
		expect(Assumption.parse('y>2/3').assumption.getFiniteLowerBound()
			?.getMultiplier().eq('2/3')).toBe(true);
	});

	it('evaluates shared-syntax arithmetic with exact rational values', () => {
		const exact = Assumption.parse('x=1/3+1/6');
		expect(exact.assumption.getSingletonValue()?.getMultiplier().eq('1/2')).toBe(true);
		const nested = Assumption.parse('y>(1+2)/(3*4)');
		expect(nested.assumption.getFiniteLowerBound()?.getMultiplier().eq('1/4')).toBe(true);
	});

	it.each([
		['x=1/0'],
		['x=0/0'],
		['x=(2-2)/(3-3)'],
		['x=1/(2-2)'],
	])('rejects zero denominators: %s', source => {
		expect(() => Assumption.parse(source)).toThrow();
	});

	it.each([
		'x=2^(1/2)',
		'x=(-2)^(1/2)',
		'x=0^0',
		'x=2^(4^(1/2))',
		'x=2^((9/4)^(1/2))',
		'x=sqrt(4)',
		'x=pi',
	])('rejects fractional, undefined, or symbolic powers: %s', source => {
		expect(() => Assumption.parse(source)).toThrow();
	});

	it.each([
		['x=2^3', '8'],
		['x=2^-3', '1/8'],
		['x=(2/3)^3', '8/27'],
		['x=2^(1+2)', '8'],
		['x=(-2)^3', '-8'],
		['x=2^(2^3)', '256'],
	])('evaluates integer powers exactly: %s', (source, expected) => {
		const parsed = Assumption.parse(source);
		expect(parsed.assumption.getSingletonValue()?.getMultiplier().eq(expected)).toBe(true);
	});

	it('preserves exact negative rational arithmetic', () => {
		const parsed = Assumption.parse('x=-(1/3+1/6)');
		expect(parsed.assumption.getSingletonValue()?.getMultiplier().eq('-1/2')).toBe(true);
	});

	it('preserves long decimal bounds exactly', () => {
		const value = '0.123456789012345678901234567890123456789';
		const parsed = Assumption.parse(`x==${value}`);
		expect(parsed.assumption.getSingletonValue()?.getMultiplier().eq(value)).toBe(true);
	});

	it.each(['x=y+1', 'x>sqrt(2)', 'x=2^(1/2)'])(
		'does not evaluate arithmetic or symbolic string bounds: %s',
		source => {
			expect(() => Assumption.parse(source)).toThrow();
		}
	);

	it.each(['x>y', 'x=2^(1/2)', '2x>0'])(
		'uses a structured error for unsupported assumption input: %s',
		source => {
			expect(() => Assumption.parse(source)).toThrow(UnexpectedInputError);
		}
	);

	it.each([
		'', 'x', 'x>', '>=3', '2x>0', 'x?3',
		'x>y', 'x<y+1', 'x^2<3',
		'0<x<2', 'x>0 and y<3', 'integer(x)',
	])('currently rejects %s rather than registering a numeric interval', source => {
		expect(() => Assumption.parse(source)).toThrow();
	});
});
