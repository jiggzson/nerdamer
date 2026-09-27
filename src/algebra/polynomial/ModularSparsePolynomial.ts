/**
 * @module modularSparsePolynomial
 *
 * Sparse polynomial arithmetic over integer residue classes.
 *
 * External references consulted for modular coefficient arithmetic and sparse
 * polynomial division:
 * - SymPy finite-field polynomial arithmetic:
 *   https://github.com/sympy/sympy/blob/120ee85f346f6292b763cc195afda4f907260d4a/sympy/polys/galoistools.py
 * - SymPy sparse polynomial substitution, evaluation, and term division:
 *   https://github.com/sympy/sympy/blob/120ee85f346f6292b763cc195afda4f907260d4a/sympy/polys/sparsetools.py
 * - SymPy variable-relative leading coefficient operations used by modular GCD:
 *   https://github.com/sympy/sympy/blob/120ee85f346f6292b763cc195afda4f907260d4a/sympy/polys/zippel.py
 */

import {
	SparsePolynomial,
	type MonomialOrder,
	type SparsePolynomialTerm,
} from '../../core/classes/polynomial/SparsePolynomial';
import { message } from '../../core/errors';
import { invMod, mod, powMod } from '../../core/functions/bigint/bigint';

/**
 * Sparse polynomial whose coefficients are stored as canonical residues modulo
 * a positive integer greater than one.
 *
 * The modulus is part of the polynomial ring. Prime moduli provide finite-field
 * arithmetic; composite moduli remain valid for addition and multiplication but
 * may not provide multiplicative inverses required by monic normalization or
 * polynomial division.
 */
export class ModularSparsePolynomial {
	private readonly polynomial: SparsePolynomial;
	readonly modulus: bigint;
	readonly variableCount: number;

	constructor(
		variableCount: number,
		modulus: bigint,
		terms: Iterable<SparsePolynomialTerm> | SparsePolynomial = []
	) {
		if (modulus <= 1n) {
			throw new RangeError(message('polyModulusGreaterThanOne'));
		}

		let combined: SparsePolynomial;
		if (terms instanceof SparsePolynomial) {
			if (terms.variableCount !== variableCount) {
				throw new RangeError(
					message('polyVariableCountMatch')
				);
			}
			combined = terms;
		} else {
			combined = new SparsePolynomial(variableCount, terms);
		}

		this.modulus = modulus;
		this.polynomial = combined.mapCoefficients(coefficient =>
			mod(coefficient, modulus)
		);
		this.variableCount = this.polynomial.variableCount;
	}

	/** Creates a constant polynomial in the selected residue ring. */
	static constant(
		variableCount: number,
		modulus: bigint,
		coefficient: bigint
	): ModularSparsePolynomial {
		return new ModularSparsePolynomial(variableCount, modulus, [
			{
				coefficient,
				exponents: new Array<bigint>(variableCount).fill(0n),
			},
		]);
	}

	/**
	 * Reconstructs a polynomial in one variable from specialized images.
	 *
	 * Each sample polynomial must be independent of the interpolated variable.
	 * Evaluation values are compared as residues in the shared coefficient ring.
	 */
	static interpolateVariable(
		variableIndex: number,
		samples: ReadonlyArray<
			Readonly<{ value: bigint; polynomial: ModularSparsePolynomial }>
		>
	): ModularSparsePolynomial {
		if (samples.length === 0) {
			throw new RangeError(message('polyRequires', { operation: 'ModularSparsePolynomial interpolation', requirement: message('polyReqAtLeastOneSample') }));
		}

		const first = samples[0].polynomial;
		first.degree(variableIndex);

		const x = ModularSparsePolynomial.variable(
			first.variableCount,
			first.modulus,
			variableIndex
		);
		let result = ModularSparsePolynomial.zero(first.variableCount, first.modulus);

		for (let i = 0; i < samples.length; i++) {
			const sample = samples[i];
			first.assertCompatible(sample.polynomial);
			const sampleDegree = sample.polynomial.degree(variableIndex);
			if (sampleDegree !== null && sampleDegree !== 0n) {
				throw new RangeError(
					message('polyInterpolationCannotDepend')
				);
			}

			const value = mod(sample.value, first.modulus);
			let denominator = 1n;
			let basis = ModularSparsePolynomial.constant(
				first.variableCount,
				first.modulus,
				1n
			);

			for (let j = 0; j < samples.length; j++) {
				if (i === j) {
					continue;
				}

				const otherValue = mod(samples[j].value, first.modulus);
				basis = basis.multiply(
					x.subtract(
						ModularSparsePolynomial.constant(
							first.variableCount,
							first.modulus,
							otherValue
						)
					)
				);
				denominator = mod(
					denominator * mod(value - otherValue, first.modulus),
					first.modulus
				);
			}

			const inverse = invMod(denominator, first.modulus);
			if (inverse < 0n) {
				throw new RangeError(
					message('polyInterpolationInvertibleDifferences')
				);
			}

			result = result.add(sample.polynomial.multiply(basis.scale(inverse)));
		}

		return result;
	}

	/** Creates a one-term polynomial in the selected residue ring. */
	static monomial(
		variableCount: number,
		modulus: bigint,
		coefficient: bigint,
		exponents: readonly bigint[]
	): ModularSparsePolynomial {
		return new ModularSparsePolynomial(variableCount, modulus, [{ coefficient, exponents }]);
	}

	/** Creates one polynomial variable with coefficient one. */
	static variable(
		variableCount: number,
		modulus: bigint,
		variableIndex: number
	): ModularSparsePolynomial {
		const variable = SparsePolynomial.variable(variableCount, variableIndex);
		return new ModularSparsePolynomial(variableCount, modulus, variable);
	}

	/** Creates the zero polynomial in the selected residue ring. */
	static zero(variableCount: number, modulus: bigint): ModularSparsePolynomial {
		return new ModularSparsePolynomial(variableCount, modulus);
	}

	/** Verifies that another polynomial belongs to the same residue ring. */
	private assertCompatible(other: ModularSparsePolynomial): void {
		if (this.variableCount !== other.variableCount || this.modulus !== other.modulus) {
			throw new RangeError(message('polyRequires', { operation: 'ModularSparsePolynomial operations', requirement: message('polyReqSamePolynomialRing') }));
		}
	}

	/** Adds another polynomial in the same residue ring. */
	add(other: ModularSparsePolynomial): ModularSparsePolynomial {
		this.assertCompatible(other);
		const sum = this.polynomial.add(other.polynomial);
		return new ModularSparsePolynomial(this.variableCount, this.modulus, sum);
	}

	/** Returns the canonical residue coefficient of one monomial. */
	coefficient(exponents: readonly bigint[]): bigint {
		return this.polynomial.coefficient(exponents);
	}

	/**
	 * Returns the coefficient polynomial at one exact power of a selected variable.
	 *
	 * The selected variable remains in the ring with exponent zero.
	 */
	coefficientIn(variableIndex: number, exponent: bigint): ModularSparsePolynomial {
		this.polynomial.degree(variableIndex);
		if (exponent < 0n) {
			throw new RangeError(
				message('polyCoefficientExponentNonnegative')
			);
		}

		const terms: SparsePolynomialTerm[] = [];
		for (const term of this.polynomial.terms()) {
			if (term.exponents[variableIndex] === exponent) {
				const exponents = [...term.exponents];
				exponents[variableIndex] = 0n;
				terms.push({
					coefficient: term.coefficient,
					exponents,
				});
			}
		}
		return new ModularSparsePolynomial(this.variableCount, this.modulus, terms);
	}

	/** Returns the canonical residue of the constant coefficient. */
	constantTerm(): bigint {
		return this.polynomial.constantTerm();
	}

	/** Returns the degree in one variable, or null for the zero polynomial. */
	degree(variableIndex: number): bigint | null {
		return this.polynomial.degree(variableIndex);
	}

	/**
	 * Differentiates with respect to one ring variable in the residue ring.
	 */
	derivative(variableIndex: number): ModularSparsePolynomial {
		this.polynomial.degree(variableIndex);

		const terms: SparsePolynomialTerm[] = [];
		for (const term of this.polynomial.terms()) {
			const exponent = term.exponents[variableIndex];
			if (exponent === 0n) {
				continue;
			}

			const exponents = [...term.exponents];
			exponents[variableIndex] = exponent - 1n;
			terms.push({
				coefficient: mod(term.coefficient * exponent, this.modulus),
				exponents,
			});
		}

		return new ModularSparsePolynomial(this.variableCount, this.modulus, terms);
	}

	/**
	 * Divides by one polynomial when the remainder is zero.
	 */
	divideExact(
		divisor: ModularSparsePolynomial,
		order: MonomialOrder = 'lex'
	): ModularSparsePolynomial | null {
		const division = this.divideWithRemainder(divisor, order);
		return division.remainder.isZero() ? division.quotient : null;
	}

	/**
	 * Divides by one polynomial and returns quotient and remainder.
	 *
	 * The leading coefficient of the divisor must be invertible modulo the ring
	 * modulus.
	 */
	divideWithRemainder(
		divisor: ModularSparsePolynomial,
		order: MonomialOrder = 'lex'
	): Readonly<{
		quotient: ModularSparsePolynomial;
		remainder: ModularSparsePolynomial;
	}> {
		this.assertCompatible(divisor);

		const divisorLeading = divisor.leadingTerm(order);
		if (divisorLeading === null) {
			throw new RangeError(message('polyCannotDivideZero'));
		}

		const divisorLeadingInverse = invMod(divisorLeading.coefficient, this.modulus);
		if (divisorLeadingInverse < 0n) {
			throw new RangeError(
				message('polyDivisorLeadingCoefficientInvertible')
			);
		}

		let quotient = ModularSparsePolynomial.zero(this.variableCount, this.modulus);
		let remainder = ModularSparsePolynomial.zero(this.variableCount, this.modulus);
		let working = new ModularSparsePolynomial(
			this.variableCount,
			this.modulus,
			this.polynomial
		);

		while (!working.isZero()) {
			const leading = working.leadingTerm(order);
			if (leading === null) {
				break;
			}

			let divides = true;
			const exponents = new Array<bigint>(this.variableCount);
			for (let variableIndex = 0; variableIndex < this.variableCount; variableIndex++) {
				if (leading.exponents[variableIndex] < divisorLeading.exponents[variableIndex]) {
					divides = false;
					break;
				}
				exponents[variableIndex] =
					leading.exponents[variableIndex] - divisorLeading.exponents[variableIndex];
			}

			if (divides) {
				const coefficient = mod(
					leading.coefficient * divisorLeadingInverse,
					this.modulus
				);
				const quotientTerm = ModularSparsePolynomial.monomial(
					this.variableCount,
					this.modulus,
					coefficient,
					exponents
				);

				quotient = quotient.add(quotientTerm);
				working = working.subtract(divisor.multiply(quotientTerm));
			} else {
				const remainderTerm = ModularSparsePolynomial.monomial(
					this.variableCount,
					this.modulus,
					leading.coefficient,
					leading.exponents
				);
				remainder = remainder.add(remainderTerm);
				working = working.subtract(remainderTerm);
			}
		}

		return { quotient, remainder };
	}

	/** Returns whether two polynomials have the same residue ring and exact terms. */
	equals(other: ModularSparsePolynomial): boolean {
		return this.modulus === other.modulus && this.polynomial.equals(other.polynomial);
	}

	/**
	 * Substitutes one variable with a residue while keeping the same ring dimension.
	 *
	 * Terms that become like terms after substitution are combined by the sparse
	 * polynomial constructor.
	 */
	evaluateVariable(variableIndex: number, value: bigint): ModularSparsePolynomial {
		this.polynomial.degree(variableIndex);

		const residue = mod(value, this.modulus);
		const terms: SparsePolynomialTerm[] = [];
		for (const term of this.polynomial.terms()) {
			const exponent = term.exponents[variableIndex];
			const exponents = [...term.exponents];
			exponents[variableIndex] = 0n;
			terms.push({
				coefficient: mod(
					term.coefficient * powMod(residue, exponent, this.modulus),
					this.modulus
				),
				exponents,
			});
		}

		return new ModularSparsePolynomial(this.variableCount, this.modulus, terms);
	}

	/** Returns whether the polynomial is zero or contains only a constant term. */
	isConstant(): boolean {
		return this.polynomial.isConstant();
	}

	/** Returns whether the polynomial has no nonzero terms. */
	isZero(): boolean {
		return this.polynomial.isZero();
	}

	/**
	 * Returns the coefficient polynomial of the highest power of one variable.
	 *
	 * The selected variable remains in the ring with exponent zero so recursive
	 * algorithms can preserve a stable variable layout.
	 */
	leadingCoefficientIn(variableIndex: number): ModularSparsePolynomial | null {
		const degree = this.degree(variableIndex);
		return degree === null ? null : this.coefficientIn(variableIndex, degree);
	}

	/** Returns the leading term under the requested monomial order. */
	leadingTerm(order: MonomialOrder = 'lex'): SparsePolynomialTerm | null {
		return this.polynomial.leadingTerm(order);
	}

	/**
	 * Scales the polynomial so its leading coefficient is one.
	 *
	 * Zero remains zero. A nonzero leading coefficient that has no inverse modulo
	 * the modulus is rejected.
	 */
	monic(order: MonomialOrder = 'lex'): ModularSparsePolynomial {
		const leading = this.leadingTerm(order);
		if (leading === null || leading.coefficient === 1n) {
			return this;
		}

		const inverse = invMod(leading.coefficient, this.modulus);
		if (inverse < 0n) {
			throw new RangeError(
				message('polyLeadingCoefficientInvertible')
			);
		}
		return this.scale(inverse);
	}

	/** Multiplies by another polynomial in the same residue ring. */
	multiply(other: ModularSparsePolynomial): ModularSparsePolynomial {
		this.assertCompatible(other);
		const product = this.polynomial.multiply(other.polynomial);
		return new ModularSparsePolynomial(this.variableCount, this.modulus, product);
	}

	/** Returns the additive inverse in the residue ring. */
	negate(): ModularSparsePolynomial {
		const negated = this.polynomial.negate();
		return new ModularSparsePolynomial(this.variableCount, this.modulus, negated);
	}

	/** Raises the polynomial to a non-negative exact integer power. */
	pow(exponent: bigint): ModularSparsePolynomial {
		if (exponent < 0n) {
			throw new RangeError(message('polyExponentNonnegative'));
		}
		let result = ModularSparsePolynomial.constant(this.variableCount, this.modulus, 1n);
		let power = exponent;
		if (power === 0n) {
			return result;
		}
		if ((power & 1n) === 1n) {
			result = result.multiply(this);
		}
		power >>= 1n;
		if (power === 0n) {
			return result;
		}
		let factor = this.multiply(this);
		while (power > 0n) {
			if ((power & 1n) === 1n) {
				result = result.multiply(factor);
			}
			power >>= 1n;
			if (power > 0n) {
				factor = factor.multiply(factor);
			}
		}
		return result;
	}

	/** Multiplies every coefficient by one residue-ring scalar. */
	scale(scalar: bigint): ModularSparsePolynomial {
		const scaled = this.polynomial.scale(mod(scalar, this.modulus));
		return new ModularSparsePolynomial(this.variableCount, this.modulus, scaled);
	}

	/** Subtracts another polynomial in the same residue ring. */
	subtract(other: ModularSparsePolynomial): ModularSparsePolynomial {
		this.assertCompatible(other);
		const difference = this.polynomial.subtract(other.polynomial);
		return new ModularSparsePolynomial(this.variableCount, this.modulus, difference);
	}

	/** Number of stored nonzero terms. */
	get termCount(): number {
		return this.polynomial.termCount;
	}

	/** Returns the stored canonical residue terms. */
	terms(): readonly SparsePolynomialTerm[] {
		return this.polynomial.terms();
	}

	/** Converts canonical residues to centered integer representatives. */
	toSymmetricIntegerPolynomial(): SparsePolynomial {
		const half = this.modulus / 2n;
		return new SparsePolynomial(
			this.variableCount,
			this.terms().map(term => ({
				coefficient:
					term.coefficient > half
						? term.coefficient - this.modulus
						: term.coefficient,
				exponents: term.exponents,
			}))
		);
	}

	/** Returns the largest total degree, or null for the zero polynomial. */
	totalDegree(): bigint | null {
		return this.polynomial.totalDegree();
	}

	/** Returns the variable indices that occur with a positive exponent. */
	variables(): readonly number[] {
		return this.polynomial.variables();
	}
}
