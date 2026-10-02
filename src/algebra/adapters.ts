import { assertPlainVariableAndGetString } from '../core/classes/expression/utils';

import { sqcomp } from './utils';

import type { Expression } from '../core/classes/expression/Expression';

/** Completes the square and returns the expression expected by parser notation. */
export function completeSquare(expr: Expression, variable?: Expression): Expression {
	const variableName =
		variable === undefined ? undefined : assertPlainVariableAndGetString(variable);
	const retval = sqcomp(expr, variableName).expression;
	return retval;
}
