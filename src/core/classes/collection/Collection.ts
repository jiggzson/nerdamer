import { StructuredEntity } from '../../common/classes/StructuredEntity';
import { isNerdamerNativeType } from '../../common/common';
import { COLLECTION } from '../parser/constants';

import type { ParserEntity } from '../../types';

/**
 * An ordered heterogeneous collection of parser entities.
 *
 * @remarks
 * The constructor retains the supplied array and its element references.
 * {@link getElements} likewise exposes the live backing array. Use {@link copy}
 * for an independent collection; it copies every contained parser entity.
 *
 * {@link each} and indexed assignment mutate the collection. A callback passed
 * to `each` may return a replacement value or return nothing to leave the
 * current value unchanged. Use {@link forEach} for observation-only iteration.
 * Evaluation and expansion operate on a deep copy. Equality and relational
 * predicates compare corresponding elements and return false for a non-Collection
 * or length mismatch; these component-wise predicates do not define a
 * lexicographic ordering for heterogeneous values.
 */
export class Collection extends StructuredEntity<Collection> {
	/** Runtime type discriminator for collections. */
	dataType: typeof COLLECTION = COLLECTION;
	/** Live array containing the collection's values. */
	elements: ParserEntity[] = [];
	/** Indicates that parser operations may be applied to each element. */
	isEnumerable: boolean = true;
	/** Precision metadata when the collection carries an approximate result. */
	precision?: number | undefined;

	/**
	 * Creates a Collection, retaining `elements` when it is supplied.
	 * @param elements - Initial backing array.
	 */
	constructor(elements?: ParserEntity[]) {
		super();
		if (elements) {
			this.elements = elements;
		} else {
			this.elements = [];
		}
	}

	/**
	 * Returns whether a value is a Collection.
	 * @param obj - Value to test.
	 */
	static isCollection(obj: unknown): obj is Collection {
		return isNerdamerNativeType(obj, COLLECTION);
	}

	/**
	 * Returns the element at the given index.
	 * @param indices A single-element array [i]
	 */
	__get__(indices: number[]): ParserEntity {
		const index = indices[0];
		if (index < 0 || index >= this.elements.length) {
			throw new RangeError(
				`Index ${index} out of bounds for Collection of length ${this.elements.length}`
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
				`Index ${index} out of bounds for Collection of length ${this.elements.length}`
			);
		}
		this.elements[index] = value;
	}

	/** Returns the stored entity reference at a zero-based index, or `undefined` when absent. */
	at(index: number): ParserEntity | undefined {
		return this.elements[index];
	}

	/** Copies the collection and every contained entity. */
	copy(): Collection {
		const copy = new Collection();
		this.each((e, i) => {
			copy.elements[i] = e.copy();
			return e;
		});
		return copy;
	}

	/** Returns the number of values in the collection. */
	count(): number {
		return this.elements.length;
	}

	/** Returns the collection length as a one-dimensional shape. */
	dimensions(): number[] {
		return [this.elements.length];
	}

	/**
	 * Visits or replaces values in ascending index order.
	 *
	 * Returning a ParserEntity replaces the current value. Returning `void` leaves
	 * that value unchanged, so callers can inspect a collection without a dummy return.
	 * Use {@link forEach} when no transformation is intended.
	 *
	 * @param callback - Function receiving each value and index.
	 */
	each(callback: (a: ParserEntity, b: number) => ParserEntity | void): this {
		for (let i = 0; i < this.elements.length; i++) {
			const current = this.elements[i];
			const result = callback(current, i);
			if (result !== undefined) {
				this.elements[i] = result;
			}
		}
		return this;
	}

	/**
	 * Tests whether another Collection has equal values in the same order.
	 * @param x - Value to compare.
	 */
	eq(x: ParserEntity): boolean {
		if (!Collection.isCollection(x) || x.elements.length !== this.elements.length) {
			return false;
		}

		for (let i = 0; i < this.elements.length; i++) {
			const a = this.elements[i];
			const b = x.elements[i];
			if (!a.eq(b)) {
				return false;
			}
		}
		return true;
	}

	/** Evaluates a copied collection, leaving this one unchanged. */
	evaluate(): Collection {
		const copy = this.copy();
		copy.each(e => e.evaluate());
		return copy;
	}

	/** Expands every value in a copied collection. */
	expand(): Collection {
		const copy = this.copy();
		copy.each(e => e.expand());
		return copy;
	}

	/** Visits stored entity references without changing the collection. */
	forEach(callback: (value: ParserEntity, index: number) => void): void {
		for (let i = 0; i < this.elements.length; i++) {
			callback(this.elements[i], i);
		}
	}

	/** Returns the live backing array; mutations to it affect this Collection. */
	getElements(): ParserEntity[] {
		return this.elements;
	}

	/**
	 * Tests whether every value is greater than its corresponding value.
	 * @param x - Value to compare.
	 */
	gt(x: ParserEntity): boolean {
		if (!Collection.isCollection(x) || x.elements.length !== this.elements.length) {
			return false;
		}

		for (let i = 0; i < this.elements.length; i++) {
			const a = this.elements[i];
			const b = x.elements[i];
			if (!a.gt(b)) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Tests component-wise greater-than-or-equal comparison.
	 * @param x - Value to compare.
	 */
	gte(x: ParserEntity): boolean {
		if (!Collection.isCollection(x) || x.elements.length !== this.elements.length) {
			return false;
		}

		for (let i = 0; i < this.elements.length; i++) {
			if (!this.elements[i].gte(x.elements[i])) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Tests whether every value is less than its corresponding value.
	 * @param x - Value to compare.
	 */
	lt(x: ParserEntity): boolean {
		if (!Collection.isCollection(x) || x.elements.length !== this.elements.length) {
			return false;
		}

		for (let i = 0; i < this.elements.length; i++) {
			const a = this.elements[i];
			const b = x.elements[i];
			if (!a.lt(b)) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Tests component-wise less-than-or-equal comparison.
	 * @param x - Value to compare.
	 */
	lte(x: ParserEntity): boolean {
		if (!Collection.isCollection(x) || x.elements.length !== this.elements.length) {
			return false;
		}

		for (let i = 0; i < this.elements.length; i++) {
			if (!this.elements[i].lte(x.elements[i])) {
				return false;
			}
		}
		return true;
	}

	/** Iterates over the stored entity references in insertion order. */
	[Symbol.iterator](): Iterator<ParserEntity> {
		return this.elements[Symbol.iterator]();
	}

	/** Returns the collection in Nerdamer notation. */
	text(): string {
		return `(${this.elements.map(e => e.text()).join(', ')})`;
	}

	/** Returns a new array containing the stored entity references in insertion order. */
	toArray(): ParserEntity[] {
		return [...this.elements];
	}
}
