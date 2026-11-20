import { Collection } from '../core/classes/collection/Collection';
import { Dictionary } from '../core/classes/dictionary/Dictionary';
import { Expression } from '../core/classes/expression/Expression';
import { one, zero } from '../core/classes/expression/shortcuts';
export { product, stripPower, sum } from '../core/classes/expression/utils';
import { Matrix } from '../core/classes/matrix/Matrix';
import { ValuesSet } from '../core/classes/valuesSet/ValuesSet';
import { Vector } from '../core/classes/vector/Vector';
import { dataTypes } from '../core/constants/entityTypes';
import {
	APPEND,
	BINOM,
	COUNT,
	DIFFERENCE,
	INTERSECTION,
	INTERSECTS,
	ISPRIME,
	ISSUBSET,
	NEXT_PRIME,
	POWMOD,
	SIZE,
	UNION,
} from '../core/constants/functionNames';
import { message, UnexpectedDataType, UnexpectedInputError } from '../core/errors';
import { binom as binomBig, powMod as powModBig } from '../core/functions/bigint/bigint';
import { isPrimeBig, nextPrimeBig } from '../core/functions/bigint/primeFactor';

import type { ExpressionInput, ParserEntity } from '../core/types';

/**
 * Returns the continued-fraction decomposition as a Collection containing
 * sign, whole part, and a Vector of partial quotients.
 */
export function continuedFraction(
	x: ExpressionInput,
	depth: ExpressionInput = 10
): Collection {
	const input = Expression.create(x);
	const limitExpression = Expression.create(depth);

	if (
		!limitExpression.isNUM() ||
		!limitExpression.isInteger() ||
		limitExpression.lt(zero()) ||
		limitExpression.getMultiplier().numerator > BigInt(Number.MAX_SAFE_INTEGER)
	) {
		throw new UnexpectedInputError(
			message('wrongInput', {
				expected: 'a non-negative integer',
				received: limitExpression.text(),
			})
		);
	}

	const limit = Number(limitExpression.getMultiplier().numerator);
	const evaluated = input.isConstant() ? input.evaluate() : input;
	if (!evaluated.isNUM()) {
		return new Collection([one(), input, new Vector()]);
	}

	const rational = evaluated.getMultiplier();
	const sign = Expression.Number(rational.sign());
	const numerator = rational.numerator < 0n ? -rational.numerator : rational.numerator;
	let denominator = rational.denominator;
	const whole = numerator / denominator;
	let remainder = numerator % denominator;
	const fractions: Expression[] = [];

	for (let i = 0; i < limit && remainder !== 0n; i++) {
		const quotient = denominator / remainder;
		fractions.push(Expression.Number(quotient));
		const nextRemainder = denominator % remainder;
		denominator = remainder;
		remainder = nextRemainder;
	}

	return new Collection([sign, Expression.Number(whole), new Vector(fractions)]);
}

/**
 * Contains useful functions which are not likely to be exported to the user through `build`
 */

/**
 * Places the Expression in a form that will defer any simplification. Expand must be explicitly called.
 * TODO: This should likely be its own type but it seems a bit overblown to create whole new type
 * just for factors.
 *
 * @param x
 * @returns
 */
export function toFactor(x: Expression) {
	return Expression.toEXP(x, one());
}

export function roots(x: number, y: number, product: number): [number, number] {
	const a = (x + y + Math.sqrt((x + y) ** 2 - 4 * product)) / 2;
	const b = (x + y - Math.sqrt((x + y) ** 2 - 4 * product)) / 2;
	return [Math.min(a, b), Math.max(a, b)];
}

export function getCombinations(
	factors: number[],
	num?: number,
	startAt = 1,
	combinations?: number[]
) {
	combinations ??= [factors[0]];
	// Start at the beginning
	num = num || factors[0];

	for (let i = startAt; i < factors.length; i++) {
		// Calculate this combination
		const product = num * factors[i];
		combinations.push(product);

		// Get the rest of the combinations with this
		for (let j = startAt + 1; j < factors.length; j++) {
			combinations.push(factors[startAt] * factors[j]);
		}
		// We now have to calculate the combinations witht the remaining factors
		getCombinations(factors, product, i + 1, combinations);
	}

	combinations = [...new Set(combinations)].sort((a, b) => a - b);

	return combinations;
}

export function findMatches(factors: number[], target: number) {
	const matches: number[][] = [];

	for (let i = 0; i < factors.length; i++) {
		const a = factors[i];
		for (let j = factors.length - 1; j > i; j--) {
			const b = factors[j];
			const product = a * b;
			// If the range is less than the target number then we're out of range
			if (product < target) {
				break;
			}
			// The combination has to be an exact match
			if (product === target) {
				matches.push([Math.min(a, b), Math.max(a, b)]);
			}
		}
	}

	return matches;
}

/**
 * Converts an array of coefficient in decending power order to a polynomial string
 *
 * @param arr Array of coefficients in order of descending powers
 * @param variable The variable to be used. Defaults to 'x'
 * @returns
 */
export function polynomialStringFromArray(arr: number[], variable = 'x') {
	const terms: string[] = [];
	// Make a copy and reverse
	const polyArray = [...arr].reverse();
	for (let p = 0; p < polyArray.length; p++) {
		const c = polyArray[p];
		if (c !== 0) {
			if (p === 0) {
				terms.push(String(c));
			} else {
				const m = c === 1 ? '' : c === -1 ? '-' : `${c}*`;
				const pow = p === 1 ? '' : '^' + p;
				terms.push(`${m}${variable}${pow}`);
			}
		}
	}

	return terms.reverse().join('+').replace(/\+-/g, '-');
}

/**
 * Trims leading zeroes from an array
 *
 * @param polyArray
 * @returns
 */
export function trimZeros(polyArray: Expression[]) {
	let i = polyArray.length - 1;
	while (i > 0 && polyArray[i].isZero()) {
		i--;
	}

	return polyArray.slice(0, i + 1);
}

/**
 * Returns the index of an element in an array. Use this instead of Array.indexOf
 * since it recognized equality in Expression, Vectors, Matrices, etc.
 *
 * @param arr
 * @param e
 * @returns
 */
export function indexOf(arr: ParserEntity[], e: ParserEntity) {
	for (let i = 0; i < arr.length; i++) {
		const element = arr[i];
		if (element.eq(e)) {
			return i;
		}
	}

	return -1;
}

/**
 * Returns the number of elements in a Vector, SolutionSet, ValuesSet
 * @param x
 * @returns
 */
export function count(x: ParserEntity) {
	if (Vector.isVector(x) || ValuesSet.isValuesSet(x) || Dictionary.isDictionary(x)) {
		return Expression.Number(x.count());
	}
	return Expression.toFunction(COUNT, [x]);
}

/**
 * Returns a new vector with `value` added as its last element. The vector itself isn't changed.
 * A symbolic first argument keeps the call, so it can be evaluated once the vector is known.
 *
 * @param x - The vector to add to.
 * @param value - The element to add. A vector is added as one element.
 * @returns The longer vector.
 * @throws {@link core!UnexpectedDataType} When `x` is a set, matrix or other non-vector value.
 *
 * @example
 * ```ts
 * append(Vector.create([1, 2]), Expression.create(3)).text(); // [1, 2, 3]
 * ```
 */
export function append(x: ParserEntity, value: ParserEntity): ParserEntity {
	let retval: ParserEntity;
	if (Vector.isVector(x)) {
		const extended = x.copy();
		extended.elements.push(value.copy());
		retval = extended;
	} else if (Expression.isExpression(x) && !x.isNUM() && Expression.isExpression(value)) {
		// A call can only keep expressions as arguments.
		retval = Expression.toFunction(APPEND, [x, value]);
	} else {
		throw new UnexpectedDataType(
			message('vectorExpected', { type: dataTypes[x.dataType] ?? 'undefined' })
		);
	}
	return retval;
}

/**
 * Applies one of the ValuesSet operations to sets. Symbolic arguments keep the call.
 *
 * @throws {@link core!UnexpectedDataType} When an argument isn't a set, unless all are symbolic.
 */
function combineSets(
	name: string,
	sets: ParserEntity[],
	combine: (sets: ValuesSet[]) => ParserEntity
): ParserEntity {
	// A call can only keep expressions as arguments, so it stays symbolic only when every
	// argument is a symbolic expression.
	const symbolic = sets.every(x => Expression.isExpression(x) && !x.isNUM());
	let retval: ParserEntity;
	if (symbolic) {
		retval = Expression.toFunction(name, sets);
	} else {
		const other = sets.find(x => !ValuesSet.isValuesSet(x));
		if (other) {
			throw new UnexpectedDataType(
				message('setRequired', { fn: name, type: dataTypes[other.dataType] ?? 'undefined' })
			);
		}
		retval = combine(sets as ValuesSet[]);
	}
	return retval;
}

/**
 * Returns the set of values in any of the given sets.
 *
 * @example
 * ```ts
 * nerdamer('union({1,2},{2,3})').text(); // {1, 2, 3}
 * ```
 */
export function union(...sets: ParserEntity[]): ParserEntity {
	return combineSets(UNION, sets, x => x.reduce((a, b) => a.union(b)));
}

/**
 * Returns the set of values in every one of the given sets.
 *
 * @example
 * ```ts
 * nerdamer('intersection({1,2},{2,3})').text(); // {2}
 * ```
 */
export function intersection(...sets: ParserEntity[]): ParserEntity {
	return combineSets(INTERSECTION, sets, x => x.reduce((a, b) => a.intersection(b)));
}

/**
 * Returns the set of values in the first set but not in the second.
 *
 * @example
 * ```ts
 * nerdamer('difference({1,2},{2,3})').text(); // {1}
 * ```
 */
export function difference(a: ParserEntity, b: ParserEntity): ParserEntity {
	return combineSets(DIFFERENCE, [a, b], ([x, y]) => x.difference(y));
}

/**
 * Returns 1 when the two sets have a value in common and 0 when they don't.
 *
 * @example
 * ```ts
 * nerdamer('intersects({1,2},{2,3})').text(); // 1
 * ```
 */
export function intersects(a: ParserEntity, b: ParserEntity): ParserEntity {
	return combineSets(INTERSECTS, [a, b], ([x, y]) => Expression.Number(Number(!x.isDisjointFrom(y))));
}

/**
 * Returns 1 when every value of the first set is in the second and 0 otherwise.
 *
 * @example
 * ```ts
 * nerdamer('issubset({1},{1,2})').text(); // 1
 * ```
 */
export function isSubset(a: ParserEntity, b: ParserEntity): ParserEntity {
	return combineSets(ISSUBSET, [a, b], ([x, y]) => Expression.Number(Number(x.isSubsetOf(y))));
}

/** Returns the dimensions of a structured parser value. */
export function size(x: ParserEntity): ParserEntity {
	if (
		Vector.isVector(x) ||
		Matrix.isMatrix(x) ||
		Collection.isCollection(x) ||
		ValuesSet.isValuesSet(x) ||
		Dictionary.isDictionary(x)
	) {
		return Vector.create(x.dimensions());
	}
	return Expression.toFunction(SIZE, [x]);
}

/**
 * Tests whether an exact integer expression is prime.
 *
 * Non-integer or unresolved symbolic input remains as an unevaluated `isprime(...)`
 * expression so it can be simplified later.
 *
 * @param x - Expression-compatible value to test.
 * @returns `1` for prime integers, `0` for composite integers, or an unevaluated symbolic call.
 */
export function isprime(x: ExpressionInput): Expression {
	const expression = Expression.create(x);
	let retval: Expression;

	if (expression.isInteger()) {
		retval = Expression.Number(Number(isPrimeBig(expression.getMultiplier().numerator)));
	} else {
		retval = Expression.toFunction(ISPRIME, [expression]);
	}

	return retval;
}


/** Returns the first prime strictly greater than an exact integer. */
export function nextprime(x: ExpressionInput): Expression {
	const input = Expression.create(x);
	if (input.isInteger()) {
		return Expression.Number(nextPrimeBig(input.getMultiplier().numerator + 1n));
	}
	return Expression.toFunction(NEXT_PRIME, [input]);
}

/**
 * Computes an exact binomial coefficient for nonnegative integer n and integer k.
 * Non-integer or unresolved arguments remain symbolic.
 */
export function binom(n: ExpressionInput, k: ExpressionInput): Expression {
	const upper = Expression.create(n);
	const lower = Expression.create(k);
	if (upper.isInteger() && lower.isInteger()) {
		const value = upper.getMultiplier().numerator;
		if (value < 0n) {
			throw new UnexpectedInputError(message('wrongInput', {
				expected: 'a nonnegative integer n',
				received: upper.text(),
			}));
		}
		return Expression.Number(binomBig(value, lower.getMultiplier().numerator));
	}
	return Expression.toFunction(BINOM, [upper, lower]);
}

/**
 * Computes base^exponent modulo a positive integer without materializing the power.
 * Uses exact BigInt arithmetic; unresolved arguments remain symbolic.
 */
export function powmod(base: ExpressionInput, exponent: ExpressionInput, modulus: ExpressionInput): Expression {
	const a = Expression.create(base);
	const b = Expression.create(exponent);
	const m = Expression.create(modulus);
	if (a.isInteger() && b.isInteger() && m.isInteger()) {
		if (b.lt(zero()) || m.lte(zero())) {
			throw new UnexpectedInputError(message('wrongInput', {
				expected: 'a nonnegative exponent and positive modulus',
				received: [b.text(), m.text()].join(', '),
			}));
		}
		return Expression.Number(powModBig(
			a.getMultiplier().numerator,
			b.getMultiplier().numerator,
			m.getMultiplier().numerator
		));
	}
	return Expression.toFunction(POWMOD, [a, b, m]);
}
