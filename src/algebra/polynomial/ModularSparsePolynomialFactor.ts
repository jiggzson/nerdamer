/**
 * @module modularSparsePolynomialFactor
 *
 * Finite-field factorization and Hensel lifting for sparse polynomials.
 *
 * External references consulted for Berlekamp factorization:
 * - SymPy finite-field factorization:
 *   https://github.com/sympy/sympy/blob/120ee85f346f6292b763cc195afda4f907260d4a/sympy/polys/galoistools.py
 */

import { message } from '../../core/errors';
import { invMod, mod } from '../../core/functions/bigint/bigint';
import { isPrimeBig } from '../../core/functions/bigint/primeFactor';

import { modularGcdUnivariate } from './modularGcd';
import { ModularSparsePolynomial } from './ModularSparsePolynomial';

import type { SparsePolynomial, SparsePolynomialTerm } from '../../core/classes/polynomial/SparsePolynomial';

function assertSquareFreeUnivariate(
	polynomial: ModularSparsePolynomial,
	variableIndex: number
): number {
	if (!isPrimeBig(polynomial.modulus)) {
		throw new RangeError(message('polyRequires', { operation: 'Modular factorization', requirement: message('polyReqPrimeModulus') }));
	}

	const degree = polynomial.degree(variableIndex);
	for (const activeVariable of polynomial.variables()) {
		if (activeVariable !== variableIndex) {
			throw new RangeError(message('polyRequires', { operation: 'Modular factorization', requirement: message('polyReqUnivariatePolynomial') }));
		}
	}

	if (degree === null || degree === 0n) {
		return 0;
	}
	if (degree > BigInt(Number.MAX_SAFE_INTEGER)) {
		throw new RangeError(
			message('polyDegreeMatrixLimit')
		);
	}

	const derivativeTerms: SparsePolynomialTerm[] = [];
	for (const term of polynomial.terms()) {
		const exponent = term.exponents[variableIndex];
		if (exponent === 0n) {
			continue;
		}

		const exponents = [...term.exponents];
		exponents[variableIndex] = exponent - 1n;
		derivativeTerms.push({
			coefficient: mod(term.coefficient * exponent, polynomial.modulus),
			exponents,
		});
	}

	const derivative = new ModularSparsePolynomial(
		polynomial.variableCount,
		polynomial.modulus,
		derivativeTerms
	);
	const gcd = modularGcdUnivariate(polynomial, derivative, variableIndex);
	if (!gcd.isConstant()) {
		throw new RangeError(message('polyRequires', { operation: 'Berlekamp factorization', requirement: message('polyReqSquareFreeInput') }));
	}

	return Number(degree);
}

function polynomialRemainder(
	polynomial: ModularSparsePolynomial,
	modulusPolynomial: ModularSparsePolynomial
): ModularSparsePolynomial {
	return polynomial.divideWithRemainder(modulusPolynomial).remainder;
}

function polynomialPowMod(
	base: ModularSparsePolynomial,
	exponent: bigint,
	modulusPolynomial: ModularSparsePolynomial
): ModularSparsePolynomial {
	let result = ModularSparsePolynomial.constant(
		base.variableCount,
		base.modulus,
		1n
	);
	let factor = polynomialRemainder(base, modulusPolynomial);
	let power = exponent;

	while (power > 0n) {
		if ((power & 1n) === 1n) {
			result = polynomialRemainder(result.multiply(factor), modulusPolynomial);
		}
		power >>= 1n;
		if (power > 0n) {
			factor = polynomialRemainder(factor.multiply(factor), modulusPolynomial);
		}
	}

	return result;
}

function nullspaceModulo(matrix: readonly (readonly bigint[])[], modulus: bigint): bigint[][] {
	const rowCount = matrix.length;
	const columnCount = rowCount === 0 ? 0 : matrix[0].length;
	const rows = matrix.map(row => row.map(value => mod(value, modulus)));
	const pivotColumns: number[] = [];
	let pivotRow = 0;

	for (let column = 0; column < columnCount && pivotRow < rowCount; column++) {
		let selectedRow = pivotRow;
		while (selectedRow < rowCount && rows[selectedRow][column] === 0n) {
			selectedRow++;
		}
		if (selectedRow === rowCount) {
			continue;
		}

		if (selectedRow !== pivotRow) {
			const temp = rows[pivotRow];
			rows[pivotRow] = rows[selectedRow];
			rows[selectedRow] = temp;
		}

		const inverse = invMod(rows[pivotRow][column], modulus);
		if (inverse < 0n) {
			throw new RangeError(message('polyBerlekampNoninvertiblePivot'));
		}
		for (let c = column; c < columnCount; c++) {
			rows[pivotRow][c] = mod(rows[pivotRow][c] * inverse, modulus);
		}

		for (let row = 0; row < rowCount; row++) {
			if (row === pivotRow || rows[row][column] === 0n) {
				continue;
			}
			const scale = rows[row][column];
			for (let c = column; c < columnCount; c++) {
				rows[row][c] = mod(
					rows[row][c] - scale * rows[pivotRow][c],
					modulus
				);
			}
		}

		pivotColumns.push(column);
		pivotRow++;
	}

	const pivotSet = new Set(pivotColumns);
	const basis: bigint[][] = [];
	for (let freeColumn = 0; freeColumn < columnCount; freeColumn++) {
		if (pivotSet.has(freeColumn)) {
			continue;
		}

		const vector = new Array<bigint>(columnCount).fill(0n);
		vector[freeColumn] = 1n;
		for (let row = 0; row < pivotColumns.length; row++) {
			const pivotColumn = pivotColumns[row];
			vector[pivotColumn] = mod(-rows[row][freeColumn], modulus);
		}
		basis.push(vector);
	}

	return basis;
}

function vectorPolynomial(
	vector: readonly bigint[],
	variableCount: number,
	modulus: bigint,
	variableIndex: number
): ModularSparsePolynomial {
	const terms: SparsePolynomialTerm[] = [];
	for (let exponent = 0; exponent < vector.length; exponent++) {
		const coefficient = vector[exponent];
		if (coefficient === 0n) {
			continue;
		}
		const exponents = new Array<bigint>(variableCount).fill(0n);
		exponents[variableIndex] = BigInt(exponent);
		terms.push({ coefficient, exponents });
	}
	return new ModularSparsePolynomial(variableCount, modulus, terms);
}

function changeModulus(
	polynomial: ModularSparsePolynomial,
	modulus: bigint
): ModularSparsePolynomial {
	return new ModularSparsePolynomial(
		polynomial.variableCount,
		modulus,
		polynomial.terms()
	);
}

function integerPolynomialModulo(
	polynomial: SparsePolynomial,
	modulus: bigint
): ModularSparsePolynomial {
	return new ModularSparsePolynomial(
		polynomial.variableCount,
		modulus,
		polynomial.terms()
	);
}

export function modularExtendedGcdUnivariate(
	left: ModularSparsePolynomial,
	right: ModularSparsePolynomial,
	variableIndex: number
): Readonly<{
	gcd: ModularSparsePolynomial;
	leftCoefficient: ModularSparsePolynomial;
	rightCoefficient: ModularSparsePolynomial;
}> {
	if (left.variableCount !== right.variableCount || left.modulus !== right.modulus) {
		throw new RangeError(
			message('polyRequires', { operation: 'Modular extended GCD', requirement: message('polyReqSamePolynomialRing') })
		);
	}
	left.degree(variableIndex);
	right.degree(variableIndex);

	let oldR = left;
	let r = right;
	let oldS = ModularSparsePolynomial.constant(
		left.variableCount,
		left.modulus,
		1n
	);
	let s = ModularSparsePolynomial.zero(left.variableCount, left.modulus);
	let oldT = ModularSparsePolynomial.zero(left.variableCount, left.modulus);
	let t = ModularSparsePolynomial.constant(
		left.variableCount,
		left.modulus,
		1n
	);

	while (!r.isZero()) {
		const division = oldR.divideWithRemainder(r);
		const nextR = division.remainder;
		const nextS = oldS.subtract(division.quotient.multiply(s));
		const nextT = oldT.subtract(division.quotient.multiply(t));

		oldR = r;
		r = nextR;
		oldS = s;
		s = nextS;
		oldT = t;
		t = nextT;
	}

	const leading = oldR.leadingTerm();
	if (leading === null) {
		throw new RangeError(message('polyExtendedGcdTwoZeroUndefined'));
	}
	const inverse = invMod(leading.coefficient, left.modulus);
	if (inverse < 0n) {
		throw new RangeError(
			message('polyRequires', { operation: 'Modular extended GCD', requirement: message('polyReqInvertibleLeadingCoefficient') })
		);
	}

	return {
		gcd: oldR.scale(inverse),
		leftCoefficient: oldS.scale(inverse),
		rightCoefficient: oldT.scale(inverse),
	};
}

type HenselPairState = Readonly<{
	g: ModularSparsePolynomial;
	h: ModularSparsePolynomial;
	s: ModularSparsePolynomial;
	t: ModularSparsePolynomial;
}>;

function henselPairStep(
	target: ModularSparsePolynomial,
	state: HenselPairState
): HenselPairState {
	const currentModulus = state.g.modulus;
	const nextModulus = currentModulus * currentModulus;
	const f = changeModulus(target, nextModulus);
	const g = changeModulus(state.g, nextModulus);
	const h = changeModulus(state.h, nextModulus);
	const s = changeModulus(state.s, nextModulus);
	const t = changeModulus(state.t, nextModulus);

	const error = f.subtract(g.multiply(h));
	const firstDivision = s.multiply(error).divideWithRemainder(h);
	const u = t
		.multiply(error)
		.add(firstDivision.quotient.multiply(g));
	const liftedG = g.add(u);
	const liftedH = h.add(firstDivision.remainder);

	const bezoutError = s
		.multiply(liftedG)
		.add(t.multiply(liftedH))
		.subtract(
			ModularSparsePolynomial.constant(
				f.variableCount,
				nextModulus,
				1n
			)
		);
	const secondDivision = s.multiply(bezoutError).divideWithRemainder(liftedH);
	const correction = t
		.multiply(bezoutError)
		.add(secondDivision.quotient.multiply(liftedG));

	return {
		g: liftedG,
		h: liftedH,
		s: s.subtract(secondDivision.remainder),
		t: t.subtract(correction),
	};
}

function productModularFactors(
	factors: readonly ModularSparsePolynomial[],
	variableCount: number,
	modulus: bigint
): ModularSparsePolynomial {
	let result = ModularSparsePolynomial.constant(variableCount, modulus, 1n);
	for (const factor of factors) {
		result = result.multiply(changeModulus(factor, modulus));
	}
	return result;
}

function modularDerivativeOrder(
	polynomial: ModularSparsePolynomial,
	variableIndex: number,
	order: bigint
): ModularSparsePolynomial {
	let result = polynomial;
	let remaining = order;
	while (remaining > 0n) {
		result = result.derivative(variableIndex);
		remaining--;
	}
	return result;
}

function factorialModulo(value: bigint, modulus: bigint): bigint {
	let result = 1n;
	let factor = 2n;
	while (factor <= value) {
		result = mod(result * factor, modulus);
		factor++;
	}
	return result;
}

function buildMultivariateHenselSeeds(
	leadingCoefficients: readonly SparsePolynomial[],
	evaluationValues: readonly bigint[],
	baseFactors: readonly ModularSparsePolynomial[],
	variables: readonly number[],
	tailIndex: number,
	prime: bigint
): readonly ModularSparsePolynomial[] | null {
	const mainVariable = variables[0];
	const tailVariable = variables[tailIndex + 1];
	const seeds: ModularSparsePolynomial[] = [];

	for (let index = 0; index < baseFactors.length; index++) {
		const baseFactor = baseFactors[index];
		const degree = baseFactor.degree(mainVariable);
		if (degree === null) {
			return null;
		}

		const lowerTerms = baseFactor
			.terms()
			.filter(term => term.exponents[mainVariable] !== degree);
		const lower = new ModularSparsePolynomial(
			baseFactor.variableCount,
			prime,
			lowerTerms
		);

		let leading = leadingCoefficients[index];
		for (
			let laterIndex = tailIndex + 1;
			laterIndex < evaluationValues.length;
			laterIndex++
		) {
			leading = leading.evaluateVariable(
				variables[laterIndex + 1],
				evaluationValues[laterIndex]
			);
		}
		const modularLeading = new ModularSparsePolynomial(
			leading.variableCount,
			prime,
			leading.terms()
		);

		const mainExponents = new Array<bigint>(baseFactor.variableCount).fill(0n);
		mainExponents[mainVariable] = degree;
		const mainPower = ModularSparsePolynomial.monomial(
			baseFactor.variableCount,
			prime,
			1n,
			mainExponents
		);
		const seed = modularLeading.multiply(mainPower).add(lower);
		const specializedSeed = seed.evaluateVariable(
			tailVariable,
			evaluationValues[tailIndex]
		);
		if (!specializedSeed.equals(baseFactor)) {
			return null;
		}
		seeds.push(seed);
	}

	return seeds;
}

function solveUnivariateDiophantine(
	baseFactors: readonly ModularSparsePolynomial[],
	target: ModularSparsePolynomial,
	mainVariable: number
): readonly ModularSparsePolynomial[] | null {
	const corrections: ModularSparsePolynomial[] = [];

	for (let index = 0; index < baseFactors.length; index++) {
		const others = baseFactors.filter((_factor, otherIndex) => otherIndex !== index);
		const complement = productModularFactors(
			others,
			baseFactors[index].variableCount,
			baseFactors[index].modulus
		);
		const bezout = modularExtendedGcdUnivariate(
			complement,
			baseFactors[index],
			mainVariable
		);
		if (!bezout.gcd.isConstant()) {
			return null;
		}

		const correction = target
			.multiply(bezout.leftCoefficient)
			.divideWithRemainder(baseFactors[index])
			.remainder;
		corrections.push(correction);
	}

	let reconstructed = ModularSparsePolynomial.zero(
		target.variableCount,
		target.modulus
	);
	for (let index = 0; index < baseFactors.length; index++) {
		const others = baseFactors.filter((_factor, otherIndex) => otherIndex !== index);
		const complement = productModularFactors(
			others,
			target.variableCount,
			target.modulus
		);
		reconstructed = reconstructed.add(corrections[index].multiply(complement));
	}
	if (!reconstructed.equals(target)) {
		return null;
	}

	return corrections;
}

function solveMultivariateDiophantine(
	baseFactors: readonly ModularSparsePolynomial[],
	target: ModularSparsePolynomial,
	mainVariable: number,
	tailVariables: readonly number[],
	evaluationValues: readonly bigint[],
	maxTailDegree: bigint
): readonly ModularSparsePolynomial[] | null {
	if (tailVariables.length !== evaluationValues.length) {
		throw new RangeError(
			message('polyRequires', { operation: 'Multivariate Diophantine solving', requirement: message('polyReqOneEvaluationPerTailVariable') })
		);
	}
	if (tailVariables.length === 0) {
		return solveUnivariateDiophantine(baseFactors, target, mainVariable);
	}

	const tailVariable = tailVariables[tailVariables.length - 1];
	const evaluationValue = evaluationValues[evaluationValues.length - 1];
	const earlierVariables = tailVariables.slice(0, -1);
	const earlierValues = evaluationValues.slice(0, -1);
	const evaluatedFactors = baseFactors.map(factor =>
		factor.evaluateVariable(tailVariable, evaluationValue)
	);
	const evaluatedTarget = target.evaluateVariable(
		tailVariable,
		evaluationValue
	);
	const initial = solveMultivariateDiophantine(
		evaluatedFactors,
		evaluatedTarget,
		mainVariable,
		earlierVariables,
		earlierValues,
		maxTailDegree
	);
	if (initial === null) {
		return null;
	}

	const complements = baseFactors.map((_factor, index) =>
		productModularFactors(
			baseFactors.filter((_other, otherIndex) => otherIndex !== index),
			target.variableCount,
			target.modulus
		)
	);
	let corrections = [...initial];
	const tail = ModularSparsePolynomial.variable(
		target.variableCount,
		target.modulus,
		tailVariable
	);
	const shift = tail.subtract(
		ModularSparsePolynomial.constant(
			target.variableCount,
			target.modulus,
			evaluationValue
		)
	);

	function residualFor(
		current: readonly ModularSparsePolynomial[]
	): ModularSparsePolynomial {
		let residual = target;
		for (let index = 0; index < current.length; index++) {
			residual = residual.subtract(current[index].multiply(complements[index]));
		}
		return residual;
	}

	let residual = residualFor(corrections);
	for (let order = 1n; order <= maxTailDegree && !residual.isZero(); order++) {
		const derivative = modularDerivativeOrder(
			residual,
			tailVariable,
			order
		).evaluateVariable(tailVariable, evaluationValue);
		const factorialInverse = invMod(
			factorialModulo(order, target.modulus),
			target.modulus
		);
		if (factorialInverse < 0n) {
			return null;
		}
		const coefficientTarget = derivative.scale(factorialInverse);
		if (coefficientTarget.isZero()) {
			continue;
		}

		const next = solveMultivariateDiophantine(
			evaluatedFactors,
			coefficientTarget,
			mainVariable,
			earlierVariables,
			earlierValues,
			maxTailDegree
		);
		if (next === null) {
			return null;
		}
		const shiftPower = shift.pow(order);
		corrections = corrections.map((correction, index) =>
			correction.add(next[index].multiply(shiftPower))
		);
		residual = residualFor(corrections);
	}

	return residual.isZero() ? corrections : null;
}

/**
 * Lifts specialized factors through one or more tail variables modulo a prime.
 *
 * Callers supply the fully specialized factors, the corresponding main-variable
 * leading coefficients, and one evaluation value for each tail variable. The factors
 * are lifted one tail variable at a time and verified against the target after every
 * stage.
 */
export function henselLiftMultivariateFactors(
	polynomial: SparsePolynomial,
	factors: readonly SparsePolynomial[],
	leadingCoefficients: readonly SparsePolynomial[],
	variables: readonly number[],
	evaluationValues: readonly bigint[],
	prime: bigint
): readonly SparsePolynomial[] | null {
	if (variables.length < 2) {
		throw new RangeError(
			message('polyRequires', { operation: 'Multivariate Hensel lifting', requirement: message('polyReqAtLeastTwoSelectedVariables') })
		);
	}
	if (evaluationValues.length !== variables.length - 1) {
		throw new RangeError(
			message('polyRequires', { operation: 'Multivariate Hensel lifting', requirement: message('polyReqOneEvaluationPerTailVariable') })
		);
	}
	if (factors.length === 0 || factors.length !== leadingCoefficients.length) {
		throw new RangeError(
			message('polyRequires', { operation: 'Multivariate Hensel lifting', requirement: message('polyReqMatchingFactorLeadingLists') })
		);
	}
	if (!isPrimeBig(prime)) {
		throw new RangeError(message('polyRequires', { operation: 'Multivariate Hensel lifting', requirement: message('polyReqPrimeModulus') }));
	}

	const mainVariable = variables[0];
	let maxTailDegree = 0n;
	for (const variableIndex of variables.slice(1)) {
		const degree = polynomial.degree(variableIndex) ?? 0n;
		if (degree > maxTailDegree) {
			maxTailDegree = degree;
		}
	}
	if (prime <= maxTailDegree) {
		throw new RangeError(
			message('polyHenselPrimeExceedsTailDegree')
		);
	}

	for (const factor of [...factors, ...leadingCoefficients]) {
		if (factor.variableCount !== polynomial.variableCount) {
			throw new RangeError(
				message('polyRequires', { operation: 'Multivariate Hensel lifting inputs', requirement: message('polyReqSamePolynomialRing') })
			);
		}
	}

	const target = new ModularSparsePolynomial(
		polynomial.variableCount,
		prime,
		polynomial.terms()
	);
	let lifted = factors.map(
		factor =>
			new ModularSparsePolynomial(
				factor.variableCount,
				prime,
				factor.terms()
			)
	);

	let fullySpecializedTarget = target;
	for (let index = 0; index < evaluationValues.length; index++) {
		fullySpecializedTarget = fullySpecializedTarget.evaluateVariable(
			variables[index + 1],
			evaluationValues[index]
		);
	}
	if (
		!productModularFactors(
			lifted,
			target.variableCount,
			prime
		).equals(fullySpecializedTarget)
	) {
		return null;
	}

	for (let index = 0; index < lifted.length; index++) {
		for (let otherIndex = index + 1; otherIndex < lifted.length; otherIndex++) {
			const gcd = modularExtendedGcdUnivariate(
				lifted[index],
				lifted[otherIndex],
				mainVariable
			).gcd;
			if (!gcd.isConstant()) {
				return null;
			}
		}
	}

	for (let tailIndex = 0; tailIndex < variables.length - 1; tailIndex++) {
		const tailVariable = variables[tailIndex + 1];
		let stageTarget = target;
		for (
			let laterIndex = tailIndex + 1;
			laterIndex < evaluationValues.length;
			laterIndex++
		) {
			stageTarget = stageTarget.evaluateVariable(
				variables[laterIndex + 1],
				evaluationValues[laterIndex]
			);
		}

		const specializedTarget = stageTarget.evaluateVariable(
			tailVariable,
			evaluationValues[tailIndex]
		);
		if (
			!productModularFactors(
				lifted,
				target.variableCount,
				prime
			).equals(specializedTarget)
		) {
			return null;
		}

		const seeds = buildMultivariateHenselSeeds(
			leadingCoefficients,
			evaluationValues,
			lifted,
			variables,
			tailIndex,
			prime
		);
		if (seeds === null) {
			return null;
		}
		lifted = [...seeds];

		const tail = ModularSparsePolynomial.variable(
			target.variableCount,
			prime,
			tailVariable
		);
		const shift = tail.subtract(
			ModularSparsePolynomial.constant(
				target.variableCount,
				prime,
				evaluationValues[tailIndex]
			)
		);
		const tailDegree = stageTarget.degree(tailVariable) ?? 0n;
		const baseFactors = lifted.map(factor =>
			factor.evaluateVariable(
				tailVariable,
				evaluationValues[tailIndex]
			)
		);

		for (let order = 1n; order <= tailDegree; order++) {
			const residual = stageTarget.subtract(
				productModularFactors(lifted, target.variableCount, prime)
			);
			if (residual.isZero()) {
				break;
			}

			const derivative = modularDerivativeOrder(
				residual,
				tailVariable,
				order
			).evaluateVariable(
				tailVariable,
				evaluationValues[tailIndex]
			);
			const factorialInverse = invMod(
				factorialModulo(order, prime),
				prime
			);
			if (factorialInverse < 0n) {
				return null;
			}
			const correctionTarget = derivative.scale(factorialInverse);
			if (correctionTarget.isZero()) {
				continue;
			}

			const corrections = solveMultivariateDiophantine(
				baseFactors,
				correctionTarget,
				mainVariable,
				variables.slice(1, tailIndex + 1),
				evaluationValues.slice(0, tailIndex),
				maxTailDegree
			);
			if (corrections === null) {
				return null;
			}
			const shiftPower = shift.pow(order);
			lifted = lifted.map((factor, index) =>
				factor.add(corrections[index].multiply(shiftPower))
			);
		}

		if (
			!productModularFactors(
				lifted,
				target.variableCount,
				prime
			).equals(stageTarget)
		) {
			return null;
		}
	}

	if (
		!productModularFactors(
			lifted,
			target.variableCount,
			prime
		).equals(target)
	) {
		return null;
	}

	return lifted.map(factor =>
		factor.toSymmetricIntegerPolynomial()
			.primitivePart()
			.normalizeLeadingSign('lex')
	);
}

function liftFactorGroup(
	target: ModularSparsePolynomial,
	prime: bigint,
	primeFactors: readonly ModularSparsePolynomial[],
	variableIndex: number,
	targetModulus: bigint
): ModularSparsePolynomial[] {
	if (primeFactors.length === 1) {
		const targetAtModulus = changeModulus(target, targetModulus);
		const leading = targetAtModulus.leadingTerm();
		if (leading === null) {
			throw new RangeError(message('polyHenselZeroFactorGroup'));
		}
		const inverse = invMod(leading.coefficient, targetModulus);
		if (inverse < 0n) {
			throw new RangeError(
				message('polyRequires', { operation: 'Hensel lifting', requirement: message('polyReqInvertibleLeadingCoefficient') })
			);
		}
		return [targetAtModulus.scale(inverse)];
	}

	const split = Math.floor(primeFactors.length / 2);
	const leftPrimeFactors = primeFactors.slice(0, split);
	const rightPrimeFactors = primeFactors.slice(split);
	const targetPrime = changeModulus(target, prime);
	const targetLeading = targetPrime.leadingTerm();
	if (targetLeading === null) {
		throw new RangeError(message('polyHenselCannotLiftZero'));
	}

	const leftProduct = productModularFactors(
		leftPrimeFactors,
		target.variableCount,
		prime
	).scale(targetLeading.coefficient);
	const rightProduct = productModularFactors(
		rightPrimeFactors,
		target.variableCount,
		prime
	);
	const bezout = modularExtendedGcdUnivariate(
		leftProduct,
		rightProduct,
		variableIndex
	);
	if (!bezout.gcd.isConstant()) {
		throw new RangeError(message('polyRequires', { operation: 'Hensel lifting', requirement: message('polyReqPairwiseCoprimeModularFactors') }));
	}

	let state: HenselPairState = {
		g: leftProduct,
		h: rightProduct,
		s: bezout.leftCoefficient,
		t: bezout.rightCoefficient,
	};
	while (state.g.modulus < targetModulus) {
		state = henselPairStep(target, state);
	}
	if (state.g.modulus !== targetModulus) {
		throw new Error(message('polyHenselModulusExceeded'));
	}

	return [
		...liftFactorGroup(
			state.g,
			prime,
			leftPrimeFactors,
			variableIndex,
			targetModulus
		),
		...liftFactorGroup(
			state.h,
			prime,
			rightPrimeFactors,
			variableIndex,
			targetModulus
		),
	];
}

/**
 * Lifts pairwise-coprime monic factors from F_p[x] to a larger prime-power modulus.
 *
 * The achieved modulus is obtained by repeated quadratic Hensel steps, so callers
 * should pass a prime power of the form p^(2^k). The lifted factors remain monic and
 * reconstruct the integer polynomial after multiplication by its leading coefficient.
 */
export function henselLiftUnivariateFactors(
	polynomial: SparsePolynomial,
	prime: bigint,
	factors: readonly ModularSparsePolynomial[],
	variableIndex: number,
	targetModulus: bigint
): readonly ModularSparsePolynomial[] {
	if (!isPrimeBig(prime)) {
		throw new RangeError(message('polyRequires', { operation: 'Hensel lifting', requirement: message('polyReqPrimeBaseModulus') }));
	}
	if (factors.length === 0) {
		throw new RangeError(message('polyRequires', { operation: 'Hensel lifting', requirement: message('polyReqAtLeastOneModularFactor') }));
	}
	if (targetModulus < prime) {
		throw new RangeError(
			message('polyHenselTargetNotSmaller')
		);
	}

	polynomial.degree(variableIndex);
	for (const activeVariable of polynomial.variables()) {
		if (activeVariable !== variableIndex) {
			throw new RangeError(message('polyRequires', { operation: 'Hensel lifting', requirement: message('polyReqUnivariateIntegerPolynomial') }));
		}
	}

	for (const factor of factors) {
		if (
			factor.variableCount !== polynomial.variableCount ||
			factor.modulus !== prime
		) {
			throw new RangeError(
				message('polyRequires', { operation: 'Hensel lifting', requirement: message('polyReqFactorsSameRingAndPrime') })
			);
		}
		for (const activeVariable of factor.variables()) {
			if (activeVariable !== variableIndex) {
				throw new RangeError(message('polyRequires', { operation: 'Hensel lifting', requirement: message('polyReqUnivariateFactors') }));
			}
		}
		if (!factor.equals(factor.monic())) {
			throw new RangeError(message('polyRequires', { operation: 'Hensel lifting', requirement: message('polyReqMonicModularFactors') }));
		}
	}

	let expectedModulus = prime;
	while (expectedModulus < targetModulus) {
		expectedModulus *= expectedModulus;
	}
	if (expectedModulus !== targetModulus) {
		throw new RangeError(
			message('polyHenselTargetRepeatedSquaring')
		);
	}

	const polynomialPrime = integerPolynomialModulo(polynomial, prime);
	const leading = polynomialPrime.leadingTerm();
	if (leading === null) {
		throw new RangeError(message('polyCannotFactorZeroPolynomial', { operation: 'Hensel lifting' }));
	}
	if (invMod(leading.coefficient, prime) < 0n) {
		throw new RangeError(
			message('polyRequires', { operation: 'Hensel lifting', requirement: message('polyReqIntegerLeadingCoefficientInvertible') })
		);
	}

	const modularProduct = productModularFactors(
		factors,
		polynomial.variableCount,
		prime
	).scale(leading.coefficient);
	if (!modularProduct.equals(polynomialPrime)) {
		throw new RangeError(
			message('polyHenselFactorsReconstructModuloBase')
		);
	}

	const target = integerPolynomialModulo(polynomial, targetModulus);
	const lifted = liftFactorGroup(
		target,
		prime,
		factors,
		variableIndex,
		targetModulus
	);
	const targetLeading = target.leadingTerm();
	if (targetLeading === null) {
		throw new Error(message('polyHenselLeadingLost'));
	}
	const reconstructed = productModularFactors(
		lifted,
		polynomial.variableCount,
		targetModulus
	).scale(targetLeading.coefficient);
	if (!reconstructed.equals(target)) {
		throw new Error(message('polyHenselReconstructionFailed'));
	}

	return lifted;
}

/**
 * Factors a square-free univariate polynomial over a prime field with Berlekamp's method.
 *
 * The result contains monic irreducible factors whose product is the monic input.
 * Constants return an empty list.
 */
export function factorSquareFreeUnivariateFiniteField(
	polynomial: ModularSparsePolynomial,
	variableIndex: number
): readonly ModularSparsePolynomial[] {
	const degree = assertSquareFreeUnivariate(polynomial, variableIndex);
	if (degree === 0) {
		return [];
	}

	const input = polynomial.monic();
	if (degree === 1) {
		return [input];
	}

	const x = ModularSparsePolynomial.variable(
		input.variableCount,
		input.modulus,
		variableIndex
	);
	const xToP = polynomialPowMod(x, input.modulus, input);
	const matrix = Array.from({ length: degree }, () =>
		new Array<bigint>(degree).fill(0n)
	);
	let columnPolynomial = ModularSparsePolynomial.constant(
		input.variableCount,
		input.modulus,
		1n
	);

	for (let column = 0; column < degree; column++) {
		for (let row = 0; row < degree; row++) {
			const exponents = new Array<bigint>(input.variableCount).fill(0n);
			exponents[variableIndex] = BigInt(row);
			matrix[row][column] = columnPolynomial.coefficient(exponents);
		}
		matrix[column][column] = mod(matrix[column][column] - 1n, input.modulus);
		columnPolynomial = polynomialRemainder(columnPolynomial.multiply(xToP), input);
	}

	const kernel = nullspaceModulo(matrix, input.modulus);
	if (kernel.length <= 1) {
		return [input];
	}

	let factors: ModularSparsePolynomial[] = [input];
	for (const vector of kernel) {
		if (factors.length >= kernel.length) {
			break;
		}

		const splitter = vectorPolynomial(
			vector,
			input.variableCount,
			input.modulus,
			variableIndex
		);
		if (splitter.isConstant()) {
			continue;
		}

		let residue = 0n;
		while (residue < input.modulus && factors.length < kernel.length) {
			const shifted = splitter.subtract(
				ModularSparsePolynomial.constant(
					input.variableCount,
					input.modulus,
					residue
				)
			);
			const refined: ModularSparsePolynomial[] = [];

			for (const factor of factors) {
				const factorDegree = factor.degree(variableIndex);
				if (factorDegree === null || factorDegree <= 1n) {
					refined.push(factor);
					continue;
				}

				const divisor = modularGcdUnivariate(factor, shifted, variableIndex);
				if (divisor.isConstant() || divisor.equals(factor)) {
					refined.push(factor);
					continue;
				}

				const quotient = factor.divideExact(divisor);
				if (quotient === null) {
					throw new Error(message('polyBerlekampNonExactSplit'));
				}
				refined.push(divisor.monic(), quotient.monic());
			}

			factors = refined;
			residue++;
		}
	}

	if (factors.length !== kernel.length) {
		throw new Error(message('polyBerlekampIncompleteSplit'));
	}

	let reconstructed = ModularSparsePolynomial.constant(
		input.variableCount,
		input.modulus,
		1n
	);
	for (const factor of factors) {
		reconstructed = reconstructed.multiply(factor);
	}
	if (!reconstructed.equals(input)) {
		throw new Error(message('polyBerlekampReconstructionFailed'));
	}

	return factors.sort((left, right) => {
		const leftDegree = left.degree(variableIndex) ?? 0n;
		const rightDegree = right.degree(variableIndex) ?? 0n;
		if (leftDegree !== rightDegree) {
			return leftDegree < rightDegree ? -1 : 1;
		}
		const leftTerms = left.terms();
		const rightTerms = right.terms();
		const count = Math.min(leftTerms.length, rightTerms.length);
		for (let index = 0; index < count; index++) {
			const leftExponent = leftTerms[index].exponents[variableIndex];
			const rightExponent = rightTerms[index].exponents[variableIndex];
			if (leftExponent !== rightExponent) {
				return leftExponent < rightExponent ? -1 : 1;
			}
			if (leftTerms[index].coefficient !== rightTerms[index].coefficient) {
				return leftTerms[index].coefficient < rightTerms[index].coefficient ? -1 : 1;
			}
		}
		return leftTerms.length - rightTerms.length;
	});
}
