/**
 * Generates a pair of numbers given a set of prime numbers
 * @param factors The list of prime factors to be used to generate the pairs
 * @param target The target number that the pairs must equal
 * @returns
 */
export function factorPairs(factors: number[], target: number): number[][] {
	const products = new Set<number>();

	// Generate all subset products
	function backtrack(index: number, currentProduct: number) {
		if (index === factors.length) {
			products.add(currentProduct);
			return;
		}

		// Skip current number
		backtrack(index + 1, currentProduct);

		// Include current number
		backtrack(index + 1, currentProduct * factors[index]);
	}

	backtrack(0, 1);

	const result: number[][] = [];
	const seen = new Set<number>();

	for (const p of products) {
		if (p > 0 && target % p === 0) {
			const q = target / p;
			const key = Math.min(p, q); // prevent mirrored duplicates

			if (!seen.has(key)) {
				seen.add(key);
				result.push([Math.min(p, q), Math.max(p, q)]);
			}
		}
	}

	return result.sort((a, b) => a[0] - b[0]);
}

/**
 * Gets the largest factor pair given a set of prime factors and a target
 * @param factors The list of prime factors to be used to generate the pairs
 * @param target The target number that the pairs must equal
 * @returns
 */
export function maxPair(factors: number[], target: number) {
	const pair = factorPairs(factors, target).at(-1);
	if (!pair) {
		return [1, target];
	}

	return pair;
}
