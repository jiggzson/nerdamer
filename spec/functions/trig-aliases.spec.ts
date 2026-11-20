import '../helpers/registerNerdamerFunctions';
import nerdamer from '../../src/index';

// arccos, arcsinh and the other arc names are permanent alternatives for the inverse
// functions. Unlike the deprecated 1.x names, they don't record a warning.
const NAMES = ['sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'sinh', 'cosh', 'tanh', 'sech', 'csch', 'coth'];
const INPUTS = ['1/2', '2', '-1', 'x', '0.3', 'i', '[0,1]'];

// The result, or the error for an input such as atan(i) that has no value.
function outcome(input: string): string {
	let retval: string;
	try {
		retval = nerdamer(input).text();
	} catch (error) {
		retval = `throws ${(error as Error).message}`;
	}
	return retval;
}

describe('arc names for the inverse trigonometric and hyperbolic functions', () => {
	afterEach(() => {
		nerdamer.clearWarnings();
	});

	it.each(NAMES)('arc%s is a%s in Notation, without a warning', name => {
		for (const input of INPUTS) {
			expect(outcome(`arc${name}(${input})`)).toEqual(outcome(`a${name}(${input})`));
			expect(outcome(`evaluate(arc${name}(${input}))`)).toEqual(outcome(`evaluate(a${name}(${input}))`));
		}
		expect(nerdamer.getWarnings()).toEqual([]);
	});

	it.each([
		['arcsin', nerdamer.arcsin, nerdamer.asin],
		['arccos', nerdamer.arccos, nerdamer.acos],
		['arctan', nerdamer.arctan, nerdamer.atan],
		['arcsec', nerdamer.arcsec, nerdamer.asec],
		['arccsc', nerdamer.arccsc, nerdamer.acsc],
		['arccot', nerdamer.arccot, nerdamer.acot],
		['arcsinh', nerdamer.arcsinh, nerdamer.asinh],
		['arccosh', nerdamer.arccosh, nerdamer.acosh],
		['arctanh', nerdamer.arctanh, nerdamer.atanh],
		['arcsech', nerdamer.arcsech, nerdamer.asech],
		['arccsch', nerdamer.arccsch, nerdamer.acsch],
		['arccoth', nerdamer.arccoth, nerdamer.acoth],
	])('nerdamer.%s is the same function', (_, long, short) => {
		expect(long('x').text()).toEqual(short('x').text());
		expect(long('1/2').text()).toEqual(short('1/2').text());
		expect(nerdamer.getWarnings()).toEqual([]);
	});

	it('builds and differentiates like the short names', () => {
		expect(nerdamer('arccos(x)').buildFunction()(0.5)).toBeCloseTo(Math.acos(0.5), 15);
		expect(nerdamer('diff(arcsinh(x),x)').text()).toEqual(nerdamer('diff(asinh(x),x)').text());
	});
});
