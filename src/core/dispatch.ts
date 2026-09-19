import { polyFactors, factor } from '../algebra/factor/factor';
import { gcd, lcm } from '../algebra/gcd/gcd';
import { groebner } from '../algebra/groebner';
import { partfrac } from '../algebra/partfrac';
import { simplify } from '../algebra/simplify/simplify';
import { sqcomp } from '../algebra/utils';
import { diff } from '../calculus/derivative/diff';
import { C, S } from '../calculus/fresnel';
import { integrate } from '../calculus/integrate/integrate';
import { ilaplace } from '../calculus/laplace/ilaplace';
import { laplace } from '../calculus/laplace/laplace';
import { limit } from '../calculus/limit/limit';
import { hypot } from '../math/geometry';
import {
	matrix,
	sqrt,
	cbrt,
	factorial,
	fibonacci,
	abs,
	erf,
	erfc,
	log,
	exp,
	gamma,
	dirac,
	heaviside,
	doubleFactorial,
	round,
	floor,
	ceiling,
	mod,
	modInv,
	parens,
	sum,
	product,
	sign,
	sinc,
	Shi,
	Si,
	Chi,
	Ci,
	Ei,
	Li,
	defint,
	contains,
	max,
	min,
	nthroot,
} from '../math/math';
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
import { count, isprime, size } from '../math/utils';
import { solve } from '../solve/solve';
import { solveSystem } from '../solve/solveSystem';

import { assuming, forget } from './classes/assumption/assume';
import { Collection } from './classes/collection/Collection';
import { Dictionary } from './classes/dictionary/Dictionary';
import { Equation } from './classes/equation/Equation';
import { one, zero } from './classes/expression/shortcuts';
import { assertPlainVariableAndGetString } from './classes/expression/utils';
import { determinant, nullspace } from './classes/matrix/functions';
import { Matrix } from './classes/matrix/Matrix';
import { imatrix } from './classes/matrix/utils';
import {
	dataTypes,
	DIRAC,
	DOUBLE_FACTORIAL,
	FACTORIAL,
	FRESNEL_C,
	FRESNEL_S,
	HEAVISIDE,
	LI,
} from './classes/parser/constants';
import {
	AND,
	BREAK,
	CONTINUE,
	FOR,
	IF,
	IFERROR,
	ISERROR,
	NOT,
	OR,
	BLOCK,
	RETURN,
	WHILE,
	XOR,
} from './classes/parser/scripting/controlFlow';
import { evaluate, numeric } from './classes/parser/scripting/evaluate';
import { LET, normalizeLetArguments, unassign } from './classes/parser/scripting/scope';
import {
	content,
	deg,
	div as polynomialDiv,
	divide as polynomialDivide,
} from './classes/polynomial/functions';
import { ValuesSet } from './classes/valuesSet/ValuesSet';
import { dot, cross } from './classes/vector/functions';
import { Vector } from './classes/vector/Vector';
import { message, UnexpectedDataType } from './errors';
import { imagPart, realPart, polarForm, rectForm, arg, csgn, conjugate } from './functions/complex';
import { expand } from './functions/expand/expand';
import { subst } from './functions/subst';

import type { LimitDir } from '../calculus/limit/limit';
import type { Expression } from './classes/expression/Expression';
import type { DeferredFunctionArgument } from './classes/parser/types';
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

function entry(opts: {
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

/** Applies parser differentiation to both sides when the input is an Equation. */
function parserDiff(
	expr: ParserEntity,
	variable?: ParserEntity,
	n?: ParserEntity
): ParserEntity {
	let retval: ParserEntity;

	if (Equation.isEquation(expr)) {
		retval = expr.each(e => parserDiff(e, variable, n));
	} else {
		retval = diff(
			expr as Expression,
			variable as Expression | undefined,
			n as Expression | undefined
		);
	}

	return retval;
}

/** Applies parser integration to both sides when the input is an Equation. */
function parserIntegrate(expr: ParserEntity, variable?: ParserEntity): ParserEntity {
	let retval: ParserEntity;

	if (Equation.isEquation(expr)) {
		retval = expr.each(e => parserIntegrate(e, variable));
	} else {
		retval = integrate(expr as Expression, variable as Expression);
	}

	return retval;
}

/** Maps the parser's symbolic direction token to the public limit direction representation. */
function parserLimit(
	expr: Expression,
	x: Expression,
	val: Expression,
	dir?: Expression
): Expression {
	let direction: LimitDir = 'both';

	if (dir) {
		direction = assertPlainVariableAndGetString(dir) as LimitDir;
	}

	const retval = limit(expr, x, val, direction);
	return retval;
}

/** Completes the square while returning the parser-facing expression result. */
function parserSqcomp(expr: Expression, variable?: Expression): Expression {
	const variableName =
		variable === undefined ? undefined : assertPlainVariableAndGetString(variable);
	const retval = sqcomp(expr, variableName).expression;
	return retval;
}

/** Iterates parser containers while keeping the iteration variable local to each body call. */
function parserEach(
	collection: DeferredFunctionArgument,
	variable: DeferredFunctionArgument,
	body: DeferredFunctionArgument
): ParserEntity {
	const target = collection();
	const values: ParserEntity[] = [];

	if (
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
	const retval = FOR(
		() => zero(),
		() => (index < values.length ? one() : zero()),
		() => {
			index++;
			return zero();
		},
		() => LET(variable, () => values[index], body)
	);
	return retval;
}

export const mathFunctionRegistry: { [functionName: string]: MathFunctionEntry } = {
	// Trigonometric
	cos: entry({ fn: cos, minArgs: 1, maxArgs: 1, distElWise: true }),
	sin: entry({ fn: sin, minArgs: 1, maxArgs: 1, distElWise: true }),
	tan: entry({ fn: tan, minArgs: 1, maxArgs: 1, distElWise: true }),
	sec: entry({ fn: sec, minArgs: 1, maxArgs: 1, distElWise: true }),
	csc: entry({ fn: csc, minArgs: 1, maxArgs: 1, distElWise: true }),
	cot: entry({ fn: cot, minArgs: 1, maxArgs: 1, distElWise: true }),
	acos: entry({ fn: acos, minArgs: 1, maxArgs: 1, distElWise: true }),
	asin: entry({ fn: asin, minArgs: 1, maxArgs: 1, distElWise: true }),
	atan: entry({ fn: atan, minArgs: 1, maxArgs: 1, distElWise: true }),
	asec: entry({ fn: asec, minArgs: 1, maxArgs: 1, distElWise: true }),
	acsc: entry({ fn: acsc, minArgs: 1, maxArgs: 1, distElWise: true }),
	acot: entry({ fn: acot, minArgs: 1, maxArgs: 1, distElWise: true }),
	atan2: entry({ fn: atan2, minArgs: 2, maxArgs: 2, distElWise: true }),
	cosh: entry({ fn: cosh, minArgs: 1, maxArgs: 1, distElWise: true }),
	sinh: entry({ fn: sinh, minArgs: 1, maxArgs: 1, distElWise: true }),
	tanh: entry({ fn: tanh, minArgs: 1, maxArgs: 1, distElWise: true }),
	sech: entry({ fn: sech, minArgs: 1, maxArgs: 1, distElWise: true }),
	csch: entry({ fn: csch, minArgs: 1, maxArgs: 1, distElWise: true }),
	coth: entry({ fn: coth, minArgs: 1, maxArgs: 1, distElWise: true }),
	acosh: entry({ fn: acosh, minArgs: 1, maxArgs: 1, distElWise: true }),
	asinh: entry({ fn: asinh, minArgs: 1, maxArgs: 1, distElWise: true }),
	atanh: entry({ fn: atanh, minArgs: 1, maxArgs: 1, distElWise: true }),
	asech: entry({ fn: asech, minArgs: 1, maxArgs: 1, distElWise: true }),
	acsch: entry({ fn: acsch, minArgs: 1, maxArgs: 1, distElWise: true }),
	acoth: entry({ fn: acoth, minArgs: 1, maxArgs: 1, distElWise: true }),

	// Math
	abs: entry({ fn: abs, minArgs: 1, maxArgs: 1, distElWise: true }),
	sqrt: entry({ fn: sqrt, minArgs: 1, maxArgs: 1, distElWise: true }),
	nthroot: entry({ fn: nthroot, minArgs: 2, maxArgs: 2, distElWise: true }),
	cbrt: entry({ fn: cbrt, minArgs: 1, maxArgs: 1, distElWise: true }),
	subst: entry({ fn: subst, minArgs: 3, maxArgs: 3, distElWise: true }),
	log: entry({ fn: log, minArgs: 1, maxArgs: 2, distElWise: true }),
	exp: entry({ fn: exp, minArgs: 1, maxArgs: 1, distElWise: true }),
	erf: entry({ fn: erf, minArgs: 1, maxArgs: 1, distElWise: true }),
	erfc: entry({ fn: erfc, minArgs: 1, maxArgs: 1, distElWise: true }),
	gamma: entry({ fn: gamma, minArgs: 1, maxArgs: 1, distElWise: true }),
	[DIRAC]: entry({ fn: dirac, minArgs: 1, maxArgs: 1, distElWise: true }),
	[HEAVISIDE]: entry({ fn: heaviside, minArgs: 1, maxArgs: 1, distElWise: true }),
	hypot: entry({ fn: hypot, minArgs: 2, maxArgs: 2, distElWise: true }),
	[FACTORIAL]: entry({ fn: factorial, minArgs: 1, maxArgs: 1, distElWise: true }),
	factorial: entry({ fn: factorial, minArgs: 1, maxArgs: 1, distElWise: true }),
	[DOUBLE_FACTORIAL]: entry({ fn: doubleFactorial, minArgs: 1, maxArgs: 1, distElWise: true }),
	expand: entry({ fn: expand, minArgs: 1, maxArgs: 1, distElWise: true }),

	numeric: entry({
		fn: numeric,
		minArgs: 1,
		maxArgs: 2,
		equationArgs: [0],
		distElWise: false,
		deferArguments: true,
	}),
	round: entry({ fn: round, minArgs: 1, maxArgs: 2, distElWise: true }),
	sign: entry({ fn: sign, minArgs: 1, maxArgs: 1, distElWise: true }),
	floor: entry({ fn: floor, minArgs: 1, maxArgs: 1, distElWise: true }),
	ceil: entry({ fn: ceiling, minArgs: 1, maxArgs: 1, distElWise: true }),
	ceiling: entry({ fn: ceiling, minArgs: 1, maxArgs: 1, distElWise: true }),
	trunc: entry({ fn: trunc, minArgs: 1, maxArgs: 1, distElWise: true }),
	mod: entry({ fn: mod, minArgs: 2, maxArgs: 2, distElWise: true }),
	modinv: entry({ fn: modInv, minArgs: 2, maxArgs: 2, distElWise: true }),
	parens: entry({ fn: parens, minArgs: 1, maxArgs: 1, distElWise: true }),
	count: entry({ fn: count, minArgs: 1, maxArgs: 1, distElWise: false }),
	size: entry({ fn: size, minArgs: 1, maxArgs: 1, distElWise: false }),
	contains: entry({ fn: contains, minArgs: 2, maxArgs: 2, distElWise: false }),
	max: entry({ fn: max, minArgs: 2, maxArgs: -1, distElWise: true }),
	min: entry({ fn: min, minArgs: 2, maxArgs: -1, distElWise: true }),

	// Complex
	imagpart: entry({ fn: imagPart, minArgs: 1, maxArgs: 1, distElWise: true }),
	realpart: entry({ fn: realPart, minArgs: 1, maxArgs: 1, distElWise: true }),
	polarform: entry({ fn: polarForm, minArgs: 1, maxArgs: 1, distElWise: true }),
	rectform: entry({ fn: rectForm, minArgs: 1, maxArgs: 1, distElWise: true }),
	arg: entry({ fn: arg, minArgs: 1, maxArgs: 1, distElWise: true }),
	csgn: entry({ fn: csgn, minArgs: 1, maxArgs: 1, distElWise: true }),
	conjugate: entry({ fn: conjugate, minArgs: 1, maxArgs: 1, distElWise: true }),

	// Matrices and Vector
	matrix: entry({ fn: matrix, minArgs: 1, maxArgs: -1, distElWise: false }),
	imatrix: entry({ fn: imatrix, minArgs: 1, maxArgs: 1, distElWise: false }),
	determinant: entry({ fn: determinant, minArgs: 1, maxArgs: 1, distElWise: false }),
	transpose: entry({ fn: (M: Matrix) => M.transpose(), minArgs: 1, maxArgs: 1, distElWise: false }),
	augment: entry({ fn: (M: Matrix, N: Matrix) => M.augment(N), minArgs: 2, maxArgs: 2, distElWise: false }),
	rref: entry({ fn: (M: Matrix, prime?: Expression) => M.rref(prime), minArgs: 1, maxArgs: 2, distElWise: false }),
	nullspace: entry({ fn: nullspace, minArgs: 1, maxArgs: 2, distElWise: false }),
	dot: entry({ fn: dot, minArgs: 2, maxArgs: 2, distElWise: false }),
	cross: entry({ fn: cross, minArgs: 2, maxArgs: 2, distElWise: false }),

	// Polynomials
	deg: entry({ fn: deg, minArgs: 1, maxArgs: 2, distElWise: true }),
	content: entry({ fn: content, minArgs: 1, maxArgs: 1, distElWise: true }),
	div: entry({ fn: polynomialDiv, minArgs: 2, maxArgs: 2, distElWise: false }),
	divide: entry({ fn: polynomialDivide, minArgs: 2, maxArgs: 2, distElWise: false }),

	// Calculus
	diff: entry({ fn: parserDiff, minArgs: 1, maxArgs: 3, equationArgs: [0], distElWise: true }),
	integrate: entry({ fn: parserIntegrate, minArgs: 1, maxArgs: 2, equationArgs: [0], distElWise: true }),
	limit: entry({ fn: parserLimit, minArgs: 3, maxArgs: 4, distElWise: true }),
	laplace: entry({ fn: laplace, minArgs: 3, maxArgs: 3, distElWise: true }),
	ilaplace: entry({ fn: ilaplace, minArgs: 3, maxArgs: 3, distElWise: true }),
	sum: entry({ fn: sum, minArgs: 4, maxArgs: 4, distElWise: true }),
	product: entry({ fn: product, minArgs: 4, maxArgs: 4, distElWise: true }),
	defint: entry({ fn: defint, minArgs: 4, maxArgs: 4, distElWise: true }),
	[FRESNEL_S]: entry({ fn: S, minArgs: 1, maxArgs: 1, distElWise: true }),
	[FRESNEL_C]: entry({ fn: C, minArgs: 1, maxArgs: 1, distElWise: true }),

	// Algebra
	polyfactors: entry({ fn: polyFactors, minArgs: 1, maxArgs: 1, distElWise: false }),
	factor: entry({ fn: factor, minArgs: 1, maxArgs: 1, distElWise: true }),
	simplify: entry({ fn: simplify, minArgs: 1, maxArgs: 1, distElWise: true }),
	partfrac: entry({ fn: partfrac, minArgs: 1, maxArgs: 2, distElWise: true }),
	gcd: entry({ fn: gcd, minArgs: 2, maxArgs: 2, distElWise: true }),
	lcm: entry({ fn: lcm, minArgs: 2, maxArgs: 2, distElWise: true }),
	groebner: entry({ fn: groebner, minArgs: 1, maxArgs: 2, distElWise: false }),
	sqcomp: entry({ fn: parserSqcomp, minArgs: 1, maxArgs: 2, distElWise: true }),

	// Solver
	solve: entry({ fn: solve, minArgs: 2, maxArgs: 2, equationArgs: [0], distElWise: false }),
	solveeqs: entry({ fn: solveSystem, minArgs: 1, maxArgs: 1, distElWise: false }),

	// Assumptions and Sets
	assume: entry({ fn: assuming, minArgs: 1, maxArgs: 1, distElWise: false }),
	forget: entry({ fn: forget, minArgs: 1, maxArgs: 1, distElWise: false }),
	unassign: entry({ fn: unassign, minArgs: 1, maxArgs: 1, distElWise: false, deferArguments: true }),

	// Parser scripting
	evaluate: entry({
		fn: evaluate,
		minArgs: 1,
		maxArgs: 3,
		equationArgs: [0],
		distElWise: false,
		deferArguments: true,
		usage: 'scripting',
	}),
	return: entry({
		fn: RETURN,
		minArgs: 1,
		maxArgs: 1,
		equationArgs: [0],
		distElWise: false,
		bracketlessStatement: true,
		usage: 'scripting',
	}),
	break: entry({ fn: BREAK, minArgs: 0, maxArgs: 0, distElWise: false, usage: 'scripting' }),
	continue: entry({ fn: CONTINUE, minArgs: 0, maxArgs: 0, distElWise: false, usage: 'scripting' }),
	and: entry({ fn: AND, minArgs: 2, maxArgs: -1, distElWise: false, deferArguments: true, usage: 'scripting' }),
	or: entry({ fn: OR, minArgs: 2, maxArgs: -1, distElWise: false, deferArguments: true, usage: 'scripting' }),
	not: entry({ fn: NOT, minArgs: 1, maxArgs: 1, distElWise: false, usage: 'scripting' }),
	xor: entry({ fn: XOR, minArgs: 2, maxArgs: -1, distElWise: false, usage: 'scripting' }),
	iferror: entry({ fn: IFERROR, minArgs: 2, maxArgs: 2, distElWise: false, deferArguments: true, usage: 'scripting' }),
	iserror: entry({ fn: ISERROR, minArgs: 1, maxArgs: 1, distElWise: false, deferArguments: true, usage: 'scripting' }),
	if: entry({ fn: IF, minArgs: 2, maxArgs: 3, distElWise: false, deferArguments: true, usage: 'scripting' }),
	while: entry({ fn: WHILE, minArgs: 2, maxArgs: 2, distElWise: false, deferArguments: true, usage: 'scripting' }),
	for: entry({ fn: FOR, minArgs: 4, maxArgs: 4, distElWise: false, deferArguments: true, usage: 'scripting' }),
	each: entry({ fn: parserEach, minArgs: 3, maxArgs: 3, distElWise: false, deferArguments: true, usage: 'scripting' }),
	let: entry({
		fn: LET,
		minArgs: 3,
		maxArgs: -1,
		distElWise: false,
		deferArguments: true,
		normalizeDeferredArguments: normalizeLetArguments,
		returnBoundary: true,
		usage: 'scripting',
	}),
	block: entry({
		fn: BLOCK,
		minArgs: -1,
		maxArgs: -1,
		distElWise: false,
		deferArguments: true,
		returnBoundary: true,
		usage: 'scripting',
	}),

	// Special
	isprime: entry({ fn: isprime, minArgs: 1, maxArgs: 1, distElWise: true }),
	fib: entry({ fn: fibonacci, minArgs: 1, maxArgs: 1, distElWise: true }),
	sinc: entry({ fn: sinc, minArgs: 1, maxArgs: 1, distElWise: true }),
	Shi: entry({ fn: Shi, minArgs: 1, maxArgs: 1, distElWise: true }),
	Si: entry({ fn: Si, minArgs: 1, maxArgs: 1, distElWise: true }),
	Chi: entry({ fn: Chi, minArgs: 1, maxArgs: 1, distElWise: true }),
	Ci: entry({ fn: Ci, minArgs: 1, maxArgs: 1, distElWise: true }),
	Ei: entry({ fn: Ei, minArgs: 1, maxArgs: 1, distElWise: true }),
	[LI]: entry({ fn: Li, minArgs: 1, maxArgs: 1, distElWise: true }),
};


