import { Expression } from '../../classes/expression/Expression';
import { CHI, CI, EI, LI, SHI, SI } from '../../constants/functionNames';
import { E, PI_NAME } from '../../constants/symbolNames';
import { message, UnsupportedOperationError } from '../../errors';
import { connectedNumericalFunctions } from '../connectFunctions';
import { EULER_GAMMA } from '../numeric';

import { definitions } from './definitions';

import type { JsFunction } from '../../classes/parser/types';
import type { ExpressionInput } from '../../types';

/**
 * Compiles an expression into a native JavaScript-number function for repeated evaluation.
 *
 * @remarks
 * Function calls are linked to Nerdamer's numerical implementation registry. Runtime-connected
 * numerical functions are preferred when present. The compiler supports scalar JavaScript-number
 * semantics rather than Nerdamer's full symbolic or structured object model. Symbolic-only
 * operations such as indexed sums/products, solvers, and matrix operations are rejected if they
 * remain in the expression at compilation time.
 *
 * `buildFunction` is the only Nerdamer runtime path that performs dynamic JavaScript code
 * generation. Normal parsing, simplification, solving, evaluation, and symbolic manipulation do
 * not use `eval()` or `new Function`. This compiler uses `new Function`, so it may be unavailable
 * under a Content Security Policy that forbids dynamic JavaScript evaluation.
 *
 * Numerical functions are supplied to the generated function as callable values instead of being
 * serialized into source text. This preserves closures and allows functions connected from external
 * numerical libraries to be used without making that library a Nerdamer dependency.
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
 * build('x-y')(9, 7);                 // 2
 * build('x-y', ['y', 'x'])(9, 7);    // -2
 * build('erf(x)+2')(9)                // 3
 * ```
 */
export function build(x: ExpressionInput, argsArray?: string[]): (...args: number[]) => number {
	x = Expression.create(x);
	if (x.hasVariable(Expression.imaginary)) {
		throw new UnsupportedOperationError(message('buildFunctionComplexUnsupported'));
	}
	const constants = collectConstants(x);
	const body = `${x.text({ wrapPow: true })};`.replace(/\^/g, '**');
	const imports: [string[], JsFunction[]] = [[], []];
	x.functions().forEach((name: string) => {
		importFunction(name, imports);
	});

	const functionArgs = argsArray || x.variables().sort();
	const functionDef = `${constants} return ${body}`;
	const compiled = new Function(
		...functionArgs,
		...imports[0],
		functionDef
	) as (...args: Array<number | JsFunction>) => number;

	return (...args: number[]) => compiled(...args, ...imports[1]);
}

/**
 * Adds one numerical function required by a compiled expression.
 *
 * Runtime connections take precedence over Nerdamer's built-in numerical definitions. Function
 * objects are passed directly to the compiled function, so their lexical dependencies remain
 * intact and do not need to be copied into generated source.
 */
function importFunction(
	name: string,
	imports: [string[], JsFunction[]]
): [string[], JsFunction[]] {
	if (name === '' || imports[0].includes(name)) {
		return imports;
	}

	const fn = connectedNumericalFunctions[name] ?? definitions[name]?.[0];
	if (fn === undefined) {
		throw new UnsupportedOperationError(
			message('buildFunctionUnsupportedFunction', { function: name })
		);
	}

	imports[0].push(name);
	imports[1].push(fn);
	return imports;
}

function collectConstants(x: Expression) {
	const EULER_GAMMA_IDENTIFIER = 'EULER_GAMMA';
	const constants: string[] = [];
	const nativeConstants: Record<string, number> = { [PI_NAME]: Math.PI, [E]: Math.E };
	function setConstant(name: string, value: number) {
		constants.push(`var ${name} = ${value};\n`);
	}
	[PI_NAME, E].forEach(e => {
		if (x.hasVariable(e)) {
			setConstant(e, nativeConstants[e]);
		}
	});
	if ([CI, CHI, SI, SHI, LI, EI].some(f => x.hasFunction(f, true))) {
		setConstant(EULER_GAMMA_IDENTIFIER, EULER_GAMMA);
	}
	return constants.join(' ');
}
