import { Expression } from '../core/classes/expression/Expression';
import { zero } from '../core/classes/expression/shortcuts';
import { ABS, DIFF, SGN, TAYLOR } from '../core/constants/functionNames';
import { mathFunctionRegistry } from '../core/dispatch';
import {
	DivisionByZeroError,
	MathError,
	message,
	ParserError,
	UndefinedError,
	UnexpectedInputError,
	UnsupportedOperationError,
} from '../core/errors';
import { scopedBlock } from '../core/Settings';

import { diff } from './derivative/diff';

import type { ExpressionInput } from '../core/types';

// Cap derivative work without limiting the degree of polynomials that terminate early.
const MAX_DERIVATIVES = 64;

/**
 * Constructs a finite Taylor polynomial about a center, through the specified degree.
 *
 * Derivatives and coefficients are computed symbolically. If a derivative cannot be
 * resolved, a coefficient is undefined, or the work budget is exhausted, the entire
 * call is preserved as an unevaluated taylor(...) rather than returning a partial series.
 */
export function taylor(
	input: ExpressionInput,
	variable: ExpressionInput,
	center: ExpressionInput,
	order: ExpressionInput
): Expression {
	const expr = Expression.create(input);
	const symbol = Expression.create(variable);
	const at = Expression.create(center);
	const degree = Expression.create(order);
	let retval: Expression | undefined;

	if (degree.isNUM() && (!degree.isInteger() || degree.lt(zero()))) {
		throw new UnexpectedInputError(message('wrongInput', {
			expected: 'a nonnegative integer Taylor degree',
			received: degree.text(),
		}));
	}

	// Only attempt expansion when the variable and center are suitable and the
	// differentiation engine can interpret all functions in the expression.
	if (
		symbol.isPlainVariable() &&
		!at.hasVariable(symbol.text()) &&
		degree.isInteger() &&
		!expr.hasFunction(ABS, true) &&
		!expr.hasFunction(SGN, true) &&
		!expr.functions().some(name => !mathFunctionRegistry[name])
	) {
		// An exact polynomial can terminate early even for a large requested degree.
		retval = scopedBlock('EVALUATE', false, () => {
			let derivative = expr;
			let result = zero();
			let factorial = 1n;
			let complete = true;
			const shift = symbol.minus(at);
			const degreeBig = degree.getMultiplier().numerator;
			const iterations = degreeBig < BigInt(MAX_DERIVATIVES) ? Number(degreeBig) : MAX_DERIVATIVES;

			for (let k = 0; k <= iterations; k++) {
				if (derivative.hasFunction(DIFF, true)) {
					complete = false;
					break;
				}
				if (derivative.isZero()) {
					break;
				}

				let coefficient: Expression;
				try {
					// Reparse symbolically to reduce sin(0), cos(0), log(1), etc.
					// without converting pi or e to decimals.
					coefficient = Expression.create(derivative.subst(symbol, at).text());
				} catch (error) {
					if (
						error instanceof DivisionByZeroError ||
						error instanceof UndefinedError ||
						error instanceof MathError ||
						error instanceof ParserError ||
						error instanceof UnsupportedOperationError ||
						error instanceof RangeError
					) {
						complete = false;
						break;
					}
					throw error;
				}

				if (coefficient.isInfinite() || coefficient.hasVariable(symbol.text())) {
					complete = false;
					break;
				}
				if (!coefficient.isZero()) {
					result = result.plus(
						coefficient.div(Expression.Number(factorial)).times(shift.pow(k))
					);
				}

				if (k === iterations && degreeBig > BigInt(iterations)) {
					complete = false;
				}
				if (k < iterations) {
					derivative = diff(derivative, symbol);
					factorial *= BigInt(k + 1);
				}
			}

			return complete ? result : undefined;
		});
	}

	return retval ?? Expression.toFunction(TAYLOR, [expr, symbol, at, degree]);
}
