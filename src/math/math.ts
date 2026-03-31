import Decimal from 'decimal.js';

import { Dictionary } from '../core/classes/dictionary/Dictionary';
import { Expression } from '../core/classes/expression/Expression';
import { four, half, one, two, zero } from '../core/classes/expression/shortcuts';
import {
	assertPlainVariableAndGetString,
	getNumericOrAssumedValue,
} from '../core/classes/expression/utils';
import { Matrix } from '../core/classes/matrix/Matrix';
import {
	SQRT,
	ABS,
	MOD,
	GAMMA,
	DOUBLE_FACTORIAL,
	WRAP,
	DIRAC,
	HEAVISIDE,
	SGN,
} from '../core/classes/parser/constants';
import { FACTORIAL } from '../core/classes/parser/constants';
import { multiply } from '../core/classes/parser/operations/multiply';
import { power, sqrtToPow } from '../core/classes/parser/operations/power';
import { subtract } from '../core/classes/parser/operations/subtract';
import { ValuesSet } from '../core/classes/valuesSet/ValuesSet';
import { Vector } from '../core/classes/vector/Vector';
import { message, MathError, UndefinedError } from '../core/errors';
import { factorial as fact } from '../core/functions/bigint/bigint';
import { primeFactorCounts } from '../core/functions/bigint/primeFactor';
import { csgn } from '../core/functions/complex';
import {
	erf as decErf,
	gamma as decGamma,
	sinc as decSinc,
	Si as decSi,
	Shi as decShi,
	Ci as decCi,
	Chi as decChi,
	Ei as decEi,
	Li as decLi,
} from '../core/functions/decimal';
import { Settings } from '../core/Settings';
import { SolutionSet } from '../solve/classes/SolutionSet';

import { definiteIntegrateNative } from './defint/defintNative';
import { hypot } from './geometry';
import { atan2, cos, sin } from './trig';
import { stripPower } from './utils';

import type {
	ParserInputType,
	ExpressionInputType,
	ParserValuesObject,
} from '../core/classes/parser/types';

/**
 * Computes the square root of an expression. Equivalent to raising to the power of 1/2.
 * Nested square roots are automatically simplified (e.g. `sqrt(sqrt(x))` becomes `x^(1/4)`).
 *
 * @param x - The expression to take the square root of.
 * @returns The square root of `x`.
 * @throws {@link UndefinedError} If `x` is `-∞`.
 *
 * @example
 * ```ts
 * // Numeric
 * sqrt(4).text()             // "2"
 * sqrt('1/4').text()         // "1/2"
 *
 * // Symbolic
 * sqrt('x^2').text()         // "x"
 * sqrt('x').text()           // "sqrt(x)"
 * sqrt(0).text()             // "0"
 * ```
 */
export function sqrt(x: ExpressionInputType): Expression {
	x = Expression.create(x);

	let retval;
	if (x.isPosInf() || x.isNegInf()) {
		if (x.isNegInf()) {
			throw new UndefinedError(message('undefinedValue'));
		}
		retval = Expression.Inf();
	} else if (x.isOne()) {
		retval = one();
	} else if (x.isZero()) {
		retval = zero();
	}
	// e.g. sqrt(sqrt(x))
	else if (x.isFunction(SQRT)) {
		// Unwrap the square root
		retval = multiply(
			sqrt(Expression.fromRational(x.getMultiplier())),
			power(sqrtToPow(x.toUnitMultiplier()), half())
		);
	} else {
		retval = power(x, half());
	}

	return retval;
}

/**
 * Computes the cube root of an expression.
 *
 * For real numeric constants, the *real* cube root is returned (so negative reals stay real).
 * For complex constants, the principal cube root is used.
 * Nested cube roots are simplified (e.g. `cbrt(cbrt(x))` becomes `x^(1/9)`).
 *
 * Unlike {@link sqrt}, `cbrt` is preserved as a function node rather than rewritten to
 * `x^(1/3)` to avoid principal-branch issues during symbolic manipulation.
 *
 * @param x - The expression to take the cube root of.
 * @returns The cube root of `x`.
 *
 * @example
 * ```ts
 * cbrt(8).text()              // "2"
 * cbrt(-27).text()            // "-3"
 * cbrt('x').text()            // "cbrt(x)"
 * ```
 */
export function cbrt(x: ExpressionInputType): Expression {
	x = Expression.create(x);

	// Fast paths
	if (x.isPosInf() || x.isNegInf()) {
		return x.isNegInf() ? Expression.NegInf() : Expression.Inf();
	}
	if (x.isOne()) {
		return one();
	}
	if (x.isZero()) {
		return zero();
	}

	// If requested, evaluate constant arguments first. This avoids leaving things like
	// cbrt(-1/2 + (sqrt(3)*sqrt(31))/18) unevaluated.
	//
	// For real constants, this uses the *real* cube root (so negative reals stay real).
	// For complex constants, it returns the principal cube root.

	if (Settings.EVALUATE && x.isConstant()) {
		const xe = x.isNUM() || x.isComplex() ? x : x.evaluate();

		if (xe.isNUM()) {
			const d = xe.getMultiplier().toDecimal();
			const oneThird = new Decimal(1).div(3);
			const r = d.isNeg() ? d.abs().pow(oneThird).neg() : d.pow(oneThird);
			return new Expression(r);
		}

		if (xe.isComplex()) {
			const re = xe.realPart();
			const im = xe.imagPart();
			const a = Number(re.getMultiplier().toDecimal());
			const b = Number(im.getMultiplier().toDecimal());
			const mag = Math.hypot(a, b);
			const ang = Math.atan2(b, a);
			const mag13 = Math.cbrt(mag);
			const ang13 = ang / 3;
			const rr = mag13 * Math.cos(ang13);
			const ii = mag13 * Math.sin(ang13);
			return Expression.create(rr).plus(Expression.create(ii).times(Expression.Img()));
		}
	}

	// e.g. cbrt(cbrt(x))
	if (x.isFunction('cbrt')) {
		return multiply(
			cbrt(Expression.fromRational(x.getMultiplier())),
			power(x.toUnitMultiplier(), Expression.create('1/3'))
		);
	}

	// Keep cbrt as a function node (rather than x^(1/3)) to avoid principal-branch
	// issues during symbolic manipulation.
	return Expression.toFunction('cbrt', [x]);
}

/**
 * Wraps an expression in parentheses. Returns a function node whose only purpose
 * is to visually group `x` with surrounding parentheses in output.
 *
 * @param x - The expression to wrap.
 * @returns A parenthesised form of `x`.
 *
 * @example
 * ```ts
 * parens(Expression.create('x+1')).text()  // "(x+1)"
 * ```
 */
export function parens(x: Expression) {
	return Expression.toFunction(WRAP, [x]);
}

/**
 * Computes the factorial of an expression.
 *
 * For non-negative integers, returns the exact integer factorial.
 * For half-integer arguments (e.g. `1/2`, `3/2`, `-1/2`), returns a closed-form
 * expression involving `sqrt(π)`.
 * When `Settings.EVALUATE` is `true` and the input is not an integer, falls back
 * to the {@link gamma} function via Γ(x + 1).
 *
 * @param x - The expression to compute the factorial of.
 * @returns The factorial of `x`.
 * @throws {@link UndefinedError} If `x` is `-∞`.
 *
 * @example
 * ```ts
 * factorial(Expression.create(5)).text()       // "120"
 * factorial(Expression.create(0)).text()       // "1"
 * factorial(Expression.create('1/2')).text()   // "1/2*sqrt(pi)"
 * ```
 */
export function factorial(x: Expression): Expression {
	let retval: Expression;
	if (x.isPosInf() || x.isNegInf()) {
		if (x.isNegInf()) {
			throw new UndefinedError(message('undefinedValue'));
		}
		return Expression.Inf();
	}
	if (x.isInteger()) {
		retval = Expression.Number(fact(x.getMultiplier().numerator));
	} else if (Settings.EVALUATE) {
		retval = gamma(x.plus(one()));
	} else {
		// Check if we can simplify half integer factorials
		let m = x.getMultiplier();
		if (x.isNUM() && m.denominator === 2n) {
			const sign = m.sign();
			m = m.abs();
			const n = new Expression(m.numerator - 1n).div(two());
			const sqrtPi = sqrt(Expression.Pi());
			if (sign === -1) {
				retval = four()
					.neg()
					.pow(n)
					.times(factorial(n))
					.div(factorial(n.times(two())))
					.times(sqrtPi);
			} else {
				retval = factorial(n.times(two()).plus(one()))
					.div(four().pow(n).times(factorial(n)).times(two()))
					.times(sqrtPi);
			}
		} else {
			retval = Expression.toFunction(FACTORIAL, [new Expression(x)]);
		}
	}

	return retval;
}

/**
 * Computes the double factorial of an expression.
 *
 * For a non-negative integer n, the double factorial is the product of all positive
 * integers up to n that share its parity:
 * - Even: `n!! = 2 · 4 · 6 · … · n`
 * - Odd:  `n!! = 1 · 3 · 5 · … · n`
 *
 * For non-integer arguments when `Settings.EVALUATE` is `true`, a generalised
 * formula using the {@link gamma} function is applied.
 *
 * @param x - The expression to compute the double factorial of.
 * @returns The double factorial of `x`.
 * @throws {@link UndefinedError} If `x` is `-∞`.
 *
 * @example
 * ```ts
 * doubleFactorial(Expression.create(6)).text()   // "48"
 * doubleFactorial(Expression.create(7)).text()   // "105"
 * ```
 */
export function doubleFactorial(x: Expression) {
	let retval;
	if (x.isPosInf() || x.isNegInf()) {
		if (x.isNegInf()) {
			throw new UndefinedError(message('undefinedValue'));
		}
		return Expression.Inf();
	}
	if (Settings.EVALUATE) {
		if (x.isInteger()) {
			const even = x.isEven();
			const xn = Number(x.getMultiplier().toDecimal());
			// If x = even then n = x/2 else n = (x-1)/2
			const n = even ? xn / 2 : (xn + 1) / 2;
			let r = one();

			for (let i = 1; i <= n; i++) {
				let q = two().times(i);
				if (!even) {
					q = q.minus(1);
				}
				r = r.times(q);
			}

			retval = r;
		} else {
			const pi = Expression.Pi(true);
			const a = two().pow(
				x
					.times(two())
					.plus(one())
					.minus(cos(pi.times(x)))
					.div(four())
			);
			const b = pi.pow(cos(pi.times(x)).minus(one()).div(four()));
			const c = gamma(x.div(two()).plus(1));
			retval = a.times(b).times(c);
		}
	} else {
		retval = Expression.toFunction(DOUBLE_FACTORIAL, [new Expression(x)]);
	}

	return retval;
}

/**
 * Computes the Heaviside step function (unit step function).
 *
 * Uses the half-maximum convention at the origin:
 * - `heaviside(x) = 0` for `x < 0`
 * - `heaviside(0) = 1/2`
 * - `heaviside(x) = 1` for `x > 0`
 *
 * For symbolic inputs, returns an unevaluated `heaviside(x)` node.
 *
 * @param x - The input expression.
 * @returns The Heaviside step value.
 *
 * @example
 * ```ts
 * heaviside(Expression.create(3)).text()    // "1"
 * heaviside(Expression.create(-2)).text()   // "0"
 * heaviside(Expression.create(0)).text()    // "1/2"
 * heaviside(Expression.create('t')).text()  // "heaviside(t)"
 * ```
 */
export function heaviside(x: Expression): Expression {
	let retval: Expression;

	if (x.isPosInf() || x.isNegInf()) {
		retval = x.isNegInf() ? zero() : one();
	} else if (x.isNUM()) {
		const s = x.sign();
		if (s === 1) {
			retval = one();
		} else if (s === -1) {
			retval = zero();
		} else {
			// x === 0: half-maximum convention
			retval = half();
		}
	} else {
		retval = Expression.toFunction(HEAVISIDE, [new Expression(x)]);
	}

	return retval;
}

/**
 * Computes the Dirac delta function (distribution).
 *
 * For non-zero numeric inputs, returns `0`. At `x = 0` the symbolic form
 * `dirac(0)` is returned (the Dirac delta is only meaningful under an
 * integral or Laplace transform). For symbolic inputs, returns an
 * unevaluated `dirac(x)` node.
 *
 * @param x - The input expression.
 * @returns The Dirac delta value or symbolic node.
 *
 * @example
 * ```ts
 * dirac(Expression.create(5)).text()    // "0"
 * dirac(Expression.create(0)).text()    // "dirac(0)"
 * dirac(Expression.create('t')).text()  // "dirac(t)"
 * ```
 */
export function dirac(x: Expression): Expression {
	let retval: Expression;

	if (x.isPosInf() || x.isNegInf()) {
		retval = zero();
	} else if (x.isNUM()) {
		if (x.isZero()) {
			// Dirac delta at zero is technically infinite, but we return
			// the symbolic form to avoid misleading numeric results.
			retval = Expression.toFunction(DIRAC, [new Expression(x)]);
		} else {
			retval = zero();
		}
	} else {
		retval = Expression.toFunction(DIRAC, [new Expression(x)]);
	}

	return retval;
}

/**
 * Rounds a number to the nth decimal place. If no precision is provided, rounds to
 * the nearest integer.
 *
 * @param x - The expression to round.
 * @param n - The number of decimal places to round to. Defaults to `0`.
 * @returns The rounded value of `x`.
 *
 * @example
 * ```ts
 * round('3.7').text()        // "4"
 * round('2.555', 2).text()   // "2.56"
 * round('1/3', 4).text()     // "0.3333"
 * ```
 */
export function round(x: ExpressionInputType, n?: ExpressionInputType) {
	x = Expression.create(x);

	if (x.isPosInf() || x.isNegInf()) {
		return x.isNegInf() ? Expression.NegInf() : Expression.Inf();
	}

	n = n ? Expression.create(n) : new Expression(0);

	let retval;

	if (x.isNUM() && n.isInteger()) {
		// Convert n & x to a decimals
		const d = x.getMultiplier().toDecimal();
		const s = n.getMultiplier().toDecimal();
		const t = new Decimal(10).pow(s);
		retval = new Expression(Decimal.round(d.times(t)).div(t));
	} else {
		retval = Expression.toFunction('round', [x, n]);
	}

	return retval;
}

/**
 * Returns the sign of a number as `1`, `-1`, or `0`.
 *
 * For constant expressions that are not plain numerics, the expression is
 * evaluated first to determine its sign.
 *
 * @param x - The expression whose sign to determine.
 * @returns `1`, `-1`, or `0` as an Expression, or a symbolic `sign(x)` node.
 *
 * @example
 * ```ts
 * sign(5).text()     // "1"
 * sign(-3).text()    // "-1"
 * sign(0).text()     // "0"
 * sign('x').text()   // "sign(x)"
 * ```
 */
export function sign(x: ExpressionInputType) {
	x = Expression.create(x);
	let retval;
	if (x.isComplex()) {
		retval = csgn(x);
	} else if (x.isPosInf() || x.isNegInf()) {
		retval = Expression.create(x.isNegInf() ? -1 : 1);
	} else if (x.isConstant()) {
		retval = Expression.create((x.isNUM() ? x : x.evaluate()).getMultiplier().sign());
	} else {
		retval = Expression.toFunction(SGN, [x]);
	}
	return retval;
}

/**
 * Rounds a number down to the nearest integer (floor function).
 *
 * @param x - The expression to round down.
 * @returns The greatest integer less than or equal to `x`.
 *
 * @example
 * ```ts
 * floor('3.7').text()    // "3"
 * floor('-2.3').text()   // "-3"
 * floor(5).text()        // "5"
 * floor('x').text()      // "floor(x)"
 * ```
 */
export function floor(x: ExpressionInputType) {
	x = Expression.create(x);

	let retval;

	if (x.isPosInf() || x.isNegInf()) {
		retval = x.isNegInf() ? Expression.NegInf() : Expression.Inf();
	} else if (x.isNUM()) {
		// Convert n & x to a decimals
		const d = x.getMultiplier().toDecimal();
		retval = new Expression(d.floor());
	} else {
		retval = Expression.toFunction('floor', [x]);
	}

	return retval;
}

/**
 * Rounds a number up to the nearest integer (ceiling function).
 *
 * @param x - The expression to round up.
 * @returns The least integer greater than or equal to `x`.
 *
 * @example
 * ```ts
 * ceiling('3.2').text()    // "4"
 * ceiling('-2.7').text()   // "-2"
 * ceiling(5).text()        // "5"
 * ceiling('x').text()      // "ceil(x)"
 * ```
 */
export function ceiling(x: ExpressionInputType) {
	x = Expression.create(x);

	let retval;

	if (x.isPosInf() || x.isNegInf()) {
		retval = x.isNegInf() ? Expression.NegInf() : Expression.Inf();
	} else if (x.isNUM()) {
		// Convert n & x to a decimals
		const d = x.getMultiplier().toDecimal();
		retval = new Expression(d.ceil());
	} else {
		retval = Expression.toFunction('ceil', [x]);
	}

	return retval;
}

/**
 * Computes the absolute value of an expression.
 *
 * Applies symbolic simplifications where possible:
 * - Even powers are recognised as non-negative (e.g. `abs(x^2)` returns `x^2`).
 * - Complex inputs use the modulus: `abs(a + bi) = sqrt(a² + b²)`.
 * - Fully negative sums are negated (e.g. `abs(-x - y)` becomes `x + y`).
 *
 * @param x - The expression to take the absolute value of.
 * @returns The absolute value of `x`.
 *
 * @example
 * ```ts
 * abs(-5).text()       // "5"
 * abs('3/4').text()    // "3/4"
 * abs('x^2').text()    // "x^2"
 * abs('x').text()      // "abs(x)"
 * ```
 */
export function abs(x: ExpressionInputType) {
	x = Expression.create(x);

	if (x.isPosInf() || x.isNegInf()) {
		return Expression.Inf();
	}

	let retval = x;

	let wrap = true;
	if (!x.isConstant() && x.getPower().isEven()) {
		retval = x;
		// Remove the sign
		if (retval.sign() === -1) {
			retval = retval.neg();
		}

		wrap = false;
	} else if (x.isComplex()) {
		retval = hypot(x.realPart(), x.imagPart());
	}
	// Attempt to simplify expression in the for -x-y to |x+y|
	else if (x.isSum()) {
		// We'll loop through and sort out the constants and variables
		// We can use this later to see if it has to be returned as the abs function
		const constants: Expression[] = [];
		const variables: Expression[] = [];
		const elements = x.elementsArray();

		let allNegative = true;
		// Assume a positive sign. We'll flip this if we negate the expression.
		// This is strictly for keeping track of what occurred with the sign.
		// This avoids us having to go through each term again.
		let sign = 1;

		for (let i = 0; i < elements.length; i++) {
			const e = elements[i];
			if (e.isConstant()) {
				constants.push(e);
			} else {
				variables.push(e);
			}
			// Check if all are negative. It takes only
			if (e.sign() !== -1) {
				allNegative = false;
			}

			// If all negative
			if (allNegative || (variables.length === 1 && variables[0].sign() === -1)) {
				retval = x.neg().expand();
				sign = -1; // Flip the sign.
			}

			const next = elements[i + 1];
			const isGRP = next && variables.length === 1 && next.value === variables[0].value;
			// Check if it needs to be wrapped. We would prefer to have expressions like |x^2+1| in the form x^2+1
			if (variables.length === 1 && variables[0].getPower().isEven() && !isGRP) {
				// Assume that we won't have wrap
				wrap = false;
				// Check that the rest of the signs are positive
				for (let i = 0; i < constants.length; i++) {
					if (constants[i].sign() * sign === -1) {
						wrap = true;
						break;
					}
				}
			}
		}
	} else if (x.sign() === -1) {
		retval = x.neg();
	}

	// Just wrap it in a function if no simplification occurred
	if (!retval) {
		retval = x;
	}

	if (!retval.isConstant() && wrap) {
		retval = Expression.toFunction(ABS, [retval]);
	}

	return retval;
}

/**
 * Computes the modular multiplicative inverse of `a` modulo `p` using the
 * extended Euclidean algorithm. That is, finds `t` such that `a * t ≡ 1 (mod p)`.
 *
 * @param a - The number whose modular inverse is to be calculated.
 * @param p - The modulus (typically prime).
 * @returns The modular inverse of `a` mod `p`.
 * @throws {@link MathError} If the inverse does not exist (i.e. `gcd(a, p) ≠ 1`).
 *
 * @example
 * ```ts
 * modInv(Expression.create(3), Expression.create(7)).text()    // "5"
 * modInv(Expression.create(10), Expression.create(17)).text()  // "12"
 * ```
 */
export function modInv(a: Expression, p: Expression) {
	let t = zero();
	let tp = one(); // newT
	let r = p;
	let rp = mod(a, p); // newR

	while (!rp.isZero()) {
		const q = floor(r.div(rp));
		[t, tp] = [tp, t.minus(q.times(tp))];
		[r, rp] = [rp, r.minus(q.times(rp))];
	}

	if (r.gt(1)) {
		throw new MathError(message('noInverse'));
	}

	return mod(t, p);
}

/**
 * Computes the modulo (remainder) of `x` divided by `y`.
 *
 * @param x - The dividend.
 * @param y - The divisor.
 * @returns The remainder of `x / y`.
 * @throws {@link UndefinedError} If either `x` or `y` is `±∞`.
 *
 * @example
 * ```ts
 * mod(Expression.create(10), Expression.create(3)).text()   // "1"
 * mod(Expression.create(7), Expression.create(2)).text()    // "1"
 * ```
 */
export function mod(x: Expression, y: Expression): Expression {
	let retval: Expression;
	if (x.isPosInf() || x.isNegInf() || y.isPosInf() || y.isNegInf()) {
		throw new UndefinedError(message('undefinedValue'));
	}
	if (x.isNUM() && y.isNUM()) {
		retval = Expression.create(x.getMultiplier().mod(y.getMultiplier()));
	} else {
		retval = Expression.toFunction(MOD, [new Expression(x)]);
	}

	return retval;
}

/**
 * Computes the gamma function Γ(x).
 *
 * - For positive integers: `Γ(n) = (n − 1)!`
 * - For half-integers (e.g. `1/2`, `3/2`, `-3/2`): returns a closed-form
 *   expression involving `sqrt(π)`.
 * - For other numeric values: uses a high-precision decimal approximation.
 * - For symbolic inputs: returns an unevaluated `gamma(x)` node.
 *
 * @param x - The input expression.
 * @returns The gamma function value Γ(x).
 * @throws {@link UndefinedError} If `x` is `-∞`.
 *
 * @see https://en.wikipedia.org/wiki/Gamma_function
 *
 * @example
 * ```ts
 * gamma(Expression.create(5)).text()       // "24"
 * gamma(Expression.create('1/2')).text()   // "sqrt(pi)"
 * gamma(Expression.create('x')).text()     // "gamma(x)"
 * ```
 */
export function gamma(x: Expression) {
	let retval: Expression;

	if (x.isPosInf() || x.isNegInf()) {
		if (x.isNegInf()) {
			throw new UndefinedError(message('undefinedValue'));
		}
		return Expression.Inf();
	}

	if (x.isNUM()) {
		const m = x.getMultiplier();

		if (x.isInteger() && !x.isNegative()) {
			// gamma(n) = (n-1)! for positive integers
			if (x.isZero()) {
				retval = Expression.toFunction(GAMMA, [x]);
			} else {
				retval = factorial(x.minus(one()));
			}
		} else if (m.denominator === 2n) {
			const sqrtPi = sqrt(Expression.Pi());
			const k = m.numerator;

			// poles: 0, -1, -2, ...
			if (k <= 0n && k % 2n === 0n) {
				retval = Expression.toFunction(GAMMA, [x]);
			} else if (k === 1n) {
				// gamma(1/2) = sqrt(pi)
				retval = sqrtPi;
			} else if (k > 1n) {
				// positive half-integers
				let y = half();
				let r = sqrtPi;

				while (!y.eq(x)) {
					r = y.times(r);
					y = y.plus(one());
				}

				retval = r;
			} else {
				// negative half-integers via recurrence
				let y = half();
				let r = sqrtPi;

				while (!y.eq(x)) {
					y = y.minus(one());
					r = r.div(y);
				}

				retval = r;
			}
		} else {
			retval = Expression.Number(decGamma(m.toDecimal()));
		}
	} else {
		retval = Expression.toFunction(GAMMA, [x]);
	}

	return retval;
}

/**
 * Computes the complementary error function: `erfc(x) = 1 − erf(x)`.
 *
 * @param x - The input expression.
 * @returns The complementary error function value.
 *
 * @see {@link erf}
 *
 * @example
 * ```ts
 * erfc(Expression.create(0)).text()   // "0"
 * ```
 */
export function erfc(x: Expression): Expression {
	return subtract(one(), erf(x));
}

/**
 * Computes the error function erf(x).
 *
 * - `erf(+∞) = 1`, `erf(−∞) = −1`
 * - For numeric inputs, returns a high-precision decimal approximation.
 * - For symbolic inputs, returns an unevaluated `erf(x)` node.
 *
 * @param x - The input expression.
 * @returns The error function value.
 *
 * @see https://en.wikipedia.org/wiki/Error_function
 *
 * @example
 * ```ts
 * erf(Expression.create(0)).text()     // "0"
 * erf(Expression.create('x')).text()   // "erf(x)"
 * ```
 */
export function erf(x: Expression): Expression {
	let retval;
	if (x.isPosInf() || x.isNegInf()) {
		retval = x.isNegInf() ? one().neg() : one();
	} else if (x.isNUM()) {
		const m = x.getMultiplier();
		// Gives junk values after erf > 6.7
		if (m.gt('6.5')) {
			retval = one();
		} else {
			// Calculate it's numeric value
			retval = Expression.Number(decErf(m.toDecimal()));
		}
	} else {
		retval = Expression.toFunction('erf', [new Expression(x)]);
	}

	return retval;
}

/**
 * Computes the normalized sinc function: `sinc(x) = sin(x) / x`.
 *
 * By convention, `sinc(0) = 1` (the removable singularity).
 * The function is even: `sinc(-x) = sinc(x)`.
 *
 * @param x - The input expression.
 * @returns The sinc function value.
 *
 * @example
 * ```ts
 * sinc(Expression.create(0)).text()     // "1"
 * sinc(Expression.create('x')).text()   // "sinc(x)"
 * ```
 */
export function sinc(x: Expression): Expression {
	let retval: Expression;

	if (x.isPosInf() || x.isNegInf()) {
		retval = zero();
	} else if (x.isZero()) {
		retval = one();
	} else if (x.sign() === -1) {
		retval = sinc(x.neg());
	} else if (x.isNUM() && Settings.EVALUATE) {
		retval = Expression.Number(decSinc(x.getMultiplier().toDecimal()));
	} else {
		retval = Expression.toFunction('sinc', [new Expression(x)]);
	}

	return retval;
}

/**
 * Computes the sine integral: `Si(x) = ∫₀ˣ sin(t)/t dt`.
 *
 * - `Si(+∞) = π/2`, `Si(−∞) = −π/2`
 * - `Si(0) = 0`
 * - The function is odd: `Si(-x) = -Si(x)`.
 *
 * @param x - The input expression.
 * @returns The sine integral value.
 *
 * @example
 * ```ts
 * Si(Expression.create(0)).text()     // "0"
 * Si(Expression.create('x')).text()   // "Si(x)"
 * ```
 */
export function Si(x: Expression): Expression {
	let retval: Expression;

	if (x.isPosInf() || x.isNegInf()) {
		retval = Expression.Pi().div(two());
		if (x.isNegInf()) {
			retval = retval.neg();
		}
	} else if (x.isZero()) {
		retval = zero();
	} else if (x.sign() === -1) {
		retval = Si(x.neg()).neg();
	} else if (x.isNUM() && Settings.EVALUATE) {
		retval = Expression.Number(decSi(x.getMultiplier().toDecimal()));
	} else {
		retval = Expression.toFunction('Si', [new Expression(x)]);
	}

	return retval;
}

/**
 * Computes the hyperbolic sine integral: `Shi(x) = ∫₀ˣ sinh(t)/t dt`.
 *
 * - `Shi(+∞) = +∞`, `Shi(−∞) = −∞`
 * - `Shi(0) = 0`
 * - The function is odd: `Shi(-x) = -Shi(x)`.
 *
 * @param x - The input expression.
 * @returns The hyperbolic sine integral value.
 *
 * @example
 * ```ts
 * Shi(Expression.create(0)).text()     // "0"
 * Shi(Expression.create('x')).text()   // "Shi(x)"
 * ```
 */
export function Shi(x: Expression): Expression {
	let retval: Expression;

	if (x.isPosInf() || x.isNegInf()) {
		retval = x.isNegInf() ? Expression.NegInf() : Expression.Inf();
	} else if (x.isZero()) {
		retval = zero();
	} else if (x.sign() === -1) {
		retval = Shi(x.neg()).neg();
	} else if (x.isNUM() && Settings.EVALUATE) {
		retval = Expression.Number(decShi(x.getMultiplier().toDecimal()));
	} else {
		retval = Expression.toFunction('Shi', [new Expression(x)]);
	}

	return retval;
}

/**
 * Computes the cosine integral: `Ci(x) = γ + ln(x) + ∫₀ˣ (cos(t)−1)/t dt`,
 * where γ is the Euler–Mascheroni constant.
 *
 * - `Ci(+∞) = 0`, `Ci(−∞) = 0`
 * - `Ci(0) = −∞`
 * - The function is even for the principal branch: `Ci(-x) = Ci(x)`.
 *
 * @param x - The input expression.
 * @returns The cosine integral value.
 *
 * @example
 * ```ts
 * Ci(Expression.create('x')).text()   // "Ci(x)"
 * ```
 */
export function Ci(x: Expression): Expression {
	let retval: Expression;

	if (x.isPosInf() || x.isNegInf()) {
		retval = zero();
	} else if (x.isZero()) {
		retval = Expression.NegInf();
	} else if (x.sign() === -1) {
		retval = Ci(x.neg());
	} else if (x.isNUM() && Settings.EVALUATE) {
		retval = Expression.Number(decCi(x.getMultiplier().toDecimal()));
	} else {
		retval = Expression.toFunction('Ci', [new Expression(x)]);
	}

	return retval;
}

/**
 * Computes the hyperbolic cosine integral: `Chi(x) = γ + ln(x) + ∫₀ˣ (cosh(t)−1)/t dt`,
 * where γ is the Euler–Mascheroni constant.
 *
 * - `Chi(±∞) = +∞`
 * - `Chi(0) = −∞`
 * - The function is even for the principal branch: `Chi(-x) = Chi(x)`.
 *
 * @param x - The input expression.
 * @returns The hyperbolic cosine integral value.
 *
 * @example
 * ```ts
 * Chi(Expression.create('x')).text()   // "Chi(x)"
 * ```
 */
export function Chi(x: Expression): Expression {
	let retval: Expression;

	if (x.isPosInf() || x.isNegInf()) {
		retval = Expression.Inf();
	} else if (x.isZero()) {
		retval = Expression.NegInf();
	} else if (x.sign() === -1) {
		retval = Chi(x.neg());
	} else if (x.isNUM() && Settings.EVALUATE) {
		retval = Expression.Number(decChi(x.getMultiplier().toDecimal()));
	} else {
		retval = Expression.toFunction('Chi', [new Expression(x)]);
	}

	return retval;
}

/**
 * Computes the exponential integral: `Ei(x) = −∫₋ₓ^∞ e^(−t)/t dt` (Cauchy principal value).
 *
 * - `Ei(+∞) = +∞`, `Ei(−∞) = 0`
 * - `Ei(0) = −∞`
 *
 * @param x - The input expression.
 * @returns The exponential integral value.
 *
 * @example
 * ```ts
 * Ei(Expression.create(0)).text()     // "-Infinity"
 * Ei(Expression.create('x')).text()   // "Ei(x)"
 * ```
 */
export function Ei(x: Expression): Expression {
	let retval: Expression;

	if (x.isPosInf() || x.isNegInf()) {
		retval = x.isNegInf() ? zero() : Expression.Inf();
	} else if (x.isZero()) {
		retval = Expression.NegInf();
	} else if (x.isNUM() && Settings.EVALUATE) {
		retval = Expression.Number(decEi(x.getMultiplier().toDecimal()));
	} else {
		retval = Expression.toFunction('Ei', [new Expression(x)]);
	}

	return retval;
}

/**
 * Computes the logarithmic integral: `Li(x) = ∫₀ˣ 1/ln(t) dt`.
 *
 * - `Li(+∞) = +∞`
 * - `Li(1) = −∞` (the function has a logarithmic singularity at 1)
 * - For negative numeric inputs, returns the symbolic form.
 *
 * @param x - The input expression.
 * @returns The logarithmic integral value.
 *
 * @example
 * ```ts
 * Li(Expression.create('x')).text()   // "Li(x)"
 * ```
 */
export function Li(x: Expression): Expression {
	let retval: Expression;

	if (x.isPosInf()) {
		retval = Expression.Inf();
	} else if (x.isOne()) {
		retval = Expression.NegInf();
	} else if (x.isNUM() && Settings.EVALUATE) {
		const m = x.getMultiplier();
		if (m.isNegative()) {
			retval = Expression.toFunction('Li', [new Expression(x)]);
		} else {
			retval = Expression.Number(decLi(m.toDecimal()));
		}
	} else {
		retval = Expression.toFunction('Li', [new Expression(x)]);
	}

	return retval;
}

/**
 * Computes the natural (base-e) logarithm, or optionally a logarithm with a specified base.
 *
 * Symbolic simplification rules are applied when `Settings.EVALUATE` is `false`:
 * - `log(a/b)` becomes `log(a) − log(b)`
 * - Products are expanded: `log(a·b)` becomes `log(a) + log(b)`
 * - Powers are extracted: `log(a^n)` becomes `n·log(a)`
 *
 * For negative real inputs, returns `log(|x|) + iπ`. Complex inputs use the
 * principal branch: `log(z) = log|z| + i·arg(z)`.
 *
 * @param x - The expression to take the logarithm of.
 * @param base - Optional logarithm base. Defaults to `e` (natural log).
 * @param expandPrimes - When `true`, decomposes integer arguments into prime factors
 *   (e.g. `log(8)` becomes `3·log(2)`). Defaults to `false`.
 * @returns The logarithm of `x`.
 * @throws {@link UndefinedError} If `x` is `-∞`.
 *
 * @example
 * ```ts
 * log('e').text()           // "1"
 * log(1).text()             // "0"
 * log('e^x').text()         // "x"
 *
 * // With base
 * log(8, 2).text()          // "3"
 * ```
 */
export function log(
	x: ExpressionInputType,
	base?: ExpressionInputType,
	expandPrimes = false
): Expression {
	x = Expression.create(x);
	const baseExpr = base === undefined ? undefined : Expression.create(base);
	let retval;

	if (x.isPosInf() || x.isNegInf()) {
		if (x.isNegInf()) {
			throw new UndefinedError(message('undefinedValue'));
		}
		retval = Expression.Inf();
	} else if (x.isOne()) {
		retval = zero();
	} else if (x.isE() && x.getMultiplier().isOne()) {
		retval = one().times(x.getPower());
	} else if (x.sign() === -1 && !x.isComplex()) {
		retval = Expression.Pi().times(Expression.Img()).plus(log(x.abs()));
	}
	// Handle complex numbers regardless of EVALUATE setting
	else if (x.isComplex()) {
		const re = x.realPart();
		const im = x.imagPart();
		// Compute |z|
		const mag = sqrt(re.sq().plus(im.sq()));
		// log(z) = log(|z|) + i*arg(z)
		retval = log(mag).plus(atan2(im, re).i());
	}
	// Don't collapse
	else if (Settings.EVALUATE) {
		if (x.isNUM()) {
			// If a numeric base is provided, compute log_b(x) directly.
			if (baseExpr && baseExpr.isNUM()) {
				const lnX = x.getMultiplier().toDecimal().ln();
				const lnB = baseExpr.getMultiplier().toDecimal().ln();
				retval = Expression.Number(lnX.div(lnB));
			} else {
				retval = Expression.Number(x.getMultiplier().toDecimal().ln());
			}
		}
	}
	// Symbolic cases
	else {
		// Rational number: log(a/b) → log(a) - log(b)
		// Handle NUM first to avoid infinite recursion with multiplier factoring
		if (x.isNUM()) {
			const rat = x.getMultiplier();
			const num = rat.numerator < 0n ? -rat.numerator : rat.numerator;
			const den = rat.denominator < 0n ? -rat.denominator : rat.denominator;

			if (den !== 1n) {
				// log(a/b) = log(a) - log(b)
				retval = log(Expression.Number(num)).minus(log(Expression.Number(den)));
			} else if (expandPrimes) {
				// Try to decompose into prime factors: log(8) → 3*log(2)
				const factors = primeFactorCounts(num);
				const primes = Object.keys(factors);
				if (primes.length > 0 && (primes.length > 1 || factors[primes[0]] > 1n)) {
					retval = zero();
					for (const prime in factors) {
						const count = factors[prime];
						const logPrime = Expression.toFunction(Expression.LOG, [
							Expression.Number(prime),
						]);
						retval = retval.plus(logPrime.times(Expression.Number(count)));
					}
				}
				// else: it's prime, fall through to default
			}
		}
		// Non-NUM symbolic cases: factor out the multiplier
		else {
			const m = x.getMultiplier();
			const mFree = x.toUnitMultiplier();

			let logExpr: Expression | undefined;

			// Product: log(a*b*c) → log(a) + log(b) + log(c)
			if (mFree.isProduct() && mFree.isLinear()) {
				logExpr = zero();
				mFree.each(element => {
					logExpr = logExpr!.plus(log(element));
				});
			}
			// EXP type with power: log(a^(p/q)) → (p/q)*log(a)
			// Handles cases like log(2^(1/2)) → (1/2)*log(2)
			else if (mFree.isEXP()) {
				const base_expr = mFree.getBase();
				const pow = mFree.getPower();
				logExpr = log(base_expr).times(pow);
			}
			// Default: log(x^n) → n*log(x)
			else {
				logExpr = Expression.toFunction(Expression.LOG, [stripPower(mFree)]).times(
					mFree.getPower()
				);
			}

			// Handle the multiplier: log(m * expr) = log(m) + log(expr)
			if (logExpr && !m.isOne()) {
				retval = logExpr.plus(log(Expression.fromRational(m)));
			} else {
				retval = logExpr;
			}
		}
	}

	retval = retval || Expression.toFunction(Expression.LOG, [new Expression(x)]);

	// Handle base conversion: log_b(x) = log(x) / log(b)
	if (baseExpr && retval) {
		retval = retval.div(log(baseExpr));
	}

	return retval;
}

function aggregator(
	args: ExpressionInputType[],
	condition: (a: Expression, b: Expression) => boolean
) {
	let canCompare = true;
	let retval: Expression | undefined = undefined;
	const expressions = args.map(e => {
		const v = getNumericOrAssumedValue(Expression.create(e));
		if (!v) {
			canCompare = false;
		}
		return v;
	});
	if (canCompare) {
		let m = expressions[0];
		for (let i = 1; i < expressions.length; i++) {
			const e = expressions[i];
			if (condition(e!, m!)) {
				m = e;
			}
		}
		retval = m!;
	}
	return retval;
}

/**
 * Returns the maximum value from a set of expressions.
 *
 * If all arguments can be compared numerically (or have assumed numeric values),
 * returns the largest. Otherwise returns a symbolic `max(...)` node.
 *
 * @param args - Two or more expressions to compare.
 * @returns The maximum value, or a symbolic `max(...)` node.
 *
 * @example
 * ```ts
 * max(1, 3, 2).text()     // "3"
 * max(-5, 0).text()       // "0"
 * max('x', 'y').text()    // "max(x, y)"
 * ```
 */
export function max(...args: ExpressionInputType[]) {
	const maxValue = aggregator(args, (a, b) => a.gt(b));
	return maxValue ?? Expression.toFunction('max', args);
}

/**
 * Returns the minimum value from a set of expressions.
 *
 * If all arguments can be compared numerically (or have assumed numeric values),
 * returns the smallest. Otherwise returns a symbolic `min(...)` node.
 *
 * @param args - Two or more expressions to compare.
 * @returns The minimum value, or a symbolic `min(...)` node.
 *
 * @example
 * ```ts
 * min(1, 3, 2).text()     // "1"
 * min(-5, 0).text()       // "-5"
 * min('x', 'y').text()    // "min(x, y)"
 * ```
 */
export function min(...args: ExpressionInputType[]) {
	const maxValue = aggregator(args, (a, b) => a.lt(b));
	return maxValue ?? Expression.toFunction('min', args);
}

/**
 * Computes the exponential function e^x.
 *
 * - `exp(0) = 1`
 * - `exp(+∞) = +∞`, `exp(−∞) = 0`
 * - For complex inputs `a + bi` where both parts are numeric, applies Euler's formula:
 *   `exp(a + bi) = exp(a) · (cos(b) + i·sin(b))`.
 * - For symbolic inputs, returns `e^(x)`.
 *
 * @param x - The exponent expression.
 * @returns The value of e raised to the power `x`.
 *
 * @example
 * ```ts
 * exp(0).text()       // "1"
 * exp(1).text()       // "2.71828182845904..."
 * exp('x').text()     // "e^(x)"
 * ```
 */
export function exp(x: ExpressionInputType): Expression {
	let retval: Expression | undefined;
	let z: Expression;
	let re: Expression;
	let im: Expression;
	let c: Expression;
	let s: Expression;
	let ea: Expression;

	x = Expression.create(x);

	// Easy simplifications
	if (x.isPosInf() || x.isNegInf()) {
		return x.isNegInf() ? zero() : Expression.Inf();
	} else if (x.isZero()) {
		retval = one();
	} else if (Settings.EVALUATE) {
		// Handle complex
		if (x.isComplex()) {
			// Only evaluate if we can guarantee a numeric value in C.
			// We do this by evaluating x first, then requiring both real and imaginary
			// parts to be numeric.
			z = x.evaluate();

			re = z.realPart();
			im = z.imagPart();

			if (re.isNUM() && im.isNUM()) {
				// exp(a+bi) = exp(a) * (cos(b) + i*sin(b))
				ea = Expression.Number(re.getMultiplier().toDecimal().exp());
				c = cos(im);
				s = sin(im);
				retval = ea.times(c.plus(s.i()));
			}
		} else if (x.isNUM()) {
			retval = Expression.Number(x.getMultiplier().toDecimal().exp());
		}
	}

	return retval ?? Expression.create(`e^(${x})`);
}

/**
 * Constructs a {@link Matrix} from the provided rows.
 *
 * Each argument is an array representing one row of the matrix. All rows must
 * have the same length; elements are converted to {@link Expression} instances.
 *
 * @param args - One or more arrays, each representing a row of the matrix.
 * @returns A new {@link Matrix} instance.
 * @throws {@link MathError} If rows have inconsistent lengths.
 *
 * @example
 * ```ts
 * // 2×2 identity matrix
 * matrix([1, 0], [0, 1]).text()   // "matrix([1, 0], [0, 1])"
 *
 * // 2×3 matrix
 * matrix([1, 2, 3], [4, 5, 6]).text()
 * ```
 */
export function matrix(...args: ParserInputType[][]) {
	return new Matrix(...args);
}

/**
 * Attempts to extract an integer bigint from an Expression.
 * Returns null if the expression is not an exact integer.
 */
function toIntegerBigint(x: Expression): bigint | null {
	const isInt: boolean = x.isInteger();
	if (!isInt) {
		return null;
	}

	const m = x.getMultiplier();
	const den: bigint = m.denominator;

	if (den !== 1n) {
		return null;
	}

	const num: bigint = m.numerator;
	return num;
}

/**
 * Computes a finite summation: `sum(expr, k, a, b) = Σ_{k=a}^{b} expr`.
 *
 * - If bounds are integers and the number of terms ≤ `Settings.MAX_PRODUCT_AND_SUMMATION_ITERATION`,
 *   evaluates by accumulating each term.
 * - If `lower > upper`, returns `0` (empty range).
 * - If `expr` does not depend on the index variable, simplifies to `expr · (b − a + 1)`.
 * - Otherwise returns a symbolic `sum(expr, k, a, b)` node.
 *
 * @param expr - The expression to be summed.
 * @param index - The index variable (must be a plain symbol).
 * @param lower - The lower bound (integer required for evaluation).
 * @param upper - The upper bound (integer required for evaluation).
 * @returns The summation result or a symbolic `sum` node.
 *
 * @example
 * ```ts
 * // Σ_{k=1}^{5} k = 15
 * sum('k', 'k', 1, 5).text()   // "15"
 * ```
 */
export function sum(
	expr: Expression,
	index: Expression,
	lower: Expression,
	upper: Expression
): Expression {
	// Validate index variable
	if (!index.isPlainVariable()) {
		return Expression.toFunction('sum', [expr, index, lower, upper]);
	}

	expr = Expression.create(expr);
	index = Expression.create(index);
	lower = Expression.create(lower);
	upper = Expression.create(upper);

	const indexName: string = index.text();

	// Attempt integer bounds extraction
	const lo: bigint | null = toIntegerBigint(lower);
	const hi: bigint | null = toIntegerBigint(upper);

	if (lo === null || hi === null) {
		// Non-integer bounds → symbolic
		return Expression.toFunction('sum', [expr, index, lower, upper]);
	}

	// Empty range → 0
	if (lo > hi) {
		return zero();
	}

	const terms: bigint = hi - lo + 1n;

	// Prevent runaway evaluation
	if (terms > Settings.MAX_PRODUCT_AND_SUMMATION_ITERATION) {
		return Expression.toFunction('sum', [expr, index, lower, upper]);
	}

	// If expression does not depend on index, simplify:
	// sum(c, k, a, b) = c * (b - a + 1)
	const dependsOnIndex: boolean = expr.hasVariable(indexName);
	if (!dependsOnIndex) {
		const countExpr: Expression = Expression.create(terms);
		return expr.times(countExpr);
	}

	// Numeric accumulation
	let acc: Expression = zero();
	let i: bigint = lo;

	while (i <= hi) {
		const values: ParserValuesObject = {};
		values[indexName] = i;

		const term: Expression = expr.evaluate(values);
		acc = acc.plus(term);

		i = i + 1n;
	}

	return acc;
}

/**
 * Computes a finite product: `product(expr, k, a, b) = Π_{k=a}^{b} expr`.
 *
 * - If bounds are integers and the number of terms ≤ `Settings.MAX_PRODUCT_AND_SUMMATION_ITERATION`,
 *   evaluates by multiplying each term.
 * - If `lower > upper`, returns `1` (empty product).
 * - If `expr` does not depend on the index variable, simplifies to `expr^(b − a + 1)`.
 * - Otherwise returns a symbolic `product(expr, k, a, b)` node.
 *
 * @param expr - The expression to be multiplied.
 * @param index - The index variable (must be a plain symbol).
 * @param lower - The lower bound (integer required for evaluation).
 * @param upper - The upper bound (integer required for evaluation).
 * @returns The product result or a symbolic `product` node.
 *
 * @example
 * ```ts
 * // Π_{k=1}^{5} k = 120 (same as 5!)
 * product('k', 'k', 1, 5).text() // "120"
 * ```
 */
export function product(
	expr: Expression,
	index: Expression,
	lower: Expression,
	upper: Expression
): Expression {
	if (!index.isPlainVariable()) {
		return Expression.toFunction('product', [expr, index, lower, upper]);
	}

	expr = Expression.create(expr);
	index = Expression.create(index);
	lower = Expression.create(lower);
	upper = Expression.create(upper);

	const indexName: string = index.text();

	const lo: bigint | null = toIntegerBigint(lower);
	const hi: bigint | null = toIntegerBigint(upper);

	if (lo === null || hi === null) {
		return Expression.toFunction('product', [expr, index, lower, upper]);
	}

	// Empty range → 1
	if (lo > hi) {
		return one();
	}

	const terms: bigint = hi - lo + 1n;

	if (terms > Settings.MAX_PRODUCT_AND_SUMMATION_ITERATION) {
		return Expression.toFunction('product', [expr, index, lower, upper]);
	}

	// product(c, k, a, b) = c^(b-a+1)
	const dependsOnIndex: boolean = expr.hasVariable(indexName);
	if (!dependsOnIndex) {
		const countExpr: Expression = Expression.create(terms);
		return power(expr, countExpr);
	}

	let acc: Expression = one();
	let i: bigint = lo;

	while (i <= hi) {
		const values: ParserValuesObject = {};
		values[indexName] = i;

		const term: Expression = expr.evaluate(values);
		acc = acc.times(term);

		i = i + 1n;
	}

	return acc;
}

/**
 * Calculates the definite integral using Adaptive Simpson. Note that this function uses
 * native JS number due to severe computational overhead when implemented with Decimal.js.
 *
 * @param f The function being integrated
 * @param dx The variable of integration
 * @param from The lower limit of the integral
 * @param to The upper limit of the integral
 * @returns The numeric value if possible else a symbolic function
 *
 * @example
 * ```ts
 * defint('cos(x)-x^2+6', 'x', 1, 6); // -42.787553149673464
 * ```
 */
export function defint(
	f: ExpressionInputType,
	dx: ExpressionInputType,
	from: ExpressionInputType,
	to: ExpressionInputType
) {
	let retval: Expression;
	f = Expression.create(f);
	dx = Expression.create(dx);
	from = Expression.create(from);
	to = Expression.create(to);

	const inputVars = f.variables();
	// Get the variable
	const v = assertPlainVariableAndGetString(dx);
	// Make sure the integral can be pulled
	if (inputVars.length === 0) {
		retval = f;
	} else if (inputVars.length === 1 && inputVars[0] === v && from.isNUM() && to.isNUM()) {
		const a = Number(from.getMultiplier().toDecimal());
		const b = Number(to.getMultiplier().toDecimal());
		retval = Expression.create(definiteIntegrateNative(f.buildFunction(), a, b));
		retval.precision = 17; // Mark it as limited precision
	} else {
		retval = Expression.toFunction('defint', [f, dx, from, to]);
	}

	return retval;
}

/**
 *
 * @param x Verifies whether the value exists within a `Vector`, `ValuesSet`, `SolutionSet`, or `Dictionary`;
 * otherwise, returns a symbolic value. Searches the keys of `Dictionary` type.
 * @param value An expression
 * @returns `1` if found else `0`
 *
 * @example
 * ```ts
 * const d = Parser.parse('{x=>1, y=>a}') as Dictionary;
 * contains(d, 'x').text(); // 1
 *
 * const v = new Vector(['x', 1, 2]);
 * contains(v, 10).text(); // 0
 * ```
 */
export function contains(
	x: Expression | Vector | ValuesSet | SolutionSet | Dictionary,
	value: ExpressionInputType
) {
	value = Expression.create(value);
	let retval: Expression | undefined = undefined;
	if (Vector.isVector(x)) {
		retval = Expression.create(Number(x.indexOf(value) !== -1));
	} else if (ValuesSet.isValuesSet(x) || SolutionSet.isSolutionSet(x)) {
		retval = Expression.create(Number(x.has(x)));
	} else if (Dictionary.isDictionary(x)) {
		retval = Expression.create(Number(x.has(value.text())));
	}

	return retval ?? Expression.toFunction('contains', [x as Expression, value]);
}
