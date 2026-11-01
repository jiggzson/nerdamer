import { GCD } from '../../../../functions/bigint/bigint';
import { Rational } from '../../../rational/Rational';

import type { Expression } from '../../../expression/Expression';

type Sign = -1 | 0 | 1;

const MAX_EXACT_POWER = 64n;
const MAX_EXACT_BASE_BITS = 512;
const MAX_EXACT_BASE = 1n << BigInt(MAX_EXACT_BASE_BITS);

/** Limits the size of positive rational bases before exact exponentiation. */
function fitsExactBase(value: Rational): boolean {
	return value.numerator < MAX_EXACT_BASE && value.denominator < MAX_EXACT_BASE;
}

/**
 * Compares signed products of positive rational powers exactly.
 * The outer sign is retained while a common exponent clears fractional powers.
 */
export function compareRationalPower(a: Expression, b: Expression): Sign | 'unresolved' | undefined {
	let retval: Sign | 'unresolved' | undefined;
	if (a.isNUM() && b.isNUM()) {
		const sign = a.getMultiplier().minus(b.getMultiplier()).sign();
		retval = sign < 0 ? -1 : sign > 0 ? 1 : 0;
	} else {
		let result: Sign | undefined;
		const sides = [a, b];
		const signs = sides.map(side => side.getMultiplier().sign());
		const powers: Array<Array<{ base: Rational; exponent: Rational }>> = [];
		let common = 1n;
		let supported = true;
		let exceeded = false;

		for (const side of sides) {
			const factors = side.isProduct() && side.getPower().isOne()
				? side.elementsArray() : side.isNUM() ? [] : [side];
			const terms: Array<{ base: Rational; exponent: Rational }> = [
				{ base: side.getMultiplier().isZero() ? Rational.create(1n) : side.getMultiplier().abs(),
					exponent: Rational.create(1n) },
			];

			if (factors.length > 8) {
				supported = false;
				exceeded = true;
			}

			for (const factor of factors) {
				if (!factor.isEXP() || !factor.getBase().isNUM() ||
					!factor.getPower().isNUM() || factor.getBase().getMultiplier().lte('0') ||
					factor.getMultiplier().isZero() ||
					(side.isProduct() && factor.getMultiplier().isNegative())) {
					supported = false;
					break;
				}
				terms.push({
					base: factor.getBase().getMultiplier(),
					exponent: factor.getPower().getMultiplier(),
				});
				if (side.isProduct() && !factor.getMultiplier().isOne()) {
					terms.push({ base: factor.getMultiplier(), exponent: Rational.create(1n) });
				}
			}

			if (!supported) {
				break;
			}
			for (const term of terms) {
				if (!fitsExactBase(term.base)) {
					supported = false;
					exceeded = true;
					break;
				}
				// Use the smallest exponent that clears each denominator.
				common = (common / GCD(common, term.exponent.denominator)) * term.exponent.denominator;
				if (common > MAX_EXACT_POWER) {
					supported = false;
					exceeded = true;
					break;
				}
			}
			powers.push(terms);
			if (!supported) {
				break;
			}
		}

		if (supported && powers.length === 2) {
			const values: Rational[] = [];
			for (const terms of powers) {
				let value = Rational.create(1n);
				for (const term of terms) {
					const exponent = term.exponent.numerator *
						(common / term.exponent.denominator);
					if (exponent < -MAX_EXACT_POWER || exponent > MAX_EXACT_POWER) {
						supported = false;
						exceeded = true;
						break;
					}
					value = value.times(term.base.pow(String(exponent)));
				}
				values.push(value);
				if (!supported) {
					break;
				}
			}
			if (supported && values.length === 2) {
				// Compare signed magnitudes only after proving that all factors are positive.
				const left = signs[0] === 0 ? Rational.create(0n) :
					signs[0] < 0 ? values[0].neg() : values[0];
				const right = signs[1] === 0 ? Rational.create(0n) :
					signs[1] < 0 ? values[1].neg() : values[1];
				result = left.gt(right) ? 1 : left.lt(right) ? -1 : 0;
			}
		}
		retval = exceeded ? 'unresolved' : result;
	}
	return retval;
}
