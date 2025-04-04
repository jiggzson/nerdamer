import { Expression } from "../classes/expression/Expression";
import { add } from "../classes/parser/operations/add";
import { divide } from "../classes/parser/operations/divide";
import { multiply } from "../classes/parser/operations/multiply";
import { hypot } from "../../math/geometry";
import { ATAN, atan2, ATANH, cos, sin } from "../../math/trig";
import { expand } from "./expand/expand";
import { power } from "../classes/parser/operations/power";
import { SupportedInputType } from "../classes/parser/types";
import { one, zero } from "../classes/expression/shortcuts";


/**
 * Retrieves the real part of a complex number
 * 
 * @param a 
 * @returns 
 */
export function realPart(a: Expression) {
    let retval: Expression;
    const x = expand(a);
    // The real part will be any known constants.
    // Handle pi, e, numbers, x, a*b
    // TODO: FUN and EXP
    if (x.isConstant() || x.isVAR() && !x.isI() ||
        x.isProduct() && !x.hasVariable(Expression.imaginary)) {

        retval = new Expression(a);
    }
    // Deal with x+1, y+y^2, ...
    else if (x.isSum()) {
        retval = Expression.Number('0');
        const components = x.getComponents();
        for (const e in components) {
            retval = add(retval, realPart(components[e]));
        }
    }
    // Otherwise it's zero
    else {
        retval = Expression.Number('0')
    }

    return retval;
}

/**
 * Retrieves the imaginary part of a complex number
 * 
 * @param a 
 * @returns 
 */
export function imagPart(a: Expression) {
    let retval: Expression;
    const x = expand(a);

    if (x.isVAR() && x.isI()) {
        retval = Expression.fromRational(x.getMultiplier());
    }
    else if (x.isSum()) {
        retval = Expression.Number('0');
        const components = x.getComponents();
        for (const e in components) {
            retval = add(retval, imagPart(components[e]));
        }
    }
    else if (x.isProduct()) {
        if (x.hasVariable(Expression.imaginary)) {
            retval = Expression.fromRational(x.getMultiplier());
            const components = x.getComponents();
            for (const e in components) {
                const t = components[e]
                if (!t.isI()) {
                    retval = multiply(retval, t);
                }
            };
        }
        else {
            retval = Expression.Number('0');
        }
    }
    else {
        retval = Expression.Number('0');
    }

    return retval;
}

/**
 * Simplifies a*i^n with numeric powers and coefficients
 * 
 * @param x 
 */
export function simplifyImaginary(x: Expression) {
    const power = x.getPower();
    if (x.isI() && power.isInteger()) {
        const r = power.mod('4').abs();
        // const sgn = power.sign();
        const rText = r.text();
        let retval: Expression;
        switch (rText) {
            case '1':
                retval = Expression.Img();
                break;
            case '2':
                retval = Expression.Number('-1');
                break;
            case '3':
                retval = Expression.Img().neg();
                break;
            default:
                retval = one();
                break;
        }

        retval = multiply(retval, Expression.fromRational(x.getMultiplier()));

        return retval;
    }

    return x;
}

export function toPolarFormArray(x: Expression) {
    const re = x.realPart();
    const im = x.imagPart();
    const r = hypot(re, im);
    const theta = re.isZero() ? divide(Expression.Pi(), Expression.Number('2')) : atan2(im, re);
    return [r, theta];
}

/**
 * Calculates the polar from of a complex number
 * //IMPROVE: Potential speed boost by just returning i.
 * 
 * @param x 
 * @returns 
 */
export function polarForm(x: Expression) {
    let retval;
    if (x.isNUM() || x.isI() && x.getPower().isOne()) {
        // The polarform of a number is just the number
        retval = new Expression(x);
    }
    else {
        // Get r and theta. Theta will come back as (atan(x) or a*pi/n)
        const [r, theta] = toPolarFormArray(expand(x));
        // Calculate the power i * theta
        const p = multiply(Expression.Img(), theta);
        // return r*e^(i*theta)
        const t = power(Expression.Variable('e'), p);
        retval = multiply(t, r);
    }
    return retval;
}

/**
 * Attempts to convert a polar form complex to rectangular form. If no exact identity
 * is found, the decimal representation in rectangular form is returned.
 * 
 * @param x 
 * @returns 
 */
export function rectForm(x: SupportedInputType) {
    x = Expression.toExpression(x);

    let retval;

    function toTheta(t: Expression) {
        const components = t.componentsArray();
        let complexPart = one();
        let realPart = one();
        for (const e of components) {
            if (e.isComplex()) {
                complexPart = complexPart.times(e)
            }
            else {
                realPart = realPart.times(e);
            }
        }

        // Check if it's in the form i*θ
        if (complexPart.value === Expression.imaginary) {
            if (realPart.isFunction(ATAN)) {
                return realPart;
            }
            return realPart.times(t.getMultiplier());
        }
        if (complexPart.isFunction(ATAN) && complexPart.getArguments()[0].value === Expression.imaginary) {
            const arg = complexPart.getArguments()[0];
            return Expression.toFunction(ATANH, [Expression.fromRational(arg.getMultiplier())]).times(t.getMultiplier());
        }
    }

    if (x.isE()) {
        const p = x.getPower();
        const m = x.getMultiplier();
        if (p.isComplex()) {
            const theta = toTheta(p);
            if (theta) {
                retval = cos(theta).times(m).plus(sin(theta).times(m).i());
            }
        }
    }
    else if (x.isProduct()) {
        retval = Expression.fromRational(x.getMultiplier());
        x.each((e) => {
            retval = retval.times(rectForm(e));
        });
    }
    else if (x.isSum()) {
        retval = zero();
        x.each((e) => {
            retval = retval.plus(rectForm(e));
        });
    }

    if (retval) {
        retval = retval.expand();
    }
    else {
        retval = x.isComplex() ? x.evaluate() : x;
    }

    return retval;
}

/**
 * Returns the argument of an expression
 * 
 * @param x 
 * @returns 
 */
export function arg(x: SupportedInputType) {
    x = Expression.toExpression(x);
    const [, theta] = toPolarFormArray(x);
    return theta;
}
