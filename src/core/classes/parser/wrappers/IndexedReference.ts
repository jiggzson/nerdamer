import type { Dictionary } from '../../dictionary/Dictionary';
import type { ParserInputType, StructuredEntityType } from '../types';
/**
 * A lightweight wrapper that holds a reference to a structured entity and the indices
 * used to access it. This is pushed onto the output stack during indexing so that
 * the assign operator can detect it and call setter instead of getter.
 *
 * For any non-assign operator, the IndexedReference is resolved to its value via resolve().
 * The resolved value is cached so that repeated calls don't re-invoke the getter.
 */

export class IndexedReference {
	private _resolved: ParserInputType | null = null;
	dataType = 'INDEXED_REF';
	isEnumerable = false;

	constructor(
		public target: ParserInputType,
		public indices: number[] | string
	) {}

	copy() {
		return this.resolve().copy();
	}

	eq(other: ParserInputType) {
		return this.resolve().eq(other);
	}
	evaluate() {
		return this.resolve().evaluate();
	}
	expand() {
		return this.resolve().expand();
	}
	gt(other: ParserInputType) {
		return this.resolve().gt(other);
	}
	gte(other: ParserInputType) {
		return this.resolve().gte(other);
	}
	lt(other: ParserInputType) {
		return this.resolve().lt(other);
	}
	lte(other: ParserInputType) {
		return this.resolve().lte(other);
	}
	resolve(): ParserInputType {
		if (this._resolved === null) {
			if (typeof this.indices === 'string') {
				this._resolved = (this.target as Dictionary).__get__(this.indices);
			} else {
				this._resolved = (this.target as StructuredEntityType).__get__(this.indices);
			}
		}
		return this._resolved;
	}
	text() {
		return this.resolve().text();
	}
}
