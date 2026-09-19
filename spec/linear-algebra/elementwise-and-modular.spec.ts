import nerdamer from '../../src/index';
import { Matrix } from '../../src/core/classes/matrix/Matrix';
import { Parser } from '../../src/core/classes/parser/Parser';
import { Vector } from '../../src/core/classes/vector/Vector';
import { DimensionError, UnsupportedOperationError } from '../../src/core/errors';

describe('Element-wise and modular linear algebra', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/197
	it('preserves decimal text inside vectors', () => {
		expect(nerdamer('[1.2]').text()).toEqual('[1.2]');
	});

	// Regression: https://github.com/together-science/nerdamer-prime/issues/144
	it('handles empty vectors without entering a loop', () => {
		const empty = new Vector([]);
		expect(empty.each(value => value).text()).toEqual('[]');
		expect(empty.eq(new Vector([]))).toBe(true);
		expect(empty.dot(new Vector([])).text()).toEqual('0');
		expect(empty.indexOf(Parser.parse('x'))).toEqual(-1);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/666
	it('keeps scalar multiplication of vectors mathematically valid', () => {
		expect(nerdamer('a*[1,2,3]').text()).toEqual('[a, 2*a, 3*a]');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/666
	it('broadcasts scalar arithmetic without reversing noncommutative operations', () => {
		expect(nerdamer('a+[1,2,3]').text()).toEqual('[1+a, 2+a, 3+a]');
		expect(nerdamer('[1,2,3]-a').text()).toEqual('[1-a, 2-a, 3-a]');
		expect(nerdamer('a-[1,2,3]').text()).toEqual(new Vector(['a-1', 'a-2', 'a-3']).text());
		expect(nerdamer('a/[1,2]').text()).toEqual(new Vector(['a', 'a/2']).text());
		expect(nerdamer('a^[1,2]').text()).toEqual(new Vector(['a', 'a^2']).text());
	});

	it('preserves scalar-left operand order for matrices', () => {
		const difference = nerdamer('10-matrix([1,2,3],[4,5,6])') as Matrix;
		const quotient = nerdamer('12/matrix([2,3,4],[6,12,1])') as Matrix;

		expect(difference.dimensions()).toEqual([2, 3]);
		expect(difference.text()).toEqual('matrix([9, 8, 7], [6, 5, 4])');
		expect(quotient.dimensions()).toEqual([2, 3]);
		expect(quotient.text()).toEqual('matrix([6, 4, 3], [2, 1, 12])');
		expect(() => nerdamer('2^matrix([1,2,3],[4,5,6])')).toThrow(UnsupportedOperationError);
	});

	it('pairs equal-length vectors for general element-wise arithmetic', () => {
		expect(nerdamer('[1,2]+[3,4]').text()).toEqual('[4, 6]');
		expect(nerdamer('[5,7]-[2,3]').text()).toEqual('[3, 4]');
		expect(nerdamer('[1,2]*[x,y]').text()).toEqual('[x, 2*y]');
		expect(nerdamer('[4,6]/[2,3]').text()).toEqual('[2, 2]');
		expect(nerdamer('[2,3]^[2,3]').text()).toEqual('[4, 27]');
	});

	it('rejects mismatched Vector dimensions instead of falling back to broadcasting', () => {
		for (const expression of [
			'[1,2]+[3]',
			'[1,2]-[3]',
			'[1,2]*[3]',
			'[1,2]/[3]',
			'[1,2]^[3]',
		]) {
			expect(() => nerdamer(expression)).toThrow(DimensionError);
		}
	});

	it('normalizes field-zero entries before selecting pivots', () => {
		const M = new Matrix([5, 6], [1, 7]);
		const actual = M.rref(5);

		expect(M.dimensions()).toEqual([2, 2]);
		expect(M.text()).toEqual('matrix([5, 6], [1, 7])');
		expect(actual.dimensions()).toEqual([2, 2]);
		expect(actual.eq(Matrix.identity(2))).toBe(true);
	});

	it('uses the normalized modular RREF for nullspace pivots', () => {
		const M = new Matrix([5, 0], [0, 1]);
		const basis = M.nullspace(5);

		expect(M.dimensions()).toEqual([2, 2]);
		expect(M.text()).toEqual('matrix([5, 0], [0, 1])');
		expect(basis).toHaveLength(1);
		expect(basis[0].map(value => value.text())).toEqual(['1', '0']);
	});

	it('computes an exact nullspace basis from ordinary RREF', () => {
		const M = new Matrix([1, 2, 3], [2, 4, 6]);
		const basis = M.nullspace();

		expect(M.text()).toEqual('matrix([1, 2, 3], [2, 4, 6])');
		expect(basis.map(vector => vector.map(value => value.text()))).toEqual([
			['-2', '1', '0'],
			['-3', '0', '1'],
		]);

		for (const vector of basis) {
			const product = M.times(new Vector(vector));
			expect(product.eq(new Vector([0, 0]))).toBe(true);
		}
	});

	it('returns the standard basis for the nullspace of a zero matrix', () => {
		const basis = new Matrix([0, 0], [0, 0]).nullspace();

		expect(basis.map(vector => vector.map(value => value.text()))).toEqual([
			['1', '0'],
			['0', '1'],
		]);
	});

	it('returns an empty nullspace basis for full column rank', () => {
		const basis = new Matrix([1, 0], [0, 1], [1, 1]).nullspace();

		expect(basis).toEqual([]);
	});

	it('exposes matrix transformations through parser functions', () => {
		expect(nerdamer('transpose(matrix([1,2,3],[4,5,6]))').text()).toEqual(
			'matrix([1, 4], [2, 5], [3, 6])'
		);
		expect(nerdamer('augment(matrix([1,2],[3,4]),matrix([5],[6]))').text()).toEqual(
			'matrix([1, 2, 5], [3, 4, 6])'
		);
		expect(nerdamer('rref(matrix([1,2],[3,4]))').text()).toEqual(
			'matrix([1, 0], [0, 1])'
		);
		expect(nerdamer('rref(matrix([5,6],[1,7]),5)').text()).toEqual(
			'matrix([1, 0], [0, 1])'
		);
	});

	it('returns parser nullspace bases as nested vectors', () => {
		expect(nerdamer('nullspace(matrix([1,2,3],[2,4,6]))').text()).toEqual(
			'[[-2, 1, 0], [-3, 0, 1]]'
		);
		expect(nerdamer('nullspace(matrix([5,0],[0,1]),5)').text()).toEqual('[[1, 0]]');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/538
	it('applies scalar multiplication and true matrix powers', () => {
		const doubled = nerdamer('matrix([1,2],[3,4])*2');
		const squared = nerdamer('matrix([1,2],[3,4])^2');
		const inverse = nerdamer('matrix([1,2],[3,4])^(-1)');

		expect(Matrix.isMatrix(doubled)).toBe(true);
		expect(Matrix.isMatrix(squared)).toBe(true);
		expect(Matrix.isMatrix(inverse)).toBe(true);
		if (Matrix.isMatrix(doubled) && Matrix.isMatrix(squared) && Matrix.isMatrix(inverse)) {
			expect(doubled.dimensions()).toEqual([2, 2]);
			expect(doubled.eq(new Matrix([2, 4], [6, 8]))).toBe(true);
			expect(squared.dimensions()).toEqual([2, 2]);
			expect(squared.eq(new Matrix([7, 10], [15, 22]))).toBe(true);
			expect(inverse.dimensions()).toEqual([2, 2]);
			expect(inverse.eq(new Matrix([-2, 1], ['3/2', '-1/2']))).toBe(true);
		}
	});
});
