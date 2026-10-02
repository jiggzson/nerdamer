import { Scope } from '../../../common/classes/Scope';
import { AssignmentError, message, ParserError, UnexpectedInputError } from '../../../errors';
import { RESTRICTED } from '../../../Settings';
import { Expression } from '../../expression/Expression';
import { assertPlainVariableAndGetString } from '../../expression/utils';
import { ASSIGN } from '../constants';
import { NullSignal } from '../controlFlowSignals';
import { Parser } from '../Parser';
import { Token } from '../Token';

import { ReturnSignal, shouldConsumeLocalReturn } from './controlFlow';

import type { ExpressionInput, ParserEntity } from '../../../types';
import type { DeferredFunctionArgument } from '../types';

export function assign(a: ExpressionInput, b: ParserEntity | string | DeferredFunctionArgument): ParserEntity {
	a = Expression.create(a);
	if (Expression.isExpression(a) && !a.isPlainVariable()) {
		throw new UnexpectedInputError(message('plainVariableExpected', { input: String(a) }));
	}
	if (RESTRICTED.includes(a.value)) {throw new AssignmentError(message('restrictedVariableName', { name: a.value }));}

	let value: ParserEntity;
	try {
		if (typeof b === 'function') {value = b();}
		else if (typeof b === 'string') {value = Parser.parse(b);}
		else {value = b;}
	} catch (error) {
		if (NullSignal.isNullSignal(error)) {
			// A no-result RHS is assignment's one special case. It is equivalent to x:x:
			// preserve an existing binding, or leave an unbound name unresolved.
			return Parser.KNOWN_VALUES[a.value]?.copy() ?? a;
		}
		throw error;
	}

	Parser.KNOWN_VALUES[a.value] = value;
	return value;
}

export function normalizeLetArguments(argumentScopes: Scope[]): Scope[] {
	const normalizedScopes: Scope[] = [];
	for (let i = 0; i < argumentScopes.length; i++) {
		const argumentScope = argumentScopes[i];
		let assignmentIndex = -1;
		if (i < argumentScopes.length - 1) {
			for (let j = 0; j < argumentScope.length; j++) {
				const argumentToken = argumentScope[j];
				if (Token.isToken(argumentToken) && argumentToken.type === Token.OPERATOR && argumentToken.value === ASSIGN) {
					assignmentIndex = j; break;
				}
			}
		}
		if (assignmentIndex > 0 && assignmentIndex < argumentScope.length - 1) {
			const nameScope = new Scope(argumentScope.type, argumentScope.column);
			const valueScope = new Scope(argumentScope.type, argumentScope.column);
			for (let j = 0; j < assignmentIndex; j++) {nameScope.push(argumentScope[j]);}
			for (let j = assignmentIndex + 1; j < argumentScope.length; j++) {valueScope.push(argumentScope[j]);}
			normalizedScopes.push(nameScope, valueScope);
		} else {normalizedScopes.push(argumentScope);}
	}
	return normalizedScopes;
}

export function LET(...args: DeferredFunctionArgument[]): ParserEntity {
	if (args.length < 3 || args.length % 2 === 0) {throw new ParserError(message('letRequiresBindingsAndBody'));}
	const previousValues = new Map<string, ParserEntity>();
	const previouslyUndefined = new Set<string>();
	const localNames: string[] = [];
	let retval: ParserEntity;
	try {
		for (let i = 0; i < args.length - 1; i += 2) {
			const nameExpression = args[i]({ inheritValues: false, substitute: false });
			if (!Expression.isExpression(nameExpression)) {
				throw new UnexpectedInputError(message('plainVariableExpected', { input: nameExpression.text() }));
			}
			const name = assertPlainVariableAndGetString(nameExpression);
			const value = args[i + 1]({ excludeValues: localNames });
			if (!previousValues.has(name) && !previouslyUndefined.has(name)) {
				if (Object.prototype.hasOwnProperty.call(Parser.KNOWN_VALUES, name)) {previousValues.set(name, Parser.KNOWN_VALUES[name]);}
				else {previouslyUndefined.add(name);}
			}
			assign(nameExpression, value);
			if (!localNames.includes(name)) {localNames.push(name);}
		}
		try { retval = args[args.length - 1]({ excludeValues: localNames }); }
		catch (error) {
			if (shouldConsumeLocalReturn() && ReturnSignal.isReturnSignal(error)) {retval = error.value;}
			else {throw error;}
		}
	} finally {
		for (const [name, value] of previousValues) {Parser.KNOWN_VALUES[name] = value;}
		for (const name of previouslyUndefined) {delete Parser.KNOWN_VALUES[name];}
	}
	return retval;
}

export function unassign(x: Expression | string | DeferredFunctionArgument): Expression {
	let variable: Expression | string;
	let name: string;
	if (typeof x === 'function') {
		const parsed = x({ inheritValues: false, substitute: false });
		if (!Expression.isExpression(parsed)) {throw new UnexpectedInputError(message('plainVariableExpected', { input: parsed.text() }));}
		variable = parsed;
	} else {variable = x;}
	if (Expression.isExpression(variable)) {name = assertPlainVariableAndGetString(variable);}
	else {name = variable;}
	delete Parser.KNOWN_VALUES[name];
	return Expression.create(variable);
}
