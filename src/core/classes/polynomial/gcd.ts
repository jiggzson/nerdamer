/* eslint-disable @typescript-eslint/no-unused-vars */
import { Ordering, Polynomial, PolyType } from "./Polynomial";
import { avg } from "../../functions/numeric";
import { syncSort, intersection, isEqualArray, remove } from "../../../utils/array";
import { divide } from "./utils";
import { Expression } from "../parser/operations";
import { arrayAddUnique } from "../../functions/utils";
import { printE } from "../../../utils/debug";
import { randomEvalObj } from "../../../utils/object";
import { one } from "../expression/shortcuts";
/**
 * Gets the elimination array. This is the number of times a variable has to be differentiated to eliminate
 * non-essential values.
 * 
 * @param f 
 * @returns 
 */
function eliminationArray(f: Polynomial) {
    const pArray: number[][] = [];
    // Create the powers array which will be used to collect all the powers of each variable
    for (let i = 0; i < f.variables.length; i++) {
        pArray.push([]);
    }

    // Collect all the powers into individual arrays so we can calculate their averages
    for (const t of f.terms) {
        const multideg = t.getMultidegArray();
        for (let i = 0; i < multideg.length; i++) {
            const pow = multideg[i];
            pArray[i].push(pow);
        }
    }

    return pArray.map((arr) => {
        const average = avg(...arr);
        return Math.ceil(average);
    });
}

/**
 * Gets the elimination arrays of the intersection variables
 * 
 * @param f 
 * @param g 
 * @param prod 
 * @returns 
 */
function getIntersectionEliminationArrays(f: Polynomial, g: Polynomial, prod?: Polynomial): [string[], number[]] {
    //Calculate the product if n ot provided
    prod ??= f.times(g);

    const rVars: string[] = [];
    const rEv: number[] = [];
    const freq = prod.variableFrequency();
    const [vars, ev] = syncSort([...prod.variables], eliminationArray(prod), (a: string, b: string) => {
        return freq[a].count - freq[b].count;
    });

    // Get the remaining variables
    const variableIntersectionArray = intersection(f.variables, g.variables);

    for (let i = 0; i < vars.length; i++) {
        if (variableIntersectionArray.includes(vars[i])) {
            rVars.push(vars[i]);
            rEv.push(ev[i]);
        }
    }

    return [rVars, rEv];
}

/**
 * Calculates the quotients and remainders given an assumed gcd
 * 
 * @param f 
 * @param g 
 * @param gcdPrime 
 * @returns 
 */
function getQuotientsAndRemainders(f: Polynomial, g: Polynomial, gcdPrime: Polynomial) {
    const [q1, r1] = divide(f, gcdPrime);
    const [q2, r2] = divide(g, gcdPrime);
    const quo1 = Polynomial.toPolynomial(q1, f.ordering).gcdFree(true, true);
    const quo2 = Polynomial.toPolynomial(q2, g.ordering).gcdFree(true, true);

    return { q1: q1, r1: r1, q2: q2, r2: r2, quo1: quo1, quo2: quo2 };
}

export function evalReduction(f: Polynomial, variable: string) {
    const vars = remove([...f.variables], variable);
    const o = randomEvalObj(vars);
    return f.evaluate(o);
}

/**
 * Calculates the multivariate GCD given two multivariate polynomials
 * 
 * @param f 
 * @param g 
 * @param eliminationArrays 
 * @returns 
 */
export function MVGCD(f: Polynomial, g: Polynomial, eliminationArrays?: [string[], number[]]): Polynomial {
    // First clean up the dividend to remove multiples. These will change the gcdPrime by some constant.
    const [quo, rem] = divide(f, g);
    if (!quo.isZero()) {
        f = Polynomial.toPolynomial(rem, f.ordering);
    }

    let retval;
    let prod = f.times(g);

    // Calculate the elimination arrays if not provided
    const [rVars, rEv] = eliminationArrays ? eliminationArrays : getIntersectionEliminationArrays(f, g, prod);

    // If one is a univariate polynomial then just convert the other since their GCD will basically be untouched
    // Do this by inserting a random integer
    if (rVars.length === 1) {
        if (!isEqualArray(rVars, f.variables)) {
            f = new Polynomial(evalReduction(f, rVars[0]));
        }
        else if (!isEqualArray(rVars, g.variables)) {
            g = new Polynomial(evalReduction(g, rVars[0]));
        }
        // Update the product
        return polyGCD(f, g);
    }

    for (let i = 0; i < rVars.length; i++) {
        const v = rVars[i]; // The variable which we'll be differentiating
        let n = rEv[i]; // The number of times to differentiate
        let diff: undefined | Polynomial;

        do {
            // Guard against zero division
            if (!prod.getExpression().hasVariable(v)) {
                break;
            }

            // Since we know what the upper limit of differentiation is, we only have to make sure we don't go too far.
            // If the derivative gives us zero then we've gained nothing so we keep pulling it back in case we've accidentally gone too far
            // This can happen when we have two variables of equal "strength" and frequency multiplied by each other. e.g. (a^2*b)(a*b^2)
            diff = prod.diff(v, n--);
        }
        while (diff && diff.isConstant());

        // Update the product with the new value
        prod = diff ? diff : prod;
    }

    // The assumed GCD
    const gcdPrime = prod.gcdFree(true, true);

    let { q1, q2, r1, r2, quo1, quo2 } = getQuotientsAndRemainders(f, g, gcdPrime);

    if (quo1.isConstant() && quo2.isConstant()) {
        // Test the first polynomial
        let gcd = MVGCD(gcdPrime, f);
        // If no GCD was found then try the other
        if (gcd.eq(new Polynomial('1'))) {
            gcd = MVGCD(gcdPrime, g);
        }
        // If it's one then we've done all we can and just return what we have.
        if (gcd.isConstant()) {
            return gcd;
        }
        // Otherwise recalculate everything.
        ({ r1, r2, q1, q2, quo1, quo2 } = getQuotientsAndRemainders(f, g, gcd));
    }

    // Best case scenario. We lucked out and calculated the gcd correctly and both quotients match
    if (quo1.eq(quo2)) {
        // If both are equal to zero then we have a tie. This means that one of the variables wasn't included in the
        // elimination array. Call the function on one of the polynomial and the gcdPrime
        // TODO: Polynomial.getExpression should pull the latest version of the expression
        retval = Expression.toExpression(quo1.text()); // Either one will do
    }
    else if (q1.isZero()) {
        // Then q2 maybe the gcd
        const [, rt] = divide(g, quo2);
        if (rt.isZero()) {
            retval = Expression.toExpression(quo2.text());
        }
    }
    else if (q2.isZero()) {
        // Then q2 maybe the gcd
        const [, rt] = divide(f, quo1);
        if (rt.isZero()) {
            retval = Expression.toExpression(quo1.text());
        }
    }
    // If both r1 and r2 are zero then we have successfully computed the GCD
    else if (r1.isZero() && r2.isZero()) {
        retval = gcdPrime;
    }
    // If r1 is zero the q1 should be the gcd. We just need to confirm with a division
    else if (r1.isZero()) {
        const [, rt] = divide(g, quo1);
        if (rt.isZero()) {
            retval = Expression.toExpression(quo1.text());
        }
    }
    // If r1 is zero the q1 should be the gcd. We just need to confirm with a division
    else if (r2.isZero()) {
        const [, rt] = divide(f, quo2);
        if (rt.isZero()) {
            retval = Expression.toExpression(quo2.text())
        }
    }
    else {
        const [qt, rt] = divide(g, quo2);
        if (divide(f, qt)[1].isZero()) {
            retval = qt;
        }
        // Try the other side if we still don't have an answer
        if (!retval) {
            const [qt2, rt2] = divide(f, quo1);
            if (divide(g, qt2)[1].isZero()) {
                retval = qt2;
            }
        }
    }

    if (!retval) {
        retval = one();
    }

    return retval;
}

/**
 * The univariate gcd
 * 
 * @param f 
 * @param g 
 * @returns 
 */
export function UVGCD(f: Polynomial, g: Polynomial): Polynomial {
    let retval;

    if (f.LT().getTotalPower() > g.LT().getTotalPower()) {
        return UVGCD(g, f);
    }

    while (!g.expression.isZero()) {
        const [, r] = divide(f, g);
        f = g;
        g = Polynomial.toPolynomial(r, f.ordering);
        retval = Polynomial.toPolynomial(f, f.ordering);
    }

    return retval.gcdFree(true, true);
}

/**
 * Calculates the polynomial GCD of two polynomials
 * 
 * @param f 
 * @param g 
 * @param ordering 
 * @param vars 
 * @returns 
 */
export function polyGCD(f: PolyType, g: PolyType, ordering?: Ordering, vars?: string[]) {
    const p = Polynomial.toPolynomial(f, ordering, vars);
    const q = Polynomial.toPolynomial(g, ordering, vars);
    let retval;

    //Get the total list of variables call the corresponding algorithm GCD algorithm
    switch (arrayAddUnique([...p.variables], [...q.variables]).length) {
        // Two constants so just get the GCD of their multiplier
        case 0: {
            const gcd = p.getExpression().getMultiplier().GCD(q.getExpression().getMultiplier());
            retval = Expression.fromRational(gcd);
            break;
        }
        // Deal with the univariate case
        case 1:
            retval = UVGCD(p, q);
            break;
        // Defaults to the multivariate case
        default:
            retval = MVGCD(p, q);
            break;
    }

    return retval;
}

