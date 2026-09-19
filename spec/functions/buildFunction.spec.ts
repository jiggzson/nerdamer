'use strict';

import { Expression } from '../../src/core/classes/expression/Expression';
import { Parser } from '../../src/core/classes/parser/Parser';
import { UnsupportedOperationError } from '../../src/core/errors';
import { definitions } from '../../src/core/functions/build/definitions';

function buildUnary(name: string) {
	return Expression.toFunction(name, [Expression.Variable('x')]).buildFunction(['x']);
}

describe('buildFunction numerical compilation', () => {

	it('registers the supported scalar numerical function surface', () => {
		const supported = [
			'abs',
			'cos', 'sin', 'tan', 'sec', 'csc', 'cot',
			'acos', 'asin', 'atan', 'asec', 'acsc', 'acot', 'atan2',
			'cosh', 'sinh', 'tanh', 'sech', 'csch', 'coth',
			'acosh', 'asinh', 'atanh', 'asech', 'acsch', 'acoth',
			'sqrt', 'cbrt', 'nthroot', 'log', 'exp', 'hypot',
			'round', 'sign', 'floor', 'ceil', 'ceiling', 'trunc', 'mod', 'modinv',
			'max', 'min', 'avg', 'heaviside',
			'realpart', 'imagpart', 'arg', 'conjugate', 'polarform', 'rectform', 'csgn',
			'gcd', 'lcm', 'isprime', 'fib', 'fact', 'factorial', 'dfact',
			'erf', 'erfc', 'gamma', 'sinc', 'Si', 'Shi', 'Ci', 'Chi', 'Ei', 'Li', 'S', 'C',
		];

		for (const name of supported) {
			expect(definitions[name]).toBeDefined();
		}
	});

	it('registers every declared numerical dependency', () => {
		for (const [, [, dependencies]] of Object.entries(definitions)) {
			if (dependencies) {
				for (const dependency of dependencies) {
					expect(definitions[dependency]).toBeDefined();
				}
			}
		}
	});

	it('preserves the established arithmetic and argument-order behavior', () => {
		const naturalOrder = (Parser.parse('x^2+y') as Expression).buildFunction();
		const explicitOrder = (Parser.parse('x-y') as Expression).buildFunction(['y', 'x']);

		expect(naturalOrder(3, 1)).toBe(10);
		expect(explicitOrder(9, 7)).toBe(-2);
	});

	it.each(['x^2+i', 'i*x', 'sin(i*x)', '1/(x+i)'])(
		'rejects complex expression %s before JavaScript compilation',
		source => {
			const expression = Parser.parse(source) as Expression;

			expect(() => expression.buildFunction(['x'])).toThrow(UnsupportedOperationError);
			expect(() => expression.buildFunction(['x'])).toThrow('imaginary unit');
		}
	);

	it.each([
		['acos', 0.25, Math.acos(0.25)],
		['asin', 0.25, Math.asin(0.25)],
		['atan', 0.25, Math.atan(0.25)],
		['asec', 2, Math.acos(0.5)],
		['acsc', 2, Math.asin(0.5)],
		['acot', 2, Math.atan(0.5)],
		['acosh', 2, Math.acosh(2)],
		['asinh', 0.5, Math.asinh(0.5)],
		['atanh', 0.25, Math.atanh(0.25)],
		['asech', 0.5, Math.acosh(2)],
		['acsch', 2, Math.asinh(0.5)],
		['acoth', 2, Math.atanh(0.5)],
	] as const)('links the numerical equivalent for %s', (name, input, expected) => {
		const fn = buildUnary(name);
		expect(fn(input)).toBeCloseTo(expected, 12);
	});

	it('links two-argument elementary functions with the correct argument order', () => {
		const atan2 = Expression.toFunction('atan2', [
			Expression.Variable('y'),
			Expression.Variable('x'),
		]).buildFunction(['y', 'x']);
		const hypot = Expression.toFunction('hypot', [
			Expression.Variable('x'),
			Expression.Variable('y'),
		]).buildFunction(['x', 'y']);

		expect(atan2(1, -1)).toBeCloseTo(Math.atan2(1, -1), 12);
		expect(Number.isNaN(atan2(0, 0))).toBe(true);
		expect(hypot(3, 4)).toBe(5);
	});

	it('honors the optional logarithm base instead of discarding it', () => {
		const fn = Expression.toFunction('log', [Expression.Variable('x'), 2]).buildFunction(['x']);
		expect(fn(8)).toBeCloseTo(3, 12);

		const invalidBase = Expression.toFunction('log', [Expression.Variable('x'), 1]).buildFunction([
			'x',
		]);
		expect(Number.isNaN(invalidBase(8))).toBe(true);
	});

	it('links scalar helpers that can remain symbolic until runtime', () => {
		const cbrt = buildUnary('cbrt');
		const round = Expression.toFunction('round', [Expression.Variable('x'), 2]).buildFunction([
			'x',
		]);
		const roundInteger = buildUnary('round');
		const maximum = Expression.toFunction('max', [Expression.Variable('x'), 2, 5]).buildFunction([
			'x',
		]);
		const minimum = Expression.toFunction('min', [Expression.Variable('x'), 2, 5]).buildFunction([
			'x',
		]);
		const average = Expression.toFunction('avg', [Expression.Variable('x'), 2, 6]).buildFunction([
			'x',
		]);
		const heaviside = buildUnary('heaviside');
		const csgn = buildUnary('csgn');

		expect(cbrt(-8)).toBe(-2);
		expect(round(2.555)).toBeCloseTo(2.56, 12);
		expect(round(-1.5)).toBe(-1.5);
		expect(roundInteger(-1.5)).toBe(-2);
		expect(maximum(9)).toBe(9);
		expect(minimum(-3)).toBe(-3);
		expect(average(4)).toBe(4);
		expect(heaviside(-1)).toBe(0);
		expect(heaviside(0)).toBe(0.5);
		expect(heaviside(1)).toBe(1);
		expect(csgn(-4)).toBe(-1);
	});

	it('links complex-component helpers for real JavaScript-number inputs', () => {
		const realpart = buildUnary('realpart');
		const imagpart = buildUnary('imagpart');
		const argument = buildUnary('arg');
		const conjugate = buildUnary('conjugate');
		const polarform = buildUnary('polarform');
		const rectform = buildUnary('rectform');

		expect(realpart(-3)).toBe(-3);
		expect(imagpart(-3)).toBe(0);
		expect(argument(3)).toBe(0);
		expect(argument(-3)).toBe(Math.PI);
		expect(conjugate(-3)).toBe(-3);
		expect(polarform(-3)).toBe(-3);
		expect(rectform(-3)).toBe(-3);
	});

	it('links integer helpers and their transitive dependencies', () => {
		const gcd = Expression.toFunction('gcd', [Expression.Variable('x'), 18]).buildFunction(['x']);
		const lcm = Expression.toFunction('lcm', [Expression.Variable('x'), 6]).buildFunction(['x']);
		const modinv = Expression.toFunction('modinv', [Expression.Variable('x'), 7]).buildFunction([
			'x',
		]);
		const isprime = buildUnary('isprime');
		const fib = buildUnary('fib');
		const fact = buildUnary('fact');
		const dfact = buildUnary('dfact');

		expect(gcd(0)).toBe(18);
		expect(gcd(12)).toBe(6);
		expect(lcm(4)).toBe(12);
		expect(modinv(3)).toBe(5);
		expect(isprime(29)).toBe(1);
		expect(isprime(21)).toBe(0);
		expect(fib(0)).toBe(0);
		expect(fib(10)).toBe(55);
		expect(fib(-4)).toBe(-3);
		expect(fib(77)).toBe(5527939700884757);
		expect(fib(78)).toBe(8944394323791464);
		expect(Number.isNaN(fib(79))).toBe(true);
		expect(Number.isNaN(fib(1.5))).toBe(true);
		expect(fact(5)).toBe(120);
		expect(fact(0.5)).toBeCloseTo(Math.sqrt(Math.PI) / 2, 12);
		expect(dfact(7)).toBe(105);
		expect(Number.isNaN(gcd(1.5))).toBe(true);
	});

	it('links special functions that already have JavaScript-number implementations', () => {
		const erf = buildUnary('erf');
		const gamma = buildUnary('gamma');
		const li = buildUnary('Li');
		const fresnelS = buildUnary('S');
		const fresnelC = buildUnary('C');

		expect(erf(0)).toBe(0);
		expect(gamma(5)).toBeCloseTo(24, 12);
		expect(li(2)).toBeCloseTo(1.045163780117493, 12);
		expect(fresnelS(1)).toBeCloseTo(0.4382591473903548, 12);
		expect(fresnelC(1)).toBeCloseTo(0.7798934003768228, 12);
		expect(fresnelS(-1)).toBeCloseTo(-0.4382591473903548, 12);
		expect(fresnelC(10)).toBeCloseTo(0.4998986942055157, 12);
	});

	it('collects constants required by nested special functions', () => {
		const nested = Expression.toFunction('cos', [
			Expression.toFunction('Ci', [Expression.Variable('x')]),
		]).buildFunction(['x']);
		expect(nested(1)).toBeCloseTo(Math.cos(0.33740392290096816), 12);
	});

	it('does not require a numerical definition for the internal parentheses wrapper', () => {
		const wrapped = Expression.toFunction('', [Expression.Variable('x').plus(1)]).buildFunction([
			'x',
		]);
		expect(wrapped(4)).toBe(5);
	});

	it('rejects unresolved indexed sums and products instead of compiling unrelated helpers', () => {
		const sum = Parser.parse('sum(k, k, 1, n)') as Expression;
		const product = Parser.parse('product(k, k, 1, n)') as Expression;

		expect(() => sum.buildFunction(['n'])).toThrow(UnsupportedOperationError);
		expect(() => sum.buildFunction(['n'])).toThrow('sum');
		expect(() => product.buildFunction(['n'])).toThrow(UnsupportedOperationError);
		expect(() => product.buildFunction(['n'])).toThrow('product');
	});

	it.each(['dirac', 'unknown_numeric_test'])(
		'rejects %s when no faithful JavaScript-number equivalent exists',
		name => {
			const expression = Expression.toFunction(name, [Expression.Variable('x')]);
			expect(() => expression.buildFunction(['x'])).toThrow(UnsupportedOperationError);
			expect(() => expression.buildFunction(['x'])).toThrow(name);
		}
	);
});

describe('Build-function regressions', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/17
	it('compiles registered special functions numerically', () => {
		const compiled = Expression.create('sinc(x)').buildFunction(['x']);

		expect(compiled(1)).toBeCloseTo(Math.sin(1), 15);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/83
	it('compiles a constant cube-root expression', () => {
		const compiled = Expression.create('(1/3)*2^(1/3)').buildFunction();

		expect(compiled()).toBeCloseTo(Math.cbrt(2) / 3, 15);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/99
	it('keeps implicit multiplication outside compiled brackets', () => {
		const compiled = Expression.create('4 (s^2+t^2) s').buildFunction(['s', 't']);

		expect(compiled(2, 3)).toEqual(104);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/103
	it('compiles built-in constants in numerical functions', () => {
		const compiled = Expression.create('pi*x').buildFunction(['x']);

		expect(compiled(2)).toBeCloseTo(2 * Math.PI, 15);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/459
	it('does not leak build-time error classes for negative factorials', () => {
		const factorial = Expression.create('factorial(x)').buildFunction(['x']);

		expect(Number.isNaN(factorial(-1))).toBe(true);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/481
	it('loads factorial dependencies for compiled fractional inputs', () => {
		const factorial = Expression.create('factorial(x)').buildFunction(['x']);

		expect(factorial(3.1)).toBeCloseTo(6.812622863016674, 12);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/545
	it('builds a numerical function containing a parenthesized negative base', () => {
		const compiled = Expression.create('acos((-x)^(1/6))').buildFunction(['x']);

		expect(compiled(-1)).toBeCloseTo(0, 14);
	});
});
