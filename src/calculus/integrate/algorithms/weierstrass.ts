/**
 * Integration of rational functions of sin and cos with a common linear argument, by a
 * direct sin or cos substitution or the tangent half-angle substitution t = tan(a*x/2)
 * (Weierstrass), which leave a rational function of the new variable.
 */
import { simplify } from '../../../algebra/simplify/simplify';
import {
	hasDerivedTrig,
	rewrite as rewriteTrigToSinCos,
} from '../../../algebra/simplify/trigrewrite';
import { Expression } from '../../../core/classes/expression/Expression';
import { one, two } from '../../../core/classes/expression/shortcuts';
import { COS, SIN } from '../../../core/constants/functionNames';
import { getU, subst } from '../../../core/functions/subst';
import { sin, cos, tan } from '../../../math/trig';
import { diff } from '../../derivative/diff';
import { integrateSubstituted } from '../bySubstitution';
import { isRationalFunction, MAX_INTEGRATION_DEPTH, polynomialCoefficients } from '../utils';

import type { IntegrationCallback } from './rationalIntegration';

// ============================================================================
// Weierstrass substitution (tangent half-angle substitution)
//
// For integrands that are rational functions of sin(x) and cos(x),
// the substitution t = tan(x/2) converts to a rational function of t:
//
//   sin(x) = 2t/(1+t²)
//   cos(x) = (1-t²)/(1+t²)
//   dx     = 2/(1+t²) dt
//
// The resulting rational function can be integrated via partial fractions.
//
// More generally, for trig functions with argument (a*x+b):
//   t = tan((a*x+b)/2)
//   sin(a*x+b) = 2t/(1+t²)
//   cos(a*x+b) = (1-t²)/(1+t²)
//   dx = 2/(a*(1+t²)) dt
// ============================================================================

/**
 * Determines whether an expression is a rational function of sin and cos
 * with a common linear argument in the integration variable.
 *
 * Returns the common trig argument if so, or undefined if not.
 *
 * The expression must have all occurrences of the integration variable
 * wrapped inside sin(x) or cos(x) calls (after rewriting tan/sec/csc/cot),
 * and all such calls must share the same argument. Reuse trig rewrite from simplify.
 */
function getTrigArgIfRationalInTrig(expr: Expression, dx: string): Expression | undefined {
	let commonArg: Expression | undefined;
	let valid = true;

	function walk(e: Expression): void {
		if (!valid) {
			return;
		}

		if (e.isFunction(SIN) || e.isFunction(COS)) {
			const args = e.getArguments();
			if (args.length === 1 && args[0].hasVariable(dx)) {
				if (commonArg === undefined) {
					commonArg = args[0];
				} else if (!commonArg.eq(args[0])) {
					valid = false;
				}
			}
			// Don't descend into the trig argument — it's been accounted for
			return;
		}

		// If we encounter a bare variable outside of sin/cos, this is not
		// purely rational in trig
		if (e.isVAR() && e.hasVariable(dx)) {
			valid = false;
			return;
		}

		// Descend into sums, products
		if (e.isSum() || e.isProduct()) {
			for (const child of e.elementsArray()) {
				walk(child);
			}
			// Also check the power. It should not contain the variable
			const p = e.getPower();
			if (p.hasVariable(dx)) {
				valid = false;
			}
			return;
		}

		// For any other function containing the variable (e.g. log, exp),
		// this is not rational in trig
		if (e.isFunction() && e.hasVariable(dx)) {
			valid = false;
			return;
		}

		if (e.isEXP() && e.hasVariable(dx)) {
			valid = false;
			return;
		}
	}

	walk(expr);

	if (valid && commonArg !== undefined) {
		return commonArg;
	}
	return undefined;
}

/**
 * Attempts to integrate a rational function of trig via Weierstrass substitution.
 *
 * The substitution t = tan(arg/2) transforms the integrand into a rational
 * function of t, which can then be integrated using the existing rational
 * function machinery (partial fractions, etc.).
 */
export function tryIntegrateByWeierstrass(
	expr: Expression,
	dx: string,
	depth: number,
	integrate: IntegrationCallback
): Expression | undefined {
	if (depth >= MAX_INTEGRATION_DEPTH) {
		return undefined;
	}

	// Step 1: Rewrite tan/sec/csc/cot to sin/cos
	let working = expr;
	if (hasDerivedTrig(working)) {
		working = rewriteTrigToSinCos(working);
	}

	// Step 2: Check if the result is rational in sin/cos with a common argument
	const trigArg = getTrigArgIfRationalInTrig(working, dx);
	if (!trigArg) {
		return undefined;
	}

	// Step 3: Extract the linear coefficient of the argument
	const argument = polynomialCoefficients(trigArg, dx);
	if (argument?.length !== 2) {
		return undefined;
	}
	const a = argument[1];

	// A direct sine/cosine substitution avoids the larger half-angle transform
	// when the remaining integrand is rational in a single trig function.
	for (const inner of [sin(trigArg), cos(trigArg)]) {
		const derivative = diff(inner, dx);
		if (derivative.isZero()) {
			continue;
		}
		const candidate = simplify(expr.div(derivative));
		const uName = getU(expr);
		const u = Expression.create(uName);
		const transformed = simplify(subst(candidate, inner, u));
		if (transformed.hasVariable(dx) || !isRationalFunction(transformed, uName)) {
			continue;
		}
		const antiderivative = integrateSubstituted(transformed, u, inner, depth, integrate);
		if (antiderivative) {
			return antiderivative;
		}
	}

	// Step 4: Pick a fresh variable for the substitution
	const tName = getU(expr);
	const t = Expression.create(tName);
	const tSq = t.pow(two());
	const onePlusTSq = one().plus(tSq);

	// Step 5: Perform the substitution
	//   sin(x) → 2t/(1+t²)
	//   cos(x) → (1-t²)/(1+t²)
	const sinReplacement = two().times(t).div(onePlusTSq);
	const cosReplacement = one().minus(tSq).div(onePlusTSq);

	let substituted = subst(working, sin(trigArg), sinReplacement);
	substituted = subst(substituted, cos(trigArg), cosReplacement);

	// Multiply by the Jacobian: dx = 2/(a*(1+t²)) dt
	const jacobian = two().div(a.times(onePlusTSq));
	substituted = substituted.times(jacobian);

	// Step 6: Simplify — should collapse to a rational function of t
	substituted = simplify(substituted);

	// Verify it's actually rational in t (no leftover trig or transcendentals)
	if (substituted.hasVariable(dx)) {
		return undefined;
	}

	if (!isRationalFunction(substituted, tName)) {
		return undefined;
	}

	// Step 7: Integrate in t and back-substitute t → tan(arg/2)
	return integrateSubstituted(substituted, t, tan(trigArg.div(two())), depth, integrate);
}
