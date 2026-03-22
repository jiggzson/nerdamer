import { ilaplace } from '../../../src/calculus/laplace/ilaplace';
import { laplace } from '../../../src/calculus/laplace/laplace';
import { Expression } from '../../../src/core/classes/expression/Expression';

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
