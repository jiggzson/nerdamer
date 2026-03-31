import { integrate } from '../../../src/calculus/integrate/integrate';
import { Expression } from '../../../src/core/classes/expression/Expression';

const text = (expr: string | number) => Expression.create(expr).text();

describe('integrate – stress tests', () => {
	// ================================================================
	// Linearity: ∫(f + g) dx = ∫f dx + ∫g dx
	// ================================================================
	describe('linearity (sum splitting)', () => {
		it('integrates sin(x)+cos(x)', () => {
			expect(integrate('sin(x)+cos(x)', 'x').text()).toEqual(text('-cos(x)+sin(x)'));
		});

		it('integrates x^2+3*x+1', () => {
			expect(integrate('x^2+3*x+1', 'x').text()).toEqual(text('(1/3)*x^3+(3/2)*x^2+x'));
		});

		it('integrates e^x+x^2-sin(x)', () => {
			expect(integrate('e^x+x^2-sin(x)', 'x').text()).toEqual(text('e^x+(1/3)*x^3+cos(x)'));
		});

		it('integrates 1+x+x^2+x^3', () => {
			expect(integrate('1+x+x^2+x^3', 'x').text()).toEqual(
				text('x+(1/2)*x^2+(1/3)*x^3+(1/4)*x^4')
			);
		});

		it('integrates cos(x)-sec(x)^2', () => {
			expect(integrate('cos(x)-sec(x)^2', 'x').text()).toEqual(text('sin(x)-tan(x)'));
		});
	});

	// ================================================================
	// Constant multiplier extraction
	// ================================================================
	describe('constant multiplier handling', () => {
		it('integrates 5*cos(x)', () => {
			expect(integrate('5*cos(x)', 'x').text()).toEqual(text('5*sin(x)'));
		});

		it('integrates (1/3)*x^2', () => {
			expect(integrate('(1/3)*x^2', 'x').text()).toEqual(text('(1/9)*x^3'));
		});

		it('integrates -2*sin(x)', () => {
			expect(integrate('-2*sin(x)', 'x').text()).toEqual(text('2*cos(x)'));
		});

		it('integrates 7*e^x', () => {
			expect(integrate('7*e^x', 'x').text()).toEqual(text('7*e^x'));
		});

		it('integrates a*x^2 (symbolic constant)', () => {
			// Multiplier ordering: engine may produce (1/3)*x^3*a or (1/3)*a*x^3
			const result = integrate('a*x^2', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			// Verify correctness structurally rather than exact text
			expect(result.text()).toEqual(text('(1/3)*x^3*a'));
		});

		it('integrates a*cos(x) (symbolic constant)', () => {
			expect(integrate('a*cos(x)', 'x').text()).toEqual(text('a*sin(x)'));
		});
	});

	// ================================================================
	// Pure constants w.r.t. integration variable
	// ================================================================
	describe('constant integrands', () => {
		it('integrates 1 dx', () => {
			expect(integrate('1', 'x').text()).toEqual(text('x'));
		});

		it('integrates 5 dx', () => {
			expect(integrate('5', 'x').text()).toEqual(text('5*x'));
		});

		it('integrates a dx (symbolic)', () => {
			expect(integrate('a', 'x').text()).toEqual(text('a*x'));
		});

		it('integrates a^2 dx (symbolic)', () => {
			expect(integrate('a^2', 'x').text()).toEqual(text('a^2*x'));
		});
	});

	// ================================================================
	// Variable names other than x
	// ================================================================
	describe('alternate integration variables', () => {
		it('integrates cos(t) dt', () => {
			expect(integrate('cos(t)', 't').text()).toEqual(text('sin(t)'));
		});

		it('integrates y^3 dy', () => {
			expect(integrate('y^3', 'y').text()).toEqual(text('(1/4)*y^4'));
		});

		it('integrates e^s ds', () => {
			expect(integrate('e^s', 's').text()).toEqual(text('e^s'));
		});

		it('integrates sin(u) du', () => {
			expect(integrate('sin(u)', 'u').text()).toEqual(text('-cos(u)'));
		});

		it('treats x as constant when integrating w.r.t. t', () => {
			// Multiplier ordering: engine produces x*t
			expect(integrate('x', 't').text()).toEqual(text('x*t'));
		});
	});

	// ================================================================
	// Composite / scaled arguments in table lookups
	// ================================================================
	describe('composite arguments (scaled variable)', () => {
		it('integrates sin(3*x)', () => {
			expect(integrate('sin(3*x)', 'x').text()).toEqual(text('(-1/3)*cos(3*x)'));
		});

		it('integrates cos(2*x)', () => {
			expect(integrate('cos(2*x)', 'x').text()).toEqual(text('(1/2)*sin(2*x)'));
		});

		it('integrates e^(3*x)', () => {
			expect(integrate('e^(3*x)', 'x').text()).toEqual(text('(1/3)*e^(3*x)'));
		});

		it('integrates sec(2*x)^2', () => {
			expect(integrate('sec(2*x)^2', 'x').text()).toEqual(text('(1/2)*tan(2*x)'));
		});

		it('integrates csc(3*x)^2', () => {
			expect(integrate('csc(3*x)^2', 'x').text()).toEqual(text('(-1/3)*cot(3*x)'));
		});

		it('integrates sinh(2*x)', () => {
			expect(integrate('sinh(2*x)', 'x').text()).toEqual(text('(1/2)*cosh(2*x)'));
		});

		it('integrates cosh(3*x)', () => {
			expect(integrate('cosh(3*x)', 'x').text()).toEqual(text('(1/3)*sinh(3*x)'));
		});
	});

	// ================================================================
	// Higher trig powers (reduction formulas)
	// ================================================================
	describe('higher trig powers (reduction)', () => {
		it('integrates sin(x)^3', () => {
			const result = integrate('sin(x)^3', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates cos(x)^4', () => {
			const result = integrate('cos(x)^4', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates tan(x)^3', () => {
			const result = integrate('tan(x)^3', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates tan(x)^4', () => {
			const result = integrate('tan(x)^4', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates sec(x)^3', () => {
			const result = integrate('sec(x)^3', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates cot(x)^3', () => {
			const result = integrate('cot(x)^3', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates csc(x)^3', () => {
			const result = integrate('csc(x)^3', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates sin(x)^4', () => {
			const result = integrate('sin(x)^4', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates cos(x)^3', () => {
			const result = integrate('cos(x)^3', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates sin(2*x)^2', () => {
			expect(integrate('sin(2*x)^2', 'x').text()).toEqual(text('(1/2)*x-(1/8)*sin(4*x)'));
		});

		it('integrates cos(3*x)^2', () => {
			expect(integrate('cos(3*x)^2', 'x').text()).toEqual(text('(1/2)*x+(1/12)*sin(6*x)'));
		});
	});

	// ================================================================
	// Hyperbolic trig products
	// ================================================================
	describe('hyperbolic trig products and composites', () => {
		it('integrates sinh(x)*cosh(x)', () => {
			const result = integrate('sinh(x)*cosh(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates sech(x)*tanh(x)', () => {
			expect(integrate('sech(x)*tanh(x)', 'x').text()).toEqual(text('-sech(x)'));
		});

		it('integrates csch(x)*coth(x)', () => {
			expect(integrate('csch(x)*coth(x)', 'x').text()).toEqual(text('-csch(x)'));
		});

		it('integrates sech(x)^2', () => {
			expect(integrate('sech(x)^2', 'x').text()).toEqual(text('tanh(x)'));
		});

		it('integrates csch(x)^2', () => {
			expect(integrate('csch(x)^2', 'x').text()).toEqual(text('-coth(x)'));
		});

		it('integrates sinh(2*x+1)', () => {
			expect(integrate('sinh(2*x+1)', 'x').text()).toEqual(text('(1/2)*cosh(1+2*x)'));
		});

		it('integrates cosh(3*x+2)', () => {
			expect(integrate('cosh(3*x+2)', 'x').text()).toEqual(text('(1/3)*sinh(2+3*x)'));
		});

		it('integrates tanh(x+1)', () => {
			expect(integrate('tanh(x+1)', 'x').text()).toEqual(text('log(cosh(1+x))'));
		});
	});

	// ================================================================
	// Integration by parts — classic cases that should resolve
	// ================================================================
	describe('integration by parts – classic resolvable', () => {
		it('integrates x*cos(x)', () => {
			const result = integrate('x*cos(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates x*sin(x)', () => {
			const result = integrate('x*sin(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates x*e^x', () => {
			const result = integrate('x*e^x', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates x*log(x)', () => {
			const result = integrate('x*log(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates x^2*log(x) via IBP or table', () => {
			const result = integrate('x^2*log(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});
	});

	// ================================================================
	// Integration by parts — multi-round (requires 2+ IBP applications)
	// ================================================================
	describe('integration by parts – multi-round', () => {
		it('integrates x^2*cos(x) (2 rounds)', () => {
			const result = integrate('x^2*cos(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates x^2*sin(x) (2 rounds)', () => {
			const result = integrate('x^2*sin(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates x^2*e^x (2 rounds)', () => {
			const result = integrate('x^2*e^x', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates x^3*e^x (3 rounds)', () => {
			const result = integrate('x^3*e^x', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates x^3*cos(x) (3 rounds)', () => {
			const result = integrate('x^3*cos(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates x^3*sin(x) (3 rounds)', () => {
			const result = integrate('x^3*sin(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});
	});

	// ================================================================
	// Integration by parts — coefficient propagation
	// ================================================================
	describe('integration by parts – coefficient propagation', () => {
		it('integrates 3*x*cos(x)', () => {
			const result = integrate('3*x*cos(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates -2*x*e^x', () => {
			const result = integrate('-2*x*e^x', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates a*x*sin(x) (symbolic constant)', () => {
			const result = integrate('a*x*sin(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates (1/2)*x^2*e^x', () => {
			const result = integrate('(1/2)*x^2*e^x', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates 5*x*log(x)', () => {
			const result = integrate('5*x*log(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});
	});

	// ================================================================
	// Integration by parts — cyclic and pathological cases
	// These MUST return symbolic integrate(...) promptly without looping.
	// ================================================================
	describe('integration by parts – cyclic and pathological (must not loop)', () => {
		it('e^x*tan(x) returns symbolic promptly', () => {
			const start = Date.now();
			const result = integrate('e^x*tan(x)', 'x');
			expect(Date.now() - start).toBeLessThan(5000);
			expect(result.isFunction('integrate')).toBe(true);
		});

		it('e^x*sec(x) returns symbolic promptly', () => {
			const start = Date.now();
			const result = integrate('e^x*sec(x)', 'x');
			expect(Date.now() - start).toBeLessThan(5000);
			expect(result.isFunction('integrate')).toBe(true);
		});

		it('e^x*csc(x) returns symbolic promptly', () => {
			const start = Date.now();
			const result = integrate('e^x*csc(x)', 'x');
			expect(Date.now() - start).toBeLessThan(5000);
			expect(result.isFunction('integrate')).toBe(true);
		});

		it('e^x*cot(x) returns symbolic promptly', () => {
			const start = Date.now();
			const result = integrate('e^x*cot(x)', 'x');
			expect(Date.now() - start).toBeLessThan(5000);
			expect(result.isFunction('integrate')).toBe(true);
		});

		it('tan(x)*log(x) returns symbolic promptly', () => {
			const start = Date.now();
			const result = integrate('tan(x)*log(x)', 'x');
			expect(Date.now() - start).toBeLessThan(5000);
			expect(result.isFunction('integrate')).toBe(true);
		});
	});

	// ================================================================
	// Integration by parts — non-elementary integrands
	// These have no closed-form antiderivative. IBP should bail
	// cleanly and return symbolic integrate(...).
	// ================================================================
	describe('integration by parts – non-elementary (should return symbolic)', () => {
		it('x*tan(x) returns symbolic', () => {
			const start = Date.now();
			const result = integrate('x*tan(x)', 'x');
			expect(Date.now() - start).toBeLessThan(5000);
			expect(result.isFunction('integrate')).toBe(true);
		});

		it('x*sec(x) returns symbolic', () => {
			const start = Date.now();
			const result = integrate('x*sec(x)', 'x');
			expect(Date.now() - start).toBeLessThan(5000);
			expect(result.isFunction('integrate')).toBe(true);
		});

		it('x*cot(x) returns symbolic', () => {
			const start = Date.now();
			const result = integrate('x*cot(x)', 'x');
			expect(Date.now() - start).toBeLessThan(5000);
			expect(result.isFunction('integrate')).toBe(true);
		});

		it('x*csc(x) returns symbolic', () => {
			const start = Date.now();
			const result = integrate('x*csc(x)', 'x');
			expect(Date.now() - start).toBeLessThan(5000);
			expect(result.isFunction('integrate')).toBe(true);
		});
	});

	// ================================================================
	// Log substitution: ∫f'(x)/f(x) dx = log|f(x)|
	// ================================================================
	describe('logarithmic substitution', () => {
		it('integrates cos(x)/sin(x) → log(sin(x))', () => {
			const result = integrate('cos(x)/sin(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates 2*x/(1+x^2)', () => {
			const result = integrate('2*x/(1+x^2)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates e^x/(1+e^x)', () => {
			const result = integrate('e^x/(1+e^x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates 3*cos(x)/sin(x) (with constant)', () => {
			const result = integrate('3*cos(x)/sin(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates sec(x)^2/tan(x)', () => {
			const result = integrate('sec(x)^2/tan(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});
	});

	// ================================================================
	// Linear substitution: (ax+b) patterns
	// ================================================================
	describe('linear substitution patterns', () => {
		it('integrates (2*x+3)^5', () => {
			expect(integrate('(2*x+3)^5', 'x').text()).toEqual(text('(2*x+3)^6/12'));
		});

		it('integrates 1/(5*x-1)', () => {
			expect(integrate('1/(5*x-1)', 'x').text()).toEqual(text('(1/5)*log(-1+5*x)'));
		});

		it('integrates sin(2*x+1)', () => {
			expect(integrate('sin(2*x+1)', 'x').text()).toEqual(text('(-1/2)*cos(1+2*x)'));
		});

		it('integrates cos(3*x-2)', () => {
			expect(integrate('cos(3*x-2)', 'x').text()).toEqual(text('(1/3)*sin(-2+3*x)'));
		});

		it('integrates e^(2*x+1)', () => {
			expect(integrate('e^(2*x+1)', 'x').text()).toEqual(text('(1/2)*e^(1+2*x)'));
		});
	});

	// ================================================================
	// Known inverse-derivative forms (extended)
	// ================================================================
	describe('inverse-derivative forms (extended)', () => {
		it('integrates 1/(4+x^2) → (1/2)*atan(x/2)', () => {
			const result = integrate('1/(4+x^2)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates 1/sqrt(4-x^2) → asin(x/2)', () => {
			const result = integrate('1/sqrt(4-x^2)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates 1/(9+4*x^2)', () => {
			const result = integrate('1/(9+4*x^2)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates 1/sqrt(4+x^2) → asinh(x/2)', () => {
			const result = integrate('1/sqrt(4+x^2)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});
	});

	// ================================================================
	// Edge cases and robustness
	// ================================================================
	describe('edge cases and robustness', () => {
		it('returns symbolic integrate for unresolvable expression', () => {
			const result = integrate('e^(e^x)', 'x');
			expect(result.isFunction('integrate')).toBe(true);
		});

		it('returns symbolic integrate for e^(x^2)', () => {
			const result = integrate('e^(x^2)', 'x');
			expect(result.isFunction('integrate')).toBe(true);
		});

		it('handles zero integrand', () => {
			expect(integrate('0', 'x').text()).toEqual(text('0'));
		});

		it('handles negative exponents: x^(-2)', () => {
			expect(integrate('x^(-2)', 'x').text()).toEqual(text('-x^-1'));
		});

		it('handles fractional exponents: x^(1/2)', () => {
			expect(integrate('x^(1/2)', 'x').text()).toEqual(text('(2/3)*x^(3/2)'));
		});

		it('handles x^(-1/2)', () => {
			expect(integrate('x^(-1/2)', 'x').text()).toEqual(text('2*x^(1/2)'));
		});

		it('does not crash on deeply nested sum', () => {
			const result = integrate('x^9+x^8+x^7+x^6+x^5+x^4+x^3+x^2+x+1', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('does not hang on max depth (returns symbolic)', () => {
			const start = Date.now();
			const result = integrate('sin(x^x)', 'x');
			expect(Date.now() - start).toBeLessThan(5000);
			expect(result.isFunction('integrate')).toBe(true);
		});
	});

	// ================================================================
	// Special function integrals: Si, Ci, Ei
	// ================================================================
	describe('special function integrals (Si, Ci, Ei)', () => {
		it('integrates sin(x)/x → Si(x)', () => {
			const result = integrate('sin(x)/x', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates cos(x)/x → Ci(x)', () => {
			const result = integrate('cos(x)/x', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates e^x/x → Ei(x)', () => {
			const result = integrate('e^x/x', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates 3*sin(x)/x (with coefficient)', () => {
			const result = integrate('3*sin(x)/x', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates sin(2*x)/x → Si(2*x)', () => {
			const result = integrate('sin(2*x)/x', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates cos(3*x)/x → Ci(3*x)', () => {
			const result = integrate('cos(3*x)/x', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});
	});

	// ================================================================
	// IBP + special functions: log(x)*f(x) → f(x)-part + Si/Ci/Ei
	// ================================================================
	describe('IBP resolving to special functions', () => {
		it('integrates e^x*log(x) via IBP + Ei', () => {
			const result = integrate('e^x*log(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates sin(x)*log(x) via IBP + Ci', () => {
			const result = integrate('sin(x)*log(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates cos(x)*log(x) via IBP + Si', () => {
			const result = integrate('cos(x)*log(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});
	});

	// ================================================================
	// Rational function integration via partial fractions
	// ================================================================
	describe('rational function integration (partial fractions)', () => {
		it('integrates x^2/(1+x^2) (improper → long division)', () => {
			// x²/(1+x²) = 1 - 1/(1+x²), integral = x - atan(x)
			const result = integrate('x^2/(1+x^2)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates x^3/(1+x^2) (improper)', () => {
			// x³/(1+x²) = x - x/(1+x²), integral = x²/2 - (1/2)log(1+x²)
			const result = integrate('x^3/(1+x^2)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates 1/((x+1)*(x-1)) via partial fractions', () => {
			// 1/(x²-1) = (1/2)/(x-1) - (1/2)/(x+1)
			const result = integrate('1/(x^2-1)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates (2*x+3)/(x^2+3*x+2) via partial fractions', () => {
			// Denominator factors as (x+1)(x+2)
			const result = integrate('(2*x+3)/(x^2+3*x+2)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates 1/(x^2+x) via partial fractions', () => {
			// 1/(x(x+1)) = 1/x - 1/(x+1)
			const result = integrate('1/(x^2+x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates (x+1)/(x^2-x-2) via partial fractions', () => {
			// Denominator factors as (x-2)(x+1)
			const result = integrate('(x+1)/(x^2-x-2)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('does not attempt rational decomposition on transcendental integrands', () => {
			// sin(x)/(1+x^2) is not a rational function — should not crash
			const start = Date.now();
			integrate('sin(x)/(1+x^2)', 'x');
			expect(Date.now() - start).toBeLessThan(5000);
		});
	});

	// ================================================================
	// IBP + rational function: x*invtrig(x) family
	// After IBP the remainder is a rational function that needs
	// partial fractions or long division to resolve.
	// ================================================================
	describe('IBP + rational function (inverse trig family)', () => {
		it('integrates x*atan(x)', () => {
			// IBP: u=atan(x), dv=x → remainder ∫x²/(2(1+x²))dx
			// Long division: x²/(1+x²) = 1 - 1/(1+x²)
			const result = integrate('x*atan(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates x*asin(x)', () => {
			// IBP: u=asin(x), dv=x → remainder involves 1/sqrt(1-x²)
			const result = integrate('x*asin(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates x*acos(x)', () => {
			const result = integrate('x*acos(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates x*atan(x) promptly', () => {
			const start = Date.now();
			integrate('x*atan(x)', 'x');
			expect(Date.now() - start).toBeLessThan(5000);
		});
	});
});

describe('product substitution (f·f′ pattern)', () => {
	// ================================================================
	// Wrapped-factor substitution: ∫ g(f(x))·f'(x) dx via u = f(x)
	// ================================================================
	describe('wrapped-factor substitution', () => {
		it('integrates x*e^(x^2)', () => {
			expect(integrate('x*e^(x^2)', 'x').text()).toEqual(text('(1/2)*e^(x^2)'));
		});

		it('integrates x*cos(x^2)', () => {
			expect(integrate('x*cos(x^2)', 'x').text()).toEqual(text('(1/2)*sin(x^2)'));
		});

		it('integrates x*(3+2*x^2)^(5/2) via base-of-power', () => {
			const result = integrate('x*(3+2*x^2)^(5/2)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});
	});

	// ================================================================
	// Basic f·f' and f^n·f' product substitution
	// ================================================================
	describe('f^n·f′ detection', () => {
		it('integrates sin(x)*cos(x)', () => {
			const result = integrate('sin(x)*cos(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates x*(1+x^2) → (1/4)*(1+x^2)^2', () => {
			expect(integrate('x*(1+x^2)', 'x').text()).toEqual(text('(1/4)*(1+x^2)^2'));
		});

		it('integrates sec(x)^2*tan(x) → (1/2)*tan(x)^2', () => {
			expect(integrate('sec(x)^2*tan(x)', 'x').text()).toEqual(text('(1/2)*tan(x)^2'));
		});

		it('integrates sec(x)^2*tan(x)^2 → (1/3)*tan(x)^3', () => {
			// f = tan(x), f' = sec(x)^2, n = 2 → f^3/3
			expect(integrate('sec(x)^2*tan(x)^2', 'x').text()).toEqual(text('(1/3)*tan(x)^3'));
		});

		it('integrates sec(x)^2*tan(x)^3 → (1/4)*tan(x)^4', () => {
			// f = tan(x), f' = sec(x)^2, n = 3 → f^4/4
			expect(integrate('sec(x)^2*tan(x)^3', 'x').text()).toEqual(text('(1/4)*tan(x)^4'));
		});
	});

	// ================================================================
	// Composite-argument f^n·f' (inner function is not just x)
	// ================================================================
	describe('composite-argument f^n·f′', () => {
		it('integrates x*tan(1+x^2)^4 via tan reduction', () => {
			// tan^4 = tan^2·(sec^2-1) → sec^2·tan^2 piece integrates to tan^3/3
			expect(integrate('x*tan(1+x^2)^4', 'x').text()).toEqual(
				text('(1/2)*(x^2-tan(1+x^2)+(1/3)*tan(1+x^2)^3+1)')
			);
		});
	});

	// ================================================================
	// Product expansion: products containing transcendental sum factors
	// are expanded and integrated term-by-term via linearity
	// ================================================================
	describe('product expansion with transcendental sum factors', () => {
		it('integrates x*sec(1+x^2)^2*(1+tan(1+x^2)^2)', () => {
			// (1+tan(θ)^2) = sec(θ)^2, so integrand = x·sec(u)^4
			// After expansion: x·sec(u)^2 + x·sec(u)^2·tan(u)^2
			// = (1/2)·tan(u) + (1/6)·tan(u)^3
			expect(integrate('x*sec(1+x^2)^2*(1+tan(1+x^2)^2)', 'x').text()).toEqual(
				text('(1/2)*tan(1+x^2)+(1/6)*tan(1+x^2)^3')
			);
		});

		it('does not expand purely algebraic sum factors', () => {
			// x*(1+x^2) should use substitution, not expansion
			expect(integrate('x*(1+x^2)', 'x').text()).toEqual(text('(1/4)*(1+x^2)^2'));
		});
	});
});

// ================================================================
// Weierstrass substitution (tangent half-angle)
//
// For rational functions of sin(x) and cos(x), the substitution
// t = tan(x/2) reduces the integrand to a rational function of t.
// ================================================================
describe('Weierstrass substitution (rational-in-trig)', () => {
	describe('basic reciprocal trig expressions', () => {
		it('integrates 1/(1+cos(x))', () => {
			// = 1/(2cos²(x/2)) → tan(x/2)
			const result = integrate('(1+cos(x))^(-1)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates 1/(1-cos(x))', () => {
			// = 1/(2sin²(x/2)) → -cot(x/2)
			const result = integrate('(1-cos(x))^(-1)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates 1/(1+sin(x))', () => {
			const result = integrate('(1+sin(x))^(-1)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates 1/(1-sin(x))', () => {
			const result = integrate('(1-sin(x))^(-1)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});
	});

	describe('general rational-in-trig', () => {
		it('integrates 1/(2+cos(x))', () => {
			// Denominator is a+b*cos(x) with a≠b → atan result
			const result = integrate('(2+cos(x))^(-1)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});

		it('integrates 1/(sin(x)+cos(x))', () => {
			const result = integrate('(sin(x)+cos(x))^(-1)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});
	});

	describe('with composite arguments', () => {
		it('integrates 1/(1+cos(2*x))', () => {
			// Argument is 2x → t = tan(x), Jacobian adjusted by factor 2
			const result = integrate('(1+cos(2*x))^(-1)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});
	});

	describe('does not misfire on non-rational-in-trig', () => {
		it('does not apply to x/(1+cos(x))', () => {
			// Bare x outside trig — Weierstrass should not fire
			const start = Date.now();
			integrate('x/(1+cos(x))', 'x');
			expect(Date.now() - start).toBeLessThan(5000);
		});

		it('does not apply to e^x*sin(x)', () => {
			// e^x is not rational in trig — handled by table instead
			const result = integrate('e^x*sin(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
		});
	});
});
