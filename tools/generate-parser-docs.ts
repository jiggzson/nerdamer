import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import * as algebraApi from '../src/api/algebra';
import * as assumptionsApi from '../src/api/assumptions';
import * as calculusApi from '../src/api/calculus';
import * as solveApi from '../src/api/solve';
import * as structuresApi from '../src/api/structures';
import { mathFunctionRegistry } from '../src/core/dispatch';
import type { ParserRegistrationLevel, ParserUsage } from '../src/core/dispatch';

export type ParserFunctionCategory =
	| 'Algebra'
	| 'Assumptions and sets'
	| 'Calculus'
	| 'Complex'
	| 'Linear algebra'
	| 'Math'
	| 'Nerdamer Language'
	| 'Polynomials'
	| 'Solving'
	| 'Special functions'
	| 'Trigonometry';

type DirectApiPackage = keyof typeof DIRECT_API_MODULES;

export interface ParserFunctionDirectApi {
	package: DirectApiPackage;
	name: string;
}

export interface ParserFunctionParameterDocumentation {
	name: string;
	description: string;
}

export interface ParserFunctionExampleDocumentation {
	input: string;
	output?: string;
}

export interface ParserFunctionDocumentationEntry {
	name: string;
	category: ParserFunctionCategory;
	usage: ParserUsage;
	minArgs: number;
	maxArgs: number;
	equationArgs: number[];
	distElWise: boolean;
	deferArguments: boolean;
	registrationLevel: ParserRegistrationLevel;
	syntax: string;
	summary?: string;
	parameters?: ParserFunctionParameterDocumentation[];
	examples?: ParserFunctionExampleDocumentation[];
	canonicalName?: string;
	aliases?: string[];
	directApi?: ParserFunctionDirectApi;
}

export interface ParserFunctionDocumentationArtifact {
	schemaVersion: 2;
	packageVersion: string;
	functions: ParserFunctionDocumentationEntry[];
}

interface AuthoredParserFunctionDocumentation {
	summary?: string;
	syntax?: string;
	parameters?: ParserFunctionParameterDocumentation[];
	examples?: ParserFunctionExampleDocumentation[];
}

const OUTPUT_PATH = resolve(__dirname, '../docs-data/parser-functions.json');
const PACKAGE_JSON_PATH = resolve(__dirname, '../package.json');

const DIRECT_API_MODULES = {
	'nerdamer/algebra': algebraApi,
	'nerdamer/assumptions': assumptionsApi,
	'nerdamer/calculus': calculusApi,
	'nerdamer/solve': solveApi,
	'nerdamer/structures': structuresApi,
} as const;

const CATEGORY_MEMBERS: Record<ParserFunctionCategory, readonly string[]> = {
	Trigonometry: [
		'cos', 'sin', 'tan', 'sec', 'csc', 'cot', 'acos', 'asin', 'atan', 'asec', 'acsc',
		'acot', 'atan2', 'cosh', 'sinh', 'tanh', 'sech', 'csch', 'coth', 'acosh', 'asinh',
		'atanh', 'asech', 'acsch', 'acoth',
	],
	Math: [
		'abs', 'sqrt', 'nthroot', 'cbrt', 'subst', 'log', 'exp', 'erf', 'erfc', 'gamma',
		'delta', 'heaviside', 'hypot', 'fact', 'factorial', 'dfact', 'expand', 'round', 'sign',
		'floor', 'ceil', 'ceiling', 'trunc', 'mod', 'modinv', 'numeric', 'parens', 'count', 'size', 'contains',
		'max', 'min',
	],
	Complex: ['imagpart', 'realpart', 'polarform', 'rectform', 'arg', 'csgn', 'conjugate'],
	'Linear algebra': [
		'matrix', 'imatrix', 'determinant', 'transpose', 'augment', 'rref', 'nullspace', 'dot', 'cross',
	],
	Polynomials: ['deg', 'content', 'div', 'divide'],
	Calculus: ['diff', 'integrate', 'limit', 'laplace', 'ilaplace', 'sum', 'product', 'defint', 'S', 'C'],
	Algebra: ['polyfactors', 'factor', 'simplify', 'partfrac', 'gcd', 'lcm', 'groebner', 'sqcomp'],
	Solving: ['solve', 'solveeqs'],
	'Assumptions and sets': ['assume', 'forget', 'unassign'],
	'Nerdamer Language': [
		'evaluate', 'return', 'break', 'continue', 'and', 'or', 'not', 'xor', 'iferror', 'iserror',
		'if', 'while', 'for', 'each', 'let', 'block',
	],
	'Special functions': ['isprime', 'fib', 'sinc', 'Shi', 'Si', 'Chi', 'Ci', 'Ei', 'Li'],
};

const ALIAS_GROUPS = [
	{ canonicalName: 'factorial', aliases: ['fact'] },
	{ canonicalName: 'ceil', aliases: ['ceiling'] },
] as const;

const DIRECT_API_BY_PARSER_NAME: Record<string, ParserFunctionDirectApi> = {
	factor: { package: 'nerdamer/algebra', name: 'factor' },
	polyfactors: { package: 'nerdamer/algebra', name: 'polyFactors' },
	isprime: { package: 'nerdamer/algebra', name: 'isPrime' },
	gcd: { package: 'nerdamer/algebra', name: 'gcd' },
	lcm: { package: 'nerdamer/algebra', name: 'lcm' },
	groebner: { package: 'nerdamer/algebra', name: 'groebner' },
	partfrac: { package: 'nerdamer/algebra', name: 'partfrac' },
	simplify: { package: 'nerdamer/algebra', name: 'simplify' },
	sqcomp: { package: 'nerdamer/algebra', name: 'completeSquare' },
	content: { package: 'nerdamer/algebra', name: 'content' },
	deg: { package: 'nerdamer/algebra', name: 'deg' },
	diff: { package: 'nerdamer/calculus', name: 'diff' },
	integrate: { package: 'nerdamer/calculus', name: 'integrate' },
	limit: { package: 'nerdamer/calculus', name: 'limit' },
	laplace: { package: 'nerdamer/calculus', name: 'laplace' },
	ilaplace: { package: 'nerdamer/calculus', name: 'ilaplace' },
	sum: { package: 'nerdamer/calculus', name: 'sum' },
	product: { package: 'nerdamer/calculus', name: 'product' },
	defint: { package: 'nerdamer/calculus', name: 'defint' },
	S: { package: 'nerdamer/calculus', name: 'S' },
	C: { package: 'nerdamer/calculus', name: 'C' },
	solve: { package: 'nerdamer/solve', name: 'solve' },
	solveeqs: { package: 'nerdamer/solve', name: 'solveSystem' },
	determinant: { package: 'nerdamer/structures', name: 'determinant' },
	nullspace: { package: 'nerdamer/structures', name: 'nullspace' },
	imatrix: { package: 'nerdamer/structures', name: 'imatrix' },
	dot: { package: 'nerdamer/structures', name: 'dot' },
	cross: { package: 'nerdamer/structures', name: 'cross' },
	assume: { package: 'nerdamer/assumptions', name: 'assume' },
};

const AUTHORED_DOCUMENTATION: Record<string, AuthoredParserFunctionDocumentation> = {
	numeric: {
		summary: 'Evaluates a numeric value to a finite number of significant decimal digits.',
		syntax: 'numeric(value[, precision])',
		parameters: [
			{ name: 'value', description: 'Value to evaluate numerically.' },
			{ name: 'precision', description: 'Optional positive number of significant digits. Defaults to the active Nerdamer precision.' },
		],
		examples: [
			{
				input: "nerdamer('numeric(1/3,5)').text()",
				output: '0.33333',
			},
			{
				input: "nerdamer('numeric([1/3,2/3],5)').text()",
				output: '[0.33333, 0.66667]',
			},
		],
	},
	evaluate: {
		summary: 'Evaluates a parser value immediately, optionally with substitutions, and returns the input unchanged if evaluation cannot complete.',
		syntax: 'evaluate(value[, substitutions]) | evaluate(value, variables, point)',
		parameters: [
			{ name: 'value', description: 'Expression, equation, or structured parser value to evaluate.' },
			{ name: 'substitutions', description: 'Optional Dictionary mapping variable names to substitution values.' },
			{ name: 'variables', description: 'Variable Vector used with point in the three-argument form.' },
			{ name: 'point', description: 'Value Vector corresponding positionally to variables.' },
		],
		examples: [
			{
				input: "nerdamer('evaluate(sin(2))').text()",
				output: '0.9092974268256816954',
			},
			{
				input: "nerdamer('evaluate([x+y,x*y],{x=>2,y=>3})').text()",
				output: '[5, 6]',
			},
			{
				input: "nerdamer('evaluate([u+v,u*v],[u,v],[2,3])').text()",
				output: '[5, 6]',
			},
		],
	},
	factor: {
		summary: 'Factors an expression symbolically.',
		syntax: 'factor(expression)',
		parameters: [
			{ name: 'expression', description: 'Expression to factor.' },
		],
		examples: [
			{
				input: "nerdamer('factor(x^2-1)').text()",
				output: '(-1+x)*(1+x)',
			},
		],
	},
	diff: {
		summary: 'Differentiates an expression symbolically.',
		syntax: 'diff(expression[, variable][, order])',
		parameters: [
			{ name: 'expression', description: 'Expression to differentiate.' },
			{ name: 'variable', description: 'Variable to differentiate with respect to.' },
			{ name: 'order', description: 'Optional derivative order.' },
		],
		examples: [
			{ input: "nerdamer('diff(x^3,x)').text()", output: '3*x^2' },
		],
	},
	integrate: {
		summary: 'Computes an indefinite integral symbolically.',
		syntax: 'integrate(expression[, variable])',
		parameters: [
			{ name: 'expression', description: 'Expression to integrate.' },
			{ name: 'variable', description: 'Optional integration variable.' },
		],
		examples: [
			{ input: "nerdamer('integrate(x^2,x)').text()" },
		],
	},
	S: {
		summary: 'Computes the normalized Fresnel sine integral.',
		syntax: 'S(x)',
		parameters: [{ name: 'x', description: 'Upper integration limit.' }],
		examples: [{ input: "nerdamer('S(x)').text()", output: 'S(x)' }],
	},
	C: {
		summary: 'Computes the normalized Fresnel cosine integral.',
		syntax: 'C(x)',
		parameters: [{ name: 'x', description: 'Upper integration limit.' }],
		examples: [{ input: "nerdamer('C(x)').text()", output: 'C(x)' }],
	},
	limit: {
		summary: 'Computes the symbolic limit of an expression.',
		syntax: 'limit(expression, variable, value[, direction])',
		parameters: [
			{ name: 'expression', description: 'Expression whose limit should be evaluated.' },
			{ name: 'variable', description: 'Variable approaching the requested value.' },
			{ name: 'value', description: 'Value approached by the variable.' },
			{ name: 'direction', description: 'Optional one-sided or two-sided limit direction.' },
		],
		examples: [
			{ input: "nerdamer('limit(sin(x)/x,x,0)').text()" },
		],
	},
	solve: {
		summary: 'Solves an expression or equation for a variable.',
		syntax: 'solve(expressionOrEquation, variable)',
		parameters: [
			{ name: 'expressionOrEquation', description: 'Expression or equation to solve.' },
			{ name: 'variable', description: 'Variable to solve for.' },
		],
		examples: [
			{ input: "nerdamer('solve(x^2-4,x)').text()" },
		],
	},
	matrix: {
		summary: 'Constructs a matrix from parser arguments.',
		syntax: 'matrix(row1[, row2, ...])',
		parameters: [
			{ name: 'row', description: 'One or more row vectors or row expressions.' },
		],
		examples: [
			{ input: "nerdamer('matrix([1,2],[3,4])').text()" },
		],
	},
	transpose: {
		summary: 'Returns the transpose of a matrix.',
		syntax: 'transpose(matrix)',
		parameters: [{ name: 'matrix', description: 'Matrix to transpose.' }],
		examples: [
			{
				input: "nerdamer('transpose(matrix([1,2],[3,4]))').text()",
				output: 'matrix([1, 3], [2, 4])',
			},
		],
	},
	augment: {
		summary: 'Horizontally joins two matrices with the same number of rows.',
		syntax: 'augment(left, right)',
		parameters: [
			{ name: 'left', description: 'Matrix placed on the left.' },
			{ name: 'right', description: 'Matrix appended on the right.' },
		],
		examples: [
			{
				input: "nerdamer('augment(matrix([1,2],[3,4]),matrix([5],[6]))').text()",
				output: 'matrix([1, 2, 5], [3, 4, 6])',
			},
		],
	},
	rref: {
		summary: 'Returns the reduced row-echelon form of a matrix.',
		syntax: 'rref(matrix[, prime])',
		parameters: [
			{ name: 'matrix', description: 'Matrix to reduce.' },
			{ name: 'prime', description: 'Optional modulus for finite-field arithmetic.' },
		],
		examples: [
			{
				input: "nerdamer('rref(matrix([1,2],[3,4]))').text()",
				output: 'matrix([1, 0], [0, 1])',
			},
		],
	},
	nullspace: {
		summary: 'Returns a vector containing a basis for the nullspace of a matrix.',
		syntax: 'nullspace(matrix[, prime])',
		parameters: [
			{ name: 'matrix', description: 'Matrix whose nullspace should be computed.' },
			{ name: 'prime', description: 'Optional modulus for finite-field arithmetic.' },
		],
		examples: [
			{
				input: "nerdamer('nullspace(matrix([1,2,3],[2,4,6]))').text()",
				output: '[[-2, 1, 0], [-3, 0, 1]]',
			},
		],
	},
	size: {
		summary: 'Returns the dimensions of a structured parser value.',
		syntax: 'size(value)',
		parameters: [
			{ name: 'value', description: 'Vector, matrix, set, collection, or dictionary whose dimensions should be returned.' },
		],
		examples: [
			{ input: "nerdamer('size([a,b,c])').text()", output: '[3]' },
			{ input: "nerdamer('size(matrix([1,2,3],[4,5,6]))').text()", output: '[2, 3]' },
		],
	},
	if: {
		summary: 'Evaluates one of two parser expressions based on a condition.',
		syntax: 'if(condition, whenTrue[, whenFalse])',
		parameters: [
			{ name: 'condition', description: 'Condition evaluated by the Nerdamer Language runtime.' },
			{ name: 'whenTrue', description: 'Expression evaluated when the condition is true.' },
			{ name: 'whenFalse', description: 'Optional expression evaluated when the condition is false.' },
		],
		examples: [
			{ input: "nerdamer('if(1,5,6)').text()", output: '5' },
		],
	},
	each: {
		summary: 'Evaluates a body once for each value in a parser container.',
		syntax: 'each(container, value, body)',
		parameters: [
			{ name: 'container', description: 'Vector, matrix, set, collection, or dictionary to traverse.' },
			{ name: 'value', description: 'Local variable bound to the current value.' },
			{ name: 'body', description: 'Deferred body evaluated for each value. Matrices are traversed in row-major order.' },
		],
		examples: [
			{
				input: "nerdamer('block(total:0,each([1,2,3],x,total:total+x),total)').text()",
				output: '6',
			},
		],
	},
	block: {
		summary: 'Evaluates a sequence of Nerdamer Language expressions as a block.',
		syntax: 'block(...)',
		parameters: [
			{ name: 'expression', description: 'One or more deferred expressions evaluated in sequence.' },
		],
		examples: [
			{ input: "nerdamer('block(return(7),9)').text()", output: '7' },
		],
	},
};

function compareNames(a: string, b: string): number {
	let retval = 0;

	if (a < b) {
		retval = -1;
	} else if (a > b) {
		retval = 1;
	}

	return retval;
}

function buildCategoryLookup(): Map<string, ParserFunctionCategory> {
	const retval = new Map<string, ParserFunctionCategory>();

	for (const [category, names] of Object.entries(CATEGORY_MEMBERS) as [
		ParserFunctionCategory,
		readonly string[],
	][]) {
		for (const name of names) {
			if (retval.has(name)) {
				throw new Error(`Parser function '${name}' is assigned to more than one category.`);
			}
			retval.set(name, category);
		}
	}

	return retval;
}

function buildAliasMetadata(registryNames: Set<string>) {
	const aliasToCanonical = new Map<string, string>();
	const canonicalToAliases = new Map<string, string[]>();

	for (const group of ALIAS_GROUPS) {
		if (!registryNames.has(group.canonicalName)) {
			throw new Error(`Parser alias canonical name '${group.canonicalName}' is not registered.`);
		}

		const aliases = [...group.aliases].sort(compareNames);
		for (const alias of aliases) {
			if (!registryNames.has(alias)) {
				throw new Error(`Parser alias '${alias}' is not registered.`);
			}
			aliasToCanonical.set(alias, group.canonicalName);
		}
		canonicalToAliases.set(group.canonicalName, aliases);
	}

	return { aliasToCanonical, canonicalToAliases };
}

function formatSyntax(name: string, minArgs: number, maxArgs: number): string {
	let retval: string;

	if (minArgs === -1 && maxArgs === -1) {
		retval = `${name}(...)`;
	} else if (maxArgs === -1) {
		const required = Array.from({ length: minArgs }, (_, index) => `arg${index + 1}`);
		retval = `${name}(${required.concat('...').join(', ')})`;
	} else {
		const args: string[] = [];
		for (let index = 0; index < maxArgs; index++) {
			const argument = `arg${index + 1}`;
			args.push(index < minArgs ? argument : `[${argument}]`);
		}
		retval = `${name}(${args.join(', ')})`;
	}

	return retval;
}

function getPackageVersion(): string {
	const packageData = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf8')) as { version: string };
	const retval = packageData.version;
	return retval;
}

function validateDirectApiReference(reference: ParserFunctionDirectApi): void {
	const api = DIRECT_API_MODULES[reference.package] as Record<string, unknown>;

	if (!(reference.name in api)) {
		throw new Error(
			`Parser documentation links to missing public export '${reference.package}:${reference.name}'.`
		);
	}
}

export function buildParserFunctionDocumentation(): ParserFunctionDocumentationArtifact {
	const categoryByName = buildCategoryLookup();
	const registryEntries = Object.entries(mathFunctionRegistry)
		.filter(([, entry]) => entry.level === 'system')
		.sort(([a], [b]) => compareNames(a, b));
	const registryNames = new Set(registryEntries.map(([name]) => name));
	const { aliasToCanonical, canonicalToAliases } = buildAliasMetadata(registryNames);

	const uncategorized = registryEntries
		.map(([name]) => name)
		.filter(name => !categoryByName.has(name));
	if (uncategorized.length > 0) {
		throw new Error(`Uncategorized parser functions: ${uncategorized.join(', ')}`);
	}

	const staleCategories = [...categoryByName.keys()].filter(name => !registryNames.has(name));
	if (staleCategories.length > 0) {
		throw new Error(`Documented parser functions missing from the registry: ${staleCategories.join(', ')}`);
	}

	const functions = registryEntries.map(([name, entry]): ParserFunctionDocumentationEntry => {
		const category = categoryByName.get(name);
		if (!category) {
			throw new Error(`Missing parser documentation category for '${name}'.`);
		}

		const canonicalName = aliasToCanonical.get(name);
		const authored = AUTHORED_DOCUMENTATION[canonicalName ?? name] ?? {};
		const directApi = DIRECT_API_BY_PARSER_NAME[name];
		if (directApi) {
			validateDirectApiReference(directApi);
		}

		const retval: ParserFunctionDocumentationEntry = {
			name,
			category,
			usage: entry.usage,
			minArgs: entry.minArgs,
			maxArgs: entry.maxArgs,
			equationArgs: [...(entry.equationArgs ?? [])],
			distElWise: entry.distElWise ?? false,
			deferArguments: entry.deferArguments ?? false,
			registrationLevel: entry.level,
			syntax: AUTHORED_DOCUMENTATION[name]?.syntax ?? formatSyntax(name, entry.minArgs, entry.maxArgs),
		};

		if (authored.summary) {
			retval.summary = authored.summary;
		}
		if (authored.parameters) {
			retval.parameters = authored.parameters.map(parameter => ({ ...parameter }));
		}
		if (authored.examples && !canonicalName) {
			retval.examples = authored.examples.map(example => ({ ...example }));
		}
		if (canonicalName) {
			retval.canonicalName = canonicalName;
		}
		const aliases = canonicalToAliases.get(name);
		if (aliases) {
			retval.aliases = [...aliases];
		}
		if (directApi) {
			retval.directApi = directApi;
		}

		return retval;
	});

	const retval: ParserFunctionDocumentationArtifact = {
		schemaVersion: 2,
		packageVersion: getPackageVersion(),
		functions,
	};

	return retval;
}

export function serializeParserFunctionDocumentation(): string {
	const retval = `${JSON.stringify(buildParserFunctionDocumentation(), null, 2)}\n`;
	return retval;
}

export function writeParserFunctionDocumentation(): void {
	mkdirSync(resolve(OUTPUT_PATH, '..'), { recursive: true });
	writeFileSync(OUTPUT_PATH, serializeParserFunctionDocumentation(), 'utf8');
}

if (require.main === module) {
	writeParserFunctionDocumentation();
}
