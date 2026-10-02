/**
 * @module sparsePolynomial
 *
 * Sparse polynomial storage with exact bigint coefficients and exponents.
 *
 * External references consulted for monomial representation and ordering:
 * - SymPy monomial operations:
 *   https://github.com/sympy/sympy/blob/120ee85f346f6292b763cc195afda4f907260d4a/sympy/polys/monomials.py
 * - SymPy lexicographic, graded lexicographic, and graded reverse lexicographic orders:
 *   https://github.com/sympy/sympy/blob/120ee85f346f6292b763cc195afda4f907260d4a/sympy/polys/orderings.py
 * - SymPy coefficient content and primitive-part operations:
 *   https://github.com/sympy/sympy/blob/120ee85f346f6292b763cc195afda4f907260d4a/sympy/polys/densetools.py
 * - SymPy sparse polynomial division:
 *   https://github.com/sympy/sympy/blob/120ee85f346f6292b763cc195afda4f907260d4a/sympy/polys/sparsetools.py
 */

import { message } from '../../errors';
import { GCD as bigintGCD } from '../../functions/bigint/bigint';

export type MonomialOrder = 'lex' | 'grlex' | 'grevlex';

export type SparsePolynomialTerm = Readonly<{
	coefficient: bigint;
	exponents: readonly bigint[];
}>;


/**
 * Sparse polynomial with bigint coefficients and bigint exponents.
 *
 * The variable count is part of the polynomial rather than inferred from its support.
 * Exponent vectors therefore have one exact entry for every variable, including zero
 * polynomials and constants. The internal map key is an encoding detail and is never
 * exposed or parsed by polynomial algorithms.
 */
export class SparsePolynomial {
	private readonly termsByKey: Map<string, SparsePolynomialTerm>;
	readonly variableCount: number;

	/**
	 * Creates a sparse polynomial in a ring with a fixed number of variables.
	 *
	 * Duplicate monomials are combined and zero coefficients are removed.
	 *
	 * @param variableCount - Number of variables in the polynomial ring.
	 * @param terms - Terms with exponent vectors of exactly variableCount entries.
	 */
	constructor(variableCount: number, terms: Iterable<SparsePolynomialTerm> = []) {
		if (!Number.isSafeInteger(variableCount) || variableCount < 0) {
			throw new RangeError(message('sparseVariableCountInvalid'));
		}

		this.variableCount = variableCount;
		this.termsByKey = new Map();

		for (const term of terms) {
			SparsePolynomial.assertExponents(variableCount, term.exponents);

			const exponents = term.exponents.map(exponent => exponent);
			const frozenExponents = Object.freeze(exponents);
			const key = SparsePolynomial.keyOf(frozenExponents);
			const coefficient = (this.termsByKey.get(key)?.coefficient ?? 0n) + term.coefficient;

			if (coefficient === 0n) {
				this.termsByKey.delete(key);
			} else {
				this.termsByKey.set(
					key,
					Object.freeze({ coefficient, exponents: frozenExponents })
				);
			}
		}
	}

	/**
	 * Verifies that an exponent vector belongs to a ring and contains only
	 * non-negative exact integer exponents.
	 */
	private static assertExponents(variableCount: number, exponents: readonly bigint[]): void {
		if (exponents.length !== variableCount) {
			throw new RangeError(
				message('sparseExponentVectorLengthMismatch')
			);
		}
		for (const exponent of exponents) {
			if (typeof exponent !== 'bigint' || exponent < 0n) {
				throw new RangeError(message('sparseExponentsNonNegativeBigInt'));
			}
		}
	}

	/**
	 * Compares exponent vectors using the three global monomial orders required by
	 * the polynomial algorithms.
	 */
	static compareMonomials(
		a: readonly bigint[],
		b: readonly bigint[],
		order: MonomialOrder
	): number {
		if (order === 'lex') {
			for (let i = 0; i < a.length; i++) {
				if (a[i] !== b[i]) {
					return a[i] > b[i] ? 1 : -1;
				}
			}
			return 0;
		}

		let degreeA = 0n;
		let degreeB = 0n;
		for (let i = 0; i < a.length; i++) {
			degreeA += a[i];
			degreeB += b[i];
		}
		if (degreeA !== degreeB) {
			return degreeA > degreeB ? 1 : -1;
		}

		if (order === 'grlex') {
			for (let i = 0; i < a.length; i++) {
				if (a[i] !== b[i]) {
					return a[i] > b[i] ? 1 : -1;
				}
			}
			return 0;
		}

		for (let i = a.length - 1; i >= 0; i--) {
			if (a[i] !== b[i]) {
				return a[i] < b[i] ? 1 : -1;
			}
		}
		return 0;
	}

	/** Creates a constant polynomial in a ring with variableCount variables. */
	static constant(variableCount: number, coefficient: bigint): SparsePolynomial {
		return new SparsePolynomial(variableCount, [
			{
				coefficient,
				exponents: new Array<bigint>(variableCount).fill(0n),
			},
		]);
	}

	/**
	 * Encodes an exponent vector only for map identity.
	 *
	 * The polynomial retains the exponent vector beside the key, so no decoder exists.
	 */
	private static keyOf(exponents: readonly bigint[]): string {
		return exponents.join(',');
	}

	/** Creates a one-term polynomial. */
	static monomial(
		variableCount: number,
		coefficient: bigint,
		exponents: readonly bigint[]
	): SparsePolynomial {
		return new SparsePolynomial(variableCount, [{ coefficient, exponents }]);
	}

	/** Creates the variable at variableIndex with coefficient one. */
	static variable(variableCount: number, variableIndex: number): SparsePolynomial {
		if (
			!Number.isSafeInteger(variableIndex) ||
			variableIndex < 0 ||
			variableIndex >= variableCount
		) {
			throw new RangeError(message('sparseVariableIndexOutOfRing'));
		}

		const exponents = new Array<bigint>(variableCount).fill(0n);
		exponents[variableIndex] = 1n;
		return new SparsePolynomial(variableCount, [{ coefficient: 1n, exponents }]);
	}

	/** Creates the zero polynomial in a ring with variableCount variables. */
	static zero(variableCount: number): SparsePolynomial {
		return new SparsePolynomial(variableCount);
	}

	/**
	 * Adds another polynomial in the same ring.
	 *
	 * Like monomials are combined exactly and zero coefficients are removed from
	 * the returned polynomial.
	 */
	add(other: SparsePolynomial): SparsePolynomial {
		if (this.variableCount !== other.variableCount) {
			throw new RangeError(message('sparseAdditionRingMismatch'));
		}

		const result = SparsePolynomial.zero(this.variableCount);
		for (const [key, term] of this.termsByKey) {
			result.termsByKey.set(key, term);
		}
		for (const [key, term] of other.termsByKey) {
			const existing = result.termsByKey.get(key);
			const coefficient = (existing?.coefficient ?? 0n) + term.coefficient;
			if (coefficient === 0n) {
				result.termsByKey.delete(key);
			} else if (existing === undefined || coefficient !== existing.coefficient) {
				result.termsByKey.set(
					key,
					Object.freeze({
						coefficient,
						exponents: existing?.exponents ?? term.exponents,
					})
				);
			}
		}
		return result;
	}

	/**
	 * Returns the coefficient of one monomial.
	 *
	 * @param exponents - Exact exponent vector for the requested monomial.
	 */
	coefficient(exponents: readonly bigint[]): bigint {
		SparsePolynomial.assertExponents(this.variableCount, exponents);
		return this.termsByKey.get(SparsePolynomial.keyOf(exponents))?.coefficient ?? 0n;
	}

	/**
	 * Returns the coefficient polynomial at one exact power of a selected variable.
	 *
	 * The selected variable remains in the ring with exponent zero so recursive
	 * algorithms can preserve the original coordinate layout.
	 */
	coefficientIn(variableIndex: number, exponent: bigint): SparsePolynomial {
		this.degree(variableIndex);
		if (exponent < 0n) {
			throw new RangeError(
				message('sparseCoefficientExponentNonNegative')
			);
		}

		const terms: SparsePolynomialTerm[] = [];
		for (const term of this.termsByKey.values()) {
			if (term.exponents[variableIndex] !== exponent) {
				continue;
			}

			const exponents = [...term.exponents];
			exponents[variableIndex] = 0n;
			terms.push({
				coefficient: term.coefficient,
				exponents,
			});
		}

		return new SparsePolynomial(this.variableCount, terms);
	}

	/** Returns the constant coefficient, or zero when the constant monomial is absent. */
	constantTerm(): bigint {
		const exponents = new Array<bigint>(this.variableCount).fill(0n);
		return this.termsByKey.get(SparsePolynomial.keyOf(exponents))?.coefficient ?? 0n;
	}

	/**
	 * Returns the positive greatest common divisor of all coefficients.
	 *
	 * The zero polynomial has coefficient content zero.
	 */
	content(): bigint {
		let content = 0n;
		for (const term of this.termsByKey.values()) {
			content = bigintGCD(content, term.coefficient);
			if (content === 1n) {
				break;
			}
		}
		return content;
	}

	/**
	 * Returns the degree in one variable.
	 *
	 * The zero polynomial has no degree and returns null.
	 */
	degree(variableIndex: number): bigint | null {
		if (
			!Number.isSafeInteger(variableIndex) ||
			variableIndex < 0 ||
			variableIndex >= this.variableCount
		) {
			throw new RangeError(message('sparseVariableIndexOutOfRing'));
		}
		if (this.isZero()) {
			return null;
		}

		let degree = 0n;
		for (const term of this.termsByKey.values()) {
			if (term.exponents[variableIndex] > degree) {
				degree = term.exponents[variableIndex];
			}
		}
		return degree;
	}

	/**
	 * Differentiates with respect to one ring variable.
	 *
	 * Coefficients and exponents stay in bigint arithmetic, including exponents
	 * above JavaScript's safe-integer range.
	 */
	derivative(variableIndex: number): SparsePolynomial {
		this.degree(variableIndex);

		const terms: SparsePolynomialTerm[] = [];
		for (const term of this.termsByKey.values()) {
			const exponent = term.exponents[variableIndex];
			if (exponent === 0n) {
				continue;
			}

			const exponents = term.exponents.map(value => value);
			exponents[variableIndex] = exponent - 1n;
			terms.push({
				coefficient: term.coefficient * exponent,
				exponents,
			});
		}

		return new SparsePolynomial(this.variableCount, terms);
	}

	/**
	 * Divides every term by one monomial when the quotient stays in the integer
	 * polynomial ring.
	 *
	 * Returns null when any coefficient or exponent is not exactly divisible.
	 */
	divideByMonomial(divisor: SparsePolynomialTerm): SparsePolynomial | null {
		if (divisor.coefficient === 0n) {
			throw new RangeError(message('sparseZeroMonomialDivision'));
		}
		SparsePolynomial.assertExponents(this.variableCount, divisor.exponents);

		const terms: SparsePolynomialTerm[] = [];
		for (const term of this.termsByKey.values()) {
			if (term.coefficient % divisor.coefficient !== 0n) {
				return null;
			}

			const exponents = new Array<bigint>(this.variableCount);
			for (let variableIndex = 0; variableIndex < this.variableCount; variableIndex++) {
				if (term.exponents[variableIndex] < divisor.exponents[variableIndex]) {
					return null;
				}
				exponents[variableIndex] =
					term.exponents[variableIndex] - divisor.exponents[variableIndex];
			}

			terms.push({
				coefficient: term.coefficient / divisor.coefficient,
				exponents,
			});
		}
		return new SparsePolynomial(this.variableCount, terms);
	}

	/**
	 * Divides all coefficients by an integer scalar.
	 *
	 * @throws RangeError When the scalar is zero or does not divide every coefficient.
	 */
	divideByScalarExact(divisor: bigint): SparsePolynomial {
		if (divisor === 0n) {
			throw new RangeError(message('sparseZeroScalarDivision'));
		}

		const result = SparsePolynomial.zero(this.variableCount);
		for (const [key, term] of this.termsByKey) {
			if (term.coefficient % divisor !== 0n) {
				throw new RangeError(
					message('sparseScalarDivisionExact')
				);
			}
			result.termsByKey.set(
				key,
				Object.freeze({
					coefficient: term.coefficient / divisor,
					exponents: term.exponents,
				})
			);
		}
		return result;
	}

	/**
	 * Divides by one polynomial using exact integer coefficient arithmetic.
	 *
	 * Returns null as soon as the current leading term is not exactly divisible
	 * by the divisor leading term. A successful result therefore has zero
	 * remainder in the selected monomial order.
	 */
	divideExact(
		divisor: SparsePolynomial,
		order: MonomialOrder = 'lex'
	): SparsePolynomial | null {
		if (this.variableCount !== divisor.variableCount) {
			throw new RangeError(message('sparseDivisionRingMismatch'));
		}

		const divisorLeading = divisor.leadingTerm(order);
		if (divisorLeading === null) {
			throw new RangeError(message('sparseZeroPolynomialDivision'));
		}

		let quotient = SparsePolynomial.zero(this.variableCount);
		let remainder = new SparsePolynomial(this.variableCount, this.termsByKey.values());

		while (!remainder.isZero()) {
			const leading = remainder.leadingTerm(order);
			if (leading === null) {
				break;
			}

			const leadingPolynomial = SparsePolynomial.monomial(
				this.variableCount,
				leading.coefficient,
				leading.exponents
			);
			const quotientTerm = leadingPolynomial.divideByMonomial(divisorLeading);
			if (quotientTerm === null) {
				return null;
			}

			quotient = quotient.add(quotientTerm);
			remainder = remainder.subtract(divisor.multiply(quotientTerm));
		}

		return quotient;
	}

	/** Returns whether both polynomials have the same ring and exact nonzero terms. */
	equals(other: SparsePolynomial): boolean {
		if (this.variableCount !== other.variableCount || this.termCount !== other.termCount) {
			return false;
		}

		for (const [key, term] of this.termsByKey) {
			if (other.termsByKey.get(key)?.coefficient !== term.coefficient) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Substitutes one variable with an exact integer while retaining the same ring.
	 *
	 * Terms that become like terms after substitution are combined in the result.
	 */
	evaluateVariable(variableIndex: number, value: bigint): SparsePolynomial {
		this.degree(variableIndex);

		const result = SparsePolynomial.zero(this.variableCount);
		for (const [key, term] of this.termsByKey) {
			const exponent = term.exponents[variableIndex];
			let coordinateStart = 0;
			for (let index = 0; index < variableIndex; index++) {
				coordinateStart = key.indexOf(',', coordinateStart) + 1;
			}
			const separator = key.indexOf(',', coordinateStart);
			const coordinateEnd = separator === -1 ? key.length : separator;
			const evaluatedKey =
				key.slice(0, coordinateStart) + '0' + key.slice(coordinateEnd);
			const existing = result.termsByKey.get(evaluatedKey);
			const contribution = term.coefficient * value ** exponent;
			const coefficient = (existing?.coefficient ?? 0n) + contribution;

			if (coefficient === 0n) {
				result.termsByKey.delete(evaluatedKey);
			} else if (existing !== undefined) {
				if (coefficient !== existing.coefficient) {
					result.termsByKey.set(
						evaluatedKey,
						Object.freeze({
							coefficient,
							exponents: existing.exponents,
						})
					);
				}
			} else if (contribution !== 0n) {
				if (exponent === 0n) {
					result.termsByKey.set(evaluatedKey, term);
				} else {
					const exponents = [...term.exponents];
					exponents[variableIndex] = 0n;
					result.termsByKey.set(
						evaluatedKey,
						Object.freeze({
							coefficient,
							exponents: Object.freeze(exponents),
						})
					);
				}
			}
		}

		return result;
	}

	/**
	 * Substitutes several variables with exact integers in one sparse traversal.
	 *
	 * The selected coordinates remain in the polynomial ring with exponent zero.
	 */
	evaluateVariables(
		variableIndices: readonly number[],
		values: readonly bigint[]
	): SparsePolynomial {
		if (variableIndices.length !== values.length) {
			throw new RangeError(
				message('wrongInput', {
					expected: `${variableIndices.length} evaluation values`,
					received: `${values.length}`,
				})
			);
		}
		if (variableIndices.length === 0) {
			return this;
		}

		const selected = new Set<number>();
		for (const variableIndex of variableIndices) {
			this.degree(variableIndex);
			if (selected.has(variableIndex)) {
				throw new RangeError(
					message('wrongInput', {
						expected: 'unique evaluation variables',
						received: 'duplicate variable index',
					})
				);
			}
			selected.add(variableIndex);
		}

		const result = SparsePolynomial.zero(this.variableCount);
		for (const [key, term] of this.termsByKey) {
			let coefficient = term.coefficient;
			let changesMonomial = false;

			for (let index = 0; index < variableIndices.length; index++) {
				const variableIndex = variableIndices[index];
				const exponent = term.exponents[variableIndex];
				if (exponent === 0n) {
					continue;
				}

				changesMonomial = true;
				const value = values[index];
				if (value === 0n) {
					coefficient = 0n;
					break;
				}
				if (value === 1n) {
					continue;
				}
				if (value === -1n) {
					if ((exponent & 1n) === 1n) {
						coefficient = -coefficient;
					}
					continue;
				}
				coefficient *= value ** exponent;
			}

			if (coefficient === 0n) {
				continue;
			}

			let evaluatedKey = key;
			let exponents = term.exponents;
			if (changesMonomial) {
				const projected = [...term.exponents];
				for (const variableIndex of variableIndices) {
					projected[variableIndex] = 0n;
				}
				exponents = Object.freeze(projected);
				evaluatedKey = SparsePolynomial.keyOf(exponents);
			}

			const existing = result.termsByKey.get(evaluatedKey);
			const combined = (existing?.coefficient ?? 0n) + coefficient;
			if (combined === 0n) {
				result.termsByKey.delete(evaluatedKey);
			} else if (existing === undefined) {
				result.termsByKey.set(
					evaluatedKey,
					changesMonomial || coefficient !== term.coefficient
						? Object.freeze({ coefficient, exponents })
						: term
				);
			} else if (combined !== existing.coefficient) {
				result.termsByKey.set(
					evaluatedKey,
					Object.freeze({
						coefficient: combined,
						exponents: existing.exponents,
					})
				);
			}
		}

		return result;
	}

	/** Returns whether the polynomial is zero or contains only a constant term. */
	isConstant(): boolean {
		if (this.isZero()) {
			return true;
		}
		if (this.termsByKey.size !== 1) {
			return false;
		}

		const term = this.termsByKey.values().next().value;
		return term !== undefined && term.exponents.every(exponent => exponent === 0n);
	}

	/** Returns whether the polynomial has no nonzero terms. */
	isZero(): boolean {
		return this.termsByKey.size === 0;
	}

	/**
	 * Returns the coefficient polynomial of the highest power of one variable.
	 *
	 * The selected coordinate remains present with exponent zero.
	 */
	leadingCoefficientIn(variableIndex: number): SparsePolynomial | null {
		const degree = this.degree(variableIndex);
		return degree === null ? null : this.coefficientIn(variableIndex, degree);
	}

	/**
	 * Returns the leading term under the requested monomial order.
	 *
	 * Variable priority follows exponent-vector index order.
	 */
	leadingTerm(order: MonomialOrder = 'lex'): SparsePolynomialTerm | null {
		if (order !== 'lex' && order !== 'grlex' && order !== 'grevlex') {
			throw new RangeError(message('sparseMonomialOrderUnsupported'));
		}

		let leading: SparsePolynomialTerm | null = null;
		for (const term of this.termsByKey.values()) {
			if (
				leading === null ||
				SparsePolynomial.compareMonomials(term.exponents, leading.exponents, order) > 0
			) {
				leading = term;
			}
		}
		return leading;
	}

	/**
	 * Applies an exact bigint transformation to every stored coefficient while
	 * preserving the existing monomial keys and exponent vectors.
	 */
	mapCoefficients(mapper: (coefficient: bigint) => bigint): SparsePolynomial {
		const result = SparsePolynomial.zero(this.variableCount);
		for (const [key, term] of this.termsByKey) {
			const coefficient = mapper(term.coefficient);
			if (coefficient === 0n) {
				continue;
			}
			result.termsByKey.set(
				key,
				coefficient === term.coefficient
					? term
					: Object.freeze({
							coefficient,
							exponents: term.exponents,
						})
			);
		}
		return result;
	}

	/** Returns the largest absolute coefficient, or zero for the zero polynomial. */
	maxAbsoluteCoefficient(): bigint {
		let maximum = 0n;
		for (const term of this.termsByKey.values()) {
			const absolute = term.coefficient < 0n ? -term.coefficient : term.coefficient;
			if (absolute > maximum) {
				maximum = absolute;
			}
		}
		return maximum;
	}

	/**
	 * Computes the difference of two monomial-scaled polynomials in one sparse
	 * traversal. This avoids constructing the monomial factors and multiplication
	 * results used by fraction-free S-polynomials.
	 */
	monomialScaleSubtract(
		leftScalar: bigint,
		leftMonomialExponents: readonly bigint[],
		other: SparsePolynomial,
		rightScalar: bigint,
		rightMonomialExponents: readonly bigint[]
	): SparsePolynomial {
		if (this.variableCount !== other.variableCount) {
			throw new RangeError(message('sparseSubtractionRingMismatch'));
		}
		SparsePolynomial.assertExponents(this.variableCount, leftMonomialExponents);
		SparsePolynomial.assertExponents(this.variableCount, rightMonomialExponents);

		const result = SparsePolynomial.zero(this.variableCount);
		const accumulate = (
			polynomial: SparsePolynomial,
			scalar: bigint,
			monomialExponents: readonly bigint[]
		): void => {
			if (scalar === 0n) {
				return;
			}
			for (const term of polynomial.termsByKey.values()) {
				const exponents = new Array<bigint>(this.variableCount);
				for (let variableIndex = 0; variableIndex < this.variableCount; variableIndex++) {
					exponents[variableIndex] =
						term.exponents[variableIndex] + monomialExponents[variableIndex];
				}
				const frozenExponents = Object.freeze(exponents);
				const key = SparsePolynomial.keyOf(frozenExponents);
				const existing = result.termsByKey.get(key);
				const coefficient = (existing?.coefficient ?? 0n) + term.coefficient * scalar;
				if (coefficient === 0n) {
					result.termsByKey.delete(key);
				} else {
					result.termsByKey.set(
						key,
						Object.freeze({ coefficient, exponents: existing?.exponents ?? frozenExponents })
					);
				}
			}
		};

		accumulate(this, leftScalar, leftMonomialExponents);
		accumulate(other, -rightScalar, rightMonomialExponents);
		return result;
	}

	/**
	 * Multiplies by another polynomial in the same ring.
	 *
	 * Monomial exponents are added as bigints. The constructor combines products
	 * that land on the same monomial and removes coefficients that cancel to zero.
	 */
	multiply(other: SparsePolynomial): SparsePolynomial {
		if (this.variableCount !== other.variableCount) {
			throw new RangeError(message('sparseMultiplicationRingMismatch'));
		}
		if (this.isZero() || other.isZero()) {
			return SparsePolynomial.zero(this.variableCount);
		}

		const terms: SparsePolynomialTerm[] = [];
		for (const left of this.termsByKey.values()) {
			for (const right of other.termsByKey.values()) {
				const exponents = new Array<bigint>(this.variableCount);
				for (let variableIndex = 0; variableIndex < this.variableCount; variableIndex++) {
					exponents[variableIndex] =
						left.exponents[variableIndex] + right.exponents[variableIndex];
				}
				terms.push({
					coefficient: left.coefficient * right.coefficient,
					exponents,
				});
			}
		}
		return new SparsePolynomial(this.variableCount, terms);
	}

	/**
	 * Returns the additive inverse of this polynomial.
	 */
	negate(): SparsePolynomial {
		return this.scale(-1n);
	}

	/**
	 * Makes the leading coefficient positive without changing coefficient content.
	 */
	normalizeLeadingSign(order: MonomialOrder = 'lex'): SparsePolynomial {
		const leading = this.leadingTerm(order);
		return leading !== null && leading.coefficient < 0n ? this.negate() : this;
	}

	/** Raises the polynomial to a non-negative exact integer power. */
	pow(exponent: bigint): SparsePolynomial {
		if (exponent < 0n) {
			throw new RangeError(message('sparseExponentNonNegative'));
		}
		let result = SparsePolynomial.constant(this.variableCount, 1n);
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

	/**
	 * Divides by positive coefficient content while preserving the polynomial sign.
	 */
	primitivePart(): SparsePolynomial {
		const content = this.content();
		return content === 0n || content === 1n ? this : this.divideByScalarExact(content);
	}

	/**
	 * Multiplies every coefficient by an exact integer scalar.
	 */
	scale(scalar: bigint): SparsePolynomial {
		if (scalar === 0n || this.isZero()) {
			return SparsePolynomial.zero(this.variableCount);
		}

		const result = SparsePolynomial.zero(this.variableCount);
		for (const [key, term] of this.termsByKey) {
			result.termsByKey.set(
				key,
				Object.freeze({
					coefficient: term.coefficient * scalar,
					exponents: term.exponents,
				})
			);
		}
		return result;
	}

	/**
	 * Computes a scaled subtraction where the right polynomial is also multiplied
	 * by one monomial. This avoids constructing the two scaled intermediate
	 * polynomials used by fraction-free reduction.
	 */
	scaleSubtractMonomial(
		leftScalar: bigint,
		other: SparsePolynomial,
		rightScalar: bigint,
		monomialExponents: readonly bigint[]
	): SparsePolynomial {
		if (this.variableCount !== other.variableCount) {
			throw new RangeError(message('sparseSubtractionRingMismatch'));
		}
		SparsePolynomial.assertExponents(this.variableCount, monomialExponents);

		const result = SparsePolynomial.zero(this.variableCount);
		if (leftScalar !== 0n) {
			for (const [key, term] of this.termsByKey) {
				const coefficient = term.coefficient * leftScalar;
				if (coefficient !== 0n) {
					result.termsByKey.set(
						key,
						Object.freeze({ coefficient, exponents: term.exponents })
					);
				}
			}
		}

		if (rightScalar === 0n) {
			return result;
		}

		for (const term of other.termsByKey.values()) {
			const exponents = new Array<bigint>(this.variableCount);
			for (let variableIndex = 0; variableIndex < this.variableCount; variableIndex++) {
				exponents[variableIndex] =
					term.exponents[variableIndex] + monomialExponents[variableIndex];
			}
			const frozenExponents = Object.freeze(exponents);
			const key = SparsePolynomial.keyOf(frozenExponents);
			const existing = result.termsByKey.get(key);
			const coefficient =
				(existing?.coefficient ?? 0n) - term.coefficient * rightScalar;

			if (coefficient === 0n) {
				result.termsByKey.delete(key);
			} else {
				result.termsByKey.set(
					key,
					Object.freeze({
						coefficient,
						exponents: existing?.exponents ?? frozenExponents,
					})
				);
			}
		}
		return result;
	}

	/**
	 * Subtracts another polynomial in the same ring.
	 */
	subtract(other: SparsePolynomial): SparsePolynomial {
		if (this.variableCount !== other.variableCount) {
			throw new RangeError(message('sparseSubtractionRingMismatch'));
		}

		const result = SparsePolynomial.zero(this.variableCount);
		for (const [key, term] of this.termsByKey) {
			result.termsByKey.set(key, term);
		}
		for (const [key, term] of other.termsByKey) {
			const existing = result.termsByKey.get(key);
			const coefficient = (existing?.coefficient ?? 0n) - term.coefficient;
			if (coefficient === 0n) {
				result.termsByKey.delete(key);
			} else if (existing === undefined || coefficient !== existing.coefficient) {
				result.termsByKey.set(
					key,
					Object.freeze({
						coefficient,
						exponents: existing?.exponents ?? term.exponents,
					})
				);
			}
		}
		return result;
	}

	/** Number of stored nonzero terms. */
	get termCount(): number {
		return this.termsByKey.size;
	}

	/**
	 * Returns a copy of the stored terms.
	 *
	 * The exponent arrays themselves are frozen so callers cannot alter polynomial storage.
	 */
	terms(): readonly SparsePolynomialTerm[] {
		return Array.from(this.termsByKey.values());
	}

	/**
	 * Returns the largest total degree among the stored monomials.
	 *
	 * The zero polynomial has no total degree and returns null.
	 */
	totalDegree(): bigint | null {
		if (this.isZero()) {
			return null;
		}

		let maxDegree = 0n;
		for (const term of this.termsByKey.values()) {
			let degree = 0n;
			for (const exponent of term.exponents) {
				degree += exponent;
			}
			if (degree > maxDegree) {
				maxDegree = degree;
			}
		}
		return maxDegree;
	}

	/** Returns the variable indices that occur with a positive exponent. */
	variables(): readonly number[] {
		const present = new Set<number>();
		for (const term of this.termsByKey.values()) {
			for (let variableIndex = 0; variableIndex < this.variableCount; variableIndex++) {
				if (term.exponents[variableIndex] !== 0n) {
					present.add(variableIndex);
				}
			}
		}
		return Array.from(present).sort((a, b) => a - b);
	}
}
