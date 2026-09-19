import { message, UnexpectedDataType } from '../../errors';
import { Expression } from '../expression/Expression';
import { CROSS, DOT_PRODUCT, dataTypes } from '../parser/constants';

import { Vector } from './Vector';

import type { ParserEntity } from '../../types';

/**
 * Computes the dot product of two Vectors or preserves two symbolic operands.
 *
 * @param a - First Vector, or a symbolic Expression operand.
 * @param b - Second Vector, or a symbolic Expression operand.
 * @returns The scalar dot product for Vectors, or an unevaluated `dot(a, b)`
 * Expression when both operands are Expressions.
 * @throws {@link core!UnexpectedDataType} If exactly one operand is not a Vector or
 * the two operands are of incompatible parser types.
 * @throws {@link core!DimensionError} If Vector lengths differ.
 */
export function dot(a: ParserEntity, b: ParserEntity): Expression {
	let retval: Expression;
	if (Vector.isVector(a) && Vector.isVector(b)) {
		retval = a.dot(b);
	} else if (Expression.isExpression(a) && Expression.isExpression(b)) {
		retval = Expression.toFunction(DOT_PRODUCT, [a, b]);
	} else {
		const operand = Vector.isVector(a) ? b : a;
		throw new UnexpectedDataType(
			message('vectorExpected', { type: dataTypes[operand.dataType] })
		);
	}
	return retval;
}

/**
 * Computes a three-dimensional cross product or preserves symbolic operands.
 *
 * @param a - First Vector, or a symbolic Expression operand.
 * @param b - Second Vector, or a symbolic Expression operand.
 * @returns The Vector cross product, or an unevaluated `cross(a, b)` Expression
 * when both operands are Expressions.
 * @throws {@link core!UnexpectedDataType} For incompatible parser operand types.
 * @throws {@link core!DimensionError} Unless both Vectors have exactly three elements.
 */
export function cross(a: Vector, b: Vector): Vector;
export function cross(a: Expression, b: Expression): Expression;
export function cross(a: ParserEntity, b: ParserEntity): Vector | Expression;
export function cross(a: ParserEntity, b: ParserEntity): Vector | Expression {
	let retval: Vector | Expression;
	if (Vector.isVector(a) && Vector.isVector(b)) {
		retval = a.cross(b);
	} else if (Expression.isExpression(a) && Expression.isExpression(b)) {
		retval = Expression.toFunction(CROSS, [a, b]);
	} else {
		const operand = Vector.isVector(a) ? b : a;
		throw new UnexpectedDataType(
			message('vectorExpected', { type: dataTypes[operand.dataType] })
		);
	}
	return retval;
}
