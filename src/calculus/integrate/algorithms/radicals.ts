/**
 * Integration of algebraic integrands: fractional powers of the variable or of a linear
 * expression, and powers of the square root of a quadratic.
 *
 * Sources: G. M. Fichtenholz, A Course of Differential and Integral Calculus, Vol. II
 * (the method of undetermined coefficients and Euler's substitutions for quadratic radicals).
 */
import { simplify } from '../../../algebra/simplify/simplify';
import { Expression } from '../../../core/classes/expression/Expression';
import { four, half, minusOne, one, two, zero } from '../../../core/classes/expression/shortcuts';
import { ASIN, ASINH, INTEGRATE } from '../../../core/constants/functionNames';
import { bigintLCM } from '../../../core/functions/bigint/bigint';
import { toCommonDenominator } from '../../../core/functions/rationalNormalization';
import { getU, rewriteRadicals, subst } from '../../../core/functions/subst';
import { log } from '../../../math/index';
import { diff } from '../../derivative/diff';
import { integrateSubstituted } from '../bySubstitution';
import { pmintRational } from '../poorMansIntegrator';
import {
	hasTranscendental,
	isRationalFunction,
	MAX_INTEGRATION_DEPTH,
	polynomialCoefficients,
	spreadFactors,
} from '../utils';

import type { ExpressionInput } from '../../../core/types';
import type { IntegrationCallback } from './rationalIntegration';

/**
 * Collects all fractional power denominators of a given variable in an expression.
 * Walks into sums, products, function arguments, and exponential bases and powers.
 * When `bases` is given, it also receives each sum raised to a fractional power, such
 * as 1+2*x in sqrt(1+2*x).
 */
export function collectPowerDenominators(
	expr: Expression,
	variable: string,
	bases?: Expression[]
): bigint[] {
	const denoms: bigint[] = [];

	function walk(e: Expression) {
		if (e.isVAR() && e.value === variable) {
			const p = e.getPower();
			if (p.isNUM()) {
				const r = p.getMultiplier();
				const d = r.denominator < 0n ? -r.denominator : r.denominator;
				if (d !== 1n) {
					denoms.push(d);
				}
			}
			return;
		}

		if (e.isSum() || e.isProduct()) {
			const p = e.getPower();
			if (bases && e.isSum() && p.isNUM() && !p.isInteger() && e.hasVariable(variable)) {
				bases.push(e.getBase());
			}
			for (const el of e.elementsArray()) {
				walk(el);
			}
			return;
		}

		if (e.isFunction()) {
			for (const arg of e.getArguments()) {
				walk(arg);
			}
		} else if (e.isEXP()) {
			walk(e.getBase());
			walk(e.getPower());
		}
	}

	walk(expr);
	return denoms;
}

/** Description of the substitution `x = t^n` used to clear fractional powers. */
export interface RadicalSubstitutionResult {
	/** Integrand after substitution and multiplication by `dx/dt`. */
	integrand: Expression;
	/** Fresh variable used in the transformed integrand. */
	newVariable: string;
	/** Variable replaced in the original integrand. */
	originalVariable: string;
	/** Least common multiple of the fractional-power denominators. */
	n: number;
	/** Expression in the original variable used to replace the fresh variable. */
	backSub: Expression;
}

/**
 * Builds the substitution `x = t^n` needed to eliminate fractional powers.
 *
 * @param expr - Integrand to inspect and transform.
 * @param variable - Variable whose fractional powers should be cleared. The
 * first expression variable is used when omitted.
 * @param newVar - Fresh substitution variable. Defaults to `t`.
 * @returns Substitution metadata, or `null` if the expression is constant or
 * contains no fractional powers of the selected variable.
 */
export function radicalSubstitution(
	expr: ExpressionInput,
	variable?: string,
	newVar: string = 't'
): RadicalSubstitutionResult | null {
	const e = Expression.create(expr);

	if (!variable) {
		const vars = e.variables();
		if (vars.length === 0) {
			return null;
		}
		variable = vars[0];
	}

	const denoms = collectPowerDenominators(e, variable);
	if (denoms.length === 0) {
		return null;
	}

	const nBig = bigintLCM(denoms);
	const n = Number(nBig);
	const t = Expression.create(newVar);
	const substituted = rewriteRadicals(e, variable, t, nBig);
	const dxdt = Expression.create(String(n)).times(t.pow(n - 1));
	const integrand = substituted.times(dxdt);
	const backSub = Expression.create(variable).pow(Expression.create(`1/${n}`));

	return {
		integrand,
		newVariable: newVar,
		originalVariable: variable,
		n,
		backSub,
	};
}

/**
 * Clears fractional powers of the variable with the substitution x = t^n, so that
 * ∫f(x)dx = ∫f(t^n)*n*t^(n-1)dt, then maps t back to x^(1/n).
 *
 * By default only a rational transformed integrand is accepted. With `transcendental`,
 * only a non-rational one is, such as ∫e^sqrt(x)dx = ∫2*t*e^t dt, and only when a
 * fractional power sits inside a function, an exponential or a sum. A bare factor such
 * as sqrt(x) in sqrt(x)*log(x)^2 is left to integration by parts, which already handles it.
 * That mode also shifts a single linear radicand to a new variable, y = a*x+b, so that
 * ∫e^sqrt(2*x+1)dx = (1/2)*∫e^sqrt(y)dy, which the substitution above then completes.
 */
export function tryRadicalSubstitution(
	expr: Expression,
	dx: string,
	depth: number,
	integrate: IntegrationCallback,
	transcendental = false
): Expression | undefined {
	if (depth >= MAX_INTEGRATION_DEPTH) {
		return undefined;
	}
	const bases: Expression[] = [];
	if (transcendental) {
		const factors = expr.isProduct() && expr.getPower().isOne() ? expr.elementsArray() : [expr];
		const wrapped = factors.filter(factor => !factor.isVAR());
		const radicals = wrapped.filter(
			factor => collectPowerDenominators(factor, dx, bases).length > 0
		);
		if (radicals.length === 0 && bases.length === 0) {
			return undefined;
		}
	}

	const newVariable = getU(expr);
	const sub = radicalSubstitution(expr, dx, newVariable);
	if (!sub) {
		// Only one distinct radicand can become the new variable.
		const base = bases[0];
		if (!base || !bases.every(other => other.eq(base))) {
			return undefined;
		}
		const coeffs = polynomialCoefficients(base, dx);
		if (coeffs?.length !== 2) {
			return undefined;
		}
		const [constant, slope] = coeffs;
		const y = Expression.create(newVariable);
		const shifted = subst(expr, Expression.create(dx), y.minus(constant).div(slope)).div(slope);
		if (shifted.hasVariable(dx)) {
			return undefined;
		}
		return integrateSubstituted(shifted, y, base, depth, integrate);
	}

	const transformed = simplify(sub.integrand);
	if (isRationalFunction(transformed, sub.newVariable) === transcendental) {
		return undefined;
	}
	const t = Expression.create(sub.newVariable);
	if (transcendental) {
		// The unsimplified integrand keeps polynomial factors whole, e.g. 2*t*(t^2-1)*e^t;
		// simplify can split them so that the derivative-closed families miss the product.
		return integrateSubstituted(sub.integrand, t, sub.backSub, depth, integrate);
	}

	// The transformed quotient may have a polynomial part that the recursive
	// rational dispatcher leaves unresolved. Retain the direct PMInt fallback.
	const restored = integrateSubstituted(transformed, t, sub.backSub, depth, integrate);
	if (restored) {
		return restored;
	}
	const direct = pmintRational(transformed, sub.newVariable);
	return direct && !direct.hasFunction(INTEGRATE, true)
		? simplify(subst(direct, t, sub.backSub))
		: undefined;
}

/**
 * Integrates sqrt(Q) and 1/sqrt(Q) for a quadratic Q = a*x^2+b*x+c by completing the
 * square, Q = a*u^2+k with u = x+b/(2*a) and k = c-b^2/(4*a):
 *
 *      ∫1/sqrt(Q)dx = asin(sqrt(-a)*u/sqrt(k))/sqrt(-a)         k > 0, a negative
 *                   = asinh(sqrt(a)*u/sqrt(k))/sqrt(a)          k > 0, otherwise
 *                   = log(sqrt(a)*u+sqrt(Q))/sqrt(a)            k not known positive
 *      ∫sqrt(Q)dx   = u*sqrt(Q)/2 + (k/2)*∫1/sqrt(Q)dx
 *
 * The asin and asinh forms rely on sqrt(k)*sqrt(1+a*u^2/k) = sqrt(Q), which needs only
 * k > 0, known from numbers or assumptions; the sign of a just picks the real-looking one,
 * and a negative a can be one written negative, as in b-a*x^2. The log form
 * differentiates to 1/sqrt(Q) for every a and k, since sqrt(a)^2 = a and sqrt(Q)^2 = Q,
 * so it covers a k of unknown sign.
 */
export function tryIntegrateSqrtQuadratic(expr: Expression, dx: string): Expression | undefined {
	const power = expr.getPower();
	const inverse = power.eq(half().neg());
	if (!power.eq(half()) && !inverse) {
		return undefined;
	}

	const base = expr.getBase();
	if (hasTranscendental(base, dx)) {
		return undefined;
	}

	const coeffs = polynomialCoefficients(base, dx);
	if (coeffs?.length !== 3) {
		return undefined;
	}
	const [c, b, a] = coeffs;

	const x = Expression.create(dx);
	const u = x.plus(b.div(two().times(a)));
	const k = c.minus(b.pow(two()).div(four().times(a)));
	const sqrtQ = inverse ? base.pow(half()) : expr;

	if (k.isZero()) {
		return undefined;
	}

	// The integral of 1/sqrt(Q) is inner/scale.
	let inner: Expression;
	let scale: Expression;
	const negative = a.lt(zero()) || a.getMultiplier().isNegative();
	if (k.gt(zero()) && negative) {
		scale = a.times(minusOne()).pow(half());
		inner = Expression.toFunction(ASIN, [scale.times(u).div(k.pow(half()))]);
	} else if (k.gt(zero())) {
		scale = a.pow(half());
		inner = Expression.toFunction(ASINH, [scale.times(u).div(k.pow(half()))]);
	} else {
		scale = a.pow(half());
		inner = log(scale.times(u).plus(sqrtQ));
	}

	if (inverse) {
		return inner.div(scale);
	}
	const leadingTerm = half().times(u).times(sqrtQ);
	return leadingTerm.plus(k.div(two().times(scale)).times(inner));
}

/**
 * Integrates P(x)*Q^(k/2) for a polynomial P, a quadratic Q = a*x^2+b*x+c and an odd
 * k >= -1 by undetermined coefficients. Writing the integrand as P/sqrt(Q), with P now
 * P*Q^((k+1)/2), gives
 *
 *      ∫P/sqrt(Q)dx = R*sqrt(Q) + λ*∫1/sqrt(Q)dx
 *
 * for a polynomial R of degree deg(P)-1. Differentiating, P = R'*Q + R*Q'/2 + λ, whose
 * coefficient of x^m is r[m-1]*a*m + r[m]*b*(m+1/2) + r[m+1]*c*(m+1), so the r are found
 * from the top degree down, then λ from the constant term.
 *
 * A rational cofactor with k = ±1 goes to {@link eulerSubstitution} instead.
 *
 * Source: the method of undetermined coefficients for quadratic radicals, as in
 * G. M. Fichtenholz, A Course of Differential and Integral Calculus, Vol. II.
 */
export function reduceRadicalPolynomial(
	expr: Expression,
	dx: string,
	depth: number,
	integrate: IntegrationCallback
): Expression | undefined {
	// An integer power distributes over a product, as in 1/(x*sqrt(Q)) = x^-1*Q^(-1/2).
	const factors = spreadFactors(expr);
	const radicals = factors.filter(factor => !factor.getPower().isInteger());
	if (radicals.length !== 1) {
		return undefined;
	}
	const radical = radicals[0];
	const k = radical.getPower().times(two());
	if (!k.isInteger()) {
		return undefined;
	}

	const base = radical.getBase();
	const quadratic = polynomialCoefficients(base, dx);
	if (quadratic?.length !== 3) {
		return undefined;
	}
	// The other spread factors, since expr itself may be a power of a product.
	let cofactor = one();
	for (const factor of factors) {
		if (factor !== radical) {
			cofactor = cofactor.times(factor);
		}
	}

	const numerator = k.lt(minusOne())
		? undefined
		: polynomialCoefficients(cofactor.times(base.pow(k.plus(one()).div(two()))), dx);
	if (!numerator) {
		// Higher powers of 1/sqrt(Q) give unwieldy results after the substitution.
		return k.eq(one()) || k.eq(minusOne())
			? eulerSubstitution(base, quadratic, k, cofactor, dx, depth, integrate)
			: undefined;
	}
	// Degree 0 is ∫c/sqrt(Q), which tryIntegrateSqrtQuadratic handles.
	const n = numerator.length - 1;
	if (n < 1) {
		return undefined;
	}

	const [c, b, a] = quadratic;
	const coefficient = (m: number) => numerator[m] ?? zero();
	const r: Expression[] = [];
	const rAt = (m: number) => r[m] ?? zero();
	for (let m = n; m >= 1; m--) {
		const middle = rAt(m).times(b.times(Expression.create(`${2 * m + 1}/2`)));
		const upper = rAt(m + 1).times(c.times(Expression.create(String(m + 1))));
		const leading = a.times(Expression.create(String(m)));
		r[m - 1] = coefficient(m).minus(middle.plus(upper)).div(leading);
	}
	const lambda = coefficient(0).minus(rAt(0).times(b).div(two())).minus(rAt(1).times(c));

	const x = Expression.create(dx);
	let polynomial = zero();
	for (let m = 0; m < n; m++) {
		polynomial = polynomial.plus(rAt(m).times(x.pow(Expression.create(String(m)))));
	}
	let retval: Expression | undefined = polynomial.times(base.pow(half()));
	if (!lambda.isZero()) {
		const reciprocal = tryIntegrateSqrtQuadratic(base.pow(half().neg()), dx);
		retval = reciprocal ? retval.plus(lambda.times(reciprocal)) : undefined;
	}
	return retval;
}

/**
 * Integrates R(x)*Q^(k/2) for a rational R, a quadratic Q = a*x^2+b*x+c and an odd k by
 * an Euler substitution, which makes both x and sqrt(Q) rational in a new variable t:
 *
 *      a > 0:              sqrt(Q) = t - sqrt(a)*x,     x = (t^2-c)/(b+2*sqrt(a)*t)
 *      c > 0:              sqrt(Q) = x*t + sqrt(c),     x = (2*sqrt(c)*t-b)/(a-t^2)
 *      a root α of Q:      sqrt(Q) = (x-α)*t,           x = (a*β-α*t^2)/(a-t^2)
 *
 * where β is the other root. Then Q^(k/2) = sqrt(Q)^k, so the integrand becomes
 * R(x(t))*sqrt(Q)(t)^k*x'(t), which is rational in t. Each t is defined from x and
 * sqrt(Q) and maps back to the same x exactly, so the result holds on every branch.
 *
 * Source: Euler's substitutions, as in G. M. Fichtenholz, A Course of Differential and
 * Integral Calculus, Vol. II.
 */
function eulerSubstitution(
	base: Expression,
	quadratic: Expression[],
	k: Expression,
	cofactor: Expression,
	dx: string,
	depth: number,
	integrate: IntegrationCallback
): Expression | undefined {
	if (depth >= MAX_INTEGRATION_DEPTH || !isRationalFunction(cofactor, dx)) {
		return undefined;
	}
	const [c, b, a] = quadratic;
	const x = Expression.create(dx);
	const sqrtQ = base.pow(half());
	const t = Expression.create(getU(cofactor.times(base)));
	const square = t.pow(two());

	// x(t), sqrt(Q) as a function of t, and t as a function of x.
	let position: Expression | undefined;
	let radical: Expression | undefined;
	let inverse: Expression | undefined;
	const discriminant = b.pow(two()).minus(four().times(a).times(c));
	if (a.gt(zero())) {
		const sqrtA = a.pow(half());
		position = square.minus(c).div(b.plus(two().times(sqrtA).times(t)));
		radical = t.minus(sqrtA.times(position));
		inverse = sqrtQ.plus(sqrtA.times(x));
	} else if (c.gt(zero())) {
		const sqrtC = c.pow(half());
		position = two().times(sqrtC).times(t).minus(b).div(a.minus(square));
		radical = position.times(t).plus(sqrtC);
		inverse = sqrtQ.minus(sqrtC).div(x);
	} else if (discriminant.gt(zero())) {
		const root = discriminant.pow(half());
		const alpha = root.minus(b).div(two().times(a));
		const beta = root.neg().minus(b).div(two().times(a));
		position = a.times(beta).minus(alpha.times(square)).div(a.minus(square));
		radical = position.minus(alpha).times(t);
		inverse = sqrtQ.div(x.minus(alpha));
	}
	if (!position || !radical || !inverse) {
		return undefined;
	}

	// Normalizing each piece first keeps the product a quotient of polynomials; one pass
	// over the whole product can leave fractions inside the denominator.
	const variable = t.text();
	const parts = [subst(cofactor, x, position), radical.pow(k), diff(position, variable)];
	const pieces = parts.map(piece => toCommonDenominator(piece));
	let numerator = one();
	let denominator = one();
	for (const piece of pieces) {
		numerator = numerator.times(piece.getNumerator());
		denominator = denominator.times(piece.getDenominator());
	}
	const transformed = simplify(numerator.expand().div(denominator.expand()));
	if (!isRationalFunction(transformed, variable)) {
		return undefined;
	}
	return integrateSubstituted(transformed, t, inverse, depth, integrate);
}
