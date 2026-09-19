import { normalizeMultiplierDenominators } from '../../core/classes/expression/analysis';
import { Expression } from '../../core/classes/expression/Expression';
import { FACTOR } from '../../core/classes/parser/constants';
import { merge } from '../../core/classes/parser/operations/multiply';
import { Polynomial } from '../../core/classes/polynomial/Polynomial';
import { Vector } from '../../core/classes/vector/Vector';
import { primeFactorCounts } from '../../core/functions/bigint/primeFactor';
import { uSubConstants, uUnSub } from '../../core/functions/subst';
import { factorsToExpressions, polynomialToMultiPoly } from '../adapters';
import { factorPoly } from '../algorithms/factor';
import { polynomialize } from '../polynomialize';

import type { ExpressionInput } from '../../core/types';

/**
 * Factors polynomial-like numerator and denominator components of an expression.
 *
 * @remarks
 * The implementation converts polynomial structure to the exact integer-coefficient
 * factorization layer. Irrational constants and function-valued components may be
 * temporarily represented by substitution variables. If the input cannot be handled
 * by that finite polynomial path, the function returns an unevaluated symbolic
 * `factor(input)` expression rather than exposing the internal failure.
 *
 * @param x - Expression-compatible value to factor.
 * @returns A factored expression or an unevaluated symbolic `factor` call.
 */
export function factor(x: ExpressionInput) {
	let retval: Expression;
	try {
		x = Expression.create(x);
		if (x.isZero()) {
			retval = x;
		} else if (x.isNUM() && x.isInteger()) {
			let factoredInteger: Expression | undefined;
			const factorCounts = primeFactorCounts(x.getMultiplier().numerator);
			for (const prime in factorCounts) {
				const primePower = Expression.toEXP(prime, factorCounts[prime]);
				factoredInteger = factoredInteger
					? merge(factoredInteger, primePower)
					: primePower;
			}
			retval = factoredInteger ?? Expression.Number('1');
			if (x.sign() === -1) {
				retval = retval.neg();
			}
		}
		// A variable is already fully factored.
		else if (x.isVAR()) {
			retval = x;
		} else {
			const factored = factors(x);
			retval = factored.numerator.prod().div(factored.denominator.prod());
		}
	} catch {
		retval = Expression.toFunction(FACTOR, [x]);
	}
	return retval;
}

/**
 * Factors the numerator of polynomial-like input into Expression factors.
 *
 * @param x - Input whose numerator should be factored.
 * @returns New factor expressions; unsupported input is returned as a one-element array.
 */
export function polyFactorExpressions(x: ExpressionInput): Expression[] {
	let retval: Expression[];
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

		// Remove the u-substitution
		retval = factorsToExpressions(factors, variables).map(f => uUnSub(f, map).div(den));
	} catch {
		retval = [Expression.create(x)];
	}
	return retval;
}

/**
 * Wraps the polynomial factor expressions in an ordered {@link Vector}.
 *
 * @param x - Polynomial-like input.
 * @returns A new Vector containing the factor expressions.
 */
export function polyFactors(x: ExpressionInput): Vector {
	const retval = new Vector(polyFactorExpressions(x));
	return retval;
}

/**
 * Factors the polynomialized numerator and denominator separately.
 *
 * @param x - Rational expression to polynomialize and factor.
 * @returns New numerator and denominator factor arrays after reversing temporary substitutions.
 */
export function factorExpressionParts(x: ExpressionInput) {
	const { numerator, denominator, map } = polynomialize(Expression.create(x));

	return {
		numerator: polyFactorExpressions(numerator).map(f => uUnSub(f, map)),
		denominator: polyFactorExpressions(denominator).map(f => uUnSub(f, map)),
	};
}

/**
 * Factors the numerator and denominator separately and returns each factor list as a Vector.
 *
 * @param x - Expression-compatible value to factor.
 * @returns New Vectors for the numerator and denominator factors.
 */
export function factors(x: ExpressionInput) {
	const { numerator, denominator } = factorExpressionParts(x);

	return {
		numerator: new Vector(numerator),
		denominator: new Vector(denominator),
	};
}

/**
 * Returns prime-power factors for the numeric parts of a numerator and denominator.
 *
 * @param x - Numeric or expression-compatible value.
 * @returns Numerator and denominator Vectors. Non-numeric components are kept as single
 * factors instead of being recursively factored.
 */
export function numberFactors(x: ExpressionInput) {
	x = Expression.create(x);
	const numerator = x.getNumerator();
	const denominator = x.getDenominator();

	function factorNumber(num: Expression) {
		if (!num.isNUM()) {
			return new Vector([num]);
		}

		const factors = new Vector();
		const factorCounts = primeFactorCounts(num.getMultiplier().numerator);
		for (const prime in factorCounts) {
			factors.append(Expression.toEXP(prime, factorCounts[prime]));
		}
		return factors;
	}

	return {
		numerator: factorNumber(numerator),
		denominator: factorNumber(denominator),
	};
}
