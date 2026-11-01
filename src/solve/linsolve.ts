import { collectVariablesSet } from '../core/classes/expression/collect';
import { Expression } from '../core/classes/expression/Expression';
import { zero } from '../core/classes/expression/shortcuts';
import { Matrix } from '../core/classes/matrix/Matrix';
import { Vector } from '../core/classes/vector/Vector';
import { message, DimensionError } from '../core/errors';
/**
 * Discriminated result of exact symbolic linear-system reduction.
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

export class NonlinearSystemError extends Error {}

/**
 * Solves a system of linear equations by symbolic reduced row-echelon form.
 *
 * Each element of `equations` is an Expression representing `expr = 0`.
 * If `variables` is omitted, the union of all variables across equations is used
 * (sorted alphabetically for deterministic column ordering).
 *
 * Input Expressions and strings are interpreted as equal to zero. Coefficients
 * may be symbolic as long as they do not contain any of the solve variables.
 * For an underdetermined consistent system, free variables map to their own
 * Expression and pivot variables are expressed in terms of them.
 *
 * @param equations - Vector of Expressions, or an array of Expressions and strings.
 * @param variables - Optional ordered list of variable names.
 * @returns A {@link LinearSystemResult} describing a unique, infinite, or
 * inconsistent system.
 * @throws {@link Error} If a solve variable occurs nonlinearly or in a
 * non-polynomial position.
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
	equations: Vector | Array<Expression | string>,
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

	const result = solveAugmentedLinearSystem(augRows, numCols);
	if (result.type === 'unique') {
		const solutions: Record<string, Expression> = {};
		for (let i = 0; i < vars.length; i++) {
			solutions[vars[i]] = result.values[i];
		}
		return { type: 'unique', solutions };
	}
	if (result.type === 'inconsistent') {
		return { type: 'inconsistent' };
	}

	const { reduced, pivotColumns, freeColumns } = result;
	const freeVariables = freeColumns.map(j => vars[j]);
	const solutions: Record<string, Expression> = {};
	for (const freeVar of freeVariables) {
		solutions[freeVar] = Expression.create(freeVar);
	}
	for (let i = 0; i < pivotColumns.length; i++) {
		const pivot = pivotColumns[i];
		if (pivot < 0) {continue;}
		let value = reduced.get(i, numCols);
		for (const free of freeColumns) {
			const coefficient = reduced.get(i, free);
			if (!coefficient.isZero()) {
				value = value.minus(coefficient.times(Expression.create(vars[free])));
			}
		}
		solutions[vars[pivot]] = value;
	}
	return { type: 'infinite', solutions, freeVariables };
}

/**
 * Reduce an augmented symbolic matrix without reconstructing equations.
 * The final column is the right-hand side; earlier columns are unknowns.
 */
export function solveAugmentedLinearSystem(
	rows: Expression[][],
	count: number
):
	| { type: 'unique'; values: Expression[] }
	| { type: 'infinite'; reduced: Matrix; pivotColumns: number[]; freeColumns: number[] }
	| { type: 'inconsistent' } {
	if (!Number.isInteger(count) || count < 0 || rows.some(row => row.length !== count + 1)) {
		throw new DimensionError(message('wrongInput', { expected: 'an augmented matrix with count + 1 columns', received: 'incompatible dimensions' }));
	}
	if (rows.length === 0) {
		return count === 0
			? { type: 'unique', values: [] }
			: { type: 'infinite', reduced: new Matrix(), pivotColumns: [], freeColumns: Array.from({ length: count }, (_, i) => i) };
	}
	const reduced = new Matrix(...rows).rref();
	const pivotColumns: number[] = [];
	let inconsistent = false;
	for (let i = 0; i < reduced.rows(); i++) {
		let pivot = -1;
		for (let j = 0; j < count; j++) {
			if (!reduced.get(i, j).isZero()) {
				pivot = j;
				break;
			}
		}
		if (pivot < 0 && !reduced.get(i, count).isZero()) {
			inconsistent = true;
		}
		pivotColumns.push(pivot);
	}
	const used = new Set(pivotColumns);
	const freeColumns = Array.from({ length: count }, (_, i) => i)
		.filter(i => !used.has(i));
	if (inconsistent) {
		return { type: 'inconsistent' };
	}
	if (freeColumns.length !== 0) {
		return { type: 'infinite', reduced, pivotColumns, freeColumns };
	}
	const values = new Array<Expression>(count);
	for (let i = 0; i < pivotColumns.length; i++) {
		if (pivotColumns[i] >= 0) {values[pivotColumns[i]] = reduced.get(i, count);}
	}
	return { type: 'unique', values };
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Normalizes input to an array of Expressions.
 */
function normalizeEquations(equations: Vector | Array<Expression | string>): Expression[] {
	if (Vector.isVector(equations)) {
		const result: Expression[] = [];
		for (let i = 0; i < equations.count(); i++) {
			result.push(equations.getExpressionAt(i));
		}
		return result;
	}

	return equations.map(e => (Expression.isExpression(e) ? e : Expression.create(e)));
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
				throw new NonlinearSystemError(
					message('solveLinearNonlinearDegree', {
						equation: String(i + 1),
						degree: String(totalDegree),
					})
				);
			}
		});
		// Validate that no coefficient contains solve variables in non-polynomial positions
		// (e.g. sin(x) would be absorbed as a "constant" but still contains x)
		const allCoeffs = [...row, constant];
		for (const c of allCoeffs) {
			for (const v of vars) {
				if (c.hasVariable(v)) {
					throw new NonlinearSystemError(
						message('solveLinearNonPolynomialVariable', {
							equation: String(i + 1),
							variable: v,
						})
					);
				}
			}
		}

		coeffMatrix.push(row);
		constants.push(constant);
	}

	return { coeffMatrix, constants };
}
