import nerdamer from '../../src';

import { Expression } from '../../src/core/classes/expression/Expression';
import { mathFunctionRegistry } from '../../src/core/dispatch';
import {
	TRIG,
	INVERSE_TRIG,
	HYPERBOLIC_TRIG,
	INVERSE_HYPERBOLIC_TRIG,
	STATISTICS,
	NUMBER_THEORY,
	SPECIAL_FUNCTIONS,
} from '../../src/api/constants';
import * as publicCategories from '../../src/api/constants';
import * as internalCategories from '../../src/core/constants/functionNames';

describe('public mathematical function categories', () => {
	it('keeps the public constants API limited to the intentional function groups', () => {
		expect(Object.keys(publicCategories).sort()).toEqual([
		'HYPERBOLIC_TRIG',
		'INVERSE_HYPERBOLIC_TRIG',
		'INVERSE_TRIG',
		'NUMBER_THEORY',
		'SPECIAL_FUNCTIONS',
		'STATISTICS',
		'TRIG',
		].sort());
		expect(publicCategories.STATISTICS).toBe(internalCategories.STATISTICS);
		expect(publicCategories.NUMBER_THEORY).toBe(internalCategories.NUMBER_THEORY);
		expect(publicCategories.SPECIAL_FUNCTIONS).toBe(internalCategories.SPECIAL_FUNCTIONS);
	});

	it('exposes the same frozen category values through the callable root API', () => {
		expect(Object.keys(nerdamer.constants).sort()).toEqual(Object.keys(publicCategories).sort());
		expect(Object.isFrozen(nerdamer.constants)).toBe(true);
		for (const name of Object.keys(publicCategories) as (keyof typeof publicCategories)[]) {
			expect(nerdamer.constants[name]).toBe(publicCategories[name]);
		}
		const typedNames: readonly string[] = nerdamer.constants.TRIG;
		expect(typedNames).toBe(TRIG);
		expect(nerdamer.constants).not.toHaveProperty('PARSER_CONSTANTS');
		expect(nerdamer.constants).not.toHaveProperty('Settings');
	});

	it('preserves the exact built-in names from the statistics dispatcher', () => {
		expect(STATISTICS).toEqual([
		'mean', 'median', 'mode', 'smpvar', 'variance', 'smpstdev', 'stdev', 'zscore',
	]);
	});

	it('classifies divisibility, modular arithmetic and integer prime factors', () => {
		expect(NUMBER_THEORY).toEqual([
		'isprime', 'gcd', 'lcm', 'mod', 'modinv', 'pfactor', 'pfactord',
	]);
		expect(NUMBER_THEORY).not.toContain('factor');
		expect(NUMBER_THEORY).not.toContain('fib');
	});

	it('preserves the exact case-sensitive names from the special dispatcher', () => {
		expect(SPECIAL_FUNCTIONS).toEqual([
		'erf', 'erfc', 'gamma', 'gamma_incomplete', 'gamma_incomplete_lower', 'sinc',
		'Shi', 'Si', 'Chi', 'Ci', 'Ei', 'Li',
	]);
		expect(SPECIAL_FUNCTIONS).not.toContain('li');
		expect(SPECIAL_FUNCTIONS).not.toContain('C');
		expect(SPECIAL_FUNCTIONS).not.toContain('S');
	});

	it('freezes every shared group and preserves readonly category inputs', () => {
		const groups: readonly (readonly string[])[] = [
			TRIG, INVERSE_TRIG, HYPERBOLIC_TRIG, INVERSE_HYPERBOLIC_TRIG,
			STATISTICS, NUMBER_THEORY, SPECIAL_FUNCTIONS,
		];
		for (const group of groups) {
			expect(Object.isFrozen(group)).toBe(true);
		}
	});

	it('identifies function nodes without dispatching or evaluating them', () => {
		const variable = Expression.Variable('x');
		for (const category of [STATISTICS, NUMBER_THEORY, SPECIAL_FUNCTIONS]) {
			for (const name of category) {
				const expression = Expression.toFunction(name, [variable]);
				expect(expression.isFunction(category)).toBe(true);
				expect(expression.isFunction(name)).toBe(true);
				expect(mathFunctionRegistry[name]).toBeDefined();
			}
		}
		expect(Expression.toFunction('mean', [variable]).isFunction(NUMBER_THEORY)).toBe(false);
		expect(Expression.toFunction('mod', [variable]).isFunction(SPECIAL_FUNCTIONS)).toBe(false);
		expect(Expression.toFunction('Li', [variable]).isFunction(STATISTICS)).toBe(false);
		expect(Expression.toFunction('li', [variable]).isFunction(SPECIAL_FUNCTIONS)).toBe(false);
		expect(Expression.Variable('mean').isFunction(STATISTICS)).toBe(false);
	});
});
