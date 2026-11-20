import Decimal from 'decimal.js';

import { Expression } from '../../core/classes/expression/Expression';
import { compileDecimal } from '../../core/classes/parser/compileDecimal';
import { Parser } from '../../core/classes/parser/Parser';
import { toExpressions } from '../../core/common/functions/structuredEntityUtils';
import { SYMBOLIC_ACCESSOR } from '../../core/constants/parserSyntax';
import {
	message,
	UndefinedError,
	UnsupportedOperationError,
	UnexpectedInputError,
} from '../../core/errors';
import { scopedBlock } from '../../core/Settings';
import { warn } from '../../core/warnings';

import type { DecimalEvaluator } from '../../core/classes/parser/compileDecimal';
import type { ParserValuesObject } from '../../core/classes/parser/types';
import type { Scope } from '../../core/common/classes/Scope';

// Keep externally overridden parser evaluation observable through this API.
const standardParseRPN = Parser.parseRPN;

const DEFAULT_LOWER_BOUND = -10;
const DEFAULT_UPPER_BOUND = 10;
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
	/** Upper endpoint of the search interval. Defaults to `10`. */
	upperBound?: Decimal | number;
	/** Lower endpoint of the search interval. Defaults to `-10`. */
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
	/** Root coordinate, or a candidate coordinate if refinement fails. */
	root: Decimal;
	/** Number of iterations performed */
	iterations: number;
	/** Whether the algorithm converged */
	converged: boolean;
	/** Final error estimate; endpoint acceptance reports its absolute residual. */
	error: Decimal;
	/** The error message if any */
	errorMsg?: string;
}

/**
 * Searches a fixed interval for real roots of a univariate expression.
 *
 * @remarks
 * {@link roots} scans the configured interval from its center toward both
 * endpoints, including a shorter final cell on either side. It refines sign-changing
 * intervals with Brent's method or Newton-Raphson, verifies Brent candidates
 * using scaled residuals or guarded positional estimates, merges nearby
 * results, and returns roots
 * in ascending order. This is a heuristic search: an even-multiplicity root
 * can be missed unless a scan point evaluates to exactly zero, and
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
	private decimalEvaluator?: DecimalEvaluator;
	private evaluationFunc?: Expression;
	private evaluationRpn?: Scope;
	private evaluationSource = '';
	private evaluationVariable?: string;
	private fullEvaluation = false;
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
		const center = lower.plus(length.div(2));
		let x = center;
		let u = center;
		const intervals: Decimal[][] = [];

		const lowerDistance = center.minus(lower);
		const upperDistance = upper.minus(center);
		const maxInterval = lowerDistance.gt(upperDistance) ? lowerDistance : upperDistance;

		for (let offset = new Decimal(0); offset.lt(maxInterval); offset = offset.plus(step)) {
			// Clip the last cell on each side instead of dropping a shorter remainder.
			const y = Decimal.max(lower, x.minus(step));
			const v = Decimal.min(upper, u.plus(step));

			// Add the lower interval while its starting point is above the bound.
			if (x.gt(lower)) {
				intervals.push([x, y]);
			}
			// Add the upper interval while its starting point is below the bound.
			if (u.lt(upper)) {
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
	 * @param fa - Previously evaluated value at a, if available.
	 * @param fb - Previously evaluated value at b, if available.
	 * @returns Refinement metadata. Invalid brackets and exhausted iterations are
	 * represented in the returned {@link Root}; they are not thrown.
	 */
	Brent(a: Decimal, b: Decimal, fa?: Decimal, fb?: Decimal): Root {
		// Convert inputs to Decimal
		let aVal = new Decimal(a);
		let bVal = new Decimal(b);
		const tol = this.tolerance;
		// Positions are resolved relative to their size, at the working precision. The
		// absolute floor only matters for roots at or very near zero.
		const relTol = new Decimal(10).pow(1 - Decimal.precision);
		const floor = tol.times(relTol);

		fa = fa ?? this.evaluate(aVal);
		fb = fb ?? this.evaluate(bVal);
		const error = new Decimal(Infinity);

		// Check if root is at endpoint
		if (fa.isZero()) {
			return {
				root: aVal,
				iterations: 0,
				converged: true,
				error: fa.abs(),
				errorMsg: message('endPointIsRoot'),
			};
		}
		if (fb.isZero()) {
			return {
				root: bVal,
				iterations: 0,
				converged: true,
				error: fb.abs(),
				errorMsg: message('endPointIsRoot'),
			};
		}
		// Ensure f(a) and f(b) have opposite signs
		if (fa.times(fb).gt(0)) {
			return {
				root: bVal,
				iterations: 0,
				converged: false,
				error: error,
				errorMsg: message('differentSignsAtEndPointsRequired'),
			};
		}

		// Ensure |f(a)| >= |f(b)|
		if (fa.abs().lt(fb.abs())) {
			[aVal, bVal] = [bVal, aVal];
			[fa, fb] = [fb, fa];
		}
		// Near a root |f| shrinks as the bracket narrows; near a pole it grows.
		const startScale = fa.abs();

		let c = aVal;
		let fc = fa;
		let mflag = true;
		// Whether the last step was the minimum step towards a.
		let minStepped = false;
		let d = new Decimal(0);

		for (let iter = 0; iter < this.maxIters; iter++) {
			let s: Decimal;

			// Use inverse quadratic interpolation if f(a), f(b), f(c) are distinct
			if (!fa.eq(fc) && !fb.eq(fc)) {
				s = aVal
					.times(fb)
					.times(fc)
					.div(fa.minus(fb).times(fa.minus(fc)))
					.plus(
						bVal
							.times(fa)
							.times(fc)
							.div(fb.minus(fa).times(fb.minus(fc)))
					)
					.plus(
						c
							.times(fa)
							.times(fb)
							.div(fc.minus(fa).times(fc.minus(fb)))
					);
			} else {
				// Use secant method
				s = bVal.minus(fb.times(bVal.minus(aVal)).div(fb.minus(fa)));
			}

			// The smallest step that still moves the bracket, on the convergence scale.
			const step = floor.plus(relTol.times(bVal.abs()));
			const minStep = step.div(2);
			// Reject interpolation outside the allowed interval in either direction.
			const interpolationBound = aVal.times(3).plus(bVal).div(4);
			const condition1 =
				s.lt(Decimal.min(interpolationBound, bVal)) ||
				s.gt(Decimal.max(interpolationBound, bVal));
			const condition2 = mflag && s.minus(bVal).abs().gte(bVal.minus(c).abs().div(2));
			const condition3 = !mflag && s.minus(bVal).abs().gte(c.minus(d).abs().div(2));
			const condition4 = mflag && bVal.minus(c).abs().lt(step);
			const condition5 = !mflag && c.minus(d).abs().lt(step);

			const tinyStep = !condition1 && s.minus(bVal).abs().lt(minStep);
			if (tinyStep && !minStepped) {
				// As in Brent's original method, once b has converged, step the minimum
				// towards a instead of bisecting. The far end then moves too, and the
				// width test succeeds. Bisecting here would close the bracket one halving
				// at a time, because b no longer moves and conditions 4 and 5 keep firing.
				s = aVal.gt(bVal) ? bVal.plus(minStep) : bVal.minus(minStep);
				mflag = false;
				minStepped = true;
			} else if (
				tinyStep ||
				condition1 ||
				condition2 ||
				condition3 ||
				condition4 ||
				condition5
			) {
				// Use bisection. A second tiny step in a row means the minimum step didn't
				// cross the root, so b hadn't converged: a flat function, such as x^2-1e-40
				// near zero, interpolates next to b while the root is far away.
				s = aVal.plus(bVal).div(2);
				mflag = true;
				minStepped = false;
			} else {
				mflag = false;
				minStepped = false;
			}

			// A bisection or interpolation step can still land within minStep of b.
			if (s.minus(bVal).abs().lt(minStep)) {
				s = aVal.gt(bVal) ? bVal.plus(minStep) : bVal.minus(minStep);
			}

			const fs = this.evaluate(s);
			d = c;
			c = bVal;
			fc = fb;

			// Update interval
			if (fa.times(fs).lt(0)) {
				bVal = s;
				fb = fs;
			} else {
				aVal = s;
				fa = fs;
			}

			// Ensure |f(a)| >= |f(b)|
			if (fa.abs().lt(fb.abs())) {
				[aVal, bVal] = [bVal, aVal];
				[fa, fb] = [fb, fa];
			}

			// Converge on the bracket width, not the residual: a function with a
			// small scale can have a tiny residual far from its root.
			const width = bVal.minus(aVal).abs();
			const scale = floor.plus(relTol.times(Decimal.max(aVal.abs(), bVal.abs())));
			// Once the bracket is as narrow as the tolerance, a residual larger than both
			// starting values means the sign change is a pole, not a root.
			if (width.lte(tol) && fb.abs().gt(startScale)) {
				return {
					root: bVal,
					iterations: iter,
					converged: false,
					error: width,
					errorMsg: message('convergenceFailed', { iters: String(iter) }),
				};
			}
			if (fb.isZero() || width.lte(scale)) {
				return {
					root: bVal,
					iterations: iter,
					converged: true,
					error: width,
				};
			}
		}

		return {
			root: bVal,
			iterations: this.maxIters,
			converged: false,
			error: error,
			errorMsg: message('convergenceFailed', { iters: String(this.maxIters) }),
		};
	}

	/** Approximates the derivative with a central difference. */
	public df(x: Decimal, h: Decimal): Decimal {
		const xPlusH = x.plus(h);
		const xMinusH = x.minus(h);

		const fPlusH = this.evaluate(xPlusH);
		const fMinusH = this.evaluate(xMinusH);

		// Central difference formula: (f(x+h) - f(x-h)) / (2h)
		return fPlusH.minus(fMinusH).div(h.times(2));
	}

	/**
	 * Evaluates the configured expression at a real value.
	 *
	 * @throws {@link core!UnexpectedInputError} If evaluation does not produce a scalar
	 * Expression.
	 */
	public evaluate(at: Decimal | number | string) {
		// The text, the evaluation path and the compiled evaluator depend only on the
		// expression and variable, so work them out once rather than at every point.
		if (this.func !== this.evaluationFunc || this.variable !== this.evaluationVariable) {
			this.evaluationFunc = this.func;
			this.evaluationVariable = this.variable;
			this.evaluationSource = this.func.text();
			this.evaluationRpn = undefined;
			// Preserve Expression.evaluate's special serialization and complex-power handling.
			this.fullEvaluation =
				this.func.scientific !== undefined ||
				this.func.hasFunction(SYMBOLIC_ACCESSOR, true) ||
				this.func.isComplex();
			this.decimalEvaluator = this.fullEvaluation
				? undefined
				: compileDecimal(this.evaluationSource, this.variable);
		}
		if (this.fullEvaluation) {
			const evaluated = this.func.evaluate({ [this.variable]: at });
			if (!evaluated.isNUM()) {
				throw new UnexpectedInputError(message('wrongInput', {
					expected: 'a real numeric value', received: evaluated.text(),
				}));
			}
			return evaluated.getMultiplier().toDecimal();
		}
		if (this.decimalEvaluator && Parser.parseRPN === standardParseRPN) {
			try {
				return this.decimalEvaluator(new Decimal(at));
			} catch (error) {
				// A non-finite value means the point is outside the domain, such as a
				// pole. Report it without dropping the compiled evaluator for the rest
				// of the scan.
				if (error instanceof UndefinedError) {
					throw error;
				}
				// Unsupported domains and changed function registrations retain
				// the ordinary parser's exact behavior.
				this.decimalEvaluator = undefined;
			}
		}
		let rpn = this.evaluationRpn;
		if (rpn === undefined) {
			rpn = Parser.toRPN(Parser.tokenize(this.evaluationSource));
			this.evaluationRpn = rpn;
		}
		const values: ParserValuesObject = {
			[this.variable]: Expression.Number(new Decimal(at)),
		};
		const value = scopedBlock('EVALUATE', true, () => Parser.parseRPN(rpn, values));
		if (!Expression.isExpression(value)) {
			throw new UnexpectedInputError(message('unsupportedType', { type: value.dataType }));
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
			const xNew = x.minus(fx.div(fpx));

			// Calculate error as the absolute difference between iterations
			error = xNew.minus(x).abs();
			iterations = i + 1;

			// Check for convergence
			if (error.lte(tol)) {
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
		const relTol = new Decimal(10).pow(1 - Decimal.precision);
		const duplicateFloor = this.method === NEWTON_RAPHSON_METHOD ? tol : tol.times(relTol);

		const roots: Decimal[] = [];
		let exit = false;
		let exhaustedRefinements = 0;
		const evaluationCache = new Map<string, Decimal>();
		// Neighbouring cells share endpoints, so remember failed points as well.
		const failedPoints = new Map<string, unknown>();

		const evaluatePoint = (point: Decimal) => {
			const key = point.toString();
			if (failedPoints.has(key)) {
				throw failedPoints.get(key);
			}
			let value = evaluationCache.get(key);
			if (value === undefined) {
				try {
					value = this.evaluate(point);
				} catch (error) {
					failedPoints.set(key, error);
					throw error;
				}
				evaluationCache.set(key, value);
			}
			return value;
		};

		// A steep continuous crossing can have a large residual even when Brent's
		// root coordinate is accurate. Estimate the coordinate error from the
		// original chord, then sample both sides to guard against poles and jumps.
		// Finite probes cannot establish continuity, so this is a conservative
		// fallback after the ordinary bracket-scaled residual check has failed.
		const verifyBracket = (
			root: Decimal, residual: Decimal,
			bracket: { a: Decimal; b: Decimal; fa: Decimal; fb: Decimal }
		): boolean => {
			const { a, b, fa, fb } = bracket;
			const difference = fa.minus(fb).abs();
			if (difference.isZero() || !residual.lt(Decimal.min(fa.abs(), fb.abs()))) {
				return false;
			}
			const estimatedError = residual.times(a.minus(b).abs()).div(difference);
			if (!estimatedError.lt(tol)) {
				return false;
			}

			const distance = tol.times(10);
			const left = root.minus(distance);
			const right = root.plus(distance);
			if (!left.lt(root) || !right.gt(root) ||
				!left.gt(Decimal.min(a, b)) ||
				!right.lt(Decimal.max(a, b))) {
				return false;
			}
			const leftValue = evaluatePoint(left);
			const rightValue = evaluatePoint(right);
			return leftValue.isFinite() && rightValue.isFinite() &&
				leftValue.times(rightValue).lt(0) &&
				residual.lt(leftValue.abs()) &&
				residual.lt(rightValue.abs());
		};

		const addRoot = (
			root: Decimal,
			scale = new Decimal('1'),
			bracket?: { a: Decimal; b: Decimal; fa: Decimal; fb: Decimal }
		) => {
			// Shared subdivision endpoints must not produce duplicate roots or exceed the cap.
			// Compare on the scale the method converges on. Brent narrows a bracket to an
			// absolute floor of tol*relTol, so tiny roots such as +-1e-20 stay distinct,
			// while Newton stops on an absolute step of tol.
			const duplicate = roots.some(existingRoot => {
				const scale = duplicateFloor.plus(
					relTol.times(Decimal.max(root.abs(), existingRoot.abs()))
				);
				return root.minus(existingRoot).abs().lt(scale.times(10));
			});
			if (!exit && !duplicate) {
				const residual = evaluatePoint(root).abs();
				if (residual.lt(tol.times(scale)) ||
					(bracket !== undefined && verifyBracket(root, residual, bracket))) {
					roots.push(root);
				}
			}
			// Check if the maximum number of roots was reached. If so we're done
			if (roots.length >= this.maxRoots) {
				exit = true;
			}
		};

		// A pole on the scan grid would discard both cells that share it, along
		// with any root right next to it. When only one endpoint is undefined,
		// probe just inside the cell instead. The residual checks in addRoot
		// still reject the pole itself.
		const probeDistance = tol.times(1000);
		const evaluateCell = (
			a: Decimal,
			b: Decimal
		): [Decimal, Decimal, Decimal, Decimal] | undefined => {
			let fa: Decimal | undefined;
			let fb: Decimal | undefined;
			try {
				fa = evaluatePoint(a);
			} catch {}
			try {
				fb = evaluatePoint(b);
			} catch {}
			if (fa === undefined && fb !== undefined) {
				a = b.gt(a) ? a.plus(probeDistance) : a.minus(probeDistance);
				fa = evaluatePoint(a);
			} else if (fb === undefined && fa !== undefined) {
				b = a.gt(b) ? b.plus(probeDistance) : b.minus(probeDistance);
				fb = evaluatePoint(b);
			}
			return fa === undefined || fb === undefined ? undefined : [a, fa, b, fb];
		};

		const intervals = this.calculateIntervals();
		for (const interval of intervals) {
			if (exit) {
				return toExpressions(roots.sort((a, b) => a.cmp(b)));
			}
			try {
				const cell = evaluateCell(new Decimal(interval[0]), new Decimal(interval[1]));
				if (cell === undefined) {
					continue;
				}
				const [x1, f1, x2, f2] = cell;
				// Only zero-valued scan samples are roots without a sign-changing bracket.
				// A small nonzero residual alone does not establish a root.
				if (f1.isZero()) {addRoot(x1);}
				if (f2.isZero()) {addRoot(x2);}

				// Check for sign change
				if (f1.times(f2).lt(0)) {
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
								calculation = this.Brent(x1, x2, f1, f2);
								break;
							}
							default: {
								calculation = this.Brent(x1, x2, f1, f2);
							}
						}

						if (calculation.converged) {
							// Brent locates a root inside a sign-changing bracket. Its
							// positional accuracy can be good even when a steep function
							// has a large absolute residual. Compare against the initial
							// bracket's function scale, while retaining a residual check
							// that rejects poles and other discontinuities.
							const scale = this.method === NEWTON_RAPHSON_METHOD
								? new Decimal('1')
								: Decimal.max(f1.abs(), f2.abs()).plus('1');
							addRoot(calculation.root, scale,
								this.method === NEWTON_RAPHSON_METHOD
									? undefined
									: { a: x1, b: x2, fa: f1, fb: f2 });
						} else if (calculation.iterations >= this.maxIters &&
							calculation.errorMsg !== message('differentSignsAtEndPointsRequired')) {
							exhaustedRefinements++;
						}
					} catch {}
				}
			} catch {}
		}

		// Check the final endpoint separately even if its neighboring cell could not be evaluated.
		// Like endpoints visited during the scan, it may be outside the function's real domain.
		try {
			const lastPoint = bVal;
			const fLast = evaluatePoint(lastPoint);
			if (fLast.isZero()) {addRoot(lastPoint);}
		} catch {}

		if (exhaustedRefinements > 0) {
			warn('solve.iterationLimit', message('rootIterationWarning', { count: String(exhaustedRefinements), iterations: String(this.maxIters) }));
		}
		return toExpressions(roots.sort((a, b) => a.cmp(b)));
	}
}
