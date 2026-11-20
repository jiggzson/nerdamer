import { message, UnexpectedInputError } from '../../errors';
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
 * Returns the distinct absolute values of an array, sorted in descending order.
 *
 * @param array
 * @returns
 */
export function uniqueSortedArray(array: bigint[]) {
	// Compare as numbers: the default sort compares strings, which puts 10 before 9.
	return arrayUnique(array.map(x => abs(x))).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
}

/**
 * Calculates the nonnegative gcd of a set of bigints by Euclid's algorithm, using Lehmer's
 * algorithm while the values are large. gcd(0, 0) and the gcd of no values are 0.
 *
 * @see Knuth, The Art of Computer Programming, vol. 2, 4.5.2, Algorithm L.
 * @returns
 */
export function GCD(...args: bigint[]) {
	let a = 0n;
	for (const value of args) {
		let b = value < 0n ? -value : value;
		if (a < b) {
			const t = a;
			a = b;
			b = t;
		}
		// Each Euclid step on bigints costs a pass over both numbers but removes one quotient,
		// so huge values take quadratic time. Lehmer runs Euclid on the leading 50 bits as
		// native numbers, then applies the quotients it found to a and b in one step.
		while (b >= 1n << 64n) {
			const shift = BigInt(a.toString(16).length * 4 - 50);
			let x = Number(a >> shift);
			let y = Number(b >> shift);
			// a and b become p*a + q*b and r*a + s*b.
			let p = 1;
			let q = 0;
			let r = 0;
			let s = 1;
			// Both quotients agree only while the leading bits determine the true one.
			while (y + r !== 0 && y + s !== 0) {
				const k = Math.floor((x + p) / (y + r));
				if (k !== Math.floor((x + q) / (y + s))) {
					break;
				}
				const nr = p - k * r;
				const ns = q - k * s;
				const ny = x - k * y;
				p = r;
				q = s;
				x = y;
				r = nr;
				s = ns;
				y = ny;
			}
			if (q === 0) {
				// The leading bits gave no quotient, so take a full Euclid step.
				const t = a % b;
				a = b;
				b = t;
			} else {
				const t = BigInt(p) * a + BigInt(q) * b;
				b = BigInt(r) * a + BigInt(s) * b;
				a = t;
			}
		}
		// A plain temporary rather than [a, b] = [b, a % b], which allocates on every step.
		while (b !== 0n) {
			const r = a % b;
			a = b;
			b = r;
		}
	}

	return a;
}

/**
 * Calculates the nonnegative LCM of a set of bigints. It is 0 when any value is 0.
 *
 * @param args
 */
export function LCM(...args: bigint[]) {
	let a = abs(args[0] ?? 0n);
	for (let i = 1; i < args.length && a !== 0n; i++) {
		const b = abs(args[i]);
		// The LCM of the running result and the next value
		a = b === 0n ? 0n : (a / GCD(a, b)) * b;
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
 * Returns the floor of the exact square root of a non-negative bigint.
 */
export function integerSquareRoot(value: bigint): bigint {
	if (value < 0n) {
		throw new RangeError(message('integerSquareRootNonnegative', { operation: 'integerSquareRoot' }));
	}
	if (value < 2n) {
		return value;
	}

	let root = 1n << ((BigInt(value.toString(2).length) + 1n) >> 1n);
	while (true) {
		const next = (root + value / root) >> 1n;
		if (next >= root) {
			return root;
		}
		root = next;
	}
}

/**
 * Returns the floor of the exact k-th root of a non-negative bigint.
 */
export function intRootBig(value: bigint, k: bigint): bigint {
	let retval = value;
	if (k === 2n) {
		retval = integerSquareRoot(value);
	} else if (value > 1n) {
		// Newton's method from an overestimate decreases monotonically to the floor.
		retval = 1n << (BigInt(value.toString(2).length) / k + 1n);
		while (true) {
			const next = ((k - 1n) * retval + value / retval ** (k - 1n)) / k;
			if (next >= retval) {
				break;
			}
			retval = next;
		}
	}
	return retval;
}

/** Returns the least bigint whose square is at least value. */
export function ceilIntegerSquareRoot(value: bigint): bigint {
	const root = integerSquareRoot(value);
	return root * root === value ? root : root + 1n;
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
	// Only the first values are kept. Storing every intermediate factorial of a large n
	// takes memory proportional to the square of the result size.
	const FACTORIAL_CACHE_SIZE = 100;
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
			throw new RangeError(message('factorialNegativeUndefined'));
		}
		// A non-integer index would miss the cache and skip the loop, returning the last cached
		// value, 100!.
		if (!Number.isInteger(n)) {
			throw new UnexpectedInputError(
				message('wrongInput', { expected: 'a nonnegative integer', received: String(n) })
			);
		}
		// If there's a cached version return that instead
		if (typeof factorialCache[n] != 'undefined') {
			return factorialCache[n];
		}

		let result = factorialCache[factorialCache.length - 1];
		let k = factorialCache.length;
		for (; k <= Math.min(n, FACTORIAL_CACHE_SIZE); k++) {
			result *= BigInt(k);
			factorialCache[k] = result;
		}
		return result * productInRange(k, n);
	}

	bigFactorial(FACTORIAL_CACHE_SIZE);

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
 * Raises a bigint base to a non-negative bigint exponent modulo a positive modulus.
 *
 * Binary exponentiation keeps every intermediate value in bigint modular arithmetic.
 */
export function powMod(base: bigint, exponent: bigint, modulus: bigint): bigint {
	if (modulus <= 0n) {
		throw new RangeError(message('modularExponentiationPositiveModulus'));
	}
	if (exponent < 0n) {
		throw new RangeError(message('modularExponentiationNonnegativeExponent'));
	}

	let result = 1n % modulus;
	let factor = mod(base, modulus);
	let power = exponent;

	while (power > 0n) {
		if (power % 2n === 1n) {
			result = (result * factor) % modulus;
		}
		factor = (factor * factor) % modulus;
		power /= 2n;
	}

	return result;
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
 * @param end The end of the range, included when a step lands on it
 * @param step The increment step
 * @returns The product of start, start + step, ... up to end, or 1 for an empty range
 */
export function productInRange(start: number, end: number, step = 1) {
	let retval = 1n;
	// Stop before passing end: productInRange(1, 4, 2) is 1*3, not 1*3*5.
	const count = Math.floor((end - start) / step) + 1;
	if (count > 16) {
		// Multiply the halves separately. Multiplying a running product by one term at a time
		// takes quadratic time, while balanced halves let the engine's fast multiplication of
		// large numbers do the work.
		const middle = start + Math.floor(count / 2) * step;
		retval = productInRange(start, middle - step, step) * productInRange(middle, end, step);
	} else {
		for (let n = start; n <= end; n += step) {
			retval *= BigInt(n);
		}
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
		throw new Error(message('maxBigIntRequiresArgument'));
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
		throw new Error(message('minBigIntEmpty'));
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
		// Divide out the prime while it divides evenly. A unit or zero prime would never stop.
		while (abs(prime) > 1n && num !== 0n && num % prime === 0n) {
			num /= prime;
			n++;
		}
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
		throw new RangeError(message('binomBigIntNonnegativeN'));
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

	return LCM(...values);
}
