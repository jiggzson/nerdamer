import { remove } from '../../../utils/array';
import { Scope } from '../../common/classes/Scope';
import { brackets, ASSERTIVE_FUNCTIONS } from '../../common/common';
import { getOperators } from '../../common/functions/functions';
import { isEnumerable } from '../../common/functions/structuredEntityUtils';
import { mathFunctionRegistry } from '../../dispatch';
import { UnexpectedTokenError, ParserError, message } from '../../errors';
import { scientificToDecimal } from '../../functions/string';
import { RESTRICTED, scopedBlock, Settings } from '../../Settings';
import { Collection } from '../collection/Collection';
import { Dictionary } from '../dictionary/Dictionary';
import { Equation } from '../equation/Equation';
import { Expression } from '../expression/Expression';
import { Matrix } from '../matrix/Matrix';
import { Rational } from '../rational/Rational';
import { ValuesSet } from '../valuesSet/ValuesSet';
import { Vector } from '../vector/Vector';

import {
	SPACE,
	BLANK,
	NEWLINE,
	TAB,
	RETURN,
	INFINITY,
	PARSER_CONSTANTS,
	COMMA,
	VECTOR,
	MATRIX,
	SYMBOLIC_ACCESSOR,
	ALIASES,
} from './constants';
import { _, callFunction, route } from './operations/functions';
import { preprocess } from './preprocess';
import { refreshOperatorSymbols, Token } from './Token';
import { IndexedReference } from './wrappers/IndexedReference';
import { KeyValuePair } from './wrappers/KeyValuePair';

import type { Bracket, Operator, OperatorDefinition } from '../../common/common';
import type { ParserEntity, ExpressionInput, StructuredEntityType } from '../../types';
import type { TokenBuffer } from './Token';
import type {
	Operation,
	PreFixFunction,
	PostFixFunction,
	OptionsObject,
	ParserValuesObject,
	ParserConstants,
	CommaOperation,
	ParserStackValue,
	DeferredArgumentOptions,
	DeferredFunctionArgument,
	DeferredOperation,
} from './types';

type OperatorFunction = Operation | PostFixFunction | PreFixFunction;

function shouldPopOperator(stackOperator: Operator, incomingOperator: Operator) {
	let retval = stackOperator.precedence > incomingOperator.precedence;

	if (!retval && stackOperator.precedence === incomingOperator.precedence) {
		retval = incomingOperator.leftAssoc;
	}

	return retval;
}

/**
 * Parses Nerdamer notation into symbolic and structured parser entities.
 *
 * @remarks
 * The parser has three main stages: {@link tokenize} builds a nested token tree,
 * {@link toRPN} applies the Shunting Yard algorithm within those scopes, and
 * {@link parseRPN} evaluates the resulting stack representation. {@link parse} is
 * the ordinary front end that runs that pipeline for a caller.
 *
 * Parsing does not always produce an {@link Expression}. Depending on the syntax
 * and functions involved, the result can also be an equation, vector, matrix,
 * collection, finite value set, or dictionary. Callers that require a specific
 * parser entity should narrow the returned type rather than assuming an expression.
 *
 * The exported {@link Parser} singleton is the normal parser instance. Several
 * parts of parser behavior are process-wide rather than instance-local, including
 * parser settings, the constant and operator registries, Rational/Decimal precision,
 * and the symbol reserved for the imaginary unit. {@link create} therefore creates
 * another parser object, but it does not create an isolated parser context.
 *
 * The parser is a convenient notation front end, not the only supported way to use
 * Nerdamer. Algorithms that already have {@link Expression} or other Nerdamer
 * objects can operate on those objects directly without converting through text.
 *
 * @example
 * ```ts
 * Parser.parse('2*x + 1').text();                    // "1+2*x"
 * Parser.parse('x^2', { x: 3 }).text();              // "9"
 * Parser.parse('[x, 2]').text();                     // "[x, 2]"
 * Parser.parse('{a => x, b => 2}').text();           // "{a => x, b => 2}"
 * ```
 */
class ExpressionParser {

	/**
	 * Registry of named constants recognized by this parser.
	 *
	 * @remarks
	 * The registry object is shared by parser instances. Use {@link setConstants}
	 * instead of replacing or mutating this object directly so constant registration
	 * follows the parser's normal behavior.
	 */
	private CONSTANTS: ParserConstants = PARSER_CONSTANTS;

	/**
	 * The maximum number of operators a compound operator can consist of
	 */
	private MAX_COMPOUND_OPERATOR_LENGTH: number = 2;

	// Operators supported by the parser
	private operators: Record<string, Operator> = getOperators();

	private VALUE_SETS: string[] = [VECTOR, MATRIX];

	// Define whitespace to be ignored.
	private WHITE_SPACE: string[] = [NEWLINE, TAB, RETURN];

	/**
	 * Persistent known-value substitutions consulted during parsing.
	 *
	 * @remarks
	 * Known values are substituted only while the global `SUBSTITUTE` setting is
	 * enabled. A stored parser entity is copied before it is inserted into a parsed
	 * result, so ordinary substitution does not hand out the stored object itself.
	 */
	KNOWN_VALUES: Record<string, ParserEntity> = {};


	/**
	 * Converts an index scope to the zero-based indices used internally.
	 *
	 * Literal numeric indices are converted directly without parsing or evaluation.
	 * Symbolic or computed indices are returned as Expressions when they cannot yet
	 * be resolved. Resolved numeric values subtract `INDEX_BASE`; symbolic values retain
	 * the public index expressions so they can be evaluated later.
	 */
	private extractIndices(
		scope: Scope,
		values?: ParserValuesObject,
		assertive?: boolean
	): number[] | Expression[] {
		const indices: number[] = [];
		let allNumeric = true;

		for (let k = 0; k < scope.length; k++) {
			const item = scope[k];
			if (Scope.isScope(item)) {
				allNumeric = false;
				break;
			}
			if (item.type === Token.OPERATOR) {
				continue;
			}
			if (item.type === Token.NUMBER) {
				indices.push(Number(item.value) - Settings.INDEX_BASE);
			} else {
				allNumeric = false;
				break;
			}
		}

		let retval: number[] | Expression[];
		if (allNumeric && indices.length > 0) {
			retval = indices;
		} else {
			// Retain the parsed public expressions if evaluation is not concrete yet.
			const indexExpr = this.parseRPN(scope, values, assertive);
			const symbolicIndices: Expression[] = [];

			if (Vector.isVector(indexExpr)) {
				for (let j = 0; j < indexExpr.elements.length; j++) {
					symbolicIndices.push(Expression.create(indexExpr.elements[j]));
				}
			} else if (Collection.isCollection(indexExpr)) {
				for (const el of indexExpr.getElements()) {
					symbolicIndices.push(Expression.create(el));
				}
			} else {
				symbolicIndices.push(Expression.create(indexExpr));
			}

			const resolvedIndices: number[] = [];
			let allResolved = true;
			for (let j = 0; j < symbolicIndices.length; j++) {
				const numericIndex = Number(symbolicIndices[j].evaluate().text());
				if (!Number.isFinite(numericIndex)) {
					allResolved = false;
					break;
				}
				resolvedIndices.push(numericIndex - Settings.INDEX_BASE);
			}

			retval = allResolved ? resolvedIndices : symbolicIndices;
		}

		return retval;
	}

	/**
	 * Extracts string keys from an index scope for Dictionary access.
	 * For d[x], the scope contains a single variable token "x" → returns ["x"].
	 * For d[myKey], returns ["myKey"].
	 */
	private extractStringKeys(scope: Scope): string[] {
		const keys: string[] = [];
		for (let k = 0; k < scope.length; k++) {
			const item = scope[k];
			if (Scope.isScope(item)) {
				// Nested scope — not expected for dictionary keys
				continue;
			}
			if (item.type === Token.OPERATOR) {
				// Skip comma separators
				continue;
			}
			// Use the token value as the string key
			keys.push(item.value);
		}
		return keys;
	}

	/** Creates another spelling for an existing operator without changing its action. */
	aliasOperator(symbol: string, alias: string) {
		const source = this.operators[symbol];
		if (!source) {
			throw new ParserError(`Unknown operator ${symbol}`);
		}

		this.operators[alias] = {
			...source,
			operator: alias,
			postfixVariant: source.postfixVariant
				? { ...source.postfixVariant, operator: alias }
				: undefined,
		};
		refreshOperatorSymbols();

		return this;
	}

	/**
	 * Creates another parser instance.
	 *
	 * @remarks
	 * The returned parser object is distinct and starts with its own `KNOWN_VALUES`
	 * table, but it is not an isolated parser environment. Parser settings, constants,
	 * operators, Rational/Decimal precision, and the imaginary-unit symbol are shared
	 * process-wide. Changes made through methods such as {@link set},
	 * {@link setConstants}, {@link setPrecision}, or {@link setI} therefore affect
	 * parsing outside the newly created instance as well.
	 *
	 * @returns A distinct parser instance that shares Nerdamer's global parser state.
	 *
	 * @example
	 * ```ts
	 * const parser = Parser.create();
	 *
	 * parser === Parser;                // false
	 * parser.parse('x + 1').text();     // "1+x"
	 * ```
	 */
	create() {
		return new ExpressionParser();
	}

	/**
	 * Parses an expression with evaluation mode temporarily enabled.
	 *
	 * @remarks
	 * Supported numeric constants and functions are evaluated eagerly at the current
	 * configured precision, but this method does not guarantee a purely numeric result;
	 * symbolic terms that cannot be evaluated remain symbolic. The previous global
	 * `EVALUATE` setting is restored after parsing, including when parsing throws.
	 *
	 * @param str - Expression text to parse while evaluation mode is enabled.
	 * @param values - Optional call-scoped substitutions applied as in {@link parse}.
	 * @returns The parser entity produced by the evaluated parse.
	 *
	 * @example
	 * ```ts
	 * Parser.evaluate('2^10').text();                 // "1024"
	 * Parser.evaluate('x+y', { x: 1, y: 2 }).text(); // "3"
	 * Parser.evaluate('x+1').text();                  // "1+x"
	 * ```
	 */
	evaluate(str: string, values?: ParserValuesObject) {
		return scopedBlock('EVALUATE', true, () => {
			return Parser.parse(str, values);
		});
	}

	/**
	 * Reads the current value of a process-wide parser setting.
	 *
	 * @param setting - The parser setting to read.
	 * @returns The setting's current global value.
	 *
	 * @example
	 * ```ts
	 * const evaluate = Parser.get('EVALUATE');
	 * const indexBase = Parser.get('INDEX_BASE');
	 * ```
	 */
	get(setting: keyof typeof Settings) {
		return Settings[setting];
	}

	/**
	 * Returns the symbol currently reserved for the imaginary unit.
	 *
	 * @remarks
	 * The symbol is process-wide and can be changed through {@link setI}. Changing it
	 * affects subsequent parser behavior and complex-number classification; it does
	 * not rewrite expressions that have already been created.
	 *
	 * @returns The current imaginary-unit variable name.
	 *
	 * @example
	 * ```ts
	 * Parser.getI(); // "i" with the default configuration
	 * ```
	 */
	getI() {
		return Expression.imaginary;
	}

	/** Returns a detached snapshot of registered operator metadata. */
	getOperator(symbol: string): Operator | undefined {
		const operator = this.operators[symbol];
		let retval: Operator | undefined;

		if (operator) {
			retval = {
				...operator,
				postfixVariant: operator.postfixVariant
					? { ...operator.postfixVariant }
					: undefined,
			};
		}

		return retval;
	}

	/**
	 * Returns the current shared precision used by Decimal-backed numeric operations.
	 *
	 * @remarks
	 * This is the same precision reported by {@link Rational.getPrecision}. Exact
	 * rational arithmetic remains exact; the setting matters when Nerdamer crosses
	 * into Decimal-backed numerical work, generates numerical constants, or formats
	 * precision-sensitive decimal results.
	 *
	 * @returns The configured number of significant digits.
	 */
	getPrecision(): number {
		return Rational.getPrecision();
	}

	/**
	 * Parses supported expression input into a Nerdamer parser entity.
	 *
	 * @remarks
	 * The input is converted to text, tokenized with {@link tokenize}, transformed
	 * with {@link toRPN}, and evaluated with {@link parseRPN}. Passing an existing
	 * {@link Expression} therefore reparses its textual representation rather than
	 * preserving that object's identity.
	 *
	 * The result is determined by the parsed syntax. Ordinary scalar input produces
	 * an {@link Expression}, while equations and structured syntax can produce other
	 * parser entities such as vectors, matrices, collections, finite value sets, or
	 * dictionaries.
	 *
	 * The `values` object provides substitutions for this parse call. The caller's
	 * object is not mutated; scalar values are normalized to expressions before use,
	 * while existing parser entities are preserved structurally. Each inserted parser
	 * entity is copied. Registered string constants are resolved before call-scoped
	 * values. Call-scoped values in turn take precedence over persistent known values
	 * and over function-backed constants such as `pi` and `e` when those constants are
	 * being numerically evaluated.
	 *
	 * Parser and operator errors are propagated when the input is malformed or an
	 * operation is not valid for the parsed operands.
	 *
	 * @param str - Expression-compatible input whose textual form should be parsed.
	 * @param values - Optional call-scoped substitutions. Scalar values are normalized
	 * to {@link Expression} objects; existing parser entities are preserved structurally
	 * and copied when inserted.
	 * @returns The expression or structured parser entity represented by the input.
	 *
	 * @example
	 * ```ts
	 * Parser.parse('x^2 + 2*x + 1').text();        // "1+2*x+x^2"
	 * Parser.parse('a + b', { a: 3, b: 4 }).text(); // "7"
	 * Parser.parse('x = 2').text();                // "x=2"
	 * Parser.parse('[x, 2, 3]').text();            // "[x, 2, 3]"
	 * ```
	 */
	parse(str: ExpressionInput, values?: ParserValuesObject): ParserEntity {
		// Normalize scalar values once while preserving existing parser entities.
		if (values) {
			// We don't want to modify the object.
			const valuesObj: ParserValuesObject = {};
			for (const value in values) {
				// Ignore values such as e or pi
				// if (SPECIAL.includes(value)) {
				// 	continue;
				// }
				const input = values[value];
				valuesObj[value] =
					Expression.isExpression(input) || Equation.isEquation(input) || isEnumerable(input)
						? input
						: Expression.create(input);
			}
			values = valuesObj;
		}
		// Normalize accepted parser shorthand before the ordinary tokenizer resolves
		// adjacency and implicit multiplication.
		const source = preprocess(String(str), mathFunctionRegistry);
		const rpn: Scope = this.toRPN(this.tokenize(source));
		// Read it into an expression.
		const retval = this.parseRPN(rpn, values);

		return retval;
	}

	/**
	 * Evaluates a token scope that has been converted to Reverse Polish Notation.
	 *
	 * @remarks
	 * This is the parser's core stack evaluator. It applies prefix, postfix, and
	 * binary operators; dispatches function calls; resolves substitutions and known
	 * values; performs indexing and indexed assignment; and routes operations involving
	 * equations or enumerable structures to the appropriate aggregate implementation.
	 *
	 * Square scopes become vectors. Curly scopes become dictionaries when they contain
	 * `=>` key/value markers and otherwise become finite value sets. Multiple unresolved
	 * top-level values become a collection. Internal stack markers used for indexing and
	 * dictionary construction are resolved or consumed before a successful return.
	 *
	 * When `assertive` is `true`, operators use their assertive actions where defined.
	 * This is used by assumption-related functions so comparisons can assert conditions
	 * instead of performing ordinary comparison evaluation.
	 *
	 * @param rpn - RPN scope, normally produced by {@link toRPN}.
	 * @param values - Optional call-scoped substitutions already prepared for parser use.
	 * @param assertive - Use assertion-oriented operator actions where the operator defines one.
	 * @returns The parser entity produced by evaluating the scope.
	 * @throws {@link ParserError} When the stack contains a malformed or unresolved parser construct.
	 */
	parseRPN(rpn: Scope, values?: ParserValuesObject, assertive?: boolean): ParserEntity {
		// The output stack
		const output: ParserStackValue[] = [];

		const operators = this.operators;
		// TODO: this needs to be applied at the operation level. It's somewhat clunky to apply this here.
		// const precision = this.getPrecision();

		function addToOutput(expression: ParserStackValue) {
			if (expression === undefined) {
				throw new ParserError(message('malformedExpression'));
			}
			// Keep track of the precision used to make this calculation
			// TODO: this needs to be applied at the operation level. It's somewhat clunky to apply this here.
			// expression.precision = expression.precision || precision;
			output.push(expression);
		}

		function resolveStackValue(value: ParserStackValue): ParserEntity {
			if (IndexedReference.isIndexedReference(value)) {
				return value.resolve();
			}
			if (KeyValuePair.isKeyValuePair(value) || typeof value === 'function') {
				throw new ParserError(message('malformedExpression'));
			}
			return value;
		}

		function resolveStackValues(values: ParserStackValue[]): ParserEntity[] {
			const resolved: ParserEntity[] = [];
			for (const value of values) {
				resolved.push(resolveStackValue(value));
			}
			return resolved;
		}

		const createDeferredArgument = (
			getArgumentRPN: () => Scope,
			inheritedValues?: ParserValuesObject,
			functionAssertive?: boolean
		): DeferredFunctionArgument => {
			let argumentRPN: Scope | undefined;

			return (options?: DeferredArgumentOptions) => {
				const rpn = argumentRPN ?? getArgumentRPN();
				argumentRPN = rpn;
				let argumentValues = options?.inheritValues === false ? undefined : inheritedValues;

				if (argumentValues && options?.excludeValues?.length) {
					argumentValues = { ...argumentValues };
					for (const name of options.excludeValues) {
						delete argumentValues[name];
					}
				}

				let retval: ParserEntity;
				if (typeof options?.substitute === 'boolean') {
					retval = scopedBlock('SUBSTITUTE', options.substitute, () => {
						return this.parseRPN(rpn, argumentValues, functionAssertive);
					});
				} else {
					retval = this.parseRPN(rpn, argumentValues, functionAssertive);
				}
				return retval;
			};
		};

		// Begin parsing of tokens
		for (let i = 0; i < rpn.length; i++) {
			// Grab the token or Scope
			const token: Token | Scope = rpn[i];

			if (Scope.isScope(token)) {
				const lastOutput = output[output.length - 1];

				if (token.deferRHSResolution) {
					addToOutput(createDeferredArgument(() => token, values, assertive));
				} else if (token.deferLHSResolution) {
					// Left-hand targets are parsed without substitution so assignment can update a
					// variable that already has a known value.
					const parsed = scopedBlock('SUBSTITUTE', false, () => {
						return this.parseRPN(token, undefined, assertive);
					});
					addToOutput(parsed);
				}
				// A square scope is a candidate for indexing or implicit multiplication ONLY
				// when the tokenizer flagged it with implicitMultiply (meaning '[' directly
				// followed a non-operator/non-function token). Without that flag, the scope
				// is a standalone vector literal (e.g. in matrix([1,0],[2,3]) where commas
				// separate the square scopes).
				else if (token.type === 'square' && token.implicitMultiply && lastOutput) {
					if (
						isEnumerable(lastOutput) ||
						IndexedReference.isIndexedReference(lastOutput)
					) {
						// Indexing: target[indices]
						const resolvedTarget =
							IndexedReference.isIndexedReference(lastOutput)
								? lastOutput.resolve()
								: lastOutput;
						const previousRPN = rpn[i - 1];
						let targetName: string | undefined;

						if (
							Token.isToken(previousRPN) &&
							previousRPN.type === Token.VARIABLE &&
							!(values && previousRPN.value in values) &&
							previousRPN.value in this.KNOWN_VALUES
						) {
							targetName = previousRPN.value;
						}

						let indices: number[] | Expression[] | string;

						if (Dictionary.isDictionary(resolvedTarget)) {
							// Dictionary indexing: extract string keys from the index scope.
							// d[x] → key "x"
							const keys = this.extractStringKeys(token);
							indices = keys[0];
						} else {
							// Numeric indexing for Vector, Matrix, etc.
							indices = this.extractIndices(token, values, assertive);
						}

						output.pop();
						if (
							Array.isArray(indices) &&
							indices.length > 0 &&
							Expression.isExpression(indices[0])
						) {
							const symbolicIndices = indices as Expression[];
							let symbolicTarget: Expression | undefined;

							if (
								(Vector.isVector(resolvedTarget) || Matrix.isMatrix(resolvedTarget)) &&
								resolvedTarget.symbolicTarget
							) {
								symbolicTarget = resolvedTarget.symbolicTarget;
							} else if (
								Token.isToken(previousRPN) &&
								previousRPN.type === Token.VARIABLE
							) {
								symbolicTarget = Expression.Variable(previousRPN.value);
							}

							if (
								!symbolicTarget ||
								!(Vector.isVector(resolvedTarget) || Matrix.isMatrix(resolvedTarget))
							) {
								throw new ParserError(
									'Symbolic indexed access requires a named Vector or Matrix target.'
								);
							}
							if (Vector.isVector(resolvedTarget) && symbolicIndices.length !== 1) {
								throw new ParserError('Symbolic Vector access requires exactly one index.');
							}
							if (Matrix.isMatrix(resolvedTarget) && symbolicIndices.length !== 2) {
								if (symbolicIndices.length === 1) {
									throw new ParserError(
										'Symbolic Matrix row access is not scalar and cannot be deferred as an Expression.'
									);
								}
								throw new ParserError('Symbolic Matrix cell access requires exactly two indices.');
							}

							addToOutput(
								resolvedTarget.withSymbolicAccessor(symbolicTarget, symbolicIndices)
							);
						} else {
							addToOutput(
								new IndexedReference(
									resolvedTarget,
									indices as number[] | string,
									targetName
								)
							);
						}
					} else if (Expression.isExpression(lastOutput) && lastOutput.isPlainVariable()) {
						// An unresolved variable followed by symbolic indices cannot yet be
						// classified from runtime type information. Preserve the access in a
						// structured carrier; concrete bracket adjacency keeps its legacy
						// implicit-multiplication behavior.
						const indices = this.extractIndices(token, values, assertive);
						if (
							indices.length > 0 &&
							Expression.isExpression(indices[0])
						) {
							const symbolicIndices = indices as Expression[];
							if (symbolicIndices.length > 2) {
								throw new ParserError(
									'Symbolic indexed access supports at most two unresolved indices.'
								);
							}
							const carrier =
								symbolicIndices.length === 2 ? new Matrix([]) : new Vector();

							output.pop();
							addToOutput(carrier.withSymbolicAccessor(lastOutput, symbolicIndices));
						} else if (Settings.ALLOW_IMPLICIT_MULTIPLICATION) {
							const indexExpr = this.parseRPN(token, values, assertive);
							const mulFn = _['multiply'] as Operation;
							const a = resolveStackValue(output.pop()!);
							addToOutput(mulFn(a, indexExpr));
						} else {
							const parsed = this.parseRPN(token, values, assertive);
							addToOutput(parsed);
						}
					} else if (token.implicitMultiply && Settings.ALLOW_IMPLICIT_MULTIPLICATION) {
						// Implicit multiplication: x[1,2] where x is not a structured entity.
						const indexExpr = this.parseRPN(token, values, assertive);
						const mulFn = _['multiply'] as Operation;
						const a = resolveStackValue(output.pop()!);
						addToOutput(mulFn(a, indexExpr));
					} else {
						const parsed = this.parseRPN(token, values, assertive);
						addToOutput(parsed);
					}
				} else {
					// Non-square scope or inside parentheses or nothing on output — parse normally
					const parsed = this.parseRPN(token, values, assertive);
					addToOutput(parsed);
				}
			} else {
				if (token.type === Token.OPERATOR) {
					// Grab the operator. The action will be defined by the operation property
					const operator = token.resolvedOperator ?? this.operators[token.value];

					// Get the last element on output
					let b = output.pop()!;

					let result: ParserStackValue | ParserStackValue[];

					// Comma is the only operation that passes parser stack markers through unchanged.
					// This allows KeyValuePair markers to survive until the enclosing curly scope is
					// converted to a Dictionary.
					if (operator.action === 'comma') {
						const a = output.pop()!;
						const fn = _[operator.action] as CommaOperation;
						result = fn(a, b);
					}
					// If it's a postfix operator then the operation occurs only on the previous element
					else if (operator.isPostfix) {
						b = resolveStackValue(b);
						b = Expression.fromSymbolicAccess(b) ?? b;
						const fn = _[operator.action] as PostFixFunction;
						result = fn(b);
					} else {
						let a = output.pop()!;

						const previousRPN = rpn[i - 1];
						const possibleFunction = rpn[i - 2];

						if (
							token.position === -1 &&
							operator.action === 'times' &&
							Scope.isScope(previousRPN) &&
							Collection.isCollection(b) &&
							Token.isToken(possibleFunction) &&
							possibleFunction.type === Token.VARIABLE &&
							Expression.isExpression(a) &&
							a.isPlainVariable()
						) {
							throw new ParserError(`Unsupported function ${possibleFunction.value}`);
						}

						// Handle indexed assignment before ordinary left-hand resolution so the
						// reference itself remains available to the setter.
						if (
							operator.action === 'assign' &&
							IndexedReference.isIndexedReference(a)
						) {
							b = resolveStackValue(b);
							if (typeof a.indices === 'string') {
								(a.target as Dictionary).__set__(a.indices, b);
							} else {
								(a.target as StructuredEntityType).__set__(a.indices, b);
							}
							if (a.targetName) {
								this.KNOWN_VALUES[a.targetName] = a.target;
							}
							result = a.target;
						} else if (operator.deferRHSResolution) {
							a = resolveStackValue(a);
							if (typeof b !== 'function') {
								throw new ParserError(message('malformedExpression'));
							}
							const fn = _[operator.action] as DeferredOperation;
							result = fn(a, b);
						} else if (operator.deferLHSResolution) {
							a = resolveStackValue(a);
							b = resolveStackValue(b);
							const fn = _[operator.action] as Operation;
							result = fn(a, b);
						} else if (operator.action === 'mapTo') {
							// '=>' operator: create a key-value pair for Dictionary construction
							// 'a' is the key (should be a variable name), 'b' is the value
							a = resolveStackValue(a);
							b = resolveStackValue(b);
							const key = Expression.isExpression(a) ? a.text() : String(a.text());
							result = new KeyValuePair(key, b);
						} else {
							// Resolve concrete indexed references and normalize symbolic structured
							// access before ordinary scalar/aggregate operator routing.
							a = resolveStackValue(a);
							b = resolveStackValue(b);
							a = Expression.fromSymbolicAccess(a) ?? a;
							b = Expression.fromSymbolicAccess(b) ?? b;

							const action =
								assertive && operator.assertiveAction
									? operator.assertiveAction
									: operator.action;
							const fn = _[action] as Operation;

							if (
								a.isEnumerable ||
								b.isEnumerable ||
								Equation.isEquation(a) ||
								Equation.isEquation(b)
							) {
								// Delegate this to the router who can handle more
								result = route(a, b, operator.action);
							} else {
								result = fn(a, b);
							}
						}
					}

					if (Array.isArray(result)) {
						addToOutput(result[0]);
						addToOutput(result[1]);
					} else {
						addToOutput(result);
					}
				} else if (token.type === Token.FUNCTION) {
					// Get the next token and move along
					const argsScope = rpn[++i] as Scope;

					if (token.value === SYMBOLIC_ACCESSOR) {
						// Preserve the original target and index expressions while resolving the
						// same RPN scope under the active values. This avoids serializing either
						// side back through tokenize/toRPN just to apply substitutions.
						const preserved = scopedBlock('SUBSTITUTE', false, () => {
							return this.parseRPN(argsScope, undefined, assertive);
						});
						const preservedArgs = Collection.isCollection(preserved)
							? preserved.getElements()
							: [preserved];
						const resolved = this.parseRPN(argsScope, values, assertive);
						const resolvedArgs = Collection.isCollection(resolved)
							? resolved.getElements()
							: [resolved];

						if (
							preservedArgs.length < 2 ||
							preservedArgs.length !== resolvedArgs.length ||
							!Expression.isExpression(preservedArgs[0]) ||
							!preservedArgs[0].isPlainVariable()
						) {
							throw new ParserError('Malformed internal symbolic accessor.');
						}

						const symbolicTarget = preservedArgs[0];
						const resolvedTarget = resolvedArgs[0];
						const symbolicIndices: Expression[] = [];
						const numericIndices: number[] = [];
						let allResolved = true;

						for (let j = 1; j < preservedArgs.length; j++) {
							const preservedIndex = preservedArgs[j];
							const resolvedIndex = resolvedArgs[j];
							if (!Expression.isExpression(preservedIndex)) {
								throw new ParserError('Malformed internal symbolic accessor index.');
							}
							if (!Expression.isExpression(resolvedIndex)) {
								throw new ParserError('Symbolic accessor indices must evaluate to scalar expressions.');
							}

							symbolicIndices.push(resolvedIndex);
							const numericIndex = Number(resolvedIndex.text());
							if (Number.isFinite(numericIndex)) {
								numericIndices.push(numericIndex - Settings.INDEX_BASE);
							} else {
								allResolved = false;
							}
						}

						if (symbolicIndices.length > 2) {
							throw new ParserError(
								'Symbolic indexed access supports at most two unresolved indices.'
							);
						}

						if (Vector.isVector(resolvedTarget) && symbolicIndices.length !== 1) {
							throw new ParserError('Symbolic Vector access requires exactly one index.');
						}
						if (Matrix.isMatrix(resolvedTarget) && symbolicIndices.length !== 2) {
							if (symbolicIndices.length === 1) {
								throw new ParserError(
									'Symbolic Matrix row access is not scalar and cannot be deferred as an Expression.'
								);
							}
							throw new ParserError('Symbolic Matrix cell access requires exactly two indices.');
						}

						let result: ParserEntity;
						if ((Vector.isVector(resolvedTarget) || Matrix.isMatrix(resolvedTarget)) && allResolved) {
							result = resolvedTarget.__get__(numericIndices);
						} else {
							let carrier: Vector | Matrix;
							if (Vector.isVector(resolvedTarget) || Matrix.isMatrix(resolvedTarget)) {
								carrier = resolvedTarget;
							} else if (
								Expression.isExpression(resolvedTarget) &&
								resolvedTarget.isPlainVariable()
							) {
								carrier = symbolicIndices.length === 2 ? new Matrix([]) : new Vector();
							} else {
								throw new ParserError(
									'Symbolic indexed access target must resolve to a Vector or Matrix.'
								);
							}

							result = carrier.withSymbolicAccessor(symbolicTarget, symbolicIndices);
						}

						addToOutput(result);
					} else if (mathFunctionRegistry[token.value]?.deferArguments) {
						// Deferred functions receive callable arguments and decide when, whether, and how
						// often each argument is evaluated.
						const argumentScopes: Scope[] = [];

						if (argsScope.length > 0) {
							let argumentScope = new Scope(argsScope.type, argsScope.column);

							for (const argumentToken of argsScope) {
								if (
									Token.isToken(argumentToken) &&
									argumentToken.type === Token.OPERATOR &&
									argumentToken.value === COMMA
								) {
									argumentScopes.push(argumentScope);
									argumentScope = new Scope(argsScope.type, argsScope.column);
								} else {
									argumentScope.push(argumentToken);
								}
							}
							argumentScopes.push(argumentScope);
						}

						const normalizeArguments =
							mathFunctionRegistry[token.value].normalizeDeferredArguments;
						const normalizedScopes = normalizeArguments
							? normalizeArguments(argumentScopes)
							: argumentScopes;

						const functionAssertive = ASSERTIVE_FUNCTIONS.includes(token.value);
						const args = normalizedScopes.map(argumentScope => {
							return createDeferredArgument(
								() => this.toRPN(argumentScope),
								values,
								functionAssertive
							);
						});
						const result = callFunction(token.value, args);

						addToOutput(result);
					} else if (argsScope.deferLHSResolution) {
						let args: ParserEntity[] = [];

						if (argsScope.length > 0) {
							const parsed = scopedBlock('SUBSTITUTE', false, () => {
								return this.parseRPN(argsScope, undefined, assertive);
							});
							args = Collection.isCollection(parsed) ? [...parsed.getElements()] : [parsed];
						}

						// Preserve the scoped values followed by their left-hand target. The operator
						// action is responsible for interpreting that structure.
						args.push(Expression.Variable(token.value));
						addToOutput(new Collection(args));
					} else {
						// Parse it as an argument. If the value is of the token is an assertive function then parseRPN needs to
						// know so it can modify it's behavior accordingly. This would be in the case of functions like assume where
						// the operators assert a value rather than compare it.
						const parsed = this.parseRPN(
							argsScope,
							values,
							ASSERTIVE_FUNCTIONS.includes(token.value)
						);

						const args = Collection.isCollection(parsed) ? parsed.getElements() : [parsed];

						const result = callFunction(token.value, args);

						addToOutput(result);
					}
				} else if (token.type === Token.PREFIX) {
					const resolved = resolveStackValue(output.pop()!);
					const e = Expression.fromSymbolicAccess(resolved) ?? resolved;
					const prefixAction = `${operators[token.value].action}Prefix`;
					const fn = _[prefixAction] as PreFixFunction;
					// TODO: Rethink. What happens when a prefix is applied to a vector
					addToOutput(fn(e));
				} else {
					let expression;
					const constant = this.CONSTANTS[token.value];

					// User-defined constants are stored as strings and substitute during ordinary parsing.
					// They take precedence over scoped values, matching the public setConstant method.
					if (typeof constant === 'string') {
						expression = this.parse(constant);
					}
					// Substitute values from the values object. A number is not considered a proper LH value.
					else if (values && token.value in values && !token.is(Token.NUMBER)) {
						// expression = this.parse(String(values[token.value]), values);
						const scopedValue = values[token.value];
						if (
							Expression.isExpression(scopedValue) ||
							Equation.isEquation(scopedValue) ||
							isEnumerable(scopedValue)
						) {
							expression = scopedValue.copy();
						} else {
							expression = Expression.create(scopedValue, undefined, true);
						}
					} else if (token.value in this.KNOWN_VALUES && Settings.SUBSTITUTE) {
						expression = this.KNOWN_VALUES[token.value].copy();
					}
					// Built-in constants are factories so they evaluate at the active precision.
					else if (Settings.EVALUATE && typeof constant === 'function') {
						expression = this.parse(constant(), values);
					} else {
						// At this point the expression type is variable or a number
						switch (token.type) {
							case Token.FUNCTION:
								expression = Expression.Function(token.value);
								break;
							case Token.VARIABLE:
								if (INFINITY.includes(token.value)) {
									expression = Expression.Inf();
								} else {
									expression = Expression.Variable(token.value);
								}

								break;
							default:
								expression = Expression.Number(token.value);
								break;
						}
					}

					// Add it to output
					addToOutput(expression);
				}
			}
		}

		let retval: ParserEntity;
		// Since as function args can have multiple arguments in the output
		// the entire array gets returned. We do the same with
		if (rpn.type === 'square') {
			retval = new Vector(resolveStackValues(output));
		} else if (rpn.type === 'curly') {
			// If the output contains KeyValuePairs (from '=>' operators), build a Dictionary.
			// Otherwise build a ValuesSet as before.
			if (output.length > 0 && KeyValuePair.isKeyValuePair(output[0])) {
				const dict = new Dictionary();
				for (const item of output) {
					if (KeyValuePair.isKeyValuePair(item)) {
						dict.set(item.key, item.value);
					}
				}
				retval = dict;
			} else {
				retval = new ValuesSet(resolveStackValues(output));
			}
		} else if (output.length > 1) {
			retval = new Collection(resolveStackValues(output));
		} else {
			retval = resolveStackValue(output[0]);
		}


		return retval;
	}

	/**
	 * Converts a preprocessed TeX token scope to Nerdamer's ordinary parser syntax.
	 *
	 * @remarks
	 * This is a low-level conversion helper used by the TeX converter, not a complete
	 * LaTeX parser. The input is the nested scope produced after TeX-specific cleanup
	 * and tokenization; despite this method's historical name, callers should not assume
	 * that the scope has passed through {@link toRPN}.
	 *
	 * The converter recognizes the subset of commands handled in this routine, including
	 * fractions, integrals, sums, products, limits, square roots, infinity, real/imaginary
	 * part notation, and common trigonometric functions. Some command branches consume or
	 * modify child scopes while assembling the output, so callers should treat the supplied
	 * token tree as conversion input rather than as an immutable value to reuse afterward.
	 *
	 * Prefer the public TeX conversion API for ordinary LaTeX input.
	 *
	 * @param rpn - Preprocessed TeX token scope to convert.
	 * @returns Equivalent Nerdamer parser text for the supported TeX subset.
	 *
	 * @example
	 * ```ts
	 * // Internal conversion examples:
	 * // \frac{x}{2}   -> "(x)/(2)"
	 * // \int x^2 dx   -> "int(x^2,x)"
	 * ```
	 */
	parseTeXRPN(rpn: Scope) {
		const commands = ['int', 'int_', 'frac', 'sum_', 'prod_', 'lim_', 'infty', 'mathrm'];
		const functionMap = {
			Re: 'realpart',
			Im: 'imagpart',
			arccos: 'acos',
			arcsin: 'asin',
			arctan: 'atan',
		};
		const output: string[] = [];
		const { FUNCTION, VARIABLE } = Token;
		// Declare globally since it get increment in multiple loops
		let i: number;

		type Condition = (token: Token | Scope) => boolean;

		const find = (condition: Condition) => {
			const retval = new Scope('', -1);
			for (; i < rpn.length; i++) {
				const token = rpn[i];
				retval.push(token);
				if (condition(token)) {
					break;
				}
			}
			return retval;
		};

		const integral = (): [Scope, Token] => {
			// Get the tokens up until the first token that starts with d
			const tokens = find(token => {
				return /^d/.test((token as Token).value);
			});
			// The last items returned should be dx so we can remove that get the variable of integration but the remove the d
			const voi = Token.V(tokens.pop()!.text().substring(1));
			// Process the remainder
			if (tokens.at(-1)?.text() === COMMA) {
				tokens.pop();
			}
			return [tokens, voi];
		};

		const getLimits = (limits: Scope): [Scope, Scope] => {
			const start = new Scope('', -1);
			const end = new Scope('', -1);
			let target = start;
			for (let j = 0; j < limits.length; j++) {
				const token = limits[j];
				if (token.text() === 'to') {
					target = end;
					continue;
				}
				target.push(token);
			}
			return [start, end];
		};

		// Begin parsing of tokens
		for (i = 0; i < rpn.length; i++) {
			// Grab the token or Scope
			const token: Token | Scope = rpn[i];

			if (Scope.isScope(token)) {
				// Read it to an expression and put it to output
				const parsed = this.parseTeXRPN(token);
				output.push(`(${parsed})`);
			} else if (
				token.is(FUNCTION) ||
				(token.is(VARIABLE) && commands.includes(token.value))
			) {
				// Move forward to skip over the command
				i++;
				// Provide a "cleaned" optional function name
				const f = token.text().split('_')[0];

				const command = token.text();

				switch (token.value) {
					case 'cos':
					case 'sin':
					case 'tan':
					case 'sec':
					case 'csc':
					case 'cot':
					case 'acos':
					case 'arccos':
					case 'arcsin':
					case 'arctan':
					case 'asec':
					case 'acsc':
					case 'acot':
					case 'sqrt':
					case 'gcd':
					case 'Re':
					case 'Im': {
						output.push(
							`${(functionMap as Record<string, string>)[command] || command}(${this.parseTeXRPN(rpn[i] as Scope)})`
						);
						break;
					}
					case 'sum_':
					case 'prod_': {
						const lower = rpn[i] as Scope;
						const ios = lower.shift()!.text();
						// Remove the equal sign
						lower.shift();
						const start = this.parseTeXRPN(lower);
						// Just forward two spots
						i += 2;
						const end = this.parseTeXRPN(rpn[i] as Scope);
						output.push(
							`${f}(${this.parseTeXRPN(rpn[++i] as Scope)},${ios},${start},${end})`
						);
						break;
					}
					case 'lim_': {
						const [start, end] = getLimits(rpn[i] as Scope);
						output.push(`${f}(${this.parseTeXRPN(rpn[++i] as Scope)},${start},${end})`);
						break;
					}
					case 'int_': {
						// Get the tokens up until the first token that starts with d
						const [tokens, voi] = integral();
						const a = this.parseTeXRPN(tokens.shift()! as Scope);
						// discard the caret
						tokens.shift();
						const b = this.parseTeXRPN(tokens.shift()! as Scope);
						// return the output
						output.push(`defint(${this.parseTeXRPN(tokens)},${a},${b},${voi})`);
						break;
					}
					case 'int': {
						// Get the tokens up until the first token that starts with d
						const [tokens, voi] = integral();
						// return the output
						output.push(`${f}(${this.parseTeXRPN(tokens)},${voi})`);
						break;
					}
					case 'frac': {
						const a = this.parseTeXRPN(rpn[i] as Scope);
						const b = this.parseTeXRPN(rpn[++i] as Scope);
						output.push(`(${a})/(${b})`);
						// Get the next two
						break;
					}
					case 'infty': {
						output.push(INFINITY[0]);
						break;
					}
					case 'mathrm': {
						output.push(
							`${this.parseTeXRPN(rpn[i] as Scope)}(${this.parseTeXRPN(rpn[++i] as Scope)})`
						);
						break;
					}
					default: {
						output.push(`${command}(${this.parseTeXRPN(rpn[i] as Scope)})`);
					}
				}
			} else {
				// White space is only used when looking ahead and can be discarded at this point
				if (!/\s+/.test(token.value)) {
					output.push(token.value);
				}
			}
		}

		return output.join('');
	}

	/**
	 * Runs a callback while temporarily overriding one global parser setting.
	 *
	 * @remarks
	 * The previous value is restored in a `finally` block, so it is restored even if
	 * the callback throws. The override is process-wide for the duration of the
	 * synchronous callback; it is not an isolated setting attached to this parser
	 * instance. The `setting` parameter remains a string for compatibility, so callers
	 * should supply a valid parser setting name.
	 *
	 * @param setting - Parser setting to override for the callback.
	 * @param value - Temporary boolean value for that setting.
	 * @param callback - Synchronous parser operation to run under the temporary setting.
	 * @returns The parser entity returned by `callback`.
	 *
	 * @example
	 * ```ts
	 * const symbolicPi = Parser.scopedBlock('EVALUATE', false, () => {
	 *   return Parser.parse('pi');
	 * });
	 *
	 * symbolicPi.text(); // "pi"
	 * ```
	 */
	scopedBlock(setting: string, value: boolean, callback: () => ParserEntity) {
		return scopedBlock(setting, value, callback);
	}

	/**
	 * Changes one or more process-wide parser settings.
	 *
	 * @remarks
	 * Settings persist until changed again and are shared by the exported parser,
	 * parsers returned by {@link create}, and higher-level Nerdamer entry points.
	 * Use {@link scopedBlock} when a setting should apply only for one synchronous
	 * operation.
	 *
	 * This method accepts string keys for compatibility and does not validate arbitrary
	 * setting names at runtime. Callers should use the settings defined by Nerdamer
	 * rather than adding ad hoc properties to the settings object.
	 *
	 * @param setting - Setting name, or an object containing settings to update.
	 * @param value - New value when `setting` is supplied as a single name.
	 * @returns This parser instance for chaining.
	 *
	 * @example
	 * ```ts
	 * Parser.set('EVALUATE', false);
	 * Parser.set({ EVALUATE: false, ALLOW_IMPLICIT_MULTIPLICATION: true });
	 * ```
	 */
	set(setting: string | OptionsObject, value?: boolean | string | number | bigint) {
		if (typeof setting === 'object') {
			for (const x in setting) {
				(Settings as Record<string, unknown>)[x] = setting[x];
			}
		} else {
			(Settings as Record<string, unknown>)[setting] = value;
		}

		return this;
	}

	/**
	 * Registers, updates, or removes named parser constants.
	 *
	 * @remarks
	 * The constant registry is shared by parser instances, so changes affect subsequent
	 * parsing throughout the process. String-valued constants are reparsed and substituted
	 * whenever their name is encountered, even when evaluation mode is disabled. They also
	 * take precedence over a same-named value supplied in a parse call.
	 *
	 * Function-valued constants are deferred factories. They are invoked when evaluation
	 * mode is enabled; otherwise the constant name remains symbolic. Nerdamer's built-in
	 * `pi` and `e` factories use this mechanism to generate values at the active precision.
	 *
	 * Assign an empty string to an existing constant to remove it. Changing the registry
	 * does not rewrite expressions that have already been parsed.
	 *
	 * @param constants - Constant names mapped to parser text or to factories that return
	 * parser text.
	 *
	 * @example
	 * ```ts
	 * Parser.setConstants({ G: '6.674e-11' });
	 * Parser.parse('G').text(); // "0.00000000006674"
	 *
	 * Parser.setConstants({ G: '' });
	 * Parser.parse('G').text(); // "G"
	 * ```
	 */
	setConstants(constants: ParserConstants) {
		for (const name in constants) {
			const value = constants[name];
			if (typeof value === 'string' && value === '' && name in this.CONSTANTS) {
				delete this.CONSTANTS[name];
			} else {
				this.CONSTANTS[name] = value;
			}
		}
	}

	/**
	 * Changes the symbol Nerdamer treats as the imaginary unit.
	 *
	 * @remarks
	 * This is a process-wide change. The previous imaginary-unit name is removed from
	 * Nerdamer's restricted-variable list, the new name is reserved, and
	 * {@link Expression.imaginary} is updated. Existing expression trees are not renamed
	 * or reparsed, so changing this setting affects subsequent interpretation rather than
	 * rewriting values that already exist.
	 *
	 * @param variable - Parser variable name to reserve for the imaginary unit.
	 * @returns This parser instance for chaining.
	 *
	 * @example
	 * ```ts
	 * const previous = Parser.getI();
	 * Parser.setI('j');
	 * Parser.parse('3+2*j').text(); // "3+2*j"
	 * Parser.setI(previous);
	 * ```
	 */
	setI(variable: string) {
		const i = Expression.imaginary;
		// Remove it from the restricted list
		remove(RESTRICTED, i);
		// Point to the new variable
		Expression.imaginary = variable;
		// Add the new variable to the restricted list
		RESTRICTED.push(variable);
		return this;
	}

	/**
	 * Alias for {@link setI}.
	 *
	 * @param variable - Parser variable name to reserve for the imaginary unit.
	 * @returns This parser instance for chaining.
	 */
	setImaginary(variable: string) {
		return this.setI(variable);
	}

	/**
	 * Registers or updates an operator in the shared parser registry. Legacy `prefix`
	 * and `postfix` fields are accepted alongside the current metadata names.
	 */
	setOperator(definition: OperatorDefinition, action?: OperatorFunction) {
		const { prefix, postfix, ...metadata } = definition;
		const operator: Operator = {
			...metadata,
			isPostfix: metadata.isPostfix ?? postfix ?? false,
			isPrefix: metadata.isPrefix ?? prefix ?? false,
			iterates: metadata.iterates ?? true,
		};

		if (action) {
			_[operator.action] = action;
		} else if (!_[operator.action]) {
			throw new ParserError(`Unknown operator action ${operator.action}`);
		}

		this.operators[operator.operator] = operator;
		refreshOperatorSymbols();

		return this;
	}

	/**
	 * Sets the shared precision used by Decimal-backed numerical calculations.
	 *
	 * @remarks
	 * This delegates to {@link Rational.set}. It updates the global `decimal.js`
	 * precision and recomputes Nerdamer's finite-precision `pi` and `e` rational
	 * constants. Exact numerator/denominator arithmetic remains exact and does not
	 * become approximate merely because this setting changes.
	 *
	 * The setting is process-wide and affects parsers returned by {@link create} as
	 * well as the exported {@link Parser} singleton.
	 *
	 * @param precision - Number of significant digits for Decimal-backed work.
	 *
	 * @example
	 * ```ts
	 * const previous = Parser.getPrecision();
	 * Parser.setPrecision(50);
	 * Parser.getPrecision(); // 50
	 * Parser.setPrecision(previous);
	 * ```
	 */
	setPrecision(precision: number) {
		Rational.set({ precision: precision });
	}

	/**
	 * Tokenizes parser text into a nested scope tree.
	 *
	 * @remarks
	 * The tokenizer recognizes numbers, variables, functions, keyword and symbolic
	 * operators, and round/square/curly bracket scopes. Scientific notation is normalized
	 * to decimal token text and configured aliases such as `π` and `∞` are normalized to
	 * their parser names.
	 *
	 * When implicit multiplication is enabled, the normal mode inserts synthetic `*`
	 * tokens where adjacency implies multiplication. Square-bracket adjacency is deferred:
	 * the child scope is marked so {@link parseRPN} can decide at evaluation time whether
	 * the construct is indexing or multiplication after the left operand's type is known.
	 * Unknown variable-parenthesis adjacency keeps its synthetic multiplication token but
	 * is also marked so {@link toRPN} can reinterpret it as a function call if the name is
	 * registered before that scope is converted. `options.pure` suppresses inserted
	 * multiplication tokens and is used by conversion code that needs the original token
	 * relationships. `options.keepWhiteSpace` retains whitespace tokens instead of
	 * discarding them.
	 *
	 * This is a low-level parser-pipeline API. Ordinary callers should normally use
	 * {@link parse} instead of depending on token representation details.
	 *
	 * @param inputStr - Parser text to tokenize.
	 * @param options - Tokenization options. Set `pure` to suppress synthetic
	 * implicit-multiplication tokens, or `keepWhiteSpace` to retain whitespace tokens.
	 * @returns The root `Scope` containing the nested token tree.
	 * @throws {@link UnexpectedTokenError} When brackets are mismatched or token adjacency is invalid.
	 *
	 * @example
	 * ```ts
	 * const tokens = Parser.tokenize('2*x + 1');
	 * tokens.text(); // "2 * x + 1"
	 * ```
	 */
	tokenize(inputStr: string, options?: OptionsObject) {
		// options = Object.assign({ pure: false, keepWhiteSpace: false }, options);
		options = { ...{ pure: false, keepWhiteSpace: false }, ...options };

		// A key element to be aware of is that a terminating character is appended to the string.
		// This avoids an extra step since the last item is ignored. Brackets are wrapped in a Scope object
		// which preserves the type for later parsing.
		const terminator = '\u0000';
		// Input must be a string and append a terminator. This avoids having to iterate over undefined will be ignored at the end.
		let str = String(inputStr) + terminator;
		// Remove whitespace if allows
		if (!options.keepWhiteSpace) {
			str = str.replace(/\s+/g, ' ').trim();
		}

		// The list of operators supported at the time of tokenization
		const operators = Object.keys(this.operators).sort();
		const deferredLHSOperators = operators
			.filter(operator => this.operators[operator].deferLHSResolution)
			.sort((a, b) => b.length - a.length);
		// The column position that the token was found
		let col: number = 0;
		// The tokens container. A Scope object is used to denote tokens between brackets. This greatly simplifies
		// parsing in the future. This allows the tracking of the bracket type and enables parsing to be limited to one scope.
		const tokens = new Scope('top', 0);
		// The scope being appended to
		let scope = tokens;
		// The object to hold portions of the string between tokens. We create an object so we can pass it around by reference.
		const tokenBuffer: TokenBuffer = {
			tokenType: Token.UNDEFINED,
			chars: [],
			inputString: str,
			last: function () {
				return this.chars[this.chars.length - 1];
			},
			next: function (at: number) {
				return this.inputString.charAt(at + 1);
			},
			is(tokenType: string) {
				return this.tokenType === tokenType;
			},
			prev: function (at: number) {
				return this.inputString.charAt(at - 1);
			},
			scientificNumber: false,
		};

		// Traverse the string and look at each character
		for (; col < str.length; col++) {
			const ch = str.charAt(col);

			// Get the character type for comparison. Search for changes in the character type to determine
			// the end of a token.
			const charType = Token.getCharType(ch, col, tokenBuffer);

			// Brackets point to a new scope. Once one is encountered, update the target and point to the new scope
			// Subsequent tokens are now pushed to that scope
			if (tokenBuffer.is(Token.BRACKET)) {
				// Get the bracket.
				const bracketCharacter = tokenBuffer.last();
				if (bracketCharacter === undefined) {
					throw new ParserError('Bracket token is missing its character.');
				}
				const bracket = brackets[bracketCharacter];

				if (bracket.isOpen) {
					// Check to see if there's a variable on the token stack, if it's a variable, and if it's in functions
					const lastToken = scope[scope.length - 1] as Token;

					if (
						lastToken &&
						lastToken.type === Token.VARIABLE &&
						(lastToken.value in mathFunctionRegistry || lastToken.value === SYMBOLIC_ACCESSOR)
					) {
						// Mark it as a function
						lastToken.type = Token.FUNCTION;
					}

					// Implicit multiplication
					// Track whether to mark the new scope for deferred implicit multiplication
					let deferImplicitMultiply = false;

					if (
						lastToken &&
						!(lastToken.type === Token.FUNCTION || lastToken.type === Token.OPERATOR)
					) {
						if (bracket.type === 'square') {
							// Don't insert implicit multiplication before a square bracket.
							// Mark it so parseRPN can decide whether it's indexing or multiplication
							// once resolved types are known.
							deferImplicitMultiply = true;
						} else if (Settings.ALLOW_IMPLICIT_MULTIPLICATION) {
							if (bracket.type === 'parenthesis' && lastToken.type === Token.VARIABLE) {
								// Preserve the multiplication fallback and its precedence, but remember that
								// this name may become a registered function before deferred evaluation.
								deferImplicitMultiply = true;
							}

							// Push a multiplication token with position -1 to indicate that it was added
							if (!options.pure) {
								scope.push(new Token('*', Token.OPERATOR, -1));
							}
						} else {
							throw new UnexpectedTokenError(
								`Expected operator or function name but "${lastToken.value}" found!`
							);
						}
					}

					// Go down in scope to the new bracket
					scope = scope.addScope(bracket.type, col);

					if (deferImplicitMultiply) {
						scope.implicitMultiply = true;
					}
				} else {
					// Ensure that the brackets match
					const bracketsMatch = scope.type === bracket.type;

					if (bracketsMatch && bracket.type === 'parenthesis' && scope.parent) {
						const remainingInput = str.slice(col).trimStart();
						const deferredOperator = deferredLHSOperators.find(operator => {
							return remainingInput.startsWith(operator);
						});

						if (deferredOperator) {
							const parentScope = scope.parent;
							let lhsIndex = parentScope.length - 2;
							let lhsToken = parentScope[lhsIndex];

							// Unknown function notation normally inserts an implicit multiplication
							// before the parenthesis. The following operator has asked us not to
							// resolve that ambiguity yet, so remove only that synthetic operator.
							if (
								Token.isToken(lhsToken) &&
								lhsToken.type === Token.OPERATOR &&
								lhsToken.value === '*' &&
								lhsToken.position === -1
							) {
								parentScope.splice(lhsIndex, 1);
								lhsToken = parentScope[--lhsIndex];
							}

							if (
								Token.isToken(lhsToken) &&
								(lhsToken.type === Token.VARIABLE || lhsToken.type === Token.FUNCTION)
							) {
								lhsToken.type = Token.FUNCTION;
								scope.deferLHSResolution = true;
							}
						}
					}

					// We're done so we can go up in scope to the parent scope
					scope = scope.upperScope() as Scope;

					// If there's not scope or the types don't match then we have a mismatched bracket
					if (scope === undefined || !bracketsMatch) {
						throw new UnexpectedTokenError(
							`Missing opening bracket for "${tokenBuffer.last()}":${col}`
						);
					}
				}

				// Discard the bracket since it's no longer needed
				tokenBuffer.chars.pop();
			}

			// Handle single variables and brackets since we don't have compound brackets nor will we support them.
			// If the type has changed but doesn't equal UNDEFINED, then finalize it
			if (tokenBuffer.tokenType !== Token.UNDEFINED && tokenBuffer.tokenType !== charType) {
				// Collapse the tokenBuffer
				let tokenStr = tokenBuffer.chars.join(BLANK);
				// If there's an alias then use that instead
				const alias = ALIASES[tokenStr];
				if (alias) {
					tokenStr = alias;
				}
				// Mark the beginning of the token
				const SOT = col - tokenBuffer.chars.length;

				// In order to support keyword operators, we can check here
				if (operators.includes(tokenStr) && tokenBuffer.tokenType !== Token.PREFIX) {
					tokenBuffer.tokenType = Token.OPERATOR;
				}
				// type prefix operators and compound operators
				else if (tokenBuffer.is(Token.OPERATOR) && tokenBuffer.chars.length > 1) {
					let compoundOperatorStr = tokenBuffer.chars[0];
					// Get the largest possible operator chunks
					for (let i = 1; i < tokenBuffer.chars.length + 1; i++) {
						// Check if the current combination is an operator
						const tempStr = compoundOperatorStr + tokenBuffer.chars[i];
						// If it is then just make that the chunk
						if (tempStr in this.operators) {
							compoundOperatorStr = tempStr;
						} else {
							// Place it on the tokens stack
							scope.push(
								new Token(
									compoundOperatorStr,
									Token.OPERATOR,
									SOT + i - compoundOperatorStr.length
								)
							);
							// Reset the compound operator and move forward one position
							compoundOperatorStr = tokenBuffer.chars[i];
							// Clear the token string
							tokenStr = BLANK;
						}
					}
					// Reset the buffer
					tokenBuffer.chars = [];
					tokenBuffer.scientificNumber = false;
				}

				// Ignore blanks and spaces
				// Don't add the token if it's been cleared
				const isWhiteSpace = tokenStr === SPACE;
				if (isWhiteSpace && options.keepWhiteSpace) {
					scope.push(new Token(tokenStr, Token.SPACE, SOT));
				} else if (!(tokenStr === BLANK || isWhiteSpace)) {
					if (tokenBuffer.scientificNumber) {
						tokenStr = scientificToDecimal(tokenStr);
						tokenBuffer.scientificNumber = false;
					}

					const lastToken = scope[scope.length - 1];
					const lastOperator =
						Token.isToken(lastToken) && lastToken.type === Token.OPERATOR
							? this.operators[lastToken.value]
							: undefined;
					// Implicit multiplication
					if (
						lastToken &&
						((tokenBuffer.is(Token.VARIABLE) &&
							!(lastToken.type === Token.OPERATOR || lastToken.type === Token.PREFIX)) ||
							((tokenBuffer.is(Token.VARIABLE) || tokenBuffer.is(Token.NUMBER)) &&
								lastOperator?.isPostfix))
					) {
						if (Settings.ALLOW_IMPLICIT_MULTIPLICATION) {
							if (!options.pure) {
								// Push a multiplication token with position -1 to indicate that it was added
								scope.push(new Token('*', Token.OPERATOR, -1));
							}
						} else {
							throw new UnexpectedTokenError(
								`Expected operator or function name but "${(lastToken as Token).value}" found!`
							);
						}
					}

					// Allows for each single letter in a variable to be treated like an individual variable
					if (Settings.USE_SINGLE_LETTER_VARIABLES && !(tokenStr in mathFunctionRegistry)) {
						// Insert a new multiplication token between them and add them to the scope
						scope.push(
							...tokenStr
								.split('')
								.map(x => {
									return new Token(x, tokenBuffer.tokenType, -1);
									// Add the multiplication operator between them
								})
								.flatMap(x => [new Token('*', Token.OPERATOR, -1), x])
								.slice(1)
						);
					} else {
						// We can collapse the buffer
						scope.push(new Token(tokenStr, tokenBuffer.tokenType, SOT));
					}
				}

				// Clear the buffer and place last character on stack
				tokenBuffer.chars = [ch];
			} else {
				tokenBuffer.chars.push(ch);
			}
			tokenBuffer.tokenType = charType;
		}

		// If the last item in the tokens array is a scope and it has a parent then it's missing a closing bracket
		const lastItem = tokens[tokens.length - 1];
		if (Scope.isScope(lastItem) && lastItem.isOpen) {
			throw new UnexpectedTokenError(
				`Missing closing bracket for "${str.charAt(lastItem.column - 1)}":${lastItem.column}`
			);
		}

		return tokens;
	}

	/**
	 * Converts a tokenized scope to Nerdamer's nested Reverse Polish Notation form.
	 *
	 * @remarks
	 * The conversion uses the Shunting Yard algorithm to apply precedence,
	 * associativity, prefix/postfix rules, and bracket scoping. Nested scopes remain
	 * nested; each child scope is recursively converted rather than flattening the
	 * entire expression into one token array. Deferred adjacency markers are retained
	 * on child scopes so square-bracket indexing can be decided by {@link parseRPN} and
	 * newly registered function names can be recognized before parenthesis adjacency is
	 * committed to implicit multiplication.
	 *
	 * The returned `Scope` containers are new, but token objects are reused. Prefix
	 * detection can retag those shared `Token` objects while converting the input, so
	 * callers should not treat the original token tree as an immutable snapshot after
	 * this method has run.
	 *
	 * @param scope - Tokenized scope, normally produced by {@link tokenize}.
	 * @returns A new scope hierarchy containing the tokens in evaluation order.
	 * @throws {@link ParserError} When an invalid operator sequence requires a prefix operator.
	 *
	 * @example
	 * ```ts
	 * const tokens = Parser.tokenize('2 + 3 * x');
	 * const rpn = Parser.toRPN(tokens);
	 *
	 * rpn.text(); // "2 3 x * +"
	 * ```
	 */
	toRPN(scope: Scope) {
		// The output to be returned
		const output: Scope = new Scope(scope.type, scope.depth);
		// The operator stack
		const stack: Token[] = [];

		/**
		 * Return the last bracket on the stack. Must be guarded against an empty stack.
		 * @returns Bracket
		 */
		const peek = (): Token | undefined => {
			const lastToken: Token | undefined = stack[stack.length - 1];
			return lastToken;
		};

		const peekOperator = (): Operator | undefined => {
			const operatorToken = peek();
			if (operatorToken) {
				return operatorToken.resolvedOperator ?? this.operators[operatorToken.value];
			}
		};

		// Begin Shunting Yard
		for (let i = 0; i < scope.length; i++) {
			// Read the token
			let token: Token | Scope = scope[i];

			if (Scope.isScope(token)) {
				const previousToken = output[output.length - 1];
				const preserveArguments =
					Token.isToken(previousToken) &&
					previousToken.type === Token.FUNCTION &&
					mathFunctionRegistry[previousToken.value]?.deferArguments;

				if (preserveArguments) {
					// Keep deferred function arguments tokenized so the registered function can
					// control when and how often they are evaluated.
					output.push(token);
				} else {
					// Send the contents of the scope to be put into RPN
					const rpnScope = this.toRPN(token);
					// Preserve parser decisions made while tokenizing the original scope.
					rpnScope.implicitMultiply = token.implicitMultiply;
					rpnScope.deferLHSResolution = token.deferLHSResolution;
					rpnScope.deferRHSResolution = token.deferRHSResolution;
					output.push(rpnScope);
				}
			} else {
				const implicitOperator = scope[i + 1];
				const implicitScope = scope[i + 2];

				if (
					token.type === Token.VARIABLE &&
					Token.isToken(implicitOperator) &&
					implicitOperator.type === Token.OPERATOR &&
					implicitOperator.value === '*' &&
					implicitOperator.position === -1 &&
					Scope.isScope(implicitScope) &&
					implicitScope.type === 'parenthesis' &&
					implicitScope.implicitMultiply &&
					token.value in mathFunctionRegistry
				) {
					// The source was tokenized before this name was registered. Reclassify only
					// for this conversion so reusable deferred token scopes remain unchanged.
					token = new Token(token.value, Token.FUNCTION, token.position);
					i++;
				}

				// If it's a number then there's nothing else to evaluate so it can go straight to output
				switch (token.type) {
					case Token.OPERATOR: {
						// Get the operator
						let operator: Operator =
							token.resolvedOperator ?? this.operators[token.value];

						// Some operators can be either infix or postfix. Resolve that role from
						// syntax before prefix detection so the rest of Shunting Yard only sees
						// one unambiguous operator definition.
						if (operator.postfixVariant) {
							let nextIndex = i + 1;
							let nextToken: Token | Scope | undefined = scope[nextIndex];

							while (
								Token.isToken(nextToken) &&
								(nextToken.type === Token.SPACE ||
									nextToken.type === Token.UNDEFINED)
							) {
								nextToken = scope[++nextIndex];
							}

							if (
								nextToken === undefined ||
								(Token.isToken(nextToken) &&
									(nextToken.type === Token.OPERATOR ||
										nextToken.type === Token.PREFIX))
							) {
								operator = operator.postfixVariant;
								token.resolvedOperator = operator;
							}
						}

						// Get the last operator on the stack
						let lastOperator: Operator | undefined = peekOperator();

						/******************** PREFIX OPERATORS ********************/
						// We can now traverse the tokens since we've encountered an operator. Any remaining operators should be prefix operators
						// If not then complain.
						for (let j = i + 1; j < scope.length; j++) {
							const prefixOperator = scope[j] as Token;

							// If a non-operator token is encountered, then we're done. Or if we're at a postfix operator then the next operator may be a valid one and this assumption no longer holds true
							if (
								!prefixOperator ||
								prefixOperator.type !== Token.OPERATOR ||
								operator.isPostfix
							) {
								break;
							}

							// If the encountered operator is not a prefix then complain
							if (!this.operators[prefixOperator.value].isPrefix) {
								throw new ParserError(
									`Prefix operator expected but ${prefixOperator.value} encountered.`
								);
							}

							// We mark it so the next time it's encountered, it's placed to output immediately
							prefixOperator.type = Token.PREFIX;
						}

						// If we're at the beginning then it's a prefix operator so put it to output and break
						// If the last item on output is a prefix then this has to be a prefix
						const last = output[output.length - 1] as Token;
						if (
							operator.isPrefix &&
							(output.length === 0 ||
								(output.length > 0 && last && last.type === Token.PREFIX))
						) {
							token.type = Token.PREFIX;
							stack.push(token);
							break;
						}

						const greaterPrecedence = (): boolean => {
							let retval = false;

							if (lastOperator) {
								retval = shouldPopOperator(lastOperator, operator);

								// Prefixes have to happen first. For instance x^-1. The minus comes first but not for -x!.
								const lastOnStack = stack[stack.length - 1];
								if (
									!retval &&
									lastOnStack &&
									lastOnStack.type === Token.PREFIX &&
									operator.leftAssoc
								) {
									retval = true;
								}
							}

							return retval;
						};

						while (greaterPrecedence()) {
							// Move it to the output
							output.push(stack.pop() as Token);
							// Get the next operator on the stack
							lastOperator = peekOperator();
						}

						if (operator.deferLHSResolution) {
							const lhs = output[output.length - 1];
							if (Token.isToken(lhs) && lhs.type === Token.VARIABLE) {
								// Preserve a plain assignment target as its own scope so it can bypass
								// known-value substitution without changing evaluation of the right side.
								const deferredLHS = new Scope('', lhs.position);
								deferredLHS.deferLHSResolution = true;
								deferredLHS.push(output.pop() as Token);
								output.push(deferredLHS);
							}
						}

						if (operator.deferRHSResolution) {
							const deferredRHS = new Scope('', token.position);
							let rhsEnd = i + 1;

							for (; rhsEnd < scope.length; rhsEnd++) {
								const rhsToken = scope[rhsEnd];
								if (Token.isToken(rhsToken) && rhsToken.type === Token.OPERATOR) {
									const rhsOperator =
										rhsToken.resolvedOperator ?? this.operators[rhsToken.value];

									if (
										rhsOperator &&
										!shouldPopOperator(rhsOperator, operator)
									) {
										break;
									}
								}
								deferredRHS.push(rhsToken);
							}

							if (deferredRHS.length === 0) {
								throw new ParserError(message('malformedExpression'));
							}

							const deferredRPN = this.toRPN(deferredRHS);
							deferredRPN.deferRHSResolution = true;
							output.push(deferredRPN);
							i = rhsEnd - 1;
						}

						// Put the last operator on the stack
						stack.push(token);

						break;
					}
					case Token.BRACKET: {
						// Add brackets to output right away since they have the highest precedence
						const bracket: Bracket = brackets[String(token.value)];

						if (bracket.isOpen) {
							stack.push(token);
						} else {
							output.push(token);
							const lastToken: Token | undefined = peek();

							while (lastToken) {
								const popped = stack.pop() as Token;

								output.push(popped);

								// Exit if it's a matching bracket
								// The resulting RPN will be a reverse bracket. Nonetheless, it's a good way to know that every operation is
								// within a new scope.
								if (popped.type === Token.BRACKET) {
									if (brackets[token.value].matches === popped.value) {
										// Done
										break;
									}
								}
							}
						}

						break;
					}

					case Token.PREFIX: {
						// The prefix belongs to the next token so it goes to output right away
						stack.push(token);
						break;
					}
					case Token.UNDEFINED:
					case Token.SPACE: {
						// Do nothing and discard
						break;
					}
					default: {
						output.push(token);
						break;
					}
				}
			}
		}

		// Clear the stack
		while (stack.length) {
			const token = stack.pop() as Token;

			output.push(token);
		}

		return output;
	}
}

/**
 * The shared parser instance used by Nerdamer's ordinary parsing APIs.
 *
 * @remarks
 * {@link Parser.parse} is the primary notation-to-object entry point. State-changing
 * methods on this object can affect the rest of Nerdamer because settings, constants,
 * numeric precision, operator metadata, and the imaginary-unit symbol are process-wide.
 * Use scoped setting changes where possible, and do not assume that {@link Parser.create}
 * provides an isolated parser environment.
 *
 * @example
 * ```ts
 * Parser.parse('x^2 + 1').text(); // "1+x^2"
 * Parser.evaluate('2^10').text();  // "1024"
 * ```
 */
export const Parser = new ExpressionParser();