import { message, ParserError, UnexpectedDataType } from '../../../errors';
import { Settings } from '../../../Settings';
import { Expression } from '../../expression/Expression';
import { one, zero } from '../../expression/shortcuts';
import { dataTypes } from '../constants';
import {
	BreakSignal,
	ContinueSignal,
	ControlFlowSignal,
	NullSignal,
	ReturnSignal,
} from '../controlFlowSignals';

import type { ParserEntity } from '../../../types';
import type { DeferredFunctionArgument } from '../types';

export {
	BREAK_SIGNAL,
	CONTINUE_SIGNAL,
	NULL_SIGNAL,
	RETURN_SIGNAL,
	BreakSignal,
	ContinueSignal,
	ControlFlowSignal,
	NullSignal,
	ReturnSignal,
} from '../controlFlowSignals';

const BREAK_SIGNAL_INSTANCE = new BreakSignal();
const CONTINUE_SIGNAL_INSTANCE = new ContinueSignal();
let loopBodyDepth = 0;
let parserReturnBoundaryDepth = 0;
let returnPropagationDepth = 0;
let symbolicFunctionDepth = 0;

function throwNullSignal(): never {
	throw new NullSignal();
}

export function isInsideSymbolicFunction(): boolean {
	return symbolicFunctionDepth > 0;
}

export function shouldConsumeLocalReturn(): boolean {
	return symbolicFunctionDepth === 0 && returnPropagationDepth === 0;
}

export function withReturnPropagation(evaluate: () => ParserEntity): ParserEntity {
	returnPropagationDepth++;
	try {
		return evaluate();
	} finally {
		returnPropagationDepth--;
	}
}

function isTruthy(value: ParserEntity): boolean {
	if (!Expression.isExpression(value)) {
		throw new UnexpectedDataType(
			message('expressionExpected', { type: dataTypes[value.dataType] })
		);
	}
	return !value.isZero();
}

export function functionBoundary(evaluate: () => ParserEntity): ParserEntity {
	let retval: ParserEntity;
	symbolicFunctionDepth++;
	try {
		retval = evaluate();
	} catch (error) {
		if (ReturnSignal.isReturnSignal(error)) {retval = error.value;}
		else if (BreakSignal.isBreakSignal(error)) {throw new ParserError(message('breakOutsideLoop'));}
		else if (ContinueSignal.isContinueSignal(error)) {throw new ParserError(message('continueOutsideLoop'));}
		else {throw error;}
	} finally {
		symbolicFunctionDepth--;
	}
	return retval;
}

export function RETURN(x: ParserEntity): never {
	throw new ReturnSignal(x);
}

export function BREAK(): never {
	if (loopBodyDepth === 0) {throw new ParserError(message('breakOutsideLoop'));}
	throw BREAK_SIGNAL_INSTANCE;
}

export function CONTINUE(): never {
	if (loopBodyDepth === 0) {throw new ParserError(message('continueOutsideLoop'));}
	throw CONTINUE_SIGNAL_INSTANCE;
}

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

export function NOT(value: ParserEntity): Expression {
	return isTruthy(value) ? zero() : one();
}

export function XOR(...args: ParserEntity[]): Expression {
	let odd = false;
	for (const arg of args) {if (isTruthy(arg)) {odd = !odd;}}
	return odd ? one() : zero();
}

export function IFERROR(expression: DeferredFunctionArgument, fallback: DeferredFunctionArgument): ParserEntity {
	let retval: ParserEntity;
	try {
		retval = expression();
	} catch (error) {
		if (error instanceof ControlFlowSignal) {throw error;}
		retval = fallback();
	}
	return retval;
}

export function ISERROR(expression: DeferredFunctionArgument): Expression {
	let retval = zero();
	try {
		expression();
	} catch (error) {
		if (error instanceof ControlFlowSignal) {throw error;}
		retval = one();
	}
	return retval;
}

function controlFlowReturnBoundary(evaluate: () => ParserEntity): ParserEntity {
	let retval: ParserEntity;
	try {
		retval = evaluate();
	} catch (error) {
		if (
			parserReturnBoundaryDepth > 0 &&
			shouldConsumeLocalReturn() &&
			ReturnSignal.isReturnSignal(error)
		) {retval = error.value;}
		else {throw error;}
	}
	return retval;
}

export function IF(
	condition: DeferredFunctionArgument,
	branch1: DeferredFunctionArgument,
	branch2?: DeferredFunctionArgument
): ParserEntity {
	return controlFlowReturnBoundary(() => {
		const evaluatedCondition = condition();
		let retval: ParserEntity;
		if (isTruthy(evaluatedCondition)) {retval = branch1();}
		else if (branch2) {retval = branch2();}
		else {return throwNullSignal();}
		return retval;
	});
}

export function WHILE(
	condition: DeferredFunctionArgument,
	body: DeferredFunctionArgument
): ParserEntity {
	return controlFlowReturnBoundary(() => {
		let retval: ParserEntity | undefined;
		let continueLoop = true;
		let iterations = 0;
		while (continueLoop) {
			const evaluatedCondition = condition();
			if (!isTruthy(evaluatedCondition)) {continueLoop = false;}
			else {
				if (iterations >= Settings.MAX_LOOP_ITERATIONS) {
					throw new ParserError(
						message('loopIterationLimitExceeded', { max: String(Settings.MAX_LOOP_ITERATIONS) })
					);
				}
				loopBodyDepth++;
				try {
					retval = body();
				} catch (error) {
					if (NullSignal.isNullSignal(error)) {
						// A loop body may legitimately complete without producing a value.
					} else if (BreakSignal.isBreakSignal(error)) {continueLoop = false;}
					else if (!ContinueSignal.isContinueSignal(error)) {throw error;}
				} finally {
					loopBodyDepth--;
				}
				iterations++;
			}
		}
		if (retval === undefined) {
			return throwNullSignal();
		}
		return retval;
	});
}

export function FOR(
	initializer: DeferredFunctionArgument,
	condition: DeferredFunctionArgument,
	update: DeferredFunctionArgument,
	body: DeferredFunctionArgument
): ParserEntity {
	return controlFlowReturnBoundary(() => {
		initializer();
		return WHILE(condition, () => {
			let bodyResult: ParserEntity;
			try {
				bodyResult = body();
			} catch (error) {
				if (
					ContinueSignal.isContinueSignal(error) ||
					NullSignal.isNullSignal(error)
				) {update();}
				throw error;
			}
			update();
			return bodyResult;
		});
	});
}

export function BLOCK(...args: DeferredFunctionArgument[]) {
	if (args.length === 0) {return throwNullSignal();}
	let retval: ParserEntity | undefined;
	for (const arg of args) {
		try {
			retval = arg();
		} catch (error) {
			if (!NullSignal.isNullSignal(error)) {throw error;}
		}
	}
	if (retval === undefined) {return throwNullSignal();}
	return retval;
}

export function parserReturnBoundary(evaluate: () => ParserEntity): ParserEntity {
	const consumesReturn = symbolicFunctionDepth === 0 && parserReturnBoundaryDepth === 0;
	let retval: ParserEntity;
	parserReturnBoundaryDepth++;
	try {
		retval = evaluate();
	} catch (error) {
		if (consumesReturn && ReturnSignal.isReturnSignal(error)) {retval = error.value;}
		else {throw error;}
	} finally {
		parserReturnBoundaryDepth--;
	}
	return retval;
}

export function parserBlock(...args: DeferredFunctionArgument[]): ParserEntity {
	return parserReturnBoundary(() => BLOCK(...args));
}
