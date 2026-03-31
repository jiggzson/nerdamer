import { StructuredEntity } from '../../common/classes/StructuredEntity';
import { COLLECTION } from '../parser/constants';

import type { Scope } from '../../common/classes/Scope';
import type { ParserInputType } from '../parser/types';

export class Collection extends StructuredEntity<Collection> {
	dataType = COLLECTION;
	elements: ParserInputType[] | Scope = [];
	isEnumerable: boolean = true;
	/**
	 * A parser flag to let the parser know that this was returned from an internal function call.
	 */
	isFunctionReturn = false;
	precision?: number | undefined;

	constructor(elements?: ParserInputType[] | Scope) {
		super();
		if (elements) {
			this.elements = elements;
		} else {
			this.elements = [];
		}
	}

	static isCollection(obj: unknown): obj is Collection {
		if (obj === undefined) {
			return false;
		}
		return (obj as Collection).dataType === COLLECTION;
	}

	/**
	 * Returns the element at the given index.
	 * @param indices A single-element array [i]
	 */
	__get__(indices: number[]): ParserInputType {
		const index = indices[0];
		if (index < 0 || index >= this.elements.length) {
			throw new RangeError(
				`Index ${index} out of bounds for Collection of length ${this.elements.length}`
			);
		}
		return this.elements[index] as ParserInputType;
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
				`Index ${index} out of bounds for Collection of length ${this.elements.length}`
			);
		}
		this.elements[index] = value;
	}

	copy() {
		const copy = new Collection();
		this.each((e, i) => {
			copy.elements[i as number] = e.copy();
			return e;
		});
		return copy;
	}

	count() {
		return this.elements.length;
	}

	dimensions(): number[] {
		return [this.elements.length];
	}

	each(callback: (a: ParserInputType, b: string | number) => ParserInputType): this {
		for (let i = 0; i < this.elements.length; i++) {
			const result = callback(this.elements[i] as ParserInputType, i);
			this.elements[i] = result;
		}
		return this;
	}

	eq(x: ParserInputType): boolean {
		if (!Collection.isCollection(x) || x.elements.length !== this.elements.length) {
			return false;
		}

		for (let i = 0; i < this.elements.length; i++) {
			const a = this.elements[i] as ParserInputType;
			const b = x.elements[i] as ParserInputType;
			if (!a.eq(b)) {
				return false;
			}
		}
		return true;
	}

	evaluate() {
		const copy = this.copy();
		copy.each(e => e.evaluate());
		return copy;
	}

	expand(): Collection {
		const copy = this.copy();
		copy.each(e => e.expand());
		return copy;
	}

	getElements(): ParserInputType[] {
		return this.elements as ParserInputType[];
	}

	gt(x: ParserInputType): boolean {
		if (!Collection.isCollection(x) || x.elements.length !== this.elements.length) {
			return false;
		}

		for (let i = 0; i < this.elements.length; i++) {
			const a = this.elements[i] as ParserInputType;
			const b = x.elements[i] as ParserInputType;
			if (!a.gt(b)) {
				return false;
			}
		}
		return true;
	}

	gte(x: ParserInputType) {
		return this.gt(x) || this.eq(x);
	}

	lt(x: ParserInputType): boolean {
		if (!Collection.isCollection(x) || x.elements.length !== this.elements.length) {
			return false;
		}

		for (let i = 0; i < this.elements.length; i++) {
			const a = this.elements[i] as ParserInputType;
			const b = x.elements[i] as ParserInputType;
			if (!a.lt(b)) {
				return false;
			}
		}
		return true;
	}

	lte(x: ParserInputType) {
		return this.lt(x) || this.eq(x);
	}

	text(): string {
		return `(${this.elements.map(e => e.text()).join(', ')})`;
	}
}
