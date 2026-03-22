import { simplify } from '../../algebra/simplify/simplify';
import { sum, product } from '../../math/utils';
import { Expression } from '../classes/expression/Expression';
import { one } from '../classes/expression/shortcuts';
import { _ } from '../classes/parser/helpers';
import { Parser } from '../classes/parser/Parser';
import { Settings } from '../Settings';

import type { ExpressionInputType } from '../classes/parser/types';
import type { Vector } from '../classes/vector/Vector';

export type MapObjectType = { [value: string]: Expression };

export function prodSubst(
	expression: Expression,
	value: Expression,
	withValue: Expression,
	includeNumeric?: boolean
) {
	let retval;
	/**
	 * The overview:
	 * We loop through the elements of each. The multiplier of the the power (meaning the power being substituted divided by the existing),
	 * has to match for each of the elements. Additionally, that ratio has to be an integer. If neither criteria is satisfied, then
	 * we exit and return the expression.
	 */
	if (expression.isProduct()) {
		if (value.isProduct()) {
			// First check the multipliers. This has to be an integer
			const m = expression.getMultiplier().div(value.getMultiplier());
			if (!m.isInteger() && !Settings.ALLOW_RAT_SUBS) {
				retval = new Expression(expression);
			} else {
				let power;
				// Get the expression elements
				let expressionElements = expression.elementsArray();
				// Get the elements of the value being subbed.
				const valueElements = value.elementsArray();

				// We'll loop through the elements of the value to be subbed
				// Create an array of the items not substituted
				// A flag to keep track if a substitution occurred
				let success: boolean = false;
				// The array of the elements encountered
				let filtered;
				// Keep track of the number of element substituted
				let remaining = valueElements.length;
				while (valueElements.length) {
					// Reset the filtered array
					filtered = [];
					// Start with the assumption that no substitution occurred
					success = false;
					const vc = valueElements.pop()!;

					for (const ec of expressionElements) {
						// First find the value
						if (ec.value === vc.value) {
							// Then get the ratio of their powers
							const pr = ec.getPower().div(vc.getPower());

							// If the power ratio is undefined then we're at the first value. So just set the value to this value
							if (!power) {
								power = pr;
							}
							// If the ratio of the powers is not an integer then we're done and exit or
							// If the power ratios don't match then we're done. For instance if we're substituting x*y in x^2*y,
							// the ratio will be (2, 1) and it's therefore not a valid substitution
							if ((!pr.isInteger() || !pr.eq(power)) && !ec.isEXP()) {
								break;
							}

							success = true;
							remaining--;
						} else {
							filtered.push(subst(ec, value, withValue, includeNumeric));
						}
					}
					// If any substitution failed then we're done and exit
					if (!success) {
						break;
					}
					// Update the list with the new one which doesn't have the substituted element
					expressionElements = filtered;
				}

				// If all the elements weren't substituted then return the original expression
				if (remaining !== 0) {
					retval = new Expression(expression);
				}
				// Otherwise add the substituted value to the filtered set and return the sum product
				else {
					filtered.push(withValue.pow(power));
					retval = product(...filtered);
					// Transfer the power and multiplier
					retval.multiplier = retval.getMultiplier().times(m);
				}
				// Make substitutions in the power
				retval = retval.pow(subst(expression.getPower(), value, withValue, includeNumeric));
			}
		} else {
			// Convert it to an array, substitute out each element, convert it back to a product
			// but make sure to put back the expression multiplier.
			retval = product(
				...expression.elementsArray(true).map(x => {
					return subst(x, value, withValue, includeNumeric);
				})
			).pow(expression.getPower());
		}
	}

	return retval || expression;
}

/**
 * Performs a substitution on a sum
 *
 * @param expression
 * @param value
 * @param withValue
 * @returns
 */
export function sumSubst(
	expression: Expression,
	value: Expression,
	withValue: Expression,
	includeNumeric?: boolean
) {
	let retval: Expression | undefined;

	if (!expression.isSum()) {
		return expression;
	}

	// Put back later (do NOT mutate fields directly)
	const exprPow = expression.getPower();
	const exprMul = expression.getMultiplier();

	if (value.isSum()) {
		// Work on raw elements first (do not subst yet)
		const remaining = expression.elementsArray().slice();

		// Decide how to treat the value being substituted
		const valueElements =
			value.isSum() && value.isLinear() ? value.elementsArray() : [value.toUnitMultiplier()];

		const matched: Expression[] = [];
		let m: Expression | undefined;

		for (const vc of valueElements) {
			// Find exactly one matching term in the remaining pool
			const idx = remaining.findIndex(
				ec => ec.value === vc.value && ec.getPower().eq(vc.getPower())
			);
			if (idx === -1) {
				// Fail: cannot substitute, so just recurse normally on the whole sum
				const out = sum(
					...expression
						.elementsArray()
						.map(x => subst(x, value, withValue, includeNumeric))
				);
				return out.pow(exprPow).times(exprMul);
			}

			const ec = remaining[idx];
			remaining.splice(idx, 1);
			matched.push(ec);

			const tm = ec.div(vc);
			if (!m) {
				m = tm;
			} else if (!tm.eq(m)) {
				// Ratio mismatch: fail -> normal recursion
				const out = sum(
					...expression
						.elementsArray()
						.map(x => subst(x, value, withValue, includeNumeric))
				);
				return out.pow(exprPow).times(exprMul);
			}
		}

		// Success: substitute the whole group by withValue * m,
		// and recurse into the remaining terms (important!)
		const substituted = withValue.times(m || one());
		const rewrittenTerms = remaining.map(t => subst(t, value, withValue, includeNumeric));
		rewrittenTerms.push(substituted);

		retval = sum(...rewrittenTerms)
			.pow(exprPow)
			.times(exprMul);
	} else {
		// Original behavior for non-sum value: recurse per term
		retval = sum(
			...expression.elementsArray().map(x => subst(x, value, withValue, includeNumeric))
		)
			.pow(exprPow)
			.times(exprMul);
	}

	return retval || expression;
}

/**
 * Replaces a value with another. The base parse function provides some basic substitution
 * but this is primarily for single variables. This function provides more complex substitutions.
 *
 * @param expression The expression being used to perform the substitution
 * @param value The value currently in the expression
 * @param withValue The value that the substitution is being replaced with
 */
export function subst(
	expression: ExpressionInputType,
	value: ExpressionInputType,
	withValue: ExpressionInputType,
	includeNumeric = false
): Expression {
	expression = Expression.create(expression);
	value = Expression.create(value);
	withValue = Expression.create(withValue);

	let retval;

	// If the value to be substituted is a sum or product but the value does not contain
	// any then we're done. Also, we don't consider a number a proper LHS value.
	if (expression.isNUM() && !includeNumeric) {
		retval = expression;
	}
	// We next move to the most obvious substitution which is the expression is equal to the value
	else if (expression.eq(value)) {
		retval = withValue;
	}

	// If the value is a simple variable then we can utilize the parser which already does a great
	// job of substituting
	else if (value.isVAR() && value.getPower().isOne() && value.getMultiplier().isOne()) {
		retval = Parser.parse(expression.text(), { [value.value]: withValue.text() });
	} else if (expression.isProduct()) {
		retval = prodSubst(expression, value, withValue, includeNumeric);
	}
	// The power has to be one because we cannot swap terms otherwise
	// TODO: SUM with nested GRP
	else if (expression.isSum()) {
		// Perform a simple sum factor on the expression so we can detect the t+1 in expression like a*t+a.
		// This should not affect a substitution for the a*t since products are checked first.
		// expression = sumFactor(expression);
		// If it was factored then it belongs to the product substitution
		retval = sumSubst(expression, value, withValue, includeNumeric);
	} else if (expression.isFunction()) {
		if (expression.value === value.value) {
			retval = new Expression(withValue);
		} else {
			retval = Expression.Function(expression.name!);
			retval.args = expression.getArguments().map(x => {
				return subst(x, value, withValue, includeNumeric);
			});

			// Update the value to reflect the new argument(s)
			retval.updateValue();
		}

		retval = retval.pow(expression.getPower()).times(expression.getMultiplier());
	} else if (expression.isEXP()) {
		const base = subst(expression.getBase(), value, withValue, true);
		const exp = subst(expression.getPower(), value, withValue, includeNumeric);
		retval = base.pow(exp).times(expression.getMultiplier());
	}

	return retval || expression;
}

export function getU(x: ExpressionInputType, map?: MapObjectType) {
	x = Expression.create(x);
	const variables = x.variables();
	map ??= {};

	let count = 0;
	let u: string;

	do {
		u = `u${count}`;
		count++;
	} while (variables.includes(u) || u in map);

	return u;
}

/**
 * Performs a u-substitution in an expression. The u will be calculated so it doesn't
 * conflict with any of the existing variables.
 * IMPORTANT: The order of substitutions is NOT preserved.
 *
 * @param expression The expression in which the substitution will occur
 * @param subst The value being substituted
 * @param mapObj
 */
export function uSub(
	x: ExpressionInputType,
	value: ExpressionInputType,
	map?: MapObjectType
): [Expression, MapObjectType] {
	// Create the map object is one wasn't provided
	map ??= {};
	x = Expression.create(x);
	value = Expression.create(value);

	// Get a suitable u
	const u = getU(x, map);

	// Perform the substitution
	const subbed = subst(x, value, _(u));

	// Mark it as updated
	if (!subbed.eq(x)) {
		map[u] = value;
	}

	return [subbed, map];
}

export function subRadicals(x: Expression): [Expression, MapObjectType] {
	let num = x.getNumerator();
	let den = x.getDenominator();
	const subs: Record<string, Expression> = {};
	// The map of uSubstitutions
	const map: MapObjectType = {};
	// A record to track which variables already map to which u
	const references: Record<string, string> = {};

	function collectPowers(exp: Expression) {
		const elements = exp.elementsArray();
		// We're going to loop through the elements and look for radicals
		// Like variables are just going to get their combined power so
		// a^(1/n)+a^(1/m) will just be mapped to a: n*m
		for (const e of elements) {
			if (e.hasRadical()) {
				// Don't touch numbers.
				if (e.isNUM()) {
					continue;
				}
				const n = e.getPower().getDenominator();
				const v = e.value;
				const existing = subs[v];
				// Multiply the power on the existing if one already exists
				subs[v] = existing ? subs[v].times(n) : n;
			}
		}
	}

	function makeSubstitutions(exp: Expression) {
		// Make the substitutions
		for (const y in subs) {
			const u = references[y] ? references[y] : getU(exp, map);
			// Map the u to the variable
			references[y] = u;
			const pow = subs[y];
			// Make the substitution
			const s = Expression.create(u).pow(pow);
			map[u] = Expression.create(y).pow(pow.invert());
			exp = subst(exp, y, s);
		}
		return exp;
	}
	collectPowers(num);
	collectPowers(den);
	num = makeSubstitutions(num);
	den = makeSubstitutions(den);
	return [num.div(den), map];
}

/**
 * Reverses the u-substitution
 *
 * @param expression
 * @param map
 * @returns
 */
export function uUnSub(expression: Expression, map: MapObjectType) {
	// Substitute back in all the elements. Remember that the order is not preserved.
	for (const u in map) {
		const value = map[u];
		expression = subst(expression, _(u), value);
	}

	return expression;
}

/**
 * Performs a u-substitution of all the constants in the expression.
 *
 * @param expression
 * @param map
 * @returns
 */
export function uSubConstants(
	expression: Expression,
	map?: MapObjectType
): [Expression, MapObjectType] {
	map ??= {};
	const constants: Set<string> = new Set();

	expression.forEveryElement(e => {
		if (e.isVAR() && e.isConstant()) {
			constants.add(e.value);
		}
		return e;
	});

	for (const c of constants) {
		[expression, map] = uSub(expression, _(c), map);
	}

	return [expression, map];
}

/**
 * Performs a u-substitution on all the functions in the expression
 *
 * @param expression
 * @param map
 * @returns
 */
export function uSubFN(expression: Expression, map?: MapObjectType): [Expression, MapObjectType] {
	// Create the map object if none was provided
	map ??= {};

	// We get all the functions in the expression. Next we'll u-substitute each one.
	expression.functions(undefined, true).forEach(fn => {
		[expression, map] = uSub(expression, _(fn), map);
	});

	return [expression, map];
}

/**
 * Performs a u-substitution on all the exponential functions in the expression
 * @param expression
 * @param map
 * @returns
 */
export function uSubEXP(expression: Expression, map?: MapObjectType): [Expression, MapObjectType] {
	map ??= {};
	const elementSet: Set<string> = new Set();
	// Create a list of all the EXP function
	expression.forEveryElement(e => {
		if (e.isEXP()) {
			elementSet.add(e.toUnitMultiplier().text());
		}
		return e;
	});

	for (const x of elementSet) {
		[expression, map] = uSub(expression, _(x), map);
	}

	return [expression, map];
}

/**
 * Attempts to put the expression in polynomial form
 * @param expression
 */
export function polynomialize(
	expression: Expression,
	map?: MapObjectType,
	callback?: (e: Expression, map?: MapObjectType) => Expression | Vector
) {
	map ??= {};

	// First simplify the expression
	let x = simplify(expression);
	// Substitute out all functions
	[x, map] = uSubFN(x, map);
	// Substitute out all exponential functions
	[x, map] = uSubEXP(x, map);
	// Constants although numeric are irrationals and need to be removed.
	[x, map] = uSubConstants(x, map);
	// Extract the numerator and denominator
	const num = x.getNumerator();
	const den = x.getDenominator();
	return {
		numerator: callback ? callback(num, map) : num,
		denominator: callback ? callback(den, map) : den,
		map,
	};
}
