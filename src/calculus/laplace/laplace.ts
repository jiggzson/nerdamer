import { Expression } from '../../core/classes/expression/Expression';
import { constantsFreeProduct } from '../../core/classes/expression/products';
import { one, zero } from '../../core/classes/expression/shortcuts';
import { requireVariableName } from '../../core/classes/expression/utils';
import { DIFF, HEAVISIDE, LAPLACE, LIMIT, LOG } from '../../core/constants/functionNames';
import { Pattern } from '../../core/converters/Pattern';
import { diff } from '../derivative/diff';
import { limit } from '../limit/limit';

import { tableOfTransforms } from './laplaceTable';

import type { ExpressionInput } from '../../core/types';

// Bound the number of symbolic differentiations in a single transform attempt.
const MAX_TIME_DERIVATIVE_ORDER = 8n;

/**
 * Applies the exponential frequency-shift identity to a separable product.
 *
 * The negative-rate pass precedes table matching for compatibility with
 * reciprocal exponential patterns. The general pass runs only after the table
 * so established positive-rate transform forms are preserved.
 *
 * @see NIST DLMF, Eq. 1.14.21 (exponential translation):
 * https://dlmf.nist.gov/1.14.E21
 */
function tryExponentialFrequencyShift(
	expr: Expression,
	t: string,
	s: string,
	negativeRateOnly: boolean
): Expression | undefined {
	const factors = expr.isProduct() ? expr.elementsArray() : [expr];
	let retval: Expression | undefined;

	// Substituting the frequency variable must not also rewrite an independent
	// parameter from the input. Keep the established negative-rate path intact.
	const canShift = negativeRateOnly || !expr.hasVariable(s);

	if (canShift) {
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
			if (rate.isZero() || (negativeRateOnly && rate.sign() !== -1)) {
				continue;
			}

			let remainder = one();
			for (let j = 0; j < factors.length; j++) {
				if (j !== i) {
					remainder = remainder.times(factors[j]);
				}
			}

			const transform = laplace(remainder, t, s);
			if (!transform.hasFunction(LAPLACE, true)) {
				const baseLog = base.isE() ? one() : Expression.toFunction(LOG, [base]);
				const shiftedVariable = Expression.Variable(s).minus(rate.copy().times(baseLog));
				retval = transform.subst(s, shiftedVariable);
				break;
			}
		}
	}

	return retval;
}

/**
 * Attempts the derivative and finite right-hand initial-value identity.
 * Returns undefined when the expression is unsupported or cannot be resolved.
 *
 * @see NIST DLMF, Eq. 1.14.29 (higher derivatives and initial values):
 * https://dlmf.nist.gov/1.14.E29
 */
function tryLaplaceDerivative(expr: Expression, t: string, s: string): Expression | undefined {
	let retval: Expression | undefined;

	// L{f^(n)(t)} = s^n*F(s) - sum(s^(n-1-k)*f^(k)(0+)).
	// Normal parser evaluation resolves most diff(...) calls first, so this handles
	// explicitly unevaluated derivative nodes with a provable base transform.
	if (expr.isFunction(DIFF) && expr.getMultiplier().isOne() && expr.getPower().isOne()) {
		const args = expr.getArguments();
		if (
			(args.length === 2 || args.length === 3) &&
			args[1].isPlainVariable() &&
			args[1].value === t
		) {
			const derivativeOrder = args.length === 3 ? args[2] : one();
			if (derivativeOrder.isNUM() && derivativeOrder.isInteger()) {
				const order = derivativeOrder.getMultiplier().numerator;
				if (order > 0n && order <= MAX_TIME_DERIVATIVE_ORDER) {
					const derivativeCount = Number(order);
					const base = args[0];
					const baseTransform = laplace(base, t, s);
					if (!baseTransform.hasFunction(LAPLACE, true)) {
						const initialValues: Expression[] = [];
						let derivative = base;
						for (let i = 0; i < derivativeCount; i++) {
							if (derivative.hasFunction(DIFF, true)) {
								break;
							}

							const initial = limit(derivative, t, zero(), 'right');
							if (
								initial.isInf() ||
								initial.hasFunction(LIMIT, true) ||
								initial.hasFunction(DIFF, true) ||
								initial.hasVariable(t)
							) {
								break;
							}

							initialValues.push(initial);
							if (i + 1 < derivativeCount) {
								derivative = diff(derivative, t);
							}
						}

						if (initialValues.length === derivativeCount) {
							const frequency = Expression.Variable(s);
							let transformed = frequency.pow(derivativeOrder).times(baseTransform);
							for (let i = 0; i < initialValues.length; i++) {
								const power = Expression.Number(derivativeCount - i - 1);
								transformed = transformed.minus(frequency.pow(power).times(initialValues[i]));
							}
							retval = transformed;
						}
					}
				}
			}
		}
	}

	return retval;
}

/**
 * Attempts bounded frequency differentiation for time-multiplication products.
 * Returns undefined when the expression is unsupported or cannot be resolved.
 *
 * @see NIST DLMF, Eq. 1.14.23 (time multiplication / frequency differentiation):
 * https://dlmf.nist.gov/1.14.E23
 */
function tryLaplaceTimeMultiplication(expr: Expression, t: string, s: string): Expression | undefined {
	let retval: Expression | undefined;

	// L{t^n*f(t)} = (-1)^n*d^n/ds^n L{f(t)}.
	// Keep the existing table as the first choice so established transforms retain
	// their current forms; this handles products the table does not enumerate.
	if (expr.isProduct()) {
		const factors = expr.elementsArray();

		for (let i = 0; i < factors.length; i++) {
			const factor = factors[i];
			if (!factor.isVAR() || factor.value !== t) {
				continue;
			}

			const power = factor.getPower();
			if (!power.isInteger() || power.isNegative()) {
				continue;
			}

			const order = power.getMultiplier();
			if (!order.isInteger() || order.numerator < 1n || order.numerator > MAX_TIME_DERIVATIVE_ORDER) {
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
				let derived = transform;
				for (let j = 0; j < Number(order.numerator); j++) {
					derived = diff(derived, s).neg();
				}
				retval = derived;
			}

			break;
		}
	}

	return retval;
}

/**
 * Applies the unilateral time-delay identity to a supported shifted function.
 *
 * L{heaviside(t-a) * f(t-a)} = e^(-a*s) * L{f(t)}, for a >= 0.
 * Require a proved delay and a resolved transform rather than guessing the
 * support or introducing unevaluated nested Laplace terms.
 *
 * @see NIST DLMF, Eq. 1.14.22 (Heaviside time translation, a >= 0):
 * https://dlmf.nist.gov/1.14.E22
 */
function tryLaplaceTimeDelay(expr: Expression, t: string, s: string): Expression | undefined {
	// A numeric coefficient may be stored on a function or the whole product.
	// Normalize it once so the Heaviside factor can still be recognized.
	const multiplier = Expression.fromRational(expr.getMultiplier());
	const unitExpression = expr.toUnitMultiplier();
	const factors = unitExpression.isProduct() ? unitExpression.elementsArray() : [unitExpression];
	let retval: Expression | undefined;

	// The transform variable must not also be an input parameter.
	if (!expr.hasVariable(s)) {
		for (let i = 0; i < factors.length; i++) {
			const factor = factors[i];
			if (
				!factor.isFunction(HEAVISIDE) ||
				!factor.getMultiplier().isOne() ||
				!factor.getPower().isOne()
			) {
				continue;
			}

			const args = factor.getArguments();
			if (args.length !== 1) {
				continue;
			}

			const delay = Expression.Variable(t).minus(args[0]);
			if (delay.hasVariable(t) || (!delay.isZero() && !delay.gt(zero()))) {
				continue;
			}

			let remainder = one();
			for (let j = 0; j < factors.length; j++) {
				if (i !== j) {
					remainder = remainder.times(factors[j]);
				}
			}

			// Undo the delay before asking the existing dispatcher for L{f(t)}.
			const base = remainder.subst(t, Expression.Variable(t).plus(delay));
			const transform = laplace(base, t, s);
			if (!transform.hasFunction(LAPLACE, true)) {
				retval = multiplier.times(
					Expression.E().pow(delay.times(Expression.Variable(s)).neg()).times(transform)
				);
				break;
			}
		}
	}

	return retval;
}

/**
 * Computes a symbolic Laplace transform from a time variable to a transform variable.
 *
 * The expression is expanded, linear sums are transformed term by term,
 * constants independent of the time variable are extracted, and the remaining
 * expression is matched against the transform table. Supported exponential
 * factors also shift the transform variable when the remainder is transformable.
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
	expr = Expression.create(expr);
	s = requireVariableName(Expression.create(s), true);
	t = requireVariableName(Expression.create(t), true);

	let retval: Expression | undefined;

	// Match a delayed product before expansion distributes its shifted factors.
	// All other expressions retain the established expand-then-dispatch order.
	if (expr.hasFunction(HEAVISIDE, true)) {
		retval = tryLaplaceTimeDelay(expr, t, s);
		if (retval) {
			return retval;
		}
	}

	expr = expr.expand();

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

	// Pattern represents negative exponential powers as reciprocals. Preserve the
	// pre-table negative-rate handling to avoid changing established output forms.
	retval = tryExponentialFrequencyShift(expr, t, s, true);
	if (retval) {
		return retval;
	}

	// Base/derived table lookup
	retval = tableOfTransforms.lookup(new Pattern(expr, [t]), 0);

	if (retval) {
		if (s !== 's') {
			retval = retval.evaluate({ s });
		}
		return retval;
	}

	// Apply the general frequency shift to products without a matching table rule.
	// In particular, this covers positive or symbolic rates with a known remainder.
	retval = tryExponentialFrequencyShift(expr, t, s, false);
	if (retval) {
		return retval;
	}

	// Try the remaining bounded transform identities after all table/shift rules.
	retval = tryLaplaceDerivative(expr, t, s);
	if (retval) {
		return retval;
	}

	retval = tryLaplaceTimeMultiplication(expr, t, s);
	if (retval) {
		return retval;
	}

	// Unilateral delay: a resolved f(t-a) under heaviside(t-a), with a >= 0.
	retval = tryLaplaceTimeDelay(expr, t, s);
	if (retval) {
		return retval;
	}

	return Expression.toFunction(LAPLACE, [expr, t, s]);
}
