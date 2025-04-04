// Javascript program Miller-Rabin primality test
// based on JavaScript code found at https://www.geeksforgeeks.org/primality-test-set-3-miller-rabin/

// Utility function to do
// modular exponentiation.
// It returns (x^y) % p
export const primes: bigint[] = [2n, 3n, 5n, 7n];
// [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n, 41n, 43n,
//     47n, 53n, 59n, 61n, 67n, 71n, 73n, 79n, 83n, 89n, 97n, 101n, 103n, 107n, 109n, 113n, 127n, 131n,
//     137n, 139n, 149n, 151n, 157n, 163n, 167n, 173n, 179n, 181n, 191n, 193n, 197n, 199n, 211n, 223n,
//     227n, 229n, 233n, 239n, 241n, 251n, 257n, 263n, 269n, 271n, 277n, 281n, 283n, 293n, 307n, 311n,
//     313n, 317n, 331n, 337n, 347n, 349n, 353n, 359n, 367n, 373n, 379n, 383n, 389n, 397n, 401n, 409n,
//     419n, 421n, 431n, 433n, 439n, 443n, 449n, 457n, 461n, 463n, 467n, 479n, 487n, 491n, 499n, 503n,
//     509n, 521n, 523n, 541n];

export function power(x: bigint, y: bigint, p: bigint) {

    // Initialize result 
    // (JML- all literal integers converted to use n suffix denoting BigInt)
    let res = 1n;

    // Update x if it is more than or
    // equal to p
    x = x % p;
    while (y > 0n) {

        // If y is odd, multiply
        // x with result
        if (y & 1n)
            res = (res * x) % p;

        // y must be even now
        y = y / 2n; // (JML- original code used a shift operator, but division is clearer)
        x = (x * x) % p;
    }
    return res;
}


// This function is called
// for all k trials. It returns
// false if n is composite and
// returns false if n is
// probably prime. d is an odd
// number such that d*2<sup>r</sup> = n-1
// for some r >= 1
export function miillerTest(d: bigint, n: bigint) {
    // (JML- all literal integers converted to use n suffix denoting BigInt)

    // Pick a random number in [2..n-2]
    // Corner cases make sure that n > 4
    /* 
        JML- I can't mix the Number returned by Math.random with
        operations involving BigInt. The workaround is to create a random integer 
        with precision 6 and convert it to a BigInt.
    */
    const r = BigInt(Math.floor(Math.random() * 100_000))
    // JML- now I have to divide by the multiplier used above (BigInt version)
    const y = r * (n - 2n) / 100_000n
    const a = 2n + y % (n - 4n);

    // Compute a^d % n
    let x = power(a, d, n);

    if (x == 1n || x == n - 1n)
        return true;

    // Keep squaring x while one
    // of the following doesn't
    // happen
    // (i) d does not reach n-1
    // (ii) (x^2) % n is not 1
    // (iii) (x^2) % n is not n-1
    while (d != n - 1n) {
        x = (x * x) % n;
        d *= 2n;

        if (x == 1n)
            return false;
        if (x == n - 1n)
            return true;
    }

    // Return composite
    return false;
}

// It returns false if n is
// composite and returns true if n
// is probably prime. k is an
// input parameter that determines
// accuracy level. Higher value of
// k indicates more accuracy.
export function isPrime(n: bigint, k: number = 40) {
    // Look for the cached version. If the last cached version is greater than
    // the number and this number is included then it's a prime.
    if (primes[primes.length - 1] >= n && primes.includes(n)) {
        return true;
    }
    // (JML- all literal integers converted to use n suffix denoting BigInt)
    // Corner cases
    if (n <= 1n || n == 4n) return false;
    if (n <= 3n) return true;

    // Find r such that n =
    // 2^d * r + 1 for some r >= 1
    let d = n - 1n;
    while (d % 2n == 0n)
        d /= 2n;

    // Iterate given nber of 'k' times
    for (let i = 0; i < k; i++)
        if (!miillerTest(d, n))
            return false;

    return true;
}

/**
 * Generates primes in a given range
 * 
 * @param n 
 * @param startAt 
 */
export function generatePrimes(n: bigint, startAt?: bigint) {
    // Generate more primes then the ones already calculated
    startAt = primes[primes.length - 1] + 1n || 2n;

    for (let i = startAt; i < n; i++) {
        if (isPrime(i)) {
            primes.push(i);
        }
    }
}

// cache some prime factors
generatePrimes(30000n);