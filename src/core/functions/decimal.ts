import Decimal from "decimal.js";
import { factorial } from "./bigint";
import { DecimalType } from "../classes/parser/types";

export function erf(x: DecimalType) {
    x = new Decimal(x);
    // Get pi from Decimal
    const pi = Decimal.acos(-1);
    let sum = new Decimal(0);
    let k = 0;
    const max = 1000;
    // Get the sign since erf(-x) = -erf(x)
    const sgn = Decimal.sign(x);
    x = x.abs();
    // To keep track of convergence
    let dx = x;
    // 1e-precision
    const error = new Decimal(10).pow(-Decimal.precision);
    while (dx.gte(error)) {
        const num = new Decimal(-1).pow(k).times(x.pow(2 * k + 1));
        const den = new Decimal(2 * k + 1).times(String(factorial(k)))
        const result = sum.plus(num.div(den));
        // Set the difference to see if we're converging
        dx = result.minus(sum).abs();
        sum = result;
        k++;
        if (k > max) {
            throw new Error('erf not converging. Exiting!');
        }
    }

    const sqr2OverPi = new Decimal(2).div(pi.sqrt());
    // The limit of erf is 1 so ensure no larger value is returned.
    let retval = Decimal.min(sqr2OverPi.times(sum), 1);

    if (sgn === -1) {
        retval = retval.neg();
    }

    return retval;
}

function calcCoeffs(n: number) {
    const c: Decimal[] = [];
    let kFact = new Decimal(1);
    // Get pi
    const pi = Decimal.acos(-1);
    // sqrt(2*pi);
    c[0] = pi.times(2).sqrt();
    for (let k = 1; k < n; k++) {
        c[k] = Decimal.exp(n - k).times(Decimal.pow(n - k, k - 0.5)).div(kFact);
        kFact = kFact.times(-k);
    }

    return c;
}
// https://math.stackexchange.com/questions/2204020/definition-of-the-gamma-function-for-non-integer-negative-values
/**
 * The gamma function using Spouge approximation.
 * This function is slow converging but appropriate for arbitrary precision. It relies on Decimal.js.
 * 
 * Ported from: https://rosettacode.org/wiki/Gamma_function#C++ (the implementation)
 * https://math.stackexchange.com/questions/2204020/definition-of-the-gamma-function-for-non-integer-negative-values (negative gamma)
 * https://en.wikipedia.org/wiki/Spouge%27s_approximation (Spouge's Approximation)
 * 
 * @param n The number of elements to be calculated in the coefficient array
 * @param x The number being evaluated
 * @returns 
 */
export function gamma(x: DecimalType) {
    x = new Decimal(x);

    if (x.isInteger()) {
        return new Decimal(String(factorial(Number(x.minus(1)))));
    }
    // As per the documentation, in order to get x precision, you must go x+(some delta).

    // Store the precision currently being used
    const precision = Decimal.precision;
    // Set it to higher precision since we want to push the error beyond the desired precision;
    // This number was calibrated using precision = 250 since this function becomes borderline useless at that point.
    Decimal.set({ precision: Math.floor(precision * 1.45) });

    // The length of the coefficient is just the precision
    const n = precision;
    const coeffs = calcCoeffs(n);
    let accm = coeffs[0];
    for (let k = 1; k < n; k++) {
        accm = accm.plus(coeffs[k].div(x.plus(k)));
    }
    accm = accm.times(Decimal.exp(x.plus(n).neg())).times(Decimal.pow(x.plus(n), x.plus(0.5)));
    // Reset the precision
    Decimal.set({ precision: precision });

    const result = accm.div(x);

    // Done
    return result;
}