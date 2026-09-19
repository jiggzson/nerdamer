import { sqcomp } from '../../src/algebra/utils';
import { Expression } from '../../src/core/classes/expression/Expression';
import { expand } from '../../src/core/functions/expand/expand';

function roundTrip(input: string, variable?: string) {
	const result = sqcomp(input, variable);
	const expanded = expand(result.expression);
	return expanded.eq(Expression.create(input));
}

describe('completeTheSquare', () => {
	describe('monic quadratics (a = 1)', () => {
		it('should handle x^2+6*x+1', () => {
			const { a, h, k } = sqcomp('x^2+6*x+1');
			expect(a.eq(1)).toBe(true);
			expect(h.eq(3)).toBe(true);
			expect(k.eq(-8)).toBe(true);
			expect(roundTrip('x^2+6*x+1')).toBe(true);
		});

		it('should handle x^2-4*x+7', () => {
			const { a, h, k } = sqcomp('x^2-4*x+7');
			expect(a.eq(1)).toBe(true);
			expect(h.eq(-2)).toBe(true);
			expect(k.eq(3)).toBe(true);
			expect(roundTrip('x^2-4*x+7')).toBe(true);
		});

		it('should handle perfect square x^2+2*x+1', () => {
			const { h, k } = sqcomp('x^2+2*x+1');
			expect(h.eq(1)).toBe(true);
			expect(k.eq(0)).toBe(true);
			expect(roundTrip('x^2+2*x+1')).toBe(true);
		});

		it('should handle perfect square x^2-10*x+25', () => {
			const { h, k } = sqcomp('x^2-10*x+25');
			expect(h.eq(-5)).toBe(true);
			expect(k.eq(0)).toBe(true);
			expect(roundTrip('x^2-10*x+25')).toBe(true);
		});

		it('should handle fractional h for x^2+3*x+1', () => {
			const { h, k } = sqcomp('x^2+3*x+1');
			expect(h.eq('3/2')).toBe(true);
			expect(k.eq('-5/4')).toBe(true);
			expect(roundTrip('x^2+3*x+1')).toBe(true);
		});
	});

	describe('non-monic quadratics (a ≠ 1)', () => {
		it('should handle 2*x^2+8*x+3', () => {
			const { a, h, k } = sqcomp('2*x^2+8*x+3');
			expect(a.eq(2)).toBe(true);
			expect(h.eq(2)).toBe(true);
			expect(k.eq(-5)).toBe(true);
			expect(roundTrip('2*x^2+8*x+3')).toBe(true);
		});

		it('should handle 3*x^2-12*x+7', () => {
			const { a, h, k } = sqcomp('3*x^2-12*x+7');
			expect(a.eq(3)).toBe(true);
			expect(h.eq(-2)).toBe(true);
			expect(k.eq(-5)).toBe(true);
			expect(roundTrip('3*x^2-12*x+7')).toBe(true);
		});

		it('should handle negative leading coefficient -x^2+4*x-1', () => {
			const { a, h, k } = sqcomp('-x^2+4*x-1');
			expect(a.eq(-1)).toBe(true);
			expect(h.eq(-2)).toBe(true);
			expect(k.eq(3)).toBe(true);
			expect(roundTrip('-x^2+4*x-1')).toBe(true);
		});
	});

	describe('missing terms', () => {
		it('should handle missing linear term: x^2-9', () => {
			const { h, k } = sqcomp('x^2-9');
			expect(h.eq(0)).toBe(true);
			expect(k.eq(-9)).toBe(true);
			expect(roundTrip('x^2-9')).toBe(true);
		});

		it('should handle missing constant term: x^2+4*x', () => {
			const { h, k } = sqcomp('x^2+4*x');
			expect(h.eq(2)).toBe(true);
			expect(k.eq(-4)).toBe(true);
			expect(roundTrip('x^2+4*x')).toBe(true);
		});
	});

	describe('symbolic coefficients', () => {
		it('should handle fully symbolic a*x^2+b*x+c', () => {
			expect(roundTrip('a*x^2+b*x+c', 'x')).toBe(true);
		});

		it('should handle partially symbolic x^2+a*x+1', () => {
			expect(roundTrip('x^2+a*x+1', 'x')).toBe(true);
		});
	});

	describe('variable detection', () => {
		it('should auto-detect variable t', () => {
			const { variable, h, k } = sqcomp('t^2+6*t+5');
			expect(variable).toBe('t');
			expect(h.eq(3)).toBe(true);
			expect(k.eq(-4)).toBe(true);
			expect(roundTrip('t^2+6*t+5')).toBe(true);
		});

		it('should respect explicit variable y', () => {
			const { variable, h, k } = sqcomp('y^2-2*y+3', 'y');
			expect(variable).toBe('y');
			expect(h.eq(-1)).toBe(true);
			expect(k.eq(2)).toBe(true);
			expect(roundTrip('y^2-2*y+3', 'y')).toBe(true);
		});
	});

	describe('error handling', () => {
		it('should throw for non-quadratic (linear)', () => {
			expect(() => sqcomp('x+1')).toThrow();
		});

		it('should throw for non-quadratic (cubic)', () => {
			expect(() => sqcomp('x^3+x+1')).toThrow();
		});

		it('should throw for constant expression', () => {
			expect(() => sqcomp('5')).toThrow();
		});
	});
});
