import { Scope } from '../../../common/classes/Scope';
import {
	AssignmentError,
	message,
	ParserError,
	UnexpectedInputError,
} from '../../../errors';
import { RESTRICTED } from '../../../Settings';
import { Expression } from '../../expression/Expression';
import { assertPlainVariableAndGetString } from '../../expression/utils';
import { ASSIGN } from '../constants';
import { Parser } from '../Parser';
import { Token } from '../Token';

import type { ExpressionInput, ParserEntity } from '../../../types';
import type { DeferredFunctionArgument } from '../types';

/**
 * Adds a known value to a variable in the parser
 * @param a
 * @param b
 */
export function assign(a: ExpressionInput, b: ParserEntity | string) {
	a = Expression.create(a);

	if (typeof b === 'string') {
		b = Parser.parse(b);
	}

	// We can only assign to plain variables
	if (Expression.isExpression(a) && !a.isPlainVariable()) {
		throw new UnexpectedInputError(message('plainVariableExpected', { input: String(a) }));
	}

	// We cannot assign to restricted values
	if (RESTRICTED.includes(a.value)) {
		throw new AssignmentError(message('restrictedVariableName', { name: a.value }));
	}

	Parser.KNOWN_VALUES[a.value] = b;
	return b;
}

/**
 * Converts colon-style LET bindings into the alternating name/value scopes consumed by LET.
 */
export function normalizeLetArguments(argumentScopes: Scope[]): Scope[] {
	const normalizedScopes: Scope[] = [];

	for (let i = 0; i < argumentScopes.length; i++) {
		const argumentScope = argumentScopes[i];
		let assignmentIndex = -1;

		if (i < argumentScopes.length - 1) {
			for (let j = 0; j < argumentScope.length; j++) {
				const argumentToken = argumentScope[j];
				if (
					Token.isToken(argumentToken) &&
					argumentToken.type === Token.OPERATOR &&
					argumentToken.value === ASSIGN
				) {
					assignmentIndex = j;
					break;
				}
			}
		}

		if (assignmentIndex > 0 && assignmentIndex < argumentScope.length - 1) {
			const nameScope = new Scope(argumentScope.type, argumentScope.column);
			const valueScope = new Scope(argumentScope.type, argumentScope.column);

			for (let j = 0; j < assignmentIndex; j++) {
				nameScope.push(argumentScope[j]);
			}
			for (let j = assignmentIndex + 1; j < argumentScope.length; j++) {
				valueScope.push(argumentScope[j]);
			}

			normalizedScopes.push(nameScope, valueScope);
		} else {
			normalizedScopes.push(argumentScope);
		}
	}

	return normalizedScopes;
}

/**
 * Evaluates sequential local bindings and restores only those bindings after the body.
 *
 * Arguments are alternating variable/value pairs followed by a body expression. Each value
 * is evaluated after earlier bindings have been installed, so later initializers can reference
 * earlier locals. Ordinary assignment is reused for validation and storage. Any assignment to
 * a name not declared by LET keeps its normal parser behavior.
 *
 * @param args Deferred variable/value pairs followed by the deferred body.
 * @returns The body's result.
 */
export function LET(...args: DeferredFunctionArgument[]): ParserEntity {
	if (args.length < 3 || args.length % 2 === 0) {
		throw new ParserError(message('letRequiresBindingsAndBody'));
	}

	const previousValues = new Map<string, ParserEntity>();
	const previouslyUndefined = new Set<string>();
	const localNames: string[] = [];
	let retval: ParserEntity;

	try {
		for (let i = 0; i < args.length - 1; i += 2) {
			// Binding names are syntax, not values. Suppress both call-scoped and known-value
			// substitution while resolving the plain variable name.
			const nameExpression = args[i]({ inheritValues: false, substitute: false });

			if (!Expression.isExpression(nameExpression)) {
				throw new UnexpectedInputError(
					message('plainVariableExpected', { input: nameExpression.text() })
				);
			}

			const name = assertPlainVariableAndGetString(nameExpression);
			const value = args[i + 1]({ excludeValues: localNames });

			if (!previousValues.has(name) && !previouslyUndefined.has(name)) {
				if (Object.prototype.hasOwnProperty.call(Parser.KNOWN_VALUES, name)) {
					previousValues.set(name, Parser.KNOWN_VALUES[name]);
				} else {
					previouslyUndefined.add(name);
				}
			}

			assign(nameExpression, value);
			if (!localNames.includes(name)) {
				localNames.push(name);
			}
		}

		retval = args[args.length - 1]({ excludeValues: localNames });
	} finally {
		for (const [name, value] of previousValues) {
			Parser.KNOWN_VALUES[name] = value;
		}
		for (const name of previouslyUndefined) {
			delete Parser.KNOWN_VALUES[name];
		}
	}

	return retval;
}

/**
 * Removes a known parser value by variable name.
 *
 * Parser calls defer the argument so an assigned variable can be read as its name rather than
 * substituted value. Direct callers may still pass an Expression or string.
 *
 * @param x Variable name or deferred variable-name expression.
 */
export function unassign(x: Expression | string | DeferredFunctionArgument): Expression {
	let variable: Expression | string;
	let name: string;

	if (typeof x === 'function') {
		const parsed = x({ inheritValues: false, substitute: false });
		if (!Expression.isExpression(parsed)) {
			throw new UnexpectedInputError(
				message('plainVariableExpected', { input: parsed.text() })
			);
		}
		variable = parsed;
	} else {
		variable = x;
	}

	if (Expression.isExpression(variable)) {
		name = assertPlainVariableAndGetString(variable);
	} else {
		name = variable;
	}

	delete Parser.KNOWN_VALUES[name];
	return Expression.create(variable);
}
