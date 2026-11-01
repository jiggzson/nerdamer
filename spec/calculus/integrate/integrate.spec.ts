import { integrate } from '../../../src/calculus/integrate/integrate';
import { bySubstitution, matchProductSubstitution, matchLogSubstitution, matchPowerSubstitution, tryIntegrateByWrappedFactorSubstitution } from '../../../src/calculus/integrate/bySubstitution';
import { diff } from '../../../src/calculus/derivative/diff';
import { tableOfIntegrals } from '../../../src/calculus/integrate/integrationTable';
import { pmintPolynomial, pmintRational } from '../../../src/calculus/integrate/poorMansIntegrator';
import { Pattern } from '../../../src/core/converters/Pattern';
import { Expression } from '../../../src/core/classes/expression/Expression';
import nerdamer from '../../../src/index';

const text = (expr: string | number) => Expression.create(expr).text();

describe('Integration table correctness', () => {
	const cases = [
		'csc(2*x)^3',
		'3*csc(-2*x)^4',
		'csc(x)^5',
		'2^(2*x)*cosh(x)',
		'2^(2*x)*sinh(x)',
		'2^(-2*x)*cosh(x)',
		'2^(-2*x)*sinh(x)',
		'e^x*cosh(x)',
		'e^x*sinh(x)',
		'e^(-x)*cosh(x)',
		'e^(-x)*sinh(x)',
		'e^(2*x)*cosh(x)',
		'e^(2*x)*sinh(x)',
	];

	it.each(cases)('returns an antiderivative for %s', source => {
		const result = integrate(source, 'x');
		expect(result.hasFunction('integrate', true)).toBe(false);
		const derivative = diff(result, 'x');
		for (const x of [0.2, 0.6, 1.1]) {
			const actual = Number(derivative.evaluate({ x }).text({ decimal: true }));
			const expected = Number(Expression.create(source).evaluate({ x }).text({ decimal: true }));
			expect(Number.isFinite(actual)).toBe(true);
			expect(actual).toBeCloseTo(expected, 7);
		}
	});
});

describe('Reciprocal logarithm regression', () => {
	it('does not return a derivative-invalid antiderivative for 1/(x*log(x))', () => {
		const integrand = Expression.create('1/(x*log(x))');
		expect(tableOfIntegrals.lookup(new Pattern(integrand, ['x']), 0)).toBeUndefined();
		expect(tryIntegrateByWrappedFactorSubstitution(integrand, integrand.elementsArray(), 'x')).toBeUndefined();
		expect(matchProductSubstitution(integrand, 'x')).toBeUndefined();
		const result = integrate(integrand, 'x');
		const residual = diff(result, 'x').minus(integrand).simplify();
		expect(residual.text()).toBe('0');
	});

	it('integrates a shifted logarithmic derivative', () => {
		const integrand = Expression.create('2/(x*(1+log(x)))');
		const result = integrate(integrand, 'x');
		expect(diff(result, 'x').minus(integrand).simplify().text()).toBe('0');
	});
});

describe('Legacy #334 sine-cubic substitution', () => {
	it('integrates cos(x)/(1+sin(x)^3) without returning a false primitive', () => {
		const source = 'cos(x)/(1+sin(x)^3)';
		const result = integrate(source, 'x');
		expect(result.hasFunction('integrate', true)).toBe(false);
		for (const x of [0, 0.2, 0.7]) {
			const actual = Number(diff(result, 'x').evaluate({ x }).text({ decimal: true }));
			const expected = Number(Expression.create(source).evaluate({ x }).text({ decimal: true }));
			expect(actual).toBeCloseTo(expected, 8);
		}
	});
});

describe('integrate – stress tests', () => {
	it('integrates the reciprocal squared sine-cosine sum from legacy #334', () => {
		const source = '1/(sin(x)+cos(x))^2';
		const result = integrate(source, 'x');
		expect(result.isFunction('integrate')).toBe(false);
		for (const x of [0, 0.2, 0.7]) {
			const actual = Number(diff(result, 'x').evaluate({ x }).text({ decimal: true }));
			const expected = 1 / ((Math.sin(x) + Math.cos(x)) ** 2);
			expect(actual).toBeCloseTo(expected, 8);
		}
	});

	it('integrates the rational square from legacy #334', () => {
		const source = 'x^2/(x^2+1)^2';
		const result = integrate(source, 'x');
		expect(result.hasFunction('integrate', true)).toBe(false);
		for (const x of [0, 0.25, 1, 2]) {
			const expected = Number(Expression.create(source).evaluate({ x }).text({ decimal: true }));
			const actual = Number(diff(result, 'x').evaluate({ x }).text({ decimal: true }));
			expect(actual).toBeCloseTo(expected, 8);
		}
	});

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
			expect(diff(result, 'x').minus('a*x^2').expand().isZero()).toBe(true);
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

		it('integrates negative linear exponentials', () => {
			expect(integrate('e^(-x)', 'x').text()).toEqual(text('-e^(-x)'));
			expect(integrate('e^(-2*x)', 'x').text()).toEqual(text('(-1/2)*e^(-2*x)'));
			expect(integrate('2^(-3*x)', 'x').text()).toEqual(text('-2^(-3*x)/(3*log(2))'));
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
		const samples = [0.3, 0.7, 1.1];

		it('integrates sin(x)^3', () => {
			const result = integrate('sin(x)^3', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			const residual = diff(result, 'x').minus('sin(x)^3');
			for (const x of samples) {
				const value = Number(residual.evaluate({ x }).text({ decimal: true }));
				expect(Number.isFinite(value)).toBe(true);
				expect(value).toBeCloseTo(0, 8);
			}
		});

		it('integrates cos(x)^4', () => {
			const result = integrate('cos(x)^4', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			const residual = diff(result, 'x').minus('cos(x)^4');
			for (const x of samples) {
				const value = Number(residual.evaluate({ x }).text({ decimal: true }));
				expect(Number.isFinite(value)).toBe(true);
				expect(value).toBeCloseTo(0, 8);
			}
		});

		it('integrates tan(x)^3', () => {
			const result = integrate('tan(x)^3', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			const residual = diff(result, 'x').minus('tan(x)^3');
			for (const x of samples) {
				const value = Number(residual.evaluate({ x }).text({ decimal: true }));
				expect(Number.isFinite(value)).toBe(true);
				expect(value).toBeCloseTo(0, 8);
			}
		});

		it('integrates tan(x)^4', () => {
			const result = integrate('tan(x)^4', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			const residual = diff(result, 'x').minus('tan(x)^4');
			for (const x of samples) {
				const value = Number(residual.evaluate({ x }).text({ decimal: true }));
				expect(Number.isFinite(value)).toBe(true);
				expect(value).toBeCloseTo(0, 8);
			}
		});

		it('integrates sec(x)^3', () => {
			const result = integrate('sec(x)^3', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			const residual = diff(result, 'x').minus('sec(x)^3');
			for (const x of samples) {
				const value = Number(residual.evaluate({ x }).text({ decimal: true }));
				expect(Number.isFinite(value)).toBe(true);
				expect(value).toBeCloseTo(0, 8);
			}
		});

		it('integrates cot(x)^3', () => {
			const result = integrate('cot(x)^3', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			const residual = diff(result, 'x').minus('cot(x)^3');
			for (const x of samples) {
				const value = Number(residual.evaluate({ x }).text({ decimal: true }));
				expect(Number.isFinite(value)).toBe(true);
				expect(value).toBeCloseTo(0, 8);
			}
		});

		it('integrates csc(x)^3', () => {
			const result = integrate('csc(x)^3', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			const residual = diff(result, 'x').minus('csc(x)^3');
			for (const x of samples) {
				const value = Number(residual.evaluate({ x }).text({ decimal: true }));
				expect(Number.isFinite(value)).toBe(true);
				expect(value).toBeCloseTo(0, 8);
			}
		});

		it('integrates sin(x)^4', () => {
			const result = integrate('sin(x)^4', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			const residual = diff(result, 'x').minus('sin(x)^4');
			for (const x of samples) {
				const value = Number(residual.evaluate({ x }).text({ decimal: true }));
				expect(Number.isFinite(value)).toBe(true);
				expect(value).toBeCloseTo(0, 8);
			}
		});

		it('integrates cos(x)^3', () => {
			const result = integrate('cos(x)^3', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			const residual = diff(result, 'x').minus('cos(x)^3');
			for (const x of samples) {
				const value = Number(residual.evaluate({ x }).text({ decimal: true }));
				expect(Number.isFinite(value)).toBe(true);
				expect(value).toBeCloseTo(0, 8);
			}
		});

		it('integrates sin(2*x)^2', () => {
			expect(integrate('sin(2*x)^2', 'x').text()).toEqual(text('(1/2)*x-(1/8)*sin(4*x)'));
		});

		it('integrates cos(3*x)^2', () => {
			expect(integrate('cos(3*x)^2', 'x').text()).toEqual(text('(1/2)*x+(1/12)*sin(6*x)'));
		});

		it.each(['sin', 'cos', 'tan', 'sec', 'csc', 'cot'])(
			'declines a symbolic %s power without rewriting the unresolved integral',
			name => {
				const source = Expression.create(`${name}(x)^n`);
				const direct = tableOfIntegrals.lookup(new Pattern(source, ['x']), 0);
				const result = integrate(source, 'x');
				expect(direct).toBeUndefined();
				expect(result.isFunction('integrate')).toBe(true);
				expect(result.getArguments()[0].eq(source)).toBe(true);
			}
		);

		it.each([
			'cos(x)^n*cos(2*x)',
			'sin(x)^n*sin(2*x)',
			'cos(x)^n*sin(2*x)',
		])('declines symbolic product powers without rewriting %s', sourceText => {
			const source = Expression.create(sourceText);
			const direct = tableOfIntegrals.lookup(new Pattern(source, ['x']), 0);
			const result = integrate(source, 'x');
			expect(direct).toBeUndefined();
			expect(result.isFunction('integrate')).toBe(true);
			expect(result.getArguments()[0].eq(source)).toBe(true);
		});

		it.each(['sin(x)^(1/2)', 'sec(x)^(3/2)', 'sin(x)^(1/2)*cos(2*x)'])(
			'declines noninteger power reduction for %s', sourceText => {
				const source = Expression.create(sourceText);
				const direct = tableOfIntegrals.lookup(new Pattern(source, ['x']), 0);
				const result = integrate(source, 'x');
				expect(direct).toBeUndefined();
				expect(result.isFunction('integrate')).toBe(true);
				expect(result.getArguments()[0].eq(source)).toBe(true);
			}
		);
	});

	// ================================================================
	// Hyperbolic trig products
	// ================================================================
	describe('hyperbolic trig products and composites', () => {
		it('integrates sinh(x)*cosh(x)', () => {
			const result = integrate('sinh(x)*cosh(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			expect(diff(result, 'x').minus('sinh(x)*cosh(x)').expand().isZero()).toBe(true);
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
	describe('polynomial-exponential table recurrence', () => {
		it.each([
			'x*2^x',
			'x^2*2^x',
			'x^3*2^x',
			'x^4*2^x',
			'x^5*2^x',
			'x^6*2^x',
			'x^2*3^(2*x)',
		])('integrates %s without losing the exponential-product table cases', source => {
			const result = integrate(source, 'x');
			expect(result.hasFunction('integrate')).toBe(false);
			const direct = tableOfIntegrals.lookup(new Pattern(Expression.create(source), ['x']), 0);
			expect(direct).toBeDefined();
			const derivative = diff(direct!, 'x');
			for (const x of [0.4, 0.9, 1.6]) {
				const actual = Number(derivative.evaluate({ x }).text({ decimal: true }));
				const expected = Number(Expression.create(source).evaluate({ x }).text({ decimal: true }));
				expect(actual).toBeCloseTo(expected, 7);
			}
		});

		it('integrates a negative exponent after reciprocal normalization', () => {
			const source = 'x^3*2^(-2*x)';
			const direct = tableOfIntegrals.lookup(new Pattern(Expression.create(source), ['x']), 0);
			expect(direct).toBeDefined();
			const result = integrate(source, 'x');
			expect(result.hasFunction('integrate')).toBe(false);
			for (const x of [0.4, 0.9, 1.6]) {
				const actual = Number(diff(result, 'x').evaluate({ x }).text({ decimal: true }));
				const expected = Number(Expression.create(source).evaluate({ x }).text({ decimal: true }));
				expect(actual).toBeCloseTo(expected, 7);
			}
		});

		it('supports independent symbolic exponential parameters', () => {
			const source = 'x^2*a^(b*x)';
			const result = integrate(source, 'x');
			expect(result.hasFunction('integrate')).toBe(false);
			for (const x of [0.3, 0.8, 1.4]) {
				const values = { x, a: 2, b: 3 };
				const actual = Number(diff(result, 'x').evaluate(values).text({ decimal: true }));
				const expected = Number(Expression.create(source).evaluate(values).text({ decimal: true }));
				expect(actual).toBeCloseTo(expected, 7);
			}
		});

		it('retains constant exponential cases through ordinary polynomial integration', () => {
			const source = 'x^3*1^(2*x)';
			const result = integrate(source, 'x');
			expect(result.hasFunction('integrate')).toBe(false);
			expect(diff(result, 'x').minus(Expression.create(source)).expand().isZero()).toBe(true);
		});
	});

	describe('integration by parts – classic resolvable', () => {
		it('integrates x*cos(x)', () => {
			const result = integrate('x*cos(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			expect(diff(result, 'x').minus('x*cos(x)').expand().isZero()).toBe(true);
		});

		it('integrates x*sin(x)', () => {
			const result = integrate('x*sin(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			expect(diff(result, 'x').minus('x*sin(x)').expand().isZero()).toBe(true);
		});

		it('integrates x*e^x', () => {
			const result = integrate('x*e^x', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			expect(diff(result, 'x').minus('x*e^x').expand().isZero()).toBe(true);
		});

		it('integrates x*log(x)', () => {
			const result = integrate('x*log(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			expect(diff(result, 'x').minus('x*log(x)').expand().isZero()).toBe(true);
		});

		it('integrates x^2*log(x) via IBP or table', () => {
			const result = integrate('x^2*log(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			expect(diff(result, 'x').minus('x^2*log(x)').expand().isZero()).toBe(true);
		});
	});

	// ================================================================
	// Integration by parts — multi-round (requires 2+ IBP applications)
	// ================================================================
	describe('integration by parts – multi-round', () => {
		it('integrates x^2*cos(x) (2 rounds)', () => {
			const result = integrate('x^2*cos(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			expect(diff(result, 'x').minus('x^2*cos(x)').expand().isZero()).toBe(true);
		});

		it('integrates x^2*sin(x) (2 rounds)', () => {
			const result = integrate('x^2*sin(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			expect(diff(result, 'x').minus('x^2*sin(x)').expand().isZero()).toBe(true);
		});

		it('integrates x^2*e^x (2 rounds)', () => {
			const result = integrate('x^2*e^x', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			expect(diff(result, 'x').minus('x^2*e^x').expand().isZero()).toBe(true);
		});

		it('integrates x^3*e^x (3 rounds)', () => {
			const result = integrate('x^3*e^x', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			expect(diff(result, 'x').minus('x^3*e^x').expand().isZero()).toBe(true);
		});

		it('integrates x^3*cos(x) (3 rounds)', () => {
			const result = integrate('x^3*cos(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			expect(diff(result, 'x').minus('x^3*cos(x)').expand().isZero()).toBe(true);
		});

		it('integrates x^3*sin(x) (3 rounds)', () => {
			const result = integrate('x^3*sin(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			expect(diff(result, 'x').minus('x^3*sin(x)').expand().isZero()).toBe(true);
		});
	});

	// ================================================================
	// Integration by parts — coefficient propagation
	// ================================================================
	describe('integration by parts – coefficient propagation', () => {
		it('integrates 3*x*cos(x)', () => {
			const result = integrate('3*x*cos(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			expect(diff(result, 'x').minus('3*x*cos(x)').expand().isZero()).toBe(true);
		});

		it('integrates -2*x*e^x', () => {
			const result = integrate('-2*x*e^x', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			expect(diff(result, 'x').minus('-2*x*e^x').expand().isZero()).toBe(true);
		});

		it('integrates a*x*sin(x) (symbolic constant)', () => {
			const result = integrate('a*x*sin(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			expect(diff(result, 'x').minus('a*x*sin(x)').expand().isZero()).toBe(true);
		});

		it('integrates (1/2)*x^2*e^x', () => {
			const result = integrate('(1/2)*x^2*e^x', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			expect(diff(result, 'x').minus('(1/2)*x^2*e^x').expand().isZero()).toBe(true);
		});

		it('integrates 5*x*log(x)', () => {
			const result = integrate('5*x*log(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			expect(diff(result, 'x').minus('5*x*log(x)').expand().isZero()).toBe(true);
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
			expect(result.getArguments()[0].eq(Expression.create('e^x*csc(x)'))).toBe(true);
			expect(result.getArguments()[1].eq(Expression.Variable('x'))).toBe(true);
		});

		it('e^x*cot(x) returns symbolic promptly', () => {
			const start = Date.now();
			const result = integrate('e^x*cot(x)', 'x');
			expect(Date.now() - start).toBeLessThan(5000);
			expect(result.isFunction('integrate')).toBe(true);
			expect(result.getArguments()[0].eq(Expression.create('e^x*cot(x)'))).toBe(true);
			expect(result.getArguments()[1].eq(Expression.Variable('x'))).toBe(true);
		});

		it('tan(x)*log(x) returns symbolic promptly', () => {
			const start = Date.now();
			const result = integrate('tan(x)*log(x)', 'x');
			expect(Date.now() - start).toBeLessThan(5000);
			expect(result.isFunction('integrate')).toBe(true);
			expect(result.getArguments()[0].eq(Expression.create('tan(x)*log(x)'))).toBe(true);
			expect(result.getArguments()[1].eq(Expression.Variable('x'))).toBe(true);
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
			expect(result.getArguments()[0].eq(Expression.create('x*tan(x)'))).toBe(true);
			expect(result.getArguments()[1].eq(Expression.Variable('x'))).toBe(true);
		});

		it('x*sec(x) returns symbolic', () => {
			const start = Date.now();
			const result = integrate('x*sec(x)', 'x');
			expect(Date.now() - start).toBeLessThan(5000);
			expect(result.isFunction('integrate')).toBe(true);
			expect(result.getArguments()[0].eq(Expression.create('x*sec(x)'))).toBe(true);
			expect(result.getArguments()[1].eq(Expression.Variable('x'))).toBe(true);
		});

		it('x*cot(x) returns symbolic', () => {
			const start = Date.now();
			const result = integrate('x*cot(x)', 'x');
			expect(Date.now() - start).toBeLessThan(5000);
			expect(result.isFunction('integrate')).toBe(true);
			expect(result.getArguments()[0].eq(Expression.create('x*cot(x)'))).toBe(true);
			expect(result.getArguments()[1].eq(Expression.Variable('x'))).toBe(true);
		});

		it('x*csc(x) returns symbolic', () => {
			const start = Date.now();
			const result = integrate('x*csc(x)', 'x');
			expect(Date.now() - start).toBeLessThan(5000);
			expect(result.isFunction('integrate')).toBe(true);
			expect(result.getArguments()[0].eq(Expression.create('x*csc(x)'))).toBe(true);
			expect(result.getArguments()[1].eq(Expression.Variable('x'))).toBe(true);
		});
	});

	// ================================================================
	// Log substitution: ∫f'(x)/f(x) dx = log|f(x)|
	// ================================================================
	describe('logarithmic substitution', () => {
		it('integrates cos(x)/sin(x) → log(sin(x))', () => {
			const result = integrate('cos(x)/sin(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			expect(diff(result, 'x').minus('cos(x)/sin(x)').expand().isZero()).toBe(true);
		});

		it('integrates 2*x/(1+x^2)', () => {
			const result = integrate('2*x/(1+x^2)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			expect(diff(result, 'x').minus('2*x/(1+x^2)').expand().isZero()).toBe(true);
		});

		it('integrates e^x/(1+e^x)', () => {
			const result = integrate('e^x/(1+e^x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			expect(diff(result, 'x').minus('e^x/(1+e^x)').expand().isZero()).toBe(true);
		});

		it('integrates 3*cos(x)/sin(x) (with constant)', () => {
			const result = integrate('3*cos(x)/sin(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			expect(diff(result, 'x').minus('3*cos(x)/sin(x)').expand().isZero()).toBe(true);
		});

		it('integrates sec(x)^2/tan(x)', () => {
			const result = integrate('sec(x)^2/tan(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			expect(diff(result, 'x').minus('sec(x)^2/tan(x)').expand().isZero()).toBe(true);
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
		const samples = [-1.2, -0.3, 0.8];

		it('integrates 1/(4+x^2) → (1/2)*atan(x/2)', () => {
			const result = integrate('1/(4+x^2)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			const residual = diff(result, 'x').minus('1/(4+x^2)');
			for (const x of samples) {
				const value = Number(residual.evaluate({ x }).text({ decimal: true }));
				expect(Number.isFinite(value)).toBe(true);
				expect(value).toBeCloseTo(0, 8);
			}
		});

		it('integrates 1/sqrt(4-x^2) → asin(x/2)', () => {
			const result = integrate('1/sqrt(4-x^2)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			const residual = diff(result, 'x').minus('1/sqrt(4-x^2)');
			for (const x of samples) {
				const value = Number(residual.evaluate({ x }).text({ decimal: true }));
				expect(Number.isFinite(value)).toBe(true);
				expect(value).toBeCloseTo(0, 8);
			}
		});

		it('integrates 1/(9+4*x^2)', () => {
			const result = integrate('1/(9+4*x^2)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			const residual = diff(result, 'x').minus('1/(9+4*x^2)');
			for (const x of samples) {
				const value = Number(residual.evaluate({ x }).text({ decimal: true }));
				expect(Number.isFinite(value)).toBe(true);
				expect(value).toBeCloseTo(0, 8);
			}
		});

		it('integrates 1/sqrt(4+x^2) → asinh(x/2)', () => {
			const result = integrate('1/sqrt(4+x^2)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			const residual = diff(result, 'x').minus('1/sqrt(4+x^2)');
			for (const x of samples) {
				const value = Number(residual.evaluate({ x }).text({ decimal: true }));
				expect(Number.isFinite(value)).toBe(true);
				expect(value).toBeCloseTo(0, 8);
			}
		});
	});

	// ================================================================
	// Edge cases and robustness
	// ================================================================
	describe('edge cases and robustness', () => {
		it('returns symbolic integrate for unresolvable expression', () => {
			const result = integrate('e^(e^x)', 'x');
			expect(result.isFunction('integrate')).toBe(true);
			expect(result.getArguments()[0].eq(Expression.create('e^(e^x)'))).toBe(true);
			expect(result.getArguments()[1].eq(Expression.Variable('x'))).toBe(true);
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
			const source = 'x^9+x^8+x^7+x^6+x^5+x^4+x^3+x^2+x+1';
			const result = integrate(source, 'x');
			expect(result.isFunction('integrate')).toBe(false);
			expect(diff(result, 'x').minus(source).expand().isZero()).toBe(true);
		});

		it('does not hang on max depth (returns symbolic)', () => {
			const start = Date.now();
			const result = integrate('sin(x^x)', 'x');
			expect(Date.now() - start).toBeLessThan(5000);
			expect(result.isFunction('integrate')).toBe(true);
			expect(result.getArguments()[0].eq(Expression.create('sin(x^x)'))).toBe(true);
			expect(result.getArguments()[1].eq(Expression.Variable('x'))).toBe(true);
		});
	});

	// ================================================================
	// Special function integrals: Si, Ci, Ei
	// ================================================================
	describe('special function integrals (Si, Ci, Ei)', () => {
		const samples = [0.3, 0.7, 1.2];

		it('integrates sin(x)/x → Si(x)', () => {
			const result = integrate('sin(x)/x', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			expect(diff(result, 'x').minus('sin(x)/x').expand().isZero()).toBe(true);
		});

		it('integrates cos(x)/x → Ci(x)', () => {
			const result = integrate('cos(x)/x', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			expect(diff(result, 'x').minus('cos(x)/x').expand().isZero()).toBe(true);
		});

		it('integrates e^x/x → Ei(x)', () => {
			const result = integrate('e^x/x', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			expect(diff(result, 'x').minus('e^x/x').expand().isZero()).toBe(true);
		});

		it('integrates 3*sin(x)/x (with coefficient)', () => {
			const result = integrate('3*sin(x)/x', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			expect(diff(result, 'x').minus('3*sin(x)/x').expand().isZero()).toBe(true);
		});

		it('integrates sin(2*x)/x → Si(2*x)', () => {
			const source = 'sin(2*x)/x';
			const result = integrate(source, 'x');
			expect(result.isFunction('integrate')).toBe(false);
			// The symbolic Si derivative currently has incorrect argument scaling.
			const h = 0.00001;
			for (const x of samples) {
				const upper = Number(result.evaluate({ x: x + h }).text({ decimal: true }));
				const lower = Number(result.evaluate({ x: x - h }).text({ decimal: true }));
				const actual = (upper - lower) / (2 * h);
				const expected = Number(Expression.create(source).evaluate({ x }).text({ decimal: true }));
				expect(actual).toBeCloseTo(expected, 7);
			}
		});

		it('integrates cos(3*x)/x → Ci(3*x)', () => {
			const source = 'cos(3*x)/x';
			const result = integrate(source, 'x');
			expect(result.isFunction('integrate')).toBe(false);
			// The symbolic Ci derivative currently has incorrect argument scaling.
			const h = 0.00001;
			for (const x of samples) {
				const upper = Number(result.evaluate({ x: x + h }).text({ decimal: true }));
				const lower = Number(result.evaluate({ x: x - h }).text({ decimal: true }));
				const actual = (upper - lower) / (2 * h);
				const expected = Number(Expression.create(source).evaluate({ x }).text({ decimal: true }));
				expect(actual).toBeCloseTo(expected, 7);
			}
		});
	});

	// ================================================================
	// IBP + special functions: log(x)*f(x) → f(x)-part + Si/Ci/Ei
	// ================================================================
	describe('IBP resolving to special functions', () => {
		it('integrates e^x*log(x) via IBP + Ei', () => {
			const result = integrate('e^x*log(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			expect(diff(result, 'x').minus('e^x*log(x)').expand().isZero()).toBe(true);
		});

		it('integrates sin(x)*log(x) via IBP + Ci', () => {
			const result = integrate('sin(x)*log(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			expect(diff(result, 'x').minus('sin(x)*log(x)').expand().isZero()).toBe(true);
		});

		it('integrates cos(x)*log(x) via IBP + Si', () => {
			const result = integrate('cos(x)*log(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			expect(diff(result, 'x').minus('cos(x)*log(x)').expand().isZero()).toBe(true);
		});
	});

	// ================================================================
	// Rational function integration via partial fractions
	// ================================================================
	describe('rational function integration (partial fractions)', () => {
		const samples = [0.2, 0.7, 1.3];

		it('integrates x^2/(1+x^2) (improper → long division)', () => {
			// x²/(1+x²) = 1 - 1/(1+x²), integral = x - atan(x)
			const result = integrate('x^2/(1+x^2)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			const residual = diff(result, 'x').minus('x^2/(1+x^2)');
			for (const x of samples) {
				const value = Number(residual.evaluate({ x }).text({ decimal: true }));
				expect(Number.isFinite(value)).toBe(true);
				expect(value).toBeCloseTo(0, 8);
			}
		});

		it('integrates x^3/(1+x^2) (improper)', () => {
			// x³/(1+x²) = x - x/(1+x²), integral = x²/2 - (1/2)log(1+x²)
			const result = integrate('x^3/(1+x^2)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			const residual = diff(result, 'x').minus('x^3/(1+x^2)');
			for (const x of samples) {
				const value = Number(residual.evaluate({ x }).text({ decimal: true }));
				expect(Number.isFinite(value)).toBe(true);
				expect(value).toBeCloseTo(0, 8);
			}
		});

		it('integrates 1/((x+1)*(x-1)) via partial fractions', () => {
			// 1/(x²-1) = (1/2)/(x-1) - (1/2)/(x+1)
			const result = integrate('1/(x^2-1)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			const residual = diff(result, 'x').minus('1/(x^2-1)');
			for (const x of samples) {
				const value = Number(residual.evaluate({ x }).text({ decimal: true }));
				expect(Number.isFinite(value)).toBe(true);
				expect(value).toBeCloseTo(0, 8);
			}
		});

		it('integrates (2*x+3)/(x^2+3*x+2) via partial fractions', () => {
			// Denominator factors as (x+1)(x+2)
			const result = integrate('(2*x+3)/(x^2+3*x+2)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			expect(diff(result, 'x').minus('(2*x+3)/(x^2+3*x+2)').expand().isZero()).toBe(true);
		});

		it('integrates 1/(x^2+x) via partial fractions', () => {
			// 1/(x(x+1)) = 1/x - 1/(x+1)
			const result = integrate('1/(x^2+x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			const residual = diff(result, 'x').minus('1/(x^2+x)');
			for (const x of samples) {
				const value = Number(residual.evaluate({ x }).text({ decimal: true }));
				expect(Number.isFinite(value)).toBe(true);
				expect(value).toBeCloseTo(0, 8);
			}
		});

		it('integrates (x+1)/(x^2-x-2) via partial fractions', () => {
			// Denominator factors as (x-2)(x+1)
			const result = integrate('(x+1)/(x^2-x-2)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			const residual = diff(result, 'x').minus('(x+1)/(x^2-x-2)');
			for (const x of samples) {
				const value = Number(residual.evaluate({ x }).text({ decimal: true }));
				expect(Number.isFinite(value)).toBe(true);
				expect(value).toBeCloseTo(0, 8);
			}
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
		const samples = [-0.7, 0.2, 0.8];

		it('integrates x*atan(x)', () => {
			// IBP: u=atan(x), dv=x → remainder ∫x²/(2(1+x²))dx
			// Long division: x²/(1+x²) = 1 - 1/(1+x²)
			const result = integrate('x*atan(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			const residual = diff(result, 'x').minus('x*atan(x)');
			for (const x of samples) {
				const value = Number(residual.evaluate({ x }).text({ decimal: true }));
				expect(Number.isFinite(value)).toBe(true);
				expect(value).toBeCloseTo(0, 8);
			}
		});

		it('integrates x*asin(x)', () => {
			// IBP: u=asin(x), dv=x → remainder involves 1/sqrt(1-x²)
			const result = integrate('x*asin(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			const residual = diff(result, 'x').minus('x*asin(x)');
			for (const x of samples) {
				const value = Number(residual.evaluate({ x }).text({ decimal: true }));
				expect(Number.isFinite(value)).toBe(true);
				expect(value).toBeCloseTo(0, 8);
			}
		});

		it('integrates x*acos(x)', () => {
			const result = integrate('x*acos(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			const residual = diff(result, 'x').minus('x*acos(x)');
			for (const x of samples) {
				const value = Number(residual.evaluate({ x }).text({ decimal: true }));
				expect(Number.isFinite(value)).toBe(true);
				expect(value).toBeCloseTo(0, 8);
			}
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
			expect(diff(result, 'x').minus('x*(3+2*x^2)^(5/2)').expand().isZero()).toBe(true);
		});
	});

	// ================================================================
	// Basic f·f' and f^n·f' product substitution
	// ================================================================
	describe('f^n·f′ detection', () => {
		it('integrates sin(x)*cos(x)', () => {
			const result = integrate('sin(x)*cos(x)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			const residual = diff(result, 'x').minus('sin(x)*cos(x)');
			for (const x of [0.3, 0.7, 1.1]) {
				const value = Number(residual.evaluate({ x }).text({ decimal: true }));
				expect(Number.isFinite(value)).toBe(true);
				expect(value).toBeCloseTo(0, 8);
			}
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
	it('preserves polynomial-power substitution when degree ratios match', () => {
		const result = integrate('2*x*(1+x^2)^3', 'x');
		expect(result.hasFunction('integrate', true)).toBe(false);
		const derivative = nerdamer.diff(result, 'x');
		expect(derivative.minus('2*x*(1+x^2)^3').simplify().text()).toEqual('0');
	});

	it('retains substitution for inverse rational powers', () => {
		const f = Expression.create('(1+x)^-1');
		const derivativeFactor = Expression.create('-(1+x)^-4');
		const match = bySubstitution([f, derivativeFactor], 'x');
		expect(match).toBeDefined();
		expect(match?.fx.eq(f)).toBe(true);
	});

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
	const samples = [0.2, 0.7, 1.1];

	describe('basic reciprocal trig expressions', () => {
		it('integrates 1/(1+cos(x))', () => {
			// = 1/(2cos²(x/2)) → tan(x/2)
			const result = integrate('(1+cos(x))^(-1)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			const residual = diff(result, 'x').minus('(1+cos(x))^(-1)');
			for (const x of samples) {
				const value = Number(residual.evaluate({ x }).text({ decimal: true }));
				expect(Number.isFinite(value)).toBe(true);
				expect(value).toBeCloseTo(0, 8);
			}
		});

		it('integrates 1/(1-cos(x))', () => {
			// = 1/(2sin²(x/2)) → -cot(x/2)
			const result = integrate('(1-cos(x))^(-1)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			const residual = diff(result, 'x').minus('(1-cos(x))^(-1)');
			for (const x of samples) {
				const value = Number(residual.evaluate({ x }).text({ decimal: true }));
				expect(Number.isFinite(value)).toBe(true);
				expect(value).toBeCloseTo(0, 8);
			}
		});

		it('integrates 1/(1+sin(x))', () => {
			const result = integrate('(1+sin(x))^(-1)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			const residual = diff(result, 'x').minus('(1+sin(x))^(-1)');
			for (const x of samples) {
				const value = Number(residual.evaluate({ x }).text({ decimal: true }));
				expect(Number.isFinite(value)).toBe(true);
				expect(value).toBeCloseTo(0, 8);
			}
		});

		it('integrates 1/(1-sin(x))', () => {
			const result = integrate('(1-sin(x))^(-1)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			const residual = diff(result, 'x').minus('(1-sin(x))^(-1)');
			for (const x of samples) {
				const value = Number(residual.evaluate({ x }).text({ decimal: true }));
				expect(Number.isFinite(value)).toBe(true);
				expect(value).toBeCloseTo(0, 8);
			}
		});
	});

	it('integrates a linear numerator over a squared quadratic', () => {
		const input = '(2+2*x)/(x^2-2*x-1)^2';
		const result = integrate(input, 'x');
		expect(result.hasFunction('integrate', true)).toBe(false);
		const h = 0.00001;
		// Stay outside the quadratic roots: 1 ± sqrt(2).
		for (const x of [3, 4, 5]) {
			const upper = Number(result.evaluate({ x: x + h }).text({ decimal: true }));
			const lower = Number(result.evaluate({ x: x - h }).text({ decimal: true }));
			const actual = (upper - lower) / (2 * h);
			const expected = Number(nerdamer(input).evaluate({ x }).text({ decimal: true }));
			expect(actual).toBeCloseTo(expected, 5);
		}
	});

	describe('general rational-in-trig', () => {
		it('integrates 1/(2+cos(x))', () => {
			// Denominator is a+b*cos(x) with a≠b → atan result
			const result = integrate('(2+cos(x))^(-1)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			const residual = diff(result, 'x').minus('(2+cos(x))^(-1)');
			for (const x of samples) {
				const value = Number(residual.evaluate({ x }).text({ decimal: true }));
				expect(Number.isFinite(value)).toBe(true);
				expect(value).toBeCloseTo(0, 8);
			}
		});

		it('integrates 1/(sin(x)+cos(x))', () => {
			const result = integrate('(sin(x)+cos(x))^(-1)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			const residual = diff(result, 'x').minus('(sin(x)+cos(x))^(-1)');
			for (const x of samples) {
				const value = Number(residual.evaluate({ x }).text({ decimal: true }));
				expect(Number.isFinite(value)).toBe(true);
				expect(value).toBeCloseTo(0, 8);
			}
		});
	});

	it('integrates the squared reciprocal of sin(x)+cos(x)', () => {
		const input = Expression.create('(sin(x)+cos(x))^(-2)');
		const result = integrate(input, 'x');
		expect(result.hasFunction('integrate', true)).toBe(false);

		const h = 0.00001;
		for (const x of [0.2, 0.7, 1.1]) {
			const upper = Number(result.evaluate({ x: x + h }).text({ decimal: true }));
			const lower = Number(result.evaluate({ x: x - h }).text({ decimal: true }));
			const actual = (upper - lower) / (2 * h);
			const expected = Number(input.evaluate({ x }).text({ decimal: true }));
			expect(actual).toBeCloseTo(expected, 5);
		}
	});

	describe('with composite arguments', () => {
		it('integrates 1/(1+cos(2*x))', () => {
			// Argument is 2x → t = tan(x), Jacobian adjusted by factor 2
			const result = integrate('(1+cos(2*x))^(-1)', 'x');
			expect(result.isFunction('integrate')).toBe(false);
			const residual = diff(result, 'x').minus('(1+cos(2*x))^(-1)');
			for (const x of samples) {
				const value = Number(residual.evaluate({ x }).text({ decimal: true }));
				expect(Number.isFinite(value)).toBe(true);
				expect(value).toBeCloseTo(0, 8);
			}
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
			expect(diff(result, 'x').minus('e^x*sin(x)').expand().isZero()).toBe(true);
		});
	});
});

describe('Integration regressions', () => {
	// Regression: https://github.com/together-science/nerdamer-prime/issues/61
	it('integrates sqrt(x^2-1) to a valid antiderivative', () => {
		const antiderivative = nerdamer.integrate('sqrt(x^2-1)', 'x').text();
		const derivative = nerdamer.diff(antiderivative, 'x').text();
		const residual = Expression.create(`(${derivative})-sqrt(x^2-1)`).simplify().text();
		expect(residual).toEqual('0');
	});

	// Legacy umbrella issue #181
	it('integrates a linear exponential with a complex coefficient', () => {
		const input = Expression.create('e^((1+i)*x)');
		const antiderivative = nerdamer.integrate(input, 'x');

		expect(antiderivative.isFunction('integrate')).toBe(false);
		expect(nerdamer.diff(antiderivative, 'x').minus(input).simplify().text()).toEqual('0');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/680
	it('integrates 1/(1+cos(x)) correctly', () => {
		expect(nerdamer.integrate('1/(cos(x)+1)', 'x').text()).toEqual('tan((1/2)*x)');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/593
	it('integrates parameters independent of the integration variable', () => {
		expect(nerdamer.defint('z', 'x', 0, 1).text()).toEqual('z');
		expect(nerdamer.defint('2*z', 'x', 1, 4).text()).toEqual('6*z');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/458
	it('does not exhaust the adaptive integral budget as relative tolerance subdivides', () => {
		const actual = Number(nerdamer.defint('x^x^2', 'x', 0, 5).text());
		const expected = 14333753291845831;
		expect(Number.isFinite(actual)).toBe(true);
		expect(Math.abs((actual - expected) / expected)).toBeLessThan(1e-12);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/421
	it('integrates through an integrable logarithmic endpoint singularity', () => {
		const actual = Number(nerdamer.defint('log(x)', 'x', 0, 1).text());

		expect(Number.isFinite(actual)).toBe(true);
		expect(Math.abs(actual + 1)).toBeLessThan(1e-10);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/354
	it('differentiates and integrates expressions affected by division', () => {
		const derivative = nerdamer.diff('sqrt(x)-1/sqrt(x)', 'x');
		const expectedDerivative = Expression.create('(1/2)*x^(-1/2)+(1/2)*x^(-3/2)');
		const antiderivative = nerdamer.integrate('asin(a*x)', 'x');
		const residual = nerdamer
			.diff(antiderivative, 'x')
			.minus('asin(a*x)')
			.evaluate({ a: '1/2', x: '1/2' });

		expect(derivative.minus(expectedDerivative).text()).toEqual('0');
		expect(Number(residual.text({ decimal: true }))).toBeCloseTo(0, 12);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/396
	it('preserves multiplicative constants in indefinite and definite integrals', () => {
		const antiderivative = nerdamer.integrate('(x+1)/100', 'x');
		const derivativeResidual = nerdamer.diff(antiderivative, 'x').minus('(x+1)/100');
		const definite = Number(nerdamer.defint('(x+1)/100', 'x', 0, 1).text({ decimal: true }));

		expect(derivativeResidual.text()).toEqual('0');
		expect(definite).toBeCloseTo(3 / 200, 12);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/74
	it('retains the accepted equivalent antiderivatives', () => {
		const cases: Array<[string, Record<string, string | number>]> = [
			['x*asin(x)', { x: '1/3' }],
			['q/((2-3*x^2)^(1/2))', { x: '1/3', q: 5 }],
			['x*(x+a)^3', { x: '1/3', a: 2 }],
			['8*x^3/(6*x^2+3*a^2)', { x: '1/3', a: 2 }],
			['log(a*x+b)', { x: '1/3', a: 2, b: 3 }],
			['t*log(x)^3', { x: '1/3', t: 5 }],
			['5*x*e^(-8*a*x^2)', { x: '1/3', a: 2 }],
			['(x+7)/(x+1)^3', { x: '1/3' }],
		];

		for (const [input, values] of cases) {
			const antiderivative = nerdamer.integrate(input, 'x');
			expect(antiderivative.isFunction('integrate')).toBe(false);
			const residual = nerdamer.diff(antiderivative, 'x').minus(input).evaluate(values);
			expect(residual.isNearlyZero()).toBe(true);
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/110
	it('does not return a false elementary antiderivative for cos(x^2)', () => {
		const actual = Expression.create('integrate(cos(x^2),x)');

		expect(actual.text()).toEqual('integrate(cos(x^2), x)');
		expect(actual.eq(Expression.create('sin(x^2)'))).toBe(false);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/312
	it('integrates symbolic constants without corrupting their value', () => {
		const result = nerdamer('integrate(sqrt(6),x)');
		expect(result.eq(nerdamer('sqrt(6)*x'))).toBe(true);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/336
	it('integrates the symmetric logarithmic singularity accurately', () => {
		const result = Number(
			nerdamer
				.defint('log(2*cos(x/2))', 'x', -Math.PI, Math.PI)
				.text({ decimal: true })
		);
		expect(Number.isFinite(result)).toBe(true);
		expect(Math.abs(result)).toBeLessThan(1e-8);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/513
	it('integrates a decimal-base exponential over finite bounds', () => {
		const actual = Number(nerdamer.defint('2.7^x', 'x', 1, 3).text({ decimal: true }));

		expect(actual).toBeCloseTo(17.0983837749, 9);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/544
	it('returns valid antiderivatives for the reported trig-power integrals', () => {
		const firstSource = Expression.create('3*sin(2*x)*cos(x)^4');
		const secondSource = Expression.create('3*sin(2*x)*sin(x)^4');
		const firstDerivative = nerdamer.diff(nerdamer.integrate(firstSource, 'x'), 'x');
		const secondDerivative = nerdamer.diff(nerdamer.integrate(secondSource, 'x'), 'x');
		const samples = [0.2, 0.7, 1.1];

		for (const x of samples) {
			const firstActual = Number(firstDerivative.evaluate({ x }).text({ decimal: true }));
			const firstExpected = Number(firstSource.evaluate({ x }).text({ decimal: true }));
			const secondActual = Number(secondDerivative.evaluate({ x }).text({ decimal: true }));
			const secondExpected = Number(secondSource.evaluate({ x }).text({ decimal: true }));

			expect(firstActual).toBeCloseTo(firstExpected, 12);
			expect(secondActual).toBeCloseTo(secondExpected, 12);
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/593
	it('integrates a parameter over another variable without replacing it by a number', () => {
		expect(nerdamer.defint('z', 'x', 0, 1).text()).toEqual('z');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/625
	it('computes the definite integral of sqrt(4*x^2+4) correctly', () => {
		const actual = Number(
			nerdamer.defint('sqrt(4*x^2+4)', 'x', 0, 3).evaluate().text({ decimal: true })
		);
		const expected = 3 * Math.sqrt(10) + Math.asinh(3);

		expect(actual).toBeCloseTo(expected, 12);
	});
});

describe('repeated quadratic integration with symbolic numerators', () => {
	it.each([
		'(m*x+n)/(x^2+1)^2',
		'(m*x+n)/(x^2-2)^2',
	])('retains symbolic numerator coefficients: %s', source => {
		const result = integrate(source, 'x');
		expect(result.hasFunction('integrate', true)).toBe(false);
		const derivative = diff(result, 'x');
		for (const x of [-0.75, 0, 0.5, 2]) {
			const values = { x, m: 3, n: 5 };
			const expected = Number(Expression.create(source).evaluate(values).text({ decimal: true }));
			const actual = Number(derivative.evaluate(values).text({ decimal: true }));
			expect(actual).toBeCloseTo(expected, 7);
		}
	});
});

describe('rational integration with quadratic denominators', () => {
	it.each([
		'(3*x+2)/(2*x^2+3*x+5)',
		'(2*x+1)/(x^2+2*x+2)^2',
		'1/(1+x^2)^3',
		'1/(1+x^2)^4',
	])('integrates positive-definite quadratic denominators: %s', source => {
		const result = integrate(source, 'x');
		expect(result.hasFunction('integrate', true)).toBe(false);
		const derivative = diff(result, 'x');
		for (const x of [-2, -1, 0, 0.5, 1, 3]) {
			const expected = Number(Expression.create(source).evaluate({ x }).text({ decimal: true }));
			const actual = Number(derivative.evaluate({ x }).text({ decimal: true }));
			expect(actual).toBeCloseTo(expected, 7);
		}
	});

	it.each([
		'1/(x^2-2)',
		'1/(x^2-2)^2',
		'(2*x+1)/(x^2-2)',
	])('retains the real-root quadratic branch: %s', source => {
		const result = integrate(source, 'x');
		expect(result.hasFunction('integrate', true)).toBe(false);
		const derivative = diff(result, 'x');
		for (const x of [0, 0.25, 0.5, 0.75, 1]) {
			const expected = Number(Expression.create(source).evaluate({ x }).text({ decimal: true }));
			const actual = Number(derivative.evaluate({ x }).text({ decimal: true }));
			expect(actual).toBeCloseTo(expected, 7);
		}
	});
});

describe('quadratic rational fallback parity', () => {
	it.each([
		{ source: '(2*x+1)/(x^2+2*x+1)', values: { m: 2, n: 1 }, samples: [0, 0.5, 2] },
		{ source: '1/(x^2-2*x+1)', values: { m: 2, n: 1 }, samples: [-1, 0, 0.5, 2] },
		{ source: '(m*x+n)/(x^2+1)', values: { m: 3, n: 5 }, samples: [-2, -0.5, 0, 2] },
		{ source: '(m*x+n)/(x^2-2)', values: { m: 3, n: 5 }, samples: [-3, -0.5, 0, 0.5, 3] },
		{ source: '(3*x+1)/(2*x^2-3*x-2)', values: { m: 3, n: 1 }, samples: [-2, -1, 0, 1, 3] },
	])('matches the derivative across supported quadratic branches: $source', ({ source, values, samples }) => {
		const result = integrate(source, 'x');
		expect(result.hasFunction('integrate', true)).toBe(false);
		const derivative = diff(result, 'x');
		for (const x of samples) {
			const input = { ...values, x };
			const expected = Number(Expression.create(source).evaluate(input).text({ decimal: true }));
			const actual = Number(derivative.evaluate(input).text({ decimal: true }));
			expect(actual).toBeCloseTo(expected, 7);
		}
	});
});

describe('PMInt and rational integrator coverage comparison', () => {
	it.each([
		'1/(x^2+1)',
		'(2*x+1)/(x^2+1)^2',
		'(x^3+2*x+1)/(x^2+1)',
		'(m*x+n)/(x^2+1)',
		'1/(x^3+x)',
		'1/(x^4+1)',
	])('preserves rational antiderivatives across strategies: %s', source => {
		const input = Expression.create(source);
		const candidates = [integrate(input, 'x'), pmintRational(input, 'x')];
		for (const candidate of candidates) {
			if (candidate === undefined || candidate.hasFunction('integrate', true)) {
				continue;
			}
			const derivative = diff(candidate, 'x');
			for (const x of [0.25, 0.5, 1, 2]) {
				const substitutions = { x, m: 3, n: 5 };
				const expected = Number(input.evaluate(substitutions).text({ decimal: true }));
				const actual = Number(derivative.evaluate(substitutions).text({ decimal: true }));
				expect(actual).toBeCloseTo(expected, 7);
			}
		}
		expect(candidates[0]!.hasFunction('integrate', true)).toBe(false);
	});
});

describe('PMInt powered generator discovery', () => {
	it.each([
		'(x*exp(x))^(-1)',
		'(exp(x)+x)^(-1)',
	])('does not split an outer-powered expression into terms or factors: %s', source => {
		expect(pmintPolynomial(source, 'x')).toBeUndefined();
	});
});

describe('PMInt generator integration fallback', () => {
	it.each([
		'(1+2*x+3*x^2)*exp(x)',
		'(1+2*x^2)*exp(x^2)',
		'(2*x+3*x^4)*exp(x^3)',
		'cos(log(x))',
		'x*cos(log(x))',
		'sin(log(x))/x^2',
	])('integrates derivative-closed generators: %s', source => {
		const result = integrate(source, 'x');
		expect(result.hasFunction('integrate', true)).toBe(false);
		const derivative = diff(result, 'x');
		for (const x of [0.5, 1, 2, 3]) {
			const expected = Number(Expression.create(source).evaluate({ x }).text({ decimal: true }));
			const actual = Number(derivative.evaluate({ x }).text({ decimal: true }));
			expect(actual).toBeCloseTo(expected, 7);
		}
	});

	it('leaves exp(x^2) unresolved', () => {
		expect(integrate('exp(x^2)', 'x').hasFunction('integrate', true)).toBe(true);
	});
});

describe('radical substitution with rational PMInt integration', () => {
	it.each([
		'1/(sqrt(x)*(1+sqrt(x)))',
		'1/(sqrt(x)*(1+x))',
		'1/(1+sqrt(x))',
	])('integrates the transformed rational function: %s', source => {
		const result = integrate(source, 'x');
		expect(result.hasFunction('integrate', true)).toBe(false);
		const derivative = diff(result, 'x');
		for (const x of [0.25, 0.5, 1, 2, 4, 9]) {
			const expected = Number(Expression.create(source).evaluate({ x }).text({ decimal: true }));
			const actual = Number(derivative.evaluate({ x }).text({ decimal: true }));
			expect(actual).toBeCloseTo(expected, 7);
		}
	});
});

describe('PMInt algebraic quartic fallback', () => {
	it.each([
		'1/(x^4+1)',
		'x/(x^4+1)',
		'x^2/(x^4+1)',
		'1/(x^4+4)',
		'1/(x^4+2*x^2+1)',
	])('integrates rational quartics requiring real quadratic factors: %s', source => {
		const result = integrate(source, 'x');
		expect(result.hasFunction('integrate', true)).toBe(false);
		const derivative = diff(result, 'x');
		for (const x of [-3, -2, -1, -0.5, 0, 0.5, 1, 2, 3]) {
			const expected = Number(Expression.create(source).evaluate({ x }).text({ decimal: true }));
			const actual = Number(derivative.evaluate({ x }).text({ decimal: true }));
			expect(actual).toBeCloseTo(expected, 7);
		}
	});
});

describe('wrapped-factor substitution skips unrelated factors', () => {
	it.each(['x*cos(x^2)', 'x*exp(x^2)'])('still integrates wrapped factors: %s', source => {
		const value = Expression.create(source);
		const result = tryIntegrateByWrappedFactorSubstitution(value, value.elementsArray(), 'x');
		expect(result).toBeDefined();
		const derivative = diff(result!, 'x');
		for (const x of [-2, -1, 0, 0.5, 1, 2]) {
			const expected = Number(value.evaluate({ x }).text({ decimal: true }));
			const actual = Number(derivative.evaluate({ x }).text({ decimal: true }));
			expect(actual).toBeCloseTo(expected, 7);
		}
	});

	it.each(['x*(x+1)', 'x*log(x)'])('rejects products without an eligible wrapped derivative: %s', source => {
		const value = Expression.create(source);
		expect(tryIntegrateByWrappedFactorSubstitution(value, value.elementsArray(), 'x')).toBeUndefined();
	});
});

describe('shared quotient substitution matching', () => {
	it.each([
		{ source: '2*x/(1+x^2)', base: '1+x^2', constant: '1' },
		{ source: '3*cos(x)/sin(x)', base: 'sin(x)', constant: '3' },
	])('retains logarithmic quotient matching: $source', ({ source, base, constant }) => {
		const match = matchLogSubstitution(Expression.create(source), 'x');
		expect(match).toBeDefined();
		expect(match!.fx.eq(Expression.create(base))).toBe(true);
		expect(match!.constant.eq(Expression.create(constant))).toBe(true);
	});

	it.each([
		{ source: 'x/(1+x^2)^2', power: '2' },
		{ source: 'x/sqrt(1+x^2)', power: '1/2' },
	])('retains nonlogarithmic powers: $source', ({ source, power }) => {
		const match = matchPowerSubstitution(Expression.create(source), 'x');
		expect(match).toBeDefined();
		expect(match!.power.eq(Expression.create(power))).toBe(true);
	});

	it('keeps logarithmic and power substitution cases disjoint', () => {
		const value = Expression.create('2*x/(1+x^2)');
		expect(matchPowerSubstitution(value, 'x')).toBeUndefined();
		expect(matchLogSubstitution(value, 'x')).toBeDefined();
	});
});

describe('powered rational quotient decomposition', () => {
	it.each([
		'x^3/(1+x^2)^2',
		'(x^4+2*x^2+1)/(1+x^2)^2',
		'x^5/(1+x^2)^3',
	])('preserves resolved powered-denominator integrals: %s', source => {
		const value = Expression.create(source);
		const antiderivative = integrate(value, 'x');
		expect(antiderivative.hasFunction('integrate', true)).toBe(false);
		const derivative = diff(antiderivative, 'x');
		for (const x of [-3, -1, 0, 0.5, 1, 3]) {
			const expected = Number(value.evaluate({ x }).text({ decimal: true }));
			const actual = Number(derivative.evaluate({ x }).text({ decimal: true }));
			expect(actual).toBeCloseTo(expected, 7);
		}
	});
});

describe('Weierstrass rational matcher delegation', () => {
	it.each([
		'1/(2+cos(x))',
		'1/(1+sin(x))',
		'1/(1+cos(2*x))',
	])('retains the transformed rational integral: %s', source => {
		const input = Expression.create(source);
		const result = integrate(input, 'x');
		expect(result.hasFunction('integrate', true)).toBe(false);
		const derivative = diff(result, 'x');
		for (const x of [0.2, 0.5, 1.1]) {
			const expected = Number(input.evaluate({ x }).text({ decimal: true }));
			const actual = Number(derivative.evaluate({ x }).text({ decimal: true }));
			expect(actual).toBeCloseTo(expected, 6);
		}
	});
});

describe('powered wrapped-product regression', () => {
	it('does not drop the outer reciprocal power in wrapped-factor substitution', () => {
		const source = Expression.create('(x*cos(x^2))^(-1)');
		const result = integrate(source, 'x');
		if (!result.hasFunction('integrate', true)) {
			const derivative = diff(result, 'x');
			for (const x of [0.5, 1, 1.5]) {
				const expected = Number(source.evaluate({ x }).text({ decimal: true }));
				const actual = Number(derivative.evaluate({ x }).text({ decimal: true }));
				expect(actual).toBeCloseTo(expected, 7);
			}
		}
	});
});

describe('reciprocal product substitution regression', () => {
	it.each([
		'1/(x^3+x)',
		'1/(x^3-2*x)',
		'1/(x^3-x)',
		'x/(x^3-x)',
	])('does not treat a factored reciprocal as an ordinary product: %s', source => {
		const expression = Expression.create(source);
		expect(matchProductSubstitution(expression, 'x')).toBeUndefined();

		const result = integrate(expression, 'x');
		expect(result.hasFunction('integrate', true)).toBe(false);
		const derivative = diff(result, 'x');
		for (const x of [0.2, 0.5, 0.8, 1.2, 2.5]) {
			const expected = Number(expression.evaluate({ x }).text({ decimal: true }));
			const actual = Number(derivative.evaluate({ x }).text({ decimal: true }));
			expect(actual).toBeCloseTo(expected, 7);
		}
	});
});

describe('Verified rational integration fallback', () => {
	it.each([
		'2*x/(x^2+1)',
		'1/(x^2+1)',
		'1/(x^2-1)',
	] as const)('returns a supported antiderivative for %s', source => {
		const result = integrate(source, 'x');
		expect(result.hasFunction('logrootsum', true)).toBe(false);
		expect(result.hasFunction('integrate', true)).toBe(false);
		const residual = diff(result, 'x').minus(Expression.create(source));
		const normalized = residual.simplify();
		expect(normalized.isZero()).toBe(true);
	});
});


describe('Rational quartic integration regressions', () => {
	it.each([
		'(x+1)/((x^2+1)*(x^2+2))',
		'(x^2+2)/((x^2+x+1)*(x^2+2*x+3))',
		'1/(x^4+1)',
	] as const)('differentiates its antiderivative back to %s', source => {
		const input = Expression.create(source);
		const result = integrate(input, 'x');
		expect(result.hasFunction('integrate', true)).toBe(false);
		const derivative = diff(result, 'x');
		for (const x of [0.2, 0.6, 1.1]) {
			const expected = Number(input.evaluate({ x }).text({ decimal: true }));
			const actual = Number(derivative.evaluate({ x }).text({ decimal: true }));
			expect(actual).toBeCloseTo(expected, 7);
		}
	});
});

describe('Exponential and trig substitution screening', () => {
	it.each([
		'e^x*tan(x)',
		'e^x*sec(x)',
		'e^x*csc(x)',
		'e^x*cot(x)',
	])('does not match an unrelated exponential-trig derivative pair: %s', source => {
		const expr = Expression.create(source);
		expect(matchProductSubstitution(expr, 'x')).toBeUndefined();
		expect(integrate(expr, 'x').hasFunction('integrate', true)).toBe(true);
	});

	it('retains exponential substitution when the trig factor is the derivative', () => {
		const source = Expression.create('cos(x)*e^sin(x)');
		const antiderivative = integrate(source, 'x');
		expect(antiderivative.hasFunction('integrate', true)).toBe(false);
		const derivative = diff(antiderivative, 'x');
		for (const x of [0.2, 0.5, 1.1]) {
			const expected = Number(source.evaluate({ x }).text({ decimal: true }));
			const actual = Number(derivative.evaluate({ x }).text({ decimal: true }));
			expect(actual).toBeCloseTo(expected, 7);
		}
	});

	it('retains polynomial-exponential substitution', () => {
		const expr = Expression.create('x*e^(x^2)');
		const antiderivative = integrate(expr, 'x');
		expect(antiderivative.hasFunction('integrate', true)).toBe(false);
		expect(diff(antiderivative, 'x').minus(expr).simplify().isZero()).toBe(true);
	});
});

describe('Hyperbolic substitution screening', () => {
	it('skips derivative-pair searches across different arguments', () => {
		const expr = Expression.create('cosh(2*x)*sinh(3*x)');
		expect(matchProductSubstitution(expr, 'x')).toBeUndefined();
		expect(integrate(expr, 'x').hasFunction('integrate', true)).toBe(true);
	});

	it('retains derivative pairs with a shared argument', () => {
		const expr = Expression.create('cosh(2*x)*sinh(2*x)');
		expect(matchProductSubstitution(expr, 'x')).toBeDefined();
		const antiderivative = integrate(expr, 'x');
		expect(antiderivative.hasFunction('integrate', true)).toBe(false);
		expect(diff(antiderivative, 'x').minus(expr).simplify().isZero()).toBe(true);
	});
});

describe('Quotient substitution screening', () => {
	it.each([
		'e^x*tan(x)',
		'e^x*sec(x)',
		'e^x*csc(x)',
		'e^x*cot(x)',
	])('skips quotient matching without a denominator: %s', source => {
		const expr = Expression.create(source);
		expect(matchLogSubstitution(expr, 'x')).toBeUndefined();
		expect(matchPowerSubstitution(expr, 'x')).toBeUndefined();
	});
});
