import { Expression } from '../../classes/expression/Expression';

import type { SolutionSet } from '../../../solve/classes/SolutionSet';
import type { Collection } from '../../classes/collection/Collection';
import type { Dictionary } from '../../classes/dictionary/Dictionary';
import type { Matrix } from '../../classes/matrix/Matrix';
import type { ValuesSet } from '../../classes/valuesSet/ValuesSet';
import type { Vector } from '../../classes/vector/Vector';
import type { NerdamerInput, ParserEntity, ExpressionInput } from '../../types';

/**
 * Checks to see if an obj is a set of values
 *
 * @param obj
 * @returns
 */
export function isEnumerable(
	obj: unknown
): obj is Vector | Collection | Matrix | ValuesSet | SolutionSet | Dictionary {
	if (obj === undefined) {
		return false;
	}

	return !!(obj as Vector | Collection | Matrix | ValuesSet | SolutionSet | Dictionary)
		.isEnumerable;
}

/**
 * Converts string and numbers to a parser supported type.
 * @param elements
 * @returns
 */
export function toParserEntities(elements: NerdamerInput[]): ParserEntity[] {
	const retval: ParserEntity[] = [];

	for (let i = 0; i < elements.length; i++) {
		const element = elements[i];
		retval.push(isEnumerable(element) ? element : Expression.create(element));
	}

	return retval;
}

/**
 * Converts all inputs to Expression
 * @param inputs
 * @returns
 */
export function toExpressions(inputs: ExpressionInput[]) {
	return inputs.map(e => Expression.create(e));
}
