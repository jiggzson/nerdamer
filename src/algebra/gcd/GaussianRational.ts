import { Rational } from '../../core/classes/rational/Rational';
import { DivisionByZeroError, message } from '../../core/errors';

/**
 * Exact coefficient a + b*i in the quadratic field Q(i), with a,b in Q.
 *
 * @remarks
 * The relation i^2 = -1 is applied directly during multiplication. Keeping
 * two Rational components avoids treating i as an independent variable or
 * rounding coefficients through numerical complex arithmetic.
 *
 * See Geddes, Czapor & Labahn, *Algorithms for Computer Algebra* (1992),
 * chapters 3–4, for exact algebraic representations and polynomial arithmetic.
 */
export class GaussianRational {
	constructor(
		readonly real: Rational,
		readonly imaginary: Rational
	) {}

	static fromReal(value: Rational): GaussianRational {
		return new GaussianRational(value, Rational.create(0n));
	}

	static one(): GaussianRational {
		return new GaussianRational(Rational.create(1n), Rational.create(0n));
	}

	static zero(): GaussianRational {
		return new GaussianRational(Rational.create(0n), Rational.create(0n));
	}

	/**
	 * Divides by a nonzero Gaussian rational using its conjugate.
	 *
	 * (a+bi)/(c+di) = ((ac+bd)+(bc-ad)i)/(c²+d²).
	 * The denominator is a nonzero rational when c+di is nonzero.
	 */
	div(other: GaussianRational): GaussianRational {
		if (other.isZero()) {
			throw new DivisionByZeroError(message('divisionByZero'));
		}
		const denominator = other.real.times(other.real).plus(other.imaginary.times(other.imaginary));
		return new GaussianRational(
			this.real.times(other.real).plus(this.imaginary.times(other.imaginary)).div(denominator),
			this.imaginary.times(other.real).minus(this.real.times(other.imaginary)).div(denominator)
		);
	}

	isZero(): boolean {
		return this.real.isZero() && this.imaginary.isZero();
	}

	minus(other: GaussianRational): GaussianRational {
		return new GaussianRational(this.real.minus(other.real), this.imaginary.minus(other.imaginary));
	}

	plus(other: GaussianRational): GaussianRational {
		return new GaussianRational(this.real.plus(other.real), this.imaginary.plus(other.imaginary));
	}

	times(other: GaussianRational): GaussianRational {
		return new GaussianRational(
			this.real.times(other.real).minus(this.imaginary.times(other.imaginary)),
			this.real.times(other.imaginary).plus(this.imaginary.times(other.real))
		);
	}
}
