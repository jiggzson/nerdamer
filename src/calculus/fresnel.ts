import { Expression } from '../core/classes/expression/Expression';
import { FRESNEL_C, FRESNEL_S } from '../core/classes/parser/constants';
import { fresnelC, fresnelS } from '../core/functions/fresnelNumeric';

import type { ExpressionInput } from '../core/types';

type FresnelFunctionName = typeof FRESNEL_S | typeof FRESNEL_C;

/** Evaluates a Fresnel integral numerically when the argument can be resolved to a real number. */
function fresnel(x: ExpressionInput, name: FresnelFunctionName): Expression {
	const argument = Expression.create(x);
	const evaluated = argument.isNUM() ? argument : argument.evaluate();

	let retval: Expression;
	if (evaluated.isNUM()) {
		const value = Number(evaluated.getMultiplier().toDecimal());
		retval = Expression.create(name === FRESNEL_S ? fresnelS(value) : fresnelC(value));
	} else {
		retval = Expression.toFunction(name, [argument]);
	}

	return retval;
}

/**
 * Computes the normalized Fresnel sine integral
 * `S(x) = integral(sin(pi*t^2/2), t, 0, x)`.
 *
 * Numeric real arguments are evaluated numerically. Symbolic arguments remain as `S(x)`.
 */
export function S(x: ExpressionInput): Expression {
	return fresnel(x, FRESNEL_S);
}

/**
 * Computes the normalized Fresnel cosine integral
 * `C(x) = integral(cos(pi*t^2/2), t, 0, x)`.
 *
 * Numeric real arguments are evaluated numerically. Symbolic arguments remain as `C(x)`.
 */
export function C(x: ExpressionInput): Expression {
	return fresnel(x, FRESNEL_C);
}
