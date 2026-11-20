import { Expression } from '../../src/core/classes/expression/Expression';
import { taylor } from '../../src/api/calculus';
import { scopedBlock, Settings } from '../../src/core/Settings';
import nerdamer from '../../src/index';

describe('Finite Taylor polynomials', () => {
	it('constructs exact Maclaurin polynomials and exposes parser notation', () => {
		const sine = taylor('sin(x)', 'x', 0, 5);
		expect(sine.minus('x-x^3/6+x^5/120').expand().isZero()).toBe(true);
		expect(nerdamer('taylor(sin(x),x,0,5)').text()).toBe(sine.text());
		expect(taylor('exp(x)', 'x', 0, 4)
			.minus('1+x+x^2/2+x^3/6+x^4/24').expand().isZero()).toBe(true);
	});

	it('supports nonzero and symbolic centers without decimalizing coefficients', () => {
		expect(taylor('log(x)', 'x', 1, 3)
			.minus('(x-1)-(x-1)^2/2+(x-1)^3/3').expand().isZero()).toBe(true);
		expect(taylor('sin(pi*x)', 'x', 0, 1).minus('pi*x').expand().isZero()).toBe(true);
		expect(taylor('x^2', 'x', 'a', 100).minus('x^2').expand().isZero()).toBe(true);
	});

	it('preserves the entire call when differentiation is unsupported', () => {
		expect(taylor('sinc(x)', 'x', 0, 3).text()).toBe('taylor(sinc(x), x, 0, 3)');
		const unknown = Expression.toFunction('f', [Expression.Variable('x')]);
		expect(taylor(unknown, 'x', 'a', 3).text()).toBe('taylor(f(x), x, a, 3)');
		expect(taylor(unknown, 'x', 'a', 0).text()).toBe('taylor(f(x), x, a, 0)');
		expect(taylor('sin(x)', 'x', 0, 'n').text()).toBe('taylor(sin(x), x, 0, n)');
	});

	it('preserves the call rather than returning coefficients at a singular center', () => {
		expect(taylor('log(x)', 'x', 0, 3).text()).toBe('taylor(log(x), x, 0, 3)');
		expect(taylor('abs(x)', 'x', 0, 2).text()).toBe('taylor(abs(x), x, 0, 2)');
	});

	it('rejects invalid numeric orders and bounds expensive requests', () => {
		expect(() => taylor('sin(x)', 'x', 0, -1)).toThrow();
		expect(() => taylor('sin(x)', 'x', 0, '3/2')).toThrow();
		expect(taylor('sin(x)', 'x', 0, 65).text()).toBe('taylor(sin(x), x, 0, 65)');
	});
});

describe('Taylor stress and termination', () => {
	it.each([0, 1, 2, 4, 8, 12])('matches the geometric series exactly through degree %i', degree => {
		let expected = Expression.create(0);
		for (let k = 0; k <= degree; k++) {
			expected = expected.plus(Expression.create('x').pow(k));
		}
		const actual = taylor('1/(1-x)', 'x', 0, degree);
		expect(actual.isFunction('taylor')).toBe(false);
		expect(actual.minus(expected).expand().isZero()).toBe(true);
	});

	it.each([0, 1, 2, 5, 10])('reconstructs a polynomial of degree ten at order %i', degree => {
		const original = Expression.create('3*x^10-2*x^7+x^3-5*x+8');
		const approx = taylor(original, 'x', 0, degree);
		let expected = Expression.create(8);
		if (degree >= 1) {
			expected = expected.minus(Expression.create('5*x'));
		}
		if (degree >= 3) {
			expected = expected.plus(Expression.create('x^3'));
		}
		if (degree >= 7) {
			expected = expected.minus(Expression.create('2*x^7'));
		}
		if (degree >= 10) {
			expected = expected.plus(Expression.create('3*x^10'));
		}
		expect(approx.minus(expected).expand().isZero()).toBe(true);
	});

	it('terminates an exact polynomial after its final nonzero derivative', () => {
		const polynomial = '5*x^20+3*x^4-7';
		const actual = taylor(polynomial, 'x', 0, 100);
		expect(actual.isFunction('taylor')).toBe(false);
		expect(actual.minus(polynomial).expand().isZero()).toBe(true);
	});

	it('handles a nonzero center without expanding the shifted powers prematurely', () => {
		const actual = taylor('1/x', 'x', 2, 4);
		const expected = '1/2-(x-2)/4+(x-2)^2/8-(x-2)^3/16+(x-2)^4/32';
		expect(actual.isFunction('taylor')).toBe(false);
		expect(actual.minus(expected).expand().isZero()).toBe(true);
	});

	it('retains all-or-nothing fallback after valid earlier coefficients', () => {
		expect(taylor('x+sinc(x)', 'x', 0, 4).isFunction('taylor')).toBe(true);
		expect(taylor('log(x)', 'x', 0, 0).isFunction('taylor')).toBe(true);
		expect(taylor('1/(x-1)', 'x', 1, 3).isFunction('taylor')).toBe(true);
	});

	it('is stable across repeated invocations and does not mutate its input', () => {
		const expr = Expression.create('exp(x)+sin(x)');
		const before = expr.text();
		const first = taylor(expr, 'x', 0, 8);
		const second = taylor(expr, 'x', 0, 8);
		expect(first.eq(second)).toBe(true);
		expect(expr.text()).toBe(before);
	});

	it('does not return partial coefficients beyond the iterative budget', () => {
		expect(taylor('exp(x)', 'x', 0, 65).isFunction('taylor')).toBe(true);
		expect(taylor('x^3+2', 'x', 0, 1000).minus('x^3+2').isZero()).toBe(true);
	});
});

describe('Taylor evaluation settings', () => {
	it('keeps exact coefficients and restores the caller evaluation setting', () => {
		const before = Settings.EVALUATE;
		scopedBlock('EVALUATE', true, () => {
			const actual = taylor('sin(x)', 'x', 0, 5);
			expect(actual.minus('x-x^3/6+x^5/120').expand().isZero()).toBe(true);
			expect(Settings.EVALUATE).toBe(true);
			expect(taylor('sinc(x)', 'x', 0, 4).isFunction('taylor')).toBe(true);
			expect(Settings.EVALUATE).toBe(true);
		});
		expect(Settings.EVALUATE).toBe(before);
	});
});
