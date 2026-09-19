/**
 * Core Nerdamer object model and shared public types.
 *
 * Import from `nerdamer/core` when working directly with Nerdamer values rather
 * than through the callable compatibility root.
 */
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
export { build as buildFunction } from '../core/functions/build';

export type {
	ExpressionInput,
	NerdamerInput,
	ParserEntity,
	StructuredEntityType,
} from '../core/types';
