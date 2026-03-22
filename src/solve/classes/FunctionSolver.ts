import Decimal from 'decimal.js';

import { Expression } from '../../core/classes/expression/Expression';
import { message, UnsupportedOperationError, UnexpectedInputError } from '../../core/errors';

type RootFindingMethod = 'Brent' | 'NewtonRaphson';

export interface FunctionSolverOptions {
	/** The upper bound of the interval of where to search for roots*/
	upperBound?: Decimal | number;
	/** The lower bound of the interval of where to search for roots*/
	lowerBound?: Decimal | number;
	/** The step to be used when calculating using Newton-Raphson */
	derivativeStep?: Decimal | number;
	/** The maximum number of iteration before giving up */
	maxIterations?: number;
	/** The step size when finding the interval size */
	stepSize?: number;
	/** The tolerance near zero or epsilon */
	tolerance?: number;
	/** The maximum number of roots to calculate. Trigonometric functions can have infinite roots */
	maxRoots?: number;
	/** If true the solver will print out certain errors while calculating */
	verbose?: boolean;
	/** The method to be used to calculate the roots */
	method?: RootFindingMethod;
}

/**
 * Result of the root finding algorithm
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

	constructor(func: Expression | string, variable?: string, options: FunctionSolverOptions = {}) {
		this.func = typeof func === 'string' ? Expression.create(func) : func;
		this.lowerBound = new Decimal(options.lowerBound ?? -100);
		this.upperBound = new Decimal(options.upperBound ?? 100);
		this.derivativeStep = new Decimal(options.derivativeStep ?? 1e-15);
		this.maxIters = options.maxIterations ?? 200;
		this.variable = variable ?? this.getVariable();
		this.stepSize = options.stepSize ?? 0.1;
		this.tolerance = new Decimal(options.tolerance ?? 1e-14);
		this.maxRoots = options.maxRoots ?? 20;
		this.verbose = options.verbose ?? false;
		this.method = options.method ?? 'Brent';
	}

	private calculateIntervals() {
		const lower = Number(this.lowerBound);
		const upper = Number(this.upperBound);
		const length = upper - lower;
		const center = lower + Math.floor(length / 2);
		let x = center;
		let y: number;
		let u = center;
		let v: number;
		const intervals: number[][] = [];

		const maxInterval = Math.max(lower + center, upper - center);
		for (let i = 0; i < maxInterval; i += this.stepSize) {
			y = x - this.stepSize;
			v = u + this.stepSize;
			// Add the lower interval if it still within bounds
			if (y >= lower) {
				intervals.push([x, y]);
			}
			// Add the upper if it still within bounds
			if (v <= upper) {
				intervals.push([u, v]);
			}
			// Update the starting limits
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
	 * Brent's method for finding roots of a function
	 * Combines bisection, secant method, and inverse quadratic interpolation
	 *
	 * @param f - The function to find the root of
	 * @param a - Lower bound of the interval
	 * @param b - Upper bound of the interval
	 * @param tolerance - Convergence tolerance (default: 1e-10)
	 * @param maxIterations - Maximum number of iterations (default: 100)
	 * @returns The root of the function
	 * @throws Error if the function has the same sign at both endpoints or max iterations exceeded
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

	public df(x: Decimal, h: Decimal): Decimal {
		const xPlusH = x.plus(h);
		const xMinusH = x.minus(h);

		const fPlusH = this.evaluate(xPlusH);
		const fMinusH = this.evaluate(xMinusH);

		// Central difference formula: (f(x+h) - f(x-h)) / (2h)
		return fPlusH.minus(fMinusH).dividedBy(h.times(2));
	}

	public evaluate(at: Decimal | number | string) {
		const value = this.func.evaluate({ [this.variable]: at });
		if (!Expression.isExpression(value)) {
			throw new UnexpectedInputError(message('unsupportedType'));
		}
		return value.getMultiplier().toDecimal();
	}

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
	 * Find all roots in an interval by subdividing and applying Brent's method
	 * Uses adaptive subdivision to ensure small enough steps
	 *
	 * @param f - The function to find roots of
	 * @param a - Lower bound of the interval
	 * @param b - Upper bound of the interval
	 * @param options - Optional parameters
	 * @returns Array of all roots found in the interval
	 */
	roots(): Expression[] {
		const bVal = this.upperBound;
		const tol = this.tolerance;

		const roots: Decimal[] = [];
		let exit = false;

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
				const f1 = this.evaluate(x1);
				const f2 = this.evaluate(x2);
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
						// const calculation = this.Brent(x1, x2);
						let calculation: Root;
						switch (this.method) {
							case 'NewtonRaphson': {
								// Start at the center of the interval
								const centerOfInterval = x2.minus(x1).div(2).plus(x1);
								calculation = this.NewtonRaphson(centerOfInterval);
								break;
							}
							case 'Brent': {
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

							// Verify that the root

							if (!isDuplicate) {
								addRoot(root);
							}
						}
					} catch {}
				}
			} catch {}
		}

		// Check last point
		const lastPoint = bVal;
		const fLast = this.evaluate(lastPoint);
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

		return roots.sort((a, b) => a.comparedTo(b)).map(x => Expression.create(x));
	}
}
