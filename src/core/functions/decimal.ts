import Decimal from 'decimal.js';

import { Complex } from '../classes/complex/Complex';
import { message } from '../errors';
import { precisionBlock } from '../Settings';

import { factorial } from './bigint/bigint';

import type { DecimalType } from '../classes/parser/types';

/*
 * TODO: Currently only up to a 100 digits. This will need to be calculated in the future.
 */
export const EULER_GAMMA: Decimal = new Decimal(
	'0.5772156649015328606065120900824024310421593359399235988057672348848677267776646709369470632917467495'
);

export const DEFAULT_SERIES_GUARD_DIGITS = 8;
const MIN_PRECISION_SERIES_ITERATIONS = 1000;
const SERIES_ITERATIONS_PER_PRECISION_DIGIT = 8;
const DECIMAL_SINC_SERIES_CUTOFF = '1e-8';
const OSCILLATORY_ASYMPTOTIC_CUTOFF = 1e9;
const RATIONAL_APPROXIMATION_CUTOFF = 4;
const ASYMPTOTIC_APPROXIMATION_CUTOFF = 8;
/** erf/erfc switch from the power series to the erfc continued fraction at this |x|. */
const ERFC_FRACTION_CUTOFF = 3;
/** Digits 1 - erf(x) can lose below ERFC_FRACTION_CUTOFF: -log10(erfc(3)) ≈ 4.66. Recompute if the cutoff changes. */
const ERFC_CANCELLATION_DIGITS = 5;
const EXPONENTIAL_ASYMPTOTIC_CUTOFF = 40;
const SERIES_MAX_ITERATIONS = 200;
const ASYMPTOTIC_MAX_TERMS = 100;
const POWER_SERIES_MAX_TERMS = 500;

function getSeriesError(guardDigits = DEFAULT_SERIES_GUARD_DIGITS): Decimal {
	return new Decimal(10).pow(-(Decimal.precision + guardDigits));
}

function gammaSpouge(x: Decimal): Decimal {
	const precision = Decimal.precision;
	return precisionBlock(Math.floor(precision * 1.45), () => {
		const n = precision;
		const coeffs = calcCoeffs(n);
		let accm = coeffs[0];
		for (let k = 1; k < n; k++) {
			accm = accm.plus(coeffs[k].div(x.plus(k)));
		}
		accm = accm.times(Decimal.exp(x.plus(n).neg())).times(Decimal.pow(x.plus(n), x.plus(0.5)));
		return accm.div(x);
	});
}

/**
 * Evaluates erfc(x) for x >= ERFC_FRACTION_CUTOFF by the continued fraction
 * erfc(x) = e^(-x^2)/sqrt(pi) * 1/(x + (1/2)/(x + 1/(x + (3/2)/(x + ...)))),
 * using the modified Lentz algorithm. Unlike 1 - erf(x), it keeps full relative
 * precision when the result is tiny.
 */
function erfcFraction(x: Decimal): Decimal {
	const precision = Decimal.precision;
	const retval = precisionBlock(precision + DEFAULT_SERIES_GUARD_DIGITS, () => {
		const tolerance = getSeriesError();
		const tiny = new Decimal(10).pow(-2 * Decimal.precision);
		const maxIterations = Math.max(MIN_PRECISION_SERIES_ITERATIONS, precision * SERIES_ITERATIONS_PER_PRECISION_DIGIT);
		let f = x;
		let c = x;
		let d = new Decimal(0);
		for (let n = 1; n <= maxIterations; n++) {
			const a = new Decimal(n).div(2);
			d = x.plus(a.times(d));
			if (d.isZero()) {
				d = tiny;
			}
			c = x.plus(a.div(c));
			if (c.isZero()) {
				c = tiny;
			}
			d = new Decimal(1).div(d);
			const delta = c.times(d);
			f = f.times(delta);
			if (delta.minus(1).abs().lt(tolerance)) {
				break;
			}
			if (n === maxIterations) {
				throw new Error(message('erfConvergenceFailed'));
			}
		}
		return x.times(x).neg().exp().div(Decimal.acos(-1).sqrt().times(f));
	});
	return retval.toSignificantDigits(precision);
}

/**
 * Computes the error function erf(x).
 *
 * Below ERFC_FRACTION_CUTOFF this is the power series shared with erfComplex. Above it,
 * the series loses too many digits to cancellation, so erf(x) = 1 - erfc(x) is used.
 */
export function erf(x: DecimalType): Decimal {
	const d: Decimal = new Decimal(x);
	if (d.isZero()) {
		return new Decimal(0);
	}
	if (d.isNeg()) {
		return erf(d.neg()).neg();
	}
	if (d.lt(ERFC_FRACTION_CUTOFF)) {
		return erfComplex(new Complex(d)).re.toSignificantDigits(Decimal.precision);
	}
	return new Decimal(1).minus(erfcFraction(d));
}

/**
 * Computes the complementary error function erfc(x) = 1 - erf(x), keeping full relative
 * precision when the result is tiny.
 */
export function erfc(x: DecimalType): Decimal {
	const d: Decimal = new Decimal(x);
	if (d.isNeg()) {
		return new Decimal(2).minus(erfc(d.neg()));
	}
	if (d.gte(ERFC_FRACTION_CUTOFF)) {
		return erfcFraction(d);
	}
	// 1 - erf(x) cancels up to ERFC_CANCELLATION_DIGITS here, so compute erf with that many more.
	const precision = Decimal.precision;
	const retval = precisionBlock(precision + ERFC_CANCELLATION_DIGITS + DEFAULT_SERIES_GUARD_DIGITS, () => {
		return new Decimal(1).minus(erf(d));
	});
	return retval.toSignificantDigits(precision);
}

/**
 * Evaluates erf(z) by its entire power series, with guard digits for cancellation.
 * This path is used for finite complex arguments of moderate magnitude.
 */
export function erfComplex(z: Complex): Complex {
	const precision = Decimal.precision;
	const magnitudeSquared = z.absSquared();
	// High powers in the alternating series can cancel substantially.
	const guardDigits = Math.ceil(magnitudeSquared.toNumber() / Math.LN10) + 12;
	const retval = precisionBlock(precision + guardDigits, () => {
		const zSquared = z.times(z);
		const scale = new Decimal(2).div(Decimal.acos(-1).sqrt());
		const tolerance = new Decimal(10).pow(-(precision + guardDigits - 4));
		let term = z;
		let sum = z;
		const maxIterations = Math.max(100, Math.ceil(magnitudeSquared.toNumber() * 4) + precision * 4);
		for (let n = 1; n <= maxIterations; n++) {
			term = term.times(zSquared).scale(new Decimal(-1).div(n));
			const delta = term.scale(new Decimal(1).div(2 * n + 1));
			sum = sum.plus(delta);
			if (delta.abs().lte(tolerance.times(Decimal.max(1, sum.abs())))) {
				break;
			}
			if (n === maxIterations) {
				throw new Error(message('erfConvergenceFailed'));
			}
		}
		return sum.scale(scale);
	});
	return new Complex(new Decimal(retval.re), new Decimal(retval.im));
}

// The Spouge coefficients depend only on n and the working precision, and computing
// them is most of the cost of gamma, so keep the most recent set.
let spougeCache: { key: string; coeffs: Decimal[] } | undefined;

function calcCoeffs(n: number) {
	const key = `${n}:${Decimal.precision}:${Decimal.rounding}`;
	if (spougeCache?.key === key) {
		return spougeCache.coeffs;
	}
	const c: Decimal[] = [];
	let kFact = new Decimal(1);
	// Get pi
	const pi = Decimal.acos(-1);
	// sqrt(2*pi);
	c[0] = pi.times(2).sqrt();
	for (let k = 1; k < n; k++) {
		c[k] = Decimal.exp(n - k)
			.times(Decimal.pow(n - k, k - 0.5))
			.div(kFact);
		kFact = kFact.times(-k);
	}

	spougeCache = { key, coeffs: c };
	return c;
}
// https://math.stackexchange.com/questions/2204020/definition-of-the-gamma-function-for-non-integer-negative-values
/**
 * The gamma function using Spouge approximation.
 * This function is slow converging but appropriate for arbitrary precision. It relies on Decimal.js.
 *
 * Ported from: https://rosettacode.org/wiki/Gamma_function#C++ (the implementation)
 * https://math.stackexchange.com/questions/2204020/definition-of-the-gamma-function-for-non-integer-negative-values (negative gamma)
 * https://en.wikipedia.org/wiki/Spouge%27s_approximation (Spouge's Approximation)
 *
 * @param n The number of elements to be calculated in the coefficient array
 * @param x The number being evaluated
 * @returns
 */
export function gamma(x: DecimalType) {
	x = new Decimal(x);

	if (x.isInteger()) {
		if (x.lte(0)) {
			return new Decimal(Infinity);
		}
		return new Decimal(String(factorial(Number(x.minus(1)))));
	}

	if (x.lt(0)) {
		const pi = Decimal.acos(-1);
		return pi.div(
			pi
				.times(x)
				.sin()
				.times(gammaSpouge(new Decimal(1).minus(x)))
		);
	}

	return gammaSpouge(x);
}

/**
 * Spouge approximation for complex arguments. The coefficients and working
 * precision follow the existing real gamma implementation.
 *
 * https://en.wikipedia.org/wiki/Spouge%27s_approximation
 */
export function gammaComplex(z: Complex): Complex {
	const precision = Decimal.precision;
	return precisionBlock(Math.floor(precision * 1.45), () => {
		const one = new Complex(1);
		const pi = Decimal.acos(-1);
		// Reflection avoids evaluating the approximation near negative poles.
		if (z.re.lt('0.5')) {
			const piZ = z.scale(pi);
			const sinPiZ = new Complex(
				piZ.re.sin().times(piZ.im.cosh()),
				piZ.re.cos().times(piZ.im.sinh())
			);
			return new Complex(pi).div(sinPiZ.times(gammaComplex(one.minus(z))));
		}

		const n = precision;
		const coefficients = calcCoeffs(n);
		let sum = new Complex(coefficients[0]);
		for (let k = 1; k < n; k++) {
			sum = sum.plus(new Complex(coefficients[k]).div(z.plus(new Complex(k))));
		}
		const shifted = z.plus(new Complex(n));
		return shifted.pow(z.plus(new Complex(0.5)))
			.times(shifted.neg().exp())
			.times(sum)
			.div(z);
	});
}

/**
 * Computes pi^x at the configured precision.
 *
 * Raising a rounded pi to x multiplies its rounding error by |x|, so pi is computed with
 * about log10|x| extra digits first (the digit count of |x|'s integer part, plus guard digits).
 */
export function piPower(x: DecimalType): Decimal {
	const d: Decimal = new Decimal(x);
	const precision = Decimal.precision;
	const extraDigits = d.abs().trunc().toFixed().length + DEFAULT_SERIES_GUARD_DIGITS;
	const retval = precisionBlock(precision + extraDigits, () => {
		return Decimal.acos(-1).pow(d);
	});
	return retval.toSignificantDigits(precision);
}

export function sinc(x: DecimalType): Decimal {
	const d: Decimal = new Decimal(x);
	if (d.isZero()) {
		return new Decimal(1);
	}
	const ax: Decimal = d.abs();
	if (ax.lt(DECIMAL_SINC_SERIES_CUTOFF)) {
		const x2: Decimal = d.times(d);
		return new Decimal(1)
			.minus(x2.div(6))
			.plus(x2.times(x2).div(120))
			.minus(x2.times(x2).times(x2).div(5040));
	}
	return d.sin().div(d);
}

/**
 * The |x| above which e^(-2|x|) is below the working precision, so sinh, cosh and tanh
 * follow from e^|x| alone. decimal.js's own sinh/cosh/tanh don't return for large |x|
 * (from about 1e6), while its exp does.
 */
function hyperbolicCutoff(): Decimal {
	return new Decimal(Decimal.precision + DEFAULT_SERIES_GUARD_DIGITS)
		.times(Decimal.ln(10))
		.div(2);
}

export function sinh(x: DecimalType): Decimal {
	const d: Decimal = new Decimal(x);
	if (d.abs().gt(hyperbolicCutoff())) {
		const half: Decimal = d.abs().exp().div(2);
		return d.isNeg() ? half.neg() : half;
	}
	return d.sinh();
}

export function cosh(x: DecimalType): Decimal {
	const d: Decimal = new Decimal(x);
	if (d.abs().gt(hyperbolicCutoff())) {
		return d.abs().exp().div(2);
	}
	return d.cosh();
}

export function tanh(x: DecimalType): Decimal {
	const d: Decimal = new Decimal(x);
	if (d.abs().gt(hyperbolicCutoff())) {
		return new Decimal(d.isNeg() ? -1 : 1);
	}
	return d.tanh();
}

export function Si(x: DecimalType): Decimal {
	let d: Decimal = new Decimal(x);
	if (d.isZero()) {
		return new Decimal(0);
	}
	let sign: Decimal = new Decimal(1);
	if (d.isNeg()) {
		sign = new Decimal(-1);
		d = d.neg();
	}
	function polevl(y: Decimal, coef: Decimal[]): Decimal {
		let ans: Decimal = coef[0];
		for (let i = 1; i < coef.length; i++) {
			ans = ans.times(y).plus(coef[i]);
		}
		return ans;
	}
	function p1evl(y: Decimal, coef: Decimal[]): Decimal {
		let ans: Decimal = y.plus(coef[0]);
		for (let i = 1; i < coef.length; i++) {
			ans = ans.times(y).plus(coef[i]);
		}
		return ans;
	}
	if (d.gt(OSCILLATORY_ASYMPTOTIC_CUTOFF)) {
		const halfPi: Decimal = Decimal.acos(-1).div(2);
		return sign.times(halfPi.minus(d.cos().div(d)));
	}
	if (d.lte(RATIONAL_APPROXIMATION_CUTOFF)) {
		const SN: Decimal[] = [
			new Decimal('-8.39167827910303881427e-11'),
			new Decimal('4.62591714427012837309e-8'),
			new Decimal('-9.75759303843632795789e-6'),
			new Decimal('9.76945438170435310816e-4'),
			new Decimal('-4.13470316229406538752e-2'),
			new Decimal('1.00000000000000000302'),
		];
		const SD: Decimal[] = [
			new Decimal('2.03269266195951942049e-12'),
			new Decimal('1.27997891179943299903e-9'),
			new Decimal('4.41827842801218905784e-7'),
			new Decimal('9.96412122043875552487e-5'),
			new Decimal('1.42085239326149893930e-2'),
			new Decimal('9.99999999999999996984e-1'),
		];
		const z: Decimal = d.times(d);
		const s: Decimal = d.times(polevl(z, SN)).div(polevl(z, SD));
		return sign.times(s);
	}
	const s: Decimal = d.sin();
	const c: Decimal = d.cos();
	const z: Decimal = new Decimal(1).div(d.times(d));
	let f: Decimal;
	let g: Decimal;
	if (d.lt(ASYMPTOTIC_APPROXIMATION_CUTOFF)) {
		const FN4: Decimal[] = [
			new Decimal('4.23612862892216586994'),
			new Decimal('5.45937717161812843388'),
			new Decimal('1.62083287701538329132'),
			new Decimal('1.67006611831323023771e-1'),
			new Decimal('6.81020132472518137426e-3'),
			new Decimal('1.08936580650328664411e-4'),
			new Decimal('5.48900223421373614008e-7'),
		];
		const FD4: Decimal[] = [
			new Decimal('8.16496634205391016773'),
			new Decimal('7.30828822505564552187'),
			new Decimal('1.86792257950184183883'),
			new Decimal('1.78792052963149907262e-1'),
			new Decimal('7.01710668322789753610e-3'),
			new Decimal('1.10034357153915731354e-4'),
			new Decimal('5.48900252756255700982e-7'),
		];
		const GN4: Decimal[] = [
			new Decimal('8.71001698973114191777e-2'),
			new Decimal('6.11379109952219284151e-1'),
			new Decimal('3.97180296392337498885e-1'),
			new Decimal('7.48527737628469092119e-2'),
			new Decimal('5.38868681462177273157e-3'),
			new Decimal('1.61999794598934024525e-4'),
			new Decimal('1.97963874140963632189e-6'),
			new Decimal('7.82579040744090311069e-9'),
		];
		const GD4: Decimal[] = [
			new Decimal('1.64402202413355338886'),
			new Decimal('6.66296701268987968381e-1'),
			new Decimal('9.88771761277688796203e-2'),
			new Decimal('6.22396345441768420760e-3'),
			new Decimal('1.73221081474177119497e-4'),
			new Decimal('2.02659182086343991969e-6'),
			new Decimal('7.82579218933534490868e-9'),
		];
		f = polevl(z, FN4).div(d.times(p1evl(z, FD4)));
		g = z.times(polevl(z, GN4)).div(p1evl(z, GD4));
	} else {
		const FN8: Decimal[] = [
			new Decimal('4.55880873470465315206e-1'),
			new Decimal('7.13715274100146711374e-1'),
			new Decimal('1.60300158222319456320e-1'),
			new Decimal('1.16064229408124407915e-2'),
			new Decimal('3.49556442447859055605e-4'),
			new Decimal('4.86215430826454749482e-6'),
			new Decimal('3.20092790091004902806e-8'),
			new Decimal('9.41779576128512936592e-11'),
			new Decimal('9.70507110881952024631e-14'),
		];
		const FD8: Decimal[] = [
			new Decimal('9.17463611873684053703e-1'),
			new Decimal('1.78685545332074536321e-1'),
			new Decimal('1.22253594771971293032e-2'),
			new Decimal('3.58696481881851580297e-4'),
			new Decimal('4.92435064317881464393e-6'),
			new Decimal('3.21956939101046018377e-8'),
			new Decimal('9.43720590350276732376e-11'),
			new Decimal('9.70507110881952025725e-14'),
		];
		const GN8: Decimal[] = [
			new Decimal('6.97359953443276214934e-1'),
			new Decimal('3.30410979305632063225e-1'),
			new Decimal('3.84878767649974295920e-2'),
			new Decimal('1.71718239052347903558e-3'),
			new Decimal('3.48941165502279436777e-5'),
			new Decimal('3.47131167084116673800e-7'),
			new Decimal('1.70404452782044526189e-9'),
			new Decimal('3.85945925430276600453e-12'),
			new Decimal('3.14040098946363334640e-15'),
		];
		const GD8: Decimal[] = [
			new Decimal('1.68548898811011640017'),
			new Decimal('4.87852258695304967486e-1'),
			new Decimal('4.67913194259625806320e-2'),
			new Decimal('1.90284426674399523638e-3'),
			new Decimal('3.68475504442561108162e-5'),
			new Decimal('3.57043223443740838771e-7'),
			new Decimal('1.72693748966316146736e-9'),
			new Decimal('3.87830166023954706752e-12'),
			new Decimal('3.14040098946363335242e-15'),
		];
		f = polevl(z, FN8).div(d.times(p1evl(z, FD8)));
		g = z.times(polevl(z, GN8)).div(p1evl(z, GD8));
	}
	const halfPi: Decimal = Decimal.acos(-1).div(2);
	return sign.times(halfPi.minus(f.times(c)).minus(g.times(s)));
}

export function Shi(x: DecimalType): Decimal {
	const d: Decimal = new Decimal(x);
	if (d.isZero()) {
		return new Decimal(0);
	}
	const sign: Decimal = d.isNeg() ? new Decimal(-1) : new Decimal(1);
	const ax: Decimal = d.abs();
	if (ax.lt(ASYMPTOTIC_APPROXIMATION_CUTOFF)) {
		let term: Decimal = ax;
		let sum: Decimal = term;
		let n: number = 0;
		for (let iter = 0; iter < SERIES_MAX_ITERATIONS; iter++) {
			const a: number = 2 * n + 1;
			term = term
				.times(ax)
				.times(ax)
				.times(a)
				.div(new Decimal(a + 2).times(a + 2).times(a + 1));
			sum = sum.plus(term);
			n++;
			if (term.abs().lt(getSeriesError())) {
				break;
			}
		}
		return sign.times(sum);
	}
	function EiLocal(y: Decimal): Decimal {
		if (y.isZero()) {
			return new Decimal(-Infinity);
		}
		if (y.gt(EXPONENTIAL_ASYMPTOTIC_CUTOFF) || y.lt(-EXPONENTIAL_ASYMPTOTIC_CUTOFF)) {
			let term: Decimal = new Decimal(1);
			let sum: Decimal = new Decimal(1);
			let best: Decimal = term.abs();
			for (let n = 1; n < ASYMPTOTIC_MAX_TERMS; n++) {
				term = term.times(n).div(y);
				const at: Decimal = term.abs();
				if (at.gt(best)) {
					break;
				}
				best = at;
				sum = sum.plus(term);
				if (at.lt(getSeriesError())) {
					break;
				}
			}
			return y.exp().times(sum).div(y);
		}
		let term: Decimal = y;
		let sum: Decimal = term;
		for (let k = 1; k < POWER_SERIES_MAX_TERMS; k++) {
			term = term
				.times(y)
				.times(k)
				.div(new Decimal(k + 1).times(k + 1));
			sum = sum.plus(term);
			if (term.abs().lt(getSeriesError())) {
				break;
			}
		}
		return EULER_GAMMA.plus(y.abs().ln()).plus(sum);
	}
	return EiLocal(d).minus(EiLocal(d.neg())).div(2);
}

export function Ci(x: DecimalType): Decimal {
	let d: Decimal = new Decimal(x);
	if (d.isZero()) {
		return new Decimal(-Infinity);
	}
	if (d.isNeg()) {
		d = d.neg();
	}
	function polevl(y: Decimal, coef: Decimal[]): Decimal {
		let ans: Decimal = coef[0];
		for (let i = 1; i < coef.length; i++) {
			ans = ans.times(y).plus(coef[i]);
		}
		return ans;
	}
	function p1evl(y: Decimal, coef: Decimal[]): Decimal {
		let ans: Decimal = y.plus(coef[0]);
		for (let i = 1; i < coef.length; i++) {
			ans = ans.times(y).plus(coef[i]);
		}
		return ans;
	}
	if (d.gt(OSCILLATORY_ASYMPTOTIC_CUTOFF)) {
		return d.sin().div(d);
	}
	if (d.lte(RATIONAL_APPROXIMATION_CUTOFF)) {
		const CN: Decimal[] = [
			new Decimal('2.02524002389102268789e-11'),
			new Decimal('-1.35249504915790756375e-8'),
			new Decimal('3.59325051419993077021e-6'),
			new Decimal('-4.74007206873407909465e-4'),
			new Decimal('2.89159652607555242092e-2'),
			new Decimal('-1.00000000000000000080'),
		];
		const CD: Decimal[] = [
			new Decimal('4.07746040061880559506e-12'),
			new Decimal('3.06780997581887812692e-9'),
			new Decimal('1.23210355685883423679e-6'),
			new Decimal('3.17442024775032769882e-4'),
			new Decimal('5.10028056236446052392e-2'),
			new Decimal('4.00000000000000000080'),
		];
		const z: Decimal = d.times(d);
		const c0: Decimal = z.times(polevl(z, CN)).div(polevl(z, CD));
		return EULER_GAMMA.plus(d.ln()).plus(c0);
	}
	const s: Decimal = d.sin();
	const c: Decimal = d.cos();
	const z: Decimal = new Decimal(1).div(d.times(d));
	let f: Decimal;
	let g: Decimal;
	if (d.lt(ASYMPTOTIC_APPROXIMATION_CUTOFF)) {
		const FN4: Decimal[] = [
			new Decimal('4.23612862892216586994'),
			new Decimal('5.45937717161812843388'),
			new Decimal('1.62083287701538329132'),
			new Decimal('1.67006611831323023771e-1'),
			new Decimal('6.81020132472518137426e-3'),
			new Decimal('1.08936580650328664411e-4'),
			new Decimal('5.48900223421373614008e-7'),
		];
		const FD4: Decimal[] = [
			new Decimal('8.16496634205391016773'),
			new Decimal('7.30828822505564552187'),
			new Decimal('1.86792257950184183883'),
			new Decimal('1.78792052963149907262e-1'),
			new Decimal('7.01710668322789753610e-3'),
			new Decimal('1.10034357153915731354e-4'),
			new Decimal('5.48900252756255700982e-7'),
		];
		const GN4: Decimal[] = [
			new Decimal('8.71001698973114191777e-2'),
			new Decimal('6.11379109952219284151e-1'),
			new Decimal('3.97180296392337498885e-1'),
			new Decimal('7.48527737628469092119e-2'),
			new Decimal('5.38868681462177273157e-3'),
			new Decimal('1.61999794598934024525e-4'),
			new Decimal('1.97963874140963632189e-6'),
			new Decimal('7.82579040744090311069e-9'),
		];
		const GD4: Decimal[] = [
			new Decimal('1.64402202413355338886'),
			new Decimal('6.66296701268987968381e-1'),
			new Decimal('9.88771761277688796203e-2'),
			new Decimal('6.22396345441768420760e-3'),
			new Decimal('1.73221081474177119497e-4'),
			new Decimal('2.02659182086343991969e-6'),
			new Decimal('7.82579218933534490868e-9'),
		];
		f = polevl(z, FN4).div(d.times(p1evl(z, FD4)));
		g = z.times(polevl(z, GN4)).div(p1evl(z, GD4));
	} else {
		const FN8: Decimal[] = [
			new Decimal('4.55880873470465315206e-1'),
			new Decimal('7.13715274100146711374e-1'),
			new Decimal('1.60300158222319456320e-1'),
			new Decimal('1.16064229408124407915e-2'),
			new Decimal('3.49556442447859055605e-4'),
			new Decimal('4.86215430826454749482e-6'),
			new Decimal('3.20092790091004902806e-8'),
			new Decimal('9.41779576128512936592e-11'),
			new Decimal('9.70507110881952024631e-14'),
		];
		const FD8: Decimal[] = [
			new Decimal('9.17463611873684053703e-1'),
			new Decimal('1.78685545332074536321e-1'),
			new Decimal('1.22253594771971293032e-2'),
			new Decimal('3.58696481881851580297e-4'),
			new Decimal('4.92435064317881464393e-6'),
			new Decimal('3.21956939101046018377e-8'),
			new Decimal('9.43720590350276732376e-11'),
			new Decimal('9.70507110881952025725e-14'),
		];
		const GN8: Decimal[] = [
			new Decimal('6.97359953443276214934e-1'),
			new Decimal('3.30410979305632063225e-1'),
			new Decimal('3.84878767649974295920e-2'),
			new Decimal('1.71718239052347903558e-3'),
			new Decimal('3.48941165502279436777e-5'),
			new Decimal('3.47131167084116673800e-7'),
			new Decimal('1.70404452782044526189e-9'),
			new Decimal('3.85945925430276600453e-12'),
			new Decimal('3.14040098946363334640e-15'),
		];
		const GD8: Decimal[] = [
			new Decimal('1.68548898811011640017'),
			new Decimal('4.87852258695304967486e-1'),
			new Decimal('4.67913194259625806320e-2'),
			new Decimal('1.90284426674399523638e-3'),
			new Decimal('3.68475504442561108162e-5'),
			new Decimal('3.57043223443740838771e-7'),
			new Decimal('1.72693748966316146736e-9'),
			new Decimal('3.87830166023954706752e-12'),
			new Decimal('3.14040098946363335242e-15'),
		];
		f = polevl(z, FN8).div(d.times(p1evl(z, FD8)));
		g = z.times(polevl(z, GN8)).div(p1evl(z, GD8));
	}
	return f.times(s).minus(g.times(c));
}

export function Chi(x: DecimalType): Decimal {
	const d: Decimal = new Decimal(x);
	const ax: Decimal = d.abs();
	if (ax.isZero()) {
		return new Decimal(-Infinity);
	}
	if (ax.lt(ASYMPTOTIC_APPROXIMATION_CUTOFF)) {
		let n: number = 1;
		let term: Decimal = ax.times(ax).div(4);
		let sum: Decimal = term;
		for (let iter = 0; iter < SERIES_MAX_ITERATIONS; iter++) {
			term = term
				.times(ax)
				.times(ax)
				.times(n)
				.div(new Decimal(n + 1).times(2 * n + 1).times(2 * n + 2));
			sum = sum.plus(term);
			n++;
			if (term.abs().lt(getSeriesError())) {
				break;
			}
		}
		return EULER_GAMMA.plus(ax.ln()).plus(sum);
	}
	function EiLocal(y: Decimal): Decimal {
		if (y.isZero()) {
			return new Decimal(-Infinity);
		}
		if (y.gt(EXPONENTIAL_ASYMPTOTIC_CUTOFF) || y.lt(-EXPONENTIAL_ASYMPTOTIC_CUTOFF)) {
			let term: Decimal = new Decimal(1);
			let sum: Decimal = new Decimal(1);
			let best: Decimal = term.abs();
			for (let n = 1; n < ASYMPTOTIC_MAX_TERMS; n++) {
				term = term.times(n).div(y);
				const at: Decimal = term.abs();
				if (at.gt(best)) {
					break;
				}
				best = at;
				sum = sum.plus(term);
				if (at.lt(getSeriesError())) {
					break;
				}
			}
			return y.exp().times(sum).div(y);
		}
		let term: Decimal = y;
		let sum: Decimal = term;
		for (let k = 1; k < POWER_SERIES_MAX_TERMS; k++) {
			term = term
				.times(y)
				.times(k)
				.div(new Decimal(k + 1).times(k + 1));
			sum = sum.plus(term);
			if (term.abs().lt(getSeriesError())) {
				break;
			}
		}
		return EULER_GAMMA.plus(y.abs().ln()).plus(sum);
	}
	return EiLocal(d).plus(EiLocal(d.neg())).div(2);
}

export function Ei(x: DecimalType): Decimal {
	const d: Decimal = new Decimal(x);
	if (d.isZero()) {
		return new Decimal(-Infinity);
	}
	if (d.gt(EXPONENTIAL_ASYMPTOTIC_CUTOFF) || d.lt(-EXPONENTIAL_ASYMPTOTIC_CUTOFF)) {
		let term: Decimal = new Decimal(1);
		let sum: Decimal = new Decimal(1);
		let best: Decimal = term.abs();
		for (let n = 1; n < ASYMPTOTIC_MAX_TERMS; n++) {
			term = term.times(n).div(d);
			const at: Decimal = term.abs();
			if (at.gt(best)) {
				break;
			}
			best = at;
			sum = sum.plus(term);
			if (at.lt(getSeriesError())) {
				break;
			}
		}
		return d.exp().times(sum).div(d);
	}
	let term: Decimal = d;
	let sum: Decimal = term;
	for (let k = 1; k < POWER_SERIES_MAX_TERMS; k++) {
		term = term
			.times(d)
			.times(k)
			.div(new Decimal(k + 1).times(k + 1));
		sum = sum.plus(term);
		if (term.abs().lt(getSeriesError())) {
			break;
		}
	}
	return EULER_GAMMA.plus(d.abs().ln()).plus(sum);
}

/**
 * Complex sine integral from its entire power series.
 * Restricted to moderate arguments by the symbolic caller.
 */
export function SiComplex(z: Complex): Complex {
	const precision = Decimal.precision;
	const retval = precisionBlock(precision + 12, () => {
		const z2 = z.times(z).neg();
		let term = z;
		let sum = z;
		const tolerance = new Decimal(10).pow(-(precision + 8));
		for (let n = 1; n <= 500; n++) {
			const k = 2 * n + 1;
			term = term.times(z2).scale(new Decimal(k - 2).div((k - 1) * k * k));
			sum = sum.plus(term);
			if (term.abs().lte(tolerance)) {
				break;
			}
			if (n === 500) {
				throw new Error(message('convergenceFailed', { iters: '500' }));
			}
		}
		return sum;
	});
	return new Complex(new Decimal(retval.re), new Decimal(retval.im));
}

/**
 * Principal-branch complex cosine integral:
 * Ci(z) = gamma + log(z) + sum((-1)^n z^(2n) / (2n * (2n)!)).
 */
export function CiComplex(z: Complex): Complex {
	const precision = Decimal.precision;
	const retval = precisionBlock(precision + 12, () => {
		const z2 = z.times(z).neg();
		let term = z2.scale(new Decimal(1).div(4));
		let sum = term;
		const tolerance = new Decimal(10).pow(-(precision + 8));
		for (let n = 2; n <= 500; n++) {
			term = term
				.times(z2)
				.scale(new Decimal(2 * n - 2).div((2 * n - 1) * (2 * n) * (2 * n)));
			sum = sum.plus(term);
			if (term.abs().lte(tolerance)) {
				break;
			}
			if (n === 500) {
				throw new Error(message('convergenceFailed', { iters: '500' }));
			}
		}
		return z.log().plus(new Complex(EULER_GAMMA)).plus(sum);
	});
	return new Complex(new Decimal(retval.re), new Decimal(retval.im));
}

/**
 * Principal-branch complex exponential integral:
 * Ei(z) = gamma + log(z) + sum(z^n / (n * n!)).
 */
export function EiComplex(z: Complex): Complex {
	const precision = Decimal.precision;
	const retval = precisionBlock(precision + 12, () => {
		let term = z;
		let sum = z;
		const tolerance = new Decimal(10).pow(-(precision + 8));
		for (let n = 2; n <= 500; n++) {
			term = term.times(z).scale(new Decimal(n - 1).div(n * n));
			sum = sum.plus(term);
			if (term.abs().lte(tolerance)) {
				break;
			}
			if (n === 500) {
				throw new Error(message('convergenceFailed', { iters: '500' }));
			}
		}
		return z.log().plus(new Complex(EULER_GAMMA)).plus(sum);
	});
	return new Complex(new Decimal(retval.re), new Decimal(retval.im));
}

export function Li(x: DecimalType): Decimal {
	const d: Decimal = new Decimal(x);
	if (d.isZero()) {
		return new Decimal(0);
	}
	if (d.lt(0)) {
		return new Decimal(NaN);
	}
	if (d.eq(1)) {
		return new Decimal(-Infinity);
	}
	const y: Decimal = d.ln();
	if (y.isZero()) {
		return new Decimal(-Infinity);
	}
	if (y.gt(EXPONENTIAL_ASYMPTOTIC_CUTOFF) || y.lt(-EXPONENTIAL_ASYMPTOTIC_CUTOFF)) {
		let term: Decimal = new Decimal(1);
		let sum: Decimal = new Decimal(1);
		let best: Decimal = term.abs();
		for (let n = 1; n < ASYMPTOTIC_MAX_TERMS; n++) {
			term = term.times(n).div(y);
			const at: Decimal = term.abs();
			if (at.gt(best)) {
				break;
			}
			best = at;
			sum = sum.plus(term);
			if (at.lt(getSeriesError())) {
				break;
			}
		}
		return y.exp().times(sum).div(y);
	}
	let term: Decimal = y;
	let sum: Decimal = term;
	for (let k = 1; k < POWER_SERIES_MAX_TERMS; k++) {
		term = term
			.times(y)
			.times(k)
			.div(new Decimal(k + 1).times(k + 1));
		sum = sum.plus(term);
		if (term.abs().lt(getSeriesError())) {
			break;
		}
	}
	return EULER_GAMMA.plus(y.abs().ln()).plus(sum);
}
