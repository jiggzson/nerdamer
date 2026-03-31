import { Groebner } from '../algebra/algorithms/groebnerBase';
import { polynomialToMultiPoly, multiPolyToExpression } from '../core/adapters';
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

import type { ExpressionInputType } from '../core/classes/parser/types';

function toExpression(input: ExpressionInputType | Equation | string): Expression {
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
	equations: Vector | Array<ExpressionInputType | Equation | string>
): Expression[] {
	if (Vector.isVector(equations)) {
		const result: Expression[] = [];
		for (let i = 0; i < equations.count(); i++) {
			result.push(toExpression(equations.at(i) as Expression | Equation));
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
					const substituted = univariates[k].subst(v, root.text());
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
					return expr.subst(v, root.text());
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

/**
 * Solves a set of a given system equations. Will attempt to solve the system symbolically.
 * For a system of non-linear polynomial equations, the solver utilize Groebner and back-substitution.
 * The solver falls back to numerical methods if no symbolic solutions are found. An attempt
 * will be made to find all solutions but this is not guaranteed.
 *
 * @param equations - A set of linear or non-linear equations
 * @param variables - The variables to solve for.
 * @returns A Vector<Dictionary>[] with all solution sets found. Returns and empty if none are found.
 */
export function solveSystem(
	equations: Vector | Array<ExpressionInputType | Equation | string>,
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

	// 1. Try linear solver
	try {
		const linear = solveLinearSystem(expressions, vars);

		if (linear.type === 'inconsistent') {
			return new Vector([]);
		}

		if (linear.type === 'infinite') {
			const dictionary = new Dictionary();
			for (const variable of vars) {
				if (variable in linear.solutions) {
					dictionary.set(variable, linear.solutions[variable]);
				}
			}
			return new Vector([dictionary]);
		}

		const dictionary = new Dictionary();
		for (const variable of vars) {
			if (variable in linear.solutions) {
				dictionary.set(variable, linear.solutions[variable]);
			}
		}
		return new Vector([dictionary]);
	} catch (error) {
		if (!(error instanceof Error) || !error.message.includes('Nonlinear term detected')) {
			throw error;
		}
	}

	// 2. Nonlinear polynomial: Gröbner basis + symbolic back-substitution
	const allPolynomial = expressions.every(e => e.isPolynomialLike());

	if (allPolynomial) {
		try {
			const polys = expressions.map(expression => {
				const cleared = normalizeMultiplierDenominators(expression);
				return polynomialToMultiPoly(new Polynomial(cleared, vars), vars).poly;
			});

			const basis = Groebner(polys, vars, 'LEX', true);

			if (basis.length === 1 && basis[0].isConstant() && basis[0].constantTerm() !== 0n) {
				return new Vector([]);
			}

			const basisExprs = basis.map(p => multiPolyToExpression(p, vars));
			const solutions = symbolicBackSubstitution(basisExprs, vars);

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
