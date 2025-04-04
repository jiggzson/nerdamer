import { Expression } from "../classes/expression/Expression";
import { SQRT, ABS, MOD } from "../classes/parser/constants";
import { multiply } from "../classes/parser/operations/multiply";
import { factorial as fact } from "./bigint";
import { FACTORIAL } from "../classes/parser/constants";
import { Settings } from "../Settings";
import { subtract } from "../classes/parser/operations/subtract";
import { erf as decErf, gamma as decGamma } from "./decimal";
import { power, sqrtToPow } from "../classes/parser/operations/power";
import { stripPower } from "../../math/utils";
import { ParserSupportedType, SupportedInputType } from "../classes/parser/types";
import { Matrix } from "../classes/matrix/Matrix";
import { atan2 } from "../../math/trig";
import { hypot } from "../../math/geometry";
import { one } from "../classes/expression/shortcuts";

/**
 * The square root function. This function simply raises the expression to
 * the power of 1/2
 * 
 * @param x 
 * @returns 
 */
export function sqrt(x: SupportedInputType): Expression {
    x = Expression.toExpression(x);

    let retval;
    if (x.isOne()) {
        retval = one();
    }
    else if (x.isZero()) {
        retval = Expression.Number('0')
    }
    // e.g. sqrt(sqrt(x))
    else if (x.isFunction(SQRT)) {
        // Unwrap the square root
        retval = multiply(sqrt(Expression.fromRational(x.getMultiplier())), power(sqrtToPow(x.multiplierFree()), Expression.Number('1/2')));
    }
    else {
        retval = power(x, Expression.Number('1/2'));
    }

    return retval
}

/**
 * The definition for the factorial operator
 * 
 * @param x 
 * @returns 
 */
export function factorial(x: Expression): Expression {
    let retval: Expression;
    if (x.isInteger()) {
        retval = Expression.Number(fact(Number(x)).toString())
    }
    else {
        retval = Expression.toFunction(FACTORIAL, [new Expression(x)]);
    }

    return retval;
}

/**
 * The absolute value function
 * 
 * @param x 
 * @returns 
 */
export function abs(x: SupportedInputType) {
    x = Expression.toExpression(x);

    let retval = x;

    let wrap = true;
    if (!x.isConstant() && x.getPower().isEven()) {
        retval = x;
        // Remove the sign
        if (retval.sign() === -1) {
            retval = retval.neg();
        }

        wrap = false;
    }
    else if (x.isComplex()) {
        retval = hypot(x.realPart(), x.imagPart());
    }
    // Attempt to simplify expresssion in the for -x-y to |x+y|
    else if (x.isSum()) {
        // We'll loop through and sort out the constants and variables
        // We can use this later to see if it has to be returned as the abs function
        const constants: Expression[] = [];
        const variables: Expression[] = [];
        const components = x.componentsArray();
        let allNegative = true;
        // Assume a positive sign. We'll flip this if we negate the expression. 
        // This is strictly for keeping track of what occurred with the sign.
        // This avoids us having to go through each term again.
        let sign = 1;

        for (let i = 0; i < components.length; i++) {
            const e = components[i];
            if (e.isConstant()) {
                constants.push(e);
            }
            else {
                variables.push(e);
            }
            // Check if all are negative. It takes only
            if (e.sign() !== -1) {
                allNegative = false;
            }

            // If all negative
            if (allNegative || variables.length === 1 && variables[0].sign() === -1) {
                retval = x.neg().expand();
                sign = -1; // Flip the sign.
            }

            // Check if it needs to be wrapped. We would prefer to have expressions like |x^2+1| in the form x^2+1
            if (variables.length === 1 && variables[0].getPower().isEven()) {
                // Assume that we won't have wrap
                wrap = false;
                // Check that the rest of the signs are positive
                for (let i = 0; i < constants.length; i++) {
                    if (constants[i].sign() * sign === -1) {
                        wrap = true;
                        break;
                    }
                }
            }
        }
    }
    else if (x.sign() === -1) {
        retval = x.neg();
    }

    // Just wrap it in a function if no simplification occurred
    if (!retval) {
        retval = x;
    }

    if (!retval.isConstant() && wrap) {
        retval = Expression.toFunction(ABS, [retval]);
    }

    return retval;
}

/**
 * The modulo function
 * 
 * @param x 
 * @param y 
 * @returns 
 */
export function mod(x: Expression, y: Expression): Expression {
    let retval: Expression;
    if (x.isNUM() && y.isNUM()) {
        retval = Expression.toExpression(x.getMultiplier().mod(y.getMultiplier()));
    }
    else {
        retval = Expression.toFunction(MOD, [new Expression(x)]);
    }

    return retval;
}


/**
 * The gamma function
 * https://en.wikipedia.org/wiki/Lanczos_approximation
 * 
 * @param x 
 */
export function gamma(x: Expression) {
    // https://math.stackexchange.com/questions/169184/estimating-the-gamma-function-to-high-precision-efficiently
    // https://www.luschny.de/math/factorial/approx/SimpleCases.html
    if (x.isNUM()) {
        const m = x.getMultiplier();
        return Expression.Number(decGamma(m.toDecimal()));
    }
}

/**
 * The complementary error function
 * 
 * @param x 
 * @returns 
 */
export function erfc(x: Expression): Expression {
    return subtract(one(), erf(x));
}

/**
 * The error function
 * https://en.wikipedia.org/wiki/Error_function - Taylor Series
 * 
 * @param x 
 * @returns 
 */
export function erf(x: Expression): Expression {
    let retval;
    if (x.isNUM()) {
        const m = x.getMultiplier();
        // Gives junk values after erf > 6.7
        if (m.gt('6.5')) {
            retval = one();
        }
        else {
            // Calculate it's numeric value
            retval = Expression.Number(decErf(m.toDecimal()));
        }
    }
    else {
        retval = Expression.toFunction('erf', [new Expression(x)]);
    }

    return retval;
}

/**
 * The log function
 * 
 * 
 * @param x 
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function log(x: Expression, base?: Expression): Expression {
    // nerdamer.core.js:4853 - complex
    // 8042 - general log
    let retval;

    if (x.isOne()) {
        retval = Expression.Number('0');
    }
    else if (x.isE() && x.getMultiplier().isOne()) {
        retval = one().times(x.getPower());
    }
    else if (x.sign() === -1 && !x.isComplex()) {
        retval = Expression.Pi().times(Expression.Img()).plus(log(x.abs()))
    }
    else if (Settings.EVALUATE) {
        if (x.isComplex()) {
            const re = x.realPart();
            const im = x.imagPart();
            retval = log(sqrt(re.sq().plus(im.sq()))).plus(atan2(im, re).i());
        }
        else if (x.isNUM()) {
            retval = Expression.Number(x.getMultiplier().toDecimal().ln());
        }
    }
    else if (x.getMultiplier().isOne()) {
        retval = Expression.toFunction(Expression.LOG, [stripPower(x)]).times(x.getPower());
    }

    retval = retval || Expression.toFunction(Expression.LOG, [new Expression(x)]);
    return retval;
}

/**
 * 
 * @param args 
 */
export function matrix(...args: ParserSupportedType[][]) {
    return new Matrix(...args);
}
