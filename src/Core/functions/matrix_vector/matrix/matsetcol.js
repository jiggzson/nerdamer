import {symfunction} from '../../../Symbol';
import {DimensionError} from '../../../Errors';

export function matsetcol(matrix, j, col) {
    //handle symbolics
    if (!j.isConstant())
        return symfunction('matsetcol', arguments);
    j = Number(j);
    if (matrix.rows() !== col.elements.length)
        throw new DimensionError('Matrix columns must match number of columns!');
    col.each(function (x, i) {
        matrix.set(i - 1, j, x.elements[0].clone());
    });
    return matrix;
}