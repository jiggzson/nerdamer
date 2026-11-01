import { gcd } from '../../src/algebra/gcd/gcd';
import { GaussianRational } from '../../src/algebra/gcd/GaussianRational';
import { Rational } from '../../src/core/classes/rational/Rational';

describe('legacy #181 exact complex polynomial GCD', () => {
	// Exact Gaussian-rational division must preserve both components.
	it('divides rational complex coefficients without rounding', () => {
		const a = new GaussianRational(Rational.create('1/2'), Rational.create('1/3'));
		const b = new GaussianRational(Rational.create('2/3'), Rational.create('-1/4'));
		const restored = a.div(b).times(b);
		expect(restored.real.text()).toBe('1/2');
		expect(restored.imaginary.text()).toBe('1/3');
	});

	it('retains a shared factor in expanded complex polynomials', () => {
		for (const [left, right] of [
			['(x+i)*(x+2*i)', '(x+i)*(x-3*i)'],
			['(x+i)*(x-3*i)', '(x+i)*(x+2*i)'],
		]) {
			expect(gcd(left, right).eq('x+i')).toBe(true);
		}
	});

	it('preserves repeated complex factors', () => {
		expect(gcd('(x+i)^3*(x-1)', '(x+i)^2*(x+2)').eq('(x+i)^2')).toBe(true);
	});

	it('keeps conjugate factors and distinguishes distinct factors', () => {
		expect(gcd('(x+i)*(x-i)*(x+1)', '(x^2+1)*(x-2)').eq('x^2+1')).toBe(true);
		expect(gcd('x+i', 'x-i').eq('1')).toBe(true);
	});

	// Rational real and imaginary parts must remain exact throughout division.
	it('handles fractional complex coefficients in both operand orders', () => {
		const left = '(x+i/2)*(x+2*i)';
		const right = '(x+i/2)*(x-3*i)';
		expect(gcd(left, right).eq('x+i/2')).toBe(true);
		expect(gcd(right, left).eq('x+i/2')).toBe(true);
	});

	it('normalizes complex scalar multiples to a monic GCD', () => {
		const left = '(1+i)*(x+i/2)*(x+1)';
		const right = '(2-i)*(x+i/2)*(x-2)';
		expect(gcd(left, right).eq('x+i/2')).toBe(true);
		expect(gcd(right, left).eq('x+i/2')).toBe(true);
	});

	it('leaves ordinary integer polynomial GCD normalization unchanged', () => {
		expect(gcd('6*x^2', '4*x').eq('2*x')).toBe(true);
	});
});
