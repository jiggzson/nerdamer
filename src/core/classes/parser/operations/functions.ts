import { factorial, doubleFactorial } from '../../../../math/math';
import { mathFunctions } from '../../../dispatch';
import {
	AssignmentError,
	message,
	ParserError,
	UnexpectedInputError,
	UnsupportedOperationError,
} from '../../../errors';
import { RESTRICTED, Settings } from '../../../Settings';
import {
	assertEQ,
	assertGT,
	assertGTE,
	assertLT,
	assertLTE,
} from '../../assumption/assertiveFunctions';
import { Equation } from '../../equation/Equation';
import { Expression } from '../../expression/Expression';
import { assertPlainVariableAndGetString } from '../../expression/utils';
import { Parser } from '../Parser';

import { add, addPrefix } from './add';
import { comma } from './comma';
import { divide } from './divide';
import { multiply } from './multiply';
import { power } from './power';
import { subtract, subtractPrefix } from './subtract';

import type { Vector } from '../../vector/Vector';
import type {
	ParserFunctionCall,
	Operation,
	PreFixFunction,
	PostFixFunction,
	EquationConstructorCall,
	ExpressionInputType,
} from '../types';
import type { ParserInputType } from '../types';

/**
 * The wrapper used to call functions within the parser.
 *
 * @param functionName The name of the function being called
 * @param args
 * @returns
 */
export function callFunction(functionName: string, args: ParserInputType[]) {
	// The details regarding the function
	const attributes = mathFunctions[functionName];

	if (attributes === undefined) {
		throw new ParserError(`Unsupported function ${functionName}`);
	}

	const { fn, minArgs, maxArgs, maxPrecision } = attributes;

	// Complain if the number of arguments provided is less that what is allowed
	if (minArgs > -1 && args.length < minArgs) {
		throw new ParserError(
			`${functionName} requires a minimum of ${minArgs} arguments but ${args.length} provided!`
		);
	}

	// Complain if the number of arguments provided is greater than what is allowed
	if (maxArgs > -1 && args.length > maxArgs) {
		throw new ParserError(
			`${functionName} allows a maximum of ${maxArgs} arguments but ${args.length} provided!`
		);
	}

	let result: ParserInputType;
	// Call and return
	if (!fn || Settings.DEFER_SIMPLIFICATION) {
		result = Expression.toFunction(functionName, args as Expression[]);
	} else {
		result = fn.apply(fn, args);
	}

	// Ensure that this function always returns even if it's a symbolic function. This will
	// occur if the function didn't return a value.
	if (!result) {
		result = Expression.toFunction(functionName, args as Expression[]);
	}

	// Let all future calls know that an inferior precision was used.
	if (maxPrecision) {
		result.precision = maxPrecision;
	}

	return result;
}
/**
 * Combines all base operations into one object for parser.
 */
export const _: {
	[functionName: string]:
		| Operation
		| ParserFunctionCall
		| PreFixFunction
		| PostFixFunction
		| EquationConstructorCall;
} = {
	plus: add as Operation,
	minus: subtract as Operation,
	times: multiply as Operation,
	div: divide as Operation,
	pow: power as Operation,
	// ASSERTIVE FUNCTIONS
	assertEQ: assertEQ as Operation,
	assertGT: assertGT as Operation,
	assertGTE: assertGTE as Operation,
	assertLT: assertLT as Operation,
	assertLTE: assertLTE as Operation,
	// mod: mod,
	//@ts-expect-error bump
	comma: comma as Operation,
	assign: assign as Operation,
	// functionAssign: functionAssign,
	setEqual: setEqual,
	lt: lt as Operation,
	lte: lte as Operation,
	eq: eq as Operation,
	gt: gt as Operation,
	gte: gte as Operation,
	minusPrefix: subtractPrefix as PreFixFunction,
	plusPrefix: addPrefix as PreFixFunction,
	factorial: factorial as PostFixFunction,
	doubleFactorial: doubleFactorial as PostFixFunction,

	// dot: dot,
	// IN: IN,
	// Function caller
	callFunction: callFunction as ParserFunctionCall,
};

export function distribute(fn: (v: ParserInputType) => ParserInputType, vector: Vector) {
	const retval = vector.each(v => {
		return fn(v);
	});

	return retval;
}

/**
 * Set's one expression equal to the other
 * @param a
 * @param b
 * @returns
 */
export function setEqual(a: ParserInputType, b: ParserInputType) {
	if (!(a instanceof Expression || b instanceof Expression)) {
		throw new UnsupportedOperationError(message('unsupportedOperation'));
	}
	return new Equation(a as Expression, b as Expression);
}

/**
 * Adds a known value to a variable in the parser
 * @param a
 * @param b
 */
export function assign(a: ExpressionInputType, b: ParserInputType | string) {
	a = Expression.create(a);

	if (typeof b === 'string') {
		b = Parser.parse(b);
	}

	// We can only assign to plain variables
	if (Expression.isExpression(a) && !a.isPlainVariable()) {
		throw new UnexpectedInputError(message('plainVariableExpected', { input: String(a) }));
	}

	// We cannot assign to restricted values
	if (RESTRICTED.includes(a.value)) {
		throw new AssignmentError(message('restrictedVariableName', { name: a.value }));
	}

	Parser.KNOWN_VALUES[a.value] = b;
	return b;
}

/**
 * Used to unassign a known value in the parser.
 * @param x
 */
export function unassign(x: Expression | string): Expression {
	let v: string;
	if (Expression.isExpression(x)) {
		v = assertPlainVariableAndGetString(x);
	} else {
		v = x;
	}

	delete Parser.KNOWN_VALUES[v];
	return Expression.create(x);
}

/**
 * Returns 1 if two values are equal otherwise 0
 * @param a
 * @param b
 * @returns
 */
function eq(a: ParserInputType, b: ParserInputType) {
	return Expression.create(Number(a.eq(b)));
}

/**
 * Returns 1 if a is greater than b otherwise 0
 * @param a
 * @param b
 * @returns
 */
function gt(a: ParserInputType, b: ParserInputType) {
	return Expression.create(Number(a.gt(b)));
}

/**
 * Returns 1 if a is less than b otherwise 0
 * @param a
 * @param b
 * @returns
 */
function lt(a: ParserInputType, b: ParserInputType) {
	return Expression.create(Number(a.lt(b)));
}

/**
 * Returns 1 if a is greater than or equal to b otherwise 0
 * @param a
 * @param b
 * @returns
 */
function gte(a: ParserInputType, b: ParserInputType) {
	return Expression.create(Number(a.gte(b)));
}

/**
 * Returns 1 if a is less than or equal to b otherwise 0
 * @param a
 * @param b
 * @returns
 */
function lte(a: ParserInputType, b: ParserInputType) {
	return Expression.create(Number(a.lte(b)));
}

export function route(a: ParserInputType, b: ParserInputType, operation: string) {
	switch (operation) {
		case 'assign':
			return assign(a as unknown as ExpressionInputType, b);
		case 'comma':
			return comma(a, b);
		case 'pow':
		case 'minus':
			if (a.isEnumerable) {
				return a[operation](b);
			}
		// NOTE that this is loosely defined on purpose as it would blow up badly.
		// This may have to be buttoned up at some point in the future.
		// The actions that allowed to fall through are commutative.
		default: {
			if (a.isEnumerable) {
				const retval = a[operation](b) as ParserInputType;
				// Wrap booleans since those are used both inside and outside of the parser
				return typeof retval === 'boolean' ? Expression.create(Number(retval)) : retval;
			} else {
				const retval = b[operation](a) as ParserInputType;
				// Wrap booleans since those are used both inside and outside of the parser
				return typeof retval === 'boolean' ? Expression.create(Number(retval)) : retval;
			}
		}
	}
}
