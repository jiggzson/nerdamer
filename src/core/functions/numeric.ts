/* eslint-disable no-loss-of-precision */

const EULER_GAMMA = 0.577215664901532860606512090082402431;
const DEFAULT_NUMERICAL_DERIVATIVE_STEP = 1e-4;
export { EULER_GAMMA };

/**
 * Computes factorial values with JavaScript-number arithmetic for compiled expressions.
 *
 * Non-integers use the gamma extension. Negative or unsafe integers return `NaN`, and
 * sufficiently large positive integers naturally overflow to `Infinity`.
 */
export function factorial(x: number): number {
	const MAX_FINITE_FACTORIAL_INPUT = 170;
	if (!isInt(x)) {
		return gamma(x + 1);
	}
	if (!Number.isSafeInteger(x) || x < 0) {
		return NaN;
	}
	if (x > MAX_FINITE_FACTORIAL_INPUT) {
		return Infinity;
	}
	const cache = [
		1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800, 479001600, 6227020800,
		87178291200, 1307674368000, 20922789888000, 355687428096000, 6402373705728000,
		121645100408832000, 2432902008176640000, 51090942171709440000, 1.1240007277776077e21,
		2.585201673888498e22, 6.204484017332394e23, 1.5511210043330986e25, 4.0329146112660565e26,
		1.0888869450418352e28, 3.0488834461171384e29, 8.841761993739701e30, 2.6525285981219103e32,
	];
	if (cache[x] !== undefined) {
		return cache[x];
	}

	const start = cache.length - 1;
	let result = cache[start];

	for (let i = start + 1; i <= x; i++) {
		result *= i;
	}
	return result;
}

/**
 * The gammaLN function which is used to compute the gamma function
 * Ported from: https://www.mrob.com/pub/ries/lanczos-gamma.html
 *
 * @param x
 */
export function gammaLN(z: number): number {
	const g = 607 / 128;
	const N = 14;
	const lct = [
		0.9999999999999953, 57.15623566586292, -59.59796035547549, 14.136097974741746,
		-0.4919138160976202, 0.00003399464998481189, 0.00004652362892704858,
		-0.00009837447530487956, 0.0001580887032249125, -0.00021026444172410488,
		0.00021743961811521265, -0.0001643181065367639, 0.00008441822398385275,
		-0.000026190838401581408, 0.0000036899182659531625,
	];

	let sum = 0;

	if (z < 0.5) {
		return Math.log(Math.PI / Math.sin(z * Math.PI)) - gammaLN(1 - z);
	}

	z = z - 1;
	const base = z + g + 0.5;
	for (let i = N; i >= 1; i--) {
		sum += lct[i] / (z + i);
	}

	sum += lct[0];

	return Math.log(Math.sqrt(Math.PI * 2)) + Math.log(sum) - base + Math.log(base) * (z + 0.5);
}

/**
 * The gamma function
 *
 * @param z
 * @returns
 */
export function gamma(z: number): number {
	if (isInt(z) && z > 1) {
		return factorial(z - 1);
	}
	return Math.exp(gammaLN(z));
}

/**
 * The complementary error function
 * https://en.wikipedia.org/wiki/Error_function
 *
 * @param x
 */
export function erfc(x: number): number {
	if (x < 0) {
		return 2 - erfc(-x);
	}
	const xsq = x ** 2;
	const a1 = 0.56418958354775629 / (x + 2.06955023132914151);
	const a2 =
		(xsq + 2.71078540045147805 * x + 5.80755613130301624) /
		(xsq + 3.4795405709951896 * x + 12.06166887286239555);
	const a3 =
		(xsq + 3.47469513777439592 * x + 12.07402036406381411) /
		(xsq + 3.72068443960225092 * x + 8.44319781003968454);
	const a4 =
		(xsq + 4.00561509202259545 * x + 9.30596659485887898) /
		(xsq + 3.90225704029924078 * x + 6.36161630953880464);
	const a5 =
		(xsq + 5.16722705817812584 * x + 9.12661617673673262) /
		(xsq + 4.03296893109262491 * x + 5.13578530585681539);
	const a6 =
		(xsq + 5.95908795446633271 * x + 9.19435612886969243) /
		(xsq + 4.11240942957450885 * x + 4.48640329523408675);

	return a1 * a2 * a3 * a4 * a5 * a6 * Math.exp(-xsq);
}

/**
 * The numeric error function
 *
 * @param x
 * @returns
 */
export function erf(x: number) {
	if (x === 0) {
		return 0;
	}
	return 1 - erfc(x);
}

/**
 * Computes the Euclidean GCD of JavaScript safe integers for numerical compilation.
 *
 * This is the small native-number helper used by `buildFunction`; it is separate from
 * Nerdamer's symbolic polynomial GCD implementation. Non-safe-integer inputs return `NaN`.
 */
export function GCD(...args: number[]) {
	let retval = 0;
	const values = [...new Set(args)].map(x => Math.abs(x));

	for (const value of values) {
		if (!Number.isSafeInteger(value)) {
			retval = NaN;
			break;
		}

		let b = value;
		while (b !== 0) {
			const remainder = retval % b;
			retval = b;
			b = remainder;
		}
	}

	return retval;
}

/**
 * A utility function to check if a number is an integer
 *
 * @param x
 * @returns
 */
export function isInt(x: number) {
	return x % 1 === 0;
}

/**
 * Computes the double factorial using JavaScript-number arithmetic.
 *
 * Non-negative integer inputs use the finite product directly. Non-integers follow
 * the same gamma-based extension used by the symbolic implementation. Negative or
 * unsafe integer inputs return `NaN`.
 */
export function doubleFactorial(x: number): number {
	if (isInt(x)) {
		if (!Number.isSafeInteger(x) || x < 0) {
			return NaN;
		}

		let retval = 1;
		for (let n = x; n > 1; n -= 2) {
			retval *= n;
			if (!Number.isFinite(retval)) {
				break;
			}
		}
		return retval;
	}

	const c = Math.cos(Math.PI * x);
	return (
		Math.pow(2, (2 * x + 1 - c) / 4) *
		Math.pow(Math.PI, (c - 1) / 4) *
		gamma(x / 2 + 1)
	);
}

/**
 * Computes an LCM while the exact integer result remains representable as a safe number.
 * Inputs or results outside that range return `NaN`.
 */
export function LCM(...args: number[]) {
	let retval = 1;
	for (const value of args) {
		if (!Number.isSafeInteger(value)) {
			retval = NaN;
			break;
		}
		if (value === 0) {
			retval = 0;
			break;
		}

		const gcd = GCD(retval, value);
		const next = Math.abs((retval / gcd) * value);
		if (!Number.isSafeInteger(next)) {
			retval = NaN;
			break;
		}
		retval = next;
	}
	return retval;
}

/** Computes the modular multiplicative inverse for integer JavaScript numbers. */
export function modInv(a: number, p: number) {
	if (!Number.isSafeInteger(a) || !Number.isSafeInteger(p) || p === 0) {
		return NaN;
	}

	let t = 0;
	let nextT = 1;
	let r = Math.abs(p);
	let nextR = mod(a, r);

	while (nextR !== 0) {
		const q = Math.floor(r / nextR);
		[t, nextT] = [nextT, t - q * nextT];
		[r, nextR] = [nextR, r - q * nextR];
	}

	return r === 1 ? mod(t, Math.abs(p)) : NaN;
}

/** Returns `1` for a prime safe integer and `0` otherwise. */
export function isPrime(x: number) {
	if (!Number.isSafeInteger(x) || x < 2) {
		return 0;
	}
	if (x === 2) {
		return 1;
	}
	if (x % 2 === 0) {
		return 0;
	}

	for (let divisor = 3; divisor * divisor <= x; divisor += 2) {
		if (x % divisor === 0) {
			return 0;
		}
	}
	return 1;
}

/** Numeric half-maximum convention for the Heaviside step function. */
export function heaviside(x: number) {
	return Number.isNaN(x) ? NaN : x < 0 ? 0 : x > 0 ? 1 : 0.5;
}

/**
 * Rounds a number to n digits
 * @param x The number to be rounded
 * @param s The number of digits to round to
 * @returns
 */
export function round(x: number, n = 0) {
	let retval = x;
	if (!isInt(x)) {
		const scale = Math.pow(10, n);
		const scaled = x * scale;
		const rounded = scaled < 0 ? -Math.round(-scaled) : Math.round(scaled);
		retval = rounded / scale;
	}
	return retval;
}

/**
 * Multiplies an array of numbers
 *
 * @param args
 * @returns
 */
export function product(...args: number[]) {
	let retval = 1;
	for (let i = 0; i < args.length; i++) {
		retval *= args[i];
	}

	return retval;
}

/**
 * Gets the product given a number range start and finish
 *
 * @param start The start of the range
 * @param end The end of the range
 * @param step The increment step
 */
export function productInRange(start: number, end: number, step = 1) {
	let retval = start;
	let n = start;
	while (n < end) {
		n += step;
		retval *= n;
	}

	return retval;
}

/**
 * Gets the average of a set of numbers
 *
 * @param args
 * @returns
 */
export function avg(...args: number[]) {
	return sum(...args) / args.length;
}

/**
 * Sums an array of numbers
 *
 * @param args
 * @returns
 */
export function sum(...args: number[]) {
	let retval = 0;
	for (let i = 0; i < args.length; i++) {
		retval += args[i];
	}

	return retval;
}

/**
 * Generates a random integer between a min and max
 *
 * @param min
 * @param max
 * @returns
 */
export function getRandomInt(min: number, max: number) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Returns the modulus of a number. Allows for negative numbers
 *
 * @param n
 * @param m
 * @returns
 */
export function mod(n: number, m: number) {
	return ((n % m) + m) % m;
}

/**
 * Return a function which returns a numeric approximation of the derivative of the provided function
 * @example
 * const d = diff(Math.cos);
 * d(Math.PI) // 0
 *
 * @param f The function to be differentiated
 * @param h The delta to be used
 * @returns
 */
export function diff(f: (x: number) => number, h = DEFAULT_NUMERICAL_DERIVATIVE_STEP) {
	return (x: number) => {
		return (f(x + h) - f(x - h)) / (2 * h);
	};
}

export function sinc(x: number) {
	const SINC_SERIES_CUTOFF = 1e-4;
	if (x === 0) {
		return 1;
	}

	const ax = Math.abs(x);
	if (ax < SINC_SERIES_CUTOFF) {
		const x2 = x * x;
		return 1 - x2 / 6 + (x2 * x2) / 120 - (x2 * x2 * x2) / 5040;
	}

	return Math.sin(x) / x;
}

export function Si(x: number) {
	const OSCILLATORY_ASYMPTOTIC_CUTOFF = 1e9;
	const RATIONAL_APPROXIMATION_CUTOFF = 4;
	const ASYMPTOTIC_APPROXIMATION_CUTOFF = 8;
	if (x === 0) {
		return 0;
	}

	let sign = 1;
	if (x < 0) {
		sign = -1;
		x = -x;
	}

	function polevl(x: number, coef: number[]) {
		let ans = coef[0];
		for (let i = 1; i < coef.length; i++) {
			ans = ans * x + coef[i];
		}
		return ans;
	}

	function p1evl(x: number, coef: number[]) {
		let ans = x + coef[0];
		for (let i = 1; i < coef.length; i++) {
			ans = ans * x + coef[i];
		}
		return ans;
	}

	if (x > OSCILLATORY_ASYMPTOTIC_CUTOFF) {
		return sign * (Math.PI / 2 - Math.cos(x) / x);
	}

	// Small-x rational approximation
	if (x <= RATIONAL_APPROXIMATION_CUTOFF) {
		const SN = [
			-8.39167827910303881427e-11, 4.62591714427012837309e-8, -9.75759303843632795789e-6,
			9.76945438170435310816e-4, -4.13470316229406538752e-2, 1.00000000000000000302,
		];

		const SD = [
			2.03269266195951942049e-12, 1.27997891179943299903e-9, 4.41827842801218905784e-7,
			9.96412122043875552487e-5, 1.4208523932614989393e-2, 9.99999999999999996984e-1,
		];

		const z = x * x;
		const s = (x * polevl(z, SN)) / polevl(z, SD);
		return sign * s;
	}

	// Asymptotic region
	const s = Math.sin(x);
	const c = Math.cos(x);
	const z = 1.0 / (x * x);
	let f, g;

	if (x < ASYMPTOTIC_APPROXIMATION_CUTOFF) {
		const FN4 = [
			4.23612862892216586994, 5.45937717161812843388, 1.62083287701538329132,
			1.67006611831323023771e-1, 6.81020132472518137426e-3, 1.08936580650328664411e-4,
			5.48900223421373614008e-7,
		];

		const FD4 = [
			8.16496634205391016773, 7.30828822505564552187, 1.86792257950184183883,
			1.78792052963149907262e-1, 7.0171066832278975361e-3, 1.10034357153915731354e-4,
			5.48900252756255700982e-7,
		];

		const GN4 = [
			8.71001698973114191777e-2, 6.11379109952219284151e-1, 3.97180296392337498885e-1,
			7.48527737628469092119e-2, 5.38868681462177273157e-3, 1.61999794598934024525e-4,
			1.97963874140963632189e-6, 7.82579040744090311069e-9,
		];

		const GD4 = [
			1.64402202413355338886, 6.66296701268987968381e-1, 9.88771761277688796203e-2,
			6.2239634544176842076e-3, 1.73221081474177119497e-4, 2.02659182086343991969e-6,
			7.82579218933534490868e-9,
		];

		f = polevl(z, FN4) / (x * p1evl(z, FD4));
		g = (z * polevl(z, GN4)) / p1evl(z, GD4);
	} else {
		const FN8 = [
			4.55880873470465315206e-1, 7.13715274100146711374e-1, 1.6030015822231945632e-1,
			1.16064229408124407915e-2, 3.49556442447859055605e-4, 4.86215430826454749482e-6,
			3.20092790091004902806e-8, 9.41779576128512936592e-11, 9.70507110881952024631e-14,
		];

		const FD8 = [
			9.17463611873684053703e-1, 1.78685545332074536321e-1, 1.22253594771971293032e-2,
			3.58696481881851580297e-4, 4.92435064317881464393e-6, 3.21956939101046018377e-8,
			9.43720590350276732376e-11, 9.70507110881952025725e-14,
		];

		const GN8 = [
			6.97359953443276214934e-1, 3.30410979305632063225e-1, 3.8487876764997429592e-2,
			1.71718239052347903558e-3, 3.48941165502279436777e-5, 3.471311670841166738e-7,
			1.70404452782044526189e-9, 3.85945925430276600453e-12, 3.1404009894636333464e-15,
		];

		const GD8 = [
			1.68548898811011640017, 4.87852258695304967486e-1, 4.6791319425962580632e-2,
			1.90284426674399523638e-3, 3.68475504442561108162e-5, 3.57043223443740838771e-7,
			1.72693748966316146736e-9, 3.87830166023954706752e-12, 3.14040098946363335242e-15,
		];

		f = polevl(z, FN8) / (x * p1evl(z, FD8));
		g = (z * polevl(z, GN8)) / p1evl(z, GD8);
	}

	const si = Math.PI / 2 - f * c - g * s;
	return sign * si;
}

export function Shi(x: number) {
	const ASYMPTOTIC_APPROXIMATION_CUTOFF = 8;
	const EXPONENTIAL_ASYMPTOTIC_CUTOFF = 40;
	const SERIES_MAX_ITERATIONS = 200;
	const ASYMPTOTIC_MAX_TERMS = 100;
	const POWER_SERIES_MAX_TERMS = 500;
	const SERIES_RELATIVE_TOLERANCE = 1e-16;
	if (x === 0) {
		return 0;
	}

	const sign = x < 0 ? -1 : 1;
	const ax = Math.abs(x);

	// Power series for small |x|
	if (ax < ASYMPTOTIC_APPROXIMATION_CUTOFF) {
		let term = ax;
		let sum = term;
		let n = 0;

		for (let iter = 0; iter < SERIES_MAX_ITERATIONS; iter++) {
			const a = 2 * n + 1;
			term *= (ax * ax * a) / ((a + 2) * (a + 2) * (a + 1));
			sum += term;
			n++;
			if (Math.abs(term) < Math.abs(sum) * SERIES_RELATIVE_TOLERANCE) {
				break;
			}
		}

		return sign * sum;
	}

	// Inline real Ei(y)
	function Ei(y: number) {
		if (y === 0) {
			return -Infinity;
		}

		// Asymptotic expansion for large |y|
		if (y > EXPONENTIAL_ASYMPTOTIC_CUTOFF || y < -EXPONENTIAL_ASYMPTOTIC_CUTOFF) {
			let term = 1;
			let sum = 1;
			let best = Math.abs(term);

			for (let n = 1; n < ASYMPTOTIC_MAX_TERMS; n++) {
				term *= n / y;
				const at = Math.abs(term);
				if (at > best) {
					break;
				}
				best = at;
				sum += term;
				if (at < Math.abs(sum) * SERIES_RELATIVE_TOLERANCE) {
					break;
				}
			}

			return (Math.exp(y) * sum) / y;
		}

		// Power series
		let term = y;
		let sum = term;

		for (let k = 1; k < POWER_SERIES_MAX_TERMS; k++) {
			term *= (y * k) / ((k + 1) * (k + 1));
			sum += term;
			if (Math.abs(term) < Math.abs(sum) * SERIES_RELATIVE_TOLERANCE) {
				break;
			}
		}

		return EULER_GAMMA + Math.log(Math.abs(y)) + sum;
	}

	return 0.5 * (Ei(x) - Ei(-x));
}

export function Ci(x: number) {
	const OSCILLATORY_ASYMPTOTIC_CUTOFF = 1e9;
	const RATIONAL_APPROXIMATION_CUTOFF = 4;
	const ASYMPTOTIC_APPROXIMATION_CUTOFF = 8;
	if (x === 0) {
		return -Infinity;
	}

	if (x < 0) {
		x = -x;
	}

	function polevl(x: number, coef: number[]) {
		let ans = coef[0];
		for (let i = 1; i < coef.length; i++) {
			ans = ans * x + coef[i];
		}
		return ans;
	}

	function p1evl(x: number, coef: number[]) {
		let ans = x + coef[0];
		for (let i = 1; i < coef.length; i++) {
			ans = ans * x + coef[i];
		}
		return ans;
	}

	if (x > OSCILLATORY_ASYMPTOTIC_CUTOFF) {
		return Math.sin(x) / x;
	}

	// Small-x rational approximation
	if (x <= RATIONAL_APPROXIMATION_CUTOFF) {
		const CN = [
			2.02524002389102268789e-11, -1.35249504915790756375e-8, 3.59325051419993077021e-6,
			-4.74007206873407909465e-4, 2.89159652607555242092e-2, -1.0000000000000000008,
		];

		const CD = [
			4.07746040061880559506e-12, 3.06780997581887812692e-9, 1.23210355685883423679e-6,
			3.17442024775032769882e-4, 5.10028056236446052392e-2, 4.0000000000000000008,
		];

		const z = x * x;
		const c0 = (z * polevl(z, CN)) / polevl(z, CD);
		return EULER_GAMMA + Math.log(x) + c0;
	}

	// Asymptotic region
	const s = Math.sin(x);
	const c = Math.cos(x);
	const z = 1.0 / (x * x);
	let f, g;

	if (x < ASYMPTOTIC_APPROXIMATION_CUTOFF) {
		const FN4 = [
			4.23612862892216586994, 5.45937717161812843388, 1.62083287701538329132,
			1.67006611831323023771e-1, 6.81020132472518137426e-3, 1.08936580650328664411e-4,
			5.48900223421373614008e-7,
		];

		const FD4 = [
			8.16496634205391016773, 7.30828822505564552187, 1.86792257950184183883,
			1.78792052963149907262e-1, 7.0171066832278975361e-3, 1.10034357153915731354e-4,
			5.48900252756255700982e-7,
		];

		const GN4 = [
			8.71001698973114191777e-2, 6.11379109952219284151e-1, 3.97180296392337498885e-1,
			7.48527737628469092119e-2, 5.38868681462177273157e-3, 1.61999794598934024525e-4,
			1.97963874140963632189e-6, 7.82579040744090311069e-9,
		];

		const GD4 = [
			1.64402202413355338886, 6.66296701268987968381e-1, 9.88771761277688796203e-2,
			6.2239634544176842076e-3, 1.73221081474177119497e-4, 2.02659182086343991969e-6,
			7.82579218933534490868e-9,
		];

		f = polevl(z, FN4) / (x * p1evl(z, FD4));
		g = (z * polevl(z, GN4)) / p1evl(z, GD4);
	} else {
		const FN8 = [
			4.55880873470465315206e-1, 7.13715274100146711374e-1, 1.6030015822231945632e-1,
			1.16064229408124407915e-2, 3.49556442447859055605e-4, 4.86215430826454749482e-6,
			3.20092790091004902806e-8, 9.41779576128512936592e-11, 9.70507110881952024631e-14,
		];

		const FD8 = [
			9.17463611873684053703e-1, 1.78685545332074536321e-1, 1.22253594771971293032e-2,
			3.58696481881851580297e-4, 4.92435064317881464393e-6, 3.21956939101046018377e-8,
			9.43720590350276732376e-11, 9.70507110881952025725e-14,
		];

		const GN8 = [
			6.97359953443276214934e-1, 3.30410979305632063225e-1, 3.8487876764997429592e-2,
			1.71718239052347903558e-3, 3.48941165502279436777e-5, 3.471311670841166738e-7,
			1.70404452782044526189e-9, 3.85945925430276600453e-12, 3.1404009894636333464e-15,
		];

		const GD8 = [
			1.68548898811011640017, 4.87852258695304967486e-1, 4.6791319425962580632e-2,
			1.90284426674399523638e-3, 3.68475504442561108162e-5, 3.57043223443740838771e-7,
			1.72693748966316146736e-9, 3.87830166023954706752e-12, 3.14040098946363335242e-15,
		];

		f = polevl(z, FN8) / (x * p1evl(z, FD8));
		g = (z * polevl(z, GN8)) / p1evl(z, GD8);
	}

	return f * s - g * c;
}

export function Chi(x: number) {
	const ASYMPTOTIC_APPROXIMATION_CUTOFF = 8;
	const EXPONENTIAL_ASYMPTOTIC_CUTOFF = 40;
	const SERIES_MAX_ITERATIONS = 200;
	const ASYMPTOTIC_MAX_TERMS = 100;
	const POWER_SERIES_MAX_TERMS = 500;
	const SERIES_RELATIVE_TOLERANCE = 1e-16;
	const ax = Math.abs(x);
	if (ax === 0) {
		return -Infinity;
	}

	// Power series for small |x|
	if (ax < ASYMPTOTIC_APPROXIMATION_CUTOFF) {
		let n = 1;
		let term = (ax * ax) / 4;
		let sum = term;

		for (let iter = 0; iter < SERIES_MAX_ITERATIONS; iter++) {
			term *= (ax * ax * n) / ((n + 1) * (2 * n + 1) * (2 * n + 2));
			sum += term;
			n++;
			if (Math.abs(term) < Math.abs(sum) * SERIES_RELATIVE_TOLERANCE) {
				break;
			}
		}

		return EULER_GAMMA + Math.log(ax) + sum;
	}

	// Inline real Ei(y)
	function Ei(y: number) {
		if (y === 0) {
			return -Infinity;
		}

		// Asymptotic expansion for large |y|
		if (y > EXPONENTIAL_ASYMPTOTIC_CUTOFF || y < -EXPONENTIAL_ASYMPTOTIC_CUTOFF) {
			let term = 1;
			let sum = 1;
			let best = Math.abs(term);

			for (let n = 1; n < ASYMPTOTIC_MAX_TERMS; n++) {
				term *= n / y;
				const at = Math.abs(term);
				if (at > best) {
					break;
				}
				best = at;
				sum += term;
				if (at < Math.abs(sum) * SERIES_RELATIVE_TOLERANCE) {
					break;
				}
			}

			return (Math.exp(y) * sum) / y;
		}

		// Power series
		let term = y;
		let sum = term;

		for (let k = 1; k < POWER_SERIES_MAX_TERMS; k++) {
			term *= (y * k) / ((k + 1) * (k + 1));
			sum += term;
			if (Math.abs(term) < Math.abs(sum) * SERIES_RELATIVE_TOLERANCE) {
				break;
			}
		}

		return EULER_GAMMA + Math.log(Math.abs(y)) + sum;
	}

	return 0.5 * (Ei(x) + Ei(-x));
}

export function Ei(x: number) {
	const EXPONENTIAL_ASYMPTOTIC_CUTOFF = 40;
	const ASYMPTOTIC_MAX_TERMS = 100;
	const POWER_SERIES_MAX_TERMS = 500;
	const SERIES_RELATIVE_TOLERANCE = 1e-16;
	if (x === 0) {
		return -Infinity;
	}

	// Asymptotic expansion for large |x|
	if (x > EXPONENTIAL_ASYMPTOTIC_CUTOFF || x < -EXPONENTIAL_ASYMPTOTIC_CUTOFF) {
		let term = 1;
		let sum = 1;
		let best = Math.abs(term);

		for (let n = 1; n < ASYMPTOTIC_MAX_TERMS; n++) {
			term *= n / x;
			const at = Math.abs(term);
			if (at > best) {
				break;
			}
			best = at;
			sum += term;
			if (at < Math.abs(sum) * SERIES_RELATIVE_TOLERANCE) {
				break;
			}
		}

		return (Math.exp(x) * sum) / x;
	}

	// Power series
	let term = x;
	let sum = term;

	for (let k = 1; k < POWER_SERIES_MAX_TERMS; k++) {
		term *= (x * k) / ((k + 1) * (k + 1));
		sum += term;
		if (Math.abs(term) < Math.abs(sum) * SERIES_RELATIVE_TOLERANCE) {
			break;
		}
	}

	return EULER_GAMMA + Math.log(Math.abs(x)) + sum;
}

export function Li(x: number) {
	const EXPONENTIAL_ASYMPTOTIC_CUTOFF = 40;
	const ASYMPTOTIC_MAX_TERMS = 100;
	const POWER_SERIES_MAX_TERMS = 500;
	const SERIES_RELATIVE_TOLERANCE = 1e-16;
	if (x <= 0) {
		return NaN;
	}
	if (x === 1) {
		return -Infinity;
	}

	const y = Math.log(x);
	if (y === 0) {
		return -Infinity;
	}

	// Inline Ei(y)
	if (y > EXPONENTIAL_ASYMPTOTIC_CUTOFF || y < -EXPONENTIAL_ASYMPTOTIC_CUTOFF) {
		let term = 1;
		let sum = 1;
		let best = Math.abs(term);

		for (let n = 1; n < ASYMPTOTIC_MAX_TERMS; n++) {
			term *= n / y;
			const at = Math.abs(term);
			if (at > best) {
				break;
			}
			best = at;
			sum += term;
			if (at < Math.abs(sum) * SERIES_RELATIVE_TOLERANCE) {
				break;
			}
		}

		return (Math.exp(y) * sum) / y;
	}

	let term = y;
	let sum = term;

	for (let k = 1; k < POWER_SERIES_MAX_TERMS; k++) {
		term *= (y * k) / ((k + 1) * (k + 1));
		sum += term;
		if (Math.abs(term) < Math.abs(sum) * SERIES_RELATIVE_TOLERANCE) {
			break;
		}
	}

	return EULER_GAMMA + Math.log(Math.abs(y)) + sum;
}
