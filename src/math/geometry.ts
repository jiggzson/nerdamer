import { Expression } from '../core/classes/expression/Expression';
import { half, two } from '../core/classes/expression/shortcuts';
import { COS, SIN, VECTOR } from '../core/classes/parser/constants';
import { add } from '../core/classes/parser/operations/add';
import { power } from '../core/classes/parser/operations/power';
import { DimensionError, message, UnexpectedInputError } from '../core/errors';

import type { Vector } from '../core/classes/vector/Vector';
import type { ExpressionInput } from '../core/types';

/**
 * Returns the symbolic hypotenuse of two expressions.
 *
 * Matching linear sine and cosine terms collapse through the Pythagorean identity;
 * otherwise the result is the principal square root of the sum of squares.
 */
export function hypot(a: Expression, b: Expression) {
	const fns = [SIN, COS];
	let retval: Expression;

	if (
		a.isFunction(fns) &&
		b.isFunction(fns) &&
		a.name !== b.name &&
		a.isLinear() &&
		b.isLinear() &&
		a.getMultiplier().eq(b.getMultiplier())
	) {
		retval = Expression.fromRational(a.getMultiplier());
	} else {
		const aSquared = power(a, two());
		const bSquared = power(b, two());
		retval = power(add(aSquared, bSquared), half());
	}

	return retval;
}


/** Returns the line through two two-dimensional points, evaluated at `dimension`. */
export function line(
	p1: Vector,
	p2: Vector,
	dimension: ExpressionInput = 'x'
): Expression {
	if (!p1 || !p2 || p1.dataType !== VECTOR || p2.dataType !== VECTOR || p1.count() !== 2 || p2.count() !== 2) {
		throw new DimensionError(message('mismatchedDimensions', { function: 'line' }));
	}

	const x1 = p1.elements[0];
	const y1 = p1.elements[1];
	const x2 = p2.elements[0];
	const y2 = p2.elements[1];
	if (
		!Expression.isExpression(x1) ||
		!Expression.isExpression(y1) ||
		!Expression.isExpression(x2) ||
		!Expression.isExpression(y2)
	) {
		throw new UnexpectedInputError(
			message('wrongInput', {
				expected: 'two-dimensional vectors of scalar expressions',
				received: `${p1.text()}, ${p2.text()}`,
			})
		);
	}

	const variable = Expression.create(dimension);
	return y1.plus(y2.minus(y1).div(x2.minus(x1)).times(variable.minus(x1)));
}
