import { message, UnexpectedDataType } from '../../errors';
import { Expression } from '../expression/Expression';
import { zero } from '../expression/shortcuts';
import { dataTypes, EQUATION } from '../parser/constants';

import type { ExpressionInputType, ParserInputType, SupportedInputType } from '../parser/types';

export class Equation {
	dataType = EQUATION;
	isEnumerable: boolean = false;
	/**
	 * A parser flag to let the parser know that this was returned from an internal function call.
	 */
	isFunctionReturn = false;
	LHS: Expression;
	precision?: number | undefined;
	RHS: Expression;

	constructor(lhs: Expression, rhs: Expression) {
		this.LHS = lhs;
		this.RHS = rhs;
	}

	static isEquation(obj: unknown): obj is Equation {
		if (obj === undefined) {
			return false;
		}
		return (obj as Equation).dataType === EQUATION;
	}

	abs(): Equation {
		return this.copy().each(e => e.abs());
	}

	add(x: SupportedInputType): Equation {
		return this.plus(x);
	}

	copy(): Equation {
		return new Equation(this.LHS.copy(), this.RHS.copy());
	}

	/**
	 * Divides both side of the equation by the given value
	 * @param x
	 * @returns
	 */
	div(x: ExpressionInputType) {
		return new Equation(this.LHS.div(x), this.RHS.div(x));
	}

	each(fn: (e: ParserInputType, i?: number | string) => ParserInputType): Equation {
		const lhs = fn(this.LHS, 0);
		const rhs = fn(this.RHS, 1);
		if (Expression.isExpression(lhs) && Expression.isExpression(rhs)) {
			return new Equation(lhs, rhs);
		}

		const receivedTypes = `${dataTypes[lhs.dataType] || typeof lhs} & ${dataTypes[rhs.dataType] || typeof rhs}`;
		throw new UnexpectedDataType(message('expressionExpected', { type: receivedTypes }));
	}

	eq(eq: ParserInputType): boolean {
		if (!Equation.isEquation(eq)) {
			return false;
		}
		return this.toLHS().LHS.eq(eq.toLHS().LHS);
	}

	evaluate() {
		return this.copy().each(e => e.evaluate());
	}

	expand(): Equation {
		const copy = this.copy();
		copy.each(e => e.expand());
		return copy;
	}

	gt(eq: ParserInputType): boolean {
		if (!Equation.isEquation(eq)) {
			return false;
		}
		return this.toLHS().LHS.gt(eq.toLHS().LHS);
	}

	gte(x: ParserInputType) {
		return this.gt(x) || this.eq(x);
	}

	lt(eq: ParserInputType): boolean {
		if (!Equation.isEquation(eq)) {
			return false;
		}
		return this.toLHS().LHS.lt(eq.toLHS().LHS);
	}

	lte(x: ParserInputType) {
		return this.lt(x) || this.eq(x);
	}

	minus(x: SupportedInputType): Equation {
		const expr = Expression.create(x);
		return this.each(e => e.minus(expr));
	}

	multiply(x: SupportedInputType): Equation {
		return this.times(x);
	}

	plus(x: SupportedInputType): Equation {
		const expr = Expression.create(x);
		return this.each(e => e.plus(expr));
	}

	subtract(x: SupportedInputType): Equation {
		return this.minus(x);
	}

	text(): string {
		return `${this.LHS.text()}=${this.RHS.text()}`;
	}

	times(x: SupportedInputType): Equation {
		const expr = Expression.create(x);
		this.LHS = this.LHS.times(expr);
		this.RHS = this.RHS.times(expr);
		return this;
	}

	toLHS(): Equation {
		const eq = this.copy();
		eq.LHS = eq.LHS.minus(eq.RHS);
		eq.RHS = zero();
		return eq;
	}

	toString(): string {
		return this.text();
	}
}
