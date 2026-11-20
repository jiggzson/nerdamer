import Decimal from 'decimal.js';

import { Complex } from '../core/classes/complex/Complex';
import { message } from '../core/errors';

/**
 * Jenkins–Traub RPOLY primitives.
 *
 * Coefficients are in descending order. These routines use Decimal arithmetic;
 * no native-number numerical iterations are performed.
 *
 * Reference: Jenkins (1975), ACM Algorithm 493 (RPOLY), as maintained in
 * https://github.com/jacobwilliams/polyroots-fortran.
 *
 * The complete real-coefficient driver is available as an explicitly selected
 * alternative to Aberth for polynomials with real coefficients.
 */

/** Divides a real polynomial by x^2 + u*x + v using synthetic division. */
export function quadraticDivide(coeffs: Decimal[], u: Decimal, v: Decimal): {
    quotient: Decimal[];
    workspace: Decimal[];
    linear: Decimal;
    constant: Decimal;
} {
    if (coeffs.length < 3) {
        throw new RangeError(message('wrongInput', { expected: 'a polynomial of degree at least two', received: 'Jenkins–Traub input' }));
    }

    const values: Decimal[] = [coeffs[0]];
    values.push(coeffs[1].minus(u.times(values[0])));

    for (let i = 2; i < coeffs.length; i++) {
        values.push(
            coeffs[i].minus(u.times(values[i - 1])).minus(v.times(values[i - 2]))
        );
    }

    return {
        quotient: values.slice(0, -2),
        workspace: values,
        linear: values[values.length - 2],
        constant: values[values.length - 1],
    };
}

/**
 * Numerically stable quadratic roots for real coefficients.
 * Uses the large root and product relation for real roots to avoid
 * catastrophic cancellation, as in RPOLY's quad routine.
 */
export function quadraticRoots(a: Decimal, b: Decimal, c: Decimal): [Complex, Complex] {
    const zero = new Decimal(0);
    if (a.isZero()) {
        throw new RangeError(message('wrongInput', { expected: 'a nonzero quadratic leading coefficient', received: 'Jenkins–Traub input' }));
    }
    if (c.isZero()) {
        return [new Complex(zero, zero), new Complex(b.neg().div(a), zero)];
    }

    const half = b.div(2);
    const discriminant = half.times(half).minus(a.times(c));

    if (discriminant.isNegative()) {
        const real = half.neg().div(a);
        const imaginary = discriminant.neg().sqrt().div(a.abs());
        return [new Complex(real, imaginary), new Complex(real, imaginary.neg())];
    }

    const root = discriminant.sqrt();
    const large = (half.isNegative() ? half.neg().plus(root) : half.neg().minus(root)).div(a);
    if (large.isZero()) {
        // The discriminant and b both vanish at the active precision.
        const repeated = half.neg().div(a);
        return [new Complex(repeated, zero), new Complex(repeated, zero)];
    }

    const small = c.div(a.times(large));
    return [new Complex(large, zero), new Complex(small, zero)];
}

/**
 * Establishes the RPOLY K polynomial from the normalized derivative, followed
 * by five no-shift recurrences. This is stage one of Jenkins–Traub.
 *
 * The input is not mutated. The trailing coefficient must be nonzero: RPOLY
 * extracts exact roots at the origin before this stage.
 */
export function noShift(coeffs: Decimal[], epsilon: Decimal): Decimal[] {
    const degree = coeffs.length - 1;
    if (degree < 3 || coeffs[0].isZero() || coeffs[degree].isZero()) {
        throw new RangeError(message('wrongInput', { expected: 'degree at least three with nonzero leading and constant coefficients', received: 'Jenkins–Traub input' }));
    }
    if (!epsilon.gt(0)) {
        throw new RangeError(message('wrongInput', { expected: 'a positive numerical tolerance', received: 'Jenkins–Traub input' }));
    }

    const k = coeffs.slice(0, degree).map((value, i) =>
        value.times(degree - i).div(degree)
    );
    const constant = coeffs[degree];
    const adjacent = coeffs[degree - 1];
    let unscaled = k[degree - 1].isZero();

    for (let step = 0; step < 5; step++) {
        const last = k[degree - 1];
        if (unscaled) {
            for (let i = degree - 1; i > 0; i--) {
                k[i] = k[i - 1];
            }
            k[0] = new Decimal(0);
            unscaled = k[degree - 1].isZero();
        } else {
            const factor = constant.neg().div(last);
            for (let i = degree - 1; i > 0; i--) {
                k[i] = factor.times(k[i - 1]).plus(coeffs[i]);
            }
            k[0] = coeffs[0];
            unscaled = k[degree - 1].abs().lte(adjacent.abs().times(epsilon).times(10));
        }
    }
    return k;
}

/** Evaluate a real polynomial with descending coefficients. */
function evaluateReal(coeffs: Decimal[], x: Decimal): Decimal {
    let value = coeffs[0];
    for (let i = 1; i < coeffs.length; i++) {
        value = value.times(x).plus(coeffs[i]);
    }
    return value;
}

/**
 * Computes the RPOLY positive lower bound for the modulus of each nonzero root.
 * The last entry of the auxiliary polynomial is negated, and its positive
 * zero is located by bracketing and Newton iteration.
 *
 * Iteration caps convert unexpected nonconvergence into an explicit failure.
 */
export function rootLowerBound(coeffs: Decimal[]): Decimal {
    const degree = coeffs.length - 1;
    if (degree < 1 || coeffs[0].isZero() || coeffs[degree].isZero()) {
        throw new RangeError(message('wrongInput', { expected: 'a polynomial with nonzero leading and constant coefficients', received: 'Jenkins–Traub input' }));
    }

    const absolute = coeffs.map(c => c.abs());
    const last = absolute[degree];
    const lead = absolute[0];
    let x = last.div(lead).pow(new Decimal(1).div(degree));
    if (!absolute[degree - 1].isZero()) {
        x = Decimal.min(x, last.div(absolute[degree - 1]));
    }
    if (!x.isFinite() || x.lte(0)) {
        throw new RangeError(message('resultOutOfRange'));
    }

    const auxiliary = absolute.slice();
    auxiliary[degree] = last.neg();
    let lower = x;
    let bracketed = false;

    for (let step = 0; step < 1000; step++) {
        lower = x.div(10);
        if (evaluateReal(auxiliary, lower).lte(0)) {
            bracketed = true;
            break;
        }
        x = lower;
    }
    if (!bracketed) {
        throw new RangeError(message('polynomialMaximumIterations'));
    }

    const tolerance = new Decimal('0.005');
    for (let step = 0; step < 100; step++) {
        let value = auxiliary[0];
        let derivative = auxiliary[0];
        for (let i = 1; i < degree; i++) {
            value = value.times(x).plus(auxiliary[i]);
            derivative = derivative.times(x).plus(value);
        }
        value = value.times(x).plus(auxiliary[degree]);

        if (derivative.isZero()) {
            throw new RangeError(message('resultOutOfRange'));
        }
        const dx = value.div(derivative);
        const next = x.minus(dx);
        if (!next.isFinite() || next.lte(0)) {
            throw new RangeError(message('resultOutOfRange'));
        }
        x = next;
        if (dx.abs().div(x).lte(tolerance)) {
            return x;
        }
    }
    throw new RangeError(message('polynomialMaximumIterations'));
}

/** Scalars used by the fixed- and variable-shift K recurrences. */
export interface ShiftScalars {
    type: 1 | 2 | 3;
    a1: Decimal;
    a3: Decimal;
    a7: Decimal;
    c: Decimal;
    d: Decimal;
    e: Decimal;
    f: Decimal;
    g: Decimal;
    h: Decimal;
    quotient: Decimal[];
}

const ZERO = new Decimal(0);

/** RPOLY calcsc: determine recurrence scaling from quadratic division of K. */
export function calculateScalars(
    k: Decimal[], u: Decimal, v: Decimal,
    a: Decimal, b: Decimal, epsilon: Decimal
): ShiftScalars {
    const degree = k.length;
    if (degree < 3) {
        throw new RangeError(message('wrongInput', { expected: 'a K polynomial of degree at least two', received: 'Jenkins–Traub input' }));
    }
    const division = quadraticDivide(k, u, v);
    const c = division.constant;
    const d = division.linear;
    const empty = {
        a1: ZERO, a3: ZERO, a7: ZERO, c, d,
        e: ZERO, f: ZERO, g: ZERO, h: ZERO,
        quotient: division.quotient,
    };

    if (
        c.abs().lte(k[degree - 1].abs().times(epsilon).times(100)) &&
        d.abs().lte(k[degree - 2].abs().times(epsilon).times(100))
    ) {
        return { type: 3, ...empty };
    }

    const h = v.times(b);
    if (d.abs().gte(c.abs())) {
        const e = a.div(d);
        const f = c.div(d);
        const g = u.times(b);
        return {
            type: 2,
            ...empty,
            e, f, g, h,
            a3: e.times(g.plus(a)).plus(h.times(b.div(d))),
            a1: a.neg().plus(f.times(b)),
            a7: h.plus(f.plus(u).times(a)),
        };
    }

    const e = a.div(c);
    const f = d.div(c);
    const g = e.times(u);
    return {
        type: 1,
        ...empty,
        e, f, g, h,
        a3: e.times(a).plus(g.plus(h.div(c)).times(b)),
        a1: a.times(f).neg().plus(b),
        a7: g.times(d).plus(h.times(f)).plus(a),
    };
}

/** RPOLY nextk: calculate the next K polynomial without modifying its input. */
export function nextK(
    k: Decimal[], quotient: Decimal[], scalars: ShiftScalars,
    a: Decimal, b: Decimal, epsilon: Decimal
): Decimal[] {
    const degree = k.length;
    if (quotient.length !== degree + 1) {
        throw new RangeError(message('wrongInput', { expected: 'a complete quadratic synthetic-division workspace', received: 'Jenkins–Traub input' }));
    }
    if (scalars.type === 3) {
        return [ZERO, ZERO, ...scalars.quotient];
    }

    const scale = scalars.type === 1 ? b : a;
    const scaled = scalars.a1.abs().gt(scale.abs().times(epsilon).times(10));
    const a7 = scaled ? scalars.a7.div(scalars.a1) : scalars.a7;
    const a3 = scaled ? scalars.a3.div(scalars.a1) : scalars.a3;
    const next = new Array<Decimal>(degree);

    next[0] = scaled ? quotient[0] : ZERO;
    next[1] = quotient[0].times(a7).neg().plus(scaled ? quotient[1] : ZERO);
    for (let i = 2; i < degree; i++) {
        next[i] = quotient[i - 1].times(a7).neg()
            .plus(scalars.quotient[i - 2].times(a3))
            .plus(scaled ? quotient[i] : ZERO);
    }
    return next;
}

/** RPOLY newest: estimate quadratic coefficients from the K recurrence. */
export function estimateQuadratic(
    k: Decimal[], polynomial: Decimal[], u: Decimal, v: Decimal,
    a: Decimal, b: Decimal, scalars: ShiftScalars
): { u: Decimal; v: Decimal } {
    if (scalars.type === 3) {
        return { u: ZERO, v: ZERO };
    }
    const degree = k.length;
    const { a1, a3, a7, c, d, f, g, h } = scalars;
    const a4 = scalars.type === 1
        ? a.plus(u.times(b)).plus(h.times(f))
        : a.plus(g).times(f).plus(h);
    const a5 = scalars.type === 1
        ? c.plus(u.plus(v.times(f)).times(d))
        : f.plus(u).times(c).plus(v.times(d));

    const b1 = k[degree - 1].neg().div(polynomial[degree]);
    const b2 = k[degree - 2].plus(b1.times(polynomial[degree - 1]))
        .neg().div(polynomial[degree]);
    const c1 = v.times(b2).times(a1);
    const c2 = b1.times(a7);
    const c3 = b1.times(b1).times(a3);
    const c4 = c2.plus(c3).neg().plus(c1);
    const denominator = c4.neg().plus(a5).plus(b1.times(a4));

    if (denominator.isZero()) {
        return { u: ZERO, v: ZERO };
    }
    return {
        u: u.minus(
            u.times(c3.plus(c2))
                .plus(v.times(b1.times(a1).plus(b2.times(a7))))
                .div(denominator)
        ),
        v: v.times(new Decimal(1).plus(c4.div(denominator))),
    };
}

/** Outcome of the RPOLY variable-shift real-root iteration. */
export interface RealShiftResult {
    root?: Decimal;
    quotient?: Decimal[];
    /** The real iteration stalled near a possible root pair. */
    cluster: boolean;
    estimate: Decimal;
}

/**
 * RPOLY realit: test a real root, update the K polynomial and shift, and
 * report near-real-axis clustering to the fixed-shift controller.
 *
 * A failed attempt does not authorize deflation. The caller must restore the
 * saved K polynomial before trying another shift.
 */
export function realShift(
    polynomial: Decimal[], initial: Decimal[], start: Decimal, epsilon: Decimal
): RealShiftResult {
    const degree = polynomial.length - 1;
    if (degree < 3 || initial.length !== degree || !epsilon.gt(0)) {
        throw new RangeError(message('wrongInput', { expected: 'matching real-shift polynomial, K polynomial and positive tolerance', received: 'Jenkins–Traub input' }));
    }

    let k = initial.slice();
    let shift = start;
    let previousResidual = ZERO;
    let previousStep = ZERO;

    for (let iteration = 0; iteration <= 10; iteration++) {
        const quotient: Decimal[] = [polynomial[0]];
        for (let i = 1; i <= degree; i++) {
            quotient.push(quotient[i - 1].times(shift).plus(polynomial[i]));
        }
        const residual = quotient[degree];
        const size = shift.abs();
        let error = quotient[0].abs().div(2);
        for (let i = 1; i <= degree; i++) {
            error = error.times(size).plus(quotient[i].abs());
        }

        // The bound is relative to the polynomial's evaluated terms.
        if (residual.abs().lte(
            epsilon.times(20).times(error.times(2).minus(residual.abs()))
        )) {
            return { root: shift, quotient: quotient.slice(0, degree), cluster: false, estimate: shift };
        }
        if (iteration === 10) {
            break;
        }

        if (
            iteration > 1 &&
            previousStep.abs().lte(shift.minus(previousStep).abs().times('0.001')) &&
            residual.abs().gt(previousResidual)
        ) {
            return { cluster: true, estimate: shift };
        }
        previousResidual = residual.abs();

        const kValues: Decimal[] = [k[0]];
        for (let i = 1; i < degree; i++) {
            kValues.push(kValues[i - 1].times(shift).plus(k[i]));
        }
        const kValue = kValues[degree - 1];
        const lastK = k[degree - 1].abs().times(epsilon).times(10);
        const factor = kValue.abs().gt(lastK) ? residual.neg().div(kValue) : ZERO;

        if (kValue.abs().gt(lastK)) {
            k = [quotient[0]];
            for (let i = 1; i < degree; i++) {
                k.push(factor.times(kValues[i - 1]).plus(quotient[i]));
            }
        } else {
            k = [ZERO, ...kValues.slice(0, degree - 1)];
        }

        const updatedK = evaluateReal(k, shift);
        previousStep = updatedK.abs().gt(k[degree - 1].abs().times(epsilon).times(10))
            ? residual.neg().div(updatedK)
            : ZERO;
        shift = shift.plus(previousStep);
        if (!shift.isFinite()) {
            break;
        }
    }

    return { cluster: false, estimate: shift };
}

/** Successful quadratic-shift factor and its degree-two deflation quotient. */
export interface QuadraticShiftResult {
    roots: [Complex, Complex];
    quotient: Decimal[];
    u: Decimal;
    v: Decimal;
}

/**
 * RPOLY quadit: attempt variable shifts for an equimodular root pair.
 * A nonconvergent or unequal-modulus quadratic returns null, leaving the
 * fixed-shift controller free to try a real iteration or another shift.
 */
export function quadraticShift(
    polynomial: Decimal[], initial: Decimal[],
    startU: Decimal, startV: Decimal, epsilon: Decimal
): QuadraticShiftResult | null {
    const degree = polynomial.length - 1;
    if (degree < 3 || initial.length !== degree || !epsilon.gt(0)) {
        throw new RangeError(message('wrongInput', { expected: 'matching quadratic-shift polynomial, K polynomial and positive tolerance', received: 'Jenkins–Traub input' }));
    }

    let k = initial.slice();
    let u = startU;
    let v = startV;
    let previousResidual = ZERO;
    let previousStep = ZERO;
    let triedCluster = false;
    let iteration = 0;

    while (iteration <= 20) {
        const roots = quadraticRoots(new Decimal(1), u, v);
        const [small, large] = roots;
        if (
            small.re.abs().minus(large.re.abs()).abs()
                .gt(large.re.abs().times('0.01'))
        ) {
            return null;
        }
        const divided = quadraticDivide(polynomial, u, v);
        let a = divided.constant;
        let b = divided.linear;
        const real = small.re;
        const imaginary = small.im;
        const t = real.neg().times(b);
        const residual = a.plus(t).abs().plus(imaginary.times(b).abs());

        const radius = v.abs().sqrt();
        let error = divided.workspace[0].abs().times(2);
        for (let i = 1; i < degree; i++) {
            error = error.times(radius).plus(divided.workspace[i].abs());
        }
        error = error.times(radius).plus(a.plus(t).abs());
        error = error.times(9).plus(t.abs().times(2))
            .minus(a.plus(t).abs().plus(radius.times(b.abs())).times(7))
            .times(epsilon);

        if (residual.lte(error.times(20))) {
            return { roots, quotient: divided.quotient, u, v };
        }
        iteration++;
        if (iteration > 20) {
            return null;
        }

        if (
            iteration > 1 &&
            !triedCluster &&
            previousStep.lte('0.01') &&
            residual.gte(previousResidual)
        ) {
            const step = Decimal.max(previousStep, epsilon).sqrt();
            u = u.minus(u.times(step));
            v = v.plus(v.times(step));
            const nearby = quadraticDivide(polynomial, u, v);
            a = nearby.constant;
            b = nearby.linear;
            for (let i = 0; i < 5; i++) {
                const scalars = calculateScalars(k, u, v, a, b, epsilon);
                k = nextK(k, nearby.workspace, scalars, a, b, epsilon);
            }
            triedCluster = true;
            iteration = 0;
        }

        previousResidual = residual;
        const current = quadraticDivide(polynomial, u, v);
        a = current.constant;
        b = current.linear;
        let scalars = calculateScalars(k, u, v, a, b, epsilon);
        k = nextK(k, current.workspace, scalars, a, b, epsilon);
        scalars = calculateScalars(k, u, v, a, b, epsilon);
        const next = estimateQuadratic(k, polynomial, u, v, a, b, scalars);
        if (next.v.isZero() || !next.u.isFinite() || !next.v.isFinite()) {
            return null;
        }
        previousStep = next.v.minus(v).abs().div(next.v.abs());
        u = next.u;
        v = next.v;
    }
    return null;
}

/** A successfully extracted real root or conjugate/equimodular root pair. */
export interface ShiftFactor {
    roots: Complex[];
    quotient: Decimal[];
}

/**
 * RPOLY fxshfr: fixed quadratic shift with convergence-based selection
 * between real-root and quadratic variable-shift iterations.
 */
export function fixedShift(
    polynomial: Decimal[], initial: Decimal[],
    startReal: Decimal, radius: Decimal,
    maxSteps: number, epsilon: Decimal
): ShiftFactor | null {
    const degree = polynomial.length - 1;
    if (degree < 3 || initial.length !== degree) {
        throw new RangeError(message('wrongInput', { expected: 'matching fixed-shift polynomial and K polynomial', received: 'Jenkins–Traub input' }));
    }

    let k = initial.slice();
    const u = startReal.times(-2);
    const v = radius;
    const divided = quadraticDivide(polynomial, u, v);
    const a = divided.constant;
    const b = divided.linear;
    let scalars = calculateScalars(k, u, v, a, b, epsilon);
    let betaReal = new Decimal('0.25');
    let betaPair = new Decimal('0.25');
    let oldReal = startReal;
    let oldPair = v;
    let oldRealChange = new Decimal(1);
    let oldPairChange = new Decimal(1);

    for (let iteration = 0; iteration < maxSteps; iteration++) {
        k = nextK(k, divided.workspace, scalars, a, b, epsilon);
        scalars = calculateScalars(k, u, v, a, b, epsilon);
        const estimates = estimateQuadratic(k, polynomial, u, v, a, b, scalars);
        const real = k[degree - 1].isZero()
            ? ZERO
            : polynomial[degree].neg().div(k[degree - 1]);

        let pairChange = new Decimal(1);
        let realChange = new Decimal(1);
        if (iteration > 0 && scalars.type !== 3) {
            if (!estimates.v.isZero()) {
                pairChange = estimates.v.minus(oldPair).abs().div(estimates.v.abs());
            }
            if (!real.isZero()) {
                realChange = real.minus(oldReal).abs().div(real.abs());
            }
            const pairScore = pairChange.lt(oldPairChange)
                ? pairChange.times(oldPairChange)
                : new Decimal(1);
            const realScore = realChange.lt(oldRealChange)
                ? realChange.times(oldRealChange)
                : new Decimal(1);
            const tryPair = pairScore.lt(betaPair);
            const tryReal = realScore.lt(betaReal);

            if (tryPair || tryReal) {
                const saved = k.slice();
                let pairAttempted = false;
                let realAttempted = false;
                let nextU = estimates.u;
                let nextV = estimates.v;
                let nextReal = real;
                let realFirst = tryReal && (!tryPair || realScore.lt(pairScore));

                for (let attempt = 0; attempt < 3; attempt++) {
                    if (!realFirst && !pairAttempted) {
                        const pair = quadraticShift(
                            polynomial, saved, nextU, nextV, epsilon
                        );
                        if (pair) {
                            return { roots: [...pair.roots], quotient: pair.quotient };
                        }
                        pairAttempted = true;
                        betaPair = betaPair.times('0.25');
                    }

                    if (!realAttempted && tryReal) {
                        const single = realShift(polynomial, saved, nextReal, epsilon);
                        if (single.root !== undefined && single.quotient) {
                            return {
                                roots: [new Complex(single.root, ZERO)],
                                quotient: single.quotient,
                            };
                        }
                        realAttempted = true;
                        betaReal = betaReal.times('0.25');
                        if (single.cluster && !pairAttempted) {
                            nextReal = single.estimate;
                            nextU = nextReal.times(-2);
                            nextV = nextReal.times(nextReal);
                            realFirst = false;
                            continue;
                        }
                    }

                    if (tryPair && !pairAttempted) {
                        realFirst = false;
                        continue;
                    }
                    break;
                }
                // Failed variable-shift trials must not affect the fixed K shift.
                k = saved;
                scalars = calculateScalars(k, u, v, a, b, epsilon);
            }
        }
        oldPair = estimates.v;
        oldReal = real;
        oldPairChange = pairChange;
        oldRealChange = realChange;
    }
    return null;
}

/**
 * Complete RPOLY driver for real-coefficient polynomials.
 * Returns null if RPOLY fails to isolate every root; never returns a
 * partial root set as though it were complete.
 *
 * Working Decimal precision must be configured by the caller.
 */
export function jenkinsTraubRoots(
    coefficients: Decimal[], epsilon = new Decimal(10).pow(2 - Decimal.precision)
): Complex[] | null {
    return solveRpoly(coefficients, epsilon, true);
}

function solveRpoly(
    coefficients: Decimal[], epsilon: Decimal, allowScaling: boolean
): Complex[] | null {
    if (coefficients.length < 2 || coefficients[0].isZero() || !epsilon.gt(0)) {
        throw new RangeError(message('wrongInput', { expected: 'a real polynomial with nonzero leading coefficient and positive tolerance', received: 'Jenkins–Traub input' }));
    }

    const roots: Complex[] = [];
    let polynomial = coefficients.slice();
    const pi = Decimal.acos(-1);
    const angle = pi.times(94).div(180);
    const cosine = Decimal.cos(angle);
    const sine = Decimal.sin(angle);
    let x = new Decimal('0.5').sqrt();
    let y = x.neg();

    while (polynomial.length > 1) {
        const degree = polynomial.length - 1;
        if (polynomial[degree].isZero()) {
            roots.push(new Complex(ZERO, ZERO));
            polynomial.pop();
            continue;
        }
        if (degree === 1) {
            roots.push(new Complex(polynomial[1].neg().div(polynomial[0]), ZERO));
            break;
        }
        if (degree === 2) {
            roots.push(...quadraticRoots(polynomial[0], polynomial[1], polynomial[2]));
            break;
        }

        const radius = rootLowerBound(polynomial);
        // On extreme scales, the original fixed-shift search can exhaust
        // its full budget before rescaling. Try a unit-scale polynomial first;
        // keep the unscaled search available if it does not complete.
        if (allowScaling && (radius.lt('0.01') || radius.gt('100'))) {
            const leading = polynomial[0];
            const denominator = leading.times(radius.pow(degree));
            const scaled = polynomial.map((value, i) =>
                value.times(radius.pow(degree - i)).div(denominator)
            );
            const attempt = solveRpoly(scaled, epsilon, false);
            if (attempt !== null && attempt.length === degree) {
                roots.push(...attempt.map(root => new Complex(
                    root.re.times(radius), root.im.times(radius)
                )));
                return roots.length === coefficients.length - 1 ? roots : null;
            }
        }

        const initial = noShift(polynomial, epsilon);
        let factor: ShiftFactor | null = null;
        for (let attempt = 1; attempt <= 20; attempt++) {
            const nextX = cosine.times(x).minus(sine.times(y));
            y = sine.times(x).plus(cosine.times(y));
            x = nextX;
            factor = fixedShift(
                polynomial, initial, radius.times(x),
                radius, 20 * attempt, epsilon
            );
            if (factor) {
                break;
            }
        }
        if (!factor || !factor.roots.length) {
            return null;
        }
        roots.push(...factor.roots);
        polynomial = factor.quotient;
        if (polynomial.length !== degree + 1 - factor.roots.length) {
            return null;
        }
    }

    return roots.length === coefficients.length - 1 ? roots : null;
}
