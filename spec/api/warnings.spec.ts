import nerdamer from '../../src/index';
import { warn } from '../../src/core/warnings';

describe('Nonfatal warnings', () => {
	afterEach(() => {
		nerdamer.setWarningHandler();
		nerdamer.setConsoleWarnings(false);
		nerdamer.clearWarnings();
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/353
	it('warns on legacy deletion arguments while preserving their behavior', () => {
		const constant = 'legacy_warning_constant';
		const variable = 'legacy_warning_variable';
		try {
			nerdamer.setConstant(constant, 3);
			nerdamer.setVar(variable, 4);
			expect(nerdamer.getWarnings()).toEqual([]);

			nerdamer.setConstant(constant, 'delete');
			nerdamer.setVar(variable, 'delete');

			expect(nerdamer(constant).text()).toEqual(constant);
			expect(nerdamer(variable).text()).toEqual(variable);
			expect(nerdamer.getWarnings()).toEqual([
			{ code: 'api.deprecatedDelete', message: "setConstant(name, 'delete') is deprecated; the legacy deletion behavior remains supported." },
			{ code: 'api.deprecatedDelete', message: "setVar(name, 'delete') is deprecated; the legacy deletion behavior remains supported." },
			]);
		} finally {
			nerdamer.setConstant(constant, 'delete');
			nerdamer.setVar(variable, 'delete');
		}
	});

	it('collects warnings and returns independent snapshots', () => {
		warn('calculation.limit', 'Reached the calculation limit');
		const entries = nerdamer.getWarnings();
		expect(entries).toEqual([{ code: 'calculation.limit', message: 'Reached the calculation limit' }]);
		entries.pop();
		expect(nerdamer.getWarnings()).toHaveLength(1);
		nerdamer.clearWarnings();
		expect(nerdamer.getWarnings()).toEqual([]);
	});

	it('delivers warnings to an optional application callback', () => {
		const received: string[] = [];
		nerdamer.setWarningHandler(warning => received.push(warning.code));
		warn('calculation.incomplete', 'Calculation is incomplete');
		expect(received).toEqual(['calculation.incomplete']);
		expect(nerdamer.getWarnings()).toHaveLength(1);
	});

	it('propagates application callback failures', () => {
		nerdamer.setWarningHandler(() => { throw new Error('UI failure'); });
		expect(() => warn('application.ui', 'UI notification failed')).toThrow('UI failure');
		expect(nerdamer.getWarnings()).toHaveLength(1);
	});

	it('does not write to the console unless enabled', () => {
		const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
		try {
			warn('console.quiet', 'quiet');
			expect(spy).not.toHaveBeenCalled();
			nerdamer.setConsoleWarnings(true);
			warn('console.visible', 'visible');
			expect(spy).toHaveBeenCalledWith('visible');
		} finally {
			spy.mockRestore();
		}
	});
});
