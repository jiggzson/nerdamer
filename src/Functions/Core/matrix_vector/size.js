import {isMatrix, isVector} from '../../../Core/Utils';
import {Symbol} from '../../../Types/Symbol';
import {isSet} from '../../../Types/Set';
import {err} from '../../../Core/Errors';

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
