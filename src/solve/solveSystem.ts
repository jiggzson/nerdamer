import { multiPolyToExpression, polynomialToMultiPoly } from '../algebra/adapters';
import { Groebner } from '../algebra/algorithms/groebnerBase';
import { toCommonDenominator } from '../algebra/simplify/ratsimp';
import { Dictionary } from '../core/classes/dictionary/Dictionary';
import { Equation } from '../core/classes/equation/Equation';
import { normalizeMultiplierDenominators } from '../core/classes/expression/analysis';
import { collectVariablesSet } from '../core/classes/expression/collect';
import { Expression } from '../core/classes/expression/Expression';
import { zero } from '../core/classes/expression/shortcuts';
import { dataTypes } from '../core/classes/parser/constants';
import { Parser } from '../core/classes/parser/Parser';
import { Polynomial } from '../core/classes/polynomial/Polynomial';
import { Vector } from '../core/classes/vector/Vector';
import { message, UnexpectedInputError, UnsupportedOperationError } from '../core/errors';

import { MultivariateSolver } from './classes/MultivariateSolver';
import { solveLinearSystem } from './linsolve';
import { solve as solveUnivariate } from './solve';

import type { ExpressionInput, NerdamerInput } from '../core/types';

function toExpression(input: NerdamerInput): Expression {
	if (Equation.isEquation(input)) {
		return input.toLHS().LHS;
	}
	if (Expression.isExpression(input)) {
		return input;
	}
	const parsed = Parser.parse(String(input));
	if (Equation.isEquation(parsed)) {
		return parsed.toLHS().LHS;
	}
	if (Expression.isExpression(parsed)) {
		return parsed;
	}
	throw new UnexpectedInputError(
		message('expressionExpected', { type: dataTypes[parsed.dataType] })
	);
}

function normalizeEquations(
	equations: Vector | Array<ExpressionInput | Equation | string>
): Expression[] {
	if (Vector.isVector(equations)) {
		const result: Expression[] = [];
		for (let i = 0; i < equations.count(); i++) {
			result.push(toExpression(equations.__get__([i])));
		}
		return result;
	}
	return equations.map(eq => toExpression(eq));
}

function symbolicBackSubstitution(
	basisExprs: Expression[],
	vars: string[]
): Map<string, Expression>[] {
	let partials: { assignment: Map<string, Expression>; basis: Expression[] }[] = [
		{ assignment: new Map(), basis: basisExprs },
	];

	for (let i = vars.length - 1; i >= 0; i--) {
		const v = vars[i];
		const unsolved = new Set(vars.slice(0, i));
		const nextPartials: typeof partials = [];

		for (const { assignment, basis } of partials) {
			const univariates = basis.filter(expr => {
				if (expr.isZero()) {
					return false;
				}
				const exprVars = expr.variables();
				if (!exprVars.includes(v)) {
					return false;
				}
				for (const ev of exprVars) {
					if (unsolved.has(ev)) {
						return false;
					}
				}
				return true;
			});

			if (univariates.length === 0) {
				nextPartials.push({ assignment: new Map(assignment), basis });
				continue;
			}

			const solutions = solveUnivariate(univariates[0], v);
			const roots = solutions.elements;

			for (const root of roots) {
				let consistent = true;
				for (let k = 1; k < univariates.length; k++) {
					const substituted = univariates[k].subst(v, root);
					if (substituted.isConstant() && !substituted.isNearlyZero()) {
						consistent = false;
						break;
					}
				}
				if (!consistent) {
					continue;
				}

				const newBasis = basis.map(expr => {
					if (!expr.hasVariable(v)) {
						return expr;
					}
					const exprVars = expr.variables();
					const hasUnsolvedVars = exprVars.some(ev => unsolved.has(ev));
					if (!hasUnsolvedVars && exprVars.length === 1 && exprVars[0] === v) {
						return zero();
					}
					return expr.subst(v, root);
				});

				const ext = new Map(assignment);
				ext.set(v, root);
				nextPartials.push({ assignment: ext, basis: newBasis });
			}
		}

		partials = nextPartials;
	}

	return partials.map(p => p.assignment);
}

function solutionsToDictionaries(
	solutions: Map<string, Expression>[],
	vars: string[]
): Dictionary[] {
	const dictionaries: Dictionary[] = [];

	for (const solution of solutions) {
		if (solution.size !== vars.length) {
			throw new UnsupportedOperationError(message('solveSystemInfiniteSolutions'));
		}

		const dictionary = new Dictionary();
		for (const variable of vars) {
			const value = solution.get(variable);
			if (!value) {
				throw new UnsupportedOperationError(message('solveSystemInfiniteSolutions'));
			}
			dictionary.set(variable, value);
		}
		dictionaries.push(dictionary);
	}

	return dictionaries;
}

function isSystemSolution(
	expressions: Expression[],
	domainRestrictions: Expression[],
	solution: Map<string, Expression>
): boolean {
	const values: Record<string, Expression> = {};
	for (const [variable, value] of solution) {
		values[variable] = value;
	}

	let retval = true;
	try {
		// A cleared denominator remains part of the original equation's domain.
		// If it cannot be shown to be nonzero for this candidate, the rewrite is not
		// sufficient to certify the candidate as a solution.
		for (const restriction of domainRestrictions) {
			const evaluated = restriction.evaluate(values);
			if (!evaluated.isConstant() || evaluated.isZero()) {
				retval = false;
				break;
			}
		}

		if (retval) {
			for (const expression of expressions) {
				const evaluated = expression.evaluate(values);
				if (!evaluated.isConstant() || !evaluated.isNearlyZero()) {
					retval = false;
					break;
				}
			}
		}
	} catch {
		retval = false;
	}

	return retval;
}

/**
 * Solves a system of expressions or equations for an ordered set of variables.
 *
 * Expressions are interpreted as equal to zero. The solver first tries exact
 * linear reduction, then a lexicographic Groebner basis with symbolic back
 * substitution for polynomial systems, and finally multivariate Newton-Raphson
 * over a fixed search interval. Rational polynomial systems may have denominators
 * cleared for symbolic work; candidates are checked against the original domain.
 *
 * @remarks
 * The nonlinear numerical fallback is heuristic and does not guarantee all
 * roots. A returned outer {@link Vector} contains one {@link Dictionary} per
 * solution. An empty system has one empty solution, while no discovered or
 * inconsistent solution is represented by an empty Vector.
 *
 * Infinite nonlinear solution sets are not represented. Underdetermined
 * systems that reach numerical fallback are rejected.
 *
 * @param equations - Vector or array of equations and zero-valued expressions.
 * @param variables - Optional variable order. When omitted, variables are
 * collected from the normalized expressions.
 * @returns A Vector of solution dictionaries keyed by variable name.
 * @throws {@link core!UnexpectedInputError} If an input cannot be normalized to an
 * Expression or Equation.
 * @throws {@link core!UnsupportedOperationError} If a solution is not isolated or an
 * underdetermined nonlinear system reaches numerical fallback.
 */
export function solveSystem(
	equations: Vector | Array<ExpressionInput | Equation | string>,
	variables?: string[]
): Vector {
	const expressions = normalizeEquations(equations);

	if (expressions.length === 0) {
		return new Vector([new Dictionary()]);
	}

	const vars = variables ?? collectVariablesSet(expressions);

	if (vars.length === 0) {
		return expressions.every(e => e.isZero()) ? new Vector([new Dictionary()]) : new Vector([]);
	}

	// Rational equations can still be polynomial equations after their denominators are
	// cleared. Keep the original expressions for domain checks and numerical fallback,
	// and only use the rewritten forms for symbolic solving.
	const symbolicExpressions: Expression[] = [];
	const domainRestrictions: Expression[] = [];
	let hasRationalRewrite = false;

	for (const expression of expressions) {
		let symbolicExpression = expression;

		if (!expression.isPolynomialLike()) {
			const rational = toCommonDenominator(expression);
			const numerator = rational.getNumerator().expand();
			const denominator = rational.getDenominator().expand();

			if (
				!denominator.isOne() &&
				numerator.isPolynomialLike() &&
				denominator.isPolynomialLike()
			) {
				symbolicExpression = numerator;
				domainRestrictions.push(denominator);
				hasRationalRewrite = true;
			}
		}

		symbolicExpressions.push(symbolicExpression);
	}

	// 1. Try linear solver
	try {
		const linear = solveLinearSystem(symbolicExpressions, vars);

		if (linear.type === 'inconsistent') {
			return new Vector([]);
		}

		if (linear.type === 'infinite') {
			if (!hasRationalRewrite) {
				const dictionary = new Dictionary();
				for (const variable of vars) {
					if (variable in linear.solutions) {
						dictionary.set(variable, linear.solutions[variable]);
					}
				}
				return new Vector([dictionary]);
			}
		} else {
			const dictionary = new Dictionary();
			const solution = new Map<string, Expression>();
			for (const variable of vars) {
				if (variable in linear.solutions) {
					const value = linear.solutions[variable];
					dictionary.set(variable, value);
					solution.set(variable, value);
				}
			}

			if (!hasRationalRewrite || isSystemSolution(expressions, domainRestrictions, solution)) {
				return new Vector([dictionary]);
			}

			return new Vector([]);
		}
	} catch (error) {
		if (!(error instanceof Error) || !error.message.includes('Nonlinear term detected')) {
			throw error;
		}
	}

	// 2. Nonlinear polynomial: Gröbner basis + symbolic back-substitution
	const allPolynomial = symbolicExpressions.every(e => e.isPolynomialLike());

	if (allPolynomial) {
		try {
			const polys = symbolicExpressions.map(expression => {
				const cleared = normalizeMultiplierDenominators(expression);
				return polynomialToMultiPoly(new Polynomial(cleared, vars), vars).poly;
			});

			const basis = Groebner(polys, vars, 'LEX', true);

			if (basis.length === 1 && basis[0].isConstant() && basis[0].constantTerm() !== 0n) {
				return new Vector([]);
			}

			const basisExprs = basis.map(p => multiPolyToExpression(p, vars));
			let solutions = symbolicBackSubstitution(basisExprs, vars);

			if (hasRationalRewrite) {
				solutions = solutions.filter(solution =>
					isSystemSolution(expressions, domainRestrictions, solution)
				);
			}

			if (solutions.length > 0) {
				return new Vector(solutionsToDictionaries(solutions, vars));
			}
		} catch {
			// Fall through to numeric solver
		}
	}

	// 3. Numeric fallback: multivariate Newton-Raphson
	if (expressions.length < vars.length) {
		throw new UnsupportedOperationError(message('solveSystemInfiniteSolutions'));
	}

	const solver = new MultivariateSolver(expressions, vars);
	const numericSolutions = solver.roots();

	if (numericSolutions.length === 0) {
		return new Vector([]);
	}

	return new Vector(solutionsToDictionaries(numericSolutions, vars));
}
