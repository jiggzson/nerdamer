import { Expression } from './Expression';

const CACHE: { [key: string]: Expression } = {};

function getFromCacheOrCreate(value: string) {
	if (CACHE[value] === undefined) {
		const c = Expression.Number(value);
		// Set the power and multiplier since this create problems
		// later when it's requested because we'll be freezing this object
		c.getMultiplier();
		c.getPower();
		Object.freeze(c);
		CACHE[value] = c;
	}
	return CACHE[value];
}

export function zero() {
	return getFromCacheOrCreate('0');
}

export function quarter() {
	return getFromCacheOrCreate('1/4');
}

export function third() {
	return getFromCacheOrCreate('1/3');
}

export function half() {
	return getFromCacheOrCreate('1/2');
}

export function one() {
	return getFromCacheOrCreate('1');
}

export function minusOne() {
	return getFromCacheOrCreate('-1');
}

export function two() {
	return getFromCacheOrCreate('2');
}

export function minusTwo() {
	return getFromCacheOrCreate('-2');
}

export function three() {
	return getFromCacheOrCreate('3');
}

export function minusThree() {
	return getFromCacheOrCreate('-3');
}

export function four() {
	return getFromCacheOrCreate('4');
}

export function five() {
	return getFromCacheOrCreate('5');
}

export function six() {
	return getFromCacheOrCreate('6');
}

export function seven() {
	return getFromCacheOrCreate('7');
}

export function I() {
	return Expression.Img();
}

export function all() {
	return Expression.Variable('all');
}
