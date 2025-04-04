import { add } from "./add";
import { Expression } from "../../expression/Expression";
import { Settings } from "../../../Settings";



export function subtract(a: Expression, b: Expression): Expression {
    let retval;

    if (Settings.DEFER_SIMPLIFICATION) {
        retval = add(a, b.neg());
        retval.deferred = true;
    }
    else {
        if (a.isNUM() && b.isNUM()) {
            retval = Expression.fromRational(a.getMultiplier().minus(b.getMultiplier()));
        }
        // Any value minus inf is -inf
        else if (!a.isInf() && b.isInf()) {
            retval = Expression.Inf().neg();
        }
        else {
            retval = add(a, b.neg());
        }

        if (!retval) {
            throw new Error(`Subtraction not defined for ${a.type}-${b.type} | ${a}-${b}`);
        }
    }

    return retval;
}

export function subtractPrefix(a: Expression) {
    // Just negates the multiplier
    const x = a.neg();
    return x;
}