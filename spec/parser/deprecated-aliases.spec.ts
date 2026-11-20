import '../helpers/registerNerdamerFunctions';
import nerdamer from '../../src/index';
import { mathFunctionRegistry, registerAlias } from '../../src/core/dispatch';
import { alias } from '../../src/core/warnings';

// Names Nerdamer 1.x had that 2.x replaced. Each still works, gives exactly what its
// replacement gives, and records a warning naming both.
const ALIASES: [string, string, string][] = [
	['IF(1,a,b)', 'if(1,a,b)', 'IF'],
	['IF(0,a,b)', 'if(0,a,b)', 'IF'],
	['is_in([1,2],2)', 'contains([1,2],2)', 'is_in'],
	['is_in({1,2},3)', 'contains({1,2},3)', 'is_in'],
	['is_subset({1},{1,2})', 'issubset({1},{1,2})', 'is_subset'],
	['solveEquations([x+y=3,x-y=1])', 'solveeqs([x+y=3,x-y=1])', 'solveEquations'],
];

describe('Deprecated 1.x function names', () => {
	afterEach(() => {
		nerdamer.clearVars();
		nerdamer.clearWarnings();
	});

	it.each(ALIASES)('%s gives the same as %s, with a warning', (input, replacement, name) => {
		nerdamer.clearWarnings();
		const expected = nerdamer(replacement).text();
		expect(nerdamer.getWarnings()).toEqual([]);

		expect(nerdamer(input).text()).toEqual(expected);
		expect(nerdamer.getWarnings()).toEqual([
			{
				code: 'api.deprecatedFunction',
				message: `${name} is deprecated; use ${mathFunctionRegistry[name].aliasOf} instead.`,
			},
		]);
	});

	it('keeps the argument handling of the replacement', () => {
		// if only evaluates the branch it takes.
		expect(nerdamer('block(n:0, IF(1, n:5, n:7), n)').text()).toEqual('5');
		// The call is a call to if, so the error names if.
		nerdamer.clearWarnings();
		expect(() => nerdamer('IF(1)')).toThrow('if requires a minimum of 2 arguments but 1 provided!');
		expect(nerdamer.getWarnings().map(x => x.code)).toEqual(['api.deprecatedFunction']);
	});

	it('warns in numerical evaluation too', () => {
		const expected = nerdamer('evaluate(acos(0.5))').text();
		registerAlias('acos_probe', 'acos', { deprecated: true });
		try {
			nerdamer.clearWarnings();
			expect(nerdamer('evaluate(acos_probe(0.5))').text()).toEqual(expected);
			expect(nerdamer.getWarnings()).toEqual([
				{ code: 'api.deprecatedFunction', message: 'acos_probe is deprecated; use acos instead.' },
			]);
		} finally {
			delete mathFunctionRegistry.acos_probe;
		}
	});

	it('warns once for each call', () => {
		nerdamer('[IF(1,a,b), IF(0,a,b)]');
		expect(nerdamer.getWarnings()).toHaveLength(2);
	});

	it('has JavaScript forms for the 1.x JavaScript names', () => {
		expect(nerdamer.solveEquations(['x+y=3', 'x-y=1']).text()).toEqual(nerdamer.solveeqs(['x+y=3', 'x-y=1']).text());
		expect(nerdamer.getWarnings()).toEqual([
			{ code: 'api.deprecatedFunction', message: 'solveEquations is deprecated; use solveeqs instead.' },
		]);
	});
});

describe('alias', () => {
	afterEach(() => {
		nerdamer.clearWarnings();
	});

	it('passes the arguments and result through and names both functions', () => {
		const add = (a: number, b: number) => a + b;
		const plus = alias(add, 'plus', 'add');
		expect(plus(2, 3)).toEqual(5);
		expect(nerdamer.getWarnings()).toEqual([
			{ code: 'api.deprecatedFunction', message: 'plus is deprecated; use add instead.' },
		]);
	});

	it('requires the replacement to be registered', () => {
		expect(() => registerAlias('old_name_probe', 'missing_function_probe')).toThrow(
			'Unsupported function missing_function_probe'
		);
		expect(mathFunctionRegistry.old_name_probe).toBeUndefined();
	});
});
