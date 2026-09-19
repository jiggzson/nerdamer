import { message, UnsupportedOperationError } from '../../errors';
import { Expression } from '../expression/Expression';
import { Polynomial } from '../polynomial/Polynomial';
import { Vector } from '../vector/Vector';

import { Matrix } from './Matrix';

/**
 * Computes the determinant without mutating the supplied Matrix.
 * @throws {@link core!UnsupportedOperationError} If `M` is not square.
 */
export function determinant(M: Matrix) {
	return M.copy().determinant();
}

/** Returns the nullspace basis as a Vector of basis vectors. */
export function nullspace(M: Matrix, prime?: string | number | Expression): Vector {
	return new Vector(M.nullspace(prime).map(vector => new Vector(vector)));
}

/**
 * Computes the monic characteristic polynomial `det(variable*I - M)`.
 *
 * @remarks
 * The spectral variable is explicit so callers can choose a name that does not collide with
 * symbols already present in a symbolic matrix. The Faddeev-LeVerrier recurrence reuses exact
 * Matrix multiplication, trace, scalar arithmetic, and identity construction without introducing
 * symbolic pivot denominators from Gaussian determinant elimination.
 *
 * @param M - Square matrix whose characteristic polynomial is requested.
 * @param variable - Variable name used for the polynomial indeterminate.
 * @returns The exact characteristic polynomial in `variable`.
 * @throws {@link core!UnsupportedOperationError} If `M` is not square.
 */
export function characteristicPolynomial(M: Matrix, variable: string): Polynomial {
	if (!M.isSquare()) {
		throw new UnsupportedOperationError(message('squareMatrixRequired'));
	}

	const n = M.rows();
	const spectralParameter = Expression.Variable(variable);
	const identity = Matrix.identity(n);
	let recurrenceMatrix = identity;
	let characteristicExpression = spectralParameter.pow(n);

	for (let k = 1; k <= n; k++) {
		const product = M.times(recurrenceMatrix);
		const coefficient = product.trace().neg().div(k);
		characteristicExpression = characteristicExpression.plus(
			coefficient.times(spectralParameter.pow(n - k))
		);
		recurrenceMatrix = product.plus(identity.times(coefficient));
	}

	return new Polynomial(characteristicExpression, [variable]);
}
