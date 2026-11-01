import { Expression } from '../classes/expression/Expression';
import { one, zero } from '../classes/expression/shortcuts';

// Smaller sums do not benefit enough from additional pairwise normalization.
const BALANCED_SUM_MIN_TERMS = 32;

/**
 * Groups additive terms that already share the same symbolic denominator.
 *
 * This is part of core exact normalization rather than the higher-level algebra
 * simplifier because symbolic comparison relies on it for zero/equality checks.
 */
function groupByDenominator(x: Expression) {
	let retval = x;
	if (x.isSum()) {
		let nonRationals = zero();
		const rationals: Record<string, Expression> = {};
		x.each(e => {
			const num = e.getNumerator();
			const den = e.getDenominator();

			// Numerator extraction is exact, so restore the term's decimal marker
			// before regrouping it. Otherwise a decimal coefficient silently becomes
			// an exact rational during common-denominator normalization.
			if (e.getMultiplier().asDecimal) {
				num.getMultiplier().asDecimal = true;
			}

			if (den.isOne()) {
				nonRationals = nonRationals.plus(num);
			} else {
				const key = den.text();
				rationals[key] = rationals[key] ? rationals[key].plus(num) : num;
			}
		});
		retval = nonRationals;
		for (const denominator in rationals) {
			retval = retval.plus(rationals[denominator].div(Expression.create(denominator)));
		}
		retval = retval.pow(x.getPower()).times(x.getMultiplier());
	}

	return retval;
}

/**
 * Rewrites exact ratios to a common denominator without invoking algebra-level
 * factoring or simplification.
 *
 * @remarks
 * Core comparison uses this normalization to determine whether an exact symbolic
 * difference is zero. Algebra also reuses the same implementation for rational
 * simplification, keeping the dependency direction from algebra to core.
 */
export function toCommonDenominator(x: Expression) {
	let retval = x;

	if (x.isProduct()) {
		retval = Expression.fromRational(x.getMultiplier());
		x.each(e => {
			e = e.pow(x.getPower());
			if (e.isSum()) {
				retval = retval.times(toCommonDenominator(e));
			} else {
				retval = retval.times(e);
			}
		});
	} else if (x.isSum()) {
		x = groupByDenominator(x);
		if (!x.isSum()) {
			return x;
		}

		const p = x.getPower().abs();
		const m = x.getMultiplier();
		const terms = x.elementsArray();
		let hasNonTrivialDenominator = false;
		let hasSymbolicDenominator = false;

		for (const e of terms) {
			const den = e.getDenominator();
			if (!den.isOne()) {
				hasNonTrivialDenominator = true;
				if (!den.isNUM()) {
					hasSymbolicDenominator = true;
				}
			}
		}

		if (!hasNonTrivialDenominator) {
			return x;
		}

		if (!hasSymbolicDenominator && !x.isPolynomialLike()) {
			return x;
		}

		let numerator = zero();
		let denominator = one();

		if (terms.length >= BALANCED_SUM_MIN_TERMS) {
			// Combine neighboring fractions before growing the full numerator.
			let layer = terms;
			while (layer.length > 1) {
				const next: Expression[] = [];
				for (let index = 0; index < layer.length; index += 2) {
					next.push(index + 1 < layer.length
						? toCommonDenominator(layer[index].plus(layer[index + 1]))
						: layer[index]);
				}
				layer = next;
			}
			const normalized = toCommonDenominator(layer[0]);
			numerator = normalized.getNumerator();
			denominator = normalized.getDenominator();
		} else {
			for (const e of terms) {
				const normalizedTerm = toCommonDenominator(e);
				const num = normalizedTerm.getNumerator();
				const den = normalizedTerm.getDenominator();

				// getNumerator() returns the exact rational numerator, so carry the
				// original term's decimal intent onto that numerator before combining
				// fractions. This keeps decimal contagion intact through the rewrite.
				if (e.getMultiplier().asDecimal) {
					num.getMultiplier().asDecimal = true;
				}

				// Reuse an existing symbolic denominator factor before multiplying.
				// This avoids raising shared factors to unnecessarily high powers.
				const existingFactors = denominator.isProduct() ? denominator.elementsArray() : [denominator];
				const incomingFactors = den.isProduct() ? den.elementsArray() : [den];
				let commonFactor: Expression | undefined;
				for (const incoming of incomingFactors) {
					if (commonFactor === undefined && !incoming.isNUM() &&
						incoming.getPower().isInteger() && incoming.getPower().sign() > 0 &&
						incoming.getMultiplier().isOne()) {
						const base = incoming.getBase();
						const matching = existingFactors.some(existing =>
							!existing.isNUM() &&
							existing.getPower().isInteger() && existing.getPower().sign() > 0 &&
							existing.getMultiplier().isOne() &&
							existing.getBase().text() === base.text());
						if (matching) {
							commonFactor = base;
						}
					}
				}
				const nextDenominator = commonFactor === undefined ? den : den.div(commonFactor);
				const existingDenominator = commonFactor === undefined
					? denominator : denominator.div(commonFactor);
				numerator = numerator.times(nextDenominator).plus(existingDenominator.times(num));
				denominator = denominator.times(nextDenominator);
			}
		}

		if (x.getPower().sign() === -1) {
			[denominator, numerator] = [numerator, denominator];
		}

		retval = numerator.div(denominator);
		if (!p.isOne()) {
			retval = retval.pow(p);
		}
		if (!m.isOne()) {
			retval = retval.times(Expression.fromRational(m));
		}
	}

	return retval;
}
