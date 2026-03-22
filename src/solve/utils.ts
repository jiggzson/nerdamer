import { Equation } from '../core/classes/equation/Equation';
import { Expression } from '../core/classes/expression/Expression';
import { dataTypes } from '../core/classes/parser/constants';
import { Parser } from '../core/classes/parser/Parser';
import { message, UnexpectedInputError } from '../core/errors';

import type { ExpressionInputType } from '../core/classes/parser/types';

export interface SolverInputs {
	x: string;
	expression: Expression;
}

export function extractVariable(variable: ExpressionInputType) {
	variable = Expression.create(variable);
	if (!variable.isPlainVariable()) {
		throw new UnexpectedInputError(
			message('plainVariableExpected', { input: variable.text() })
		);
	}
	return variable.value;
}

export function prepareSolverInputs(
	input: ExpressionInputType | Equation | string,
	variable?: ExpressionInputType
): SolverInputs {
	let expression: Expression;
	if (Equation.isEquation(input)) {
		expression = input.toLHS().LHS;
	} else if (!Expression.isExpression(input)) {
		// Cast them all to string
		const parsed = Parser.parse(String(input));
		// Was it an equation string?
		if (Equation.isEquation(parsed)) {
			expression = parsed.toLHS().LHS;
		} else if (!Expression.isExpression(parsed)) {
			// Complain for any other types
			throw new UnexpectedInputError(
				message('expressionExpected', { type: dataTypes[parsed.dataType] })
			);
		} else {
			expression = parsed;
		}
	} else {
		expression = input;
	}

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
