import { Expression } from '../classes/expression/Expression';
import { Parser } from '../classes/parser/Parser';
import { mathFunctions } from '../dispatch';
import { message, UnexpectedInputError } from '../errors';

import type {
	ExpressionFunction,
	JsFunction,
	ParserInputType,
	ParserValuesObject,
} from '../classes/parser/types';
import type { MathFunction } from '../dispatch';
import type { MathFunctionEntry } from '../dispatch';

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

export interface SetFunctionParams {
	type: 'symbolic' | 'js';
	name: string;
	fn: string | Expression | JsFunction | MathFunction | ExpressionFunction;
	minArgs?: number;
	maxArgs?: number;
	argsOrder?: string[];
}

function entry(
	minArgs: number,
	maxArgs: number,
	fn: MathFunction,
	maxPrecision?: number
): MathFunctionEntry {
	return {
		minArgs,
		maxArgs,
		fn,
		maxPrecision,
		level: 'user',
	};
}

export function wrappedFunction(expressionString: string, argList: string[]) {
	return (...inputs: ParserInputType[]) => {
		const values: ParserValuesObject = {};
		for (let i = 0; i < argList.length; i++) {
			values[argList[i]] = inputs[i];
		}
		return Parser.parse(expressionString, values);
	};
}

export function setFunction(params: SetFunctionParams) {
	if (params.type === 'js') {
		const name = params.name;
		if (typeof params.fn !== 'function') {
			throw new UnexpectedInputError(message('setJSFunctionExpectsFunction'));
		}
		if (!params.minArgs || !params.maxArgs) {
			throw new UnexpectedInputError(message('functionRequiresMinAndMaxArgs'));
		}
		mathFunctions[name] = entry(
			params.minArgs,
			params.maxArgs,
			jsWrapper(name, params.fn as JsFunction) as unknown as MathFunction,
			17
		);
	} else if (params.type === 'symbolic') {
		// Check if the user provided a string
		if (typeof params.fn === 'string') {
			const f = Expression.create(params.fn);
			const args = params.argsOrder ?? f.variables().sort();
			mathFunctions[params.name] = entry(
				// If the user didn't provide a min and max arg number then default to the args length
				params.minArgs ?? args.length,
				params.maxArgs ?? args.length,
				wrappedFunction(params.fn, args) as unknown as MathFunction
			);
		}
		// This one is the simplest one of them all. Just set the function and be done
		else {
			const name = params.name;
			if (!params.minArgs || !params.maxArgs) {
				throw new UnexpectedInputError(message('functionRequiresMinAndMaxArgs'));
			}
			mathFunctions[name] = entry(
				params.minArgs,
				params.maxArgs,
				params.fn as unknown as MathFunction
			);
		}
	}
}
