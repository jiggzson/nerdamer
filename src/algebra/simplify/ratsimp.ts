import { Expression } from '../../core/classes/expression/Expression';
import { half, one, zero } from '../../core/classes/expression/shortcuts';
import { Polynomial } from '../../core/classes/polynomial/Polynomial';
import { divide } from '../../core/classes/polynomial/utils';
import { toCommonDenominator } from '../../core/functions/rationalNormalization';
import { subRadicals, uSub, uSubConstants, uUnSub } from '../../core/functions/subst';
import { polyFactorExpressions } from '../factor/factor';
import { sqcomp } from '../utils';

export { toCommonDenominator };

/**
 * Simplifies the expression through rationalizing
 * @param x
 * @returns
 */
export function rationalize(x: Expression) {
	const num = x.getNumerator();
	const den = x.getDenominator();

	// For a two-term radical denominator, multiply by its conjugate.
	// Only apply this when both squared terms are rational numbers.
	if (den.isSum()) {
		const terms = den.elementsArray();
		if (terms.length === 2) {
			const [a, b] = terms;
			const aSquared = a.pow(2);
			const bSquared = b.pow(2);
			const difference = aSquared.minus(bSquared);
			if (aSquared.isNUM() && bSquared.isNUM() && !difference.isZero()) {
				const expanded = num.times(a.minus(b)).expand();
				let numerator = zero();
				for (const term of expanded.isSum() ? expanded.elementsArray() : [expanded]) {
					numerator = numerator.plus(simplifyRadicals(term));
				}
				return numerator.div(difference);
			}
		}
	}

	// Nothing to do if the denominator is one
	// Nothing to do if the power in the denominator is 1
	if (den.isOne() || (!den.isProduct() && den.isLinear())) {
		return x;
	}

	const q = den.getPower();
	const f = den.toLinearAndUnitMultiplier();
	const retval = num.div(f.times(den.getMultiplier())).times(f.pow(one().minus(q)));
	return retval;
}

/**
 * Recognizes a perfect-square radicand that becomes a quadratic after replacing
 * an even power of one real variable. The candidate root must have a known sign.
 */
export function simplifyPerfectSquareRadical(x: Expression): Expression {
	let retval = x;
	if (x.isSum() && x.getPower().eq(half()) && x.getMultiplier().isOne()) {
		const variables = x.variables();
		if (variables.length === 1) {
			const variable = Expression.create(variables[0]);
			if (variable.gt(zero()) || variable.lt(zero())) {
				const expanded = x.getBase().expand();
				const degree = expanded.coeffs(variables[0]).max();
				// A Laurent quadratic in t = variable^degree has powers -1, 0, 1.
				// Multiplying by t turns it into an ordinary quadratic.
				if (degree > 0 && degree % 4 === 0 && expanded.isSum() &&
					expanded.elementsArray().some(term =>
						term.isVAR() && term.value === variables[0] &&
						term.getPower().eq(-degree)) &&
					expanded.elementsArray().every(term =>
						term.isNUM() || (term.isVAR() && term.value === variables[0] &&
							(term.getPower().eq(degree) || term.getPower().eq(-degree))))) {
					const variablePower = variable.pow(degree);
					const numerator = expanded.times(variablePower).expand();
					const coefficients = numerator.coeffs(variables[0]);
					const [substituted, substitutions] = uSub(variablePower, variablePower);
					const replacement = Object.keys(substitutions)[0];
					if (replacement && Object.keys(coefficients.coeffs).every(power =>
						power === '0' || power === String(degree) || power === String(2 * degree))) {
						const quadratic = (coefficients.getPower(2 * degree) ?? zero()).times(substituted.pow(2))
							.plus((coefficients.getPower(degree) ?? zero()).times(substituted))
							.plus(coefficients.getPower(0) ?? zero());
						const completed = sqcomp(quadratic, replacement);
						if (completed.a.isNUM() && completed.a.gt(zero()) &&
							completed.k.isZero() && completed.h.gte(zero())) {
							const root = variablePower.plus(completed.h).times(completed.a.pow(half()));
							// With degree divisible by four, this power is even and nonnegative for real inputs.
							const rootDenominator = variable.pow(degree / 2);
							if (root.pow(2).expand().eq(numerator) &&
								rootDenominator.pow(2).eq(variablePower)) {
								retval = root.div(rootDenominator);
							}
						}
					}
				}
			}
		}
	}
	return retval;
}

/**
 * Attempts to simplify radicals in the expression. Convert 2/√2 to √2.
 * @param x
 * @returns
 */
export function simplifyRadicals(x: Expression) {
	// This function only works if it's a product
	if (!x.isProduct()) {
		return x;
	}
	const m = x.getMultiplier();
	const p = x.getPower();
	let retval = one();

	const linearized = x.toLinearAndUnitMultiplier();
	const linearMultiplier = linearized.getMultiplier();

	const elements = linearized.elementsArray().map(e => {
		// Only rationalize if it actually has a radical (fractional power)
		if (e.hasRadical()) {
			return rationalize(e);
		}
		return e;
	});

	// The array of indices that have already been used
	const seen: number[] = [];

	for (let i = 0; i < elements.length; i++) {
		// Nothing to do if it's already been multiplied out
		if (seen.includes(i)) {
			continue;
		}

		let a = elements[i];
		const p = a.getPower();
		for (let j = i + 1; j < elements.length; j++) {
			const b = elements[j];

			if (p.eq(b.getPower())) {
				// Powers are stored directly on several expression node types. Extracting
				// the base through the common Expression API avoids assuming an EXP node
				// or a function wrapper for symbolic radicals.
				const u = a.toLinearAndUnitMultiplier();
				const v = b.toLinearAndUnitMultiplier();

				// Principal radicals can be combined when both radicands are known nonnegative.
				// Reciprocals still require a strictly signed base because a zero denominator
				// cannot be admitted by the sign proof for a negative power.
				if (!u.isComplex() && !v.isComplex() && u.gte(zero()) && v.gte(zero())) {
					const multiplier = a.getMultiplier().times(b.getMultiplier());

					if (u.isNUM() && v.isNUM()) {
						// Preserve exact numeric reduction when the combined radicand is numeric.
						a = u.times(v).pow(p).times(multiplier);
					} else {
						// Set the outer power directly so the normal power operation does not
						// distribute it back across the known-positive product.
						a = Expression.setPower(u.times(v), p).times(multiplier);
					}

					seen.push(j);
				}
			}
		}

		retval = retval.times(a);
	}

	return retval.pow(p).times(m).times(linearMultiplier);
}

/**
 * Eliminates common factors from the numerator and denominators give that they're two polynomials
 * @param x
 * @returns
 */
export function cancelCommonFactors(x: Expression) {
	if (!x.isProduct() || !x.isLinear()) {
		return x;
	}

	let retval = x;
	const [radFree, radicalSubs] = subRadicals(x);
	// Mathematical constants need the same temporary variable treatment as radicals
	// before entering the exact polynomial layer. Restore both substitution sets below.
	const [polynomialReady, subs] = uSubConstants(radFree, radicalSubs);
	let num = polynomialReady.getNumerator();
	let den = polynomialReady.getDenominator();

	function reduce(a: Expression, b: Expression) {
		let f = new Polynomial(a);
		// Factor both
		for (const e of polyFactorExpressions(b)) {
			// Constant factors do not contribute to polynomial cancellation.
			if (e.isNUM()) {
				continue;
			}
			const g = new Polynomial(e);
			const [q, r] = divide(f, g);
			if (r.isZero()) {
				// Continue dividing the remaining numerator, not the original one.
				a = q;
				f = new Polynomial(q);
				// Update the denominator
				const [q2, _r2] = divide(b, g);
				b = q2;
			}
		}

		return [a, b];
	}

	if (num.isPolynomialLike() && den.isPolynomialLike()) {
		// Reduce the numerator by the denominator
		[num, den] = reduce(num, den);
		// Reduce the denominator by the numerator
		[den, num] = reduce(den, num);
		// Return the quotient
		retval = num.div(den);
	}

	// First try to reduce the denominator
	return uUnSub(retval, subs);
}
