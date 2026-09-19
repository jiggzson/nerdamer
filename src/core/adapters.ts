import { Expression } from './classes/expression/Expression';
import { Polynomial } from './classes/polynomial/Polynomial';
import { LCM } from './functions/bigint/bigint';

import type { ExpressionInput } from './types';

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
export function expressionToZPoly(x: ExpressionInput) {
	x = Expression.create(x);

	const p = new Polynomial(x);

	const denominators: bigint[] = [];

	for (const term of p.terms) {
		const m = term.coeff.getMultiplier();
		denominators.push(m.denominator);
	}

	// LCM of all denominators to clear fractions
	const lcmDenom = denominators.reduce((acc, d) => LCM(acc, d), 1n);
	const common = new Polynomial(Expression.Number(lcmDenom));
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
