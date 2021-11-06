import {Matrix} from '../../../../Parser/Matrix';
import {symfunction} from '../../../Symbol';

export function matgetrow(matrix, i) {
    if (i.isConstant())
        return new Matrix(matrix.elements[i]);
    return symfunction('matgetrow', arguments);
}