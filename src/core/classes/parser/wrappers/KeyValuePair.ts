import { isNerdamerNativeType } from '../../../common/common';
import { KEY_VALUE_PAIR } from '../constants';

import type { ParserEntity } from '../../../types';
/**
 * Internal marker produced by the '=>' (mapTo) operator inside curly braces.
 * Holds a key-value pair that gets collected into a Dictionary at the end
 * of curly scope parsing.
 */
export class KeyValuePair {
	dataType: typeof KEY_VALUE_PAIR = KEY_VALUE_PAIR;
	isEnumerable = false;

	constructor(
		public key: string,
		public value: ParserEntity
	) {}

	static isKeyValuePair(obj: unknown): obj is KeyValuePair {
		return isNerdamerNativeType(obj, KEY_VALUE_PAIR);
	}

	copy() {
		return new KeyValuePair(this.key, this.value.copy());
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
