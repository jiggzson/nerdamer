
import { mod, modInv } from '../../../math/math';
import { StructuredEntity } from '../../common/classes/StructuredEntity';
import { isNerdamerNativeType } from '../../common/common';
import { toParserEntities } from '../../common/functions/structuredEntityUtils';
import {
	message,
	DimensionError,
	MathError,
	UnexpectedDataType,
	UnsupportedOperationError,
} from '../../errors';
import { Expression } from '../expression/Expression';
import { one, zero } from '../expression/shortcuts';
import { dataTypes, MATRIX } from '../parser/constants';
import { Vector } from '../vector/Vector';

import type { StructuredEntityType, ParserEntity, NerdamerInput } from '../../types';
import type { ParserValuesObject } from '../parser/types';

/**
 * A rectangular two-dimensional matrix of scalar {@link Expression} elements.
 *
 * @remarks
 * Construction validates that all nonempty rows have the same length and
 * converts every entry to an Expression; nested parser aggregates are not
 * matrix elements. Existing Expression entries are retained, so use
 * {@link copy} when independent element objects are required. `copy`,
 * {@link evaluate}, and {@link expand} return deep independent matrices.
 *
 * Addition, subtraction, and division remain element-wise. {@link times}
 * implements scalar scaling, matrix multiplication, and matrix-vector multiplication,
 * while {@link pow} implements integer matrix powers. Scalar and matrix products return
 * new Matrices; a matrix-vector product returns a new Vector. {@link each}, {@link set},
 * and parser assignment mutate this matrix. `each` may also be used for observation by
 * returning nothing; use {@link forEach} when no transformation is intended.
 *
 * Direct `get`/`set` indices are zero-based. The compatibility accessor
 * {@link e} and the {@link row}/{@link col} helpers are one-based. Matrix
 * comparisons are component-wise predicates, not a total or lexicographic
 * ordering; a type or dimension mismatch compares false.
 */
export class Matrix extends StructuredEntity<Matrix, Vector> {
	/**
	 * Number of row swaps performed during the last toRightTriangular call.
	 * Used internally by determinant() to correct the sign.
	 */
	private _rowSwaps: number = 0;
	dataType: typeof MATRIX = MATRIX;
	elements: Expression[][];
	isEnumerable: boolean = true;

	precision?: number | undefined;

	/**
	 * Creates a matrix from array or Vector rows.
	 *
	 * @param elements - Rows containing values convertible to scalar Expressions.
	 * @throws {@link core!MathError} If nonempty rows have different lengths.
	 * @throws {@link core!UnexpectedDataType} If an entry cannot be converted to an
	 * Expression.
	 */
	constructor(...elements: (NerdamerInput[] | Vector)[]) {
		super();
		this.elements = [];

		let previousRowLength: number | undefined;
		for (let i = 0; i < elements.length; i++) {
			const rowInput = elements[i];
			const row = Vector.isVector(rowInput) ? rowInput.elements : toParserEntities(rowInput);

			// Matrices are numeric/algebraic objects; elements must be expressions.
			const exprRow: Expression[] = row.map((v: ParserEntity) => {
				// Reject aggregate types inside a matrix (Vector/Matrix/Collection/ValuesSet/Equation).
				return Expression.create(v);
			});

			if (exprRow.length > 0) {
				if (previousRowLength !== undefined && previousRowLength !== exprRow.length) {
					throw new MathError(message('cannotCreateMatrix'));
				}

				this.elements.push(exprRow);
				previousRowLength = exprRow.length;
			}
		}
	}

	/** Creates a matrix whose cells are independent copies of `value`. */
	static fill(rows: number, cols: number, value: Expression): Matrix {
		const M = new Matrix([]);
		for (let i = 0; i < rows; i++) {
			const row: Expression[] = [];
			for (let j = 0; j < cols; j++) {
				row.push(value.copy());
			}
			M.elements.push(row);
		}

		return M;
	}

	/** Creates the `n` by `n` identity matrix. */
	static identity(n: number): Matrix {
		const M = new Matrix([]);
		for (let i = 0; i < n; i++) {
			const row: Expression[] = [];
			for (let j = 0; j < n; j++) {
				row.push(i === j ? one() : zero());
			}
			M.elements.push(row);
		}
		return M;
	}

	static isMatrix(obj: unknown): obj is Matrix {
		return isNerdamerNativeType(obj, MATRIX);
	}

	/** Creates a matrix filled with symbolic zeros. */
	static zeroMatrix(rows: number, cols: number): Matrix {
		return Matrix.fill(rows, cols, zero());
	}

	/**
	 * Returns a row at the given zero-based index as a Vector.
	 * Used by the parser for bracket indexing, e.g. matrix[0] returns the first row.
	 * This enables chained indexing: matrix[0][1] returns the element at row 0, col 1.
	 *
	 * @param indices Zero-based indices (after INDEX_BASE adjustment).
	 *   Single index [i] returns row i as a Vector.
	 *   Two indices [i, j] returns the element at row i, col j.
	 * @returns A copied row Vector for one index, or the stored Expression for two.
	 * @throws {@link core!MathError} If either index is out of bounds.
	 */
	__get__(indices: number[]): ParserEntity {
		const row = indices[0];
		if (row < 0 || row >= this.elements.length) {
			throw new MathError(
				`Row index ${row} out of bounds for Matrix with ${this.elements.length} rows`
			);
		}
		if (indices.length > 1) {
			const col = indices[1];
			if (col < 0 || col >= this.elements[row].length) {
				throw new MathError(
					`Column index ${col} out of bounds for Matrix with ${this.elements[row].length} columns`
				);
			}
			return this.elements[row][col];
		}
		return new Vector(this.elements[row]);
	}

	/**
	 * Sets a zero-based cell or replaces an entire row.
	 *   [i, j] sets the element at row i, col j.
	 *   [i] requires a Vector whose length matches the matrix column count.
	 *
	 * @param indices Zero-based indices
	 * @param value The value to set
	 * @throws {@link core!UnexpectedDataType} If a full-row assignment does not receive a Vector.
	 * @throws {@link core!MathError} If an index is out of bounds or a replacement row has the wrong length.
	 */
	__set__(indices: number[] | string, value: ParserEntity): void {
		if (typeof indices === 'string') {
			throw new MathError('Matrix does not support string key access');
		}
		const row = indices[0];
		const col = indices.length > 1 ? indices[1] : undefined;
		if (row < 0 || row >= this.elements.length) {
			throw new MathError(
				`Row index ${row} out of bounds for Matrix with ${this.elements.length} rows`
			);
		}
		if (col !== undefined) {
			if (col < 0 || col >= this.elements[row].length) {
				throw new MathError(
					`Column index ${col} out of bounds for Matrix with ${this.elements[row].length} columns`
				);
			}
			this.elements[row][col] = Expression.create(value);
		} else {
			if (!Vector.isVector(value)) {
				throw new UnexpectedDataType(
					message('vectorExpected', { type: dataTypes[value.dataType] })
				);
			}
			if (value.elements.length !== this.cols()) {
				throw new MathError(message('mismatchedDimensions', { function: 'Matrix.__set__' }));
			}

			// Build the replacement before mutating so conversion errors leave the matrix unchanged.
			const replacement = value.elements.map(e => Expression.create(e));
			this.elements[row] = replacement;
		}
	}

	/**
	 * Returns the horizontal augmentation `[this | matrix]` without mutating either input.
	 *
	 * @throws {@link core!MathError} If the row counts differ.
	 */
	augment(matrix: Matrix): Matrix {
		const rows = this.rows();
		if (rows !== matrix.rows()) {
			throw new MathError(message('rowsMustMatch'));
		}
		if (rows === 0) {
			return this.copy();
		}
		const M = matrix.copy();
		const T = this.copy();
		const cols = T.cols();
		let i = rows;
		const nj = M.cols();
		let j;

		while (i--) {
			j = nj;
			while (j--) {
				T.elements[i][cols + j] = M.elements[i][j];
			}
		}
		return T;
	}

	canMultiplyFromLeft(M: Matrix): boolean {
		return this.cols() === M.rows();
	}

	col(n: number): Matrix {
		const col: NerdamerInput[][] = [];
		const rows = this.rows();
		if (n > 0 && n <= this.cols()) {
			for (let i = 0; i < rows; i++) {
				col.push([this.elements[i][n - 1]]);
			}
		}
		return new Matrix(...col);
	}

	cols(): number {
		return this.elements.length === 0 ? 0 : this.elements[0].length;
	}

	/** Copies the matrix and every Expression element. */
	copy(): Matrix {
		const copy = this.map(e => e.copy());
		return this.copySymbolicAccessTo(copy);
	}

	/**
	 * Computes the determinant by triangular elimination.
	 *
	 * The determinant of the empty matrix is one.
	 *
	 * @throws {@link core!UnsupportedOperationError} If the matrix is not square.
	 */
	determinant(): Expression {
		if (this.rows() === 0) {
			return one();
		}

		if (!this.isSquare()) {
			throw new UnsupportedOperationError(message('squareMatrixRequired'));
		}

		const M = this.toRightTriangular();
		const n = this.rows();
		let det = M.elements[0][0];
		for (let i = 1; i < n; i++) {
			det = det.times(M.get(i, i));
		}

		// Each row swap negates the determinant
		if (M._rowSwaps % 2 !== 0) {
			det = det.neg();
		}

		return det;
	}

	dimensions(): number[] {
		return [this.rows(), this.cols()];
	}

	dimensionsMatch(M: StructuredEntityType): M is Matrix {
		return Matrix.isMatrix(M) && this.cols() === M.cols() && this.rows() === M.rows();
	}

	/**
	 * Divides corresponding entries, or broadcasts a scalar divisor.
	 *
	 * @throws {@link core!DimensionError} If a Matrix divisor has different dimensions.
	 */
	override div(x: NerdamerInput): Matrix {
		if (Matrix.isMatrix(x) && !this.dimensionsMatch(x)) {
			throw new DimensionError(message('mismatchedDimensions', { function: 'Matrix.div' }));
		}
		return super.div(x);
	}

	/**
	 * Returns a one-based matrix element for compatibility with the legacy accessor.
	 *
	 * @throws {@link core!MathError} If either index is out of bounds.
	 */
	e(i: number, j: number): Expression {
		return this.get(i - 1, j - 1);
	}

	/**
	 * Visits or replaces every element in row-major order.
	 * Returning `void` leaves the current cell unchanged. Callback row and column
	 * indices are zero-based.
	 */
	each(
		fn: (e: Expression, i?: string | number, j?: string | number) => Expression | void
	): Matrix {
		for (let i = 0; i < this.elements.length; i++) {
			const row = this.elements[i];
			for (let j = 0; j < row.length; j++) {
				const result = fn(row[j], i, j);
				if (result !== undefined) {
					row[j] = result;
				}
			}
		}
		return this;
	}

	eq(M: ParserEntity): boolean {
		if (!Matrix.isMatrix(M) || !this.dimensionsMatch(M)) {
			return false;
		}

		const rows = this.rows();
		const cols = this.cols();

		for (let i = 0; i < rows; i++) {
			for (let j = 0; j < cols; j++) {
				if (!this.elements[i][j].eq(M.elements[i][j])) {
					return false;
				}
			}
		}
		return true;
	}

	/** Evaluates a copied matrix, resolving symbolic cell access when values are supplied. */
	evaluate(): Matrix;
	evaluate(values: ParserValuesObject): ParserEntity;
	evaluate(values?: ParserValuesObject): ParserEntity {
		let retval: ParserEntity;
		const symbolicAccess = Expression.fromSymbolicAccess(this);

		if (symbolicAccess && values) {
			retval = symbolicAccess.evaluate(values);
		} else {
			const copy = this.copy();
			copy.each(e => e.evaluate(values));
			retval = copy;
		}

		return retval;
	}

	/** Expands a copied matrix, leaving this one unchanged. */
	expand(): Matrix {
		const copy = this.copy();
		copy.each(e => e.expand());
		return copy;
	}

	/** Visits every cell without changing the matrix. */
	forEach(callback: (value: Expression, row: number, col: number) => void): void {
		for (let i = 0; i < this.elements.length; i++) {
			for (let j = 0; j < this.elements[i].length; j++) {
				callback(this.elements[i][j], i, j);
			}
		}
	}

	/**
	 * Returns the stored Expression at a zero-based row and column.
	 *
	 * @throws {@link core!MathError} If either index is out of bounds.
	 */
	get(row: number, col: number): Expression {
		return this.__get__([row, col]) as Expression;
	}

	gt(M: ParserEntity): boolean {
		if (!Matrix.isMatrix(M) || !this.dimensionsMatch(M)) {
			return false;
		}

		const rows = this.rows();
		const cols = this.cols();

		for (let i = 0; i < rows; i++) {
			for (let j = 0; j < cols; j++) {
				if (!this.elements[i][j].gt(M.elements[i][j])) {
					return false;
				}
			}
		}
		return true;
	}

	gte(M: ParserEntity): boolean {
		if (!Matrix.isMatrix(M) || !this.dimensionsMatch(M)) {
			return false;
		}

		const rows = this.rows();
		const cols = this.cols();

		for (let i = 0; i < rows; i++) {
			for (let j = 0; j < cols; j++) {
				if (!this.elements[i][j].gte(M.elements[i][j])) {
					return false;
				}
			}
		}
		return true;
	}

	inspect(): string {
		let text = '';
		for (let i = 0; i < this.elements.length; i++) {
			const row = this.elements[i];
			text += `[${row.map(x => x.text()).join(', ')}]\n`;
		}
		return text;
	}

	/**
	 * Computes an inverse by augmenting with the identity and eliminating rows.
	 *
	 * @returns A new inverse matrix; this matrix is unchanged.
	 * @throws {@link core!UnsupportedOperationError} If the matrix is not square.
	 * @throws {@link core!MathError} If the matrix is singular.
	 */
	inverse(): Matrix {
		if (!this.isSquare()) {
			throw new UnsupportedOperationError(message('squareMatrixRequired'));
		}

		if (this.rows() === 0) {
			return this.copy();
		}

		if (this.isSingular()) {
			throw new MathError(message('singularMatrix'));
		}

		const n = this.elements.length;
		let i = n;
		const M = this.augment(Matrix.identity(n)).toRightTriangular();
		const inverseElements: Expression[][] = [];
		let j: number;
		let p: number;
		let els: Expression[];
		let divisor: Expression;
		let newElement: Expression;
		const np = M.elements[0].length;
		const z = zero();

		while (i--) {
			els = [];
			inverseElements[i] = [];
			divisor = M.elements[i][i];

			// Safety check: if the pivot is zero after triangularization,
			// the matrix is singular (shouldn't reach here due to isSingular check above)
			if (divisor.eq(z)) {
				throw new MathError(message('singularMatrix'));
			}

			for (p = 0; p < np; p++) {
				newElement = M.elements[i][p].div(divisor);
				els.push(newElement);
				if (p >= n) {
					inverseElements[i].push(newElement);
				}
			}
			M.elements[i] = els;
			j = i;
			while (j--) {
				els = [];
				for (p = 0; p < np; p++) {
					els.push(M.elements[j][p].minus(M.elements[i][p].times(M.elements[j][i])));
				}
				M.elements[j] = els;
			}
		}

		return new Matrix(...inverseElements);
	}

	isSingular(): boolean {
		return this.isSquare() && this.determinant().eq('0');
	}

	isSquare(): boolean {
		return this.rows() === this.cols();
	}

	lt(M: ParserEntity): boolean {
		if (!Matrix.isMatrix(M) || !this.dimensionsMatch(M)) {
			return false;
		}

		const rows = this.rows();
		const cols = this.cols();

		for (let i = 0; i < rows; i++) {
			for (let j = 0; j < cols; j++) {
				if (!this.elements[i][j].lt(M.elements[i][j])) {
					return false;
				}
			}
		}
		return true;
	}

	lte(M: ParserEntity): boolean {
		if (!Matrix.isMatrix(M) || !this.dimensionsMatch(M)) {
			return false;
		}

		const rows = this.rows();
		const cols = this.cols();

		for (let i = 0; i < rows; i++) {
			for (let j = 0; j < cols; j++) {
				if (!this.elements[i][j].lte(M.elements[i][j])) {
					return false;
				}
			}
		}
		return true;
	}

	/** Returns a new matrix populated by callback results without mutating this matrix. */
	map(
		callback: (a: Expression, row?: string | number, col?: string | number) => Expression
	): Matrix {
		const M = new Matrix([]);
		for (let i = 0; i < this.elements.length; i++) {
			M.elements[i] = [];
			for (let j = 0; j < this.elements[i].length; j++) {
				M.elements[i][j] = callback(this.elements[i][j], i, j);
			}
		}
		return M;
	}

	/**
	 * Subtracts corresponding entries, or broadcasts a scalar subtrahend.
	 *
	 * @throws {@link core!DimensionError} If a Matrix operand has different dimensions.
	 */
	override minus(x: NerdamerInput): Matrix {
		if (Matrix.isMatrix(x) && !this.dimensionsMatch(x)) {
			throw new DimensionError(message('mismatchedDimensions', { function: 'Matrix.minus' }));
		}
		return super.minus(x);
	}

	/** Delegates the public multiplication alias to the Matrix-specific times() method. */
	multiply(x: Expression): Matrix;
	multiply(x: Matrix): Matrix;
	multiply(x: Vector): Vector;
	multiply(x: ParserEntity): Matrix | Vector;
	multiply(x: ParserEntity): Matrix | Vector {
		return this.times(x);
	}

	/**
	 * Computes a basis for the nullspace using the same reduced row-echelon form as {@link rref}.
	 *
	 * @remarks
	 * Without `prime`, the basis is computed with exact symbolic Expression arithmetic. When
	 * `prime` is supplied, the existing modular arithmetic path is preserved and basis entries
	 * are reduced modulo that value. Each free column contributes one basis vector, ordered by
	 * increasing free-column index. A full-column-rank matrix therefore returns an empty basis.
	 *
	 * @param prime - Optional modulus for finite-field nullspace arithmetic.
	 * @returns Basis vectors as independent Expression arrays ordered by matrix column.
	 */
	nullspace(prime?: string | number | Expression): Expression[][] {
		const p = prime === undefined ? undefined : Expression.create(prime);
		const A = this.rref(prime);
		const rows = A.rows();
		const cols = A.cols();
		const z = zero();

		// Find pivot columns: for each row, the first nonzero entry is the pivot.
		const pivotCols = new Set<number>();
		const rowPivot: number[] = new Array(rows).fill(-1);

		for (let i = 0; i < rows; i++) {
			for (let j = 0; j < cols; j++) {
				if (!A.elements[i][j].eq(z)) {
					pivotCols.add(j);
					rowPivot[i] = j;
					break;
				}
			}
		}

		const freeCols: number[] = [];
		for (let j = 0; j < cols; j++) {
			if (!pivotCols.has(j)) {
				freeCols.push(j);
			}
		}

		const basis: Expression[][] = [];
		for (const free of freeCols) {
			const vec = Array.from({ length: cols }, () => zero());
			vec[free] = one();

			for (let i = 0; i < rows; i++) {
				const pivot = rowPivot[i];
				if (pivot !== -1) {
					const value = zero().minus(A.elements[i][free]);
					vec[pivot] = p ? mod(value, p) : value;
				}
			}

			basis.push(vec);
		}

		return basis;
	}

	/**
	 * Adds corresponding entries, or broadcasts a scalar addend.
	 *
	 * @throws {@link core!DimensionError} If a Matrix operand has different dimensions.
	 */
	override plus(x: NerdamerInput): Matrix {
		if (Matrix.isMatrix(x) && !this.dimensionsMatch(x)) {
			throw new DimensionError(message('mismatchedDimensions', { function: 'Matrix.plus' }));
		}
		return super.plus(x);
	}

	/**
	 * Raises this matrix to an integer power without mutating it.
	 *
	 * Positive powers use matrix multiplication, zero returns the identity, and
	 * negative powers use the matrix inverse. A rectangular matrix is accepted only
	 * for the identity power `1`; all other matrix powers require a square matrix.
	 *
	 * @throws {@link core!UnsupportedOperationError} If the exponent is not an integer,
	 * or if a nontrivial power is requested for a rectangular matrix.
	 * @throws {@link core!MathError} If a negative power requires the inverse of a singular matrix.
	 */
	override pow(x: NerdamerInput): Matrix {
		const exponent = Expression.create(x);
		if (!exponent.isNUM() || !exponent.isInteger()) {
			throw new UnsupportedOperationError(message('unsupportedOperation'));
		}

		const n = exponent.getMultiplier().numerator;
		let retval: Matrix;

		if (n === 1n) {
			retval = this.copy();
		} else {
			if (!this.isSquare()) {
				throw new UnsupportedOperationError(message('squareMatrixRequired'));
			}

			if (n === 0n) {
				retval = Matrix.identity(this.rows());
			} else {
				let remaining = n < 0n ? -n : n;
				let base = n < 0n ? this.inverse() : this.copy();
				retval = Matrix.identity(this.rows());

				while (remaining > 0n) {
					if (remaining % 2n === 1n) {
						retval = retval.times(base);
					}
					remaining /= 2n;
					if (remaining > 0n) {
						base = base.times(base);
					}
				}
			}
		}

		return retval;
	}

	rank(): number {
		const M = this.toRightTriangular();
		let rank = 0;
		let i = M.rows();
		const cols = M.cols();
		const z = zero();
		let j: number;
		while (i--) {
			j = cols;
			while (j--) {
				if (!M.elements[i][j].eq(z)) {
					rank++;
					break;
				}
			}
		}

		return rank;
	}

	row(n: number): Matrix {
		let retval: Matrix;
		if (n < 1 || n > this.rows()) {
			retval = new Matrix([]);
		} else if (this.cols() === 0) {
			retval = Matrix.zeroMatrix(1, 0);
		} else {
			retval = new Matrix(this.elements[n - 1]);
		}
		return retval;
	}

	rows(): number {
		return this.elements.length;
	}

	/**
	 * Returns reduced row-echelon form without mutating this matrix.
	 *
	 * When `prime` is supplied, pivot arithmetic is performed modulo that value.
	 * Otherwise pivots and zero rows are determined by exact Expression equality.
	 */
	rref(prime?: string | number | Expression): Matrix {
		const rows = this.rows();
		const cols = this.cols();
		let lead = 0;
		const M = this.copy();
		const z = zero();
		const p = prime ? Expression.create(prime) : undefined;

		// Pivot selection must use field representatives, so normalize before zero testing.
		if (p) {
			M.each(e => mod(e, p));
		}

		for (let r = 0; r < rows; r++) {
			if (cols <= lead) {
				break;
			}

			// Find a row with a nonzero entry in the lead column
			let i = r;
			while (M.elements[i][lead].eq(z)) {
				i++;
				if (rows === i) {
					i = r;
					lead++;
					if (cols === lead) {
						return M;
					}
				}
			}

			// Swap rows i and r
			[M.elements[i], M.elements[r]] = [M.elements[r], M.elements[i]];

			if (p) {
				const inv = modInv(M.elements[r][lead], p);
				for (let j = 0; j < cols; j++) {
					M.elements[r][j] = mod(M.elements[r][j].times(inv), p);
				}

				for (let k = 0; k < rows; k++) {
					if (k !== r) {
						const factor = M.elements[k][lead];
						for (let j = 0; j < cols; j++) {
							M.elements[k][j] = mod(
								M.elements[k][j].minus(factor.times(M.elements[r][j])),
								p
							);
						}
					}
				}
			} else {
				const pivot = M.elements[r][lead];

				// The pivot search has already established that this expression is nonzero,
				// so RREF requires normalization regardless of its numeric magnitude.
				for (let j = 0; j < cols; j++) {
					M.elements[r][j] = M.elements[r][j].div(pivot);
				}

				for (let k = 0; k < rows; k++) {
					if (k !== r) {
						const factor = M.elements[k][lead];

						// A zero factor means this row is already clear in the pivot column.
						// Skipping the no-op also avoids propagating numeric metadata through
						// multiplication by zero.
						if (factor.eq(z)) {
							continue;
						}

						for (let j = 0; j < cols; j++) {
							M.elements[k][j] = M.elements[k][j].minus(
								factor.times(M.elements[r][j])
							);
						}
					}
				}
			}

			lead++;
		}

		M.elements.sort((rowA, rowB) => {
			const isZeroA = rowA.every(val => val.eq(z));
			const isZeroB = rowB.every(val => val.eq(z));
			if (isZeroA && !isZeroB) {
				return 1;
			}
			if (!isZeroA && isZeroB) {
				return -1;
			}
			return 0;
		});

		return M;
	}

	/** Sets a zero-based cell after converting `value` to an Expression. */
	set(row: number, col: number, value: ParserEntity): this {
		this.__set__([row, col], value);
		return this;
	}

	text(): string {
		const textArray: string[] = [];
		for (let i = 0; i < this.elements.length; i++) {
			const row = this.elements[i];
			const rowTextArray: string[] = [];
			for (let j = 0; j < row.length; j++) {
				rowTextArray.push(row[j].text());
			}
			textArray.push(`[${rowTextArray.join(', ')}]`);
		}

		const text = `matrix(${textArray.join(', ')})`;
		return this.formatSymbolicAccess(text);
	}

	// Override times() for Matrix-specific multiplication logic
	/**
	 * Returns scalar multiplication, the matrix product `this * M`, or the
	 * matrix-vector product `this * v`.
	 *
	 * @throws {@link core!MathError} If matrix or vector dimensions are incompatible.
	 * @throws {@link core!UnsupportedOperationError} If the operand is not a supported
	 * scalar, Matrix, or Vector.
	 */
	times(M: Expression): Matrix;
	times(M: Matrix): Matrix;
	times(M: Vector): Vector;
	times(M: ParserEntity): Matrix | Vector;
	times(M: ParserEntity): Matrix | Vector {
		let retval: Matrix | Vector;

		// Scalar multiplication: scale every element.
		if (Expression.isExpression(M)) {
			retval = this.map(e => e.times(M));
		} else if (Vector.isVector(M)) {
			if (this.cols() !== M.count()) {
				throw new MathError(message('mismatchedDimensions', { function: 'Matrix.times' }));
			}

			const elements: Expression[] = [];
			for (let i = 0; i < this.rows(); i++) {
				elements.push(new Vector(this.elements[i]).dot(M));
			}
			retval = new Vector(elements);
		} else {
			if (!Matrix.isMatrix(M)) {
				throw new UnsupportedOperationError(
					message('unsupportedType', { type: dataTypes[M.dataType] })
				);
			}

			if (!this.canMultiplyFromLeft(M)) {
				throw new MathError(message('mismatchedDimensions', { function: 'Matrix.times' }));
			}

			if (this.rows() === 0) {
				retval = new Matrix([]);
			} else if (M.cols() === 0) {
				retval = Matrix.zeroMatrix(this.rows(), 0);
			} else {
				const e = this.elements;
				const m = e.length;
				const o = e[0].length;
				const elements: Expression[][] = [];
				let i = m;
				const n = M.cols();
				let j: number;
				let k: number;
				let rowThis: Expression[];
				let rowElem: Expression[];
				let sum: Expression;

				while (i--) {
					rowElem = [];
					rowThis = e[i];
					j = n;
					while (j--) {
						sum = zero();
						k = o;
						while (k--) {
							const x = rowThis[k];
							const y = M.elements[k][j];
							sum = sum.plus(x.times(y));
						}
						rowElem[j] = sum;
					}
					elements[i] = rowElem;
				}

				retval = new Matrix(...elements);
			}
		}

		return retval;
	}

	/** Returns a row-echelon copy produced by forward elimination and row swaps. */
	toRightTriangular(): Matrix {
		const M = this.copy();
		const rows = M.rows();
		const cols = M.cols();
		const z = zero();
		let pivotRow = 0;

		// Track the number of row swaps for determinant sign correction.
		M._rowSwaps = 0;

		for (let lead = 0; lead < cols && pivotRow < rows; lead++) {
			let pivot = pivotRow;
			while (pivot < rows && M.elements[pivot][lead].eq(z)) {
				pivot++;
			}

			// A column without a pivot does not consume a row.
			if (pivot === rows) {
				continue;
			}

			if (pivot !== pivotRow) {
				[M.elements[pivot], M.elements[pivotRow]] = [
					M.elements[pivotRow],
					M.elements[pivot],
				];
				M._rowSwaps++;
			}

			const pivotValue = M.elements[pivotRow][lead];

			// Eliminate below the pivot.
			for (let row = pivotRow + 1; row < rows; row++) {
				if (!M.elements[row][lead].eq(z)) {
					const multiplier = M.elements[row][lead].div(pivotValue);
					const els: Expression[] = [];
					for (let col = 0; col < cols; col++) {
						els.push(
							col <= lead
								? zero()
								: M.elements[row][col].minus(
									M.elements[pivotRow][col].times(multiplier)
								)
						);
					}
					M.elements[row] = els;
				}
			}

			pivotRow++;
		}
		return M;
	}

	toUpperTriangular(): Matrix {
		return this.toRightTriangular();
	}

	/**
	 * Returns the sum of the main diagonal. The empty matrix has trace zero.
	 * @throws {@link core!MathError} If the matrix is not square.
	 */
	trace(): Expression {
		if (!this.isSquare()) {
			throw new MathError('Unable to calculate trace for the matrix');
		}
		let tr = zero();
		const n = this.elements.length;
		for (let i = 0; i < n; i++) {
			const e = this.elements[i][i];
			if (!Expression.isExpression(e)) {
				throw new MathError('Unable to calculate trace for the matrix');
			}
			tr = tr.plus(e);
		}
		return tr;
	}

	/** Returns a transposed matrix. Existing elements are normalized by the constructor. */
	transpose(): Matrix {
		const rows = this.rows();
		const cols = this.cols();
		if (rows > 0 && cols === 0) {
			throw new UnsupportedOperationError(message('unsupportedOperation'));
		}

		const elements: Expression[][] = [];
		let i = cols;
		while (i--) {
			let j = rows;
			elements[i] = [];
			while (j--) {
				elements[i][j] = this.elements[j][i];
			}
		}

		return new Matrix(...elements);
	}

	/** Returns elements as a column-major Vector. */
	unroll(): Vector {
		const v: Expression[] = [];
		for (let i = 1; i <= this.cols(); i++) {
			for (let j = 1; j <= this.rows(); j++) {
				v.push(this.e(j, i));
			}
		}
		return new Vector(v);
	}
}