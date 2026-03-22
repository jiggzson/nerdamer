import { Expression } from '../expression/Expression';
import { Vector } from '../vector/Vector';

import type { ParserInputType } from './types';

/**
 * A wrapper function to let the Parser know that this was the return value of a block function.
 * @param x
 * @returns
 */
export function RETURN(x: ParserInputType) {
	const retval = Expression.create(x, undefined, true);
	retval.isFunctionReturn = true;
	return retval;
}

/**
 * A branching function
 * @param condition
 * @param branch1
 * @param branch2
 * @returns
 */
export function IF(condition: Expression, branch1: ParserInputType, branch2: ParserInputType) {
	if (condition.isZero()) {
		return branch2;
	}
	return branch1;
}

/**
 * The block function is nothing more than a function that allows the execution of a bunch of commands.
 * It always returns a vector and as such it allows for multiple return values.
 * @param args
 * @returns
 */
export function BLOCK(...args: ParserInputType[]) {
	const retval = new Vector();
	for (const arg of args) {
		if (arg.isFunctionReturn) {
			retval.append(arg);
		}
	}
	return retval;
}
