import { StructuredEntity } from './StructuredEntity';

import type { ParserInputType } from '../../classes/parser/types';

/**
 * MathematicalAggregate
 *
 * Base class for linear iterable parser entities (Vector, ValuesSet, SolutionSet, ...).
 *
 * The TElement generic constrains what type of elements the aggregate holds.
 * For most types this is ParserInputType; for SolutionSet it is Expression.
 */
export abstract class MathematicalAggregate<
	TSelf extends MathematicalAggregate<TSelf, TElement>,
	TElement extends ParserInputType = ParserInputType,
> extends StructuredEntity<TSelf> {
	public abstract elements: TElement[];

	/**
	 * Returns the element at the given index.
	 * @param indices A single-element array [i]
	 */
	__get__(indices: number[]): ParserInputType {
		const index = indices[0];
		if (index < 0 || index >= this.elements.length) {
			throw new RangeError(
				`Index ${index} out of bounds for ${this.dataType} of length ${this.elements.length}`
			);
		}
		return this.elements[index];
	}

	/**
	 * Sets the element at the given index.
	 * @param indices A single-element array [i]
	 * @param value The value to set
	 */
	__set__(indices: number[], value: ParserInputType): void {
		const index = indices[0];
		if (index < 0 || index >= this.elements.length) {
			throw new RangeError(
				`Index ${index} out of bounds for ${this.dataType} of length ${this.elements.length}`
			);
		}
		this.elements[index] = value as TElement;
	}

	clear(): TSelf {
		this.elements.length = 0;
		return this as unknown as TSelf;
	}

	/**
	 * Gets the number of current elements.
	 */
	count(): number {
		return this.elements.length;
	}

	dimensions(): number[] {
		return [this.elements.length];
	}

	// ─── Element access ────────────────────────────────────────────

	/**
	 * Iterate/mutate elements in-place.
	 */
	each(
		callback: (e: ParserInputType, i?: string | number, j?: string | number) => ParserInputType
	): TSelf {
		for (let i = 0; i < this.elements.length; i++) {
			this.elements[i] = callback(this.elements[i], i) as TElement;
		}
		return this as unknown as TSelf;
	}

	eq(other: ParserInputType): boolean {
		if (!this.dimensionsMatch(other)) {
			return false;
		}
		const otherElements = (other as unknown as MathematicalAggregate<TSelf, TElement>).elements;
		for (let i = 0; i < this.elements.length; i++) {
			if (!this.elements[i].eq(otherElements[i])) {
				return false;
			}
		}
		return true;
	}

	// ─── Element-wise comparisons ──────────────────────────────────

	gt(other: ParserInputType): boolean {
		if (!this.dimensionsMatch(other)) {
			return false;
		}
		const otherElements = (other as unknown as MathematicalAggregate<TSelf, TElement>).elements;
		for (let i = 0; i < this.elements.length; i++) {
			if (!this.elements[i].gt(otherElements[i])) {
				return false;
			}
		}
		return true;
	}

	gte(other: ParserInputType): boolean {
		return this.gt(other) || this.eq(other);
	}

	lt(other: ParserInputType): boolean {
		if (!this.dimensionsMatch(other)) {
			return false;
		}
		const otherElements = (other as unknown as MathematicalAggregate<TSelf, TElement>).elements;
		for (let i = 0; i < this.elements.length; i++) {
			if (!this.elements[i].lt(otherElements[i])) {
				return false;
			}
		}
		return true;
	}

	lte(other: ParserInputType): boolean {
		return this.lt(other) || this.eq(other);
	}

	sort(compareFn?: (a: ParserInputType, b: ParserInputType) => number): TSelf {
		if (compareFn) {
			this.elements.sort(compareFn);
			return this as unknown as TSelf;
		}

		this.elements.sort((a, b) => {
			const ta = a && typeof a.text === 'function' ? a.text() : String(a);
			const tb = b && typeof b.text === 'function' ? b.text() : String(b);
			return ta < tb ? -1 : ta > tb ? 1 : 0;
		});
		return this as unknown as TSelf;
	}
}
