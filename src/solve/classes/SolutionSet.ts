import Decimal from 'decimal.js';

import { Expression } from '../../core/classes/expression/Expression';
import { ALL_SYMBOL, INDEX_VARIABLE, SOLUTIONS_SET } from '../../core/classes/parser/constants';
import { ValuesSet } from '../../core/classes/valuesSet/ValuesSet';
import { isNerdamerNativeType } from '../../core/common/common';
import { DivisionByZeroError, message, UnexpectedDataType } from '../../core/errors';

import type { ParserEntity } from '../../core/types';
import type { Root } from './FunctionSolver';

/** Describes whether accepted solutions were produced by numerical strategies, symbolic strategies, or both. */
export type SolutionsType = 'numeric' | 'symbolic' | 'mixed' | undefined;

/** Describes whether the stored descriptors represent finite solutions, indexed families, or all values. */
export type SolutionForm = 'finite' | 'parametric' | 'all';

/**
 * A finite set of solution descriptors with solver-specific metadata.
 *
 * @remarks
 * `SolutionSet` inherits the finite-set storage semantics of {@link ValuesSet}: accepted
 * descriptors are unique by symbolic equality, insertion order has no mathematical meaning,
 * and values exposed through {@link elements} are copies rather than mutable references into
 * the set. A descriptor normally represents one solution, but a descriptor containing the
 * reserved `_n` index represents a parameterized family where `_n` ranges over the integers.
 * The special `all` descriptor represents every value of the solved variable. Consequently,
 * {@link count} reports the number of stored descriptors, not the cardinality of the
 * mathematical solution set.
 *
 * {@link solutionsType} records solver provenance: whether accepted descriptors came from
 * numerical strategies, symbolic/exact strategies, or both. It is not inferred from the
 * printed shape of a descriptor, so a symbolic strategy may produce a value such as `1`.
 * The orthogonal {@link solutionForm} property is derived from representation and distinguishes
 * finite results, `_n`-indexed parametric families, and the `all` result.
 *
 * The class narrows membership to {@link Expression} values and keeps rejected singular
 * candidates and numerical root metadata alongside the accepted solutions.
 *
 * Excluded values are enforced solver state, not merely advisory metadata. Once a value is excluded,
 * adding the same value does not reintroduce it; excluding an already accepted value removes
 * it from the solution set. {@link copy} preserves accepted values, exclusions, raw roots,
 * partial-result state, solution type, and the unresolved expression when one is present.
 */
export class SolutionSet extends ValuesSet {
	private excluded = new ValuesSet();
	private roots: Root[] = [];
	override dataType: typeof SOLUTIONS_SET = SOLUTIONS_SET;
	partial = false;
	/** Solver provenance for the currently accepted descriptors. */
	solutionsType: SolutionsType = undefined;
	unsolved?: Expression;

	constructor(values?: Iterable<Expression>) {
		super();
		if (values) {
			for (const v of values) {
				this.add(v);
			}
		}
	}

	/** Tests whether a value is specifically a solver `SolutionSet`. */
	static isSolutionSet(obj: unknown): obj is SolutionSet {
		return isNerdamerNativeType(obj, SOLUTIONS_SET);
	}

	/**
	 * Combines numerical/symbolic provenance without changing any other solver state.
	 */
	private mergeSolutionsType(solutionsType: SolutionsType): void {
		if (this.solutionsType === undefined) {
			this.solutionsType = solutionsType;
		} else if (solutionsType !== undefined && this.solutionsType !== solutionsType) {
			this.solutionsType = 'mixed';
		}
	}

	/**
	 * Verifies and admits one candidate, reporting whether it belongs to this result after
	 * verification. Keeping this decision inside the same path used by {@link addSolution}
	 * avoids mistaking a pre-existing equal descriptor for a newly verified source candidate.
	 */
	private verifyAndAddSolution(
		solution: Expression,
		forFunction: Expression,
		variable: string
	): boolean {
		let retval = false;
		try {
			const evaluated = forFunction
				.evaluate({ [variable]: solution.evaluate() })
				.expand();
			const isClosed = evaluated.variables().length === 0;
			// Preserve parameterized candidates that cannot yet be verified, but
			// require every closed residual, including complex values, to be zero.
			if ((isClosed && evaluated.isNearlyZero()) || !isClosed) {
				this.add(solution);
				retval = this.has(solution);
			}
		} catch (e) {
			if (e instanceof DivisionByZeroError) {
				this.excluded.add(solution);
				this.delete(solution);
			}
		}
		return retval;
	}

	/**
	 * Replaces a parser-indexed solution while preserving Expression-only membership and
	 * uniqueness.
	 */
	override __set__(indices: number[], value: ParserEntity): void {
		if (!Expression.isExpression(value)) {
			throw new UnexpectedDataType(
				message('expressionExpected', { type: value.dataType })
			);
		}
		if (this.excluded.has(value)) {
			const index = indices[0];
			if (index < 0 || index >= this.count()) {
				throw new RangeError(
					`Index ${index} out of bounds for ${this.dataType} of length ${this.count()}`
				);
			}
			const current = this.at(index);
			if (current) {
				this.delete(current);
			}
		} else {
			super.__set__(indices, value);
		}
	}

	/**
	 * Adds an accepted solution unless it is already present or explicitly excluded.
	 */
	override add(x: Expression): SolutionSet {
		if (!Expression.isExpression(x)) {
			const entity = x as unknown as ParserEntity;
			throw new UnexpectedDataType(
				message('expressionExpected', { type: entity.dataType })
			);
		}
		if (!this.excluded.has(x)) {
			super.add(x);
		}
		return this;
	}

	/**
	 * Adds accepted solutions while preserving uniqueness and exclusions.
	 * The iterable is validated before the set is changed, so invalid input cannot leave a
	 * partially updated result.
	 */
	override addMany(x: Iterable<Expression>): SolutionSet {
		const values = [...x];
		for (const value of values) {
			if (!Expression.isExpression(value)) {
				const entity = value as unknown as ParserEntity;
				throw new UnexpectedDataType(
					message('expressionExpected', { type: entity.dataType })
				);
			}
		}
		for (const value of values) {
			this.add(value);
		}
		return this;
	}

	/**
	 * Stores numerical root-refinement metadata independently of the caller's object.
	 */
	public addRawRoot(root: Root): SolutionSet {
		this.roots.push({
			root: new Decimal(root.root),
			iterations: root.iterations,
			converged: root.converged,
			error: new Decimal(root.error),
			errorMsg: root.errorMsg,
		});
		return this;
	}

	/**
	 * Verifies a candidate against the source expression before admitting it to the set.
	 *
	 * Parameterized candidates that cannot yet be closed numerically are preserved. Closed
	 * residuals must evaluate nearly to zero. Candidates that encounter exact division by
	 * zero are recorded as exclusions instead.
	 */
	public addSolution(solution: Expression, forFunction: Expression, variable: string) {
		this.verifyAndAddSolution(solution, forFunction, variable);
		return this;
	}

	/**
	 * Verifies and adds every candidate in an array or another `SolutionSet`.
	 *
	 * When the source is a `SolutionSet`, its numerical/symbolic provenance is retained if
	 * at least one source descriptor survives verification. Context-specific metadata such as
	 * exclusions, raw roots, partial state, and unresolved expressions is not transferred;
	 * use {@link append} when the complete solver result should be merged without revalidation.
	 */
	public addSolutions(
		arr: Expression[] | SolutionSet,
		forFunction: Expression,
		variable: string
	) {
		let source: SolutionSet | undefined;
		let solutions: Expression[];
		if (SolutionSet.isSolutionSet(arr)) {
			source = arr;
			solutions = arr.elements;
		} else {
			solutions = arr;
		}

		let sourceAccepted = false;
		for (const sol of solutions) {
			if (this.verifyAndAddSolution(sol, forFunction, variable)) {
				sourceAccepted = true;
			}
		}
		if (source && sourceAccepted) {
			this.mergeSolutionsType(source.solutionsType);
		}
		return this;
	}

	/**
	 * Appends another solution result while preserving set and solver metadata.
	 *
	 * @remarks
	 * Exclusions are merged before accepted values so an excluded candidate cannot be
	 * reintroduced. Raw numerical-root records are copied. `partial` is combined with logical
	 * OR and differing defined solution types become `mixed`. If this set has no `unsolved`
	 * expression, the appended set's unresolved expression is copied; when both sets already
	 * carry different unresolved expressions, the receiver's value is retained because the
	 * current data model can represent only one such expression.
	 */
	public append(s: SolutionSet): SolutionSet {
		this.exclude(s.getExcluded());
		this.addMany(s.elements);
		for (const root of s.getRawRoots()) {
			this.addRawRoot(root);
		}

		this.partial = this.partial || s.partial;
		this.mergeSolutionsType(s.solutionsType);
		if (!this.unsolved && s.unsolved) {
			this.unsolved = s.unsolved.copy();
		}

		return this;
	}

	/** Returns an independent Expression copy at the requested insertion-order index. */
	override at(i: number): Expression | undefined {
		return super.at(i) as Expression | undefined;
	}

	/**
	 * Removes accepted solutions and all solver state so the instance can be reused.
	 */
	override clear(): this {
		super.clear();
		this.excluded.clear();
		this.roots.length = 0;
		this.partial = false;
		this.solutionsType = undefined;
		this.unsolved = undefined;
		return this;
	}

	/** Returns an independent copy including exclusions and raw-root metadata. */
	override copy(): SolutionSet {
		const copy = new SolutionSet(this.elements);
		copy.excluded = this.excluded.copy();
		copy.roots = this.getRawRoots();
		copy.solutionsType = this.solutionsType;
		copy.partial = this.partial;
		if (this.unsolved) {
			copy.unsolved = this.unsolved.copy();
		}
		return copy;
	}
	/**
	 * Visits or maps accepted solutions in insertion order.
	 *
	 * Returning an Expression replaces the current solution while preserving uniqueness and
	 * exclusions. Returning `void` leaves the current solution unchanged, which allows the
	 * same method to be used for straightforward inspection without a dummy `return e`.
	 */
	override each(
		callback: (e: Expression, i?: string | number, j?: string | number) => Expression | void
	): this;
	override each(
		callback: (e: ParserEntity, i?: string | number, j?: string | number) => ParserEntity | void
	): this;
	override each(
		callback:
			| ((e: Expression, i?: string | number, j?: string | number) => Expression | void)
			| ((e: ParserEntity, i?: string | number, j?: string | number) => ParserEntity | void)
	): this {
		super.each((e, i, j) => {
			if (!Expression.isExpression(e)) {
				throw new UnexpectedDataType(
					message('expressionExpected', { type: e.dataType })
				);
			}

			const mapped = callback(e, i, j);
			if (mapped === undefined) {
				return e;
			}
			if (!Expression.isExpression(mapped)) {
				throw new UnexpectedDataType(
					message('expressionExpected', { type: mapped.dataType })
				);
			}
			return mapped;
		});

		for (const value of this.excluded.elements) {
			this.delete(value);
		}
		return this;
	}

	/** Returns deep-copied accepted solution descriptors in deterministic insertion order. */
	override get elements(): Expression[] {
		return super.elements as Expression[];
	}

	override evaluate(): SolutionSet {
		return this.copy().each(e => e.evaluate());
	}

	/**
	 * Adds exclusions and removes any matching values that were already accepted.
	 */
	public exclude(set: SolutionSet | ValuesSet): SolutionSet {
		const values = set.elements;
		for (const value of values) {
			if (!Expression.isExpression(value)) {
				throw new UnexpectedDataType(
					message('expressionExpected', { type: value.dataType })
				);
			}
		}
		for (const value of values) {
			this.excluded.add(value);
			this.delete(value);
		}
		return this;
	}

	override expand(): SolutionSet {
		return this.copy().each(e => e.expand());
	}

	/** Visits independent Expression copies without changing this solution set. */
	override forEach(callback: (e: Expression, index: number) => void): void {
		const values = this.elements;
		for (let i = 0; i < values.length; i++) {
			callback(values[i], i);
		}
	}

	/** Returns an independent copy of the currently excluded values. */
	public getExcluded(): ValuesSet {
		return this.excluded.copy();
	}

	/**
	 * Returns independent copies of the stored numerical root-refinement records.
	 */
	public getRawRoots(): Root[] {
		return this.roots.map(root => ({
			root: new Decimal(root.root),
			iterations: root.iterations,
			converged: root.converged,
			error: new Decimal(root.error),
			errorMsg: root.errorMsg,
		}));
	}


	/**
	 * Classifies the mathematical result represented by the stored descriptors.
	 *
	 * Arbitrary symbolic parameters do not make a result parametric in this sense. The
	 * `parametric` form is reserved for solver-generated families that contain `_n`, where
	 * `_n` represents an integer index. The special `all` descriptor takes precedence if
	 * present.
	 */
	get solutionForm(): SolutionForm {
		let retval: SolutionForm = 'finite';
		for (const solution of this.elements) {
			if (solution.eq(ALL_SYMBOL)) {
				retval = 'all';
				break;
			}
			if (solution.hasVariable(INDEX_VARIABLE)) {
				retval = 'parametric';
			}
		}
		return retval;
	}

	/** Iterates over independent Expression copies of the accepted solutions. */
	override[Symbol.iterator](): Iterator<Expression> {
		return this.elements[Symbol.iterator]();
	}

	override text(): string {
		return super.text();
	}

	/** Returns deep-copied accepted solutions as a plain array. */
	override toArray(): Expression[] {
		return this.elements;
	}
}
