import { Expression } from '../../src/core/classes/expression/Expression';
import { Matrix } from '../../src/core/classes/matrix/Matrix';
import { callFunction } from '../../src/core/classes/parser/operations/functions';
import { Parser } from '../../src/core/classes/parser/Parser';
import { Vector } from '../../src/core/classes/vector/Vector';
import { DimensionError } from '../../src/core/errors';

describe('Element-wise function distribution', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/106
	it('differentiates vectors element-wise', () => {
		const result = Parser.parse('diff([x,x^2,3],x)');

		expect(Vector.isVector(result)).toBe(true);
		if (Vector.isVector(result)) {
			expect(result.count()).toBe(3);
			expect(result.at(0)?.eq(Expression.create(1))).toBe(true);
			expect(result.at(1)?.eq(Expression.create('2*x'))).toBe(true);
			expect(result.at(2)?.eq(Expression.create(0))).toBe(true);
		}
	});

	it('integrates vectors element-wise', () => {
		const result = Parser.parse('integrate([x,x^2,3],x)');

		expect(Vector.isVector(result)).toBe(true);
		if (Vector.isVector(result)) {
			expect(result.at(0)?.eq(Expression.create('x^2/2'))).toBe(true);
			expect(result.at(1)?.eq(Expression.create('x^3/3'))).toBe(true);
			expect(result.at(2)?.eq(Expression.create('3*x'))).toBe(true);
		}
	});

	it('applies ordinary scalar functions to vectors element-wise', () => {
		const absResult = Parser.parse('abs([-2,x,-3])');
		const fibResult = Parser.parse('fib([1,2,3,10])');

		expect(Vector.isVector(absResult)).toBe(true);
		if (Vector.isVector(absResult)) {
			expect(absResult.count()).toBe(3);
			expect(absResult.at(0)?.eq(Expression.create(2))).toBe(true);
			expect(absResult.at(1)?.eq(Expression.create('abs(x)'))).toBe(true);
			expect(absResult.at(2)?.eq(Expression.create(3))).toBe(true);
		}

		expect(Vector.isVector(fibResult)).toBe(true);
		if (Vector.isVector(fibResult)) {
			expect(fibResult.count()).toBe(4);
			expect(fibResult.at(0)?.eq(Expression.create(1))).toBe(true);
			expect(fibResult.at(1)?.eq(Expression.create(1))).toBe(true);
			expect(fibResult.at(2)?.eq(Expression.create(2))).toBe(true);
			expect(fibResult.at(3)?.eq(Expression.create(55))).toBe(true);
		}
	});

	it('preserves matrices and leaves the input unchanged', () => {
		const input = new Matrix([-2, 'x'], [-3, 4]);
		const result = callFunction('abs', [input]);

		expect(Matrix.isMatrix(result)).toBe(true);
		expect(input.get(0, 0).eq(Expression.create(-2))).toBe(true);
		expect(input.get(0, 1).eq(Expression.create('x'))).toBe(true);
		if (Matrix.isMatrix(result)) {
			expect(result.dimensions()).toEqual([2, 2]);
			expect(result.get(0, 0).eq(Expression.create(2))).toBe(true);
			expect(result.get(0, 1).eq(Expression.create('abs(x)'))).toBe(true);
			expect(result.get(1, 0).eq(Expression.create(3))).toBe(true);
			expect(result.get(1, 1).eq(Expression.create(4))).toBe(true);
		}
	});

	it('broadcasts scalar arguments over vectors', () => {
		const result = callFunction('mod', [Vector.create([5, 8]), Expression.create(3)]);

		expect(Vector.isVector(result)).toBe(true);
		if (Vector.isVector(result)) {
			expect(result.at(0)?.eq(Expression.create(2))).toBe(true);
			expect(result.at(1)?.eq(Expression.create(2))).toBe(true);
		}
	});

	it('pairs multiple vectors by position', () => {
		const result = callFunction('mod', [Vector.create([5, 8]), Vector.create([2, 3])]);

		expect(Vector.isVector(result)).toBe(true);
		if (Vector.isVector(result)) {
			expect(result.at(0)?.eq(Expression.create(1))).toBe(true);
			expect(result.at(1)?.eq(Expression.create(2))).toBe(true);
		}
	});

	it('pairs multiple matrices by position', () => {
		const left = new Matrix([5, 8], [11, 14]);
		const right = new Matrix([2, 3], [4, 5]);
		const result = callFunction('mod', [left, right]);

		expect(Matrix.isMatrix(result)).toBe(true);
		if (Matrix.isMatrix(result)) {
			expect(result.get(0, 0).eq(Expression.create(1))).toBe(true);
			expect(result.get(0, 1).eq(Expression.create(2))).toBe(true);
			expect(result.get(1, 0).eq(Expression.create(3))).toBe(true);
			expect(result.get(1, 1).eq(Expression.create(4))).toBe(true);
		}
	});

	it('rejects mismatched distributed dimensions and structure types', () => {
		expect(() =>
			callFunction('mod', [Vector.create([5, 8]), Vector.create([2, 3, 4])])
		).toThrow(DimensionError);
		expect(() =>
			callFunction('mod', [Vector.create([5, 8]), new Matrix([2, 3])])
		).toThrow(DimensionError);
	});

	it('preserves native aggregate function semantics', () => {
		const left = Vector.create([1, 2]);
		const right = Vector.create([3, 4]);
		const matrix = new Matrix([1, 2], [3, 4]);
		const countResult = callFunction('count', [left]);
		const dotResult = callFunction('dot', [left, right]);
		const determinantResult = callFunction('determinant', [matrix]);

		expect(Expression.isExpression(countResult)).toBe(true);
		expect(Expression.isExpression(dotResult)).toBe(true);
		expect(Expression.isExpression(determinantResult)).toBe(true);
		if (
			Expression.isExpression(countResult) &&
			Expression.isExpression(dotResult) &&
			Expression.isExpression(determinantResult)
		) {
			expect(countResult.eq(Expression.create(2))).toBe(true);
			expect(dotResult.eq(Expression.create(11))).toBe(true);
			expect(determinantResult.eq(Expression.create(-2))).toBe(true);
		}
	});

	it('keeps symbolic count fallback arguments native', () => {
		const variable = 'native_count_fallback_probe';
		const expression = Expression.Variable(variable);
		const previous = Parser.KNOWN_VALUES[variable];

		try {
			Parser.KNOWN_VALUES[variable] = Expression.create(7);
			const result = callFunction('count', [expression]);

			expect(Expression.isExpression(result)).toBe(true);
			if (Expression.isExpression(result)) {
				expect(result.text()).toBe(`count(${variable})`);
			}
		} finally {
			if (previous === undefined) {
				delete Parser.KNOWN_VALUES[variable];
			} else {
				Parser.KNOWN_VALUES[variable] = previous;
			}
		}
	});
});
