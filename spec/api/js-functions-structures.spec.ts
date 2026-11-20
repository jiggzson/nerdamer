import nerdamer, { apiTarget } from '../../src/index';
import { factor } from '../../src/algebra/factor/factor';
import { SolutionSet } from '../../src/solve/classes/SolutionSet';

// The JS functions rejected vectors, matrices and sets while the parser distributed over
// them. Those whose parser function is element-wise now go through the same distribution.
describe('JS functions on vectors, matrices and sets', () => {
	it.each([
		[
			'factor',
			() => nerdamer.factor(nerdamer.solve('x^2-4*y^2', 'x') as never),
			'factor(solve(x^2-4*y^2,x))',
		],
		[
			'factor',
			() => nerdamer.factor(nerdamer('[x^2-1, 4*y]') as never),
			'factor([x^2-1, 4*y])',
		],
		[
			'sqrt',
			() => nerdamer.sqrt(nerdamer('matrix([1,4],[9,16])') as never),
			'sqrt(matrix([1,4],[9,16]))',
		],
		[
			'subst',
			() => nerdamer.subst(nerdamer('[x^2-1, 4*y]') as never, 'y', '3'),
			'subst([x^2-1, 4*y], y, 3)',
		],
		[
			'round',
			() => nerdamer.round(nerdamer('[1.234, 5.678]') as never, 1),
			'round([1.234, 5.678], 1)',
		],
	])('%s matches the parser', (_name, call, source) => {
		expect(String(call())).toBe(nerdamer(source).text());
	});

	it('keeps scalar calls and solution sets as they were', () => {
		expect(String(nerdamer.factor('x^2-1'))).toBe('(1+x)*(-1+x)');
		expect(String(nerdamer.sqrt(16))).toBe('4');
		const result = nerdamer.factor(nerdamer.solve('sin(x)', 'x') as never) as unknown;
		expect(result).toBeInstanceOf(SolutionSet);
		expect((result as SolutionSet).solutionForm).toBe('parametric');
	});

	it('shares one wrapper between aliases and exposes the wrapped function', () => {
		expect(nerdamer.dfact).toBe(nerdamer.dfactorial);
		expect(nerdamer.arccos).toBe(nerdamer.acos);
		expect(apiTarget(nerdamer.factor)).toBe(factor);
		expect(apiTarget(nerdamer.mean)).toBe(nerdamer.mean);
	});
});
