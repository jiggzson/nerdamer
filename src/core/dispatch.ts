import { polyFactors, factor } from '../algebra/factor/factor';
import { gcd } from '../algebra/gcd/gcd';
import { groebner } from '../algebra/groebner';
import { partfrac } from '../algebra/partfrac';
import { simplify } from '../algebra/simplify/simplify';
import { diff } from '../calculus/derivative/diff';
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
	abs,
	erf,
	erfc,
	log,
	exp,
	gamma,
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
	defint,
	contains,
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
import { count } from '../math/utils';
import { solve } from '../solve/solve';
import { solveSystem } from '../solve/solveSystem';

import { assuming, forget } from './classes/assumption/assume';
import { determinant } from './classes/matrix/functions';
import { imatrix } from './classes/matrix/utils';
import { FACTORIAL, DOUBLE_FACTORIAL } from './classes/parser/constants';
import { RETURN, IF, BLOCK } from './classes/parser/functions';
import { unassign } from './classes/parser/operations/functions';
import { content, deg } from './classes/polynomial/functions';
import { dot, cross } from './classes/vector/functions';
import { imagPart, realPart, polarForm, rectForm, arg, csgn, conjugate } from './functions/complex';
import { expand } from './functions/expand/expand';
import { subst } from './functions/subst';

import type { ParserInputType } from './classes/parser/types';

export type MathFunction = (...args: ParserInputType[]) => ParserInputType;

export interface MathFunctionEntry {
	/** The function to be called */
	fn: MathFunction;
	/** The minimum arguments allowed. Use -1 for variadic. */
	minArgs: number;
	/** The maximum arguments allowed. Use -1 for variadic. */
	maxArgs: number;
	/** The maximum precision available for the function */
	maxPrecision?: number;
	/** Whether this function was registered at the system or user level */
	level: 'system' | 'user';
}

/**
 * Registers a system-level function in the dispatch table. The cast from a specific
 * signature to `MathFunction` is safe because `callFunction` enforces arity at
 * runtime via minArgs/maxArgs before invoking the function.
 */
function entry<F extends (...args: never[]) => ParserInputType>(opts: {
	fn: F;
	minArgs: number;
	maxArgs: number;
	maxPrecision?: number;
}): MathFunctionEntry {
	return {
		fn: opts.fn as unknown as MathFunction,
		minArgs: opts.minArgs,
		maxArgs: opts.maxArgs,
		maxPrecision: opts.maxPrecision,
		level: 'system',
	};
}

export const mathFunctions: { [functionName: string]: MathFunctionEntry } = {
	cos: entry({ fn: cos, minArgs: 1, maxArgs: 1 }),
	sin: entry({ fn: sin, minArgs: 1, maxArgs: 1 }),
	tan: entry({ fn: tan, minArgs: 1, maxArgs: 1 }),
	sec: entry({ fn: sec, minArgs: 1, maxArgs: 1 }),
	csc: entry({ fn: csc, minArgs: 1, maxArgs: 1 }),
	cot: entry({ fn: cot, minArgs: 1, maxArgs: 1 }),
	acos: entry({ fn: acos, minArgs: 1, maxArgs: 1 }),
	asin: entry({ fn: asin, minArgs: 1, maxArgs: 1 }),
	atan: entry({ fn: atan, minArgs: 1, maxArgs: 1 }),
	asec: entry({ fn: asec, minArgs: 1, maxArgs: 1 }),
	acsc: entry({ fn: acsc, minArgs: 1, maxArgs: 1 }),
	acot: entry({ fn: acot, minArgs: 1, maxArgs: 1 }),
	atan2: entry({ fn: atan2, minArgs: 2, maxArgs: 2 }),
	cosh: entry({ fn: cosh, minArgs: 1, maxArgs: 1 }),
	sinh: entry({ fn: sinh, minArgs: 1, maxArgs: 1 }),
	tanh: entry({ fn: tanh, minArgs: 1, maxArgs: 1 }),
	sech: entry({ fn: sech, minArgs: 1, maxArgs: 1 }),
	csch: entry({ fn: csch, minArgs: 1, maxArgs: 1 }),
	coth: entry({ fn: coth, minArgs: 1, maxArgs: 1 }),
	acosh: entry({ fn: acosh, minArgs: 1, maxArgs: 1 }),
	asinh: entry({ fn: asinh, minArgs: 1, maxArgs: 1 }),
	atanh: entry({ fn: atanh, minArgs: 1, maxArgs: 1 }),
	asech: entry({ fn: asech, minArgs: 1, maxArgs: 1 }),
	acsch: entry({ fn: acsch, minArgs: 1, maxArgs: 1 }),
	acoth: entry({ fn: acoth, minArgs: 1, maxArgs: 1 }),
	abs: entry({ fn: abs, minArgs: 1, maxArgs: 1 }),
	sqrt: entry({ fn: sqrt, minArgs: 1, maxArgs: 1 }),
	cbrt: entry({ fn: cbrt, minArgs: 1, maxArgs: 1 }),
	subst: entry({ fn: subst, minArgs: 3, maxArgs: 3 }),
	log: entry({ fn: log, minArgs: 1, maxArgs: 2 }),
	exp: entry({ fn: exp, minArgs: 1, maxArgs: 1 }),
	erf: entry({ fn: erf, minArgs: 1, maxArgs: 1 }),
	erfc: entry({ fn: erfc, minArgs: 1, maxArgs: 1 }),
	gamma: entry({ fn: gamma, minArgs: 1, maxArgs: 1 }),
	hypot: entry({ fn: hypot, minArgs: 2, maxArgs: 2 }),
	[FACTORIAL]: entry({ fn: factorial, minArgs: 1, maxArgs: 1 }),
	factorial: entry({ fn: factorial, minArgs: 1, maxArgs: 1 }),
	[DOUBLE_FACTORIAL]: entry({ fn: doubleFactorial, minArgs: 1, maxArgs: 1 }),
	expand: entry({ fn: expand, minArgs: 1, maxArgs: 1 }),

	round: entry({ fn: round, minArgs: 1, maxArgs: 2 }),
	sign: entry({ fn: sign, minArgs: 1, maxArgs: 1 }),
	floor: entry({ fn: floor, minArgs: 1, maxArgs: 1 }),
	ceil: entry({ fn: ceiling, minArgs: 1, maxArgs: 1 }),
	ceiling: entry({ fn: ceiling, minArgs: 1, maxArgs: 1 }),
	mod: entry({ fn: mod, minArgs: 2, maxArgs: 2 }),
	modinv: entry({ fn: modInv, minArgs: 2, maxArgs: 2 }),
	parens: entry({ fn: parens, minArgs: 1, maxArgs: 1 }),
	count: entry({ fn: count, minArgs: 1, maxArgs: 1 }),
	contains: entry({ fn: contains, minArgs: 2, maxArgs: 2 }),

	// Complex
	imagpart: entry({ fn: imagPart, minArgs: 1, maxArgs: 1 }),
	realpart: entry({ fn: realPart, minArgs: 1, maxArgs: 1 }),
	polarform: entry({ fn: polarForm, minArgs: 1, maxArgs: 1 }),
	rectform: entry({ fn: rectForm, minArgs: 1, maxArgs: 1 }),
	arg: entry({ fn: arg, minArgs: 1, maxArgs: 1 }),
	csgn: entry({ fn: csgn, minArgs: 1, maxArgs: 1 }),
	conjugate: entry({ fn: conjugate, minArgs: 1, maxArgs: 1 }),

	// Matrices and Vector
	matrix: entry({ fn: matrix, minArgs: 1, maxArgs: -1 }),
	imatrix: entry({ fn: imatrix, minArgs: 1, maxArgs: 1 }),
	determinant: entry({ fn: determinant, minArgs: 1, maxArgs: 1 }),
	dot: entry({ fn: dot, minArgs: 2, maxArgs: 2 }),
	cross: entry({ fn: cross, minArgs: 2, maxArgs: 2 }),

	// Polynomials
	deg: entry({ fn: deg, minArgs: 1, maxArgs: 1 }),
	content: entry({ fn: content, minArgs: 1, maxArgs: 1 }),

	// Calculus
	diff: entry({ fn: diff, minArgs: 1, maxArgs: 3 }),
	integrate: entry({ fn: integrate, minArgs: 1, maxArgs: 2 }),
	limit: entry({ fn: limit, minArgs: 3, maxArgs: 3 }),
	laplace: entry({ fn: laplace, minArgs: 3, maxArgs: 3 }),
	ilaplace: entry({ fn: ilaplace, minArgs: 3, maxArgs: 3 }),
	sum: entry({ fn: sum, minArgs: 4, maxArgs: 4 }),
	product: entry({ fn: product, minArgs: 4, maxArgs: 4 }),
	defint: entry({ fn: defint, minArgs: 4, maxArgs: 4 }),

	// Algebra
	polyfactors: entry({ fn: polyFactors, minArgs: 1, maxArgs: 1 }),
	factor: entry({ fn: factor, minArgs: 1, maxArgs: 1 }),
	simplify: entry({ fn: simplify, minArgs: 1, maxArgs: 1 }),
	partfrac: entry({ fn: partfrac, minArgs: 1, maxArgs: 2 }),
	gcd: entry({ fn: gcd, minArgs: 2, maxArgs: 2 }),
	groebner: entry({ fn: groebner, minArgs: 1, maxArgs: 2 }),

	// Solver
	solve: entry({ fn: solve, minArgs: 2, maxArgs: 2 }),
	solveeqs: entry({ fn: solveSystem, minArgs: 1, maxArgs: 1 }),

	// Assumptions and Sets
	assume: entry({ fn: assuming, minArgs: 1, maxArgs: 1 }),
	forget: entry({ fn: forget, minArgs: 1, maxArgs: 1 }),
	unassign: entry({ fn: unassign, minArgs: 1, maxArgs: 1 }),

	// Parser
	return: entry({ fn: RETURN, minArgs: 1, maxArgs: 1 }),
	if: entry({ fn: IF, minArgs: 3, maxArgs: 3 }),
	block: entry({ fn: BLOCK, minArgs: -1, maxArgs: -1 }),

	// Special
	sinc: entry({ fn: sinc, minArgs: 1, maxArgs: 1 }),
	Shi: entry({ fn: Shi, minArgs: 1, maxArgs: 1 }),
	Si: entry({ fn: Si, minArgs: 1, maxArgs: 1 }),
	Chi: entry({ fn: Chi, minArgs: 1, maxArgs: 1 }),
	Ci: entry({ fn: Ci, minArgs: 1, maxArgs: 1 }),
	Ei: entry({ fn: Ei, minArgs: 1, maxArgs: 1 }),
};
