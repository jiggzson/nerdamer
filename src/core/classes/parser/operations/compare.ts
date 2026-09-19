import { message, UnsupportedOperationError } from '../../../errors';
import { toCommonDenominator } from '../../../functions/rationalNormalization';
import { getAssumptionFor, hasAssumptions } from '../../assumption/assume';
import { Expression } from '../../expression/Expression';

import { canonicalizeRadicals } from './multiply';
import { subtract } from './subtract';

import type { ExpressionInput } from '../../../types';

export { assume } from '../../assumption/assume';

type ProvenSign = -1 | 0 | 1;
type AffineRelation = 'gt' | 'gte' | 'lt' | 'lte';

type AffineForm = {
	coefficient: Expression;
	constant: Expression;
	symbol: string;
};

function getAffineForm(x: Expression): AffineForm | undefined {
	let retval: AffineForm | undefined = undefined;

	if (!x.isComplex() && x.getPower().isOne()) {
		if (x.isVAR()) {
			if (getAssumptionFor(x.value)) {
				retval = {
					coefficient: Expression.fromRational(x.getMultiplier()),
					constant: Expression.Number(0),
					symbol: x.value,
				};
			}
		} else if (x.isSum()) {
			const terms = x.elementsArray();
			let symbol: string | undefined = undefined;
			let valid = true;

			for (const term of terms) {
				if (term.isNUM()) {
					continue;
				}
				if (!term.isVAR() || !term.getPower().isOne()) {
					valid = false;
					break;
				}
				if (symbol === undefined) {
					symbol = term.value;
					if (!getAssumptionFor(symbol)) {
						valid = false;
						break;
					}
				} else if (symbol !== term.value) {
					valid = false;
					break;
				}
			}

			if (valid && symbol !== undefined) {
				let coefficient = Expression.Number(0);
				let constant = Expression.Number(0);

				for (const term of terms) {
					if (term.isNUM()) {
						constant = constant.plus(term);
					} else {
						coefficient = coefficient.plus(
							Expression.fromRational(term.getMultiplier())
						);
					}
				}

				if (!coefficient.isZero()) {
					retval = { coefficient, constant, symbol };
				}
			}
		}
	}

	return retval;
}

function compareAffineToValue(
	x: Expression,
	value: Expression,
	relation: AffineRelation
): boolean | undefined {
	const affine = getAffineForm(x);
	let retval: boolean | undefined = undefined;

	if (affine) {
		const assumption = getAssumptionFor(affine.symbol);
		if (assumption) {
			const bound = value.minus(affine.constant).div(affine.coefficient);
			let resolvedRelation = relation;

			if (affine.coefficient.getMultiplier().isNegative()) {
				if (relation === 'gt') {
					resolvedRelation = 'lt';
				} else if (relation === 'gte') {
					resolvedRelation = 'lte';
				} else if (relation === 'lt') {
					resolvedRelation = 'gt';
				} else {
					resolvedRelation = 'gte';
				}
			}

			retval = assumption[resolvedRelation](bound);
		}
	}

	return retval;
}

function compareAffineExpressions(
	a: Expression,
	b: Expression,
	relation: AffineRelation
): boolean | undefined {
	let retval: boolean | undefined = undefined;
	const aCandidate = a.isSum() || (a.isVAR() && !a.isPlainVariable());
	const bCandidate = b.isSum() || (b.isVAR() && !b.isPlainVariable());

	if (aCandidate && b.isNUM()) {
		retval = compareAffineToValue(a, b, relation);
	} else if (a.isNUM() && bCandidate) {
		let reversedRelation: AffineRelation;
		if (relation === 'gt') {
			reversedRelation = 'lt';
		} else if (relation === 'gte') {
			reversedRelation = 'lte';
		} else if (relation === 'lt') {
			reversedRelation = 'gt';
		} else {
			reversedRelation = 'gte';
		}
		retval = compareAffineToValue(b, a, reversedRelation);
	}

	return retval;
}

function getAffineSign(x: Expression): ProvenSign | undefined {
	const affine = getAffineForm(x);
	let retval: ProvenSign | undefined = undefined;

	if (affine) {
		const assumption = getAssumptionFor(affine.symbol);
		if (assumption) {
			const bound = affine.constant.neg().div(affine.coefficient);
			const coefficientIsNegative = affine.coefficient.getMultiplier().isNegative();
			const positive = coefficientIsNegative ? assumption.lt(bound) : assumption.gt(bound);
			const negative = coefficientIsNegative ? assumption.gt(bound) : assumption.lt(bound);

			if (positive === true) {
				retval = 1;
			} else if (negative === true) {
				retval = -1;
			} else if (assumption.eq(bound) === true) {
				retval = 0;
			}
		}
	}

	return retval;
}

/**
 * Returns a sign only when it can be proved from numeric values, assumptions, or
 * simple multiplicative structure. Unknown symbolic signs stay unknown.
 */
function getProvenSign(x: Expression): ProvenSign | undefined {
	let retval: ProvenSign | undefined = undefined;

	if (!x.isComplex()) {
		if (x.isNUM()) {
			retval = x.getMultiplier().sign() as ProvenSign;
		} else {
			const multiplierSign = x.getMultiplier().sign() as ProvenSign;
			const exponent = x.getPower();

			if (multiplierSign === 0) {
				retval = 0;
			} else if (!exponent.isOne() && exponent.isNUM()) {
				// Powers are stored directly on many node types, not only EXP nodes.
				// Use the common base-extraction API so x^-1, (x*y)^2, and explicit
				// EXP nodes all follow the same sign reasoning.
				const base = x.toLinearAndUnitMultiplier();
				const baseSign = getProvenSign(base);
				let poweredSign: ProvenSign | undefined = undefined;

				if (baseSign === 1) {
					poweredSign = 1;
				} else if (baseSign === -1 && exponent.isInteger()) {
					poweredSign = exponent.isEven() ? 1 : -1;
				} else if (baseSign === 0 && exponent.getMultiplier().gt('0')) {
					poweredSign = 0;
				}

				if (poweredSign !== undefined) {
					retval = (multiplierSign * poweredSign) as ProvenSign;
				}
			} else if (x.isProduct()) {
				let productSign = multiplierSign;
				let allKnown = true;

				for (const element of x.elementsArray()) {
					const elementSign = getProvenSign(element);
					if (elementSign === undefined) {
						allKnown = false;
						break;
					}
					productSign *= elementSign;
					if (productSign === 0) {
						break;
					}
				}

				if (allKnown) {
					retval = productSign as ProvenSign;
				}
			}

			if (retval === undefined && exponent.isOne()) {
				const base = x.toLinearAndUnitMultiplier();
				const assumption = getAssumptionFor(base);

				if (assumption) {
					const zero = Expression.Number(0);
					let assumedSign: ProvenSign | undefined = undefined;

					if (assumption.gt(zero) === true) {
						assumedSign = 1;
					} else if (assumption.lt(zero) === true) {
						assumedSign = -1;
					} else if (assumption.eq(zero) === true) {
						assumedSign = 0;
					}

					if (assumedSign !== undefined) {
						retval = (multiplierSign * assumedSign) as ProvenSign;
					}
				} else if (x.isSum() && hasAssumptions()) {
					retval = getAffineSign(x);
				}
			}
		}
	}

	return retval;
}

/**
 * Checks whether Nerdamer can establish that `a` and `b` are equal.
 *
 * @remarks
 * The public expression comparison remains boolean for compatibility. Assumptions
 * supply a result when they can prove or disprove the relation; an unknown assumption
 * result falls through to the ordinary symbolic comparison. If neither path can prove
 * equality, this function returns `false`. Use the corresponding `Assumption` relation
 * directly when a caller needs to distinguish a disproved relation from an unknown one.
 */
export function equal(a: ExpressionInput, b: ExpressionInput): boolean {
	a = Expression.create(a);
	b = Expression.create(b);

	const sameVariable =
		a.isPlainVariable() && b.isPlainVariable() && a.value === b.value;
	const x = getAssumptionFor(a);
	const y = getAssumptionFor(b);
	let assumptionResult: boolean | undefined = undefined;
	let retval: boolean;

	// An assumption describes the admissible values of a variable; it does not erase
	// the identity of the variable itself. x == x remains true even when x ranges over
	// more than one value.
	if (sameVariable) {
		retval = true;
	} else {
		if (x && y) {
			assumptionResult = x.eq(y);
		} else if (x) {
			assumptionResult = x.eq(b);
		} else if (y) {
			assumptionResult = y.eq(a);
		}

		if (assumptionResult !== undefined) {
			retval = assumptionResult;
		} else {
			let result: Expression;
			// Try the cheap comparison first. If they're NUM just extract the difference.
			if (a.isNUM() && b.isNUM()) {
				result = subtract(a, b);
			} else {
				// Canonicalize numeric radicals so equivalent exact forms compare consistently.
				a = canonicalizeRadicals(a);
				b = canonicalizeRadicals(b);
				result = toCommonDenominator(subtract(a, b).expand()).expand();
			}
			retval = result.isNUM() && result.getMultiplier().eq('0');
		}
	}

	return retval;
}

/** Checks whether Nerdamer can establish that `a` is strictly greater than `b`. */
export function gt(a: ExpressionInput, b: ExpressionInput): boolean {
	a = Expression.create(a);
	b = Expression.create(b);
	if (a.isComplex() || b.isComplex()) {
		throw new UnsupportedOperationError(message('unsupportedOperation'));
	}

	const x = getAssumptionFor(a);
	const y = getAssumptionFor(b);
	let assumptionResult: boolean | undefined = undefined;
	let retval: boolean;

	if (x && y) {
		assumptionResult = x.gt(y);
	} else if (x) {
		assumptionResult = x.gt(b);
	} else if (y) {
		assumptionResult = y.lt(a);
	}

	if (assumptionResult !== undefined) {
		retval = assumptionResult;
	} else {
		let sign: ProvenSign | undefined = undefined;
		if (b.isZero()) {
			sign = getProvenSign(a);
		} else if (a.isZero()) {
			const rightSign = getProvenSign(b);
			if (rightSign !== undefined) {
				sign = -rightSign as ProvenSign;
			}
		}

		if (sign !== undefined) {
			retval = sign > 0;
		} else {
			const affineResult =
				hasAssumptions() && !(a.isZero() || b.isZero())
					? compareAffineExpressions(a, b, 'gt')
					: undefined;
			if (affineResult !== undefined) {
				retval = affineResult;
			} else {
				// E.g. 9 > 6 is decided from the sign of 9 - 6.
				const result = subtract(a.evaluate(), b.evaluate()).expand();
				retval = result.isNUM() && result.getMultiplier().gt('0');
			}
		}
	}

	return retval;
}

/** Checks whether Nerdamer can establish that `a` is greater than or equal to `b`. */
export function gte(a: ExpressionInput, b: ExpressionInput): boolean {
	a = Expression.create(a);
	b = Expression.create(b);
	if (a.isComplex() || b.isComplex()) {
		throw new UnsupportedOperationError(message('unsupportedOperation'));
	}

	const sameVariable =
		a.isPlainVariable() && b.isPlainVariable() && a.value === b.value;
	const x = getAssumptionFor(a);
	const y = getAssumptionFor(b);
	let assumptionResult: boolean | undefined = undefined;
	let retval: boolean;

	if (sameVariable) {
		retval = true;
	} else {
		if (x && y) {
			assumptionResult = x.gte(y);
		} else if (x) {
			assumptionResult = x.gte(b);
		} else if (y) {
			assumptionResult = y.lte(a);
		}

		if (assumptionResult !== undefined) {
			retval = assumptionResult;
		} else {
			const affineResult = hasAssumptions()
				? compareAffineExpressions(a, b, 'gte')
				: undefined;
			retval = affineResult === undefined ? gt(a, b) || equal(a, b) : affineResult;
		}
	}

	return retval;
}

/** Checks whether Nerdamer can establish that `a` is strictly less than `b`. */
export function lt(a: ExpressionInput, b: ExpressionInput): boolean {
	a = Expression.create(a);
	b = Expression.create(b);
	if (a.isComplex() || b.isComplex()) {
		throw new UnsupportedOperationError(message('unsupportedOperation'));
	}

	const x = getAssumptionFor(a);
	const y = getAssumptionFor(b);
	let assumptionResult: boolean | undefined = undefined;
	let retval: boolean;

	if (x && y) {
		assumptionResult = x.lt(y);
	} else if (x) {
		assumptionResult = x.lt(b);
	} else if (y) {
		assumptionResult = y.gt(a);
	}

	if (assumptionResult !== undefined) {
		retval = assumptionResult;
	} else {
		let sign: ProvenSign | undefined = undefined;
		if (b.isZero()) {
			sign = getProvenSign(a);
		} else if (a.isZero()) {
			const rightSign = getProvenSign(b);
			if (rightSign !== undefined) {
				sign = -rightSign as ProvenSign;
			}
		}

		if (sign !== undefined) {
			retval = sign < 0;
		} else {
			const affineResult =
				hasAssumptions() && !(a.isZero() || b.isZero())
					? compareAffineExpressions(a, b, 'lt')
					: undefined;
			if (affineResult !== undefined) {
				retval = affineResult;
			} else {
				// E.g. 6 < 9 is decided from the sign of 6 - 9.
				const result = subtract(a.evaluate(), b.evaluate()).expand();
				retval = result.isNUM() && result.getMultiplier().lt('0');
			}
		}
	}

	return retval;
}

/** Checks whether Nerdamer can establish that `a` is less than or equal to `b`. */
export function lte(a: ExpressionInput, b: ExpressionInput): boolean {
	a = Expression.create(a);
	b = Expression.create(b);
	if (a.isComplex() || b.isComplex()) {
		throw new UnsupportedOperationError(message('unsupportedOperation'));
	}

	const sameVariable =
		a.isPlainVariable() && b.isPlainVariable() && a.value === b.value;
	const x = getAssumptionFor(a);
	const y = getAssumptionFor(b);
	let assumptionResult: boolean | undefined = undefined;
	let retval: boolean;

	if (sameVariable) {
		retval = true;
	} else {
		if (x && y) {
			assumptionResult = x.lte(y);
		} else if (x) {
			assumptionResult = x.lte(b);
		} else if (y) {
			assumptionResult = y.gte(a);
		}

		if (assumptionResult !== undefined) {
			retval = assumptionResult;
		} else {
			const affineResult = hasAssumptions()
				? compareAffineExpressions(a, b, 'lte')
				: undefined;
			retval = affineResult === undefined ? lt(a, b) || equal(a, b) : affineResult;
		}
	}

	return retval;
}