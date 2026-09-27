/**
 * @module sparsePolynomialFactor
 *
 * Exact polynomial factorization foundations over the integers.
 *
 * External references consulted for the mathematical algorithms:
 * - SymPy square-free decomposition (Yun's algorithm):
 *   https://github.com/sympy/sympy/blob/120ee85f346f6292b763cc195afda4f907260d4a/sympy/polys/sqfreetools.py
 * - SymPy integer factorization pipeline (primitive/square-free decomposition before
 *   Zassenhaus factor splitting):
 *   https://github.com/sympy/sympy/blob/120ee85f346f6292b763cc195afda4f907260d4a/sympy/polys/factortools.py
 */

import { SparsePolynomial } from '../../core/classes/polynomial/SparsePolynomial';
import { message } from '../../core/errors';
import { ceilIntegerSquareRoot } from '../../core/functions/bigint/bigint';
import { nextPrimeBig } from '../../core/functions/bigint/primeFactor';

import { modularGcdUnivariate } from './modularGcd';
import { ModularSparsePolynomial } from './ModularSparsePolynomial';
import {
	factorSquareFreeUnivariateFiniteField,
	henselLiftUnivariateFactors,
} from './ModularSparsePolynomialFactor';
import { sparsePolynomialGcd } from './SparsePolynomialGcd';

import type { SparsePolynomialTerm } from '../../core/classes/polynomial/SparsePolynomial';

export type SparsePolynomialFactor = Readonly<{
	factor: SparsePolynomial;
	multiplicity: bigint;
}>;

export type SparsePolynomialSquareFreeFactorization = Readonly<{
	content: bigint;
	factors: readonly SparsePolynomialFactor[];
}>;

const INITIAL_FACTOR_PRIME = 3n;
const MAX_FACTOR_PRIME_PROBES = 4;

function assertUnivariate(polynomial: SparsePolynomial, variableIndex: number): void {
	polynomial.degree(variableIndex);

	for (const term of polynomial.terms()) {
		for (let index = 0; index < polynomial.variableCount; index++) {
			if (index !== variableIndex && term.exponents[index] !== 0n) {
				throw new RangeError(
					message('polyRequires', { operation: 'Square-free univariate factorization', requirement: message('polyReqAllOtherVariablesDormant') })
				);
			}
		}
	}
}

function findGoodFactorPrime(
	polynomial: SparsePolynomial,
	variableIndex: number
): Readonly<{
	prime: bigint;
	modularPolynomial: ModularSparsePolynomial;
	modularFactors: readonly ModularSparsePolynomial[];
}> {
	const leading = polynomial.leadingTerm('lex');
	if (leading === null) {
		throw new RangeError(message('polyIntegerFactorPrimeZero'));
	}

	const derivative = polynomial.derivative(variableIndex);
	let prime = nextPrimeBig(INITIAL_FACTOR_PRIME);
	let probes = 0;
	let selected:
		| Readonly<{
			prime: bigint;
			modularPolynomial: ModularSparsePolynomial;
			modularFactors: readonly ModularSparsePolynomial[];
		}>
		| undefined;

	while (true) {
		if (leading.coefficient % prime !== 0n) {
			const modularPolynomial = new ModularSparsePolynomial(
				polynomial.variableCount,
				prime,
				polynomial.terms()
			);
			const modularDerivative = new ModularSparsePolynomial(
				polynomial.variableCount,
				prime,
				derivative.terms()
			);
			const modularGcd = modularGcdUnivariate(
				modularPolynomial,
				modularDerivative,
				variableIndex
			);

			if (modularGcd.isConstant()) {
				const modularFactors = factorSquareFreeUnivariateFiniteField(
					modularPolynomial,
					variableIndex
				);
				const candidate = { prime, modularPolynomial, modularFactors };
				probes++;

				// An irreducible image modulo a degree-preserving prime proves the
				// primitive integer polynomial irreducible, so no lifting is needed.
				if (modularFactors.length === 1) {
					return candidate;
				}

				if (
					selected === undefined ||
					modularFactors.length < selected.modularFactors.length
				) {
					selected = candidate;
				}

				if (probes >= MAX_FACTOR_PRIME_PROBES) {
					return selected;
				}
			}
		}

		prime = nextPrimeBig(prime + 1n);
	}
}

function assertFactorVariables(
	polynomial: SparsePolynomial,
	variables: readonly number[]
): void {
	if (variables.length === 0) {
		throw new RangeError(message('polyRequires', { operation: 'Sparse polynomial factorization', requirement: message('polyReqAtLeastOneVariable') }));
	}

	const selected = new Set<number>();
	let previous = -1;
	for (const variableIndex of variables) {
		polynomial.degree(variableIndex);
		if (selected.has(variableIndex)) {
			throw new RangeError(message('polyVariablesUnique', { operation: 'Sparse polynomial factorization' }));
		}
		if (variableIndex <= previous) {
			throw new RangeError(
				message('polyVariablesRingOrder', { operation: 'Sparse polynomial factorization' })
			);
		}
		selected.add(variableIndex);
		previous = variableIndex;
	}

	for (const activeVariable of polynomial.variables()) {
		if (!selected.has(activeVariable)) {
			throw new RangeError(
				message('polyVariablesIncludeActive', { operation: 'Sparse polynomial factorization' })
			);
		}
	}
}

export function contentInVariable(
	polynomial: SparsePolynomial,
	variableIndex: number,
	coefficientVariables: readonly number[]
): SparsePolynomial {
	const grouped = new Map<bigint, SparsePolynomialTerm[]>();
	for (const term of polynomial.terms()) {
		const exponent = term.exponents[variableIndex];
		const exponents = [...term.exponents];
		exponents[variableIndex] = 0n;
		const group = grouped.get(exponent) ?? [];
		group.push({ coefficient: term.coefficient, exponents });
		grouped.set(exponent, group);
	}

	let content: SparsePolynomial | null = null;
	for (const terms of grouped.values()) {
		const coefficient = new SparsePolynomial(polynomial.variableCount, terms)
			.primitivePart()
			.normalizeLeadingSign('lex');
		if (content === null) {
			content = coefficient;
		} else if (coefficient.divideExact(content) !== null) {
			continue;
		} else if (content.divideExact(coefficient) !== null) {
			content = coefficient;
		} else {
			content = sparsePolynomialGcd(
				content,
				coefficient,
				coefficientVariables
			);
		}
		if (content.isConstant()) {
			return SparsePolynomial.constant(polynomial.variableCount, 1n);
		}
	}

	return content ?? SparsePolynomial.zero(polynomial.variableCount);
}

function mergeSquareFreeFactor(
	factors: Map<bigint, SparsePolynomial>,
	factor: SparsePolynomial,
	multiplicity: bigint
): void {
	if (factor.isConstant()) {
		return;
	}

	const normalized = factor.primitivePart().normalizeLeadingSign('lex');
	const current = factors.get(multiplicity);
	factors.set(
		multiplicity,
		current === undefined ? normalized : current.multiply(normalized)
	);
}

function squareFreeFactorizationRecursive(
	polynomial: SparsePolynomial,
	variables: readonly number[]
): SparsePolynomialSquareFreeFactorization {
	if (variables.length === 1) {
		return squareFreeFactorizationUnivariate(polynomial, variables[0]);
	}

	let content = polynomial.content();
	let primitive = polynomial.primitivePart();
	const leading = primitive.leadingTerm('lex');
	if (leading !== null && leading.coefficient < 0n) {
		primitive = primitive.negate();
		content = -content;
	}

	if (primitive.isConstant()) {
		return { content, factors: [] };
	}

	const mainVariable = variables[0];
	const coefficientVariables = variables.slice(1);
	const variableContent = contentInVariable(
		primitive,
		mainVariable,
		coefficientVariables
	);
	const variablePrimitive = divideExactOrThrow(primitive, variableContent);
	const factorsByMultiplicity = new Map<bigint, SparsePolynomial>();

	const mainDegree = variablePrimitive.degree(mainVariable);
	if (mainDegree !== null && mainDegree > 0n) {
		const derivative = variablePrimitive.derivative(mainVariable);
		let gcd = sparsePolynomialGcd(variablePrimitive, derivative, variables);
		let p = divideExactOrThrow(variablePrimitive, gcd);
		let q = divideExactOrThrow(derivative, gcd);
		let multiplicity = 1n;

		while (true) {
			const difference = q.subtract(p.derivative(mainVariable));
			if (difference.isZero()) {
				mergeSquareFreeFactor(factorsByMultiplicity, p, multiplicity);
				break;
			}

			gcd = sparsePolynomialGcd(p, difference, variables);
			p = divideExactOrThrow(p, gcd);
			q = divideExactOrThrow(difference, gcd);
			mergeSquareFreeFactor(factorsByMultiplicity, gcd, multiplicity);
			multiplicity++;
		}
	}

	const contentFactorization = squareFreeFactorizationRecursive(
		variableContent,
		coefficientVariables
	);
	content *= contentFactorization.content;
	for (const entry of contentFactorization.factors) {
		mergeSquareFreeFactor(
			factorsByMultiplicity,
			entry.factor,
			entry.multiplicity
		);
	}

	const factors = [...factorsByMultiplicity.entries()]
		.sort(([leftMultiplicity], [rightMultiplicity]) =>
			leftMultiplicity < rightMultiplicity
				? -1
				: leftMultiplicity > rightMultiplicity
					? 1
					: 0
		)
		.map(([multiplicity, squareFreeFactor]) => ({
			factor: squareFreeFactor,
			multiplicity,
		}));

	return { content, factors };
}

function divideExactOrThrow(
	dividend: SparsePolynomial,
	divisor: SparsePolynomial
): SparsePolynomial {
	const quotient = dividend.divideExact(divisor);
	if (quotient === null) {
		throw new Error(message('polySquareFreeNonExactDivision'));
	}
	return quotient;
}

function zassenhausCoefficientBound(
	polynomial: SparsePolynomial,
	variableIndex: number
): bigint {
	const degree = polynomial.degree(variableIndex);
	if (degree === null || degree === 0n) {
		return polynomial.maxAbsoluteCoefficient();
	}

	const leading = polynomial.leadingTerm('lex');
	if (leading === null) {
		return 0n;
	}
	const leadingAbsolute =
		leading.coefficient < 0n ? -leading.coefficient : leading.coefficient;
	const maxCoefficient = polynomial.maxAbsoluteCoefficient();
	const root = ceilIntegerSquareRoot(degree + 1n);

	return root * (1n << degree) * maxCoefficient * leadingAbsolute;
}

function modularProduct(
	factors: readonly ModularSparsePolynomial[],
	indices: readonly number[],
	variableCount: number,
	modulus: bigint
): ModularSparsePolynomial {
	let product = ModularSparsePolynomial.constant(variableCount, modulus, 1n);
	for (const index of indices) {
		product = product.multiply(factors[index]);
	}
	return product;
}

function combinations(
	values: readonly number[],
	size: number
): number[][] {
	const result: number[][] = [];
	const selected: number[] = [];

	function choose(start: number): void {
		if (selected.length === size) {
			result.push([...selected]);
			return;
		}

		const remainingNeeded = size - selected.length;
		for (
			let index = start;
			index <= values.length - remainingNeeded;
			index++
		) {
			selected.push(values[index]);
			choose(index + 1);
			selected.pop();
		}
	}

	choose(0);
	return result;
}

/**
 * Recombines Hensel-lifted modular factors into exact integer factors.
 *
 * The modulus must exceed twice the Zassenhaus coefficient bound so symmetric
 * representatives determine integer factor coefficients uniquely. Candidate subsets
 * are accepted only after exact division in Z[x].
 */
export function recombineLiftedUnivariateFactors(
	polynomial: SparsePolynomial,
	liftedFactors: readonly ModularSparsePolynomial[],
	variableIndex: number
): readonly SparsePolynomial[] {
	assertUnivariate(polynomial, variableIndex);
	if (polynomial.isZero()) {
		throw new RangeError(message('polyCannotFactorZeroPolynomial', { operation: 'Zassenhaus recombination' }));
	}
	if (polynomial.content() !== 1n) {
		throw new RangeError(
			message('polyRequires', { operation: 'Zassenhaus recombination', requirement: message('polyReqPrimitiveIntegerPolynomial') })
		);
	}
	const leading = polynomial.leadingTerm('lex');
	if (leading === null || leading.coefficient <= 0n) {
		throw new RangeError(
			message('polyRequires', { operation: 'Zassenhaus recombination', requirement: message('polyReqPositiveLeadingCoefficient') })
		);
	}
	if (liftedFactors.length === 0) {
		throw new RangeError(message('polyRequires', { operation: 'Zassenhaus recombination', requirement: message('polyReqLiftedModularFactors') }));
	}

	const modulus = liftedFactors[0].modulus;
	for (const factor of liftedFactors) {
		if (
			factor.variableCount !== polynomial.variableCount ||
			factor.modulus !== modulus
		) {
			throw new RangeError(
				message('polyRequires', { operation: 'Zassenhaus recombination', requirement: message('polyReqLiftedFactorsSameRing') })
			);
		}
		for (const activeVariable of factor.variables()) {
			if (activeVariable !== variableIndex) {
				throw new RangeError(
					message('polyRequires', { operation: 'Zassenhaus recombination', requirement: message('polyReqUnivariateLiftedFactors') })
				);
			}
		}
		if (!factor.equals(factor.monic())) {
			throw new RangeError(
				message('polyRequires', { operation: 'Zassenhaus recombination', requirement: message('polyReqMonicLiftedFactors') })
			);
		}
	}

	const coefficientBound = zassenhausCoefficientBound(polynomial, variableIndex);
	if (modulus <= 2n * coefficientBound) {
		throw new RangeError(
			message('polyRequires', { operation: 'Zassenhaus recombination', requirement: message('polyReqLargerHenselModulus') })
		);
	}

	const modularInput = new ModularSparsePolynomial(
		polynomial.variableCount,
		modulus,
		polynomial.terms()
	);
	const allIndices = liftedFactors.map((_factor, index) => index);
	const modularReconstruction = modularProduct(
		liftedFactors,
		allIndices,
		polynomial.variableCount,
		modulus
	).scale(leading.coefficient);
	if (!modularReconstruction.equals(modularInput)) {
		throw new RangeError(
			message('polyZassenhausFactorsReconstructModuloLift')
		);
	}

	const factors: SparsePolynomial[] = [];
	let remainingPolynomial = polynomial;
	let remainingIndices = [...allIndices];
	let subsetSize = 1;

	while (2 * subsetSize <= remainingIndices.length) {
		let accepted = false;
		for (const subset of combinations(remainingIndices, subsetSize)) {
			const remainingLeading = remainingPolynomial.leadingTerm('lex');
			if (remainingLeading === null) {
				throw new Error(message('polyZassenhausLostRemaining'));
			}

			const modularCandidate = modularProduct(
				liftedFactors,
				subset,
				polynomial.variableCount,
				modulus
			).scale(remainingLeading.coefficient);
			let candidate = modularCandidate.toSymmetricIntegerPolynomial().primitivePart();
			candidate = candidate.normalizeLeadingSign('lex');
			if (candidate.isConstant()) {
				continue;
			}

			const quotient = remainingPolynomial.divideExact(candidate);
			if (quotient === null) {
				continue;
			}

			factors.push(candidate);
			remainingPolynomial = quotient.primitivePart().normalizeLeadingSign('lex');
			const selected = new Set(subset);
			remainingIndices = remainingIndices.filter(index => !selected.has(index));
			subsetSize = 1;
			accepted = true;
			break;
		}

		if (!accepted) {
			subsetSize++;
		}
	}

	if (!remainingPolynomial.isConstant()) {
		factors.push(remainingPolynomial);
	}

	let reconstruction = SparsePolynomial.constant(polynomial.variableCount, 1n);
	for (const factor of factors) {
		reconstruction = reconstruction.multiply(factor);
	}
	if (!reconstruction.equals(polynomial)) {
		throw new Error(
			message('polyZassenhausReconstructionFailed')
		);
	}

	return factors;
}

/**
 * Factors a primitive square-free univariate polynomial into irreducibles over Z.
 *
 * A prime preserving degree and square-freeness is selected deterministically.
 * Berlekamp factorization supplies the modular factors; reducible modular images are
 * lifted until the coefficient reconstruction bound is exceeded and then recombined
 * by exact integer division.
 */
export function factorSquareFreeUnivariateInteger(
	polynomial: SparsePolynomial,
	variableIndex: number
): readonly SparsePolynomial[] {
	assertUnivariate(polynomial, variableIndex);
	if (polynomial.isZero()) {
		throw new RangeError(message('polyCannotFactorZeroPolynomial', { operation: 'Integer factorization' }));
	}
	if (polynomial.content() !== 1n) {
		throw new RangeError(
			message('polyRequires', { operation: 'Integer square-free factorization', requirement: message('polyReqPrimitivePolynomial') })
		);
	}

	const leading = polynomial.leadingTerm('lex');
	if (leading === null) {
		throw new Error(message('polyIntegerFactorLostLeading'));
	}
	const input =
		leading.coefficient < 0n ? polynomial.negate() : polynomial;
	if (input.isConstant()) {
		return [];
	}
	const degree = input.degree(variableIndex);
	if (degree === 1n) {
		return [input];
	}

	const selected = findGoodFactorPrime(input, variableIndex);
	if (selected.modularFactors.length === 1) {
		return [input];
	}

	const coefficientBound = zassenhausCoefficientBound(input, variableIndex);
	let targetModulus = selected.prime;
	while (targetModulus <= 2n * coefficientBound) {
		targetModulus *= targetModulus;
	}

	const lifted = henselLiftUnivariateFactors(
		input,
		selected.prime,
		selected.modularFactors,
		variableIndex,
		targetModulus
	);
	return recombineLiftedUnivariateFactors(input, lifted, variableIndex);
}

/**
 * Computes square-free decomposition of an integer polynomial in one or more variables.
 *
 * The polynomial is treated recursively as univariate in the first selected variable.
 * Coefficient content is decomposed over the remaining variables and factors with the
 * same multiplicity are multiplied together.
 */
export function squareFreeFactorizationMultivariate(
	polynomial: SparsePolynomial,
	variables: readonly number[]
): SparsePolynomialSquareFreeFactorization {
	assertFactorVariables(polynomial, variables);
	if (polynomial.isZero()) {
		return { content: 0n, factors: [] };
	}
	return squareFreeFactorizationRecursive(polynomial, variables);
}

/**
 * Completely factors a univariate integer polynomial.
 *
 * Content and global sign are returned separately. Irreducible primitive factors are
 * paired with the multiplicities obtained from square-free decomposition.
 */
export function factorUnivariateInteger(
	polynomial: SparsePolynomial,
	variableIndex: number
): SparsePolynomialSquareFreeFactorization {
	const squareFree = squareFreeFactorizationUnivariate(polynomial, variableIndex);
	if (squareFree.content === 0n || squareFree.factors.length === 0) {
		return squareFree;
	}

	const factors: SparsePolynomialFactor[] = [];
	for (const entry of squareFree.factors) {
		const irreducible = factorSquareFreeUnivariateInteger(
			entry.factor,
			variableIndex
		);
		for (const factor of irreducible) {
			factors.push({
				factor,
				multiplicity: entry.multiplicity,
			});
		}
	}

	return {
		content: squareFree.content,
		factors,
	};
}

/**
 * Computes the square-free decomposition of a univariate integer polynomial.
 *
 * The returned content carries the sign needed to reconstruct the input. Each
 * nonconstant factor is primitive with positive leading coefficient. A common power
 * of the selected variable is extracted before Yun's loop so sparse monomials such
 * as x^N do not require N iterations.
 */
export function squareFreeFactorizationUnivariate(
	polynomial: SparsePolynomial,
	variableIndex: number
): SparsePolynomialSquareFreeFactorization {
	assertUnivariate(polynomial, variableIndex);

	if (polynomial.isZero()) {
		return { content: 0n, factors: [] };
	}

	let content = polynomial.content();
	let primitive = polynomial.primitivePart();
	const leading = primitive.leadingTerm('lex');
	if (leading !== null && leading.coefficient < 0n) {
		primitive = primitive.negate();
		content = -content;
	}

	if (primitive.isConstant()) {
		return { content, factors: [] };
	}

	const factors: SparsePolynomialFactor[] = [];
	let minimumExponent: bigint | null = null;
	for (const term of primitive.terms()) {
		const exponent = term.exponents[variableIndex];
		if (minimumExponent === null || exponent < minimumExponent) {
			minimumExponent = exponent;
		}
	}

	if (minimumExponent !== null && minimumExponent > 0n) {
		const exponents = new Array<bigint>(primitive.variableCount).fill(0n);
		exponents[variableIndex] = minimumExponent;
		const monomial = SparsePolynomial.monomial(primitive.variableCount, 1n, exponents);
		primitive = divideExactOrThrow(primitive, monomial);
		factors.push({
			factor: SparsePolynomial.variable(primitive.variableCount, variableIndex),
			multiplicity: minimumExponent,
		});
	}

	if (primitive.isConstant()) {
		return { content, factors };
	}

	const derivative = primitive.derivative(variableIndex);
	const variableIndices = [variableIndex];
	let gcd = sparsePolynomialGcd(primitive, derivative, variableIndices);
	let p = divideExactOrThrow(primitive, gcd);
	let q = divideExactOrThrow(derivative, gcd);
	let multiplicity = 1n;

	while (true) {
		const difference = q.subtract(p.derivative(variableIndex));
		if (difference.isZero()) {
			if (!p.isConstant()) {
				factors.push({
					factor: p.normalizeLeadingSign('lex'),
					multiplicity,
				});
			}
			break;
		}

		gcd = sparsePolynomialGcd(p, difference, variableIndices);
		p = divideExactOrThrow(p, gcd);
		q = divideExactOrThrow(difference, gcd);

		if (!gcd.isConstant()) {
			factors.push({
				factor: gcd.normalizeLeadingSign('lex'),
				multiplicity,
			});
		}
		multiplicity++;
	}

	factors.sort((left, right) =>
		left.multiplicity < right.multiplicity
			? -1
			: left.multiplicity > right.multiplicity
				? 1
				: 0
	);

	return { content, factors };
}
