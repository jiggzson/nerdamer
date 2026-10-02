import type { ParserEntity } from '../../types';
import type { NerdamerInput } from '../../types';
import type { BinaryArithmeticOperation } from '../common';

type SetOfValuesLike = {
	isEnumerable: boolean;
	dataType: string;
	elements: ParserEntity[] | ParserEntity[][];
};

interface BinaryDispatchTarget {
	plus(x: NerdamerInput): ParserEntity;
	minus(x: NerdamerInput): ParserEntity;
	times(x: NerdamerInput): ParserEntity;
	div(x: NerdamerInput): ParserEntity;
	pow?(x: NerdamerInput): ParserEntity;
}

function isEnumerableLike(x: unknown): x is SetOfValuesLike {
	if (typeof x !== 'object' || x === null) {
		return false;
	}
	const r = x as Record<string, unknown>;
	return (
		r['isEnumerable'] === true &&
		typeof r['dataType'] === 'string' &&
		Array.isArray(r['elements'])
	);
}

function getAggregateElement(
	agg: SetOfValuesLike,
	i: string | number | undefined,
	j: string | number | undefined
): ParserEntity | undefined {
	if (i === undefined) {
		return undefined;
	}

	const idx = typeof i === 'number' ? i : Number(i);
	if (!Number.isFinite(idx)) {
		return undefined;
	}

	const row = agg.elements[idx];
	if (row === undefined) {
		return undefined;
	}

	// If matrix-like (array of arrays), index into row using j.
	if (Array.isArray(row)) {
		if (j === undefined) {
			return undefined;
		}

		const jdx = typeof j === 'number' ? j : Number(j);
		if (!Number.isFinite(jdx)) {
			return undefined;
		}

		return row[jdx];
	}

	// Vector/collection-like
	return row;
}

function applyBinaryOp(
	op: BinaryArithmeticOperation,
	lhs: ParserEntity,
	rhs: NerdamerInput
): ParserEntity {
	const target: BinaryDispatchTarget = lhs;
	const operation = target[op];
	return operation!.call(target, rhs);
}

/**
 * Abstract base class for Vector, Matrix, and Collection classes.
 * Consolidates common arithmetic operations and parser mappings.
 *
 * `TProduct` is reserved for multiplication results that differ from the
 * concrete structured entity type. Most structures use the default `never`,
 * so their inherited multiplication continues to return `T` exactly.
 */
export abstract class StructuredEntity<
	T extends StructuredEntity<T, TProduct>,
	TProduct extends ParserEntity = never,
> {
	abstract dataType: string;
	abstract elements: ParserEntity[] | ParserEntity[][];
	abstract isEnumerable: boolean;
	abstract precision?: number;

	private binaryOp(op: BinaryArithmeticOperation, x: NerdamerInput): T {
		const rhsAgg = isEnumerableLike(x) && x.dataType === this.dataType ? x : undefined;
		return this.copy().each((e: ParserEntity, i?: string | number, j?: string | number) => {
			const rhs: NerdamerInput = rhsAgg ? (getAggregateElement(rhsAgg, i, j) ?? x) : x;
			return applyBinaryOp(op, e, rhs);
		});
	}

	abstract __get__(indices: number[] | string): ParserEntity;
	abstract __set__(indices: number[] | string, value: ParserEntity): void;

	abs(): T {
		return this.copy().each((e: ParserEntity) => {
			return e.abs();
		});
	}

	abstract copy(): T;
	abstract dimensions(): number[];
	dimensionsMatch(x: ParserEntity): x is ParserEntity & T {
		if (!isEnumerableLike(x) || this.dataType !== x.dataType) {
			return false;
		}
		return x.elements.length === this.elements.length;
	}
	div(x: NerdamerInput): T {
		return this.binaryOp('div', x);
	}

	abstract each(
		callback: (e: ParserEntity, i?: string | number, j?: string | number) => ParserEntity | void
	): T;

	abstract eq(other: ParserEntity): boolean;

	abstract evaluate(): T;

	abstract expand(): T;

	abstract gt(other: ParserEntity): boolean;

	abstract gte(other: ParserEntity): boolean;

	abstract lt(other: ParserEntity): boolean;

	abstract lte(other: ParserEntity): boolean;

	minus(x: NerdamerInput): T {
		return this.binaryOp('minus', x);
	}

	plus(x: NerdamerInput): T {
		return this.binaryOp('plus', x);
	}

	pow(x: NerdamerInput): T {
		return this.binaryOp('pow', x);
	}

	abstract text(): string;

	times(x: NerdamerInput): T | TProduct {
		return this.binaryOp('times', x);
	}

	toString(): string {
		return this.text();
	}

}