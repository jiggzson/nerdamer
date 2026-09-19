import { Equation } from '../../src/core/classes/equation/Equation';
import { Expression } from '../../src/core/classes/expression/Expression';
import { one } from '../../src/core/classes/expression/shortcuts';
import { Vector } from '../../src/core/classes/vector/Vector';
import { UnexpectedDataType, UnsupportedOperationError } from '../../src/core/errors';
import nerdamer from '../../src/index';

describe('Equation', () => {
	it('should construct and stringify (smoke)', () => {
		const e = new Equation(Expression.create('x'), one());
		expect(typeof e.text()).toBe('string');
		expect(e.toString()).toEqual(e.text());
	});

	it('should copy both sides independently', () => {
		const equation = new Equation(Expression.create('x+1'), Expression.create('y+1'));
		const copy = equation.copy();

		copy.LHS = copy.LHS.plus(1);
		copy.RHS = copy.RHS.minus(1);

		expect(copy.LHS.eq(Expression.create('x+2'))).toBe(true);
		expect(copy.RHS.eq(Expression.create('y'))).toBe(true);
		expect(equation.LHS.eq(Expression.create('x+1'))).toBe(true);
		expect(equation.RHS.eq(Expression.create('y+1'))).toBe(true);
	});

	it('should apply callbacks to both sides and require Expression results', () => {
		const equation = new Equation(Expression.create('x'), Expression.create('y'));
		const indices: Array<number | string | undefined> = [];
		const mapped = equation.each((e, i) => {
			indices.push(i);
			return (e as Expression).plus(1);
		});

		expect(indices).toEqual([0, 1]);
		expect(mapped.LHS.eq(Expression.create('x+1'))).toBe(true);
		expect(mapped.RHS.eq(Expression.create('y+1'))).toBe(true);
		expect(() => equation.each(() => new Vector([1]))).toThrow(UnexpectedDataType);
	});

	it('should reject absolute value as an equation operation', () => {
		const e = new Equation(Expression.create('x'), one());
		expect(() => e.abs()).toThrow(UnsupportedOperationError);
	});

	it('should support additive operations and legacy aliases without mutating the source', () => {
		const equation = new Equation(Expression.create('x'), one());

		expect(equation.plus(2).text()).toEqual('2+x=3');
		expect(equation.add(2).text()).toEqual('2+x=3');
		expect(equation.minus(2).text()).toEqual('-2+x=-1');
		expect(equation.subtract(2).text()).toEqual('-2+x=-1');
		expect(equation.text()).toEqual('x=1');
	});

	it('should only multiply or divide by a nonzero number', () => {
		const multiplied = new Equation(Expression.create('x'), one()).times(2);
		const divided = new Equation(Expression.create('x'), one()).div(2);

		expect(multiplied.text()).toEqual('2*x=2');
		expect(divided.text()).toEqual('(1/2)*x=1/2');
		expect(() => new Equation(Expression.create('x'), one()).times(0)).toThrow(
			UnsupportedOperationError
		);
		expect(() => new Equation(Expression.create('x'), one()).times('x')).toThrow(
			UnsupportedOperationError
		);
		expect(() => new Equation(Expression.create('x'), one()).div(0)).toThrow(
			UnsupportedOperationError
		);
		expect(() => new Equation(Expression.create('x'), one()).div('x')).toThrow(
			UnsupportedOperationError
		);
	});

	it('should keep multiply as the mutating legacy alias for times', () => {
		const equation = new Equation(Expression.create('x'), one());
		const result = equation.multiply(3);

		expect(result).toBe(equation);
		expect(equation.text()).toEqual('3*x=3');
	});

	it('should evaluate both sides without mutating the original equation', () => {
		const equation = new Equation(Expression.create('sqrt(4)'), Expression.create('1+1'));
		const originalText = equation.text();
		const evaluated = equation.evaluate();

		expect(evaluated.LHS.eq(Expression.create('sqrt(4)').evaluate())).toBe(true);
		expect(evaluated.RHS.eq(Expression.create('1+1').evaluate())).toBe(true);
		expect(equation.text()).toEqual(originalText);
		expect(evaluated).not.toBe(equation);
	});

	it('should expand both sides without mutating the original equation', () => {
		const equation = new Equation(
			Expression.create('(x+1)^2'),
			Expression.create('(x-1)^2')
		);
		const expanded = equation.expand();

		expect(expanded.LHS.eq(Expression.create('x^2+2*x+1'))).toBe(true);
		expect(expanded.RHS.eq(Expression.create('x^2-2*x+1'))).toBe(true);
		expect(equation.LHS.text()).toEqual('(1+x)^2');
		expect(equation.RHS.text()).toEqual('(-1+x)^2');
	});

	it('should compare equation residual expressions', () => {
		const lower = new Equation(Expression.create(3), Expression.create(1));
		const upper = new Equation(Expression.create(4), Expression.create(1));
		const equal = new Equation(Expression.create(5), Expression.create(3));
		const scalar = Expression.create(2);

		expect(lower.eq(equal)).toBe(true);
		expect(lower.eq(scalar)).toBe(false);
		expect(upper.gt(lower)).toBe(true);
		expect(lower.lt(upper)).toBe(true);
		expect(upper.gte(lower)).toBe(true);
		expect(lower.lte(upper)).toBe(true);
		expect(lower.gt(scalar)).toBe(false);
		expect(lower.lt(scalar)).toBe(false);
	});

	it('should rewrite to residual form without mutating the original equation', () => {
		const equation = new Equation(Expression.create('x+1'), Expression.create(3));
		const residual = equation.toLHS();

		expect(residual.LHS.eq(Expression.create('x-2'))).toBe(true);
		expect(residual.RHS.isZero()).toBe(true);
		expect(equation.text()).toEqual('1+x=3');
	});

	it('should report as Equation via duck typing', () => {
		const e = new Equation(Expression.create('x'), one());
		expect(Equation.isEquation(e)).toBe(true);
	});
});

describe('Equation regressions', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/118
	it('parses equations through the current Equation entity', () => {
		const equation = nerdamer('a+1=2');

		expect(Equation.isEquation(equation)).toBe(true);
		if (Equation.isEquation(equation)) {
			expect(equation.LHS.eq(Expression.create('a+1'))).toBe(true);
			expect(equation.RHS.eq(2)).toBe(true);
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/200
	it('applies safe scalar arithmetic to both sides of an equation', () => {
		expect(nerdamer('(a=b)+2').text()).toEqual('2+a=2+b');
		expect(nerdamer('(a=b)-2').text()).toEqual('-2+a=-2+b');
		expect(nerdamer('(a=b)*2').text()).toEqual('2*a=2*b');
		expect(nerdamer('(a=b)/2').text()).toEqual('(1/2)*a=(1/2)*b');
	});

	it('rejects equation arithmetic that can change the solution set', () => {
		expect(() => nerdamer('(a=b)*0')).toThrow(UnsupportedOperationError);
		expect(() => nerdamer('(a=b)*x')).toThrow(UnsupportedOperationError);
		expect(() => nerdamer('x*(a=b)')).toThrow(UnsupportedOperationError);
		expect(() => nerdamer('(a=b)/x')).toThrow(UnsupportedOperationError);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/200
	it('does not silently coerce equations to residual expressions inside ordinary functions', () => {
		expect(() => nerdamer('abs(a=b)')).toThrow();
		expect(() => nerdamer('sqrt(a=b)')).toThrow();
		expect(() => nerdamer('sin(a=b)')).toThrow();
		expect(() => nerdamer('sum(a=b,a,1,10)')).toThrow();
	});

	it('applies equation calculus parser functions to both sides', () => {
		const derivative = nerdamer('diff(x^2=x,x)');
		const integral = nerdamer('integrate(x=1,x)');

		expect(Equation.isEquation(derivative)).toBe(true);
		expect(Equation.isEquation(integral)).toBe(true);
		if (Equation.isEquation(derivative) && Equation.isEquation(integral)) {
			expect(derivative.LHS.eq(Expression.create('2*x'))).toBe(true);
			expect(derivative.RHS.eq(Expression.create('1'))).toBe(true);
			expect(integral.LHS.eq(Expression.create('x^2/2'))).toBe(true);
			expect(integral.RHS.eq(Expression.create('x'))).toBe(true);
		}
	});
});
