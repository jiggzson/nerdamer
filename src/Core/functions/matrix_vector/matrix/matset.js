export function matset(matrix, i, j, value) {
    matrix.elements[i][j] = value;
    return matrix;
}
