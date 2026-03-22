import { assume } from './assume';

import type { ParserInputType } from '../parser/types';

export function assertEQ(a: ParserInputType, b: ParserInputType) {
	assume(`${a}=${b}`);
	return a;
}
export function assertGT(a: ParserInputType, b: ParserInputType) {
	assume(`${a}>${b}`);
	return a;
}
export function assertGTE(a: ParserInputType, b: ParserInputType) {
	assume(`${a}>=${b}`);
	return a;
}
export function assertLT(a: ParserInputType, b: ParserInputType) {
	assume(`${a}<${b}`);
	return a;
}
export function assertLTE(a: ParserInputType, b: ParserInputType) {
	assume(`${a}<=${b}`);
	return a;
}
