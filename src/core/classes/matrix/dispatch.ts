import { matrix } from '../../../math/index';
import { dataTypes } from '../../constants/entityTypes';
import { mathFunctionRegistry, systemFunction } from '../../dispatch';
import { message, UnexpectedDataType } from '../../errors';
import { Expression } from '../expression/Expression';

import { determinant, invert, nullspace } from './functions';
import { Matrix } from './Matrix';
import { imatrix } from './utils';

// The type name of a received argument, for the error message.
function typeName(arg: unknown): string {
	if (typeof arg === 'object' && arg !== null && 'dataType' in arg) {
		return dataTypes[String(arg.dataType)] ?? String(arg.dataType);
	}
	return typeof arg;
}

/**
 * Wraps a matrix function so that each of its first `count` arguments must be
 * a Matrix. Anything else, such as a vector of vectors, gets a clear error
 * instead of a missing-method TypeError.
 */
export function requireMatrix<A extends unknown[], R>(
	name: string,
	fn: (...args: A) => R,
	count = 1
): (...args: A) => R {
	return (...args: A) => {
		for (const arg of args.slice(0, count)) {
			if (!Matrix.isMatrix(arg)) {
				throw new UnexpectedDataType(
					message('matrixRequired', { fn: name, type: typeName(arg) })
				);
			}
		}
		return fn(...args);
	};
}

export function loadMatrixFunctions() {
	Object.assign(mathFunctionRegistry, {
		matrix: systemFunction({ fn: matrix, minArgs: 1, maxArgs: -1, distElWise: false }),
		imatrix: systemFunction({ fn: imatrix, minArgs: 1, maxArgs: 1, distElWise: false }),
		determinant: systemFunction({ fn: requireMatrix('determinant', determinant), minArgs: 1, maxArgs: 1, distElWise: false }),
		invert: systemFunction({ fn: requireMatrix('invert', invert), minArgs: 1, maxArgs: 1, distElWise: false }),
		transpose: systemFunction({ fn: requireMatrix('transpose', (M: Matrix) => M.transpose()), minArgs: 1, maxArgs: 1, distElWise: false }),
		trace: systemFunction({ fn: requireMatrix('trace', (M: Matrix) => M.trace()), minArgs: 1, maxArgs: 1, distElWise: false }),
		rank: systemFunction({ fn: requireMatrix('rank', (M: Matrix) => Expression.Number(M.rank())), minArgs: 1, maxArgs: 1, distElWise: false }),
		augment: systemFunction({ fn: requireMatrix('augment', (M: Matrix, N: Matrix) => M.augment(N), 2), minArgs: 2, maxArgs: 2, distElWise: false }),
		rref: systemFunction({ fn: requireMatrix('rref', (M: Matrix, prime?: Expression) => M.rref(prime)), minArgs: 1, maxArgs: 2, distElWise: false }),
		nullspace: systemFunction({ fn: requireMatrix('nullspace', nullspace), minArgs: 1, maxArgs: 2, distElWise: false }),
	});
}
