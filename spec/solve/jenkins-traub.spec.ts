import Decimal from 'decimal.js';

import { Complex } from '../../src/core/classes/complex/Complex';

import { calculateScalars, jenkinsTraubRoots, nextK, noShift, quadraticDivide, quadraticRoots, realShift, rootLowerBound } from '../../src/solve/jenkinsTraub';

describe('Jenkins–Traub Decimal primitives', () => {
    test('quadratic synthetic division recovers exact real factor', () => {
        // (x^2 + 1)(x^2 - 3x + 2)
        const coeffs = [1, -3, 3, -3, 2].map(String).map(n => new Decimal(n));
        const result = quadraticDivide(coeffs, new Decimal(0), new Decimal(1));

        expect(result.quotient.map(x => x.toString())).toEqual(['1', '-3', '2']);
        expect(result.linear.isZero()).toBe(true);
        expect(result.constant.isZero()).toBe(true);
    });

    test('division returns linear and constant remainder', () => {
        // x^3 + 2 divided by x^2 + 1 gives x and remainder -x + 2
        const result = quadraticDivide(
            [1, 0, 0, 2].map(n => new Decimal(n)),
            new Decimal(0),
            new Decimal(1)
        );
        expect(result.quotient.map(x => x.toString())).toEqual(['1', '0']);
        expect(result.linear.toString()).toBe('-1');
        expect(result.constant.toString()).toBe('2');
    });

    test('quadratic roots include conjugates', () => {
        const roots = quadraticRoots(new Decimal(1), new Decimal(0), new Decimal(1));
        expect(roots.map(root => root.re.toString())).toEqual(['0', '0']);
        expect(roots.map(root => root.im.toString())).toEqual(['1', '-1']);
    });

    test('large and small roots do not cancel', () => {
        const original = Decimal.precision;
        try {
            Decimal.set({ precision: 40 });
            const roots = quadraticRoots(
                new Decimal(1),
                new Decimal('1000000000000'),
                new Decimal(1)
            );
            expect(roots[0].re.abs().gt('1e11')).toBe(true);
            expect(roots[1].re.abs().lt('1e-11')).toBe(true);
            expect(roots[0].re.times(roots[1].re).minus(1).abs().lt('1e-20')).toBe(true);
        } finally {
            Decimal.set({ precision: original });
        }
    });
    test('five no-shift recurrences for x^3 - 1', () => {
        const result = noShift(
            [1, 0, 0, -1].map(n => new Decimal(n)),
            new Decimal('1e-20')
        );
        expect(result.map(x => x.toString())).toEqual(['0', '0', '1']);
    });

    test('root-modulus lower bound for x^3 - 1', () => {
        const bound = rootLowerBound([1, 0, 0, -1].map(n => new Decimal(n)));
        expect(bound.minus(1).abs().lt('0.01')).toBe(true);
    });

    test('root-modulus lower bound scales with the polynomial', () => {
        const bound = rootLowerBound([1, 0, 0, -8].map(n => new Decimal(n)));
        expect(bound.minus(2).abs().lt('0.02')).toBe(true);
    });

    test('no-shift stage rejects an unremoved zero root', () => {
        expect(() => noShift(
            [1, 0, 0, 0].map(n => new Decimal(n)),
            new Decimal('1e-20')
        )).toThrow(RangeError);
    });
    test('exact quadratic K factor triggers unscaled recurrence', () => {
        const k = [1, 0, 1, 0].map(n => new Decimal(n));
        const scalars = calculateScalars(
            k, new Decimal(0), new Decimal(1),
            new Decimal(0), new Decimal(0), new Decimal('1e-20')
        );
        expect(scalars.type).toBe(3);
        const polynomial = [1, 0, 2, 0, 1].map(n => new Decimal(n));
        const divided = quadraticDivide(polynomial, new Decimal(0), new Decimal(1));
        const next = nextK(
            k, divided.workspace, scalars,
            new Decimal(0), new Decimal(0), new Decimal('1e-20')
        );
        expect(next.map(x => x.toString())).toEqual(['0', '0', '1', '0']);
    });
    test('real variable shift accepts an exact real root', () => {
        const polynomial = [1, 0, 0, -1].map(n => new Decimal(n));
        const result = realShift(
            polynomial, noShift(polynomial, new Decimal('1e-20')),
            new Decimal(1), new Decimal('1e-20')
        );
        expect(result.root?.toString()).toBe('1');
        expect(result.quotient?.map(n => n.toString())).toEqual(['1', '1', '1']);
    });

    test('RPOLY returns all roots for a real cubic', () => {
        const roots = jenkinsTraubRoots(
            [1, -6, 11, -6].map(n => new Decimal(n))
        );
        expect(roots).not.toBeNull();
        expect(roots).toHaveLength(3);
        const values = roots!.map(root => root.re).sort((a, b) => a.comparedTo(b));
        for (let i = 0; i < values.length; i++) {
            expect(values[i].minus(i + 1).abs().lt('1e-8')).toBe(true);
        }
        for (const root of roots!) {
            expect(root.im.abs().lt('1e-8')).toBe(true);
        }
    });

    test('RPOLY finds complex conjugate roots', () => {
        const roots = jenkinsTraubRoots(
            [1, 0, 0, 0, 1].map(n => new Decimal(n))
        );
        expect(roots).not.toBeNull();
        expect(roots).toHaveLength(4);
        for (const root of roots!) {
            const squared = root.times(root);
            const fourth = squared.times(squared);
            expect(fourth.plus(new Complex(1, 0)).abs().lt('1e-8')).toBe(true);
        }
    });

    test('RPOLY preserves exact roots at the origin', () => {
        const roots = jenkinsTraubRoots([1, -1, 0, 0].map(n => new Decimal(n)));
        expect(roots).not.toBeNull();
        expect(roots).toHaveLength(3);
        expect(roots!.filter(root => root.re.isZero() && root.im.isZero())).toHaveLength(2);
    });
});
