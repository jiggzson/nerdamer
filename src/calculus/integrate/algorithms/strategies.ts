import { simplify } from '../../../algebra/simplify/simplify';
import { hasDerivedTrig, rewrite as rewriteTrigToSinCos } from '../../../algebra/simplify/trigrewrite';
import { Expression } from '../../../core/classes/expression/Expression';
import { four, half, minusOne, one, two, zero } from '../../../core/classes/expression/shortcuts';
import { Polynomial } from '../../../core/classes/polynomial/Polynomial';
import { ASIN, ASINH, COS, INTEGRATE, LOG, SIN } from '../../../core/constants/functionNames';
import { getU, subst } from '../../../core/functions/subst';
import { log } from '../../../math/index';
import { sin, cos, tan } from '../../../math/trig';
import { diff } from '../../derivative/diff';
import { pmintRational } from '../poorMansIntegrator';
import { hasTranscendental, MAX_INTEGRATION_DEPTH, radicalSubstitution } from '../utils';

import { tryIntegrateRational } from './rationalIntegration';

import type { IntegrationCallback } from './rationalIntegration';

export function tryIntegrateLogPower(
	expr: Expression,
	dx: string,
	depth: number,
	integrate: IntegrationCallback
): Expression | undefined {
	if (depth >= MAX_INTEGRATION_DEPTH) {
		return undefined;
	}

	if (!expr.isFunction(LOG)) {
		return undefined;
	}

	const power = expr.getPower();
	if (!power.isInteger() || !power.gt(one())) {
		return undefined;
	}

	const args = expr.getArguments();
	if (args.length !== 1) {
		return undefined;
	}

	let argumentPolynomial: Polynomial;
	try {
		argumentPolynomial = new Polynomial(args[0], [dx]);
	} catch {
		return undefined;
	}
	if (argumentPolynomial.deg() !== 1) {
		return undefined;
	}

	const coeffs = argumentPolynomial.toArray(false, dx);
	const linearCoefficient = coeffs[1] ?? zero();
	if (linearCoefficient.isZero()) {
		return undefined;
	}

	const lowerPower = expr.getBase().pow(power.minus(one()));
	const lowerIntegral = integrate(lowerPower, dx, depth);
	if (lowerIntegral.isFunction(INTEGRATE)) {
		return undefined;
	}

	const leadingTerm = args[0].div(linearCoefficient).times(expr);
	return leadingTerm.minus(power.times(lowerIntegral));
}

function isRationalFunction(expr: Expression, variable: string): boolean {
	try {
		new Polynomial(expr.getNumerator(), [variable]);
		new Polynomial(expr.getDenominator(), [variable]);
		return true;
	} catch {
		return false;
	}
}

export function tryRadicalSubstitution(
	expr: Expression,
	dx: string,
	depth: number,
	integrate: IntegrationCallback,
	delegateRational = false
): Expression | undefined {
	if (depth >= MAX_INTEGRATION_DEPTH) {
		return undefined;
	}

	const newVariable = getU(expr);
	const sub = radicalSubstitution(expr, dx, newVariable);
	if (!sub) {
		return undefined;
	}

	const transformed = simplify(sub.integrand);
	if (!isRationalFunction(transformed, sub.newVariable)) {
		return undefined;
	}

	// The transformed quotient may have a polynomial part that the recursive
	// rational dispatcher leaves unresolved. Retain the direct PMInt fallback.
	let inner = delegateRational ? integrate(transformed, sub.newVariable, depth) :
		(pmintRational(transformed, sub.newVariable) ??
			tryIntegrateRational(transformed, sub.newVariable, depth, integrate));
	if (delegateRational && (!inner || inner.hasFunction(INTEGRATE, true))) {
		inner = pmintRational(transformed, sub.newVariable);
	}
	if (!inner || inner.hasFunction(INTEGRATE, true)) {
		return undefined;
	}

	return simplify(subst(inner, Expression.create(sub.newVariable), sub.backSub));
}

export function tryIntegrateSqrtQuadratic(expr: Expression, dx: string): Expression | undefined {
	const power = expr.getPower();
	if (!power.eq(half())) {
		return undefined;
	}

	const base = expr.getBase();
	if (hasTranscendental(base, dx)) {
		return undefined;
	}

	let p: Polynomial;
	try {
		p = new Polynomial(base, [dx]);
	} catch {
		return undefined;
	}

	if (p.deg() !== 2) {
		return undefined;
	}

	const coeffs = p.toArray(false, dx);
	const c = coeffs[0] ?? zero();
	const b = coeffs[1] ?? zero();
	const a = coeffs[2] ?? zero();
	if (a.isZero()) {
		return undefined;
	}

	const x = Expression.create(dx);
	const u = x.plus(b.div(two().times(a)));
	const k = c.minus(b.pow(two()).div(four().times(a)));
	const sqrtQ = expr;
	const leadingTerm = half().times(u).times(sqrtQ);

	if (k.isZero()) {
		return undefined;
	}

	if (a.gt(zero())) {
		const sqrtA = a.pow(half());
		if (k.gt(zero())) {
			const sqrtK = k.pow(half());
			const arg = sqrtA.times(u).div(sqrtK);
			return leadingTerm.plus(
				k.div(two().times(sqrtA)).times(Expression.toFunction(ASINH, [arg]))
			);
		}
		if (k.lt(zero())) {
			const arg = sqrtA.times(u).plus(sqrtQ);
			return leadingTerm.plus(k.div(two().times(sqrtA)).times(log(arg)));
		}
		return undefined;
	}

	if (a.lt(zero()) && k.gt(zero())) {
		const sqrtNegA = a.times(minusOne()).pow(half());
		const sqrtK = k.pow(half());
		const arg = sqrtNegA.times(u).div(sqrtK);
		return leadingTerm.plus(
			k.div(two().times(sqrtNegA)).times(Expression.toFunction(ASIN, [arg]))
		);
	}

	return undefined;
}


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
 * Extracts the linear coefficient from a trig argument of the form a*x+b.
 * Returns the coefficient `a` such that d/dx[a*x+b] = a.
 * Returns undefined if the argument is not linear in dx.
 */
function getLinearCoefficient(arg: Expression, dx: string): Expression | undefined {
	try {
		const p = new Polynomial(arg, [dx]);
		if (p.deg() !== 1) {
			return undefined;
		}
		const coeffs = p.toArray(false, dx);
		return coeffs[1] ?? undefined;
	} catch {
		return undefined;
	}
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
	integrate: IntegrationCallback,
	delegateRational = false
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
	const a = getLinearCoefficient(trigArg, dx);
	if (!a) {
		return undefined;
	}

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
		const antiderivative = integrate(transformed, uName, depth);
		if (!antiderivative.hasFunction(INTEGRATE, true)) {
			return simplify(subst(antiderivative, u, inner));
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

	// Experimental calls delegate rational integration to the coordinator.
	// Legacy calls retain their established quadratic coefficient-matching path.
	let rational: Expression | undefined;
	if (!delegateRational) {
		try {
			const denominator = substituted.getDenominator();
			if (!denominator.isOne() &&
				new Polynomial(denominator.getBase(), [tName]).deg() === 2) {
				rational = pmintRational(substituted, tName);
			}
		} catch {
			// Unsupported forms continue through normal integration.
		}
	}
	rational ??= integrate(substituted, tName, depth);
	if (rational.hasFunction(INTEGRATE, true)) {
		return undefined;
	}

	// Step 8: Back-substitute t → tan(arg/2)
	const backSub = tan(trigArg.div(two()));
	return simplify(subst(rational, t, backSub));
}
