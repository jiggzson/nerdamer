import type { Expression } from './Expression';
import type { conditionType, actionType } from './utils';

export function collect(
	x: Expression,
	condition: conditionType,
	action: actionType,
	values?: string[]
) {
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
}
