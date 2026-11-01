import Decimal from 'decimal.js';

import { Expression } from '../../core/classes/expression/Expression';
import { zero } from '../../core/classes/expression/shortcuts';
import { Matrix } from '../../core/classes/matrix/Matrix';
import { Parser } from '../../core/classes/parser/Parser';
import { Rational } from '../../core/classes/rational/Rational';
import { COS, SIN } from '../../core/constants/functionNames';
import { SYMBOLIC_ACCESSOR } from '../../core/constants/parserSyntax';
import { message } from '../../core/errors';
import { scopedBlock } from '../../core/Settings';
import { warn } from '../../core/warnings';

import { DecimalMatrix } from './DecimalMatrix';

import type { ParserValuesObject } from '../../core/classes/parser/types';
import type { Scope } from '../../core/common/classes/Scope';

const DEFAULT_LOWER_BOUND = -10;
const DEFAULT_UPPER_BOUND = 10;
const DEFAULT_GRID_POINTS = 5;
const DEFAULT_MAX_ITERATIONS = 100;
const DEFAULT_TOLERANCE = 1e-12;
const DEFAULT_DERIVATIVE_STEP = 1e-8;
const DEFAULT_DEDUPLICATION_TOLERANCE = 1e-8;

/** Controls where the solver starts and how long it tries to find each solution. */
export interface MultivariateSolverOptions {
	/** Lower bound for each variable (default: -10) */
	lowerBound?: number;
	/** Upper bound for each variable (default: 10) */
	upperBound?: number;
	/** Number of grid points per variable (default: 5) */
	gridPoints?: number;
	/** Maximum Newton-Raphson iterations per start (default: 100) */
	maxIterations?: number;
	/** Convergence tolerance (default: 1e-12) */
	tolerance?: number;
	/** Step size for numerical Jacobian (default: 1e-8) */
	derivativeStep?: number;
	/** Tolerance for deduplicating roots (default: 1e-8) */
	deduplicationTolerance?: number;
}

/**
 * Finds real solutions to systems of equations using numerical methods.
 *
 * For certain systems involving sine and cosine, the equations show that
 * exactly one real solution exists. The solver first tries a starting point
 * derived from those equations. Otherwise, or if that attempt fails, it tries
 * several starting points and collects the distinct solutions it finds.
 *
 * @remarks
 * A numerical search may miss solutions. An empty result does not prove there
 * are none. Searching from a grid becomes more expensive as the number of
 * variables increases, and starts that fail to converge are ignored.
 *
 * The solver is intended for systems with as many equations as variables.
 * Calculations use the current decimal.js precision. The supplied equation
 * and variable arrays are retained rather than copied.
 */
export class MultivariateSolver {
	private dedupTol: Decimal;
	private equations: Expression[];
	private evaluationRpns: Array<Scope | undefined>;
	private evaluationSources: Array<string | undefined>;
	private gridPoints: number;
	private h: Decimal;
	private lowerBound: number;
	private maxIterations: number;
	private tolerance: Decimal;
	private upperBound: number;
	private variables: string[];

	/**
	 * Sets up the equations, variable order, and numerical search settings.
	 *
	 * @param equations - Expressions that should each equal zero.
	 * @param variables - Variable names in the order used by solution coordinates.
	 * @param options - Optional limits and tolerances for the numerical search.
	 */
	constructor(
		equations: Expression[],
		variables: string[],
		options: MultivariateSolverOptions = {}
	) {
		this.equations = equations;
		this.evaluationRpns = new Array(equations.length);
		this.evaluationSources = new Array(equations.length);
		this.variables = variables;
		this.lowerBound = options.lowerBound ?? DEFAULT_LOWER_BOUND;
		this.upperBound = options.upperBound ?? DEFAULT_UPPER_BOUND;
		this.gridPoints = options.gridPoints ?? DEFAULT_GRID_POINTS;
		this.maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS;
		this.tolerance = new Decimal(options.tolerance ?? DEFAULT_TOLERANCE);
		this.h = new Decimal(options.derivativeStep ?? DEFAULT_DERIVATIVE_STEP);
		this.dedupTol = new Decimal(options.deduplicationTolerance ?? DEFAULT_DEDUPLICATION_TOLERANCE);
	}

	/**
	 * Evaluates every equation at the given coordinates.
	 * Returns null if any equation cannot be evaluated numerically.
	 */
	private evaluateSystem(point: Decimal[]): Decimal[] | null {
		// Assign each variable its coordinate before evaluating the equations.
		const values: ParserValuesObject = {};
		for (let i = 0; i < this.variables.length; i++) {
			const value = point[i];
			// Preserve the parser's existing handling for non-finite values while keeping
			// ordinary Newton coordinates native.
			values[this.variables[i]] = value.isFinite() ? Expression.Number(value) : value;
		}

		let result: Decimal[] | null;
		try {
			result = scopedBlock('EVALUATE', true, () => {
				const evaluatedSystem: Decimal[] = [];
				for (let i = 0; i < this.equations.length; i++) {
					const equation = this.equations[i];
					// Special expression forms need their own evaluation path.
					if (equation.scientific !== undefined ||
						equation.hasFunction(SYMBOLIC_ACCESSOR, true) ||
						equation.isComplex()) {
						const evaluated = equation.evaluate(values);
						if (!Expression.isExpression(evaluated)) {
							return null;
						}
						evaluatedSystem.push(evaluated.getMultiplier().toDecimal());
						continue;
						}
					// For ordinary expressions, reuse the parsed form on later evaluations.
					const source = equation.text();
					let rpn = this.evaluationRpns[i];
					if (rpn === undefined || source !== this.evaluationSources[i]) {
						rpn = Parser.toRPN(Parser.tokenize(source));
						this.evaluationRpns[i] = rpn;
						this.evaluationSources[i] = source;
					}

					const evaluated = Parser.parseRPN(rpn, values);
					if (!Expression.isExpression(evaluated)) {
						return null;
					}
					evaluatedSystem.push(evaluated.getMultiplier().toDecimal());
				}
				return evaluatedSystem;
			});
		} catch {
			// An invalid evaluation cannot be used in a Newton step.
			result = null;
		}
		return result;
	}

	/**
	 * Builds every combination of evenly spaced starting coordinates.
	 * The number of points grows with the number of variables.
	 */
	private generateStartingPoints(): Decimal[][] {
		const n = this.variables.length;
		const points: Decimal[][] = [];
		const step = (this.upperBound - this.lowerBound) / (this.gridPoints - 1);

		// Each index selects one coordinate on the grid.
		const indices = new Array(n).fill(0);

		while (true) {
			const point: Decimal[] = [];
			for (let i = 0; i < n; i++) {
				point.push(new Decimal(this.lowerBound + indices[i] * step));
			}
			points.push(point);

			// Advance the last index, carrying into earlier variables as needed.
			let carry = true;
			for (let i = n - 1; i >= 0 && carry; i--) {
				indices[i]++;
				if (indices[i] < this.gridPoints) {
					carry = false;
				} else {
					indices[i] = 0;
				}
			}
			if (carry) {
				break;
			}
		}

		return points;
	}

	/**
	 * Finds a starting point only when the equations prove there is one real root.
	 *
	 * The supported equations have numeric linear terms and simple sine/cosine
	 * terms. By bounding how much the trigonometric terms can change, we can prove
	 * that the system has exactly one real solution. Solving the linear part gives
	 * a useful starting point, but Newton must still find and verify the root.
	 */
	private inferStartingPoint(): Decimal[] | undefined {
		// This proof needs one equation for each variable.
		const count = this.variables.length;
		if (count === 0 || this.equations.length !== count) {
			return undefined;
		}

		let retval: Decimal[] | undefined;
		try {
			// Separate the linear terms from the supported sine/cosine terms.
			// Track a bound on how each equation changes with each variable.
			const affineExpressions: Expression[] = [];
			const derivativeBounds: Rational[][] = [];
			let trigTerms = 0;

			for (const equation of this.equations) {
				let affine = zero();
				const derivative = Array.from(
					{ length: count },
					() => Rational.create(0n)
				);
				const terms = equation.isSum() ? equation.elementsArray() : [equation];

				for (const term of terms) {
					// Terms not recognized as sine/cosine must pass the linear check below.
					if (!term.isFunction([SIN, COS])) {
						affine = affine.plus(term);
						continue;
					}
					if (!term.getPower().isOne()) {
						return undefined;
					}

					const argument = term.getArguments()[0];
					if (!argument.isPolynomialLike(this.variables)) {
						return undefined;
					}
					// The argument must be a numeric constant plus linear variable terms.
					// For either sine or cosine, |d/dx_j| is bounded by |amplitude * k_j|.
					const coefficients = argument.coeffs(...this.variables);
					let validArgument = true;
					coefficients.each((coefficient, key) => {
						const degrees = key.split(',').map(Number);
						const totalDegree = degrees.reduce((sum, degree) => sum + degree, 0);
						if (
							degrees.length !== count ||
							totalDegree > 1 ||
							!coefficient.isNUM()
						) {
							validArgument = false;
						} else if (totalDegree === 1) {
							const variableIndex = degrees.findIndex(degree => degree === 1);
							if (variableIndex < 0) {
								validArgument = false;
							} else {
								const contribution = term.getMultiplier().abs()
									.times(coefficient.getMultiplier().abs());
								derivative[variableIndex] = derivative[variableIndex]
									.plus(contribution);
							}
						}
					});
					if (!validArgument) {
						return undefined;
					}
					trigTerms++;
				}

				affineExpressions.push(affine);
				derivativeBounds.push(derivative);
			}

			// Purely linear systems are handled earlier by the exact solver.
			if (trigTerms === 0) {
				return undefined;
			}

			// Extract the linear coefficient matrix and constants, rejecting any
			// remaining term that is nonlinear or has a nonnumeric coefficient.
			const affineRows: Expression[][] = [];
			const offsets: Rational[] = [];
			for (const affine of affineExpressions) {
				if (!affine.isPolynomialLike(this.variables)) {
					return undefined;
				}
				const coefficients = affine.coeffs(...this.variables);
				const row = Array.from({ length: count }, () => zero());
				let offset = Rational.create(0n);
				let validAffine = true;
				coefficients.each((coefficient, key) => {
					const degrees = key.split(',').map(Number);
					const totalDegree = degrees.reduce((sum, degree) => sum + degree, 0);
					if (
						degrees.length !== count ||
						totalDegree > 1 ||
						!coefficient.isNUM()
					) {
						validAffine = false;
					} else if (totalDegree === 0) {
						offset = coefficient.getMultiplier();
					} else {
						const variableIndex = degrees.findIndex(degree => degree === 1);
						if (variableIndex < 0) {
							validAffine = false;
						} else {
							row[variableIndex] = coefficient;
						}
					}
				});
				if (!validAffine) {
					return undefined;
				}
				affineRows.push(row);
				offsets.push(offset);
			}

			// Invert the linear part exactly. A singular matrix cannot provide this
			// starting point or the uniqueness check that follows.
			const inverse = new Matrix(...affineRows).inverse();
			const inverseValues: Rational[][] = [];
			for (let i = 0; i < count; i++) {
				const row: Rational[] = [];
				for (let j = 0; j < count; j++) {
					const value = inverse.get(i, j);
					if (!value.isNUM()) {
						return undefined;
					}
					row.push(value.getMultiplier());
				}
				inverseValues.push(row);
			}

			// Bound the change in the fixed-point map using |A^-1| times the
			// trigonometric derivative bounds. Every row sum must be below 1;
			// then the system has exactly one real solution.
			for (let i = 0; i < count; i++) {
				let rowBound = Rational.create(0n);
				for (let k = 0; k < count; k++) {
					let bound = Rational.create(0n);
					for (let j = 0; j < count; j++) {
						bound = bound.plus(
							inverseValues[i][j].abs().times(derivativeBounds[j][k])
						);
					}
					rowBound = rowBound.plus(bound);
				}
				if (!rowBound.lt('1')) {
					return undefined;
				}
			}

			// Solve the linear part for an initial guess. Decimal rounding affects
			// only the Newton start, not the exact uniqueness check above.
			const center: Decimal[] = [];
			for (let i = 0; i < count; i++) {
				let coordinate = Rational.create(0n);
				for (let j = 0; j < count; j++) {
					coordinate = coordinate.minus(inverseValues[i][j].times(offsets[j]));
				}
				const decimal = coordinate.toDecimal();
				if (!decimal.isFinite()) {
					return undefined;
				}
				center.push(decimal);
			}
			retval = center;
		} catch {
			// If any part of the proof fails, use the normal grid instead.
		}

		return retval;
	}

	/**
	 * Checks whether every coordinate is close to a previously found root.
	 */
	private isDuplicate(root: Decimal[], existing: Decimal[][]): boolean {
		for (const prev of existing) {
			let maxDiff = new Decimal(0);
			for (let i = 0; i < root.length; i++) {
				const diff = root[i].minus(prev[i]).abs();
				if (diff.greaterThan(maxDiff)) {
					maxDiff = diff;
				}
			}
			if (maxDiff.lessThan(this.dedupTol)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Estimates how each equation changes when one variable changes.
	 * These slopes form the matrix used to choose the next Newton step.
	 */
	private jacobian(point: Decimal[]): DecimalMatrix | null {
		const n = this.variables.length;
		const m = this.equations.length;
		const data: Decimal[][] = new Array(m).fill(null).map(() => []);
		const twoH = this.h.times(2);

		// Perturb one variable at a time in both directions. Each evaluation
		// supplies the change for every equation, so no evaluations are repeated.
		for (let j = 0; j < n; j++) {
			const forward = point.map(v => new Decimal(v));
			const backward = point.map(v => new Decimal(v));
			forward[j] = forward[j].plus(this.h);
			backward[j] = backward[j].minus(this.h);

			const fPlus = this.evaluateSystem(forward);
			const fMinus = this.evaluateSystem(backward);
			if (!fPlus || !fMinus) {
				return null;
			}

			for (let i = 0; i < m; i++) {
				data[i].push(fPlus[i].minus(fMinus[i]).div(twoH));
			}
		}

		return new DecimalMatrix(data);
	}

	/**
	 * Attempts to solve the system from one starting point.
	 * Returns null if evaluation fails, the slopes are unusable, or no root is found.
	 * Calls onLimit only when all allowed iterations have been used.
	 */
	private newtonRaphson(start: Decimal[], onLimit?: () => void): Decimal[] | null {
		const x = start.map(v => new Decimal(v));

		for (let iter = 0; iter < this.maxIterations; iter++) {
			const F = this.evaluateSystem(x);
			if (!F) {
				return null;
			}

			// Accept a candidate only when all equations are close enough to zero.
			let norm = new Decimal(0);
			for (const fi of F) {
				norm = norm.plus(fi.times(fi));
			}
			norm = norm.sqrt();

			if (norm.lessThan(this.tolerance)) {
				return x;
			}

			const J = this.jacobian(x);
			if (!J) {
				return null;
			}

			// Find the coordinate correction that should reduce the equation errors.
			const negF = F.map(fi => fi.neg());
			const delta = DecimalMatrix.solve(J, negF);
			if (!delta) {
				return null; // The local slopes do not determine a Newton step.
			}

			// Move every coordinate by its calculated correction.
			for (let i = 0; i < x.length; i++) {
				x[i] = x[i].plus(delta[i]);
			}
		}

		// Check the final point as well, even if the iteration limit was reached.
		const F = this.evaluateSystem(x);
		if (F) {
			let norm = new Decimal(0);
			for (const fi of F) {
				norm = norm.plus(fi.times(fi));
			}
			if (norm.sqrt().lessThan(this.tolerance)) {
				return x;
			}
		}

		onLimit?.();
		return null;
	}

	/**
	 * Finds distinct real solutions using either an inferred start or the grid.
	 *
	 * @returns One variable-to-value map per solution. An empty result means no
	 * root was found, not that the system has no real roots.
	 */
	roots(): Map<string, Expression>[] {
		const convergedRoots: Decimal[][] = [];
		let exhausted = 0;
		// When uniqueness has been proved, one successful Newton attempt is enough.
		const inferredStart = this.inferStartingPoint();
		if (inferredStart) {
			const inferredRoot = this.newtonRaphson(inferredStart);
			if (inferredRoot) {
				convergedRoots.push(inferredRoot);
			}
		}

		// Otherwise use the original grid, preserving its search and deduplication.
		if (convergedRoots.length === 0) {
			const startingPoints = this.generateStartingPoints();
			for (const start of startingPoints) {
				const root = this.newtonRaphson(start, () => { exhausted++; });
				if (root && !this.isDuplicate(root, convergedRoots)) {
					convergedRoots.push(root);
				}
			}
		}

		// Report grid starts that stopped only because they ran out of iterations.
		if (exhausted > 0) {
			warn('solve.iterationLimit', message('rootIterationWarning', {
				count: String(exhausted), iterations: String(this.maxIterations),
			}));
		}

		// Convert the accepted coordinates into named solution values.
		return convergedRoots.map(root => {
			const solution = new Map<string, Expression>();
			for (let i = 0; i < this.variables.length; i++) {
				const value = root[i];
				solution.set(
					this.variables[i],
					value.isFinite() ? Expression.Number(value) : Expression.create(value)
				);
			}
			return solution;
		});
	}
}
