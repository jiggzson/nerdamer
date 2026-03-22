import Decimal from 'decimal.js';

import { Expression } from '../../core/classes/expression/Expression';

import { DecimalMatrix } from './DecimalMatrix';

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

	constructor(
		equations: Expression[],
		variables: string[],
		options: MultivariateSolverOptions = {}
	) {
		this.equations = equations;
		this.variables = variables;
		this.lowerBound = options.lowerBound ?? -10;
		this.upperBound = options.upperBound ?? 10;
		this.gridPoints = options.gridPoints ?? 5;
		this.maxIterations = options.maxIterations ?? 100;
		this.tolerance = new Decimal(options.tolerance ?? 1e-12);
		this.h = new Decimal(options.derivativeStep ?? 1e-8);
		this.dedupTol = new Decimal(options.deduplicationTolerance ?? 1e-8);
	}

	/**
	 * Evaluate all equations at a point, returning a vector of Decimal values.
	 */
	private evaluateSystem(point: Decimal[]): Decimal[] | null {
		const values: Record<string, Decimal> = {};
		for (let i = 0; i < this.variables.length; i++) {
			values[this.variables[i]] = point[i];
		}

		const result: Decimal[] = [];
		for (const eq of this.equations) {
			const evaluated = eq.evaluate(values);
			if (!Expression.isExpression(evaluated)) {
				return null;
			}
			try {
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

			// Increment indices (odometer-style)
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
		const data: Decimal[][] = [];

		for (let i = 0; i < m; i++) {
			const row: Decimal[] = [];
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

				row.push(fPlus[i].minus(fMinus[i]).div(this.h.times(2)));
			}
			data.push(row);
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
	 * Find all roots by running Newton-Raphson from multiple starting points.
	 * Returns an array of solutions, each as a Map from variable name to Expression.
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
				solution.set(this.variables[i], Expression.create(root[i]));
			}
			return solution;
		});
	}
}
