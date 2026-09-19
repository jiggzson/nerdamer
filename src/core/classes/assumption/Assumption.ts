import Decimal from 'decimal.js';

import { isNerdamerNativeType } from '../../common/common';
import { Expression } from '../expression/Expression';
import { ASSUMPTION } from '../parser/constants';
import { Rational } from '../rational/Rational';

/**
 * One endpoint of an {@link Assumption} interval.
 *
 * Infinity is always represented as an open endpoint because it is not itself a
 * member of a real interval. `value` remains Decimal-facing for API compatibility;
 * finite bounds also retain an exact rational representation internally.
 */
export type Bound = Readonly<{ value: Decimal; inclusive: boolean }>;

/** Result returned by {@link Assumption.parse}. */
export type ParsedAssumption = Readonly<{ symbol: string; assumption: Assumption }>;

/** Numeric input accepted when constructing interval assumptions. */
export type AssumptionValue = Decimal | Rational | string | number;

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
type NormalizedAssumptionValue = Readonly<{
	value: Decimal;
	exact: Rational | undefined;
}>;

function isIdentStart(ch: string) {
	return /[A-Za-z_]/.test(ch);
}

function isIdentChar(ch: string) {
	return /[A-Za-z0-9_]/.test(ch);
}

function normalizeAssumptionValue(value: AssumptionValue): NormalizedAssumptionValue {
	let decimal: Decimal;
	let exact: Rational | undefined;

	if (Rational.isRational(value)) {
		exact = Rational.makeCopy(value);
		decimal = exact.toDecimal();
	} else {
		decimal = typeof value === 'number' || typeof value === 'string' ? new Decimal(value) : value;
		if (decimal.isFinite()) {
			exact = Rational.create(decimal.toString());
		}
	}

	return { value: decimal, exact };
}

function compareBoundValues(
	a: Decimal,
	aExact: Rational | undefined,
	b: Decimal,
	bExact: Rational | undefined
): NumericComparison {
	let retval: NumericComparison;

	if (a.isFinite() && b.isFinite()) {
		const left = aExact ?? Rational.create(a.toString());
		const right = bExact ?? Rational.create(b.toString());
		if (left.lt(right)) {
			retval = -1;
		} else if (left.gt(right)) {
			retval = 1;
		} else {
			retval = 0;
		}
	} else if (a.eq(b)) {
		retval = 0;
	} else {
		retval = a.lt(b) ? -1 : 1;
	}

	return retval;
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
		throw new Error(`Invalid Decimal: "${value}"`);
	}
	return n;
}

function compareNumericExpressionToBound(
	x: Expression,
	bound: Decimal,
	boundExact: Rational | undefined
): NumericComparison | undefined {
	let retval: NumericComparison | undefined = undefined;

	if (x.isNegInf()) {
		retval = bound.eq(-Infinity) ? 0 : -1;
	} else if (x.isPosInf()) {
		retval = bound.eq(Infinity) ? 0 : 1;
	} else if (x.isNUM()) {
		if (bound.isFinite()) {
			const boundValue = boundExact ?? Rational.create(bound.toString());
			const numericValue = x.getMultiplier();

			if (numericValue.lt(boundValue)) {
				retval = -1;
			} else if (numericValue.gt(boundValue)) {
				retval = 1;
			} else {
				retval = 0;
			}
		} else {
			retval = bound.lt(0) ? 1 : -1;
		}
	}

	return retval;
}

/**
 * Describes the admissible real values of a symbolic variable as one numeric interval.
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
 * Finite bounds preserve an exact rational value internally. Decimal inputs therefore
 * retain the exact value represented by their decimal text, while Rational inputs such
 * as `1/3` are not rounded through Decimal precision before comparisons are made.
 *
 * The 2.0 assumption vocabulary covers a single real interval with numeric bounds.
 * Integer, parity, complex-domain, relational (`x > y`), union, and general predicate
 * assumptions are not represented by this class.
 */
export class Assumption {
	private readonly endExact: Rational | undefined;
	private readonly startExact: Rational | undefined;

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
	 * value. Rational inputs retain their exact value even when their Decimal projection
	 * is necessarily finite precision.
	 *
	 * @param start - Lower numeric endpoint.
	 * @param end - Upper numeric endpoint.
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
			throw new Error(`Invalid interval: (${startValue}, ${endValue})`);
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
	 * Whitespace is ignored. Variable names use the ASCII identifier form
	 * `[A-Za-z_][A-Za-z0-9_]*`. Supported operators are `=`, `==`, `>`, `>=`, `<`,
	 * and `<=`. Bounds are Decimal-compatible numeric literals; `inf`, `infinity`,
	 * `+inf`, `+infinity`, `-inf`, and `-infinity` are also accepted.
	 *
	 * Expressions such as `x > y`, `x = 1/2`, and property predicates such as
	 * `integer(x)` are outside the string assumption grammar. Parser assertive calls may
	 * still provide already-evaluated Rational bounds directly.
	 *
	 * @param expr - Constraint to parse.
	 * @returns The parsed symbol and its interval assumption.
	 * @throws Error
	 * Thrown when the constraint has an invalid identifier, operator, or numeric bound.
	 */
	static parse(expr: string): ParsedAssumption {
		if (typeof expr !== 'string') {
			throw new Error(`Invalid assumption: "${String(expr)}"`);
		}

		const s = expr.replace(/\s+/g, '');
		if (!s) {
			throw new Error(`Invalid assumption: "${expr}"`);
		}

		// Must have at least a one-character identifier, operator, and value.
		if (s.length < 3) {
			throw new Error(`Invalid assumption: "${expr}"`);
		}

		let i = 0;

		// Parse the variable identifier first. Assumptions are attached to plain
		// variables rather than arbitrary symbolic expressions.
		if (!isIdentStart(s[i])) {
			throw new Error(`Expected identifier`);
		}

		let j = i + 1;
		while (j < s.length && isIdentChar(s[j])) {
			j++;
		}

		const symbol = s.slice(i, j);
		i = j;

		// Read the comparison operator separately so malformed combinations fail with
		// an unsupported-operator error instead of being misread as part of the value.
		let op = '';
		while (i < s.length) {
			const ch = s[i];
			if (ch === '<' || ch === '>' || ch === '=') {
				op += ch;
				i++;
			} else {
				break;
			}
		}

		if (!op) {
			throw new Error(`Missing operator`);
		}

		const valueStr = s.slice(i);
		if (!valueStr) {
			throw new Error(`Missing value`);
		}

		const value = parseNumber(valueStr);
		let retval: ParsedAssumption;

		switch (op) {
			case '>':
				retval = { symbol, assumption: Assumption.atLeast(value, false) };
				break;
			case '>=':
				retval = { symbol, assumption: Assumption.atLeast(value, true) };
				break;
			case '<':
				retval = { symbol, assumption: Assumption.atMost(value, false) };
				break;
			case '<=':
				retval = { symbol, assumption: Assumption.atMost(value, true) };
				break;
			case '=':
			case '==':
				retval = { symbol, assumption: Assumption.exactly(value) };
				break;
			default:
				throw new Error(`Unsupported operator "${op}"`);
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
		let retval = !value.value.isNaN();

		if (
			retval &&
			(compareBoundValues(value.value, value.exact, this.start.value, this.startExact) < 0 ||
				compareBoundValues(value.value, value.exact, this.end.value, this.endExact) > 0)
		) {
			retval = false;
		} else if (
			retval &&
			compareBoundValues(value.value, value.exact, this.start.value, this.startExact) === 0 &&
			!this.start.inclusive
		) {
			retval = false;
		} else if (
			retval &&
			compareBoundValues(value.value, value.exact, this.end.value, this.endExact) === 0 &&
			!this.end.inclusive
		) {
			retval = false;
		}

		return retval;
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
			const startComparison = compareNumericExpressionToBound(
				x,
				this.start.value,
				this.startExact
			);
			const endComparison = compareNumericExpressionToBound(x, this.end.value, this.endExact);

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
			retval =
				compareBoundValues(this.start.value, this.startExact, x.start.value, x.startExact) === 0;
		} else if (!this.overlaps(x)) {
			retval = false;
		}

		return retval;
	}

	/**
	 * Returns the exact value represented by a singleton interval.
	 *
	 * @returns A numeric Expression when this interval is a singleton, otherwise
	 * `undefined`.
	 */
	getSingletonValue(): Expression | undefined {
		let retval: Expression | undefined;
		if (this.isSingleton && this.startExact) {
			retval = Expression.fromRational(this.startExact);
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
			const startComparison = compareNumericExpressionToBound(
				x,
				this.start.value,
				this.startExact
			);
			const endComparison = compareNumericExpressionToBound(x, this.end.value, this.endExact);

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
			if (startVsEnd > 0 || (startVsEnd === 0 && (!this.start.inclusive || !x.end.inclusive))) {
				retval = true;
			} else if (endVsStart <= 0) {
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
			const startComparison = compareNumericExpressionToBound(
				x,
				this.start.value,
				this.startExact
			);
			const endComparison = compareNumericExpressionToBound(x, this.end.value, this.endExact);

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
			if (startVsEnd >= 0) {
				retval = true;
			} else if (
				endVsStart < 0 ||
				(endVsStart === 0 && (!this.end.inclusive || !x.start.inclusive))
			) {
				retval = false;
			}
		}

		return retval;
	}

	/**
	 * Intersects this interval with another interval.
	 *
	 * Endpoint selection uses the exact finite representation retained by each interval,
	 * so repeated constraints do not lose rational precision while narrowing the range.
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
			const startComparison = compareNumericExpressionToBound(
				x,
				this.start.value,
				this.startExact
			);
			const endComparison = compareNumericExpressionToBound(x, this.end.value, this.endExact);

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
			if (endVsStart < 0 || (endVsStart === 0 && (!this.end.inclusive || !x.start.inclusive))) {
				retval = true;
			} else if (startVsEnd >= 0) {
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
			const startComparison = compareNumericExpressionToBound(
				x,
				this.start.value,
				this.startExact
			);
			const endComparison = compareNumericExpressionToBound(x, this.end.value, this.endExact);

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
			if (endVsStart <= 0) {
				retval = true;
			} else if (
				startVsEnd > 0 ||
				(startVsEnd === 0 && (!this.start.inclusive || !x.end.inclusive))
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
	 * @returns `true` when the intersection is non-empty.
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

		if (endVsStart < 0 || startVsEnd > 0) {
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
		return `${l}${this.start.value}, ${this.end.value}${r}`;
	}
}
