import nerdamer from '../../src';
import type { TextOptions } from '../../src';
import { Expression } from '../../src/api/core';
import type { TextOptions as CoreTextOptions } from '../../src/api/core';

describe('public text formatting options', () => {
	it('sorts expression terms without changing the default text representation', () => {
		const expression = nerdamer('x^2+2*x+1');

		expect(expression.text()).toBe('1+2*x+x^2');
		expect(expression.text({ sort: true })).toBe('x^2+2*x+1');
		expect(expression.text()).toBe('1+2*x+x^2');
	});

	it('supports chainable conventional text output', () => {
		const expression = nerdamer('(x+1)^2').expand();

		expect(Expression.isExpression(expression)).toBe(true);
		if (!Expression.isExpression(expression)) {
			throw new Error('expanded scalar input did not return an Expression');
		}

		expect(expression.text({ sort: true })).toBe('x^2+2*x+1');
		expect(expression.toText()).toBe('x^2+2*x+1');
	});

	it('exports the same TextOptions shape from root and core', () => {
		const rootOptions: TextOptions = { sort: true, decimal: false };
		const coreOptions: CoreTextOptions = rootOptions;
		const expression = Expression.create('x^2+2*x+1');

		expect(expression.text(coreOptions)).toBe('x^2+2*x+1');
	});

	it('supports per-call decimal precision through TextOptions', () => {
		const options: TextOptions = { decimal: true, precision: 5 };

		expect(Expression.create('1/3').text(options)).toBe('0.33333');
	});
});
