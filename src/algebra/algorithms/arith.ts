/**
 * @module arith
 *
 * Low-level integer and modular arithmetic helpers used throughout the library.
 *
 * - All integer arithmetic is done with `bigint`.
 * - Modular routines assume a prime modulus `p` when inverses are required.
 */

/**
 * Shared integer + modular arithmetic primitives used across Zippel GCD and
 * multivariate factorization.
 *
 * Design goals:
 * - BigInt-only arithmetic for coefficient paths.
 * - Small, stable surface area: use `abs`, `gcd`, `pow`.
 */

// ============================================================================
// Integer arithmetic
// ============================================================================

/** Absolute value for BigInt. */
export function abs(a: bigint): bigint {
	return a < 0n ? -a : a;
}

/**
 * Euclidean GCD for BigInt.
 *
 * Returns a nonnegative gcd. gcd(0,0) = 0.
 */
export function gcd(a: bigint, b: bigint): bigint {
	a = abs(a);
	b = abs(b);
	while (b !== 0n) {
		[a, b] = [b, a % b];
	}
	return a;
}

/**
 * Integer exponentiation for BigInt with a nonnegative exponent.
 *
 * This is NOT modular exponentiation (see {@link modPow}).
 */
export function pow(base: bigint, exp: bigint): bigint {
	if (exp < 0n) {
		throw new Error('pow: negative exponent');
	}
	let b = base;
	let e = exp;
	let r = 1n;
	while (e > 0n) {
		if (e & 1n) {
			r *= b;
		}
		b *= b;
		e >>= 1n;
	}
	return r;
}

/**
 * Integer exponentiation for BigInt with a small nonnegative JS number exponent.
 *
 * Convenience wrapper used throughout factorization code where exponents are known
 * to fit in a number.
 */
export function powN(base: bigint, exp: number): bigint {
	if (!Number.isInteger(exp) || exp < 0) {
		throw new Error('powN: exponent must be a nonnegative integer');
	}
	return pow(base, BigInt(exp));
}

// ============================================================================
// Number theory helpers (BigInt)
// ============================================================================

/**
 * Integer square root: floor(sqrt(n)) for n >= 0.
 */
export function bigIntSqrt(n: bigint): bigint {
	if (n < 0n) {
		throw new Error('bigIntSqrt: negative input');
	}
	if (n < 2n) {
		return n;
	}
	// Newton iteration.
	let x0 = n;
	let x1 = (x0 + 1n) >> 1n;
	while (x1 < x0) {
		x0 = x1;
		x1 = (x1 + n / x1) >> 1n;
	}
	return x0;
}

/**
 * Exact n-th root if it exists.
 * Returns r such that r^n === value, or null if value is not a perfect n-th power.
 */
export function intNthRootExact(value: bigint, n: number): bigint | null {
	if (!Number.isInteger(n) || n <= 0) {
		throw new Error('intNthRootExact: n must be a positive integer');
	}
	if (value < 0n) {
		// Only odd roots exist for negative values.
		if ((n & 1) === 0) {
			return null;
		}
		const r = intNthRootExact(-value, n);
		return r === null ? null : -r;
	}
	if (value === 0n) {
		return 0n;
	}
	if (value === 1n) {
		return 1n;
	}

	// Exponential search for an upper bound.
	let lo = 0n;
	let hi = 1n;
	while (powN(hi, n) < value) {
		hi <<= 1n;
	}

	// Binary search.
	while (lo + 1n < hi) {
		const mid = (lo + hi) >> 1n;
		const p = powN(mid, n);
		if (p === value) {
			return mid;
		}
		if (p < value) {
			lo = mid;
		} else {
			hi = mid;
		}
	}
	return powN(hi, n) === value ? hi : powN(lo, n) === value ? lo : null;
}

/**
 * Return positive divisors of n (n > 0) by trial division.
 *
 * NOTE: This is intended for small integers used in factoring heuristics.
 */
export function getDivisors(n: bigint): bigint[] {
	if (n <= 0n) {
		throw new Error('getDivisors: n must be positive');
	}
	const out: bigint[] = [];
	const r = bigIntSqrt(n);
	for (let d = 1n; d <= r; d++) {
		if (n % d === 0n) {
			out.push(d);
			const q = n / d;
			if (q !== d) {
				out.push(q);
			}
		}
	}
	out.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
	return out;
}

/**
 * Extended Euclidean algorithm.
 *
 * Returns `{ g, x, y }` such that `a*x + b*y = g = gcd(a,b)` (up to sign).
 */
function egcd(a: bigint, b: bigint): { g: bigint; x: bigint; y: bigint } {
	let old_r = a,
		r = b;
	let old_s = 1n,
		s = 0n;
	let old_t = 0n,
		t = 1n;
	while (r !== 0n) {
		const q = old_r / r;
		[old_r, r] = [r, old_r - q * r];
		[old_s, s] = [s, old_s - q * s];
		[old_t, t] = [t, old_t - q * t];
	}
	return { g: old_r, x: old_s, y: old_t };
}

// ============================================================================
// Modular arithmetic
// ============================================================================

/** Normalize a into the range [0, |p|). Throws if p is zero. */
export function modNorm(a: bigint, p: bigint): bigint {
	if (p === 0n) {
		throw new Error('modNorm: modulus must be nonzero');
	}
	const m = abs(p);
	const r = a % m;
	return r < 0n ? r + m : r;
}

/** Map a to the symmetric residue class (-|p|/2, |p|/2]. */
export function modSymmetric(a: bigint, p: bigint): bigint {
	if (p === 0n) {
		throw new Error('modSymmetric: modulus must be nonzero');
	}
	const m = abs(p);
	const r = modNorm(a, m);
	const half = m / 2n;
	return r > half ? r - m : r;
}

/** Modular multiplicative inverse of a mod p, where gcd(a,p)=1. */
export function modInv(a: bigint, p: bigint): bigint {
	const aa = modNorm(a, p);
	if (aa === 0n) {
		throw new Error('modInv: non-invertible (0)');
	}
	const { g, x } = egcd(aa, p);
	if (g !== 1n && g !== -1n) {
		throw new Error('modInv: non-invertible');
	}
	return modNorm(x, p);
}

// ============================================================================
// Coefficient utilities
// ============================================================================

/**
 * Content (GCD of coefficients) for an iterable of bigint coefficients.
 * Returns 0n for the all-zero collection.
 */
export function contentBigint(coeffs: Iterable<bigint>): bigint {
	let g0 = 0n;
	for (const c of coeffs) {
		const a = abs(c);
		g0 = gcd(g0, a);
		if (g0 === 1n) {
			return 1n;
		}
	}
	return g0;
}

// ---------------------------------------------------------------------------
// Univariate polynomial arithmetic over F_p (coeff arrays low->high)
// ---------------------------------------------------------------------------

// ============================================================================
// Misc small utilities
// ============================================================================

/** Bit-length of a bigint (0 -> 0). */
export function bigintBitLength(a: bigint): number {
	if (a < 0n) {
		a = -a;
	}
	let bits = 0;
	while (a > 0n) {
		bits++;
		a >>= 1n;
	}
	return bits;
}

/** Simple primality test for 32-bit positive integers. */
function isPrime32(n: number): boolean {
	if (!Number.isInteger(n) || n < 2) {
		return false;
	}
	if (n === 2 || n === 3) {
		return true;
	}
	if ((n & 1) === 0) {
		return false;
	}
	if (n % 3 === 0) {
		return false;
	}
	const limit = Math.floor(Math.sqrt(n));
	for (let d = 5; d <= limit; d += 6) {
		if (n % d === 0 || n % (d + 2) === 0) {
			return false;
		}
	}
	return true;
}

/** Next prime >= start. */
export function nextPrime32(start: number): number {
	let n = start;
	if (n <= 2) {
		return 2;
	}
	if ((n & 1) === 0) {
		n++;
	}
	while (!isPrime32(n)) {
		n += 2;
	}
	return n;
}

// ============================================================================
// ERROR TYPES (phase-tagged)
// ============================================================================

type AlgebraPhase =
	| 'prime-selection'
	| 'specialization'
	| 'lift'
	| 'reconstruction'
	| 'verification'
	| 'budget'
	| 'normalization'
	| 'unknown';

class AlgebraError extends Error {
	/** Additional structured debugging info. Always present (possibly empty). */
	readonly details: Record<string, unknown>;
	readonly phase: AlgebraPhase;

	constructor(
		message: string,
		phase: AlgebraPhase = 'unknown',
		details?: Record<string, unknown>
	) {
		super(message);
		this.name = this.constructor.name;
		this.phase = phase;
		this.details = details ?? {};
	}
}

export class PrimeSelectionError extends AlgebraError {
	constructor(message: string, details?: Record<string, unknown>) {
		super(message, 'prime-selection', details);
	}
}

/**
 * Thrown when Zippel-style multivariate GCD exceeds its specialization / interpolation budget.
 */
export class GcdBudgetExceededError extends AlgebraError {
	constructor(message: string, details?: Record<string, unknown>) {
		super(message, 'budget', details);
	}
}
