import {isMatrix} from '../../../../Core/Utils';
import {err} from '../../../../Core/Errors';

export function invert(mat) {
    if (isMatrix(mat))
        return mat.invert();
    err('invert expects a matrix');
}
