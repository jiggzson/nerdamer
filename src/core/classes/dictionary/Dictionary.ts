import { StructuredEntity } from '../../common/classes/StructuredEntity';
import { isNerdamerNativeType } from '../../common/common';
import { UnexpectedDataType } from '../../errors';
import { DICTIONARY } from '../parser/constants';

import type { ParserEntity } from '../../types';

/**
 * A key-value container where keys are strings (variable names) and values
 * are any ParserEntity. Supports element-wise arithmetic operations.
 *
 * @remarks
 * The optional constructor Map is retained rather than copied. {@link set} and
 * {@link merge} also retain value references, while {@link copy} copies every
 * stored parser entity. Arrays returned by {@link keys}, {@link values}, and
 * {@link entries} are new arrays, but their values still refer to the stored
 * entities.
 *
 * Iteration and text output preserve Map insertion order. Replacing an existing
 * key does not move it. {@link each} can replace values in place; returning
 * nothing from its callback leaves a value unchanged. Use {@link forEach} for
 * observation-only traversal. Evaluation and expansion return deep copies.
 * Dictionaries support structural equality by key and value but define no
 * greater-than or less-than ordering.
 *
 * Syntax: {x => 1, y => 2, z => x+3}
 * Access: d[x] → 1, d[y] → 2
 * Assign: d[y]: 10
 */
export class Dictionary extends StructuredEntity<Dictionary> {
	/**
	 * Internal storage. The ordered map preserves insertion order for
	 * deterministic iteration and text output.
	 */
	private _entries: Map<string, ParserEntity> = new Map();
	dataType: typeof DICTIONARY = DICTIONARY;
	isEnumerable: boolean = true;

	precision?: number | undefined;

	/** Creates a Dictionary, retaining the supplied Map when present. */
	constructor(entries?: Map<string, ParserEntity>) {
		super();
		if (entries) {
			this._entries = entries;
		}
	}

	static isDictionary(obj: unknown): obj is Dictionary {
		return isNerdamerNativeType(obj, DICTIONARY);
	}

	/**
	 * Returns the element for the given string key.
	 * Used by the parser for bracket indexing: d[x] → d.getter('x')
	 */
	__get__(indices: number[] | string): ParserEntity {
		const key = typeof indices === 'string' ? indices : String(indices[0]);
		const value = this._entries.get(key);
		if (value === undefined) {
			throw new UnexpectedDataType(
				`Key "${key}" not found in Dictionary. Available keys: ${this.keys().join(', ')}`
			);
		}
		return value;
	}

	/**
	 * Sets the element for the given string key.
	 * Used by the parser for bracket assignment: d[x]: 5
	 */
	__set__(indices: number[] | string, value: ParserEntity): void {
		const key = typeof indices === 'string' ? indices : String(indices[0]);
		this._entries.set(key, value);
	}

	/** Copies the Dictionary, including every stored value. */
	copy(): Dictionary {
		const entries = new Map<string, ParserEntity>();
		for (const [key, value] of this._entries) {
			entries.set(key, value.copy());
		}
		return new Dictionary(entries);
	}

	/** Number of entries. */
	count(): number {
		return this._entries.size;
	}

	/** Removes a key-value pair. */
	delete(key: string): boolean {
		return this._entries.delete(key);
	}

	dimensions(): number[] {
		return [this._entries.size];
	}

	/**
	 * Visits or replaces entries in insertion order.
	 *
	 * Returning a ParserEntity replaces the current value. Returning `void` leaves
	 * that value unchanged, so callers can inspect a Dictionary without a dummy return.
	 * The callback receives the value and string key.
	 */
	each(
		callback: (
			e: ParserEntity,
			i?: string | number,
			j?: string | number
		) => ParserEntity | void
	): Dictionary {
		for (const [key, value] of this._entries) {
			const result = callback(value, key);
			if (result !== undefined) {
				this._entries.set(key, result);
			}
		}
		return this;
	}

	/**
	 * Satisfies the StructuredEntity abstract property.
	 * Returns the values as an array for compatibility with element-wise operations.
	 */
	get elements(): ParserEntity[] {
		return [...this._entries.values()];
	}

	set elements(values: ParserEntity[]) {
		// When StructuredEntity.binaryOp calls copy().each(...), the each method
		// mutates values in place via the keys, so this setter is mainly for
		// structural compatibility. Rebuild from existing keys.
		const keys = [...this._entries.keys()];
		this._entries.clear();
		for (let i = 0; i < keys.length && i < values.length; i++) {
			this._entries.set(keys[i], values[i]);
		}
	}

	/**
	 * Returns all entries in insertion order as a new pair array.
	 * Stored value objects are not copied.
	 */
	entries(): [string, ParserEntity][] {
		return [...this._entries.entries()];
	}

	eq(other: ParserEntity): boolean {
		if (!Dictionary.isDictionary(other)) {
			return false;
		}
		if (this._entries.size !== other._entries.size) {
			return false;
		}
		for (const [key, value] of this._entries) {
			const otherValue = other._entries.get(key);
			if (!otherValue || !value.eq(otherValue)) {
				return false;
			}
		}
		return true;
	}

	/** Evaluates a copied Dictionary, leaving this one unchanged. */
	evaluate(): Dictionary {
		return this.copy().each(e => e.evaluate());
	}

	expand(): Dictionary {
		const copy = this.copy();
		copy.each(e => e.expand());
		return copy;
	}

	/** Visits stored value references without changing the Dictionary. */
	forEach(callback: (value: ParserEntity, key: string) => void): void {
		for (const [key, value] of this._entries) {
			callback(value, key);
		}
	}

	/** Gets the stored value reference by key, or `undefined` when absent. */
	get(key: string): ParserEntity | undefined {
		return this._entries.get(key);
	}

	gt(_other: ParserEntity): boolean {
		return false;
	}

	gte(other: ParserEntity): boolean {
		return this.eq(other);
	}

	/** Checks if a key exists. */
	has(key: string): boolean {
		return this._entries.has(key);
	}

	/** Returns all keys. */
	keys(): string[] {
		return [...this._entries.keys()];
	}

	lt(_other: ParserEntity): boolean {
		return false;
	}

	lte(other: ParserEntity): boolean {
		return this.eq(other);
	}

	/**
	 * Merges another Dictionary into this one. Existing keys are overwritten and
	 * incoming value references are retained.
	 */
	merge(other: Dictionary): Dictionary {
		for (const [key, value] of other._entries) {
			this._entries.set(key, value);
		}
		return this;
	}

	/** Sets a key-value pair by reference and returns this Dictionary. */
	set(key: string, value: ParserEntity): Dictionary {
		this._entries.set(key, value);
		return this;
	}

	/** Iterates over `[key, value]` pairs in insertion order. */
	[Symbol.iterator](): IterableIterator<[string, ParserEntity]> {
		return this._entries[Symbol.iterator]();
	}

	text(): string {
		const pairs: string[] = [];
		for (const [key, value] of this._entries) {
			pairs.push(`${key} => ${value.text()}`);
		}
		return `{${pairs.join(', ')}}`;
	}

	/** Returns stored value references in insertion order in a new array. */
	values(): ParserEntity[] {
		return [...this._entries.values()];
	}
}
