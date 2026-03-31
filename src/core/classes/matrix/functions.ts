import type { Matrix } from './Matrix';

export function determinant(M: Matrix) {
	return M.copy().determinant();
}
