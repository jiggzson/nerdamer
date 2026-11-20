import nerdamer from '../../src/index';
import { message, UnsupportedOperationError } from '../../src/core/errors';

/** The error for a comparison passed to a solver. */
function rejected(fn: string, operator: string): string {
	return message('comparisonUnsupported', { function: fn, operator });
}

// A comparison evaluates to 0 or 1 before the solver runs, so solve(x^2<4,x) used to solve 0
// and return {all}. Until inequalities can be solved, the solvers reject comparisons.
describe('Comparisons passed to the solvers', () => {
	it.each([
		['solve(x^2<4,x)', 'solve', '<'],
		['solve(x>1,x)', 'solve', '>'],
		['solve(x^2>=4,x)', 'solve', '>='],
		['solve(x<=1)', 'solve', '<='],
		['solve(x==2,x)', 'solve', '=='],
		['solve(x!=2,x)', 'solve', '!='],
		['solve([x<1],x)', 'solve', '<'],
		['solveeqs([x<1,x+y=2])', 'solveeqs', '<'],
		['roots(x^2<4)', 'roots', '<'],
	])('rejects %s', (source, fn, operator) => {
		expect(() => nerdamer(source)).toThrow(UnsupportedOperationError);
		expect(() => nerdamer(source)).toThrow(rejected(fn, operator));
	});

	it('rejects comparisons in text passed to the JS functions', () => {
		expect(() => nerdamer.solve('x^2<4', 'x')).toThrow(rejected('solve', '<'));
		expect(() => nerdamer.solveeqs(['x<1', 'x+y=2'])).toThrow(rejected('solveeqs', '<'));
	});

	it('still solves equations', () => {
		expect(nerdamer('solve(x=2,x)').text()).toBe('{2}');
		expect(nerdamer('solveeqs([x+y=2,x-y=0])').text()).toBe('[{x => 1, y => 1}]');
		expect(nerdamer.solve('x^2=4', 'x').text()).toBe('{2, -2}');
	});
});
