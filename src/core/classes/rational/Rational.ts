import Decimal from 'decimal.js';

import { message, DivisionByZeroError } from '../../errors';
import { convert, simplifyRatio, sign, abs, isEven } from '../../functions/bigint/bigint';
import { GCD, mod } from '../../functions/bigint/bigint';
import { scientificToDecimal } from '../../functions/string';
import { Expression } from '../expression/Expression';
import { RATIONAL, DOT, PARSER_CONSTANTS } from '../parser/constants';

import type { OptionsObject } from '../parser/types';

/**
 * The main class for multipliers. All expression multiplier are converted to `Rationals`, e.g. 0.333 -> 333/1000.
 * Input can be as denominator,numerator or a fraction string.
 *
 * @example
 * ```ts
 * new Rational(1n, 2n);
 * new Rational('1/2');
 * ```
 */
export class Rational {
	/**
	 * The value of e. This must be recalculated if the decimal places change.
	 */
	public static E = Rational.create(PARSER_CONSTANTS.e());
	/**
	 * The value of pi. This must be recalculated if the decimal places change.
	 */
	public static PI = Rational.create(PARSER_CONSTANTS.pi());

	/**
	 * The number of decimal places used when converting to decimal string.
	 * This should be changed through the set precision
	 */
	private static precision: number = Decimal.precision;

	asDecimal: boolean = false;
	dataType: string = RATIONAL;
	denominator: bigint;

	numerator: bigint;

	value!: string;

	constructor(a: bigint, b: bigint) {
		this.numerator = a as bigint;
		this.denominator = b as bigint;
		this.value = b === 1n ? String(a) : `${a}/${b}`;
	}

	/**
	 * Checks if all the entries are negative
	 *
	 * @param args
	 * @returns
	 */
	public static allNegative(...args: Rational[]) {
		for (const e of args) {
			if (e.sign() !== -1) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Creates a Rational from string or bigint
	 * @param value
	 * @returns
	 */
	public static create(value: string | bigint) {
		let a: bigint;
		let b: bigint;
		let asDecimal = false;
		if (typeof value === 'bigint') {
			a = value;
			b = 1n;
			value = String(a);
		} else if (/^[+-]?\d+$/.test(value)) {
			a = BigInt(value);
			b = 1n;
		} else {
			if (value.includes('/')) {
				[a, b] = value.split('/').map(x => BigInt(x));
			} else {
				const isScientific = value.toLocaleLowerCase().includes('e');
				asDecimal = isScientific || value.includes(DOT);
				if (isScientific) {
					value = scientificToDecimal(value);
					// All scientific numbers are decimal
					asDecimal = true;
				}
				[a, b] = convert(value);
			}
		}

		const rational = new Rational(a, b);
		rational.value = value;
		rational.asDecimal = asDecimal;
		return rational;
	}

	/**
	 * Returns the greatest common divisor of a set of Rationals
	 *
	 * @param args
	 * @returns
	 */
	public static GCD(...args: Rational[]) {
		let retval = args[0];
		for (let i = 1; i < args.length; i++) {
			retval = retval.GCD(args[i]);
		}
		return retval;
	}

	public static get(value: string) {
		if (value === 'precision') {
			return Rational.precision;
		}
	}

	/**
	 * This function can be called as a hook
	 *
	 * @param value
	 * @returns
	 */
	public static hook(value: string | Rational | bigint) {
		return value;
	}

	/**
	 * Checks if a number is of type Q
	 *
	 * @param value
	 * @returns
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public static isRational(value: any): value is Rational {
		return value && value.dataType === RATIONAL;
	}

	/**
	 * Returns the lowest common multiple of aset of Rationals
	 *
	 * @param args
	 * @returns
	 */
	public static LCM(...args: Rational[]) {
		let retval = args[0];
		for (let i = 1; i < args.length; i++) {
			retval = retval.LCM(args[i]);
		}
		return retval;
	}

	/**
	 * Makes a copy of the provided rational
	 * @param x
	 * @returns
	 */
	static makeCopy(x: Rational) {
		const copy = new Rational(x.numerator, x.denominator);
		copy.value = x.value;
		copy.asDecimal = x.asDecimal;
		return copy;
	}

	public static set(values: { [key: string]: number | boolean }) {
		if ('precision' in values) {
			const precision = Number(values.precision);
			// Set the precision for this class
			Rational.precision = precision;
			// Update the precision for decimal to match
			Decimal.set({
				precision: precision,
			});
			// Update pi
			Rational.PI = Rational.create(PARSER_CONSTANTS.pi());
			Rational.E = Rational.create(PARSER_CONSTANTS.e());
		}
	}

	/**
	 * Ensures that the element is of type Rational.
	 *
	 * @param x
	 * @param ensureCopy If true, a new Rational is guaranteed to be returned.
	 * @returns
	 */
	public static toRational(x: string | Rational, ensureCopy: boolean = false) {
		// Convert any strings to Rationals
		if (typeof x === 'string') {
			return Rational.create(x);
		}

		// If they want a guaranteed copy then just return a copy
		if (ensureCopy) {
			return Rational.makeCopy(x);
		}

		// Otherwise just return the original rational
		return x;
	}

	/**
	 * Gets the absolute value of a Rational
	 *
	 * @returns
	 */
	abs() {
		const n = this.copy();
		n.numerator = abs(n.numerator);
		return n;
	}

	/**
	 * Creates a copy of the Rational
	 *
	 * @returns A new Rational object
	 */
	copy() {
		return Rational.makeCopy(this);
	}

	/**
	 * Divides two Rationals. If a string is supplied it's converted to a Rational
	 *
	 * @param num The Rational to be divided by
	 * @returns The quotient
	 */
	div(num: Expression): Expression;
	div(num: Rational | string): Rational;
	div(num: Rational | string | Expression) {
		let retval;
		if (num instanceof Expression) {
			retval = num.div(this);
		} else {
			num = Rational.toRational(num, true);
			// Invert and multiply
			// There is no need to track the result type in this function since it's being handled by invert and multiply
			retval = this.times(num.invert());
		}

		return retval;
	}

	/**
	 * Compares two numbers
	 *
	 * @param num The number being compared
	 * @returns True if this number is equal to the number being compared to
	 */
	eq(num: Expression): boolean;
	eq(num: Rational | string): boolean;
	eq(num: Rational | string | Expression): boolean {
		if (num instanceof Expression) {
			return Expression.create(this).eq(num);
		} else {
			num = Rational.toRational(num);
			return this.numerator * num.denominator === num.numerator * this.denominator;
		}
	}

	/**
	 * Checks if a Rational has an even denominator.
	 *
	 * @returns
	 */
	evenDenominator() {
		return isEven(this.denominator);
	}

	/**
	 * Checks if a Rational has an even numerator.
	 *
	 * @returns
	 */
	evenNumerator() {
		return isEven(this.numerator);
	}

	/**
	 * Gets the GCD of two Rationals
	 *
	 * @param num
	 * @returns
	 */
	GCD(num: Rational | string) {
		num = Rational.toRational(num);
		const [n, d] = simplifyRatio(
			GCD(this.numerator * num.denominator, this.denominator * num.numerator),
			this.denominator * num.denominator
		);
		return new Rational(n, d);
	}

	/**
	 * Compares two numbers
	 *
	 * @param num The number being compared
	 * @returns True if this number is greater than to the number being compared to
	 */
	gt(num: Expression): boolean;
	gt(num: Rational | string): boolean;
	gt(num: Rational | string | Expression): boolean {
		if (num instanceof Expression) {
			return Expression.create(this).gt(num);
		}
		num = Rational.toRational(num);
		return this.numerator * num.denominator > num.numerator * this.denominator;
	}

	/**
	 * Compares two numbers
	 *
	 * @param num The number being compared
	 * @returns True if this number is greater than or equal to the number being compared to
	 */
	gte(num: Rational | string): boolean {
		num = Rational.toRational(num);
		return this.numerator * num.denominator >= num.numerator * this.denominator;
	}

	/**
	 * Inverts the Rational.
	 *
	 * @returns An inverted fraction
	 */
	invert(): Rational {
		// Throw if trying to divide by zero
		if (this.isZero()) {
			throw new DivisionByZeroError(message('divisionByZero'));
		}
		const retval = this.copy();
		// Store the sign
		const sgn = retval.sign();
		// Remove it from the numerator.
		retval.numerator = abs(retval.numerator);
		// Switch them
		[retval.numerator, retval.denominator] = [retval.denominator, retval.numerator];
		// Put back the sign and return
		return sgn === -1 ? retval.neg() : retval.updateValue();
	}
	/**
	 * Checks to see if a Rational is an even integer
	 *
	 * @returns
	 */
	isEven() {
		return this.isInteger() && this.evenNumerator();
	}
	/**
	 * Checks if the value of the Rational is a integer. It's important that
	 * simplify has been called otherwise 8/4 will return false since it's only
	 * checking the denominator
	 *
	 * @returns
	 */
	isInteger(): boolean {
		return this.denominator === 1n;
	}

	/**
	 * Checks to see if Fractional is one. This serves primarily as a glue to the api.
	 *
	 * @returns
	 */
	isMinusOne(): boolean {
		return this.numerator === -1n && this.denominator === 1n;
	}
	/**
	 *
	 * @returns True if the Rational is negative. It only checks the numerator
	 * since the sign is carried there.
	 */
	isNegative(): boolean {
		return this.numerator < 0n;
	}
	/**
	 * Checks to see if Fractional is one. This serves primarily as a glue to the api.
	 *
	 * @returns
	 */
	isOne(): boolean {
		return this.numerator === 1n && this.denominator === 1n;
	}

	/**
	 * Checks to see if Fractional is zero. This serves primarily as a glue to the api.
	 *
	 * @returns
	 */
	isZero(): boolean {
		return this.numerator === 0n;
	}
	/**
	 * Gets the LCM of two Rationals
	 *
	 * @param num
	 * @returns
	 */
	LCM(num: Rational | string) {
		num = Rational.toRational(num);
		const [n, d] = simplifyRatio(
			this.numerator * num.numerator,
			GCD(this.numerator * num.denominator, this.denominator * num.numerator)
		);
		return new Rational(n, d);
	}
	/**
	 * Compares two numbers
	 *
	 * @param num The number being compared
	 * @returns True if this number is less than the number being compared to
	 */
	lt(num: Rational | string): boolean {
		num = Rational.toRational(num);
		return this.numerator * num.denominator < num.numerator * this.denominator;
	}

	/**
	 * Compares two numbers
	 *
	 * @param num The number being compared
	 * @returns True if this number is less than or equal to the number being compared to
	 */
	lte(num: Rational | string): boolean {
		num = Rational.toRational(num);
		return this.numerator * num.denominator <= num.numerator * this.denominator;
	}
	/**
	 * Subtracts two Rationals. If a string is supplied it's converted to a Rational
	 *
	 * @param num The Rational to subtracted
	 * @returns The difference
	 */
	minus(num: Expression): Expression;
	minus(num: Rational | string): Rational;
	minus(num: Rational | string | Expression) {
		let retval;
		if (num instanceof Expression) {
			retval = Expression.create(this).minus(num);
		} else {
			num = Rational.toRational(num, true);
			retval = this.plus(num.neg());
		}

		// Negate and add
		return retval;
	}
	/**
	 * Calculates the mod.
	 *
	 * @param num
	 */
	mod(num: Rational | string) {
		num = Rational.toRational(num);

		// Make their denominators common and get the mod of the common numerators
		const numerator = mod(this.numerator * num.denominator, num.numerator * this.denominator);
		const denominator = this.denominator * num.denominator;
		const result = new Rational(...simplifyRatio(numerator, denominator));
		return result;
	}
	/**
	 * Negates the Rational.
	 *
	 * @returns
	 */
	neg(): Rational {
		const retval = this.copy();
		retval.numerator *= -1n;
		retval.updateValue();
		return retval;
	}

	/**
	 * Adds two Rationals. If a string is supplied it's converted to a Rational
	 *
	 * @param num The Rational to be added to this
	 * @returns The sum
	 */
	plus(num: Expression): Expression;
	plus(num: Rational | string): Rational;
	plus(num: Rational | string | Expression) {
		let retval;
		if (num instanceof Expression) {
			retval = Expression.create(this).plus(num);
		} else {
			num = Rational.toRational(num);

			let numerator: bigint;
			let denominator: bigint;

			// let result: Rational = new Rational('0');
			// If they have the same denominator then we can add the numerators.
			if (num.denominator === this.denominator) {
				numerator = num.numerator + this.numerator;
				denominator = num.denominator;
			} else {
				// Fractional addition and then simplify using their gcd.
				numerator = this.numerator * num.denominator + num.numerator * this.denominator;
				denominator = this.denominator * num.denominator;
			}

			[numerator, denominator] = simplifyRatio(numerator, denominator);

			retval = new Rational(numerator, denominator);

			// Ensure that any operation with a decimal results in a decimal
			retval.asDecimal = this.asDecimal || num.asDecimal;
		}

		return retval;
	}
	/**
	 * Raises a number to the power of another number
	 *
	 * @param num The number to raise to the power to
	 * @returns The exponentiation
	 */
	pow(num: Expression): Expression;
	pow(num: Rational | string): Rational;
	pow(num: Rational | string | Expression) {
		let retval;
		if (num instanceof Expression) {
			retval = Expression.create(this).pow(num);
		} else {
			num = Rational.toRational(num);

			if (num.isInteger()) {
				const [numerator, denominator] = simplifyRatio(
					this.numerator ** num.numerator,
					this.denominator ** num.numerator
				);
				retval = new Rational(numerator, denominator);
			} else {
				const s = this.toDecimal().toPower(num.toDecimal()).toString();
				retval = Rational.create(s);
			}

			retval.asDecimal = this.asDecimal;
		}

		return retval;
	}
	/**
	 *
	 * @returns The sign of the Rational.
	 */
	sign(): number {
		return sign(this.numerator);
	}
	/**
	 * This will return a string in fraction form in fractional form
	 *
	 * @returns The string representation of the Rational object
	 */
	text(options?: OptionsObject): string {
		let value: string;
		const thisIsInteger = this.isInteger();

		// Mark it as a decimal if it is such
		if (this.asDecimal || options?.decimal) {
			if (thisIsInteger) {
				value = `${this.numerator}.0`;
			} else {
				const precision = Decimal.precision;
				Decimal.set({ precision: Number(options?.precision) || precision });
				value = this.toDecimal().toString();
				Decimal.set({ precision: precision });
			}
		} else if (thisIsInteger) {
			value = `${this.numerator}`;
		} else {
			value = `${this.numerator}/${this.denominator}`;
		}

		return value;
	}

	/**
	 * Multiplies two Rationals. If a string is supplied it's converted to a Rational
	 *
	 * @param num The Rational to be multiplied
	 * @returns The product
	 */
	times(num: Expression): Expression;
	times(num: Rational | string): Rational;
	times(num: Rational | string | Expression) {
		let retval;
		if (num instanceof Expression) {
			retval = num.times(this);
		} else {
			num = Rational.toRational(num);

			const [numerator, denominator] = simplifyRatio(
				this.numerator * num.numerator,
				this.denominator * num.denominator
			);
			retval = new Rational(numerator, denominator);

			// Ensure that any operation with a decimal results in a decimal
			retval.asDecimal = this.asDecimal || num.asDecimal;
		}

		return retval;
	}

	/**
	 * Converts to a Decimal object
	 *
	 * @returns
	 */
	toDecimal() {
		return new Decimal(String(this.numerator)).div(String(this.denominator));
	}

	toDecimalString(precision?: number) {
		// return this.toDecimal().toString();
		const sgn = sign(this.numerator);
		const a = abs(this.numerator);
		const b = this.denominator;
		const whole = a / b;
		const rem = a % b;
		const dec = ((10n ** BigInt(precision || Rational.precision) * rem) / b).toString();
		return `${sgn === 1 ? '' : '-'}${whole}.${'0'.repeat(precision || Rational.precision - dec.length)}${dec}`.replace(
			/0+$/g,
			''
		);
	}

	toString(options?: OptionsObject) {
		return this.text(options);
	}

	/**
	 * Updates the value string
	 *
	 * @returns
	 */
	updateValue() {
		this.value =
			this.denominator === 1n
				? String(this.numerator)
				: `${this.numerator}/${this.denominator}`;
		return this;
	}

	valueOf() {
		return Number(this.toDecimal());
	}
}
