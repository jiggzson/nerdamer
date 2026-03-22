import { Expression } from '../../core/classes/expression/Expression';
import { constantsFreeProduct } from '../../core/classes/expression/products';
import { zero } from '../../core/classes/expression/shortcuts';
import { assertPlainVariableAndGetString } from '../../core/classes/expression/utils';

import { tableOfTransforms } from './laplaceTable';

import type { ExpressionInputType } from '../../core/classes/parser/types';

export function laplace(expr: ExpressionInputType, t: ExpressionInputType, s: ExpressionInputType) {
	expr = Expression.create(expr).expand();
	s = assertPlainVariableAndGetString(Expression.create(s));
	t = assertPlainVariableAndGetString(Expression.create(t));

	let retval: Expression | undefined;

	// Linearity over sums
	if (expr.isSum() && expr.isLinear()) {
		const elements = expr.elementsArray();
		retval = zero();

		for (const e of elements) {
			const transform = laplace(e, t, s);

			// Any unevaluated laplace(...) means this branch failed
			if (transform.isFunction('laplace')) {
				retval = undefined;
				break;
			}

			retval = retval.plus(transform);
		}

		if (retval) {
			return retval;
		}
	}

	// Pull out constants from products
	if (expr.isProduct()) {
		// let constants: Expression;
		// let expression: Expression;

		const { constants, expression } = constantsFreeProduct(expr, t);

		// Only worthwhile if something was actually extracted
		if (!constants.isOne()) {
			const transform = laplace(expression, t, s);

			if (!transform.isFunction('laplace')) {
				return constants.times(transform);
			}
		}
	}

	// Base/derived table lookup
	retval = tableOfTransforms.lookup(expr, t, 0);

	if (retval) {
		if (s !== 's') {
			retval = retval.evaluate({ s });
		}
		return retval;
	}

	return Expression.toFunction('laplace', [expr, t, s]);
}
