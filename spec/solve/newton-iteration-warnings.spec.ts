import '../../src/index';
import { Solver } from '../../src/solve/classes/Solver';
import { clearWarnings, getWarnings } from '../../src/core/warnings';
import { message } from '../../src/core/errors';

describe('Legacy Newton iteration warnings', () => {
	afterEach(() => clearWarnings());

	it('aggregates numeric Newton exhaustion once per solve call', () => {
		const solver = new Solver();
		solver.newtonMaxIterations = 0;
		jest.spyOn(solver, 'getPoints').mockReturnValue([0, 1]);
		expect(solver.solve('x-2')).toEqual([]);
		expect(getWarnings()).toEqual([{
			code: 'solve.iterationLimit',
			message: message('rootIterationWarning', { count: '2', iterations: '0' }),
		}]);
	});

	it('aggregates symbolic Newton exhaustion once per solve call', () => {
		const solver = new Solver();
		solver.newtonMaxSymbolicIterations = 0;
		jest.spyOn(solver, 'getPoints').mockReturnValue([0, 1]);
		expect(solver.solveSymbolic('x-2')).toEqual([]);
		expect(getWarnings()).toEqual([{
			code: 'solve.iterationLimit',
			message: message('rootIterationWarning', { count: '2', iterations: '0' }),
		}]);
	});

	it('does not warn for successful Newton refinement', () => {
		const solver = new Solver();
		jest.spyOn(solver, 'getPoints').mockReturnValue([2]);
		expect(solver.solve('x-2')).toEqual([2]);
		expect(getWarnings()).toEqual([]);
	});
});
