import { Expression } from '../expression/Expression';

import { Polynomial } from './Polynomial';

import type { ExpressionInputType } from '../parser/types';

/**
 * Retrieves the degree of the polynomial. If the expression is not a polynomial, a symbolic value is returned.
 * @param x The expression or polynomial
 * @returns The degree of polynomial
 *
 * @example
 * ```ts
 * deg('x^2+2*x+1'); // 2
 * ``
 */
export function deg(x: ExpressionInputType | Polynomial) {
	let retval: Expression | undefined = undefined;
	if (!Polynomial.isPolynomial(x)) {
		try {
			x = new Polynomial(x);
			retval = Expression.create(x.deg());
		} catch {}
	}

	return retval ?? Expression.toFunction('deg', [x.toString()]);
}

/**
 * Retrieves the content of the polynomial. If the expression is not a polynomial, a symbolic value is returned.
 * @param x The expression or polynomial
 * @returns The content of polynomial
 *
 * @example
 * ```ts
 * content('6*x^2+15*x-3'); // 3
 * ``
 */
export function content(x: ExpressionInputType | Polynomial) {
	let retval: Expression | undefined = undefined;
	if (!Polynomial.isPolynomial(x)) {
		try {
			x = new Polynomial(x);
			retval = Expression.create(x.content());
		} catch {}
	}

	return retval ?? Expression.toFunction('content', [x.toString()]);
}
