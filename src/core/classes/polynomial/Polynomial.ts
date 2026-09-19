import Decimal from 'decimal.js';

import { remove } from '../../../utils/array';
import { arrayToObject } from '../../../utils/object';
import { isNerdamerNativeType } from '../../common/common';
import { message, PolynomialError, UnsupportedOperationError } from '../../errors';
import { expand } from '../../functions/expand/expand';
import { arrayAddUnique, isSorted } from '../../functions/utils';
import { coeffs } from '../expression/analysis';
import { Expression } from '../expression/Expression';
import { one, zero } from '../expression/shortcuts';
import { POLYNOMIAL } from '../parser/constants';
import { Rational } from '../rational/Rational';

import { Term } from './Term';
import { divide } from './utils';

import type { ExpressionInput, NerdamerInput } from '../../types';

/** Monomial ordering labels understood by {@link Polynomial.order}. */
export type Ordering = 'none' | 'deg' | 'lex' | 'revlex' | 'grlex' | 'grevlex' | 'byvar';

/** Inputs accepted by polynomial conversion helpers. */
export type PolyType = string | Polynomial | Expression;

/** Internal expression-valued power map retained for compatibility. */
export type TermPowerObject = Record<string, Expression>;

export type VariableFrequency = {
	variable: string;
	count: number;
	deg: number;
};

/** Exact values accepted when evaluating a polynomial. */
export type EvalInputType = number | bigint | Rational;

/**
 * Represents a polynomial as ordered {@link Term} objects with symbolic coefficients.
 *
 * @remarks
 * Construction accepts polynomial-like expression input, expands bracketed or powered
 * sums when necessary, and collects coefficients using either the supplied variable
 * order or the expression's alphabetically sorted variables. Negative variable powers
 * and other non-polynomial forms are rejected.
 *
 * The object is mutable: ordering methods sort {@link Polynomial.terms} in place, and
 * `gcdFree(..., true)` edits term coefficients and powers. Arithmetic methods such as
 * {@link Polynomial.plus}, {@link Polynomial.minus}, and {@link Polynomial.times}
 * normally return new polynomials. Public arrays and terms expose mutable internal
 * references; callers that edit them directly must preserve ordering and keep cached
 * term data consistent.
 *
 * Coefficients are stored as `Expression` values. Operations such as
 * {@link Polynomial.evaluate} convert supplied values to {@link Rational} and use exact
 * rational arithmetic; {@link Polynomial.at} and numeric array conversions instead use
 * JavaScript numbers and may lose precision.
 *
 * Supported orderings include lexicographic, reverse lexicographic, graded
 * lexicographic, and graded reverse lexicographic order. Univariate polynomials always
 * use descending degree order regardless of the requested multivariate ordering.
 *
 * @example
 * ```ts
 * const polynomial = new Polynomial('x^2 + 2*x + 1', ['x']);
 *
 * polynomial.deg();                    // 2
 * polynomial.toArray().map(String);    // ["1", "2", "1"]
 * polynomial.evaluateToRational({ x: 2 }).toString(); // "5"
 * ```
 */
export class Polynomial {
	/** Default ordering chosen for newly parsed multivariate polynomials. */
	public static defaultOrdering: Ordering = 'lex';
	/** Runtime tag used by Nerdamer's polynomial type guard. */
	dataType: typeof POLYNOMIAL = POLYNOMIAL;
	/** Expression retained from construction or the most recent explicit rebuild. */
	expression: Expression;
	/** Whether the polynomial's variable list contains more than one variable. */
	isMultivariate: boolean;
	/** Current monomial ordering of {@link terms}. */
	ordering: Ordering = 'none';
	/** Terms in their current monomial order. The array is mutable. */
	terms: Term[];

	/** Variable order used to interpret term multidegrees. The array is mutable. */
	variables: string[];

	/**
	 * Constructs a polynomial from expression input or deep-copies another polynomial.
	 *
	 * @param p - Polynomial-like input or an existing polynomial to copy.
	 * @param vars - Variable names in the order used for multidegrees and monomial comparison.
	 * When omitted, variables are collected and sorted alphabetically.
	 * @param ordering - Requested monomial ordering for parsed multivariate input.
	 * @throws {@link core!PolynomialError} Thrown when the parsed expression is not polynomial-like.
	 * @throws {@link core!UnsupportedOperationError} Thrown when input cannot be converted to
	 * an expression supported by the polynomial representation.
	 */
	constructor(p: ExpressionInput | Polynomial, vars?: string[], ordering?: Ordering) {
		if (Polynomial.isPolynomial(p)) {
			this.expression = new Expression(p.expression);
			this.variables = [...p.variables];
			this.ordering = p.ordering;
			this.isMultivariate = p.isMultivariate;
			this.terms = p.terms.map(t => t.copy());
		} else {
			// Set the default ordering if none was provided
			ordering ??= Polynomial.defaultOrdering;

			// Parse it to a Expression
			let x = Expression.create(p);

			// Disqualify all other types except for Expression. This needs to be updated if other types
			// are supported in the future.
			if (!Expression.isExpression(x)) {
				throw new UnsupportedOperationError(message('unsupportedType', { type: typeof x }));
			}

			if (!x.isPolynomialLike()) {
				throw new PolynomialError(message('notAPolynomial'));
			}

			// Expand the expression but only if needed. This will be needed if the value has a bracket
			// or if the expression has a power greater than one.
			if (x.value.includes('(') || (x.isSum() && x.getPower().gt('1'))) {
				x = expand(x);
			}

			this.expression = x;
			let variables: string[];
			if (!vars) {
				variables = x.variables();
				if (!isSorted(variables)) {
					variables.sort();
				}
			} else {
				variables = vars;
			}

			this.variables = variables;

			// Mark it as univariate or multivariate
			this.isMultivariate = this.variables.length > 1;

			// Add the elements to the terms array
			this.terms = [];

			// Calculate the coefficients. Coeffs will come back as a collection of objects so for instance
			// a*x*y + b*x^2*y will come back as [a, '1,1'] & [b, '2,1']. It's preferred to have it in object form
			// TODO: this should probably be done with `coeffs`.
			x.coeffs(...this.variables).each((coeff, powers) => {
				this.terms.push(new Term(coeff, powers, this.variables));
			});

			// Set a blank array if none was provided or calculated
			this.variables = this.variables || [];

			// Order it
			this.order(ordering);
		}
	}

	/**
	 * Constructs a polynomial from dense ascending-power coefficients.
	 *
	 * @remarks
	 * Entry `arr[i]` becomes the coefficient of power `i`. When multiple variable names
	 * are supplied, their product is treated as one repeated base; this is not a general
	 * multidimensional coefficient tensor.
	 *
	 * @param arr - Coefficients ordered from constant term upward.
	 * @param vars - Variable names forming the polynomial base.
	 */
	public static fromArray(arr: NerdamerInput[], vars: string[]) {
		const coefficients: Expression[] = [];
		let requiresCanonicalization = false;

		for (const input of arr) {
			const coefficient = Expression.isExpression(input)
				? input
				: Expression.create(String(input));
			coefficients.push(coefficient);

			if (vars.some(variable => coefficient.hasVariable(variable))) {
				requiresCanonicalization = true;
			}
		}

		let retval: Polynomial;
		if (requiresCanonicalization) {
			retval = Polynomial.fromArrayCanonicalized(coefficients, vars);
		} else {
			retval = new Polynomial(zero(), vars);
			retval.terms = [];

			for (let i = 0; i < coefficients.length; i++) {
				const coefficient = coefficients[i];
				if (!coefficient.isZero()) {
					const powers: Record<string, number> = {};
					for (const variable of vars) {
						powers[variable] = i;
					}

					retval.terms.push(new Term(new Expression(coefficient), powers, vars));
				}
			}

			retval.order();
			retval.updateExpression();
		}

		return retval;
	}

	/** Reconstructs dense coefficients through the normal constructor when powers overlap coefficients. */
	private static fromArrayCanonicalized(coefficients: Expression[], vars: string[]): Polynomial {
		let base = one();
		for (const variable of vars) {
			base = base.times(Expression.Variable(variable));
		}

		let expression = zero();
		for (let i = 0; i < coefficients.length; i++) {
			expression = expression.plus(coefficients[i].times(base.pow(i)));
		}

		const retval = new Polynomial(expression, vars);
		return retval;
	}

	/**
	 * Sorts by graded lexicographic order. The abs(power) is first compared and then
	 * revlex is used to break ties.
	 *
	 * @param a - First term to compare.
	 * @param b - Second term to compare.
	 * @returns A comparator value suitable for `Array.sort`.
	 */
	public static grevlex(a: Term, b: Term) {
		if (a.getTotalPower() === b.getTotalPower()) {
			return Polynomial.revlex(a, b);
		}
		return a.getTotalPower() > b.getTotalPower() ? -1 : 1;
	}

	/**
	 * Sorts by graded lexicographic order. The abs(power) is first compared and then
	 * lex is used to break ties.
	 *
	 * @param a - First term to compare.
	 * @param b - Second term to compare.
	 * @returns A comparator value suitable for `Array.sort`.
	 */
	public static grlex(a: Term, b: Term) {
		if (a.getTotalPower() === b.getTotalPower()) {
			return Polynomial.lex(a, b);
		}
		return a.getTotalPower() > b.getTotalPower() ? -1 : 1;
	}

	/**
	 * Checks if the given object is a Polynomial
	 *
	 * @param obj - Value to test.
	 * @returns Whether `obj` carries Nerdamer's polynomial discriminator.
	 */
	public static isPolynomial(obj: unknown): obj is Polynomial {
		return isNerdamerNativeType(obj, POLYNOMIAL);
	}

	/**
	 * Sorts by lexicographic order. The power tuples are subtracted and the first
	 * non-negative value from the left is used to sort. Note that variables are
	 * first sorted in alphabetical order.
	 *
	 * @param a - First term to compare.
	 * @param b - Second term to compare.
	 * @returns A comparator value suitable for `Array.sort`.
	 */
	public static lex(a: Term, b: Term) {
		const difference = a.difference(b);
		for (let i = 0; i < difference.length; i++) {
			if (difference[i] !== 0) {
				return Math.sign(difference[i]) === -1 ? 1 : -1;
			}
		}
		return 1;
	}

	/**
	 * Sorts an array given a specific ordering using their LT
	 *
	 * @param polyArray - Polynomials to reorder. The array itself is sorted in place.
	 * @param ordering - Monomial ordering used for each polynomial and its leading term.
	 * @returns The same sorted array after each polynomial has also been reordered.
	 */
	public static polyArraySort(polyArray: Polynomial[], ordering?: Ordering) {
		ordering ??= Polynomial.defaultOrdering;

		// First put all the polynomials in the correct ordering
		polyArray = polyArray.map(x => {
			return x.order(ordering);
		});

		let sortFunction: (a: Term, b: Term) => number;

		switch (ordering) {
			case 'lex':
				sortFunction = Polynomial.lex;
				break;
			case 'grevlex':
				sortFunction = Polynomial.grevlex;
				break;
			case 'revlex':
				sortFunction = Polynomial.revlex;
				break;
			case 'grlex':
			default:
				sortFunction = Polynomial.grlex;
				break;
		}

		polyArray = polyArray.sort((a: Polynomial, b: Polynomial) => {
			return sortFunction(a.LT(), b.LT());
		});

		return polyArray;
	}

	/**
	 * Converts a Rational to a string suitable for polynomial construction.
	 * Handles both integers and fractions.
	 *
	 * @param r - Rational value to convert.
	 * @returns Parser text preserving an integer or fraction exactly.
	 */
	private static rationalToString(r: Rational): string {
		if (r.denominator === 1n) {
			return r.numerator.toString();
		}
		return `(${r.numerator}/${r.denominator})`;
	}

	/**
	 * Sorts by reverse lexicographic order. The power tuples are subtracted and the first
	 * non-negative value from the right is used to sort
	 *
	 * @param a - First term to compare.
	 * @param b - Second term to compare.
	 * @returns A comparator value suitable for `Array.sort`.
	 */
	public static revlex(a: Term, b: Term) {
		const difference = a.difference(b);
		for (let i = difference.length - 1; i >= 0; i--) {
			if (difference[i] !== 0) {
				return Math.sign(difference[i]);
			}
		}
		return -1;
	}

	/**
	 * Fetches the expression from the given object.
	 *
	 * @param p - Polynomial, expression, or parser text to convert.
	 * @returns The polynomial's stored expression reference, or the parsed expression for
	 * non-polynomial input.
	 */
	public static toExpression(p: PolyType) {
		if (!Polynomial.isPolynomial(p)) {
			return Expression.create(p);
		}

		return p.getExpression();
	}

	/**
	 * Converts a string to a Polynomial. If a polynomial is provided, it's returned untouched.
	 * If a polynomial is provided and no ordering, then the polynomial's ordering will be used.
	 * If no ordering is provided for all others then the Polynomial.defaultOrdering will be used.
	 *
	 * @param p - Value to convert.
	 * @param ordering - Ordering to apply. Passing an existing polynomial may reorder it in place.
	 * @param variables - Variable order used only when constructing a new polynomial.
	 * @returns The existing polynomial or a newly constructed one.
	 */
	public static toPolynomial(p: PolyType, ordering?: Ordering, variables?: string[]): Polynomial {
		if (!Polynomial.isPolynomial(p)) {
			p = new Polynomial(p, variables, ordering || Polynomial.defaultOrdering);
		} else if (p.ordering !== ordering) {
			p.order(ordering);
		}

		return p;
	}

	/**
	 * Creates a copy and adds or subtracts every supplied term.
	 *
	 * @param x - Term or polynomial whose terms should be combined.
	 * @param action - Whether matching coefficients are added or subtracted.
	 * @returns A new combined polynomial.
	 */
	private append(x: Term | Polynomial, action: 'plus' | 'minus') {
		const retval = new Polynomial(this);
		retval.variables = arrayAddUnique(x.variables, retval.variables);

		// Sort if variables were added
		if (retval.variables && x.variables && retval.variables.length > x.variables.length) {
			retval.variables.sort();
		}
		retval.isMultivariate = retval.variables.length > 1;

		if (Polynomial.isPolynomial(x)) {
			for (const ta of x.terms) {
				retval.appendTerm(ta, action);
			}
		} else {
			retval.appendTerm(x, action);
		}

		if (retval.terms.length !== 0) {
			retval.updateExpression();
		}

		return retval.terms.length === 0 ? new Polynomial('0') : retval;
	}

	/**
	 * Adds or removes a term from the terms array of the polynomial
	 *
	 * @param t - Term to combine or append.
	 * @param action - Coefficient operation for a matching term.
	 */
	private appendTerm(t: Term, action: 'plus' | 'minus') {
		// Try to add it to an existing
		for (let i = 0; i < this.terms.length; i++) {
			const e = this.terms[i];
			if (e.canAddOrSubtract(t)) {
				e.coeff = e.coeff[action](t.coeff);
				if (e.coeff.isZero()) {
					remove(this.terms, e);
				}
				return;
			}
		}
		const c = t.copy();
		if (action === 'minus') {
			c.coeff = c.coeff.neg();
		}
		// No existing was found so add it to the terms
		this.terms.push(c);

		// Update since the ordering may have changes
		this.order();
	}

	private monomialGCDTerm(other: Polynomial): Term {
		const vars = [...new Set([...this.variables, ...other.variables])].sort();

		const a = this.commonTermVariables();
		const b = other.commonTermVariables();

		const powers: Record<string, number> = {};

		for (const v of vars) {
			const ea = a[v] ?? 0;
			const eb = b[v] ?? 0;
			const e = Math.min(ea, eb);
			if (e > 0) {
				powers[v] = e;
			}
		}

		return new Term('1', powers, vars);
	}

	private updateExpression() {
		let retval = zero();

		for (const term of this.terms) {
			// Rebuild from the current term fields rather than trusting a potentially stale cache.
			retval = retval.plus(term.copy().getExpression());
		}

		this.expression = retval;
	}

	/**
	 * Numerically evaluates the univariate polynomial at a given point
	 * @param n - JavaScript number at which to evaluate the sole variable.
	 * @returns A JavaScript-number approximation.
	 * @throws {@link core!UnsupportedOperationError} Thrown for multivariate polynomials.
	 */
	public at(n: number) {
		if (this.variables.length > 1) {
			throw new UnsupportedOperationError(message('univariatePolynomialOnly'));
		}
		let sum = 0;
		const v = this.variables[0];
		for (let i = 0; i < this.terms.length; i++) {
			const term = this.terms[i];
			const pow = term.powers[v];
			sum += Math.pow(n, pow) * Number(term.coeff);
		}

		return sum;
	}

	/**
	 * Collects coefficients by power or multidegree.
	 *
	 * @param variable - Optional single main variable. When omitted, keys use all
	 * polynomial variables in their stored order.
	 * @returns A mutable coefficient object whose expressions are derived from this polynomial.
	 */
	public coeffs(variable?: string) {
		const c = coeffs(this.getExpression(), variable ? [variable] : this.variables);
		return c;
	}

	/**
	 * Returns the positive variable powers shared by every term.
	 *
	 * @returns A new variable-to-minimum-power record; variables absent from any term are omitted.
	 */
	public commonTermVariables() {
		const common: { [variable: string]: number } = {};
		// Collect common variables
		for (const v of this.variables) {
			let min: number | undefined;
			for (const t of this.terms) {
				const deg = t.deg(v);
				if (deg === 0) {
					// Remove the min
					min = undefined;
					break;
				}
				// Set the min common degree
				min = min === undefined ? deg : Math.min(min, deg);
			}
			// Mark it
			if (min) {
				common[v] = min;
			}
		}

		return common;
	}

	/**
	 * Returns the coefficient of the trailing constant term.
	 *
	 * @returns The stored coefficient reference when a constant term is present, otherwise
	 * a new zero expression.
	 */
	public constantTerm() {
		const t = this.terms.at(-1);
		if (t && t.isConstant()) {
			return t.coeff;
		}

		return zero();
	}

	/**
	 * Returns the content of the polynomial (GCD of all coefficients).
	 * Does not rely on the Expression class.
	 *
	 * @returns A new exact rational greatest common divisor of the numeric coefficients.
	 */
	public content(): Rational {
		const coefficients = this.numericCoeffs();
		if (coefficients.length === 0) {
			return Rational.create('1');
		}
		return Rational.GCD(...coefficients);
	}

	/**
	 * Returns the degree of the polynomial.
	 *
	 * With no variable, this is the total degree: the largest sum of powers in any term.
	 * When a variable is supplied, this is the largest power of that variable across all
	 * terms, with every other variable treated as part of the coefficient.
	 *
	 * @param variable - Optional variable whose degree should be returned.
	 * @returns The total degree, or the degree with respect to `variable`.
	 */
	public deg(variable?: string) {
		let retval = 0;
		for (const term of this.terms) {
			const degree = variable === undefined ? term.getTotalPower() : term.deg(variable);
			retval = Math.max(retval, degree);
		}
		return retval;
	}

	/**
	 * Performs a derivative with respect to a variable using Term-based operations.
	 * Does not rely on the Expression class for differentiation.
	 *
	 * @param v - Variable to differentiate; defaults to the first stored variable.
	 * @param n - Non-negative derivative order.
	 * @returns A newly constructed polynomial; order zero returns a deep copy.
	 */
	public diff(v?: string, n = 1): Polynomial {
		v = v || this.variables[0];

		// Zero-th derivative is just a copy
		if (n === 0) {
			return new Polynomial(this);
		}

		// If no variable specified and polynomial has no variables, derivative is zero
		if (!v) {
			return new Polynomial('0');
		}

		// Differentiate each term and collect non-zero results
		const diffTerms: Term[] = [];

		for (const term of this.terms) {
			const diffTerm = term.diff(v, n);
			if (!diffTerm.isZero()) {
				// Ensure the differentiated term has proper variables
				diffTerm.variables = [...this.variables];
				diffTerms.push(diffTerm);
			}
		}

		// If all terms differentiated to zero, return zero polynomial
		if (diffTerms.length === 0) {
			return new Polynomial('0');
		}

		// Build polynomial from differentiated terms
		// Start with first term and add the rest
		const result = new Polynomial('0', this.variables, this.ordering);
		result.terms = [];

		for (const t of diffTerms) {
			result.terms.push(t);
		}

		// Ensure proper ordering and synchronize the stored expression.
		result.order(this.ordering);
		result.updateExpression();
		return result;
	}

	/**
	 * Divides this polynomial by another polynomial.
	 *
	 * @param p - Divisor polynomial.
	 * @returns A two-element array containing quotient and remainder as new polynomials.
	 */
	public div(p: Polynomial): Polynomial[] {
		return divide(this, p).map(x => new Polynomial(x));
	}

	/**
	 * Checks to see if a polynomial divides the given polynomial
	 *
	 * @param p - Polynomial whose leading term is tested as the dividend.
	 * @returns Whether this polynomial's leading term divides `p`'s leading term. This is
	 * a monomial divisibility test, not proof that the complete polynomial divides `p`.
	 */
	public divides(p: Polynomial) {
		return this.LT().divides(p.LT());
	}

	/**
	 * Checks if two polynomials are equal
	 *
	 * @param p - Polynomial to compare.
	 * @returns Whether subtracting `p` produces the zero polynomial.
	 */
	public eq(p: Polynomial) {
		return this.minus(p).isZero();
	}

	/**
	 * Evaluates the polynomial at given values using Term-based operations.
	 * Supports partial evaluation (substituting some variables while keeping others symbolic).
	 * Does not rely on the Expression class for computation.
	 *
	 * @param values - Variable names mapped to exact rational-compatible values.
	 * @returns A new partially evaluated polynomial; unmentioned variables remain symbolic.
	 */
	public evaluate(values: { [variable: string]: EvalInputType }): Polynomial {
		// Determine which variables remain after substitution
		const remainingVars = this.variables.filter(v => !(v in values));

		// Convert input values to Rationals for consistent arithmetic
		const rationalValues: { [variable: string]: Rational } = {};
		for (const v in values) {
			const val = values[v];
			if (Rational.isRational(val)) {
				rationalValues[v] = val;
			} else {
				rationalValues[v] = Rational.create(val.toString());
			}
		}

		// Accumulate result terms together with the powers needed to rebuild them natively.
		const resultTerms: Map<
			string,
			{ coefficient: Rational; powers: { [variable: string]: number } }
		> = new Map();

		for (const term of this.terms) {
			// Start with the term's coefficient
			let coeff = term.coeff.getMultiplier();
			const newPowers: { [variable: string]: number } = {};

			// Process each variable in the polynomial
			for (const v of this.variables) {
				const power = term.deg(v);

				if (v in rationalValues) {
					// Substitute this variable: multiply coefficient by value^power
					if (power !== 0) {
						const valPow = rationalValues[v].pow(power.toString());
						coeff = coeff.times(valPow);
					}
				} else {
					// Keep this variable
					if (power !== 0) {
						newPowers[v] = power;
					}
				}
			}

			// Skip zero coefficients
			if (coeff.isZero()) {
				continue;
			}

			// Create a key for combining like terms. The key is only an internal map key;
			// the retained power object is used for reconstruction.
			const termKey =
				remainingVars.length > 0
					? remainingVars.map(v => `${v}:${newPowers[v] || 0}`).join(',')
					: 'constant';

			const existing = resultTerms.get(termKey);
			if (existing) {
				existing.coefficient = existing.coefficient.plus(coeff);
			} else {
				resultTerms.set(termKey, { coefficient: coeff, powers: newPowers });
			}
		}

		let retval: Polynomial;
		if (resultTerms.size === 0) {
			retval = new Polynomial(zero());
		} else if (remainingVars.length === 0) {
			const result = resultTerms.get('constant');
			const coefficient = result ? result.coefficient : Rational.create('0');
			retval = new Polynomial(Expression.Number(coefficient.value));
		} else {
			retval = new Polynomial(zero(), remainingVars, this.ordering);
			retval.terms = [];

			for (const result of resultTerms.values()) {
				if (!result.coefficient.isZero()) {
					retval.terms.push(
						new Term(
							Expression.Number(result.coefficient.value),
							{ ...result.powers },
							remainingVars
						)
					);
				}
			}

			retval.order(this.ordering);
			retval.updateExpression();
		}

		return retval;
	}

	/**
	 * Numerically evaluates the polynomial at given values.
	 * All variables must be provided values.
	 *
	 * @param values - Values for every variable stored by the polynomial.
	 * @returns The exact rational result.
	 * @throws {@link core!UnsupportedOperationError} Thrown when any stored variable is missing.
	 */
	public evaluateToRational(values: { [variable: string]: EvalInputType }): Rational {
		// Verify all variables have values
		for (const v of this.variables) {
			if (!(v in values)) {
				throw new UnsupportedOperationError(message('unknownVariable', { variable: v }));
			}
		}

		// Convert input values to Rationals
		const rationalValues: { [variable: string]: Rational } = {};
		for (const v in values) {
			const val = values[v];
			if (Rational.isRational(val)) {
				rationalValues[v] = val;
			} else {
				rationalValues[v] = Rational.create(val.toString());
			}
		}

		let sum = Rational.create('0');

		for (const term of this.terms) {
			let termValue = term.coeff.getMultiplier();

			for (const v of this.variables) {
				const power = term.deg(v);
				if (power !== 0) {
					termValue = termValue.times(rationalValues[v].pow(power.toString()));
				}
			}

			sum = sum.plus(termValue);
		}

		return sum;
	}

	/**
	 * Divides all terms by their exact numeric content and optionally their common monomial.
	 *
	 * @param reduceVariables - Also subtract the minimum shared positive power of each variable.
	 * @param mutate - Modify and return this polynomial instead of a deep copy.
	 * @returns The normalized target polynomial.
	 */
	public gcdFree(reduceVariables = false, mutate = false) {
		const target = mutate ? this : new Polynomial(this);

		// If it's a constant then there's nothing left to do
		if (target.isConstant()) {
			return target;
		}

		let common;

		let gcd = target.content();
		if (target.LC().sign() === -1) {
			gcd = gcd.neg();
		}

		if (reduceVariables) {
			common = target.commonTermVariables();
		}

		for (let i = 0; i < target.terms.length; i++) {
			const term = target.terms[i];
			// If reduction of the variable is requested then do so.
			if (common) {
				// Reduce the variables
				for (const x in common) {
					term.powers[x] -= common[x];
				}
			}

			// Divide coefficient by GCD using Rational arithmetic
			const currentCoeff = term.coeff.getMultiplier();
			const newCoeff = currentCoeff.div(gcd);
			term.coeff = Expression.fromRational(newCoeff);
		}

		target.updateExpression();
		return target;
	}

	/**
	 * Returns the expression retained by the polynomial.
	 *
	 * @remarks
	 * This is an internal reference, not a copy. The term array is the operative
	 * representation for many methods, and direct term mutation is not guaranteed to
	 * rebuild this stored expression automatically.
	 */
	public getExpression() {
		return this.expression;
	}

	/**
	 * Sorts the terms by graded lexicographic order
	 * grevlex first compares their powers. If their powers are equal then it breaks ties using {@link revlex} reverse lexicographic order.
	 *
	 * @returns This polynomial after sorting its terms in place.
	 */
	public grevlexSort() {
		this.terms.sort((a: Term, b: Term) => {
			return Polynomial.grevlex(a, b);
		});

		// Mark it
		this.ordering = 'grevlex';

		return this;
	}

	/**
	 * Sorts the terms by graded lexicographic order
	 * grlex first compares their powers. If their powers are equal then it breaks ties using {@link lex} lexicographic order.
	 *
	 * @returns This polynomial after sorting its terms in place.
	 */
	public grlexSort() {
		this.terms.sort((a: Term, b: Term) => {
			return Polynomial.grlex(a, b);
		});

		//Mark it
		this.ordering = 'grlex';

		return this;
	}

	/**
	 * Tests whether the polynomial consists of one constant term.
	 *
	 * @returns `true` only for the one-term constant representation.
	 */
	public isConstant() {
		return this.terms.length === 1 && this.terms[0].isConstant();
	}

	/**
	 * Tests whether this polynomial has no terms or a zero leading term.
	 *
	 * @returns Whether the current term representation is zero.
	 */
	public isZero() {
		return this.terms.length === 0 || this.LT().isZero();
	}

	/**
	 * Returns the leading coefficient under the current ordering.
	 *
	 * @returns The leading term's internal coefficient reference.
	 */
	public LC() {
		return this.LT().coeff;
	}

	/**
	 * Sorts the terms by {@link lex} lexicographic order
	 *
	 * @returns This polynomial after sorting its terms in place.
	 */
	public lexSort() {
		this.terms.sort((a: Term, b: Term) => {
			return Polynomial.lex(a, b);
		});
		// Mark it
		this.ordering = 'lex';

		return this;
	}

	/**
	 * Returns the leading monomial with unit coefficient.
	 *
	 * @returns A new term with copied powers and variables.
	 */
	public LM() {
		const LT = this.LT();
		return new Term('1', { ...LT.powers }, [...LT.variables]);
	}

	/**
	 * Returns the leading term under the current ordering.
	 *
	 * @returns The internal first term reference.
	 */
	public LT() {
		return this.terms[0];
	}

	/**
	 * Gets the maximum variable occurrence in the polynomial. If two or more variables have
	 * an equal number of occurrences then they will be included in the set
	 *
	 * @returns A new record containing every variable tied for the greatest term-occurrence count.
	 * @example
	 * ```ts
	 * new Polynomial('q^3*a+2*q^2*a').maxVariableFrequency();
	 * // { a: { variable: 'a', count: 2, deg: 2 },
	 * //   q: { variable: 'q', count: 2, deg: 5 } }
	 * ```
	 */
	public maxVariableFrequency() {
		const freq = this.variableFrequency();
		let max: VariableFrequency[] = [];

		for (const v in freq) {
			const c = freq[v].count;
			if (!max[0] || max[0].count < c) {
				// Either set it or wipe the whole thing
				max = [freq[v]];
			} else if (max[0].count === c) {
				max.push(freq[v]);
			}
		}

		return arrayToObject(max, k => {
			return k.variable;
		});
	}

	/**
	 * Subtracts a Polynomial or a Term
	 *
	 * @param x - Term or polynomial to subtract.
	 * @returns A new polynomial. Both operands are left unchanged.
	 */
	public minus(x: Term | Polynomial): Polynomial {
		return this.append(x, 'minus');
	}

	/**
	 * Reduces each collected coefficient modulo `n`.
	 *
	 * @remarks
	 * The polynomial itself is not modified. The returned coefficient object is derived from
	 * the current polynomial and stores the reduced coefficient expressions at the same power
	 * keys.
	 *
	 * @param n - Modulus passed to the symbolic `mod` operation.
	 * @returns A coefficient object containing the coefficient remainders.
	 */
	public mod(n: ExpressionInput) {
		n = Expression.create(n);
		const coeffs = this.coeffs();
		coeffs.each((x, p) => {
			coeffs.coeffs[p] = x.mod(n);
		});

		return coeffs;
	}

	/**
	 * Returns a copy with the leading nonconstant coefficient normalized to one.
	 *
	 * Constant polynomials are copied without coefficient normalization.
	 *
	 * @returns A new polynomial with a unit leading coefficient when normalization applies.
	 */
	public monic() {
		const p = new Polynomial(this);
		const LT = this.LT();

		// If it's a constant the we're done
		if (LT && !LT.isConstant()) {
			const c = LT.coeff;
			for (const t of p.terms) {
				t.coeff = t.coeff.div(c);
			}
			p.updateExpression();
		}

		return p;
	}

	/**
	 * Returns the leading term's multidegree under the current ordering.
	 *
	 * @returns The leading term's cached internal multidegree array.
	 */
	public multideg() {
		return this.terms[0].multidegArray;
	}
	/**
	 * Gets all the numeric coefficients in the polynomial as Rationals.
	 *
	 * @returns New array containing each term coefficient's internal rational multiplier.
	 */
	public numericCoeffs(): Rational[] {
		return this.terms.map(t => t.coeff.getMultiplier());
	}
	/**
	 * Reorders the polynomial in the requested ordering if it's not already in that particular ordering.
	 *
	 * @param ordering - Requested multivariate ordering. Univariate input is always degree-sorted.
	 * @returns This polynomial after sorting its term array in place.
	 */
	public order(ordering?: Ordering) {
		if (this.variables.length < 2) {
			this.sort();
			this.ordering = 'deg';
		} else {
			// Set the new ordering if provided
			if (ordering) {
				this.ordering = ordering;
			}

			switch (this.ordering) {
				case 'lex':
					this.lexSort();
					break;
				case 'grevlex':
					this.grevlexSort();
					break;
				case 'revlex':
					this.revlexSort();
					break;
				case 'grlex':
				default:
					this.grlexSort();
					break;
			}
		}

		return this;
	}
	/**
	 * Adds a Polynomial or a Term.
	 *
	 * @param x - Term or polynomial to add.
	 * @returns A new polynomial. Both operands are left unchanged.
	 */
	public plus(x: Term | Polynomial): Polynomial {
		return this.append(x, 'plus');
	}

	/**
	 * Raises the polynomial to a power.
	 *
	 * @param p - Exponent accepted by symbolic expression powers.
	 * @returns A new polynomial parsed from the powered expression.
	 * @throws {@link core!PolynomialError} Thrown when the powered result is not polynomial-like.
	 */
	public pow(p: ExpressionInput) {
		return new Polynomial(this.getExpression().pow(p), undefined, this.ordering);
	}

	/**
	 * Sorts the terms by {@link revlex} reverse lexicographic order
	 *
	 * @returns This polynomial after sorting its terms in place.
	 */
	public revlexSort() {
		// There is only one sort for univariate
		this.terms.sort((a: Term, b: Term) => {
			return Polynomial.revlex(a, b);
		});

		// Mark it
		this.ordering = 'revlex';

		return this;
	}

	/**
	 * Sorts the terms in the standard form of decreasing powers.
	 */
	public sort() {
		this.terms.sort((a: Term, b: Term) => {
			return b.getTotalPower() > a.getTotalPower() ? 1 : -1;
		});

		return this;
	}

	public stripMonomialGCD(other: Polynomial) {
		const m = this.monomialGCDTerm(other);

		const p = new Polynomial(this);
		const q = new Polynomial(other);

		for (let i = 0; i < p.terms.length; i++) {
			p.terms[i] = p.terms[i].div(m);
		}

		for (let i = 0; i < q.terms.length; i++) {
			q.terms[i] = q.terms[i].div(m);
		}

		const mGCD = new Polynomial(m.getExpression());
		p.updateExpression();
		q.updateExpression();

		return { mGCD, p, q };
	}

	/**
	 * Formats the current ordered terms as canonical parser text.
	 *
	 * @returns `"0"` for an empty/zero term representation, otherwise the joined term text.
	 */
	public text() {
		if (this.terms.length === 0 || (this.terms.length === 1 && this.terms[0].isZero())) {
			return '0';
		}

		const textArray: string[] = [];

		for (const t of this.terms) {
			const txt = t.text(this.variables);
			if (txt !== '0') {
				textArray.push(txt);
			}
		}

		return textArray.join('+').replace(/\+-/g, '-');
	}

	/**
	 * Multiplies this polynomial by a term or polynomial.
	 *
	 * @param x - Multiplier.
	 * @returns A new polynomial. Term multiplication copies this polynomial before
	 * updating its terms; polynomial multiplication rebuilds from symbolic expressions.
	 */
	public times(x: Term | Polynomial): Polynomial {
		let retval;
		if (Term.isTerm(x)) {
			retval = new Polynomial(this);
			// Update the variables
			retval.variables = arrayAddUnique(retval.variables, x.variables);

			if (isSorted(this.variables)) {
				retval.variables.sort();
			}
			retval.isMultivariate = retval.variables.length > 1;

			for (let i = 0; i < retval.terms.length; i++) {
				retval.terms[i] = retval.terms[i].times(x);
			}
			retval.updateExpression();
		} else {
			retval = new Polynomial(
				this.getExpression().times(x.getExpression()),
				undefined,
				this.ordering
			);
		}

		return retval;
	}

	/**
	 * Converts univariate coefficients to a dense ascending-power array.
	 *
	 * @param asNumbers - Convert each coefficient through JavaScript `Number`.
	 * @param variable - Optional variable to collect as the dense power index.
	 * @returns New coefficient array with missing powers filled by zero expressions.
	 */
	toArray(asNumbers: false, variable?: string): Expression[];
	toArray(asNumbers: true, variable?: string): number[];
	toArray(): Expression[];
	public toArray(asNumbers = false, variable?: string) {
		const arr: Expression[] = [];
		const n = Number(this.deg(variable));
		const coeffs = this.coeffs(variable);
		for (let i = 0; i <= n; i++) {
			arr.push(coeffs.hasPower(i) ? coeffs.getPower(i) : zero());
		}

		if (asNumbers) {
			return arr.map(x => Number(x));
		}

		return arr;
	}

	/**
	 * Converts dense coefficients to numerator `bigint` values.
	 *
	 * @param assertInZ - Reject coefficients whose denominator is not one.
	 * @param variable - Optional variable to collect as the dense power index.
	 * @returns New ascending-power array of coefficient numerators.
	 * @throws Error Thrown when `assertInZ` is true and a coefficient is non-integral.
	 */
	public toBigIntArray(assertInZ = true, variable?: string) {
		return this.toArray(false, variable).map(x => {
			if (assertInZ && !x.isInteger()) {
				throw new Error(message('integerRequired'));
			}

			return x.getMultiplier().numerator;
		});
	}

	/**
	 * Converts dense coefficients to new `Decimal` values using their expression text.
	 *
	 * @returns An ascending-power decimal coefficient array.
	 */
	public toDecimalArray() {
		return this.toArray().map(x => new Decimal(x.text()));
	}

	/**
	 * Returns the polynomial in a form for easy debugging.
	 *
	 * @returns The same canonical term text as {@link Polynomial.text}.
	 */
	public toString() {
		return this.text();
	}

	/**
	 * Counts each variable's term occurrences and accumulated degree.
	 *
	 * @returns A new record keyed by variable. Each entry reports its name, number of
	 * nonzero-power terms, and sum of powers across those terms.
	 */
	public variableFrequency() {
		const count: Record<string, VariableFrequency> = {};

		for (const t of this.terms) {
			for (const v in t.powers) {
				// The counter object
				let o = count[v];
				if (!o) {
					count[v] = o = { variable: v, count: 0, deg: 0 };
				}
				// Check the degree. We only increment for degrees > 0. Since it's a polynomial,
				// no negative degrees should exist
				const deg = t.powers[v];
				if (deg !== 0) {
					o.count++;
					o.deg += deg;
				}
			}
		}

		return count;
	}
}
