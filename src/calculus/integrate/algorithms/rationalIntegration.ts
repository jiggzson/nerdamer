import { polyFactorExpressions } from '../../../algebra/factor/factor';
import { partfrac } from '../../../algebra/partfrac';
import { Expression } from '../../../core/classes/expression/Expression';
import { four, half, minusOne, one, two, zero } from '../../../core/classes/expression/shortcuts';
import { Polynomial } from '../../../core/classes/polynomial/Polynomial';
import { divide } from '../../../core/classes/polynomial/utils';
import { INTEGRATE } from '../../../core/constants/functionNames';
import { getU, subst } from '../../../core/functions/subst';
import { log } from '../../../math/index';
import { atan } from '../../../math/trig';
import { matchPowerSubstitution } from '../bySubstitution';
import { pmintRational, pmintRationalCoefficientMatch } from '../poorMansIntegrator';
import { hasTranscendental, MAX_INTEGRATION_DEPTH } from '../utils';

import { algebraicLogarithmicArgument, squareFreeLogarithmicData } from './algebraicResidues';
import { hermiteReduce } from './hermiteReduction';
import { rethrowUnexpected } from './rationalErrors';
import { rationalPolynomialGcd, ResiduePolynomialRing } from './residueArithmetic';

/**
 * Callback used by strategies that split or transform an integral.
 * The dispatcher stays the owner of recursion and depth limits.
 */
export type IntegrationCallback = (input: Expression, variable: string, depth: number) => Expression;

export type RationalIntegralData =
	| {
		type: 'assembled';
		rationalPart: Expression;
		logarithmicTerms: ReadonlyArray<{
			residuePolynomial: Expression;
			argument: Expression;
		}>;
		residueVariable: string;
	}
	| { type: 'unsupported'; reason: string };

/**
 * Assembles Hermite reduction and algebraic logarithmic arguments.
 * Residue factors are computed automatically unless explicitly supplied.
 * Supplied factors must account for every distinct residue.
 * The result describes a formal sum over the roots of each residue factor;
 * it is not an Expression antiderivative.
 */
export function rationalIntegralData(
	numerator: Expression,
	denominator: Expression,
	variable: string,
	residueFactors?: readonly Expression[],
	residueVariable = 'z',
	maxResidueDegree?: number
): RationalIntegralData {
	let retval: RationalIntegralData = { type: 'unsupported', reason: 'Incomplete logarithmic data' };
	const hermite = hermiteReduce(numerator, denominator, variable);

	if (hermite.type === 'reduced') {
		if (hermite.remainderNumerator.isZero() && (residueFactors === undefined || residueFactors.length === 0)) {
			retval = { type: 'assembled', rationalPart: hermite.rationalPart,
				logarithmicTerms: [], residueVariable };
		} else {
			const residues = squareFreeLogarithmicData(
				hermite.remainderNumerator, hermite.squareFreeDenominator, variable, residueVariable, maxResidueDegree
			);
			if (residues.type === 'residues' && (residueFactors === undefined || residueFactors.length > 0)) {
				try {
					const residueDerivative = new Polynomial(residues.residuePolynomial, [residueVariable])
						.diff(residueVariable).getExpression();
					const common = rationalPolynomialGcd(residues.residuePolynomial, residueDerivative, residueVariable);
					if (common === undefined) {
						return retval;
					}
					const [distinctResidues, squareFreeRest] = divide(
						residues.residuePolynomial, common, undefined, [residueVariable]
					);
					if (!squareFreeRest.isZero()) {
						return retval;
					}
					const factors = residueFactors ?? polyFactorExpressions(distinctResidues)
						.filter(factor => new Polynomial(factor, [residueVariable]).deg(residueVariable) > 0);
					let remaining = distinctResidues;
					const terms: Array<{ residuePolynomial: Expression; argument: Expression }> = [];
					let valid = true;
					for (const factor of factors) {
						const coefficients = new Polynomial(factor, [residueVariable])
							.toArray(false, residueVariable);
						if (coefficients.length < 2 ||
							!coefficients.every(value => value.isNUM() && !value.hasDecimal())) {
							valid = false;
							break;
						}
						const [quotient, rest] = divide(remaining, factor, undefined, [residueVariable]);
						if (!rest.isZero()) {
							valid = false;
							break;
						}
						const argument = algebraicLogarithmicArgument(residues, factor, variable);
						if (argument.type !== 'argument') {
							valid = false;
							break;
						}
						terms.push({ residuePolynomial: factor, argument: argument.polynomial });
						remaining = quotient.expand();
					}
					if (valid && new Polynomial(remaining, [residueVariable])
						.deg(residueVariable) === 0 && !remaining.isZero()) {
						retval = {
							type: 'assembled',
							rationalPart: hermite.rationalPart,
							logarithmicTerms: terms,
							residueVariable,
						};
					}
				} catch (error) {
					rethrowUnexpected(error);
					// Polynomial factors must be exact and account for every residue.
				}
			}
		}
	}
	return retval;
}

/**
 * Verifies the derivative of a formal algebraic logarithmic sum using traces.
 * For monic G dividing Q over Q[z]/m, Q * d(log G)/dx = (Q/G) G'.
 * The trace of z times that polynomial is taken coefficient by coefficient.
 */
export function verifyLogarithmicDerivative(
	integral: RationalIntegralData,
	numerator: Expression,
	denominator: Expression,
	variable: string
): boolean {
	let retval = false;
	if (integral.type === 'assembled') {
		try {
			const z = Expression.create(integral.residueVariable);
			const q = new Polynomial(denominator, [variable]).toArray(false, variable);
			const p = new Polynomial(numerator, [variable]).toArray(false, variable);
			const total: Expression[] = new Array<Expression>(q.length).fill(zero());
			let valid = q.length > 1;

			for (const term of integral.logarithmicTerms) {
				const ring = new ResiduePolynomialRing(term.residuePolynomial, integral.residueVariable);
				const modulusDegree = new Polynomial(term.residuePolynomial, [integral.residueVariable])
					.deg(integral.residueVariable);
				const coefficients = new Polynomial(term.argument, [variable]).toArray(false, variable)
					.map(value => ring.reduce(value));
				const degree = coefficients.length - 1;
				if (degree < 1 || !ring.reduce(coefficients[degree].minus(one())).isZero()) {
					valid = false;
					break;
				}

				const quotient = new Array<Expression>(q.length - degree).fill(zero());
				const rest = q.map(value => ring.reduce(value));
				for (let k = q.length - 1; k >= degree; k--) {
					const value = rest[k];
					quotient[k - degree] = value;
					for (let j = 0; j <= degree; j++) {
						rest[k - degree + j] = ring.reduce(
							rest[k - degree + j].minus(value.times(coefficients[j]))
						);
					}
				}
				if (rest.some(value => !value.isZero())) {
					valid = false;
					break;
				}

				const derivative = coefficients.slice(1).map((value, index) =>
					ring.reduce(value.times(Expression.Number(index + 1)))
				);
				for (let i = 0; i < quotient.length; i++) {
					for (let j = 0; j < derivative.length; j++) {
						const element = ring.reduce(z.times(quotient[i]).times(derivative[j]));
						let trace = zero();
						for (let basis = 0; basis < modulusDegree; basis++) {
							const product = ring.reduce(element.times(z.pow(basis)));
							const vector = new Polynomial(product, [integral.residueVariable])
								.toArray(false, integral.residueVariable);
							trace = trace.plus(vector[basis] ?? zero());
						}
						total[i + j] = total[i + j].plus(trace);
					}
				}
			}
			if (valid) {
				// Compare D(rationalPart) separately by a cleared-denominator identity.
				// The caller supplies the square-free remainder numerator/denominator.
				retval = total.every((value, index) =>
					value.minus(p[index] ?? zero()).expand().isZero()
				);
			}
		} catch (error) {
			rethrowUnexpected(error);
			// Incomplete or non-exact logarithmic data cannot be verified.
		}
	}
	return retval;
}

/**
 * Checks the complete rational integral against its input without expanding
 * algebraic logarithms. Hermite reduction proves the rational derivative
 * identity; the quotient-ring trace proves the remaining logarithmic part.
 */
export function verifyIntegralData(
	integral: RationalIntegralData,
	numerator: Expression,
	denominator: Expression,
	variable: string
): boolean {
	let retval = false;
	if (integral.type === 'assembled') {
		const hermite = hermiteReduce(numerator, denominator, variable);
		if (hermite.type === 'reduced' && integral.rationalPart.eq(hermite.rationalPart)) {
			if (hermite.remainderNumerator.isZero()) {
				retval = integral.logarithmicTerms.length === 0;
			} else {
				retval = verifyLogarithmicDerivative(
					integral,
					hermite.remainderNumerator,
					hermite.squareFreeDenominator,
					variable
				);
			}
		}
	}
	return retval;
}

/**
 * Converts verified rational-residue logarithmic terms to ordinary expressions.
 * Quadratic conjugate residues can be expressed with log and atan.
 * Cubic and higher residue factors remain internal data; they are not
 * converted to new parser functions. If any term cannot be converted, the
 * whole conversion returns undefined so integrate() can leave it unevaluated.
 * Verification checks the algebraic data before constructing the expression.
 */
export function rationalIntegralExpression(
	data: RationalIntegralData,
	numerator: Expression,
	denominator: Expression,
	variable: string
): Expression | undefined {
	let retval: Expression | undefined;
	if (data.type === 'assembled') {
		const logarithms: Expression[] = [];
		let supported = true;
		for (const term of data.logarithmicTerms) {
			const logarithm = rationalLogTerm(term, data.residueVariable);
			if (logarithm === undefined) {
				supported = false;
				break;
			}
			logarithms.push(logarithm);
		}
		if (supported && verifyIntegralData(data, numerator, denominator, variable)) {
			const result = logarithms.reduce(
				(sum, logarithm) => sum.plus(logarithm), data.rationalPart
			);
			retval = result;
		}
	}
	return retval;
}

/**
 * Converts rational residues to logarithms and conjugate quadratic residues
 * to real logarithms and inverse tangents. Other residue factors are not yet
 * expressible using the supported functions.
 */
export function rationalLogTerm(
	term: { residuePolynomial: Expression; argument: Expression },
	residueVariable: string
): Expression | undefined {
	let retval: Expression | undefined;
	const coefficients = new Polynomial(term.residuePolynomial, [residueVariable])
		.toArray(false, residueVariable);
	if (coefficients.every(coefficient => coefficient.isNUM() && !coefficient.hasDecimal())) {
		if (coefficients.length === 2 && !coefficients[1].isZero()) {
			const residue = zero().minus(coefficients[0]).div(coefficients[1]);
			const argument = subst(term.argument, Expression.Variable(residueVariable), residue).expand();
			if (!argument.hasVariable(residueVariable)) {
				retval = residue.times(log(argument));
			}
		} else if (coefficients.length === 3 && !coefficients[2].isZero()) {
			const [c, b, a] = coefficients;
			const discriminant = b.sq().minus(four().times(a).times(c));
			if (discriminant.lt(zero())) {
				const args = new Polynomial(term.argument, [residueVariable])
					.toArray(false, residueVariable);
			if (args.length <= 2 && args.length > 0) {
					const constant = args[0];
					const linear = args[1] ?? zero();
					const real = zero().minus(b).div(two().times(a));
					const imaginary = discriminant.neg().pow(one().div(two())).div(two().times(a));
					const realArgument = constant.plus(real.times(linear)).expand();
					const imaginaryArgument = imaginary.times(linear).expand();
					const norm = realArgument.sq().plus(imaginaryArgument.sq()).expand();
					if (!norm.isZero()) {
						if (imaginaryArgument.isZero()) {
							retval = two().times(real).times(log(realArgument));
						} else {
							retval = real.times(log(norm)).plus(
								two().times(imaginary).times(atan(realArgument.div(imaginaryArgument)))
							);
						}
					}
				}
			}
		}
	}
	return retval;
}

/** Kept for callers of the earlier research name. */
export { rationalIntegralExpression as rationalIntegralFormalExpression };

export function tryIntegrateRational(expr: Expression, dx: string, depth: number, integrate: IntegrationCallback): Expression | undefined {
	if (depth >= MAX_INTEGRATION_DEPTH) {
		return undefined;
	}

	const num = expr.getNumerator();
	const den = expr.getDenominator();

	if (den.isOne() || !den.hasVariable(dx)) {
		return undefined;
	}

	if (hasTranscendental(num, dx) || hasTranscendental(den, dx)) {
		return undefined;
	}

	let pNum: Polynomial;
	let pDen: Polynomial;
	try {
		pNum = new Polynomial(num, [dx]);
		pDen = new Polynomial(den, [dx]);
	} catch (error) {
		rethrowUnexpected(error);
		return undefined;
	}

	const degNum = pNum.deg();
	const degDen = pDen.deg();
	if (degDen < 2) {
		return undefined;
	}

	let result = zero();
	let remainder = num;
	if (degNum >= degDen) {
		try {
			const [quotient, rem] = divide(num, den, undefined, [dx]);
			const polyIntegral = integrate(quotient, dx, depth);
			if (polyIntegral.isFunction(INTEGRATE)) {
				return undefined;
			}
			result = result.plus(polyIntegral);
			remainder = rem;
		} catch (error) {
			rethrowUnexpected(error);
			return undefined;
		}

		if (Expression.create(remainder).isZero()) {
			return result;
		}
	}

	const properFraction = Expression.create(remainder).div(den);
	if (degNum >= degDen) {
		const directIntegral = integrate(properFraction, dx, depth);
		if (!directIntegral.isFunction(INTEGRATE)) {
			result = result.plus(directIntegral);
			return result;
		}
	}

	const quadraticDenominator = properFraction.getDenominator();
	const quadraticBase = quadraticDenominator.getBase();
	try {
		const quadratic = new Polynomial(quadraticBase, [dx]);
		if (quadratic.deg() === 2 &&
			quadratic.toArray(false, dx).every(coefficient => coefficient.isNUM()) &&
			new Polynomial(properFraction.getNumerator(), [dx]).deg() <= 1) {
			const matched = pmintRationalCoefficientMatch(properFraction, dx);
			if (matched) {
				return result.plus(matched);
			}
		}
	} catch (error) {
		rethrowUnexpected(error);
		// Continue to partial fractions for unsupported denominators.
	}

	let decomposed: Expression;
	try {
		decomposed = partfrac(properFraction, dx);
	} catch (error) {
		rethrowUnexpected(error);
		return undefined;
	}

	if (decomposed.text() === properFraction.text()) {
		return undefined;
	}

	const decomposedIntegral = integrate(decomposed, dx, depth);
	if (decomposedIntegral.isFunction(INTEGRATE)) {
		return undefined;
	}

	return result.plus(decomposedIntegral);
}

export function tryIntegratePowerQuotient(
	expr: Expression,
	dx: string,
	depth: number,
	integrate: IntegrationCallback
): Expression | undefined {
	if (depth >= MAX_INTEGRATION_DEPTH) {
		return undefined;
	}

	const powResult = matchPowerSubstitution(expr, dx);
	if (powResult) {
		const n = powResult.power;
		const oneMinusN = one().plus(n.times(minusOne()));
		return powResult.fx.pow(oneMinusN).div(oneMinusN).times(powResult.constant);
	}

	const num = expr.getNumerator();
	const den = expr.getDenominator();
	if (den.isOne() || !den.hasVariable(dx)) {
		return undefined;
	}

	const denBase = den.getBase();
	const denPower = den.getPower();
	if (denPower.isOne()) {
		return undefined;
	}
	if (hasTranscendental(num, dx) || hasTranscendental(denBase, dx)) {
		return undefined;
	}

	let pNum: Polynomial;
	try {
		pNum = new Polynomial(num, [dx]);
		new Polynomial(denBase, [dx]);
	} catch (error) {
		rethrowUnexpected(error);
		return undefined;
	}
	if (pNum.deg() < 1) {
		return undefined;
	}

	let quotient: Expression;
	let remainder: Expression;
	try {
		[quotient, remainder] = divide(num, denBase, undefined, [dx]);
	} catch (error) {
		rethrowUnexpected(error);
		return undefined;
	}
	if (Expression.create(quotient).isZero()) {
		return undefined;
	}

	const term1 = Expression.create(quotient).times(
		denBase.pow(one().plus(denPower.times(minusOne())))
	);
	const term2Num = Expression.create(remainder);
	const term2 = term2Num.isZero() ? zero() : term2Num.div(den);

	const integral1 = integrate(term1, dx, depth);
	if (integral1.isFunction(INTEGRATE)) {
		return undefined;
	}

	let result = integral1;
	if (!term2Num.isZero()) {
		const integral2 = integrate(term2, dx, depth);
		if (integral2.isFunction(INTEGRATE)) {
			return undefined;
		}
		result = result.plus(integral2);
	}

	return result;
}


const MAX_EXACT_RATIONAL_DEGREE = 3;

export function tryIntegrateRationalCoefficientMatch(expr: Expression, dx: string): Expression | undefined {
	let retval: Expression | undefined;
	// Try the coefficient matcher before the costlier substitution and IBP
	// searches, only for numeric quadratic and eligible even-quartic forms.
	if (!retval && !hasTranscendental(expr, dx)) {
		const denominator = expr.getDenominator();
		if (!denominator.isOne() && denominator.hasVariable(dx)) {
			const base = denominator.getPower().isOne() ? denominator : denominator.getBase();
			try {
				const quadratic = new Polynomial(base, [dx]);
				if (quadratic.deg() === 2) {
					const coefficients = quadratic.toArray(false, dx);
					const a = coefficients[2] ?? zero();
					const b = coefficients[1] ?? zero();
					const c = coefficients[0] ?? zero();
					const discriminant = b.pow(two()).minus(four().times(a).times(c));
					if (a.isNUM() && b.isNUM() && c.isNUM() &&
						(discriminant.lt(zero()) ||
							(discriminant.gt(zero()) &&
								(denominator.getPower().gt(one()) || !expr.getNumerator().isOne())) ||
							(discriminant.isZero() && !expr.getNumerator().isOne()))) {
						retval = pmintRationalCoefficientMatch(expr, dx);
					}
				} else if (quadratic.deg() === 3) {
					// x*(a*x^2+b): PMInt avoids repeated partial-fraction work.
					const coefficients = quadratic.toArray(false, dx);
					if (coefficients.every(coefficient => coefficient.isNUM()) &&
						(coefficients[0] ?? zero()).isZero() &&
						(coefficients[2] ?? zero()).isZero() &&
						new Polynomial(expr.getNumerator(), [dx]).deg() <= 1) {
						retval = pmintRational(expr, dx);
					}
				} else if (quadratic.deg() === 4 && denominator.getPower().isOne()) {
					const coefficients = quadratic.toArray(false, dx);
					const a = coefficients[2] ?? zero();
					const b = coefficients[0] ?? zero();
					if (coefficients.length === 5 &&
						(coefficients[4] ?? zero()).eq(one()) &&
						(coefficients[3] ?? zero()).isZero() &&
						(coefficients[1] ?? zero()).isZero() &&
						a.isNUM() && b.isNUM() && b.gt(zero()) &&
						two().times(b.pow(half())).minus(a).gt(zero())) {
						retval = pmintRational(expr, dx);
					}
				}
			} catch (error) {
				rethrowUnexpected(error);
				// The other integration strategies remain available.
			}
		}
	}

	return retval;
}

export function tryIntegrateExactRational(expr: Expression, dx: string): Expression | undefined {
	let retval: Expression | undefined;
	// Try the exact rational method only after the existing methods fail.
	// It handles rational coefficients, not decimal or symbolic parameters.
	// Results with higher-degree algebraic logarithms stay unevaluated because
	// those terms cannot yet be written using supported public functions.
	if (!retval && !hasTranscendental(expr, dx)) {
		try {
			const numerator = expr.getNumerator();
			const denominator = expr.getDenominator();
			// Use a fresh variable for residues, separate from the integrand.
			const residueVariable = getU(expr);
			if (!denominator.isOne() && denominator.hasVariable(dx)) {
				const numeratorPolynomial = new Polynomial(numerator, [dx]);
				const denominatorPolynomial = new Polynomial(denominator, [dx]);
				const degree = denominatorPolynomial.deg();
				if (degree > 1 && degree <= MAX_EXACT_RATIONAL_DEGREE &&
					numeratorPolynomial.deg() < degree &&
					[...numeratorPolynomial.toArray(false, dx),
						...denominatorPolynomial.toArray(false, dx)]
						.every(value => value.isNUM() && !value.hasDecimal())) {
					const data = rationalIntegralData(numerator, denominator, dx, undefined, residueVariable);
					retval = rationalIntegralExpression(data, numerator, denominator, dx);
				}
			}
		} catch (error) {
			rethrowUnexpected(error);
			// Leave unsupported rational integrals to the existing fallback.
		}
	}

	return retval;
}

/**
 * Coordinate rational integration for the experimental controller.
 *
 * A logarithmic or power substitution is a change of variables, not a
 * rational integration algorithm. The coefficient matcher handles its
 * supported finite ansatz; decomposition handles elementary rational
 * factors; exact residues handle the supported rational coefficient field.
 * The underlying kernels remain independently callable during migration.
 */
export function integrateRationalFamily(
	expr: Expression,
	dx: string,
	depth: number,
	integrate: IntegrationCallback
): Expression | undefined {
	let retval: Expression | undefined;
	if (depth < MAX_INTEGRATION_DEPTH) {
		const denominator = expr.getDenominator();
		if (!denominator.isOne() && denominator.hasVariable(dx) &&
			!hasTranscendental(expr.getNumerator(), dx) &&
			!hasTranscendental(denominator, dx)) {
			retval = tryIntegrateRationalCoefficientMatch(expr, dx);
			if (!retval) {
				retval = tryIntegrateRational(expr, dx, depth, integrate);
			}
			if (!retval) {
				retval = tryIntegrateExactRational(expr, dx);
			}
		}
	}
	return retval;
}
