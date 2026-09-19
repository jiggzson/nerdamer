import { ParserError } from '../../errors';

type FunctionMetadata = {
	bracketlessStatement?: boolean;
	maxArgs: number;
};

type FunctionRegistry = Record<string, FunctionMetadata>;

type BracketlessFunction = {
	argumentStart: number;
	consumeStatement: boolean;
	maxArgs: number;
	nameEnd: number;
	nameStart: number;
};

type StatementScope = {
	closingBracket: string;
	functionName?: string;
};

const BLOCK_FUNCTION = 'block';
const COMMENT_DELIMITER = '##';

function isIdentifierStart(character: string): boolean {
	return /[a-z_]/i.test(character);
}

function isIdentifierPart(character: string): boolean {
	return /[a-z0-9_]/i.test(character);
}

function getPreviousIdentifier(input: string, at: number): string | undefined {
	let end = at;
	while (end > 0 && /\s/.test(input[end - 1])) {
		end--;
	}

	let start = end;
	while (start > 0 && isIdentifierPart(input[start - 1])) {
		start--;
	}

	const identifier = input.slice(start, end);
	return identifier && isIdentifierStart(identifier[0]) ? identifier : undefined;
}

function getNextSignificantCharacter(input: string, at: number): string | undefined {
	let index = at;
	while (index < input.length && /\s/.test(input[index])) {
		index++;
	}
	return input[index];
}

/**
 * Removes paired-hash comments before any other parser-input normalization occurs.
 *
 * A comment begins at `##` and ends at the next `##`. Comment contents are replaced
 * with whitespace so adjacent tokens do not accidentally merge. A lone `#` is left
 * untouched and retains its ordinary parser meaning.
 */
function normalizeComments(input: string): string {
	let retval = '';
	let index = 0;

	while (index < input.length) {
		const opening = input.indexOf(COMMENT_DELIMITER, index);
		if (opening === -1) {
			retval += input.slice(index);
			break;
		}

		retval += input.slice(index, opening);
		const closing = input.indexOf(
			COMMENT_DELIMITER,
			opening + COMMENT_DELIMITER.length
		);
		if (closing === -1) {
			throw new ParserError(`Missing closing comment delimiter "${COMMENT_DELIMITER}".`);
		}

		retval += ' ';
		index = closing + COMMENT_DELIMITER.length;
	}

	return retval;
}

/**
 * Normalizes semicolon statement syntax onto the parser's existing block sequencing.
 *
 * Root-level statement sequences become an implicit block. Inside an explicit block,
 * semicolons separate block arguments just like the commas that already drive BLOCK's
 * deferred evaluation. A trailing semicolon before a closing bracket or comma is simply
 * discarded. Semicolons in other nested expression contexts are left untouched so the
 * ordinary parser can reject syntax whose sequencing semantics have not been defined.
 */
function normalizeStatementSeparators(input: string): string {
	const scopes: StatementScope[] = [];
	let retval = '';
	let hasRootSequence = false;

	for (let index = 0; index < input.length; index++) {
		const character = input[index];

		if (character === '(' || character === '[' || character === '{') {
			const closingBracket = character === '(' ? ')' : character === '[' ? ']' : '}';
			scopes.push({
				closingBracket,
				functionName: character === '(' ? getPreviousIdentifier(input, index) : undefined,
			});
			retval += character;
			continue;
		}

		if (character === ')' || character === ']' || character === '}') {
			const currentScope = scopes[scopes.length - 1];
			if (currentScope?.closingBracket === character) {
				scopes.pop();
			}
			retval += character;
			continue;
		}

		if (character === ';') {
			const nextCharacter = getNextSignificantCharacter(input, index + 1);
			const currentScope = scopes[scopes.length - 1];
			const isTrailingTerminator =
				nextCharacter === undefined ||
				nextCharacter === ',' ||
				nextCharacter === currentScope?.closingBracket;

			if (scopes.length === 0) {
				if (!isTrailingTerminator) {
					retval += ',';
					hasRootSequence = true;
				}
			} else if (isTrailingTerminator) {
				continue;
			} else if (currentScope?.functionName === BLOCK_FUNCTION) {
				retval += ',';
			} else {
				retval += character;
			}
			continue;
		}

		retval += character;
	}

	if (hasRootSequence) {
		retval = `${BLOCK_FUNCTION}(${retval})`;
	}

	return retval;
}

/**
 * Finds the right-most registered function that is separated from its argument by whitespace.
 * Processing from the inside out lets nested input such as `sin sin x` normalize without
 * introducing a separate parser mode.
 */
function findBracketlessFunction(
	input: string,
	functions: FunctionRegistry
): BracketlessFunction | undefined {
	let retval: BracketlessFunction | undefined;
	let index = 0;

	while (index < input.length) {
		if (!isIdentifierStart(input[index])) {
			index++;
			continue;
		}

		const nameStart = index;
		index++;
		while (index < input.length && isIdentifierPart(input[index])) {
			index++;
		}

		const nameEnd = index;
		const name = input.slice(nameStart, nameEnd);
		if (!(name in functions) || !/\s/.test(input[index] ?? '')) {
			continue;
		}

		while (index < input.length && /\s/.test(input[index])) {
			index++;
		}

		if (index < input.length) {
			const firstArgumentCharacter = input[index];
			const nextCharacter = input[index + 1] ?? '';
			// Whitespace around an ordinary binary operator must not turn a registered
			// function name used as a variable into a bracketless call. A sign glued to
			// its operand remains valid prefix syntax, as in `sin -x`.
			const startsWithOperatorBoundary =
				/[*/=<>:&|]/.test(firstArgumentCharacter) ||
				((firstArgumentCharacter === '+' || firstArgumentCharacter === '-') &&
					/\s/.test(nextCharacter));

			if (!startsWithOperatorBoundary) {
				retval = {
					argumentStart: index,
					consumeStatement: functions[name].bracketlessStatement === true,
					maxArgs: functions[name].maxArgs,
					nameEnd,
					nameStart,
				};
			}
		}
	}

	return retval;
}

function isOpeningBracket(character: string): boolean {
	return character === '(' || character === '[' || character === '{';
}

function isClosingBracket(character: string): boolean {
	return character === ')' || character === ']' || character === '}';
}

/**
 * Finds the end of one bracketless function application. Function application binds more
 * tightly than ordinary binary arithmetic but less tightly than powers and postfix operators.
 * Multi-argument functions keep comma-separated arguments in the same application.
 */
function findArgumentEnd(
	input: string,
	start: number,
	maxArgs: number,
	consumeStatement: boolean = false
): number {
	let depth = 0;
	let index = start;
	let previousSignificant = '';
	const multipleArguments = maxArgs !== 1;

	for (; index < input.length; index++) {
		const character = input[index];

		if (isOpeningBracket(character)) {
			depth++;
			previousSignificant = character;
			continue;
		}
		if (isClosingBracket(character)) {
			if (depth === 0) {
				break;
			}
			depth--;
			previousSignificant = character;
			continue;
		}

		if (depth > 0) {
			if (!/\s/.test(character)) {
				previousSignificant = character;
			}
			continue;
		}

		if (consumeStatement) {
			if (character === ',') {
				break;
			}
			if (!/\s/.test(character)) {
				previousSignificant = character;
			}
			continue;
		}

		if (/\s/.test(character)) {
			if (multipleArguments && previousSignificant === ',') {
				continue;
			}
			break;
		}

		if (character === ',') {
			if (!multipleArguments) {
				break;
			}
			previousSignificant = character;
			continue;
		}

		const isPrefixSign =
			(character === '+' || character === '-') &&
			(index === start || previousSignificant === ',' || previousSignificant === '^');
		const isBinaryBoundary = /[+\-*/=<>:&|]/.test(character) && !isPrefixSign;
		if (isBinaryBoundary) {
			break;
		}

		previousSignificant = character;
	}

	return index;
}

/**
 * Converts accepted parser shorthand to the ordinary notation consumed by the tokenizer.
 * Paired-hash comments are removed before root-level semicolon sequences are mapped to the
 * existing block construct and legacy bracketless function calls are normalized. Existing
 * parenthesized calls are untouched; only a registered function followed by whitespace is
 * considered a bracketless call.
 */
export function preprocess(input: string, functions: FunctionRegistry): string {
	let retval = normalizeComments(input);
	retval = normalizeStatementSeparators(retval);
	let bracketless = findBracketlessFunction(retval, functions);

	while (bracketless) {
		const argumentEnd = findArgumentEnd(
			retval,
			bracketless.argumentStart,
			bracketless.maxArgs,
			bracketless.consumeStatement
		);
		const name = retval.slice(bracketless.nameStart, bracketless.nameEnd);
		const argument = retval.slice(bracketless.argumentStart, argumentEnd);

		retval =
			retval.slice(0, bracketless.nameStart) +
			`${name}(${argument})` +
			retval.slice(argumentEnd);
		bracketless = findBracketlessFunction(retval, functions);
	}

	return retval;
}
