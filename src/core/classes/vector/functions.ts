import { dataTypes } from '../../constants/entityTypes';
import { CROSS, DOT_PRODUCT } from '../../constants/functionNames';
import { message, UnexpectedDataType } from '../../errors';
import { Expression } from '../expression/Expression';

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
 * Computes the cross product of two vectors in 0, 1, 3, or 7 dimensions.
 *
 * The three-dimensional result is the familiar cross product; the
 * seven-dimensional result follows the fixed octonion convention documented
 * on {@link Vector.cross}. The 7D multiplication table is not uniquely
 * determined by dimension alone. Zero- and one-dimensional results are zero
 * vectors. Other dimensions are unsupported.
 *
 * Two symbolic Expressions are instead left as an unevaluated `cross(a, b)`
 * call, because their dimensions are not known.
 *
 * @param a - First Vector or symbolic Expression.
 * @param b - Second Vector or symbolic Expression.
 * @returns A new Vector for two supported Vectors; otherwise an unevaluated
 * `cross(a, b)` Expression when both arguments are symbolic Expressions.
 * @throws {@link core!UnexpectedDataType} If the operands have incompatible types.
 * @throws {@link core!DimensionError} If Vector lengths differ or are not 0, 1, 3, or 7.
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
