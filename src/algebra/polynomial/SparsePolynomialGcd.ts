/**
 * @module sparsePolynomialGcd
 *
 * Integer GCD reconstruction for the exact sparse polynomial representation.
 *
 * External references consulted:
 * - SymPy multivariate Chinese remainder reconstruction and modular GCD loop:
 *   https://github.com/sympy/sympy/blob/120ee85f346f6292b763cc195afda4f907260d4a/sympy/polys/zippel.py
 * - SymPy Chinese Remainder Theorem implementation:
 *   https://github.com/sympy/sympy/blob/120ee85f346f6292b763cc195afda4f907260d4a/sympy/ntheory/modular.py
 */

import { SparsePolynomial } from '../../core/classes/polynomial/SparsePolynomial';
import { message } from '../../core/errors';
import { GCD as bigintGCD, invMod, mod } from '../../core/functions/bigint/bigint';
import { nextPrimeBig } from '../../core/functions/bigint/primeFactor';

import { modularGcdFiniteField } from './modularGcd';
import { ModularSparsePolynomial } from './ModularSparsePolynomial';

import type { SparsePolynomialTerm } from '../../core/classes/polynomial/SparsePolynomial';

// SymPy's integer Zippel loop starts near 10^9 because larger fields sharply reduce
// failed evaluations during sparse interpolation.
const INITIAL_GCD_PRIME = 1_000_000_007n;

/** Maps a residue to the symmetric representative for one positive modulus. */
function symmetricResidue(value: bigint, modulus: bigint): bigint {
	const residue = mod(value, modulus);
	return residue * 2n > modulus ? residue - modulus : residue;
}

/** Looks up a term coefficient without interpreting the monomial key. */
function termMap(polynomial: SparsePolynomial): Map<string, SparsePolynomialTerm> {
	const terms = new Map<string, SparsePolynomialTerm>();
	for (const term of polynomial.terms()) {
		terms.set(term.exponents.join(','), term);
	}
	return terms;
}

/**
 * Combines two sparse polynomial congruences with coprime positive moduli.
 *
 * Missing monomials are treated as zero residues. Exponent vectors are retained
 * from the source term and never reconstructed from the map key.
 */
export function combinePolynomialCongruences(
	left: SparsePolynomial,
	leftModulus: bigint,
	right: SparsePolynomial,
	rightModulus: bigint
): Readonly<{ polynomial: SparsePolynomial; modulus: bigint }> {
	if (left.variableCount !== right.variableCount) {
		throw new RangeError(message('polyRequires', { operation: 'Polynomial CRT', requirement: message('polyReqSamePolynomialRing') }));
	}
	if (leftModulus <= 0n || rightModulus <= 0n) {
		throw new RangeError(message('polyRequires', { operation: 'Polynomial CRT', requirement: message('polyReqPositiveModuli') }));
	}
	if (bigintGCD(leftModulus, rightModulus) !== 1n) {
		throw new RangeError(message('polyRequires', { operation: 'Polynomial CRT', requirement: message('polyReqCoprimeModuli') }));
	}

	const inverse = invMod(leftModulus, rightModulus);
	if (inverse < 0n) {
		throw new RangeError(message('polyCrtModuliInvertible'));
	}

	const leftTerms = termMap(left);
	const rightTerms = termMap(right);
	const keys = new Set<string>([...leftTerms.keys(), ...rightTerms.keys()]);
	const modulus = leftModulus * rightModulus;
	const terms: SparsePolynomialTerm[] = [];

	for (const key of keys) {
		const leftTerm = leftTerms.get(key);
		const rightTerm = rightTerms.get(key);
		const leftCoefficient = leftTerm?.coefficient ?? 0n;
		const rightCoefficient = rightTerm?.coefficient ?? 0n;
		const correction = mod(
			(rightCoefficient - leftCoefficient) * inverse,
			rightModulus
		);
		const coefficient = symmetricResidue(
			leftCoefficient + leftModulus * correction,
			modulus
		);
		if (coefficient !== 0n) {
			terms.push({
				coefficient,
				exponents: leftTerm?.exponents ?? rightTerm?.exponents ?? [],
			});
		}
	}

	return {
		polynomial: new SparsePolynomial(left.variableCount, terms),
		modulus,
	};
}

/**
 * Returns the integer leading coefficient after making one variable primary.
 *
 * Ties follow the remaining ring coordinates in their existing order, matching a
 * lexicographic view with variableIndex moved to the front.
 */
function leadingCoefficientForVariable(
	polynomial: SparsePolynomial,
	variableIndex: number
): bigint {
	polynomial.degree(variableIndex);
	const terms = polynomial.terms();
	if (terms.length === 0) {
		return 0n;
	}

	let leading = terms[0];
	for (let termIndex = 1; termIndex < terms.length; termIndex++) {
		const term = terms[termIndex];
		if (term.exponents[variableIndex] !== leading.exponents[variableIndex]) {
			if (term.exponents[variableIndex] > leading.exponents[variableIndex]) {
				leading = term;
			}
			continue;
		}

		for (let index = 0; index < polynomial.variableCount; index++) {
			if (index === variableIndex) {
				continue;
			}
			if (term.exponents[index] === leading.exponents[index]) {
				continue;
			}
			if (term.exponents[index] > leading.exponents[index]) {
				leading = term;
			}
			break;
		}
	}

	return leading.coefficient;
}

/** Converts an integer sparse polynomial to canonical residues modulo prime. */
function reduceModulo(polynomial: SparsePolynomial, prime: bigint): ModularSparsePolynomial {
	return new ModularSparsePolynomial(polynomial.variableCount, prime, polynomial.terms());
}

/** Returns the selected-variable degree vector used to compare modular images. */
function degreeVector(
	polynomial: ModularSparsePolynomial,
	variables: readonly number[]
): readonly bigint[] {
	return variables.map(variableIndex => polynomial.degree(variableIndex) ?? 0n);
}

/**
 * Computes the integer GCD of two sparse polynomials by modular images and CRT.
 *
 * variables must follow polynomial-ring order and contain every active variable.
 * The returned GCD has positive leading coefficient under lexicographic order.
 */
export function sparsePolynomialGcd(
	left: SparsePolynomial,
	right: SparsePolynomial,
	variables: readonly number[]
): SparsePolynomial {
	if (left.variableCount !== right.variableCount) {
		throw new RangeError(message('polyRequires', { operation: 'Sparse polynomial GCD', requirement: message('polyReqSamePolynomialRing') }));
	}
	if (variables.length === 0) {
		throw new RangeError(message('polyRequires', { operation: 'Sparse polynomial GCD', requirement: message('polyReqAtLeastOneVariable') }));
	}

	const selected = new Set<number>();
	let previousVariable = -1;
	for (const variableIndex of variables) {
		left.degree(variableIndex);
		right.degree(variableIndex);
		if (selected.has(variableIndex)) {
			throw new RangeError(message('polyVariablesUnique', { operation: 'Sparse polynomial GCD' }));
		}
		if (variableIndex <= previousVariable) {
			throw new RangeError(
				message('polyVariablesRingOrder', { operation: 'Sparse polynomial GCD' })
			);
		}
		selected.add(variableIndex);
		previousVariable = variableIndex;
	}

	for (const activeVariable of [...left.variables(), ...right.variables()]) {
		if (!selected.has(activeVariable)) {
			throw new RangeError(
				message('polyInputsSelectedOnly', { operation: 'Sparse polynomial GCD' })
			);
		}
	}

	if (left.isZero()) {
		return right.isZero() ? right : right.normalizeLeadingSign('lex');
	}
	if (right.isZero()) {
		return left.normalizeLeadingSign('lex');
	}

	const leftContent = left.content();
	const rightContent = right.content();
	const commonContent = bigintGCD(leftContent, rightContent);
	const primitiveLeft = left.primitivePart().normalizeLeadingSign('lex');
	const primitiveRight = right.primitivePart().normalizeLeadingSign('lex');
	const leftLeading = primitiveLeft.leadingTerm('lex');
	const rightLeading = primitiveRight.leadingTerm('lex');
	if (leftLeading === null || rightLeading === null) {
		return SparsePolynomial.zero(left.variableCount);
	}

	if (primitiveLeft.isConstant() || primitiveRight.isConstant()) {
		return SparsePolynomial.constant(left.variableCount, commonContent);
	}
	if (primitiveLeft.equals(primitiveRight)) {
		return primitiveLeft.scale(commonContent);
	}

	if (primitiveLeft.divideExact(primitiveRight) !== null) {
		return primitiveRight.scale(commonContent);
	}
	if (primitiveRight.divideExact(primitiveLeft) !== null) {
		return primitiveLeft.scale(commonContent);
	}

	const leadingGcd = bigintGCD(leftLeading.coefficient, rightLeading.coefficient);
	const badPrimeFactors = variables.map(variableIndex =>
		bigintGCD(
			leadingCoefficientForVariable(primitiveLeft, variableIndex),
			leadingCoefficientForVariable(primitiveRight, variableIndex)
		)
	);
	let prime = nextPrimeBig(INITIAL_GCD_PRIME);
	let accumulated: SparsePolynomial | null = null;
	let accumulatedModulus = 1n;
	let expectedDegrees: readonly bigint[] | null = null;

	while (true) {
		while (badPrimeFactors.some(factor => factor % prime === 0n)) {
			prime = nextPrimeBig(prime + 1n);
		}

		const modularLeft = reduceModulo(primitiveLeft, prime);
		const modularRight = reduceModulo(primitiveRight, prime);
		const modularGcd = modularGcdFiniteField(modularLeft, modularRight, variables);
		if (modularGcd === null) {
			prime = nextPrimeBig(prime + 1n);
			continue;
		}
		if (modularGcd.isConstant() && !modularGcd.isZero()) {
			return SparsePolynomial.constant(left.variableCount, commonContent);
		}

		const imageDegrees = degreeVector(modularGcd, variables);
		if (expectedDegrees !== null) {
			let degreeComparison = 0;
			for (let index = 0; index < imageDegrees.length; index++) {
				if (imageDegrees[index] < expectedDegrees[index]) {
					degreeComparison = -1;
					break;
				}
				if (imageDegrees[index] > expectedDegrees[index]) {
					degreeComparison = 1;
					break;
				}
			}

			if (degreeComparison > 0) {
				prime = nextPrimeBig(prime + 1n);
				continue;
			}
			if (degreeComparison < 0) {
				expectedDegrees = imageDegrees;
				accumulated = null;
				accumulatedModulus = 1n;
			}
		} else {
			expectedDegrees = imageDegrees;
		}

		const scaledImage = modularGcd.scale(leadingGcd);
		const liftedImage = scaledImage.toSymmetricIntegerPolynomial();

		let reconstructed: SparsePolynomial;
		let reconstructedModulus: bigint;
		if (accumulated === null) {
			reconstructed = liftedImage;
			reconstructedModulus = prime;
		} else {
			const combined = combinePolynomialCongruences(
				accumulated,
				accumulatedModulus,
				liftedImage,
				prime
			);
			reconstructed = combined.polynomial;
			reconstructedModulus = combined.modulus;
		}

		const stable = accumulated !== null && reconstructed.equals(accumulated);
		accumulated = reconstructed;
		accumulatedModulus = reconstructedModulus;

		if (stable) {
			const primitiveCandidate = reconstructed
				.primitivePart()
				.normalizeLeadingSign('lex');
			const candidate = primitiveCandidate.scale(commonContent);
			if (left.divideExact(candidate) !== null && right.divideExact(candidate) !== null) {
				return candidate;
			}
		}

		prime = nextPrimeBig(prime + 1n);
	}
}
