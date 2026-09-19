import { ilaplace } from '../../../src/calculus/laplace/ilaplace';
import { laplace } from '../../../src/calculus/laplace/laplace';
import { Expression } from '../../../src/core/classes/expression/Expression';
import { ILAPLACE } from '../../../src/core/classes/parser/constants';
import nerdamer from '../../../src/index';

const text = (expr: string | number) => Expression.create(expr).text();

describe('Inverse Laplace', () => {
	it('round trip checks', () => {
		expect(ilaplace(laplace('t', 't', 's'), 's', 't').text()).toEqual(text('t'));
		expect(ilaplace(laplace('e^t', 't', 's'), 's', 't').text()).toEqual(text('e^t'));
		expect(ilaplace(laplace('sin(t)', 't', 's'), 's', 't').text()).toEqual(text('sin(t)'));
		expect(ilaplace(laplace('cos(t)', 't', 's'), 's', 't').text()).toEqual(text('cos(t)'));
		expect(ilaplace(laplace('t*sin(t)', 't', 's'), 's', 't').text()).toEqual(text('t*sin(t)'));
		expect(ilaplace(laplace('e^t*sin(t)', 't', 's'), 's', 't').text()).toEqual(
			text('e^t*sin(t)')
		);
		expect(ilaplace(laplace('e^t*cos(t)', 't', 's'), 's', 't').text()).toEqual(
			text('e^t*cos(t)')
		);
		expect(
			ilaplace(laplace('(1/2)*sin(t)+(-1/2)*t*cos(t)', 't', 's'), 's', 't').text()
		).toEqual(text('(1/2)*sin(t)+(-1/2)*t*cos(t)'));
	});

	it('should correctly calculate inverse laplace', () => {
		expect(ilaplace('(-1+s)^-2', 's', 't').text()).toEqual(text('t*e^t'));
		expect(ilaplace('(-1+s)^-3', 's', 't').text()).toEqual(text('(1/2)*t^2*e^t'));
		expect(ilaplace('2*(-3+2*s)^-2', 's', 't').text()).toEqual(text('(1/2)*t*e^((3/2)*t)'));
		expect(ilaplace('(1+s^2)^-2', 's', 't').text()).toEqual(
			text('(1/2)*sin(t)+(-1/2)*t*cos(t)')
		);
		expect(ilaplace('((4+s^2)^-2)', 's', 't').text()).toEqual(
			text('(1/16)*sin(2*t)+(-1/8)*t*cos(2*t)')
		);
	});

	it('handles shifted quadratic denominator power 2', () => {
		expect(ilaplace('(1+(-1+s)^2)^-2', 's', 't').text()).toEqual(
			text('(1/2)*e^t*(sin(t)-t*cos(t))')
		);
	});

	it('handles shifted quadratic numerator with denominator power 2', () => {
		expect(ilaplace('(-1+s)*((1+(-1+s)^2)^-2)', 's', 't').text()).toEqual(
			text('(1/2)*t*e^t*sin(t)')
		);
	});
});

describe('shifted quadratic denominator power 2 (scaled)', () => {
	it('handles base form', () => {
		expect(ilaplace('(4+(2*s-2)^2)^-2', 's', 't').text()).toEqual(
			text('(1/32)*e^t*(sin(t)-t*cos(t))')
		);
	});

	it('handles linear numerator', () => {
		expect(ilaplace('(2*s-2)*((4+(2*s-2)^2)^-2)', 's', 't').text()).toEqual(
			text('(1/16)*t*e^t*sin(t)')
		);
	});

	it('handles squared numerator', () => {
		expect(ilaplace('((2*s-2)^2)*((4+(2*s-2)^2)^-2)', 's', 't').text()).toEqual(
			text('(1/8)*e^t*(sin(t)+t*cos(t))')
		);
	});

	it('handles shifted quadratic denominator power 2', () => {
		expect(ilaplace('(1+(-1+s)^2)^-2', 's', 't').text()).toEqual(
			text('(1/2)*e^t*(sin(t)-t*cos(t))')
		);
	});

	it('handles shifted quadratic linear numerator with denominator power 2', () => {
		expect(ilaplace('(-1+s)*((1+(-1+s)^2)^-2)', 's', 't').text()).toEqual(
			text('(1/2)*t*e^t*sin(t)')
		);
	});

	it('handles shifted quadratic squared numerator with denominator power 2', () => {
		expect(ilaplace('((-1+s)^2)*((1+(-1+s)^2)^-2)', 's', 't').text()).toEqual(
			text('(1/2)*e^t*(sin(t)+t*cos(t))')
		);
	});
	it('handles scaled shifted quadratic denominator power 2', () => {
		expect(ilaplace('(4+(2*s-2)^2)^-2', 's', 't').text()).toEqual(
			text('(1/32)*e^t*(sin(t)-t*cos(t))')
		);
	});

	it('handles scaled shifted quadratic linear numerator with denominator power 2', () => {
		expect(ilaplace('(2*s-2)*((4+(2*s-2)^2)^-2)', 's', 't').text()).toEqual(
			text('(1/16)*t*e^t*sin(t)')
		);
	});

	it('handles scaled shifted quadratic squared numerator with denominator power 2', () => {
		expect(ilaplace('((2*s-2)^2)*((4+(2*s-2)^2)^-2)', 's', 't').text()).toEqual(
			text('(1/8)*e^t*(sin(t)+t*cos(t))')
		);
	});

	it('handles shifted hyperbolic denominator power 1', () => {
		expect(ilaplace('((-1+s)^2-1)^-1', 's', 't').text()).toEqual(text('e^t*sinh(t)'));
	});

	it('handles shifted hyperbolic linear numerator with denominator power 1', () => {
		expect(ilaplace('(-1+s)*((-1+(-1+s)^2)^-1)', 's', 't').text()).toEqual(text('e^t*cosh(t)'));
	});

	it('handles shifted hyperbolic denominator power 2', () => {
		expect(ilaplace('((-1+(-1+s)^2)^-2)', 's', 't').text()).toEqual(
			text('(1/2)*e^t*(-sinh(t)+t*cosh(t))')
		);
	});

	it('handles shifted hyperbolic linear numerator with denominator power 2', () => {
		expect(ilaplace('(-1+s)*((-1+(-1+s)^2)^-2)', 's', 't').text()).toEqual(
			text('(1/2)*t*e^t*sinh(t)')
		);
	});

	it('handles scaled shifted hyperbolic linear numerator with denominator power 2', () => {
		expect(ilaplace('(2*s-2)*((-4+(2*s-2)^2)^-2)', 's', 't').text()).toEqual(
			text('(1/16)*t*e^t*sinh(t)')
		);
	});

	it('handles shifted hyperbolic denominator power 1', () => {
		expect(ilaplace('((-1+s)^2-1)^-1', 's', 't').text()).toEqual(text('e^t*sinh(t)'));
	});

	it('handles shifted hyperbolic linear numerator with denominator power 1', () => {
		expect(ilaplace('(-1+s)*((-1+(-1+s)^2)^-1)', 's', 't').text()).toEqual(text('e^t*cosh(t)'));
	});

	it('handles shifted hyperbolic denominator power 2', () => {
		expect(ilaplace('((-1+(-1+s)^2)^-2)', 's', 't').text()).toEqual(
			text('(1/2)*e^t*(-sinh(t)+t*cosh(t))')
		);
	});

	it('handles shifted hyperbolic linear numerator with denominator power 2', () => {
		expect(ilaplace('(-1+s)*((-1+(-1+s)^2)^-2)', 's', 't').text()).toEqual(
			text('(1/2)*t*e^t*sinh(t)')
		);
	});

	it('handles scaled shifted hyperbolic linear numerator with denominator power 2', () => {
		expect(ilaplace('(2*s-2)*((-4+(2*s-2)^2)^-2)', 's', 't').text()).toEqual(
			text('(1/16)*t*e^t*sinh(t)')
		);
	});

	it('handles shifted hyperbolic squared numerator with denominator power 2', () => {
		expect(ilaplace('(1+(-1+s)^2)*((-1+(-1+s)^2)^-2)', 's', 't').text()).toEqual(
			text('e^t*sinh(t)+e^t*(-sinh(t)+t*cosh(t))')
		);
	});

	it('round trips e^t*sinh(t)', () => {
		expect(ilaplace(laplace('e^t*sinh(t)', 't', 's'), 's', 't').text()).toEqual(
			text('e^t*sinh(t)')
		);
	});

	it('round trips e^t*cosh(t)', () => {
		expect(ilaplace(laplace('e^t*cosh(t)', 't', 's'), 's', 't').text()).toEqual(
			text('e^t*cosh(t)')
		);
	});

	it('round trips t*e^t*sinh(t)', () => {
		expect(ilaplace(laplace('t*e^t*sinh(t)', 't', 's'), 's', 't').text()).toEqual(
			text('t*e^t*sinh(t)')
		);
	});

	it('round trips t*e^t*cosh(t)', () => {
		expect(ilaplace(laplace('t*e^t*cosh(t)', 't', 's'), 's', 't').text()).toEqual(
			text('e^t*sinh(t)+e^t*(-sinh(t)+t*cosh(t))')
		);
	});
});

describe('Inverse Laplace regressions', () => {
	it('preserves unsupported transforms instead of entering polynomial partial fractions', () => {
		const source = Expression.create('laplace(sin(t^2),t,s)/(s+1)');
		const result = ilaplace(source, 's', 't');

		expect(result.isFunction(ILAPLACE)).toBe(true);
		expect(result.getArguments()[0].eq(source)).toBe(true);
	});

	// Regression: https://github.com/together-science/nerdamer-prime/issues/14
	it('inverts 1/[s(s+1)^2]', () => {
		const actual = nerdamer.ilaplace('1/(s^3+2*s^2+s)', 's', 't');
		const expected = Expression.create('1-e^(-t)-t*e^(-t)');
		expect(actual.minus(expected).simplify().text()).toEqual('0');
	});

	it('handles inverse Laplace transforms with irreducible shifted quadratics', () => {
		const actual = nerdamer.ilaplace('1/(s*(s^2+4*s+1))', 's', 't');
		const expected = Expression.create(
			'1-e^(-2*t)*cosh(sqrt(3)*t)-(2/sqrt(3))*e^(-2*t)*sinh(sqrt(3)*t)'
		);
		expect(actual.minus(expected).simplify().text()).toEqual('0');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/471
	it('handles inverse Laplace transforms with decimal coefficients and rational shifts', () => {
		const result = ilaplace(
			'(0.70193)/(s-(181/41))+(0.2685)/(s-(-242/91))',
			's',
			't'
		);

		expect(Number(result.evaluate({ t: 0 }).text())).toBeCloseTo(0.97043, 12);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/592
	it('returns the reported inverse Laplace transforms', () => {
		const first = nerdamer.ilaplace('1/(s^2+s+1)', 's', 't');
		const second = nerdamer.ilaplace('1/(s^2+2*s+1)', 's', 't');

		expect(first.minus('2/sqrt(3)*e^(-t/2)*sin(sqrt(3)*t/2)').simplify().isZero()).toBe(true);
		expect(second.minus('t*e^(-t)').simplify().isZero()).toBe(true);
	});
});
