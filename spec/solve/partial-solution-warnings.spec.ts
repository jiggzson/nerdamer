import '../../src/index';
import * as factorModule from '../../src/algebra/factor/factor';
import { UnsupportedOperationError, message } from '../../src/core/errors';
import { clearWarnings, getWarnings } from '../../src/core/warnings';
import { solve } from '../../src/solve/solve';

describe('Partial solution warnings', () => {
	afterEach(() => {
		jest.restoreAllMocks();
		clearWarnings();
	});

	it('warns for an unresolved public solve result', () => {
		jest.spyOn(factorModule, 'factorExpressionParts').mockImplementation(() => {
			throw new UnsupportedOperationError('Unsupported factoring case');
		});
		const result = solve('sin(x)+x^2+1', 'x');
		expect(result.unsolved).toBeDefined();
		expect(getWarnings()).toEqual([{
			code: 'solve.partialResult',
			message: message('solvePartialResultWarning'),
		}]);
	});

	it('does not warn for internal recursive attempts with an explicit context', () => {
		const context = { depth: 64, exhausted: false };
		const result = solve('sin(x)+x^2+1', 'x', undefined, context);
		expect(result.unsolved).toBeDefined();
		expect(getWarnings()).toEqual([]);
	});

	it('does not warn for a complete symbolic result', () => {
		expect(solve('x^2-1', 'x').count()).toBe(2);
		expect(getWarnings()).toEqual([]);
	});
});
