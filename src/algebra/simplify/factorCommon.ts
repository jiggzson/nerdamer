import { Expression } from '../../core/classes/expression/Expression';
import { one, zero } from '../../core/classes/expression/shortcuts';

/**
 * Extracts a map of {base_value → power} from a single term of a sum.
 *
 * For a simple variable like x^(3/2), returns { 'x': 3/2 as Expression }
 * For a product like 2*x^(3/2)*y^2, returns { 'x': 3/2, 'y': 2 }
 * For a constant like 5, returns {}
 *
 * The coefficient (numeric multiplier) is not included in the map.
 */
function extractBasePowers(term: Expression): Map<string, Expression> {
	const map = new Map<string, Expression>();

	if (term.isNUM()) {
		// Pure number — no bases to extract
		return map;
	}

	if (term.isProduct()) {
		for (const element of term.elementsArray()) {
			if (!element.isNUM()) {
				const base = element.getBase();
				const key = base.text();
				const power = element.getPower();
				// Accumulate: a product might have the same base appear once,
				// but just in case, add powers
				if (map.has(key)) {
					map.set(key, map.get(key)!.plus(power));
				} else {
					map.set(key, power);
				}
			}
		}
	} else {
		const base = term.getBase();
		const key = base.text();
		map.set(key, term.getPower());
	}

	return map;
}

/**
 * Factors out the greatest common power from each base in a sum expression.
 *
 * For example:
 *   x^(3/2) + x^(1/2)         → x^(1/2) * (x + 1)
 *   x^3 + x^2                  → x^2 * (x + 1)
 *   2*x^(5/2) + 3*x^(3/2)     → x^(3/2) * (2*x + 3)
 *   x^2*y + x*y^2              → x*y * (x + y)
 *
 * Only applies to sums. Non-sum expressions are returned unchanged.
 */
export function factorCommonPower(x: Expression): Expression {
	if (!x.isSum()) {
		return x;
	}

	const m = x.getMultiplier();
	const p = x.getPower();

	const terms = x.elementsArray();

	// Edge case: single term or empty
	if (terms.length < 2) {
		return x;
	}

	// Step 1: Extract base → power maps for each term
	const termMaps: Map<string, Expression>[] = [];
	let hasConstantTerm = false;

	for (const term of terms) {
		const map = extractBasePowers(term);
		termMaps.push(map);
		if (map.size === 0) {
			hasConstantTerm = true;
		}
	}

	// If there's a constant term (no bases), no common base can be factored
	if (hasConstantTerm) {
		return x;
	}

	// Step 2: Find bases common to ALL terms
	const commonBases = new Set<string>(termMaps[0].keys());
	for (let i = 1; i < termMaps.length; i++) {
		for (const key of commonBases) {
			if (!termMaps[i].has(key)) {
				commonBases.delete(key);
			}
		}
	}

	// Nothing common to factor out
	if (commonBases.size === 0) {
		return x;
	}

	// Step 3: For each common base, find the minimum power across all terms
	const minPowers = new Map<string, Expression>();

	for (const base of commonBases) {
		let minPow = termMaps[0].get(base)!;
		for (let i = 1; i < termMaps.length; i++) {
			const pow = termMaps[i].get(base)!;
			// Use lt to compare — take the smaller power
			if (pow.lt(minPow)) {
				minPow = pow;
			}
		}
		// Only factor out positive powers
		if (minPow.sign() === 1) {
			minPowers.set(base, minPow);
		}
	}

	// Nothing positive to factor out
	if (minPowers.size === 0) {
		return x;
	}

	// Step 4: Build the common factor and the reduced sum
	let commonFactor = one();
	for (const [base, power] of minPowers) {
		commonFactor = commonFactor.times(Expression.create(base).pow(power));
	}

	// Step 5: Divide each term by the common factor to get the inner sum
	let innerSum = zero();
	for (const term of terms) {
		innerSum = innerSum.plus(term.div(commonFactor));
	}

	// Step 6: Reconstruct with outer multiplier and power
	let result = commonFactor.times(innerSum);

	if (!p.isOne()) {
		result = result.pow(p);
	}

	if (!m.isOne()) {
		result = result.times(m);
	}

	return result;
}
