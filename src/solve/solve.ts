import { factorExpressionParts } from '../algebra/factor/factor';
import { factorCommonPower } from '../algebra/simplify/factorCommon';
import { toCommonDenominator } from '../algebra/simplify/ratsimp';
import { Expression } from '../core/classes/expression/Expression';
import { all, half, one, two, zero } from '../core/classes/expression/shortcuts';
import { PI_NAME } from '../core/classes/parser/constants';
import { Polynomial } from '../core/classes/polynomial/Polynomial';
import { cos, sin } from '../math/trig';

import { FunctionSolver, type FunctionSolverOptions } from './classes/FunctionSolver';
import { PolynomialSolver } from './classes/PolynomialSolver';
import { SolutionSet } from './classes/SolutionSet';
import { SymbolicSolver } from './classes/SymbolicSolver';
import { prepareSolverInputs } from './utils';

import type { Equation } from '../core/classes/equation/Equation';
import type { ExpressionInput } from '../core/types';

function calculateSolutions(factors: Expression[], variable: string) {
	const solutionSet = new SolutionSet();
	// We loop through each element (factor) and try to solve it. If we were successful,
	// then we return 0. If we fail then we return  the value
	const firstPass = factors
		.map(fn => {
			let retval = fn;

			// The exponential function has no zeros, so an e^u factor contributes no
			// solutions and must not be sent through the numerical scan over a fixed interval.
			if (fn.isEXP() && fn.getBase().isE()) {
				retval = zero();
			}
			// Don't even try to solve the function if it does not have x
			else if (fn.hasVariable(variable)) {
				// First Symbolically
				let solutions = new SymbolicSolver(fn, variable).solve();

				if (solutions.unsolved && fn.isPolynomialLike() && fn.getPower().gt(4)) {
					const linearPoly = fn.toLinearAndUnitMultiplier();
					// See if you can solve the linear polynomial
					solutions = new SymbolicSolver(linearPoly, variable).solve();
				}

				if (!solutions.unsolved) {
					const symbolicSolutions = new SolutionSet(solutions.solutions);
					symbolicSolutions.solutionsType = 'symbolic';
					solutionSet.addSolutions(symbolicSolutions, fn, variable);
					retval = zero();
				}
			}

			return retval;
		})
		.filter(fn => !fn.eq(zero()));
	// For the second pass we solve polynomials using polynomials using numerical methods.
	const secondPass = firstPass
		.map(fn => {
			let retval = fn;
			// Numerical methods are only capable of solving univariate polynomials so
			// we need to check as not to waste time.
			const vars = fn.variables();
			if (vars.length === 1 && vars[0] === variable && fn.isPolynomialLike()) {
				const solutions = new PolynomialSolver(new Polynomial(fn), variable).roots();
				if (solutions.length > 0) {
					const numericSolutions = new SolutionSet(
						solutions.map(solution => solution.evaluate())
					);
					numericSolutions.solutionsType = 'numeric';
					solutionSet.append(numericSolutions);
				}
				retval = zero();
			}
			return retval;
		})
		.filter(fn => !fn.eq(zero()));
	// We ultimately fall back to numerical methods
	for (const fn of secondPass) {
		// Numerical methods are only capable of solving univariate functions so
		// we need to check as not to waste time.
		const vars = fn.variables();
		const options: FunctionSolverOptions = { method: 'Brent' };
		if (vars.length === 1 && vars[0] === variable) {
			const solutions = new FunctionSolver(fn, variable, options).roots();
			if (solutions.length > 0) {
				const numericSolutions = new SolutionSet(solutions);
				numericSolutions.solutionsType = 'numeric';
				solutionSet.append(numericSolutions);
			}
		}
	}

	return solutionSet;
}

/**
 * Solves an equation or finds the zeros of an expression in one variable.
 *
 * The solver normalizes the input to `expression = 0`, tries direct symbolic
 * transformations, factors numerator and denominator, and then applies
 * symbolic, polynomial-numeric, and limited-range function-numeric strategies to the
 * factors. Zeros of denominator factors are excluded from the result.
 *
 * @remarks
 * Numerical fallback is heuristic and searches a finite range, so an empty result does
 * not in general prove that no solution exists. Strategy and input errors are absorbed
 * by this convenience entry point and produce the solutions collected before
 * the failure. Decimal input marks returned solutions for decimal formatting.
 *
 * The `options` parameter is currently reserved and is not forwarded to the
 * numerical strategies.
 *
 * @param input - Expression or equation to solve.
 * @param variable - Variable to solve for. When omitted, input preparation
 * infers it where possible.
 * @param _options - Reserved numerical-solver options.
 * @returns A {@link SolutionSet}. The special `all` expression represents an
 * identity that is true for every value of the variable.
 *
 * @example
 * ```ts
 * const roots = solve('x^2-1', 'x');
 * ```
 */
export function solve(
	input: ExpressionInput | Equation,
	variable?: ExpressionInput,
	_options?: FunctionSolverOptions
) {
	// The solution set that's being returned
	const solutions = new SolutionSet();
	let asDecimal = false;

	// Try to solve the equation.
	try {
		// Prepare the inputs
		const { expression, x } = prepareSolverInputs(input, variable);
		asDecimal = expression.hasDecimal();
		// Get the variables
		const vars = expression.variables();

		// Handle the zero polynomial. This has as return type the special value all
		if (expression.isZero()) {
			solutions.addSolution(all(), expression, x);
			solutions.solutionsType = 'symbolic';
		}
		// For monomials a*x^n the value is zero for all values of x
		else if (expression.isVAR() || (!vars.includes(x) && !expression.isNUM())) {
			// There's not need to check if the variable matches x as this one done in prepareSolverInputs
			solutions.addSolution(zero(), expression, x);
			solutions.solutionsType = 'symbolic';
		} else {
			// The strategy is a follows:
			// 1. Try the original expression symbolically before factoring. This avoids expensive
			//    factorization when the existing symbolic solver can already close the equation.
			// 2. Factor the expression. Take the divide and conquer approach. Solve the smaller parts. The factors function
			//	  helps by breaking both the numerator and the denominator into their factors.
			// 3. We only need to solve the numerator. The denominator only gives us singularities.
			// 	  We return that as the extraneous roots.
			// 4. Try to solve symbolically with the symbol solver.
			// 5. Try to solve polynomials numerically as a fallback.
			// 6. When all else fails, switch to a numerical solver.

			const containsRadicalTerm =
				expression.isSum() &&
				expression.elementsArray().some(term => {
					let retval = term.hasVariable(x) && term.getPower().eq(half());
					if (!retval && term.isProduct() && term.hasVariable(x)) {
						const variableFactors = term
							.elementsArray()
							.filter(factor => factor.hasVariable(x));
						retval =
							variableFactors.length === 1 &&
							variableFactors[0].getPower().eq(half().neg());
					}
					return retval;
				});
			const directCoeffs = expression.isPolynomialLike()
				? expression.coeffs(x).toArray()
				: undefined;
			let directPowerBinomialSolutions: Expression[] | undefined;

			if (directCoeffs) {
				const degree = directCoeffs.length - 1;
				const hasSymbolicCoefficients = directCoeffs.some(
					coefficient => coefficient.variables().length > 0
				);
				const isPowerBinomial =
					degree > 4 &&
					hasSymbolicCoefficients &&
					!directCoeffs[0].isZero() &&
					directCoeffs.slice(1, degree).every(coefficient => coefficient.isZero());

				if (isPowerBinomial) {
					const degreeExpression = Expression.create(degree);
					const rootPower = one().div(degreeExpression);
					const radicand = directCoeffs[0].neg().div(directCoeffs[degree]);
					const principalRoot = Expression.toEXP(radicand, rootPower);
					const fullTurn = two().times(Expression.Variable(PI_NAME));
					directPowerBinomialSolutions = [];

					for (let k = 0; k < degree; k++) {
						let rotation = one();
						if (k > 0) {
							const angle = fullTurn
								.copy()
								.times(Expression.create(k))
								.div(degreeExpression);
							rotation = cos(angle).plus(sin(angle).times(Expression.Img()));
						}
						directPowerBinomialSolutions.push(principalRoot.copy().times(rotation));
					}
				}
			}

			const commonFactored =
				directCoeffs?.length === 3 && directCoeffs[0].isZero()
					? factorCommonPower(expression)
					: undefined;
			const commonFactors = commonFactored?.isProduct()
				? commonFactored.elementsArray()
				: undefined;
			const direct = containsRadicalTerm
				? new SymbolicSolver(expression, x).solve()
				: undefined;
			let rationalNumerator: Expression | undefined;
			let rationalDenominator: Expression | undefined;

			if (!expression.isPolynomialLike()) {
				try {
					const rational = toCommonDenominator(expression);
					const numerator = rational.getNumerator().expand();
					const denominator = rational.getDenominator().expand();

					if (
						!denominator.isOne() &&
						numerator.isPolynomialLike() &&
						denominator.isPolynomialLike()
					) {
						rationalNumerator = numerator;
						rationalDenominator = denominator;
					}
				} catch {
					// This is an optimization path. If rational normalization is not supported,
					// continue with the existing factorization and numerical strategies below.
				}
			}
			if (directPowerBinomialSolutions) {
				const symbolicSolutions = new SolutionSet(directPowerBinomialSolutions);
				symbolicSolutions.solutionsType = 'symbolic';
				solutions.addSolutions(symbolicSolutions, expression, x);
			} else if (commonFactors) {
				solutions.addSolution(zero(), expression, x);
				solutions.solutionsType = 'symbolic';
				solutions.addSolutions(calculateSolutions(commonFactors, x), expression, x);
			} else if (direct && !direct.unsolved) {
				const symbolicSolutions = new SolutionSet(direct.solutions);
				symbolicSolutions.solutionsType = 'symbolic';
				solutions.addSolutions(symbolicSolutions, expression, x);
			} else if (rationalNumerator && rationalDenominator) {
				// A rational expression is zero exactly where its polynomial numerator is zero,
				// except at denominator singularities. Avoid polynomializing the nested quotient again.
				const extraneous = calculateSolutions([rationalDenominator], x);
				solutions.exclude(extraneous);
				solutions.addSolutions(
					calculateSolutions([rationalNumerator], x),
					expression,
					x
				);
			} else {
				// Get the factors object
				const factorObj = factorExpressionParts(expression);
				// Get the extraneous roots
				const extraneous = calculateSolutions(factorObj.denominator, x);
				solutions.exclude(extraneous);
				// Get the solutions in the numerator
				const numSolutions = calculateSolutions(factorObj.numerator, x);
				solutions.addSolutions(numSolutions, expression, x);
			}
		}
	} catch (_e) {}

	if (asDecimal) {
		solutions.each(solution => {
			solution.getMultiplier().asDecimal = true;
			return solution;
		});
	}

	return solutions;
}
