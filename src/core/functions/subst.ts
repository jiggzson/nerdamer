import { Expression } from '../classes/expression/Expression';
import { one, zero } from '../classes/expression/shortcuts';
import { sum, product } from '../classes/expression/utils';
import { _ } from '../classes/parser/helpers';
import { Settings } from '../Settings';

import type { ExpressionInput } from '../types';

/** Maps generated substitution symbols such as `u0` back to their original expressions. */
export type SubstitutionMap = Record<string, Expression>;

/** Result returned by {@link uSub}. */
export type USubstitutionResult = [
	expression: Expression,
	substitutions: SubstitutionMap,
];

/** @deprecated Use {@link SubstitutionMap}. */
export type MapObjectType = SubstitutionMap;

export function prodSubst(
	expression: Expression,
	value: Expression,
	withValue: Expression,
	includeNumeric?: boolean
) {
	let retval: Expression | undefined;
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
				let power: Expression | undefined;
				// Get the expression elements
				let expressionElements = expression.elementsArray();
				// Get the elements of the value being subbed.
				const valueElements = value.elementsArray();

				// We'll loop through the elements of the value to be subbed
				// Create an array of the items not substituted
				// A flag to keep track if a substitution occurred
				let success: boolean = false;
				// The array of the elements encountered
				let filtered: Expression[] = [];
				// Keep track of the number of element substituted
				let remaining = valueElements.length;
				while (valueElements.length > 0) {
					// Reset the filtered array
					filtered = [];
					// Start with the assumption that no substitution occurred
					success = false;
					const vc = valueElements[valueElements.length - 1];
					valueElements.pop();

					for (const ec of expressionElements) {
						// First find the value
						if (ec.value === vc.value) {
							// Then get the ratio of their powers
							const pr = ec.getPower().div(vc.getPower());

							// If the power ratio is undefined then we're at the first value. So just set the value to this value
							if (power === undefined) {
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
				if (remaining !== 0 || power === undefined) {
					retval = product(
						...expression.elementsArray(true).map(x => {
							return subst(x, value, withValue, includeNumeric);
						})
					).pow(expression.getPower());
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
 * Replaces a value with another using the existing Expression tree.
 *
 * @param expression The expression being used to perform the substitution
 * @param value The value currently in the expression
 * @param withValue The value that the substitution is being replaced with
 */
export function subst(
	expression: ExpressionInput,
	value: ExpressionInput,
	withValue: ExpressionInput,
	includeNumeric = false
): Expression {
	expression = Expression.create(expression);
	value = Expression.create(value);
	withValue = Expression.create(withValue);

	let retval: Expression | undefined;

	// If the value to be substituted is a sum or product but the value does not contain
	// any then we're done. Also, we don't consider a number a proper LHS value.
	if (expression.isNUM() && !includeNumeric) {
		retval = expression;
	}
	// We next move to the most obvious substitution which is the expression is equal to the value
	else if (expression.eq(value)) {
		retval = withValue;
	}
	// A variable can carry its coefficient and numeric power on the node itself. Replace
	// that base directly so a simple substitution stays within the existing expression tree.
	else if (
		value.isVAR() &&
		value.getPower().isOne() &&
		value.getMultiplier().isOne() &&
		expression.isVAR() &&
		expression.value === value.value
	) {
		const exponent = subst(expression.getPower(), value, withValue, includeNumeric);
		const multiplier = expression.getMultiplier();

		if (exponent.isNUM() && exponent.getMultiplier().isNegative()) {
			retval = one().div(withValue.copy().pow(exponent.abs()));
		} else {
			retval = withValue.copy().pow(exponent);
		}

		if (!multiplier.isOne()) {
			retval = retval.times(multiplier);
		}
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
			retval = Expression.Function(expression.name);
			retval.args = expression.getArguments().map((x: Expression) => {
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

export function getU(x: ExpressionInput, map?: MapObjectType) {
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
 * Replaces one repeated sub-expression with a generated `uN` symbol.
 *
 * The generated symbol is chosen so it does not collide with variables already present
 * in the expression or substitution map. Pass the returned map to later calls when
 * several substitutions should share one namespace, then use {@link uUnSub} to restore
 * the original expressions.
 *
 * @param x - Expression in which the substitution will occur.
 * @param value - Sub-expression to replace.
 * @param map - Existing substitution map to extend.
 * @returns The substituted expression and the updated substitution map.
 *
 * @example
 * ```ts
 * const [substituted, map] = uSub('cos(x)^2+cos(x)+1', 'cos(x)');
 * substituted.text({ sort: true }); // "u0^2+u0+1"
 * uUnSub(substituted, map).eq('cos(x)^2+cos(x)+1'); // true
 * ```
 */
export function uSub(
	x: ExpressionInput,
	value: ExpressionInput,
	map?: SubstitutionMap
): USubstitutionResult {
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

/**
 * Rewrites powers of one variable through a radical substitution without
 * sending the replacement back through generic nested-power simplification.
 * The caller supplies the substitution degree, so fractional powers become
 * exact integer powers of the replacement variable when possible.
 */
export function rewriteRadicals(
	e: Expression,
	variable: string,
	newVar: Expression,
	n: bigint
): Expression {
	let retval = e;

	if ((e.isVAR() || e.isEXP()) && e.value === variable) {
		const m = e.getMultiplier();
		const p = e.getPower();

		if (p.isNUM()) {
			const r = p.getMultiplier();
			const newNum = n * r.numerator;
			const newDen = r.denominator < 0n ? -r.denominator : r.denominator;

			if (newNum % newDen !== 0n) {
				retval = Expression.fromRational(m).times(newVar.pow(`${newNum}/${newDen}`));
			} else {
				const intPower = newNum / newDen;
				retval = Expression.fromRational(m).times(newVar.pow(intPower.toString()));
			}
		} else {
			retval = Expression.fromRational(m).times(newVar.pow(p.times(n.toString())));
		}
	} else if (e.isEXP()) {
		const base = rewriteRadicals(e.getBase(), variable, newVar, n);
		const power = rewriteRadicals(e.getPower(), variable, newVar, n);
		retval = Expression.toEXP(base, power);

		if (!e.getMultiplier().isOne()) {
			retval = retval.times(Expression.fromRational(e.getMultiplier()));
		}
	} else if (e.isSum()) {
		const m = e.getMultiplier();
		const p = e.getPower();
		retval = zero();
		for (const term of e.elementsArray()) {
			retval = retval.plus(rewriteRadicals(term, variable, newVar, n));
		}
		if (!p.isOne()) {
			retval = retval.pow(p);
		}
		if (!m.isOne()) {
			retval = retval.times(Expression.fromRational(m));
		}
	} else if (e.isProduct()) {
		const m = e.getMultiplier();
		const p = e.getPower();
		retval = one();
		for (const element of e.elementsArray()) {
			retval = retval.times(rewriteRadicals(element, variable, newVar, n));
		}
		if (!p.isOne()) {
			retval = retval.pow(p);
		}
		if (!m.isOne()) {
			retval = retval.times(Expression.fromRational(m));
		}
	} else if (e.isFunction()) {
		const args = e.getArguments();
		if (args.length > 0) {
			const newArgs = args.map(a => rewriteRadicals(a, variable, newVar, n));
			retval = Expression.toFunction(e.name, newArgs);
			retval.multiplier = e.getMultiplier().copy();
			retval = Expression.setPower(retval, e.getPower());
		}
	}

	return retval;
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
			const n = pow.getMultiplier().numerator;
			map[u] = Expression.create(y).pow(pow.invert());
			exp = rewriteRadicals(exp, y, Expression.create(u), n);
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
 * Restores substitutions produced by {@link uSub}.
 *
 * @param expression - Expression containing generated substitution symbols.
 * @param map - Map returned by one or more u-substitution calls.
 * @returns The expression after restoring every mapped value.
 */
export function uUnSub(expression: Expression, map: SubstitutionMap): Expression {
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

	// forEveryElement returns immediately for a VAR root. Check the root first so standalone
	// mathematical constants and their powers are promoted just like the same constants nested
	// inside sums and products.
	if (expression.isVAR() && (expression.isConstant() || expression.isI())) {
		constants.add(expression.value);
	}

	expression.forEveryElement(e => {
		// The imaginary unit is a mathematical constant, but isConstant() only recognizes parser
		// constants such as pi and e. Promote i here as well so polynomial factorization does not
		// treat it as an ordinary polynomial variable.
		if (e.isVAR() && (e.isConstant() || e.isI())) {
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
