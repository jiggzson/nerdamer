import nerdamer from '../../src/index';
import { SolutionSet } from '../../src/solve/classes/SolutionSet';

// simplify called the expression pipeline on a set and failed with a raw TypeError. Each
// member is now simplified, as the method form already did.
describe('Simplifying sets', () => {
	it.each([
		['simplify(solve(2^x-8,x))', '{3}'],
		['simplify(solve(x^2-2*x+1,x))', '{1}'],
		['simplify({1,2})', '{1, 2}'],
		['simplify({sin(x)^2+cos(x)^2, 1, 2})', '{1, 2}'],
	])('gives %s = %s', (source, expected) => {
		expect(nerdamer(source).text()).toBe(expected);
	});

	it('keeps a solution set and its solution form through the JS function', () => {
		const solutions = nerdamer.solve('sin(x)', 'x');
		const simplified = nerdamer.simplify(solutions);
		expect(simplified).toBeInstanceOf(SolutionSet);
		expect(simplified).not.toBe(solutions);
		expect(simplified.solutionForm).toBe('parametric');
		expect(nerdamer.simplify(nerdamer.solve('x^2-2', 'x')).text()).toBe(
			nerdamer.solve('x^2-2', 'x').simplify().text()
		);
	});
});
