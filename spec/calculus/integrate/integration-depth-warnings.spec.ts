import '../../../src/index';
import { integrate } from '../../../src/calculus/integrate/integrate';
import { message } from '../../../src/core/errors';
import { MAX_INTEGRATION_DEPTH } from '../../../src/calculus/integrate/utils';
import { clearWarnings, getWarnings, setWarningHandler } from '../../../src/core/warnings';

describe('Integration depth warnings', () => {
	afterEach(() => {
		setWarningHandler();
		clearWarnings();
	});

	it('preserves the unevaluated integral and records the exhausted depth', () => {
		const result = integrate('sin(x)', 'x', MAX_INTEGRATION_DEPTH);
		expect(result.text()).toBe('integrate(sin(x), x)');
		expect(getWarnings()).toEqual([{
			code: 'integrate.depthLimit',
			message: message('integrationDepthWarning', { depth: String(MAX_INTEGRATION_DEPTH), expression: 'sin(x)' }),
		}]);
	});

	it('emits only one warning when several recursive terms reach the depth limit', () => {
		const result = integrate('sin(x)+cos(x)', 'x', MAX_INTEGRATION_DEPTH - 1);
		expect(result.hasFunction('integrate', true)).toBe(true);
		expect(getWarnings().map(warning => warning.code)).toEqual(['integrate.depthLimit']);
	});

	it('does not warn for an ordinary successful integral', () => {
		expect(integrate('sin(x)', 'x').text()).toBe('-cos(x)');
		expect(getWarnings()).toEqual([]);
	});
});
