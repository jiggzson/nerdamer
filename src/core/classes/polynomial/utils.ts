/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { isEqualArray } from "../../../utils/array";
import { inspectPolynomial, inspectTerm, printE } from "../../../utils/debug";
import { arrayAddUnique } from "../../functions/utils";
import { Expression } from "../parser/operations";
import { GroebnerBasis } from "./Groebner";
import { Ordering, PolyType, Polynomial, Term } from "./Polynomial";


/**
 * Divides a polynomial by given list of divisors
 * See - Ideals Varieties and Algorithms 4th ed. p.81
 * 
 * @param Fs The array of divisors
 * @param g The dividend
 * @param ordering The ordering to be used (optional).
 * @returns 
 */
export function polyDiv(Fs: PolyType[], g: PolyType, ordering?: Ordering, variables?: string[]): [Expression[], Expression] {
    // console.log(Fs.toString(), g.toString())
    // Make a collection of all the variables in this set
    let vars: string[] = [];
    // The collection of q's to be returned
    const qArray: Expression[] = Fs.map((f) => { return Expression.Number('0') });
    let r: Expression = Expression.Number('0');
    // Convert to Polynomials
    const F = Fs.map((f) => Polynomial.toPolynomial(f, ordering, variables));
    let p = Polynomial.toPolynomial(g, ordering, variables);
    let iter = 0;
    const maxIter = Fs.length * 1000;
    // Begin
    while (!p.isZero()) {
        if (iter++ > maxIter) {
            throw new Error('Maximum iterations reached');
        }
        let divisionOccurred = false;
        const s = F.length;
        let i = 0; // Use zero since TS arrays are zero based
        while (i < s && !divisionOccurred) {
            const fi = F[i];
            const fiLT = fi.LT();
            const fp = fi.minus(fiLT);
            const pLT = p.LT();

            if (fiLT.divides(pLT)) {
                const q = pLT.div(fiLT);
                qArray[i] = qArray[i].plus(q.getExpression());
                // Guarantees a reduction at each step
                p = p.minus(fi.times(q)).order();
                // p = p.minus(pLT).minus(fp.times(q)).order();
                divisionOccurred = true;
            }
            else {
                i++;
            }
        }

        const pLT = p.LT();
        if (!divisionOccurred) {
            r = r.plus(pLT.getExpression());
            p = p.minus(pLT);
        }
    }

    return [qArray, r];
}

/**
 * Divides one polynomial by another
 * 
 * @param f The dividend
 * @param g The divisor
 * @param ordering The ordering to be used (optional).
 * @returns [The quotient, The remainder]
 */
export function divide(f: PolyType, g: PolyType, ordering?: Ordering, variables?: string[]) {
    const p = Polynomial.toPolynomial(f, ordering, variables);
    const q = Polynomial.toPolynomial(g, ordering, variables);
    const [quo, rem] = polyDiv([q], p, ordering);

    return [quo[0], rem];
}

/**
 * Computes the S-Polynomial given two polynomials
 * 
 * @param f 
 * @param g 
 * @param ordering 
 * @param variables 
 * @returns 
 */
export function S(f: PolyType, g: PolyType, ordering?: Ordering, variables?: string[]) {
    const p = Polynomial.toPolynomial(f, ordering, variables);
    const q = Polynomial.toPolynomial(g, ordering, variables);
    const pLT = p.LT();
    const qLT = q.LT();
    const xg = pLT.LCM(qLT);

    return p.times(xg.div(pLT)).minus(q.times(xg.div(qLT)));
}


/**
 * Combines all the variables of a set of polynomials
 * 
 * @param F 
 * @returns 
 */
export function combinePolynomialVariables(F: Polynomial[]) {
    let variables: string[] = [];
    F.forEach((f) => {
        variables = arrayAddUnique(variables, f.variables);
    });
    variables.sort();
    return variables;
}

/**
 * Calculates the polynomial modulus of two polynomials as f mod g
 * 
 * @param f 
 * @param g 
 * @param ordering 
 * @param variables 
 * @returns 
 */
export function polyMod(f: PolyType, g: PolyType, ordering?: Ordering, variables?: string[]) {
    let r = new Polynomial('0');
    let p = Polynomial.toPolynomial(f, ordering, variables);
    const q = Polynomial.toPolynomial(g, ordering, variables);

    while (!p.isZero() && !q.divides(p)) {
        const LT = p.LT();
        p = p.minus(LT);
        r = r.plus(LT);
    }

    const [quo, rem] = divide(p, q);

    return r.plus(new Polynomial(rem)).order(ordering);
}

export function maxCommonVariableOccurrence(f: PolyType, g: PolyType) {
    const a = Polynomial.toPolynomial(f).maxVariableFrequency();
    const b = Polynomial.toPolynomial(g).maxVariableFrequency();

    // At this point any variable will do as long as it occurs in both a and b
    for (let x in a) {
        if (x in b) {
            return x;
        }
    }
}

/**
 * Convert number to polynomial form. 
 * e.g. polynomialFromNumber (89, 1) = [8, 9] = 8*x+9
 * e.g. polynomialFromNumber (89, 2) = [1, -1, -1] = x^2-x-1
 * Try (x+4)(x+5)
 * 
 * @param n The number
 * @param p The power of the lead monomial
 * @param base The base to use for the polynomial. Default = 10
 * @returns 
 */
export function polynomialFromNumber(n: number, p: number, base: number = 10) {
    const remainder = function (a: number, b: number) {
        return Math.abs(a) < Math.abs(b) ? -(b % a) : a % b;
    }

    const coeffs: number[] = [];

    for (let i = p; i >= 0; i--) {
        // Calculate the base
        const m = base ** i;
        // console.log(`m: ${m}, n: ${n}`)
        // Get the mod. This will be negative if the
        const rem = remainder(n, m);
        const d = n - rem;

        const coeff = d / m;

        // Avoid fractions as coefficients
        if (Math.abs(d) < Math.abs(m)) {
            coeffs.push(0);
        }
        else {
            // console.log(`d: ${d}, rem: ${rem}, n: ${n}, coeff: ${coeff}`)
            // Push the coefficient
            coeffs.push(coeff);
            // Point to the remainder as the new number
            n = rem;
        }
    }

    return coeffs;
}