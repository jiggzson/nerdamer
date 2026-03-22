import { polynomialToMultiPoly, factorsToExpressions } from '../../core/adapters';
import { normalizeMultiplierDenominators } from '../../core/classes/expression/analysis';
import { Expression } from '../../core/classes/expression/Expression';
import { Polynomial } from '../../core/classes/polynomial/Polynomial';
import { Vector } from '../../core/classes/vector/Vector';
import { primeFactorCounts } from '../../core/functions/bigint/primeFactor';
import { polynomialize, uSubConstants, uUnSub } from '../../core/functions/subst';
import { factorPoly } from '../algorithms/factor';

import type { ExpressionInputType } from '../../core/classes/parser/types';

/**
 * Factors an expression
 * @param x
 */
export function factor(x: ExpressionInputType) {
	let retval: Expression;
	try {
		x = Expression.create(x);
		// Return a VAR right away
		if (x.isVAR()) {
			return x;
		}
		const factored = factors(x);
		retval = factored.numerator.prod().div(factored.denominator.prod());
	} catch {
		retval = Expression.toFunction('factor', [x]);
	}
	return retval;
}

/**
 * Factors the given polynomial
 * @param x
 * @returns
 */
export function polyFactors(x: ExpressionInputType): Vector {
	try {
		const expr = normalizeMultiplierDenominators(Expression.create(x));
		const num = expr.getNumerator();
		const den = expr.getDenominator();
		// MultiPoly strictly works in Z. Irrational coefficients
		// must first be promoted to variables.
		const [subbed, map] = uSubConstants(num);
		const p = new Polynomial(subbed);
		const variables = p.variables;
		const { poly } = polynomialToMultiPoly(p);
		// Factor it
		const factors = factorPoly(poly, variables);
		const retval = new Vector(factorsToExpressions(factors, variables));
		// Remove the u-substitution
		return retval.each(f => uUnSub(f as Expression, map).div(den));
	} catch {
		return new Vector([Expression.create(x)]);
	}
}

/**
 * This function allows for factoring of expressions over Q with functions.
 * @param x
 * @returns
 */
export function factors(x: ExpressionInputType) {
	x = Expression.create(x);
	const { numerator, denominator } = polynomialize(x, undefined, (e, map) => {
		return polyFactors(e).each(f => {
			return uUnSub(f as Expression, map!);
		});
	});

	return {
		numerator,
		denominator,
	} as { numerator: Vector; denominator: Vector };
}

/**
 * Retrieves the numeric factors of a number
 * @param x
 */
export function numberFactors(x: ExpressionInputType) {
	x = Expression.create(x);
	const numerator = x.getNumerator();
	const denominator = x.getDenominator();

	function factorNumber(num: Expression) {
		const pfactors = primeFactorCounts(num.getMultiplier().numerator);
		const intFactors = Object.keys(pfactors).sort();
		const factors: Expression[] = [];
		for (const n of intFactors) {
			const p = pfactors[n];
			factors.push(p === 1n ? Expression.create(n) : Expression.toEXP(n, p));
		}
		return new Vector(factors);
	}

	return {
		numerator: numerator.isNUM() ? factorNumber(numerator) : new Vector([numerator]),
		denominator: numerator.isNUM() ? factorNumber(denominator) : new Vector([denominator]),
	};
}
