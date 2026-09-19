import { isNerdamerNativeType } from '../../../common/common';
import { INDEXED_REFERENCE } from '../constants';

import type { ParserEntity, StructuredEntityType } from '../../../types';
import type { Dictionary } from '../../dictionary/Dictionary';
/**
 * A lightweight wrapper that holds a reference to a structured entity and the indices
 * used to access it. This is pushed onto the output stack during indexing so that
 * the assign operator can detect it and call setter instead of getter.
 *
 * For any non-assign operator, the IndexedReference is resolved to its value via resolve().
 * The resolved value is cached so that repeated calls don't re-invoke the getter.
 */

export class IndexedReference {
	private _resolved: ParserEntity | null = null;
	dataType: typeof INDEXED_REFERENCE = INDEXED_REFERENCE;
	isEnumerable = false;

	constructor(
		public target: ParserEntity,
		public indices: number[] | string,
		public targetName?: string
	) {}

	static isIndexedReference(obj: unknown): obj is IndexedReference {
		return isNerdamerNativeType(obj, INDEXED_REFERENCE);
	}

	copy() {
		return this.resolve().copy();
	}

	eq(other: ParserEntity) {
		return this.resolve().eq(other);
	}
	evaluate() {
		return this.resolve().evaluate();
	}
	expand() {
		return this.resolve().expand();
	}
	gt(other: ParserEntity) {
		return this.resolve().gt(other);
	}
	gte(other: ParserEntity) {
		return this.resolve().gte(other);
	}
	lt(other: ParserEntity) {
		return this.resolve().lt(other);
	}
	lte(other: ParserEntity) {
		return this.resolve().lte(other);
	}
	resolve(): ParserEntity {
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
