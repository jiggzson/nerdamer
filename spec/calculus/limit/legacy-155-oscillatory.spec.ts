import { Expression } from '../../../src/core/classes/expression/Expression';
import nerdamer from '../../../src/index';

// The root package registers parser functions before the direct calculus API is used.
const { limit } = nerdamer;

describe('legacy #155 oscillatory limits at infinity', () => {
	// Bounded oscillatory exponents are not exponentially growing or decaying.
	it('parses trigonometric calls as functions, not products', () => {
		expect(Expression.create('sin(x)').isFunction('sin')).toBe(true);
	});


	it('does not infer divergence for a bounded oscillating trigonometric function', () => {
		expect(limit('sin(x)', 'x', 'Infinity').isFunction('limit')).toBe(true);
		expect(limit('cos(x)', 'x', 'Infinity').isFunction('limit')).toBe(true);
	});

	it('does not infer growth for the exponential of an oscillatory exponent', () => {
		expect(limit('e^(sin(x))', 'x', 'Infinity').isFunction('limit')).toBe(true);
	});

	it('does not invent a limit for a bounded oscillatory exponent', () => {
		const result = limit('e^(-sin(x))', 'x', 'Infinity');
		expect(result.isFunction('limit')).toBe(true);
	});

	it('does not drop oscillatory exponential factors in a quotient', () => {
		const result = limit(
			'(x+sin(x)*cos(x))/(x+sin(x)*cos(x))/e^(sin(x))',
			'x',
			'Infinity'
		);
		expect(result.isFunction('limit')).toBe(true);
	});

	it('retains exponential decay for exponents with established growth', () => {
		expect(limit('e^(-x)', 'x', 'Infinity').isZero()).toBe(true);
		expect(limit('e^(-3*x)/x', 'x', 'Infinity').isZero()).toBe(true);
		expect(limit('x/e^x', 'x', 'Infinity').isZero()).toBe(true);
	});
});
