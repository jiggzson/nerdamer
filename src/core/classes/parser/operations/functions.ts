import { factorial, doubleFactorial } from '../../../../math/math';
import { isEnumerable } from '../../../common/functions/structuredEntityUtils';
import { mathFunctionRegistry } from '../../../dispatch';
import {
	DimensionError,
	message,
	ParserError,
	UnexpectedDataType,
	UnexpectedInputError,
	UnsupportedOperationError,
} from '../../../errors';
import { setFunction } from '../../../functions/setFunction';
import { Settings } from '../../../Settings';
import {
	assertEQ,
	assertGT,
	assertGTE,
	assertLT,
	assertLTE,
} from '../../assumption/assertiveFunctions';
import { Collection } from '../../collection/Collection';
import { Equation } from '../../equation/Equation';
import { Expression } from '../../expression/Expression';
import { assertPlainVariableAndGetString } from '../../expression/utils';
import { Matrix } from '../../matrix/Matrix';
import { Vector } from '../../vector/Vector';
import { dataTypes } from '../constants';
import { parserReturnBoundary } from '../scripting/controlFlow';
import { wrappedFunction } from '../scripting/functions';
import { assign } from '../scripting/scope';

import { add, addPrefix } from './add';
import { comma } from './comma';
import { divide } from './divide';
import { multiply } from './multiply';
import { power } from './power';
import { subtract, subtractPrefix } from './subtract';

import type {
	BinaryArithmeticOperation,
	ComparisonOperation,
} from '../../../common/common';
import type { RegisteredMathFunction } from '../../../dispatch';
import type { ExpressionInput } from '../../../types';
import type { ParserEntity } from '../../../types';
import type {
	Operation,
	PreFixFunction,
	PostFixFunction,
	EquationConstructorCall,
	CommaOperation,
	DeferredFunctionArgument,
	DeferredOperation,
} from '../types';

/**
 * Invokes a function selected dynamically from the dispatch table. Registered functions do
 * not share one parameter signature, so the parser cannot verify the argument types after
 * resolving a function name at runtime. Arity has already been validated by `callFunction`.
 */

function invokeMathFunction(
	fn: RegisteredMathFunction,
	args: (ParserEntity | DeferredFunctionArgument)[]
): ParserEntity {
	const callable = fn as (...inputs: (ParserEntity | DeferredFunctionArgument)[]) => ParserEntity;
	return callable(...args);
}

/**
 * The wrapper used to call functions within the parser.
 *
 * @param functionName The name of the function being called
 * @param args
 * @returns
 */
export function callFunction(
	functionName: string,
	args: (ParserEntity | DeferredFunctionArgument)[]
) {
	// An empty parser argument scope currently resolves to undefined. Normalize that internal
	// sentinel before arity validation so registered zero-argument functions receive no arguments.
	if (args.length === 1 && args[0] === undefined) {
		args = [];
	}

	// The details regarding the function
	const attributes = mathFunctionRegistry[functionName];

	if (attributes === undefined) {
		throw new ParserError(`Unsupported function ${functionName}`);
	}

	const {
		fn,
		minArgs,
		maxArgs,
		maxPrecision,
		equationArgs,
		distElWise,
		deferArguments,
		returnBoundary,
	} = attributes;

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

	let result: ParserEntity;
	if (deferArguments) {
		// Deferred functions own the timing and frequency of argument evaluation.
		const invoke = () => invokeMathFunction(fn, args);
		result = returnBoundary ? parserReturnBoundary(invoke) : invoke();
	} else {
		const entityArgs: ParserEntity[] = [];
		for (const arg of args) {
			if (typeof arg === 'function') {
				throw new ParserError(message('malformedExpression'));
			}
			entityArgs.push(arg);
		}

		// A structured entity carrying symbolic bracket access represents one unresolved
		// scalar value. Normalize it before equation checks, distribution, or invocation.
		const normalizedArgs = entityArgs.map(arg => Expression.fromSymbolicAccess(arg) ?? arg);

		if (attributes.level === 'system') {
			for (let i = 0; i < normalizedArgs.length; i++) {
				if (Equation.isEquation(normalizedArgs[i]) && !equationArgs?.includes(i)) {
					throw new UnexpectedDataType(
						message('expressionExpected', { type: 'Equation' })
					);
				}
			}
		}

		const elementWiseArgs: (Vector | Matrix)[] = distElWise
			? normalizedArgs.filter(
				(arg): arg is Vector | Matrix => Vector.isVector(arg) || Matrix.isMatrix(arg)
			)
			: [];

		if (elementWiseArgs.length > 0) {
			const structure = elementWiseArgs[0];

			for (const arg of elementWiseArgs) {
				let dimensionsMatch: boolean;
				if (Vector.isVector(structure)) {
					dimensionsMatch = Vector.isVector(arg) && structure.count() === arg.count();
				} else {
					dimensionsMatch = Matrix.isMatrix(arg) && structure.dimensionsMatch(arg);
				}

				if (!dimensionsMatch) {
					throw new DimensionError(
						message('mismatchedDimensions', { function: functionName })
					);
				}
			}

			result = distribute(
				(_element, i, j) => {
					const scalarArgs = normalizedArgs.map(arg => {
						let scalarArg = arg;
						if (Vector.isVector(arg)) {
							scalarArg = arg.__get__([i]);
						} else if (Matrix.isMatrix(arg)) {
							scalarArg = arg.get(i, j as number);
						}
						return scalarArg;
					});
					return callFunction(functionName, scalarArgs);
				},
				structure
			);
		}
		// Call and return
		else if (!fn || Settings.DEFER_SIMPLIFICATION) {
			result = Expression.toFunction(functionName, normalizedArgs);
		} else {
			result = invokeMathFunction(fn, normalizedArgs);
		}

		// Ensure that this function always returns even if it's a symbolic function. This will
		// occur if the function didn't return a value.
		if (!result) {
			result = Expression.toFunction(functionName, normalizedArgs as Expression[]);
		}
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
	| DeferredOperation
	| PreFixFunction
	| PostFixFunction
	| EquationConstructorCall
	| CommaOperation;
} = {
	plus: add as Operation,
	minus: subtract as Operation,
	times: multiply as Operation,
	div: divide as Operation,
	pow: power as Operation,
	mod: modulo as Operation,
	percent: percentage as PostFixFunction,
	// ASSERTIVE FUNCTIONS
	assertEQ: assertEQ as Operation,
	assertGT: assertGT as Operation,
	assertGTE: assertGTE as Operation,
	assertLT: assertLT as Operation,
	assertLTE: assertLTE as Operation,
	comma: comma,
	assign: assign as Operation,
	functionAssign: functionAssign as DeferredOperation,
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
};

/**
 * Applies a scalar function over a copied Vector or Matrix while preserving its shape.
 * Matrix cells must remain Expressions because Matrix does not permit aggregate elements.
 */
export function distribute(
	fn: (v: ParserEntity, i: number, j?: number) => ParserEntity,
	structure: Vector | Matrix
): Vector | Matrix {
	let retval: Vector | Matrix;

	if (Vector.isVector(structure)) {
		retval = structure.copy().each((v, i) => {
			return fn(v, i);
		});
	} else {
		retval = structure.copy().each((v, i, j) => {
			const result = fn(v, Number(i), Number(j));
			if (!Expression.isExpression(result)) {
				throw new UnexpectedDataType(
					message('expressionExpected', { type: dataTypes[result.dataType] })
				);
			}
			return result;
		});
	}

	return retval;
}

/**
 * Set's one expression equal to the other
 * @param a
 * @param b
 * @returns
 */
export function setEqual(a: ParserEntity, b: ParserEntity) {
	if (!(Expression.isExpression(a) || Expression.isExpression(b))) {
		throw new UnsupportedOperationError(message('unsupportedOperation'));
	}
	return new Equation(a as Expression, b as Expression);
}

/**
 * Registers a symbolic function from a deferred declaration body.
 *
 * The parser preserves the declaration as the parameter expressions followed by
 * the function name. Each part of the signature must remain a plain variable. The
 * right-hand callback owns compiled parser RPN and is executed only when the registered
 * function is called.
 *
 * @param a - Deferred function signature.
 * @param body - Deferred symbolic function body.
 * @returns The registered function signature.
 */
export function functionAssign(
	a: ParserEntity,
	body: DeferredFunctionArgument
): ParserEntity {
	if (!Collection.isCollection(a)) {
		throw new UnexpectedInputError(`Invalid function declaration ${a.text()}.`);
	}

	const signature = [...a.getElements()];
	const functionExpression = signature.pop();

	if (!Expression.isExpression(functionExpression)) {
		throw new UnexpectedInputError(`Invalid function declaration ${a.text()}.`);
	}

	const name = assertPlainVariableAndGetString(functionExpression);
	const args = signature.map(argument => {
		if (!Expression.isExpression(argument)) {
			throw new UnexpectedInputError(
				message('plainVariableExpected', { input: argument.text() })
			);
		}
		return assertPlainVariableAndGetString(argument);
	});

	setFunction({
		type: 'symbolic',
		name,
		minArgs: args.length,
		maxArgs: args.length,
		fn: wrappedFunction(body, args),
	});

	return Expression.toFunction(
		name,
		args.map(argument => Expression.Variable(argument))
	);
}

/**
 * Returns 1 if two values are equal otherwise 0
 * @param a
 * @param b
 * @returns
 */
function eq(a: ParserEntity, b: ParserEntity) {
	return Expression.create(Number(a.eq(b)));
}

/**
 * Returns 1 if a is greater than b otherwise 0
 * @param a
 * @param b
 * @returns
 */
function gt(a: ParserEntity, b: ParserEntity) {
	return Expression.create(Number(a.gt(b)));
}

/**
 * Returns 1 if a is less than b otherwise 0
 * @param a
 * @param b
 * @returns
 */
function lt(a: ParserEntity, b: ParserEntity) {
	return Expression.create(Number(a.lt(b)));
}

/**
 * Computes the remainder for the parser's infix `%` operator.
 *
 * The symbolic implementation already lives on {@link Expression.mod}; this adapter keeps
 * operator dispatch in the same parser layer as the other arithmetic operations.
 */
function modulo(a: ParserEntity, b: ParserEntity) {
	if (!Expression.isExpression(a) || !Expression.isExpression(b)) {
		throw new UnsupportedOperationError(message('unsupportedOperation'));
	}
	return a.mod(b);
}

/**
 * Converts an expression from percentage notation to its exact fractional value.
 */
function percentage(a: ParserEntity) {
	if (!Expression.isExpression(a)) {
		throw new UnsupportedOperationError(message('unsupportedOperation'));
	}
	const retval = a.div(100);
	return retval;
}

/**
 * Returns 1 if a is greater than or equal to b otherwise 0
 * @param a
 * @param b
 * @returns
 */
function gte(a: ParserEntity, b: ParserEntity) {
	return Expression.create(Number(a.gte(b)));
}

/**
 * Returns 1 if a is less than or equal to b otherwise 0
 * @param a
 * @param b
 * @returns
 */
function lte(a: ParserEntity, b: ParserEntity) {
	return Expression.create(Number(a.lte(b)));
}

type RoutedOperation = BinaryArithmeticOperation | ComparisonOperation;
type DynamicOperation = (operand: ParserEntity) => ParserEntity | boolean;
type DynamicOperationTarget = Partial<Record<string, DynamicOperation>>;

interface RoutedTarget {
	div(x: ParserEntity): ParserEntity;
	eq(x: ParserEntity): boolean;
	gt(x: ParserEntity): boolean;
	gte(x: ParserEntity): boolean;
	lt(x: ParserEntity): boolean;
	lte(x: ParserEntity): boolean;
	minus(x: ParserEntity): ParserEntity;
	plus(x: ParserEntity): ParserEntity;
	pow(x: ParserEntity): ParserEntity;
	times(x: ParserEntity): ParserEntity;
}

function isRoutedOperation(operation: string): operation is RoutedOperation {
	return (
		operation === 'pow' ||
		operation === 'times' ||
		operation === 'div' ||
		operation === 'minus' ||
		operation === 'plus' ||
		operation === 'eq' ||
		operation === 'lt' ||
		operation === 'lte' ||
		operation === 'gt' ||
		operation === 'gte'
	);
}

function routeOperation(
	target: RoutedTarget,
	operand: ParserEntity,
	operation: RoutedOperation
): ParserEntity {
	const retval = target[operation](operand);
	return typeof retval === 'boolean' ? Expression.create(Number(retval)) : retval;
}

function dispatchDynamicOperation(
	a: ParserEntity,
	b: ParserEntity,
	operation: string
): ParserEntity {
	// Preserve the parser's historically loose dispatch for operator actions outside
	// RoutedOperation. Tightening these actions may change existing runtime behavior.
	const useA = a.isEnumerable || Equation.isEquation(a);
	const target = useA ? a : b;
	const operand = useA ? b : a;
	const dynamicTarget = target as unknown as DynamicOperationTarget;
	const dynamicOperation = dynamicTarget[operation];

	if (!dynamicOperation) {
		throw new UnsupportedOperationError(message('unsupportedOperation'));
	}

	const retval: ParserEntity | boolean = dynamicOperation.call(target, operand);

	// Wrap booleans since those are used both inside and outside of the parser
	return typeof retval === 'boolean' ? Expression.create(Number(retval)) : retval;
}

export function route(
	a: ParserEntity,
	b: ParserEntity,
	operation: string
): ParserEntity | ReturnType<typeof comma> {
	let retval: ParserEntity | ReturnType<typeof comma>;

	if (operation === 'assign') {
		retval = assign(a as unknown as ExpressionInput, b);
	} else if (operation === 'comma') {
		retval = comma(a, b);
	} else if (operation === 'in') {
		// Membership is the infix form of contains(container, value), so reverse the operands.
		retval = callFunction('contains', [b, a]);
	} else if (isRoutedOperation(operation)) {
		if (Equation.isEquation(a) || Equation.isEquation(b)) {
			if (Equation.isEquation(a) && Equation.isEquation(b)) {
				if (['eq', 'lt', 'lte', 'gt', 'gte'].includes(operation)) {
					retval = dispatchDynamicOperation(a, b, operation);
				} else {
					throw new UnsupportedOperationError(message('unsupportedOperation'));
				}
			} else if (Equation.isEquation(a)) {
				if (['plus', 'minus', 'times', 'div'].includes(operation)) {
					retval = dispatchDynamicOperation(a, b, operation);
				} else {
					throw new UnsupportedOperationError(message('unsupportedOperation'));
				}
			} else if (operation === 'plus' || operation === 'times') {
				retval = dispatchDynamicOperation(a, b, operation);
			} else {
				throw new UnsupportedOperationError(message('unsupportedOperation'));
			}
		} else if (isEnumerable(a)) {
			retval = routeOperation(a, b, operation);
		} else if (
			(Vector.isVector(b) || Matrix.isMatrix(b)) &&
			(operation === 'minus' || operation === 'div' || operation === 'pow')
		) {
			// Scalar-left operations are not commutative. Preserve operand order while
			// distributing the operation over the structured right-hand operand.
			if (!Expression.isExpression(a)) {
				throw new UnsupportedOperationError(message('unsupportedOperation'));
			}

			// A scalar base with a Matrix exponent is a matrix-function question. It must
			// not be reversed into Matrix.pow() or silently treated as element-wise power.
			if (Matrix.isMatrix(b) && operation === 'pow') {
				throw new UnsupportedOperationError(message('unsupportedOperation'));
			}

			retval = distribute(element => {
				let elementResult: ParserEntity;
				if (Expression.isExpression(element)) {
					if (operation === 'minus') {
						elementResult = subtract(a, element);
					} else if (operation === 'div') {
						elementResult = divide(a, element);
					} else {
						elementResult = power(a, element);
					}
				} else {
					const nestedResult = route(a, element, operation);
					if (Array.isArray(nestedResult)) {
						throw new UnsupportedOperationError(message('unsupportedOperation'));
					}
					elementResult = nestedResult;
				}
				return elementResult;
			}, b);
		} else if (isEnumerable(b)) {
			retval = routeOperation(b, a, operation);
		} else {
			retval = dispatchDynamicOperation(a, b, operation);
		}
	} else {
		retval = dispatchDynamicOperation(a, b, operation);
	}

	return retval;
}