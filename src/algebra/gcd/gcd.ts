import { collectVariablesSet } from '../../core/classes/expression/collect';
import { Expression } from '../../core/classes/expression/Expression';
import { one, zero } from '../../core/classes/expression/shortcuts';
import { GCD } from '../../core/classes/parser/constants';
import { Polynomial } from '../../core/classes/polynomial/Polynomial';
import { divide } from '../../core/classes/polynomial/utils';
import { uUnSub } from '../../core/functions/subst';
import { multiPolyToExpression, polynomialToMultiPoly } from '../adapters';
import { zippelGCDMulti } from '../algorithms/gcd';
import { factor } from '../factor/factor';
import { polynomialize } from '../polynomialize';

import type { ExpressionInput } from '../../core/types';

/**
 * Computes a symbolic greatest common divisor over rational polynomial structure.
 *
 * @remarks
 * Numerators and denominators are polynomialized, function-valued or irrational
 * constants may be temporarily substituted, and the multivariate Zippel GCD is
 * verified by exact polynomial division. Factoring supplies an expensive final
 * fallback. When conversion or the supported polynomial algorithms fail, the
 * result remains symbolic as `gcd(x, y)`.
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

		const { numerator: ax, denominator: bx, map } = polynomialize(x);
		const { numerator: px, denominator: qx, map: finalMap } = polynomialize(y, map);

		const vars = collectVariablesSet([ax, bx, px, qx]);

		const g0 = expressionGCD(ax, px, vars);
		const g1 = expressionGCD(bx, qx, vars);

		const retval = uUnSub(g0.div(g1), finalMap);
		retval.getMultiplier().asDecimal = asDecimal;
		return retval;
	} catch {}
	return Expression.toFunction(GCD, [x, y]);
}

/**
 * Returns the least common multiple of two expressions.
 *
 * Numeric inputs reuse exact `Rational` arithmetic. Polynomial expressions use
 * the existing GCD normalization so shared symbolic factors are retained.
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
	let retval: Expression;
	if (x.isNUM() && y.isNUM()) {
		retval = Expression.create(x.getMultiplier().GCD(y.getMultiplier()));
	} else {
		const f = new Polynomial(x);
		const g = new Polynomial(y);

		if (f.isZero() && g.isZero()) {
			return zero();
		}
		if (f.isZero()) {
			return Expression.create(y);
		}
		if (g.isZero()) {
			return Expression.create(x);
		}

		const { mGCD, p, q } = f.stripMonomialGCD(g);
		variables ??= [...new Set(p.variables.concat(q.variables))].sort();

		const { poly: poly1 } = polynomialToMultiPoly(p, variables);
		const { poly: poly2 } = polynomialToMultiPoly(q, variables);
		const g0 = zippelGCDMulti(poly1, poly2, variables);
		retval = multiPolyToExpression(g0, variables);

		// Verify
		if (!divide(p, retval)[1].isZero()) {
			retval = one();
		}

		// Don't give up just yet. Try by factor
		if (retval.isOne()) {
			retval = gcdByCommonFactors(p.getExpression(), q.getExpression());
		}

		// Put back the monomial gcd
		retval = retval.times(mGCD.getExpression());
	}
	return retval;
}

/**
 * Factors both expressions and compares their factors as a last-resort GCD strategy.
 *
 * Factoring is expensive, so this path runs only after exact polynomial reduction fails
 * to find a nontrivial divisor.
 */
function gcdByCommonFactors(f: Expression, g: Expression) {
	let retval = one();
	if (!f.isProduct()) {
		f = factor(f);
	}
	if (!g.isProduct()) {
		g = factor(g);
	}
	// Only proceed if both are products
	if (f.isProduct() && g.isProduct()) {
		const fArray = f.elementsArray();
		const gArray = g.elementsArray();
		// Compare them
		for (const a of fArray) {
			for (const b of gArray) {
				// If they're equal then they're a common factor
				if (a.eq(b)) {
					retval = retval.times(a);
				} else if (a.isProduct() && b.isProduct()) {
					return gcd(a, b);
				}
			}
		}
	}

	return retval;
}
