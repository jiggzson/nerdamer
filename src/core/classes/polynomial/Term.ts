import { isNerdamerNativeType } from '../../common/common';
import { productInRange } from '../../functions/bigint/bigint';
import { sum } from '../../functions/numeric';
import { arrayAddUnique } from '../../functions/utils';
import { Expression } from '../expression/Expression';
import { TERM } from '../parser/constants';

/** Powers keyed by variable name. Missing variables have degree zero. */
export type PowersObject = Record<string, number>;

/**
 * Represents one coefficient-monomial term in a {@link Polynomial}.
 *
 * @remarks
 * A term stores an `Expression` coefficient, a mutable variable-to-power record, and
 * a sorted copy of the supplied variable names. The coefficient and a power object
 * supplied to the constructor are retained by reference; {@link Term.copy} creates
 * independent copies of both.
 *
 * Multidegree, total power, expression, and value text are computed lazily and cached.
 * Arithmetic methods return new terms and refresh their derived degree fields. Direct
 * mutation of {@link Term.coeff}, {@link Term.powers}, or the setter overload of
 * {@link Term.deg} does not invalidate every cached field, so callers should prefer a
 * copied/reconstructed term when cached values may already have been read.
 */
export class Term {
	/** Mutable symbolic coefficient. */
	coeff: Expression;
	/** Runtime tag used by Nerdamer's term type guard. */
	dataType: typeof TERM = TERM;
	/** Lazily cached expression representation. */
	expression?: Expression;
	/** Number of variables whose power is positive. */
	length: number;
	/** Lazily cached multidegree in {@link variables} order. */
	multidegArray?: number[];
	/** Mutable powers keyed by variable name. */
	powers: PowersObject;
	/** Lazily cached sum of all stored powers. */
	totalPower?: number;
	/** Lazily cached unit-coefficient monomial text. */
	valueString?: string;
	/** Sorted variable names used for multidegree and rendering order. */
	variables: string[];

	/**
	 * Creates a term from a coefficient and monomial powers.
	 *
	 * @param coeff - Expression coefficient or parser text. Existing expressions are retained.
	 * @param powers - Power record or comma-separated degrees aligned with `variables`.
	 * An object power record is retained by reference.
	 * @param variables - Variable order to interpret string powers. The term stores a sorted copy.
	 */
	constructor(coeff: Expression | string, powers: PowersObject | string, variables: string[]) {
		if (typeof powers === 'string') {
			this.powers = {};
			powers.split(',').forEach((x, i) => {
				this.powers[variables[i]] = Number(x);
			});
		} else {
			this.powers = powers;
		}
		this.coeff = typeof coeff === 'string' ? Expression.create(coeff) : coeff;

		this.length = this.getLength();

		// Terms use a stable sorted variable order independent of later changes to the caller's array.
		this.variables = [...variables].sort();
	}

	/**
	 * Checks if the given object is a Term
	 *
	 * @param obj - Value to test.
	 * @returns Whether `obj` carries Nerdamer's term discriminator.
	 */
	public static isTerm(obj: unknown): obj is Term {
		return isNerdamerNativeType(obj, TERM);
	}

	/**
	 * Gets the total number of non-unit variables in the term
	 *
	 * @returns The number of variables with positive powers.
	 */
	private getLength() {
		let length = 0;
		for (const x in this.powers) {
			if (this.powers[x] > 0) {
				length++;
			}
		}

		return length;
	}

	/** Recalculates degree-derived caches after term arithmetic and returns this term. */
	private update() {
		this.updateMultiDegArray();
		this.updateTotalPower();
		this.length = this.getLength();
		return this;
	}

	/**
	 * Forces the multidegree array to be recalculated
	 *
	 * @returns The refreshed internal multidegree array.
	 */
	private updateMultiDegArray() {
		const retval = this.multideg(this.variables);
		this.multidegArray = retval;
		return retval;
	}

	/**
	 * Forces the total power to be recalculated
	 *
	 * @returns The refreshed total degree.
	 */
	private updateTotalPower() {
		let retval = 0;
		for (const x in this.powers) {
			retval += this.deg(x);
		}
		this.totalPower = retval;
		return retval;
	}

	/**
	 * Tests whether two terms have the same unit-coefficient monomial.
	 *
	 * @param t - Term to compare.
	 * @returns Whether their rendered variable-and-power components match.
	 */
	canAddOrSubtract(t: Term) {
		return this.getValueString() === t.getValueString();
	}

	/**
	 * Creates an independently mutable copy of this term.
	 *
	 * @returns A term with copied coefficient, powers, and variable array. Lazy caches are rebuilt on demand.
	 */
	copy() {
		return new Term(new Expression(this.coeff), { ...this.powers }, this.variables);
	}

	/**
	 * Returns the degree of one variable.
	 *
	 * @param v - Variable whose power is read.
	 * @returns The stored power, or zero when the variable is absent.
	 */
	deg(v: string): number;
	/**
	 * Assigns the degree of one variable.
	 *
	 * @param v - Variable whose power is written.
	 * @param value - New numeric power.
	 * @returns This term after assignment. Lazy caches are not invalidated automatically.
	 */
	deg(v: string, value: number): Term;
	deg(v: string, value?: number): number | Term {
		if (value !== undefined) {
			this.powers[v] = value;
			return this;
		}
		return this.powers[v] || 0;
	}

	/**
	 * Differentiates this term with respect to one variable.
	 *
	 * @param variable - Differentiation variable.
	 * @param n - Non-negative derivative order.
	 * @returns A new differentiated term, or a zero term when `n` exceeds the power.
	 */
	diff(variable: string, n = 1) {
		const p = this.deg(variable);
		let retval;
		if (n > p) {
			retval = new Term('0', '0', []);
		} else {
			retval = this.copy();
			retval.powers[variable] = p - n;
			const d = n - 1;
			const r = productInRange(p - d, p);
			retval.coeff = retval.coeff.times(BigInt(r));
		}

		return retval;
	}

	/**
	 * Subtracts another term's multidegree from this term's multidegree.
	 *
	 * @param term - Term whose degree tuple is subtracted.
	 * @returns A new component-wise difference array in this term's variable order.
	 */
	difference(term: Term) {
		const a = this.getMultidegArray();
		const b = term.getMultidegArray();
		const diff: number[] = [];
		for (let i = 0; i < a.length; i++) {
			diff[i] = a[i] - b[i];
		}
		return diff;
	}

	/**
	 * Divides this term by the provided term
	 *
	 * @param t - Divisor term.
	 * @returns A new quotient term; negative powers are permitted by this low-level operation.
	 */
	div(t: Term) {
		const retval = this.copy();
		retval.coeff = retval.coeff.div(t.coeff);
		for (const v in t.powers) {
			if (!retval.variables.includes(v)) {
				retval.variables.push(v);
			}
			retval.deg(v, retval.deg(v) - t.deg(v));
		}
		return retval.update();
	}

	/**
	 * Checks if one term can divide another.
	 *
	 * @param t - Candidate dividend term.
	 * @returns Whether every power in this term is no greater than the corresponding power in `t`.
	 */
	divides(t: Term) {
		// If it's a number, then it divides so easy check and done
		if (this.getTotalPower() === 0) {
			return true;
		}
		// Divides essentially loops through the dividend and ensures that each power is >= to the divisor for each variable
		for (const x in this.powers) {
			if (this.deg(x) > t.deg(x)) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Checks for equality with another Term
	 *
	 * @param t - Term to compare.
	 * @returns Whether coefficient and monomial quotient equal one.
	 */
	eq(t: Term) {
		return this.div(t).eqNumber(1);
	}

	/**
	 * Tests whether this is a constant term equal to a number.
	 *
	 * @param n - Numeric value to compare with the coefficient.
	 */
	eqNumber(n: number | string) {
		return sum(...Object.values(this.powers)) === 0 && this.coeff.eq(n);
	}
	/**
	 * Returns a lazily constructed expression for this term.
	 *
	 * @returns The cached internal expression reference.
	 */
	getExpression() {
		if (this.expression === undefined) {
			let expression = new Expression(this.coeff);

			for (const variable of this.variables) {
				const power = this.deg(variable);
				if (power !== 0) {
					expression = expression.times(Expression.Variable(variable).pow(power));
				}
			}

			this.expression = expression;
		}

		return this.expression;
	}
	/**
	 * Returns this term's multidegree in its stored variable order.
	 *
	 * @returns The cached internal degree array.
	 */
	getMultidegArray() {
		let retval = this.multidegArray;
		if (retval === undefined) {
			retval = this.updateMultiDegArray();
		}

		return retval;
	}

	/**
	 * Returns the sum of powers in this term.
	 *
	 * @returns The cached total degree.
	 */
	getTotalPower() {
		let retval = this.totalPower;
		if (retval === undefined) {
			retval = this.updateTotalPower();
		}
		return retval;
	}

	/**
	 * Formats the monomial with a unit coefficient.
	 *
	 * @param useVariables - Optional variable order used for this rendering.
	 * @returns Parser text such as `x^2*y`, or `1` for a constant term.
	 */
	getValueString(useVariables?: string[]) {
		// If the user variables have been specified then force regeneration of the string.
		if (this.valueString === undefined || useVariables !== undefined) {
			if (this.getTotalPower() === 0) {
				this.valueString = '1';
			} else {
				const vars = useVariables || [...this.variables].sort();
				const vArray: string[] = [];
				for (const v of vars) {
					const p = this.deg(v);
					const pv = p === 1 ? '' : Expression.POW_OPR + p;
					if (p !== 0) {
						vArray.push(`${v}${pv}`);
					}
				}

				this.valueString = vArray.join('*');
			}
		}

		return this.valueString;
	}

	/**
	 * Tests whether every stored variable power is zero.
	 *
	 * @returns Whether the term is constant, independent of its coefficient value.
	 */
	isConstant() {
		for (const p in this.powers) {
			if (this.powers[p] !== 0) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Tests whether the coefficient is zero.
	 *
	 * @returns Whether the term's symbolic coefficient is zero.
	 */
	isZero() {
		return this.coeff.isZero();
	}

	/**
	 * Calculates the LCM of two terms with numeric coefficients
	 * TODO: Extend to non-numeric coefficients
	 *
	 * @param t - Other monomial term.
	 * @param withCoeff - Include the exact numeric coefficient LCM instead of using one.
	 * @returns A new term containing maximum powers for the union of variables.
	 */
	LCM(t: Term, withCoeff = false) {
		const variables = arrayAddUnique([...this.variables], t.variables);

		const powers: PowersObject = {};
		// Calculate the max power between this and t.
		for (const v of variables) {
			powers[v] = Math.max(this.deg(v), t.deg(v));
		}

		const coeff = withCoeff
			? Expression.fromRational(this.coeff.getMultiplier().LCM(t.coeff.getMultiplier()))
			: '1';

		return new Term(coeff, powers, variables);
	}

	/**
	 * Returns the variable name with the greatest stored power.
	 */
	max() {
		return Object.keys(this.powers).reduce((a, b) => (this.powers[a] > this.powers[b] ? a : b));
	}

	/**
	 * Returns the variable name with the least stored power.
	 */
	min() {
		return Object.keys(this.powers).reduce((a, b) => (this.powers[a] < this.powers[b] ? a : b));
	}

	/**
	 * Calculates the multidegree array
	 *
	 * @param variables - Variable order for the result.
	 * @returns A new power array, using zero for missing variables.
	 */
	multideg(variables: string[]) {
		const arr: number[] = [];
		for (const v of variables) {
			arr.push(this.deg(v));
		}

		return arr;
	}

	/**
	 * Gets the text representation of the monomial
	 *
	 * @param useVariables - Optional variable rendering order.
	 * @returns Canonical parser text for the coefficient and monomial.
	 */
	text(useVariables?: string[]) {
		let c = this.coeff.text();

		// Wrap sums in brackets
		if (this.coeff.isSum()) {
			c = `(${c})`;
		}

		let retval;
		// Zero times anything is zero so nothing left to do
		if (c === '0') {
			retval = c;
		} else {
			let v = this.getValueString(useVariables);
			// Remove the safety '1';
			if (v === '1') {
				v = '';
			}
			// Add multiplication sign
			if (v) {
				if (c === '1') {
					c = '';
				} else if (c === '-1') {
					c = '-';
				} else {
					c += '*';
				}
			}

			retval = `${c}${v}`;
		}

		return retval;
	}

	/**
	 * Multiplies this term with the given term
	 *
	 * @param x - Multiplier term.
	 * @returns A new term with multiplied coefficients and added powers.
	 */
	times(x: Term) {
		const retval = this.copy();
		retval.coeff = retval.coeff.times(x.coeff);
		for (const v in x.powers) {
			if (!retval.variables.includes(v)) {
				retval.variables.push(v);
			}
			retval.deg(v, retval.deg(v) + x.deg(v));
		}
		return retval.update();
	}

	/** Returns the same parser text as {@link Term.text}. */
	toString() {
		return this.text();
	}
}
