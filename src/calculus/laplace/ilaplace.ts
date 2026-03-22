import { partfrac } from '../../algebra/partfrac';
import { Expression } from '../../core/classes/expression/Expression';
import { constantsFreeProduct } from '../../core/classes/expression/products';
import { zero } from '../../core/classes/expression/shortcuts';
import { assertPlainVariableAndGetString } from '../../core/classes/expression/utils';

import { tableOfInverseTransforms } from './ilaplaceTable';

import type { ExpressionInputType } from '../../core/classes/parser/types';

export function ilaplace(
	expr: ExpressionInputType,
	s: ExpressionInputType,
	t: ExpressionInputType
): Expression {
	expr = Expression.create(expr);

	s = assertPlainVariableAndGetString(Expression.create(s));
	t = assertPlainVariableAndGetString(Expression.create(t));

	let retval: Expression | undefined;

	// Linearity over sums
	if (expr.isSum() && expr.isLinear()) {
		const elements = expr.elementsArray();
		retval = zero();

		for (const e of elements) {
			const transform = ilaplace(e, s, t);

			// Any unevaluated ilaplace(.) means this branch failed
			if (transform.isFunction('ilaplace')) {
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
		const { constants, expression } = constantsFreeProduct(expr, s);

		if (!constants.isOne()) {
			const transform = ilaplace(expression, s, t);

			if (!transform.isFunction('ilaplace')) {
				return constants.times(transform);
			}
		}
	}

	// Base/derived table lookup
	retval = tableOfInverseTransforms.lookup(expr, s, 0);

	if (retval) {
		if (t !== 't') {
			retval = retval.evaluate({ t });
		}
		return retval!;
	}

	// Exponential shift: L^-1{e^(-a*s) * F(s)} = heaviside(t-a) * f(t-a)
	// When e^(-a*s) appears, it lands in the denominator as e^(a*s) with a > 0.
	{
		const num = expr.getNumerator();
		const den = expr.getDenominator();
		const shift = extractExpShift(den, s as string);

		if (shift) {
			// Rebuild the expression without the exponential factor
			const stripped = num.div(shift.remainder);
			const transform = ilaplace(stripped, s, t);

			if (!transform.isFunction('ilaplace')) {
				const a = shift.coefficient;
				const tShifted = Expression.create(t).minus(a);
				const shifted = transform.subst(t as string, tShifted.text());
				return Expression.toFunction('heaviside', [tShifted]).times(shifted);
			}
		}
	}

	// Partial fraction decomposition (fallback when no direct table match).
	// IMPORTANT: partfrac returns the same reference (===) when no decomposition
	// occurs. This identity check avoids infinite recursion. If partfrac is ever
	// changed to return a copy on no-op, this will silently cause wasted recursion
	// (or worse). Keep this contract in sync with partfrac.
	const decomposed = partfrac(expr, s);

	if (decomposed !== expr) {
		const transform = ilaplace(decomposed, s, t);

		if (!transform.isFunction('ilaplace')) {
			return transform;
		}
	}

	return Expression.toFunction('ilaplace', [expr, s, t]);
}

/**
 * Scans a denominator expression for an exponential factor e^(a*s) where a > 0.
 * This corresponds to e^(-a*s) in the original expression (negative absorbed into denominator).
 *
 * @returns The positive shift coefficient and the denominator with the exponential stripped,
 *          or undefined if no such factor is found.
 */
function extractExpShift(
	den: Expression,
	s: string
): { coefficient: Expression; remainder: Expression } | undefined {
	const elements = den.isProduct() ? den.elementsArray() : [den];

	for (const el of elements) {
		if (!el.isEXP()) {
			continue;
		}

		const exponent = el.getPower();

		if (!exponent.hasVariable(s)) {
			continue;
		}

		// Check that the exponent is linear in s: exponent = a * s (no constant term, no higher powers)
		const { constants: coefficient, expression: variable } = constantsFreeProduct(exponent, s);

		if (!variable.eq(s)) {
			continue;
		}

		if (coefficient.sign() <= 0) {
			continue;
		}

		// Strip this factor from the denominator
		const remainder = den.div(el);

		return { coefficient, remainder };
	}

	return undefined;
}
