import {symfunction} from '../../../../Types/Symbol';
import {DimensionError} from '../../../../Core/Errors';

export function matsetrow(matrix, i, x) {
    //handle symbolics
    if (!i.isConstant())
        return symfunction('matsetrow', arguments);
    if (matrix.elements[i].length !== x.elements.length)
        throw new DimensionError('Matrix row must match row dimensions!');
    var M = matrix.clone();
    M.elements[i] = x.clone().elements;
    return M;
}