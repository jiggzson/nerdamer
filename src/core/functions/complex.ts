import { hypot } from '../../math/geometry';
import { atan2, cos, sin } from '../../math/trig';
import { Expression } from '../classes/expression/Expression';
import { minusOne, one, two, zero } from '../classes/expression/shortcuts';
import { ATAN, ATANH, CONJUGATE, CSGN, E, IMAGPART, REALPART } from '../classes/parser/constants';
import { add } from '../classes/parser/operations/add';
import { divide } from '../classes/parser/operations/divide';
import { multiply } from '../classes/parser/operations/multiply';
import { power } from '../classes/parser/operations/power';

import { expand } from './expand/expand';

import type { ExpressionInput } from '../types';

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

	// i^p: use principal branch i = exp(i*pi/2). The multiplier is an outer
	// coefficient and must not be folded into the powered base.
	if (x.isVAR() && x.isI()) {
		const p = x.getPower();
		const theta = divide(Expression.Pi(), two());
		const re = cos(multiply(p, theta));
		retval = multiply(Expression.fromRational(x.getMultiplier()), re);
	}
	// EXP nodes also carry their multiplier outside the powered base.
	else if (x.isEXP()) {
		const p = x.getPower();
		const multiplier = Expression.fromRational(x.getMultiplier());
		if (p.isInteger()) {
			retval = multiply(multiplier, realPart(power(x.getBase(), p)));
		} else {
			const [r, theta] = toPolarFormArray(x.getBase());
			const rp = power(r, p);
			const re = cos(multiply(p, theta));
			retval = multiply(multiplier, multiply(rp, re));
		}
	}
	// realpart(...) and imagpart(...) are real-valued by definition. Preserve
	// other functions without complex inputs, and keep explicitly complex
	// function components symbolic rather than treating them as zero.
	else if (x.isComplexComponentFunction()) {
		retval = new Expression(x);
	} else if (x.isFunction()) {
		retval = x.isComplex()
			? Expression.toFunction(REALPART, [x])
			: new Expression(x);
	}
	// Decompose products through their complex factors while preserving real
	// factors as an outer scale.
	else if (x.isProduct() && x.isComplex()) {
		const multiplier = Expression.fromRational(x.getMultiplier());
		let realFactor = one();
		let complexFactor: Expression | undefined;
		let complexFactorCount = 0;
		const elements = x.getElements();

		for (const e in elements) {
			const factor = elements[e];
			if (factor.isComplex()) {
				complexFactor = factor;
				complexFactorCount++;
			} else {
				realFactor = multiply(realFactor, factor);
			}
		}

		// A real product scales the components of its single complex factor.
		if (complexFactorCount === 1 && complexFactor) {
			retval = multiply(multiplier, multiply(realFactor, realPart(complexFactor)));
		} else {
			let productReal = one();
			let productImaginary = zero();

			for (const e in elements) {
				const factor = elements[e];
				if (factor.isComplex()) {
					const factorReal = realPart(factor);
					const factorImaginary = imagPart(factor);
					const previousReal = productReal;
					const previousImaginary = productImaginary;

					productReal = multiply(previousReal, factorReal).minus(
						multiply(previousImaginary, factorImaginary)
					);
					productImaginary = multiply(previousReal, factorImaginary).plus(
						multiply(previousImaginary, factorReal)
					);
				}
			}

			retval = multiply(multiplier, multiply(realFactor, productReal));
		}
	}
	// The real part will be any known constants.
	// Handle pi, e, numbers, x, a*b
	else if (
		x.isConstant() ||
		(x.isVAR() && !x.isI()) ||
		(x.isProduct() && !x.isComplex())
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

	// i^p: use principal branch i = exp(i*pi/2). The multiplier is an outer
	// coefficient and must not be folded into the powered base.
	if (x.isVAR() && x.isI()) {
		const p = x.getPower();
		const theta = divide(Expression.Pi(), two());
		const im = sin(multiply(p, theta));
		retval = multiply(Expression.fromRational(x.getMultiplier()), im);
	}
	// EXP nodes also carry their multiplier outside the powered base.
	else if (x.isEXP()) {
		const p = x.getPower();
		const multiplier = Expression.fromRational(x.getMultiplier());
		if (p.isInteger()) {
			retval = multiply(multiplier, imagPart(power(x.getBase(), p)));
		} else {
			const [r, theta] = toPolarFormArray(x.getBase());
			const rp = power(r, p);
			const im = sin(multiply(p, theta));
			retval = multiply(multiplier, multiply(rp, im));
		}
	}
	// realpart(...) and imagpart(...) are real-valued by definition. For other
	// explicitly complex functions, keep the component symbolic rather than
	// silently treating an unevaluated function as zero.
	else if (x.isComplexComponentFunction()) {
		retval = zero();
	} else if (x.isFunction() && x.isComplex()) {
		retval = Expression.toFunction(IMAGPART, [x]);
	} else if (x.isSum()) {
		retval = zero();
		const elements = x.getElements();
		for (const e in elements) {
			retval = add(retval, imagPart(elements[e]));
		}
	} else if (x.isProduct()) {
		if (x.isComplex()) {
			const multiplier = Expression.fromRational(x.getMultiplier());
			let realFactor = one();
			let complexFactor: Expression | undefined;
			let complexFactorCount = 0;
			const elements = x.getElements();

			for (const e in elements) {
				const factor = elements[e];
				if (factor.isComplex()) {
					complexFactor = factor;
					complexFactorCount++;
				} else {
					realFactor = multiply(realFactor, factor);
				}
			}

			// A real product scales the components of its single complex factor.
			if (complexFactorCount === 1 && complexFactor) {
				retval = multiply(
					multiplier,
					multiply(realFactor, imagPart(complexFactor))
				);
			} else {
				let productReal = one();
				let productImaginary = zero();

				for (const e in elements) {
					const factor = elements[e];
					if (factor.isComplex()) {
						const factorReal = realPart(factor);
						const factorImaginary = imagPart(factor);
						const previousReal = productReal;
						const previousImaginary = productImaginary;

						productReal = multiply(previousReal, factorReal).minus(
							multiply(previousImaginary, factorImaginary)
						);
						productImaginary = multiply(previousReal, factorImaginary).plus(
							multiply(previousImaginary, factorReal)
						);
					}
				}

				retval = multiply(multiplier, multiply(realFactor, productImaginary));
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
		} else if (im.isConstant()) {
			// On the imaginary axis: choose ±pi/2 based on sign(im)
			theta =
				im.sign() < 0
					? multiply(minusOne(), divide(Expression.Pi(), two()))
					: divide(Expression.Pi(), two());
		} else {
			theta = atan2(im, re);
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
	let retval: Expression;
	if (x.isNUM() || (x.isI() && x.isLinear())) {
		// The polarform of a number is just the number
		retval = new Expression(x);
	} else {
		// Get r and theta. Theta will come back as (atan(x) or a*pi/n)
		const [r, theta] = toPolarFormArray(expand(x));
		// Calculate the power i * theta
		const p = multiply(Expression.Img(), theta);
		// return r*e^(i*theta)
		const t = power(Expression.Variable(E), p);
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
export function rectForm(x: ExpressionInput): Expression {
	x = Expression.create(x);

	let retval: Expression | undefined;

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
		let result = Expression.fromRational(x.getMultiplier());
		x.each((e: Expression) => {
			result = result.times(rectForm(e));
		});
		retval = result;
	} else if (x.isSum()) {
		let result = zero();
		x.each((e: Expression) => {
			result = result.plus(rectForm(e));
		});
		retval = result;
	}

	const result = retval ? retval.expand() : x.isComplex() ? x.evaluate() : x;

	return result;
}

/**
 * Returns the argument of an expression
 *
 * @param x
 * @returns
 */
export function arg(x: ExpressionInput) {
	x = Expression.create(x);
	const [, theta] = toPolarFormArray(x);
	return theta;
}

/**
 * Returns the complex conjugate of an expression.
 * For a complex number z = a + bi, the conjugate is a - bi.
 * Distributes over sums, products, integer powers, and powers whose
 * constant base is known not to lie on the principal logarithm's branch cut.
 *
 * @param expr - The expression to conjugate
 * @returns The complex conjugate of the expression
 *
 * @example
 * conjugate('3+2*i')    // 3-2*i
 * conjugate('i')        // -i
 * conjugate('a+b*i')    // a-b*i
 * conjugate('(1+i)^i')  // (1-i)^(-i)
 */
export function conjugate(x: ExpressionInput): Expression {
	x = Expression.create(x);
	const expr = expand(x);
	let retval: Expression | undefined = undefined;
	const p = expr.getPower();

	// A power belongs to the whole expression, even when the base is stored as
	// a SUM, PRD, or VAR rather than an EXP node. Handle that before distributing
	// conjugation through the underlying structure. NUM uses a synthetic power of
	// zero, so it must remain a terminal real value rather than entering this path.
	if (expr.isEXP() || (!expr.isNUM() && !p.isOne())) {
		const multiplier = Expression.fromRational(expr.getMultiplier());
		const base = expr.getBase();
		const re = realPart(base);
		const im = imagPart(base);
		const knownOffBranchCut =
			re.isConstant() &&
			im.isConstant() &&
			(!im.isZero() || (!re.isZero() && re.sign() > 0));

		if (p.isInteger() || knownOffBranchCut) {
			const conjBase = conjugate(base);
			const conjPow = p.isComplex() ? conjugate(p) : p;
			retval = multiplier.times(conjBase.pow(conjPow));
		} else {
			retval = Expression.toFunction(CONJUGATE, [expr]);
		}
	} else if (expr.isVAR() && expr.isI()) {
		retval = expr.neg();
	} else if (expr.isSum()) {
		retval = zero();
		for (const e of expr.elementsArray()) {
			retval = retval.plus(conjugate(e));
		}
	} else if (expr.isProduct()) {
		retval = Expression.fromRational(expr.getMultiplier());
		for (const e of expr.elementsArray()) {
			retval = retval.times(conjugate(e));
		}
	}

	return retval ?? x;
}

/**
 * Returns the complex signum (csgn) of an expression, following the
 * Maple/SymPy convention. Returns 1 if Re(z) > 0, -1 if Re(z) < 0,
 * and sgn(Im(z)) if Re(z) = 0. Returns 0 for z = 0.
 *
 * For expressions containing free variables where the sign cannot be
 * determined, returns an unevaluated symbolic csgn(z).
 *
 * Useful for branch cut decisions in sqrt, log, and power simplification.
 *
 * @param expr - The expression to evaluate the complex sign of
 * @returns 1, -1, 0, or an unevaluated csgn expression
 *
 * @example
 * csgn('3+2*i')   // 1
 * csgn('-1+3*i')  // -1
 * csgn('2*i')     // 1
 * csgn('-5*i')    // -1
 * csgn('0')       // 0
 * csgn('x+2*i')   // csgn(x+2*i)
 */
export function csgn(x: ExpressionInput): Expression {
	x = Expression.create(x);
	const expr = expand(x);
	const re = realPart(expr);
	const im = imagPart(expr);
	let retval: Expression | undefined = undefined;

	if (re.isZero() && im.isZero()) {
		retval = zero();
	} else if (!re.isZero() && re.isConstant()) {
		retval = re.sign() > 0 ? one() : minusOne();
	} else if (re.isZero() && im.isConstant()) {
		retval = im.sign() > 0 ? one() : minusOne();
	}

	return retval ?? Expression.toFunction(CSGN, [expr]);
}
