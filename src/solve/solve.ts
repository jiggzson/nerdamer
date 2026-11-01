import Decimal from 'decimal.js';

import { factorExpressionParts } from '../algebra/factor/factor';
import { factorCommonPower } from '../algebra/simplify/factorCommon';
import { toCommonDenominator } from '../algebra/simplify/ratsimp';
import { Expression } from '../core/classes/expression/Expression';
import { all, four, half, one, two, zero } from '../core/classes/expression/shortcuts';
import { requireVariableName } from '../core/classes/expression/utils';
import { Rational } from '../core/classes/rational/Rational';
import { Vector } from '../core/classes/vector/Vector';
import { COS, LOG, SIN } from '../core/constants/functionNames';
import { PI_NAME } from '../core/constants/symbolNames';
import { message, NotImplementedError, PolynomialError, UnsupportedOperationError } from '../core/errors';
import { warn } from '../core/warnings';
import { cos, sin } from '../math/trig';

import { FunctionSolver, type FunctionSolverOptions } from './classes/FunctionSolver';
import { PolynomialSolver } from './classes/PolynomialSolver';
import { SolutionSet } from './classes/SolutionSet';
import { SymbolicSolver, type SolveRecursionContext } from './classes/SymbolicSolver';
import { prepareSolverInputs } from './utils';

import type { Equation } from '../core/classes/equation/Equation';
import type { ExpressionInput } from '../core/types';

/**
 * Accumulates roots from distinct exact polynomial factors.
 *
 * Each factor result has already enforced uniqueness within that factor. Exact univariate
 * factorization proves separate factors coprime, so their accepted roots can be copied
 * without repeating general symbolic equality checks across factors.
 */
class FactorRootAccumulator extends SolutionSet {
	appendFactorSolutions(solutions: SolutionSet): void {
		for (const solution of solutions.elements) {
			this.addKnownUnique(solution);
		}

		if (this.solutionsType === undefined) {
			this.solutionsType = solutions.solutionsType;
		} else if (
			solutions.solutionsType !== undefined &&
			this.solutionsType !== solutions.solutionsType
		) {
			this.solutionsType = 'mixed';
		}
	}
}

/**
 * Tries the numerical fallback on a certified enclosure for a narrow bounded-trig form.
 *
 * The recognized expression is `a*x+b+sum(c*sin(k*x+d), c*cos(k*x+d))` with exact
 * numeric coefficients and nonzero `a` and `k`. Rejection returns `undefined`, so the
 * caller retains the ordinary fixed-interval fallback.
 */
function solveWithInferredBounds(expression: Expression, variable: string) {
	let affine = zero();
	let amplitudeBound = Rational.create(0n);
	let derivativeBound = Rational.create(0n);
	let trigTerms = 0;

	try {
		const terms = expression.isSum() ? expression.elementsArray() : [expression];
		for (const term of terms) {
			if (term.isFunction([SIN, COS])) {
				if (!term.getPower().isOne()) {
					return undefined;
				}

				const argument = term.getArguments()[0];
				const argumentVariables = argument.variables();
				if (
					argumentVariables.length !== 1 ||
					argumentVariables[0] !== variable ||
					!argument.isPolynomialLike([variable])
				) {
					return undefined;
				}

				const coefficients = argument.coeffs(variable);
				const constantCoefficient = coefficients.getPower(0) ?? zero();
				const linearCoefficient = coefficients.getPower(1);
				if (
					coefficients.max() !== 1 ||
					!constantCoefficient.isNUM() ||
					!linearCoefficient?.isNUM() ||
					linearCoefficient.isZero()
				) {
					return undefined;
				}

				const amplitude = term.getMultiplier().abs();
				const frequency = linearCoefficient.getMultiplier().abs();
				amplitudeBound = amplitudeBound.plus(amplitude);
				derivativeBound = derivativeBound.plus(amplitude.times(frequency));
				trigTerms++;
			} else {
				affine = affine.plus(term);
			}
		}

		if (trigTerms === 0 || !affine.isPolynomialLike([variable])) {
			return undefined;
		}

		const coefficients = affine.coeffs(variable);
		const constantCoefficient = coefficients.getPower(0) ?? zero();
		const linearCoefficient = coefficients.getPower(1);
		if (
			coefficients.max() !== 1 ||
			!constantCoefficient.isNUM() ||
			!linearCoefficient?.isNUM() ||
			linearCoefficient.isZero()
		) {
			return undefined;
		}

		const slope = linearCoefficient.getMultiplier();
		const offset = constantCoefficient.getMultiplier();
		const firstEndpoint = offset.neg().minus(amplitudeBound).div(slope);
		const secondEndpoint = offset.neg().plus(amplitudeBound).div(slope);
		const exactLower = firstEndpoint.lte(secondEndpoint) ? firstEndpoint : secondEndpoint;
		const exactUpper = firstEndpoint.gte(secondEndpoint) ? firstEndpoint : secondEndpoint;

		const outwardDecimal = (value: Rational, rounding: Decimal.Rounding) => {
			const DirectedDecimal = Decimal.clone({
				precision: Decimal.precision,
				rounding,
			});
			const directed = new DirectedDecimal(String(value.numerator))
				.div(String(value.denominator));
			if (!directed.isFinite()) {
				return undefined;
			}

			const decimal = new Decimal(directed.toString());
			const rounded = Rational.create(decimal.toString());
			const encloses = rounding === Decimal.ROUND_FLOOR
				? rounded.lte(value)
				: rounded.gte(value);
			return encloses ? decimal : undefined;
		};
		const lowerBound = outwardDecimal(exactLower, Decimal.ROUND_FLOOR);
		const upperBound = outwardDecimal(exactUpper, Decimal.ROUND_CEIL);
		if (!lowerBound || !upperBound) {
			return undefined;
		}

		const solver = new FunctionSolver(expression, variable, {
			lowerBound,
			upperBound,
			method: 'Brent',
		});
		const step = new Decimal(solver.stepSize);
		const center = lowerBound.plus(upperBound).div(2);
		// Preserve the default scan lattice so inferred bounds do not lose tangential roots.
		const alignedCenter = center.toNearest(step, Decimal.ROUND_HALF_UP);
		const endpointAdjustment = alignedCenter.minus(center).times(2);
		if (endpointAdjustment.isNegative()) {
			solver.lowerBound = lowerBound.plus(endpointAdjustment);
		} else {
			solver.upperBound = upperBound.plus(endpointAdjustment);
		}

		if (slope.abs().gt(derivativeBound)) {
			const result = solver.Brent(solver.lowerBound, solver.upperBound);
			if (
				result.converged &&
				result.root.isFinite() &&
				solver.evaluate(result.root).abs().lessThan(solver.tolerance)
			) {
				return [Expression.create(result.root)];
			}
			return undefined;
		}

		const inferredCells = solver.upperBound.minus(solver.lowerBound)
			.div(solver.stepSize)
			.ceil();
		const defaultSolver = new FunctionSolver(expression, variable, { method: 'Brent' });
		const defaultCells = defaultSolver.upperBound.minus(defaultSolver.lowerBound)
			.div(defaultSolver.stepSize)
			.ceil();
		if (inferredCells.lte(defaultCells)) {
			return solver.roots();
		}
	} catch {
		// Unsupported structure or numerical endpoint conversion retains the default fallback.
	}

	return undefined;
}

function calculateSolutions(
	factors: Expression[],
	variable: string,
	disjointPolynomialFactors = false,
	recursion?: SolveRecursionContext
) {
	const solutionSet = disjointPolynomialFactors
		? new FactorRootAccumulator()
		: new SolutionSet();
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
				let solutions = new SymbolicSolver(fn, variable, recursion).solve();

				if (solutions.unsolved && fn.isPolynomialLike() && fn.getPower().gt(four())) {
					const linearPoly = fn.toLinearAndUnitMultiplier();
					// See if you can solve the linear polynomial
					solutions = new SymbolicSolver(linearPoly, variable, recursion).solve();
				}

				if (!solutions.unsolved) {
					if (disjointPolynomialFactors) {
						// Exact irreducible factors are square-free. Verify each symbolic root
						// independently to avoid costly equality expansion between distinct radicals.
						const seen = new Set<string>();
						for (const candidate of solutions.solutions) {
							const key = candidate.text();
							if (!seen.has(key)) {
								const factorSolutions = new SolutionSet();
								factorSolutions.addSolution(candidate, fn, variable);
								if (factorSolutions.count() > 0) {
									factorSolutions.solutionsType = 'symbolic';
									(solutionSet as FactorRootAccumulator).appendFactorSolutions(factorSolutions);
								}
								seen.add(key);
							}
						}
					} else {
						const symbolicSolutions = new SolutionSet(solutions.solutions);
						symbolicSolutions.solutionsType = 'symbolic';
						solutionSet.addSolutions(symbolicSolutions, fn, variable);
					}
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
				const solutions = new PolynomialSolver(fn, variable).validatedRoots();
				if (solutions.length > 0) {
					if (disjointPolynomialFactors) {
						const factorSolutions = new SolutionSet();
						factorSolutions.addValidatedNumericalSolutions(solutions);
						factorSolutions.solutionsType = 'numeric';
						(solutionSet as FactorRootAccumulator).appendFactorSolutions(factorSolutions);
					} else {
						solutionSet.addValidatedNumericalSolutions(solutions);
						solutionSet.solutionsType =
							solutionSet.solutionsType === undefined ||
							solutionSet.solutionsType === 'numeric'
								? 'numeric'
								: 'mixed';
					}
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
			const solutions = solveWithInferredBounds(fn, variable) ??
				new FunctionSolver(fn, variable, options).roots();
			if (solutions.length > 0) {
				for (const solution of solutions) {
					solutionSet.add(solution);
				}
				solutionSet.solutionsType =
					solutionSet.solutionsType === undefined ||
					solutionSet.solutionsType === 'numeric'
						? 'numeric'
						: 'mixed';
			}
		}
	}

	return solutionSet;
}

/**
 * Returns polynomial roots as a Vector.
 *
 * Unlike solve(), which returns a SolutionSet with solver metadata, this function preserves
 * the roots API's Vector return type. Numeric constants retain the historical square-root
 * interpretation. Univariate polynomials delegate to PolynomialSolver and therefore return
 * numerical roots.
 */
export function roots(input: ExpressionInput, variable?: ExpressionInput): Vector {
	const expression = Expression.create(input);
	const variables = expression.variables();

	if (variables.length === 0 && expression.isConstant()) {
		const evaluated = expression.evaluate();
		if (evaluated.isNUM()) {
			const magnitude = evaluated.abs();
			const root = magnitude.pow(half());
			const positive = evaluated.sign() < 0
				? root.times(Expression.Img())
				: root;
			return new Vector([positive, positive.neg()]);
		}
	}

	const variableName =
		variable === undefined
			? variables[0]
			: requireVariableName(Expression.create(variable));

	if (variableName === undefined) {
		return new Vector([expression]);
	}

	return new Vector(new PolynomialSolver(expression, variableName).validatedRoots());
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
 * not in general prove that no solution exists. A narrow affine-plus-bounded-trig form
 * may supply a certified finite enclosure, but its non-monotone scan remains heuristic.
 * Strategy and input errors are absorbed by this convenience entry point and produce the
 * solutions collected before the failure. Decimal input marks returned solutions for
 * decimal formatting.
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
	_options?: FunctionSolverOptions,
	recursion?: SolveRecursionContext
) {
	// The solution set that's being returned
	const solutions = new SolutionSet();
	const solveRecursion = recursion ?? { depth: 0 };
	let asDecimal = false;
	let preparedExpression: Expression | undefined;

	// Try to solve the equation.
	try {
		// Prepare the inputs
		const { expression, x } = prepareSolverInputs(input, variable);
		preparedExpression = expression;
		asDecimal = expression.hasDecimal();
		// Get the variables
		const vars = expression.variables();

		// Handle the zero polynomial. This has as return type the special value all
		if (expression.isZero()) {
			solutions.addSolution(all(), expression, x);
			solutions.solutionsType = 'symbolic';
		}
		// A nonzero expression independent of x has no roots in x.
		else if (!vars.includes(x)) {
			solutions.solutionsType = 'symbolic';
		}
		// A lone variable is zero only at zero.
		else if (expression.isVAR()) {
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
			const isNumericUnivariatePolynomial =
				directCoeffs !== undefined &&
				vars.length === 1 &&
				vars[0] === x &&
				directCoeffs.every(coefficient => coefficient.isNUM());
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
			// Try the direct inversion path for variable-dependent logarithms, too.
			// A constant change-of-base factor may hide the log inside a product.
			let containsLogarithm = false;
			expression.forEveryElement(element => {
				if (element.isFunction(LOG) && element.hasVariable(x)) {
					containsLogarithm = true;
				}
				return element;
			});
			const direct = containsRadicalTerm || containsLogarithm
				? new SymbolicSolver(expression, x, solveRecursion).solve()
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
				const commonSolutions = calculateSolutions(commonFactors, x, false, solveRecursion);
				if (
					isNumericUnivariatePolynomial &&
					commonSolutions.solutionsType === 'numeric'
				) {
					solutions.appendValidatedNumerical(commonSolutions);
				} else if (isNumericUnivariatePolynomial) {
					solutions.append(commonSolutions);
				} else {
					solutions.addSolutions(commonSolutions, expression, x);
				}
			} else if (direct && !direct.unsolved) {
				const symbolicSolutions = new SolutionSet(direct.solutions);
				symbolicSolutions.solutionsType = 'symbolic';
				solutions.addSolutions(symbolicSolutions, expression, x);
			} else if (rationalNumerator && rationalDenominator) {
				// A rational expression is zero exactly where its polynomial numerator is zero,
				// except at denominator singularities. Avoid polynomializing the nested quotient again.
				const extraneous = calculateSolutions([rationalDenominator], x, false, solveRecursion);
				solutions.exclude(extraneous);
				solutions.addSolutions(
					calculateSolutions([rationalNumerator], x, false, solveRecursion),
					expression,
					x
				);
			} else {
				// Get the factors object
				const factorObj = factorExpressionParts(expression);
				// Exact univariate factorization returns distinct irreducible factors with
				// repeated factors represented by powers. Their solution sets can therefore
				// be combined without proving cross-factor equality again.
				const disjointPolynomialFactors = isNumericUnivariatePolynomial;
				// Get the extraneous roots
				const extraneous = calculateSolutions(
					factorObj.denominator,
					x,
					disjointPolynomialFactors,
					solveRecursion
				);
				solutions.exclude(extraneous);
				// Get the solutions in the numerator
				const numSolutions = calculateSolutions(
					factorObj.numerator,
					x,
					disjointPolynomialFactors,
					solveRecursion
				);
				if (
					isNumericUnivariatePolynomial &&
					numSolutions.solutionsType === 'numeric'
				) {
					solutions.appendValidatedNumerical(numSolutions);
				} else if (isNumericUnivariatePolynomial) {
					solutions.append(numSolutions);
				} else {
					solutions.addSolutions(numSolutions, expression, x);
				}
			}
		}
	} catch (error) {
		const unsupported = error instanceof UnsupportedOperationError ||
			error instanceof PolynomialError || error instanceof NotImplementedError;
		if (!preparedExpression || !unsupported) {
			throw error;
		}
		solutions.unsolved = preparedExpression;
		solutions.partial = solutions.count() > 0;
	}

	// A numeric scan cannot prove completeness after the symbolic recursion budget is exhausted.
	if (solveRecursion.exhausted && preparedExpression &&
		!preparedExpression.isPolynomialLike() && solutions.solutionsType !== 'symbolic') {
		solutions.unsolved ??= preparedExpression;
		solutions.partial = solutions.count() > 0;
	}

	if (asDecimal) {
		solutions.each(solution => {
			solution.getMultiplier().asDecimal = true;
			return solution;
		});
	}

	if (!recursion && solutions.unsolved) {
		warn('solve.partialResult', message('solvePartialResultWarning'));
	}
	return solutions;
}
