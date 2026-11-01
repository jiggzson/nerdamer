import { integrate } from '../../../src/calculus/integrate/integrate';
import { tableOfIntegrals } from '../../../src/calculus/integrate/integrationTable';
import { Pattern } from '../../../src/core/converters/Pattern';
import { tryIntegrateByParts } from '../../../src/calculus/integrate/byParts';
import { tryIntegrateByWrappedFactorSubstitution } from '../../../src/calculus/integrate/bySubstitution';
import { tryIntegrateLogPower, tryRadicalSubstitution, tryIntegrateByWeierstrass } from '../../../src/calculus/integrate/algorithms/strategies';
import { tryIntegrateRational, tryIntegratePowerQuotient } from '../../../src/calculus/integrate/algorithms/rationalIntegration';
import { diff } from '../../../src/calculus/derivative/diff';
import { Expression } from '../../../src/core/classes/expression/Expression';
import { MAX_INTEGRATION_DEPTH } from '../../../src/calculus/integrate/utils';
import '../../../src/index';

describe('Quadratic rational fallback ownership', () => {
	it.each([
		'1/(x^2+1)',
		'(2*x+1)/(x^2-2*x+3)',
		'x/(x^2+1)^2',
		'x/(x^2+1)^3',
		'(3*x+2)/(2*x^2+3*x+5)',
	])('resolves a proper quadratic without a duplicate PMInt fallback for %s', input => {
		const expr = Expression.create(input);
		const result = tryIntegrateRational(expr, 'x', 1, integrate);
		expect(result).toBeDefined();
		const residual = diff(result!, 'x').minus(expr).expand();
		if (!residual.isZero()) {
			for (const x of [0.2, 0.7, 1.5]) {
				const value = Number(residual.evaluate({ x }).text({ decimal: true }));
				expect(value).toBeCloseTo(0, 7);
			}
		}
	});
});

describe('Integration controller regression coverage', () => {
	it.each([
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
	] as const)('preserves advanced recursive table coverage for %s', input => {
		const result = integrate(input, 'x');
		expect(result.hasFunction('integrate', true)).toBe(false);
		const derivative = diff(result, 'x');
		for (const x of [0.2, 0.6, 1.1]) {
			const expected = Number(Expression.create(input).evaluate({ x }).text({ decimal: true }));
			const actual = Number(derivative.evaluate({ x }).text({ decimal: true }));
			expect(Number.isFinite(actual)).toBe(true);
			expect(actual).toBeCloseTo(expected, 7);
		}
	});

	it('stops recursive integration-table rewrites at the shared depth limit', () => {
		const original = Expression.create('sin(x)^2');
		const result = tableOfIntegrals.lookup(
			new Pattern(original, ['x']),
			MAX_INTEGRATION_DEPTH,
			integrate
		);
		expect(result).toBeDefined();
		expect(result?.hasFunction('integrate', true)).toBe(true);
	});

	it('rejects direct integration-by-parts recursion at the global depth limit', () => {
		const recurse = jest.fn(integrate);
		const result = tryIntegrateByParts(
			Expression.create('x*sin(x)'),
			'x',
			recurse,
			MAX_INTEGRATION_DEPTH
		);
		expect(result).toBeUndefined();
		expect(recurse).not.toHaveBeenCalled();
	});

	it.each([
		['log power', tryIntegrateLogPower, 'log(x)^2'],
		['radical substitution', tryRadicalSubstitution, '1/sqrt(x)'],
		['Weierstrass', tryIntegrateByWeierstrass, '1/(sin(x)+cos(x))'],
		['rational decomposition', tryIntegrateRational, 'x/(x^2+1)'],
		['power quotient', tryIntegratePowerQuotient, 'x/(x^2+1)'],
	] as const)('does not invoke recursion at the strategy depth limit for %s', (_name, strategy, input) => {
		const recurse = jest.fn(integrate);
		expect(strategy(Expression.create(input), 'x', MAX_INTEGRATION_DEPTH, recurse)).toBeUndefined();
		expect(recurse).not.toHaveBeenCalled();
	});

	it('checks rational primitives independently of integration representation', () => {
		const input = Expression.create('x/(x^2-1)');
		const expected = input;
		for (const primitive of [integrate(input, 'x'),
			tryIntegrateRational(input, 'x', 0, integrate)]) {
			expect(primitive).toBeDefined();
			expect(diff(primitive!, 'x').minus(expected).expand().isZero()).toBe(true);
		}
	});

	it('delegates wrapped-factor substitution through the bounded controller', () => {
		const expr = Expression.create('x*cos(x^2)');
		const recurse = jest.fn(integrate);
		const result = tryIntegrateByWrappedFactorSubstitution(
			expr, expr.elementsArray(), 'x', recurse, 1
		);
		expect(result).toBeDefined();
		expect(recurse).toHaveBeenCalled();
		expect(diff(result!, 'x').minus(expr).expand().isZero()).toBe(true);
		recurse.mockClear();
		expect(tryIntegrateByWrappedFactorSubstitution(
			expr, expr.elementsArray(), 'x', recurse, MAX_INTEGRATION_DEPTH
		)).toBeUndefined();
		expect(recurse).not.toHaveBeenCalled();
	});

	it.each([
		'exp(x)*sin(x)',
		'exp(x)*cos(x)',
	])('resolves a finite exponential-trigonometric integration cycle: %s', source => {
		const input = Expression.create(source);
		const result = integrate(input, 'x');
		expect(result.hasFunction('integrate', true)).toBe(false);
		expect(diff(result, 'x').minus(input).expand().isZero()).toBe(true);
	});

	it('preserves a valid partial integral when another summand cannot be integrated', () => {
		const x = Expression.Variable('x');
		const unsupported = Expression.toFunction('unhandledIntegrationProbe', [x]);
		const source = x.plus(unsupported);
		const result = integrate(source, x);
		expect(result.isFunction('integrate')).toBe(false);
		expect(result.hasFunction('integrate', true)).toBe(true);
		const remainder = Expression.toFunction('integrate', [unsupported, x]);
		expect(result.minus(x.pow(2).div(2)).minus(remainder).expand().isZero()).toBe(true);
	});

	it.each([
		'exp(x)*tan(x)',
		'exp(x)*sec(x)',
	])('returns a symbolic integral when an integration-by-parts cycle makes no progress: %s', source => {
		const input = Expression.create(source);
		const result = integrate(input, 'x');
		expect(result.isFunction('integrate')).toBe(true);
		expect(result.getArguments()[0].eq(input)).toBe(true);
		expect(result.getArguments()[1].eq(Expression.Variable('x'))).toBe(true);
	});

	it('leaves an unsupported function unevaluated', () => {
		const variable = Expression.Variable('x');
		const unsupported = Expression.toFunction('unhandledIntegrationProbe', [variable]);
		const result = integrate(unsupported, variable);
		expect(result.isFunction('integrate')).toBe(true);
		expect(result.getArguments()[0].eq(unsupported)).toBe(true);
		expect(result.getArguments()[1].eq(variable)).toBe(true);
	});
});
