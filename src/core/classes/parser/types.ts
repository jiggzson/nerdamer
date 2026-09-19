import { type Equation } from '../equation/Equation';
import { type Expression } from '../expression/Expression';

import type { NerdamerInput, ParserEntity } from '../../types';
import type { IndexedReference } from './wrappers/IndexedReference';
import type { KeyValuePair } from './wrappers/KeyValuePair';
import type Decimal from 'decimal.js';

/**
 * The type used to defined a operation function for the parser
 */
export type Operation = (a: ParserEntity, b?: ParserEntity) => ParserEntity;

/**
 * The comma operation returns both operands so the parser can place them back
 * on the output stack as separate values.
 */
export type CommaOperation = (a: ParserStackValue, b: ParserStackValue) => ParserStackValue[];

/**
 * The type used to defined a prefix for the parser
 */
export type PreFixFunction = (a: ParserEntity) => ParserEntity;

/**
 * The type used to defined a prefix for the parser
 */
export type PostFixFunction = (b: ParserEntity) => ParserEntity;

/**
 * The call used to construct an equation
 */
export type EquationConstructorCall = (a: ParserEntity, b: ParserEntity) => Equation;

/** Controls the parser context used when a deferred function evaluates one argument. */
export interface DeferredArgumentOptions {
	/** Call-scoped substitution names to omit while evaluating this argument. */
	excludeValues?: readonly string[];
	/** Whether this argument should inherit the enclosing call-scoped substitutions. */
	inheritValues?: boolean;
	/** Optional temporary override for known-value substitution. */
	substitute?: boolean;
}

/**
 * A parser argument whose evaluation is delayed until the receiving function decides to
 * execute it. The callback may be invoked once or repeatedly, and may narrow the inherited
 * substitution context for lexical control functions.
 */
export type DeferredFunctionArgument = (options?: DeferredArgumentOptions) => ParserEntity;

/** An operator action whose right-hand operand is deferred. */
export type DeferredOperation = (a: ParserEntity, b: DeferredFunctionArgument) => ParserEntity;

/**
 * Named values substituted while parsing or evaluating an input expression.
 *
 * Keys are parser variable names. This compatibility type accepts the same broad value
 * union as the root API, but not every substitution path can consume every structured
 * entity. The receiving operation's documentation defines the narrower requirements when
 * one applies.
 */
export type ParserValuesObject = Record<string, NerdamerInput>;

/**
 * Constant definitions accepted by the parser's constant registry.
 *
 * String definitions are parsed when the constant is encountered. Function
 * definitions are deferred factories that return parser text, allowing constants such
 * as `pi` and `e` to reflect the active numerical precision. The registry itself is
 * process-wide; this type does not imply isolated parser state.
 */
export type ParserConstants = Record<string, (() => string) | string>;

/**
 * Values currently accepted by Nerdamer's broad settings objects.
 *
 * @remarks
 * Parser and formatting settings share this recursive value type. Each API still decides
 * which setting names and value shapes it understands.
 */
export type OptionValue = string | boolean | number | string[] | OptionsObject;

/**
 * Compatibility settings bag used by several parser and formatter entry points.
 *
 * The index signature reflects the values that settings APIs currently pass around. It
 * does not make arbitrary setting names part of the supported public method.
 */
export interface OptionsObject {
	[key: string]: OptionValue;
}

/**
 * Formatting options accepted by {@link Expression.text}.
 *
 * These options affect only the returned string. They do not change the expression or
 * Nerdamer's process-wide settings.
 */
export type TextOptions = {
	/** Render rational values as decimals instead of exact fractions. */
	decimal?: boolean;
	/** Significant-digit precision used when decimal output is requested. */
	precision?: number;
	/** Sort sum and product elements with {@link Expression.sortFunction} before rendering. */
	sort?: boolean;
	/** Parenthesize powers for output that will be embedded in JavaScript-style expressions. */
	wrapPow?: boolean;
};

/**
 * The type used when passing settings
 */
export type SimpleOptionsObject = Record<string, string | number | Expression>;

/**
 * The type supported by Decimal implementations of algorithms
 */
export type DecimalType = Decimal | number | string;

/**
 * Native JavaScript function produced or consumed by numerical compilation APIs.
 *
 * Arguments and numeric results use JavaScript `number` arithmetic rather than
 * Nerdamer's exact rational or arbitrary-precision symbolic representation. Boolean
 * results support compiled comparison expressions.
 */
export type JsFunction = (...args: number[]) => number | boolean;

/**
 * A simple expression function call
 */
export type ExpressionFunction = (...args: Expression[]) => Expression;

/**
 * Internal values that may temporarily exist on the parser output stack.
 * IndexedReference and KeyValuePair are resolved or consumed before parseRPN returns.
 * Deferred callbacks are consumed only by operators that explicitly request them.
 */
export type ParserStackValue =
	| ParserEntity
	| IndexedReference
	| KeyValuePair
	| DeferredFunctionArgument;

/**
 * An array containing numerator and denominator
 */
export type FracArray = [string, string];
