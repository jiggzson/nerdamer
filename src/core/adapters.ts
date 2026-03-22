import { MultiPoly } from '../algebra/algorithms/multiPoly/MultiPoly';

import { Expression } from './classes/expression/Expression';
import { zero } from './classes/expression/shortcuts';
import { Polynomial } from './classes/polynomial/Polynomial';
import { LCM } from './functions/bigint/bigint';

import type { PolyFactor, FactorsObject } from '../algebra/algorithms/factor';
import type { ExpressionInputType } from './classes/parser/types';
import type { PolyType } from './classes/polynomial/Polynomial';

/**
 * Converts a polynomial to a MultiPoly to be use with the polynomial algorithms
 * @param p The polynomial to be converted
 * @returns
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
	if (poly.terms.size === 0) {
		return zero();
	}

	let result: Expression | null = null;

	for (const [key, coeff] of poly.terms) {
		// Build the coefficient as an Expression directly
		let term = Expression.create(String(coeff));

		// Multiply by each variable raised to its power
		if (key !== '') {
			for (const part of key.split(',')) {
				const [varIndex, power] = part.split(':');
				const v = Expression.Variable(variables[+varIndex]);
				term = term.times(power === '1' ? v : v.pow(power));
			}
		}

		// Accumulate into sum
		result = result === null ? term : result.plus(term);
	}

	return result!;
}

/**
 * Converts a PolyFactor to an Expression object
 * @param factor
 * @param variables
 * @returns
 */
function makeExpression(factor: PolyFactor, variables: string[]) {
	// The terms of each factor
	let exp = multiPolyToExpression(factor.poly, variables);
	// Add back the power
	if (factor.multiplicity > 1n) {
		exp = exp.pow(factor.multiplicity);
	}
	return exp;
}

/**
 * Converts the factored Expression or Polynomial to an array of Expressions
 * @param factorObj
 * @param variables
 * @returns
 */
export function factorsToExpressions(factorObj: FactorsObject, variables: string[]) {
	const factors: Expression[] = [];
	// set the terms
	// Add the content
	if (factorObj.content !== 1n) {
		factors.push(Expression.create(String(factorObj.content)));
	}

	// Now the factors
	for (const factor of factorObj.factors) {
		const f = makeExpression(factor, variables);
		factors.push(f);
	}
	return factors;
}

/**
 * Converts the factored Expression or Polynomial to an array of Polynomials
 * @param factorsObj
 * @param variables
 * @returns
 */
export function factorsToPolynomials(factorsObj: FactorsObject, variables: string[]) {
	return factorsToExpressions(factorsObj, variables).map(e => new Polynomial(e));
}

/**
 * Extracts the Z Polynomial from Q.
 * Given a polynomial with rational coefficients, returns:
 * - zPoly: the polynomial scaled to have integer coefficients (primitive part)
 * - content: the GCD of the integer coefficients after clearing denominators
 * - denominator: the common denominator used to clear fractions
 *
 * The relationship is: original = (content / denominator) * zPoly
 *
 * @param x
 */
export function expressionToZPoly(x: ExpressionInputType) {
	x = Expression.create(x);

	const p = new Polynomial(x);

	const denominators: bigint[] = [];

	for (const term of p.terms) {
		const m = term.coeff.getMultiplier();
		denominators.push(m.denominator);
	}

	// LCM of all denominators to clear fractions
	const lcmDenom = denominators.reduce((acc, d) => LCM(acc, d), 1n);
	const common = new Polynomial(lcmDenom);
	// Scale to integer coefficients
	const q = p.times(common);
	// Extract content (GCD of integer coefficients)
	const content = new Polynomial(q.content());
	// Get the primitive part
	const pp = q.div(content)[0];

	return {
		zPoly: pp,
		content: content,
		denominator: common,
	};
}
