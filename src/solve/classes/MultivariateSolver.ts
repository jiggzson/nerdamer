import Decimal from 'decimal.js';

import { Expression } from '../../core/classes/expression/Expression';

import { DecimalMatrix } from './DecimalMatrix';

import type { ParserValuesObject } from '../../core/classes/parser/types';

const DEFAULT_LOWER_BOUND = -10;
const DEFAULT_UPPER_BOUND = 10;
const DEFAULT_GRID_POINTS = 5;
const DEFAULT_MAX_ITERATIONS = 100;
const DEFAULT_TOLERANCE = 1e-12;
const DEFAULT_DERIVATIVE_STEP = 1e-8;
const DEFAULT_DEDUPLICATION_TOLERANCE = 1e-8;

/** Options for the finite-range multi-start search performed by {@link MultivariateSolver}. */
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
 * Searches numerically for isolated real solutions of a multivariate system.
 *
 * Each equation is interpreted as `equation = 0`. The solver starts
 * Newton-Raphson at every point in a Cartesian grid, approximates the Jacobian
 * with central differences, and merges nearby converged solutions.
 *
 * @remarks
 * This is a finite-range heuristic rather than a completeness proof. The number
 * of starts is `gridPoints` raised to the number of variables, so cost grows
 * rapidly with dimension. Singular Jacobians, failed evaluations, and starts
 * that do not converge are discarded. Calculations use the ambient
 * `decimal.js` precision, and the supplied equation and variable arrays are
 * retained by the solver.
 *
 * The numerical linear solve requires a square Jacobian in ordinary use; this
 * class is intended for isolated solutions of systems with as many equations
 * as variables.
 */
export class MultivariateSolver {
	private dedupTol: Decimal;
	private equations: Expression[];
	private gridPoints: number;
	private h: Decimal;
	private lowerBound: number;
	private maxIterations: number;
	private tolerance: Decimal;
	private upperBound: number;
	private variables: string[];

	/**
	 * Creates a multi-start solver over the configured limits.
	 *
	 * @param equations - Expressions interpreted as equations equal to zero.
	 * @param variables - Ordered variables corresponding to solution coordinates.
	 * @param options - Grid, iteration, differentiation, and deduplication settings.
	 */
	constructor(
		equations: Expression[],
		variables: string[],
		options: MultivariateSolverOptions = {}
	) {
		this.equations = equations;
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
	 * Evaluate all equations at a point, returning a vector of Decimal values.
	 */
	private evaluateSystem(point: Decimal[]): Decimal[] | null {
		const values: ParserValuesObject = {};
		for (let i = 0; i < this.variables.length; i++) {
			const value = point[i];
			// Preserve the parser's existing handling for non-finite values while keeping
			// ordinary Newton coordinates native.
			values[this.variables[i]] = value.isFinite() ? Expression.Number(value) : value;
		}

		const result: Decimal[] = [];
		for (const eq of this.equations) {
			try {
				const evaluated = eq.evaluate(values);
				if (!Expression.isExpression(evaluated)) {
					return null;
				}
				result.push(evaluated.getMultiplier().toDecimal());
			} catch {
				return null;
			}
		}
		return result;
	}

	/**
	 * Generate grid starting points.
	 */
	private generateStartingPoints(): Decimal[][] {
		const n = this.variables.length;
		const points: Decimal[][] = [];
		const step = (this.upperBound - this.lowerBound) / (this.gridPoints - 1);

		// Generate all combinations of grid points
		const indices = new Array(n).fill(0);

		while (true) {
			const point: Decimal[] = [];
			for (let i = 0; i < n; i++) {
				point.push(new Decimal(this.lowerBound + indices[i] * step));
			}
			points.push(point);

			// Increment indices 
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
	 * Check if a root is a duplicate of an existing one.
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
	 * Compute the Jacobian matrix numerically using central differences.
	 */
	private jacobian(point: Decimal[]): DecimalMatrix | null {
		const n = this.variables.length;
		const m = this.equations.length;
		const data: Decimal[][] = new Array(m).fill(null).map(() => []);
		const twoH = this.h.times(2);

		// A forward/backward system evaluation contains every Jacobian row for one
		// variable. Evaluate once per variable instead of once per equation-variable pair.
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
	 * Run Newton-Raphson from a single starting point.
	 * Returns the converged root or null if it didn't converge.
	 */
	private newtonRaphson(start: Decimal[]): Decimal[] | null {
		const x = start.map(v => new Decimal(v));

		for (let iter = 0; iter < this.maxIterations; iter++) {
			const F = this.evaluateSystem(x);
			if (!F) {
				return null;
			}

			// Check convergence: ||F(x)|| < tolerance
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

			// Solve J * delta = -F
			const negF = F.map(fi => fi.neg());
			const delta = DecimalMatrix.solve(J, negF);
			if (!delta) {
				return null; // Singular Jacobian
			}

			// Update: x = x + delta
			for (let i = 0; i < x.length; i++) {
				x[i] = x[i].plus(delta[i]);
			}
		}

		// Check if we're close enough after max iterations
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

		return null;
	}

	/**
	 * Searches for roots from every configured grid point.
	 *
	 * @returns Deduplicated solutions as maps keyed in `variables` order. An empty
	 * array means that no start converged; it does not prove that no root exists.
	 */
	roots(): Map<string, Expression>[] {
		const convergedRoots: Decimal[][] = [];
		const startingPoints = this.generateStartingPoints();

		for (const start of startingPoints) {
			const root = this.newtonRaphson(start);
			if (root && !this.isDuplicate(root, convergedRoots)) {
				convergedRoots.push(root);
			}
		}

		// Convert to Maps of Expressions
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
