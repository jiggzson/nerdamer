import {isMatrix} from '../../../Parser/Matrix';
import {Symbol} from '../../Symbol';

/**
 *
 * @param {Matrix|Vector|Set|Collection} obj
 * @param {Symbol} item
 * @returns {Boolean}
 */
export function is_in(obj, item) {
    if (isMatrix(obj)) {
        for (var i = 0, l = obj.rows(); i < l; i++) {
            for (var j = 0, l2 = obj.cols(); j < l2; j++) {
                var element = obj.elements[i][j];
                if (element.equals(item))
                    return new Symbol(1);
            }
        }
    }
    else if (obj.elements) {
        for (var i = 0, l = obj.elements.length; i < l; i++) {
            if (obj.elements[i].equals(item))
                return new Symbol(1);
        }
    }

    return new Symbol(0);
}
