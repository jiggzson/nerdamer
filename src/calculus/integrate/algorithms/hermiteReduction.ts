import { Expression } from '../../../core/classes/expression/Expression';
import { zero } from '../../../core/classes/expression/shortcuts';
import { Polynomial } from '../../../core/classes/polynomial/Polynomial';
import { divide } from '../../../core/classes/polynomial/utils';
import { solveAugmentedLinearSystem } from '../../../solve/linsolve';

import { rethrowUnexpected } from './rationalErrors';
import { rationalPolynomialGcd } from './residueArithmetic';

const MAX_DEGREE = 12;

export type HermiteReduction =
	| { type: 'reduced'; rationalPart: Expression; remainder: Expression; squareFreeDenominator: Expression; rationalNumerator: Expression; remainderNumerator: Expression; repeatedFactor: Expression }
	| { type: 'unsupported'; reason: string };

/**
 * Reduces a proper rational function over Q[x] into a rational derivative
 * and a remainder with square-free denominator.
 *
 * This is an independent algebraic operation; it does not call integrate().
 * It follows the Hermite-reduction idea: separate the derivative of a rational
 * function so the remaining denominator has no repeated factors.
 *
 * Reference: Manuel Bronstein, Symbolic Integration I (2nd ed.),
 * Chapter 2, Integration of Rational Functions.
 * https://link.springer.com/book/10.1007/b138171
 * This is Nerdamer's implementation, not a transcription of the book's code.
 */
export function hermiteReduce(
	numerator: Expression,
	denominator: Expression,
	variable: string
): HermiteReduction {
	let retval: HermiteReduction = { type: 'unsupported', reason: 'Unsupported polynomial input' };

	try {
		const x = Expression.create(variable);
		const p = new Polynomial(numerator, [variable]).toArray(false, variable);
		const q = new Polynomial(denominator, [variable]).toArray(false, variable);
		const supported = [...p, ...q].every(value => value.isNUM() && !value.hasDecimal());
		const degree = q.length - 1;

		if (supported && degree > 0 && degree <= MAX_DEGREE &&
			p.length <= degree && !q[degree].isZero()) {
			const leading = q[degree];
			const normalizedP = numerator.div(leading).expand();
			const normalizedQ = denominator.div(leading).expand();

			const derivativeQ = new Polynomial(normalizedQ, [variable]).diff(variable).getExpression();
			const common = rationalPolynomialGcd(normalizedQ, derivativeQ, variable);

			if (common !== undefined) {
				const [squareFree, squareFreeRest] = divide(normalizedQ, common, undefined, [variable]);
				if (squareFreeRest.isZero()) {
					const factor = common;
					const countN = new Polynomial(factor, [variable]).deg(variable);
					const countS = new Polynomial(squareFree, [variable]).deg(variable);
					const factorPrime = new Polynomial(factor, [variable]).diff(variable).getExpression();

					if (countN + countS === degree) {
						// P*H = S*(A'*H-A*H') + B*H^2, with Q=H*S.
						const columns: Expression[][] = [];
						for (let k = 0; k < countN; k++) {
							const monomial = x.pow(k);
							const derivative = k === 0 ? zero() : Expression.Number(k).times(x.pow(k - 1));
							const basis = squareFree.times(
								factor.times(derivative).minus(factorPrime.times(monomial))
							).expand();
							columns.push(new Polynomial(basis, [variable]).toArray(false, variable));
						}
						for (let k = 0; k < countS; k++) {
							const basis = factor.pow(2).times(x.pow(k)).expand();
							columns.push(new Polynomial(basis, [variable]).toArray(false, variable));
						}

						const targetExpression = normalizedP.times(factor).expand();
						const target = new Polynomial(targetExpression, [variable]).toArray(false, variable);
						const rowCount = Math.max(target.length, ...columns.map(column => column.length));
						const rows: Expression[][] = [];
						for (let k = 0; k < rowCount; k++) {
							rows.push([...columns.map(column => column[k] ?? zero()), target[k] ?? zero()]);
						}
						const solved = solveAugmentedLinearSystem(rows, degree);

						if (solved.type === 'unique') {
							let rationalNumerator = zero();
							let remainderNumerator = zero();
							for (let k = 0; k < countN; k++) {
								rationalNumerator = rationalNumerator.plus(solved.values[k].times(x.pow(k)));
							}
							for (let k = 0; k < countS; k++) {
								remainderNumerator = remainderNumerator.plus(solved.values[countN + k].times(x.pow(k)));
							}

							const identity = targetExpression.minus(
								squareFree.times(
									factor.times(new Polynomial(rationalNumerator, [variable]).diff(variable).getExpression())
										.minus(factorPrime.times(rationalNumerator))
								)
							).minus(factor.pow(2).times(remainderNumerator)).expand();

							if (new Polynomial(identity, [variable]).toArray(false, variable).every(value => value.isZero())) {
								retval = {
									type: 'reduced',
									rationalPart: rationalNumerator.div(factor),
									remainder: remainderNumerator.div(squareFree),
									squareFreeDenominator: squareFree,
									rationalNumerator,
									remainderNumerator,
									repeatedFactor: factor,
								};
							}
						}
					}
				}
			}
		}
	} catch (error) {
		rethrowUnexpected(error);
		// Unsupported polynomial representations must not affect public integration.
	}

	return retval;
}
