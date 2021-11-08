import {err} from '../../../../Core/Errors';
import {isVector} from '../../../../Core/Utils';

export function cross(vec1, vec2) {
    if (isVector(vec1) && isVector(vec2))
        return vec1.cross(vec2);
    err('function cross expects 2 vectors');
}
