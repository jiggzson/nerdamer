import { message, UnexpectedDataType } from '../../../errors';
import { Collection } from '../../collection/Collection';
import { Dictionary } from '../../dictionary/Dictionary';
import { Expression } from '../../expression/Expression';
import { one, zero } from '../../expression/shortcuts';
import { Matrix } from '../../matrix/Matrix';
import { ValuesSet } from '../../valuesSet/ValuesSet';
import { Vector } from '../../vector/Vector';
import { dataTypes } from '../constants';

import {
	FOR,
	isInsideSymbolicFunction,
	ReturnSignal,
	withReturnPropagation,
} from './controlFlow';
import { LET } from './scope';

import type { ParserEntity } from '../../../types';
import type { DeferredFunctionArgument } from '../types';

/** Iterates parser containers while keeping iteration variables local to each body call. */
export function each(
	collection: DeferredFunctionArgument,
	variable: DeferredFunctionArgument,
	bodyOrValueVariable: DeferredFunctionArgument,
	dictionaryBody?: DeferredFunctionArgument
): ParserEntity {
	const target = collection();
	const values: ParserEntity[] = [];
	const keys: ParserEntity[] = [];

	if (dictionaryBody) {
		if (!Dictionary.isDictionary(target)) {
			throw new UnexpectedDataType(
				message('unsupportedType', { type: dataTypes[target.dataType] })
			);
		}
		for (const [key, value] of target.entries()) {
			keys.push(Expression.create(key));
			values.push(value.copy());
		}
	} else if (
		Vector.isVector(target) ||
		Collection.isCollection(target) ||
		ValuesSet.isValuesSet(target)
	) {
		target.forEach(value => values.push(value.copy()));
	} else if (Matrix.isMatrix(target)) {
		target.forEach(value => values.push(value.copy()));
	} else if (Dictionary.isDictionary(target)) {
		target.forEach(value => values.push(value.copy()));
	} else {
		throw new UnexpectedDataType(
			message('unsupportedType', { type: dataTypes[target.dataType] })
		);
	}

	let index = 0;
	let retval: ParserEntity;
	try {
		retval = withReturnPropagation(() =>
			FOR(
				() => zero(),
				() => (index < values.length ? one() : zero()),
				() => {
					index++;
					return zero();
				},
				() => {
					if (dictionaryBody) {
						return LET(
							variable,
							() => keys[index],
							() => LET(bodyOrValueVariable, () => values[index], dictionaryBody)
						);
					}
					return LET(variable, () => values[index], bodyOrValueVariable);
				}
			)
		);
	} catch (error) {
		if (!isInsideSymbolicFunction() && ReturnSignal.isReturnSignal(error)) {
			retval = error.value;
		} else {
			throw error;
		}
	}
	return retval;
}
