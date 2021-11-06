import {isMatrix, isVector} from '../../Utils';
import {Symbol} from '../../Symbol';
import {isSet} from '../../../Parser/Set';
import {err} from '../../Errors';

export function size(symbol) {
    var retval;
    if (isMatrix(symbol))
        retval = [new Symbol(symbol.cols()), new Symbol(symbol.rows())];
    else if (isVector(symbol) || isSet(symbol))
        retval = new Symbol(symbol.elements.length);
    else
        err('size expects a matrix or a vector');
    return retval;
}
