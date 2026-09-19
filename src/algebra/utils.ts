import { Expression } from '../core/classes/expression/Expression';
import { zero } from '../core/classes/expression/shortcuts';
import { message, UnexpectedInputError } from '../core/errors';

import type { ExpressionInput } from '../core/types';

/** Components of a quadratic rewritten by {@link sqcomp}. */
export interface CompleteSquareResult {
	/** Original quadratic coefficient. */
	a: Expression;
	/** Shift in `a*(variable+h)^2+k`. */
	h: Expression;
	/** Remaining constant in `a*(variable+h)^2+k`. */
	k: Expression;
	/** Variable used for the rewrite. */
	variable: string;
	/** Completed-square expression. */
	expression: Expression;
}

/**
 * Completes the square for a quadratic expression.
 *
 * For `a*x^2+b*x+c`, the returned expression has the form
 * `a*(x+h)^2+k`, with `h=b/(2*a)` and `k=c-b^2/(4*a)`.
 *
 * @param expr - Quadratic expression to rewrite.
 * @param variable - Variable to use. Defaults to the first variable in the expression.
 * @returns The quadratic coefficient, shift, remainder, selected variable, and rewritten expression.
 *
 * @example
 * ```ts
 * const result = sqcomp('x^2+6*x+1');
 * result.expression.text({ sort: true }); // "(3+x)^2-8"
 * ```
 */
export function sqcomp(
	expr: ExpressionInput,
	variable?: string
): CompleteSquareResult {
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
