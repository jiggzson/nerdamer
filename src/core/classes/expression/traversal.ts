import { collect } from './collect';
import { one, zero } from './shortcuts';

import type { Expression } from './Expression';

/**
 * Collects all the variables in an expression
 *
 * @param x
 * @param vars
 * @param reserved Names excluded from free-variable collection.
 * @returns
 */

export function variables(
	x: Expression,
	vars: string[] | undefined,
	reserved: readonly string[]
) {
	// Must be of type VAR, cannot be the imaginary unit or a reserved variable, and cannot have been encountered before
	const condition = (x: Expression, vars: string[]) => {
		return (
			x.isVAR() &&
			!x.isI() &&
			!vars.includes(x.value) &&
			!reserved.includes(x.value)
		);
	};
	const action = (x: Expression, vars: string[]) => {
		vars.push(x.value);
	};
	return collect(x, condition, action, vars);
}
/**
 * Collects the functions in a symbolic expression
 *
 * @param x
 * @param fns
 * @returns
 */

export function functions(x: Expression, fns?: string[], getValues?: boolean) {
	// The name property is guaranteed on the FUN type.
	const condition = (x: Expression, fns: string[]) => {
		return x.isFunction() && !fns.includes(getValues === true ? x.value : x.name);
	};
	const action = (x: Expression, fns: string[]) => {
		if (getValues === true) {
			fns.push(x.value);
		} else if (x.isFunction()) {
			fns.push(x.name);
		}
	};
	return collect(x, condition, action, fns);
}
export function hasFunction(x: Expression, name: string, deep = false) {
	if (x.isFunction() && x.name === name) {
		return true;
	}
	// Search the function arguments
	if (deep && x.args) {
		for (const e of x.args) {
			if (hasFunction(e, name, deep)) {
				return true;
			}
		}
	}
	// Search the sub-elements
	if (x.elements) {
		for (const e in x.elements) {
			if (hasFunction(x.elements[e], name, deep)) {
				return true;
			}
		}
	}
	// Search the power
	if (deep && x.isEXP()) {
		// Check x value. It's difficult to know if it's a variable
		// so the best way is to parse and check.
		// Creating a new instance seems like overkill
		if (hasFunction(x.getBase(), name, deep)) {
			return true;
		}
		// Check the power
		if (hasFunction(x.getPower(), name, deep)) {
			return true;
		}
	}

	return false;
}

export function hasVariable(x: Expression, variable: string) {
	// Only VAR is a variable so we want its value.
	if (x.isVAR() && x.value === variable) {
		return true;
	}
	// Search the function arguments
	if (x.args) {
		for (const e of x.args) {
			if (hasVariable(e, variable)) {
				return true;
			}
		}
	}
	// Search the sub-elements
	if (x.elements) {
		const elements = x.getElements();
		for (const e in elements) {
			if (hasVariable(elements[e], variable)) {
				return true;
			}
		}
	}
	// Search the power
	if (x.isEXP()) {
		// Check x value. It's difficult to know if it's a variable
		// so the best way is to parse and check.
		// TODO: See if x still makes sense. Creating a new instance seems like overkill
		if (hasVariable(x.getBase(), variable)) {
			return true;
		}
		// Check the power
		if (hasVariable(x.getPower(), variable)) {
			return true;
		}
	}

	return false;
} /**
 * Loops through each elements and rebuilds a new expression
 * @param x
 * @param fn
 * @returns
 */

export function forEveryElement(x: Expression, fn: (e: Expression) => Expression, isLeaf = false) {
	// There's nothing to iterate over for these types so done.
	if (x.isNUM() || x.isVAR()) {
		return x;
	}

	const m = x.getMultiplier();
	let p = x.getPower();

	// Call it on p if it's an EXP
	if (x.isEXP()) {
		p = forEveryElement(p, fn, true);
	}

	// Don't call it again if it was called from inside forEveryElement and trust that it was
	// properly processed
	const exp = fn(x.toLinearAndUnitMultiplier());

	let retval: Expression;

	if (exp.isFunction()) {
		exp.args = exp.getArguments().map(e => {
			if (isLeaf) {
				return fn(e);
			}
			return forEveryElement(e, fn, true);
		});
		retval = exp;
	} else if (exp.isProduct()) {
		retval = one();
		for (let e of exp.elementsArray()) {
			e = fn(e);
			retval = retval.times(forEveryElement(e, fn, true));
		}
	} else if (exp.isSum()) {
		retval = zero();
		for (let e of exp.elementsArray()) {
			e = fn(e);
			retval = retval.plus(forEveryElement(e, fn, true));
		}
	} else {
		retval = fn(exp);
	}

	return retval.pow(p).times(m);
}

/**
 * Counts the nodes in an expression tree as a structural size measure.
 *
 * @remarks
 * Each node counts once, together with its function arguments, its sum or product
 * elements, the base of an exponential (`EXP`) node, and any power other than one.
 * Numeric values count as one node regardless of their digits, and multipliers are not
 * counted, so `(1/39916800)*x` and `x` have the same size, as do `x^2` and `x^12`.
 * Unlike printed length, the result doesn't depend on number formatting.
 *
 * @param x - Expression to measure.
 * @returns The number of nodes, at least one.
 *
 * @example
 * ```ts
 * nodeCount(Expression.create('x'));       // 1
 * nodeCount(Expression.create('x^2'));     // 2
 * nodeCount(Expression.create('sin(x)'));  // 2
 * ```
 */
export function nodeCount(x: Expression): number {
	let retval = 1;

	for (const arg of x.args ?? []) {
		retval += nodeCount(arg);
	}
	for (const element of Object.values(x.elements ?? {})) {
		retval += nodeCount(element);
	}
	if (x.isEXP() && x.base) {
		retval += nodeCount(x.base);
	}
	if (x.power && !x.power.isOne()) {
		retval += nodeCount(x.power);
	}

	return retval;
}
