import { simplify } from '../../algebra/simplify/simplify';
import { Expression } from '../../core/classes/expression/Expression';
import { zero } from '../../core/classes/expression/shortcuts';
import { LOG } from '../../core/classes/parser/constants';
import { Polynomial } from '../../core/classes/polynomial/Polynomial';
import { exp } from '../../math/math';
import { diff } from '../derivative/diff';

import { tableOfLimits } from './limitsTable';

import type { ExpressionInputType } from '../../core/classes/parser/types';

export type LimitDir = 'both' | 'left' | 'right';

type LimitPointClassification = 'regular' | 'zero_over_zero' | 'nonzero_over_zero' | 'unknown';

type InfinityGrowthClassification =
	| { type: 'bounded' }
	| { type: 'logarithmic' }
	| { type: 'polynomial'; degree: number }
	| { type: 'exponential'; exponent: Expression }
	| { type: 'unknown' };

type IndeterminateForm =
	| 'inf_minus_inf' // ∞ - ∞
	| 'one_to_inf' // 1^∞
	| 'zero_to_zero' // 0^0
	| 'inf_to_zero' // ∞^0
	| 'none';

const L_HOPITAL_MAX_DEPTH = 4;
const LIMIT_MAX_DEPTH = 12;

function classifyAtPoint(
	expr: Expression,
	x: Expression,
	val: Expression
): LimitPointClassification {
	const vars = { [x.text()]: val };

	try {
		const num = Expression.create(expr.getNumerator().evaluate(vars));
		const den = Expression.create(expr.getDenominator().evaluate(vars));

		if (!den.isZero()) {
			return 'regular';
		}

		if (num.isZero()) {
			return 'zero_over_zero';
		}

		return 'nonzero_over_zero';
	} catch {
		return 'unknown';
	}
}

/**
 * Maximum number of derivatives to check when determining the sign
 * the denominator approaches from (handles higher-order zeros).
 */
const SIGN_DERIVATIVE_MAX_DEPTH = 4;

/**
 * Handle the nonzero/zero case: numerator is finite and nonzero at the point,
 * denominator is zero. The limit is ±∞ depending on the sign of the numerator
 * and the side from which the denominator approaches zero.
 *
 * Uses successive derivatives of the denominator to determine the sign it
 * approaches from. If den'(val) ≠ 0, the sign of den'(val) tells us:
 *   - den is increasing through zero → negative from left, positive from right
 *   - den is decreasing through zero → positive from left, negative from right
 * If den'(val) = 0, we check den''(val), den'''(val), etc. For the k-th nonzero
 * derivative: if k is odd, the function changes sign (like above); if k is even,
 * the function touches zero without crossing (same sign both sides).
 */
function tryNonzeroOverZero(
	expr: Expression,
	x: Expression,
	val: Expression,
	dir: LimitDir
): Expression | undefined {
	const num = expr.getNumerator();
	const den = expr.getDenominator();
	const vars = { [x.text()]: val };

	// Get numerator sign at the point
	let numSign: number;
	try {
		numSign = Expression.create(num.evaluate(vars)).sign();
	} catch {
		return undefined;
	}

	if (numSign === 0) {
		return undefined; // Shouldn't happen given classification, but be safe
	}

	// Walk up the derivatives of the denominator to find the first nonzero one at val
	let d = den;
	let order = 0;

	for (let k = 0; k < SIGN_DERIVATIVE_MAX_DEPTH; k++) {
		d = diff(d, x);
		order = k + 1;

		let dAtVal: Expression;
		try {
			dAtVal = Expression.create(d.evaluate(vars));
		} catch {
			return undefined;
		}

		if (dAtVal.isZero()) {
			continue;
		}

		const dSign = dAtVal.sign();

		if (dSign === 0) {
			return undefined;
		}

		// Odd-order derivative: denominator changes sign through zero
		// Even-order derivative: denominator has same sign on both sides
		const isOddOrder = order % 2 !== 0;

		if (!isOddOrder) {
			// Even order: den has same sign on both sides (like x² at 0)
			// den approaches from positive if dSign > 0, negative if dSign < 0
			const resultSign = numSign * dSign;
			if (dir === 'both' || dir === 'left' || dir === 'right') {
				return resultSign > 0 ? Expression.Inf() : Expression.NegInf();
			}
		}

		// Odd order: den changes sign (like x at 0)
		// From right: den sign matches dSign
		// From left: den sign is -dSign
		const rightDenSign = dSign;
		const leftDenSign = -dSign;

		if (dir === 'right') {
			const resultSign = numSign * rightDenSign;
			return resultSign > 0 ? Expression.Inf() : Expression.NegInf();
		}

		if (dir === 'left') {
			const resultSign = numSign * leftDenSign;
			return resultSign > 0 ? Expression.Inf() : Expression.NegInf();
		}

		// dir === 'both': check if both sides agree
		const rightResult = numSign * rightDenSign;
		const leftResult = numSign * leftDenSign;

		if (rightResult === leftResult) {
			// Shouldn't happen for odd order (signs are opposite), but handle it
			return rightResult > 0 ? Expression.Inf() : Expression.NegInf();
		}

		// Two-sided limit does not exist — left and right disagree.
		// Return undefined so it falls through to the unevaluated limit form.
		return undefined;
	}

	// All derivatives up to max depth were zero — give up
	return undefined;
}

function tryLHopital(
	expr: Expression,
	x: Expression,
	val: Expression,
	dir: LimitDir,
	depth: number
): Expression | undefined {
	if (depth >= L_HOPITAL_MAX_DEPTH) {
		return undefined;
	}

	const den = expr.getDenominator();
	if (den.isOne()) {
		return undefined;
	}

	const num = expr.getNumerator();
	const vars = { [x.text()]: val };

	let numAt: Expression;
	let denAt: Expression;

	try {
		numAt = Expression.create(num.evaluate(vars));
		denAt = Expression.create(den.evaluate(vars));
	} catch {
		return undefined;
	}

	const isZeroOverZero = numAt.isZero() && denAt.isZero();
	const isInfinityOverInfinity =
		(numAt.isPosInf() || numAt.isNegInf()) && (denAt.isPosInf() || denAt.isNegInf());

	if (!isZeroOverZero && !isInfinityOverInfinity) {
		return undefined;
	}

	const dNum = diff(num, x);
	const dDen = diff(den, x);

	if (dDen.isZero()) {
		return undefined;
	}

	const next = simplify(dNum.div(dDen));

	if (next.eq(expr)) {
		return undefined;
	}

	return limit(next, x, val, dir, depth + 1);
}
/**
 * Evaluate expr at x=val and classify the result.
 * Returns 'zero', 'inf', 'neginf', 'one', 'finite', or undefined if evaluation fails.
 */
function evalCategory(
	expr: Expression,
	x: Expression,
	val: Expression
): 'zero' | 'one' | 'finite' | 'inf' | 'neginf' | undefined {
	try {
		const result = simplify(expr.subst(x, val));

		if (result.isZero()) {
			return 'zero';
		}
		if (result.isPosInf()) {
			return 'inf';
		}
		if (result.isNegInf()) {
			return 'neginf';
		}
		if (result.eq(Expression.create(1))) {
			return 'one';
		}

		return 'finite';
	} catch {
		return undefined;
	}
}

/**
 * Classify the indeterminate form of a power f^g at x→val.
 */
function classifyPowerForm(
	base: Expression,
	exponent: Expression,
	x: Expression,
	val: Expression
): IndeterminateForm {
	const categoryBase = evalCategory(base, x, val);
	const categoryExp = evalCategory(exponent, x, val);

	if (!categoryBase || !categoryExp) {
		return 'none';
	}

	// 1^∞
	if (categoryBase === 'one' && (categoryExp === 'inf' || categoryExp === 'neginf')) {
		return 'one_to_inf';
	}

	// 0^0
	if (categoryBase === 'zero' && categoryExp === 'zero') {
		return 'zero_to_zero';
	}

	// ∞^0
	if ((categoryBase === 'inf' || categoryBase === 'neginf') && categoryExp === 'zero') {
		return 'inf_to_zero';
	}

	return 'none';
}

/**
 * Detect ∞ - ∞: a sum where two additive terms individually diverge but with opposite signs.
 */
function isInfMinusInf(expr: Expression, x: Expression, val: Expression): boolean {
	if (!expr.isSum()) {
		return false;
	}

	const terms = expr.elementsArray().map(e => Expression.create(e));
	let hasPos = false;
	let hasNeg = false;

	for (const term of terms) {
		const cat = evalCategory(term, x, val);
		if (cat === 'inf') {
			hasPos = true;
		} else if (cat === 'neginf') {
			hasNeg = true;
		}
	}

	return hasPos && hasNeg;
}

/**
 * Try to rewrite an indeterminate form into 0/0 or ∞/∞ so L'Hôpital can handle it.
 *
 * Rewrites:
 *   0·∞:  f·g → f / (1/g)         (puts the zero factor in the numerator)
 *   ∞-∞:  f - g → (1/g - 1/f) / (1/(f·g))   i.e. combine over common denominator
 *   1^∞, 0^0, ∞^0:  f^g → e^(g·ln(f))  then limit the exponent g·ln(f)
 */
function tryRewriteIndeterminate(
	expr: Expression,
	x: Expression,
	val: Expression,
	dir: LimitDir,
	depth: number
): Expression | undefined {
	// --- 0 · ∞ ---
	// Check if the whole expression (with denominator 1) is a product containing
	// a zero-approaching and an infinity-approaching factor.
	if (expr.getDenominator().isOne() && expr.isProduct()) {
		const factors = expr.elementsArray().map(e => Expression.create(e));

		// Find the first zero factor and first inf factor
		let zeroIdx = -1;
		let infIdx = -1;

		for (let i = 0; i < factors.length; i++) {
			const cat = evalCategory(factors[i], x, val);
			if (cat === 'zero' && zeroIdx === -1) {
				zeroIdx = i;
			} else if ((cat === 'inf' || cat === 'neginf') && infIdx === -1) {
				infIdx = i;
			}
		}

		if (zeroIdx !== -1 && infIdx !== -1) {
			// Rewrite as: zeroFactor / (1/infFactor) · remaining
			// This gives 0/0 form
			const zeroFactor = factors[zeroIdx];
			const infFactor = factors[infIdx];

			// Collect remaining factors
			const remaining: Expression[] = [];
			for (let i = 0; i < factors.length; i++) {
				if (i !== zeroIdx && i !== infIdx) {
					remaining.push(factors[i]);
				}
			}

			let rewritten = zeroFactor.div(Expression.create(1).div(infFactor));

			for (const r of remaining) {
				rewritten = rewritten.times(r);
			}

			return limit(simplify(rewritten), x, val, dir, depth + 1);
		}
	}

	// --- ∞ - ∞ ---
	if (isInfMinusInf(expr, x, val)) {
		// Combine into a single fraction by finding a common denominator.
		// Use simplify which should call toCommonDenominator internally.
		const combined = simplify(expr);

		// If simplify produced something different, recurse on it
		if (!combined.eq(expr)) {
			return limit(combined, x, val, dir, depth + 1);
		}

		// Manual fallback: combine to common denominator
		const terms = expr.elementsArray().map(e => Expression.create(e));
		if (terms.length === 2) {
			const [a, b] = terms;
			const aNum = a.getNumerator();
			const aDen = a.getDenominator();
			const bNum = b.getNumerator();
			const bDen = b.getDenominator();

			const combinedNum = simplify(aNum.times(bDen).plus(bNum.times(aDen)));
			const combinedDen = simplify(aDen.times(bDen));

			const combined2 = combinedNum.div(combinedDen);
			if (!combined2.eq(expr)) {
				return limit(combined2, x, val, dir, depth + 1);
			}
		}
	}

	// --- 1^∞, 0^0, ∞^0 (exponential indeterminate forms) ---
	if (expr.isEXP()) {
		const base = expr.getBase();
		const exponent = expr.getPower();
		const form = classifyPowerForm(base, exponent, x, val);

		if (form === 'one_to_inf' || form === 'zero_to_zero' || form === 'inf_to_zero') {
			// f^g = e^(g · ln(f))
			// limit(f^g) = e^(limit(g · ln(f)))
			// The inner product g·ln(f) will typically be a 0·∞ form,
			// which the 0·∞ handler above will rewrite into 0/0 for L'Hôpital.
			const innerExpr = exponent.times(Expression.toFunction('log', [base]));
			const innerLimit = limit(innerExpr, x, val, dir, depth + 1);

			// If the inner limit resolved to a concrete value, exponentiate it
			if (innerLimit.isPosInf()) {
				return Expression.Inf();
			}
			if (innerLimit.isNegInf()) {
				return zero();
			}
			// If it resolved to a finite value, return e^value
			if (!innerLimit.isFunction('limit')) {
				return exp(innerLimit);
			}
		}
	}

	return undefined;
}

/**
 * Numeric tier for comparing growth classifications.
 * Higher tier dominates lower tier as x→±∞.
 *
 *   exponential > polynomial > logarithmic > bounded
 */
function growthTier(c: InfinityGrowthClassification): number {
	switch (c.type) {
		case 'bounded':
			return 0;
		case 'logarithmic':
			return 1;
		case 'polynomial':
			return 2;
		case 'exponential':
			return 3;
		case 'unknown':
			return -1;
	}
}

function getInfinityGrowthClassification(
	expr: Expression,
	x: Expression
): InfinityGrowthClassification {
	if (!expr.hasVariable(x.text())) {
		return { type: 'bounded' };
	}

	// Exponential: e^f(x) where f(x) contains x
	// An EXP node with base e and a power that depends on x
	if (expr.isEXP() && expr.getBase().isE() && expr.getPower().hasVariable(x.text())) {
		return { type: 'exponential', exponent: expr.getPower() };
	}

	// Products: classify by the dominant factor.
	// e.g. x*e^x → exponential (exponential dominates polynomial co-factors)
	// e.g. x^2*log(x) → polynomial (polynomial dominates logarithmic co-factors)
	//
	// However, if bounded factors are variable-dependent functions (like sin(1/x),
	// cos(x)), we can't determine at classification time whether they approach 0 or
	// a nonzero constant. A product like x*sin(1/x) looks polynomial-degree-1 but
	// actually approaches 1 (not ∞). We return unknown in these cases to let the limit
	// function handle it.
	if (expr.isProduct()) {
		const factors = expr.elementsArray().map(e => Expression.create(e));
		let best: InfinityGrowthClassification = { type: 'bounded' };
		let bestTier = 0;
		let hasBoundedVariableFunction = false;

		for (const factor of factors) {
			const c = getInfinityGrowthClassification(factor, x);
			if (c.type === 'unknown') {
				return { type: 'unknown' };
			}

			if (c.type === 'bounded' && factor.hasVariable(x.text())) {
				hasBoundedVariableFunction = true;
			}

			const t = growthTier(c);
			if (t > bestTier) {
				best = c;
				bestTier = t;
			} else if (t === bestTier && c.type === 'polynomial' && best.type === 'polynomial') {
				best = { type: 'polynomial', degree: best.degree + c.degree };
			}
		}

		if (hasBoundedVariableFunction && bestTier > 0) {
			return { type: 'unknown' };
		}

		return best;
	}

	// Logarithmic: log(f(x)) where f(x) grows unboundedly.
	// If the argument approaches a finite value (e.g. log(1+1/x) where 1+1/x→1),
	// then the whole expression is bounded, not logarithmic.
	if (expr.isFunction(LOG) && expr.getArguments()[0]?.hasVariable(x.text())) {
		const argClass = getInfinityGrowthClassification(expr.getArguments()[0], x);
		if (
			argClass.type === 'polynomial' ||
			argClass.type === 'exponential' ||
			argClass.type === 'logarithmic'
		) {
			return { type: 'logarithmic' };
		}
		// Argument is bounded (e.g. 1+1/x → 1) → log approaches a constant
		return { type: 'bounded' };
	}

	if (expr.isPolynomialLike()) {
		const poly = new Polynomial(expr);
		return { type: 'polynomial', degree: poly.deg() };
	}

	// Variable or EXP with a constant power: classify by the sign of the power.
	// Positive powers (x^(1/2), x^2, x^(3/2)) grow at infinity → polynomial tier.
	// Negative powers (x^(-1), x^(-1/2)) vanish at infinity but are classified as
	// polynomial with negative degree so that the product handler can correctly sum
	// degrees (e.g. x^(-1) * (1+x) has effective degree 0, not degree 1).
	// getDominantAtInfinity handles standalone negative-degree terms as dominated
	// by constants.
	if ((expr.isVAR() || expr.isEXP()) && !expr.getPower().hasVariable(x.text())) {
		try {
			const pow = expr.getPower();
			// Use the Rational multiplier to get a proper numeric value.
			// Number(text()) fails for rational strings like "1/2" since
			// JS Number('1/2') returns NaN.
			const m = pow.getMultiplier();
			const powVal = Number(m.numerator) / Number(m.denominator);
			if (isFinite(powVal) && powVal !== 0 && pow.isNUM()) {
				return { type: 'polynomial', degree: powVal };
			}
		} catch {
			// Do nothing
		}
	}

	if (expr.isFunction('sin') || expr.isFunction('cos') || expr.isFunction('atan')) {
		return { type: 'bounded' };
	}

	return { type: 'unknown' };
}

function getAdditiveTerms(expr: Expression): Expression[] {
	const distributed = expr.distributeMultiplier();

	if (!distributed.isSum()) {
		return [distributed];
	}

	return distributed.elementsArray().map(e => Expression.create(e));
}

function getDominantAtInfinity(expr: Expression, x: Expression): Expression | undefined {
	const terms = getAdditiveTerms(expr);

	let maxTier = -1;
	let maxDegree = -Infinity;
	const kept: Expression[] = [];

	for (const term of terms) {
		const classification = getInfinityGrowthClassification(term, x);

		if (classification.type === 'unknown') {
			return undefined;
		}

		// For additive dominance, polynomial terms with negative degree vanish
		// at infinity (x^(-1) → 0), so they're dominated by bounded constants.
		// Use an effective tier of -1 (below bounded) for these.
		let tier = growthTier(classification);
		if (classification.type === 'polynomial' && classification.degree < 0) {
			tier = -1;
		}

		if (tier > maxTier) {
			// This term's growth class strictly dominates everything up to this point
			maxTier = tier;
			maxDegree = classification.type === 'polynomial' ? classification.degree : -Infinity;
			kept.length = 0;
			kept.push(term);
			continue;
		}

		if (tier < maxTier) {
			// This term is dominated — skip it
			continue;
		}

		// Same tier — compare within tier
		if (classification.type === 'polynomial') {
			if (classification.degree > maxDegree) {
				maxDegree = classification.degree;
				kept.length = 0;
				kept.push(term);
			} else if (classification.degree === maxDegree) {
				kept.push(term);
			}
			// If degree < maxDegree, skip (dominated within polynomial tier)
		} else {
			// For exponential, logarithmic, or bounded tiers with same tier:
			// keep all terms (let simplification handle the comparison downstream)
			kept.push(term);
		}
	}

	if (kept.length === 0) {
		return undefined;
	}

	let out = kept[0];
	for (let i = 1; i < kept.length; i++) {
		out = out.plus(kept[i]);
	}

	return simplify(out);
}

/**
 * Try to resolve a limit at infinity when dominant terms are non-polynomial
 * (exponential or logarithmic). Simplifies the ratio and recurses.
 *
 * Key reductions:
 *   e^f(x) / e^g(x) = e^(f(x)-g(x))  → recurse on the simplified form
 *   log(f(x)) / log(g(x))              → recurse on simplified form
 *   e^f(x) / polynomial                → ±∞ (exponential dominates)
 *   polynomial / e^f(x)                → 0   (exponential dominates)
 *   log(f(x)) / polynomial             → 0   (polynomial dominates)
 *   polynomial / log(f(x))             → ±∞  (polynomial dominates)
 */
function tryNonPolynomialInfinityLimit(
	dominantNum: Expression,
	dominantDen: Expression,
	x: Expression,
	val: Expression,
	dir: LimitDir,
	depth: number
): Expression | undefined {
	const numClass = getInfinityGrowthClassification(dominantNum, x);
	const denClass = getInfinityGrowthClassification(dominantDen, x);

	const numTier = growthTier(numClass);
	const denTier = growthTier(denClass);

	if (numTier < 0 || denTier < 0) {
		return undefined;
	}

	// Different tiers: higher tier dominates
	if (numTier > denTier) {
		// Numerator grows faster → ±∞
		if (numClass.type === 'exponential') {
			const expLimit = limit(numClass.exponent, x, val, dir, depth + 1);
			if (expLimit.isPosInf()) {
				// e^(→+∞) / anything_slower → ±∞ based on denominator sign
				const denSign = dominantDen.sign();
				if (denSign > 0) {
					return Expression.Inf();
				}
				if (denSign < 0) {
					return Expression.NegInf();
				}
			}
			if (expLimit.isNegInf()) {
				// e^(→-∞) → 0 regardless of denominator
				return zero();
			}
		}
		// Polynomial over logarithmic or bounded → ±∞
		// Sign determined by the numerator's leading coefficient behavior
		if (
			numClass.type === 'polynomial' &&
			(denClass.type === 'logarithmic' || denClass.type === 'bounded')
		) {
			// For x→+∞, sign of x^n / log(x) is determined by sign of coefficient
			// For x→-∞, also account for odd/even degree
			const numSign = dominantNum.sign();
			const denSign = dominantDen.sign();
			if (numSign !== 0 && denSign !== 0) {
				const resultSign = numSign * denSign;
				return resultSign > 0 ? Expression.Inf() : Expression.NegInf();
			}
		}
		return undefined;
	}

	if (numTier < denTier) {
		// Denominator grows faster → 0
		if (denClass.type === 'exponential') {
			const expLimit = limit(denClass.exponent, x, val, dir, depth + 1);
			if (expLimit.isPosInf()) {
				return zero();
			}
			if (expLimit.isNegInf()) {
				// e^(→-∞) in denominator → denominator→0, this is nonzero/zero
				// Fall through to let other handlers deal with it
				return undefined;
			}
		}
		// Logarithmic or bounded over polynomial or higher → 0
		return zero();
	}

	// Same tier, both exponential: e^f / e^g = e^(f-g), recurse on that
	if (numClass.type === 'exponential' && denClass.type === 'exponential') {
		const exponentDiff = simplify(numClass.exponent.minus(denClass.exponent));
		const expDiff = exp(exponentDiff);
		// Carry through any multipliers from the original expressions
		const numMultiplier = dominantNum.getMultiplier(true);
		const denMultiplier = dominantDen.getMultiplier(true);
		const coeff = simplify(numMultiplier.div(denMultiplier));
		const reduced = simplify(coeff.times(expDiff));
		return limit(reduced, x, val, dir, depth + 1);
	}

	// Same tier, both logarithmic: simplify the ratio and recurse
	if (numClass.type === 'logarithmic' && denClass.type === 'logarithmic') {
		const reduced = simplify(dominantNum.div(dominantDen));
		if (!reduced.eq(dominantNum.div(dominantDen))) {
			return limit(reduced, x, val, dir, depth + 1);
		}
		// L'Hôpital will handle log/log as ∞/∞
		return undefined;
	}

	return undefined;
}

/**
 * Try to resolve limit(f(g(x))) by computing the inner limit first.
 *
 * For function calls f(g(x)):
 *   1. Compute L = limit(g(x))
 *   2. If L is finite and not an unevaluated limit, return f(L)
 *   3. If L is ±∞, handle known function behaviors at infinity
 *
 * For EXP nodes base^power where both may depend on x:
 *   1. Compute limits of base and power separately
 *   2. If both resolve, combine (but skip indeterminate forms — those
 *      are handled earlier by tryRewriteIndeterminate)
 *
 * This runs late in the pipeline to avoid interfering with indeterminate
 * form rewriting (e.g. (1+1/x)^x must be caught by the 1^∞ handler first).
 */
function tryComposition(
	expr: Expression,
	x: Expression,
	val: Expression,
	dir: LimitDir,
	depth: number
): Expression | undefined {
	// --- Named functions: sin, cos, exp, log, tan, atan, etc. ---
	if (expr.isFunction() && !expr.isFunction('limit')) {
		const args = expr.getArguments();

		// Only handle functions whose arguments actually depend on x
		if (args.length === 0 || !args.some(a => a.hasVariable(x.text()))) {
			return undefined;
		}

		const name = expr.name!;

		// --- Piecewise functions: abs, sign ---
		// These need special handling because they have different behaviors
		// depending on the direction of approach, and evaluate(0) gives 0
		// which loses the one-sided information.
		if (name === 'abs' || name === 'sign') {
			const innerArg = args[0];
			const innerLimit = limit(innerArg, x, val, dir, depth + 1);

			if (innerLimit.isFunction('limit')) {
				return undefined;
			}

			// If inner limit is nonzero, abs and sign are continuous — evaluate directly
			if (!innerLimit.isZero()) {
				try {
					return simplify(Expression.toFunction(name, [innerLimit]));
				} catch {
					return undefined;
				}
			}

			// Inner limit is zero — behavior depends on direction
			if (innerLimit.isZero()) {
				if (name === 'abs') {
					// abs(f(x)) → 0 regardless of direction when f(x) → 0
					return zero();
				}

				if (name === 'sign') {
					// sign(f(x)) as f(x) → 0: depends on which side f approaches from
					if (dir === 'both') {
						// Two-sided: sign changes, limit doesn't exist
						return undefined;
					}

					// Determine the sign of the argument near the limit point
					// by checking the derivative's sign at the point
					try {
						const innerDeriv = diff(innerArg, x);
						const derivAtVal = simplify(innerDeriv.subst(x, val));
						const derivSign = derivAtVal.sign();

						if (derivSign !== 0) {
							// Argument is increasing (derivSign > 0) or decreasing (derivSign < 0) through zero
							if (dir === 'right') {
								return Expression.create(derivSign > 0 ? 1 : -1);
							}
							if (dir === 'left') {
								return Expression.create(derivSign > 0 ? -1 : 1);
							}
						}
					} catch {
						return undefined;
					}

					return undefined;
				}
			}

			return undefined;
		}

		// Compute the limit of each argument
		const argLimits: Expression[] = [];
		for (const arg of args) {
			let argLimit: Expression;
			try {
				argLimit = limit(arg, x, val, dir, depth + 1);
			} catch {
				return undefined;
			}
			// If any argument limit didn't resolve, bail
			if (argLimit.isFunction('limit')) {
				return undefined;
			}
			argLimits.push(argLimit);
		}

		const innerLimit = argLimits[0];

		// Handle functions at ±∞ arguments
		if (innerLimit.isPosInf()) {
			switch (name) {
				case 'log':
					return Expression.Inf();
				case 'atan':
					return Expression.Pi().div(Expression.create(2));
				case 'sqrt':
					return Expression.Inf();
				// sin, cos at ∞ → oscillates, no limit
				case 'sin':
				case 'cos':
					return undefined;
			}
		}

		if (innerLimit.isNegInf()) {
			switch (name) {
				case 'atan':
					return Expression.Pi().div(Expression.create(-2));
				// log(-∞) is undefined in reals
				case 'log':
					return undefined;
				// sin, cos at -∞ → oscillates, no limit
				case 'sin':
				case 'cos':
					return undefined;
			}
		}

		// Finite inner limit: evaluate the outer function at the resolved value
		try {
			const rebuilt = Expression.toFunction(name, argLimits);
			const result = simplify(rebuilt);
			// Make sure we actually resolved it (didn't just get the same function back)
			if (!result.isFunction(name)) {
				return result;
			}
			// Try evaluate as a fallback
			const evaluated = Expression.create(rebuilt.evaluate());
			if (!evaluated.isFunction(name)) {
				return evaluated;
			}
		} catch {
			// evaluation failed — fall through
		}

		return undefined;
	}

	// --- EXP nodes: base^power where base or power depends on x ---
	// Only handle non-indeterminate cases here. Indeterminate forms
	// (1^∞, 0^0, ∞^0) are caught earlier by tryRewriteIndeterminate.
	if (expr.isEXP()) {
		const base = expr.getBase();
		const pow = expr.getPower();

		// Only proceed if at least one part depends on x
		if (!base.hasVariable(x.text()) && !pow.hasVariable(x.text())) {
			return undefined;
		}

		let baseLimit: Expression;
		let powLimit: Expression;
		try {
			baseLimit = limit(base, x, val, dir, depth + 1);
			powLimit = limit(pow, x, val, dir, depth + 1);
		} catch {
			return undefined;
		}

		// If either didn't resolve, bail
		if (baseLimit.isFunction('limit') || powLimit.isFunction('limit')) {
			return undefined;
		}

		// Check for indeterminate forms — these should have been caught already,
		// but guard against re-entry
		const catBase =
			baseLimit.isPosInf() || baseLimit.isNegInf()
				? 'inf'
				: baseLimit.isZero()
					? 'zero'
					: baseLimit.eq(Expression.create(1))
						? 'one'
						: 'finite';
		const catPow =
			powLimit.isPosInf() || powLimit.isNegInf()
				? 'inf'
				: powLimit.isZero()
					? 'zero'
					: 'finite';

		// Skip indeterminate forms (1^∞, 0^0, ∞^0)
		if (catBase === 'one' && catPow === 'inf') {
			return undefined;
		}
		if (catBase === 'zero' && catPow === 'zero') {
			return undefined;
		}
		if (catBase === 'inf' && catPow === 'zero') {
			return undefined;
		}

		// Determinate cases with infinities
		if (baseLimit.isPosInf() && powLimit.isPosInf()) {
			return Expression.Inf();
		}
		if (baseLimit.isPosInf() && powLimit.isNegInf()) {
			return zero();
		}
		if (baseLimit.isZero() && powLimit.isPosInf()) {
			return zero();
		}

		// finite^0 = 1 (nonzero finite base, zero power — not indeterminate)
		if (catBase === 'finite' && catPow === 'zero') {
			return Expression.create(1);
		}

		// Finite base and finite/zero power: compute directly
		if (
			(catBase === 'finite' || catBase === 'one') &&
			(catPow === 'finite' || catPow === 'zero')
		) {
			try {
				return simplify(baseLimit.pow(powLimit));
			} catch {
				return undefined;
			}
		}

		// e^(+∞) = +∞, e^(-∞) = 0
		if (baseLimit.isE()) {
			if (powLimit.isPosInf()) {
				return Expression.Inf();
			}
			if (powLimit.isNegInf()) {
				return zero();
			}
		}

		return undefined;
	}

	// --- Sums: limit(a + b + ...) = limit(a) + limit(b) + ... ---
	// when no indeterminate ∞ - ∞ forms arise.
	if (expr.isSum()) {
		const terms = expr.elementsArray().map(e => Expression.create(e));

		// Only decompose if there are multiple terms that depend on x
		if (terms.length < 2) {
			return undefined;
		}

		const termLimits: Expression[] = [];
		let hasPosInf = false;
		let hasNegInf = false;

		for (const term of terms) {
			let termLimit: Expression;
			try {
				termLimit = limit(term, x, val, dir, depth + 1);
			} catch {
				return undefined;
			}

			if (termLimit.isFunction('limit')) {
				return undefined;
			}

			if (termLimit.isPosInf()) {
				hasPosInf = true;
			}
			if (termLimit.isNegInf()) {
				hasNegInf = true;
			}

			termLimits.push(termLimit);
		}

		// ∞ - ∞ is indeterminate — bail and let tryRewriteIndeterminate handle it
		if (hasPosInf && hasNegInf) {
			return undefined;
		}

		// All finite: sum them up
		if (!hasPosInf && !hasNegInf) {
			try {
				let result = termLimits[0];
				for (let i = 1; i < termLimits.length; i++) {
					result = result.plus(termLimits[i]);
				}
				return simplify(result);
			} catch {
				return undefined;
			}
		}

		// Has infinity but no cancellation: return the dominant infinity
		if (hasPosInf && !hasNegInf) {
			return Expression.Inf();
		}
		if (hasNegInf && !hasPosInf) {
			return Expression.NegInf();
		}

		return undefined;
	}

	// --- Products: limit(a · b · ...) = limit(a) · limit(b) · ... ---
	// when no indeterminate 0 · ∞ forms arise.
	if (expr.isProduct()) {
		const factors = expr.elementsArray(true).map(e => Expression.create(e));

		if (factors.length < 2) {
			return undefined;
		}

		const factorLimits: Expression[] = [];
		let hasZero = false;
		let hasInf = false;

		for (const factor of factors) {
			let factorLimit: Expression;
			try {
				factorLimit = limit(factor, x, val, dir, depth + 1);
			} catch {
				return undefined;
			}

			if (factorLimit.isFunction('limit')) {
				return undefined;
			}

			if (factorLimit.isZero()) {
				hasZero = true;
			}
			if (factorLimit.isPosInf() || factorLimit.isNegInf()) {
				hasInf = true;
			}

			factorLimits.push(factorLimit);
		}

		// 0 · ∞ is indeterminate — apply L'Hôpital directly.
		// For f·g where f→0 and g→∞, rewrite as f/(1/g), both→0.
		// L'Hôpital gives f'/(1/g)' = f'/(-g'/g²) = -f'·g²/g'.
		// Compute this directly since Expression arithmetic recombines
		// f/(1/g) back into f·g, defeating the rewrite.
		if (hasZero && hasInf) {
			let zeroIdx = -1;
			let infIdx = -1;
			for (let i = 0; i < factorLimits.length; i++) {
				if (factorLimits[i].isZero() && zeroIdx === -1) {
					zeroIdx = i;
				} else if (
					(factorLimits[i].isPosInf() || factorLimits[i].isNegInf()) &&
					infIdx === -1
				) {
					infIdx = i;
				}
			}

			if (zeroIdx !== -1 && infIdx !== -1) {
				const f = factors[zeroIdx]; // → 0
				const g = factors[infIdx]; // → ∞

				try {
					const fPrime = diff(f, x);
					const gPrime = diff(g, x);

					if (!gPrime.isZero()) {
						// L'Hôpital on f/(1/g): result = -f'·g²/g'
						let lhopitalExpr = simplify(fPrime.times(g.pow(2)).div(gPrime).neg());

						// Multiply back any remaining factors
						for (let i = 0; i < factors.length; i++) {
							if (i !== zeroIdx && i !== infIdx) {
								lhopitalExpr = lhopitalExpr.times(factors[i]);
							}
						}

						return limit(lhopitalExpr, x, val, dir, depth + 1);
					}
				} catch {
					return undefined;
				}
			}

			return undefined;
		}

		// All finite (including zeros): multiply them
		if (!hasInf) {
			try {
				let result = factorLimits[0];
				for (let i = 1; i < factorLimits.length; i++) {
					result = result.times(factorLimits[i]);
				}
				return simplify(result);
			} catch {
				return undefined;
			}
		}

		// Has zero with no infinity: result is zero
		if (hasZero && !hasInf) {
			return zero();
		}

		// Has infinity with no zero: determine sign
		if (hasInf && !hasZero) {
			let sign = 1;
			for (const fl of factorLimits) {
				if (fl.isNegInf()) {
					sign *= -1;
				} else if (fl.isPosInf()) {
					// sign unchanged
				} else {
					// Finite nonzero factor: multiply sign
					const s = fl.sign();
					if (s === 0) {
						return zero();
					}
					sign *= s;
				}
			}
			return sign > 0 ? Expression.Inf() : Expression.NegInf();
		}

		return undefined;
	}

	return undefined;
}

export function limit(
	expr: ExpressionInputType,
	x: ExpressionInputType,
	val: ExpressionInputType,
	dir: LimitDir = 'both',
	depth = 0
): Expression {
	let retval: Expression | undefined = undefined;

	expr = Expression.create(expr);
	x = Expression.create(x);
	val = Expression.create(val);

	// Global recursion depth guard — last line of defense against infinite recursion.
	// Hidden from the user (depth defaults to 0 in the public signature).
	if (depth >= LIMIT_MAX_DEPTH) {
		return Expression.toFunction('limit', [expr, x, val, dir]);
	}

	if (val.isPosInf() || val.isNegInf()) {
		const dominantNumerator = getDominantAtInfinity(expr.getNumerator(), x);
		const dominantDenominator = getDominantAtInfinity(expr.getDenominator(), x);

		if (
			dominantNumerator &&
			dominantDenominator &&
			dominantNumerator.isPolynomialLike() &&
			dominantDenominator.isPolynomialLike()
		) {
			const numPoly = new Polynomial(dominantNumerator);
			const denPoly = new Polynomial(dominantDenominator);

			const degNum = numPoly.deg();
			const degDen = denPoly.deg();
			const degDiff = degNum - degDen;

			if (degDiff < 0) {
				retval = zero();
			} else if (degDiff === 0) {
				retval = simplify(
					Expression.create(numPoly.LC()).div(Expression.create(denPoly.LC()))
				);
			} else {
				let sign = Expression.create(numPoly.LC())
					.div(Expression.create(denPoly.LC()))
					.sign();

				if (val.isNegInf() && degDiff % 2 !== 0) {
					sign *= -1;
				}

				if (sign > 0) {
					retval = Expression.Inf();
				} else if (sign < 0) {
					retval = Expression.NegInf();
				}
			}
		}

		// Fallback polynomial-tier comparison using our growth classifier.
		// Handles cases like x^(-1/2) which are polynomial-tier but fail isPolynomialLike().
		// Bounded constants are treated as polynomial degree 0 for this comparison.
		if (!retval && dominantNumerator && dominantDenominator) {
			const numClass = getInfinityGrowthClassification(dominantNumerator, x);
			const denClass = getInfinityGrowthClassification(dominantDenominator, x);

			const numDeg =
				numClass.type === 'polynomial'
					? numClass.degree
					: numClass.type === 'bounded'
						? 0
						: undefined;
			const denDeg =
				denClass.type === 'polynomial'
					? denClass.degree
					: denClass.type === 'bounded'
						? 0
						: undefined;

			if (numDeg !== undefined && denDeg !== undefined) {
				const degDiff = numDeg - denDeg;

				if (degDiff < 0) {
					retval = zero();
				} else if (degDiff > 0) {
					const numSign = dominantNumerator.sign();
					const denSign = dominantDenominator.sign();
					let sign = numSign * denSign;

					if (val.isNegInf() && degDiff % 2 !== 0) {
						sign *= -1;
					}

					if (sign > 0) {
						retval = Expression.Inf();
					} else if (sign < 0) {
						retval = Expression.NegInf();
					}
				}
				// degDiff === 0 is already handled by the isPolynomialLike() branch above
				// via leading coefficient comparison, which needs Polynomial construction.
				// If we reach here with degDiff === 0, fall through to other handlers.
			}
		}

		// Try non-polynomial dominant term comparison (exponential, logarithmic)
		if (!retval && dominantNumerator && dominantDenominator) {
			retval = tryNonPolynomialInfinityLimit(
				dominantNumerator,
				dominantDenominator,
				x,
				val,
				dir,
				depth
			);
		}

		if (!retval && dominantNumerator && dominantDenominator) {
			const reduced = dominantNumerator.div(dominantDenominator);

			if (!reduced.eq(expr)) {
				retval = limit(reduced, x, val, dir, depth);
			}
		}

		// Try rewriting indeterminate forms at infinity too
		// (e.g. (1+1/x)^x → 1^∞ form as x→∞)
		if (!retval) {
			const rewritten = tryRewriteIndeterminate(expr, x, val, dir, depth);
			if (rewritten) {
				retval = rewritten;
			}
		}

		// Try compositional limit: f(g(x)) → f(limit(g(x)))
		if (!retval) {
			retval = tryComposition(expr, x, val, dir, depth);
		}
	} else {
		// Intercept piecewise functions (abs, sign) before classifyAtPoint,
		// since regular evaluation at the limit point loses direction information.
		// e.g. sign(0) = 0 but lim sign(x) as x→0+ = 1.
		if (expr.isFunction('sign') || expr.isFunction('abs')) {
			const piecewiseResult = tryComposition(expr, x, val, dir, depth);
			if (piecewiseResult !== undefined) {
				retval = piecewiseResult;
			}
		}

		if (!retval) {
			const classification = classifyAtPoint(expr, x, val);

			if (classification === 'regular') {
				retval = Expression.create(expr.evaluate({ [x.text()]: val }));
			}

			// Nonzero numerator, zero denominator → ±∞ based on direction
			if (!retval && classification === 'nonzero_over_zero') {
				retval = tryNonzeroOverZero(expr, x, val, dir);
			}

			if (!retval && classification === 'zero_over_zero') {
				const simplified = simplify(expr);

				if (!simplified.eq(expr)) {
					retval = limit(simplified, x, val, dir, depth);
				}
			}

			// Try rewriting indeterminate forms (0·∞, ∞-∞, 1^∞, 0^0, ∞^0)
			// into 0/0 or ∞/∞ so L'Hôpital or simplification can resolve them.
			if (!retval) {
				const rewritten = tryRewriteIndeterminate(expr, x, val, dir, depth);
				if (rewritten) {
					retval = rewritten;
				}
			}

			if (!retval) {
				const lh = tryLHopital(expr, x, val, dir, depth);
				if (lh) {
					retval = lh;
				}
			}

			// Try compositional limit: f(g(x)) → f(limit(g(x)))
			if (!retval) {
				retval = tryComposition(expr, x, val, dir, depth);
			}
		} // end if (!retval) after piecewise check
	}

	if (!retval) {
		retval = tableOfLimits.lookup(expr, x.text(), 0);
	}

	return retval ?? Expression.toFunction('limit', [expr, x, val, dir]);
}
