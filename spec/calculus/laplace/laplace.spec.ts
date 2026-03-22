import { laplace } from '../../../src/calculus/laplace/laplace';
import { Expression } from '../../../src/core/classes/expression/Expression';

const text = (expr: string | number) => Expression.create(expr).text();

describe('laplace', () => {
	describe('base table cases', () => {
		it('transforms constants', () => {
			expect(laplace('1', 't', 's').text()).toEqual(text('1/s'));
			expect(laplace('5*a', 't', 's').text()).toEqual(text('5*a/s'));
		});

		it('transforms powers of t', () => {
			expect(laplace('t', 't', 's').text()).toEqual(text('s^-2'));
			expect(laplace('t^2', 't', 's').text()).toEqual(text('2*s^-3'));
		});

		it('transforms exponentials', () => {
			expect(laplace('e^t', 't', 's').text()).toEqual(text('(-1+s)^-1'));
			expect(laplace('a^t', 't', 's').text()).toEqual(text('(s-log(a))^-1'));
			expect(laplace('3*b^t', 't', 's').text()).toEqual(text('3/(s-log(b))'));
		});

		it('transforms sine and cosine', () => {
			expect(laplace('sin(t)', 't', 's').text()).toEqual(text('(1+s^2)^-1'));
			expect(laplace('cos(t)', 't', 's').text()).toEqual(text('s/(1+s^2)'));
			expect(laplace('sin(3*t)', 't', 's').text()).toEqual(text('3/(s^2+9)'));
			expect(laplace('cos(3*t)', 't', 's').text()).toEqual(text('s/(s^2+9)'));
		});
	});

	describe('product table cases', () => {
		it('transforms t^n times exponentials', () => {
			expect(laplace('t*e^t', 't', 's').text()).toEqual(text('(-1+s)^-2'));
			expect(laplace('t^2*e^t', 't', 's').text()).toEqual(text('2*(-1+s)^-3'));
		});

		it('transforms t^n times sine and cosine', () => {
			expect(laplace('t*sin(t)', 't', 's').text()).toEqual(text('2*s*((1+s^2)^-2)'));
			expect(laplace('t*cos(t)', 't', 's').text()).toEqual(
				text('-(-2*s^2*((1+s^2)^-2)+(1+s^2)^-1)')
			);
		});

		it('transforms exponentials times sine and cosine', () => {
			expect(laplace('e^t*sin(t)', 't', 's').text()).toEqual(text('(1+(-1+s)^2)^-1'));
			expect(laplace('e^t*cos(t)', 't', 's').text()).toEqual(
				text('(-1+s)*((1+(-1+s)^2)^-1)')
			);
		});

		it('transforms sin(t)*cos(t)', () => {
			expect(laplace('sin(t)*cos(t)', 't', 's').text()).toEqual(text('(s^2+4)^-1'));
		});
	});

	describe('dispatcher behavior', () => {
		it('supports linear sums', () => {
			expect(laplace('t+e^t', 't', 's').text()).toEqual(text('s^-2+(-1+s)^-1'));
			expect(laplace('t^2+e^t+sin(t)', 't', 's').text()).toEqual(
				text('2*s^-3+(-1+s)^-1+(1+s^2)^-1')
			);
		});

		it('extracts symbolic constants from products and recurses', () => {
			expect(laplace('3*a*(t+e^t)', 't', 's').text()).toEqual(
				text('3*a*((-1+s)^-1)+3*a*s^-2')
			);
			expect(laplace('2*b*e^t*cos(t)', 't', 's').text()).toEqual(
				text('2*(-1+s)*((1+(-1+s)^2)^-1)*b')
			);
		});

		it('substitutes the transform variable when it is not s', () => {
			expect(laplace('e^t', 't', 'j').text()).toEqual(text('(-1+j)^-1'));
			expect(laplace('t+e^t', 't', 'j').text()).toEqual(text('j^-2+(-1+j)^-1'));
		});

		it('handles t*e^t*sin(t)', () => {
			expect(laplace('t*e^t*sin(t)', 't', 's').text()).toEqual(
				text('2*(-1+s)*((1+(-1+s)^2)^-2)')
			);
		});

		it('handles t*e^t*cos(t)', () => {
			expect(laplace('t*e^t*cos(t)', 't', 's').text()).toEqual(
				text('(-1+(-1+s)^2)*((1+(-1+s)^2)^-2)')
			);
		});

		it('expands products before lookup', () => {
			expect(laplace('e^t*(sin(t)-t*cos(t))', 't', 's').text()).toEqual(
				laplace('(sin(t)-t*cos(t))*e^t', 't', 's').text()
			);
		});
		it('handles e^t*sinh(t)', () => {
			expect(laplace('e^t*sinh(t)', 't', 's').text()).toEqual(text('(-1+(-1+s)^2)^-1'));
		});

		it('handles e^t*cosh(t)', () => {
			expect(laplace('e^t*cosh(t)', 't', 's').text()).toEqual(
				text('(-1+s)*((-1+(-1+s)^2)^-1)')
			);
		});

		it('handles t*e^t*sinh(t)', () => {
			expect(laplace('t*e^t*sinh(t)', 't', 's').text()).toEqual(
				text('2*(-1+s)*((-1+(-1+s)^2)^-2)')
			);
		});

		it('handles t*e^t*cosh(t)', () => {
			expect(laplace('t*e^t*cosh(t)', 't', 's').text()).toEqual(
				text('(1+(-1+s)^2)*((-1+(-1+s)^2)^-2)')
			);
		});

		it('handles e^t*sinh(t)', () => {
			expect(laplace('e^t*sinh(t)', 't', 's').text()).toEqual(text('(-1+(-1+s)^2)^-1'));
		});

		it('handles e^t*cosh(t)', () => {
			expect(laplace('e^t*cosh(t)', 't', 's').text()).toEqual(
				text('(-1+s)*((-1+(-1+s)^2)^-1)')
			);
		});

		it('handles t*e^t*sinh(t)', () => {
			expect(laplace('t*e^t*sinh(t)', 't', 's').text()).toEqual(
				text('2*(-1+s)*((-1+(-1+s)^2)^-2)')
			);
		});

		it('handles t*e^t*cosh(t)', () => {
			expect(laplace('t*e^t*cosh(t)', 't', 's').text()).toEqual(
				text('(1+(-1+s)^2)*((-1+(-1+s)^2)^-2)')
			);
		});
	});
});
