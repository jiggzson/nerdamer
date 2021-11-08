import {symfunction} from '../../../../Types/Symbol';

export function matget(matrix, i, j) {
    if (i.isConstant() && j.isConstant())
        return matrix.elements[i][j];
    return symfunction('matget', arguments);
}