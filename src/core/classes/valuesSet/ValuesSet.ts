import { MathematicalAggregate } from '../../common/classes/MathematicalAggregate';
import { SET } from '../parser/constants';

import type { ParserInputType } from '../parser/types';

/**
 * A mathematical set of parser values (Expression, Vector, Collection, Matrix, Equation, ...).
 * Elements are unique by semantic equality via `.eq`.
 *
 * NOTE: Iteration order is deterministic (insertion order) but has no mathematical meaning.
 */
export class ValuesSet extends MathematicalAggregate<ValuesSet> {
	dataType = SET;
	public elements: ParserInputType[];

	isCollectionOfValues: boolean = true;
	isFunctionReturn = false;
	precision?: number | undefined;

	constructor(values?: Iterable<ParserInputType>) {
		super();
		this.elements = [];
		if (values) {
			for (const v of values) {
				this.add(v);
			}
		}
	}

	static isValuesSet(obj: unknown): obj is ValuesSet {
		if (obj === undefined || obj === null) {
			return false;
		}
		return (obj as ValuesSet).dataType === SET;
	}

	protected getValuesArray(): ParserInputType[] {
		return [...this.elements];
	}

	protected setValuesArray(values: ParserInputType[]): void {
		this.elements = [];
		for (const v of values) {
			this.add(v);
		}
	}

	private indexOf(x: ParserInputType): number {
		for (let i = 0; i < this.elements.length; i++) {
			if (this.elements[i].eq(x)) {
				return i;
			}
		}
		return -1;
	}

	add(x: ParserInputType): ValuesSet {
		if (!this.has(x)) {
			this.elements.push(x);
		}
		return this;
	}

	addMany(x: ParserInputType[]) {
		for (const e of x) {
			this.add(e);
		}
		return this;
	}

	at(i: number): ParserInputType | undefined {
		return this.elements[i];
	}

	copy(): ValuesSet {
		const copy = new ValuesSet();
		for (let i = 0; i < this.elements.length; i++) {
			copy.add(this.elements[i].copy());
		}
		return copy;
	}

	delete(x: ParserInputType): boolean {
		const i = this.indexOf(x);
		if (i === -1) {
			return false;
		}
		this.elements.splice(i, 1);
		return true;
	}

	each(
		callback: (e: ParserInputType, i?: string | number, j?: string | number) => ParserInputType
	): ValuesSet {
		const next: ParserInputType[] = [];
		for (let i = 0; i < this.elements.length; i++) {
			const mapped = callback(this.elements[i], i);

			// Preserve insertion order for first occurrences only.
			let exists = false;
			for (let k = 0; k < next.length; k++) {
				if (next[k].eq(mapped)) {
					exists = true;
					break;
				}
			}
			if (!exists) {
				next.push(mapped);
			}
		}
		this.elements = next;
		return this;
	}

	eq(other: ParserInputType): boolean {
		if (!ValuesSet.isValuesSet(other)) {
			return false;
		}
		if (other.elements.length !== this.elements.length) {
			return false;
		}
		return this.lte(other) && other.lte(this);
	}

	evaluate() {
		return this.copy().each(e => e.evaluate());
	}

	expand(): ValuesSet {
		const copy = this.copy();
		copy.each(e => e.expand());
		return copy;
	}

	// --- Set-specific comparisons ---
	// Override the element-wise comparisons from MathematicalAggregate
	// since set equality is based on membership, not order.

	gt(other: ParserInputType): boolean {
		if (!ValuesSet.isValuesSet(other)) {
			return false;
		}
		return this.gte(other) && !this.eq(other);
	}

	gte(other: ParserInputType): boolean {
		if (!ValuesSet.isValuesSet(other)) {
			return false;
		}
		return (other as ValuesSet).lte(this);
	}

	has(x: ParserInputType): boolean {
		return this.indexOf(x) !== -1;
	}

	lt(other: ParserInputType): boolean {
		if (!ValuesSet.isValuesSet(other)) {
			return false;
		}
		return this.lte(other) && !this.eq(other);
	}

	lte(other: ParserInputType): boolean {
		if (!ValuesSet.isValuesSet(other)) {
			return false;
		}
		for (let i = 0; i < this.elements.length; i++) {
			if (!other.has(this.elements[i])) {
				return false;
			}
		}
		return true;
	}

	text(): string {
		return `{${this.elements.map(e => e.text()).join(', ')}}`;
	}
}
