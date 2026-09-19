import Decimal from 'decimal.js';

import { abs, mod } from '../../../math/math';
import { isNerdamerNativeType } from '../../common/common';
import { message, UnexpectedDataType } from '../../errors';
import { build } from '../../functions/build';
import { imagPart, realPart } from '../../functions/complex';
import { expand } from '../../functions/expand/expand';
import { subst } from '../../functions/subst';
import { Settings } from '../../Settings';
import {
	EXPRESSION_TYPES,
	EXPRESSION,
	EQUATION,
	INFINITY,
	E,
	PI,
	DEFAULT_IMAGINARY,
	IMAGPART,
	INDEX_VARIABLE,
	LOG as LOG_FUNCTION,
	REALPART,
	PARSER_CONSTANTS,
	SYMBOLIC_ACCESSOR,
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
import type { ParserEntity, ExpressionInput, NerdamerInput } from '../../types';
import type { Equation } from '../equation/Equation';
import type { ParserValuesObject, TextOptions } from '../parser/types';

export type ElementsSortType = (a: Expression, b: Expression) => number;

const { NUM, VAR, EXP, FUN, GRP, PRD, SUM, INF } = EXPRESSION_TYPES;

/**
 * Represents a symbolic expression in Nerdamer's canonical expression tree.
 *
 * @remarks
 * `Expression` is the central symbolic value type used by the parser and by the
 * algebra, calculus, and solver layers. Parsed expressions are normalized into a
 * small set of internal node categories such as numbers, variables, functions,
 * powers, products, and sums. Numeric coefficients are normally stored in a
 * {@link Rational} multiplier rather than as separate product elements.
 *
 * Most arithmetic and transformation methods return a new `Expression`, but the
 * class itself is mutable because parser and algorithm internals rebuild nodes in
 * place. Accessors such as {@link Expression.getArguments},
 * {@link Expression.getMultiplier}, and {@link Expression.getPower} may lazily
 * initialize and return internal objects. Use {@link Expression.copy} when an
 * independently mutable expression tree is required.
 *
 * {@link Expression.create} is the preferred construction API. In particular,
 * `Expression.create(existingExpression)` preserves object identity unless its
 * `copy` argument is set to `true`.
 *
 * The internal expression groups are organizational categories used by Nerdamer's
 * canonicalization logic. They should not be confused with general mathematical
 * classifications:
 *
 * - `NUM` stores plain numeric values.
 * - `VAR` stores symbols/variables whose powers fit the variable representation.
 * - `EXP` stores bases with powers that require a separate exponential node; it is
 *   not the same thing as an exponential function.
 * - `FUN` stores function calls.
 * - `GRP` stores sums with a common base but differing powers, such as
 *   `x + x^y` or `cos(x) - 3*cos(x)^2`.
 * - `PRD` stores products of non-numeric symbolic factors; numeric coefficients are
 *   moved to the outer multiplier during parsing.
 * - `SUM` stores other sums. For example, `1 + x + x^2` is a `SUM` containing a
 *   numeric term and a grouped polynomial-like component.
 * - `INF` stores infinite values.
 *
 * @example
 * ```ts
 * const expression = Expression.create('2*x + 1');
 *
 * expression.text();                     // "1+2*x"
 * expression.evaluate({ x: 3 }).text();   // "7"
 * ```
 */
export class Expression implements Base<Expression> {
	/**
	 * Controls whether addition first distributes an outer multiplier on a sum.
	 *
	 * @remarks
	 * This is a process-wide parser/algebra setting used by the addition operation.
	 * Changing it affects subsequent symbolic operations globally.
	 */
	static DISTRIBUTE_MULTIPLIER = true;

	/**
	 * The symbol currently reserved for the imaginary unit.
	 *
	 * Use {@link Parser.setI} to change the symbol so the parser's restricted-name
	 * bookkeeping is updated at the same time.
	 */
	public static imaginary = DEFAULT_IMAGINARY;

	/** Names used by the internal logarithm representation and converters. */
	static LOG = LOG_FUNCTION;
	static LOG10 = 'log_10';
	/**
	 * Placeholder key used when numeric terms are grouped inside expression containers.
	 *
	 * This is part of the internal canonical-key representation rather than the
	 * rendered mathematical value of a number.
	 */
	public static numberHash = '#';

	/** Power operator used by expression text formatting. */
	static POW_OPR = '^';

	/**
	 * Symbols excluded from ordinary variable collection.
	 *
	 * @remarks
	 * This list differs from the parser's restricted-name list.
	 * It is used by expression traversal when deciding which `VAR` nodes should be
	 * reported as free variables. The distinction is historical and should not be
	 * interpreted as a general parser-reservation policy.
	 */
	public static RESERVED: string[] = [E].concat(PI).concat(INFINITY);

	/**
	 * Comparator used when expression elements are emitted in canonical display order.
	 *
	 * @remarks
	 * The ordering is representational, not a mathematical ordering relation. It keeps
	 * the imaginary unit last, orders like node types by value and descending power,
	 * and otherwise falls back to the internal expression-type order. Replacing this
	 * function changes ordering globally for subsequent formatting and reconstruction.
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

	/** Internal expression-type constants used by parser and algebra code. */
	static TYPES = EXPRESSION_TYPES;

	/**
	 * Arguments stored by a function node.
	 *
	 * Prefer {@link Expression.getArguments} when consuming this representation.
	 */
	args?: Expression[];

	/**
	 * Explicit mathematical base stored by an `EXP` node.
	 *
	 * Non-`EXP` nodes derive their base through {@link Expression.getBase} instead.
	 */
	base?: Expression;

	/** Parser entity discriminator for expression values. */
	dataType: string = EXPRESSION;
	/**
	 * Signals that the Expression was parsed with the deferred flag true
	 */
	deferred: boolean = false;

	/**
	 * Canonically keyed child expressions for aggregate nodes such as sums and products.
	 *
	 * @remarks
	 * The record is mutable representation state. {@link Expression.getElements}
	 * returns this object directly when it exists; callers that mutate it are
	 * responsible for preserving a valid expression representation and regenerating derived values.
	 */
	elements?: Record<string, Expression> = undefined;

	/**
	 * Let's the parser know not to treat it as a set of values
	 */
	isEnumerable: boolean = false;

	/**
	 * Outer rational coefficient carried by this node when explicitly initialized.
	 *
	 * Use {@link Expression.getMultiplier} to obtain the effective multiplier.
	 */
	multiplier?: Rational;

	/**
	 * The function name if any
	 */
	name?: string;

	/**
	 * Outer power carried by this node when explicitly initialized.
	 *
	 * Use {@link Expression.getPower} to obtain the effective power.
	 */
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
	 * Constructs or copies an expression value.
	 *
	 * @remarks
	 * Direct construction is primarily a representation-level API. When `x` is an
	 * existing `Expression`, the constructor deep-copies its expression tree. When
	 * `plainConstruct` is `true` and `x` is a string, that string is stored as the
	 * raw node value without parsing. Other inputs are delegated to
	 * {@link Expression.create}, and JavaScript constructor return semantics therefore
	 * allow that factory-created expression to become the result of `new Expression(...)`.
	 *
	 * For ordinary user input, prefer {@link Expression.create}; it makes parsing and
	 * identity behavior explicit.
	 *
	 * @param x - The expression or Nerdamer input used to construct the value.
	 * @param plainConstruct - Store a string as a raw internal value instead of parsing it.
	 *
	 * @example
	 * ```ts
	 * const expression = Expression.create('x + 1');
	 * const copy = new Expression(expression);
	 *
	 * copy === expression; // false
	 * copy.text();         // "1+x"
	 * ```
	 */
	constructor(x: NerdamerInput, plainConstruct?: boolean) {
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
	 * Converts supported Nerdamer input into an `Expression`.
	 *
	 * @remarks
	 * Strings and primitive numeric inputs are parsed through {@link Parser}. An
	 * existing `Expression` is returned unchanged when no substitution `values` are
	 * supplied; pass `copy: true` to request an independent deep copy. A
	 * {@link Rational} is converted to a numeric expression while preserving its
	 * decimal-origin marker.
	 *
	 * An {@link Equation} is converted to its residual expression by moving the right
	 * side to the left on a copy of the equation. For example, `x = 2` becomes the
	 * expression `x - 2` in canonical form.
	 *
	 * @param x - The expression-compatible input to convert.
	 * @param values - Parser substitutions applied while parsing non-`Expression` input.
	 * @param copy - Copy an existing `Expression` instead of preserving its identity.
	 * @returns The parsed, converted, reused, or copied expression.
	 * @throws {@link core!UnexpectedDataType}
	 * Thrown when parsing produces another parser entity, such as a vector or matrix,
	 * where an `Expression` is required.
	 *
	 * @example
	 * ```ts
	 * const expression = Expression.create('x^2 + 1');
	 *
	 * Expression.create(expression) === expression;                // true
	 * Expression.create(expression, undefined, true) === expression; // false
	 * Expression.create('a+b', { a: 2, b: 3 }).text();             // "5"
	 * ```
	 */
	public static create(
		x: NerdamerInput,
		values?: ParserValuesObject,
		copy?: boolean
	): Expression {
		if (Expression.isExpression(x) && !values) {
			return copy ? x.copy() : x;
		} else if (Rational.isRational(x)) {
			return Expression.fromRational(x);
		} else if (isNerdamerNativeType(x, EQUATION)) {
			return (x as Equation).toLHS().LHS;
		}

		const retval = Parser.parse(String(x), values);

		if (!Expression.isExpression(retval)) {
			throw new UnexpectedDataType(
				message('expressionExpected', { type: dataTypes[retval.dataType] })
			);
		}

		return retval;
	}

	/**
	 * Creates Euler's constant as a symbolic or evaluated expression.
	 *
	 * @param asNumericValue - Force the evaluated representation even when parser
	 * evaluation mode is disabled.
	 * @returns Symbolic `e`, or its current numeric representation when evaluation is enabled.
	 *
	 * @example
	 * ```ts
	 * Expression.E().text();     // "e"
	 * Expression.E(true).text(); // numeric approximation
	 * ```
	 */
	public static E(asNumericValue?: boolean) {
		if (Settings.EVALUATE || asNumericValue) {
			return Expression.fromRational(Rational.E);
		}
		return Expression.Variable(E);
	}

	/**
	 * Converts a rational value into a numeric expression.
	 *
	 * The conversion preserves the rational's `asDecimal` provenance flag so later
	 * formatting and decimal-contagion logic can distinguish decimal-origin values.
	 *
	 * @param x - Rational value to convert.
	 * @returns A new numeric expression with an independent multiplier.
	 *
	 * @example
	 * ```ts
	 * const rational = Rational.create('3/4');
	 * Expression.fromRational(rational).text(); // "3/4"
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
	 * Converts a structured entity carrying symbolic bracket access into the scalar
	 * Expression form used by ordinary algebra and function nodes.
	 *
	 * Structured entities without symbolic access are left unchanged by returning
	 * `undefined`; callers can then apply their normal conversion rules.
	 */
	static fromSymbolicAccess(x: NerdamerInput): Expression | undefined {
		let retval: Expression | undefined;

		if (typeof x === 'object' && x !== null) {
			const structured = x as {
				symbolicTarget?: Expression;
				symbolicAccessor?: Expression[];
			};
			const target = structured.symbolicTarget;
			const indices = structured.symbolicAccessor;

			if (
				Expression.isExpression(target) &&
				indices &&
				indices.length > 0 &&
				indices.every(index => Expression.isExpression(index))
			) {
				retval = Expression.toAccessor(target, indices);
			}
		}

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
	 * Intercepts values passed through the `Expression` constructor.
	 *
	 * @remarks
	 * The default implementation is the identity function. Applications may replace
	 * this static hook, but doing so changes direct-construction behavior globally.
	 * {@link Expression.create} does not route every parsed input through this hook.
	 *
	 * @param x - Raw constructor input.
	 * @returns The value the constructor should continue processing.
	 */
	public static hook(x: NerdamerInput) {
		return x;
	}

	/**
	 * Creates the variable node representing the current imaginary-unit symbol.
	 *
	 * @returns A new variable expression using {@link Expression.imaginary}.
	 *
	 * @example
	 * ```ts
	 * Expression.Img().text(); // "i" with the default parser configuration
	 * ```
	 *
	 * @see {@link Parser.setI}
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
		return isNerdamerNativeType(obj, EXPRESSION);
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
		return Expression.Variable(INDEX_VARIABLE);
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
	 * Creates a numeric (`NUM`) expression node from a numeric representation.
	 *
	 * @remarks
	 * This is a low-level constructor for numeric expression nodes. The supplied value
	 * is stored as text and is interpreted as a {@link Rational} when the multiplier is
	 * first requested. Use {@link Expression.create} when the input should be parsed as
	 * a general mathematical expression.
	 *
	 * @param x - Numeric representation to store.
	 * @returns A new numeric expression.
	 *
	 * @example
	 * ```ts
	 * Expression.Number('42').text();  // "42"
	 * Expression.Number('3/4').text(); // "3/4"
	 * ```
	 */
	public static Number(x: string | bigint | number | Decimal) {
		return Expression.Type(String(x), NUM);
	}

	/**
	 * Creates π as a symbolic or evaluated expression.
	 *
	 * @param asNumericValue - Force the evaluated representation even when parser
	 * evaluation mode is disabled.
	 * @returns Symbolic `pi`, or its current numeric representation when evaluation is enabled.
	 *
	 * @example
	 * ```ts
	 * Expression.Pi().text();     // "pi"
	 * Expression.Pi(true).text(); // numeric approximation
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
	public static symbols(...values: ExpressionInput[]) {
		return values.map(x => Expression.create(x));
	}

	/**
	 * Creates the internal scalar Expression used to represent symbolic bracket access.
	 * The formatter renders this as ordinary bracket notation rather than exposing the
	 * internal function name.
	 */
	static toAccessor(target: Expression, indices: Expression[]): Expression {
		return Expression.toFunction(SYMBOLIC_ACCESSOR, [target, ...indices]);
	}

	/**
	 * Constructs an `EXP` node without applying the normal power simplification rules.
	 *
	 * @remarks
	 * This is an internal representation helper for bases whose exponent must be stored
	 * separately. When `powerLess` is `true`, the existing outer power is deleted from
	 * the converted base before it is wrapped. Because {@link Expression.create} may
	 * reuse an input `Expression`, callers must not use that option when the original
	 * object must remain unchanged.
	 *
	 * @param x - Base to store in the `EXP` node.
	 * @param pow - Exponent to store on the node.
	 * @param powerLess - Remove an existing outer power from the base before wrapping it.
	 * @returns The constructed power expression, or the base itself when the base is one.
	 */
	static toEXP(x: ExpressionInput, pow: ExpressionInput, powerLess: boolean = false) {
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
	 * Constructs a function node and assigns its arguments.
	 *
	 * `undefined` entries are omitted. Existing `Expression` arguments may be retained
	 * by identity because conversion uses {@link Expression.create} without requesting
	 * copies. A Vector or Matrix carrying symbolic bracket access is first normalized
	 * to its scalar accessor Expression; ordinary structured values remain invalid
	 * function arguments where an Expression is required.
	 *
	 * @param name - Function name stored on the node.
	 * @param args - Function arguments; `undefined` entries are ignored.
	 * @returns The reconstructed function expression.
	 */
	static toFunction(name: string, args: (NerdamerInput | undefined)[]) {
		const f = Expression.Function(name);
		// Remove undefined from the array
		f.args = args
			.filter((x): x is NerdamerInput => {
				return x !== undefined;
			})
			.map(x => Expression.fromSymbolicAccess(x) ?? Expression.create(x));
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
	 * Returns the symbolic absolute value of this expression.
	 *
	 * The operation delegates to Nerdamer's `abs` implementation and may simplify
	 * values whose sign or complex magnitude can be determined.
	 *
	 * @returns The resulting expression; the receiver is not modified.
	 *
	 * @example
	 * ```ts
	 * Expression.create(-5).abs().text();  // "5"
	 * Expression.create('x').abs().text(); // "abs(x)"
	 * ```
	 */
	abs() {
		return abs(this);
	}

	/**
	 * Legacy alias for {@link plus}.
	 *
	 * @param x - The value to add.
	 * @returns A new Expression representing `this + x`.
	 */
	add(x: ExpressionInput) {
		return this.plus(x);
	}

	/**
	 * Compiles this expression into a native JavaScript numeric function.
	 *
	 * @remarks
	 * The generated function uses JavaScript `number` arithmetic and the registered
	 * numerical implementations. It is intended for repeated, relatively low-precision
	 * scalar evaluation rather than arbitrary-precision symbolic computation. Functions
	 * without a faithful JavaScript-number equivalent are rejected instead of being
	 * compiled with approximate or unrelated semantics.
	 *
	 * When `args` is omitted, free variables are collected and sorted alphabetically.
	 * Supplying `args` defines the positional argument order explicitly.
	 *
	 * @param args - Variable names in the positional order expected by the compiled function.
	 * @returns A JavaScript function accepting numeric arguments and returning a number.
	 * @throws {@link core!UnsupportedOperationError} If a surviving function has no faithful
	 * JavaScript-number implementation.
	 *
	 * @example
	 * ```ts
	 * const fn = Expression.create('x^2 + y').buildFunction(['x', 'y']);
	 * fn(3, 1); // 10
	 * ```
	 */
	buildFunction(args?: string[]) {
		return build(this, args);
	}

	/**
	 * Collects coefficients with respect to one or more requested variables.
	 *
	 * @remarks
	 * The expression is expanded as part of coefficient collection. For multivariate
	 * input, coefficient keys encode the exponent tuple in the same order as
	 * `variables`. Terms that do not contain a requested variable are retained as
	 * coefficients rather than discarded.
	 *
	 * @param variables - Variables whose powers define the coefficient keys.
	 * @returns Nerdamer's coefficient object for the requested variable ordering.
	 *
	 * @example
	 * ```ts
	 * const coefficients = Expression.create('3*x^2 + 2*x + 1').coeffs('x');
	 * coefficients.toArray().map(value => value.text()); // ["1", "2", "3"]
	 * ```
	 */
	coeffs(...variables: string[]) {
		return coeffs(this, variables);
	}

	/**
	 * Deep-copies the expression tree.
	 *
	 * @remarks
	 * Multipliers, powers, function arguments, explicit exponential bases, and aggregate
	 * elements are recursively copied. Mutating those structures on the returned
	 * expression therefore does not mutate the corresponding structures on the source.
	 *
	 * @returns An independently mutable expression with the same symbolic representation.
	 *
	 * @example
	 * ```ts
	 * const source = Expression.create('x + 1');
	 * const copy = source.copy();
	 *
	 * copy === source; // false
	 * copy.text();     // "1+x"
	 * ```
	 */
	copy() {
		return new Expression(this);
	}

	/**
	 * Legacy alias for {@link getDenominator}.
	 *
	 * @returns The denominator Expression.
	 */
	denominator() {
		return this.getDenominator();
	}

	/**
	 * Distributes this node's outer multiplier through a linear sum.
	 *
	 * @remarks
	 * A copy is created before any changes are made. Distribution is performed only
	 * when the expression is sum-like, has power one, and carries a non-unit outer
	 * multiplier. Nested sum terms encountered during the pass are handled recursively.
	 * Expressions that do not meet those conditions are returned as equivalent copies.
	 *
	 * @returns A new expression with the eligible multiplier distributed.
	 *
	 * @example
	 * ```ts
	 * Expression.create('2*(x+y)').distributeMultiplier().text(); // "2*x+2*y"
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
	div(x: ExpressionInput) {
		return divide(this, Expression.create(x));
	}

	/**
	 * Legacy alias for {@link div}.
	 *
	 * @param x - The divisor.
	 * @returns A new Expression representing `this / x`.
	 */
	divide(x: ExpressionInput) {
		return this.div(x);
	}

	/**
	 * Visits the immediate terms represented by this expression.
	 *
	 * @remarks
	 * Aggregate nodes pass each stored element and its key to `fn`. Atomic nodes invoke
	 * the callback once with a unit-multiplier form of the expression and the node's
	 * value as the key. The callback's return value is ignored; this method does not
	 * rebuild the expression. Use {@link Expression.forEveryElement} when returned
	 * replacements should participate in reconstruction.
	 *
	 * For atomic nodes, creating the unit-multiplier argument does not mutate the receiver.
	 * Aggregate elements, however, are passed by reference, so the callback can mutate
	 * their internal objects if it chooses to do so.
	 *
	 * @param fn - Visitor receiving an immediate expression element and its key.
	 * @returns This expression for chaining.
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
	 * Returns the immediate expression elements in canonical sort order.
	 *
	 * @remarks
	 * Sum-like nodes flatten nested linear sums one level while products retain nested
	 * sums. Atomic nodes contribute a unit-multiplier copy. When `withMultiplier` is
	 * `true`, a product's outer multiplier is appended as a numeric expression before
	 * sorting. The option has no effect on sums.
	 *
	 * Stored aggregate elements are returned by reference rather than deep-copied.
	 *
	 * @param withMultiplier - Include a product's outer coefficient as an array element.
	 * @returns The sorted immediate elements.
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
	 * Tests whether this expression is symbolically equal to another value.
	 *
	 * @remarks
	 * Equality is not a JavaScript identity or raw-tree comparison. Nerdamer first
	 * consults applicable assumptions and otherwise subtracts the expressions,
	 * canonicalizes numeric radicals where needed, expands the difference, and accepts
	 * equality when that result reduces to numeric zero. A `false` result therefore
	 * means equality was not established by the current comparison machinery; it is
	 * not a general theorem-prover result for arbitrary symbolic identities.
	 *
	 * @param x - Value to compare with this expression.
	 * @returns `true` when Nerdamer establishes equality, otherwise `false`.
	 *
	 * @example
	 * ```ts
	 * Expression.create('x+1').eq('1+x'); // true
	 * Expression.create(3).eq(4);         // false
	 * ```
	 */
	eq(x: ParserEntity | ExpressionInput) {
		x = Expression.create(x);
		return equal(this, x);
	}
	/**
	 * Re-evaluates this expression numerically, optionally substituting variable values.
	 *
	 * @remarks
	 * Evaluation serializes the current expression and sends it through
	 * {@link Parser.evaluate}. That parser path enables Nerdamer's evaluation mode, so
	 * numeric constants and supported numeric functions are evaluated according to the
	 * parser's current precision and settings. The original expression is not modified.
	 *
	 * @param values - Variable substitutions applied during evaluation.
	 * @returns The evaluated expression.
	 *
	 * @example
	 * ```ts
	 * Expression.create('x^2 + 1').evaluate({ x: 3 }).text(); // "10"
	 * Expression.create('pi/2').evaluate().text();            // numeric approximation
	 * ```
	 */
	evaluate(values?: ParserValuesObject): Expression {
		const source = this.hasFunction(SYMBOLIC_ACCESSOR, true)
			? toText(
					this,
					{ internalAccessor: true },
					undefined,
					Expression.POW_OPR,
					Expression.sortFunction
				)
			: this.text();
		const evaluated = Parser.evaluate(source, values);
		const retval = Expression.fromSymbolicAccess(evaluated) ?? Expression.create(evaluated);

		return retval;
	}
	/**
	 * Expands products and eligible powers into an equivalent symbolic expression.
	 *
	 * @remarks
	 * Expansion delegates to Nerdamer's canonical expansion algorithm. The result is
	 * independent of the receiver, but callers should treat object identity as an
	 * implementation detail rather than relying on expansion to allocate a particular
	 * representation. Branch-sensitive power rules are preserved rather than treating
	 * every algebraic power identity as universally valid over the complex domain.
	 *
	 * @returns The expanded expression.
	 *
	 * @example
	 * ```ts
	 * Expression.create('(x+1)^2').expand().text(); // "1+2*x+x^2"
	 * ```
	 */
	expand(): Expression {
		return expand(this);
	}

	/**
	 * Applies a transformation while recursively rebuilding this expression.
	 *
	 * @remarks
	 * Unlike {@link Expression.each}, callback results are used as replacements. The
	 * traversal reconstructs functions, products, sums, and exponential powers while
	 * restoring the original outer multiplier and power. Numeric and variable roots are
	 * returned unchanged by the traversal helper rather than passed through `fn`, so the
	 * result may preserve the receiver's identity for those atomic cases.
	 *
	 * @param fn - Transformation applied to traversed symbolic components.
	 * @returns The rebuilt expression.
	 */
	forEveryElement(fn: (x: Expression) => Expression) {
		return forEveryElement(this, fn);
	}

	/**
	 * Collects distinct function occurrences from the expression tree.
	 *
	 * @remarks
	 * By default the returned strings are function names such as `sin` and `cos`.
	 * When `getValues` is `true`, the collector instead returns each function node's
	 * stored value string, such as `sin(x)`, while still deduplicating repeated values.
	 * Traversal includes function arguments, aggregate elements, and `EXP` bases and
	 * powers.
	 *
	 * If `fns` is supplied, results are appended to that same array.
	 *
	 * @param fns - Optional accumulator that receives unique strings.
	 * @param getValues - Collect stored function-expression strings instead of names.
	 * @returns The accumulator containing the collected function strings.
	 *
	 * @example
	 * ```ts
	 * Expression.create('sin(x) + cos(y)').functions(); // ["sin", "cos"]
	 * ```
	 */
	functions(fns?: string[], getValues?: boolean) {
		return functions(this, fns, getValues);
	}

	/**
	 * Returns the mutable argument array stored by this function node.
	 *
	 * @remarks
	 * The array is lazily created when no arguments are present and is returned by
	 * reference, not copied. Mutating the returned array therefore mutates this
	 * expression. Call {@link Expression.updateValue} after structural changes when
	 * the stored `value` string must be regenerated.
	 *
	 * @returns The internal function-argument array.
	 *
	 * @example
	 * ```ts
	 * Expression.create('sin(x)').getArguments()[0].text(); // "x"
	 * ```
	 */
	getArguments(): Expression[] {
		if (!this.args) {
			this.args = [];
		}
		return this.args;
	}

	/**
	 * Returns the mathematical base represented by this node.
	 *
	 * @remarks
	 * `EXP` nodes return their stored base directly because signs and coefficients that
	 * belong inside an exponential base must remain part of that base. Other node types
	 * derive the same base from a deep structural copy with the outer multiplier and
	 * outer power removed.
	 *
	 * The `EXP` branch returns the internal base by reference. The non-`EXP` branch
	 * returns an independent expression and does not re-enter the parser.
	 *
	 * @returns The stored or derived base expression.
	 *
	 * @example
	 * ```ts
	 * Expression.create('3*x^2').getBase().text(); // "x"
	 * Expression.create('2^(x+1)').getBase().text(); // "2"
	 * ```
	 */
	getBase() {
		let retval: Expression;

		if (this.isEXP()) {
			retval = this.base;
		} else {
			retval = this.copy();
			delete retval.multiplier;
			delete retval.power;
		}

		return retval;
	}

	/**
	 * Extracts the denominator represented by this expression's current structure.
	 *
	 * @remarks
	 * The operation collects the rational multiplier's denominator and factors carried
	 * by negative powers in a product. It does not first combine a sum over a common
	 * denominator. For example, `a/x + 8` is a sum whose outer denominator is one, while
	 * the individual term `a/x` has denominator `x`.
	 *
	 * @returns The denominator represented by the current expression structure.
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
	 * Returns the mutable child-element record stored by an aggregate expression.
	 *
	 * @remarks
	 * When `elements` exists, the actual internal record is returned rather than a copy.
	 * Mutating it therefore mutates this expression and can invalidate canonical keys or
	 * the stored `value` string unless the caller restores the corresponding representation state. When this
	 * node has no element record, a new empty object is returned and is not attached to
	 * the expression.
	 *
	 * @returns The internal element record, or a detached empty record for atomic nodes.
	 */
	getElements() {
		if (!this.elements) {
			return {};
		}
		return this.elements;
	}
	/**
	 * Returns this node's effective outer rational multiplier.
	 *
	 * @remarks
	 * The multiplier is initialized lazily. Numeric nodes derive it from their stored
	 * value; other nodes default to one. Without `asExpression`, the returned
	 * {@link Rational} is the actual mutable multiplier owned by this expression, not a
	 * copy. Passing `true` wraps that rational value in a new numeric `Expression`.
	 *
	 * @param asExpression - Return the coefficient as a numeric expression instead of a rational.
	 * @returns The internal multiplier, or a numeric expression representing it.
	 *
	 * @example
	 * ```ts
	 * Expression.create('3*x').getMultiplier().text();     // "3"
	 * Expression.create('3*x').getMultiplier(true).text(); // "3"
	 * ```
	 */
	getMultiplier(asExpression: true): Expression;
	getMultiplier(asExpression: false): Rational;
	getMultiplier(): Rational;
	getMultiplier(asExpression?: boolean) {
		if (this.multiplier === undefined) {
			const value = this.type === NUM ? this.value : '1';
			this.multiplier = Rational.create(value);
		}

		if (asExpression) {
			return Expression.create(this.multiplier);
		}

		return this.multiplier;
	}

	/**
	 * Extracts the numerator represented by this expression's current structure.
	 *
	 * @remarks
	 * The operation separates the numerator of the rational multiplier and recursively
	 * collects numerator factors from linear products. It does not first rewrite a sum
	 * over a common denominator; a sum such as `a/x + 8` therefore remains the numerator
	 * of that top-level representation.
	 *
	 * @returns The numerator represented by the current expression structure.
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
	 * Returns this node's effective outer power.
	 *
	 * @remarks
	 * The power is initialized lazily and stored on the expression. Numeric (`NUM`)
	 * nodes default to power zero because their numeric value is carried by the
	 * multiplier; other node types default to power one. The returned `Expression` is
	 * the mutable internal power object, not a copy.
	 *
	 * @returns The internal power expression.
	 *
	 * @example
	 * ```ts
	 * Expression.create('x^3').getPower().text(); // "3"
	 * Expression.create('x').getPower().text();   // "1"
	 * ```
	 */
	getPower(): Expression {
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
	 * Retrieves a matching variable factor from this node.
	 *
	 * The method returns this expression when its stored value matches `variable`, or
	 * the matching immediate factor when this is a product. When no match is found it
	 * returns the numeric zero expression rather than `undefined`.
	 *
	 * @param variable - Stored variable value to locate.
	 * @returns The matching expression reference, or zero when no match exists.
	 */
	getVariable(variable: string) {
		return getVariable(this, variable);
	}

	/**
	 * Tests whether this expression is `>` another value.
	 *
	 * @remarks
	 * Nerdamer consults applicable assumptions and otherwise evaluates the difference
	 * numerically/symbolically. These `Expression` comparison methods remain boolean for
	 * compatibility. An unknown assumption result falls through to the ordinary comparison
	 * path; if the relation still cannot be established, the method returns `false`. The
	 * lower-level `Assumption` relations preserve unknown as `undefined`. Complex values are
	 * not ordered and cause the comparison to throw.
	 *
	 * @param x - Value to compare with this expression.
	 * @returns `true` when the requested ordering is established, otherwise `false`.
	 * @throws {@link core!UnsupportedOperationError}
	 * Thrown when either side is classified as complex.
	 */
	gt(x: ExpressionInput | ParserEntity) {
		x = Expression.create(x);
		return gt(this, x);
	}

	/**
	 * Tests whether this expression is `>=` another value.
	 *
	 * @remarks
	 * Nerdamer consults applicable assumptions and otherwise evaluates the difference
	 * numerically/symbolically. These `Expression` comparison methods remain boolean for
	 * compatibility. An unknown assumption result falls through to the ordinary comparison
	 * path; if the relation still cannot be established, the method returns `false`. The
	 * lower-level `Assumption` relations preserve unknown as `undefined`. Complex values are
	 * not ordered and cause the comparison to throw.
	 *
	 * @param x - Value to compare with this expression.
	 * @returns `true` when the requested ordering is established, otherwise `false`.
	 * @throws {@link core!UnsupportedOperationError}
	 * Thrown when either side is classified as complex.
	 */
	gte(x: ExpressionInput | ParserEntity) {
		x = Expression.create(x);
		return gte(this, x);
	}

	/**
	 * Reports whether decimal-origin numeric data occurs anywhere in this expression.
	 *
	 * @remarks
	 * The check follows the multiplier, explicit power, exponential base, function
	 * arguments, and aggregate elements. It tests the rational `asDecimal` provenance
	 * marker; it does not merely search rendered text for a decimal point.
	 *
	 * @returns `true` when any contained rational originated from decimal input.
	 */
	hasDecimal(): boolean {
		let retval = this.getMultiplier().asDecimal;

		if (!retval && this.power) {
			retval = this.power.hasDecimal();
		}
		if (!retval && this.base) {
			retval = this.base.hasDecimal();
		}
		if (!retval && this.args) {
			retval = this.args.some(argument => argument.hasDecimal());
		}
		if (!retval && this.elements) {
			retval = Object.values(this.elements).some(element => element.hasDecimal());
		}

		return retval;
	}

	/**
	 * Tests whether a named function occurs in this expression.
	 *
	 * @remarks
	 * Aggregate elements are always searched. When `deep` is `true`, function arguments
	 * and the explicit base and power of `EXP` nodes are searched recursively as well.
	 * With `deep` disabled, nested function arguments and `EXP` components are not
	 * traversed.
	 *
	 * @param name - Function name to locate.
	 * @param deep - Include function arguments and `EXP` base/power traversal.
	 * @returns `true` when the named function is found.
	 */
	hasFunction(name: string, deep = false) {
		return hasFunction(this, name, deep);
	}

	/**
	 * Tests the node's outer power for a rational exponent with a non-unit denominator.
	 *
	 * @remarks
	 * This predicate examines this node's effective power; it does not recursively scan
	 * every descendant for radicals. When `checkIrrationalDenominator` is `true`, the
	 * power must also be negative, which identifies a radical occurring in a denominator.
	 *
	 * @param checkIrrationalDenominator - Require the fractional power to be negative.
	 * @returns `true` when the outer power meets the requested radical condition.
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
	 * Tests whether a variable node with the requested value occurs in the expression tree.
	 *
	 * Function arguments, aggregate elements, and `EXP` bases and powers are searched
	 * recursively. This predicate does not apply the free-variable filtering used by
	 * {@link Expression.variables}; reserved constants can still match when requested
	 * explicitly.
	 *
	 * @param variable - Variable value to locate.
	 * @returns `true` when a matching `VAR` node occurs.
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
	 * Returns Nerdamer's symbolic decomposition of the imaginary component.
	 *
	 * @remarks
	 * The result excludes the imaginary-unit factor itself. Decomposition follows
	 * principal-branch handling for powered complex values and preserves unresolved
	 * complex function components symbolically instead of silently treating them as
	 * zero. `realpart(...)` and `imagpart(...)` nodes are treated as real-valued component
	 * expressions.
	 *
	 * @returns The symbolic imaginary coefficient.
	 */
	imagPart() {
		return imagPart(this);
	}

	/**
	 * Returns the multiplicative inverse of this expression.
	 *
	 * @remarks
	 * Real symbolic nodes are copied and inverted by negating the outer power and
	 * rational multiplier. Complex expressions use the general division path so real and
	 * imaginary components are handled correctly. Simple radical denominators are
	 * rationalized when the power operation identifies an eligible radical.
	 *
	 * The receiver is not modified.
	 *
	 * @returns The reciprocal expression.
	 * @throws {@link core!DivisionByZeroError}
	 * Thrown by the underlying rational or division operation when the expression is zero.
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
	 * Reports whether the current expression tree contains a complex-valued component.
	 *
	 * @remarks
	 * The check is structural: it recognizes the current imaginary-unit symbol, recurses
	 * through function arguments, `EXP` bases and powers, and aggregate elements. The
	 * component functions `realpart(...)` and `imagpart(...)` are treated as real-valued
	 * by definition even when their arguments contain complex values.
	 *
	 * This predicate does not impose an ordering or otherwise claim that an unrestricted
	 * symbolic expression is provably real.
	 *
	 * @returns `true` when the represented expression contains a recognized complex component.
	 */
	isComplex(): boolean {
		let retval = false;

		if (this.isFunction(SYMBOLIC_ACCESSOR)) {
			// Accessor arguments identify a selected value; they are not arithmetic
			// components of that value. In particular, an index named `i` must not
			// make an unresolved access appear complex merely because `i` is also the
			// configured imaginary-unit symbol.
			retval = false;
		} else if (!this.isComplexComponentFunction()) {
			if (this.isVAR() && this.isI()) {
				retval = true;
			} else if (this.isFunction()) {
				for (const argument of this.getArguments()) {
					if (argument.isComplex()) {
						retval = true;
						break;
					}
				}
			} else if (this.isEXP()) {
				retval = this.getBase().isComplex() || this.getPower().isComplex();
			} else if (this.elements) {
				for (const element of Object.values(this.getElements())) {
					if (element.isComplex()) {
						retval = true;
						break;
					}
				}
			}
		}

		return retval;
	}

	/**
	 * Tests whether this node is `realpart(...)` or `imagpart(...)`.
	 *
	 * These component functions are treated as real-valued by the complex-decomposition
	 * logic even when their arguments are complex.
	 */
	isComplexComponentFunction(): boolean {
		return this.isFunction([REALPART, IMAGPART]);
	}

	/**
	 * Tests whether this node belongs to Nerdamer's currently recognized constant forms.
	 *
	 * @remarks
	 * This is narrower than the mathematical statement "contains no free
	 * variables." It recognizes numeric nodes, parser constants such as `pi` and `e`,
	 * constant-base/constant-power `EXP` nodes, and sums or products whose elements are
	 * recursively recognized as constant. The imaginary unit is handled by
	 * dedicated complex logic rather than classified here as a parser constant.
	 *
	 * Do not use this predicate as a general proof that an arbitrary function expression
	 * is or is not mathematically constant.
	 *
	 * @returns `true` for the constant forms recognized by this predicate.
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
	 * Tests whether this node's stored value is the Euler-constant symbol `e`.
	 *
	 * The check is representation-level and does not require a unit multiplier or power.
	 *
	 * @returns `true` when `value` is the current `e` symbol.
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
	isEXP(): this is this & { base: Expression } {
		return this.type === EXP;
	}

	/**
	 * Checks whether this Expression is a function node.
	 *
	 * @returns `true` if the expression is a function node.
	 *
	 * @example
	 * ```ts
	 * Expression.create('sin(x)').isFunction() // true
	 * Expression.create('x').isFunction()      // false
	 * ```
	 */
	isFunction(): this is this & { name: string };
	/**
	 * Checks whether this Expression is a function node with one of the given names.
	 *
	 * @param names - A single function name or an array of names to match.
	 * @returns `true` if the expression is a function node with a matching name.
	 *
	 * @example
	 * ```ts
	 * Expression.create('sin(x)').isFunction('sin') // true
	 * Expression.create('sin(x)').isFunction('cos') // false
	 * ```
	 */
	isFunction(names: string | string[]): boolean;
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
	 * Tests whether this node's stored value is the current imaginary-unit symbol.
	 *
	 * @remarks
	 * This is a representation-level symbol check. It does not require the node to have
	 * multiplier one or power one, so callers that require exactly the mathematical unit
	 * `i` must impose those additional conditions themselves.
	 *
	 * @returns `true` when `value` matches {@link Expression.imaginary}.
	 */
	isI() {
		return this.value === Expression.imaginary;
	}

	/**
	 * Evaluates the expression and reports whether the result is classified as complex.
	 *
	 * @remarks
	 * Despite the historical method name, this is not a test for a purely imaginary
	 * value with zero real part. A value such as `3 + 2*i` also returns `true` because
	 * the evaluated result contains a complex component.
	 *
	 * @returns `true` when the evaluated expression satisfies {@link Expression.isComplex}.
	 */
	isImaginary(): boolean {
		return this.evaluate().isComplex();
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
	 * Tests whether both evaluated complex components are small relative to Decimal precision.
	 *
	 * @remarks
	 * The tolerance is `10^(-Decimal.precision + k)`. This is a numerical-algorithm
	 * convenience and must not be used as a replacement for exact symbolic zero testing;
	 * use {@link Expression.isZero} when exact representation-level zero is required.
	 *
	 * @param k - Number of guard digits removed from the active Decimal precision.
	 * @returns `true` when the magnitudes of both real and imaginary components are within the tolerance.
	 */
	isNearlyZero(k = 8) {
		const eps = new Decimal(10).pow(-Decimal.precision + k);
		const re = this.realPart();
		const im = this.imagPart();
		return re.abs().lte(eps) && im.abs().lte(eps);
	}

	/**
	 * Tests whether this expression is established to be strictly less than zero.
	 *
	 * The result follows {@link Expression.lt}: unresolved symbolic sign information
	 * currently produces `false`, while complex values cannot be ordered.
	 *
	 * @returns `true` when the current comparison machinery establishes a negative value.
	 * @throws {@link core!UnsupportedOperationError}
	 * Thrown when the expression is classified as complex.
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
	 * Tests whether this Expression is represented as a plain numeric value.
	 *
	 * @returns `true` for NUM expressions.
	 */
	isNumber(): boolean {
		return this.isNUM();
	}

	/**
	 * Checks whether this Expression is an odd integer.
	 *
	 * @returns `true` only for numeric integer expressions whose multiplier is odd.
	 */
	isOdd(): boolean {
		return this.isInteger() && !this.isEven();
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
	 * Tests whether this node's stored value matches a recognized π symbol.
	 *
	 * The check is representation-level and does not require a unit multiplier or power.
	 *
	 * @returns `true` when `value` is one of Nerdamer's π aliases.
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
	 * Tests whether this expression has the structural form of a polynomial over rational coefficients.
	 *
	 * @remarks
	 * The predicate accepts recursively composed sums and products whose outer powers are
	 * non-negative integers. Function nodes, `EXP` nodes, infinities, negative powers,
	 * and fractional powers are rejected. This is a structural eligibility check used by
	 * polynomial-oriented algorithms; it does not construct a {@link algebra!Polynomial}.
	 *
	 * @returns `true` when the expression satisfies the current polynomial-like restrictions.
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
	 * Builds the canonical lookup key used to group compatible expression terms.
	 *
	 * @remarks
	 * This is an internal canonicalization key, not a user-facing serialization format.
	 * Numeric nodes normally collapse to {@link Expression.numberHash}; variables,
	 * functions, exponentials, and infinities use multiplier-free identifiers; aggregate
	 * nodes derive a key from their canonical elements. Group (`GRP`) handling can use the
	 * power directly when `isGroup` is requested.
	 *
	 * The exact key format is coupled to parser/algebra combination logic and should not
	 * be persisted as an external interchange format.
	 *
	 * @param asSubExpression - Use the fuller sub-expression representation where supported.
	 * @param isGroup - Build a group-member key from this expression's power.
	 * @returns The canonical lookup key.
	 * @throws Error
	 * Thrown when no key-generation rule exists for the node's internal type.
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
						: Object.values(this.getElements())[0].keyValue();
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
	 * Tests whether this expression is `<` another value.
	 *
	 * @remarks
	 * Nerdamer consults applicable assumptions and otherwise evaluates the difference
	 * numerically/symbolically. These `Expression` comparison methods remain boolean for
	 * compatibility. An unknown assumption result falls through to the ordinary comparison
	 * path; if the relation still cannot be established, the method returns `false`. The
	 * lower-level `Assumption` relations preserve unknown as `undefined`. Complex values are
	 * not ordered and cause the comparison to throw.
	 *
	 * @param x - Value to compare with this expression.
	 * @returns `true` when the requested ordering is established, otherwise `false`.
	 * @throws {@link core!UnsupportedOperationError}
	 * Thrown when either side is classified as complex.
	 */
	lt(x: ExpressionInput | ParserEntity) {
		x = Expression.create(x);
		return lt(this, x);
	}

	/**
	 * Tests whether this expression is `<=` another value.
	 *
	 * @remarks
	 * Nerdamer consults applicable assumptions and otherwise evaluates the difference
	 * numerically/symbolically. These `Expression` comparison methods remain boolean for
	 * compatibility. An unknown assumption result falls through to the ordinary comparison
	 * path; if the relation still cannot be established, the method returns `false`. The
	 * lower-level `Assumption` relations preserve unknown as `undefined`. Complex values are
	 * not ordered and cause the comparison to throw.
	 *
	 * @param x - Value to compare with this expression.
	 * @returns `true` when the requested ordering is established, otherwise `false`.
	 * @throws {@link core!UnsupportedOperationError}
	 * Thrown when either side is classified as complex.
	 */
	lte(x: ExpressionInput | ParserEntity) {
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
	minus(x: ExpressionInput) {
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
	mod(x: ExpressionInput) {
		return mod(this, Expression.create(x));
	}

	/**
	 * Legacy alias for {@link times}.
	 *
	 * @param x - The value to multiply by.
	 * @returns A new Expression representing `this * x`.
	 */
	multiply(x: ExpressionInput) {
		return this.times(x);
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
	 * Legacy alias for {@link getNumerator}.
	 *
	 * @returns The numerator Expression.
	 */
	numerator() {
		return this.getNumerator();
	}

	/**
	 * Compatibility alias for the copy-oriented base extraction used by
	 * {@link Expression.toLinearAndUnitMultiplier}.
	 *
	 * @returns An independent Expression representing the node's mathematical base.
	 */
	parseValue(): Expression {
		const retval = this.toLinearAndUnitMultiplier();
		return retval;
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
	plus(x: ExpressionInput) {
		return add(this, Expression.create(x));
	}

	/**
	 * Raises this expression to a symbolic or numeric exponent.
	 *
	 * @remarks
	 * The operation delegates to Nerdamer's power canonicalization and simplification
	 * rules. Noninteger and complex powers follow principal-branch semantics; identities
	 * such as distributing a fractional power over arbitrary products are therefore
	 * applied only when the implementation can preserve the relevant branch.
	 *
	 * The receiver is not modified.
	 *
	 * @param x - Exponent to apply.
	 * @returns The simplified power expression.
	 * @throws {@link core!UndefinedError}
	 * Thrown for undefined infinity-related powers handled by the power operation.
	 * @throws {@link core!ZeroToZeroPowerError}
	 * Thrown for zero-power cases classified as undefined by the power operation.
	 */
	pow(x: ExpressionInput) {
		return power(this, Expression.create(x));
	}

	/**
	 * Returns Nerdamer's symbolic decomposition of the real component.
	 *
	 * @remarks
	 * Decomposition follows principal-branch handling for powered complex values.
	 * Explicitly complex function calls that cannot be decomposed are preserved through
	 * a symbolic `realpart(...)` wrapper rather than being guessed. The component
	 * functions `realpart(...)` and `imagpart(...)` are themselves treated as real-valued.
	 *
	 * @returns The symbolic real component.
	 */
	realPart() {
		return realPart(this);
	}

	/**
	 * Returns the sign encoded by this node's coefficient representation.
	 *
	 * @remarks
	 * This is not a general symbolic sign analysis. Most node types return the sign of
	 * their outer {@link Rational} multiplier. `EXP` nodes additionally multiply that
	 * result by the representation-level sign of their stored base. Unknown assumptions
	 * are not inferred here.
	 *
	 * @returns `-1`, `0`, or `1` from the represented coefficient/base sign.
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
	 * Removes the sign represented by this expression's current form.
	 *
	 * @remarks
	 * Complex expressions return their modulus `sqrt(re^2 + im^2)`. For other
	 * expressions, the method copies the node and removes a negative stored sign or
	 * multiplier. This is representation-oriented normalization, not a general
	 * assumption-driven implementation of symbolic `abs(...)`.
	 *
	 * @returns A new sign-free expression or complex modulus.
	 */
	signFree(): Expression {
		let retval;
		if (this.isComplex()) {
			retval = this.abs();
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
	 * Formats this expression using SymPy-style `**` exponentiation syntax.
	 *
	 * @remarks
	 * Formatting temporarily switches the class-wide power-operator token while
	 * delegating to the normal expression formatter, then restores `^`. The expression
	 * itself is not modified.
	 *
	 * @param options - Formatting options accepted by the normal text formatter.
	 * @param asId - Request the internal identifier-oriented formatting mode.
	 * @returns SymPy-compatible expression text.
	 */
	sptext(options?: TextOptions, asId?: boolean) {
		// Store the existing power operator
		const opr = Expression.POW_OPR;
		// Use the SymPy type
		Expression.POW_OPR = '**';
		const txt = toText(
			this,
			options,
			asId,
			Expression.POW_OPR,
			Expression.sortFunction
		);
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
	 * Tests Nerdamer equality while also requiring the same top-level internal type.
	 *
	 * @remarks
	 * This is stricter than {@link Expression.eq}, but it is still not object identity or
	 * byte-for-byte tree equality. After verifying matching top-level types (or matching
	 * function names for function nodes), it delegates to Nerdamer's symbolic equality
	 * comparison.
	 *
	 * @param x - Value to compare with this expression.
	 * @returns `true` when the type/name requirement and symbolic equality both hold.
	 */
	strictEqual(x: ExpressionInput) {
		x = Expression.create(x);
		const matchesExactly =
			x.isFunction() && this.isFunction() ? x.name === this.name : x.type === this.type;
		return matchesExactly && equal(this, x);
	}

	/**
	 * Legacy alias for {@link subst}.
	 *
	 * @param value - The sub-expression to find.
	 * @param withValue - The replacement expression.
	 * @returns A new Expression with the substitution applied.
	 */
	sub(value: ExpressionInput, withValue: ExpressionInput) {
		return this.subst(value, withValue);
	}


	/**
	 * Replaces occurrences of one symbolic expression with another.
	 *
	 * @remarks
	 * Substitution supports more than direct variable replacement: the underlying
	 * algorithm can match compatible products and sums, recurse into function arguments,
	 * and substitute within powers. Inputs are converted through
	 * {@link Expression.create}. The receiver is not mutated as part of normal execution. Unchanged
	 * branches can preserve the receiver's identity, and an exact match can return the
	 * supplied replacement object directly, so callers that require independent ownership
	 * should copy the result explicitly.
	 *
	 * @param value - Symbolic value or sub-expression to match.
	 * @param withValue - Replacement value.
	 * @returns The expression produced by the substitution algorithm.
	 */
	subst(value: ExpressionInput, withValue: ExpressionInput) {
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
	 * Legacy alias for {@link minus}.
	 *
	 * @param x - The value to subtract.
	 * @returns A new Expression representing `this − x`.
	 */
	subtract(x: ExpressionInput) {
		return this.minus(x);
	}

	/**
	 * Formats this expression using Nerdamer's canonical text formatter.
	 *
	 * @remarks
	 * Exact rational text is the default. Use `sort: true` to render terms in Nerdamer's
	 * conventional display order without changing the stored expression. Decimal output,
	 * precision, and power wrapping can also be selected per call. The `asId` mode is used
	 * by internal identity/canonicalization logic and should not be
	 * treated as a stable interchange format.
	 *
	 * @param options - Text-formatting options.
	 * @param asId - Use the internal identifier-oriented formatting mode.
	 * @returns The formatted expression text.
	 *
	 * @example
	 * ```ts
	 * Expression.create('x^2 + 2*x + 1').text();                // "1+2*x+x^2"
	 * Expression.create('x^2 + 2*x + 1').text({ sort: true }); // "x^2+2*x+1"
	 * Expression.create('1/3').text();                         // "1/3"
	 * Expression.create('1/3').text({ decimal: true });        // decimal representation
	 * ```
	 */
	text(options?: TextOptions, asId?: boolean) {
		return toText(
			this,
			options,
			asId,
			Expression.POW_OPR,
			Expression.sortFunction
		);
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
	times(x: ExpressionInput) {
		return multiply(this, Expression.create(x));
	}

	/**
	 * Formats this expression using decimal numeric output.
	 *
	 * This is a formatting operation equivalent to calling {@link Expression.text} with
	 * `{ decimal: true }`; it does not convert the expression tree into a floating-point
	 * data structure.
	 *
	 * @param precision - Optional decimal formatting precision.
	 * @returns Decimal-form expression text.
	 */
	toDecimal(precision?: number): string {
		const options: TextOptions = { decimal: true };
		if (precision !== undefined) {
			options.precision = precision;
		}
		return this.text(options);
	}

	/**
	 * Returns an independent base expression with the outer multiplier and power removed.
	 *
	 * @remarks
	 * Base extraction is defined by {@link Expression.getBase}. Because `getBase()`
	 * exposes an `EXP` node's stored base by reference, this method copies
	 * that base before returning it. Non-`EXP` bases are already independent copies.
	 *
	 * @returns An independent expression representing the node without its outer multiplier and power.
	 */
	toLinearAndUnitMultiplier() {
		let retval = this.getBase();

		if (this.isEXP()) {
			retval = retval.copy();
		}

		return retval;
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
	 * Returns the string representation. Alias for {@link text}.
	 *
	 * @param options - Formatting options passed to {@link text}.
	 * @returns The text representation.
	 */
	toString(options?: TextOptions) {
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
	 * Regenerates the stored `value` string from mutable structural state where supported.
	 *
	 * @remarks
	 * Function nodes rebuild `value` from their name and arguments. Product and sum-like
	 * nodes rebuild it from their current elements. Other node types are left unchanged.
	 * This method mutates the receiver and returns the same object for chaining.
	 *
	 * @returns This expression after updating its stored value where applicable.
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
	 * Provides the primitive value used by JavaScript coercion.
	 *
	 * Numeric (`NUM`) expressions return the primitive value of their rational
	 * multiplier. Other expressions return decimal-formatted text. This coercion API is
	 * intended for JavaScript interoperability; use explicit symbolic comparison methods
	 * when mathematical equality or ordering is required.
	 *
	 * @returns A number for numeric nodes, otherwise decimal-form expression text.
	 */
	valueOf(): number | string {
		let retval: number | string;
		if (this.isNUM()) {
			retval = this.getMultiplier().valueOf();
		} else {
			retval = this.text({ decimal: true });
		}
		return retval;
	}

	/**
	 * Collects distinct free-variable names from this expression tree.
	 *
	 * @remarks
	 * Only `VAR` nodes are collected. The current imaginary-unit symbol and names in
	 * {@link Expression.RESERVED} are excluded. Traversal includes function arguments,
	 * aggregate elements, and `EXP` bases and powers. Encounter order is preserved unless
	 * the caller sorts the returned array separately.
	 *
	 * If `vars` is supplied, new names are appended to that same accumulator without
	 * duplicating names already present.
	 *
	 * @param vars - Optional accumulator of names already collected.
	 * @returns The accumulator containing distinct variable names.
	 */
	variables(vars?: string[]) {
		return variables(this, vars, Expression.RESERVED);
	}
}
