import { isNerdamerNativeType } from '../../common/common';
import { message, UnexpectedDataType, UnsupportedOperationError } from '../../errors';
import { Expression } from '../expression/Expression';
import { zero } from '../expression/shortcuts';
import { dataTypes, EQUATION } from '../parser/constants';

import type { ExpressionInput, ParserEntity } from '../../types';

/**
 * Represents a symbolic equality between two expression sides.
 *
 * @remarks
 * An `Equation` stores its left- and right-hand sides as public {@link Expression}
 * references. The constructor does not copy those expressions, so mutating a supplied
 * expression later, or mutating {@link Equation.LHS} or {@link Equation.RHS} directly,
 * changes the equation. Use {@link Equation.copy} when an independent equation is needed.
 *
 * Arithmetic methods apply an operation to both sides, but that does not by itself prove
 * that the transformed equation has exactly the same solution set. For example, multiplying
 * or dividing by an expression whose value may be zero requires additional domain reasoning.
 * Solver-facing code should account for those mathematical conditions.
 *
 * Absolute value is not supported as an equation rewrite because applying it
 * independently to both sides can change the solution set. {@link Equation.abs} remains only
 * as a compatibility member of the general parser-entity surface and always throws. Callers
 * performing a non-equivalent transformation can use {@link Equation.each} explicitly.
 *
 * Equation comparisons reduce each equation to its residual `LHS - RHS` and then use the
 * corresponding {@link Expression} comparison. They compare those residual expressions;
 * they do not establish logical or solution-set equivalence between arbitrary equations.
 *
 * @example
 * ```ts
 * const equation = new Equation(Expression.create('x + 1'), Expression.create(3));
 * equation.text(); // "1+x=3"
 * equation.toLHS().text(); // "-2+x=0"
 * ```
 */
export class Equation {
	/** Parser entity tag used to identify equation values. */
	dataType: typeof EQUATION = EQUATION;

	/** Indicates that equations are not elementwise enumerable parser aggregates. */
	isEnumerable: boolean = false;

	/** Mutable left-hand side expression stored by this equation. */
	LHS: Expression;

	/**
	 * Optional parser-entity precision metadata.
	 *
	 * `Equation` itself does not currently use this value when performing equation
	 * operations or formatting its sides.
	 */
	precision?: number | undefined;

	/** Mutable right-hand side expression stored by this equation. */
	RHS: Expression;

	/**
	 * Creates an equation from two expression objects.
	 *
	 * @remarks
	 * The supplied expressions are stored by reference rather than copied. This preserves
	 * object identity but also means subsequent mutation of either expression is visible
	 * through the equation.
	 *
	 * @param lhs - Expression to store on the left-hand side.
	 * @param rhs - Expression to store on the right-hand side.
	 */
	constructor(lhs: Expression, rhs: Expression) {
		this.LHS = lhs;
		this.RHS = rhs;
	}

	/**
	 * Tests whether a value carries Nerdamer's equation parser-entity tag.
	 *
	 * @remarks
	 * This is a tag-based type guard rather than an `instanceof` check. It therefore
	 * recognizes compatible equation objects by their `dataType` value.
	 *
	 * @param obj - Value to inspect.
	 * @returns `true` when the value is tagged as an equation.
	 */
	static isEquation(obj: unknown): obj is Equation {
		return isNerdamerNativeType(obj, EQUATION);
	}

	/**
	 * Rejects absolute value as an equation transformation.
	 *
	 * @remarks
	 * Replacing `a = b` with `|a| = |b|` is not generally solution-set preserving. This
	 * method remains on `Equation` so the general {@link ParserEntity} surface can retain
	 * its historical `abs()` member without reintroducing the unsafe transformation.
	 *
	 * Use {@link Equation.each} explicitly to transform
	 * each side and accepts responsibility for the changed equation semantics.
	 *
	 * @throws {@link core!UnsupportedOperationError} Always; absolute value is not a supported
	 * equation operation.
	 * @deprecated Absolute value is not supported for equations.
	 */
	abs(): Equation {
		throw new UnsupportedOperationError(message('unsupportedOperation'));
	}

	/**
	 * Legacy alias for {@link Equation.plus}.
	 *
	 * @param x - Value to add to both sides.
	 * @returns A new equation; the current equation is not modified.
	 */
	add(x: ExpressionInput): Equation {
		return this.plus(x);
	}

	/**
	 * Creates an independent copy of this equation and both expression sides.
	 *
	 * @returns A new equation whose left- and right-hand expressions are deep copies.
	 */
	copy(): Equation {
		return new Equation(this.LHS.copy(), this.RHS.copy());
	}

	/**
	 * Divides both sides by the same nonzero number.
	 *
	 * A symbolic divisor is rejected because Nerdamer cannot assume that it is nonzero for
	 * every solution of the equation.
	 *
	 * @param x - Nonzero numeric value by which both sides are divided.
	 * @returns A new equation; the current equation is not modified.
	 * @throws {@link core!UnsupportedOperationError} If `x` is zero or is not numeric.
	 */
	div(x: ExpressionInput): Equation {
		if (Equation.isEquation(x)) {
			throw new UnsupportedOperationError(message('unsupportedOperation'));
		}
		const expr = Expression.create(x);
		if (!expr.isNUM() || expr.isZero()) {
			throw new UnsupportedOperationError(message('unsupportedOperation'));
		}
		return new Equation(this.LHS.div(expr), this.RHS.div(expr));
	}

	/**
	 * Applies a callback to the two equation sides and rebuilds the equation from its results.
	 *
	 * @remarks
	 * The callback receives the stored left- and right-hand {@link Expression} references
	 * directly, with indices `0` and `1` respectively. Returned expressions are stored by
	 * reference in a new equation. The callback can therefore mutate the original equation
	 * if it mutates either argument before returning.
	 *
	 * Both callback results must be expressions. Other parser entities are rejected after
	 * the callback has run.
	 *
	 * @param fn - Transformation applied to the left and right sides.
	 * @returns A new equation containing the callback results.
	 * @throws {@link core!UnexpectedDataType}
	 * Thrown when either callback result is not an {@link Expression}.
	 */
	each(fn: (e: ParserEntity, i?: number | string) => ParserEntity): Equation {
		const lhs = fn(this.LHS, 0);
		const rhs = fn(this.RHS, 1);
		if (Expression.isExpression(lhs) && Expression.isExpression(rhs)) {
			return new Equation(lhs, rhs);
		}

		const receivedTypes = `${dataTypes[lhs.dataType] || typeof lhs} & ${dataTypes[rhs.dataType] || typeof rhs}`;
		throw new UnexpectedDataType(message('expressionExpected', { type: receivedTypes }));
	}

	/**
	 * Compares this equation with another equation by comparing their residual expressions.
	 *
	 * @remarks
	 * Each equation is copied and rewritten as `LHS - RHS = 0`, then the two residual
	 * expressions are compared with {@link Expression.eq}. Equations with the same
	 * solution set are not necessarily equal by this method; for example, scaling an
	 * equation by a nonzero constant changes its residual expression.
	 *
	 * @param eq - Parser entity to compare with this equation.
	 * @returns `true` when `eq` is an equation and the two residual expressions compare equal.
	 */
	eq(eq: ParserEntity): boolean {
		if (!Equation.isEquation(eq)) {
			return false;
		}
		return this.toLHS().LHS.eq(eq.toLHS().LHS);
	}

	/**
	 * Numerically re-evaluates both equation sides.
	 *
	 * @returns A new equation containing evaluated copies of the two sides.
	 */
	evaluate(): Equation {
		return this.copy().each(e => e.evaluate());
	}

	/**
	 * Expands both sides of a copied equation.
	 *
	 * @returns A new equation containing the expanded left- and right-hand sides.
	 */
	expand(): Equation {
		const retval = this.copy().each(e => e.expand());
		return retval;
	}

	/**
	 * Orders this equation against another equation by comparing their residual expressions.
	 *
	 * @remarks
	 * Both equations are rewritten as `LHS - RHS = 0`, and the resulting expressions are
	 * compared with {@link Expression.gt}. This is an ordering of residual expressions,
	 * not a statement that one equation or solution set is logically greater than another.
	 *
	 * @param eq - Parser entity to compare with this equation.
	 * @returns `true` when `eq` is an equation and this residual compares greater.
	 */
	gt(eq: ParserEntity): boolean {
		if (!Equation.isEquation(eq)) {
			return false;
		}
		return this.toLHS().LHS.gt(eq.toLHS().LHS);
	}

	/**
	 * Residual-expression comparison corresponding to `>=`.
	 *
	 * @param x - Parser entity to compare with this equation.
	 * @returns `true` when {@link Equation.gt} or {@link Equation.eq} succeeds.
	 */
	gte(x: ParserEntity) {
		return this.gt(x) || this.eq(x);
	}

	/**
	 * Orders this equation against another equation by comparing their residual expressions.
	 *
	 * @remarks
	 * Both equations are rewritten as `LHS - RHS = 0`, and the resulting expressions are
	 * compared with {@link Expression.lt}. This is an ordering of residual expressions,
	 * not a statement that one equation or solution set is logically less than another.
	 *
	 * @param eq - Parser entity to compare with this equation.
	 * @returns `true` when `eq` is an equation and this residual compares less.
	 */
	lt(eq: ParserEntity): boolean {
		if (!Equation.isEquation(eq)) {
			return false;
		}
		return this.toLHS().LHS.lt(eq.toLHS().LHS);
	}

	/**
	 * Residual-expression comparison corresponding to `<=`.
	 *
	 * @param x - Parser entity to compare with this equation.
	 * @returns `true` when {@link Equation.lt} or {@link Equation.eq} succeeds.
	 */
	lte(x: ParserEntity) {
		return this.lt(x) || this.eq(x);
	}

	/**
	 * Subtracts the same value from both sides.
	 *
	 * @param x - Value to subtract from the left- and right-hand sides.
	 * @returns A new equation; the current equation is not modified.
	 */
	minus(x: ExpressionInput): Equation {
		if (Equation.isEquation(x)) {
			throw new UnsupportedOperationError(message('unsupportedOperation'));
		}
		const expr = Expression.create(x);
		return this.each(e => e.minus(expr));
	}

	/**
	 * Legacy alias for {@link Equation.times}.
	 *
	 * @param x - Nonzero numeric value by which both sides are multiplied.
	 * @returns This equation after mutation.
	 */
	multiply(x: ExpressionInput): Equation {
		return this.times(x);
	}

	/**
	 * Adds the same value to both sides.
	 *
	 * @param x - Value to add to the left- and right-hand sides.
	 * @returns A new equation; the current equation is not modified.
	 */
	plus(x: ExpressionInput): Equation {
		if (Equation.isEquation(x)) {
			throw new UnsupportedOperationError(message('unsupportedOperation'));
		}
		const expr = Expression.create(x);
		return this.each(e => e.plus(expr));
	}

	/**
	 * Legacy alias for {@link Equation.minus}.
	 *
	 * @param x - Value to subtract from both sides.
	 * @returns A new equation; the current equation is not modified.
	 */
	subtract(x: ExpressionInput): Equation {
		return this.minus(x);
	}

	/**
	 * Returns the canonical text form `LHS=RHS`.
	 *
	 * @returns The two side representations joined by `=`.
	 */
	text(): string {
		return `${this.LHS.text()}=${this.RHS.text()}`;
	}

	/**
	 * Multiplies both sides by the same nonzero number.
	 *
	 * A symbolic multiplier is rejected because it may be zero for some solutions and add
	 * solutions that were not present in the original equation.
	 *
	 * @param x - Nonzero numeric value by which both sides are multiplied.
	 * @returns This equation after mutation.
	 * @throws {@link core!UnsupportedOperationError} If `x` is zero or is not numeric.
	 */
	times(x: ExpressionInput): Equation {
		if (Equation.isEquation(x)) {
			throw new UnsupportedOperationError(message('unsupportedOperation'));
		}
		const expr = Expression.create(x);
		if (!expr.isNUM() || expr.isZero()) {
			throw new UnsupportedOperationError(message('unsupportedOperation'));
		}
		this.LHS = this.LHS.times(expr);
		this.RHS = this.RHS.times(expr);
		return this;
	}

	/**
	 * Rewrites this equation as an equivalent residual form with zero on the right.
	 *
	 * @remarks
	 * The equation and both sides are copied before `RHS` is subtracted from `LHS`, so the
	 * current equation is not modified. The result has the form `LHS - RHS = 0` and is used
	 * by solver preparation and the equation comparison methods.
	 *
	 * @returns A new equation with the residual expression on the left and zero on the right.
	 */
	toLHS(): Equation {
		const eq = this.copy();
		eq.LHS = eq.LHS.minus(eq.RHS);
		eq.RHS = zero();
		return eq;
	}

	/**
	 * Returns the same canonical equation text as {@link Equation.text}.
	 *
	 * @returns The equation text representation.
	 */
	toString(): string {
		return this.text();
	}
}
