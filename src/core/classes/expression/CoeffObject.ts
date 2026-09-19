import { message, NaNError } from '../../errors';
import { Polynomial } from '../polynomial/Polynomial';
import { Term } from '../polynomial/Term';
import { Vector } from '../vector/Vector';

import { Expression } from './Expression';
import { zero } from './shortcuts';

/**
 * Stores coefficients indexed by the power or multidegree collected from an expression.
 *
 * @remarks
 * {@link Expression.coeffs} and {@link Polynomial.coeffs} use string keys. A
 * univariate coefficient uses a key such as `"2"`; multivariate collection uses a
 * comma-separated degree tuple such as `"1,0"`, in the same order as
 * {@link CoeffObject.variables}.
 *
 * The object is mutable. The constructor retains the supplied `variables` array, and
 * the public `coeffs` record exposes the stored expression references directly.
 * Methods such as {@link CoeffObject.toArray} are intended for univariate numeric power
 * keys; a multidegree key cannot be represented by that dense array form.
 */
export class CoeffObject {
	/** Mutable coefficient expressions keyed by power or comma-separated multidegree. */
	coeffs: { [key: string]: Expression } = {};
	/** Variables whose order defines the degree keys in {@link coeffs}. */
	variables: string[];

	/**
	 * Creates an empty coefficient collection for the requested variable order.
	 *
	 * @param variables - Variables used to interpret coefficient degree keys. The array
	 * is retained by reference.
	 */
	constructor(variables: string[]) {
		this.variables = variables;
	}

	/** Rebuilds the stored degree keys and coefficients as independent polynomial terms. */
	private buildTerms() {
		const retval: Term[] = [];

		for (const powers in this.coeffs) {
			retval.push(new Term(new Expression(this.coeffs[powers]), powers, this.variables));
		}

		return retval;
	}

	/**
	 * Adds an expression to the coefficient stored at a degree key.
	 *
	 * A new key retains `value` by reference. An existing key is replaced with the
	 * expression returned by symbolic addition.
	 *
	 * @param key - Power or comma-separated multidegree key.
	 * @param value - Coefficient contribution to accumulate.
	 */
	add(key: string, value: Expression) {
		const e = this.coeffs[key];
		this.coeffs[key] = e ? e.plus(value) : value;
	}

	/**
	 * Visits each stored coefficient and its degree key.
	 *
	 * @param fn - Callback receiving the stored expression reference and key.
	 * @returns This coefficient object for chaining.
	 */
	each(fn: (e: Expression, p: string) => void) {
		for (const x in this.coeffs) {
			fn(this.coeffs[x], x);
		}

		return this;
	}

	/**
	 * Returns the stored coefficient for a power or multidegree key.
	 *
	 * @param p - Key to look up.
	 * @returns The internal expression reference, or `undefined` when the key is absent.
	 */
	getPower(p: string | number) {
		return this.coeffs[p];
	}

	/**
	 * Tests whether a power or multidegree key is present, including an explicit zero.
	 *
	 * @param p - Key to test.
	 */
	hasPower(p: string | number) {
		return p in this.coeffs;
	}
	/** Returns the greatest numeric power key, or `NaN` when any key is non-numeric. */
	max() {
		const powers = Object.keys(this.coeffs).map(x => {
			return Number(x);
		});
		return Math.max(...powers);
	}
	/**
	 * Formats the sparse coefficient record for inspection.
	 *
	 * @param formatted - Add line breaks and indentation between entries.
	 */
	text(formatted: boolean = false) {
		const n = formatted ? '\n' : '';
		const t = formatted ? '    ' : '';
		const values: string[] = [];
		const d = `, ` + n;
		for (const x in this.coeffs) {
			values.push(`${t}${x}: ${this.coeffs[x]}`);
		}

		return `{ ${n}${values.join(d)} ${n}}`;
	}
	toArray(): Expression[];
	toArray(asNumber: false): Expression[];
	toArray(asNumber: true): number[];
	/**
	 * Converts univariate coefficients to a dense array indexed by power.
	 *
	 * Missing powers are filled with new zero expressions. With `asNumber: true`, each
	 * coefficient is converted using JavaScript numeric conversion, which may lose exact
	 * precision. The method does not remove or copy coefficients already stored here.
	 *
	 * @param asNumber - Return JavaScript numbers instead of expressions.
	 * @throws {@link NaNError} Thrown when a key, such as a multidegree tuple, cannot be
	 * interpreted as a numeric univariate power.
	 */
	toArray(asNumber: boolean = false) {
		const max = this.max();
		const coeffs: (Expression | number)[] = [];

		if (isNaN(max)) {
			throw new NaNError(message('cannotCreateArrayFromNaN'));
		}

		for (let i = 0; i <= max; i++) {
			let coeff = this.coeffs[i];
			// Fill voids with zero
			if (!coeff) {
				coeff = zero();
			}

			coeffs[i] = asNumber ? Number(coeff) : coeff;
		}

		return coeffs;
	}

	/** Reconstructs the stored coefficients as a native symbolic expression. */
	toExpression() {
		let retval = zero();

		for (const term of this.buildTerms()) {
			if (!term.isZero()) {
				retval = retval.plus(term.getExpression());
			}
		}

		return retval;
	}

	/**
	 * Builds parser text representing the stored coefficient terms.
	 *
	 * Each degree key is interpreted using the configured variable order, including
	 * comma-separated multidegrees such as `"2,1"` for `x^2*y`.
	 */
	toParsableString() {
		const terms: string[] = [];

		for (const term of this.buildTerms()) {
			if (!term.isZero()) {
				terms.push(term.text(this.variables));
			}
		}

		return terms.join('+').replace(/\+-/g, '-');
	}

	/**
	 * Reconstructs the coefficients as a {@link Polynomial} without reparsing ordinary terms.
	 *
	 * Coefficients that contain one of the configured polynomial variables are passed through
	 * the normal constructor so overlapping coefficient and monomial powers are canonicalized.
	 *
	 * @returns A new polynomial with independent terms and a synchronized expression.
	 */
	toPolynomial() {
		const terms = this.buildTerms();
		const requiresCanonicalization = terms.some(term =>
			this.variables.some(variable => term.coeff.hasVariable(variable))
		);
		const expression = this.toExpression();

		let retval: Polynomial;
		if (requiresCanonicalization) {
			retval = new Polynomial(expression, this.variables);
		} else {
			retval = new Polynomial(zero(), this.variables);
			retval.terms = terms.filter(term => !term.isZero());
			retval.order();
			retval.expression = expression;
		}

		return retval;
	}

	toString() {
		return this.text();
	}

	/**
	 * Converts univariate coefficients to a dense {@link Vector} ordered by ascending power.
	 *
	 * Missing powers are represented by zero expressions.
	 */
	toVector() {
		return new Vector(this.toArray());
	}
}
