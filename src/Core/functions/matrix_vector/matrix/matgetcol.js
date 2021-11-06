import {symfunction} from '../../../Symbol';
import {Matrix} from '../../../../Parser/Matrix';

export function matgetcol(matrix, col_index) {
    //handle symbolics
    if (!col_index.isConstant())
        return symfunction('matgetcol', arguments);
    col_index = Number(col_index);
    var M = Matrix.fromArray([]);
    matrix.each(function (x, i, j) {
        if (j === col_index) {
            M.elements.push([x.clone()]);
        }
    });
    return M;
}