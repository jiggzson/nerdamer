import { polynomialToMultiPoly, multiPolyToExpression } from '../core/adapters';
import { normalizeMultiplierDenominators } from '../core/classes/expression/analysis';
import { collectVariablesSet } from '../core/classes/expression/collect';
import { Expression } from '../core/classes/expression/Expression';
import { Polynomial } from '../core/classes/polynomial/Polynomial';
import { Vector } from '../core/classes/vector/Vector';

import { Groebner } from './algorithms/groebnerBase';

import type { ExpressionInputType } from '../core/classes/parser/types';

export function groebner(expressionArray: ExpressionInputType[], vars?: string[]) {
	const expressions = expressionArray.map(e => Expression.create(e));
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
