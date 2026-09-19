import { StructuredEntity } from './StructuredEntity';

import type { ParserEntity } from '../../types';

/**
 * MathematicalAggregate
 *
 * Base class for linear iterable parser entities (Vector, ValuesSet, SolutionSet, ...).
 *
 * Elements are ParserEntity values at this shared level. Concrete subclasses may
 * narrow their public element storage where their own method guarantees it.
 */
export abstract class MathematicalAggregate<
	TSelf extends MathematicalAggregate<TSelf>,
> extends StructuredEntity<TSelf> {
	public abstract elements: ParserEntity[];

	/**
	 * Returns the element at the given index.
	 * @param indices A single-element array [i]
	 */
	__get__(indices: number[]): ParserEntity {
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
	__set__(indices: number[], value: ParserEntity): void {
		const index = indices[0];
		if (index < 0 || index >= this.elements.length) {
			throw new RangeError(
				`Index ${index} out of bounds for ${this.dataType} of length ${this.elements.length}`
			);
		}
		this.elements[index] = value;
	}

	clear(): this {
		this.elements.length = 0;
		return this;
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

	/**
	 * Visits or replaces elements in place.
	 * Returning `void` leaves the current element unchanged.
	 */
	each(
		this: TSelf,
		callback: (e: ParserEntity, i?: string | number, j?: string | number) => ParserEntity | void
	): TSelf {
		for (let i = 0; i < this.elements.length; i++) {
			const result = callback(this.elements[i], i);
			if (result !== undefined) {
				this.elements[i] = result;
			}
		}
		return this;
	}

	eq(other: ParserEntity): boolean {
		if (!this.dimensionsMatch(other)) {
			return false;
		}
		const otherElements = other.elements;
		for (let i = 0; i < this.elements.length; i++) {
			if (!this.elements[i].eq(otherElements[i])) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Visits every current element without changing the aggregate.
	 *
	 * This is the observation-only counterpart to {@link each}. Concrete subclasses may
	 * narrow the callback element type when their membership method guarantees a more
	 * specific entity.
	 */
	forEach(callback: (e: ParserEntity, index: number) => void): void {
		const elements = this.elements;
		for (let i = 0; i < elements.length; i++) {
			callback(elements[i], i);
		}
	}

	gt(other: ParserEntity): boolean {
		if (!this.dimensionsMatch(other)) {
			return false;
		}
		const otherElements = other.elements;
		for (let i = 0; i < this.elements.length; i++) {
			if (!this.elements[i].gt(otherElements[i])) {
				return false;
			}
		}
		return true;
	}

	//  Element-wise comparisons

	gte(other: ParserEntity): boolean {
		return this.gt(other) || this.eq(other);
	}

	lt(other: ParserEntity): boolean {
		if (!this.dimensionsMatch(other)) {
			return false;
		}
		const otherElements = other.elements;
		for (let i = 0; i < this.elements.length; i++) {
			if (!this.elements[i].lt(otherElements[i])) {
				return false;
			}
		}
		return true;
	}

	lte(other: ParserEntity): boolean {
		return this.lt(other) || this.eq(other);
	}

	sort(compareFn?: (a: ParserEntity, b: ParserEntity) => number): this {
		if (compareFn) {
			this.elements.sort(compareFn);
			return this;
		}

		this.elements.sort((a, b) => {
			const ta = a && typeof a.text === 'function' ? a.text() : String(a);
			const tb = b && typeof b.text === 'function' ? b.text() : String(b);
			return ta < tb ? -1 : ta > tb ? 1 : 0;
		});
		return this;
	}

	/** Returns an iterator over the aggregate's current public element view. */
	[Symbol.iterator](): Iterator<ParserEntity> {
		return this.elements[Symbol.iterator]();
	}

	/** Returns a new array containing the aggregate's current public element view. */
	toArray(): ParserEntity[] {
		return [...this.elements];
	}
}
