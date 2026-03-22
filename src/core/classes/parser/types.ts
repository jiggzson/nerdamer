import { type Collection } from '../collection/Collection';
import { type Dictionary } from '../dictionary/Dictionary';
import { type Equation } from '../equation/Equation';
import { type Expression } from '../expression/Expression';
import { type Matrix } from '../matrix/Matrix';
import { type Rational } from '../rational/Rational';
import { type ValuesSet } from '../valuesSet/ValuesSet';
import { type Vector } from '../vector/Vector';

import type Decimal from 'decimal.js';

/**
 * The type used to defined a operation function for the parser
 */
export type Operation = (a: ParserInputType, b?: ParserInputType) => ParserInputType;

/**
 * The type used to defined a prefix for the parser
 */
export type PreFixFunction = (a: ParserInputType) => ParserInputType;

/**
 * The type used to defined a prefix for the parser
 */
export type PostFixFunction = (b: ParserInputType) => ParserInputType;

/**
 * The used to define a parse function call
 */
export type ParserFunctionCall = (functionName: string, args: ParserInputType[]) => ParserInputType;

/**
 * The call used to construct an equation
 */
export type EquationConstructorCall = (a: ParserInputType, b: ParserInputType) => Equation;

/**
 * The values passed to the parser to be substituted
 */
export type ParserValuesObject = {
	[value: string]: string | number | Expression | Decimal | bigint | ParserInputType;
};

/**
 * A constants that can be set in the parser
 */
export type ParserConstants = { [constant: string]: (() => string) | string };

/**
 * The type used when passing settings
 */
export type OptionsObject = {
	[option: string]: string | boolean | number | string[] | OptionsObject;
};

/**
 * The type used when passing settings
 */
export type SimpleOptionsObject = { [option: string]: string | number | Expression };

/**
 * The type supported by Decimal implementations of algorithms
 */
export type DecimalType = Decimal | number | string;

/**
 * The numeric function that's used by the build function
 */
export type JsFunction = (...args: number[]) => number | boolean;

/**
 * A simple expression function call
 */
export type ExpressionFunction = (...args: Expression[]) => Expression;

/**
 * The supported types that the Parser can convert in the `parse` or `evaluate` methods
 */
export type ExpressionInputType = number | string | Rational | Expression | bigint | Decimal;

/**
 * All the types that can be fed to the libary
 */
export type SupportedInputType =
	| ExpressionInputType
	| Vector
	| ValuesSet
	| Collection
	| Matrix
	| Dictionary
	| Equation;

/**
 * The types that are returned by the Parser
 */
export type ParserInputType =
	| Expression
	| Vector
	| ValuesSet
	| Collection
	| Matrix
	| Equation
	| Dictionary;

/**
 * Array/Matrix-like types
 */
export type StructuredEntityType = Matrix | Vector | Collection | Dictionary;

/**
 * An array containing numerator and denominator
 */
export type FracArray = [string, string];
