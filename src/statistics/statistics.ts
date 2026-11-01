import { Expression } from '../core/classes/expression/Expression';
import { half, zero } from '../core/classes/expression/shortcuts';
import { Vector } from '../core/classes/vector/Vector';
import { MEDIAN, MODE } from '../core/constants/functionNames';

import type { ExpressionInput, ParserEntity } from '../core/types';

export type StatisticsInput = ExpressionInput | Vector;

function valuesFrom(args: StatisticsInput[]): Expression[] {
	const source: ParserEntity[] | StatisticsInput[] =
		args.length === 1 && Vector.isVector(args[0]) ? args[0].elements : args;

	return source.map(value =>
		Expression.isExpression(value) ? value.copy() : Expression.create(value as ExpressionInput)
	);
}

function frequencyMap(values: readonly Expression[]): Map<string, number> {
	const frequencies = new Map<string, number>();

	for (const value of values) {
		const key = value.text();
		frequencies.set(key, (frequencies.get(key) ?? 0) + 1);
	}

	return frequencies;
}

function sum(values: readonly Expression[], center?: Expression): Expression {
	let retval = zero();
	for (const value of values) {
		const term = center === undefined ? value : value.minus(center).sq();
		retval = retval.plus(term);
	}
	return retval;
}

/** Returns the arithmetic mean of the supplied values. A single Vector is unpacked. */
export function mean(...args: StatisticsInput[]): Expression {
	const values = valuesFrom(args);
	return sum(values).div(Expression.Number(values.length));
}

/**
 * Returns the median when all supplied values can be ordered numerically.
 * Symbolic or complex inputs remain as an unevaluated median call.
 */
export function median(...args: StatisticsInput[]): Expression {
	const values = valuesFrom(args);
	const evaluated = values.map(value => value.evaluate());

	if (evaluated.some(value => value.isComplex() || !value.isNUM())) {
		return Expression.toFunction(MEDIAN, values);
	}

	const sorted = values
		.map((value, index) => ({ value, evaluated: evaluated[index] }))
		.sort((a, b) => a.evaluated.lt(b.evaluated) ? -1 : a.evaluated.gt(b.evaluated) ? 1 : 0)
		.map(entry => entry.value);

	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0
		? mean(sorted[middle - 1], sorted[middle])
		: sorted[middle];
}

/**
 * Returns the most frequent value. A tie remains symbolic as mode(...), matching
 * the legacy behavior instead of selecting an arbitrary winner.
 */
export function mode(...args: StatisticsInput[]): Expression {
	const values = valuesFrom(args);
	const frequencies = frequencyMap(values);

	if (frequencies.size === 1) {
		return values[0];
	}

	const max = Math.max(...frequencies.values());
	const candidates = [...frequencies]
		.filter(([, count]) => count === max)
		.map(([value]) => Expression.create(value))
		.sort((a, b) => a.text().localeCompare(b.text()));

	return candidates.length === 1
		? candidates[0]
		: Expression.toFunction(MODE, candidates);
}

function generalizedVariance(sample: boolean, args: StatisticsInput[]): Expression {
	const values = valuesFrom(args);
	const average = mean(...values);
	const denominator = values.length - (sample ? 1 : 0);
	return sum(values, average).div(Expression.Number(denominator));
}

/** Returns the population variance using the legacy algebraic squared-deviation definition. */
export function variance(...args: StatisticsInput[]): Expression {
	return generalizedVariance(false, args);
}

/** Returns the sample variance using n-1 in the denominator. */
export function sampleVariance(...args: StatisticsInput[]): Expression {
	return generalizedVariance(true, args);
}

/** Legacy parser spelling for sample variance. */
export const smpvar = sampleVariance;

/** Returns the population standard deviation. */
export function stdev(...args: StatisticsInput[]): Expression {
	return variance(...args).pow(half());
}

/** Returns the sample standard deviation. */
export function sampleStandardDeviation(...args: StatisticsInput[]): Expression {
	return sampleVariance(...args).pow(half());
}

/** Legacy parser spelling for sample standard deviation. */
export const smpstdev = sampleStandardDeviation;

/** Returns the z-score (x - mean) / standardDeviation. */
export function zscore(
	x: ExpressionInput,
	average: ExpressionInput,
	standardDeviation: ExpressionInput
): Expression {
	return Expression.create(x)
		.minus(Expression.create(average))
		.div(Expression.create(standardDeviation));
}
