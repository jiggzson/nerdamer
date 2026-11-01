'use strict';

import '../helpers/registerNerdamerFunctions';
import { Expression } from '../../src/core/classes/expression/Expression';
import { mathFunctionRegistry } from '../../src/core/dispatch';
import {
	connectedNumericalFunctions,
	connectFunctions,
} from '../../src/core/functions/connectFunctions';

const connectedName = 'outsidefn';
const connectedPairName = 'outsidepair';
const wildcardFirstName = 'wildcardfirst';
const wildcardSecondName = 'wildcardsecond';

afterEach(() => {
	for (const name of [
		connectedName,
		connectedPairName,
		wildcardFirstName,
		wildcardSecondName,
	]) {
		delete connectedNumericalFunctions[name];
		if (mathFunctionRegistry[name]?.level === 'user') {
			delete mathFunctionRegistry[name];
		}
	}
});

describe('numerical function connections', () => {
	it('keeps a new connected function symbolic during ordinary parsing', () => {
		connectFunctions([connectedName], {
			[connectedName]: (x: number) => x + 7,
		});

		expect(Expression.create(`${connectedName}(2)`).text()).toBe(`${connectedName}(2)`);
		expect(Expression.create(`${connectedName}(x)`).text()).toBe(`${connectedName}(x)`);
	});

	it('uses the connected function when evaluation resolves every argument numerically', () => {
		connectFunctions([connectedName], {
			[connectedName]: (x: number) => x + 7,
		});

		expect(Expression.create(`${connectedName}(2)`).evaluate().text()).toBe('9');
		expect(Expression.create(`${connectedName}(x)`).evaluate({ x: 3 }).text()).toBe('10');
		expect(Expression.create(`${connectedName}(x)`).evaluate().text()).toBe(`${connectedName}(x)`);
	});

	it('supports connected functions with multiple arguments', () => {
		connectFunctions([connectedPairName], {
			[connectedPairName]: (a: number, b: number) => a * b + 1,
		});

		expect(Expression.create(`${connectedPairName}(x,y)`).text()).toBe(
			`${connectedPairName}(x, y)`
		);
		expect(Expression.create(`${connectedPairName}(3,4)`).evaluate().text()).toBe('13');
		expect(
			Expression.create(`${connectedPairName}(x,y)`).buildFunction(['x', 'y'])(3, 4)
		).toBe(13);
	});

	it('connects every function from a source with the wildcard', () => {
		connectFunctions(['*'], {
			[wildcardFirstName]: (x: number) => 2 * x,
			[wildcardSecondName]: (x: number) => 3 * x,
			label: 'not a function',
		});

		expect(
			Expression.create(
				`(${wildcardFirstName}(x)+${wildcardSecondName}(x))^2-1`
			)
				.evaluate({ x: 1 })
				.text()
		).toBe('24');
		expect(connectedNumericalFunctions.label).toBeUndefined();
	});

	it('preserves external closures and source binding in buildFunction', () => {
		const offset = 5;
		const library = {
			scale: 3,
			[connectedName](this: { scale: number }, x: number) {
				return this.scale * x + offset;
			},
		};
		connectFunctions([connectedName], library);

		const compiled = Expression.create(`${connectedName}(x)+1`).buildFunction(['x']);
		expect(compiled(2)).toBe(12);
	});

	it('can provide the numerical backend for an existing symbolic function', () => {
		const original = mathFunctionRegistry.cos.fn;
		try {
			connectFunctions(['cos'], {
				cos: (x: number) => Math.cos(x) + 100,
			});

			expect(Expression.create('cos(x)').text()).toBe('cos(x)');
			expect(Expression.create('cos(x)').evaluate({ x: 0 }).text()).toBe('101');
			expect(Expression.create('cos(x)').buildFunction(['x'])(0)).toBe(101);
		} finally {
			mathFunctionRegistry.cos.fn = original;
			delete connectedNumericalFunctions.cos;
		}
	});
});
