import { Expression } from '../../../core/classes/expression/Expression';
import { one, zero } from '../../../core/classes/expression/shortcuts';
import { Polynomial } from '../../../core/classes/polynomial/Polynomial';
import { divide } from '../../../core/classes/polynomial/utils';
import { message, PolynomialError } from '../../../core/errors';
import { toCommonDenominator } from '../../../core/functions/rationalNormalization';

import { rethrowUnexpected } from './rationalErrors';

import type { SquareFreeLogarithmicData } from './algebraicResidues';

/**
 * Exact arithmetic in Q[z]/(modulus). Inversion is available only when the
 * element is coprime to the modulus; reducible moduli are supported as rings.
 */
export class ResiduePolynomialRing {
	private readonly degree: number;
	private readonly modulus: Expression;
	private readonly variable: string;

	constructor(modulus: Expression, variable: string) {
		const coefficients = new Polynomial(modulus, [variable]).toArray(false, variable);
		if (coefficients.length < 2 ||
			!coefficients.every(coefficient => coefficient.isNUM() && !coefficient.hasDecimal())) {
			throw new PolynomialError(message('notAPolynomial'));
		}
		this.variable = variable;
		this.degree = coefficients.length - 1;
		this.modulus = modulus.div(coefficients[coefficients.length - 1]).expand();
	}

	invert(value: Expression): Expression | undefined {
		let retval: Expression | undefined;
		let a = this.modulus;
		let b = this.reduce(value);
		let previous = zero();
		let current = one();
		let steps = 0;
		const degree = new Polynomial(this.modulus, [this.variable]).deg(this.variable);

		while (!b.isZero() && steps <= degree + 1) {
			const [quotient, remainder] = divide(a, b, undefined, [this.variable]);
			const next = previous.minus(quotient.times(current)).expand();
			a = b;
			b = remainder.expand();
			previous = current;
			current = next;
			steps++;
		}
		if (b.isZero()) {
			const coefficients = new Polynomial(a, [this.variable]).toArray(false, this.variable);
			if (coefficients.length === 1 && !coefficients[0].isZero()) {
				const candidate = this.reduce(previous.div(coefficients[0]).expand());
				const product = this.reduce(value.times(candidate).expand());
				if (product.minus(one()).expand().isZero()) {
					retval = candidate;
				}
			}
		}
		return retval;
	}

	reduce(value: Expression): Expression {
		const coefficients = new Polynomial(value, [this.variable]).toArray(false, this.variable);
		if (!coefficients.every(coefficient => coefficient.isNUM() && !coefficient.hasDecimal())) {
			throw new PolynomialError(message('notAPolynomial'));
		}
		let retval = value;
		if (coefficients.length > this.degree) {
			const [, remainder] = divide(value, this.modulus, undefined, [this.variable]);
			retval = remainder.expand();
		}
		return retval;
	}
}

/** Returns a monic Euclidean GCD over Q[x], or undefined if exact division fails. */
export function rationalPolynomialGcd(
	left: Expression,
	right: Expression,
	variable: string
): Expression | undefined {
	let retval: Expression | undefined;
	const aCoefficients = new Polynomial(left, [variable]).toArray(false, variable);
	const bCoefficients = new Polynomial(right, [variable]).toArray(false, variable);
	if ([...aCoefficients, ...bCoefficients].every(value => value.isNUM() && !value.hasDecimal())) {
		let a = left;
		let b = right;
		let steps = 0;
		const limit = Math.max(aCoefficients.length, bCoefficients.length);
		while (!b.isZero() && steps < limit) {
			const [, remainder] = divide(a, b, undefined, [variable]);
			a = b;
			b = remainder.expand();
			steps++;
		}
		if (b.isZero()) {
			const coefficients = new Polynomial(a, [variable]).toArray(false, variable);
			const leading = coefficients[coefficients.length - 1];
			if (!leading.isZero()) {
				retval = a.div(leading).expand();
			}
		}
	}
	return retval;
}

export type RationalLogarithmicArgument =
	| { type: 'argument'; residue: Expression; polynomial: Expression }
	| { type: 'unsupported'; reason: string };

/**
 * Associates a rational root of the residue resultant with its logarithm
 * argument gcd(Q, P-residue*Q'). Algebraic residue roots need arithmetic
 * modulo their minimal polynomials and are not handled here.
 */
export function rationalLogarithmicArgument(
	data: SquareFreeLogarithmicData,
	residue: Expression,
	variable: string
): RationalLogarithmicArgument {
	let retval: RationalLogarithmicArgument = {
		type: 'unsupported',
		reason: 'Expected exact rational residue data',
	};

	if (data.type === 'residues' && residue.isNUM() && !residue.hasDecimal()) {
		try {
			const coefficients = new Polynomial(data.residuePolynomial, [data.residueVariable])
				.toArray(false, data.residueVariable);
			let evaluated = zero();
			for (let k = coefficients.length - 1; k >= 0; k--) {
				evaluated = evaluated.times(residue).plus(coefficients[k]);
			}
			if (evaluated.isZero()) {
				const difference = data.numerator.minus(residue.times(data.denominatorDerivative)).expand();
				const monic = rationalPolynomialGcd(data.denominator, difference, variable);
				if (monic !== undefined && new Polynomial(monic, [variable]).deg(variable) > 0) {
					const [, denominatorRest] = divide(data.denominator, monic, undefined, [variable]);
					const [, differenceRest] = divide(difference, monic, undefined, [variable]);
					if (denominatorRest.isZero() && differenceRest.isZero()) {
						retval = { type: 'argument', residue, polynomial: monic };
					}
				}
			}
		} catch (error) {
			rethrowUnexpected(error);
			// Polynomial arithmetic must remain exact.
		}
	}
	return retval;
}

const MAX_DEGREE = 6;

/**
 * Pseudo-remainder sequence in Q[z][x].
 * No division by parameter-dependent leading coefficients is performed:
 * specialization at an algebraic residue therefore remains meaningful.
 */
export function logarithmicPseudoRemainders(
	denominator: Expression,
	residueDifference: Expression,
	variable: string
): Expression[][] | undefined {
	let retval: Expression[][] | undefined;
	try {
		let left = new Polynomial(denominator, [variable]).toArray(false, variable);
		let right = new Polynomial(residueDifference, [variable]).toArray(false, variable);
		const sequence: Expression[][] = [left, right];
		let valid = left.length > 1 && left.length <= MAX_DEGREE + 1 && right.length > 0 &&
			right.length <= left.length;
		while (valid && right.length > 1) {
			let rest = [...left];
			const leading = right[right.length - 1];
			const rightDegree = right.length - 1;
			const maximum = rest.length - right.length + 1;
			for (let step = 0; step < maximum; step++) {
				const degree = rest.length - 1;
				const coefficient = rest[degree];
				const shift = degree - rightDegree;
				const next = rest.map(value => value.times(leading));
				for (let j = 0; j <= rightDegree; j++) {
					next[j + shift] = next[j + shift].minus(coefficient.times(right[j])).expand();
				}
				while (next.length > 0 && next[next.length - 1].isZero()) {
					next.pop();
				}
				rest = next;
				if (rest.length < right.length) {
					break;
				}
			}
			if (rest.length === 0) {
				break;
			}
			sequence.push(rest);
			left = right;
			right = rest;
			valid = sequence.length <= MAX_DEGREE + 2;
		}
		if (valid) {
			retval = sequence;
		}
	} catch (error) {
		rethrowUnexpected(error);
		// An unsupported symbolic coefficient must not be treated as an exact PRS.
	}
	return retval;
}

/**
 * Differentiates a logarithmic root sum exactly when its argument is
 * A(x) + B(x)z after reducing higher powers modulo the residue
 * polynomial. The trace does not construct algebraic roots.
 */
export function logRootDerivative(
	polynomial: Expression,
	argument: Expression,
	residueVariable: string,
	variable: string
): Expression | undefined {
	let retval: Expression | undefined;
	if (residueVariable !== variable) {
		try {
			const coefficients = new Polynomial(polynomial, [residueVariable])
				.toArray(false, residueVariable);
			const argumentCoefficients = new Polynomial(argument, [residueVariable])
				.toArray(false, residueVariable);
			const degree = coefficients.length - 1;
			if (degree > 0 &&
				coefficients.every(value => value.isNUM() && !value.hasDecimal()) &&
				!coefficients[degree].isZero()) {
				const derivative = new Polynomial(polynomial, [residueVariable])
					.diff(residueVariable).getExpression();
				const common = rationalPolynomialGcd(polynomial, derivative, residueVariable);
				if (common !== undefined &&
					new Polynomial(common, [residueVariable]).deg(residueVariable) === 0) {
					let reduced = argumentCoefficients;
					if (argumentCoefficients.length > degree) {
						reduced = new Array<Expression>(degree).fill(zero());
						for (let index = argumentCoefficients.length - 1; index >= 0; index--) {
							const leading = reduced[degree - 1].div(coefficients[degree]);
							const next = new Array<Expression>(degree);
							for (let j = 0; j < degree; j++) {
								next[j] = (j === 0 ? argumentCoefficients[index] : reduced[j - 1])
									.minus(leading.times(coefficients[j])).expand();
							}
							reduced = next;
						}
						}
					const a = reduced[0] ?? zero();
					const b = reduced[1] ?? zero();
					const linear = reduced.slice(2).every(value => value.isZero());
					const moment = zero().minus(coefficients[degree - 1]).div(coefficients[degree]);
					if (linear && b.isZero() && !a.isZero()) {
						retval = moment.times(new Polynomial(a, [variable]).diff(variable).getExpression()).div(a);
					} else if (linear && !b.isZero()) {
						// Q(A,B) is proportional to the product of A+B*alpha
						// over all roots alpha of the residue polynomial.
						let norm = zero();
						let normDerivative = zero();
						for (let index = 0; index <= degree; index++) {
							const coefficient = coefficients[index].times(
								zero().minus(a).pow(index)
							);
							norm = norm.plus(coefficient.times(b.pow(degree - index)));
							if (index > 0) {
								normDerivative = normDerivative.minus(
									coefficients[index].times(Expression.Number(index))
										.times(zero().minus(a).pow(index - 1))
										.times(b.pow(degree - index))
								);
							}
						}
						if (!norm.expand().isZero()) {
							const first = Expression.Number(degree).times(norm)
								.minus(a.times(normDerivative));
							const second = moment.times(b).times(norm).minus(a.times(first));
							const derivative = new Polynomial(a, [variable]).diff(variable).getExpression().times(b).times(first)
								.plus(new Polynomial(b, [variable]).diff(variable).getExpression().times(second));
							retval = toCommonDenominator(derivative.div(b.sq().times(norm)));
						}
					}
				}
			}
		} catch (error) {
			rethrowUnexpected(error);
			// Outside the currently supported exact polynomial representation.
		}
	}
	return retval;
}
