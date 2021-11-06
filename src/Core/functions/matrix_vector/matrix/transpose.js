import {isMatrix} from '../../../Utils';
import {err} from '../../../Errors';

export function transpose(mat) {
    if (isMatrix(mat))
        return mat.transpose();
    err('function transpose expects a matrix');
}
