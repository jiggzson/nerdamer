import { radicalSubstitution } from '../../src/calculus/integrate/utils';
import { expand } from '../../src/core/functions/expand/expand';

describe('radicalSubstitution', () => {
	describe('basic substitution', () => {
		it('should handle x^(1/2)*(1+x) → 2*t^2*(1+t^2)', () => {
			const result = radicalSubstitution('x^(1/2)*(1+x)', 'x')!;
			expect(result).not.toBeNull();
			expect(result.n).toBe(2);
			expect(result.newVariable).toBe('t');
			expect(result.originalVariable).toBe('x');
			const expanded = expand(result.integrand);
			expect(expanded.eq('2*t^2+2*t^4')).toBe(true);
		});

		it('should handle x^(1/2) → 2*t^2', () => {
			const result = radicalSubstitution('x^(1/2)', 'x')!;
			expect(result.n).toBe(2);
			expect(result.integrand.eq('2*t^2')).toBe(true);
		});

		it('should handle x^(2/3) → 3*t^4', () => {
			const result = radicalSubstitution('x^(2/3)', 'x')!;
			expect(result.n).toBe(3);
			expect(result.integrand.eq('3*t^4')).toBe(true);
		});
	});

	describe('LCM of multiple denominators', () => {
		it('should handle x^(1/2)+x^(1/3) with n=6', () => {
			const result = radicalSubstitution('x^(1/2)+x^(1/3)', 'x')!;
			expect(result.n).toBe(6);
			const expanded = expand(result.integrand);
			expect(expanded.eq('6*t^7+6*t^8')).toBe(true);
		});

		it('should handle x^(1/4)+x^(3/4) with n=4', () => {
			const result = radicalSubstitution('x^(1/4)+x^(3/4)', 'x')!;
			expect(result.n).toBe(4);
			const expanded = expand(result.integrand);
			expect(expanded.eq('4*t^4+4*t^6')).toBe(true);
		});
	});

	describe('rational integrands with radicals', () => {
		it('should handle (1+x^(1/2))^(-1) → 2*t*(1+t)^(-1)', () => {
			const result = radicalSubstitution('(1+x^(1/2))^(-1)', 'x')!;
			expect(result.n).toBe(2);
			expect(result.integrand.eq('2*t*(1+t)^(-1)')).toBe(true);
		});
	});

	describe('with coefficients', () => {
		it('should handle 3*x^(3/2)+2*x^(1/2)', () => {
			const result = radicalSubstitution('3*x^(3/2)+2*x^(1/2)', 'x')!;
			expect(result.n).toBe(2);
			const expanded = expand(result.integrand);
			expect(expanded.eq('4*t^2+6*t^4')).toBe(true);
		});
	});

	describe('variable detection', () => {
		it('should auto-detect variable', () => {
			const result = radicalSubstitution('u^(1/2)*(1+u)')!;
			expect(result.originalVariable).toBe('u');
			expect(result.n).toBe(2);
			const expanded = expand(result.integrand);
			expect(expanded.eq('2*t^2+2*t^4')).toBe(true);
		});

		it('should respect explicit variable', () => {
			const result = radicalSubstitution('u^(1/2)*(1+u)', 'u')!;
			expect(result.originalVariable).toBe('u');
		});

		it('should support custom new variable name', () => {
			const result = radicalSubstitution('x^(1/2)', 'x', 's')!;
			expect(result.newVariable).toBe('s');
			expect(result.integrand.eq('2*s^2')).toBe(true);
		});
	});

	describe('back-substitution', () => {
		it('should provide correct back-sub for n=2', () => {
			const result = radicalSubstitution('x^(1/2)', 'x')!;
			expect(result.backSub.eq('x^(1/2)')).toBe(true);
		});

		it('should provide correct back-sub for n=6', () => {
			const result = radicalSubstitution('x^(1/2)+x^(1/3)', 'x')!;
			expect(result.backSub.eq('x^(1/6)')).toBe(true);
		});
	});

	describe('no substitution needed', () => {
		it('should return null for integer powers', () => {
			expect(radicalSubstitution('x^2+x+1', 'x')).toBeNull();
		});

		it('should return null for constants', () => {
			expect(radicalSubstitution('5', 'x')).toBeNull();
		});

		it('should return null for no variables', () => {
			expect(radicalSubstitution('5')).toBeNull();
		});
	});

	describe('no abs() in output', () => {
		it('should not produce abs() for even roots', () => {
			const cases = ['x^(1/2)', 'x^(1/2)*(1+x)', 'x^(1/4)+x^(3/4)', '3*x^(3/2)+2*x^(1/2)'];
			for (const input of cases) {
				const result = radicalSubstitution(input, 'x')!;
				expect(result.integrand.text()).not.toContain('abs');
				expect(expand(result.integrand).text()).not.toContain('abs');
			}
		});
	});
});
