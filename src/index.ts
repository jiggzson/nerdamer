import packageInfo from '../package.json';

import { factor, polyFactors } from './algebra/factor/factor';
import { gcd, lcm } from './algebra/gcd/gcd';
import { groebner } from './algebra/groebner';
import { partfrac } from './algebra/partfrac';
import { simplify } from './algebra/simplify/simplify';
import { sqcomp } from './algebra/utils';
import { diff } from './calculus/derivative/diff';
import { C, S } from './calculus/fresnel';
import { integrate } from './calculus/integrate/integrate';
import { ilaplace } from './calculus/laplace/ilaplace';
import { laplace } from './calculus/laplace/laplace';
import { limit } from './calculus/limit/limit';
import { assume } from './core/classes/assumption/assume';
import { Assumption } from './core/classes/assumption/Assumption';
import { Collection } from './core/classes/collection/Collection';
import { Dictionary } from './core/classes/dictionary/Dictionary';
import { Equation } from './core/classes/equation/Equation';
import { Expression } from './core/classes/expression/Expression';
import { symbols } from './core/classes/expression/shortcuts';
import { determinant, nullspace } from './core/classes/matrix/functions';
import { Matrix } from './core/classes/matrix/Matrix';
import { imatrix } from './core/classes/matrix/utils';
import { dataTypes, PARSER_CONSTANTS } from './core/classes/parser/constants';
import { Parser } from './core/classes/parser/Parser';
import { assign, unassign } from './core/classes/parser/scripting/scope';
import {
	content,
	deg,
	div as polynomialDiv,
	divide as polynomialDivide,
} from './core/classes/polynomial/functions';
import { Polynomial } from './core/classes/polynomial/Polynomial';
import { Rational } from './core/classes/rational/Rational';
import { ValuesSet } from './core/classes/valuesSet/ValuesSet';
import { cross, dot } from './core/classes/vector/functions';
import { Vector } from './core/classes/vector/Vector';
import { Converter } from './core/converters/Converter';
import { mathFunctionRegistry } from './core/dispatch';
import * as errors from './core/errors';
import { build } from './core/functions/build';
import {
	arg,
	conjugate,
	csgn,
	imagPart,
	polarForm,
	realPart,
	rectForm,
} from './core/functions/complex';
import { expand } from './core/functions/expand/expand';
import { setFunction as registerFunction } from './core/functions/setFunction';
import { subst, uSub, uUnSub } from './core/functions/subst';
import { hypot } from './math/geometry';
import { isprime } from './math/utils';
import {
	abs,
	cbrt,
	ceiling,
	Chi,
	Ci,
	contains,
	defint,
	dirac,
	doubleFactorial,
	Ei,
	erf,
	erfc,
	exp,
	factorial,
	fibonacci,
	floor,
	gamma,
	heaviside,
	Li,
	log,
	matrix,
	max,
	min,
	mod,
	modInv,
	nthroot,
	numeric,
	product,
	round,
	Shi,
	Si,
	sign,
	sinc,
	sqrt,
	sum,
} from './math/math';
import {
	cos,
	sin,
	tan,
	acos,
	asin,
	atan,
	atan2,
	sec,
	csc,
	cot,
	asec,
	acsc,
	acot,
	cosh,
	sinh,
	tanh,
	acosh,
	asinh,
	atanh,
	sech,
	csch,
	coth,
	asech,
	acsch,
	acoth,
} from './math/trig';
import { trunc } from './math/trunc';
import { SolutionSet } from './solve/classes/SolutionSet';
import { solve } from './solve/solve';
import { solveSystem } from './solve/solveSystem';

import type {
	OptionsObject,
	ParserConstants,
	ParserValuesObject,
	TextOptions,
} from './core/classes/parser/types';
import type { ExpressionInput, NerdamerInput, ParserEntity } from './core/types';

export type TeXOptions = OptionsObject | 'decimal' | 'decimals';
export type { CompleteSquareResult } from './algebra/utils';
export type {
	SubstitutionMap,
	USubstitutionResult,
} from './core/functions/subst';
export type { TextOptions };

// -----------------------------------------------------------------------------
// Full-package instance API
// -----------------------------------------------------------------------------
//
// Core classes stay independent of the higher-level algebra, calculus, and solver
// modules. The main Nerdamer entry point adds those capabilities here, where the
// complete package is available.

/** Scalar-only methods exposed by the full package on parsed results. */
interface ScalarApi {
	/**
	 * Compiles this value to a native JavaScript-number function when the parsed result
	 * is an Expression.
	 *
	 * Structured parser results expose this method so values returned by `nerdamer(...)`
	 * have one consistent TypeScript surface, but they cannot be compiled as scalar
	 * functions and throw {@link core!UnexpectedDataType} when called.
	 *
	 * @param argsArray - Optional variable names in positional call order.
	 * @returns A JavaScript-number function compiled from the scalar expression.
	 */
	buildFunction(argsArray?: string[]): (...args: number[]) => number;
}

/** Methods supplied by the full package as chainable instance operations. */
interface ChainableApi<T> extends ScalarApi {
	diff(variable?: ExpressionInput, n?: Expression | number): T;
	expand(): T;
	factor(): T;
	integrate(variable?: ExpressionInput): T;
	numeric(precision?: ExpressionInput): T;
	simplify(): T;
	subst(value: ExpressionInput, withValue: ExpressionInput): T;
}

// TypeScript needs declarations for methods that are attached at runtime below.
// Native class methods remain authoritative when a class already implements one.
declare module './core/classes/expression/Expression' {
	interface Expression {
		/**
		 * Differentiates this expression symbolically.
		 *
		 * @param variable - Variable to differentiate with respect to. When omitted, the
		 * derivative implementation selects the first variable present in the expression.
		 * @param n - Derivative order. The derivative implementation uses first order when omitted.
		 * @returns The symbolic derivative; the receiver is not modified.
		 */
		diff(variable?: ExpressionInput, n?: Expression | number): Expression;
		factor(): Expression;
		integrate(variable?: ExpressionInput): Expression;
		numeric(precision?: ExpressionInput): Expression;
		simplify(): Expression;

		/** Converts this expression to TeX using Nerdamer's converter. */
		toTeX(options?: TeXOptions): string;

		/** Converts this expression through Nerdamer's text converter. */
		toText(): string;

		/** Legacy alias for TeX conversion. */
		latex(options?: TeXOptions): string;

		/** Legacy alias for {@link Expression.isInf}. */
		isInfinity(): boolean;

		/** Returns whether this expression's numeric multiplier is fractional. */
		isFraction(): boolean;

		/** Returns whether this expression contains an integral. */
		hasIntegral(): boolean;

		/** Creates an equation with this expression on the left-hand side. */
		equals(value: ExpressionInput): Equation;

		/**
		 * Solves the equation formed by setting this expression equal to zero.
		 *
		 * @param variable - Variable to solve for.
		 * @returns The solver's {@link SolutionSet}, including any exclusions or root metadata it preserves.
		 */
		solveFor(variable: ExpressionInput): SolutionSet;
	}
}

declare module './core/classes/matrix/Matrix' {
	interface Matrix extends ChainableApi<Matrix> { }
}

declare module './core/classes/vector/Vector' {
	interface Vector extends ChainableApi<Vector> { }
}

declare module './core/classes/collection/Collection' {
	interface Collection extends ChainableApi<Collection> { }
}

declare module './core/classes/dictionary/Dictionary' {
	interface Dictionary extends ChainableApi<Dictionary> { }
}

// ValuesSet uses polymorphic `this` for the methods supplied only by the full
// package so subclasses such as SolutionSet keep their concrete result type.
declare module './core/classes/valuesSet/ValuesSet' {
	interface ValuesSet extends ScalarApi {
		diff(variable?: ExpressionInput, n?: Expression | number): this;
		factor(): this;
		integrate(variable?: ExpressionInput): this;
		numeric(precision?: ExpressionInput): this;
		simplify(): this;
		subst(value: ExpressionInput, withValue: ExpressionInput): this;
	}
}

declare module './core/classes/equation/Equation' {
	interface Equation extends ChainableApi<Equation> {
		/**
		 * Solves this equation for the requested variable.
		 *
		 * @remarks
		 * The solver works from the equation's residual form, `LHS - RHS = 0`, and
		 * returns Nerdamer's {@link SolutionSet}. The equation itself is not modified.
		 *
		 * @param variable - Variable to solve for.
		 * @returns The solver's solution set, including exclusions or root metadata it preserves.
		 */
		solveFor(variable: ExpressionInput): SolutionSet;
	}
}

type ApiClass = { prototype: object };
type ApiMethod = (...args: never[]) => unknown;
type ApiEnumerable = {
	copy(): ApiEnumerable;
	each(callback: (e: ParserEntity) => ParserEntity): ApiEnumerable;
};

/**
 * Adds selected root functions as instance methods without changing the source classes.
 * Existing class methods win, so a class can keep a more specific implementation.
 */
function extendApi(
	classes: ApiClass[],
	methods: Record<string, ApiMethod>,
	scalarMethods: Record<string, ApiMethod> = {}
): void {
	for (const cls of classes) {
		const prototype = cls.prototype as Record<string, unknown>;

		for (const methodName in methods) {
			// Keep native implementations such as Matrix.expand().
			if (!(methodName in prototype)) {
				const method = methods[methodName] as (
					input: NerdamerInput,
					...args: NerdamerInput[]
				) => ParserEntity;

				Object.defineProperty(prototype, methodName, {
					configurable: true,
					writable: true,
					value: function (this: ParserEntity, ...args: NerdamerInput[]) {
						const apply = (value: ParserEntity): ParserEntity => {
							let retval: ParserEntity;

							// Equations are not enumerable, but transformations apply to both sides.
							if (Equation.isEquation(value)) {
								retval = value.each(e => apply(e));
							} else if (value.isEnumerable) {
								// Structured values receive the operation element-wise on a copy.
								const enumerable = value as unknown as ApiEnumerable;
								retval = enumerable.copy().each(e => apply(e)) as unknown as ParserEntity;
							} else {
								// Scalar expressions can be passed directly to the root function.
								retval = method(value, ...args);
							}

							return retval;
						};

						return apply(this);
					},
				});
			}
		}

		for (const methodName in scalarMethods) {
			if (!(methodName in prototype)) {
				const method = scalarMethods[methodName] as (
					input: Expression,
					...args: unknown[]
				) => unknown;

				Object.defineProperty(prototype, methodName, {
					configurable: true,
					writable: true,
					value: function (this: ParserEntity, ...args: unknown[]) {
						if (!Expression.isExpression(this)) {
							throw new errors.UnexpectedDataType(
								errors.message('expressionExpected', {
									type: dataTypes[this.dataType] ?? this.dataType,
								})
							);
						}
						return method(this, ...args);
					},
				});
			}
		}
	}
}

// -----------------------------------------------------------------------------
// Shared conversion helpers
// -----------------------------------------------------------------------------

const latexConverter = new Converter();
const textConverter = new Converter('text');

function normalizeTeXOptions(options?: TeXOptions): OptionsObject | undefined {
	let retval: OptionsObject | undefined;
	if (typeof options === 'string') {
		retval = { decimal: true };
	} else if (options?.decimals === true && !('decimal' in options)) {
		retval = { ...options, decimal: true };
	} else {
		retval = options;
	}
	return retval;
}

// -----------------------------------------------------------------------------
// Main callable API
// -----------------------------------------------------------------------------

/**
 * Parses Nerdamer notation into a supported parser entity.
 *
 * The returned runtime type depends on the notation and can be an
 * {@link Expression}, equation, or structured parser value. Most type-specific methods
 * still require the corresponding class guard. Full-package methods declared across all
 * parser results can be called directly; scalar-only methods such as `buildFunction()`
 * reject structured results at runtime.
 *
 * @remarks
 * Entries in `values` are substituted while parsing and take precedence over
 * known parser values, including otherwise restricted names. Parser and
 * registration settings are shared by this module-level Nerdamer instance.
 *
 * @param e - Expression-compatible input to parse.
 * @param values - Optional name-to-value substitutions for this parse.
 * @returns The parsed {@link ParserEntity}; inspect its runtime type when the
 * input can produce more than an Expression.
 *
 * @example
 * ```ts
 * nerdamer('x+2*x+1').text(); 						// '1+3*x'
 * nerdamer('2*[a, b, 3]').text(); 					// '[2*a, 2*b, 6]'
 * nerdamer('x+6*y+a', {x: 1, y: 2, a:'t'}).text(); // '13+t'
 *
 * // Evaluation allows even restricted variables to be overridden
 * nerdamer('e+pi', {π: 1, e: 2}).text(); // '2+pi'
 * ```
 */
function nerdamer(e: ExpressionInput, values?: ParserValuesObject): ParserEntity {
	return Parser.parse(e, values);
}

// -----------------------------------------------------------------------------
// Full-package Expression and Equation methods
// -----------------------------------------------------------------------------

/**
 * Solves this expression for the requested variable.
 */
Expression.prototype.solveFor = function (
	this: Expression,
	variable: ExpressionInput
): SolutionSet {
	return solve(this, variable);
};

/**
 * Solves this equation for the requested variable without modifying the equation.
 *
 * @param variable - Variable to solve for.
 * @returns The solver's {@link SolutionSet}.
 */
Equation.prototype.solveFor = function (
	this: Equation,
	variable: ExpressionInput
): SolutionSet {
	return solve(this, variable);
};

/**
 * Converts the expression to TeX.
 */
Expression.prototype.toTeX = function (this: Expression, options?: TeXOptions): string {
	return latexConverter.convert(this, normalizeTeXOptions(options));
};

/**
 * Converts the expression to formatted text.
 */
Expression.prototype.toText = function (this: Expression): string {
	return textConverter.convert(this);
};

/** Legacy TeX conversion alias. */
Expression.prototype.latex = function (this: Expression, options?: TeXOptions): string {
	return latexConverter.convert(this, normalizeTeXOptions(options));
};

/** Legacy infinity check alias. */
Expression.prototype.isInfinity = function (this: Expression): boolean {
	return this.isInf();
};

/** Legacy fractional-multiplier check. */
Expression.prototype.isFraction = function (this: Expression): boolean {
	return !this.getMultiplier().isInteger();
};

/** Legacy integral-presence check. */
Expression.prototype.hasIntegral = function (this: Expression): boolean {
	return this.hasFunction('integrate', true);
};

/** Legacy equation-building helper. */
Expression.prototype.equals = function (this: Expression, value: ExpressionInput): Equation {
	return new Equation(this, Expression.create(value));
};

// -----------------------------------------------------------------------------
// Parsing and conversion
// -----------------------------------------------------------------------------

/**
 * Formats a parser entity or notation string as TeX or normalized text.
 *
 * @param e - Parser entity or notation string to format.
 * @param type - Output format. Defaults to `'TeX'`.
 * @returns Formatted text without modifying an entity input.
 *
 * @example
 * ```ts
 * const f = nerdamer('x^2+1+2*x');
 * nerdamer.pretty(f, 'text'); 					// 'x^2+2*x+1'
 * nerdamer.pretty(f, 'TeX'); 					// 'x^{2}+2 \\cdot x+1'
 * nerdamer.pretty('a*x+b*x^2+cos(x)', 'text'); // 'cos(x)+a*x+b*x^2'
 * ```
 */
nerdamer.pretty = function (e: ParserEntity | string, type: 'TeX' | 'text' = 'TeX') {
	const converter = type === 'TeX' ? latexConverter : textConverter;
	return converter.convert(e);
};

/**
 * Parses the supported TeX subset into a Nerdamer parser entity.
 *
 * @param TeX - TeX source accepted by {@link Converter.fromTeX}.
 * @returns The parsed parser entity. Not every TeX construct is supported.
 *
 * @example
 * ```ts
 * nerdamer.convertFromLaTeX('x^{2}+2 \\cdot x+1').text(); // '1+2*x+x^2'
 * ```
 */
nerdamer.convertFromLaTeX = function (TeX: string) {
	return latexConverter.fromTeX(TeX);
};

/**
 * Converts an expression to TeX math markup without requiring the caller to construct a converter.
 * String input follows the legacy source-preserving path before symbolic normalization;
 * entity input keeps ordinary structured Converter behavior.
 *
 * @param expression - Parser entity or notation string to format.
 * @param options - Converter formatting options. The legacy `'decimal'`, `'decimals'`,
 * and `decimals: true` spellings are normalized to the 2.0 `decimal: true` option.
 * Decimal conversion uses the evaluated Converter path.
 * @returns TeX math markup generated by the shared converter.
 */
nerdamer.convertToTeX = function (
	expression: ParserEntity | string,
	options?: TeXOptions
) {
	let conversionOptions = normalizeTeXOptions(options);
	if (typeof expression === 'string' && !conversionOptions?.decimal) {
		conversionOptions = { ...(conversionOptions ?? {}), preserveSource: true };
	}
	return latexConverter.convert(expression, conversionOptions);
};

/**
 * Legacy alias for {@link nerdamer.convertToTeX}.
 *
 * @deprecated Use {@link nerdamer.convertToTeX} for TeX math output.
 */
nerdamer.convertToLaTeX = nerdamer.convertToTeX;

// -----------------------------------------------------------------------------
// Configuration and parser state
// -----------------------------------------------------------------------------

/**
 * Registers a symbolic function using the legacy public signature.
 *
 * Calls subsequently parsed with `name` substitute their arguments into `body`
 * in the supplied order. Registration changes shared parser state.
 *
 * @param name - Function name.
 * @param args - Argument names in call order.
 * @param body - Symbolic function body.
 * @returns The root `nerdamer` function for chaining.
 */
nerdamer.setFunction = function (name: string, args: string[], body: string) {
	registerFunction({
		type: 'symbolic',
		name,
		argsOrder: args,
		fn: body,
	});
	return nerdamer;
};

/**
 * Registers or removes a parser constant using the legacy public entry point.
 *
 * Numeric values are converted to exact rational text before registration so
 * they do not introduce decimal-formatting intent. The string `'delete'`
 * removes the constant. Registration changes shared parser state.
 *
 * @param name - Constant name.
 * @param value - Constant value, or `'delete'` to remove it.
 * @returns The root `nerdamer` function for chaining.
 */
nerdamer.setConstant = function (name: string, value: number | string) {
	let constantValue = value === 'delete' ? '' : String(value);

	// Legacy setConstant treats numeric values as exact constants rather than
	// carrying decimal formatting intent into expressions that use them.
	if (typeof value === 'number') {
		const rational = Rational.create(String(value));
		constantValue =
			rational.denominator === 1n
				? String(rational.numerator)
				: `${rational.numerator}/${rational.denominator}`;
	}

	Parser.setConstants({ [name]: constantValue });
	return nerdamer;
};

/**
 * Returns the current text registered for a parser constant.
 *
 * Built-in constants are generated at the active precision before being returned.
 * As in the legacy API, an unknown constant is reported as the string `'undefined'`.
 *
 * @param name - Constant name to read.
 * @returns The registered constant text.
 */
nerdamer.getConstant = function (name: string) {
	const constants = PARSER_CONSTANTS as ParserConstants;
	const constant = constants[name];
	return String(typeof constant === 'function' ? constant() : constant);
};

/**
 * Changes one or more shared parser settings.
 *
 * The legacy `PRECISION` setting is routed through {@link Parser.setPrecision} so Decimal-backed
 * calculations and the finite-precision `pi` and `e` constants remain synchronized.
 *
 * @param setting - Setting name or settings object accepted by {@link Parser.set}.
 * @param value - Value used when `setting` is a single name.
 * @returns The root `nerdamer` function for chaining.
 */
nerdamer.set = function (
	setting: string | OptionsObject,
	value?: boolean | string | number | bigint
) {
	if (setting === 'PRECISION') {
		Parser.setPrecision(Number(value));
	} else if (typeof setting === 'object' && 'PRECISION' in setting) {
		const { PRECISION, ...remainingSettings } = setting;
		Parser.set(remainingSettings);
		Parser.setPrecision(Number(PRECISION));
	} else {
		Parser.set(setting, value);
	}
	return nerdamer;
};

/**
 * Reads the current value of a shared parser setting.
 *
 * `PRECISION` mirrors the root setter's special handling and is read from the
 * shared Rational/Decimal precision. Other settings delegate to the parser.
 *
 * @param setting - Parser setting to read.
 * @returns The setting's current value.
 */
nerdamer.get = function (
	setting: Parameters<typeof Parser.get>[0] | 'PRECISION'
) {
	let retval;
	if (setting === 'PRECISION') {
		retval = Parser.getPrecision();
	} else {
		retval = Parser.get(setting);
	}
	return retval;
};

/** Returns a detached snapshot of a registered parser operator. */
nerdamer.getOperator = function (symbol: string) {
	return Parser.getOperator(symbol);
};

/** Registers or updates a parser operator and returns the root API for chaining. */
nerdamer.setOperator = function (
	operator: Parameters<typeof Parser.setOperator>[0],
	action?: Parameters<typeof Parser.setOperator>[1]
) {
	Parser.setOperator(operator, action);
	return nerdamer;
};

/** Aliases an existing parser operator and returns the root API for chaining. */
nerdamer.aliasOperator = function (symbol: string, alias: string) {
	Parser.aliasOperator(symbol, alias);
	return nerdamer;
};

/**
 * Sets a known parser value. Unlike a constant, a known value can be overridden
 * by the values object supplied to a parse call.
 *
 * @param name - Known-value name.
 * @param value - Value to assign, or `'delete'` to remove the assignment.
 * @returns Nothing. This operation changes shared parser state.
 */
nerdamer.setVar = function (name: string, value: number | string | 'delete') {
	if (value === 'delete') {
		unassign(name);
	} else {
		assign(name, String(value));
	}
};

/**
 * Clears all known parser values.
 *
 * @returns The nerdamer function for chaining.
 */
nerdamer.clearVars = function () {
	for (const name of Object.keys(Parser.KNOWN_VALUES)) {
		unassign(name);
	}

	return nerdamer;
};

/**
 * Returns a snapshot of all known parser values in text or TeX form.
 *
 * @param option - Output format. Defaults to `'text'`.
 * @returns A new record keyed by known-value name.
 */
nerdamer.getVars = function (option: 'LaTeX' | 'text' = 'text') {
	const converter = option === 'LaTeX' ? latexConverter : textConverter;
	const retval: Record<string, string> = {};

	for (const name of Object.keys(Parser.KNOWN_VALUES)) {
		retval[name] = converter.convert(Parser.KNOWN_VALUES[name]);
	}

	return retval;
};

/**
 * Lists currently registered parser functions by registration level.
 *
 * @returns New `user` and `system` name arrays reflecting current shared state.
 */
nerdamer.functions = function () {
	const retval: { user: string[]; system: string[] } = { user: [], system: [] };

	for (const x in mathFunctionRegistry) {
		const f = mathFunctionRegistry[x];
		retval[f.level].push(x);
	}

	return retval;
};

// -----------------------------------------------------------------------------
// Root utilities and compatibility namespaces
// -----------------------------------------------------------------------------

/** Creates frozen plain-variable Expressions keyed by their requested names. */
nerdamer.symbols = symbols;

/**
 * Returns the package version declared by this Nerdamer build.
 * @returns The semantic version string.
 *
 * @example
 * ```ts
 * nerdamer.version(); // '2.0.0'
 * ```
 */
nerdamer.version = function () {
	return packageInfo.version;
};

/**
 * Runtime namespace containing Nerdamer's public error constructors.
 *
 * Use these constructors for reliable `instanceof` checks when calling the
 * compatibility root API.
 */
nerdamer.errors = errors;

/**
 * Compiles an expression into a native JavaScript-number function.
 *
 * @remarks
 * This uses dynamic JavaScript function construction and may be unavailable under
 * a strict Content Security Policy. It favors native-number throughput over
 * Nerdamer's exact or arbitrary-precision arithmetic. Scalar function calls are linked
 * to explicit numerical implementations; symbolic-only or structured operations that
 * survive to this stage are rejected rather than compiled incorrectly. When `argsArray`
 * is omitted, variable names are sorted alphabetically.
 *
 * Values returned by `nerdamer(...)` also expose `buildFunction()` for convenient
 * chaining. That form succeeds only when the parsed result is an Expression; structured
 * results throw {@link core!UnexpectedDataType} instead of compiling their members.
 *
 * @param x - Expression to compile.
 * @param argsArray - Optional argument names in call order.
 * @returns A numeric function accepting and returning JavaScript numbers.
 * @throws {@link core!UnsupportedOperationError} If a surviving function has no faithful
 * JavaScript-number implementation.
 *
 * @example
 * ```ts
 * nerdamer.buildFunction('x-y')(9, 7);				// 2
 * nerdamer.buildFunction('x-y', ['y', 'x'])(9, 7);	// -2
 * nerdamer.buildFunction('erf(x)+2')(9)				// 3
 * nerdamer('cos(x)').buildFunction(['x'])(0);			// 1
 * ```
 */
nerdamer.buildFunction = build;

/**
 * Compatibility registry of selected Nerdamer constructors and the shared Parser instance.
 *
 * @remarks
 * This registry is retained as a supported compatibility surface for 2.0. Typed code
 * should prefer the documented package subpaths, which provide domain-specific and advanced
 * import paths without relying on registry membership.
 */
nerdamer.classes = {
	Expression,
	Rational,
	Polynomial,
	Matrix,
	Vector,
	Collection,
	Converter,
	Dictionary,
	ValuesSet,
	SolutionSet,
	Assumption,
	Equation,
	instance: {
		Parser: Parser,
	},
};

// -----------------------------------------------------------------------------
// Mathematical root API
// -----------------------------------------------------------------------------

// Trigonometric functions
nerdamer.cos = cos;
nerdamer.sin = sin;
nerdamer.tan = tan;
nerdamer.acos = acos;
nerdamer.asin = asin;
nerdamer.atan = atan;
nerdamer.arccos = acos;
nerdamer.arcsin = asin;
nerdamer.arctan = atan;
nerdamer.atan2 = atan2;
nerdamer.sec = sec;
nerdamer.csc = csc;
nerdamer.cot = cot;
nerdamer.asec = asec;
nerdamer.acsc = acsc;
nerdamer.acot = acot;

// Hyperbolic functions
nerdamer.cosh = cosh;
nerdamer.sinh = sinh;
nerdamer.tanh = tanh;
nerdamer.acosh = acosh;
nerdamer.asinh = asinh;
nerdamer.atanh = atanh;
nerdamer.sech = sech;
nerdamer.csch = csch;
nerdamer.coth = coth;
nerdamer.asech = asech;
nerdamer.acsch = acsch;
nerdamer.acoth = acoth;

// Elementary and numeric functions
nerdamer.log = log;
nerdamer.exp = exp;
nerdamer.sqrt = sqrt;
nerdamer.cbrt = cbrt;
nerdamer.nthroot = nthroot;
nerdamer.numeric = numeric;
nerdamer.abs = abs;
nerdamer.sign = sign;
nerdamer.min = min;
nerdamer.max = max;
nerdamer.round = round;
nerdamer.floor = floor;
nerdamer.ceil = ceiling;
nerdamer.trunc = trunc;
nerdamer.hypot = hypot;

// Discrete and number-theoretic functions
nerdamer.fact = factorial;
nerdamer.factorial = factorial;
nerdamer.dfact = doubleFactorial;
nerdamer.dfactorial = doubleFactorial;
nerdamer.fib = fibonacci;
nerdamer.mod = mod;
nerdamer.modInv = modInv;
nerdamer.isPrime = isprime;

// Complex functions
nerdamer.imagpart = imagPart;
nerdamer.realpart = realPart;
nerdamer.polarform = polarForm;
nerdamer.rectform = rectForm;
nerdamer.arg = arg;
nerdamer.conjugate = conjugate;
nerdamer.csgn = csgn;

// Special functions
nerdamer.gamma = gamma;
nerdamer.erf = erf;
nerdamer.erfc = erfc;
nerdamer.heaviside = heaviside;
nerdamer.delta = dirac;
nerdamer.Ci = Ci;
nerdamer.Chi = Chi;
nerdamer.Si = Si;
nerdamer.Shi = Shi;
nerdamer.Li = Li;
nerdamer.Ei = Ei;
nerdamer.sinc = sinc;

// Symbolic utilities
nerdamer.contains = contains;
nerdamer.subst = subst;
nerdamer.uSub = uSub;
nerdamer.uUnSub = uUnSub;

// Algebra
nerdamer.expand = expand;
nerdamer.factor = factor;
nerdamer.polyFactors = polyFactors;
nerdamer.completeSquare = sqcomp;
nerdamer.gcd = gcd;
nerdamer.lcm = lcm;
nerdamer.partfrac = partfrac;
nerdamer.div = polynomialDiv;
nerdamer.divide = polynomialDivide;
nerdamer.simplify = simplify;
nerdamer.groebner = groebner;

// Solvers
nerdamer.solve = solve;
nerdamer.solveSystem = solveSystem;
nerdamer.solveeqs = solveSystem;

// Calculus
nerdamer.diff = diff;
nerdamer.integrate = integrate;
nerdamer.laplace = laplace;
nerdamer.ilaplace = ilaplace;
nerdamer.ilt = ilaplace;
nerdamer.sum = sum;
nerdamer.product = product;
nerdamer.limit = limit;
nerdamer.defint = defint;
nerdamer.S = S;
nerdamer.C = C;

// Matrix operations
nerdamer.matrix = matrix;
nerdamer.imatrix = imatrix;
nerdamer.determinant = determinant;
nerdamer.nullspace = nullspace;

// Vector operations
nerdamer.dot = dot;
nerdamer.cross = cross;

// Polynomial operations
nerdamer.deg = deg;
nerdamer.content = content;

// Assumptions
/**
 * Registers a process-wide numeric interval assumption.
 *
 * @remarks
 * Repeated constraints for a variable are intersected. Assumptions are consulted by
 * symbolic comparisons and by algorithms that depend on those comparisons. The root
 * compatibility API uses global state in 2.0; callers that need to clear or inspect it
 * directly can use the documented assumption-domain functions.
 */
nerdamer.assume = assume;

// -----------------------------------------------------------------------------
// Complete the full-package instance API
// -----------------------------------------------------------------------------
//
// Root functions are exposed as chainable instance methods only after the complete
// Nerdamer API has been assembled above. Native class methods are left untouched.

nerdamer.updateAPI = function () {
	const methods = {
		diff: nerdamer.diff,
		expand: nerdamer.expand,
		factor: nerdamer.factor,
		integrate: nerdamer.integrate,
		numeric: nerdamer.numeric,
		simplify: nerdamer.simplify,
		subst: nerdamer.subst,
	};
	const scalarMethods = {
		buildFunction: nerdamer.buildFunction,
	};

	extendApi(
		[Expression, Matrix, Vector, Collection, Dictionary, ValuesSet, Equation],
		methods,
		scalarMethods
	);
	return nerdamer;
};

nerdamer.updateAPI();

export default nerdamer;