import '../../src/index';
import { Expression } from '../../src/core/classes/expression/Expression';
import { message } from '../../src/core/errors';
import { clearWarnings, getWarnings } from '../../src/core/warnings';
import { MultivariateSolver } from '../../src/solve/classes/MultivariateSolver';

describe('Multivariate solver iteration warnings', () => {
	afterEach(() => clearWarnings());

	it('reports exhausted starts once when the iteration budget is zero', () => {
		const solver = new MultivariateSolver([Expression.create('x-1')], ['x'], {
			lowerBound: 0, upperBound: 2, gridPoints: 2, maxIterations: 0,
		});
		expect(solver.roots()).toHaveLength(0);
		expect(getWarnings()).toEqual([{
			code: 'solve.iterationLimit',
			message: message('rootIterationWarning', { count: '2', iterations: '0' }),
		}]);
	});

	it('does not report exhaustion when a starting point converges', () => {
		const solver = new MultivariateSolver([Expression.create('x-1')], ['x'], {
			lowerBound: 0, upperBound: 2, gridPoints: 3,
		});
		expect(solver.roots()).toHaveLength(1);
		expect(getWarnings()).toEqual([]);
	});

	it('does not classify singular Jacobians as iteration exhaustion', () => {
		const solver = new MultivariateSolver([Expression.create('x^2+1')], ['x'], {
			lowerBound: 0, upperBound: 0, gridPoints: 2, maxIterations: 2,
		});
		expect(solver.roots()).toHaveLength(0);
		expect(getWarnings()).toEqual([]);
	});
});
