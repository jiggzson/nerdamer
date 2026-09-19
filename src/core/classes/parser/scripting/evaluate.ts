import { numeric as numericScalar } from '../../../../math/math';
import { DimensionError, message, UnexpectedDataType } from '../../../errors';
import { Collection } from '../../collection/Collection';
import { Dictionary } from '../../dictionary/Dictionary';
import { Equation } from '../../equation/Equation';
import { Expression } from '../../expression/Expression';
import { assertPlainVariableAndGetString } from '../../expression/utils';
import { Matrix } from '../../matrix/Matrix';
import { ValuesSet } from '../../valuesSet/ValuesSet';
import { Vector } from '../../vector/Vector';
import { dataTypes } from '../constants';

import type { ParserEntity } from '../../../types';
import type { DeferredFunctionArgument, ParserValuesObject } from '../types';

const EVALUATE_FUNCTION = 'evaluate';

/**
 * Evaluates a deferred parser value and returns the resolved input if evaluation cannot complete.
 */
export function evaluate(
	value: DeferredFunctionArgument,
	substitutions?: DeferredFunctionArgument,
	point?: DeferredFunctionArgument
): ParserEntity {
	const input = value();
	let values: ParserValuesObject | undefined;

	if (substitutions) {
		const resolved = substitutions();
		values = {};

		if (point) {
			const resolvedPoint = point();

			if (!Vector.isVector(resolved)) {
				throw new UnexpectedDataType(
					message('vectorExpected', { type: dataTypes[resolved.dataType] })
				);
			}
			if (!Vector.isVector(resolvedPoint)) {
				throw new UnexpectedDataType(
					message('vectorExpected', { type: dataTypes[resolvedPoint.dataType] })
				);
			}
			if (resolved.count() !== resolvedPoint.count()) {
				throw new DimensionError(
					message('mismatchedDimensions', { function: EVALUATE_FUNCTION })
				);
			}

			for (let i = 0; i < resolved.count(); i++) {
				const variable = resolved.elements[i];
				if (!Expression.isExpression(variable)) {
					throw new UnexpectedDataType(
						message('expressionExpected', { type: dataTypes[variable.dataType] })
					);
				}
				values[assertPlainVariableAndGetString(variable)] = resolvedPoint.elements[i];
			}
		} else {
			if (!Dictionary.isDictionary(resolved)) {
				throw new UnexpectedDataType(
					message('unsupportedType', { type: dataTypes[resolved.dataType] })
				);
			}

			for (const [name, substitution] of resolved) {
				values[name] = substitution;
			}
		}
	}

	let retval = input;
	try {
		if (
			values &&
			(Expression.isExpression(input) || Vector.isVector(input) || Matrix.isMatrix(input))
		) {
			retval = input.evaluate(values);
		} else {
			retval = input.evaluate();
		}
	} catch {
		retval = input;
	}

	return retval;
}

function applyNumeric(value: ParserEntity, precision?: Expression): ParserEntity {
	let retval: ParserEntity;

	if (Expression.isExpression(value)) {
		retval = numericScalar(value, precision);
	} else if (Equation.isEquation(value)) {
		retval = value.copy().each(e =>
			Expression.isExpression(e) ? numericScalar(e, precision) : e
		);
	} else if (Vector.isVector(value)) {
		retval = value.copy().each(e => applyNumeric(e, precision));
	} else if (Matrix.isMatrix(value)) {
		retval = value.copy().each(e => numericScalar(e, precision));
	} else if (Collection.isCollection(value)) {
		retval = value.copy().each(e => applyNumeric(e, precision));
	} else if (Dictionary.isDictionary(value)) {
		retval = value.copy().each(e => applyNumeric(e, precision));
	} else if (ValuesSet.isValuesSet(value)) {
		retval = value.copy().each(e => applyNumeric(e, precision));
	} else {
		retval = value;
	}

	return retval;
}

/**
 * Evaluates a parser value numerically at a finite significant-digit precision.
 */
export function numeric(
	value: DeferredFunctionArgument,
	precision?: DeferredFunctionArgument
): ParserEntity {
	const input = value();
	let digits: Expression | undefined;

	if (precision) {
		const resolved = precision();
		if (!Expression.isExpression(resolved)) {
			throw new UnexpectedDataType(
				message('expressionExpected', { type: dataTypes[resolved.dataType] })
			);
		}
		digits = resolved;
	}

	const retval = applyNumeric(input, digits);
	return retval;
}
