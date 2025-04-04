import { expand } from "../../functions/expand/expand";
import { Expression } from "../parser/operations";
import { Matrix } from "./Matrix";

/**
 * Constructs a Sylvester matrix from the coefficient of two polynomials
 * Ideals, Varieties, and Algorithms 4th edition p. 163
 */
export class Syl {
    M: Matrix;

    constructor(f: Expression, g: Expression, variable: string) {
        const M = this.M = new Matrix([]);

        function addCoefficients(coeffs: Expression[], d: number, m: number) {
            const cols = M.cols();
            let c = 0;
            // Populate the rows first with the coefficients of f and then g
            for (let col = cols; col < m + cols; col++) {
                for (let row = 0; row < d; row++) {
                    const max = coeffs.length - 1 + c;
                    const outOfRange = row < c || row > max;
                    const value = outOfRange ? Expression.Number('0') : coeffs[row - c];
                    // const i = m + c;
                    // const value = i < c || i > row? Expression.Number('0') : fCoeffs[row];
                    M.elements[row][col] = value;
                    // console.log('i: '+i, 'max: '+max, 'row: '+row, 'col: '+col, 'value: '+value.toString())
                }
                c++;
            }
        }

        // Get the coefficients wrt the variable
        const fCoeffs = f.coeffs(variable).toArray().reverse();
        const gCoeffs = g.coeffs(variable).toArray().reverse();
        // The columns for the matrix
        const l = fCoeffs.length - 1;
        const m = gCoeffs.length - 1;
        // The matrix will be an (l+m) x (l+m) matrix so we store the dimension in d
        const d = l + m;
        // Create the rows
        for (let i = 0; i < d; i++) {
            M.elements.push([]);
        }

        addCoefficients(fCoeffs, d, m);
        addCoefficients(gCoeffs, d, l);
    }



    text() {
        return this.M.text();
    }

    Res() {
        return expand(this.M.determinant());
    }
}