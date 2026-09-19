import Decimal from 'decimal.js';

import { isNerdamerNativeType } from '../../common/common';
import { message, DivisionByZeroError, ZeroToZeroPowerError } from '../../errors';
import { convert, simplifyRatio, sign, abs, isEven } from '../../functions/bigint/bigint';
import { GCD, mod } from '../../functions/bigint/bigint';
import { scientificToDecimal } from '../../functions/string';
import { Expression } from '../expression/Expression';
import { RATIONAL, DOT, PARSER_CONSTANTS } from '../parser/constants';

import type { OptionsObject } from '../parser/types';

/**
 * Represents an exact rational value as a `bigint` numerator and denominator.
 *
 * @remarks
 * Core rational arithmetic is exact: decimal and scientific-notation input is converted to
 * the exact fraction represented by the input text rather than stored as a floating-point
 * approximation. The notable exception is non-integer {@link Rational.pow}, which uses
 * `decimal.js` numerical exponentiation. The {@link Rational.asDecimal} flag records
 * presentation intent only; it does not change the underlying rational representation.
 *
 * Values produced by {@link Rational.create} and the arithmetic methods are normally reduced
 * and use a positive denominator. The public constructor is lower level: it stores its two
 * `bigint` arguments exactly as supplied and does not reduce the fraction, normalize the
 * denominator sign, or reject a zero denominator. Sign, comparison, and integer helpers assume
 * the normal representation, so callers constructing values directly are responsible for
 * preserving that representation.
 *
 * `Rational` instances are mutable because their representation fields are public and
 * {@link Rational.updateValue} updates the instance in place. The ordinary arithmetic methods
 * return new values and do not mutate their operands.
 */
export class Rational {
	/**
	 * Finite-precision rational approximation of Euler's number at the current configured precision.
	 *
	 * Recomputed when {@link Rational.set} changes the precision.
	 */
	public static E = Rational.create(PARSER_CONSTANTS.e());
	/**
	 * Finite-precision rational approximation of pi at the current configured precision.
	 *
	 * Recomputed when {@link Rational.set} changes the precision.
	 */
	public static PI = Rational.create(PARSER_CONSTANTS.pi());

	/**
	 * Precision setting shared with `decimal.js` and used as the default digit count by
	 * {@link Rational.toDecimalString}. Change it through {@link Rational.set}.
	 */
	private static precision: number = Decimal.precision;

	/**
	 * Whether text output should preserve decimal presentation by default.
	 *
	 * This flag does not change the exact numerator/denominator representation. Most rational
	 * arithmetic propagates decimal intent when either operand has it set.
	 */
	asDecimal: boolean = false;
	/** Marker used by Nerdamer's runtime type guards. */
	dataType: typeof RATIONAL = RATIONAL;
	/** Denominator of the exact rational representation. */
	denominator: bigint;

	/** Numerator of the exact rational representation. */
	numerator: bigint;

	/**
	 * The supplied textual value.
	 *
	 * Numeric behavior is defined by {@link Rational.numerator} and
	 * {@link Rational.denominator}; callers should not treat this field as an independent
	 * authoritative numeric representation.
	 */
	value!: string;

	/**
	 * Creates a rational from raw numerator and denominator components.
	 *
	 * @remarks
	 * This constructor performs no normalization or validation. Prefer
	 * {@link Rational.create} for user input and for values that must use Nerdamer's normal
	 * reduced-fraction representation.
	 *
	 * @param a - Numerator to store.
	 * @param b - Denominator to store.
	 */
	constructor(a: bigint, b: bigint) {
		this.numerator = a;
		this.denominator = b;
		this.value = b === 1n ? String(a) : `${a}/${b}`;
	}

	/**
	 * Tests whether every supplied rational is strictly negative.
	 *
	 * @param args - Rational values to test.
	 * @returns `true` when each value has sign `-1`.
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
	 * Creates a normalized rational from an integer, fraction, decimal, or scientific-notation value.
	 *
	 * @remarks
	 * Fraction strings are reduced and a negative denominator is moved to the numerator. Decimal
	 * and scientific-notation strings are converted to the exact rational represented by their
	 * finite decimal text. Those forms also set {@link Rational.asDecimal}, so later text output
	 * normally remains decimal even though the stored arithmetic stays exact.
	 *
	 * @param value - Integer `bigint` or numeric string to convert.
	 * @returns A new normalized `Rational`.
	 *
	 * @throws {@link DivisionByZeroError}
	 * Thrown when a fraction string has a zero denominator.
	 *
	 * @example
	 * ```ts
	 * Rational.create('2/4').text();   // "1/2"
	 * Rational.create('0.125').text(); // "0.125"
	 * Rational.create('4e1').text();   // "40.0"
	 * ```
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
				if (b === 0n) {
					throw new DivisionByZeroError(message('divisionByZero'));
				}
				if (b < 0n) {
					a = -a;
					b = -b;
				}
				[a, b] = simplifyRatio(a, b);
				value = b === 1n ? String(a) : `${a}/${b}`;
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
	 * Computes the rational greatest common divisor across the supplied values.
	 *
	 * @remarks
	 * The operation is folded pairwise and preserves decimal presentation intent when it is
	 * present on an operand.
	 *
	 * @param args - Rational values whose common divisor should be computed.
	 * @returns The pairwise rational GCD.
	 */
	public static GCD(...args: Rational[]) {
		let retval = args[0];
		for (let i = 1; i < args.length; i++) {
			retval = retval.GCD(args[i]);
		}
		return retval;
	}

	/**
	 * Returns the currently configured rational/Decimal precision setting.
	 *
	 * @returns The configured precision value.
	 */
	public static getPrecision() {
		return Rational.precision;
	}

	/**
	 * Returns a value unchanged for compatibility with generic numeric hooks.
	 *
	 * @param value - Value to pass through.
	 * @returns The same value reference or primitive supplied by the caller.
	 */
	public static hook(value: string | Rational | bigint) {
		return value;
	}

	/**
	 * Tests whether a value carries Nerdamer's rational runtime type marker.
	 *
	 * @remarks
	 * This is a marker-based guard rather than an `instanceof` check, which allows compatible
	 * Nerdamer rational objects to be recognized where constructor identity is not the useful
	 * distinction.
	 *
	 * @param value - Value to inspect.
	 * @returns `true` when `value.dataType` is Nerdamer's rational marker.
	 */
	public static isRational(value: unknown): value is Rational {
		return isNerdamerNativeType(value, RATIONAL);
	}

	/**
	 * Computes the rational least common multiple across the supplied values.
	 *
	 * @remarks
	 * The operation is folded pairwise and preserves decimal presentation intent when it is
	 * present on an operand.
	 *
	 * @param args - Rational values whose common multiple should be computed.
	 * @returns The pairwise rational LCM.
	 */
	public static LCM(...args: Rational[]) {
		let retval = args[0];
		for (let i = 1; i < args.length; i++) {
			retval = retval.LCM(args[i]);
		}
		return retval;
	}

	/**
	 * Copies a rational's representation and presentation metadata.
	 *
	 * @param x - Rational to copy.
	 * @returns A distinct `Rational` with the same numerator, denominator, `value`, and
	 * decimal-presentation flag.
	 */
	static makeCopy(x: Rational) {
		const copy = new Rational(x.numerator, x.denominator);
		copy.value = x.value;
		copy.asDecimal = x.asDecimal;
		return copy;
	}

	/**
	 * Updates shared numeric settings used by rational decimal conversion.
	 *
	 * @remarks
	 * Currently only `precision` is acted upon. Setting it updates the global `decimal.js`
	 * precision, records the value used by {@link Rational.toDecimalString}, and recomputes
	 * {@link Rational.PI} and {@link Rational.E} at the new precision.
	 *
	 * @param values - Settings object; `precision` is the supported numeric setting.
	 */
	public static set(values: { [key: string]: number | boolean }) {
		if ('precision' in values) {
			const precision = Number(values.precision);
			// Update the precision for decimal to match
			Decimal.set({
				precision: precision,
			});
			// Set the precision for this class after Decimal accepts the value
			Rational.precision = precision;
			// Update pi
			Rational.PI = Rational.create(PARSER_CONSTANTS.pi());
			Rational.E = Rational.create(PARSER_CONSTANTS.e());
		}
	}

	/**
	 * Converts a string to a rational or normalizes rational ownership for a caller.
	 *
	 * @remarks
	 * Strings always produce a new value through {@link Rational.create}. An existing `Rational`
	 * is returned by identity unless `ensureCopy` is `true`.
	 *
	 * @param x - Numeric string or rational value.
	 * @param ensureCopy - Guarantee a distinct object when `x` is already a `Rational`.
	 * @returns The converted rational, a copy, or the original rational according to `ensureCopy`.
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
	 * Returns the absolute value without modifying this rational.
	 *
	 * @returns A copied rational whose numerator is nonnegative.
	 */
	abs() {
		const retval = this.copy();
		retval.numerator = abs(retval.numerator);
		retval.updateValue();
		return retval;
	}

	/**
	 * Creates a distinct copy of this rational.
	 *
	 * @returns A new object with the same numeric representation and presentation metadata.
	 */
	copy() {
		return Rational.makeCopy(this);
	}

	/**
	 * Divides using Nerdamer's rational or expression arithmetic overloads.
	 *
	 * @remarks
	 * `Rational` and string operands compute exact rational division and return a new `Rational`.
	 * Expression operands promote this rational to an {@link Expression} and preserve operand
	 * direction, returning `this / expression`.
	 *
	 * @param num - Value participating in the division.
	 * @returns A rational result for rational/string input, or an `Expression` for expression input.
	 * @throws {@link DivisionByZeroError}
	 * Thrown when exact rational division requires inversion of zero.
	 */
	div(num: Expression): Expression;
	div(num: Rational | string): Rational;
	div(num: Rational | string | Expression) {
		let retval;
		if (Expression.isExpression(num)) {
			retval = Expression.create(this).div(num);
		} else {
			num = Rational.toRational(num, true);
			// Invert and multiply
			// There is no need to track the result type in this function since it's being handled by invert and multiply
			retval = this.times(num.invert());
		}

		return retval;
	}

	/**
	 * Compares this rational with another value for mathematical equality.
	 *
	 * @remarks
	 * Rational/string comparisons are exact and use cross multiplication, so decimal-presentation
	 * metadata does not affect equality. Expression input delegates to Nerdamer's symbolic
	 * comparison semantics.
	 *
	 * @param num - Value to compare with this rational.
	 * @returns `true` when the two values compare equal.
	 */
	eq(num: Expression): boolean;
	eq(num: Rational | string): boolean;
	eq(num: Rational | string | Expression): boolean {
		if (Expression.isExpression(num)) {
			return Expression.create(this).eq(num);
		} else {
			num = Rational.toRational(num);
			return this.numerator * num.denominator === num.numerator * this.denominator;
		}
	}

	/**
	 * Tests whether the stored denominator is even.
	 *
	 * @returns `true` when {@link Rational.denominator} is divisible by two.
	 */
	evenDenominator() {
		return isEven(this.denominator);
	}

	/**
	 * Tests whether the stored numerator is even.
	 *
	 * @returns `true` when {@link Rational.numerator} is divisible by two.
	 */
	evenNumerator() {
		return isEven(this.numerator);
	}

	/**
	 * Computes the rational greatest common divisor with another value.
	 *
	 * @param num - Rational or numeric string to combine with this value.
	 * @returns A new reduced rational GCD. Decimal presentation is preserved when either operand
	 * was marked for decimal output.
	 */
	GCD(num: Rational | string) {
		num = Rational.toRational(num);
		const [n, d] = simplifyRatio(
			GCD(this.numerator * num.denominator, this.denominator * num.numerator),
			this.denominator * num.denominator
		);
		const retval = new Rational(n, d);
		retval.asDecimal = this.asDecimal || num.asDecimal;
		return retval;
	}

	/**
	 * Tests whether this rational is greater than another value.
	 *
	 * @remarks
	 * Rational/string comparisons are exact. Expression input delegates to Nerdamer's symbolic
	 * ordering rules, including their restrictions on unordered complex values.
	 *
	 * @param num - Value to compare against.
	 * @returns `true` when this rational is greater than `num`.
	 */
	gt(num: Expression): boolean;
	gt(num: Rational | string): boolean;
	gt(num: Rational | string | Expression): boolean {
		if (Expression.isExpression(num)) {
			return Expression.create(this).gt(num);
		}
		num = Rational.toRational(num);
		return this.numerator * num.denominator > num.numerator * this.denominator;
	}

	/**
	 * Tests whether this rational is greater than or equal to another rational value.
	 *
	 * @param num - Rational or numeric string to compare against.
	 * @returns `true` when this rational is greater than or equal to `num`.
	 */
	gte(num: Rational | string): boolean {
		num = Rational.toRational(num);
		return this.numerator * num.denominator >= num.numerator * this.denominator;
	}

	/**
	 * Returns the multiplicative inverse of this rational.
	 *
	 * @remarks
	 * The original object is not modified. For normally constructed rationals, the returned
	 * denominator remains positive and the sign is carried by the numerator.
	 *
	 * @returns A new rational representing `1 / this`.
	 * @throws {@link DivisionByZeroError}
	 * Thrown when this rational is exactly zero.
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
	 * Tests whether this value is an even integer.
	 *
	 * @returns `true` only when the denominator is one and the numerator is even.
	 */
	isEven() {
		return this.isInteger() && this.evenNumerator();
	}
	/**
	 * Tests whether this rational is stored in integer form.
	 *
	 * @remarks
	 * This checks only whether the denominator is exactly `1n`. Values built with the raw
	 * constructor must therefore be reduced first if equivalent forms such as `8/4` should be
	 * recognized as integers.
	 *
	 * @returns `true` when the stored denominator is one.
	 */
	isInteger(): boolean {
		return this.denominator === 1n;
	}

	/**
	 * Tests whether this rational is exactly `-1` in normalized integer form.
	 *
	 * @returns `true` for numerator `-1n` and denominator `1n`.
	 */
	isMinusOne(): boolean {
		return this.numerator === -1n && this.denominator === 1n;
	}
	/**
	 * Tests whether the stored numerator is negative.
	 *
	 * @remarks
	 * Nerdamer's normal rational representation keeps the denominator positive, so the numerator
	 * carries the sign. Raw constructor values with a negative denominator do not follow that
	 * representation.
	 *
	 * @returns `true` when the numerator is negative.
	 */
	isNegative(): boolean {
		return this.numerator < 0n;
	}
	/**
	 * Tests whether this rational is exactly `1` in normalized integer form.
	 *
	 * @returns `true` for numerator `1n` and denominator `1n`.
	 */
	isOne(): boolean {
		return this.numerator === 1n && this.denominator === 1n;
	}

	/**
	 * Tests whether this rational is exactly zero.
	 *
	 * @returns `true` when the numerator is zero.
	 */
	isZero(): boolean {
		return this.numerator === 0n;
	}
	/**
	 * Computes the rational least common multiple with another value.
	 *
	 * @param num - Rational or numeric string to combine with this value.
	 * @returns A new reduced, nonnegative rational LCM. Zero combined with any rational returns
	 * zero. Decimal presentation is preserved when either operand was marked for decimal output.
	 */
	LCM(num: Rational | string) {
		num = Rational.toRational(num);
		let n = 0n;
		let d = 1n;
		if (!this.isZero() && !num.isZero()) {
			[n, d] = simplifyRatio(
				abs(this.numerator * num.numerator),
				GCD(this.numerator * num.denominator, this.denominator * num.numerator)
			);
		}
		const retval = new Rational(n, d);
		retval.asDecimal = this.asDecimal || num.asDecimal;
		return retval;
	}
	/**
	 * Tests whether this rational is less than another rational value.
	 *
	 * @param num - Rational or numeric string to compare against.
	 * @returns `true` when this rational is less than `num`.
	 */
	lt(num: Rational | string): boolean {
		num = Rational.toRational(num);
		return this.numerator * num.denominator < num.numerator * this.denominator;
	}

	/**
	 * Tests whether this rational is less than or equal to another rational value.
	 *
	 * @param num - Rational or numeric string to compare against.
	 * @returns `true` when this rational is less than or equal to `num`.
	 */
	lte(num: Rational | string): boolean {
		num = Rational.toRational(num);
		return this.numerator * num.denominator <= num.numerator * this.denominator;
	}
	/**
	 * Subtracts another rational or expression from this value.
	 *
	 * @remarks
	 * Rational/string input is handled with exact rational arithmetic. Expression input is
	 * promoted to Nerdamer's symbolic arithmetic. The original operands are not mutated.
	 *
	 * @param num - Value to subtract.
	 * @returns A new `Rational` for rational/string input, or an `Expression` for expression input.
	 */
	minus(num: Expression): Expression;
	minus(num: Rational | string): Rational;
	minus(num: Rational | string | Expression) {
		let retval;
		if (Expression.isExpression(num)) {
			retval = Expression.create(this).minus(num);
		} else {
			num = Rational.toRational(num, true);
			retval = this.plus(num.neg());
		}

		// Negate and add
		return retval;
	}
	/**
	 * Computes the exact rational modulo with another value.
	 *
	 * @remarks
	 * The operands are converted to a common denominator, Nerdamer's integer modulo operation is
	 * applied to the corresponding numerators, and the resulting fraction is reduced. Decimal
	 * presentation is preserved when either operand was marked for decimal output.
	 *
	 * @param num - Nonzero rational or numeric string used as the modulus.
	 * @returns The reduced rational remainder.
	 * @throws A native `RangeError` when `num` is zero.
	 */
	mod(num: Rational | string) {
		num = Rational.toRational(num);

		// Make their denominators common and get the mod of the common numerators
		const numerator = mod(this.numerator * num.denominator, num.numerator * this.denominator);
		const denominator = this.denominator * num.denominator;
		const result = new Rational(...simplifyRatio(numerator, denominator));
		result.asDecimal = this.asDecimal || num.asDecimal;
		return result;
	}
	/**
	 * Returns the additive inverse of this rational.
	 *
	 * @returns A new rational with the numerator sign reversed.
	 */
	neg(): Rational {
		const retval = this.copy();
		retval.numerator *= -1n;
		retval.updateValue();
		return retval;
	}

	/**
	 * Adds another rational or expression to this value.
	 *
	 * @remarks
	 * Rational/string input is added exactly and reduced. If either rational operand carries
	 * decimal presentation intent, the rational result carries it as well. Expression input is
	 * promoted to Nerdamer's symbolic arithmetic.
	 *
	 * @param num - Value to add.
	 * @returns A new `Rational` for rational/string input, or an `Expression` for expression input.
	 */
	plus(num: Expression): Expression;
	plus(num: Rational | string): Rational;
	plus(num: Rational | string | Expression) {
		let retval;
		if (Expression.isExpression(num)) {
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
	 * Raises this rational to a rational or symbolic power.
	 *
	 * @remarks
	 * Expression exponents use Nerdamer's general symbolic power logic. Integer rational
	 * exponents use exact `bigint` exponentiation, with negative exponents handled by first
	 * inverting the base. Non-integer rational exponents are evaluated through `decimal.js` and
	 * converted back to a `Rational`, so that overload is a real numerical approximation rather
	 * than symbolic radical or principal-complex evaluation. Decimal presentation from a numerical
	 * result is retained, while an exact integer result stays exact unless the base already carried
	 * decimal presentation intent.
	 *
	 * @param num - Exponent to apply.
	 * @returns A rational result for rational/string input, or an `Expression` for expression input.
	 * @throws {@link ZeroToZeroPowerError}
	 * Thrown for the indeterminate form `0^0`.
	 * @throws {@link DivisionByZeroError}
	 * Thrown when zero is raised to a negative integer power.
	 */
	pow(num: Expression): Expression;
	pow(num: Rational | string): Rational;
	pow(num: Rational | string | Expression) {
		let retval;
		if (Expression.isExpression(num)) {
			retval = Expression.create(this).pow(num);
		} else {
			num = Rational.toRational(num);

			if (this.isZero() && num.isZero()) {
				throw new ZeroToZeroPowerError(message('zeroToZeroPower'));
			}

			if (num.isInteger()) {
				let exponent = num.numerator;
				let baseNumerator = this.numerator;
				let baseDenominator = this.denominator;
				if (exponent < 0n) {
					const inverted = this.invert();
					baseNumerator = inverted.numerator;
					baseDenominator = inverted.denominator;
					exponent = abs(exponent);
				}
				const [numerator, denominator] = simplifyRatio(
					baseNumerator ** exponent,
					baseDenominator ** exponent
				);
				retval = new Rational(numerator, denominator);
				retval.asDecimal = this.asDecimal;
			} else {
				const s = this.toDecimal().toPower(num.toDecimal()).toString();
				retval = Rational.create(s);
				retval.asDecimal = this.asDecimal || retval.asDecimal;
			}
		}

		return retval;
	}
	/**
	 * Returns the sign carried by the numerator.
	 *
	 * @returns `-1` for a negative numerator, `0` for zero, or `1` for a positive numerator.
	 */
	sign(): number {
		return sign(this.numerator);
	}
	/**
	 * Formats this rational as fraction, integer, or decimal text.
	 *
	 * @remarks
	 * Decimal formatting is selected when {@link Rational.asDecimal} is set or when
	 * `options.decimal` is truthy. Non-integer decimal output uses `decimal.js`; an optional
	 * `options.precision` temporarily controls its significant-digit precision for this conversion.
	 * Integer decimal output includes a `.0` suffix. Without decimal formatting, non-integer
	 * fractions are emitted from the stored numerator and denominator, and integers as plain text.
	 *
	 * @param options - Formatting options. `decimal` forces decimal output and `precision` controls
	 * decimal conversion precision when applicable.
	 * @returns The formatted numeric text.
	 */
	text(options?: OptionsObject): string {
		let value: string;
		const thisIsInteger = this.isInteger();

		// Mark it as a decimal if it is such
		if (this.asDecimal || options?.decimal) {
			if (thisIsInteger) {
				value = `${this.numerator}.0`;
			} else {
				const previousPrecision = Decimal.precision;
				const precision = Number(options?.precision) || previousPrecision;
				if (precision === previousPrecision) {
					value = this.toDecimal().toString();
				} else {
					try {
						Decimal.set({ precision: precision });
						value = this.toDecimal().toString();
					} finally {
						Decimal.set({ precision: previousPrecision });
					}
				}

				// decimal.js trims insignificant zeros and can round a non-integer rational
				// to a plain integer string. Preserve the requested decimal presentation.
				if (!value.includes('.') && !/[eE]/.test(value)) {
					value += '.0';
				}
			}
		} else if (thisIsInteger) {
			value = `${this.numerator}`;
		} else {
			value = `${this.numerator}/${this.denominator}`;
		}

		return value;
	}

	/**
	 * Multiplies this rational by another rational or expression.
	 *
	 * @remarks
	 * Rational/string multiplication is exact and reduced. If either rational operand carries
	 * decimal presentation intent, the rational result carries it as well. Expression input is
	 * promoted to Nerdamer's symbolic arithmetic.
	 *
	 * @param num - Value to multiply by.
	 * @returns A new `Rational` for rational/string input, or an `Expression` for expression input.
	 */
	times(num: Expression): Expression;
	times(num: Rational | string): Rational;
	times(num: Rational | string | Expression) {
		let retval;
		if (Expression.isExpression(num)) {
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
	 * Converts the exact fraction to a `decimal.js` value at the current global Decimal precision.
	 *
	 * Integer rationals avoid an unnecessary Decimal division.
	 *
	 * @returns A new Decimal representing `numerator / denominator`.
	 */
	toDecimal() {
		let retval = new Decimal(String(this.numerator));
		if (this.denominator !== 1n) {
			retval = retval.div(String(this.denominator));
		}
		return retval;
	}

	/**
	 * Converts the exact fraction to decimal text using integer arithmetic.
	 *
	 * @remarks
	 * `precision` is the maximum number of digits generated after the decimal point. The
	 * conversion truncates at that position rather than rounding, then removes trailing zeros
	 * and a trailing decimal point. When omitted, the configured Rational precision is used.
	 *
	 * This method does not depend on {@link Rational.asDecimal}; it always requests decimal text.
	 *
	 * @param precision - Number of fractional digits to generate.
	 * @returns Truncated decimal text with unnecessary trailing zeros removed.
	 *
	 * @example
	 * ```ts
	 * Rational.create('1/3').toDecimalString(5); // "0.33333"
	 * Rational.create('7/4').toDecimalString(5); // "1.75"
	 * ```
	 */
	toDecimalString(precision?: number) {
		// return this.toDecimal().toString();
		const sgn = sign(this.numerator);
		const a = abs(this.numerator);
		const b = this.denominator;
		const whole = a / b;
		const rem = a % b;
		const decimalPlaces = precision ?? Rational.precision;
		const dec = ((10n ** BigInt(decimalPlaces) * rem) / b).toString();
		const retval = `${sgn < 0 ? '-' : ''}${whole}.${'0'.repeat(Math.max(0, decimalPlaces - dec.length))}${dec}`
			.replace(/0+$/g, '')
			.replace(/\.$/g, '');
		return retval;
	}

	/**
	 * Returns the same formatted representation as {@link Rational.text}.
	 *
	 * @param options - Formatting options forwarded to `text`.
	 * @returns The formatted rational string.
	 */
	toString(options?: OptionsObject) {
		return this.text(options);
	}

	/**
	 * Refreshes {@link Rational.value} from the current numerator and denominator.
	 *
	 * @remarks
	 * This is one of the few mutating methods on `Rational`; it updates this object and returns
	 * the same reference.
	 *
	 * @returns This rational instance.
	 */
	updateValue() {
		this.value =
			this.denominator === 1n
				? String(this.numerator)
				: `${this.numerator}/${this.denominator}`;
		return this;
	}

	/**
	 * Converts this rational to a native JavaScript number.
	 *
	 * @remarks
	 * This conversion is approximate and subject to the range and precision limits of
	 * JavaScript `number`. Numerator and denominator values that are both safe integers use
	 * native division directly; larger values retain the Decimal-backed fallback so finite ratios
	 * are not lost merely because an individual component exceeds the native numeric range.
	 * Use the rational representation or {@link Rational.toDecimal} when native-number limits
	 * are unacceptable.
	 *
	 * @returns The approximate native numeric value.
	 */
	valueOf() {
		const numerator = Number(this.numerator);
		const denominator = Number(this.denominator);
		let retval: number;

		if (Number.isSafeInteger(numerator) && Number.isSafeInteger(denominator)) {
			retval = numerator / denominator;
		} else {
			retval = Number(this.toDecimal());
		}

		return retval;
	}
}
