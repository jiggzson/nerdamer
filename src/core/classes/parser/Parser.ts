import { remove } from '../../../utils/array';
import { Scope } from '../../common/classes/Scope';
import { ASSERTIVE_FUNCTIONS } from '../../common/common';
import { getOperators } from '../../common/functions/functions';
import { isEnumerable } from '../../common/functions/structuredEntityUtils';
import {
	MATRIX,
	VECTOR,
} from '../../constants/entityTypes';
import { NEWLINE, TAB, RETURN, COMMA, SYMBOLIC_ACCESSOR } from '../../constants/parserSyntax';
import { PARSER_CONSTANTS } from '../../constants/parserValues';
import { INFINITY } from '../../constants/symbolNames';
import { convertTeXScope } from '../../converters/texScope';
import { mathFunctionRegistry } from '../../dispatch';
import { ParserError, NullError, message } from '../../errors';
import { RESTRICTED, scopedBlock, Settings } from '../../Settings';
import { Collection } from '../collection/Collection';
import { Dictionary } from '../dictionary/Dictionary';
import { Equation } from '../equation/Equation';
import { Expression } from '../expression/Expression';
import { Matrix } from '../matrix/Matrix';
import { Rational } from '../rational/Rational';
import { ValuesSet } from '../valuesSet/ValuesSet';
import { Vector } from '../vector/Vector';

import { NullSignal } from './controlFlowSignals';
import { _, callFunction, route } from './operations/functions';
import { preprocess } from './preprocess';
import { tokenize as tokenizeSyntax, toRPN as convertToRPN } from './syntax';
import { refreshOperatorSymbols, Token } from './Token';
import { IndexedReference } from './wrappers/IndexedReference';
import { KeyValuePair } from './wrappers/KeyValuePair';

import type { Operator, OperatorDefinition } from '../../common/common';
import type { ParserEntity, ExpressionInput } from '../../types';
import type {
	Operation,
	PreFixFunction,
	PostFixFunction,
	OptionsObject,
	ParserValuesObject,
	ParserConstants,
	ParserStackValue,
	DeferredArgumentOptions,
	DeferredFunctionArgument,
	DeferredOperation,
} from './types';

type OperatorFunction = Operation | PostFixFunction | PreFixFunction;

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
	 * Resolves a Dictionary index through the active parser scope.
	 *
	 * A plain variable index is resolved directly instead of reparsing its square
	 * scope. This matters for deferred scripting bodies, where LET installs the
	 * current binding in KNOWN_VALUES while excluding that name from inherited
	 * call-scoped substitutions.
	 *
	 * An unresolved symbolic index remains its own textual key, so d[x] still
	 * addresses the literal key "x". Computed indices continue through the normal
	 * parser path.
	 */
	private extractDictionaryKey(
		scope: Scope,
		values?: ParserValuesObject,
		assertive?: boolean
	): string {
		if (
			scope.length === 1 &&
			Token.isToken(scope[0]) &&
			scope[0].type === Token.VARIABLE
		) {
			const token = scope[0];
			const scopedValue = values?.[token.value];

			if (scopedValue !== undefined) {
				if (
					Expression.isExpression(scopedValue) ||
					Equation.isEquation(scopedValue) ||
					isEnumerable(scopedValue)
				) {
					return scopedValue.text();
				}
				return Expression.create(scopedValue, undefined, true).text();
			}

			if (Settings.SUBSTITUTE && token.value in this.KNOWN_VALUES) {
				return this.KNOWN_VALUES[token.value].text();
			}

			return token.value;
		}

		const parsed = this.parseRPN(scope, values, assertive);
		let key: ParserEntity = parsed;

		if (Vector.isVector(parsed) && parsed.elements.length === 1) {
			key = parsed.elements[0];
		} else if (Collection.isCollection(parsed) && parsed.getElements().length === 1) {
			key = parsed.getElements()[0];
		}

		return key.text();
	}

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
	 * Resolves or preserves symbolic bracket access after the target and indices have
	 * been parsed. Vector and Matrix arity is checked here so direct bracket parsing
	 * and reevaluation of a preserved accessor follow the same rules.
	 */
	private resolveSymbolicAccess(
		symbolicTarget: Expression,
		resolvedTarget: ParserEntity,
		indices: Expression[]
	): ParserEntity {
		if (indices.length > 2) {
			throw new ParserError(message('symbolicAccessMaxIndices'));
		}
		if (Vector.isVector(resolvedTarget) && indices.length !== 1) {
			throw new ParserError(message('symbolicIndexCount', { target: 'Vector', count: '1' }));
		}
		if (Matrix.isMatrix(resolvedTarget) && indices.length !== 2) {
			if (indices.length === 1) {
				throw new ParserError(message('symbolicMatrixRowNonScalar'));
			}
			throw new ParserError(message('symbolicIndexCount', { target: 'Matrix.cell', count: '2' }));
		}

		if (Vector.isVector(resolvedTarget) || Matrix.isMatrix(resolvedTarget)) {
			const numericIndices: number[] = [];
			for (const index of indices) {
				const numericIndex = Number(index.text());
				if (!Number.isFinite(numericIndex)) {
					return Expression.toAccessor(symbolicTarget, indices);
				}
				numericIndices.push(numericIndex - Settings.INDEX_BASE);
			}
			return resolvedTarget.__get__(numericIndices);
		}

		if (Expression.isExpression(resolvedTarget) && resolvedTarget.isPlainVariable()) {
			return Expression.toAccessor(symbolicTarget, indices);
		}

		throw new ParserError(message('symbolicAccessTargetType'));
	}

	/** Creates another spelling for an existing operator without changing its action. */
	aliasOperator(symbol: string, alias: string) {
		const source = this.operators[symbol];
		if (!source) {
			throw new ParserError(message('unknownOperator', { operator: symbol }));
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
	 * Reports whether a name is reserved by Nerdamer's parser or solver conventions.
	 *
	 * @remarks
	 * The result reflects the current process-wide parser state. In particular, changing
	 * the imaginary-unit symbol through {@link setI} removes the previous symbol from the
	 * restricted-name list and reserves the replacement. Solver-specific names such as
	 * `_n` and `all` are also reserved.
	 *
	 * @param name - Variable or symbol name to test.
	 * @returns Whether Nerdamer currently reserves the name.
	 */
	isReserved(name: string): boolean {
		return RESTRICTED.includes(name);
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
		const rpn: Scope = this.parseSyntax(String(str));
		// Read it into an expression.
		let retval: ParserEntity;
		try {
			retval = this.parseRPN(rpn, values);
		} catch (error) {
			if (NullSignal.isNullSignal(error)) { throw new NullError(message('nullValue')); }
			throw error;
		}

		return retval;
	}

	parseRPN(rpn: Scope, values?: ParserValuesObject, assertive?: boolean): ParserEntity {
		// The output stack
		const output: ParserStackValue[] = [];

		const operators = this.operators;

		function addToOutput(expression: ParserStackValue) {
			if (expression === undefined) {
				throw new ParserError(message('malformedExpression'));
			}
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

		const parseScope = (
			scope: Scope,
			scopeValues?: ParserValuesObject,
			scopeAssertive?: boolean,
			substitute?: boolean
		): ParserEntity => {
			const parse = () => this.parseRPN(scope, scopeValues, scopeAssertive);
			return typeof substitute === 'boolean'
				? scopedBlock('SUBSTITUTE', substitute, parse)
				: parse();
		};

		const parseArguments = (
			scope: Scope,
			argumentValues?: ParserValuesObject,
			functionAssertive?: boolean,
			substitute?: boolean
		): ParserEntity[] => {
			const parsed = parseScope(scope, argumentValues, functionAssertive, substitute);
			return Collection.isCollection(parsed) ? parsed.getElements() : [parsed];
		};

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

				return parseScope(
					rpn,
					argumentValues,
					functionAssertive,
					options?.substitute
				);
			};
		};

		const handleFunction = (token: Token, argsScope: Scope): ParserStackValue => {
			if (token.value === SYMBOLIC_ACCESSOR) {
				const preservedArgs = parseArguments(argsScope, undefined, assertive, false);
				const resolvedArgs = parseArguments(argsScope, values, assertive);

				if (
					preservedArgs.length < 2 ||
					preservedArgs.length !== resolvedArgs.length ||
					!Expression.isExpression(preservedArgs[0]) ||
					!preservedArgs[0].isPlainVariable()
				) {
					throw new ParserError(message('malformedInternalComponent', { component: 'SymbolicAccessor' }));
				}

				const symbolicTarget = preservedArgs[0];
				const resolvedTarget = resolvedArgs[0];
				const symbolicIndices: Expression[] = [];

				for (let j = 1; j < preservedArgs.length; j++) {
					if (!Expression.isExpression(preservedArgs[j])) {
						throw new ParserError(message('malformedInternalComponent', { component: 'SymbolicAccessor.index' }));
					}
					const resolvedIndex = resolvedArgs[j];
					if (!Expression.isExpression(resolvedIndex)) {
						throw new ParserError(message('symbolicAccessIndexScalar'));
					}
					symbolicIndices.push(resolvedIndex);
				}

				return this.resolveSymbolicAccess(symbolicTarget, resolvedTarget, symbolicIndices);
			}

			if (mathFunctionRegistry[token.value]?.deferArguments) {
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
				const args = normalizedScopes.map(argumentScope =>
					createDeferredArgument(
						() => this.toRPN(argumentScope),
						values,
						functionAssertive
					)
				);

				return callFunction(token.value, args);
			}

			if (argsScope.deferLHSResolution) {
				const args =
					argsScope.length > 0
						? [...parseArguments(argsScope, undefined, assertive, false)]
						: [];
				args.push(Expression.Variable(token.value));
				return new Collection(args);
			}

			return callFunction(
				token.value,
				parseArguments(
					argsScope,
					values,
					ASSERTIVE_FUNCTIONS.includes(token.value)
				)
			);
		};

		const handleOperator = (token: Token, index: number): ParserStackValue | undefined => {
			const operator = token.resolvedOperator ?? this.operators[token.value];
			let b = output.pop()!;

			if (operator.action === 'comma') {
				addToOutput(b);
				return undefined;
			}

			if (operator.isPostfix) {
				b = resolveStackValue(b);
				const fn = _[operator.action] as PostFixFunction;
				return fn(b);
			}

			let a = output.pop()!;
			const previousRPN = rpn[index - 1];
			const possibleFunction = rpn[index - 2];

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
				throw new ParserError(
					message('unsupportedFunction', { function: possibleFunction.value })
				);
			}

			if (operator.action === 'assign' && IndexedReference.isIndexedReference(a)) {
				let assignValue = true;
				try {
					b = typeof b === 'function' ? b() : resolveStackValue(b);
				} catch (error) {
					if (NullSignal.isNullSignal(error)) {
						assignValue = false;
					} else {
						throw error;
					}
				}
				if (assignValue) {
					a.set(b as ParserEntity);
					if (a.targetName) {
						this.KNOWN_VALUES[a.targetName] = a.target;
					}
				}
				return a.target;
			}

			if (operator.deferRHSResolution) {
				a = resolveStackValue(a);
				if (typeof b !== 'function') {
					throw new ParserError(message('malformedExpression'));
				}
				const fn = _[operator.action] as DeferredOperation;
				return fn(a, b);
			}

			a = resolveStackValue(a);
			b = resolveStackValue(b);

			if (operator.action === 'mapTo') {
				return new KeyValuePair(a.text(), b);
			}

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
				return route(a, b, operator.action);
			}
			return fn(a, b);
		};

		const handleScope = (token: Scope, index: number): void => {
			const lastOutput = output[output.length - 1];

			if (token.deferRHSResolution) {
				addToOutput(createDeferredArgument(() => token, values, assertive));
				return;
			}

			if (token.type === 'square' && token.implicitMultiply && lastOutput) {
				if (
					isEnumerable(lastOutput) ||
					IndexedReference.isIndexedReference(lastOutput)
				) {
					const resolvedTarget =
						IndexedReference.isIndexedReference(lastOutput)
							? lastOutput.resolve()
							: lastOutput;
					const previousRPN = rpn[index - 1];
					let targetName: string | undefined;

					if (
						Token.isToken(previousRPN) &&
						previousRPN.type === Token.VARIABLE &&
						!(values && previousRPN.value in values) &&
						previousRPN.value in this.KNOWN_VALUES
					) {
						targetName = previousRPN.value;
					}

					const indices = Dictionary.isDictionary(resolvedTarget)
						? this.extractDictionaryKey(token, values, assertive)
						: this.extractIndices(token, values, assertive);

					output.pop();
					if (
						Array.isArray(indices) &&
						indices.length > 0 &&
						Expression.isExpression(indices[0])
					) {
						const symbolicIndices = indices as Expression[];
						if (
							!Token.isToken(previousRPN) ||
							previousRPN.type !== Token.VARIABLE ||
							!(Vector.isVector(resolvedTarget) || Matrix.isMatrix(resolvedTarget))
						) {
							throw new ParserError(message('symbolicAccessNamedTargetRequired'));
						}
						addToOutput(
							this.resolveSymbolicAccess(
								Expression.Variable(previousRPN.value),
								resolvedTarget,
								symbolicIndices
							)
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
					return;
				}

				if (Expression.isExpression(lastOutput) && lastOutput.isPlainVariable()) {
					const indices = this.extractIndices(token, values, assertive);
					if (
						indices.length > 0 &&
						Expression.isExpression(indices[0])
					) {
						output.pop();
						addToOutput(
							this.resolveSymbolicAccess(
								lastOutput,
								lastOutput,
								indices as Expression[]
							)
						);
						return;
					}
				}

				const parsed = parseScope(token, values, assertive);
				if (Settings.ALLOW_IMPLICIT_MULTIPLICATION) {
					const mulFn = _['multiply'] as Operation;
					addToOutput(mulFn(resolveStackValue(output.pop()!), parsed));
				} else {
					addToOutput(parsed);
				}
				return;
			}

			addToOutput(
				token.deferLHSResolution
					? parseScope(token, undefined, assertive, false)
					: parseScope(token, values, assertive)
			);
		};

		const resolveToken = (token: Token): ParserEntity => {
			const constant = this.CONSTANTS[token.value];

			// User-defined constants take precedence over scoped values.
			if (typeof constant === 'string') {
				return this.parse(constant);
			}

			if (values && token.value in values && !token.is(Token.NUMBER)) {
				const scopedValue = values[token.value];
				if (
					Expression.isExpression(scopedValue) ||
					Equation.isEquation(scopedValue) ||
					isEnumerable(scopedValue)
				) {
					return scopedValue.copy();
				}
				return Expression.create(scopedValue, undefined, true);
			}

			if (token.value in this.KNOWN_VALUES && Settings.SUBSTITUTE) {
				return this.KNOWN_VALUES[token.value].copy();
			}

			// Built-in constants are factories so they evaluate at the active precision.
			if (Settings.EVALUATE && typeof constant === 'function') {
				return this.parse(constant(), values);
			}

			if (token.type === Token.FUNCTION) {
				return Expression.Function(token.value);
			}

			if (token.type === Token.VARIABLE) {
				return INFINITY.includes(token.value)
					? Expression.Inf()
					: Expression.Variable(token.value);
			}

			return Expression.Number(token.value);
		};

		const handlePrefix = (token: Token): ParserEntity => {
			const value = resolveStackValue(output.pop()!);
			const prefixAction = `${operators[token.value].action}Prefix`;
			const fn = _[prefixAction] as PreFixFunction;
			return fn(value);
		};

		for (let i = 0; i < rpn.length; i++) {
			const token = rpn[i];

			if (Scope.isScope(token)) {
				handleScope(token, i);
				continue;
			}

			if (token.type === Token.OPERATOR) {
				const result = handleOperator(token, i);
				if (result !== undefined) {
					addToOutput(result);
				}
			} else if (token.type === Token.FUNCTION) {
				addToOutput(handleFunction(token, rpn[++i] as Scope));
			} else if (token.type === Token.PREFIX) {
				addToOutput(handlePrefix(token));
			} else {
				addToOutput(resolveToken(token));
			}
		}

		let retval: ParserEntity;
		if (rpn.type === 'square') {
			retval = new Vector(resolveStackValues(output));
		} else if (rpn.type === 'curly') {
			if (output.length > 0 && KeyValuePair.isKeyValuePair(output[0])) {
				const dict = new Dictionary();
				for (const item of output as KeyValuePair[]) {
					dict.set(item.key, item.value);
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
	/**
	 * Converts source notation to the shared RPN representation without evaluating it.
	 * Symbolic evaluation and lightweight numerical compilers can consume the same syntax.
	 */
	parseSyntax(source: string): Scope {
		const normalized = preprocess(source, mathFunctionRegistry);
		return this.toRPN(this.tokenize(normalized));
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
		return convertTeXScope(rpn);
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
			throw new ParserError(message('unknownOperatorAction', { action: operator.action }));
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
		return tokenizeSyntax(inputStr, options, {
			operators: this.operators,
			functions: mathFunctionRegistry,
			settings: Settings,
		});
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
		return convertToRPN(scope, {
			operators: this.operators,
			functions: mathFunctionRegistry,
			settings: Settings,
		});
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
