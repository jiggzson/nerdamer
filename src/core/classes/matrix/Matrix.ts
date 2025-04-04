import { MATRIX } from "../parser/constants";
import { Vector } from "../vector/Vector";
import { Base, isSetOfValues } from "../common";
import { ParserSupportedType } from "../parser/types";
import { __, MathError, UnsupportedOperationError } from "../../errors";
import { Expression } from "../parser/operations";
import { one, zero } from "../expression/shortcuts";

export class Matrix implements Base<Matrix> {
    dataType = MATRIX;

    /**
     * The list of elements of the vector
     */
    elements: ParserSupportedType[][];

    /**
     * Lets the parser know
     */
    isSetOfValues: boolean = true;

    constructor(...elements: ParserSupportedType[][]) {
        this.elements = [];

        let previousRowLength;
        for (let i = 0; i < elements.length; i++) {
            let row = elements[i];

            if (isSetOfValues(row)) {
                row = row.elements as ParserSupportedType[];
            }

            if (row.length > 0) {
                this.elements.push(row);
            }

            // Move the elements or copy 
            if (previousRowLength && previousRowLength !== row.length) {
                throw new MathError(__('cannotCreateMatrix'));
            }

            previousRowLength = row.length;
        }
    }

    /**
     * Unrolls a Matrix to a Vector
     * 
     * @returns 
     */
    unroll() {
        const v: ParserSupportedType[] = [];

        for (let i = 1; i <= this.cols(); i++) {
            for (let j = 1; j <= this.rows(); j++) {
                v.push(this.e(j, i))
            }
        }

        return new Vector(v);
    }

    /**
     * Iterates over each element of the matrix
     * 
     * @param callback The function which will be called on each element
     * @param modify If true then the value will be overridden in the current matrix
     * @returns 
     */
    each(callback: (element: ParserSupportedType, row?: string | number, col?: string | number) => ParserSupportedType | void, modify?: boolean): Matrix {
        for (let i = 0; i < this.elements.length; i++) {
            const row = this.elements[i];
            for (let j = 0; j < row.length; j++) {
                const result = callback(row[j], i, j);
                if (modify) {
                    row[j] = result!;
                }
            }
        }

        return this;
    }

    /**
     * 
     * @returns The number of rows in the matrix
     */
    rows() {
        return this.elements.length;
    }

    /**
     * 
     * @returns The number of columns in the matrix
     */
    cols() {
        return this.elements.length === 0 ? 0 : this.elements[0].length;
    }

    /**
     * Gets the nth row in the matrix
     * 
     * @param n 
     */
    row(n: number) {
        if (n < 1 || n > this.rows()) {
            return [];
        }

        return new Matrix(this.elements[n - 1]);
    }

    /**
     * Gets the nth column in the matrix. The column gets return as a row
     * ```
     * Parser.parse('matrix([1, 2, 7], [3, 4, 44], [2, 6, 1])').col(2);
     * // matrix([2, 4, 6]);
     * ```
     * 
     * @param n The nth column to retrieve
     */
    col(n: number) {
        const col: ParserSupportedType[][] = [];
        const rows = this.rows();
        if (n > 0 && n <= this.cols()) {
            for (let i = 0; i < rows; i++) {
                col.push([this.elements[i][n - 1]])
            }
        }

        return new Matrix(...col);
    }

    /**
     * Iterates over each element of the matrix and returns a new modified matrix
     * 
     * @param callback 
     * @returns 
     */
    map(callback: (a: ParserSupportedType, row?: string | number, col?: string | number) => ParserSupportedType): Matrix {
        const M = new Matrix([]);
        this.each((e, row, col) => {
            const result = callback(e, row, col);
            M.elements[row!][col!] = result;
            return result;
        });

        return M;
    }

    augment(matrix: Matrix) {
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
            throw new MathError(__('rowsMustMatch'));
        }

        while (i--) {
            j = nj;
            while (j--) {
                T.elements[i][cols + j] = M.elements[i][j];
            }
        }

        return T;
    }

    get(row: number, col: number) {
        return this.elements[row][col];
    }

    set(row: number, col: number, value: ParserSupportedType) {
        this.elements[row][col] = value;
        return this;
    }

    /**
     * Checks to see if the matrices are equal in dimensions
     * 
     * @param M 
     * @returns 
     */
    dimensionsMatch(M: Matrix) {
        return this.cols() === M.cols() && this.rows() === M.rows();
    }

    /**
     * Checks to see if two matrices are equal
     * 
     * @param M 
     * @returns 
     */
    eq(M: ParserSupportedType) {
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

    toRightTriangular() {
        const M = this.copy();
        const n = M.rows();
        const np = M.cols();

        let i, j, p, els;

        for (i = 0; i < n; i++) {
            if (M.elements[i][i].eq('0')) {
                for (j = i + 1; j < n; j++) {
                    if (!M.elements[j][i].eq('0')) {
                        els = [];
                        for (p = 0; p < np; p++) {
                            els.push(M.elements[i][p].plus(M.elements[j][p]));
                        }
                        M.elements[i] = els;
                        break;
                    }
                }
            }
            if (!M.elements[i][i].eq('0')) {
                for (j = i + 1; j < n; j++) {
                    const multiplier = M.elements[j][i].div(M.elements[i][i]);
                    els = [];
                    for (p = 0; p < np; p++) {
                        // Elements with column numbers up to an including the number of the
                        // row that we're subtracting can safely be set straight to zero,
                        // since that's the point of this routine and it avoids having to
                        // loop over and correct rounding errors later
                        els.push(p <= i ? Expression.Number('0') : M.elements[j][p].minus(M.elements[i][p].times(multiplier)));
                    }
                    M.elements[j] = els;
                }
            }
        }

        return M;
    }

    e(i: number, j: number) {
        // if(i < 1 || i > this.elements.length || j < 1 || j > this.elements[0].length) {
        //     // TODO: throw an error
        //     return;
        // }
        return this.elements[i - 1][j - 1];
    }

    /**
     * Checks to see if the matrix is square
     * 
     * @returns 
     */
    isSquare() {
        return this.rows() === this.cols();
    }

    /**
     * Calculates the determinant of the matrix
     */
    determinant(): Expression {
        if (this.rows() === 0) {
            return one();
        }

        let det;
        if (this.isSquare()) {
            const M = this.toRightTriangular();
            const n = this.rows();
            det = M.elements[0][0];
            for (let i = 1; i < n; i++) {
                det = det.times(M.get(i, i));
            }
        }
        else {
            throw new UnsupportedOperationError(__('squareMatrixRequired'));
        }

        return det;
    }

    /**
     * Calculates the inverse of a Matrix
     * 
     * @returns 
     */
    inverse() {
        if (!this.isSquare() || this.isSingular()) {
            throw new UnsupportedOperationError(__('squareMatrixRequired'));
        }
        const n = this.elements.length;
        let i = n;
        const M = this.augment(Matrix.identity(n)).toRightTriangular();
        const inverseElements: ParserSupportedType[][] = [];
        let j, p, els, divisor, newElement;
        const np = M.elements[0].length;
        // Matrix is non-singular so there will be no zeros on the diagonal
        // Cycle through rows from last to first
        while (i--) {
            els = [];
            inverseElements[i] = [];
            divisor = M.elements[i][i];
            for (p = 0; p < np; p++) {
                newElement = M.elements[i][p].div(divisor);
                els.push(newElement);
                // Shuffle off the current row of the right hand side into the results
                // array as it will not be modified by later runs through this loop
                if (p >= n) {
                    inverseElements[i].push(newElement);
                }
            }
            M.elements[i] = els;
            // Then, subtract this row from those above it to
            // give the identity matrix on the left hand side
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

    /**
     * Checks to see if a matrix is singular
     * 
     * @returns 
     */
    isSingular() {
        return this.isSquare() && this.determinant().eq('0');
    }

    /**
     * Creates a copy of the matrix
     * 
     * @returns 
     */
    copy() {
        return new Matrix(...this.elements.map((x) => {
            return x.map((y) => {
                return y.copy();
            });
        }));
    }

    /**
     * Returns the rank of the Matrix
     * 
     * @returns 
     */
    rank() {
        const M = this.toRightTriangular();
        let rank = 0;
        let i = this.rows();
        const nj = this.cols();
        let j: number;
        while (i--) {
            j = nj;
            while (j--) {
                if (M.elements[i][j].abs().gt(0)) {
                    rank++;
                    break;
                }
            }
        }

        return rank;
    }

    text() {
        // The array containing the text representation of each row
        const textArray: string[] = [];
        for (let i = 0; i < this.elements.length; i++) {
            const row = this.elements[i];
            // The array containing the text representation of each element
            const rowTextArray: string[] = [];
            for (let j = 0; j < row.length; j++) {
                rowTextArray.push(row[j].text());
            }
            textArray.push(`[${rowTextArray.join(', ')}]`);
        }

        return `matrix(${textArray.join(', ')})`;
    }

    toString() {
        return this.text();
    }

    static isMatrix(obj: unknown): obj is Matrix {
        if (obj === undefined) {
            return false;
        }

        return (obj as Matrix).dataType === MATRIX;
    }

    /**
     * Creates a n x n identity matrix
     * 
     * @param n 
     * @returns 
     */
    static identity(n: number) {
        const M = new Matrix([]);
        for (let i = 0; i < n; i++) {
            const row: Expression[] = [];
            for (let j = 0; j < n; j++) {
                row.push(i === j ? one() : zero());
            }
            M.elements.push(row)
        }
        return M;
    }

    /**
     * Creates a matrix prefilled with zeros
     * 
     * @param rows 
     * @param cols 
     * @returns 
     */
    static zeroMatrix(rows: number, cols: number) {
        return Matrix.fill(rows, cols, Expression.Number('0'));
    }

    /**
     * Creates a prefilled matrix with a given value
     * 
     * @param rows The number of rows in the matrix
     * @param cols The number of columns in the matrix
     * @param value The value the matrix is filled with
     * @returns 
     */
    static fill(rows: number, cols: number, value: ParserSupportedType) {
        const M = new Matrix([]);
        for (let i = 0; i < rows; i++) {
            const row: ParserSupportedType[] = [];
            for (let j = 0; j < cols; j++) {
                row.push(value.copy());
            }
            M.elements.push(row);
        }

        return M;
    }
}

