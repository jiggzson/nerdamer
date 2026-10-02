import { Expression } from '../expression/Expression';

import { Polynomial } from './Polynomial';
import {
	expressionToIntegerSparsePolynomial,
	sparsePolynomialToExpression,
} from './SparsePolynomialAdapter';

import type { ExpressionInput } from '../../types';

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
	const expression = Expression.create(x);
	const variables = expression.variables().sort();
	const converted = expressionToIntegerSparsePolynomial(expression, variables);

	const coefficientContent = converted.polynomial.isZero()
		? 1n
		: converted.polynomial.content();
	const primitive =
		coefficientContent === 1n
			? converted.polynomial
			: converted.polynomial.divideByScalarExact(coefficientContent);

	return {
		zPoly: new Polynomial(
			sparsePolynomialToExpression(primitive, variables),
			[...variables],
			'lex'
		),
		content: new Polynomial(Expression.Number(coefficientContent)),
		denominator: new Polynomial(Expression.Number(converted.denominator)),
	};
}
