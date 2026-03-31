import { sqrt } from '../../../math/math';
import { MathematicalAggregate } from '../../common/classes/MathematicalAggregate';
import { toParserInputType } from '../../common/functions/structuredEntityUtils';
import { message, DimensionError, UnexpectedDataType } from '../../errors';
import { Collection } from '../collection/Collection';
import { Expression } from '../expression/Expression';
import { one, zero } from '../expression/shortcuts';
import { dataTypes, VECTOR } from '../parser/constants';
import { Parser } from '../parser/Parser';
import { Polynomial } from '../polynomial/Polynomial';

import type { ParserInputType, ExpressionInputType, SupportedInputType } from '../parser/types';

// Vector extends Collation
export class Vector extends MathematicalAggregate<Vector> {
	dataType = VECTOR;
	elements: ParserInputType[];
	isEnumerable: boolean = true;
	/**
	 * A parser flag to let the parser know that this was returned from an internal function call.
	 */
	isFunctionReturn = false;
	precision?: number | undefined;

	constructor(elements?: SupportedInputType[] | Collection) {
		super();

		if (elements instanceof Collection) {
			this.elements = [];
			const src = elements.elements;
			for (let i = 0; i < src.length; i++) {
				this.elements.push(Parser.parse(src[i].text()));
			}
		} else if (elements) {
			this.elements = toParserInputType(elements);
		} else {
			this.elements = [];
		}
	}

	static create(v: ExpressionInputType[]): Vector {
		return new Vector(v.map(x => Expression.create(x)));
	}

	static isVector(obj: unknown): obj is Vector {
		if (obj === undefined) {
			return false;
		}
		return (obj as Vector).dataType === VECTOR;
	}

	protected getValuesArray(): ParserInputType[] {
		return [...this.elements];
	}

	protected setValuesArray(values: ParserInputType[]): void {
		this.elements = values;
	}

	/**
	 * Returns the element at the given zero-based index.
	 * Used by the parser for bracket indexing, e.g. [a, b, c][1] returns b.
	 *
	 * @param index Zero-based index (after INDEX_BASE adjustment)
	 * @returns
	 */
	__get__(indices: number[]): ParserInputType {
		const index = indices[0];
		if (index < 0 || index >= this.elements.length) {
			throw new UnexpectedDataType(
				`Index ${index} out of bounds for Vector of length ${this.elements.length}`
			);
		}
		return this.elements[index];
	}

	add(x: ParserInputType): Vector {
		return this.append(x);
	}

	/**
	 * Add an element to this vector
	 * @param e
	 */
	append(e: ParserInputType) {
		this.elements.push(e);
		return this;
	}

	arrayMap(callback: (e: ParserInputType) => unknown): unknown[] {
		const retval: unknown[] = [];
		for (let i = 0; i < this.elements.length; i++) {
			retval.push(callback(this.elements[i]));
		}
		return retval;
	}

	/**
	 * Returns an element at the given index
	 * @param i
	 * @returns
	 */
	at(i: number) {
		return this.elements[i];
	}

	/**
	 * Removes all elements from the vector.
	 */
	clear(): Vector {
		this.elements = [];
		return this;
	}

	copy() {
		const copy = new Vector();
		this.each((e, i) => {
			copy.elements[i!] = e.copy();
			return e;
		});
		return copy;
	}

	/**
	 * Gets the number of current elements in the vector.
	 * @returns
	 */
	count() {
		return this.elements.length;
	}

	cross(v: Vector): Vector {
		if (this.elements.length !== 3 || v.elements.length !== 3) {
			throw new DimensionError(message('incorrectCrossDimension'));
		}

		const a = this.getExpressionAt(0);
		const b = this.getExpressionAt(1);
		const c = this.getExpressionAt(2);
		const d = v.getExpressionAt(0);
		const e = v.getExpressionAt(1);
		const f = v.getExpressionAt(2);

		return Vector.create([
			b.times(f).minus(c.times(e)),
			c.times(d).minus(a.times(f)),
			a.times(e).minus(b.times(d)),
		]);
	}

	delete(x: ParserInputType): boolean {
		const index = this.indexOf(x);
		if (index === -1) {
			return false;
		}
		this.elements.splice(index, 1);
		return true;
	}

	dimensions(): number[] {
		return [this.elements.length];
	}

	dot(v: Vector): Expression {
		if (this.elements.length !== v.elements.length) {
			throw new DimensionError(message('mismatchedDimensions', { function: 'Vector.dot' }));
		}

		let product = zero();
		for (let i = 0; i < this.elements.length; i++) {
			product = product.plus(this.getExpressionAt(i).times(v.getExpressionAt(i)));
		}
		return product;
	}

	each(
		callback: (e: ParserInputType, i?: string | number, j?: string | number) => ParserInputType
	): Vector {
		for (let i = 0; i < this.elements.length; i++) {
			const result = callback(this.elements[i] as ParserInputType, i);
			this.elements[i] = result;
		}
		return this;
	}

	eq(V: ParserInputType): boolean {
		if (!Vector.isVector(V) || V.elements.length !== this.elements.length) {
			return false;
		}

		for (let i = 0; i < this.elements.length; i++) {
			if (!this.elements[i].eq(V.elements[i])) {
				return false;
			}
		}
		return true;
	}

	evaluate() {
		return this.copy().each(e => e.evaluate());
	}

	expand(): Vector {
		const copy = this.copy();
		copy.each(e => e.expand());
		return copy;
	}

	/**
	 * Appends the elements of a Vector to current vector's elements. The Vector is mutated.
	 * @param v
	 * @returns
	 */
	extend(v: ParserInputType) {
		if (!Vector.isVector(v)) {
			throw new UnexpectedDataType(
				message('vectorExpected', { type: dataTypes[v.dataType] })
			);
		}
		this.elements.push(...v.elements);
		return this;
	}

	/**
	 * Similar to at but ensures that the element is of type Expression
	 * @param n
	 * @returns
	 */
	getExpressionAt(n: number): Expression {
		const e = this.elements[n];
		if (!Expression.isExpression(e)) {
			throw new UnexpectedDataType(
				message('expressionExpected', { type: dataTypes[e.dataType] })
			);
		}
		return e;
	}

	gt(V: ParserInputType): boolean {
		if (!Vector.isVector(V) || V.elements.length !== this.elements.length) {
			return false;
		}

		for (let i = 0; i < this.elements.length; i++) {
			if (!this.elements[i].gt(V.elements[i])) {
				return false;
			}
		}
		return true;
	}

	gte(x: ParserInputType) {
		return this.gt(x) || this.eq(x);
	}

	/**
	 * Get the index of the first element equal to x
	 * @param x
	 * @returns
	 */
	indexOf(x: ParserInputType) {
		for (let i = 0; i < this.elements.length; i++) {
			const e = this.elements[i];
			if (e.eq(x)) {
				return i;
			}
		}
		return -1;
	}

	/**
	 * Inserts and element in the Vector before the provided index
	 * @param i
	 * @param x
	 * @returns
	 */
	insert(i: number, x: ParserInputType) {
		this.elements.splice(i, 0, x);
		return this;
	}

	lt(V: ParserInputType): boolean {
		if (!Vector.isVector(V) || V.elements.length !== this.elements.length) {
			return false;
		}

		for (let i = 0; i < this.elements.length; i++) {
			if (!this.elements[i].lt(V.elements[i])) {
				return false;
			}
		}
		return true;
	}

	lte(x: ParserInputType) {
		return this.lt(x) || this.eq(x);
	}

	norm(): Expression {
		let sum = zero();
		for (let i = 0; i < this.elements.length; i++) {
			sum = sum.plus(this.getExpressionAt(i).sq());
		}
		return sqrt(sum);
	}

	/**
	 * Removes an element given an index. If none is provided it removes the last element.
	 * Indices are zero-based.
	 * @param index
	 * @returns
	 */
	pop(index?: number) {
		let removed;
		if (typeof index !== 'undefined') {
			removed = this.elements.splice(index, 1)[0];
		} else {
			removed = this.elements.pop();
		}
		return removed;
	}

	/**
	 * Multiplies an array of Expressions.
	 * @throws {UnexpectedDataType} Will throw if the Vector contains any data type other than expressions
	 * @returns
	 */
	prod() {
		let retval = one();
		this.each(e => {
			retval = retval.times(Expression.create(e));
			return e;
		});
		return retval;
	}

	/**
	 * Removes an element from the vector by equality not reference
	 * @param x
	 * @returns
	 */
	remove(x: ParserInputType) {
		const index = this.indexOf(x);
		if (index !== -1) {
			this.elements.splice(index, 1);
		}
		return this;
	}

	/**
	 * Reverses the vector.
	 * @returns
	 */
	reverse() {
		this.elements.reverse();
		return this;
	}

	/**
	 * Multiplies an array of Expressions.
	 * @throws {UnexpectedDataType} Will throw if the Vector contains any data type other than expressions
	 * @returns
	 */
	sum() {
		let retval = zero();
		this.each(e => {
			retval = retval.plus(Expression.create(e));
			return e;
		});
		return retval;
	}

	text(): string {
		return `[${this.elements.map(e => e.text()).join(', ')}]`;
	}

	toPolynomial(vars: string[] = ['x']): Polynomial {
		return Polynomial.fromArray(this.elements, vars);
	}

	/**
	 * Removes zero values from the vector
	 * @returns
	 */
	trim() {
		const newElements: ParserInputType[] = [];
		for (const e of this.elements) {
			if (!e.eq(zero())) {
				newElements.push(e);
			}
		}
		this.elements = newElements;
		return this;
	}
}
