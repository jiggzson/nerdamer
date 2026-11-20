import '../helpers/registerNerdamerFunctions';
import { Expression } from '../../src/core/classes/expression/Expression';
import { Polynomial } from '../../src/core/classes/polynomial/Polynomial';
import { divide } from '../../src/core/classes/polynomial/utils';
import nerdamer from '../../src/index';

describe('Powers of products', () => {
	it.each([
		['(x*y)*(x*y)', 'x^2*y^2'],
		['(x*y)*(2*x*y)', '2*x^2*y^2'],
		['(x*y)*(x*y)-x^2*y^2', '0'],
		['(x*y)*(x*y)+x^2*y^2', '2*x^2*y^2'],
		['(2*x)*(2*x)-4*x^2', '0'],
		['div((x*y)*(x*y), x)', '[x*y^2, 0]'],
		// A non-integer power stays on the product to keep the principal branch.
		['(x*y)^(1/2)', '(x*y)^(1/2)'],
		['sqrt(x*y)*sqrt(x*y)', 'x*y'],
	])('evaluates %s to %s', (source, expected) => {
		expect(nerdamer(source).text()).toBe(expected);
	});

	it('distributes an integer power when multiplying expressions', () => {
		const xy = Expression.create('x*y');
		const square = xy.times(xy);
		expect(square.text()).toBe('x^2*y^2');
		expect(square.minus(Expression.create('x^2*y^2')).isZero()).toBe(true);
	});

	it.each([
		['x*y', '3', '1', { x: 3, y: 3 }],
		['-4*x*y', '2', '-4', { x: 2, y: 2 }],
		['2*x*y^2', '2', '2', { x: 2, y: 4 }],
	])(
		'reads the coefficients of %s with its product raised to %s',
		(base, exponent, coefficient, powers) => {
			// Build the powered product directly, since the parser distributes the power. The
			// multiplier stays outside the power, so -4*x*y to the power 2 is -4*(x*y)^2.
			const product = Expression.setPower(
				Expression.create(base),
				Expression.create(exponent)
			);
			const polynomial = Polynomial.toPolynomial(product, 'lex', ['x', 'y']);
			expect(polynomial.terms).toHaveLength(1);
			expect(polynomial.terms[0].coeff.text()).toBe(coefficient);
			expect(polynomial.terms[0].powers).toEqual(powers);
		}
	);

	it('divides a dividend built from products exactly', () => {
		const E = (s: string) => Expression.create(s);
		const dividend = E('(-x-y)*(-x-y+2)-(-2*x-2*y+1)*(-2*x+2*y+1)')
			.times(E('(-2*x+2*y+2)*(-x-y+2)-x*(1+2*y)'))
			.minus(
				E('(2*x-y)*(-x-y+2)-(-2*x-2*y+1)*(1+2*y)').times(E('-2*y*(-x-y+2)-x*(-2*x+2*y+1)'))
			);
		const [q, r] = divide(dividend, E('-x-y+2'));
		expect(r.isZero()).toBe(true);
		// The quotient from SymPy 1.14.
		const expected = E('2*x^3-6*x^2*y-7*x^2+24*x*y+6*x+20*y^3+2*y^2-8*y-2');
		expect(q.minus(expected).expand().isZero()).toBe(true);
	});
});
