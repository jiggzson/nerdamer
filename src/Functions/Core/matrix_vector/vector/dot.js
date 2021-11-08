import {err} from '../../../../Core/Errors';
import {isVector} from '../../../../Core/Utils';

export function dot(vec1, vec2) {
    if (isVector(vec1) && isVector(vec2))
        return vec1.dot(vec2);
    err('function dot expects 2 vectors');
}
