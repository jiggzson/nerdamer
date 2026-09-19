import { Parser } from '../Parser';

import { functionBoundary } from './controlFlow';

import type { ParserEntity } from '../../../types';
import type { DeferredFunctionArgument } from '../types';

/**
 * Evaluates a symbolic user-function body with call-scoped argument bindings.
 *
 * Arguments temporarily shadow parser known values so ordinary assignment can update a
 * function parameter during the call. Previous bindings are restored afterward, including
 * when RETURN or another error unwinds evaluation. A string body is parsed per invocation;
 * a deferred parser body reuses its compiled RPN while still resolving current parameter and
 * known-value state. RETURN is consumed at the function boundary so its parser entity becomes
 * the function result and cannot escape into the caller. BREAK and CONTINUE are also rejected
 * at that boundary so loop control cannot cross a function call.
 */
export function wrappedFunction(
	expression: string | DeferredFunctionArgument,
	argList: string[]
) {
	return (...inputs: ParserEntity[]) => {
		const previousValues = new Map<string, ParserEntity>();
		const previouslyUndefined = new Set<string>();

		for (let i = 0; i < argList.length; i++) {
			const name = argList[i];
			if (!previousValues.has(name) && !previouslyUndefined.has(name)) {
				if (Object.prototype.hasOwnProperty.call(Parser.KNOWN_VALUES, name)) {
					previousValues.set(name, Parser.KNOWN_VALUES[name]);
				} else {
					previouslyUndefined.add(name);
				}
			}
			Parser.KNOWN_VALUES[name] = inputs[i];
		}

		let retval: ParserEntity;
		try {
			retval = functionBoundary(() => {
				let result: ParserEntity;
				if (typeof expression === 'string') {
					result = Parser.parse(expression);
				} else {
					// Function declarations should not capture temporary Parser.parse(..., values)
					// substitutions from registration. Parameter and persistent known values are
					// resolved from the current call instead.
					result = expression({ inheritValues: false });
				}
				return result;
			});
		} finally {
			for (const [name, value] of previousValues) {
				Parser.KNOWN_VALUES[name] = value;
			}
			for (const name of previouslyUndefined) {
				delete Parser.KNOWN_VALUES[name];
			}
		}
		return retval;
	};
}
