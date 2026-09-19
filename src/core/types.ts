import type { Collection } from './classes/collection/Collection';
import type { Dictionary } from './classes/dictionary/Dictionary';
import type { Equation } from './classes/equation/Equation';
import type { Expression } from './classes/expression/Expression';
import type { Matrix } from './classes/matrix/Matrix';
import type { Rational } from './classes/rational/Rational';
import type { ValuesSet } from './classes/valuesSet/ValuesSet';
import type { Vector } from './classes/vector/Vector';
import type Decimal from 'decimal.js';

/**
 * Values accepted by Nerdamer's expression-oriented parsing APIs.
 *
 * @remarks
 * Strings are interpreted as parser notation. Primitive numbers, `bigint`, and
 * `Decimal` instances are converted through their textual form; {@link Rational}
 * values are converted directly, and existing {@link Expression} values retain their
 * symbolic structure.
 * An existing expression may be reused by identity by APIs such as
 * {@link Expression.create}; request a copy at the receiving API when independent
 * mutation is required.
 */
export type ExpressionInput = number | string | Rational | Expression | bigint | Decimal;

/**
 * Values accepted across Nerdamer's root API and direct object model.
 *
 * This extends {@link ExpressionInput} with the structured parser entities and
 * equations that can be passed back into supported operations. Individual functions
 * may accept a narrower subset and should document that restriction locally.
 */
export type NerdamerInput =
	| ExpressionInput
	| Vector
	| ValuesSet
	| Collection
	| Matrix
	| Dictionary
	| Equation;

/**
 * Values that can be produced by Nerdamer's parser.
 *
 * @remarks
 * Equality syntax produces an {@link Equation}; bracket, set, matrix, and dictionary
 * syntax can produce the corresponding structured entity instead of an
 * {@link Expression}. Callers of the general parser should therefore narrow this union
 * before using expression-specific methods.
 */
export type ParserEntity =
	| Expression
	| Vector
	| ValuesSet
	| Collection
	| Matrix
	| Equation
	| Dictionary;

/**
 * Structured parser entities that participate in aggregate operations.
 *
 * The union describes Nerdamer's supported matrix, vector, ordered collection, and
 * keyed dictionary containers. It excludes value sets and equations, whose semantics
 * are not ordinary elementwise structured operations.
 */
export type StructuredEntityType = Matrix | Vector | Collection | Dictionary;
