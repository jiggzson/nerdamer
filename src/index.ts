import packageInfo from '../package.json';

import { factor } from './algebra/factor/factor';
import { groebner } from './algebra/groebner';
import { simplify } from './algebra/simplify/simplify';
import { diff } from './calculus/derivative/diff';
import { integrate } from './calculus/integrate/integrate';
import { ilaplace } from './calculus/laplace/ilaplace';
import { laplace } from './calculus/laplace/laplace';
import { limit } from './calculus/limit/limit';
import { assume } from './core/classes/assumption/assume';
import { Collection } from './core/classes/collection/Collection';
import { Dictionary } from './core/classes/dictionary/Dictionary';
import { Expression } from './core/classes/expression/Expression';
import { Matrix } from './core/classes/matrix/Matrix';
import { imatrix } from './core/classes/matrix/utils';
import { Parser } from './core/classes/parser/Parser';
import { Polynomial } from './core/classes/polynomial/Polynomial';
import { Rational } from './core/classes/rational/Rational';
import { ValuesSet } from './core/classes/valuesSet/ValuesSet';
import { Vector } from './core/classes/vector/Vector';
import { Converter } from './core/converters/Converter';
import { mathFunctions } from './core/dispatch';
import * as errors from './core/errors';
import { build } from './core/functions/build';
import { arg, imagPart, polarForm, realPart, rectForm } from './core/functions/complex';
import { hypot } from './math/geometry';
import {
	abs,
	cbrt,
	ceiling,
	Chi,
	Ci,
	dirac,
	doubleFactorial,
	Ei,
	erf,
	erfc,
	exp,
	factorial,
	floor,
	gamma,
	heaviside,
	Li,
	log,
	matrix,
	mod,
	modInv,
	product,
	round,
	Shi,
	Si,
	sign,
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
import { SolutionSet } from './solve/classes/SolutionSet';
import { solve } from './solve/solve';
import { solveSystem } from './solve/solveSystem';

import type {
	OptionsObject,
	ExpressionInputType,
	ParserValuesObject,
} from './core/classes/parser/types';

// Add additional methods to Expression. Do not link modules internally
declare module './core/classes/expression/Expression' {
	interface Expression {
		simplify(): Expression;
		factor(): Expression;
	}
}

/**
 * Attempts to simplify the expression.
 *
 * @example
 * ```ts
 * nerdamer('cos(x)^2+sin(x)^2').simplify().text(); // '1'
 * ```
 */
Expression.prototype.simplify = function (this: Expression): Expression {
	return simplify(this);
};

/**
 * Attempts to factor the expression.
 *
 * @example
 * ```ts
 * nerdamer('x^2+2*x+1').factor().text(); // '(1+x)^2'
 * ```
 */
Expression.prototype.factor = function (this: Expression): Expression {
	return factor(this);
};

const latexConverter = new Converter();
const textConverter = new Converter('text');

/**
 * The `nerdamer` object is the global object and can be used to retrieve classes or parse the function.
 * The return type is any of the Parser supported type which can be converted to string and re-parsed.
 * Because of this, the return type may need to be verified.
 *
 * It takes as a second parameter a values object which will substitute the values. The values object
 * takes the highest priority and allows even restricted variables to be evaluated.
 *
 *
 *
 * @param e
 * @returns {@link ParserInputType} Any of the types listed in ParserInputType.
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
export function nerdamer(e: ExpressionInputType, values?: ParserValuesObject) {
	return Parser.parse(e, values);
}

/**
 * Allows for the conversion into a more familiar text output or TeX.
 *
 * @param e The expression or a string input
 * @param type This is either 'TeX' for TeX output or 'text' for a formatted text expression. Default is 'TeX'
 * @returns The formatted expression
 *
 * @example
 * ```ts
 * const f = nerdamer('x^2+1+2*x');
 * nerdamer.pretty(f, 'text'); 					// 'x^2+2*x+1'
 * nerdamer.pretty(f, 'TeX'); 					// 'x^{2}+2 \\cdot x+1'
 * nerdamer.pretty('a*x+b*x^2+cos(x)', 'text'); // 'cos(x)+a*x+b*x^2'
 * ```
 */
nerdamer.pretty = function (e: Expression | string, type: 'TeX' | 'text') {
	const converter = type === 'TeX' ? latexConverter : textConverter;
	return converter.convert(e);
};

/**
 * Converts the given string to a nerdamer supported type. Not all types are currently supported.
 * @param TeX A TeX string
 * @returns A Parser supported type
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
 * Returns the current version being used.
 * @returns The version string
 *
 * @example
 * ```ts
 * nerdamer.version(); // '2.0.0'
 * ```
 */
nerdamer.version = function () {
	return packageInfo.version;
};

nerdamer.set = function (settings: OptionsObject) {
	Parser.set(settings);
};

/**
 * The list of supported functions by the parser
 */
nerdamer.functions = function () {
	const retval: { user: string[]; system: string[] } = { user: [], system: [] };

	for (const x in mathFunctions) {
		const f = mathFunctions[x];
		retval[f.level].push(x);
	}

	return retval;
};

/**
 * The supported error objects
 */
nerdamer.errors = errors;

/**
 * Compiles a pure JS function useful for high iterations which require low precision.
 *
 *
 * @param x - The expression being converted to a function
 * @param argsArray - The array of arguments in their order
 * @returns The compiled JS function
 *
 * @example
 * ```ts
 * nerdamer.buildFunction('x-y')(9, 7);				// 2
 * nerdamer.buildFunction('x-y', ['y', 'x'])(9, 7);	// -2
 * nerdamer.buildFunction('erf(x)+2')(9)				// 3
 * ```
 */
nerdamer.buildFunction = build;

/**
 * The internal classes available for use or reference.
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
	static: {
		Parser: Parser,
	},
};

// Trig functions
nerdamer.cos = cos;
nerdamer.sin = sin;
nerdamer.tan = tan;
nerdamer.acos = acos;
nerdamer.asin = asin;
nerdamer.atan = atan;
nerdamer.sec = sec;
nerdamer.csc = csc;
nerdamer.cot = cot;
nerdamer.asec = asec;
nerdamer.acsc = acsc;
nerdamer.acot = acot;

// Hyperbolic trig
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

// Log and exp
nerdamer.log = log;
nerdamer.exp = exp;
nerdamer.sqrt = sqrt;
nerdamer.cbrt = cbrt;
nerdamer.fact = factorial;
nerdamer.dfact = doubleFactorial;
nerdamer.gamma = gamma;
nerdamer.delta = dirac;

// Complex
nerdamer.imagpart = imagPart;
nerdamer.realpart = realPart;
nerdamer.polarform = polarForm;
nerdamer.rectform = rectForm;
nerdamer.arg = arg;

// Other
nerdamer.erf = erf;
nerdamer.erfc = erfc;
nerdamer.abs = abs;
nerdamer.sign = sign;
nerdamer.heaviside = heaviside;
nerdamer.hypot = hypot;
nerdamer.round = round;
nerdamer.floor = floor;
nerdamer.ceil = ceiling;
nerdamer.mod = mod;
nerdamer.modInv = modInv;

// Special
nerdamer.Ci = Ci;
nerdamer.Chi = Chi;
nerdamer.Si = Si;
nerdamer.Shi = Shi;
nerdamer.Li = Li;
nerdamer.Ei = Ei;

// constructors
nerdamer.matrix = matrix;
nerdamer.imatrix = imatrix;

// Algebra
nerdamer.groebner = groebner;

// Solve
nerdamer.solve = solve;
nerdamer.solveSystem = solveSystem;

// Calculus
nerdamer.diff = diff;
nerdamer.integrate = integrate;
nerdamer.laplace = laplace;
nerdamer.ilaplace = ilaplace;
nerdamer.sum = sum;
nerdamer.product = product;
nerdamer.limit = limit;

// Assumptions
nerdamer.assume = assume;

module.exports = nerdamer;
