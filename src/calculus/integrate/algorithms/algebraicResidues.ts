import { Expression } from '../../../core/classes/expression/Expression';
import { one, zero } from '../../../core/classes/expression/shortcuts';
import { Syl } from '../../../core/classes/matrix/Sylvester';
import { Polynomial } from '../../../core/classes/polynomial/Polynomial';
import { divide } from '../../../core/classes/polynomial/utils';
import { message, PolynomialError } from '../../../core/errors';

import { rethrowUnexpected } from './rationalErrors';
import { rationalPolynomialGcd, ResiduePolynomialRing } from './residueArithmetic';

const MAX_RESIDUE_DEGREE = 6;
const INTERPOLATION_MIN_DEGREE = 3;

/**
 * Exact residue-polynomial data for a square-free rational function over Q[x].
 * Roots of residuePolynomial give the possible coefficients of logarithms.
 * The corresponding logarithm arguments still require polynomial GCD or
 * subresultant calculations over those algebraic roots.
 *
 * The residue-polynomial calculation uses the Rothstein-Trager resultant
 * approach: resultant(Q, P-z*Q', x) identifies the logarithmic residues.
 * Reference: Manuel Bronstein, Symbolic Integration I (2nd ed.),
 * Chapter 2, Integration of Rational Functions.
 * https://link.springer.com/book/10.1007/b138171
 * The interpolation and degree limits below are specific to this implementation.
 */
export type SquareFreeLogarithmicData =
	| {
		type: 'residues';
		numerator: Expression;
		denominator: Expression;
		denominatorDerivative: Expression;
		residueVariable: string;
		residuePolynomial: Expression;
	}
	| { type: 'unsupported'; reason: string };

export function squareFreeLogarithmicData(
	numerator: Expression,
	denominator: Expression,
	variable: string,
	residueVariable = 'z',
	maxDegree = MAX_RESIDUE_DEGREE
): SquareFreeLogarithmicData {
	let retval: SquareFreeLogarithmicData = {
		type: 'unsupported',
		reason: 'Unsupported rational function',
	};

	if (variable !== residueVariable && !numerator.hasVariable(residueVariable) &&
		!denominator.hasVariable(residueVariable)) {
		try {
			const p = new Polynomial(numerator, [variable]).toArray(false, variable);
			const q = new Polynomial(denominator, [variable]).toArray(false, variable);
			const degree = q.length - 1;
			if (degree > 0 && degree <= maxDegree && p.length <= degree &&
				[...p, ...q].every(value => value.isNUM() && !value.hasDecimal()) &&
				!q[degree].isZero()) {
				const leading = q[degree];
				const normalizedP = numerator.div(leading).expand();
				const normalizedQ = denominator.div(leading).expand();
				const derivative = new Polynomial(normalizedQ, [variable]).diff(variable).getExpression();

				const common = rationalPolynomialGcd(normalizedQ, derivative, variable);
				if (common !== undefined && new Polynomial(common, [variable]).deg(variable) === 0) {
					const z = Expression.create(residueVariable);
					let resultant = zero();
					let coefficients: Expression[] = [];
					// Numeric specialization avoids expensive symbolic determinant arithmetic.
					let interpolate = degree >= INTERPOLATION_MIN_DEGREE;
					if (!interpolate) {
						resultant = new Syl(normalizedQ,
							normalizedP.minus(z.times(derivative)), variable).Res();
						try {
							coefficients = new Polynomial(resultant, [residueVariable])
								.toArray(false, residueVariable);
						} catch (error) {
							rethrowUnexpected(error);
							interpolate = true;
						}
					}
					if (interpolate) {
						// Evaluate at negative integers to avoid common positive rational residues.
						const samples: Expression[] = [];
						for (let k = 0; k <= degree; k++) {
							const point = Expression.Number(-k);
							const value = new Syl(normalizedQ,
								normalizedP.minus(point.times(derivative)).expand(), variable).Res();
							if (!value.isNUM() || value.hasDecimal()) {
								throw new PolynomialError(message('notAPolynomial'));
							}
							samples.push(value);
						}
						resultant = zero();
						for (let k = 0; k <= degree; k++) {
							let basis = one();
							for (let j = 0; j <= degree; j++) {
								if (j !== k) {
									basis = basis.times(z.plus(j)).div(Expression.Number(j - k));
								}
							}
							resultant = resultant.plus(samples[k].times(basis.expand()));
						}
						resultant = resultant.expand();
						coefficients = new Polynomial(resultant, [residueVariable])
							.toArray(false, residueVariable);
					}
					if (coefficients.length > 1 &&
						coefficients.every(value => value.isNUM() && !value.hasDecimal()) &&
						coefficients.some(value => !value.isZero())) {
						retval = {
							type: 'residues',
							numerator: normalizedP,
							denominator: normalizedQ,
							denominatorDerivative: derivative,
							residueVariable,
							residuePolynomial: resultant,
						};
					}
				}
			}
		} catch (error) {
			rethrowUnexpected(error);
			// Only exact, supported polynomial inputs are accepted.
		}
	}
	return retval;
}

export type AlgebraicLogarithmicArgument =
	| { type: 'argument'; polynomial: Expression; coefficients: Expression[] }
	| { type: 'unsupported'; reason: string };

/**
 * Computes gcd(Q, P-z Q') over Q[z]/(m(z))[x].
 * Every coefficient division uses the existing quotient-ring inverse.
 * A reducible modulus may contain zero divisors; these are rejected.
 * This supplies the logarithm arguments for the Rothstein-Trager residue
 * calculation; it does not find or numerically approximate the algebraic roots.
 * Reference: Manuel Bronstein, Symbolic Integration I (2nd ed.), Chapter 2.
 * https://link.springer.com/book/10.1007/b138171
 */
export function algebraicLogarithmicArgument(
	data: SquareFreeLogarithmicData,
	residueFactor: Expression,
	variable: string
): AlgebraicLogarithmicArgument {
	let retval: AlgebraicLogarithmicArgument = {
		type: 'unsupported',
		reason: 'Unsupported residue factor or coefficient division',
	};
	if (data.type === 'residues' && variable !== data.residueVariable) {
		try {
			const ring = new ResiduePolynomialRing(residueFactor, data.residueVariable);
			const [, factorRemainder] = divide(
				data.residuePolynomial, residueFactor, undefined, [data.residueVariable]
			);
			if (!factorRemainder.isZero()) {
				return retval;
			}
			const x = Expression.create(variable);
			const z = Expression.create(data.residueVariable);
			const source = new Polynomial(data.denominator, [variable]).toArray(false, variable);
			const difference = data.numerator.minus(z.times(data.denominatorDerivative)).expand();
			const divisor = new Polynomial(difference, [variable]).toArray(false, variable);

			const trim = (coefficients: Expression[]): Expression[] => {
				const result = coefficients.map(value => ring.reduce(value));
				while (result.length > 0 && result[result.length - 1].isZero()) {
					result.pop();
				}
				return result;
			};

			const remainder = (dividend: Expression[], denominator: Expression[]): Expression[] | undefined => {
				let result: Expression[] | undefined;
				const inverse = ring.invert(denominator[denominator.length - 1]);
				if (inverse !== undefined) {
					const current = trim(dividend);
					while (current.length >= denominator.length) {
						const shift = current.length - denominator.length;
						const leadingIndex = current.length - 1;
						const scale = ring.reduce(current[leadingIndex].times(inverse));
						for (let k = 0; k < denominator.length - 1; k++) {
							current[k + shift] = ring.reduce(
								current[k + shift].minus(scale.times(denominator[k]))
							);
						}
						// The leading coefficient cancels exactly in the quotient ring.
						// Remove it directly instead of relying on expression simplification.
						current.pop();
						while (current.length > 0 && current[current.length - 1].isZero()) {
							current.pop();
						}
					}
					result = current;
				}
				return result;
			};

			let left = trim(source);
			let right = trim(divisor);
			let valid = left.length > 1 && right.length <= left.length;
			const maxSteps = left.length + 1;
			let steps = 0;
			while (valid && right.length > 0 && steps < maxSteps) {
				const rest = remainder(left, right);
				if (rest === undefined) {
					valid = false;
				} else {
					left = right;
					right = rest;
				}
				steps++;
			}
			if (right.length > 0) {
				valid = false;
			}

			if (valid && right.length === 0 && left.length > 1) {
				const inverse = ring.invert(left[left.length - 1]);
				if (inverse !== undefined) {
					const coefficients = trim(left.map(value => ring.reduce(value.times(inverse))));
					let polynomial = zero();
					for (let k = 0; k < coefficients.length; k++) {
						polynomial = polynomial.plus(coefficients[k].times(x.pow(k)));
					}

					// Check the monic divisor against both input polynomials in
					// the coefficient quotient ring, not as an ordinary expression.
					if (remainder(source, coefficients)?.length === 0 &&
						remainder(divisor, coefficients)?.length === 0 &&
						ring.reduce(coefficients[coefficients.length - 1].minus(one())).isZero()) {
						retval = { type: 'argument', polynomial: polynomial.expand(), coefficients };
					}
				}
			}
		} catch (error) {
			rethrowUnexpected(error);
			// Unsupported or noninvertible coefficients do not yield an argument.
		}
	}
	return retval;
}
