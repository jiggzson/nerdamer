/* eslint-disable @typescript-eslint/consistent-type-imports */
import { mod, modInv } from '../../../math/math';
import { StructuredEntity } from '../../common/classes/StructuredEntity';
import {
	toParserInputType,
	isCollectionOfValues,
} from '../../common/functions/structuredEntityUtils';
import { message, MathError, UnexpectedDataType, UnsupportedOperationError } from '../../errors';
import { Expression } from '../expression/Expression';
import { one, zero } from '../expression/shortcuts';
import { dataTypes, MATRIX } from '../parser/constants';
import {
	StructuredEntityType,
	ParserInputType,
	SupportedInputType,
	ExpressionInputType,
} from '../parser/types';
import { Vector } from '../vector/Vector';

export class Matrix extends StructuredEntity<Matrix> {
	/**
	 * Number of row swaps performed during the last toRightTriangular call.
	 * Used internally by determinant() to correct the sign.
	 */
	private _rowSwaps: number = 0;
	dataType = MATRIX;
	elements: Expression[][];
	isCollectionOfValues: boolean = true;
	/**
	 * A parser flag to let the parser know that this was returned from an internal function call.
	 */
	isFunctionReturn = false;

	precision?: number | undefined;

	constructor(...elements: SupportedInputType[][]) {
		super();
		this.elements = [];

		let previousRowLength;
		for (let i = 0; i < elements.length; i++) {
			let row = toParserInputType(elements[i]);

			if (isCollectionOfValues(row)) {
				row = row.elements as ParserInputType[];
			}

			// Matrices are numeric/algebraic objects; elements must be expressions.
			const exprRow: Expression[] = row.map((v: ParserInputType) => {
				// Reject aggregate types inside a matrix (Vector/Matrix/Collection/ValuesSet/Equation).
				return Expression.create(v);
			});

			if (exprRow.length > 0) {
				this.elements.push(exprRow);
			}

			if (previousRowLength && previousRowLength !== exprRow.length) {
				throw new MathError(message('cannotCreateMatrix'));
			}

			previousRowLength = exprRow.length;
		}
	}

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
		if (obj === undefined) {
			return false;
		}
		return (obj as Matrix).dataType === MATRIX;
	}

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
	 * @returns
	 */
	__get__(indices: number[]): ParserInputType {
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
	 * Sets the element at the given indices.
	 *   [i, j] sets the element at row i, col j.
	 *
	 * @param indices Zero-based indices
	 * @param value The value to set
	 */
	__set__(indices: number[] | string, value: ParserInputType): void {
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
			// Setting an entire row
			if (Vector.isVector(value)) {
				this.elements[row] = value.elements.map(e => Expression.create(e));
			}
		}
	}

	augment(matrix: Matrix): Matrix {
		if (this.rows() === 0) {
			return this.copy();
		}
		const M = matrix.copy();
		const T = this.copy();
		const cols = T.cols();
		let i = T.rows();
		const nj = M.cols();
		let j;

		if (i !== M.rows()) {
			throw new MathError(message('rowsMustMatch'));
		}

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
		const col: SupportedInputType[][] = [];
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

	copy(): Matrix {
		return new Matrix(
			...this.elements.map(x => {
				return x.map(y => {
					return y.copy();
				});
			})
		);
	}

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
			det = det.times(M.get(i, i) as Expression);
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

	dimensionsMatch(M: StructuredEntityType): boolean {
		return Matrix.isMatrix(M) && this.cols() === M.cols() && this.rows() === M.rows();
	}

	e(i: number, j: number): Expression {
		return this.elements[i - 1][j - 1];
	}

	each(fn: (e: Expression, i?: string | number, j?: string | number) => Expression): Matrix {
		for (let i = 0; i < this.elements.length; i++) {
			const row = this.elements[i];
			for (let j = 0; j < row.length; j++) {
				const result = fn(row[j], i, j);
				row[j] = result!;
			}
		}
		return this;
	}

	eq(M: ParserInputType): boolean {
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

	evaluate() {
		return this.copy().each(e => e.evaluate());
	}

	expand(): Matrix {
		const copy = this.copy();
		copy.each(e => e.expand());
		return copy;
	}

	get(row: number, col: number): ParserInputType {
		return this.elements[row][col];
	}

	gt(M: ParserInputType): boolean {
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

	gte(x: ParserInputType) {
		return this.gt(x) || this.eq(x);
	}

	inspect(): string {
		let text = '';
		for (let i = 0; i < this.elements.length; i++) {
			const row = this.elements[i];
			text += `[${row.map(x => x.text()).join(', ')}]\n`;
		}
		return text;
	}

	inverse(): Matrix {
		if (!this.isSquare()) {
			throw new UnsupportedOperationError(message('squareMatrixRequired'));
		}

		if (this.isSingular()) {
			throw new MathError(message('singularMatrix'));
		}

		const n = this.elements.length;
		let i = n;
		const M = this.augment(Matrix.identity(n)).toRightTriangular();
		const inverseElements: ParserInputType[][] = [];
		let j, p, els, divisor, newElement;
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
					els.push(
						M.elements[j][p].minus(
							M.elements[i][p].times(M.elements[j][i] as Expression)
						)
					);
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

	lt(M: ParserInputType): boolean {
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

	lte(x: ParserInputType) {
		return this.lt(x) || this.eq(x);
	}

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

	// Override multiply() to call the custom times()
	multiply(x: ParserInputType): Matrix {
		const result = this.times(x);
		if (!Matrix.isMatrix(result)) {
			throw new UnexpectedDataType(
				message('matrixExpected', { type: dataTypes[(result as ParserInputType).dataType] })
			);
		}
		return result;
	}

	nullspace(prime: string | number | Expression): Expression[][] {
		const p = Expression.create(prime);
		const A = this.rref(prime);
		const rows = A.rows();
		const cols = A.cols();
		const z = zero();

		// Find pivot columns: for each row, the first nonzero entry is the pivot
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
			const vec = new Array(cols).fill(zero());
			vec[free] = one();

			for (let i = 0; i < rows; i++) {
				const pivot = rowPivot[i];
				if (pivot !== -1) {
					vec[pivot] = mod(zero().minus(A.elements[i][free] as Expression), p);
				}
			}

			basis.push(vec);
		}

		return basis;
	}

	rank(): number {
		const M = this.toRightTriangular();
		let rank = 0;
		let i = this.rows();
		const nj = this.cols();
		const z = zero();
		let j: number;
		while (i--) {
			j = nj;
			while (j--) {
				if (M.elements[i][j].abs().gt(z)) {
					rank++;
					break;
				}
			}
		}

		return rank;
	}

	row(n: number): Matrix {
		if (n < 1 || n > this.rows()) {
			return new Matrix([]);
		}
		return new Matrix(this.elements[n - 1]);
	}

	rows(): number {
		return this.elements.length;
	}

	rref(prime?: string | number | Expression): Matrix {
		const epsilon = 1e-23;
		const epsExpr = Expression.create(epsilon as unknown as ExpressionInputType);
		const rows = this.rows();
		const cols = this.cols();
		let lead = 0;
		const M = this.copy();
		const z = zero();

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

			if (prime) {
				const p = Expression.create(prime);
				const inv = modInv(M.elements[r][lead] as Expression, p);
				for (let j = 0; j < cols; j++) {
					M.elements[r][j] = mod(M.elements[r][j].times(inv), p);
				}

				for (let k = 0; k < rows; k++) {
					if (k !== r) {
						const factor = M.elements[k][lead];
						for (let j = 0; j < cols; j++) {
							M.elements[k][j] = mod(
								M.elements[k][j].minus(
									factor.times(M.elements[r][j] as Expression)
								),
								p
							);
						}
					}
				}
			} else {
				const pivot = M.elements[r][lead];
				if (pivot.abs().gt(epsExpr)) {
					for (let j = 0; j < cols; j++) {
						M.elements[r][j] = M.elements[r][j].div(pivot as Expression);
					}
				}

				for (let k = 0; k < rows; k++) {
					if (k !== r) {
						const factor = M.elements[k][lead];
						for (let j = 0; j < cols; j++) {
							M.elements[k][j] = M.elements[k][j].minus(
								factor.times(M.elements[r][j] as Expression)
							);
						}
					}
				}
			}

			lead++;
		}

		M.elements.sort((rowA: ParserInputType[], rowB: ParserInputType[]) => {
			const isZeroA = rowA.every(val => val.abs().lt(epsExpr));
			const isZeroB = rowB.every(val => val.abs().lt(epsExpr));
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

	set(row: number, col: number, value: ParserInputType): this {
		this.elements[row][col] = Expression.create(value);
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

		return `matrix(${textArray.join(', ')})`;
	}

	// Override times() for Matrix-specific multiplication logic
	times(M: ParserInputType) {
		// Scalar multiplication: scale every element
		if (Expression.isExpression(M)) {
			return this.map(e => e.times(M));
		}

		if (!Matrix.isMatrix(M)) {
			throw new UnsupportedOperationError(
				message('unsupportedType', { type: dataTypes[M.dataType] })
			);
		}

		if (!this.canMultiplyFromLeft(M)) {
			throw new MathError(message('mismatchedDimensions', { function: 'Matrix.times' }));
		}

		const e = this.elements;
		const m = e.length;
		const o = e[0].length;
		const elements: ParserInputType[][] = [];
		let i = m;
		const n = M.cols();
		let j: number;
		let k: number;
		let rowThis: ParserInputType[];
		let rowElem: ParserInputType[];
		let sum: ParserInputType;

		while (i--) {
			rowElem = [];
			rowThis = e[i];
			j = n;
			while (j--) {
				sum = zero();
				k = o;
				while (k--) {
					const x = rowThis[k] as Expression;
					const y = M.elements[k][j] as Expression;
					sum = sum.plus(x.times(y));
				}
				rowElem[j] = sum;
			}
			elements[i] = rowElem;
		}

		return new Matrix(...elements);
	}

	toRightTriangular(): Matrix {
		const M = this.copy();
		const n = M.rows();
		const np = M.cols();
		const z = zero();

		// Track the number of row swaps for determinant sign correction
		M._rowSwaps = 0;

		for (let i = 0; i < n; i++) {
			// Partial pivoting: find the best pivot in column i
			if (M.elements[i][i].eq(z)) {
				let swapped = false;
				for (let j = i + 1; j < n; j++) {
					if (!M.elements[j][i].eq(z)) {
						// Swap rows i and j
						[M.elements[i], M.elements[j]] = [M.elements[j], M.elements[i]];
						M._rowSwaps++;
						swapped = true;
						break;
					}
				}
				// If no nonzero pivot found, skip this column
				if (!swapped) {
					continue;
				}
			}

			// Eliminate below the pivot
			for (let j = i + 1; j < n; j++) {
				if (!M.elements[j][i].eq(z)) {
					const multiplier = M.elements[j][i].div(
						M.elements[i][i] as ExpressionInputType
					);
					const els: Expression[] = [];
					for (let p = 0; p < np; p++) {
						els.push(
							p <= i
								? zero()
								: M.elements[j][p].minus(M.elements[i][p].times(multiplier))
						);
					}
					M.elements[j] = els;
				}
			}
		}
		return M;
	}

	toUpperTriangular(): Matrix {
		return this.toRightTriangular();
	}

	trace(): Expression {
		if (!this.isSquare()) {
			throw new MathError('Unable to calculate trace for the matrix');
		}
		let tr = this.elements[0][0];
		const n = this.elements.length;
		for (let i = 1; i < n; i++) {
			const e = this.elements[i][i];
			if (!Expression.isExpression(e)) {
				throw new MathError('Unable to calculate trace for the matrix');
			}
			tr = tr.plus(e);
		}
		return Expression.create(tr);
	}

	transpose(): Matrix {
		const rows = this.rows();
		const cols = this.cols();
		const elements: ParserInputType[][] = [];
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

	unroll(): Vector {
		const v: ParserInputType[] = [];
		for (let i = 1; i <= this.cols(); i++) {
			for (let j = 1; j <= this.rows(); j++) {
				v.push(this.e(j, i));
			}
		}
		return new Vector(v);
	}
}
