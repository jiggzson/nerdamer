import Decimal from 'decimal.js';

/**
 * A lightweight numeric matrix over Decimal.js for use in numerical solvers.
 * Supports only the operations needed for Newton-Raphson: construction and linear solve.
 */
export class DecimalMatrix {
	private data: Decimal[][];
	readonly cols: number;
	readonly rows: number;

	constructor(data: Decimal[][]) {
		this.rows = data.length;
		this.cols = data.length > 0 ? data[0].length : 0;
		this.data = data.map(row => row.map(v => new Decimal(v)));
	}

	/**
	 * Solves the linear system Ax = b using Gaussian elimination with partial pivoting.
	 * Returns the solution vector x, or null if the system is singular.
	 */
	static solve(A: DecimalMatrix, b: Decimal[]): Decimal[] | null {
		const n = A.rows;
		if (n !== A.cols || n !== b.length) {
			return null;
		}

		// Build augmented matrix [A | b]
		const aug: Decimal[][] = [];
		for (let i = 0; i < n; i++) {
			const row: Decimal[] = [];
			for (let j = 0; j < n; j++) {
				row.push(new Decimal(A.get(i, j)));
			}
			row.push(new Decimal(b[i]));
			aug.push(row);
		}

		// Forward elimination with partial pivoting
		for (let col = 0; col < n; col++) {
			// Find pivot
			let maxAbs = aug[col][col].abs();
			let maxRow = col;
			for (let row = col + 1; row < n; row++) {
				const val = aug[row][col].abs();
				if (val.greaterThan(maxAbs)) {
					maxAbs = val;
					maxRow = row;
				}
			}

			if (maxAbs.lessThan(new Decimal('1e-30'))) {
				return null; // Singular
			}

			// Swap rows
			if (maxRow !== col) {
				[aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
			}

			// Eliminate below
			const pivot = aug[col][col];
			for (let row = col + 1; row < n; row++) {
				const factor = aug[row][col].div(pivot);
				for (let j = col; j <= n; j++) {
					aug[row][j] = aug[row][j].minus(factor.times(aug[col][j]));
				}
			}
		}

		// Back substitution
		const x: Decimal[] = new Array(n);
		for (let i = n - 1; i >= 0; i--) {
			let sum = aug[i][n];
			for (let j = i + 1; j < n; j++) {
				sum = sum.minus(aug[i][j].times(x[j]));
			}
			if (aug[i][i].abs().lessThan(new Decimal('1e-30'))) {
				return null; // Singular
			}
			x[i] = sum.div(aug[i][i]);
		}

		return x;
	}

	get(i: number, j: number): Decimal {
		return this.data[i][j];
	}
}
