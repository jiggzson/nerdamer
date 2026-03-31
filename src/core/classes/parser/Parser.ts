import { remove } from '../../../utils/array';
import { Scope } from '../../common/classes/Scope';
import { brackets, ASSERTIVE_FUNCTIONS } from '../../common/common';
import { getOperators } from '../../common/functions/functions';
import { isEnumerable } from '../../common/functions/structuredEntityUtils';
import { mathFunctions } from '../../dispatch';
import { UnexpectedTokenError, ParserError, message } from '../../errors';
import { scientificToDecimal } from '../../functions/string';
import { RESTRICTED, Settings } from '../../Settings';
import { Collection } from '../collection/Collection';
import { Dictionary } from '../dictionary/Dictionary';
import { Expression } from '../expression/Expression';
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
	COLLECTION,
	ALIASES,
} from './constants';
import { scopedBlock, evaluate } from './helpers';
import { _, route } from './operations/functions';
import { Token } from './Token';
import { IndexedReference } from './wrappers/IndexedReference';
import { KeyValuePair } from './wrappers/KeyValuePair';

import type { Bracket, Operator } from '../../common/common';
import type { TokenBuffer } from './Token';
import type {
	Operation,
	PreFixFunction,
	PostFixFunction,
	ParserFunctionCall,
	OptionsObject,
	ParserValuesObject,
	ParserConstants,
	ParserInputType,
	ExpressionInputType,
	StructuredEntityType,
} from './types';

/**
 * The expression parser for nerdamer2.
 *
 * `ExpressionParser` is responsible for tokenizing, converting to Reverse Polish
 * Notation (RPN), and evaluating mathematical expression strings into {@link Expression}
 * objects. It also handles TeX input, bracket indexing, implicit multiplication,
 * and variable substitution.
 *
 * A singleton instance is exported as {@link Parser}. Use `Parser.parse()` as the
 * primary entry point for parsing strings.
 *
 * @example
 * ```ts
 * Parser.parse('2*x + 1').text()                     // "1+2*x"
 * Parser.parse('x^2', { x: 3 }).text()               // "9"
 * Parser.parse('sin(pi/4)').text()                    // "1/2*sqrt(2)"
 * ```
 */
class ExpressionParser {
	/**
	 * Important! This object is shared by all Parsers.
	 */
	CONSTANTS: ParserConstants = PARSER_CONSTANTS;
	/**
	 * A record of the known values for the Parser
	 */
	KNOWN_VALUES: Record<string, ParserInputType> = {};
	/**
	 * The maximum number of operators a compound operator can consist of
	 */
	MAX_COMPOUND_OPERATOR_LENGTH: number = 2;

	// Operators supported by the parser
	operators: Record<string, Operator> = getOperators();

	VALUE_SETS: string[] = [VECTOR, MATRIX];

	// Define whitespace to be ignored.
	WHITE_SPACE: string[] = [NEWLINE, TAB, RETURN];

	/**
	 * Extracts numeric indices from an index scope (e.g. [0], [1, 2]).
	 *
	 * Uses a fast path for scopes containing only literal numbers and comma operators,
	 * avoiding the overhead of a full parseRPN → Vector → Expression.create → evaluate → text → Number chain.
	 * Falls back to the full parse path for symbolic or computed indices (e.g. [n+1]).
	 */
	private extractIndices(
		scope: Scope,
		values?: ParserValuesObject,
		assertive?: boolean
	): number[] {
		const indices: number[] = [];
		let allNumeric = true;

		for (let k = 0; k < scope.length; k++) {
			const item = scope[k];
			if (item instanceof Scope) {
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

		if (allNumeric && indices.length > 0) {
			return indices;
		}

		// Slow path: full parse for symbolic/computed indices
		const indexExpr = this.parseRPN(scope, values, assertive);
		const result: number[] = [];

		if (Vector.isVector(indexExpr)) {
			for (let j = 0; j < indexExpr.elements.length; j++) {
				result.push(
					Number(Expression.create(indexExpr.elements[j]).evaluate()!.text()) -
						Settings.INDEX_BASE
				);
			}
		} else if (indexExpr.dataType === COLLECTION) {
			for (const el of (indexExpr as Collection).getElements()) {
				result.push(Number(Expression.create(el).evaluate()!.text()) - Settings.INDEX_BASE);
			}
		} else {
			result.push(
				Number(Expression.create(indexExpr).evaluate()!.text()) - Settings.INDEX_BASE
			);
		}

		return result;
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
			if (item instanceof Scope) {
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

	/**
	 * Returns a new, independent ExpressionParser instance.
	 *
	 * @returns A fresh ExpressionParser.
	 *
	 * @example
	 * ```ts
	 * const p = Parser.create();
	 * p.parse('x + 1').text()   // "1+x"
	 * ```
	 */
	create() {
		return new ExpressionParser();
	}

	/**
	 * Parses and numerically evaluates an expression string with `Settings.EVALUATE`
	 * enabled, collapsing symbolic constants to their numeric values.
	 *
	 * @param str - The expression string to evaluate.
	 * @param values - Optional variable substitutions.
	 * @returns The evaluated result.
	 *
	 * @example
	 * ```ts
	 * Parser.evaluate('2^10').text()                // "1024"
	 * Parser.evaluate('x+y', { x: 1, y: 2 }).text()  // "3"
	 * ```
	 */
	evaluate(str: string, values?: ParserValuesObject) {
		return evaluate(str, values);
	}

	/**
	 * Reads the current value of a parser setting.
	 *
	 * @param setting - The setting name (key of {@link Settings}).
	 * @returns The current value of the setting.
	 *
	 * @example
	 * ```ts
	 * Parser.get('EVALUATE')   // true
	 * ```
	 */
	get(setting: keyof typeof Settings) {
		return Settings[setting];
	}

	/**
	 * Returns the variable name currently used for the imaginary unit.
	 *
	 * @returns The imaginary variable string (default `"i"`).
	 *
	 * @example
	 * ```ts
	 * Parser.getI()   // "i"
	 * ```
	 */
	getI() {
		return Expression.imaginary;
	}

	/**
	 * Returns the current decimal precision used by the parser's rational arithmetic.
	 *
	 * @returns The precision value.
	 *
	 * @example
	 * ```ts
	 * Parser.getPrecision()   // 20
	 * ```
	 */
	getPrecision() {
		return Rational.get('precision');
	}

	/**
	 * Parses a string (or Expression-compatible input) into an Expression.
	 *
	 * This is the primary entry point for converting mathematical notation into
	 * the internal Expression tree. The input is tokenized, converted to RPN via
	 * the Shunting Yard algorithm, and then evaluated into an Expression.
	 *
	 * @param str - The expression string or Expression-compatible value.
	 * @param values - Optional variable substitutions applied during parsing.
	 * @returns The parsed result (an Expression or structured entity).
	 *
	 * @example
	 * ```ts
	 * Parser.parse('x^2 + 2*x + 1').text()               // "1+2*x+x^2"
	 * Parser.parse('a + b', { a: 3, b: 4 }).text()        // "7"
	 * Parser.parse('sin(pi/6)').text()                     // "1/2"
	 * ```
	 */
	parse(str: ExpressionInputType, values?: ParserValuesObject) {
		// Convert the values to Expressions
		if (values) {
			// We don't want to modify the object.
			const valuesObj: Record<string, Expression> = {};
			for (const value in values) {
				// Ignore values such as e or pi
				// if (SPECIAL.includes(value)) {
				// 	continue;
				// }
				valuesObj[value] = Expression.create(values[value]);
			}
			values = valuesObj;
		}
		// Tokenize the string and put it in RPN format
		const rpn: Scope = this.toRPN(this.tokenize(String(str)));
		// Read it into an expression.
		const retval = this.parseRPN(rpn, values);

		return retval;
	}

	/**
	 * Evaluates a Scope in Reverse Polish Notation (RPN) form into an Expression
	 * or structured entity.
	 *
	 * This is the core evaluation engine. It walks the RPN token stream, applying
	 * operators, resolving functions, performing substitutions, and handling bracket
	 * indexing and implicit multiplication.
	 *
	 * @param rpn - The expression in RPN form (a {@link Scope} of tokens).
	 * @param values - Optional variable substitutions.
	 * @param assertive - When `true`, uses assertive operator actions (e.g. for `assume`).
	 * @returns The evaluated result.
	 */
	parseRPN(rpn: Scope, values?: ParserValuesObject, assertive?: boolean) {
		// The output stack
		const output: ParserInputType[] = [];

		const operators = this.operators;
		// TODO: this needs to be applied at the operation level. It's somewhat clunky to apply this here.
		// const precision = this.getPrecision();

		function addToOutput(expression: ParserInputType) {
			if (expression === undefined) {
				throw new ParserError(message('malformedExpression'));
			}
			// Keep track of the precision used to make this calculation
			// TODO: this needs to be applied at the operation level. It's somewhat clunky to apply this here.
			// expression.precision = expression.precision || precision;
			output.push(expression);
		}

		// Begin parsing of tokens
		for (let i = 0; i < rpn.length; i++) {
			// Grab the token or Scope
			const token: Token | Scope = rpn[i];

			if (token instanceof Scope) {
				const lastOutput = output[output.length - 1];

				// A square scope is a candidate for indexing or implicit multiplication ONLY
				// when the tokenizer flagged it with implicitMultiply (meaning '[' directly
				// followed a non-operator/non-function token). Without that flag, the scope
				// is a standalone vector literal (e.g. in matrix([1,0],[2,3]) where commas
				// separate the square scopes).
				if (token.type === 'square' && token.implicitMultiply && lastOutput) {
					if (isEnumerable(lastOutput) || lastOutput instanceof IndexedReference) {
						//  Indexing: target[indices]
						const resolvedTarget =
							lastOutput instanceof IndexedReference
								? lastOutput.resolve()
								: lastOutput;

						let indices: number[] | string;

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
						addToOutput(
							new IndexedReference(
								resolvedTarget,
								indices
							) as unknown as ParserInputType
						);
					} else if (token.implicitMultiply && Settings.ALLOW_IMPLICIT_MULTIPLICATION) {
						//  Implicit multiplication: x[1,2] where x is not a structured entity
						const indexExpr = this.parseRPN(token, values, assertive);
						const mulFn = _['multiply'] as Operation;
						const a = output.pop()!;
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
					const operator = this.operators[token.value];

					// Get the last two elements on output
					let b = output.pop()!;

					let result: ParserInputType | ParserInputType[];

					// If it's a postfix operator then the operation occurs only on the previous element
					if (operator.isPostfix) {
						// Resolve IndexedReference if needed
						if (b instanceof IndexedReference) {
							b = b.resolve();
						}
						const fn = _[operator.action] as PostFixFunction;
						result = fn(b);
					} else {
						let a = output.pop()!;

						// Handle indexed assignment: target[indices]: value
						if (operator.action === 'assign' && a instanceof IndexedReference) {
							if (b instanceof IndexedReference) {
								b = b.resolve();
							}
							if (typeof a.indices === 'string') {
								(a.target as Dictionary).__set__(a.indices, b);
							} else {
								(a.target as StructuredEntityType).__set__(a.indices, b);
							}
							result = a.target;
						} else if (operator.action === 'mapTo') {
							// '=>' operator: create a key-value pair for Dictionary construction
							// 'a' is the key (should be a variable name), 'b' is the value
							if (a instanceof IndexedReference) {
								a = a.resolve();
							}
							if (b instanceof IndexedReference) {
								b = b.resolve();
							}
							const key = Expression.isExpression(a) ? a.text() : String(a.text());
							result = new KeyValuePair(key, b) as unknown as ParserInputType;
						} else {
							// Resolve any IndexedReference to its value for non-assign operators
							if (a instanceof IndexedReference) {
								a = a.resolve();
							}
							if (b instanceof IndexedReference) {
								b = b.resolve();
							}

							const fn = _[
								assertive ? operator.assertiveAction! : operator.action
							] as Operation;

							if (a.isEnumerable || b.isEnumerable) {
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
					const argsScope = rpn[++i];
					// Parse it as an argument. If the value is of the token is an assertive function then parseRPN needs to
					// know so it can modify it's behavior accordingly. This would be in the case of functions like assume where
					// the operators assert a value rather than compare it.
					const parsed = this.parseRPN(
						argsScope as Scope,
						values,
						ASSERTIVE_FUNCTIONS.includes(token.value)
					);

					const args =
						parsed.dataType === COLLECTION
							? (parsed as Collection).getElements()
							: [parsed];

					// Call the function
					// TODO: this needs to be fixed. A branching should occur between iterator functions calls and standard function calls
					// It might even be worth it to add an entry to the functions to state what it supports
					const result = (_.callFunction as ParserFunctionCall)(token.value, args);

					addToOutput(result);
				} else if (token.type === Token.PREFIX) {
					const e = output.pop()!;
					const prefixAction = `${operators[token.value].action}Prefix`;
					const fn = _[prefixAction] as PreFixFunction;
					// TODO: Rethink. What happens when a prefix is applied to a vector
					addToOutput(fn(e));
				} else {
					let expression;
					// Substitute values from the values object. A number is not considered a proper LH value.
					if (values && token.value in values && !token.is(Token.NUMBER)) {
						// expression = this.parse(String(values[token.value]), values);
						expression = Expression.create(values[token.value], undefined, true);
					} else if (token.value in this.KNOWN_VALUES && Settings.SUBSTITUTE) {
						expression = this.KNOWN_VALUES[token.value].copy();
					}
					// Substitute constants
					else if (Settings.EVALUATE && token.value in this.CONSTANTS) {
						const constant = this.CONSTANTS[token.value];
						// If it's a function, call it. Otherwise just use its value.
						// The reason for the callable is to make sure that we always use the correct precision
						// when evaluating pi, e
						expression = this.parse(
							typeof constant === 'function' ? constant() : constant,
							values
						);
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

		let retval: ParserInputType;
		// Since as function args can have multiple arguments in the output
		// the entire array gets returned. We do the same with
		if (rpn.type === 'square') {
			retval = new Vector(output);
		} else if (rpn.type === 'curly') {
			// If the output contains KeyValuePairs (from '=>' operators), build a Dictionary.
			// Otherwise build a ValuesSet as before.
			if (output.length > 0 && output[0] instanceof KeyValuePair) {
				const dict = new Dictionary();
				for (const item of output) {
					if (item instanceof KeyValuePair) {
						dict.set(item.key, item.value);
					}
				}
				retval = dict as unknown as ParserInputType;
			} else {
				retval = new ValuesSet(output);
			}
		} else if (output.length > 1) {
			retval = new Collection(output);
		} else {
			retval = output[0];
		}

		// Resolve any remaining IndexedReference (pure getter with no subsequent operator)
		if (retval instanceof IndexedReference) {
			retval = retval.resolve();
		}

		return retval;
	}

	/**
	 * Parses tokens from TeX (LaTeX) format into a plain expression string that
	 * can then be passed to {@link parse}.
	 *
	 * Supports common TeX commands including `\frac`, `\int`, `\sum_`, `\prod_`,
	 * `\lim_`, `\sqrt`, `\infty`, `\mathrm`, and standard trig function names
	 * (including `\arccos`, `\arcsin`, `\arctan`).
	 *
	 * @param rpn - The tokenized TeX expression in RPN form.
	 * @returns A plain expression string.
	 *
	 * @see https://www.overleaf.com/learn/latex/Operators
	 *
	 * @example
	 * ```ts
	 * // Internally used after tokenizing TeX input:
	 * // \frac{x}{2} → "(x)/(2)"
	 * // \int x^2 dx → "int(x^2, x)"
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

			if (token instanceof Scope) {
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
	 * Executes a callback with a parser setting temporarily set to a specific value.
	 * The setting is restored to its original value after the callback returns.
	 *
	 * @param setting - The setting name to modify.
	 * @param value - The temporary value for the setting.
	 * @param callback - The function to execute within the scoped setting.
	 * @returns The return value of the callback.
	 *
	 * @example
	 * ```ts
	 * Parser.scopedBlock('EVALUATE', false, () => {
	 *   return Parser.parse('pi');   // Returns symbolic "pi" even if EVALUATE is normally true
	 * })
	 * ```
	 */
	scopedBlock(setting: string, value: boolean, callback: () => ParserInputType) {
		return scopedBlock(setting, value, callback);
	}

	/**
	 * Modifies one or more parser settings.
	 *
	 * Can be called with a single setting name and value, or with an object of
	 * key-value pairs to set multiple settings at once.
	 *
	 * @param setting - The setting name or an object of settings.
	 * @param value - The value to set (when `setting` is a string).
	 * @returns This parser instance (for chaining).
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
	 * Registers or removes parser constants. Constants are symbolic names that the
	 * parser replaces with their defined values during evaluation.
	 *
	 * Set a constant's value to an empty string `""` to remove it.
	 *
	 * @param constants - An object mapping constant names to their string values
	 *   or factory functions.
	 *
	 * @example
	 * ```ts
	 * Parser.setConstants({ G: '6.674e-11' });
	 * Parser.parse('G').text()   // "6.674e-11"
	 *
	 * // Remove a constant
	 * Parser.setConstants({ G: '' });
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
	 * Changes the variable used to represent the imaginary unit.
	 *
	 * The previous imaginary variable is removed from the restricted list, and
	 * the new one is added. This affects how the parser interprets complex expressions.
	 *
	 * @param variable - The new imaginary variable name (e.g. `"j"`).
	 * @returns This parser instance (for chaining).
	 *
	 * @example
	 * ```ts
	 * Parser.setI('j');
	 * Parser.parse('3+2*j').text()   // "3+2*j"
	 * Parser.getI()                  // "j"
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
	 * Alias for {@link setI}. Changes the imaginary unit variable.
	 *
	 * @param variable - The new imaginary variable name.
	 * @returns This parser instance (for chaining).
	 */
	setImaginary(variable: string) {
		return this.setI(variable);
	}

	/**
	 * Sets the decimal precision used by the parser's rational arithmetic engine.
	 *
	 * @param precision - The number of significant digits.
	 *
	 * @example
	 * ```ts
	 * Parser.setPrecision(50);
	 * Parser.getPrecision()   // 50
	 * ```
	 */
	setPrecision(precision: number) {
		Rational.set({ precision: precision });
	}

	/**
	 * Breaks an input string into a tree of {@link Token} objects and {@link Scope} nodes.
	 *
	 * The tokenizer identifies numbers, variables, operators, functions, and brackets.
	 * Bracket contents are nested into child Scope objects, preserving the bracket type
	 * (`round`, `square`, `curly`). Implicit multiplication tokens are inserted when
	 * `Settings.ALLOW_IMPLICIT_MULTIPLICATION` is enabled.
	 *
	 * @param inputStr - The expression string to tokenize.
	 * @param options - Tokenizer options.
	 * @param options.pure - When `true`, suppresses implicit multiplication insertion.
	 * @param options.keepWhiteSpace - When `true`, preserves whitespace tokens.
	 * @returns A {@link Scope} containing the token tree.
	 * @throws {@link UnexpectedTokenError} On mismatched brackets or unexpected tokens.
	 *
	 * @example
	 * ```ts
	 * const tokens = Parser.tokenize('2*x + 1');
	 * // Returns a Scope tree of Token objects
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
			inputString: inputStr,
			last: function () {
				return this.chars[this.chars.length - 1] as string;
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
				const bracket = brackets[tokenBuffer.last() as string];

				if (bracket.isOpen) {
					// Check to see if there's a variable on the token stack, if it's a variable, and if it's in functions
					const lastToken = scope[scope.length - 1] as Token;

					if (
						lastToken &&
						lastToken.type === Token.VARIABLE &&
						lastToken.value in mathFunctions
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
					// Implicit multiplication
					if (
						lastToken &&
						tokenBuffer.is(Token.VARIABLE) &&
						!(lastToken.type === Token.OPERATOR || lastToken.type === Token.PREFIX)
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
					if (Settings.USE_SINGLE_LETTER_VARIABLES && !(tokenStr in mathFunctions)) {
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
		if (lastItem instanceof Scope && lastItem.isOpen) {
			throw new UnexpectedTokenError(
				`Missing closing bracket for "${str.charAt(lastItem.column - 1)}":${lastItem.column}`
			);
		}

		return tokens;
	}

	/**
	 * Converts a tokenized {@link Scope} into Reverse Polish Notation using the
	 * Shunting Yard algorithm.
	 *
	 * Handles operator precedence, associativity, prefix operators, and nested
	 * scopes (brackets). The resulting RPN Scope can be evaluated by {@link parseRPN}.
	 *
	 * @param scope - The tokenized Scope to convert.
	 * @returns A new Scope containing tokens in RPN order.
	 *
	 * @example
	 * ```ts
	 * const tokens = Parser.tokenize('2 + 3 * x');
	 * const rpn = Parser.toRPN(tokens);
	 * // RPN order: 2, 3, x, *, +
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
				return this.operators[operatorToken.value];
			}
		};

		// Begin Shunting Yard
		for (let i = 0; i < scope.length; i++) {
			// Read the token
			const token: Token | Scope = scope[i];

			if (token instanceof Scope) {
				// Send the contents of the scope to be put into RPN
				const rpnScope = this.toRPN(token);
				// Preserve the implicitMultiply flag set by the tokenizer
				rpnScope.implicitMultiply = token.implicitMultiply;
				output.push(rpnScope);
			} else {
				// If it's a number then there's nothing else to evaluate so it can go straight to output
				switch (token.type) {
					case Token.OPERATOR: {
						// Get the operator
						const operator: Operator = this.operators[token.value];
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
							// This operator has greater precedence and belongs on the stack
							if (!lastOperator) {
								return false;
							}

							// The second operator belongs on the stack first. This check has to happen first
							// to break the tie between ^ and ^ for instance.
							if (
								lastOperator.precedence === operator.precedence &&
								operator.leftAssoc
							) {
								return false;
							}

							// They're equal or the other is greater. For instance * goes before +, and + before - if + came first.
							if (lastOperator.precedence >= operator.precedence) {
								return true;
							}

							// Prefixes have to happen first. For instance x^-1. The minus comes first but not for -x!.
							const lastOnStack = stack[stack.length - 1];
							if (
								lastOnStack &&
								lastOnStack.type === Token.PREFIX &&
								!operator.leftAssoc
							) {
								return true;
							}

							return false;
						};

						while (greaterPrecedence()) {
							// Move it to the output
							output.push(stack.pop() as Token);
							// Get the next operator on the stack
							lastOperator = peekOperator();
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
 * The singleton parser instance used throughout nerdamer2.
 *
 * @example
 * ```ts
 * Parser.parse('x^2 + 1').text()               // "1+x^2"
 * Parser.evaluate('2^10').text()                // "1024"
 * Parser.set('EVALUATE', false);
 * Parser.parse('pi').text()                     // "pi"
 * ```
 */
export const Parser = new ExpressionParser();
