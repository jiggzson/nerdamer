import Decimal from 'decimal.js';

import { Expression } from '../../core/classes/expression/Expression';
import { message, UnsupportedOperationError, UnexpectedInputError } from '../../core/errors';

const DEFAULT_LOWER_BOUND = -100;
const DEFAULT_UPPER_BOUND = 100;
const DEFAULT_DERIVATIVE_STEP = 1e-15;
const DEFAULT_MAX_ITERATIONS = 200;
const DEFAULT_STEP_SIZE = 0.1;
const DEFAULT_TOLERANCE = 1e-14;
const DEFAULT_MAX_ROOTS = 20;
const BRENT_METHOD = 'Brent' as const;
const NEWTON_RAPHSON_METHOD = 'NewtonRaphson' as const;
const DEFAULT_ROOT_FINDING_METHOD = BRENT_METHOD;

/** Numerical method used to refine a candidate interval. */
export type RootFindingMethod = 'Brent' | 'NewtonRaphson';

/** Options for numerical root searches over a fixed interval with {@link FunctionSolver}. */
export interface FunctionSolverOptions {
	/** Upper endpoint of the search interval. Defaults to `100`. */
	upperBound?: Decimal | number;
	/** Lower endpoint of the search interval. Defaults to `-100`. */
	lowerBound?: Decimal | number;
	/** Central-difference step used by Newton-Raphson. Defaults to `1e-15`. */
	derivativeStep?: Decimal | number;
	/** Maximum refinement iterations for each candidate. Defaults to `200`. */
	maxIterations?: number;
	/** Spacing used to scan for candidate intervals. Defaults to `0.1`. */
	stepSize?: number;
	/** Residual and convergence tolerance. Defaults to `1e-14`. */
	tolerance?: number;
	/** Maximum number of roots to return. Defaults to `20`. */
	maxRoots?: number;
	/** Reserved diagnostic flag. The current implementation emits no output. */
	verbose?: boolean;
	/** Refinement method. Defaults to `'Brent'`. */
	method?: RootFindingMethod;
}

/**
 * Metadata returned by a single numerical root-refinement attempt.
 */
export interface Root {
	/** The root found */
	root: Decimal;
	/** Number of iterations performed */
	iterations: number;
	/** Whether the algorithm converged */
	converged: boolean;
	/** Final error estimate */
	error: Decimal;
	/** The error message if any */
	errorMsg?: string;
}

/**
 * Searches a fixed interval for real roots of a univariate expression.
 *
 * @remarks
 * {@link roots} scans the configured interval from its center toward both
 * endpoints. It refines sign-changing intervals with Brent's method or
 * Newton-Raphson, verifies residuals, merges nearby results, and returns roots
 * in ascending order. This is a heuristic search: an even-multiplicity root
 * can be missed unless a scan point lands sufficiently close to it, and
 * periodic functions are limited by both the interval and `maxRoots`.
 *
 * Calculations use the ambient `decimal.js` precision. An Expression supplied
 * to the constructor is retained rather than copied, and the public settings
 * may be adjusted before a search.
 *
 * @example
 * ```ts
 * const solver = new FunctionSolver('cos(x)-x', 'x', {
 *     lowerBound: 0,
 *     upperBound: 1,
 * });
 * const roots = solver.roots();
 * ```
 */
export class FunctionSolver {
	derivativeStep: Decimal;
	func: Expression;
	lowerBound: Decimal;
	maxIters: number;
	maxRoots: number;
	method?: RootFindingMethod;
	stepSize: number;
	tolerance: Decimal;
	upperBound: Decimal;
	variable: string;
	verbose: boolean;

	/**
	 * Creates a real-root solver for the configured search interval.
	 *
	 * @param func - Expression to evaluate, or a string parsed as an Expression.
	 * @param variable - Variable to substitute. When omitted, the expression must
	 * contain at most one variable.
	 * @param options - Search interval, refinement method, and tolerances.
	 * @throws {@link core!UnsupportedOperationError} If `variable` is omitted and the
	 * expression contains more than one variable.
	 */
	constructor(func: Expression | string, variable?: string, options: FunctionSolverOptions = {}) {
		this.func = typeof func === 'string' ? Expression.create(func) : func;
		this.lowerBound = new Decimal(options.lowerBound ?? DEFAULT_LOWER_BOUND);
		this.upperBound = new Decimal(options.upperBound ?? DEFAULT_UPPER_BOUND);
		this.derivativeStep = new Decimal(options.derivativeStep ?? DEFAULT_DERIVATIVE_STEP);
		this.maxIters = options.maxIterations ?? DEFAULT_MAX_ITERATIONS;
		this.variable = variable ?? this.getVariable();
		this.stepSize = options.stepSize ?? DEFAULT_STEP_SIZE;
		this.tolerance = new Decimal(options.tolerance ?? DEFAULT_TOLERANCE);
		this.maxRoots = options.maxRoots ?? DEFAULT_MAX_ROOTS;
		this.verbose = options.verbose ?? false;
		this.method = options.method ?? DEFAULT_ROOT_FINDING_METHOD;
	}

	private calculateIntervals() {
		const lower = this.lowerBound;
		const upper = this.upperBound;
		const step = new Decimal(this.stepSize);
		const length = upper.minus(lower);
		const center = lower.plus(length.dividedBy(2).floor());
		let x = center;
		let u = center;
		const intervals: Decimal[][] = [];

		const lowerDistance = center.minus(lower);
		const upperDistance = upper.minus(center);
		const maxInterval = lowerDistance.greaterThan(upperDistance)
			? lowerDistance
			: upperDistance;

		for (
			let offset = new Decimal(0);
			offset.lessThan(maxInterval);
			offset = offset.plus(step)
		) {
			const y = x.minus(step);
			const v = u.plus(step);

			// Add the lower interval if it is still within bounds.
			if (y.greaterThanOrEqualTo(lower)) {
				intervals.push([x, y]);
			}
			// Add the upper interval if it is still within bounds.
			if (v.lessThanOrEqualTo(upper)) {
				intervals.push([u, v]);
			}

			x = y;
			u = v;
		}

		return intervals;
	}

	private getVariable() {
		const variables = this.func.variables();
		// This function can only handle univariate function
		if (variables.length > 1) {
			throw new UnsupportedOperationError(message('univariateInputOnly'));
		}
		return variables[0];
	}

	/**
	 * Refines a bracket using Brent's combination of bisection, secant, and
	 * inverse-quadratic interpolation.
	 *
	 * @param a - First bracket endpoint.
	 * @param b - Second bracket endpoint.
	 * @returns Refinement metadata. Invalid brackets and exhausted iterations are
	 * represented in the returned {@link Root}; they are not thrown.
	 */
	Brent(a: Decimal, b: Decimal): Root {
		// Convert inputs to Decimal
		let aVal = new Decimal(a);
		let bVal = new Decimal(b);
		const tol = this.tolerance;

		let fa = this.evaluate(aVal);
		let fb = this.evaluate(bVal);
		const error = new Decimal(Infinity);

		// Check if root is at endpoint
		if (fa.abs().lessThan(tol)) {
			return {
				root: aVal,
				iterations: 0,
				converged: false,
				error: error,
				errorMsg: message('endPointIsRoot'),
			};
		}
		if (fb.abs().lessThan(tol)) {
			return {
				root: bVal,
				iterations: 0,
				converged: true,
				error: error,
				errorMsg: message('endPointIsRoot'),
			};
		}
		const x = fa.times(fb);

		// Ensure f(a) and f(b) have opposite signs
		if (x.greaterThan(0)) {
			return {
				root: x,
				iterations: 0,
				converged: true,
				error: error,
				errorMsg: message('differentSignsAtEndPointsRequired'),
			};
		}

		// Ensure |f(a)| >= |f(b)|
		if (fa.abs().lessThan(fb.abs())) {
			[aVal, bVal] = [bVal, aVal];
			[fa, fb] = [fb, fa];
		}

		let c = aVal;
		let fc = fa;
		let mflag = true;
		let d = new Decimal(0);

		for (let iter = 0; iter < this.maxIters; iter++) {
			let s: Decimal;

			// Use inverse quadratic interpolation if f(a), f(b), f(c) are distinct
			if (!fa.equals(fc) && !fb.equals(fc)) {
				s = aVal
					.times(fb)
					.times(fc)
					.dividedBy(fa.minus(fb).times(fa.minus(fc)))
					.plus(
						bVal
							.times(fa)
							.times(fc)
							.dividedBy(fb.minus(fa).times(fb.minus(fc)))
					)
					.plus(
						c
							.times(fa)
							.times(fb)
							.dividedBy(fc.minus(fa).times(fc.minus(fb)))
					);
			} else {
				// Use secant method
				s = bVal.minus(fb.times(bVal.minus(aVal)).dividedBy(fb.minus(fa)));
			}

			// Conditions for bisection
			const condition1 =
				s.lessThan(new Decimal(3).times(aVal).plus(bVal).dividedBy(4)) ||
				s.greaterThan(bVal);
			const condition2 =
				mflag && s.minus(bVal).abs().greaterThanOrEqualTo(bVal.minus(c).abs().dividedBy(2));
			const condition3 =
				!mflag && s.minus(bVal).abs().greaterThanOrEqualTo(c.minus(d).abs().dividedBy(2));
			const condition4 = mflag && bVal.minus(c).abs().lessThan(tol);
			const condition5 = !mflag && c.minus(d).abs().lessThan(tol);

			if (condition1 || condition2 || condition3 || condition4 || condition5) {
				// Use bisection
				s = aVal.plus(bVal).dividedBy(2);
				mflag = true;
			} else {
				mflag = false;
			}

			const fs = this.evaluate(s);
			d = c;
			c = bVal;
			fc = fb;

			// Update interval
			if (fa.times(fs).lessThan(0)) {
				bVal = s;
				fb = fs;
			} else {
				aVal = s;
				fa = fs;
			}

			// Ensure |f(a)| >= |f(b)|
			if (fa.abs().lessThan(fb.abs())) {
				[aVal, bVal] = [bVal, aVal];
				[fa, fb] = [fb, fa];
			}

			const conditionA = fb.abs().lessThan(tol);
			const conditionB = bVal.minus(aVal).abs().lessThan(tol);
			// Check convergence
			if (conditionA || conditionB) {
				return {
					root: bVal,
					iterations: iter,
					converged: true,
					error: conditionA ? fb.abs().minus(tol) : bVal.minus(aVal).abs(),
				};
			}
		}

		return {
			root: x,
			iterations: this.maxIters,
			converged: false,
			error: error,
			errorMsg: message('convergenceFailed', { iter: String(this.maxIters) }),
		};
	}

	/** Approximates the derivative with a central difference. */
	public df(x: Decimal, h: Decimal): Decimal {
		const xPlusH = x.plus(h);
		const xMinusH = x.minus(h);

		const fPlusH = this.evaluate(xPlusH);
		const fMinusH = this.evaluate(xMinusH);

		// Central difference formula: (f(x+h) - f(x-h)) / (2h)
		return fPlusH.minus(fMinusH).dividedBy(h.times(2));
	}

	/**
	 * Evaluates the configured expression at a real value.
	 *
	 * @throws {@link core!UnexpectedInputError} If evaluation does not produce a scalar
	 * Expression.
	 */
	public evaluate(at: Decimal | number | string) {
		const value = this.func.evaluate({ [this.variable]: at });
		if (!Expression.isExpression(value)) {
			throw new UnexpectedInputError(message('unsupportedType'));
		}
		if (!value.isNUM()) {
			throw new UnexpectedInputError(
				message('wrongInput', {
					expected: 'a real numeric value',
					received: value.text(),
				})
			);
		}
		return value.getMultiplier().toDecimal();
	}

	/**
	 * Refines a root from an initial guess using Newton-Raphson and a numerical
	 * derivative.
	 *
	 * @returns Refinement metadata, including non-convergence or a zero derivative.
	 */
	public NewtonRaphson(guess: Decimal) {
		const tol = this.tolerance;
		const h = new Decimal(this.derivativeStep);
		let x = new Decimal(guess);
		let iterations = 0;
		let error = new Decimal(Infinity);

		for (let i = 0; i < this.maxIters; i++) {
			const fx = this.evaluate(x);
			const fpx = this.df(x, h);

			// Check for zero derivative (would cause division by zero)
			if (fpx.isZero()) {
				return {
					root: x,
					iterations: i,
					converged: false,
					error: fx.abs(),
					errorMsg: message('zeroDerivative', { x: x.toString() }),
				};
			}

			// Newton-Raphson update: x_new = x - f(x) / f'(x)
			const xNew = x.minus(fx.dividedBy(fpx));

			// Calculate error as the absolute difference between iterations
			error = xNew.minus(x).abs();
			iterations = i + 1;

			// Check for convergence
			if (error.lessThanOrEqualTo(tol)) {
				return {
					root: xNew,
					iterations,
					converged: true,
					error,
				};
			}

			x = xNew;
		}

		// Did not converge within max iterations
		return {
			root: x,
			iterations,
			converged: false,
			error,
		};
	}

	/**
	 * Searches the configured interval for real roots.
	 *
	 * @returns Verified, deduplicated roots in ascending order, limited by
	 * `maxRoots`. Failed evaluations and failed refinements are skipped.
	 */
	roots(): Expression[] {
		const bVal = this.upperBound;
		const tol = this.tolerance;

		const roots: Decimal[] = [];
		let exit = false;
		const evaluationCache = new Map<string, Decimal>();

		const evaluatePoint = (point: Decimal) => {
			const key = point.toString();
			let value = evaluationCache.get(key);
			if (value === undefined) {
				value = this.evaluate(point);
				evaluationCache.set(key, value);
			}
			return value;
		};

		const addRoot = (root: Decimal) => {
			if (this.evaluate(root).abs().lessThan(tol)) {
				roots.push(root);
			}
			// Check if the maximum number of roots was reached. If so we're done
			if (roots.length >= this.maxRoots) {
				exit = true;
			}
		};

		const intervals = this.calculateIntervals();
		for (const interval of intervals) {
			if (exit) {
				return roots.sort((a, b) => a.comparedTo(b)).map(x => Expression.create(x));
			}
			try {
				const x1 = new Decimal(interval[0]);
				const x2 = new Decimal(interval[1]);
				const f1 = evaluatePoint(x1);
				const f2 = evaluatePoint(x2);
				// Check if root is at subdivision point
				if (f1.abs().lessThan(tol)) {
					// Avoid duplicates
					if (
						roots.length === 0 ||
						x1
							.minus(roots[roots.length - 1])
							.abs()
							.greaterThan(tol.times(10))
					) {
						addRoot(x1);
					}
				}

				// Check for sign change
				if (f1.times(f2).lessThan(0)) {
					try {
						let calculation: Root;
						switch (this.method) {
							case NEWTON_RAPHSON_METHOD: {
								// Start at the center of the interval
								const centerOfInterval = x2.minus(x1).div(2).plus(x1);
								calculation = this.NewtonRaphson(centerOfInterval);
								break;
							}
							case BRENT_METHOD: {
								calculation = this.Brent(x1, x2);
								break;
							}
							default: {
								calculation = this.Brent(x1, x2);
							}
						}

						if (calculation.converged) {
							const root = calculation.root;
							// Avoid duplicate roots (within tolerance)
							let isDuplicate = false;
							for (const existingRoot of roots) {
								if (root.minus(existingRoot).abs().lessThan(tol.times(10))) {
									isDuplicate = true;
									break;
								}
							}

							if (!isDuplicate) {
								addRoot(root);
							}
						}
					} catch {}
				}
			} catch {}
		}

		// Check the final endpoint separately so a root exactly on the upper bound is not missed.
		// Like endpoints visited during the scan, it may be outside the function's real domain.
		try {
			const lastPoint = bVal;
			const fLast = evaluatePoint(lastPoint);
			if (fLast.abs().lessThan(tol)) {
				if (
					roots.length === 0 ||
					lastPoint
						.minus(roots[roots.length - 1])
						.abs()
						.greaterThan(tol.times(10))
				) {
					addRoot(lastPoint);
				}
			}
		} catch {}

		return roots.sort((a, b) => a.comparedTo(b)).map(x => Expression.create(x));
	}
}
