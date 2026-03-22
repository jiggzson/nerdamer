import { hypot } from '../../math/geometry';
import { ATAN, atan2, ATANH, cos, sin } from '../../math/trig';
import { Expression } from '../classes/expression/Expression';
import { minusOne, one, two, zero } from '../classes/expression/shortcuts';
import { add } from '../classes/parser/operations/add';
import { divide } from '../classes/parser/operations/divide';
import { multiply } from '../classes/parser/operations/multiply';
import { power } from '../classes/parser/operations/power';

import { expand } from './expand/expand';

import type { ExpressionInputType } from '../classes/parser/types';

/**
 * Retrieves the real part of a complex number
 *
 * @param a
 * @returns
 */
/**
 * Retrieves the real part of a complex number
 *
 * @param a
 * @returns
 */
export function realPart(a: Expression) {
	let retval: Expression;
	const x = expand(a);
	// The real part will be any known constants.
	// Handle pi, e, numbers, x, a*b
	if (
		x.isConstant() ||
		(x.isVAR() && !x.isI()) ||
		(x.isProduct() && !x.hasVariable(Expression.imaginary))
	) {
		retval = new Expression(a);
	}
	// Deal with x+1, y+y^2, ...
	else if (x.isSum()) {
		// Check if the sum has a power attached - if so, treat as single term
		if (!x.getPower().isOne()) {
			retval = new Expression(a);
		} else {
			retval = zero();
			const elements = x.getElements();
			for (const e in elements) {
				const re = realPart(elements[e]);
				retval = add(retval, re);
			}
		}
	}
	// Otherwise it's zero
	else {
		retval = zero();
	}

	return retval;
}

/**
 * Retrieves the imaginary part of a complex number
 *
 * @param a
 * @returns
 */
export function imagPart(a: Expression) {
	let retval: Expression;
	const x = expand(a);

	// i^p: use principal branch i = exp(i*pi/2) => Im(i^p) = sin(p*pi/2)
	if (x.isVAR() && x.isI()) {
		const p = x.getPower();
		if (p.isInteger()) {
			// Existing fast path for integer powers
			const theta = divide(Expression.Pi(), two());
			const im = sin(multiply(p, theta));
			retval = multiply(Expression.fromRational(x.getMultiplier()), im);
		} else {
			// Non-integer power: must use polar form of (multiplier * i)
			const base = multiply(Expression.fromRational(x.getMultiplier()), Expression.Img());
			const [r, theta] = toPolarFormArray(base);
			const rp = power(r, p);
			const im = sin(multiply(p, theta));
			retval = multiply(rp, im);
		}
	}
	// EXP with non-integer power: use polar form of base (principal branch)
	else if (x.isEXP()) {
		const p = x.getPower();
		if (p.isInteger()) {
			const base = multiply(Expression.fromRational(x.getMultiplier()), x.getBase());
			retval = imagPart(power(base, p));
		} else {
			const base = multiply(Expression.fromRational(x.getMultiplier()), x.getBase());
			const [r, theta] = toPolarFormArray(base);
			const rp = power(r, p);
			const im = sin(multiply(p, theta));
			retval = multiply(rp, im);
		}
	} else if (x.isSum()) {
		retval = zero();
		const elements = x.getElements();
		for (const e in elements) {
			retval = add(retval, imagPart(elements[e]));
		}
	} else if (x.isProduct()) {
		// Existing heuristic: linear in i for products with i present (power 1).
		if (x.hasVariable(Expression.imaginary)) {
			retval = Expression.fromRational(x.getMultiplier());
			const elements = x.getElements();
			for (const e in elements) {
				const t = elements[e];
				// Skip the plain i factor; keep everything else
				if (!(t.isVAR() && t.isI() && t.getPower().isOne())) {
					retval = multiply(retval, t);
				}
			}
		} else {
			retval = zero();
		}
	} else {
		retval = zero();
	}

	return retval;
}

/**
 * Simplifies a*i^n with numeric powers and coefficients
 *
 * @param x
 */
export function simplifyImaginary(x: Expression) {
	const power = x.getPower();
	if (x.isI() && power.isInteger()) {
		const r = power.mod('4').abs();
		// const sgn = power.sign();
		const rText = r.text();
		let retval: Expression;
		switch (rText) {
			case '1':
				retval = Expression.Img();
				break;
			case '2':
				retval = minusOne();
				break;
			case '3':
				retval = Expression.Img().neg();
				break;
			default:
				retval = one();
				break;
		}

		retval = multiply(retval, Expression.fromRational(x.getMultiplier()));

		return retval;
	}

	return x;
}

export function toPolarFormArray(x: Expression) {
	const re = x.realPart();
	const im = x.imagPart();
	const r = hypot(re, im);

	// Principal argument (theta)
	let theta: Expression;
	if (re.isZero()) {
		if (im.isZero()) {
			theta = zero();
		} else {
			// On the imaginary axis: choose ±pi/2 based on sign(im)
			theta =
				im.sign() < 0
					? multiply(minusOne(), divide(Expression.Pi(), two()))
					: divide(Expression.Pi(), two());
		}
	} else {
		theta = atan2(im, re);
	}

	return [r, theta];
}

/**
 * Calculates the polar from of a complex number
 * //IMPROVE: Potential speed boost by just returning i.
 *
 * @param x
 * @returns
 */
export function polarForm(x: Expression) {
	let retval;
	if (x.isNUM() || (x.isI() && x.isLinear())) {
		// The polarform of a number is just the number
		retval = new Expression(x);
	} else {
		// Get r and theta. Theta will come back as (atan(x) or a*pi/n)
		const [r, theta] = toPolarFormArray(expand(x));
		// Calculate the power i * theta
		const p = multiply(Expression.Img(), theta);
		// return r*e^(i*theta)
		const t = power(Expression.Variable('e'), p);
		retval = multiply(t, r);
	}
	return retval;
}

/**
 * Attempts to convert a polar form complex to rectangular form. If no exact identity
 * is found, the decimal representation in rectangular form is returned.
 *
 * @param x
 * @returns
 */
export function rectForm(x: ExpressionInputType) {
	x = Expression.create(x);

	let retval;

	function toTheta(t: Expression) {
		const elements = t.elementsArray();
		let complexPart = one();
		let realPart = one();
		for (const e of elements) {
			if (e.isComplex()) {
				complexPart = complexPart.times(e);
			} else {
				realPart = realPart.times(e);
			}
		}

		// Check if it's in the form i*θ
		if (complexPart.value === Expression.imaginary) {
			if (realPart.isFunction(ATAN)) {
				return realPart;
			}
			return realPart.times(t.getMultiplier());
		}
		if (
			complexPart.isFunction(ATAN) &&
			complexPart.getArguments()[0].value === Expression.imaginary
		) {
			const arg = complexPart.getArguments()[0];
			return Expression.toFunction(ATANH, [
				Expression.fromRational(arg.getMultiplier()),
			]).times(t.getMultiplier());
		}
	}

	if (x.isE()) {
		const p = x.getPower();
		const m = x.getMultiplier();
		if (p.isComplex()) {
			const theta = toTheta(p);
			if (theta) {
				retval = cos(theta).times(m).plus(sin(theta).times(m).i());
			}
		}
	} else if (x.isProduct()) {
		retval = Expression.fromRational(x.getMultiplier());
		x.each(e => {
			retval = retval.times(rectForm(e));
		});
	} else if (x.isSum()) {
		retval = zero();
		x.each(e => {
			retval = retval.plus(rectForm(e));
		});
	}

	if (retval) {
		retval = retval.expand();
	} else {
		retval = x.isComplex() ? x.evaluate() : x;
	}

	return retval;
}

/**
 * Returns the argument of an expression
 *
 * @param x
 * @returns
 */
export function arg(x: ExpressionInputType) {
	x = Expression.create(x);
	const [, theta] = toPolarFormArray(x);
	return theta;
}
