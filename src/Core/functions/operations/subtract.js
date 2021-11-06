import {isSymbol} from '../../Symbol';
import {add} from './add';
import {isVector} from '../../../Parser/Vector';
import {err} from '../../Errors';
import {isMatrix, Matrix} from '../../../Parser/Matrix';

/**
 * Gets called when the parser finds the - operator. Not the prefix operator. See this.add
 * @param {Symbol} a
 * @param {Symbol} b
 * @returns {Symbol}
 */
export function subtract(a, b) {
    var aIsSymbol = isSymbol(a),
        bIsSymbol = isSymbol(b);

    if (aIsSymbol && bIsSymbol) {
        if (a.unit || b.unit) {
            return deps.Unit.subtract(a, b);
        }
        return add(a, b.negate());
    }
    else {
        if (bIsSymbol && isVector(a)) {
            b = a.map(function (x) {
                return subtract(x, b.clone());
            });
        }
        else if (aIsSymbol && isVector(b)) {
            b = b.map(function (x) {
                return subtract(a.clone(), x);
            });
        }
        else if (isVector(a) && isVector(b)) {
            if (a.dimensions() === b.dimensions())
                b = a.subtract(b);
            else
                err('Unable to subtract vectors. Dimensions do not match.');
        }
        else if (isMatrix(a) && isVector(b)) {
            if (b.elements.length === a.rows()) {
                var M = new Matrix(), l = a.cols();
                b.each(function (e, i) {
                    var row = [];
                    for (var j = 0; j < l; j++) {
                        row.push(subtract(a.elements[i - 1][j].clone(), e.clone()));
                    }
                    M.elements.push(row);
                });
                return M;
            }
            else
                err('Dimensions must match!');
        }
        else if (isVector(a) && isMatrix(b)) {
            var M = b.clone().negate();
            return add(M, a);
        }
        else if (isMatrix(a) && isMatrix(b)) {
            b = a.subtract(b);
        }
        else if (isMatrix(a) && bIsSymbol) {
            var M = new Matrix();
            a.each(function (x, i, j) {
                M.set(i, j, subtract(x, b.clone()));
            });
            b = M;
        }
        else if (aIsSymbol && isMatrix(b)) {
            var M = new Matrix();
            b.each(function (x, i, j) {
                M.set(i, j, subtract(a.clone(), x));
            });
            b = M;
        }
        return b;
    }
}
