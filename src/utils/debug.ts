import { Collection } from '../core/classes/collection/Collection';
import { Dictionary } from '../core/classes/dictionary/Dictionary';
import { Equation } from '../core/classes/equation/Equation';
import { Expression } from '../core/classes/expression/Expression';
import { Matrix } from '../core/classes/matrix/Matrix';
import { Parser } from '../core/classes/parser/Parser';
import { preprocess } from '../core/classes/parser/preprocess';
import { Polynomial } from '../core/classes/polynomial/Polynomial';
import { ValuesSet } from '../core/classes/valuesSet/ValuesSet';
import { Vector } from '../core/classes/vector/Vector';
import { Scope } from '../core/common/classes/Scope';
import { mathFunctionRegistry } from '../core/dispatch';

import type { ParserValuesObject } from '../core/classes/parser/types';
import type { Term } from '../core/classes/polynomial/Term';
import type { ParserEntity } from '../core/types';

export interface DebugToken {
	kind: 'token';
	position: number;
	text: string;
	type: string | null;
	value: string;
}

export interface DebugScope {
	column: number;
	deferLHSResolution: boolean;
	deferRHSResolution: boolean;
	depth: number;
	implicitMultiply: boolean;
	isOpen: boolean;
	items: DebugScopeItem[];
	kind: 'scope';
	text: string;
	type: string;
	typedText: string;
}

export type DebugScopeItem = DebugScope | DebugToken;

export interface DebugExpression {
	args: DebugExpression[] | null;
	base: DebugExpression | null;
	dataType: string;
	deferred: boolean;
	elements: Record<string, DebugExpression> | null;
	kind: 'Expression';
	multiplier: string | null;
	name: string | null;
	power: DebugExpression | null;
	precision: number | null;
	text: string;
	type: number;
	typeName: string;
	value: string;
}

export interface DebugEquation {
	LHS: DebugExpression;
	RHS: DebugExpression;
	dataType: string;
	kind: 'Equation';
	text: string;
}

export interface DebugVector {
	dataType: string;
	elements: DebugEntity[];
	kind: 'Vector';
	text: string;
}

export interface DebugMatrix {
	dataType: string;
	elements: DebugExpression[][];
	kind: 'Matrix';
	text: string;
}

export interface DebugValuesSet {
	dataType: string;
	elements: DebugEntity[];
	kind: 'ValuesSet';
	text: string;
}

export interface DebugCollection {
	dataType: string;
	elements: DebugEntity[];
	kind: 'Collection';
	text: string;
}

export interface DebugDictionaryEntry {
	key: string;
	value: DebugEntity;
}

export interface DebugDictionary {
	dataType: string;
	entries: DebugDictionaryEntry[];
	kind: 'Dictionary';
	text: string;
}

export type DebugEntity =
	| DebugExpression
	| DebugEquation
	| DebugVector
	| DebugMatrix
	| DebugValuesSet
	| DebugCollection
	| DebugDictionary;

export interface DebugTerm {
	coefficient: DebugExpression;
	kind: 'Term';
	multidegree: number[];
	powers: Record<string, number>;
	text: string;
	totalPower: number;
	variables: string[];
}

export interface DebugPolynomial {
	expression: DebugExpression;
	isMultivariate: boolean;
	kind: 'Polynomial';
	ordering: string;
	terms: DebugTerm[];
	text: string;
	variables: string[];
}

export interface ParseInspection {
	normalizedSource: string;
	result: DebugEntity;
	rpn: DebugScope;
	source: string;
	tokens: DebugScope;
}

export function createTypesMap() {
	const map: Record<number, string> = {};
	for (const [type, value] of Object.entries(Expression.TYPES)) {
		map[value] = type;
	}

	return map;
}

/** Converts a parser token scope to JSON-safe diagnostic data. */
export function inspectTokens(scope: Scope): DebugScope {
	const items: DebugScopeItem[] = [];
	for (const item of scope) {
		let inspected: DebugScopeItem;
		if (Scope.isScope(item)) {
			inspected = inspectTokens(item);
		} else {
			inspected = {
				kind: 'token',
				value: item.value,
				type: item.type ?? null,
				position: item.position,
				text: item.toString(),
			};
		}
		items.push(inspected);
	}

	return {
		kind: 'scope',
		type: scope.type,
		depth: scope.depth,
		column: scope.column,
		isOpen: scope.isOpen,
		implicitMultiply: scope.implicitMultiply,
		deferLHSResolution: scope.deferLHSResolution,
		deferRHSResolution: scope.deferRHSResolution,
		text: scope.text(),
		typedText: scope.text(false),
		items,
	};
}

/** Converts an Expression tree to JSON-safe diagnostic data without changing it. */
export function inspectExpressionData(obj: Expression): DebugExpression {
	const typesMap = createTypesMap();
	let elements: Record<string, DebugExpression> | null = null;
	let args: DebugExpression[] | null = null;

	if (obj.elements) {
		elements = {};
		for (const [key, element] of Object.entries(obj.elements)) {
			elements[key] = inspectExpressionData(element);
		}
	}
	if (obj.args) {
		args = obj.args.map(argument => inspectExpressionData(argument));
	}

	return {
		kind: 'Expression',
		type: obj.type,
		typeName: typesMap[obj.type] ?? 'UNKNOWN',
		dataType: obj.dataType,
		text: obj.copy().text(),
		value: obj.value,
		name: obj.name ?? null,
		precision: obj.precision ?? null,
		deferred: obj.deferred,
		multiplier: obj.multiplier ? obj.multiplier.text() : null,
		power: obj.power ? inspectExpressionData(obj.power) : null,
		base: obj.base ? inspectExpressionData(obj.base) : null,
		elements,
		args,
	};
}

/** Converts any current parser entity to plain diagnostic data. */
export function inspectEntity(entity: ParserEntity): DebugEntity {
	let retval: DebugEntity;

	if (Expression.isExpression(entity)) {
		retval = inspectExpressionData(entity);
	} else if (Equation.isEquation(entity)) {
		retval = {
			kind: 'Equation',
			dataType: entity.dataType,
			text: entity.copy().text(),
			LHS: inspectExpressionData(entity.LHS),
			RHS: inspectExpressionData(entity.RHS),
		};
	} else if (Vector.isVector(entity)) {
		retval = {
			kind: 'Vector',
			dataType: entity.dataType,
			text: entity.copy().text(),
			elements: entity.elements.map(element => inspectEntity(element)),
		};
	} else if (Matrix.isMatrix(entity)) {
		retval = {
			kind: 'Matrix',
			dataType: entity.dataType,
			text: entity.copy().text(),
			elements: entity.elements.map(row => row.map(element => inspectExpressionData(element))),
		};
	} else if (ValuesSet.isValuesSet(entity)) {
		retval = {
			kind: 'ValuesSet',
			dataType: entity.dataType,
			text: entity.copy().text(),
			elements: entity.elements.map(element => inspectEntity(element)),
		};
	} else if (Dictionary.isDictionary(entity)) {
		retval = {
			kind: 'Dictionary',
			dataType: entity.dataType,
			text: entity.copy().text(),
			entries: entity.entries().map(([key, value]) => ({
				key,
				value: inspectEntity(value),
			})),
		};
	} else if (Collection.isCollection(entity)) {
		retval = {
			kind: 'Collection',
			dataType: entity.dataType,
			text: entity.copy().text(),
			elements: entity.getElements().map(element => inspectEntity(element)),
		};
	} else {
		throw new TypeError('Unsupported parser entity');
	}

	return retval;
}

/** Inspects one parser input using the same preprocessing as Parser.parse(). */
export function inspectParse(source: string, values?: ParserValuesObject): ParseInspection {
	const normalizedSource = preprocess(source, mathFunctionRegistry);
	const tokenScope = Parser.tokenize(normalizedSource);
	const tokens = inspectTokens(tokenScope);
	const rpn = inspectTokens(Parser.toRPN(tokenScope));
	const result = inspectEntity(Parser.parse(source, values));

	return {
		source,
		normalizedSource,
		tokens,
		rpn,
		result,
	};
}

/** Converts a polynomial Term to JSON-safe diagnostic data without touching its caches. */
export function inspectTermData(t: Term): DebugTerm {
	const multidegree = t.variables.map(variable => t.powers[variable] ?? 0);
	const totalPower = multidegree.reduce((sum, power) => sum + power, 0);

	return {
		kind: 'Term',
		text: t.copy().text(),
		coefficient: inspectExpressionData(t.coeff),
		powers: { ...t.powers },
		multidegree,
		totalPower,
		variables: [...t.variables],
	};
}

/** Converts a Polynomial to JSON-safe diagnostic data. */
export function inspectPolynomialData(p: Polynomial): DebugPolynomial {
	return {
		kind: 'Polynomial',
		text: new Polynomial(p).text(),
		expression: inspectExpressionData(p.expression),
		ordering: p.ordering,
		isMultivariate: p.isMultivariate,
		variables: [...p.variables],
		terms: p.terms.map(term => inspectTermData(term)),
	};
}

// https://stackoverflow.com/questions/57802057/eslint-configuring-no-unused-vars-for-typescript
export function printE(obj: Record<string, unknown>) {
	const output: string[] = [];
	for (const x in obj) {
		let str = String(obj[x]);
		if (typeof obj === 'object') {
			try {
				// Try to get a better representation that [object Object]
				str = JSON.stringify(obj[x]);
			} catch {}
		}
		output.push(`${x}: ${str}`);
	}
	console.log(output.join(', '));
};

export const printTokens = (tokens: Scope, valuesOnly: boolean = true) => {
	console.log(tokens.text(valuesOnly));
};

export const printRPN = (str: string) => {
	const source = preprocess(str, mathFunctionRegistry);
	printTokens(Parser.toRPN(Parser.tokenize(source)));
};

export function inspectExpression(obj: Expression, depth: number = 0) {
	const tab = '\t'.repeat(depth);
	const typesMap = createTypesMap();

	let elementsStr = tab + '{\n';
	if (obj.elements) {
		const elements = obj.getElements();
		for (const x in elements) {
			elementsStr += inspectExpression(elements[x], depth + 1);
		}
		elementsStr += `\n        ${tab}}`;
	} else {
		elementsStr = 'undefined';
	}

	let argsStr = tab + '[\n';
	if (obj.args) {
		const args = obj.getArguments();
		for (const arg of args) {
			argsStr += inspectExpression(arg, depth + 1);
		}
		argsStr += `\n        ${tab}]`;
	} else {
		argsStr = 'undefined';
	}

	return `
    ${tab}{
    ${tab}    type: ${typesMap[obj.type]},
    ${tab}    dataType: ${obj.dataType},
    ${tab}    precision: ${obj.precision},
    ${tab}    value: ${obj.value},
    ${tab}    multiplier: ${obj.multiplier ? obj.multiplier?.text() : obj.multiplier},
    ${tab}    power: ${obj.power ? obj.power?.text() : obj.power},
    ${tab}    name: ${obj.name},
    ${tab}    deferred: ${obj.deferred},
    ${tab}    elements: ${elementsStr},
    ${tab}    args: ${argsStr},
    ${tab}}`;
}

export function inspectTerm(t: Term) {
	return `<Term(${t.text()}) coeff: ${t.coeff}, mdg: ${t.getMultidegArray()}, total power: ${t.getTotalPower()}, vars: ${t.variables}>`;
}

export function inspectPolynomial(p: Polynomial) {
	let terms = '';
	for (const t of p.terms) {
		terms += `\t    ${inspectTerm(t)}\n`;
	}
	return `<Polynomial(${p.text()})
        terms: 
${terms}\tLM: ${p.LM()}
        ordering: ${p.ordering}
>`;
}

export function hr(symbol = '_', length = 70) {
	console.log(symbol.repeat(length));
}

export function simpleSerialize(obj: Record<string, unknown>) {
	let retval = '{';
	for (const x in obj) {
		retval += `${x}: ${obj[x]},`;
	}
	if (retval.at(-1) === ',') {
		retval = retval.slice(0, -1);
	}
	return retval + '}';
}
