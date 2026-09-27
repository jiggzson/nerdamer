import { Expression } from '../../core/classes/expression/Expression';
import { assertPlainVariableAndGetString } from '../../core/classes/expression/utils';
import { DEFINT } from '../../core/classes/parser/constants';
import { definiteIntegrateNative } from './defintNative';

import type { ExpressionInput } from '../../core/types';

const NATIVE_DEFINITE_INTEGRATION_PRECISION = 17;

/**
 * Calculates the definite integral using Adaptive Simpson. Note that this function uses
 * native JS number due to severe computational overhead when implemented with Decimal.js.
 *
 * @param f The function being integrated
 * @param dx The variable of integration
 * @param from The lower limit of the integral
 * @param to The upper limit of the integral
 * @returns The numeric value if possible else a symbolic function
 *
 * @example
 * ```ts
 * defint('cos(x)-x^2+6', 'x', 1, 6); // -42.787553149673464
 * ```
 */
export function defint(
	f: ExpressionInput,
	dx: ExpressionInput,
	from: ExpressionInput,
	to: ExpressionInput
) {
	let retval: Expression;
	f = Expression.create(f);
	dx = Expression.create(dx);
	from = Expression.create(from);
	to = Expression.create(to);

	const inputVars = f.variables();
	// Get the variable
	const v = assertPlainVariableAndGetString(dx);
	// Pull factors that are constant with respect to the integration variable across the bounds.
	if (!inputVars.includes(v)) {
		retval = f.times(to.minus(from));
	} else {
		let numericFrom = from;
		let numericTo = to;

		if (!numericFrom.isNUM() && numericFrom.isConstant()) {
			numericFrom = numericFrom.evaluate();
		}
		if (!numericTo.isNUM() && numericTo.isConstant()) {
			numericTo = numericTo.evaluate();
		}

		if (
			inputVars.length === 1 &&
			inputVars[0] === v &&
			numericFrom.isNUM() &&
			numericTo.isNUM()
		) {
			const a = Number(numericFrom.getMultiplier().toDecimal());
			const b = Number(numericTo.getMultiplier().toDecimal());
			retval = Expression.create(definiteIntegrateNative(f.buildFunction(), a, b));
			retval.precision = NATIVE_DEFINITE_INTEGRATION_PRECISION; // Mark it as limited precision
		} else {
			retval = Expression.toFunction(DEFINT, [f, dx, from, to]);
		}
	}

	return retval;
}
