'use strict';

import nerdamer from '../../src/index';

// Root functions take strings and numbers, as nerdamer('...') does.
const api = nerdamer as unknown as Record<string, (...args: unknown[]) => { text(): string }>;

describe('Root functions given strings and numbers', () => {
	it.each([
		['trace', ['matrix([1,2],[3,4])'], '5'],
		['rank', ['matrix([1,2],[3,4])'], '2'],
		['determinant', ['matrix([1,2],[3,4])'], '-2'],
		['invert', ['matrix([1,2],[3,4])'], 'matrix([-2, 1], [3/2, -1/2])'],
		['nullspace', ['matrix([1,2],[2,4])'], '[[-2, 1]]'],
		['imatrix', [2], 'matrix([1, 0], [0, 1])'],
		['dot', ['[1,2,3]', '[4,5,6]'], '32'],
		['cross', ['[1,2,3]', '[4,5,6]'], '[-3, 6, -3]'],
		['line', ['[0,0]', '[1,1]'], 'x'],
		['line', ['[0,0]', '[1,1]', 'y'], 'y'],
		['expand', ['(x+1)^2'], '1+2*x+x^2'],
		['gamma', [5], '24'],
		['gamma', ['5'], '24'],
		['fact', ['5'], '120'],
		['factorial', [5], '120'],
		['erf', ['0'], '0'],
		['erfc', ['0'], '1'],
		['heaviside', ['x'], 'heaviside(x)'],
		['delta', ['x'], 'delta(x)'],
		['hypot', ['3', '4'], '5'],
		['hypot', [3, 4], '5'],
		['mod', [7, 3], '1'],
		['modInv', ['3', '7'], '5'],
		['realpart', ['1+2*i'], '1'],
		['imagpart', ['1+2*i'], '2'],
		['polarform', ['1+i'], '2^(1/2)*e^((1/4)*i*pi)'],
		['sinc', ['x'], 'sinc(x)'],
		['Si', ['x'], 'Si(x)'],
		['Ci', ['x'], 'Ci(x)'],
		['Shi', ['x'], 'Shi(x)'],
		['Chi', ['x'], 'Chi(x)'],
		['Li', ['x'], 'Li(x)'],
		['Ei', ['x'], 'Ei(x)'],
		['gamma', ['[1,2,3]'], '[1, 1, 2]'],
		['erf', ['[0,x]'], '[0, erf(x)]'],
	])('nerdamer.%s(%j) gives %s', (name, args, expected) => {
		expect(api[name](...args).text()).toEqual(expected);
	});

	it('has types that accept strings and numbers', () => {
		expect(nerdamer.trace('matrix([1,2],[3,4])').text()).toEqual('5');
		expect(nerdamer.rank('matrix([1,2],[3,4])').text()).toEqual('2');
		expect(nerdamer.determinant('matrix([1,2],[3,4])').text()).toEqual('-2');
		expect(nerdamer.gamma(5).text()).toEqual('24');
		expect(nerdamer.expand('(x+1)^2').text()).toEqual('1+2*x+x^2');
		expect(nerdamer.dot('[1,2,3]', '[4,5,6]').text()).toEqual('32');
		expect(nerdamer.hypot(3, 4).text()).toEqual('5');
	});

	it('still accepts parsed values', () => {
		expect(nerdamer.trace(nerdamer('matrix([1,2],[3,4])') as never).text()).toEqual('5');
		expect(nerdamer.expand(nerdamer('(x+1)^2') as never).text()).toEqual('1+2*x+x^2');
	});

	it.each([
		['trace', ['x+1'], 'trace requires a matrix! Received Expression.'],
		['rank', ['[[1,2],[2,4]]'], 'rank requires a matrix! Received Vector.'],
		['determinant', [5], 'determinant requires a matrix! Received Expression.'],
		['modInv', ['x^2+1', 'x'], 'modInv requires integer arguments!'],
		['hypot', [2], 'hypot requires a minimum of 2 arguments but 1 provided!'],
	])('nerdamer.%s(%j) names the type it received', (name, args, expected) => {
		expect(() => api[name](...args)).toThrow(expected);
	});

	// Every root function, called with an expression, either works or throws one of the
	// library's own errors, never a TypeError from a method missing on a string.
	it('no root function fails on a string with an internal error', () => {
		// These take arrays (of equations, polynomials or rows), not a single string.
		const takesArrays = new Set(['groebner', 'matrix', 'solveSystem', 'solveeqs']);
		// These change the session or configure the library instead of computing.
		const configures =
			/^(set|get|clear|flush|register|reserved|validVarName|version|convertFromLaTeX|connect|forget|assume|aliasOperator|updateAPI)/;
		const internal = /is not a function|Cannot read prop|of undefined|Received undefined|is not iterable/;
		const failures: string[] = [];
		for (const name of Object.keys(api).sort()) {
			if (typeof api[name] !== 'function' || takesArrays.has(name) || configures.test(name)) continue;
			for (const args of [['x^2+1'], ['x^2+1', 'x'], ['2']]) {
				try {
					api[name](...args);
				} catch (error) {
					if (error instanceof TypeError || internal.test((error as Error).message)) {
						failures.push(`${name}(${args.join(', ')}): ${(error as Error).message}`);
					}
				}
			}
		}
		expect(failures).toEqual([]);
	});
});
