import { message } from '../../src/core/errors';
import { clearWarnings, getWarnings } from '../../src/core/warnings';
import nerdamer from '../../src/index';

/** TeX for source with TEX_PERIODIC_VAR set to name, restoring the default afterwards. */
function texWith(name: string, source: string): string {
	try {
		nerdamer.set('TEX_PERIODIC_VAR', name);
		return nerdamer.convertToTeX(nerdamer(source));
	} finally {
		nerdamer.set('TEX_PERIODIC_VAR', 'n');
	}
}

// The integer parameter _n of periodic solutions rendered as a bare subscript, _{n}. TeX output
// shows it under TEX_PERIODIC_VAR instead; text output and computation keep _n.
describe('TeX name of the periodic parameter', () => {
	beforeEach(() => clearWarnings());

	it('shows _n as n by default', () => {
		const solutions = nerdamer('solve(sin(x),x)');
		expect(nerdamer.get('TEX_PERIODIC_VAR')).toBe('n');
		expect(nerdamer.convertToTeX(solutions)).toBe('\\left\\{n \\cdot \\pi\\right\\}');
		expect(nerdamer.convertToTeX(solutions.toString())).toBe(
			'\\left\\{n \\cdot \\pi\\right\\}'
		);
		expect(solutions.toString()).toBe('{_n*pi}');
		expect(getWarnings()).toHaveLength(0);
	});

	it.each([
		['k', '\\left\\{k \\cdot \\pi\\right\\}'],
		['nu', '\\left\\{\\nu \\cdot \\pi\\right\\}'],
		['_n', '\\left\\{\\_n \\cdot \\pi\\right\\}'],
	])('shows _n as %s when chosen', (name, expected) => {
		expect(texWith(name, 'solve(sin(x),x)')).toBe(expected);
	});

	// solve(sin(n*x),x) is _n*pi/n, so showing _n as n would make two variables look alike.
	it('uses the next free name, with a warning, when the input already has the chosen one', () => {
		const tex = nerdamer.convertToTeX(nerdamer('solve(sin(n*x),x)'));
		expect(tex).toBe('\\left\\{\\frac{k \\cdot \\pi}{n}\\right\\}');
		const warnings = getWarnings();
		expect(warnings).toHaveLength(1);
		expect(warnings[0].code).toBe('tex.periodicVariable');
		expect(warnings[0].message).toBe(
			message('texPeriodicVariableWarning', { parameter: 'k', name: 'n' })
		);
	});

	// The fallbacks are k, nu, m, lambda, kappa and mu, in that order.
	it.each([
		['_n*pi+n+k', '\\nu \\cdot \\pi+n+k', 'nu'],
		['_n*pi+n+k+nu', 'm \\cdot \\pi+n+k+\\nu', 'm'],
	])('falls back in order for %s', (source, expected, parameter) => {
		expect(nerdamer.convertToTeX(source)).toBe(expected);
		expect(getWarnings().map(warning => warning.message)).toEqual([
			message('texPeriodicVariableWarning', { parameter, name: 'n' }),
		]);
	});

	it('throws when every name is already a variable of the input', () => {
		expect(() => nerdamer.convertToTeX('_n+n+k+nu+m+lambda+kappa+mu')).toThrow(
			message('texPeriodicVariableUnavailable', { names: 'n, k, nu, m, lambda, kappa, mu' })
		);
	});

	it('does not warn when there is no _n to show', () => {
		expect(nerdamer.convertToTeX('n^2')).toBe('n^{2}');
		expect(getWarnings()).toHaveLength(0);
	});

	it('uses the chosen name when only another name clashes', () => {
		expect(texWith('k', 'solve(sin(n*x),x)')).toBe(
			'\\left\\{\\frac{k \\cdot \\pi}{n}\\right\\}'
		);
		expect(getWarnings()).toHaveLength(0);
	});

	it.each(['pi', 'sin', 'n+1', '2', ''])(
		'rejects %j, which is not a plain variable name',
		name => {
			expect(() => texWith(name, 'solve(sin(x),x)')).toThrow(
				message('plainVariableExpected', { input: name })
			);
		}
	);

	it('is not affected by a stored value for the name', () => {
		try {
			nerdamer.setVar('n', '5');
			expect(nerdamer.convertToTeX(nerdamer('solve(sin(x),x)'))).toBe(
				'\\left\\{n \\cdot \\pi\\right\\}'
			);
		} finally {
			nerdamer.clearVars();
		}
	});
});
