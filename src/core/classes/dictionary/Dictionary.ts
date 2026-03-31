import { StructuredEntity } from '../../common/classes/StructuredEntity';
import { UnexpectedDataType } from '../../errors';
import { DICTIONARY } from '../parser/constants';

import type { ParserInputType } from '../parser/types';

/**
 * A key-value container where keys are strings (variable names) and values
 * are any ParserInputType. Supports element-wise arithmetic operations.
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
	private _entries: Map<string, ParserInputType> = new Map();
	dataType = DICTIONARY;
	isEnumerable: boolean = true;
	/**
	 * A parser flag to let the parser know that this was returned from the RETURN function.
	 */
	isFunctionReturn = false;

	precision?: number | undefined;

	constructor(entries?: Map<string, ParserInputType>) {
		super();
		if (entries) {
			this._entries = entries;
		}
	}

	static isDictionary(obj: unknown): obj is Dictionary {
		if (obj === undefined) {
			return false;
		}
		return (obj as Dictionary).dataType === DICTIONARY;
	}

	/**
	 * Returns the element for the given string key.
	 * Used by the parser for bracket indexing: d[x] → d.getter('x')
	 */
	__get__(indices: number[] | string): ParserInputType {
		const key = typeof indices === 'string' ? indices : String(indices[0]);
		if (!this._entries.has(key)) {
			throw new UnexpectedDataType(
				`Key "${key}" not found in Dictionary. Available keys: ${this.keys().join(', ')}`
			);
		}
		return this._entries.get(key)!;
	}

	/**
	 * Sets the element for the given string key.
	 * Used by the parser for bracket assignment: d[x]: 5
	 */
	__set__(indices: number[] | string, value: ParserInputType): void {
		const key = typeof indices === 'string' ? indices : String(indices[0]);
		this._entries.set(key, value);
	}

	copy(): Dictionary {
		const entries = new Map<string, ParserInputType>();
		for (const [key, value] of this._entries) {
			entries.set(key, value.copy());
		}
		return new Dictionary(entries);
	}

	/**
	 * Number of entries.
	 */
	count(): number {
		return this._entries.size;
	}

	/**
	 * Removes a key-value pair.
	 */
	delete(key: string): boolean {
		return this._entries.delete(key);
	}

	dimensions(): number[] {
		return [this._entries.size];
	}

	/**
	 * Iterates over all entries. The callback receives the value and the string key.
	 * Mutates values in place.
	 */
	each(
		callback: (e: ParserInputType, i?: string | number, j?: string | number) => ParserInputType
	): Dictionary {
		for (const [key, value] of this._entries) {
			this._entries.set(key, callback(value, key));
		}
		return this;
	}

	/**
	 * Satisfies the StructuredEntity abstract property.
	 * Returns the values as an array for compatibility with element-wise operations.
	 */
	get elements(): ParserInputType[] {
		return [...this._entries.values()];
	}

	set elements(values: ParserInputType[]) {
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
	 * Returns all entries as [key, value] pairs.
	 */
	entries(): [string, ParserInputType][] {
		return [...this._entries.entries()];
	}

	eq(other: ParserInputType): boolean {
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

	evaluate() {
		return this.copy().each(e => e.evaluate());
	}

	expand(): Dictionary {
		const copy = this.copy();
		copy.each(e => e.expand());
		return copy;
	}

	/**
	 * Gets a value by key.
	 */
	get(key: string): ParserInputType | undefined {
		return this._entries.get(key);
	}

	gt(_other: ParserInputType): boolean {
		return false;
	}

	gte(other: ParserInputType): boolean {
		return this.eq(other);
	}

	/**
	 * Checks if a key exists.
	 */
	has(key: string): boolean {
		return this._entries.has(key);
	}

	/**
	 * Returns all keys.
	 */
	keys(): string[] {
		return [...this._entries.keys()];
	}

	lt(_other: ParserInputType): boolean {
		return false;
	}

	lte(other: ParserInputType): boolean {
		return this.eq(other);
	}

	/**
	 * Merges another Dictionary into this one. Existing keys are overwritten.
	 */
	merge(other: Dictionary): Dictionary {
		for (const [key, value] of other._entries) {
			this._entries.set(key, value);
		}
		return this;
	}

	/**
	 * Sets a key-value pair.
	 */
	set(key: string, value: ParserInputType): Dictionary {
		this._entries.set(key, value);
		return this;
	}

	text(): string {
		const pairs: string[] = [];
		for (const [key, value] of this._entries) {
			pairs.push(`${key} => ${value.text()}`);
		}
		return `{${pairs.join(', ')}}`;
	}

	/**
	 * Returns all values.
	 */
	values(): ParserInputType[] {
		return [...this._entries.values()];
	}
}
