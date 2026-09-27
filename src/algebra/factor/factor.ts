import { Dictionary } from '../../core/classes/dictionary/Dictionary';
import { normalizeMultiplierDenominators } from '../../core/classes/expression/analysis';
import { Expression } from '../../core/classes/expression/Expression';
import { zero } from '../../core/classes/expression/shortcuts';
import { FACTOR } from '../../core/classes/parser/constants';
import { merge } from '../../core/classes/parser/operations/multiply';
import {
	expressionToSparsePolynomial,
	sparsePolynomialToExpression,
} from '../../core/classes/polynomial/SparsePolynomialAdapter';
import { Vector } from '../../core/classes/vector/Vector';
import { message, UnexpectedInputError } from '../../core/errors';
import { primeFactorCounts, primeFactorsBig } from '../../core/functions/bigint/primeFactor';
import { uSubConstants, uUnSub } from '../../core/functions/subst';
import { factorUnivariateInteger } from '../polynomial/SparsePolynomialFactor';
import { factorMultivariateInteger } from '../polynomial/SparsePolynomialMultivariateFactor';
import { polynomialize } from '../polynomialize';

import type { ExpressionInput } from '../../core/types';

/**
 * Factors polynomial-like numerator and denominator components of an expression.
 *
 * @remarks
 * The implementation converts polynomial structure to the exact integer-coefficient
 * factorization layer. Irrational constants and function-valued components may be
 * temporarily represented by substitution variables. If the input cannot be handled
 * by that finite polynomial path, the function returns an unevaluated symbolic
 * `factor(input)` expression rather than exposing the internal failure.
 *
 * @param x - Expression-compatible value to factor.
 * @returns A factored expression or an unevaluated symbolic `factor` call.
 */
export function factor(x: ExpressionInput) {
	let retval: Expression;
	try {
		x = Expression.create(x);
		if (x.isZero()) {
			retval = x;
		} else if (x.isNUM() && x.isInteger()) {
			let factoredInteger: Expression | undefined;
			const factorCounts = primeFactorCounts(x.getMultiplier().numerator);
			for (const prime in factorCounts) {
				const primePower = Expression.toEXP(prime, factorCounts[prime]);
				factoredInteger = factoredInteger
					? merge(factoredInteger, primePower)
					: primePower;
			}
			retval = factoredInteger ?? Expression.Number('1');
			if (x.sign() === -1) {
				retval = retval.neg();
			}
		}
		// A variable is already fully factored.
		else if (x.isVAR()) {
			retval = x;
		} else if (x.isFunction()) {
			const multiplier = x.getMultiplier();
			const power = x.getPower();
			retval = Expression.toFunction(
				x.name,
				x.getArguments().map(argument => factor(argument))
			);
			retval = retval.pow(power).times(multiplier);
		} else if (x.isPolynomialLike()) {
			retval = polyFactors(x).prod();
		} else {
			const factored = factors(x);
			retval = factored.numerator.prod().div(factored.denominator.prod());
		}
	} catch {
		retval = Expression.toFunction(FACTOR, [x]);
	}
	return retval;
}

/**
 * Returns the prime factors of a positive integer in ascending order.
 *
 * Repeated factors are retained, so `pfactor(100)` returns `[2, 2, 5, 5]`.
 * The value 1 has no prime factors and returns an empty Vector.
 */
export function pfactor(x: ExpressionInput): Vector {
	const input = Expression.create(x);
	if (!input.isNUM() || !input.isInteger() || input.lte(zero())) {
		throw new UnexpectedInputError(
			message('wrongInput', {
				expected: 'a positive integer',
				received: input.text(),
			})
		);
	}

	const value = input.getMultiplier().numerator;
	if (value === 1n) {
		return new Vector();
	}

	const factors = primeFactorsBig(value).factors.map(factor => Expression.Number(factor));
	return new Vector(factors);
}

/**
 * Returns the prime-factor multiplicities of a positive integer.
 *
 * Dictionary keys are prime numbers in ascending order and values are their occurrence
 * counts. For example, `pfactord(100)` returns `{2 => 2, 5 => 2}`.
 */
export function pfactord(x: ExpressionInput): Dictionary {
	const input = Expression.create(x);
	if (!input.isNUM() || !input.isInteger() || input.lte(zero())) {
		throw new UnexpectedInputError(
			message('wrongInput', {
				expected: 'a positive integer',
				received: input.text(),
			})
		);
	}

	const value = input.getMultiplier().numerator;
	if (value === 1n) {
		return new Dictionary();
	}

	const counts = primeFactorCounts(value);
	const retval = new Dictionary();
	for (const prime of Object.keys(counts).sort((a, b) => {
		const left = BigInt(a);
		const right = BigInt(b);
		return left < right ? -1 : left > right ? 1 : 0;
	})) {
		retval.set(prime, Expression.Number(counts[prime]));
	}

	return retval;
}

/**
 * Factors the numerator of polynomial-like input into Expression factors.
 *
 * @param x - Input whose numerator should be factored.
 * @returns New factor expressions; unsupported input is returned as a one-element array.
 */
export function polyFactorExpressions(x: ExpressionInput): Expression[] {
	let retval: Expression[];
	try {
		const expr = normalizeMultiplierDenominators(Expression.create(x));
		const num = expr.getNumerator();
		const den = expr.getDenominator();
		// Irrational coefficients must first be promoted to variables.
		const [subbed, map] = uSubConstants(num);
		const converted = expressionToSparsePolynomial(subbed);
		const variables = converted.variables;
		const sparse = converted.polynomial;

		if (variables.length === 0) {
			retval = [Expression.Number(sparse.constantTerm())];
		} else {
			const variableIndices = variables.map((_variable, index) => index);
			const factorization =
				variables.length === 1
					? factorUnivariateInteger(sparse, 0)
					: factorMultivariateInteger(sparse, variableIndices);
			retval = [];

			if (factorization.content !== 1n) {
				retval.push(Expression.Number(factorization.content));
			}
			for (const entry of factorization.factors) {
				let factor = sparsePolynomialToExpression(entry.factor, variables);
				if (entry.multiplicity > 1n) {
					factor = factor.pow(Expression.Number(entry.multiplicity));
				}
				retval.push(factor);
			}
			if (retval.length === 0) {
				throw new Error(message('factorizationNoFactors'));
			}
		}

		// Remove the u-substitution and restore the cleared denominator once.
		retval = retval.map(factor => uUnSub(factor, map));
		if (!den.isOne()) {
			retval[0] = retval[0].div(den);
		}
	} catch {
		retval = [Expression.create(x)];
	}
	return retval;
}

/**
 * Wraps the polynomial factor expressions in an ordered {@link Vector}.
 *
 * @param x - Polynomial-like input.
 * @returns A new Vector containing the factor expressions.
 */
export function polyFactors(x: ExpressionInput): Vector {
	const retval = new Vector(polyFactorExpressions(x));
	return retval;
}

/**
 * Factors the polynomialized numerator and denominator separately.
 *
 * @param x - Rational expression to polynomialize and factor.
 * @returns New numerator and denominator factor arrays after reversing temporary substitutions.
 */
export function factorExpressionParts(x: ExpressionInput) {
	const { numerator, denominator, map } = polynomialize(Expression.create(x));

	return {
		numerator: polyFactorExpressions(numerator).map(f => uUnSub(f, map)),
		denominator: polyFactorExpressions(denominator).map(f => uUnSub(f, map)),
	};
}

/**
 * Factors the numerator and denominator separately and returns each factor list as a Vector.
 *
 * @param x - Expression-compatible value to factor.
 * @returns New Vectors for the numerator and denominator factors.
 */
export function factors(x: ExpressionInput) {
	const { numerator, denominator } = factorExpressionParts(x);

	return {
		numerator: new Vector(numerator),
		denominator: new Vector(denominator),
	};
}

/**
 * Returns prime-power factors for the numeric parts of a numerator and denominator.
 *
 * @param x - Numeric or expression-compatible value.
 * @returns Numerator and denominator Vectors. Non-numeric components are kept as single
 * factors instead of being recursively factored.
 */
export function numberFactors(x: ExpressionInput) {
	x = Expression.create(x);
	const numerator = x.getNumerator();
	const denominator = x.getDenominator();

	function factorNumber(num: Expression) {
		if (!num.isNUM()) {
			return new Vector([num]);
		}

		const factors = new Vector();
		const factorCounts = primeFactorCounts(num.getMultiplier().numerator);
		for (const prime in factorCounts) {
			factors.append(Expression.toEXP(prime, factorCounts[prime]));
		}
		return factors;
	}

	return {
		numerator: factorNumber(numerator),
		denominator: factorNumber(denominator),
	};
}
