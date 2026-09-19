import { Expression } from '../../classes/expression/Expression';
import { CHI, CI, E, EI, LI, PI_NAME, SHI, SI } from '../../classes/parser/constants';
import { message, UnsupportedOperationError } from '../../errors';
import { EULER_GAMMA } from '../numeric';

import { definitions } from './definitions';

import type { JsFunction } from '../../classes/parser/types';
import type { ExpressionInput } from '../../types';

/**
 * Compiles an expression into a native JavaScript-number function for repeated evaluation.
 *
 * @remarks
 * Function calls are linked to Nerdamer's internal numerical implementation registry, including
 * any dependencies those implementations require. The compiler supports scalar JavaScript-number
 * semantics rather than Nerdamer's full symbolic or structured object model. Symbolic-only
 * operations such as indexed sums/products, solvers, and matrix operations are rejected if they
 * remain in the expression at compilation time.
 *
 * `buildFunction` is the only Nerdamer runtime path that performs dynamic JavaScript code
 * generation. Normal parsing, simplification, solving, evaluation, and symbolic manipulation do
 * not use `eval()` or `new Function`. This compiler uses `new Function`, so it may be unavailable
 * under a Content Security Policy that forbids dynamic JavaScript evaluation.
 *
 * When `argsArray` is omitted, free variables are sorted alphabetically.
 *
 * @param x - The expression being converted to a function.
 * @param argsArray - Variable names in the positional order expected by the compiled function.
 * @returns The compiled JavaScript-number function.
 * @throws {@link core!UnsupportedOperationError} If the expression contains the imaginary unit or a
 * function for which no faithful JavaScript-number implementation is registered.
 *
 * @example
 * ```ts
 * build('x-y')(9, 7);				// 2
 * build('x-y', ['y', 'x'])(9, 7);	// -2
 * build('erf(x)+2')(9)				// 3
 * ```
 */
export function build(x: ExpressionInput, argsArray?: string[]): (...args: number[]) => number {
	x = Expression.create(x);
	if (x.hasVariable(Expression.imaginary)) {
		throw new UnsupportedOperationError(message('buildFunctionComplexUnsupported'));
	}
	// Collect the constants such as e, pi, or any other constants defined by the functions.
	const constants = collectConstants(x);
	/**
	 * The body for the most part is just a expression. The function definitions get loaded
	 * from the numeric functions object.
	 */
	const body = `${x.text({ wrapPow: true })};`
		//The caret symbol gets replaced because it has an entirely different meaning to JavaScript
		.replace(/\^/g, '**');
	/**
	 * Collect the functions in the string and import their definitions. Basically for each
	 * function call in the expression a definition in the form const fn = ...; is added
	 */
	const imports: [string[], JsFunction[]] = [[], []];
	x.functions().forEach((e: string) => {
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
	const functionArgs = argsArray || x.variables().sort();
	// Construction the function definition
	const functionDef = `${constants}${compiledImports} return ${body}`;

	return new Function(...functionArgs, functionDef) as (...args: number[]) => number;
}
/**
 * Recursively collects functions and their dependencies.
 *
 * @param name - Function name emitted by the expression converter.
 * @param imports - Ordered names and implementations that will be inserted into the function body.
 * @param visiting - Function names on the current dependency path.
 * @returns The same imports tuple after adding the requested definition and its dependencies.
 */
function importDeps(
	name: string,
	imports: [string[], JsFunction[]],
	visiting: Set<string> = new Set()
) {
	// Parentheses are represented internally as a function with an empty name. They are
	// already valid JavaScript syntax and do not need a numerical implementation.
	if (name === '') {
		return imports;
	}

	const names = imports[0];
	const fns = imports[1];
	if (names.includes(name)) {
		return imports;
	}

	const definition = definitions[name];
	if (definition === undefined) {
		throw new UnsupportedOperationError(
			message('buildFunctionUnsupportedFunction', { function: name })
		);
	}

	// Numerical definitions can depend on one another. Track the active dependency path so
	// mutually recursive definitions cannot recurse forever while the function is compiled.
	if (visiting.has(name)) {
		return imports;
	}
	visiting.add(name);

	const [f, deps] = definition;
	if (deps !== undefined) {
		for (const dep of deps) {
			importDeps(dep, imports, visiting);
		}
	}
	visiting.delete(name);

	if (!names.includes(name)) {
		names.push(name);
		fns.push(f);
	}

	return imports;
}

function collectConstants(x: Expression) {
	const EULER_GAMMA_IDENTIFIER = 'EULER_GAMMA';
	const constants: string[] = [];
	const nativeConstants: Record<string, number> = { [PI_NAME]: Math.PI, [E]: Math.E };
	function setConstant(name: string, value: number) {
		constants.push(`var ${name} = ${value};\n`);
	}
	// Add the constants pi and e
	[PI_NAME, E].forEach(e => {
		if (x.hasVariable(e)) {
			setConstant(e, nativeConstants[e]);
		}
	});
	// Add constants for special functions
	if ([CI, CHI, SI, SHI, LI, EI].some(f => x.hasFunction(f, true))) {
		setConstant(EULER_GAMMA_IDENTIFIER, EULER_GAMMA);
	}
	return constants.join(' ');
}