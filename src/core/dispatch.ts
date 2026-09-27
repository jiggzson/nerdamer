import type { Scope } from './common/classes/Scope';
import type { ParserEntity } from './types';

export type RegisteredMathFunction = (...args: never[]) => ParserEntity;
export type ParserUsage = 'notation' | 'scripting';
export type ParserRegistrationLevel = 'system' | 'user';

export interface MathFunctionEntry {
	/** The function to be called */
	fn: RegisteredMathFunction;
	/** The minimum arguments allowed. Use -1 for variadic. */
	minArgs: number;
	/** The maximum arguments allowed. Use -1 for variadic. */
	maxArgs: number;
	/** The maximum precision available for the function */
	maxPrecision?: number;
	/** Argument positions that explicitly accept Equation values. */
	equationArgs?: number[];
	/** Whether Vector and Matrix arguments are distributed element-wise. */
	distElWise?: boolean;
	/** Whether argument evaluation is controlled by the registered function. */
	deferArguments?: boolean;
	/** Optional syntax normalization applied to deferred argument scopes before evaluation. */
	normalizeDeferredArguments?: (argumentScopes: Scope[]) => Scope[];
	/** Whether bracketless notation consumes the rest of the current statement expression. */
	bracketlessStatement?: boolean;
	/** Whether parser dispatch consumes an escaping top-level RETURN from this function. */
	returnBoundary?: boolean;
	/** Whether the entry belongs to ordinary Nerdamer notation or Nerdamer scripting. */
	usage: ParserUsage;
	/** Whether this function was registered at the system or user level */
	level: ParserRegistrationLevel;
}

/**
 * Registers a system-level function in the dispatch table. Registered functions can use
 * narrower parameter types, so `RegisteredMathFunction` does not define a common argument
 * type. Dynamic invocation is handled by `callFunction`.
 */

export function systemFunction(opts: {
	fn: RegisteredMathFunction;
	minArgs: number;
	maxArgs: number;
	maxPrecision?: number;
	equationArgs?: number[];
	distElWise: boolean;
	deferArguments?: boolean;
	normalizeDeferredArguments?: (argumentScopes: Scope[]) => Scope[];
	bracketlessStatement?: boolean;
	returnBoundary?: boolean;
	usage?: ParserUsage;
}): MathFunctionEntry {
	return {
		fn: opts.fn,
		minArgs: opts.minArgs,
		maxArgs: opts.maxArgs,
		maxPrecision: opts.maxPrecision,
		equationArgs: opts.equationArgs,
		distElWise: opts.distElWise,
		deferArguments: opts.deferArguments,
		normalizeDeferredArguments: opts.normalizeDeferredArguments,
		bracketlessStatement: opts.bracketlessStatement,
		returnBoundary: opts.returnBoundary,
		usage: opts.usage ?? 'notation',
		level: 'system',
	};
}

export const mathFunctionRegistry: { [functionName: string]: MathFunctionEntry } = {};
