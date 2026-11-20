import { Expression } from '../../core/classes/expression/Expression';
import { Polynomial } from '../../core/classes/polynomial/Polynomial';

export const MAX_INTEGRATION_DEPTH = 10;

/**
 * The factors of a product, with integer powers spread over nested products, as in
 * 1/(x*sqrt(Q)) = x^-1*Q^(-1/2) or x*((1+x)*sqrt(Q))^-1. The product's own multiplier is
 * left to the caller; multipliers of nested products become constant factors.
 */
export function spreadFactors(value: Expression): Expression[] {
	if (!value.isProduct() || !value.getPower().isInteger()) {
		return [value];
	}
	const power = value.getPower();
	return value.elementsArray().flatMap(factor => {
		const raised = factor.pow(power);
		const multiplier = raised.isProduct() ? raised.getMultiplier() : undefined;
		const constant =
			multiplier && !multiplier.isOne() ? [Expression.fromRational(multiplier)] : [];
		return [...constant, ...spreadFactors(raised)];
	});
}

/**
 * The coefficients of a polynomial in one variable, lowest degree first, as in [c, b, a]
 * for a*x^2+b*x+c, or undefined when the expression is not a polynomial in it.
 */
export function polynomialCoefficients(
	expr: Expression,
	variable: string
): Expression[] | undefined {
	try {
		return new Polynomial(expr, [variable]).toArray(false, variable);
	} catch {
		return undefined;
	}
}

/** Returns whether `expr` contains a variable-dependent function or exponential. */
export function hasTranscendental(expr: Expression, v: string): boolean {
	if (expr.isFunction() && expr.hasVariable(v)) {
		return true;
	}

	if (expr.isEXP() && expr.hasVariable(v)) {
		return true;
	}

	let found = false;
	if (expr.isProduct() || expr.isSum()) {
		expr.each((child: Expression) => {
			if (hasTranscendental(child, v)) {
				found = true;
			}
		});
	}

	return found;
}

/** Whether an expression is a quotient of two polynomials in the variable. */
export function isRationalFunction(expr: Expression, variable: string): boolean {
	return (
		polynomialCoefficients(expr.getNumerator(), variable) !== undefined &&
		polynomialCoefficients(expr.getDenominator(), variable) !== undefined
	);
}
