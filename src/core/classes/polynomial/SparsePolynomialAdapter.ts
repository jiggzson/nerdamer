/**
 * @module sparsePolynomialAdapter
 *
 * Conversion from Nerdamer's expression-facing polynomial forms to the exact
 * integer sparse polynomial representation.
 */

import { message, PolynomialError } from '../../errors';
import { GCD as bigintGCD, LCM } from '../../functions/bigint/bigint';
import { Expression } from '../expression/Expression';
import { zero } from '../expression/shortcuts';

import { SparsePolynomial } from './SparsePolynomial';

import type { Polynomial } from './Polynomial';

/**
 * Converts an integer-coefficient polynomial expression directly to sparse form.
 *
 * Sums, products, and non-negative integer powers are evaluated with sparse
 * polynomial arithmetic, so callers do not need to construct the legacy Polynomial
 * representation first. Variables are ordered by ascending degree and then by name.
 */
export function expressionToSparsePolynomial(
	expression: Expression
): Readonly<{ polynomial: SparsePolynomial; variables: readonly string[] }> {
	const sourceVariables = expression.variables().sort();
	const variableIndices = new Map(
		sourceVariables.map((variable, index) => [variable, index])
	);

	function powerOf(current: Expression): bigint {
		const power = current.getPower();
		if (!power.isInteger() || power.sign() < 0) {
			throw new PolynomialError(message('notAPolynomial'));
		}
		return power.getMultiplier().numerator;
	}

	function integerMultiplier(current: Expression): bigint {
		const multiplier = current.getMultiplier();
		if (multiplier.denominator !== 1n) {
			throw new Error(message('integerRequired'));
		}
		return multiplier.numerator;
	}

	function convert(current: Expression): SparsePolynomial {
		const variableCount = sourceVariables.length;

		if (current.isNUM()) {
			return SparsePolynomial.constant(
				variableCount,
				integerMultiplier(current)
			);
		}

		if (current.isVAR()) {
			const variableIndex = variableIndices.get(current.value);
			if (variableIndex === undefined) {
				throw new PolynomialError(message('notAPolynomial'));
			}
			const exponents = new Array<bigint>(variableCount).fill(0n);
			exponents[variableIndex] = powerOf(current);
			return SparsePolynomial.monomial(
				variableCount,
				integerMultiplier(current),
				exponents
			);
		}

		if (current.isSum()) {
			let sum = SparsePolynomial.zero(variableCount);
			for (const term of current.elementsArray()) {
				sum = sum.add(convert(term));
			}
			return sum.pow(powerOf(current)).scale(integerMultiplier(current));
		}

		if (current.isProduct()) {
			let product = SparsePolynomial.constant(variableCount, 1n);
			for (const factor of current.elementsArray()) {
				product = product.multiply(convert(factor));
			}
			return product.pow(powerOf(current)).scale(integerMultiplier(current));
		}

		throw new PolynomialError(message('notAPolynomial'));
	}

	const source = convert(expression);
	const order = sourceVariables
		.map((variable, index) => ({
			variable,
			index,
			degree: source.degree(index) ?? 0n,
		}))
		.sort((left, right) => {
			if (left.degree < right.degree) {
				return -1;
			}
			if (left.degree > right.degree) {
				return 1;
			}
			return left.variable.localeCompare(right.variable);
		});
	const variables = order.map(entry => entry.variable);

	if (order.every((entry, index) => entry.index === index)) {
		return { polynomial: source, variables };
	}

	const terms = source.terms().map(term => ({
		coefficient: term.coefficient,
		exponents: order.map(entry => term.exponents[entry.index]),
	}));

	return {
		polynomial: new SparsePolynomial(source.variableCount, terms),
		variables,
	};
}

/**
 * Converts a rational-coefficient polynomial expression directly to integer sparse form.
 *
 * The supplied variables define the sparse ring coordinates. Rational denominators are
 * carried separately while sums, products, and non-negative integer powers are evaluated,
 * then reduced against common integer coefficient content.
 */
export function expressionToIntegerSparsePolynomial(
	expression: Expression,
	variables: readonly string[]
): Readonly<{ polynomial: SparsePolynomial; denominator: bigint }> {
	const selected = new Set<string>();
	for (const variable of variables) {
		if (selected.has(variable)) {
			throw new RangeError(message('sparseAdapterVariablesUnique'));
		}
		selected.add(variable);
	}

	for (const variable of expression.variables()) {
		if (!selected.has(variable)) {
			throw new RangeError(
				message('sparseAdapterVariablesIncludeEvery')
			);
		}
	}

	const variableCount = variables.length;
	const variableIndices = new Map(
		variables.map((variable, index) => [variable, index])
	);

	function powerOf(current: Expression): bigint {
		const power = current.getPower();
		if (!power.isInteger() || power.sign() < 0) {
			throw new PolynomialError(message('notAPolynomial'));
		}
		return power.getMultiplier().numerator;
	}

	function normalize(
		polynomial: SparsePolynomial,
		denominator: bigint
	): Readonly<{ polynomial: SparsePolynomial; denominator: bigint }> {
		if (polynomial.isZero()) {
			return { polynomial, denominator: 1n };
		}

		const divisor = bigintGCD(polynomial.content(), denominator);
		return divisor === 1n
			? { polynomial, denominator }
			: {
					polynomial: polynomial.divideByScalarExact(divisor),
					denominator: denominator / divisor,
				};
	}

	function applyPowerAndMultiplier(
		current: Expression,
		polynomial: SparsePolynomial,
		denominator: bigint
	): Readonly<{ polynomial: SparsePolynomial; denominator: bigint }> {
		const exponent = powerOf(current);
		const multiplier = current.getMultiplier();
		return normalize(
			polynomial.pow(exponent).scale(multiplier.numerator),
			denominator ** exponent * multiplier.denominator
		);
	}

	function convert(
		current: Expression
	): Readonly<{ polynomial: SparsePolynomial; denominator: bigint }> {
		const multiplier = current.getMultiplier();

		if (current.isNUM()) {
			return normalize(
				SparsePolynomial.constant(variableCount, multiplier.numerator),
				multiplier.denominator
			);
		}

		if (current.isVAR()) {
			const variableIndex = variableIndices.get(current.value);
			if (variableIndex === undefined) {
				throw new PolynomialError(message('notAPolynomial'));
			}
			const exponents = new Array<bigint>(variableCount).fill(0n);
			exponents[variableIndex] = powerOf(current);
			return normalize(
				SparsePolynomial.monomial(
					variableCount,
					multiplier.numerator,
					exponents
				),
				multiplier.denominator
			);
		}

		if (current.isSum()) {
			let polynomial = SparsePolynomial.zero(variableCount);
			let denominator = 1n;

			for (const term of current.elementsArray()) {
				const converted = convert(term);
				const commonDenominator = LCM(denominator, converted.denominator);
				polynomial = polynomial
					.scale(commonDenominator / denominator)
					.add(
						converted.polynomial.scale(
							commonDenominator / converted.denominator
						)
					);
				denominator = commonDenominator;
			}

			return applyPowerAndMultiplier(current, polynomial, denominator);
		}

		if (current.isProduct()) {
			let polynomial = SparsePolynomial.constant(variableCount, 1n);
			let denominator = 1n;

			for (const factor of current.elementsArray()) {
				const converted = convert(factor);
				polynomial = polynomial.multiply(converted.polynomial);
				denominator *= converted.denominator;
			}

			return applyPowerAndMultiplier(current, polynomial, denominator);
		}

		throw new PolynomialError(message('notAPolynomial'));
	}

	const converted = convert(expression);
	const terms = [...converted.polynomial.terms()].sort((left, right) =>
		-SparsePolynomial.compareMonomials(left.exponents, right.exponents, 'lex')
	);

	return {
		polynomial: new SparsePolynomial(variableCount, terms),
		denominator: converted.denominator,
	};
}

/**
 * Converts a Polynomial with rational numeric coefficients to an integer sparse
 * polynomial by clearing one common positive denominator.
 *
 * The supplied variables define the sparse ring coordinates and must include every
 * variable in the polynomial.
 */
export function polynomialToIntegerSparsePolynomial(
	polynomial: Polynomial,
	variables: readonly string[]
): Readonly<{ polynomial: SparsePolynomial; denominator: bigint }> {
	return expressionToIntegerSparsePolynomial(polynomial.getExpression(), variables);
}

/**
 * Converts a Polynomial to an exact sparse polynomial over the integers.
 *
 * Coefficients must already be integers; use
 * {@link polynomialToIntegerSparsePolynomial} when rational coefficients should be
 * cleared first.
 */
export function polynomialToSparsePolynomial(
	polynomial: Polynomial,
	variables: readonly string[]
): SparsePolynomial {
	const converted = polynomialToIntegerSparsePolynomial(polynomial, variables);
	if (converted.denominator !== 1n) {
		throw new Error(message('integerRequired'));
	}
	return converted.polynomial;
}

/**
 * Converts an exact sparse polynomial directly to an Expression.
 *
 * Conversion does not pass through Polynomial, so bigint exponents remain exact.
 */
export function sparsePolynomialToExpression(
	polynomial: SparsePolynomial,
	variables: readonly string[]
): Expression {
	if (variables.length !== polynomial.variableCount) {
		throw new RangeError(
			message('sparseExpressionConversionNameCount')
		);
	}

	let result = zero();
	for (const term of polynomial.terms()) {
		let expression = Expression.Number(term.coefficient);
		for (let variableIndex = 0; variableIndex < variables.length; variableIndex++) {
			const exponent = term.exponents[variableIndex];
			if (exponent === 0n) {
				continue;
			}

			const variable = Expression.Variable(variables[variableIndex]);
			expression = expression.times(
				exponent === 1n ? variable : variable.pow(Expression.Number(exponent))
			);
		}
		result = result.plus(expression);
	}

	return result;
}
