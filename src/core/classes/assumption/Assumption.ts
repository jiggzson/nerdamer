import Decimal from 'decimal.js';

import { Expression } from '../expression/Expression';

// Keep these lightweight; avoid any and keep boundaries explicit.
export type Bound = { value: Decimal; inclusive: boolean };
export type ParsedAssumption = { symbol: string; assumption: Assumption };
export type AssumptionValue = Decimal | string | number;

function isIdentStart(ch: string) {
	return /[A-Za-z_]/.test(ch);
}

function isIdentChar(ch: string) {
	return /[A-Za-z0-9_]/.test(ch);
}

function toDecimal(value: AssumptionValue) {
	if (typeof value === 'number' || typeof value === 'string') {
		return new Decimal(value);
	}
	return value;
}

function parseNumber(value: string) {
	const v = String(value).toLowerCase();
	if (v === 'inf' || v === 'infinity' || v === '+inf' || v === '+infinity') {
		return new Decimal(Infinity);
	}
	if (v === '-inf' || v === '-infinity') {
		return new Decimal(-Infinity);
	}

	const n = new Decimal(v);
	if (n.isNaN()) {
		throw new Error(`Invalid Decimal: "${value}"`);
	}
	return n;
}

function decimalValue(x: Expression) {
	if (!x.isNUM()) {
		x = x.evaluate();
	}
	return x.getMultiplier().toDecimal();
}

export class Assumption {
	readonly end: Bound;
	readonly isSingleton: boolean;
	readonly start: Bound;

	constructor(
		start: AssumptionValue,
		end: AssumptionValue,
		startInclusive = true,
		endInclusive = true
	) {
		start = toDecimal(start);
		end = toDecimal(end);

		// Use Decimal comparisons (never JS operators) to avoid object-identity bugs.
		if (start.gt(end)) {
			throw new Error(`Invalid interval: (${start}, ${end})`);
		}

		this.start = { value: start, inclusive: !!startInclusive };
		this.end = { value: end, inclusive: !!endInclusive };
		this.isSingleton =
			this.start.value === this.end.value &&
			this.start.inclusive === this.end.inclusive &&
			this.start.inclusive === true;
	}

	static atLeast(x: AssumptionValue, inclusive = true) {
		x = toDecimal(x);
		return new Assumption(x, new Decimal(Infinity), !!inclusive, false);
	}

	static atMost(x: AssumptionValue, inclusive = true) {
		x = toDecimal(x);
		return new Assumption(new Decimal(-Infinity), x, false, !!inclusive);
	}

	static exactly(x: AssumptionValue) {
		x = toDecimal(x);
		return new Assumption(x, x, true, true);
	}

	// ---------------------------
	// Constraint parser. Separate from internal parser.
	// ---------------------------
	// Whitespace ignored.
	// Infinity tokens: inf, infinity, +inf, -inf, ...
	// ---------------------------
	static parse(expr: string) {
		if (typeof expr !== 'string') {
			throw new Error(`Invalid assumption: "${String(expr)}"`);
		}

		const s = expr.replace(/\s+/g, '');
		if (!s) {
			throw new Error(`Invalid assumption: "${expr}"`);
		}

		// Must have at least: a>=0 (4 chars), but allow short like x=0.
		if (s.length < 3) {
			throw new Error(`Invalid assumption: "${expr}"`);
		}

		let i = 0;

		// ---- Parse identifier ----
		if (!isIdentStart(s[i])) {
			throw new Error(`Expected identifier`);
		}

		let j = i + 1;
		while (j < s.length && isIdentChar(s[j])) {
			j++;
		}

		const symbol = s.slice(i, j);
		i = j;

		// ---- Parse operator ----
		let op = '';
		while (i < s.length) {
			const ch = s[i];
			if (ch === '<' || ch === '>' || ch === '=') {
				op += ch;
				i++;
			} else {
				break;
			}
		}

		if (!op) {
			throw new Error(`Missing operator`);
		}

		// ---- Parse value ----
		const valueStr = s.slice(i);
		if (!valueStr) {
			throw new Error(`Missing value`);
		}

		const value = parseNumber(valueStr);

		switch (op) {
			case '>':
				return {
					symbol,
					assumption: new Assumption(value, new Decimal(Infinity), false, false),
				};
			case '>=':
				return {
					symbol,
					assumption: new Assumption(value, new Decimal(Infinity), true, false),
				};
			case '<':
				return {
					symbol,
					assumption: new Assumption(new Decimal(-Infinity), value, false, false),
				};
			case '<=':
				return {
					symbol,
					assumption: new Assumption(new Decimal(-Infinity), value, false, true),
				};
			case '=':
			case '==':
				return { symbol, assumption: Assumption.exactly(value) };
			default:
				throw new Error(`Unsupported operator "${op}"`);
		}
	}

	// ---------------------------
	// Interval comparisons
	// ---------------------------

	contains(x: AssumptionValue) {
		x = toDecimal(x);

		if (x.lt(this.start.value)) {
			return false;
		}
		if (x.gt(this.end.value)) {
			return false;
		}

		if (x.eq(this.start.value) && !this.start.inclusive) {
			return false;
		}
		if (x.eq(this.end.value) && !this.end.inclusive) {
			return false;
		}

		return true;
	}

	eq(x: Assumption | Expression) {
		if (Expression.isExpression(x)) {
			if (!this.isSingleton || !x.isConstant()) {
				return false;
			}
			return this.start.value.eq(decimalValue(x));
		}
		return (
			this.start.value.eq(x.start.value) &&
			this.end.value.eq(x.end.value) &&
			this.start.inclusive === x.end.inclusive &&
			this.end.inclusive === x.end.inclusive
		);
	}

	gt(x: Assumption | Expression) {
		if (Expression.isExpression(x)) {
			if (!x.isConstant()) {
				return false;
			}
			const v = decimalValue(x);
			return (
				this.start.value.gt(v) ||
				// If the point is at the right side of the interval then it's also greater
				(!this.start.inclusive && this.start.value.eq(v))
			);
		}
		// provably: all values in this are > all values in x
		if (this.start.value.gt(x.end.value)) {
			return true;
		}
		if (this.start.value.lt(x.end.value)) {
			return false;
		}

		// Touching at a point; provable if equality is impossible:
		// (a,...) > (...,a]  is true because this excludes a (or x excludes a).
		return !this.start.inclusive || !x.end.inclusive;
	}

	lt(x: Assumption | Expression) {
		if (Expression.isExpression(x)) {
			if (!x.isConstant()) {
				return false;
			}
			const v = decimalValue(x);
			return (
				this.end.value.lt(v) ||
				// If the point is at the left side of the interval then it's also less
				(!this.end.inclusive && this.end.value.eq(v))
			);
		}
		if (this.end.value.lt(x.start.value)) {
			return true;
		}
		if (this.end.value.gt(x.start.value)) {
			return false;
		}

		return !this.end.inclusive || !x.start.inclusive;
	}

	overlaps(x: Assumption) {
		// Non-empty intersection, with endpoint rules.
		if (this.end.value.lt(x.start.value)) {
			return false;
		}
		if (this.start.value.gt(x.end.value)) {
			return false;
		}

		// If they only touch at one point, overlap iff that point is included in both.
		if (this.end.value.eq(x.start.value)) {
			return this.end.inclusive && x.start.inclusive;
		}
		if (this.start.value.eq(x.end.value)) {
			return this.start.inclusive && x.end.inclusive;
		}

		return true;
	}

	toString() {
		const l = this.start.inclusive ? '[' : '(';
		const r = this.end.inclusive ? ']' : ')';
		return `${l}${this.start.value}, ${this.end.value}${r}`;
	}
}
