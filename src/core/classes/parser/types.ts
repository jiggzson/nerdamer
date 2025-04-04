import Decimal from "decimal.js";
import { Expression } from "../expression/Expression"
import { Rational } from "./operations";
import { Vector } from "../vector/Vector";
import { Matrix } from "../matrix/Matrix";
import { Collection } from "../collection/Collection";
import { Equation } from "../equation/Equation";
// import { Equation } from "../equation/Equation";

/**
 * The type used to defined a operation function for the parser
 */
export type Operation = (a: ParserSupportedType, b?: ParserSupportedType) => ParserSupportedType;

// /**
//  * Basically the comma. The type was removed as an Operator type since it's a one-off and
//  * creates unnecessary type casts.
//  */
// export type ValuesDelimiter = (a: ParserSupportedType, b: ParserSupportedType, flags: {[key: string] : string | boolean}) => ParserSupportedType;

/**
 * The type used to defined a prefix for the parser
 */
export type PreFixFunction = (a: ParserSupportedType) => ParserSupportedType;

/**
 * The type used to defined a prefix for the parser
 */
export type PostFixFunction = (b: ParserSupportedType) => ParserSupportedType;

/**
 * The used to define a parse function call
 */
export type ParserFunctionCall = (functionName: string, args: ParserSupportedType[]) => Expression;

/**
 * The call used to construct an equation
 */
export type EquationConstructorCall = (a: ParserSupportedType, b: ParserSupportedType) => Equation;

/**
 * The values passed to the parser to be substituted
 */
export type ParserValuesObject = { [value: string]: string | number | Expression };

/**
 * A constants that can be set in the parser
 */
export type ParserConstants = { [constant: string]: (() => string) | string };

/**
 * The type used when passing settings
 */
export type OptionsObject = { [option: string]: (string | boolean | number | string[]) };

/**
 * The type supported by Decimal implementations of algorithms
 */
export type DecimalType = Decimal | number | string;

/**
 * The numeric function that's used by the build function
 */
export type JsFunction = (...args: number[]) => number | boolean;

/**
 * The supported types that the Parser can convert in the `parse` or `evaluate` methods
 */
export type SupportedInputType = (number | string | Rational | Expression | bigint);

/**
 * The types that are returned by the Parser
 */
// export type ParserSupportedType = (Expression | Vector | Matrix | Equation);
export type ParserSupportedType = (Expression | Vector | Collection | Matrix | Equation);

/**
 * Array/Matrix-like types
 */
export type ValuesSetType = Matrix | Vector | Collection;

/**
 * An array containing numerator and denominator
 */
export type FracArray = [string, string];

