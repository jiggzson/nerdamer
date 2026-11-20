import '../helpers/registerNerdamerFunctions';
import { Expression } from '../../src/core/classes/expression/Expression';

// Terms are combined in balanced pairs. Adding each one to a running total copied the whole sum
// every time, so these took 10 to 25 seconds.
describe('Finite sums and products of many symbolic terms', () => {
	it.each([
		['sum(x^k,k,1,10000)', 'sum', 10000],
		['sum(sin(k*x),k,1,3000)', 'sum', 3000],
		['product(x^k+1,k,1,1000)', 'product', 1000],
	] as [string, string, number][])(
		'builds %s from every term',
		(source, kind, count) => {
			const start = performance.now();
			const result = Expression.create(source);
			expect(performance.now() - start).toBeLessThan(5000);
			expect(kind === 'sum' ? result.isSum() : result.isProduct()).toBe(true);
			expect(result.elementsArray()).toHaveLength(count);
		},
		30000
	);

	it('keeps the value of a sum regardless of grouping', () => {
		// sum(x^k, k, 1, 99) = (x^100 - x) / (x - 1)
		const result = Expression.create('sum(x^k,k,1,99)');
		for (const x of ['2', '1/3', '-5/2']) {
			const closed = Expression.create('(x^100-x)/(x-1)', { x });
			expect(Expression.create(result.text(), { x }).minus(closed).isZero()).toBe(true);
		}
	});

	it('keeps the value of a product regardless of grouping', () => {
		// The product of (k+1)/k from 1 to n telescopes to n + 1; this form is not recognized.
		const result = Expression.create('product((k+1)^2/k^2,k,1,500)');
		expect(result.text()).toBe('251001');
	});
});
