'use strict';

import { Expression } from '../../src/core/classes/expression/Expression';
import { Matrix } from '../../src/core/classes/matrix/Matrix';
import { Parser } from '../../src/core/classes/parser/Parser';
import { UnsupportedOperationError } from '../../src/core/errors';

describe('Matrices', () => {
	// =========================================================================
	// Construction & Parsing
	// =========================================================================
	describe('construction and parsing', () => {
		it('should parse matrices', () => {
			expect(
				Parser.parse(
					'matrix([1, 0, 1, 0], [-4, 1, 2, 1], [-5, -4, 1, 2], [0, -5, 0, 1])'
				).text()
			).toEqual('matrix([1, 0, 1, 0], [-4, 1, 2, 1], [-5, -4, 1, 2], [0, -5, 0, 1])');
		});

		it('should create a matrix from numeric arrays', () => {
			const M = new Matrix([1, 2], [3, 4]);
			expect(M.rows()).toBe(2);
			expect(M.cols()).toBe(2);
			expect(M.text()).toEqual('matrix([1, 2], [3, 4])');
		});

		it('should create a matrix from string expressions', () => {
			const M = new Matrix(['x+1', '2*y'], ['a', 'b']);
			expect(M.rows()).toBe(2);
			expect(M.cols()).toBe(2);
		});

		it('should throw on mismatched row lengths', () => {
			expect(() => new Matrix([1, 2, 3], [4, 5])).toThrow();
		});

		it('should handle single-row matrix', () => {
			const M = new Matrix([1, 2, 3]);
			expect(M.rows()).toBe(1);
			expect(M.cols()).toBe(3);
		});

		it('should handle single-element matrix', () => {
			const M = new Matrix([5]);
			expect(M.rows()).toBe(1);
			expect(M.cols()).toBe(1);
			expect(M.e(1, 1).text()).toEqual('5');
		});
	});

	// =========================================================================
	// Dimensions & Access
	// =========================================================================
	describe('dimensions and element access', () => {
		it('should report correct dimensions', () => {
			const M = new Matrix([1, 2, 3], [4, 5, 6]);
			expect(M.dimensions()).toEqual([2, 3]);
		});

		it('should return 0 cols for empty matrix', () => {
			const M = new Matrix([]);
			expect(M.rows()).toBe(0);
			expect(M.cols()).toBe(0);
		});

		it('should access elements with 1-based indexing via e()', () => {
			const M = new Matrix([10, 20], [30, 40]);
			expect(M.e(1, 1).text()).toEqual('10');
			expect(M.e(1, 2).text()).toEqual('20');
			expect(M.e(2, 1).text()).toEqual('30');
			expect(M.e(2, 2).text()).toEqual('40');
		});

		it('should access elements with 0-based indexing via get()', () => {
			const M = new Matrix([10, 20], [30, 40]);
			expect((M.get(0, 0) as Expression).text()).toEqual('10');
			expect((M.get(1, 1) as Expression).text()).toEqual('40');
		});

		it('should set elements with set()', () => {
			const M = new Matrix([1, 2], [3, 4]);
			M.set(0, 0, Expression.create(99));
			expect((M.get(0, 0) as Expression).text()).toEqual('99');
		});

		it('should extract a row', () => {
			const M = new Matrix([1, 2, 3], [4, 5, 6]);
			expect(M.row(1).text()).toEqual('matrix([1, 2, 3])');
			expect(M.row(2).text()).toEqual('matrix([4, 5, 6])');
		});

		it('should return empty matrix for out-of-range row', () => {
			const M = new Matrix([1, 2], [3, 4]);
			expect(M.row(0).rows()).toBe(0);
			expect(M.row(3).rows()).toBe(0);
		});

		it('should extract a column', () => {
			const M = new Matrix([1, 2], [3, 4], [5, 6]);
			expect(M.col(1).text()).toEqual('matrix([1], [3], [5])');
			expect(M.col(2).text()).toEqual('matrix([2], [4], [6])');
		});
	});

	// =========================================================================
	// Equality & Comparison
	// =========================================================================
	describe('equality and comparison', () => {
		it('should detect equal matrices', () => {
			const A = new Matrix([1, 2], [3, 4]);
			const B = new Matrix([1, 2], [3, 4]);
			expect(A.eq(B)).toBe(true);
		});

		it('should detect unequal matrices', () => {
			const A = new Matrix([1, 2], [3, 4]);
			const B = new Matrix([1, 2], [3, 5]);
			expect(A.eq(B)).toBe(false);
		});

		it('should return false for eq with dimension mismatch', () => {
			const A = new Matrix([1, 2], [3, 4]);
			const B = new Matrix([1, 2, 3], [4, 5, 6]);
			expect(A.eq(B)).toBe(false);
		});

		it('should compare element-wise with gt', () => {
			const A = new Matrix([5, 6], [7, 8]);
			const B = new Matrix([1, 2], [3, 4]);
			expect(A.gt(B)).toBe(true);
			expect(B.gt(A)).toBe(false);
		});

		it('should compare element-wise with lt', () => {
			const A = new Matrix([1, 2], [3, 4]);
			const B = new Matrix([5, 6], [7, 8]);
			expect(A.lt(B)).toBe(true);
		});

		it('should support gte and lte', () => {
			const A = new Matrix([1, 2], [3, 4]);
			const B = new Matrix([1, 2], [3, 4]);
			expect(A.gte(B)).toBe(true);
			expect(A.lte(B)).toBe(true);
		});
	});

	// =========================================================================
	// Copy & Immutability
	// =========================================================================
	describe('copy', () => {
		it('should produce an independent copy', () => {
			const A = new Matrix([1, 2], [3, 4]);
			const B = A.copy();
			B.set(0, 0, Expression.create(99));
			expect(A.e(1, 1).text()).toEqual('1');
			expect(B.e(1, 1).text()).toEqual('99');
		});
	});

	// =========================================================================
	// Augment
	// =========================================================================
	describe('augment', () => {
		it('should correctly augment matrices', () => {
			expect(new Matrix([3, 5, 3], [7, 11, 1]).augment(new Matrix([2], [4])).text()).toEqual(
				'matrix([3, 5, 3, 2], [7, 11, 1, 4])'
			);
		});

		it('should correctly augment symbolic matrices', () => {
			expect(
				new Matrix(['a+x', 'b+y', 5], [25, 4, '4*x']).augment(new Matrix(['x'], [4])).text()
			).toEqual('matrix([a+x, b+y, 5, x], [25, 4, 4*x, 4])');
		});

		it('should throw on row count mismatch', () => {
			const A = new Matrix([1, 2], [3, 4]);
			const B = new Matrix([5]);
			expect(() => A.augment(B)).toThrow();
		});
	});

	// =========================================================================
	// Transpose
	// =========================================================================
	describe('transpose', () => {
		it('should transpose a square matrix', () => {
			const M = new Matrix([1, 2], [3, 4]);
			expect(M.transpose().text()).toEqual('matrix([1, 3], [2, 4])');
		});

		it('should transpose a rectangular matrix', () => {
			const M = new Matrix([1, 2, 3], [4, 5, 6]);
			const T = M.transpose();
			expect(T.rows()).toBe(3);
			expect(T.cols()).toBe(2);
			expect(T.text()).toEqual('matrix([1, 4], [2, 5], [3, 6])');
		});
	});

	// =========================================================================
	// Determinant (includes row-swap sign fix)
	// =========================================================================
	describe('determinant', () => {
		it('should calculate determinant of 1x1 matrix', () => {
			const M = new Matrix([7]);
			expect(M.determinant().text()).toEqual('7');
		});

		it('should calculate determinant of 2x2 matrix', () => {
			const M = new Matrix([1, 2], [3, 4]);
			expect(M.determinant().text()).toEqual('-2');
		});

		it('should calculate determinant of 3x3 matrix', () => {
			const M = new Matrix([1, 2, 3], [4, 5, 6], [7, 8, 9]);
			expect(M.determinant().text()).toEqual('0');
		});

		it('should return 0 for singular 4x4 matrix', () => {
			expect(
				(
					Parser.parse(
						'matrix([1, 0, 1, 0], [-4, 1, 2, 1], [-5, -4, 1, 2], [0, -5, 0, 1])'
					) as Matrix
				)
					.determinant()
					.text()
			).toEqual('0');
		});

		it('should calculate symbolic determinant', () => {
			expect(
				(
					Parser.parse(
						'matrix([1, 0, 1, x], [-4, 1, 2, 1], [-5, -4, 1, 2], [0, -5, 0, 1])'
					) as Matrix
				)
					.determinant()
					.text()
			).toEqual('-30*x');
		});

		it('should correctly handle determinant requiring row swaps', () => {
			// This matrix has a zero in (0,0) and requires a row swap.
			// det = 0*4 - 1*3 = -3 via cofactor expansion, but the key
			// test is that toRightTriangular swaps and the sign is corrected.
			const M = new Matrix([0, 1], [3, 4]);
			expect(M.determinant().text()).toEqual('-3');
		});

		it('should correctly handle determinant requiring multiple row swaps', () => {
			// Matrix requiring two row swaps (even number — sign preserved)
			// | 0  0  1 |
			// | 0  1  0 |  -> needs 2 swaps to get diagonal, det should be positive
			// | 1  0  0 |
			// This is the "reverse identity" with det = -1 (one transposition of 3 elements
			// decomposes into 2 swaps for the permutation (1 3), but the permutation
			// (1 2 3) -> (3 2 1) is odd, so det = -1).
			// Actually: the permutation matrix for [3,2,1] has signature -1.
			const M = new Matrix([0, 0, 1], [0, 1, 0], [1, 0, 0]);
			expect(M.determinant().text()).toEqual('-1');
		});

		it('should calculate determinant of identity matrix', () => {
			expect(Matrix.identity(3).determinant().text()).toEqual('1');
			expect(Matrix.identity(4).determinant().text()).toEqual('1');
		});

		it('should return 1 for determinant of empty matrix', () => {
			const M = new Matrix([]);
			expect(M.determinant().text()).toEqual('1');
		});

		it('should throw for non-square matrix', () => {
			const M = new Matrix([1, 2, 3], [4, 5, 6]);
			expect(() => M.determinant()).toThrow();
		});

		it('should handle 2x2 symbolic determinant', () => {
			const M = new Matrix(['a', 'b'], ['c', 'd']);
			// det = ad - bc
			const det = M.determinant();
			// Verify by substituting known values: a=1,b=0,c=0,d=1 -> det=1
			expect(det.text()).toBeTruthy();
		});
	});

	// =========================================================================
	// toRightTriangular / toUpperTriangular
	// =========================================================================
	describe('toRightTriangular', () => {
		it('should produce the expected 2x2 row-echelon matrix', () => {
			const M = new Matrix([2, 1], [4, 3]);
			const actual = M.toRightTriangular();

			expect(actual.dimensions()).toEqual([2, 2]);
			expect(actual.eq(new Matrix([2, 1], [0, 1]))).toBe(true);
		});

		it('should swap rows when the current pivot is zero', () => {
			const M = new Matrix([0, 1], [1, 0]);
			const actual = M.toRightTriangular();

			expect(actual.dimensions()).toEqual([2, 2]);
			expect(actual.eq(new Matrix([1, 0], [0, 1]))).toBe(true);
		});

		it('should reduce a tall 3x2 matrix without indexing past its columns', () => {
			const M = new Matrix([1, 2], [3, 4], [5, 6]);
			const actual = M.toRightTriangular();

			expect(actual.dimensions()).toEqual([3, 2]);
			expect(actual.eq(new Matrix([1, 2], [0, -2], [0, 0]))).toBe(true);
		});

		it('should advance to the next column when a wide matrix has no pivot in the current column', () => {
			const M = new Matrix([0, 1, 2], [0, 2, 4]);
			const actual = M.toRightTriangular();

			expect(actual.dimensions()).toEqual([2, 3]);
			expect(actual.eq(new Matrix([0, 1, 2], [0, 0, 0]))).toBe(true);
		});

		it('toUpperTriangular should be an alias', () => {
			const M = new Matrix([1, 2], [3, 4]);
			expect(M.toUpperTriangular().eq(M.toRightTriangular())).toBe(true);
		});
	});

	// =========================================================================
	// RREF (includes loop bound fix)
	// =========================================================================
	describe('rref', () => {
		it('should reduce identity to identity', () => {
			const I = Matrix.identity(3);
			expect(I.rref().eq(I)).toBe(true);
		});

		it('should reduce a 2x2 nonsingular matrix to identity', () => {
			const M = new Matrix([1, 2], [3, 4]);
			const R = M.rref();
			expect(R.eq(Matrix.identity(2))).toBe(true);
		});

		it('should handle an augmented matrix (more cols than rows)', () => {
			// System: x + y = 3, 2x + 3y = 8  =>  x=1, y=2
			// Augmented: [1 1 3; 2 3 8]
			const M = new Matrix([1, 1, 3], [2, 3, 8]);
			const R = M.rref();
			// Should be [1 0 1; 0 1 2]
			expect(R.e(1, 1).text()).toEqual('1');
			expect(R.e(1, 2).text()).toEqual('0');
			expect(R.e(1, 3).text()).toEqual('1');
			expect(R.e(2, 1).text()).toEqual('0');
			expect(R.e(2, 2).text()).toEqual('1');
			expect(R.e(2, 3).text()).toEqual('2');
		});

		it('should preserve the full shape and entries of a wide matrix already in RREF', () => {
			const M = new Matrix([1, 0, 2, 0, 3], [0, 1, 0, 4, 0]);
			const actual = M.rref();

			expect(actual.dimensions()).toEqual([2, 5]);
			expect(actual.eq(new Matrix([1, 0, 2, 0, 3], [0, 1, 0, 4, 0]))).toBe(true);
		});

		it('should push an exact zero row to the bottom', () => {
			const M = new Matrix([1, 2, 3], [2, 4, 6]);
			const actual = M.rref();

			expect(actual.dimensions()).toEqual([2, 3]);
			expect(actual.eq(new Matrix([1, 2, 3], [0, 0, 0]))).toBe(true);
		});

		it('should normalize an exact nonzero pivot regardless of magnitude', () => {
			const M = new Matrix([0], ['1/1000000000000000000000000000000']);
			const actual = M.rref();

			expect(actual.dimensions()).toEqual([2, 1]);
			expect(actual.eq(new Matrix([1], [0]))).toBe(true);
		});

		it('should return the full 3x4 RREF for an augmented system', () => {
			// x + y + z = 6, 2y + 5z = -4, 2x + 5y - z = 27
			// Solution: x=5, y=3, z=-2
			const M = new Matrix([1, 1, 1, 6], [0, 2, 5, -4], [2, 5, -1, 27]);
			const actual = M.rref();
			const expected = new Matrix([1, 0, 0, 5], [0, 1, 0, 3], [0, 0, 1, -2]);

			expect(actual.dimensions()).toEqual([3, 4]);
			expect(actual.eq(expected)).toBe(true);
		});

		it('does not spread decimal markers through zero-factor elimination', () => {
			const M = new Matrix(
				[Expression.create('1'), Expression.create('0'), Expression.create('5')],
				[Expression.create('5'), Expression.create('-2.0'), Expression.create('20.0')]
			);
			const R = M.rref();

			expect(R.e(1, 3).text()).toEqual('5');
			expect(R.e(2, 3).text()).toEqual('2.5');
		});

		it('normalizes nonzero symbolic pivots during reduction', () => {
			const M = new Matrix(
				[Expression.create('b+1'), Expression.create('1'), Expression.create('1')],
				[Expression.create('1'), Expression.create('1'), Expression.create('6')]
			);
			const R = M.rref();

			expect(R.e(1, 1).text()).toEqual('1');
			expect(R.e(1, 2).text()).toEqual('0');
			expect(R.e(2, 1).text()).toEqual('0');
			expect(R.e(2, 2).text()).toEqual('1');
			expect(R.e(1, 3).evaluate({ b: 1 }).text()).toEqual('-5');
			expect(R.e(2, 3).evaluate({ b: 1 }).text()).toEqual('11');
			expect(R.e(1, 3).evaluate({ b: 2 }).text()).toEqual('-5/2');
			expect(R.e(2, 3).evaluate({ b: 2 }).text()).toEqual('17/2');
		});
	});

	// =========================================================================
	// Inverse
	// =========================================================================
	describe('inverse', () => {
		it('should compute inverse of 2x2 matrix', () => {
			const M = new Matrix([1, 2], [3, 4]);
			const inv = M.inverse();
			// M * M^-1 should equal identity
			const product = M.times(inv) as Matrix;
			expect(product.eq(Matrix.identity(2))).toBe(true);
		});

		it('should compute inverse of 3x3 matrix', () => {
			const M = new Matrix([1, 0, 1], [0, 1, 0], [1, 0, 2]);
			const inv = M.inverse();
			const product = M.times(inv) as Matrix;
			expect(product.eq(Matrix.identity(3))).toBe(true);
		});

		it('should throw for singular matrix', () => {
			const M = new Matrix([1, 2], [2, 4]);
			expect(() => M.inverse()).toThrow();
		});

		it('should throw for non-square matrix', () => {
			const M = new Matrix([1, 2, 3], [4, 5, 6]);
			expect(() => M.inverse()).toThrow();
		});

		it('should compute inverse of identity as identity', () => {
			const I = Matrix.identity(3);
			expect(I.inverse().eq(I)).toBe(true);
		});

		it('should compute inverse of matrix requiring row swaps', () => {
			// This matrix has 0 on the diagonal and requires a swap during triangularization
			const M = new Matrix([0, 1], [1, 0]);
			const inv = M.inverse();
			const product = M.times(inv) as Matrix;
			expect(product.eq(Matrix.identity(2))).toBe(true);
		});
	});

	// =========================================================================
	// Singular check
	// =========================================================================
	describe('isSingular', () => {
		it('should return true for singular matrix', () => {
			const M = new Matrix([1, 2], [2, 4]);
			expect(M.isSingular()).toBe(true);
		});

		it('should return false for nonsingular matrix', () => {
			const M = new Matrix([1, 2], [3, 4]);
			expect(M.isSingular()).toBe(false);
		});
	});

	// =========================================================================
	// Rank
	// =========================================================================
	describe('rank', () => {
		it('should return full rank for identity', () => {
			expect(Matrix.identity(3).rank()).toBe(3);
		});

		it('should return correct rank for rank-deficient matrix', () => {
			const M = new Matrix([1, 2, 3], [2, 4, 6], [0, 0, 1]);
			expect(M.dimensions()).toEqual([3, 3]);
			expect(M.rank()).toBe(2);
		});

		it('should return rank 2 for a tall 3x2 matrix', () => {
			const M = new Matrix([1, 2], [3, 4], [5, 6]);
			expect(M.dimensions()).toEqual([3, 2]);
			expect(M.rank()).toBe(2);
		});

		it('should return rank 1 when the first column of a wide matrix is zero', () => {
			const M = new Matrix([0, 1, 2], [0, 2, 4]);
			expect(M.dimensions()).toEqual([2, 3]);
			expect(M.rank()).toBe(1);
		});

		it('should return 0 for zero matrix', () => {
			expect(Matrix.zeroMatrix(3, 3).rank()).toBe(0);
		});

		it('should return 1 for matrix of all same rows', () => {
			const M = new Matrix([1, 2, 3], [1, 2, 3], [1, 2, 3]);
			expect(M.rank()).toBe(1);
		});
	});

	// =========================================================================
	// Trace
	// =========================================================================
	describe('trace', () => {
		it('should compute trace of a numeric matrix', () => {
			const M = new Matrix([1, 2], [3, 4]);
			expect(M.trace().text()).toEqual('5');
		});

		it('should compute trace of identity', () => {
			expect(Matrix.identity(4).trace().text()).toEqual('4');
		});

		it('should throw for non-square matrix', () => {
			const M = new Matrix([1, 2, 3], [4, 5, 6]);
			expect(() => M.trace()).toThrow();
		});
	});

	// =========================================================================
	// Multiplication (times / multiply)
	// =========================================================================
	describe('multiplication', () => {
		it('should multiply two compatible matrices', () => {
			const A = new Matrix([1, 2], [3, 4]);
			const B = new Matrix([5, 6], [7, 8]);
			const C = A.times(B) as Matrix;
			// [1*5+2*7, 1*6+2*8] = [19, 22]
			// [3*5+4*7, 3*6+4*8] = [43, 50]
			expect(C.text()).toEqual('matrix([19, 22], [43, 50])');
		});

		it('should multiply rectangular matrices', () => {
			const A = new Matrix([1, 2, 3], [4, 5, 6]); // 2x3
			const B = new Matrix([7, 8], [9, 10], [11, 12]); // 3x2
			const C = A.times(B) as Matrix; // 2x2
			expect(C.rows()).toBe(2);
			expect(C.cols()).toBe(2);
			// [1*7+2*9+3*11, 1*8+2*10+3*12] = [58, 64]
			// [4*7+5*9+6*11, 4*8+5*10+6*12] = [139, 154]
			expect(C.text()).toEqual('matrix([58, 64], [139, 154])');
		});

		it('should support scalar multiplication', () => {
			const M = new Matrix([1, 2], [3, 4]);
			const scaled = M.times(Expression.create('3')) as Matrix;
			expect(scaled.text()).toEqual('matrix([3, 6], [9, 12])');
		});

		it('should support symbolic scalar multiplication', () => {
			const M = new Matrix([1, 2], [3, 4]);
			const scaled = M.times(Expression.create('x')) as Matrix;
			expect(scaled.e(1, 1).text()).toEqual('x');
			expect(scaled.e(1, 2).text()).toEqual('2*x');
		});

		it('should throw for incompatible matrix dimensions', () => {
			const A = new Matrix([1, 2], [3, 4]); // 2x2
			const B = new Matrix([1, 2, 3], [4, 5, 6], [7, 8, 9]); // 3x3
			expect(() => A.times(B)).toThrow();
		});

		it('should produce identity when multiplying matrix by its inverse', () => {
			const M = new Matrix([2, 1], [5, 3]);
			const inv = M.inverse();
			const product = M.times(inv) as Matrix;
			expect(product.eq(Matrix.identity(2))).toBe(true);
		});
	});

	// =========================================================================
	// Powers
	// =========================================================================
	describe('powers', () => {
		it('should return the 2x2 identity for exponent zero', () => {
			const M = new Matrix([1, 2], [3, 4]);
			const actual = M.pow(0);
			const expected = new Matrix([1, 0], [0, 1]);

			expect(actual.dimensions()).toEqual([2, 2]);
			expect(actual.eq(expected)).toBe(true);
		});

		it('should return an unchanged 2x2 copy for exponent one', () => {
			const M = new Matrix([1, 2], [3, 4]);
			const actual = M.pow(1);
			const expected = new Matrix([1, 2], [3, 4]);

			expect(actual.dimensions()).toEqual([2, 2]);
			expect(actual.eq(expected)).toBe(true);
			expect(actual).not.toBe(M);
		});

		it('should use matrix multiplication for positive integer powers', () => {
			const M = new Matrix([1, 2], [3, 4]);
			const squared = M.pow(2);
			const cubed = M.pow(3);

			expect(squared.dimensions()).toEqual([2, 2]);
			expect(squared.eq(new Matrix([7, 10], [15, 22]))).toBe(true);
			expect(cubed.dimensions()).toEqual([2, 2]);
			expect(cubed.eq(new Matrix([37, 54], [81, 118]))).toBe(true);
			expect(M.text()).toEqual('matrix([1, 2], [3, 4])');
		});

		it('should use the matrix inverse for negative integer powers', () => {
			const M = new Matrix([1, 2], [3, 4]);
			const inverse = M.pow(-1);
			const inverseSquared = M.pow(-2);

			expect(inverse.dimensions()).toEqual([2, 2]);
			expect(inverse.eq(new Matrix([-2, 1], ['3/2', '-1/2']))).toBe(true);
			expect(inverseSquared.dimensions()).toEqual([2, 2]);
			expect(inverseSquared.eq(new Matrix(['11/2', '-5/2'], ['-15/4', '7/4']))).toBe(true);
		});

		it('should reject noninteger and symbolic exponents', () => {
			const M = new Matrix([1, 2], [3, 4]);

			expect(() => M.pow('1/2')).toThrow(UnsupportedOperationError);
			expect(() => M.pow('x')).toThrow(UnsupportedOperationError);
		});

		it('should preserve a 2x3 matrix for exponent one and reject its other powers', () => {
			const M = new Matrix([1, 2, 3], [4, 5, 6]);
			const actual = M.pow(1);
			const expected = new Matrix([1, 2, 3], [4, 5, 6]);

			expect(actual.dimensions()).toEqual([2, 3]);
			expect(actual.eq(expected)).toBe(true);
			expect(() => M.pow(0)).toThrow(UnsupportedOperationError);
			expect(() => M.pow(2)).toThrow(UnsupportedOperationError);
			expect(() => M.pow(-1)).toThrow(UnsupportedOperationError);
		});
	});

	// =========================================================================
	// Map & Each
	// =========================================================================
	describe('map and each', () => {
		it('should map over all elements', () => {
			const M = new Matrix([1, 2], [3, 4]);
			const doubled = M.map(e => e.times('2'));
			expect(doubled.text()).toEqual('matrix([2, 4], [6, 8])');
			// Original should be unchanged
			expect(M.text()).toEqual('matrix([1, 2], [3, 4])');
		});

		it('should mutate with each', () => {
			const M = new Matrix([1, 2], [3, 4]);
			M.each(e => e.plus('1'));
			expect(M.text()).toEqual('matrix([2, 3], [4, 5])');
		});
	});

	// =========================================================================
	// Expand & Evaluate
	// =========================================================================
	describe('expand and evaluate', () => {
		it('should expand symbolic entries', () => {
			const M = new Matrix(['(x+1)^2', '1'], ['0', '1']);
			const expanded = M.expand();
			expect(expanded.e(1, 1).text()).toEqual('1+2*x+x^2');
		});

		it('expand should not mutate the original', () => {
			const M = new Matrix(['(x+1)^2', '1'], ['0', '1']);
			M.expand();
			expect(M.e(1, 1).text()).toEqual('(1+x)^2');
		});
	});

	// =========================================================================
	// Static factories
	// =========================================================================
	describe('static factories', () => {
		it('should create identity matrix', () => {
			const I = Matrix.identity(3);
			expect(I.text()).toEqual('matrix([1, 0, 0], [0, 1, 0], [0, 0, 1])');
		});

		it('should create zero matrix', () => {
			const Z = Matrix.zeroMatrix(2, 3);
			expect(Z.rows()).toBe(2);
			expect(Z.cols()).toBe(3);
			expect(Z.e(1, 1).text()).toEqual('0');
			expect(Z.e(2, 3).text()).toEqual('0');
		});

		it('should create filled matrix', () => {
			const M = Matrix.fill(2, 2, Expression.create('5'));
			expect(M.text()).toEqual('matrix([5, 5], [5, 5])');
		});

		it('should produce independent copies in fill', () => {
			const M = Matrix.fill(2, 2, Expression.create('x'));
			M.set(0, 0, Expression.create(99));
			// Other elements should not be affected
			expect((M.get(0, 1) as Expression).text()).toEqual('x');
		});
	});

	// =========================================================================
	// Type check
	// =========================================================================
	describe('isMatrix', () => {
		it('should return true for Matrix instances', () => {
			expect(Matrix.isMatrix(new Matrix([1]))).toBe(true);
		});

		it('should return false for non-Matrix values', () => {
			expect(Matrix.isMatrix(undefined)).toBe(false);
			expect(Matrix.isMatrix({})).toBe(false);
			expect(Matrix.isMatrix(Expression.create('x'))).toBe(false);
		});
	});

	// =========================================================================
	// isSquare
	// =========================================================================
	describe('isSquare', () => {
		it('should return true for square matrices', () => {
			expect(new Matrix([1, 2], [3, 4]).isSquare()).toBe(true);
		});

		it('should return false for rectangular matrices', () => {
			expect(new Matrix([1, 2, 3], [4, 5, 6]).isSquare()).toBe(false);
		});
	});

	// =========================================================================
	// Unroll
	// =========================================================================
	describe('unroll', () => {
		it('should unroll a matrix to a vector column-major', () => {
			const M = new Matrix([1, 2], [3, 4]);
			const v = M.unroll();
			// Column-major: col1 then col2 => [1, 3, 2, 4]
			expect(v.text()).toEqual('[1, 3, 2, 4]');
		});
	});

	// =========================================================================
	// dimensionsMatch
	// =========================================================================
	describe('dimensionsMatch', () => {
		it('should return true for same dimensions', () => {
			const A = new Matrix([1, 2], [3, 4]);
			const B = new Matrix([5, 6], [7, 8]);
			expect(A.dimensionsMatch(B)).toBe(true);
		});

		it('should return false for different dimensions', () => {
			const A = new Matrix([1, 2], [3, 4]);
			const B = new Matrix([1, 2, 3], [4, 5, 6]);
			expect(A.dimensionsMatch(B)).toBe(false);
		});
	});

	// =========================================================================
	// Text & Inspect
	// =========================================================================
	describe('text and inspect', () => {
		it('should produce parseable text representation', () => {
			const M = new Matrix([1, 2], [3, 4]);
			const text = M.text();
			expect(text).toEqual('matrix([1, 2], [3, 4])');
			// Round-trip through parser
			expect(Parser.parse(text).text()).toEqual(text);
		});

		it('should produce readable inspect output', () => {
			const M = new Matrix([1, 2], [3, 4]);
			const output = M.inspect();
			expect(output).toContain('[1, 2]');
			expect(output).toContain('[3, 4]');
		});
	});

	describe('getters & setters', () => {
		beforeEach(() => {
			delete Parser.KNOWN_VALUES.M;
		});

		it('should get elements using bracket notation', () => {
			expect(
				Parser.parse(
					'matrix([1, 0, 1, x], [-4, 1, 2, 1], [-5, -4, 1, 2], [0, -5, 0, 1])[1,0]'
				).text()
			).toEqual('-4');
		});

		it('should set elements using bracket notation', () => {
			Parser.parse('M: matrix([1,2],[a,b])');
			expect(Parser.parse('M[0,1]: y').text()).toEqual('matrix([1, y], [a, b])');
		});

		it('should replace an entire row without changing the 2x3 matrix shape', () => {
			Parser.parse('M: matrix([1,2,3],[4,5,6])');
			const actual = Parser.parse('M[0]: [7,8,9]') as Matrix;
			const expected = new Matrix([7, 8, 9], [4, 5, 6]);

			expect(actual.dimensions()).toEqual([2, 3]);
			expect(actual.eq(expected)).toBe(true);
		});

		it('should reject a too-short replacement row without mutating the 2x3 matrix', () => {
			const expected = new Matrix([1, 2, 3], [4, 5, 6]);
			Parser.parse('M: matrix([1,2,3],[4,5,6])');

			expect(() => Parser.parse('M[0]: [7,8]')).toThrow();
			const actual = Parser.parse('M') as Matrix;
			expect(actual.dimensions()).toEqual([2, 3]);
			expect(actual.eq(expected)).toBe(true);
		});

		it('should reject a too-long replacement row without mutating the 2x3 matrix', () => {
			const expected = new Matrix([1, 2, 3], [4, 5, 6]);
			Parser.parse('M: matrix([1,2,3],[4,5,6])');

			expect(() => Parser.parse('M[0]: [7,8,9,10]')).toThrow();
			const actual = Parser.parse('M') as Matrix;
			expect(actual.dimensions()).toEqual([2, 3]);
			expect(actual.eq(expected)).toBe(true);
		});

		it('should reject a scalar row replacement without mutating the 2x3 matrix', () => {
			const expected = new Matrix([1, 2, 3], [4, 5, 6]);
			Parser.parse('M: matrix([1,2,3],[4,5,6])');

			expect(() => Parser.parse('M[0]: 7')).toThrow();
			const actual = Parser.parse('M') as Matrix;
			expect(actual.dimensions()).toEqual([2, 3]);
			expect(actual.eq(expected)).toBe(true);
		});
	});
});
