/**
 * @module doubleExponential
 *
 * Numerical integration by the double exponential (DE) formula of Takahasi and Mori, in its
 * finite-interval form, often called tanh-sinh quadrature, in Decimal arithmetic. Written
 * from the published method rather than ported from another library.
 *
 * References:
 * - H. Takahasi, M. Mori, "Double Exponential Formulas for Numerical Integration",
 *   Publ. RIMS Kyoto Univ. 9(3) (1974) 721-741. The original paper.
 *   https://doi.org/10.2977/prims/1195192451
 * - M. Mori, "Discovery of the Double Exponential Transformation and Its Developments",
 *   Publ. RIMS Kyoto Univ. 41(4) (2005) 897-935. History and error analysis.
 *   https://doi.org/10.2977/prims/1145474600
 * - D. H. Bailey, K. Jeyabalan, X. S. Li, "A Comparison of Three High-Precision Quadrature
 *   Schemes", Experimental Mathematics 14(3) (2005) 317-329. Behavior at arbitrary precision.
 *   https://projecteuclid.org/euclid.em/1128371757
 * - K. Murota, T. Matsuo, "Double-Exponential Transformation: A Quick Review of a Japanese
 *   Tradition", 2023. https://arxiv.org/pdf/2301.01920
 */

import Decimal from 'decimal.js';

import type { DecimalFn } from './defintDecimal';

/** The deepest level tried. Each level halves the step, so about 1000 evaluations in all. */
const MAX_LEVEL = 7;
/** Levels to complete before trusting two estimates that agree, so sparse samples can't. */
const MIN_LEVEL = 3;
/**
 * Nodes are kept while their weight exceeds 10^-(WEIGHT_DIGITS * precision). Going well past
 * the working precision lets endpoint singularities such as 1/sqrt(x), whose terms decay
 * like sqrt(weight), still converge.
 */
const WEIGHT_DIGITS = 2;

/** A node as its distance from either endpoint of [-1, 1], and its weight. */
type Node = [distance: Decimal, weight: Decimal];

/**
 * Nodes for each level, per precision. Level 0 holds t = 1, 2, 3, ... and each later level
 * holds only the new odd multiples of its step, so levels add up without repeating a point.
 * They don't depend on the integrand, so they are built once and reused.
 */
const nodeTables = new Map<number, Node[][]>();

/** Returns the nodes of `level` at the current precision, building them when first needed. */
function levelNodes(level: number): Node[] {
	const precision = Decimal.precision;
	let table = nodeTables.get(precision);
	if (!table) {
		table = [];
		nodeTables.set(precision, table);
	}
	while (table.length <= level) {
		const current = table.length;
		const halfPi = Decimal.acos(-1).div(2);
		const cutoff = new Decimal(10).pow(-WEIGHT_DIGITS * precision);
		const step = new Decimal(2).pow(-current);
		const increment = current === 0 ? step : step.times(2);
		const nodes: Node[] = [];
		for (let t = step; ; t = t.plus(increment)) {
			const s = halfPi.times(Decimal.sinh(t));
			const c = Decimal.cosh(s);
			const weight = halfPi.times(Decimal.cosh(t)).div(c.times(c));
			if (weight.lt(cutoff)) {
				break;
			}
			// 1 - tanh(s) as 2/(e^(2s)+1), which keeps its digits as it approaches 0.
			nodes.push([new Decimal(2).div(Decimal.exp(s.times(2)).plus(1)), weight]);
		}
		table.push(nodes);
	}
	return table[level];
}

/** The outcome of {@link doubleExponential}. */
export interface QuadratureResult {
	/** The last estimate of the integral. */
	value: Decimal;
	/** Whether two successive levels agreed within the tolerance. */
	converged: boolean;
	/** The estimate of the integral of |f|, which sets the size of rounding in the value. */
	scale: Decimal;
}

/**
 * Integrates f over [a, b] by the double exponential (DE) formula of Takahasi and Mori, in
 * its finite-interval form, often called tanh-sinh quadrature.
 *
 * The substitution x = tanh(pi/2*sinh(t)) crowds the nodes toward both endpoints, so the
 * error falls roughly exponentially with the number of nodes for functions analytic inside
 * the interval, even with integrable singularities at the endpoints. A kink, jump or pole
 * inside the interval slows it down, and those are reported as not converged.
 *
 * Non-finite values are skipped. They only arise at nodes that round onto a singular
 * endpoint, where the weight is negligible.
 *
 * @param f The integrand, evaluated at the current Decimal precision.
 * @param a The lower limit.
 * @param b The upper limit.
 * @param tolerance Converged when two levels differ by at most tolerance times the
 * integral of |f|.
 */
export function doubleExponential(
	f: DecimalFn,
	a: Decimal,
	b: Decimal,
	tolerance: Decimal
): QuadratureResult {
	const center = a.plus(b).div(2);
	const half = b.minus(a).div(2);
	const halfPi = Decimal.acos(-1).div(2);
	const value = (x: Decimal) => {
		const y = f(x);
		return y.isFinite() ? y : new Decimal(0);
	};

	const middle = value(center).times(halfPi);
	let sum = middle;
	let absSum = middle.abs();
	let step = new Decimal(1);
	let previous: Decimal | undefined;
	let scale = new Decimal(0);
	let retval: QuadratureResult | undefined;

	for (let level = 0; level <= MAX_LEVEL && !retval; level++) {
		for (const [distance, weight] of levelNodes(level)) {
			const offset = half.times(distance);
			const upper = value(b.minus(offset));
			const lower = value(a.plus(offset));
			sum = sum.plus(weight.times(upper.plus(lower)));
			// Each side separately, so a symmetric integrand that cancels keeps its scale.
			absSum = absSum.plus(weight.times(upper.abs().plus(lower.abs())));
		}
		const estimate = sum.times(step).times(half);
		scale = absSum.times(step).times(half.abs());
		if (
			previous &&
			level >= MIN_LEVEL &&
			estimate.minus(previous).abs().lte(tolerance.times(scale))
		) {
			retval = { value: estimate, converged: true, scale };
		}
		previous = estimate;
		step = step.div(2);
	}

	return retval ?? { value: previous ?? new Decimal(0), converged: false, scale };
}
