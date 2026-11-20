import { Equation } from '../core/classes/equation/Equation';
import { collectVariablesSet } from '../core/classes/expression/collect';
import { Expression } from '../core/classes/expression/Expression';
import { requireVariableName } from '../core/classes/expression/utils';
import { Parser } from '../core/classes/parser/Parser';
import { findComparison } from '../core/classes/parser/syntax';
import { dataTypes } from '../core/constants/entityTypes';
import { message, UnexpectedInputError, UnsupportedOperationError } from '../core/errors';

import type { ExpressionInput, NerdamerInput, ParserEntity } from '../core/types';

export interface SolverInputs {
	x: string;
	expression: Expression;
}

/**
 * Parses solver input text. A comparison would evaluate to 0 or 1, which the solver would take
 * as the equation 0=0 or 1=0, so it is rejected as the parser rejects it in solve(x<1,x).
 */
function parseSolverText(source: string, fn: string): ParserEntity {
	const comparison = findComparison(Parser.tokenize(source));
	if (comparison !== undefined) {
		throw new UnsupportedOperationError(
			message('comparisonUnsupported', { function: fn, operator: comparison })
		);
	}
	return Parser.parse(source);
}

export function normalizeSolverExpression(input: NerdamerInput): Expression {
	if (Equation.isEquation(input)) {
		return input.toLHS().LHS;
	}
	if (Expression.isExpression(input)) {
		return input;
	}

	const parsed = parseSolverText(String(input), 'solveeqs');
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
	const entity = typeof input === 'string' ? parseSolverText(input, 'solve') : input;
	const expression = normalizeSolverExpression(entity);

	let x: string;
	// Get the variable to solve for. Without one, use the input's only variable, counting both
	// sides of an equation as the parser does: the residual can cancel one, as y=y+x^2 has x
	// alone. Choosing among several would be a guess.
	if (!variable) {
		const sides = Equation.isEquation(entity) ? [entity.LHS, entity.RHS] : [expression];
		const vars = collectVariablesSet(sides);
		if (vars.length === 0) {
			throw new UnexpectedInputError(message('noVariableInExpression'));
		}
		if (vars.length > 1) {
			throw new UnexpectedInputError(
				message('ambiguousVariable', { expression: String(entity) })
			);
		}
		x = vars[0];
	} else {
		x = requireVariableName(Expression.create(variable), true);
	}

	return {
		expression,
		x,
	};
}
