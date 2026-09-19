import { Expression } from '../expression/Expression';
import { IMATRIX } from '../parser/constants';

import { Matrix } from './Matrix';

/**
 * Creates an identity matrix of integer size.
 *
 * @returns A Matrix for an integer argument, or an unevaluated `imatrix(x)`
 * Expression when the size is not an integer.
 */
export function imatrix(x: Expression) {
	let retval;
	if (!x.isInteger()) {
		retval = Expression.toFunction(IMATRIX, [x]);
	} else {
		retval = Matrix.identity(Number(x));
	}

	return retval;
}
