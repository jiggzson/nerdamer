import { Expression } from '../classes/expression/Expression';
import { wrappedFunction } from '../classes/parser/scripting/functions';
import { mathFunctionRegistry } from '../dispatch';
import { AssignmentError, message, UnexpectedInputError } from '../errors';

import type {
	ExpressionFunction,
	JsFunction,
} from '../classes/parser/types';
import type { MathFunctionEntry, RegisteredMathFunction } from '../dispatch';

/**
 * This is essentially a wrapper around the user provided JS function. It checks each input
 * to ensure that it can be converted to a number. If all inputs are numbers, then the
 * function is called, otherwise a symbolic function is returned.
 *
 * @param name
 * @param fn
 * @returns
 */
function jsWrapper(name: string, fn: JsFunction) {
	return (...expressions: Expression[]) => {
		const args: number[] = [];
		for (const e of expressions) {
			if (e.isNUM()) {
				args.push(Number(e.getMultiplier().toDecimal()));
			} else {
				return Expression.toFunction(name, expressions);
			}
		}
		return Expression.create(Number(fn(...args)));
	};
}

interface SetFunctionBaseParams {
	name: string;
	minArgs?: number;
	maxArgs?: number;
}

export interface SetJSFunctionParams extends SetFunctionBaseParams {
	type: 'js';
	fn: JsFunction;
}

export interface SetSymbolicFunctionParams extends SetFunctionBaseParams {
	type: 'symbolic';
	fn: string | RegisteredMathFunction | ExpressionFunction;
	argsOrder?: string[];
}

export type SetFunctionParams = SetJSFunctionParams | SetSymbolicFunctionParams;

function entry(
	minArgs: number,
	maxArgs: number,
	fn: RegisteredMathFunction,
	maxPrecision?: number
): MathFunctionEntry {
	return {
		minArgs,
		maxArgs,
		fn,
		maxPrecision,
		usage: 'notation',
		level: 'user',
	};
}

export function setFunction(params: SetFunctionParams) {
	const existing = mathFunctionRegistry[params.name];
	if (existing?.level === 'system') {
		throw new AssignmentError(message('restrictedVariableName', { name: params.name }));
	}

	if (params.type === 'js') {
		const name = params.name;
		if (typeof params.fn !== 'function') {
			throw new UnexpectedInputError(message('setJSFunctionExpectsFunction'));
		}
		if (!params.minArgs || !params.maxArgs) {
			throw new UnexpectedInputError(message('functionRequiresMinAndMaxArgs'));
		}
		mathFunctionRegistry[name] = entry(
			params.minArgs,
			params.maxArgs,
			jsWrapper(name, params.fn),
			17
		);
	} else if (params.type === 'symbolic') {
		// Check if the user provided a string
		if (typeof params.fn === 'string') {
			// Only parse the body when argument order must be inferred. Parsing a body with
			// control flow should not execute that control flow during registration.
			const args = params.argsOrder ?? Expression.create(params.fn).variables().sort();
			mathFunctionRegistry[params.name] = entry(
				// If the user didn't provide a min and max arg number then default to the args length
				params.minArgs ?? args.length,
				params.maxArgs ?? args.length,
				wrappedFunction(params.fn, args)
			);
		}
		// This one is the simplest one of them all. Just set the function and be done
		else {
			const name = params.name;
			if (params.minArgs === undefined || params.maxArgs === undefined) {
				throw new UnexpectedInputError(message('functionRequiresMinAndMaxArgs'));
			}
			mathFunctionRegistry[name] = entry(params.minArgs, params.maxArgs, params.fn);
		}
	}
}
