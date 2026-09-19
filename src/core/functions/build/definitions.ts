import { fresnelC, fresnelIntegral, fresnelS } from '../fresnelNumeric';
import {
	Chi,
	Ci,
	doubleFactorial,
	Ei,
	erf,
	erfc,
	factorial,
	GCD,
	gamma,
	gammaLN,
	heaviside,
	isInt,
	isPrime,
	LCM,
	Li,
	mod,
	modInv,
	round,
	Shi,
	Si,
	sinc,
} from '../numeric';

import type { JsFunction } from '../../classes/parser/types';

/**
 * Numerical function implementations available to `buildFunction`.
 *
 * Every function body must either be self-contained or list each free function dependency
 * by its registry name so `buildFunction` can serialize the complete implementation. Functions
 * whose meaning depends on symbolic variables, structured entities, or complex-valued runtime
 * objects are absent and are rejected by the compiler.
 */
export const definitions: { [name: string]: [f: JsFunction, dependencies?: string[]] } = {
	// Trigonometric functions
	cos: [x => Math.cos(x)],
	sin: [x => Math.sin(x)],
	tan: [x => Math.tan(x)],
	sec: [x => 1 / Math.cos(x)],
	csc: [x => (x === 0 ? NaN : 1 / Math.sin(x))],
	cot: [x => (x === 0 ? NaN : 1 / Math.tan(x))],
	acos: [x => Math.acos(x)],
	asin: [x => Math.asin(x)],
	atan: [x => Math.atan(x)],
	asec: [x => Math.acos(1 / x)],
	acsc: [x => Math.asin(1 / x)],
	acot: [x => (x < 0 ? Math.PI + Math.atan(1 / x) : Math.atan(1 / x))],
	atan2: [
		(y, x) =>
			(y === 0 && x === 0) || (!Number.isFinite(y) && !Number.isFinite(x))
				? NaN
				: Math.atan2(y, x),
	],

	// Hyperbolic functions
	cosh: [x => Math.cosh(x)],
	sinh: [x => Math.sinh(x)],
	tanh: [x => Math.tanh(x)],
	sech: [x => 1 / Math.cosh(x)],
	csch: [x => (x === 0 ? NaN : 1 / Math.sinh(x))],
	coth: [x => (x === 0 ? NaN : 1 / Math.tanh(x))],
	acosh: [x => Math.acosh(x)],
	asinh: [x => Math.asinh(x)],
	atanh: [x => (x === 1 ? NaN : Math.atanh(x))],
	asech: [x => (x === 0 ? NaN : Math.acosh(1 / x))],
	acsch: [x => (x === 0 ? NaN : Math.asinh(1 / x))],
	acoth: [x => Math.atanh(1 / x)],

	// Scalar arithmetic and elementary functions
	abs: [x => Math.abs(x)],
	sqrt: [x => Math.sqrt(x)],
	cbrt: [x => Math.cbrt(x)],
	nthroot: [(x, n) => (n === 0 ? NaN : Math.pow(x, 1 / n))],
	log: [
		(x, base) =>
			base === undefined
				? Math.log(x)
				: base <= 0 || base === 1
					? NaN
					: Math.log(x) / Math.log(base),
	],
	exp: [x => Math.exp(x)],
	hypot: [(a, b) => Math.hypot(a, b)],
	round: [round, ['isInt']],
	sign: [x => Math.sign(x)],
	floor: [x => Math.floor(x)],
	ceil: [x => Math.ceil(x)],
	ceiling: [x => Math.ceil(x)],
	trunc: [x => Math.trunc(x)],
	mod: [mod],
	modinv: [modInv, ['mod']],
	max: [(...args) => Math.max(...args)],
	min: [(...args) => Math.min(...args)],
	avg: [(...args) => args.reduce((total, value) => total + value, 0) / args.length],
	heaviside: [heaviside],

	// Complex-component helpers are limited to real JavaScript-number inputs. This is
	// faithful to buildFunction's scalar runtime function without pretending to provide
	// a JavaScript-number representation for genuinely complex values.
	realpart: [x => x],
	imagpart: [() => 0],
	arg: [x => (Number.isNaN(x) ? NaN : x < 0 ? Math.PI : 0)],
	conjugate: [x => x],
	polarform: [x => x],
	rectform: [x => x],
	csgn: [x => Math.sign(x)],

	// Integer-valued helpers. Keep internal dependency names available because the
	// emitted function bodies reference these identifiers directly.
	isInt: [isInt],
	GCD: [GCD],
	gcd: [GCD],
	LCM: [LCM, ['GCD']],
	lcm: [LCM, ['GCD']],
	modInv: [modInv, ['mod']],
	isPrime: [isPrime],
	isprime: [isPrime],
	fib: [
		x => {
			let retval = NaN;
			if (Number.isSafeInteger(x)) {
				const isNegative = x < 0;
				const index = Math.abs(x);
				let a = 0;
				let b = 1;

				for (let i = 0; i < index; i++) {
					const next = a + b;
					a = b;
					b = next;
					if (!Number.isSafeInteger(a)) {
						break;
					}
				}

				if (Number.isSafeInteger(a)) {
					retval = isNegative && index % 2 === 0 ? -a : a;
				}
			}
			return retval;
		},
	],
	fact: [factorial, ['isInt', 'gamma']],
	factorial: [factorial, ['isInt', 'gamma']],
	dfact: [doubleFactorial, ['isInt', 'gamma']],

	// Special functions
	erf: [erf, ['erfc']],
	erfc: [erfc],
	gammaLN: [gammaLN],
	gamma: [gamma, ['gammaLN', 'isInt', 'factorial']],
	sinc: [sinc],
	Si: [Si],
	Shi: [Shi],
	Ci: [Ci],
	Chi: [Chi],
	Ei: [Ei],
	Li: [Li],
	fresnelIntegral: [fresnelIntegral],
	S: [fresnelS, ['fresnelIntegral']],
	C: [fresnelC, ['fresnelIntegral']],
};
