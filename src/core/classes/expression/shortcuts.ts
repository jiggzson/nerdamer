import { ALL_SYMBOL } from '../../constants/symbolNames';
import { message, UnexpectedInputError } from '../../errors';

import { Expression } from './Expression';

const CACHE: { [key: string]: Expression } = {};

function getOrCreate(value: string) {
	if (CACHE[value] === undefined) {
		const c = Expression.Number(value);
		// Set the power and multiplier since this create problems
		// later when it's requested because we'll be freezing this object
		Object.freeze(c.getMultiplier());
		c.getPower();
		Object.freeze(c);
		CACHE[value] = c;
	}
	return CACHE[value];
}

export function zero() {
	return getOrCreate('0');
}

export function quarter() {
	return getOrCreate('1/4');
}

export function third() {
	return getOrCreate('1/3');
}

export function half() {
	return getOrCreate('1/2');
}

export function one() {
	return getOrCreate('1');
}

export function minusOne() {
	return getOrCreate('-1');
}

export function two() {
	return getOrCreate('2');
}

export function minusTwo() {
	return getOrCreate('-2');
}

export function three() {
	return getOrCreate('3');
}

export function minusThree() {
	return getOrCreate('-3');
}

export function four() {
	return getOrCreate('4');
}

export function five() {
	return getOrCreate('5');
}

export function six() {
	return getOrCreate('6');
}

export function seven() {
	return getOrCreate('7');
}

export function eight() {
	return getOrCreate('8');
}

export function sixteen() {
	return getOrCreate('16');
}

export function twentySeven() {
	return getOrCreate('27');
}

export function twoHundredFiftySix() {
	return getOrCreate('256');
}

export function I() {
	return Expression.Img();
}

export function all() {
	return Expression.Variable(ALL_SYMBOL);
}

/**
 * A convenience function for creating simple symbols reducing the reliance on strings
 * @param args A series of string variables
 * @returns An object of created symbols
 *
 * @example
 * ```ts
 * const { x, y } = symbols('x', 'y');
 * cos(x.sq()).times(y);
 *
 * // Also available as nerdamer.symbols
 * ```
 */
export function symbols(...args: string[]) {
	const created: Record<string, Expression> = {};

	for (const x of args) {
		// Must be a plain variable
		const c = Expression.create(x);
		// Trigger creation of multiplier and power.
		c.getMultiplier();
		c.getPower();
		if (!c.isVAR()) {
			throw new UnexpectedInputError(message('plainVariableExpected', { input: x }));
		}
		// Make it read-only
		Object.freeze(c);
		created[x] = c;
	}

	return created;
}
