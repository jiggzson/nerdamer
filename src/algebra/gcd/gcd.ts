import { multiPolyToExpression, polynomialToMultiPoly } from '../../core/adapters';
import { collectVariablesSet } from '../../core/classes/expression/collect';
import { Expression } from '../../core/classes/expression/Expression';
import { one, zero } from '../../core/classes/expression/shortcuts';
import { Polynomial } from '../../core/classes/polynomial/Polynomial';
import { divide } from '../../core/classes/polynomial/utils';
import { type MapObjectType, polynomialize, uUnSub } from '../../core/functions/subst';
import { zippelGCDMulti } from '../algorithms/gcd';
import { factor } from '../factor/factor';

import type { ExpressionInputType } from '../../core/classes/parser/types';

type E = { numerator: Expression; denominator: Expression; map: MapObjectType };

/**
 * The generalized GCD algorithm. Allows for GCD over Q
 * @param x
 * @param y
 * @returns
 */
export function gcd(x: ExpressionInputType, y: ExpressionInputType) {
	try {
		x = Expression.create(x);
		y = Expression.create(y);

		const { numerator: ax, denominator: bx, map } = polynomialize(x) as E;
		const { numerator: px, denominator: qx, map: finalMap } = polynomialize(y, map) as E;

		const vars = collectVariablesSet([ax, bx, px, qx]);

		const g0 = expressionGCD(ax, px, vars);
		const g1 = expressionGCD(bx, qx, vars);

		return uUnSub(g0.div(g1), finalMap);
	} catch {}
	return Expression.toFunction('gcd', [String(x), String(y)]);
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
 * This manner is crazy expensive and is only used as a last resort
 * @param f
 * @param g
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
