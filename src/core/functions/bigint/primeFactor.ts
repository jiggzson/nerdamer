import { sign, abs } from './bigint';

export type factorCountType = Record<string, bigint>;

/**
 * Calculates and array of prime factors
 *
 * @see https://stackoverflow.com/questions/39899072/how-can-i-find-the-prime-factors-of-an-integer-in-javascript by @TheChiporpoise
 * @param num
 * @returns
 */
// export function primeFactors(num: bigint, toNumbers: true): { sign: number, factors: number[] };
// export function primeFactors(num: bigint, toNumbers: false | void): { sign: number, factors: bigint[] };
// export function primeFactors(num: bigint, toNumbers?: boolean | void) {
// 	const factors: bigint[] = [];
// 	const sgn = sign(num);
// 	num = abs(num)
// 	/* since 2 is the only even prime, it's easier to factor it out
// 	 * separately from the odd factor loop (for loop doesn't need to
// 	 * check whether or not to add 1 or 2 to f).
// 	 * The condition is essentially checking if the number is even
// 	 * (bitwise "&" operator compares the bits of 2 numbers in binary
// 	 * and outputs a binary number with 1's where their digits are the
// 	 * same and 0's where they differ. In this case it only checks if
// 	 * the final digit for num in binary is 1, which would mean the
// 	 * number is odd, in which case the output would be 1, which is
// 	 * interpreted as true, otherwise the output will be 0, which is
// 	 * interpreted as false. "!" returns the opposite boolean, so this
// 	 * means that '!(num & 1)' is true when the num is not odd)
// 	 */
// 	while (!(num & 1n)) {
// 		factors.push(2n);
// 		num /= 2n;
// 	}

// 	// 'f*f <= num' is faster than 'f <= Math.sqrt(num)'
// 	for (let f = 3n; f * f <= num; f += 2n) {
// 		while (!(num % f)) { // remainder of 'num / f' isn't 0
// 			factors.push(f);
// 			num /= f;
// 		}
// 	}

// 	/* if the number is already prime, then this adds it to factors so
// 	 * an empty array isn't returned
// 	 */
// 	if (num !== 1n) {
// 		factors.push(num);
// 	}

// 	return {
// 		sign: sgn,
// 		factors: toNumbers ? factors.map((n) => Number(n)) : factors
// 	}
// }

// Miller-Rabin primality test
export function isPrimeBig(num: bigint): boolean {
	if (num < 2n) {
		return false;
	}
	if (num === 2n || num === 3n) {
		return true;
	}
	if (num % 2n === 0n) {
		return false;
	}

	let r = 0n;
	let d = num - 1n;
	while (d % 2n === 0n) {
		r++;
		d /= 2n;
	}

	const modPow = (base: bigint, exp: bigint, mod: bigint): bigint => {
		let result = 1n;
		base %= mod;
		while (exp > 0n) {
			if (exp % 2n === 1n) {
				result = (result * base) % mod;
			}
			base = (base * base) % mod;
			exp /= 2n;
		}
		return result;
	};

	// These witnesses are deterministic for every unsigned 64-bit integer. For larger
	// BigInts they remain a stable probable-prime test rather than a randomized result.
	const witnesses =
		num < 18_446_744_073_709_551_616n
			? [2n, 325n, 9375n, 28178n, 450775n, 9780504n, 1795265022n]
			: [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n];

	for (const witness of witnesses) {
		const a = witness % num;
		if (a < 2n) {
			continue;
		}
		let x = modPow(a, d, num);

		if (x === 1n || x === num - 1n) {
			continue;
		}

		let proceed = false;
		for (let j = 0n; j < r - 1n; j++) {
			x = (x * x) % num;
			if (x === num - 1n) {
				proceed = true;
				break;
			}
		}
		if (!proceed) {
			return false;
		}
	}
	return true;
}

/**
 * Fast prime factorization using trial division with optimizations
 */
export function trialDivisionBig(n: bigint): bigint[] {
	if (n <= 1n) {
		return [];
	}

	const factors: bigint[] = [];

	// Handle factor of 2
	while (n % 2n === 0n) {
		factors.push(2n);
		n /= 2n;
	}

	// Handle odd factors from 3 onwards
	let i = 3n;
	const sqrt = (num: bigint): bigint => {
		if (num < 2n) {
			return num;
		}
		let x = num;
		let y = (x + 1n) / 2n;
		while (y < x) {
			x = y;
			y = (x + num / x) / 2n;
		}
		return x;
	};

	const limit = sqrt(n);

	while (i <= limit) {
		while (n % i === 0n) {
			factors.push(i);
			n /= i;
		}
		i += 2n; // Skip even numbers
	}

	// If n is still greater than 1, it's a prime factor
	if (n > 1n) {
		factors.push(n);
	}

	return factors;
}

/**
 * Pollard's rho algorithm for faster factorization of large numbers
 */
export function pollardRhoBig(n: bigint): bigint {
	if (n % 2n === 0n) {
		return 2n;
	}

	let x = 2n;
	let y = 2n;
	let d = 1n;

	const f = (val: bigint): bigint => (val * val + 1n) % n;
	const gcd = (a: bigint, b: bigint): bigint => {
		while (b !== 0n) {
			[a, b] = [b, a % b];
		}
		return a;
	};

	while (d === 1n) {
		x = f(x);
		y = f(f(y));
		d = gcd(x > y ? x - y : y - x, n);
	}

	return d === n ? 0n : d;
}

/**
 * Advanced factorization using Pollard's rho for large numbers
 */
export function primeFactorsBig(n: bigint, toNumbers: true): { sign: number; factors: number[] };
export function primeFactorsBig(
	n: bigint,
	toNumbers: false | void
): { sign: number; factors: bigint[] };
export function primeFactorsBig(n: bigint, toNumbers?: boolean | void) {
	const sgn = sign(n);
	n = abs(n);
	const factors: bigint[] = [];

	if (n === 1n || n === 2n || isPrimeBig(n)) {
		factors.push(n);
	} else {
		const factorize = (num: bigint) => {
			if (num === 1n) {
				return;
			}
			if (isPrimeBig(num)) {
				factors.push(num);
				return;
			}

			const divisor = pollardRhoBig(num);
			if (divisor === 0n) {
				// Fallback to trial division
				const simple = trialDivisionBig(num);
				factors.push(...simple);
				return;
			}

			factorize(divisor);
			factorize(num / divisor);
		};

		factorize(n);
	}

	factors.sort((a, b) => (a < b ? -1 : 1));

	return {
		sign: sgn,
		factors: toNumbers ? factors.map(x => Number(x)) : factors,
	};
}

/**
 * Places the prime factors in an object and counts their occurrences
 *
 * @param n
 */
export function primeFactorCounts(n: bigint): factorCountType {
	const counts: factorCountType = {};
	const factors = primeFactorsBig(n).factors;
	for (const factor of factors) {
		const f = String(factor);
		if (!(f in counts)) {
			counts[f] = 1n;
		} else {
			counts[f]++;
		}
	}
	return counts;
}

/**
 * Merges two factor counts into one object
 *
 * @param a
 * @param b
 */
export function mergeFactors(a: factorCountType, b: factorCountType) {
	// Make a copy of a
	const retval: factorCountType = Object.assign(a, {});
	// Merge their counts
	for (const factor in b) {
		retval[factor] = factor in retval ? retval[factor] + b[factor] : b[factor];
	}

	return retval;
}

/**
 * Gets prime factors that can be used to create a number. The number one is
 * included since 1 * n is a possible combination.
 *
 * @param n The number for which the factors are being retrieved
 * @returns
 */
export function getFactors(n: number | bigint) {
	const { sign: sgn, factors } = primeFactorsBig(BigInt(n), true);
	// Add the one since 1 * p is a combination
	factors.unshift(1);

	if (sgn === -1) {
		const l = factors.length;
		for (let i = 0; i < l; i++) {
			factors.push(-factors[i]);
		}
	}

	return factors;
}
