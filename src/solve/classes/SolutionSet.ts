import Decimal from 'decimal.js';

import { Expression } from '../../core/classes/expression/Expression';
import { ValuesSet } from '../../core/classes/valuesSet/ValuesSet';
import { isNerdamerNativeType } from '../../core/common/common';
import { SOLUTIONS_SET } from '../../core/constants/entityTypes';
import { ALL_SYMBOL, INTEGER_PARAM } from '../../core/constants/symbolNames';
import { DivisionByZeroError, message, UndefinedError, UnexpectedDataType, UnsupportedOperationError } from '../../core/errors';
import { warn } from '../../core/warnings';

import type { ParserValuesObject } from '../../core/classes/parser/types';
import type { ExpressionInput, ParserEntity } from '../../core/types';
import type { Root } from './FunctionSolver';

type GenerationOptions =
	| { indices: readonly [ExpressionInput, ExpressionInput]; interval?: never }
	| { interval: readonly [ExpressionInput, ExpressionInput]; indices?: never };

type GenerationBounds =
	| { kind: 'indices'; start: bigint; end: bigint }
	| {
		kind: 'interval';
		lower: Expression;
		upper: Expression;
		evaluatedLower: Expression;
		evaluatedUpper: Expression;
	};

type IntervalBounds = Extract<GenerationBounds, { kind: 'interval' }>;

/** Describes whether accepted solutions were produced by numerical strategies, symbolic strategies, or both. */
export type SolutionsType = 'numeric' | 'symbolic' | 'mixed' | undefined;

/** Describes whether the stored descriptors represent finite solutions, indexed families, or all values. */
export type SolutionForm = 'finite' | 'parametric' | 'all';

/** Limits the work performed when materializing integer-indexed solution families. */
const MAX_GENERATED_MEMBERS = 1000;

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

	/** Validates the requested range and normalizes bounds for generation. */
	private checkBounds(options: GenerationOptions): GenerationBounds {
		const indices = options?.indices;
		const interval = options?.interval;
		if ((indices === undefined) === (interval === undefined)) {
			throw new UnsupportedOperationError(message('unsupportedOperation'));
		}

		if (indices !== undefined) {
			if (!Array.isArray(indices) || indices.length !== 2) {
				throw new RangeError(message('wrongInput', {
					expected: 'two integer index bounds',
					received: String(indices),
				}));
			}

			const values = indices.map(value => {
				if (typeof value === 'number' && !Number.isSafeInteger(value)) {
					throw new RangeError(message('wrongInput', {
						expected: 'an exact integer (use bigint for large indices)',
						received: String(value),
					}));
				}
				const expression = Expression.create(value);
				if (!expression.isNUM() || !expression.getMultiplier().isInteger()) {
					throw new RangeError(message('wrongInput', {
						expected: 'an exact integer index',
						received: expression.text(),
					}));
				}
				return expression.getMultiplier().numerator;
			});
			const [start, end] = values;
			if (start > end) {
				throw new RangeError(message('invalidInterval', {
					start: String(start),
					end: String(end),
				}));
			}
			return { kind: 'indices', start, end };
		}

		if (!Array.isArray(interval) || interval.length !== 2) {
			throw new RangeError(message('wrongInput', {
				expected: 'two interval endpoints',
				received: String(interval),
			}));
		}
		const [lower, upper] = interval.map(value => Expression.create(value));
		const numeric = [lower.evaluate(), upper.evaluate()];
		if (numeric.some(value => !value.isNUM())) {
			throw new UnsupportedOperationError(message('unsupportedOperation'));
		}
		const reversed = numeric[0].getMultiplier().gt(numeric[1].getMultiplier());
		if (reversed) {
			throw new RangeError(message('invalidInterval', {
				start: lower.text(),
				end: upper.text(),
			}));
		}
		return { kind: 'interval', lower, upper, evaluatedLower: numeric[0], evaluatedUpper: numeric[1] };
	}

	/** Removes values outside an inclusive real interval; unknown comparisons fail. */
	private filterInterval(bounds: IntervalBounds): void {
		for (const value of this.elements) {
			if (value.isComplex()) {
				// A known non-real root is outside every real interval.
				this.delete(value);
				continue;
			}
			if (value.lt(bounds.lower) || value.gt(bounds.upper)) {
				this.delete(value);
			} else if (!value.gte(bounds.lower) || !value.lte(bounds.upper)) {
				throw new UnsupportedOperationError(message('unsupportedOperation'));
			}
		}
	}

	/** Substitutes no more than the remaining candidate budget into one family. */
	private generateMembers(
		family: Expression,
		start: bigint,
		end: bigint,
		remaining: number,
		bounds: GenerationBounds,
	): number {
		let attempted = 0;
		for (let i = start; i <= end && attempted < remaining; i++) {
			attempted++;
			try {
				const member = family.subst(INTEGER_PARAM, i);
				if (member.isInf()) {
					continue;
				}
				if (bounds.kind === 'interval') {
					if (member.lt(bounds.lower) || member.gt(bounds.upper)) {
						continue;
					}
					if (!member.gte(bounds.lower) || !member.lte(bounds.upper)) {
						throw new UnsupportedOperationError(message('unsupportedOperation'));
					}
				}
				this.add(member);
			} catch (error) {
				if (!(error instanceof DivisionByZeroError) &&
					!(error instanceof UndefinedError)) {
					throw error;
				}
			}
		}
		return attempted;
	}

	/** Determines the complete integer-index range of a supported affine family. */
	private getIndexRange(family: Expression, bounds: IntervalBounds): readonly [bigint, bigint] {
		const coefficients = family.expand().coeffs(INTEGER_PARAM);
		const offset = coefficients.getPower(0) ?? Expression.Number(0);
		const period = coefficients.getPower(1);
		if (!period || period.isZero() || coefficients.max() !== 1 ||
			!family.minus(offset.plus(period.times(Expression.N()))).expand().isZero()) {
			throw new UnsupportedOperationError(message('unsupportedOperation'));
		}

		// Rational boundaries can be mapped to integer indices without any
		// floating-point rounding, even when the indices exceed Number.MAX_SAFE_INTEGER.
		if (offset.isNUM() && period.isNUM() && bounds.lower.isNUM() && bounds.upper.isNUM()) {
			const first = bounds.lower.getMultiplier().minus(offset.getMultiplier())
				.div(period.getMultiplier());
			const last = bounds.upper.getMultiplier().minus(offset.getMultiplier())
				.div(period.getMultiplier());
			const left = first.lte(last) ? first : last;
			const right = first.lte(last) ? last : first;
			// BigInt division truncates toward zero; adjust for ceiling and floor.
			const leftQuotient = left.numerator / left.denominator;
			const rightQuotient = right.numerator / right.denominator;
			const start = leftQuotient +
				(left.numerator > 0n && left.numerator % left.denominator !== 0n ? 1n : 0n);
			const end = rightQuotient -
				(right.numerator < 0n && right.numerator % right.denominator !== 0n ? 1n : 0n);
			return [start, end];
		}

		const base = offset.evaluate();
		const step = period.evaluate();
		if (!base.isNUM() || !step.isNUM() || step.isZero()) {
			throw new UnsupportedOperationError(message('unsupportedOperation'));
		}
		const baseValue = base.getMultiplier().toDecimal();
		const stepValue = step.getMultiplier().toDecimal();
		const lowerValue = bounds.evaluatedLower.getMultiplier().toDecimal();
		const upperValue = bounds.evaluatedUpper.getMultiplier().toDecimal();
		if (!baseValue.isFinite() || !stepValue.isFinite() || stepValue.isZero()) {
			throw new UnsupportedOperationError(message('unsupportedOperation'));
		}

		const first = lowerValue.minus(baseValue).div(stepValue);
		const last = upperValue.minus(baseValue).div(stepValue);
		if (!first.isFinite() || !last.isFinite()) {
			throw new UnsupportedOperationError(message('unsupportedOperation'));
		}
		// Pad the projected indices to absorb rounding. Exact symbolic comparisons
		// against the exterior witnesses must still establish that the range is complete.
		const start = BigInt(Decimal.min(first, last).floor().minus(2).toFixed(0));
		const end = BigInt(Decimal.max(first, last).ceil().plus(2).toFixed(0));
		const before = family.subst(INTEGER_PARAM, start - 1n);
		const after = family.subst(INTEGER_PARAM, end + 1n);
		const covered = stepValue.isPositive()
			? before.lt(bounds.lower) && after.gt(bounds.upper)
			: before.gt(bounds.upper) && after.lt(bounds.lower);
		if (!covered) {
			throw new UnsupportedOperationError(message('unsupportedOperation'));
		}
		return [start, end];
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
				const excluded = this.excluded.has(solution);
				this.add(solution);
				retval = !excluded;
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
					message('indexOutOfBounds', {
						index: String(index),
						type: String(this.dataType),
						length: String(this.count()),
					})
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
	 * Adds a batch of numerical solutions that has already been validated against its source
	 * polynomial. Incoming values are deduplicated by their exact numeric components before
	 * storage so a numerical root batch does not require pairwise symbolic equality checks.
	 *
	 * @internal
	 */
	public addValidatedNumericalSolutions(values: Iterable<Expression>): SolutionSet {
		const candidates = [...values];
		const existing = this.elements;
		const keys = new Set<string>();

		for (const value of candidates) {
			if (!Expression.isExpression(value)) {
				const entity = value as unknown as ParserEntity;
				throw new UnexpectedDataType(
					message('expressionExpected', { type: entity.dataType })
				);
			}

			const real = value.isComplex() ? value.realPart() : value;
			const imaginary = value.isComplex() ? value.imagPart() : Expression.Number(0);
			if (!real.isNUM() || !imaginary.isNUM()) {
				throw new UnexpectedDataType(message('expressionExpected', { type: value.dataType }));
			}

			const realMultiplier = real.getMultiplier();
			const imaginaryMultiplier = imaginary.getMultiplier();
			const key =
				`${realMultiplier.numerator}/${realMultiplier.denominator}|` +
				`${imaginaryMultiplier.numerator}/${imaginaryMultiplier.denominator}`;

			if (keys.has(key) || this.excluded.has(value)) {
				continue;
			}

			let present = false;
			for (const stored of existing) {
				if (stored.eq(value) && value.eq(stored)) {
					present = true;
					break;
				}
			}

			if (!present) {
				this.addKnownUnique(value);
				keys.add(key);
			}
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
		const transferUnique = this.count() === 0 && this.excluded.count() === 0;
		this.exclude(s.getExcluded());
		if (transferUnique) {
			for (const solution of s.elements) {
				this.addKnownUnique(solution);
			}
		} else {
			this.addMany(s.elements);
		}
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
	/**
	 * Appends numerical solutions that were already validated by a numerical solver.
	 *
	 * This follows the same metadata and exclusion handling as {@link append}, but avoids
	 * repeating symbolic membership checks for a batch that has already been numerically
	 * validated and deduplicated.
	 *
	 * @internal
	 */
	public appendValidatedNumerical(s: SolutionSet): SolutionSet {
		this.exclude(s.getExcluded());
		this.addValidatedNumericalSolutions(s.elements);
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

	override evaluate(values?: ParserValuesObject): SolutionSet {
		return this.copy().each(e => e.evaluate(values));
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

	/**
	 * Materializes finite indexed solutions, selecting either integer indices or
	 * actual real solution values. Both ranges are inclusive. Returns an independent
	 * result; hitting the generation budget marks it partial and emits a warning.
	 */
	generate(options: GenerationOptions): SolutionSet {
		const bounds = this.checkBounds(options);
		if (this.solutionForm === 'all') {
			throw new UnsupportedOperationError(message('unsupportedOperation'));
		}
		const families = this.elements.filter(value => value.hasVariable(INTEGER_PARAM));
		if (this.excluded.elements.some(value =>
			Expression.isExpression(value) && value.hasVariable(INTEGER_PARAM)
		)) {
			// An indexed exclusion may match at an index outside this generation range.
			throw new UnsupportedOperationError(message('unsupportedOperation'));
		}

		const result = this.copy();
		for (const family of families) {
			result.delete(family);
		}
		if (bounds.kind === 'interval') {
			result.filterInterval(bounds);
		}

		let attempted = 0;
		let limited = false;
		for (const family of families) {
			const [start, end] = bounds.kind === 'indices'
				? [bounds.start, bounds.end]
				: this.getIndexRange(family, bounds);
			if (start > end) {
				continue;
			}
			const generated = result.generateMembers(
				family, start, end, MAX_GENERATED_MEMBERS - attempted, bounds
			);
			attempted += generated;
			if (BigInt(generated) < end - start + 1n) {
				limited = true;
				break;
			}
		}
		if (limited) {
			result.partial = true;
			warn('solve.generationLimit', message('solvePartialResultWarning'));
		}
		return result;
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
			if (solution.hasVariable(INTEGER_PARAM)) {
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
