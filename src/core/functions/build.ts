import { Expression } from '../classes/expression/Expression';
import { definitions, collectConstants } from '../functions/numeric';

import type { ExpressionInputType, JsFunction } from '../classes/parser/types';

/**
 * Compiles a pure JS function useful for high iterations which require low precision.
 *
 * - Recursively collects dependencies which must be explicitly set when constructing
 * numeric functions.
 *
 * @param x - The expression being converted to a function
 * @param argsArray - The array of arguments in their order
 * @returns The compiled JS function
 *
 * @example
 * ```ts
 * build('x-y')(9, 7);				// 2
 * build('x-y', ['y', 'x'])(9, 7);	// -2
 * build('erf(x)+2')(9)				// 3
 * ```
 */
export function build(x: ExpressionInputType, argsArray?: string[]): (...args: number[]) => number {
	x = Expression.create(x);
	// Collect the constants such as e, pi, or any other constants defined by the functions.
	const constants = collectConstants(x);
	/**
	 * The body for the most part is just a expression. The function definitions get loaded
	 * from the numeric functions object.
	 */
	const body = `${x};`
		//The caret symbol gets replaced because it has an entirely different meaning to JavaScript
		.replace(/\^/g, '**');
	/**
	 * Collect the functions in the string and import their definitions. Basically for each
	 * function call in the expression a definition in the form const fn = ...; is added
	 */
	const imports: [string[], JsFunction[]] = [[], []];
	x.functions().forEach(e => {
		importDeps(e, imports);
	});

	/**
	 * Compile the imports string
	 */
	let compiledImports = '';
	for (let i = 0; i < imports[0].length; i++) {
		compiledImports += `var ${imports[0][i]} = ${imports[1][i]};\n`;
	}

	/**
	 * If no variables array is provided then it's generated;
	 */
	argsArray = argsArray || x.variables().sort();
	// Construction the function definition
	const functionDef = `${constants}${compiledImports} return ${body}`;

	return new Function(...argsArray!, functionDef) as (...args: number[]) => number;
}
/**
 * Recursively collects functions and their dependencies.
 *
 * @param name
 * @param imports
 * @returns
 */
function importDeps(name: string, imports: [string[], JsFunction[]]) {
	// The imports consists of two arrays. The names and the functions.
	// We use arrays to preserve the order of the imports
	const [f, deps] = definitions[name];

	if (deps !== undefined) {
		for (const dep of deps) {
			importDeps(dep, imports);
		}
	}

	const names = imports[0];
	const fns = imports[1];

	if (!names.includes(name)) {
		names.push(name);
		fns.push(f);
	}

	return imports;
}
