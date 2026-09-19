import { MathematicalAggregate } from '../../common/classes/MathematicalAggregate';
import { isNerdamerNativeType } from '../../common/common';
import { message, UnexpectedDataType, UnsupportedOperationError } from '../../errors';
import { SET, SOLUTIONS_SET } from '../parser/constants';

import type { NerdamerInput, ParserEntity } from '../../types';

/**
 * A finite mathematical set of Nerdamer parser values.
 *
 * @remarks
 * Membership and uniqueness use each element's `eq()` method rather than JavaScript
 * reference identity. Two members are considered equal only when both directional equality
 * checks agree, which keeps mixed-type membership independent of insertion order. This treatment is
 * conservative for symbolic values: if Nerdamer cannot establish that two
 * elements are equal, they remain distinct. Values whose entity types cannot be compared are
 * likewise treated as distinct members. In particular, set membership does not attempt theorem
 * proving beyond the equality semantics of the stored values.
 *
 * `ValuesSet` owns its elements. Values passed to the constructor or {@link add} are copied,
 * and {@link elements}, {@link at}, and indexed reads return copies. This prevents a caller
 * from changing a stored mutable object behind the set and silently violating uniqueness.
 * Mutation therefore goes through the set methods, which re-establish set uniqueness
 * after every supported change.
 *
 * Iteration order is deterministic insertion order so text output and direct traversal are
 * reproducible, but that order has no mathematical meaning. Equality and subset/superset
 * comparisons are membership-based and ignore order.
 *
 * The arithmetic methods inherited by other structured entities are rejected
 * here. Pairing two sets by insertion index would make arithmetic depend on a non-mathematical
 * ordering. Use the explicit finite-set operations on this class instead.
 */
export class ValuesSet extends MathematicalAggregate<ValuesSet> {
	private _elements: ParserEntity[] = [];
	dataType: typeof SET | typeof SOLUTIONS_SET = SET;

	isEnumerable: boolean = true;
	precision?: number | undefined;

	constructor(values?: Iterable<ParserEntity>) {
		super();
		if (values) {
			for (const v of values) {
				this.add(v);
			}
		}
	}

	/**
	 * Tests whether a value is a `ValuesSet` or a specialized `ValuesSet` subtype such as
	 * `SolutionSet`.
	 */
	static isValuesSet(obj: unknown): obj is ValuesSet {
		return (
			isNerdamerNativeType(obj, SET) || isNerdamerNativeType(obj, SOLUTIONS_SET)
		);
	}

	protected getValuesArray(): ParserEntity[] {
		return this.elements;
	}

	protected setValuesArray(values: ParserEntity[]): void {
		this.clear();
		for (const v of values) {
			this.add(v);
		}
	}

	private indexOf(x: ParserEntity): number {
		for (let i = 0; i < this._elements.length; i++) {
			if (this.membersEqual(this._elements[i], x)) {
				return i;
			}
		}
		return -1;
	}

	private membersEqual(a: ParserEntity, b: ParserEntity): boolean {
		let retval = false;
		try {
			// Parser-entity equality is not guaranteed to be symmetric across different
			// entity types. A set must not deduplicate values based on insertion direction,
			// so require both entities to agree that they represent the same member.
			retval = a.eq(b) && b.eq(a);
		} catch (e) {
			if (!(e instanceof UnexpectedDataType)) {
				throw e;
			}
		}
		return retval;
	}

	/**
	 * Reads an element for parser indexing.
	 *
	 * @throws A `RangeError` if the index is outside the current set size.
	 */
	override __get__(indices: number[]): ParserEntity {
		const index = indices[0];
		if (index < 0 || index >= this._elements.length) {
			throw new RangeError(
				`Index ${index} out of bounds for ${this.dataType} of length ${this._elements.length}`
			);
		}
		return this._elements[index].copy();
	}

	/**
	 * Replaces the insertion-order element at an index while preserving uniqueness.
	 *
	 * @remarks
	 * If the replacement is already present elsewhere in the set, the indexed element is
	 * removed instead of creating a duplicate. Indexed mutation is provided for parser
	 * compatibility; the index is not part of the mathematical identity of a set.
	 *
	 * @throws A `RangeError` if the index is outside the current set size.
	 */
	override __set__(indices: number[], value: ParserEntity): void {
		const index = indices[0];
		if (index < 0 || index >= this._elements.length) {
			throw new RangeError(
				`Index ${index} out of bounds for ${this.dataType} of length ${this._elements.length}`
			);
		}

		const replacement = value.copy();
		const duplicateIndex = this.indexOf(replacement);
		if (duplicateIndex !== -1 && duplicateIndex !== index) {
			this._elements.splice(index, 1);
		} else {
			this._elements[index] = replacement;
		}
	}

	/** Adds an element if no semantically equal member is already present. */
	add(x: ParserEntity): ValuesSet {
		if (!this.has(x)) {
			this._elements.push(x.copy());
		}
		return this;
	}

	/** Adds every value in the iterable while preserving set uniqueness. */
	addMany(x: Iterable<ParserEntity>): ValuesSet {
		for (const e of x) {
			this.add(e);
		}
		return this;
	}

	/**
	 * Returns a copy of the element at the requested insertion-order index.
	 *
	 * @returns A copy of the stored value, or `undefined` when the index is out of range.
	 */
	at(i: number): ParserEntity | undefined {
		const value = this._elements[i];
		return value ? value.copy() : undefined;
	}

	/** Removes every member from the set. */
	override clear(): this {
		this._elements.length = 0;
		return this;
	}

	/** Returns an independent set containing independent copies of all members. */
	copy(): ValuesSet {
		return new ValuesSet(this._elements);
	}

	/** Returns the current number of set members. */
	override count(): number {
		return this._elements.length;
	}

	/** Removes the member semantically equal to `x`, if one is present. */
	delete(x: ParserEntity): boolean {
		const i = this.indexOf(x);
		if (i === -1) {
			return false;
		}
		this._elements.splice(i, 1);
		return true;
	}

	/** Returns a new set containing members of this set that are absent from `other`. */
	difference(other: ValuesSet): ValuesSet {
		const retval = new ValuesSet();
		for (const value of this._elements) {
			if (!other.has(value)) {
				retval.add(value);
			}
		}
		return retval;
	}

	/** Returns the one-dimensional storage size used by parser indexing. */
	override dimensions(): number[] {
		return [this._elements.length];
	}

	/**
	 * Rejects binary division because finite sets do not define elementwise quotients.
	 *
	 * @throws {@link core!UnsupportedOperationError} Always.
	 */
	override div(_x: NerdamerInput): ValuesSet {
		throw new UnsupportedOperationError(message('unsupportedOperation'));
	}

	/**
	 * Visits or maps the current members in insertion order.
	 *
	 * Duplicate mapped values collapse to their first occurrence. The callback receives a
	 * copy of each stored member, so mutating an input inside the callback cannot alter the
	 * set unless that value is returned. Returning `void` leaves the current member unchanged.
	 */
	each(
		callback: (e: ParserEntity, i?: string | number, j?: string | number) => ParserEntity | void
	): this {
		const next: ParserEntity[] = [];
		for (let i = 0; i < this._elements.length; i++) {
			const current = this._elements[i].copy();
			const mapped = callback(current, i);
			const value = mapped === undefined ? this._elements[i] : mapped;

			// Preserve insertion order for first occurrences only.
			let exists = false;
			for (let k = 0; k < next.length; k++) {
				if (this.membersEqual(next[k], value)) {
					exists = true;
					break;
				}
			}
			if (!exists) {
				next.push(value.copy());
			}
		}
		this._elements = next;
		return this;
	}

	/**
	 * Returns a deep-copied snapshot of the set's current elements.
	 *
	 * Mutating the returned array or its members does not change this set. Use the set's
	 * mutation methods when the stored membership should change.
	 */
	get elements(): ParserEntity[] {
		return this._elements.map(e => e.copy());
	}

	/** Tests set equality by membership, independent of insertion order. */
	eq(other: ParserEntity): boolean {
		if (!ValuesSet.isValuesSet(other)) {
			return false;
		}
		if (other.count() !== this.count()) {
			return false;
		}
		return this.isSubsetOf(other);
	}

	/** Evaluates every member and returns a new set, collapsing equal results. */
	evaluate(): ValuesSet {
		return this.copy().each(e => e.evaluate());
	}

	/** Expands every member and returns a new set, collapsing equal results. */
	expand(): ValuesSet {
		return this.copy().each(e => e.expand());
	}

	/**
	 * Returns the proper-superset relation for compatibility with parser comparison syntax.
	 * Prefer {@link isProperSupersetOf} in direct set-oriented code.
	 */
	gt(other: ParserEntity): boolean {
		return ValuesSet.isValuesSet(other) && this.isProperSupersetOf(other);
	}

	/**
	 * Returns the superset relation for compatibility with parser comparison syntax.
	 * Prefer {@link isSupersetOf} in direct set-oriented code.
	 */
	gte(other: ParserEntity): boolean {
		return ValuesSet.isValuesSet(other) && this.isSupersetOf(other);
	}

	/** Tests whether a semantically equal member is present. */
	has(x: ParserEntity): boolean {
		return this.indexOf(x) !== -1;
	}

	/** Returns a new set containing only members present in both sets. */
	intersection(other: ValuesSet): ValuesSet {
		const retval = new ValuesSet();
		for (const value of this._elements) {
			if (other.has(value)) {
				retval.add(value);
			}
		}
		return retval;
	}

	/** Returns `true` when this set has no member in common with `other`. */
	isDisjointFrom(other: ValuesSet): boolean {
		for (const value of this._elements) {
			if (other.has(value)) {
				return false;
			}
		}
		return true;
	}

	/** Returns `true` when this set is a strict subset of `other`. */
	isProperSubsetOf(other: ValuesSet): boolean {
		return this.count() < other.count() && this.isSubsetOf(other);
	}

	/** Returns `true` when this set is a strict superset of `other`. */
	isProperSupersetOf(other: ValuesSet): boolean {
		return this.count() > other.count() && this.isSupersetOf(other);
	}

	/** Returns `true` when every member of this set is present in `other`. */
	isSubsetOf(other: ValuesSet): boolean {
		for (const value of this._elements) {
			if (!other.has(value)) {
				return false;
			}
		}
		return true;
	}

	/** Returns `true` when every member of `other` is present in this set. */
	isSupersetOf(other: ValuesSet): boolean {
		return other.isSubsetOf(this);
	}

	/**
	 * Returns the proper-subset relation for compatibility with parser comparison syntax.
	 * Prefer {@link isProperSubsetOf} in direct set-oriented code.
	 */
	lt(other: ParserEntity): boolean {
		return ValuesSet.isValuesSet(other) && this.isProperSubsetOf(other);
	}

	/**
	 * Returns the subset relation for compatibility with parser comparison syntax.
	 * Prefer {@link isSubsetOf} in direct set-oriented code.
	 */
	lte(other: ParserEntity): boolean {
		return ValuesSet.isValuesSet(other) && this.isSubsetOf(other);
	}

	/**
	 * Rejects binary subtraction because finite sets do not define elementwise subtraction.
	 *
	 * @throws {@link core!UnsupportedOperationError} Always.
	 */
	override minus(_x: NerdamerInput): ValuesSet {
		throw new UnsupportedOperationError(message('unsupportedOperation'));
	}

	/**
	 * Binary addition is not defined for finite sets. Use {@link union} for set union.
	 *
	 * @throws {@link core!UnsupportedOperationError} Always.
	 */
	override plus(_x: NerdamerInput): ValuesSet {
		throw new UnsupportedOperationError(message('unsupportedOperation'));
	}

	/**
	 * Rejects binary exponentiation because finite sets do not define elementwise powers.
	 *
	 * @throws {@link core!UnsupportedOperationError} Always.
	 */
	override pow(_x: NerdamerInput): ValuesSet {
		throw new UnsupportedOperationError(message('unsupportedOperation'));
	}

	/**
	 * Sorts the deterministic iteration order without changing mathematical membership.
	 * A custom comparator receives copies so it cannot mutate stored members as a side effect.
	 */
	override sort(compareFn?: (a: ParserEntity, b: ParserEntity) => number): this {
		if (compareFn) {
			this._elements.sort((a, b) => compareFn(a.copy(), b.copy()));
		} else {
			this._elements.sort((a, b) => {
				const ta = a && typeof a.text === 'function' ? a.text() : String(a);
				const tb = b && typeof b.text === 'function' ? b.text() : String(b);
				return ta < tb ? -1 : ta > tb ? 1 : 0;
			});
		}
		return this;
	}

	/** Returns a new set containing members present in exactly one of the two sets. */
	symmetricDifference(other: ValuesSet): ValuesSet {
		const retval = this.difference(other);
		retval.addMany(other.difference(this)._elements);
		return retval;
	}

	text(): string {
		return `{${this._elements.map(e => e.text()).join(', ')}}`;
	}

	/**
	 * Rejects binary multiplication because finite sets do not define elementwise products.
	 *
	 * @throws {@link core!UnsupportedOperationError} Always.
	 */
	override times(_x: NerdamerInput): ValuesSet {
		throw new UnsupportedOperationError(message('unsupportedOperation'));
	}

	/** Returns a new set containing members present in either set. */
	union(other: ValuesSet): ValuesSet {
		const retval = new ValuesSet(this._elements);
		retval.addMany(other._elements);
		return retval;
	}
}
