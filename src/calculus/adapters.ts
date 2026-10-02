import { Equation } from '../core/classes/equation/Equation';
import { assertPlainVariableAndGetString } from '../core/classes/expression/utils';

import { diff } from './derivative/diff';
import { integrate } from './integrate/integrate';
import { limit } from './limit/limit';

import type { Expression } from '../core/classes/expression/Expression';
import type { ParserEntity } from '../core/types';
import type { LimitDir } from './limit/limit';

/** Applies differentiation to both sides when the parser supplies an Equation. */
export function differentiate(
	expr: ParserEntity,
	variable?: ParserEntity,
	n?: ParserEntity
): ParserEntity {
	let retval: ParserEntity;

	if (Equation.isEquation(expr)) {
		retval = expr.each(e => differentiate(e, variable, n));
	} else {
		retval = diff(
			expr as Expression,
			variable as Expression | undefined,
			n as Expression | undefined
		);
	}

	return retval;
}

/** Applies integration to both sides when the parser supplies an Equation. */
export function integrateEquation(expr: ParserEntity, variable?: ParserEntity): ParserEntity {
	let retval: ParserEntity;

	if (Equation.isEquation(expr)) {
		retval = expr.each(e => integrateEquation(e, variable));
	} else {
		retval = integrate(expr as Expression, variable as Expression);
	}

	return retval;
}

/** Maps a symbolic direction token to the direction accepted by limit. */
export function directionalLimit(
	expr: Expression,
	x: Expression,
	val: Expression,
	dir?: Expression
): Expression {
	let direction: LimitDir = 'both';

	if (dir) {
		direction = assertPlainVariableAndGetString(dir) as LimitDir;
	}

	const retval = limit(expr, x, val, direction);
	return retval;
}
