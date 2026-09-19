import { Expression } from '../../core/classes/expression/Expression';
import { constantsFreeProduct } from '../../core/classes/expression/products';
import { one, zero } from '../../core/classes/expression/shortcuts';
import { assertPlainVariableAndGetString } from '../../core/classes/expression/utils';
import { LAPLACE, LOG } from '../../core/classes/parser/constants';
import { Pattern } from '../../core/converters/Pattern';

import { tableOfTransforms } from './laplaceTable';

import type { ExpressionInput } from '../../core/types';

/**
 * Computes a symbolic Laplace transform from a time variable to a transform variable.
 *
 * The expression is expanded, linear sums are transformed term by term,
 * constants independent of the time variable are extracted, and the remaining
 * expression is matched against the transform table.
 *
 * @param expr - Time-domain expression.
 * @param t - Plain time-domain variable.
 * @param s - Plain transform-domain variable.
 * @returns The symbolic transform, or an unevaluated `laplace(expr, t, s)`
 * Expression when no table rule resolves the input.
 * @throws {@link core!UnexpectedInputError} If `t` or `s` is not a plain variable.
 *
 * @example
 * ```ts
 * laplace('sin(t)', 't', 's').text();
 * ```
 */
export function laplace(expr: ExpressionInput, t: ExpressionInput, s: ExpressionInput): Expression {
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
			if (transform.isFunction(LAPLACE)) {
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

			if (!transform.isFunction(LAPLACE)) {
				return constants.times(transform);
			}
		}
	}

	// Pattern writes a negative exponential power as a reciprocal, while the transform table
	// stores exponential factors with their signed rate in the exponent. Apply the frequency
	// shift directly so the remainder can use the existing table instead of duplicating rules.
	const factors = expr.isProduct() ? expr.elementsArray() : [expr];
	for (let i = 0; i < factors.length; i++) {
		const factor = factors[i];
		if (!factor.isEXP()) {
			continue;
		}

		const base = factor.getBase();
		const exponent = factor.getPower();
		if (base.hasVariable(t) || !exponent.isPolynomialLike()) {
			continue;
		}

		const coefficients = exponent.coeffs(t).toArray();
		if (coefficients.length !== 2 || !coefficients[0].isZero()) {
			continue;
		}

		const rate = coefficients[1];
		if (rate.sign() !== -1) {
			continue;
		}

		let remainder = one();
		for (let j = 0; j < factors.length; j++) {
			if (j !== i) {
				remainder = remainder.times(factors[j]);
			}
		}

		const transform = laplace(remainder, t, s);
		if (!transform.isFunction(LAPLACE)) {
			const baseLog = base.isE() ? one() : Expression.toFunction(LOG, [base]);
			const shiftedVariable = Expression.Variable(s).minus(rate.copy().times(baseLog));
			return transform.subst(s, shiftedVariable);
		}
	}

	// Base/derived table lookup
	retval = tableOfTransforms.lookup(new Pattern(expr, [t]), 0);

	if (retval) {
		if (s !== 's') {
			retval = retval.evaluate({ s });
		}
		return retval;
	}

	return Expression.toFunction(LAPLACE, [expr, t, s]);
}
