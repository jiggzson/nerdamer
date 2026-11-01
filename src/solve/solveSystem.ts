import { Groebner } from '../algebra/algorithms/groebnerBase';
import { toCommonDenominator } from '../algebra/simplify/ratsimp';
import { Dictionary } from '../core/classes/dictionary/Dictionary';
import { collectVariablesSet } from '../core/classes/expression/collect';
import { Expression } from '../core/classes/expression/Expression';
import { zero } from '../core/classes/expression/shortcuts';
import {
	expressionToIntegerSparsePolynomial,
	sparsePolynomialToExpression,
} from '../core/classes/polynomial/SparsePolynomialAdapter';
import { Rational } from '../core/classes/rational/Rational';
import { Vector } from '../core/classes/vector/Vector';
import { COS, SIN } from '../core/constants/functionNames';
import { INTEGER_PARAM } from '../core/constants/symbolNames';
import { message, UnsupportedOperationError } from '../core/errors';
import {
	abs as bigintAbs,
	GCD as bigintGCD,
	invMod,
	LCM as bigintLCM,
	mod as bigintMod,
} from '../core/functions/bigint/bigint';

import { MultivariateSolver } from './classes/MultivariateSolver';
import { SolutionSet } from './classes/SolutionSet';
import { NonlinearSystemError, solveLinearSystem } from './linsolve';
import { solve as solveUnivariate } from './solve';
import { normalizeSolverExpression } from './utils';

import type { Equation } from '../core/classes/equation/Equation';
import type { ExpressionInput } from '../core/types';

interface PeriodicFamily {
	offset: Rational;
	period: Rational;
}

function normalizeEquations(
	equations: Vector | Array<ExpressionInput | Equation | string>
): Expression[] {
	if (Vector.isVector(equations)) {
		const result: Expression[] = [];
		for (let i = 0; i < equations.count(); i++) {
			result.push(normalizeSolverExpression(equations.__get__([i])));
		}
		return result;
	}
	return equations.map(eq => normalizeSolverExpression(eq));
}

/**
 * Recognizes the exact periodic equations whose indexed output is complete.
 *
 * This mirrors the bounded first-power sine/cosine inversion supported by
 * SymbolicSolver without making completeness claims for powers, products, or
 * equations with additional variable-dependent terms.
 */
function isSupportedPeriodicEquation(expression: Expression, variable: string): boolean {
	let periodicTerm: Expression | undefined;

	if (expression.isFunction([SIN, COS])) {
		periodicTerm = expression;
	} else if (expression.isSum()) {
		const variableTerms = expression.elementsArray().filter(term => term.hasVariable(variable));
		if (variableTerms.length === 1 && variableTerms[0].isFunction([SIN, COS])) {
			periodicTerm = variableTerms[0];
		}
	}

	if (!periodicTerm || !periodicTerm.getPower().isOne()) {
		return false;
	}

	const argument = periodicTerm.getArguments()[0];
	const variables = argument.variables();
	if (variables.length !== 1 || variables[0] !== variable) {
		return false;
	}

	let retval = false;
	try {
		if (argument.isPolynomialLike([variable])) {
			const coefficients = argument.coeffs(variable);
			const constantCoefficient = coefficients.getPower(0) ?? zero();
			const linearCoefficient = coefficients.getPower(1);
			retval = coefficients.max() === 1 &&
				linearCoefficient !== undefined &&
				!linearCoefficient.isZero() &&
				!constantCoefficient.hasVariable(variable);
		}
	} catch {
		// Unsupported coefficient extraction cannot certify an exact affine argument.
	}

	return retval;
}

/** Extracts a normalized `a + T*_n` family in exact rational multiples of pi. */
function periodicFamily(solution: Expression): PeriodicFamily | undefined {
	const coefficients = solution.expand().coeffs(INTEGER_PARAM);
	const offsetExpression = coefficients.getPower(0) ?? zero();
	const periodExpression = coefficients.getPower(1);

	if (coefficients.max() !== 1 || !periodExpression) {
		return undefined;
	}

	const pi = Expression.Pi();
	const scaledOffset = offsetExpression.isZero()
		? offsetExpression
		: offsetExpression.div(pi).expand();
	const scaledPeriod = periodExpression.div(pi).expand();
	if (!scaledOffset.isNUM() || !scaledPeriod.isNUM() || scaledPeriod.isZero()) {
		return undefined;
	}

	let period = scaledPeriod.getMultiplier().copy();
	if (period.sign() < 0) {
		period = period.neg();
	}
	const offset = scaledOffset.getMultiplier().mod(period);

	return { offset, period };
}

/** Intersects two exact rational-pi arithmetic families by integer congruence. */
function intersectPeriodicFamilies(
	left: PeriodicFamily,
	right: PeriodicFamily
): PeriodicFamily | undefined {
	const denominator = bigintLCM(
		left.offset.denominator,
		left.period.denominator,
		right.offset.denominator,
		right.period.denominator
	);
	const leftOffset = left.offset.numerator * (denominator / left.offset.denominator);
	const leftPeriod = left.period.numerator * (denominator / left.period.denominator);
	const rightOffset = right.offset.numerator * (denominator / right.offset.denominator);
	const rightPeriod = right.period.numerator * (denominator / right.period.denominator);
	const difference = rightOffset - leftOffset;
	const divisor = bigintGCD(leftPeriod, rightPeriod);

	if (difference % divisor !== 0n) {
		return undefined;
	}

	const modulus = bigintAbs(rightPeriod / divisor);
	const index = modulus === 1n
		? 0n
		: bigintMod(
			(difference / divisor) * invMod(leftPeriod / divisor, modulus),
			modulus
		);
	const commonPeriod = bigintAbs((leftPeriod / divisor) * rightPeriod);
	const commonOffset = bigintMod(leftOffset + leftPeriod * index, commonPeriod);

	return {
		offset: Rational.create(`${commonOffset}/${denominator}`),
		period: Rational.create(`${commonPeriod}/${denominator}`),
	};
}

/**
 * Returns a complete exact intersection, or `undefined` when this bounded
 * representation cannot certify the system.
 */
function exactPeriodicSolutions(
	expressions: Expression[],
	solutionSets: SolutionSet[],
	variable: string
): SolutionSet | undefined {
	let intersections: PeriodicFamily[] | undefined;

	for (let i = 0; i < expressions.length; i++) {
		const solutions = solutionSets[i];
		if (
			!isSupportedPeriodicEquation(expressions[i], variable) ||
			solutions.solutionForm !== 'parametric' ||
			solutions.solutionsType !== 'symbolic' ||
			solutions.partial ||
			solutions.unsolved
		) {
			return undefined;
		}

		const families: PeriodicFamily[] = [];
		for (const solution of solutions.elements) {
			const family = periodicFamily(solution);
			if (!family) {
				return undefined;
			}
			families.push(family);
		}

		if (intersections === undefined) {
			intersections = families;
			continue;
		}

		const next = new Map<string, PeriodicFamily>();
		for (const left of intersections) {
			for (const right of families) {
				const intersection = intersectPeriodicFamilies(left, right);
				if (intersection) {
					const key = `${intersection.offset.text()}|${intersection.period.text()}`;
					next.set(key, intersection);
				}
			}
		}
		intersections = [...next.values()];
	}

	if (intersections === undefined) {
		return undefined;
	}

	const pi = Expression.Pi();
	const solutions = new SolutionSet(intersections.map(family =>
		Expression.create(family.offset)
			.times(pi)
			.plus(Expression.create(family.period).times(pi).times(Expression.N()))
	));
	solutions.solutionsType = 'symbolic';
	return solutions;
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
 * substitution for polynomial systems. For one-variable systems with multiple
 * equations, it exactly intersects supported rational-pi sine/cosine families
 * and otherwise verifies finite univariate candidates before falling back to
 * multivariate Newton-Raphson over a fixed search interval. Rational
 * polynomial systems may have denominators
 * cleared for symbolic work; candidates are checked against the original domain.
 *
 * @remarks
 * The nonlinear numerical fallback is heuristic and does not guarantee all
 * roots. A returned outer {@link Vector} contains one {@link Dictionary} per
 * solution. An empty system has one empty solution, while no discovered or
 * inconsistent solution is represented by an empty Vector.
 *
 * Infinite nonlinear solution sets outside the supported periodic-family form
 * are not represented. Underdetermined systems that reach numerical fallback
 * are rejected.
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
		if (!(error instanceof NonlinearSystemError)) {
			throw error;
		}
	}

	// 2. Gröbner basis + symbolic back-substitution. Polynomial constraints may
	// also provide candidates for mixed systems; verify those against every original equation.
	const polynomialExpressions = symbolicExpressions.filter(e => e.isPolynomialLike());
	const allPolynomial = polynomialExpressions.length === symbolicExpressions.length;
	// We need at least one polynomial equation per variable before trying to find
	// solutions from the polynomials alone. Any other equations still have to be checked.
	const enoughPolynomialEquations = polynomialExpressions.length >= vars.length;

	if (allPolynomial || enoughPolynomialEquations) {
		try {
			const polys = polynomialExpressions.map(
				expression =>
					expressionToIntegerSparsePolynomial(expression, vars).polynomial
			);

			const basis = Groebner(polys, 'LEX', true);

			if (basis.length === 1 && basis[0].isConstant() && basis[0].constantTerm() !== 0n) {
				return new Vector([]);
			}

			const basisExprs = basis.map(p => sparsePolynomialToExpression(p, vars));
			let solutions = symbolicBackSubstitution(basisExprs, vars);

			if (hasRationalRewrite || !allPolynomial) {
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

	// 3. Reuse finite roots of individual equations when a one-variable system
	// has more constraints than the numerical solver can solve directly.
	const univariateSystem = vars.length === 1 && expressions.length > 1;
	const verifiedRoots = new SolutionSet();
	if (univariateSystem) {
		const variable = vars[0];
		const solutionSets = expressions.map(expression => solveUnivariate(expression, variable));
		const periodicSolutions = domainRestrictions.length === 0
			? exactPeriodicSolutions(expressions, solutionSets, variable)
			: undefined;
		if (periodicSolutions) {
			return new Vector(solutionsToDictionaries(
				periodicSolutions.elements.map(root => new Map([[variable, root]])), vars
			));
		}

		for (const solutions of solutionSets) {
			if (solutions.solutionForm === 'all') {
				continue;
			}
			for (const root of solutions.elements) {
				// Preserve a concrete candidate when univariate solve returns an
				// indexed family. This does not enumerate or intersect families.
				const value = root.hasVariable(INTEGER_PARAM)
					? root.subst(INTEGER_PARAM, 0)
					: root;
				const candidate = new Map([[variable, value]]);
				if (isSystemSolution(expressions, domainRestrictions, candidate)) {
					verifiedRoots.add(value);
				}
			}
		}
	}

	// 4. Numeric fallback: multivariate Newton-Raphson
	if (expressions.length < vars.length) {
		throw new UnsupportedOperationError(message('solveSystemInfiniteSolutions'));
	}

	const solver = new MultivariateSolver(expressions, vars);
	const numericSolutions = solver.roots();

	if (univariateSystem) {
		const variable = vars[0];
		for (const solution of numericSolutions) {
			const root = solution.get(variable);
			if (root) {
				verifiedRoots.add(root);
			}
		}
		return new Vector(solutionsToDictionaries(
			verifiedRoots.elements.map(root => new Map([[variable, root]])), vars
		));
	}

	if (numericSolutions.length === 0) {
		return new Vector([]);
	}

	return new Vector(solutionsToDictionaries(numericSolutions, vars));
}
