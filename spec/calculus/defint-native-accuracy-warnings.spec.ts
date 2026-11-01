import '../../src/index';
import { message } from '../../src/core/errors';
import { clearWarnings, getWarnings } from '../../src/core/warnings';
import { definiteIntegrateNative } from '../../src/math/defint/defintNative';

describe('Native definite integration accuracy warnings', () => {
	afterEach(() => clearWarnings());

	it('warns when the subdivision ceiling prevents meeting the tolerance', () => {
		const result = definiteIntegrateNative(Math.exp, 0, 1, {
			maxDepth: 0, tolAbs: 0, tolRel: 0,
		});
		expect(Number.isFinite(result)).toBe(true);
		expect(getWarnings()).toEqual([{
			code: 'defint.depthLimit',
			message: message('defintAccuracyWarning', { depth: '0' }),
		}]);
	});

	it('does not warn when an estimate satisfies the tolerance', () => {
		const result = definiteIntegrateNative(x => x, 0, 1, { maxDepth: 0 });
		expect(result).toBeCloseTo(0.5);
		expect(getWarnings()).toEqual([]);
	});

	it('aggregates breakpoint interval failures into one warning', () => {
		const result = definiteIntegrateNative(Math.exp, 0, 1, {
			maxDepth: 0, tolAbs: 0, tolRel: 0, breakpoints: [0.25, 0.5, 0.75],
		});
		expect(Number.isFinite(result)).toBe(true);
		expect(getWarnings()).toHaveLength(1);
		expect(getWarnings()[0].code).toBe('defint.depthLimit');
	});

	it('does not replace evaluation-budget errors with warnings', () => {
		expect(() => definiteIntegrateNative(Math.exp, 0, 1, {
			maxEvals: 1,
		})).toThrow();
		expect(getWarnings()).toEqual([]);
	});
});
