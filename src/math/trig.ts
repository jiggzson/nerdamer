import { Rational } from "../core/classes/rational/Rational";
import { Expression } from "../core/classes/expression/Expression";
import { Settings } from "../core/Settings";
import { isEven } from "../core/functions/bigint";
import { PI } from "../core/classes/parser/constants";
import { evaluate } from "../core/classes/parser/helpers";
import { sqrt } from "../core/functions/math";
import { __, UndefinedError } from "../core/errors";
import { SupportedInputType } from "../core/classes/parser/types";
import { log } from "../core/functions/math";
import { one } from "../core/classes/expression/shortcuts";
import { hypot } from "./geometry";

export const TRIG_FUNCTION_NAMES = {
    COS: 'cos',
    SIN: 'sin',
    TAN: 'tan',
    SEC: 'sec',
    CSC: 'csc',
    COT: 'cot',
    ACOS: 'acos',
    ASIN: 'asin',
    ATAN: 'atan',
    ATAN2: 'atan2',
    SINH: 'sinh',
    COSH: 'cosh',
    TANH: 'tanh',
    SECH: 'sech',
    CSCH: 'csch',
    COTH: 'coth',
    ACOSH: 'acosh',
    ASINH: 'asinh',
    ATANH: 'atanh',
    ASECH: 'asech',
    ACSCH: 'acsch',
    ACOTH: 'acoth'
};

export const { COS, SIN, TAN, ASIN, ACOS, SEC, CSC, COT, ATAN, ATAN2,
    SINH, COSH, TANH, SECH, CSCH, COTH,
    ACOSH, ASINH, ATANH, ASECH, ACSCH, ACOTH } = TRIG_FUNCTION_NAMES;

//https://www.livingston.org/cms/lib9/NJ01000562/Centricity/Domain/742/calc/Trig%20functions%20chart%20-%20answers.pdf

/**
 * Gets the quadrant of the trig function
 * @param x
 * @returns 
 */
function getQuadrant(x: Rational) {
    const pi = Rational.PI.toDecimal();
    const twoPi = pi.times(2);
    // Get the angle by removing multiples of pi
    let theta = x.toDecimal().mod(twoPi);
    // Make it a positive angle
    if (theta.lt(0)) {
        theta = theta.plus(twoPi);
    }
    const quadrant = Math.floor(Number(theta.div(pi.div(2)))) + 1;
    // Ensure no more than 4
    return Math.min(quadrant, 4);
}

/**
 * Checks to see if a Expression is a multiple of pi. If so it returns the evaluated
 * version. Otherwise, the Expression is untouched.
 * 
 * @param x 
 * @returns 
 */
function toPiValue(x: Expression) {
    return PI.includes(x.value) && x.getPower().isOne() ?
        evaluate(`${x}`, { [x.value]: `${Rational.PI}` }) : x;
}

// function argNumDen(x: Expression, withR:true): [Expression, Expression, Expression];
// function argNumDen(x: Expression, withR:false): [Expression, Expression];
function argNumDen(x: Expression, withR = false) {
    const arg = x.getArguments()[0];
    const num = arg.getNumerator();
    const den = arg.getDenominator();
    const retval = [num, den];

    if (withR) {
        retval.push(hypot(num, den));
    }

    return retval;
}

/**
 * The cosine function
 * 
 * @param x 
 * @returns 
 */
export function cos(x: SupportedInputType): Expression {
    x = Expression.toExpression(x);

    let retval: Expression;

    const m = Math.abs(+x.getMultiplier().text());

    if (m === 1 && x.isFunction(ATAN)) {
        const [, den, r] = argNumDen(x, true);
        retval = den.div(r);
    }
    else if (m === 1 && x.isFunction(ACOS)) {
        retval = x.getArguments()[0];
    }
    else if (m === 1 && x.isFunction(ASIN)) {
        const [num, den] = argNumDen(x);
        retval = sqrt(den.sq().minus(num.sq())).div(den);
    }
    else {
        // Create a temporary variable. We can use this to substitute for pi and simplification
        const t = toPiValue(x);
        // A flag to check the quadrant. This should be done if a pi substitution was performed.
        let checkQuadrant = true;
        // The quadrants in which cosine is negative
        const quadrants = [2, 3];

        if (t.isNUM()) {
            const a = t.getMultiplier();
            // Check its ratio to pi
            const r = a.div(Rational.PI);

            // cos is one for all even pi and -1 for odd
            if (r.isInteger()) {
                // Return 1 or -1 for multiples of pi
                retval = Expression.Number(isEven(r.numerator) ? '1' : '-1');
            }
            else {
                // Modify based on the denominator
                switch (r.denominator) {
                    // n*pi/2
                    case 2n:
                        retval = Expression.Number('0');
                        break;
                    case 3n:
                        retval = one().div('2');
                        break;
                    case 4n:
                        // Return 1/sqrt(2)
                        retval = one().div(sqrt(Expression.Number('2')));
                        break;
                    case 6n:
                        // Return sqrt(3)/2
                        retval = sqrt('3').div('2');
                        break;
                    default:
                        // Don't check the quadrant since no pi substitution was performed
                        checkQuadrant = false;
                        // If evaluate is called then return the value
                        if (Settings.EVALUATE) {
                            retval = Expression.Number(a.toDecimal().cos());
                        }
                        else {
                            // Otherwise return a symbolic function
                            retval = Expression.toFunction(COS, [x]);
                        }
                        break;
                }

                if (checkQuadrant && r.denominator !== 2n && quadrants.includes(getQuadrant(a))) {
                    // if (checkQuadrant && (quadrant === 2 || quadrant === 3)) {
                    retval = retval.neg();
                }
            }
        }
        else if (Settings.EVALUATE && x.isComplex()) {
            const re = x.realPart();
            const im = x.imagPart();
            retval = cos(re).times(cosh(im)).plus(sin(re).times(sinh(im)).i());
        }
        else {
            retval = Expression.toFunction(COS, [x]);
        }
    }

    return retval;
}

/**
 * The sine function
 * 
 * @param x 
 * @returns 
 */
export function sin(x: SupportedInputType): Expression {
    x = Expression.toExpression(x);

    let retval: Expression;

    const m = Math.abs(+x.getMultiplier().text());

    if (m === 1 && x.isFunction(ATAN)) {
        const [num, , r] = argNumDen(x, true);
        retval = num.div(r).times(x.sign());
    }
    else if (m === 1 && x.isFunction(ASIN)) {
        retval = x.getArguments()[0].times(x.sign());
    }
    else if (m === 1 && x.isFunction(ACOS)) {
        const [num, den] = argNumDen(x);
        retval = sqrt(den.sq().minus(num.sq())).div(den).times(x.sign());
    }
    else {
        // Create a temporary variable. We can use this to substitute for pi and simplification
        const t = toPiValue(x);
        // A flag to check the quadrant. This should be done if a pi substitution was performed.
        let checkQuadrant = true;
        // The quadrants in which the sine function is negative
        const quadrants = [3, 4];

        if (t.isNUM()) {
            const a = t.getMultiplier();
            // Check its ratio to pi
            const r = a.div(Rational.PI);

            if (r.isInteger()) {
                // sin is zero for all multiples of pi
                retval = Expression.Number('0');
            }
            else {
                // Modify based on the denominator
                switch (r.denominator) {
                    // n*pi/2
                    case 2n:
                        retval = one();
                        break;
                    case 3n:
                        // Return sqrt(3)/2
                        retval = sqrt('3').div('2');
                        break;
                    case 4n:
                        // Return 1/sqrt(2)
                        retval = one().div(sqrt('2'));
                        break;
                    case 6n:
                        // Return 1/2
                        retval = one().div('2');
                        break;
                    default:
                        // Don't check the quadrant since no pi substitution was performed
                        checkQuadrant = false;
                        // If evaluate is called then return the value
                        if (Settings.EVALUATE) {
                            retval = Expression.Number(a.toDecimal().sin());
                        }
                        else {
                            // Otherwise return a symbolic function
                            retval = Expression.toFunction(SIN, [x]);
                        }
                        break;
                }

                if (checkQuadrant && quadrants.includes(getQuadrant(a))) {
                    // if (checkQuadrant && (quadrant === 2 || quadrant === 3)) {
                    retval = retval.neg();
                }
            }
        }
        else if (Settings.EVALUATE && x.isComplex()) {
            const re = x.realPart();
            const im = x.imagPart();
            retval = sin(re).times(cosh(im)).plus(cos(re).times(sinh(im)).i());
        }
        else {
            retval = Expression.toFunction(SIN, [x]);
        }
    }


    return retval;
}

/**
 * The tangent function
 * 
 * @param x 
 * @returns 
 */
export function tan(x: SupportedInputType): Expression {
    x = Expression.toExpression(x);

    let retval;

    const m = Math.abs(+x.getMultiplier().text());

    if (m === 1 && x.isFunction(ATAN)) {
        retval = x.getArguments()[0].times(x.sign());
    }
    else if (m === 1 && x.isFunction(ASIN)) {
        const [num, den] = argNumDen(x);
        retval = num.div(sqrt(den.sq().minus(num.sq()))).times(x.sign());
    }
    else if (m === 1 && x.isFunction(ACOS)) {
        const [num, den] = argNumDen(x);
        retval = sqrt(den.sq().minus(num.sq())).div(num).times(x.sign());
    }
    else {
        const piDenominator = toPiValue(x).getMultiplier().div(Rational.PI).denominator;
        // If it's a multiple of pi or zero
        if (piDenominator === 1n || x.isZero()) {
            retval = Expression.Number('0');
        }
        // Check for multiplier of pi/2 and throw if true
        else if (piDenominator === 2n) {
            throw new UndefinedError(__('tanUndefined'));
        }
        else if (Settings.EVALUATE && x.isNUM()) {
            retval = Expression.Number(x.getMultiplier().toDecimal().tan());
        }
        else if (Settings.EVALUATE && x.isComplex()) {
            const dblRe = x.realPart().times(2);
            const dblIm = x.imagPart().times(2);
            const d = cos(dblRe).plus(cosh(dblIm));
            retval = sin(dblRe).div(d).plus(sinh(dblIm).div(d).i());
        }
        else {
            retval = sin(x).div(cos(x));
            if (retval.hasFunction(COS)) {
                retval = Expression.toFunction(TAN, [x]);
            }
        }
    }



    return retval;
}

/**
 * The secant function
 * 
 * @param x 
 * @returns 
 */
export function sec(x: SupportedInputType): Expression {
    x = Expression.toExpression(x);

    let retval;
    if (Settings.EVALUATE && x.isComplex()) {
        const re = x.realPart();
        const im = x.imagPart();
        const a = cos(re);
        const b = cosh(im);
        const c = sin(re);
        const d = sinh(im);
        const e = a.sq().times(b.sq()).plus(c.sq().times(d.sq()));
        retval = a.times(b).div(e).plus(c.times(d).div(e).i());
    }
    else {
        retval = cos(x).invert();
        if (retval.hasFunction(COS)) {
            retval = Expression.toFunction(SEC, [x]);
        }
    }


    return retval;
}

/**
 * The cosecant function
 * 
 * @param x 
 * @returns 
 */
export function csc(x: SupportedInputType): Expression {
    x = Expression.toExpression(x);
    let retval;

    if (Settings.EVALUATE && x.isComplex()) {
        const re = x.realPart();
        const im = x.imagPart();
        const a = sin(re);
        const b = cosh(im);
        const c = cos(re);
        const d = sinh(im);
        const e = a.sq().times(b.sq()).plus(c.sq().times(d.sq()));
        retval = a.times(b).div(e).minus(c.times(d).div(e).i());
    }
    else {
        retval = sin(x).invert();
        if (retval.hasFunction(SIN)) {
            retval = Expression.toFunction(CSC, [x]);
        }
    }

    return retval;
}

/**
 * The cotangent function
 * 
 * @param x 
 * @returns 
 */
export function cot(x: SupportedInputType): Expression {
    x = Expression.toExpression(x);
    let retval;

    if (Settings.EVALUATE && x.isComplex()) {

        const re = x.realPart();
        const im = x.imagPart();
        const a = sin(re);
        const b = cos(re);
        const c = sinh(im.times('2'));
        const d = cosh(im.times('2'));
        const e = cos(re.times('2'));

        retval = a.times(b).times('2').div(d.minus(e)).plus(c.div(e.minus(d)).i());
    }
    else {
        retval = cos(x).div(sin(x));
        if (retval.hasFunction(COS)) {
            retval = Expression.toFunction(COT, [x]);
        }
    }

    return retval;
}

/**
 * The arccosine function
 * 
 * @param x 
 * @returns 
 */
export function acos(x: SupportedInputType): Expression {
    x = Expression.toExpression(x);

    let retval: Expression | undefined;

    if (Settings.EVALUATE && x.isNUM()) {
        // Becomes complex between [-1, 1]
        if (x.lt(-1) || x.gt(1)) {
            const sgn = x.sign();
            const halfPi = Expression.Pi().div('2');
            let asinX = asin(x.abs());
            if (sgn === 1) {
                asinX = asinX.neg();
            }

            retval = halfPi.plus(asinX);
        }
        else {
            retval = Expression.Number(x.getMultiplier().toDecimal().acos());
        }
    }
    else if (Settings.EVALUATE && x.isComplex()) {
        const i = Expression.Img();
        const a = sqrt(one().minus(x.pow(2)));
        const b = i.times(x);
        // Use formula: pi/2 - asin(x)
        // TODO. For some reason the acos formula gives the wrong answer
        retval = Expression.Pi().div('2').minus(i.times(log(a.minus(b)))).expand();
    }
    else {
        switch (x.text()) {
            case '0':
                retval = Expression.Pi().div('2');
                break;
            case '1/2':
                retval = Expression.Pi().div('3');
                break;
            case '-1/2':
                retval = Expression.Pi().times('2').div('3');
                break;
            case '1':
                retval = Expression.Number('0');
                break;
            case '-1':
                retval = Expression.Pi();
                break;
            case '2^(-1/2)':
            case '(1/2)*2^(1/2)':
                retval = Expression.Pi().div('4');
                break;
            case '-2^(-1/2)':
            case '(-1/2)*2^(1/2)':
                retval = Expression.Pi().times('3').div('4');
                break;
            case '(1/2)*3^(1/2)':
                retval = Expression.Pi().div('6');
                break;
            case '(-1/2)*3^(1/2)':
                retval = Expression.Pi().times('5').div('6');
                break;
        }
    }

    if (retval === undefined) {
        retval = Expression.toFunction(ACOS, [x]);
    }

    return retval;
}

/**
 * The arcsine function
 * 
 * @param x 
 * @returns 
 */
export function asin(x: SupportedInputType) {
    x = Expression.toExpression(x);

    let retval: Expression | undefined;

    if (Settings.EVALUATE && x.isNUM()) {
        // asin has a domain of -1 to 1
        if (x.lt(-1) || x.gt(1)) {
            const sgn = x.sign();
            x = x.abs();
            const xSqrMin1 = sqrt(x.sq().minus(1));
            let halfPi = Expression.Pi().div('2');
            let i = Expression.Img();
            if (sgn === -1) {
                halfPi = halfPi.neg();
            }
            else {
                i = i.neg();
            }

            retval = halfPi.plus(i.times(log(x.plus(xSqrMin1))));
        }
        else {
            retval = Expression.Number(x.getMultiplier().toDecimal().asin());
        }
    }
    else if (Settings.EVALUATE && x.isComplex()) {
        const i = Expression.Img();
        const a = sqrt(one().minus(x.pow(2)));
        const b = i.times(x);
        retval = i.times(log(a.minus(b))).expand();
    }
    else {
        switch (x.text()) {
            case '0':
                retval = Expression.Number('0');
                break;
            case '1/2':
                retval = Expression.Pi().div('6');
                break;
            case '-1/2':
                retval = Expression.Pi().neg().div('6');
                break;
            case '1':
                retval = Expression.Pi().div('2');
                break;
            case '-1':
                retval = Expression.Pi().neg().div('2');
                break;
            case '2^(-1/2)':
            case '(1/2)*2^(1/2)':
                retval = Expression.Pi().div('4');
                break;
            case '-2^(-1/2)':
            case '(-1/2)*2^(1/2)':
                retval = Expression.Pi().neg().div('4');
                break;
            case '(1/2)*3^(1/2)':
                retval = Expression.Pi().div('3');
                break;
            case '(-1/2)*3^(1/2)':
                retval = Expression.Pi().neg().div('3');
                break;
        }
    }

    if (retval === undefined) {
        retval = Expression.toFunction(ASIN, [x]);
    }

    return retval;
}

/**
 * The arctangent function
 * 
 * @param x 
 * @returns 
 */
export function atan(x: SupportedInputType): Expression {
    x = Expression.toExpression(x);

    let retval: Expression | undefined;

    if (Settings.EVALUATE && x.isNUM()) {
        retval = Expression.Number(x.getMultiplier().toDecimal().atan());
    }
    else if (Settings.EVALUATE && x.isComplex()) {
        const i = Expression.Img();
        const a = log(i.minus(x).div(i.plus(x)));
        retval = i.neg().div(2).times(a).expand()
    }
    else {
        switch (x.abs().text()) {
            case '0':
                retval = Expression.Number('0');
                break;
            case '1':
                retval = Expression.Pi().div('4');
                break;
            case 'sqrt(3)':
            case '3^(1/2)':
                retval = Expression.Pi().div('3');
                break;
            case '3^(-1/2)':
            case '(1/3)*3^(1/2)':
                retval = Expression.Pi().div('6');
                break;
        }

        if (retval && x.sign() === -1) {
            retval = retval.neg();
        }
    }

    if (!retval) {
        retval = Expression.toFunction(ATAN, [x]);
    }

    return retval;
}

/**
 * The arcsecant function
 * 
 * @param x 
 * @returns 
 */
export function asec(x: SupportedInputType) {
    x = Expression.toExpression(x);
    return acos(x.invert());
}

/**
 * The arccosecant function
 * 
 * @param x 
 * @returns 
 */
export function acsc(x: SupportedInputType) {
    x = Expression.toExpression(x);
    return asin(x.invert());
}

/**
 * The arccotangent function
 * 
 * @param x 
 * @returns 
 */
export function acot(x: SupportedInputType) {
    x = Expression.toExpression(x);
    return atan(x.invert());
}

/**
 * The atan2 function
 * https://en.wikipedia.org/wiki/Atan2
 * 
 * @param x 
 * @param y 
 * @returns 
 */
export function atan2(y: SupportedInputType, x: SupportedInputType): Expression {
    x = Expression.toExpression(x);
    y = Expression.toExpression(y);

    if (x.isZero() && y.isZero()) {
        throw new UndefinedError(__('atan2Undefined'));
    }

    let retval: Expression;

    if (x.isNUM() && y.isNUM()) {
        // Since it relies on our implementation of atan, we don't need to check for Settings.EVALUATE
        const b = y.getMultiplier();
        const a = x.getMultiplier();
        if (a.gt('0')) {
            retval = atan(y.div(x));
        }
        else if (a.lt('0') && b.gte('0')) {
            retval = atan(y.div(x)).plus(Expression.Pi());
        }
        else if (a.lt('0') && b.lt('0')) {
            retval = atan(y.div(x)).plus(Expression.Pi().neg());
        }
        else if (a.eq('0') && b.gt('0')) {
            retval = Expression.Pi().div('2');
        }
        else {
            retval = Expression.Pi().neg().div('2')
        }
    }
    else {
        retval = Expression.toFunction(ATAN2, [y, x]);
    }

    return retval;
}

/**
 * The hyperbolic cosine function
 * 
 * @param x 
 * @returns 
 */
export function cosh(x: SupportedInputType) {
    x = Expression.toExpression(x);

    let retval: Expression;

    if (Settings.EVALUATE && x.isNUM()) {
        retval = Expression.Number(x.getMultiplier().toDecimal().cosh());
    }
    else if (Settings.EVALUATE && x.isComplex()) {
        const re = x.realPart();
        const im = x.imagPart();
        retval = cosh(re).times(cos(im)).plus(sinh(re).times(sin(im)).i())
    }
    else {
        retval = Expression.toFunction(COSH, [x]);
    }

    return retval;
}

/**
 * The hyperbolic sine function
 * 
 * @param x 
 * @returns 
 */
export function sinh(x: SupportedInputType) {
    x = Expression.toExpression(x);

    let retval: Expression;

    if (Settings.EVALUATE && x.isNUM()) {
        retval = Expression.Number(x.getMultiplier().toDecimal().sinh());
    }
    else if (Settings.EVALUATE && x.isComplex()) {
        const re = x.realPart();
        const im = x.imagPart();
        retval = sinh(re).times(cos(im)).plus(cosh(re).times(sin(im)).i())
    }
    else {
        retval = Expression.toFunction(SINH, [x]);
    }

    return retval;
}

/**
 * The hyperbolic tangent function
 * 
 * @param x 
 * @returns 
 */
export function tanh(x: SupportedInputType) {
    x = Expression.toExpression(x);

    let retval: Expression;

    if (Settings.EVALUATE && x.isNUM()) {
        retval = Expression.Number(x.getMultiplier().toDecimal().tanh());
    }
    else if (Settings.EVALUATE && x.isComplex()) {
        const re = x.realPart();
        const im = x.imagPart();
        const num = sinh(re).times(cos(im)).plus(cosh(re).times(sin(im)).i());
        const den = cosh(re).times(cos(im)).plus(sinh(re).times(sin(im)).i());
        retval = num.div(den);
    }
    else {
        retval = Expression.toFunction(TANH, [x]);
    }

    return retval;
}

/**
 * The hyperbolic secant function
 * 
 * @param x 
 * @returns 
 */
export function sech(x: SupportedInputType) {
    x = Expression.toExpression(x);
    let retval = Expression.Number(1).div(cosh(x));

    if (retval.hasFunction(COSH)) {
        retval = Expression.toFunction(SECH, [x]);
    }

    return retval;
}

/**
 * The hyperbolic cosecant function
 * 
 * @param x 
 * @returns 
 */
export function csch(x: SupportedInputType) {
    x = Expression.toExpression(x);
    let retval = Expression.Number(1).div(sinh(x));

    if (retval.hasFunction(SINH)) {
        retval = Expression.toFunction(CSCH, [x]);
    }

    return retval;
}

/**
 * The hyperbolic cotangent function
 * 
 * @param x 
 * @returns 
 */
export function coth(x: SupportedInputType) {
    x = Expression.toExpression(x);
    let retval = Expression.Number(1).div(tanh(x));

    if (retval.hasFunction(TANH)) {
        retval = Expression.toFunction(COTH, [x]);
    }

    return retval;
}

/**
 * The hyperbolic cotangent function
 * 
 * @param x 
 * @returns 
 */
export function acosh(x: SupportedInputType) {
    x = Expression.toExpression(x);
    // The domain is [1, infinity]
    let retval;
    if (x.eq(1)) {
        retval = Expression.Number('0');
    }
    else if (x.isZero()) {
        const halfPi = Expression.Pi().div('2');
        retval = cos(halfPi).times(halfPi).plus(sin(halfPi).times(halfPi).i());
    }
    else if (Settings.EVALUATE) {
        if (x.lt('1') || x.isComplex()) {
            const a = sqrt(x.plus('1'));
            const b = sqrt(x.minus('1'));
            const c = x.plus(a.times(b));
            retval = log(c);
        }
        else {
            retval = Expression.Number(x.getMultiplier().toDecimal().acosh());
        }
    }

    if (!retval) {
        retval = Expression.toFunction(ACOSH, [x]);
    }

    return retval;
}

/**
 * The hyperbolic arcsine function
 * 
 * @param x 
 * @returns 
 */
export function asinh(x: SupportedInputType) {
    x = Expression.toExpression(x);
    let retval;
    if (x.isZero()) {
        retval = Expression.Number('0');
    }
    else if (Settings.EVALUATE) {
        if (x.isComplex()) {
            retval = log(x.plus(sqrt(x.sq().plus('1'))));
        }
        else {
            retval = Expression.Number(x.getMultiplier().toDecimal().asinh());
        }
    }

    if (!retval) {
        retval = Expression.toFunction(ASINH, [x]);
    }

    return retval;
}

/**
 * The hyperbolic arctangent function
 * 
 * @param x 
 * @returns 
 */
export function atanh(x: SupportedInputType) {
    x = Expression.toExpression(x);
    let retval;
    if (x.isZero()) {
        retval = Expression.Number('0');
    }
    else if (x.isOne()) {
        throw new UndefinedError(__('atanhUndefined'));
    }
    else if (Settings.EVALUATE) {
        if (x.lt('-1') || x.gt('1') || x.isComplex()) {
            //atanh(z) = (1/2) * ln((1 + z) / (1 - z))
            retval = log(one().plus(x).div(one().minus(x))).div('2').expand();
        }
        else {
            retval = Expression.Number(x.getMultiplier().toDecimal().atanh());
        }
    }

    if (!retval) {
        retval = Expression.toFunction(ATANH, [x]);
    }

    return retval;
}

/**
 * The hyperbolic arcsecant function
 * 
 * @param x 
 * @returns 
 */
export function asech(x: SupportedInputType) {
    x = Expression.toExpression(x);
    let retval;

    if (Settings.EVALUATE) {
        if (x.isComplex()) {
            retval = acosh(x.invert());
        }
        else {
            const a = one().div(x);
            const b = sqrt(one().div(x.sq()).minus('1'));
            retval = log(b.plus(a));
        }
    }

    if (!retval) {
        retval = Expression.toFunction(ASECH, [x]);
    }

    return retval;
}

/**
 * The hyperbolic arccosecant function
 * 
 * @param x 
 * @returns 
 */
export function acsch(x: SupportedInputType) {
    x = Expression.toExpression(x);
    let retval;

    if (Settings.EVALUATE) {
        if (x.isComplex()) {
            retval = asinh(x.invert());
        }
        else {
            const a = one().div(x);
            const b = sqrt(one().div(x.sq()).plus('1'));
            retval = log(b.plus(a));
        }
    }

    if (!retval) {
        retval = Expression.toFunction(ACSCH, [x]);
    }

    return retval;
}

/**
 * The hyperbolic arccotangent function
 * 
 * @param x 
 * @returns 
 */
export function acoth(x: SupportedInputType) {
    x = Expression.toExpression(x);
    let retval;

    if (Settings.EVALUATE) {
        if (x.isComplex()) {
            retval = atanh(x.invert());
        }
        else {
            retval = log(x.plus('1').div(x.minus('1'))).div('2').expand();
        }
    }

    if (!retval) {
        retval = Expression.toFunction(ACOTH, [x]);
    }

    return retval;
}
