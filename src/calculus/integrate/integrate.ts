import { Expression } from '../../core/classes/expression/Expression';
import { constantsFreeProduct } from '../../core/classes/expression/products';
import { one, zero } from '../../core/classes/expression/shortcuts';
import { requireVariableName } from '../../core/classes/expression/utils';
import { COS, INTEGRATE, LOG, SIN } from '../../core/constants/functionNames';
import { Pattern } from '../../core/converters/Pattern';
import { message } from '../../core/errors';
import { warn } from '../../core/warnings';
import { log } from '../../math/index';

import {
	integrateRationalFamily,
	tryIntegratePowerQuotient,
} from './algorithms/rationalIntegration';
import {
	tryRadicalSubstitution,
	tryIntegrateByWeierstrass,
	tryIntegrateLogPower,
	tryIntegrateSqrtQuadratic,
} from './algorithms/strategies';
import { tryIntegrateByParts } from './byParts';
import {
	integrateDerivativeQuotient,
	matchProductSubstitution,
	tryIntegrateByWrappedFactorSubstitution,
} from './bySubstitution';
import { tableOfIntegrals } from './integrationTable';
import { pmintPolynomial, pmintRational } from './poorMansIntegrator';
import { hasTranscendental, MAX_INTEGRATION_DEPTH } from './utils';

import type { ExpressionInput } from '../../core/types';

/** Tracks depth exhaustion across speculative recursive integration strategies. */
type IntegrationWarningState = { depthLimitReached: boolean };

/**
 * Experimental integration controller, independent of the public integrate() API.
 * Recursive table rules call back into this controller with a bounded depth.
 */
export function integrate(input: ExpressionInput, dx: ExpressionInput, depth = 0): Expression {
	const state: IntegrationWarningState = { depthLimitReached: false };
	const result = performIntegration(input, dx, depth, state);
	if (state.depthLimitReached && result.hasFunction(INTEGRATE, true)) {
		warn('integrate.depthLimit', message('integrationDepthWarning', { depth: String(MAX_INTEGRATION_DEPTH), expression: Expression.create(input).text() }));
	}
	return result;
}

/** Reuses one depth-exhaustion tracker across candidate integration paths. */
function performIntegration(
	input: ExpressionInput,
	dx: ExpressionInput,
	depth: number,
	state: IntegrationWarningState
): Expression {
	const integrateNext = (value: ExpressionInput, variable: ExpressionInput, nextDepth = 0): Expression =>
		performIntegration(value, variable, nextDepth, state);
	let expr = Expression.create(input);
	const variable = requireVariableName(Expression.create(dx));
	const original = expr.copy();
	let retval: Expression | undefined;

	if (depth >= MAX_INTEGRATION_DEPTH) {
		state.depthLimitReached = true;
		retval = Expression.toFunction(INTEGRATE, [original, variable]);
	} else {
		let constants: Expression;
		({ constants, expression: expr } = constantsFreeProduct(expr, variable));

		if (!expr.hasVariable(variable)) {
			retval = expr.times(Expression.Variable(variable));
		} else if (expr.isSum() && expr.isLinear()) {
			let sum = zero();
			expr.each((term: Expression) => {
				sum = sum.plus(integrateNext(term, variable, depth + 1));
			});
			retval = sum;
		} else {
			retval = tableOfIntegrals.lookup(new Pattern(expr, [variable]), depth + 1, integrateNext);
			if (!retval) {
				// Reuse the derivative-closed coefficient matcher for trig/exp families.
				const factors = expr.isProduct() ? expr.elementsArray() : [expr];
				if (factors.some(factor => factor.isEXP() ||
					(factor.isFunction() && (factor.name === SIN || factor.name === COS)))) {
					retval = pmintPolynomial(expr, variable);
				}
				if (!retval && expr.isEXP()) {
					const base = expr.getBase();
					const exponent = expr.getPower();
					if (base.isNUM() && base.gt(zero()) && exponent.isFunction(LOG) &&
						exponent.getArguments()[0]?.eq(Expression.Variable(variable))) {
						retval = Expression.Variable(variable).times(expr).div(one().plus(log(base)));
					}
				}
			}
			if (!retval) {
				retval = integrateRationalFamily(expr, variable, depth + 1, integrateNext);
			}
			if (!retval) {
				retval = tryIntegrateLogPower(expr, variable, depth + 1, integrateNext);
			}
			if (!retval) {
				retval = integrateDerivativeQuotient(expr, variable);
			}
			if (!retval) {
				retval = tryRadicalSubstitution(expr, variable, depth + 1, integrateNext, true);
			}
			if (!retval) {
				retval = tryIntegrateSqrtQuadratic(expr, variable);
			}
			if (!retval && expr.isProduct() && expr.getPower().isOne()) {
				retval = tryIntegrateByWrappedFactorSubstitution(
					expr, expr.elementsArray(), variable, integrateNext, depth + 1
				);
			}
			if (!retval && expr.isProduct() && expr.getPower().isOne()) {
				const factors = expr.elementsArray();
				if (factors.some(factor => factor.isSum() && hasTranscendental(factor, variable))) {
					const expanded = expr.expand();
					if (expanded.isSum() && expanded.isLinear()) {
						const integrated = integrateNext(expanded, variable, depth + 1);
						if (!integrated.hasFunction(INTEGRATE, true)) {
							retval = integrated;
						}
					}
				}
			}
			if (!retval) {
				retval = tryIntegrateByParts(expr, variable, integrateNext, depth + 1);
			}
			if (!retval) {
				const substitution = matchProductSubstitution(expr, variable);
				if (substitution) {
					const exponent = substitution.power.plus(one());
					retval = substitution.fx.pow(exponent).div(exponent).times(substitution.constant);
				}
			}
			if (!retval && expr.isPolynomialLike() && expr.getDenominator().isOne() &&
				!hasTranscendental(expr, variable)) {
				retval = pmintRational(expr, variable);
			}
			if (!retval) {
				retval = tryIntegratePowerQuotient(expr, variable, depth + 1, integrateNext);
			}
			if (!retval) {
				retval = tryIntegrateByWeierstrass(expr, variable, depth + 1, integrateNext, true);
			}
		}

		if (retval) {
			retval = retval.times(constants);
		}
	}

	return retval ?? Expression.toFunction(INTEGRATE, [original, variable]);
}
