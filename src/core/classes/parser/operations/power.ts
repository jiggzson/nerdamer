import Decimal from 'decimal.js';

import { abs as expressionAbs, log, numeric } from '../../../../math/index';
import { cos, sin } from '../../../../math/trig';
import { RATIONAL } from '../../../constants/entityTypes';
import {
	ABS,
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
} from '../../../constants/functionNames';
import { PI } from '../../../constants/symbolNames';
import {
	DivisionByZeroError,
	message,
	UndefinedError,
	UnsupportedOperationError,
	ZeroToZeroPowerError,
} from '../../../errors';
import { isEven } from '../../../functions/bigint/bigint';
import { abs, intRootBig } from '../../../functions/bigint/bigint';
import { primeFactorCounts } from '../../../functions/bigint/primeFactor';
import { imagPart, realPart, simplifyImaginary } from '../../../functions/complex';
import { polarPower, toPolarFormArray } from '../../../functions/complex';
import { DEFAULT_SERIES_GUARD_DIGITS, piPower } from '../../../functions/decimal';
import { Settings } from '../../../Settings';
import { Expression } from '../../expression/Expression';
import { minusOne, one, two, zero } from '../../expression/shortcuts';
import { stripPower } from '../../expression/utils';
import { Rational } from '../../rational/Rational';

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
		throw new ZeroToZeroPowerError(message('undefinedExpression', { expression: '0^0' }));
	}

	// 0^(-n) is 1/0^n, so a negative numeric exponent divides by zero. A symbolic
	// exponent has an unknown sign and is left to the rules below.
	if (a.isZero() && b.isNUM() && b.getMultiplier().isNegative()) {
		throw new DivisionByZeroError(message('divisionByZero'));
	}

	if (Settings.DEFER_SIMPLIFICATION) {
		retval = a.copy();
		// Convert it to an EXP
		retval = Expression.toEXP(retval, b.copy());
		retval.deferred = true;
	} else {
		// Simplify powers of i immediately
		if (a.isI() && b.isInteger()) {
			retval = simplifyImaginary(setPower(a, b));
		}
		// Principal powers of ±i reuse the exact principal logarithm.
		else if (
			!Settings.EVALUATE &&
			a.isVAR() &&
			a.isI() &&
			a.getPower().isOne() &&
			a.getMultiplier().abs().isOne() &&
			b.isComplex()
		) {
			retval = power(Expression.E(), multiply(b, log(a)));
		}
		// c^(±Inf + i*y) = c^(±Inf) * c^(i*y) for a real base c and finite y. Toward
		// infinite size it is infinite in the direction c^(i*y), so e^(Inf+pi*i) = -Inf;
		// toward zero size it is 0. A base whose size isn't established stays symbolic.
		else if (
			b.isSum() &&
			b.isComplex() &&
			!a.isComplex() &&
			b.elementsArray().some(element => element.isInf())
		) {
			const real = b.realPart();
			const imaginary = b.imagPart();
			const above = a.gt(one());
			const below = !above && a.gt(zero()) && a.lt(one());
			if (real.isInf() && !imaginary.isInfinite() && (above || below)) {
				retval =
					above === real.isPosInf()
						? power(a, imaginary.times(Expression.Img())).times(Expression.Inf())
						: zero();
			}
		}
		// Handle e^(i*pi)
		else if (a.isE() && b.isComplex()) {
			const p = b.copy();
			const m = p.getMultiplier();
			delete p.multiplier;
			if (equal(p, `${Expression.imaginary}*${PI[0]}`)) {
				if (m.isInteger()) {
					const sgn = Expression.Number(m.evenNumerator() ? '1' : '-1');
					retval = multiply(Expression.fromRational(a.getMultiplier()), sgn);
				} else if (m.denominator.toString() === '2') {
					// e^(k*i*pi/2) = i^k, which is i when k is 1 modulo 4 and -i when it is 3.
					const sgn = Expression.Number(m.abs().numerator % 4n === 1n ? '1' : '-1');
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
					const m = base.getMultiplier();
					const p = exponent.getMultiplier();
					// e and pi arrive here as rationals rounded to the working precision. An exact
					// power would multiply that rounding error by the exponent, so compute them
					// from the constants instead.
					if (m.eqE()) {
						retval = Expression.Number(Decimal.exp(p.toDecimal()));
					} else if (m.eqPi()) {
						retval = Expression.Number(piPower(p.toDecimal()));
					} else {
						// An exact power with more than MAX_NUMBER_DIGITS digits can't be represented
						// (decimal digits are about 3.32 bits each)
						if (p.isInteger()) {
							const bits = BigInt(m.numerator.toString(2).length - 1) + BigInt(m.denominator.toString(2).length - 1);
							if (bits * p.numerator > (BigInt(Settings.MAX_NUMBER_DIGITS) * 332n) / 100n) {
								throw new UnsupportedOperationError(message('resultOutOfRange'));
							}
						}
						retval = Expression.fromRational(m.pow(p));
					}
					// Flip it back if it's inverted.
					if (inverted) {
						retval = retval.invert();
					}
				}
			}
			// Complex results chain several rounded steps (log, exp, cos, sin), and when theta
			// lands near a multiple of pi one component nearly cancels. Compute them with guard
			// digits, then round the result back to the working precision.
			else if (a.isComplex() || b.isComplex()) {
				const precision = Rational.getPrecision();
				// e and pi arrive as rationals rounded to the working precision, so note them
				// before the precision changes and recompute them afterwards.
				const eBase = a.isNUM() && a.getMultiplier().eqE();
				const piBase = a.isNUM() && a.getMultiplier().eqPi();
				Rational.set({ precision: precision + DEFAULT_SERIES_GUARD_DIGITS });
				try {
					if (eBase || piBase) {
						a = Expression.fromRational(eBase ? Rational.E : Rational.PI);
					}
					// Complex numbers e.g. 6+i
					if (a.isComplex()) {
						if (b.isComplex()) {
							const [r, theta] = toPolarFormArray(a);
							const re = realPart(b);
							const im = imagPart(b);
							const q = re.times(theta).plus(im.times(log(r)));
							retval = power(r, re)
								.times(Expression.E().pow(im.neg().times(theta)))
								.times(cos(q).plus(Expression.Img().times(sin(q))));
						} else {
							const [r, theta] = polarPower(a.distributeMultiplier(), b);
							retval = r
								.times(cos(theta))
								.plus(r.times(Expression.Img().times(sin(theta))));
						}
					}
					// Complex power e.g. e^(i+2)
					// For the expression in the form c*n^(re+im*i) apply the formula
					// c*n^re*cos(log(n^im))+c*n^re*sin(log(n^im))*i
					else {
						const n = a.pow(b.realPart());
						const imaginary = b.imagPart();
						const theta =
							a.isE() ||
							(a.isNUM() && a.getMultiplier().eqE() && !imaginary.isNUM())
								? imaginary
								: log(a.pow(imaginary));
						retval = n
							.times(cos(theta))
							.plus(n.times(sin(theta)).times(Expression.Img()));
					}
				} finally {
					Rational.set({ precision });
				}
				retval = numeric(retval);
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
				retval = a.copy();
			} else if (a.isInf() || bIsInf) {
				const aIsInf = a.isInf();

				if (aIsInf && bIsInf) {
					throw new UndefinedError(
						message('undefinedExpression', { expression: 'Infinity^Infinity' })
					);
				}

				if (bIsInf) {
					// c^(±Inf) for a real base c. A base above one grows without bound toward
					// +Inf and vanishes toward -Inf; a base between zero and one does the
					// reverse. A base whose size isn't established, such as an unrestricted x,
					// stays symbolic.
					const real = !a.isComplex();
					const above = real && a.gt(one());
					const below = real && !above && a.gt(zero()) && a.lt(one());
					if (above || below) {
						retval = above === b.isPosInf() ? Expression.Inf() : zero();
					} else if (a.isZero() && b.isPosInf()) {
						retval = zero();
					} else if (a.isNUM()) {
						// 1^Inf, 0^-Inf and a negative base have no limit.
						const m = a.getMultiplier();
						throw new UndefinedError(
							message('undefinedExpression', {
								expression: `${m.lt('0') ? `(${a})` : `${a}`}^Infinity`,
							})
						);
					}
				} else if (b.isZero()) {
					throw new UndefinedError(
						message('undefinedExpression', { expression: 'Infinity^0' })
					);
				} else if (b.isNUM()) {
					// (±Inf)^p for a number p. A negative power vanishes. A positive power of +Inf
					// is +Inf, and of -Inf is (-1)^p*Inf on the principal branch: ±Inf for an
					// integer p, and infinite in the direction of (-1)^p otherwise, e.g. i*Inf.
					const p = b.getMultiplier();
					if (p.isNegative()) {
						retval = zero();
					} else if (a.isPosInf()) {
						retval = Expression.Inf();
					} else if (b.isInteger()) {
						retval = p.numerator % 2n === 0n ? Expression.Inf() : Expression.NegInf();
					} else {
						retval = power(minusOne(), b).times(Expression.Inf());
					}
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
					if (!element.isComplex() && element.gt(zero())) {
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
						retval = a.copy();
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
					// x^(pow/root) has log2(x) * pow / root bits. Check that before computing the power:
					// for 2^(10^20) the power itself exhausts memory. The result is held to
					// MAX_NUMBER_DIGITS digits like a decimal result (decimal digits are about 3.32 bits
					// each). A b-bit x has b - 1 to b bits of log2, close enough unless x is small, as
					// for 3^300000, so a small x uses its exact log2.
					const maxBits = Settings.MAX_NUMBER_DIGITS * Math.log2(10) * Number(root);
					const fits = [m.numerator, m.denominator].every(x => {
						const bits =
							x < 1n << 53n ? Math.log2(Number(x)) : x.toString(2).length - 1;
						return bits * Number(pow) <= maxBits;
					});

					// Raise it to the power and then pull the roots. This will be wrapped in Expressions
					// If the number is too large it stays as a symbolic power
					if (fits) {
						// For a root, factor the base and scale the counts instead of factoring its
						// power, which has pow times the digits and is far harder to factor.
						const [num, den] = [m.numerator, m.denominator].map(x => {
							let retval: Expression;
							if (root === 1n) {
								retval = nthPow(x ** pow, root);
							} else {
								const counts = primeFactorCounts(
									x,
									Settings.MAX_RADICAL_FACTOR_STEPS
								);
								for (const factor in counts) {
									counts[factor] *= pow;
								}
								retval = nthPow(counts, root);
							}
							return retval;
						});
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
						// The power is not rationalized: (-a)^(-1/2) as (-a)^(1/2)/(-a) would no longer
						// cancel against (-a)^(1/2).
						if (root !== 1n && !a.isNUM() && a.getMultiplier().isNegative()) {
							retval = Expression.toEXP(a.copy(), b);
							retval = retval.times(c);
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
								if (a.sign() === -1 && !evenPow && b.isInteger()) {
									// An odd integer power keeps the sign: (-u)^n = -(u^n). Raise the
									// positive part, combining any inner power, as in (-x^2)^3 = -x^6.
									// The coefficient has already been raised into c.
									retval = power(retval, b).neg();
								} else if (a.sign() === -1 && !evenPow) {
									retval = retval.neg();
									if (!retval.isMinusOne()) {
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
											b.isInteger() ||
											innerPower.isOne() ||
											innerMagnitude.lt('1');

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
												// The abs is redundant for even integer powers. For a fraction such
												// as 2/3, |a|^(2/3) isn't a^(2/3) when a is negative.
												if (retval.isFunction(ABS)) {
													if (
														p.isInteger() &&
														isEven(p.getMultiplier().numerator)
													) {
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
			} else if (
				a.isEXP() &&
				!b.isComplex() &&
				!a.getPower().isComplex() &&
				a.getMultiplier().isOne() &&
				!a.getBase().isComplex() &&
				a.getBase().gt(zero())
			) {
				// For positive real bases and real exponents, nested powers combine.
				retval = power(a.getBase(), multiply(a.getPower(), b));
			} else {
				const p = a.getPower();
				const pow = b.times(p);

				if (p.isNUM() && !pow.isNUM()) {
					const m = a.getMultiplier();
					const absPower = p.getMultiplier().abs();
					const base = stripPower(a.toUnitMultiplier());

					// An even integer power of a real expression is nonnegative, so it can
					// be represented through abs() before applying a symbolic outer power.
					if (!m.isNegative() && p.isInteger() && p.isEven() && !base.isComplex()) {
						retval = expressionAbs(base);
						retval = Expression.toEXP(retval, pow);
						if (!m.isOne()) {
							retval = retval.times(Expression.toEXP(Expression.fromRational(m), b));
						}
					}
					// A real inner power with magnitude below one stays inside the
					// principal argument range, so roots can still combine with a
					// symbolic outer power. Power one is the trivial safe case.
					else if (!m.isNegative() && (p.isOne() || absPower.lt('1'))) {
						retval = Expression.toEXP(base, pow);
						if (!m.isOne()) {
							retval = retval.times(Expression.toEXP(Expression.fromRational(m), b));
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
	} else if (b.isNUM() && !a.isEXP() && (b.isInteger() || !a.getMultiplier().isNegative())) {
		// A negative multiplier only leaves for an integer power, since (-1)^n is exact; for
		// a noninteger power it stays in the base below, as (-a*b)^(1/2) is not i*(a*b)^(1/2)
		// on every branch.
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
			a.getBase().gt(zero()) &&
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
		retval = x.getArguments()[0].copy();
		// The the power. Pass in true to get it as a Expression
		const pow = x.getPower();
		// set the power
		retval = setPower(retval, pow.div(two()));
		// Put back the multiplier
		retval.multiplier = x.getMultiplier().copy();
	} else {
		retval = x.copy();
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
		retval = x.copy();
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
		// Factoring is bounded, since a large number with big prime factors could take hours.
		// A part that resists stays whole, so check whether it is itself a perfect power.
		const factorCounts =
			typeof x === 'bigint' ? primeFactorCounts(x, Settings.MAX_RADICAL_FACTOR_STEPS) : x;

		for (const factor in factorCounts) {
			let count = factorCounts[factor];
			let f = BigInt(factor);
			const base = intRootBig(f, root);
			if (base > 1n && base ** root === f) {
				f = base;
				count *= root;
			}
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
