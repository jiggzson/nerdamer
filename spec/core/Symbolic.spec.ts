'use strict';

import { Expression } from '../../src/core/classes/expression/Expression';
import { one, two } from '../../src/core/classes/expression/shortcuts';
import { contains } from '../../src/core/classes/expression/products';
import { separateVar } from '../../src/core/classes/expression/analysis';
import { Parser } from '../../src/core/classes/parser/Parser';
import { NaNError } from '../../src/core/errors';

describe('Expression', () => {
	it('should test for polynomials correctly', () => {
		expect(Expression.create('3*x^2+5*x+1').isPolynomialLike()).toBe(true);
		expect(Expression.create('x*(3*x^2+5*x+1)').isPolynomialLike()).toBe(true);
		expect(Expression.create('a*b*(3*x^2+5*x+1)').isPolynomialLike()).toBe(true);
		expect(Expression.create('1/2*a*z*x^6+a*b^3+1').isPolynomialLike()).toBe(true);
		expect(Expression.create('1/2*a*z*x^6+a*b^y+1').isPolynomialLike()).toBe(false);
		expect(Expression.create('1/2*a*cos(x)*x^6+a*b^4+1').isPolynomialLike()).toBe(false);
		expect(Expression.create('(3*x^2+5*x+1)^-1').isPolynomialLike()).toBe(false);
		expect(Expression.create('1/x').isPolynomialLike()).toBe(false);
	});

	it('should detect products within products', () => {
		expect(contains(Expression.create('a*b'), one())).toBe(true);
		expect(contains(Expression.create('a*b'), two())).toBe(false);
		expect(contains(Expression.create('a*b'), Expression.create('e'))).toBe(false);
		expect(contains(Expression.create('a*b'), Expression.create('a'))).toBe(true);
		expect(contains(Expression.create('a*b*c'), Expression.create('a*c'))).toBe(true);
		expect(contains(Expression.create('a*b*c'), Expression.create('2*a*c'))).toBe(false);
		expect(contains(Expression.create('a*b*c'), Expression.create('2*a*e'))).toBe(false);
	});

	it('should separate variables correctly', () => {
		expect(separateVar(Expression.create('5*x^2*a*b'), ['a', 'b']).toString()).toEqual(
			'5*x^2,a*b'
		);
		expect(separateVar(Expression.create('5*x^2+x'), ['x']).toString()).toEqual('x+5*x^2,1');
		expect(separateVar(Expression.create('5*x^2'), ['x']).toString()).toEqual('5,x^2');
		expect(separateVar(Expression.create('5*x*b'), ['x']).toString()).toEqual('5*b,x');
		expect(separateVar(Expression.create('5*x^x'), ['x']).toString()).toEqual('5,x^x');
		expect(separateVar(Expression.create('5*b'), ['x']).toString()).toEqual('5*b,1');
		expect(separateVar(Expression.create('5'), ['x']).toString()).toEqual('5,1');
	});

	it('should get the coefficients correctly', () => {
		expect(Expression.create('5*x^2+2*x-1').coeffs('x').text()).toEqual(
			'{ 0: -1, 1: 2, 2: 5 }'
		);
		expect(Expression.create('a*b*x^2+c*x-1+q').coeffs('x').text()).toEqual(
			'{ 0: -1+q, 1: c, 2: a*b }'
		);
		expect(Expression.create('a*b*x^2*y+c*x*y^4-y+q+9').coeffs('x', 'y').text()).toEqual(
			'{ 2,1: a*b, 1,4: c, 0,1: -1, 0,0: 9+q }'
		);
		expect(Expression.create('-2+3*z+i*(-1-11*z)').coeffs('z').text()).toEqual(
			'{ 0: -2-i, 1: 3-11*i }'
		);
	});

	it('converts sparse univariate coefficient objects to dense arrays and vectors', () => {
		const coefficients = Expression.create('3*x^2+1').coeffs('x');

		expect(coefficients.hasPower(0)).toBe(true);
		expect(coefficients.hasPower(1)).toBe(false);
		expect(coefficients.max()).toBe(2);
		expect(coefficients.toArray().map(value => value.text())).toEqual(['1', '0', '3']);
		expect(coefficients.toArray(true)).toEqual([1, 0, 3]);
		expect(coefficients.toVector().text()).toEqual('[1, 0, 3]');
	});

	it('rejects dense-array conversion for multivariate degree tuples', () => {
		const coefficients = Expression.create('x+y').coeffs('x', 'y');

		expect(Number.isNaN(coefficients.max())).toBe(true);
		expect(() => coefficients.toArray()).toThrow(NaNError);
	});

	it('combines and iterates coefficient entries through the public object', () => {
		const coefficients = Expression.create('x').coeffs('x');
		const visited: string[] = [];

		coefficients.add('1', Expression.create(2));
		expect(coefficients.getPower(1).eq(3)).toBe(true);
		expect(
			coefficients.each((value, power) => {
				visited.push(`${power}:${value.text()}`);
			})
		).toBe(coefficients);
		expect(visited).toEqual(['1:3']);
	});

	it('reconstructs coefficient objects without reparsing stored coefficients', () => {
		const variable = 'native_coeff_object_roundtrip_probe';
		const coefficients = Expression.create(`(1+${variable})*x^2+3`).coeffs('x');
		const expectedCoefficient = coefficients.getPower(2).text();
		const previous = Parser.KNOWN_VALUES[variable];

		try {
			Parser.KNOWN_VALUES[variable] = Expression.create(7);
			const expression = coefficients.toExpression();
			const polynomial = coefficients.toPolynomial();
			const quadraticTerm = polynomial.terms.find(term => term.deg('x') === 2);

			expect(expression.text()).toContain(variable);
			expect(quadraticTerm).toBeDefined();
			expect(quadraticTerm?.coeff.text()).toEqual(expectedCoefficient);
		} finally {
			if (previous === undefined) {
				delete Parser.KNOWN_VALUES[variable];
			} else {
				Parser.KNOWN_VALUES[variable] = previous;
			}
		}
	});

	it('reconstructs multivariate coefficient degree tuples independently', () => {
		const source = Expression.create('a*b*x^2*y+c*x*y^4-y+q+9');
		const coefficients = source.coeffs('x', 'y');
		const expression = coefficients.toExpression();
		const polynomial = coefficients.toPolynomial();
		const leading = polynomial.terms.find(term => term.deg('x') === 2 && term.deg('y') === 1);

		expect(expression.eq(source)).toBe(true);
		expect(Expression.create(coefficients.toParsableString()).eq(source)).toBe(true);
		expect(leading).toBeDefined();
		expect(leading?.coeff.eq('a*b')).toBe(true);
	});

	it('canonicalizes coefficient objects when coefficients contain polynomial variables', () => {
		const coefficients = Expression.create('x').coeffs('x');
		coefficients.coeffs['1'] = Expression.create('x');
		const polynomial = coefficients.toPolynomial();

		expect(polynomial.text()).toEqual('x^2');
		expect(polynomial.terms).toHaveLength(1);
		expect(polynomial.terms[0].coeff.eq(1)).toBe(true);
		expect(polynomial.terms[0].deg('x')).toBe(2);
	});
});
