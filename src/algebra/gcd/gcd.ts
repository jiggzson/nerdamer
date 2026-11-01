import { collectVariablesSet } from '../../core/classes/expression/collect';
import { Expression } from '../../core/classes/expression/Expression';
import { zero } from '../../core/classes/expression/shortcuts';
import {
	expressionToIntegerSparsePolynomial,
	sparsePolynomialToExpression,
} from '../../core/classes/polynomial/SparsePolynomialAdapter';
import { GCD } from '../../core/constants/functionNames';
import { GCD as bigintGCD } from '../../core/functions/bigint/bigint';
import { uUnSub } from '../../core/functions/subst';
import { sparsePolynomialGcd } from '../polynomial/SparsePolynomialGcd';
import { polynomialize } from '../polynomialize';

import { complexPolynomialGcd } from './complexPolynomialGcd';

import type { ExpressionInput } from '../../core/types';

/**
 * Computes a symbolic greatest common divisor over rational polynomial structure.
 *
 * @remarks
 * Numerators and denominators are polynomialized before exact sparse integer GCD
 * reconstruction. Rational polynomial coefficients are cleared to integers and
 * their shared clearing denominator is restored afterward. Function-valued,
 * exponential, and irrational constants use the existing polynomialization
 * substitutions and are restored after the numerator and denominator GCDs are
 * combined. For supported univariate polynomials with exact coefficients in
 * Q(i), a separate Euclidean GCD path treats i as an algebraic coefficient
 * satisfying i² = -1 rather than an independent polynomial variable.
 * Unsupported inputs remain symbolic as `gcd(x, y)` where the existing
 * polynomial fallback cannot handle them.
 *
 * @param x - First expression-compatible operand.
 * @param y - Second expression-compatible operand.
 * @returns The exact symbolic GCD or an unevaluated `gcd` expression.
 */
export function gcd(x: ExpressionInput, y: ExpressionInput) {
	try {
		x = Expression.create(x);
		y = Expression.create(y);
		const asDecimal = x.hasDecimal() || y.hasDecimal();
		// Exact complex coefficients use a separate univariate path. The integer
		// polynomial GCD treats the imaginary unit as an unrelated variable.
		const complexGcd = complexPolynomialGcd(x, y);
		if (complexGcd !== undefined) {
			return complexGcd;
		}
		if (x.eq(y) && !x.isPolynomialLike()) {
			return x;
		}

		const { numerator: ax, denominator: bx, map } = polynomialize(x);
		const { numerator: px, denominator: qx, map: finalMap } = polynomialize(y, map);

		const variables = collectVariablesSet([ax, bx, px, qx]);

		const numeratorGcd = expressionGCD(ax, px, variables);
		const denominatorGcd = expressionGCD(bx, qx, variables);

		const retval = uUnSub(numeratorGcd.div(denominatorGcd), finalMap);
		retval.getMultiplier().asDecimal = asDecimal;
		return retval;
	} catch {}
	return Expression.toFunction(GCD, [x, y]);
}

/**
 * Returns the least common multiple of two expressions.
 *
 * Numeric inputs reuse exact Rational arithmetic. Polynomial expressions use
 * the polynomial GCD so shared symbolic factors are retained.
 *
 * @param x - First expression-compatible operand.
 * @param y - Second expression-compatible operand.
 * @returns Zero when either operand is zero; otherwise a non-negative numeric LCM or
 * the symbolic product divided by {@link gcd}.
 */
export function lcm(x: ExpressionInput, y: ExpressionInput) {
	const a = Expression.create(x);
	const b = Expression.create(y);
	let retval: Expression;

	if (a.isZero() || b.isZero()) {
		retval = zero();
	} else if (a.isNUM() && b.isNUM()) {
		retval = Expression.fromRational(a.getMultiplier().LCM(b.getMultiplier()).abs());
	} else {
		retval = a.times(b).div(gcd(a, b));
	}

	return retval;
}

function expressionGCD(x: Expression, y: Expression, variables?: string[]) {
	if (x.isNUM() && y.isNUM()) {
		return Expression.create(x.getMultiplier().GCD(y.getMultiplier()));
	}

	if (x.isZero() && y.isZero()) {
		return zero();
	}
	if (x.isZero()) {
		return Expression.create(y);
	}
	if (y.isZero()) {
		return Expression.create(x);
	}

	variables ??= collectVariablesSet([x, y]);

	const left = expressionToIntegerSparsePolynomial(x, variables);
	const right = expressionToIntegerSparsePolynomial(y, variables);
	const variableIndices = variables.map((_variable, index) => index);
	const sparseGcd = sparsePolynomialGcd(left.polynomial, right.polynomial, variableIndices);
	const clearingDenominator = bigintGCD(left.denominator, right.denominator);
	const retval = sparsePolynomialToExpression(sparseGcd, variables);

	return clearingDenominator === 1n
		? retval
		: retval.div(Expression.Number(clearingDenominator));
}
