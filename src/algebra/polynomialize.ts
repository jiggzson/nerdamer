import {
	uSubConstants,
	uSubEXP,
	uSubFN,
} from '../core/functions/subst';

import { simplify } from './simplify/simplify';

import type { Expression } from '../core/classes/expression/Expression';
import type { Vector } from '../core/classes/vector/Vector';
import type { MapObjectType } from '../core/functions/subst';

/**
 * Attempts to put the expression in polynomial form.
 *
 * @param expression The expression to normalize and polynomialize.
 * @param map Existing u-substitutions to preserve across related expressions.
 * @returns Polynomial numerator and denominator plus the substitution map.
 */
export function polynomialize(
	expression: Expression,
	map?: MapObjectType
): {
	numerator: Expression;
	denominator: Expression;
	map: MapObjectType;
};

export function polynomialize<T extends Expression | Vector>(
	expression: Expression,
	map: MapObjectType | undefined,
	callback: (e: Expression, map: MapObjectType) => T
): {
	numerator: T;
	denominator: T;
	map: MapObjectType;
};

export function polynomialize(
	expression: Expression,
	map?: MapObjectType,
	callback?: (e: Expression, map: MapObjectType) => Expression | Vector
): {
	numerator: Expression | Vector;
	denominator: Expression | Vector;
	map: MapObjectType;
} {
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
