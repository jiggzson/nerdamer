import { message, ParserError } from '../../errors';

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
	argumentStart: number;
	closingBracket: string;
	functionName?: string;
	statementBlockOpened?: boolean;
};

const BLOCK_FUNCTION = 'block';
const LET_FUNCTION = 'let';

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

function normalizeComments(input: string): string {
	let retval = '';
	let index = 0;

	while (index < input.length) {
		const opening = input.indexOf('#', index);
		if (opening === -1) {
			retval += input.slice(index);
			break;
		}

		retval += input.slice(index, opening);
		const delimiter = input.startsWith('##', opening) ? '##' : '#';
		const closing = input.indexOf(delimiter, opening + delimiter.length);
		if (closing === -1) {
			throw new ParserError(message('missingCommentDelimiter', { delimiter }));
		}

		retval += ' ';
		index = closing + delimiter.length;
	}

	return retval;
}

/**
 * Normalizes semicolon statement syntax onto the parser's existing block sequencing.
 *
 * Root-level statement sequences become an implicit block. Inside an explicit block,
 * semicolons separate block arguments just like commas. A statement sequence in LET's body is
 * wrapped in an implicit block so the sequence remains one LET body argument rather than being
 * mistaken for additional bindings. A trailing semicolon is discarded.
 */
function normalizeStatementSeparators(input: string): string {
	const scopes: StatementScope[] = [];
	let retval = '';
	let hasRootSequence = false;

	for (let index = 0; index < input.length; index++) {
		const character = input[index];

		if (character === '(' || character === '[' || character === '{') {
			const closingBracket = character === '(' ? ')' : character === '[' ? ']' : '}';
			retval += character;
			scopes.push({
				argumentStart: retval.length,
				closingBracket,
				functionName: character === '(' ? getPreviousIdentifier(input, index) : undefined,
			});
			continue;
		}

		if (character === ')' || character === ']' || character === '}') {
			const currentScope = scopes[scopes.length - 1];
			if (currentScope?.closingBracket === character) {
				if (currentScope.statementBlockOpened) {
					retval += ')';
				}
				scopes.pop();
			}
			retval += character;
			continue;
		}

		if (character === ',') {
			retval += character;
			const currentScope = scopes[scopes.length - 1];
			if (currentScope && !currentScope.statementBlockOpened) {
				currentScope.argumentStart = retval.length;
			}
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
			} else if (currentScope?.functionName === LET_FUNCTION) {
				if (!currentScope.statementBlockOpened) {
					retval =
						retval.slice(0, currentScope.argumentStart) +
						`${BLOCK_FUNCTION}(` +
						retval.slice(currentScope.argumentStart);
					currentScope.statementBlockOpened = true;
				}
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
			const startsWithOperatorBoundary =
				/[*/=<>:&|]/.test(firstArgumentCharacter) ||
				((firstArgumentCharacter === '+' || firstArgumentCharacter === '-') && /\s/.test(nextCharacter));

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
			if (depth === 0) break;
			depth--;
			previousSignificant = character;
			continue;
		}

		if (depth > 0) {
			if (!/\s/.test(character)) previousSignificant = character;
			continue;
		}

		if (consumeStatement) {
			if (character === ',') break;
			if (!/\s/.test(character)) previousSignificant = character;
			continue;
		}

		if (/\s/.test(character)) {
			if (multipleArguments && previousSignificant === ',') continue;
			break;
		}

		if (character === ',') {
			if (!multipleArguments) break;
			previousSignificant = character;
			continue;
		}

		const isPrefixSign =
			(character === '+' || character === '-') &&
			(index === start || previousSignificant === ',' || previousSignificant === '^');
		const isBinaryBoundary = /[+\-*/=<>:&|]/.test(character) && !isPrefixSign;
		if (isBinaryBoundary) break;

		previousSignificant = character;
	}

	return index;
}

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
