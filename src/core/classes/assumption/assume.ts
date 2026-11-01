import { ALL_SYMBOL } from '../../constants/symbolNames';
import { message, UnexpectedInputError } from '../../errors';
import { RESTRICTED } from '../../Settings';
import { Expression } from '../expression/Expression';

import { Assumption } from './Assumption';
import { SymbolRelations } from './SymbolRelations';

import type { SymbolRelation } from './symbolRelation';

// Assumptions remain process-wide compatibility state in 2.0. A useful scoped
// context would have to be threaded through parser, comparison, and simplification
// calls; wrapping this Map without doing that would only create the appearance of
// isolation. Keep the state explicit here until that larger API can be designed.
const ASSUMPTIONS: Map<string, Assumption> = new Map();
const SYMBOL_RELATIONS = new SymbolRelations();
/** Rejects inferred symbolic comparisons disproved by numeric intervals. */
function checkSymbolBounds(relations: SymbolRelations, bounds: ReadonlyMap<string, Assumption>): void {
	const symbols = [...bounds.keys()];
	const operators = ['>', '>=', '='] as const;
	const inconsistent = symbols.some(leftSymbol =>
		symbols.some(rightSymbol =>
			leftSymbol !== rightSymbol && operators.some(operator => {
				const known = relations.compare({ left: leftSymbol, operator, right: rightSymbol });
				let contradicted = false;
				if (known === true) {
					const left = bounds.get(leftSymbol)!;
					const right = bounds.get(rightSymbol)!;
					const result = operator === '>' ? left.gt(right) :
						operator === '>=' ? left.gte(right) : left.eq(right);
					contradicted = result === false;
				}
				return contradicted;
			})
		)
	);
	if (inconsistent) {
		throw new UnexpectedInputError(message('inconsistentAssumptions'));
	}
	// Check bounds implied by offsets as well as direct symbol ordering.
	for (const relation of relations.getAll()) {
		relations.getInterval(relation.left, bounds, Assumption);
		relations.getInterval(relation.right, bounds, Assumption);
	}
}

/** @internal Registers a symbolic fact without changing numeric intervals. */
export function registerSymbolRelation(relation: SymbolRelation): void {
	for (const symbol of [relation.left, relation.right]) {
		if (Expression.RESERVED.includes(symbol) || RESTRICTED.includes(symbol) ||
			symbol === Expression.imaginary) {
			throw new UnexpectedInputError(message('plainVariableExpected', { input: symbol }));
		}
	}
	const proposed = new SymbolRelations();
	for (const existing of SYMBOL_RELATIONS.getAll()) {
		proposed.add(existing);
	}
	proposed.add(relation);
	checkSymbolBounds(proposed, ASSUMPTIONS);
	SYMBOL_RELATIONS.add(relation);
}

/** @internal Returns a snapshot of stored symbolic relationships. */
export function getSymbolRelations(): readonly SymbolRelation[] {
	return SYMBOL_RELATIONS.getAll();
}

/** @internal Queries known symbolic relationships without modifying state. */
export function compareSymbolRelation(relation: SymbolRelation): boolean | undefined {
	return SYMBOL_RELATIONS.compare(relation);
}


/** @internal */
export function hasAssumptions(): boolean {
	return ASSUMPTIONS.size !== 0;
}

function setAssumption(symbol: string, assumption: Assumption): Assumption {
	if (
		Expression.RESERVED.includes(symbol) ||
		RESTRICTED.includes(symbol) ||
		symbol === Expression.imaginary
	) {
		throw new UnexpectedInputError(message('plainVariableExpected', { input: symbol }));
	}

	const prev = ASSUMPTIONS.get(symbol);
	let retval = assumption;

	if (prev) {
		const intersection = prev.intersect(assumption);
		if (!intersection) {
			throw new UnexpectedInputError(message('inconsistentAssumptions'));
		}
		retval = intersection;
	}
	const next = new Map(ASSUMPTIONS);
	next.set(symbol, retval);
	checkSymbolBounds(SYMBOL_RELATIONS, next);
	ASSUMPTIONS.set(symbol, retval);

	return retval;
}

/**
 * Registers a numeric interval assumption in Nerdamer's global assumption state.
 *
 * @remarks
 * A one-argument call parses a complete constraint such as `x >= 0`. The two-argument
 * form associates a plain variable with either another complete constraint for that
 * same variable or an existing {@link Assumption} instance. Built-in constants and the
 * configured imaginary-unit symbol cannot receive real interval assumptions.
 *
 * Repeated assumptions for the same variable are intersected. If the intersection is
 * empty, the new constraint is rejected and the previously registered assumption is
 * left unchanged.
 *
 * Assumption state is process-wide. It is consulted by expression comparisons and by
 * algorithms that rely on those comparisons, including positivity-sensitive
 * simplifications. Call {@link clearAssumptions} when that state should no longer
 * affect later work. Scoped assumption contexts are not simulated in 2.0 because a
 * correct scoped design must be threaded through the parser and algorithms rather
 * than wrapping only this registry.
 *
 * @param expr - Complete constraint in the supported assumption grammar.
 * @returns The registered interval after intersection with any existing constraint.
 * @throws Error
 * Thrown when the constraint is malformed or its bound is not numeric.
 * @throws UnexpectedInputError
 * Thrown when a new constraint contradicts the existing assumption.
 *
 * @example
 * ```ts
 * assume('x >= 0');
 * assume('x < 10');
 * getAssumptionFor('x')?.toString(); // "[0, 10)"
 * clearAssumptions();
 * ```
 */
export function assume(expr: string): Assumption;

/**
 * Registers an assumption for a named variable.
 *
 * @param symbol - Plain variable name receiving the constraint.
 * @param exprOrAssumption - Constraint for the same symbol or a prebuilt interval.
 * @returns The registered interval after intersection with any existing constraint.
 */
export function assume(symbol: string, exprOrAssumption: string | Assumption): Assumption;
export function assume(a: string, b?: string | Assumption): Assumption {
	let retval: Assumption;

	if (arguments.length === 1) {
		const parsed = Assumption.parse(a);
		retval = setAssumption(parsed.symbol, parsed.assumption);
	} else {
		const symbol = String(a);

		if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(symbol)) {
			throw new UnexpectedInputError(message('plainVariableExpected', { input: symbol }));
		}

		if (typeof b === 'string') {
			const parsed = Assumption.parse(b);
			if (parsed.symbol !== symbol) {
				throw new UnexpectedInputError(
					message('wrongInput', { expected: symbol, received: parsed.symbol })
				);
			}
			retval = setAssumption(symbol, parsed.assumption);
		} else if (Assumption.isAssumption(b)) {
			retval = setAssumption(symbol, b);
		} else {
			throw new UnexpectedInputError(
				message('wrongInput', {
					expected: 'string or Assumption',
					received: typeof b,
				})
			);
		}
	}

	return retval;
}

/**
 * Clears Nerdamer's process-wide assumption registry.
 *
 * This does not modify expressions that have already been constructed; it only
 * changes the assumptions consulted by later comparison and simplification work.
 */
export function clearAssumptions(): void {
	ASSUMPTIONS.clear();
	SYMBOL_RELATIONS.clear();
}

/**
 * Removes the registered assumption for one plain variable.
 *
 * @remarks
 * Passing an expression that is not a plain variable, or a name with no registered
 * assumption, is a no-op. Other assumptions are left unchanged.
 *
 * @param x - Plain variable expression or variable name to forget.
 */
export function forgetAssumptionFor(x: Expression | string): void {
	let symbol: string | undefined;

	if (Expression.isExpression(x) && x.isPlainVariable()) {
		symbol = x.value;
	} else if (typeof x === 'string') {
		symbol = x;
	}

	if (symbol !== undefined) {
		ASSUMPTIONS.delete(symbol);
		SYMBOL_RELATIONS.forget(symbol);
	}
}

/**
 * Returns the interval currently registered for a plain variable.
 *
 * @remarks
 * `Assumption` instances are immutable, so the returned object can be inspected
 * without exposing mutable registry state. Non-variable expressions have no direct
 * assumption and return `undefined`.
 *
 * @param x - Plain variable expression or variable name.
 * @returns The registered interval, or `undefined` when no assumption is available.
 */
/**
 * Returns a snapshot of all currently registered assumptions.
 *
 * Changing the returned Map does not change Nerdamer's active assumptions.
 */
export function getAssumptions(): Map<string, Assumption> {
	return new Map(ASSUMPTIONS);
}

export function getAssumptionFor(x: Expression | string): Assumption | undefined {
	let symbol: string | undefined;

	if (Expression.isExpression(x) && x.isPlainVariable()) {
		symbol = x.value;
	} else if (typeof x === 'string') {
		symbol = x;
	}

	return symbol === undefined ? undefined : ASSUMPTIONS.get(symbol);
}


/** @internal Resolves current interval bounds implied by stored symbol relationships. */
export function resolveAssumption(x: Expression | string): Assumption | undefined {
	let symbol: string | undefined;
	if (Expression.isExpression(x) && x.isPlainVariable()) {
		symbol = x.value;
	} else if (typeof x === 'string') {
		symbol = x;
	}
	return symbol === undefined ? undefined : SYMBOL_RELATIONS.getInterval(symbol, ASSUMPTIONS, Assumption);
}

/**
 * Parser marker used by `assume(...)` so comparison operators register constraints
 * instead of evaluating ordinary boolean relations.
 *
 * @internal
 */
export function assuming(x: Expression): Expression {
	return x;
}

/**
 * Parser-facing compatibility function for `forget(variable)` and `forget(all)`.
 *
 * @internal
 */
export function forget(x: Expression): Expression {
	if (x.eq(ALL_SYMBOL)) {
		clearAssumptions();
	} else {
		forgetAssumptionFor(x);
	}

	return x;
}
