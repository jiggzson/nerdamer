/* eslint-disable no-loss-of-precision */

import { diff as derivative } from '../../calculus/derivative/diff';
import { Expression } from '../classes/expression/Expression';

import type { JsFunction, ParserValuesObject, ExpressionInputType } from '../classes/parser/types';
import type Decimal from 'decimal.js';

export const EULER_GAMMA = 0.577215664901532860606512090082402431;

/**
 * The factorial function for integers. This uses caching to speed up evaluation.
 */
export function factorial(x: number) {
	if (!isInt(x)) {
		return gamma(x + 1);
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
export function gammaLN(z: number) {
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
export function gamma(z: number) {
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
export function erfc(x: number) {
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
	return 1 - erfc(x);
}

/**
 * The GCD function
 *
 * @param args
 */
export function GCD(...args: number[]) {
	// Get the abs of the unique values and sort
	args = [...new Set(args)].map(x => Math.abs(x)).sort();
	// Get the first element.
	let a = Math.abs(args.shift() as number);
	let n = args.length;

	while (n-- > 0) {
		let b = Math.abs(args.shift() as number);
		while (true) {
			a %= b;
			if (a === 0) {
				a = b;
				break;
			}
			b %= a;
			if (b === 0) {
				break;
			}
		}
	}
	return a;
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
 * Rounds a number to n digits
 * @param x The number to be rounded
 * @param s The number of digits to round to
 * @returns
 */
export function round(x: number, n = 0) {
	if (isInt(x)) {
		return x;
	}
	return Math.round(x * Math.pow(10, n)) / Math.pow(10, n);
}

/**
 * The numeric definitions used by build.
 */
export const definitions: { [name: string]: [f: JsFunction, dependencies?: string[]] } = {
	erf: [erf, ['erfc']],
	erfc: [erfc],
	factorial: [factorial, ['isInt']],
	gammaLN: [gammaLN],
	isInt: [isInt],
	gamma: [gamma, ['gammaLN', 'isInt', 'factorial']],
	abs: [
		(x: number) => {
			return Math.abs(x);
		},
	],
	cos: [
		(x: number) => {
			return Math.cos(x);
		},
	],
	sin: [
		(x: number) => {
			return Math.sin(x);
		},
	],
	tan: [
		(x: number) => {
			return Math.tan(x);
		},
	],
	sec: [
		(x: number) => {
			return 1 / Math.cos(x);
		},
	],
	csc: [
		(x: number) => {
			return 1 / Math.sin(x);
		},
	],
	cot: [
		(x: number) => {
			return 1 / Math.tan(x);
		},
	],
	cosh: [
		(x: number) => {
			return Math.cosh(x);
		},
	],
	sinh: [
		(x: number) => {
			return Math.sinh(x);
		},
	],
	tanh: [
		(x: number) => {
			return Math.tanh(x);
		},
	],
	sech: [
		(x: number) => {
			return 1 / Math.cosh(x);
		},
	],
	csch: [
		(x: number) => {
			return 1 / Math.sinh(x);
		},
	],
	coth: [
		(x: number) => {
			return 1 / Math.tanh(x);
		},
	],

	sqrt: [
		(x: number) => {
			return Math.sqrt(x);
		},
	],
	log: [
		(x: number) => {
			return Math.log(x);
		},
	],
	gcd: [GCD],
	sinc: [sinc],
	mod: [mod],
	avg: [avg],
	product: [product],
	Si: [Si],
	Shi: [Shi],
	Ci: [Ci],
	Chi: [Chi],
	Ei: [Ei],
};

export function collectConstants(x: Expression) {
	const constants: string[] = [];
	function setConstant(name: string, value: number) {
		constants.push(`var ${name} = ${value};\n`);
	}
	// Add the constants pi and e
	['pi', 'e'].forEach(e => {
		if (x.hasVariable(e)) {
			setConstant(e, Math[e.toUpperCase()]);
		}
	});
	// Add constants for special functions
	['Ci', 'Chi', 'Si', 'Shi', 'Li', 'Ei'].forEach(f => {
		if (x.hasFunction(f)) {
			setConstant('EULER_GAMMA', EULER_GAMMA);
		}
	});
	return constants.join(' ');
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
export function diff(f: (x: number) => number, h = 0.0001) {
	return (x: number) => {
		return (f(x + h) - f(x - h)) / (2 * h);
	};
}

export function sinc(x) {
	if (x === 0) {
		return 1;
	}

	const ax = Math.abs(x);
	if (ax < 1e-4) {
		const x2 = x * x;
		return 1 - x2 / 6 + (x2 * x2) / 120 - (x2 * x2 * x2) / 5040;
	}

	return Math.sin(x) / x;
}

export function Si(x) {
	if (x === 0) {
		return 0;
	}

	let sign = 1;
	if (x < 0) {
		sign = -1;
		x = -x;
	}

	function polevl(x, coef) {
		let ans = coef[0];
		for (let i = 1; i < coef.length; i++) {
			ans = ans * x + coef[i];
		}
		return ans;
	}

	function p1evl(x, coef) {
		let ans = x + coef[0];
		for (let i = 1; i < coef.length; i++) {
			ans = ans * x + coef[i];
		}
		return ans;
	}

	if (x > 1.0e9) {
		return sign * (Math.PI / 2 - Math.cos(x) / x);
	}

	// Small-x rational approximation
	if (x <= 4.0) {
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

	if (x < 8.0) {
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

export function Shi(x) {
	if (x === 0) {
		return 0;
	}

	const sign = x < 0 ? -1 : 1;
	const ax = Math.abs(x);

	// Power series for small |x|
	if (ax < 8) {
		let term = ax;
		let sum = term;
		let n = 0;

		for (let iter = 0; iter < 200; iter++) {
			const a = 2 * n + 1;
			term *= (ax * ax * a) / ((a + 2) * (a + 2) * (a + 1));
			sum += term;
			n++;
			if (Math.abs(term) < Math.abs(sum) * 1e-16) {
				break;
			}
		}

		return sign * sum;
	}

	// Inline real Ei(y)
	function Ei(y) {
		if (y === 0) {
			return -Infinity;
		}

		// Asymptotic expansion for large |y|
		if (y > 40 || y < -40) {
			let term = 1;
			let sum = 1;
			let best = Math.abs(term);

			for (let n = 1; n < 100; n++) {
				term *= n / y;
				const at = Math.abs(term);
				if (at > best) {
					break;
				}
				best = at;
				sum += term;
				if (at < Math.abs(sum) * 1e-16) {
					break;
				}
			}

			return (Math.exp(y) * sum) / y;
		}

		// Power series
		let term = y;
		let sum = term;

		for (let k = 1; k < 500; k++) {
			term *= (y * k) / ((k + 1) * (k + 1));
			sum += term;
			if (Math.abs(term) < Math.abs(sum) * 1e-16) {
				break;
			}
		}

		return EULER_GAMMA + Math.log(Math.abs(y)) + sum;
	}

	return 0.5 * (Ei(x) - Ei(-x));
}

export function Ci(x) {
	if (x === 0) {
		return -Infinity;
	}

	if (x < 0) {
		x = -x;
	}

	function polevl(x, coef) {
		let ans = coef[0];
		for (let i = 1; i < coef.length; i++) {
			ans = ans * x + coef[i];
		}
		return ans;
	}

	function p1evl(x, coef) {
		let ans = x + coef[0];
		for (let i = 1; i < coef.length; i++) {
			ans = ans * x + coef[i];
		}
		return ans;
	}

	if (x > 1.0e9) {
		return Math.sin(x) / x;
	}

	// Small-x rational approximation
	if (x <= 4.0) {
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

	if (x < 8.0) {
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

export function Chi(x) {
	const ax = Math.abs(x);
	if (ax === 0) {
		return -Infinity;
	}

	// Power series for small |x|
	if (ax < 8) {
		let n = 1;
		let term = (ax * ax) / 4;
		let sum = term;

		for (let iter = 0; iter < 200; iter++) {
			term *= (ax * ax * n) / ((n + 1) * (2 * n + 1) * (2 * n + 2));
			sum += term;
			n++;
			if (Math.abs(term) < Math.abs(sum) * 1e-16) {
				break;
			}
		}

		return EULER_GAMMA + Math.log(ax) + sum;
	}

	// Inline real Ei(y)
	function Ei(y) {
		if (y === 0) {
			return -Infinity;
		}

		// Asymptotic expansion for large |y|
		if (y > 40 || y < -40) {
			let term = 1;
			let sum = 1;
			let best = Math.abs(term);

			for (let n = 1; n < 100; n++) {
				term *= n / y;
				const at = Math.abs(term);
				if (at > best) {
					break;
				}
				best = at;
				sum += term;
				if (at < Math.abs(sum) * 1e-16) {
					break;
				}
			}

			return (Math.exp(y) * sum) / y;
		}

		// Power series
		let term = y;
		let sum = term;

		for (let k = 1; k < 500; k++) {
			term *= (y * k) / ((k + 1) * (k + 1));
			sum += term;
			if (Math.abs(term) < Math.abs(sum) * 1e-16) {
				break;
			}
		}

		return EULER_GAMMA + Math.log(Math.abs(y)) + sum;
	}

	return 0.5 * (Ei(x) + Ei(-x));
}

export function Ei(x) {
	if (x === 0) {
		return -Infinity;
	}

	// Asymptotic expansion for large |x|
	if (x > 40 || x < -40) {
		let term = 1;
		let sum = 1;
		let best = Math.abs(term);

		for (let n = 1; n < 100; n++) {
			term *= n / x;
			const at = Math.abs(term);
			if (at > best) {
				break;
			}
			best = at;
			sum += term;
			if (at < Math.abs(sum) * 1e-16) {
				break;
			}
		}

		return (Math.exp(x) * sum) / x;
	}

	// Power series
	let term = x;
	let sum = term;

	for (let k = 1; k < 500; k++) {
		term *= (x * k) / ((k + 1) * (k + 1));
		sum += term;
		if (Math.abs(term) < Math.abs(sum) * 1e-16) {
			break;
		}
	}

	return EULER_GAMMA + Math.log(Math.abs(x)) + sum;
}

export function Li(x) {
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
	if (y > 40 || y < -40) {
		let term = 1;
		let sum = 1;
		let best = Math.abs(term);

		for (let n = 1; n < 100; n++) {
			term *= n / y;
			const at = Math.abs(term);
			if (at > best) {
				break;
			}
			best = at;
			sum += term;
			if (at < Math.abs(sum) * 1e-16) {
				break;
			}
		}

		return (Math.exp(y) * sum) / y;
	}

	let term = y;
	let sum = term;

	for (let k = 1; k < 500; k++) {
		term *= (y * k) / ((k + 1) * (k + 1));
		sum += term;
		if (Math.abs(term) < Math.abs(sum) * 1e-16) {
			break;
		}
	}

	return EULER_GAMMA + Math.log(Math.abs(y)) + sum;
}

export class Solver {
	// The numeric epsilon to be used
	epsilon = 1e-13;
	// The epsilon to be used when solving newton
	newtonEpsilon = Number.EPSILON * 2;
	// The maximum number of iteration for newton
	newtonMaxIterations = 200;
	newtonMaxSymbolicIterations = 50;
	// The maximum roots to search for at each side
	rootsPerSide = 10;
	// The extend to which roots will be searched for
	searchRadius = 100;
	// const f = (x) => { return x ** 3 + 2 * x ** 2 - 1 }; // Gives false positives
	symbolicEpsilon = 1e-16;

	getPoints(f: (x: number) => number, start = 0, step = 1) {
		const points: number[] = [];
		// Roots found. This should be reset for each side
		let roots = 0;
		const testAndAdd = (point: number) => {
			// Test if it's zero at that point
			if (f(point) === 0 || Math.sign(f(point - step)) !== Math.sign(f(point + step))) {
				points.push(point);
				roots++;
				return true;
			}
			return false;
		};

		const leftEnd = start - this.searchRadius;
		const rightEnd = start + this.searchRadius;

		// Test the right side
		let n = start;

		while (n < rightEnd) {
			testAndAdd(n);
			if (roots === this.rootsPerSide) {
				break;
			}
			n += step;
		}

		// Test the left side
		n = start;
		roots = 0;
		while (n > leftEnd) {
			testAndAdd(n);
			if (roots === this.rootsPerSide) {
				break;
			}
			n -= step;
		}

		return points;
	}

	newton(f: (x: number) => number, point: number) {
		let iters = 0;
		let x0 = point;
		const fp = diff(f);
		let x: number;
		let e: number;
		do {
			const fx0 = f(x0); //store the result of the function
			//if the value is zero then we're done because 0 - (0/d f(x0)) = 0
			if (x0 === 0 && fx0 === 0) {
				x = 0;
				break;
			}

			iters++;
			if (iters > this.newtonMaxIterations) {
				return;
			} //maximum iterations reached

			x = x0 - fx0 / fp(x0);
			e = Math.abs(x - x0);
			x0 = x;
		} while (e > this.newtonEpsilon);

		//check if the number is indeed zero. 1e-13 seems to give the most accurate results
		if (Math.abs(f(x)) <= this.epsilon) {
			return x;
		}
	}

	newtonSymbolic(f: Expression, p: Expression, variable: string) {
		let iters = 0;
		let x0 = p.getMultiplier().toDecimal();
		const fp = derivative(f, variable);
		const values: ParserValuesObject = { [variable]: p.toString() };
		let x: Decimal;
		let e: Decimal;
		do {
			const fx0 = f.evaluate(values);
			if (iters++ > this.newtonMaxSymbolicIterations) {
				return;
			} //maximum iterations reached

			x = x0.minus(fx0.div(fp.evaluate(values)).text({ decimal: true }));
			// tracker = tracker.minus(fx0S.div(Expression.create(fp, values)))
			e = x.minus(x0).abs();
			x0 = x;
			values[variable] = x0.toString();
		} while (e.abs().gte(this.symbolicEpsilon));
		// console.log(tracker.toString())
		return x;
	}
	solve(f: ExpressionInputType) {
		f = Expression.create(f);
		const g = f.buildFunction();
		const points = this.getPoints(g);
		const solutions: number[] = [];
		for (const p of points) {
			const solution = this.newton(g, p);
			if (solution !== undefined) {
				solutions.push(solution);
			}
		}

		return [...new Set(solutions)];
	}
	solveSymbolic(f: ExpressionInputType) {
		f = Expression.create(f);
		const g = f.buildFunction();
		const points = this.getPoints(g);
		const variable = f.variables()[0];
		const solutions: { [key: string]: Decimal } = {};
		for (const p of points) {
			const solution = this.newtonSymbolic(f, Expression.create(p), variable);
			if (solution !== undefined) {
				solutions[solution.toString()] = solution;
			}
		}

		return Object.values(solutions);
	}
}
