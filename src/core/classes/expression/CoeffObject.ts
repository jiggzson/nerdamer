import { message, NaNError } from '../../errors';
import { Polynomial } from '../polynomial/Polynomial';
import { Vector } from '../vector/Vector';

import { Expression } from './Expression';
import { zero } from './shortcuts';

export class CoeffObject {
	coeffs: { [key: string]: Expression } = {};
	variables: string[];

	constructor(variables: string[]) {
		this.variables = variables;
	}

	add(key: string, value: Expression) {
		const e = this.coeffs[key];
		this.coeffs[key] = e ? e.plus(value) : value;
	}

	/**
	 * Loops over each coefficient in the object
	 *
	 * @param callback
	 */
	each(fn: (e: Expression, p: string) => void) {
		for (const x in this.coeffs) {
			fn(this.coeffs[x], x);
		}

		return this;
	}

	/**
	 * Gets the coefficient of a particular power
	 * @param p
	 * @returns
	 */
	getPower(p: string | number) {
		return this.coeffs[p];
	}

	/**
	 * Checks if the coeff object has a coefficient for a particular power
	 * @param p
	 * @returns
	 */
	hasPower(p: string | number) {
		return p in this.coeffs;
	}
	max() {
		const powers = Object.keys(this.coeffs).map(x => {
			return Number(x);
		});
		return Math.max(...powers);
	}
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

	/**
	 * Returns a polynomial from the coefficient object.
	 *
	 * @returns
	 */
	toExpression() {
		return Expression.create(this.toParsableString());
	}

	/**
	 * Rebuilds the polynomial from the coefficients.
	 */
	toParsableString() {
		const polyArr: string[] = [];
		const vars = this.variables.join('*');

		for (const x in this.coeffs) {
			polyArr.push(`${this.coeffs[x]}*${vars}^${x}`);
		}

		return polyArr.join('+');
	}

	/**
	 * Returns a polynomial from a coefficient object.
	 *
	 * @throws {PolynomialError} Will throw if the coeffients provided are not a valid polynomial
	 * @returns
	 */
	toPolynomial() {
		return new Polynomial(this.toParsableString(), this.variables);
	}

	toString() {
		return this.text();
	}

	/**
	 * Returns the coefficients as a vector.
	 *
	 * @returns
	 */
	toVector() {
		return new Vector(this.toArray());
	}
}
