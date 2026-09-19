import { normalizeMultiplierDenominators } from '../core/classes/expression/analysis';
import { collectVariablesSet } from '../core/classes/expression/collect';
import { Expression } from '../core/classes/expression/Expression';
import { Polynomial } from '../core/classes/polynomial/Polynomial';
import { Vector } from '../core/classes/vector/Vector';

import { polynomialToMultiPoly, multiPolyToExpression } from './adapters';
import { Groebner } from './algorithms/groebnerBase';

import type { ExpressionInput } from '../core/types';

/**
 * Computes an expression-facing Groebner basis for polynomial generators.
 *
 * @remarks
 * All generators are converted using one variable order so exponent indices remain
 * consistent. Rational coefficient denominators are cleared per generator before the
 * exact integer-coefficient `MultiPoly` engine runs; multiplying a generator by a
 * nonzero scalar preserves the generated ideal. When `vars` is omitted, variables are
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
	// Since the Groebner core operates on MultiPoly over Z, clear denominators per generator
	// before converting so rational-coefficient inputs are lifted into equivalent integer ones.
	const polys = expressions.map(e => {
		const cleared = normalizeMultiplierDenominators(e);
		return polynomialToMultiPoly(new Polynomial(cleared, vars), vars).poly;
	});

	return new Vector(Groebner(polys, vars).map(gb => multiPolyToExpression(gb, vars)));
}
