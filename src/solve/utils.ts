import { Equation } from '../core/classes/equation/Equation';
import { Expression } from '../core/classes/expression/Expression';
import { requireVariableName } from '../core/classes/expression/utils';
import { Parser } from '../core/classes/parser/Parser';
import { dataTypes } from '../core/constants/entityTypes';
import { message, UnexpectedInputError } from '../core/errors';

import type { ExpressionInput, NerdamerInput } from '../core/types';

export interface SolverInputs {
	x: string;
	expression: Expression;
}

export function normalizeSolverExpression(input: NerdamerInput): Expression {
	if (Equation.isEquation(input)) {
		return input.toLHS().LHS;
	}
	if (Expression.isExpression(input)) {
		return input;
	}

	const parsed = Parser.parse(String(input));
	if (Equation.isEquation(parsed)) {
		return parsed.toLHS().LHS;
	}
	if (Expression.isExpression(parsed)) {
		return parsed;
	}

	throw new UnexpectedInputError(
		message('expressionExpected', { type: dataTypes[parsed.dataType] })
	);
}

export function prepareSolverInputs(
	input: ExpressionInput | Equation | string,
	variable?: ExpressionInput
): SolverInputs {
	const expression = normalizeSolverExpression(input);

	const vars = expression.variables();
	let x: string;
	// Get the variable to solve for
	if (!variable) {
		if (vars.length === 1) {
			x = vars[0];
		} else {
			throw new UnexpectedInputError(message('tooManyUnknowns'));
		}
	} else {
		x = requireVariableName(Expression.create(variable), true);
	}

	return {
		expression,
		x,
	};
}
