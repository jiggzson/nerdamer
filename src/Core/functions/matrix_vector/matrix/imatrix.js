import {Matrix} from '../../../../Parser/Matrix';

/**
 * Returns an identity matrix of nxn
 * @param {Number} n
 * @returns {Matrix}
 */
export function imatrix(n) {
    return Matrix.identity(n);
}
