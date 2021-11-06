import {isSymbol, Symbol} from '../Core/Symbol';
import {isVector, Vector} from './Vector';
import {block, format, inBrackets} from '../Core/Utils';
import {err} from '../Core/Errors';

export class Matrix {
    custom = true

    constructor(...m) {
        var l = m.length, i, el = [];
        if (isMatrix(m)) { // if it's a matrix then make a clone
            for (i = 0; i < l; i++) {
                el.push(m[i].slice(0));
            }
        }
        else {
            var row, lw, rl;
            for (i = 0; i < l; i++) {
                row = m[i];
                if (isVector(row))
                    row = row.elements;
                if (!Array.isArray(row))
                    row = [row];
                rl = row.length;
                if (lw && lw !== rl)
                    err('Unable to create Matrix. Row dimensions do not match!');
                el.push(row);
                lw = rl;
            }
        }
        this.elements = el;
    }

    static identity(n) {
        var m = new Matrix();
        for (var i = 0; i < n; i++) {
            m.elements.push([]);
            for (var j = 0; j < n; j++) {
                m.set(i, j, i === j ? new Symbol(1) : new Symbol(0));
            }
        }
        return m;
    }

    static fromArray(arr) {
        return new Matrix(...arr);
    }

    static zeroMatrix(rows, cols) {
        var m = new Matrix();
        for (var i = 0; i < rows; i++) {
            m.elements.push(Vector.arrayPrefill(cols, new Symbol(0)));
        }
        return m;
    }

    // needs be true to let the parser know not to try to cast it to a symbol
    get(row, column) {
        if (!this.elements[row])
            return undefined;
        return this.elements[row][column];
    }

    map(f, raw_values) {
        var M = new Matrix();
        this.each(function (e, i, j) {
            M.set(i, j, f.call(M, e), raw_values);
        });
        return M;
    }

    set(row, column, value, raw) {
        if (!this.elements[row])
            this.elements[row] = [];
        this.elements[row][column] = raw ? value : (isSymbol(value) ? value : new Symbol(value));
    }

    cols() {
        return this.elements[0].length;
    }

    rows() {
        return this.elements.length;
    }

    row(n) {
        if (!n || n > this.cols())
            return [];
        return this.elements[n - 1];
    }

    col(n) {
        var nr = this.rows(),
            col = [];
        if (n > this.cols() || !n)
            return col;
        for (var i = 0; i < nr; i++) {
            col.push(this.elements[i][n - 1]);
        }
        return col;
    }

    eachElement(fn) {
        var nr = this.rows(),
            nc = this.cols(), i, j;
        for (i = 0; i < nr; i++) {
            for (j = 0; j < nc; j++) {
                fn.call(this, this.elements[i][j], i, j);
            }
        }
    }

    // ported from Sylvester.js
    determinant() {
        if (!this.isSquare()) {
            return null;
        }
        var M = this.toRightTriangular();
        var det = M.elements[0][0], n = M.elements.length - 1, k = n, i;
        do {
            i = k - n + 1;
            det = this.$.multiply(det, M.elements[i][i]);
        }
        while(--n);
        return det;
    }

    isSquare() {
        return this.elements.length === this.elements[0].length;
    }

    isSingular() {
        return this.isSquare() && this.determinant() === 0;
    }

    augment(m) {
        var r = this.rows(), rr = m.rows();
        if (r !== rr)
            err("Cannot augment matrix. Rows don't match.");
        for (var i = 0; i < r; i++) {
            this.elements[i] = this.elements[i].concat(m.elements[i]);
        }

        return this;
    }

    clone() {
        var r = this.rows(), c = this.cols(),
            m = new Matrix();
        for (var i = 0; i < r; i++) {
            m.elements[i] = [];
            for (var j = 0; j < c; j++) {
                var symbol = this.elements[i][j];
                m.elements[i][j] = isSymbol(symbol) ? symbol.clone() : symbol;
            }
        }
        return m;
    }

    // ported from Sylvester.js
    invert() {
        if (!this.isSquare())
            err('Matrix is not square!');
        return block('SAFE', function () {
            var ni = this.elements.length, ki = ni, i, j;
            var imatrix = Matrix.identity(ni);
            var M = this.augment(imatrix).toRightTriangular();
            var np, kp = M.elements[0].length, p, els, divisor;
            var inverse_elements = [], new_element;
            // Matrix is non-singular so there will be no zeros on the diagonal
            // Cycle through rows from last to first
            do {
                i = ni - 1;
                // First, normalise diagonal elements to 1
                els = [];
                np = kp;
                inverse_elements[i] = [];
                divisor = M.elements[i][i];
                do {
                    p = kp - np;
                    new_element = this.$.divide(M.elements[i][p], divisor.clone());
                    els.push(new_element);
                    // Shuffle of the current row of the right hand side into the results
                    // array as it will not be modified by later runs through this loop
                    if (p >= ki) {
                        inverse_elements[i].push(new_element);
                    }
                }
                while(--np);
                M.elements[i] = els;
                // Then, subtract this row from those above it to
                // give the identity matrix on the left hand side
                for (j = 0; j < i; j++) {
                    els = [];
                    np = kp;
                    do {
                        p = kp - np;
                        els.push(this.$.subtract(M.elements[j][p].clone(), this.$.multiply(M.elements[i][p].clone(), M.elements[j][i].clone())));
                    }
                    while(--np);
                    M.elements[j] = els;
                }
            }
            while(--ni);
            return Matrix.fromArray(inverse_elements);
        }, undefined, this);
    }

    // ported from Sylvester.js
    toRightTriangular() {
        return block('SAFE', function () {
            var M = this.clone(), els, fel, nel,
                n = this.elements.length, k = n, i, np, kp = this.elements[0].length, p;
            do {
                i = k - n;
                fel = M.elements[i][i];
                if (fel.valueOf() === 0) {
                    for (var j = i + 1; j < k; j++) {
                        nel = M.elements[j][i];
                        if (nel && nel.valueOf() !== 0) {
                            els = [];
                            np = kp;
                            do {
                                p = kp - np;
                                els.push(this.$.add(M.elements[i][p].clone(), M.elements[j][p].clone()));
                            }
                            while(--np);
                            M.elements[i] = els;
                            break;
                        }
                    }
                }
                var fel = M.elements[i][i];
                if (fel.valueOf() !== 0) {
                    for (j = i + 1; j < k; j++) {
                        var multiplier = this.$.divide(M.elements[j][i].clone(), M.elements[i][i].clone());
                        els = [];
                        np = kp;
                        do {
                            p = kp - np;
                            // Elements with column numbers up to an including the number
                            // of the row that we're subtracting can safely be set straight to
                            // zero, since that's the point of this routine and it avoids having
                            // to loop over and correct rounding errors later
                            els.push(p <= i ? new Symbol(0) :
                                this.$.subtract(M.elements[j][p].clone(), this.$.multiply(M.elements[i][p].clone(), multiplier.clone())));
                        }
                        while(--np);
                        M.elements[j] = els;
                    }
                }
            }
            while(--n);

            return M;
        }, undefined, this);
    }

    transpose() {
        var rows = this.elements.length, cols = this.elements[0].length;
        var M = new Matrix(), ni = cols, i, nj, j;

        do {
            i = cols - ni;
            M.elements[i] = [];
            nj = rows;
            do {
                j = rows - nj;
                M.elements[i][j] = this.elements[j][i].clone();
            }
            while(--nj);
        }
        while(--ni);
        return M;
    }

    // Returns true if the matrix can multiply the argument from the left
    canMultiplyFromLeft(matrix) {
        var l = isMatrix(matrix) ? matrix.elements.length : matrix.length;
        // this.columns should equal matrix.rows
        return (this.elements[0].length === l);
    }

    sameSize(matrix) {
        return this.rows() === matrix.rows() && this.cols() === matrix.cols();
    }

    multiply(matrix) {
        return block('SAFE', function () {
            var M = matrix.elements || matrix;
            if (!this.canMultiplyFromLeft(M)) {
                if (this.sameSize(matrix)) {
                    var MM = new Matrix();
                    var rows = this.rows();
                    for (var i = 0; i < rows; i++) {
                        var e = this.$.multiply(new Vector(this.elements[i]), new Vector(matrix.elements[i]));
                        MM.elements[i] = e.elements;
                    }
                    return MM;
                }
                return null;
            }
            var ni = this.elements.length, ki = ni, i, nj, kj = M[0].length, j;
            var cols = this.elements[0].length, elements = [], sum, nc, c;
            do {
                i = ki - ni;
                elements[i] = [];
                nj = kj;
                do {
                    j = kj - nj;
                    sum = new Symbol(0);
                    nc = cols;
                    do {
                        c = cols - nc;
                        sum = this.$.add(sum, this.$.multiply(this.elements[i][c], M[c][j]));
                    }
                    while(--nc);
                    elements[i][j] = sum;
                }
                while(--nj);
            }
            while(--ni);
            return Matrix.fromArray(elements);
        }, undefined, this);
    }

    add(matrix, callback) {
        var M = new Matrix();
        if (this.sameSize(matrix)) {
            this.eachElement(function (e, i, j) {
                var result = this.$.add(e.clone(), matrix.elements[i][j].clone());
                if (callback) {
                    result = callback.call(M, result, e, matrix.elements[i][j]);
                }
                M.set(i, j, result);
            });
        }
        return M;
    }

    subtract(matrix, callback) {
        var M = new Matrix();
        if (this.sameSize(matrix)) {
            this.eachElement(function (e, i, j) {
                var result = this.$.subtract(e.clone(), matrix.elements[i][j].clone());
                if (callback) {
                    result = callback.call(M, result, e, matrix.elements[i][j]);
                }
                M.set(i, j, result);
            });
        }
        return M;
    }

    negate() {
        this.each(function (e) {
            return e.negate();
        });
        return this;
    }

    toVector() {
        if (this.rows() === 1 || this.cols() === 1) {
            var v = new Vector();
            v.elements = this.elements;
            return v;
        }
        return this;
    }

    toString(newline, to_decimal) {
        var l = this.rows(),
            s = [];
        newline = newline === undefined ? '\n' : newline;
        for (var i = 0; i < l; i++) {
            s.push('[' + this.elements[i].map(function (x) {
                var v = to_decimal ? x.multiplier.toDecimal() : x.toString();
                return x !== undefined ? v : '';
            }).join(',') + ']');
        }
        return 'matrix' + inBrackets(s.join(','));
    }

    text() {
        return 'matrix(' + this.elements.toString('') + ')';
    }

    latex(option) {
        var cols = this.cols(), elements = this.elements;
        return format('\\begin{vmatrix}{0}\\end{vmatrix}', function () {
            var tex = [];
            for (var row in elements) {
                var row_tex = [];
                for (var i = 0; i < cols; i++) {
                    row_tex.push(this.$LaTeX.latex.call(this.$LaTeX, elements[row][i], option));
                }
                tex.push(row_tex.join(' & '));
            }
            return tex.join(' \\cr ');
        });
    }

    each(fn) {
        return this.eachElement(fn);
    }
}


/**
 * Checks to see if the object provided is a Matrix
 * @param {Object} obj
 */
export function isMatrix(obj) {
    return (obj instanceof Matrix);
}
