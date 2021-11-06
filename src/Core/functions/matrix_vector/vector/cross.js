import {isVector} from '../../../../Parser/Vector';
import {err} from '../../../Errors';

export function cross(vec1, vec2) {
    if (isVector(vec1) && isVector(vec2))
        return vec1.cross(vec2);
    err('function cross expects 2 vectors');
}
