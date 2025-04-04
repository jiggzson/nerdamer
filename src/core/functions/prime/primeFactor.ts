
export type factorCountType = { [factor: string]: bigint};

/**
 * Calculates and array of prime factors
 * 
 * @see https://stackoverflow.com/questions/39899072/how-can-i-find-the-prime-factors-of-an-integer-in-javascript by @TheChiporpoise
 * @param num 
 * @returns 
 */
export function primeFactors(num: bigint) {
    const factors: bigint[] = [];

    /* since 2 is the only even prime, it's easier to factor it out 
     * separately from the odd factor loop (for loop doesn't need to 
     * check whether or not to add 1 or 2 to f).
     * The condition is essentially checking if the number is even 
     * (bitwise "&" operator compares the bits of 2 numbers in binary  
     * and outputs a binary number with 1's where their digits are the 
     * same and 0's where they differ. In this case it only checks if 
     * the final digit for num in binary is 1, which would mean the 
     * number is odd, in which case the output would be 1, which is 
     * interpreted as true, otherwise the output will be 0, which is 
     * interpreted as false. "!" returns the opposite boolean, so this 
     * means that '!(num & 1)' is true when the num is not odd)
     */
    while (!(num & 1n)) {
        factors.push(2n);
        num /= 2n;
    }

    // 'f*f <= num' is faster than 'f <= Math.sqrt(num)'
    for (let f = 3n; f * f <= num; f += 2n) {
        while (!(num % f)) { // remainder of 'num / f' isn't 0
            factors.push(f);
            num /= f;
        }
    }

    /* if the number is already prime, then this adds it to factors so
     * an empty array isn't returned
     */
    if (num !== 1n) {
        factors.push(num);
    }
    return factors;
}

/**
 * Places the prime factors in an object and counts their occurrences
 * 
 * @param n 
 */
export function primeFactorCounts(n: bigint): factorCountType {
    const counts = {};
    const factors = primeFactors(n);
    for (const factor of factors) {
        const f = String(factor);
        if (!(f in counts)) {
            counts[f] = 1n;
        }
        else {
            counts[f]++
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
    for(const factor in b) {
        retval[factor] = factor in retval ? retval[factor] + b[factor] : b[factor];
    }

    return retval;
}