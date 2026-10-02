/**
 * Core Nerdamer object model and shared public types.
 *
 * Import from `nerdamer/core` when working directly with Nerdamer values rather
 * than through the callable compatibility root.
 */
import { build } from '../core/functions/build';

import type { ExpressionInput } from '../core/types';

export { Equation } from '../core/classes/equation/Equation';
export { CoeffObject } from '../core/classes/expression/CoeffObject';
export { Expression } from '../core/classes/expression/Expression';
export type { ElementsSortType } from '../core/classes/expression/Expression';
export { symbols } from '../core/classes/expression/shortcuts';
export type {
	JsFunction,
	OptionValue,
	OptionsObject,
	ParserConstants,
	ParserValuesObject,
	TextOptions,
} from '../core/classes/parser/types';
export { Rational } from '../core/classes/rational/Rational';
export { Converter } from '../core/converters/Converter';

export {
	AssignmentError,
	DimensionError,
	DivisionByZeroError,
	MathError,
	MissingReferenceError,
	NaNError,
	NotImplementedError,
	OperatorError,
	ParserError,
	ParserSyntaxError,
	PolynomialError,
	UndefinedError,
	UnexpectedDataType,
	UnexpectedInputError,
	UnexpectedTokenError,
	UnsupportedOperationError,
	ZeroToZeroPowerError,
} from '../core/errors';
/**
 * Compiles an expression into a native JavaScript-number function for repeated evaluation.
 *
 * @remarks
 * Function calls are linked to Nerdamer's numerical implementations, including any dependencies
 * they require. The compiler supports scalar JavaScript-number arithmetic rather than Nerdamer's
 * full symbolic or structured value model. Symbolic-only operations such as indexed sums,
 * products, solvers, and matrix operations are rejected if they remain in the expression.
 *
 * `buildFunction` uses `new Function`, so it may be unavailable under a Content Security Policy
 * that forbids dynamic JavaScript evaluation. When `argsArray` is omitted, free variables are
 * sorted alphabetically.
 *
 * @param x - The expression to compile.
 * @param argsArray - Variable names in the positional order expected by the compiled function.
 * @returns The compiled JavaScript-number function.
 * @throws {@link core!UnsupportedOperationError} If the expression contains the imaginary unit or a
 * function for which no matching JavaScript-number implementation is registered.
 *
 * @example
 * ```ts
 * buildFunction('x-y')(9, 7);                // 2
 * buildFunction('x-y', ['y', 'x'])(9, 7);    // -2
 * buildFunction('erf(x)+2')(9);              // 3
 * ```
 */
export const buildFunction: (
	x: ExpressionInput,
	argsArray?: string[]
) => (...args: number[]) => number = build;

export type {
	ExpressionInput,
	NerdamerInput,
	ParserEntity,
	StructuredEntityType,
} from '../core/types';
