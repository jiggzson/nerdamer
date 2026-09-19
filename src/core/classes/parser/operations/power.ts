import { abs as expressionAbs, log } from '../../../../math/math';
import { cos, sin } from '../../../../math/trig';
import { message, UndefinedError, ZeroToZeroPowerError } from '../../../errors';
import { isEven } from '../../../functions/bigint/bigint';
import { abs } from '../../../functions/bigint/bigint';
import { primeFactorCounts } from '../../../functions/bigint/primeFactor';
import { imagPart, realPart, simplifyImaginary } from '../../../functions/complex';
import { toPolarFormArray } from '../../../functions/complex';
import { Settings } from '../../../Settings';
import { Expression } from '../../expression/Expression';
import { minusOne, one, two } from '../../expression/shortcuts';
import { stripPower } from '../../expression/utils';
import {
	ABS,
	PI,
	RATIONAL,
	SQRT,
	COS,
	SIN,
	TAN,
	SEC,
	CSC,
	COT,
	COSH,
	SINH,
	TANH,
	SECH,
	CSCH,
	COTH,
} from '../constants';

import { equal } from './compare';
import { multiply } from './multiply';

import type { factorCountType } from '../../../functions/bigint/primeFactor';

const reciprocalFunctions: Record<string, string> = {
	[COS]: SEC,
	[SEC]: COS,
	[SIN]: CSC,
	[CSC]: SIN,
	[TAN]: COT,
	[COT]: TAN,
	[COSH]: SECH,
	[SECH]: COSH,
	[SINH]: CSCH,
	[CSCH]: SINH,
	[TANH]: COTH,
	[COTH]: TANH,
};

/**
 * IMPORTANT: Expressions of type EXP carry a sign in their value.
 * @param a
 * @param b
 * @returns
 */
export function power(a: Expression, b: Expression): Expression {
	let retval;

	if (a.isZero() && b.isZero()) {
		throw new ZeroToZeroPowerError(message('zeroToZeroPower'));
	}

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
			// Reciprocal function naming is an evaluation-time canonicalization. Keep
			// ordinary parsing in power form so symbolic cancellation is unaffected.
			if (
				a.isFunction() &&
				b.isMinusOne() &&
				a.getMultiplier().isOne() &&
				a.getPower().isOne() &&
				reciprocalFunctions[a.name]
			) {
				retval = Expression.toFunction(reciprocalFunctions[a.name], a.getArguments());
			}
			// Deal with cases where evaluate is called
			else if (a.isNUM() && b.isNUM()) {
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
			// Integer powers can be distributed across products without changing branches.
			else if (
				a.isProduct() &&
				((a.isLinear() && b.isInteger()) ||
					(a.isConstant() && !a.isComplex() && a.sign() > 0))
			) {
				retval = Expression.fromRational(a.getMultiplier()).pow(b);
				const elements = a.getElements();
				for (const x in elements) {
					retval = retval.times(elements[x].pow(b));
				}
			}
			// Positive real magnitude does not change the principal argument, so it
			// can be pulled out of a noninteger power. Keep a negative sign attached
			// to the symbolic part instead of raising that sign separately.
			else if (
				b.isNUM() &&
				!b.isInteger() &&
				!a.isNUM() &&
				!a.getMultiplier().abs().isOne()
			) {
				const m = a.getMultiplier();
				const magnitude = m.abs();
				let base = a.toUnitMultiplier();

				if (m.isNegative()) {
					base = base.neg();
				}

				retval = power(base, b).times(power(Expression.fromRational(magnitude), b));
			}
			// Positive real factors can be pulled out of a principal power even when
			// the remaining product has an unknown branch. Keep all other factors
			// grouped so their combined argument is preserved.
			else if (b.isNUM() && !b.isInteger() && a.isProduct() && a.isLinear()) {
				let extracted = one();
				let remainder = one();
				let changed = false;

				for (const element of a.elementsArray()) {
					if (!element.isComplex() && element.gt(0)) {
						extracted = extracted.times(power(element, b));
						changed = true;
					} else {
						remainder = remainder.times(element);
					}
				}

				if (changed) {
					retval = remainder.isOne() ? extracted : extracted.times(power(remainder, b));
				}
			} else if (b.isNUM()) {
				// 0^n where n > 0
				if (a.isZero()) {
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
					const p = multiply(a.getPower(), b);
					if (p.isOne()) {
						retval = a.getBase().times(a.getMultiplier());
					} else {
						retval = new Expression(a);
						retval.power = p;
					}
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
						// A negative sign is part of the principal argument for noninteger
						// powers. Positive magnitude has already been extracted for symbolic
						// bases, while numeric bases keep their exact magnitude in c.
						if (root !== 1n && !a.isNUM() && a.getMultiplier().isNegative()) {
							retval = Expression.toEXP(new Expression(a), b);
							retval = retval.times(c);
							retval = rationalizeRadical(retval);
						} else if (root !== 1n && root !== 2n && a.isNUM() && a.sign() === -1) {
							retval = Expression.toEXP(minusOne(), b).times(c);
						} else {
							retval = a.toUnitMultiplier();

							if (retval.isOne() && a.sign() === -1 && root === 2n) {
								retval = retval.times(Expression.Img());
								// Negate for alternating odd powers. Negative exponents use the
								// reciprocal principal value, so the imaginary phase is inverted too.
								if (pow % 4n === 3n) {
									retval = retval.neg();
								}
								if (b.sign() === -1) {
									retval = retval.invert();
								}
							} else {
								// NOTE: This is one of the issues that arises with the schema being used with the library. Ideally, the power
								// on any variable is a power and the multiplier is factored our and treated separately. We run into a problem
								// with even roots which cannot factor out the multiplier. In this case we cast the entire thing to an EXP e.g. (-x)^(1/2)
								if (a.sign() === -1 && !evenPow) {
									retval = retval.neg();
									const bIsInteger = b.isInteger();
									// Finalize the normalized variable. The coefficient has already been
									// raised into c and must not be reintroduced here.
									if (a.isVAR() && bIsInteger) {
										retval = Expression.setPower(retval, b);
									} else if (!(retval.isMinusOne() && bIsInteger)) {
										retval = Expression.toEXP(retval, b);
									}
								} else {
									const innerPower = retval.getPower();
									const p = innerPower.times(b);

									if (p.isZero()) {
										retval = one();
									} else if (p.isNUM()) {
										const innerMagnitude = innerPower.getMultiplier().abs();
										const canCombine =
											b.isInteger() || innerPower.isOne() || innerMagnitude.lt('1');

										// An even integer power of a real expression is nonnegative. For a
										// noninteger outer power, preserve that fact explicitly with abs().
										if (
											!b.isInteger() &&
											innerPower.isInteger() &&
											innerPower.isEven() &&
											!stripPower(retval).isComplex()
										) {
											retval = expressionAbs(stripPower(retval));
											retval = Expression.setPower(retval, p);
										} else if (canCombine) {
											if (retval.isEXP()) {
												retval = power(retval.getBase(), p).times(
													retval.getMultiplier()
												);
											} else {
												// The abs is redundant for even powers.
												if (retval.isFunction(ABS)) {
													if (isEven(p.getMultiplier().numerator)) {
														retval = retval
															.getArguments()[0]
															.times(retval.getMultiplier());
													}
												}
												retval = Expression.setPower(retval, p);
											}
										} else {
											retval = Expression.toEXP(retval, b);
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
					const absPower = p.getMultiplier().abs();
					const base = stripPower(a.toUnitMultiplier());

					// An even integer power of a real expression is nonnegative, so it can
					// be represented through abs() before applying a symbolic outer power.
					if (
						!m.isNegative() &&
						p.isInteger() &&
						p.isEven() &&
						!base.isComplex()
					) {
						retval = expressionAbs(base);
						retval = Expression.toEXP(retval, pow);
						if (!m.isOne()) {
							retval = retval.times(
								Expression.toEXP(Expression.fromRational(m), b)
							);
						}
					}
					// A real inner power with magnitude below one stays inside the
					// principal argument range, so roots can still combine with a
					// symbolic outer power. Power one is the trivial safe case.
					else if (!m.isNegative() && (p.isOne() || absPower.lt('1'))) {
						retval = Expression.toEXP(base, pow);
						if (!m.isOne()) {
							retval = retval.times(
								Expression.toEXP(Expression.fromRational(m), b)
							);
					}
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

		if (a.hasDecimal()) {
			const decimalCarrier = retval.isEXP() ? retval.getBase() : retval;
			decimalCarrier.getMultiplier().asDecimal = true;
		}
	}

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

		// Preserve only the sign contribution that may have been pulled out above.
		// The magnitude is rebuilt from m so it is not counted twice.
		const multiplier = m.pow(exponent);
		retval.multiplier = retval.getMultiplier().isNegative() ? multiplier.neg() : multiplier;

		if (sgn === -1) {
			retval.multiplier = retval.getMultiplier().invert();
		}

		retval = Expression.setPower(retval, a.getPower().times(b.getMultiplier()));
	} else {
		// See if a nested power can be simplified without crossing the
		// principal branch. A positive real base raised to a real power stays
		// positive, so symbolic exponent cancellation is safe in that case.
		const p = a.getPower().times(b);
		if (
			p.isNUM() &&
			a.isEXP() &&
			!a.getBase().isComplex() &&
			a.getBase().gt(0) &&
			imagPart(a.getPower()).isZero()
		) {
			retval = power(a.getBase(), p).times(a.getMultiplier());
		} else {
			const m = a.getMultiplier();
			const magnitude = m.abs();
			let base = a.toUnitMultiplier();

			// Positive real magnitude can always be factored from a principal
			// power. Keep a negative sign attached to the symbolic base because
			// separating it would change the principal argument.
			if (m.isNegative()) {
				base = base.neg();
			}

			retval = Expression.toEXP(base, b);
			if (!magnitude.isOne()) {
				retval = retval.times(Expression.toEXP(magnitude, b));
			}
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
		const pow = x.getPower();
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

	if (root === 1n && typeof x === 'bigint') {
		retval = Expression.Number(x);
	} else {
		let w = 1n;
		const rem: factorCountType = {};
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

		const combined: Record<string, bigint> = {};
		for (const factor in rem) {
			const p = String(rem[factor]);
			combined[p] = !combined[p] ? BigInt(factor) : BigInt(factor) * combined[p];
		}

		// Wrap them in Expressions
		retval = w === 1n ? one() : Expression.Number(w);
		// Raise the remaining roots to the radical
		for (const power in combined) {
			const factor = combined[power];
			const exponent = Expression.Number(BigInt(power)).div(Expression.Number(root));
			retval = retval.times(Expression.toEXP(Expression.Number(factor), exponent));
		}
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
		radicalPart = base.pow(Expression.Number(newNum).div(Expression.Number(q)));
	}

	// Integer part: base^(-k)
	const integerPart = base.pow(Expression.Number(-k));

	return radicalPart.times(integerPart).times(x.getMultiplier());
}