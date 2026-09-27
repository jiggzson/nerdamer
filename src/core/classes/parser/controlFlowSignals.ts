import { isNerdamerNativeType } from '../../common/common';

import type { ParserEntity } from '../../types';

export const RETURN_SIGNAL = 'RETURN_SIGNAL';
export const BREAK_SIGNAL = 'BREAK_SIGNAL';
export const CONTINUE_SIGNAL = 'CONTINUE_SIGNAL';
export const NULL_SIGNAL = 'NULL_SIGNAL';

/**
 * Internal signals used to unwind late-bound parser evaluation.
 *
 * Deferred scripting expressions can execute after their surrounding syntax has
 * already been parsed, so return, loop control, and no-result state must travel
 * to the evaluation boundary that knows how to consume them.
 *
 * The signals live at the parser level rather than under scripting because both
 * Parser and the scripting implementation need to recognize them. Keeping this
 * module dependency-light avoids a Parser -> scripting -> Parser import cycle.
 * These are evaluation mechanics, not parser result values.
 */
export abstract class ControlFlowSignal extends Error {
	constructor() {
		super();
		this.name = new.target.name;
	}
}

export class ReturnSignal extends ControlFlowSignal {
	readonly dataType: typeof RETURN_SIGNAL = RETURN_SIGNAL;
	constructor(readonly value: ParserEntity) {
		super();
	}
	static isReturnSignal(obj: unknown): obj is ReturnSignal {
		return isNerdamerNativeType(obj, RETURN_SIGNAL);
	}
}

export class BreakSignal extends ControlFlowSignal {
	readonly dataType: typeof BREAK_SIGNAL = BREAK_SIGNAL;
	static isBreakSignal(obj: unknown): obj is BreakSignal {
		return isNerdamerNativeType(obj, BREAK_SIGNAL);
	}
}

export class ContinueSignal extends ControlFlowSignal {
	readonly dataType: typeof CONTINUE_SIGNAL = CONTINUE_SIGNAL;
	static isContinueSignal(obj: unknown): obj is ContinueSignal {
		return isNerdamerNativeType(obj, CONTINUE_SIGNAL);
	}
}

export class NullSignal extends ControlFlowSignal {
	readonly dataType: typeof NULL_SIGNAL = NULL_SIGNAL;
	static isNullSignal(obj: unknown): obj is NullSignal {
		return isNerdamerNativeType(obj, NULL_SIGNAL);
	}
}
