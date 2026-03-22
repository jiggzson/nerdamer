import { productInRange } from '../../functions/bigint/bigint';
import { sum } from '../../functions/numeric';
import { arrayAddUnique } from '../../functions/utils';
import { Expression } from '../expression/Expression';
import { TERM } from '../parser/constants';

/**
 * The monomial term
 */
type PowersObject = { [variable: string]: number };

export class Term {
	// The term coefficient
	coeff: Expression;
	dataType: string = TERM;
	// The expression representation of the term. This is only generated if getExpression is called.
	expression?: Expression;
	// The total number of non-unit variables in the term. e.g. given variables [x, y, z] with a multideg of [1, 0, 3]
	// this will return 2 since y = 1.
	length: number;
	// The multidegree array e.g. a^2*b*c^5 -> [2, 1, 5]
	multidegArray?: number[];
	// The powers of the object mapped as {variable: power}
	powers: PowersObject;
	// The total power of the term
	totalPower?: number;
	//The expression representation of the term
	valueString?: string;
	// The array of variables in the term including constants
	variables: string[];

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

		// NOTE: Do not make of copy of the variables object. We need it to be a reference to the parent variables.
		this.variables = [...variables].sort();
	}

	/**
	 * Checks if the given object is a Term
	 *
	 * @param obj
	 * @returns
	 */
	public static isTerm(obj: unknown): obj is Term {
		if (obj === undefined) {
			return false;
		}

		return (obj as Term).dataType === TERM;
	}

	/**
	 * Gets the total number of non-unit variables in the term
	 *
	 * @returns
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

	/**
	 * This should be called if the
	 *
	 * @returns
	 */
	private update() {
		this.updateMultiDegArray();
		this.updateTotalPower();
		this.length = this.getLength();
		return this;
	}

	/**
	 * Forces the multidegree array to be recalculated
	 *
	 * @returns
	 */
	private updateMultiDegArray() {
		this.multidegArray = this.multideg(this.variables);
		return this;
	}

	/**
	 * Forces the total power to be recalculated
	 *
	 * @returns
	 */
	private updateTotalPower() {
		this.totalPower = 0;
		for (const x in this.powers) {
			this.totalPower += this.deg(x);
		}

		return this;
	}

	/**
	 * Returns true of the given term can be added or subtracted from this one. e.g. (x^2, x) will return false.
	 *
	 * @param t
	 * @returns
	 */
	canAddOrSubtract(t: Term) {
		return this.getValueString() === t.getValueString();
	}

	/**
	 * Creates a copy of the Term
	 *
	 * @returns
	 */
	copy() {
		return new Term(new Expression(this.coeff), { ...this.powers }, this.variables);
	}

	/**
	 * Gets the degree of the individual variable
	 *
	 * @param x
	 * @returns
	 */
	deg(v: string): number;
	deg(v: string, value: number): Term;
	deg(v: string, value?: number): number | Term {
		if (value !== undefined) {
			this.powers[v] = value;
			return this;
		}
		return this.powers[v] || 0;
	}

	/**
	 * Pulls the derivative of a term
	 *
	 * @param variable
	 * @param n
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
	 * Calculates the difference between two pArrays
	 *
	 * @param term
	 * @returns
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
	 * @param x
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
	 * @param t
	 * @returns
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
	 * @param t
	 * @returns
	 */
	eq(t: Term) {
		return this.div(t).eqNumber(1);
	}

	/**
	 * Checks if a terms equals a number
	 *
	 * @param n
	 * @returns
	 */
	eqNumber(n: number | string) {
		return sum(...Object.values(this.powers)) === 0 && this.coeff.eq(n);
	}
	/**
	 * Gets the Term as an expression
	 *
	 * @returns
	 */
	getExpression() {
		if (this.expression === undefined) {
			this.expression = this.coeff.times(this.getValueString());
		}

		return this.expression;
	}
	/**
	 * Fetches the multidegree array
	 *
	 * @returns
	 */
	getMultidegArray() {
		if (this.multidegArray === undefined) {
			this.updateMultiDegArray();
		}

		return this.multidegArray!;
	}

	/**
	 * Gets the total power of the term
	 *
	 * @returns
	 */
	getTotalPower() {
		if (this.totalPower === undefined) {
			this.updateTotalPower();
		}
		return this.totalPower!;
	}

	/**
	 * Get the term with a unit coefficient. For 3*x^2*y this will return x^2*y
	 *
	 * @returns
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
	 * Checks to see if the term is just a constant term
	 *
	 * @returns
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
	 * Checks to see if the term is equal to zero.
	 *
	 * @returns
	 */
	isZero() {
		return this.coeff.isZero();
	}

	/**
	 * Calculates the LCM of two terms with numeric coefficients
	 * TODO: Extend to non-numeric coefficients
	 *
	 * @param t The term to be used to calculate the LCM
	 * @param withCoeff If true, then the coefficient will be included with the LCM
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
	 * Get's the power with the highest power in the term
	 * @returns
	 */
	max() {
		return Object.keys(this.powers).reduce((a, b) => (this.powers[a] > this.powers[b] ? a : b));
	}

	/**
	 * Get's the power with the lowest power in the term
	 * @returns
	 */
	min() {
		return Object.keys(this.powers).reduce((a, b) => (this.powers[a] < this.powers[b] ? a : b));
	}

	/**
	 * Calculates the multidegree array
	 *
	 * @param variables
	 * @returns
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
	 * @returns
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
	 * @param x
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

	toString() {
		return this.text();
	}
}
