import { Settings } from '../../Settings';
import { Expression } from '../expression/Expression';

import { Parser } from './Parser';

import type {
	ParserValuesObject,
	ParserInputType,
	ExpressionInputType,
	StructuredEntityType,
} from './types';

/**
 * Allows for the parser to run with a desired setting for a single call
 *
 * @param setting The setting to modified for the call
 * @param value The value of the setting under which the function is called
 * @param callback The function to be called
 * @returns The result of the call
 */
export function scopedBlock(setting: string, value: boolean, callback: () => ParserInputType) {
	let error: Error | undefined = undefined;
	let result;
	// Store the value being currently used
	const currentSettingValue = Settings[setting];
	// Update the setting to the desired value
	Settings[setting] = value;
	try {
		// Call the function and store the result
		result = callback();
	} catch (e) {
		error = e as Error;
	}
	// Restore the value
	Settings[setting] = currentSettingValue;

	// Rethrow the error if there was one
	if (error) {
		throw error;
	}

	// Return the result
	return result;
}

/**
 * Forces the expression to be evaluated
 *
 * @param expression The expression to be evaluated
 * @param values The values to be substituted
 * @returns
 */
export function evaluate(expression: string, values?: ParserValuesObject) {
	return scopedBlock('EVALUATE', true, () => {
		return Parser.parse(expression, values);
	});
}

export function inert(expression: string) {
	return scopedBlock('EVALUATE', false, () => {
		return scopedBlock('SUBSTITUTE', false, () => {
			return Parser.parse(expression);
		});
	});
}

export function _(expr: ExpressionInputType) {
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
	return (obj as { isCollectionOfValues: boolean }).isCollectionOfValues;
}
