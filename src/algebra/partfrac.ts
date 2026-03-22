import { Expression } from '../core/classes/expression/Expression';
import { minusOne, zero, one } from '../core/classes/expression/shortcuts';
import { Matrix } from '../core/classes/matrix/Matrix';
import { Polynomial } from '../core/classes/polynomial/Polynomial';
import { divide } from '../core/classes/polynomial/utils';

import { polyFactors } from './factor/factor';

import type { ExpressionInputType } from '../core/classes/parser/types';
import type { Vector } from '../core/classes/vector/Vector';

/**
 * Decomposes a rational expression P(x)/Q(x) into partial fractions.
 *
 * Algorithm:
 * 1. Extract numerator P and denominator Q
 * 2. If deg(P) >= deg(Q), perform polynomial long division to get a polynomial part
 * 3. Factor Q into irreducible factors over Z
 * 4. Set up the partial fraction form with undetermined coefficients
 * 5. Solve for coefficients using evaluation at strategic points
 *
 * @param x The rational expression to decompose
 * @param variable The variable (defaults to first variable found)
 * @returns The partial fraction decomposition as an Expression
 */
export function partfrac(x: ExpressionInputType, variable?: ExpressionInputType): Expression {
	const expr = Expression.create(x);
	let result = expr;

	// Determine the variable
	const vars = expr.variables();
	const v = variable ? String(variable) : vars[0];

	if (v && vars.length > 0) {
		// Extract numerator and denominator.
		const { num, den } = extractNumDen(expr, v);

		// Proceed only if the denominator depends on the variable
		if (den.hasVariable(v)) {
			const pNum = new Polynomial(num, [v]);
			const pDen = new Polynomial(den, [v]);
			const degNum = pNum.deg();
			const degDen = pDen.deg();

			// Step 1: If improper fraction, do polynomial long division
			let polyPart = zero();
			let remainder = num;

			if (degNum >= degDen) {
				const [quotient, rem] = divide(num, den);
				polyPart = quotient;
				remainder = rem;
			}

			if (Expression.create(remainder).isZero()) {
				// Remainder is zero — the expression is a polynomial
				result = polyPart;
			} else if (degDen <= 1) {
				// Denominator is linear or constant — no further decomposition possible.
				// If we performed long division, return polyPart + remainder/den.
				if (!polyPart.isZero()) {
					result = polyPart.plus(remainder.div(den));
				}
			} else {
				// Step 2: Factor the denominator
				const factors = polyFactors(den);
				const factorList = collectFactors(factors, v);

				// Only decompose if factoring produced multiple factors or a repeated factor
				const canDecompose =
					factorList.length > 1 || (factorList.length === 1 && factorList[0].power > 1);

				if (canDecompose) {
					// Step 3: Set up and solve partial fractions for remainder/den
					const decomposition = decompose(remainder, den, factorList, v);

					if (decomposition !== undefined) {
						result = polyPart.isZero() ? decomposition : polyPart.plus(decomposition);
					}
				}
			}
		}
	}

	return result;
}

/**
 * Represents a factor of the denominator with its multiplicity.
 */
interface DenominatorFactor {
	/** The irreducible factor expression */
	expr: Expression;
	/** The multiplicity (power) */
	power: number;
	/** The degree of the factor (1 for linear, 2 for quadratic, etc.) */
	degree: number;
}

/**
 * Extracts the numerator and denominator from an expression.
 * For P/Q, returns { num: P, den: Q }.
 *
 * Rational expressions are typically stored as products where denominator
 * factors have negative powers: P * Q^(-1).
 */
function extractNumDen(expr: Expression, _v: string): { num: Expression; den: Expression } {
	// Use getNumerator/getDenominator if available
	try {
		const num = expr.getNumerator();
		const den = expr.getDenominator();
		if (den && !den.isOne()) {
			return { num, den };
		}
	} catch {
		// Fall through to manual extraction
	}

	// Manual extraction: examine the product structure
	// If the expression is a product, separate positive-power and negative-power factors
	if (expr.isProduct()) {
		let num = one();
		let den = one();

		for (const element of expr.elementsArray()) {
			if (element.getPower().isNegative()) {
				// Negative power → denominator factor
				den = den.times(element.invert());
			} else {
				num = num.times(element);
			}
		}

		// Apply the overall multiplier
		num = num.times(Expression.create(expr.getMultiplier().text()));

		return { num, den };
	}

	// Not a product — check if it has a negative power overall
	if (expr.getPower().sign() === -1) {
		return { num: Expression.create(expr.getMultiplier().text()), den: expr.invert() };
	}

	// No denominator
	return { num: expr, den: one() };
}

/**
 * Collects factors from the factor() result, grouping repeated factors.
 * Extracts embedded powers from expressions like (x-1)^3 so that the
 * base (x-1) is stored with degree 1 and power 3.
 */
function collectFactors(factors: Vector, v: string): DenominatorFactor[] {
	const result: DenominatorFactor[] = [];
	const seen = new Map<string, number>(); // text → index in result

	for (let i = 0; i < factors.elements.length; i++) {
		let f = factors.getExpressionAt(i);

		// Skip constant factors (no variable)
		if (!f.hasVariable(v)) {
			continue;
		}

		// Extract embedded power from the expression (e.g., (x-1)^3 → base=(x-1), power=3)
		let expPower = 1;
		const p = f.getPower();
		if (p.isInteger()) {
			const n = Number(p.getNumerator());
			if (n > 1) {
				expPower = n;
				f = f.getBase();
			}
		}

		const key = f.text();
		const deg = new Polynomial(f, [v]).deg();

		if (seen.has(key)) {
			// Repeated factor — accumulate power
			result[seen.get(key)!].power += expPower;
		} else {
			seen.set(key, result.length);
			result.push({ expr: f, power: expPower, degree: deg });
		}
	}

	return result;
}

/**
 * Decomposes remainder/den into partial fractions given the factored denominator.
 *
 * For each linear factor (ax+b)^k:
 *   A₁/(ax+b) + A₂/(ax+b)² + ... + Aₖ/(ax+b)^k
 *
 * For each irreducible quadratic factor (ax²+bx+c)^k:
 *   (B₁x+C₁)/(ax²+bx+c) + ... + (Bₖx+Cₖ)/(ax²+bx+c)^k
 *
 * Uses evaluation at strategic points to solve for coefficients.
 */
function decompose(
	numerator: Expression,
	denominator: Expression,
	factors: DenominatorFactor[],
	v: string
): Expression | undefined {
	// Build the list of partial fraction terms and count unknowns.
	// Each term is: coefficient(s) / factor^power
	// For linear: 1 unknown per power level
	// For quadratic: 2 unknowns per power level (Bx + C)

	const terms: PartialFractionTerm[] = [];
	let totalUnknowns = 0;
	let supported = true;

	for (const f of factors) {
		for (let k = 1; k <= f.power; k++) {
			if (f.degree === 1) {
				terms.push({
					factor: f.expr,
					power: k,
					degree: f.degree,
					unknownIndex: totalUnknowns,
					numUnknowns: 1,
				});
				totalUnknowns += 1;
			} else if (f.degree === 2) {
				terms.push({
					factor: f.expr,
					power: k,
					degree: f.degree,
					unknownIndex: totalUnknowns,
					numUnknowns: 2,
				});
				totalUnknowns += 2;
			} else {
				// Higher-degree irreducible factors — not supported yet
				supported = false;
			}
		}
	}

	if (!supported) {
		return undefined;
	}

	// We need to solve: P(x)/Q(x) = Σ terms
	// Multiply both sides by Q(x):
	// P(x) = Σ (coefficients_i × Q(x) / factor_i^power_i)
	//
	// Strategy: evaluate at `totalUnknowns` distinct values of x to get a linear system,
	// then solve it.

	// Collect evaluation points: roots of linear factors + additional integer points
	const evalPoints: Expression[] = [];

	for (const f of factors) {
		if (f.degree === 1) {
			// Linear factor ax + b: root is x = -b/a
			const root = findLinearRoot(f.expr, v);
			if (root !== undefined) {
				evalPoints.push(root);
			}
		}
	}

	// Add additional integer points to get enough equations
	let pointVal = 0;
	while (evalPoints.length < totalUnknowns) {
		const candidate = Expression.create(`${pointVal}`);
		// Make sure this isn't a root of the denominator (would give division by zero)
		const denAtPoint = evaluateAt(denominator, v, candidate);
		if (!denAtPoint.isZero()) {
			// Also make sure it's not already in our list
			const isDuplicate = evalPoints.some(p => p.eq(candidate));
			if (!isDuplicate) {
				evalPoints.push(candidate);
			}
		}
		pointVal = pointVal <= 0 ? -pointVal + 1 : -pointVal;
	}

	// Build and solve the linear system by evaluation.
	// For each eval point xᵢ:
	//   P(xᵢ) = Σⱼ unknowns_j × basisⱼ(xᵢ)
	// where basisⱼ(x) is what multiplies the j-th unknown after clearing denominators.

	const rows: Expression[][] = [];
	const rhs: Expression[] = [];

	for (let i = 0; i < totalUnknowns; i++) {
		const x = evalPoints[i];
		const numVal = evaluateAt(numerator, v, x);
		rhs.push(numVal);

		const row: Expression[] = [];
		for (const term of terms) {
			// The basis for this term: Q(x) / factor^power, evaluated at x
			const cofactor = computeCofactor(denominator, term.factor, term.power, v, x);

			if (term.numUnknowns === 1) {
				row.push(cofactor);
			} else {
				// Quadratic: (Bx + C) contributes B*x*cofactor + C*cofactor
				row.push(x.times(cofactor)); // coefficient of B
				row.push(cofactor); // coefficient of C
			}
		}
		rows.push(row);
	}

	// Solve the system
	const solution = solveLinearSystem(rows, rhs);
	if (solution === undefined) {
		return undefined;
	}

	// Build the result expression from the solved coefficients
	let result = zero();

	for (const term of terms) {
		const denomPart =
			term.power === 1 ? term.factor : term.factor.pow(Expression.create(`${term.power}`));

		if (term.numUnknowns === 1) {
			const A = solution[term.unknownIndex];
			if (!A.isZero()) {
				result = result.plus(A.div(denomPart));
			}
		} else {
			const B = solution[term.unknownIndex];
			const C = solution[term.unknownIndex + 1];
			// (Bx + C) / factor^power
			const numPart = B.times(Expression.create(v)).plus(C);
			if (!numPart.isZero()) {
				result = result.plus(numPart.div(denomPart));
			}
		}
	}

	return result;
}

interface PartialFractionTerm {
	factor: Expression;
	power: number;
	degree: number;
	unknownIndex: number;
	numUnknowns: number;
}

/**
 * Finds the root of a linear expression ax + b, returning -b/a.
 */
function findLinearRoot(expr: Expression, v: string): Expression | undefined {
	// A linear expression ax + b: evaluate at x=0 to get b, at x=1 to get a+b
	const atZero = evaluateAt(expr, v, zero());
	const atOne = evaluateAt(expr, v, one());
	const a = atOne.plus(atZero.times(minusOne())); // a = f(1) - f(0)

	if (a.isZero()) {
		return undefined;
	}

	// root = -b/a = -f(0)/a
	return atZero.times(minusOne()).div(a);
}

/**
 * Evaluates a polynomial expression at a specific rational value of the variable.
 * Returns the result as an Expression.
 */
function evaluateAt(expr: Expression, v: string, value: Expression): Expression {
	return Expression.create(expr.text(), { [v]: value.text() });
}

/**
 * Computes Q(x) / factor(x)^power, evaluated at a point.
 * This is the "cofactor" — the part of the denominator that remains after removing this term's factor.
 */
function computeCofactor(
	denominator: Expression,
	fac: Expression,
	power: number,
	v: string,
	evalPoint: Expression
): Expression {
	// Q / factor^power
	const facPow = power === 1 ? fac : fac.pow(Expression.create(`${power}`));
	// Evaluate denominator and factor at the point
	const denVal = evaluateAt(denominator, v, evalPoint);
	const facVal = evaluateAt(facPow, v, evalPoint);

	if (facVal.isZero()) {
		// This happens when evalPoint is a root of this factor.
		// For repeated factors, we need to handle this differently.
		// Compute Q/factor^power symbolically, then evaluate.
		const [quotient] = divide(denominator, facPow);
		return evaluateAt(quotient, v, evalPoint);
	}

	return denVal.div(facVal);
}

/**
 * Solves a linear system Ax = b using Gaussian elimination with partial pivoting.
 * Works with Expression arithmetic (exact rational arithmetic).
 *
 * @param A The coefficient matrix (array of rows)
 * @param b The right-hand side vector
 * @returns The solution vector, or undefined if the system is singular
 */
function solveLinearSystem(A: Expression[][], b: Expression[]): Expression[] | undefined {
	const n = b.length;
	if (n === 0) {
		return [];
	}

	// This solver is used to recover exact coefficients for partial fractions.
	// Use Matrix.rref() so we don't duplicate row-reduction logic.
	// Require a unique solution (square, full-rank). Otherwise return undefined.
	const A_mat = new Matrix(...A);
	const b_col = new Matrix(...b.map(v => [v]));
	const aug = A_mat.augment(b_col).rref();

	const rows = aug.rows();
	const cols = aug.cols();
	const unknowns = cols - 1;
	if (rows !== n || unknowns !== n) {
		return undefined;
	}

	// Inconsistency: [0 ... 0 | nonzero]
	for (let i = 0; i < rows; i++) {
		let allZero = true;
		for (let j = 0; j < unknowns; j++) {
			if (!aug.elements[i][j].isZero()) {
				allZero = false;
				break;
			}
		}
		if (allZero && !aug.elements[i][unknowns].isZero()) {
			return undefined;
		}
	}

	// Extract solution from pivots. Expect [I | x] up to row ordering.
	const solution: Expression[] = new Array(n);
	const pivotCols = new Set<number>();
	for (let i = 0; i < rows; i++) {
		let pivot = -1;
		for (let j = 0; j < unknowns; j++) {
			if (!aug.elements[i][j].isZero()) {
				pivot = j;
				break;
			}
		}
		if (pivot === -1) {
			continue;
		}
		if (!aug.elements[i][pivot].eq('1')) {
			return undefined;
		}
		if (pivotCols.has(pivot)) {
			return undefined;
		}
		pivotCols.add(pivot);
		solution[pivot] = aug.elements[i][unknowns];
	}

	if (pivotCols.size !== n) {
		return undefined;
	}

	for (let i = 0; i < n; i++) {
		if (!solution[i]) {
			return undefined;
		}
	}
	return solution;
}
