import type { ParserInputType } from '../../classes/parser/types';
import type { SupportedInputType } from '../../classes/parser/types';
import type { Scope } from './Scope';

type SetOfValuesLike = {
	isCollectionOfValues: boolean;
	dataType: string;
	elements: ParserInputType[] | ParserInputType[][];
};

function isCollectionOfValuesLike(x: unknown): x is SetOfValuesLike {
	if (typeof x !== 'object' || x === null) {
		return false;
	}
	const r = x as Record<string, unknown>;
	return (
		r['isCollectionOfValues'] === true &&
		typeof r['dataType'] === 'string' &&
		Array.isArray(r['elements'])
	);
}

function getAggregateElement(
	agg: SetOfValuesLike,
	i: string | number | undefined,
	j: string | number | undefined
): ParserInputType | undefined {
	if (i === undefined) {
		return undefined;
	}
	const idx = typeof i === 'number' ? i : Number(i);
	if (!Number.isFinite(idx)) {
		return undefined;
	}

	const els = agg.elements;
	const row = (els as ParserInputType[] | ParserInputType[][])[idx];
	if (row === undefined) {
		return undefined;
	}

	// If matrix-like (array of arrays), index into row using j.
	if (Array.isArray(row) && j !== undefined) {
		const jdx = typeof j === 'number' ? j : Number(j);
		if (!Number.isFinite(jdx)) {
			return undefined;
		}
		return (row as ParserInputType[])[jdx];
	}

	// Vector/collection-like
	return row as ParserInputType;
}

function applyBinaryOp(
	op: 'plus' | 'minus' | 'times' | 'div' | 'pow',
	lhs: ParserInputType,
	rhs: SupportedInputType
): ParserInputType {
	switch (op) {
		case 'plus':
			return (lhs as unknown as { plus: (x: SupportedInputType) => ParserInputType }).plus(
				rhs
			);
		case 'minus':
			return (lhs as unknown as { minus: (x: SupportedInputType) => ParserInputType }).minus(
				rhs
			);
		case 'times':
			return (lhs as unknown as { times: (x: SupportedInputType) => ParserInputType }).times(
				rhs
			);
		case 'div':
			return (lhs as unknown as { div: (x: SupportedInputType) => ParserInputType }).div(rhs);
		case 'pow':
			return (lhs as unknown as { pow: (x: SupportedInputType) => ParserInputType }).pow(rhs);
	}
}

/**
 * Abstract base class for Vector, Matrix, and Collection classes.
 * Consolidates common arithmetic operations and parser mappings.
 */
export abstract class StructuredEntity<T extends StructuredEntity<T>> {
	abstract dataType: string;
	abstract elements: ParserInputType[] | ParserInputType[][] | Scope;
	abstract isCollectionOfValues: boolean;
	abstract precision?: number;

	private binaryOp(op: 'plus' | 'minus' | 'times' | 'div' | 'pow', x: SupportedInputType): T {
		const rhsAgg = isCollectionOfValuesLike(x) && x.dataType === this.dataType ? x : undefined;
		return this.copy().each((e: ParserInputType, i?: string | number, j?: string | number) => {
			const rhs: SupportedInputType = rhsAgg ? (getAggregateElement(rhsAgg, i, j) ?? x) : x;
			return applyBinaryOp(op, e, rhs);
		});
	}
	/**
	 * Returns the element at the given indices or key.
	 * For Vector/Collection: [i] returns element at index i.
	 * For Matrix: [i] returns row i as Vector, [i, j] returns element.
	 * For Dictionary: string key returns the value.
	 *
	 * @param indices Numeric index array (zero-based, after INDEX_BASE adjustment) or string key
	 */
	__get__(indices: number[] | string): ParserInputType {
		if (typeof indices === 'string') {
			throw new Error(`String key access not supported for ${this.dataType}`);
		}
		const idx = indices[0];
		const els = this.elements as ParserInputType[];
		if (idx < 0 || idx >= els.length) {
			throw new Error(
				`Index ${idx} out of bounds for ${this.dataType} of length ${els.length}`
			);
		}
		return els[idx];
	}
	/**
	 * Sets the element at the given indices or key.
	 * For Vector/Collection: [i] sets element at index i.
	 * For Matrix: [i, j] sets element at row i, col j.
	 * For Dictionary: string key sets the value.
	 *
	 * @param indices Numeric index array or string key
	 * @param value The value to set
	 */
	__set__(indices: number[] | string, value: ParserInputType): void {
		if (typeof indices === 'string') {
			throw new Error(`String key assignment not supported for ${this.dataType}`);
		}
		const idx = indices[0];
		const els = this.elements as ParserInputType[];
		if (idx < 0 || idx >= els.length) {
			throw new Error(
				`Index ${idx} out of bounds for ${this.dataType} of length ${els.length}`
			);
		}
		els[idx] = value;
	}
	abs(): T {
		return this.copy().each((e: ParserInputType) => {
			return (e as unknown as { abs: () => ParserInputType }).abs();
		});
	}
	abstract copy(): T;
	abstract dimensions(): number[];
	dimensionsMatch(x: ParserInputType): boolean {
		if (!isCollectionOfValuesLike(x) || this.dataType !== x.dataType) {
			return false;
		}
		return x.elements.length === this.elements.length;
	}

	div(x: SupportedInputType): T {
		return this.binaryOp('div', x);
	}

	abstract each(
		callback: (e: ParserInputType, i?: string | number, j?: string | number) => ParserInputType
	): T;

	abstract eq(other: ParserInputType): boolean;

	abstract evaluate(): T;

	abstract expand(): T;

	minus(x: SupportedInputType): T {
		return this.binaryOp('minus', x);
	}

	plus(x: SupportedInputType): T {
		return this.binaryOp('plus', x);
	}

	pow(x: SupportedInputType): T {
		return this.binaryOp('pow', x);
	}

	abstract text(): string;

	times(x: SupportedInputType): T {
		return this.binaryOp('times', x);
	}

	toString(): string {
		return this.text();
	}
}
