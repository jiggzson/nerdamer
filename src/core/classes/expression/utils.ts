import { message, UnexpectedInputError } from '../../errors';
import { getAssumptionFor } from '../assumption/assume';
import { Rational } from '../rational/Rational';

import { Expression } from './Expression';
import { one, zero } from './shortcuts';

import type { OptionsObject } from '../parser/types';

export type conditionType = (x: Expression, values: string[]) => boolean;
export type actionType = (x: Expression, values: string[]) => void;
type ExpressionTuplesObj = {
	num: Expression[];
	den: Expression[];
	power?: ExpressionTuplesObj;
	args?: ExpressionTuplesObj[];
};

export type termType = {
	type: number;
	num: Expression[];
	den: Expression[];
	name?: string;
	power?: termType;
	elements?: termType[];
	args?: termType[];
};

/** Multiplies a series of Expressions into one product. */
export function product(...args: Expression[]) {
	let retval = one();
	for (const x of args) {
		retval = retval.times(x);
	}

	return retval;
}

/** Adds a series of Expressions into one sum. */
export function sum(...args: Expression[]) {
	let retval = zero();
	for (const x of args) {
		retval = retval.plus(x);
	}

	return retval;
}

/** Removes the power from an Expression. The original object is unchanged. */
export function stripPower(x: Expression) {
	const retval = x.copy();
	delete retval.power;
	return retval;
}

/**
 * Deep-copies an Expression tree without routing every nested node back through the
 * Expression constructor and factory.
 *
 * Expression.hook is still applied once for each copied node, matching the existing
 * copy path. Mutable nested values are recreated so the returned tree remains
 * independent from the source.
 */
export function cloneExpressionTree(source: Expression): Expression {
	const hooked = Expression.hook(source);
	if (!Expression.isExpression(hooked)) {
		return Expression.create(hooked);
	}

	const src = hooked;
	const target = Object.create(Expression.prototype) as Expression;

	target.dataType = src.dataType;
	target.deferred = src.deferred;
	target.isEnumerable = src.isEnumerable;
	target.type = src.type;
	target.value = src.value;
	target.precision = src.precision;
	target.scientific = src.scientific;

	if (src.multiplier) {
		target.multiplier = src.multiplier.copy();
	}
	if (src.name !== undefined) {
		target.name = src.name;
	}
	if (src.power) {
		target.power = cloneExpressionTree(src.power);
	}
	if (src.args) {
		target.args = src.args.map(cloneExpressionTree);
	}
	if (src.base) {
		target.base = cloneExpressionTree(src.base);
	}
	if (src.elements) {
		target.elements = {};
		for (const key in src.elements) {
			target.elements[key] = cloneExpressionTree(src.elements[key]);
		}
	}

	return target;
}

/**
 * Copies over all the properties of the provided symbolic essentially cloning it to x.
 *
 * @param sym
 * @returns
 */
export function copyOver(src: Expression, target: Expression, options?: OptionsObject) {
	options = {
		...{ omitMultiplier: false, omitPower: false },
		...options,
	};
	// Copy over the multiplier
	if (src.multiplier && !options.omitMultiplier) {
		target.multiplier = src.multiplier.copy();
	}
	// toFunctions have name so we need those copied
	if (src.name !== undefined) {
		target.name = src.name;
	}
	// Copy over the power
	if (src.power && !options.omitPower) {
		target.power = cloneExpressionTree(src.power);
	}
	// Copy over the args if any
	if (src.args) {
		target.args = [];
		for (const arg of src.args) {
			target.args.push(cloneExpressionTree(arg));
		}
	}
	// Copy over the base if an
	if (src.base) {
		target.base = cloneExpressionTree(src.base);
	}
	// Copy over the elements if any
	if (src.elements) {
		target.elements = {};
		for (const x in src.elements) {
			target.elements[x] = cloneExpressionTree(src.elements[x]);
		}
	}
	// Last but not least
	target.type = src.type;
	target.value = src.value;
	target.precision = src.precision;
	target.scientific = src.scientific;
	target.deferred = src.deferred;

	return target;
}

/**
 * This function converts the expression in a collection of arrays
 *
 * @param x
 * @param arrayObj
 * @returns
 */
export function toArrays(x: Expression, arrayObj?: ExpressionTuplesObj) {
	/*
	 * The first thing to realize is that only PRD elements can have a numerator and denominators.
	 * All others are either the numerator or the denominator. To illustrate let look at some examples:
	 * x^2/4 => x^2/4
	 * cos(x)^(1/3) => cos(x)^(1/3)
	 * 5*x^-1+(5/6)*x^3+x => (5*x^3)/6+x+5/x
	 * (x+1)/(x+5) => (x+1)/(x+5)
	 * Out of all the examples, the only one with symbolic values in the denominator is the last one which is of type PRD.
	 * We can now simplify the problem by only focusing on PRD elements for symbolic denominators
	 */
	const retval: ExpressionTuplesObj = arrayObj || {
		num: [],
		den: [],
	};

	function addMultiplier(m: Rational) {
		retval.num.push(Expression.Number(m.numerator));
		// Only add the denominator if it's not one
		if (m.denominator !== 1n) {
			retval.den.push(Expression.Number(m.denominator));
		}
	}

	if (x.isNUM()) {
		addMultiplier(x.getMultiplier());
	} else {
		addMultiplier(x.getMultiplier());

		const power = x.getPower();
		// Handle products. Their elements should be distributed over the numerator and denominator
		// Consider 2*x*y/(a*b). The desired output is { num: [2, y, y], den: [a, b]}
		if (x.isProduct()) {
			const elements = x.elementsArray();
			for (const element of elements) {
				// Pass in this object so they're added to the numerator or the denominator of this retval object
				toArrays(element, retval);
			}
		}
		// Consider 2/3*x. The desired output is { num: [2, x], den [3] };
		// Consider (3*y)^(2/3). The desired output = { num: [3, y], den: [], power: { num: [2], den: [3]} };
		else {
			const term = stripPower(x.toUnitMultiplier());
			// Put it in numerator if positive power else the denominator
			const target = power.getMultiplier().isNegative() ? retval.den : retval.num;
			target.push(term);
		}

		// Handle the power. Remember that x^(-2) is now 1/x^2 so the power has to be the absolute value
		retval.power = toArrays(power.abs());
		// Handle args
		// Consider cos(2*pi). The desired output = { name: 'cos', args[{ num: [2, pi], den: [] }] }
		if (x.args) {
			retval.args = x.getArguments().map(x => {
				return toArrays(x);
			});
		}
	}

	return retval;
}

/**
 * Gets the max between two or more Expressions. Just know that if two variable arguments are provided,
 * it will not be able to know with any certainty which is bigger so the first one will be returned.
 *
 * @param x
 * @param args
 * @returns
 */
export function largestPower(x: Expression, ...args: Expression[]) {
	let retval = x;
	for (const y of args) {
		if (y.getPower().gt(retval.getPower())) {
			retval = y;
		}
	}

	return retval;
}

export function assertPlainVariableAndGetString(x: Expression) {
	if (!x.isVAR()) {
		throw new UnexpectedInputError(message('plainVariableExpected', { input: x.text() }));
	}
	return x.value;
}

export function getNumericOrAssumedValue(x: Expression) {
	let retval: Expression | undefined = undefined;
	// If it's numeric then we're done
	if (x.isNUM()) {
		retval = x;
	} else {
		// Check the assumptions
		const assumedValue = getAssumptionFor(x);
		// Make sure it's a single value. Since this is used for comparison,
		// we cannot compare a point to a range.
		if (assumedValue && assumedValue.isSingleton) {
			retval = assumedValue.getSingletonValue();
		}
	}
	return retval;
}
