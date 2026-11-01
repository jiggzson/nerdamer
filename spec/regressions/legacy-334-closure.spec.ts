import { diff } from '../../src/calculus/derivative/diff';
import { integrate } from '../../src/calculus/integrate/integrate';
import { Expression } from '../../src/core/classes/expression/Expression';
import nerdamer from '../../src/index';

describe('Historical integration issue #334 closure checks', () => {
	it('integrates sin(log(x)) and verifies its derivative on the positive real axis', () => {
		const source = Expression.create('sin(log(x))');
		const result = integrate(source, 'x');
		expect(result.hasFunction('integrate', true)).toBe(false);
		const derivative = diff(result, 'x');
		for (const x of [0.5, 1, 2, 3]) {
			const expected = Number(source.evaluate({ x }).text({ decimal: true }));
			const actual = Number(derivative.evaluate({ x }).text({ decimal: true }));
			expect(Number.isFinite(actual)).toBe(true);
			expect(actual).toBeCloseTo(expected, 8);
		}
	});

	it('evaluates the historical definite polynomial integral with the correct sign', () => {
		const actual = Number(nerdamer.defint('x*(x+1)/2', 'x', -1, 0).text());
		expect(Number.isFinite(actual)).toBe(true);
		expect(actual).toBeCloseTo(-1 / 12, 10);
	});
});
