import { message, UnsupportedOperationError } from '../../../../errors';
import { toCommonDenominator } from '../../../../functions/rationalNormalization';
import { compareSymbolRelation, resolveAssumption, getSymbolRelations, hasAssumptions } from '../../../assumption/assume';
import { normalizeRelation } from '../../../assumption/symbolRelation';
import { Expression } from '../../../expression/Expression';
import { one, zero } from '../../../expression/shortcuts';
import { canonicalizeRadicals } from '../multiply';
import { subtract } from '../subtract';

import { compareRationalPower } from './rationalPower';

import type { ExpressionInput } from '../../../../types';

export { assume } from '../../../assumption/assume';

type Sign = -1 | 0 | 1;
type PossibleSigns = number;
const NEGATIVE = 1;
const ZERO = 2;
const POSITIVE = 4;
const ANY_SIGN = NEGATIVE | ZERO | POSITIVE;
const INDIVIDUAL_SIGNS = [NEGATIVE, ZERO, POSITIVE] as const;

type ComparisonRelation = 'gt' | 'gte' | 'lt' | 'lte';

export type ComparisonOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
export type ComparisonInference = (a: Expression, b: Expression, operator: ComparisonOperator) => boolean | undefined;
let comparisonInference: ComparisonInference | undefined;

/** Registers an optional comparison extension. */
export function setComparisonInference(inference?: ComparisonInference): void {
	comparisonInference = inference;
}

/** Uses stored symbol relationships before consulting optional inference. */
function inferSymbolRelation(a: Expression, b: Expression, operator: ComparisonOperator): boolean | undefined {
	let result: boolean | undefined;
	if (a.isPlainVariable() && b.isPlainVariable()) {
		const reverse = operator === 'lt' || operator === 'lte';
		result = compareSymbolRelation({
			left: reverse ? b.value : a.value,
			operator: operator === 'eq' ? '=' : operator === 'gt' || operator === 'lt' ? '>' : '>=',
			right: reverse ? a.value : b.value,
		});
	}
	if (result === undefined && comparisonInference && getSymbolRelations().length) {
		const relation = normalizeRelation(a, b,
			operator === 'eq' ? '=' : operator === 'gt' ? '>' : operator === 'gte' ? '>=' :
				operator === 'lt' ? '<' : '<=');
		if (relation) {
			result = compareSymbolRelation(relation);
		}
	}
	if (result === undefined && comparisonInference) {
		result = comparisonInference(a, b, operator);
	}
	return result;
}

type AffineForm = {
	coefficient: Expression;
	constant: Expression;
	symbol: string;
};

function getAffineForm(x: Expression): AffineForm | undefined {
	let retval: AffineForm | undefined = undefined;

	if (!x.isComplex() && x.getPower().isOne()) {
		if (x.isVAR()) {
			if (resolveAssumption(x.value)) {
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
					if (!resolveAssumption(symbol)) {
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
	relation: ComparisonRelation
): boolean | undefined {
	const affine = getAffineForm(x);
	let retval: boolean | undefined = undefined;

	if (affine) {
		const assumption = resolveAssumption(affine.symbol);
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
	relation: ComparisonRelation
): boolean | undefined {
	let retval: boolean | undefined = undefined;
	const aCandidate = a.isSum() || (a.isVAR() && !a.isPlainVariable());
	const bCandidate = b.isSum() || (b.isVAR() && !b.isPlainVariable());

	if (aCandidate && b.isNUM()) {
		retval = compareAffineToValue(a, b, relation);
	} else if (a.isNUM() && bCandidate) {
		let reversedRelation: ComparisonRelation;
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

function getAffineSign(x: Expression): Sign | undefined {
	const affine = getAffineForm(x);
	let retval: Sign | undefined = undefined;

	if (affine) {
		const assumption = resolveAssumption(affine.symbol);
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

type ProvenBound = { value: Expression; strict: boolean };
const MAX_BOUND_DEPTH = 6;
const MAX_BOUND_EXPONENT = 16;

/**
 * A one-sided bound for a monomial with provably positive factors.
 * Unknown or sign-changing factors leave the bound unavailable.
 */
function getMonomialBound(x: Expression, lower: boolean, depth = 0): ProvenBound | undefined {
	let retval: ProvenBound | undefined;
	if (depth <= MAX_BOUND_DEPTH && !x.isComplex()) {
		if (x.isNUM()) {
			retval = { value: x, strict: false };
		} else {
			const multiplier = x.getMultiplier();
			const useLower = multiplier.isNegative() ? !lower : lower;
			const power = x.getPower();
			let baseBound: ProvenBound | undefined;

			if (x.isVAR() && power.isInteger() && !power.isZero() &&
				power.getMultiplier().abs().lte(Expression.Number(MAX_BOUND_EXPONENT).getMultiplier())) {
				const assumption = resolveAssumption(x.value);
				if (assumption) {
					const even = power.isEven();
					const reciprocal = power.getMultiplier().isNegative();
					const negative = assumption.lt(zero()) === true;
					const positive = assumption.gt(zero()) === true;
					if (even && !negative && !positive && useLower && !reciprocal) {
						// A real even positive power is nonnegative even across zero.
						baseBound = { value: zero(), strict: false };
					} else if (!reciprocal || negative || positive) {
						// Negative integer powers require an interval excluding zero.
						const increasing = negative && even ? reciprocal : !reciprocal;
						const useStart = useLower === increasing;
						const endpoint = useStart
							? assumption.getFiniteLowerBound()
							: assumption.getFiniteUpperBound();
						if (endpoint && (!reciprocal || !endpoint.isZero())) {
							baseBound = {
								value: endpoint.pow(power),
								strict: !(useStart ? assumption.start.inclusive : assumption.end.inclusive),
							};
						}
					}
				}
			} else if (x.isVAR() && power.isHalf()) {
				const assumption = resolveAssumption(x.value);
				if (assumption && assumption.gte(zero()) === true) {
					const endpoint = useLower
						? assumption.getFiniteLowerBound()
						: assumption.getFiniteUpperBound();
					if (endpoint && endpoint.gte(zero())) {
						baseBound = {
							value: endpoint.pow(power),
							strict: !(useLower ? assumption.start.inclusive : assumption.end.inclusive),
						};
					}
				}
			} else if (x.isProduct() && power.isOne()) {
				let value = one();
				let strict = false;
				let complete = true;
				for (const factor of x.elementsArray()) {
					if (getPossibleSigns(factor) !== POSITIVE) {
						complete = false;
						break;
					}
					const next = getMonomialBound(factor, useLower, depth + 1);
					if (!next || !next.value.gt(zero())) {
						complete = false;
						break;
					}
					value = value.times(next.value);
					strict = strict || next.strict;
				}
				if (complete) {
					baseBound = { value, strict };
				}
			}
			if (baseBound) {
				retval = {
					value: baseBound.value.times(Expression.fromRational(multiplier)),
					strict: baseBound.strict,
				};
			}
		}
	}
	return retval;
}

/**
 * Proves signs of sums using one-sided bounds for supported monomials.
 * Missing bounds leave the corresponding direction unknown.
 */
function getBoundedSumSign(x: Expression): Sign | undefined {
	let retval: Sign | undefined;
	for (const lower of [true, false]) {
		let bound = zero();
		let strict = false;
		let complete = true;
		for (const term of x.elementsArray()) {
			const endpoint = getMonomialBound(term, lower);
			if (!endpoint) {
				complete = false;
				break;
			}
			bound = bound.plus(endpoint.value);
			strict = strict || endpoint.strict;
		}
		if (complete && bound.isNUM()) {
			if (lower && (bound.getMultiplier().gt('0') || (bound.isZero() && strict))) {
				retval = 1;
			} else if (!lower && (bound.getMultiplier().lt('0') || (bound.isZero() && strict))) {
				retval = -1;
			}
		}
		if (retval !== undefined) {
			break;
		}
	}
	return retval;
}

/**
 * Tracks the possible signs of a real expression. The result is a bit mask,
 * retaining zero whenever a sign cannot be excluded.
 */
function getPossibleSigns(x: Expression): PossibleSigns {
	let retval = ANY_SIGN;

	if (!x.isComplex()) {
		if (x.isNUM()) {
			const sign = x.getMultiplier().sign();
			retval = sign < 0 ? NEGATIVE : sign > 0 ? POSITIVE : ZERO;
		} else {
			const multiplier = x.getMultiplier();
			const exponent = x.getPower();
			let baseSigns = ANY_SIGN;

			if (multiplier.isZero()) {
				retval = ZERO;
			} else {
				if (!exponent.isOne() && exponent.isNUM()) {
					const base = x.toLinearAndUnitMultiplier();
					const signs = getPossibleSigns(base);
					if (exponent.isInteger() && (signs !== ANY_SIGN || resolveAssumption(base))) {
						const reciprocal = exponent.getMultiplier().isNegative();
						if (!reciprocal || !(signs & ZERO)) {
							if (exponent.isEven()) {
								baseSigns = (signs & ZERO && !reciprocal ? ZERO : 0) |
									(signs & (NEGATIVE | POSITIVE) ? POSITIVE : 0);
							} else {
								baseSigns = signs;
							}
						}
					} else if (exponent.isHalf() && !(signs & NEGATIVE)) {
						baseSigns = signs;
					}
				} else if (x.isSum()) {
					baseSigns = ZERO;
					for (const element of x.elementsArray()) {
						const signs = getPossibleSigns(element);
						let combined = 0;
						for (const first of INDIVIDUAL_SIGNS) {
							for (const second of INDIVIDUAL_SIGNS) {
								if ((baseSigns & first) && (signs & second)) {
									combined |= first === ZERO ? second :
										second === ZERO ? first :
											first === second ? first : ANY_SIGN;
								}
							}
						}
						baseSigns = combined;
						if (baseSigns === ANY_SIGN) {
							break;
						}
					}
					if (hasAssumptions()) {
						const bounded = getBoundedSumSign(x);
						const affine = bounded === undefined ? getAffineSign(x) : undefined;
						const exact = bounded === undefined ? affine : bounded;
						if (exact !== undefined) {
							baseSigns &= exact < 0 ? NEGATIVE : exact > 0 ? POSITIVE : ZERO;
						}
					}
				} else if (x.isProduct()) {
					baseSigns = POSITIVE;
					for (const element of x.elementsArray()) {
						const signs = getPossibleSigns(element);
						let combined = 0;
						for (const first of INDIVIDUAL_SIGNS) {
							for (const second of INDIVIDUAL_SIGNS) {
								if ((baseSigns & first) && (signs & second)) {
									combined |= first === ZERO || second === ZERO ? ZERO :
										first === second ? POSITIVE : NEGATIVE;
								}
							}
						}
						baseSigns = combined;
					}
				}

				if (exponent.isOne()) {
					const assumption = resolveAssumption(x.toLinearAndUnitMultiplier());
					if (assumption) {
						if (assumption.gt(zero()) === true) {
							baseSigns &= POSITIVE;
						} else if (assumption.lt(zero()) === true) {
							baseSigns &= NEGATIVE;
						} else if (assumption.eq(zero()) === true) {
							baseSigns &= ZERO;
						} else if (assumption.gte(zero()) === true) {
							baseSigns &= ZERO | POSITIVE;
						} else if (assumption.lte(zero()) === true) {
							baseSigns &= NEGATIVE | ZERO;
						}
					}
				}
				retval = multiplier.isNegative()
					? (baseSigns & NEGATIVE ? POSITIVE : 0) |
					(baseSigns & ZERO ? ZERO : 0) |
					(baseSigns & POSITIVE ? NEGATIVE : 0)
					: baseSigns;
			}
		}
	}

	return retval || ANY_SIGN;
}

/**
 * Tests a relation against every sign that is still possible.
 * An unresolved relation remains undefined instead of becoming false.
 */
export function proveZeroRelation(
	x: ExpressionInput,
	relation: 'gt' | 'gte' | 'lt' | 'lte' | 'eq'
): true | false | undefined {
	const signs = getPossibleSigns(Expression.create(x));
	let matching = 0;

	switch (relation) {
		case 'gt':
			matching = POSITIVE;
			break;
		case 'gte':
			matching = ZERO | POSITIVE;
			break;
		case 'lt':
			matching = NEGATIVE;
			break;
		case 'lte':
			matching = NEGATIVE | ZERO;
			break;
		case 'eq':
			matching = ZERO;
			break;
	}

	let retval: true | false | undefined;
	if ((signs & matching) === signs) {
		retval = true;
	} else if (!(signs & matching)) {
		retval = false;
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
	let retval: boolean;

	if (a.isComplex() && b.isComplex()) {
		const realA = a.realPart();
		const imaginaryA = a.imagPart();
		const realB = b.realPart();
		const imaginaryB = b.imagPart();

		if (
			realA.isNUM() &&
			imaginaryA.isNUM() &&
			realB.isNUM() &&
			imaginaryB.isNUM()
		) {
			return (
				realA.getMultiplier().eq(realB.getMultiplier()) &&
				imaginaryA.getMultiplier().eq(imaginaryB.getMultiplier())
			);
		}
	}

	// An assumption describes the admissible values of a variable; it does not erase
	// the identity of the variable itself. x == x remains true even when x ranges over
	// more than one value.
	if (sameVariable) {
		retval = true;
	} else {
		const assumptionResult = compareAssumptions(a, b, 'eq');

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
			retval = (result.isNUM() && result.getMultiplier().eq('0')) ||
				compareRationalPower(a, b) === 0;
		}
	}

	return retval;
}

/**
 * Checks affine and sign inference after relationships and assumptions were checked.
 * Strict comparisons test the sign first; non-strict comparisons check affine bounds first.
 */
function inferComparison(
	a: Expression,
	b: Expression,
	relation: ComparisonRelation
): boolean | undefined {
	const aIsZero = a.isZero();
	const bIsZero = b.isZero();
	const strict = relation === 'gt' || relation === 'lt';
	let retval: boolean | undefined;

	if (!strict && hasAssumptions()) {
		retval = compareAffineExpressions(a, b, relation);
	}

	if (retval === undefined) {
		if (bIsZero) {
			retval = proveZeroRelation(a, relation);
		} else if (aIsZero) {
			const reversedRelation = relation === 'gt' ? 'lt'
				: relation === 'gte' ? 'lte'
					: relation === 'lt' ? 'gt' : 'gte';
			retval = proveZeroRelation(b, reversedRelation);
		}
	}

	if (retval === undefined && strict && hasAssumptions() && !aIsZero && !bIsZero) {
		retval = compareAffineExpressions(a, b, relation);
	}

	return retval;
}

/** Numerical evaluation can suggest strict ordering but cannot establish equality. */
function compareNumeric(a: Expression, b: Expression): Sign | undefined {
	const exact = compareRationalPower(a, b);
	let result: Sign | undefined;
	if (exact !== 'unresolved') {
		if (exact !== undefined) {
			result = exact;
		} else {
			const difference = subtract(a.evaluate(), b.evaluate()).expand();
			if (difference.isNUM()) {
				const sign = difference.getMultiplier().sign();
				if (sign !== 0) {
					result = sign < 0 ? -1 : 1;
				}
			}
		}
	}
	return result;
}

/** Checks known relationships and interval assumptions for ordered comparisons. */
function compareAssumptions(
	a: Expression,
	b: Expression,
	relation: ComparisonOperator
): boolean | undefined {
	let result = inferSymbolRelation(a, b, relation);
	if (result === undefined) {
		const x = resolveAssumption(a);
		const y = resolveAssumption(b);
		if (x && y) {
			switch (relation) {
				case 'eq': result = x.eq(y); break;
				case 'gt': result = x.gt(y); break;
				case 'gte': result = x.gte(y); break;
				case 'lt': result = x.lt(y); break;
				case 'lte': result = x.lte(y); break;
			}
		} else if (x) {
			switch (relation) {
				case 'eq': result = x.eq(b); break;
				case 'gt': result = x.gt(b); break;
				case 'gte': result = x.gte(b); break;
				case 'lt': result = x.lt(b); break;
				case 'lte': result = x.lte(b); break;
			}
		} else if (y) {
			switch (relation) {
				case 'eq': result = y.eq(a); break;
				case 'gt': result = y.lt(a); break;
				case 'gte': result = y.lte(a); break;
				case 'lt': result = y.gt(a); break;
				case 'lte': result = y.gte(a); break;
			}
		}
	}
	return result;
}

/** Routes ordered comparisons through assumptions, inference, and numeric ordering. */
function compareOrdered(
	a: ExpressionInput,
	b: ExpressionInput,
	relation: 'gt' | 'gte' | 'lt' | 'lte'
): boolean {
	const left = Expression.create(a);
	const right = Expression.create(b);
	if (left.isComplex() || right.isComplex()) {
		throw new UnsupportedOperationError(message('unsupportedOperation'));
	}

	const strict = relation === 'gt' || relation === 'lt';
	const sameVariable = left.isPlainVariable() && right.isPlainVariable()
		&& left.value === right.value;
	let retval: boolean;

	if (!strict && sameVariable) {
		retval = true;
	} else {
		const assumed = compareAssumptions(left, right, relation);
		if (assumed !== undefined) {
			retval = assumed;
		} else {
			const inferred = inferComparison(left, right, relation);
			if (inferred !== undefined) {
				retval = inferred;
			} else if (strict) {
				const numeric = compareNumeric(left, right);
				retval = relation === 'gt' ? numeric === 1 : numeric === -1;
			} else {
				retval = relation === 'gte'
					? gt(left, right) || equal(left, right)
					: lt(left, right) || equal(left, right);
			}
		}
	}

	return retval;
}

/** Checks whether Nerdamer can establish that `a` is strictly greater than `b`. */
export function gt(a: ExpressionInput, b: ExpressionInput): boolean {
	return compareOrdered(a, b, 'gt');
}

/** Checks whether Nerdamer can establish that `a` is greater than or equal to `b`. */
export function gte(a: ExpressionInput, b: ExpressionInput): boolean {
	return compareOrdered(a, b, 'gte');
}

/** Checks whether Nerdamer can establish that `a` is strictly less than `b`. */
export function lt(a: ExpressionInput, b: ExpressionInput): boolean {
	return compareOrdered(a, b, 'lt');
}

/** Checks whether Nerdamer can establish that `a` is less than or equal to `b`. */
export function lte(a: ExpressionInput, b: ExpressionInput): boolean {
	return compareOrdered(a, b, 'lte');
}
