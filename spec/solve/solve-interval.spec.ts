import Decimal from 'decimal.js';

import nerdamer from '../../src/index';
import { Vector } from '../../src/core/classes/vector/Vector';
import { UnexpectedInputError } from '../../src/core/errors';
import { FunctionSolver } from '../../src/solve/classes/FunctionSolver';
import { SolutionSet } from '../../src/solve/classes/SolutionSet';
import { solve } from '../../src/solve/solve';

const expression = 'cos(x^2)+sin(x)*sinh(x)';

/** Counts the solutions returned by parser notation. */
function parsedCount(input: string): number {
	const parsed = nerdamer(input);
	if (!SolutionSet.isSolutionSet(parsed)) {
		throw new TypeError(`Expected a SolutionSet from ${input}`);
	}
	return parsed.count();
}

describe('Optional numerical solve interval', () => {
	it('defaults to a narrower numerical scan over [-10,10]', () => {
		const solver = new FunctionSolver(expression, 'x');
		expect(solver.lowerBound.eq(-10)).toBe(true);
		expect(solver.upperBound.eq(10)).toBe(true);

		const roots = solve(expression, 'x').elements
			.map(root => root.getMultiplier().toDecimal());
		expect(roots).toHaveLength(6);
		expect(roots.every(root => root.abs().lte(10))).toBe(true);
	});

	it('accepts an optional Vector interval in the expression parser', () => {
		expect(parsedCount(`solve(${expression},x)`)).toBe(6);
		expect(parsedCount(`solve(${expression},x,[-20,20])`)).toBe(12);
		expect(parsedCount('solve(cos(x)-x,x,[0,2])')).toBe(1);
	});

	it('accepts the same interval as a Vector or numerical options through the direct API', () => {
		const viaVector = solve(expression, 'x', Vector.create([-20, 20]));
		const viaOptions = solve(expression, 'x', {
			lowerBound: -20, upperBound: 20,
		});
		expect(viaVector.count()).toBe(12);
		expect(viaOptions.count()).toBe(12);

		const expected = new Decimal('15.707963230345988889');
		for (const result of [viaVector, viaOptions]) {
			expect(result.elements.some(root =>
				root.getMultiplier().toDecimal().minus(expected).abs().lt('1e-12')
			)).toBe(true);
		}
	});

	it('uses explicit bounds rather than an inferred function enclosure', () => {
		const rootsSpy = jest.spyOn(FunctionSolver.prototype, 'roots');
		try {
			const result = solve('sin(x)+x/2', 'x', Vector.create([-1, 1]));
			expect(result.count()).toBeGreaterThan(0);
			expect(rootsSpy.mock.contexts.some(solver =>
				solver instanceof FunctionSolver &&
				solver.lowerBound.eq(-1) && solver.upperBound.eq(1)
			)).toBe(true);
		} finally {
			rootsSpy.mockRestore();
		}
	});

	it('does not restrict symbolic or polynomial roots to the numerical interval', () => {
		const result = solve('x^2-144', 'x', Vector.create([-1, 1]));
		expect(result.count()).toBe(2);
		const roots = result.elements.map(root => root.getMultiplier().toDecimal());
		expect(roots.some(root => root.eq(-12))).toBe(true);
		expect(roots.some(root => root.eq(12))).toBe(true);
	});

	it.each([
		[0],
		[0, 1, 2],
		[1, 1],
		[2, -2],
		['x', 2],
	])('rejects invalid interval bounds %j', (...values) => {
		expect(() => solve(expression, 'x', Vector.create(values))).toThrow(UnexpectedInputError);
	});

	it('rejects a scalar third argument in parser syntax', () => {
		expect(() => nerdamer('solve(cos(x)-x,x,2)')).toThrow();
	});
});
