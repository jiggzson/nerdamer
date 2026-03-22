import { Expression } from '../core/classes/expression/Expression';
import { four, minusOne, one, six, three, two, zero } from '../core/classes/expression/shortcuts';
import { PI } from '../core/classes/parser/constants';
import { evaluate } from '../core/classes/parser/helpers';
import { Rational } from '../core/classes/rational/Rational';
import { message, UndefinedError } from '../core/errors';
import { isEven } from '../core/functions/bigint/bigint';
import { Settings } from '../core/Settings';

import { hypot } from './geometry';
import { sqrt } from './math';
import { log } from './math';

import type { ExpressionInputType } from '../core/classes/parser/types';

export const TRIG_FUNCTION_NAMES = {
	COS: 'cos',
	SIN: 'sin',
	TAN: 'tan',
	SEC: 'sec',
	CSC: 'csc',
	COT: 'cot',
	ACOS: 'acos',
	ASIN: 'asin',
	ATAN: 'atan',
	ASEC: 'asec',
	ACSC: 'acsc',
	ACOT: 'acot',
	ATAN2: 'atan2',
	SINH: 'sinh',
	COSH: 'cosh',
	TANH: 'tanh',
	SECH: 'sech',
	CSCH: 'csch',
	COTH: 'coth',
	ACOSH: 'acosh',
	ASINH: 'asinh',
	ATANH: 'atanh',
	ASECH: 'asech',
	ACSCH: 'acsch',
	ACOTH: 'acoth',
};

export const {
	COS,
	SIN,
	TAN,
	ASIN,
	ACOS,
	SEC,
	CSC,
	COT,
	ATAN,
	ASEC,
	ACSC,
	ACOT,
	ATAN2,
	SINH,
	COSH,
	TANH,
	SECH,
	CSCH,
	COTH,
	ACOSH,
	ASINH,
	ATANH,
	ASECH,
	ACSCH,
	ACOTH,
} = TRIG_FUNCTION_NAMES;

export const TRIG = [COS, SIN, TAN, SEC, CSC, COT];
export const INVERSE_TRIG = [ACOS, ASIN, ATAN, ASEC, ACSC, ACOT];
export const HYPERBOLIC_TRIG = [COSH, SINH, TANH, SECH, CSCH, COTH];
export const INVERSE_HYPERBOLIC_TRIG = [ACOSH, ASINH, ATANH, ASECH, ACSCH, ACOTH];

/**
 * Gets the quadrant of the trig function
 * @param x
 * @returns
 */
function getQuadrant(x: Rational) {
	const pi = Rational.PI.toDecimal();
	const twoPi = pi.times(2);
	// Get the angle by removing multiples of pi
	let theta = x.toDecimal().mod(twoPi);
	// Make it a positive angle
	if (theta.lt(0)) {
		theta = theta.plus(twoPi);
	}
	const quadrant = Math.floor(Number(theta.div(pi.div(2)))) + 1;
	// Ensure no more than 4
	return Math.min(quadrant, 4);
}

/**
 * Checks to see if a Expression is a multiple of pi. If so it returns the evaluated
 * version. Otherwise, the Expression is untouched.
 *
 * @param x
 * @returns
 */
function toPiValue(x: Expression) {
	return PI.includes(x.value) && x.isLinear()
		? evaluate(`${x}`, { [x.value]: `${Rational.PI}` })
		: x;
}

// function argNumDen(x: Expression, withR:true): [Expression, Expression, Expression];
// function argNumDen(x: Expression, withR:false): [Expression, Expression];
function argNumDen(x: Expression, withR = false) {
	const arg = x.getArguments()[0];
	const num = arg.getNumerator();
	const den = arg.getDenominator();
	const retval = [num, den];

	if (withR) {
		retval.push(hypot(num, den));
	}

	return retval;
}

/**
 * Computes the cosine of an expression. Returns exact symbolic values for
 * well-known multiples of π (π/6, π/4, π/3, π/2, π, etc.).
 *
 * Cosine is an even function: `cos(-x)` automatically simplifies to `cos(x)`.
 * Inverse trig compositions are resolved:
 * - `cos(acos(x))` returns `x`
 * - `cos(asin(x))` returns `sqrt(1 − x²)`
 * - `cos(atan(x))` returns `1/sqrt(1 + x²)`
 *
 * @param x - The angle in radians.
 * @returns The cosine of `x`.
 * @throws {@link UndefinedError} If `x` is `±∞`.
 *
 * @example
 * ```ts
 * cos(0).text()             // "1"
 * cos('pi').text()          // "-1"
 * cos('pi/2').text()        // "0"
 * cos('pi/3').text()        // "1/2"
 * cos('pi/4').text()        // "1/2*sqrt(2)"
 * cos('pi/6').text()        // "1/2*sqrt(3)"
 *
 * // Symbolic
 * cos('x').text()           // "cos(x)"
 * ```
 */
export function cos(x: ExpressionInputType): Expression {
	x = Expression.create(x);

	let retval: Expression;

	// cos(±∞) is undefined
	if (x.isPosInf() || x.isNegInf()) {
		throw new UndefinedError(message('undefinedValue'));
	}

	// cos is an even function: cos(-x) = cos(x)
	if (x.sign() === -1 && !x.isNUM()) {
		return cos(x.neg());
	}

	const m = Math.abs(+x.getMultiplier().text());

	if (m === 1 && x.isFunction(ATAN)) {
		const [, den, r] = argNumDen(x, true);
		retval = den.div(r);
	} else if (m === 1 && x.isFunction(ACOS)) {
		retval = x.getArguments()[0];
	} else if (m === 1 && x.isFunction(ASIN)) {
		const [num, den] = argNumDen(x);
		retval = sqrt(den.sq().minus(num.sq())).div(den);
	} else {
		// Create a temporary variable. We can use this to substitute for pi and simplification
		const t = toPiValue(x);
		// A flag to check the quadrant. This should be done if a pi substitution was performed.
		let checkQuadrant = true;
		// The quadrants in which cosine is negative
		const quadrants = [2, 3];

		if (t.isNUM()) {
			const a = t.getMultiplier();
			// Check its ratio to pi
			const r = a.div(Rational.PI);

			// cos is one for all even pi and -1 for odd
			if (r.isInteger()) {
				// Return 1 or -1 for multiples of pi
				retval = Expression.Number(isEven(r.numerator) ? '1' : '-1');
			} else {
				// Modify based on the denominator
				switch (r.denominator) {
					// n*pi/2
					case 2n:
						retval = zero();
						break;
					case 3n:
						retval = one().div(two());
						break;
					case 4n:
						// Return 1/sqrt(2)
						retval = one().div(sqrt(two()));
						break;
					case 6n:
						// Return sqrt(3)/2
						retval = sqrt(three()).div(two());
						break;
					default:
						// Don't check the quadrant since no pi substitution was performed
						checkQuadrant = false;
						// If evaluate is called then return the value
						if (Settings.EVALUATE) {
							retval = Expression.Number(a.toDecimal().cos());
						} else {
							// Otherwise return a symbolic function
							retval = Expression.toFunction(COS, [x]);
						}
						break;
				}

				if (checkQuadrant && r.denominator !== 2n && quadrants.includes(getQuadrant(a))) {
					retval = retval.neg();
				}
			}
		} else if (Settings.EVALUATE && x.isComplex()) {
			const re = x.realPart();
			const im = x.imagPart();
			retval = cos(re)
				.times(cosh(im))
				.minus(sin(re).times(sinh(im)).i());
		} else {
			retval = Expression.toFunction(COS, [x]);
		}
	}

	return retval;
}

/**
 * Computes the sine of an expression. Returns exact symbolic values for
 * well-known multiples of π (π/6, π/4, π/3, π/2, π, etc.).
 *
 * Sine is an odd function: `sin(-x)` automatically simplifies to `-sin(x)`.
 * Inverse trig compositions are resolved:
 * - `sin(asin(x))` returns `x`
 * - `sin(acos(x))` returns `sqrt(1 − x²)`
 * - `sin(atan(x))` returns `x/sqrt(1 + x²)`
 *
 * @param x - The angle in radians.
 * @returns The sine of `x`.
 * @throws {@link UndefinedError} If `x` is `±∞`.
 *
 * @example
 * ```ts
 * sin(0).text()             // "0"
 * sin('pi').text()          // "0"
 * sin('pi/2').text()        // "1"
 * sin('pi/6').text()        // "1/2"
 * sin('pi/4').text()        // "1/2*sqrt(2)"
 * sin('pi/3').text()        // "1/2*sqrt(3)"
 *
 * // Symbolic
 * sin('x').text()           // "sin(x)"
 * ```
 */
export function sin(x: ExpressionInputType): Expression {
	x = Expression.create(x);

	let retval: Expression;

	// sin(±∞) is undefined
	if (x.isPosInf() || x.isNegInf()) {
		throw new UndefinedError(message('undefinedValue'));
	}

	// sin is an odd function: sin(-x) = -sin(x)
	if (x.sign() === -1 && !x.isNUM()) {
		return sin(x.neg()).neg();
	}

	const m = Math.abs(+x.getMultiplier().text());

	if (m === 1 && x.isFunction(ATAN)) {
		const [num, , r] = argNumDen(x, true);
		retval = num.div(r).times(x.sign());
	} else if (m === 1 && x.isFunction(ASIN)) {
		retval = x.getArguments()[0].times(x.sign());
	} else if (m === 1 && x.isFunction(ACOS)) {
		const [num, den] = argNumDen(x);
		retval = sqrt(den.sq().minus(num.sq())).div(den).times(x.sign());
	} else {
		// Create a temporary variable. We can use this to substitute for pi and simplification
		const t = toPiValue(x);
		// A flag to check the quadrant. This should be done if a pi substitution was performed.
		let checkQuadrant = true;
		// The quadrants in which the sine function is negative
		const quadrants = [3, 4];

		if (t.isNUM()) {
			const a = t.getMultiplier();
			// Check its ratio to pi
			const r = a.div(Rational.PI);

			if (r.isInteger()) {
				// sin is zero for all multiples of pi
				retval = zero();
			} else {
				// Modify based on the denominator
				switch (r.denominator) {
					// n*pi/2
					case 2n:
						retval = one();
						break;
					case 3n:
						// Return sqrt(3)/2
						retval = sqrt(three()).div(two());
						break;
					case 4n:
						// Return 1/sqrt(2)
						retval = one().div(sqrt(two()));
						break;
					case 6n:
						// Return 1/2
						retval = one().div(two());
						break;
					default:
						// Don't check the quadrant since no pi substitution was performed
						checkQuadrant = false;
						// If evaluate is called then return the value
						if (Settings.EVALUATE) {
							retval = Expression.Number(a.toDecimal().sin());
						} else {
							// Otherwise return a symbolic function
							retval = Expression.toFunction(SIN, [x]);
						}
						break;
				}

				if (checkQuadrant && quadrants.includes(getQuadrant(a))) {
					retval = retval.neg();
				}
			}
		} else if (Settings.EVALUATE && x.isComplex()) {
			const re = x.realPart();
			const im = x.imagPart();
			retval = sin(re)
				.times(cosh(im))
				.plus(cos(re).times(sinh(im)).i());
		} else {
			retval = Expression.toFunction(SIN, [x]);
		}
	}

	return retval;
}

/**
 * Computes the tangent of an expression.
 *
 * Tangent is an odd function: `tan(-x)` automatically simplifies to `-tan(x)`.
 * Returns `0` for all integer multiples of π.
 * Inverse trig compositions are resolved:
 * - `tan(atan(x))` returns `x`
 * - `tan(asin(x))` returns `x/sqrt(1 − x²)`
 * - `tan(acos(x))` returns `sqrt(1 − x²)/x`
 *
 * @param x - The angle in radians.
 * @returns The tangent of `x`.
 * @throws {@link UndefinedError} If `x` is `±∞` or an odd multiple of `π/2`.
 *
 * @example
 * ```ts
 * tan(0).text()             // "0"
 * tan('pi').text()          // "0"
 * tan('pi/4').text()        // "1"
 *
 * // Symbolic
 * tan('x').text()           // "tan(x)"
 * ```
 */
export function tan(x: ExpressionInputType): Expression {
	x = Expression.create(x);

	let retval;

	// tan(±∞) is undefined
	if (x.isPosInf() || x.isNegInf()) {
		throw new UndefinedError(message('undefinedValue'));
	}

	// tan is an odd function: tan(-x) = -tan(x)
	if (x.sign() === -1 && !x.isNUM()) {
		return tan(x.neg()).neg();
	}

	const m = Math.abs(+x.getMultiplier().text());

	if (m === 1 && x.isFunction(ATAN)) {
		retval = x.getArguments()[0].times(x.sign());
	} else if (m === 1 && x.isFunction(ASIN)) {
		const [num, den] = argNumDen(x);
		retval = num.div(sqrt(den.sq().minus(num.sq()))).times(x.sign());
	} else if (m === 1 && x.isFunction(ACOS)) {
		const [num, den] = argNumDen(x);
		retval = sqrt(den.sq().minus(num.sq())).div(num).times(x.sign());
	} else {
		const piDenominator = toPiValue(x).getMultiplier().div(Rational.PI).denominator;
		// If it's a multiple of pi or zero
		if (piDenominator === 1n || x.isZero()) {
			retval = zero();
		}
		// Check for multiplier of pi/2 and throw if true
		else if (piDenominator === 2n) {
			throw new UndefinedError(message('tanUndefined'));
		} else if (Settings.EVALUATE && x.isNUM()) {
			retval = Expression.Number(x.getMultiplier().toDecimal().tan());
		} else if (Settings.EVALUATE && x.isComplex()) {
			const dblRe = x.realPart().times(2);
			const dblIm = x.imagPart().times(2);
			const d = cos(dblRe).plus(cosh(dblIm));
			retval = sin(dblRe).div(d).plus(sinh(dblIm).div(d).i());
		} else {
			retval = sin(x).div(cos(x));
			if (retval.hasFunction(COS)) {
				retval = Expression.toFunction(TAN, [x]);
			}
		}
	}

	return retval;
}

/**
 * Computes the secant of an expression: `sec(x) = 1/cos(x)`.
 *
 * Returns exact values at well-known angles by inverting the result of {@link cos}.
 *
 * @param x - The angle in radians.
 * @returns The secant of `x`.
 * @throws {@link UndefinedError} If `x` is `±∞` or an odd multiple of `π/2` (where `cos(x) = 0`).
 *
 * @example
 * ```ts
 * sec(0).text()             // "1"
 * sec('pi').text()          // "-1"
 * sec('pi/3').text()        // "2"
 * sec('pi/4').text()        // "sqrt(2)"
 *
 * // Symbolic
 * sec('x').text()           // "sec(x)"
 * ```
 */
export function sec(x: ExpressionInputType): Expression {
	x = Expression.create(x);

	// sec(±∞) is undefined
	if (x.isPosInf() || x.isNegInf()) {
		throw new UndefinedError(message('undefinedValue'));
	}

	let retval;
	if (Settings.EVALUATE && x.isComplex()) {
		const re = x.realPart();
		const im = x.imagPart();
		const a = cos(re);
		const b = cosh(im);
		const c = sin(re);
		const d = sinh(im);
		const e = a.sq().times(b.sq()).plus(c.sq().times(d.sq()));
		retval = a.times(b).div(e).plus(c.times(d).div(e).i());
	} else {
		// sec(n*pi/2) is undefined
		const cosVal = cos(x);
		if (cosVal.isZero()) {
			throw new UndefinedError(message('secUndefined'));
		}
		retval = cosVal.invert();
		if (retval.hasFunction(COS)) {
			retval = Expression.toFunction(SEC, [x]);
		}
	}

	return retval;
}

/**
 * Computes the cosecant of an expression: `csc(x) = 1/sin(x)`.
 *
 * Returns exact values at well-known angles by inverting the result of {@link sin}.
 *
 * @param x - The angle in radians.
 * @returns The cosecant of `x`.
 * @throws {@link UndefinedError} If `x` is `±∞` or an integer multiple of `π` (where `sin(x) = 0`).
 *
 * @example
 * ```ts
 * csc('pi/2').text()        // "1"
 * csc('pi/6').text()        // "2"
 * csc('pi/4').text()        // "sqrt(2)"
 *
 * // Symbolic
 * csc('x').text()           // "csc(x)"
 * ```
 */
export function csc(x: ExpressionInputType): Expression {
	x = Expression.create(x);

	// csc(±∞) is undefined
	if (x.isPosInf() || x.isNegInf()) {
		throw new UndefinedError(message('undefinedValue'));
	}

	let retval;

	if (Settings.EVALUATE && x.isComplex()) {
		const re = x.realPart();
		const im = x.imagPart();
		const a = sin(re);
		const b = cosh(im);
		const c = cos(re);
		const d = sinh(im);
		const e = a.sq().times(b.sq()).plus(c.sq().times(d.sq()));
		retval = a.times(b).div(e).minus(c.times(d).div(e).i());
	} else {
		// csc(n*pi) is undefined
		const sinVal = sin(x);
		if (sinVal.isZero()) {
			throw new UndefinedError(message('cscUndefined'));
		}
		retval = sinVal.invert();
		if (retval.hasFunction(SIN)) {
			retval = Expression.toFunction(CSC, [x]);
		}
	}

	return retval;
}

/**
 * Computes the cotangent of an expression: `cot(x) = cos(x)/sin(x)`.
 *
 * Returns exact values at well-known angles by dividing {@link cos} by {@link sin}.
 *
 * @param x - The angle in radians.
 * @returns The cotangent of `x`.
 * @throws {@link UndefinedError} If `x` is `±∞` or an integer multiple of `π` (where `sin(x) = 0`).
 *
 * @example
 * ```ts
 * cot('pi/4').text()        // "1"
 * cot('pi/3').text()        // "1/3*sqrt(3)"
 *
 * // Symbolic
 * cot('x').text()           // "cot(x)"
 * ```
 */
export function cot(x: ExpressionInputType): Expression {
	x = Expression.create(x);

	// cot(±∞) is undefined
	if (x.isPosInf() || x.isNegInf()) {
		throw new UndefinedError(message('undefinedValue'));
	}

	let retval;

	if (Settings.EVALUATE && x.isComplex()) {
		const re = x.realPart();
		const im = x.imagPart();
		const a = sin(re);
		const b = cos(re);
		const c = sinh(im.times(two()));
		const d = cosh(im.times(two()));
		const e = cos(re.times(two()));
		const denom = d.minus(e);
		retval = a.times(b).times(two()).div(denom).plus(c.neg().div(denom).i());
	} else {
		// cot(n*pi) is undefined
		const sinVal = sin(x);
		if (sinVal.isZero()) {
			throw new UndefinedError(message('cotUndefined'));
		}
		retval = cos(x).div(sinVal);
		if (retval.hasFunction(COS)) {
			retval = Expression.toFunction(COT, [x]);
		}
	}

	return retval;
}

/**
 * Computes the arccosine (inverse cosine) of an expression.
 *
 * Returns exact symbolic values involving π for well-known inputs:
 * `0 → π/2`, `1/2 → π/3`, `1/√2 → π/4`, `√3/2 → π/6`, `1 → 0`.
 * Uses the identity `acos(-x) = π − acos(x)` for negative arguments.
 *
 * For numeric inputs outside `[-1, 1]`, returns a complex result via
 * `π/2 + asin(|x|)` with the appropriate sign adjustment.
 *
 * @param x - The input expression (domain `[-1, 1]` for real results).
 * @returns The arccosine of `x` in radians.
 * @throws {@link UndefinedError} If `x` is `±∞`.
 *
 * @example
 * ```ts
 * acos(1).text()                    // "0"
 * acos(0).text()                    // "1/2*pi"
 * acos('1/2').text()                // "1/3*pi"
 * acos('sqrt(2)^(-1)').text()       // "1/4*pi"
 * acos(-1).text()                   // "pi"
 *
 * // Symbolic
 * acos('x').text()                  // "acos(x)"
 * ```
 */
export function acos(x: ExpressionInputType): Expression {
	x = Expression.create(x);

	// acos(±∞) is undefined (domain is [-1, 1])
	if (x.isPosInf() || x.isNegInf()) {
		throw new UndefinedError(message('undefinedValue'));
	}

	let retval: Expression | undefined;

	if (Settings.EVALUATE && x.isNUM()) {
		// Becomes complex between [-1, 1]
		if (x.lt(-1) || x.gt(1)) {
			const sgn = x.sign();
			const halfPi = Expression.Pi().div(two());
			let asinX = asin(x.abs());
			if (sgn === 1) {
				asinX = asinX.neg();
			}

			retval = halfPi.plus(asinX);
		} else {
			retval = Expression.Number(x.getMultiplier().toDecimal().acos());
		}
	} else if (Settings.EVALUATE && x.isComplex()) {
		const i = Expression.Img();
		const a = sqrt(one().minus(x.pow(two())));
		const b = i.times(x);
		// Use formula: pi/2 - asin(x)
		retval = Expression.Pi()
			.div(two())
			.minus(i.times(log(a.minus(b))))
			.expand();
	} else {
		// Known values lookup using structural equality
		const knownValues: [Expression, Expression][] = [
			[zero(), Expression.Pi().div(two())],
			[one().div(two()), Expression.Pi().div(three())],
			[one().div(sqrt(two())), Expression.Pi().div(four())],
			[sqrt(three()).div(two()), Expression.Pi().div(six())],
			[one(), zero()],
		];

		const absX = x.abs();
		for (const [value, result] of knownValues) {
			if (absX.eq(value)) {
				// acos(-x) = π - acos(x)
				retval = x.sign() === -1 ? Expression.Pi().minus(result) : result;
				break;
			}
		}
	}

	if (retval === undefined) {
		retval = Expression.toFunction(ACOS, [x]);
	}

	return retval;
}

/**
 * Computes the arcsine (inverse sine) of an expression.
 *
 * Returns exact symbolic values involving π for well-known inputs:
 * `0 → 0`, `1/2 → π/6`, `1/√2 → π/4`, `√3/2 → π/3`, `1 → π/2`.
 * Uses the identity `asin(-x) = -asin(x)` for negative arguments.
 *
 * For numeric inputs outside `[-1, 1]`, returns a complex result.
 *
 * @param x - The input expression (domain `[-1, 1]` for real results).
 * @returns The arcsine of `x` in radians.
 * @throws {@link UndefinedError} If `x` is `±∞`.
 *
 * @example
 * ```ts
 * asin(0).text()                    // "0"
 * asin(1).text()                    // "1/2*pi"
 * asin('1/2').text()                // "1/6*pi"
 * asin('sqrt(2)^(-1)').text()       // "1/4*pi"
 *
 * // Symbolic
 * asin('x').text()                  // "asin(x)"
 * ```
 */
export function asin(x: ExpressionInputType) {
	x = Expression.create(x);

	// asin(±∞) is undefined (domain is [-1, 1])
	if (x.isPosInf() || x.isNegInf()) {
		throw new UndefinedError(message('undefinedValue'));
	}

	let retval: Expression | undefined;

	if (Settings.EVALUATE && x.isNUM()) {
		// asin has a domain of -1 to 1
		if (x.lt(minusOne()) || x.gt(one())) {
			const sgn = x.sign();
			x = x.abs();
			const xSqrMin1 = sqrt(x.sq().minus(one()));
			let halfPi = Expression.Pi().div(two());
			let i = Expression.Img();
			if (sgn === -1) {
				halfPi = halfPi.neg();
			} else {
				i = i.neg();
			}

			retval = halfPi.plus(i.times(log(x.plus(xSqrMin1))));
		} else {
			retval = Expression.Number(x.getMultiplier().toDecimal().asin());
		}
	} else if (Settings.EVALUATE && x.isComplex()) {
		const i = Expression.Img();
		const a = sqrt(one().minus(x.pow(two())));
		const b = i.times(x);
		retval = i.times(log(a.minus(b))).expand();
	} else {
		// Known values lookup using structural equality
		const knownValues: [Expression, Expression][] = [
			[zero(), zero()],
			[one().div(two()), Expression.Pi().div(six())],
			[one().div(sqrt(two())), Expression.Pi().div(four())],
			[sqrt(three()).div(two()), Expression.Pi().div(three())],
			[one(), Expression.Pi().div(two())],
		];

		const absX = x.abs();
		for (const [value, result] of knownValues) {
			if (absX.eq(value)) {
				// asin(-x) = -asin(x)
				retval = x.sign() === -1 ? result.neg() : result;
				break;
			}
		}
	}

	if (retval === undefined) {
		retval = Expression.toFunction(ASIN, [x]);
	}

	return retval;
}

/**
 * Computes the arctangent (inverse tangent) of an expression.
 *
 * Returns exact symbolic values involving π for well-known inputs:
 * `0 → 0`, `1/√3 → π/6`, `1 → π/4`, `√3 → π/3`.
 * Uses the identity `atan(-x) = -atan(x)` for negative arguments.
 *
 * At infinity: `atan(+∞) = π/2`, `atan(−∞) = −π/2`.
 *
 * @param x - The input expression.
 * @returns The arctangent of `x` in radians.
 *
 * @example
 * ```ts
 * atan(0).text()              // "0"
 * atan(1).text()              // "1/4*pi"
 * atan('sqrt(3)').text()      // "1/3*pi"
 *
 * // Symbolic
 * atan('x').text()            // "atan(x)"
 * ```
 */
export function atan(x: ExpressionInputType): Expression {
	x = Expression.create(x);

	let retval: Expression | undefined;

	// atan(∞) = π/2, atan(-∞) = -π/2
	if (x.isPosInf() || x.isNegInf()) {
		const halfPi = Expression.Pi().div(two());
		return x.isNegInf() ? halfPi.neg() : halfPi;
	}

	if (Settings.EVALUATE && x.isNUM()) {
		retval = Expression.Number(x.getMultiplier().toDecimal().atan());
	} else if (Settings.EVALUATE && x.isComplex()) {
		const i = Expression.Img();
		const a = log(i.minus(x).div(i.plus(x)));
		retval = i.neg().div(two()).times(a).expand();
	} else {
		// Known values lookup using structural equality
		const knownValues: [Expression, Expression][] = [
			[zero(), zero()],
			[sqrt(three()).invert(), Expression.Pi().div(six())],
			[one(), Expression.Pi().div(four())],
			[sqrt(three()), Expression.Pi().div(three())],
		];

		const absX = x.abs();
		for (const [value, result] of knownValues) {
			if (absX.eq(value)) {
				// atan(-x) = -atan(x)
				retval = x.sign() === -1 ? result.neg() : result;
				break;
			}
		}
	}

	if (!retval) {
		retval = Expression.toFunction(ATAN, [x]);
	}

	return retval;
}

/**
 * Computes the arcsecant (inverse secant) of an expression: `asec(x) = acos(1/x)`.
 *
 * At infinity: `asec(±∞) = π/2`.
 *
 * @param x - The input expression (domain `|x| ≥ 1` for real results).
 * @returns The arcsecant of `x` in radians.
 *
 * @example
 * ```ts
 * asec(1).text()       // "0"
 * asec(2).text()       // "1/3*pi"
 *
 * // Symbolic
 * asec('x').text()     // "asec(x)"
 * ```
 */
export function asec(x: ExpressionInputType) {
	x = Expression.create(x);
	// asec(±∞) = π/2 (since 1/∞ → 0, and acos(0) = π/2)
	if (x.isPosInf() || x.isNegInf()) {
		return Expression.Pi().div(two());
	}
	const retval = acos(x.invert());
	// Check if it's just an inverted acos
	if (retval.isFunction(ACOS) && retval.getArguments()[0].eq(x.invert())) {
		return Expression.toFunction(ASEC, [x]);
	}
	return retval;
}

/**
 * Computes the arccosecant (inverse cosecant) of an expression: `acsc(x) = asin(1/x)`.
 *
 * At infinity: `acsc(±∞) = 0`.
 *
 * @param x - The input expression (domain `|x| ≥ 1` for real results).
 * @returns The arccosecant of `x` in radians.
 *
 * @example
 * ```ts
 * acsc(1).text()       // "1/2*pi"
 * acsc(2).text()       // "1/6*pi"
 *
 * // Symbolic
 * acsc('x').text()     // "acsc(x)"
 * ```
 */
export function acsc(x: ExpressionInputType) {
	x = Expression.create(x);
	// acsc(±∞) = 0 (since 1/∞ → 0, and asin(0) = 0)
	if (x.isPosInf() || x.isNegInf()) {
		return zero();
	}
	const retval = asin(x.invert());
	// Check if it's just an inverted acos
	if (retval.isFunction(ASIN) && retval.getArguments()[0].eq(x.invert())) {
		return Expression.toFunction(ACSC, [x]);
	}
	return retval;
}

/**
 * Computes the arccotangent (inverse cotangent) of an expression: `acot(x) = atan(1/x)`.
 *
 * At infinity: `acot(+∞) = 0`, `acot(−∞) = π`.
 *
 * @param x - The input expression.
 * @returns The arccotangent of `x` in radians.
 *
 * @example
 * ```ts
 * acot(1).text()       // "1/4*pi"
 *
 * // Symbolic
 * acot('x').text()     // "acot(x)"
 * ```
 */
export function acot(x: ExpressionInputType) {
	x = Expression.create(x);
	// acot(∞) = 0, acot(-∞) = π
	if (x.isPosInf() || x.isNegInf()) {
		return x.isNegInf() ? Expression.Pi() : zero();
	}
	const retval = atan(x.invert());
	if (retval.isFunction(ATAN) && retval.getArguments()[0].eq(x.invert())) {
		return Expression.toFunction(ACOT, [x]);
	}
	return retval;
}

/**
 * Computes the two-argument arctangent `atan2(y, x)`, which returns the angle
 * in radians between the positive x-axis and the point `(x, y)`.
 *
 * Unlike {@link atan}, `atan2` correctly handles all four quadrants and returns
 * values in the range `(−π, π]`. Returns exact multiples of π where possible.
 *
 * @param y - The y-coordinate.
 * @param x - The x-coordinate.
 * @returns The angle in radians.
 * @throws {@link UndefinedError} If both `x` and `y` are zero, or both are `±∞`.
 *
 * @see https://en.wikipedia.org/wiki/Atan2
 *
 * @example
 * ```ts
 * atan2(1, 1).text()       // "1/4*pi"
 * atan2(0, 1).text()       // "0"
 * atan2(1, 0).text()       // "1/2*pi"
 * atan2(-1, 0).text()      // "-1/2*pi"
 *
 * // Symbolic
 * atan2('y', 'x').text()   // "atan2(y, x)"
 * ```
 */
export function atan2(y: ExpressionInputType, x: ExpressionInputType): Expression {
	x = Expression.create(x);
	y = Expression.create(y);

	if (x.isZero() && y.isZero()) {
		throw new UndefinedError(message('atan2Undefined'));
	}

	// atan2(±∞, ±∞) is undefined
	if ((x.isPosInf() || x.isNegInf()) && (y.isPosInf() || y.isNegInf())) {
		throw new UndefinedError(message('atan2Undefined'));
	}

	// atan2(y, ∞) = 0, atan2(y, -∞) = π or -π depending on sign of y
	if (x.isPosInf() || x.isNegInf()) {
		if (x.isNegInf()) {
			return y.sign() === -1 ? Expression.Pi().neg() : Expression.Pi();
		}
		return zero();
	}

	// atan2(∞, x) = π/2, atan2(-∞, x) = -π/2
	if (y.isPosInf() || y.isNegInf()) {
		const halfPi = Expression.Pi().div(two());
		return y.isNegInf() ? halfPi.neg() : halfPi;
	}

	let retval: Expression;

	if (x.isNUM() && y.isNUM()) {
		// Since it relies on our implementation of atan, we don't need to check for Settings.EVALUATE
		const b = y.getMultiplier();
		const a = x.getMultiplier();
		if (a.gt(zero())) {
			retval = atan(y.div(x));
		} else if (a.lt('0') && b.gte('0')) {
			retval = atan(y.div(x)).plus(Expression.Pi());
		} else if (a.lt('0') && b.lt('0')) {
			retval = atan(y.div(x)).plus(Expression.Pi().neg());
		} else if (a.eq('0') && b.gt(zero())) {
			retval = Expression.Pi().div(two());
		} else {
			retval = Expression.Pi().neg().div(two());
		}
	} else {
		retval = Expression.toFunction(ATAN2, [y, x]);
	}

	return retval;
}

/**
 * Computes the hyperbolic cosine of an expression.
 *
 * - `cosh(0) = 1`
 * - `cosh(±∞) = +∞`
 * - For complex inputs: `cosh(a + bi) = cosh(a)·cos(b) + i·sinh(a)·sin(b)`
 *
 * @param x - The input expression.
 * @returns The hyperbolic cosine of `x`.
 *
 * @example
 * ```ts
 * cosh(0).text()       // "1"
 *
 * // Symbolic
 * cosh('x').text()     // "cosh(x)"
 * ```
 */
export function cosh(x: ExpressionInputType) {
	x = Expression.create(x);

	let retval: Expression;

	// cosh(±∞) = ∞
	if (x.isPosInf() || x.isNegInf()) {
		return Expression.Inf();
	}

	// cosh(0) = 1
	if (x.isZero()) {
		retval = one();
	} else if (Settings.EVALUATE && x.isNUM()) {
		retval = Expression.Number(x.getMultiplier().toDecimal().cosh());
	} else if (Settings.EVALUATE && x.isComplex()) {
		const re = x.realPart();
		const im = x.imagPart();
		retval = cosh(re)
			.times(cos(im))
			.plus(sinh(re).times(sin(im)).i());
	} else {
		retval = Expression.toFunction(COSH, [x]);
	}

	return retval;
}

/**
 * Computes the hyperbolic sine of an expression.
 *
 * - `sinh(0) = 0`
 * - `sinh(+∞) = +∞`, `sinh(−∞) = −∞`
 * - For complex inputs: `sinh(a + bi) = sinh(a)·cos(b) + i·cosh(a)·sin(b)`
 *
 * @param x - The input expression.
 * @returns The hyperbolic sine of `x`.
 *
 * @example
 * ```ts
 * sinh(0).text()       // "0"
 *
 * // Symbolic
 * sinh('x').text()     // "sinh(x)"
 * ```
 */
export function sinh(x: ExpressionInputType) {
	x = Expression.create(x);

	let retval: Expression;

	// sinh(∞) = ∞, sinh(-∞) = -∞
	if (x.isPosInf() || x.isNegInf()) {
		return x.isNegInf() ? Expression.NegInf() : Expression.Inf();
	}

	// sinh(0) = 0
	if (x.isZero()) {
		retval = zero();
	} else if (Settings.EVALUATE && x.isNUM()) {
		retval = Expression.Number(x.getMultiplier().toDecimal().sinh());
	} else if (Settings.EVALUATE && x.isComplex()) {
		const re = x.realPart();
		const im = x.imagPart();
		retval = sinh(re)
			.times(cos(im))
			.plus(cosh(re).times(sin(im)).i());
	} else {
		retval = Expression.toFunction(SINH, [x]);
	}

	return retval;
}

/**
 * Computes the hyperbolic tangent of an expression.
 *
 * - `tanh(0) = 0`
 * - `tanh(+∞) = 1`, `tanh(−∞) = −1`
 * - For complex inputs, uses the identity `tanh(z) = sinh(z)/cosh(z)` with
 *   component-wise evaluation.
 *
 * @param x - The input expression.
 * @returns The hyperbolic tangent of `x`.
 *
 * @example
 * ```ts
 * tanh(0).text()       // "0"
 *
 * // Symbolic
 * tanh('x').text()     // "tanh(x)"
 * ```
 */
export function tanh(x: ExpressionInputType) {
	x = Expression.create(x);

	let retval: Expression;

	// tanh(∞) = 1, tanh(-∞) = -1
	if (x.isPosInf() || x.isNegInf()) {
		return x.isNegInf() ? one().neg() : one();
	}

	// tanh(0) = 0
	if (x.isZero()) {
		retval = zero();
	} else if (Settings.EVALUATE && x.isNUM()) {
		retval = Expression.Number(x.getMultiplier().toDecimal().tanh());
	} else if (Settings.EVALUATE && x.isComplex()) {
		const re = x.realPart();
		const im = x.imagPart();
		const num = sinh(re)
			.times(cos(im))
			.plus(cosh(re).times(sin(im)).i());
		const den = cosh(re)
			.times(cos(im))
			.plus(sinh(re).times(sin(im)).i());
		retval = num.div(den);
	} else {
		retval = Expression.toFunction(TANH, [x]);
	}

	return retval;
}

/**
 * Computes the hyperbolic secant of an expression: `sech(x) = 1/cosh(x)`.
 *
 * - `sech(0) = 1`
 * - `sech(±∞) = 0`
 *
 * @param x - The input expression.
 * @returns The hyperbolic secant of `x`.
 *
 * @example
 * ```ts
 * sech(0).text()       // "1"
 *
 * // Symbolic
 * sech('x').text()     // "sech(x)"
 * ```
 */
export function sech(x: ExpressionInputType) {
	x = Expression.create(x);

	// sech(±∞) = 0
	if (x.isPosInf() || x.isNegInf()) {
		return zero();
	}

	let retval = one().div(cosh(x));

	if (retval.hasFunction(COSH)) {
		retval = Expression.toFunction(SECH, [x]);
	}

	return retval;
}

/**
 * Computes the hyperbolic cosecant of an expression: `csch(x) = 1/sinh(x)`.
 *
 * - `csch(±∞) = 0`
 * - `csch(0)` is undefined.
 *
 * @param x - The input expression.
 * @returns The hyperbolic cosecant of `x`.
 * @throws {@link UndefinedError} If `x` is `0`.
 *
 * @example
 * ```ts
 * // Symbolic
 * csch('x').text()     // "csch(x)"
 * ```
 */
export function csch(x: ExpressionInputType) {
	x = Expression.create(x);

	// csch(±∞) = 0
	if (x.isPosInf() || x.isNegInf()) {
		return zero();
	}

	// csch(0) is undefined
	if (x.isZero()) {
		throw new UndefinedError(message('cschUndefined'));
	}

	let retval = one().div(sinh(x));

	if (retval.hasFunction(SINH)) {
		retval = Expression.toFunction(CSCH, [x]);
	}

	return retval;
}

/**
 * Computes the hyperbolic cotangent of an expression: `coth(x) = 1/tanh(x)`.
 *
 * - `coth(+∞) = 1`, `coth(−∞) = −1`
 * - `coth(0)` is undefined.
 *
 * @param x - The input expression.
 * @returns The hyperbolic cotangent of `x`.
 * @throws {@link UndefinedError} If `x` is `0`.
 *
 * @example
 * ```ts
 * // Symbolic
 * coth('x').text()     // "coth(x)"
 * ```
 */
export function coth(x: ExpressionInputType) {
	x = Expression.create(x);

	// coth(∞) = 1, coth(-∞) = -1
	if (x.isPosInf() || x.isNegInf()) {
		return x.isNegInf() ? one().neg() : one();
	}

	// coth(0) is undefined
	if (x.isZero()) {
		throw new UndefinedError(message('cothUndefined'));
	}

	let retval = one().div(tanh(x));

	if (retval.hasFunction(TANH)) {
		retval = Expression.toFunction(COTH, [x]);
	}

	return retval;
}

/**
 * Computes the inverse hyperbolic cosine of an expression.
 *
 * - `acosh(1) = 0`
 * - `acosh(0) = iπ/2`
 * - `acosh(+∞) = +∞`
 * - For inputs less than 1, returns a complex result via `log(x + sqrt(x²−1))`.
 *
 * @param x - The input expression (domain `[1, ∞)` for real results).
 * @returns The inverse hyperbolic cosine of `x`.
 * @throws {@link UndefinedError} If `x` is `−∞`.
 *
 * @example
 * ```ts
 * acosh(1).text()       // "0"
 *
 * // Symbolic
 * acosh('x').text()     // "acosh(x)"
 * ```
 */
export function acosh(x: ExpressionInputType) {
	x = Expression.create(x);
	// acosh(∞) = ∞, acosh(-∞) is undefined (domain is [1, ∞))
	if (x.isPosInf() || x.isNegInf()) {
		if (x.isNegInf()) {
			throw new UndefinedError(message('undefinedValue'));
		}
		return Expression.Inf();
	}
	// The domain is [1, infinity]
	let retval;
	if (x.isOne()) {
		retval = zero();
	} else if (x.isZero()) {
		// acosh(0) = i*pi/2
		retval = Expression.Pi().div(two()).times(Expression.Img());
	} else if (Settings.EVALUATE) {
		if (x.lt('1') || x.isComplex()) {
			const a = sqrt(x.plus(one()));
			const b = sqrt(x.minus(one()));
			const c = x.plus(a.times(b));
			retval = log(c);
		} else {
			retval = Expression.Number(x.getMultiplier().toDecimal().acosh());
		}
	}

	if (!retval) {
		retval = Expression.toFunction(ACOSH, [x]);
	}

	return retval;
}

/**
 * Computes the inverse hyperbolic sine of an expression.
 *
 * - `asinh(0) = 0`
 * - `asinh(+∞) = +∞`, `asinh(−∞) = −∞`
 * - For complex inputs, uses `log(x + sqrt(x² + 1))`.
 *
 * @param x - The input expression.
 * @returns The inverse hyperbolic sine of `x`.
 *
 * @example
 * ```ts
 * asinh(0).text()       // "0"
 *
 * // Symbolic
 * asinh('x').text()     // "asinh(x)"
 * ```
 */
export function asinh(x: ExpressionInputType) {
	x = Expression.create(x);
	// asinh(∞) = ∞, asinh(-∞) = -∞
	if (x.isPosInf() || x.isNegInf()) {
		return x.isNegInf() ? Expression.NegInf() : Expression.Inf();
	}
	let retval;
	if (x.isZero()) {
		retval = zero();
	} else if (Settings.EVALUATE) {
		if (x.isComplex()) {
			retval = log(x.plus(sqrt(x.sq().plus(one()))));
		} else {
			retval = Expression.Number(x.getMultiplier().toDecimal().asinh());
		}
	}

	if (!retval) {
		retval = Expression.toFunction(ASINH, [x]);
	}

	return retval;
}

/**
 * Computes the inverse hyperbolic tangent of an expression.
 *
 * - `atanh(0) = 0`
 * - For inputs outside `(-1, 1)` or complex inputs, uses the identity
 *   `atanh(z) = (1/2)·ln((1 + z)/(1 − z))`.
 *
 * @param x - The input expression (domain `(-1, 1)` for real results).
 * @returns The inverse hyperbolic tangent of `x`.
 * @throws {@link UndefinedError} If `x` is `±∞` or exactly `1`.
 *
 * @example
 * ```ts
 * atanh(0).text()       // "0"
 *
 * // Symbolic
 * atanh('x').text()     // "atanh(x)"
 * ```
 */
export function atanh(x: ExpressionInputType) {
	x = Expression.create(x);
	// atanh(±∞) is undefined (domain is (-1, 1))
	if (x.isPosInf() || x.isNegInf()) {
		throw new UndefinedError(message('undefinedValue'));
	}
	let retval;
	if (x.isZero()) {
		retval = zero();
	} else if (x.isOne()) {
		throw new UndefinedError(message('atanhUndefined'));
	} else if (Settings.EVALUATE) {
		if (x.lt(minusOne()) || x.gt(one()) || x.isComplex()) {
			//atanh(z) = (1/2) * ln((1 + z) / (1 - z))
			retval = log(one().plus(x).div(one().minus(x)))
				.div(two())
				.expand();
		} else {
			retval = Expression.Number(x.getMultiplier().toDecimal().atanh());
		}
	}

	if (!retval) {
		retval = Expression.toFunction(ATANH, [x]);
	}

	return retval;
}

/**
 * Computes the inverse hyperbolic secant of an expression: `asech(x) = acosh(1/x)`.
 *
 * For real evaluation, uses the identity `asech(x) = ln((1 + sqrt(1/x² − 1))/x)`.
 *
 * @param x - The input expression (domain `(0, 1]` for real results).
 * @returns The inverse hyperbolic secant of `x`.
 * @throws {@link UndefinedError} If `x` is `±∞`.
 *
 * @example
 * ```ts
 * asech(1).text()       // "0"
 *
 * // Symbolic
 * asech('x').text()     // "asech(x)"
 * ```
 */
export function asech(x: ExpressionInputType) {
	x = Expression.create(x);
	// asech(±∞) is undefined (domain is (0, 1])
	if (x.isPosInf() || x.isNegInf()) {
		throw new UndefinedError(message('undefinedValue'));
	}
	let retval;

	if (Settings.EVALUATE) {
		if (x.isComplex()) {
			retval = acosh(x.invert());
		} else {
			const a = one().div(x);
			const b = sqrt(one().div(x.sq()).minus(one()));
			retval = log(b.plus(a));
		}
	}

	if (!retval) {
		retval = Expression.toFunction(ASECH, [x]);
	}

	return retval;
}

/**
 * Computes the inverse hyperbolic cosecant of an expression: `acsch(x) = asinh(1/x)`.
 *
 * - `acsch(±∞) = 0`
 * - For real evaluation, uses the identity `acsch(x) = ln((1 + sqrt(1/x² + 1))/x)`.
 *
 * @param x - The input expression.
 * @returns The inverse hyperbolic cosecant of `x`.
 *
 * @example
 * ```ts
 * // Symbolic
 * acsch('x').text()     // "acsch(x)"
 * ```
 */
export function acsch(x: ExpressionInputType) {
	x = Expression.create(x);
	// acsch(±∞) = 0
	if (x.isPosInf() || x.isNegInf()) {
		return zero();
	}
	let retval;

	if (Settings.EVALUATE) {
		if (x.isComplex()) {
			retval = asinh(x.invert());
		} else {
			const a = one().div(x);
			const b = sqrt(one().div(x.sq()).plus(one()));
			retval = log(b.plus(a));
		}
	}

	if (!retval) {
		retval = Expression.toFunction(ACSCH, [x]);
	}

	return retval;
}

/**
 * Computes the inverse hyperbolic cotangent of an expression: `acoth(x) = atanh(1/x)`.
 *
 * - `acoth(±∞) = 0`
 * - For real evaluation, uses the identity `acoth(x) = (1/2)·ln((x + 1)/(x − 1))`.
 *
 * @param x - The input expression (domain `|x| > 1` for real results).
 * @returns The inverse hyperbolic cotangent of `x`.
 *
 * @example
 * ```ts
 * // Symbolic
 * acoth('x').text()     // "acoth(x)"
 * ```
 */
export function acoth(x: ExpressionInputType) {
	x = Expression.create(x);
	// acoth(±∞) = 0
	if (x.isPosInf() || x.isNegInf()) {
		return zero();
	}
	let retval;

	if (Settings.EVALUATE) {
		if (x.isComplex()) {
			retval = atanh(x.invert());
		} else {
			retval = log(x.plus(one()).div(x.minus(one())))
				.div(two())
				.expand();
		}
	}

	if (!retval) {
		retval = Expression.toFunction(ACOTH, [x]);
	}

	return retval;
}
