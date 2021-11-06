import {isMatrix} from '../../../../Parser/Matrix';
import {err} from '../../../Errors';

export function invert(mat) {
    if (isMatrix(mat))
        return mat.invert();
    err('invert expects a matrix');
}
