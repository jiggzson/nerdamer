import { decimalSplit } from '../string';
import { arrayUnique } from '../utils';

/**
 * Returns the absolute value of a bigint
 *
 * @param x
 * @returns
 */
export function abs(x: bigint) {
	return x < 0n ? -x : x;
}

/**
 * Returns an array with unique values, sorted, and in reverse order.
 *
 * @param array
 * @returns
 */
export function uniqueSortedArray(array: bigint[]) {
	return arrayUnique(
		[].slice.call(array).map(function (x: bigint) {
			return abs(x);
		})
	).sort();
}

/**
 * Calculates the gcd of a set of bigints
 *
 * @returns
 */
export function GCD(...args: bigint[]) {
	// Get a unique set and convert to absolute values
	args = uniqueSortedArray(args);
	// Point to the first element
	let a = args[0];

	for (let i = 1; i < args.length; i++) {
		let b = args[i];
		while (true) {
			a %= b;
			if (a === 0n) {
				a = b;
				break;
			}
			b %= a;
			if (b === 0n) {
				break;
			}
		}
	}

	return a;
}

/**
 * Calculates the LCM of a set of bigints
 *
 * @param args
 */
export function LCM(...args: bigint[]) {
	// Get a unique set and convert to absolute values
	args = uniqueSortedArray(args);

	let a: bigint = args[0];

	for (let i = 1; i < args.length; i++) {
		const b = args[i];
		// Get the LCM of that of the last calculated LCM and the new number
		a = (a * b) / GCD(a, b);
	}

	return a;
}

/**
 * Simplifies a ratio of two bigints
 *
 * @param numerator
 * @param denominator
 * @returns
 */
export function simplifyRatio(numerator: bigint, denominator: bigint): [bigint, bigint] {
	if (denominator !== 1n) {
		const gcd = GCD(denominator, numerator);
		return [numerator / gcd, denominator / gcd];
	}
	return [numerator, denominator];
}

/**
 * Converts a decimal number to a rational
 *
 * @param numStr
 * @returns
 */
export function convert(numStr: string) {
	//Split the whole and decimal
	const [w, d] = decimalSplit(numStr);
	//Create the denominator based on the number of decimal places
	const denominator = 10n ** BigInt(d.length);
	const numerator = BigInt(w + d);

	return simplifyRatio(numerator, denominator);
}

/**
 * Returns the sign of a bigint
 *
 * @param n
 * @returns -1 if negative and 1 for positive and 0 for zero
 */
export function sign(n: bigint) {
	return n === 0n ? 0 : n < 0n ? -1 : 1;
}

/**
 * Checks if a bigint is an even number
 *
 * @param n
 * @returns
 */
export function isEven(n: bigint) {
	return n % 2n === 0n;
}

/**
 * Computes the nth Fibonacci number exactly using fast doubling.
 *
 * Negative indices use the negafibonacci identity F(-n) = (-1)^(n+1)F(n).
 *
 * @param n - Integer index.
 * @returns The exact Fibonacci number.
 */
export function fibonacci(n: bigint): bigint {
	const isNegative = n < 0n;
	const index = isNegative ? -n : n;
	let a = 0n;
	let b = 1n;

	for (const bit of index.toString(2)) {
		const c = a * (2n * b - a);
		const d = a * a + b * b;

		if (bit === '0') {
			a = c;
			b = d;
		} else {
			a = d;
			b = c + d;
		}
	}

	let retval = a;
	if (isNegative && isEven(index)) {
		retval = -retval;
	}

	return retval;
}

/**
 * The big number version
 */
export const factorial = (function () {
	const factorialCache = [1n, 1n];
	let i = 2;
	/**
	 * Leverages JavaScript's native bigInt and the solution provide here:
	 * https://stackoverflow.com/questions/3959211/what-is-the-fastest-factorial-function-in-javascript
	 * to provide a fast factorial function capable of calculating large numbers.
	 *
	 * @remarks
	 *
	 * This is limited to Number.MAX_SAFE_INTEGER since n is of type number since for loop requires it
	 *
	 * @param n - The factorial of the number being calculated
	 * @returns The computed factorial
	 * @throws RangeError If `n` is negative.
	 */
	function bigFactorial(n: number | bigint) {
		if (typeof n === 'bigint') {
			n = Number(n);
		}
		if (n < 0) {
			throw new RangeError('Factorial is undefined for negative integers.');
		}
		// If there's a cached version return that instead
		if (typeof factorialCache[n] != 'undefined') {
			return factorialCache[n];
		}

		let result = factorialCache[i - 1];

		for (; i <= n; i++) {
			factorialCache[i] = result = result * BigInt(i);
		}
		return result;
	}

	bigFactorial(100);

	return bigFactorial;
})();

// Cache the first 100
/**
 * Calculates the modulo of two numbers
 *
 * @param a
 * @param b
 * @returns
 */
export function mod(a: bigint, b: bigint) {
	const signA = sign(a);
	const signB = sign(b);
	let retval;
	if (signA === signB) {
		retval = a % b;
	} else {
		// https://stackoverflow.com/questions/4467539/javascript-modulo-gives-a-negative-result-for-negative-numbers
		retval = ((a % b) + b) % b;
	}

	return retval;
}

/**
 * Finds the multiplicative inverse of a modulo m.
 *
 * Returns -1 when the inverse does not exist. The extended Euclidean algorithm keeps
 * the operation exact for bigint inputs without scanning every possible residue.
 *
 * @param a
 * @param m
 * @returns
 */
export function invMod(a: bigint, m: bigint) {
	let retval = -1n;
	const modulus = abs(m);

	if (modulus !== 0n) {
		let t = 0n;
		let nextT = 1n;
		let r = modulus;
		let nextR = mod(a, modulus);

		while (nextR !== 0n) {
			const q = r / nextR;
			[t, nextT] = [nextT, t - q * nextT];
			[r, nextR] = [nextR, r - q * nextR];
		}

		if (r === 1n) {
			retval = mod(t, modulus);
		}
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
	let retval = BigInt(start);
	let n = BigInt(start);
	const i = BigInt(step);
	while (n < end) {
		n += i;
		retval *= n;
	}

	return retval;
}

/**
 * Returns the largest of a set of bigints
 * @param args
 * @returns
 */
export function max(...args: bigint[]) {
	if (args.length < 1) {
		// Math.max() for Number returns -Infinity for empty lists,
		// but BigInt can't represent Infinity, so throwing an error or
		// handling as per application logic is necessary.
		throw new Error('maxBigInt() requires at least one argument');
	}
	let max = args[0];
	for (let i = 1; i < args.length; i++) {
		if (args[i] > max) {
			max = args[i];
		}
	}
	return max;
}

/**
 * Returns the smallest of a set of bigints
 * @param args
 * @returns
 */
export function min(...args: bigint[]) {
	if (args.length === 0) {
		// Math.min() returns Infinity for no arguments, but BigInt cannot represent Infinity.
		// It's often better to throw an error or handle the empty case explicitly.
		throw new Error('Min of empty list is not defined for BigInt.');
	}
	let min = args[0];
	for (let i = 1; i < args.length; i++) {
		if (args[i] < min) {
			min = args[i];
		}
	}
	return min;
}

export function recoverCoeffsZ(num: bigint, primes: { [variable: string]: bigint }) {
	const variables = Object.keys(primes).sort((a, b) => {
		if (/\w+[-+]\w+/.test(a)) {
			return 1;
		}
		return a.localeCompare(b);
	});

	const map: Record<string, number | bigint> = {};
	// Loop though the variables
	for (const v of variables) {
		const prime = primes[v];

		let n = 0;
		let canDivide = true;
		// Divide out the max until you hit a remainder
		do {
			const q = num / prime;
			if (q === 0n) {
				break;
			}
			const r = num % q;

			if (r === 0n) {
				n++;
				num = q;
			} else {
				canDivide = false;
			}
		} while (canDivide);
		// Mark the power of the variable found
		map[v] = n;
	}
	// Put the rest to the coefficient
	map['coeff'] = num;

	return map;
}

/**
 * The binomial function using bigint
 * @param n
 * @param k
 * @returns
 */
export function binom(n: bigint, k: bigint): bigint {
	if (n < 0n) {
		throw new RangeError('binomBigInt: n must be non-negative');
	}
	if (k < 0n || k > n) {
		return 0n;
	}
	if (k === 0n || k === n) {
		return 1n;
	}

	let kk = k;
	const nMinusK = n - k;
	if (nMinusK < kk) {
		kk = nMinusK;
	}

	let result = 1n;
	for (let i = 1n; i <= kk; i++) {
		result = (result * (n - kk + i)) / i;
	}
	return result;
}

/**
 * Computes the LCM of an array of positive bigints.
 */
export function bigintLCM(values: bigint[]): bigint {
	if (values.length === 0) {
		return 1n;
	}

	function gcd(a: bigint, b: bigint): bigint {
		a = a < 0n ? -a : a;
		b = b < 0n ? -b : b;
		while (b !== 0n) {
			[a, b] = [b, a % b];
		}
		return a;
	}

	function lcm(a: bigint, b: bigint): bigint {
		return (a / gcd(a, b)) * b;
	}

	let result = values[0];
	for (let i = 1; i < values.length; i++) {
		result = lcm(result, values[i]);
	}
	return result;
}
