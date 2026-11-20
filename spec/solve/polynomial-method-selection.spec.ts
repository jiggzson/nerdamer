import Decimal from 'decimal.js';

import { PolynomialSolver } from '../../src/solve/classes/PolynomialSolver';

describe('Polynomial method selection', () => {
    it('preserves the default Aberth result', () => {
        const solver = new PolynomialSolver('x^5-x+1', 'x');
        const defaultRoots = solver.roots(false);
        const aberthRoots = solver.roots(false, 'aberth');
        expect(defaultRoots).toHaveLength(5);
        expect(defaultRoots.map(root => root.re.toString() + ':' + root.im.toString()))
            .toEqual(aberthRoots.map(root => root.re.toString() + ':' + root.im.toString()));
    });

    it('returns all roots with explicit Jenkins–Traub selection', () => {
        const solver = new PolynomialSolver('x^3-6*x^2+11*x-6', 'x');
        const roots = solver.roots(false, 'jenkinsTraub');
        expect(roots).toHaveLength(3);
        const values = roots.map(root => root.re).sort((a, b) => a.comparedTo(b));
        for (let i = 0; i < values.length; i++) {
            expect(values[i].minus(i + 1).abs().lt('1e-12')).toBe(true);
        }
        expect(roots.every(root => root.im.isZero())).toBe(true);
        expect(solver.validatedRoots(false, 'jenkinsTraub')).toHaveLength(3);
        expect(solver.roots(true, 'jenkinsTraub')).toHaveLength(3);
    });

    it('preserves exact repeated-root preprocessing for both methods', () => {
        for (const method of ['aberth', 'jenkinsTraub'] as const) {
            const solver = new PolynomialSolver('(x-1)^5*(x+1)^4', 'x');
            const roots = solver.validatedRoots(false, method);
            expect(roots).toHaveLength(9);
            expect(roots.filter(root => root.re.eq(1) && root.im.isZero())).toHaveLength(5);
            expect(roots.filter(root => root.re.eq(-1) && root.im.isZero())).toHaveLength(4);
        }
    });

    it('propagates Jenkins–Traub through integer square-free factors', () => {
        // The factor is cubic, so it must invoke the selected numerical method.
        const rootsMethod = jest.spyOn(PolynomialSolver.prototype, 'roots');
        try {
            const solver = new PolynomialSolver('(x^3-x+1)^2', 'x');
            const roots = solver.roots(false, 'jenkinsTraub');
            expect(roots).toHaveLength(6);
            const numericCalls = (rootsMethod.mock.calls as unknown[][])
                .filter(call => call[0] === false);
            expect(numericCalls.length).toBeGreaterThan(1);
            expect(numericCalls.every(call => call[1] === 'jenkinsTraub')).toBe(true);
        } finally {
            rootsMethod.mockRestore();
        }
    });

    it('rejects complex coefficients rather than silently switching methods', () => {
        const solver = new PolynomialSolver('(x-(1+i))^3', 'x');
        expect(() => solver.roots(false, 'jenkinsTraub')).toThrow();
        expect(solver.roots(false)).toHaveLength(3);
    });

    it('rescales a small-root polynomial without switching algorithms', () => {
        const solver = new PolynomialSolver('x^7-1e-35*x', 'x');
        const original = Decimal.precision;
        const roots = solver.roots(false, 'jenkinsTraub');
        expect(Decimal.precision).toBe(original);
        expect(roots).toHaveLength(7);
        expect(roots.filter(root => root.re.isZero() && root.im.isZero())).toHaveLength(1);
        // Nonzero roots satisfy x^6 = 1e-35. Checking their modulus
        // independently avoids relying solely on polynomial residuals.
        const radius = new Decimal('1e-35').pow(new Decimal(1).div(6));
        for (const root of roots.filter(root => !root.re.isZero() || !root.im.isZero())) {
            expect(root.abs().minus(radius).abs().div(radius).lt('1e-10')).toBe(true);
        }
        expect(solver.roots(false)).toHaveLength(7);
    });
    it('rescales a large-root polynomial without losing complex roots', () => {
        const solver = new PolynomialSolver('x^5-1e30', 'x');
        const original = Decimal.precision;
        const roots = solver.roots(false, 'jenkinsTraub');
        expect(Decimal.precision).toBe(original);
        expect(roots).toHaveLength(5);
        const radius = new Decimal('1e6');
        for (const root of roots) {
            expect(root.abs().minus(radius).abs().div(radius).lt('1e-10')).toBe(true);
        }
    });

});
