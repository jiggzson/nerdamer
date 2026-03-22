import { log } from '../../../../math/math';
import { cos, sin } from '../../../../math/trig';
import { stripPower } from '../../../../math/utils';
import { message, UndefinedError, ZeroToZeroPowerError } from '../../../errors';
import { isEven } from '../../../functions/bigint/bigint';
import { abs } from '../../../functions/bigint/bigint';
import { primeFactorCounts } from '../../../functions/bigint/primeFactor';
import { imagPart, realPart, simplifyImaginary } from '../../../functions/complex';
import { toPolarFormArray } from '../../../functions/complex';
import { Settings } from '../../../Settings';
import { Expression } from '../../expression/Expression';
import { minusOne, one, two } from '../../expression/shortcuts';
import { ABS, PI, RATIONAL, SQRT } from '../constants';

import { equal } from './compare';
import { multiply } from './multiply';

import type { factorCountType } from '../../../functions/bigint/primeFactor';

/**
 * IMPORTANT: Expressions of type EXP carry a sign in their value.
 * @param a
 * @param b
 * @returns
 */
export function power(a: Expression, b: Expression): Expression {
	let retval;

	if (Settings.DEFER_SIMPLIFICATION) {
		retval = new Expression(a);
		// Convert it to an EXP
		retval = Expression.toEXP(retval, new Expression(b));
		retval.deferred = true;
	} else {
		// Simplify powers of i immediately
		if (a.isI() && b.isInteger()) {
			retval = simplifyImaginary(setPower(a, b));
		}
		// Handle e^(i*pi)
		else if (a.isE() && b.isComplex()) {
			const p = new Expression(b);
			const m = p.getMultiplier();
			delete p.multiplier;
			if (equal(p, `${Expression.imaginary}*${PI[0]}`)) {
				if (m.isInteger()) {
					const sgn = Expression.Number(m.evenNumerator() ? '1' : '-1');
					retval = multiply(Expression.fromRational(a.getMultiplier()), sgn);
				} else if (m.denominator.toString() === '2') {
					const sgn = Expression.Number(m.abs().mod('4').numerator === 1n ? '1' : '-1');
					// Remember that this only occur for odd numerators
					retval = multiply(
						multiply(Expression.fromRational(a.getMultiplier()), Expression.Img()),
						sgn
					);
					if (m.isNegative()) {
						retval = retval.neg();
					}
				}
			}
		}
		// Evaluate the expression if requested
		else if (Settings.EVALUATE) {
			// Deal with cases where evaluate is called
			if (a.isNUM() && b.isNUM()) {
				// Check if it's a negative number
				const isNegative = a.sign() === -1;
				// Check if it's inverted
				const inverted = b.sign() === -1;
				// Get the base and exponent and positive numbers
				let base = a.abs();
				const exponent = b.abs();
				// First simplify if a or be is negative
				if (isNegative) {
					let theta = exponent.times(Expression.Pi());
					// If the power is negative then invert the base and negate the theta
					if (inverted) {
						base = base.invert();
						theta = theta.neg();
					}

					const c = Expression.Number(
						base.getMultiplier().toDecimal().pow(exponent.getMultiplier().toDecimal())
					);
					const re = cos(theta).times(c);
					const im = sin(theta).times(c).times(Expression.Img());

					retval = re.plus(im);
				} else {
					retval = Expression.fromRational(
						base.getMultiplier().pow(exponent.getMultiplier())
					);
					// Flip it back if it's inverted.
					if (inverted) {
						retval = retval.invert();
					}
				}
			}
			// Complex numbers e.g. 6+i
			else if (a.isComplex()) {
				if (b.isComplex()) {
					const [r, theta] = toPolarFormArray(a);
					const re = realPart(b);
					const im = imagPart(b);
					const q = re.times(theta).plus(im.times(log(r)));
					retval = power(r, re)
						.times(Expression.E().pow(im.neg().times(theta)))
						.times(cos(q).plus(Expression.Img().times(sin(q))));
				} else {
					// TODO: Move this to its own function - complexToTrig
					const base = a.distributeMultiplier();
					const [rp, tp] = toPolarFormArray(base);
					const theta = tp.times(b);
					const r = rp.pow(b);
					retval = r.times(cos(theta)).plus(r.times(Expression.Img().times(sin(theta))));
				}
			}
			// Complex power e.g. e^(i+2)
			// For the expression in the form c*n^(re+im*i) apply the formula
			// c*n^re*cos(log(n^im))+c*n^re*sin(log(n^im))*i
			else if (b.isComplex()) {
				const n = a.pow(b.realPart());
				const x = a.pow(b.imagPart());
				retval = n.times(cos(log(x))).plus(n.times(sin(log(x))).times(Expression.Img()));
			}
		} else {
			// Store check since it occurs on almost every check and definitely on the first.
			const bIsInf = b.isInf();

			// Handle one but not Infinity. 1^n = 1
			if (a.isOne() && !bIsInf) {
				retval = one();
			}
			// Handle zero but leave infinity for later
			else if (a.isZero() && !(bIsInf || b.isZero())) {
				retval = Expression.Number('0');
			}
			// Leave numbers and infinity for later.
			else if (b.isZero() && !(a.isInf() || a.isNUM())) {
				retval = one();
			} else if (b.isOne()) {
				retval = new Expression(a);
			} else if (a.isInf() || bIsInf) {
				const aIsInf = a.isInf();
				const bIsInf = b.isInf();

				if (aIsInf && bIsInf) {
					throw new UndefinedError(message('infinityToInfinity'));
				}

				if (a.isNUM()) {
					const m = a.getMultiplier();
					// n^Inf
					if ((m.gt('1') && b.isPosInf()) || (a.isPosInf() && b.isPosInf())) {
						// It's Infinity for positive Infinity but zero otherwise
						retval = Expression.Inf();
					} else if ((m.gt('1') && b.isNegInf()) || (m.eq('0') && b.isPosInf())) {
						retval = Expression.Number('0');
					} else {
						throw new UndefinedError(
							message('valueToInfinityUndefined', {
								value: m.lt('0') ? `(${a})` : `${a}`,
							})
						);
					}
				} else if (b.isZero()) {
					throw new UndefinedError(message('infinityToPowerZero'));
				}
			}
			// If it's a product then the power can be applied to each element
			else if (a.isProduct() && a.isLinear()) {
				retval = Expression.fromRational(a.getMultiplier()).pow(b);
				const elements = a.getElements();
				for (const x in elements) {
					retval = retval.times(elements[x].pow(b));
				}
			} else if (b.isNUM()) {
				// 0^n where n > 0
				if (a.isZero()) {
					if (a.getMultiplier().lte('0')) {
						throw new ZeroToZeroPowerError(message('divisionByZero'));
					}
					retval = Expression.Number('0');
				} else if (a.isMinusOne() && b.isInteger() && b.isOdd()) {
					retval = one().neg();
				}
				// n^0 is 1 for any number
				else if (b.isZero()) {
					retval = one();
				}
				// Simplify exponential functions which aren't numbers and the exponent is an integer
				else if (a.isEXP() && !a.getBase().isNUM() && b.isInteger()) {
					retval = new Expression(a);
					retval.power = multiply(a.getPower(), b);
				} else {
					// We know that b is a number so we only need to deal with its multiplier
					const exponent = b.abs();
					const p = exponent.getMultiplier();
					const pow = p.numerator;
					const root = p.denominator;
					// First deal with the multiplier
					const m = a.getMultiplier().abs();

					const n = m.numerator ** pow;
					const d = m.denominator ** pow;

					// Raise it to the power and then pull the roots. This will be wrapped in Expressions
					// If the number is too large then this will hang. Provide a warning and exit
					if (n <= Settings.MAX_FRAC_INT && d <= Settings.MAX_FRAC_INT) {
						const num = nthPow(n, root);
						const den = nthPow(d, root);
						const evenPow = isEven(pow);
						// printE({ num: num, den: den, sign: b.sign() });
						// Rebuild the coefficient
						// Use:
						let c: Expression;
						if (b.sign() === -1) {
							c = den.times(num.invert());
						} else {
							c = num.times(den.invert());
						}
						// Begin retval
						// IMPORTANT: For fractional powers, do not strip a negative multiplier from purely imaginary unit bases.
						// Example: (-i)^(2/3) must not be normalized to i^(2/3) under principal complex powers.
						//
						// However, if the negative multiplier has an extractable square factor (e.g. (-4*i)^(1/2)),
						// we still want to pull out that factor: sqrt(-4*i) = 2*sqrt(-i), not 2*sqrt(-4*i).
						// Therefore, only preserve the negative multiplier inside the radical when |multiplier| = 1.
						if (
							root !== 1n &&
							a.getMultiplier().isNegative() &&
							a.isI() &&
							a.getMultiplier().abs().isOne()
						) {
							retval = Expression.toEXP(new Expression(a), b);
							retval = retval.times(c);
							retval = rationalizeRadical(retval);
						} else {
							retval = a.toUnitMultiplier();

							if (retval.isOne() && a.sign() === -1 && root === 2n) {
								retval = retval.times(Expression.Img());
								// Negate for alternating odd powers
								if (pow % 4n === 3n) {
									retval = retval.neg();
								}
							} else {
								// NOTE: This is one of the issues that arises with the schema being used with the library. Ideally, the power
								// on any variable is a power and the multiplier is factored our and treated separately. We run into a problem
								// with even roots which cannot factor out the multiplier. In this case we cast the entire thing to an EXP e.g. (-x)^(1/2)
								if (a.sign() === -1 && !evenPow) {
									retval = retval.neg();
									const bIsInteger = b.isInteger();
									// Finalize -1 immediately
									if (a.isVAR() && bIsInteger) {
										retval = Expression.setPower(a, b);
									} else if (!(retval.isMinusOne() && bIsInteger)) {
										retval = Expression.toEXP(retval, b);
									}
								} else {
									const p = retval.getPower().times(b);

									if (p.isZero()) {
										retval = one();
									} else if (p.isNUM()) {
										if (retval.isEXP()) {
											// If it resulted in a number then call pow recursively on the arg of the EXP
											retval = power(retval.getBase(), p).times(
												retval.getMultiplier()
											);
										} else {
											if (a.getPower().isEven() && isEven(root)) {
												retval = Expression.toFunction(ABS, [
													stripPower(retval),
												]);
											}
											// The abs is redundant for even powers
											else if (retval.isFunction(ABS)) {
												if (isEven(p.getMultiplier().numerator)) {
													retval = retval
														.getArguments()[0]
														.times(retval.getMultiplier());
												}
											}
											// Just set the power to the multiplier of the product
											retval = Expression.setPower(retval, p);
										}
									}
									// ** Cannot simplify since more info about x is required. Just return EXP
									else if (!retval.getPower().isNUM()) {
										retval = Expression.toEXP(retval, b);
									} else {
										// Otherwise we're dealing with an EXP. Set powerLess to true to delete the power when creating the EXP
										retval = Expression.toEXP(retval, p, true);
									}
								}
							}

							retval = retval.times(c);
							retval = rationalizeRadical(retval);
						}
					}
				}
			}
			// Deal with all cases involving Infinity
			// https://www.superprof.co.uk/resources/academic/maths/calculus/limits/properties-of-infinity.html
			else if (a.isInf() || b.isInf()) {
				const aIsInf = a.isInf();
				const bIsInf = b.isInf();

				if (aIsInf && bIsInf) {
					throw new UndefinedError(message('infinityToInfinity'));
				}

				if (a.isNUM()) {
					const m = a.getMultiplier();
					// n^Inf
					if ((m.gt('1') && b.isPosInf()) || (a.isPosInf() && b.isPosInf())) {
						// It's Infinity for positive Infinity but zero otherwise
						retval = Expression.Inf();
					} else if ((m.gt('1') && b.isNegInf()) || (m.eq('0') && b.isPosInf())) {
						retval = Expression.Number('0');
					} else {
						throw new UndefinedError(
							message('valueToInfinityUndefined', {
								value: m.lt('0') ? `(${a})` : `${a}`,
							})
						);
					}
				} else if (b.isZero()) {
					throw new UndefinedError(message('infinityToPowerZero'));
				}
			} else {
				const p = a.getPower();
				const pow = b.times(p);
				if (p.isNUM() && !pow.isNUM()) {
					const m = a.getMultiplier();
					retval = Expression.toEXP(stripPower(a.toUnitMultiplier()), pow);
					if (!m.isOne()) {
						retval = retval.times(Expression.toEXP(Expression.fromRational(m), b));
					}
				}
			}
		}

		// If not handled then just return a^b. This ensures that we're always returning a
		// Expression raised to a power
		if (!retval) {
			retval = setPower(a, b);
		}

		// This can be in simplify but yields better overall results when kept here.
		if (retval.isI()) {
			retval = simplifyImaginary(retval);
		}
	}
	// printE({ a: a, b: b, retval: retval });
	return retval;
}

/**
 * Sets the power of a Expression by converting it to an exponential.
 * This functions assumes that no negatives roots or exponents are provided.
 * If EVALUATE is set it returns the evaluate value
 *
 * @param a
 * @param b
 */
export function setPower(a: Expression, b: Expression) {
	let retval: Expression;
	/**
	 * Although numbers can technically carry a Rational as their power, we'll just have them
	 * be an EXP instead. This eliminates the need to create another type to bridge numbers
	 * with a power != 1 and other types. We start with b == NUM
	 */
	if (
		Settings.EVALUATE &&
		a.isNUM() &&
		b.isNUM() &&
		!a.getMultiplier().isNegative() &&
		!b.getMultiplier().isNegative()
	) {
		retval = Expression.fromRational(a.getMultiplier().pow(b.getMultiplier()));
	} else if (a.isNUM()) {
		retval = Expression.toEXP(a.getMultiplier(), b);
	} else if (b.isNUM() && !a.isEXP()) {
		retval = a.toUnitMultiplier();

		// (2*x)^2 = 4*x^2 or 2^-2 = 1/4
		const sgn = b.getMultiplier().sign();
		// Get the absolute value so we can pull the power and then we'll invert it back.
		const exponent = b.getMultiplier().abs();

		let m = a.getMultiplier();
		// Think sqrt((-y)^2)
		if (m.isNegative()) {
			// Pull the power
			retval.power = retval.getPower().times(exponent);
			// Move the negative sign out
			retval = retval.times(minusOne().pow(exponent));
			// Remove the sign from the multiplier
			m = m.abs();
		}

		retval.multiplier = m.pow(exponent); // The multiplier

		if (sgn === -1) {
			retval.multiplier = retval.getMultiplier().invert();
		}

		retval = Expression.setPower(retval, a.getPower().times(b.getMultiplier()));
	} else {
		// See if it can be simplified
		const p = a.getPower().times(b);
		// TODO: Duplicated code fragment that needs refactoring. See if(b.isNUM()) block;
		if (p.isNUM() && a.isEXP()) {
			retval = power(a.getBase(), p).times(a.getMultiplier());
		} else {
			// Example: (2*x)^y = 2^y*x^y
			// Convert the multiplier to an EXP
			const m = a.getMultiplier();
			// Convert the remainder to an EXP
			retval = Expression.toEXP(a.toUnitMultiplier(), b);
			// Return the product
			retval = retval.times(Expression.toEXP(m, b));
		}
	}

	return retval;
}

/**
 * Converts the square root to power form
 *
 * @param x
 */
export function sqrtToPow(x: Expression) {
	let retval: Expression;

	if (x.isFunction(SQRT)) {
		retval = new Expression(x.getArguments()[0]);
		// The the power. Pass in true to get it as a Expression
		const pow = x.getPower() as Expression;
		// set the power
		retval = setPower(retval, pow.div(two()));
		// Put back the multiplier
		retval.multiplier = x.getMultiplier().copy();
	} else {
		retval = new Expression(x);
	}

	return retval;
}

/**
 * Converts a function from power to sqrt form
 *
 * @param x
 */
export function powToSqrt(x: Expression) {
	let retval: Expression;
	if (
		x.power &&
		x.power.dataType === RATIONAL &&
		isEven(x.getPower().getMultiplier().denominator)
	) {
		// Create a temporary value with the power raised to two to remove 1/2n from the root
		const t = power(x.toUnitMultiplier(), two());
		// Wrap it in a function. Call it recursively to wrap any additional values in sqrt as well.
		retval = Expression.toFunction(SQRT, [powToSqrt(t)]);
		// Put back the multiplier
		retval.multiplier = x.getMultiplier().copy();
	} else {
		retval = new Expression(x);
	}

	return retval;
}

/**
 * Removes factors of two.
 *
 * @param n
 * @returns
 */
export function nthPow(x: bigint | factorCountType, root: bigint) {
	let retval: Expression;
	let w = 1n;
	const rem = {};
	// We first grab all the prime factors. We can then start placing them back.
	// Let's take 4320 as an example. The counts will be 2: 5n, 3: 3n, 5: 1n. The factor 2 has 2 perfect
	// squares 3 has 1 and 5 has 0. We divide those out and raise the factor to that square. It then gets
	// multiplied to the whole.
	const factorCounts = typeof x === 'bigint' ? primeFactorCounts(x) : x;

	for (const factor in factorCounts) {
		const count = factorCounts[factor];
		const f = BigInt(factor);
		// Divide out the perfect square and add them to the whole
		const e = count / root;
		// Remove the wholes and keep the remainder
		const r = count - e * root;
		// Add it to the wholes
		w *= f ** e;
		// Add the remainder to rem so we can have it in the form (factor)^(power/root)
		if (r > 0n) {
			rem[factor] = r;
		}
	}

	// Combine the like power & roots. Instead of having sqrt(3)*sqrt(2), we combine it to sqrt(6)

	const combined = {};
	for (const factor in rem) {
		const p = String(rem[factor]);
		combined[p] = !combined[p] ? BigInt(factor) : BigInt(factor) * combined[p];
	}

	// Wrap them in Expressions
	retval = w === 1n ? one() : Expression.Number(w);
	// Raise the remaining roots to the radical
	for (const power in combined) {
		const factor = combined[power];
		retval = retval.times(Expression.toEXP(factor, `${power}/${root}`));
	}

	return retval;
}

/**
 * Rationalizes a numeric expression with a negative fractional power.
 * Rewrites a^(-p/q) as a^((kq-p)/q) * a^(-k) where k = ceil(p/q),
 * removing the radical from the denominator.
 *
 * Example: 5^(-2/3) → 5^(1/3) * 5^(-1) = 5^(1/3) / 5
 *
 * @param x An EXP expression like 5^(-2/3)
 * @returns The rationalized expression
 */
export function rationalizeRadical(x: Expression, canonical: boolean = false): Expression {
	if (!x.isEXP() || !x.hasRadical()) {
		return x;
	}

	const m = x.getPower().getMultiplier();

	// Only rationalize negative fractional powers
	if (!m.isNegative()) {
		return x;
	}

	const base = x.getBase();

	// Get absolute values of numerator and denominator
	const p = abs(m.numerator);
	const q = abs(m.denominator);

	// k = ceil(p/q)
	const k = (p + q - 1n) / q;

	// New radical power: (kq - p) / q
	const newNum = k * q - p;

	// Only rationalize if the result is simpler or equal,
	// unless canonical mode is requested
	if (!canonical && newNum > p) {
		return x;
	}

	// Radical part: base^(newNum/q) — this has a positive fractional power
	let radicalPart: Expression;
	if (newNum === 0n) {
		radicalPart = one();
	} else {
		radicalPart = base.pow(Expression.create(newNum).div(q));
	}

	// Integer part: base^(-k)
	const integerPart = base.pow(Expression.create(`${-k}`));

	return radicalPart.times(integerPart).times(x.getMultiplier());
}
