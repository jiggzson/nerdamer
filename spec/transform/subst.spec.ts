'use strict';

import { Expression } from '../../src/core/classes/expression/Expression';
import { one } from '../../src/core/classes/expression/shortcuts';
import { _ } from '../../src/core/classes/parser/helpers';
import { uSub, uUnSub, uSubFN, subRadicals, uSubEXP } from '../../src/core/functions/subst';
import { polynomialize } from '../../src/core/functions/subst';

describe('Subst', () => {
	it('should perform substitutions correctly', () => {
		expect(one().subst('1', 'u').text()).toEqual('1');
		expect(Expression.create('cos(x+1)^x').subst('x', 'u').text()).toEqual('cos(1+u)^u');
		expect(Expression.create('x+1').subst('x+1', 'u').text()).toEqual('u');
		expect(Expression.create('cos(x)+b+a').subst('cos(x)+b', 't').text()).toEqual('a+t');
		expect(Expression.create('2*(x+y+1+t)^6').subst('x+1', 'u').text()).toEqual('2*(t+y+u)^6');
		expect(Expression.create('-x-1').subst('x+1', 't').text()).toEqual('-t');
		expect(Expression.create('2*(a+1)^2*(t+b)^x').subst('a+1', 'u').text()).toEqual(
			'2*u^2*(b+t)^x'
		);
		expect(Expression.create('2*(a+1)^2*(a+1)^x').subst('a+1', 'u').text()).toEqual(
			'2*u^(2+x)'
		);
		expect(Expression.create('2*(a*t+a)^3').subst('a*t', 'u').text()).toEqual('2*(a+u)^3');
		expect(Expression.create('2*((a+t)^2+(x+1))^3').subst('a+t', 'u').text()).toEqual(
			'2*(x+u^2+1)^3'
		);
		expect(Expression.create('8*(a*t)^x').subst('a*t', 'u').text()).toEqual('8*u^x');
		expect(Expression.create('2*((a*t)^x*(x*y)^2)^3').subst('a*t', 'u').text()).toEqual(
			'2*x^6*y^6*u^(3*x)'
		);
		expect(Expression.create('2*cos(x)^2').subst('cos(x)', 'u').text()).toEqual('2*u^2');
		expect(Expression.create('2*cos(cos(x))^2').subst('cos(x)', 'u').text()).toEqual(
			'2*cos(u)^2'
		);
		expect(Expression.create('2*cos(3-cos(x))^2').subst('cos(x)', 'u').text()).toEqual(
			'2*cos(3-u)^2'
		);
	});

	it('should perform u-substitutions correctly', () => {
		// Setup the parameters for the tests
		const value = Expression.create('cos(x)');
		const expr = Expression.create('cos(x)^2+cos(x)+1+x^x');
		const [subbed, map] = uSub(expr, value);
		const [subbed2] = uSub(subbed, Expression.create('x^x'), map);
		const finalExpr = uUnSub(subbed2, map);

		expect(subbed.text()).toEqual('u0+u0^2+x^x+1');
		expect(subbed2.text()).toEqual('u1+u0+u0^2+1');
		expect(finalExpr.eq(expr)).toBe(true);
	});

	it('should detect collision for u-substitution', () => {
		expect(uSub('x^6-u0+8*x', 'x')[0].text()).toEqual('-u0+8*u1+u1^6');
	});

	it('should perform functions substitutions correctly', () => {
		expect(
			uSubFN(Expression.create('cos(x)^2+sqrt(x)+cos(x)+sin(x)+x-5*cos(x^2)'))[0].text()
		).toEqual('u1+u0+u0^2+x+x^(1/2)-5*u2');
		expect(uSubFN(Expression.create('cos(x)+cos(x)^2+4*cos(2*x)+1'))[0].text()).toEqual(
			'4*u0+u1+u1^2+1'
		);
	});

	it('should perform substitutions for EXP', () => {
		expect(uSubEXP(Expression.create('cos(e^x)+2^y-4+x'))[0].text()).toEqual('u0+x+cos(u1)-4');
	});

	it('should perform radical substitution', () => {
		const expression = Expression.create('(a^(1/3)+3^(3/5)+a^(3/7)+3)');
		const subbed = Expression.create('u0^3+u1^7+u1^9+3');
		const [exp, subs] = subRadicals(expression);
		expect(exp.text()).toEqual(subbed.text());
		expect(Expression.create(subbed.text(), subs).text()).toEqual(expression.text());
	});
});
describe('polynomialize', () => {
	const x = Expression.create('(cos(x)+cos(x)^2+4*cos(2*x)+1)/(e^x+log(x)-4)');
	const result = polynomialize(x)!;
	expect(result.numerator.text()).toEqual('4*u0+u1+u1^2+1');
	expect(result.denominator.text()).toEqual('u3+u2-4');
	expect(uUnSub(result.numerator as Expression, result.map).text()).toEqual(
		'4*cos(2*x)+cos(x)+cos(x)^2+1'
	);
	expect(uUnSub(result.denominator as Expression, result.map).text()).toEqual('e^x+log(x)-4');
});
