import { Expression } from '../classes/expression/Expression';
import { mathFunctionRegistry } from '../dispatch';
import { message, UnexpectedInputError } from '../errors';
import { Settings } from '../Settings';

import type { JsFunction } from '../classes/parser/types';
import type { RegisteredMathFunction } from '../dispatch';
import type { ParserEntity } from '../types';

/** Object containing numerical functions keyed by the names exposed to Nerdamer. */
export type NumericalFunctionSource = Record<string, unknown>;

/** Numerical implementations registered at runtime for evaluation and buildFunction. */
export const connectedNumericalFunctions: Record<string, JsFunction> = {};

const parserWrappers: Record<string, RegisteredMathFunction> = {};

function numericArguments(args: readonly ParserEntity[]): number[] | null {
	const values: number[] = [];
	for (const arg of args) {
		if (!Expression.isExpression(arg) || !arg.isNUM()) {
			return null;
		}
		values.push(Number(arg.getMultiplier().toDecimal()));
	}
	return values;
}

function numericalResult(name: string, args: readonly ParserEntity[]): Expression | null {
	if (!Settings.EVALUATE) {
		return null;
	}

	const values = numericArguments(args);
	if (values === null) {
		return null;
	}

	const result = connectedNumericalFunctions[name](...values);
	if (typeof result !== 'number' && typeof result !== 'boolean') {
		throw new UnexpectedInputError(
			message('wrongInput', {
				expected: 'a JavaScript number or boolean',
				received: typeof result,
			})
		);
	}
	return Expression.create(Number(result));
}

function numericalFunction(
	source: NumericalFunctionSource,
	fn: (...args: number[]) => unknown
): JsFunction {
	return (...args: number[]) => {
		const result = fn.apply(source, args);
		if (typeof result !== 'number' && typeof result !== 'boolean') {
			throw new UnexpectedInputError(
				message('wrongInput', {
					expected: 'a JavaScript number or boolean',
					received: typeof result,
				})
			);
		}
		return result;
	};
}

function wrapParserFunction(name: string): void {
	const current = mathFunctionRegistry[name];
	if (current === undefined || current.fn === parserWrappers[name]) {
		return;
	}

	const symbolic = current.fn as unknown as (...args: ParserEntity[]) => ParserEntity;
	const wrapper = ((...args: ParserEntity[]) => {
		return numericalResult(name, args) ?? symbolic(...args);
	}) as unknown as RegisteredMathFunction;
	current.fn = wrapper;
	parserWrappers[name] = wrapper;
}

function registerSymbolicFunction(name: string): void {
	const wrapper = ((...args: ParserEntity[]) => {
		return numericalResult(name, args) ?? Expression.toFunction(name, args as Expression[]);
	}) as unknown as RegisteredMathFunction;
	mathFunctionRegistry[name] = {
		fn: wrapper,
		minArgs: -1,
		maxArgs: -1,
		usage: 'notation',
		level: 'user',
	};
	parserWrappers[name] = wrapper;
}

/**
 * Connects numerical implementations from another library without replacing Nerdamer's
 * symbolic representation of those functions.
 *
 * Existing parser functions keep their symbolic behavior. During numerical evaluation their
 * connected implementation is used when every argument is numeric. New names remain symbolic
 * during ordinary parsing and evaluate through the connected function only in evaluation mode.
 * The same numerical implementations are available to {@link buildFunction}.
 *
 * This function is synchronous. It does not load packages or alter the caller's module system;
 * `source` is simply an already-loaded object. In an ESM application, a library such as mathjs
 * can therefore be loaded and used normally:
 *
 * @example
 * ```ts
 * import * as math from 'mathjs';
 * import { connectFunctions } from 'nerdamer/core';
 *
 * connectFunctions(['zeta', 'combinations'], math);
 * ```
 *
 * Passing `'*'` connects every own enumerable function on `source`. Non-function properties are
 * skipped in wildcard mode. This is convenient for library-wide setup, but it can also expose
 * utility functions that are not meaningful as numerical Nerdamer functions.
 *
 * @param names - Function names to connect from `source`, or `'*'` to connect every function.
 * @param source - Already-loaded object containing the numerical functions.
 */
export function connectFunctions(
	names: readonly string[],
	source: NumericalFunctionSource
): void {
	const connectedNames = names.includes('*')
		? [
				...new Set([
					...names.filter(name => name !== '*'),
					...Object.keys(source).filter(name => typeof source[name] === 'function'),
				]),
			]
		: names;

	for (const name of connectedNames) {
		const value = source[name];
		if (typeof value !== 'function') {
			throw new UnexpectedInputError(message('setJSFunctionExpectsFunction'));
		}

		connectedNumericalFunctions[name] = numericalFunction(
			source,
			value as (...args: number[]) => unknown
		);

		if (mathFunctionRegistry[name] === undefined) {
			registerSymbolicFunction(name);
		} else {
			wrapParserFunction(name);
		}
	}
}
