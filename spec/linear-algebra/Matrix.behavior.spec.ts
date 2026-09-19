import { Expression } from '../../src/core/classes/expression/Expression';
import { four, one, three, two } from '../../src/core/classes/expression/shortcuts';
import { Matrix } from '../../src/core/classes/matrix/Matrix';
import { Parser } from '../../src/core/classes/parser/Parser';
import { Vector } from '../../src/core/classes/vector/Vector';
import {
	DimensionError,
	MathError,
	UnsupportedOperationError,
} from '../../src/core/errors';

describe('Matrix each/copy/expand/evaluate', () => {
	it('copy should be independent', () => {
		const m = new Matrix([Expression.create('a')], [Expression.create('b')]);
		const c = m.copy();
		c.each(e => e);
		expect(m.text()).toEqual(
			new Matrix([Expression.create('a')], [Expression.create('b')]).text()
		);
	});

	it('each should return Matrix', () => {
		const m = new Matrix([Expression.create('a')], [Expression.create('b')]);
		const r = m.each(e => e);
		expect(r).toBeInstanceOf(Matrix);
	});

	it('constructor from rows should work (smoke)', () => {
		const m = new Matrix([one(), two()], [three(), four()]);
		expect(m.dimensions()).toEqual([2, 2]);
	});

	it('constructor should ignore empty rows regardless of position', () => {
		const M = new Matrix([], [1, 2], [], [3, 4], []);

		expect(M.dimensions()).toEqual([2, 2]);
		expect(M.text()).toEqual('matrix([1, 2], [3, 4])');
	});

	it('copy-based operations should preserve zero-width rows', () => {
		const M = Matrix.zeroMatrix(3, 0);
		const copy = M.copy();
		const evaluated = M.evaluate();
		const expanded = M.expand();
		const rref = M.rref();
		const triangular = M.toRightTriangular();
		const identityPower = M.pow(1);

		expect(M.dimensions()).toEqual([3, 0]);
		expect(copy.dimensions()).toEqual([3, 0]);
		expect(evaluated.dimensions()).toEqual([3, 0]);
		expect(expanded.dimensions()).toEqual([3, 0]);
		expect(rref.dimensions()).toEqual([3, 0]);
		expect(triangular.dimensions()).toEqual([3, 0]);
		expect(identityPower.dimensions()).toEqual([3, 0]);
		expect(copy).not.toBe(M);
		expect(copy.elements[0]).not.toBe(M.elements[0]);
	});
});

describe('Matrix set bounds', () => {
	it('should reject out-of-bounds direct set indices without mutating the matrix', () => {
		const M = new Matrix([1, 2], [3, 4]);
		const expected = new Matrix([1, 2], [3, 4]);
		const invalidIndices: [number, number][] = [
			[-1, 0],
			[2, 0],
			[0, -1],
			[0, 2],
		];

		for (const [row, col] of invalidIndices) {
			expect(() => M.set(row, col, Expression.create(9))).toThrow(MathError);
		}

		expect(M.dimensions()).toEqual([2, 2]);
		expect(M.eq(expected)).toBe(true);
	});
});

describe('Matrix component-wise comparisons', () => {
	it('should allow mixed equality and strict inequality in non-strict comparisons', () => {
		const lower = new Matrix([1, 2], [3, 4]);
		const upper = new Matrix([2, 2], [3, 5]);

		expect(lower.dimensions()).toEqual([2, 2]);
		expect(upper.dimensions()).toEqual([2, 2]);
		expect(upper.gte(lower)).toBe(true);
		expect(lower.lte(upper)).toBe(true);
		expect(lower.gte(upper)).toBe(false);
		expect(upper.lte(lower)).toBe(false);
	});
});

describe('Matrix element-wise arithmetic', () => {
	it('should apply equal-dimension Matrix arithmetic entry by entry', () => {
		const A = new Matrix([2, 4], [6, 8]);
		const B = new Matrix([1, 2], [3, 4]);
		const sum = A.plus(B);
		const difference = A.minus(B);
		const quotient = A.div(B);

		expect(A.dimensions()).toEqual([2, 2]);
		expect(B.dimensions()).toEqual([2, 2]);
		expect(sum.dimensions()).toEqual([2, 2]);
		expect(sum.text()).toEqual('matrix([3, 6], [9, 12])');
		expect(difference.dimensions()).toEqual([2, 2]);
		expect(difference.text()).toEqual('matrix([1, 2], [3, 4])');
		expect(quotient.dimensions()).toEqual([2, 2]);
		expect(quotient.text()).toEqual('matrix([2, 2], [2, 2])');
	});

	it('should reject mismatched Matrix dimensions in either operand order', () => {
		const narrow = new Matrix([1, 2], [3, 4]);
		const wide = new Matrix([5, 6, 7], [8, 9, 10]);

		expect(() => narrow.plus(wide)).toThrow(DimensionError);
		expect(() => wide.plus(narrow)).toThrow(DimensionError);
		expect(() => narrow.minus(wide)).toThrow(DimensionError);
		expect(() => wide.minus(narrow)).toThrow(DimensionError);
		expect(() => narrow.div(wide)).toThrow(DimensionError);
		expect(() => wide.div(narrow)).toThrow(DimensionError);
		expect(narrow.dimensions()).toEqual([2, 2]);
		expect(narrow.text()).toEqual('matrix([1, 2], [3, 4])');
		expect(wide.dimensions()).toEqual([2, 3]);
		expect(wide.text()).toEqual('matrix([5, 6, 7], [8, 9, 10])');
	});
});

describe('Matrix-vector multiplication', () => {
	it('should multiply a matrix by a compatible column vector', () => {
		const M = new Matrix([1, 2, 3], [4, 5, 6]);
		const v = Vector.create([7, 8, 9]);
		const product = M.times(v);

		expect(M.dimensions()).toEqual([2, 3]);
		expect(v.dimensions()).toEqual([3]);
		expect(product.dimensions()).toEqual([2]);
		expect(product.text()).toEqual('[50, 122]');
		expect(M.text()).toEqual('matrix([1, 2, 3], [4, 5, 6])');
		expect(v.text()).toEqual('[7, 8, 9]');
	});

	it('should preserve matrix-vector multiplication through the multiply alias', () => {
		const M = new Matrix([1, 2], [3, 4]);
		const v = Vector.create([5, 6]);
		const product = M.multiply(v);

		expect(M.dimensions()).toEqual([2, 2]);
		expect(v.dimensions()).toEqual([2]);
		expect(product.dimensions()).toEqual([2]);
		expect(product.text()).toEqual('[17, 39]');
	});

	it('should preserve exact symbolic matrix-vector products', () => {
		const M = new Matrix(['a', 'b'], ['c', 'd']);
		const v = Vector.create(['x', 'y']);
		const product = M.times(v);
		const expected = Vector.create(['a*x+b*y', 'c*x+d*y']);

		expect(M.dimensions()).toEqual([2, 2]);
		expect(v.dimensions()).toEqual([2]);
		expect(product.dimensions()).toEqual([2]);
		expect(product.eq(expected)).toBe(true);
	});

	it('should route matrix-vector multiplication through the parser', () => {
		const product = Parser.parse('matrix([1,2],[3,4])*[5,6]');

		expect(Vector.isVector(product)).toBe(true);
		if (Vector.isVector(product)) {
			expect(product.dimensions()).toEqual([2]);
			expect(product.text()).toEqual('[17, 39]');
		}
	});

	it('should reject incompatible vector dimensions without mutating either operand', () => {
		const M = new Matrix([1, 2, 3], [4, 5, 6]);
		const v = Vector.create([7, 8]);

		expect(() => M.times(v)).toThrow(MathError);
		expect(M.dimensions()).toEqual([2, 3]);
		expect(M.text()).toEqual('matrix([1, 2, 3], [4, 5, 6])');
		expect(v.dimensions()).toEqual([2]);
		expect(v.text()).toEqual('[7, 8]');
	});
});

describe('Matrix zero-dimensional algebra', () => {
	it('should use the standard 0x0 trace, inverse, and multiplication identities', () => {
		const M = new Matrix([]);
		const inverse = M.inverse();
		const product = M.times(new Matrix([]));
		const vectorProduct = M.times(new Vector());

		expect(M.dimensions()).toEqual([0, 0]);
		expect(M.trace().text()).toEqual('0');
		expect(inverse.dimensions()).toEqual([0, 0]);
		expect(inverse.eq(M)).toBe(true);
		expect(product.dimensions()).toEqual([0, 0]);
		expect(product.eq(M)).toBe(true);
		expect(vectorProduct.dimensions()).toEqual([0]);
		expect(vectorProduct.text()).toEqual('[]');
	});

	it('should preserve zero-width rows in dimensionally valid matrix products', () => {
		const left = Matrix.zeroMatrix(3, 0);
		const right = new Matrix([]);
		const product = left.times(right);
		const aliasProduct = left.multiply(right);

		expect(left.dimensions()).toEqual([3, 0]);
		expect(right.dimensions()).toEqual([0, 0]);
		expect(product.dimensions()).toEqual([3, 0]);
		expect(aliasProduct.dimensions()).toEqual([3, 0]);
		expect(product.eq(left)).toBe(true);
		expect(aliasProduct.eq(left)).toBe(true);
	});

	it('should preserve zero-width row extraction', () => {
		const M = Matrix.zeroMatrix(3, 0);

		expect(M.row(1).dimensions()).toEqual([1, 0]);
		expect(M.row(3).dimensions()).toEqual([1, 0]);
		expect(M.row(0).dimensions()).toEqual([0, 0]);
		expect(M.row(4).dimensions()).toEqual([0, 0]);
		expect(M.dimensions()).toEqual([3, 0]);
	});

	it('should preserve zero-width Vector-Matrix products', () => {
		const vector = new Vector([1, 2, 3]);
		const matrix = Matrix.zeroMatrix(3, 0);
		const product = vector.times(matrix);

		expect(product.dimensions()).toEqual([0]);
		expect(product.text()).toEqual('[]');
		expect(() => new Vector([1, 2]).times(matrix)).toThrow(MathError);
		expect(vector.dimensions()).toEqual([3]);
		expect(vector.text()).toEqual('[1, 2, 3]');
		expect(matrix.dimensions()).toEqual([3, 0]);
	});

	it('should reject transposes that require an unrepresentable zero-row width', () => {
		const M = Matrix.zeroMatrix(3, 0);
		const empty = new Matrix([]);

		expect(() => M.transpose()).toThrow(UnsupportedOperationError);
		expect(empty.transpose().dimensions()).toEqual([0, 0]);
		expect(M.dimensions()).toEqual([3, 0]);
	});

	it('should enforce augment row counts before the empty-matrix identity', () => {
		const empty = new Matrix([]);
		const otherEmpty = new Matrix([]);
		const nonempty = new Matrix([1]);
		const augmented = empty.augment(otherEmpty);

		expect(augmented.dimensions()).toEqual([0, 0]);
		expect(augmented.eq(empty)).toBe(true);
		expect(() => empty.augment(nonempty)).toThrow(MathError);
		expect(empty.dimensions()).toEqual([0, 0]);
		expect(nonempty.dimensions()).toEqual([1, 1]);
		expect(nonempty.text()).toEqual('matrix([1])');
	});
});
