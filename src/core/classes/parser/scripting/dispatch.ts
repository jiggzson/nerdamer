import { mathFunctionRegistry, systemFunction } from '../../../dispatch';
import {
	AND,
	BREAK,
	CONTINUE,
	FOR,
	IF,
	IFERROR,
	ISERROR,
	NOT,
	OR,
	BLOCK,
	RETURN,
	WHILE,
	XOR,
} from './controlFlow';
import { each } from './deferred';
import { evaluate } from './evaluate';
import { LET, normalizeLetArguments, unassign } from './scope';

export function loadScriptingFunctions() {
	Object.assign(mathFunctionRegistry, {
		unassign: systemFunction({ fn: unassign, minArgs: 1, maxArgs: 1, distElWise: false, deferArguments: true }),
		evaluate: systemFunction({
			fn: evaluate,
			minArgs: 1,
			maxArgs: 3,
			equationArgs: [0],
			distElWise: false,
			deferArguments: true,
			usage: 'scripting',
		}),
		return: systemFunction({
			fn: RETURN,
			minArgs: 1,
			maxArgs: 1,
			equationArgs: [0],
			distElWise: false,
			bracketlessStatement: true,
			usage: 'scripting',
		}),
		break: systemFunction({ fn: BREAK, minArgs: 0, maxArgs: 0, distElWise: false, usage: 'scripting' }),
		continue: systemFunction({ fn: CONTINUE, minArgs: 0, maxArgs: 0, distElWise: false, usage: 'scripting' }),
		and: systemFunction({ fn: AND, minArgs: 2, maxArgs: -1, distElWise: false, deferArguments: true, usage: 'scripting' }),
		or: systemFunction({ fn: OR, minArgs: 2, maxArgs: -1, distElWise: false, deferArguments: true, usage: 'scripting' }),
		not: systemFunction({ fn: NOT, minArgs: 1, maxArgs: 1, distElWise: false, usage: 'scripting' }),
		xor: systemFunction({ fn: XOR, minArgs: 2, maxArgs: -1, distElWise: false, usage: 'scripting' }),
		iferror: systemFunction({ fn: IFERROR, minArgs: 2, maxArgs: 2, distElWise: false, deferArguments: true, usage: 'scripting' }),
		iserror: systemFunction({ fn: ISERROR, minArgs: 1, maxArgs: 1, distElWise: false, deferArguments: true, usage: 'scripting' }),
		if: systemFunction({ fn: IF, minArgs: 2, maxArgs: 3, distElWise: false, deferArguments: true, returnBoundary: true, usage: 'scripting' }),
		while: systemFunction({ fn: WHILE, minArgs: 2, maxArgs: 2, distElWise: false, deferArguments: true, returnBoundary: true, usage: 'scripting' }),
		for: systemFunction({ fn: FOR, minArgs: 4, maxArgs: 4, distElWise: false, deferArguments: true, returnBoundary: true, usage: 'scripting' }),
		each: systemFunction({ fn: each, minArgs: 3, maxArgs: 4, distElWise: false, deferArguments: true, usage: 'scripting' }),
		let: systemFunction({
			fn: LET,
			minArgs: 3,
			maxArgs: -1,
			distElWise: false,
			deferArguments: true,
			normalizeDeferredArguments: normalizeLetArguments,
			returnBoundary: true,
			usage: 'scripting',
		}),
		block: systemFunction({
			fn: BLOCK,
			minArgs: -1,
			maxArgs: -1,
			distElWise: false,
			deferArguments: true,
			returnBoundary: true,
			usage: 'scripting',
		}),
	});
}
