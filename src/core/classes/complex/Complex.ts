import Decimal from 'decimal.js';

import { DivisionByZeroError, message } from '../../errors';

/**
 * Represents a numerical complex value backed by `decimal.js` components.
 *
 * @remarks
 * This class is a numerical helper used by algorithms such as polynomial root solving. It is
 * distinct from Nerdamer's symbolic complex expressions: it does not parse expressions, carry
 * symbolic structure, or implement branch-sensitive transcendental functions. Component
 * arithmetic follows the active global `decimal.js` precision.
 *
 * Arithmetic methods return new `Complex` objects rather than modifying the receiver. The
 * {@link Complex.re} and {@link Complex.im} fields are public, however, so callers can reassign
 * components directly.
 */
export class Complex {
	/** Imaginary component. */
	im: Decimal;
	/** Real component. */
	re: Decimal;

	/**
	 * Creates a numerical complex value.
	 *
	 * @remarks
	 * Existing Decimal components are retained by reference; numeric inputs are converted to
	 * new Decimal values. `decimal.js` arithmetic itself returns new Decimal objects.
	 *
	 * @param re - Real component.
	 * @param im - Imaginary component; defaults to zero.
	 */
	constructor(re: Decimal | number, im: Decimal | number = 0) {
		this.re = typeof re === 'number' ? new Decimal(re) : re;
		this.im = typeof im === 'number' ? new Decimal(im) : im;
	}

	/**
	 * Creates a numerical complex value from Decimal or native-number components.
	 *
	 * @param re - Real component.
	 * @param im - Imaginary component; defaults to zero.
	 * @returns A new `Complex` value.
	 */
	static create(re: Decimal | number, im: Decimal | number = 0): Complex {
		return new Complex(
			re instanceof Decimal ? re : new Decimal(re),
			im instanceof Decimal ? im : new Decimal(im)
		);
	}

	/**
	 * Computes the modulus `sqrt(re^2 + im^2)`.
	 *
	 * @returns A new Decimal containing the nonnegative magnitude.
	 */
	abs(): Decimal {
		return this.re.mul(this.re).plus(this.im.mul(this.im)).sqrt();
	}

	/**
	 * Adds another complex value component-wise.
	 *
	 * @param other - Complex value to add.
	 * @returns A new complex sum.
	 */
	add(other: Complex): Complex {
		return new Complex(this.re.plus(other.re), this.im.plus(other.im));
	}

	/**
	 * Returns the complex conjugate `re - im*i`.
	 *
	 * @returns A new complex value with the imaginary component negated.
	 */
	conjugate(): Complex {
		return new Complex(this.re, this.im.neg());
	}

	/**
	 * Divides this complex value by another using the standard rectangular formula.
	 *
	 * @remarks
	 * Division rejects an exactly zero squared modulus. No numerical tolerance is applied at
	 * this arithmetic layer; iterative algorithms are responsible for choosing any tolerance
	 * appropriate to their convergence logic.
	 *
	 * @param other - Complex divisor.
	 * @returns A new complex quotient.
	 * @throws {@link core!DivisionByZeroError}
	 * Thrown when both components of `other` are exactly zero at the current Decimal value.
	 */
	div(other: Complex): Complex {
		const denom = other.re.mul(other.re).plus(other.im.mul(other.im));

		// Exact division by zero is undefined. Numerical tolerances belong to
		// the algorithms using Complex rather than this arithmetic primitive.
		if (denom.isZero()) {
			throw new DivisionByZeroError(message('divisionByZero'));
		}

		return new Complex(
			this.re.mul(other.re).plus(this.im.mul(other.im)).div(denom),
			this.im.mul(other.re).minus(this.re.mul(other.im)).div(denom)
		);
	}

	/**
	 * Multiplies two rectangular complex values.
	 *
	 * @param other - Complex factor.
	 * @returns A new complex product.
	 */
	mul(other: Complex): Complex {
		return new Complex(
			this.re.mul(other.re).minus(this.im.mul(other.im)),
			this.re.mul(other.im).plus(this.im.mul(other.re))
		);
	}

	/**
	 * Returns the additive inverse of this complex value.
	 *
	 * @returns A new complex value with both components negated.
	 */
	neg(): Complex {
		return new Complex(this.re.neg(), this.im.neg());
	}

	/**
	 * Multiplies both complex components by a real scalar.
	 *
	 * @param s - Decimal or native-number scale factor.
	 * @returns A new scaled complex value.
	 */
	scale(s: Decimal | number): Complex {
		const scalar = s instanceof Decimal ? s : new Decimal(s);
		return new Complex(this.re.mul(scalar), this.im.mul(scalar));
	}

	/**
	 * Subtracts another complex value component-wise.
	 *
	 * @param other - Complex value to subtract.
	 * @returns A new complex difference.
	 */
	sub(other: Complex): Complex {
		return new Complex(this.re.minus(other.re), this.im.minus(other.im));
	}
}
