import { Expression } from '../core/classes/expression/Expression';
import { zero } from '../core/classes/expression/shortcuts';
import { message, UnexpectedInputError } from '../core/errors';

import type { ExpressionInputType } from '../core/classes/parser/types';

/**
 * Completes the square for a quadratic expression with respect to a variable.
 * Given ax² + bx + c, returns a(x + h)² + k where h = b/(2a), k = c - b²/(4a).
 *
 * @param expr The expression to complete the square on
 * @param variable The variable to complete the square with respect to
 * @returns { a, h, k, variable, expression } where expression = a*(variable + h)^2 + k
 */
export function sqcomp(expr: ExpressionInputType, variable?: string) {
	const e = Expression.create(expr);

	// Auto-detect variable if not provided
	if (!variable) {
		const vars = e.variables();
		if (vars.length === 0) {
			throw new UnexpectedInputError(message('noVariableInExpression'));
		}
		variable = vars[0];
	}

	const c = e.coeffs(variable);

	if (c.max() !== 2) {
		throw new UnexpectedInputError(message('quadraticExpressionExpected'));
	}

	const a = c.hasPower(2) ? c.getPower(2) : zero();
	const b = c.hasPower(1) ? c.getPower(1) : zero();
	const k0 = c.hasPower(0) ? c.getPower(0) : zero();

	// h = b / (2a)
	const h = b.div(a.times(2));
	// k = c - b² / (4a)
	const k = k0.minus(b.pow(2).div(a.times(4)));

	// Build a*(variable + h)^2 + k
	const x = Expression.create(variable);
	const expression = a.times(x.plus(h).pow(2)).plus(k);

	return { a, h, k, variable, expression };
}
