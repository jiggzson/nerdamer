import Decimal from 'decimal.js';

import { diff } from '../../../calculus/derivative/diff';
import { hypot } from '../../../math/geometry';
import { abs, mod } from '../../../math/math';
import { anyObject } from '../../../utils/object';
import { message, UnexpectedDataType } from '../../errors';
import { build } from '../../functions/build';
import { imagPart, realPart } from '../../functions/complex';
import { expand } from '../../functions/expand/expand';
import { subst } from '../../functions/subst';
import { Settings } from '../../Settings';
import { Equation } from '../equation/Equation';
import {
	EXPRESSION_TYPES,
	EXPRESSION,
	INFINITY,
	E,
	PI,
	PARSER_CONSTANTS,
	dataTypes,
} from '../parser/constants';
import { add } from '../parser/operations/add';
import { gt, gte, equal, lt, lte } from '../parser/operations/compare';
import { divide } from '../parser/operations/divide';
// import { multiply, add, subtract, divide, power, equal, gt, gte } from '../parser';
import { multiply } from '../parser/operations/multiply';
import { power } from '../parser/operations/power';
import { rationalizeRadical } from '../parser/operations/power';
import { subtract } from '../parser/operations/subtract';
import { Parser } from '../parser/Parser';
import { Rational } from '../rational/Rational';

import { coeffs } from './analysis';
import { isPolynomialLike, getVariable } from './analysis';
import { getDenominator, getNumerator } from './analysis';
import { toText } from './format';
import { one, zero } from './shortcuts';
import { hasFunction, hasVariable } from './traversal';
import { functions, variables } from './traversal';
import { forEveryElement } from './traversal';
import { copyOver } from './utils';

import type { Base } from '../../common/common';
import type {
	OptionsObject,
	ParserInputType,
	ParserValuesObject,
	ExpressionInputType,
	SupportedInputType,
} from '../parser/types';

type ElementsSortType = (a: Expression, b: Expression) => number;

const { NUM, VAR, EXP, FUN, GRP, PRD, SUM, INF } = EXPRESSION_TYPES;

/**
 * The core symbolic expression class for nerdamer2.
 *
 * An `Expression` represents a mathematical expression in a tree structure. It can be
 * a number, variable, function, power (EXP), sum, product, or infinity. Expressions
 * support exact rational arithmetic, symbolic manipulation, and can be evaluated
 * numerically.
 *
 * Use the static factory method {@link Expression.create} to build expressions from
 * strings, numbers, or other supported input types.
 *
 * @example
 * ```ts
 * const x = Expression.create('2*x + 1');
 * x.text()                          // "1+2*x"
 * x.evaluate({ x: 3 }).text()      // "7"
 * x.diff('x').text()               // "2"
 * ```
 */
export class Expression implements Base<Expression> {
	static DISTRIBUTE_MULTIPLIER = true;

	/**
	 * The variable used to represent imaginary numbers
	 */
	public static imaginary = 'i';

	static LOG = 'log';
	static LOG10 = 'log_10';
	/**
	 * The symbol used as the value for numbers when the expression is a sub-expression
	 */
	public static numberHash = '#';

	static POW_OPR = '^';

	/**
	 * The reserved variables. This list differs from the parser's reserved list
	 * which excludes assignment whereas this list excludes it being recognized as
	 * a variable. This naming is confusing and should be changed in the future.
	 */
	public static RESERVED: string[] = [E].concat(PI).concat(INFINITY);

	/**
	 * The function used to sort expression terms. This can be overridden.
	 * It aims to find a balance between readability and performance.
	 */
	public static sortFunction: ElementsSortType = (a, b) => {
		// Ensure that i is last e.g. 1 + i and not i + 1;
		if (a.isI()) {
			return 1;
		}
		// Ensure a,b,x,y,...
		if (a.type === b.type) {
			// Ensure that x^2 is before x
			if (a.value === b.value) {
				return Number(b.getPower()) - Number(a.getPower());
			}
			if (a.value > b.value) {
				return 1;
			}
			if (b.value > a.value) {
				return -1;
			}
			return 0;
		}

		// The remaining order is per types
		// Default: Exponential > Variable > Functions > Sums/Polynomials > Multivariate Monomials > Infinity
		return a.type - b.type;
	};

	/**
	 * The supported types
	 */
	static TYPES = EXPRESSION_TYPES;

	/**
	 * The function arguments if any
	 */
	args?: Expression[];

	/**
	 * The base used by EXP
	 */
	base?: Expression;

	dataType: string = EXPRESSION;
	/**
	 * Signals that the Expression was parsed with the deferred flag true
	 */
	deferred: boolean = false;

	/**
	 * The sub-elements. Since variables, numbers, ... are basically considered elements,
	 * they get stored in this array.
	 */
	elements?: Record<string, Expression> = undefined;

	/**
	 * Let's the parser know not to treat it as a set of values
	 */
	isEnumerable: boolean = false;

	/**
	 * A parser flag to let the parser know that this was returned from an internal function call.
	 */
	isFunctionReturn = false;

	multiplier?: Rational;

	/**
	 * The function name if any
	 */
	name?: string;

	power?: Expression;

	/**
	 * If set, this is the maximum known precision of any of the intermediate operations
	 */
	precision?: number;

	/**
	 * The default type is a number for the expression since the default value
	 * for an expression is "1". The assert flag is used because TypeScript
	 * currently doesn't recognized that it's also set in the copyOver method
	 */
	type!: number;

	/**
	 * The value of the expression. This hash is used for comparing variable.
	 * This value is set in the constructor or the copyOver method
	 */
	value!: string;

	/**
	 * Constructs a new Expression.
	 *
	 * For most use cases, prefer the static factory method {@link Expression.create}
	 * instead. Direct construction is primarily used internally when copying from
	 * an existing Expression or when creating a plain-value node with `plainConstruct`.
	 * All expression carry a numeric multiplier of the `Rational` class.
	 *
	 * It uses several groups to organize and simplify expressions. Although some line up with
	 * general mathematical classifications, they are not to be confused with such. The groups
	 * generally are:
	 * - NUM: Vanilla numbers
	 * - VAR: Symbols/Variables with integer powers
	 * - EXP: Not to be confused with exponential functions. These are of the differing exponent group and carry non-integer powers.
	 * - FUN: Functions
	 * - GRP: All sums with a common base but different power e.g. x+x^y, cos(x)-3*cos(x)^2, ...
	 * - PRD: All products of non-numerical symbols. Numeric symbols get moved to the multiplier during parsing.
	 * - SUM: All other sums excluding GRP. e.g. x+1. The expression 1+x+x^2, is a SUM which contains a NUM and a GRP.
	 * - INF: All infinite values
	 *
	 * @param x - The input value: an existing Expression, a Rational, a string, a number, or a bigint.
	 * @param plainConstruct - When `true`, stores `x` as a raw value string without parsing.
	 *
	 * @example
	 * ```ts
	 * // Preferred: use the factory method
	 * const expr = Expression.create('x + 1');
	 *
	 * // Copy constructor
	 * const copy = new Expression(expr);
	 * copy.text()   // "1+x"
	 * ```
	 */
	constructor(x: SupportedInputType, plainConstruct?: boolean) {
		// Allow for hooking of the input. The user can override the hook to modify
		// how the input is handled.
		x = Expression.hook(x);

		if (plainConstruct && typeof x === 'string') {
			this.value = x;
			return this;
		} else if (Expression.isExpression(x)) {
			copyOver(x, this);
		} else {
			return Expression.create(x);
		}
	}

	/**
	 * Creates an Expression from any supported input type. This is the primary factory method
	 * and the recommended way to build expressions.
	 *
	 * If `x` is already an Expression (and no `values` are provided), it is returned as-is
	 * (or copied if `copy` is `true`). Strings are parsed via the {@link Parser}. Rationals
	 * and Equations are converted automatically.
	 *
	 * @param x - The input: a string, number, bigint, Rational, Equation, or existing Expression.
	 * @param values - Optional substitution values applied during parsing.
	 * @param copy - When `true`, always returns a new copy rather than reusing an existing Expression.
	 * @returns A new or existing Expression.
	 * @throws {@link UnexpectedDataType} If the parsed result is not an Expression (e.g. a Vector or Matrix).
	 *
	 * @example
	 * ```ts
	 * Expression.create('x^2 + 1').text()              // "1+x^2"
	 * Expression.create(42).text()                      // "42"
	 * Expression.create('a+b', { a: 2, b: 3 }).text()  // "5"
	 * ```
	 */
	public static create(
		x: SupportedInputType,
		values?: ParserValuesObject,
		copy?: boolean
	): Expression {
		if (Expression.isExpression(x) && !values) {
			return copy ? x.copy() : x;
		} else if (x instanceof Rational) {
			return Expression.fromRational(x);
		} else if (Equation.isEquation(x)) {
			return x.toLHS().LHS;
		}

		const retval = Parser.parse(String(x), values);

		if (retval.dataType !== EXPRESSION) {
			throw new UnexpectedDataType(
				message('expressionExpected', { type: dataTypes[retval.dataType] })
			);
		}

		return retval as Expression;
	}

	/**
	 * Returns the symbolic or numeric representation of Euler's number *e*.
	 *
	 * When `Settings.EVALUATE` is `true` or `asNumericValue` is `true`, returns a
	 * numeric approximation at the current precision. Otherwise returns the symbolic
	 * variable `e`.
	 *
	 * @param asNumericValue - Force numeric evaluation regardless of settings.
	 * @returns An Expression representing *e*.
	 *
	 * @example
	 * ```ts
	 * Expression.E().text()        // "e"
	 * Expression.E(true).text()    // "2.71828182845904..."
	 * ```
	 */
	public static E(asNumericValue?: boolean) {
		if (Settings.EVALUATE || asNumericValue) {
			return Expression.fromRational(Rational.E);
		}
		return Expression.Variable(E);
	}

	/**
	 * Creates a numeric Expression from a {@link Rational} value.
	 *
	 * @param x - The Rational to convert.
	 * @returns A numeric Expression carrying the rational value.
	 *
	 * @example
	 * ```ts
	 * const r = Rational.create('3/4');
	 * Expression.fromRational(r).text()   // "3/4"
	 * ```
	 */
	static fromRational(x: Rational) {
		const value =
			x.denominator === 1n ? x.numerator.toString() : `${x.numerator}/${x.denominator}`;
		const retval = Expression.Number(value);
		retval.getMultiplier().asDecimal = x.asDecimal;
		return retval;
	}

	/**
	 * Creates a symbolic function node with the given name.
	 *
	 * This creates a bare function symbol without arguments. To create a function
	 * with arguments, use {@link Expression.toFunction} instead.
	 *
	 * @param x - The function name.
	 * @returns A function-typed Expression.
	 *
	 * @example
	 * ```ts
	 * Expression.Function('f').text()   // "f"
	 * ```
	 */
	public static Function(x: string) {
		const retval = Expression.Type(x, FUN);
		retval.name = x;
		return retval;
	}

	/**
	 * Generates a canonical string representation for an array of sub-expressions,
	 * joined by `+` (for SUM/GRP) or `*` (for PRD), with sums wrapped in parentheses
	 * when inside a product.
	 *
	 * @param arr - The array of sub-expressions.
	 * @param f - The string method to call on each element: `'idString'`, `'keyValue'`, or `'text'`.
	 * @param expressionType - The parent expression type (SUM, GRP, or PRD).
	 * @returns The joined string representation.
	 */
	static getValue(
		arr: Expression[],
		f: 'idString' | 'keyValue' | 'text',
		expressionType: number
	) {
		return arr
			.map(x => {
				// This will call the toString or keyValue depending on what's requested
				let retval = x[f]();

				if ((x.type === SUM || x.type === GRP) && expressionType === PRD) {
					//e.g. (x+1)*x; The x+1 should be wrapped in a brackets
					retval = `(${retval})`;
				}

				return retval;
			})
			.sort()
			.join(expressionType === SUM || expressionType === GRP ? '+' : '*')
			.replace('+-', '-');
	}

	/**
	 * A hook function applied to every input passed to the constructor. Override this
	 * to intercept or transform inputs before they are parsed.
	 *
	 * By default, returns `x` unchanged.
	 *
	 * @param x - The raw input value.
	 * @returns The (potentially transformed) input.
	 */
	public static hook(x: SupportedInputType) {
		return x;
	}

	/**
	 * Creates the imaginary unit as a symbolic variable. The variable name defaults
	 * to `"i"` but can be changed via {@link Parser.setI | Parser.setI}.
	 *
	 * @returns An Expression representing the imaginary unit.
	 *
	 * @example
	 * ```ts
	 * Expression.Img().text()   // "i"
	 * ```
	 */
	public static Img() {
		return Expression.Variable(Expression.imaginary);
	}

	/**
	 * Creates a symbolic positive infinity Expression.
	 *
	 * @returns An Expression representing `+∞`.
	 *
	 * @example
	 * ```ts
	 * Expression.Inf().text()   // "Infinity"
	 * ```
	 */
	public static Inf() {
		return Expression.Type(INFINITY[0], INF);
	}

	/**
	 * Type guard that checks whether an object is an Expression.
	 *
	 * @param obj - The value to test.
	 * @returns `true` if `obj` is an Expression instance.
	 *
	 * @example
	 * ```ts
	 * Expression.isExpression(Expression.create('x'))   // true
	 * Expression.isExpression(42)                       // false
	 * ```
	 */
	static isExpression(obj: unknown): obj is Expression {
		if (obj === undefined) {
			return false;
		}

		return (obj as Expression).dataType === EXPRESSION;
	}

	/**
	 * Type guard that checks whether every element of an array is an Expression.
	 *
	 * @param obj - The value to test.
	 * @returns `true` if `obj` is an array and all elements are Expressions.
	 */
	static isExpressionArray(obj: unknown): obj is Expression[] {
		if (!Array.isArray(obj)) {
			return false;
		}

		for (let i = 0; i < obj.length; i++) {
			if (!Expression.isExpression(obj[i])) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Creates the internal summation/product index placeholder variable `_n`.
	 *
	 * @returns An Expression representing the variable `_n`.
	 */
	public static N() {
		return Expression.Variable('_n');
	}

	/**
	 * Creates a symbolic negative infinity Expression.
	 *
	 * @returns An Expression representing `−∞`.
	 *
	 * @example
	 * ```ts
	 * Expression.NegInf().text()   // "-Infinity"
	 * ```
	 */
	public static NegInf() {
		return Expression.Inf().neg();
	}

	/**
	 * Creates a numeric Expression from a string, bigint, number, or Decimal.
	 *
	 * @param x - The numeric value.
	 * @returns A `NUM`-typed Expression.
	 *
	 * @example
	 * ```ts
	 * Expression.Number('42').text()     // "42"
	 * Expression.Number('3/4').text()    // "3/4"
	 * ```
	 */
	public static Number(x: string | bigint | number | Decimal) {
		return Expression.Type(String(x), NUM);
	}

	/**
	 * Returns the symbolic or numeric representation of π.
	 *
	 * When `Settings.EVALUATE` is `true` or `asNumericValue` is `true`, returns a
	 * numeric approximation at the current precision. Otherwise returns the symbolic
	 * variable `pi`.
	 *
	 * @param asNumericValue - Force numeric evaluation regardless of settings.
	 * @returns An Expression representing π.
	 *
	 * @example
	 * ```ts
	 * Expression.Pi().text()        // "pi"
	 * Expression.Pi(true).text()    // "3.14159265358979..."
	 * ```
	 */
	public static Pi(asNumericValue?: boolean) {
		if (Settings.EVALUATE || asNumericValue) {
			return Expression.fromRational(Rational.PI);
		}
		return Expression.Variable(PI[0]);
	}

	/**
	 * Sets the power of an Expression. Use this instead of assigning `power` directly.
	 *
	 * @param x - The Expression whose power to set.
	 * @param power - The new power Expression.
	 * @returns The modified Expression `x`.
	 */
	static setPower(x: Expression, power: Expression) {
		x.power = power;
		return x;
	}

	/**
	 * Creates multiple Expressions at once from a list of inputs.
	 *
	 * @param values - One or more inputs to convert to Expressions.
	 * @returns An array of Expressions.
	 *
	 * @example
	 * ```ts
	 * const [x, y] = Expression.symbols('x', 'y');
	 * x.text()   // "x"
	 * y.text()   // "y"
	 * ```
	 */
	public static symbols(...values: ExpressionInputType[]) {
		return values.map(x => Expression.create(x));
	}

	/**
	 * Creates an EXP-typed Expression representing `x` raised to the power `pow`.
	 *
	 * Unlike `power()`, this directly constructs the internal EXP node without
	 * triggering simplification. Used internally by the algebra engine.
	 *
	 * @param x - The base expression.
	 * @param pow - The power expression.
	 * @param powerLess - When `true`, strips the power from `x` before wrapping.
	 * @returns An EXP-typed Expression.
	 */
	static toEXP(x: ExpressionInputType, pow: ExpressionInputType, powerLess: boolean = false) {
		x = Expression.create(x);
		pow = Expression.create(pow);

		let retval: Expression;

		// if (x.isZero() || x.isInf() || pow.isInf()) {
		// 	retval = x.pow(pow);
		// } else
		if (x.isOne()) {
			// Just return it untouched
			retval = Expression.create(x);
		} else {
			if (powerLess) {
				delete x.power;
			}
			// The value is now the entire Expression. Consider (x^x)^(1/3).
			// The value of the Expression is x^x and not x since only x^x can directly operate on it.
			retval = new Expression(x.idString(), true);
			retval.base = Expression.create(x);
			retval.power = pow;
			retval.type = EXP;
		}

		return retval;
	}

	/**
	 * Creates a symbolic function node with arguments.
	 *
	 * The resulting Expression has type `FUN`, the given name, and carries the
	 * provided arguments. Its `value` is automatically generated (e.g. `"sin(x)"`).
	 *
	 * @param name - The function name (e.g. `"sin"`, `"log"`).
	 * @param args - The function arguments. `undefined` entries are filtered out.
	 * @returns A function-typed Expression.
	 *
	 * @example
	 * ```ts
	 * Expression.toFunction('f', [Expression.create('x')]).text()   // "f(x)"
	 * ```
	 */
	static toFunction(name: string, args: (ExpressionInputType | undefined)[]) {
		const f = Expression.Function(name);
		// Remove undefined from the array
		f.args = args
			.filter(x => {
				return x !== undefined;
			})
			.map(x => Expression.create(x));
		// Set the name
		f.name = name;
		// TODO: This needs to be generated the same way as in text.
		f.updateValue();
		return f;
	}

	/**
	 * Low-level helper that creates an Expression with a specific internal type.
	 *
	 * @param x - The value string.
	 * @param type - The Expression type constant (NUM, VAR, FUN, EXP, etc.).
	 * @returns A new Expression of the specified type.
	 */
	public static Type(x: string, type: number) {
		const num = new Expression(x, true);
		num.type = type;
		return num;
	}

	/**
	 * Creates a symbolic variable Expression.
	 *
	 * @param x - The variable name.
	 * @returns A `VAR`-typed Expression.
	 *
	 * @example
	 * ```ts
	 * Expression.Variable('x').text()   // "x"
	 * ```
	 */
	public static Variable(x: string) {
		return Expression.Type(x, VAR);
	}

	/**
	 * Returns the absolute value of this Expression.
	 *
	 * @returns The absolute value.
	 *
	 * @example
	 * ```ts
	 * Expression.create(-5).abs().text()      // "5"
	 * Expression.create('x').abs().text()     // "abs(x)"
	 * ```
	 */
	abs() {
		return abs(this);
	}

	/**
	 * Compiles this Expression into a native JavaScript function for fast numeric evaluation.
	 *
	 * @param args - The variable names in the desired argument order. If omitted,
	 *   variables are sorted alphabetically.
	 * @returns A callable JavaScript function.
	 *
	 * @example
	 * ```ts
	 * const f = Expression.create('x^2 + y').buildFunction(['x', 'y']);
	 * f(3, 1)   // 10
	 * ```
	 */
	buildFunction(args?: string[]) {
		return build(this, args);
	}

	/**
	 * Extracts the coefficients of this Expression as a polynomial in the given variables.
	 *
	 * @param variables - The variable names to collect coefficients for.
	 * @returns The coefficient data structure.
	 *
	 * @example
	 * ```ts
	 * Expression.create('3*x^2 + 2*x + 1').coeffs('x')
	 * ```
	 */
	coeffs(...variables: string[]) {
		return coeffs(this, variables);
	}

	/**
	 * Returns a deep copy of this Expression.
	 *
	 * @returns A new Expression with identical structure.
	 *
	 * @example
	 * ```ts
	 * const a = Expression.create('x + 1');
	 * const b = a.copy();
	 * b.text()   // "1+x"
	 * ```
	 */
	copy() {
		return new Expression(this);
	}

	/**
	 * Computes the symbolic derivative of this Expression.
	 *
	 * @param variable - The variable to differentiate with respect to. If omitted,
	 *   the first variable found is used.
	 * @param n - The order of differentiation. Defaults to `1`.
	 * @returns The nth derivative as a new Expression.
	 *
	 * @example
	 * ```ts
	 * Expression.create('x^3').diff('x').text()        // "3*x^2"
	 * Expression.create('x^3').diff('x', 2).text()     // "6*x"
	 * Expression.create('sin(x)').diff('x').text()     // "cos(x)"
	 * ```
	 */
	diff(variable?: ExpressionInputType, n?: number) {
		return diff(this, variable, n);
	}

	/**
	 * Distributes the outer multiplier over the elements of a SUM or GRP expression.
	 *
	 * For example, `2*(x + y)` becomes `2*x + 2*y`. Only applies to linear
	 * (power-1) sums. Returns a new Expression.
	 *
	 * @returns A new Expression with the multiplier distributed.
	 *
	 * @example
	 * ```ts
	 * Expression.create('2*(x+y)').distributeMultiplier().text()   // "2*x+2*y"
	 * ```
	 */
	distributeMultiplier() {
		const retval = this.copy();
		if (this.isSum() && !this.getMultiplier().isOne() && this.isLinear()) {
			const m = retval.getMultiplier();
			// Remove it
			retval.multiplier = undefined;
			// multiply each element by the multiplier
			const elements = retval.getElements();
			for (const x in elements) {
				const term = elements[x];
				term.multiplier = term.getMultiplier().times(m);

				if (term.isSum()) {
					elements[x] = term.distributeMultiplier();
				}
			}
		}

		return retval;
	}

	/**
	 * Divides this Expression by the given value.
	 *
	 * @param x - The divisor.
	 * @returns A new Expression representing `this / x`.
	 *
	 * @example
	 * ```ts
	 * Expression.create('x^2').div('x').text()   // "x"
	 * Expression.create(10).div(3).text()        // "10/3"
	 * ```
	 */
	div(x: ExpressionInputType) {
		return divide(this, Expression.create(x));
	}

	/**
	 * Iterates over each sub-element of this Expression, invoking `fn` for each.
	 *
	 * For SUM/PRD types, iterates over the internal elements. For atomic types
	 * (NUM, VAR, FUN, EXP), invokes `fn` once with the unit-multiplier form.
	 * This is a read-only traversal; use {@link forEveryElement} for transformations.
	 *
	 * @param fn - Callback receiving each element and its key.
	 * @returns This Expression (for chaining).
	 */
	each(fn: (a: Expression, b: string | number) => void | Expression) {
		// The callback assumes the multiplier is carried at the top level
		// So if there are no elements then call this minus the multiplier
		if (!this.elements) {
			fn(this.toUnitMultiplier(), this.value);
		} else {
			const elements = this.getElements();
			for (const x in elements) {
				fn(elements[x], x);
			}
		}

		return this;
	}

	/**
	 * Returns the sub-elements of this Expression as a sorted array.
	 *
	 * For SUM types, nested linear sums are flattened. For atomic types, returns
	 * an array containing the unit-multiplier form.
	 *
	 * @param withMultiplier - For products, appends the outer multiplier as an element.
	 * @returns A sorted array of sub-expressions.
	 */
	elementsArray(withMultiplier?: boolean) {
		const elementsArray: Expression[] = [];

		if (this.isProduct() || this.isSum()) {
			const elements = this.getElements();
			for (const c in elements) {
				const element = elements[c];

				// Check for nested sums. Don't expand if we're in a product.
				if (element.isSum() && this.isSum() && element.isLinear()) {
					const subElements = element.getElements();
					for (const sc in subElements) {
						elementsArray.push(subElements[sc]);
					}
				} else {
					elementsArray.push(element);
				}
			}
		} else {
			elementsArray.push(this.toUnitMultiplier());
		}

		// Adding the multiplier makes no sense when getting sums.
		if (withMultiplier && this.isProduct()) {
			elementsArray.push(Expression.fromRational(this.getMultiplier()));
		}

		return elementsArray.sort(Expression.sortFunction);
	}

	/**
	 * Tests whether this Expression is equal to `x`.
	 *
	 * @param x - The value to compare against.
	 * @returns `true` if the expressions are structurally equal.
	 *
	 * @example
	 * ```ts
	 * Expression.create('x+1').eq('1+x')   // true
	 * Expression.create(3).eq(4)            // false
	 * ```
	 */
	eq(x: ParserInputType | ExpressionInputType) {
		x = Expression.create(x);
		return equal(this, x);
	}

	/**
	 * Numerically evaluates this Expression, optionally substituting values for variables.
	 *
	 * Converts the expression to text and re-parses with `Settings.EVALUATE` enabled,
	 * collapsing symbolic constants (π, e, etc.) to their numeric values.
	 *
	 * @param values - Optional variable substitutions.
	 * @returns The evaluated Expression.
	 *
	 * @example
	 * ```ts
	 * Expression.create('x^2 + 1').evaluate({ x: 3 }).text()   // "10"
	 * Expression.create('pi/2').evaluate().text()               // "1.5707963..."
	 * ```
	 */
	evaluate(values?: ParserValuesObject) {
		return Parser.evaluate(this.text(), values);
	}
	/**
	 * Expands this Expression by distributing products over sums and applying
	 * polynomial expansion.
	 *
	 * @returns A new expanded Expression.
	 *
	 * @example
	 * ```ts
	 * Expression.create('(x+1)^2').expand().text()       // "1+2*x+x^2"
	 * Expression.create('(a+b)*(c+d)').expand().text()   // "a*c+a*d+b*c+b*d"
	 * ```
	 */
	expand(): Expression {
		return expand(this);
	}
	/**
	 * Applies a transformation function to every sub-element and returns a new Expression
	 * built from the results. Unlike {@link each}, this method produces a new Expression.
	 *
	 * @param fn - A function that receives each sub-expression and returns its replacement.
	 * @returns A new Expression with transformed elements.
	 */
	forEveryElement(fn: (x: Expression) => Expression) {
		return forEveryElement(this, fn);
	}
	/**
	 * Collects all function names used in this Expression.
	 *
	 * @param fns - Optional accumulator array to append results to.
	 * @param getValues - When `true`, collects the full function sub-expressions instead of just names.
	 * @returns An array of function name strings (or Expression values if `getValues` is `true`).
	 *
	 * @example
	 * ```ts
	 * Expression.create('sin(x) + cos(y)').functions()   // ["sin", "cos"]
	 * ```
	 */
	functions(fns?: string[], getValues?: boolean) {
		return functions(this, fns, getValues);
	}

	/**
	 * Returns the arguments of this function-typed Expression.
	 *
	 * If no arguments have been set, initialises and returns an empty array.
	 *
	 * @returns The function arguments as an array of Expressions.
	 *
	 * @example
	 * ```ts
	 * Expression.create('sin(x)').getArguments()[0].text()   // "x"
	 * ```
	 */
	getArguments(): Expression[] {
		if (!this.args) {
			this.args = [];
		}
		return this.args;
	}

	/**
	 * Returns the base of an EXP-typed Expression. For non-EXP types, returns the
	 * linear, unit-multiplier form.
	 *
	 * @returns The base Expression.
	 *
	 * @example
	 * ```ts
	 * Expression.create('x^3').getBase().text()   // "x"
	 * ```
	 */
	getBase() {
		// if (!this.isEXP()) {
		// 	console.warn('wrong!!! ', this.text(), String(this.getArguments()[0]));
		// }
		if (this.isEXP()) {
			return this.base!;
		}
		return this.toLinearAndUnitMultiplier();
	}

	/**
	 * Extracts the denominator of this Expression when viewed as a fraction.
	 *
	 * @returns The denominator Expression.
	 *
	 * @example
	 * ```ts
	 * Expression.create('x/y').getDenominator().text()   // "y"
	 * Expression.create('3/4').getDenominator().text()    // "4"
	 * ```
	 */
	getDenominator() {
		return getDenominator(this);
	}

	/**
	 * Returns the internal sub-elements record for SUM, PRD, and GRP types.
	 *
	 * Returns an empty object if no elements exist.
	 *
	 * @returns A record mapping keys to sub-expressions.
	 */
	getElements() {
		if (!this.elements) {
			return {};
		}
		return this.elements;
	}

	/**
	 * Returns the rational multiplier (coefficient) of this Expression.
	 *
	 * Creation is deferred until first access. For `NUM` types, the multiplier
	 * carries the numeric value. For other types, it defaults to `1`.
	 *
	 * @param asExpression - When `true`, returns the multiplier wrapped in an Expression.
	 * @returns The multiplier as a {@link Rational}, or as an Expression if `asExpression` is `true`.
	 *
	 * @example
	 * ```ts
	 * Expression.create('3*x').getMultiplier().text()           // "3"
	 * Expression.create('3*x').getMultiplier(true).text()       // "3"
	 * ```
	 */
	getMultiplier(asExpression: true): Expression;
	getMultiplier(asExpression: false): Rational;
	getMultiplier(): Rational;
	getMultiplier(asExpression?: boolean) {
		if (!this.multiplier) {
			const value = this.type === NUM ? this.value : '1';
			this.multiplier = Rational.create(value);
		}

		if (asExpression) {
			return Expression.create(this.multiplier);
		}

		return this.multiplier;
	}

	/**
	 * Extracts the numerator of this Expression when viewed as a fraction.
	 *
	 * @returns The numerator Expression.
	 *
	 * @example
	 * ```ts
	 * Expression.create('x/y').getNumerator().text()   // "x"
	 * Expression.create('3/4').getNumerator().text()    // "3"
	 * ```
	 */
	getNumerator() {
		return getNumerator(this);
	}

	/**
	 * Returns the power (exponent) of this Expression.
	 *
	 * Creation is deferred until first access. Defaults to `0` for `NUM` types
	 * and `1` for all others.
	 *
	 * @returns The power as an Expression.
	 *
	 * @example
	 * ```ts
	 * Expression.create('x^3').getPower().text()   // "3"
	 * Expression.create('x').getPower().text()     // "1"
	 * ```
	 */
	getPower() {
		if (!this.power) {
			// Don't use shortcuts as this power may later be modified.
			if (this.isNUM()) {
				this.power = Expression.Number('0');
			} else {
				this.power = Expression.Number('1');
			}
		}

		return this.power;
	}

	/**
	 * Extracts a specific variable from a product expression. If the expression's
	 * value matches the variable name, returns the entire expression.
	 *
	 * @param variable - The variable name to search for.
	 * @returns The matching sub-expression, or `undefined` if not found.
	 */
	getVariable(variable: string) {
		return getVariable(this, variable);
	}

	/**
	 * Tests whether this Expression is greater than `x`.
	 *
	 * @param x - The value to compare against.
	 * @returns `true` if `this > x`.
	 *
	 * @example
	 * ```ts
	 * Expression.create(5).gt(3)   // true
	 * ```
	 */
	gt(x: ExpressionInputType | ParserInputType) {
		x = Expression.create(x);
		return gt(this, x);
	}

	/**
	 * Tests whether this Expression is greater than or equal to `x`.
	 *
	 * @param x - The value to compare against.
	 * @returns `true` if `this >= x`.
	 *
	 * @example
	 * ```ts
	 * Expression.create(5).gte(5)   // true
	 * ```
	 */
	gte(x: ExpressionInputType | ParserInputType) {
		x = Expression.create(x);
		return gte(this, x);
	}

	/**
	 * Checks whether this Expression contains a function with the given name.
	 *
	 * @param name - The function name to search for (e.g. `"sin"`, `"cos"`).
	 * @param deep - When `true`, searches recursively into sub-expressions.
	 * @returns `true` if the function is found.
	 *
	 * @example
	 * ```ts
	 * Expression.create('sin(x) + 1').hasFunction('sin')   // true
	 * Expression.create('x + 1').hasFunction('sin')        // false
	 * ```
	 */
	hasFunction(name: string, deep = false) {
		return hasFunction(this, name, deep);
	}

	/**
	 * Checks whether this Expression has a fractional (radical) power, such as `x^(1/2)`.
	 *
	 * @param checkIrrationalDenominator - When `true`, also requires the power to be negative
	 *   (i.e. a radical in the denominator).
	 * @returns `true` if a radical power is present.
	 *
	 * @example
	 * ```ts
	 * Expression.create('x^(1/2)').hasRadical()   // true
	 * Expression.create('x^2').hasRadical()       // false
	 * ```
	 */
	hasRadical(checkIrrationalDenominator?: boolean) {
		const p = this.getPower();
		const m = p.getMultiplier();
		const isRadical = p.isNUM() && m.denominator !== 1n;
		if (checkIrrationalDenominator) {
			return isRadical && m.isNegative();
		}
		return isRadical;
	}

	/**
	 * Checks whether this Expression contains the specified variable.
	 *
	 * @param variable - The variable name to search for.
	 * @returns `true` if the variable appears anywhere in the expression tree.
	 *
	 * @example
	 * ```ts
	 * Expression.create('x^2 + y').hasVariable('x')   // true
	 * Expression.create('x^2 + y').hasVariable('z')   // false
	 * ```
	 */
	hasVariable(variable: string) {
		return hasVariable(this, variable);
	}

	/**
	 * Multiplies this Expression by the imaginary unit, converting it to an imaginary value.
	 *
	 * @returns A new Expression equal to `this * i`.
	 *
	 * @example
	 * ```ts
	 * Expression.create(3).i().text()   // "3*i"
	 * ```
	 */
	i() {
		return this.times(Expression.Img());
	}

	/**
	 * Returns a string representation used internally for structural comparison
	 * of expressions.
	 *
	 * @returns A string identifier suitable for equality checks.
	 */
	idString() {
		return this.text(undefined, true);
	}

	/**
	 * Extracts the imaginary part of this Expression.
	 *
	 * @returns The imaginary component (without the `i` factor).
	 *
	 * @example
	 * ```ts
	 * Expression.create('3+2*i').imagPart().text()   // "2"
	 * Expression.create('x').imagPart().text()       // "0"
	 * ```
	 */
	imagPart() {
		return imagPart(this);
	}

	/**
	 * Returns the multiplicative inverse (reciprocal) of this Expression: `1/this`.
	 *
	 * Negates the power and inverts the multiplier. For complex expressions, falls
	 * back to division. If the result contains a radical denominator, it is rationalised.
	 *
	 * @returns The reciprocal Expression.
	 *
	 * @example
	 * ```ts
	 * Expression.create('x').invert().text()     // "x^(-1)"
	 * Expression.create(4).invert().text()       // "1/4"
	 * ```
	 */
	invert() {
		let retval;
		if (this.isComplex()) {
			retval = one().div(this);
		} else {
			retval = new Expression(this);
			retval.power = retval.getPower().neg();
			retval.multiplier = retval.getMultiplier().invert();
		}

		if (retval.hasRadical()) {
			return rationalizeRadical(retval);
		}

		return retval;
	}

	/**
	 * Checks whether this Expression contains the imaginary variable.
	 *
	 * @returns `true` if the expression is complex.
	 *
	 * @example
	 * ```ts
	 * Expression.create('3+2*i').isComplex()   // true
	 * Expression.create('x').isComplex()       // false
	 * ```
	 */
	isComplex() {
		return this.hasVariable(Expression.imaginary);
	}

	/**
	 * Checks whether this Expression evaluates to a constant (no free variables).
	 *
	 * Returns `true` for plain numbers, known parser constants like `pi` and `e`,
	 * constant-base/constant-power EXP nodes (e.g. `3^(1/2)`), and sums/products
	 * where every element is itself constant.
	 *
	 * @returns `true` if the expression is constant.
	 *
	 * @example
	 * ```ts
	 * Expression.create(5).isConstant()          // true
	 * Expression.create('pi').isConstant()       // true
	 * Expression.create('x + 1').isConstant()    // false
	 * ```
	 */
	isConstant(): boolean {
		if (this.isSum() || this.isProduct()) {
			const elements = this.getElements();
			for (const x in elements) {
				if (!elements[x].isConstant()) {
					return false;
				}
			}
			return true;
		}
		return (
			this.isNUM() ||
			// Test for cases like pi & e
			(this.value in PARSER_CONSTANTS && this.isVAR()) ||
			// Test for cases like 3^(1/2)
			(this.isEXP() && this.getBase().isConstant() && this.getPower().isConstant())
		);
	}

	/**
	 * Checks whether this Expression is the symbolic constant *e* (Euler's number).
	 *
	 * @returns `true` if the value is `"e"`.
	 */
	isE() {
		return this.value === E;
	}

	/**
	 * Checks whether this Expression is an even integer.
	 *
	 * @returns `true` if the expression is `NUM` and its multiplier is even.
	 *
	 * @example
	 * ```ts
	 * Expression.create(4).isEven()    // true
	 * Expression.create(3).isEven()    // false
	 * ```
	 */
	isEven(): boolean {
		return this.isNUM() && this.getMultiplier().isEven();
	}

	/**
	 * Checks whether this Expression has the EXP (exponential/power) internal type.
	 *
	 * @returns `true` if the type is EXP.
	 */
	isEXP() {
		return this.type === EXP;
	}

	/**
	 * Checks whether this Expression is a function node. If `names` is provided,
	 * checks that the function name matches.
	 *
	 * @param names - A single function name, an array of names, or `undefined` to
	 *   match any function.
	 * @returns `true` if the expression is a function (optionally matching the given name(s)).
	 *
	 * @example
	 * ```ts
	 * Expression.create('sin(x)').isFunction()          // true
	 * Expression.create('sin(x)').isFunction('sin')     // true
	 * Expression.create('sin(x)').isFunction('cos')     // false
	 * Expression.create('x').isFunction()               // false
	 * ```
	 */
	isFunction(names?: string | string[]): boolean {
		let retval: boolean;
		if (names === undefined) {
			retval = this.type === FUN;
		} else if (typeof names === 'string') {
			retval = names === this.name;
		} else {
			retval = names.includes(String(this.name));
		}

		return retval;
	}

	/**
	 * Checks whether this Expression is exactly `1/2`.
	 *
	 * @returns `true` if the expression is the numeric value `1/2`.
	 */
	isHalf() {
		if (this.isNUM()) {
			const m = this.getMultiplier();
			return m.numerator === 1n && m.denominator === 2n;
		}
		return false;
	}

	/**
	 * Checks whether this Expression is the imaginary unit variable.
	 *
	 * @returns `true` if the value matches the current imaginary symbol (default `"i"`).
	 */
	isI() {
		return this.value === Expression.imaginary;
	}

	/**
	 * Checks whether this Expression represents infinity (positive or negative).
	 *
	 * @returns `true` if the type is INF.
	 */
	isInf() {
		return this.type === INF;
	}

	/**
	 * Checks whether this Expression is an exact integer.
	 *
	 * @returns `true` if the expression is `NUM` with an integer multiplier.
	 *
	 * @example
	 * ```ts
	 * Expression.create(5).isInteger()       // true
	 * Expression.create('3/2').isInteger()   // false
	 * ```
	 */
	isInteger() {
		if (this.isOne()) {
			return true;
		}
		return this.type === NUM && this.getMultiplier().isInteger();
	}

	/**
	 * Checks whether this Expression has power equal to `1` (i.e. is linear in itself).
	 *
	 * @returns `true` if the power is `1`.
	 */
	isLinear() {
		return this.getPower().isOne();
	}

	/**
	 * Checks whether this Expression is exactly `-1`.
	 *
	 * @returns `true` if the expression equals `-1`.
	 */
	isMinusOne() {
		// Avoid creating an object if not needed
		if (this.isNUM()) {
			if (this.multiplier === undefined && Number(this.value) === -1) {
				return true;
			}

			return this.getMultiplier().isMinusOne();
		}
		return false;
	}

	/**
	 * Checks whether this Expression is numerically close to zero within the
	 * current decimal precision, useful in numerical methods.
	 *
	 * @param k - Safety factor subtracted from the precision to form the epsilon.
	 *   Defaults to `8`.
	 * @returns `true` if both real and imaginary parts are within epsilon of zero.
	 */
	isNearlyZero(k = 8) {
		const eps = new Decimal(10).pow(-Decimal.precision + k);
		const re = this.realPart();
		const im = this.imagPart();
		return re.abs().lte(eps) && im.abs().lte(eps);
	}

	/**
	 * Checks whether this Expression is strictly negative.
	 *
	 * @returns `true` if the expression is less than zero.
	 */
	isNegative() {
		return this.lt(zero());
	}

	/**
	 * Checks whether this Expression is negative infinity (`−∞`).
	 *
	 * @returns `true` if the expression is `−∞`.
	 */
	isNegInf() {
		return this.isInf() && this.getMultiplier().lt('0');
	}

	/**
	 * Checks whether this Expression has the `NUM` (numeric) internal type.
	 *
	 * This only matches explicit numbers, not symbolic constants like `pi` or `e`.
	 * Use {@link isConstant} to check for all values that reduce to a constant.
	 *
	 * @returns `true` if the type is `NUM`.
	 *
	 * @example
	 * ```ts
	 * Expression.create(5).isNUM()        // true
	 * Expression.create('pi').isNUM()     // false
	 * ```
	 */
	isNUM() {
		return this.type === NUM;
	}

	/**
	 * Checks whether this Expression is an odd integer.
	 *
	 * @returns `true` if the expression is not even.
	 */
	isOdd(): boolean {
		return !this.isEven();
	}

	/**
	 * Checks whether this Expression is exactly `1`.
	 *
	 * @returns `true` if the expression equals `1`.
	 */
	isOne() {
		// Avoid creating an object if not needed
		if (this.isNUM()) {
			const m = this.getMultiplier();
			return m.numerator === 1n && m.denominator === 1n;
		}
		return false;
	}

	/**
	 * Checks whether this Expression is the symbolic constant π (or a recognised alias).
	 *
	 * @returns `true` if the value matches a known π symbol.
	 */
	isPi() {
		return PI.includes(this.value);
	}

	/**
	 * Checks whether this Expression is a plain variable with no multiplier and
	 * no power (i.e. multiplier `1`, power `1`, type `VAR`).
	 *
	 * @returns `true` for a bare variable like `x`.
	 *
	 * @example
	 * ```ts
	 * Expression.create('x').isPlainVariable()      // true
	 * Expression.create('2*x').isPlainVariable()    // false
	 * Expression.create('x^2').isPlainVariable()    // false
	 * ```
	 */
	isPlainVariable() {
		return this.isVAR() && this.getMultiplier().isOne() && this.getPower().isOne();
	}

	/**
	 * Checks whether this Expression is polynomial-like: all terms are variables
	 * with non-negative integer powers and rational coefficients.
	 *
	 * @returns `true` if the expression qualifies as polynomial-like.
	 */
	isPolynomialLike() {
		return isPolynomialLike(this);
	}

	/**
	 * Checks whether this Expression is positive infinity (`+∞`).
	 *
	 * @returns `true` if the expression is `+∞`.
	 */
	isPosInf() {
		return this.isInf() && this.getMultiplier().gt(zero());
	}

	/**
	 * Checks whether this Expression has the PRD (product) internal type.
	 *
	 * @returns `true` if the type is PRD.
	 */
	isProduct() {
		return this.type === PRD;
	}

	/**
	 * Checks whether this Expression is exactly `1/4`.
	 *
	 * @returns `true` if the expression is the numeric value `1/4`.
	 */
	isQuarter() {
		if (this.isNUM()) {
			const m = this.getMultiplier();
			return m.numerator === 1n && m.denominator === 4n;
		}
		return false;
	}

	/**
	 * Checks whether this Expression is a summation-like type (SUM or GRP).
	 *
	 * @returns `true` if the type is SUM or GRP.
	 */
	isSum() {
		return this.type === SUM || this.type === GRP;
	}

	/**
	 * Checks whether this Expression has the VAR (variable) internal type.
	 *
	 * @returns `true` if the type is VAR.
	 */
	isVAR() {
		return this.type === VAR;
	}

	/**
	 * Checks whether this Expression is exactly `0`.
	 *
	 * @returns `true` if the multiplier is zero.
	 *
	 * @example
	 * ```ts
	 * Expression.create(0).isZero()   // true
	 * Expression.create(1).isZero()   // false
	 * ```
	 */
	isZero() {
		return this.getMultiplier().isZero();
	}

	/**
	 * Returns a canonical key string used internally to determine whether two
	 * expressions can be combined (e.g. added or collected). Expressions that
	 * return the same `keyValue` are structurally compatible.
	 *
	 * @param asSubExpression - When `true`, includes the full text rather than the hash.
	 * @param isGroup - When `true`, uses the power as the key (for GRP types).
	 * @returns A unique key string for this expression type.
	 */
	keyValue(asSubExpression: boolean = false, isGroup: boolean = false): string {
		let retval: string = '';

		// For GRP the key is always the power
		if (isGroup) {
			retval = this.getPower().text();
		} else {
			switch (this.type) {
				case NUM:
					// If we're appending we need the hash. However when generating a hash, we want the actual value.
					retval = asSubExpression ? this.value : Expression.numberHash;
					break;
				case VAR:
				case FUN:
				case EXP:
				case INF:
					// Return the id string since we don't want the multiplier for comparison.
					retval = asSubExpression ? this.idString() : this.value;
					break;
				case GRP:
					retval = asSubExpression
						? this.text()
						: anyObject(this.getElements()).keyValue();
					break;
				case SUM:
				case PRD:
					// e.g. (1+x) can only directly operate on (1+x) and not (1+2*x), (2+x), etc without inspecting each one
					retval = Expression.getValue(
						Object.values(this.getElements()),
						'text',
						this.type
					);
					break;
			}
		}

		if (!retval) {
			throw new Error(`The function 'keyValue' not yet implemented for type ${this.type}`);
		}

		return retval;
	}

	/**
	 * Tests whether this Expression is less than `x`.
	 *
	 * @param x - The value to compare against.
	 * @returns `true` if `this < x`.
	 *
	 * @example
	 * ```ts
	 * Expression.create(3).lt(5)   // true
	 * ```
	 */
	lt(x: ExpressionInputType | ParserInputType) {
		x = Expression.create(x);
		return lt(this, x);
	}

	/**
	 * Tests whether this Expression is less than or equal to `x`.
	 *
	 * @param x - The value to compare against.
	 * @returns `true` if `this <= x`.
	 *
	 * @example
	 * ```ts
	 * Expression.create(5).lte(5)   // true
	 * ```
	 */
	lte(x: ExpressionInputType | ParserInputType) {
		x = Expression.create(x);
		return lte(this, x);
	}

	/**
	 * Subtracts `x` from this Expression.
	 *
	 * @param x - The value to subtract.
	 * @returns A new Expression representing `this − x`.
	 *
	 * @example
	 * ```ts
	 * Expression.create('x').minus(1).text()   // "-1+x"
	 * Expression.create(10).minus(3).text()    // "7"
	 * ```
	 */
	minus(x: ExpressionInputType) {
		return subtract(this, Expression.create(x));
	}

	/**
	 * Computes the modulo of this Expression by `x`.
	 *
	 * @param x - The divisor.
	 * @returns A new Expression representing `this mod x`.
	 *
	 * @example
	 * ```ts
	 * Expression.create(10).mod(3).text()   // "1"
	 * ```
	 */
	mod(x: ExpressionInputType) {
		return mod(this, Expression.create(x));
	}

	/**
	 * Negates this Expression by flipping the sign of the multiplier.
	 *
	 * @returns A new Expression equal to `this * −1`.
	 *
	 * @example
	 * ```ts
	 * Expression.create(5).neg().text()      // "-5"
	 * Expression.create('x').neg().text()    // "-x"
	 * ```
	 */
	neg() {
		const retval = this.copy();
		retval.multiplier = retval.getMultiplier().neg();
		return retval;
	}

	/**
	 * Re-parses this Expression's internal value string to create a fresh Expression,
	 * effectively stripping the multiplier and power.
	 *
	 * @returns A new Expression parsed from the value string.
	 */
	parseValue(): Expression {
		return Expression.create(this.value);
	}

	/**
	 * Adds `x` to this Expression.
	 *
	 * @param x - The value to add.
	 * @returns A new Expression representing `this + x`.
	 *
	 * @example
	 * ```ts
	 * Expression.create('x').plus(1).text()   // "1+x"
	 * Expression.create(2).plus(3).text()     // "5"
	 * ```
	 */
	plus(x: ExpressionInputType) {
		return add(this, Expression.create(x));
	}

	/**
	 * Raises this Expression to the given power.
	 *
	 * @param x - The exponent.
	 * @returns A new Expression representing `this ^ x`.
	 *
	 * @example
	 * ```ts
	 * Expression.create('x').pow(2).text()   // "x^2"
	 * Expression.create(2).pow(10).text()    // "1024"
	 * ```
	 */
	pow(x: ExpressionInputType) {
		return power(this, Expression.create(x));
	}

	/**
	 * Extracts the real part of this Expression.
	 *
	 * @returns The real component.
	 *
	 * @example
	 * ```ts
	 * Expression.create('3+2*i').realPart().text()   // "3"
	 * Expression.create('x').realPart().text()       // "x"
	 * ```
	 */
	realPart() {
		return realPart(this);
	}

	/**
	 * Returns the sign of this Expression's multiplier as `1`, `-1`, or `0`.
	 *
	 * For EXP types, the sign accounts for both the base sign and the multiplier sign.
	 * This is the raw multiplier sign, not the mathematical `sign()` function.
	 *
	 * @returns `1`, `-1`, or `0`.
	 */
	sign(): number {
		// REFACTOR:
		// Deal with numeric EXP
		if (this.type === EXP) {
			return this.getBase().sign() * this.getMultiplier().sign();
		}
		return this.getMultiplier().sign();
	}

	/**
	 * Returns a sign-free (non-negative) version of this Expression.
	 *
	 * For complex expressions, returns the modulus `sqrt(re² + im²)`.
	 * For real expressions, negates the multiplier if it is negative.
	 *
	 * @returns A new Expression with the sign removed.
	 */
	signFree(): Expression {
		let retval;
		if (this.isComplex()) {
			retval = hypot(this.realPart(), this.imagPart()) as Expression;
		} else {
			retval = this.copy();
			const m = retval.getMultiplier();
			// Remove the minus sign from retval value. This is specifically for EXP of numeric values
			if (retval.value.startsWith('-')) {
				retval.value = retval.value.substring(1);
			}
			if (m.lt('0')) {
				retval.multiplier = m.neg();
			}
		}

		return retval;
	}

	/**
	 * Returns a SymPy-compatible text representation, using `**` for exponentiation
	 * instead of `^`.
	 *
	 * @param options - Formatting options.
	 * @param asId - When `true`, produces the id-string form.
	 * @returns A SymPy-friendly string.
	 *
	 * @example
	 * ```ts
	 * Expression.create('x^2').sptext()   // "x**2"
	 * ```
	 */
	sptext(options?: OptionsObject, asId?: boolean) {
		// Store the existing power operator
		const opr = Expression.POW_OPR;
		// Use the SymPy type
		Expression.POW_OPR = '**';
		const txt = toText(this, options, asId);
		// Put back the original
		Expression.POW_OPR = opr;
		return txt;
	}

	/**
	 * Squares this Expression. Shorthand for `this.pow('2')`.
	 *
	 * @returns A new Expression representing `this²`.
	 *
	 * @example
	 * ```ts
	 * Expression.create('x').sq().text()   // "x^2"
	 * Expression.create(5).sq().text()     // "25"
	 * ```
	 */
	sq(): Expression {
		return this.pow('2');
	}

	/**
	 * Tests strict equality: both structural equality and type match. For functions,
	 * the function names must also match exactly.
	 *
	 * @param x - The value to compare against.
	 * @returns `true` if the expressions are strictly equal in both value and type.
	 */
	strictEqual(x: ExpressionInputType) {
		x = Expression.create(x);
		const matchesExactly =
			x.isFunction() && this.isFunction() ? x.name === this.name : x.type === this.type;
		return matchesExactly && equal(this, x);
	}

	/**
	 * Substitutes one sub-expression for another throughout this Expression.
	 *
	 * @param value - The sub-expression to find.
	 * @param withValue - The replacement expression.
	 * @returns A new Expression with the substitution applied.
	 *
	 * @example
	 * ```ts
	 * Expression.create('x^2 + x').subst('x', '2').text()     // "6"
	 * Expression.create('sin(x)').subst('x', 'pi').text()     // "0"
	 * ```
	 */
	subst(value: ExpressionInputType, withValue: ExpressionInputType) {
		value = Expression.create(value);
		withValue = Expression.create(withValue);
		return subst(this, value, withValue);
		// Based on the value:
		// If it's a number then complain. Invalid LH value
		// If it's a variable then return the multiplier times that value
		// If it's a function and the value is equal to that values within some multiplier the sub
		//     otherwise call sub on the arguments.
		// If it's a sum then loop through each element and sub except for numbers
		//     if a number is encountered and the difference is positive then sub it in and return the difference
	}

	/**
	 * Returns the human-readable string representation of this Expression.
	 *
	 * This is the primary output method. By default uses exact rational form.
	 * Pass `{ decimal: true }` for decimal output or `{ precision: n }` to
	 * control the number of significant digits.
	 *
	 * @param options - Formatting options.
	 * @param options.decimal - When `true`, renders numbers as decimals.
	 * @param options.precision - The decimal precision to use.
	 * @param asId - When `true`, produces the id-string form used for internal comparison.
	 * @returns The text representation.
	 *
	 * @example
	 * ```ts
	 * Expression.create('x^2 + 1').text()                     // "1+x^2"
	 * Expression.create('1/3').text()                          // "1/3"
	 * Expression.create('1/3').text({ decimal: true })         // "0.333..."
	 * ```
	 */
	text(options?: OptionsObject, asId?: boolean) {
		return toText(this, options, asId);
	}

	/**
	 * Multiplies this Expression by `x`.
	 *
	 * @param x - The value to multiply by.
	 * @returns A new Expression representing `this * x`.
	 *
	 * @example
	 * ```ts
	 * Expression.create('x').times(3).text()     // "3*x"
	 * Expression.create('x').times('y').text()   // "x*y"
	 * ```
	 */
	times(x: ExpressionInputType) {
		return multiply(this, Expression.create(x));
	}

	// /**
	//  * Converts the expression to a predictable (standard) string for easy matching with respect to a variable.
	//  *
	//  * @param variable
	//  * @returns
	//  */
	// toPattern(variable: string) {
	//     return toPattern(this, variable);
	// }

	/**
	 * Strips the power and multiplier from the expression by re-parsing the
	 * internal value string. Equivalent to calling {@link parseValue}.
	 *
	 * @returns A new Expression with multiplier `1` and power `1`.
	 */
	toLinearAndUnitMultiplier() {
		return this.parseValue();
	}

	/**
	 * Returns the string representation. Alias for {@link text}.
	 *
	 * @param options - Formatting options passed to {@link text}.
	 * @returns The text representation.
	 */
	toString(options?: OptionsObject) {
		return this.text(options);
	}

	/**
	 * Returns the total degree of a monomial by summing the powers of all factors
	 * in a product expression. For non-product types, returns the expression's own power.
	 *
	 * @returns The total power as an Expression.
	 *
	 * @example
	 * ```ts
	 * Expression.create('x^2*y^3').totalPower().text()   // "5"
	 * Expression.create('x^4').totalPower().text()       // "4"
	 * ```
	 */
	totalPower() {
		if (!this.isProduct()) {
			return this.getPower();
		}

		let retval = Expression.Number('0');
		const elements = this.getElements();
		for (const x in elements) {
			retval = retval.plus(elements[x].getPower());
		}
		return retval;
	}

	/**
	 * Returns a copy of this Expression with the multiplier removed (set to `1`).
	 *
	 * For `NUM` types (where the multiplier *is* the value), returns `1`.
	 *
	 * @returns A new multiplier-free Expression.
	 *
	 * @example
	 * ```ts
	 * Expression.create('3*x').toUnitMultiplier().text()   // "x"
	 * Expression.create(5).toUnitMultiplier().text()       // "1"
	 * ```
	 */
	toUnitMultiplier(): Expression {
		let retval: Expression;
		if (this.isNUM()) {
			// Since type NUM carries its value in the multiplier,
			// the remainder is just one
			retval = one();
		} else {
			retval = this.copy();
			delete retval.multiplier;
		}

		return retval;
	}

	/**
	 * Regenerates the internal `value` string after structural modifications
	 * (e.g. after changing arguments or elements). Should be called whenever the
	 * expression tree has been mutated.
	 *
	 * @returns This Expression (for chaining).
	 */
	updateValue() {
		if (this.isFunction()) {
			this.value = `${this.name}(${this.getArguments()
				.map(x => x.text())
				.join(', ')})`;
		} else if (this.isProduct() || this.isSum()) {
			this.value = Expression.getValue(this.elementsArray(), 'text', this.type);
		}

		return this;
	}

	/**
	 * Collects all variable names used in this Expression.
	 *
	 * @param vars - Optional accumulator array to append results to.
	 * @returns An array of variable name strings.
	 *
	 * @example
	 * ```ts
	 * Expression.create('x^2 + 3*y + 1').variables()   // ["x", "y"]
	 * ```
	 */
	variables(vars?: string[]) {
		return variables(this, vars);
	}
}
