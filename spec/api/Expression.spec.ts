import { Equation } from '../../src/core/classes/equation/Equation';
import { Expression } from '../../src/core/classes/expression/Expression';
import { Parser } from '../../src/core/classes/parser/Parser';
import { solve } from '../../src/solve/solve';
import '../../src/index';

describe('Expression public API compatibility', () => {
	it('keeps the compatibility arithmetic method aliases available', () => {
		const expression = Expression.create('x');

		expect(expression.add(2).text()).toEqual(expression.plus(2).text());
		expect(expression.subtract(2).text()).toEqual(expression.minus(2).text());
		expect(expression.multiply(2).text()).toEqual(expression.times(2).text());
		expect(expression.divide(2).text()).toEqual(expression.div(2).text());
		expect(expression.pow(2).text()).toEqual('x^2');
	});

	it('keeps the compatibility substitution and fraction aliases available', () => {
		const expression = Expression.create('(x+1)/y');

		expect(expression.sub('x+1', 'u').text()).toEqual(expression.subst('x+1', 'u').text());
		expect(expression.numerator().text()).toEqual(expression.getNumerator().text());
		expect(expression.denominator().text()).toEqual(expression.getDenominator().text());
	});

	it('keeps the compatibility conversion and numeric inspection methods available', () => {
		const numeric = Expression.create('1/2');
		const symbolic = Expression.create('x+1/2');

		expect(numeric.toString()).toEqual('1/2');
		expect(numeric.valueOf()).toBe(0.5);
		expect(symbolic.valueOf()).toEqual('0.5+x');
		expect(numeric.toDecimal()).toEqual('0.5');
		expect(Expression.create('1/3').toDecimal(5)).toEqual('0.33333');
		expect(numeric.isNumber()).toBe(true);
		expect(Expression.create('sqrt(5)').isNumber()).toBe(false);
		expect(Expression.create('sqrt(-5)+8').isImaginary()).toBe(true);
		expect(Expression.create('sqrt(5)+8').isImaginary()).toBe(false);
	});

	it('keeps legacy expression convenience methods available', () => {
		const expression = Expression.create('x+1');
		const integral = Expression.toFunction('integrate', [
			Expression.Variable('x'),
			Expression.Variable('x'),
		]);

		expect(expression.latex()).toEqual(expression.toTeX());
		expect(Expression.Inf().isInfinity()).toBe(true);
		expect(Expression.create('3/2*x').isFraction()).toBe(true);
		expect(Expression.create('2*x').isFraction()).toBe(false);
		expect(integral.hasIntegral()).toBe(true);

		const equation = expression.equals(3);
		expect(Equation.isEquation(equation)).toBe(true);
		expect(equation.text()).toEqual('1+x=3');
		expect(expression.eq('x+1')).toBe(true);
	});

	it('keeps the compatibility solveFor method available on expressions and equations', () => {
		const expression = Expression.create('x^2-4');
		const equation = Parser.parse('x^2=4');

		expect(expression.solveFor('x').text()).toEqual(solve(expression, 'x').text());
		expect(Equation.isEquation(equation)).toBe(true);
		if (Equation.isEquation(equation)) {
			expect(equation.solveFor('x').text()).toEqual(solve(equation, 'x').text());
		}
	});
});
