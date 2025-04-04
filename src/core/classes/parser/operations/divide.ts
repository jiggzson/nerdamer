import { Expression } from "../../expression/Expression";
import { __, UndefinedError } from "../../../errors";
import { multiply } from "./multiply";
import { Settings } from "../../../Settings";
import { one } from "../../expression/shortcuts";



// TODO: let expression = 'a+b+1+t+a+4+t+x+x+x+x+x+a+b+1+t+a+4+t+x+x+x+x+x'; // There's a 1 that doesn't belong
export function divide(a: Expression, b: Expression): Expression {
    let retval;

    if (Settings.DEFER_SIMPLIFICATION) {
        // Explicitly add a power to a NUM so it can be inverted.
        if (b.isNUM()) {
            b.power = one();
        }
        retval = div(a, b);
        retval.deferred = true;
    }
    else {
        // Disallow division by zero
        if (b.isZero()) {
            throw new UndefinedError(__('divisionByZero'));
        }

        if (a.isZero() && !b.isInf()) {
            retval = Expression.Number('0');
        }
        else if (a.isNUM() && b.isNUM()) {
            retval = Expression.fromRational(a.getMultiplier().div(b.getMultiplier()));
        }
        else if (b.isNUM()) {
            retval = new Expression(a);
            const multiplier = a.getMultiplier().div(b.getMultiplier());
            retval.multiplier = multiplier;
        }
        else if (a.isComplex() || b.isComplex()) {
            const realA = a.realPart();
            const realB = b.realPart();
            const imA = a.imagPart();
            const imB = b.imagPart();
            const den = realB.sq().plus(imB.sq());
            const re = realA.times(realB).plus(imA.times(imB)).div(den);
            const im = imA.times(realB).minus(realA.times(imB)).div(den).times(Expression.Img());
            return re.plus(im);
        }
        else if (b.isInf() && !a.isZero()) {
            if (!b.getMultiplier().isNegative() && !a.isInf()) {
                retval = Expression.Number('0');
            }
        }
        else {
            retval = div(a, b);
        }

        if (!retval) {
            throw new Error(`Division not defined expression of this type ${a.type}/${b.type} | ${a}/${b}`);
        }
    }

    return retval;
}

function div(a: Expression, b: Expression) {
    b = new Expression(b);
    // Negate and send it to multiplier
    b.power = b.getPower().neg();
    b.multiplier = b.getMultiplier().invert();
    return multiply(a, b);
}