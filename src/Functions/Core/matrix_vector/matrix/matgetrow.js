import {Matrix} from '../../../../Types/Matrix';
import {symfunction} from '../../../../Types/Symbol';

export function matgetrow(matrix, i) {
    if (i.isConstant())
        return new Matrix(matrix.elements[i]);
    return symfunction('matgetrow', arguments);
}