import {isMatrix} from '../../../../Parser/Matrix';

export function determinant(symbol) {
    if (isMatrix(symbol)) {
        return symbol.determinant();
    }
    return symbol;
}
