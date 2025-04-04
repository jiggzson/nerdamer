import { SIN, COS } from "./trig";
import { Expression } from "../core/classes/expression/Expression";
import { power } from "../core/classes/parser/operations/power";
import { add } from "../core/classes/parser/operations/add";
import { sqrt } from "../core/functions/math";

/**
 * The hypotenuse function
 * 
 * @param a 
 * @param b 
 * @returns 
 */
export function hypot(a: Expression, b: Expression) {
    // sqrt(a*sin(x)^2+b*cos(x)^2) where a = b
    const fns = [SIN, COS];
    let retval;
    if (a.isFunction(fns) && b.isFunction(fns) && a.name !== b.name && a.getPower().isOne() && b.getPower().isOne() && a.getMultiplier().eq(b.getMultiplier())) {
        retval = Expression.fromRational(a.getMultiplier());
    }
    else {
        // sqrt(a^2+b^2)
        const aSquared = power(a, Expression.Number('2'));
        const bSquared = power(b, Expression.Number('2'));
        retval = sqrt(add(aSquared, bSquared));
    }
    return retval;
}