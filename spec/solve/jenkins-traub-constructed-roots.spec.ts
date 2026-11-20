import Decimal from 'decimal.js';

import { Complex } from '../../src/core/classes/complex/Complex';
import { jenkinsTraubRoots } from '../../src/solve/jenkinsTraub';

/**
 * Deterministic, independently known-root cases. The constructed polynomial
 * has exact integer coefficients before the optional power-of-ten scaling.
 * No comparison against Aberth is required to determine correctness.
 */
describe('Jenkins–Traub constructed-root regressions', () => {
    const scales = ['1e-3', '1', '1e3'];
    const realRoots = [-7, -5, -3, -1, 2, 4, 6, 8];
    const complexPairs = [
        { re: -4, im: 1 }, { re: -2, im: 3 },
        { re: 1, im: 2 }, { re: 3, im: 4 },
    ];

    function multiply(coefficients: Decimal[], factor: Decimal[]): Decimal[] {
        const product = Array.from(
            { length: coefficients.length + factor.length - 1 },
            () => new Decimal(0)
        );
        for (let i = 0; i < coefficients.length; i++) {
            for (let j = 0; j < factor.length; j++) {
                product[i + j] = product[i + j].plus(coefficients[i].times(factor[j]));
            }
        }
        return product;
    }

    // Avoid matching only to the nearest root: remove each matched reference
    // so a duplicate candidate cannot conceal a missing distinct root.
    function assertMatched(actual: Complex[], expected: Complex[]): void {
        expect(actual).toHaveLength(expected.length);
        const remaining = expected.slice();
        for (const candidate of actual) {
            let nearest = -1;
            let distance = new Decimal(Infinity);
            for (let i = 0; i < remaining.length; i++) {
                const current = candidate.minus(remaining[i]).abs();
                if (current.lt(distance)) {
                    nearest = i;
                    distance = current;
                }
            }
            expect(nearest).toBeGreaterThanOrEqual(0);
            expect(distance.lt('1e-7')).toBe(true);
            remaining.splice(nearest, 1);
        }
        expect(remaining).toHaveLength(0);
    }

    // 48 reproducible inputs: degrees 3–10, two root configurations per
    // degree, and three coefficient magnitudes.
    for (let degree = 3; degree <= 10; degree++) {
        for (let variant = 0; variant < 2; variant++) {
            for (const scale of scales) {
                it(`solves degree ${degree}, configuration ${variant}, scale ${scale}`, () => {
                    const expected: Complex[] = [];
                    let coefficients = [new Decimal(1)];
                    let slots = degree;
                    let index = variant;

                    // Always include a conjugate pair for mixed-real/complex
                    // coverage at degrees at least four.
                    if (degree >= 4) {
                        const pair = complexPairs[(degree + variant) % complexPairs.length];
                        coefficients = multiply(coefficients, [
                            new Decimal(1), new Decimal(-2 * pair.re),
                            new Decimal(pair.re * pair.re + pair.im * pair.im),
                        ]);
                        expected.push(
                            new Complex(pair.re, pair.im),
                            new Complex(pair.re, -pair.im)
                        );
                        slots -= 2;
                    }

                    while (slots > 0) {
                        const value = realRoots[(degree + index) % realRoots.length];
                        index += 3;
                        coefficients = multiply(coefficients, [
                            new Decimal(1), new Decimal(-value),
                        ]);
                        expected.push(new Complex(value, 0));
                        slots--;
                    }

                    // Scaling all coefficients does not change any roots.
                    const input = coefficients.map(value => value.times(scale));
                    const original = Decimal.precision;
                    try {
                        Decimal.set({ precision: 50 });
                        const result = jenkinsTraubRoots(input);
                        expect(result).not.toBeNull();
                        assertMatched(result!, expected);
                    } finally {
                        Decimal.set({ precision: original });
                    }
                });
            }
        }
    }
});
