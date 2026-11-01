import { hypot, line } from '../math/geometry';
import {
	sqrt,
	cbrt,
	factorial,
	fibonacci,
	abs,
	log,
	log10,
	exp,
	dirac,
	heaviside,
	step,
	rect,
	tri,
	radians,
	degrees,
	doubleFactorial,
	round,
	significant,
	floor,
	ceiling,
	mod,
	modInv,
	parens,
	sign,
	contains,
	max,
	min,
	nthroot,
	scientific,
} from '../math/index';
import {
	cos,
	sin,
	tan,
	sec,
	csc,
	cot,
	acos,
	asin,
	atan,
	asec,
	acsc,
	acot,
	atan2,
	cosh,
	sinh,
	tanh,
	sech,
	csch,
	coth,
	acosh,
	asinh,
	atanh,
	asech,
	acsch,
	acoth,
} from '../math/trig';
import { trunc } from '../math/trunc';
import { continuedFraction, count, isprime, size } from '../math/utils';

import { numeric } from './classes/parser/scripting/evaluate';
import {
	DIRAC,
	DOUBLE_FACTORIAL,
	FACTORIAL,
	HEAVISIDE,
} from './constants/functionNames';
import { subst } from './functions/subst';

import type { Equation } from './classes/equation/Equation';
import type { Expression } from './classes/expression/Expression';
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

/** Preserves equation and expression expansion through the parser registry. */
function expandEntity(x: Expression | Equation) {
	return x.expand();
}

/** Standard mathematical implementations are registered when the core registry loads. */
export const mathFunctionRegistry: { [functionName: string]: MathFunctionEntry } = {
	cos: systemFunction({ fn: cos, minArgs: 1, maxArgs: 1, distElWise: true }),
	sin: systemFunction({ fn: sin, minArgs: 1, maxArgs: 1, distElWise: true }),
	tan: systemFunction({ fn: tan, minArgs: 1, maxArgs: 1, distElWise: true }),
	sec: systemFunction({ fn: sec, minArgs: 1, maxArgs: 1, distElWise: true }),
	csc: systemFunction({ fn: csc, minArgs: 1, maxArgs: 1, distElWise: true }),
	cot: systemFunction({ fn: cot, minArgs: 1, maxArgs: 1, distElWise: true }),
	acos: systemFunction({ fn: acos, minArgs: 1, maxArgs: 1, distElWise: true }),
	asin: systemFunction({ fn: asin, minArgs: 1, maxArgs: 1, distElWise: true }),
	atan: systemFunction({ fn: atan, minArgs: 1, maxArgs: 1, distElWise: true }),
	asec: systemFunction({ fn: asec, minArgs: 1, maxArgs: 1, distElWise: true }),
	acsc: systemFunction({ fn: acsc, minArgs: 1, maxArgs: 1, distElWise: true }),
	acot: systemFunction({ fn: acot, minArgs: 1, maxArgs: 1, distElWise: true }),
	atan2: systemFunction({ fn: atan2, minArgs: 2, maxArgs: 2, distElWise: true }),
	cosh: systemFunction({ fn: cosh, minArgs: 1, maxArgs: 1, distElWise: true }),
	sinh: systemFunction({ fn: sinh, minArgs: 1, maxArgs: 1, distElWise: true }),
	tanh: systemFunction({ fn: tanh, minArgs: 1, maxArgs: 1, distElWise: true }),
	sech: systemFunction({ fn: sech, minArgs: 1, maxArgs: 1, distElWise: true }),
	csch: systemFunction({ fn: csch, minArgs: 1, maxArgs: 1, distElWise: true }),
	coth: systemFunction({ fn: coth, minArgs: 1, maxArgs: 1, distElWise: true }),
	acosh: systemFunction({ fn: acosh, minArgs: 1, maxArgs: 1, distElWise: true }),
	asinh: systemFunction({ fn: asinh, minArgs: 1, maxArgs: 1, distElWise: true }),
	atanh: systemFunction({ fn: atanh, minArgs: 1, maxArgs: 1, distElWise: true }),
	asech: systemFunction({ fn: asech, minArgs: 1, maxArgs: 1, distElWise: true }),
	acsch: systemFunction({ fn: acsch, minArgs: 1, maxArgs: 1, distElWise: true }),
	acoth: systemFunction({ fn: acoth, minArgs: 1, maxArgs: 1, distElWise: true }),

	line: systemFunction({ fn: line, minArgs: 2, maxArgs: 3, distElWise: false }),
	abs: systemFunction({ fn: abs, minArgs: 1, maxArgs: 1, distElWise: true }),
	magnitude: systemFunction({ fn: abs, minArgs: 1, maxArgs: 1, distElWise: true }),
	sqrt: systemFunction({ fn: sqrt, minArgs: 1, maxArgs: 1, distElWise: true }),
	nthroot: systemFunction({ fn: nthroot, minArgs: 2, maxArgs: 2, distElWise: true }),
	cbrt: systemFunction({ fn: cbrt, minArgs: 1, maxArgs: 1, distElWise: true }),
	subst: systemFunction({ fn: subst, minArgs: 3, maxArgs: 3, distElWise: true }),
	log: systemFunction({ fn: log, minArgs: 1, maxArgs: 2, distElWise: true }),
	log10: systemFunction({ fn: log10, minArgs: 1, maxArgs: 1, distElWise: true }),
	radians: systemFunction({ fn: radians, minArgs: 1, maxArgs: 1, distElWise: true }),
	degrees: systemFunction({ fn: degrees, minArgs: 1, maxArgs: 1, distElWise: true }),
	exp: systemFunction({ fn: exp, minArgs: 1, maxArgs: 1, distElWise: true }),
	[DIRAC]: systemFunction({ fn: dirac, minArgs: 1, maxArgs: 1, distElWise: true }),
	[HEAVISIDE]: systemFunction({ fn: heaviside, minArgs: 1, maxArgs: 1, distElWise: true }),
	step: systemFunction({ fn: step, minArgs: 1, maxArgs: 1, distElWise: true }),
	rect: systemFunction({ fn: rect, minArgs: 1, maxArgs: 1, distElWise: true }),
	tri: systemFunction({ fn: tri, minArgs: 1, maxArgs: 1, distElWise: true }),
	continued_fraction: systemFunction({ fn: continuedFraction, minArgs: 1, maxArgs: 2, distElWise: false }),
	scientific: systemFunction({ fn: scientific, minArgs: 1, maxArgs: 2, distElWise: true }),
	hypot: systemFunction({ fn: hypot, minArgs: 2, maxArgs: 2, distElWise: true }),
	[FACTORIAL]: systemFunction({ fn: factorial, minArgs: 1, maxArgs: 1, distElWise: true }),
	factorial: systemFunction({ fn: factorial, minArgs: 1, maxArgs: 1, distElWise: true }),
	[DOUBLE_FACTORIAL]: systemFunction({ fn: doubleFactorial, minArgs: 1, maxArgs: 1, distElWise: true }),
	dfactorial: systemFunction({ fn: doubleFactorial, minArgs: 1, maxArgs: 1, distElWise: true }),
	expand: systemFunction({
		fn: expandEntity,
		minArgs: 1,
		maxArgs: 1,
		equationArgs: [0],
		distElWise: true,
	}),
	numeric: systemFunction({
		fn: numeric,
		minArgs: 1,
		maxArgs: 2,
		equationArgs: [0],
		distElWise: false,
		deferArguments: true,
	}),
	round: systemFunction({ fn: round, minArgs: 1, maxArgs: 2, distElWise: true }),
	significant: systemFunction({ fn: significant, minArgs: 2, maxArgs: 2, distElWise: true }),
	sign: systemFunction({ fn: sign, minArgs: 1, maxArgs: 1, distElWise: true }),
	floor: systemFunction({ fn: floor, minArgs: 1, maxArgs: 1, distElWise: true }),
	ceil: systemFunction({ fn: ceiling, minArgs: 1, maxArgs: 1, distElWise: true }),
	ceiling: systemFunction({ fn: ceiling, minArgs: 1, maxArgs: 1, distElWise: true }),
	trunc: systemFunction({ fn: trunc, minArgs: 1, maxArgs: 1, distElWise: true }),
	mod: systemFunction({ fn: mod, minArgs: 2, maxArgs: 2, distElWise: true }),
	modinv: systemFunction({ fn: modInv, minArgs: 2, maxArgs: 2, distElWise: true }),
	parens: systemFunction({ fn: parens, minArgs: 1, maxArgs: 1, distElWise: true }),
	count: systemFunction({ fn: count, minArgs: 1, maxArgs: 1, distElWise: false }),
	size: systemFunction({ fn: size, minArgs: 1, maxArgs: 1, distElWise: false }),
	contains: systemFunction({ fn: contains, minArgs: 2, maxArgs: 2, distElWise: false }),
	max: systemFunction({ fn: max, minArgs: 2, maxArgs: -1, distElWise: true }),
	min: systemFunction({ fn: min, minArgs: 2, maxArgs: -1, distElWise: true }),

	isprime: systemFunction({ fn: isprime, minArgs: 1, maxArgs: 1, distElWise: true }),
	fib: systemFunction({ fn: fibonacci, minArgs: 1, maxArgs: 1, distElWise: true }),
};
