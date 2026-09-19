import { partfrac } from '../../algebra/partfrac';
import { sqcomp } from '../../algebra/utils';
import { Expression } from '../../core/classes/expression/Expression';
import { constantsFreeProduct } from '../../core/classes/expression/products';
import { zero } from '../../core/classes/expression/shortcuts';
import { assertPlainVariableAndGetString } from '../../core/classes/expression/utils';
import { HEAVISIDE, ILAPLACE } from '../../core/classes/parser/constants';
import { Pattern } from '../../core/converters/Pattern';

import { tableOfInverseTransforms } from './ilaplaceTable';

import type { ExpressionInput } from '../../core/types';

/**
 * Computes a symbolic inverse Laplace transform from a transform variable to a
 * time variable.
 *
 * The strategy applies linearity, extracts constants, consults the inverse
 * transform table, normalizes supported shifted quadratics and exponential
 * delays, and finally tries partial-fraction decomposition.
 *
 * @remarks
 * Exponential delay extraction requires a provably positive shift coefficient
 * according to the expression's current sign information. Unsupported or
 * ambiguous input is returned as an unevaluated `ilaplace(expr, s, t)`
 * Expression. The partial-fraction fallback is only attempted when both the
 * numerator and denominator are in its polynomial domain, and relies on
 * `partfrac` preserving object identity when it performs no decomposition.
 *
 * @param expr - Transform-domain expression.
 * @param s - Plain transform-domain variable.
 * @param t - Plain time-domain variable.
 * @returns The symbolic inverse transform, or an unevaluated `ilaplace(...)`
 * Expression when no strategy resolves the input.
 * @throws {@link core!UnexpectedInputError} If `s` or `t` is not a plain variable.
 *
 * @example
 * ```ts
 * ilaplace('1/(s^2+1)', 's', 't').text();
 * ```
 */
export function ilaplace(
	expr: ExpressionInput,
	s: ExpressionInput,
	t: ExpressionInput
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
			if (transform.isFunction(ILAPLACE)) {
				retval = undefined;
				break;
			}

			retval = retval.plus(transform);
		}

		if (retval) {
			return retval;
		}
	}

	// Pull out a numeric multiplier stored directly on a non-product node.
	const multiplier = Expression.fromRational(expr.getMultiplier());
	if (!multiplier.isOne()) {
		const transform = ilaplace(expr.toUnitMultiplier(), s, t);

		if (!transform.isFunction(ILAPLACE)) {
			return multiplier.times(transform);
		}
	}

	// Pull out constants from products
	if (expr.isProduct()) {
		const { constants, expression } = constantsFreeProduct(expr, s);

		if (!constants.isOne()) {
			const transform = ilaplace(expression, s, t);

			if (!transform.isFunction(ILAPLACE)) {
				return constants.times(transform);
			}
		}
	}

	// Base/derived table lookup
	retval = tableOfInverseTransforms.lookup(new Pattern(expr, [s]), 0);

	if (retval) {
		if (t !== 't') {
			retval = retval.evaluate({ t });
		}
		return retval;
	}

	// Normalize an affine numerator over an expanded quadratic to the shifted
	// forms already covered by the inverse-transform table.
	{
		const num = expr.getNumerator();
		const den = expr.getDenominator();

		if (den.isPolynomialLike() && num.isPolynomialLike()) {
			const denCoeffs = den.coeffs(s);
			const numCoeffs = num.coeffs(s);

			if (denCoeffs.max() === 2 && numCoeffs.max() <= 1) {
				const { h, expression: completed } = sqcomp(den, s);
				const hasShiftedSquare =
					den.isSum() &&
					den
						.elementsArray()
						.some(term => term.getPower().eq(2) && term.getBase().isSum());
				if (!h.isZero() && !hasShiftedSquare) {
					const constant = numCoeffs.hasPower(0) ? numCoeffs.getPower(0) : zero();
					const linear = numCoeffs.hasPower(1) ? numCoeffs.getPower(1) : zero();
					const shifted = Expression.create(s).plus(h);
					const remainder = constant.minus(linear.times(h));
					const alignedTransform = linear.isZero()
						? zero()
						: ilaplace(shifted.div(completed), s, t);
					const remainderTransform = remainder.isZero()
						? zero()
						: ilaplace(completed.invert(), s, t);

					if (
						!alignedTransform.isFunction(ILAPLACE) &&
						!remainderTransform.isFunction(ILAPLACE)
					) {
						return linear
							.times(alignedTransform)
							.plus(remainder.times(remainderTransform));
					}
				}
			}
		}
	}

	// Exponential shift: L^-1{e^(-a*s) * F(s)} = heaviside(t-a) * f(t-a)
	// When e^(-a*s) appears, it lands in the denominator as e^(a*s) with a > 0.
	{
		const num = expr.getNumerator();
		const den = expr.getDenominator();
		const shift = extractExpShift(den, s);

		if (shift) {
			// Rebuild the expression without the exponential factor
			const stripped = num.div(shift.remainder);
			const transform = ilaplace(stripped, s, t);

			if (!transform.isFunction(ILAPLACE)) {
				const a = shift.coefficient;
				const tShifted = Expression.create(t).minus(a);
				const shifted = transform.subst(t, tShifted);
				return Expression.toFunction(HEAVISIDE, [tShifted]).times(shifted);
			}
		}
	}

	// Partial fractions are only defined here for polynomial numerators and denominators.
	// partfrac constructs Polynomial objects once the denominator depends on the selected
	// variable, so guard its domain rather than leaking a PolynomialError for unsupported input.
	const num = expr.getNumerator();
	const den = expr.getDenominator();
	if (num.isPolynomialLike() && den.isPolynomialLike()) {
		// IMPORTANT: partfrac returns the same reference (===) when no decomposition
		// occurs. This identity check avoids infinite recursion. If partfrac is ever
		// changed to return a copy on no-op, this will silently cause wasted recursion
		// (or worse). Keep this method in sync with partfrac.
		const decomposed = partfrac(expr, s);

		if (decomposed !== expr) {
			const transform = ilaplace(decomposed, s, t);

			if (!transform.isFunction(ILAPLACE)) {
				return transform;
			}
		}
	}

	return Expression.toFunction(ILAPLACE, [expr, s, t]);
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
