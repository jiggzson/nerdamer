import { dataTypes } from '../../constants/entityTypes';
import { IMATRIX } from '../../constants/functionNames';
import { MathError, message, UnexpectedDataType } from '../../errors';
import { Expression } from '../expression/Expression';

import { Matrix } from './Matrix';

import type { ParserEntity } from '../../types';

/**
 * Creates an identity matrix of integer size.
 *
 * @returns A Matrix for a non-negative integer argument, or an unevaluated `imatrix(x)`
 * Expression when the size is not an integer. A negative size or a structure throws.
 */
export function imatrix(x: Expression) {
	let retval;
	if (!Expression.isExpression(x)) {
		throw new UnexpectedDataType(
			message('expressionExpected', { type: dataTypes[(x as ParserEntity).dataType] ?? 'undefined' })
		);
	}
	if (x.isInteger() && x.isNegative()) {
		throw new MathError(message('identitySizeInvalid', { size: x.text() }));
	}
	if (!x.isInteger()) {
		retval = Expression.toFunction(IMATRIX, [x]);
	} else {
		retval = Matrix.identity(Number(x));
	}

	return retval;
}
