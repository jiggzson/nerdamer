import { Expression } from '../core/classes/expression/Expression';
import { TRUNC } from '../core/classes/parser/constants';

import type { ExpressionInput } from '../core/types';

/**
 * Truncates a number toward zero.
 *
 * Numeric inputs discard their fractional part without changing the sign of the
 * integer portion. Symbolic inputs remain unevaluated.
 *
 * @param x - The expression to truncate.
 * @returns The integer portion of `x`, or symbolic `trunc(x)`.
 *
 * @example
 * ```ts
 * trunc('3.7').text()    // "3"
 * trunc('-2.7').text()   // "-2"
 * trunc('x').text()      // "trunc(x)"
 * ```
 */
export function trunc(x: ExpressionInput): Expression {
	x = Expression.create(x);

	let retval: Expression;

	if (x.isPosInf() || x.isNegInf()) {
		retval = x.isNegInf() ? Expression.NegInf() : Expression.Inf();
	} else if (x.isNUM()) {
		const m = x.getMultiplier();
		retval = Expression.Number(m.numerator / m.denominator);
	} else {
		retval = Expression.toFunction(TRUNC, [x]);
	}

	return retval;
}
