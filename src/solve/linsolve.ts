import { collectVariablesSet } from '../core/classes/expression/collect';
import { Expression } from '../core/classes/expression/Expression';
import { zero } from '../core/classes/expression/shortcuts';
import { Matrix } from '../core/classes/matrix/Matrix';
import { Vector } from '../core/classes/vector/Vector';
/**
 * Result of solving a linear system.
 *
 * - `type: 'unique'`        — exactly one solution; `solutions` maps each variable to its value.
 * - `type: 'infinite'`      — infinitely many solutions; `solutions` maps pivot variables to
 *                              Expressions in terms of free variables; `freeVariables` lists the
 *                              parameter names.
 * - `type: 'inconsistent'`  — the system has no solution.
 */
export type LinearSystemResult =
	| {
			type: 'unique';
			solutions: Record<string, Expression>;
	  }
	| {
			type: 'infinite';
			solutions: Record<string, Expression>;
			freeVariables: string[];
	  }
	| {
			type: 'inconsistent';
	  };

/**
 * Solves a system of linear equations.
 *
 * Each element of `equations` is an Expression representing `expr = 0`.
 * If `variables` is omitted, the union of all variables across equations is used
 * (sorted alphabetically for deterministic column ordering).
 *
 * @param equations  A Vector of Expressions (each = 0), or an array of Expressions / strings.
 * @param variables  Optional ordered list of variable names.
 * @returns          A LinearSystemResult describing the solution.
 *
 * @example
 * ```ts
 * // x + y - 3 = 0,  2x + 3y - 8 = 0
 * const result = solveLinearSystem(
 *     [Expression.create('x+y-3'), Expression.create('2*x+3*y-8')]
 * );
 * // result.type === 'unique'
 * // result.solutions === { x: Expression(1), y: Expression(2) }
 * ```
 */
export function solveLinearSystem(
	equations: Vector | Expression[] | string[],
	variables?: string[]
): LinearSystemResult {
	// Normalize input
	const exprs: Expression[] = normalizeEquations(equations);

	if (exprs.length === 0) {
		return { type: 'unique', solutions: {} };
	}

	// Determine variables
	const vars = variables ?? collectVariablesSet(exprs);

	if (vars.length === 0) {
		// No variables — check if all equations are trivially 0
		for (const expr of exprs) {
			if (!expr.eq(zero())) {
				return { type: 'inconsistent' };
			}
		}
		return { type: 'unique', solutions: {} };
	}

	//  Extract coefficients and build augmented matrix
	const { coeffMatrix, constants } = extractCoefficients(exprs, vars);

	// Build augmented matrix [A | -b] where each equation is a_1*x_1 + ... + a_n*x_n + c = 0
	// so the augmented column is -c
	const numRows = exprs.length;
	const numCols = vars.length;
	const augRows: Expression[][] = [];

	for (let i = 0; i < numRows; i++) {
		const row: Expression[] = [];
		for (let j = 0; j < numCols; j++) {
			row.push(coeffMatrix[i][j]);
		}
		// Augmented column: negate the constant
		row.push(zero().minus(constants[i]));
		augRows.push(row);
	}

	const augmented = new Matrix(...augRows);

	// RREF
	const R = augmented.rref();
	const rRows = R.rows();
	// const rCols = R.cols(); // = numCols + 1
	const z = zero();

	// Identify pivots and check consistency
	const pivotCol: number[] = []; // pivotCol[i] = column of pivot in row i, or -1
	for (let i = 0; i < rRows; i++) {
		let found = -1;
		for (let j = 0; j < numCols; j++) {
			if (!(R.get(i, j) as Expression).eq(z)) {
				found = j;
				break;
			}
		}

		if (found === -1) {
			// All variable columns are zero — check augmented column
			const rhs = R.get(i, numCols) as Expression;
			if (!rhs.eq(z)) {
				return { type: 'inconsistent' };
			}
			// Otherwise it's a trivial 0 = 0 row
			pivotCol.push(-1);
		} else {
			pivotCol.push(found);
		}
	}

	// Identify pivot vs free variable columns
	const pivotColSet = new Set<number>();
	for (const pc of pivotCol) {
		if (pc !== -1) {
			pivotColSet.add(pc);
		}
	}

	const freeColIndices: number[] = [];
	for (let j = 0; j < numCols; j++) {
		if (!pivotColSet.has(j)) {
			freeColIndices.push(j);
		}
	}

	// Unique solution
	if (freeColIndices.length === 0) {
		const solutions: Record<string, Expression> = {};
		for (let i = 0; i < rRows; i++) {
			const pc = pivotCol[i];
			if (pc !== -1) {
				solutions[vars[pc]] = R.get(i, numCols) as Expression;
			}
		}
		return { type: 'unique', solutions };
	}

	// Infinite solutions
	// Free variables are parameters; pivot variables are expressed in terms of them.
	const freeVariables = freeColIndices.map(j => vars[j]);
	const solutions: Record<string, Expression> = {};

	// Free variables map to themselves
	for (const freeVar of freeVariables) {
		solutions[freeVar] = Expression.create(freeVar);
	}

	// Pivot variables: x_pivot = rhs - sum(coeff * freeVar)
	for (let i = 0; i < rRows; i++) {
		const pc = pivotCol[i];
		if (pc === -1) {
			continue;
		}

		let expr: Expression = R.get(i, numCols) as Expression;

		for (const fj of freeColIndices) {
			const coeff = R.get(i, fj) as Expression;
			if (!coeff.eq(z)) {
				// x_pivot = rhs - coeff * freeVar
				expr = expr.minus(coeff.times(Expression.create(vars[fj])));
			}
		}

		solutions[vars[pc]] = expr;
	}

	return { type: 'infinite', solutions, freeVariables };
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Normalizes input to an array of Expressions.
 */
function normalizeEquations(equations: Vector | Expression[] | string[]): Expression[] {
	if (Vector.isVector(equations)) {
		const result: Expression[] = [];
		for (let i = 0; i < equations.count(); i++) {
			result.push(equations.getExpressionAt(i));
		}
		return result;
	}

	return (equations as (Expression | string)[]).map(e =>
		Expression.isExpression(e) ? e : Expression.create(e as string)
	);
}

/**
 * Extracts the coefficient matrix and constant vector from linear expressions.
 *
 * For each expression, uses `expr.coeffs(...vars)` to get a CoeffObject.
 * The CoeffObject keys are comma-separated multi-degree tuples like "1,0" for x in [x, y].
 * The constant term has the all-zeros key (e.g. "0,0").
 *
 * Throws if any term has degree > 1 in any variable (nonlinear).
 */
function extractCoefficients(
	exprs: Expression[],
	vars: string[]
): { coeffMatrix: Expression[][]; constants: Expression[] } {
	const n = vars.length;
	const coeffMatrix: Expression[][] = [];
	const constants: Expression[] = [];

	for (let i = 0; i < exprs.length; i++) {
		const expr = exprs[i];
		const coeffObj = expr.coeffs(...vars);

		const row: Expression[] = new Array(n).fill(null).map(() => zero());
		let constant = zero();

		// CoeffObject stores coefficients in .coeffs keyed by comma-separated degree tuples.
		// e.g. for vars [x, y]: "1,0" means x^1*y^0 (coefficient of x),
		// "0,0" is the constant term, "0,1" is coefficient of y, etc.
		// Use .each() to iterate over all entries.
		coeffObj.each((coeff: Expression, key: string) => {
			const degrees = key.split(',').map(Number);

			// Check total degree
			const totalDegree = degrees.reduce((sum, d) => sum + d, 0);

			if (totalDegree === 0) {
				// Constant term
				constant = coeff;
			} else if (totalDegree === 1) {
				// Linear term — find which variable
				const varIndex = degrees.findIndex(d => d === 1);
				if (varIndex !== -1) {
					row[varIndex] = coeff;
				}
			} else {
				// Nonlinear term
				throw new Error(
					`Nonlinear term detected in equation ${i + 1}: degree ${totalDegree} term found. ` +
						`solveLinearSystem only handles linear systems.`
				);
			}
		});
		// Validate that no coefficient contains solve variables in non-polynomial positions
		// (e.g. sin(x) would be absorbed as a "constant" but still contains x)
		const allCoeffs = [...row, constant];
		for (const c of allCoeffs) {
			for (const v of vars) {
				if (c.hasVariable(v)) {
					throw new Error(
						`Nonlinear term detected in equation ${i + 1}: ` +
							`variable "${v}" appears in a non-polynomial position. ` +
							`solveLinearSystem only handles linear systems.`
					);
				}
			}
		}

		coeffMatrix.push(row);
		constants.push(constant);
	}

	return { coeffMatrix, constants };
}
