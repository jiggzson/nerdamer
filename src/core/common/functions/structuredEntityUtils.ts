import { Expression } from '../../classes/expression/Expression';

import type { SolutionSet } from '../../../solve/classes/SolutionSet';
import type { Collection } from '../../classes/collection/Collection';
import type { Dictionary } from '../../classes/dictionary/Dictionary';
import type { Matrix } from '../../classes/matrix/Matrix';
import type {
	SupportedInputType,
	ParserInputType,
	ExpressionInputType,
} from '../../classes/parser/types';
import type { ValuesSet } from '../../classes/valuesSet/ValuesSet';
import type { Vector } from '../../classes/vector/Vector';

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
export function toParserInputType(elements: SupportedInputType[]): ParserInputType[] {
	let retval;
	// Convert the elements if they're provided as strings or numbers. We'll know because the input will not
	// have been through the parser and will still be a raw array
	if (elements.length) {
		const converted: ParserInputType[] = [];

		for (let i = 0; i < elements.length; i++) {
			let e = elements[i];

			if (
				!isEnumerable(e) ||
				typeof e === 'string' ||
				typeof e === 'bigint' ||
				typeof e === 'number'
			) {
				e = Expression.create(e);
			}

			converted.push(e);
		}

		retval = converted;
	} else {
		// Otherwise it will be a vector and can just be returned unprocessed.
		retval = elements;
	}

	return retval;
}

/**
 * Converts all inputs to Expression
 * @param inputs
 * @returns
 */
export function toExpressions(inputs: ExpressionInputType[]) {
	return inputs.map(e => Expression.create(e));
}
