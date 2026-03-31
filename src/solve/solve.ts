import { factors } from '../algebra/factor/factor';
import { all, zero } from '../core/classes/expression/shortcuts';
import { Polynomial } from '../core/classes/polynomial/Polynomial';

import { FunctionSolver, type FunctionSolverOptions } from './classes/FunctionSolver';
import { PolynomialSolver } from './classes/PolynomialSolver';
import { SolutionSet } from './classes/SolutionSet';
import { SymbolicSolver } from './classes/SymbolicSolver';
import { prepareSolverInputs } from './utils';

import type { Equation } from '../core/classes/equation/Equation';
import type { Expression } from '../core/classes/expression/Expression';
import type { ExpressionInputType } from '../core/classes/parser/types';
import type { Vector } from '../core/classes/vector/Vector';

function calculateSolutions(factorsVector: Vector, variable: string) {
	const solutionSet = new SolutionSet();
	// We loop through each element (factor) and try to solve it. If we were successful,
	// then we return 0. If we fail then we return  the value
	const firstPass = factorsVector
		.each(f => {
			const fn = f as Expression;

			// Don't even try to solve the function if it does not have x
			if (fn.hasVariable(variable)) {
				// First Symbolically
				let solutions = new SymbolicSolver(fn, variable).solve();

				if (solutions.unsolved && fn.isPolynomialLike() && fn.getPower().gt(4)) {
					const linearPoly = fn.toLinearAndUnitMultiplier();
					// See if you can solve the linear polynomial
					solutions = new SymbolicSolver(linearPoly, variable).solve();
				}

				if (!solutions.unsolved) {
					solutionSet.solutionsType = 'symbolic';
					solutionSet.addSolutions(solutions.solutions, fn, variable);
					return zero();
				}
			}

			return f;
		})
		.trim();
	// For the second pass we solve polynomials using polynomials using numerical methods.
	const secondPass = firstPass
		.each(f => {
			// Numerical methods are only capable of solving univariate polynomials so
			// we need to check as not to waste time.
			const fn = f as Expression;
			const vars = fn.variables();
			if (vars.length === 1 && vars[0] === variable && fn.isPolynomialLike()) {
				const solutions = new PolynomialSolver(new Polynomial(fn), variable).roots();
				if (solutions.length > 0) {
					solutions.forEach(sol => {
						solutionSet.add(sol.evaluate());
					});
				}
				return zero();
			}
			return f;
		})
		.trim();
	// We ultimately fall back to numerical methods
	secondPass
		.each(f => {
			// Numerical methods are only capable of solving univariate functions so
			// we need to check as not to waste time.
			const fn = f as Expression;
			const vars = fn.variables();
			const options: FunctionSolverOptions = { method: 'Brent' };
			if (vars.length === 1 && vars[0] === variable) {
				const solutions = new FunctionSolver(fn, variable, options).roots();
				if (solutions.length > 0) {
					solutions.forEach(e => {
						solutionSet.add(e);
					});
					// Set the flag
					solutionSet.solutionsType =
						solutionSet.solutionsType === 'symbolic' ? 'mixed' : 'numeric';
				}
				return zero();
			}
			return f;
		})
		.trim();

	return solutionSet;
}

/**
 * Solve an equation or expression for the given variable. The solver will first attempt to
 * solve symbolically and fall back to numerical methods. The fall back isn't exhaustive.
 * It falls back to a limited radius which can be changed or configured.
 *
 * @param input - The expression or equation to be solved
 * @param variable - The variable to solve for
 * @param _options - The solver options
 * @returns A solution set if any solutions are found. Returns {all} for all solutions.
 */
export function solve(
	input: ExpressionInputType | Equation,
	variable?: ExpressionInputType,
	_options?: FunctionSolverOptions
) {
	// The solution set that's being returned
	const solutions = new SolutionSet();

	// Try to solve the equation.
	try {
		// Prepare the inputs
		const { expression, x } = prepareSolverInputs(input, variable);
		// Get the variables
		const vars = expression.variables();

		// Handle the zero polynomial. This has as return type the special value all
		if (expression.isZero()) {
			solutions.addSolution(all(), expression, x);
		}
		// For monomials a*x^n the value is zero for all values of x
		else if (expression.isVAR() || (!vars.includes(x) && !expression.isNUM())) {
			// There's not need to check if the variable matches x as this one done in prepareSolverInputs
			solutions.addSolution(zero(), expression, x);
		} else {
			// The strategy is a follows:
			// 1. Factor the expression. Take the divide and conquer approach. Solve the smaller parts. The factors function
			//	  helps by breaking both the numerator and the denominator into their factors.
			// 2. We only need to solve the numerator. The denominator only gives us singularities.
			// 	  We return that as the extraneous roots.
			// 3. Try to solve symbolically with the symbol solver.
			// 4. Try to solve polynomials numerically as a fallback.
			// 5. When all else fails, switch to a numerical solver.

			// Get the factors object
			const factorObj = factors(expression);
			// Get the extraneous roots
			const extraneous = calculateSolutions(factorObj.denominator, x);
			solutions.exclude(extraneous);
			// Get the solutions in the numerator
			const numSolutions = calculateSolutions(factorObj.numerator, x);
			solutions.addSolutions(numSolutions, expression, x);
		}
	} catch (_e) {}

	return solutions;
}
