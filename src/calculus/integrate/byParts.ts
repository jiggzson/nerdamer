import { Expression } from '../../core/classes/expression/Expression';
import { minusOne, zero } from '../../core/classes/expression/shortcuts';
import { isTrig, isHyperbolicTrig, isInverseTrig } from '../../core/classes/expression/trig';
import { max } from '../../math/math';
import { diff } from '../derivative/diff';

import type { ExpressionInputType } from '../../core/classes/parser/types';

/**
 * LIATE priority constants.
 * Higher number = should be chosen as u.
 */
const LIATE = {
	EXP: 0,
	TRIG: 1,
	ALGEBRAIC: 2,
	INVERSE_TRIG: 3,
	LOG: 4,
} as const;

/**
 * Maximum number of recursive IBP applications within a single
 * integration attempt. This is independent of integrate's own
 * MAX_DEPTH and exists to prevent runaway recursion from
 * pathological integrands like e^x·tan(x).
 */
const MAX_IBP_DEPTH = 4;

/**
 * Extracts the maximum power of the integration variable in an expression.
 * For a product like x^3·sin(x), returns 3. For a sum produced by
 * linearity (e.g. 2·x·sin(x) + ...), returns the maximum across terms.
 * Returns 0 if the variable does not appear algebraically (e.g. pure sin(x)).
 */
function maxAlgebraicDegree(expr: Expression, v: string): Expression {
	let retval: Expression | undefined = undefined;
	if (expr.isVAR() && expr.hasVariable(v)) {
		// x^n — getPower() returns the exponent
		retval = expr.getPower();
	} else if (expr.isProduct()) {
		let maxDeg = zero();
		for (const factor of expr.elementsArray()) {
			if (factor.isVAR() && factor.hasVariable(v)) {
				const p = factor.getPower();
				maxDeg = max(maxDeg, p);
			}
		}
		retval = maxDeg;
	} else if (expr.isSum()) {
		let maxDeg = zero();
		expr.each((term: Expression) => {
			maxDeg = max(maxDeg, maxAlgebraicDegree(term, v));
		});
		retval = maxDeg;
	}

	return retval ?? zero();
}

/**
 * Counts the number of function applications (sin, cos, log, etc.)
 * in an expression. Used as a structural complexity measure for
 * non-algebraic IBP progress checking.
 */
function functionCount(expr: Expression): number {
	let count = 0;

	if (expr.isFunction()) {
		count = 1;
	}

	if (expr.isProduct() || expr.isSum()) {
		expr.each((child: Expression) => {
			count += functionCount(child);
		});
	}

	return count;
}

/**
 * Determines whether IBP has made progress by producing a simpler
 * remainder integrand. The definition of "progress" depends on the
 * LIATE category of u:
 *
 * - ALGEBRAIC u (polynomial × trig/exp): progress means the polynomial
 *   degree in the integration variable strictly decreased. This is the
 *   fundamental guarantee of IBP for x^n·f(x) — each round reduces
 *   the degree by 1, terminating after n rounds.
 *
 * - LOG or INVERSE_TRIG u: one round of IBP eliminates the
 *   transcendental factor, replacing it with an algebraic derivative.
 *   Progress means the new integrand has fewer function nodes than
 *   the original.
 *
 * - Anything else: fallback to a structural comparison — the new
 *   integrand must have strictly fewer function nodes.
 *
 * Returns true if the new integrand represents progress.
 */
function isProgress(
	original: Expression,
	newIntegrand: Expression,
	uCategory: number,
	v: string
): boolean {
	if (uCategory === LIATE.ALGEBRAIC) {
		// Polynomial degree must strictly decrease
		const oldDeg = maxAlgebraicDegree(original, v);
		const newDeg = maxAlgebraicDegree(newIntegrand, v);
		return newDeg < oldDeg;
	}

	if (uCategory === LIATE.LOG || uCategory === LIATE.INVERSE_TRIG) {
		// Function count must decrease (log/invtrig disappears after differentiation)
		return functionCount(newIntegrand) < functionCount(original);
	}

	// Fallback: structural complexity must decrease
	return functionCount(newIntegrand) < functionCount(original);
}

/**
 * Classifies an expression by LIATE category.
 * Returns -1 if unclassifiable.
 */
function liatePriority(expr: Expression): number {
	// Algebraic: x^n (variable with a power)
	if (expr.isVAR()) {
		return LIATE.ALGEBRAIC;
	}

	// Exponential: e^(ax) or a^(bx)
	if (expr.isEXP()) {
		return LIATE.EXP;
	}

	if (expr.isFunction()) {
		const name = expr.name;
		// Logarithmic
		if (name === 'log' || name === 'ln') {
			return LIATE.LOG;
		}
		// Inverse trig
		if (isInverseTrig(expr)) {
			return LIATE.INVERSE_TRIG;
		}
		// Trigonometric
		if (isTrig(expr)) {
			return LIATE.TRIG;
		}
		// Hyperbolic (treat like trig for LIATE purposes)
		if (isHyperbolicTrig(expr)) {
			return LIATE.TRIG;
		}
	}

	return -1;
}

/**
 * Detects whether a pair of LIATE categories is known to produce
 * non-terminating IBP recursion. This goes beyond the simple
 * same-category check to catch cross-category pathological pairs.
 *
 * Known problematic pairs:
 * - TRIG + TRIG: e.g. sin(x)·cos(x) — cyclic
 * - EXP + EXP: e.g. e^x·2^x — cyclic
 * - EXP + TRIG with non-integrable trig: e.g. e^x·tan(x) —
 *   produces increasingly complex trig powers
 *
 * LOG + EXP (e.g. e^x·log(x)) and LOG + TRIG (e.g. sin(x)·log(x))
 * are NOT blocked here. After one IBP round, the remainder is of the
 * form f(x)/x which maps to special functions (Ei, Si, Ci) via the
 * integration table. The isProgress guard prevents spiraling if the
 * table entry is missing.
 *
 * The EXP+TRIG pair is only problematic when the trig function
 * is not one whose integral stays in the same family (sin/cos).
 * e^x·sin(x) and e^x·cos(x) are handled by the table, so they
 * never reach IBP. But e^x·tan(x), e^x·sec(x), etc. spiral.
 */
function isCyclicPair(p0: number, p1: number, u: Expression, dv: Expression): boolean {
	// Same category: trig+trig or exp+exp
	if (p0 === p1 && (p0 === LIATE.TRIG || p0 === LIATE.EXP)) {
		return true;
	}

	// EXP + TRIG where the trig function is not sin/cos
	// (sin/cos pairs are handled by the integration table and never reach here,
	// but tan, sec, csc, cot produce ever-growing powers under IBP)
	if ((p0 === LIATE.EXP && p1 === LIATE.TRIG) || (p0 === LIATE.TRIG && p1 === LIATE.EXP)) {
		const trigFactor = p0 === LIATE.TRIG ? u : dv;
		if (trigFactor.isFunction()) {
			const name = trigFactor.name;
			// sin and cos are safe (table handles e^x·sin/cos directly)
			// Everything else spirals
			if (name !== 'sin' && name !== 'cos') {
				return true;
			}
		}
	}

	return false;
}

function tryMergeDerivativePair(varFactors: Expression[], v: string): Expression[] | undefined {
	if (varFactors.length < 3) {
		return undefined;
	}

	const dx = Expression.create(v);

	for (let i = 0; i < varFactors.length; i++) {
		const candidate = varFactors[i];
		const dCandidate = diff(candidate, dx);

		if (dCandidate.isFunction('diff')) {
			continue;
		}

		for (let j = 0; j < varFactors.length; j++) {
			if (j === i) {
				continue;
			}

			let rest: Expression | undefined;
			for (let k = 0; k < varFactors.length; k++) {
				if (k === i || k === j) {
					continue;
				}
				rest = rest ? rest.times(varFactors[k]) : varFactors[k];
			}

			if (!rest) {
				continue;
			}

			// Check whether dCandidate is proportional to rest
			const q = dCandidate.div(rest);
			if (!q.hasVariable(v)) {
				return [candidate, varFactors[j]];
			}
		}
	}

	return undefined;
}

export function tryIntegrationByParts(
	x: Expression,
	v: string,
	integrate: (f: ExpressionInputType, dx: ExpressionInputType, depth: number) => Expression,
	depth: number = 0,
	ibpDepth: number = 0
): Expression | undefined {
	if (!x.isProduct()) {
		return undefined;
	}

	// IBP-specific depth guard: prevent runaway recursion independent of
	// integrate's own MAX_DEPTH. This fires much sooner and avoids the
	// long delays caused by exhausting the global depth limit.
	if (ibpDepth >= MAX_IBP_DEPTH) {
		return undefined;
	}

	const factors = x.elementsArray();

	// Extract the overall multiplier and variable-containing factors
	const varFactors: Expression[] = [];
	// IMPORTANT: elementsArray() does not include the product's own multiplier, so pull it from the expression.
	let coefficient = x.getMultiplier(true);

	for (let factor of factors) {
		if (!factor.hasVariable(v)) {
			// Constant factor: fold it into the coefficient
			coefficient = coefficient.times(factor);
		} else {
			// Variable factor: also peel off its own multiplier so it doesn't get dropped in recursive IBP.
			// Example: 3*x^2*e^x can appear with the 3 sitting on the product multiplier OR on the factor.
			const m = factor.getMultiplier(true);
			if (!m.isOne()) {
				coefficient = coefficient.times(m);
				factor = factor.div(m);
			}
			varFactors.push(factor);
		}
	}

	if (varFactors.length > 2) {
		const merged = tryMergeDerivativePair(varFactors, v);
		if (merged) {
			varFactors.length = 0;
			varFactors.push(...merged);
		}
	}

	// IBP needs exactly 2 variable-containing factors
	if (varFactors.length !== 2) {
		return undefined;
	}

	// Classify and assign u and dv using LIATE priority
	const p0 = liatePriority(varFactors[0]);
	const p1 = liatePriority(varFactors[1]);

	// If either factor is unclassified, bail
	if (p0 < 0 || p1 < 0) {
		return undefined;
	}

	// Higher priority → u (differentiates to something simpler)
	let u: Expression, dv: Expression;
	if (p0 >= p1) {
		u = varFactors[0];
		dv = varFactors[1];
	} else {
		u = varFactors[1];
		dv = varFactors[0];
	}

	// Detect cyclic or pathological LIATE pairings that will never converge
	const uCategory = p0 >= p1 ? p0 : p1;
	if (isCyclicPair(p0, p1, u, dv)) {
		return undefined;
	}

	// Compute du = d/dx(u)
	const du = diff(u, Expression.create(v));
	// If diff returned a symbolic diff(...) expression, it couldn't compute the derivative
	if (du.isFunction('diff')) {
		return undefined;
	}

	// Compute v_result = ∫ dv dx
	const vResult = integrate(dv, v, depth);
	if (vResult.isFunction('integrate')) {
		return undefined;
	} // dv can't be integrated

	// ∫ u·dv = u·v - ∫ v·du
	const uv = coefficient.times(u).times(vResult);

	// Build the new integrand: v·du (with the original coefficient)
	const newIntegrand = coefficient.times(vResult).times(du);

	// Progress guard: verify IBP is actually simplifying the integrand.
	// The definition of "progress" is LIATE-category-aware:
	// - Algebraic u: polynomial degree must decrease
	// - Log/InvTrig u: function count must decrease
	// - Fallback: structural function count must decrease
	if (!isProgress(x, newIntegrand, uCategory, v)) {
		return undefined;
	}

	// Try to integrate v·du
	const remainder = integrate(newIntegrand, v, depth);

	// If the remainder is fully symbolic (nothing was integrated), IBP didn't help
	// But allow partial results (some terms integrated via linearity)
	let retval: Expression | undefined;

	if (remainder.isFunction('integrate')) {
		// One more check: try IBP recursively on the remainder
		const innerResult = tryIntegrationByParts(
			newIntegrand,
			v,
			integrate,
			depth + 1,
			ibpDepth + 1
		);
		if (innerResult !== undefined) {
			retval = uv.plus(innerResult.times(minusOne()));
		}
	} else {
		retval = uv.plus(remainder.times(minusOne()));
	}

	return retval;
}
