import { Scope } from '../../common/classes/Scope';
import { brackets } from '../../common/common';
import {
	SPACE,
	DOT,
	BLANK,
	SYMBOLIC_ACCESSOR,
} from '../../constants/parserSyntax';
import { ALIASES } from '../../constants/symbolNames';
import { UnexpectedTokenError, ParserError, message } from '../../errors';
import { scientificToDecimal } from '../../functions/string';

import { Token } from './Token';

import type { Bracket, Operator } from '../../common/common';
import type { MathFunctionEntry } from '../../dispatch';
import type { SettingsType } from '../../Settings';
import type { TokenBuffer } from './Token';
import type { OptionsObject } from './types';

interface SyntaxContext {
	operators: Record<string, Operator>;
	functions: Record<string, MathFunctionEntry>;
	settings: Pick<
		SettingsType,
		'ALLOW_IMPLICIT_MULTIPLICATION' | 'USE_SINGLE_LETTER_VARIABLES'
	>;
}

function shouldPopOperator(stackOperator: Operator, incomingOperator: Operator) {
	let retval = stackOperator.precedence > incomingOperator.precedence;

	if (!retval && stackOperator.precedence === incomingOperator.precedence) {
		retval = incomingOperator.leftAssoc;
	}

	return retval;
}

export function tokenize(
	inputStr: string,
	options: OptionsObject | undefined,
	context: SyntaxContext
) {
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
	const operators = Object.keys(context.operators).sort();
	const deferredLHSOperators = operators
		.filter(operator => context.operators[operator].deferLHSResolution)
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
		if (charType === Token.CHARACTER && ch !== terminator) {
			throw new UnexpectedTokenError(
				message('unsupportedCharacter', {
					character: ch,
					position: String(col),
				})
			);
		}

		// Brackets point to a new scope. Once one is encountered, update the target and point to the new scope
		// Subsequent tokens are now pushed to that scope
		if (tokenBuffer.is(Token.BRACKET)) {
			// Get the bracket.
			const bracketCharacter = tokenBuffer.last();
			if (bracketCharacter === undefined) {
				throw new ParserError(message('parserBracketTokenMissingCharacter'));
			}
			const bracket = brackets[bracketCharacter];

			if (bracket.isOpen) {
				// Check to see if there's a variable on the token stack, if it's a variable, and if it's in functions
				const lastToken = scope[scope.length - 1] as Token;

				if (
					lastToken &&
					lastToken.type === Token.VARIABLE &&
					(lastToken.value in context.functions || lastToken.value === SYMBOLIC_ACCESSOR)
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
					} else if (context.settings.ALLOW_IMPLICIT_MULTIPLICATION) {
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
							message('expectedOperatorOrFunction', { value: lastToken.value })
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
						message('missingOpeningBracket', {
							bracket: String(tokenBuffer.last()),
							position: String(col),
						})
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
					if (tempStr in context.operators) {
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
				if (tokenBuffer.is(Token.NUMBER) && tokenStr.indexOf(DOT) !== tokenStr.lastIndexOf(DOT)) {
					throw new UnexpectedTokenError(
						message('malformedNumericLiteral', { literal: tokenStr, position: String(SOT) })
					);
				}
				if (tokenBuffer.scientificNumber) {
					tokenStr = scientificToDecimal(tokenStr);
					tokenBuffer.scientificNumber = false;
				}

				const lastToken = scope[scope.length - 1];
				const lastOperator =
					Token.isToken(lastToken) && lastToken.type === Token.OPERATOR
						? context.operators[lastToken.value]
						: undefined;
				// Implicit multiplication
				if (
					lastToken &&
					((tokenBuffer.is(Token.VARIABLE) &&
						!(lastToken.type === Token.OPERATOR || lastToken.type === Token.PREFIX)) ||
						(tokenBuffer.is(Token.NUMBER) && Scope.isScope(lastToken)) ||
						((tokenBuffer.is(Token.VARIABLE) || tokenBuffer.is(Token.NUMBER)) &&
							lastOperator?.isPostfix))
				) {
					if (context.settings.ALLOW_IMPLICIT_MULTIPLICATION) {
						if (!options.pure) {
							// Push a multiplication token with position -1 to indicate that it was added
							scope.push(new Token('*', Token.OPERATOR, -1));
						}
					} else {
						throw new UnexpectedTokenError(
							message('expectedOperatorOrFunction', {
								value: (lastToken as Token).value,
							})
						);
					}
				}

				// Allows for each single letter in a variable to be treated like an individual variable
				if (context.settings.USE_SINGLE_LETTER_VARIABLES && !(tokenStr in context.functions)) {
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
			message('missingClosingBracket', {
				bracket: str.charAt(lastItem.column - 1),
				position: String(lastItem.column),
			})
		);
	}

	return tokens;
}


export function toRPN(scope: Scope, context: SyntaxContext) {
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
			return operatorToken.resolvedOperator ?? context.operators[operatorToken.value];
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
				context.functions[previousToken.value]?.deferArguments;

			if (preserveArguments) {
				// Keep deferred function arguments tokenized so the registered function can
				// control when and how often they are evaluated.
				output.push(token);
			} else {
				// Send the contents of the scope to be put into RPN
				const rpnScope = toRPN(token, context);
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
				token.value in context.functions
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
						token.resolvedOperator ?? context.operators[token.value];

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
						if (!context.operators[prefixOperator.value].isPrefix) {
							throw new ParserError(
								message('prefixOperatorExpected', { operator: prefixOperator.value })
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
									rhsToken.resolvedOperator ?? context.operators[rhsToken.value];

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

						const deferredRPN = toRPN(deferredRHS, context);
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
