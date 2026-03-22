import { message, UnexpectedInputError } from '../../errors';
import { Expression } from '../expression/Expression';

import { Assumption } from './Assumption';

import type Decimal from 'decimal.js';

// type ExprInput = Parameters<typeof Expression.create>[0];

// type CompareOp = '>' | '>=' | '<' | '<=' | '=';

// Prefer ALL CAPS for module-level state.
const ASSUMPTIONS: Map<string, Assumption> = new Map();

function intersectAssumptions(a: Assumption, b: Assumption): Assumption {
	// Intersection of two (possibly open/closed) intervals.
	// Throws if the intersection is empty.

	// Start = max(a.start, b.start)
	let startValue: Decimal;
	let startInclusive: boolean;
	if (a.start.value.greaterThan(b.start.value)) {
		startValue = a.start.value;
		startInclusive = a.start.inclusive;
	} else if (a.start.value.lessThan(b.start.value)) {
		startValue = b.start.value;
		startInclusive = b.start.inclusive;
	} else {
		startValue = a.start.value;
		startInclusive = a.start.inclusive && b.start.inclusive;
	}

	// End = min(a.end, b.end)
	let endValue: Decimal;
	let endInclusive: boolean;
	if (a.end.value.lessThan(b.end.value)) {
		endValue = a.end.value;
		endInclusive = a.end.inclusive;
	} else if (a.end.value.greaterThan(b.end.value)) {
		endValue = b.end.value;
		endInclusive = b.end.inclusive;
	} else {
		endValue = a.end.value;
		endInclusive = a.end.inclusive && b.end.inclusive;
	}

	if (
		startValue.greaterThan(endValue) ||
		(startValue.equals(endValue) && !(startInclusive && endInclusive))
	) {
		throw new UnexpectedInputError(message('inconsistentAssumptions'));
	}

	return new Assumption(startValue, endValue, startInclusive, endInclusive);
}

function setAssumption(symbol: string, assumption: Assumption): Assumption {
	const prev = ASSUMPTIONS.get(symbol);
	if (!prev) {
		ASSUMPTIONS.set(symbol, assumption);
		return assumption;
	}
	const next = intersectAssumptions(prev, assumption);
	ASSUMPTIONS.set(symbol, next);
	return next;
}

/**
 * Register assumptions which can later be used by comparison operations.
 *
 * @example
 * ```ts
 * assume('x>=0');
 * Expression.create('x').gt(0); // true
 * assume('x<9');
 * assume('x', new Assumption(0, 9, true, false));
 * ```
 */
export function assume(expr: string): Assumption;
export function assume(symbol: string, exprOrAssumption: string | Assumption): Assumption;
export function assume(a: string, b?: string | Assumption): Assumption {
	if (arguments.length === 1) {
		const parsed = Assumption.parse(a);
		return setAssumption(parsed.symbol, parsed.assumption);
	}

	const symbol = String(a);

	if (typeof b === 'string') {
		const parsed = Assumption.parse(b);
		if (parsed.symbol !== symbol) {
			throw new UnexpectedInputError(
				message('wrongInput', { expected: symbol, received: parsed.symbol })
			);
		}
		return setAssumption(symbol, parsed.assumption);
	}

	if (b instanceof Assumption) {
		return setAssumption(symbol, b);
	}

	throw new UnexpectedInputError(
		message('wrongInput', { expected: 'string or Assumption', received: typeof symbol })
	);
}

/**
 * Clears all current assumptions
 */
export function clearAssumptions(): void {
	ASSUMPTIONS.clear();
}

/**
 * Gets an assumption for the given variable
 * @param expr
 * @returns
 */
function forgetAssumptionFor(x: Expression | string): undefined {
	if (Expression.isExpression(x) && x.isPlainVariable()) {
		x = x.value;
	}
	if (typeof x === 'string') {
		ASSUMPTIONS.delete(x);
	}
}

/**
 * Gets an assumption for the given variable
 * @param expr
 * @returns
 */
export function getAssumptionFor(x: Expression | string): Assumption | undefined {
	if (Expression.isExpression(x) && x.isPlainVariable()) {
		x = x.value;
	}
	if (typeof x === 'string') {
		return ASSUMPTIONS.get(x);
	}
}

/**
 * This strictly serves as a function to set the environment so the parser knows to treat
 * operators as assertive operators.
 *
 * @param x The value being set
 * @returns
 */
export function assuming(x: Expression) {
	// The `assuming` function is nothing more than a wrapper that let's the
	// parser know to call the assertive function instead.
	return x;
}

export function forget(x: Expression) {
	if (x.eq('all')) {
		clearAssumptions();
	} else {
		forgetAssumptionFor(x);
	}

	return x;
}
