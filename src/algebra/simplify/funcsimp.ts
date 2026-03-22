import { Expression } from '../../core/classes/expression/Expression';
import { one, zero } from '../../core/classes/expression/shortcuts';
import { FACTORIAL } from '../../core/classes/parser/constants';
import { LOG } from '../../core/classes/parser/constants';

// ============================================================================
// FACTORIAL SIMPLIFICATION
//
// Direct ratio cancellation without expansion.
//
//   n! / (n+k)!  →  1 / ((n+1)(n+2)...(n+k))
//   (n+k)! / n!  →  (n+1)(n+2)...(n+k)
// It works by detecting factorial pairs in products (one with positive power,
// one with negative power) and computing the difference of their arguments.
// ============================================================================

interface FactorialInfo {
	arg: Expression; // the argument to the factorial
	power: Expression; // the power on the factorial (usually 1 or -1)
	multiplier: Expression; // any multiplier
	index: number; // index in the elements array
}

/**
 * Extracts factorial terms from a product expression.
 * Returns the factorial info and the remaining non-factorial parts.
 */
function extractFactorials(x: Expression): { factorials: FactorialInfo[]; rest: Expression[] } {
	const factorials: FactorialInfo[] = [];
	const rest: Expression[] = [];

	if (!x.isProduct()) {
		if (x.isFunction(FACTORIAL)) {
			factorials.push({
				arg: x.getArguments()[0],
				power: x.getPower(),
				multiplier: Expression.fromRational(x.getMultiplier()),
				index: 0,
			});
			return { factorials, rest };
		}
		return { factorials: [], rest: [x] };
	}

	let idx = 0;
	for (const element of x.elementsArray()) {
		if (element.isFunction(FACTORIAL)) {
			factorials.push({
				arg: element.getArguments()[0],
				power: element.getPower(),
				multiplier: Expression.fromRational(element.getMultiplier()),
				index: idx,
			});
		} else {
			rest.push(element);
		}
		idx++;
	}

	return { factorials, rest };
}

/**
 * Tries to compute the integer difference between two factorial arguments.
 * If argA - argB = k (a positive integer), returns k.
 * If argB - argA = k (a positive integer), returns -k.
 * Otherwise returns null.
 *
 * Examples:
 *   diffFactorialArgs((n+2), n)     → 2
 *   diffFactorialArgs(n, (n+3))     → -3
 *   diffFactorialArgs((2n+4), (2n)) → 4
 *   diffFactorialArgs(n, m)         → null (symbolic, can't determine)
 */
function diffFactorialArgs(argA: Expression, argB: Expression): number | null {
	const diff = argA.minus(argB);

	// The difference should be a pure integer (NUM type, integer multiplier)
	if (!diff.isNUM()) {
		return null;
	}

	const rat = diff.getMultiplier();
	if (!rat.isInteger()) {
		return null;
	}

	// Get the integer value
	const n = Number(rat.numerator);

	// Guard against excessively large differences to avoid generating huge products
	if (Math.abs(n) > 100) {
		return null;
	}

	return n;
}

/**
 * Builds the product (base+1)(base+2)...(base+k) for positive k,
 * or the product (base)(base-1)...(base-k+1) for negative k.
 *
 * For k > 0: returns (base+1)·(base+2)·...·(base+k)
 * For k < 0: returns (base)·(base-1)·...·(base+k+1)   [i.e., |k| terms going down]
 */
function consecutiveProduct(base: Expression, k: number): Expression {
	if (k === 0) {
		return one();
	}

	let result = one();
	if (k > 0) {
		// (base+1)(base+2)...(base+k)
		for (let i = 1; i <= k; i++) {
			result = result.times(base.plus(Expression.create(`${i}`)));
		}
	} else {
		// k < 0: (base)(base-1)...(base+k+1) — that's |k| terms going down from base
		const absK = -k;
		for (let i = 0; i < absK; i++) {
			result = result.times(base.minus(Expression.create(`${i}`)));
		}
	}

	return result;
}

/**
 * Simplifies factorial ratios in a product expression.
 *
 *   n! · (n+k)!^(-1) → 1 / ((n+1)(n+2)...(n+k))    when k > 0
 *   (n+k)! · n!^(-1) → (n+1)(n+2)...(n+k)           when k > 0
 *
 * Works by finding pairs of factorials where one has power 1 and the other
 * has power -1, computing their argument difference, and replacing with
 * the product of consecutive integers.
 */
export function simplifyFactorials(x: Expression): Expression {
	if (!x.isProduct()) {
		return x;
	}

	const { factorials, rest } = extractFactorials(x);

	// Need at least 2 factorials to simplify (one in num, one in den)
	if (factorials.length < 2) {
		return x;
	}

	// Separate into numerator factorials (power > 0) and denominator factorials (power < 0)
	const numFacts: FactorialInfo[] = [];
	const denFacts: FactorialInfo[] = [];

	for (const f of factorials) {
		if (f.power.sign() === 1 && f.power.isOne()) {
			numFacts.push(f);
		} else if (f.power.sign() === -1) {
			// Check it's exactly -1
			const pRat = f.power.getMultiplier();
			if (pRat.numerator === -1n && (pRat.denominator === 1n || pRat.denominator === -1n)) {
				denFacts.push(f);
			} else {
				// Non-unit power factorial — leave it alone
				rest.push(
					f.multiplier.times(Expression.toFunction(FACTORIAL, [f.arg]).pow(f.power))
				);
			}
		} else {
			// Power is not ±1. Leave it as-is.
			rest.push(f.multiplier.times(Expression.toFunction(FACTORIAL, [f.arg]).pow(f.power)));
		}
	}

	const usedNum = new Set<number>();
	const usedDen = new Set<number>();
	const newFactors: Expression[] = [];

	// Try to pair each numerator factorial with a denominator factorial
	for (let i = 0; i < numFacts.length; i++) {
		if (usedNum.has(i)) {
			continue;
		}

		for (let j = 0; j < denFacts.length; j++) {
			if (usedDen.has(j)) {
				continue;
			}

			const a = numFacts[i]; // e.g. n! in numerator
			const b = denFacts[j]; // e.g. (n+k)! in denominator

			// Compute diff = a.arg - b.arg
			const diff = diffFactorialArgs(a.arg, b.arg);

			if (diff !== null && diff !== 0) {
				if (diff < 0) {
					// a.arg < b.arg, so a.arg! / b.arg! = 1 / consecutive product
					// e.g. n! / (n+3)! = 1 / ((n+1)(n+2)(n+3))
					const prod = consecutiveProduct(a.arg, -diff);
					newFactors.push(a.multiplier.times(b.multiplier).times(prod.invert()));
				} else {
					// a.arg > b.arg, so a.arg! / b.arg! = consecutive product
					// e.g. (n+3)! / n! = (n+1)(n+2)(n+3)
					const prod = consecutiveProduct(b.arg, diff);
					newFactors.push(a.multiplier.times(b.multiplier).times(prod));
				}
				usedNum.add(i);
				usedDen.add(j);
				break;
			} else if (diff === 0) {
				// Same argument: they cancel to 1 (times multipliers)
				newFactors.push(a.multiplier.times(b.multiplier));
				usedNum.add(i);
				usedDen.add(j);
				break;
			}
		}
	}

	// Reconstruct: remaining factorials + new factors + rest
	let result = Expression.fromRational(x.getMultiplier());

	// Unmatched numerator factorials
	for (let i = 0; i < numFacts.length; i++) {
		if (!usedNum.has(i)) {
			const f = numFacts[i];
			result = result.times(f.multiplier.times(Expression.toFunction(FACTORIAL, [f.arg])));
		}
	}

	// Unmatched denominator factorials
	for (let j = 0; j < denFacts.length; j++) {
		if (!usedDen.has(j)) {
			const f = denFacts[j];
			result = result.times(
				f.multiplier.times(Expression.toFunction(FACTORIAL, [f.arg]).invert())
			);
		}
	}

	// New factors from cancellation
	for (const factor of newFactors) {
		result = result.times(factor);
	}

	// Other non-factorial elements
	for (const element of rest) {
		result = result.times(element);
	}

	return result;
}

// ============================================================================
// LOGARITHM SIMPLIFICATION
//
// Combines and simplifies log terms in sums using standard identities:
//
//   log(a) + log(b)   →  log(a·b)         [product rule]
//   log(a) - log(b)   →  log(a/b)         [quotient rule]
//   k·log(a)          →  log(a^k)         [power lifting]
//   k·log(a) + m·log(b) → log(a^k · b^m) [lift then combine]
//
// Power lifting rules:
//   - Integer coefficients: always lift (3·log(x) → log(x³))
//   - Rational coefficients: only lift when combining with other log terms
//     (standalone (1/2)·log(x) stays as (1/2)·log(x))
//   - When all coefficients share a common factor, it's preserved:
//     (1/2)·log(x) - (1/2)·log(y) → (1/2)·log(x/y)
//
// Strategy:
//   1. Extract all log terms from a sum: coefficient and argument
//   2. For numeric coefficients: find common factor, lift remainders, combine
//   3. For symbolic coefficients: group by matching coefficient, combine
// ============================================================================

interface LogTerm {
	coeff: Expression; // the coefficient (everything except log(...))
	arg: Expression; // the argument to log
	original: Expression;
}

/**
 * Extracts log(u) information from a sum term.
 * Returns null if the term doesn't contain a log.
 *
 * Handles:
 *   log(u)         → coeff = 1, arg = u
 *   3*log(u)       → coeff = 3, arg = u
 *   x*log(u)       → coeff = x, arg = u
 *   log(u)^2       → null (not linear in log)
 */
function extractLogTerm(term: Expression): LogTerm | null {
	// Case 1: Direct log function with power 1
	if (term.isFunction(LOG) && term.isLinear()) {
		const args = term.getArguments();
		if (args.length === 0) {
			return null;
		}
		return {
			coeff: Expression.fromRational(term.getMultiplier()),
			arg: args[0],
			original: term,
		};
	}

	// Case 2: Product containing a log function
	if (term.isProduct()) {
		let logElement: Expression | null = null;
		let logMultiplier = one();
		const coeffParts: Expression[] = [];

		for (const element of term.elementsArray()) {
			if (!logElement && element.isFunction(LOG) && element.isLinear()) {
				logElement = element;
				logMultiplier = Expression.fromRational(element.getMultiplier());
			} else {
				coeffParts.push(element);
			}
		}

		if (logElement) {
			let coeff = Expression.fromRational(term.getMultiplier());
			for (const part of coeffParts) {
				coeff = coeff.times(part);
			}
			coeff = coeff.times(logMultiplier);

			return {
				coeff,
				arg: logElement.getArguments()[0],
				original: term,
			};
		}
	}

	return null;
}

/**
 * Determines if a coefficient should be lifted into the log argument as a power.
 *
 * Integer coefficients: always lift (3·log(x) → log(x³))
 * Rational coefficients: only lift when combining with other terms
 *   (standalone (1/2)·log(x) stays as-is)
 *
 * @param coeff The coefficient expression (must be NUM)
 * @param isCombining Whether this term is being combined with other log terms
 */
function shouldLiftCoefficient(coeff: Expression, isCombining: boolean): boolean {
	if (!coeff.isNUM()) {
		return false;
	}

	const rat = coeff.getMultiplier();

	// Coefficient of ±1: nothing to lift
	if (rat.abs().isOne()) {
		return false;
	}

	const isInteger = rat.denominator === 1n || rat.denominator === -1n;

	// Integer coefficients: always lift
	if (isInteger) {
		return true;
	}

	// Rational coefficients: only lift when combining with other terms
	return isCombining;
}

/**
 * Lifts a numeric coefficient into the log argument as a power.
 *
 *   c·log(u) → log(u^c)     for the magnitude
 *   Sign is tracked separately (positive → numerator, negative → denominator)
 *
 * Returns the new log argument with the coefficient absorbed as a power.
 */
function liftCoefficientIntoPower(arg: Expression, coeff: Expression): Expression {
	const absCoeff = coeff.abs();
	return arg.pow(absCoeff);
}

/**
 * Combines logarithmic terms in a sum expression.
 *
 * Power lifting + combination:
 *   log(x) + log(y)         → log(x·y)             [combine, coeff=1]
 *   2·log(x) + 3·log(y)    → log(x²·y³)           [lift then combine]
 *   (1/2)·log(x)           → (1/2)·log(x)          [rational, standalone: keep]
 *   (1/2)·log(x) + (1/3)·log(y) → log(x^(1/2)·y^(1/3))  [rational, combining: lift]
 *   a·log(u) + a·log(v)    → a·log(u·v)            [symbolic, group by coeff]
 *   log(a) - log(b)         → log(a/b)             [sign handling]
 */
export function simplifyLogs(x: Expression): Expression {
	if (!x.isSum()) {
		return x;
	}

	// A sum expression may have an outer multiplier and power, e.g.
	// (1/6)*(3*log(x)+2*log(y)) is stored as a SUM with multiplier 1/6.
	// We need to preserve these when reconstructing.
	const outerMultiplier = Expression.fromRational(x.getMultiplier());
	const outerPower = x.getPower();

	const logTerms: LogTerm[] = [];
	const otherTerms: Expression[] = [];

	for (const term of x.elementsArray()) {
		const info = extractLogTerm(term);
		if (info) {
			logTerms.push(info);
		} else {
			otherTerms.push(term);
		}
	}

	// No log terms: nothing to do
	if (logTerms.length === 0) {
		return x;
	}

	// Split into numeric-coeff and symbolic-coeff log terms
	const numericLogTerms = logTerms.filter(t => t.coeff.isNUM());
	const symbolicLogTerms = logTerms.filter(t => !t.coeff.isNUM());

	// Handle single numeric log term: only lift if integer coefficient
	if (numericLogTerms.length === 1 && symbolicLogTerms.length === 0) {
		const t = numericLogTerms[0];
		if (shouldLiftCoefficient(t.coeff, false)) {
			// Integer coeff, standalone: lift it
			// e.g. 3·log(x) → log(x³)
			const newArg = liftCoefficientIntoPower(t.arg, t.coeff);
			const logExpr = Expression.toFunction(LOG, [newArg]);
			// Rebuild the sum with the lifted log term
			let result = logExpr;
			for (const other of otherTerms) {
				result = result.plus(other);
			}
			return applyOuterMultiplierAndPower(result, outerMultiplier, outerPower);
		}
		return x;
	}

	// Multiple numeric log terms: lift and combine
	if (numericLogTerms.length >= 2) {
		const combined = combineNumericLogTerms(numericLogTerms, otherTerms, x);
		if (combined !== x) {
			let result = combined;
			// If we also have symbolic terms, add them back
			if (symbolicLogTerms.length > 0) {
				for (const t of symbolicLogTerms) {
					result = result.plus(t.original);
				}
			}
			return applyOuterMultiplierAndPower(result, outerMultiplier, outerPower);
		}
	}

	// For symbolic coefficients, try to group terms with equal coefficients
	if (symbolicLogTerms.length >= 2) {
		// Rebuild with any unhandled numeric terms
		const remainingOther = [...otherTerms];
		for (const t of numericLogTerms) {
			// Lift standalone integer coefficients even when symbolic terms exist
			if (shouldLiftCoefficient(t.coeff, false)) {
				const newArg = liftCoefficientIntoPower(t.arg, t.coeff);
				remainingOther.push(Expression.toFunction(LOG, [newArg]));
			} else {
				remainingOther.push(t.original);
			}
		}
		const result = combineSymbolicLogTerms(symbolicLogTerms, remainingOther, x);
		if (result !== x) {
			return applyOuterMultiplierAndPower(result, outerMultiplier, outerPower);
		}
	}

	return x;
}

/**
 * Re-applies the outer multiplier and power that were on the original sum expression.
 * Sums can carry an outer multiplier, e.g. (1/6)*(a+b) is a SUM with multiplier 1/6.
 * After transforming the inner elements, we need to put these back.
 */
function applyOuterMultiplierAndPower(
	result: Expression,
	outerMultiplier: Expression,
	outerPower: Expression
): Expression {
	if (!outerPower.isOne()) {
		result = result.pow(outerPower);
	}
	if (!outerMultiplier.isOne()) {
		result = result.times(outerMultiplier);
	}
	return result;
}

/**
 * Combines log terms that all have numeric (rational) coefficients
 * using power lifting.
 *
 * Strategy: Lift each coefficient into the log argument as a power,
 * then combine all into a single log term.
 *
 * Examples:
 *   log(x) + log(y)              → log(x·y)
 *   2·log(x) + 3·log(y)         → log(x²·y³)
 *   log(x) - log(y)              → log(x/y)
 *   2·log(x) - 3·log(y)         → log(x²/y³)
 *   (1/2)·log(x) + (1/3)·log(y) → log(x^(1/2)·y^(1/3))
 *   (1/2)·log(x) + (-1/2)·log(y) → (1/2)·log(x/y)  [common factor preserved]
 */
function combineNumericLogTerms(
	logTerms: LogTerm[],
	otherTerms: Expression[],
	_original: Expression
): Expression {
	// First, check if all terms share a common coefficient magnitude.
	// If so, preserve that as an outer factor (cleaner output).
	// e.g. (1/2)·log(x) + (-1/2)·log(y) → (1/2)·log(x/y)
	// rather than log(x^(1/2) / y^(1/2))
	const commonFactor = findCommonCoeffFactor(logTerms);

	if (commonFactor && !commonFactor.isOne()) {
		// All coefficients are multiples of commonFactor.
		// Divide each coefficient by it, combine, then multiply back.
		let innerArg = one();

		for (const t of logTerms) {
			const reducedCoeff = t.coeff.div(commonFactor);
			const sign = reducedCoeff.sign();
			const absReduced = reducedCoeff.abs();

			// Lift the reduced coefficient if it's not 1
			let termArg = t.arg;
			if (!absReduced.isOne()) {
				termArg = liftCoefficientIntoPower(t.arg, reducedCoeff);
			}

			if (sign >= 0) {
				innerArg = innerArg.times(termArg);
			} else {
				innerArg = innerArg.times(termArg.invert());
			}
		}

		const logExpr = Expression.toFunction(LOG, [innerArg]);
		const resultTerms = [...otherTerms, commonFactor.times(logExpr)];

		if (resultTerms.length === 1) {
			return resultTerms[0];
		}

		let result = zero();
		for (const term of resultTerms) {
			result = result.plus(term);
		}
		return result;
	}

	// No common factor (or it's 1): lift all coefficients into powers and combine
	// e.g. 2·log(x) + 3·log(y) → log(x²·y³)
	let innerArg = one();

	for (const t of logTerms) {
		const sign = t.coeff.sign();
		const shouldLift = shouldLiftCoefficient(t.coeff, true);

		let termArg = t.arg;
		if (shouldLift) {
			termArg = liftCoefficientIntoPower(t.arg, t.coeff);
		}

		if (sign >= 0) {
			innerArg = innerArg.times(termArg);
		} else {
			innerArg = innerArg.times(termArg.invert());
		}
	}

	const logExpr = Expression.toFunction(LOG, [innerArg]);
	const resultTerms = [...otherTerms, logExpr];

	if (resultTerms.length === 1) {
		return resultTerms[0];
	}

	let result = zero();
	for (const term of resultTerms) {
		result = result.plus(term);
	}
	return result;
}

/**
 * Finds the greatest common factor among all log term coefficients.
 * Returns the GCD if all coefficients are integer multiples of it,
 * or null if no useful common factor exists.
 *
 * For example:
 *   coeffs [2, -2]       → 2
 *   coeffs [1/2, -1/2]   → 1/2
 *   coeffs [2, 4, -6]    → 2
 *   coeffs [2, 3]        → 1 (trivial)
 *   coeffs [1/2, 1/3]    → 1/6 (but reduced coeffs become 3, 2 — not simpler)
 *
 * We only return a common factor if it results in at least some coefficients
 * becoming ±1 after division (i.e., the factor is useful for simplification).
 */
function findCommonCoeffFactor(logTerms: LogTerm[]): Expression | null {
	if (logTerms.length < 2) {
		return null;
	}

	// Extract the rational values
	const rats = logTerms.map(t => t.coeff.getMultiplier());

	// Compute GCD of absolute numerators and LCM of denominators
	let gcdNum = rats[0].numerator < 0n ? -rats[0].numerator : rats[0].numerator;
	let lcmDen = rats[0].denominator < 0n ? -rats[0].denominator : rats[0].denominator;

	for (let i = 1; i < rats.length; i++) {
		const num = rats[i].numerator < 0n ? -rats[i].numerator : rats[i].numerator;
		const den = rats[i].denominator < 0n ? -rats[i].denominator : rats[i].denominator;
		gcdNum = bigintGCD(gcdNum, num);
		lcmDen = bigintLCM(lcmDen, den);
	}

	if (gcdNum === 0n) {
		return null;
	}

	// The common factor is gcdNum / lcmDen
	// But this is only useful if it's not 1/1
	if (gcdNum === 1n && lcmDen === 1n) {
		return null;
	}

	// Check that after dividing by common factor, at least one coefficient becomes ±1
	// This ensures the common factor actually simplifies the expression
	const commonRat = `${gcdNum}/${lcmDen}`;
	const commonExpr = Expression.create(commonRat);

	let hasUnitCoeff = false;
	for (const t of logTerms) {
		const reduced = t.coeff.div(commonExpr);
		if (reduced.abs().isOne()) {
			hasUnitCoeff = true;
			break;
		}
	}

	// If no coefficient reduces to ±1, the common factor isn't very helpful
	// unless all reduced coefficients are integers (cleaner than rationals)
	if (!hasUnitCoeff) {
		const allReducedInteger = logTerms.every(t => {
			const reduced = t.coeff.div(commonExpr);
			const rat = reduced.getMultiplier();
			return rat.denominator === 1n || rat.denominator === -1n;
		});
		if (!allReducedInteger) {
			return null;
		}
	}

	return commonExpr;
}

/** BigInt GCD helper */
function bigintGCD(a: bigint, b: bigint): bigint {
	a = a < 0n ? -a : a;
	b = b < 0n ? -b : b;
	while (b > 0n) {
		[a, b] = [b, a % b];
	}
	return a;
}

/** BigInt LCM helper */
function bigintLCM(a: bigint, b: bigint): bigint {
	a = a < 0n ? -a : a;
	b = b < 0n ? -b : b;
	if (a === 0n || b === 0n) {
		return 0n;
	}
	return (a / bigintGCD(a, b)) * b;
}

/**
 * Combines log terms with symbolic coefficients by grouping equal coefficients.
 *
 * Example:
 *   x·log(a) + x·log(b) → x·log(a·b)
 */
function combineSymbolicLogTerms(
	logTerms: LogTerm[],
	otherTerms: Expression[],
	original: Expression
): Expression {
	const groups = new Map<string, LogTerm[]>();

	for (const t of logTerms) {
		// Use abs of coeff as the group key
		const absKey = t.coeff.abs().text();
		if (!groups.has(absKey)) {
			groups.set(absKey, []);
		}
		groups.get(absKey)!.push(t);
	}

	const resultTerms: Expression[] = [...otherTerms];
	let combined = false;

	for (const [, group] of groups) {
		if (group.length < 2) {
			for (const t of group) {
				resultTerms.push(t.original);
			}
			continue;
		}

		combined = true;

		// Separate by sign
		const positive = group.filter(t => t.coeff.sign() >= 0);
		const negative = group.filter(t => t.coeff.sign() < 0);

		let innerArg = one();
		for (const t of positive) {
			innerArg = innerArg.times(t.arg);
		}
		for (const t of negative) {
			innerArg = innerArg.times(t.arg.invert());
		}

		const commonCoeff = positive.length > 0 ? positive[0].coeff : negative[0].coeff.neg();
		const logExpr = Expression.toFunction(LOG, [innerArg]);
		resultTerms.push(commonCoeff.times(logExpr));
	}

	if (!combined) {
		return original;
	}

	if (resultTerms.length === 1) {
		return resultTerms[0];
	}

	let result = zero();
	for (const term of resultTerms) {
		result = result.plus(term);
	}
	return result;
}
