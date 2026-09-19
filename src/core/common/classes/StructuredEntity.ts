import type { Expression } from '../../classes/expression/Expression';
import type { ParserEntity } from '../../types';
import type { NerdamerInput } from '../../types';
import type { BinaryArithmeticOperation } from '../common';

type SetOfValuesLike = {
	isEnumerable: boolean;
	dataType: string;
	elements: ParserEntity[] | ParserEntity[][];
};

/**
 * Internal element-wise dispatch signatures. These describe the calling convention
 * used by StructuredEntity without widening concrete classes' public operand types.
 * Equation is the only ParserEntity without pow(), so power remains optional here.
 */
interface PlusDispatchTarget {
	plus(x: NerdamerInput): ParserEntity;
}

interface MinusDispatchTarget {
	minus(x: NerdamerInput): ParserEntity;
}

interface TimesDispatchTarget {
	times(x: NerdamerInput): ParserEntity;
}

interface DivDispatchTarget {
	div(x: NerdamerInput): ParserEntity;
}

interface PowDispatchTarget {
	dataType: string;
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
	switch (op) {
		case 'plus': {
			const target: PlusDispatchTarget = lhs;
			return target.plus(rhs);
		}
		case 'minus': {
			const target: MinusDispatchTarget = lhs;
			return target.minus(rhs);
		}
		case 'times': {
			const target: TimesDispatchTarget = lhs;
			return target.times(rhs);
		}
		case 'div': {
			const target: DivDispatchTarget = lhs;
			return target.div(rhs);
		}
		case 'pow': {
			const target: PowDispatchTarget = lhs;
			// Preserve the historical dynamic failure if an Equation reaches element-wise power.
			return target.pow!(rhs);
		}
	}
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

	/**
	 * Public index expressions retained when bracket access cannot yet be resolved.
	 * This state belongs to a copied structured entity, never the stored source value.
	 */
	symbolicAccessor?: Expression[];

	/** Original symbolic target used to render and later re-evaluate bracket access. */
	symbolicTarget?: Expression;

	/** Copies symbolic access metadata alongside a concrete structured copy. */
	protected copySymbolicAccessTo(copy: T): T {
		if (this.symbolicTarget) {
			copy.symbolicTarget = this.symbolicTarget.copy();
		}
		if (this.symbolicAccessor) {
			copy.symbolicAccessor = this.symbolicAccessor.map(index => index.copy());
		}
		return copy;
	}

	/** Renders symbolic access without exposing the carrier's concrete contents. */
	protected formatSymbolicAccess(baseText: string): string {
		let retval = baseText;
		if (this.symbolicAccessor && this.symbolicAccessor.length > 0) {
			const target = this.symbolicTarget ? this.symbolicTarget.text() : baseText;
			retval = `${target}[${this.symbolicAccessor.map(index => index.text()).join(', ')}]`;
		}
		return retval;
	}

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

	/**
	 * Returns a copied structured entity carrying an unresolved bracket access.
	 * Existing accessor state is retained so chained symbolic access can be extended.
	 */
	withSymbolicAccessor(target: Expression, indices: Expression[]): T {
		const retval = this.copy();
		if (!retval.symbolicTarget) {
			retval.symbolicTarget = target.copy();
		}
		retval.symbolicAccessor = [
			...(retval.symbolicAccessor ?? []),
			...indices.map(index => index.copy()),
		];
		return retval;
	}
}