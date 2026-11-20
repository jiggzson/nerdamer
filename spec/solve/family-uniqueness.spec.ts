import '../helpers/registerNerdamerFunctions';
import { Expression } from '../../src/core/classes/expression/Expression';
import { SolutionSet } from '../../src/solve/classes/SolutionSet';

/** Builds a set from `sources` and counts the symbolic equality tests it needed. */
function buildCounted(sources: string[]) {
	const eq = jest.spyOn(Expression.prototype, 'eq');
	try {
		const set = new SolutionSet(sources.map(source => Expression.create(source)));
		return { count: set.count(), tests: eq.mock.calls.length };
	} finally {
		eq.mockRestore();
	}
}

describe('Solution family uniqueness', () => {
	it('tells families apart at _n = 0 without a symbolic test', () => {
		const { count, tests } = buildCounted([
			'pi/3+2*_n*pi',
			'-pi/3+2*_n*pi',
			'acos((-1/2)*2^(1/3)+(1/2)*2^(1/3)*3^(1/2)*i)+2*_n*pi',
			'-acos((-1/2)*2^(1/3)+(1/2)*2^(1/3)*3^(1/2)*i)+2*_n*pi',
		]);
		expect(count).toBe(4);
		expect(tests).toBe(0);
	});

	it('still merges equal families written differently', () => {
		const { count } = buildCounted(['pi/2+2*_n*pi', '2*(pi/4+_n*pi)']);
		expect(count).toBe(1);
	});

	it.each([
		// Equal at _n = 0, different everywhere else.
		['pi+2*_n*pi', 'pi+4*_n*pi'],
		// Too close at _n = 0 for the numerical test to decide.
		['pi/2+2*_n*pi', 'pi/2+2*_n*pi+1e-30'],
	])('keeps %s and %s apart with the symbolic test', (first, second) => {
		const { count, tests } = buildCounted([first, second]);
		expect(count).toBe(2);
		expect(tests).toBeGreaterThan(0);
	});
});
