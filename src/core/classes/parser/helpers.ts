import { scopedBlock } from '../../Settings';
import { Expression } from '../expression/Expression';

import { Parser } from './Parser';

import type { ExpressionInput, StructuredEntityType } from '../../types';
import type {
	ParserValuesObject,
} from './types';

export { scopedBlock };

/**
 * Forces the expression to be evaluated
 *
 * @param expression The expression to be evaluated
 * @param values The values to be substituted
 * @returns
 */
export function evaluate(expression: string, values?: ParserValuesObject) {
	return Parser.evaluate(expression, values);
}

export function inert(expression: string) {
	return scopedBlock('EVALUATE', false, () => {
		return scopedBlock('SUBSTITUTE', false, () => {
			return Parser.parse(expression);
		});
	});
}

export function _(expr: ExpressionInput) {
	return Expression.create(expr);
}

/**
 * Returns true if the object is a structured entity
 * @param obj
 * @returns
 */
export function isStructuredEntity(obj: unknown): obj is StructuredEntityType {
	if (typeof obj === 'undefined') {
		return false;
	}
	return (obj as { isEnumerable: boolean }).isEnumerable;
}
