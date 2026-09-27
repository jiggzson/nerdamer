/**
 * @module modularGcd
 *
 * Greatest common divisors for sparse polynomials over a modular field.
 *
 * External references consulted for finite-field Euclidean GCD and recursive
 * evaluation/interpolation:
 * - SymPy finite-field polynomial GCD:
 *   https://github.com/sympy/sympy/blob/120ee85f346f6292b763cc195afda4f907260d4a/sympy/polys/galoistools.py
 * - SymPy sparse univariate modular GCD bridge:
 *   https://github.com/sympy/sympy/blob/120ee85f346f6292b763cc195afda4f907260d4a/sympy/polys/zippel.py
 */

import { message } from '../../core/errors';
import { isPrimeBig } from '../../core/functions/bigint/primeFactor';

import { ModularSparsePolynomial } from './ModularSparsePolynomial';

import type { SparsePolynomialTerm } from '../../core/classes/polynomial/SparsePolynomial';

// SymPy gives failed sparse interpolation data a small number of fresh attempts
// before abandoning the current modular image.
const MODULAR_GCD_RECONSTRUCTION_ATTEMPTS = 3n;

/**
 * Computes polynomial content in one selected coefficient variable.
 *
 * Terms are grouped by their complete exponent vector outside coefficientVariable.
 * The grouping key is used only for identity and is never parsed back into exponents.
 */
function modularContentInVariable(
	polynomial: ModularSparsePolynomial,
	coefficientVariable: number
): ModularSparsePolynomial {
	polynomial.degree(coefficientVariable);
	if (polynomial.isZero()) {
		return ModularSparsePolynomial.zero(polynomial.variableCount, polynomial.modulus);
	}

	const groups = new Map<string, SparsePolynomialTerm[]>();
	for (const term of polynomial.terms()) {
		const groupExponents = [...term.exponents];
		groupExponents[coefficientVariable] = 0n;
		const key = groupExponents.join(',');

		const coefficientExponents = new Array<bigint>(polynomial.variableCount).fill(0n);
		coefficientExponents[coefficientVariable] = term.exponents[coefficientVariable];
		const group = groups.get(key) ?? [];
		group.push({
			coefficient: term.coefficient,
			exponents: coefficientExponents,
		});
		groups.set(key, group);
	}

	let content = ModularSparsePolynomial.zero(polynomial.variableCount, polynomial.modulus);
	for (const terms of groups.values()) {
		const coefficient = new ModularSparsePolynomial(
			polynomial.variableCount,
			polynomial.modulus,
			terms
		);
		content = content.isZero()
			? coefficient.monic('lex')
			: modularGcdUnivariate(content, coefficient, coefficientVariable);
		if (content.isConstant()) {
			return ModularSparsePolynomial.constant(
				polynomial.variableCount,
				polynomial.modulus,
				1n
			);
		}
	}
	return content.monic('lex');
}

/** Removes polynomial content in one selected coefficient variable. */
function modularPrimitivePartInVariable(
	polynomial: ModularSparsePolynomial,
	coefficientVariable: number
): Readonly<{
	content: ModularSparsePolynomial;
	primitive: ModularSparsePolynomial;
}> {
	if (polynomial.isZero()) {
		return {
			content: ModularSparsePolynomial.zero(polynomial.variableCount, polynomial.modulus),
			primitive: polynomial,
		};
	}

	const content = modularContentInVariable(polynomial, coefficientVariable);
	const primitive = polynomial.divideExact(content);
	if (primitive === null) {
		throw new RangeError(message('polyModularContentExactDivision'));
	}
	return { content, primitive };
}

/**
 * Returns the coefficient polynomial at the lexicographically greatest monomial
 * in polynomialVariables. The result depends only on coefficientVariable.
 */
function modularLeadingCoefficientInVariables(
	polynomial: ModularSparsePolynomial,
	polynomialVariables: readonly number[],
	coefficientVariable: number
): ModularSparsePolynomial | null {
	polynomial.degree(coefficientVariable);
	for (const variableIndex of polynomialVariables) {
		polynomial.degree(variableIndex);
	}

	const terms = polynomial.terms();
	if (terms.length === 0) {
		return null;
	}

	let leading = terms[0];
	for (let termIndex = 1; termIndex < terms.length; termIndex++) {
		const term = terms[termIndex];
		for (const variableIndex of polynomialVariables) {
			if (term.exponents[variableIndex] === leading.exponents[variableIndex]) {
				continue;
			}
			if (term.exponents[variableIndex] > leading.exponents[variableIndex]) {
				leading = term;
			}
			break;
		}
	}

	const coefficientTerms: SparsePolynomialTerm[] = [];
	for (const term of terms) {
		let matches = true;
		for (const variableIndex of polynomialVariables) {
			if (term.exponents[variableIndex] !== leading.exponents[variableIndex]) {
				matches = false;
				break;
			}
		}
		if (!matches) {
			continue;
		}

		const exponents = new Array<bigint>(polynomial.variableCount).fill(0n);
		exponents[coefficientVariable] = term.exponents[coefficientVariable];
		coefficientTerms.push({
			coefficient: term.coefficient,
			exponents,
		});
	}

	return new ModularSparsePolynomial(
		polynomial.variableCount,
		polynomial.modulus,
		coefficientTerms
	);
}

/**
 * Returns the monomial support over selected variables.
 *
 * Keys are used only for set membership and are never decoded back into exponents.
 */
function monomialSupport(
	polynomial: ModularSparsePolynomial,
	variables: readonly number[]
): Set<string> {
	const support = new Set<string>();
	for (const term of polynomial.terms()) {
		support.add(variables.map(variableIndex => term.exponents[variableIndex]).join(','));
	}
	return support;
}

/**
 * Computes the monic GCD of two univariate polynomials over the same modular field.
 *
 * The polynomial ring may retain additional variable coordinates, but neither input
 * may depend on variables other than variableIndex.
 */
export function modularGcdUnivariate(
	left: ModularSparsePolynomial,
	right: ModularSparsePolynomial,
	variableIndex: number
): ModularSparsePolynomial {
	if (left.variableCount !== right.variableCount || left.modulus !== right.modulus) {
		throw new RangeError(message('polyRequires', { operation: 'Modular polynomial GCD', requirement: message('polyReqSamePolynomialRing') }));
	}

	left.degree(variableIndex);
	right.degree(variableIndex);

	for (const activeVariable of left.variables()) {
		if (activeVariable !== variableIndex) {
			throw new RangeError(message('polyRequires', { operation: 'Modular polynomial GCD inputs', requirement: message('polyReqUnivariatePolynomial') }));
		}
	}
	for (const activeVariable of right.variables()) {
		if (activeVariable !== variableIndex) {
			throw new RangeError(message('polyRequires', { operation: 'Modular polynomial GCD inputs', requirement: message('polyReqUnivariatePolynomial') }));
		}
	}

	let a = new ModularSparsePolynomial(left.variableCount, left.modulus, left.terms());
	let b = new ModularSparsePolynomial(right.variableCount, right.modulus, right.terms());

	while (!b.isZero()) {
		const division = a.divideWithRemainder(b, 'lex');
		a = b;
		b = division.remainder;
	}

	return a.isZero() ? a : a.monic('lex');
}

/**
 * Computes a modular GCD recursively by specializing the last selected variable.
 *
 * The caller supplies the variable order used by the recursive polynomial view.
 * Ring coordinates not listed in variables must be dormant.
 */
function modularGcdRecursive(
	left: ModularSparsePolynomial,
	right: ModularSparsePolynomial,
	variables: readonly number[]
): ModularSparsePolynomial | null {
	if (variables.length === 1) {
		return modularGcdUnivariate(left, right, variables[0]);
	}

	if (left.isZero()) {
		return right.isZero() ? right : right.monic('lex');
	}
	if (right.isZero()) {
		return left.monic('lex');
	}

	const interpolationVariable = variables[variables.length - 1];
	const polynomialVariables = variables.slice(0, -1);
	const leftParts = modularPrimitivePartInVariable(left, interpolationVariable);
	const rightParts = modularPrimitivePartInVariable(right, interpolationVariable);
	const contentGcd = modularGcdUnivariate(
		leftParts.content,
		rightParts.content,
		interpolationVariable
	);

	const leftLeading = modularLeadingCoefficientInVariables(
		leftParts.primitive,
		polynomialVariables,
		interpolationVariable
	);
	const rightLeading = modularLeadingCoefficientInVariables(
		rightParts.primitive,
		polynomialVariables,
		interpolationVariable
	);
	if (leftLeading === null || rightLeading === null) {
		return null;
	}
	const scaling = modularGcdUnivariate(leftLeading, rightLeading, interpolationVariable);

	const leftInterpolationDegree = leftParts.primitive.degree(interpolationVariable) ?? 0n;
	const rightInterpolationDegree = rightParts.primitive.degree(interpolationVariable) ?? 0n;
	const maxGcdDegree =
		leftInterpolationDegree < rightInterpolationDegree
			? leftInterpolationDegree
			: rightInterpolationDegree;

	const leftLeadingDegree = leftLeading.degree(interpolationVariable) ?? 0n;
	const rightLeadingDegree = rightLeading.degree(interpolationVariable) ?? 0n;
	const scalingDegree = scaling.degree(interpolationVariable) ?? 0n;
	const requiredSamples = maxGcdDegree + 2n;
	const badPointBound = leftLeadingDegree + rightLeadingDegree + scalingDegree;
	const availablePoints = left.modulus - 1n;
	const requestedPoints =
		requiredSamples * MODULAR_GCD_RECONSTRUCTION_ATTEMPTS + badPointBound;
	const scanLimit =
		availablePoints < requestedPoints ? availablePoints : requestedPoints;

	let expectedDegrees: readonly bigint[] | null = null;
	let expectedSupport: Set<string> | null = null;
	let acceptedSamples = 0n;
	let reconstructionAttempts = 0n;
	let samples: Array<
		Readonly<{ value: bigint; polynomial: ModularSparsePolynomial }>
	> = [];

	for (let value = 1n; value <= scanLimit; value++) {
		const leftLeadingValue = leftLeading.evaluateVariable(interpolationVariable, value);
		const rightLeadingValue = rightLeading.evaluateVariable(interpolationVariable, value);
		const scalingValue = scaling.evaluateVariable(interpolationVariable, value).constantTerm();
		if (
			leftLeadingValue.constantTerm() === 0n ||
			rightLeadingValue.constantTerm() === 0n ||
			scalingValue === 0n
		) {
			continue;
		}

		const evaluatedLeft = leftParts.primitive.evaluateVariable(interpolationVariable, value);
		const evaluatedRight = rightParts.primitive.evaluateVariable(interpolationVariable, value);
		if (evaluatedLeft.isZero() || evaluatedRight.isZero()) {
			continue;
		}

		const image = modularGcdRecursive(
			evaluatedLeft,
			evaluatedRight,
			polynomialVariables
		);
		if (image === null) {
			continue;
		}
		if (image.isConstant() && !image.isZero()) {
			return contentGcd;
		}

		const imageDegrees = polynomialVariables.map(
			variableIndex => image.degree(variableIndex) ?? 0n
		);
		if (expectedDegrees === null) {
			expectedDegrees = imageDegrees;
		} else {
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

			if (degreeComparison < 0) {
				expectedDegrees = imageDegrees;
				expectedSupport = null;
				samples = [];
				acceptedSamples = 0n;
				reconstructionAttempts = 0n;
			} else if (degreeComparison > 0) {
				continue;
			}
		}

		const imageSupport = monomialSupport(image, polynomialVariables);
		if (expectedSupport === null) {
			expectedSupport = imageSupport;
		} else {
			const imageContainsExpected = [...expectedSupport].every(key =>
				imageSupport.has(key)
			);
			const currentSupport = expectedSupport;
			const expectedContainsImage = [...imageSupport].every(key =>
				currentSupport.has(key)
			);

			if (imageContainsExpected && !expectedContainsImage) {
				expectedSupport = imageSupport;
				samples = [];
				acceptedSamples = 0n;
				reconstructionAttempts = 0n;
			} else if (!imageContainsExpected) {
				continue;
			}
		}

		samples.push({
			value,
			polynomial: image.scale(scalingValue),
		});
		acceptedSamples++;
		if (acceptedSamples < requiredSamples) {
			continue;
		}

		const interpolated = ModularSparsePolynomial.interpolateVariable(
			interpolationVariable,
			samples
		);
		const reconstructed = modularPrimitivePartInVariable(
			interpolated,
			interpolationVariable
		).primitive;
		const candidate = reconstructed.multiply(contentGcd).monic('lex');

		if (left.divideExact(candidate) !== null && right.divideExact(candidate) !== null) {
			return candidate;
		}

		reconstructionAttempts++;
		if (reconstructionAttempts >= MODULAR_GCD_RECONSTRUCTION_ATTEMPTS) {
			return null;
		}
		samples = [];
		acceptedSamples = 0n;
	}

	return null;
}

/**
 * Computes a multivariate GCD over a prime field using recursive
 * evaluation and interpolation.
 *
 * variables must follow polynomial-ring order and contain every active variable
 * in both inputs exactly once. Dormant ring coordinates may be omitted.
 */
export function modularGcdFiniteField(
	left: ModularSparsePolynomial,
	right: ModularSparsePolynomial,
	variables: readonly number[]
): ModularSparsePolynomial | null {
	if (left.variableCount !== right.variableCount || left.modulus !== right.modulus) {
		throw new RangeError(message('polyRequires', { operation: 'Modular polynomial GCD', requirement: message('polyReqSamePolynomialRing') }));
	}
	if (variables.length === 0) {
		throw new RangeError(message('polyRequires', { operation: 'Modular polynomial GCD', requirement: message('polyReqAtLeastOneVariable') }));
	}
	if (!isPrimeBig(left.modulus)) {
		throw new RangeError(message('polyRequires', { operation: 'Multivariate modular GCD', requirement: message('polyReqPrimeModulus') }));
	}

	const selected = new Set<number>();
	let previousVariable = -1;
	for (const variableIndex of variables) {
		left.degree(variableIndex);
		right.degree(variableIndex);
		if (selected.has(variableIndex)) {
			throw new RangeError(message('polyVariablesUnique', { operation: 'Modular polynomial GCD' }));
		}
		if (variableIndex <= previousVariable) {
			throw new RangeError(
				message('polyVariablesRingOrder', { operation: 'Modular polynomial GCD' })
			);
		}
		selected.add(variableIndex);
		previousVariable = variableIndex;
	}

	for (const activeVariable of [...left.variables(), ...right.variables()]) {
		if (!selected.has(activeVariable)) {
			throw new RangeError(
				message('polyInputsSelectedOnly', { operation: 'Modular polynomial GCD' })
			);
		}
	}

	return modularGcdRecursive(left, right, variables);
}

/**
 * Computes a bivariate GCD over a prime field by evaluation and interpolation.
 */
export function modularGcdBivariate(
	left: ModularSparsePolynomial,
	right: ModularSparsePolynomial,
	mainVariable: number,
	interpolationVariable: number
): ModularSparsePolynomial | null {
	if (mainVariable >= interpolationVariable) {
		throw new RangeError(
			message('polyVariablesRingOrder', { operation: 'Bivariate modular GCD' })
		);
	}
	return modularGcdFiniteField(left, right, [mainVariable, interpolationVariable]);
}

/**
 * Computes a trivariate GCD over a prime field by recursively specializing the
 * last selected variable and reconstructing from bivariate GCD images.
 *
 * The selected variables must follow their polynomial-ring order. Other ring
 * coordinates may remain dormant.
 */
export function modularGcdTrivariate(
	left: ModularSparsePolynomial,
	right: ModularSparsePolynomial,
	mainVariable: number,
	secondaryVariable: number,
	interpolationVariable: number
): ModularSparsePolynomial | null {
	if (
		mainVariable >= secondaryVariable ||
		secondaryVariable >= interpolationVariable
	) {
		throw new RangeError(
			message('polyVariablesRingOrder', { operation: 'Trivariate modular GCD' })
		);
	}
	return modularGcdFiniteField(left, right, [
		mainVariable,
		secondaryVariable,
		interpolationVariable,
	]);
}
