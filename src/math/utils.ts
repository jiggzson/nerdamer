import { Expression } from "../core/classes/expression/Expression";
import { one } from "../core/classes/expression/shortcuts";


/**
 * Multiplies a series of Expression to a single product
 * 
 * @param x 
 * @param args 
 * @returns 
 */
export function product(...args: Expression[]) {
    let retval = one();
    for (const x of args) {
        retval = retval.times(x);
    }

    return retval;
}

/**
 * Adds a series of Expression to a single product
 * 
 * @param x 
 * @param args 
 * @returns 
 */
export function sum(...args: Expression[]) {
    let retval = Expression.Number('0')
    for (const x of args) {
        retval = retval.plus(x);
    }

    return retval;
}

/**
 * Removes the power from a Expression. The original object is unchanged.
 * 
 * @param x 
 * @returns 
 */
export function stripPower(x: Expression) {
    // If it's an EXP then we need only return the argument
    const retval = new Expression(x);
    delete retval.power;
    return retval;
}

/**
 * Places the Expression in a form that will defer any simplification. Expand must be explicitly called.
 * TODO: This should likely be its own type but it seems a bit overblown to create whole new type
 * just for factors.
 * 
 * @param x 
 * @returns 
 */
export function toFactor(x: Expression) {
    return Expression.toEXP(x, one());
}

