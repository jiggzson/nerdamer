import { Expression } from '../../core/classes/expression/Expression';
import { zero, one, two } from '../../core/classes/expression/shortcuts';
import { SIN, COS, sin, cos } from '../../math/trig';

const TAN = 'tan';
const SEC = 'sec';
const CSC = 'csc';
const COT = 'cot';

interface TrigTerm {
	coeff: Expression; // everything except the trig function (including multiplier)
	trigFn: string; // 'sin' or 'cos'
	arg: Expression; // the argument to sin/cos
	trigPower: Expression; // the power on the trig function (must be 2 for Pythagorean)
	original: Expression; // the original term
}

/**
 * Extracts trig information from a sum term.
 * Returns null if the term doesn't contain a sin^2 or cos^2.
 */
function extractTrigSquared(term: Expression): TrigTerm | null {
	// Case 1: Direct trig function, e.g. sin(x)^2 or 3*cos(x)^2
	if ((term.isFunction(SIN) || term.isFunction(COS)) && term.getPower().eq(two())) {
		return {
			coeff: Expression.fromRational(term.getMultiplier()),
			trigFn: term.isFunction(SIN) ? SIN : COS,
			arg: term.getArguments()[0],
			trigPower: term.getPower(),
			original: term,
		};
	}

	// Case 2: Product containing a trig function, e.g. x*cos(x)^2
	if (term.isProduct()) {
		let trigElement: Expression | null = null;
		let trigFn: string | null = null;
		let trigMultiplier = one();
		const coeffParts: Expression[] = [];

		for (const element of term.elementsArray()) {
			if (
				!trigElement &&
				(element.isFunction(SIN) || element.isFunction(COS)) &&
				element.getPower().eq(two())
			) {
				trigElement = element;
				trigFn = element.isFunction(SIN) ? SIN : COS;
				trigMultiplier = Expression.fromRational(element.getMultiplier());
			} else {
				coeffParts.push(element);
			}
		}

		if (trigElement && trigFn) {
			let coeff = Expression.fromRational(term.getMultiplier());
			for (const part of coeffParts) {
				coeff = coeff.times(part);
			}
			coeff = coeff.times(trigMultiplier);

			return {
				coeff,
				trigFn,
				arg: (trigElement as Expression).getArguments()[0],
				trigPower: (trigElement as Expression).getPower(),
				original: term,
			};
		}
	}

	return null;
}

// ============================================================================
// Extended Pythagorean: sec²/tan² and csc²/cot²
// ============================================================================

interface DerivedTrigTerm {
	coeff: Expression;
	trigFn: string; // 'tan', 'sec', 'csc', 'cot'
	arg: Expression;
	trigPower: Expression;
	original: Expression;
}

/**
 * Extracts tan^2, sec^2, csc^2, or cot^2 terms from a sum element.
 */
function extractDerivedTrigSquared(term: Expression): DerivedTrigTerm | null {
	const fns = [TAN, SEC, CSC, COT];

	// Case 1: Direct function, e.g. sec(x)^2
	for (const fn of fns) {
		if (term.isFunction(fn) && term.getPower().eq(two())) {
			return {
				coeff: Expression.fromRational(term.getMultiplier()),
				trigFn: fn,
				arg: term.getArguments()[0],
				trigPower: term.getPower(),
				original: term,
			};
		}
	}

	// Case 2: Product containing a derived trig function
	if (term.isProduct()) {
		let trigElement: Expression | null = null;
		let trigFn: string | null = null;
		let trigMultiplier = one();
		const coeffParts: Expression[] = [];

		for (const element of term.elementsArray()) {
			if (!trigElement) {
				for (const fn of fns) {
					if (element.isFunction(fn) && element.getPower().eq(two())) {
						trigElement = element;
						trigFn = fn;
						trigMultiplier = Expression.fromRational(element.getMultiplier());
						break;
					}
				}
				if (!trigElement) {
					coeffParts.push(element);
				}
			} else {
				coeffParts.push(element);
			}
		}

		if (trigElement && trigFn) {
			let coeff = Expression.fromRational(term.getMultiplier());
			for (const part of coeffParts) {
				coeff = coeff.times(part);
			}
			coeff = coeff.times(trigMultiplier);

			return {
				coeff,
				trigFn,
				arg: trigElement.getArguments()[0],
				trigPower: trigElement.getPower(),
				original: term,
			};
		}
	}

	return null;
}

/**
 * Simplifies trig identities in a sum expression.
 *
 * Applies:
 *   a·sin(u)² + a·cos(u)² = a                (Pythagorean)
 *   a·sec(u)² - a·tan(u)² = a                (sec²-tan²=1)
 *   a·csc(u)² - a·cot(u)² = a                (csc²-cot²=1)
 *   Partial Pythagorean for mismatched coefficients
 */
export function simplifyTrigSum(x: Expression): Expression {
	if (!x.isSum()) {
		return x;
	}

	// Step 1: Apply the standard sin²+cos²=1 Pythagorean identity
	let result = simplifyPythagorean(x);

	// Step 2: Apply sec²-tan²=1 and csc²-cot²=1 identities
	if (result.isSum()) {
		result = simplifyDerivedPythagorean(result);
	}

	return result;
}

/**
 * Standard Pythagorean: a·sin²(u) + a·cos²(u) = a
 * With partial support for mismatched coefficients.
 */
function simplifyPythagorean(x: Expression): Expression {
	if (!x.isSum()) {
		return x;
	}

	const trigTerms: TrigTerm[] = [];
	const otherTerms: Expression[] = [];

	for (const term of x.elementsArray()) {
		const info = extractTrigSquared(term);
		if (info) {
			trigTerms.push(info);
		} else {
			otherTerms.push(term);
		}
	}

	const hasSin = trigTerms.some(t => t.trigFn === SIN);
	const hasCos = trigTerms.some(t => t.trigFn === COS);
	if (!hasSin || !hasCos) {
		return x;
	}

	const byArg = new Map<string, { sins: TrigTerm[]; coss: TrigTerm[] }>();
	for (const t of trigTerms) {
		const key = t.arg.text();
		if (!byArg.has(key)) {
			byArg.set(key, { sins: [], coss: [] });
		}
		const group = byArg.get(key)!;
		if (t.trigFn === SIN) {
			group.sins.push(t);
		} else {
			group.coss.push(t);
		}
	}

	const resultTerms: Expression[] = [...otherTerms];

	for (const [, group] of byArg) {
		const { sins, coss } = group;

		const usedSins = new Set<number>();
		const usedCoss = new Set<number>();

		// Step 1: Full Pythagorean cancellation for matching coefficients
		for (let i = 0; i < sins.length; i++) {
			for (let j = 0; j < coss.length; j++) {
				if (usedSins.has(i) || usedCoss.has(j)) {
					continue;
				}

				if (sins[i].coeff.eq(coss[j].coeff)) {
					resultTerms.push(sins[i].coeff);
					usedSins.add(i);
					usedCoss.add(j);
				}
			}
		}

		// Step 2: Partial Pythagorean for mismatched coefficients
		for (let i = 0; i < sins.length; i++) {
			if (usedSins.has(i)) {
				continue;
			}
			for (let j = 0; j < coss.length; j++) {
				if (usedCoss.has(j)) {
					continue;
				}

				if (sins[i].arg.eq(coss[j].arg)) {
					const a = sins[i].coeff;
					const b = coss[j].coeff;
					const diff = a.minus(b);

					let smaller: Expression;
					let larger: Expression;
					let remainderFn: Expression;

					if (diff.sign() === 1) {
						smaller = b;
						larger = a;
						remainderFn = sin(sins[i].arg).pow(two());
					} else {
						smaller = a;
						larger = b;
						remainderFn = cos(coss[j].arg).pow(two());
					}

					const scale = smaller.getDenominator();
					const scaledSmaller = smaller.times(scale);
					const scaledRemainder = larger.minus(smaller).times(scale);
					const inner = scaledSmaller.plus(scaledRemainder.times(remainderFn));
					resultTerms.push(one().div(scale).times(inner));

					usedSins.add(i);
					usedCoss.add(j);
				}
			}
		}

		// Add back unmatched terms
		for (let i = 0; i < sins.length; i++) {
			if (!usedSins.has(i)) {
				resultTerms.push(sins[i].original);
			}
		}
		for (let j = 0; j < coss.length; j++) {
			if (!usedCoss.has(j)) {
				resultTerms.push(coss[j].original);
			}
		}
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

/**
 * Derived Pythagorean identities applied to sums:
 *
 *   a·sec(u)² - a·tan(u)² = a     (from 1 + tan² = sec²)
 *   a·csc(u)² - a·cot(u)² = a     (from 1 + cot² = csc²)
 *
 * Also handles:
 *   a·sec(u)² = a + a·tan(u)²     (rewrite sec² as 1+tan²)
 *   a·tan(u)² = a·sec(u)² - a     (rewrite tan² as sec²-1)
 */
function simplifyDerivedPythagorean(x: Expression): Expression {
	if (!x.isSum()) {
		return x;
	}

	const derivedTerms: DerivedTrigTerm[] = [];
	const otherTerms: Expression[] = [];

	for (const term of x.elementsArray()) {
		const info = extractDerivedTrigSquared(term);
		if (info) {
			derivedTerms.push(info);
		} else {
			otherTerms.push(term);
		}
	}

	if (derivedTerms.length < 2) {
		return x;
	}

	// Group by argument
	const byArg = new Map<
		string,
		{
			secs: DerivedTrigTerm[];
			tans: DerivedTrigTerm[];
			cscs: DerivedTrigTerm[];
			cots: DerivedTrigTerm[];
		}
	>();
	for (const t of derivedTerms) {
		const key = t.arg.text();
		if (!byArg.has(key)) {
			byArg.set(key, { secs: [], tans: [], cscs: [], cots: [] });
		}
		const group = byArg.get(key)!;
		if (t.trigFn === SEC) {
			group.secs.push(t);
		} else if (t.trigFn === TAN) {
			group.tans.push(t);
		} else if (t.trigFn === CSC) {
			group.cscs.push(t);
		} else if (t.trigFn === COT) {
			group.cots.push(t);
		}
	}

	const resultTerms: Expression[] = [...otherTerms];

	for (const [, group] of byArg) {
		const { secs, tans, cscs, cots } = group;

		const usedSecs = new Set<number>();
		const usedTans = new Set<number>();
		const usedCscs = new Set<number>();
		const usedCots = new Set<number>();

		// sec²(u) - tan²(u) = 1 → a·sec²(u) + (-a)·tan²(u) = a
		for (let i = 0; i < secs.length; i++) {
			for (let j = 0; j < tans.length; j++) {
				if (usedSecs.has(i) || usedTans.has(j)) {
					continue;
				}

				// sec² coeff is a, tan² coeff is -a → result is a
				const secCoeff = secs[i].coeff;
				const tanCoeff = tans[j].coeff;

				if (secCoeff.eq(tanCoeff.neg())) {
					resultTerms.push(secCoeff);
					usedSecs.add(i);
					usedTans.add(j);
				}
			}
		}

		// csc²(u) - cot²(u) = 1 → a·csc²(u) + (-a)·cot²(u) = a
		for (let i = 0; i < cscs.length; i++) {
			for (let j = 0; j < cots.length; j++) {
				if (usedCscs.has(i) || usedCots.has(j)) {
					continue;
				}

				const cscCoeff = cscs[i].coeff;
				const cotCoeff = cots[j].coeff;

				if (cscCoeff.eq(cotCoeff.neg())) {
					resultTerms.push(cscCoeff);
					usedCscs.add(i);
					usedCots.add(j);
				}
			}
		}

		// Add back unmatched terms
		for (let i = 0; i < secs.length; i++) {
			if (!usedSecs.has(i)) {
				resultTerms.push(secs[i].original);
			}
		}
		for (let j = 0; j < tans.length; j++) {
			if (!usedTans.has(j)) {
				resultTerms.push(tans[j].original);
			}
		}
		for (let i = 0; i < cscs.length; i++) {
			if (!usedCscs.has(i)) {
				resultTerms.push(cscs[i].original);
			}
		}
		for (let j = 0; j < cots.length; j++) {
			if (!usedCots.has(j)) {
				resultTerms.push(cots[j].original);
			}
		}
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
