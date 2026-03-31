import type { ParserInputType } from '../types';
/**
 * Internal marker produced by the '=>' (mapTo) operator inside curly braces.
 * Holds a key-value pair that gets collected into a Dictionary at the end
 * of curly scope parsing.
 */
export class KeyValuePair {
	dataType = 'KEY_VALUE_PAIR';
	isEnumerable = false;

	constructor(
		public key: string,
		public value: ParserInputType
	) {}

	copy() {
		return new KeyValuePair(this.key, this.value.copy()) as unknown as ParserInputType;
	}
	eq() {
		return false;
	}
	evaluate() {
		return this.value.evaluate();
	}
	expand() {
		return this.value.expand();
	}
	gt() {
		return false;
	}
	gte() {
		return false;
	}
	lt() {
		return false;
	}
	lte() {
		return false;
	}
	text() {
		return `${this.key} => ${this.value.text()}`;
	}
}
