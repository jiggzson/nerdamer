import { message, DivisionByZeroError, UndefinedError } from '../../../errors';
import { Settings } from '../../../Settings';
import { Expression } from '../../expression/Expression';
import { one, zero } from '../../expression/shortcuts';

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
		} else if (a.isInfinite() && b.isNUM()) {
			// Dividing something infinite, such as Inf or i*Inf, by a number only changes its sign.
			retval = multiply(a, Expression.fromRational(b.getMultiplier().invert()));
		} else if (b.isNUM()) {
			retval = a.copy(); // create a new copy
			const multiplier = a.getMultiplier().div(b.getMultiplier());
			retval.multiplier = multiplier;
		} else if (b.isInfinite() && !a.isZero()) {
			// A finite value over infinity in any direction, Inf or i*Inf, is zero.
			if (!a.isInfinite()) {
				retval = Expression.Number('0');
			}
		} else if (b.isI() && b.getPower().isOne()) {
			const reciprocal = Expression.Img()
				.times(Expression.fromRational(b.getMultiplier().invert()))
				.neg();
			retval = multiply(a, reciprocal);
		} else if (a.isComplex() && !b.isComplex()) {
			// A real divisor divides each part. The general formula below would also multiply
			// the parts by its zero imaginary part, which fails for a part such as Inf.
			return a.realPart().div(b).plus(a.imagPart().div(b).times(Expression.Img()));
		} else if (a.isComplex() || b.isComplex()) {
			const realA = a.realPart();
			const realB = b.realPart();
			const imA = a.imagPart();
			const imB = b.imagPart();
			const den = realB.sq().plus(imB.sq());
			// A finite value over a divisor of infinite size, such as Inf+pi*i, is zero.
			if (den.isInf() && !realA.isInfinite() && !imA.isInfinite()) {
				return zero();
			}
			const re = realA.times(realB).plus(imA.times(imB)).div(den);
			const im = imA.times(realB).minus(realA.times(imB)).div(den).times(Expression.Img());
			return re.plus(im);
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
