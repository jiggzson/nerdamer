import {isMatrix} from '../../../../Core/Utils';
import {err} from '../../../../Core/Errors';

export function transpose(mat) {
    if (isMatrix(mat))
        return mat.transpose();
    err('function transpose expects a matrix');
}
