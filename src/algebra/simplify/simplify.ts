import { Expression } from '../../core/classes/expression/Expression';
import { product } from '../../math/utils';
import { polyFactors } from '../factor/factor';

import { complexSimplify } from './complexsimp';
import { factorCommonPower } from './factorCommon';
import { simplifyFactorials, simplifyLogs } from './funcsimp';
import { hasDerivedInverseTrig, rewriteInverseTrig } from './invtrigrewrite';
import { cancelCommonFactors, rationalize, simplifyRadicals, toCommonDenominator } from './ratsimp';
import { tryRewriteTrig } from './trigrewrite';
import { simplifyTrigSum } from './trigsimp';
import { hasFactorialRatio, hasIrrationalDenominator } from './utils';

export function simplify(x: Expression | string, modifiers: { [name: string]: string } = {}) {
	if (typeof x === 'string') {
		x = Expression.create(x);
	}

	if (hasDerivedInverseTrig(x)) {
		x = rewriteInverseTrig(x);
	}

	x = toCommonDenominator(x);
	x = x.getNumerator().expand().div(x.getDenominator().expand());

	// No changes from last round — nothing left to do
	let retval = x;
	const unchanged = modifiers.image === x.text();

	if (!unchanged) {
		// Early factorial simplification for bare factorial ratios
		if (retval.isProduct() && hasFactorialRatio(retval)) {
			retval = simplifyFactorials(retval);
		}

		// Only enter the main simplification if factorials didn't fully resolve,
		// or the expression wasn't a factorial ratio to begin with
		if (hasFactorialRatio(retval) || !x.isProduct() || !hasFactorialRatio(x)) {
			if (x.isComplex()) {
				retval = complexSimplify(retval);
			} else if (hasIrrationalDenominator(retval)) {
				retval = rationalize(retval);
			} else if (retval.isSum()) {
				retval = tryRewriteTrig(retval);
				retval = simplifyTrigSum(retval);
				retval = factorCommonPower(retval);
				retval = simplifyLogs(retval);
			} else if (retval.isProduct() && retval.isLinear()) {
				retval = simplifyFactorials(retval);
				retval = simplifyRadicals(retval);

				retval = cancelNestedFactors(retval);
				retval = cancelCommonFactors(retval);
				retval = tryRewriteTrig(retval);
			}
		}
	}

	retval = factorResult(retval);

	return retval;
}

/** Shared exit: factor numerator and denominator, or return as-is for pure numbers. */
function factorResult(retval: Expression): Expression {
	if (retval.isNUM()) {
		return retval;
	}

	const num = product(...(polyFactors(retval.getNumerator()).elements as Expression[]));
	const den = product(...(polyFactors(retval.getDenominator()).elements as Expression[]));
	return num.div(den);
}
/**
 * Cancels common factors between top-level elements and elements nested inside
 * inverted products. Handles cases like fact(n) * (fact(n)*(1+n))^-1 → (1+n)^-1
 * where the denominator is a product raised to -1 and contains a factor that
 * matches a numerator element.
 */
function cancelNestedFactors(x: Expression): Expression {
	if (!x.isProduct()) {
		return x;
	}

	const numFactors: Expression[] = [];
	const denCompounds: { base: Expression; index: number }[] = [];
	const otherDen: Expression[] = [];

	let idx = 0;
	for (const element of x.elementsArray()) {
		const p = element.getPower();
		if (p.sign() === -1 && p.isMinusOne?.()) {
			// This is something^-1. Check if the base is a product.
			const base = element.invert();
			if (base.isProduct()) {
				denCompounds.push({ base, index: idx });
			} else {
				otherDen.push(element);
			}
		} else if (p.sign() === 1) {
			numFactors.push(element);
		} else {
			otherDen.push(element);
		}
		idx++;
	}

	// Nothing to do if there are no compound denominators
	if (denCompounds.length === 0 || numFactors.length === 0) {
		return x;
	}

	let changed = false;
	const usedNum = new Set<number>();

	for (const compound of denCompounds) {
		const denElements = compound.base.elementsArray();
		const denMultiplier = compound.base.getMultiplier();
		const survivingDen: Expression[] = [];
		let compoundChanged = false;

		for (const de of denElements) {
			let cancelled = false;
			for (let i = 0; i < numFactors.length; i++) {
				if (usedNum.has(i)) {
					continue;
				}
				// Compare ignoring multipliers
				const numUnit = numFactors[i].toUnitMultiplier();
				const denUnit = de.toUnitMultiplier();
				if (numUnit.eq(denUnit)) {
					// Cancel, keeping ratio of multipliers
					const mRatio = numFactors[i].getMultiplier().div(de.getMultiplier());
					if (!mRatio.isOne()) {
						// Replace the numerator factor with the multiplier ratio
						numFactors[i] = Expression.fromRational(mRatio);
					} else {
						usedNum.add(i);
					}
					cancelled = true;
					compoundChanged = true;
					changed = true;
					break;
				}
			}
			if (!cancelled) {
				survivingDen.push(de);
			}
		}

		if (compoundChanged) {
			// Rebuild the denominator from surviving elements
			if (survivingDen.length === 0) {
				// Entire denominator cancelled — just the multiplier remains
				otherDen.push(Expression.fromRational(denMultiplier).invert());
			} else {
				let newDen = Expression.fromRational(denMultiplier);
				for (const s of survivingDen) {
					newDen = newDen.times(s);
				}
				otherDen.push(newDen.invert());
			}
		} else {
			otherDen.push(compound.base.invert());
		}
	}

	if (!changed) {
		return x;
	}

	let result = Expression.fromRational(x.getMultiplier());
	for (let i = 0; i < numFactors.length; i++) {
		if (!usedNum.has(i)) {
			result = result.times(numFactors[i]);
		}
	}
	for (const d of otherDen) {
		result = result.times(d);
	}

	return result;
}
