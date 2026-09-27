import { mathFunctionRegistry, systemFunction } from '../../dispatch';
import { determinant, invert, nullspace } from './functions';
import { Matrix } from './Matrix';
import { imatrix } from './utils';
import { matrix } from '../../../math/math';

import type { Expression } from '../expression/Expression';

export function loadMatrixFunctions() {
	Object.assign(mathFunctionRegistry, {
		matrix: systemFunction({ fn: matrix, minArgs: 1, maxArgs: -1, distElWise: false }),
		imatrix: systemFunction({ fn: imatrix, minArgs: 1, maxArgs: 1, distElWise: false }),
		determinant: systemFunction({ fn: determinant, minArgs: 1, maxArgs: 1, distElWise: false }),
		invert: systemFunction({ fn: invert, minArgs: 1, maxArgs: 1, distElWise: false }),
		transpose: systemFunction({ fn: (M: Matrix) => M.transpose(), minArgs: 1, maxArgs: 1, distElWise: false }),
		augment: systemFunction({ fn: (M: Matrix, N: Matrix) => M.augment(N), minArgs: 2, maxArgs: 2, distElWise: false }),
		rref: systemFunction({ fn: (M: Matrix, prime?: Expression) => M.rref(prime), minArgs: 1, maxArgs: 2, distElWise: false }),
		nullspace: systemFunction({ fn: nullspace, minArgs: 1, maxArgs: 2, distElWise: false }),
	});
}
