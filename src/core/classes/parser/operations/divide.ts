import { message, DivisionByZeroError, UndefinedError } from '../../../errors';
import { Settings } from '../../../Settings';
import { Expression } from '../../expression/Expression';
import { one } from '../../expression/shortcuts';

import { multiply } from './multiply';
import { rationalizeRadical } from './power';

export function divide(a: Expression, b: Expression): Expression {
	let retval;

	if (Settings.DEFER_SIMPLIFICATION) {
		// Explicitly add a power to a NUM so it can be inverted.
		if (b.isNUM()) {
			b.power = one();
		}
		retval = div(a, b);
		retval.deferred = true;
	} else {
		// Disallow division by zero
		if (b.isZero()) {
			throw new DivisionByZeroError(message('divisionByZero'));
		}

		if (a.isZero() && !b.isInf()) {
			retval = Expression.Number('0');
		} else if (a.isNUM() && b.isNUM()) {
			retval = Expression.fromRational(a.getMultiplier().div(b.getMultiplier()));
		} else if (b.isNUM()) {
			retval = a.copy(); // create a new copy
			const multiplier = a.getMultiplier().div(b.getMultiplier());
			retval.multiplier = multiplier;
		} else if (a.isComplex() || b.isComplex()) {
			const realA = a.realPart();
			const realB = b.realPart();
			const imA = a.imagPart();
			const imB = b.imagPart();
			const den = realB.sq().plus(imB.sq());
			const re = realA.times(realB).plus(imA.times(imB)).div(den);
			const im = imA.times(realB).minus(realA.times(imB)).div(den).times(Expression.Img());
			return re.plus(im);
		} else if (b.isInf() && !a.isZero()) {
			if (!b.getMultiplier().isNegative() && !a.isInf()) {
				retval = Expression.Number('0');
			}
		} else {
			retval = div(a, b);
			// Only rationalize if the result is a simple numeric radical
			// e.g. 1/sqrt(2) → sqrt(2)/2
			// Don't rationalize complex products or higher roots where it makes things worse
			if (retval.isEXP() && retval.hasRadical()) {
				retval = rationalizeRadical(retval);
			}
		}

		if (!retval) {
			throw new UndefinedError(message('undefinedDivision', { type: `${a}/${b}` }));
		}
	}

	return retval;
}

function div(a: Expression, b: Expression) {
	b = b.copy();
	// Negate and send it to multiplier
	b.power = b.getPower().neg();
	b.multiplier = b.getMultiplier().invert();
	return multiply(a, b);
}
