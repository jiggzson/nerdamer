import { Expression } from '../../core/classes/expression/Expression';
import { Rational } from '../../core/classes/rational/Rational';

import { GaussianRational } from './GaussianRational';

type Coefficients = GaussianRational[];

const MAX_COMPLEX_GCD_DEGREE = 64n;

function trim(coefficients: Coefficients): Coefficients {
	const result = coefficients.slice();
	while (result.length > 0 && result[result.length - 1].isZero()) {
		result.pop();
	}
	return result;
}

function add(left: Coefficients, right: Coefficients): Coefficients {
	const result: Coefficients = [];
	for (let index = 0; index < Math.max(left.length, right.length); index++) {
		result.push((left[index] ?? GaussianRational.zero()).plus(right[index] ?? GaussianRational.zero()));
	}
	return trim(result);
}

function multiply(left: Coefficients, right: Coefficients): Coefficients {
	if (left.length === 0 || right.length === 0) {
		return [];
	}
	const result = Array.from({ length: left.length + right.length - 1 }, () => GaussianRational.zero());
	for (let i = 0; i < left.length; i++) {
		for (let j = 0; j < right.length; j++) {
			result[i + j] = result[i + j].plus(left[i].times(right[j]));
		}
	}
	return trim(result);
}

/**
 * Returns the remainder of polynomial long division over Q(i).
 *
 * Field division cancels each leading term, so a nonzero remainder
 * has degree strictly less than the divisor.
 */
function divideRemainder(left: Coefficients, right: Coefficients): Coefficients {
	let remainder = trim(left);
	while (remainder.length >= right.length && remainder.length !== 0) {
		const degree = remainder.length - right.length;
		const coefficient = remainder[remainder.length - 1].div(right[right.length - 1]);
		const subtract: Coefficients = Array.from({ length: degree + right.length }, () => GaussianRational.zero());
		for (let index = 0; index < right.length; index++) {
			subtract[degree + index] = right[index].times(coefficient);
		}
		remainder = add(remainder, subtract.map(value => GaussianRational.zero().minus(value)));
	}
	return remainder;
}

/**
 * Computes the polynomial Euclidean GCD in Q(i)[x].
 *
 * @remarks
 * Since Q(i) is a field, repeatedly replacing (a,b) by (b,a mod b)
 * preserves their common divisors. The last nonzero remainder is the
 * GCD, divided by its leading coefficient to make it monic.
 *
 * References:
 * - Geddes, Czapor & Labahn (1992), *Algorithms for Computer Algebra*,
 *   chapter 7, "Polynomial GCD Computation", pp. 279–335.
 *   https://doi.org/10.1007/978-0-585-33247-5_7
 * - von zur Gathen & Gerhard (2013), *Modern Computer Algebra*, 3rd ed.,
 *   chapter 3, "The Euclidean Algorithm".
 */
function polynomialGcd(left: Coefficients, right: Coefficients): Coefficients {
	let a = trim(left);
	let b = trim(right);
	while (b.length > 0) {
		const remainder = divideRemainder(a, b);
		a = b;
		b = remainder;
	}
	if (a.length > 0) {
		const lead = a[a.length - 1];
		a = a.map(coefficient => coefficient.div(lead));
	}
	return a;
}

/**
 * Converts a supported expression into ascending-degree Q(i) coefficients.
 *
 * @returns Exact coefficients, or undefined for unsupported structure,
 * negative/fractional exponents, or an individual exponent above 64.
 * This bound does not limit the total degree after multiplication.
 */
function coefficientsOf(expression: Expression, variable: string): Coefficients | undefined {
	const exponent = expression.getPower();
	if (!exponent.isInteger() || exponent.sign() < 0) {
		return undefined;
	}
	const power = exponent.getMultiplier().numerator;
	// Bound the power expansion in this initial implementation (not the total degree).
	if (power > MAX_COMPLEX_GCD_DEGREE) {
		return undefined;
	}
	let base: Coefficients | undefined;
	if (expression.isNUM()) {
		base = [GaussianRational.one()];
	} else if (expression.isI()) {
		base = [new GaussianRational(Rational.create(0n), Rational.create(1n))];
	} else if (expression.isVAR() && expression.value === variable) {
		base = [GaussianRational.zero(), GaussianRational.one()];
	} else if (expression.isSum()) {
		base = [];
		for (const term of expression.elementsArray()) {
			const terms = coefficientsOf(term, variable);
			if (!terms) {
				return undefined;
			}
			base = add(base, terms);
		}
	} else if (expression.isProduct()) {
		base = [GaussianRational.one()];
		for (const factor of expression.elementsArray()) {
			const terms = coefficientsOf(factor, variable);
			if (!terms) {
				return undefined;
			}
			base = multiply(base, terms);
		}
	} else {
		return undefined;
	}
	let result: Coefficients = [GaussianRational.one()];
	for (let index = 0n; index < power; index++) {
		result = multiply(result, base);
	}
	return multiply(result, [GaussianRational.fromReal(expression.getMultiplier())]);
}

function toExpression(coefficients: Coefficients, variable: string): Expression {
	let result = Expression.Number(0);
	const x = Expression.create(variable);
	for (let degree = 0; degree < coefficients.length; degree++) {
		const coefficient = coefficients[degree];
		const real = Expression.fromRational(coefficient.real);
		const imaginary = Expression.Img().times(Expression.fromRational(coefficient.imaginary));
		const factor = real.plus(imaginary);
		if (!coefficient.isZero()) {
			result = result.plus(degree === 0 ? factor : factor.times(x.pow(BigInt(degree).toString())));
		}
	}
	return result;
}

/**
 * Computes a monic univariate polynomial GCD with exact Gaussian-rational coefficients.
 *
 * @remarks
 * The relation i² = -1 is enforced in Q(i), unlike the integer sparse GCD
 * path's temporary substitution of i with an independent variable.
 * Only supported univariate expressions are handled; undefined lets the
 * caller retain its existing polynomial GCD fallback.
 */
export function complexPolynomialGcd(left: Expression, right: Expression): Expression | undefined {
	const variables = new Set([...left.variables(), ...right.variables()].filter(variable => variable !== 'i'));
	if (variables.size !== 1 || (!left.isComplex() && !right.isComplex())) {
		return undefined;
	}
	const variable = [...variables][0];
	const a = coefficientsOf(left, variable);
	const b = coefficientsOf(right, variable);
	return a && b ? toExpression(polynomialGcd(a, b), variable) : undefined;
}
