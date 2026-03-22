import Decimal from 'decimal.js';

/**
 * A high-performance set implementation for Decimal.js numbers.
 *
 * This class provides a complete set of operations for working with sets of
 * arbitrary-precision decimal numbers. It uses string representation internally
 * for efficient equality comparison and hashing.
 *
 * @example
 * ```typescript
 * const setA = new DecimalSet([1, 2, 3]);
 * const setB = new DecimalSet([2, 3, 4]);
 * const union = setA.union(setB); // {1, 2, 3, 4}
 * const intersection = setA.intersection(setB); // {2, 3}
 * ```
 */
export class DecimalSet {
	private readonly elements: Map<string, Decimal>;

	/**
	 * Creates a new DecimalSet.
	 *
	 * @param values - Optional array of values to initialize the set
	 */
	constructor(values?: Iterable<Decimal.Value>) {
		this.elements = new Map();
		if (values) {
			for (const value of values) {
				this.add(value);
			}
		}
	}

	/**
	 * Creates a DecimalSet from an array of values.
	 *
	 * @param values - Array of values
	 * @returns A new DecimalSet
	 */
	static from(values: Iterable<Decimal.Value>): DecimalSet {
		return new DecimalSet(values);
	}

	/**
	 * Creates a DecimalSet from a range of values.
	 *
	 * @param start - Start value (inclusive)
	 * @param end - End value (exclusive)
	 * @param step - Step size (default 1)
	 * @returns A new DecimalSet
	 */
	static range(start: Decimal.Value, end: Decimal.Value, step: Decimal.Value = 1): DecimalSet {
		const result = new DecimalSet();
		const startDec = new Decimal(start);
		const endDec = new Decimal(end);
		const stepDec = new Decimal(step);

		if (stepDec.isZero()) {
			throw new Error('Step cannot be zero');
		}

		if (stepDec.isPositive()) {
			let current = startDec;
			while (current.lessThan(endDec)) {
				result.add(current);
				current = current.plus(stepDec);
			}
		} else {
			let current = startDec;
			while (current.greaterThan(endDec)) {
				result.add(current);
				current = current.plus(stepDec);
			}
		}

		return result;
	}

	/**
	 * Adds a value to the set.
	 *
	 * @param value - The value to add
	 * @returns The set instance for chaining
	 */
	add(value: Decimal.Value): this {
		const decimal = new Decimal(value);
		const key = decimal.toString();
		this.elements.set(key, decimal);
		return this;
	}

	/**
	 * Removes all elements from the set.
	 */
	clear(): void {
		this.elements.clear();
	}

	/**
	 * Creates a shallow copy of the set.
	 */
	clone(): DecimalSet {
		const result = new DecimalSet();
		for (const [key, value] of this.elements) {
			result.elements.set(key, value);
		}
		return result;
	}

	/**
	 * Removes a value from the set.
	 *
	 * @param value - The value to remove
	 * @returns True if the value was present and removed, false otherwise
	 */
	delete(value: Decimal.Value): boolean {
		const key = new Decimal(value).toString();
		return this.elements.delete(key);
	}

	/**
	 * Creates a new set containing the difference (this \ other).
	 *
	 * @param other - The other set
	 * @returns A new set containing elements in this set but not in the other
	 */
	difference(other: DecimalSet): DecimalSet {
		const result = new DecimalSet();
		for (const [key, value] of this.elements) {
			if (!other.elements.has(key)) {
				result.elements.set(key, value);
			}
		}
		return result;
	}

	/**
	 * Checks if this set equals another set.
	 *
	 * @param other - The other set
	 * @returns True if both sets contain the same elements
	 */
	equals(other: DecimalSet): boolean {
		if (this.size !== other.size) {
			return false;
		}
		for (const key of this.elements.keys()) {
			if (!other.elements.has(key)) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Tests whether all elements pass the predicate test.
	 *
	 * @param predicate - Function to test each element
	 * @returns True if all elements pass the test
	 */
	every(predicate: (value: Decimal) => boolean): boolean {
		for (const value of this.elements.values()) {
			if (!predicate(value)) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Filters the set based on a predicate function.
	 *
	 * @param predicate - Function to test each element
	 * @returns A new set containing only elements that pass the test
	 */
	filter(predicate: (value: Decimal) => boolean): DecimalSet {
		const result = new DecimalSet();
		for (const [key, value] of this.elements) {
			if (predicate(value)) {
				result.elements.set(key, value);
			}
		}
		return result;
	}

	/**
	 * Executes a callback for each element in the set.
	 *
	 * @param callback - Function to execute for each element
	 * @param thisArg - Value to use as 'this' when executing callback
	 */
	forEach(
		callback: (value: Decimal, value2: Decimal, set: DecimalSet) => void,
		thisArg?: unknown
	): void {
		for (const value of this.elements.values()) {
			callback.call(thisArg, value, value, this);
		}
	}

	/**
	 * Checks if a value is in the set.
	 *
	 * @param value - The value to check
	 * @returns True if the value is in the set
	 */
	has(value: Decimal.Value): boolean {
		const key = new Decimal(value).toString();
		return this.elements.has(key);
	}

	/**
	 * Creates a new set containing the intersection of this set and another.
	 *
	 * @param other - The other set
	 * @returns A new set containing only elements present in both sets
	 */
	intersection(other: DecimalSet): DecimalSet {
		const result = new DecimalSet();
		// Iterate over the smaller set for better performance
		const [smaller, larger] = this.size <= other.size ? [this, other] : [other, this];

		for (const [key, value] of smaller.elements) {
			if (larger.elements.has(key)) {
				result.elements.set(key, value);
			}
		}
		return result;
	}

	/**
	 * Checks if this set is disjoint with another set.
	 *
	 * @param other - The other set
	 * @returns True if the sets have no elements in common
	 */
	isDisjointFrom(other: DecimalSet): boolean {
		// Iterate over the smaller set for better performance
		const [smaller, larger] = this.size <= other.size ? [this, other] : [other, this];

		for (const key of smaller.elements.keys()) {
			if (larger.elements.has(key)) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Checks if the set is empty.
	 */
	isEmpty(): boolean {
		return this.elements.size === 0;
	}

	/**
	 * Checks if this set is a proper subset of another set.
	 *
	 * @param other - The other set
	 * @returns True if this is a subset but not equal to the other set
	 */
	isProperSubsetOf(other: DecimalSet): boolean {
		return this.size < other.size && this.isSubsetOf(other);
	}

	/**
	 * Checks if this set is a proper superset of another set.
	 *
	 * @param other - The other set
	 * @returns True if this is a superset but not equal to the other set
	 */
	isProperSupersetOf(other: DecimalSet): boolean {
		return this.size > other.size && this.isSupersetOf(other);
	}

	/**
	 * Checks if this set is a subset of another set.
	 *
	 * @param other - The other set
	 * @returns True if all elements of this set are in the other set
	 */
	isSubsetOf(other: DecimalSet): boolean {
		if (this.size > other.size) {
			return false;
		}
		for (const key of this.elements.keys()) {
			if (!other.elements.has(key)) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Checks if this set is a superset of another set.
	 *
	 * @param other - The other set
	 * @returns True if all elements of the other set are in this set
	 */
	isSupersetOf(other: DecimalSet): boolean {
		return other.isSubsetOf(this);
	}

	/**
	 * Maps each element to a new value using a transform function.
	 *
	 * @param transform - Function to transform each element
	 * @returns A new set containing the transformed elements
	 */
	map(transform: (value: Decimal) => Decimal.Value): DecimalSet {
		const result = new DecimalSet();
		for (const value of this.elements.values()) {
			result.add(transform(value));
		}
		return result;
	}

	/**
	 * Returns the maximum value in the set.
	 *
	 * @returns The maximum value, or undefined if the set is empty
	 */
	max(): Decimal | undefined {
		if (this.elements.size === 0) {
			return undefined;
		}
		let maxValue: Decimal | undefined;
		for (const value of this.elements.values()) {
			if (maxValue === undefined || value.greaterThan(maxValue)) {
				maxValue = value;
			}
		}
		return maxValue;
	}

	/**
	 * Returns the minimum value in the set.
	 *
	 * @returns The minimum value, or undefined if the set is empty
	 */
	min(): Decimal | undefined {
		if (this.elements.size === 0) {
			return undefined;
		}
		let minValue: Decimal | undefined;
		for (const value of this.elements.values()) {
			if (minValue === undefined || value.lessThan(minValue)) {
				minValue = value;
			}
		}
		return minValue;
	}

	/**
	 * Returns the number of elements in the set.
	 */
	get size(): number {
		return this.elements.size;
	}

	/**
	 * Tests whether some element passes the predicate test.
	 *
	 * @param predicate - Function to test each element
	 * @returns True if at least one element passes the test
	 */
	some(predicate: (value: Decimal) => boolean): boolean {
		for (const value of this.elements.values()) {
			if (predicate(value)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Returns the sum of all values in the set.
	 *
	 * @returns The sum, or zero if the set is empty
	 */
	sum(): Decimal {
		let total = new Decimal(0);
		for (const value of this.elements.values()) {
			total = total.plus(value);
		}
		return total;
	}

	/**
	 * Returns an iterator over the values in the set (same as values()).
	 */
	*[Symbol.iterator](): IterableIterator<Decimal> {
		yield* this.values();
	}

	/**
	 * Creates a new set containing the symmetric difference.
	 *
	 * @param other - The other set
	 * @returns A new set containing elements in either set but not both
	 */
	symmetricDifference(other: DecimalSet): DecimalSet {
		const result = new DecimalSet();
		for (const [key, value] of this.elements) {
			if (!other.elements.has(key)) {
				result.elements.set(key, value);
			}
		}
		for (const [key, value] of other.elements) {
			if (!this.elements.has(key)) {
				result.elements.set(key, value);
			}
		}
		return result;
	}

	/**
	 * Converts the set to an array.
	 */
	toArray(): Decimal[] {
		return Array.from(this.elements.values());
	}

	/**
	 * Returns a sorted array of the set's elements.
	 *
	 * @param compareFn - Optional comparison function
	 * @returns Sorted array of elements
	 */
	toSorted(compareFn?: (a: Decimal, b: Decimal) => number): Decimal[] {
		const array = this.toArray();
		if (compareFn) {
			return array.sort(compareFn);
		}
		return array.sort((a, b) => a.comparedTo(b));
	}

	/**
	 * Creates a string representation of the set.
	 */
	toString(): string {
		const elements = this.toSorted()
			.map(d => d.toString())
			.join(', ');
		return `DecimalSet { ${elements} }`;
	}

	/**
	 * Creates a new set containing the union of this set and another.
	 *
	 * @param other - The other set
	 * @returns A new set containing all elements from both sets
	 */
	union(other: DecimalSet): DecimalSet {
		const result = new DecimalSet();
		for (const [key, value] of this.elements) {
			result.elements.set(key, value);
		}
		for (const [key, value] of other.elements) {
			result.elements.set(key, value);
		}
		return result;
	}

	/**
	 * Returns an iterator over the values in the set.
	 */
	*values(): IterableIterator<Decimal> {
		for (const decimal of this.elements.values()) {
			yield decimal;
		}
	}
}
