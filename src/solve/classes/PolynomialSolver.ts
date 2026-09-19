import Decimal from 'decimal.js';

import { Complex } from '../../core/classes/complex/Complex';
import { Expression } from '../../core/classes/expression/Expression';
import { Polynomial } from '../../core/classes/polynomial/Polynomial';
import { message, UnexpectedInputError } from '../../core/errors';

const DEFAULT_PRECISION = 50;
const DEFAULT_EPSILON = 1e-14;
const ABERTH_MAX_ITERATIONS = 100;
const ABERTH_INITIAL_ANGLE_OFFSET = 0.4;
const ABERTH_RADIUS_SCALE = 0.9;
const ABERTH_ROOT_SPACING_SCALE = 0.01;
const ABERTH_CONVERGENCE_SCALE = 1e-2;
const NEWTON_MAX_ITERATIONS = 20;
const NEWTON_CONVERGENCE_SCALE = 1e-6;

/**
 * Finds all complex roots of a univariate polynomial numerically.
 *
 * Coefficient arrays use ascending powers: the element at index `k` is the
 * coefficient of `x^k`. Polynomial and string inputs are converted to that
 * representation before solving. Linear and quadratic inputs are handled
 * directly; higher degrees use simultaneous Aberth iteration followed by
 * Newton refinement.
 *
 * @remarks
 * The solver temporarily changes the global `decimal.js` precision while
 * {@link roots} runs and restores the previous precision before returning.
 * The requested precision controls the numerical work, while `epsilon`
 * controls convergence and cleanup of numerical noise. Roots are returned
 * once per polynomial degree, so repeated roots can appear as repeated nearby
 * approximations.
 *
 * This class finds numerical roots; it does not certify completeness or exact
 * multiplicities for ill-conditioned polynomials.
 *
 * @example
 * ```ts
 * const solver = new PolynomialSolver('x^2+1', 'x');
 * const roots = solver.roots();
 * ```
 */
export class PolynomialSolver {
	private degree: number;
	private eps: Decimal;
	private p: Complex[];
	private precision: number;

	/**
	 * Creates a polynomial root solver.
	 *
	 * @param input - A polynomial, a polynomial string, or ascending-power
	 * coefficients.
	 * @param variable - Variable expected in polynomial or string input. It is used to reject
	 * a conflicting variable or multivariate polynomial.
	 * @param precision - Working `decimal.js` precision used while finding roots.
	 * @param epsilon - Numerical convergence tolerance. Defaults to `1e-14`.
	 * @throws {@link core!UnexpectedInputError} If polynomial or string input is multivariate or
	 * uses a variable different from `variable`.
	 */
	constructor(
		input: Decimal[] | Polynomial | string,
		variable?: string,
		precision = DEFAULT_PRECISION,
		epsilon?: Decimal
	) {
		// Allow for input to be a string
		if (typeof input === 'string') {
			input = new Polynomial(input);
		}

		if (Polynomial.isPolynomial(input)) {
			const vars = input.variables;
			// Expect the input to be a univariate polynomial
			if (vars.length > 1 || (vars.length === 1 && variable && vars[0] !== variable)) {
				throw new UnexpectedInputError(message('tooManyUnknowns'));
			}
		}

		const coefficients = Polynomial.isPolynomial(input) ? input.toDecimalArray() : input;
		// Reverse the coefficients so p[0] is the leading coefficient
		this.p = coefficients
			.slice()
			.reverse()
			.map(c => new Complex(c, 0));
		this.degree = this.p.length - 1;
		this.eps = epsilon || new Decimal(DEFAULT_EPSILON);
		this.precision = precision;
	}

	/**
	 * Aberth method: simultaneous approximation of all roots
	 * More stable than deflation for high-degree polynomials
	 */
	private aberthMethod(P: Complex[]): Complex[] {
		const n = P.length - 1;

		// Initialize roots on a circle
		const roots: Complex[] = [];
		const radius = this.cauchyBound(P);

		for (let k = 0; k < n; k++) {
			const angle = new Decimal(2).mul(Math.PI).mul(k).div(n).plus(ABERTH_INITIAL_ANGLE_OFFSET);
			const r = radius
				.mul(ABERTH_RADIUS_SCALE)
				.mul(new Decimal(1).plus(new Decimal(k).mul(ABERTH_ROOT_SPACING_SCALE).div(n)));
			roots.push(new Complex(r.mul(Decimal.cos(angle)), r.mul(Decimal.sin(angle))));
		}

		// Aberth iterations
		for (let iter = 0; iter < ABERTH_MAX_ITERATIONS; iter++) {
			let maxChange = new Decimal(0);
			const newRoots: Complex[] = [];

			for (let i = 0; i < n; i++) {
				const z = roots[i];

				// Compute P(z) and P'(z)
				const [pz, qp] = this.syntheticDiv(n, P, z);

				const [dpz, _] = this.syntheticDiv(n - 1, qp, z);

				if (dpz.abs().lessThan(this.eps)) {
					newRoots.push(z);
					continue;
				}

				// Compute Aberth correction
				const newton = pz.div(dpz);

				// Sum of 1/(z_i - z_j) for j != i
				let sum = new Complex(0, 0);
				for (let j = 0; j < n; j++) {
					if (i !== j) {
						const diff = z.sub(roots[j]);
						if (diff.abs().greaterThan(this.eps)) {
							sum = sum.add(new Complex(1, 0).div(diff));
						}
					}
				}

				// Aberth correction: w = N(z) / (1 - N(z) * sum)
				const denom = new Complex(1, 0).sub(newton.mul(sum));
				const correction = denom.abs().lessThan(this.eps)
					? newton
					: newton.div(denom);
				const newZ = z.sub(correction);

				newRoots.push(newZ);

				const change = correction.abs();
				if (change.greaterThan(maxChange)) {
					maxChange = change;
				}
			}

			for (let i = 0; i < n; i++) {
				roots[i] = newRoots[i];
			}

			// Check convergence
			if (maxChange.lessThan(this.eps.mul(ABERTH_CONVERGENCE_SCALE))) {
				break;
			}
		}

		// Final refinement with Newton's method
		for (let i = 0; i < n; i++) {
			roots[i] = this.newtonRefine(P, roots[i]);
		}

		return roots;
	}
	/**
	 * Compute Cauchy bound for root magnitudes
	 */
	private cauchyBound(P: Complex[]): Decimal {
		const n = P.length - 1;
		let maxRatio = new Decimal(0);

		for (let i = 1; i <= n; i++) {
			const ratio = P[i].abs().div(P[0].abs());
			if (ratio.greaterThan(maxRatio)) {
				maxRatio = ratio;
			}
		}

		return maxRatio.plus(1);
	}
	private complexSqrt(z: Complex): Complex {
		const mag = z.abs();

		if (mag.isZero()) {
			return new Complex(0, 0);
		}

		const x = z.re;
		const y = z.im;

		if (y.abs().lessThan(this.eps)) {
			if (x.greaterThanOrEqualTo(0)) {
				return new Complex(x.sqrt(), 0);
			} else {
				return new Complex(0, x.neg().sqrt());
			}
		}

		const w = mag.plus(x.abs()).div(2).sqrt();

		if (x.greaterThanOrEqualTo(0)) {
			return new Complex(w, y.div(w.mul(2)));
		} else {
			const absY = y.abs();
			const imPart = y.greaterThanOrEqualTo(0) ? w : w.neg();
			return new Complex(absY.div(w.mul(2)), imPart);
		}
	}

	private finalize(
		roots: Complex[],
		asExpressions: boolean,
		precision: number,
		cleanupComponents = true
	) {
		// Restore the precision
		Decimal.set({ precision: precision });
		if (asExpressions) {
			return roots.map(root => {
				let re = root.re;
				let im = root.im;

				if (cleanupComponents) {
					const magnitude = root.abs();
					const componentTolerance = magnitude.mul(this.eps);
					re = root.re.abs().lt(componentTolerance) ? new Decimal(0) : root.re;
					im = root.im.abs().lt(componentTolerance) ? new Decimal(0) : root.im;
				}

				const retval = Expression.create(re).plus(Expression.Img().times(im));
				return retval;
			});
		}
		return roots;
	}

	/**
	 * Refine a single root using Newton's method
	 */
	private newtonRefine(P: Complex[], z: Complex): Complex {
		for (let iter = 0; iter < NEWTON_MAX_ITERATIONS; iter++) {
			const [pz, qp] = this.syntheticDiv(P.length - 1, P, z);

			if (pz.abs().lessThan(this.eps.mul(NEWTON_CONVERGENCE_SCALE))) {
				break;
			}

			const [dpz, _] = this.syntheticDiv(P.length - 2, qp, z);

			if (dpz.abs().lessThan(this.eps)) {
				break;
			}

			const correction = pz.div(dpz);
			const newZ = z.sub(correction);

			if (correction.abs().lessThan(this.eps.mul(NEWTON_CONVERGENCE_SCALE).mul(newZ.abs().plus(1)))) {
				z = newZ;
				break;
			}

			z = newZ;
		}

		return z;
	}

	private solveQuadratic(p: Complex[]): [Complex, Complex] {
		const a = p[0];
		const b = p[1];
		const c = p[2];

		const b2 = b.mul(b);
		const ac4 = a.mul(c).scale(4);
		const disc = b2.sub(ac4);

		const sqrtDisc = this.complexSqrt(disc);
		const twoA = a.scale(2);
		const negB = b.neg();

		return [negB.add(sqrtDisc).div(twoA), negB.sub(sqrtDisc).div(twoA)];
	}

	/**
	 * Synthetic division
	 * Returns [P(s), quotient Q] where P(x) = (x-s)*Q(x) + P(s)
	 */
	private syntheticDiv(n: number, P: Complex[], s: Complex): [Complex, Complex[]] {
		const Q: Complex[] = [];
		let b = P[0];
		Q[0] = b;

		for (let i = 1; i <= n; i++) {
			b = b.mul(s).add(P[i]);
			if (i < n) {
				Q[i] = b;
			}
		}

		return [b, Q];
	}

	/**
	 * Computes the roots of the configured polynomial.
	 *
	 * Leading zero coefficients are ignored. A constant or zero coefficient
	 * array produces an empty result. Passing `false` returns the numeric
	 * {@link Complex} values directly; otherwise each root is converted to an
	 * {@link Expression} after restoring the caller's Decimal precision.
	 *
	 * @param asExpressions - Whether to convert roots to symbolic expressions.
	 * Defaults to `true`.
	 * @returns One root value per effective polynomial degree, including repeated
	 * numerical approximations for repeated roots.
	 */
	roots(asExpressions?: true): Expression[];
	roots(asExpressions?: false): Complex[];
	roots(asExpressions = true) {
		// Store the currently used precision
		const precision = Decimal.precision;
		// Set the precision to a high number. Default = 50
		Decimal.set({ precision: this.precision });

		// Remove leading zeros and normalize
		let poly = [...this.p];
		let deg = this.degree;

		while (deg > 0 && poly[0].re.isZero() && poly[0].im.isZero()) {
			poly.shift();
			deg--;
		}

		if (deg === 0) {
			return this.finalize([], asExpressions, precision);
		}

		const lead = poly[0];
		poly = poly.map(c => c.div(lead));

		if (deg === 1) {
			return this.finalize([poly[1].neg()], asExpressions, precision);
		}

		if (deg === 2) {
			// Quadratic roots are computed analytically, so preserve small components instead of
			// treating them as iterative noise.
			return this.finalize(this.solveQuadratic(poly), asExpressions, precision, false);
		}

		// For degree >= 3, use Aberth method for better numerical stability
		const roots = this.aberthMethod(poly);

		return this.finalize(roots, asExpressions, precision);
	}
}
