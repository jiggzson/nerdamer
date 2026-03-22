'use strict';

import { Expression } from '../../src/core/classes/expression/Expression';
import { one, two } from '../../src/core/classes/expression/shortcuts';
import { contains } from '../../src/core/classes/expression/products';
import { separateVar } from '../../src/core/classes/expression/analysis';

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
	});
});
