import { Collection } from '../core/classes/collection/Collection';
import { Dictionary } from '../core/classes/dictionary/Dictionary';
import { Expression } from '../core/classes/expression/Expression';
import { one, zero } from '../core/classes/expression/shortcuts';
export { product, stripPower, sum } from '../core/classes/expression/utils';
import { Matrix } from '../core/classes/matrix/Matrix';
import { COUNT, ISPRIME, SIZE } from '../core/classes/parser/constants';
import { ValuesSet } from '../core/classes/valuesSet/ValuesSet';
import { Vector } from '../core/classes/vector/Vector';
import { message, UnexpectedInputError } from '../core/errors';
import { isPrimeBig } from '../core/functions/bigint/primeFactor';

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
