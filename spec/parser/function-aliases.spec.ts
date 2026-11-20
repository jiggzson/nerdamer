import '../helpers/registerNerdamerFunctions';
import nerdamer from '../../src/index';
import { mathFunctionRegistry } from '../../src/core/dispatch';
import { connectedNumericalFunctions } from '../../src/core/functions/connectFunctions';
import { Settings } from '../../src/core/Settings';

// A permanent alias is a call to the function it stands for, under that function's name:
// ceiling(x) is the call ceil(x). It records no warning.
const ALIASES: [string, string][] = [
	['ceiling', 'ceil'],
	['magnitude', 'abs'],
	['factorial', 'fact'],
	['dfactorial', 'dfact'],
	['phase', 'arg'],
	['ilt', 'ilaplace'],
	['arccos', 'acos'],
	['arcsinh', 'asinh'],
];

// Arguments for one- and three-argument calls.
const argumentsFor = (name: string) => (mathFunctionRegistry[name].minArgs === 3 ? ['F(s),s,t', '1/(s^2+1),s,t'] : ['x', '-3/2', '[x,2]', '{1,-1}']);

// The result, or the error for an input such as factorial(-3/2) that has no value.
function outcome(input: string): string {
	let retval: string;
	try {
		retval = nerdamer(input).text();
	} catch (error) {
		retval = `throws ${(error as Error).message}`;
	}
	return retval;
}

describe('Permanent function aliases', () => {
	afterEach(() => {
		nerdamer.clearWarnings();
	});

	it.each(ALIASES)('%s is registered as an alias of %s', (alias, target) => {
		expect(mathFunctionRegistry[alias]).toMatchObject({ aliasOf: target, deprecated: false });
		expect(mathFunctionRegistry[target].aliasOf).toBeUndefined();
	});

	it.each(ALIASES)('%s(...) gives exactly what %s(...) gives', (alias, target) => {
		for (const args of argumentsFor(target)) {
			expect(outcome(`${alias}(${args})`)).toEqual(outcome(`${target}(${args})`));
		}
		expect(nerdamer.getWarnings()).toEqual([]);
	});

	it('keeps an unevaluated call under the name of the function', () => {
		const previous = Settings.DEFER_SIMPLIFICATION;
		Settings.DEFER_SIMPLIFICATION = true;
		try {
			expect(nerdamer('ceiling(x)').text()).toEqual('ceil(x)');
			expect(nerdamer('ilt(F,s,t)').text()).toEqual('ilaplace(F, s, t)');
			expect(nerdamer('[magnitude(x), phase(y)]').text()).toEqual('[abs(x), arg(y)]');
		} finally {
			Settings.DEFER_SIMPLIFICATION = previous;
		}
	});

	it('names the function in errors', () => {
		expect(() => nerdamer('ceiling(1,2)')).toThrow('ceil allows a maximum of 1 arguments but 2 provided!');
		expect(() => nerdamer('ilt(1/s)')).toThrow('ilaplace requires a minimum of 3 arguments but 1 provided!');
	});

	it('evaluates numerically and builds like the function', () => {
		expect(nerdamer('arccos(x)').evaluate({ x: 0.5 }).text()).toEqual(nerdamer('acos(x)').evaluate({ x: 0.5 }).text());
		expect(nerdamer('magnitude(x)').buildFunction()(-2)).toEqual(2);
	});

	it('connects a numerical implementation through the alias to the function', () => {
		const source = { ceiling: (x: number) => Math.ceil(x) + 100 };
		const original = mathFunctionRegistry.ceil.fn;
		nerdamer.connect(['ceiling'], source);
		try {
			expect(nerdamer('ceil(x)').evaluate({ x: 0.5 }).text()).toEqual('101');
			expect(nerdamer('ceiling(x)').evaluate({ x: 0.5 }).text()).toEqual('101');
		} finally {
			// Connecting wraps ceil for good, so put the function back too.
			delete connectedNumericalFunctions.ceil;
			mathFunctionRegistry.ceil.fn = original;
		}
		expect(nerdamer('ceiling(x)').evaluate({ x: 0.5 }).text()).toEqual('1');
	});
});
