import Decimal from 'decimal.js';

import { mod } from '../../../math/math';
import { remove } from '../../../utils/array';
import { arrayToObject } from '../../../utils/object';
import { message, PolynomialError, UnsupportedOperationError } from '../../errors';
import { expand } from '../../functions/expand/expand';
import { arrayAddUnique, isSorted } from '../../functions/utils';
import { coeffs } from '../expression/analysis';
import { Expression } from '../expression/Expression';
import { zero } from '../expression/shortcuts';
import { POLYNOMIAL } from '../parser/constants';
import { Rational } from '../rational/Rational';

import { Term } from './Term';
import { divide } from './utils';

import type { ExpressionInputType, SupportedInputType } from '../parser/types';

export type Ordering = 'none' | 'deg' | 'lex' | 'revlex' | 'grlex' | 'grevlex' | 'byvar';

export type PolyType = string | Polynomial | Expression;

export type TermPowerObject = { [power: string]: Expression };

/**
 * Input type for polynomial evaluation - supports numbers, bigints, and Rationals
 */
export type EvalInputType = number | bigint | Rational;

/**
 * Polynomial orderings
 * https://www.lpthe.jussieu.fr/~talon/orderings.html
 * Polynomial Modulo
 * https://math.stackexchange.com/questions/2334638/evaluation-of-polynomial-modulo-in-gf2
 */
export class Polynomial {
	public static defaultOrdering: Ordering = 'lex';
	dataType: string = POLYNOMIAL;
	// The expression used to create the polynomial
	expression: Expression;
	// True if this is a multivariate polynomial
	isMultivariate: boolean;
	// The ordering currently being used by the polynomial.
	ordering: Ordering = 'none';
	// The terms
	terms: Term[];

	// The variable names in this array. Not to be confused with the variable expressions
	variables: string[];

	/**
	 *
	 * @param p The polynomial string or Expression object
	 * @param ordering The polynomials ordering
	 * @param vars The variables and the other in which to use
	 */
	constructor(p: ExpressionInputType | Polynomial, vars?: string[], ordering?: Ordering) {
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

	public static fromArray(arr: SupportedInputType[], vars: string[]) {
		const polyArr: string[] = [];
		const x = vars.join('*');

		for (let i = 0; i < arr.length; i++) {
			polyArr.push(`${arr[i]}*${x}^${i}`);
		}

		return new Polynomial(polyArr.join('+'), vars);
	}

	/**
	 * Sorts by graded lexicographic order. The abs(power) is first compared and then
	 * revlex is used to break ties.
	 *
	 * @param a
	 * @param b
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
	 * @param a
	 * @param b
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
	 * @param obj
	 * @returns
	 */
	public static isPolynomial(obj: unknown): obj is Polynomial {
		if (obj === undefined) {
			return false;
		}

		return (obj as Polynomial).dataType === POLYNOMIAL;
	}

	/**
	 * Sorts by lexicographic order. The power tuples are subtracted and the first
	 * non-negative value from the left is used to sort. Note that variables are
	 * first sorted in alphabetical order.
	 *
	 * @returns
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
	 * @param polyArray
	 * @param ordering
	 * @returns
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
	 * @param r The Rational to convert
	 * @returns String representation
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
	 * @returns
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
	 * @param p
	 * @returns
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
	 * @param p
	 */
	public static toPolynomial(p: PolyType, ordering?: Ordering, variables?: string[]): Polynomial {
		if (!(p instanceof Polynomial)) {
			p = new Polynomial(p, variables, ordering || Polynomial.defaultOrdering);
		} else if (p.ordering !== ordering) {
			p.order(ordering);
		}

		return p;
	}

	/**
	 * Intermediate function for appending Term of Polynomial
	 *
	 * @param p The polynomial being added to this one.
	 * @returns
	 */
	private append(x: Term | Polynomial, action: 'plus' | 'minus') {
		const retval = new Polynomial(this);
		retval.variables = arrayAddUnique(x.variables, retval.variables);

		// Sort if variables were added
		if (retval.variables && x.variables && retval.variables.length > x.variables.length) {
			retval.variables.sort();
		}

		if (Polynomial.isPolynomial(x)) {
			for (const ta of x.terms) {
				retval.appendTerm(ta, action);
			}
		} else {
			retval.appendTerm(x, action);
		}

		return retval.terms.length === 0 ? new Polynomial('0') : retval;
	}

	/**
	 * Adds or removes a term from the terms array of the polynomial
	 *
	 * @param t
	 * @param action
	 * @returns
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
		// Update the expression
		this.updateExpression();
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
		this.expression = Expression.create(this.text());
	}

	/**
	 * Numerically evaluates the univariate polynomial at a given point
	 * @param n
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
	 * Gets the coefficients of the polynomial.
	 * @param variable The variable to be treated as the main variable. If none is specified then all variables
	 *
	 * @returns
	 */
	public coeffs(variable?: string) {
		const c = coeffs(this.getExpression(), variable ? [variable] : this.variables);
		return c;
	}

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
	 * @returns The content as a Rational
	 */
	public content(): Rational {
		const coefficients = this.numericCoeffs();
		if (coefficients.length === 0) {
			return Rational.create('1');
		}
		return Rational.GCD(...coefficients);
	}

	/**
	 * Returns the degree of the polynomial
	 *
	 * @returns
	 */
	public deg() {
		return this.LT().getTotalPower();
	}

	/**
	 * Performs a derivative with respect to a variable using Term-based operations.
	 * Does not rely on the Expression class for differentiation.
	 *
	 * @param v The variable to differentiate with respect to (defaults to first variable)
	 * @param n The order of the derivative (defaults to 1)
	 * @returns A new Polynomial representing the derivative
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

		// Ensure proper ordering
		return result.order(this.ordering);
	}

	/**
	 * @description Returns the remainder of polynomial division between two polynomials
	 * @param x
	 */
	public div(p: Polynomial): Polynomial[] {
		return divide(this, p).map(x => new Polynomial(x));
	}

	/**
	 * Checks to see if a polynomial divides the given polynomial
	 *
	 * @param p
	 * @returns
	 */
	public divides(p: Polynomial) {
		return this.LT().divides(p.LT());
	}

	/**
	 * Checks if two polynomials are equal
	 *
	 * @param p
	 * @returns
	 */
	public eq(p: Polynomial) {
		return this.minus(p).isZero();
	}

	/**
	 * Evaluates the polynomial at given values using Term-based operations.
	 * Supports partial evaluation (substituting some variables while keeping others symbolic).
	 * Does not rely on the Expression class for computation.
	 *
	 * @param values Object mapping variable names to their values
	 * @returns A new Polynomial with the substituted values (may be a constant)
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

		// Accumulate result terms
		const resultTerms: Map<string, Rational> = new Map();

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

			// Create a key for combining like terms
			const termKey =
				remainingVars.length > 0
					? remainingVars.map(v => `${v}:${newPowers[v] || 0}`).join(',')
					: 'constant';

			// Add to existing term or create new one
			if (resultTerms.has(termKey)) {
				resultTerms.set(termKey, resultTerms.get(termKey)!.plus(coeff));
			} else {
				resultTerms.set(termKey, coeff);
			}
		}

		// Build the result polynomial
		if (resultTerms.size === 0) {
			return new Polynomial('0');
		}

		// If it's a constant (no remaining variables)
		if (remainingVars.length === 0) {
			const constCoeff = resultTerms.get('constant') || Rational.create('0');
			return new Polynomial(Polynomial.rationalToString(constCoeff));
		}

		// Build polynomial from terms
		const termStrings: string[] = [];
		for (const [termKey, coeff] of resultTerms) {
			if (coeff.isZero()) {
				continue;
			}

			// Parse the term key back to powers
			const powers: { [v: string]: number } = {};
			if (termKey !== 'constant') {
				termKey.split(',').forEach(part => {
					const [v, p] = part.split(':');
					powers[v] = parseInt(p);
				});
			}

			// Build term string
			let termStr = Polynomial.rationalToString(coeff);
			let hasVariable = false;

			for (const v of remainingVars) {
				const p = powers[v] || 0;
				if (p !== 0) {
					hasVariable = true;
					if (p === 1) {
						termStr += `*${v}`;
					} else {
						termStr += `*${v}^${p}`;
					}
				}
			}

			// Clean up coefficient of 1 or -1 when there are variables
			if (hasVariable) {
				if (termStr.startsWith('1*')) {
					termStr = termStr.substring(2);
				} else if (termStr.startsWith('-1*')) {
					termStr = '-' + termStr.substring(3);
				}
			}

			termStrings.push(termStr);
		}

		return new Polynomial(
			termStrings.join('+').replace(/\+-/g, '-'),
			remainingVars,
			this.ordering
		);
	}

	/**
	 * Numerically evaluates the polynomial at given values.
	 * All variables must be provided values.
	 *
	 * @param values Object mapping variable names to numeric values
	 * @returns The numeric result as a Rational
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
	 * Divides all terms by their numeric gcd. Mutates the object.
	 *
	 * @param reduceVariables If true the common variables will be removed as well
	 * @param mutate If true the current object will be modified and returned
	 * @returns
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

		return target;
	}

	/**
	 * Gets the expression used to generate the polynomial
	 *
	 * @returns
	 */
	public getExpression() {
		return this.expression;
	}

	/**
	 * Sorts the terms by graded lexicographic order
	 * grevlex first compares their powers. If their powers are equal then it breaks ties using {@link revlex} reverse lexicographic order.
	 *
	 * @returns
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
	 * @returns
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
	 * Checks to see if the polynomial evaluates to a constant
	 *
	 * @returns
	 */
	public isConstant() {
		return this.terms.length === 1 && this.terms[0].isConstant();
	}

	/**
	 * Checks if the Polynomial is zero
	 *
	 * @returns
	 */
	public isZero() {
		return this.terms.length === 0 || this.LT().isZero();
	}

	/**
	 * Returns the leading coefficient of the polynomial
	 *
	 * @returns
	 */
	public LC() {
		return this.LT().coeff;
	}

	/**
	 * Sorts the terms by {@link lex} lexicographic order
	 *
	 * @returns
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
	 * Returns the leading monomial
	 *
	 * @returns
	 */
	public LM() {
		const LT = this.LT();
		return new Term('1', { ...LT.powers }, [...LT.variables]);
	}

	/**
	 * Returns the leading term of the polynomial
	 *
	 * @returns
	 */
	public LT() {
		return this.terms[0];
	}

	/**
	 * Gets the maximum variable occurrence in the polynomial. If two or more variables have
	 * an equal number of occurrences then they will be included in the set
	 * @example
	 * // returns {a:{variable:a,count:2,deg:2},q:{variable:q,count:2,deg:5}}
	 * new Polynomial('q^3*a+q^2*a*2').maxVariableFrequency()
	 * @returns
	 */
	public maxVariableFrequency() {
		const freq = this.variableFrequency();
		let max: { [key: string]: number | string }[] = [];

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
	 * @param p The polynomial being subtracted from this one.
	 * @returns
	 */
	public minus(x: Term | Polynomial): Polynomial {
		return this.append(x, 'minus');
	}

	public mod(n: ExpressionInputType) {
		n = Expression.create(n);
		const coeffs = this.coeffs().each(x => {
			const m = mod(x, n);
			return m;
		});

		return coeffs;
	}

	/**
	 * Return a new monic polynomial from this polynomial
	 *
	 * @returns
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
		}

		return p;
	}

	/**
	 * Returns the multi-degree of the polynomial
	 *
	 * @returns
	 */
	public multideg() {
		return this.terms[0].multidegArray;
	}
	/**
	 * Gets all the numeric coefficients in the polynomial as Rationals.
	 *
	 * @returns Array of Rational coefficients
	 */
	public numericCoeffs(): Rational[] {
		return this.terms.map(t => t.coeff.getMultiplier());
	}
	/**
	 * Reorders the polynomial in the requested ordering if it's not already in that particular ordering.
	 *
	 * @param ordering
	 * @returns
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
	 * @param p The polynomial being subtracted from this one.
	 * @returns
	 */
	public plus(x: Term | Polynomial): Polynomial {
		return this.append(x, 'plus');
	}

	/**
	 * Raises the polynomial to a power.
	 *
	 * @param p
	 * @returns
	 */
	public pow(p: ExpressionInputType) {
		return new Polynomial(this.getExpression().pow(p), undefined, this.ordering);
	}

	/**
	 * Sorts the terms by {@link revlex} reverse lexicographic order
	 *
	 * @returns
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

		const mGCD = new Polynomial(m.text());
		p.updateExpression();
		q.updateExpression();

		return { mGCD, p, q };
	}

	/**
	 * Returns the polynomial in expression form
	 *
	 * @returns
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
	 * Multiplies two polynomials.
	 *
	 * @param p The polynomial being multiplied to this one.
	 * @returns
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

			for (let i = 0; i < retval.terms.length; i++) {
				retval.terms[i] = retval.terms[i].times(x);
			}
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
	 * Converts the polynomial to a JS array with the powers as indices.
	 * @returns
	 */
	toArray(asNumbers: false, variable?: string): Expression[];
	toArray(asNumbers: true, variable?: string): number[];
	toArray(): Expression[];
	public toArray(asNumbers = false, variable?: string) {
		const arr: Expression[] = [];
		const n = Number(this.deg());
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
	 * Converts to a bigInt array. Note that this assumes coefficients in Z.
	 * @returns
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
	 * Converts the coefficients to a decimal.js array. Note that this assumes coefficients in Z.
	 * @returns
	 */
	public toDecimalArray() {
		return this.toArray().map(x => new Decimal(x.text()));
	}

	/**
	 * Returns the polynomial in a form for easy debugging.
	 *
	 * @returns
	 */
	public toString() {
		return this.text();
	}

	/**
	 * Gets the frequency of variables and the total count of their power in a polynomial
	 *
	 * @returns
	 */
	public variableFrequency() {
		const count = {};

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
