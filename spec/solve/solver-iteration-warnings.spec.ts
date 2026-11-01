import Decimal from 'decimal.js';
import '../../src/api/languages/spa';
import { Settings } from '../../src/core/Settings';
import { message } from '../../src/core/errors';
import '../../src/index';
import { FunctionSolver } from '../../src/solve/classes/FunctionSolver';
import { clearWarnings, getWarnings } from '../../src/core/warnings';

describe('Solver iteration warnings', () => {
	const initialLanguage = Settings.LANGUAGE;
	afterEach(() => {
		Settings.LANGUAGE = initialLanguage;
		clearWarnings();
	});

	it('reports exhausted Brent refinement once at the end of a root search', () => {
		const solver = new FunctionSolver('x-0.2375', 'x', {
			lowerBound: 0, upperBound: 0.5, stepSize: 0.1, maxIterations: 0,
		});
		expect(solver.roots()).toEqual([]);
		expect(getWarnings()).toHaveLength(1);
		expect(getWarnings()[0].code).toBe('solve.iterationLimit');
	});

	it('localizes the warning using the configured language', () => {
		Settings.LANGUAGE = 'spa';
		const solver = new FunctionSolver('x-0.2375', 'x', {
			lowerBound: 0, upperBound: 0.5, stepSize: 0.1, maxIterations: 0,
		});
		solver.roots();
		expect(getWarnings()[0].message).toBe(message('rootIterationWarning', {
			count: '1', iterations: '0',
		}));
		expect(getWarnings()[0].message).toContain('iteraciones');
	});

	it('does not warn when refinement converges', () => {
		const solver = new FunctionSolver('x-0.2375', 'x', {
			lowerBound: 0, upperBound: 0.5, stepSize: 0.1,
		});
		expect(solver.roots()).toHaveLength(1);
		expect(getWarnings()).toEqual([]);
	});

	it('keeps direct refinement metadata without emitting search-level warnings', () => {
		const solver = new FunctionSolver('x-0.2375', 'x', { maxIterations: 0 });
		const result = solver.Brent(new Decimal(0), new Decimal(1));
		expect(result.converged).toBe(false);
		expect(getWarnings()).toEqual([]);
	});
});
