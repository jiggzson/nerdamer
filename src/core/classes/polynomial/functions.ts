import { Expression } from '../expression/Expression';
import { zero } from '../expression/shortcuts';
import { assertPlainVariableAndGetString } from '../expression/utils';
import { CONTENT, DEG } from '../parser/constants';
import { Vector } from '../vector/Vector';

import { Polynomial } from './Polynomial';
import { divide as polynomialDivide } from './utils';

import type { ExpressionInput } from '../../types';

/**
 * Returns the degree of a polynomial expression.
 *
 * @remarks
 * With no variable, `deg(p)` returns the total degree: the largest sum of powers in any
 * term. With a variable, `deg(p, x)` returns the largest power of `x`, treating the other
 * variables as coefficients. If the input cannot be converted to a polynomial, the call
 * remains symbolic instead of throwing.
 *
 * @param x - Expression-like input or polynomial to inspect.
 * @param variable - Optional variable whose degree should be returned.
 * @returns A numeric expression for polynomial input, otherwise an unevaluated `deg(...)` call.
 *
 * @example
 * ```ts
 * deg('x^2*y^3+x').text();      // "5"
 * deg('x^2*y^3+x', 'x').text(); // "2"
 * deg('x^2*y^3+x', 'y').text(); // "3"
 * ```
 */
export function deg(x: ExpressionInput | Polynomial, variable?: ExpressionInput) {
	let variableExpression: Expression | undefined;
	let variableName: string | undefined;

	if (variable !== undefined) {
		variableExpression = Expression.create(variable);
		variableName = assertPlainVariableAndGetString(variableExpression);
	}

	let retval: Expression | undefined = undefined;
	try {
		const polynomial = Polynomial.isPolynomial(x) ? x : new Polynomial(x);
		retval = Expression.create(polynomial.deg(variableName));
	} catch {}

	const input = Polynomial.isPolynomial(x) ? x.getExpression() : x;
	const args = variableExpression === undefined ? [input] : [input, variableExpression];
	return retval ?? Expression.toFunction(DEG, args);
}

/**
 * Returns the exact numeric content of polynomial expression input.
 *
 * @remarks
 * Content means the greatest common divisor of the polynomial's numeric coefficients.
 * For example, the content of `6*x^2+15*x*y-3*y` is `3`. This function does not choose
 * a main variable or compute a polynomial-valued GCD of symbolic coefficient expressions.
 * If expression conversion fails, the operation remains symbolic as `content(input)`.
 *
 * @param x - Expression-like input or polynomial to inspect.
 * @returns A numeric expression for converted input, otherwise an unevaluated symbolic
 * `content` call.
 *
 * @example
 * ```ts
 * content('6*x^2+15*x-3').text(); // "3"
 * ```
 */
export function content(x: ExpressionInput | Polynomial) {
	let retval: Expression | undefined = undefined;
	try {
		const polynomial = Polynomial.isPolynomial(x) ? x : new Polynomial(x);
		retval = Expression.create(polynomial.content());
	} catch {}

	return retval ?? Expression.toFunction(CONTENT, [Polynomial.isPolynomial(x) ? x.getExpression() : x]);
}

/**
 * Returns the quotient and remainder of polynomial division.
 *
 * @remarks
 * This is the parser-facing compatibility behavior historically exposed as `div(a,b)`.
 * It delegates to the existing polynomial division implementation. When more than one
 * variable is present, Nerdamer treats the input as a multivariable polynomial rather than
 * silently choosing one variable and treating the others as coefficients. If either input
 * is not polynomial-like, the legacy fallback is preserved as `[0, dividend]`. Once both
 * inputs are polynomial, failures from the division engine are allowed to propagate.
 */
export function div(dividend: ExpressionInput, divisor: ExpressionInput) {
	const numerator = Expression.create(dividend);
	const denominator = Expression.create(divisor);
	let retval: Vector;

	if (numerator.isPolynomialLike() && denominator.isPolynomialLike()) {
		const [quotient, remainder] = polynomialDivide(numerator, denominator);
		retval = new Vector([quotient, remainder]);
	} else {
		retval = new Vector([zero(), numerator]);
	}

	return retval;
}

/**
 * Divides two expressions using polynomial quotient/remainder reconstruction when possible.
 *
 * @remarks
 * This restores the parser-facing compatibility behavior historically exposed as
 * `divide(a,b)`: a successful polynomial division is returned as
 * `quotient + remainder/divisor`, so the result is a reusable symbolic expression. When
 * more than one variable is present, Nerdamer treats the input as a multivariable polynomial
 * rather than silently choosing a main variable. Inputs outside the polynomial domain fall
 * back to ordinary symbolic division. Once both inputs are polynomial, failures from the
 * division engine are allowed to propagate.
 */
export function divide(dividend: ExpressionInput, divisor: ExpressionInput) {
	const numerator = Expression.create(dividend);
	const denominator = Expression.create(divisor);
	let retval: Expression;

	if (numerator.isPolynomialLike() && denominator.isPolynomialLike()) {
		const [quotient, remainder] = polynomialDivide(numerator, denominator);
		retval = quotient.plus(remainder.div(denominator));
	} else {
		retval = numerator.div(denominator);
	}

	return retval;
}
