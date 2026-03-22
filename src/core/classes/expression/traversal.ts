import { Expression } from './Expression';
import { one, zero } from './shortcuts';

import type { conditionType, actionType } from './utils';

function collect(x: Expression, condition: conditionType, action: actionType, values?: string[]) {
	values ??= [];

	if (condition(x, values)) {
		action(x, values);
	}
	// Apply it to function arguments
	if (x.args) {
		for (const e of x.args) {
			collect(e, condition, action, values);
		}
	}
	// Search the sub-elements
	if (x.elements) {
		for (const e in x.elements) {
			collect(x.elements[e], condition, action, values);
		}
	}
	// Search the power
	if (x.isEXP()) {
		// Check target value. It's difficult to know if it's a variable so the best way is to parse and check.
		// The unfortunate consequence is that we create a reliance on Parser.parse but target is a very tricky
		// issue to solve. Consider (x+1)^x. A link to the previous type can be created but then if it gets
		// raised again (x+1)^x^x then we have two links in which case we're not searching the chain.
		// Is it better to rely on parse? Or a reference to target class and introduce a `searchChain` method for instance.
		collect(x.getBase(), condition, action, values);
		// Check the power
		collect(x.getPower(), condition, action, values);
	}

	return values;
}
/**
 * Collects all variables from a set of expressions, sorted alphabetically.
 * @param exprs The array of expression from which the variables will be collect
 * @returns
 */

export function collectVariablesSet(exprs: Expression[]): string[] {
	const varSet = new Set<string>();
	for (const expr of exprs) {
		const v = expr.variables();
		for (const name of v) {
			varSet.add(name);
		}
	}
	return Array.from(varSet).sort();
} /**
 * Collects all the variables in an expression
 *
 * @param x
 * @param vars
 * @returns
 */

export function variables(x: Expression, vars?: string[]) {
	// Must be of type VAR and cannot be a reserved variable or have been encountered before
	const condition = (x: Expression, vars: string[]) => {
		return x.isVAR() && !vars.includes(x.value) && !Expression.RESERVED.includes(x.value);
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
		return x.isFunction() && !fns.includes(getValues ? x.value : x.name!);
	};
	const action = (x: Expression, fns: string[]) => {
		fns.push(getValues ? x.value : x.name!);
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
