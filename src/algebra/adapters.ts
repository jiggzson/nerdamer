import { Expression } from '../core/classes/expression/Expression';
import { zero } from '../core/classes/expression/shortcuts';
import { Polynomial } from '../core/classes/polynomial/Polynomial';

import { MultiPoly } from './algorithms/multiPoly/MultiPoly';

import type { PolyType } from '../core/classes/polynomial/Polynomial';
import type { PolyFactor, FactorsObject } from './algorithms/factor';

/**
 * Converts a polynomial to a MultiPoly to be used with the polynomial algorithms.
 *
 * @param p The polynomial to be converted.
 * @param variables Optional variable order.
 * @returns The MultiPoly and variable order used for its term keys.
 */
export function polynomialToMultiPoly(p: PolyType, variables?: string[]) {
	p = Polynomial.toPolynomial(p);
	const poly = new MultiPoly();
	variables = variables ?? p.variables;
	for (const term of p.terms) {
		const keyElements: string[] = [];
		for (let i = 0; i < variables.length; i++) {
			const power = term.powers[variables[i]];
			// Don't add zero powers or undefined powers
			if (!power) {
				continue;
			}
			// Generate the key which is nothing more than index:power
			keyElements.push(`${i}:${power}`);
		}
		const key = keyElements.join(',');
		poly.terms.set(key, term.coeff.getMultiplier().numerator);
	}
	return { poly, variables };
}

export function multiPolyToExpression(poly: MultiPoly, variables: string[]): Expression {
	let retval: Expression;
	if (poly.terms.size === 0) {
		retval = zero();
	} else {
		let result: Expression | undefined;

		for (const [key, coeff] of poly.terms) {
			// Build the coefficient as an Expression directly
			let term = Expression.Number(coeff);

			// Multiply by each variable raised to its power
			if (key !== '') {
				for (const part of key.split(',')) {
					const [varIndex, power] = part.split(':');
					const v = Expression.Variable(variables[+varIndex]);
					term = term.times(power === '1' ? v : v.pow(Expression.Number(power)));
				}
			}

			// Accumulate into sum
			result = result === undefined ? term : result.plus(term);
		}

		retval = result ?? zero();
	}

	return retval;
}

/**
 * Converts a PolyFactor to an Expression object.
 *
 * @param factor The factor to convert.
 * @param variables The variable order used by the factor's MultiPoly.
 * @returns The equivalent Expression.
 */
function makeExpression(factor: PolyFactor, variables: string[]) {
	// The terms of each factor
	let exp = multiPolyToExpression(factor.poly, variables);
	// Add back the power
	if (factor.multiplicity > 1n) {
		exp = exp.pow(Expression.Number(factor.multiplicity));
	}
	return exp;
}

/**
 * Converts the factored Expression or Polynomial to an array of Expressions.
 *
 * @param factorObj The integer polynomial factors.
 * @param variables The variable order used by each factor.
 * @returns Expression factors including non-unit content.
 */
export function factorsToExpressions(factorObj: FactorsObject, variables: string[]) {
	const factors: Expression[] = [];
	// set the terms
	// Add the content
	if (factorObj.content !== 1n) {
		factors.push(Expression.Number(factorObj.content));
	}

	// Now the factors
	for (const factor of factorObj.factors) {
		const f = makeExpression(factor, variables);
		factors.push(f);
	}
	return factors;
}

/**
 * Converts the factored Expression or Polynomial to an array of Polynomials.
 *
 * @param factorsObj The integer polynomial factors.
 * @param variables The variable order used by each factor.
 * @returns Polynomial wrappers around the converted factors.
 */
export function factorsToPolynomials(factorsObj: FactorsObject, variables: string[]) {
	return factorsToExpressions(factorsObj, variables).map(e => new Polynomial(e));
}
