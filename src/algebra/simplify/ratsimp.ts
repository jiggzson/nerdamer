import { Expression } from '../../core/classes/expression/Expression';
import { one } from '../../core/classes/expression/shortcuts';
import { Polynomial } from '../../core/classes/polynomial/Polynomial';
import { divide } from '../../core/classes/polynomial/utils';
import { toCommonDenominator } from '../../core/functions/rationalNormalization';
import { subRadicals, uSubConstants, uUnSub } from '../../core/functions/subst';
import { polyFactorExpressions } from '../factor/factor';

export { toCommonDenominator };

/**
 * Simplifies the expression through rationalizing
 * @param x
 * @returns
 */
export function rationalize(x: Expression) {
	const num = x.getNumerator();
	const den = x.getDenominator();
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
				if (!u.isComplex() && !v.isComplex() && u.gte(0) && v.gte(0)) {
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
		const f = new Polynomial(a);
		// Factor both
		for (const e of polyFactorExpressions(b)) {
			// Don't risk entering Q by dividing by a constant
			if (e.isNUM()) {
				continue;
			}
			const g = new Polynomial(e);
			const [q, r] = divide(f, g);
			if (r.isZero()) {
				// Update the numerator with the new values
				a = q;
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
