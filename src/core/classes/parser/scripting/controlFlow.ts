import { isNerdamerNativeType } from '../../../common/common';
import { message, ParserError, UnexpectedDataType } from '../../../errors';
import { Settings } from '../../../Settings';
import { Expression } from '../../expression/Expression';
import { one, zero } from '../../expression/shortcuts';
import { Vector } from '../../vector/Vector';
import { dataTypes } from '../constants';

import type { ParserEntity } from '../../../types';
import type { DeferredFunctionArgument } from '../types';

// Internal runtime tags for parser control-flow signals. These are not ParserEntity data types.
export const RETURN_SIGNAL = 'RETURN_SIGNAL';
export const BREAK_SIGNAL = 'BREAK_SIGNAL';
export const CONTINUE_SIGNAL = 'CONTINUE_SIGNAL';

/** Base class for internal parser control transfers. These signals are not parser errors. */
export abstract class ControlFlowSignal extends Error {
	constructor() {
		super();
		this.name = new.target.name;
	}
}

/**
 * Internal control-flow signal used to carry a symbolic function's return value to its
 * function boundary. It is not a mathematical parser result.
 */
export class ReturnSignal extends ControlFlowSignal {
	readonly dataType: typeof RETURN_SIGNAL = RETURN_SIGNAL;

	constructor(readonly value: ParserEntity) {
		super();
	}

	static isReturnSignal(obj: unknown): obj is ReturnSignal {
		return isNerdamerNativeType(obj, RETURN_SIGNAL);
	}
}

/** Internal control-flow signal consumed by the nearest parser loop. */
export class BreakSignal extends ControlFlowSignal {
	readonly dataType: typeof BREAK_SIGNAL = BREAK_SIGNAL;

	static isBreakSignal(obj: unknown): obj is BreakSignal {
		return isNerdamerNativeType(obj, BREAK_SIGNAL);
	}
}

/** Internal control-flow signal consumed by the nearest parser loop. */
export class ContinueSignal extends ControlFlowSignal {
	readonly dataType: typeof CONTINUE_SIGNAL = CONTINUE_SIGNAL;

	static isContinueSignal(obj: unknown): obj is ContinueSignal {
		return isNerdamerNativeType(obj, CONTINUE_SIGNAL);
	}
}

// BREAK and CONTINUE carry no data, so reuse their signals instead of allocating an Error
// on every control transfer. RETURN carries a value and therefore remains per invocation.
const BREAK_SIGNAL_INSTANCE = new BreakSignal();
const CONTINUE_SIGNAL_INSTANCE = new ContinueSignal();

// Parser control flow is synchronous. Track active execution boundaries so internal signals
// are consumed by the correct parser construct without leaking across function calls.
let loopBodyDepth = 0;
let parserReturnBoundaryDepth = 0;
let symbolicFunctionDepth = 0;

/** Returns the parser's boolean interpretation of one evaluated condition. */
function isTruthy(value: ParserEntity): boolean {
	if (!Expression.isExpression(value)) {
		throw new UnexpectedDataType(
			message('expressionExpected', { type: dataTypes[value.dataType] })
		);
	}
	return !value.isZero();
}

/**
 * Evaluates one symbolic-function body and consumes control flow at the function boundary.
 * RETURN becomes the function result, while BREAK and CONTINUE cannot escape a function call.
 */
export function functionBoundary(evaluate: () => ParserEntity): ParserEntity {
	let retval: ParserEntity;

	symbolicFunctionDepth++;
	try {
		retval = evaluate();
	} catch (error) {
		if (ReturnSignal.isReturnSignal(error)) {
			retval = error.value;
		} else if (BreakSignal.isBreakSignal(error)) {
			throw new ParserError(message('breakOutsideLoop'));
		} else if (ContinueSignal.isContinueSignal(error)) {
			throw new ParserError(message('continueOutsideLoop'));
		} else {
			throw error;
		}
	} finally {
		symbolicFunctionDepth--;
	}

	return retval;
}

/**
 * Returns a value from the current symbolic function.
 * @param x
 * @returns
 */
export function RETURN(x: ParserEntity): never {
	throw new ReturnSignal(x);
}

/** Exits the nearest parser control-flow loop. */
export function BREAK(): never {
	if (loopBodyDepth === 0) {
		throw new ParserError(message('breakOutsideLoop'));
	}
	throw BREAK_SIGNAL_INSTANCE;
}

/** Skips to the next iteration of the nearest parser control-flow loop. */
export function CONTINUE(): never {
	if (loopBodyDepth === 0) {
		throw new ParserError(message('continueOutsideLoop'));
	}
	throw CONTINUE_SIGNAL_INSTANCE;
}

/**
 * Returns 1 when every deferred argument is nonzero, otherwise 0.
 * Evaluation stops as soon as a false argument is found.
 */
export function AND(...args: DeferredFunctionArgument[]): Expression {
	let retval = one();
	for (const arg of args) {
		if (!isTruthy(arg())) {
			retval = zero();
			break;
		}
	}
	return retval;
}

/**
 * Returns 1 when at least one deferred argument is nonzero, otherwise 0.
 * Evaluation stops as soon as a true argument is found.
 */
export function OR(...args: DeferredFunctionArgument[]): Expression {
	let retval = zero();
	for (const arg of args) {
		if (isTruthy(arg())) {
			retval = one();
			break;
		}
	}
	return retval;
}

/** Returns 1 when the argument is zero and 0 otherwise. */
export function NOT(value: ParserEntity): Expression {
	const retval = isTruthy(value) ? zero() : one();
	return retval;
}

/** Returns 1 when an odd number of arguments are nonzero, otherwise 0. */
export function XOR(...args: ParserEntity[]): Expression {
	let odd = false;
	for (const arg of args) {
		if (isTruthy(arg)) {
			odd = !odd;
		}
	}
	const retval = odd ? one() : zero();
	return retval;
}

/**
 * Evaluates an expression and returns its result unless evaluation throws an ordinary error.
 * The fallback is evaluated only after an error. Internal parser control-flow signals continue
 * unwinding to their enclosing function or loop boundary.
 */
export function IFERROR(
	expression: DeferredFunctionArgument,
	fallback: DeferredFunctionArgument
): ParserEntity {
	let retval: ParserEntity;
	try {
		retval = expression();
	} catch (error) {
		if (error instanceof ControlFlowSignal) {
			throw error;
		}
		retval = fallback();
	}
	return retval;
}

/**
 * Returns 1 when deferred evaluation throws an ordinary error and 0 otherwise.
 * Internal parser control-flow signals are not errors and continue unwinding normally.
 */
export function ISERROR(expression: DeferredFunctionArgument): Expression {
	let retval = zero();
	try {
		expression();
	} catch (error) {
		if (error instanceof ControlFlowSignal) {
			throw error;
		}
		retval = one();
	}
	return retval;
}

/**
 * A branching function. Its arguments are deferred so only the selected branch is evaluated.
 * When the false branch is omitted, a false condition produces the parser's empty result.
 * @param condition
 * @param branch1
 * @param branch2
 * @returns
 */
export function IF(
	condition: DeferredFunctionArgument,
	branch1: DeferredFunctionArgument,
	branch2?: DeferredFunctionArgument
) {
	const evaluatedCondition = condition();

	let retval: ParserEntity;
	if (isTruthy(evaluatedCondition)) {
		retval = branch1();
	} else {
		retval = branch2 ? branch2() : new Vector();
	}
	return retval;
}

/**
 * Repeatedly evaluates a deferred body while a deferred condition is nonzero.
 * The condition is reevaluated before every iteration. BREAK and CONTINUE are consumed here so
 * they apply only to the nearest loop; other control-flow signals continue to unwind outward.
 * The final completed body result is returned; if the body never completes, an empty Vector is
 * returned.
 * @param condition
 * @param body
 * @returns
 */
export function WHILE(condition: DeferredFunctionArgument, body: DeferredFunctionArgument) {
	let retval: ParserEntity = new Vector();
	let continueLoop = true;
	let iterations = 0;

	while (continueLoop) {
		const evaluatedCondition = condition();

		if (!isTruthy(evaluatedCondition)) {
			continueLoop = false;
		} else {
			if (iterations >= Settings.MAX_LOOP_ITERATIONS) {
				throw new ParserError(
					message('loopIterationLimitExceeded', {
						max: String(Settings.MAX_LOOP_ITERATIONS),
					})
				);
			}
			loopBodyDepth++;
			try {
				retval = body();
			} catch (error) {
				if (BreakSignal.isBreakSignal(error)) {
					continueLoop = false;
				} else if (!ContinueSignal.isContinueSignal(error)) {
					throw error;
				}
			} finally {
				loopBodyDepth--;
			}
			iterations++;
		}
	}

	return retval;
}

/**
 * Evaluates a deferred initializer once, then delegates repeated condition and body evaluation
 * to WHILE. The update runs after each completed body evaluation and also before a CONTINUE
 * advances to the next condition check. BREAK and RETURN skip the pending update. The final
 * completed body result is returned; if the body never completes, WHILE's empty-Vector result
 * is preserved.
 * @param initializer
 * @param condition
 * @param update
 * @param body
 * @returns
 */
export function FOR(
	initializer: DeferredFunctionArgument,
	condition: DeferredFunctionArgument,
	update: DeferredFunctionArgument,
	body: DeferredFunctionArgument
) {
	initializer();
	const retval = WHILE(condition, () => {
		let bodyResult: ParserEntity;
		try {
			bodyResult = body();
		} catch (error) {
			if (ContinueSignal.isContinueSignal(error)) {
				update();
			}
			throw error;
		}
		update();
		return bodyResult;
	});
	return retval;
}

/**
 * Evaluates a sequence of deferred parser commands in order.
 * The final command's result is returned. Control-flow signals are not consumed here, allowing
 * RETURN, BREAK, and CONTINUE to unwind to their enclosing function or loop boundary. An empty
 * block retains the historical empty-vector result.
 * @param args
 * @returns
 */
export function BLOCK(...args: DeferredFunctionArgument[]) {
	let retval: ParserEntity = new Vector();
	for (const arg of args) {
		retval = arg();
	}
	return retval;
}

/**
 * Evaluates one parser-dispatched function through the outer return boundary.
 *
 * Nested parser calls keep propagating RETURN. The outermost parser call consumes it when
 * execution is not already inside a symbolic function.
 */
export function parserReturnBoundary(evaluate: () => ParserEntity): ParserEntity {
	const consumesReturn =
		symbolicFunctionDepth === 0 && parserReturnBoundaryDepth === 0;
	let retval: ParserEntity;

	parserReturnBoundaryDepth++;
	try {
		retval = evaluate();
	} catch (error) {
		if (consumesReturn && ReturnSignal.isReturnSignal(error)) {
			retval = error.value;
		} else {
			throw error;
		}
	} finally {
		parserReturnBoundaryDepth--;
	}

	return retval;
}

/** Evaluates BLOCK through the parser return boundary. */
export function parserBlock(...args: DeferredFunctionArgument[]): ParserEntity {
	return parserReturnBoundary(() => BLOCK(...args));
}
