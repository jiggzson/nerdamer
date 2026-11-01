import { Expression } from '../core/classes/expression/Expression';
import { one, two, zero } from '../core/classes/expression/shortcuts';
import { power } from '../core/classes/parser/operations/power';
import {
	FACTORIAL,
	PRODUCT_FUNCTION,
	SUM_FUNCTION,
} from '../core/constants/functionNames';
import { Settings } from '../core/Settings';

import type { ParserValuesObject } from '../core/classes/parser/types';

/**
 * Attempts to extract an integer bigint from an Expression.
 * Returns null if the expression is not an exact integer.
 */
function toIntegerBigint(x: Expression): bigint | null {
	const isInt: boolean = x.isInteger();
	if (!isInt) {
		return null;
	}

	const m = x.getMultiplier();
	const den: bigint = m.denominator;

	if (den !== 1n) {
		return null;
	}

	const num: bigint = m.numerator;
	return num;
}

/**
 * Computes a finite summation: `sum(expr, k, a, b) = Σ_{k=a}^{b} expr`.
 *
 * - If bounds are integers and the number of terms ≤ `Settings.MAX_PRODUCT_AND_SUMMATION_ITERATION`,
 *   evaluates by accumulating each term.
 * - If `lower > upper`, returns `0` (empty range).
 * - If `expr` does not depend on the index variable, simplifies to `expr · (b − a + 1)`.
 * - Otherwise returns a symbolic `sum(expr, k, a, b)` node.
 *
 * @param expr - The expression to be summed.
 * @param index - The index variable (must be a plain symbol).
 * @param lower - The lower bound (integer required for evaluation).
 * @param upper - The upper bound (integer required for evaluation).
 * @returns The summation result or a symbolic `sum` node.
 *
 * @example
 * ```ts
 * // Σ_{k=1}^{5} k = 15
 * sum('k', 'k', 1, 5).text()   // "15"
 * ```
 */
export function sum(
	expr: Expression,
	index: Expression,
	lower: Expression,
	upper: Expression
): Expression {
	// Validate index variable
	if (!index.isPlainVariable()) {
		return Expression.toFunction(SUM_FUNCTION, [expr, index, lower, upper]);
	}

	expr = Expression.create(expr);
	index = Expression.create(index);
	lower = Expression.create(lower);
	upper = Expression.create(upper);

	const indexName: string = index.text();

	// Attempt integer bounds extraction
	const lo: bigint | null = toIntegerBigint(lower);
	const hi: bigint | null = toIntegerBigint(upper);

	// A numeric-base exponential with a linear integer exponent is geometric.
	if (((lo !== null && upper.isPosInf()) || (lower.isNegInf() && hi !== null)) &&
		expr.isEXP()) {
		const base = expr.getBase();
		const exponent = expr.getPower();
		const atZero = exponent.evaluate({ [indexName]: 0n });
		const atOne = exponent.evaluate({ [indexName]: 1n });
		const slope = atOne.minus(atZero);
		if (base.isNUM() && !base.isZero() && !base.isOne() &&
			atZero.isInteger() && slope.isInteger() &&
			exponent.eq(index.times(slope).plus(atZero))) {
			// Integer powers of rational bases must remain exact, including negative bases.
			const ratio = Expression.fromRational(base.getMultiplier().pow(slope.getMultiplier()));
			if (lo !== null && ratio.abs().lt(one())) {
				const exponentAtLower = exponent.evaluate({ [indexName]: lo });
				const first = Expression.fromRational(
					base.getMultiplier().pow(exponentAtLower.getMultiplier())
				).times(Expression.fromRational(expr.getMultiplier()));
				return first.div(one().minus(ratio));
			}
			if (hi !== null && ratio.abs().gt(one())) {
				const exponentAtUpper = exponent.evaluate({ [indexName]: hi });
				const last = Expression.fromRational(
					base.getMultiplier().pow(exponentAtUpper.getMultiplier())
				).times(Expression.fromRational(expr.getMultiplier()));
				return last.times(ratio).div(ratio.minus(one()));
			}
		}
	}

	// 1/(k(k+1)) telescopes to 1/k - 1/(k+1).
	if (lo !== null && lo >= 1n &&
		(upper.isPosInf() || hi !== null && hi >= lo ||
			upper.isPlainVariable() && upper.text() !== indexName) &&
		expr.eq(one().div(index.times(index.plus(one()))))) {
		const first = one().div(Expression.Number(lo));
		return upper.isPosInf() ? first : first.minus(one().div(upper.plus(one())));
	}

	if (lo !== null && upper.isPosInf() && expr.isZero()) {
		return zero();
	}

	// Finite formulas also support a symbolic upper bound, understood as an
	// integer at least as large as the lower bound.
	if (lo !== null && (hi !== null && hi >= lo || upper.isPlainVariable() && upper.text() !== indexName)) {
		const symbolic = hi === null;
		const beyondIteration = hi !== null && hi - lo + 1n > Settings.MAX_PRODUCT_AND_SUMMATION_ITERATION;
		if (symbolic || beyondIteration) {
			const end = upper;
			const before = Expression.Number(lo - 1n);
			const count = end.minus(before);
			if (!expr.hasVariable(indexName)) {
				return expr.times(count);
			}
			if (expr.eq(index) || expr.eq(index.pow(two()))) {
				const square = expr.eq(index.pow(two()));
				const prefix = (n: Expression) => square
					? n.times(n.plus(one())).times(n.times(two()).plus(one())).div(Expression.Number(6))
					: n.times(n.plus(one())).div(two());
				return prefix(end).minus(prefix(before));
			}
			if (expr.isEXP() && expr.getPower().eq(index) &&
				expr.getBase().isNUM() && !expr.getBase().isOne()) {
				const base = expr.getBase();
				return base.pow(end.plus(one())).minus(base.pow(before.plus(one())))
					.div(base.minus(one()));
			}
		}
	}

	if (lo === null || hi === null) {
		// Non-integer bounds → symbolic
		return Expression.toFunction(SUM_FUNCTION, [expr, index, lower, upper]);
	}

	// Empty range → 0
	if (lo > hi) {
		return zero();
	}

	const terms: bigint = hi - lo + 1n;

	// Prevent runaway evaluation
	if (terms > Settings.MAX_PRODUCT_AND_SUMMATION_ITERATION) {
		return Expression.toFunction(SUM_FUNCTION, [expr, index, lower, upper]);
	}

	// If expression does not depend on index, simplify:
	// sum(c, k, a, b) = c * (b - a + 1)
	const dependsOnIndex: boolean = expr.hasVariable(indexName);
	if (!dependsOnIndex) {
		const countExpr: Expression = Expression.create(terms);
		return expr.times(countExpr);
	}

	// Numeric accumulation
	let acc: Expression = zero();
	let i: bigint = lo;

	while (i <= hi) {
		const values: ParserValuesObject = {};
		values[indexName] = i;

		const term: Expression = expr.evaluate(values);
		acc = acc.plus(term);

		i = i + 1n;
	}

	return acc;
}

/**
 * Computes a finite product: `product(expr, k, a, b) = Π_{k=a}^{b} expr`.
 *
 * - If bounds are integers and the number of terms ≤ `Settings.MAX_PRODUCT_AND_SUMMATION_ITERATION`,
 *   evaluates by multiplying each term.
 * - If `lower > upper`, returns `1` (empty product).
 * - If `expr` does not depend on the index variable, simplifies to `expr^(b − a + 1)`.
 * - Otherwise returns a symbolic `product(expr, k, a, b)` node.
 *
 * @param expr - The expression to be multiplied.
 * @param index - The index variable (must be a plain symbol).
 * @param lower - The lower bound (integer required for evaluation).
 * @param upper - The upper bound (integer required for evaluation).
 * @returns The product result or a symbolic `product` node.
 *
 * @example
 * ```ts
 * // Π_{k=1}^{5} k = 120 (same as 5!)
 * product('k', 'k', 1, 5).text() // "120"
 * ```
 */
export function product(
	expr: Expression,
	index: Expression,
	lower: Expression,
	upper: Expression
): Expression {
	if (!index.isPlainVariable()) {
		return Expression.toFunction(PRODUCT_FUNCTION, [expr, index, lower, upper]);
	}

	expr = Expression.create(expr);
	index = Expression.create(index);
	lower = Expression.create(lower);
	upper = Expression.create(upper);

	const indexName: string = index.text();

	const lo: bigint | null = toIntegerBigint(lower);
	const hi: bigint | null = toIntegerBigint(upper);

	// Recognize telescoping rational products without expanding their terms.
	if (lo !== null && lo >= 1n &&
		(upper.isPosInf() || hi !== null && hi >= lo ||
			upper.isPlainVariable() && upper.text() !== indexName)) {
		if (expr.eq(index.div(index.plus(one())))) {
			return upper.isPosInf() ? zero() :
				Expression.Number(lo).div(upper.plus(one()));
		}
		if (!upper.isPosInf() && expr.eq(index.plus(one()).div(index))) {
			return upper.plus(one()).div(Expression.Number(lo));
		}
		if (lo >= 2n && expr.eq(one().minus(one().div(index.pow(two()))))) {
			const first = Expression.Number(lo - 1n).div(Expression.Number(lo));
			return upper.isPosInf() ? first :
				first.times(upper.plus(one()).div(upper));
		}
	}

	if (lo !== null && upper.isPosInf() && expr.isZero()) {
		return zero();
	}

	// Constant products have immediate limits when the magnitude is below one.
	if ((lo !== null && upper.isPosInf() || lower.isNegInf() && hi !== null) &&
		!expr.hasVariable(indexName) && expr.isNUM()) {
		if (expr.isOne()) {
			return one();
		}
		if (expr.abs().lt(one())) {
			return zero();
		}
	}

	// The first factor is zero even though the remaining telescoping product is nonzero.
	if (lo === 1n && upper.isPosInf() &&
		expr.eq(one().minus(one().div(index.pow(two()))))) {
		return zero();
	}

	// Use finite product formulas for a symbolic upper bound. Their usual
	// domain is an integer upper bound no smaller than the lower bound.
	if (lo !== null && upper.isPlainVariable() && upper.text() !== indexName) {
		const count = upper.minus(Expression.Number(lo - 1n));
		if (!expr.hasVariable(indexName)) {
			return expr.pow(count);
		}
		if (lo === 1n && expr.eq(index)) {
			return Expression.toFunction(FACTORIAL, [upper]);
		}
		if (expr.isEXP() && expr.getPower().eq(index) && expr.getBase().isNUM()) {
			const before = Expression.Number(lo - 1n);
			const exponent = upper.times(upper.plus(one()))
				.minus(before.times(before.plus(one()))).div(two());
			return expr.getBase().pow(exponent);
		}
	}

	if (lo === null || hi === null) {
		return Expression.toFunction(PRODUCT_FUNCTION, [expr, index, lower, upper]);
	}

	// Empty range → 1
	if (lo > hi) {
		return one();
	}

	const terms: bigint = hi - lo + 1n;

	if (terms > Settings.MAX_PRODUCT_AND_SUMMATION_ITERATION) {
		return Expression.toFunction(PRODUCT_FUNCTION, [expr, index, lower, upper]);
	}

	// product(c, k, a, b) = c^(b-a+1)
	const dependsOnIndex: boolean = expr.hasVariable(indexName);
	if (!dependsOnIndex) {
		const countExpr: Expression = Expression.create(terms);
		return power(expr, countExpr);
	}

	let acc: Expression = one();
	let i: bigint = lo;

	while (i <= hi) {
		const values: ParserValuesObject = {};
		values[indexName] = i;

		const term: Expression = expr.evaluate(values);
		acc = acc.times(term);

		i = i + 1n;
	}

	return acc;
}
