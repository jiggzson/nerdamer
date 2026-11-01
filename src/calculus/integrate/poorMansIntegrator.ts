import { partfrac } from '../../algebra/partfrac';
import { Expression } from '../../core/classes/expression/Expression';
import { one, zero } from '../../core/classes/expression/shortcuts';
import { Matrix } from '../../core/classes/matrix/Matrix';
import { Polynomial } from '../../core/classes/polynomial/Polynomial';
/**
 * Bounded coefficient-matching integration inspired by Manuel Bronstein's
 * Poor Man's Integrator (PMInt), rather than a direct port of its Maple code.
 *
 * References:
 * - Manuel Bronstein, "Poor Man's Integrator", PMInt 1.1 (10 May 2005):
 *   https://www-sop.inria.fr/cafe/Manuel.Bronstein/pmint/pmint.txt
 * - Bronstein's PMInt overview:
 *   https://www-sop.inria.fr/cafe/Manuel.Bronstein/pmint/
 * - SymPy's related heuristic integrator (independent reference):
 *   https://github.com/sympy/sympy/blob/master/sympy/integrals/heurisch.py
 *
 * This implementation uses Nerdamer's derivative-closed exponential/trigonometric
 * generators and bounded polynomial/rational coefficient systems. Its rational
 * matcher uses restricted candidate bases, partial fractions, and a specialized
 * even-quartic decomposition. It does not implement Bronstein's general
 * polynomial total derivation, splitFactor, or deflation algorithm.
 * Unsupported forms return undefined; existing integration strategies remain
 * responsible for cases outside these matchers.
 */
import { divide } from '../../core/classes/polynomial/utils';
import { solveAugmentedLinearSystem } from '../../solve/linsolve';
import { diff } from '../derivative/diff';

import type { ExpressionInput } from '../../core/types';

/** Resolve only uniquely determined coefficient systems. */
function solveCoefficients(rows: Expression[][], count: number): Expression[] | undefined {
	const result = solveAugmentedLinearSystem(rows, count);
	return result.type === 'unique' ? result.values : undefined;
}

interface DerivativeFamily {
	generators: Expression[];
	// Column j contains the coefficients in the derivative of generator j.
	derivatives: Expression[][];
}


/**
 * Collect exponential and sine/cosine generators with bounded rational rates.
 * Their numerators and denominators must be polynomials of degree at most two.
 */
function discoverFamilies(expr: Expression, variable: string): DerivativeFamily[] {
	const families: DerivativeFamily[] = [];
	const seen = new Set<string>();
	const terms = expr.isSum() && expr.getPower().isOne() ? expr.elementsArray() : [expr];

	for (const term of terms) {
		const factors = term.isProduct() && term.getPower().isOne() ? term.elementsArray() : [term];
		for (const factor of factors) {
			const isTrig = factor.isFunction() &&
				(factor.name === 'sin' || factor.name === 'cos');
			const isExp = factor.isEXP() && !factor.getBase().hasVariable(variable);
			if (!isTrig && !isExp) {
				continue;
			}

			const argument = isTrig ? factor.getArguments()[0] : factor.getPower();
			const rate = diff(argument, variable).times(
				isTrig || factor.getBase().isE() ? one() :
					Expression.toFunction('log', [factor.getBase()])
			);
			const key = isTrig ? `trig:${argument.text()}` : `exp:${factor.text()}`;
			const numerator = rate.getNumerator();
			const denominator = rate.getDenominator();
			if (seen.has(key) || rate.isZero() ||
				!numerator.isPolynomialLike([variable]) ||
				!denominator.isPolynomialLike([variable])) {
				continue;
			}
			if (new Polynomial(numerator, [variable]).deg() > 2 ||
				new Polynomial(denominator, [variable]).deg() > 2) {
				continue;
			}
			seen.add(key);

			if (isTrig) {
				families.push({
					generators: [
						Expression.create(`sin(${argument.text()})`),
						Expression.create(`cos(${argument.text()})`),
					],
					derivatives: [[zero(), rate.neg()], [rate, zero()]],
				});
			} else {
				families.push({
					generators: [factor],
					derivatives: [[rate]],
				});
			}
		}
	}
	return families;
}

/**
 * Match the assembled derivative system with polynomial, then rational,
 * generator coefficients. Unsupported candidate spaces remain unresolved.
 */
function matchGeneratorSystem(
	expr: Expression,
	variable: string,
	maxDegree: number,
	generators: Expression[],
	rows: Expression[][],
	inputPolynomials: Expression[]
): Expression | undefined {
	let retval: Expression | undefined;
		const coefficientArrays = inputPolynomials.map(poly =>
			poly.isZero() ? [] :
				new Polynomial(poly.getNumerator(), [variable]).toArray(false, variable)
		);
		const degree = Math.max(...coefficientArrays.map(a => a.length)) - 1;
		const denominators = new Map<string, Expression>();
		for (const poly of inputPolynomials) {
			const denominator = poly.getDenominator();
			if (!denominator.isOne() && denominator.hasVariable(variable)) {
				denominators.set(denominator.text(), denominator);
			}
		}
		for (const row of rows) {
			for (const rate of row) {
				const denominator = rate.getDenominator();
				if (!denominator.isOne() && denominator.hasVariable(variable)) {
					denominators.set(denominator.text(), denominator);
				}
			}
		}
		const commonDenominator = [...denominators.values()].reduce(
			(product, denominator) => product.times(denominator), one()
		);
		const denominatorDegree = new Polynomial(commonDenominator, [variable]).deg();
		if (degree >= 0 && degree + Math.max(1, denominatorDegree) <= maxDegree && denominatorDegree <= 3 &&
			rows.some(row => row.some(rate => rate.hasVariable(variable)))) {
			// Rates depending on the integration variable require one
			// coefficient system rather than the constant-matrix recurrence.
			const x = Expression.create(variable);
			const candidateDegree = Math.max(1, degree + denominatorDegree);
			const rationalFactors = [...denominators.values()]
				.map(denominator => denominator.getBase())
				.filter((factor, index, factors) =>
					factors.findIndex(other => other.eq(factor)) === index
				);
			for (const rational of [false, true]) {
				if (rational && (retval !== undefined || rationalFactors.length === 0)) {
					break;
				}
				const bases: Expression[] = [];
				for (let k = 0; k <= candidateDegree; k++) {
					bases.push(k === 0 ? one() : x.pow(k));
				}
				let clearingDenominator = commonDenominator;
				if (rational) {
					for (const factor of rationalFactors) {
						const d = new Polynomial(factor, [variable]).deg();
						if (d < 1 || d > 2) {continue;}
						for (let k = 0; k < d; k++) {
							bases.push(x.pow(k).div(factor));
						}
						clearingDenominator = clearingDenominator.times(factor.pow(2));
					}
				}
				if (bases.length * generators.length > 15 ||
					new Polynomial(clearingDenominator, [variable]).deg() > 8) {continue;}
				const candidates: Expression[] = [];
				const columns: Expression[][] = [];
				const basisDerivatives = bases.map(basis => diff(basis, variable));
				for (let j = 0; j < generators.length; j++) {
					for (let k = 0; k < bases.length; k++) {
						const basis = bases[k];
						candidates.push(basis.times(generators[j]));
						columns.push(generators.map((_, i) =>
							rows[i][j].times(basis).plus(i === j ? basisDerivatives[k] : zero())
						));
					}
				}
				const input = inputPolynomials.map(poly =>
					new Polynomial(poly.times(clearingDenominator).expand(), [variable])
						.toArray(false, variable)
				);
				const columnCoefficients = columns.map(column =>
					column.map(value =>
						new Polynomial(value.times(clearingDenominator).expand(), [variable])
							.toArray(false, variable)
					)
				);
				const rowCount = Math.max(
					...columnCoefficients.flatMap(column => column.map(values => values.length)),
					...input.map(values => values.length)
				);
				const unknowns = candidates.length;
				if (rowCount * generators.length >= unknowns &&
					rowCount * generators.length <= 48 && unknowns <= 15) {
					const equations: Expression[][] = [];
					for (let i = 0; i < generators.length; i++) {
						for (let k = 0; k < rowCount; k++) {
							equations.push([
								...columnCoefficients.map(column => column[i][k] ?? zero()),
								input[i][k] ?? zero(),
							]);
						}
					}
					const coefficients = solveCoefficients(equations, unknowns);
					if (coefficients) {
						const candidate = candidates.reduce(
							(sum, value, i) => sum.plus(value.times(coefficients[i])),
							zero()
						);
						if (diff(candidate, variable).minus(expr).expand().isZero()) {
							retval = candidate;
						}
					}
				}
			}
		} else if (degree >= 0 && degree <= maxDegree && denominatorDegree === 0) {
			const inverse = new Matrix(...rows).inverse().elements;
			const solutions = generators.map(() => new Array<Expression>(degree + 2).fill(zero()));

			for (let k = degree; k >= 0; k--) {
				const rhs = generators.map((_, i) =>
					(coefficientArrays[i][k] ?? zero())
						.minus(solutions[i][k + 1].times(Expression.Number(k + 1)))
				);
				for (let i = 0; i < generators.length; i++) {
					solutions[i][k] = rhs.reduce(
						(sum, value, j) => sum.plus(inverse[i][j].times(value)),
						zero()
					);
				}
			}

			const x = Expression.create(variable);
			let candidate = zero();
			for (let i = 0; i < generators.length; i++) {
				let polynomial = zero();
				for (let k = 0; k <= degree; k++) {
					polynomial = polynomial.plus(
						solutions[i][k].times(k === 0 ? one() : x.pow(k))
					);
				}
				candidate = candidate.plus(polynomial.times(generators[i]));
			}
			if (diff(candidate, variable).minus(expr).expand().isZero()) {
				retval = candidate;
			}
		}
	return retval;
}

interface GeneratorSystem {
	generators: Expression[];
	rows: Expression[][];
	inputPolynomials: Expression[];
}

/** Match integrand terms to independent derivative families and assemble their coefficient matrix. */
function collectGeneratorSystem(
	expr: Expression,
	variable: string,
	families: DerivativeFamily[]
): GeneratorSystem | undefined {
	let retval: GeneratorSystem | undefined;
	const terms = expr.isSum() && expr.getPower().isOne() ? expr.elementsArray() : [expr];
	const active = new Set<number>();
	const contributions: { family: number; generator: number; coefficient: Expression }[] = [];

	for (const term of terms) {
		let found = false;
		for (let i = 0; i < families.length && !found; i++) {
			for (let j = 0; j < families[i].generators.length && !found; j++) {
				const coefficient = term.div(families[i].generators[j]);
				if (coefficient.getNumerator().isPolynomialLike([variable]) &&
					coefficient.getDenominator().isPolynomialLike([variable]) &&
					new Polynomial(coefficient.getDenominator(), [variable]).deg() <= 2) {
					new Polynomial(coefficient.getNumerator(), [variable]);
					contributions.push({ family: i, generator: j, coefficient });
					active.add(i);
					found = true;
				}
			}
		}
	}

	if (contributions.length === terms.length) {
		const generators: Expression[] = [];
		const rows: Expression[][] = [];
		const inputPolynomials: Expression[] = [];

		for (let familyIndex = 0; familyIndex < families.length; familyIndex++) {
			if (!active.has(familyIndex)) {
				continue;
			}
			const family = families[familyIndex];
			const start = generators.length;
			for (const generator of family.generators) {
				generators.push(generator);
				inputPolynomials.push(zero());
			}
			for (let i = 0; i < family.generators.length; i++) {
				const row = new Array(generators.length).fill(zero()) as Expression[];
				for (let j = 0; j < family.generators.length; j++) {
					row[start + j] = family.derivatives[i][j];
				}
				rows.push(row);
			}
		}

		// Each family is independent, so fill the off-diagonal blocks with zero.
		for (const row of rows) {
			while (row.length < generators.length) {
				row.push(zero());
			}
		}

		let offset = 0;
		for (let i = 0; i < families.length; i++) {
			if (!active.has(i)) {
				continue;
			}
			for (const entry of contributions) {
				if (entry.family === i) {
					const index = offset + entry.generator;
					inputPolynomials[index] = inputPolynomials[index].plus(entry.coefficient);
				}
			}
			offset += families[i].generators.length;
		}

		retval = { generators, rows, inputPolynomials };
	}
	return retval;
}

/**
 * Experimental polynomial ansatz over derivative-closed generators.
 *
 * For generators g with D(g) = M*g, the coefficient polynomials a satisfy
 * a'(x) + M*a(x) = p(x). Solve from the highest polynomial degree down.
 *
 * This is a subset of PMInt for exponential and trigonometric generators.
 * Rational and logarithmic terms are handled separately by pmintRational.
 * Unsupported inputs return undefined.
 */
const MAX_PMINT_POLYNOMIAL_DEGREE = 32;

export function pmintPolynomial(
	input: ExpressionInput,
	variable: string,
	maxDegree = MAX_PMINT_POLYNOMIAL_DEGREE
): Expression | undefined {
	let retval: Expression | undefined;
	const expr = Expression.create(input);

	if (Number.isInteger(maxDegree) && maxDegree >= 0 &&
		maxDegree <= MAX_PMINT_POLYNOMIAL_DEGREE && expr.hasVariable(variable)) {
		try {
			const families = discoverFamilies(expr, variable);

			const system = collectGeneratorSystem(expr, variable, families);
			if (system) {
				retval = matchGeneratorSystem(
					expr, variable, maxDegree, system.generators, system.rows, system.inputPolynomials
				);
			}
		} catch {
			// Unsupported generators or coefficient domains are not a match.
		}
	}
	return retval;
}


/**
 * Match rational functions against derivatives of A_j(x)/Q(x)^j,
 * log(Q(x)), and (for real irreducible quadratics) atan terms.
 *
 * Supports powers Q^1 through Q^5 with deg(Q) <= 3. Other
 * denominators may be separated using the existing partial-fraction routine.
 */

/** Match a bounded rational derivative basis without invoking decomposition fallbacks. */
export function pmintRationalCoefficientMatch(
	input: ExpressionInput,
	variable: string
): Expression | undefined {
	let retval: Expression | undefined;
	const expr = Expression.create(input);
	try {
		const den = expr.getDenominator();
		if (!den.isOne()) {
			const power = den.getPower();
			const n = power.isInteger() && power.gt(zero()) ? Number(power.text()) : 1;
			const q = n > 1 ? den.getBase() : den;
			const d = new Polynomial(q, [variable]).deg();
			if (n >= 1 && n <= 5 && d >= 1 && d <= 3 && q.hasVariable(variable)) {

				const x = Expression.create(variable);
				const qPrime = diff(q, variable);
				const commonPower = Math.max(n, 2);
				const target = expr.getNumerator().times(q.pow(commonPower - n));
				const basis: Expression[] = [];
				const candidates: Expression[] = [];

				// Each rational candidate contributes a polynomial numerator
				// after clearing the common denominator Q^commonPower.
				for (let j = 1; j < commonPower; j++) {
					const denominator = q.pow(j);
					const scale = q.pow(commonPower - j - 1);
					for (let k = 0; k < d; k++) {
						const monomial = k === 0 ? one() : x.pow(k);
						const derivative = k === 0 ? zero() :
							Expression.Number(k).times(x.pow(k - 1));
						basis.push(
							derivative.times(q)
								.minus(Expression.Number(j).times(monomial).times(qPrime))
								.times(scale)
						);
						candidates.push(monomial.div(denominator));
					}
				}

				basis.push(qPrime.times(q.pow(commonPower - 1)));
				candidates.push(Expression.create(`log(${q.text()})`));

				if (d === 2) {
					const coefficients = new Polynomial(q, [variable]).toArray(false, variable);
					const a = coefficients[2] ?? zero();
					const b = coefficients[1] ?? zero();
					const c = coefficients[0] ?? zero();
					const discriminant = Expression.Number(4).times(a).times(c).minus(b.pow(2));
					if (!a.isZero() && discriminant.gt(zero())) {
						const root = discriminant.pow(Expression.Number('1/2'));
						const argument = Expression.Number(2).times(a).times(x).plus(b).div(root);
						const atanTerm = Expression.Number(2).div(root)
							.times(Expression.toFunction('atan', [argument]));
						basis.push(q.pow(commonPower - 1));
						candidates.push(atanTerm);
					} else if (!a.isZero() && discriminant.lt(zero())) {
						const root = discriminant.neg().pow(Expression.Number('1/2'));
						const center = x.plus(b.div(Expression.Number(2).times(a)));
						const offset = root.div(Expression.Number(2).times(a));
						const ratio = center.minus(offset).div(center.plus(offset));
						basis.push(q.pow(commonPower - 1));
						candidates.push(Expression.toFunction('log', [ratio]).times(root).div(discriminant.neg()));
					}
				}

				const columns = basis.map(value =>
					new Polynomial(value.expand(), [variable]).toArray(false, variable)
				);
				const rhs = new Polynomial(target.expand(), [variable]).toArray(false, variable);
				const rowCount = Math.max(rhs.length, ...columns.map(column => column.length));
				const unknowns = basis.length;

				if (rowCount >= unknowns && rowCount <= 16) {
					const rows: Expression[][] = [];
					for (let k = 0; k < rowCount; k++) {
						rows.push([
							...columns.map(column => column[k] ?? zero()),
							rhs[k] ?? zero(),
						]);
					}
					const solution = solveCoefficients(rows, unknowns);
					if (solution) {
						retval = candidates.reduce(
							(sum, candidate, index) => sum.plus(candidate.times(solution[index])),
							zero()
						);
					}
				}
			}
		}
	} catch {
		// Unsupported polynomial or coefficient domain.
	}
	return retval;
}

export function pmintRational(
	input: ExpressionInput,
	variable: string
): Expression | undefined {
	let retval: Expression | undefined;
	const expr = Expression.create(input);
	try {
		// A powered sum remains sum-typed; only split an actual additive expression.
		if (expr.isSum() && expr.getPower().isOne()) {
			let sum = zero();
			let resolved = true;
			for (const term of expr.elementsArray()) {
				const value = pmintRational(term, variable);
				if (value === undefined) {
					resolved = false;
					break;
				}
				sum = sum.plus(value);
			}
			if (resolved) {retval = sum;}
		} else {
			const den = expr.getDenominator();
			if (den.isOne() && expr.isPolynomialLike()) {
				const coefficients = new Polynomial(expr, [variable]).toArray(false, variable);
				const x = Expression.create(variable);
				retval = coefficients.reduce(
					(sum, coefficient, k) => sum.plus(
						coefficient.times(x.pow(k + 1)).div(Expression.Number(k + 1))
					),
					zero()
				);
			}
			if (retval === undefined && !den.isOne()) {
				const numerator = expr.getNumerator();
				const numeratorDegree = new Polynomial(numerator, [variable]).deg();
				const denominatorDegree = new Polynomial(den, [variable]).deg();
				if (numeratorDegree >= denominatorDegree) {
					const [quotient, remainder] = divide(numerator, den);
					const polynomial = pmintRational(quotient, variable);
					const fractional = remainder.isZero() ? zero() :
						pmintRational(remainder.div(den), variable);
					if (polynomial !== undefined && fractional !== undefined) {
						retval = polynomial.plus(fractional);
					}
				}
			}
			if (retval === undefined && !den.isOne()) {
			retval = pmintRationalCoefficientMatch(expr, variable);
			if (retval === undefined) {
			const power = den.getPower();
			const n = power.isInteger() && power.gt(zero()) ?
				Number(power.text()) : 1;
			const q = n > 1 ? den.getBase() : den;
			const d = new Polynomial(q, [variable]).deg();

			// The radical split can avoid expensive partial fraction attempts
			// on even monic quartics. Keep ordinary decomposition as fallback.
			if (retval === undefined && d >= 1 && d <= 6) {
				// An even monic quartic can split over a quadratic radical
				// when both real quadratic factors have positive discriminant complements.
				if (retval === undefined && n === 1 && d === 4) {
					const coefficients = new Polynomial(q, [variable]).toArray(false, variable);
					const a = coefficients[2] ?? zero();
					const b = coefficients[0] ?? zero();
					if ((coefficients[4] ?? zero()).eq(one()) &&
						(coefficients[3] ?? zero()).isZero() &&
						(coefficients[1] ?? zero()).isZero() &&
						a.isNUM() && b.isNUM() && b.gt(zero())) {
						const t = b.pow(Expression.Number('1/2'));
						const uSquared = Expression.Number(2).times(t).minus(a);
						if (uSquared.isNUM() && uSquared.gt(zero())) {
							const u = uSquared.pow(Expression.Number('1/2'));
							const x = Expression.create(variable);
							const plus = x.pow(2).plus(u.times(x)).plus(t);
							const minus = x.pow(2).minus(u.times(x)).plus(t);
							const numerator = new Polynomial(expr.getNumerator(), [variable])
								.toArray(false, variable);
							const p0 = numerator[0] ?? zero();
							const p1 = numerator[1] ?? zero();
							const p2 = numerator[2] ?? zero();
							const p3 = numerator[3] ?? zero();
							const sum = p0.div(t);
							const difference = p2.minus(sum).div(u);
							const offset = p1.minus(t.times(p3)).div(u);
							const two = Expression.Number(2);
							const left = p3.minus(difference).div(two).times(x)
								.plus(sum.minus(offset).div(two));
							const right = p3.plus(difference).div(two).times(x)
								.plus(sum.plus(offset).div(two));
							const split = left.div(plus).plus(right.div(minus));
							retval = pmintRational(split, variable);
						}
					}
				}
				if (retval === undefined) {
					const decomposed = partfrac(expr, variable);
					if (decomposed.text() !== expr.text() &&
						decomposed.isSum() && decomposed.getPower().isOne()) {
						retval = pmintRational(decomposed, variable);
					}
				}
			}
			}
			}
		}
	} catch {
		// Unsupported polynomial or coefficient domain.
	}
	return retval;
}
