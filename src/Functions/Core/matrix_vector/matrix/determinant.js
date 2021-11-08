import {isMatrix} from '../../../../Core/Utils';

export function determinant(symbol) {
    if (isMatrix(symbol)) {
        return symbol.determinant();
    }
    return symbol;
}
