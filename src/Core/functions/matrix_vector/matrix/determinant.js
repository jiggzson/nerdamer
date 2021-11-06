import {isMatrix} from '../../../Utils';

export function determinant(symbol) {
    if (isMatrix(symbol)) {
        return symbol.determinant();
    }
    return symbol;
}
