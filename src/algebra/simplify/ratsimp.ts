import { Expression } from '../../core/classes/expression/Expression';
import { one, zero } from '../../core/classes/expression/shortcuts';
import { Polynomial } from '../../core/classes/polynomial/Polynomial';
import { divide } from '../../core/classes/polynomial/utils';
import { subRadicals } from '../../core/functions/subst';
import { polyFactors } from '../factor/factor';

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

	const elements = x
		.toLinearAndUnitMultiplier()
		.elementsArray()
		.map(e => {
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
				const u = a.isEXP() ? a.getBase() : a.getArguments()[0];
				const v = b.isEXP() ? b.getBase() : b.getArguments()[0];
				// If they're both number then combine. Don't bother with symbolic values
				// as they're just return a product
				if (u && v && u.isNUM() && v.isNUM()) {
					const m = a.getMultiplier().times(b.getMultiplier());
					// Combine their values
					a = Expression.create(a.value).times(b.value).pow(p).times(m);
					// Mark it as seen
					seen.push(j);
				}
			}
		}

		retval = retval.times(a);
	}

	return retval.pow(p).times(m);
}

/**
 * Groups by non-integer denominators.
 * @param x
 */
function groupByDenominator(x: Expression) {
	let retval = x;
	if (x.isSum()) {
		let nonRationals = zero();
		const rationals: Record<string, Expression> = {};
		x.each(e => {
			const num = e.getNumerator();
			const den = e.getDenominator();
			if (den.isOne()) {
				nonRationals = nonRationals.plus(num);
			} else {
				// Create an entry for denominator
				const key = den.text();
				// If there's an existing key then add it
				rationals[key] = rationals[key] ? rationals[key].plus(num) : num;
			}
		});
		retval = nonRationals;
		// Put it all back together
		for (const x in rationals) {
			retval = retval.plus(rationals[x].div(Expression.create(x)));
		}
		retval = retval.pow(x.getPower()).times(x.getMultiplier());
	}

	return retval;
}

/**
 * Rewrites all the ratios to a common denominator
 * @param x
 * @returns
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
		// Group the denominators
		x = groupByDenominator(x);
		// Are we still dealing with a sum? If not the we're done
		// e.g. cos(x)/x+sin(x)/x will come back as a product and done
		if (!x.isSum()) {
			return x;
		}
		const p = x.getPower().abs();
		const m = x.getMultiplier();

		// Check if common denominator computation is needed
		let hasNonTrivialDenominator = false;
		let hasSymbolicDenominator = false;

		x.each(e => {
			const den = e.getDenominator();
			if (!den.isOne()) {
				hasNonTrivialDenominator = true;
				if (!den.isNUM()) {
					hasSymbolicDenominator = true;
				}
			}
		});

		// Nothing to do if all denominators are 1
		if (!hasNonTrivialDenominator) {
			return x;
		}

		// If only numeric denominators, only combine for polynomial-like expressions
		if (!hasSymbolicDenominator && !x.isPolynomialLike()) {
			return x;
		}

		// Use incremental algorithm to build common denominator
		let numerator = zero();
		let denominator = one();

		x.each(e => {
			const num = e.getNumerator();
			const den = e.getDenominator();
			numerator = numerator.times(den).plus(denominator.times(num));
			denominator = denominator.times(den);
		});

		// If the sign is inverted then flip it
		if (x.getPower().sign() === -1) {
			[denominator, numerator] = [numerator, denominator];
		}

		retval = numerator.div(denominator);
		// Put back the power
		if (!p.isOne()) {
			retval = retval.pow(p);
		}

		// Put back the multiplier
		if (!m.isOne()) {
			retval = retval.times(Expression.fromRational(m));
		}
	}

	return retval;
}

/**
 * Eliminates common factors from the numerator and denominators give that they're two polynomials
 * @param x
 * @returns
 */
export function cancelCommonFactors(x: Expression) {
	let retval = x;
	const [radFree, subs] = subRadicals(x);
	let num = radFree.getNumerator();
	let den = radFree.getDenominator();

	function reduce(a: Expression, b: Expression) {
		const f = new Polynomial(a);
		// Factor both
		polyFactors(b).each(e => {
			// Don't risk entering Q by dividing by a constant
			if ((e as Expression).isNUM()) {
				return e;
			}
			const g = new Polynomial(e as Expression);
			const [q, r] = divide(f, g);
			if (r.isZero()) {
				// Update the numerator with the new values
				a = q;
				// Update the denominator
				const [q2, _r2] = divide(b, g);
				b = q2;
				// Cancel it out
				return e;
			}
			return e;
		});

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
	return Expression.create(retval.text(), subs);
}
