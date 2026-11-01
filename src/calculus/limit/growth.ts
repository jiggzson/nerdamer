import { simplify } from '../../algebra/simplify/simplify';
import { Expression } from '../../core/classes/expression/Expression';
import { Polynomial } from '../../core/classes/polynomial/Polynomial';
import { ATAN, COS, LOG, SIN } from '../../core/constants/functionNames';

type InfinityGrowthClassification =
	| { type: 'bounded' }
	| { type: 'logarithmic' }
	| { type: 'polynomial'; degree: number }
	| { type: 'exponential'; exponent: Expression }
	| { type: 'unknown' };

/**
 * Numeric tier for comparing growth classifications.
 * Higher tier dominates lower tier as x→±∞.
 *
 *   exponential > polynomial > logarithmic > bounded
 */
export function growthTier(c: InfinityGrowthClassification): number {
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

export function classifyInfinityGrowth(
	expr: Expression,
	x: Expression
): InfinityGrowthClassification {
	if (!expr.hasVariable(x.text())) {
		return { type: 'bounded' };
	}

	// Exponential: e^f(x) where f(x) contains x
	// An EXP node with base e and a power that depends on x
	if (expr.isEXP() && expr.getBase().isE() && expr.getPower().hasVariable(x.text())) {
		const exponent = expr.getPower();
		const exponentClass = classifyInfinityGrowth(exponent, x);
		if (exponentClass.type === 'bounded' || exponentClass.type === 'unknown') {
			return { type: 'unknown' };
		}
		return { type: 'exponential', exponent };
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
			const c = classifyInfinityGrowth(factor, x);
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
		const argClass = classifyInfinityGrowth(expr.getArguments()[0], x);
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
	// findDominantAtInfinity handles standalone negative-degree terms as dominated
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

	if (expr.isFunction(SIN) || expr.isFunction(COS) || expr.isFunction(ATAN)) {
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

export function findDominantAtInfinity(
	expr: Expression,
	x: Expression
): Expression | undefined {
	const terms = getAdditiveTerms(expr);

	let maxTier = -1;
	let maxDegree = -Infinity;
	const kept: Expression[] = [];

	for (const term of terms) {
		const classification = classifyInfinityGrowth(term, x);

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
