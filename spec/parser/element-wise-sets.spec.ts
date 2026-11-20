import nerdamer from '../../src/index';
import { SolutionSet } from '../../src/solve/classes/SolutionSet';

// Element-wise functions distributed over vectors and matrices but rejected a set, so
// factor(solve(...)) threw "Expression expected!. Received ValuesSet!".
describe('Element-wise functions over sets', () => {
	it.each([
		['factor(solve(x^2-4*y^2,x))', '{-2*y, 2*y}'],
		['factor({x^2-1, 6})', '{(1+x)*(-1+x), 2*3}'],
		['diff(solve(x^2-4*y^2,x),y)', '{-2, 2}'],
		['integrate(solve(x^2-4*y^2,x),y)', '{-y^2, y^2}'],
		['sin(solve(x^2-4*y^2,x))', '{-sin(2*y), sin(2*y)}'],
		['abs(solve(x^2-4*y^2,x))', '{abs(2*y)}'],
	])('gives %s = %s', (source, expected) => {
		expect(nerdamer(source).text()).toBe(expected);
	});

	it('keeps a solution set and its solution form', () => {
		const result = nerdamer('factor(solve(sin(x),x))');
		expect(result).toBeInstanceOf(SolutionSet);
		expect((result as unknown as SolutionSet).solutionForm).toBe('parametric');
	});
});
