import { MathematicalAggregate } from '../../common/classes/MathematicalAggregate';
import { isNerdamerNativeType } from '../../common/common';
import { toParserEntities } from '../../common/functions/structuredEntityUtils';
import { message, DimensionError, MathError, UnexpectedDataType } from '../../errors';
import { Collection } from '../collection/Collection';
import { Expression } from '../expression/Expression';
import { one, zero } from '../expression/shortcuts';
import { dataTypes, MATRIX, VECTOR } from '../parser/constants';
import { Polynomial } from '../polynomial/Polynomial';

import type { ParserEntity, ExpressionInput, NerdamerInput } from '../../types';
import type { Matrix } from '../matrix/Matrix';
import type { ParserValuesObject } from '../parser/types';

/**
 * An ordered, operable parser aggregate with heterogeneous {@link ParserEntity} elements.
 *
 * @remarks
 * Vector is not restricted to numeric linear-algebra values. General arithmetic
 * is element-wise: scalar operands are broadcast across the Vector, while Vector
 * operands are paired by position and must have the same length. Vector-to-Vector
 * {@link times} remains an element-wise product rather than an alias for {@link dot}.
 * A Matrix operand interprets this Vector as a row vector for the standard
 * `Vector * Matrix` product; orientation is supplied by operand position rather
 * than stored on the Vector.
 * Structural methods such as {@link append}, {@link insert}, {@link extend},
 * {@link reverse}, and {@link trim} mutate this Vector.
 *
 * True linear-algebra operations ({@link dot}, {@link cross}, and {@link norm})
 * require Expression elements. `dot` requires equal lengths, while `cross`
 * requires two three-element Vectors. These operations throw rather than
 * assigning arithmetic meaning to arbitrary aggregate elements.
 *
 * Construction from a Collection copies its elements. Construction from an
 * array normalizes inputs but retains existing parser entities; {@link copy}
 * deep-copies every element. Comparisons are component-wise predicates, not a
 * total ordering, and return false for a type or length mismatch.
 */
export class Vector extends MathematicalAggregate<Vector> {
	dataType: typeof VECTOR = VECTOR;
	elements: ParserEntity[];
	isEnumerable: boolean = true;
	precision?: number | undefined;

	/** Creates a Vector from normalized input values or a copied Collection. */
	constructor(elements?: NerdamerInput[] | Collection) {
		super();

		if (Collection.isCollection(elements)) {
			this.elements = elements.elements.map(e => e.copy());
		} else if (elements) {
			this.elements = toParserEntities(elements);
		} else {
			this.elements = [];
		}
	}

	/** Creates an Expression-only Vector from expression-compatible inputs. */
	static create(v: ExpressionInput[]): Vector {
		return new Vector(v.map(x => Expression.create(x)));
	}

	static isVector(obj: unknown): obj is Vector {
		return isNerdamerNativeType(obj, VECTOR);
	}

	protected getValuesArray(): ParserEntity[] {
		return [...this.elements];
	}

	protected setValuesArray(values: ParserEntity[]): void {
		this.elements = values;
	}

	/**
	 * Returns the element at the given zero-based index.
	 * Used by the parser for bracket indexing, e.g. [a, b, c][1] returns b.
	 *
	 * @param indices - Zero-based parser indices after index-base adjustment.
	 * @returns The stored parser entity.
	 * @throws {@link core!UnexpectedDataType} If the index is out of bounds.
	 */
	__get__(indices: number[]): ParserEntity {
		const index = indices[0];
		if (index < 0 || index >= this.elements.length) {
			throw new UnexpectedDataType(
				`Index ${index} out of bounds for Vector of length ${this.elements.length}`
			);
		}
		return this.elements[index];
	}

	/** Appends an existing parser entity by reference and returns this Vector. */
	add(x: ParserEntity): this {
		return this.append(x);
	}

	/**
	 * Appends an existing parser entity by reference.
	 * @param e - Element to append.
	 */
	append(e: ParserEntity): this {
		this.elements.push(e);
		return this;
	}

	arrayMap(callback: (e: ParserEntity) => unknown): unknown[] {
		const retval: unknown[] = [];
		for (let i = 0; i < this.elements.length; i++) {
			retval.push(callback(this.elements[i]));
		}
		return retval;
	}

	/**
	 * Returns the stored entity at a zero-based index without copying it.
	 * @param i - Zero-based index.
	 * @returns The entity, or `undefined` when the index is out of range.
	 */
	at(i: number): ParserEntity | undefined {
		return this.elements[i];
	}

	/**
	 * Removes all elements from the vector.
	 */
	clear(): this {
		this.elements = [];
		return this;
	}

	/** Copies the Vector and every contained entity. */
	copy(): Vector {
		const copy = new Vector();
		this.each((e, i) => {
			copy.elements[i] = e.copy();
			return e;
		});
		return this.copySymbolicAccessTo(copy);
	}

	/**
	 * Gets the number of current elements in the Vector.
	 * @returns Current length.
	 */
	count(): number {
		return this.elements.length;
	}

	/**
	 * Computes the three-dimensional cross product.
	 *
	 * @throws {@link core!DimensionError} Unless both Vectors have exactly three elements.
	 * @throws {@link core!UnexpectedDataType} If any required element is not an Expression.
	 */
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

	delete(x: ParserEntity): boolean {
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

	/**
	 * Divides corresponding elements, or broadcasts a scalar divisor.
	 *
	 * @remarks
	 * Vector-to-Vector division is element-wise and requires equal lengths. This is
	 * distinct from scalar division, which applies the same divisor to every element.
	 *
	 * @throws {@link core!DimensionError} If a Vector divisor has a different length.
	 */
	override div(x: NerdamerInput): Vector {
		if (Vector.isVector(x) && !this.dimensionsMatch(x)) {
			throw new DimensionError(message('mismatchedDimensions', { function: 'Vector.div' }));
		}
		return super.div(x);
	}

	/**
	 * Computes the sum of pairwise products.
	 *
	 * @throws {@link core!DimensionError} If the Vector lengths differ.
	 * @throws {@link core!UnexpectedDataType} If a required element is not an Expression.
	 */
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

	/**
	 * Visits or replaces elements in ascending index order.
	 * Returning `void` leaves the current element unchanged.
	 */
	each(callback: (e: ParserEntity, i: number) => ParserEntity | void): this {
		for (let i = 0; i < this.elements.length; i++) {
			const result = callback(this.elements[i], i);
			if (result !== undefined) {
				this.elements[i] = result;
			}
		}
		return this;
	}

	eq(V: ParserEntity): boolean {
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
	/** Evaluates a copied Vector, resolving symbolic bracket access when values are supplied. */
	evaluate(): Vector;
	evaluate(values: ParserValuesObject): ParserEntity;
	evaluate(values?: ParserValuesObject): ParserEntity {
		let retval: ParserEntity;
		const symbolicAccess = Expression.fromSymbolicAccess(this);

		if (symbolicAccess && values) {
			retval = symbolicAccess.evaluate(values);
		} else {
			const copy = this.copy();
			copy.each(e => (Expression.isExpression(e) ? e.evaluate(values) : e.evaluate()));
			retval = copy;
		}

		return retval;
	}

	/** Expands a copied Vector, leaving this one unchanged. */
	expand(): Vector {
		const copy = this.copy();
		copy.each(e => e.expand());
		return copy;
	}

	/**
	 * Appends another Vector's element references, mutating this Vector.
	 * @param v - Vector whose elements should be appended.
	 * @returns This Vector.
	 * @throws {@link core!UnexpectedDataType} If `v` is not a Vector.
	 */
	extend(v: ParserEntity) {
		if (!Vector.isVector(v)) {
			throw new UnexpectedDataType(
				message('vectorExpected', { type: dataTypes[v.dataType] })
			);
		}
		this.elements.push(...v.elements);
		return this;
	}

	/**
	 * Returns an element after verifying that it is an Expression.
	 * @param n - Zero-based index.
	 * @returns The stored Expression reference.
	 * @throws {@link core!UnexpectedDataType} If the stored entity is not an Expression.
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

	gt(V: ParserEntity): boolean {
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

	gte(V: ParserEntity): boolean {
		if (!Vector.isVector(V) || V.elements.length !== this.elements.length) {
			return false;
		}

		for (let i = 0; i < this.elements.length; i++) {
			if (!this.elements[i].gte(V.elements[i])) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Gets the index of the first element structurally equal to `x`.
	 * @param x - Value to locate.
	 * @returns The zero-based index, or `-1` when absent.
	 */
	indexOf(x: ParserEntity) {
		for (let i = 0; i < this.elements.length; i++) {
			const e = this.elements[i];
			if (e.eq(x)) {
				return i;
			}
		}
		return -1;
	}

	/**
	 * Inserts an entity by reference before the provided index.
	 * @param i - Zero-based insertion index.
	 * @param x - Entity to insert.
	 * @returns This mutated Vector.
	 */
	insert(i: number, x: ParserEntity): this {
		this.elements.splice(i, 0, x);
		return this;
	}

	lt(V: ParserEntity): boolean {
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

	lte(V: ParserEntity): boolean {
		if (!Vector.isVector(V) || V.elements.length !== this.elements.length) {
			return false;
		}

		for (let i = 0; i < this.elements.length; i++) {
			if (!this.elements[i].lte(V.elements[i])) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Subtracts corresponding elements, or broadcasts a scalar subtrahend.
	 *
	 * @throws {@link core!DimensionError} If a Vector operand has a different length.
	 */
	override minus(x: NerdamerInput): Vector {
		if (Vector.isVector(x) && !this.dimensionsMatch(x)) {
			throw new DimensionError(message('mismatchedDimensions', { function: 'Vector.minus' }));
		}
		return super.minus(x);
	}

	/**
	 * Returns the Euclidean norm `sqrt(sum(abs(element)^2))`.
	 * @throws {@link core!UnexpectedDataType} If any element is not an Expression.
	 */
	norm(): Expression {
		let sum = zero();
		for (let i = 0; i < this.elements.length; i++) {
			sum = sum.plus(this.getExpressionAt(i).abs().sq());
		}
		return sum.pow('1/2');
	}

	/**
	 * Adds corresponding elements, or broadcasts a scalar addend.
	 *
	 * @throws {@link core!DimensionError} If a Vector operand has a different length.
	 */
	override plus(x: NerdamerInput): Vector {
		if (Vector.isVector(x) && !this.dimensionsMatch(x)) {
			throw new DimensionError(message('mismatchedDimensions', { function: 'Vector.plus' }));
		}
		return super.plus(x);
	}

	/**
	 * Removes an element given an index. If none is provided it removes the last element.
	 * Indices are zero-based.
	 * @param index - Optional zero-based index.
	 * @returns The removed entity, or `undefined` when no entity is present.
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
	 * Raises corresponding elements to powers, or broadcasts a scalar exponent.
	 *
	 * @throws {@link core!DimensionError} If a Vector exponent has a different length.
	 */
	override pow(x: NerdamerInput): Vector {
		if (Vector.isVector(x) && !this.dimensionsMatch(x)) {
			throw new DimensionError(message('mismatchedDimensions', { function: 'Vector.pow' }));
		}
		return super.pow(x);
	}

	/**
	 * Multiplies all Expression elements in order.
	 * @returns Their product, or one for an empty Vector.
	 * @throws {@link core!UnexpectedDataType} If an element is not an Expression.
	 */
	prod(): Expression {
		let retval = one();
		this.each(e => {
			retval = retval.times(Expression.create(e));
		});
		return retval;
	}

	/**
	 * Removes the first element equal to `x`, rather than matching by reference.
	 * @param x - Value to remove.
	 * @returns This Vector, whether or not a match was found.
	 */
	remove(x: ParserEntity) {
		const index = this.indexOf(x);
		if (index !== -1) {
			this.elements.splice(index, 1);
		}
		return this;
	}

	/**
	 * Reverses the Vector in place.
	 * @returns This Vector.
	 */
	reverse(): this {
		this.elements.reverse();
		return this;
	}

	/**
	 * Adds all Expression elements in order.
	 * @returns Their sum, or zero for an empty Vector.
	 * @throws {@link core!UnexpectedDataType} If an element is not an Expression.
	 */
	sum(): Expression {
		let retval = zero();
		this.each(e => {
			retval = retval.plus(Expression.create(e));
		});
		return retval;
	}

	text(): string {
		const text = `[${this.elements.map(e => e.text()).join(', ')}]`;
		return this.formatSymbolicAccess(text);
	}

	/**
	 * Multiplies corresponding Vector elements, broadcasts a scalar factor, or
	 * multiplies this Vector from the left of a Matrix.
	 *
	 * @remarks
	 * Vector-to-Vector multiplication is the element-wise (Hadamard) product. Use
	 * {@link dot} when a scalar inner product is intended. For a Matrix operand,
	 * this Vector is interpreted as a row vector. Nonzero-width products reuse the
	 * existing Matrix-vector product through the transpose; a compatible zero-width
	 * Matrix has the empty Vector as its result because its transpose cannot be represented.
	 *
	 * @throws {@link core!DimensionError} If Vector dimensions are incompatible.
	 * @throws {@link core!MathError} If Matrix dimensions are incompatible.
	 */
	override times(x: NerdamerInput): Vector {
		let retval: Vector;

		if (isNerdamerNativeType(x, MATRIX)) {
			const matrix = x as Matrix;
			if (matrix.cols() === 0) {
				if (this.count() !== matrix.rows()) {
					throw new MathError(message('mismatchedDimensions', { function: 'Matrix.times' }));
				}
				retval = new Vector();
			} else {
				retval = matrix.transpose().times(this);
			}
		} else {
			if (Vector.isVector(x) && !this.dimensionsMatch(x)) {
				throw new DimensionError(message('mismatchedDimensions', { function: 'Vector.times' }));
			}
			retval = super.times(x);
		}

		return retval;
	}

	/** Interprets ordered elements as ascending polynomial coefficients. */
	toPolynomial(vars: string[] = ['x']): Polynomial {
		return Polynomial.fromArray(this.elements, vars);
	}

	/**
	 * Removes every element equal to zero.
	 * @returns This mutated Vector.
	 */
	trim() {
		const newElements: ParserEntity[] = [];
		for (const e of this.elements) {
			if (!e.eq(zero())) {
				newElements.push(e);
			}
		}
		this.elements = newElements;
		return this;
	}
}
