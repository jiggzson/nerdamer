import { Expression } from '../../core/classes/expression/Expression';
import { zero, one, two } from '../../core/classes/expression/shortcuts';
import { SIN, COS, sin, cos } from '../../math/trig';

// ============================================================================
// POWER REDUCTION (trigreduce)
//
// Reduces powers of trig functions using double-angle identities:
//   sin²(u) → (1 - cos(2u)) / 2
//   cos²(u) → (1 + cos(2u)) / 2
//   sin²(u)·cos²(u) → (1 - cos(4u)) / 8   (via sin(2u)²/4)
//
// Higher powers are handled recursively:
//   sin³(u) → sin(u)·sin²(u) → sin(u)·(1 - cos(2u))/2
//   sin⁴(u) → (sin²(u))² → ((1 - cos(2u))/2)² → (3 - 4cos(2u) + cos(4u))/8
// ============================================================================

/**
 * Applies power reduction to a single trig function with an integer power ≥ 2.
 *
 *   sin(u)^(2k) → expanded using repeated application of half-angle
 *   cos(u)^(2k) → expanded using repeated application of half-angle
 *   sin(u)^(2k+1) → sin(u) · [sin(u)^(2k) reduced]
 *   cos(u)^(2k+1) → cos(u) · [cos(u)^(2k) reduced]
 *
 * Only applies when the power is an integer ≥ 2 (or ≤ -2).
 * Fractional powers like sin(x)^(1/2) are left unchanged.
 */
export function reduceTrigPower(e: Expression): Expression {
	if (!e.isFunction(SIN) && !e.isFunction(COS)) {
		return e;
	}

	const p = e.getPower();
	const m = e.getMultiplier();
	const args = e.getArguments();
	if (args.length === 0) {
		return e;
	}

	const u = args[0];
	const isSin = e.isFunction(SIN);

	// Only reduce integer powers with |n| >= 2.
	// The power is an Expression. Check that it's a pure integer by inspecting
	// its Rational multiplier: it must be an integer (denominator === 1n)
	// and the power itself must be a NUM type (no symbolic component).
	if (!p.isNUM()) {
		return e;
	}

	const pRat = p.getMultiplier(); // Rational
	if (pRat.denominator !== 1n && pRat.denominator !== -1n) {
		// Fractional power — not an integer, leave unchanged
		return e;
	}

	const nBig = pRat.numerator / (pRat.denominator < 0n ? -pRat.denominator : pRat.denominator);
	const nAbs = nBig < 0n ? -nBig : nBig;

	if (nAbs < 2n) {
		return e;
	}

	// For negative powers, reduce the positive power and invert
	if (nBig < 0n) {
		const positive = reduceTrigPower(
			isSin
				? sin(u).pow(Expression.create(`${nAbs}`))
				: cos(u).pow(Expression.create(`${nAbs}`))
		);
		return Expression.fromRational(m).times(positive.invert());
	}

	const n = Number(nAbs);
	let result: Expression;

	if (n === 2) {
		// sin²(u) = (1 - cos(2u)) / 2
		// cos²(u) = (1 + cos(2u)) / 2
		const twoU = u.times(two());
		if (isSin) {
			result = one().minus(cos(twoU)).div(two());
		} else {
			result = one().plus(cos(twoU)).div(two());
		}
	} else if (n % 2 === 0) {
		// Even power: sin^(2k)(u) = (sin²(u))^k, then reduce sin²
		const halfPower = n / 2;
		const squared = reduceTrigPower(isSin ? sin(u).pow(two()) : cos(u).pow(two()));
		result = squared.pow(Expression.create(`${halfPower}`));
	} else {
		// Odd power: sin^(2k+1)(u) = sin(u) · sin^(2k)(u)
		const evenPart = reduceTrigPower(
			isSin
				? sin(u).pow(Expression.create(`${n - 1}`))
				: cos(u).pow(Expression.create(`${n - 1}`))
		);
		result = (isSin ? sin(u) : cos(u)).times(evenPart);
	}

	if (!m.isOne()) {
		result = result.times(Expression.fromRational(m));
	}

	return result;
}

/**
 * Applies power reduction to all trig powers in an expression.
 * Descends into sums and products.
 */
export function trigReduce(x: Expression): Expression {
	// Direct trig function
	if ((x.isFunction(SIN) || x.isFunction(COS)) && x.getPower().isInteger()) {
		const p = x.getPower();
		if (p.abs().gte(two())) {
			return reduceTrigPower(x);
		}
	}

	// Sum: reduce each term
	if (x.isSum()) {
		const m = x.getMultiplier();
		const p = x.getPower();
		let result = zero();
		for (const term of x.elementsArray()) {
			result = result.plus(trigReduce(term));
		}
		if (!p.isOne()) {
			result = result.pow(p);
		}
		if (!m.isOne()) {
			result = result.times(Expression.fromRational(m));
		}
		return result;
	}

	// Product: reduce each factor
	if (x.isProduct()) {
		const m = x.getMultiplier();
		const p = x.getPower();
		let result = one();
		for (const element of x.elementsArray()) {
			result = result.times(trigReduce(element));
		}
		if (!p.isOne()) {
			result = result.pow(p);
		}
		if (!m.isOne()) {
			result = result.times(Expression.fromRational(m));
		}
		return result;
	}

	return x;
}

// ============================================================================
// DOUBLE ANGLE IDENTITIES
//
// Expansion direction (useful for simplification):
//   sin(2u) → 2·sin(u)·cos(u)
//   cos(2u) → cos²(u) - sin²(u)
//          → 2·cos²(u) - 1
//          → 1 - 2·sin²(u)
//
// Contraction direction (useful for reducing products):
//   2·sin(u)·cos(u) → sin(2u)
//   cos²(u) - sin²(u) → cos(2u)
// ============================================================================

/**
 * Expands double angle: sin(2u) → 2·sin(u)·cos(u)
 * Only applies if the argument has a factor of 2.
 */
function expandDoubleAngleSin(e: Expression): Expression | null {
	if (!e.isFunction(SIN)) {
		return null;
	}

	const args = e.getArguments();
	if (args.length === 0) {
		return null;
	}

	const arg = args[0];
	const m = e.getMultiplier();
	const p = e.getPower();

	// Check if argument is 2*u for some u
	const u = extractHalfArgument(arg);
	if (!u) {
		return null;
	}

	// sin(2u) = 2·sin(u)·cos(u)
	let result = two().times(sin(u)).times(cos(u));
	if (!p.isOne()) {
		result = result.pow(p);
	}
	if (!m.isOne()) {
		result = result.times(Expression.fromRational(m));
	}
	return result;
}

/**
 * Expands double angle: cos(2u) → cos²(u) - sin²(u)
 * Only applies if the argument has a factor of 2.
 */
function expandDoubleAngleCos(e: Expression): Expression | null {
	if (!e.isFunction(COS)) {
		return null;
	}

	const args = e.getArguments();
	if (args.length === 0) {
		return null;
	}

	const arg = args[0];
	const m = e.getMultiplier();
	const p = e.getPower();

	const u = extractHalfArgument(arg);
	if (!u) {
		return null;
	}

	// cos(2u) = cos²(u) - sin²(u)
	let result = cos(u).pow(two()).minus(sin(u).pow(two()));
	if (!p.isOne()) {
		result = result.pow(p);
	}
	if (!m.isOne()) {
		result = result.times(Expression.fromRational(m));
	}
	return result;
}

/**
 * If the argument is of the form 2*u, returns u. Otherwise returns null.
 */
function extractHalfArgument(arg: Expression): Expression | null {
	const m = arg.getMultiplier();
	// Check if the multiplier is even (has a factor of 2)
	if (m.numerator % 2n === 0n) {
		// Divide multiplier by 2
		const half = arg.div(two());
		return half;
	}
	return null;
}

/**
 * Expands all double-angle trig functions in an expression.
 */
export function expandDoubleAngle(x: Expression): Expression {
	if (x.isFunction(SIN)) {
		const expanded = expandDoubleAngleSin(x);
		if (expanded) {
			return expanded;
		}
	}
	if (x.isFunction(COS)) {
		const expanded = expandDoubleAngleCos(x);
		if (expanded) {
			return expanded;
		}
	}

	if (x.isSum()) {
		const m = x.getMultiplier();
		const p = x.getPower();
		let result = zero();
		for (const term of x.elementsArray()) {
			result = result.plus(expandDoubleAngle(term));
		}
		if (!p.isOne()) {
			result = result.pow(p);
		}
		if (!m.isOne()) {
			result = result.times(Expression.fromRational(m));
		}
		return result;
	}

	if (x.isProduct()) {
		const m = x.getMultiplier();
		const p = x.getPower();
		let result = one();
		for (const element of x.elementsArray()) {
			result = result.times(expandDoubleAngle(element));
		}
		if (!p.isOne()) {
			result = result.pow(p);
		}
		if (!m.isOne()) {
			result = result.times(Expression.fromRational(m));
		}
		return result;
	}

	return x;
}

// ============================================================================
// PRODUCT-TO-SUM IDENTITIES
//
//   sin(a)·cos(b) = (1/2)[sin(a+b) + sin(a-b)]
//   cos(a)·cos(b) = (1/2)[cos(a-b) + cos(a+b)]
//   sin(a)·sin(b) = (1/2)[cos(a-b) - cos(a+b)]
//
// Also the contraction:
//   2·sin(u)·cos(u) → sin(2u)
// ============================================================================

interface TrigFactor {
	fn: string; // 'sin' or 'cos'
	arg: Expression;
	power: Expression;
}

/**
 * Extracts sin/cos factors from a product for product-to-sum conversion.
 * Only extracts factors with power = 1 (linear trig factors).
 */
function extractTrigFactors(x: Expression): { trigFactors: TrigFactor[]; rest: Expression } {
	const trigFactors: TrigFactor[] = [];
	let rest = Expression.fromRational(x.getMultiplier());

	if (!x.isProduct()) {
		// Check if x itself is a single trig function
		if ((x.isFunction(SIN) || x.isFunction(COS)) && x.getPower().eq(one())) {
			const args = x.getArguments();
			if (args.length > 0) {
				trigFactors.push({
					fn: x.isFunction(SIN) ? SIN : COS,
					arg: args[0],
					power: x.getPower(),
				});
				rest = Expression.fromRational(x.getMultiplier());
				return { trigFactors, rest };
			}
		}
		return { trigFactors: [], rest: x };
	}

	for (const element of x.elementsArray()) {
		if ((element.isFunction(SIN) || element.isFunction(COS)) && element.getPower().eq(one())) {
			const args = element.getArguments();
			if (args.length > 0) {
				trigFactors.push({
					fn: element.isFunction(SIN) ? SIN : COS,
					arg: args[0],
					power: element.getPower(),
				});
				// Include the element's own multiplier in rest
				if (!element.getMultiplier().isOne()) {
					rest = rest.times(Expression.fromRational(element.getMultiplier()));
				}
				continue;
			}
		}
		rest = rest.times(element);
	}

	return { trigFactors, rest };
}

/**
 * Converts a product of two trig functions to a sum using product-to-sum identities.
 *
 * sin(a)·cos(b) → (1/2)[sin(a+b) + sin(a-b)]
 * cos(a)·cos(b) → (1/2)[cos(a-b) + cos(a+b)]
 * sin(a)·sin(b) → (1/2)[cos(a-b) - cos(a+b)]
 */
export function productToSum(x: Expression): Expression {
	const { trigFactors, rest } = extractTrigFactors(x);

	// Need at least 2 trig factors to apply product-to-sum
	if (trigFactors.length < 2) {
		return x;
	}

	// Process pairs of trig factors
	let result: Expression = rest;
	let i = 0;

	while (i < trigFactors.length - 1) {
		const f1 = trigFactors[i];
		const f2 = trigFactors[i + 1];
		const a = f1.arg;
		const b = f2.arg;
		const aPlusB = a.plus(b);
		const aMinusB = a.minus(b);
		const half = one().div(two());

		let converted: Expression;

		if (f1.fn === SIN && f2.fn === COS) {
			// sin(a)·cos(b) = (1/2)[sin(a+b) + sin(a-b)]
			converted = half.times(sin(aPlusB).plus(sin(aMinusB)));
		} else if (f1.fn === COS && f2.fn === SIN) {
			// cos(a)·sin(b) = (1/2)[sin(a+b) - sin(a-b)]
			converted = half.times(sin(aPlusB).minus(sin(aMinusB)));
		} else if (f1.fn === COS && f2.fn === COS) {
			// cos(a)·cos(b) = (1/2)[cos(a-b) + cos(a+b)]
			converted = half.times(cos(aMinusB).plus(cos(aPlusB)));
		} else {
			// sin(a)·sin(b) = (1/2)[cos(a-b) - cos(a+b)]
			converted = half.times(cos(aMinusB).minus(cos(aPlusB)));
		}

		result = result.times(converted);
		i += 2;
	}

	// If there's an unpaired trig factor, multiply it back in
	if (i < trigFactors.length) {
		const leftover = trigFactors[i];
		const fn = leftover.fn === SIN ? sin : cos;
		result = result.times(fn(leftover.arg));
	}

	return result;
}

/**
 * Contracts sin(u)·cos(u) products into double-angle form.
 *
 *   k·sin(u)·cos(u) → (k/2)·sin(2u)
 *
 * This is the reverse of expandDoubleAngle for sin.
 */
export function contractToDoubleAngle(x: Expression): Expression {
	if (!x.isProduct()) {
		return x;
	}

	const { trigFactors, rest } = extractTrigFactors(x);

	// Look for sin(u)·cos(u) pairs with matching arguments
	const usedIndices = new Set<number>();
	let result = rest;

	for (let i = 0; i < trigFactors.length; i++) {
		if (usedIndices.has(i)) {
			continue;
		}

		for (let j = i + 1; j < trigFactors.length; j++) {
			if (usedIndices.has(j)) {
				continue;
			}

			const a = trigFactors[i];
			const b = trigFactors[j];

			// Check for sin(u)·cos(u) or cos(u)·sin(u) with same argument
			if (
				a.arg.eq(b.arg) &&
				((a.fn === SIN && b.fn === COS) || (a.fn === COS && b.fn === SIN))
			) {
				// sin(u)·cos(u) = (1/2)·sin(2u)
				const u = a.arg;
				result = result.times(
					one()
						.div(two())
						.times(sin(u.times(two())))
				);
				usedIndices.add(i);
				usedIndices.add(j);
				break;
			}
		}
	}

	// Add back any unmatched trig factors
	for (let i = 0; i < trigFactors.length; i++) {
		if (!usedIndices.has(i)) {
			const f = trigFactors[i];
			const fn = f.fn === SIN ? sin : cos;
			result = result.times(fn(f.arg));
		}
	}

	return result;
}
