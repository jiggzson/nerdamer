import Decimal from 'decimal.js';

import { factorial } from './bigint/bigint';

import type { DecimalType } from '../classes/parser/types';

/*
 * TODO: Currently only up to a 100 digits. This will need to be calculated in the future.
 */
export const EULER_GAMMA: Decimal = new Decimal(
	'0.5772156649015328606065120900824024310421593359399235988057672348848677267776646709369470632917467495'
);

function getSeriesError(guardDigits = 8): Decimal {
	return new Decimal(10).pow(-(Decimal.precision + guardDigits));
}

function gammaSpouge(x: Decimal): Decimal {
	const precision = Decimal.precision;
	Decimal.set({ precision: Math.floor(precision * 1.45) });
	try {
		const n = precision;
		const coeffs = calcCoeffs(n);
		let accm = coeffs[0];
		for (let k = 1; k < n; k++) {
			accm = accm.plus(coeffs[k].div(x.plus(k)));
		}
		accm = accm.times(Decimal.exp(x.plus(n).neg())).times(Decimal.pow(x.plus(n), x.plus(0.5)));
		return accm.div(x);
	} finally {
		Decimal.set({ precision });
	}
}

export function erf(x: DecimalType) {
	x = new Decimal(x);
	const pi = Decimal.acos(-1);
	const twoOverSqrtPi = new Decimal(2).div(pi.sqrt());
	const error = getSeriesError();
	const sgn = Decimal.sign(x);
	x = x.abs();

	if (x.isZero()) {
		return new Decimal(0);
	}

	if (x.lt(2)) {
		let sum = new Decimal(0);
		let k = 0;
		let dx = x;
		const max = Math.max(1000, Decimal.precision * 8);
		while (dx.gte(error)) {
			const num = new Decimal(-1).pow(k).times(x.pow(2 * k + 1));
			const den = new Decimal(2 * k + 1).times(String(factorial(k)));
			const result = sum.plus(num.div(den));
			dx = result.minus(sum).abs();
			sum = result;
			k++;
			if (k > max) {
				throw new Error('erf not converging. Exiting!');
			}
		}
		let retval = Decimal.min(twoOverSqrtPi.times(sum), 1);
		if (sgn === -1) {
			retval = retval.neg();
		}
		return retval;
	}

	// Asymptotic expansion of erfc(x) for larger |x|:
	// erfc(x) ~ exp(-x^2)/(sqrt(pi)*x) * (1 - 1/(2x^2) + 3/(4x^4) - 15/(8x^6) + ...)
	const xx = x.mul(x);
	const twoX2 = xx.mul(2);
	let term = new Decimal(1);
	let series = term;
	let best = term.abs();
	const max = Math.max(1000, Decimal.precision * 8);
	for (let n = 1; n < max; n++) {
		term = term.mul(-(2 * n - 1)).div(twoX2);
		const at = term.abs();
		if (at.gt(best)) {
			break;
		}
		best = at;
		series = series.plus(term);
		if (at.lt(error)) {
			break;
		}
	}
	const erfc = x.neg().mul(x).exp().div(pi.sqrt().mul(x)).times(series);
	let retval = new Decimal(1).minus(erfc);
	if (sgn === -1) {
		retval = retval.neg();
	}
	return retval;
}

function calcCoeffs(n: number) {
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

export function sinc(x: DecimalType): Decimal {
	const d: Decimal = new Decimal(x);
	if (d.isZero()) {
		return new Decimal(1);
	}
	const ax: Decimal = d.abs();
	if (ax.lt('1e-8')) {
		const x2: Decimal = d.mul(d);
		return new Decimal(1)
			.minus(x2.div(6))
			.plus(x2.mul(x2).div(120))
			.minus(x2.mul(x2).mul(x2).div(5040));
	}
	return d.sin().div(d);
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
			ans = ans.mul(y).plus(coef[i]);
		}
		return ans;
	}
	function p1evl(y: Decimal, coef: Decimal[]): Decimal {
		let ans: Decimal = y.plus(coef[0]);
		for (let i = 1; i < coef.length; i++) {
			ans = ans.mul(y).plus(coef[i]);
		}
		return ans;
	}
	if (d.gt('1e9')) {
		const halfPi: Decimal = Decimal.acos(-1).div(2);
		return sign.mul(halfPi.minus(d.cos().div(d)));
	}
	if (d.lte(4)) {
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
		const z: Decimal = d.mul(d);
		const s: Decimal = d.mul(polevl(z, SN)).div(polevl(z, SD));
		return sign.mul(s);
	}
	const s: Decimal = d.sin();
	const c: Decimal = d.cos();
	const z: Decimal = new Decimal(1).div(d.mul(d));
	let f: Decimal;
	let g: Decimal;
	if (d.lt(8)) {
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
		f = polevl(z, FN4).div(d.mul(p1evl(z, FD4)));
		g = z.mul(polevl(z, GN4)).div(p1evl(z, GD4));
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
		f = polevl(z, FN8).div(d.mul(p1evl(z, FD8)));
		g = z.mul(polevl(z, GN8)).div(p1evl(z, GD8));
	}
	const halfPi: Decimal = Decimal.acos(-1).div(2);
	return sign.mul(halfPi.minus(f.mul(c)).minus(g.mul(s)));
}

export function Shi(x: DecimalType): Decimal {
	const d: Decimal = new Decimal(x);
	if (d.isZero()) {
		return new Decimal(0);
	}
	const sign: Decimal = d.isNeg() ? new Decimal(-1) : new Decimal(1);
	const ax: Decimal = d.abs();
	if (ax.lt(8)) {
		let term: Decimal = ax;
		let sum: Decimal = term;
		let n: number = 0;
		for (let iter = 0; iter < 200; iter++) {
			const a: number = 2 * n + 1;
			term = term
				.mul(ax)
				.mul(ax)
				.mul(a)
				.div(new Decimal(a + 2).mul(a + 2).mul(a + 1));
			sum = sum.plus(term);
			n++;
			if (term.abs().lt(getSeriesError())) {
				break;
			}
		}
		return sign.mul(sum);
	}
	function EiLocal(y: Decimal): Decimal {
		if (y.isZero()) {
			return new Decimal(-Infinity);
		}
		if (y.gt(40) || y.lt(-40)) {
			let term: Decimal = new Decimal(1);
			let sum: Decimal = new Decimal(1);
			let best: Decimal = term.abs();
			for (let n = 1; n < 100; n++) {
				term = term.mul(n).div(y);
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
			return y.exp().mul(sum).div(y);
		}
		let term: Decimal = y;
		let sum: Decimal = term;
		for (let k = 1; k < 500; k++) {
			term = term
				.mul(y)
				.mul(k)
				.div(new Decimal(k + 1).mul(k + 1));
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
			ans = ans.mul(y).plus(coef[i]);
		}
		return ans;
	}
	function p1evl(y: Decimal, coef: Decimal[]): Decimal {
		let ans: Decimal = y.plus(coef[0]);
		for (let i = 1; i < coef.length; i++) {
			ans = ans.mul(y).plus(coef[i]);
		}
		return ans;
	}
	if (d.gt('1e9')) {
		return d.sin().div(d);
	}
	if (d.lte(4)) {
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
		const z: Decimal = d.mul(d);
		const c0: Decimal = z.mul(polevl(z, CN)).div(polevl(z, CD));
		return EULER_GAMMA.plus(d.ln()).plus(c0);
	}
	const s: Decimal = d.sin();
	const c: Decimal = d.cos();
	const z: Decimal = new Decimal(1).div(d.mul(d));
	let f: Decimal;
	let g: Decimal;
	if (d.lt(8)) {
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
		f = polevl(z, FN4).div(d.mul(p1evl(z, FD4)));
		g = z.mul(polevl(z, GN4)).div(p1evl(z, GD4));
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
		f = polevl(z, FN8).div(d.mul(p1evl(z, FD8)));
		g = z.mul(polevl(z, GN8)).div(p1evl(z, GD8));
	}
	return f.mul(s).minus(g.mul(c));
}

export function Chi(x: DecimalType): Decimal {
	const d: Decimal = new Decimal(x);
	const ax: Decimal = d.abs();
	if (ax.isZero()) {
		return new Decimal(-Infinity);
	}
	if (ax.lt(8)) {
		let n: number = 1;
		let term: Decimal = ax.mul(ax).div(4);
		let sum: Decimal = term;
		for (let iter = 0; iter < 200; iter++) {
			term = term
				.mul(ax)
				.mul(ax)
				.mul(n)
				.div(new Decimal(n + 1).mul(2 * n + 1).mul(2 * n + 2));
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
		if (y.gt(40) || y.lt(-40)) {
			let term: Decimal = new Decimal(1);
			let sum: Decimal = new Decimal(1);
			let best: Decimal = term.abs();
			for (let n = 1; n < 100; n++) {
				term = term.mul(n).div(y);
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
			return y.exp().mul(sum).div(y);
		}
		let term: Decimal = y;
		let sum: Decimal = term;
		for (let k = 1; k < 500; k++) {
			term = term
				.mul(y)
				.mul(k)
				.div(new Decimal(k + 1).mul(k + 1));
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
	if (d.gt(40) || d.lt(-40)) {
		let term: Decimal = new Decimal(1);
		let sum: Decimal = new Decimal(1);
		let best: Decimal = term.abs();
		for (let n = 1; n < 100; n++) {
			term = term.mul(n).div(d);
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
		return d.exp().mul(sum).div(d);
	}
	let term: Decimal = d;
	let sum: Decimal = term;
	for (let k = 1; k < 500; k++) {
		term = term
			.mul(d)
			.mul(k)
			.div(new Decimal(k + 1).mul(k + 1));
		sum = sum.plus(term);
		if (term.abs().lt(getSeriesError())) {
			break;
		}
	}
	return EULER_GAMMA.plus(d.abs().ln()).plus(sum);
}

export function Li(x: DecimalType): Decimal {
	const d: Decimal = new Decimal(x);
	if (d.lte(0)) {
		return new Decimal(NaN);
	}
	if (d.eq(1)) {
		return new Decimal(-Infinity);
	}
	const y: Decimal = d.ln();
	if (y.isZero()) {
		return new Decimal(-Infinity);
	}
	if (y.gt(40) || y.lt(-40)) {
		let term: Decimal = new Decimal(1);
		let sum: Decimal = new Decimal(1);
		let best: Decimal = term.abs();
		for (let n = 1; n < 100; n++) {
			term = term.mul(n).div(y);
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
		return y.exp().mul(sum).div(y);
	}
	let term: Decimal = y;
	let sum: Decimal = term;
	for (let k = 1; k < 500; k++) {
		term = term
			.mul(y)
			.mul(k)
			.div(new Decimal(k + 1).mul(k + 1));
		sum = sum.plus(term);
		if (term.abs().lt(getSeriesError())) {
			break;
		}
	}
	return EULER_GAMMA.plus(y.abs().ln()).plus(sum);
}
