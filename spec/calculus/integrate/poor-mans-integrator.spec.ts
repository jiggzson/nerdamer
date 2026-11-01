import { pmintPolynomial, pmintRational, pmintRationalCoefficientMatch } from '../../../src/calculus/integrate/poorMansIntegrator';
import { diff } from '../../../src/calculus/derivative/diff';
import { Expression } from '../../../src/core/classes/expression/Expression';
import '../../../src/index';

describe('PMInt polynomial-ansatz feasibility', () => {
	it.each([
		'exp(x)',
		'x*exp(x)',
		'x^2*exp(x)',
		'(1+2*x+3*x^2)*exp(x)',
		'x^7*exp(x)',
	])('finds and verifies an exponential polynomial antiderivative for %s', source => {
		const result = pmintPolynomial(source, 'x');
		expect(result).toBeDefined();
		expect(diff(result!, 'x').minus(Expression.create(source)).expand().isZero()).toBe(true);
	});

	it('rejects candidate degrees above its limit', () => {
		expect(pmintPolynomial('x^5*exp(x)', 'x', 3)).toBeUndefined();
	});

	it('does not claim unsupported rational integrals', () => {
		expect(pmintPolynomial('1/(1+x^2)', 'x')).toBeUndefined();
	});
});

describe('PMInt constant-base exponential generators', () => {
	it.each([
		'2^x',
		'x*2^x',
		'x^2*3^(2*x)',
		'x^3*2^x',
	])('matches exponential generators with non-Euler bases: %s', source => {
		const result = pmintPolynomial(source, 'x');
		expect(result).toBeDefined();
		for (const x of [0.2, 0.7, 1.5, 2.5]) {
			const expected = Number(Expression.create(source).evaluate({ x }).text({ decimal: true }));
			const actual = Number(diff(result!, 'x').evaluate({ x }).text({ decimal: true }));
			expect(actual).toBeCloseTo(expected, 7);
		}
	});

	it('does not treat a variable exponential base as a constant', () => {
		expect(pmintPolynomial('x^x', 'x')).toBeUndefined();
	});
});

describe('PMInt coupled trigonometric polynomial ansatz', () => {
	it.each([
		'sin(x)',
		'cos(x)',
		'x*sin(x)',
		'x*cos(x)',
		'x^2*sin(x)+x*cos(x)',
	])('finds and verifies a coupled antiderivative for %s', source => {
		const result = pmintPolynomial(source, 'x');
		expect(result).toBeDefined();
		expect(diff(result!, 'x').minus(Expression.create(source)).expand().isZero()).toBe(true);
	});

	it('rejects degrees above the configured limit', () => {
		expect(pmintPolynomial('x^5*sin(x)', 'x', 3)).toBeUndefined();
	});

	it('rejects functions outside the supported derivative families', () => {
		expect(pmintPolynomial('log(x)', 'x')).toBeUndefined();
	});
});

describe('PMInt mixed derivative families', () => {
	it.each([
		'exp(x)+sin(x)',
		'x*exp(x)+x*cos(x)',
		'x^2*exp(x)+x*sin(x)+cos(x)',
	])('integrates multiple derivative-closed families for %s', source => {
		const result = pmintPolynomial(source, 'x');
		expect(result).toBeDefined();
		expect(diff(result!, 'x').minus(Expression.create(source)).expand().isZero()).toBe(true);
	});
});

describe('PMInt linear-argument generators', () => {
	it.each([
		'x*exp(2*x)',
		'x^2*exp(-3*x)',
		'x*sin(2*x)',
		'x*cos(3*x)',
		'x*sin(2*x)+cos(2*x)',
		'x*exp(2*x)+x*cos(3*x)',
	])('derives generators from %s', source => {
		const result = pmintPolynomial(source, 'x');
		expect(result).toBeDefined();
		expect(diff(result!, 'x').minus(Expression.create(source)).expand().isZero()).toBe(true);
	});

	it('does not assume a constant derivative for nonlinear arguments', () => {
		expect(pmintPolynomial('sin(x^2)', 'x')).toBeUndefined();
		expect(pmintPolynomial('exp(x^2)', 'x')).toBeUndefined();
	});
});

describe('PMInt rational generator rates', () => {
	it.each([
		'cos(log(x))',
		'sin(log(x))',
		'cos(log(x))+sin(log(x))',
		'x*cos(log(x))',
		'x*sin(log(x))',
		'sin(log(x))/x',
		'cos(log(x))/x',
	])('clears rational rates to integrate %s', source => {
		const result = pmintPolynomial(source, 'x');
		expect(result).toBeDefined();
		for (const x of [0.4, 0.8, 1.5, 3]) {
			const expected = Number(Expression.create(source).evaluate({ x }).text({ decimal: true }));
			const actual = Number(diff(result!, 'x').evaluate({ x }).text({ decimal: true }));
			expect(actual).toBeCloseTo(expected, 8);
		}
	});

	it.each([
		'sin(log(x))/x^2',
		'cos(log(x))/x^2',
		'sin(log(x+1))/(x+1)^2',
		'cos(log(x+1))/(x+1)^2',
	])('finds rational generator coefficients for %s', source => {
		const result = pmintPolynomial(source, 'x');
		expect(result).toBeDefined();
		for (const x of [0.4, 0.8, 1.5, 3]) {
			const expected = Number(Expression.create(source).evaluate({ x }).text({ decimal: true }));
			const actual = Number(diff(result!, 'x').evaluate({ x }).text({ decimal: true }));
			expect(actual).toBeCloseTo(expected, 8);
		}
	});

	it.each(['sin(1/x)', 'cos(1/x)'])(
		'does not claim a polynomial-coefficient answer for %s', source => {
			expect(pmintPolynomial(source, 'x')).toBeUndefined();
		}
	);
});

describe('PMInt symbolic parameters in derivative families', () => {
	it.each([
		'a*exp(a*x)',
		'x*exp(a*x)',
		'a*cos(a*x)',
		'a*sin(a*x)',
		'2*a*x*exp(a*x^2)',
		'2*a*x*cos(a*x^2)',
	])('integrates generators with parameter a: %s', source => {
		const result = pmintPolynomial(source, 'x');
		expect(result).toBeDefined();
		for (const a of [2, 3]) {
			for (const x of [0.2, 0.6, 1.1]) {
				const expected = Number(Expression.create(source).evaluate({ x, a }).text({ decimal: true }));
				const actual = Number(diff(result!, 'x').evaluate({ x, a }).text({ decimal: true }));
				expect(Number.isFinite(actual)).toBe(true);
				expect(actual).toBeCloseTo(expected, 7);
			}
		}
	});
});

describe('PMInt polynomial derivative rates', () => {
	it.each([
		'2*x*exp(x^2)',
		'(1+2*x^2)*exp(x^2)',
		'(2*x+1)*exp(x^2+x)',
		'2*x*cos(x^2)',
		'2*x*sin(x^2)',
		'sin(x^2)+2*x^2*cos(x^2)',
	])('matches polynomial-rate exponential and trig generators for %s', source => {
		const result = pmintPolynomial(source, 'x');
		expect(result).toBeDefined();
		expect(diff(result!, 'x').minus(Expression.create(source)).expand().isZero()).toBe(true);
	});

	it.each(['sin(x^2)', 'exp(x^2)', 'exp(x^4)'])(
		'does not invent a polynomial-coefficient antiderivative for %s', source => {
			expect(pmintPolynomial(source, 'x')).toBeUndefined();
		}
	);
});

describe('PMInt historical #334 rational regression', () => {
	it('integrates x^2/(x^2+1)^2 and verifies the derivative', () => {
		const source = 'x^2/(x^2+1)^2';
		const antiderivative = pmintRational(source, 'x');
		expect(antiderivative).toBeDefined();
		for (const x of [0, 0.25, 0.7, 1.5, 3]) {
			const expected = Number(Expression.create(source).evaluate({ x }).text({ decimal: true }));
			const actual = Number(diff(antiderivative!, 'x').evaluate({ x }).text({ decimal: true }));
			expect(actual).toBeCloseTo(expected, 8);
		}
	});
});

describe('PMInt rational and logarithmic matching', () => {
	it.each([
		'1/(x+1)',
		'1/(x+1)^2',
		'2*x/(x^2+1)',
		'(1-x^2)/(x^2+1)^2',
		'(2*x)/(x^2+1)+(1-x^2)/(x^2+1)^2',
	])('finds and verifies a rational/logarithmic antiderivative for %s', source => {
		const result = pmintRational(source, 'x');
		expect(result).toBeDefined();
		const derivative = diff(result!, 'x');
		for (const x of [0, 1, 2, 3]) {
			const expected = Number(Expression.create(source).evaluate({ x }).text({ decimal: true }));
			const actual = Number(derivative.evaluate({ x }).text({ decimal: true }));
			expect(Number.isFinite(actual)).toBe(true);
			expect(actual).toBeCloseTo(expected, 8);
		}
	});

	it.each([
		'1/(x^2+1)',
		'1/(4+x^2)',
		'1/(x^2+2*x+2)',
		'(x+1)/(x^2+2*x+2)',
		'(1-x^2)/(1+x^2)^2+1/(1+x^2)',
	])('matches real-quadratic arctangent integrals for %s', source => {
		const result = pmintRational(source, 'x');
		expect(result).toBeDefined();
		const derivative = diff(result!, 'x');
		for (const x of [0, 0.5, 1.25, 2]) {
			const expected = Number(Expression.create(source).evaluate({ x }).text({ decimal: true }));
			const actual = Number(derivative.evaluate({ x }).text({ decimal: true }));
			expect(Number.isFinite(actual)).toBe(true);
			expect(actual).toBeCloseTo(expected, 8);
		}
	});

	it.each([
		'(1-3*x^2)/(1+x^2)^3',
		'(1-x)/(1+x)^3',
		'1/(1+x^2)^3',
		'x/(1+x^2)^3',
		'1/(1+x)^3',
	])('matches rational denominators raised to the third power for %s', source => {
		const result = pmintRational(source, 'x');
		expect(result).toBeDefined();
		const derivative = diff(result!, 'x');
		for (const x of [0, 0.5, 1, 2]) {
			const expected = Number(Expression.create(source).evaluate({ x }).text({ decimal: true }));
			const actual = Number(derivative.evaluate({ x }).text({ decimal: true }));
			expect(Number.isFinite(actual)).toBe(true);
			expect(actual).toBeCloseTo(expected, 8);
		}
	});

	it.each([
		'1/(1+x)^4',
		'1/(1+x)^5',
		'1/(1+x^2)^4',
		'1/(1+x^2)^5',
		'x/(1+x^2)^4',
		'(1-5*x^2)/(1+x^2)^4',
	])('integrates fourth- and fifth-power rational denominators for %s', source => {
		const result = pmintRational(source, 'x');
		expect(result).toBeDefined();
		const derivative = diff(result!, 'x');
		for (const x of [0, 0.5, 1, 2]) {
			const expected = Number(Expression.create(source).evaluate({ x }).text({ decimal: true }));
			const actual = Number(derivative.evaluate({ x }).text({ decimal: true }));
			expect(Number.isFinite(actual)).toBe(true);
			expect(actual).toBeCloseTo(expected, 8);
		}
	});

	it.each([
		'1/(x^2-1)',
		'1/(x^3-x)',
		'1/((x+1)*(x^2+1))',
		'1/((x+1)^2*(x+2))',
		'1/(x^4-1)',
		'1/(x^4+4)',
	])('decomposes distinct rational denominator factors for %s', source => {
		const result = pmintRational(source, 'x');
		expect(result).toBeDefined();
		const derivative = diff(result!, 'x');
		for (const x of [1.5, 2, 3, 4]) {
			const expected = Number(Expression.create(source).evaluate({ x }).text({ decimal: true }));
			const actual = Number(derivative.evaluate({ x }).text({ decimal: true }));
			expect(Number.isFinite(actual)).toBe(true);
			expect(actual).toBeCloseTo(expected, 8);
		}
	});

	it.each([
		'x^3+2*x+1',
		'(x^3+1)/(x^2+1)',
		'(x^4+2*x^2+2)/(x^2+1)',
		'(x^3-x+1)/(x^2-1)',
	])('matches polynomial parts of rational expressions for %s', source => {
		const result = pmintRational(source, 'x');
		expect(result).toBeDefined();
		const derivative = diff(result!, 'x');
		for (const x of [0, 0.5, 2, 3]) {
			const expected = Number(Expression.create(source).evaluate({ x }).text({ decimal: true }));
			const actual = Number(derivative.evaluate({ x }).text({ decimal: true }));
			expect(Number.isFinite(actual)).toBe(true);
			expect(actual).toBeCloseTo(expected, 8);
		}
	});

	it.each([
		['1/(x+sqrt(y))', 'y', 2],
		['(2*x+sqrt(y))/(x^2+sqrt(y)*x+1)', 'y', 2],
		['1/(x+sin(y))', 'y', 1],
	])('integrates rational functions with symbolic coefficient parameters: %s', (source, variable, value) => {
		const result = pmintRational(source, 'x');
		expect(result).toBeDefined();
		const derivative = diff(result!, 'x');
		for (const x of [0, 0.5, 1, 2]) {
			const expected = Number(Expression.create(source).evaluate({ x, [variable]: value }).text({ decimal: true }));
			const actual = Number(derivative.evaluate({ x, [variable]: value }).text({ decimal: true }));
			expect(actual).toBeCloseTo(expected, 8);
		}
	});

	it.each([
		'1/(x^2+sqrt(2)*x+1)',
		'1/(x^2-sqrt(2)*x+1)',
		'(x+sqrt(2))/(x^2+sqrt(2)*x+1)',
	])('integrates quadratic denominators with algebraic coefficients: %s', source => {
		const result = pmintRational(source, 'x');
		expect(result).toBeDefined();
		const derivative = diff(result!, 'x');
		for (const x of [0, 0.5, 1, 2]) {
			const expected = Number(Expression.create(source).evaluate({ x }).text({ decimal: true }));
			const actual = Number(derivative.evaluate({ x }).text({ decimal: true }));
			expect(actual).toBeCloseTo(expected, 8);
		}
	});

	it.each([
		'1/(x^4+1)',
		'x/(x^4+1)',
		'(x^2+1)/(x^4+1)',
		'x^3/(x^4+1)',
		'1/(x^4+2*x^2+4)',
		'(1+x^2)/(x^4+2*x^2+4)',
	])('integrates quartics requiring quadratic factors over radicals: %s', source => {
		const result = pmintRational(source, 'x');
		expect(result).toBeDefined();
		const derivative = diff(result!, 'x');
		for (const x of [-3, -1, -0.5, 0, 0.5, 1, 2, 3]) {
			const expected = Number(Expression.create(source).evaluate({ x }).text({ decimal: true }));
			const actual = Number(derivative.evaluate({ x }).text({ decimal: true }));
			expect(Number.isFinite(actual)).toBe(true);
			expect(actual).toBeCloseTo(expected, 8);
		}
	});

	it.each([
		'sin(x)',
	])('leaves unsupported rational or transcendental input unresolved: %s', source => {
		expect(pmintRational(source, 'x')).toBeUndefined();
	});
});


describe('PMInt real-root quadratic research', () => {
	it.each([
		'1/(x^2-2)',
		'(2*x+1)/(x^2-2)',
		'1/(x^2-2)^2',
	])('matches the rational derivative away from real poles for %s', source => {
		const result = pmintRational(source, 'x');
		expect(result).toBeDefined();
		const derivative = diff(result!, 'x');
		for (const x of [-3, -2, -1, -0.5, 0, 0.5, 1, 2, 3]) {
			const expected = Number(Expression.create(source).evaluate({ x }).text({ decimal: true }));
			const actual = Number(derivative.evaluate({ x }).text({ decimal: true }));
			expect(actual).toBeCloseTo(expected, 7);
		}
	});
});


describe('PMInt rational coefficient-stage separation', () => {
	it.each([
		'x/(x^2-1)',
		'(3*x+2)/(2*x^2+3*x+5)',
		'x/(x^2+1)^3',
	])('matches a derivative-closed rational basis for %s', source => {
		const matched = pmintRationalCoefficientMatch(source, 'x');
		expect(matched).toBeDefined();
		const residual = diff(matched!, 'x').minus(Expression.create(source));
		if (!residual.expand().isZero()) {
			for (const x of [0.2, 0.7, 1.5]) {
				const value = Number(residual.evaluate({ x }).text({ decimal: true }));
				expect(value).toBeCloseTo(0, 7);
			}
		}
	});

	it('does not invoke partial fractions on an unsupported quartic', () => {
		expect(pmintRationalCoefficientMatch('1/(x^4+x^3+x^2+x+1)', 'x')).toBeUndefined();
	});

	it('retains the full PMInt decomposition fallback for a cubic denominator', () => {
		const input = '(x^2+2*x+1)/(x^3-1)';
		expect(pmintRationalCoefficientMatch(input, 'x')).toBeUndefined();
		expect(pmintRational(input, 'x')).toBeDefined();
	});
});
