import Decimal from 'decimal.js';

import { isNerdamerNativeType } from '../../common/common';
import { ASSUMPTION } from '../../constants/entityTypes';
import { message, UnexpectedInputError } from '../../errors';
import { Expression } from '../expression/Expression';
import { compareRationalPower } from '../parser/operations/compare/rationalPower';
import { Token } from '../parser/Token';
import { Rational } from '../rational/Rational';

import { parseRelation } from './parseRelation';

/**
 * One endpoint of an {@link Assumption} interval.
 *
 * Infinity is always represented as an open endpoint because it is not itself a
 * member of a real interval. `value` remains Decimal-facing for API compatibility;
 * finite bounds retain exact rational or real-power expressions internally.
 * Its Decimal value may be rounded; use the interval methods for proofs.
 */
export type Bound = Readonly<{ value: Decimal; inclusive: boolean }>;

/** Result returned by {@link Assumption.parse}. */
export type ParsedAssumption = Readonly<{ symbol: string; assumption: Assumption }>;

/** Exact real expressions are accepted as finite interval endpoints. */
export type AssumptionValue = Decimal | Rational | Expression | string | number;

/**
 * Result of a comparison involving an interval-constrained value.
 *
 * `true` means the relation holds for every value allowed by the assumption.
 * `false` means the opposite relation holds for every allowed value. `undefined`
 * means both outcomes remain possible, so the relation cannot be proved from the
 * available interval information.
 */
export type AssumptionComparison = true | false | undefined;

type NumericComparison = -1 | 0 | 1;
type ExactBound = Rational | Expression | undefined;
type NormalizedAssumptionValue = Readonly<{
	value: Decimal;
	exact: ExactBound;
}>;

function normalizeAssumptionValue(value: AssumptionValue): NormalizedAssumptionValue {
	let decimal: Decimal;
	let exact: ExactBound;

	if (Rational.isRational(value)) {
		exact = value.copy();
		decimal = exact.toDecimal();
	} else if (Expression.isExpression(value)) {
		if (value.isNUM()) {
			exact = value.getMultiplier().copy();
			decimal = exact.toDecimal();
		} else {
			// Only proven real constants may define exact symbolic interval endpoints.
			const sign = compareRationalPower(value, Expression.Number(0));
			const evaluated = sign === undefined || sign === 'unresolved' || value.isComplex()
				? undefined : value.evaluate();
			if (!evaluated?.isNUM()) {
				throw new UnexpectedInputError(message('wrongInput', {
					expected: 'an exact real constant', received: value.text(),
				}));
			}
			exact = value.copy();
			decimal = evaluated.getMultiplier().toDecimal();
		}
	} else {
		decimal = typeof value === 'number' || typeof value === 'string' ? new Decimal(value) : value;
		if (decimal.isFinite()) {
			exact = Rational.create(decimal.toString());
		}
	}

	return { value: decimal, exact };
}

/**
 * Compare exact endpoints. Decimal values are display projections, never proofs
 * when either endpoint has a symbolic representation.
 */
function compareBoundValues(
	a: Decimal, aExact: ExactBound, b: Decimal, bExact: ExactBound
): NumericComparison | undefined {
	let result: NumericComparison | undefined;
	if (a.isFinite() && b.isFinite()) {
		const left = aExact ?? Rational.create(a.toString());
		const right = bExact ?? Rational.create(b.toString());
		if (Rational.isRational(left) && Rational.isRational(right)) {
			result = left.lt(right) ? -1 : left.gt(right) ? 1 : 0;
		} else {
			const ordered = compareRationalPower(
				Rational.isRational(left) ? Expression.fromRational(left) : left,
				Rational.isRational(right) ? Expression.fromRational(right) : right
			);
			result = ordered === 'unresolved' ? undefined : ordered;
		}
	} else if (a.eq(b)) {
		result = 0;
	} else if (!a.isNaN() && !b.isNaN()) {
		result = a.lt(b) ? -1 : 1;
	}
	return result;
}

function parseNumber(value: string) {
	const v = String(value).toLowerCase();
	if (v === 'inf' || v === 'infinity' || v === '+inf' || v === '+infinity') {
		return new Decimal(Infinity);
	}
	if (v === '-inf' || v === '-infinity') {
		return new Decimal(-Infinity);
	}

	const n = new Decimal(v);
	if (n.isNaN()) {
		throw new Error(message('invalidDecimal', { value: String(value) }));
	}
	return n;
}

/** Compare an expression to an exact endpoint without rounded sign decisions. */
function compareToBound(
	x: Expression, bound: Decimal, boundExact: ExactBound
): NumericComparison | undefined {
	let result: NumericComparison | undefined;
	if (x.isNegInf()) {
		result = bound.eq(-Infinity) ? 0 : -1;
	} else if (x.isPosInf()) {
		result = bound.eq(Infinity) ? 0 : 1;
	} else if (!bound.isFinite()) {
		result = bound.lt(0) ? 1 : -1;
	} else {
		const exact = boundExact ?? Rational.create(bound.toString());
		if (x.isNUM() && Rational.isRational(exact)) {
			const value = x.getMultiplier();
			result = value.lt(exact) ? -1 : value.gt(exact) ? 1 : 0;
		} else {
			const ordered = compareRationalPower(
				x, Rational.isRational(exact) ? Expression.fromRational(exact) : exact
			);
			result = ordered === 'unresolved' ? undefined : ordered;
		}
	}
	return result;
}

/**
 * Describes admissible real values as one exact interval.
 *
 * @remarks
 * An `Assumption` is an interval constraint, not a symbolic theorem. It can prove
 * relations when the interval bounds force an answer, disprove them when the bounds
 * force the opposite answer, and otherwise reports an unknown result as `undefined`.
 * Two variables having the same admissible interval therefore does not prove that the
 * variables are equal.
 *
 * Instances are immutable. Repeated assumptions for a variable are intersected by
 * the global assumption registry rather than modifying an existing interval.
 *
 * Finite bounds preserve exact rational values or supported real algebraic expressions.
 * Decimal projections of algebraic endpoints are for compatibility and display only.
 *
 * Each instance describes one real interval with exactly comparable endpoints.
 * Integer, parity, complex-domain, relational (`x > y`), union, and general predicate
 * assumptions are not represented by this class.
 */
export class Assumption {
	private readonly endExact: ExactBound;
	private readonly startExact: ExactBound;

	/** Runtime tag used by Nerdamer's assumption type guard. */
	readonly dataType: typeof ASSUMPTION = ASSUMPTION;

	/** Upper endpoint of the admissible interval. */
	readonly end: Bound;

	/** Whether the interval contains exactly one finite value. */
	readonly isSingleton: boolean;
	/** Lower endpoint of the admissible interval. */
	readonly start: Bound;

	/**
	 * Creates a non-empty real interval.
	 *
	 * @remarks
	 * Infinite endpoints are normalized to open bounds. A zero-width interval is valid
	 * only when both endpoints are inclusive, in which case it represents one exact
	 * value. Comparisons use exact endpoints, not their Decimal projections.
	 *
	 * @param start - Lower endpoint.
	 * @param end - Upper endpoint.
	 * @param startInclusive - Include the lower endpoint when it is finite.
	 * @param endInclusive - Include the upper endpoint when it is finite.
	 * @throws Error
	 * Thrown when a bound is `NaN`, the bounds are reversed, or the interval is empty.
	 */
	constructor(
		start: AssumptionValue,
		end: AssumptionValue,
		startInclusive = true,
		endInclusive = true
	) {
		const normalizedStart = normalizeAssumptionValue(start);
		const normalizedEnd = normalizeAssumptionValue(end);
		const startValue = normalizedStart.value;
		const endValue = normalizedEnd.value;
		const normalizedStartInclusive = startValue.isFinite() && !!startInclusive;
		const normalizedEndInclusive = endValue.isFinite() && !!endInclusive;
		const boundComparison =
			startValue.isNaN() || endValue.isNaN()
				? undefined
				: compareBoundValues(
						startValue,
						normalizedStart.exact,
						endValue,
						normalizedEnd.exact
					);

		// NaN cannot define an ordered interval, and equal endpoints describe a value
		// only when that point belongs to both sides.
		if (
			boundComparison === undefined ||
			boundComparison > 0 ||
			(boundComparison === 0 && !(normalizedStartInclusive && normalizedEndInclusive))
		) {
			throw new Error(
				message('invalidInterval', {
					start: startValue.toString(),
					end: endValue.toString(),
				})
			);
		}

		this.start = Object.freeze({
			value: startValue,
			inclusive: normalizedStartInclusive,
		});
		this.end = Object.freeze({
			value: endValue,
			inclusive: normalizedEndInclusive,
		});
		this.startExact = normalizedStart.exact;
		this.endExact = normalizedEnd.exact;
		this.isSingleton =
			boundComparison === 0 && this.start.inclusive && this.end.inclusive;

		Object.freeze(this);
	}

	/**
	 * Creates an interval extending upward from `x`.
	 *
	 * @param x - Lower endpoint.
	 * @param inclusive - Whether a finite lower endpoint belongs to the interval.
	 * @returns The interval `[x, +∞)` when inclusive, otherwise `(x, +∞)`.
	 */
	static atLeast(x: AssumptionValue, inclusive = true): Assumption {
		return new Assumption(x, Infinity, !!inclusive, false);
	}

	/**
	 * Creates an interval extending downward from `x`.
	 *
	 * @param x - Upper endpoint.
	 * @param inclusive - Whether a finite upper endpoint belongs to the interval.
	 * @returns The interval `(-∞, x]` when inclusive, otherwise `(-∞, x)`.
	 */
	static atMost(x: AssumptionValue, inclusive = true): Assumption {
		return new Assumption(-Infinity, x, false, !!inclusive);
	}

	/**
	 * Creates the singleton interval containing exactly `x`.
	 *
	 * @param x - The one admissible value.
	 * @returns The closed singleton interval `[x, x]`.
	 */
	static exactly(x: AssumptionValue): Assumption {
		return new Assumption(x, x, true, true);
	}

	static isAssumption(obj: unknown): obj is Assumption {
		return isNerdamerNativeType(obj, ASSUMPTION);
	}

	/**
	 * Parses one numeric interval constraint such as `x >= 0` or `n < 10`.
	 *
	 * @remarks
	 * The shared parser reads the relationship without evaluating its operands.
	 * Whitespace is ignored. Variable names use the ASCII identifier form
	 * `[A-Za-z_][A-Za-z0-9_]*`. Supported operators are `=`, `==`, `>`, `>=`, `<`,
	 * and `<=`. Bounds are Decimal-compatible numeric literals; `inf`, `infinity`,
	 * `+inf`, `+infinity`, `-inf`, and `-infinity` are also accepted.
	 *
	 * Expressions such as `x > y` and property predicates such as
	 * `integer(x)` are outside the string assumption grammar. Simple numeric
	 * fractions such as `x = 1/2` retain exact rational endpoints. Integer
	 * powers are supported; fractional exponents are rejected. Parser assertive calls may
	 * still provide already-evaluated Rational bounds directly.
	 *
	 * @param expr - Constraint to parse.
	 * @returns The parsed symbol and its interval assumption.
	 * @throws UnexpectedInputError
	 * Thrown when the constraint has an invalid identifier, operator, or numeric bound.
	 */
	static parse(expr: string): ParsedAssumption {
		if (typeof expr !== 'string' || !expr.trim()) {
			throw new UnexpectedInputError(message('invalidAssumption', { input: String(expr) }));
		}

		const relation = parseRelation(expr);
		if (!relation) {
			throw new UnexpectedInputError(message('invalidAssumption', { input: expr }));
		}

		// Direct string assumptions require a plain variable and a numeric bound.
		const variable = relation.left.length === 1 ? relation.left[0] : undefined;
		if (!variable || variable.type !== Token.VARIABLE ||
			!/^[A-Za-z_][A-Za-z0-9_]*$/.test(variable.value)) {
			throw new UnexpectedInputError(message('assumptionIdentifierExpected'));
		}

		const bound = relation.right;
		const signed = bound.length === 2 && bound[1].type === Token.PREFIX &&
			(bound[1].value === '-' || bound[1].value === '+');
		const literal = bound.length === 1 || signed ? bound[0] : undefined;
		let value: AssumptionValue;

		if (literal && literal.type === Token.VARIABLE &&
			/^(?:inf|infinity)$/i.test(literal.value)) {
			value = parseNumber((signed ? bound[1].value : '') + literal.value);
		} else {
			// Evaluate numeric RPN once with exact Rational arithmetic.
			const stack: Rational[] = [];
			let valid = true;
			for (const token of bound) {
				if (token.type === Token.NUMBER) {
					stack.push(Rational.create(token.value));
				} else if (token.type === Token.PREFIX && (token.value === '+' || token.value === '-')) {
					const operand = stack.pop();
					if (!operand) {
						valid = false;
						break;
					}
					stack.push(token.value === '-' ? operand.neg() : operand);
				} else if (token.type === Token.OPERATOR && ['+', '-', '*', '/', '^'].includes(token.value)) {
					const right = stack.pop();
					const left = stack.pop();
					if (!left || !right || (token.value === '^' && !right.isInteger())) {
						valid = false;
						break;
					}
					let result: Rational;
					switch (token.value) {
						case '+': result = left.plus(right); break;
						case '-': result = left.minus(right); break;
						case '*': result = left.times(right); break;
						case '/': result = left.times(right.invert()); break;
						default: result = left.pow(right); break;
					}
					stack.push(result);
				} else {
					valid = false;
					break;
				}
			}
			if (!valid || stack.length !== 1) {
				throw new UnexpectedInputError(message('invalidAssumption', { input: expr }));
			}
			value = stack[0];
		}

		let retval: ParsedAssumption;

		switch (relation.operator) {
			case '>':
				retval = { symbol: variable.value, assumption: Assumption.atLeast(value, false) };
				break;
			case '>=':
				retval = { symbol: variable.value, assumption: Assumption.atLeast(value, true) };
				break;
			case '<':
				retval = { symbol: variable.value, assumption: Assumption.atMost(value, false) };
				break;
			case '<=':
				retval = { symbol: variable.value, assumption: Assumption.atMost(value, true) };
				break;
			case '=':
			case '==':
				retval = { symbol: variable.value, assumption: Assumption.exactly(value) };
				break;
		}
		return retval;
	}

	/**
	 * Tests whether a numeric value belongs to this interval.
	 *
	 * @param x - Numeric value to test.
	 * @returns `true` when `x` satisfies both interval bounds.
	 */
	contains(x: AssumptionValue): boolean {
		const value = normalizeAssumptionValue(x);
		const lower = compareBoundValues(value.value, value.exact, this.start.value, this.startExact);
		const upper = compareBoundValues(value.value, value.exact, this.end.value, this.endExact);
		// A membership test must not accept an undecidable comparison.
		return lower !== undefined && upper !== undefined &&
			(lower > 0 || (lower === 0 && this.start.inclusive)) &&
			(upper < 0 || (upper === 0 && this.end.inclusive));
	}

	/**
	 * Determines whether values constrained by this interval are equal to `x`.
	 *
	 * @remarks
	 * Equality is proved only when both sides identify the same single value. It is
	 * disproved when the admissible values are disjoint. Overlapping ranges, including
	 * identical non-singleton ranges, return `undefined` because equality depends on the
	 * actual values chosen from those ranges.
	 *
	 * @param x - Another interval-constrained value or a numeric expression.
	 * @returns `true` when equality is forced, `false` when inequality is forced, or
	 * `undefined` when the available information permits either outcome.
	 */
	eq(x: Assumption | Expression): AssumptionComparison {
		let retval: AssumptionComparison = undefined;

		if (Expression.isExpression(x)) {
			const startComparison = compareToBound(
				x,
				this.start.value,
				this.startExact
			);
			const endComparison = compareToBound(x, this.end.value, this.endExact);

			if (startComparison !== undefined && endComparison !== undefined) {
				if (
					startComparison < 0 ||
					endComparison > 0 ||
					(startComparison === 0 && !this.start.inclusive) ||
					(endComparison === 0 && !this.end.inclusive)
				) {
					retval = false;
				} else if (this.isSingleton) {
					retval = true;
				}
			}
		} else if (this.isSingleton && x.isSingleton) {
			const order = compareBoundValues(this.start.value, this.startExact, x.start.value, x.startExact);
			retval = order === undefined ? undefined : order === 0;
		} else if (!this.overlaps(x)) {
			retval = false;
		}

		return retval;
	}

	/** Returns the exact finite lower bound, or undefined for an unbounded interval. */
	getFiniteLowerBound(): Expression | undefined {
		let retval: Expression | undefined;
		if (this.startExact) {
			retval = Rational.isRational(this.startExact)
				? Expression.fromRational(this.startExact) : this.startExact.copy();
		}
		return retval;
	}

	/** Returns the exact finite upper bound, or undefined for an unbounded interval. */
	getFiniteUpperBound(): Expression | undefined {
		let retval: Expression | undefined;
		if (this.endExact) {
			retval = Rational.isRational(this.endExact)
				? Expression.fromRational(this.endExact) : this.endExact.copy();
		}
		return retval;
	}

	/**
	 * Returns the exact expression represented by a singleton interval.
	 *
	 * @returns An exact Expression when this interval is a singleton, otherwise
	 * `undefined`.
	 */
	getSingletonValue(): Expression | undefined {
		let retval: Expression | undefined;
		if (this.isSingleton && this.startExact) {
			retval = Rational.isRational(this.startExact)
				? Expression.fromRational(this.startExact) : this.startExact.copy();
		}
		return retval;
	}

	/**
	 * Determines whether every value in this interval is strictly greater than `x`.
	 *
	 * @param x - Another interval-constrained value or a numeric expression.
	 * @returns `true` when `>` is forced, `false` when `<=` is forced, or `undefined`
	 * when the interval information permits both outcomes.
	 */
	gt(x: Assumption | Expression): AssumptionComparison {
		let retval: AssumptionComparison = undefined;

		if (Expression.isExpression(x)) {
			const startComparison = compareToBound(
				x,
				this.start.value,
				this.startExact
			);
			const endComparison = compareToBound(x, this.end.value, this.endExact);

			if (startComparison !== undefined && endComparison !== undefined) {
				if (startComparison < 0 || (startComparison === 0 && !this.start.inclusive)) {
					retval = true;
				} else if (endComparison >= 0) {
					retval = false;
				}
			}
		} else {
			const startVsEnd = compareBoundValues(
				this.start.value,
				this.startExact,
				x.end.value,
				x.endExact
			);
			const endVsStart = compareBoundValues(
				this.end.value,
				this.endExact,
				x.start.value,
				x.startExact
			);
			if (startVsEnd !== undefined &&
				(startVsEnd > 0 || (startVsEnd === 0 && (!this.start.inclusive || !x.end.inclusive)))) {
				retval = true;
			} else if (endVsStart !== undefined && endVsStart <= 0) {
				retval = false;
			}
		}

		return retval;
	}

	/**
	 * Determines whether every value in this interval is greater than or equal to `x`.
	 *
	 * @param x - Another interval-constrained value or a numeric expression.
	 * @returns `true` when `>=` is forced, `false` when `<` is forced, or `undefined`
	 * when the interval information permits both outcomes.
	 */
	gte(x: Assumption | Expression): AssumptionComparison {
		let retval: AssumptionComparison = undefined;

		if (Expression.isExpression(x)) {
			const startComparison = compareToBound(
				x,
				this.start.value,
				this.startExact
			);
			const endComparison = compareToBound(x, this.end.value, this.endExact);

			if (startComparison !== undefined && endComparison !== undefined) {
				if (startComparison <= 0) {
					retval = true;
				} else if (endComparison > 0 || (endComparison === 0 && !this.end.inclusive)) {
					retval = false;
				}
			}
		} else {
			const startVsEnd = compareBoundValues(
				this.start.value,
				this.startExact,
				x.end.value,
				x.endExact
			);
			const endVsStart = compareBoundValues(
				this.end.value,
				this.endExact,
				x.start.value,
				x.startExact
			);
			if (startVsEnd !== undefined && startVsEnd >= 0) {
				retval = true;
			} else if (
				endVsStart !== undefined &&
				(endVsStart < 0 || (endVsStart === 0 && (!this.end.inclusive || !x.start.inclusive)))
			) {
				retval = false;
			}
		}

		return retval;
	}

	/**
	 * Intersects this interval with another interval.
	 *
	 * Endpoint selection preserves exact values; undecidable ordering is rejected.
	 *
	 * @param x - Interval to intersect with this one.
	 * @returns The non-empty intersection, or `undefined` when the intervals are disjoint.
	 */
	intersect(x: Assumption): Assumption | undefined {
		const startComparison = compareBoundValues(
			this.start.value,
			this.startExact,
			x.start.value,
			x.startExact
		);
		const endComparison = compareBoundValues(
			this.end.value,
			this.endExact,
			x.end.value,
			x.endExact
		);
		if (startComparison === undefined || endComparison === undefined) {
			throw new UnexpectedInputError(message('wrongInput', {
				expected: 'comparable exact endpoints', received: 'incomparable intervals',
			}));
		}

		let startValue: AssumptionValue;
		let startInclusive: boolean;
		if (startComparison > 0) {
			startValue = this.startExact ?? this.start.value;
			startInclusive = this.start.inclusive;
		} else if (startComparison < 0) {
			startValue = x.startExact ?? x.start.value;
			startInclusive = x.start.inclusive;
		} else {
			startValue = this.startExact ?? this.start.value;
			startInclusive = this.start.inclusive && x.start.inclusive;
		}

		let endValue: AssumptionValue;
		let endInclusive: boolean;
		if (endComparison < 0) {
			endValue = this.endExact ?? this.end.value;
			endInclusive = this.end.inclusive;
		} else if (endComparison > 0) {
			endValue = x.endExact ?? x.end.value;
			endInclusive = x.end.inclusive;
		} else {
			endValue = this.endExact ?? this.end.value;
			endInclusive = this.end.inclusive && x.end.inclusive;
		}

		const normalizedStart = normalizeAssumptionValue(startValue);
		const normalizedEnd = normalizeAssumptionValue(endValue);
		const intersectionComparison = compareBoundValues(
			normalizedStart.value,
			normalizedStart.exact,
			normalizedEnd.value,
			normalizedEnd.exact
		);
		if (intersectionComparison === undefined) {
			throw new UnexpectedInputError(message('wrongInput', {
				expected: 'comparable exact endpoints', received: 'incomparable intersection',
			}));
		}
		let retval: Assumption | undefined;

		if (
			intersectionComparison < 0 ||
			(intersectionComparison === 0 && startInclusive && endInclusive)
		) {
			retval = new Assumption(startValue, endValue, startInclusive, endInclusive);
		}

		return retval;
	}

	/**
	 * Determines whether every value in this interval is strictly less than `x`.
	 *
	 * @param x - Another interval-constrained value or a numeric expression.
	 * @returns `true` when `<` is forced, `false` when `>=` is forced, or `undefined`
	 * when the interval information permits both outcomes.
	 */
	lt(x: Assumption | Expression): AssumptionComparison {
		let retval: AssumptionComparison = undefined;

		if (Expression.isExpression(x)) {
			const startComparison = compareToBound(
				x,
				this.start.value,
				this.startExact
			);
			const endComparison = compareToBound(x, this.end.value, this.endExact);

			if (startComparison !== undefined && endComparison !== undefined) {
				if (endComparison > 0 || (endComparison === 0 && !this.end.inclusive)) {
					retval = true;
				} else if (startComparison <= 0) {
					retval = false;
				}
			}
		} else {
			const endVsStart = compareBoundValues(
				this.end.value,
				this.endExact,
				x.start.value,
				x.startExact
			);
			const startVsEnd = compareBoundValues(
				this.start.value,
				this.startExact,
				x.end.value,
				x.endExact
			);
			if (endVsStart !== undefined &&
				(endVsStart < 0 || (endVsStart === 0 && (!this.end.inclusive || !x.start.inclusive)))) {
				retval = true;
			} else if (startVsEnd !== undefined && startVsEnd >= 0) {
				retval = false;
			}
		}

		return retval;
	}

	/**
	 * Determines whether every value in this interval is less than or equal to `x`.
	 *
	 * @param x - Another interval-constrained value or a numeric expression.
	 * @returns `true` when `<=` is forced, `false` when `>` is forced, or `undefined`
	 * when the interval information permits both outcomes.
	 */
	lte(x: Assumption | Expression): AssumptionComparison {
		let retval: AssumptionComparison = undefined;

		if (Expression.isExpression(x)) {
			const startComparison = compareToBound(
				x,
				this.start.value,
				this.startExact
			);
			const endComparison = compareToBound(x, this.end.value, this.endExact);

			if (startComparison !== undefined && endComparison !== undefined) {
				if (endComparison >= 0) {
					retval = true;
				} else if (startComparison < 0 || (startComparison === 0 && !this.start.inclusive)) {
					retval = false;
				}
			}
		} else {
			const endVsStart = compareBoundValues(
				this.end.value,
				this.endExact,
				x.start.value,
				x.startExact
			);
			const startVsEnd = compareBoundValues(
				this.start.value,
				this.startExact,
				x.end.value,
				x.endExact
			);
			if (endVsStart !== undefined && endVsStart <= 0) {
				retval = true;
			} else if (
				startVsEnd !== undefined &&
				(startVsEnd > 0 || (startVsEnd === 0 && (!this.start.inclusive || !x.end.inclusive)))
			) {
				retval = false;
			}
		}

		return retval;
	}

	/**
	 * Tests whether this interval and `x` share at least one admissible value.
	 *
	 * @param x - Interval to test for overlap.
	 * @returns `false` only when the intervals are provably disjoint.
	 */
	overlaps(x: Assumption): boolean {
		const endVsStart = compareBoundValues(
			this.end.value,
			this.endExact,
			x.start.value,
			x.startExact
		);
		const startVsEnd = compareBoundValues(
			this.start.value,
			this.startExact,
			x.end.value,
			x.endExact
		);
		let retval = true;

		if ((endVsStart !== undefined && endVsStart < 0) ||
			(startVsEnd !== undefined && startVsEnd > 0)) {
			retval = false;
		} else if (endVsStart === 0) {
			retval = this.end.inclusive && x.start.inclusive;
		} else if (startVsEnd === 0) {
			retval = this.start.inclusive && x.end.inclusive;
		}

		return retval;
	}

	/**
	 * Tests whether two objects describe the same interval constraint.
	 *
	 * @remarks
	 * This is structural interval equality and is separate from {@link eq}: two different
	 * variables may have identical intervals without being known to have the same value.
	 *
	 * @param x - Interval constraint to compare with this one.
	 * @returns `true` when both endpoints and their inclusivity are identical.
	 */
	sameInterval(x: Assumption): boolean {
		return (
			compareBoundValues(this.start.value, this.startExact, x.start.value, x.startExact) === 0 &&
			compareBoundValues(this.end.value, this.endExact, x.end.value, x.endExact) === 0 &&
			this.start.inclusive === x.start.inclusive &&
			this.end.inclusive === x.end.inclusive
		);
	}

	/**
	 * Formats the interval using mathematical bracket notation.
	 *
	 * @returns A representation such as `[0, 10)` or `(-Infinity, Infinity)`.
	 */
	toString(): string {
		const l = this.start.inclusive ? '[' : '(';
		const r = this.end.inclusive ? ']' : ')';
		const start = Expression.isExpression(this.startExact) ? this.startExact.text() : this.start.value;
		const end = Expression.isExpression(this.endExact) ? this.endExact.text() : this.end.value;
		return `${l}${start}, ${end}${r}`;
	}
}
