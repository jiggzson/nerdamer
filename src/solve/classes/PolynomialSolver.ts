import Decimal from 'decimal.js';

import { Complex } from '../../core/classes/complex/Complex';
import { Expression } from '../../core/classes/expression/Expression';
import { Polynomial } from '../../core/classes/polynomial/Polynomial';
import { message, PolynomialError, UnexpectedInputError } from '../../core/errors';
import { LCM } from '../../core/functions/bigint/bigint';

const DEFAULT_PRECISION = 50;
const DEFAULT_EPSILON = 1e-14;
const ABERTH_MAX_ITERATIONS = 100;
const ABERTH_INITIAL_ANGLE_OFFSET = 0.4;
const ABERTH_RADIUS_SCALE = 0.9;
const ABERTH_ROOT_SPACING_SCALE = 0.01;
const ABERTH_CONVERGENCE_SCALE = 1e-2;
const NEWTON_MAX_ITERATIONS = 20;
const NEWTON_CONVERGENCE_SCALE = 1e-6;
const NATIVE_EPSILON_SCALE = 16;

type NativeComplex = {
	re: number;
	im: number;
};

/**
 * Finds all complex roots of a univariate polynomial numerically.
 *
 * Coefficient arrays use ascending powers: the element at index `k` is the
 * coefficient of `x^k`. Expression, Polynomial, and string inputs are converted directly
 * to numerical complex coefficients before solving. Linear and quadratic inputs are handled
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
	 * @param input - A polynomial expression, Polynomial, polynomial string, or ascending-power
	 * Decimal coefficients.
	 * @param variable - Variable expected in polynomial or string input. It is used to reject
	 * a conflicting variable or multivariate polynomial.
	 * @param precision - Working `decimal.js` precision used while finding roots.
	 * @param epsilon - Numerical convergence tolerance. Defaults to `1e-14`.
	 * @throws {@link core!UnexpectedInputError} If symbolic input is multivariate, uses a
	 * variable different from `variable`, or has nonnumeric coefficients.
	 */
	constructor(
		input: Decimal[] | Polynomial | Expression | string,
		variable?: string,
		precision = DEFAULT_PRECISION,
		epsilon?: Decimal
	) {
		let coefficients: Complex[];

		if (Array.isArray(input)) {
			coefficients = input.map(coefficient => new Complex(coefficient, 0));
		} else {
			const polynomialInput = Polynomial.isPolynomial(input);
			const expression = polynomialInput
				? input.getExpression()
				: typeof input === 'string'
					? Expression.create(input)
					: input;
			const variables = polynomialInput ? input.variables : expression.variables();

			if (!expression.isPolynomialLike()) {
				throw new PolynomialError(message('notAPolynomial'));
			}

			if (
				variables.length > 1 ||
				(variables.length === 1 && variable && variables[0] !== variable)
			) {
				throw new UnexpectedInputError(message('tooManyUnknowns'));
			}

			const coefficientVariable = variable ?? variables[0];
			const coefficientExpressions =
				coefficientVariable === undefined
					? [expression]
					: expression.coeffs(coefficientVariable).toArray();

			const numericComponents = coefficientExpressions.map(coefficient => {
				const real = coefficient.realPart();
				const imaginary = coefficient.imagPart();

				if (!real.isNUM() || !imaginary.isNUM()) {
					throw new UnexpectedInputError(
						message('wrongInput', {
							expected: 'numeric polynomial coefficients',
							received: coefficient.text(),
						})
					);
				}

				return {
					real: real.getMultiplier(),
					imaginary: imaginary.getMultiplier(),
				};
			});

			const exactRationals = numericComponents.every(
				component => !component.real.asDecimal && !component.imaginary.asDecimal
			);

			if (exactRationals) {
				const commonDenominator = LCM(
					...numericComponents.flatMap(component => [
						component.real.denominator,
						component.imaginary.denominator,
					])
				);
				coefficients = numericComponents.map(component => {
					const real =
						component.real.numerator *
						(commonDenominator / component.real.denominator);
					const imaginary =
						component.imaginary.numerator *
						(commonDenominator / component.imaginary.denominator);

					return new Complex(new Decimal(String(real)), new Decimal(String(imaginary)));
				});
			} else {
				coefficients = numericComponents.map(
					component =>
						new Complex(component.real.toDecimal(), component.imaginary.toDecimal())
				);
			}
		}

		// Reverse the coefficients so p[0] is the leading coefficient
		this.p = coefficients.slice().reverse();
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
		const radius = this.rootMagnitudeBound(P);

		for (let k = 0; k < n; k++) {
			const angle = new Decimal(2).mul(Math.PI).mul(k).div(n).plus(ABERTH_INITIAL_ANGLE_OFFSET);
			const r = radius
				.mul(ABERTH_RADIUS_SCALE)
				.mul(new Decimal(1).plus(new Decimal(k).mul(ABERTH_ROOT_SPACING_SCALE).div(n)));
			roots.push(new Complex(r.mul(Decimal.cos(angle)), r.mul(Decimal.sin(angle))));
		}

		const epsSquared = this.eps.mul(this.eps);
		const convergenceTolerance = this.eps.mul(ABERTH_CONVERGENCE_SCALE);
		const convergenceToleranceSquared = convergenceTolerance.mul(convergenceTolerance);

		// Aberth iterations
		for (let iter = 0; iter < ABERTH_MAX_ITERATIONS; iter++) {
			let maxChangeSquared = new Decimal(0);
			const newRoots: Complex[] = [];

			for (let i = 0; i < n; i++) {
				const z = roots[i];

				// Compute P(z) and P'(z) together.
				const [pz, dpz] = this.evaluateWithDerivative(P, z);

				if (dpz.absSquared().lessThan(epsSquared)) {
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
						if (diff.absSquared().greaterThan(epsSquared)) {
							sum = sum.add(diff.reciprocal());
						}
					}
				}

				// Aberth correction: w = N(z) / (1 - N(z) * sum)
				const denom = new Complex(1, 0).sub(newton.mul(sum));
				const correction = denom.absSquared().lessThan(epsSquared)
					? newton
					: newton.div(denom);
				const newZ = z.sub(correction);

				newRoots.push(newZ);

				const changeSquared = correction.absSquared();
				if (changeSquared.greaterThan(maxChangeSquared)) {
					maxChangeSquared = changeSquared;
				}
			}

			for (let i = 0; i < n; i++) {
				roots[i] = newRoots[i];
			}

			// Check convergence
			if (maxChangeSquared.lessThan(convergenceToleranceSquared)) {
				break;
			}
		}

		// Final refinement with Newton's method
		for (let i = 0; i < n; i++) {
			roots[i] = this.newtonRefine(P, roots[i]);
		}

		return roots;
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
	/**
	 * Evaluates a polynomial and its derivative together using Horner's method.
	 */
	private evaluateWithDerivative(P: Complex[], z: Complex): [Complex, Complex] {
		const n = P.length - 1;
		let value = P[0];
		let derivative = P[0];

		for (let i = 1; i < n; i++) {
			value = value.mul(z).add(P[i]);
			derivative = derivative.mul(z).add(value);
		}

		value = value.mul(z).add(P[n]);
		return [value, derivative];
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

	private isNumericalRoot(root: Complex): boolean {
		let residual = this.p[0];
		let scale = this.p[0].abs();
		const magnitude = root.abs();

		for (let i = 1; i < this.p.length; i++) {
			residual = residual.mul(root).add(this.p[i]);
			scale = scale.mul(magnitude).plus(this.p[i].abs());
		}

		const tolerance = this.eps.mul(scale.plus(1));
		return residual.absSquared().lte(tolerance.mul(tolerance));
	}

	/**
	 * Uses native double-precision arithmetic to locate starting points for Decimal refinement.
	 *
	 * Returning `null` leaves the existing Decimal Aberth implementation responsible for the
	 * complete solve.
	 */
	private nativeAberthSeeds(P: Complex[]): Complex[] | null {
		const n = P.length - 1;
		const nativeP: NativeComplex[] = [];

		for (const coefficient of P) {
			const re = coefficient.re.toNumber();
			const im = coefficient.im.toNumber();
			if (!Number.isFinite(re) || !Number.isFinite(im)) {
				return null;
			}
			nativeP.push({ re, im });
		}

		const leadMagnitude = Math.hypot(nativeP[0].re, nativeP[0].im);
		if (!Number.isFinite(leadMagnitude) || leadMagnitude === 0) {
			return null;
		}

		const radius = this.rootMagnitudeBound(P).toNumber();
		if (!Number.isFinite(radius)) {
			return null;
		}
		const roots: NativeComplex[] = [];
		for (let k = 0; k < n; k++) {
			const angle = (2 * Math.PI * k) / n + ABERTH_INITIAL_ANGLE_OFFSET;
			const r =
				radius *
				ABERTH_RADIUS_SCALE *
				(1 + (k * ABERTH_ROOT_SPACING_SCALE) / n);
			roots.push({ re: r * Math.cos(angle), im: r * Math.sin(angle) });
		}

		const nativeTolerance = Math.max(
			this.eps.toNumber(),
			Number.EPSILON * NATIVE_EPSILON_SCALE
		);
		const epsSquared = nativeTolerance * nativeTolerance;

		for (let iter = 0; iter < ABERTH_MAX_ITERATIONS; iter++) {
			let maxChangeSquared = 0;
			const newRoots: NativeComplex[] = [];

			for (let i = 0; i < n; i++) {
				const z = roots[i];
				let valueRe = nativeP[0].re;
				let valueIm = nativeP[0].im;
				let derivativeRe = nativeP[0].re;
				let derivativeIm = nativeP[0].im;

				for (let k = 1; k < n; k++) {
					const nextValueRe = valueRe * z.re - valueIm * z.im + nativeP[k].re;
					const nextValueIm = valueRe * z.im + valueIm * z.re + nativeP[k].im;
					const nextDerivativeRe =
						derivativeRe * z.re - derivativeIm * z.im + nextValueRe;
					const nextDerivativeIm =
						derivativeRe * z.im + derivativeIm * z.re + nextValueIm;
					valueRe = nextValueRe;
					valueIm = nextValueIm;
					derivativeRe = nextDerivativeRe;
					derivativeIm = nextDerivativeIm;
				}

				const finalValueRe =
					valueRe * z.re - valueIm * z.im + nativeP[n].re;
				const finalValueIm =
					valueRe * z.im + valueIm * z.re + nativeP[n].im;
				const derivativeMagnitudeSquared =
					derivativeRe * derivativeRe + derivativeIm * derivativeIm;

				if (
					!Number.isFinite(finalValueRe) ||
					!Number.isFinite(finalValueIm) ||
					!Number.isFinite(derivativeMagnitudeSquared)
				) {
					return null;
				}

				if (derivativeMagnitudeSquared < epsSquared) {
					newRoots.push(z);
					continue;
				}

				const newtonRe =
					(finalValueRe * derivativeRe + finalValueIm * derivativeIm) /
					derivativeMagnitudeSquared;
				const newtonIm =
					(finalValueIm * derivativeRe - finalValueRe * derivativeIm) /
					derivativeMagnitudeSquared;

				let sumRe = 0;
				let sumIm = 0;
				for (let j = 0; j < n; j++) {
					if (i === j) {
						continue;
					}
					const diffRe = z.re - roots[j].re;
					const diffIm = z.im - roots[j].im;
					const diffMagnitudeSquared = diffRe * diffRe + diffIm * diffIm;
					if (diffMagnitudeSquared > epsSquared) {
						sumRe += diffRe / diffMagnitudeSquared;
						sumIm -= diffIm / diffMagnitudeSquared;
					}
				}

				const productRe = newtonRe * sumRe - newtonIm * sumIm;
				const productIm = newtonRe * sumIm + newtonIm * sumRe;
				const denomRe = 1 - productRe;
				const denomIm = -productIm;
				const denomMagnitudeSquared = denomRe * denomRe + denomIm * denomIm;

				let correctionRe = newtonRe;
				let correctionIm = newtonIm;
				if (denomMagnitudeSquared >= epsSquared) {
					correctionRe =
						(newtonRe * denomRe + newtonIm * denomIm) / denomMagnitudeSquared;
					correctionIm =
						(newtonIm * denomRe - newtonRe * denomIm) / denomMagnitudeSquared;
				}

				const newRoot = {
					re: z.re - correctionRe,
					im: z.im - correctionIm,
				};
				const changeSquared =
					correctionRe * correctionRe + correctionIm * correctionIm;

				if (
					!Number.isFinite(newRoot.re) ||
					!Number.isFinite(newRoot.im) ||
					!Number.isFinite(changeSquared)
				) {
					return null;
				}

				newRoots.push(newRoot);
				maxChangeSquared = Math.max(maxChangeSquared, changeSquared);
			}

			for (let i = 0; i < n; i++) {
				roots[i] = newRoots[i];
			}

			if (maxChangeSquared < epsSquared) {
				break;
			}
		}

		return roots.map(root => new Complex(new Decimal(root.re), new Decimal(root.im)));
	}

	/**
	 * Refine a single root using Newton's method
	 */
	private newtonRefine(P: Complex[], z: Complex): Complex {
		const epsSquared = this.eps.mul(this.eps);
		const convergenceTolerance = this.eps.mul(NEWTON_CONVERGENCE_SCALE);
		const convergenceToleranceSquared = convergenceTolerance.mul(convergenceTolerance);

		for (let iter = 0; iter < NEWTON_MAX_ITERATIONS; iter++) {
			const [pz, dpz] = this.evaluateWithDerivative(P, z);

			if (pz.absSquared().lessThan(convergenceToleranceSquared)) {
				break;
			}

			if (dpz.absSquared().lessThan(epsSquared)) {
				break;
			}

			const correction = pz.div(dpz);
			const newZ = z.sub(correction);

			if (correction.abs().lessThan(convergenceTolerance.mul(newZ.abs().plus(1)))) {
				z = newZ;
				break;
			}

			z = newZ;
		}

		return z;
	}

	/**
	 * Computes a Lagrange-Fujiwara upper bound for root magnitudes.
	 *
	 * For a polynomial with leading coefficient a_n, every root lies within
	 * 2 * max(|a_(n-i) / a_n|^(1/i)). This is substantially tighter than the
	 * simple Cauchy bound for polynomials with large middle coefficients.
	 *
	 * @see https://doi.org/10.1016/S0377-0427(03)00381-9
	 */
	private rootMagnitudeBound(P: Complex[]): Decimal {
		let maxCandidate = new Decimal(0);
		const leadingMagnitude = P[0].abs();

		for (let i = 1; i < P.length; i++) {
			const ratio = P[i].abs().div(leadingMagnitude);
			if (!ratio.isZero()) {
				const candidate = ratio.pow(new Decimal(1).div(i));
				if (candidate.greaterThan(maxCandidate)) {
					maxCandidate = candidate;
				}
			}
		}

		return maxCandidate.mul(2);
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

		// Native doubles are sufficient to locate ordinary roots. Refine those seeds with
		// Decimal arithmetic and accept them only when every root passes the existing residual check.
		const nativeSeeds = this.nativeAberthSeeds(poly);
		if (nativeSeeds) {
			const nativeRoots = nativeSeeds.map(root => this.newtonRefine(poly, root));
			if (
				nativeRoots.length === deg &&
				nativeRoots.every(root => this.isNumericalRoot(root))
			) {
				return this.finalize(nativeRoots, asExpressions, precision);
			}
		}

		// Fall back to the Decimal Aberth implementation when native seeding is unavailable
		// or does not survive Decimal refinement and validation.
		const roots = this.aberthMethod(poly);

		return this.finalize(roots, asExpressions, precision);
	}

	/**
	 * Computes roots numerically, rejects candidates with an excessive polynomial residual,
	 * and converts accepted values only after numerical validation is complete.
	 */
	validatedRoots(asExpressions?: true): Expression[];
	validatedRoots(asExpressions?: false): Complex[];
	validatedRoots(asExpressions = true) {
		const precision = Decimal.precision;
		Decimal.set({ precision: this.precision });

		const roots = this.roots(false).filter(root => this.isNumericalRoot(root));

		return this.finalize(roots, asExpressions, precision);
	}
}
