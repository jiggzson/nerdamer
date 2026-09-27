import { collectVariablesSet } from '../core/classes/expression/collect';
import { Expression } from '../core/classes/expression/Expression';
import {
	expressionToIntegerSparsePolynomial,
	sparsePolynomialToExpression,
} from '../core/classes/polynomial/SparsePolynomialAdapter';
import { Vector } from '../core/classes/vector/Vector';

import { Groebner } from './algorithms/groebnerBase';

import type { ExpressionInput } from '../core/types';

/**
 * Computes an expression-facing Groebner basis for polynomial generators.
 *
 * @remarks
 * All generators are converted using one variable order so exponent indices remain
 * consistent. Rational coefficient denominators are cleared per generator before the
 * exact integer-coefficient sparse engine runs; multiplying a generator by a nonzero
 * scalar preserves the generated ideal. When `vars` is omitted, variables are
 * collected across every generator.
 *
 * This convenience wrapper uses lexicographic order and a reduced, deterministically
 * sorted basis. Use the advanced Groebner APIs for another monomial order, resource
 * budgets, elimination, or ideal membership.
 *
 * @param expressionArray - Polynomial-like generators of the ideal.
 * @param vars - Variable order, from highest to lowest lexicographic priority.
 * @returns A new vector containing expression representations of the basis.
 */
export function groebner(expressionArray: ExpressionInput[] | Vector, vars?: string[]) {
	const inputs = Vector.isVector(expressionArray) ? expressionArray.elements : expressionArray;
	const expressions = inputs.map(e => Expression.create(e));
	// Get the unified variable list across ALL generators
	vars ??= collectVariablesSet(expressions);

	// Convert each polynomial using the unified variable list so indices are consistent.
	// Rational denominators are cleared exactly while converting into the sparse ring.
	const polys = expressions.map(
		e => expressionToIntegerSparsePolynomial(e, vars).polynomial
	);

	return new Vector(
		Groebner(polys).map(polynomial => sparsePolynomialToExpression(polynomial, vars))
	);
}
