import { Equation } from '../core/classes/equation/Equation';
import { Expression } from '../core/classes/expression/Expression';
import { dataTypes } from '../core/classes/parser/constants';
import { Parser } from '../core/classes/parser/Parser';
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

export function extractVariable(variable: ExpressionInput) {
	variable = Expression.create(variable);
	if (!variable.isPlainVariable()) {
		throw new UnexpectedInputError(
			message('plainVariableExpected', { input: variable.text() })
		);
	}
	return variable.value;
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
		x = extractVariable(variable);
		if (x && vars[0] && !vars.includes(x)) {
			// Rethink. Throw a better error message.
			throw new UnexpectedInputError(message('tooManyUnknowns'));
		}
	}

	return {
		expression,
		x,
	};
}
