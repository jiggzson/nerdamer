/**
 * @module sparsePolynomialMultivariateFactor
 *
 * Evaluation configuration for Wang/EEZ multivariate integer factorization.
 *
 * External references consulted:
 * - Wang/EEZ evaluation-point tests and lifting pipeline:
 *   https://github.com/sympy/sympy/blob/120ee85f346f6292b763cc195afda4f907260d4a/sympy/polys/factortools.py
 */

import { SparsePolynomial } from '../../core/classes/polynomial/SparsePolynomial';
import { message } from '../../core/errors';
import {
	GCD as bigintGCD,
	ceilIntegerSquareRoot,
} from '../../core/functions/bigint/bigint';
import { nextPrimeBig } from '../../core/functions/bigint/primeFactor';

import { henselLiftMultivariateFactors } from './ModularSparsePolynomialFactor';
import {
	contentInVariable,
	factorSquareFreeUnivariateInteger,
	factorUnivariateInteger,
	squareFreeFactorizationMultivariate,
} from './SparsePolynomialFactor';
import { sparsePolynomialGcd } from './SparsePolynomialGcd';

import type {
	SparsePolynomialFactor,
	SparsePolynomialSquareFreeFactorization,
} from './SparsePolynomialFactor';


type WangSpecialization = Readonly<{
	values: readonly bigint[];
	content: bigint;
	polynomial: SparsePolynomial;
}>;

export type WangEvaluation = WangSpecialization & Readonly<{
	factors: readonly SparsePolynomial[];
}>;

export type WangConfiguration = Readonly<{
	evaluation: WangEvaluation;
	polynomial: SparsePolynomial;
	factors: readonly SparsePolynomial[];
	leadingCoefficients: readonly SparsePolynomial[];
}>;

export type WangBivariateConfiguration = WangConfiguration;

const INITIAL_WANG_LIFT_PRIME = 1_000_003n;

function assertWangVariables(
	polynomial: SparsePolynomial,
	variables: readonly number[]
): void {
	if (variables.length < 2) {
		throw new RangeError(
			message('polyRequires', { operation: 'Wang evaluation', requirement: message('polyReqAtLeastTwoSelectedVariables') })
		);
	}

	const selected = new Set<number>();
	let previous = -1;
	for (const variableIndex of variables) {
		polynomial.degree(variableIndex);
		if (selected.has(variableIndex)) {
			throw new RangeError(message('polyVariablesUnique', { operation: 'Wang evaluation' }));
		}
		if (variableIndex <= previous) {
			throw new RangeError(
				message('polyVariablesRingOrder', { operation: 'Wang evaluation' })
			);
		}
		selected.add(variableIndex);
		previous = variableIndex;
	}

	for (const activeVariable of polynomial.variables()) {
		if (!selected.has(activeVariable)) {
			throw new RangeError(
				message('polyVariablesIncludeActive', { operation: 'Wang evaluation' })
			);
		}
	}
}

function evaluateTail(
	polynomial: SparsePolynomial,
	variables: readonly number[],
	values: readonly bigint[]
): SparsePolynomial {
	return polynomial.evaluateVariables(variables.slice(1), values);
}

function normalizeSpecialization(
	polynomial: SparsePolynomial
): Readonly<{ content: bigint; primitive: SparsePolynomial }> {
	let content = polynomial.content();
	let primitive = polynomial.primitivePart();
	const leading = primitive.leadingTerm('lex');
	if (leading !== null && leading.coefficient < 0n) {
		content = -content;
		primitive = primitive.negate();
	}
	return { content, primitive };
}

function evaluateTailInteger(
	polynomial: SparsePolynomial,
	variables: readonly number[],
	values: readonly bigint[]
): bigint {
	const evaluated = evaluateTail(polynomial, variables, values);
	if (!evaluated.isConstant()) {
		throw new Error(message('polyWangLeadingEvaluationInteger'));
	}
	return evaluated.constantTerm();
}

function wangNonDivisors(
	values: readonly bigint[],
	specializedContent: bigint,
	leadingContent: bigint
): boolean {
	const previous: bigint[] = [specializedContent * leadingContent];

	for (const value of values) {
		let remaining = value < 0n ? -value : value;
		for (let index = previous.length - 1; index >= 0; index--) {
			let divisor = previous[index];
			if (divisor < 0n) {
				divisor = -divisor;
			}
			while (divisor !== 1n) {
				divisor = bigintGCD(divisor, remaining);
				remaining /= divisor;
			}
		}
		if (remaining === 1n) {
			return false;
		}
		previous.push(value < 0n ? -value : value);
	}

	return true;
}

function productPolynomials(
	polynomials: readonly SparsePolynomial[],
	variableCount: number
): SparsePolynomial {
	let result = SparsePolynomial.constant(variableCount, 1n);
	for (const polynomial of polynomials) {
		result = result.multiply(polynomial);
	}
	return result;
}

function multivariateMignotteBound(
	polynomial: SparsePolynomial,
	variables: readonly number[]
): bigint {
	let degreeSum = 0n;
	for (const variableIndex of variables) {
		degreeSum += polynomial.degree(variableIndex) ?? 0n;
	}

	const leading = polynomial.leadingTerm('lex');
	if (leading === null) {
		return 0n;
	}
	const leadingAbsolute =
		leading.coefficient < 0n ? -leading.coefficient : leading.coefficient;
	return (
		ceilIntegerSquareRoot(degreeSum + 1n) *
		(1n << degreeSum) *
		polynomial.maxAbsoluteCoefficient() *
		leadingAbsolute
	);
}

function testWangSpecializationPrepared(
	polynomial: SparsePolynomial,
	variables: readonly number[],
	values: readonly bigint[],
	mainVariable: number,
	originalDegree: bigint
): WangSpecialization | null {
	const evaluated = evaluateTail(polynomial, variables, values);
	if (evaluated.degree(mainVariable) !== originalDegree) {
		return null;
	}

	const normalized = normalizeSpecialization(evaluated);
	if (normalized.primitive.isConstant()) {
		return null;
	}
	const derivative = normalized.primitive.derivative(mainVariable);
	const gcd = sparsePolynomialGcd(
		normalized.primitive,
		derivative,
		[mainVariable]
	);
	if (!gcd.isConstant()) {
		return null;
	}

	return {
		values: [...values],
		content: normalized.content,
		polynomial: normalized.primitive,
	};
}

function factorWangSpecialization(
	specialization: WangSpecialization,
	mainVariable: number
): WangEvaluation {
	return {
		...specialization,
		factors: factorSquareFreeUnivariateInteger(
			specialization.polynomial,
			mainVariable
		),
	};
}

/**
 * Tests one Wang/EEZ specialization.
 *
 * The first selected variable remains symbolic and every later variable is replaced by
 * the corresponding integer value. A usable specialization preserves the degree in the
 * main variable and has square-free primitive part.
 */
export function testWangEvaluationPoint(
	polynomial: SparsePolynomial,
	variables: readonly number[],
	values: readonly bigint[]
): WangEvaluation | null {
	assertWangVariables(polynomial, variables);
	if (values.length !== variables.length - 1) {
		throw new RangeError(
			message('polyRequires', { operation: 'Wang evaluation', requirement: message('polyReqOneValuePerNonMainVariable') })
		);
	}
	if (polynomial.isZero()) {
		return null;
	}

	const mainVariable = variables[0];
	const originalDegree = polynomial.degree(mainVariable);
	if (originalDegree === null || originalDegree === 0n) {
		return null;
	}

	const specialization = testWangSpecializationPrepared(
		polynomial,
		variables,
		values,
		mainVariable,
		originalDegree
	);
	return specialization === null
		? null
		: factorWangSpecialization(specialization, mainVariable);
}

function visitEvaluationShell(
	valueCount: number,
	radius: bigint,
	visitor: (values: readonly bigint[]) => boolean
): boolean {
	const values = new Array<bigint>(valueCount).fill(0n);

	function visit(index: number, touchesBoundary: boolean): boolean {
		if (index === valueCount) {
			return touchesBoundary && visitor(values);
		}

		for (let value = -radius; value <= radius; value++) {
			values[index] = value;
			if (
				visit(
					index + 1,
					touchesBoundary || value === -radius || value === radius
				)
			) {
				return true;
			}
		}
		return false;
	}

	return visit(0, radius === 0n);
}

function factorWangLeadingCoefficient(
	polynomial: SparsePolynomial,
	variables: readonly number[]
): SparsePolynomialSquareFreeFactorization | null {
	const mainVariable = variables[0];
	const tailVariables = variables.slice(1);
	const leadingCoefficient = polynomial.leadingCoefficientIn(mainVariable);
	if (leadingCoefficient === null) {
		return null;
	}

	const activeTailVariables = tailVariables.filter(
		variableIndex => (leadingCoefficient.degree(variableIndex) ?? 0n) > 0n
	);
	if (activeTailVariables.length <= 1) {
		return factorUnivariateInteger(
			leadingCoefficient,
			activeTailVariables[0] ?? tailVariables[0]
		);
	}
	return factorMultivariateInteger(
		leadingCoefficient,
		activeTailVariables
	);
}

function testWangConfigurationWithLeadingFactorization(
	polynomial: SparsePolynomial,
	variables: readonly number[],
	values: readonly bigint[],
	leadingFactorization: SparsePolynomialSquareFreeFactorization,
	mainVariable: number,
	originalDegree: bigint
): WangConfiguration | null {
	const specialization = testWangSpecializationPrepared(
		polynomial,
		variables,
		values,
		mainVariable,
		originalDegree
	);
	if (specialization === null) {
		return null;
	}
	const leadingValues = leadingFactorization.factors.map(entry =>
		evaluateTailInteger(entry.factor, variables, values)
	);
	if (
		!wangNonDivisors(
			leadingValues,
			specialization.content,
			leadingFactorization.content
		)
	) {
		return null;
	}

	const evaluation = factorWangSpecialization(
		specialization,
		mainVariable
	);
	const assigned: SparsePolynomial[] = [];
	const usedLeadingFactors = new Array<boolean>(
		leadingFactorization.factors.length
	).fill(false);
	let remainingContent = evaluation.content;
	const specializedFactors = evaluation.factors.map(factor => factor);

	for (const specializedFactor of specializedFactors) {
		const factorLeading = specializedFactor.leadingCoefficientIn(mainVariable);
		if (factorLeading === null || !factorLeading.isConstant()) {
			throw new Error(
				message('polyWangSpecializedLeadingInteger')
			);
		}

		let dividend = factorLeading.constantTerm() * remainingContent;
		let assignedLeading = SparsePolynomial.constant(polynomial.variableCount, 1n);

		for (
			let index = leadingFactorization.factors.length - 1;
			index >= 0;
			index--
		) {
			const evaluatedFactor = leadingValues[index];
			if (evaluatedFactor === 0n) {
				return null;
			}

			let exponent = 0n;
			while (dividend % evaluatedFactor === 0n) {
				dividend /= evaluatedFactor;
				exponent++;
			}
			if (exponent > 0n) {
				assignedLeading = assignedLeading.multiply(
					leadingFactorization.factors[index].factor.pow(exponent)
				);
				usedLeadingFactors[index] = true;
			}
		}
		assigned.push(assignedLeading);
	}

	if (usedLeadingFactors.some(used => !used)) {
		return null;
	}

	const adjustedFactors: SparsePolynomial[] = [];
	const adjustedLeading: SparsePolynomial[] = [];
	for (let index = 0; index < assigned.length; index++) {
		let leading = assigned[index];
		let specializedFactor = specializedFactors[index];
		const evaluatedLeading = evaluateTailInteger(leading, variables, values);
		const specializedLeading = specializedFactor
			.leadingCoefficientIn(mainVariable)
			?.constantTerm();
		if (specializedLeading === undefined || evaluatedLeading === 0n) {
			return null;
		}

		if (remainingContent === 1n) {
			if (specializedLeading % evaluatedLeading !== 0n) {
				return null;
			}
			leading = leading.scale(specializedLeading / evaluatedLeading);
		} else {
			const divisor = bigintGCD(specializedLeading, evaluatedLeading);
			const factorScale = evaluatedLeading / divisor;
			const leadingScale = specializedLeading / divisor;
			if (factorScale === 0n || remainingContent % factorScale !== 0n) {
				return null;
			}
			specializedFactor = specializedFactor.scale(factorScale);
			remainingContent /= factorScale;
			leading = leading.scale(leadingScale);
		}

		adjustedFactors.push(specializedFactor);
		adjustedLeading.push(leading);
	}

	let targetPolynomial = polynomial;
	if (remainingContent !== 1n) {
		adjustedFactors.forEach((factor, index) => {
			adjustedFactors[index] = factor.scale(remainingContent);
			adjustedLeading[index] = adjustedLeading[index].scale(remainingContent);
		});
		targetPolynomial = targetPolynomial.scale(
			remainingContent ** BigInt(adjustedFactors.length - 1)
		);
	}

	const targetLeading = targetPolynomial.leadingCoefficientIn(mainVariable);
	if (
		targetLeading === null ||
		!productPolynomials(adjustedLeading, polynomial.variableCount).equals(
			targetLeading
		)
	) {
		return null;
	}

	const specializedTarget = evaluateTail(targetPolynomial, variables, values);
	if (
		!productPolynomials(adjustedFactors, polynomial.variableCount).equals(
			specializedTarget
		)
	) {
		return null;
	}

	for (let index = 0; index < adjustedFactors.length; index++) {
		const factorLeading = adjustedFactors[index].leadingCoefficientIn(mainVariable);
		if (
			factorLeading === null ||
			!evaluateTail(adjustedLeading[index], variables, values).equals(factorLeading)
		) {
			return null;
		}
	}

	return {
		evaluation,
		polynomial: targetPolynomial,
		factors: adjustedFactors,
		leadingCoefficients: adjustedLeading,
	};
}

/**
 * Builds a Wang configuration with reconstructed factor leading coefficients.
 *
 * The main-variable leading coefficient is factored recursively over the tail
 * variables. A single active tail variable uses the univariate factorizer; larger
 * coefficient rings recurse through multivariate factorization.
 */
export function testWangConfiguration(
	polynomial: SparsePolynomial,
	variables: readonly number[],
	values: readonly bigint[]
): WangConfiguration | null {
	assertWangVariables(polynomial, variables);
	if (values.length !== variables.length - 1) {
		throw new RangeError(
			message('polyRequires', { operation: 'Wang leading-coefficient reconstruction', requirement: message('polyReqOneValuePerTailVariable') })
		);
	}
	if (polynomial.content() !== 1n) {
		throw new RangeError(
			message('polyRequires', { operation: 'Wang leading-coefficient reconstruction', requirement: message('polyReqPrimitivePolynomial') })
		);
	}
	const leadingTerm = polynomial.leadingTerm('lex');
	if (leadingTerm === null || leadingTerm.coefficient < 0n) {
		throw new RangeError(
			message('polyRequires', { operation: 'Wang leading-coefficient reconstruction', requirement: message('polyReqPositiveLexLeadingSign') })
		);
	}

	const mainVariable = variables[0];
	const originalDegree = polynomial.degree(mainVariable);
	if (originalDegree === null || originalDegree === 0n) {
		return null;
	}
	const leadingFactorization = factorWangLeadingCoefficient(polynomial, variables);
	if (leadingFactorization === null) {
		return null;
	}
	return testWangConfigurationWithLeadingFactorization(
		polynomial,
		variables,
		values,
		leadingFactorization,
		mainVariable,
		originalDegree
	);
}

/** Builds a bivariate Wang configuration through the general reconstruction path. */
export function testWangBivariateConfiguration(
	polynomial: SparsePolynomial,
	variables: readonly number[],
	value: bigint
): WangBivariateConfiguration | null {
	if (variables.length !== 2) {
		throw new RangeError(
			message('polyRequires', { operation: 'Bivariate Wang leading-coefficient reconstruction', requirement: message('polyReqExactlyTwoSelectedVariables') })
		);
	}
	return testWangConfiguration(polynomial, variables, [value]);
}

/** Lifts a Wang configuration using the reusable multivariate Hensel implementation. */
export function liftWangConfiguration(
	configuration: WangConfiguration,
	variables: readonly number[],
	prime: bigint
): readonly SparsePolynomial[] | null {
	if (variables.length < 2) {
		throw new RangeError(message('polyRequires', { operation: 'Wang lifting', requirement: message('polyReqAtLeastTwoSelectedVariables') }));
	}
	return henselLiftMultivariateFactors(
		configuration.polynomial,
		configuration.factors,
		configuration.leadingCoefficients,
		variables,
		configuration.evaluation.values,
		prime
	);
}

/** Lifts one bivariate Wang configuration modulo a prime. */
export function liftWangBivariateConfiguration(
	configuration: WangBivariateConfiguration,
	variables: readonly number[],
	prime: bigint
): readonly SparsePolynomial[] | null {
	if (variables.length !== 2) {
		throw new RangeError(message('polyRequires', { operation: 'Bivariate Wang lifting', requirement: message('polyReqExactlyTwoVariables') }));
	}
	return liftWangConfiguration(configuration, variables, prime);
}

/**
 * Factors a primitive square-free multivariate integer polynomial.
 *
 * A Wang configuration supplies the specialized factors and reconstructed leading
 * coefficients. Modular lifts are retried with increasing primes until centered integer
 * factors reconstruct the original polynomial exactly.
 */
export function factorSquareFreeMultivariateInteger(
	polynomial: SparsePolynomial,
	variables: readonly number[]
): readonly SparsePolynomial[] {
	assertWangVariables(polynomial, variables);
	if (polynomial.isZero()) {
		throw new RangeError(message('polyCannotFactorZero', { operation: 'Wang factorization' }));
	}
	if (polynomial.content() !== 1n) {
		throw new RangeError(
			message('polyRequires', { operation: 'Wang factorization', requirement: message('polyReqPrimitivePolynomial') })
		);
	}
	const leading = polynomial.leadingTerm('lex');
	if (leading === null || leading.coefficient < 0n) {
		throw new RangeError(
			message('polyRequires', { operation: 'Wang factorization', requirement: message('polyReqPositiveLexLeadingSign') })
		);
	}

	const mainVariable = variables[0];
	const derivative = polynomial.derivative(mainVariable);
	if (!sparsePolynomialGcd(polynomial, derivative, variables).isConstant()) {
		throw new RangeError(
			message('polyRequires', { operation: 'Wang factorization', requirement: message('polyReqSquareFreeMainVariable') })
		);
	}

	const {
		originalDegree,
		leadingFactorization,
	} = prepareWangConfigurationSearch(polynomial, variables);
	let radius = 0n;
	let minimumFactorCount: number | null = null;
	let configurations: Array<{
		configuration: WangConfiguration;
		prime: bigint;
	}> = [];

	while (true) {
		let irreducible = false;
		visitEvaluationShell(variables.length - 1, radius, values => {
			const candidate = testWangConfigurationWithLeadingFactorization(
				polynomial,
				variables,
				values,
				leadingFactorization,
				mainVariable,
				originalDegree
			);
			if (candidate === null) {
				return false;
			}
			if (candidate.factors.length === 1) {
				irreducible = true;
				return true;
			}
			if (
				minimumFactorCount === null ||
				candidate.factors.length < minimumFactorCount
			) {
				minimumFactorCount = candidate.factors.length;
				configurations = [];
			}
			if (candidate.factors.length !== minimumFactorCount) {
				return false;
			}

			let maxTailDegree = 0n;
			for (const variableIndex of variables.slice(1)) {
				const degree = candidate.polynomial.degree(variableIndex) ?? 0n;
				if (degree > maxTailDegree) {
					maxTailDegree = degree;
				}
			}
			const coefficientBound = multivariateMignotteBound(
				candidate.polynomial,
				variables
			);
			let primeStart = 2n * coefficientBound + 1n;
			if (primeStart < INITIAL_WANG_LIFT_PRIME) {
				primeStart = INITIAL_WANG_LIFT_PRIME;
			}
			if (primeStart <= maxTailDegree) {
				primeStart = maxTailDegree + 1n;
			}
			configurations.push({
				configuration: candidate,
				prime: nextPrimeBig(primeStart),
			});
			return false;
		});
		if (irreducible) {
			return [polynomial];
		}

		const retry: typeof configurations = [];
		for (const state of configurations) {
			const lifted = liftWangConfiguration(
				state.configuration,
				variables,
				state.prime
			);
			if (lifted === null) {
				retry.push({
					configuration: state.configuration,
					prime: nextPrimeBig(state.prime + 1n),
				});
				continue;
			}

			const reconstruction = productPolynomials(
				lifted,
				polynomial.variableCount
			);
			if (reconstruction.equals(polynomial)) {
				return lifted;
			}
		}
		configurations = retry;
		radius++;
	}
}

/** Factors a primitive square-free bivariate polynomial over the integers. */
export function factorSquareFreeBivariateInteger(
	polynomial: SparsePolynomial,
	variables: readonly number[]
): readonly SparsePolynomial[] {
	if (variables.length !== 2) {
		throw new RangeError(
			message('polyRequires', { operation: 'Bivariate Wang factorization', requirement: message('polyReqExactlyTwoSelectedVariables') })
		);
	}
	return factorSquareFreeMultivariateInteger(polynomial, variables);
}

/**
 * Completely factors a multivariate integer polynomial.
 *
 * Numeric content is returned separately. Main-variable content is factored in the
 * remaining variables before the primitive portion enters Wang lifting.
 */
export function factorMultivariateInteger(
	polynomial: SparsePolynomial,
	variables: readonly number[]
): SparsePolynomialSquareFreeFactorization {
	assertWangVariables(polynomial, variables);

	const squareFree = squareFreeFactorizationMultivariate(polynomial, variables);
	if (squareFree.content === 0n || squareFree.factors.length === 0) {
		return squareFree;
	}

	const mainVariable = variables[0];
	const coefficientVariables = variables.slice(1);
	const factors: SparsePolynomialFactor[] = [];

	for (const entry of squareFree.factors) {
		const variableContent = contentInVariable(
			entry.factor,
			mainVariable,
			coefficientVariables
		);
		const primitive = entry.factor.divideExact(variableContent);
		if (primitive === null) {
			throw new Error(
				message('polyMultivariateContentDivisionFailed')
			);
		}

		if (!variableContent.isConstant()) {
			const activeContentVariables = coefficientVariables.filter(
				variableIndex => (variableContent.degree(variableIndex) ?? 0n) > 0n
			);
			let contentFactorization: SparsePolynomialSquareFreeFactorization;
			if (activeContentVariables.length === 1) {
				contentFactorization = factorUnivariateInteger(
					variableContent,
					activeContentVariables[0]
				);
			} else if (activeContentVariables.length > 1) {
				contentFactorization = factorMultivariateInteger(
					variableContent,
					activeContentVariables
				);
			} else {
				throw new Error(
					message('polyMultivariateContentVariableMissing')
				);
			}
			for (const contentEntry of contentFactorization.factors) {
				factors.push({
					factor: contentEntry.factor,
					multiplicity: entry.multiplicity * contentEntry.multiplicity,
				});
			}
		}

		if (!primitive.isConstant()) {
			for (const irreducible of factorSquareFreeMultivariateInteger(
				primitive,
				variables
			)) {
				factors.push({
					factor: irreducible,
					multiplicity: entry.multiplicity,
				});
			}
		}
	}

	let reconstruction = SparsePolynomial.constant(
		polynomial.variableCount,
		squareFree.content
	);
	for (const entry of factors) {
		reconstruction = reconstruction.multiply(
			entry.factor.pow(entry.multiplicity)
		);
	}
	if (!reconstruction.equals(polynomial)) {
		throw new Error(
			message('polyMultivariateReconstructionFailed')
		);
	}

	return {
		content: squareFree.content,
		factors,
	};
}

/** Completely factors a bivariate integer polynomial. */
export function factorBivariateInteger(
	polynomial: SparsePolynomial,
	variables: readonly number[]
): SparsePolynomialSquareFreeFactorization {
	if (variables.length !== 2) {
		throw new RangeError(
			message('polyRequires', { operation: 'Complete bivariate factorization', requirement: message('polyReqExactlyTwoSelectedVariables') })
		);
	}
	return factorMultivariateInteger(polynomial, variables);
}

function prepareWangConfigurationSearch(
	polynomial: SparsePolynomial,
	variables: readonly number[]
): Readonly<{
	mainVariable: number;
	originalDegree: bigint;
	leadingFactorization: SparsePolynomialSquareFreeFactorization;
}> {
	assertWangVariables(polynomial, variables);
	if (polynomial.content() !== 1n) {
		throw new RangeError(
			message('polyRequires', { operation: 'Wang leading-coefficient reconstruction', requirement: message('polyReqPrimitivePolynomial') })
		);
	}
	const leadingTerm = polynomial.leadingTerm('lex');
	if (leadingTerm === null || leadingTerm.coefficient < 0n) {
		throw new RangeError(
			message('polyRequires', { operation: 'Wang leading-coefficient reconstruction', requirement: message('polyReqPositiveLexLeadingSign') })
		);
	}
	const mainVariable = variables[0];
	const originalDegree = polynomial.degree(mainVariable);
	if (originalDegree === null || originalDegree === 0n) {
		throw new RangeError(
			message('polyRequires', { operation: 'Wang configuration search', requirement: message('polyReqPositiveDegreeMainVariable') })
		);
	}
	const leadingFactorization = factorWangLeadingCoefficient(polynomial, variables);
	if (leadingFactorization === null) {
		throw new RangeError(
			message('polyRequires', { operation: 'Wang configuration search', requirement: message('polyReqPositiveDegreeMainVariable') })
		);
	}

	return {
		mainVariable,
		originalDegree,
		leadingFactorization,
	};
}

/**
 * Finds the nearest Wang configuration whose leading coefficients can be reconstructed
 * from the specialized factorization.
 */
export function findWangConfiguration(
	polynomial: SparsePolynomial,
	variables: readonly number[]
): WangConfiguration {
	const {
		mainVariable,
		originalDegree,
		leadingFactorization,
	} = prepareWangConfigurationSearch(polynomial, variables);

	let radius = 0n;
	while (true) {
		let found: WangConfiguration | null = null;
		visitEvaluationShell(variables.length - 1, radius, values => {
			const candidate = testWangConfigurationWithLeadingFactorization(
				polynomial,
				variables,
				values,
				leadingFactorization,
				mainVariable,
				originalDegree
			);
			if (candidate === null) {
				return false;
			}
			found = candidate;
			return true;
		});
		if (found !== null) {
			return found;
		}
		radius++;
	}
}

/** Finds the nearest bivariate Wang configuration. */
export function findWangBivariateConfiguration(
	polynomial: SparsePolynomial,
	variables: readonly number[]
): WangBivariateConfiguration {
	if (variables.length !== 2) {
		throw new RangeError(
			message('polyRequires', { operation: 'Bivariate Wang configuration search', requirement: message('polyReqExactlyTwoSelectedVariables') })
		);
	}
	return findWangConfiguration(polynomial, variables);
}

/**
 * Finds the nearest usable Wang/EEZ evaluation point in deterministic integer shells.
 *
 * The origin is tested first, followed by the boundary of [-1,1]^n, [-2,2]^n, and so
 * on. Search continues until a specialization preserves leading degree and is square-free.
 */
export function findWangEvaluationPoint(
	polynomial: SparsePolynomial,
	variables: readonly number[]
): WangEvaluation {
	assertWangVariables(polynomial, variables);
	if (polynomial.isZero()) {
		throw new RangeError(message('polyWangCannotSpecializeZero'));
	}
	const mainVariable = variables[0];
	const originalDegree = polynomial.degree(mainVariable);
	if (originalDegree === null || originalDegree === 0n) {
		throw new RangeError(
			message('polyRequires', { operation: 'Wang evaluation search', requirement: message('polyReqPositiveDegreeMainVariable') })
		);
	}

	let radius = 0n;
	while (true) {
		let found: WangEvaluation | null = null;
		visitEvaluationShell(variables.length - 1, radius, values => {
			const candidate = testWangSpecializationPrepared(
				polynomial,
				variables,
				values,
				mainVariable,
				originalDegree
			);
			if (candidate === null) {
				return false;
			}
			found = factorWangSpecialization(candidate, mainVariable);
			return true;
		});
		if (found !== null) {
			return found;
		}
		radius++;
	}
}
